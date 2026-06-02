#!/usr/bin/env node
/**
 * 把 annotation_template.csv 用我的标注填好,输出:
 *   eval/annotation_filled.csv         —— 100 条全填,可改可校对
 *   eval/annotation_diff_report.md     —— 差异表(标注算出的 final_level vs 当前 expected)
 *
 * 标注口径(给评委透明展示):
 *   - h1 行为与性有关:是否含性化暗示/性化关注/性化邀约/性化触摸
 *   - h2 违背意愿:满足=明确拒绝/反抗/事后维权/客观胁迫无法拒绝;存疑=被动接受或未明确表态
 *   - h3 职场情境:工作关系或工作场所或利用职务便利
 *   - agg_肢体:搂抱亲吻强行触摸等肢体侵入;agg_职权:用升降职/解雇/穿小鞋等明确威胁
 *   - agg_持续:多次重复构成骚扰模式(不仅"邀约多次");agg_多人:对多人实施;agg_书面:文字/群可固化
 *   - e1 区别对待 / e2 就业环节:招聘/晋升/薪资/调岗/解雇
 *   - institutional=写进规章/招聘启事/合同等制度性形式
 *   - concrete_harm=已造成实质后果(辞退/降薪/失去晋升/撤回 offer 等)
 */

const fs = require('fs');
const path = require('path');

const testSet = JSON.parse(fs.readFileSync(path.join(__dirname, 'test_set.json'), 'utf-8'));

// —— 标注主表 ——
// 字段简写:
//   h1/h2/h3:性骚扰三要件(满足/存疑/不满足/不适用)
//   ap=肢体 aq=职权 ac=持续 am=多人 aw=书面(Y/N/'')
//   e1/e2:歧视两要件(同上四态)
//   ins=institutional har=concrete_harm(是/否/不适用)
const _S = '满足', _D = '存疑', _N = '不满足', _NA = '不适用';
const _Y = '是', _NO = '否';
const a = (h1,h2,h3,ap,aq,ac,am,aw,e1,e2,ins,har) => ({h1,h2,h3,ap,aq,ac,am,aw,e1,e2,ins,har});

const ANN = {
  // ============ 骚扰-高危 ============
  H1:       a(_S, _S, _S, 'N','Y','N','N','N', _NA,_NA,_NA,_NA),
  H2:       a(_S, _S, _S, 'Y','Y','Y','N','N', _NA,_NA,_NA,_NA),
  H3:       a(_S, _S, _S, 'Y','N','Y','N','N', _NA,_NA,_NA,_NA),
  H4:       a(_S, _S, _S, 'N','Y','Y','N','Y', _NA,_NA,_NA,_NA),
  H5:       a(_S, _S, _S, 'N','Y','N','N','N', _NA,_NA,_NA,_NA),
  H_real_1: a(_S, _S, _S, 'Y','Y','N','N','N', _NA,_NA,_NA,_NA),
  H_real_2: a(_S, _S, _S, 'Y','Y','Y','N','N', _NA,_NA,_NA,_NA),
  H14:      a(_S, _S, _S, 'N','Y','Y','Y','N', _NA,_NA,_NA,_NA),

  // ============ 骚扰-中危 ============
  H6:       a(_S, _D, _S, 'N','N','N','N','N', _NA,_NA,_NA,_NA),
  H7:       a(_S, _D, _S, 'N','N','N','N','N', _NA,_NA,_NA,_NA),
  H8:       a(_S, _D, _S, 'N','N','N','N','Y', _NA,_NA,_NA,_NA),
  H9:       a(_S, _D, _S, 'N','N','N','Y','Y', _NA,_NA,_NA,_NA),
  H10:      a(_S, _D, _S, 'N','N','N','N','N', _S, _S, _NO,_NO),  // 双类型
  H15:      a(_S, _S, _S, 'N','N','N','N','N', _NA,_NA,_NA,_NA),
  H16:      a(_S, _D, _S, 'Y','N','Y','N','N', _NA,_NA,_NA,_NA),
  H17:      a(_S, _D, _S, 'N','N','N','N','N', _NA,_NA,_NA,_NA),

  // ============ 骚扰-低危 ============
  H11:      a(_D, _N, _S, 'N','N','N','N','N', _NA,_NA,_NA,_NA),
  H12:      a(_D, _D, _S, 'N','N','N','N','N', _NA,_NA,_NA,_NA),
  H13:      a(_N, _N, _S, 'N','N','N','N','N', _NA,_NA,_NA,_NA),  // 注:严格按事实 h1=不满足 → 应判无风险, 跟 expected=低危 有差
  H18:      a(_D, _N, _S, 'N','N','N','N','N', _NA,_NA,_NA,_NA),
  H19:      a(_D, _N, _S, 'N','N','N','N','Y', _NA,_NA,_NA,_NA),

  // ============ 歧视-高危 ============
  D1:       a(_NA,_NA,_NA,'','','','','',     _S, _S, _Y, _NO),
  D2:       a(_NA,_NA,_NA,'','','','','',     _S, _S, _NO,_Y ),
  D3:       a(_NA,_NA,_NA,'','','','','',     _S, _S, _Y, _NO),
  D4:       a(_NA,_NA,_NA,'','','','','',     _S, _S, _NO,_Y ),
  D5:       a(_NA,_NA,_NA,'','','','','',     _S, _S, _Y, _NO),
  D_real_1: a(_NA,_NA,_NA,'','','','','',     _S, _S, _NO,_Y ),
  D_real_2: a(_NA,_NA,_NA,'','','','','',     _S, _S, _NO,_Y ),
  D_real_3: a(_NA,_NA,_NA,'','','','','',     _S, _S, _NO,_Y ),

  // ============ 歧视-中危 ============
  D6:       a(_NA,_NA,_NA,'','','','','',     _S, _S, _NO,_NO),
  D7:       a(_NA,_NA,_NA,'','','','','',     _S, _S, _NO,_NO),
  D8:       a(_NA,_NA,_NA,'','','','','',     _S, _S, _NO,_Y ),  // 严格:同工不同酬持续累积=实质后果, 应升高危
  D9:       a(_NA,_NA,_NA,'','','','','',     _S, _S, _NO,_Y ),  // 严格:失去晋升=实质后果, 应升高危
  D10:      a(_NA,_NA,_NA,'','','','','',     _S, _S, _NO,_Y ),  // 严格:系统性失去出差机会=实质后果
  D14:      a(_NA,_NA,_NA,'','','','','',     _S, _S, _NO,_Y ),  // 严格:失去晋升
  D15:      a(_NA,_NA,_NA,'','','','','',     _S, _S, _NO,_NO),  // 年会单次,边界,保中危
  D16:      a(_NA,_NA,_NA,'','','','','',     _S, _S, _NO,_Y ),  // 严格:失去项目=实质后果

  // ============ 歧视-低危 ============
  D11:      a(_NA,_NA,_NA,'','','','','',     _D, _S, _NO,_NO),
  D12:      a(_NA,_NA,_NA,'','','','','',     _D, _S, _NO,_NO),
  D13:      a(_NA,_NA,_NA,'','','','','',     _D, _N, _NO,_NO),
  D17:      a(_NA,_NA,_NA,'','','','','',     _D, _S, _NO,_NO),
  D18:      a(_NA,_NA,_NA,'','','','','',     _D, _N, _NO,_NO),

  // ============ 无关-无风险(N1-N8)============
  N1: a(_NA,_NA,_NA,'','','','','', _NA,_NA,_NA,_NA),
  N2: a(_NA,_NA,_NA,'','','','','', _NA,_NA,_NA,_NA),
  N3: a(_NA,_NA,_NA,'','','','','', _NA,_NA,_NA,_NA),
  N4: a(_NA,_NA,_NA,'','','','','', _NA,_NA,_NA,_NA),
  N5: a(_NA,_NA,_NA,'','','','','', _NA,_NA,_NA,_NA),
  N6: a(_NA,_NA,_NA,'','','','','', _NA,_NA,_NA,_NA),
  N7: a(_NA,_NA,_NA,'','','','','', _NA,_NA,_NA,_NA),
  N8: a(_NA,_NA,_NA,'','','','','', _NA,_NA,_NA,_NA),

  // ============ 同义改写变体 V_pp_*(继承 variant_of)============
  // 大部分跟 base 一致,边界值 V_pp_12=D8 同步严格标
  V_pp_01: null, V_pp_02: null, V_pp_03: null, V_pp_04: null, V_pp_05: null,
  V_pp_06: null, V_pp_07: null, V_pp_08: null, V_pp_09: null, V_pp_10: null,
  V_pp_11: null, V_pp_12: null, V_pp_13: null, V_pp_14: null, V_pp_15: null,

  // ============ 细节扰动 V_pt_*(继承 variant_of)============
  V_pt_01: null, V_pt_02: null, V_pt_03: null, V_pt_04: null, V_pt_05: null,
  V_pt_06: null, V_pt_07: null, V_pt_08: null, V_pt_09: null, V_pt_10: null,
  V_pt_11: null, V_pt_12: null,

  // ============ 干扰句 V_dt_*(继承 variant_of)============
  V_dt_01: null, V_dt_02: null, V_dt_03: null, V_dt_04: null, V_dt_05: null,
  V_dt_06: null, V_dt_07: null, V_dt_08: null, V_dt_09: null, V_dt_10: null,

  // ============ 要件边界 V_bd_*(单独标,变化方向看 notes)============
  // V_bd_01: H_real_1 弱化 —— 老板"邀我到酒店谈合作",用户同意,无抱住威胁 → 低危
  V_bd_01: a(_D, _N, _S, 'N','N','N','N','N', _NA,_NA,_NA,_NA),
  // V_bd_02: H1 强化 —— 加 lock 车门 + 明确升职威胁 → 仍高危
  V_bd_02: a(_S, _S, _S, 'Y','Y','N','N','N', _NA,_NA,_NA,_NA),
  // V_bd_03: D2 弱化 —— 调岗但同薪同级 → 中危(无 concrete_harm)
  V_bd_03: a(_NA,_NA,_NA,'','','','','',     _S, _S, _NO,_NO),
  // V_bd_04: D8 强化 —— 制度性 + 全员降薪 → 高危
  V_bd_04: a(_NA,_NA,_NA,'','','','','',     _S, _S, _Y, _Y ),
  // V_bd_05: H6 强化 —— "不吃饭年终奖别想拿满" 明确职权胁迫 → 高危
  V_bd_05: a(_S, _S, _S, 'N','Y','N','N','N', _NA,_NA,_NA,_NA),
  // V_bd_06: D9 弱化 —— 用客观业绩 30%/客户满意度领先 + 去性别理由 → 无风险
  V_bd_06: a(_NA,_NA,_NA,'','','','','',     _N, _S, _NO,_NO),
  // V_bd_07: H10 弱化 —— 隐喻式表达"考虑成家也都很自然" → 低危
  V_bd_07: a(_D, _D, _S, 'N','N','N','N','N', _D, _S, _NO,_NO),
  // V_bd_08: D12 强化 —— 明确"我们这岗位不要女的"+ 拒录 → 高危
  V_bd_08: a(_NA,_NA,_NA,'','','','','',     _S, _S, _Y, _Y ),

  // ============ 长文本 V_vb_*(继承 variant_of)============
  V_vb_01: null, V_vb_02: null, V_vb_03: null, V_vb_04: null, V_vb_05: null,
};

// —— 变体继承 base 的标注 ——
testSet.cases.forEach(c => {
  if (ANN[c.id] === null && c.variant_of) {
    if (!ANN[c.variant_of]) {
      console.error('警告:变体', c.id, '指向的 base', c.variant_of, '没有标注');
      ANN[c.id] = a('','','','','','','','','','','','');
    } else {
      ANN[c.id] = { ...ANN[c.variant_of] };
    }
  }
});

// —— compute_risk_level 的 JS 等价实现(对照 元器代码节点 Python 版)——
function computeRiskLevel(data) {
  const RISK_TEXT = { 3: '高危', 2: '中危', 1: '低危', 0: '无风险' };
  const type_list = data.type || [];
  const elements = data.elements_check || [];
  const agg = (data.aggravating_factors || []).filter(x => String(x).trim());
  const agg_text = agg.join(' ');
  const has_any_agg = agg.length > 0;
  const harass_severe = ['肢体接触', '职权胁迫', '胁迫'].some(k => agg_text.indexOf(k) >= 0);
  const ds = data.discrimination_severity || {};
  const discrim_severe = ds.institutional === '是' || ds.concrete_harm === '是';
  const ambiguous = type_list.length === 0 || type_list.includes('暂不明确');
  const do_harass  = type_list.includes('性骚扰') || ambiguous;
  const do_discrim = type_list.includes('性别歧视') || ambiguous;
  const status = (...subs) => {
    for (const e of elements) {
      const name = (e.name || '');
      if (subs.some(s => name.indexOf(s) >= 0)) return e.status || '不适用';
    }
    return '不适用';
  };
  const s = x => x === '满足', d = x => x === '存疑';
  const levels = [];
  if (do_harass) {
    const h1 = status('性有关'), h2 = status('违背'), h3 = status('职场情境','职场');
    if (s(h1)) {
      if ((s(h2) && s(h3) && has_any_agg) || (s(h2) && harass_severe)) levels.push(3);
      else if (s(h2) || s(h3) || d(h2) || d(h3)) levels.push(2);
      else levels.push(1);
    } else if (d(h1)) levels.push(1);
    else levels.push(0);
  }
  if (do_discrim) {
    const e1 = status('区别对待'), e2 = status('就业环节','就业');
    if (s(e1)) {
      if (s(e2) && discrim_severe) levels.push(3);
      else if (s(e2) || d(e2)) levels.push(2);
      else levels.push(1);
    } else if (d(e1)) levels.push(1);
    else levels.push(0);
  }
  return RISK_TEXT[levels.length ? Math.max(...levels) : 0];
}

// —— 由我的标注构造 compute_risk_level 的 data 入参 ——
function annToData(ann, typeArr) {
  const elements_check = [];
  if (ann.h1 !== _NA) elements_check.push({ name: '行为与性有关',   status: ann.h1 });
  if (ann.h2 !== _NA) elements_check.push({ name: '违背意愿',       status: ann.h2 });
  if (ann.h3 !== _NA) elements_check.push({ name: '职场情境',       status: ann.h3 });
  if (ann.e1 !== _NA) elements_check.push({ name: '区别对待',       status: ann.e1 });
  if (ann.e2 !== _NA) elements_check.push({ name: '就业环节',       status: ann.e2 });
  const aggMap = { ap:'肢体接触', aq:'职权胁迫', ac:'持续重复', am:'多人受害', aw:'书面化' };
  const aggravating_factors = [];
  Object.entries(aggMap).forEach(([k, label]) => {
    if (ann[k] === 'Y') aggravating_factors.push(label);
  });
  return {
    type: typeArr,
    elements_check,
    aggravating_factors,
    discrimination_severity: {
      institutional: ann.ins,
      concrete_harm: ann.har
    }
  };
}

// —— 写 CSV ——
const HEAD = [
  'id','category','variant_of','variant_type','input',
  'h1_行为与性有关','h2_违背意愿','h3_职场情境',
  'agg_肢体接触','agg_职权胁迫','agg_持续重复','agg_多人受害','agg_书面化',
  'e1_区别对待','e2_就业环节',
  'discrim_institutional','discrim_concrete_harm',
  'type','current_expected_level','annotator',
  'final_level','match','notes_current','notes_annotator'
];

function csvEsc(s) {
  if (s == null) return '';
  s = String(s);
  if (/[",\n\r\t=]/.test(s) || s.startsWith(' ') || s.startsWith('=')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

const rows = [HEAD.map(csvEsc).join(',')];
const diffs = [];   // 不一致条目

testSet.cases.forEach(c => {
  const ann = ANN[c.id];
  if (!ann) {
    console.error('缺标注:', c.id);
    return;
  }
  const typeArr = c.expected.type || [];
  const data = annToData(ann, typeArr);
  const computed = computeRiskLevel(data);
  const match = computed === c.expected.risk_level ? '✓' : '✗';

  if (computed !== c.expected.risk_level) {
    diffs.push({ id: c.id, category: c.category, expected: c.expected.risk_level, computed, input: c.input, notes: c.notes });
  }

  rows.push([
    c.id, c.category, c.variant_of || '', c.variant_type || '', c.input,
    ann.h1, ann.h2, ann.h3,
    ann.ap, ann.aq, ann.ac, ann.am, ann.aw,
    ann.e1, ann.e2,
    ann.ins, ann.har,
    typeArr.join('+'),
    c.expected.risk_level,
    'AI 助手(初标)',
    computed,
    match,
    c.notes || '',
    ''
  ].map(csvEsc).join(','));
});

const outCsv = path.join(__dirname, 'annotation_filled.csv');
fs.writeFileSync(outCsv, '﻿' + rows.join('\r\n'), 'utf-8');
console.log('CSV 已写入:', outCsv);
console.log(`总用例:${testSet.cases.length},标注算出来跟当前 expected 不一致:${diffs.length}`);

// —— 差异报告 ——
let md = '# 标注 vs current_expected 差异报告\n\n';
md += `**评测时间**:${new Date().toISOString().slice(0,10)}\n`;
md += `**用例总数**:${testSet.cases.length}\n`;
md += `**一致**:${testSet.cases.length - diffs.length} / ${testSet.cases.length}\n`;
md += `**不一致**:${diffs.length} / ${testSet.cases.length}\n\n`;
md += `> 不一致 = "按要件级标注+代码 compute_risk_level 算出的等级"与"test_set.json 当前 expected.risk_level"分歧。\n> 这些条目需要逐条决定:**改 test_set 的 expected,或改要件标注,或改 compute_risk_level 规则**。\n\n`;
md += `---\n\n`;
md += `## 差异条目(${diffs.length})\n\n`;
md += `| id | 分类 | 当前 expected | 标注+代码算出 | 偏差 | input 摘要 | 调整建议 |\n|---|---|---|---|---|---|---|\n`;
const ORDER = { 高危:3, 中危:2, 低危:1, 无风险:0 };
diffs.forEach(d => {
  const delta = ORDER[d.computed] - ORDER[d.expected];
  const suggest = delta > 0
    ? '改 expected 升一级(标注按事实严格,代码按规则映射,两边一致)'
    : '改 expected 降一级 或 调整标注 或 检查规则';
  md += `| ${d.id} | ${d.category} | ${d.expected} | **${d.computed}** | ${delta > 0 ? '+' : ''}${delta} | ${d.input.slice(0, 35)}... | ${suggest} |\n`;
});

fs.writeFileSync(path.join(__dirname, 'annotation_diff_report.md'), md);
console.log('差异报告已写入: eval/annotation_diff_report.md');
