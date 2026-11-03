// Reconciles the dashboard data against the totals stated in the report.
// Run on its own (`npm run check`) or automatically by the build.
// Prints no report content beyond the check names and numbers.
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
export const DATA_PATH = path.resolve(here, '..', 'private', 'report-data.js');

export async function loadData() {
  const mod = await import(pathToFileURL(DATA_PATH).href + '?t=' + Date.now());
  return mod.default;
}

const n = (v) => {
  if (v == null) return null;
  const m = String(v).match(/^(\d+)(?:\+(\d+))?/);
  return m ? Number(m[1]) + (m[2] ? Number(m[2]) : 0) : null;
};

export function checkData(D) {
  const results = [];
  const eq = (name, actual, expected) => results.push({ name, ok: actual === expected, actual, expected });
  const H = D.hospitals;
  const col2 = (k) => D.a2Cols.findIndex((c) => c.key === k);
  const col3 = (k) => D.a3Cols.findIndex((c) => c.key === k);
  const inA2 = H.filter((h) => h.a2);
  const countA2 = (k, code) => inA2.filter((h) => h.a2[col2(k)] === code).length;
  const answeredA2 = (k) => inA2.filter((h) => h.a2[col2(k)] !== '-').length;
  const countA3 = (k, code) => inA2.filter((h) => h.a3 && h.a3[col3(k)] === code).length;
  const answeredA3 = (k) => inA2.filter((h) => h.a3 && h.a3[col3(k)] !== '-').length;

  eq('Hospitals', H.length, 29);
  eq('Hospital ids unique', new Set(H.map((h) => h.id)).size, 29);
  for (const r of D.regions) {
    const rh = H.filter((h) => h.region === r.name);
    eq(`${r.name}: hospitals`, rh.length, r.hospitals);
    eq(`${r.name}: resident appts`, rh.reduce((a, h) => a + h.paeds[1], 0), r.r);
    eq(`${r.name}: sessional appts`, rh.reduce((a, h) => a + h.paeds[2], 0), r.s);
    eq(`${r.name}: visiting appts`, rh.reduce((a, h) => a + h.paeds[3], 0), r.v);
    eq(`${r.name}: service returns`, rh.filter((h) => h.ret === 'full').length, r.returns);
  }
  for (const h of H) eq(`${h.short}: R+S+V = total`, h.paeds[1] + h.paeds[2] + h.paeds[3], h.paeds[0]);
  const T = D.regionTotals;
  eq('Region paediatricians sum', D.regions.reduce((a, r) => a + r.paeds, 0), T.paeds);
  eq('Region subspecialists sum', D.regions.reduce((a, r) => a + r.subspecialists, 0), T.subspecialists);
  eq('Region surgeons sum', D.regions.reduce((a, r) => a + r.surgeons, 0), T.surgeons);
  eq('Paediatrician appointments (133)', H.reduce((a, h) => a + h.paeds[0], 0), 133);
  eq('All appointments (150)', H.reduce((a, h) => a + h.paeds[0] + h.surgeons, 0), 150);
  eq('Hospitals with a paediatric surgeon (11)', H.filter((h) => h.surgeons > 0).length, 11);
  eq('Returns: full (26)', H.filter((h) => h.ret === 'full').length, 26);
  eq('Returns: partial (2)', H.filter((h) => h.ret === 'partial').length, 2);
  eq('Returns: none (1)', H.filter((h) => h.ret === 'none').length, 1);

  // Beds (about 660 from 24 hospitals, Rawang excluded)
  const beds = inA2.map((h) => h.a2[col2('beds')]).filter((b) => b !== '-' && !String(b).includes('†'));
  eq('Hospitals giving bed numbers (24)', beds.length, 24);
  eq('Paediatric beds (about 660)', beds.reduce((a, b) => a + n(b), 0), 661);
  eq('Special care cots (about 130)', inA2.reduce((a, h) => a + (n(h.a2[col2('scn')]) || 0), 0), 132);
  eq('NICU cots (29)', inA2.reduce((a, h) => a + (n(h.a2[col2('nicu')]) || 0), 0), 29);
  eq('Paediatric HDU beds (6)', inA2.reduce((a, h) => a + (n(h.a2[col2('hdu')]) || 0), 0), 6);
  eq('Hospitals with HDU beds (3)', inA2.filter((h) => n(h.a2[col2('hdu')]) > 0).length, 3);

  // Neonatal levels
  eq('Level III units (5)', countA2('neoLevel', 'III'), 5);
  eq('Level II units (2)', countA2('neoLevel', 'II'), 2);
  eq('Level I incl. unstated level (18)', countA2('neoLevel', 'I') + countA2('neoLevel', 'Y‡'), 18);
  eq('No neonatal unit (2)', countA2('neoLevel', 'Nil'), 2);

  // Service counts from Tables A.2/A.3 vs report text
  const svc = [
    ['24h emergency assessment', () => countA2('ed24', 'Y'), 24, () => answeredA2('ed24'), 27],
    ['Neonatal ventilation', () => countA2('neoVent', 'Y'), 9, () => answeredA2('neoVent'), 26],
    ['Therapeutic cooling', () => countA2('cool', 'Y'), 5],
    ['PICU on site', () => countA2('picu', 'Y'), 2, () => answeredA2('picu'), 26],
    ['Invasive ventilation', () => countA2('invVent', 'Y'), 7, () => answeredA2('invVent'), 26],
    ['NIV / high-flow', () => countA2('niv', 'Y'), 19, () => answeredA2('niv'), 24],
    ['Anaesthetist with paediatric competence', () => countA2('anaes', 'Y'), 15, () => answeredA2('anaes'), 24],
    ['Elective paediatric surgery', () => countA2('elecSurg', 'Y'), 16, () => answeredA2('elecSurg'), 25],
    ['Cardiology clinic', () => countA3('card', 'Y'), 6, () => answeredA3('card'), 26],
    ['Echocardiography', () => countA3('echo', 'Y'), 12],
    ['Neurology clinic', () => countA3('neuro', 'Y'), 2],
    ['Neurology clinic visiting', () => countA3('neuro', 'V'), 3],
    ['EEG', () => countA3('eeg', 'Y'), 7],
    ['Endocrinology clinic', () => countA3('endo', 'Y'), 3],
    ['Developmental assessment', () => countA3('dev', 'Y'), 19, () => answeredA3('dev'), 26],
    ['Developmental assessment visiting', () => countA3('dev', 'V'), 3],
    ['Autism assessment', () => countA3('asd', 'Y'), 18, () => answeredA3('asd'), 26],
    ['Autism assessment visiting', () => countA3('asd', 'V'), 5],
    ['Physiotherapy', () => countA3('phys', 'Y'), 18, () => answeredA3('phys'), 26],
    ['Speech therapy', () => countA3('slt', 'Y'), 14, () => answeredA3('slt'), 26],
    ['Occupational therapy', () => countA3('ot', 'Y'), 16, () => answeredA3('ot'), 25],
    ['Child psychology', () => countA3('psych', 'Y'), 7, () => answeredA3('psych'), 26],
    ['Child psychology visiting', () => countA3('psych', 'V'), 5],
    ['Written child-protection pathway', () => countA3('safeguard', 'Y'), 4, () => answeredA3('safeguard'), 23],
    ['Child-protection pathway unsure', () => countA3('safeguard', 'U'), 8]
  ];
  for (const [name, f, exp, fa, expA] of svc) {
    eq(`${name}: count`, f(), exp);
    if (fa) eq(`${name}: answered`, fa(), expA);
  }
  // availability list agrees with matrix-derived counts where both exist
  const av = Object.fromEntries(D.services.availability.map((a) => [a.label, a]));
  eq('Availability: invasive ventilation', av['Invasive ventilation for children'].n, countA2('invVent', 'Y'));
  eq('Availability: child-protection pathway', av['Written child-protection pathway'].n, countA3('safeguard', 'Y'));
  const glanceMap = {
    '24-hour paediatrician cover': 'Admit children, paediatrician on site or on call 24 hours',
    'Developmental assessment': 'Developmental assessment',
    'Neonatal ventilation': 'Neonatal ventilation',
    'Invasive ventilation for children': 'Invasive ventilation for children',
    'Child psychology input': 'Child psychology or mental health',
    'Paediatric cardiology clinic': 'Paediatric cardiology clinic',
    'Level III neonatal unit': 'Level III neonatal unit',
    'Written child-protection pathway': 'Written child-protection pathway',
    'PICU on site': 'PICU on site',
    'Paediatric oncology or dialysis': 'Paediatric oncology, chemotherapy or dialysis'
  };
  for (const g of D.overview.glance) {
    const match = av[glanceMap[g.label]];
    eq(`Glance vs availability: ${g.label}`, match ? `${match.n}/${match.of}` : 'missing', `${g.n}/${g.of}`);
  }

  // Subspecialties
  const subs = D.workforce.subspecialties;
  eq('Subspecialists total (38)', subs.reduce((a, s) => a + s.total, 0), 38);
  eq('Subspecialists resident (28)', subs.reduce((a, s) => a + s.r, 0), 28);
  eq('Subspecialists sessional (7)', subs.reduce((a, s) => a + s.s, 0), 7);
  eq('Subspecialists visiting (3)', subs.reduce((a, s) => a + s.v, 0), 3);
  for (const s of subs) eq(`${s.name}: R+S+V = total`, s.r + s.s + s.v, s.total);
  eq('Single-practitioner subspecialties (4)', subs.filter((s) => s.single).length, 4);
  const u = D.workforce.unique;
  eq('Unique paediatricians (127)', u.paeds.r + u.paeds.s + u.paeds.v, 127);
  eq('Unique paediatric surgeons (15)', u.surgeons.r + u.surgeons.s + u.surgeons.v, 15);

  // States
  const st = D.workforce.states.filter((s) => !s.noKpj);
  eq('State specialist totals (146 incl. 4 shared)', st.reduce((a, s) => a + s.total, 0), 146);
  eq('State appointments (150)', st.reduce((a, s) => a + s.appts, 0), 150);
  eq('State hospitals (29)', st.reduce((a, s) => a + s.hosp, 0), 29);
  eq('State subspecialists (38 + 3 shared subspecialists)', st.reduce((a, s) => a + s.sub, 0), 41);
  for (const s of st) {
    eq(`${s.state}: paeds + surgeons = total`, s.paeds + s.surg, s.total);
    eq(`${s.state}: R+S+V = total`, s.r + s.s + s.v, s.total);
    // population is shown rounded to the nearest thousand, so allow a small tolerance
    eq(`${s.state}: per million within ±0.3`, Math.abs((s.total / s.children) * 1000 - s.perMillion) <= 0.3, true);
    const rate = (142 / 9769) * 1000;
    const idx = ((s.total / s.children) * 1000 / rate) * 100;
    eq(`${s.state}: index within ±1`, Math.abs(Math.round(idx) - s.index) <= 1, true);
  }
  const allChildren = D.workforce.states.reduce((a, s) => a + s.children, 0);
  eq('Children 0–18 sum within rounding of 9,769k', Math.abs(allChildren - 9769) <= 2, true);
  const noKpj = D.workforce.states.filter((s) => s.noKpj).reduce((a, s) => a + s.children, 0);
  eq('Children in states without KPJ (about 1.48m)', Math.abs(noKpj - 1480) <= 10, true);
  eq('Share of children without KPJ (15%)', Math.round((noKpj / 9769) * 100), 15);
  const kv = ((59 / (1931 + 483)) * 1000) / ((142 / 9769) * 1000) * 100;
  eq('Klang Valley index (168)', Math.floor(kv), 168);

  // Online cross-check (Table C.2)
  const oc = D.sources.crossCheckTotals;
  eq('Cross-check: appointments (148)', H.reduce((a, h) => a + h.online[0], 0), oc.appointments);
  eq('Cross-check: confirmed (132)', H.reduce((a, h) => a + h.online[1], 0), oc.confirmed);
  eq('Cross-check: not found (16)', H.reduce((a, h) => a + h.online[2], 0), oc.notFound);
  eq('Cross-check: online only (4)', H.reduce((a, h) => a + h.online[3], 0), oc.onlineOnly);
  for (const h of H) eq(`${h.short}: cross-check confirmed + not found = appointments`, h.online[1] + h.online[2], h.online[0]);

  eq('Validation log items (20)', D.sources.validation.length, 20);
  eq('Priorities (8)', D.priorities.items.length, 8);
  eq('Gaps (8)', D.findings.gaps.length, 8);
  return results;
}

// CLI
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const D = await loadData();
  const res = checkData(D);
  const bad = res.filter((r) => !r.ok);
  for (const r of res) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.ok ? '' : `  (got ${r.actual}, expected ${r.expected})`}`);
  console.log(`\n${res.length - bad.length} of ${res.length} checks passed.`);
  process.exit(bad.length ? 1 : 0);
}
