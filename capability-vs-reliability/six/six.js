



'use strict';
var SETS_ORDER = ['board_top', 'board', 'top', 'new', 'all', 'math500', 'aime', 'gsm8k_platinum', 'ifeval', 'cruxeval_i', 'cruxeval_o'];   
var DEFAULT_SETS = ['math500', 'aime', 'gsm8k_platinum', 'ifeval', 'cruxeval_i', 'cruxeval_o'];   
var GRID = null, UNION = null, SET_KEYS = [], SERVED = [], STAMP = null, heldTick = null, SW = {};
function heldLine(msg) { var h = document.getElementById('heldline'); if (!h) return; if (msg) { h.textContent = msg; h.hidden = false; } else { h.textContent = ''; h.hidden = true; } }
function liveness() { return;   /* standalone copy: no rebuild loop, no held line */   
  fetch(MOUNT + 'liveness.txt', { cache: 'no-store' }).then(function (r) { return r.ok ? r.text() : ''; }).then(function (t) {
    var m = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/.exec(t || ''); var age = m ? (Date.now() - Date.parse(m[0])) / 60000 : Infinity;
    heldLine(age > 10 ? 'Held: the rebuild loop has not run for ' + (isFinite(age) ? Math.round(age) + ' minutes' : 'a while') + '; the panels show the last build.' : null);
  }).catch(function () { heldLine('Held: the rebuild loop’s liveness is unreadable; the panels show the last build.'); });
}
function render() { syncPresets(); if (typeof syncWdLock === 'function') syncWdLock(); if (typeof syncXdefLock === 'function' && elA) syncXdefLock(); markControlData(); if (GRID) GRID.redraw(); paintChips(); }   
function defaultKeys() { return DEFAULT_SETS.filter(function (k) { return SERVED.indexOf(k) >= 0; }); }

fetch(MOUNT + 'data/manifest.json').then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
  .catch(function (e) { var why = String(e && e.message || e); heldLine('Held: the data manifest is missing or unreadable (' + (/HTTP \d+/.test(why) ? why : 'not readable as data') + '); nothing is drawn until the rebuild loop writes it.'); return new Promise(function () {}); })
  .then(function (man) {
    D.man = man; var ds = man.datasets || {}; D.allDs = ds; D.defaultData = ds.board_top ? 'board_top' : 'board';
    Object.keys(DATASETS).forEach(function (k) { DATASETS[k].available = !!(ds[k] && ds[k].files); });
    relabel();   
    SERVED = SETS_ORDER.filter(function (k) { return DATASETS[k] && ds[k] && ds[k].files; });
    state.arms = Kit.state.get('arms', 'all') === 'golden' ? 'golden' : 'all';   
    var want = String(Kit.state.get('sets', '') || '').split(',').filter(function (k) { return SERVED.indexOf(k) >= 0; });
    SET_KEYS = want.length ? SETS_ORDER.filter(function (k) { return want.indexOf(k) >= 0; }) : defaultKeys();
    if (want.length && SET_KEYS.join(',') === defaultKeys().join(',')) Kit.state.set('sets', null, null);   
    buildSetControl();
    return namesOverlayLoad(MOUNT).then(function (ov) { D.namesOv = ov; return Promise.all(SET_KEYS.map(loadSetCtx)); });   
  }).then(init);

function buildSetControl() {   
  var bar = document.getElementById('setbar'); if (!bar) return; bar.innerHTML = '';
  var groups = [['Default sets', SETS_ORDER.filter(function (k) { return DATASETS[k] && !DATASETS[k].group; })], ['Math', SETS_ORDER.filter(function (k) { return DATASETS[k] && DATASETS[k].group === 'Math'; })], ['Other', SETS_ORDER.filter(function (k) { return DATASETS[k] && DATASETS[k].group === 'Other'; })]];
  groups.forEach(function (g) {
    var wrap = document.createElement('span'); wrap.className = 'chips setgroup';   
    var lab = document.createElement('span'); lab.className = 'fam'; lab.textContent = g[0]; wrap.appendChild(lab);
    g[1].forEach(function (k) {
      var b = document.createElement('button'); b.className = 'chip setchip'; b.dataset.set = k; var on = SET_KEYS.indexOf(k) >= 0, served = SERVED.indexOf(k) >= 0;
      b.textContent = String(DATASETS[k].label).replace(/\s*\([^)]*\)\s*$/, ''); b.title = served ? (DATASETS[k].hover || '') : (DATASETS[k].label + ': ' + DATASETS[k].reason);
      b.classList.toggle('off', !on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); if (!served) { b.disabled = true; b.setAttribute('aria-disabled', 'true'); }
      b.onclick = function () {
        var keys = SET_KEYS.slice(), i = keys.indexOf(k); if (i >= 0) { if (keys.length === 1) return; keys.splice(i, 1); } else keys.push(k);   
        keys = SETS_ORDER.filter(function (x) { return keys.indexOf(x) >= 0; });
        Kit.state.set('sets', keys.join(',') === defaultKeys().join(',') ? null : keys.join(','), null); location.reload();
      };
      wrap.appendChild(b);
    });
    bar.appendChild(wrap);
  });
}
function loadSetCtx(key) {   
  var armsKey = state.arms === 'golden' && D.allDs['golden-' + key] && D.allDs['golden-' + key].files ? 'golden-' + key : key;   
  var e = D.allDs[armsKey], files = e && e.files; if (!files) return Promise.resolve({ key: key, held: 'not served' });
  return Promise.all(['shared', 'chain_average', 'chain_median', 'bayes', 'bayes_prev'].map(function (k) { return files[k] ? fetch(MOUNT + 'data/' + files[k]).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }) : Promise.resolve(null); })).then(function (all) {
    var X = { man: D.man, allDs: D.allDs, defaultData: D.defaultData, dsId: armsKey, dataId: key, ds: e, golden: armsKey !== key, shared: all[0], avg: all[1], med: all[2], bay: all[3], bayPrev: all[4] || null, runRaw: null, moves: null };
    if (!X.shared || !X.avg) return { key: key, held: 'files missing' };
    namesOverlayApply(D.namesOv, X.shared, X.runRaw);   
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
function buildUnion(ctxs) {   
  var live = ctxs.filter(function (c) { return !c.held; }); if (!live.length) return null;
  var seen = {}, configs = [], avgRows = [], medRows = [], bayRows = [], anyMed = live.every(function (c) { return !!c.D.med; });
  live.forEach(function (c) { c.D.shared.configs.forEach(function (cf, i) { if (cf.run) return; var sl = c.SLUG_OF[i] || cf.id; if (seen[sl]) return; seen[sl] = 1; var copy = Object.assign({}, cf); copy.slug = sl; configs.push(copy);
    if (c.D.avgById[cf.id]) avgRows.push(c.D.avgById[cf.id]); if (anyMed && c.D.medById[cf.id]) medRows.push(c.D.medById[cf.id]); if (c.D.bayById[cf.id]) bayRows.push(c.D.bayById[cf.id]); }); });
  var c0 = live[0], cb = live.filter(function (c) { return !!c.D.bay; })[0] || null;   
  var U = { man: D.man, allDs: D.allDs, defaultData: D.defaultData, dsId: 'panels', dataId: c0.key, ds: { missing: {} }, golden: false, runRaw: null,
    shared: { configs: configs, limits: c0.D.shared.limits, reachable: c0.D.shared.reachable, frame: c0.D.shared.frame, axis: c0.D.shared.axis, capC: null, capC_z: null, capC_j: null, artifact_flags: {}, fit_excluded: null },
    avg: { lev_grid: c0.D.avg.lev_grid, rows: avgRows }, med: anyMed && c0.D.med ? { rows: medRows } : null,
    bay: cb ? { rows: bayRows, lev_fail: cb.D.bay.lev_fail, lev_logit: cb.D.bay.lev_logit, unfitted: [], disclosures: {}, kde_grid: cb.D.bay.kde_grid, fit_set: cb.D.bay.fit_set } : null, bayPrev: null, bayPrevById: {}, unfitted: {} };
  U.avgById = {}; U.medById = {}; U.bayById = {}; avgRows.forEach(function (r) { U.avgById[r.cfg] = r; }); medRows.forEach(function (r) { U.medById[r.cfg] = r; }); bayRows.forEach(function (r) { U.bayById[r.cfg] = r; });
  return U;
}
function buildControls(ctxs) {   
  var live = ctxs.filter(function (c) { return !c.held; });
  var row = Kit.filterRow('#controls'); row.classList.add('kit-static');
  var sw = function (mount, key, label, options, dflt, apply) { return Kit.switchControl({ mount: mount, key: key, label: label, options: options, dflt: dflt, onchange: function (v) { apply(v); if (GRID) render(); } }); };
  SW.view = sw(row, 'view', CONTROL_WORDS.view.label, CONTROL_WORDS.view.options, 'scatter', function (v) { state.view = v === 'ridges' ? 'ridges' : 'scatter'; });
  SW.def = sw(row, 'def', CONTROL_WORDS.def.label, CONTROL_WORDS.def.options, 'average', function (v) { state.def = v === 'median' ? 'median' : 'average'; });
  SW.xdef = sw(row, 'xdef', CONTROL_WORDS.xdef.label, CONTROL_WORDS.xdef.options, 'crossing', function (v) { state.xdef = CAP_KEYS[v] ? v : 'crossing'; if (state.xdef === 'crossing') Kit.state.set('xdef', null, null); if (typeof syncXdefLock === 'function' && elA) syncXdefLock(); });
  SW.src = sw(row, 'src', CONTROL_WORDS.src.label, [{ value: 'project', label: houseName() }, { value: 'bayes', label: CONTROL_WORDS.src.bayes }], 'bayes', function (v) { state.src = v === 'project' ? 'project' : 'bayes'; });
  sw(row, 'kp', CONTROL_WORDS.kp.label, CONTROL_WORDS.onoff, 'off', function (v) { state.kp = v === 'on' ? 'on' : 'off'; });
  sw(row, 'lad', CONTROL_WORDS.lad.label, CONTROL_WORDS.onoff, 'off', function (v) { state.lad = v === 'on' ? 'on' : 'off'; });
  sw(row, 'w', CONTROL_WORDS.w.label, CONTROL_WORDS.onoff, 'on', function (v) { state.w = v === 'off' ? 'off' : 'on'; });
  sw(row, 'wd', CONTROL_WORDS.wd.label, CONTROL_WORDS.wd.options, 'adj', function (v) { state.wd = v === 'ind' ? 'ind' : 'adj'; });
  sw(row, 'fitci', CONTROL_WORDS.fitci.label, CONTROL_WORDS.fitci.options, 'honest', function (v) { state.fitci = v === 'honest' ? 'honest' : 'plain'; });
  var more = document.createElement('details'); more.id = 'morecontrols'; more.className = 'about'; more.innerHTML = '<summary>' + CONTROL_WORDS.more + '</summary>';
  var moreRow = document.createElement('div'); moreRow.className = 'kit-filter-row kit-static'; moreRow.id = 'moreswitches'; more.appendChild(moreRow); var cc = document.getElementById('controls'); cc.parentNode.insertBefore(more, cc.nextSibling);   
  [['xs', CONTROL_WORDS.xs.label], ['ys', CONTROL_WORDS.ys.label]].forEach(function (ax) { sw(moreRow, ax[0], ax[1], CONTROL_WORDS.scale, 'logit', function (v) { state[ax[0]] = v === 'raw' ? 'raw' : 'logit'; }); });
  sw(moreRow, 'line', CONTROL_WORDS.line.label, CONTROL_WORDS.line.options, 'steps', function (v) { state.line = (v === 'off' || v === 'axes') ? v : 'steps'; });
  sw(moreRow, 'lw', CONTROL_WORDS.lw.label, CONTROL_WORDS.lw.options, 'equal', function (v) { state.lw = v === 'bands' ? 'bands' : 'equal'; });
  sw(moreRow, 'resid', CONTROL_WORDS.resid.label, CONTROL_WORDS.onoff, 'off', function (v) { state.resid = v === 'on' ? 'on' : 'off'; });
  var withPrevs = live.filter(function (c) { return !!c.D.bayPrev; });   
  if (withPrevs.length) { var names = withPrevs.map(function (c) { return withPanel(c, prevFitName); }), dates = names.map(function (nm) { var m = /^the (.+) cut of /.exec(nm); return m ? m[1] : null; });
    var oneDate = dates.length === names.length && dates.every(function (d) { return d && d === dates[0]; }) ? dates[0] : null;
    var prevName = live.length === 1 ? names[0] : (oneDate ? 'the ' + oneDate + ' cut of each set shown' : 'the previous cut of each set shown');
    sw(moreRow, 'move', CONTROL_WORDS.move.label + prevName, CONTROL_WORDS.onoff, 'off', function (v) { state.move = v === 'on' ? 'on' : 'off'; }); }
  var pm = document.getElementById('armsbar') || row;   
  var anyGolden = SET_KEYS.some(function (k) { return D.allDs['golden-' + k] && D.allDs['golden-' + k].files; });
  SW.arms = Kit.switchControl({ mount: pm, key: 'arms', label: CONTROL_WORDS.arms.label, options: CONTROL_WORDS.arms.options, dflt: 'all', onchange: function (v) { if (!GRID) return; if (v === 'golden' && !anyGolden) { SW.arms.set(state.arms); return; } if (v !== state.arms) { Kit.state.set('arms', v === 'golden' ? 'golden' : null, null); location.reload(); } } });
  if (!anyGolden) { var gb = pm.querySelector('.kit-switch[data-key="arms"] button[data-value="golden"]'); if (gb) { gb.disabled = true; gb.setAttribute('aria-disabled', 'true'); gb.title = CONTROL_WORDS.arms.goldenMissing; } }
  Kit.switchControl({ mount: pm, key: 'partial', label: CONTROL_WORDS.partial.label, options: CONTROL_WORDS.partial.options, dflt: 'hide', onchange: function (v) { state.partial = v === 'show' ? 'show' : 'hide'; Kit.state.set('partial', state.partial, 'hide'); if (GRID) { refreshPartialChips(); render(); } } });
}
function syncChains(ctxs) {   
  var live = ctxs.filter(function (c) { return !c.held; });
  var caps = Object.keys(CAP_KEYS).map(function (k) { return ['xdef', k, live.some(function (c) { return !!(c.D.shared && c.D.shared[k]); }), k, CAP_KEYS[k].name() + ' is not computed for these sets', 'crossing']; });
  [['def', 'median', live.some(function (c) { return !!c.D.med; }), 'chain_median', 'no median-task chain for these sets', 'average'], ['src', 'bayes', live.some(function (c) { return !!c.D.bay; }), 'bayes', 'no Bayesian crossing tables for these sets', 'project'], ['view', 'ridges', live.some(function (c) { return !!c.D.bay; }), 'bayes', 'no posterior ridges for these sets', 'scatter']].concat(caps).forEach(function (L) {
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
  sel = new Set(); var sp = Kit.state.get('sel', null);   
  if (sp) String(sp).split(',').forEach(function (sl) { if (IDX_OF_SLUG[sl] !== undefined) sel.add(IDX_OF_SLUG[sl]); });
  if (!sel.size) D.shared.configs.forEach(function (_, i) { if (!isWithheld(i) && !isRun(i)) sel.add(i); });
  state.a = +Kit.state.get('a', 50); state.c = +Kit.state.get('c', 1);
  state.partial = Kit.state.get('partial', 'hide') === 'show' ? 'show' : 'hide';
  state.def = Kit.state.get('def', 'average') === 'median' ? 'median' : 'average';
  state.src = Kit.state.get('src', 'bayes') === 'project' ? 'project' : 'bayes';   
  state.xs = Kit.state.get('xs', 'logit') === 'raw' ? 'raw' : 'logit'; state.ys = Kit.state.get('ys', 'logit') === 'raw' ? 'raw' : 'logit';
  state.view = Kit.state.get('view', 'scatter') === 'ridges' ? 'ridges' : 'scatter';
  state.xdef = Kit.state.get('xdef', 'crossing'); if (!CAP_KEYS[state.xdef]) state.xdef = 'crossing';   
  state.kp = Kit.state.get('kp', 'off') === 'on' ? 'on' : 'off'; state.lad = Kit.state.get('lad', 'off') === 'on' ? 'on' : 'off'; state.w = Kit.state.get('w', 'on') === 'off' ? 'off' : 'on'; state.wd = Kit.state.get('wd', 'adj') === 'ind' ? 'ind' : 'adj';
  state.fitci = Kit.state.get('fitci', 'honest') === 'plain' ? 'plain' : 'honest'; state.move = Kit.state.get('move', 'off') === 'on' ? 'on' : 'off'; var lv = Kit.state.get('line', 'steps'); state.line = (lv === 'off' || lv === 'axes') ? lv : 'steps';
  state.lw = Kit.state.get('lw', 'equal') === 'bands' ? 'bands' : 'equal'; state.resid = Kit.state.get('resid', 'off') === 'on' ? 'on' : 'off';
  buildControls(ctxs); syncChains(ctxs);
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
function drawInto(ctx, svg, size) {   
  var want = {}; Array.from(sel).forEach(function (i) { want[SLUG_OF[i]] = 1; });
  ctx.sel = new Set(); ctx.D.shared.configs.forEach(function (c, i) { if (want[ctx.SLUG_OF[i]]) ctx.sel.add(i); });
  PANEL = { svg: svg, g: svg.firstChild, idx: ctx.idx, key: ctx.key, size: size, drawn: 0 };
  var src0 = state.src, def0 = state.def, drawn = 0;
  if (state.src === 'bayes' && !ctx.D.bay) state.src = 'project'; if (state.def === 'median' && !ctx.D.med) state.def = 'average';
  try {
    withPanel(ctx, function () {
      var body = svg.parentNode; if (body && body.style) body.style.aspectRatio = state.view === 'ridges' ? 'auto' : '';   
      if (state.view === 'ridges') {   
        if (!ctx.D.bay) { svg.setAttribute('viewBox', '0 0 ' + size.width + ' ' + size.width); PANEL.g.innerHTML = '<text x="' + (size.width / 2) + '" y="' + (size.width / 2) + '" text-anchor="middle" font-size="11" fill="#52514e">no posterior ridges for this set</text>'; PANEL.drawn = 0; return; }
        renderRidges(); return;
      }
      if (isCap() && !capBlock()) { svg.setAttribute('viewBox', '0 0 ' + size.width + ' ' + size.width); PANEL.g.innerHTML = '<text x="' + (size.width / 2) + '" y="' + (size.width / 2) + '" text-anchor="middle" font-size="11" fill="#52514e">' + CAP_KEYS[state.xdef].name() + ' is not published for this set yet; no model is drawn.</text>'; PANEL.drawn = 0; return; }   
      LIMX = null; LIMY = null; EXT = null; renderScatter();   
      var cr = cropRange(EXT, LIM); if (cr) { LIMX = cr.slice(); LIMY = cr.slice(); try { renderScatter(); } finally { LIMX = null; LIMY = null; } }   
    });
  } finally { state.src = src0; state.def = def0; drawn = PANEL.drawn; PANEL = null; }
  if (typeof refreshRunKey === 'function') refreshRunKey();   
  return drawn;
}
function drawPanel(key, panelEl, size) {   
  var ctx = null; for (var k = 0; k < PANELS.length; k++) if (PANELS[k].key === key) ctx = PANELS[k];
  if (!ctx) return;
  var svg = panelEl.querySelector('svg'); if (!svg) { svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('data-plot', ''); svg.setAttribute('data-equal-scale', ''); svg.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'g')); panelEl.appendChild(svg); }
  svg.dataset.p = ctx.idx; svg.style.width = '100%'; svg.style.height = 'auto'; svg.style.display = 'block';
  if (ctx.held) { svg.setAttribute('viewBox', '0 0 ' + size.width + ' ' + size.width); svg.firstChild.innerHTML = '<text x="' + (size.width / 2) + '" y="' + (size.width / 2) + '" text-anchor="middle" font-size="11" fill="#52514e">held: ' + ctx.held + '</text>'; ctx.drawn = 0; return; }
  ctx.drawn = drawInto(ctx, svg, size);
  if (ctx.idx === PANELS.length - 1) { var total = PANELS.reduce(function (a, c) { return a + (c.drawn || 0); }, 0);
    var h = document.getElementById('headline'); if (h) h.textContent = PANELS.length + ' sets side by side: ' + axisShort('y') + ' against ' + axisShort('x') + ' on each set’s own difficulty axis; ' + total + ' points drawn.'; }
}
function exportPanels() {   
  var live = PANELS.filter(function (c) { return !c.held; }), n = live.length, cols = Math.min(3, n), rows = Math.ceil(n / cols), pw = 900, gap = 24, th = 36;
  var hold = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); hold.style.position = 'absolute'; hold.style.left = '-99999px'; hold.setAttribute('width', pw); document.body.appendChild(hold);
  var drawn = [], ph = 0;
  EXPORTING = true;
  try {
    live.forEach(function (c) { var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'g')); svg.dataset.p = c.idx; hold.appendChild(svg);
      drawInto(c, svg, { width: pw, height: pw }); var vb = (svg.getAttribute('viewBox') || '0 0 900 900').split(' ').map(Number); ph = Math.max(ph, vb[3] || 900); drawn.push({ c: c, svg: svg }); });
  } finally { EXPORTING = false; }
  var W = cols * pw + (cols - 1) * gap, H = rows * (ph + th) + (rows - 1) * gap;
  var wrap = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); wrap.setAttribute('viewBox', '0 0 ' + W + ' ' + H); wrap.setAttribute('width', W); wrap.setAttribute('height', H); wrap.style.position = 'absolute'; wrap.style.left = '-99999px'; document.body.appendChild(wrap);
  var inner = '';
  drawn.forEach(function (d, i) { var x = (i % cols) * (pw + gap), y = Math.floor(i / cols) * (ph + th + gap);
    inner += '<text x="' + (x + pw / 2) + '" y="' + (y + 26) + '" text-anchor="middle" font-size="' + EXPORT_TITLE_PX + '" font-weight="600" fill="#222">' + (DATASETS[d.c.key] ? String(DATASETS[d.c.key].label).replace(/\s*\([^)]*\)\s*$/, '') : d.c.key) + '</text>'
      + '<g transform="translate(' + x + ',' + (y + th) + ')">' + d.svg.innerHTML + '</g>'; });
  wrap.innerHTML = inner;
  var legend = [], seen = {};
  drawn.forEach(function (d) { PANEL = { svg: d.svg, idx: d.c.idx }; try { withPanel(d.c, function () { exportLegend().forEach(function (r) { if (!seen[r.label]) { seen[r.label] = 1; legend.push(r); } }); }); } finally { PANEL = null; } });
  setTimeout(function () { if (wrap.parentNode) wrap.parentNode.removeChild(wrap); if (hold.parentNode) hold.parentNode.removeChild(hold); }, 0);
  var parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()); var pick = function (t) { return (parts.find(function (q) { return q.type === t; }) || {}).value || ''; };
  return { svg: wrap, legend: legend, title: '', page: '', view: 'side by side · ' + exportView().replace(/^[^·]*·\s*/, ''), stamp: '', fileBase: 'capability-vs-reliability_side-by-side_' + pick('year') + '-' + pick('month') + '-' + pick('day'), crop: null };
}
