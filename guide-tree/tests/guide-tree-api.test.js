const assert = require('assert');
const guideTreeModule = require('../../cloudfunctions/guide-tree/index');
const { main } = guideTreeModule;

function event({ method, path, query, body }) {
  return { httpMethod: method, path, queryStringParameters: query, body: body ? JSON.stringify(body) : undefined };
}

async function run() {
  const preflightResponse = await main({
    httpMethod: 'OPTIONS',
    path: '/api/guide-tree/resolve',
    headers: {
      Origin: 'https://huangjwwen.github.io',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type'
    }
  });
  assert.strictEqual(preflightResponse.statusCode, 204);
  assert.strictEqual(preflightResponse.headers['Access-Control-Allow-Origin'], '*');
  assert.ok(preflightResponse.headers['Access-Control-Allow-Methods'].includes('POST'));

  for (const treeId of ['recruit_discrimination', 'harassment', 'equal_pay_promotion', 'leave_benefits']) {
    const response = await main(event({ method: 'GET', path: '/api/guide-tree', query: { treeId } }));
    assert.strictEqual(response.statusCode, 200);
    assert.strictEqual(JSON.parse(response.body).config.treeId, treeId);
  }
  const projectionResponse = await main(event({ method: 'GET', path: '/api/guide-tree', query: { treeId: 'pregnancy_pay_cut' } }));
  assert.strictEqual(projectionResponse.statusCode, 200);
  const projection = JSON.parse(projectionResponse.body).config;
  assert.strictEqual(projection.treeId, 'pregnancy_pay_cut');
  assert.ok(projection.nodes.P1);
  assert.ok(!Object.hasOwn(projection, 'terminals'));
  assert.ok(!Object.hasOwn(projection, 'documentTemplates'));
  assert.ok(!Object.hasOwn(projection, 'legalBasis'));

  const answers = {
    P1: 'pregnancy_pay_cut', P2: 'employed', P3: 'written', P4: 'within_one_year', P5: 'pregnancy',
    P6: 'salary_reduced', P7: 'salary_benefit_reduced', P8: 'unsigned', P9: ['payroll'], P10: 'none'
  };
  const resolveResponse = await main(event({
    method: 'POST',
    path: '/api/guide-tree/resolve',
    body: {
      treeId: 'pregnancy_pay_cut', treeVersion: '1.3.0-draft', path: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10'], answers,
      documentFields: { userName: '测试用户', companyName: '测试公司', eventDate: '2026-08-01', currentRole: '测试岗位', caseTitle: '孕期降薪', effectiveDate: '2026-08-01' },
      flags: [{ node: 'P8', flag: 'signed_under_pressure' }],
      aiEnhanced: false
    }
  }));
  assert.strictEqual(resolveResponse.statusCode, 200);
  assert.strictEqual(JSON.parse(resolveResponse.body).aiStatus, 'skipped');
  const resolved = JSON.parse(resolveResponse.body).result;
  assert.strictEqual(resolved.terminal.id, 'PA');
  assert.deepStrictEqual(resolved.canonicalFlags, []);
  assert.deepStrictEqual(resolved.legalBasis.map((item) => item.legalBasisKey).sort(), ['female_worker_protection_5', 'women_rights_48', 'women_rights_72']);
  assert.ok(resolved.documents.every((document) => document.status === 'ready'));
  assert.ok(resolved.documents.every((document) => !Object.hasOwn(document, 'fullText')));

  const oldKey = process.env.KEY_GUIDE;
  process.env.KEY_GUIDE = 'test-key';
  guideTreeModule._mockPostJsonToYuanqi = async () => ({
    choices: [{
      message: {
        content: JSON.stringify({
          case_summary: '用户处于孕期降薪路径，已补充必要字段。',
          action_plan: '先固定通知和工资变化，再书面提出异议。',
          document_notes: '以下文书基于当前路径生成，提交前请核对事实。',
          documents: [{ documentKey: 'salary_objection', text: 'AI 增强后的调岗降薪异议函正文' }]
        })
      }
    }]
  });
  const enhancedResponse = await main(event({
    method: 'POST',
    path: '/api/guide-tree/resolve',
    body: {
      treeId: 'pregnancy_pay_cut', treeVersion: '1.3.0-draft', path: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10'], answers,
      documentFields: { userName: '测试用户', companyName: '测试公司', eventDate: '2026-08-01', currentRole: '测试岗位', caseTitle: '孕期降薪', effectiveDate: '2026-08-01' }
    }
  }));
  delete guideTreeModule._mockPostJsonToYuanqi;
  if (oldKey === undefined) delete process.env.KEY_GUIDE; else process.env.KEY_GUIDE = oldKey;
  const enhancedPayload = JSON.parse(enhancedResponse.body);
  assert.strictEqual(enhancedResponse.statusCode, 200);
  assert.strictEqual(enhancedPayload.aiEnhanced, true);
  assert.strictEqual(enhancedPayload.result.caseSummary, '用户处于孕期降薪路径，已补充必要字段。');
  assert.ok(enhancedPayload.result.actionPlan.includes('书面提出异议'));
  assert.strictEqual(enhancedPayload.result.documents.find((document) => document.documentKey === 'salary_objection').text, 'AI 增强后的调岗降薪异议函正文');

  const invalidPathResponse = await main(event({ method: 'POST', path: '/api/guide-tree/resolve', body: { treeId: 'pregnancy_pay_cut', treeVersion: '1.3.0-draft', path: ['P1'], answers } }));
  assert.strictEqual(invalidPathResponse.statusCode, 400);
  assert.strictEqual(JSON.parse(invalidPathResponse.body).error, 'INVALID_PATH');

  const oosResponse = await main(event({ method: 'POST', path: '/api/guide-tree/resolve', body: { treeId: 'pregnancy_pay_cut', treeVersion: '1.3.0-draft', path: ['P1', 'P2'], answers: { P1: 'pregnancy_pay_cut', P2: 'confirmed_unrelated' } } }));
  assert.strictEqual(oosResponse.statusCode, 200);
  const oos = JSON.parse(oosResponse.body).result;
  assert.strictEqual(oos.terminal.id, 'OOS');
  assert.deepStrictEqual(oos.documents, []);
  assert.deepStrictEqual(oos.legalBasis, []);

  console.log('Guide-tree API tests passed: projection boundary, authoritative replay, path rejection, OOS boundary.');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
