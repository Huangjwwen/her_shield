#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const YUANQI_DIRECT = 'https://yuanqi.tencent.com/openapi/v1/agent/chat/completions';
const RADAR_APPID = '2037893130997763264';

function argValue(name, fallback) {
    const i = process.argv.indexOf(name);
    return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const key = argValue('--key', process.env.KEY_RADAR || '');
const inputFile = argValue('--input', path.join('eval', 'results-v1.3-final.json'));
const outputFile = argValue('--output', path.join('eval', 'results-v1.3-final-retry.json'));
const maxAttempts = Number(argValue('--attempts', '3'));
const delayMs = Number(argValue('--delay', '3000'));
const batchSize = Number(argValue('--batch-size', '5'));
const skipRetried = process.argv.includes('--skip-retried');

if (!key) {
    console.error('Missing --key or KEY_RADAR');
    process.exit(1);
}

const testSet = JSON.parse(fs.readFileSync(path.join('eval', 'test_set.json'), 'utf8'));
const prior = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
const caseById = new Map(testSet.cases.map(c => [c.id, c]));
const results = prior.results.map(r => ({ ...r }));

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function tryParseRadar(str) {
    if (str == null) return null;
    let s = String(str)
        .replace(/^[\uFEFF\u200B\u200C\u200D\u00A0\s]+/, '')
        .replace(/[\uFEFF\u200B\u200C\u200D\u00A0\s]+$/, '');
    const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) {
        s = fence[1]
            .replace(/^[\uFEFF\u200B\u200C\u200D\u00A0\s]+/, '')
            .replace(/[\uFEFF\u200B\u200C\u200D\u00A0\s]+$/, '');
    }
    const start = s.search(/[{[]/);
    const end = Math.max(s.lastIndexOf('}'), s.lastIndexOf(']'));
    if (start !== -1 && end > start) s = s.slice(start, end + 1);
    try { return JSON.parse(s); } catch { return null; }
}

function summarize(rows) {
    const valid = rows.filter(r => !r.error);
    const correct = valid.filter(r => r.correct);
    return {
        total: rows.length,
        valid_count: valid.length,
        error_count: rows.length - valid.length,
        overall_accuracy: valid.length ? correct.length / valid.length : null,
        correct_count: correct.length
    };
}

function save() {
    const summary = summarize(results);
    fs.writeFileSync(outputFile, JSON.stringify({
        ...prior,
        timestamp: new Date().toISOString(),
        mode: 'direct-retry-failed',
        retry_source: inputFile,
        retry_attempts: maxAttempts,
        retry_delay_ms: delayMs,
        ...summary,
        results
    }, null, 2));
}

async function callOne(c) {
    const messages = [{ role: 'user', content: [{ type: 'text', text: c.input }] }];
    const started = Date.now();
    const resp = await fetch(YUANQI_DIRECT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({
            assistant_id: RADAR_APPID,
            user_id: 'eval-retry-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
            stream: false,
            messages
        })
    });
    const txt = await resp.text();
    if (!resp.ok) return { error: `HTTP ${resp.status}`, raw: txt.slice(0, 200), elapsed_ms: Date.now() - started };
    let data;
    try { data = JSON.parse(txt); } catch { return { error: 'response non-json', raw: txt.slice(0, 200), elapsed_ms: Date.now() - started }; }
    if (data.error) {
        const err = data.error;
        return { error: err.message || err.code || 'Yuanqi workflow failed', raw: txt.slice(0, 200), elapsed_ms: Date.now() - started };
    }
    const choice = data.choices && data.choices[0];
    const msg = choice && (choice.message || choice.delta);
    const content = msg && msg.content;
    const text = typeof content === 'string'
        ? content
        : (Array.isArray(content) ? content.map(c => c.text || '').join('') : '');
    if (!text) return { error: 'missing content', raw: txt.slice(0, 200), elapsed_ms: Date.now() - started };
    const parsed = tryParseRadar(text);
    if (!parsed) return { error: 'radar json parse failed', raw: text.slice(0, 200), elapsed_ms: Date.now() - started };
    return { parsed, elapsed_ms: Date.now() - started };
}

async function retryCase(index) {
    const old = results[index];
    const c = caseById.get(old.id);
    let last = { error: old.error || 'unknown' };
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        if (attempt > 1 || delayMs > 0) await sleep(delayMs * attempt);
        last = await callOne(c).catch(e => ({ error: 'fetch failed: ' + String(e) }));
        if (!last.error) {
            const gotLevel = last.parsed.risk_level || null;
            results[index] = {
                ...old,
                got: { risk_level: gotLevel, type: last.parsed.type, confidence: last.parsed.confidence },
                correct: gotLevel === old.expected.risk_level,
                error: null,
                elapsed_ms: last.elapsed_ms,
                retry_attempts: attempt
            };
            save();
            return results[index];
        }
        console.log(`  attempt ${attempt}/${maxAttempts} ${old.id}: ${last.error}`);
    }
    results[index] = {
        ...old,
        error: last.error,
        retry_attempts: maxAttempts,
        retry_raw: last.raw || old.raw || null
    };
    save();
    return results[index];
}

(async () => {
    const failed = results
        .map((r, index) => ({ r, index }))
        .filter(x => x.r.error && !(skipRetried && x.r.retry_attempts));
    console.log(`retrying ${failed.length} failed cases from ${inputFile}`);

    for (let start = 0; start < failed.length; start += batchSize) {
        const batch = failed.slice(start, start + batchSize);
        console.log(`\n=== retry batch ${Math.floor(start / batchSize) + 1}/${Math.ceil(failed.length / batchSize)} (${start + 1}-${start + batch.length}) ===`);
        for (const item of batch) {
            const r = await retryCase(item.index);
            const mark = r.error ? 'ERR' : (r.correct ? 'OK ' : 'BAD');
            const got = r.error ? '(' + r.error + ')' : r.got.risk_level;
            console.log(`${mark} ${r.id.padEnd(10)} expected=${r.expected.risk_level} got=${got} attempts=${r.retry_attempts || 0}`);
        }
    }

    save();
    console.log('\nsummary:', summarize(results));
    console.log('written:', path.resolve(outputFile));
})();
