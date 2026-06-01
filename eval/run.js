#!/usr/bin/env node
/**
 * 言行雷达判定准确率评测脚本
 *
 * 用法:
 *   node eval/run.js                                 # 默认调线上代理
 *   node eval/run.js --direct --key <KEY_RADAR>      # 直连元器 API（代理挂了时用）
 *   node eval/run.js --limit 5                       # 只跑前 5 条做快测
 *   node eval/run.js --concurrency 5                 # 并发 5
 *   node eval/run.js --output eval/results-v2.json   # 自定义结果文件
 *
 * 依赖：Node.js 18+（内置 fetch）
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_PROXY = 'https://her-shield-d7gyrtfxm65f3e782-1410225134.ap-shanghai.app.tcloudbase.com/proxy';
const YUANQI_DIRECT = 'https://yuanqi.tencent.com/openapi/v1/agent/chat/completions';
const RADAR_APPID = '2037893130997763264';

// ---------- CLI 解析 ----------
function parseArgs(argv) {
    const out = {
        endpoint: null, direct: false, key: process.env.KEY_RADAR || null,
        concurrency: 3, limit: 0, output: 'eval/results.json',
        delay: 0, retry: 0
    };
    for (let i = 2; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--direct') out.direct = true;
        else if (a === '--endpoint') out.endpoint = argv[++i];
        else if (a === '--key') out.key = argv[++i];
        else if (a === '--concurrency') out.concurrency = parseInt(argv[++i], 10);
        else if (a === '--limit') out.limit = parseInt(argv[++i], 10);
        else if (a === '--output') out.output = argv[++i];
        else if (a === '--delay') out.delay = parseInt(argv[++i], 10);    // 每条请求前等待 ms，缓解元器限流
        else if (a === '--retry') out.retry = parseInt(argv[++i], 10);    // 失败重试次数，指数退避
        else if (a === '--help' || a === '-h') {
            console.log(fs.readFileSync(__filename, 'utf-8').split('*/')[0]);
            process.exit(0);
        }
    }
    // 直连元器默认开启节流(避免被限流)：1.5 秒间隔 + 2 次重试
    if (out.direct) {
        if (out.delay === 0) out.delay = 1500;
        if (out.retry === 0) out.retry = 2;
    }
    return out;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ---------- JSON 解析(与前端 radar.js 同款，去 ZWSP/BOM/围栏) ----------
function tryParseRadar(str) {
    if (str == null) return null;
    let s = String(str);
    s = s.replace(/^[﻿​-‍⁠ \s]+/, '')
         .replace(/[﻿​-‍⁠ \s]+$/, '');
    const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) {
        s = fence[1]
            .replace(/^[﻿​-‍⁠ \s]+/, '')
            .replace(/[﻿​-‍⁠ \s]+$/, '');
    }
    const start = s.search(/[{[]/);
    const end = Math.max(s.lastIndexOf('}'), s.lastIndexOf(']'));
    if (start !== -1 && end > start) s = s.slice(start, end + 1);
    try { return JSON.parse(s); } catch (e) { return null; }
}

// ---------- 单次调用 ----------
async function callOne(input, opts) {
    const messages = [{ role: 'user', content: [{ type: 'text', text: input }] }];
    let resp;
    try {
        if (opts.direct) {
            if (!opts.key) return { error: '--direct 模式需要 --key 或环境变量 KEY_RADAR' };
            resp = await fetch(YUANQI_DIRECT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${opts.key}` },
                body: JSON.stringify({
                    assistant_id: RADAR_APPID,
                    user_id: 'eval-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
                    stream: false, messages
                })
            });
        } else {
            resp = await fetch(opts.endpoint || DEFAULT_PROXY, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ agentType: 'radar', messages })
            });
        }
    } catch (e) {
        return { error: 'fetch 失败: ' + String(e) };
    }
    const txt = await resp.text();
    if (!resp.ok) return { error: `HTTP ${resp.status}`, raw: txt.slice(0, 200) };

    let data;
    try { data = JSON.parse(txt); } catch (e) { return { error: 'response 非 JSON', raw: txt.slice(0, 200) }; }
    if (data && data.success === false) return { error: '代理返回失败: ' + (data.error || 'unknown') };
    if (data && data.success === true && data.data) data = data.data;
    if (data && data.error) {
        const err = data.error;
        return { error: err.message || err.code || 'Yuanqi workflow failed', raw: txt.slice(0, 200) };
    }

    // 取 choices[0].message.content
    let content = null;
    if (data.choices && data.choices[0]) {
        const msg = data.choices[0].message || data.choices[0].delta;
        if (msg) {
            content = typeof msg.content === 'string'
                ? msg.content
                : (Array.isArray(msg.content) ? msg.content.map(c => c.text || '').join('') : null);
        }
    }
    if (!content) return { error: '响应无 content', raw: txt.slice(0, 200) };

    const parsed = tryParseRadar(content);
    if (!parsed) return { error: 'JSON 解析失败', raw: content.slice(0, 200) };

    // ★ 工作流代码节点解析失败兜底:risk_level===null 或带 parse_error,
    //   不算入"有效样本"分母,标为可重试的工作流异常
    if (parsed.risk_level === null || parsed.risk_level === '解析失败' || parsed.parse_error) {
        return {
            error: '工作流解析兜底: ' + (parsed.parse_error || parsed.risk_summary || 'risk_level=null'),
            raw: content.slice(0, 200)
        };
    }

    return { parsed };
}

// ---------- 汇总 ----------
function summarize(results) {
    const total = results.length;
    const errors = results.filter(r => r.error);
    const valid = results.filter(r => !r.error);
    const correct = valid.filter(r => r.correct);

    const levels = ['高危', '中危', '低危', '无风险'];
    const matrix = {};
    levels.forEach(e => { matrix[e] = {}; levels.forEach(g => matrix[e][g] = 0); });
    let unparseable = 0;
    valid.forEach(r => {
        const exp = r.expected.risk_level, got = r.got.risk_level;
        if (matrix[exp] && matrix[exp][got] !== undefined) matrix[exp][got]++;
        else if (matrix[exp]) unparseable++;
    });

    const recall = {};
    levels.forEach(l => {
        const expCount = valid.filter(r => r.expected.risk_level === l).length;
        const ok = valid.filter(r => r.expected.risk_level === l && r.correct).length;
        recall[l] = expCount > 0 ? (ok / expCount) : null;
        recall[l + '_n'] = expCount;
    });

    const byCategory = {};
    valid.forEach(r => {
        if (!byCategory[r.category]) byCategory[r.category] = { total: 0, correct: 0 };
        byCategory[r.category].total++;
        if (r.correct) byCategory[r.category].correct++;
    });

    let s = '\n=== 评测汇总 ===\n';
    s += `总用例: ${total} | 有效响应: ${valid.length} | 失败: ${errors.length}\n`;
    s += `整体准确率: ${valid.length > 0 ? (100 * correct.length / valid.length).toFixed(1) : '—'}% (${correct.length}/${valid.length})\n\n`;

    s += `--- 各等级召回率 (该等级期望样本里判对的比例) ---\n`;
    levels.forEach(l => {
        const r = recall[l], n = recall[l + '_n'];
        s += `  ${l.padEnd(4)}  ${r == null ? '—  ' : (100 * r).toFixed(1).padStart(5) + '%'}  (n=${n})\n`;
    });

    s += `\n--- 各分类准确率 ---\n`;
    Object.keys(byCategory).sort().forEach(k => {
        const c = byCategory[k];
        s += `  ${k.padEnd(14)}  ${(100 * c.correct / c.total).toFixed(1).padStart(5)}%  (${c.correct}/${c.total})\n`;
    });

    s += `\n--- 混淆矩阵 (行=期望, 列=实际) ---\n`;
    s += '          ' + levels.map(l => l.padStart(6)).join(' ') + '\n';
    levels.forEach(e => {
        s += `${e.padEnd(8)}` + levels.map(g => String(matrix[e][g]).padStart(6)).join(' ') + '\n';
    });

    if (errors.length > 0) {
        s += `\n--- 调用失败样本 (${errors.length}) ---\n`;
        errors.slice(0, 10).forEach(r => {
            s += `  ${r.id} ${r.category}: ${r.error}\n`;
        });
    }

    return {
        formatted: s,
        data: {
            total, valid_count: valid.length, error_count: errors.length,
            overall_accuracy: valid.length > 0 ? (correct.length / valid.length) : null,
            correct_count: correct.length,
            recall_per_level: recall,
            by_category: byCategory,
            confusion_matrix: matrix
        }
    };
}

// ---------- 主流程 ----------
async function runEval(opts) {
    const testSetPath = path.join(__dirname, 'test_set.json');
    const testSet = JSON.parse(fs.readFileSync(testSetPath, 'utf-8'));
    let cases = testSet.cases;
    if (opts.limit > 0) cases = cases.slice(0, opts.limit);

    const modeStr = opts.direct
        ? '直连元器(KEY_RADAR=' + (opts.key ? '****' + opts.key.slice(-4) : '未设置') + ')'
        : '代理 ' + (opts.endpoint || DEFAULT_PROXY);
    console.log(`\n=== 评测开始: ${cases.length} 条用例 ===`);
    console.log(`模式: ${modeStr}`);
    console.log(`并发: ${opts.concurrency}\n`);

    const queue = cases.map((c, i) => ({ ...c, _idx: i }));
    const results = new Array(cases.length);
    let processed = 0;

    async function callWithRetry(input) {
        // 含节流与重试(指数退避):前面 delay → 调用 → 失败则按 1x/2x/4x delay 重试 retry 次
        let attempt = 0;
        let lastResult;
        while (attempt <= opts.retry) {
            if (opts.delay > 0 && attempt > 0) {
                await sleep(opts.delay * Math.pow(2, attempt - 1));
            } else if (opts.delay > 0) {
                await sleep(opts.delay);
            }
            lastResult = await callOne(input, opts).catch(e => ({ error: 'fetch 失败: ' + String(e) }));
            if (!lastResult.error) return lastResult;
            // 不重试的:其他 4xx(400/403/404)、配置错误、解析失败
            // 重试的:401(IP级临时封禁)、429(显式限流)、5xx(元器侧服务问题)、fetch 失败
            const errMsg = lastResult.error;
            const isRetriable = /HTTP 401|HTTP 429|HTTP 5\d\d|fetch 失败|配额|工作流运行异常|runtime_error|10003|Yuanqi workflow failed|工作流解析兜底/.test(errMsg);
            if (!isRetriable && /--direct 模式|JSON 解析|响应无 content|HTTP 4\d\d/.test(errMsg)) return lastResult;
            attempt++;
        }
        return lastResult;
    }

    async function worker() {
        while (queue.length > 0) {
            const c = queue.shift();
            const t0 = Date.now();
            const r = await callWithRetry(c.input);
            const elapsed = Date.now() - t0;
            const got = r.parsed || {};
            const gotLevel = got.risk_level || null;
            const correct = gotLevel === c.expected.risk_level;

            results[c._idx] = {
                id: c.id, category: c.category, input: c.input,
                expected: c.expected,
                got: { risk_level: gotLevel, type: got.type, confidence: got.confidence },
                correct, error: r.error || null, elapsed_ms: elapsed
            };

            processed++;
            const mark = r.error ? '⨯' : (correct ? '✓' : '✗');
            const expS = c.expected.risk_level.padEnd(3);
            const gotS = r.error ? `(${r.error.slice(0, 30)})` : (gotLevel || '?').padEnd(3);
            console.log(`[${String(processed).padStart(2)}/${cases.length}] ${mark} ${c.id.padEnd(10)} ${c.category.padEnd(14)} 期望=${expS} 实际=${gotS} (${elapsed}ms)`);
        }
    }

    const workers = Array.from({ length: Math.max(1, opts.concurrency) }, () => worker());
    await Promise.all(workers);

    const summary = summarize(results);
    console.log(summary.formatted);

    const outFile = path.isAbsolute(opts.output) ? opts.output : path.join(process.cwd(), opts.output);
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, JSON.stringify({
        timestamp: new Date().toISOString(),
        mode: opts.direct ? 'direct' : 'proxy',
        test_set_version: testSet.version,
        total: results.length,
        ...summary.data,
        results
    }, null, 2));
    console.log(`\n结果已写入: ${outFile}`);
}

runEval(parseArgs(process.argv)).catch(e => {
    console.error('FAIL:', e);
    process.exit(1);
});
