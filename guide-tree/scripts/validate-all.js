const fs = require('fs');
const path = require('path');
const { replayTree, resolvePackage } = require('../runtime');

const root = path.resolve(__dirname, '..');
const treeFiles = {
  pregnancy_pay_cut: 'pregnancy-pay-cut',
  recruit_discrimination: 'recruit-discrimination',
  harassment: 'harassment',
  equal_pay_promotion: 'equal-pay-promotion',
  leave_benefits: 'leave-benefits'
};
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const errors = [];
const fail = (message) => errors.push(message);

function conditions(value, callback) {
  if (!value || typeof value !== 'object') return;
  if (value.node || value.field) callback(value);
  (value.all || []).forEach((item) => conditions(item, callback));
  (value.any || []).forEach((item) => conditions(item, callback));
}

function validateCondition(tree, condition, source) {
  conditions(condition, (item) => {
    if (item.node && !tree.nodes[item.node]) fail(`${source} unknown node ${item.node}`);
    if (item.node && item.value !== undefined && tree.nodes[item.node] && !tree.nodes[item.node].options.some((option) => option.value === item.value)) fail(`${source} unknown value ${item.node}.${item.value}`);
    if (item.node && item.flag && tree.nodes[item.node] && !tree.nodes[item.node].options.some((option) => (option.setFlags || []).includes(item.flag))) fail(`${source} unknown flag ${item.node}:${item.flag}`);
  });
}

function validateTree(tree, mapping, templates, legalBasis) {
  if (tree.status !== 'draft') fail(`${tree.treeId} must remain draft`);
  if (mapping.treeId !== tree.treeId) fail(`${tree.treeId} mapping tree mismatch`);
  const nodeIds = new Set(Object.keys(tree.nodes));
  const terminalIds = new Set(Object.keys(tree.terminals));
  Object.entries(tree.nodes).forEach(([nodeId, node]) => {
    if (node.id !== nodeId) fail(`${tree.treeId} node id mismatch ${nodeId}`);
    if (node.type === 'multi' && !node.next) fail(`${tree.treeId} multi node ${nodeId} missing next`);
    node.options.forEach((option) => {
      if (option.next && !nodeIds.has(option.next)) fail(`${tree.treeId} ${nodeId} unknown next ${option.next}`);
      if (option.terminal && !terminalIds.has(option.terminal)) fail(`${tree.treeId} ${nodeId} unknown terminal ${option.terminal}`);
      (option.rules || []).forEach((rule) => { if (rule.next && !nodeIds.has(rule.next)) fail(`${tree.treeId} ${nodeId} rule unknown next ${rule.next}`); if (rule.terminal && !terminalIds.has(rule.terminal)) fail(`${tree.treeId} ${nodeId} rule unknown terminal ${rule.terminal}`); validateCondition(tree, rule.when, `${tree.treeId}.${nodeId}`); });
    });
    (node.preRules || []).forEach((rule) => { if (rule.next && !nodeIds.has(rule.next)) fail(`${tree.treeId} ${nodeId} preRule unknown next ${rule.next}`); if (rule.terminal && !terminalIds.has(rule.terminal)) fail(`${tree.treeId} ${nodeId} preRule unknown terminal ${rule.terminal}`); validateCondition(tree, rule.when, `${tree.treeId}.${nodeId}`); });
  });
  const mappingKeys = Object.keys(mapping.terminals);
  if (mappingKeys.some((terminalId) => !terminalIds.has(terminalId))) fail(`${tree.treeId} mapping has unknown terminal`);
  if (mappingKeys.length !== terminalIds.size) fail(`${tree.treeId} mapping terminal coverage mismatch`);
  const templateKeys = new Set(templates.templates.map((template) => template.documentKey));
  const legalKeys = new Set(legalBasis.records.map((record) => record.legalBasisKey));
  templates.templates.forEach((template) => { if (!template.applicableTreeIds.includes(tree.treeId)) fail(`${tree.treeId} template tree mismatch ${template.documentKey}`); template.applicableTerminals.forEach((terminalId) => { if (!terminalIds.has(terminalId)) fail(`${tree.treeId} template ${template.documentKey} unknown terminal ${terminalId}`); }); });
  Object.entries(mapping.terminals).forEach(([terminalId, entry]) => {
    [...(entry.documentKeys || []), ...(entry.conditionalDocuments || []).map((item) => item.documentKey)].forEach((key) => { if (!templateKeys.has(key)) fail(`${tree.treeId} ${terminalId} unknown template ${key}`); });
    [...(entry.requiredLegalBasisKeys || []), ...(entry.conditionalLegalBasis || []).map((item) => item.legalBasisKey)].forEach((key) => { if (!legalKeys.has(key)) fail(`${tree.treeId} ${terminalId} unknown legal basis ${key}`); });
    (entry.conditionalDocuments || []).forEach((item) => validateCondition(tree, item.when, `${tree.treeId}.${terminalId}.document`));
    (entry.conditionalLegalBasis || []).forEach((item) => validateCondition(tree, item.when, `${tree.treeId}.${terminalId}.legal`));
    if (tree.terminals[terminalId].scopeStatus === 'out_of_scope' && ((entry.documentKeys || []).length || (entry.requiredLegalBasisKeys || []).length || (entry.conditionalDocuments || []).length || (entry.conditionalLegalBasis || []).length)) fail(`${tree.treeId} OOS mapping is not empty`);
  });
}

for (const [treeId, slug] of Object.entries(treeFiles)) {
  const tree = read(`config/${slug}.full.json`);
  const mapping = read(`config/${slug}.terminal-mapping.json`);
  const templates = read(`config/${slug}.templates.json`);
  const legalBasis = read(`config/${slug}.legal-basis.json`);
  validateTree(tree, mapping, templates, legalBasis);
  const casesPath = path.join(root, 'tests', `${slug}.cases.json`);
  if (fs.existsSync(casesPath)) {
    const caseData = read(`tests/${slug}.cases.json`);
    const cases = Array.isArray(caseData) ? caseData : caseData.cases || [];
    cases.forEach((testCase) => {
      try {
        const replay = replayTree(tree, testCase.answers);
        if (replay.terminalId !== testCase.expectedTerminal) fail(`${treeId} ${testCase.id} expected ${testCase.expectedTerminal}, got ${replay.terminalId}`);
        const result = resolvePackage({ tree, templates, legalBasis, mapping, answers: testCase.answers, documentFields: testCase.documentFields || {}, generatedDate: '2026-08-06' });
        if (result.terminal.id === 'OOS' && (result.documents.length || result.legalBasis.length)) fail(`${treeId} ${testCase.id} OOS boundary failed`);
      } catch (error) { fail(`${treeId} ${testCase.id} ${error.message}`); }
    });
  }
}

if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; } else console.log('All guide-tree configurations passed structural, mapping, replay, and OOS validation.');
