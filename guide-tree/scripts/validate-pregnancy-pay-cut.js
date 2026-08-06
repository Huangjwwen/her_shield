const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
const tree = readJson('config/pregnancy-pay-cut.full.json');
const templates = readJson('config/pregnancy-pay-cut.templates.json');
const legalBasis = readJson('config/pregnancy-pay-cut.legal-basis.json');
const mapping = readJson('config/pregnancy-pay-cut.terminal-mapping.json');
const cases = readJson('tests/pregnancy-pay-cut.cases.json');
const errors = [];

function fail(message) {
  errors.push(message);
}

function flagMatches(flags, target) {
  return flags.some((item) => item.node === target.node && item.flag === target.flag);
}

function readField(context, field) {
  if (field.startsWith('answers.')) return context.answers[field.slice('answers.'.length)];
  if (field === 'flags') return context.flags;
  if (field.startsWith('documentFields.')) return context.documentFields[field.slice('documentFields.'.length)];
  return context.documentFields[field];
}

function evaluate(condition, context) {
  if (!condition) return true;
  if (condition.all) return condition.all.every((item) => evaluate(item, context));
  if (condition.any) return condition.any.some((item) => evaluate(item, context));
  if (condition.node && condition.value !== undefined) return context.answers[condition.node] === condition.value;
  if (condition.node && condition.contains) return Array.isArray(context.answers[condition.node]) && context.answers[condition.node].includes(condition.contains);
  if (condition.node && condition.containsAny) return Array.isArray(context.answers[condition.node]) && condition.containsAny.some((value) => context.answers[condition.node].includes(value));
  if (condition.node && condition.flag) return flagMatches(context.flags, { node: condition.node, flag: condition.flag });

  const actual = readField(context, condition.field);
  if (condition.op === 'eq') return actual === condition.value;
  if (condition.op === 'neq') return actual !== condition.value;
  if (condition.op === 'in') return condition.value.includes(actual);
  if (condition.op === 'exists') return actual !== undefined && actual !== null && actual !== '';
  if (condition.op === 'contains') return condition.field === 'flags' ? flagMatches(context.flags, condition.value) : Array.isArray(actual) && actual.includes(condition.value);
  if (condition.op === 'containsAny') return condition.field === 'flags' ? condition.value.some((item) => flagMatches(context.flags, item)) : Array.isArray(actual) && condition.value.some((value) => actual.includes(value));
  throw new Error(`Unsupported condition: ${JSON.stringify(condition)}`);
}

function chooseRule(rules, context) {
  for (const rule of rules || []) {
    if (rule.otherwise || evaluate(rule.when, context)) return rule;
  }
  return null;
}

function replay(answers) {
  const context = { answers: {}, flags: [], documentFields: {} };
  const visited = [];
  let nodeId = tree.startNodeId;

  while (nodeId) {
    const node = tree.nodes[nodeId];
    if (!node) throw new Error(`Unknown node ${nodeId}`);
    visited.push(nodeId);
    const selected = answers[nodeId];
    if (selected === undefined) throw new Error(`Missing answer for ${nodeId}`);

    if (node.type === 'multi') {
      if (!Array.isArray(selected) || selected.length === 0) throw new Error(`${nodeId} must have at least one option`);
      const validValues = new Set(node.options.map((option) => option.value));
      if (selected.some((value) => !validValues.has(value))) throw new Error(`${nodeId} contains an unknown option`);
      if (node.exclusiveOptionValues && selected.some((value) => node.exclusiveOptionValues.includes(value)) && selected.length !== 1) throw new Error(`${nodeId} exclusive option cannot be combined`);
      context.answers[nodeId] = selected;
      selected.forEach((value) => {
        const option = node.options.find((item) => item.value === value);
        (option.setFlags || []).forEach((flag) => context.flags.push({ node: nodeId, flag }));
      });
      nodeId = node.next;
      continue;
    }

    const option = node.options.find((item) => item.value === selected);
    if (!option) throw new Error(`${nodeId} has an unknown option`);
    context.answers[nodeId] = selected;
    (option.setFlags || []).forEach((flag) => context.flags.push({ node: nodeId, flag }));

    const preRule = chooseRule(node.preRules, context);
    if (preRule) return { terminalId: preRule.terminal, visited, ...context };
    if (option.terminal) return { terminalId: option.terminal, visited, ...context };
    const optionRule = chooseRule(option.rules, context);
    if (optionRule) {
      if (optionRule.terminal) return { terminalId: optionRule.terminal, visited, ...context };
      nodeId = optionRule.next;
    } else {
      nodeId = option.next;
    }
  }
  throw new Error('Path ended without a terminal');
}

function collectConditions(value, callback) {
  if (!value || typeof value !== 'object') return;
  if (value.node || value.field) callback(value);
  if (value.all) value.all.forEach((item) => collectConditions(item, callback));
  if (value.any) value.any.forEach((item) => collectConditions(item, callback));
}

function validateCondition(condition, source) {
  if (condition.node && !tree.nodes[condition.node]) fail(`${source} references unknown node ${condition.node}`);
  if (condition.node && condition.value !== undefined) {
    const node = tree.nodes[condition.node];
    if (node && !node.options.some((option) => option.value === condition.value)) fail(`${source} references unknown option ${condition.node}.${condition.value}`);
  }
  if (condition.node && condition.flag) {
    const node = tree.nodes[condition.node];
    const supported = node && node.options.some((option) => (option.setFlags || []).includes(condition.flag));
    if (!supported) fail(`${source} references unknown sourced flag ${condition.node}:${condition.flag}`);
  }
}

function validateTree() {
  if (tree.status !== 'draft') fail('Tree must remain draft before legal sign-off');
  Object.entries(tree.nodes).forEach(([nodeId, node]) => {
    if (node.id !== nodeId) fail(`Node key/id mismatch for ${nodeId}`);
    if (node.type === 'multi' && !node.next) fail(`${nodeId} multi node needs next`);
    node.options.forEach((option) => {
      if (option.next && !tree.nodes[option.next]) fail(`${nodeId}.${option.value} has unknown next node ${option.next}`);
      if (option.terminal && !tree.terminals[option.terminal]) fail(`${nodeId}.${option.value} has unknown terminal ${option.terminal}`);
      (option.rules || []).forEach((rule, index) => {
        if (rule.otherwise && index !== option.rules.length - 1) fail(`${nodeId}.${option.value} otherwise must be last`);
        if (rule.terminal && !tree.terminals[rule.terminal]) fail(`${nodeId}.${option.value} references unknown terminal ${rule.terminal}`);
        collectConditions(rule.when, (condition) => validateCondition(condition, `${nodeId}.${option.value}`));
      });
    });
    (node.preRules || []).forEach((rule) => {
      if (rule.otherwise) fail(`${nodeId} preRules cannot use otherwise`);
      if (rule.terminal && !tree.terminals[rule.terminal]) fail(`${nodeId} preRule references unknown terminal ${rule.terminal}`);
      collectConditions(rule.when, (condition) => validateCondition(condition, `${nodeId} preRule`));
    });
  });
}

function placeholders(text) {
  return [...text.matchAll(/{{([A-Za-z][A-Za-z0-9]*)}}/g)].map((match) => match[1]);
}

function validateTemplates() {
  const templateKeys = new Set();
  templates.templates.forEach((template) => {
    if (templateKeys.has(template.documentKey)) fail(`Duplicate template ${template.documentKey}`);
    templateKeys.add(template.documentKey);
    if (template.conditionIndexVersion !== tree.conditionIndexVersion) fail(`${template.documentKey} condition index version mismatch`);
    template.applicableTerminals.forEach((terminal) => {
      if (!tree.terminals[terminal]) fail(`${template.documentKey} references unknown terminal ${terminal}`);
    });
    const allowedFields = new Set([...template.requiredFields, ...template.optionalFields, 'generatedDate']);
    template.bodyBlocks.forEach((block) => {
      placeholders(block.text).forEach((field) => {
        if (!allowedFields.has(field)) fail(`${template.documentKey}.${block.blockId} has undeclared field ${field}`);
      });
      collectConditions(block.when, (condition) => validateCondition(condition, `${template.documentKey}.${block.blockId}`));
    });
    (template.mutuallyExclusiveGroups || []).forEach((group) => {
      group.blockIds.forEach((blockId) => {
        if (!template.bodyBlocks.some((block) => block.blockId === blockId)) fail(`${template.documentKey}.${group.groupId} references unknown block ${blockId}`);
      });
    });
  });
  return templateKeys;
}

function validateMapping(templateKeys) {
  const legalKeys = new Set(legalBasis.records.map((record) => record.legalBasisKey));
  Object.entries(mapping.terminals).forEach(([terminalId, item]) => {
    if (!tree.terminals[terminalId]) fail(`Mapping has unknown terminal ${terminalId}`);
    [...(item.documentKeys || []), ...(item.conditionalDocuments || []).map((entry) => entry.documentKey)].forEach((key) => {
      if (!templateKeys.has(key)) fail(`${terminalId} maps unknown template ${key}`);
      const template = templates.templates.find((candidate) => candidate.documentKey === key);
      if (template && !template.applicableTerminals.includes(terminalId)) fail(`${terminalId} maps template ${key} outside its applicable terminals`);
    });
    [...(item.requiredLegalBasisKeys || []), ...(item.conditionalLegalBasis || []).map((entry) => entry.legalBasisKey)].forEach((key) => {
      if (!legalKeys.has(key)) fail(`${terminalId} maps unknown legal basis ${key}`);
    });
    (item.conditionalDocuments || []).forEach((entry) => collectConditions(entry.when, (condition) => validateCondition(condition, `${terminalId} document mapping`)));
    (item.conditionalLegalBasis || []).forEach((entry) => collectConditions(entry.when, (condition) => validateCondition(condition, `${terminalId} legal mapping`)));
    if (terminalId === 'OOS' && ((item.documentKeys || []).length || (item.requiredLegalBasisKeys || []).length)) fail('OOS must not return documents or legal basis');
  });
}

function validateCases() {
  cases.cases.forEach((testCase) => {
    try {
      const result = replay(testCase.answers);
      if (result.terminalId !== testCase.expectedTerminal) fail(`${testCase.id}: expected ${testCase.expectedTerminal}, got ${result.terminalId}`);
    } catch (error) {
      fail(`${testCase.id}: ${error.message}`);
    }
  });
}

validateTree();
const templateKeys = validateTemplates();
validateMapping(templateKeys);
validateCases();

if (errors.length) {
  console.error(`Guide-tree validation failed (${errors.length}):`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(`Guide-tree validation passed: ${cases.cases.length} legal acceptance paths, ${templates.templates.length} templates, ${legalBasis.records.length} legal-basis records.`);
}
