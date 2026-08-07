const fs = require('fs');
const path = require('path');
const { replayTree } = require('../runtime');

const root = path.resolve(__dirname, '..');
const treeFiles = {
  pregnancy_pay_cut: 'pregnancy-pay-cut',
  recruit_discrimination: 'recruit-discrimination',
  harassment: 'harassment',
  equal_pay_promotion: 'equal-pay-promotion',
  leave_benefits: 'leave-benefits'
};

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
}

const rows = [];
let failed = false;

for (const [treeId, slug] of Object.entries(treeFiles)) {
  const tree = readJson(`config/${slug}.full.json`);
  const casesPath = path.join(root, 'tests', `${slug}.cases.json`);
  const caseData = readJson(path.relative(root, casesPath));
  const cases = Array.isArray(caseData) ? caseData : caseData.cases || [];
  const expectedTerminals = Object.keys(tree.terminals);
  const reachedTerminals = new Set();

  for (const testCase of cases) {
    const replay = replayTree(tree, testCase.answers);
    reachedTerminals.add(replay.terminalId);
    if (replay.terminalId !== testCase.expectedTerminal) {
      failed = true;
      console.error(`${treeId} ${testCase.id}: expected ${testCase.expectedTerminal}, got ${replay.terminalId}`);
    }
  }

  const missingTerminals = expectedTerminals.filter((terminalId) => !reachedTerminals.has(terminalId));
  if (cases.length < 20 || missingTerminals.length) failed = true;
  rows.push({
    treeId,
    cases: cases.length,
    reachedTerminals: [...reachedTerminals].sort().join(','),
    missingTerminals: missingTerminals.join(',') || '-'
  });
}

console.table(rows);
if (failed) process.exitCode = 1;
