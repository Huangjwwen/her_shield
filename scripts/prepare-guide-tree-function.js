const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sourceRoot = path.join(root, 'guide-tree');
const targetRoot = path.join(root, 'cloudfunctions', 'guide-tree', 'guide-tree');

function copyRecursive(source, target) {
  const stat = fs.statSync(source);
  if (stat.isDirectory()) {
    fs.mkdirSync(target, { recursive: true });
    for (const entry of fs.readdirSync(source)) {
      copyRecursive(path.join(source, entry), path.join(target, entry));
    }
    return;
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

copyRecursive(path.join(sourceRoot, 'runtime.js'), path.join(targetRoot, 'runtime.js'));
copyRecursive(path.join(sourceRoot, 'config'), path.join(targetRoot, 'config'));

console.log(`Prepared guide-tree function bundle at ${path.relative(root, targetRoot)}`);
