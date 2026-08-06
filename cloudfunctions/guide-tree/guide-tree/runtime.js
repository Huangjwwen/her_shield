function flagMatches(flags, target) {
  return flags.some((item) => item.node === target.node && item.flag === target.flag);
}

function readField(context, field) {
  if (field.startsWith('answers.')) return context.answers[field.slice('answers.'.length)];
  if (field === 'flags') return context.flags;
  if (field.startsWith('documentFields.')) return context.documentFields[field.slice('documentFields.'.length)];
  return context.documentFields[field];
}

function evaluateCondition(condition, context) {
  if (!condition) return true;
  if (condition.all) return condition.all.every((item) => evaluateCondition(item, context));
  if (condition.any) return condition.any.some((item) => evaluateCondition(item, context));
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
  return (rules || []).find((rule) => rule.otherwise || evaluateCondition(rule.when, context));
}

function replayTree(tree, submittedAnswers) {
  const context = { answers: {}, flags: [], documentFields: {} };
  const path = [];
  let nodeId = tree.startNodeId;

  while (nodeId) {
    const node = tree.nodes[nodeId];
    if (!node) throw new Error(`CONFIG_ERROR: unknown node ${nodeId}`);
    const selected = submittedAnswers[nodeId];
    if (selected === undefined) throw new Error(`INVALID_PATH: missing answer for ${nodeId}`);
    path.push(nodeId);

    if (node.type === 'multi') {
      if (!Array.isArray(selected) || selected.length === 0) throw new Error(`INVALID_ANSWER: ${nodeId} must have at least one option`);
      const validValues = new Set(node.options.map((option) => option.value));
      if (selected.some((value) => !validValues.has(value))) throw new Error(`INVALID_ANSWER: ${nodeId} contains an unknown option`);
      if (node.exclusiveOptionValues && selected.some((value) => node.exclusiveOptionValues.includes(value)) && selected.length !== 1) throw new Error(`INVALID_ANSWER: ${nodeId} exclusive option cannot be combined`);
      context.answers[nodeId] = selected;
      selected.forEach((value) => {
        const option = node.options.find((item) => item.value === value);
        (option.setFlags || []).forEach((flag) => context.flags.push({ node: nodeId, flag }));
      });
      const preRule = chooseRule(node.preRules, context);
      if (preRule) return { terminalId: preRule.terminal, path, ...context };
      const nodeRule = chooseRule(node.rules, context);
      if (nodeRule) {
        if (nodeRule.terminal) return { terminalId: nodeRule.terminal, path, ...context };
        nodeId = nodeRule.next;
        continue;
      }
      nodeId = node.next;
      continue;
    }

    const option = node.options.find((item) => item.value === selected);
    if (!option) throw new Error(`INVALID_ANSWER: ${nodeId} has an unknown option`);
    context.answers[nodeId] = selected;
    (option.setFlags || []).forEach((flag) => context.flags.push({ node: nodeId, flag }));

    const preRule = chooseRule(node.preRules, context);
    if (preRule) return { terminalId: preRule.terminal, path, ...context };
    if (option.terminal) return { terminalId: option.terminal, path, ...context };
    const optionRule = chooseRule(option.rules, context);
    if (optionRule) {
      if (optionRule.terminal) return { terminalId: optionRule.terminal, path, ...context };
      nodeId = optionRule.next;
    } else {
      nodeId = option.next;
    }
  }
  throw new Error('CONFIG_ERROR: path ended without a terminal');
}

function createProjection(tree) {
  return {
    schemaVersion: tree.schemaVersion,
    treeId: tree.treeId,
    treeVersion: tree.treeVersion,
    startNodeId: tree.startNodeId,
    nodes: tree.nodes,
    terminalRefs: Object.keys(tree.terminals)
  };
}

function renderedBlocks(template, context, documentFields, generatedDate) {
  const availableFields = { ...documentFields, generatedDate };
  const missing = new Set();
  template.requiredFields.forEach((field) => {
    if (!availableFields[field]) missing.add(field);
  });
  const blocks = template.bodyBlocks
    .slice()
    .sort((left, right) => left.order - right.order)
    .filter((block) => block.type === 'fixed' || evaluateCondition(block.when, context));
  blocks.forEach((block) => {
    (block.requiredFieldsWhenRendered || []).forEach((field) => {
      if (!availableFields[field]) missing.add(field);
    });
  });
  if (missing.size) return { status: 'needs_fields', missingFields: [...missing].sort() };

  const text = blocks.map((block) => block.text.replace(/{{([A-Za-z][A-Za-z0-9]*)}}/g, (_, field) => String(availableFields[field] || ''))).join('\n\n');
  return { status: 'ready', text, missingFields: [] };
}

function selectItems(entries, context, keyName) {
  return (entries || []).filter((entry) => !entry.when || evaluateCondition(entry.when, context)).map((entry) => entry[keyName]);
}

function resolvePackage({ tree, templates, legalBasis, mapping, answers, documentFields = {}, generatedDate }) {
  const replay = replayTree(tree, answers);
  const context = { ...replay, documentFields };
  const terminal = tree.terminals[replay.terminalId];
  const terminalMapping = mapping.terminals[replay.terminalId];
  if (!terminalMapping) throw new Error(`CONFIG_ERROR: missing mapping for ${replay.terminalId}`);
  const templateByKey = new Map(templates.templates.map((template) => [template.documentKey, template]));
  const legalByKey = new Map(legalBasis.records.map((record) => [record.legalBasisKey, record]));
  const documentKeys = [...new Set([...(terminalMapping.documentKeys || []), ...selectItems(terminalMapping.conditionalDocuments, context, 'documentKey')])];
  const legalKeys = [...new Set([...(terminalMapping.requiredLegalBasisKeys || []), ...selectItems(terminalMapping.conditionalLegalBasis, context, 'legalBasisKey')])];

  return {
    treeId: tree.treeId,
    treeVersion: tree.treeVersion,
    terminal: { id: terminal.id, title: terminal.title, scopeStatus: terminal.scopeStatus },
    canonicalPath: replay.path,
    canonicalAnswers: replay.answers,
    canonicalFlags: replay.flags,
    documents: documentKeys.map((key) => {
      const template = templateByKey.get(key);
      if (!template) throw new Error(`CONFIG_ERROR: missing template ${key}`);
      return { documentKey: key, title: template.title, ...renderedBlocks(template, context, documentFields, generatedDate) };
    }),
    legalBasis: legalKeys.map((key) => {
      const record = legalByKey.get(key);
      if (!record) throw new Error(`CONFIG_ERROR: missing legal basis ${key}`);
      return { legalBasisKey: key, lawName: record.lawName, article: record.article, displayText: record.displayText, officialUrl: record.officialUrl, status: record.status || legalBasis.status };
    })
  };
}

module.exports = { createProjection, evaluateCondition, replayTree, resolvePackage };
