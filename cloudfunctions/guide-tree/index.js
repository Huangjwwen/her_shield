const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');

const YUANQI_HOST = 'yuanqi.tencent.com';
const YUANQI_PATH = '/openapi/v1/agent/chat/completions';
const GUIDE_ASSISTANT_ID = '2041721348920706112';

function resolveExistingPath(candidates) {
  const existing = candidates.find((candidate) => fs.existsSync(candidate));
  if (!existing) throw new Error(`CONFIG_ERROR: missing guide-tree runtime/config. Tried: ${candidates.join(', ')}`);
  return existing;
}

const runtimePath = resolveExistingPath([
  path.resolve(__dirname, '../../guide-tree/runtime.js'),
  path.resolve(__dirname, 'guide-tree/runtime.js')
]);
const { createProjection, resolvePackage } = require(runtimePath);

const configDir = process.env.GUIDE_TREE_CONFIG_DIR || resolveExistingPath([
  path.resolve(__dirname, '../../guide-tree/config'),
  path.resolve(__dirname, 'guide-tree/config')
]);

function readConfig(fileName) {
  return JSON.parse(fs.readFileSync(path.join(configDir, fileName), 'utf8'));
}

function loadSceneCatalog() {
  return readConfig('scene-catalog.json');
}

const treeFiles = {
  pregnancy_pay_cut: 'pregnancy-pay-cut',
  recruit_discrimination: 'recruit-discrimination',
  harassment: 'harassment',
  equal_pay_promotion: 'equal-pay-promotion',
  leave_benefits: 'leave-benefits'
};

function loadTreeConfig(treeId) {
  const fileSlug = treeFiles[treeId];
  if (!fileSlug) throw new Error('TREE_NOT_FOUND: treeId is not available');
  return {
    tree: readConfig(`${fileSlug}.full.json`),
    templates: readConfig(`${fileSlug}.templates.json`),
    legalBasis: readConfig(`${fileSlug}.legal-basis.json`),
    mapping: readConfig(`${fileSlug}.terminal-mapping.json`)
  };
}

function makeEtag(body) {
  return `"${crypto.createHash('sha1').update(JSON.stringify(body)).digest('hex').slice(0, 16)}"`;
}

function requestHeaders(event) {
  return event.headers || event.Headers || {};
}

function getHeader(event, name) {
  const lowered = name.toLowerCase();
  return Object.entries(requestHeaders(event)).find(([key]) => key.toLowerCase() === lowered)?.[1];
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Max-Age': '86400'
};

function response(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extraHeaders
    },
    body: JSON.stringify(body)
  };
}

function cacheableResponse(event, body) {
  const etag = makeEtag(body);
  if (getHeader(event, 'if-none-match') === etag) {
    return { statusCode: 304, headers: { ...corsHeaders, ETag: etag, 'Cache-Control': 'private, max-age=300' }, body: '' };
  }
  return response(200, body, { ETag: etag, 'Cache-Control': 'private, max-age=300' });
}

function parseBody(event) {
  if (!event.body) return {};
  if (typeof event.body === 'object') return event.body;
  try {
    return JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body);
  } catch (_) {
    throw new Error('INVALID_REQUEST: body must be JSON');
  }
}

function requestData(event) {
  return { ...(event.queryStringParameters || {}), ...parseBody(event) };
}

function extractTextFromYuanqi(data) {
  if (!data) return '';
  if (data.choices && data.choices.length > 0) {
    const message = data.choices[0].message || data.choices[0].delta || {};
    const content = message.content;
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) return content.map((item) => (typeof item === 'string' ? item : item.text || '')).join('');
  }
  return data.content || data.response || data.answer || data.text || '';
}

function parseJsonObject(text) {
  const raw = String(text || '').trim();
  if (!raw) throw new Error('empty model response');
  try {
    return JSON.parse(raw);
  } catch (_) {
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) return JSON.parse(fenced[1]);
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(raw.slice(start, end + 1));
    throw new Error('model response is not JSON');
  }
}

function clampText(value, maxLength) {
  return String(value || '').replace(/\s+\n/g, '\n').trim().slice(0, maxLength);
}

function sanitizeEnhancement(value, result) {
  const readyDocs = new Map(result.documents.filter((document) => document.status === 'ready').map((document) => [document.documentKey, document]));
  const enhanced = {
    caseSummary: clampText(value.case_summary || value.caseSummary, 1200),
    actionPlan: clampText(value.action_plan || value.actionPlan, 1800),
    documentNotes: clampText(value.document_notes || value.documentNotes, 1000),
    documents: []
  };
  const documents = Array.isArray(value.documents) ? value.documents : [];
  documents.forEach((document) => {
    const key = document && document.documentKey;
    if (!readyDocs.has(key)) return;
    const text = clampText(document.text, 8000);
    if (text) enhanced.documents.push({ documentKey: key, text });
  });
  return enhanced.caseSummary || enhanced.actionPlan || enhanced.documentNotes || enhanced.documents.length ? enhanced : null;
}

function postJsonToYuanqi(appkey, body) {
  const payload = JSON.stringify(body);
  const options = {
    hostname: YUANQI_HOST,
    path: YUANQI_PATH,
    method: 'POST',
    headers: {
      Authorization: `Bearer ${appkey}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    },
    timeout: Number(process.env.GUIDE_TREE_AI_TIMEOUT_MS || 25000)
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let data;
        try {
          data = JSON.parse(text);
        } catch (_) {
          reject(new Error(`MODEL_BAD_JSON: ${text.slice(0, 200)}`));
          return;
        }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`MODEL_HTTP_${res.statusCode}: ${text.slice(0, 200)}`));
          return;
        }
        resolve(data);
      });
    });
    req.on('timeout', () => req.destroy(new Error('MODEL_TIMEOUT')));
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function callGuideModel(appkey, body) {
  if (typeof exports._mockPostJsonToYuanqi === 'function') return exports._mockPostJsonToYuanqi(appkey, body);
  return postJsonToYuanqi(appkey, body);
}

function buildEnhancementPrompt(result) {
  const documents = result.documents
    .filter((document) => document.status === 'ready')
    .map((document) => ({ documentKey: document.documentKey, title: document.title, text: document.text }));
  return [
    '你是“她行·维权导航”的后端语言整理模块。你只负责把已经由规则引擎复算的结构化结果整理得更清晰，不得改变法律路径、终点、文书白名单或法律依据。',
    '禁止新增用户未提供的事实，禁止承诺胜诉、禁止断言单位一定违法。缺少事实时使用“待补充/建议核对”。',
    '请仅返回 JSON，不要 Markdown。结构必须为：{"case_summary":"...","action_plan":"...","document_notes":"...","documents":[{"documentKey":"...","text":"..."}]}。',
    'documents 只能改写输入中已有 documentKey 的正文，不得新增文书，不得删除必要事实字段。',
    `规则结果：${JSON.stringify({
      treeId: result.treeId,
      treeVersion: result.treeVersion,
      terminal: result.terminal,
      answers: result.canonicalAnswers,
      flags: result.canonicalFlags,
      legalBasis: result.legalBasis,
      documents
    })}`
  ].join('\n\n');
}

async function enhanceResultWithGuideAgent(result, modelEnabled) {
  const appkey = process.env.KEY_GUIDE;
  const hasReadyDocuments = result.documents.some((document) => document.status === 'ready');
  if (!modelEnabled) return { aiEnhanced: false, aiStatus: 'skipped' };
  if (!appkey) return { aiEnhanced: false, aiStatus: 'missing_key' };
  if (result.terminal.scopeStatus === 'out_of_scope' || !hasReadyDocuments) return { aiEnhanced: false, aiStatus: 'skipped' };
  try {
    const data = await callGuideModel(appkey, {
      assistant_id: GUIDE_ASSISTANT_ID,
      user_id: `guide-tree-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      stream: false,
      messages: [{ role: 'user', content: buildEnhancementPrompt(result) }]
    });
    const enhanced = sanitizeEnhancement(parseJsonObject(extractTextFromYuanqi(data)), result);
    if (!enhanced) return { aiEnhanced: false, aiStatus: 'empty' };
    const enhancedByKey = new Map(enhanced.documents.map((document) => [document.documentKey, document.text]));
    result.documents = result.documents.map((document) => (
      document.status === 'ready' && enhancedByKey.has(document.documentKey)
        ? { ...document, text: enhancedByKey.get(document.documentKey), aiEnhanced: true }
        : document
    ));
    result.caseSummary = enhanced.caseSummary;
    result.actionPlan = enhanced.actionPlan;
    result.documentNotes = enhanced.documentNotes;
    return { aiEnhanced: true, aiStatus: 'enhanced' };
  } catch (error) {
    return { aiEnhanced: false, aiStatus: 'fallback', aiError: error.message };
  }
}

function assertTree(treeId, tree) {
  if (treeId !== tree.treeId) throw new Error('TREE_NOT_FOUND: treeId is not available');
}

function normalizeClassifyText(input) {
  return String(input || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s，。！？、,.!?；;：:（）()【】\[\]“”"']/g, '');
}

function classifyByKeywords(text, catalog) {
  const normalized = normalizeClassifyText(text);
  if (!normalized) throw new Error('INVALID_REQUEST: text is required');
  if (String(text).length > 500) throw new Error('INVALID_REQUEST: text must be 1-500 characters');

  return catalog.scenes
    .map((scene, priority) => {
      const matchedKeywords = [...new Set(
        (scene.classificationKeywords || []).filter((keyword) => normalized.includes(normalizeClassifyText(keyword)))
      )];
      return {
        caseType: scene.caseType,
        treeId: scene.action && scene.action.treeId,
        title: scene.title,
        availability: scene.availability,
        configStatus: scene.configStatus,
        matchedKeywords,
        score: matchedKeywords.length,
        priority
      };
    })
    .filter((item) => item.score >= 1)
    .sort((left, right) => right.score - left.score || left.priority - right.priority)
    .slice(0, 2)
    .map(({ priority, ...item }) => item);
}

function loadTreePackage(treeId) {
  return loadTreeConfig(treeId);
}

async function handle(event) {
  const method = (event.httpMethod || event.method || 'GET').toUpperCase();
  const requestPath = event.path || '';

  if (method === 'OPTIONS') {
    return { statusCode: 204, headers: { ...corsHeaders, 'Cache-Control': 'no-store' }, body: '' };
  }

  const data = requestData(event);

  if (method === 'GET' && !requestPath.endsWith('/resolve') && !data.treeId) {
    const catalog = loadSceneCatalog();
    return cacheableResponse(event, { status: 'ok', catalog });
  }

  if (method === 'POST' && requestPath.endsWith('/classify')) {
    const catalog = loadSceneCatalog();
    const candidates = classifyByKeywords(data.text || data.description, catalog);
    return response(200, {
      status: 'ok',
      source: 'keyword',
      candidates,
      terminalId: candidates.length ? null : 'OOS-unclassified'
    });
  }

  const config = loadTreePackage(data.treeId);
  assertTree(data.treeId, config.tree);

  if (method === 'GET' && !requestPath.endsWith('/resolve')) {
    return cacheableResponse(event, { status: 'ok', config: createProjection(config.tree) });
  }

  if (method === 'POST' && requestPath.endsWith('/resolve')) {
    if (data.treeVersion !== config.tree.treeVersion) throw new Error('TREE_VERSION_EXPIRED: treeVersion is not current');
    if (!data.answers || typeof data.answers !== 'object') throw new Error('INVALID_REQUEST: answers is required');
    const result = resolvePackage({
      ...config,
      answers: data.answers,
      documentFields: data.documentFields || {},
      generatedDate: new Date().toISOString().slice(0, 10)
    });
    if (!Array.isArray(data.path) || data.path.length !== result.canonicalPath.length || data.path.some((nodeId, index) => nodeId !== result.canonicalPath[index])) {
      throw new Error('INVALID_PATH: submitted path does not match the replayed path');
    }
    const decisionId = `dec_${crypto.createHash('sha1').update(`${config.tree.treeId}:${config.tree.treeVersion}:${JSON.stringify(result.canonicalAnswers)}`).digest('hex').slice(0, 16)}`;
    const modelEnabled = data.aiEnhanced !== false && process.env.GUIDE_TREE_AI_ENABLED !== 'false';
    const enhancement = await enhanceResultWithGuideAgent(result, modelEnabled);
    return response(200, { status: 'ok', decisionId, reviewStatus: config.tree.status, ...enhancement, result });
  }

  return response(404, { error: 'TREE_NOT_FOUND', message: 'Unknown guide-tree route' });
}

exports.main = async (event) => {
  try {
    return await handle(event || {});
  } catch (error) {
    const message = error && error.message ? error.message : 'Internal error';
    const code = message.split(':')[0];
    const statusCode = ['INVALID_REQUEST', 'INVALID_PATH', 'INVALID_ANSWER', 'TREE_VERSION_EXPIRED'].includes(code) ? 400 : code === 'TREE_NOT_FOUND' ? 404 : 500;
    return response(statusCode, { error: code, message });
  }
};

exports._internal = { handle, loadTreeConfig, loadSceneCatalog, classifyByKeywords };
