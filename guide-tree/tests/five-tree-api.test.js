const assert = require('assert');
const { main } = require('../../cloudfunctions/guide-tree/index');

function event({ method, path, query, body }) {
  return { httpMethod: method, path, queryStringParameters: query, body: body ? JSON.stringify(body) : undefined };
}

async function run() {
  const treeIds = ['pregnancy_pay_cut', 'recruit_discrimination', 'harassment', 'equal_pay_promotion', 'leave_benefits'];
  const catalogResponse = await main(event({ method: 'GET', path: '/api/guide-tree' }));
  assert.strictEqual(catalogResponse.statusCode, 200);
  const catalog = JSON.parse(catalogResponse.body).catalog;
  assert.deepStrictEqual(catalog.scenes.map((scene) => scene.action.treeId), treeIds);

  for (const treeId of treeIds) {
    const response = await main(event({ method: 'GET', path: '/api/guide-tree', query: { treeId } }));
    assert.strictEqual(response.statusCode, 200);
    const config = JSON.parse(response.body).config;
    assert.strictEqual(config.treeId, treeId);
    assert.ok(config.startNodeId);
    assert.ok(Object.keys(config.nodes).length > 0);
    assert.ok(config.terminalRefs.length > 0);
  }

  console.log('Five-tree API tests passed: catalog and all tree projections.');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
