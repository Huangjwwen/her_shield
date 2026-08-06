const { spawnSync } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const result = spawnSync(process.execPath, [path.join(root, 'guide-tree', 'scripts', 'validate-all.js')], {
  cwd: root,
  stdio: 'inherit'
});

process.exitCode = result.status || 0;
