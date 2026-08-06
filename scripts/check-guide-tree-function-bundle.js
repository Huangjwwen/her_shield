const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const bundleRoot = path.join(root, 'cloudfunctions', 'guide-tree', 'guide-tree');
const slugs = [
  'pregnancy-pay-cut',
  'recruit-discrimination',
  'harassment',
  'equal-pay-promotion',
  'leave-benefits'
];

const required = [
  path.join(bundleRoot, 'runtime.js'),
  path.join(bundleRoot, 'config', 'scene-catalog.json'),
  ...slugs.flatMap((slug) => [
    path.join(bundleRoot, 'config', `${slug}.full.json`),
    path.join(bundleRoot, 'config', `${slug}.templates.json`),
    path.join(bundleRoot, 'config', `${slug}.legal-basis.json`),
    path.join(bundleRoot, 'config', `${slug}.terminal-mapping.json`)
  ])
];

const missing = required.filter((file) => !fs.existsSync(file));
if (missing.length) {
  console.error('Guide-tree function bundle is incomplete:');
  missing.forEach((file) => console.error(`- ${path.relative(root, file)}`));
  process.exitCode = 1;
} else {
  console.log('Guide-tree function bundle contains runtime, catalog, and five tree config packages.');
}
