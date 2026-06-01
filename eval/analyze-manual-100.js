#!/usr/bin/env node
/**
 * 手测 100 条结果 vs test_set.json expected 对比分析
 * 输出:
 *   1. 整体准确率
 *   2. 各等级召回率(漏判维度)
 *   3. 各分类准确率
 *   4. 混淆矩阵
 *   5. 误差严重度分布(同级=对/差1级=轻偏/差2级=严重偏/差3级=完全反)
 *   6. 漏判 vs 过判 列表
 *   7. 变体 vs 精标 对比(鲁棒性)
 */

const fs = require('fs');
const path = require('path');

// —— 用户手测结果(2026-06-01,共 100 条)——
// 注意:"无关" 归一化为 "无风险"(同义)
const MANUAL = {
  // 骚扰精标
  H1: '高危', H2: '低危', H3: '高危', H4: '高危', H5: '高危',
  H_real_1: '高危', H_real_2: '高危',
  H14: '中危', H6: '低危', H7: '低危', H8: '低危', H9: '中危', H10: '低危',
  H15: '低危', H16: '低危', H17: '中危',
  H11: '中危', H12: '低危', H13: '无风险', H18: '低危', H19: '低危',
  // 歧视精标
  D1: '高危', D2: '高危', D3: '高危', D4: '高危', D5: '高危',
  D_real_1: '高危', D_real_2: '高危', D_real_3: '高危',
  D6: '中危', D7: '中危', D8: '高危', D9: '高危', D10: '高危',
  D14: '高危', D15: '高危', D16: '高危',
  D11: '低危', D12: '低危', D13: '低危', D17: '中危', D18: '中危',
  // 无关
  N1: '无风险', N2: '无风险', N3: '无风险', N4: '无风险',
  N5: '无风险', N6: '无风险', N7: '无风险', N8: '无风险',
  // 同义改写
  V_pp_01: '低危', V_pp_02: '高危', V_pp_03: '高危', V_pp_04: '高危',
  V_pp_05: '中危', V_pp_06: '低危', V_pp_07: '高危', V_pp_08: '高危',
  V_pp_09: '高危', V_pp_10: '高危', V_pp_11: '中危', V_pp_12: '高危',
  V_pp_13: '无风险', V_pp_14: '无风险', V_pp_15: '高危',
  // 细节扰动
  V_pt_01: '高危', V_pt_02: '高危', V_pt_03: '低危', V_pt_04: '高危',
  V_pt_05: '高危', V_pt_06: '低危', V_pt_07: '高危', V_pt_08: '高危',
  V_pt_09: '低危', V_pt_10: '低危', V_pt_11: '无风险', V_pt_12: '无风险',
  // 干扰句
  V_dt_01: '高危', V_dt_02: '中危', V_dt_03: '中危', V_dt_04: '高危',
  V_dt_05: '中危', V_dt_06: '高危', V_dt_07: '中危',
  V_dt_08: '无风险', V_dt_09: '无风险', V_dt_10: '低危',
  // 要件边界
  V_bd_01: '低危', V_bd_02: '高危', V_bd_03: '中危', V_bd_04: '高危',
  V_bd_05: '低危', V_bd_06: '无风险', V_bd_07: '中危', V_bd_08: '高危',
  // 长文本扩展
  V_vb_01: '高危', V_vb_02: '高危', V_vb_03: '高危', V_vb_04: '高危', V_vb_05: '高危',
};

const LEVEL_RANK = { '高危': 3, '中危': 2, '低危': 1, '无风险': 0 };
const LEVELS = ['高危', '中危', '低危', '无风险'];

function levelDiff(expected, got) {
  return LEVEL_RANK[got] - LEVEL_RANK[expected];
}

function pad(s, n) { s = String(s); return s + ' '.repeat(Math.max(0, n - [...s].length * 1.0)); }

// 中文字符算 2 个字宽
function cnPad(s, n) {
  s = String(s);
  let w = 0;
  for (const c of s) w += /[一-鿿（）·]/.test(c) ? 2 : 1;
  return s + ' '.repeat(Math.max(0, n - w));
}

const testSet = JSON.parse(fs.readFileSync(path.join(__dirname, 'test_set.json'), 'utf-8'));
const cases = testSet.cases;

// —— 主对比 ——
const rows = cases.map(c => {
  const got = MANUAL[c.id];
  const expected = c.expected.risk_level;
  if (got == null) {
    return { id: c.id, category: c.category, expected, got: '(无手测)', correct: false, missing: true, diff: null };
  }
  const correct = got === expected;
  const diff = levelDiff(expected, got);
  return { id: c.id, category: c.category, expected, got, correct, missing: false, diff, notes: c.notes, anchor: c.anchor };
});

const total = rows.length;
const valid = rows.filter(r => !r.missing);
const correct = valid.filter(r => r.correct);
const missing = rows.filter(r => r.missing);

let out = '';
out += '# 言行雷达 100 条手测结果 vs test_set.json 期望对比\n\n';
out += `**评测时间**:${new Date().toISOString().slice(0,10)}\n`;
out += `**测试集版本**:v${testSet.version}\n`;
out += `**对比方式**:人工手测产品输出 vs 标准答案(人按四级准则心算标注)\n`;
out += `**已知方法学瑕疵**:标准答案的 risk_level 是标注者心算映射,未跑代码节点 compute_risk_level 校验。少数边界条目可能"标注偏保守 vs AI 偏激进"分歧 ≠ AI 错。\n\n`;
out += `---\n\n`;

// 1. 整体准确率
out += `## 1. 整体准确率\n\n`;
out += `- 总用例数:**${total}**\n`;
out += `- 已手测:**${valid.length}**\n`;
out += `- 未手测:${missing.length} ${missing.length ? '(' + missing.map(r => r.id).join(',') + ')' : ''}\n`;
out += `- 判对:**${correct.length}**\n`;
out += `- **整体准确率:${(100 * correct.length / valid.length).toFixed(1)}%** (${correct.length}/${valid.length})\n\n`;

// 95% CI
const p = correct.length / valid.length;
const se = Math.sqrt(p * (1 - p) / valid.length);
out += `- 95% 置信区间:**${((p - 1.96 * se) * 100).toFixed(1)}% – ${((p + 1.96 * se) * 100).toFixed(1)}%**(n=${valid.length})\n\n`;

// 2. 各等级召回
out += `## 2. 各等级召回率(该等级期望样本中,被判对的比例)\n\n`;
out += `| 期望等级 | 样本数 | 判对 | 召回率 |\n`;
out += `|---|---|---|---|\n`;
LEVELS.forEach(lv => {
  const samples = valid.filter(r => r.expected === lv);
  const okN = samples.filter(r => r.correct).length;
  const recall = samples.length > 0 ? (100 * okN / samples.length).toFixed(1) + '%' : '—';
  out += `| ${lv} | ${samples.length} | ${okN} | **${recall}** |\n`;
});
out += `\n`;

// 3. 各分类准确率
out += `## 3. 各分类准确率\n\n`;
const byCat = {};
valid.forEach(r => {
  if (!byCat[r.category]) byCat[r.category] = { total: 0, correct: 0 };
  byCat[r.category].total++;
  if (r.correct) byCat[r.category].correct++;
});
out += `| 分类 | 样本数 | 判对 | 准确率 |\n`;
out += `|---|---|---|---|\n`;
Object.keys(byCat).sort().forEach(k => {
  const c = byCat[k];
  out += `| ${k} | ${c.total} | ${c.correct} | **${(100 * c.correct / c.total).toFixed(1)}%** |\n`;
});
out += `\n`;

// 4. 混淆矩阵
out += `## 4. 混淆矩阵(行=期望,列=实际)\n\n`;
const matrix = {};
LEVELS.forEach(e => { matrix[e] = {}; LEVELS.forEach(g => matrix[e][g] = 0); });
valid.forEach(r => { matrix[r.expected][r.got]++; });
out += `| 期望 \\ 实际 | ${LEVELS.map(l => `**${l}**`).join(' | ')} | **行计** |\n`;
out += `|${'---|'.repeat(LEVELS.length + 2)}\n`;
LEVELS.forEach(e => {
  const row = LEVELS.map(g => matrix[e][g]);
  const sum = row.reduce((a, b) => a + b, 0);
  // 对角线高亮
  const cells = LEVELS.map((g, i) => {
    const v = matrix[e][g];
    return e === g ? `**${v}**` : (v > 0 ? `${v}` : '·');
  });
  out += `| **${e}** | ${cells.join(' | ')} | ${sum} |\n`;
});
out += `| **列计** | ${LEVELS.map(g => valid.filter(r => r.got === g).length).join(' | ')} | ${valid.length} |\n\n`;

// 5. 误差严重度
out += `## 5. 误差严重度分布\n\n`;
const diffBuckets = { '-3': 0, '-2': 0, '-1': 0, '0': 0, '1': 0, '2': 0, '3': 0 };
valid.forEach(r => { diffBuckets[String(r.diff)]++; });
out += `| 偏差 | 含义 | 数量 | 占比 |\n`;
out += `|---|---|---|---|\n`;
const diffNames = {
  '-3': '严重漏判(高危→无风险)',
  '-2': '严重漏判(差 2 级)',
  '-1': '轻度漏判(差 1 级)',
  '0': '✅ 完全对',
  '1': '轻度过判(差 1 级)',
  '2': '严重过判(差 2 级)',
  '3': '严重过判(无风险→高危)',
};
['-3','-2','-1','0','1','2','3'].forEach(k => {
  const n = diffBuckets[k];
  if (n > 0) {
    out += `| ${k > 0 ? '+' + k : k} | ${diffNames[k]} | ${n} | ${(100 * n / valid.length).toFixed(1)}% |\n`;
  }
});
out += `\n`;

const tolerantCorrect = valid.filter(r => Math.abs(r.diff) <= 1).length;
out += `- **严格准确率**(必须完全相同): ${(100 * correct.length / valid.length).toFixed(1)}% (${correct.length}/${valid.length})\n`;
out += `- **±1 级容忍准确率**(差不超过 1 级): ${(100 * tolerantCorrect / valid.length).toFixed(1)}% (${tolerantCorrect}/${valid.length})\n\n`;

// 6. 漏判 vs 过判
const missed = valid.filter(r => r.diff < 0);
const over = valid.filter(r => r.diff > 0);
out += `## 6. 漏判 vs 过判 详单\n\n`;
out += `**漏判(${missed.length} 条)**:产品判得比预期低,**对法律 AI 是更严重的错误**(可能让真实风险案例被忽视)\n\n`;
out += `| ID | 分类 | 期望 | 实际 | 偏差 | notes |\n|---|---|---|---|---|---|\n`;
missed.sort((a, b) => a.diff - b.diff || a.id.localeCompare(b.id)).forEach(r => {
  out += `| ${r.id} | ${r.category} | ${r.expected} | ${r.got} | ${r.diff} | ${(r.notes||'').slice(0, 50)} |\n`;
});

out += `\n**过判(${over.length} 条)**:产品判得比预期高,**对法律 AI 是次要错误**(过度警告,可解释为召回优先)\n\n`;
out += `| ID | 分类 | 期望 | 实际 | 偏差 | notes |\n|---|---|---|---|---|---|\n`;
over.sort((a, b) => b.diff - a.diff || a.id.localeCompare(b.id)).forEach(r => {
  out += `| ${r.id} | ${r.category} | ${r.expected} | ${r.got} | +${r.diff} | ${(r.notes||'').slice(0, 50)} |\n`;
});
out += `\n`;

// 7. 变体 vs 精标 鲁棒性
out += `## 7. 变体鲁棒性分析\n\n`;
const baseCases = cases.filter(c => !c.variant_of);
const variants = cases.filter(c => c.variant_of);
const baseStats = {};
baseCases.forEach(c => {
  baseStats[c.id] = { base: c, baseCorrect: rows.find(r => r.id === c.id)?.correct };
});
variants.forEach(v => {
  const baseId = v.variant_of;
  if (!baseStats[baseId]) return;
  if (!baseStats[baseId].variants) baseStats[baseId].variants = [];
  const vRow = rows.find(r => r.id === v.id);
  if (vRow && !vRow.missing) baseStats[baseId].variants.push({ ...vRow, variant_type: v.variant_type });
});

out += `| variant 类型 | 样本数 | 跟原精标一致 | 一致率 |\n`;
out += `|---|---|---|---|\n`;
const variantTypes = ['paraphrase', 'perturb', 'distract', 'boundary', 'verbose'];
const vTypeNames = { paraphrase: '同义改写', perturb: '细节扰动', distract: '干扰句', boundary: '要件边界', verbose: '长文本扩展' };
variantTypes.forEach(t => {
  const vs = variants.filter(c => c.variant_type === t);
  let consistent = 0, totalCmp = 0;
  vs.forEach(v => {
    const vR = rows.find(r => r.id === v.id);
    if (!vR || vR.missing) return;
    if (t === 'boundary') {
      // boundary 变体期望可能跟原案例不同,直接用 expected vs got
      totalCmp++;
      if (vR.correct) consistent++;
    } else {
      const baseR = rows.find(r => r.id === v.variant_of);
      if (!baseR || baseR.missing) return;
      totalCmp++;
      if (vR.got === baseR.got) consistent++;
    }
  });
  out += `| ${vTypeNames[t]} (${t}) | ${totalCmp} | ${consistent} | **${totalCmp > 0 ? (100*consistent/totalCmp).toFixed(1)+'%' : '—'}** |\n`;
});
out += `\n> 鲁棒性指标说明:对 paraphrase/perturb/distract/verbose 这 4 类,衡量"输入变形但语义不变后,模型输出是否跟原精标一致";对 boundary,衡量"刻意改变要件后,模型是否能跟着调整等级"。\n\n`;

// 8. 锚点维度
out += `## 8. 按锚点类型拆解(judicial / statute / derived)\n\n`;
out += `| 锚点 | 含义 | 样本数 | 判对 | 准确率 |\n|---|---|---|---|---|\n`;
const anchorNames = { judicial: '已生效判例', statute: '法律条文', derived: '判例推导' };
['judicial', 'statute', 'derived'].forEach(at => {
  const anchored = baseCases.filter(c => c.anchor && c.anchor.type === at);
  let ok = 0, n = 0;
  anchored.forEach(c => {
    const r = rows.find(x => x.id === c.id);
    if (!r || r.missing) return;
    n++;
    if (r.correct) ok++;
  });
  out += `| **${at}** | ${anchorNames[at]} | ${n} | ${ok} | **${n > 0 ? (100*ok/n).toFixed(1)+'%' : '—'}** |\n`;
});
out += `\n`;

// 9. 高危召回(对法律 AI 最关键)
out += `## 9. 关键指标:高危召回(对法律 AI 最重要)\n\n`;
const highExp = valid.filter(r => r.expected === '高危');
const highHit = highExp.filter(r => r.correct).length;
const highMissed = highExp.filter(r => r.diff < 0);
out += `- 高危样本总数:**${highExp.length}**\n`;
out += `- 召回(判对):**${highHit}**\n`;
out += `- **高危召回率:${(100 * highHit / highExp.length).toFixed(1)}%**\n\n`;
if (highMissed.length > 0) {
  out += `**被漏判的高危样本(${highMissed.length}):**\n\n`;
  out += `| ID | 实际判成 | notes |\n|---|---|---|\n`;
  highMissed.forEach(r => {
    out += `| ${r.id} | ${r.got} | ${(r.notes || '').slice(0, 60)} |\n`;
  });
}

// 10. 写入文件
fs.writeFileSync(path.join(__dirname, '..', 'docs', 'eval_manual_100_report.md'), out);
console.log(out);
console.log(`\n报告已写入: docs/eval_manual_100_report.md`);
