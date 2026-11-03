// Builds the encrypted, publishable dashboard into site/.
//
//   DASHBOARD_PASSWORD=... node scripts/build.mjs          encrypted build -> site/
//   DASHBOARD_PASSWORD=... node scripts/build.mjs --plain  also writes an UNENCRYPTED
//                                                         preview to private/build/ (git-ignored)
//
// The password is read from the DASHBOARD_PASSWORD environment variable, or from a
// local, git-ignored .env file. It is never written to disk by this script.
//
// Encryption: PBKDF2-HMAC-SHA-256 (random 16-byte salt, 1,000,000 iterations by
// default) derives a 256-bit key; the whole dashboard (HTML, CSS, JS and all
// report data) is encrypted with AES-256-GCM (random 12-byte IV, 128-bit tag).
// Node's built-in WebCrypto is used — the same API the browser uses to decrypt.
import { webcrypto as crypto } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadData, checkData } from './check-data.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rel = (...p) => path.join(root, ...p);
const args = new Set(process.argv.slice(2));

function readEnvFile() {
  const f = rel('.env');
  if (!fs.existsSync(f)) return {};
  const out = {};
  for (const line of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith('#')) out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return out;
}

function fail(msg) { console.error(`\nBuild failed: ${msg}\n`); process.exit(1); }

const env = { ...readEnvFile(), ...process.env };
const password = env.DASHBOARD_PASSWORD;
if (!password) fail('DASHBOARD_PASSWORD is not set. Set it in your shell or in a local .env file (see .env.example).');
if (password.length < 12) fail('DASHBOARD_PASSWORD must be at least 12 characters.');
const ITER = Number(env.PBKDF2_ITERATIONS || 1000000);
if (!Number.isInteger(ITER) || ITER < 600000) fail('PBKDF2_ITERATIONS must be an integer of at least 600000.');

if (!fs.existsSync(rel('private', 'report-data.js'))) fail('private/report-data.js not found. This file holds the report data and is intentionally not in Git — restore it from your secure copy.');

// 1. Data accuracy checks
const data = await loadData();
const results = checkData(data);
const bad = results.filter((r) => !r.ok);
if (bad.length) {
  for (const r of bad) console.error(`FAIL  ${r.name} (got ${r.actual}, expected ${r.expected})`);
  fail(`${bad.length} data check(s) failed. Fix private/report-data.js or update scripts/check-data.mjs if the report changed.`);
}
console.log(`Data checks: ${results.length} passed.`);

// 2. Assemble the plaintext payload (never written to site/)
const css = fs.readFileSync(rel('src', 'app', 'app.css'), 'utf8');
const js = fs.readFileSync(rel('src', 'app', 'app.js'), 'utf8');
const html = fs.readFileSync(rel('src', 'app', 'shell.html'), 'utf8');
const payload = JSON.stringify({ v: 1, builtAt: new Date().toISOString(), css, js, html, data });

// 3. Encrypt
const enc = new TextEncoder();
const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));
const aad = 'kpj-paeds-dashboard:v1';
const baseKey = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' }, baseKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: enc.encode(aad), tagLength: 128 }, key, enc.encode(payload)));
const b64 = (u8) => Buffer.from(u8).toString('base64');
const params = { v: 1, kdf: 'PBKDF2-SHA-256', iter: ITER, cipher: 'AES-256-GCM', aad, salt: b64(salt), iv: b64(iv), ct: b64(ct) };

// 4. Write the published site
const site = rel('site');
fs.rmSync(site, { recursive: true, force: true });
fs.mkdirSync(path.join(site, 'assets'), { recursive: true });
const login = fs.readFileSync(rel('src', 'login', 'login.html'), 'utf8');
if (!login.includes('__ENC_PARAMS__')) fail('Login template is missing the __ENC_PARAMS__ placeholder.');
fs.writeFileSync(path.join(site, 'index.html'), login.replace('__ENC_PARAMS__', JSON.stringify(params)));
fs.copyFileSync(rel('src', 'assets', 'kpj-logo.png'), path.join(site, 'assets', 'kpj-logo.png'));
fs.writeFileSync(path.join(site, '.nojekyll'), '');
fs.writeFileSync(path.join(site, 'robots.txt'), 'User-agent: *\nDisallow: /\n');

// 5. Optional unencrypted local preview (git-ignored folder)
if (args.has('--plain')) {
  const out = rel('private', 'build');
  fs.mkdirSync(path.join(out, 'assets'), { recursive: true });
  fs.copyFileSync(rel('src', 'assets', 'kpj-logo.png'), path.join(out, 'assets', 'kpj-logo.png'));
  const page = `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>KPJ Paediatrics Services Overview (UNENCRYPTED PREVIEW)</title><style>${css}</style></head><body>${html}<script>${js}<\/script><script>KPJDashboard.start(${JSON.stringify(data)}, { onLock: function () { alert('Lock is disabled in the unencrypted preview.'); } });<\/script></body></html>`;
  fs.writeFileSync(path.join(out, 'dashboard-plain.html'), page);
  console.log('Unencrypted preview: private/build/dashboard-plain.html (never publish or commit this file).');
}

const kb = (fs.statSync(path.join(site, 'index.html')).size / 1024).toFixed(0);
console.log(`Encrypted build written to site/ (index.html ${kb} KB; PBKDF2 ${ITER.toLocaleString('en-GB')} iterations; AES-256-GCM).`);
console.log('Next: npm run verify');
