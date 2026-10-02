/* six.js — the side-by-side page of /capability-vs-reliability/: several datasets, one panel each, COMPOSED from the main page's modules (plane.js the plane,
 * chips.js the models' chips, levels.js the level controls, the reference kit the grid, the switches and the export) — the project maintainers' word of 2 Oct 2026
 * 13:0x UK: the same components re-plugged on a new page, the original not edited to fit it. This file loads the sets' files, mounts the page's own choice of
 * datasets above the figure and draws every set through the plane module's renderer; a fix to a module reaches this page and the main page alike. */
'use strict';
var SETS_ORDER = ['board_top', 'board', 'top', 'new', 'all', 'math500', 'aime', 'gsm8k_platinum', 'ifeval', 'cruxeval_i', 'cruxeval_o'];   // the main page's Dataset control order: the default sets, then Math, then Other (the leaf of record)
var DEFAULT_SETS = ['math500', 'aime', 'gsm8k_platinum', 'ifeval', 'cruxeval_i', 'cruxeval_o'];   // the page opens on the Math and Other sets; the default sets are one click away
var GRID = null, UNION = null, SET_KEYS = [], SERVED = [], STAMP = null, heldTick = null, SW = {};
function heldLine(msg) { var h = document.getElementById('heldline'); if (!h) return; if (msg) { h.textContent = msg; h.hidden = false; } else { h.textContent = ''; h.hidden = true; } }
function liveness() {   // the rebuild loop's liveness: a stale loop is said on the face, never silently
  fetch(MOUNT + 'liveness.txt', { cache: 'no-store' }).then(function (r) { return r.ok ? r.text() : ''; }).then(function (t) {
    var m = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/.exec(t || ''); var age = m ? (Date.now() - Date.parse(m[0])) / 60000 : Infinity;
    heldLine(age > 10 ? 'Held: the rebuild loop has not run for ' + (isFinite(age) ? Math.round(age) + ' minutes' : 'a while') + '; the panels show the last build.' : null);
  }).catch(function () { heldLine('Held: the rebuild loop’s liveness is unreadable; the panels show the last build.'); });
}
function render() { syncPresets(); if (GRID) GRID.redraw(); paintChips(); }   // every control, chip and level event redraws every panel (the modules call render())
function defaultKeys() { return DEFAULT_SETS.filter(function (k) { return SERVED.indexOf(k) >= 0; }); }

fetch(MOUNT + 'data/manifest.json').then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
  .catch(function (e) { var why = String(e && e.message || e); heldLine('Held: the data manifest is missing or unreadable (' + (/HTTP \d+/.test(why) ? why : 'not readable as data') + '); nothing is drawn until the rebuild loop writes it.'); return new Promise(function () {}); })
  .then(function (man) {
    D.man = man; var ds = man.datasets || {}; D.allDs = ds; D.defaultData = ds.board_top ? 'board_top' : 'board';
    Object.keys(DATASETS).forEach(function (k) { DATASETS[k].available = !!(ds[k] && ds[k].files); });
    relabel();   // the names of record with their counts: the main page's vocabulary
    SERVED = SETS_ORDER.filter(function (k) { return DATASETS[k] && ds[k] && ds[k].files; });
    var want = String(Kit.state.get('sets', '') || '').split(',').filter(function (k) { return SERVED.indexOf(k) >= 0; });
    SET_KEYS = want.length ? SETS_ORDER.filter(function (k) { return want.indexOf(k) >= 0; }) : defaultKeys();
    if (want.length && SET_KEYS.join(',') === defaultKeys().join(',')) Kit.state.set('sets', null, null);   // the default choice carries no parameter
    buildSetControl();
    return Promise.all(SET_KEYS.map(loadSetCtx));
  }).then(init);

function buildSetControl() {   // the page's own choice of datasets, above the figure and outside the chart's controls (the project maintainers' word of 2 Oct 11:2x UK): the main page's groups — the default sets, then Math, then Other — one chip per set, pressed = shown
  var bar = document.getElementById('setbar'); if (!bar) return; bar.innerHTML = '';
  var groups = [['Default sets', SETS_ORDER.filter(function (k) { return DATASETS[k] && !DATASETS[k].group; })], ['Math', SETS_ORDER.filter(function (k) { return DATASETS[k] && DATASETS[k].group === 'Math'; })], ['Other', SETS_ORDER.filter(function (k) { return DATASETS[k] && DATASETS[k].group === 'Other'; })]];
  groups.forEach(function (g) {
    var wrap = document.createElement('span'); wrap.className = 'chips setgroup';   // the main page's chip styles (crossings.css scopes them under .chips): pressed full, unpressed faint, unavailable faint with its hint
    var lab = document.createElement('span'); lab.className = 'fam'; lab.textContent = g[0]; wrap.appendChild(lab);
    g[1].forEach(function (k) {
      var b = document.createElement('button'); b.className = 'chip setchip'; b.dataset.set = k; var on = SET_KEYS.indexOf(k) >= 0, served = SERVED.indexOf(k) >= 0;
      b.textContent = String(DATASETS[k].label).replace(/\s*\([^)]*\)\s*$/, ''); b.title = served ? (DATASETS[k].hover || '') : (DATASETS[k].label + ': ' + DATASETS[k].reason);
      b.classList.toggle('off', !on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); if (!served) { b.disabled = true; b.setAttribute('aria-disabled', 'true'); }
      b.onclick = function () {
        var keys = SET_KEYS.slice(), i = keys.indexOf(k); if (i >= 0) { if (keys.length === 1) return; keys.splice(i, 1); } else keys.push(k);   // at least one set stays
        keys = SETS_ORDER.filter(function (x) { return keys.indexOf(x) >= 0; });
        Kit.state.set('sets', keys.join(',') === defaultKeys().join(',') ? null : keys.join(','), null); location.reload();
      };
      wrap.appendChild(b);
    });
    bar.appendChild(wrap);
  });
}
function loadSetCtx(key) {   // one dataset's files, prepared as the main page prepares its set (the plane module's prepareSet) and joined into a context the renderer draws; a defect holds the panel, never the page
  var e = D.allDs[key], files = e && e.files; if (!files) return Promise.resolve({ key: key, held: 'not served' });
  return Promise.all(['shared', 'chain_average', 'chain_median', 'bayes', 'bayes_prev'].map(function (k) { return files[k] ? fetch(MOUNT + 'data/' + files[k]).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }) : Promise.resolve(null); })).then(function (all) {
    var X = { man: D.man, allDs: D.allDs, defaultData: D.defaultData, dsId: key, dataId: key, ds: e, golden: false, shared: all[0], avg: all[1], med: all[2], bay: all[3], bayPrev: all[4] || null, runRaw: null, moves: null };
    if (!X.shared || !X.avg) return { key: key, held: 'files missing' };
    try { prepareSet(X, true); } catch (err) { return { key: key, held: 'an older artifact' }; }
    var ctx = { key: key, D: X, RUNS: [], RUN: null, SLUG_OF: {}, IDX_OF_SLUG: {}, sel: new Set() };
    withPanel(ctx, function () {
      mergeRunSet(X.runRaw); ctx.RUNS = RUNS; ctx.RUN = RUN;
      ctx.LIM = X.shared.limits ? [X.shared.limits.lo - 0.15, X.shared.limits.hi + 0.15] : [X.shared.reachable.floor_z - 0.35, X.shared.reachable.top_z + 0.35];
      var zF = logit(AXIS_FLOOR_PCT / 100) - 0.15; if (ctx.LIM[0] > zF) ctx.LIM[0] = zF;
      slugIndex(); ctx.SLUG_OF = SLUG_OF; ctx.IDX_OF_SLUG = IDX_OF_SLUG;
    });
    return ctx;
  }).catch(function () { return { key: key, held: 'files did not load' }; });
}
function buildUnion(ctxs) {   // the chips' set: every model of every panel once, by slug, with its first panel's colour, family and name; a run's checkpoints stay with the single figure
  var live = ctxs.filter(function (c) { return !c.held; }); if (!live.length) return null;
  var seen = {}, configs = [], avgRows = [], medRows = [], bayRows = [], anyMed = live.every(function (c) { return !!c.D.med; });
  live.forEach(function (c) { c.D.shared.configs.forEach(function (cf, i) { if (cf.run) return; var sl = c.SLUG_OF[i] || cf.id; if (seen[sl]) return; seen[sl] = 1; var copy = Object.assign({}, cf); copy.slug = sl; configs.push(copy);
    if (c.D.avgById[cf.id]) avgRows.push(c.D.avgById[cf.id]); if (anyMed && c.D.medById[cf.id]) medRows.push(c.D.medById[cf.id]); if (c.D.bayById[cf.id]) bayRows.push(c.D.bayById[cf.id]); }); });
  var c0 = live[0];
  var U = { man: D.man, allDs: D.allDs, defaultData: D.defaultData, dsId: 'panels', dataId: c0.key, ds: { missing: {} }, golden: false, runRaw: null,
    shared: { configs: configs, limits: c0.D.shared.limits, reachable: c0.D.shared.reachable, frame: c0.D.shared.frame, axis: c0.D.shared.axis, capC: null, capC_z: null, capC_j: null, artifact_flags: {}, fit_excluded: null },
    avg: { lev_grid: c0.D.avg.lev_grid, rows: avgRows }, med: anyMed && c0.D.med ? { rows: medRows } : null,
    bay: c0.D.bay ? { rows: bayRows, lev_fail: c0.D.bay.lev_fail, lev_logit: c0.D.bay.lev_logit, unfitted: [], disclosures: {}, kde_grid: c0.D.bay.kde_grid, fit_set: c0.D.bay.fit_set } : null, bayPrev: null, bayPrevById: {}, unfitted: {} };
  U.avgById = {}; U.medById = {}; U.bayById = {}; avgRows.forEach(function (r) { U.avgById[r.cfg] = r; }); medRows.forEach(function (r) { U.medById[r.cfg] = r; }); bayRows.forEach(function (r) { U.bayById[r.cfg] = r; });
  return U;
}
function buildControls() {   // the main page's switches whose meaning every panel carries, from the shared word table
  var row = Kit.filterRow('#controls'); row.classList.add('kit-static');
  SW.def = Kit.switchControl({ mount: row, key: 'def', label: CONTROL_WORDS.def.label, options: CONTROL_WORDS.def.options, dflt: 'average', onchange: function (v) { state.def = v === 'median' ? 'median' : 'average'; if (GRID) render(); } });
  SW.src = Kit.switchControl({ mount: row, key: 'src', label: CONTROL_WORDS.src.label, options: [{ value: 'project', label: houseName() }, { value: 'bayes', label: CONTROL_WORDS.src.bayes }], dflt: 'bayes', onchange: function (v) { state.src = v === 'project' ? 'project' : 'bayes'; if (GRID) render(); } });
  [['xs', CONTROL_WORDS.xs.label], ['ys', CONTROL_WORDS.ys.label]].forEach(function (ax) { Kit.switchControl({ mount: row, key: ax[0], label: ax[1], options: CONTROL_WORDS.scale, dflt: 'logit', onchange: function (v) { state[ax[0]] = v === 'raw' ? 'raw' : 'logit'; if (GRID) render(); } }); });
  Kit.switchControl({ mount: document.getElementById('armsbar') || row, key: 'partial', label: CONTROL_WORDS.partial.label, options: CONTROL_WORDS.partial.options, dflt: 'hide', onchange: function (v) { state.partial = v === 'show' ? 'show' : 'hide'; Kit.state.set('partial', state.partial, 'hide'); if (GRID) { refreshPartialChips(); render(); } } });
}
function syncChains(ctxs) {   // an option no chosen set carries stays in place, unselectable, with the reason as its hint (the main page's rule for a dataset without the chain); a set among several without it draws with the chain it has
  var live = ctxs.filter(function (c) { return !c.held; });
  [['def', 'median', live.some(function (c) { return !!c.D.med; }), 'chain_median', 'no median-task chain for these sets', 'average'], ['src', 'bayes', live.some(function (c) { return !!c.D.bay; }), 'bayes', 'no Bayesian crossing tables for these sets', 'project']].forEach(function (L) {
    var b = document.querySelector('.kit-switch[data-key="' + L[0] + '"] button[data-value="' + L[1] + '"]'); if (!b) return;
    if (L[2]) { b.disabled = false; b.removeAttribute('aria-disabled'); b.title = ''; return; }
    var why = null; live.forEach(function (c) { var m = c.D.ds && c.D.ds.missing; if (!why && m && m[L[3]]) why = m[L[3]]; });
    b.disabled = true; b.setAttribute('aria-disabled', 'true'); b.title = why || L[4];
    if (state[L[0]] === L[1]) { state[L[0]] = L[5]; Kit.state.set(L[0], null, null); if (SW[L[0]] && SW[L[0]].set) SW[L[0]].set(L[5]); }
  });
}
function init(ctxs) {
  PANELS = ctxs; ctxs.forEach(function (c, i) { c.idx = i; c.sel = c.sel || new Set(); });
  UNION = buildUnion(ctxs);
  if (!UNION) { heldLine('Held: none of the chosen sets is served with its files; nothing is drawn.'); return; }
  D = UNION; LIM = UNION.shared.limits ? [UNION.shared.limits.lo - 0.15, UNION.shared.limits.hi + 0.15] : [-6, 6]; RUNS = []; RUN = null; slugIndex();
  sel = new Set(); var sp = Kit.state.get('sel', null);   // the selection: the link's slugs, else every shown model
  if (sp) String(sp).split(',').forEach(function (sl) { if (IDX_OF_SLUG[sl] !== undefined) sel.add(IDX_OF_SLUG[sl]); });
  if (!sel.size) D.shared.configs.forEach(function (_, i) { if (!isWithheld(i) && !isRun(i)) sel.add(i); });
  state.a = +Kit.state.get('a', 50); state.c = +Kit.state.get('c', 1);
  state.partial = Kit.state.get('partial', 'hide') === 'show' ? 'show' : 'hide';
  state.def = Kit.state.get('def', 'average') === 'median' ? 'median' : 'average';
  state.src = Kit.state.get('src', 'bayes') === 'project' ? 'project' : 'bayes';   // Bayesian where a set has posteriors; a set without draws with the chain it has
  state.xs = Kit.state.get('xs', 'logit') === 'raw' ? 'raw' : 'logit'; state.ys = Kit.state.get('ys', 'logit') === 'raw' ? 'raw' : 'logit';
  buildControls(); syncChains(ctxs);
  buildLevels(); foldSweepTools();
  buildChips(); refreshPartialChips();
  if (!partialArms().length) { var psw = document.querySelector('.kit-switch[data-key="partial"]'); if (psw) psw.style.display = 'none'; }
  var mount = document.getElementById('panelgrid'); var labels = {}; SET_KEYS.forEach(function (k) { labels[k] = String((DATASETS[k] || {}).label || k).replace(/\s*\([^)]*\)\s*$/, ''); });
  GRID = Kit.panelGrid({ mount: mount, keys: SET_KEYS, labels: labels, draw: drawPanel, min: 300 });
  hoverWire();
  var ex = document.getElementById('exportrow'); if (ex && Kit.exportButton) Kit.exportButton(ex, exportPanels);
  STAMP = null; ctxs.forEach(function (c) { var e = D.allDs[c.key]; if (e && e.updated_at && (!STAMP || e.updated_at > STAMP)) STAMP = e.updated_at; });
  var sf = document.getElementById('stampfold'); if (sf && STAMP) sf.textContent = 'data as of ' + plainTs(STAMP) + ' · ' + CADENCE;
  liveness(); heldTick = setInterval(liveness, 120000);
  render();
}
function drawPanel(key, panelEl, size) {   // the kit's draw: this set's plane into its panel, by the plane module's renderer
  var ctx = null; for (var k = 0; k < PANELS.length; k++) if (PANELS[k].key === key) ctx = PANELS[k];
  if (!ctx) return;
  var svg = panelEl.querySelector('svg'); if (!svg) { svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('data-plot', ''); svg.setAttribute('data-equal-scale', ''); svg.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'g')); panelEl.appendChild(svg); }
  svg.dataset.p = ctx.idx; svg.style.width = '100%'; svg.style.height = 'auto'; svg.style.display = 'block';
  if (ctx.held) { svg.setAttribute('viewBox', '0 0 ' + size.width + ' ' + size.width); svg.firstChild.innerHTML = '<text x="' + (size.width / 2) + '" y="' + (size.width / 2) + '" text-anchor="middle" font-size="11" fill="#52514e">held: ' + ctx.held + '</text>'; ctx.drawn = 0; return; }
  var want = {}; Array.from(sel).forEach(function (i) { want[SLUG_OF[i]] = 1; });   // the chips' choice, by slug, applied to this set's models
  ctx.sel = new Set(); ctx.D.shared.configs.forEach(function (c, i) { if (want[ctx.SLUG_OF[i]]) ctx.sel.add(i); });
  PANEL = { svg: svg, g: svg.firstChild, idx: ctx.idx, key: key, size: size, drawn: 0 };
  var src0 = state.src, def0 = state.def;   // a set without the chain the controls name draws with the chain it has: the reference chain for a set without Bayesian tables, the average rate for one without a median chain
  if (state.src === 'bayes' && !ctx.D.bay) state.src = 'project'; if (state.def === 'median' && !ctx.D.med) state.def = 'average';
  try {
    withPanel(ctx, function () {
      LIMX = null; LIMY = null; EXT = null; renderScatter();   // pass one: the drawn extent
      var cr = cropRange(EXT, LIM); if (cr) { LIMX = cr.slice(); LIMY = cr.slice(); try { renderScatter(); } finally { LIMX = null; LIMY = null; } }   // pass two: the axes crop to the points, equal scales, the diagonal
    });
  } finally { state.src = src0; state.def = def0; ctx.drawn = PANEL.drawn; PANEL = null; }
  if (ctx.idx === PANELS.length - 1) { var total = PANELS.reduce(function (a, c) { return a + (c.drawn || 0); }, 0);
    var h = document.getElementById('headline'); if (h) h.textContent = PANELS.length + ' sets side by side: ' + axisShort('y') + ' against ' + axisShort('x') + ' on each set’s own difficulty axis; ' + total + ' points drawn.'; }
}
function exportPanels() {   // the export: the grid as drawn, every panel beside the next, one legend of every model drawn in any panel
  var n = PANELS.length, cols = Math.min(3, n), rows = Math.ceil(n / cols), pw = 300, ph = 300, gap = 16, th = 22;
  var W = cols * pw + (cols - 1) * gap, H = rows * (ph + th) + (rows - 1) * gap;
  var wrap = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); wrap.setAttribute('viewBox', '0 0 ' + W + ' ' + H); wrap.setAttribute('width', W); wrap.setAttribute('height', H); wrap.style.position = 'absolute'; wrap.style.left = '-99999px'; document.body.appendChild(wrap);
  var inner = '';
  PANELS.forEach(function (c, i) { var svg = document.querySelector('#panelgrid svg[data-p="' + i + '"]'); if (!svg) return; var vb = (svg.getAttribute('viewBox') || '0 0 300 300').split(' ').map(Number); var x = (i % cols) * (pw + gap), y = Math.floor(i / cols) * (ph + th + gap);
    inner += '<text x="' + (x + pw / 2) + '" y="' + (y + 14) + '" text-anchor="middle" font-size="13" font-weight="600" fill="#222">' + (DATASETS[c.key] ? String(DATASETS[c.key].label).replace(/\s*\([^)]*\)\s*$/, '') : c.key) + '</text>'
      + '<g transform="translate(' + x + ',' + (y + th) + ') scale(' + (pw / (vb[2] || 300)) + ')">' + svg.innerHTML + '</g>'; });
  wrap.innerHTML = inner;
  var legend = [], seen = {};
  PANELS.forEach(function (c) { if (c.held) return; PANEL = { svg: document.querySelector('#panelgrid svg[data-p="' + c.idx + '"]'), idx: c.idx }; try { withPanel(c, function () { exportLegend().forEach(function (r) { if (!seen[r.label]) { seen[r.label] = 1; legend.push(r); } }); }); } finally { PANEL = null; } });
  setTimeout(function () { if (wrap.parentNode) wrap.parentNode.removeChild(wrap); }, 0);
  var parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()); var pick = function (t) { return (parts.find(function (q) { return q.type === t; }) || {}).value || ''; };
  return { svg: wrap, legend: legend, title: '', page: '', view: 'side by side \u00b7 ' + exportView().replace(/^[^\u00b7]*\u00b7\s*/, ''), stamp: '', fileBase: 'capability-vs-reliability_side-by-side_' + pick('year') + '-' + pick('month') + '-' + pick('day'), crop: null };
}
