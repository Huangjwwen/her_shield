const fs = require('fs');
const path = require('path');
const { createProjection, resolvePackage } = require('../../guide-tree/runtime');

const configDir = process.env.GUIDE_TREE_CONFIG_DIR || path.resolve(__dirname, '../../guide-tree/config');

function readConfig(fileName) {
  return JSON.parse(fs.readFileSync(path.join(configDir, fileName), 'utf8'));
}

const TREE_FILES = {
  pregnancy_pay_cut: 'pregnancy-pay-cut',
  recruit_discrimination: 'recruit-discrimination',
  harassment: 'harassment',
  equal_pay_promotion: 'equal-pay-promotion',
  leave_benefits: 'leave-benefits'
};

function loadTree(treeId) {
  const slug = TREE_FILES[treeId];
  if (!slug) throw new Error('NOT_FOUND: treeId is not available');
  return {
    tree: readConfig(`${slug}.full.json`),
    templates: readConfig(`${slug}.templates.json`),
    legalBasis: readConfig(`${slug}.legal-basis.json`),
    mapping: readConfig(`${slug}.terminal-mapping.json`)
  };
}

function loadPregnancyPayCut() {
  return loadTree('pregnancy_pay_cut');
}

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    },
    body: JSON.stringify(body)
  };
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
  if (treeId !== tree.treeId) throw new Error('NOT_FOUND: treeId is not available');
}

async function handle(event) {
  const method = (event.httpMethod || event.method || 'GET').toUpperCase();
  const requestPath = event.path || '';
  const data = requestData(event);
  const config = loadTree(data.treeId);
  assertTree(data.treeId, config.tree);

  if (method === 'GET' && !requestPath.endsWith('/resolve')) {
    return response(200, { status: 'ok', config: createProjection(config.tree) });
  }

  if (method === 'POST' && requestPath.endsWith('/resolve')) {
    if (data.treeVersion !== config.tree.treeVersion) throw new Error('VERSION_MISMATCH: treeVersion is not current');
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
    return response(200, { status: 'ok', reviewStatus: config.tree.status, aiEnhanced: false, result });
  }

  return response(404, { error: 'NOT_FOUND', message: 'Unknown guide-tree route' });
}

exports.main = async (event) => {
  try {
    return await handle(event || {});
  } catch (error) {
    const message = error && error.message ? error.message : 'Internal error';
    const code = message.split(':')[0];
    const statusCode = ['INVALID_REQUEST', 'INVALID_PATH', 'INVALID_ANSWER', 'VERSION_MISMATCH'].includes(code) ? 400 : code === 'NOT_FOUND' ? 404 : 500;
    return response(statusCode, { error: code, message });
  }
};

exports._internal = { handle, loadPregnancyPayCut, loadTree, TREE_FILES };
