// Minimal local web server for previewing the built site.
//   node scripts/preview.mjs            serves site/ (encrypted build) on http://localhost:8080
//   node scripts/preview.mjs --plain    serves private/build/ (unencrypted preview) on http://localhost:8081
// Binds to 127.0.0.1 only, so it is not reachable from other machines.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const plain = process.argv.includes('--plain');
const dir = plain ? path.join(root, 'private', 'build') : path.join(root, 'site');
const port = Number(process.env.PORT || (plain ? 8081 : 8080));
const index = plain ? 'dashboard-plain.html' : 'index.html';
const types = { '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.txt': 'text/plain; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript' };

if (!fs.existsSync(path.join(dir, index))) {
  console.error(`Nothing to serve: ${path.relative(root, path.join(dir, index))} not found. Run ${plain ? 'npm run build:plain' : 'npm run build'} first.`);
  process.exit(1);
}

http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/') p = '/' + index;
  const file = path.join(dir, path.normalize(p).replace(/^([/\\])+/, ''));
  if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('Not found'); return; }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
  fs.createReadStream(file).pipe(res);
}).listen(port, '127.0.0.1', () => console.log(`Serving ${path.relative(root, dir)}/ at http://localhost:${port}  (Ctrl+C to stop)`));
