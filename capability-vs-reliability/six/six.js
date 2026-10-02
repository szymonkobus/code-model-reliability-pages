/* /capability-vs-reliability/six/ — Math and Other: the six sets at once, one panel per set (1 Oct 2026, on the project maintainers' word of 12:1x UK that
 * without D50 and D99 on these benchmarks across the released models the training result cannot be read, "a simple plot would suffice").
 * Each panel is the crossings page's plane for one set: D99 (vertical) against D50 (horizontal), on the set's OWN difficulty
 * axis (its own logit scale over its own tasks — six sets never share one plane), equal axes, the y = x line, the models as points in the main page's
 * family colours, a crossing beyond the easiest or hardest task an open bound mark at the edge, the quiet count per panel; no words on the figure.
 * Chips as on the main view: the union of the six sets' models, grouped by family (base models in the bulk, a fine-tune or a run after its base),
 * one chip toggles the model in every panel; partial models (fewer answers a task than the set's standard) hidden at the open, shown by the control.
 * Data: the crossings page's own served files (../data/manifest.json → each set's shared and bayes files); the definition switch reads the
 * average-rate chain (the definition of record) or the median-task chain. Fail closed: a set without a served fit prints its name and one line. */
(function () {
  'use strict';
  var MOUNT = './';
  var SETS = [{ id: 'math500', label: 'MATH-500', group: 'Math' }, { id: 'aime', label: 'AIME', group: 'Math' }, { id: 'gsm8k_platinum', label: 'GSM8K-Platinum', group: 'Math' },
              { id: 'ifeval', label: 'IFEval', group: 'Other' }, { id: 'cruxeval_i', label: 'CRUXEval input', group: 'Other' }, { id: 'cruxeval_o', label: 'CRUXEval output', group: 'Other' }];
  var DEFAULTS = [{ id: 'board_top', label: 'wave 1+2' }, { id: 'board', label: 'wave 1' }, { id: 'top', label: 'wave 2' }, { id: 'new', label: 'wave 2 + parked' }, { id: 'all', label: 'wave 1+2 + parked' }];
  var TICKS = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 80, 90, 95, 98, 99, 99.5];
  var state = { def: 'average', partial: 'hide' };
  var D = { sets: [], configs: [], byId: {} }, sel = new Set(), BUILT = null;
  function logit(p) { return Math.log(p / (1 - p)); }
  function pct(z) { return 100 / (1 + Math.exp(-z)); }
  function fmtPct(v) { return (v < 1 ? v.toFixed(1) : v >= 99.5 ? v.toFixed(1) : String(Math.round(v))) + '%'; }
  function plainTs(ts) {   // the main page's stamp words, one text (the UK clock, bare; the month from the fixed table)
    var s = String(ts || ''), m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?(Z|[+-]\d{2}:?\d{2})?)?/.exec(s), MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (!m) return s;
    if (!m[4]) return (+m[3]) + ' ' + MON[+m[2] - 1];
    var d = new Date(m[1] + '-' + m[2] + '-' + m[3] + 'T' + m[4] + ':' + m[5] + ':' + (m[6] || '00') + (m[7] || 'Z'));   // stamps without a zone are UTC (the files keep UTC)
    if (!isFinite(d)) return (+m[3]) + ' ' + MON[+m[2] - 1] + ' ' + m[4] + ':' + m[5];
    var g = {}; new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(d).forEach(function (x) { g[x.type] = x.value; });
    return (+g.day) + ' ' + MON[+g.month - 1] + ' ' + g.hour + ':' + g.minute;   // the clock is UK, written bare (the project maintainers' word of 24 Sep 14:2x)   // the month word from the fixed table (project form, the reference designer 18 Sep: "Sep", never the formatter's "Sept")
  }
  function el(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }

  // ---------- data ----------
  fetch(MOUNT + 'data/manifest.json', { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('manifest ' + r.status); return r.json(); }).then(function (man) {
    var ds = man.datasets || {};
    D.stamp = null;
    return Promise.all(SETS.map(function (s) {
      var e = ds[s.id]; if (!e || !e.files || !e.files.shared) return { set: s, held: 'this set is not served yet' };
      var files = e.files;
      return Promise.all([fetch(MOUNT + 'data/' + files.shared).then(function (r) { return r.json(); }), files.bayes ? fetch(MOUNT + 'data/' + files.bayes).then(function (r) { return r.json(); }) : Promise.resolve(null)])
        .then(function (pair) { return { set: s, shared: pair[0], bay: pair[1], updated: e.updated_at, held: pair[1] ? null : 'no fit is served for this set yet' }; })
        .catch(function (err) { return { set: s, held: 'the set’s files did not load (' + String(err && err.message || err).slice(0, 60) + ')' }; });
    }));
  }).then(function (loaded) {
    D.sets = loaded;
    loaded.forEach(function (L) {
      if (!L.shared) return;
      var withdrawn = {}; (L.shared.withdrawn || []).forEach(function (id) { withdrawn[id] = 1; }); Object.keys(L.shared.fit_excluded || {}).forEach(function (id) { withdrawn[id] = 1; });
      L.configs = (L.shared.configs || []).filter(function (c) { return !withdrawn[c.id]; });
      L.rowById = {}; ((L.bay && L.bay.rows) || []).forEach(function (r) { L.rowById[r.cfg] = r; });
      L.configs.forEach(function (c) {
        if (!D.byId[c.id]) { var u = { id: c.id, label: c.display_name || c.label, fam: c.fam || 'other', color: c.color || '#555', sets: 0, partialIn: 0 }; D.byId[c.id] = u; D.configs.push(u); }
        var u2 = D.byId[c.id]; u2.sets++; if (c.partial_fit || (c.coverage && c.coverage.of && c.coverage.tasks / c.coverage.of < 0.9)) u2.partialIn++;
      });
      if (L.updated && (!D.stamp || L.updated > D.stamp)) D.stamp = L.updated;
    });
    // a model partial on every set it appears in is a partial model here (hidden at the open); partial on some sets only draws grey there
    D.configs.forEach(function (u) { u.partialAll = u.partialIn > 0 && u.partialIn === u.sets; });
    state.partial = Kit.state.get('partial', 'hide') === 'show' ? 'show' : 'hide';
    state.def = Kit.state.get('def', 'average') === 'median' ? 'median' : 'average';
    D.configs.forEach(function (u, i) { if (!(u.partialAll && state.partial === 'hide')) sel.add(i); });
    readSel();
    controls(); chips(); render(); stamp();
  }).catch(function (err) {
    var h = el('headline'); if (h) h.textContent = 'the six-panel view could not load its data (' + String(err && err.message || err).slice(0, 80) + ') — the single-set view at /capability-vs-reliability/ stands';
    var held = el('heldline'); if (held) { held.hidden = false; held.textContent = 'held: the data did not load; the page maintainers’s loop writes it'; }
  });

  // ---------- selection in the link (ids, the main page's form) ----------
  function readSel() {
    var s = Kit.state.get('sel', null); if (!s) return;
    if (s === 'none') { sel.clear(); return; }
    var want = {}; s.split(',').forEach(function (k) { if (k) want[k] = 1; });
    var any = false; D.configs.forEach(function (u, i) { if (want[u.id]) any = true; });
    if (!any) return;   // a link naming no model of these sets draws the default selection, and nothing says so (the project maintainers, 1 Oct)
    sel.clear(); D.configs.forEach(function (u, i) { if (want[u.id] && !(u.partialAll && state.partial === 'hide')) sel.add(i); });
  }
  function writeSel() {
    var all = D.configs.every(function (u, i) { return sel.has(i) || (u.partialAll && state.partial === 'hide'); });
    Kit.state.set('sel', all ? null : (sel.size ? Array.from(sel).map(function (i) { return D.configs[i].id; }).join(',') : 'none'), null);
  }

  // ---------- controls ----------
  function controls() {
    var row = el('controls');
    // the way to a single set is a row of LINKS (a control that navigates cannot be read by the reference check mid-run); the single-set page's Dataset switch leads back here
    var nav = el('setlinks'); if (nav) { nav.innerHTML = '<span class="navlabel">Single-set view:</span> ' + DEFAULTS.concat(SETS).map(function (s) { return '<a href="' + MOUNT + '?data=' + encodeURIComponent(s.id) + '">' + esc(s.label) + '</a>'; }).join(' \u00b7 '); }
    Kit.switchControl({ mount: row, key: 'def', label: 'Definition', dflt: 'average', options: [{ value: 'average', label: 'Average rate' }, { value: 'median', label: 'Median task' }],
      onchange: function (v) { state.def = v === 'median' ? 'median' : 'average'; Kit.state.set('def', state.def, 'average'); render(); } });
    var anyPartial = D.configs.some(function (u) { return u.partialIn > 0; });
    var psw = Kit.switchControl({ mount: el('armsbar'), key: 'partial', label: 'Partial models', dflt: 'hide', options: [{ value: 'hide', label: 'hidden' }, { value: 'show', label: 'show partial models' }],
      onchange: function (v) { var was = state.partial; state.partial = v === 'show' ? 'show' : 'hide'; Kit.state.set('partial', state.partial, 'hide');
        if (was !== state.partial) { D.configs.forEach(function (u, i) { if (u.partialAll) { if (state.partial === 'show') sel.add(i); else sel.delete(i); } }); writeSel(); chips(); render(); } } });
    if (!anyPartial) { var p = document.querySelector('.kit-switch[data-key="partial"]'); if (p) p.style.display = 'none'; }
    if (window.Kit && Kit.exportButton) Kit.exportButton(el('exportrow'), exportOptions);
  }

  // ---------- chips: the main page's rule — by family, base models in the bulk, a fine-tune or run after its base (the bundles' order) ----------
  function famOrder() {
    var fams = [], seen = {};
    D.configs.forEach(function (u, i) { if (!seen[u.fam]) { seen[u.fam] = { name: u.fam, members: [] }; fams.push(seen[u.fam]); } seen[u.fam].members.push(i); });
    if (window.Kit && Kit.sortByLadder) { try { fams.forEach(function (f) { f.members = Kit.sortByLadder(f.members, function (i) { return D.configs[i].label; }); }); return Kit.sortByLadder(fams, function (f) { return f.name; }); } catch (e) { return fams; } }
    return fams;
  }
  function hidden(i) { var u = D.configs[i]; return u.partialAll && state.partial === 'hide'; }
  function chips() {
    var box = el('chips'); box.innerHTML = '';
    var all = document.createElement('button'); all.className = 'util'; all.textContent = 'all'; all.onclick = function () { D.configs.forEach(function (u, i) { if (!hidden(i)) sel.add(i); }); writeSel(); chips(); render(); };
    var none = document.createElement('button'); none.className = 'util'; none.textContent = 'none'; none.onclick = function () { sel.clear(); writeSel(); chips(); render(); };
    box.appendChild(all); box.appendChild(none);
    famOrder().forEach(function (f) {
      var g = document.createElement('div'); g.className = 'famgroup';
      var hb = document.createElement('button'); hb.className = 'fam'; hb.textContent = f.name; hb.title = 'all or none of ' + f.name;
      hb.onclick = function () { var anyOff = f.members.some(function (i) { return !hidden(i) && !sel.has(i); }); f.members.forEach(function (i) { if (anyOff) { if (!hidden(i)) sel.add(i); } else sel.delete(i); }); writeSel(); chips(); render(); };
      g.appendChild(hb);
      f.members.forEach(function (i) {
        var u = D.configs[i], b = document.createElement('button'); b.className = 'chip' + (sel.has(i) ? ' on' : '') + (hidden(i) ? ' partial-hidden' : ''); b.dataset.id = u.id;
        b.innerHTML = '<span class="sw" style="background:' + esc(u.color) + '"></span>' + esc(u.label);
        b.title = u.label + (u.sets < D.sets.length ? ' — on ' + u.sets + ' of the six sets' : '') + (u.partialAll ? ' — partial: fewer answers a task than the set’s standard' : u.partialIn ? ' — partial on ' + u.partialIn + ' of its sets (grey there)' : '');
        if (hidden(i)) { b.disabled = true; } else b.onclick = function () { if (sel.has(i)) sel.delete(i); else sel.add(i); writeSel(); chips(); render(); };
        g.appendChild(b);
      });
      box.appendChild(g);
    });
  }

  // ---------- the figure ----------
  var W = 960, H = 640, COLS = 3, ROWS = 2, PADL = 44, PADT = 30, PADR = 14, PADB = 36, FS = 1;
  function shape() { var narrow = window.innerWidth < 700; if (narrow) { COLS = 1; ROWS = 6; W = 480; H = 6 * 420; PADL = 60; PADT = 40; PADR = 20; PADB = 50; FS = 1.7; } else { COLS = 3; ROWS = 2; W = 960; H = 640; PADL = 44; PADT = 30; PADR = 14; PADB = 36; FS = 1; } }
  var resizeT = null; window.addEventListener('resize', function () { clearTimeout(resizeT); resizeT = setTimeout(function () { if (D.sets.length) render(); }, 150); });
  function reading(row, lev, L) {   // {z, kind} at a level from the row's table on the chain of the definition: a censored level is a bound at the table's edge
    var lt = state.def === 'median' ? row.levels : row.levels_avg; if (!lt || !L.bay) return null;
    var LV = L.bay.lev_fail || []; var j = -1; for (var k = 0; k < LV.length; k++) if (Math.abs(LV[k] - lev) < 1e-9) j = k;
    if (j < 0) return null;
    var kind = lt.kind[j], z = lt.mid[j];
    if (kind === -1) return { z: lt.zg ? lt.zg[0] : null, kind: 'lo' };
    if (kind === 1) return { z: lt.zg ? lt.zg[1] : null, kind: 'hi' };
    return z == null ? null : { z: z, kind: 'point' };
  }
  function render() {
    shape(); var svg = el('chart'); svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    var pw = W / COLS, ph = H / ROWS, out = '', total = 0, legend = [];
    D.sets.forEach(function (L, k) {
      var cx = (k % COLS) * pw, cy = Math.floor(k / COLS) * ph, x0 = cx + PADL, y0 = cy + PADT, w = pw - PADL - PADR, h = ph - PADT - PADB, side = Math.min(w, h);
      x0 += (w - side) / 2; var y1 = y0 + side;
      out += '<text x="' + (cx + pw / 2) + '" y="' + (cy + 18) + '" text-anchor="middle" font-size="' + (13 * FS) + '" font-weight="600" fill="#222">' + esc(L.set.label) + '</text>';
      if (!L.shared || L.held) { out += '<text x="' + (cx + pw / 2) + '" y="' + (cy + ph / 2) + '" text-anchor="middle" font-size="' + (12 * FS) + '" fill="#52514e">' + esc(L.held || 'not served yet') + '</text>'; return; }
      var lim = L.shared.limits || L.shared.reachable && { lo: L.shared.reachable.floor_z, hi: L.shared.reachable.top_z }; if (!lim) { out += '<text x="' + (cx + pw / 2) + '" y="' + (cy + ph / 2) + '" text-anchor="middle" font-size="' + (12 * FS) + '" fill="#52514e">no axis limits in the set’s file</text>'; return; }
      // 2 Oct 2026 (the project maintainers' word of 11:2x UK: "make sure the axis tics make sense" — AIME's frame ran far below and left of its points): the axes crop to the
      // points drawn in the panel, one common range for both axes (equal scales, the y = x diagonal corner to corner as on the main page), padded 6%; a bound sits at the
      // frame's edge; the set's own limits stand only when no point is drawn
      var zs = [];
      L.configs.forEach(function (c) { var i = D.configs.indexOf(D.byId[c.id]); if (i < 0 || !sel.has(i)) return; var row = L.rowById[c.id]; if (!row) return;
        var rx = reading(row, 0.5, L), ry = reading(row, 0.01, L); if (!rx || !ry || rx.z == null || ry.z == null) return;
        var partial = !!(c.partial_fit || (c.coverage && c.coverage.of && c.coverage.tasks / c.coverage.of < 0.9)); if (partial && state.partial === 'hide') return;
        if (rx.kind === 'point') zs.push(rx.z); if (ry.kind === 'point') zs.push(ry.z); });
      var lo = lim.lo, hi = lim.hi;
      if (zs.length) { var zlo = Math.min.apply(null, zs), zhi = Math.max.apply(null, zs), span = Math.max(zhi - zlo, 1), pad = span * 0.06; lo = zlo - pad; hi = zhi + pad; if (zhi - zlo < 1) { var mid = (zlo + zhi) / 2; lo = mid - 0.5 - pad; hi = mid + 0.5 + pad; } }
      var sx = function (z) { return x0 + (z - lo) / (hi - lo) * side; }, sy = function (z) { return y1 - (z - lo) / (hi - lo) * side; };
      out += '<rect x="' + x0 + '" y="' + y0 + '" width="' + side + '" height="' + side + '" fill="none" stroke="#bbb"/>';
      TICKS.forEach(function (v) { var z = logit(v / 100); if (z <= lo || z >= hi) return; var X = sx(z), Y = sy(z);
        out += '<line x1="' + X + '" y1="' + y1 + '" x2="' + X + '" y2="' + (y1 + 4) + '" stroke="#888"/><text x="' + X + '" y="' + (y1 + 15) + '" text-anchor="middle" font-size="' + (9 * FS) + '" fill="#555">' + fmtPct(v) + '</text>';
        out += '<line x1="' + (x0 - 4) + '" y1="' + Y + '" x2="' + x0 + '" y2="' + Y + '" stroke="#888"/><text x="' + (x0 - 6) + '" y="' + (Y + 3) + '" text-anchor="end" font-size="' + (9 * FS) + '" fill="#555">' + fmtPct(v) + '</text>'; });
      out += '<line x1="' + x0 + '" y1="' + y1 + '" x2="' + (x0 + side) + '" y2="' + y0 + '" stroke="#999" stroke-dasharray="4 3" data-guide="y=x"/>';
      out += '<text x="' + (x0 + side / 2) + '" y="' + (y1 + 29) + '" text-anchor="middle" font-size="' + (10 * FS) + '" fill="#444">D50</text>';
      out += '<text transform="translate(' + (cx + 11) + ',' + (y0 + side / 2) + ') rotate(-90)" text-anchor="middle" font-size="' + (10 * FS) + '" fill="#444">D99</text>';
      var n = 0;
      L.configs.forEach(function (c) {
        var i = D.configs.indexOf(D.byId[c.id]); if (i < 0 || !sel.has(i)) return;
        var row = L.rowById[c.id]; if (!row) return;
        var rx = reading(row, 0.5, L), ry = reading(row, 0.01, L); if (!rx || !ry || rx.z == null || ry.z == null) return;
        var partial = !!(c.partial_fit || (c.coverage && c.coverage.of && c.coverage.tasks / c.coverage.of < 0.9)), col = partial ? '#8b8477' : (c.color || D.byId[c.id].color);
        if (partial && state.partial === 'hide') return;
        var X = sx(Math.min(hi, Math.max(lo, rx.z))), Y = sy(Math.min(hi, Math.max(lo, ry.z)));
        var title = esc(D.byId[c.id].label) + ' — D50 ' + (rx.kind === 'point' ? rx.z.toFixed(2) : (rx.kind === 'hi' ? '≥ ' : '≤ ') + rx.z.toFixed(2)) + ', D99 ' + (ry.kind === 'point' ? ry.z.toFixed(2) : (ry.kind === 'hi' ? '≥ ' : '≤ ') + ry.z.toFixed(2)) + (partial ? ' (partial)' : '');
        var mark;
        if (ry.kind === 'hi') mark = '<path d="M' + X + ',' + (Y - 5) + ' l5,9 l-10,0 z" fill="none" stroke="' + col + '" stroke-width="1.6"/>';
        else if (ry.kind === 'lo') mark = '<path d="M' + X + ',' + (Y + 5) + ' l5,-9 l-10,0 z" fill="none" stroke="' + col + '" stroke-width="1.6"/>';
        else if (rx.kind === 'hi') mark = '<path d="M' + (X + 5) + ',' + Y + ' l-9,5 l0,-10 z" fill="none" stroke="' + col + '" stroke-width="1.6"/>';
        else if (rx.kind === 'lo') mark = '<path d="M' + (X - 5) + ',' + Y + ' l9,5 l0,-10 z" fill="none" stroke="' + col + '" stroke-width="1.6"/>';
        else mark = '<circle cx="' + X + '" cy="' + Y + '" r="3.6" fill="' + col + '" fill-opacity="0.85" stroke="#fff" stroke-width="0.8"/>';
        out += '<g data-mark data-arm="' + esc(c.id) + '" data-set="' + esc(L.set.id) + '" data-tip="' + title + '">' + mark + '</g>'; n++;
        if (!legend.some(function (r) { return r.id === c.id; })) legend.push({ id: c.id, label: D.byId[c.id].label, color: col, family: D.byId[c.id].fam });
      });
      out += '<text x="' + (x0 + side - 4) + '" y="' + (y0 + 12) + '" text-anchor="end" font-size="' + (10 * FS) + '" fill="#52514e" data-count>n = ' + n + '</text>';
      total += n;
    });
    svg.innerHTML = out;
    svg.querySelectorAll('[data-mark]').forEach(function (g) { g.addEventListener('mouseenter', function () { var t = el('hovertip'); if (t) t.textContent = g.getAttribute('data-tip') + ' (' + (SETS.filter(function (s) { return s.id === g.getAttribute('data-set'); })[0] || {}).label + ')'; }); g.addEventListener('mouseleave', function () { var t = el('hovertip'); if (t) t.textContent = ''; }); });
    D.legend = legend;
    var hl = el('headline'); if (hl) hl.textContent = 'Six sets, one panel each: D99 against D50 for every model, on each set’s own difficulty axis; ' + total + ' points drawn across the six panels.';
    var nar = el('narrate'); if (nar) nar.textContent = D.configs.filter(function (u, i) { return sel.has(i); }).length + ' of ' + D.configs.length + ' models selected; a point beyond a set’s easiest or hardest task is an open mark at the edge.';
  }
  function exportOptions() {
    return { svg: el('chart'), legend: (D.legend || []).map(function (r) { return { label: r.label, color: r.color, family: r.family }; }), title: '', page: '',
      view: 'Math and Other · six sets, one panel each · D99 against D50 · ' + (state.def === 'median' ? 'median task' : 'average rate') + ' · logit axes',
      stamp: D.stamp ? 'data as of ' + plainTs(D.stamp) : '', fileBase: 'capability-vs-reliability_math-and-other_' + new Date().toISOString().slice(0, 10), crop: null };
  }
  function stamp() { var f = el('stampfold'); if (f && D.stamp) f.textContent = 'data as of ' + plainTs(D.stamp) + ' · the panels rebuild with every landing of a fit or a set, read every minute by the page maintainers’s loop'; }

  // fail closed: the liveness the loops write
  function heldCheck() {
    fetch(MOUNT + 'liveness.txt', { cache: 'no-store' }).then(function (r) { return r.ok ? r.text() : Promise.reject(r.status); }).then(function (t) {
      var age = (Date.now() - Date.parse(t.trim())) / 60000, held = el('heldline'); if (!held) return;
      if (age > 10) { held.hidden = false; held.textContent = 'held: the data stopped refreshing ' + Math.round(age) + ' minutes ago; the page maintainers’s loop writes it'; } else held.hidden = true;
    }).catch(function () { var held = el('heldline'); if (held) { held.hidden = false; held.textContent = 'held: the page cannot read its liveness; the page maintainers’s loop writes it'; } });
  }
  heldCheck(); setInterval(heldCheck, 120000);
})();
