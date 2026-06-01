#!/usr/bin/env node
/**
 * 校验要件级标注 CSV,跑 compute_risk_level 算出 final_level,跟 current_expected 对比。
 *
 * 用法:
 *   node eval/validate-annotation.js
 *     (默认读 eval/annotation_filled.csv,输出 eval/annotation_validated.csv + eval/annotation_diff_report.md)
 *
 *   node eval/validate-annotation.js --input eval/annotation_template.csv --output eval/r.csv --diff eval/d.md
 *
 *   node eval/validate-annotation.js --strict
 *     (开启严格模式:遇到非法取值或空行直接报错退出,不静默兜底)
 *
 *   node eval/validate-annotation.js --apply-to-test-set
 *     (把所有 final_level 不一致的条目用 final_level 更新到 test_set.json 的 expected.risk_level,
 *      生成 test_set.v_new.json,不会覆盖原文件)
 */

const fs = require('fs');
const path = require('path');

// ---------- 参数解析 ----------
function argv(name, def) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}
const FLAG = n => process.argv.includes(n);

const opts = {
  input:        argv('--input',  path.join(__dirname, 'annotation_filled.csv')),
  output:       argv('--output', path.join(__dirname, 'annotation_validated.csv')),
  diff:         argv('--diff',   path.join(__dirname, 'annotation_diff_report.md')),
  testSet:      argv('--test-set', path.join(__dirname, 'test_set.json')),
  strict:       FLAG('--strict'),
  applyToTest:  FLAG('--apply-to-test-set'),
  help:         FLAG('--help') || FLAG('-h'),
};

if (opts.help) {
  console.log(`用法: node eval/validate-annotation.js [选项]

  --input <csv>            读 CSV 路径(默认 eval/annotation_filled.csv)
  --output <csv>           写带 final_level/match 列的 CSV(默认 eval/annotation_validated.csv)
  --diff <md>              写差异报告(默认 eval/annotation_diff_report.md)
  --test-set <json>        读测试集 JSON(默认 eval/test_set.json,仅用于 --apply-to-test-set)
  --strict                 严格模式:遇非法取值直接报错退出
  --apply-to-test-set      把差异条目的 expected 用 final_level 更新写到 test_set.v_new.json
  --help / -h              本帮助
`);
  process.exit(0);
}

// ---------- 取值字典(同时接受全角/半角 + 同义词) ----------
const STATUS_NORM = {
  '满足':'满足', '满': '满足', '是': '满足', 'Y': '满足', 'YES': '满足',
  '存疑':'存疑', '疑': '存疑', '不确定': '存疑', 'MAYBE': '存疑',
  '不满足':'不满足', '否': '不满足', 'N': '不满足', 'NO': '不满足',
  '不适用':'不适用', 'NA': '不适用', 'N/A': '不适用', '': '不适用',
};
const BOOL_NORM = {
  'Y':'Y', '是':'Y', 'YES':'Y', 'TRUE':'Y', '1':'Y',
  'N':'N', '否':'N', 'NO':'N', 'FALSE':'N', '0':'N',
  '':'N',  // 空值默认 N(没标 = 没有该加重情节)
};
const SEV_NORM = {
  '是':'是', 'Y':'是', 'YES':'是', 'TRUE':'是', '1':'是',
  '否':'否', 'N':'否', 'NO':'否', 'FALSE':'否', '0':'否',
  '不适用':'不适用', 'NA':'不适用', 'N/A':'不适用', '':'不适用',
};

function normStatus(v, ctx) {
  const k = String(v || '').trim().toUpperCase();
  const lookup = STATUS_NORM[String(v || '').trim()] || STATUS_NORM[k];
  if (lookup === undefined) {
    const msg = `[${ctx}] 非法状态取值 "${v}",应为 满足/存疑/不满足/不适用`;
    if (opts.strict) { console.error('✖ ' + msg); process.exit(1); }
    console.warn('⚠ ' + msg + ' → 按"不适用"处理');
    return '不适用';
  }
  return lookup;
}
function normBool(v, ctx) {
  const k = String(v || '').trim().toUpperCase();
  const lookup = BOOL_NORM[String(v || '').trim()] || BOOL_NORM[k];
  if (lookup === undefined) {
    const msg = `[${ctx}] 非法布尔取值 "${v}",应为 Y/N`;
    if (opts.strict) { console.error('✖ ' + msg); process.exit(1); }
    console.warn('⚠ ' + msg + ' → 按 N 处理');
    return 'N';
  }
  return lookup;
}
function normSev(v, ctx) {
  const k = String(v || '').trim().toUpperCase();
  const lookup = SEV_NORM[String(v || '').trim()] || SEV_NORM[k];
  if (lookup === undefined) {
    const msg = `[${ctx}] 非法严重度取值 "${v}",应为 是/否/不适用`;
    if (opts.strict) { console.error('✖ ' + msg); process.exit(1); }
    console.warn('⚠ ' + msg + ' → 按"不适用"处理');
    return '不适用';
  }
  return lookup;
}

// ---------- compute_risk_level(JS 端口,跟元器代码节点 Python 版逐行对齐)----------
function computeRiskLevel(data) {
  const RISK_TEXT = { 3:'高危', 2:'中危', 1:'低危', 0:'无风险' };
  const type_list = data.type || [];
  const elements = data.elements_check || [];
  const agg = (data.aggravating_factors || []).filter(x => String(x).trim());
  const agg_text = agg.join(' ');
  const has_any_agg = agg.length > 0;
  const harass_severe = ['肢体接触', '职权胁迫', '胁迫'].some(k => agg_text.indexOf(k) >= 0);
  const ds = data.discrimination_severity || {};
  const discrim_severe = ds.institutional === '是' || ds.concrete_harm === '是';
  const ambiguous = type_list.length === 0 || type_list.includes('暂不明确');
  const do_harass  = type_list.includes('性骚扰')   || ambiguous;
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
    const h1 = status('性有关'), h2 = status('违背'), h3 = status('职场情境', '职场');
    if (s(h1)) {
      if ((s(h2) && s(h3) && has_any_agg) || (s(h2) && harass_severe)) levels.push(3);
      else if (s(h2) || s(h3) || d(h2) || d(h3)) levels.push(2);
      else levels.push(1);
    } else if (d(h1)) levels.push(1);
    else levels.push(0);
  }
  if (do_discrim) {
    const e1 = status('区别对待'), e2 = status('就业环节', '就业');
    if (s(e1)) {
      if (s(e2) && discrim_severe) levels.push(3);
      else if (s(e2) || d(e2)) levels.push(2);
      else levels.push(1);
    } else if (d(e1)) levels.push(1);
    else levels.push(0);
  }
  return RISK_TEXT[levels.length ? Math.max(...levels) : 0];
}

// ---------- 简单 CSV 解析(支持双引号转义)----------
function parseCsv(text) {
  // 去 BOM
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const rows = [];
  let row = [], cur = '', inStr = false, i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (inStr) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cur += '"'; i += 2; continue; }
        inStr = false; i++; continue;
      }
      cur += ch; i++; continue;
    }
    if (ch === '"') { inStr = true; i++; continue; }
    if (ch === ',') { row.push(cur); cur = ''; i++; continue; }
    if (ch === '\r') { i++; continue; }
    if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; i++; continue; }
    cur += ch; i++;
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

function csvEsc(s) {
  if (s == null) return '';
  s = String(s);
  if (/[",\n\r\t=]/.test(s) || s.startsWith(' ') || s.startsWith('=')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

// ---------- 读取 ----------
if (!fs.existsSync(opts.input)) {
  console.error(`✖ 找不到输入文件: ${opts.input}`);
  process.exit(1);
}
const raw = fs.readFileSync(opts.input, 'utf-8');
const rows = parseCsv(raw);
if (rows.length < 2) {
  console.error('✖ CSV 至少要 1 行表头 + 1 行数据');
  process.exit(1);
}
const headers = rows[0];
const colIdx = {};
headers.forEach((h, i) => { colIdx[h.trim()] = i; });

const REQUIRED_COLS = [
  'id','category','input',
  'h1_行为与性有关','h2_违背意愿','h3_职场情境',
  'agg_肢体接触','agg_职权胁迫','agg_持续重复','agg_多人受害','agg_书面化',
  'e1_区别对待','e2_就业环节',
  'discrim_institutional','discrim_concrete_harm',
  'type','current_expected_level'
];
const missing = REQUIRED_COLS.filter(c => colIdx[c] === undefined);
if (missing.length) {
  console.error('✖ CSV 缺少必需列:', missing.join(', '));
  process.exit(1);
}

// 输出列:在原有列基础上,确保 final_level / match / notes_annotator 存在
const OUT_HEADERS = headers.slice();
['final_level','match','notes_annotator','annotator'].forEach(c => {
  if (colIdx[c] === undefined) {
    OUT_HEADERS.push(c);
    colIdx[c] = OUT_HEADERS.length - 1;
  }
});

// ---------- 主循环 ----------
const outRows = [OUT_HEADERS];
const diffs = [];
const stats = {
  total: 0,
  filled: 0,         // h1/h2/h3 或 e1/e2 任一被填了的
  empty: 0,
  match: 0,
  discrepant: 0,
  warnings: 0,
};

for (let r = 1; r < rows.length; r++) {
  const row = rows[r];
  if (!row || row.length === 0 || (row.length === 1 && !row[0].trim())) continue;
  stats.total++;

  const get = name => (row[colIdx[name]] || '').trim();
  const id = get('id');
  if (!id) continue;
  const category = get('category');
  const ctx = id;

  // 取要件状态
  const h1 = normStatus(get('h1_行为与性有关'), `${ctx}/h1`);
  const h2 = normStatus(get('h2_违背意愿'),       `${ctx}/h2`);
  const h3 = normStatus(get('h3_职场情境'),       `${ctx}/h3`);
  const e1 = normStatus(get('e1_区别对待'),       `${ctx}/e1`);
  const e2 = normStatus(get('e2_就业环节'),       `${ctx}/e2`);
  // 加重情节
  const ap = normBool(get('agg_肢体接触'), `${ctx}/ap`);
  const aq = normBool(get('agg_职权胁迫'), `${ctx}/aq`);
  const ac = normBool(get('agg_持续重复'), `${ctx}/ac`);
  const am = normBool(get('agg_多人受害'), `${ctx}/am`);
  const aw = normBool(get('agg_书面化'),   `${ctx}/aw`);
  // 严重度
  const ins = normSev(get('discrim_institutional'), `${ctx}/ins`);
  const har = normSev(get('discrim_concrete_harm'), `${ctx}/har`);
  // type
  const typeRaw = get('type');
  const typeArr = typeRaw ? typeRaw.split(/[+,，、]/).map(s => s.trim()).filter(Boolean) : [];
  const currentExpected = get('current_expected_level');

  // 判定该行是否真填过
  const isFilled =
    (h1 !== '不适用' || h2 !== '不适用' || h3 !== '不适用' ||
     e1 !== '不适用' || e2 !== '不适用' ||
     ins !== '不适用' || har !== '不适用' ||
     [ap,aq,ac,am,aw].some(v => v === 'Y'));
  if (isFilled) stats.filled++;
  else stats.empty++;

  // 构造 data 跑 compute_risk_level
  const elements_check = [];
  if (h1 !== '不适用') elements_check.push({ name:'行为与性有关', status: h1 });
  if (h2 !== '不适用') elements_check.push({ name:'违背意愿',     status: h2 });
  if (h3 !== '不适用') elements_check.push({ name:'职场情境',     status: h3 });
  if (e1 !== '不适用') elements_check.push({ name:'区别对待',     status: e1 });
  if (e2 !== '不适用') elements_check.push({ name:'就业环节',     status: e2 });
  const agg_list = [];
  if (ap === 'Y') agg_list.push('肢体接触');
  if (aq === 'Y') agg_list.push('职权胁迫');
  if (ac === 'Y') agg_list.push('持续重复');
  if (am === 'Y') agg_list.push('多人受害');
  if (aw === 'Y') agg_list.push('书面化');

  const data = {
    type: typeArr,
    elements_check,
    aggravating_factors: agg_list,
    discrimination_severity: { institutional: ins, concrete_harm: har }
  };
  const finalLevel = computeRiskLevel(data);
  const match = finalLevel === currentExpected ? '✓' : '✗';
  if (finalLevel === currentExpected) stats.match++;
  else {
    stats.discrepant++;
    diffs.push({
      id, category,
      input: get('input'),
      expected: currentExpected,
      computed: finalLevel,
      h1, h2, h3, ap, aq, ac, am, aw, e1, e2, ins, har,
      typeArr,
      notes_current: get('notes_current'),
      notes_annotator: get('notes_annotator'),
    });
  }

  // 写回新行(保留原行其他字段)
  const newRow = OUT_HEADERS.map((h, i) => {
    if (h === 'final_level') return finalLevel;
    if (h === 'match')       return match;
    return row[i] !== undefined ? row[i] : '';
  });
  outRows.push(newRow);
}

// ---------- 写 CSV ----------
const csvOut = outRows.map(r => r.map(csvEsc).join(',')).join('\r\n');
fs.writeFileSync(opts.output, '﻿' + csvOut, 'utf-8');
console.log('✓ 校验后 CSV 已写入:', opts.output);

// ---------- 写差异报告 ----------
const ORDER = { 高危:3, 中危:2, 低危:1, 无风险:0 };
const summarize = () => {
  // 偏差分布
  const buckets = {};
  diffs.forEach(d => {
    const delta = ORDER[d.computed] - ORDER[d.expected];
    buckets[delta] = (buckets[delta] || 0) + 1;
  });
  return buckets;
};
const buckets = summarize();

let md = '# 标注校验差异报告\n\n';
md += `**生成时间**:${new Date().toISOString().slice(0, 19).replace('T', ' ')}\n`;
md += `**输入文件**:\`${path.basename(opts.input)}\`\n\n`;
md += `## 总体\n\n`;
md += `| 指标 | 数 |\n|---|---|\n`;
md += `| 总用例 | ${stats.total} |\n`;
md += `| 已填(任一要件非"不适用"或加重情节为 Y) | **${stats.filled}** |\n`;
md += `| 空行(全部要件"不适用"且无加重情节) | ${stats.empty} |\n`;
md += `| **标注算出与 current_expected 一致** | **${stats.match}** (${(100*stats.match/stats.total).toFixed(1)}%) |\n`;
md += `| **标注算出与 current_expected 不一致** | **${stats.discrepant}** (${(100*stats.discrepant/stats.total).toFixed(1)}%) |\n\n`;

if (Object.keys(buckets).length > 0) {
  md += `## 偏差分布\n\n`;
  md += `| 偏差 | 含义 | 数量 |\n|---|---|---|\n`;
  const dNames = {
    '-3': '严重(高危→无风险)', '-2': '严重(差 2 级)', '-1': '轻度(差 1 级)',
    '+1': '轻度(差 1 级)', '+2': '严重(差 2 级)', '+3': '严重(无风险→高危)'
  };
  Object.keys(buckets).map(Number).sort((a, b) => a - b).forEach(k => {
    const name = dNames[k > 0 ? '+' + k : String(k)] || `${k} 级`;
    const arrow = k < 0 ? '↓(标注算更低)' : '↑(标注算更高)';
    md += `| ${k > 0 ? '+' : ''}${k} | ${arrow} ${name} | ${buckets[k]} |\n`;
  });
  md += '\n';
}

if (diffs.length > 0) {
  md += `## 差异条目明细\n\n`;
  md += `每行说明 "当前 expected 是 X,但根据要件级标注 + compute_risk_level 应该是 Y"。\n\n`;
  md += `**调整建议:**\n`;
  md += `- 如果标注准确 → 修改 \`test_set.json\` 的 \`expected.risk_level\`(可用 \`--apply-to-test-set\` 自动生成 \`test_set.v_new.json\`)\n`;
  md += `- 如果标注错了 → 改 CSV 里的要件状态\n`;
  md += `- 如果代码规则错了 → 改 \`compute_risk_level\` 的 if/else(同时改前端 \`js/radar.js\` 内的参考说明)\n\n`;
  md += `### 列表\n\n`;
  md += `| id | 分类 | 当前 | 算出 | 偏差 | input 摘要 | 标注摘要 |\n|---|---|---|---|---|---|---|\n`;
  diffs.sort((a, b) => {
    const da = ORDER[a.computed] - ORDER[a.expected];
    const db = ORDER[b.computed] - ORDER[b.expected];
    if (db !== da) return db - da; // 正向偏差优先
    return a.id.localeCompare(b.id);
  }).forEach(d => {
    const delta = ORDER[d.computed] - ORDER[d.expected];
    const summary = [];
    if (d.h1 !== '不适用') summary.push(`h1=${d.h1}`);
    if (d.h2 !== '不适用') summary.push(`h2=${d.h2}`);
    if (d.h3 !== '不适用') summary.push(`h3=${d.h3}`);
    if (d.e1 !== '不适用') summary.push(`e1=${d.e1}`);
    if (d.e2 !== '不适用') summary.push(`e2=${d.e2}`);
    if (d.ins !== '不适用') summary.push(`ins=${d.ins}`);
    if (d.har !== '不适用') summary.push(`har=${d.har}`);
    const aggs = [];
    if (d.ap === 'Y') aggs.push('肢体');
    if (d.aq === 'Y') aggs.push('职权');
    if (d.ac === 'Y') aggs.push('持续');
    if (d.am === 'Y') aggs.push('多人');
    if (d.aw === 'Y') aggs.push('书面');
    if (aggs.length) summary.push(`agg=[${aggs.join(',')}]`);
    md += `| ${d.id} | ${d.category} | ${d.expected} | **${d.computed}** | ${delta > 0 ? '+' : ''}${delta} | ${(d.input || '').slice(0, 35)}... | ${summary.join(' ')} |\n`;
  });
  md += '\n';
}

if (stats.warnings > 0) {
  md += `\n> ⚠️ 校验过程中发生 ${stats.warnings} 个警告(非法取值已用默认值兜底),详情见 console 输出。重跑加 \`--strict\` 可让脚本在遇警告时直接报错退出。\n`;
}

fs.writeFileSync(opts.diff, md, 'utf-8');
console.log('✓ 差异报告已写入:', opts.diff);

// ---------- 终端汇总 ----------
console.log('');
console.log('=== 校验汇总 ===');
console.log(`  总用例:              ${stats.total}`);
console.log(`  已填:                ${stats.filled}`);
console.log(`  空行:                ${stats.empty}`);
console.log(`  与 expected 一致:    ${stats.match} (${(100*stats.match/stats.total).toFixed(1)}%)`);
console.log(`  与 expected 不一致:  ${stats.discrepant} (${(100*stats.discrepant/stats.total).toFixed(1)}%)`);
if (Object.keys(buckets).length > 0) {
  console.log(`  偏差分布:`);
  Object.keys(buckets).map(Number).sort().forEach(k => {
    console.log(`    ${k > 0 ? '+' : ''}${k} 级: ${buckets[k]}`);
  });
}

// ---------- 可选:把 diff 应用到 test_set.json,生成 v_new ----------
if (opts.applyToTest) {
  if (!fs.existsSync(opts.testSet)) {
    console.error(`✖ 找不到测试集: ${opts.testSet}`);
    process.exit(1);
  }
  const ts = JSON.parse(fs.readFileSync(opts.testSet, 'utf-8'));
  const idMap = {};
  diffs.forEach(d => { idMap[d.id] = d.computed; });
  let changed = 0;
  ts.cases.forEach(c => {
    if (idMap[c.id] && c.expected.risk_level !== idMap[c.id]) {
      c.expected._previous_level = c.expected.risk_level;
      c.expected.risk_level = idMap[c.id];
      c.expected._adjusted_at = new Date().toISOString().slice(0, 10);
      c.expected._adjusted_reason = '要件级标注 + compute_risk_level 计算结果';
      changed++;
    }
  });
  ts.version = ts.version + '+annotated';
  ts.annotation_pass = {
    date: new Date().toISOString().slice(0, 10),
    changed_count: changed,
    rule_source: 'eval/validate-annotation.js'
  };

  const outTs = path.join(path.dirname(opts.testSet), 'test_set.v_new.json');
  fs.writeFileSync(outTs, JSON.stringify(ts, null, 2), 'utf-8');
  console.log('');
  console.log(`✓ 已根据差异更新 expected,写入 ${outTs}`);
  console.log(`  改动 ${changed} 条;原文件 ${opts.testSet} 未动`);
  console.log(`  确认无误后,人工 mv test_set.v_new.json test_set.json 即可应用`);
}
