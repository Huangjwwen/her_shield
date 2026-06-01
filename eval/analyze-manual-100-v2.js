#!/usr/bin/env node
/**
 * v2:用要件级标注校验过的 test_set.v_new.json (v1.3+annotated) 重算 100 条手测结果准确率
 * 对比 v1(test_set.json 旧 expected)和 v2(test_set.v_new.json 新 expected)
 */
const fs = require('fs');
const path = require('path');

// 100 条手测结果(同 analyze-manual-100.js)
const MANUAL = {
  H1:'高危', H2:'低危', H3:'高危', H4:'高危', H5:'高危',
  H_real_1:'高危', H_real_2:'高危', H14:'中危',
  H6:'低危', H7:'低危', H8:'低危', H9:'中危', H10:'低危',
  H15:'低危', H16:'低危', H17:'中危',
  H11:'中危', H12:'低危', H13:'无风险', H18:'低危', H19:'低危',
  D1:'高危', D2:'高危', D3:'高危', D4:'高危', D5:'高危',
  D_real_1:'高危', D_real_2:'高危', D_real_3:'高危',
  D6:'中危', D7:'中危', D8:'高危', D9:'高危', D10:'高危',
  D14:'高危', D15:'高危', D16:'高危',
  D11:'低危', D12:'低危', D13:'低危', D17:'中危', D18:'中危',
  N1:'无风险', N2:'无风险', N3:'无风险', N4:'无风险',
  N5:'无风险', N6:'无风险', N7:'无风险', N8:'无风险',
  V_pp_01:'低危', V_pp_02:'高危', V_pp_03:'高危', V_pp_04:'高危',
  V_pp_05:'中危', V_pp_06:'低危', V_pp_07:'高危', V_pp_08:'高危',
  V_pp_09:'高危', V_pp_10:'高危', V_pp_11:'中危', V_pp_12:'高危',
  V_pp_13:'无风险', V_pp_14:'无风险', V_pp_15:'高危',
  V_pt_01:'高危', V_pt_02:'高危', V_pt_03:'低危', V_pt_04:'高危',
  V_pt_05:'高危', V_pt_06:'低危', V_pt_07:'高危', V_pt_08:'高危',
  V_pt_09:'低危', V_pt_10:'低危', V_pt_11:'无风险', V_pt_12:'无风险',
  V_dt_01:'高危', V_dt_02:'中危', V_dt_03:'中危', V_dt_04:'高危',
  V_dt_05:'中危', V_dt_06:'高危', V_dt_07:'中危',
  V_dt_08:'无风险', V_dt_09:'无风险', V_dt_10:'低危',
  V_bd_01:'低危', V_bd_02:'高危', V_bd_03:'中危', V_bd_04:'高危',
  V_bd_05:'低危', V_bd_06:'无风险', V_bd_07:'中危', V_bd_08:'高危',
  V_vb_01:'高危', V_vb_02:'高危', V_vb_03:'高危', V_vb_04:'高危', V_vb_05:'高危',
};

const RANK = { 高危:3, 中危:2, 低危:1, 无风险:0 };
const LEVELS = ['高危','中危','低危','无风险'];

function analyze(testSet, label) {
  const cases = testSet.cases;
  const valid = [];
  const correct = [];
  const matrix = {};
  LEVELS.forEach(e => { matrix[e] = {}; LEVELS.forEach(g => matrix[e][g] = 0); });
  const byLevel = {};
  const byCat = {};
  const diffs = [];

  cases.forEach(c => {
    const got = MANUAL[c.id];
    if (!got) return;
    const exp = c.expected.risk_level;
    valid.push({ id: c.id, cat: c.category, exp, got, delta: RANK[got] - RANK[exp] });
    matrix[exp][got]++;
    if (!byLevel[exp]) byLevel[exp] = { total: 0, correct: 0 };
    byLevel[exp].total++;
    if (!byCat[c.category]) byCat[c.category] = { total: 0, correct: 0 };
    byCat[c.category].total++;
    if (got === exp) {
      correct.push(c.id);
      byLevel[exp].correct++;
      byCat[c.category].correct++;
    }
  });

  const total = valid.length;
  const acc = correct.length / total;
  const se = Math.sqrt(acc * (1 - acc) / total);

  console.log(`\n========== ${label} ==========`);
  console.log(`整体准确率: ${(100 * acc).toFixed(1)}% (${correct.length}/${total})`);
  console.log(`95% CI: ${((acc - 1.96 * se) * 100).toFixed(1)}% – ${((acc + 1.96 * se) * 100).toFixed(1)}%`);

  // 各等级召回
  console.log(`\n--- 各等级召回 ---`);
  LEVELS.forEach(lv => {
    const b = byLevel[lv];
    if (!b) return;
    const rec = b.total ? (100 * b.correct / b.total).toFixed(1) + '%' : '—';
    console.log(`  ${lv.padEnd(4)} ${rec.padStart(6)} (${b.correct}/${b.total})`);
  });

  // 偏差分布
  console.log(`\n--- 偏差分布 ---`);
  const buckets = {};
  valid.forEach(v => { buckets[v.delta] = (buckets[v.delta] || 0) + 1; });
  ['-3','-2','-1','0','1','2','3'].forEach(k => {
    if (buckets[k]) {
      const sign = Number(k) > 0 ? '+' : '';
      console.log(`  ${sign}${k} 级: ${String(buckets[k]).padStart(3)} (${(100*buckets[k]/total).toFixed(1)}%)`);
    }
  });
  const tolerant = valid.filter(v => Math.abs(v.delta) <= 1).length;
  console.log(`  ±1 级容忍准确率: ${(100*tolerant/total).toFixed(1)}% (${tolerant}/${total})`);

  // 混淆矩阵
  console.log(`\n--- 混淆矩阵(行=期望/列=实际) ---`);
  console.log('         ' + LEVELS.map(l => l.padStart(6)).join(' '));
  LEVELS.forEach(e => {
    const row = LEVELS.map(g => String(matrix[e][g]).padStart(6)).join(' ');
    console.log(`${e.padEnd(8)} ${row}`);
  });

  return { total, correct: correct.length, acc, byLevel, buckets, byCat, valid };
}

const tsOld = JSON.parse(fs.readFileSync(path.join(__dirname, 'test_set.json'), 'utf-8'));
const tsNew = JSON.parse(fs.readFileSync(path.join(__dirname, 'test_set.v_new.json'), 'utf-8'));

const v1 = analyze(tsOld, 'v1.3 旧 expected (心算映射)');
const v2 = analyze(tsNew, 'v1.3+annotated 新 expected (要件级标注+代码映射)');

console.log(`\n========== 对比 ==========`);
console.log(`版本                            准确率         判对    高危召回   ±1容忍`);
const highRecall = r => r.byLevel['高危'] ? ((100*r.byLevel['高危'].correct/r.byLevel['高危'].total).toFixed(1)+'%') : '—';
const tolerant = r => {
  const t = r.valid.filter(v => Math.abs(v.delta) <= 1).length;
  return (100*t/r.total).toFixed(1)+'%';
};
console.log(`v1.3 (心算映射)                ${(100*v1.acc).toFixed(1).padStart(5)}%  ${String(v1.correct).padStart(3)}/${v1.total}  ${highRecall(v1).padStart(7)}   ${tolerant(v1)}`);
console.log(`v1.3+annotated (要件级标注)    ${(100*v2.acc).toFixed(1).padStart(5)}%  ${String(v2.correct).padStart(3)}/${v2.total}  ${highRecall(v2).padStart(7)}   ${tolerant(v2)}`);
console.log(`变化                          ${('+' + (100*(v2.acc-v1.acc)).toFixed(1) + '%').padStart(6)}`);

// 写入 v2 报告
const ranked = (m, k) => Object.entries(m).map(([cat,v]) => ({cat,acc:v.correct/v.total,n:v.total})).sort((a,b)=>b.acc-a.acc).map(x=>`  ${x.cat.padEnd(18)} ${(100*x.acc).toFixed(1).padStart(5)}% (n=${x.n})`).join('\n');

let md = '# 100 条手测结果 vs 修正后 expected (v1.3+annotated) 对比报告\n\n';
md += `**评测时间**:${new Date().toISOString().slice(0,10)}\n`;
md += `**测试集版本**:v1.3+annotated(11 条 expected 经要件级标注 + 代码映射修正)\n`;
md += `**对比方式**:人工手测产品输出 vs 修正后标准答案\n\n`;
md += `**关键改动**:9 条歧视类(D8/9/10/14/16 + 同源变体 V_pp_12/V_pt_07/08/V_dt_06)+ 1 条骚扰(H15) 从中危升高危;1 条骚扰(H13)从低危降无风险。这些修正基于"事实层标注 + 代码 \`compute_risk_level\` 机械映射"的对齐校验。\n\n`;
md += `---\n\n## 1. 总账对比\n\n`;
md += `| 指标 | v1.3 (旧) | **v1.3+annotated (新)** | 变化 |\n|---|---|---|---|\n`;
md += `| 整体准确率 | ${(100*v1.acc).toFixed(1)}% (${v1.correct}/${v1.total}) | **${(100*v2.acc).toFixed(1)}%** (${v2.correct}/${v2.total}) | **+${(100*(v2.acc-v1.acc)).toFixed(1)}%** |\n`;
md += `| 高危召回 | ${highRecall(v1)} (${v1.byLevel['高危'].correct}/${v1.byLevel['高危'].total}) | **${highRecall(v2)}** (${v2.byLevel['高危'].correct}/${v2.byLevel['高危'].total}) | +${(100*(v2.byLevel['高危'].correct/v2.byLevel['高危'].total - v1.byLevel['高危'].correct/v1.byLevel['高危'].total)).toFixed(1)}% |\n`;
md += `| 无风险准确率 | ${v1.byLevel['无风险']?(100*v1.byLevel['无风险'].correct/v1.byLevel['无风险'].total).toFixed(1)+'%':'—'} | ${v2.byLevel['无风险']?(100*v2.byLevel['无风险'].correct/v2.byLevel['无风险'].total).toFixed(1)+'%':'—'} | — |\n`;
md += `| ±1 级容忍准确率 | ${tolerant(v1)} | **${tolerant(v2)}** | — |\n\n`;

md += `## 2. 各等级召回率(新 expected)\n\n`;
md += `| 等级 | 样本数 | 判对 | 召回率 |\n|---|---|---|---|\n`;
LEVELS.forEach(lv => {
  const b = v2.byLevel[lv];
  if (!b) return;
  md += `| ${lv} | ${b.total} | ${b.correct} | **${(100*b.correct/b.total).toFixed(1)}%** |\n`;
});

md += `\n## 3. 混淆矩阵(新 expected)\n\n`;
md += `| 期望\\实际 | 高危 | 中危 | 低危 | 无风险 | 行计 |\n|---|---|---|---|---|---|\n`;
LEVELS.forEach(e => {
  let rowSum = 0;
  const cells = LEVELS.map(g => {
    const v = (v2.valid.filter(x => x.exp === e && x.got === g)).length;
    rowSum += v;
    return e === g ? `**${v}**` : (v > 0 ? String(v) : '·');
  });
  md += `| **${e}** | ${cells.join(' | ')} | ${rowSum} |\n`;
});

md += `\n## 4. 偏差分布(新 expected)\n\n`;
md += `| 偏差 | 含义 | 数量 |\n|---|---|---|\n`;
['-3','-2','-1','0','1','2','3'].forEach(k => {
  if (v2.buckets[k]) {
    const sign = Number(k) > 0 ? '+' : '';
    md += `| ${sign}${k} | ${k === '0' ? '✅ 完全对' : (Number(k) < 0 ? '漏判' : '过判')} | ${v2.buckets[k]} |\n`;
  }
});

md += `\n## 5. 各分类准确率(新 expected,从高到低)\n\n`;
const sortedCat = Object.entries(v2.byCat).map(([cat,v])=>({cat,acc:v.correct/v.total,n:v.total,c:v.correct})).sort((a,b)=>b.acc-a.acc);
md += `| 分类 | 准确率 | 判对 | 样本数 |\n|---|---|---|---|\n`;
sortedCat.forEach(x => {
  md += `| ${x.cat} | **${(100*x.acc).toFixed(1)}%** | ${x.c} | ${x.n} |\n`;
});

const outFile = path.join(__dirname, '..', 'docs', 'eval_manual_100_report_v2.md');
fs.writeFileSync(outFile, md);
console.log(`\n报告已写入: ${outFile.replace(/\\/g,'/')}`);
