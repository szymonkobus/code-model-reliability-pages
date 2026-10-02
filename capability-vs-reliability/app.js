/* CROSSINGS tool (maintainers: the maintainers; tools convergence).
 * The definition switch swaps ARTIFACT POINTERS (binding chain-swap
 * spec): dots, whiskers, and readouts re-derive from the other
 * chain's precomputed level tables; the browser interpolates, never
 * estimates. The one client-side fitted overlay (the pairs-bootstrap
 * line, the approved model-point fit from /sweep) is seeded and
 * labeled. The project maintainers' 2026-08-28 conventions from the /curves review are
 * baked in: percent labels only, per-axis Logit|Raw switches,
 * estimators named by what they are, censoring shown with DIRECTION.
 */
/* 2 Oct 2026 (the project maintainers' word of 13:0x UK: composition): this file is the single-figure PAGE — the data load, the controls, the folds and the texts; the plane,
 * the chips and the level controls live in plane.js, chips.js and levels.js, loaded before this file and shared with the side-by-side page. */
'use strict';

/* ---------------- data ---------------- */

fetch(MOUNT + 'data/manifest.json')
  .then(function (r) { if (!r.ok) throw new Error('manifest: HTTP ' + r.status); return r.json(); })
  .catch(function (e) {   // FAIL CLOSED (convention g): a missing or unreadable manifest is a held state, not a blank page (the results mirror's maintainers 2026-09-11, the mirror before its first build)
    var why = String(e && e.message || e); why = /HTTP \d+/.test(why) ? why.replace(/^manifest: /, '') : 'not readable as data';   // plain words, never the parser's text
    setHeld('Held: the data manifest is missing or unreadable (' + why + '); nothing is drawn until the rebuild loop writes it.', 'manifest');
    if (!heldTimer) { heldCheck(); heldTimer = setInterval(heldCheck, 120000); }
    return new Promise(function () {});   // never resolves: the page stays held; nothing below runs
  })
  .then(function (man) {
    D.man = man;
    /* DATASETS (the project maintainers 2026-09-03): manifest.datasets lists one artifact set per dataset — board = the main builder's
     * files, new = build_pool_dataset.py's (the pool pages maintainers' cross_rows on the frozen level grid). A dataset's missing
     * chains are named with the reason (datasets[..].missing) and the page disables those options under it. */
    var ds = man.datasets || { board: { files: man.files, label: DATASETS.board ? DATASETS.board.label : '', fingerprint: man.fingerprint, frame: man.frame } };
    Object.keys(DATASETS).forEach(function (k) { DATASETS[k].available = !!ds[k] || !!DATASETS[k].page; });   // a page entry (the six-panel view) is always available
    var DEFAULT_DATA = (window.MIRROR_DEFAULT && ds[window.MIRROR_DEFAULT]) ? window.MIRROR_DEFAULT : ds.board_top ? 'board_top' : ds.board ? 'board'
                     : (Object.keys(DATASETS).filter(function (k) { return ds[k]; })[0] || Object.keys(DATASETS)[0]);   // the project maintainers 09-05: board + top half is the default view once served; a mirror names its own
    D.defaultData = DEFAULT_DATA;
    var want = Kit.state.get('data', DEFAULT_DATA);
    var ALIASES = { boardfocused: 'board_top', focused: 'top' };
    var RETIRED = {};   // no dataset key is retired since the project maintainers' 30 Sep word (the maths keys returned under the Dataset control) // the 09-05  working names, kept as silent aliases for links
    if (ALIASES[want]) { want = ALIASES[want]; Kit.state.set('data', want, null); }
    if (DATASETS[want] && DATASETS[want].page) { location.replace(MOUNT + DATASETS[want].page); return new Promise(function () {}); }   // 1 Oct: the six-panel view lives at its own page
    if (!DATASETS[want] && /^golden-/.test(want) && ds[want]) { want = want.slice(7); Kit.state.set('arms', 'golden', 'all'); Kit.state.set('data', want, DEFAULT_DATA); }   // datasets["golden-<set>"] named directly: that is <set> under arms=golden; a dataset value must be a switch option or the switch's init fire reloads for ever (2026-09-09)
    relabel();   // official set names before any note quotes a label (the fallback note below quoted the working name)
    if (!DATASETS[want] || !ds[want]) {   // an option without an artifact set, or an unknown value (or a manifest key that is not a switch option): fall back to the board, say so, rewrite the URL
      dataNote = (DATASETS[want] ? 'dataset \u201c' + DATASETS[want].label + '\u201d is not served yet \u2014 ' + DATASETS[want].reason
                                 : RETIRED[want] && !DATASETS[want] ? RETIRED[want] + ' is not on this page (coding sets only; the maths results have their own mirror page)'
                                 : 'dataset \u201c' + String(want).slice(0, 40) + '\u201d is not one of ' + Object.keys(DATASETS).join(' | ')) + '; showing ' + DATASETS[DEFAULT_DATA].label;
      want = DEFAULT_DATA; Kit.state.set('data', null, null);
    }
    /* ARMS (the project maintainers' word of 3 Sep 2026 : the golden set — Qwen3 0.6B–8B plain + thinking, Claude haiku-4-5 and sonnet-5 plain +
     * thinking — is a set to read failure against difficulty and capability against reliability on, defined over the arms every method
     * covers; a data point, not the definition): key arms = all | golden (vocabulary adopted by the curves page's maintainers for both official pages); under golden the
     * artifact set is datasets["golden-<data>"] — its own axis over the 12 arms, every estimator that exists for it */
    var armsWant = Kit.state.get('arms', 'all'), armsKey = armsWant === 'golden' ? 'golden-' + want : want;
    if (armsWant !== 'all' && armsWant !== 'golden') { dataNote = (dataNote ? dataNote + ' \u00b7 ' : '') + 'arms=' + String(armsWant).slice(0, 40) + ' is not one of all | golden; showing all models'; armsWant = 'all'; armsKey = want; Kit.state.set('arms', null, null); }
    else if (armsWant === 'golden' && !ds[armsKey]) { dataNote = (dataNote ? dataNote + ' \u00b7 ' : '') + 'the golden set is not served yet for \u201c' + DATASETS[want].label + '\u201d; showing all models'; armsWant = 'all'; armsKey = want; Kit.state.set('arms', null, null); }
    state.data = want; state.arms = armsWant; D.dsId = armsKey; D.dataId = want; D.ds = ds[armsKey]; D.golden = armsWant === 'golden'; D.allDs = ds;
    var files = ds[armsKey].files;   // the artifact set of (dataset, arms) — under golden, datasets['golden-<data>']
    return Promise.all(['shared', 'chain_average', 'chain_median', 'bayes', 'bayes_prev'].map(function (k) {
      return files[k] ? fetch(MOUNT + 'data/' + files[k]).then(function (r) { return r.json(); }) : Promise.resolve(null);
    }).concat([fetch(MOUNT + 'data/olmo_run.json').then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })]));   // + the third set's sidecar (the Olmo run; absent = no set)
  }).then(function (all) {
    D.shared = all[0]; D.avg = all[1]; D.med = all[2]; D.bay = all[3]; D.bayPrev = all[4] || null;
    D.runRaw = all[5] || null;   // merged in boot, after the withdrawn pass, and only on the run's own axis   // bayes_prev: the fit before the last flip (arrows)
    prepareSet(D);   // the withdrawn pass, the id-keyed joins, the level grid and the version checks — the plane module's, shared with the side-by-side page
    boot();
  });


function boot() {
  mergeRunSet(D.runRaw);
  var g = D.avg.lev_grid;
  /* tight data-envelope axes (review: reachable-band framing left
   * 3/4 of the plot empty); envelope computed by the builder over
   * every finite drawable value */
  LIM = D.shared.limits
    ? [D.shared.limits.lo - 0.15, D.shared.limits.hi + 0.15]
    : [D.shared.reachable.floor_z - 0.35,
       D.shared.reachable.top_z + 0.35];
  var zFloor = logit(AXIS_FLOOR_PCT / 100) - 0.15;   // the project maintainers' word of 22 Sep 15:2x: both axes down to 0.1% (equal scale, so one window for x and y) — a run's bound marks sit inside the drawn range
  if (LIM[0] > zFloor) LIM[0] = zFloor;

  sel = new Set();
  var selParam = Kit.state.get('sel', null), selRewrite = false;
  if (selParam !== null && selParam !== '') {
    // SELECTION BY ARM IDENTITY (the project maintainers' word of 4 Sep 2026: the page remembered chip positions, which differ between datasets — a bug
    // to fix): the URL carries arm keys (the board id an arm shares across datasets), never chip positions;
    // a legacy positional link (digits and dots) is re-bound to keys once and the URL rewritten, with a note
    slugIndex();
    var keyOf = function (c) { return c.board_id || c.id; };
    var byKey = {}; D.shared.configs.forEach(function (c, i) { byKey[keyOf(c)] = i; byKey[c.id] = i; byKey[SLUG_OF[i]] = i; byKey[slugify(c.display_name || c.label)] = i; });   // 26 Sep: slugs first; the old keys (board ids, ids, stems) read on for links the project maintainers holds
    D.shared.configs.forEach(function (c, i) { if (byKey[normId(c.id)] === undefined) byKey[normId(c.id)] = i; });
    if (/^[\d.]+$/.test(selParam)) {
      var rebound = [];
      selParam.split('.').forEach(function (t) { var i = +t; if (i >= 0 && i < D.shared.configs.length) { sel.add(i); rebound.push(keyOf(D.shared.configs[i])); } });
      dataNote = (dataNote ? dataNote + ' \u00b7 ' : '') + 'link re-bound: the selection was stored by chip position (' + selParam + '), which differs between datasets; it now carries model ids (' + rebound.join(', ') + ')';
      selRewrite = true;
    } else {
      var bad = [];
      selParam.split(',').forEach(function (k) { if (byKey[k] !== undefined) { sel.add(byKey[k]); if (SLUG_OF[byKey[k]] !== k) selRewrite = true; } else if (k) bad.push(k); });   // an old key read: the URL is rewritten to the slugs
      if (bad.length) { selRewrite = true; }   // 1 Oct 2026 (the project maintainers' word of 12:1x UK): a link naming a model the dataset does not carry is filtered and rewritten, and no badge says so
    }
    var dropped = withheldArms().filter(function (i) { return sel.has(i); });
    if (dropped.length) { dropped.forEach(function (i) { sel.delete(i); }); selRewrite = true; }   // 1 Oct 2026: a withheld model named by the link leaves the selection quietly; its chip stays greyed with its reason
    if (!sel.size) { D.shared.configs.forEach(function (_, i) { if (!isWithheld(i) && !isRun(i)) sel.add(i); }); selRewrite = true; }
    if (Kit.state.get('partial', 'hide') !== 'show' && sel.size && Array.from(sel).every(isPartial)) {   // the project maintainers 2026-09-07 : a link naming only hidden partial arms draws every shown arm; the named chips stay greyed
      dataNote = (dataNote ? dataNote + ' \u00b7 ' : '') + 'the link named only partial models, which are hidden; every shown model is drawn';
      D.shared.configs.forEach(function (_, i) { if (!isPartial(i) && !isWithheld(i) && !isRun(i)) sel.add(i); }); selRewrite = true;
    }
    if (selRewrite) writeSel();   // the URL now carries arm ids (writeSel is a hoisted declaration)
  } else {
    D.shared.configs.forEach(function (_, i) { if (!isWithheld(i) && !isRun(i)) sel.add(i); });   // the default selection never includes a withheld arm, nor a run's checkpoints: a run's row is deselected by default (the project maintainers' word of 22 Sep 15:1x)
  }
  state.a = +Kit.state.get('a', 50);
  state.c = +Kit.state.get('c', 1);

  /* chains this dataset does not carry (manifest.datasets[..].missing): a deep link to them falls back and says so — BEFORE the switches read the URL */
  var miss = (D.ds && D.ds.missing) || {};
  var LIMITS = [['def', 'median', !!D.med, 'average', miss.chain_median || 'no median-task chain for this dataset'],
                ['src', 'bayes', !!D.bay, 'project', miss.bayes || 'no Bayesian crossing tables for this dataset'],
                ['view', 'ridges', !!D.bay, 'scatter', miss.bayes || 'no posterior ridges for this dataset']];
  LIMITS.forEach(function (L) {
    if (L[2]) return;
    if (Kit.state.get(L[0], null) === L[1]) { Kit.state.set(L[0], null, null); dataNote = (dataNote ? dataNote + ' \u00b7 ' : '') + L[0] + '=' + L[1] + ' is not available under \u201c' + (DATASETS[D.dsId] || DATASETS[D.dataId]).label + '\u201d \u2014 ' + L[4] + '; showing ' + L[3]; }
  });
  relabel();
  var row = Kit.filterRow('#controls');
  row.classList.add('kit-static'); // stays in the flow (the kit's opt-out): this row sits beside the chart on desktop and below it on narrow screens, and the chart is capped to the viewport, so nothing scrolls out of reach (page maintainers' read, 21 Sep)
  // THE DATASET CONTROL (the project maintainers' word of 30 Sep 15:5x: the sets browsable here under a control better than chips, the polished interface reused; the reference form agreed
  // by the reference designer and the curves page's maintainers : a native select in the kit's switch chrome, one control beside the other switches, the URL param data=<key> as before, two groups —
  // the coding sets with wave 1+2 the default, then the six non-code sets under the plain headings Math and Other, a set without a fit greyed and unselectable). Kit.selectControl takes this over when the kit carries it.
  var _dsDflt = D.defaultData || (D.allDs.board_top ? 'board_top' : 'board');
  var _opt = function (k) { return { value: k, label: String(DATASETS[k].label).replace(/\s*\([^)]*\)\s*$/, ''), disabled: !DATASETS[k].available }; };   // a control carries the project maintainers' words alone (23 Sep): the set's name, its count on the set line
  var dsRow = Kit.filterRow('#datasetbar');   // 2 Oct 2026 (the project maintainers' word of 11:2x UK): the dataset grouping is a dataset selector, not a chart control — it sits above the figure in its own slot, never among the chart's controls
  var dataSw = Kit.selectControl({ mount: dsRow, key: 'data', label: 'Dataset',   // FIRST control in the row ("an option at the top"); the reference designer's Kit.selectControl  30 Sep
    options: Object.keys(DATASETS).filter(function (k) { return !DATASETS[k].group; }).map(_opt),
    // 1 Oct 2026 (the project maintainers' word of 12:1x UK, the new benchmarks maintainers' leaf of record datasets_of_record.json): the default sets, then
    // Math, then Other — plain-word headings, every mathematics benchmark under Math and every other under Other, the leaf's order within a group; no study name on the switch
    groups: [{ label: 'Math', options: ['math500', 'aime', 'gsm8k_platinum'].map(_opt) }, { label: 'Other', options: ['ifeval', 'cruxeval_i', 'cruxeval_o'].map(_opt) }],   // the leaf of record's Other, nothing composed
    dflt: _dsDflt,
    onchange: function (v) {
      var ds = DATASETS[v] || DATASETS[_dsDflt] || DATASETS.board;
      if (ds.page && v !== D.dataId) { location.href = MOUNT + ds.page; return; }   // the six-panel view is its own page
      if (!ds.available) { if (dataSw) dataSw.set(D.dataId); return; }
      if (v !== D.dataId && DATASETS[v]) location.reload();   // the URL now carries data=<set>; the whole state (arms, axis, chains, frame) is that dataset's artifact set
    } });
  (function () { var sel = dataSw.element.querySelector('select'); [].forEach.call(sel.options, function (o) { var d = DATASETS[o.value]; if (!d) return; o.title = d.available ? (d.hover || '') : (d.label + ': ' + d.reason); }); })();   // the reason on hover for a set not served; the set's words for one served
  if (dataSw.value() !== D.dataId) dataSw.set(D.dataId);   // a rejected deep-link value: the option shown is the dataset rendered
  var armsSw = Kit.switchControl({ mount: document.getElementById('armsbar') || row, key: 'arms', label: 'Models',   // right after Dataset (the curves page maintainers' decision for both official pages)
    options: [{ value: 'all', label: 'all models' }, { value: 'golden', label: 'golden set' }],
    dflt: 'all',
    onchange: function (v) {
      if (v === 'golden' && !D.allDs['golden-' + D.dataId]) { if (armsSw) armsSw.set(state.arms); return; }
      if (v !== state.arms) location.reload();
    } });
  if (armsSw.value() !== state.arms) armsSw.set(state.arms);
  if (!D.allDs['golden-' + D.dataId]) { var gb = document.querySelector('.kit-switch[data-key="arms"] button[data-value="golden"]'); if (gb) { gb.disabled = true; gb.setAttribute('aria-disabled', 'true'); gb.title = 'golden set (12): no golden bundle for this dataset yet'; } }
  var partialSw = Kit.switchControl({ mount: document.getElementById('armsbar') || row, key: 'partial', label: CONTROL_WORDS.partial.label,   // the project maintainers 2026-09-07: hidden by default, URL partial=show
    options: CONTROL_WORDS.partial.options,
    dflt: 'hide',
    onchange: function (v) { state.partial = v === 'show' ? 'show' : 'hide'; Kit.state.set('partial', state.partial, 'hide'); refreshPartialChips(); render(); } });
  if (!partialArms().length) { var psw = document.querySelector('.kit-switch[data-key="partial"]'); if (psw) psw.style.display = 'none'; }   // no partial arm in this set: the switch is inert and hidden
  // no shown/hidden switch per run: the run's own row (its all/none) is the mechanism (the project maintainers' word of 23 Sep 12:0x); a URL's <key>=hide no longer hides a run
  showDataNote();
  Kit.switchControl({ mount: row, key: 'view', label: 'View',
    options: [{ value: 'scatter', label: 'Scatter' },
              { value: 'ridges', label: 'Posterior ridges' }],
    dflt: 'scatter',
    onchange: function (v) { state.view = v; if (sel) render(); } });
  Kit.switchControl({ mount: row, key: 'def', label: CONTROL_WORDS.def.label,
    options: CONTROL_WORDS.def.options,
    dflt: 'average',
    onchange: function (v) {
      state.def = v;
      if (srcMount) buildSrcSwitch();
      if (sel) render();
    } });
  // the project maintainers request 2026-09-01: capability-AXIS toggle — fitted crossing (adopted) vs the metrics-report Capability C. Ships live, gates run while live.
  // the project maintainers, 2026-09-11 ≈, asked where the capability x-scale toggle had gone — it was
  // mounted only when the dataset carried a Capability-C block, which only wave 1 does (the difficulty maintainers' metrics report on the original tasks), so it vanished
  // when the page opened on wave 1+2 (09-05). Now the switch shows on every dataset; where Capability C is not computed the option is greyed with the reason,
  // and a deep link xdef=capC on such a set falls back to the crossing with a note.
  var CAPC_REASON = 'Capability C is computed for wave 1 only; choose Dataset = wave 1 to use it';   // wave names only, no attribution (the project maintainers 2026-09-16)
  var xdefReady = false;   // the kit calls onchange once at construction: a D option then must not move the level (the level inputs are built later; a= carries the level)
  var xdefSw = Kit.switchControl({ mount: row, key: 'xdef', label: 'Capability axis',
    // the project maintainers' word of 24 Sep 12:4x: the switch reads D, Uniform, Jeffreys, Haldane — D is the crossing at the level the page's level controls set
    // (the D90…D10 buttons went: those controls exist already); the three distribution views for every model, never greyed
    options: [{ value: 'crossing', label: 'D' }, { value: 'capC', label: 'Uniform' }, { value: 'capC_j', label: 'Jeffreys' }, { value: 'capC_z', label: 'Haldane' }],
    dflt: 'crossing',
    onchange: function (v) {
      if (v === 'crossing') { state.xdef = 'crossing'; Kit.state.set('xdef', null, null); syncXdefLock(); if (xdefReady && sel) render(); return; }   // D: the crossing at the level as set; the URL carries the level (a=), not the option
      state.xdef = v;
      syncXdefLock();
      if (sel) render();
    } });
  xdefReady = true;
  (function () { var bD = row.querySelector('.kit-switch[data-key="xdef"] button[data-value="crossing"]'); if (bD) bD.title = 'D: the crossing at the horizontal level the level controls set'; })();
  Object.keys(CAP_KEYS).forEach(function (k) {   // every view pressable for every model (24 Sep 12:4x): the hover carries the difficulty maintainers' clause; where a set has no file the points are not drawn and the frame line names it
    var capBtn = row.querySelector('.kit-switch[data-key="xdef"] button[data-value="' + k + '"]'); if (capBtn) capBtn.title = CAP_KEYS[k].clause();
  });
  srcMount = document.createElement('span');
  row.appendChild(srcMount);
  buildSrcSwitch();
  // phone fold + sweep-tools fold: see foldSweepTools/phoneFold, run from each render once the controls and levels exist (the reference designer's and the critic's 2nd reads 09-04)
  LIMITS.forEach(function (L) {   // the option exists, disabled, with the reason on hover
    if (L[2]) return;
    var b = row.querySelector('.kit-switch[data-key="' + L[0] + '"] button[data-value="' + L[1] + '"]');
    if (b) { b.disabled = true; b.setAttribute('aria-disabled', 'true'); b.title = L[4]; }
  });
  showDataNote();
  // constant-K paths (the project maintainers' word of 29 Aug 2026: draw the
  // lines under a constant ratio K): each arm's locus of crossing
  // pairs as the level pair sweeps holding K = x/y fixed — the sweep
  // tool's arcs, ported; drawn from the SAME per-level tables as the
  // dots, all three estimator sources
  // ON/OFF SWITCHES read "Off | On" in the same order everywhere; only the pressed default differs (the project maintainers' word of 7 Sep 2026 :
  // off and on keep one order everywhere; only the pressed default may differ)
  Kit.switchControl({ mount: row, key: 'kp', label: 'K paths',
    options: [{ value: 'off', label: 'Off' },
              { value: 'on', label: 'On' }],
    dflt: 'off',   // off by default on the live page and the public copy alike (the project maintainers' word of 22 Sep 15:1x)
    onchange: function (v) { state.kp = v; if (sel) render(); } });
  Kit.switchControl({ mount: row, key: 'lad', label: 'K ladders',
    options: [{ value: 'off', label: 'Off' }, { value: 'on', label: 'On' }],
    dflt: 'off',
    onchange: function (v) { state.lad = v; if (sel) render(); } });
  Kit.switchControl({ mount: row, key: 'w', label: 'Whiskers',
    options: [{ value: 'off', label: 'Off' },
              { value: 'on', label: 'On' }],
    dflt: 'on',
    onchange: function (v) { state.w = v; if (sel) render(); } });
  Kit.switchControl({ mount: row, key: 'wd', label: 'Whisker widths',
    options: [{ value: 'adj', label: 'Correlation-adjusted' },
              { value: 'ind', label: 'Independence' }],
    dflt: 'adj',
    onchange: function (v) { state.wd = v; if (sel) render(); } });
  // /sweep fold: the fit's uncertainty — plain (dots exact; 95% band +
  // slope CI) or with each dot's own measurement error included (80%)
  Kit.switchControl({ mount: row, key: 'fitci', label: 'Fit CI',
    options: [{ value: 'plain', label: '95%, dots exact' },
              { value: 'honest', label: '80% with measurement error' }],
    dflt: 'plain',
    onchange: function (v) { state.fitci = v; if (sel) render(); } });
  if (D.bayPrev) {   // FIT MOVE (the project maintainers 2026-09-08, before/after as arrows; difficulty 2026-09-10: coverage-rule cuts flip with per-arm moves): under the
    // Bayesian source each drawn arm gets one arrow from its position in the previous fit to its position in this one, at the levels shown
    Kit.switchControl({ mount: row, key: 'move', label: 'Move from ' + prevFitName(),   // the project maintainers 2026-09-14: name the fit the arrows move from — the set and the date of its cut
      options: [{ value: 'off', label: 'Off' }, { value: 'on', label: 'On' }],
      dflt: 'off',
      onchange: function (v) { state.move = v; if (sel) render(); } });
  }

  // the project maintainers amendment 2026-09-01: ONE top-of-page toggle switches the
  // WHOLE site between the two difficulty spacings (uniform in logit
  // space vs uniform in difficulty) — the per-axis Logit|Raw switches
  // are replaced by it, killing the half-switched state space entirely.
  // Spacing changes rendering geometry only, never estimators/readings.
  // PER-AXIS SPACING (the project maintainers' word, 2026-09-14 : the x and y scales set independently under more controls): the one
  // 'Difficulty spacing' switch (both axes together, 09-06) becomes two selectors, x and y, each choosing the spacing the plane admits — equal difficulty
  // steps (logit) or linear percent (raw) — in a 'More controls' fold; URL keys xs / ys (an old space=uniform link sets both); one default, one order.
  if (Kit.state.get('space', null) === 'uniform') { Kit.state.set('xs', 'raw', 'logit'); Kit.state.set('ys', 'raw', 'logit'); Kit.state.set('space', null, null); }
  ['xs', 'ys'].forEach(function (k) { var v0 = Kit.state.get(k, null); if (v0 !== null && v0 !== 'raw' && v0 !== 'logit') Kit.state.set(k, null, null); });   // a URL value the switch lacks would loop the kit's init
  var lv0 = Kit.state.get('line', null); if (lv0 !== null && lv0 !== 'off' && lv0 !== 'steps' && lv0 !== 'axes') Kit.state.set('line', null, null);
  var lw0 = Kit.state.get('lw', null); if (lw0 !== null && lw0 !== 'equal' && lw0 !== 'bands') Kit.state.set('lw', null, null);
  var rs0 = Kit.state.get('resid', null); if (rs0 !== null && rs0 !== 'off' && rs0 !== 'on') Kit.state.set('resid', null, null);
  else if (Kit.state.get('space', null) !== null) Kit.state.set('space', null, null);
  var sb = document.getElementById('spacebar'), moreDet = document.getElementById('morecontrols');
  if (!moreDet && sb) {
    moreDet = document.createElement('details'); moreDet.id = 'morecontrols'; moreDet.className = 'about';
    moreDet.innerHTML = '<summary>More controls</summary><div class="kit-filter-row kit-static" id="moreswitches"></div><div class="kit-filter-row kit-static" id="morelevels"></div>';
    sb.parentNode.insertBefore(moreDet, sb); moreDet.appendChild(sb);
  }
  [['xs', CONTROL_WORDS.xs.label], ['ys', CONTROL_WORDS.ys.label]].forEach(function (ax) {   // a scale is logit or linear, never 'equal difficulty steps' (the project maintainers 13:0x 18 Sep)
    Kit.switchControl({ mount: sb,
      key: ax[0], label: ax[1],
      options: CONTROL_WORDS.scale,   // the project maintainers' 30 Sep word: the plain scale is 'normal' (logit | normal, each axis its own switch); 2026-09-15: the normal axis is the failure-level percent, not a share of tasks
      dflt: 'logit',
      onchange: function (v) {
        state[ax[0]] = v === 'raw' ? 'raw' : 'logit';
        if (sel) render();
      } });
  });
  state.xs = Kit.state.get('xs', 'logit') === 'raw' ? 'raw' : 'logit'; state.ys = Kit.state.get('ys', 'logit') === 'raw' ? 'raw' : 'logit';
  // FITTED LINE (the project maintainers' words of 14 Sep 2026 : the page may fit a linear map in whatever axes are set, not by default
  // but under more controls, which also hold a button that turns the fit off): one switch — Off | In difficulty steps (today's line, default) | In the axes as set
  Kit.switchControl({ mount: sb, key: 'line', label: 'Fitted line',
    options: [{ value: 'off', label: 'Off' }, { value: 'steps', label: 'In logit' }, { value: 'axes', label: 'In the axes as set' }],
    dflt: 'steps',
    onchange: function (v) { state.line = (v === 'off' || v === 'axes') ? v : 'steps'; if (sel) render(); } });
  var lv = Kit.state.get('line', 'steps'); state.line = (lv === 'off' || lv === 'axes') ? lv : 'steps';
  // the Fit move switch sits in the fold too (the project maintainers' word of 14 Sep 2026 : the move-from-the-cut control belongs under more controls)
  // LINE WEIGHTING (the fits' maintainers' proposal 2026-09-14 ; the curves page maintainers' decision : a selectable option beside the line of record, never the
  // default, labelled by construction; which line is of record follows the project maintainers' answer to the decision item): each dot weighted by its own 80% bands on both axes
  Kit.switchControl({ mount: sb, key: 'lw', label: 'Line weighting',
    options: [{ value: 'equal', label: 'Each dot equal' }, { value: 'bands', label: 'By the 80% uncertainty bands' }],
    dflt: 'equal',
    onchange: function (v) { state.lw = v === 'bands' ? 'bands' : 'equal'; if (sel) render(); } });
  state.lw = Kit.state.get('lw', 'equal') === 'bands' ? 'bands' : 'equal';
  // RESIDUAL VIEW (the project maintainers 2026-09-14 : the panel's number must be an honest goodness-of-fit of the drawn line — residual-based, no
  // correlation, no rank statistic): the misses against the line by fitted value, an inset on the plane, Off by default
  Kit.switchControl({ mount: sb, key: 'resid', label: 'Misses against the line',
    options: [{ value: 'off', label: 'Off' }, { value: 'on', label: 'On' }],
    dflt: 'off',
    onchange: function (v) { state.resid = v === 'on' ? 'on' : 'off'; if (sel) render(); } });
  state.resid = Kit.state.get('resid', 'off') === 'on' ? 'on' : 'off';
  var mvSw = document.querySelector('#chartcontrols .kit-switch[data-key="move"]'); if (mvSw) sb.appendChild(mvSw);
  // the straight x scale per capability definition (the difficulty maintainers' finding, 2026-09-14, on the project maintainers' question which x scale is natural); the selectors keep one
  // default on every definition — no control moves another (the project maintainers 09-09) — so the note tells the project maintainers which to pick
  var sn = document.createElement('p'); sn.id = 'spacenote'; sn.style.cssText = 'font-size:.85rem;color:#52514e;margin:.4rem 0 0;max-width:80ch';
  // difficulty 2026-09-14 : Haldane reads straight on the linear percent axis; uniform, Jeffreys and the capability crossing on difficulty steps; names bound from the files
  sn.textContent = 'Straight scale by definition: ' + CAP_KEYS.capC_z.name() + ' \u2014 linear; ' + CAP_KEYS.capC.name() + ', ' + CAP_KEYS.capC_j.name() + ' and ' + dName('x') + ' \u2014 logit.';
  sb.appendChild(sn);

  buildLevels();
  state.xdef = Kit.state.get('xdef', 'crossing'); if (/^D\d+$/.test(state.xdef)) state.xdef = 'crossing';   // a D option is a level, carried by a=
  state.move = Kit.state.get('move', 'off') === 'on' ? 'on' : 'off';   // fit-move arrows OFF by default (the project maintainers' word of 2026-09-14: fit-move off by default); URL move=on
  state.partial = Kit.state.get('partial', 'hide') === 'show' ? 'show' : 'hide';
  state.runs = state.runs || {};   // per-run shown/hidden, read as each run is merged (URL <state key>=hide)   // the third set shown by default (the project maintainers 22 Sep); URL run=hide   // partial arms hidden by default (the project maintainers 2026-09-07)
  // the estimator the page opens with is fixed BEFORE the chips are built, so their first order is the final one (the reference designer 2026-09-15: the chips flipped
  // between the reference order at build and the fitted order at the first render; one ordering means no flicker between the two)
  state.src = (function () { var v = Kit.state.get('src', bayesDefault() ? 'bayes' : 'project'); return v === 'bayes' && D.bay ? 'bayes' : 'project'; })();
  buildChips(); refreshPartialChips();   // coverage hovers and partial marks on the chips (the project maintainers 2026-09-07)
  hoverWire();
  wireDrag();
  render();
}

var srcCtl = null;
/* the Bayesian estimator is the default (the project maintainers 2026-09-03) wherever its posterior rows cover at least half the arms drawn;
 * under a dataset whose Bayesian source is thin (e.g. the combined pre-§1b wave, 22 of 55 arms) the reference estimator opens
 * by default and the frame line states the coverage — showing 40% of the arms by default would hide data the project maintainers asked to see */
function bayesDefault() { return !!(D.bay && D.shared && D.bay.rows.length * 2 >= D.shared.configs.length); }
function buildSrcSwitch() {
  srcMount.textContent = '';
  srcCtl = Kit.switchControl({ mount: srcMount, key: 'src',
    label: CONTROL_WORDS.src.label,
    options: [{ value: 'project', label: houseName() },
              { value: 'bayes', label: CONTROL_WORDS.src.bayes }],
    dflt: bayesDefault() ? 'bayes' : 'project',   // the project maintainers' word of 2026-09-03: the Bayesian fit privileged for averages — Bayesian by default where posteriors cover at least half the drawn arms; project one click away
    onchange: function (v) {
      var was = state.src;
      state.src = v;
      if (sel && v !== was) { render(); frameLine(); }   // the frame line's run clause follows the source (the run is read from Bayesian fits only)
    } });
}

/* MISSING CHAINS (the difficulty maintainers, 2026-09-10 : wave 2 + wave 2 parked carries NO default fitted layer until a pool wave is cut on
 * the project maintainers' word): an option whose chain this dataset lacks stays in place, unselectable, with the reason as its hint — the order never changes */
function syncMissingChains() {
  if (!D || !D.shared) return;
  var miss = (D.ds && D.ds.missing) || {};
  [['src', 'bayes', !!D.bay, miss.bayes || 'no Bayesian crossing tables for this dataset'],
   ['view', 'ridges', !!D.bay, miss.bayes || 'no posterior ridges for this dataset'],
   ['def', 'median', !!D.med, miss.chain_median || 'no median-task chain for this dataset']].forEach(function (L) {
    var b = document.querySelector('.kit-switch[data-key="' + L[0] + '"] button[data-value="' + L[1] + '"]'); if (!b) return;
    if (L[2]) { if (b.dataset.missTitle) { b.disabled = false; b.removeAttribute('aria-disabled'); b.title = ''; delete b.dataset.missTitle; } }
    else { b.disabled = true; b.setAttribute('aria-disabled', 'true'); b.title = L[3]; b.dataset.missTitle = '1'; }
  });
}

/* ---------------- render ---------------- */

var heldTimer = null;
function render() {
  syncPresets(); syncMissingChains();
  if (!heldTimer) { heldCheck(); heldTimer = setInterval(heldCheck, 120000); }
  if (!elA || !sel) return;      // boot not finished
  mountExport();
  syncWdLock();
  syncXdefLock();
  if (state.view === 'ridges') { renderRidges(); renderOpusFold(); return; }
  if (EXPORTING) { renderScatter(); renderOpusFold(); return; }   // the export sets its own window
  // 2 Oct 2026 (the project maintainers' word of 11:2x UK; the structure maintainers' section: a page's axes fit the data): the figure's axes crop to the drawn points — pass one at the
  // set's whole frame reads the drawn extent, pass two draws inside one common range for both axes (equal scales, the diagonal), padded 6%, never beyond the
  // set's frame; while a level drags the window holds (a point that leaves it is an open bound at the edge, never hidden) and re-crops when the drag ends
  var sweeping = dragActive || !!playTimer;
  if (!sweeping || !CROP) { LIMX = null; LIMY = null; renderScatter(); CROP = cropRange(EXT, LIM); }   // the plane module's window rule, the side-by-side page's panels crop by the same function
  if (CROP) { LIMX = CROP.slice(); LIMY = CROP.slice(); try { renderScatter(); } finally { LIMX = null; LIMY = null; } }
  renderOpusFold();
}

/* ---------------- ridges view (posterior; median-task chain) --- */
/* OPUS PAIR FOLD (the project maintainers' question of 10 Sep 2026 : the posterior ridges read Opus 5 thinking as the more reliable of
 * the pair while the scatter reads it as the less reliable — to be investigated):
 * ONE figure with both readings for the two arms on one difficulty axis and the verdict in words, drawn from the served rows;
 * hidden when either arm is absent or unfitted in the dataset shown. Ridge = posterior of the MEDIAN-TASK D99 (d1 draws);
 * scatter = the point of record, the AVERAGE-RATE D99 (levels_avg). */
var OPUS_PAIR = ['claude-opus-5', 'claude-opus-5-thinking'];
function tableAt(lt, levLogit) {   // one levels table read at a level -> {z, lo, hi}, or null when censored / out of range there
  var LV = D.bay && (D.bay.lev_logit || (D.bay.lev_fail || []).map(logit)); if (!lt || !LV || !LV.length) return null;
  if (levLogit < LV[0] - 1e-9 || levLogit > LV[LV.length - 1] + 1e-9) return null;
  var lo_i = 0, hi_i = LV.length - 1;
  while (hi_i - lo_i > 1) { var mm = (lo_i + hi_i) >> 1; if (LV[mm] < levLogit) lo_i = mm; else hi_i = mm; }
  if (lt.kind[lo_i] !== 0 || lt.kind[hi_i] !== 0) return null;
  var t = (levLogit - LV[lo_i]) / (LV[hi_i] - LV[lo_i]);
  var ip = function (a) { return a && a[lo_i] != null && a[hi_i] != null ? a[lo_i] + t * (a[hi_i] - a[lo_i]) : null; };
  return { z: ip(lt.mid), lo: ip(lt.lo), hi: ip(lt.hi) };
}
function renderOpusFold() {
  var fold = document.getElementById('opusfold'), fig = document.getElementById('opusfig'), txt = document.getElementById('opustext');
  if (!fold || !fig || !txt || !D || !D.shared) return;
  var idx = OPUS_PAIR.map(function (id) { var k = -1; D.shared.configs.forEach(function (c, i) { if (c.id === id) k = i; }); return k; });
  var rows = idx.map(function (i) { return (i >= 0 && D.bay && D.bayById && D.bayById[D.shared.configs[i].id]) || null; });
  if (idx[0] < 0 || idx[1] < 0 || !rows[0] || !rows[1] || !D.bay.kde_grid) { fold.hidden = true; return; }
  fold.hidden = false;
  var l1 = logit(0.01), g = D.bay.kde_grid;
  var arms = idx.map(function (i, k) { var c = D.shared.configs[i], r = rows[k]; return { c: c, r: r, avg: tableAt(r.levels_avg, l1), ridge: r.d1 }; });
  var zs = [];
  arms.forEach(function (a) { if (a.avg && a.avg.z != null) zs.push(a.avg.lo != null ? a.avg.lo : a.avg.z, a.avg.hi != null ? a.avg.hi : a.avg.z); if (a.ridge) zs.push(a.ridge.cri80_z[0], a.ridge.cri80_z[1]); });
  if (!zs.length) { fold.hidden = true; return; }
  var zlo = Math.min.apply(null, zs) - 0.6, zhi = Math.max.apply(null, zs) + 0.6;
  var W = 860, H = 240, ML2 = 150, MR2 = 24, MT2 = 28, RH = 74, xw = W - ML2 - MR2;
  var X = function (z) { return ML2 + (z - zlo) / (zhi - zlo) * xw; };
  var out = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="Claude Opus 5 and Claude Opus 5 thinking: the ridge and the scatter readings of D99 on one difficulty axis">';
  [10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 98].forEach(function (v) { var z = logit(v / 100); if (z < zlo || z > zhi) return;
    out += '<line x1="' + X(z).toFixed(1) + '" y1="' + MT2 + '" x2="' + X(z).toFixed(1) + '" y2="' + (MT2 + 2 * RH) + '" stroke="#e0d9c8" stroke-width="0.6"/>'
         + '<text x="' + X(z).toFixed(1) + '" y="' + (MT2 + 2 * RH + 16) + '" text-anchor="middle" font-size="11" fill="#52514e">' + v + '%</text>'; });
  out += '<text x="' + (ML2 + xw / 2) + '" y="' + (H - 6) + '" text-anchor="middle" font-size="12" fill="#52514e">difficulty at which failures reach 1% (percent of the scale)</text>';
  arms.forEach(function (a, k) {
    var y0 = MT2 + (k + 1) * RH - 12, col = a.c.color, dash = a.c.think ? ' stroke-dasharray="5 3"' : '';
    var kd = a.ridge.kde, mx = Math.max.apply(null, kd) || 1, d = '', pen = false;
    for (var j = 0; j < g.length; j++) { if (g[j] < zlo || g[j] > zhi) continue; d += (pen ? 'L' : 'M') + X(g[j]).toFixed(1) + ' ' + (y0 - (kd[j] / mx) * (RH * 0.78)).toFixed(1); pen = true; }
    if (pen) out += '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="1.4"' + dash + '/>';
    var zm = a.ridge.median_z;
    out += '<line x1="' + X(zm).toFixed(1) + '" y1="' + (y0 - RH * 0.84).toFixed(1) + '" x2="' + X(zm).toFixed(1) + '" y2="' + y0 + '" stroke="' + col + '" stroke-width="1" stroke-dasharray="2 2"/>'
         + '<text x="' + X(zm).toFixed(1) + '" y="' + (y0 - RH * 0.86).toFixed(1) + '" text-anchor="middle" font-size="10" fill="' + col + '">ridge ' + fmtPct(zm, 0) + '</text>';
    if (a.avg && a.avg.z != null) {
      if (a.avg.lo != null && a.avg.hi != null) out += '<line x1="' + X(a.avg.lo).toFixed(1) + '" y1="' + (y0 + 12) + '" x2="' + X(a.avg.hi).toFixed(1) + '" y2="' + (y0 + 12) + '" stroke="' + col + '" stroke-width="2"/>';
      out += a.c.think ? '<circle cx="' + X(a.avg.z).toFixed(1) + '" cy="' + (y0 + 12) + '" r="5.5" fill="#fcfaf3" stroke="' + col + '" stroke-width="1.8"/>'
                       : '<circle cx="' + X(a.avg.z).toFixed(1) + '" cy="' + (y0 + 12) + '" r="5.5" fill="' + col + '" stroke="#fcfaf3" stroke-width="1"/>';
      out += '<text x="' + (X(a.avg.z) + 9).toFixed(1) + '" y="' + (y0 + 16) + '" font-size="10" fill="' + col + '">scatter ' + fmtPct(a.avg.z, 0) + '</text>';
    }
    out += '<text x="' + (ML2 - 8) + '" y="' + (y0 - 4) + '" text-anchor="end" font-size="12" fill="#52514e">' + a.c.label + '</text>'
         + '<line x1="' + ML2 + '" y1="' + y0 + '" x2="' + (W - MR2) + '" y2="' + y0 + '" stroke="#c9c2b2" stroke-width="0.6"/>';
  });
  out += '<text x="' + ML2 + '" y="16" font-size="11" fill="#52514e">line = the spread of the median-task D99 across the fitted draws · dot with bar = the dot drawn on the scatter view (average-rate D99, 80% uncertainty band)</text></svg>';
  fig.innerHTML = out;
  var A = arms[0], B = arms[1];
  if (!A.avg || A.avg.z == null || !B.avg || B.avg.z == null) { txt.textContent = 'One of the two models has no average-rate D99 inside its fitted range at this dataset, so the two readings cannot be compared here.'; return; }
  var P = function (z) { return fmtPct(z, 0); };
  var band = function (a) { return a.lo != null && a.hi != null ? ' [' + P(a.lo) + ', ' + P(a.hi) + ']' : ''; };   // the project maintainers' word of 29 Sep 20:0x: a number's interval prints bare as [x, y] after it, no label
  var moreAvg = A.avg.z > B.avg.z ? A : B, lessAvg = moreAvg === A ? B : A;
  var moreRidge = A.ridge.median_z > B.ridge.median_z ? A : B, lessRidge = moreRidge === A ? B : A;
  var overlap = A.avg.lo != null && B.avg.lo != null && Math.max(A.avg.lo, B.avg.lo) <= Math.min(A.avg.hi, B.avg.hi);
  var tA = A.r.tau && A.r.tau.median, tB = B.r.tau && B.r.tau.median;
  var wide = tA != null && tB != null ? (tA > tB ? A : B) : null;
  var spread = wide ? ' The ' + wide.c.label + ' model spreads more from task to task (spread ' + Math.max(tA, tB).toFixed(1) + ' against ' + Math.min(tA, tB).toFixed(1) + ' difficulty units): a heavier tail of tasks it keeps failing pulls its average failure rate up and its average-rate crossing down, while its typical task is the safer one.'
                    : ' The model with the wider spread from task to task has a heavier tail of tasks it keeps failing, which pulls its average failure rate up and its average-rate crossing down while its typical task stays safer.';
  var cens = (A.ridge.p_censored > 0.05 || B.ridge.p_censored > 0.05)
    ? ' Part of the D99 draws are censored here (' + Math.round(100 * A.ridge.p_censored) + '% and ' + Math.round(100 * B.ridge.p_censored) + '%); read the ridges with that share in mind.'
    : ' This is not a censoring effect: no draw of either model’s D99 is censored; the open triangles on the plane concern D50.';
  var cov = '';
  [A, B].forEach(function (a) { var cv = coverageOf(a.c); if (cv && cv.tasks < cv.of) cov += ' ' + a.c.label + ' has attempts on ' + Math.round(cv.share * 100) + '% of this set\u2019s tasks; the tasks it did not attempt (its refusals) are out of its fit, which favours it a little under the average-rate reading.'; });
  txt.textContent = 'Ridge here = the posterior of the median-task D99, the quantity the ridges view used to draw under every definition: the difficulty at which a typical task is failed less than once in a hundred. Scatter = the default point, the average-rate D99: the difficulty at which the average failure rate over tasks reaches 1%; that is the default reliability. '
    + 'Under the default definition ' + A.c.label + ' reads ' + P(A.avg.z) + band(A.avg) + ' and ' + B.c.label + ' ' + P(B.avg.z) + band(B.avg) + ', so ' + moreAvg.c.label + ' is the more reliable' + (overlap ? ', and the two uncertainty bands overlap: the ordering is suggestive, not settled.' : ', and the two uncertainty bands do not overlap: the difference is statistically significant.')
    + ' On the ridges ' + moreRidge.c.label + ' is the higher (' + P(moreRidge.ridge.median_z) + ' against ' + P(lessRidge.ridge.median_z) + '): on a typical task it is the safer model.'
    + (moreAvg !== moreRidge ? ' Both readings are right about different things.' : '') + spread + cens + cov
    + ' Trust the scatter for reliability, the default definition; read the median-task ridge as the typical-task view. The ridges view itself now follows the definition switch: under the average-rate definition it shows the 80% uncertainty band of the same crossing the dot marks, so the two views agree; the median-task ridges remain under the Median definition where that chain is served.';
}

function ridgeCentre(r, lev) {   // the crossing median at the level shown, under the definition shown, for ordering the ridges
  var t = tableAt(state.def === 'average' ? r.levels_avg : r.levels, logit(lev)); if (t && t.z != null) return t.z;
  var b = state.def === 'average' ? (lev === 0.5 ? r.d50_avg : r.d1_avg) : null; b = b || (lev === 0.5 ? r.d50 : r.d1); return b ? b.median_z : -Infinity;
}
function renderRidges() {
  if (playBtn) { playBtn.disabled = true; playBtn.title = 'the sweep moves the scatter; switch the view back to use it'; }
  var chart = document.getElementById('chart');
  var visible = Array.from(sel).filter(function (i) { return !isHidden(i); }).sort(function (a, b) { return a - b; });   // partial arms hidden unless shown
  var skipped = visible.filter(function (i) { return !D.bayById[D.shared.configs[i].id]; }).length;
  var rows = visible.filter(function (i) { return !!D.bayById[D.shared.configs[i].id]; }).map(function (i) {
    return { i: i, r: D.bayById[D.shared.configs[i].id] };
  }).sort(function (a, b) { return capOrder([a.i, b.i])[0] === a.i ? -1 : 1; });   // ONE ORDER (the project maintainers 2026-09-15): the same capability order as the chips, lowest first at the top
  var g = D.bay.kde_grid, avgDef = state.def === 'average';
  /* the drawing GROWS with the row count and the viewBox follows —
   * nothing can render outside the screen (the review found 49-row
   * ridges spilling past the viewport under a fixed height). The
   * ridges view uses its OWN wide left gutter for the labels (the
   * proven layout of the old ridge page) and its own x transform;
   * KDE polylines are clipped to the axis limits. */
  layout();
  var rh = 24, RML = NARROW ? 120 : 195;
  var Hr = MT + (rows.length + 1) * rh + MB;
  chart.setAttribute('viewBox', '0 0 ' + W + ' ' + Hr);
  var rzx = function (z) {
    var L = limT(state.xs === 'raw');
    return RML + (tf(z, state.xs === 'raw') - L[0]) / (L[1] - L[0])
      * (W - RML - MR);
  };
  var out = '';
  var rxt = state.xs === 'raw' ? RAW_TICKS : LOGIT_TICKS;
  rxt.forEach(function (v) {
    var z = logit(Math.min(0.9999, Math.max(0.0001, v / 100)));
    var L = limT(state.xs === 'raw');
    if (tf(z, state.xs === 'raw') <= L[0]
        || tf(z, state.xs === 'raw') >= L[1]) return;
    out += '<line x1="' + rzx(z) + '" y1="' + MT + '" x2="' + rzx(z)
      + '" y2="' + (Hr - MB) + '" stroke="#e0d9c8" '
      + 'stroke-width="0.6"/>'
      + '<text x="' + rzx(z) + '" y="' + (Hr - MB + 17)
      + '" text-anchor="middle" fill="#52514e" font-size="11">'
      + v + '%</text>';
  });
  out += '<text x="' + (RML + (W - RML - MR) / 2) + '" y="'
    + (Hr - 6) + '" text-anchor="middle" fill="#52514e" '
    + 'font-size="12">task difficulty</text>';
  rows.forEach(function (row, k) {
    var y0 = MT + (k + 1) * rh;
    var c = D.shared.configs[row.i];
    // RIDGES FOLLOW THE LEVELS (the project maintainers' word of 2026-09-10 ≈: the ridges recomputed automatically when x and y change):
    // filled = the crossing at the x level, outlined = the crossing at the y level; at the baked 50% and 1% levels the true posterior shape
    // (crossing draws), at any other level the exact median and 80% band from the fitted tables (a shape there would need draws the fits do not export)
    var drawnY = null;
    [[state.a / 100, true], [state.c / 100, false]].forEach(function (Q) {
      var lev = Q[0], filled = Q[1], baked = filled ? Math.abs(lev - 0.5) < 1e-9 : Math.abs(lev - 0.01) < 1e-9;
      var blk = baked ? (avgDef ? (filled ? row.r.d50_avg : row.r.d1_avg) : (filled ? row.r.d50 : row.r.d1)) : null;
      if (!filled) drawnY = blk && blk.kde ? blk : null;
      if (blk && blk.kde) {
        var kd = blk.kde, mx = Math.max.apply(null, kd) || 1, d = '', pen = false, z0 = null, zN = null;
        for (var jj = 0; jj < g.length; jj++) {
          if (g[jj] < LIM[0] || g[jj] > LIM[1]) { continue; }
          if (z0 === null) z0 = g[jj];
          zN = g[jj];
          d += (pen ? 'L' : 'M') + rzx(g[jj]).toFixed(1) + ' ' + (y0 - (kd[jj] / mx) * (rh * 0.92)).toFixed(1);
          pen = true;
        }
        if (!pen) return;
        if (filled) { d += 'L' + rzx(zN).toFixed(1) + ' ' + y0.toFixed(1) + 'L' + rzx(z0).toFixed(1) + ' ' + y0.toFixed(1) + 'Z'; out += '<path d="' + d + '" fill="' + c.color + '" fill-opacity="0.45" stroke="none" data-mark/>'; }
        else out += '<path d="' + d + '" fill="none" stroke="' + c.color + '" stroke-width="1.2"' + (c.think ? ' stroke-dasharray="5 3"' : '') + ' data-mark/>';
        return;
      }
      var t = tableAt(avgDef ? row.r.levels_avg : row.r.levels, logit(lev));
      if (!t || t.z == null) return;
      var lo = t.lo != null ? Math.max(LIM[0], Math.min(LIM[1], t.lo)) : t.z, hi = t.hi != null ? Math.max(LIM[0], Math.min(LIM[1], t.hi)) : t.z, zc = Math.max(LIM[0], Math.min(LIM[1], t.z));
      var h = filled ? rh * 0.5 : rh * 0.7, yb = y0 - (filled ? rh * 0.62 : rh * 0.72);
      out += filled
        ? '<rect x="' + rzx(lo).toFixed(1) + '" y="' + yb.toFixed(1) + '" width="' + Math.max(1.5, rzx(hi) - rzx(lo)).toFixed(1) + '" height="' + h.toFixed(1) + '" fill="' + c.color + '" fill-opacity="0.45" stroke="none" data-mark/>'
        : '<rect x="' + rzx(lo).toFixed(1) + '" y="' + yb.toFixed(1) + '" width="' + Math.max(1.5, rzx(hi) - rzx(lo)).toFixed(1) + '" height="' + h.toFixed(1) + '" fill="none" stroke="' + c.color + '" stroke-width="1.2"' + (c.think ? ' stroke-dasharray="5 3"' : '') + ' data-mark/>';
      out += '<line x1="' + rzx(zc).toFixed(1) + '" y1="' + yb.toFixed(1) + '" x2="' + rzx(zc).toFixed(1) + '" y2="' + (yb + h).toFixed(1) + '" stroke="' + c.color + '" stroke-width="1.6"/>';
    });
    var ltxt = c.label + (drawnY && drawnY.p_censored > 0.05
      ? ' · ' + Math.round(drawnY.p_censored * 100) + '% cens.'
      : '');
    out += '<text x="' + (RML - 6) + '" y="' + (y0 - 3)
      + '" text-anchor="end" font-size="9.5" fill="#52514e"'
      + (ltxt.length > 34
         ? ' textLength="' + (RML - 14)
           + '" lengthAdjust="spacingAndGlyphs"' : '')
      + '>' + ltxt + '</text>';
  });
  document.getElementById('plotg').innerHTML = out;
  document.getElementById('trackg').style.display = 'none';
  (document.getElementById('fitline') || document.createElement('div')).textContent = '';
  var bakedX = Math.abs(state.a - 50) < 1e-9, bakedY = Math.abs(state.c - 1) < 1e-9;
  var anyShape = rows.some(function (row) { return avgDef ? (row.r.d50_avg && row.r.d1_avg) : (row.r.d50 && row.r.d1); });
  var shapeNote = (bakedX && bakedY && anyShape) ? 'true posterior shapes (crossing draws)'
    : (!anyShape ? 'the 80% uncertainty band with its median from the fitted tables (this set has no crossing draws)'
       : 'the 80% uncertainty band with its median at levels other than 50% and 1% (a shape there would need draws the fits do not export); shapes at 50% and 1%');
  (document.getElementById('narrate') || document.createElement('div')).textContent = 'the spread of the same crossings the dots mark, across the fitted draws (' + (avgDef ? 'average-rate' : 'median-task') + ' definition): filled = the crossing at the x level ' + state.a + '%, outlined = at the y level ' + state.c + '% — ' + shapeNote + ' · ' + visible.length + ' of ' + D.shared.configs.length + ' models · move x or y and the view follows' + (bakedX && bakedY && anyShape ? ' · censored draws are not in a shape (the label notes the fraction)' : '');
  notes();
  stamp();
  paintChips();
}

/* ---------------- narration / notes / stamp -------------------- */
function vocabNote() {   // reserved slot (#vocabnote, fixed height): the adopted words name only D50 and D99
  var el = document.getElementById('vocabnote'); if (!el) return;
  el.textContent = isCap()
    ? dName('y') + ': the difficulty at which a model\u2019s solve chance is ' + fmtLev(100 - state.c) + '%.'
    : dName('x') + ' and ' + dName('y') + ': the difficulty at which a model\u2019s solve chance is ' + fmtLev(100 - state.a) + '% and ' + fmtLev(100 - state.c) + '%.';
}
function avgWhiskerLabel() {   // the average-rate whisker label follows what the drawn arms carry, not the artifact-level default
  var rows = (D.bay && D.bay.rows) || [], nEx = rows.filter(function (r) { return r.avg_source === 'exact'; }).length;
  if (rows.length && nEx === rows.length) return '80% uncertainty band (crossing draws, average-rate)';
  if (!nEx) return D.bay ? D.bay.whisker_label_avg : '';
  return '80% uncertainty band (crossing draws where exported; read off the fit\u2019s average-rate curves otherwise)';
}
function narrate(visible, nFull) {
  var src = state.src === 'bayes'
    ? 'Bayesian posterior' : houseName().toLowerCase();
  var unfitNote = '';
  var medNote = '';
  if (state.def === 'median' && state.src === 'project'
      && visible.length) {
    // level-dependent bootstrap-support honesty, worst visible config
    var worst = null, worstI = null;
    var gA = Math.round(gidxOf(logit(state.a / 100)));
    var gC = Math.round(gidxOf(logit(state.c / 100)));
    visible.forEach(function (i) {
      var df = D.medById[D.shared.configs[i].id].dfrac;
      var v = Math.min(
        df[Math.max(0, Math.min(df.length - 1, gA))],
        df[Math.max(0, Math.min(df.length - 1, gC))]);
      if (worst === null || v < worst) { worst = v; worstI = i; }
    });
    if (worst !== null)
      medNote = ' · bootstrap support at this pair: down to ' + Math.round(worst * 100) + '% of resamples for some models (per-dot fractions on hover)';   // no arm singled out (the project maintainers 2026-09-16: no ordering of things)
  }
  (document.getElementById('narrate') || document.createElement('div')).textContent = (bayesNote() ? bayesNote() + ' \u00b7 ' : '')
    + (isCap()
      ? 'x = Capability C (metrics-report definition, difficulty\u2019s '
        + 'counting chain) · y: ' : '')
    + (state.def === 'median' ? 'median-task chain'
      : 'average-rate chain'
        + (state.src === 'bayes'
           && (D.bay.estimator_version_avg || '')
              .indexOf('band inversion') >= 0
           ? ' (read off the fit\u2019s curves, interim)' : ''))
    + ' · ' + src + (isCap() ? ' · horizontal: ' + CAP_KEYS[state.xdef].name() + ' (level-free)' : ' · horizontal level ' + state.a + '%') + ' · vertical level '
    + state.c + '% · hold ' + (isCap() ? 'n/a (the Capability view is level-free)' : ({ k: 'K', a: 'horizontal level', c: 'vertical level' })[state.hold]) + unfitNote
    + (undrawn.length ? (function () { var rs = undrawn.map(function (s) { var m = /\(([^()]*)\)$/.exec(s); return m ? m[1] : ''; }); var same = rs[0] && rs.every(function (r) { return r === rs[0]; }); return same && undrawn.length > 3 ? ' · ' + undrawn.length + ' of ' + D.shared.configs.length + ' models not drawn: ' + rs[0] : ' · ' + undrawn.length + ' not drawn: ' + undrawn.join('; '); })() : '')
    + (beyondArms.length ? ' \u00b7 not drawn, crossing beyond the hardest task at these levels: ' + beyondArms.map(function (i) { return D.shared.configs[i].label; }).join(', ') : '')

    + ' · whiskers ' + state.w
    + (state.w !== 'on' ? ''
       : state.src === 'bayes'
         ? ' · ' + (state.def === 'average'
             ? avgWhiskerLabel() : D.bay.whisker_label)
       : state.def === 'average'
         ? ' (' + (state.wd === 'adj' ? 'correlation-adjusted'
                                      : 'independence') + ' widths)'
         : '')
    + ' · ' + visible.filter(function (i) { return !isRun(i); }).length + ' of ' + mainConfigs().length
    + ' models (' + nFull
    + (state.src === 'bayes'
       ? ' with both crossings in the fitted range)'
       : ' fully measured at this pair)')
    + medNote;
}
var CAPC_CHECKS_RUNNING = false;  // gate battery green 2026-09-01 (walk + user-session + value identity)
function notes() {
  var el = document.getElementById('notes') || document.createElement('div');   // no warnings list on the face (24 Sep)
  el.textContent = '';
  function warn(html) {
    var w = document.createElement('div');
    w.className = 'warn';
    w.innerHTML = html;
    el.appendChild(w);
  }
  if (state.src === 'bayes') { var cs = D.shared.configs.filter(cleanedScope); if (cs.length) warn('Cleaned fits with a partial scope: ' + cs.map(function (c) { return c.label + ' \u2014 ' + cleanedScope(c); }).join('; ') + '.'); }
  if (state.src === 'bayes') { var ag = D.shared.configs.filter(asGraded); if (ag.length) warn('The fitted curves use the attempts as first graded (the cleaned fits land with the fits\u2019 next release): ' + ag.map(function (c) { return c.label; }).join(', ') + '. the reference estimator already carries the adopted cleaning.'); }
  var ab = D.bay && D.bay.disclosures && D.bay.disclosures.abandoned_cut;   // difficulty 2026-09-10: a cancelled cut's fits are not drawn; the served cut stands
  if (ab && ab.plain && state.src === 'bayes') warn(ab.plain);
  var noted = D.shared.configs.filter(function (c) { return armNote(c); });
  if (noted.length) warn('Model notes: ' + noted.map(function (c) { return c.label + ' \u2014 ' + armNote(c); }).join('; ') + '.');   // per-arm disclosures from the bundle, beside the numbers
  var wa = withheldArms();
  if (wa.length) warn('Not shown: ' + wa.map(function (i) { var c = D.shared.configs[i]; return c.label + ' \u2014 ' + WITHHELD[c.id]; }).join('; ') + '.');   // the project maintainers 2026-09-09: the cut-at-cap arm, named with the project maintainers' reason
  var pa = partialArms();
  if (pa.length) {   // the project maintainers 2026-09-07: partial arms hidden by default, named here; the switch shows them greyed
    var pnames = pa.map(function (i) { var c = D.shared.configs[i], cv = coverageOf(c); return c.label + ' (' + Math.round(cv.share * 100) + '%)'; });
    warn((partialShown() ? 'Partial models shown greyed and kept out of the fit' : 'Partial models hidden') + ' \u2014 attempts on fewer than 90% of this set\u2019s tasks: ' + pnames.join(', ') + (partialShown() ? '.' : '. The Partial models switch shows them.'));
  }
  // definition of record (difficulty, Definitions ledger 2026-09-04 ): reliability of record = the AVERAGE-RATE D99;
  // the fits' maintainers' exact crossing draws (the `levels` tables) are the MEDIAN-TASK crossing. Said in the notes, not as a glyph on the axis.
  if (state.src === 'bayes' && D.bay) {
    var nEx = D.bay.rows.filter(function (r) { return r.avg_source === 'exact'; }).length, nAll = D.bay.rows.length;
    warn(state.def === 'average'
      ? 'Bayesian reliability shown = the average-rate D99 (the default reliability): ' + (nEx === nAll ? 'exact crossing draws for every model.' : nEx ? 'exact crossing draws for ' + nEx + ' of ' + nAll + ' models; the rest read off the fit\u2019s average-rate curves (an interim estimator; the served set predates the fits\u2019 export switch \u2014 those numbers move at the switch, per model, announced).' : 'read off the fit\u2019s pointwise average-rate curves \u2014 an interim estimator until the fits\u2019 maintainers exports exact average-rate crossing draws; the numbers move at that switch, per model, announced.')
      : 'Median-task definition: exact crossing draws from the fits\u2019 levels tables; the default reliability is the average-rate D99 (the \u201cAverage rate\u201d definition), one to two steps of the difficulty scale easier for most models.');
  }
  // Definitions caveat (the difficulty maintainers 2026-09-04, bound not typed; the fit methods' maintainers' spec 04m): the served fit's bias on arms with concentrated failures
  if (state.src === 'bayes' && D.bay) {
    warn('Reliability and Bayesian capability come from the served Gaussian-task-effect fit; on models with concentrated failures it places D99 too early by up to 1.3 steps of the difficulty scale and D50 about 0.5 too late (the bias note); the count-average reading beside them is the check.');
  }
  var flags = D.shared.artifact_flags;
  if (flags) {
    var names = Object.keys(flags.by_cfg).map(function (id) {
      var c2 = D.shared.configs.find(function (c3) { return c3.id === id; });
      return c2 ? c2.label : id;
    });
    warn('\u2020 Artifact defect (spec 2026-09-02a): positions for '
      + names.join(', ') + ' are NON-QUOTABLE \u2014 their fits ingest '
      + 'defect-flagged cells; dots drawn faded with a red dashed ring '
      + 'until the store heals. ' + (flags.stamp || ''));
  }
  var SPACING_CHECKS_RUNNING = false;  // battery green 2026-09-01 (walk + user-session + 7/7 state facts)
  if ((state.xs === 'raw' || state.ys === 'raw') && SPACING_CHECKS_RUNNING) {
    warn('New spacing toggle \u2014 checks running. Went live on '
      + 'the ship-first decision; the gate battery runs against '
      + 'it and fixes land in place. Spacing changes where things sit, '
      + 'never what they are \u2014 every reading is identical in both '
      + 'spacings.');
  }
  if (isCap()) {
    var capw = capBlock() && capBlock().by_cfg[
      D.shared.configs[0].id].ci80_z
      ? ' Whiskers: 80% uncertainty band (bootstrap: task draw, finite attempts, '
        + 'and level re-estimation captured jointly; the model roster is '
        + 'held fixed by construction \u2014 asymmetric whiskers near the '
        + 'floor/ceiling are real, not an error).'
      : '';
    warn((CAPC_CHECKS_RUNNING
        ? 'New option — checks running. This axis went live on '
          + 'the ship-first decision; the full gate battery is '
          + 'running against it and fixes land in place. '
        : '')
      + 'The two capability definitions (fitted D50 \u00b7 '
      + 'Capability C) agree closely today \u2014 visible divergence '
      + 'between them is exactly the alarm the '
      + 'metrics report '
      + 'describes; this toggle is that watch.' + capw);
  }
  if (state.view === 'ridges' || state.src === 'bayes') {
    // gap range from the ARTIFACT at render, censor-graded (decision
    // 2026-08-30: narration inherits the geometry's censor semantics
    // — quoted ranges include only <5%-censored arms, exclusion
    // named inline; the thresholds live in the artifact booleans)
    var gaps = D.bay.rows.filter(function (r) {
      return r.gap_range_grade;
    }).map(function (r) { return r.d50.median_z - r.d1.median_z; });
    var nEx = D.bay.rows.length - gaps.length;
    var glo = Math.min.apply(null, gaps).toFixed(1);
    var ghi = Math.max.apply(null, gaps).toFixed(1);
    warn('Bayesian reading: soft-chosen (decision of 28 Aug) — '
      + 'never "official". Prior-sensitivity checks one click away: '
      + 'the explanation site and the '
      + 'prior-vs-posterior fan + HalfNormal(5) re-fit in '
      + 'the exposition. The '
      + 'physical content of this scatter is each model\'s '
      + 'GAP between the two crossings: [' + glo + ', ' + ghi + ']'
      + ' steps of the difficulty scale over the ' + gaps.length
      + ' models with <5% censored deep-crossing mass (' + nEx
      + ' censoring-heavy models excluded from the range; per-model '
      + 'fractions on hover) — much of the correlation is shared '
      + 'construction.');
  }
  if (state.view === 'scatter')
    warn('Reading the drawn slope: it is instrument-loaded in BOTH '
      + 'directions — measurement error attenuates it toward zero '
      + 'while difficulty-axis edge compression inflates it (a true '
      + 'slope of 1 reads ~1.19 through the same pipeline) — so '
      + 'neither above nor below 1 is physical without the '
      + 'corrections (the '
      + 'estimation page, the why-linear '
      + 'study).');
  if (state.def === 'median' && state.src === 'project')
    warn('Median-task chain at deep levels: crossings below the '
      + 'per-task measurement floor are BOUNDS (open triangles '
      + 'pointing toward the uncertain side), never interpolated '
      + 'through censored bins; the average-rate chain reaches deep '
      + 'levels by pooling where the median chain cannot at 128 '
      + 'attempts per task.');
}
/* completeness gate (the maintainers, frozen 2026-09-02): withheld arms named on the stamp */
var BENCH_NAME = { humaneval: 'wave 1', mbpp: 'wave 1' };   // never the source names (the project maintainers 2026-09-16)
function sampledNote(f) {
  if (!f.n_arms_sampled || f.n_arms_sampled === f.population_M) return '';
  var wh = f.partial_arms_withheld || [], byb = f.n_arms_by_benchmark || {};
  var pending = Object.keys(byb).filter(function (b) { return byb[b] < f.n_arms_sampled; }).map(function (b) { return BENCH_NAME[b] || 'wave 1'; }).filter(function (v, i, a) { return a.indexOf(v) === i; });
  var reasons = f.withheld_reasons || {};
  var parts = wh.map(function (x) { var r = reasons[x]; return x.replace(/^[^/]+\//, '') + (r ? ' \u2014 ' + String(r).split(' (')[0] : ''); });   // reason from the handoff stamp, literal first clause
  var unexplained = wh.some(function (x) { return !reasons[x]; });
  return ' (' + f.n_arms_sampled + ' sampled \u00b7 ' + wh.length + ' withheld: ' + parts.join(', ')
    + (unexplained ? (pending.length ? ', ' + pending.join(' + ') + ' pending' : ', a benchmark pending') : '') + ')';
}
/* FRAME LINE (the maintainers's presentation roster, 2026-09-02): a visible "frame as of" line
 * under the banner, with a LIVE comparison against the board tool's manifest — so a reader
 * who sees 53 arms here and 56 on /failure-vs-difficulty today reads why, instead of a
 * silent mismatch. Static part always; the comparison only when the fetch answers. */
function asOf(ts) {   // "7 Sep 02:23" in plain words (the project maintainers 2026-09-07: no Zulu times); inputs older than 36 h are named stale (lead, 2026-09-04 )
  var s = String(ts || ''), t = Date.parse(s), out = plainTs(s);
  if (isFinite(t)) { var ageH = (Date.now() - t) / 36e5; if (ageH > 36) out += ' (inputs unchanged for ' + Math.round(ageH / 24) + ' days)'; }
  return out;
}
function bayesNote() {   // Bayesian coverage of this view, for the readout fold-out: arms with posteriors, interim count and wave, which estimator opens
  if (!(D.bay && (D.bay.interim && D.bay.interim.n || !bayesDefault()))) return '';
  return 'Bayesian: ' + D.bay.rows.length + ' of ' + D.shared.configs.length + ' models with posteriors' + (D.bay.interim && D.bay.interim.n ? ', ' + D.bay.interim.n + ' interim (from the newer fit)' : '') + (bayesDefault() ? '' : ' \u2014 project estimator shown by default, Bayesian one click away');
}
function recordCount(dataId) {   // the count of record for the rendered set (manifest.counts_of_record, the task pool maintainers' file), or null
  var C = D && D.man && D.man.counts_of_record; if (!C) return null;
  var k = { board: 'wave1', top: 'wave2', board_top: 'wave12', 'new': 'new_total', all: 'all' }[dataId];
  return k && C[k] != null ? +C[k] : null;
}
function tasksText(f, dsId) {   // the frame's own count, plus one plain clause when the count of record has moved away from it (the project maintainers 09-09: 431 on the label, 432 on the line)
  var t = tasksTextBase(f, dsId), rc = D && D.golden ? null : recordCount(D && D.dataId), shown = f.tasks_kept != null ? f.tasks_kept : f.tasks;
  if (rc == null || shown == null || rc === shown) return t;
  var fmt = function (n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); };
  var clause = rc < shown ? 'the kept count is now ' + fmt(rc) + '; this fit frame predates a withdrawal' : 'the kept count is ' + fmt(rc) + '; the rest awaits the axis';
  return /\)$/.test(t) ? t.replace(/\)$/, '; ' + clause + ')') : t + ' (' + clause + ')';   // one parenthesis per line: join an existing kept/await clause
}
function tasksTextBase(f, dsId) {   // a finding (the curves page's maintainers, 2026-09-05): `tasks` is the set POSITIONED on the axis; the kept set and the tasks awaiting the next axis wave are named when the bundle carries them
  if (f.tasks_kept != null && f.tasks_kept !== f.tasks) return f.tasks + ' tasks on the axis (' + f.tasks_kept + ' kept; ' + (f.tasks_awaiting_axis != null ? f.tasks_awaiting_axis : f.tasks_kept - f.tasks) + ' await the next axis fit)';
  if (f.tasks_on_axis != null) return f.tasks + ' tasks on the axis';
  return f.tasks + (dsId === 'board' ? ' kept tasks' : ' tasks');
}
/* FAIL CLOSED (project convention g, 2026-09-11): the page maintainers' loop writes liveness.txt every tick; when it is older than ten minutes or
 * missing, the frame bar shows one plain line saying what is held and since when — never a fresh-looking face over stale numbers */
function heldCheck() {
  var el = document.getElementById('framebar'); if (!el) return;
  fetch(MOUNT + 'liveness.txt', { cache: 'no-store' }).then(function (r) { return r.ok ? r.text() : Promise.reject(r.status); })
    .then(function (t) {
      var ts = Date.parse(String(t).trim()), age = isFinite(ts) ? (Date.now() - ts) / 60000 : Infinity;
      // 27 Sep (the project maintainers' word of 24 Sep: no hours, history or counts on a face): the held line names the state and the reader, never the minute or the age
      setHeld(age > 10 ? 'Held: the rebuild loop is not ticking; the numbers stand as built and refresh when it returns.' : '');
    })
    .catch(function () { /* standalone copy: no rebuild loop, no held line */ });
}
var HELD = {};   // one line, two independent reasons: the rebuild loop's liveness and the manifest itself
function setHeld(msg, kind) {
  HELD[kind || 'liveness'] = msg || '';
  msg = Object.keys(HELD).map(function (k) { return HELD[k]; }).filter(Boolean).join(' ');
  var el = document.getElementById('framebar') || document.querySelector('main') || document.body; if (!el) return;
  var h = document.getElementById('heldline');
  if (!h) { h = document.createElement('div'); h.id = 'heldline';  h.style.cssText = 'color:#8a2f0e;font-size:.85rem;margin:.1rem 0 .3rem'; if (el.id === 'framebar') el.parentNode.insertBefore(h, el); else el.insertBefore(h, el.firstChild); }
  h.textContent = msg; h.hidden = !msg;
  if (msg) h.setAttribute('data-critical-text', ''); else h.removeAttribute('data-critical-text');   // critical only while shown (the reference designer's audit: a designated line must render)
}
function frameLine() {
  var el = document.getElementById('framebar'); if (!el || !D || !D.shared) return;
  var f = D.shared.frame || {};
  var base = (D.golden ? 'golden set (12) \u00b7 ' : '') + (DATASETS[D.dataId] ? (DATASETS[D.dataId].frameLabel || DATASETS[D.dataId].label) + ' \u00b7 ' : '') + mainConfigs().length + ' models';   // Definitions' form of record (24 Sep , the project maintainers' 12:2x word): the set's plain words and one count, nothing after — no run clauses, no cadence, no stamp
  // the Bayesian coverage sentence lives in the readout fold-out (bayesNote), not on the frame line (the project's critic 2026-09-05)
  el.textContent = base;
  var mc = document.getElementById('machinery'); if (mc) mc.textContent = 'as of ' + asOf(f.build_ts || f.build_date) + ', ' + CADENCE + '.';   // the ONE machinery line, its own element under the set line: stamp + declared refresh (the reference designer's freshness row reads it; the set line itself stays words and counts)
  if (location.pathname === '/' || D.dsId !== 'board') return;   // the board-tool comparison is a board-dataset fact   // sibling tools exist only under the hub mount; a bare port has nothing to compare against (and a 404 would count as a page error)
  fetch('./fvd-data/manifest.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (m) {
    var bf = m && (m.frame || m); if (!bf || bf.population_M == null) return;
    if (bf.population_M !== mainConfigs().length || (bf.keep_set_hash && bf.keep_set_hash !== f.keep_set_hash)) {
      el.textContent = base + ' Board tool today: ' + bf.population_M + ' models' + (bf.keep_set_hash && bf.keep_set_hash !== f.keep_set_hash ? ' on another keep-set' : '') + '.';
      el.classList.add('tear');
    } else { el.textContent = base; el.classList.remove('tear'); }
  }).catch(function () {});
}
/* adopted DEFINITION (difficulty, Definitions ledger 2026-09-03; literal, dash-free; the frame parenthetical is
 * data-driven so it disappears when the Bayesian fits stand on the current keep-set) */
function reliabilityDefinition() {
  var el = document.getElementById('reliability-def'); if (!el || !D.shared) return;
  var f = D.shared.frame, ft = D.bay && D.bay.fit_frame ? D.bay.fit_frame.tasks : f.tasks;
  var frameClause = 'an estimate names the keep-set it was fitted on (the current keep-set ' + f.keep_set_hash
    + (ft !== f.tasks ? '; the fitted rows on this page were fitted on the keep-set before its latest label decisions' : '') + ')';   // no task counts (the project maintainers 2026-09-10)
  el.textContent = 'Reliability: the difficulty up to which a model fails fewer than one attempt in a hundred. Its adopted name is the average-rate D99: '
    + 'the difficulty at which the model\u2019s fitted average failure rate first reaches 1%, on the kept tasks; ' + frameClause + '. '
    + 'Two estimators of this one quantity appear on this site and are named wherever a number is shown: the average-rate estimate (a local-logistic fit of failure rate against pooled task difficulty) '
    + 'and the Bayesian estimate (the posterior-median crossing of the fitted model, read off the fit\u2019s curves). They differ most in the 1% tail, so a figure is comparable only with its estimator and its task frame named.';
}
/* FIRST SCREEN (WRITING.md §1; the project's critic's roster read 2026-09-03): line 1 the question, lines 2–3 the answer
 * with ONE metric (the drawn slope) and at most three supporting numbers (arm count, interval ends) — rendered from state */
// the figure's caption under the chart: the fits' maintainers' words (21 Sep, with the difficulty maintainers' corrections; reworded the same evening without log-odds words under the project maintainers' 6 Sep rule), every figure rendered from the fit's state, never typed
// (the project maintainers' question of 21 Sep 18:2x: what the straight line fitted to D99 against D50 means). Shown for the line of
// record only: the unweighted least-squares line in the scale's own steps (In logit, or In the axes as set with both axes on the logit scale).
function fitCaption(fit, n) {
  var el = document.getElementById('fitcaption'); if (!el) return;
  var logitFit = !inAxes() || (state.xs !== 'raw' && state.ys !== 'raw');
  var fold = document.getElementById('fitfold');
  if (!fit || !n || state.line === 'off' || state.lw === 'bands' || !logitFit || fit.lo == null) { el.textContent = ''; el.hidden = true; if (fold) fold.hidden = true; return; }
  var xn = dName('x'), yn = dName('y'), xl = fmtLev(state.a) + '%', yl = fmtLev(state.c) + '%';
  var a = fit.a, b = fit.b, ea = Math.exp(a);
  var eaTxt = a < 0 ? '1/' + Math.round(1 / ea) : ea.toFixed(2);
  var aRange = (fit.aLo != null && fit.aHi != null) ? ' [' + fit.aLo.toFixed(2) + ', ' + fit.aHi.toFixed(2) + ']' : '';
  var set = String((DATASETS[state.data] && DATASETS[state.data].label) || state.data).replace(/\s*\([^)]*\)\s*$/, '');   // the set's name; its count of record stays on the frame line (the fits' critic 21 Sep: the fit set's task count differs from the set's count of record)
  var runDrawn = anyRunOnPlane() && Array.from(sel).some(function (i) { return isRun(i) && !isHidden(i); });
  var outs = [state.partial === 'show' ? 'the faded partial models' : null, runDrawn ? 'the run\u2019s checkpoints' : null].filter(Boolean);
  var drawnTxt = outs.length ? 'across the fitted models (' + outs.join(' and ') + ' drawn are not in the fit)' : 'across the drawn models';   // exact in every state (the fits' critic 21 Sep; the run set 22 Sep)
  el.hidden = false; if (fold) fold.hidden = false;   // a fold at the very end of the page (the project maintainers' word of 22 Sep 11:43: nothing between the plot and its controls; the summary carries the opening words)
  el.textContent = 'Both axes are positions on the difficulty scale. A task’s position is its failure rate averaged over the models that shape the scale (one vote per model), smoothed toward one half by the Jeffreys step on the total attempts, placed on the scale by its odds: one step on the scale multiplies the odds of failure by about 2.7, and positions print as shares (a difficulty of 70% is a task those models fail on 70% of their attempts on average). '
    + xn + ' is the difficulty at which a model’s fitted failure curve crosses ' + xl + ', ' + yn + ' the difficulty at which the same curve crosses ' + yl + '. A straight line is fitted through the models in scale steps ' + drawnTxt + ' (ordinary least squares, every dot equal; equal axes): it gives ' + yn + ' as an intercept a plus a slope b times ' + xn + '. The slope b is how many steps ' + yn + ' moves for each step of ' + xn + ' across models; with b near one the intercept a is a constant gap: every model’s ' + yn + ' sits a steps below its ' + xn + ' (the size of a), the same gap for every model, and the odds of failure at the ' + yn + ' position are e to the power a times those at the ' + xn + ' position. With b away from one the gap changes by (b − 1) steps per step of ' + xn + ', so the intercept alone is the gap at the scale’s 50% mark. '
    + 'Today: slope ' + b.toFixed(2) + ' [' + fit.lo.toFixed(2) + ', ' + fit.hi.toFixed(2) + '], intercept ' + a.toFixed(2) + aRange + ' steps (e to the power ' + a.toFixed(2) + ', about ' + eaTxt + '), R ' + fit.r.toFixed(2) + ', ' + n + ' models on ' + set + '.';
}
function headline(nFit, fit, nFull, sweeping) {
  var el = document.getElementById('headline'); if (!el) return;
  if (sweeping && !fit) return; // the levels are moving: keep the last settled answer rather than flicker
  var capC = isCap();
  // 30 Sep: on a non-code set the Capability views' question names the set, not the pool (the pool is the coding waves' word)
  var q = capC ? (DATASETS[D.dataId] && DATASETS[D.dataId].group ? 'Does a model that solves more of the set also stay reliable further up the difficulty scale?' : 'Does a model that solves more of the pool also stay reliable further up the difficulty scale?')
               : 'Does a more capable model also stay reliable further up the difficulty scale?';
  var est = state.src === 'bayes' ? 'estimates from the fitted failure curves' : 'estimates from the smoothed failure trend';   // plain words, no method name on the figure (the project maintainers 2026-09-14); the parenthetical left the headline on the project maintainers' word of 22 Sep 20:1x — the estimator switch names the source
  var xw = capC ? CAP_KEYS[state.xdef].name() : dName('x');
  var ans;
  if (fit) {
    // no verdict, no direction word (the project maintainers' word of 16 Sep 2026 17:4x: never a ranking — who is best, who is what — the page gives
    // information, it optimises nothing): the first screen states the fitted line's slope with its range and R, nothing more
    // 30 Sep (the project maintainers' 30 Sep word; the critic's finding): a stated slope says its space once — 'in logit space' by default, 'in the axes as set' under that option
    ans = 'The fitted line across the models, ' + dName('y') + ' against ' + xw + ': slope ' + fit.b.toFixed(2) + ' [' + fit.lo.toFixed(2) + ', ' + fit.hi.toFixed(2) + '], R ' + fit.r.toFixed(2) + (inAxes() ? ', in the axes as set' : ', in logit space') + (state.lw === 'bands' ? ', each dot weighted by its bands' : '') + '.';
  } else ans = 'Too few fully measured models at these levels to fit a line (' + nFull + ' measured; the fit needs three).';
  if (isCap() && !capBlock()) { q = ''; ans = CAP_KEYS[state.xdef].name() + ' is not published for this set yet; no model is drawn.'; }   // the project maintainers' word of 24 Sep 12:4x: every view pressable; a missing file is said in the one sentence
  el.textContent = (q + ' ' + ans).trim();
}
var frameLineDone = false;
function disclosureLine() {   // one clause per disclosure the fit pointer carries (difficulty shows the same as a flag glyph + notes text, 2026-09-06)
  var dz = D.bay && D.bay.disclosures; if (!dz) return '';
  var out = '';
  // the under-credit clause, its hover sentence and its warning left the face on Definitions' word of 24 Sep 15:5x: a may-move note with an interpretation of the curves; the truth of the fit is the fit, the leaf is a record leaf
  // Definitions' word of 24 Sep 16:04: the basis-truncation sentence (a served-with-a-flag-until note) and the cut-flag clause left the face — record leaves in the fits' maintainers' pointers; the provisional classes stay only as the legend of what is drawn
  var provisionalDrawn = (D.shared && D.shared.configs || []).some(function (c) { return c.provisional; }) || !!document.querySelector('[data-mark][data-provisional="1"]');
  if (provisionalDrawn && dz.provisional_classes && dz.provisional_classes.length) out += ' \u00b7 provisional: ' + dz.provisional_classes.map(function (c) { return c['class'] || c; }).join(', ');
  return out;
}
function fitSetCount() {   // rows = served arms + interim arms of the wave in flight (two fit sets); say both, never 'N of M' with N > M (read '59 of 34 arms served' 2026-09-11)
  var nInt = (D.bay.interim && D.bay.interim.n) || mainRows().filter(function (r) { return r.source === 'interim'; }).length, served = mainRows().length - nInt, n = D.bay.fit_set.n_arms;
  return (served === n ? served + ' models' : served + ' of ' + n + ' models served') + (nInt ? ' · ' + nInt + ' interim from the wave in flight' : '');
}
function stamp() {
  if (!frameLineDone) { frameLineDone = true; frameLine(); reliabilityDefinition(); }
  var f = D.shared.frame;
  // CHROME LENGTH (the reference designer's conventions row, 2026-09-11): the machinery line is ONE muted line under 40 words — the arms drawn, the data
  // identifiers and the manifest link; the estimator versions, the sampler gate, Capability C's method and the fits' maintainers' disclosures move to a plain
  // sibling (#stampmore) inside the same provenance fold, where every conventions row applies to them.
  (document.getElementById('stamp') || document.createElement('div')).innerHTML =   // no machinery line on the face (24 Sep); provenance only (the project maintainers 2026-09-03): no held / withheld / queue / custody words
    '<span data-chain-inv>' + mainConfigs().length + ' models · keep-set ' + f.keep_set_hash + ' · data fingerprint ' + f.runs_fingerprint + (f.runs_window ? ' · runs window ' + plainTs(f.runs_window) : '')
    + ' · axis ' + D.shared.axis.axis_id + (D.golden ? ' · ' + String(f.golden_note || 'golden set: a data point, not the difficulty definition').replace(new RegExp('\\s*\\((' + String.fromCharCode(83, 122, 121, 109, 111, 110) + ' [0-9-]+|as adopted)\\)'), '') : '') + '</span>'
    + (D.bay && D.bay.fit_set && D.bay.fit_set.sha12 ? ' · Bayesian fit set <span data-fit-set>' + D.bay.fit_set.sha12 + '</span> (' + fitSetCount() + ')' : '')
    + ' · <a href="' + MOUNT + 'data/manifest.json">data manifest</a>';
  var more = document.getElementById('stampmore');
  if (!more) { more = document.createElement('div'); }   // no stamp on the face (24 Sep): the provenance lines are composed for the maintainer files only
  more.innerHTML = (D.bay ? 'estimators: <span data-chain-val="def src">median-task ' + D.bay.estimator_version + ' · average-rate ' + D.bay.estimator_version_avg + '</span>' : 'estimator: project average-rate chain (crossing rows from the pool curves; no posterior tables yet)')
    + (D.shared.capC ? ' · ' + CAP_KEYS.capC.name() + ' <span data-chain-val="xdef">' + D.shared.capC.method_version + '</span>' + (D.shared.capC.frame && D.shared.capC.frame.population_M ? ' (population ' + D.shared.capC.frame.population_M + ')' : '') : '')
    + (D.shared.capC_z ? ' · ' + CAP_KEYS.capC_z.name() + ' <span data-chain-val="xdef">' + D.shared.capC_z.method_version + '</span>' : '')
    + (D.shared.capC_j ? ' · ' + CAP_KEYS.capC_j.name() + ' <span data-chain-val="xdef">' + D.shared.capC_j.method_version + '</span>' : '')
    + (D.shared.artifact_flags ? ' · <span data-chain-val>\u2020 artifact flags active</span>' : '')
    + (D.bay && D.bay.gates && D.bay.gates.line ? ' · ' + D.bay.gates.line : '')
    + disclosureLine();   // the fits' maintainers' pointer disclosures beside the numbers (spec 03g / the fit methods' maintainers' 06h): basis truncation, provisional classes
}

