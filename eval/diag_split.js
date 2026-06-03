const fs = require('fs');
const r = JSON.parse(fs.readFileSync('eval/results-v1.4-direct.json', 'utf-8'));

// 注:run.js 只存了 risk_level/type/confidence - 我们没原始 risk_summary/narrative
// 但可以通过 elapsed_ms 推测:
//   - elapsed < 10s: 门控走兜底(短),返回"无风险" = 正常门控判定
//   - elapsed > 25s: 跑过深度链路了,如果还"无风险" = 极可能是工作流解析兜底
const noRisk = r.results.filter(x => !x.error && x.got.risk_level === '无风险');
console.log('=== 所有判 [无风险] 的样本 ===');
console.log('总数:', noRisk.length);
const fast = noRisk.filter(x => x.elapsed_ms < 10000);
const mid = noRisk.filter(x => x.elapsed_ms >= 10000 && x.elapsed_ms < 25000);
const slow = noRisk.filter(x => x.elapsed_ms >= 25000);
console.log('  <10s (可能是门控判不涉及):', fast.length);
console.log('  10-25s (中间态):', mid.length);
console.log('  >=25s (极可能是工作流深度兜底假阳性):', slow.length);

console.log('\n=== >=25s 工作流深度兜底假阳性 按期望等级 ===');
const byCatSlow = {};
slow.forEach(x => { byCatSlow[x.expected.risk_level] = (byCatSlow[x.expected.risk_level] || 0) + 1; });
console.log(JSON.stringify(byCatSlow));

console.log('\n=== <10s 门控判定的样本 按期望等级 ===');
const byCatFast = {};
fast.forEach(x => { byCatFast[x.expected.risk_level] = (byCatFast[x.expected.risk_level] || 0) + 1; });
console.log(JSON.stringify(byCatFast));

console.log('\n=== 修正后估计准确率(扣除工作流兜底假阳性) ===');
const validExceptFallback = r.results.filter(x => !x.error && !(x.got.risk_level === '无风险' && x.elapsed_ms >= 25000));
const correctExceptFallback = validExceptFallback.filter(x => x.correct);
console.log('扣除兜底后有效:', validExceptFallback.length);
console.log('扣除兜底后判对:', correctExceptFallback.length);
console.log('扣除兜底后准确率:', (100 * correctExceptFallback.length / validExceptFallback.length).toFixed(1) + '%');

// 按等级
const levels = ['高危', '中危', '低危', '无风险'];
console.log('\n=== 扣除兜底后各等级召回 ===');
levels.forEach(l => {
  const exp = validExceptFallback.filter(x => x.expected.risk_level === l);
  const ok = exp.filter(x => x.correct);
  if (exp.length > 0) {
    console.log('  ' + l + ': ' + (100 * ok.length / exp.length).toFixed(1) + '% (' + ok.length + '/' + exp.length + ')');
  }
});
