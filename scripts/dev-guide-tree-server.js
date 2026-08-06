const fs = require('fs');
const http = require('http');
const path = require('path');
const { main: guideTree } = require('../cloudfunctions/guide-tree/index');

const root = path.resolve(__dirname, '..');
const port = Number(process.env.PORT || 8082);
const mimeTypes = { '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp' };

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    request.on('error', reject);
  });
}

function send(response, statusCode, headers, body) {
  response.writeHead(statusCode, headers);
  response.end(body);
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);
  if (
    requestUrl.pathname.startsWith('/api/guide-tree') ||
    requestUrl.pathname === '/guide-tree' ||
    requestUrl.pathname === '/guide-tree/resolve' ||
    requestUrl.pathname === '/guide-tree/classify'
  ) {
    const body = await readBody(request);
    const result = await guideTree({
      httpMethod: request.method,
      path: requestUrl.pathname,
      queryStringParameters: Object.fromEntries(requestUrl.searchParams.entries()),
      body
    });
    send(response, result.statusCode, { ...result.headers, 'Access-Control-Allow-Origin': '*' }, result.body);
    return;
  }
  const relativePath = requestUrl.pathname === '/' ? 'features.html' : decodeURIComponent(requestUrl.pathname).replace(/^\/+/, '');
  const filePath = path.resolve(root, relativePath);
  if (!filePath.startsWith(`${root}${path.sep}`)) {
    send(response, 403, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Forbidden');
    return;
  }
  fs.readFile(filePath, (error, content) => {
    if (error) {
      send(response, error.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain; charset=utf-8' }, error.code === 'ENOENT' ? 'Not found' : 'Server error');
      return;
    }
    send(response, 200, { 'Content-Type': mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }, content);
  });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Her Shield guide-tree dev server: http://127.0.0.1:${port}/features.html`);
});
