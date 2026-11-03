// Verifies the published site/ folder before it is committed or deployed:
//   1. only the expected files are present;
//   2. the plaintext password does not appear in any form (raw, case-folded,
//      base64, hex, URL-encoded, UTF-16);
//   3. no unencrypted report content appears — every text string from
//      private/report-data.js (when available) plus a fixed list of generic
//      sentinel words is searched for;
//   4. the bundle decrypts with the password and contains the dashboard (when the
//      password is available, e.g. locally or via the GitHub Actions secret);
//   5. if this is a Git repository, private files are not tracked.
//
//   node scripts/verify.mjs          (password from DASHBOARD_PASSWORD or .env)
//   node scripts/verify.mjs --ci     (in CI: password optional, from repository secret)
import { webcrypto as crypto } from 'node:crypto';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const site = path.join(root, 'site');
const ci = process.argv.includes('--ci');
let failures = 0;
const ok = (m) => console.log(`PASS  ${m}`);
const bad = (m) => { failures++; console.error(`FAIL  ${m}`); };
const warn = (m) => console.warn(`WARN  ${m}`);

function readEnvFile() {
  const f = path.join(root, '.env');
  if (!fs.existsSync(f)) return {};
  const out = {};
  for (const line of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith('#')) out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return out;
}
const password = ({ ...readEnvFile(), ...process.env }).DASHBOARD_PASSWORD || '';

// 1. Expected files
if (!fs.existsSync(path.join(site, 'index.html'))) { bad('site/index.html is missing — run npm run build first.'); process.exit(1); }
const files = [];
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); e.isDirectory() ? walk(p) : files.push(p); } })(site);
const relFiles = files.map((f) => path.relative(site, f).split(path.sep).join('/')).sort();
const expected = ['.nojekyll', 'assets/kpj-logo.png', 'index.html', 'robots.txt'];
const extra = relFiles.filter((f) => !expected.includes(f));
extra.length ? bad(`Unexpected files in site/: ${extra.join(', ')}`) : ok(`site/ contains only the expected files (${relFiles.join(', ')})`);

const contents = files.map((f) => ({ f: path.relative(root, f), buf: fs.readFileSync(f) }));
const textOf = (b) => b.toString('latin1');

// 2. Password in any obvious encoding
if (password) {
  const forms = new Set([password, password.toLowerCase(), password.toUpperCase(), Buffer.from(password).toString('base64').replace(/=+$/, ''), Buffer.from(password).toString('hex'), encodeURIComponent(password), JSON.stringify(password).slice(1, -1)]);
  const utf16 = Buffer.from(password, 'utf16le');
  let found = false;
  for (const { f, buf } of contents) {
    const t = textOf(buf);
    const tl = t.toLowerCase();
    for (const form of forms) if (t.includes(form) || tl.includes(form.toLowerCase())) { bad(`Password (or an encoding of it) found in ${f}`); found = true; }
    if (buf.includes(utf16)) { bad(`Password (UTF-16) found in ${f}`); found = true; }
  }
  if (!found) ok('Plaintext password not found in any published file (raw, case-folded, base64, hex, URL-encoded, UTF-16).');
} else {
  (ci ? warn : bad)('DASHBOARD_PASSWORD not available — password scan and decryption test skipped.' + (ci ? ' Add it as a repository secret to enable them.' : ''));
}

// 3. Unencrypted report content
const html = textOf(contents.find((c) => c.f.endsWith('index.html')).buf);
const sentinels = new Set(['Ampang Puteri', 'Damansara', 'Tawakkal', 'Bandar Dato', 'Pasir Gudang', 'Sri Manjung', 'Kuala Selangor', 'Sunway', 'Avisena', 'neonatolog', 'intensivist', 'subspecialt', 'Kuching', 'Level III', 'hub-and-spoke', 'safeguarding', 'Appendix C', 'to validate', 'Mayo Clinic', 'KPJU']);
const dataFile = path.join(root, 'private', 'report-data.js');
let fromData = 0;
if (fs.existsSync(dataFile)) {
  const D = (await import(pathToFileURL(dataFile).href)).default;
  // Strings that legitimately appear on the public sign-in page.
  const allowed = new Set([D.meta.title, 'KPJ Healthcare']);
  (function collect(v) {
    if (typeof v === 'string') { if (v.length >= 10 && /\s/.test(v) && !allowed.has(v)) { sentinels.add(v.slice(0, 60)); fromData++; } }
    else if (Array.isArray(v)) v.forEach(collect);
    else if (v && typeof v === 'object') Object.values(v).forEach(collect);
  })(D);
}
// Scan the page with the base64 ciphertext removed: random base64 can contain short
// letter runs by chance (e.g. "kpju"), which would be false alarms.
const lowerHtml = html.replace(/"ct":"[A-Za-z0-9+/=]+"/, '"ct":""').toLowerCase();
if (lowerHtml.length > 40000) bad(`site/index.html is ${lowerHtml.length} characters without the ciphertext — larger than the sign-in page should be.`);
const leaks = [...sentinels].filter((s) => lowerHtml.includes(s.toLowerCase()));
leaks.length ? bad(`Possible unencrypted report content in site/index.html: ${leaks.slice(0, 5).map((s) => `“${s}”`).join(', ')}${leaks.length > 5 ? ' …' : ''}`)
  : ok(`No unencrypted report content found (${sentinels.size} distinct phrases checked${fromData ? ', including every text string in the report data' : '; report data not present, generic list only'}).`);

// 4. Decryption round trip
const m = html.match(/var P = (\{[^\n]*?\});/);
if (!m) bad('Could not find the encrypted payload in site/index.html.');
else {
  const P = JSON.parse(m[1]);
  P.iter >= 600000 ? ok(`Key derivation: ${P.kdf}, ${P.iter.toLocaleString('en-GB')} iterations; cipher ${P.cipher}.`) : bad(`PBKDF2 iterations too low (${P.iter}).`);
  if (password) {
    try {
      const enc = new TextEncoder();
      const b = (s) => Uint8Array.from(Buffer.from(s, 'base64'));
      const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
      const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b(P.salt), iterations: P.iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
      const pt = JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b(P.iv), additionalData: enc.encode(P.aad) }, key, b(P.ct))));
      pt.data && pt.data.hospitals && pt.data.hospitals.length === 29 && pt.js && pt.css ? ok('Bundle decrypts with the configured password and contains the full dashboard (29 hospitals).') : bad('Bundle decrypted but its contents look incomplete.');
      try {
        const wrong = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b(P.salt), iterations: P.iter, hash: 'SHA-256' }, await crypto.subtle.importKey('raw', enc.encode(password + 'x'), 'PBKDF2', false, ['deriveKey']), { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
        await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b(P.iv), additionalData: enc.encode(P.aad) }, wrong, b(P.ct));
        bad('Bundle decrypted with a WRONG password.');
      } catch { ok('A wrong password is rejected (authentication tag check).'); }
    } catch { bad('Bundle does NOT decrypt with the configured password — rebuild with the right DASHBOARD_PASSWORD.'); }
  }
}

// 5. Git tracking of private material
try {
  const tracked = execSync('git ls-files', { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().split('\n').filter(Boolean);
  const priv = tracked.filter((f) => /^private\//.test(f) || /\.(docx|pdf)$/i.test(f) || /(^|\/)\.env$/.test(f));
  priv.length ? bad(`Private files are tracked by Git: ${priv.join(', ')}`) : ok('No private files (private/, .env, .docx, .pdf) are tracked by Git.');
} catch { /* not a git repository yet */ }

console.log(failures ? `\n${failures} check(s) failed — do not publish.` : '\nAll checks passed — site/ is safe to publish.');
process.exit(failures ? 1 : 0);
