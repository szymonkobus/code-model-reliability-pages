/* CURVES tool (maintainers: the the maintainers plot's maintainers; tools convergence).
 * The switch swaps ARTIFACT POINTERS per the binding chain-swap spec:
 * this file does no estimator math beyond interpolation. Every
 * chain-derived element carries data-chain-val; chain-invariant
 * facts carry data-chain-inv (gauntlet contract). */
(function () {
// bundle fetches revalidate with the server on every load (cache: 'no-cache' → a 304 when unchanged): the bundle's file names hash the served set's cells alone, so a bundle
// that changes only its trained-models block, its run rows or its labels keeps its names, and the server sends no cache directive — a stale copy would show a chip that has left (25 Sep 2026)
function fetchFresh(u) { return fetch(u, { cache: 'no-cache' }); }
'use strict';

/* ---------------- geometry + axis vocabulary ---------------- */
var W = 960, H = 560, ML = 58, MR = 14, MT = 14, MB = 44;
var PW = W - ML - MR, PH = H - MT - MB;
/* narrow screens: the SVG is scaled down (viewBox 960 wide onto ~350 CSS px
 * on a phone), so axis text set in viewBox units renders ~5 px tall (drive
 * 3 Sep 2026, friction 15). Text and margins scale with K = min(2.4, W /
 * rendered width); K = 1 leaves the desktop geometry untouched. */
function fitGeometry(chart) {
  var cw = EXPORTING ? W : (chart.getBoundingClientRect().width || W);
  K = Math.min(2.4, Math.max(1, W / cw));
  if (EXPORTING) { ML = 90; MB = 70 + (pinOn() ? 22 : 0); }   // room for the export's larger axis names and tick numbers (project defaults, kit-export v5.3); the pin's second tick row
  else { ML = Math.round(58 + 40 * (K - 1)); MB = Math.round(44 + 20 * (K - 1)) + (pinOn() ? Math.round(14 * K) : 0); }
  PW = W - ML - MR;
  // one common scale when both axes share units (equal distances on both axes): the plot height follows the y range at the x range's scale —
  // square when the ranges coincide, shorter since the y floor rose to the 0% representation (the project maintainers' word, 13:2x UK 18 Sep)
  if (sameUnits()) { var xl = xlimT(), yl = ylimT(); PH = Math.max(120, Math.round(PW * (yl[1] - yl[0]) / (xl[1] - xl[0]))); H = MT + PH + MB; }
  else { H = 560; PH = H - MT - MB; }
  chart.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
}
var LOGIT_TICKS = [0.5, 1, 2, 5, 10, 20, 50, 80, 90, 95, 98, 99, 99.5];
var YLIM = [logit(0.002), logit(0.998)];
function logit(p) { return Math.log(p / (1 - p)); }
function pct(z) { return 100 / (1 + Math.exp(-z)); }
function fmtPct(z, d) { return pct(z).toFixed(d == null ? 1 : d) + '%'; }

/* ---------------- data load (fingerprint-keyed) -------------- */
/* Dataset switch (the project maintainers' word of 3 Sep 2026: a switch at the top for the task set
 * in use — the board or the new tasks — the sets to become one in time):
 * ?data=board (default) | new | all. The switch changes the
 * tasks used and nothing else (the difficulty maintainers' Definitions line); the pool
 * bundle is the pool pages lead's and is adapted in dataset_pool.js. */
var D = {};   // shared, avg, med, dots
var DATASETS = {
  // the project maintainers' word of 5 Sep 2026 (the board-plus-top-half view first, then the top half alone): the two top-half options lead,
  // board + top half is the default view; names = Definitions' vocabulary (board_top, top; axes task_difficulty.board_top/.top.csv)
  // the project maintainers 8 Sep 2026 7pm: official names (wave 1 / wave 2 / wave 2 parked) with the counts of record; the static labels here carry
  // NO counts — applyOfficialNames fills them from the freshest counts-of-record block once a manifest is read
  board_top: { label: 'wave 1+2', short: 'wave 1+2', src: 'data-board_top/manifest.json',
               hover: 'wave 1 plus wave 2 on one difficulty axis',
               disabled: '' },
  top: { label: 'wave 2', short: 'wave 2', src: 'data-top/manifest.json',
         hover: 'wave 2 alone',
         disabled: '' },
  board: { label: 'wave 1', short: 'wave 1', hover: 'wave 1 alone' },
  'new': { label: 'wave 2 and wave 2 parked', short: 'wave 2 and wave 2 parked', src: './pool/failure-vs-difficulty/data.json',
           hover: 'wave 2 and wave 2 parked together' },
  all: { label: 'all waves', short: 'all waves', src: 'data-all/manifest.json',
         hover: 'all waves on one difficulty axis',
         disabled: '' },
  // the non-code sets (the work NON-CODE BENCHMARKS D99-D50, the maintainers's; the project maintainers' word of 30 Sep 2026 via the coordination: the results browsable
  // in this viewer under a dataset control better than chips, no new page — superseding the 11 Sep word that kept the maths sets to a mirror page):
  // the six sets under one group heading, in the maintainers's order (MATH-500 first, AIME last); the names of record are the maintainers's list of
  // 30 Sep  and are re-read from each bundle's frame at load (named from the frame, never typed as a count); an unbuilt set greyed and unselectable
  math500: { label: 'MATH-500', short: 'MATH-500', src: 'data-math500/manifest.json', hover: 'MATH-500 on its own difficulty axis', nb: true },
  ifeval: { label: 'IFEval', short: 'IFEval', src: 'data-ifeval/manifest.json', hover: 'IFEval on its own difficulty axis', nb: true },
  gsm8k_platinum: { label: 'GSM8K-Platinum', short: 'GSM8K-Platinum', src: 'data-gsm8k_platinum/manifest.json', hover: 'GSM8K-Platinum on its own difficulty axis', nb: true },
  cruxeval_i: { label: 'CRUXEval · input prediction', short: 'CRUXEval · input prediction', src: 'data-cruxeval_i/manifest.json', hover: 'CRUXEval · input prediction on its own difficulty axis', nb: true },
  cruxeval_o: { label: 'CRUXEval · output prediction', short: 'CRUXEval · output prediction', src: 'data-cruxeval_o/manifest.json', hover: 'CRUXEval · output prediction on its own difficulty axis', nb: true },
  aime: { label: 'AIME', short: 'AIME', src: 'data-aime/manifest.json', hover: 'AIME on its own difficulty axis', nb: true }
};
var NB_GROUP_HEADING = 'NON-CODE BENCHMARKS D99-D50';   // the work's name of record, in capitals exactly, the selector's group heading over the six sets and nowhere else on the face (the maintainers 30 Sep)
var TOP_COUNT = null;   // kept focused new tasks, read from the 877-task bundle's frame (never typed here)
function topCount() { return TOP_COUNT ? Number(TOP_COUNT).toLocaleString('en-US') : 'wave 2'; }
function setTopCount(n) {
  TOP_COUNT = n;
  Object.keys(DATASETS).forEach(function (k) { if (DATASETS[k].hover) DATASETS[k].hover = DATASETS[k].hover.replace('{top}', topCount()); });
  Array.prototype.forEach.call(document.querySelectorAll('#controls button[data-value]'), function (bt) {
    if (bt.title && bt.title.indexOf('the focused focused new tasks') >= 0) bt.title = bt.title.replace('the focused focused new tasks', 'the ' + topCount() + ' focused new tasks');
  });
}
var OFFICIAL = null;   // counts of record (the maintainersknowledge/counts_of_record.json via the bundle frame): the project maintainers' word of 7pm 8 Sep — labels carry them
var FRESH_C = null;    // the freshest counts-of-record block seen (by its _stamp): bundles are built at different times, so an older
                       // bundle's counts must never overwrite a newer one's labels (9 Sep: combined bundle said 432, board bundle said 431)
function freshCounts(text) {   // re-read the set sizes inside a baked label sentence from the freshest counts of record
  var C = FRESH_C; if (!C || !text) return text;
  var f = function (n) { return Number(n).toLocaleString('en-US'); };
  var sub = function (t, re, n) { return t.replace(re, function (m) { return m.replace(/\([\d,]+/, '(' + f(n)); }); };
  var t = String(text), keep = [];   // the union phrase (either spelling: "+" before 10 Sep, "and" since) is set aside first so its parts never rewrite its count
  t = t.replace(/wave 2 (?:\+|and) wave 2 parked \([\d,]+( tasks?)?\)/g, function (m) { keep.push(m.replace(/\([\d,]+/, '(' + f(C.new_total))); return '\u0000' + (keep.length - 1) + '\u0000'; });
  t = sub(t, /wave 1\+2 \([\d,]+( tasks?)?\)/g, C.original_kept + C.new_focused);   // the (^|[^+]) guards below keep "wave 1+2 (…)" from matching its parts
  t = sub(t, /(^|[^+] )wave 2 parked \([\d,]+( tasks?)?\)/g, C.new_parked);
  t = sub(t, /(^|[^+] )wave 1 \([\d,]+( tasks?)?\)/g, C.original_kept);
  t = sub(t, /(^|[^+] )wave 2 \([\d,]+( tasks?)?\)/g, C.new_focused);
  t = sub(t, /all waves \([\d,]+( tasks?)?\)/g, C.original_kept + C.new_total);
  t = t.replace(/\u0000(\d+)\u0000/g, function (_, i) { return keep[Number(i)]; });
  return t;
}
function officialLabels(C) {
  if (!C || !C.original_kept || !C.new_focused || !C.new_parked || !C.new_total) return null;
  var f = function (n) { return Number(n).toLocaleString('en-US'); };
  var W = C.waves || {}; var fl = function (keys, dflt) { for (var i = 0; i < keys.length; i++) { var w = W[keys[i]]; if (w && (w.label || w.figure_label)) return w.label || w.figure_label; } return dflt; };   // label names the set (the task pool maintainers 10 Sep); figure_label_template is for headings over a drawn fit
  return {
    board_top: { label: fl(['wave_1_plus_2', 'wave_1_2'], 'wave 1+2 (' + f(C.original_kept + C.new_focused) + ' tasks)'), hover: 'wave 1+2: wave 1 plus wave 2 on one difficulty axis' },
    top: { label: fl(['wave_2'], 'wave 2 (' + f(C.new_focused) + ' tasks)'), hover: 'wave 2 alone; wave 2 parked left out' },
    board: { label: fl(['wave_1'], 'wave 1 (' + f(C.original_kept) + ' tasks)'), hover: 'wave 1 alone' },
    'new': { label: fl(['wave_2_plus_parked', 'wave_2_all'], 'wave 2 and wave 2 parked (' + f(C.new_total) + ' tasks)'), hover: 'wave 2 and wave 2 parked together' },
    all: { label: 'all waves (' + f(C.original_kept + C.new_total) + ' tasks)', hover: 'every task: wave 1, wave 2 and wave 2 parked on one difficulty axis' }
  };
}
function applyOfficialNames(C) {
  if (C && FRESH_C && FRESH_C !== C && String(C._stamp || '') < String(FRESH_C._stamp || '')) C = FRESH_C;   // an older bundle's counts never win
  var L = officialLabels(C); if (!L) return false; OFFICIAL = L; FRESH_C = C;
  var f2 = function (n) { return Number(n).toLocaleString('en-US'); };
  Array.prototype.forEach.call(document.querySelectorAll('[data-count="wave2"]'), function (el) { el.textContent = f2(C.new_focused); });
  Array.prototype.forEach.call(document.querySelectorAll('[data-count="newtotal"]'), function (el) { el.textContent = f2(C.new_total); });
  Array.prototype.forEach.call(document.querySelectorAll('[data-count="wave12"]'), function (el) { el.textContent = f2(C.original_kept + C.new_focused); });
  Object.keys(L).forEach(function (k) {
    if (!DATASETS[k]) return; DATASETS[k].label = L[k].label; DATASETS[k].short = L[k].label; DATASETS[k].hover = L[k].hover;
    var bt = dsEl(k); if (bt) bt.textContent = setWord(L[k].label);   // the label of record carries its count; the switch reads the set name alone
  });
  return true;
}
var BOARD_COUNT = null;   // kept benchmark tasks, read from the board bundle's frame (never typed here)
function boardCount() { return BOARD_COUNT ? Number(BOARD_COUNT).toLocaleString('en-US') : 'kept'; }
function setBoardCount(n) {
  BOARD_COUNT = n;
  if (!OFFICIAL && DATASETS.board) { var lb = boardCount() + ' tasks'; DATASETS.board.label = lb; DATASETS.board.short = lb;
  var bt = dsEl('board'); if (bt) bt.textContent = lb; }
  Object.keys(DATASETS).forEach(function (k) { if (DATASETS[k].hover) DATASETS[k].hover = DATASETS[k].hover.replace('{board}', boardCount()); });
  Array.prototype.forEach.call(document.querySelectorAll('[data-count="board"]'), function (el) { el.textContent = boardCount(); });
  Array.prototype.forEach.call(document.querySelectorAll('#controls button[data-value]'), function (bt) {   // titles composed before the board manifest arrived
    if (bt.title && bt.title.indexOf('the kept benchmark tasks') >= 0) bt.title = bt.title.replace('the kept benchmark tasks', 'the ' + boardCount() + ' benchmark tasks');
  });
}
var ALL_AVAILABLE = false;   // set at load: data-all/manifest.json exists
var TOP_AVAILABLE = { board_top: false, top: false };
/* Golden set (the project maintainers' word of 3 Sep 2026: the this page's maintainers and the capability page's maintainers
 * views over the models every method covers, wanted as one data point, not as a new definition of
 * difficulty for every purpose): a POPULATION
 * switch, orthogonal to the dataset — ?arms=golden loads the golden bundle for the chosen dataset
 * (curves-site/data-golden-<dataset>/), axis and curves from the 12 arms only. */
var ARMS = (typeof Kit !== 'undefined' && Kit.state) ? Kit.state.get('arms', 'all') : 'all';
if (ARMS !== 'golden') ARMS = 'all';
var GOLDEN_AVAILABLE = { board: false, 'new': false, all: false };
function goldenDir(ds) { return 'data-golden-' + ds; }
// MIRROR HOOK (the project maintainers' word of 11 Sep: the newbench sets get a mirror page presented the same way): a page that mounts this
// script under another path sets window.MIRROR_DATASETS = { key: { label, src, hover, disabled?, nb? }, … } (its own order; nb: true puts a key under
// the select's NON-CODE BENCHMARKS D99-D50 group — a field of the hook since 30 Sep, the maintainers's mirror carries it) and
// optionally window.MIRROR_DEFAULT; srcs resolve against that page's mount. Every key outside the five built-ins is served
// generically: probed by src, routed to its bundle by src, named from its bundle frame.
var BUILTIN_KEYS = { board_top: 1, top: 1, board: 1, 'new': 1, all: 1 };
var MIRROR = (typeof window !== 'undefined' && window.MIRROR_DATASETS && typeof window.MIRROR_DATASETS === 'object') ? window.MIRROR_DATASETS : null;
if (MIRROR) { DATASETS = MIRROR; }
var DEFAULT_DATASET = (MIRROR && typeof window.MIRROR_DEFAULT === 'string' && DATASETS[window.MIRROR_DEFAULT]) ? window.MIRROR_DEFAULT
                      : (DATASETS.board_top ? 'board_top' : Object.keys(DATASETS)[0]);
var FALLBACK_DATASET = DATASETS.board ? 'board' : DEFAULT_DATASET;
var EXTRA_AVAILABLE = {};   // keys outside the built-ins: manifest present?
function setWord(s) { return String(s == null ? '' : s).replace(/\s*\([\d,]+ (tasks|problems)\)\s*$/, ''); }   // a set switch reads the project maintainers' set name alone: wave 1, wave 2, wave 1+2 … — the count stays in the status line and the hover (the project maintainers' word of 23 Sep, via the pool pages lead)
function isExtra(k) { return !!(DATASETS[k] && !BUILTIN_KEYS[k]); }
function extraDir(k) { return String(DATASETS[k].src || '').replace(/\/?manifest\.json$/, '') || ('data-' + k); }
var DATASET = (typeof Kit !== 'undefined' && Kit.state) ? Kit.state.get('data', DEFAULT_DATASET) : DEFAULT_DATASET;   // default: board + top half (the project maintainers' word,)
if (!DATASETS[DATASET]) DATASET = FALLBACK_DATASET;
function loadBundle(dir, label) {   // board-schema bundle (board: data/, all tasks: data-all/)
  return fetchFresh(dir + '/manifest.json').then(function (r) { if (!r.ok) throw new Error('no bundle at ' + dir); return r.json(); })
    .then(function (man) {
      D.man = man;
      return Promise.all(['shared', 'chain_average', 'chain_median', 'dots']
        .map(function (k) { return fetchFresh(dir + '/' + man.files[k]).then(function (r) { return r.json(); }); }));
    }).then(function (all) {
      D.shared = all[0]; D.avg = all[1]; D.med = all[2]; D.dots = all[3];
      D.shared.frame.dataset = D.shared.frame.dataset || 'board';
      D.shared.frame.dataset_label = D.shared.frame.dataset_label || label;
      D.shared.vocab = D.shared.vocab || {};
      // every bundle carries the watcher's currency stamp (write_current.py: the newbench sets by input signature, the built-ins by the
      // watcher's own no-change verdict at the end of a quiet tick, 13 Sep); a missing stamp leaves the plain HELD rule in force
      var key = D.shared.frame.dataset;
      if (key) return fetchFresh(dir + '/current.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (c) { D.shared.current = c; }).catch(function () { D.shared.current = null; });
    });
}
function loadBoard() {
  return fetchFresh('data/manifest.json').then(function (r) { return r.json(); })
    .then(function (man) {
      D.man = man;
      return Promise.all(['shared', 'chain_average', 'chain_median', 'dots']
        .map(function (k) {
          return fetchFresh('data/' + man.files[k]).then(function (r) {
            return r.json();
          });
        }));
    }).then(function (all) {
      D.shared = all[0]; D.avg = all[1]; D.med = all[2]; D.dots = all[3];
      D.shared.frame.dataset = 'board'; D.shared.frame.dataset_label = DATASETS.board ? DATASETS.board.label : 'wave 1';
      return fetchFresh('data/current.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (c) { D.shared.current = c; }).catch(function () { D.shared.current = null; });   // the watcher's currency stamp (quiet ticks)
    });
}
function loadPoolGolden() {
  /* the pool pages lead's bundle carries a top-level `golden` block (same shape as the bundle, computed from
 * the golden arms only); when present the new-tasks golden view reads it through the same adapter as
 * ?data=new, so both share one source and axis. Until it lands, my data-golden-new bundle stands. */
  return Promise.all([
    fetchFresh(DATASETS['new'].src).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
    fetchFresh('data/manifest.json').then(function (r) { return r.json(); })
      .then(function (man) { return fetchFresh('data/' + man.files.shared).then(function (r) { return r.json(); }); })
      .then(function (sh) { return sh.vocab || {}; }).catch(function () { return {}; })
  ]).then(function (all) {
    var P = all[0];
    if (!(P && P.golden && P.golden.configs && P.golden.grid)) return loadBundle(goldenDir('new'), DATASETS['new'].label);
    // prefer the source that carries the Bayesian layer: when the pool block has none yet (its builder reads the
    // pointer's newer[] only; the served golden-pool set of sits in the serving block) but my own golden
    // bundle draws served fits, take my bundle until the block catches up
    var blockHasBayes = !!(P.golden.bayes && P.golden.bayes.available && (P.golden.bayes.arms || []).length);
    return fetchFresh(goldenDir('new') + '/manifest.json').then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
      .then(function (man) {
        var bf = man && man.frame && man.frame.bayes_fits;
        var drawn = bf && bf.drawn;
        if (!blockHasBayes) return drawn ? loadBundle(goldenDir('new'), DATASETS['new'].label) : adoptBlock(P, all[1]);
        // both carry a Bayesian layer: the served set of record wins. When the fit maintainers' pointer flips (5 Sep
        // golden-pool-20260904T1407Z) my bundle follows within its 20-min tick while the block follows on its own
        // rebuild; if the two name different waves, the fresher pointer read is the one drawn (one estimator per view:
        // a flipped set must not keep showing the previous wave's curves as served)
        var bw = P.golden.bayes.wave_id || '', mw = (bf && bf.wave_id) || '';
        var newerMine = drawn && mw && bw && mw !== bw && String(bf.pointer_updated_at || '') > String(P.golden.bayes.updated_at || '');
        if (newerMine) return loadBundle(goldenDir('new'), DATASETS['new'].label);
        return adoptBlock(P, all[1]);
      });
  });
  function adoptBlock(P, vocab) {
    var B = PoolDataset.toBoard(P.golden);
    D.shared = B.shared; D.avg = B.avg; D.med = B.med; D.dots = B.dots; D.man = B.man;
    D.shared.vocab = vocab;
    D.shared.frame.population = 'golden';
    D.shared.frame.population_source = DATASETS['new'].src + ' (golden block)';
  }
}

function loadPool() {
  return Promise.all([
    fetchFresh(DATASETS['new'].src).then(function (r) { return r.json(); }),
    fetchFresh('data/manifest.json').then(function (r) { return r.json(); })
      .then(function (man) { return fetchFresh('data/' + man.files.shared).then(function (r) { return r.json(); }); })
      .then(function (sh) { return sh.vocab || {}; }).catch(function () { return {}; })
  ]).then(function (all) {
    var B = PoolDataset.toBoard(all[0]);
    D.shared = B.shared; D.avg = B.avg; D.med = B.med; D.dots = B.dots; D.man = B.man;
    D.shared.vocab = all[1];   // one shared vocabulary for every dataset (column definitions)
  });
}
Promise.all([
  (DATASETS.all ? fetch('data-all/manifest.json', { method: 'HEAD' }).then(function (r) { ALL_AVAILABLE = r.ok; }).catch(function () { ALL_AVAILABLE = false; }) : Promise.resolve(ALL_AVAILABLE = false))
].concat(['board_top', 'top'].filter(function (ds) { return !!DATASETS[ds]; }).map(function (ds) {
  return fetchFresh(DATASETS[ds].src, { method: 'HEAD' }).then(function (r) { TOP_AVAILABLE[ds] = r.ok; }).catch(function () { TOP_AVAILABLE[ds] = false; });
})).concat(Object.keys(DATASETS).filter(isExtra).map(function (ds) {
  return fetchFresh(DATASETS[ds].src, { method: 'HEAD' }).then(function (r) { EXTRA_AVAILABLE[ds] = r.ok; }).catch(function () { EXTRA_AVAILABLE[ds] = false; });
})).concat(['board', 'new', 'all', 'board_top', 'top'].filter(function (ds) { return !!DATASETS[ds]; }).map(function (ds) {
  return fetchFresh(goldenDir(ds) + '/manifest.json', { method: 'HEAD' }).then(function (r) { GOLDEN_AVAILABLE[ds] = r.ok; }).catch(function () { GOLDEN_AVAILABLE[ds] = false; });
}))).then(function () {
    if (DATASET === 'all' && !ALL_AVAILABLE) DATASET = FALLBACK_DATASET;
    if ((DATASET === 'board_top' || DATASET === 'top') && !TOP_AVAILABLE[DATASET]) DATASET = FALLBACK_DATASET;
    if (isExtra(DATASET) && !EXTRA_AVAILABLE[DATASET]) DATASET = FALLBACK_DATASET;
    if (!DATASETS[DATASET]) DATASET = (DATASETS.board_top && TOP_AVAILABLE.board_top) ? 'board_top' : FALLBACK_DATASET;
    if (ARMS === 'golden' && !GOLDEN_AVAILABLE[DATASET]) ARMS = 'all';
    if (ARMS === 'golden' && DATASET === 'new') return loadPoolGolden();
    if (ARMS === 'golden') return loadBundle(goldenDir(DATASET), DATASETS[DATASET].label);
    if (DATASET === 'board_top' || DATASET === 'top') return loadBundle('data-' + DATASET, DATASETS[DATASET].label);
    if (isExtra(DATASET)) return loadBundle(extraDir(DATASET), DATASETS[DATASET].label);   // a mirror's own key: its bundle by src, board schema
    return DATASET === 'new' ? loadPool() : (DATASET === 'all' ? loadBundle('data-all', DATASETS.all.label) : loadBoard());
  }).then(boot);

/* ---------------- state ---------------- */
var ROW_KEPT = {};   // 26 Sep : served configs that a run row keeps (a checkpoint the registry admits to the panel whose only fit of record is the run pointer's) — no chip in the bulk, the row draws it
var state = { def: 'average', src: 'project', band: '90',
              xs: 'logit', ys: 'logit', dots: '0', rm: '0', trend: 'on', partial: 'hide', pin: 'off' };
/* the pin (the project maintainers' word of 30 Sep 2026, via the coordination): with the pin on, every model's curve moves along x by its own offset so that it
 * crosses the pinned failure rate at the middle of the axis; the y axis is unchanged; the x axis becomes relative to the pin (logit steps under a logit x,
 * percentage points under a raw x) with a second tick row reading each step as the failure rate it means when the middle is the pinned level
 * (the maintainers's dual-tick form, 30 Sep). The level is a typed control value used exactly (the project maintainers' word of 22 Sep 2026). A display transform only: the fits of
 * record, the crossings table and the chips are untouched; a curve that never rises through the level is not drawn while the pin is on. Off at the open. */
var PIN_LEVEL = 50, PIN_LEVEL_LAST = '50', PIN_DX = 0, PIN_R_RAW = 0.515, pinCtl = null, pinBox = null;
function pinOn() { return state.pin === 'on'; }
function pinR() { return state.xs === 'raw' ? PIN_R_RAW : (YLIM[1] - YLIM[0] + Y_FLOOR_GAP) / 2; }   // the relative half-span: the y axis's own logit span (one unit one length on either axis, the project maintainers' word of 3 Sep 2026), the raw common limit's half-span under a raw x
function pinCross(cv) {   // the difficulty (logit) where the curve's middle line first rises through the pinned level; null when it never does
  if (!cv || !cv.zs || !cv.mid) return null;
  var L = logit(PIN_LEVEL / 100), zs = cv.zs, ys = cv.mid;
  for (var k = 1; k < zs.length; k++) {
    if (ys[k - 1] == null || ys[k] == null) continue;
    if (ys[k - 1] < L && ys[k] >= L) return zs[k - 1] + (L - ys[k - 1]) / (ys[k] - ys[k - 1]) * (zs[k] - zs[k - 1]);
  }
  return null;
}
function pinShift(cv) { if (!pinOn()) return 0; var zc = pinCross(cv); return zc == null ? null : xt(zc); }   // the curve's own x offset in the axis's units; null = not drawn under the pin
function pinStepText(s) { var a = Math.abs(s), t = state.xs === 'raw' ? String(Math.round(a * 100)) : String(Math.round(a * 100) / 100); return s === 0 ? '0' : (s > 0 ? '+' : '\u2212') + t; }
function pinSecondText(s) {   // the failure rate a step reads as when the middle is the pinned level
  var p = state.xs === 'raw' ? Math.min(1, Math.max(0, PIN_LEVEL / 100 + s)) : 1 / (1 + Math.exp(-(logit(PIN_LEVEL / 100) + s)));
  var v = 100 * p; return ((v > 0 && v < 10) || (v > 90 && v < 100) ? (Math.round(v * 10) / 10).toString() : String(Math.round(v))) + '%';
}
var PARTIAL_MIN = 0.90;   // an arm with attempts on fewer than 90% of the dataset's tasks is partial (the project maintainers 7 Sep 2026)
var sel = null;          // Set of selected config indices
var XLIM = null, chips = [], crosshair = null, rearmCrosshair = null;
var srcMount = null;
var ready = false;      // controls + chips built; render allowed
var DOTS_MAX = 24;      // task dots draw for this many selected models or fewer, the panel and each run's row counted apart
var coercing = false;   // a control being re-set from render, no re-render
var bandCtl = null, dotsCtl = null;
var EXPORTING = false;  // export: render at the desktop geometry (K = 1, full axis titles) whatever the screen (the project maintainers' word of 18 Sep; project helper kit-export.js)
var K = 1;              // axis-text scale: viewBox units per CSS px, capped
function quietSet(ctl, v) { coercing = true; try { ctl.set(v); } finally { coercing = false; } }
function dsEl(k) {   // the dataset control's element for a set key: the kit select's option (30 Sep), else the older switch's button
  return document.querySelector('#controls .kit-select[data-key="data"] option[value="' + k + '"]') || document.querySelector('#controls button[data-value="' + k + '"]');   // the fallback is the switch's button (or null) — never this function again (a self-call recursed without end on the mirror, 15:17– 30 Sep)
}
function setDisabled(btn, off, why) {
  if (btn && btn.tagName === 'OPTION') { btn.disabled = !!off; return; }   // a select's option: greyed and unselectable by the kit's rule
  if (!btn) return;
  btn.disabled = off; btn.setAttribute('aria-disabled', String(off));
  if (off && why) btn.title = why; else btn.removeAttribute('title');   // a disabled control carries no sentence in its hover (the project maintainers' 28 Sep word; the maintainers  29 Sep)
}

/* the estimator's honest name per chain (the project maintainers' word of 28 Aug 2026: the
 * estimator named by what it is, never by a project label) */
function houseName() {
  return state.def === 'average' ? 'Local-logistic fit'
                                 : 'Binned medians';
}
function buildSrcSwitch() {
  srcMount.textContent = '';
  // the project maintainers' word of 3 Sep 2026 (the Bayesian fit preferred for the averages, for now) — the
  // Bayesian fit is the default view for the average-rate chain; the reference fit stays an option
  // the Bayesian button is available as soon as one arm has a Bayesian curve (served or interim), but a view
  // OPENS on it only when at least half of its arms are fitted — under one estimator per view (the project maintainers 4 Sep)
  // unfitted arms are not drawn, and a first open must draw the arms (5 Sep: board + top half opened on
  // 1 of 57 arms when the fit maintainers' first interim arm landed). A bound pointer with nothing landed yet opens on
  // the reference fit with the Bayesian button disabled and the pointer's own note as the reason.
  var _bf = D.shared.frame && D.shared.frame.bayes_fits;
  var nBayes = Object.keys(D.avg.configs || {}).filter(function (k) { return !!(D.avg.configs[k] && D.avg.configs[k].bayes); }).length;
  var hasBayesLayer = !!_bf && nBayes > 0;
  var bayesDefault = hasBayesLayer && nBayes * 2 >= (D.shared.configs || []).length;
  var srcCtl = Kit.switchControl({ mount: srcMount, key: 'src',
    label: 'Curve estimator',
    options: [{ value: 'bayes', label: 'Bayesian' },
              { value: 'project', label: houseName() }],
    dflt: (state.def === 'average' && bayesDefault) ? 'bayes' : 'project',
    onchange: function (v) {
      var was = state.src;
      state.src = v;
      if (ready && !coercing && v !== was) render();
    } });
  if (!hasBayesLayer) {
    setDisabled(srcCtl.element.querySelector('button[data-value="bayes"]'), true,
      '');   // no sentence in the control; the state is the Definitions fold's prose   // hovers: one sentence, at most 160 characters
    if (state.src === 'bayes') { state.src = 'project'; quietSet(srcCtl, 'project'); }
  }
}

/* axis scales (the project maintainers 28 Aug 2026: percent labels only; each axis
 * switchable logit vs raw). Raw = linear in probability. */
function xt(z) {           // difficulty logit -> axis coordinate
  return state.xs === 'raw' ? pct(z) / 100 : z;
}
function yt(z) { return state.ys === 'raw' ? pct(z) / 100 : z; }
/* the project maintainers' word of 3 Sep 2026 (via the coordination): the two axes kept on one scale —
 * whenever x and y share units (both logit or both raw) both axes take ONE
 * common limit and the plot area is square, so one unit is one length on
 * either axis; mixed scales keep their own limits. */
function sameUnits() { return state.xs === state.ys; }
function commonLim() {
  if (!sameUnits()) return null;
  if (state.xs === 'raw') return [-0.015, 1.015];
  return [Math.min(XLIM[0], YLIM[0]), Math.max(XLIM[1], YLIM[1])];
}
function xlimT() {
  if (pinOn()) { var rP = pinR(); return [-rP, rP]; }   // the relative axis, the pin at 0
  var c = commonLim();
  if (c) return c;
  return state.xs === 'raw'
    ? [Math.max(0, pct(XLIM[0]) / 100 - 0.02),
       Math.min(1, pct(XLIM[1]) / 100 + 0.02)]
    : XLIM;
}
var Y_FLOOR_GAP = 0.15;   // logit units between the axis line and the 0.2% level where zero-failure curves flatline (a hair, so the flatline is not on the axis)
function ylimT() {
  if (pinOn()) return state.ys === 'raw' ? [-0.015, 1.015] : [YLIM[0] - Y_FLOOR_GAP, YLIM[1]];   // the y axis unchanged by the pin: its own range
  var c = commonLim();
  if (c) return state.ys === 'raw' ? c : [YLIM[0] - Y_FLOOR_GAP, c[1]];   // the project maintainers' word, 13:2x UK 18 Sep: nothing is drawn below the 0% representation, so the y floor sits just under it; the x range keeps the common scale
  return state.ys === 'raw' ? [-0.015, 1.015] : YLIM;
}
function sx(z) {
  var L = xlimT();
  return ML + (xt(z) - PIN_DX - L[0]) / (L[1] - L[0]) * PW;   // PIN_DX: the curve being drawn moves by its own offset under the pin (0 otherwise)
}
function sy(z) {
  var L = ylimT();
  return MT + (L[1] - yt(z)) / (L[1] - L[0]) * PH;
}
function clampY(v) { return Math.min(YLIM[1], Math.max(YLIM[0], v)); }

function boot() {
  var zs = D.shared.tasks.z;
  XLIM = [zs.reduce(function (a, b) { return Math.min(a, b); }) - 0.2,
          zs.reduce(function (a, b) { return Math.max(a, b); }) + 0.2];

  // Selection is keyed by ARM IDENTITY (the project maintainers' word of 4 Sep 2026: the page kept a chip ordering that differed
  // between datasets — a bug to fix): ?sel= carries config ids joined by commas, stable across
  // datasets and estimators; a legacy positional link (digits and dots) is re-bound once by position and rewritten.
  sel = new Set();
  legacySel = false;
  var selParam = Kit.state.get('sel', null);
  if (selParam !== null && selParam !== '') {
    var ids = D.shared.configs.map(function (c) { return c.id; });
    var keys = D.shared.configs.map(function (c) { return c.arm_key || c.id; });   // cross-dataset identity
    var slugs = D.shared.configs.map(function (c) { return slugOfRecord(c.label); });   // the keys of record (26 Sep); a legacy link's ids still resolve below and are rewritten as slugs
    if (/^[0-9.]+$/.test(selParam)) {
      legacySel = true;
      selParam.split('.').forEach(function (i) { if (ids[+i] !== undefined) sel.add(+i); });
    } else {
      selParam.split(',').forEach(function (raw) {
        var id = decodeURIComponent(raw); var k = slugs.indexOf(id);
        if (k < 0) k = keys.indexOf(id);
        if (k < 0) k = ids.indexOf(id);
        if (k >= 0) sel.add(k);
      });
    }
    if (!sel.size) D.shared.configs.forEach(function (c, i) { if (!isRunConfig(c)) sel.add(i); });   // a run's checkpoints open deselected (22 Sep)
    // a link naming only hidden partial arms would draw nothing (the project maintainers' word of 7 Sep: something shown rather than no output):
    // keep the ids in the address, grey the chips, and draw every shown arm
    if (!Array.from(sel).some(shownArm)) D.shared.configs.forEach(function (_, i) { if (shownArm(i)) sel.add(i); });
  } else {
    D.shared.configs.forEach(function (c, i) { if (!isRunConfig(c)) sel.add(i); });   // a run's checkpoints open deselected (the project maintainers' word of 22 Sep)
  }

  var row = Kit.filterRow('#controls');
  // the project maintainers' word of 10 Sep (coordinator note): wave 1+2 matters most, then wave 1 alone as a sanity check, then wave 2 alone,
  // then the rest — the list runs in that order; wave 1+2 stays the default. The project maintainers' word of 30 Sep 2026 (via the coordination): a dataset control better than
  // chips for the sets now browsable here — the reference select (Kit.selectControl, the maintainers 30 Sep): the coding sets first, then the six
  // non-code sets under the group heading NON-CODE BENCHMARKS D99-D50; an unbuilt set greyed and unselectable; the URL param ?data=<key> as before.
  var dsAvail = function (k) { if (k === 'all') return ALL_AVAILABLE; if (k === 'board_top' || k === 'top') return !!TOP_AVAILABLE[k]; if (isExtra(k)) return !!EXTRA_AVAILABLE[k]; return true; };
  var dsOpt = function (k) { return { value: k, label: setWord(DATASETS[k].label), disabled: !dsAvail(k) }; };
  var dsOnChange = function (v) {
      if (!ready || coercing) return;
      if (v === 'all' && !ALL_AVAILABLE) { quietSet(dsCtl, DATASET); return; }
      if (isExtra(v) && !EXTRA_AVAILABLE[v]) { quietSet(dsCtl, DATASET); return; }
      if (v !== DATASET) window.location.reload();   // the whole data bundle changes
  };
  var nbKeys = Object.keys(DATASETS).filter(function (k) { return DATASETS[k].nb; }), plainKeys = Object.keys(DATASETS).filter(function (k) { return !DATASETS[k].nb; });
  var dsCtl = (Kit.selectControl && nbKeys.length)
    ? Kit.selectControl({ mount: row, key: 'data', label: 'Dataset', options: plainKeys.map(dsOpt), groups: [{ label: NB_GROUP_HEADING, options: nbKeys.map(dsOpt) }], dflt: DEFAULT_DATASET, onchange: dsOnChange })
    : Kit.switchControl({ mount: row, key: 'data', label: 'Dataset', options: Object.keys(DATASETS).map(function (k) { return { value: k, label: setWord(DATASETS[k].label) }; }), dflt: DEFAULT_DATASET, onchange: dsOnChange });   // a mount without the kit's select (an older vendored kit) keeps the switch
  if (DATASETS.all) setDisabled(dsEl('all'), !ALL_AVAILABLE, DATASETS.all.disabled);
  if (DATASETS.board_top) setDisabled(dsEl('board_top'), !TOP_AVAILABLE.board_top, DATASETS.board_top.disabled);
  if (DATASETS.top) setDisabled(dsEl('top'), !TOP_AVAILABLE.top, DATASETS.top.disabled);
  Object.keys(DATASETS).filter(isExtra).forEach(function (ds) {   // a mirror's keys: greyed until built; named and sized from the bundle frame, never typed
    var bt = dsEl(ds);
    setDisabled(bt, !EXTRA_AVAILABLE[ds], '');
    if (!EXTRA_AVAILABLE[ds]) return;
    fetch(DATASETS[ds].src).then(function (r) { return r.json(); }).then(function (m) {
      var f = m.frame || {}; if (!bt || !f.dataset_label) return;
      var nm = String(f.dataset_label).split(':')[0]; DATASETS[ds].label = nm; DATASETS[ds].short = nm; bt.textContent = setWord(nm);
      var hv = DATASETS[ds].hover ? String(f.dataset_label) + ' — ' + DATASETS[ds].hover : String(f.dataset_label);
      noteDataset(ds, hv); bt.title = oneSentence(hv);
    }).catch(function () {});
  });
  (function () {   // which tasks are in (the project maintainers' word,; Definitions' counts from the bundles' frames)
    ['board_top', 'top'].forEach(function (ds) {
      if (!TOP_AVAILABLE[ds]) return;
      fetch(DATASETS[ds].src).then(function (r) { return r.json(); }).then(function (m) {
        var f = m.frame || {}, b = f.bayes_fits; var bt = dsEl(ds); if (!bt) return;
        var nk = f.tasks_kept || f.tasks_manifest || f.tasks;
        if (nk && !OFFICIAL) { var lb = Number(nk).toLocaleString('en-US') + ' tasks'; DATASETS[ds].label = lb; DATASETS[ds].short = lb; bt.textContent = lb; }
        if (ds === 'top' && nk) setTopCount(nk);
        var _full = (OFFICIAL ? OFFICIAL[ds].hover + ' — ' : (ds === 'board_top' ? 'wave 1 plus wave 2 on one axis — ' : 'wave 2 alone — '))
          + 'the tasks on the axis at this build'
          + (b && (b.drawn || b.n_fits) ? '; opens on the Bayesian estimator (' + (b.n_fits || 0) + ' served + ' + ((b.newer && b.newer.drawn_interim) || 0) + ' interim fits)' : '; opens on the local-logistic fit');
        noteDataset(ds, _full); bt.title = oneSentence(_full);
      }).catch(function () {});
    });
  })();
  // which estimator each dataset opens with (coordinator 4 Sep 2026 on the project maintainers' words; one estimator per view): read from the
  // bundles' frames where they exist, so the hover is a fact, not a promise
  (function () {
    function setOpen(ds, txt) { var bt = dsEl(ds); if (bt && !bt.disabled) { noteDataset(ds, txt); bt.title = oneSentence((OFFICIAL && OFFICIAL[ds]) ? OFFICIAL[ds].hover : txt); } }
    if (DATASETS.board) fetch('data/manifest.json').then(function (r) { return r.json(); }).then(function (m) {   // the board bundle's frame (counts of record, opening estimators): board pages only, never a mirror mount
      var b = m.frame && m.frame.bayes_fits;
      if (m.frame && m.frame.tasks) setBoardCount(m.frame.tasks);   // the kept benchmark-task count moves with task-audit's labels (438 -> 433 on 7 Sep)
      if (m.frame && m.frame.counts_of_record) applyOfficialNames(m.frame.counts_of_record);   // official names on every view, from the board bundle's frame (the maintainers' bundle carries none)
      try { if (typeof D !== 'undefined' && D.shared && D.shared.frame) stamp(); } catch (e) {}   // the chrome line may have rendered with an older bundle's counts
      if (DATASETS.board || DATASETS['board']) setOpen('board', DATASETS.board.hover + '; ' + (b && b.n_fits ? 'opens on the Bayesian estimator (' + b.n_fits + ' fitted models; the rest await their fit)' : 'opens on the local-logistic fit (no Bayesian fit set yet)'));
    }).catch(function () {});
    if (ALL_AVAILABLE) fetch('data-all/manifest.json').then(function (r) { return r.json(); }).then(function (m) {
      var b = m.frame && m.frame.bayes_fits;
      var nk = m.frame && (m.frame.tasks_kept || m.frame.tasks); var ab = dsEl('all');
      if (nk && ab && !OFFICIAL) { var lb = Number(nk).toLocaleString('en-US') + ' tasks'; DATASETS.all.label = lb; DATASETS.all.short = lb; ab.textContent = lb; }
      setOpen('all', b && (b.drawn || b.n_fits) ? 'opens on the Bayesian estimator (' + (b.n_fits || 0) + ' served + ' + ((b.newer && b.newer.drawn_interim) || 0) + ' interim fits drawn; the rest await their fit)' : 'opens on the local-logistic fit (no Bayesian fit for this set yet)');
    }).catch(function () {});
    setOpen('new', 'opens on the Bayesian estimator where the pool wave serves a model; models without a posterior await their fit');
    // the project maintainers' word of 4 Sep 2026 (whether pool meant all the tasks or only the two quarters was unclear): the hover quotes the pool pages'
    // sentence with the digits bound from their frame file — frame.json when it is live (its `sentence` key), else
    // data.json's frame_of_record + bayes block — never typed here
    var poolFrameSrc = DATASETS['new'] ? DATASETS['new'].src.replace(/data\.json$/, 'frame.json') : null;   // a mirror without the pool view skips this block
    function composeNewHover(fr, by, B) {
      var n = fr.count, w = B.wave_id, m = B.n_tasks;
      return 'wave 2 and wave 2 parked = every pool task whose certificate is complete for admission and whose label is regular or tricky — '
        + 'the whole kept pool across all four quarters; '   // no task counts here (the project maintainers' word of 10 Sep); the set label carries the count of record
        + 'not the focus set, which orders generation on wave 1 and is not a fit frame.'
        + (w ? ' The served Bayesian curves were fitted on the pool set as cut at their snapshot.' : '')
        + ' ' + FITTING_PARKED_SENTENCE
        + ' Opens on the Bayesian estimator where a model has a posterior.';
    }
    // the fit maintainers' quotable fact (4 Sep 2026), literal, dated: the fits take no focus filter
    var FITTING_PARKED_SENTENCE = 'The fits use every certified task with data, labelled regular or tricky, whether it is in wave 2 or not.';
    if (poolFrameSrc) fetch(poolFrameSrc).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }).then(function (F) {
      if (F && F.sentence) { setOpen('new', noWaveIds(F.sentence) + ' ' + FITTING_PARKED_SENTENCE + ' Opens on the Bayesian estimator where a model has a posterior.'); return; }
      return fetch(DATASETS['new'].src).then(function (r) { return r.ok ? r.json() : null; }).then(function (P) {
        if (!P || !P.frame || !P.frame.frame_of_record) return;
        var fr = P.frame.frame_of_record, by = fr.by_label || {};
        if (fr.count == null || by.regular == null) return;
        setOpen('new', composeNewHover(fr, by, P.bayes || {}));
      });
    }).catch(function () {});
  })();
  // model selection lives with the model chips (the project maintainers 4 Sep 2026: an Arms chip is model selection, not a diagram control)
  var armsRow = Kit.filterRow('#armsrow');
  var armsCtl = Kit.switchControl({ mount: armsRow, key: 'arms', label: 'Models',
    options: [{ value: 'all', label: 'all models' }, { value: 'golden', label: 'golden set' }],
    dflt: 'all',
    onchange: function (v) {
      if (!ready || coercing) return;
      if (v === 'golden' && !GOLDEN_AVAILABLE[DATASET]) { quietSet(armsCtl, ARMS); return; }
      if (v !== ARMS) window.location.reload();
    } });
  if (MIRROR && !Object.keys(DATASETS).some(function (k) { return !!GOLDEN_AVAILABLE[k]; })) armsRow.style.display = 'none';   // no golden bundle under this mount: no Arms switch (the results browser's maintainers 11 Sep)
  setDisabled(armsCtl.element.querySelector('button[data-value="golden"]'), !GOLDEN_AVAILABLE[DATASET], '');
  if (ARMS === 'golden') { var _g = armsCtl.element.querySelector('button[data-value="golden"]'); if (_g) _g.title = 'golden set: Qwen3 0.6B/1.7B/4B/8B plain + thinking, Claude Haiku 4.5 + Sonnet 5 plain + thinking — axis and curves from these 12 models only; a data point, not the difficulty definition (as adopted of 3 Sep)'; }
  var partialCtl = Kit.switchControl({ mount: row, key: 'partial', label: 'Partial models',
    options: [{ value: 'hide', label: 'hidden' }, { value: 'show', label: 'show partial models' }],
    dflt: 'hide',
    onchange: function (v) { var was = state.partial; state.partial = v; if (ready && !coercing && v !== was) render(); } });
  (function () {
    var pa = partialArms();
    var tip = 'models with attempts on fewer than 90% of the dataset\'s tasks' + (pa.length ? ' — ' + pa.length + ' here, named in the notes below the chart' : '');
    partialCtl.element.title = tip;
  })();
  Kit.switchControl({ mount: row, key: 'def', label: 'Definition',
    options: [{ value: 'average', label: 'Average rate' },
              { value: 'median', label: 'Median task' }],
    dflt: 'average',
    onchange: function (v) {
      state.def = v;
      if (srcMount) buildSrcSwitch();   // estimator renamed per chain
      if (ready && !coercing) render();
    } });
  srcMount = document.createElement('span');
  row.appendChild(srcMount);
  buildSrcSwitch();
  bandCtl = Kit.switchControl({ mount: row, key: 'band', label: 'Uncertainty bands',
    options: [{ value: 'off', label: 'Off' },
              { value: '80', label: '80%' },
              { value: '90', label: '90%' },
              { value: '95', label: '95%' }],
    dflt: '90',
    onchange: function (v) { state.band = v; if (ready && !coercing) render(); } });
  Kit.switchControl({ mount: row, key: 'xs', label: 'X scale',
    options: [{ value: 'logit', label: 'Logit' },
              { value: 'raw', label: 'Raw' }],
    dflt: 'logit',
    onchange: function (v) { state.xs = v; if (ready && !coercing) render(); } });
  Kit.switchControl({ mount: row, key: 'ys', label: 'Y scale',
    options: [{ value: 'logit', label: 'Logit' },
              { value: 'raw', label: 'Raw' }],
    dflt: 'logit',
    onchange: function (v) { state.ys = v; if (ready && !coercing) render(); } });
  pinCtl = Kit.switchControl({ mount: row, key: 'pin', label: 'Pin',
    options: [{ value: 'off', label: 'Off' }, { value: 'on', label: 'On' }],
    dflt: 'off',
    onchange: function (v) { state.pin = v; if (pinBox) pinBox.style.display = v === 'on' ? '' : 'none'; if (ready && !coercing) render(); } });
  state.pin = Kit.state.get('pin', 'off') === 'on' ? 'on' : 'off';   // off at the open (the project maintainers' word of 30 Sep 2026); a link that carries ?pin=on opens pinned, as the other switches' params do (the maintainers's checker drives the pinned view by its URL, 30 Sep)
  pinBox = document.createElement('label'); pinBox.className = 'pinlevel'; pinBox.style.display = state.pin === 'on' ? '' : 'none';
  var pinIn = document.createElement('input'); pinIn.type = 'text'; pinIn.inputMode = 'decimal'; pinIn.value = PIN_LEVEL_LAST; pinIn.size = 4; pinIn.setAttribute('aria-label', 'pinned failure rate, percent');
  var pinUnit = document.createElement('span'); pinUnit.textContent = '%';
  pinBox.appendChild(pinIn); pinBox.appendChild(pinUnit); row.appendChild(pinBox);
  var takeLevel = function () {   // the typed value used exactly (the project maintainers' word of 22 Sep 2026); an entry that is not a rate between 0 and 100 keeps the last good level
    var v = Number(String(pinIn.value).replace(',', '.').replace('%', '').trim());
    if (isFinite(v) && v > 0 && v < 100) { PIN_LEVEL = v; PIN_LEVEL_LAST = pinIn.value; if (ready && pinOn()) render(); } else pinIn.value = PIN_LEVEL_LAST;
  };
  pinIn.addEventListener('change', takeLevel);
  pinIn.addEventListener('keydown', function (e) { if (e.key === 'Enter') { takeLevel(); e.preventDefault(); } });
  dotsCtl = Kit.switchControl({ mount: row, key: 'dots', label: 'Task dots',
    options: [{ value: '0', label: 'Off' },
              { value: '1', label: 'On' }],
    dflt: '0',
    onchange: function (v) { state.dots = v; if (ready && !coercing) render(); } });
  Kit.switchControl({ mount: row, key: 'rm',
    label: 'Raw running median',
    options: [{ value: '0', label: 'Off' },
              { value: '1', label: 'On' }],
    dflt: '0',
    onchange: function (v) { state.rm = v; if (ready && !coercing) render(); } });
  // linear trend through each arm's Bayesian curve (the fit maintainers' linefit; ported from the pool page):
  // long-dashed straight line over the fitted range, slope on hover; only where the posteriors carry it
  var anyLinefit = Object.keys(D.avg.configs || {}).some(function (k) { var b = D.avg.configs[k] && D.avg.configs[k].bayes; return !!(b && b.linefit); });
  var trendCtl = Kit.switchControl({ mount: row, key: 'trend', label: 'Trend',
    // the project maintainers 7 Sep 2026 (via the capability page's maintainers): every on/off switch reads Off | On in that order; only the pressed default differs
    options: [{ value: 'off', label: 'Off' }, { value: 'on', label: 'On' }],
    dflt: 'on',
    onchange: function (v) { state.trend = v; if (ready && !coercing) render(); } });
  if (!anyLinefit) {
    state.trend = 'off';
    setDisabled(trendCtl.element.querySelector('button[data-value="on"]'), true, '');
  }

  buildChips();
  if (legacySel) writeSel();   // the link now carries arm identities; a note explains once (fold-out)
  buildCrosshair();
  ready = true;            // F014: a cold ?src=bayes load used to draw before
  render();                // the chips existed and died on an unfitted arm
  var rt = null;
  window.addEventListener('resize', function () {
    clearTimeout(rt); rt = setTimeout(render, 150);
  });
}

/* ---------------- config chips ---------------- */
var legacySel = false;
function writeSel() {
  var all = sel.size === D.shared.configs.length;
  Kit.state.set('sel', all ? null
    : Array.from(sel).sort(function (a, b) { return a - b; }).map(function (i) { return slugOfRecord(D.shared.configs[i].label) || D.shared.configs[i].arm_key || D.shared.configs[i].id; }).join(','),   // slugs of the names of record (26 Sep)
    null);
}
function isRunConfig(c) {   // a checkpoint of a training run (the project maintainers' word of 22 Sep, via the coordination: the run's checkpoints are their own row, out of the bulk list): the runs' stems today; the builder's explicit run field takes over when it lands
  if (c.run) return true;   // the bundle's run field (the labels row's family for a checkpoint row) when the builder carries it
  return /olmo-?3(\.1)?-7b-(rl-?zero-?(code|math)|rlz[cm]|think)/i.test(String(c.id || '') + ' ' + String(c.arm_key || ''));
}
function runNameOf(c) {   // the run's full name: the bundle's run field, else the checkpoint label without its step or final qualifier
  // 26 Sep : the label of record without its checkpoint qualifier is the run's name when it carries the 'base · what was done' form (decision 135); the builder's run field
  // for a served config names the base (the labels row's family) for the training loop's runs, the same fault the run rows' heading had at 15:0x on 26 Sep
  var fromLabel = String(c.label || '').replace(/\s*\(((checkpoint|position|step)\s+\d+|final)\)\s*$/i, '').trim();
  if (fromLabel && fromLabel.indexOf(' · ') > 0) return fromLabel;
  return c.run || fromLabel || String(c.label || '');
}
function buildChips() {
  nameFamilies(D.shared);   // the family labels of record before the rows are grouped and headed (buildChips runs at load, before the first render)
  var box = document.getElementById('chips');
  var fams = [], runs = [];
  try { seriesRows(); } catch (e) { }   // orders the run rows in place first, so ROW_KEPT names the served twins the rows keep before the bulk is grouped (26 Sep )
  D.shared.configs.forEach(function (c, i) {
    if (ROW_KEPT[c.id]) return;   // a served twin a run row keeps: no chip here, no group membership (26 Sep )
    if (isRunConfig(c)) { var r = runs.find(function (x) { return x.name === runNameOf(c); }); if (!r) { r = { name: runNameOf(c), members: [] }; runs.push(r); } r.members.push(i); return; }
    var f = fams.find(function (x) { return x.name === c.family; });
    if (!f) { f = { name: c.family, members: [] }; fams.push(f); }
    f.members.push(i);
  });
  var allBtn = document.createElement('button');
  allBtn.className = 'util'; allBtn.textContent = 'all';
  allBtn.onclick = function () {
    D.shared.configs.forEach(function (c, i) { if (!isRunConfig(c)) sel.add(i); });   // the bulk's buttons leave the runs' rows alone (22 Sep)
    writeSel(); render();
  };
  var noneBtn = document.createElement('button');
  noneBtn.className = 'util'; noneBtn.textContent = 'none';
  noneBtn.onclick = function () { D.shared.configs.forEach(function (c, i) { if (!isRunConfig(c)) sel.delete(i); }); writeSel(); render(); };   // the bulk's none leaves the runs' rows alone (22 Sep)
  box.appendChild(allBtn); box.appendChild(noneBtn);
  // the project maintainers 3 Sep 2026: withdrawn results are absent from every display — no placeholder chips
  fams.forEach(function (f) {
    var nm = document.createElement('button');
    nm.className = 'fam';
    nm.style.color = D.shared.configs[f.members[0]].color;
    nm.textContent = f.name;
    nm.onclick = function () {
      var anyOff = f.members.some(function (i) { return shownArm(i) && !sel.has(i); });
      f.members.forEach(function (i) {
        if (!shownArm(i)) return;   // hidden partial arms are unselectable
        if (anyOff) sel.add(i); else sel.delete(i);
      });
      writeSel(); render();
    };
    box.appendChild(nm);
    f.members.forEach(function (i) {
      var c = D.shared.configs[i];
      var b = document.createElement('button');
      b.className = 'chip';
      b.style.color = c.color; b.style.borderColor = c.color;
      b.textContent = c.label.replace(new RegExp('^' + f.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?=[\\s/_:-]|$)[\\s/_:-]*'), '').trim() || c.label;   // the strip needs the family name to END at a separator: with the family key "Olmo 3" (22 Sep) the label "Olmo 3.1 7B …" keeps its whole name instead of losing "Olmo 3" and printing ".1 7B …" // family prefix AND its separator go ("GPT-5-nano" under GPT-5 reads "nano", not "-nano")
      b.dataset.label = b.textContent; b.dataset.name = (c && c.label) || b.textContent;   // the full name of record, for readers (the maintainers's parity scan)
      b.dataset.idx = i;
      b.onclick = function () {
        if (sel.has(i)) sel.delete(i); else sel.add(i);
        writeSel(); render();
      };
      chips.push(b);
      box.appendChild(b);
      // the project maintainers 4 Sep 2026: no tag signs on chips (they doubled the chip width) — state is grey vs normal, the
      // record's line is the chip hover, and the per-arm flags with their notes links are listed in the fold-out
    });
  });
  // the training runs' rows (the project maintainers' word of 22 Sep, via the coordination): each run its own row after the bulk, named by the run's full name,
  // its checkpoints as chips, its own all and none, out of the bulk's buttons; the chips open deselected
  runs.forEach(function (r) {
    var br = document.createElement('div'); br.className = 'runrow'; br.style.flexBasis = '100%'; box.appendChild(br);
    var nm = document.createElement('span'); nm.className = 'fam'; nm.textContent = r.name; nm.title = 'the checkpoints of one training run, positioned on this scale; the bulk buttons leave this row alone';
    nm.style.color = D.shared.configs[r.members[0]].color; box.appendChild(nm);
    // one row per run: the fit maintainers' checkpoint-series block for this run joins the row in training order, its chips before the
    // set member's own final; the pointer's copy of the final is not drawn (seriesBlock drops it) — the final's chip and fit stay the served set's, its D50 and D99 in the main table
    seriesRows().forEach(function (sbR) {   // one row per run (24 Sep): each run's checkpoint-series block joins the served set's row of the same run, else draws its own row below
    var sbRun = sbR ? ((sbR.arms[0] && sbR.arms[0].run) || headingShort(sbR)) : null; var seriesSel = seriesSelFor(sbR._row);
    if (sbR && sbRun === r.name) {
      
      SERIES_MERGED[r.name] = true;
      sbR.arms.forEach(function (a, k) {
        var b = document.createElement('button'); b.className = 'chip serieschip'; b.style.color = a.color; b.style.borderColor = a.color;
        b.textContent = a.short_label || a.label; b.dataset.label = b.textContent; b.dataset.name = a.label || b.textContent; b.dataset.name = a.label || b.textContent; b.dataset.series = String(k); b.dataset.row = String(sbR._row);   // the short form of record ('RL-Zero Code · 0/32') from the labels row, never composed
        var parts = []; if (a.disclosure) parts.push(currentTruth(a.disclosure)); if (a.set_label) parts.push('fitted on ' + a.set_label);
        if (a.gates_failed) parts.push(a.gate_face ? noSpecTags(String(a.gate_face)) : 'this fit failed its own check; drawn lighter, with its disclosure');
        if (a.protocol) parts.push('read by ' + a.protocol + ': the base model continues the prompt, no chat turn');
        b.dataset.state = noSpecTags(parts.join(' · ')); b.title = (a.withheld && a.disclosure) ? noSpecTags(currentTruth(String(a.disclosure))) : oneSentence(noSpecTags(parts[0] || a.label)); if (a.gates_failed) { b.title += ' \u00b7 this fit failed its own check and is drawn lighter'; b.classList.add('gated'); b.style.borderStyle = 'dashed'; }   // a withheld checkpoint's hover is the fit maintainers' whole sentence with its held-out clause and floor, never cut (the pool pages lead  23 Sep)      // a failed fit is not a plain position (the project maintainers' current-truth word of 24 Sep; the maintainers's read): the hover says so and the chip's border is dashed
        b.onclick = function () { if (seriesSel.has(k)) seriesSel.delete(k); else seriesSel.add(k); render(); };
        seriesChips.push(b); box.appendChild(b);
      });
    }
    });
    r.members.forEach(function (i) {
      var c = D.shared.configs[i]; var b = document.createElement('button'); b.className = 'chip'; b.style.color = c.color; b.style.borderColor = c.color;
      b.textContent = c.short_label || SHORT_LABELS_OF_RECORD[c.id] || c.label;   // the bundle's short label of record when the builder carries it, else the row's value carried here by hand (transitional), else the full label — never a composed form
      b.dataset.label = b.textContent; b.dataset.name = c.label || b.textContent; b.dataset.idx = i;
      b.onclick = function () { if (sel.has(i)) sel.delete(i); else sel.add(i); writeSel(); render(); };
      chips.push(b); box.appendChild(b);
    });
    ['all', 'none'].forEach(function (w) { var ub = document.createElement('button'); ub.className = 'util'; ub.textContent = w; ub.onclick = function () { r.members.forEach(function (i) { if (w === 'all') sel.add(i); else sel.delete(i); }); seriesRows().forEach(function (sbX) { if (SERIES_MERGED[r.name] && (((sbX.arms[0] && sbX.arms[0].run) || headingShort(sbX)) === r.name)) { var ssX = seriesSelFor(sbX._row); ssX.clear(); if (w === 'all') sbX.arms.forEach(function (_, k) { ssX.add(k); }); } }); writeSel(); render(); }; box.appendChild(ub); });   // the row's buttons cover its checkpoints too
  });
}

/* ---------------- chain readers (interpolation only) --------- */
/* Returns for config index i: {zs, mid, lo, hi} arrays (lo/hi null
 * when bands off), plus meta for the median project form. */
function chainCurve(i) {
  var id = D.shared.configs[i].id;
  var lvl = state.band;
  if (state.src === 'bayes') {
    var cfgB = (state.def === 'average' ? D.avg : D.med).configs[id];
    var src = cfgB && cfgB.bayes;
    if (!src) {                       // not in the serving fit set (F014)
      var ra = runFitFor(id);         // the training run's fit of record for this model (24 Sep)
      if (ra) { var rc = sideCurve(ra); if (rc) { rc.form = 'line'; rc.runFit = true; return rc; } }
      var h = houseCurve(id, lvl);
      h.houseOnly = true; h.lo = null; h.hi = null;
      return h;
    }
    var rows = { '80': [1, 5], '90': [0, 6], '95': [0, 6] };
    if (src.levels && src.levels.indexOf(lvl) < 0 && lvl !== 'off') lvl = src.levels[src.levels.length - 1];
    var r = rows[lvl === 'off' ? (src.levels ? src.levels[src.levels.length - 1] : '90') : lvl];
    return { zs: src.zgrid, mid: src.q[3],
             lo: lvl === 'off' ? null : src.q[r[0]],
             hi: lvl === 'off' ? null : src.q[r[1]], form: 'line' };
  }
  return houseCurve(id, lvl);
}

// per-arm task coverage: the frame's coverage block (my bundles) or the dots payload (tasks with any attempt)
function covOf(i) {
  var c = D.shared.configs[i]; var f = D.shared.frame || {};
  var cv = f.coverage && f.coverage[c.id];
  var of = (D.shared.tasks && D.shared.tasks.id ? D.shared.tasks.id.length : null) || f.tasks || 0;
  if (cv && cv.tasks != null) return { tasks: cv.tasks, of: cv.of || of };
  var dd = D.dots && D.dots.configs && D.dots.configs[c.id];
  var n = 0;
  if (dd && dd.fails) for (var t = 0; t < dd.fails.length; t++) if (dd.fails[t] != null) n++;
  return { tasks: n, of: of };
}
function attemptsPartial(i) {   // fitting's set form of 30 Sep (fit-methods 16b.9(c)): the set pointer names the panel models at fewer answers a task than the set's standard (32 against 128) — partial by attempts, the same switch and greying as partial by coverage
  var f = D.shared.frame || {}; var pa = f.partial_attempts; var c = D.shared.configs[i]; return !!(pa && c && pa[c.id]);
}
function isPartial(i) { var cv = covOf(i); return (cv.of > 0 && cv.tasks / cv.of < PARTIAL_MIN) || attemptsPartial(i); }
// the project maintainers' word of 7 Sep 2026 (better not shown by default; a toggle whose default shows the partial arms):
// partial arms are hidden unless the Partial arms switch shows them
// the project maintainers 9 Sep 2026 (via the coordination): Gemma 4 12B is not shown while a quarter of its tasks hit the cap, because
// its performance is then unmeasured — knob curves-site/not_shown_arms.json (the project maintainers' words inside): matching arms are not drawn and
// unselectable on EVERY dataset (the pool bundle included); the Partial arms switch does not reveal them; one note line names them.
var NOT_SHOWN = null;
if (!MIRROR) fetch('not_shown_arms.json').then(function (r) { return r.json(); }).then(function (k) {   // board-arm decisions: not fetched under a mirror mount
  NOT_SHOWN = (k && Array.isArray(k.arms) && k.arms.length) ? k : null;
  try { if (typeof ready !== 'undefined' && ready) render(); } catch (e) {}
}).catch(function () {});
// the project maintainers, 9 Sep 2026 (refusals from Opus 5 are not failures): the decision of 8 Sep 2026 excludes the
// tasks Opus refused on every attempt from the Opus arms' cells and fits — the cells are dropped upstream (Definitions' intake loader,
// the fit maintainers' cut, the pool bundle's loader); knob curves-site/not_fitted_cells.json (from the runs lead's contract) lets every dataset SAY it on the arm.
var NOT_FITTED = null;
if (!MIRROR) fetch('not_fitted_cells.json').then(function (r) { return r.json(); }).then(function (k) {
  NOT_FITTED = (k && k.arms && Object.keys(k.arms).length) ? k : null;
  try { if (typeof ready !== 'undefined' && ready) render(); } catch (e) {}
}).catch(function () {});
function notFittedNote(i) {
  if (!NOT_FITTED || !D || !D.shared) return '';
  var c = D.shared.configs[i] || {};
  var norm = function (s) { return String(s || '').toLowerCase().replace(/[|_]batch$/, ''); };
  var ids = [c.id, c.name, c.model, c.arm_key].filter(Boolean).map(norm);
  var hit = Object.keys(NOT_FITTED.arms).filter(function (k) { return ids.indexOf(norm(k)) >= 0; });
  return hit.length ? NOT_FITTED.arms[hit[0]].note : '';
}
function notShown(i) {
  if (!NOT_SHOWN || !D || !D.shared) return false;
  var c = D.shared.configs[i] || {};
  var idn = [c.id, c.name, c.model, c.label, c.arm_key].filter(Boolean).join(' ').toLowerCase();
  return NOT_SHOWN.arms.some(function (a) { return a.match && idn.indexOf(String(a.match).toLowerCase()) >= 0; });
}
function shownArm(i) { if (notShown(i)) return false; return state.partial === 'show' || !isPartial(i); }
function partialArms() { var out = []; D.shared.configs.forEach(function (c, i) { if (isPartial(i)) out.push(i); }); return out; }
function axisWords(id, when, basis) {   // "combined-20260908T1037Z" -> "the difficulty axis, cut 8 Sep 10:37"; ids never reach the reader ("of record" is project shorthand, none on a page — 17 Sep)
  var live = basis === 'live' || /unified-live/.test(String(id || ''));   // Definitions 10 Sep: the all/new mirrors stand on the live unified axis from 13:31 (rebuilt each pass)
  var m = live ? null : /(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})Z/.exec(String(id || ''));
  if (!m) {   // no cut time: the live axis (or an id without one) — the mirror's own time from the bundle
    var w = when ? humanTime(String(when)) : '';
    return (live ? 'the live axis' : 'the difficulty axis') + (w ? ', updated ' + w : '');   // Definitions' name for it: "live axis" with the stamp, never a wave
  }
  var t = humanTime(m[1] + '-' + m[2] + '-' + m[3] + 'T' + m[4] + ':' + m[5] + ':00Z');
  return 'the difficulty axis' + (t ? ', cut ' + t : '');
}
function noNames(s) {   // the project maintainers' page rule of 11 Sep (via the site design maintainers / the task pool critic): the name never on a page (the patterns below are assembled from code points so the served bytes carry no name, 20 Sep) — a dated mention becomes the by-decision form with its date, any other mention the role
  var maintainers = String.fromCharCode(83, 122, 121, 109, 111, 110);   // the name, assembled so it never sits in the served bytes
  var dated = new RegExp('\\(' + maintainers + '\\s+(\\d{4}-\\d{2}-\\d{2}|\\d{1,2} [A-Z][a-z]{2})[^)]*\\)', 'g'), bare = new RegExp('\\b' + maintainers + '\\b', 'g');
  return String(s).replace(dated, function (m, d) { return "(by the project maintainers' decision of " + noBareDates(d) + ')'; }).replace(bare, 'the project maintainers');   // the presentation critic's reading 21 Sep: the role, never the place that identifies the project maintainers
}
function noWaveIds(s) {   // a peer's sentence may name its wave; the face keeps the words and drops the id (the project maintainers 7 Sep: no code-names)
  return String(s).replace(/\b(?:wave|set)\s+[a-z_-]*\d{8}T\d{4}Z(?:-m\d+)?/gi, 'an earlier fit set').replace(/\bon the board\b/g, 'on wave 1')
    .replace(/\s{2,}/g, ' ').replace(/\s+([;,.])/g, '$1');
}
function faceNumbers(s) {   // the project maintainers 8 Sep: one to three significant figures wherever a reader looks — hovers included; full precision stays in the files
  return String(s).replace(/(\d+\.\d+)/g, function (m) {
    var digits = m.replace(/^0+\.?0*/, '').replace('.', '').length;
    if (digits <= 3) return m;
    var v = Number(m); if (!isFinite(v)) return m;
    var out = v.toPrecision(3);
    return (out.indexOf('e') >= 0) ? m : String(Number(out));
  });
}
function currentTruth(t) {   // the project maintainers' word of 24 Sep (12:4x UK, via the maintainers): a page states the current truth only — no re-judging counts, no hours of fits to come, no may-move notes; the
  // clauses of a fit maintainers' disclosure that speak of history or of fits to come leave the line here as well as at their source (clause boundaries only: '; ' and ' · ')
  var HIST = /judg|fitted again|fitted once more|new fit|may move|moved from|\bsince \d|\buntil\b|landing about|at the latest|a second run|double length|re-run|in the count|count on their|stood at|as they stood|checked fit|the check\b|noise floor/i;
  return String(t || '').split(/(; | \u00b7 )/).reduce(function (acc, piece, i, arr) {   // keep separators only when the clause after them is kept
    if (i % 2 === 1) return acc;   // a separator: handled with its clause
    if (HIST.test(piece)) return acc;
    return acc + (acc && i > 0 ? (arr[i - 1] || '; ') : '') + piece;
  }, '').replace(/^[;\s\u00b7]+|[;\s\u00b7]+$/g, '');
}
function oneSentence(s) {   // the project maintainers' 8 Sep bounce (the tooltips read as a wall of text); rule of record: hovers one sentence
  s = String(s || '').trim(); if (!s) return '';
  var cut = s.length;
  [' · ', '; ', '. ', ' — '].forEach(function (sep) { var i = s.indexOf(sep); if (i > 20 && i < cut) cut = i; });
  var out = s.slice(0, cut).trim();
  if (out.length > 160) { var j = out.lastIndexOf(' ', 157); out = out.slice(0, j > 60 ? j : 157) + '…'; }
  return out.replace(/[,;:]$/, '');
}
var DATASET_NOTES = {};   // the clauses that left the dataset hovers (estimator opening, pool sentence) — shown in the fold-out
var NOTES_REDRAW = null;
function noteDataset(k, txt) {   // dataset notes arrive from the bundles' frames after the first paint: a changed note redraws once (coalesced), so the first render
  if (!txt || DATASET_NOTES[k] === txt) return;   // and every later one (a switch, the export's draw-back) show the same notes line (the site design maintainers' read 18 Sep)
  DATASET_NOTES[k] = txt;
  if (ready && !NOTES_REDRAW) NOTES_REDRAW = setTimeout(function () { NOTES_REDRAW = null; render(); }, 0);
}
function noBareDates(s) {   // family form (the pool pages lead): a bare date in reader-facing text reads "8 Sep" (this year) or "8 Sep 2025"
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']; var Y = new Date().getUTCFullYear();
  return String(s).replace(/\b(20\d\d)-(\d\d)-(\d\d)\b(?!T)/g, function (m, y, mo, d) { var t = parseInt(d, 10) + ' ' + MON[parseInt(mo, 10) - 1]; return parseInt(y, 10) === Y ? t : t + ' ' + y; });
}
function noStamps(s) {
  s = noBareDates(s);   // the project maintainers' NO STAMPS word: ISO times in a peer's sentence become relative times; "project state" reads "run state"
  return String(s).replace(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?Z?\b/g, function (m) { return relTime(m); }).replace(/project state/g, 'run state');
}
function bareClock(s) { return String(s == null ? '' : s).replace(/(\b\d{1,2}:\d{2}) UK\b/g, '$1'); }   // the project maintainers' word of 24 Sep (14:2x UK, via the maintainers): a time the project maintainers reads is UK time written bare — 14:50, never 14:50 UK, never Z or UTC
function noSpecTags(s) {
  // hovers too: bare dates read as day-month (the pool pages lead)
  s = noBareDates(s);
  return bareClock(faceNumbers(noSpecTagsRaw(s))); }
function noSpecTagsRaw(s) {   // "(the fit methods maintainers spec 04m)" / "(spec 03g)" tags stay in the source files; a face carries the sentence only
  return String(s).replace(/\s*\((?:fit-methods\s+)?spec\s+[0-9]{2}[a-z]?[^)]*\)/g, '')
    .replace(/\(config\.n_tasks = [\d,]+ of the ([\d,]+)-task frame\)/g, '(of the $1-task frame)')   // field name in the fit maintainers' frame_disclosure strings ( 7 Sep)
    .replace(/\s+([;,.])/g, '$1');
}
function covText(i) {
  if (attemptsPartial(i)) { var pa = (D.shared.frame || {}).partial_attempts[D.shared.configs[i].id] || {}; var pc = Array.isArray(pa.per_cell) ? pa.per_cell.filter(function (v) { return typeof v === 'number'; }) : []; var cnt = (pa.declared_n != null) ? String(pa.declared_n) : (pc.length > 1 ? pc[0] + ' to ' + pc[pc.length - 1] : (pc.length === 1 ? String(pc[0]) : String(pa.per_cell || ''))); return 'partial: ' + cnt + ' answers a task' + (pa.standard ? ' against ' + pa.standard : ''); }   // the count (16b.9(c))
  var cv = covOf(i); return 'attempts on ' + (cv.of ? Math.round(100 * cv.tasks / cv.of) + '% of the tasks' : 'the tasks'); }   // a share, never a task count (the project maintainers' word of 10 Sep); the partial rule keeps its 90% threshold
function hasOwnBayes(i) {
  var id = D.shared.configs[i].id;
  var cfgB = (state.def === 'average' ? D.avg : D.med).configs[id];
  return !!(cfgB && cfgB.bayes);
}
function runFitFor(id) {   // the project maintainers' word of 24 Sep (13:0x UK): a served model without a Bayesian fit whose training run's pointer carries its fit of record draws that fit — the run's copy the row
  // keeps aside (orderSeries: merged_arms); null when no run row carries the model or its copy has no posterior
  var rows; try { rows = seriesRows(); } catch (e) { return null; }
  for (var r = 0; r < rows.length; r++) { var a = rows[r].merged_arms && rows[r].merged_arms[id]; if (a && (a.bayes_avg || a.bayes_med)) return a; }
  return null;
}
function hasBayes(i) { return hasOwnBayes(i) || !!runFitFor(D.shared.configs[i].id); }
function houseCurve(id, lvl) {
  if (state.def === 'average') {
    var c = D.avg.configs[id];
    return { zs: c.trend_zs || D.avg.trend_zs, mid: c.trend,
             lo: lvl === 'off' ? null : c.bands[lvl].lo,
             hi: lvl === 'off' ? null : c.bands[lvl].hi, form: 'line' };
  }
  var m = D.med.configs[id];
  return { zs: D.shared.bins.centers, mid: m.bin_median,
           lo: lvl === 'off' ? null : m.bands[lvl].lo,
           hi: lvl === 'off' ? null : m.bands[lvl].hi,
           cens: m.bin_censor, form: 'bins' };
}

/* piecewise-linear read of the active curve at z (null in gaps) */
function curveAt(curve, z) {
  var zs = curve.zs, ys = curve.mid;
  for (var k = 0; k + 1 < zs.length; k++) {
    if (z >= zs[k] && z <= zs[k + 1]) {
      if (ys[k] == null || ys[k + 1] == null) return null;
      var t = (z - zs[k]) / (zs[k + 1] - zs[k]);
      return ys[k] + t * (ys[k + 1] - ys[k]);
    }
  }
  return null;
}

/* ---------------- render (everything from state) ------------- */
function inX(z) {   // a grid point inside the view's x domain: a fit grid wider than the axis draws nothing outside the plot (its bounding box stays inside, not only its paint)
  var L = xlimT(), v = xt(z) - PIN_DX; return v >= L[0] - 1e-9 && v <= L[1] + 1e-9;
}
function pathLine(zs, ys) {
  var d = '', pen = false;
  for (var k = 0; k < zs.length; k++) {
    if (ys[k] == null || !inX(zs[k])) { pen = false; continue; }
    d += (pen ? 'L' : 'M') + sx(zs[k]).toFixed(1) + ' '
       + sy(clampY(ys[k])).toFixed(1);
    pen = true;
  }
  return d;
}
function pathBand(zs, lo, hi) {
  var segs = [], cur = null;
  for (var k = 0; k < zs.length; k++) {
    if (lo[k] == null || hi[k] == null || !inX(zs[k])) { cur = null; continue; }
    if (!cur) { cur = []; segs.push(cur); }
    cur.push(k);
  }
  return segs.map(function (seg) {
    var up = '', dn = '';
    seg.forEach(function (k, j) {
      up += (j ? 'L' : 'M') + sx(zs[k]).toFixed(1) + ' '
          + sy(clampY(hi[k])).toFixed(1);
      dn = 'L' + sx(zs[k]).toFixed(1) + ' '
         + sy(clampY(lo[k])).toFixed(1) + dn;
    });
    return up + dn + 'Z';
  }).join('');
}
/* median project form marks: diamonds at uncensored bins plus
 * edge-pinned triangles for censored bins — DIRECTIONAL (the project maintainers
 * 28 Aug 2026): floor-censored bins pin at the BOTTOM edge pointing
 * down (median task: 0 failures), ceiling-censored bins pin at the
 * TOP edge pointing up (median task: all attempts fail). */
function pathMarks(zs, ys, cens) {
  var d = '', r = 4;
  for (var k = 0; k < zs.length; k++) {
    if (!inX(zs[k])) continue;
    var x = sx(zs[k]).toFixed(1);
    if (ys[k] == null) {
      if (cens && cens[k] === 1) {       // ceiling: top, pointing up
        var ytp = (sy(YLIM[1]) + 8).toFixed(1);
        d += 'M' + x + ' ' + ytp + 'l-4 7l8 0Z';
      } else {                           // floor: bottom, down
        var yb = (sy(YLIM[0]) - 8).toFixed(1);
        d += 'M' + x + ' ' + yb + 'l-4 -7l8 0Z';
      }
      continue;
    }
    var y = sy(clampY(ys[k]));
    d += 'M' + x + ' ' + (y - r).toFixed(1)
       + 'l' + r + ' ' + r + 'l-' + r + ' ' + r
       + 'l-' + r + ' -' + r + 'Z';
  }
  return d;
}

var RAW_TICKS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

/* ---------------- side arms (the fit maintainers' serving_sft_board_top.json; the difficulty maintainers' decision 17 Sep, word 18 Sep) ----------------
 * Arms outside the served panel — the post-training baseline and its fine-tunes — fitted on the served wave 1+2 axis unchanged.
 * Their own block beside the served set: own chips under the label of record, own curves (Bayesian source only), own crossings
 * rows; never merged into the served set's list, table or ordering. Nothing prints while the pointer carries no serving word. */
var sideSel = null, seriesSel = null;
var SERIES_MERGED = {}, seriesChips = [];   // one row per run (22 Sep): the runs whose checkpoint-series chips live in the served set's run row, and those chips
var seriesSels = [];   // one selection per run row (24 Sep: one row per training run); row 0 is the RL-Zero Code run, row 1 the Olmo 3 7B Think run
function panelIndexOf(id) { var cs = D.shared.configs || []; for (var i = 0; i < cs.length; i++) if (cs[i].id === id) return i; return -1; }   // the family list's chip for an id (28 Sep: checkpoint 0 is the model's own chip, one entity)
function seriesSelFor(i) { if (!seriesSels[i]) seriesSels[i] = new Set(); return seriesSels[i]; }   // off by default (the project maintainers' word of 22 Sep, via the coordination)
function seriesRows() {   // every run row the bundle carries: frame.series_rows (24 Sep), else the single frame.series_arms block (22 Sep); each ordered once in place
  var f = D.shared.frame || {}; var rows = (f.series_rows && f.series_rows.length) ? f.series_rows : (f.series_arms ? [f.series_arms] : []);
  var out = []; rows.forEach(function (s, i) { var o = orderSeries(s); if (o) { o._row = i; out.push(o); } }); return out;
}
function seriesBlock() { var r = seriesRows(); return r.length ? r[0] : null; }   // the first run's row, for readers of the single-row contract
function orderSeries(s) {   // the fit maintainers' checkpoint-series pointer (kind "checkpoint series"): a training run's fitted checkpoints, the run's own row (the project maintainers' words of 22 Sep); the bundle's frame.series_arms
  if (!(s && s.served && s.arms && s.arms.length)) return null;
  if (!s._ordered) {   // once, in place, so the chip indices hold across renders
    // one row per run, one fit per model: an arm the served set already carries as a
    // config (the run's final, whose own fit shaped the axis) is not drawn a second time from the pointer's frozen-axis re-fit — its chip and fit stay the served set's; the ids dropped feed the line under the checkpoints' table
    var served = {}; (D.shared.configs || []).forEach(function (c) { served[c.id] = true; });
    // 26 Sep : the served set's copy yields to the row only when it carries a fit of its own (the run's final, whose fit shaped the axis); a served twin WITHOUT a
    // Bayesian fit under either definition (the registry's board arm set admitted the training loop's checkpoints on 26 Sep, unfitted in the frame) leaves the arm in the row and is hidden
    var ownFit = function (id) { var A = (D.avg && D.avg.configs && D.avg.configs[id]) || null, M = (D.med && D.med.configs && D.med.configs[id]) || null; return !!((A && A.bayes) || (M && M.bayes)); };
    // : a released final (no training step: the outside series' '(final)', the served set's member of record since 22 Sep) stays the served set's and draws through runFitFor as before (24 Sep 13:0x);
    // a CHECKPOINT (a numeric step) whose served twin has no fit of its own stays in its run's row and the twin is hidden
    s.merged_ids = []; s.merged_arms = {}; s.arms = s.arms.filter(function (a) { if (served[a.id]) { if (s.group_of_record && a.step === 0) { a._twin = true; return true; }   /* the project maintainers' word 14:3x UK 28 Sep: checkpoint 0 of our runs is the base model in the family list, one entity — the row keeps its chip as a twin of the list's, drawn once by the panel */ if (ownFit(a.id) || a.step == null) { s.merged_ids.push(a.id); s.merged_arms[a.id] = a; return false; } ROW_KEPT[a.id] = true; } return true; });
    // training order: by the step field, a final last (the pointer lists the final first)
    var stepKey = function (a) { return (a.final || a.step == null) ? 1e15 : Number(a.step); };
    if (s.group_of_record) {   // one group per model of ours (post-training-lead's decision 168, 28 Sep): the chips keep the builder's run order — the approved table's, one run's positions adjacent —
      var runOf = function (a) { return String(a.id).replace(/-step\d+.*$/, ''); }; var firstAt = {};   // and sort by step within a run, checkpoint 0 (the start model's own id) first
      s.arms.forEach(function (a, i) { var k = runOf(a); if (!(k in firstAt)) firstAt[k] = i; });
      s.arms.sort(function (a, b) { var ra = firstAt[runOf(a)], rb = firstAt[runOf(b)]; if (ra !== rb) return ra - rb; var sa = a.step == null ? 1e15 : Number(a.step), sb = b.step == null ? 1e15 : Number(b.step); return sa - sb; });
    } else s.arms.sort(function (a, b) { return stepKey(a) - stepKey(b); });
    s._ordered = true;
  }
  return s.arms.length ? s : null;
}
// NAMES OF RECORD for the team's trained models (the project maintainers' word of 25 Sep 2026, via the coordination: a trained model is named by its base and what was done, a base's chip is its plain name, the chips grouped by base with the base first;
// the post-training lead's file research/training/post-training-lead/NAMES.md of 25 Sep 13:50, corrected 13:5x: a base's plain name as the labels row prints it, the thinking twin 'Qwen3 8B (thinking)'; 14:0x, NAMES.md a8c44add: the fine-tunes' like-for-like control reads "Qwen3 8B · at the fine-tunes' settings" and heads its group, the families list's Qwen3 8B being the reference run) — carried here until the bundle carries them, then dead code, removed at the next cut
var NAMES_OF_RECORD = {
  'Qwen3 8B (raw, re-run)': "Qwen3 8B · at the fine-tunes' settings",
  'Qwen3 8B (maths fine-tune)': 'Qwen3 8B · maths fine-tune',
  'Qwen3 8B (code fine-tune)': 'Qwen3 8B · code fine-tune',
  "Qwen3 8B (code fine-tune, other models' solutions)": "Qwen3 8B · code fine-tune on other models' solutions",
  'Qwen3 8B (code fine-tune, coverage set)': 'Qwen3 8B · code fine-tune on the coverage set',
  'Qwen3 8B (code fine-tune by RL)': 'Qwen3 8B · code RL',
  'Qwen3 8B (thinking, re-run)': 'Qwen3 8B (thinking)',
  'Qwen3 8B thinking': 'Qwen3 8B (thinking)',
  "Qwen3 8B (thinking, code fine-tune, other models' traces)": "Qwen3 8B (thinking) · code fine-tune on other models' traces",
  "Qwen3 8B thinking · code fine-tune on other models' traces": "Qwen3 8B (thinking) · code fine-tune on other models' traces",
  'Qwen3.5 9B Base (maths fine-tune)': 'Qwen3.5 9B Base · maths fine-tune',
  'Qwen3.5 9B Base (code fine-tune)': 'Qwen3.5 9B Base · code fine-tune',
  "Qwen3.5 9B Base (code fine-tune, other models' solutions)": "Qwen3.5 9B Base · code fine-tune on other models' solutions"
};
var BASES_OF_RECORD = ['Qwen3 8B', 'Qwen3 8B (thinking)', 'Qwen3.5 4B', 'Qwen3.5 9B Base', 'DeepSeek-Coder 6.7B Instruct'];   // the groups' order on a page (the same file); a base the file does not name follows, in the pointer's order
var KINDS_OF_RECORD = ['maths fine-tune', 'code fine-tune', "code fine-tune on other models' solutions", "code fine-tune on other models' traces", 'code fine-tune on the coverage set', 'code RL'];   // inside a group, after the base itself
function nameOfRecord(label) { var l = String(label || ''); return NAMES_OF_RECORD[l] || NAMES_OF_RECORD[l.replace(/’/g, "'")] || l; }
// the KEY the page writes for a model or checkpoint (the project maintainers' word of 26 Sep via the post-training lead, decision 135): the slug of its name of record —
// lower case, '(checkpoint N)' as '-N', every other run of non-alphanumerics one hyphen — never a step, a form or a temperature: deepseek-coder-6-7b-rl-on-all-tasks-4, sonnet-5-thinking
function slugOfRecord(label) {
  var n = nameOfRecord(label).replace(/\((?:checkpoint|position)\s+(\d+)\)/i, ' $1');
  return n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
function sideBlock() {
  var f = D.shared.frame || {}; var s = f.side_arms;
  if (!(s && s.served && s.arms && s.arms.length)) return null;
  if (!s._named) {   // once, in place, so the chip indices hold across renders (as orderSeries)
    var groups = BASES_OF_RECORD.slice();
    s.arms.forEach(function (a, i) {
      var n = nameOfRecord(a.label);
      if (n === 'Qwen3 8B' && a.id === 'qwen3-8b-4k32') n = "Qwen3 8B · at the fine-tunes' settings";   // the like-for-like control by its id while the labels row still prints it plain (the names maintainers' word of 25 Sep 14:0x; the row's next round carries it)
      if (n !== a.label) { a.label_pointer = a.label; a.label = n; }
      var p = String(a.label).split(' · '), g = p[0], k = p.slice(1).join(' · ');
      if (groups.indexOf(g) < 0) groups.push(g);
      var kr = (k === '' || k === "at the fine-tunes' settings") ? 0 : (KINDS_OF_RECORD.indexOf(k) >= 0 ? 1 + KINDS_OF_RECORD.indexOf(k) : 1 + KINDS_OF_RECORD.length);   // the control at the fine-tunes' settings heads its group as its base
      a._order = (groups.indexOf(g) * 100 + kr) * 1000 + i;
    });
    s.arms.sort(function (x, y) { return x._order - y._order; });
    s._named = true;
  }
  return s;
}
// TRANSITIONAL LITERALS OF RECORD (the project maintainers' 21 Sep rule via the coordination, 22 Sep 15:5x UK: a text change serves at once, the record's rebuild behind it): the fit maintainers' plain
// group heading (their pre-write under Definitions' decision) and the newbench lead's zero-indexed short form for the run's chips (labels_cells.jsonl),
// carried here by hand until the bundle carries them (label_of_record on the side pointer; short_label per config from the builder) — then dead code, removed at the next cut
var GROUP_HEADINGS_OF_RECORD = { 'definitions/fitting/serving_sft_board_top.json': 'fine-tuned models and the base models they were trained from' };
var SHORT_LABELS_OF_RECORD = { 'olmo-3.1-7b-rl-zero-code-final_completion': 'RL-Zero Code · final' };
function headingShort(sb) {   // the group's heading: the bundle's label of record when it is the plain group string; the fit maintainers' plain string of record while the bundle still carries a set label with a count (no task count on a heading, the project maintainers' 22 Sep word)
  var h = String((sb && sb.heading) || 'models fitted alongside the set');
  if (/\(\s*[\d,]+\s+tasks?\)/.test(h) && sb && GROUP_HEADINGS_OF_RECORD[sb.pointer]) return GROUP_HEADINGS_OF_RECORD[sb.pointer];
  return h.split('; ')[0].replace(/\s*\(\s*[\d,]+\s+(?:tasks?|problems?)\)/g, '');   // no task or problem count on a heading (the project maintainers' 22 Sep word): a side pointer's heading that carries the set's count prints the set's name alone (30 Sep, the newbench sets' side blocks: 'on MATH-500 (500 problems)')
}
function sideHidden(a) { return !!(a && a.partial) && state.partial !== 'show'; }   // fitting's side form of 30 Sep (fit-methods 16b.9(c)): a partial side arm (32 answers against the set's 128) is hidden at the open and shown by the Partial models switch, like the panel's partial models (the project maintainers' word of 24 Sep)
function sideCurve(a) {   // {zs, mid, lo, hi} for one side arm under the active chain and band level (same quantile rows as chainCurve)
  var src = state.def === 'average' ? a.bayes_avg : a.bayes_med;
  if (!src || !src.q) return null;
  var rows = { '80': [1, 5], '90': [0, 6], '95': [0, 6] };
  var r = rows[state.band === 'off' ? '90' : state.band] || [0, 6];
  return { zs: src.zgrid, mid: src.q[3], lo: state.band === 'off' ? null : src.q[r[0]], hi: state.band === 'off' ? null : src.q[r[1]], src: src };
}
function renderOffPanelLine() {   // difficulty 18 Sep: off-panel arms with cells but no side block yet — one plain line under the served set, no chips, no rows
  var f = D.shared.frame || {}; var op = f.off_panel; var el = document.getElementById('offpanelline'); var chipsBox = document.getElementById('chips');
  if (!op || !op.line) { if (el) el.remove(); return; }
  // the project maintainers' word 14:3x UK 28 Sep (via the coordination; decisions-2026-09-28.md: no sentences in the UI of a page, nothing in the controls but the controls): the line lives in the
  // state fold, never between the chips and the blocks below them
  var fold = document.getElementById('statefold'); if (!fold) { if (el) el.remove(); return; }
  if (el && el.parentNode !== fold) { el.remove(); el = null; }
  if (!el) { el = document.createElement('p'); el.id = 'offpanelline'; el.className = 'sub'; el.style.margin = '.2rem 0 .3rem'; fold.appendChild(el); }
  el.textContent = op.line;
}
function renderSideBlock() {
  renderOffPanelLine();
  var sb = sideBlock();
  var chipsBox = document.getElementById('chips'), crossBox = document.getElementById('crossings');
  var sc = document.getElementById('sidechips'), st = document.getElementById('sidecrossings');
  if (!sb || state.src !== 'bayes') { if (sc) sc.remove(); if (st) st.remove(); return; }
  if (!sideSel) { sideSel = new Set(); }   // off by default (the project maintainers' word of 22 Sep, via the coordination): the page opens on the served set's models; the group's all button or a chip turns them on
  if (!sc) { sc = document.createElement('div'); sc.id = 'sidechips'; sc.className = 'chips'; var after = chipsBox; after.parentNode.insertBefore(sc, after.nextSibling); }   // after the chips box itself ( 28 Sep: the off-panel line now lives in the state fold, so it is no longer the anchor — anchored on it, the side block and the runs' row fell into the closed fold)
  sc.textContent = '';
  var head = document.createElement('span'); head.className = 'fam'; head.textContent = headingShort(sb);
  if (sb.membership) head.title = oneSentence(noSpecTags(sb.membership));
  sc.appendChild(head);
  // all / none for this group as the served set has them (the project maintainers' word of 22 Sep, via the coordination: every model group carries the two buttons)
  ['all', 'none'].forEach(function (w) { var ab = document.createElement('button'); ab.className = 'util'; ab.textContent = w; ab.onclick = function () { sideSel = new Set(); if (w === 'all') sb.arms.forEach(function (a2, k2) { if (!sideHidden(a2)) sideSel.add(k2); }); render(); }; sc.appendChild(ab); });
  sb.arms.forEach(function (a, k) {
    var b = document.createElement('button');
    var hiddenP = sideHidden(a);
    b.className = 'chip' + (sideSel.has(k) && !hiddenP ? '' : ' off') + (a.disclosure ? ' disclosed' : '');
    b.style.color = a.color; b.style.borderColor = a.color;
    b.textContent = a.label; b.dataset.label = a.label; b.dataset.name = a.label; b.dataset.side = String(k);
    if (hiddenP) { b.classList.add('partial-hidden'); b.disabled = true; b.setAttribute('aria-disabled', 'true'); }   // greyed and unselectable while hidden (the project maintainers' word of 7 Sep), shown by the Partial models switch
    var parts = [];
    if (a.partial) parts.push('partial: ' + (Array.isArray(a.attempts_per_cell) ? a.attempts_per_cell.join(' / ') : String(a.attempts_per_cell || '')) + ' answers a task');   // the count on the state (fit-methods 16b.9(c))
    if (a.disclosure) parts.push(currentTruth(a.disclosure));
    if (a.set_label) parts.push('fitted on ' + a.set_label);
    if (a.gates_failed) parts.push(a.gate_face ? noSpecTags(String(a.gate_face)) : 'this fit failed its own check; drawn lighter, with its disclosure');   // the fit maintainers' own face sentence when the pointer carries it
    if (a.protocol) parts.push('read by ' + a.protocol + ': the base model continues the prompt, no chat turn');
    b.dataset.state = noSpecTags(parts.join(' · '));
    b.title = oneSentence(noSpecTags(parts[0] || a.label)) + ((a.protocol && !/^read by /.test(parts[0] || '')) ? ' (read by ' + a.protocol + ')' : '');   if (a.gates_failed) { b.title += ' \u00b7 this fit failed its own check and is drawn lighter'; b.classList.add('gated'); b.style.borderStyle = 'dashed'; }   // a failed fit is not a plain position (the project maintainers' current-truth word of 24 Sep; the maintainers's read): the hover says so and the chip's border is dashed
    b.onclick = function () { if (sideHidden(a)) return; if (sideSel.has(k)) sideSel.delete(k); else sideSel.add(k); render(); };
    sc.appendChild(b);
  });
  if (!st) { st = document.createElement('div'); st.id = 'sidecrossings'; crossBox.parentNode.insertBefore(st, crossBox.nextSibling); }
  st.textContent = '';
  var p = document.createElement('p'); p.className = 'sub';
  p.textContent = headingShort(sb); if (sb.heading && sb.heading !== headingShort(sb)) p.title = oneSentence(noSpecTags(String(sb.heading)));   // the plain heading; the fit's set label as the hover
  st.appendChild(p);
  if (sb.axis_rule) { var pr = document.createElement('p'); pr.className = 'sub'; pr.textContent = sb.axis_rule; st.appendChild(pr); }
  var isAvg = state.def === 'average';
  var sideUnresolved = false;   // one legend line under the side table only when a row carries the mark (as the main table)
  var t = document.createElement('table');
  t.innerHTML = '<tr><th>model</th><th title="D50 — the difficulty at which the ' + (isAvg ? 'average failure rate' : 'median task&#39;s failure rate') + ' crosses 50% (' + (isAvg ? 'average rate' : 'median task') + ')">D50</th><th title="D99 — the difficulty at which the ' + (isAvg ? 'average failure rate' : 'median task&#39;s failure rate') + ' crosses 1%, a 99% solve chance (' + (isAvg ? 'average rate' : 'median task') + ')">D99</th></tr>';
  sb.arms.forEach(function (a, k) {
    if (!sideSel.has(k) || sideHidden(a)) return;
    var cv = sideCurve(a); var rec = isAvg ? a.cross_record : null;
    var tr = document.createElement('tr'); var td0 = document.createElement('td'); td0.textContent = a.label; tr.appendChild(td0);
    ['50', '1'].forEach(function (lvl) {
      var td = document.createElement('td'); td.className = 'num';
      var rr = rec ? rec[lvl === '1' ? 'd1' : 'd50'] : null;
      if (rr && rr.status_kind === 'bound' && (rr.bound != null || rr.z != null)) {
        td.textContent = '≤ ' + boundPct(pct(rr.bound != null ? rr.bound : rr.z)) + '%';
        td.title = oneSentence(faceNumbers(noSpecTags(rr.status || 'bound: the level was reached at or before the lowest grid point')));
      } else if (rr && rr.z != null && rr.lo != null && rr.hi != null && rr.status_kind !== 'bound') {
        td.textContent = pct(rr.z).toFixed(1) + '% [' + pct(rr.lo).toFixed(1) + ', ' + pct(rr.hi).toFixed(1) + ']';
        if (rr.status_kind === 'unresolved') {   // the side table carries the fit maintainers' S1 mark like the main table (21 Sep): "~" after the value and its band; hover = the status sentence + the reason
          td.textContent += ' ~';
          td.title = oneSentence(faceNumbers(noSpecTags((rr.status || 'not resolved') + (rr.reason_text ? ' ' + rr.reason_text : ''))));
          sideUnresolved = true;
        }
      } else if (rr && rr.z != null && lvl === '50') {
        td.textContent = pct(rr.z).toFixed(1) + '%';
      } else {
        if (cv) { var fbc = fmtBayesCross(cv.src, lvl); td.textContent = fbc.cell; if (fbc.hover) td.title = fbc.hover; } else { td.textContent = '*'; td.title = 'no fit of record'; }   // the approved table form (27 Sep): one number per cell, * where not yet in
      }
      tr.appendChild(td);
    });
    t.appendChild(tr);
  });
  st.appendChild(t);
  if (sideUnresolved) {   // the same legend line as the main table, only when a side row carries the mark
    var slg = document.createElement('p'); slg.className = 'sub';
    slg.textContent = '~ not resolved: the 80% uncertainty band of D99 is wider than one difficulty step (the reference bandwidth)';
    st.appendChild(slg);
  }
  if (sb.membership) { var m = document.createElement('p'); m.className = 'sub'; m.textContent = noSpecTags(sb.membership); st.appendChild(m); }
}

function renderSeriesBlock() {   // one row per run (24 Sep): every run row the bundle carries, row 0 keeping the ids of the single-row form
  var rows = seriesRows(); rows.forEach(function (sb, i) { renderSeriesRow(sb, i); });
  for (var j = Math.max(rows.length, 1); j < 8; j++) { var e1 = document.getElementById('serieschips' + j), e2 = document.getElementById('seriescrossings' + j); if (e1) e1.remove(); if (e2) e2.remove(); }
}
function renderSeriesRow(sb, ri) {   // the run's row: cloned from renderSideBlock for the fit maintainers' checkpoint-series block (22 Sep)
  var sfx = ri ? String(ri) : ''; var seriesSel = seriesSelFor(ri);

  var chipsBox = document.getElementById('chips'), crossBox = document.getElementById('crossings');
  var sc = document.getElementById('serieschips' + sfx), st = document.getElementById('seriescrossings' + sfx);
  if (!sb || state.src !== 'bayes') { if (sc) sc.remove(); if (st) st.remove(); return; }
     // off by default (the project maintainers' word of 22 Sep, via the coordination): the page opens on the served set's models; the group's all button or a chip turns them on
  var runName = (sb.arms[0] && sb.arms[0].run) || headingShort(sb);
  if (SERIES_MERGED[runName]) { if (sc) { sc.remove(); } sc = null; }   // one row per run: the chips live in the served set's run row (buildChips); only the checkpoints' table is drawn here
  else {
  if (!sc) { sc = document.createElement('div'); sc.id = 'serieschips' + sfx; sc.className = 'chips'; var after = (ri ? document.getElementById('serieschips' + (ri - 1)) || document.getElementById('serieschips') : null) || document.getElementById('sidechips') || chipsBox; /* never the off-panel line: it lives in the state fold since  28 Sep */ after.parentNode.insertBefore(sc, after.nextSibling); }   // 26 Sep : one insertion — the earlier two-branch form set `after` to null after inserting behind a previous own row and then dereferenced it, a TypeError thrown on the first render once a SECOND own row existed (the night-1 row, ); the row still appeared on the re-render, so only a page-error listener saw it
  sc.textContent = '';
  var head = document.createElement('span'); head.className = 'fam'; head.textContent = (sb.arms[0] && sb.arms[0].run) || headingShort(sb);   // the run's full name from the labels row of record, else the pointer's heading
  if (sb.heading_hover) head.title = noSpecTags(String(sb.heading_hover));   // a group of one model's trained versions (post-training-lead's decision 168, 28 Sep): the builder's hover for the row's heading
  else if (sb.membership) head.title = oneSentence(noSpecTags(sb.membership));
  sc.appendChild(head);
  // all / none for this group as the served set has them (the project maintainers' word of 22 Sep, via the coordination: every model group carries the two buttons)
  ['all', 'none'].forEach(function (w) { var ab = document.createElement('button'); ab.className = 'util'; ab.textContent = w; ab.onclick = function () { seriesSel.clear(); sb.arms.forEach(function (a, k) { if (a._twin) { var ti = panelIndexOf(a.id); if (ti >= 0) { if (w === 'all') sel.add(ti); else sel.delete(ti); } } else if (w === 'all') seriesSel.add(k); }); writeSel(); render(); }; sc.appendChild(ab); });
  sb.arms.forEach(function (a, k) {
    var b = document.createElement('button');
    var tiK = a._twin ? panelIndexOf(a.id) : -1;   // one entity with the family list's chip (28 Sep): the same selection, the panel draws the curve
    b.className = 'chip' + ((tiK >= 0 ? sel.has(tiK) : seriesSel.has(k)) ? '' : ' off') + (a.disclosure ? ' disclosed' : '');
    b.style.color = a.color; b.style.borderColor = a.color;
    b.textContent = a.short_label || a.label; b.dataset.label = b.textContent; b.dataset.name = a.label || b.textContent; b.dataset.name = a.label || b.textContent; b.dataset.series = String(k); b.dataset.row = String(ri);   // the short form of record ('RL-Zero Code · 0/32', '· final') from the labels row, never composed
    if (sb.group_of_record) {   // one row of one model (28 Sep, decision 168): positions at one step share a shade and the run is told by its dash, so the dash gets its key on the chip — a
      // short sample of the line as drawn (the maintainers's word : a mark with no key is decoration); the sample adds no text, so the chip's label and reads are unchanged
      var smp = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); smp.setAttribute('width', '22'); smp.setAttribute('height', '8'); smp.setAttribute('aria-hidden', 'true'); smp.style.verticalAlign = 'middle'; smp.style.marginRight = '4px';
      var smpLn = document.createElementNS('http://www.w3.org/2000/svg', 'line'); smpLn.setAttribute('x1', '1'); smpLn.setAttribute('y1', '4'); smpLn.setAttribute('x2', '21'); smpLn.setAttribute('y2', '4'); smpLn.setAttribute('stroke', a.color); smpLn.setAttribute('stroke-width', '1.8');
      if (curveDash(a)) smpLn.setAttribute('stroke-dasharray', curveDash(a));
      smp.appendChild(smpLn); b.insertBefore(smp, b.firstChild);
    }
    var parts = [];
    if (a.disclosure) parts.push(currentTruth(a.disclosure));
    if (a.set_label) parts.push('fitted on ' + a.set_label);
    if (a.gates_failed) parts.push(a.gate_face ? noSpecTags(String(a.gate_face)) : 'this fit failed its own check; drawn lighter, with its disclosure');   // the fit maintainers' own face sentence when the pointer carries it
    if (a.protocol) parts.push('read by ' + a.protocol + ': the base model continues the prompt, no chat turn');
    b.dataset.state = noSpecTags(parts.join(' · '));
    b.title = (a.withheld && a.disclosure ? noSpecTags(currentTruth(String(a.disclosure))) : oneSentence(noSpecTags(parts[0] || a.label))) + ((a.protocol && !/^read by /.test(parts[0] || '')) ? ' (read by ' + a.protocol + ')' : ''); if (a.gates_failed) { b.title += ' \u00b7 this fit failed its own check and is drawn lighter'; b.classList.add('gated'); b.style.borderStyle = 'dashed'; }   // a withheld checkpoint's hover is the fit maintainers' whole sentence with its held-out clause and floor, never cut (the pool pages lead  23 Sep)      // a failed fit is not a plain position (the project maintainers' current-truth word of 24 Sep; the maintainers's read): the hover says so and the chip's border is dashed
    b.onclick = tiK >= 0 ? function () { if (sel.has(tiK)) sel.delete(tiK); else sel.add(tiK); writeSel(); render(); } : function () { if (seriesSel.has(k)) seriesSel.delete(k); else seriesSel.add(k); render(); };
    sc.appendChild(b);
  });
  }
  if (!st) { st = document.createElement('div'); st.id = 'seriescrossings' + sfx; var afterT = (ri ? document.getElementById('seriescrossings' + (ri - 1 || '')) : null) || document.getElementById('sidecrossings') || crossBox; afterT.parentNode.insertBefore(st, afterT.nextSibling); }
  st.textContent = '';
  var p = document.createElement('p'); p.className = 'sub';
  p.textContent = ((sb.arms[0] && sb.arms[0].run) || headingShort(sb)) + ' — ' + headingShort(sb); if (sb.heading) p.title = oneSentence(noSpecTags(String(sb.heading)));   // the plain heading; the fit's set label as the hover
  st.appendChild(p);
  if (sb.merged_ids && sb.merged_ids.length) { var pm = document.createElement('p'); pm.className = 'sub'; pm.textContent = 'the run\'s final is a member of the served set: its chip ends the run\'s row above, and its D50 and D99 are in the main table'; st.appendChild(pm); }
  if (sb.axis_rule) { var pr = document.createElement('p'); pr.className = 'sub'; pr.textContent = sb.axis_rule; st.appendChild(pr); }
  var isAvg = state.def === 'average';
  var sideUnresolved = false;   // one legend line under the side table only when a row carries the mark (as the main table)
  var t = document.createElement('table');
  t.innerHTML = '<tr><th>model</th><th title="D50 — the difficulty at which the ' + (isAvg ? 'average failure rate' : 'median task&#39;s failure rate') + ' crosses 50% (' + (isAvg ? 'average rate' : 'median task') + ')">D50</th><th title="D99 — the difficulty at which the ' + (isAvg ? 'average failure rate' : 'median task&#39;s failure rate') + ' crosses 1%, a 99% solve chance (' + (isAvg ? 'average rate' : 'median task') + ')">D99</th></tr>';
  sb.arms.forEach(function (a, k) {
    if (!seriesSel.has(k)) return;
    var cv = sideCurve(a); var rec = isAvg ? a.cross_record : null;
    var tr = document.createElement('tr'); var td0 = document.createElement('td'); td0.textContent = a.label; tr.appendChild(td0);
    ['50', '1'].forEach(function (lvl) {
      var td = document.createElement('td'); td.className = 'num';
      var rr = rec ? rec[lvl === '1' ? 'd1' : 'd50'] : null;
      if (rr && rr.status_kind === 'bound' && (rr.bound != null || rr.z != null)) {
        td.textContent = '≤ ' + boundPct(pct(rr.bound != null ? rr.bound : rr.z)) + '%';
        td.title = oneSentence(faceNumbers(noSpecTags(rr.status || 'bound: the level was reached at or before the lowest grid point')));
      } else if (rr && rr.z != null && rr.lo != null && rr.hi != null && rr.status_kind !== 'bound') {
        td.textContent = pct(rr.z).toFixed(1) + '% [' + pct(rr.lo).toFixed(1) + ', ' + pct(rr.hi).toFixed(1) + ']';
        if (rr.status_kind === 'unresolved') {   // the side table carries the fit maintainers' S1 mark like the main table (21 Sep): "~" after the value and its band; hover = the status sentence + the reason
          td.textContent += ' ~';
          td.title = oneSentence(faceNumbers(noSpecTags((rr.status || 'not resolved') + (rr.reason_text ? ' ' + rr.reason_text : ''))));
          sideUnresolved = true;
        }
      } else if (rr && rr.z != null && lvl === '50') {
        td.textContent = pct(rr.z).toFixed(1) + '%';
      } else {
        if (cv) { var fbc = fmtBayesCross(cv.src, lvl); td.textContent = fbc.cell; if (fbc.hover) td.title = fbc.hover; } else { td.textContent = '*'; td.title = 'no fit of record'; }   // the approved table form (27 Sep): one number per cell, * where not yet in
      }
      tr.appendChild(td);
    });
    t.appendChild(tr);
  });
  st.appendChild(t);
  if (sideUnresolved) {   // the same legend line as the main table, only when a side row carries the mark
    var slg = document.createElement('p'); slg.className = 'sub';
    slg.textContent = '~ not resolved: the 80% uncertainty band of D99 is wider than one difficulty step (the reference bandwidth)';
    st.appendChild(slg);
  }
  if (sb.membership) { var m = document.createElement('p'); m.className = 'sub'; m.textContent = noSpecTags(sb.membership); st.appendChild(m); }
}


// FAMILY LABELS OF RECORD (the names maintainers' decision of 26 Sep, 20:2x UK, on decision 126's reasoning): a family prints under its name of record — 'Qwen2.5' for the
// configurations the registry files under 'Qwen2.5-Instruct' (the maker's collection name; the sibling families print without the post-training word); the registry
// key stays in the ids and the builder's tables, the printed field moves once, in place, before anything groups or prints by family
var FAMILIES_OF_RECORD = { 'Qwen2.5-Instruct': 'Qwen2.5', 'OLMo-2': 'OLMo 2' };   // models' decision 23:15 UK 30 Sep: the OLMo 2 line prints the maker's form, as Olmo 3 and Qwen2.5 do; the registry key 'OLMo-2' (the hue key, the join of every reader) stays in the ids and the builder's tables
function nameFamilies(shared) {
  if (!shared || shared._fam_named) return;
  var fix = function (a) { if (a && FAMILIES_OF_RECORD[a.family]) a.family = FAMILIES_OF_RECORD[a.family]; };
  (shared.configs || []).forEach(fix);
  var f = shared.frame || {};
  if (f.side_arms && f.side_arms.arms) f.side_arms.arms.forEach(fix);
  if (f.series_arms && f.series_arms.arms) f.series_arms.arms.forEach(fix);
  (f.series_rows || []).forEach(function (r) { (r && r.arms || []).forEach(fix); });
  shared._fam_named = true;
}
function render() {
  PIN_DX = 0;
  nameFamilies(D.shared);   // the family labels of record before anything groups or prints by family (26 Sep)
  var chart = document.getElementById('chart');
  mountExport();
  relabelDataset(D.shared.frame);   // the set names with their counts of record are applied BEFORE any text of this render reads them (the site design maintainers 18 Sep: the 95% hover carried the count only on a re-render)
  // run variants (fine-tunes) on the board: the key sentence appears only while a drawn config carries a variant word (the site design maintainers 17 Sep)
  var lkEl = document.getElementById('linekey');
  if (lkEl) {
    var vkEl = document.getElementById('variantkey'), hasVariant = (D.shared.configs || []).some(function (c) { return c.variant; }) || !!(sideBlock() && state.src === 'bayes' && sideBlock().arms.some(function (a) { return a.variant; }));   // side fine-tunes raise the key sentence too
    if (hasVariant && !vkEl) { vkEl = document.createElement('span'); vkEl.id = 'variantkey'; vkEl.textContent = ' Solid lines are base models; a dotted or dash-dot line is a fine-tune of the base named in its label.'; lkEl.appendChild(vkEl); }
    else if (!hasVariant && vkEl) { vkEl.remove(); }
  }
  fitGeometry(chart);
  var TS = EXPORTING ? 2 : 1, TK = EXPORTING ? 1.5 : 1;   // against the page's RENDERED text (12.0 / 11.0 px on a desktop, the 960-unit chart shown at 820 px): the export's 24 / 16.5 read twice and half again (the site design maintainers' pixel read) // the project maintainers' word, 13:5x UK 18 Sep (via the coordination and the site design maintainers): the export's axis names twice the page's size, its tick numbers half again; the page unchanged
  var visible = Array.from(sel).filter(shownArm).sort(function (a, b) { return a - b; });
  /* controls tell the truth about the drawing (drive 3 Sep 2026,
 * frictions 11 and 22): the Bayesian ribbons exist at 80/90 only, so
 * 95% under that source becomes 90% and the 95% button is disabled
 * with the reason on hover; task dots draw for DOTS_MAX or fewer selected panel models, so
 * above that the switch reads Off and On is disabled (no sentence in the control: the project maintainers' 28 Sep word). */
  var bayesLevels = (DATASET === 'new') ? ['80'] : ['80', '90'];
  if (state.src === 'bayes' && bandCtl && state.band !== 'off' && bayesLevels.indexOf(state.band) < 0)
    quietSet(bandCtl, bayesLevels[bayesLevels.length - 1]);
  if (state.dots === '1' && visible.length > DOTS_MAX && dotsCtl)
    quietSet(dotsCtl, '0');
  ['80', '90', '95'].forEach(function (lv) {
    setDisabled(bandCtl && bandCtl.element.querySelector('button[data-value="' + lv + '"]'),
      state.src === 'bayes' && bayesLevels.indexOf(lv) < 0, '');
  });
  setDisabled(dotsCtl && dotsCtl.element.querySelector('button[data-value="1"]'),
    visible.length > DOTS_MAX, '');   // the cap's sentence left the control (nothing in the controls but the controls, 28 Sep)
  var unfitted = state.src === 'bayes'
    ? visible.filter(function (i) { return !hasBayes(i); }) : [];
  var grid = '';
  /* percent labels ONLY (the project maintainers 28 Aug 2026); spacing per axis scale */
  var xticks = state.xs === 'raw' ? RAW_TICKS : LOGIT_TICKS;
  var yticks = state.ys === 'raw' ? RAW_TICKS : LOGIT_TICKS;
  var zOf = function (v) {
    return logit(Math.min(0.9999, Math.max(0.0001, v / 100)));
  };
  var narrow = K > 1.5;   // phone: short axis titles, thinner tick labels (same set on both axes)
  var L0 = xlimT(), span = L0[1] - L0[0];
  var keep = (narrow && span > 8) ? [1, 10, 50, 90, 99] : [1, 5, 10, 20, 50, 80, 90, 95, 99];
  var thin = function (v) { return (narrow || EXPORTING) && keep.indexOf(v) < 0; };   // the export's larger tick numbers collide at the logit ends (98% 99% 99.5%): the same thinned set as a narrow screen
  if (pinOn()) {   // the relative axis: first row the step from the pin, second row (muted) the failure rate that step reads as when the middle is the pinned level
    var rT = pinR(), stepT = state.xs === 'raw' ? 0.1 : 1, nT = Math.floor(rT / stepT + 1e-9);
    for (var qT = -nT; qT <= nT; qT++) {
      var sT = qT * stepT, LT = xlimT();
      if (sT <= LT[0] || sT >= LT[1]) continue;
      var pxT = ML + (sT - LT[0]) / (LT[1] - LT[0]) * PW;
      grid += '<line x1="' + pxT.toFixed(1) + '" y1="' + MT + '" x2="' + pxT.toFixed(1) + '" y2="' + (MT + PH) + '" stroke="' + (qT === 0 ? '#b9b2a1' : '#e0d9c8') + '" stroke-width="' + (qT === 0 ? '1' : '0.6') + '"/>';
      if ((narrow || EXPORTING) && qT % 2 !== 0) continue;   // the thinned set on a phone and in the export: every second step
      grid += '<text data-role="tick" x="' + pxT.toFixed(1) + '" y="' + (MT + PH + 6 + 11 * K * TK) + '" text-anchor="middle" fill="#52514e" font-size="' + (11 * K * TK) + '">' + pinStepText(sT) + '</text>'
        + '<text data-role="tick" data-tick-second="1" x="' + pxT.toFixed(1) + '" y="' + (MT + PH + 6 + 11 * K * TK + 13 * K * TK) + '" text-anchor="middle" fill="#8b8477" font-size="' + (10 * K * TK) + '">' + pinSecondText(sT) + '</text>';
    }
  } else xticks.forEach(function (v) {
    var z = zOf(v), L = xlimT();
    if (xt(z) <= L[0] || xt(z) >= L[1]) return;
    grid += '<line x1="' + sx(z) + '" y1="' + MT + '" x2="' + sx(z)
      + '" y2="' + (MT + PH) + '" stroke="#e0d9c8" stroke-width="0.6"/>';
    if (thin(v)) return;
    grid += '<text data-role="tick" x="' + sx(z) + '" y="' + (MT + PH + 6 + 11 * K * TK)
      + '" text-anchor="middle" fill="#52514e" font-size="' + (11 * K * TK) + '">'
      + v + '%</text>';
  });
  yticks.forEach(function (v) {
    var z = zOf(v), L = ylimT();
    if (yt(z) <= L[0] || yt(z) >= L[1]) return;
    grid += '<line x1="' + ML + '" y1="' + sy(z) + '" x2="' + (ML + PW)
      + '" y2="' + sy(z) + '" stroke="#e0d9c8" stroke-width="0.6"/>';
    if (thin(v)) return;
    grid += '<text data-role="tick" x="' + (ML - 6) + '" y="' + (sy(z) + 4 * K * TK)
      + '" text-anchor="end" fill="#52514e" font-size="' + (11 * K * TK) + '">'
      + v + '%</text>';
  });
  grid += '<text data-role="axis-title" x="' + (ML + PW / 2) + '" y="' + (H - 6)
    + '" text-anchor="middle" fill="#52514e" font-size="' + (12 * K * TS) + '" '
    + 'data-chain-inv>' + (pinOn() ? 'difficulty, relative to the pin' + (narrow ? '' : (state.xs === 'raw' ? ' (percentage points)' : ' (logit steps)')) : 'task difficulty' + ((narrow || state.xs === 'raw') ? '' : ' (logit)')) + '</text>'
    + '<text data-role="axis-title" transform="rotate(-90)" x="' + (-(MT + PH / 2)) + '" y="'
    + (12 * K * TS) + '" text-anchor="middle" fill="#52514e" font-size="'
    + (12 * K * TS) + '" data-chain-inv>failure rate' + ((narrow || state.ys === 'raw') ? '' : ' (logit)') + '</text>';

  var dotsSvg = '', bands = '', curves = '';
  var dotsOn = state.dots === '1' && visible.length > 0
               && visible.length <= DOTS_MAX;
  if (dotsOn) {
    var zs = D.shared.tasks.z;
    visible.forEach(function (i) {
      var id = D.shared.configs[i].id;
      var dd = D.dots.configs[id];
      var shI = pinShift(chainCurve(i)); if (shI == null) return; PIN_DX = shI;   // under the pin the dots move with their model's curve; no crossing, no dots
      for (var t = 0; t < zs.length; t++) {
        if (dd.fails[t] == null) continue;   // task not attempted by this arm (pool coverage)
        var nT = Array.isArray(dd.n) ? dd.n[t] : dd.n;
        var rate = (dd.fails[t] + 0.5) / (nT + 1);
        dotsSvg += '<circle cx="' + sx(zs[t]).toFixed(1) + '" cy="'
          + sy(clampY(logit(rate))).toFixed(1)
          + '" r="2" fill="#8b8477" fill-opacity="0.38" '
          + 'data-t="' + t + '" data-i="' + i + '"/>';
      }
    });
  }
  var nSeriesOn = 0; seriesRows().forEach(function (srN) { nSeriesOn += seriesSelFor(srN._row).size; });
  if (state.dots === '1' && state.src === 'bayes' && D.dots && D.dots.configs) seriesRows().forEach(function (srD) {   // the cap counts per selected row ( 29 Sep)
    if (seriesSelFor(srD._row).size > DOTS_MAX) return;   // the runs' task dots (28 Sep): the same dots, keyed by the arm's id, under the page's DOTS_MAX rule counted across the panel and the rows
    var ssD = seriesSelFor(srD._row); var zsD = D.shared.tasks.z;
    srD.arms.forEach(function (a, k) {
      if (a._twin || !ssD.has(k)) return;
      var ddD = D.dots.configs[a.id]; if (!ddD || !ddD.fails) return;
      var shD = pinShift(sideCurve(a)); if (shD == null) return; PIN_DX = shD;
      for (var tD = 0; tD < zsD.length; tD++) {
        if (ddD.fails[tD] == null) continue;
        var nD = Array.isArray(ddD.n) ? ddD.n[tD] : ddD.n;
        var rateD = (ddD.fails[tD] + 0.5) / (nD + 1);
        dotsSvg += '<circle cx="' + sx(zsD[tD]).toFixed(1) + '" cy="' + sy(clampY(logit(rateD))).toFixed(1)
          + '" r="2" fill="#8b8477" fill-opacity="0.38" data-t="' + tD + '" data-row="' + srD._row + '" data-series="' + k + '"/>';
      }
    });
  });
  visible.forEach(function (i) {
    var c = D.shared.configs[i];
    var cv = chainCurve(i);
    // the project maintainers' word of 4 Sep 2026 (points without a Bayesian fit are not shown beside the fitted ones — they
    // confuse): under the Bayesian estimator an arm without a posterior draws NOTHING — its chip stays
    // (greyed) and the status/notes count it; no project stand-in curve
    if (state.src === 'bayes' && cv.houseOnly) return;
    var shC = pinShift(cv); if (shC == null) return; PIN_DX = shC;   // the pin: this curve's own offset for every path of its (curve, band, marks, trend, running median)
    if (c.excluded) { cv.lo = null; cv.hi = null; }   // greyed, no band (out of the fit population)
    if (cv.lo)
      bands += '<path d="' + pathBand(cv.zs, cv.lo, cv.hi)
        + '" fill="' + c.color + '" fill-opacity="0.10" '
        + 'data-chain-val data-i="' + i + '"/>';
    curves += '<path d="' + pathLine(cv.zs, cv.mid)
      + '" fill="none" stroke="' + (c.excluded ? '#9a9890' : c.color) + '" stroke-width="' + (c.excluded ? '1.2' : '1.6') + '"'
      + (c.think ? ' stroke-dasharray="6 4"' : (c.variant_pattern === 'dash-dot' ? ' stroke-dasharray="4 1.5 1.5 1.5"' : (c.variant ? ' stroke-dasharray="1.5 2.5"' : '')))
      + (cv.houseOnly ? ' stroke-opacity="0.45" data-project-only="1"' : '')
      + (c.excluded ? ' data-excluded="1"' : '')
      + ' data-chain-val data-i="' + i + '" data-label="' + c.label
      + (c.excluded ? ' — out of the fit population: ' + (c.exclusion || 'excluded') : '')
      + (cv.houseOnly ? ' — outside the Bayesian fit set; '
                        + houseName().toLowerCase() + ' shown' : '')
      + '"/>';
    if (cv.form === 'bins')
      curves += '<path d="' + pathMarks(cv.zs, cv.mid, cv.cens)
        + '" fill="'
        + ((c.think || c.variant) ? '#fcfaf3' : c.color) + '" stroke="' + c.color
        + '" stroke-width="1.1" data-chain-val data-i="' + i
        + '" data-label="' + c.label + '"/>';
    // linear trend (the fit maintainers' linefit: posterior medians of slope / intercept over the draws) over the fitted
    // z range only; a straight line in logit-logit, a curve under raw y; long dashes distinguish it from the
    // dashed thinking-mode curves. Descriptive: the curve and its band are the evidence.
    if (state.trend !== 'off' && state.src === 'bayes') {
      var lfb = ((state.def === 'average' ? D.avg : D.med).configs[c.id] || {}).bayes;
      var lfa = lfb && lfb.linefit, lfk = lfa && lfa[state.def === 'average' ? 'avg' : 'typ'];
      if (lfk && lfk.slope_q10_q50_q90 && lfk.intercept_at_zmid_q50 != null && lfa.zrange && lfa.zrange.length === 2) {
        var slT = lfk.slope_q10_q50_q90[1], icT = lfk.intercept_at_zmid_q50, zmT = lfa.zmid || 0;
        var zsT = [], ysT = [];
        for (var tt = 0; tt <= 40; tt++) { var zzT = lfa.zrange[0] + (lfa.zrange[1] - lfa.zrange[0]) * tt / 40; zsT.push(zzT); ysT.push(icT + slT * (zzT - zmT)); }
        curves += '<path d="' + pathLine(zsT, ysT) + '" fill="none" stroke="' + c.color + '" stroke-width="1.2" opacity="0.9" stroke-dasharray="7 4" data-trend="1" data-i="' + i
          + '" data-label="' + c.label + ' — linear trend (' + (state.def === 'average' ? 'average rate' : 'median task') + '): slope ' + slT + ' logit per z, 80% uncertainty band [' + lfk.slope_q10_q50_q90[0] + ', ' + lfk.slope_q10_q50_q90[2] + ']'
          + (lfk.rms_dev_q50 != null ? ' · rms deviation of the curve from its own line ' + lfk.rms_dev_q50 + ' logit' : '')
          + ' · fitted range z in [' + lfa.zrange[0] + ', ' + lfa.zrange[1] + ']' + (lfa.n_draws ? ' (' + lfa.n_draws + ' draws)' : '') + '"/>';
      }
    }
    if (state.rm === '1' && state.def === 'median'
        && state.src === 'project') {
      var rmd = D.med.configs[c.id].raw_median;
      if (rmd)
        curves += '<path d="' + pathLine(rmd.z, rmd.y)
          + '" fill="none" stroke="' + c.color
          + '" stroke-width="0.9" opacity="0.5"'
          + (c.think ? ' stroke-dasharray="6 4"' : (c.variant_pattern === 'dash-dot' ? ' stroke-dasharray="4 1.5 1.5 1.5"' : (c.variant ? ' stroke-dasharray="1.5 2.5"' : '')))
          + ' data-i="' + i + '" data-label="' + c.label
          + ' — raw running median"/>';
    }
  });
  // side arms (the fit maintainers' side pointer): own curves beside the served set, Bayesian source only, never in the served set's ordering
  var sbC = sideBlock();
  if (sbC && state.src === 'bayes') {
    if (!sideSel) { sideSel = new Set(); }   // off by default (22 Sep)
    sbC.arms.forEach(function (a, k) {
      if (!sideSel.has(k) || sideHidden(a)) return;
      var cvS = sideCurve(a); if (!cvS) return;
      var shS = pinShift(cvS); if (shS == null) return; PIN_DX = shS;
      if (cvS.lo) bands += '<path d="' + pathBand(cvS.zs, cvS.lo, cvS.hi) + '" fill="' + a.color + '" fill-opacity="0.10" data-chain-val data-side="' + k + '"/>';
      curves += '<path d="' + pathLine(cvS.zs, cvS.mid) + '" fill="none" stroke="' + a.color + '" stroke-width="1.6"' + (a.gates_failed ? ' stroke-opacity="0.55"' : '')
        + (a.variant_pattern === 'dash-dot' ? ' stroke-dasharray="4 1.5 1.5 1.5"' : (a.variant ? ' stroke-dasharray="1.5 2.5"' : ''))
        + ' data-chain-val data-side="' + k + '" data-label="' + String(a.label).replace(/"/g, '&quot;') + ' — ' + String(headingShort(sbC)).replace(/"/g, '&quot;') + '"/>';
    });
  }
  // the training run's checkpoints (the fit maintainers' series pointer): their own curves the same way, keyed on the series row's selection (22 Sep)
  if (state.src === 'bayes') seriesRows().forEach(function (srC) {   // every run row's checkpoints (24 Sep), keyed on that row's selection
    var seriesSel = seriesSelFor(srC._row);
    srC.arms.forEach(function (a, k) {
      if (a._twin || !seriesSel.has(k)) return;   // a twin of the family list's chip is drawn by the panel
      var cvR = sideCurve(a); if (!cvR) return;
      var shR = pinShift(cvR); if (shR == null) return; PIN_DX = shR;
      if (cvR.lo) bands += '<path d="' + pathBand(cvR.zs, cvR.lo, cvR.hi) + '" fill="' + a.color + '" fill-opacity="0.10" data-chain-val data-series="' + k + '" data-row="' + srC._row + '"/>';
      curves += '<path d="' + pathLine(cvR.zs, cvR.mid) + '" fill="none" stroke="' + a.color + '" stroke-width="1.6"' + (a.gates_failed ? ' stroke-opacity="0.55"' : '') + (curveDash(a) ? ' stroke-dasharray="' + curveDash(a) + '"' : '') + ' data-chain-val data-series="' + k + '" data-row="' + srC._row + '" data-label="' + String(a.short_label || a.label).replace(/"/g, '&quot;') + ' — ' + String((a.run || headingShort(srC))).replace(/"/g, '&quot;') + '"/>';
    });
  });
  PIN_DX = 0;
  chart.innerHTML = '<defs><clipPath id="plotclip"><rect x="' + ML + '" y="' + MT + '" width="' + PW + '" height="' + PH + '"/></clipPath></defs>'
    + grid + '<g clip-path="url(#plotclip)"><g>' + dotsSvg + '</g><g>' + bands
    + '</g><g id="curveg">' + curves + '</g></g>';   // the data layers stay inside the plot area (a fit grid wider than the axis had run under the y labels)

  narrate(visible, dotsOn, unfitted);
  notes(visible, unfitted);
  crossingsTable(visible);
  renderSideBlock();
  renderSeriesBlock();   // the training run's own row and crossings rows from the fit maintainers' series pointer (22 Sep) // the side arms' own chips and crossings rows (never merged)
  stamp();
  paintChips();
  if (rearmCrosshair) rearmCrosshair();   // the crosshair's snap positions follow the axis (the pin's relative axis; an axis scale change)
}

function renderArmStates() {   // the full state line behind each chip, one line per disclosed arm, in the fold-out (critic; the project maintainers' word of 8 Sep)
  var fl = document.getElementById('flaglist'); if (!fl) return;
    var as = document.getElementById('armstates'); if (!as) { as = document.createElement('div'); as.id = 'armstates'; as.className = 'sub'; fl.parentNode.insertBefore(as, fl); }
    as.textContent = '';
    var chips = Array.prototype.filter.call(document.querySelectorAll('.chips .chip'), function (c) { return c.dataset.state; });
    if (chips.length) { as.appendChild(document.createTextNode('Model states (the full line behind each chip): ')); chips.forEach(function (c, k) { if (k) as.appendChild(document.createTextNode(' · ')); var sp = document.createElement('span'); sp.textContent = c.textContent.trim() + ' — ' + c.dataset.state; as.appendChild(sp); }); }
    var dn = Object.keys(DATASET_NOTES); if (dn.length) { var dd = document.createElement('div'); dd.className = 'sub'; dd.textContent = 'Dataset notes: ' + dn.map(function (k) { return (DATASETS[k] ? DATASETS[k].label : k) + ' — ' + DATASET_NOTES[k]; }).join(' · '); as.appendChild(dd); }
}
function paintChips() {
  seriesChips.forEach(function (b) {   // the run row's checkpoint chips: on/off from seriesSel; greyed and unselectable when the checkpoints do not draw (no series block for this set, or a source other than the Bayesian fits)
    var k = +b.dataset.series, ri = +(b.dataset.row || 0), live = seriesRows().length > ri && state.src === 'bayes'; var seriesSel = seriesSelFor(ri);
    b.classList.toggle('off', !(seriesSel && seriesSel.has(k))); b.classList.toggle('partial-hidden', !live); b.disabled = !live; b.setAttribute('aria-disabled', String(!live));
  });
  chips.forEach(function (b) {
    var i = +b.dataset.idx;
    b.classList.toggle('off', !sel.has(i));
    var hiddenPartial = !shownArm(i);   // the project maintainers 7 Sep: greyed and unselectable, not removed; never in the figure's tooltip
    b.classList.toggle('partial-hidden', hiddenPartial); b.disabled = hiddenPartial; b.setAttribute('aria-disabled', String(hiddenPartial));
    var unf = state.src === 'bayes' && !hasBayes(i);
    var c = D.shared.configs[i];
    b.classList.toggle('unfitted', unf);
    b.classList.toggle('excluded', !!c.excluded);
    var bb = state.src === 'bayes' ? ((state.def === 'average' ? D.avg : D.med).configs[c.id] || {}).bayes : null;
    b.classList.toggle('disclosed', !!(c.disclosure || c.continuation_flag || (bb && (bb.gate_flag || bb.coverage_flag || bb.cut_flag || bb.cleaning_flag || bb.fit_asgraded_flag || bb.undercredit_flag || bb.axis_flag)) || notFittedNote(i)) && !c.excluded);   // a strict-gate-flagged fit reads as a per-arm flag too
    // chip hover: additive parts (an earlier if/else chain dropped the gate hover when the last else cleared the title)
    var parts = [];
    if (notShown(i)) parts.push(NOT_SHOWN.note);   // the project maintainers' word of 9 Sep: not shown, with the one note
    if (c.excluded) parts.push('out of the fit population — ' + (c.exclusion || 'excluded') + ' (drawn greyed, no uncertainty band; the decision of 3 Sep)');
    if (bb && bb.interim) parts.push('interim fit (newer fit' + (bb.interim.landed_at ? ', landed ' + relTime(bb.interim.landed_at) : '') + (bb.interim.axis_note ? '; ' + bb.interim.axis_note : '') + ')');
    if (bb && bb.alongside && bb.alongside.flag) parts.push(String(bb.alongside.flag).replace(/\s*\((?:wave|set)\s+[a-z_-]*\d{8}T\d{4}Z(?:-m\d+)?\)/gi, ''));   // 22 Sep: an arm admitted as adopted, fitted alongside the set (the fit maintainers' side pointer), says so on its chip; the set is named by its label of record or not at all — a wave id in the flag is dropped
    if (bb && bb.gate_flag) parts.push(bb.gate_flag);
    // concentration regime (the fit maintainers' crossings table; the difficulty maintainers' caveat): hover only — extreme/concentrated arms are
    // where the Gaussian-task-effect fit misplaces the average-rate crossings (the fit methods maintainers 04m)
    if (bb && bb.concentration && /extreme|concentrated/.test(bb.concentration.regime)) {
      // the fit maintainers' flag text of record when the bundle carries it (the fit methods maintainers' rate sentence, 7 Sep); my paraphrase otherwise
      parts.push('failures ' + bb.concentration.regime + ' on few tasks — ' + (bb.concentration.text || 'this fit tends to place D99 well before its true position on the difficulty axis and the 10% and D50s slightly after it (fit-methods 04m gives the sizes)'));
      b.classList.add('disclosed');
    }
    if (bb && bb.coverage_flag) parts.push(bb.coverage_flag);   // the fit maintainers' frame_disclosure: fitted on fewer tasks than the frame
    if (bb && bb.cut_flag) parts.push(bb.cut_flag);   // answers cut at the output cap (the fit maintainers' gemma_cut_flag): a flag beside the arm
    if (bb && bb.cleaning_flag && !(c.disclosure && c.disclosure.indexOf(bb.cleaning_flag) >= 0)) parts.push(bb.cleaning_flag);   // gpt data cleaning (the project maintainers 7 Sep): once, via the disclosure field when it carries the line
    if (bb && bb.cleaning_scope_flag) parts.push(bb.cleaning_scope_flag);   // how far the cleaned fit reaches (the fit maintainers 8 Sep)
    if (bb && bb.undercredit_flag) parts.push(bb.undercredit_flag);   // new-task cells undercounted passes when the wave was cut (the fit maintainers 7 Sep); until the re-fit
    if (bb && bb.fit_asgraded_flag) parts.push(bb.fit_asgraded_flag);   // cells cleaned, served fit still as first graded (one arm can flip before the other)
    if (bb && bb.axis_flag) parts.push(bb.axis_flag);   // served set on a newer task axis than this view: drawn with the note (never withheld)
    var nfn = notFittedNote(i); if (nfn) parts.push(nfn);   // the Opus-refusal decision: refused tasks are not failures; excluded from this arm's cells and fit
    if (unf && !c.excluded) parts.push('outside the Bayesian fit set — no fit drawn');
    var _ra = (!unf && !hasOwnBayes(i)) ? runFitFor(c.id) : null; if (_ra && _ra.disclosure) parts.push(currentTruth(_ra.disclosure));   // the run's fit of record stands in (24 Sep)
    if (c.disclosure) parts.push(String(c.disclosure));   // the state alone in the hover, no class word before it
    if (c.continuation_flag) parts.push(c.continuation_flag);   // the task pool maintainers' continuation hover of record: this arm's answers in the view's waves changed from cut to continued (a basis change the project maintainers must see)
    var covPart = covText(i) + (isPartial(i) ? (shownArm(i) ? ' — partial model' : ' — partial model, hidden; the Partial models switch shows it') : ''); parts.push(covPart);
    if (c.protocol) parts.push('read by ' + c.protocol + ': the base model continues the prompt, no chat turn');   // protocol = a state-line fact, never the maintainers sentence and never in the label (the newbench figures maintainers 17 Sep); the hover carries it as the '(read by …)' parenthesis
    if (parts.length) {
      var full = noSpecTags(parts.join(' · ')); if (c.notes_flags && c.notes_flags.length) full += ' · ' + c.notes_flags.map(function (nf) { return noSpecTags(nf.hover || ''); }).join(' · '); b.dataset.state = full;   // the whole state line (incl. pool card flags) lives in the fold-out below the chart
      var lead = parts[0];   // parts are pushed in priority order: excluded, interim, gate, concentration, coverage, cut, cleaning, scope, undercredit, as-graded, unfitted, flag, coverage count
      var pri = parts.filter(function (t) { return /^not shown:|^\d+ tasks? refused|^interim fit|^this fit did not pass|^R-hat|^out of the fit|^gpt-5 arms|^for the Claude|^Bayesian curve fitted|^outside the Bayesian/.test(t) || (c.disclosure && t === String(c.disclosure)); });   // the disclosure leads without its old 'flag:' prefix ( 29 Sep); the unfitted note's state form (28 Sep)
      if (pri.length) lead = pri[0];
      if (hiddenPartial) lead = covPart;   // a greyed chip's hover says why it is grey — the partial state with its count (fitting's set form of 30 Sep) — while the fit's own state keeps the fold-out line; the axis note led the hover on MATH-500's five hidden arms in the 20:5x rehearsal
      b.title = oneSentence(noSpecTags) + ((c.protocol && !/^read by /.test) ? ' (read by ' + c.protocol + ')' : '');   // no doubling when the protocol sentence itself leads // the protocol word rides the one-sentence hover as a short parenthesis (the newbench figures maintainers 17 Sep: never in the label)
    } else b.removeAttribute('title');   // spec tags are record-keeping, not for a face (the project maintainers 7 Sep: no code-names)
  });
  renderArmStates();
}

function narrate(visible, dotsOn, unfitted) {
  var defName = state.def === 'average' ? 'average rate'
                                        : 'median task';
  var srcName = state.src === 'bayes'
    ? 'Bayesian curves' + (unfitted.length
        ? ' (' + unfitted.length + ' of ' + visible.length
          + ' models outside the fit set — no fit drawn)'
        : '')
    : houseName().toLowerCase();
  var bandTxt = state.band === 'off' ? 'uncertainty bands off' : state.band + '% uncertainty bands';
  var dotTxt = dotsOn ? 'task dots on'
    : 'task dots off' + (visible.length > DOTS_MAX
        ? ' (available for ' + DOTS_MAX + ' or fewer models)' : '');
  document.getElementById('narrate').textContent =
    defName + ' · ' + srcName + ' · ' + bandTxt + ' · '
    + visible.length + ' of ' + D.shared.configs.filter(function (c, i) { return shownArm(i); }).length
    + ' models · ' + dotTxt;
  // fixed panel ON the chart (the project maintainers 4 Sep 2026: fit quality shown on the chart, not buried in prose)
  var fp = document.getElementById('fitpanel');
  if (fp) {
    var bf = D.shared.frame && D.shared.frame.bayes_fits;
    var drawnN = visible.length - (state.src === 'bayes' ? unfitted.length : 0);
    // the project maintainers' word of 25 Sep 2026 (via the coordination): nothing on the figure that a control on the page already states — the estimator, the set and the bands went off this line; the figure keeps its title, axes, legend and the quiet count of models drawn (the project maintainers' 17 Sep word)
    fp.textContent = drawnN + (drawnN === 1 ? ' model' : ' models');   // the quiet count alone
  }
}

function notes(visible, unfitted) {
  var el = document.getElementById('notes');
  el.textContent = '';
  if (state.src === 'bayes' && unfitted && unfitted.length) {
    var wu = document.createElement('div');
    wu.className = 'warn';
    wu.style.color = '#9a5b00';
    var b = D.man && D.man.frame && D.man.frame.bayes_fits;
    wu.textContent = 'Outside the Bayesian fit set'
      + (b ? (b.n_fits ? ' (' + b.n_fits + ' fitted models in the served set)' : ' (no served fit set)') : '')   // no fingerprint on a face (the project maintainers 7 Sep)
      + ': ' + unfitted.map(function (i) { return D.shared.configs[i].label; }).join(', ')
      + '. These models have no Bayesian fit in this view (one estimator per view); '
      + 'their table cells print * (no fit of record).';
    el.appendChild(wu);
  }
  var ns = D.shared.configs.map(function (_, i) { return i; }).filter(notShown);
  // basis change the project maintainers must see (the project maintainers' rule; the pool pages lead's continuation rule 10 Sep): one visible line when arms drawn here carry the task pool maintainers' continuation record
  var bnEl = document.getElementById('basisnote');
  if (bnEl) {
    var cont = D.shared.configs.map(function (c, i) { return i; }).filter(function (i) { return shownArm(i) && D.shared.configs[i].continuation_flag; });
    bnEl.textContent = '';   // the cap-cut clause left the face (the project maintainers' word of 24 Sep); each model's § hover keeps its record
    if (false) bnEl.textContent = cont.length ? 'answers cut at the output cap were continued for ' + cont.length + ' of the models in this view (verdicts as continued; each model\u2019s \u00a7 hover carries its record)' : '';
  }
  var nsEl = document.getElementById('notshown');   // VISIBLE under the chart (the notes container sits in the closed fold-out): the project maintainers' one note line
  if (nsEl) nsEl.textContent = (ns.length && NOT_SHOWN) ? 'not shown: ' + ns.map(function (i) { return D.shared.configs[i].label; }).join(', ') + ' — ' + String(NOT_SHOWN.note).replace(/^not shown:\s*/, '') : '';
  var pa = partialArms();
  if (pa.length && state.partial !== 'show') {
    var ph = document.createElement('div');
    ph.textContent = pa.length + ' partial model' + (pa.length > 1 ? 's' : '') + ' hidden (attempts on fewer than 90% of the tasks): '
      + pa.map(function (i) { return D.shared.configs[i].label + ' — ' + covOf(i).tasks + ' of ' + covOf(i).of; }).join(', ') + '. The Partial models switch shows them.';
    el.appendChild(ph);
  }
  if (legacySel) {
    var ls = document.createElement('div');
    ls.textContent = 'This link carried chip positions; the selection has been re-bound to the models and the address now names them — copy it again if you share it.';
    el.appendChild(ls);
  }
  var fl = document.getElementById('flaglist');
  renderArmStates();
  if (fl) {
    fl.textContent = '';
    var flagged = D.shared.configs.filter(function (c) { return (c.notes_flags || []).length; });
    if (flagged.length) {
      fl.appendChild(document.createTextNode('Per-model flags (hover a mark for its line; the chip hover carries the same words): '));
      flagged.forEach(function (c, k) {
        if (k) fl.appendChild(document.createTextNode(' · '));
        fl.appendChild(document.createTextNode(c.label + ' — '));
        c.notes_flags.forEach(function (nf, j) {
          if (j) fl.appendChild(document.createTextNode(', '));
          var a = document.createElement('a'); a.href = nf.href; a.textContent = nf.glyph || '\u00a7'; a.title = oneSentence(nf.hover || ''); a.className = 'reflag'; fl.appendChild(a);   // one sentence; the full line sits in the arm-state list // glyph on the face, words in the hover (the pool pages lead 8 Sep; the project maintainers' two-minute rule)
        });
      });
    }
  }
  if (DATASET === 'new' && D.shared.frame && D.shared.frame.coverage_by_cause) {
    // pool-page lines folded in: arms by cause (data facts; 'held' names the project maintainers' decision), the axis rule, the pool's own surfaces
    var cb = D.shared.frame.coverage_by_cause, cl = document.createElement('div');
    var parts = [];
    if (cb.pending) parts.push(cb.pending + ' without a result of record on these tasks');   // state form, no project word (29 Sep)
    if (cb.held) parts.push(cb.held + ' held');
    if (cb.subthreshold) parts.push(cb.subthreshold + ' below the fit floor');
    if (cb.frame_only) parts.push(cb.frame_only 
      + ' in the tasks used without results');
    cl.textContent = 'Models on wave 2 and wave 2 parked: ' + cb.shown + (cb.roster_total ? ' of ' + cb.roster_total : '') + ' drawn'
      + (parts.length ? '; not drawn: ' + parts.join(', ') : '') + '.'
      + (D.shared.frame.axis_rule ? ' Axis: ' + D.shared.frame.axis_rule + '.' : '');
    el.appendChild(cl);
    if (D.shared.frame.links && D.shared.frame.links.length) {
      var ll = document.createElement('div');
      ll.appendChild(document.createTextNode('Wave 2 and wave 2 parked elsewhere: '));
      D.shared.frame.links.forEach(function (lk, k) {
        if (k) ll.appendChild(document.createTextNode(' · '));
        var a = document.createElement('a'); a.href = lk.href; a.textContent = lk.label; ll.appendChild(a);
      });
      el.appendChild(ll);
    }
  }
  if (state.src === 'bayes' && DATASET === 'new') {
    var wl = document.createElement('div');
    wl.innerHTML = 'The Bayesian uncertainty bands for the new-tasks dataset carry the 80% level only, '
      + 'so Uncertainty bands reads 80% under this source; 90% and 95% return with the local-logistic fit. The table below stays the '
      + 'local-logistic reading — the Bayesian crossings live on Capability vs reliability.';   // F119 (22 Sep): a page named by its served title, as a link
    el.appendChild(wl);
  }
  if (state.src === 'bayes' && state.def === 'average') {
    // Definitions caveat (the difficulty maintainers, 4 Sep 2026, bound literal; the fit methods maintainers spec 04m, /the maintainers/avgbias.html):
    // per-arm glyph follows when the fit maintainers' crossings_of_record.csv carries the concentration-regime column
    var wa = document.createElement('div');
    wa.textContent = 'Average-rate curves and crossings come from the served Gaussian-task-effect fit; on models with concentrated failures it places D99 well before its true position on the difficulty axis and the 10% and D50s slightly after it (fit-methods spec 04m); the count-average reading beside them is the check.';
    wa.textContent = noSpecTags(wa.textContent);   // spec tags stay in the source, not on the face
    el.appendChild(wa);
  }
  if (state.src === 'bayes') {
    var w = document.createElement('div');
    w.className = 'warn';
    w.innerHTML = 'Bayesian reading: soft-chosen (the estimator now served '
      + 'for values and uncertainty; decision of 28 Aug) — never '
      + '"official". The standing prior-honesty reservation means the '
      + 'prior-sensitivity checks stay one click away: '
      + 'the explanation site and the '
      + 'prior-vs-posterior fan + HalfNormal(5) re-fit in '
      + 'the exposition.';
    el.appendChild(w);
  }
  if (state.def === 'median' && state.src === 'project') {
    var wb = document.createElement('div');
    wb.textContent = 'Bins: the kept tasks split into '
      + 'equal-count difficulty bins (one shared binning for every model). '   // no task counts (the project maintainers' word of 10 Sep)
      + 'The raw running median toggle overlays the plain median of '
      + 'the 31 nearest tasks — the data-side check; models '
      + 'whose trace sits at the floor almost everywhere ship no '
      + 'trace (a mostly-floored trace would read as a curve).';
    el.appendChild(wb);
    var wt = document.createElement('div');
    wt.textContent = 'Censored bins stay visible, with direction: '
      + '▼ pinned at the bottom edge = the bin’s median '
      + 'task has 0 failures in 128 attempts (at/below the '
      + 'measurement floor); ▲ pinned at the top edge = the '
      + 'median task fails all 128 attempts (at/beyond the '
      + 'ceiling). Neither is a measurement of zero or of 100% — '
      + 'both are bounds.';
    el.appendChild(wt);
    var ids = D.shared.configs.map(function (c) { return c.id; });
    var undef1 = ids.filter(function (id) {
      return !D.med.configs[id].crossings['1'].crossing_defined;
    }).length;
    var w2 = document.createElement('div');
    w2.className = 'warn';
    w2.textContent = 'Asymmetry at 1%, labeled at point of use: '
      + 'D99 under the median task is censored for ' + undef1
      + ' of ' + ids.length + ' models at 128 attempts per '
      + 'task (a bin median below 0.5% means the median task has 0 '
      + 'failures — the crossing is reported as a bound, never '
      + 'interpolated through censored bins). The average rate '
      + 'reaches 1% by pooling; the median task cannot at this '
      + 'per-task resolution.';
    el.appendChild(w2);
  }
  if (state.def === 'average' && state.band !== 'off'
      && state.src === 'project') {
    var w3 = document.createElement('div');
    w3.textContent = 'Uncertainty band assumptions (stated, unchanged per the '
      + '28 Aug decision): ' + String(D.avg.band_note || D.shared.frame.band_rule || 'band rule stated in the bundle').split(';')[0] + '.';
    el.appendChild(w3);
  }
}

/* ---------------- crossings table ---------------- */
function firstUp(zs, ys, L) {   // first upward crossing of level L (logit) along the grid; null when never reached
  for (var k = 1; k < zs.length; k++) {
    if (ys[k - 1] == null || ys[k] == null) continue;
    if (ys[k - 1] < L && ys[k] >= L) {
      var t = (L - ys[k - 1]) / (ys[k] - ys[k - 1]);
      return zs[k - 1] + t * (zs[k] - zs[k - 1]);
    }
  }
  return (ys.length && ys[0] >= L) ? zs[0] : null;
}
function fmtBayesCross(bb, lvl) {   // lvl '50' | '1' (per cent); mid = q row 3, ribbon edges per the fit set's levels
  var L = logit(Number(lvl) / 100);
  var rows = (bb.levels && bb.levels.indexOf('95') < 0 && bb.levels.indexOf('90') < 0) ? [1, 5] : [0, 6];
  var zm = firstUp(bb.zgrid, bb.q[3], L);
  if (zm == null) {
    var top = Math.max.apply(null, bb.q[3].filter(function (v) { return v != null; }));
    return top < L ? { cell: '>' + pct(bb.zgrid[bb.zgrid.length - 1]).toFixed(1), hover: 'bound: the level is never reached on the grid' } : { cell: '<' + pct(bb.zgrid[0]).toFixed(1), hover: 'bound: the level is reached at or before the lowest grid point' };
  }
  var zEarly = firstUp(bb.zgrid, bb.q[rows[1]], L);   // upper ribbon edge crosses first
  var zLate = firstUp(bb.zgrid, bb.q[rows[0]], L);    // lower ribbon edge crosses last
  var br = (zEarly != null && zLate != null) ? 'uncertainty band ' + pct(zEarly).toFixed(1) + ' to ' + pct(zLate).toFixed(1) + ' (difficulty %)' : '';
  return { cell: pct(zm).toFixed(1), hover: br };   // the approved table form (27 Sep): the value alone in the cell, the band in the hover
}
function boundPct(x) {   // a bound face never rounds to "0.0%": one to three decimals, the first non-zero digit kept
  x = Number(x); if (!(x > 0)) return x.toFixed(1);
  return x.toFixed(x >= 0.05 ? 1 : (x >= 0.005 ? 2 : 3));
}
function fmtAvgCell(cr) {
  if (!cr) return { cell: '*', hover: 'not computed' };
  if (cr.value_pct == null) {   // a bound, shown as one like the other estimators' bound rows (the hover says which range and why); the pool pages lead 10 Sep
    var b = cr.plain95_pct || [];
    var side = cr.censored === 'left' ? '<' : '>';
    var bound = cr.censored === 'left' ? b[1] : b[0];
    return bound != null ? { cell: side + boundPct(bound), hover: 'bound (outside the observed range)' } : { cell: '*', hover: 'bound outside the observed range, no value' };
  }
  var lo = cr.plain95_pct[0], hi = cr.plain95_pct[1];
  return { cell: cr.value_pct.toFixed(1), hover: (lo != null && hi != null ? 'uncertainty band ' + lo.toFixed(1) + ' to ' + hi.toFixed(1) + ' (difficulty %)' : (hi != null ? 'uncertainty band up to ' + hi.toFixed(1) + ' (difficulty %); its lower edge lies below the easiest task used' : (lo != null ? 'uncertainty band from ' + lo.toFixed(1) + ' (difficulty %); its upper edge lies above the hardest task used' : ''))) };   // the approved table form (27 Sep): a one-sided band says so
}
function fmtMedCell(cr) {
  if (cr.value_z == null) return { cell: '*', hover: 'undefined: every bin censored' };
  var v = String(fmtPct(cr.value_z)).replace(/%$/, '');
  if (!cr.crossing_defined) {
    if (cr.kind === 'bound_at_first')
      return { cell: '<' + v, hover: 'bound: at or before the first measurable bin' };
    if (cr.kind === 'bound_at_ceiling_bin')
      return { cell: '<' + v, hover: 'bound: at or before this bin the median task already fails every attempt' };
    return { cell: '>' + v, hover: 'bound: the level is not reached within the observed range' };
  }
  var ci = cr.ci95_z;
  return { cell: v, hover: (ci ? 'uncertainty band ' + String(fmtPct(ci[0])).replace(/%$/, '') + ' to ' + String(fmtPct(ci[1])).replace(/%$/, '') + ' (difficulty %) · ' : '') + 'defined in ' + Math.round(cr.boot_defined_frac * 100) + '% of resamples' };   // the approved table form (27 Sep)
}
function crossingsTable(visible) {
  var anyUnresolved = false;   // S1 legend line only when a drawn arm carries the mark
  var anyMixing = false;       // the fit methods maintainers spec 11 Sep 2026c: a crossing whose chains disagree carries ‡ and the fit maintainers' plain sentence as its hover
  var box = document.getElementById('crossings');
  box.textContent = '';
  if (!visible.length) return;
  var voc = (D.shared.vocab && D.shared.vocab.enforced) || {};
  var isAvg = state.def === 'average';
  var k50 = isAvg ? 'average-rate 50% crossing' : 'median-task 50% crossing';   // the vocabulary keys of the frame's enforced sentences
  var k1 = isAvg ? 'average-rate 1% crossing' : 'median-task 1% crossing';
  var n50 = 'D50', n1 = 'D99';   // the project maintainers' names (13:0x UK 18 Sep, via the coordination and the site design maintainers): D50 and D99, uppercase; the chain named in the hover
  var chainWord = isAvg ? 'average rate' : 'median task';
  var hov50 = 'D50 — the difficulty at which the ' + (isAvg ? 'average failure rate' : 'median task\'s failure rate') + ' crosses 50% (' + chainWord + ')';
  var hov1 = 'D99 — the difficulty at which the ' + (isAvg ? 'average failure rate' : 'median task\'s failure rate') + ' crosses 1%, a 99% solve chance (' + chainWord + ')';
  var h = document.createElement('p');
  var isB = state.src === 'bayes';
  h.innerHTML = '<span data-chain-val>' + n50 + '</span> — '
    + (voc[k50] || hov50.replace(/^D50 — /, '')) + '; ' + n1 + ' — '
    + (voc[k1] || hov1.replace(/^D99 — /, ''))
    + (isB
      ? '. Positions in difficulty %, from the Bayesian posterior median curve for the estimator picked (first upward crossing); each cell\'s hover carries its '
        + 'uncertainty band (95% where the fit set carries it, else 80%); * where no fit of record is in; '
        + 'the served crossings with their own uncertainty bands live on Capability vs reliability.'
      : '. Positions in difficulty %, from the ' + houseName().toLowerCase() + ' for the active '
        + 'chain; each cell\'s hover carries the 95% uncertainty band of the trend (the Uncertainty bands switch changes the drawn bands, not this table); '
        + 'the Bayesian crossings live on Capability vs reliability.');
  box.appendChild(h);
  var t = document.createElement('table');
  t.innerHTML = '<tr><th>model</th><th title="' + hov50.replace(/"/g, '&quot;') + '">' + n50 + '</th><th title="' + hov1.replace(/"/g, '&quot;') + '">'
    + n1 + '</th></tr>';
  visible.forEach(function (i) {
    var c = D.shared.configs[i];
    var tr = document.createElement('tr');
    var td0 = document.createElement('td');
    var key = document.createElement('span');
    key.className = 'legendkey'; key.style.background = c.color;
    td0.appendChild(key);
    td0.appendChild(document.createTextNode(c.label));
    tr.appendChild(td0);
    ['50', '1'].forEach(function (lvl) {
      var td = document.createElement('td');
      td.className = 'num';
      td.setAttribute('data-chain-val', '');
      if (isB) {
        var bbT = ((isAvg ? D.avg : D.med).configs[c.id] || {}).bayes;
        // the fit maintainers' crossing of record (cross_record.d50 / .d1, spec 06y) when the bundle carries it; else the ribbon reading
        var rec = isAvg && bbT && bbT.cross_record ? bbT.cross_record[lvl === '1' ? 'd1' : 'd50'] : null;
        // the record is read only when it carries value AND band (the 50% record has no band: its column keeps the ribbon reading)
        if (rec && rec.status_kind === 'bound' && (rec.bound != null || rec.z != null)) {
          // fitting 9 Sep (DATA-CONTRACTS §crossings_of_record BOUND rows): the level was reached at or before the lowest grid point —
          // the record is a bound, shown as one, never as a point with a band (before this fix a bound row read like a crossing)
          td.textContent = '<' + boundPct(pct(rec.bound != null ? rec.bound : rec.z));   // the approved table form (27 Sep): one number per cell, a bound as '<' and the value, the unit in the column's hover
          td.title = oneSentence(faceNumbers(noSpecTags(rec.status || 'bound: the level was reached at or before the lowest grid point')));
        } else if (rec && rec.z != null && rec.lo != null && rec.hi != null && rec.status_kind !== 'bound') {
          td.textContent = pct(rec.z).toFixed(1);   // the approved table form (27 Sep): the crossing alone in the cell; its uncertainty band in the hover
          td.title = 'uncertainty band ' + pct(rec.lo).toFixed(1) + ' to ' + pct(rec.hi).toFixed(1) + ' (difficulty %)';
          if (rec.status_kind === 'unresolved') {   // not resolved: the sentence in the hover, no mark in the cell
            td.title = oneSentence(faceNumbers(noSpecTags((rec.status || 'not resolved') + (rec.reason_text ? ' ' + rec.reason_text : '')))) + ' · ' + td.title;
            anyUnresolved = true;
          }
        } else {
          if (bbT) { var fb = fmtBayesCross(bbT, lvl); td.textContent = fb.cell; if (fb.hover) td.title = fb.hover; } else { td.textContent = '*'; td.title = 'no fit of record'; }   // the approved table form: * where a value is not yet in
        }
        if (rec && rec.mixing_note) { td.title = oneSentence(noNames(noSpecTags(String(rec.mixing_note)))) + (td.title ? ' · ' + td.title : ''); anyMixing = true; }   // the caveat in the hover, no mark in the cell
        if (!bbT) td.style.color = '#8a8477';
      } else {
        var fh = isAvg ? fmtAvgCell(D.avg.configs[c.id].crossings[lvl]) : fmtMedCell(D.med.configs[c.id].crossings[lvl]);
        td.textContent = fh.cell; if (fh.hover) td.title = fh.hover;
      }
      if (isAvg && !isB) {   // average-rate chain: an out-of-range crossing is a bound at the edge of the tasks used (the trend grid spans their difficulties)
        var crA = (D.avg.configs[c.id].crossings || {})[lvl];
        if (crA && crA.value_pct == null)
          td.title = crA.censored === 'left'
            ? 'bound: the fitted trend is already above this level at the easiest task used, so the crossing lies at or below the easiest difficulty on the axis'
            : 'bound: the fitted trend never reaches this level within the tasks used, so the crossing lies at or above the hardest difficulty on the axis';
      }
      if (!isAvg && td.textContent.indexOf('<') === 0)
        td.title = 'the crossing happened inside the censored easy '
          + 'region: every earlier bin’s median task has 0 '
          + 'failures in 128 attempts, so only this upper bound is '
          + 'measurable';
      if (!isAvg && td.textContent.indexOf('>') === 0)
        td.title = 'the binned-median trend never reaches this level '
          + 'inside the observed difficulty range, so only this '
          + 'lower bound is measurable';
      tr.appendChild(td);
    });
    t.appendChild(tr);
  });
  box.appendChild(t);
  if (anyUnresolved) {   // one legend line per table, only when a drawn arm carries the mark (the difficulty maintainers' S1 convention, no arm list)
    var lg = document.createElement('p');
    lg.className = 'sub';
    lg.textContent = 'a crossing whose 80% uncertainty band is wider than one difficulty step is not resolved; its hover says so';
    box.appendChild(lg);
  }
  if (anyMixing) {   // one legend line per table, only when a drawn arm carries the mark
    var lm = document.createElement('p');
    lm.className = 'sub';
    lm.textContent = 'where the fits for a model do not agree on the crossing, the cell\'s hover carries the fit maintainers\'s sentence';
    box.appendChild(lm);
  }
}

// relative time in plain words (no Zulu stamps in hovers — the project maintainers 7 Sep)
function heldOrCurrent(built, hours) {   // input-driven bundles rebuild only when an input moves: the watcher's currency stamp (data-<set>/current.json,
  // refreshed each tick while the inputs' content matches the build) stands in for a fresh build; a stale stamp (watcher stopped, rebuild failed,
  // input moved without a landing) falls through to HELD — fail closed either way (the results browser's maintainers 12 Sep)
  var c = D.shared && D.shared.current; var t = c ? Date.parse(c.checked_at) : NaN;
  if (c && !isNaN(t) && (Date.now() - t) / 3600000 < (hours || 3)) {
    var b = Date.parse(built); if (isNaN(b) || (Date.now() - b) / 3600000 < (hours || 3)) return '';
    return ' · inputs unchanged since the build (checked ' + relTime(c.checked_at) + ')';
  }
  return heldClause(built, hours);
}
function heldClause(iso, hours) {   // project convention (g) FAIL CLOSED (11 Sep): a face over a build older than its cadence says so in plain words, never a fresh-looking face over stale numbers
  var t = Date.parse(iso); if (isNaN(t)) return '';
  var h = (Date.now() - t) / 3600000; if (h < (hours || 3)) return '';
  return ' · HELD: no fresh build since ' + (humanTime(iso) || 'the time shown') + ' (rebuilds are expected hourly; every number on this page is from that build)';
}
function relTime(iso) {
  var t = Date.parse(iso); if (isNaN(t)) return 'recently';
  var h = Math.round((Date.now() - t) / 3600000);
  if (h < 1) return 'within the hour'; if (h < 48) return h + ' hour' + (h === 1 ? '' : 's') + ' ago';
  var d = Math.round(h / 24); return d + ' day' + (d === 1 ? '' : 's') + ' ago';
}
/* ---------------- frame stamp ---------------- */
// dataset option label = the exact kept task count of the loaded frame (the project maintainers 7 Sep: counts, not code-names)
function relabelDataset(f) {
  if (f && f.counts_of_record && applyOfficialNames(f.counts_of_record)) {   // the project maintainers' word of 7pm 8 Sep: official names with counts of record
    var nk = f.tasks_kept || f.tasks_manifest || f.tasks; var bt0 = dsEl(DATASET);
    if (bt0) bt0.title = DATASETS[DATASET].hover || '';   // no task counts beyond the set label (the project maintainers' word of 10 Sep)
    return;
  }
  var n = f.tasks_kept || f.tasks_manifest || f.tasks;
  if (!n) return;
  var lbl = (OFFICIAL && OFFICIAL[DATASET]) ? OFFICIAL[DATASET].label : (DATASETS[DATASET].label || DATASET);   // set label of record, never a bare count (the project maintainers' word of 10 Sep)
  DATASETS[DATASET].label = lbl; DATASETS[DATASET].short = lbl;
  var btn = dsEl(DATASET);
  if (btn) btn.textContent = setWord(lbl);   // the label of record keeps its count for the status line; the switch reads the set name alone
}

function pageVersion() {   // the served app.js version (index.html's ?v= tag), so a page fix moves the stamp
  var sc = document.querySelector('script[src*="app.js"]');
  var m = sc && /v=([0-9a-f]+)/.exec(sc.getAttribute('src'));
  return m ? m[1] : 'unversioned';
}
/* Definitions' decision of 3 Sep 2026: arms are counted as
 * <complete> complete / <sampled> sampled — complete = both board legs
 * landed; never a registry count. */
function armPhrase(f) {
  var s = f.sampled_M || f.difficulty_population_M || f.population_M;
  var c = (f.complete_M == null) ? f.population_M : f.complete_M;
  var fit = (f.fitted_M == null) ? c : f.fitted_M;   // fit population (Definitions decision 3 Sep 2026)
  var base;
  if (fit === c) base = s > c ? c + ' complete / ' + s + ' sampled models' : c + ' models';
  else base = fit + ' fitted / ' + c + ' complete' + (s > c ? ' / ' + s + ' sampled' : '') + ' models';
  var op = f.off_panel_arms && f.off_panel_arms.length;   // Definitions decision 18 Sep: a registered arm off the board panel is named beside the counts, never inside them
  if (op) { var w = {1: 'one', 2: 'two', 3: 'three'}[op] || String(op); base += ' · ' + w + ' model' + (op > 1 ? 's are' : ' is') + ' off the panel; ' + (op > 1 ? 'their' : 'its') + ' results are counted and not drawn'; }
  return base;   // no status words on the display (as adopted of 3 Sep); the manifest carries the facts
}
function isExcluded(i) { return !!D.shared.configs[i].excluded; }
function tasksUsedLabel(f, isPool) {   // the bundle's own label sentence when it carries a count; else the official label with the count of record
  var lbl = f.dataset_label || (DATASETS[DATASET] && DATASETS[DATASET].label) || '';
  if (isPool && OFFICIAL && OFFICIAL['new']) return OFFICIAL['new'].label;   // the pool bundle (a peer's) names the set by its old name
  if (OFFICIAL && OFFICIAL[DATASET] && !/\(\s*[\d,]+/.test(lbl)) return OFFICIAL[DATASET].label;
  return lbl;
}
function positionedClause(f) {   // set size vs axis count reconciled in one parenthesis (the presentation critic: 1,298 on the axis vs wave 1+2 (1,300)); only the waves that are not fully positioned are named
  var C = FRESH_C || f.counts_of_record; if (!C) return '';
  var fmt = function (n) { return Number(n).toLocaleString('en-US'); };
  var by = f.on_axis_by_wave || null;   // builder-emitted per-wave positioned counts (build_all_dataset.py 9 Sep); fallback derives wave 2 from the total
  // shape guard (peer-field rule): a positioned count can never exceed its set size; a bundle whose block fails this is ignored
  if (by && (Number(by.wave_1) > Number(C.original_kept) || Number(by.wave_2) > Number(C.new_focused) || Number(by.wave_2_parked) > Number(C.new_parked))) by = null;
  var parts = [];
  var add = function (n, of, name) { if (n != null && of != null && Number(n) !== Number(of)) parts.push(fmt(n) + ' of ' + name + '\u2019s ' + fmt(of) + ' positioned'); };
  if (DATASET === 'board_top') {
    var w1 = by ? by.wave_1 : null, w2 = by ? by.wave_2 : null;
    if (w1 == null && !f.tasks_awaiting_axis) { w1 = Math.min(C.original_kept, f.tasks); w2 = f.tasks - w1; }
    add(w1, C.original_kept, 'wave 1'); add(w2, C.new_focused, 'wave 2');
  } else if (DATASET === 'top') { add(f.tasks, C.new_focused, 'wave 2'); }
  else if (DATASET === 'all' && by) { add(by.wave_1, C.original_kept, 'wave 1'); add(by.wave_2, C.new_focused, 'wave 2'); add(by.wave_2_parked, C.new_parked, 'wave 2 parked'); }
  else if (DATASET === 'board') { add(f.tasks, C.original_kept, 'wave 1'); }
  return parts.length ? ' (' + parts.join(', ') + ')' : '';
}
function ukParts(d) {   // the project maintainers' word of 14 Sep (UK time, not Zulu): every clock a reader sees is the UK clock (Europe/London, BST or GMT
  // by the date); stamps inside files stay UTC. One label form per face: the clock carries "UK".
  var parts = {}; new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })
    .formatToParts(d).forEach(function (x) { parts[x.type] = x.value; });
  return parts;
}
function humanTime(iso) {   // "9 Sep 09:53 UK" — the UK clock of an ISO/UTC stamp (the project maintainers' word of 14 Sep), the pool pages' form
  if (!iso) return null; var d = new Date(iso); if (isNaN(d)) return null;
  var q = ukParts(d); return q.day + ' ' + String(q.month).replace(/\.$/, '').replace('Sept', 'Sep') + ' ' + q.hour + ':' + q.minute;   // a time the project maintainers reads is UK time written bare (the word of 24 Sep, 14:2x UK, via the maintainers): no suffix
}
function poolMachineryLine(f) {   // the pool pages lead 9 Sep, the sibling pages' form: "results store as of 9 Sep 08:53; page regenerated 11:08, every hour ‖"
  // store_newest = newest judged outcome in the results store; stamp = the bundle's build time (their page cadence: every hour);
  // glyph + sentence = the hold mark and its hover when the feed is held. Day-month form, no ISO, no file names.
  var ss = f.sources_state || {}; var store = humanTime(ss.store_newest); var regen = hhmm(f.stamp || f.built_at);
  var parts = [];
  if (store) parts.push('results as of ' + store);   // 'store' is a project word: plain words on the project maintainers' face (the the maintainers lead's census under the project maintainers' 14:5x UK rule, 22 Sep)
  if (regen) parts.push('page regenerated ' + regen + ', every hour');
  var line = parts.join('; ');
  if (ss.glyph) line += ' <span title="' + oneSentence(noStamps(String(ss.sentence || ''))).replace(/"/g, '&quot;') + '">' + ss.glyph + '</span>';
  return line;
}
function hhmm(iso) { if (!iso) return null; var d = new Date(iso); if (isNaN(d)) return null; var q = ukParts(d); return q.hour + ':' + q.minute; }   // the UK clock (the project maintainers' word of 14 Sep)
function fitFrameClause(f) {   // the task pool maintainers DECISIONS 10 Sep (critic): a view standing on a pilot-inclusive fit names the pilot as a third set,
  // N from the fit maintainers' stamp; hover qualifiers kept-by-label / members. Silent when the fit's frame carries no pilot (the axis clause suffices).
  var b = f && f.bayes_fits, ff = b && b.fit_frame;
  if (!ff || !ff.pilot_included || !ff.n_tasks || !ff.name) return '';
  var q = ff.qualifiers || {}; var hov = [];
  if (q.kept_count) hov.push(Number(q.kept_count).toLocaleString('en-US') + ' kept by label');
  if (q.members) hov.push(Number(q.members).toLocaleString('en-US') + ' members');
  if (ff.pilot_kept) hov.push('the pilot\u2019s ' + ff.pilot_kept + ' of record in the frame');
  return ' · <span title="' + (hov.length ? oneSentence(hov.join(', ')) : '') + '">the fit on ' + (ff.label || ff.name) + ' as cut</span>';   // a set-membership label (the task pool maintainers' template), never a bare task count (the project maintainers' word of 10 Sep)
}
function setDefinition(f, isPool) {   // the set's definition once, in the Definitions fold at the top (the project maintainers' word of 24 Sep): the label of record for the tasks used, no counts elsewhere on the face
  var ul = document.querySelector('#defs ul.defs'); if (!ul) return;
  var li = document.getElementById('defset');
  var label = '';
  try { label = String(freshCounts(tasksUsedLabel(f, isPool)) || '').replace(/<[^>]*>/g, '').trim(); } catch (e) { label = ''; }
  label = label.split(' \u00b7 ')[0].replace(/\s*;\s*wave 2 parked[\s\S]*$/, '').trim();   // the definition alone: the parked clause and the positioned-today counts are notes, not the definition
  if (!label) { if (li) li.remove(); return; }
  if (!li) { li = document.createElement('li'); li.id = 'defset'; ul.insertBefore(li, ul.firstChild); }
  li.textContent = ''; var b = document.createElement('b'); b.textContent = 'Tasks used'; li.appendChild(b); li.appendChild(document.createTextNode(' \u2014 ' + label));
}
function stamp() {
  var f = D.shared.frame;
  var isPool = f.dataset === 'new';   // the golden block is the pool's bundle too (same links, same wording)
  relabelDataset(f);
  var built = f.built_at || f.stamp || f.build_date || null;
  // the DATA line: visible under the chart without a click (4 Sep decision: every page shows its data's stamp; 7 Sep form: one muted machinery line)
  var facts = (f.population === 'golden' ? '<span style="color:#9a5b00">golden set (12 models): axis and curves from Qwen3 0.6B/1.7B/4B/8B (plain + thinking) and Claude Haiku 4.5 + Sonnet 5 (plain + thinking) only — a data point, not the difficulty definition (as adopted of 3 Sep)</span> · ' : '')
    + '<span data-chain-inv>the tasks used: ' + freshCounts(tasksUsedLabel(f, isPool))   // official names; set sizes from the freshest counts of record, never a bundle's baked ones
    // the project maintainers 10 Sep (via coordinator/the maintainers): task counts only as set-membership labels — no axis / positioned / kept counts on the face
    + fitFrameClause(f)
    + membershipFaceClause(f)   // the project maintainers' basis rule on the FACE (the task pool critic 13 Sep): the fit frame and the in-service figure beside the label of record, not only on the folded chrome line
    + ' · models: ' + armPhrase(f)
    + (isPool ? ' (' + f.fit_floor + ')' : '')
    + '</span>';
  // the one muted machinery line (7 Sep form; the site design maintainers' CHROME LENGTH row 18 Sep): built from what, when — the frame's facts stand on the face in #frameline by their decisions
  var machinery = '<span data-chain-inv>' + (isPool ? poolMachineryLine(f) : 'built ' + (humanTime(built) || built || '?') + ' (' + relTime(built) + ')' + heldOrCurrent(built, 3))
    + (f.newest_input_mtime ? ' · newest input ' + relTime(f.newest_input_mtime) : '') + '</span>';
  var head = facts + ' · ' + machinery;
  var dl = document.getElementById('dataline'), fl = document.getElementById('frameline');
  head = noBareDates(head); facts = noBareDates(facts);   // day-month form for any bare date (the golden sentence's decision date); ISO 'built' stamps are untouched
  // the project maintainers' word of 24 Sep (via the coordination, 12:2x UK): the facts block leaves the plot's face — no task counts as a caption, no build stamp, no cap-cut clause,
  // no machinery under the chart; the set's definition sits once in the Definitions fold (setDefinition below); the frame's facts stay in the bundle (data/manifest.json), a maintainer file
  if (fl) fl.innerHTML = '';
  if (dl) { dl.setAttribute('data-chrome', ''); dl.innerHTML = ''; }
  setDefinition(f, isPool);
  // the STATE line: hashes, sources, axis, withheld arms, fit source, links — in the fold-out
  document.getElementById('stamp').setAttribute('data-chrome', '');
  document.getElementById('stamp').innerHTML =
    (dl ? '' : head + ' · ') + machinery + ' · '   // the build clock and the cadence live in this fold line (chrome), off the plot's face since 24 Sep
    + '<span data-chain-inv>' + (isPool ? 'manifest ' : 'axis-set ') + f.keep_set_hash
    + ' · ' + (isPool ? 'label store ' : 'data fingerprint ') + f.runs_fingerprint
    + (f.sources_state ? ' · <span title="' + noStamps(String(f.sources_state.sentence || '')).replace(/"/g, '&quot;') + '">newest outcome ' + (f.sources_state.store_newest ? relTime(f.sources_state.store_newest) : '?') + '</span>'
        + ' · run state ' + (f.sources_state.fleet_state ? relTime(f.sources_state.fleet_state) : '?')
        + (f.sources_state.hold === 'held' || (f.sources_state.stale && (f.sources_state.stale.store || f.sources_state.stale.fleet_state)) ? ' (inputs held: no new results since then)' : '') : '')
    + ' · axis: ' + axisWords(D.shared.axis.axis_id, D.shared.axis.axis_time, D.shared.axis.axis_basis) + (D.shared.axis.axis_basis === 'live' && D.shared.axis.axis_sha12 ? ' (axis ' + D.shared.axis.axis_sha12 + ')' : '')   // no wave id on the face (the project maintainers 09-07); the cut's day-month clock instead; the live axis names its content sha on this chrome line (Definitions 10 Sep)
    + (isPool ? ' (' + noStamps(noWaveIds(D.shared.axis.definition)) + '; the wave 1 axis and the wave 2 axis are different populations — never one x-axis)'
              : ((D.shared.axis.axis_basis === 'live' && D.shared.axis.axis_plain) ? ' (' + noStamps(noWaveIds(noNames(String(D.shared.axis.axis_plain)))).replace(/\.\s*$/, '') + '; both chains; reuse declared in the median artifact)'   // the live axis says what it is in Definitions' words (their 12 Sep 07:07 switch to every model with at least 90% of the set's tasks scored): a basis change reads on the face
                 : ' (both chains; reuse declared in the median artifact)')) + '</span>'
    + withheldLine(f)
    + bayesSourceLine(f)
    + (isPool ? ' · <a href="./pool/failure-vs-difficulty/data.json">pool bundle</a> · <a href="' + (f.notes_base || '/progress/notes.html') + '">pool notes</a>'
              : ' · <a href="data/manifest.json">data manifest</a>')
    + ' · page ' + pageVersion();
}
/* arms with one benchmark in canon are withheld from the pooled panel; the
 * reason is bound from forecast's held_arms.json, never typed */
function withheldLine(f) {
  var w = f.withheld_configs || [];
  var out = '';
  if (w.length) {
    var r = f.withheld_reasons || {};
    // the project maintainers 3 Sep 2026: no decision words on the display — the data fact only; the
    // register's reason stays in the manifest (withheld_reasons) for consumers
    out += ' · not on this panel (' + (DATASET === 'new' ? 'no result of record on these tasks' : 'results on one task set only') + '): ' + w.join('; ');
  }
  // a landing in progress (the pool adapter's landing_hidden_n from the difficulty maintainers' flag of record, 20 Sep): the model is hidden whole, so the face
  // says the fact by count only — the project maintainers' what-is-happening form — and the name appears when the flag releases it; nothing printed at zero
  var ln = parseInt(f.landing_hidden_n || 0, 10);
  if (ln > 0) out += ' · ' + (({ 1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five' })[ln] || String(ln)) + (ln === 1 ? " model with results and no fit of record" : " models with results and no fit of record");   // state form
  var ex = f.fit_excluded || [];
  if (ex.length) {
    var sh = f.fit_exclusion_short || {}, rw = f.fit_reversible_when || {};
    out += ' · <span style="color:#9a5b00">greyed, out of the fit population: ' + ex.map(function (m) {
      return m + ' (' + (sh[m] || 'excluded') + (rw[m] ? '; reversible when ' + rw[m] : '') + ')';
    }).join('; ') + '</span>';
  }
  return out;
}
/* the Bayesian ribbons come from a separate fit set; say which one and
 * whether it is older than this page's axis (self-clearing at the next
 * fit wave; Presentation roster finding #1, 2 Sep 2026) */
function bayesSourceLine(f) {
  var b = f.bayes_fits;
  if (!b) return '';
  var same = b.matches_axis;
  // a fit set WIDER than the page (every arm here drawn, the set fits arms this page has no arm for — e.g. arms outside the registry on the
  // newbench sets, 14 Sep) is not an older set: say so plainly instead of the 'OLDER than the axis' clause
  var drawnN = b.drawn != null ? Number(b.drawn) : null;
  var pageArms = (f.fitted_M != null ? f.fitted_M : f.population_M);
  var wider = !same && drawnN != null && pageArms != null && drawnN >= Number(pageArms) && Number(b.n_fits) > drawnN;
  var extraN = wider ? Number(b.n_fits) - drawnN : 0;
  var fmtN = function (n) { return Number(n).toLocaleString('en-US'); };
  var tasks = (b.fit_frame && b.fit_frame.label) ? b.fit_frame.label + ' as cut' : ((b.fit_frame && b.fit_frame.n_tasks) || (b.fit_n_tasks && b.fit_n_tasks.length) ? 'the set as cut (' + fmtN((b.fit_frame && b.fit_frame.n_tasks) || b.fit_n_tasks[0]) + ' tasks)' : 'the set as cut');   // a set-membership label, never a bare task count (the project maintainers' word of 10 Sep)
  var here = (f.fitted_M != null ? f.fitted_M : f.population_M) + ' models';
  var txt;
  if (b.withheld_by_rule) {   // no fitted layer as adopted (the difficulty maintainers via fitting, 10 Sep): the bundle's one sentence, nothing else
    return '<span style="color:#9a5b00"> · Bayesian layer: ' + oneSentence(noStamps(noWaveIds(String(b.note || 'withheld as adopted')))) + '</span>';
  }
  if (!b.n_fits && b.served_not_drawn) {   // withheld by the axis guard (the served set sits on another axis than this view): the builder's one sentence, no fingerprint of a set not drawn
    return '<span style="color:#9a5b00"> · Bayesian layer: ' + oneSentence(noStamps(noWaveIds(String(b.served_not_drawn)))) + '</span>';
  }
  if (!b.n_fits && b.newer) {
    // no served set yet for this view (a fresh wave, e.g. the golden waves): the interim landings are the whole Bayesian layer
    txt = ' · Bayesian source: no served fit set yet for this view — newer fits, '
      + (b.newer.landed != null ? b.newer.landed + ' of ' + b.newer.of + ' models landed' : 'landing model by model')
      + (b.newer.drawn_interim ? ', ' + b.newer.drawn_interim + ' drawn here as interim fits; the rest show the local-logistic fit' : '; kernel estimators (no Bayesian fit in the served set)');
    return '<span style="color:#9a5b00">' + txt + gateClause(b) + provisionalClause(b) + basisClause(b) + '</span>';
  }
  var fp = String(b.set_fingerprint || ''); fp = /\d+T\d{4}Z/.test(fp) ? 'the served set' : ('fit set ' + fp);   // a wave-id-shaped fingerprint never reaches the fold (the project maintainers 7 Sep: no code-names); a sha stays as the chrome's fingerprint
  txt = ' · Bayesian source: ' + fp + ' — ' + b.n_fits + ' fitted models on ' + tasks
    + (b.served_axis_note ? '; this page\'s axis: ' + here + ' — ' + b.served_axis_note.replace(/^Bayesian curve fitted/, 'the fit set was cut')   // newer axis than the view's: drawn with the note
       : same ? ' (the same models and tasks as this page\'s axis)'
            : wider ? '; this page\'s axis: ' + here + ' — every model here is drawn; ' + extraN + ' fitted model' + (extraN === 1 ? '' : 's') + ' of the set ' + (extraN === 1 ? 'has' : 'have') + ' no model on this page'
            : '; this page\'s axis: ' + here + ' — the fit set is OLDER than the axis; the uncertainty bands refit with the next fit wave');
  if (b.note && /interim/.test(b.note)) txt += ' · ' + noStamps(noWaveIds(String(b.note).replace(/from wave \S+/g, 'from the newer fit wave')));   // no wave ids or stamps in the fold either
  txt += gateClause(b) + provisionalClause(b) + notDrawnClause(b) + basisClause(b) + coverageClause(b) + membershipClause(b);
  return '<span style="color:' + ((same || wider) && !b.served_axis_note ? 'inherit' : '#9a5b00') + '">' + txt + '</span>';
}

// basis adequacy of the served set (the fit methods maintainers spec 06h via the fit maintainers' pointer): adequate, or flagged with the rule's M —
// the served numbers stay with the flag until a declared re-fit (Definitions + fitting 6 Sep); hover carries the detail
function basisClause(b) {
  // the fit methods maintainers spec 06w (6 Sep): a served set carries a basis sentence only when an arm's adequacy ratio exceeds the
  // measured no-move band; the sentence itself is the face (neutral or measured), the rule and figures sit in the hover.
  // No sentence = within the band = nothing to say (numbers only where they change what the project maintainers does).
  var bt = b && b.basis_truncation;
  if (!bt || !bt.disclosure) return '';
  var band = bt.band || {};
  var tip = noStamps(noSpecTags(bt.disclosure_rule || bt.rule || '')) + (bt.r_at_min_ell != null ? ' — adequacy ratio ' + Number(bt.r_at_min_ell).toPrecision(2) + (band.r_star != null ? ' against a band to ' + Number(band.r_star).toPrecision(2) : '') : '')
    + (bt.min_ell_arm ? ' at the shortest length-scale, ' + String(bt.min_ell_arm).replace(/_batch$/, '') : '') + (bt.computed_at ? ' — computed ' + bt.computed_at : '');
  return ' · <span title="' + oneSentence(noStamps(String(tip))).replace(/"/g, '&quot;') + '" style="text-decoration:underline dotted">basis: ' + bt.disclosure + '</span>';
}

// arms fitted on fewer tasks than the frame (fitting's frame_disclosure): count here, text on each chip's hover
// fitting's membership_lag: the served fits stand on an older keep set than the landing matrix (numbers only, no dates; drops at the next wave)
function membershipFaceClause(f) {   // the task pool maintainers DECISIONS 13 Sep (FITTED-SET LABEL = NAME + COUNT OF RECORD): fit-frame figures are stated BESIDE the label,
  // on a basis line, never inside it. The block is the fit maintainers' or Definitions' mirror stamp (kept_set_fitted / landing_kept_set / tasks left service since the cut).
  var b = f && f.bayes_fits, ml = b && b.membership_lag;
  if (!ml || !ml.kept_set_fitted || !ml.landing_kept_set || ml.kept_set_fitted === ml.landing_kept_set) return '';
  var name = String(((DATASETS[DATASET] || {}).label) || 'this set').replace(/\s*\(.*$/, '');
  var gone = ml.n_tasks_dropped || Math.abs(ml.kept_set_fitted - ml.landing_kept_set);
  // Definitions 16 Sep (all-waves block): tasks that joined the axis after the cut and the total positioned today, when the block carries them
  var joined = ml.tasks_joined_count ? ', ' + Number(ml.tasks_joined_count).toLocaleString('en-US') + ' joined' : '';
  var today = (ml.in_service_total && ml.in_service_total !== ml.landing_kept_set) ? '; ' + Number(ml.in_service_total).toLocaleString('en-US') + ' positioned today' : '';
  var clauseText = 'the fit stands on ' + name + ' (' + Number(ml.kept_set_fitted).toLocaleString('en-US') + ' tasks) as cut; ' + Number(ml.landing_kept_set).toLocaleString('en-US') + (joined || today ? ' of them' : '') + ' in service (' + gone + ' left service since the cut' + joined + ')' + today;
  var hovParts = ml.fit_disclosure ? String(ml.fit_disclosure).split('; ') : [];   // the fit maintainers' disclosure: 'this fit stands on …; <the relabel fact>; it stays in this fit as cut …' — the relabel fact is the hover
  var hov = hovParts.length ? oneSentence(noNames(noSpecTags(hovParts[1] || hovParts[0]))) : '';   // the fit maintainers' relabel disclosure (18 Sep): a task relabelled after the cut stays in the fit as cut — the clause's hover
  if (ml.wave_2_left_service) hov += (hov ? ' · ' : '') + Number(ml.wave_2_left_service).toLocaleString('en-US') + ' wave 2 task' + (ml.wave_2_left_service === 1 ? '' : 's') + ' left service after the cut';   // the wave 2 figures (the task pool critic 18 Sep)
  if (ml.folded_twins) hov += (hov ? '; ' : '') + Number(ml.folded_twins).toLocaleString('en-US') + ' folded twin' + (ml.folded_twins === 1 ? ' serves' : 's serve') + ' through ' + (ml.folded_twins === 1 ? 'its parent' : 'their parents') + ' and did not leave';   // the difficulty maintainers' block (18 Sep): a folded twin is listed apart from the tasks that left
  return ' \u00b7 ' + (hov ? '<span title="' + hov.replace(/"/g, '&quot;') + '" style="text-decoration:underline dotted">' + clauseText + '</span>' : clauseText);
}
function membershipClause(b) {
  var ml = b && b.membership_lag;
  if (!ml || !ml.kept_set_fitted || !ml.landing_kept_set || ml.kept_set_fitted === ml.landing_kept_set) return '';
  // the set is named by the view's own official label (wave 1 / wave 1+2 / wave 2); counts stay inside set labels (the project maintainers' word of 10 Sep). The block
  // is fitting's or, for the re-cut sets, Definitions' mirror stamp (13 Sep): tasks that left service after the cut (version repairs, label changes)
  var name = String(((DATASETS[DATASET] || {}).label) || 'this set').replace(/\s*\(.*$/, '');
  return ' \u00b7 Bayesian curves stand on ' + name + ' (' + Number(ml.kept_set_fitted).toLocaleString('en-US') + ' tasks) as cut; ' + name + ' is (' + Number(ml.landing_kept_set).toLocaleString('en-US') + ' tasks) in service now after tasks left it (version repairs or label changes), and the next fit set takes it';
}
function coverageClause(b) {
  var xs = b && b.partial_coverage_arms;
  if (!xs || !xs.length) return '';
  return ' · ' + xs.length + ' model' + (xs.length > 1 ? 's' : '') + ' fitted on fewer tasks than the frame (models with wave 1 only, partial wave 2 coverage; the chip hover names the count)';
}

// served fits whose arm is outside this page's population (held / partial arms): named, never drawn
function notDrawnClause(b) {
  var xs = b && b.served_not_in_population;
  if (!xs || !xs.length) return '';
  return ' · ' + xs.length + ' served fit' + (xs.length > 1 ? 's' : '') + ' not drawn: ' + xs.map(function (x) {
    return '<span title="' + String(x.reason || '').replace(/"/g, '&quot;') + '" style="text-decoration:underline dotted">' + String(x.model_id).split('/').pop() + '</span>';
  }).join(', ') + ' (hover for the reason)';
}

// provisional classes on the served set (fitting's pointer; e.g. claude_twin_reused, pending re-binding): names + status
// in the line, the rule and scope text in the hover — a disclosure beside the source, never a figure change
function provisionalClause(b) {
  var pcs = b && b.provisional_classes;
  if (!pcs || !pcs.length) return '';
  return ' · provisional classes on this set: ' + pcs.map(function (pc) {
    var tip = (pc.rule || '') + (pc.scope ? ' — scope: ' + pc.scope : '') + (pc.status ? ' — ' + pc.status : '');
    return '<span title="' + String(tip).replace(/"/g, '&quot;') + '" style="text-decoration:underline dotted">' + pc.class + '</span>';
  }).join(', ') + ' (hover for the rule)';
}

// sampler-gate clause (the maintainers F023): fitting's gates_summary convention over the drawn files; flagged arms
// are served with the disclosure (chip hover), never withheld
function gateClause(b) {
  var g = b && b.gates;
  if (!g || !g.n_arms) return '';
  return ' · sampler gate (' + (g.convention || '0.5%-of-draws convention') + '): ' + g.n_pass + ' of ' + g.n_arms + ' pass'
    + (g.max_divergence_share_pct != null ? ' · max divergence share ' + g.max_divergence_share_pct.toFixed(2) + '%' : '')
    + (g.rhat_max != null ? ' · R-hat ≤ ' + g.rhat_max.toFixed(3) : '')
    + (g.bulk_ess_min != null ? ' · bulk-ESS ≥ ' + g.bulk_ess_min : '');
}

/* ---------------- export: the plot as drawn at the desktop geometry, a legend of every drawn model (project helper kit-export.js) ---- */
/* The project maintainers' word, 12:1x UK 18 Sep (via the coordination and the site design maintainers): a button exports the plot with a legend of every drawn model,
 * showing whatever the plot shows, robustly — the default way to export these plots. The page keeps its own
 * rendering path: the factory redraws the chart at K = 1 (the desktop geometry, full axis titles), hands the live SVG to the helper with one
 * legend row per drawn model in the plot's order (the chips' order; side arms after the served set), and draws the screen back before paint. */
var exportMounted = false;
function mountExport() {   // once: the reference control under the chart; the factory runs at click time so the current view is exported
  if (exportMounted) return;
  var box = document.getElementById('exportrow'); if (!box || !window.Kit || !Kit.exportButton) return;
  exportMounted = true;
  Kit.exportButton(box, exportOptions);
}
function isThinkArm(a) { return !!(a && (a.think || /think/i.test(String(a.id || a.stem || a.run || '')))); }   // a thinking variant's line is dashed, a run row's checkpoints included (the project maintainers' question of 24 Sep, 14:0x UK)
function curveDash(c) { if (c && c.run_dash != null) return String(c.run_dash); return (c.think || isThinkArm(c)) ? '6 4' : (c.variant_pattern === 'dash-dot' ? '4 1.5 1.5 1.5' : (c.variant ? '1.5 2.5' : '')); }   // a training run's arms carry the run's own pattern from the bundle (27 Sep: five runs of one base share one hue)   // the same dashes render draws
function exportLegend() {   // one row per drawn model, in the plot's order
  var rows = [];
  var visible = Array.from(sel).filter(shownArm).sort(function (a, b) { return a - b; });
  visible.forEach(function (i) {
    var c = D.shared.configs[i], cv = chainCurve(i);
    if (state.src === 'bayes' && cv.houseOnly) return;   // not drawn under the Bayesian estimator (no posterior)
    rows.push({ label: c.label, family: c.family || undefined, color: c.excluded ? '#9a9890' : c.color, dash: curveDash(c), width: 1.6,   // family named explicitly: the helper's label patterns can misfile (a distilled Qwen-32B read as Qwen3)
                marker: cv.form === 'bins' ? ((c.think || c.variant) ? 'open-circle' : 'circle') : 'none' });
  });
  var sbC = sideBlock();
  if (sbC && state.src === 'bayes') sbC.arms.forEach(function (a, k) {
    if ((sideSel && !sideSel.has(k)) || sideHidden(a) || !sideCurve(a)) return;
    rows.push({ label: a.label, family: a.family || undefined, color: a.color, dash: curveDash(a), width: 1.6, marker: 'none' });
  });
  if (state.src === 'bayes') seriesRows().forEach(function (srL) { var seriesSel = seriesSelFor(srL._row);
  srL.arms.forEach(function (a, k) {
    if (a._twin || (seriesSel && !seriesSel.has(k)) || !sideCurve(a)) return;
    rows.push({ label: a.short_label || a.label, family: a.run || a.family || undefined, color: a.color, dash: curveDash(a), width: 1.6, marker: 'none' });
  }); });
  return rows;
}
function exportView(nDrawn) {   // the controls' state in words for the stamp line
  var f = D.shared.frame || {}, ds = DATASETS[DATASET] || {};
  var parts = [String(f.dataset_label || ds.label || DATASET).split(':')[0]];
  if (ARMS === 'golden') parts.push('golden set');
  parts.push(state.def === 'average' ? 'average rate' : 'median task');
  parts.push(state.src === 'bayes' ? 'Bayesian curves' : houseName().toLowerCase());
  parts.push(state.band === 'off' ? 'uncertainty bands off' : state.band + '% uncertainty bands');
  if (state.src === 'bayes' && state.trend !== 'off') parts.push('linear trends');
  if (state.dots === '1') parts.push('task dots');
  if (pinOn()) parts.push('pinned at ' + PIN_LEVEL + '% failure');
  if (state.xs === 'raw' || state.ys === 'raw') parts.push((state.xs === 'raw' ? 'x' : '') + (state.xs === 'raw' && state.ys === 'raw' ? ' and ' : '') + (state.ys === 'raw' ? 'y' : '') + ' in raw percent spacing');
  parts.push(nDrawn + ' model' + (nDrawn === 1 ? '' : 's') + ' drawn');
  return parts.join(' \u00b7 ');
}
function exportOptions() {
  var chart = document.getElementById('chart'), f = D.shared.frame || {};
  EXPORTING = true; render();   // the desktop geometry; the helper clones the chart synchronously in this same task
  var legend = exportLegend(), view = exportView(legend.length);
  var restore = function () { EXPORTING = false; render(); };   // the screen is drawn back before the browser paints (a microtask runs first)
  if (window.queueMicrotask) queueMicrotask(restore); else Promise.resolve().then(restore);
  var ss = f.sources_state || {}; var asOfIso = ss.store_newest || f.built_at || f.stamp || null; var asOf = asOfIso ? humanTime(asOfIso) : null;
  var parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  var pick = function (t) { return (parts.find(function (q) { return q.type === t; }) || {}).value || ''; };
  var slug = String(f.dataset_label || (DATASETS[DATASET] || {}).label || DATASET).split(' (')[0].split(':')[0].replace(/\+/g, '-').replace(/[^\w-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return { svg: chart, legend: legend, title: 'Failure rate vs difficulty', page: 'failure-vs-difficulty', view: view,
    stamp: asOf ? 'data as of ' + asOf : '', fileBase: 'failure-vs-difficulty_' + slug + (ARMS === 'golden' ? '_golden' : '') + '_' + pick('year') + '-' + pick('month') + '-' + pick('day'), crop: null };
}

/* ---------------- crosshair + task-dot hover ------------------ */
function buildCrosshair() {
  var box = document.getElementById('chartbox');
  /* task-dot hover by delegation (dots can be thousands); the prompt
 * text lazy-loads from /difficulty/tasks/<id>.json on hover dwell
 * (the Definitions role's endpoint; the project maintainers' atlas request: the task's
 * text shown on hover) */
  var textCache = {}, dwellTimer = null;
  function dotRows(ti, ci, extra, arm) {   // arm: a run row's arm (28 Sep) — its own colour, id and name; else the panel config at ci
    var c = arm ? { color: arm.color, id: arm.id, label: String(arm.run || '') + (arm.run ? ' \u00b7 ' : '') + String(arm.short_label || arm.label) } : D.shared.configs[ci];
    var dd = D.dots.configs[c.id];
    var rows = [
      { key: c.color, value: dd.fails[ti] + ' of ' + (Array.isArray(dd.n) ? dd.n[ti] : dd.n),
        label: 'failures · ' + c.label },
      { key: null, value: fmtPct(D.shared.tasks.z[ti]),
        label: 'task difficulty' },
      { key: null, value: D.shared.tasks.id[ti], label: 'task' },
    ];
    if (extra) rows.push({ key: null, value: '',
      label: extra.length > 320 ? extra.slice(0, 320) + '…' : extra });
    return rows;
  }
  box.addEventListener('pointermove', function (ev) {
    var t = ev.target;
    if (t.tagName === 'circle' && t.dataset.t != null) {
      var ti = +t.dataset.t, ci = +t.dataset.i;
      var armD = null;
      if (t.dataset.row != null && t.dataset.series != null) { var rowsD = seriesRows(); var srT = rowsD.filter(function (r) { return String(r._row) === String(t.dataset.row); })[0]; armD = srT ? srT.arms[+t.dataset.series] : null; if (!armD) return; }
      var id = D.shared.tasks.id[ti];
      Kit.tooltip.show(ev.clientX, ev.clientY,
        dotRows(ti, ci, textCache[id], armD), null);
      clearTimeout(dwellTimer);
      if (!(id in textCache))
        dwellTimer = setTimeout(function () {
          fetch('./tasks/' + id + '.json')
            .then(function (r) { return r.json(); })
            .then(function (j) {
              textCache[id] = j.text || '';
              Kit.tooltip.show(ev.clientX, ev.clientY,
                dotRows(ti, ci, textCache[id], armD), null);
            }).catch(function () { textCache[id] = ''; });
        }, 150);
      ev.stopPropagation();
    }
  }, true);

  /* Kit.crosshair takes static pixel xs; (re)arm on load + resize.
 * Snap grid = the average trend grid (stable across chains; the
 * readout interpolates the ACTIVE chain at the snapped z). */
  function arm() {
    if (crosshair) crosshair.destroy();
    var r = box.getBoundingClientRect();
    var scale = r.width / W;
    var gridP = null; if (pinOn()) { var rG = pinR(); gridP = []; for (var qG = 0; qG <= 48; qG++) gridP.push(-rG + 2 * rG * qG / 48); }   // under the pin: a relative grid across the axis
    var xs = pinOn() ? gridP.map(function (s) { var LG = xlimT(); return (ML + (s - LG[0]) / (LG[1] - LG[0]) * PW) * scale; }) : D.avg.trend_zs.map(function (z) { return sx(z) * scale; });
    crosshair = Kit.crosshair({
      container: box, xs: xs,
      readout: function (k) {
        var z = pinOn() ? null : D.avg.trend_zs[k], sP = pinOn() ? gridP[k] : null;
        var zFor = function (cv) {   // the difficulty this curve is read at: under the pin the relative step plus the curve's own offset, back in logit
          if (!pinOn()) return z; var sh = pinShift(cv); if (sh == null) return null; var v = sP + sh;
          return state.xs === 'raw' ? logit(Math.min(0.9999, Math.max(0.0001, v))) : v;
        };
        var rows = [];
        var visible = Array.from(sel).filter(shownArm).sort(function (a, b) {
          return a - b;
        });
        visible.slice(0, 12).forEach(function (i) {
          var cvI = chainCurve(i), zI = zFor(cvI);
          var v = zI == null ? null : curveAt(cvI, zI);
          rows.push({ key: D.shared.configs[i].color,
            value: v == null ? 'outside the fitted range' : fmtPct(v),
            label: D.shared.configs[i].label });
        });
        if (visible.length > 12)
          rows.push({ key: null, value: '+' + (visible.length - 12),
                      label: 'more models (narrow the chips)' });
        // the runs' curves under the cursor too (the project maintainers' 28 Sep review: no legend under the cursor for a run's line): every selected
        // arm of every run row, named as its row and chip print it, in its own colour
        if (state.src === 'bayes') seriesRows().forEach(function (srH) {
          var ssH = seriesSelFor(srH._row);
          srH.arms.forEach(function (a, k) {
            if (a._twin || !ssH.has(k)) return;
            var cvH = sideCurve(a); if (!cvH) return;
            var zH = zFor(cvH); var vH = zH == null ? null : curveAt(cvH, zH);
            rows.push({ key: a.color, value: vH == null ? 'outside the fitted range' : fmtPct(vH),
                        label: String((a.run || headingShort(srH))) + ' \u00b7 ' + String(a.short_label || a.label) });
          });
        });
        return { title: pinOn() ? 'from the pin ' + pinStepText(sP) + (state.xs === 'raw' ? ' points' : '') : 'difficulty ' + fmtPct(z), rows: rows };
      },
    });
  }
  rearmCrosshair = arm;
  window.addEventListener('resize', arm);
  setTimeout(arm, 50);
}
})();
