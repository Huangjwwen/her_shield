const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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

function response(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
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
    return { statusCode: 304, headers: { ETag: etag, 'Cache-Control': 'private, max-age=300' }, body: '' };
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
    return response(200, { status: 'ok', decisionId, reviewStatus: config.tree.status, aiEnhanced: false, result });
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
