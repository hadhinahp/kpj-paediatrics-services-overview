/* KPJ Paediatrics Services Overview — application code.
   This file contains no report content: every figure and finding comes from the
   encrypted data payload passed to KPJDashboard.start(). */
(function () {
  'use strict';

  var D = null;            // report data (decrypted at runtime)
  var OPTS = {};
  var REGIONS = ['Northern', 'Central', 'Southern', 'East Coast', 'East Malaysia'];
  var S = { regions: [], q: '', level: 'all', ret: 'all', domain: 'All', matrixTab: 'a2', tileMetric: 'total', sorts: {} };
  var TABLES = {};
  var currentView = null;
  var idleTimer = null;
  var IDLE_MS = 30 * 60 * 1000;

  var VIEWS = [
    { id: 'overview', label: 'Executive overview', icon: 'grid' },
    { id: 'hospitals', label: 'Hospital comparison', icon: 'building' },
    { id: 'workforce', label: 'Workforce and capabilities', icon: 'people' },
    { id: 'services', label: 'Services and coverage', icon: 'pulse' },
    { id: 'findings', label: 'Strengths and gaps', icon: 'flag' },
    { id: 'planning', label: 'Network planning', icon: 'network' },
    { id: 'priorities', label: 'Priorities and actions', icon: 'check' },
    { id: 'sources', label: 'Sources and limitations', icon: 'book' }
  ];

  // ------------------------------------------------------------------ icons
  var IC = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    building: '<path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/><path d="M16 9h2a2 2 0 0 1 2 2v10"/><path d="M3 21h18"/><path d="M9 7v4M7 9h4"/><path d="M8 15h1M11 15h1M8 18h1M11 18h1"/>',
    people: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 14.2c3 .2 5.5 2.6 5.5 5.8"/>',
    pulse: '<path d="M3 12h4l2-5 4 10 2-5h6"/>',
    flag: '<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>',
    network: '<circle cx="12" cy="5" r="2.5"/><circle cx="5" cy="18" r="2.5"/><circle cx="19" cy="18" r="2.5"/><path d="M12 7.5v4M12 11.5l-5.2 4.6M12 11.5l5.2 4.6"/>',
    check: '<path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/>',
    book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5z"/><path d="M4 19a2 2 0 0 1 2-2h13"/><path d="M8 7h7M8 10h5"/>',
    lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
    reset: '<path d="M4 12a8 8 0 1 0 2.3-5.6"/><path d="M4 4v4.5h4.5"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    alert: '<path d="M12 3l9.5 17H2.5L12 3z"/><path d="M12 10v4M12 17h.01"/>',
    bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8"/>',
    arrow: '<path d="M4 12h15"/><path d="M14 6l6 6-6 6"/>',
    map: '<path d="M9 4L3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5L9 4z"/><path d="M9 4v13.5M15 6.5V20"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/><path d="M8 12h2l1-2 2 4 1-2h2"/>',
    layers: '<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/>',
    gap: '<circle cx="12" cy="12" r="9"/><path d="M8 12h8"/>',
    star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9L12 3.5z"/>',
    baby: '<circle cx="12" cy="8" r="4"/><path d="M5 21c.8-3.8 3.6-6 7-6s6.2 2.2 7 6"/><path d="M10.5 8h.01M13.5 8h.01"/>',
    bed: '<path d="M3 18V7"/><path d="M3 14h18v4"/><path d="M21 14v-2a3 3 0 0 0-3-3h-7v5"/><circle cx="7" cy="11" r="1.8"/>',
    scalpel: '<path d="M4 20l9-9"/><path d="M13 11l6-6c1 2 .5 4.5-1.5 6.5L13 11z"/>',
    route: '<circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5"/>',
    family: '<circle cx="8" cy="6.5" r="2.5"/><circle cx="16" cy="6.5" r="2.5"/><circle cx="12" cy="13" r="2"/><path d="M4 20v-4.5A3.5 3.5 0 0 1 7.5 12H9M20 20v-4.5a3.5 3.5 0 0 0-3.5-3.5H15M9.5 20v-1.5a2.5 2.5 0 0 1 5 0V20"/>',
    school: '<path d="M2 9l10-5 10 5-10 5L2 9z"/><path d="M6 11v5c2 1.5 4 2 6 2s4-.5 6-2v-5"/>',
    nurse: '<path d="M6 8V5l6-2 6 2v3"/><path d="M10 5.5h4M12 4v3"/><circle cx="12" cy="12" r="3.5"/><path d="M5 21c.8-3.4 3.6-5.5 7-5.5s6.2 2.1 7 5.5"/>',
    chart: '<path d="M4 20V4"/><path d="M4 20h16"/><rect x="7" y="11" width="3" height="6"/><rect x="12" y="7" width="3" height="10"/><rect x="17" y="13" width="3" height="4"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/>'
  };
  function icon(name, cls) {
    return '<svg class="' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (IC[name] || '') + '</svg>';
  }

  // ------------------------------------------------------------------ helpers
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function fmt(n) { return (n == null || isNaN(n)) ? '' : Number(n).toLocaleString('en-GB'); }
  function pct(n, d) { return d ? Math.round((n / d) * 100) : 0; }
  function num(v) {
    if (v == null) return null;
    var s = String(v);
    if (s === '-' || s === '') return null;
    var m = s.match(/^(\d+)(?:\+(\d+))?/);
    if (!m) return null;
    return Number(m[1]) + (m[2] ? Number(m[2]) : 0);
  }
  function hospByShort(short) { return D.hospitals.filter(function (h) { return h.short === short; })[0]; }
  function regionOf(short) { var h = hospByShort(short); return h ? h.region : null; }

  var TAGS = {
    finding: ['tag-finding', 'Finding', 'info'],
    interp: ['tag-interp', 'Interpretation', 'bulb'],
    rec: ['tag-rec', 'Recommendation (report)', 'target'],
    validate: ['tag-validate', 'To validate', 'alert'],
    note: ['tag-note', 'Dashboard note — not in the report', 'info']
  };
  function tag(kind, text) {
    var t = TAGS[kind] || ['tag-plain', kind, null];
    return '<span class="tag ' + t[0] + '">' + (t[2] ? icon(t[2]) : '') + esc(text || t[1]) + '</span>';
  }
  function labelled(kind, inner) { return '<div class="labelled">' + tag(kind) + '<div>' + inner + '</div></div>'; }
  function p(text) { return '<p>' + esc(text) + '</p>'; }
  function ul(items) { return '<ul class="bullets">' + items.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul>'; }
  function callout(kind, title, bodyHtml) {
    var ic = { validate: 'alert', rec: 'target', interp: 'bulb', info: 'info', note: 'info' }[kind] || 'info';
    return '<div class="callout ' + kind + '">' + icon(ic) + '<div>' + (title ? '<div class="callout-title">' + esc(title) + '</div>' : '') + bodyHtml + '</div></div>';
  }
  function details(summary, bodyHtml, open) {
    return '<details class="more"' + (open ? ' open' : '') + '><summary>' + esc(summary) + '</summary><div class="more-body">' + bodyHtml + '</div></details>';
  }
  function source(text) { return '<div class="source"><strong>Source:</strong> ' + esc(text) + '</div>'; }
  function section(id, title, ic, inner) {
    return '<section class="section" id="' + id + '" aria-labelledby="' + id + '-h"><h2 id="' + id + '-h">' + (ic ? '<span class="h-icon">' + icon(ic) + '</span>' : '') + esc(title) + '</h2>' + inner + '</section>';
  }
  function card(title, sub, inner, cls) {
    return '<div class="card ' + (cls || '') + '">' + (title ? '<div class="card-head"><div><h3 class="card-title">' + esc(title) + '</h3>' + (sub ? '<div class="card-sub">' + esc(sub) + '</div>' : '') + '</div></div>' : '') + inner + '</div>';
  }
  function pageHead(eyebrow, title, lede) {
    return '<header class="page-head"><div><div class="eyebrow">' + esc(eyebrow) + '</div><h1 class="page-title" id="page-title" tabindex="-1">' + esc(title) + '</h1>' + (lede ? '<p class="page-lede">' + esc(lede) + '</p>' : '') + '</div></header>';
  }
  function jump(view, links) {
    return '<nav class="jump" aria-label="On this page">' + links.map(function (l) { return '<a href="#/' + view + '/' + l[0] + '">' + esc(l[1]) + '</a>'; }).join('') + '</nav>';
  }
  function emptyState(msg) {
    return '<div class="empty" role="status">' + icon('search') + '<div class="empty-title">No hospitals match these filters</div><div>' + esc(msg || 'Try removing a filter, or reset all filters.') + '</div><div style="margin-top:12px"><button type="button" class="btn btn-sm" data-act="reset">' + icon('reset') + 'Reset filters</button></div></div>';
  }

  // code chips (Y/V/P/N/U/–)
  var CODE_LABEL = {};
  function codeChip(v) {
    if (v == null) return '<span class="code code-na" data-tip="Not in the service tables">n/a</span>';
    var s = String(v);
    if (s === '-') return '<span class="code code-blank" data-tip="Not provided — question left blank (not the same as No)">–</span>';
    var cls = { Y: 'code-Y', V: 'code-V', P: 'code-P', N: 'code-N', U: 'code-U' }[s] || 'code-N';
    return '<span class="code ' + cls + '" data-tip="' + esc(CODE_LABEL[s] || s) + '">' + esc(s) + '</span>';
  }
  function levelChip(v) {
    if (v == null) return '<span class="code code-na" data-tip="Not in the service tables">n/a</span>';
    if (v === '-') return codeChip('-');
    if (v === 'Nil') return '<span class="code code-N" data-tip="No neonatal unit">Nil</span>';
    if (v === 'Y‡') return '<span class="code code-U" data-tip="Neonatal unit reported without stating its level">Unstated</span>';
    var cls = v === 'III' ? 'code-Y' : v === 'II' ? 'code-V' : 'code-N';
    return '<span class="code ' + cls + '" data-tip="Neonatal unit Level ' + esc(v) + ' (as claimed in the return)">' + esc(v) + '</span>';
  }
  function numCell(v, tipExtra) {
    if (v == null) return '<span class="code code-na" data-tip="Not in the service tables">n/a</span>';
    if (v === '-' || /^[YVPNU]$/.test(String(v))) return codeChip(v);
    var t = '';
    if (String(v).indexOf('†') > -1) t = 'Shared with adult medical and surgical patients';
    if (String(v).indexOf('+') > -1) t = 'Includes one isolation cot';
    return '<span class="tnum"' + (t ? ' data-tip="' + esc(t) + '"' : '') + '>' + esc(v) + '</span>';
  }
  function retChip(h) {
    if (h.ret === 'full') return '<span class="ret ret-full">Returned · ' + h.qs + '/74</span>';
    if (h.ret === 'partial') return '<span class="ret ret-partial">' + icon('alert') + 'Partial · ' + h.qs + '/74</span>';
    return '<span class="ret ret-none">Not returned</span>';
  }

  // hospital derived fields
  function a2(h, key) { if (!h.a2) return null; var i = D.a2Cols.map(function (c) { return c.key; }).indexOf(key); return h.a2[i]; }
  function a3(h, key) { if (!h.a3) return null; var i = D.a3Cols.map(function (c) { return c.key; }).indexOf(key); return h.a3[i]; }
  function levelOf(h) {
    if (!h.a2) return 'none';
    var v = h.a2[2];
    if (v === 'Y‡') return 'unstated';
    return v; // III, II, I, Nil
  }

  // ------------------------------------------------------------------ filters
  function filtersActive() { return S.regions.length > 0 || S.q.trim() !== '' || S.level !== 'all' || S.ret !== 'all'; }
  function hospMatch(h, o) {
    o = o || { regions: true, search: true, level: true, ret: true };
    if (o.regions && S.regions.length && S.regions.indexOf(h.region) === -1) return false;
    if (o.search && S.q.trim()) {
      var q = S.q.trim().toLowerCase();
      var hay = (h.name + ' ' + h.short + ' ' + h.region + ' ' + h.subspecialties).toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    if (o.level && S.level !== 'all' && levelOf(h) !== S.level) return false;
    if (o.ret && S.ret !== 'all' && h.ret !== S.ret) return false;
    return true;
  }
  function regionMatch(r) { return !S.regions.length || S.regions.indexOf(r) > -1; }

  var LEVEL_OPTS = [['all', 'All levels'], ['III', 'Level III'], ['II', 'Level II'], ['I', 'Level I'], ['unstated', 'Level not stated'], ['Nil', 'No neonatal unit'], ['none', 'Not in service tables']];
  var RET_OPTS = [['all', 'All return statuses'], ['full', 'Returned'], ['partial', 'Partial return'], ['none', 'Not returned']];

  function filterBar(o) {
    var html = '<div class="filters' + (o.sticky ? ' sticky' : '') + '" role="region" aria-label="Filters">';
    html += '<div class="filters-row">';
    if (o.regions) {
      html += '<div class="f-group" role="group" aria-labelledby="f-reg-l"><span class="f-label" id="f-reg-l">Region</span><div class="chips">' +
        REGIONS.map(function (r) { return '<button type="button" class="chip" data-f="region" data-v="' + esc(r) + '" aria-pressed="' + (S.regions.indexOf(r) > -1) + '">' + esc(r) + '</button>'; }).join('') + '</div></div>';
    }
    if (o.search) {
      html += '<div class="f-group"><label class="f-label" for="f-q">Hospital or subspecialty</label><div class="search-wrap">' + icon('search') +
        '<input id="f-q" class="input" type="search" data-f="q" placeholder="e.g. Puteri, cardiology" value="' + esc(S.q) + '" autocomplete="off"></div></div>';
    }
    if (o.level) {
      html += '<div class="f-group"><label class="f-label" for="f-level">Neonatal level</label><select id="f-level" class="select" data-f="level">' +
        LEVEL_OPTS.map(function (x) { return '<option value="' + x[0] + '"' + (S.level === x[0] ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select></div>';
    }
    if (o.ret) {
      html += '<div class="f-group"><label class="f-label" for="f-ret">Service return</label><select id="f-ret" class="select" data-f="ret">' +
        RET_OPTS.map(function (x) { return '<option value="' + x[0] + '"' + (S.ret === x[0] ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select></div>';
    }
    html += '<div class="f-actions"><button type="button" class="btn btn-sm" data-act="reset" id="btn-reset">' + icon('reset') + 'Reset filters</button></div>';
    html += '</div>';
    html += '<div class="active-filters" id="active-filters" aria-live="polite"></div>';
    if (o.note) html += '<div class="scope-note">' + esc(o.note) + '</div>';
    html += '</div>';
    return html;
  }
  function updateActiveFilters() {
    var box = $('#active-filters');
    if (!box) return;
    var v = VIEW_MAP[currentView];
    var o = (v && v.filters) || {};
    var chips = [];
    if (o.regions) S.regions.forEach(function (r) { chips.push(['region', r, 'Region: ' + r]); });
    if (o.search && S.q.trim()) chips.push(['q', '', 'Search: “' + S.q.trim() + '”']);
    if (o.level && S.level !== 'all') chips.push(['level', '', 'Neonatal: ' + LEVEL_OPTS.filter(function (x) { return x[0] === S.level; })[0][1]]);
    if (o.ret && S.ret !== 'all') chips.push(['ret', '', 'Return: ' + RET_OPTS.filter(function (x) { return x[0] === S.ret; })[0][1]]);
    var count = v && v.count ? v.count() : '';
    if (!chips.length) {
      box.innerHTML = '<span class="muted">No filters applied' + (count ? ' — ' : '') + '</span>' + (count ? '<span class="result-count">' + esc(count) + '</span>' : '');
    } else {
      box.innerHTML = '<span class="result-count">' + esc(count) + '</span><span class="muted">Active filters:</span>' + chips.map(function (c) {
        return '<span class="af-chip">' + esc(c[2]) + '<button type="button" data-act="clear" data-k="' + c[0] + '" data-v="' + esc(c[1]) + '" aria-label="Remove filter ' + esc(c[2]) + '">' + icon('x') + '</button></span>';
      }).join('');
    }
    var rb = $('#btn-reset');
    if (rb) { rb.disabled = !chips.length; rb.setAttribute('aria-disabled', String(!chips.length)); rb.style.opacity = chips.length ? '1' : '.55'; }
    $$('[data-f="region"]').forEach(function (b) { b.setAttribute('aria-pressed', String(S.regions.indexOf(b.getAttribute('data-v')) > -1)); });
    var qi = $('#f-q'); if (qi && qi.value !== S.q) qi.value = S.q;
    var ls = $('#f-level'); if (ls) ls.value = S.level;
    var rs = $('#f-ret'); if (rs) rs.value = S.ret;
  }
  function resetFilters() { S.regions = []; S.q = ''; S.level = 'all'; S.ret = 'all'; refresh(); }

  // ------------------------------------------------------------------ charts
  function legend(items) {
    return '<div class="chart-legend" role="list">' + items.map(function (i) { return '<span class="legend-item" role="listitem"><span class="swatch" style="background:' + i[1] + '"></span>' + esc(i[0]) + '</span>'; }).join('') + '</div>';
  }
  // Share of hospitals that answered (n of N); denominator may be missing.
  function shareChart(items, ariaLabel) {
    var rows = items.map(function (it) {
      var label = '<div class="bar-label">' + esc(it.label) + (it.sub ? '<span class="sub">' + esc(it.sub) + '</span>' : '') + '</div>';
      if (it.of == null) {
        var nbTip = it.tip || (it.label + ': ' + it.n + ' hospitals. ' + (it.note ? it.note + '. ' : '') + 'The report does not state how many answered.');
        return '<div class="bar-row" role="listitem">' + label + '<div class="bar-nobar" data-tip="' + esc(nbTip) + '">' + esc(it.nobar || 'Denominator not stated') + '</div><div class="bar-value">' + (it.valueHtml || (it.n + ' <span class="muted">hospitals</span>')) + '</div></div>';
      }
      var w = it.of ? (it.n / it.of) * 100 : 0;
      var tip = it.label + ': ' + it.n + ' of ' + it.of + ' hospitals that answered (' + pct(it.n, it.of) + '%).' + (it.note ? ' ' + it.note + '.' : '');
      return '<div class="bar-row" role="listitem">' + label + '<div class="bar-track" data-tip="' + esc(tip) + '" aria-hidden="true"><div class="bar-fill" style="width:' + w.toFixed(2) + '%;' + (it.color ? 'background:' + it.color : '') + '"></div></div><div class="bar-value">' + it.n + ' <span class="muted">of ' + it.of + '</span></div></div>';
    }).join('');
    var axis = '<div class="axis" aria-hidden="true"><span class="axis-label"></span><div class="axis-scale"><span style="left:0;transform:none">0%</span><span style="left:50%">50%</span><span style="left:100%;transform:translateX(-100%)">100%</span></div><span class="axis-spacer"></span></div>';
    return '<div class="chart" role="list" aria-label="' + esc(ariaLabel || 'Bar chart') + '">' + rows + '</div>' + axis;
  }
  // Simple magnitude bars
  function barChart(items, opts) {
    opts = opts || {};
    var max = opts.max || Math.max.apply(null, items.map(function (i) { return i.value; }).concat([1]));
    var rows = items.map(function (it) {
      var w = Math.max(0, (it.value / max) * 100);
      return '<div class="bar-row" role="listitem"><div class="bar-label">' + esc(it.label) + (it.sub ? '<span class="sub">' + esc(it.sub) + '</span>' : '') + '</div>' +
        '<div class="bar-track' + (opts.bare ? ' bare' : '') + '" data-tip="' + esc(it.tip || (it.label + ': ' + (it.display || it.value))) + '" aria-hidden="true">' +
        (opts.ref != null ? '<span class="ref-line" style="left:' + (opts.ref / max * 100) + '%"></span>' : '') +
        '<div class="bar-fill" style="width:' + w.toFixed(2) + '%;background:' + (it.color || opts.color || 'var(--teal-600)') + '"></div></div>' +
        '<div class="bar-value">' + esc(it.display != null ? it.display : fmt(it.value)) + (it.unit ? ' <span class="muted">' + esc(it.unit) + '</span>' : '') + '</div></div>';
    }).join('');
    var axis = '';
    if (opts.ticks) {
      axis = '<div class="axis" aria-hidden="true"><span class="axis-label"></span><div class="axis-scale">' + opts.ticks.map(function (t) {
        var l = t / max * 100; var tr = l === 0 ? 'transform:none' : (l >= 100 ? 'transform:translateX(-100%)' : '');
        return '<span style="left:' + l + '%;' + tr + '">' + esc(t) + (opts.ref === t ? ' (avg)' : '') + '</span>';
      }).join('') + '</div><span class="axis-spacer"></span></div>';
    }
    return '<div class="chart" role="list" aria-label="' + esc(opts.aria || 'Bar chart') + '">' + rows + '</div>' + axis;
  }
  // Stacked resident / sessional / visiting
  var RSV = [['Resident', 'var(--c-res)'], ['Sessional', 'var(--c-ses)'], ['Visiting', 'var(--c-vis)']];
  function rsvChart(items, opts) {
    opts = opts || {};
    var max = opts.max || Math.max.apply(null, items.map(function (i) { return i.r + i.s + i.v; }).concat([1]));
    var rows = items.map(function (it) {
      var t = it.r + it.s + it.v;
      var tip = it.label + ': ' + t + ' ' + (opts.unit || '') + ' — resident ' + it.r + ', sessional ' + it.s + ', visiting ' + it.v + (it.extra ? '. ' + it.extra : '');
      var segs = [[it.r, RSV[0][1]], [it.s, RSV[1][1]], [it.v, RSV[2][1]]].filter(function (x) { return x[0] > 0; }).map(function (x) {
        return '<div class="bar-seg" style="width:calc(' + (x[0] / max * 100).toFixed(3) + '% - 1px);background:' + x[1] + '"></div>';
      }).join('');
      return '<div class="bar-row" role="listitem"><div class="bar-label">' + (it.labelHtml || esc(it.label)) + (it.sub ? '<span class="sub">' + esc(it.sub) + '</span>' : '') + '</div>' +
        '<div class="bar-track bare" data-tip="' + esc(tip) + '" aria-hidden="true">' + segs + '</div>' +
        '<div class="bar-value">' + t + ' <span class="muted small">' + it.r + '/' + it.s + '/' + it.v + '</span></div></div>';
    }).join('');
    return legend(RSV) + '<div class="chart" role="list" aria-label="' + esc(opts.aria || 'Stacked bar chart') + '">' + rows + '</div>' +
      '<div class="chart-note">Values show total, then resident / sessional / visiting.</div>';
  }
  function gantt(items, aria) {
    var months = 24;
    var rows = items.map(function (it) {
      var bars = (it.bars || []).map(function (b) {
        var l = (b[0] - 1) / months * 100, w = (b[1] - b[0] + 1) / months * 100;
        return '<div class="g-bar ' + (it.teal ? 'teal' : '') + '" style="left:' + l + '%;width:' + w + '%" data-tip="' + esc(it.tip || (it.label + ': ' + it.timing)) + '">' + esc(it.barLabel || it.timing) + '</div>';
      }).join('');
      var early = it.early ? '<div class="g-early" data-tip="Interim cover early (no month given in the report)"></div>' : '';
      return '<div class="g-row" role="listitem"><div class="g-label">' + esc(it.label) + (it.sub ? '<span class="sub">' + esc(it.sub) + '</span>' : '') + '</div><div class="g-track">' + early + bars + '</div></div>';
    }).join('');
    var ticks = [1, 6, 12, 18, 24].map(function (m) { return '<span style="left:' + ((m - 0.5) / months * 100) + '%">M' + m + '</span>'; }).join('');
    return '<div class="gantt" role="list" aria-label="' + esc(aria) + '">' + rows + '</div><div class="g-axis" aria-hidden="true"><span></span><div class="g-axis-scale">' + ticks + '</div></div>';
  }

  // ------------------------------------------------------------------ tables
  function sortVal(v) {
    if (v == null) return -Infinity;
    if (typeof v === 'number') return v;
    return String(v).toLowerCase();
  }
  // cols: [{key,label,cls,render(row),sort(row),thTip}] ; rows ; opts {id, caption, foot, rowKey}
  function table(id, cols, rowsFn, opts) {
    opts = opts || {};
    TABLES[id] = function () {
      var rows = rowsFn().slice();
      var st = S.sorts[id];
      if (st) {
        var c = cols.filter(function (x) { return x.key === st.key; })[0];
        if (c) {
          rows.sort(function (a, b) {
            var av = sortVal(c.sort ? c.sort(a) : a[c.key]), bv = sortVal(c.sort ? c.sort(b) : b[c.key]);
            if (av < bv) return st.dir === 'asc' ? -1 : 1;
            if (av > bv) return st.dir === 'asc' ? 1 : -1;
            return 0;
          });
        }
      }
      if (!rows.length && opts.empty) return '<div id="tw-' + id + '">' + opts.empty + '</div>';
      var head = '<tr>' + cols.map(function (c) {
        var sortable = c.sortable !== false;
        var aria = sortable ? ' aria-sort="' + (st && st.key === c.key ? (st.dir === 'asc' ? 'ascending' : 'descending') : 'none') + '"' : '';
        var inner = sortable ? '<button type="button" class="sort-btn" data-sort="' + id + '" data-key="' + c.key + '"' + (c.thTip ? ' data-tip="' + esc(c.thTip) + '"' : '') + '>' + esc(c.label) + '<span class="sort-ind" aria-hidden="true"></span></button>' : esc(c.label);
        return '<th scope="col" class="' + (c.cls || '') + '"' + aria + '>' + inner + '</th>';
      }).join('') + '</tr>';
      var body = rows.map(function (r) {
        return '<tr>' + cols.map(function (c, i) {
          var val = c.render ? c.render(r) : esc(r[c.key]);
          return i === 0 && c.rowHead !== false ? '<th scope="row" class="row-head ' + (c.cls || '') + '">' + val + '</th>' : '<td class="' + (c.cls || '') + '">' + val + '</td>';
        }).join('') + '</tr>';
      }).join('');
      var foot = opts.foot ? '<tfoot>' + opts.foot(rows) + '</tfoot>' : '';
      return '<div id="tw-' + id + '"><div class="table-wrap" tabindex="0" role="region" aria-label="' + esc(opts.caption || 'Table') + ' (scrollable)"><table class="data ' + (opts.cls || '') + '">' + (opts.caption ? '<caption>' + esc(opts.caption) + (cols.some(function (c) { return c.sortable !== false; }) ? ' — select a column heading to sort.' : '') + '</caption>' : '') + '<thead>' + head + '</thead><tbody>' + body + '</tbody>' + foot + '</table></div></div>';
    };
    return TABLES[id]();
  }
  function staticTable(head, rows, opts) {
    opts = opts || {};
    return '<div class="table-wrap" tabindex="0" role="region" aria-label="' + esc(opts.caption || 'Table') + ' (scrollable)"><table class="data">' + (opts.caption ? '<caption>' + esc(opts.caption) + '</caption>' : '') +
      '<thead><tr>' + head.map(function (h) { return '<th scope="col">' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(function (r) { return '<tr>' + r.map(function (c, i) { return i === 0 ? '<th scope="row" class="row-head">' + esc(c) + '</th>' : '<td' + (opts.wrap ? ' class="wrap-text"' : '') + '>' + esc(c) + '</td>'; }).join('') + '</tr>'; }).join('') +
      '</tbody></table></div>';
  }
  function rerenderTable(id) {
    var el = document.getElementById('tw-' + id);
    if (el && TABLES[id]) {
      var tmp = document.createElement('div');
      tmp.innerHTML = TABLES[id]();
      el.parentNode.replaceChild(tmp.firstChild, el);
    }
  }

  // ------------------------------------------------------------------ views
  var VIEW_MAP = {};

  // ===== Executive overview
  VIEW_MAP.overview = {
    render: function () {
      var o = D.overview, m = D.meta;
      var ret = o.kpis.filter(function (k) { return k.id === 'returns'; })[0];
      var kpis = '<div class="kpis">' + o.kpis.filter(function (k) { return k.id !== 'returns'; }).map(function (k) {
        return '<div class="kpi ' + k.tone + '"><div class="kpi-value tnum">' + esc(k.value) + '</div><div class="kpi-label">' + esc(k.label) + '</div><div class="kpi-detail">' + esc(k.detail) + '</div><div class="kpi-ref">Report ' + esc(k.ref) + '</div></div>';
      }).join('') + '</div>';
      var status = callout('validate', 'Draft for validation', '<p>' + esc(m.status) + '. ' + esc(m.reportingPosition) + '.' + (ret ? ' <strong>' + esc(ret.label) + ': ' + esc(ret.value) + '</strong> — ' + esc(ret.detail) + '.' : '') + '</p>');
      var findings = '<div class="f-cards">' + o.keyFindings.map(function (f) {
        return '<article class="f-card"><div class="f-card-head"><span class="f-icon">' + icon(f.icon) + '</span><h3>' + esc(f.title) + '</h3></div><p>' + esc(f.text) + '</p><div class="f-foot">' + tag('finding') + '<a class="small" href="#/' + f.link + '">Explore ' + icon('arrow', 'inline-ic').replace('<svg', '<svg style="width:14px;height:14px;vertical-align:-2px"') + '</a></div></article>';
      }).join('') + '</div>';
      var glance = card('Services at a glance', 'Hospitals providing each service, out of those that answered the question', shareChart(o.glance.map(function (g) { return { label: g.label, n: g.n, of: g.of }; }), 'Services at a glance') + source('Report “At a glance: services, facilities and equipment”; §4. Denominators differ because not every hospital answered every question.'));
      var means = card('What this means', null, labelled('interp', ul(o.whatThisMeans)));
      var messages = card('Key messages', null, ul(o.keyMessages));
      var prio = card('Proposed priorities and indicative timing', 'Report Table 1.1 — months counted from programme approval',
        gantt(D.priorities.items.map(function (i) { return { label: i.n + '. ' + i.title, bars: i.bars, timing: i.timing, early: i.early, barLabel: i.timing.replace('Interim cover early; full plan ', '') }; }), 'Priority timeline') +
        '<div style="margin-top:14px">' + tag('rec') + ' <span class="small muted">' + esc(o.decisionsSummary) + '</span></div><p style="margin-top:12px"><a href="#/priorities">See priorities, decisions and next steps →</a></p>');
      var bg = o.background;
      var background = details('Background, purpose and clinical leadership', p(bg.text) +
        '<h4 style="margin:10px 0 6px">Board mandates for the paediatric discipline</h4>' + ul(bg.mandates) +
        p(bg.programme) + '<p><strong>Vision.</strong> ' + esc(bg.vision) + '</p><p><strong>Mission.</strong> ' + esc(bg.mission) + '</p>' +
        '<h4 style="margin:10px 0 6px">Strategic objectives</h4>' + ul(bg.objectives) +
        '<h4 style="margin:14px 0 6px">Paediatric AHS Subcommittee (Table 2.2)</h4>' + staticTable(['Role', 'Member'], bg.leadership, { caption: 'Paediatric clinical leadership' }));
      return pageHead('Executive overview', m.title, m.reportTitle + ' — ' + m.reportSubtitle + '. ' + m.audience + ', prepared ' + m.preparationDate + '.') +
        status + '<div style="height:18px"></div>' + kpis +
        section('ov-position', 'Overall position', 'target', card(null, null, labelled('finding', p(o.overallPosition)) + '<p class="small muted" style="margin:0">' + esc(o.intro) + '</p>')) +
        section('ov-findings', 'Key findings', 'info', findings) +
        section('ov-glance', 'Services and implications', 'chart', '<div class="grid g-2">' + glance + '<div>' + means + messages + '</div></div>') +
        section('ov-priorities', 'Priorities', 'check', prio) +
        section('ov-background', 'Background', 'book', background);
    }
  };

  // ===== Hospital comparison
  function hospitalsFiltered() { return D.hospitals.filter(function (h) { return hospMatch(h); }); }
  VIEW_MAP.hospitals = {
    filters: { regions: true, search: true, level: true, ret: true, sticky: true },
    count: function () { var n = hospitalsFiltered().length; return 'Showing ' + n + ' of ' + D.hospitals.length + ' hospitals'; },
    render: function () {
      return pageHead('Hospital comparison', 'Compare the 29 hospitals', 'Search, filter and sort hospital-level workforce, neonatal and return data. Select a hospital name for its full profile, including report notes and items to validate.') +
        filterBar(this.filters) + '<div id="vb">' + this.body() + '</div>';
    },
    body: function () {
      var rows = hospitalsFiltered();
      if (!rows.length) return emptyState();
      var cols = [
        { key: 'name', label: 'Hospital', render: function (h) { return '<button type="button" class="link-btn" data-hosp="' + h.id + '">' + esc(h.name) + '</button>' + (h.hub ? '<div style="margin-top:4px"><span class="hub-badge" data-tip="Provisional, for validation (report Table 6.1)">' + esc(h.hub) + '</span></div>' : ''); }, sort: function (h) { return h.name; } },
        { key: 'region', label: 'Region', cls: 'nowrap' },
        { key: 'paeds', label: 'Paediatricians', cls: 'num', thTip: 'Paediatrician appointments at this hospital (resident/sessional/visiting)', render: function (h) { return '<strong>' + h.paeds[0] + '</strong> <span class="muted small">' + h.paeds[1] + '/' + h.paeds[2] + '/' + h.paeds[3] + '</span>'; }, sort: function (h) { return h.paeds[0]; } },
        { key: 'surgeons', label: 'Paed. surgeons', cls: 'num' },
        { key: 'subspecialties', label: 'Subspecialties listed', cls: 'wrap-text', render: function (h) { return h.subspecialties === 'None listed' ? '<span class="muted">None listed</span>' : esc(h.subspecialties); } },
        { key: 'level', label: 'Neonatal level', cls: 'ctr', render: function (h) { return levelChip(a2(h, 'neoLevel')); }, sort: function (h) { var l = levelOf(h); return { III: 5, II: 4, I: 3, unstated: 2, Nil: 1, none: 0 }[l]; } },
        { key: 'nicu', label: 'NICU cots', cls: 'num', render: function (h) { return numCell(a2(h, 'nicu')); }, sort: function (h) { return num(a2(h, 'nicu')); } },
        { key: 'beds', label: 'Paed. beds', cls: 'num', render: function (h) { return numCell(a2(h, 'beds')); }, sort: function (h) { return num(a2(h, 'beds')); } },
        { key: 'picu', label: 'PICU', cls: 'ctr', render: function (h) { return codeChip(a2(h, 'picu')); }, sort: function (h) { return a2(h, 'picu') || ''; } },
        { key: 'ret', label: 'Service return', render: retChip, sort: function (h) { return h.qs == null ? -1 : h.qs; } },
        { key: 'doctorList', label: 'Doctor list', cls: 'nowrap' }
      ];
      var tbl = table('hosp', cols, hospitalsFiltered, {
        caption: 'Hospital comparison (report Appendix A, Tables A.1 and A.2)',
        foot: function (r) {
          var t = r.reduce(function (a, h) { return a + h.paeds[0]; }, 0), s = r.reduce(function (a, h) { return a + h.surgeons; }, 0);
          return '<tr><th scope="row" class="row-head">' + r.length + ' hospitals shown</th><td></td><td class="num">' + t + '</td><td class="num">' + s + '</td><td colspan="7" class="small muted">Sums are appointments, not unique doctors (7 doctors work at more than one hospital).</td></tr>';
        }
      });
      var chartRows = rows.slice().sort(function (a, b) { return b.paeds[0] - a.paeds[0] || a.short.localeCompare(b.short); }).map(function (h) {
        return { label: h.short, sub: h.region, r: h.paeds[1], s: h.paeds[2], v: h.paeds[3] };
      });
      var chart = card('Paediatrician appointments by hospital', 'Resident, sessional and visiting appointments at each hospital (Table A.1)', rsvChart(chartRows, { unit: 'appointments', aria: 'Paediatrician appointments by hospital', max: 10 }) + source('Report Table A.1. Departed doctors excluded.'));
      return '<div class="legend" style="margin-bottom:10px">' + D.codeLegend.map(function (c) { return '<span class="legend-item">' + codeChip(c.code) + ' ' + esc(c.label) + '</span>'; }).join('') + '</div>' +
        tbl + '<p class="chart-note">' + esc(D.hospitalNotes) + '</p>' + '<div style="height:18px"></div>' + chart;
    }
  };

  // ===== Workforce
  VIEW_MAP.workforce = {
    filters: { regions: true, note: 'The region filter applies to the region and state views. Network totals and subspecialty counts are report-level figures and are not filtered.' },
    count: function () { var n = D.regions.filter(function (r) { return regionMatch(r.name); }).length; return 'Showing ' + n + ' of 5 regions'; },
    render: function () {
      var w = D.workforce, u = w.unique;
      var kpis = '<div class="kpis">' +
        '<div class="kpi"><div class="kpi-value">127</div><div class="kpi-label">Paediatricians</div><div class="kpi-detail">96 resident at one or more hospitals</div><div class="kpi-ref">Report Table 3.1 (unique doctors)</div></div>' +
        '<div class="kpi"><div class="kpi-value">15</div><div class="kpi-label">Paediatric surgeons</div><div class="kpi-detail">5 resident; listed at 11 of 29 hospitals</div><div class="kpi-ref">Report Table 3.1</div></div>' +
        '<div class="kpi teal"><div class="kpi-value">38</div><div class="kpi-label">Subspecialists</div><div class="kpi-detail">30% of paediatricians, in 12 subspecialties</div><div class="kpi-ref">Report Table 3.2</div></div>' +
        '<div class="kpi amber"><div class="kpi-value">4</div><div class="kpi-label">Subspecialties resting on one person</div><div class="kpi-detail">Intensive care, nephrology, dermatology, gastroenterology</div><div class="kpi-ref">Report §3.1</div></div>' +
        '</div>';
      var uniq = card('Unique doctors by appointment type', 'Each doctor counted once; resident anywhere counts as resident',
        rsvChart([{ label: 'Paediatricians', r: u.paeds.r, s: u.paeds.s, v: u.paeds.v }, { label: 'Paediatric surgeons', r: u.surgeons.r, s: u.surgeons.s, v: u.surgeons.v }], { unit: 'unique doctors', aria: 'Unique doctors by appointment type', max: 127 }) +
        '<p class="chart-note">' + esc(w.appointmentsText) + '</p>' +
        details('Workforce summary table (Table 3.1)', staticTable(['Measure', 'Paediatricians', 'Paediatric surgeons'], w.summary, { caption: 'Paediatric workforce summary (unique doctors)' }) + '<p class="chart-note">' + esc(w.summaryNote) + '</p>'));
      var subs = w.subspecialties.map(function (s) {
        var badge = s.single ? ' <span class="tag tag-validate" style="margin-left:4px">Single practitioner</span>' : (s.oneResident ? ' <span class="tag tag-plain" style="margin-left:4px">One resident</span>' : '');
        return { labelHtml: esc(s.name) + badge, label: s.name, sub: s.hospitals, r: s.r, s: s.s, v: s.v };
      });
      var subCard = card('Declared paediatric subspecialties', 'Unique doctors by subspecialty and appointment type (Table 3.2); hospitals listed under each bar',
        rsvChart(subs, { unit: 'doctors', aria: 'Declared paediatric subspecialties', max: 11 }) +
        '<p class="chart-note">Total: 38 subspecialists — 28 resident, 7 sessional, 3 visiting. “Single practitioner” and “One resident” are the report’s descriptions, not performance ratings.</p>' +
        labelled('interp', ul(w.subspecialtyInterpretation)) + source('Report Table 3.2 and §3.1.'));
      var training = this.training();
      return pageHead('Workforce and capabilities', 'Paediatric workforce and subspecialty expertise', 'Directory as at 27 July 2026 with hospital verification to October 2026. Unique doctors are counted once; appointments count each doctor–hospital pairing.') +
        jump('workforce', [['wf-profile', 'Network profile'], ['wf-regions', 'By region'], ['wf-subs', 'Subspecialties'], ['wf-states', 'By state and child population'], ['wf-nursing', 'Nursing'], ['wf-training', 'Training and academic']]) +
        filterBar(this.filters) +
        section('wf-profile', 'Network-wide profile', 'people', kpis + '<div style="height:16px"></div>' + uniq) +
        '<div id="vb">' + this.body() + '</div>' +
        section('wf-subs', 'Subspecialty depth', 'layers', subCard) +
        section('wf-nursing', 'Nursing constraints', 'nurse', this.nursing()) +
        section('wf-training', 'Training and workforce development', 'school', training);
    },
    body: function () {
      var w = D.workforce;
      var regs = D.regions.filter(function (r) { return regionMatch(r.name); });
      var regionBlock;
      if (!regs.length) regionBlock = emptyState();
      else {
        var maxP = 55;
        var subChart = '<div class="chart-legend"><span class="legend-item"><span class="swatch" style="background:var(--c-sub)"></span>Subspecialists</span><span class="legend-item"><span class="swatch" style="background:#c9d6e2"></span>Other paediatricians</span></div><div class="chart" role="list" aria-label="Paediatricians and subspecialists by region">' +
          regs.map(function (r) {
            return '<div class="bar-row" role="listitem"><div class="bar-label">' + esc(r.name) + '<span class="sub">' + r.hospitals + ' hospitals</span></div><div class="bar-track bare" aria-hidden="true" data-tip="' + esc(r.name + ': ' + r.paeds + ' paediatricians, of whom ' + r.subspecialists + ' declare a subspecialty; ' + r.surgeons + ' paediatric surgeons') + '"><div class="bar-seg" style="width:calc(' + (r.subspecialists / maxP * 100) + '% - 1px);background:var(--c-sub)"></div><div class="bar-seg" style="width:calc(' + ((r.paeds - r.subspecialists) / maxP * 100) + '% - 1px);background:#c9d6e2"></div></div><div class="bar-value">' + r.paeds + ' <span class="muted small">(' + r.subspecialists + ' sub.)</span></div></div>';
          }).join('') + '</div>';
        var apptChart = rsvChart(regs.map(function (r) { return { label: r.name, r: r.r, s: r.s, v: r.v }; }), { unit: 'paediatrician appointments', aria: 'Paediatrician appointments by region', max: 59 });
        var tbl = table('regions', [
          { key: 'name', label: 'Region' },
          { key: 'hospitals', label: 'Hospitals', cls: 'num' },
          { key: 'paeds', label: 'Paediatricians', cls: 'num' },
          { key: 'rsv', label: 'Appointments R / S / V', cls: 'num', render: function (r) { return r.r + ' / ' + r.s + ' / ' + r.v; }, sort: function (r) { return r.r + r.s + r.v; } },
          { key: 'subspecialists', label: 'Subspecialists', cls: 'num' },
          { key: 'surgeons', label: 'Paed. surgeons', cls: 'num' },
          { key: 'returns', label: 'Service returns', cls: 'num' }
        ], function () { return D.regions.filter(function (r) { return regionMatch(r.name); }); }, {
          caption: 'Paediatric workforce by region (Table 3.3)',
          foot: function () { var t = D.regionTotals; return S.regions.length ? '' : '<tr><th scope="row" class="row-head">Network</th><td class="num">' + t.hospitals + '</td><td class="num">' + t.paeds + '</td><td class="num">' + t.r + ' / ' + t.s + ' / ' + t.v + '</td><td class="num">' + t.subspecialists + '</td><td class="num">' + t.surgeons + '</td><td class="num">' + t.returns + '</td></tr>'; }
        });
        regionBlock = '<div class="grid g-2">' + card('Paediatricians and subspecialists by region', 'Unique doctors', subChart + source('Report Table 3.3.')) +
          card('Paediatrician appointments by region', 'Resident / sessional / visiting appointments (133 in total)', apptChart + source('Report Table 3.3.')) + '</div>' +
          '<div style="height:16px"></div>' + tbl + '<p class="chart-note">' + esc(D.regionNote) + '</p>' +
          '<div class="grid g-2" style="margin-top:16px">' + card(null, null, labelled('finding', ul(w.regionFindings))) + card(null, null, labelled('interp', p(w.regionInterpretation))) + '</div>';
      }
      return section('wf-regions', 'Distribution by region', 'map', regionBlock) + section('wf-states', 'Geographic distribution and child population', 'map', this.states());
    },
    states: function () {
      var w = D.workforce;
      var metric = S.tileMetric;
      var segctl = '<div class="seg-ctl" role="group" aria-label="Map measure"><button type="button" data-act="tile" data-v="total" aria-pressed="' + (metric === 'total') + '">Specialists</button><button type="button" data-act="tile" data-v="index" aria-pressed="' + (metric === 'index') + '">Coverage index</button></div>';
      var countColors = ['#d8f0ee', '#a6dcd7', '#5fbfb8', '#1f9993', '#0b6669'];
      var idxColors = { 'Well below average': ['#a8743a', '#fff'], 'Below average': ['#ecd2ae', '#3b2a12'], 'Around average': ['#e3e6e9', '#1b2733'], 'Above average': ['#a6dcd7', '#0b3f40'], 'Well above average': ['#0f7c80', '#fff'] };
      function countBand(t) { return t <= 5 ? 0 : t <= 10 ? 1 : t <= 20 ? 2 : t <= 30 ? 3 : 4; }
      function idxBand(i) { for (var k = 0; k < w.indexBands.length; k++) if (i >= w.indexBands[k].min) return w.indexBands[k]; return w.indexBands[w.indexBands.length - 1]; }
      var byName = {}; w.states.forEach(function (s) { byName[s.state] = s; });
      var G = D.geo;
      var LEFT = 132; // extra room west of the peninsula for callout labels
      // Callout positions for small states: [labelX, labelY, anchor]; others are labelled inside.
      var CALLOUT = {
        'Perlis': [-14, 66, 'end'], 'Kedah': [-14, 106, 'end'], 'Pulau Pinang': [-14, 150, 'end'],
        'Selangor': [-14, 232, 'end'], 'Kuala Lumpur (FT)': [-14, 274, 'end'], 'Putrajaya (FT)': [-14, 314, 'end'],
        'Negeri Sembilan': [-14, 356, 'end'], 'Melaka': [-14, 400, 'end'],
        'Terengganu': [286, 128, 'start'], 'Labuan (FT)': [712, 104, 'end']
      };
      var SHORT = {};
      var shapes = '', labels = '';
      G.states.forEach(function (g) {
        var s = byName[g.name];
        if (!s) return;
        var dim = s.noKpj ? S.regions.length > 0 : !regionMatch(s.region);
        var fill, fg, val, sub = '';
        if (s.noKpj) { fill = 'url(#nokpj)'; fg = '#5f6b77'; }
        else if (metric === 'total') { var b = countBand(s.total); fill = countColors[b]; fg = b >= 3 ? '#fff' : '#0b3f40'; val = String(s.total); sub = 'R' + s.r + (s.s ? ' S' + s.s : '') + (s.v ? ' V' + s.v : ''); }
        else { var ib = idxBand(s.index); fill = idxColors[ib.label][0]; fg = idxColors[ib.label][1]; val = String(s.index); }
        var tip = s.noKpj
          ? g.name + ': no KPJ hospital (not zero workforce). Children aged 0–18: ' + fmt(s.children) + 'k (2023 est.)'
          : g.name + ' (' + s.region + '): ' + s.hosp + ' KPJ hospital' + (s.hosp > 1 ? 's' : '') + '; ' + s.total + ' specialists (R' + s.r + ' S' + s.s + ' V' + s.v + '); ' + s.sub + ' subspecialists; ' + fmt(s.children) + 'k children; ' + s.perMillion + ' per million; index ' + s.index + ' (' + idxBand(s.index).label.toLowerCase() + ')';
        shapes += '<path class="mstate' + (dim ? ' dim' : '') + '" d="' + g.d + '" fill="' + fill + '" tabindex="0" role="img" aria-label="' + esc(tip) + '" data-tip="' + esc(tip) + '"></path>';
        var name = SHORT[g.name] || g.name;
        var co = CALLOUT[g.name];
        var op = dim ? ' opacity="0.3"' : '';
        if (co) {
          var lx = co[0], ly = co[1], anc = co[2];
          labels += '<g class="mlabel"' + op + ' aria-hidden="true"><polyline points="' + (lx + (anc === 'end' ? 4 : -4)) + ',' + (ly - 4) + ' ' + g.cx + ',' + g.cy + '" class="mleader"></polyline><circle cx="' + g.cx + '" cy="' + g.cy + '" r="2" class="mdot"></circle>' +
            '<text x="' + lx + '" y="' + (ly - 8) + '" text-anchor="' + anc + '" class="mname">' + esc(name) + '</text>' +
            (s.noKpj ? '<text x="' + lx + '" y="' + (ly + 5) + '" text-anchor="' + anc + '" class="mnone">No KPJ hospital</text>'
              : '<text x="' + lx + '" y="' + (ly + 8) + '" text-anchor="' + anc + '" class="mval">' + esc(val) + (sub ? '<tspan class="msub" dx="5">' + esc(sub) + '</tspan>' : '') + '</text>') + '</g>';
        } else {
          var big = g.area > 2500;
          labels += '<g class="mlabel"' + op + ' aria-hidden="true">' +
            '<text x="' + g.cx + '" y="' + (g.cy - (s.noKpj ? 2 : 6)) + '" text-anchor="middle" class="mname" fill="' + fg + '">' + esc(name) + '</text>' +
            (s.noKpj ? '<text x="' + g.cx + '" y="' + (g.cy + 10) + '" text-anchor="middle" class="mnone">No KPJ hospital</text>'
              : '<text x="' + g.cx + '" y="' + (g.cy + 11) + '" text-anchor="middle" class="mval" fill="' + fg + '">' + esc(val) + '</text>' +
                (sub && big ? '<text x="' + g.cx + '" y="' + (g.cy + 24) + '" text-anchor="middle" class="msub" fill="' + fg + '">' + esc(sub) + '</text>' : '')) + '</g>';
        }
      });
      var svg = '<svg class="mymap" viewBox="' + (-LEFT) + ' 0 ' + (G.w + LEFT) + ' ' + G.h + '" role="group" aria-label="Map of Malaysia by state: ' + (metric === 'total' ? 'KPJ paediatric specialists' : 'coverage index') + '. Focus a state for its figures; the table below lists every value.">' +
        '<defs><pattern id="nokpj" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#f1f0ec"></rect><line x1="0" y1="0" x2="0" y2="6" stroke="#d6d3cc" stroke-width="2.4"></line></pattern></defs>' +
        '<rect x="' + (-LEFT) + '" y="0" width="' + (G.w + LEFT) + '" height="' + G.h + '" fill="#f4f8fa" rx="10"></rect>' +
        '<line x1="' + G.divider + '" y1="18" x2="' + G.divider + '" y2="' + (G.h - 18) + '" class="mdivider"></line>' +
        '<text x="' + (-LEFT + 14) + '" y="26" class="mpanel">PENINSULAR MALAYSIA</text>' +
        '<text x="' + (G.panels[1].x + 8) + '" y="26" class="mpanel">SARAWAK AND SABAH (BORNEO)</text>' +
        shapes + labels + '</svg>';
      var noKpjSwatch = '<span class="legend-item"><span class="swatch" style="background:repeating-linear-gradient(135deg,#f1f0ec,#f1f0ec 2px,#d6d3cc 2px,#d6d3cc 4px)"></span>No KPJ hospital (not zero)</span>';
      var mapLegend = metric === 'total'
        ? '<div class="legend" style="margin-top:10px"><span class="small muted">Unique specialists per state (report bands):</span>' + w.countBands.map(function (b, i) { return '<span class="legend-item"><span class="swatch" style="background:' + countColors[i] + ';border:1px solid rgba(0,0,0,.08)"></span>' + b + '</span>'; }).join('') + noKpjSwatch + '</div>'
        : '<div class="legend" style="margin-top:10px"><span class="small muted">Coverage index (network average = 100):</span>' + w.indexBands.slice().reverse().map(function (b) { return '<span class="legend-item"><span class="swatch" style="background:' + idxColors[b.label][0] + ';border:1px solid rgba(0,0,0,.08)"></span>' + esc(b.range) + ' ' + esc(b.label.toLowerCase()) + '</span>'; }).join('') + noKpjSwatch + '</div>';
      var mapCard = card('KPJ paediatric specialists by state', 'Hover or tap a state for detail. Both panels are at the same scale; the South China Sea between them is not shown.', '<div style="margin-bottom:12px">' + segctl + '</div><div class="map-wrap" tabindex="0" role="region" aria-label="State map (scrollable on small screens)">' + svg + '</div><div class="map-hint">Swipe sideways to see Sarawak and Sabah.</div>' + mapLegend +
        '<p class="chart-note">' + (metric === 'total' ? 'Unique paediatricians and paediatric surgeons with at least one appointment in the state, with resident (R), sessional (S) and visiting (V) split.' : 'Index = state KPJ specialists per million children aged 0–18 ÷ network rate (14.5) × 100.') + '</p>' + source('Report Figures 3.1 and 3.2; Tables 3.4 and 3.5. Boundaries: Natural Earth 1:10m admin-1 (public domain).'));
      var idxRows = w.states.filter(function (s) { return !s.noKpj && regionMatch(s.region); }).sort(function (a, b) { return b.index - a.index; });
      var idxChart = idxRows.length ? barChart(idxRows.map(function (s) {
        var b = idxBand(s.index);
        return { label: s.state, sub: fmt(s.children) + 'k children · ' + s.perMillion + ' per million', value: s.index, display: String(s.index), color: idxColors[b.label][0], tip: s.state + ': index ' + s.index + ' — ' + b.label.toLowerCase() + ' (' + s.total + ' specialists, ' + fmt(s.children) + 'k children, ' + s.perMillion + ' per million)' };
      }), { max: 300, ref: 100, ticks: [0, 100, 200, 300], aria: 'Coverage index by state' }) : emptyState();
      var idxCard = card('Coverage relative to child population', 'Index by state; dashed line = KPJ network average (100)', idxChart + '<p class="chart-note">' + esc(w.indexMethod) + '</p>');
      var stTable = table('states', [
        { key: 'state', label: 'State' },
        { key: 'region', label: 'Region', render: function (s) { return s.region ? esc(s.region) : '<span class="muted">—</span>'; } },
        { key: 'hosp', label: 'Hosp.', cls: 'num', render: function (s) { return s.noKpj ? '<span class="muted">No KPJ hospital</span>' : s.hosp; } },
        { key: 'paeds', label: 'Paeds', cls: 'num', render: function (s) { return s.noKpj ? '<span class="muted">n/a</span>' : s.paeds; } },
        { key: 'sub', label: 'Sub-spec.', cls: 'num', render: function (s) { return s.noKpj ? '<span class="muted">n/a</span>' : s.sub; } },
        { key: 'surg', label: 'Surg.', cls: 'num', render: function (s) { return s.noKpj ? '<span class="muted">n/a</span>' : s.surg; } },
        { key: 'total', label: 'Total', cls: 'num', render: function (s) { return s.noKpj ? '<span class="muted">n/a</span>' : '<strong>' + s.total + '</strong>'; } },
        { key: 'rsv', label: 'R / S / V', cls: 'num nowrap', render: function (s) { return s.noKpj ? '<span class="muted">n/a</span>' : s.r + ' / ' + s.s + ' / ' + s.v; }, sortable: false },
        { key: 'appts', label: 'Appts', cls: 'num', render: function (s) { return s.noKpj ? '<span class="muted">n/a</span>' : s.appts; } },
        { key: 'children', label: 'Children 0–18', cls: 'num', render: function (s) { return fmt(s.children) + 'k'; } },
        { key: 'perMillion', label: 'Per million', cls: 'num', render: function (s) { return s.noKpj ? '<span class="muted">n/a</span>' : s.perMillion; } },
        { key: 'index', label: 'Index', cls: 'num', render: function (s) { return s.noKpj ? '<span class="muted">n/a</span>' : '<strong>' + s.index + '</strong> <span class="small muted">' + esc(idxBand(s.index).label) + '</span>'; } }
      ], function () { return w.states.filter(function (s) { return S.regions.length ? (!s.noKpj && regionMatch(s.region)) : true; }); }, {
        caption: 'Paediatric specialist workforce and coverage by state (Tables 3.4 and 3.5)',
        foot: function () { var n = w.statesNetwork; return S.regions.length ? '' : '<tr><th scope="row" class="row-head">Network (unique doctors)</th><td></td><td class="num">' + n.hosp + '</td><td class="num">' + n.paeds + '</td><td class="num">' + n.sub + '</td><td class="num">' + n.surg + '</td><td class="num">' + n.total + '</td><td class="num">' + n.r + ' / ' + n.s + ' / ' + n.v + '</td><td class="num">' + n.appts + '</td><td class="num">' + fmt(n.children) + 'k</td><td class="num">' + n.perMillion + '</td><td class="num">' + n.index + '</td></tr>'; }
      });
      return mapCard + '<div style="height:16px"></div>' + idxCard + '<div style="height:16px"></div>' + stTable +
        '<p class="chart-note">' + esc(w.statesNote) + ' States with no KPJ hospital are shown separately — this is not zero workforce.</p>' +
        '<div class="grid g-2" style="margin-top:16px">' + card(null, null, labelled('finding', ul(w.stateFindings))) +
        card(null, null, labelled('interp', p(w.stateInterpretation)) + labelled('rec', ul(w.stateRecommendations))) + '</div>';
    },
    nursing: function () {
      var w = D.workforce;
      return '<p class="section-intro">' + esc(w.nursingIntro) + '</p><div class="f-cards">' + w.nursing.map(function (n) {
        return '<article class="f-card"><div class="f-card-head"><span class="f-icon">' + icon('nurse') + '</span><h3>' + esc(n.pain) + '</h3></div>' +
          '<dl class="kv"><dt>Where / scale</dt><dd>' + esc(n.where) + '</dd><dt>Consequence</dt><dd>' + esc(n.consequence) + '</dd></dl>' +
          '<div>' + tag('rec', 'Suggested resolution (report)') + '<p style="margin-top:6px">' + esc(n.resolution) + '</p></div></article>';
      }).join('') + '</div>' + source('Report §3.4 and Table 3.6.');
    },
    training: function () {
      var t = D.workforce.training, a = D.workforce.achievements;
      var prog = '<div class="progress" role="img" aria-label="' + t.mccnDelivered + ' of ' + t.mccnPlanned + ' sessions delivered">' + Array.apply(null, Array(t.mccnPlanned)).map(function (_, i) { return '<span style="flex:1;' + (i < t.mccnDelivered ? '' : 'background:transparent') + '"></span>'; }).join('') + '</div><div class="small muted" style="margin-top:6px">' + t.mccnDelivered + ' of ' + t.mccnPlanned + ' planned virtual sessions delivered</div>';
      return '<div class="grid g-2">' +
        card('KPJ Healthcare University (KPJU)', null, labelled('finding', p(t.kpju)) + callout('validate', 'Information not available', p(t.kpjuGap))) +
        card('Mayo Clinic Care Network (MCCN) series', null, labelled('finding', p(t.mccn)) + prog + details('Sessions delivered to date', ul(t.mccnSessions)) + '<div style="margin-top:12px">' + labelled('rec', p(t.mccnRecommendation)) + '</div>') +
        '</div><div class="grid g-2" style="margin-top:18px">' +
        card('1st KPJ Paediatric Conference 2026', 'Planned initiative (Appendix B)', staticTable(['Item', 'Detail'], t.conference, { caption: 'Conference details (programme and venue to be confirmed)' })) +
        card('Clinical, teaching and research achievements', 'Appendix B — items marked verified were checked against public sources', '<h4 style="margin:0 0 6px">Clinical</h4>' + ul(a.clinical) + '<h4 style="margin:10px 0 6px">Teaching</h4>' + ul(a.teaching) + '<h4 style="margin:10px 0 6px">Research</h4>' + ul(a.research)) +
        '</div>';
    }
  };

  // ===== Services
  VIEW_MAP.services = {
    filters: { regions: true, search: true, level: true, ret: true, note: 'Filters apply to the hospital-level service matrix, neonatal and critical-care charts, admissions and referral routes. The availability counts are network figures from the report and are not filtered.' },
    count: function () { var n = hospitalsFiltered().length; return 'Showing ' + n + ' of ' + D.hospitals.length + ' hospitals'; },
    render: function () {
      var sv = D.services;
      var domains = ['All'].concat(sv.availability.map(function (a) { return a.domain; }).filter(function (d, i, arr) { return arr.indexOf(d) === i; }));
      var avail = '<div class="chips domain-chips" role="group" aria-label="Service domain">' + domains.map(function (d) { return '<button type="button" class="chip" data-act="domain" data-v="' + esc(d) + '" aria-pressed="' + (S.domain === d) + '">' + esc(d) + '</button>'; }).join('') + '</div><div id="avail">' + this.avail() + '</div>';
      return pageHead('Services and coverage', 'Services, facilities and equipment', sv.intro) +
        jump('services', [['sv-availability', 'Availability'], ['sv-matrix', 'Hospital service matrix'], ['sv-neonatal', 'Neonatal care'], ['sv-critical', 'Critical care'], ['sv-surgery', 'Surgery'], ['sv-subspecialty', 'Subspecialty and diagnostics'], ['sv-development', 'Development and safeguarding'], ['sv-referrals', 'Transfers and referrals'], ['sv-inpatient', 'Inpatient and admissions'], ['sv-access', 'Access and family experience']]) +
        section('sv-availability', 'Service availability across the network', 'chart', card('Hospitals providing each service', 'Out of hospitals that answered each question. Where the report gives no denominator, only the count is shown.', avail + source('Report §4.1–4.8. Network figures — not affected by filters.'))) +
        filterBar(this.filters) + '<div id="vb">' + this.body() + '</div>' +
        section('sv-surgery', 'Surgery and anaesthesia', 'scalpel', '<div class="grid g-2">' + card(null, null, labelled('finding', ul(sv.surgery.findings))) + card(null, null, labelled('interp', p(sv.surgery.interpretation)) + source('Report §4.4.')) + '</div>') +
        section('sv-subspecialty', 'Subspecialty, oncology and diagnostic services', 'layers', '<div class="grid g-2">' + card(null, null, labelled('finding', ul(sv.subspecialty.findings))) + card(null, null, labelled('interp', p(sv.subspecialty.interpretation)) + '<p class="chart-note">' + esc(D.a3Footnotes) + '</p>' + source('Report §4.5.')) + '</div>') +
        section('sv-development', 'Development, therapies and safeguarding', 'family', card(null, null, labelled('interp', p(sv.development.interpretation)) + '<p class="small muted">Service counts for developmental assessment, therapies, child psychology and child-protection pathways are in the availability chart above (domain “Development, therapies and safeguarding”).</p>' + source('Report §4.6.'))) +
        section('sv-access', 'Access, family experience and recognition', 'family', '<div class="grid g-2">' + card(null, null, labelled('finding', ul(sv.access.findings))) + card(null, null, labelled('interp', p(sv.access.interpretation)) + source('Report §4.8.')) + '</div>');
    },
    avail: function () {
      var items = D.services.availability.filter(function (a) { return S.domain === 'All' || a.domain === S.domain; });
      return shareChart(items.map(function (a) { return { label: a.label, sub: S.domain === 'All' ? a.domain : a.note, n: a.n, of: a.of, note: a.note }; }), 'Service availability');
    },
    body: function () {
      var sv = D.services;
      var rows = hospitalsFiltered();
      // matrix
      var tab = S.matrixTab;
      var cols = tab === 'a2' ? D.a2Cols : D.a3Cols;
      var matrix;
      if (!rows.length) matrix = emptyState();
      else {
        var head = '<tr><th scope="col" class="row-head">Hospital</th>' + cols.map(function (c) { return '<th scope="col" class="mcol"><abbr title="' + esc(c.label) + '" style="text-decoration:none" data-tip="' + esc(c.label) + '">' + esc(c.short) + '</abbr></th>'; }).join('') + '</tr>';
        var body = '';
        REGIONS.forEach(function (rg) {
          var rr = rows.filter(function (h) { return h.region === rg; });
          if (!rr.length) return;
          body += '<tr class="region-row"><td class="row-head">' + esc(rg) + '</td><td colspan="' + cols.length + '"></td></tr>';
          rr.forEach(function (h) {
            var vals = tab === 'a2' ? h.a2 : h.a3;
            body += '<tr><th scope="row" class="row-head"><button type="button" class="link-btn" data-hosp="' + h.id + '">' + esc(h.short) + '</button></th>';
            if (!vals) {
              body += '<td colspan="' + cols.length + '" style="text-align:left" class="small muted">' + (h.ret === 'none' ? 'Service return not received — no service data (not the same as “No”).' : 'Partial return (' + h.qs + ' of 74 questions) — not in the service tables.') + '</td>';
            } else {
              cols.forEach(function (c, i) {
                var v = vals[i];
                var cell = c.kind === 'num' ? numCell(v) : c.kind === 'level' ? levelChip(v) : codeChip(v);
                body += '<td>' + cell + '</td>';
              });
            }
            body += '</tr>';
          });
        });
        matrix = '<div class="table-wrap" tabindex="0" role="region" aria-label="Hospital service matrix (scrollable)"><table class="data matrix"><caption>' + (tab === 'a2' ? 'Inpatient, neonatal, critical care and surgical services (Table A.2)' : 'Subspecialty, developmental, therapy and safeguarding services (Table A.3)') + '</caption><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>';
      }
      var tabs = '<div class="seg-ctl" role="group" aria-label="Service group"><button type="button" data-act="mtab" data-v="a2" aria-pressed="' + (tab === 'a2') + '">Inpatient, neonatal and critical care</button><button type="button" data-act="mtab" data-v="a3" aria-pressed="' + (tab === 'a3') + '">Subspecialty, development and safeguarding</button></div>';
      var legendHtml = '<div class="legend" style="margin:12px 0">' + D.codeLegend.map(function (c) { return '<span class="legend-item">' + codeChip(c.code) + ' ' + esc(c.label) + '</span>'; }).join('') + '<span class="legend-item"><span class="code code-na">n/a</span> No service data</span></div>';
      var matrixCard = card('Hospital service matrix', 'As reported in each hospital’s return; select a hospital for its profile', tabs + legendHtml + matrix + '<p class="chart-note">' + esc(tab === 'a2' ? D.a2Footnotes : D.a3Footnotes) + '</p>');

      // neonatal
      var nn = sv.neonatal;
      var nicuRows = rows.filter(function (h) { return num(a2(h, 'nicu')) > 0; }).sort(function (a, b) { return num(a2(b, 'nicu')) - num(a2(a, 'nicu')); });
      var nicuChart = nicuRows.length ? barChart(nicuRows.map(function (h) {
        var lv = a2(h, 'neoLevel');
        return { label: h.short, sub: 'Level ' + lv + (h.gestation ? ' · keeps babies from ' + h.gestation : ''), value: num(a2(h, 'nicu')), color: lv === 'III' ? 'var(--navy-700)' : 'var(--teal-500)', tip: h.short + ': ' + a2(h, 'nicu') + ' NICU cots, Level ' + lv + (String(a2(h, 'nicu')).indexOf('+') > -1 ? ' (includes 1 isolation cot)' : '') };
      }), { max: 9, aria: 'NICU cots by hospital', ticks: [0, 3, 6, 9] }) : '<div class="empty">No hospitals with NICU cots in the current filter.</div>';
      var levelStats = '<div class="kpis" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">' + nn.levels.map(function (l) { return '<div class="kpi ' + (l.level === 'Level III' ? '' : l.level === 'Level II' ? 'teal' : 'neutral') + '"><div class="kpi-value">' + l.count + '</div><div class="kpi-label">' + esc(l.level) + '</div><div class="kpi-detail">' + esc(l.hospitals) + '</div></div>'; }).join('') + '</div><p class="chart-note">Of 27 hospitals that answered. Report §4.2.</p>';
      var assess = table('neoassess', [
        { key: 'hospital', label: 'Hospital' },
        { key: 'claimed', label: 'Level claimed', cls: 'nowrap' },
        { key: 'evidence', label: 'Evidence from the return', cls: 'wrap-text', sortable: false },
        { key: 'assessment', label: 'Assessment (report)', cls: 'wrap-text', sortable: false }
      ], function () { return nn.assessment.filter(function (a) { var h = D.hospitals.filter(function (x) { return a.hospital.indexOf(x.short) > -1 || x.name.indexOf(a.hospital) > -1; })[0]; return h ? hospMatch(h) : !filtersActive(); }); }, { caption: 'Claimed neonatal level against the reference criteria (Table 4.2)', empty: '<div class="empty">No assessed hospitals in the current filter.</div>' });
      var neonatal = levelStats + '<div class="grid g-2" style="margin-top:16px">' +
        card('NICU cots by hospital', '29 NICU cots network-wide; filtered view shown', legend([['Level III', 'var(--navy-700)'], ['Level II', 'var(--teal-500)']]) + nicuChart + source('Report §4.2 and Table A.2.')) +
        card(null, null, labelled('finding', ul(nn.findings)) + labelled('interp', ul(nn.interpretation))) + '</div>' +
        '<div style="margin-top:16px">' + callout('validate', 'Validation required', p(nn.validation)) + '</div>' +
        '<div style="margin-top:16px">' + callout('rec', 'Recommendation (report)', p(nn.recommendation)) + '</div>' +
        '<div style="margin-top:16px">' + assess + '<p class="chart-note">' + esc(nn.assessmentNote) + '</p></div>' +
        details('Reference criteria for neonatal unit levels (Table 4.1)', p(nn.levelDefinition) + staticTable(nn.criteria.head, nn.criteria.rows, { caption: 'Reference criteria (AAP, BAPM, MOH)', wrap: true }) + '<p class="chart-note">' + esc(nn.criteria.note) + '</p>');

      // critical care
      var cc = sv.critical;
      var ccRows = cc.beds.filter(function (b) { var h = hospByShort(b.hospital); return h ? hospMatch(h) : true; });
      var ccChart = ccRows.length ? '<div class="chart-legend"><span class="legend-item"><span class="swatch" style="background:var(--navy-700)"></span>PICU beds</span><span class="legend-item"><span class="swatch" style="background:var(--teal-500)"></span>Paediatric HDU beds</span><span class="legend-item"><span class="swatch" style="background:repeating-linear-gradient(135deg,#fff,#fff 2px,#997f62 2px,#997f62 4px)"></span>Planned PICU beds</span></div><div class="chart" role="list" aria-label="PICU and HDU beds">' +
        ccRows.map(function (b) {
          var max = 4, segs = '';
          if (b.picu) segs += '<div class="bar-seg" style="width:calc(' + (b.picu / max * 100) + '% - 1px);background:var(--navy-700)"></div>';
          if (b.hdu) segs += '<div class="bar-seg" style="width:calc(' + (b.hdu / max * 100) + '% - 1px);background:var(--teal-500)"></div>';
          if (b.planned) segs += '<div class="bar-seg" style="width:calc(' + (b.planned / max * 100) + '% - 1px);background:repeating-linear-gradient(135deg,#fff,#fff 3px,#997f62 3px,#997f62 6px);border:1px solid #997f62"></div>';
          var val = (b.picu ? b.picu + ' PICU' : '') + (b.picu && b.hdu ? ' · ' : '') + (b.hdu ? b.hdu + ' HDU' : '') + (b.planned ? b.planned + ' planned' : '') + (b.plannedUnstated ? 'Planned' : '');
          return '<div class="bar-row" role="listitem"><div class="bar-label">' + esc(b.hospital) + '<span class="sub">' + esc(b.status) + '</span></div><div class="bar-track bare" aria-hidden="true" data-tip="' + esc(b.hospital + ': ' + b.status + (b.note ? '. ' + b.note : '')) + '">' + (segs || '<div class="bar-nobar" style="width:100%">Beds not stated</div>') + '</div><div class="bar-value">' + esc(val) + '</div></div>';
        }).join('') + '</div>' : '<div class="empty">No critical-care beds reported for hospitals in the current filter.</div>';
      var critical = '<div class="grid g-2">' + card('PICU and paediatric HDU beds', '3 PICU beds and 6 HDU beds reported network-wide', ccChart + source('Report §4.3 and Table A.2.')) +
        card(null, null, labelled('finding', ul(cc.findings)) + labelled('interp', p(cc.interpretation))) + '</div>';

      // referrals
      var rf = sv.referrals;
      var flows = rf.internal.filter(function (f) { var h = hospByShort(f.from); return h ? hospMatch(h) : true; });
      var flowHtml = flows.length ? '<div class="flows" role="list" aria-label="Internal KPJ referral routes named in returns">' + flows.map(function (f) { return '<div class="flow" role="listitem"><span class="node">' + esc(f.from) + '</span>' + icon('arrow') + '<span class="node to">' + esc(f.to) + '</span><span class="sr-only">refers to</span></div>'; }).join('') + '</div>' : '<div class="empty">No named internal referral routes from hospitals in the current filter.</div>';
      var referrals = '<div class="grid g-2">' +
        card('Internal KPJ routes named in returns', 'The few hospitals that name another KPJ hospital as a destination', flowHtml + source('Report §4.7.')) +
        card('Destinations outside KPJ', 'For critically ill children and babies hospitals cannot keep', '<h4 style="margin:0 0 8px">Government hospitals named</h4><div class="dest-list">' + rf.government.map(function (g) { return '<span class="dest">' + esc(g) + '</span>'; }).join('') + '</div><h4 style="margin:14px 0 8px">University and private hospitals</h4><div class="dest-list"><span class="dest">' + esc(rf.university) + '</span>' + rf.privateDest.map(function (g) { return '<span class="dest private">' + esc(g) + '</span>'; }).join('') + '</div>' + source('Report §4.7 and §5.3. Network-level; not filtered.')) +
        '</div><div class="grid g-3" style="margin-top:16px">' +
        card('Most often sent elsewhere', null, ul(rf.sentOut)) +
        card('Constraints most often cited', null, '<div class="dest-list">' + rf.constraints.map(function (c) { return '<span class="dest">' + esc(c) + '</span>'; }).join('') + '</div>') +
        card(null, null, labelled('finding', ul(rf.findings))) + '</div>' +
        '<div style="margin-top:16px">' + callout('interp', 'Interpretation (report)', p(rf.interpretation)) + '</div>';

      // inpatient & admissions
      var ip = sv.inpatient;
      var adm = ip.admissions.filter(function (a) { var h = hospByShort(a.hospital); return h ? hospMatch(h) : true; });
      var admChart = adm.length ? barChart(adm.map(function (a) { return { label: a.hospital, sub: regionOf(a.hospital), value: a.high, display: a.label, tip: a.hospital + ': ' + a.label + ' paediatric admissions last year' + (a.low !== a.high ? ' (range shown as reported; bar drawn to upper value)' : '') }; }), { max: 5500, aria: 'Reported paediatric admissions', ticks: [0, 2500, 5000] }) : '<div class="empty">The report gives no admissions figure for hospitals in the current filter.</div>';
      var inpatient = '<div class="grid g-2">' + card('Reported paediatric admissions, last year', 'Only hospitals whose figures the report names', admChart + '<p class="chart-note">' + esc(ip.admissionsNote) + '</p>' + source('Report §4.1 and Table 7.3.')) +
        card(null, null, labelled('finding', ul(ip.findings)) + labelled('interp', p(ip.interpretation))) + '</div>';

      return section('sv-matrix', 'Hospital service matrix', 'grid', matrixCard) +
        section('sv-neonatal', 'Neonatal care', 'baby', neonatal) +
        section('sv-critical', 'Paediatric critical care', 'heart', critical) +
        section('sv-referrals', 'Transfers and referral flows', 'route', referrals) +
        section('sv-inpatient', 'Inpatient and acute care', 'bed', inpatient);
    }
  };

  // ===== Findings, strengths and gaps
  VIEW_MAP.findings = {
    render: function () {
      var f = D.findings;
      var strengths = '<div class="f-cards">' + f.strengths.map(function (s) {
        return '<article class="f-card"><div class="f-card-head"><span class="f-icon">' + icon('star') + '</span><h3>' + esc(s.title) + '</h3></div><dl class="kv"><dt>Evidence</dt><dd>' + esc(s.evidence) + '</dd><dt>Why it matters</dt><dd>' + esc(s.why) + '</dd></dl></article>';
      }).join('') + '</div>' + source('Report Table 5.1.');
      var gaps = '<div class="f-cards">' + f.gaps.map(function (g) {
        var pr = g.priorities.length ? g.priorities.map(function (n) { return '<a href="#/priorities/pr-' + n + '" class="small">Priority ' + n + '</a>'; }).join(', ') : '<span class="small muted">No specific priority</span>';
        return '<article class="f-card gap-card"><div class="f-card-head"><span class="gap-id">' + esc(g.id) + '</span><h3>' + esc(g.title) + '</h3></div><dl class="kv"><dt>Evidence</dt><dd>' + esc(g.evidence) + '</dd><dt>Status</dt><dd>' + esc(g.status) + '</dd><dt>Risk if not addressed</dt><dd>' + esc(g.risk) + '</dd></dl><div class="f-foot"><span class="small">Related: ' + pr + '</span></div></article>';
      }).join('') + '</div>' + '<p class="chart-note">' + tag('note') + ' ' + esc(f.gapLinkNote) + '</p>' + source('Report Table 5.2. The report assigns no severity ratings; gaps are listed in the report’s order.');
      var comp = table('comp', [
        { key: 'provider', label: 'Provider', render: function (c) { return esc(c.provider) + (c.verified ? '' : '<div class="small muted">Internal assessment; not independently validated</div>'); } },
        { key: 'positioning', label: 'Positioning and main strength', cls: 'wrap-text', sortable: false },
        { key: 'implication', label: 'Implication for KPJ', cls: 'wrap-text', sortable: false }
      ], function () { return f.competitors; }, { caption: 'Competitive positioning in paediatrics (Table 5.3)' });
      return pageHead('Strengths and gaps', 'Key findings, strengths and service gaps', 'What KPJ can build on, where the gaps are, and how competitors compare.') +
        jump('findings', [['fd-strengths', 'Strengths'], ['fd-gaps', 'Service gaps'], ['fd-competition', 'Competitive context'], ['fd-environment', 'Operating environment']]) +
        section('fd-strengths', 'Strengths to build on', 'star', strengths) +
        section('fd-gaps', 'Service gaps (G1–G8)', 'gap', gaps + '<div style="margin-top:16px">' + callout('interp', 'The gaps are connected (report interpretation)', ul(f.connected)) + '</div>') +
        section('fd-competition', 'Competitive context', 'target', comp + '<p class="chart-note">' + esc(f.competitorNote) + '</p><div style="height:16px"></div>' +
          staticTable(f.comparison.head, f.comparison.rows, { caption: 'Paediatric capability: KPJ compared with Sunway and Avisena (Table 5.4)', wrap: true }) + '<p class="chart-note">' + esc(f.comparison.note) + '</p>' +
          '<div style="margin-top:12px">' + callout('interp', 'Interpretation (report)', ul(f.competitionInterpretation)) + '</div>') +
        section('fd-environment', 'Operating environment', 'info', '<div class="grid g-2">' + f.environment.map(function (e) { return card(e.title, null, p(e.text)); }).join('') + '</div>' + source('Report §5.4.'));
    }
  };

  // ===== Planning
  VIEW_MAP.planning = {
    filters: { regions: true, note: 'The region filter applies to the hub-and-spoke tiers and the regional strengths table.' },
    count: function () { var n = REGIONS.filter(regionMatch).length; return 'Showing ' + n + ' of 5 regions'; },
    render: function () {
      var pl = D.planning;
      var principles = '<div class="grid g-2">' + pl.principles.map(function (x) { return card(x.title, null, p(x.text)); }).join('') + '</div>';
      var kpi = staticTable(['Indicator', 'Proposed target'], pl.kpis, { caption: 'Proposed clinical KPIs and targets (Table 6.3, from the Paediatrics programme proposal)' });
      return pageHead('Network planning', 'Implications for network planning, resource allocation and referrals', pl.intro) +
        jump('planning', [['pl-tiers', 'Hub-and-spoke'], ['pl-strengths', 'Regional strengths'], ['pl-resources', 'Resource allocation'], ['pl-referrals', 'Referrals'], ['pl-quality', 'Quality and KPIs']]) +
        filterBar(this.filters) + '<div id="vb">' + this.body() + '</div>' +
        section('pl-resources', 'Resource allocation principles', 'target', '<div style="margin-bottom:12px">' + tag('rec') + '</div>' + principles + source('Report §6.2.')) +
        section('pl-referrals', 'Referrals and escalation', 'route', card('Minimum referral infrastructure', null, labelled('rec', ul(pl.referralInfrastructure)) + source('Report §6.3.'))) +
        section('pl-quality', 'Quality, governance and payers', 'shield', '<div class="grid g-2">' + card('Proposed clinical KPIs', 'Targets set by the Paediatrics programme proposal', kpi + callout('validate', 'Baselines not yet available', p(pl.kpiNote))) + card(null, null, labelled('interp', p(pl.payerInterpretation)) + labelled('rec', p(pl.specRecommendation))) + '</div>');
    },
    body: function () {
      var pl = D.planning;
      var tiers = pl.tiers.filter(function (t) { return t.region === 'All regions' || REGIONS.some(function (r) { return t.region.indexOf(r) > -1 && regionMatch(r); }); });
      var tierHtml = tiers.length ? '<div class="f-cards">' + tiers.map(function (t) {
        return '<article class="f-card"><div class="f-card-head"><span class="f-icon">' + icon('network') + '</span><div><h3>' + esc(t.tier) + '</h3><div class="small muted">' + esc(t.region) + '</div></div></div><div><div class="small" style="font-weight:700;color:var(--navy-900);margin-bottom:4px">Provisional candidates and evidence</div>' + ul(t.candidates) + '</div>' +
          callout('validate', 'To confirm before designation', p(t.confirm)) + '</article>';
      }).join('') + '</div>' : emptyState();
      var rows = pl.strengths.rows.filter(function (r) { return regionMatch(r[0]); });
      var st = rows.length ? staticTable(pl.strengths.head, rows, { caption: 'Regional strengths by discipline (Table 6.2) — basis for hub-and-spoke designation', wrap: true }) : emptyState();
      return section('pl-tiers', 'Provisional hub-and-spoke structure', 'network', '<div style="margin-bottom:12px">' + tag('interp') + ' <span class="small muted">For validation — the report’s interpretation of current evidence (Table 6.1).</span></div>' + tierHtml +
          '<div style="margin-top:16px">' + callout('interp', 'The most consequential decision: paediatric intensive care', p(pl.picuInterpretation)) + '</div>') +
        section('pl-strengths', 'Regional strengths by discipline', 'map', st);
    }
  };

  // ===== Priorities
  VIEW_MAP.priorities = {
    render: function () {
      var pr = D.priorities;
      var g = gantt(pr.items.map(function (i) { return { label: i.n + '. ' + i.title, sub: i.lead, bars: i.bars, timing: i.timing, early: i.early, barLabel: i.timing.replace('Interim cover early; full plan ', ''), tip: 'Priority ' + i.n + ': ' + i.title + ' — ' + i.timing + ' (lead: ' + i.lead + ')' }; }), 'Priority timeline, months 1 to 24');
      var cards = '<div class="grid g-2">' + pr.items.map(function (i) {
        return '<article class="card prio-card" id="pr-' + i.n + '"><span class="prio-num" aria-hidden="true">' + i.n + '</span><div><h3 class="card-title"><span class="sr-only">Priority ' + i.n + ': </span>' + esc(i.title) + '</h3>' + ul(i.actions) + '<div class="meta"><span><strong>Lead:</strong> ' + esc(i.lead) + '</span><span><strong>Timing:</strong> ' + esc(i.timing) + '</span></div></div></article>';
      }).join('') + '</div>';
      var phases = gantt(pr.phases.map(function (ph) { return { label: ph.phase, sub: ph.lead, bars: [[ph.from, ph.to]], timing: ph.timing, teal: true, tip: ph.phase + ' (' + ph.timing + '): ' + ph.deliverables }; }), 'Programme phases');
      var phaseTable = staticTable(['Phase', 'Timing', 'Lead', 'Expected deliverables'], pr.phases.map(function (ph) { return [ph.phase, ph.timing, ph.lead, ph.deliverables]; }), { caption: 'Programme phases (Table 7.2)', wrap: true });
      var next = staticTable(['Action', 'Owner', 'When'], pr.nextSteps.map(function (n) { return [n.action, n.owner, n.when || 'Within 90 days']; }), { caption: 'Immediate next steps — next 90 days (§7.4)', wrap: true });
      var support = staticTable(['Area', 'What the evidence shows', 'Proposed actions'], pr.groupSupport.map(function (x) { return [x.area, x.evidence, x.actions]; }), { caption: 'Group support for the Paediatric Healthcare Network (Table 7.3)', wrap: true });
      var tiers = staticTable(['Tier', 'Role', 'Standard paediatric service specification'], pr.hospitalTiers.map(function (x) { return [x.tier, x.role, x.spec]; }), { caption: 'Proposed hospital roles in the Paediatric Healthcare Network (Table 7.4)', wrap: true });
      return pageHead('Priorities and actions', 'Proposed priorities and next steps', pr.intro) +
        callout('rec', 'These are the report’s recommendations', '<p>Everything on this page is proposed in the report (or the Paediatrics programme proposal it draws on). The dashboard adds no recommendations of its own; its notes on data issues are under Sources and limitations.</p>') +
        jump('priorities', [['pr-timeline', 'Timeline'], ['pr-list', 'Priorities'], ['pr-roadmap', 'Roadmap'], ['pr-decisions', 'Decisions requested'], ['pr-next', 'Next 90 days'], ['pr-network', 'Building the network']]) +
        section('pr-timeline', 'Priority timeline', 'check', card(null, 'Months counted from programme approval. Dashed outline on Priority 4 = interim cover “early” (no month given).', g + '<p class="chart-note">' + esc(pr.itemsNote) + '</p>')) +
        section('pr-list', 'Priorities, actions and leads (Table 7.1)', 'target', cards) +
        section('pr-roadmap', 'Implementation roadmap', 'route', card(null, null, phases + '<p class="chart-note">' + esc(pr.phasesNote) + '</p>') + '<div style="height:14px"></div>' + phaseTable) +
        section('pr-decisions', 'Decisions requested of senior management', 'flag', card(null, null, '<ol class="bullets" style="padding-left:1.3em">' + pr.decisions.map(function (d) { return '<li>' + esc(d) + '</li>'; }).join('') + '</ol>' + source('Report §7.3.'))) +
        section('pr-next', 'Immediate next steps', 'arrow', next) +
        section('pr-network', 'Building the Paediatric Healthcare Network', 'network', support + '<div style="height:14px"></div>' + tiers + '<p class="chart-note">' + esc(pr.tiersNote) + '</p>' + '<div style="margin-top:12px">' + callout('rec', 'Recommendation (report)', p(pr.closingRecommendation)) + '</div>');
    }
  };

  // ===== Sources and limitations
  VIEW_MAP.sources = {
    render: function () {
      var src = D.sources, m = D.meta;
      var info = staticTable(['Item', 'Detail'], [
        ['Report', m.reportTitle + ' — ' + m.reportSubtitle],
        ['Prepared by', m.preparedBy],
        ['Reporting position', m.reportingPosition],
        ['Preparation date', m.preparationDate],
        ['Document status', m.status],
        ['Related document', m.relatedDocument],
        ['Source file', m.sourceFile],
        ['Scope', m.scope]
      ], { caption: 'Report details' });
      var labels = '<div class="grid g-2">' + m.readingLabels.map(function (l) {
        var k = { 'Finding': 'finding', 'Interpretation': 'interp', 'Recommendation': 'rec', 'To validate': 'validate' }[l.label];
        return '<div class="card" style="padding:14px 16px">' + tag(k) + '<p style="margin:8px 0 0">' + esc(l.text) + '</p></div>';
      }).join('') + '<div class="card" style="padding:14px 16px">' + tag('note') + '<p style="margin:8px 0 0">Added by this dashboard while transcribing the report (for example, data issues). Not part of the report.</p></div></div>';
      var hs = D.hospitals.slice().sort(function (a, b) { return (a.qs == null ? -1 : a.qs) - (b.qs == null ? -1 : b.qs); });
      var comp = shareChart(hs.map(function (h) {
        return h.qs == null
          ? { label: h.short, sub: h.region, n: 0, of: null, nobar: 'Return not received', valueHtml: '— <span class="muted">not returned</span>', tip: h.short + ': service return not received — no answers (not zero)' }
          : { label: h.short, sub: h.region, n: h.qs, of: 74, color: h.ret === 'partial' ? 'var(--c-vis)' : 'var(--navy-700)' };
      }), 'Service questions answered by hospital');
      var cross = table('cross', [
        { key: 'name', label: 'Hospital', render: function (h) { return esc(h.short); } },
        { key: 'region', label: 'Region' },
        { key: 'a', label: 'Appointments in returns', cls: 'num', render: function (h) { return h.online[0]; }, sort: function (h) { return h.online[0]; } },
        { key: 'b', label: 'Confirmed online', cls: 'num', render: function (h) { return h.online[1]; }, sort: function (h) { return h.online[1]; } },
        { key: 'c', label: 'Not found online', cls: 'num', render: function (h) { return h.online[2]; }, sort: function (h) { return h.online[2]; } },
        { key: 'd', label: 'Online, not in returns', cls: 'num', render: function (h) { return h.online[3]; }, sort: function (h) { return h.online[3]; } }
      ], function () { return D.hospitals; }, { caption: 'Online cross-check of the paediatric roster (Table C.2, 15 October 2026)', foot: function () { var t = src.crossCheckTotals; return '<tr><th scope="row" class="row-head">Total</th><td>29 hospitals</td><td class="num">' + t.appointments + '</td><td class="num">' + t.confirmed + '</td><td class="num">' + t.notFound + '</td><td class="num">' + t.onlineOnly + '</td></tr>'; } });
      var val = '<div class="filters" style="position:static;box-shadow:none"><div class="filters-row"><div class="f-group" style="flex:1"><label class="f-label" for="val-q">Search the validation log</label><div class="search-wrap">' + icon('search') + '<input id="val-q" class="input" type="search" placeholder="e.g. Perdana, PICU, Kuching" autocomplete="off" style="width:100%"></div></div></div><div class="active-filters" id="val-count" aria-live="polite"></div></div><div id="val-body">' + this.valTable('') + '</div>';
      return pageHead('Sources and limitations', 'Sources, completeness and methodology', 'Reporting period, data completeness, definitions, the validation log and the dashboard’s own notes on data issues.') +
        jump('sources', [['so-report', 'Report details'], ['so-labels', 'How to read'], ['so-complete', 'Completeness'], ['so-limits', 'Limitations'], ['so-validation', 'Validation log'], ['so-notes', 'Dashboard notes'], ['so-list', 'Sources and abbreviations'], ['so-security', 'Access and security']]) +
        section('so-report', 'Report details and reporting period', 'book', info) +
        section('so-labels', 'How to read this dashboard', 'info', labels + '<div class="legend" style="margin-top:14px">' + D.codeLegend.map(function (c) { return '<span class="legend-item">' + codeChip(c.code) + ' ' + esc(c.label) + '</span>'; }).join('') + '</div>') +
        section('so-complete', 'Data completeness', 'chart', '<div class="grid g-2">' + card('Service questions answered, by hospital', 'Of 74 questions; partial returns in amber', comp + source('Report Table A.1 and Appendix C.')) +
          '<div>' + card('Return status', null, '<div class="kpis" style="grid-template-columns:repeat(3,1fr)"><div class="kpi"><div class="kpi-value">26</div><div class="kpi-label">Returned</div></div><div class="kpi amber"><div class="kpi-value">2</div><div class="kpi-label">Partial</div><div class="kpi-detail">Selangor, Kuala Selangor</div></div><div class="kpi neutral"><div class="kpi-value">1</div><div class="kpi-label">Not returned</div><div class="kpi-detail">Kuching</div></div></div><p class="chart-note">Doctor lists: all verified except one entry at KPJ Selangor (7 of 8 verified).</p>') +
          card('Counting rules', null, ul(src.counting)) + '</div></div>' +
          '<div style="margin-top:16px">' + cross + '<p class="chart-note">' + esc(src.crossCheckNote) + '</p></div>' +
          details('Roster decisions (Table C.3)', staticTable(['Doctor (hospital)', 'Workbook', 'Online, 15 Oct 2026', 'Decision in this report'], src.roster, { caption: 'Rule: hospital-confirmed return first; otherwise KPJ’s current online listing', wrap: true }))) +
        section('so-limits', 'Limitations and caveats', 'alert', '<div class="grid g-2">' + src.limitations.map(function (l) { return card(l.title, null, p(l.text)); }).join('') + '</div>') +
        section('so-validation', 'Outstanding information and validation log (Table C.1)', 'alert', val) +
        section('so-notes', 'Dashboard notes on data issues', 'info', callout('note', 'Not part of the report', '<p>These observations were made while transcribing the report into this dashboard. They do not change any report figure.</p>') + '<div class="grid g-2" style="margin-top:14px">' + src.dashboardNotes.map(function (n) { return card(n.title, null, tag('note') + '<p style="margin-top:8px">' + esc(n.text) + '</p>'); }).join('') + '</div><p class="chart-note">' + esc(src.reconciliation) + '</p>') +
        section('so-list', 'Sources and abbreviations', 'book', details('Sources (Appendix E)', '<ol class="bullets" style="padding-left:1.4em">' + src.list.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>') + details('Abbreviations (Appendix D)', staticTable(['Abbreviation', 'Meaning'], src.abbreviations, { caption: 'Abbreviations' }))) +
        section('so-security', 'Access and security', 'shield', card(null, null, '<p>This dashboard is published as an encrypted static site. Its content is encrypted with AES-256-GCM using a key derived from the shared password (PBKDF2-SHA-256), and is decrypted only in your browser after the correct password is entered. The password is not stored; the page locks after 30 minutes of inactivity, on “Lock”, or when the tab is closed or reloaded.</p><p style="margin:0">Limitations: this is shared-password protection, not individual sign-in. Anyone with the password can open it, access cannot be revoked per person, there is no audit log, and the encrypted file can be copied and attacked offline — so the password must be strong and changed if it may have been shared beyond its audience.</p>'));
    },
    valTable: function (q) {
      q = (q || '').toLowerCase().trim();
      var rows = D.sources.validation.filter(function (v) { return !q || (v.item + ' ' + v.for + ' ' + v.owner).toLowerCase().indexOf(q) > -1; });
      var c = $('#val-count'); if (c) c.innerHTML = '<span class="result-count">Showing ' + rows.length + ' of ' + D.sources.validation.length + ' items</span>';
      if (!rows.length) return '<div class="empty" role="status">' + icon('search') + '<div class="empty-title">No validation items match “' + esc(q) + '”</div><div>Clear the search to see all 20 items.</div></div>';
      return staticTable(['#', 'Item', 'Needed for', 'Suggested owner'], rows.map(function (v) { return [String(v.n), v.item, v.for, v.owner]; }), { caption: 'Items requiring validation', wrap: true });
    }
  };

  // ------------------------------------------------------------------ hospital dialog
  var lastFocus = null;
  function openHospital(id, trigger) {
    var h = D.hospitals.filter(function (x) { return x.id === id; })[0];
    if (!h) return;
    var dlg = $('#hosp-dlg');
    var svc = function (cols, vals, fn) {
      if (!vals) return '<p class="muted">' + (h.ret === 'none' ? 'Service return not received — no service data.' : 'Partial return (' + h.qs + ' of 74 questions) — not in the service tables.') + '</p>';
      return '<div class="svc-grid">' + cols.map(function (c, i) { var v = vals[i]; return '<div class="svc-item"><span>' + esc(c.label) + '</span>' + (c.kind === 'num' ? numCell(v) : c.kind === 'level' ? levelChip(v) : codeChip(v)) + '</div>'; }).join('') + '</div>';
    };
    var notes = h.notes.map(function (n) { var isVal = /^To (validate|clarify)/.test(n); return '<li>' + (isVal ? tag('validate') + ' ' : '') + esc(n.replace(/^To (validate|clarify):\s*/, '')) + '</li>'; }).join('');
    $('#dlg-title').textContent = h.name;
    $('#dlg-sub').innerHTML = esc(h.region) + ' region' + (h.hub ? ' · <span class="hub-badge">' + esc(h.hub) + ' (provisional)</span>' : '');
    $('#dlg-body').innerHTML =
      '<div class="kpis" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">' +
      '<div class="kpi"><div class="kpi-value">' + h.paeds[0] + '</div><div class="kpi-label">Paediatrician appointments</div><div class="kpi-detail">Resident ' + h.paeds[1] + ' · Sessional ' + h.paeds[2] + ' · Visiting ' + h.paeds[3] + '</div></div>' +
      '<div class="kpi"><div class="kpi-value">' + h.surgeons + '</div><div class="kpi-label">Paediatric surgeons</div></div>' +
      '<div class="kpi teal"><div class="kpi-value" style="font-size:22px">' + esc(a2(h, 'neoLevel') == null ? 'n/a' : (a2(h, 'neoLevel') === 'Y‡' ? 'Unstated' : a2(h, 'neoLevel'))) + '</div><div class="kpi-label">Neonatal level</div>' + (h.gestation ? '<div class="kpi-detail">Keeps babies from ' + esc(h.gestation) + '</div>' : '') + '</div>' +
      '<div class="kpi neutral"><div class="kpi-value" style="font-size:22px">' + (h.qs == null ? '—' : h.qs + '/74') + '</div><div class="kpi-label">Service questions answered</div><div class="kpi-detail">' + (h.ret === 'full' ? 'Returned' : h.ret === 'partial' ? 'Partial return' : 'Not returned') + '</div></div>' +
      (h.admissions ? '<div class="kpi neutral"><div class="kpi-value" style="font-size:22px">' + esc(h.admissions) + '</div><div class="kpi-label">Paediatric admissions last year</div></div>' : '') +
      '</div>' +
      '<div><h3 class="card-title" style="margin-bottom:6px">Subspecialties listed</h3><p>' + esc(h.subspecialties) + '</p><p class="small muted" style="margin:0">Doctor list: ' + esc(h.doctorList) + ' · Online cross-check: ' + h.online[1] + ' of ' + h.online[0] + ' appointments confirmed online, ' + h.online[2] + ' not found, ' + h.online[3] + ' online but not in the return.</p></div>' +
      '<div><h3 class="card-title" style="margin-bottom:6px">Report notes for this hospital</h3><ul class="bullets">' + notes + '</ul></div>' +
      '<div><h3 class="card-title" style="margin-bottom:8px">Inpatient, neonatal, critical care and surgery (Table A.2)</h3>' + svc(D.a2Cols, h.a2) + '</div>' +
      '<div><h3 class="card-title" style="margin-bottom:8px">Subspecialty, development and safeguarding (Table A.3)</h3>' + svc(D.a3Cols, h.a3) + '</div>' +
      '<p class="small muted" style="margin:0">Service answers are as reported by the hospital and have not been inspected. “–” means the question was left blank, which is not the same as “No”.</p>';
    lastFocus = trigger || document.activeElement;
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    $('#dlg-close').focus();
  }
  function closeHospital() {
    var dlg = $('#hosp-dlg');
    if (dlg.open) { if (typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open'); }
  }

  // ------------------------------------------------------------------ routing & rendering
  function parseHash() {
    var h = (location.hash || '').replace(/^#\/?/, '');
    var parts = h.split('/');
    var view = VIEW_MAP[parts[0]] ? parts[0] : 'overview';
    return { view: view, anchor: parts[1] || null };
  }
  function render() {
    var r = parseHash();
    var changed = r.view !== currentView;
    currentView = r.view;
    var v = VIEW_MAP[r.view];
    var main = $('#main-inner');
    main.innerHTML = v.render() + footer();
    updateActiveFilters();
    $$('.nav a').forEach(function (a) { if (a.getAttribute('data-view') === r.view) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    var label = VIEWS.filter(function (x) { return x.id === r.view; })[0].label;
    document.title = label + ' · ' + D.meta.title;
    closeMenu();
    if (r.anchor) {
      var el = document.getElementById(r.anchor);
      if (el) { el.scrollIntoView(); var hd = el.querySelector('h2, h3'); if (hd) { hd.setAttribute('tabindex', '-1'); hd.focus({ preventScroll: true }); } }
    } else if (changed) {
      window.scrollTo(0, 0);
      var t = $('#page-title'); if (t) t.focus({ preventScroll: true });
    }
  }
  function refresh() {
    var v = VIEW_MAP[currentView];
    var vb = $('#vb');
    if (vb && v.body) vb.innerHTML = v.body();
    updateActiveFilters();
  }
  function footer() {
    return '<footer class="foot"><span>' + esc(D.meta.reportTitle) + ' · ' + esc(D.meta.reportingShort) + ' · Prepared ' + esc(D.meta.preparationDate) + '</span><span>Restricted — KPJ Healthcare internal use. Draft for validation.</span></footer>';
  }

  // ------------------------------------------------------------------ menu, tooltip, idle lock
  function openMenu() { $('#sidebar').classList.add('open'); $('#scrim').hidden = false; $('#menu-btn').setAttribute('aria-expanded', 'true'); var a = $('.nav a[aria-current="page"]') || $('.nav a'); if (a) a.focus(); }
  function closeMenu() { var sb = $('#sidebar'); if (!sb) return; var wasOpen = sb.classList.contains('open'); sb.classList.remove('open'); $('#scrim').hidden = true; $('#menu-btn').setAttribute('aria-expanded', 'false'); return wasOpen; }

  var tipEl;
  function showTip(target, x, y) {
    var text = target.getAttribute('data-tip');
    if (!text) return;
    tipEl.textContent = text;
    tipEl.classList.add('show');
    var r = tipEl.getBoundingClientRect();
    var px = x, py = y;
    if (px == null) { var b = target.getBoundingClientRect(); px = b.left + b.width / 2; py = b.top; }
    var left = Math.min(window.innerWidth - r.width - 8, Math.max(8, px - r.width / 2));
    var top = py - r.height - 12; if (top < 8) top = py + 18;
    tipEl.style.left = left + 'px'; tipEl.style.top = top + 'px';
  }
  function hideTip() { if (tipEl) tipEl.classList.remove('show'); }

  function resetIdle() {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(function () { lock('idle'); }, IDLE_MS);
  }
  function lock(reason) {
    if (OPTS.onLock) OPTS.onLock(reason);
  }

  function bind() {
    document.addEventListener('click', function (e) {
      var t = e.target.closest('[data-act],[data-hosp],[data-sort],[data-f="region"]');
      if (!t) return;
      if (t.hasAttribute('data-hosp')) { openHospital(t.getAttribute('data-hosp'), t); return; }
      if (t.hasAttribute('data-sort')) {
        var id = t.getAttribute('data-sort'), key = t.getAttribute('data-key');
        var st = S.sorts[id];
        // first click: numbers sort high-to-low, text A–Z; next click reverses
        var isNum = !!t.closest('th') && /\bnum\b/.test(t.closest('th').className);
        S.sorts[id] = (st && st.key === key) ? { key: key, dir: st.dir === 'asc' ? 'desc' : 'asc' } : { key: key, dir: isNum ? 'desc' : 'asc' };
        rerenderTable(id);
        var nb = $('[data-sort="' + id + '"][data-key="' + key + '"]'); if (nb) nb.focus();
        return;
      }
      if (t.getAttribute('data-f') === 'region') {
        var r = t.getAttribute('data-v'), i = S.regions.indexOf(r);
        if (i > -1) S.regions.splice(i, 1); else S.regions.push(r);
        refresh(); return;
      }
      var act = t.getAttribute('data-act');
      if (act === 'reset') { resetFilters(); var f = $('.filters .chip') || $('#page-title'); if (f) f.focus(); }
      else if (act === 'clear') {
        var k = t.getAttribute('data-k');
        if (k === 'region') S.regions = S.regions.filter(function (x) { return x !== t.getAttribute('data-v'); });
        if (k === 'q') S.q = '';
        if (k === 'level') S.level = 'all';
        if (k === 'ret') S.ret = 'all';
        refresh(); var rb = $('#btn-reset'); if (rb) rb.focus();
      }
      else if (act === 'domain') { S.domain = t.getAttribute('data-v'); $('#avail').innerHTML = VIEW_MAP.services.avail(); $$('[data-act="domain"]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-v') === S.domain)); }); }
      else if (act === 'mtab') { S.matrixTab = t.getAttribute('data-v'); refresh(); var mb = $('[data-act="mtab"][data-v="' + S.matrixTab + '"]'); if (mb) mb.focus(); }
      else if (act === 'tile') { S.tileMetric = t.getAttribute('data-v'); refresh(); var tb = $('[data-act="tile"][data-v="' + S.tileMetric + '"]'); if (tb) tb.focus(); }
      else if (act === 'lock') { lock('user'); }
      else if (act === 'menu') { if ($('#sidebar').classList.contains('open')) closeMenu(); else openMenu(); }
      else if (act === 'dlg-close') { closeHospital(); }
    });
    var qTimer;
    document.addEventListener('input', function (e) {
      if (e.target.id === 'f-q') { clearTimeout(qTimer); var v = e.target.value; qTimer = setTimeout(function () { S.q = v; refresh(); }, 160); }
      if (e.target.id === 'val-q') { $('#val-body').innerHTML = VIEW_MAP.sources.valTable(e.target.value); }
    });
    document.addEventListener('change', function (e) {
      if (e.target.id === 'f-level') { S.level = e.target.value; refresh(); }
      if (e.target.id === 'f-ret') { S.ret = e.target.value; refresh(); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { hideTip(); if (closeMenu()) $('#menu-btn').focus(); }
    });
    $('#scrim').addEventListener('click', closeMenu);
    $('#hosp-dlg').addEventListener('close', function () { if (lastFocus && lastFocus.focus) lastFocus.focus(); });
    $('#hosp-dlg').addEventListener('click', function (e) { if (e.target === e.currentTarget) closeHospital(); });
    window.addEventListener('hashchange', render);
    // tooltips
    tipEl = $('#tip');
    document.addEventListener('mouseover', function (e) { var t = e.target.closest('[data-tip]'); if (t) showTip(t, e.clientX, e.clientY); });
    document.addEventListener('mousemove', function (e) { var t = e.target.closest('[data-tip]'); if (t && tipEl.classList.contains('show')) showTip(t, e.clientX, e.clientY); });
    document.addEventListener('mouseout', function (e) { var t = e.target.closest('[data-tip]'); if (t && !t.contains(e.relatedTarget)) hideTip(); });
    document.addEventListener('focusin', function (e) { var t = e.target.closest && e.target.closest('[data-tip]'); if (t) showTip(t); else hideTip(); });
    document.addEventListener('focusout', hideTip);
    window.addEventListener('scroll', function () { var a = document.activeElement; if (a && a.getAttribute && a.getAttribute('data-tip')) showTip(a); else hideTip(); }, { passive: true });
    ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(function (ev) { document.addEventListener(ev, resetIdle, { passive: true }); });
  }

  function buildNav() {
    $('#nav').innerHTML = VIEWS.map(function (v) { return '<li><a href="#/' + v.id + '" data-view="' + v.id + '">' + icon(v.icon) + '<span>' + esc(v.label) + '</span></a></li>'; }).join('');
    $('#brand-sub').textContent = D.meta.reportingShort + ' · Directory as at 27 July 2026';
    $('#sidebar-foot').innerHTML = '<strong>' + esc(D.meta.reportTitle) + '</strong><br>' + esc(D.meta.reportingShort) + '. Draft for validation — figures marked “to validate” need confirmation before circulation.';
  }

  window.KPJDashboard = {
    start: function (data, opts) {
      D = data; OPTS = opts || {};
      D.codeLegend.forEach(function (c) { CODE_LABEL[c.code] = c.label; });
      buildNav();
      bind();
      render();
      resetIdle();
    }
  };
})();
