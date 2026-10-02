/* plane.js — the crossings plane as a module: the figure's geometry, scales and ticks, the data readers, the marks, the fits, the renderer, the hover and the export,
 * loaded by /capability-vs-reliability/ and by its side-by-side page alike (the project maintainers' word of 2 Oct 2026 13:0x UK: composition — the same components
 * re-plugged on a new page, the original not edited to fit it). The page's own script (app.js, or the side-by-side page's) loads the data, mounts the controls and
 * calls into this file; a fix here reaches every page that loads it. Classic script, one shared scope with the other modules. */
'use strict';

var W = 860, H = 720, ML = 62, MR = 16, MT = 40, MB = 46;
var PW = W - ML - MR, PH = H - MT - MB;
/* EXPORT (the project maintainers' word of 18 Sep 12:1x: a button exports the plot with a legend of every model, showing what the plot
 * shows, rendered as the page renders it): the export is THIS render path run once more, at a fixed
 * desktop geometry, with per-axis limits tightened to the drawn extent (EXT: the dots, whiskers and move arrows of the last screen render);
 * the reference helper (kit-export.js, the reference designer 18 Sep) clones the chart and lays the legend beside it. The page's own frame (LIM) never moves. */
var EXPORTING = false, LIMX = null, LIMY = null, EXT = null, NO_RATCHET = false;
var CROP = null;   // 2 Oct 2026 (the project maintainers' word of 11:2x UK, the structure maintainers' section: a page's axes fit the data): the single figure's on-screen window — one common range for both axes around the drawn points, held while a level drags, re-cropped at the drag's end
var PANELS = null, PANEL = null;   // the composed page (2 Oct 2026, the project maintainers' word of 13:0x UK: composition): PANELS its sets' contexts, PANEL the panel being drawn; both null on the single-figure page
function withPanel(ctx, fn) {   // the plane's closure variables stand in for one set while fn runs, then come back — the composed page draws every set through this one renderer
  var s0 = [D, LIM, RUNS, RUN, SLUG_OF, IDX_OF_SLUG, sel]; D = ctx.D; LIM = ctx.LIM; RUNS = ctx.RUNS || []; RUN = ctx.RUN || null; SLUG_OF = ctx.SLUG_OF || {}; IDX_OF_SLUG = ctx.IDX_OF_SLUG || {}; sel = ctx.sel || new Set();
  try { return fn(); } finally { D = s0[0]; LIM = s0[1]; RUNS = s0[2]; RUN = s0[3]; SLUG_OF = s0[4]; IDX_OF_SLUG = s0[5]; sel = s0[6]; }
}
var CONTROL_WORDS = {   // the words of the switches both pages mount — one table, so a label changes once (the project maintainers' word: a control carries the record only)
  def: { label: 'Definition', options: [{ value: 'average', label: 'Average rate' }, { value: 'median', label: 'Median task' }] },
  src: { label: 'Crossing estimator', bayes: 'Bayesian (posterior)' },   // the reference option's label is houseName
  partial: { label: 'Partial models', options: [{ value: 'hide', label: 'hidden' }, { value: 'show', label: 'show partial models' }] },
  xs: { label: 'Horizontal scale' }, ys: { label: 'Vertical scale' }, scale: [{ value: 'logit', label: 'Logit' }, { value: 'raw', label: 'Normal' }],
};
function cropRange(ext, lim) {   // the on-screen window around the drawn points (the project maintainers' word of 2 Oct 11:2x UK; the structure maintainers' section: a page's axes fit the data): one common range for both axes (equal scales, the diagonal), padded 6%, never beyond the set's frame; null when the points fill the frame
  if (!(ext && isFinite(ext.x0) && isFinite(ext.y0) && ext.x1 >= ext.x0 && ext.y1 >= ext.y0)) return null;
  var lo = Math.min(ext.x0, ext.y0), hi = Math.max(ext.x1, ext.y1); if (hi - lo < 1) { var mid = (lo + hi) / 2; lo = mid - 0.5; hi = mid + 0.5; } var pad = (hi - lo) * 0.06;
  var r = [Math.max(lim[0], lo - pad), Math.min(lim[1], hi + pad)];
  return r[1] - r[0] >= (lim[1] - lim[0]) - 1e-9 ? null : r;
}
var DUAL_TWINS = true;   // the project maintainers' word of 28 Sep 14:3x: a released or base model sits in the main model list AND as a chip in its series — one entity, one chip on every plot (the dual form for every twin; the same on the curves page)   // NO_RATCHET: the export's restore render leaves the text blocks' heights as they were
var CHART_VH_GAP = 170;
var EXPORT_TITLE_PX = 26, EXPORT_TICK_PX = 18;   // the export's type (the project maintainers 13:5x 18 Sep: axis names twice as big, tick numbers 50% bigger) — the reference export defaults, shared with the reference designer // CSS px kept above and below the chart by #chart { max-height: calc(100vh - 170px) } — the same number, so the type floors hold
function extAdd(zx, zy) {
  if (!EXT) EXT = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
  if (zx != null && isFinite(zx)) { if (zx < EXT.x0) EXT.x0 = zx; if (zx > EXT.x1) EXT.x1 = zx; }
  if (zy != null && isFinite(zy)) { if (zy < EXT.y0) EXT.y0 = zy; if (zy > EXT.y1) EXT.y1 = zy; }
}
var NARROW = false, FS = 12, FT = 11, DR = 5, UPX = 1;   // UPX: viewBox units per CSS px, so type floors hold when the box is squeezed   // FS: tick labels; FT: track labels (viewBox units)
/* LAYOUT (the critic's drive 2026-09-03: the phone chart rendered 5 px labels and 4 px dots): under 600 px
 * the viewBox narrows to 380 units so 13-unit type renders >= 12 CSS px; the level track and both
 * axis titles live in a top band; hit areas >= 24 CSS px. Desktop geometry unchanged. */
function layout() {
  if (PANEL) {   // a panel of the composed page: a square plot at the panel's width, one viewBox unit = one CSS px, the tick type at 10 px
    NARROW = false; W = PANEL.size.width; ML = 44; MR = 10; MT = 10; MB = 34; DR = 3.5; PW = W - ML - MR; PH = PW; H = PH + MT + MB; UPX = 1; FS = 10; FT = 9; TRK.x0 = ML; TRK.x1 = ML + PW; TRK.y = 6; return;
  }
  if (EXPORTING) {   // the export's fixed desktop geometry: one viewBox unit = one CSS px at 900 wide, the screen's type and dot sizes at 1:1
    NARROW = false; W = 900; ML = 90; MR = 30; MT = 40; MB = 62; DR = 4.5; PW = W - ML - MR; UPX = 1; FS = EXPORT_TICK_PX; FT = 11;   // margins re-laid for the export's larger type (the project maintainers 13:5x 18 Sep)
    // equal scale in the export too (the project maintainers' 13:03 word): with both axes on one spacing the plot's height follows the y span over the x span in
    // the axis coordinate, so one step spans the same pixels on x and y and y = x stays at 45 degrees inside the tightened limits; mixed
    // spacings have no common unit and keep the square
    var LX = limT(state.xs === 'raw', 'x'), LY = limT(state.ys === 'raw', 'y');
    PH = state.xs === state.ys && LIMX && LIMY ? Math.round(PW * (LY[1] - LY[0]) / (LX[1] - LX[0])) : PW;
    H = PH + MT + MB; TRK.x0 = ML; TRK.x1 = ML + PW; TRK.y = 18; return;
  }
  var cb = document.getElementById('chartbox'), w = cb ? cb.clientWidth : 860;
  NARROW = w > 0 && w < 600;
  var deskW = Math.max(860, Math.min(1600, Math.round(w || 860)));   // desktop: 1 viewBox unit = 1 CSS px (the 860-unit box stretched to 1216 px made 14–17 px type and 14 px dots — the project maintainers 09-03)
  // EQUAL SCALE (the project maintainers' word, 13:03 18 Sep: the axes keep one proportion so y = x runs at 45 degrees): both axes span the same
  // difficulty frame, so the plot area is SQUARE — one difficulty step spans the same pixels on x and y and the y = x guide runs at 45 degrees.
  // The chart is capped to the viewport height by CSS (#chart max-height), so the whole plot shows without scrolling; type sizes follow the
  // width the chart will actually render at.
  W = NARROW ? 380 : deskW; ML = NARROW ? 56 : 62; MR = NARROW ? 24 : 16; MT = NARROW ? 52 : 40; MB = NARROW ? 44 : 46;   // phone: the titles sit at the axes too, the top band holds the level track alone
  DR = NARROW ? 5 : 4.5;   // dot radius in viewBox units (phone unchanged; desktop 9 px at 1:1)
  PW = W - ML - MR; PH = PW; H = PH + MT + MB;
  var hAvail = Math.max(360, (window.innerHeight || 900) - CHART_VH_GAP), rw = w > 0 ? Math.min(w, hAvail * W / H) : W;   // the rendered width after the height cap
  UPX = rw > 0 ? W / rw : 1;
  if (!NARROW) DR = Math.max(4.5, 4 * UPX);   // a dot never renders under 8 CSS px when the height cap shrinks the chart (9 px at 1:1 as before)
  FS = NARROW ? 13 : Math.max(12, Math.ceil(11.5 * UPX)); FT = NARROW ? 13 : Math.max(11, Math.ceil(10.5 * UPX));   // ticks render >= 11.5 px at any desktop width (the reference designer's 2nd read 09-04)
  TRK.x0 = ML; TRK.x1 = ML + PW; TRK.y = NARROW ? 22 : 18;
}
var LOGIT_TICKS = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 80, 90, 95, 98, 99, 99.5];   // both axes reach down to 0.1% with 0.2% and 0.1% ticks (the project maintainers' word of 22 Sep 15:2x: models sit there now)
var AXIS_FLOOR_PCT = 0.1;   // the lowest position both axes show, as a percent of the scale
var LOGIT_TICKS_EXPORT = [0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 80, 90, 95, 98, 99, 99.5, 99.8, 99.9];
var LOGIT_TICKS_FINE = [0.05, 0.07, 0.1, 0.15, 0.2, 0.3, 0.5, 0.7, 1, 1.5, 2, 3, 5, 7, 10, 15, 20, 30, 40, 50, 60, 70, 80, 85, 90, 93, 95, 97, 98, 99, 99.3, 99.5, 99.7, 99.8, 99.9];
// the zoomed export's finer ladder (the project maintainers' word of 28 Sep: the zoomed view zooms tighter to the points shown): an axis whose window holds fewer than three project ticks prints a finer ladder, and the y axis's floor tick comes from the ladder it prints
var EXPORT_TIER_Y = null, EXPORT_FLOOR_Y = null;   // the zoomed export's y ladder and its floor tick (percent), set by the export factory for the render   // the export continues an axis to the lowest drawn point with a tick there (the project maintainers 15:0x 18 Sep)
/* /sweep fold (tools convergence blocking condition, ported 2026-09-02):
 * K = x level / y level is the FOLD; a, K and a/K carry two degrees of
 * freedom, so exactly one is HELD while the other two respond. */
var K_MAX = 99.5 / 0.2, K_LADDER_MAX = 50, K_CHIPS = [2, 4, 8, 10, 16, 32, 50];   // K = x/y is a derived number, never a cap (the project maintainers' word of 2026-09-09 : no cap on K at 50); the extreme ratio of the level grid only sizes the slider
var dragK0 = null;
var RAW_TICKS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
function logit(p) { return Math.log(p / (1 - p)); }
function pct(z) { return 100 / (1 + Math.exp(-z)); }
function fmtPct(z, d) { return pct(z).toFixed(d == null ? 1 : d) + '%'; }


var D = {};
var MOUNT = window.MIRROR_MOUNT || './';   // a mirror (the results mirror maintainers' /nb-results/plane/) sets window.MIRROR_MOUNT before this file; mount-absolute references (the project's critic the first finding: the slash-less address resolved relative assets against the root and rendered blank)
function prepareSet(X, quiet) {   // one set's artifacts made ready to draw, as the single figure has always done it: the withdrawn pass, the id-keyed joins, the previous fit's rows, the level grid, the unfitted arms and the two refusals — the composed page prepares every set through this one function
  /* WITHDRAWN arms are ABSENT (the project maintainers' word of 3 Sep 2026: data adopted out is out entirely — no phantom points, removed from every
   * figure and display): dropped from the configs and every chain before anything renders — no dot, no chip, no count, no reason.
   * Source: the registry's withdrawn status (arms.jsonl, 2026-09-03) plus shared.withdrawn / shared.fit_excluded when the
   * artifact carries them (out-of-fit-population arms are absent too, never greyed). */
  var WITHDRAWN = {};   // 2026-09-03 : Gemma 4 re-entered with corrected-prompt data (membership change, the difficulty maintainers' decision) — the old hard-coded ids are gone; withdrawn arms come from the artifact
  (X.shared.withdrawn || []).forEach(function (id) { WITHDRAWN[id] = 1; });
  Object.keys(X.shared.fit_excluded || {}).forEach(function (id) { WITHDRAWN[id] = 1; });
  X.shared.configs = X.shared.configs.filter(function (c) { return !WITHDRAWN[c.id]; });
  ['avg', 'med', 'bay'].forEach(function (k) { if (X[k]) X[k].rows = X[k].rows.filter(function (r) { return !WITHDRAWN[r.cfg || r.id]; }); });
  X.shared.fit_excluded = null;
  [X.shared.capC, X.shared.capC_z, X.shared.capC_j].forEach(function (CB) { if (CB && CB.excluded) Object.keys(WITHDRAWN).forEach(function (id) { delete CB.excluded[id]; }); });
  /* id-keyed joins with a boot assert — NEVER positional (the
   * 2026-08-28 review found positional joins cross-wired series:
   * real numbers under wrong names). */
  X.avgById = {}; X.medById = {}; X.bayById = {};
  X.avg.rows.forEach(function (r) { X.avgById[r.cfg] = r; });
  if (X.med) X.med.rows.forEach(function (r) { X.medById[r.cfg] = r; });
  if (X.bay) X.bay.rows.forEach(function (r) { X.bayById[r.cfg] = r; });
  X.bayPrevById = {};   // FIT FLIP arrows (the project maintainers 2026-09-08: a before/after is the existing points with one arrow each to the new points): the previous fit's rows
  if (X.bayPrev && X.bayPrev.rows && X.bay) { X.bayPrev.rows.forEach(function (r) { X.bayPrevById[r.cfg] = r; }); X.bayPrev.lev_logit = X.bayPrev.lev_fail.map(function (p) { return Math.log(p / (1 - p)); }); }
  // continuous-level tables are REQUIRED (2026-08-29 rework);
  // refuse loudly on an old-schema artifact rather than half-render
  if (X.bay && (!X.bay.lev_fail || !X.bay.rows[0].levels
      || !X.bay.rows[0].levels_avg)) {
    if (!quiet) document.body.insertAdjacentText('afterbegin',
      'DATA VERSION MISMATCH: this build needs BOTH Bayesian '
      + 'crossing-table chains (median-task + average-rate, '
      + '2026-08-31 def-switch fix) — artifacts are being '
      + 'regenerated.');
    throw new Error('bayes artifact predates the average chain');
  }
  // level grid of the Bayesian crossing tables, in logit
  if (X.bay) X.bay.lev_logit = X.bay.lev_fail.map(function (p) {
    return Math.log(p / (1 - p));
  });
  // UNFITTED arms (artifact lists them): no Bayesian row is legitimate for these — the reference chains draw them
  X.unfitted = {}; (X.bay && X.bay.unfitted || []).forEach(function (id) { X.unfitted[id] = true; });
  var missing = X.shared.configs.filter(function (c) {
    return !X.avgById[c.id] || (X.med && !X.medById[c.id]) || (X.bay && !X.bayById[c.id] && !X.unfitted[c.id]);
  });
  if (missing.length) {
    if (!quiet) document.body.insertAdjacentText('afterbegin',
      'DATA JOIN FAILURE: ' + missing.length
      + ' models missing from a chain artifact — refusing '
      + 'to render rather than mislabel.');
    throw new Error('join failure: '
      + missing.map(function (c) { return c.id; }).join(','));
  }
}

/* ---------------- state ---------------- */
/* DATASET option (the project maintainers' word of 3 Sep 2026: an option at the top chooses the dataset — the board or the new tasks,
 * one set in the end). Vocabulary shared with
 * /failure-vs-difficulty (the shared inventory): key data = board | new | all. An option whose artifact set does not
 * exist yet is served disabled with the reason on hover; a deep link to it falls back to board and says so. */
var HOUSE_DATASETS = {   // availability comes from manifest.datasets at load; the reason sits on the disabled button and in the fallback note
  // the project maintainers' word of 5 Sep 2026 : the generation effort goes to the top half of the new pool, so that is plotted too — the board
  // with the top half first, then the top half by itself — names of record (Definitions' vocabulary, shared with /failure-vs-difficulty):
  // board_top = the 438 board tasks + the focused cohorts 1 and 2 on one axis (the DEFAULT view once its bundle is served); top = the focused 877.
  // Bundles: curves-site/data-board_top, data-top (+ golden pair); membership via unified_tasks.csv task_tier from the maintainers' frozen file.
  // ORDER OF THE OPTIONS = the project maintainers' priorities (the project maintainers' word of 10 Sep 2026 : wave 1+2 jointly matters most, then wave 1 alone as a sanity check,
  // then wave 2 alone, then the rest, little): wave 1+2 (default) | wave 1 | wave 2 | wave 2 + parked | wave 1+2 + parked.
  // COUNTS NOT CODE-NAMES (the project maintainers' word of 7 Sep 2026 : a figure shown to supervisors names task counts, never the board or half
  // code-names, which read as cryptic — 400 to 1,200 in the figure): the labels below are plain-word fallbacks; relabel
  // rewrites them from the served frames as task counts ("438 original + 853 new tasks"). The URL keys stay (board_top | top | board | new | all).
  board_top: { label: 'wave 1+2', hover: 'wave 1+2, on one difficulty axis', available: false, reason: 'this set is not served yet' },
  board: { label: 'wave 1', hover: 'wave 1', available: true, reason: 'wave 1 are always served' },
  top: { label: 'wave 2', hover: 'wave 2 (the parked tasks are not in it)', available: false, reason: 'this set is not served yet' },
  'new': { label: 'wave 2 + parked', hover: 'wave 2 + parked', available: false, reason: 'crossing rows for wave 2 over the frozen level grid are not published yet' },
  all: { label: 'wave 1+2 + parked', hover: 'wave 1+2 + parked, on one difficulty axis', available: false, reason: 'no single axis covers the original and wave 2 yet (difficulty computes one over the combined set)' },
  // THE SIX NON-CODE SETS (the project maintainers' word of 30 Sep 15:5x; the new benchmarks' maintainers' work; no study name on any label or switch, 2 Oct)m):
  // the six non-code sets browsable on this page under the Dataset control, in the project maintainers' order of preference — MATH-500 first, IFEval, then GSM8K-Platinum and the two CRUXEval sets, AIME last;
  // each set's crossings from the fits' maintainers' serving_nb_<set>.json on Definitions' per-set axis; a set without a bundle yet is greyed with its reason; the names of record as the results page prints them
  math500: { label: 'MATH-500', hover: 'MATH-500, on its own difficulty axis', available: false, reason: 'this set is not served yet', group: 'Math' },
  ifeval: { label: 'IFEval', hover: 'IFEval, on its own difficulty axis', available: false, reason: 'this set is not served yet', group: 'Other' },
  gsm8k_platinum: { label: 'GSM8K-Platinum', hover: 'GSM8K-Platinum, on its own difficulty axis', available: false, reason: 'this set is not served yet', group: 'Math' },
  cruxeval_i: { label: 'CRUXEval input', hover: 'CRUXEval input prediction, on its own difficulty axis', available: false, reason: 'this set is not served yet', group: 'Other' },
  cruxeval_o: { label: 'CRUXEval output', hover: 'CRUXEval output prediction, on its own difficulty axis', available: false, reason: 'this set is not served yet', group: 'Other' },
  aime: { label: 'AIME', hover: 'AIME, on its own difficulty axis', available: false, reason: 'this set is not served yet', group: 'Math' },
  // 2 Oct 2026 08:5x: the pooled six-set view (/six/) is not a dataset — the new benchmarks maintainers' leaf of record lists datasets only (its fifth rule, ) — so it is no option of this switch; the page is reached by the plain link beside the switch (below), and a ?data=six link still opens it
  // (the project maintainers' 11 Sep word kept the maths sets off this page for a mirror; the project maintainers' 30 Sep word puts every non-code set on it under the one control — the mirror keeps serving too)
};
// MIRROR HOOKS (the results mirror's maintainers 2026-09-11: the /nb-results/plane/ mirror runs this file unchanged; the curves page maintainers' curves page uses the same names):
// window.MIRROR_MOUNT, window.MIRROR_DATASETS (ordered key -> {label, hover}) and window.MIRROR_DEFAULT, set in the mirror's index.html before app.js.
// The label of record from the mirror's manifest (bound at build from the bundle) overrides the map's label in relabel, as on this page.
var CODING_KEYS = ['board_top', 'top', 'board', 'new', 'all'];
function mirrorMap(m) { var o = {}; Object.keys(m).forEach(function (k) { var e = m[k] || {}; o[k] = { label: e.label || k, short: e.short || String(e.label || k).split(' (')[0], hover: e.hover || '', available: false, reason: e.reason || 'this set is not served yet' }; }); return o; }
var DATASETS = window.MIRROR_DATASETS ? mirrorMap(window.MIRROR_DATASETS) : HOUSE_DATASETS;
var CADENCE = window.MIRROR_CADENCE_PLAIN || 'rebuilds with every landing of new results and every Bayesian fit flip (checked every two minutes)';   // the machinery line's cadence clause; a mirror states its own loop's truth (the results mirror's maintainers 2026-09-11)
function shortMap() { var F = { board_top: 'original + new', top: 'first new', board: 'original', 'new': 'new', all: 'all' }, o = {}; Object.keys(DATASETS).forEach(function (k) { o[k] = DATASETS[k].short || F[k] || DATASETS[k].label; }); return o; }
function plainTs(ts) {   // "7 Sep 03:23" from an ISO stamp — plain words, never ISO-Z (the project maintainers' word of 2026-09-07), and every clock the project maintainers reads is the UK clock (the word of 2026-09-14: UK time only); a bare date stays a date
  var s = String(ts || ''), m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?(Z|[+-]\d{2}:?\d{2})?)?/.exec(s), MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  if (!m) return s;
  if (!m[4]) return (+m[3]) + ' ' + MON[+m[2] - 1];
  var d = new Date(m[1] + '-' + m[2] + '-' + m[3] + 'T' + m[4] + ':' + m[5] + ':' + (m[6] || '00') + (m[7] || 'Z'));   // stamps without a zone are UTC (the files keep UTC)
  if (!isFinite(d)) return (+m[3]) + ' ' + MON[+m[2] - 1] + ' ' + m[4] + ':' + m[5];
  var g = {}; new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(d).forEach(function (x) { g[x.type] = x.value; });
  return (+g.day) + ' ' + MON[+g.month - 1] + ' ' + g.hour + ':' + g.minute;   // the clock is UK, written bare (the project maintainers' word of 24 Sep 14:2x)   // the month word from the fixed table (project form, the reference designer 18 Sep: "Sep", never the formatter's "Sept")
}
function relabel() {   // OFFICIAL SET NAMES with the count of record (the project maintainers' word of 2026-09-08 at 7pm: the sets renamed wave 1, wave 2 and wave 2 parked
  Object.keys(DATASETS).forEach(function (k) {   // sets outside the five coding keys (a mirror's new benchmark sets): the label of record bound at build, never typed
    if (CODING_KEYS.indexOf(k) >= 0) return; var e = D.man && D.man.datasets && D.man.datasets[k];
    // 30 Sep: a set named on the reference list (the six non-code sets, names of record) keeps its project name in the control and the frame line; the bundle lends only its count in the parenthesis
    if (e && e.label && DATASETS[k].group) { var par = /\(([^)]*)\)\s*$/.exec(String(e.label)); DATASETS[k].frameLabel = DATASETS[k].label + (par ? ' (' + par[1] + ')' : ''); DATASETS[k].short = DATASETS[k].label; return; }
    if (e && e.label) { DATASETS[k].label = e.label; DATASETS[k].frameLabel = e.label; DATASETS[k].short = String(e.label).split(' (')[0]; } });
  if (!CODING_KEYS.every(function (k) { return DATASETS[k]; })) return;   // a mirror without the coding sets: the wave names below do not apply
  // wave 2, and the rest to wave 2 parked … in important figures it should be wave 1 (430 tasks) … wave 2 (x tasks), and then combined wave 1+2 …
  // when we say wave 2 we dont mean wave 2 parked included"); counts bind at build from the task pool maintainers' counts_of_record.json (manifest.counts_of_record),
  // never typed; an old name appears once, in the hover. Falls back to the served frames' counts when the block is absent.
  function f(v) { return v == null ? null : String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  var C = D.man && D.man.counts_of_record;
  if (C && C.wave1 != null) {
    DATASETS.board.label = 'wave 1 (' + f(C.wave1) + ' tasks)'; DATASETS.board.short = 'wave 1';
    DATASETS.top.label = 'wave 2 (' + f(C.wave2) + ' tasks)'; DATASETS.top.short = 'wave 2';
    DATASETS.board_top.label = 'wave 1+2 (' + f(C.wave12) + ' tasks)'; DATASETS.board_top.short = 'wave 1+2';
    DATASETS['new'].label = 'wave 2 + parked (' + f(C.new_total) + ' tasks)'; DATASETS['new'].short = 'wave 2 + parked';
    DATASETS.all.label = 'wave 1+2 + parked (' + f(C.all) + ' tasks)'; DATASETS.all.short = 'all waves';
    // SAY WAVE 1+2, NEVER THE SOURCE NAMES (the project maintainers' word of 16 Sep 2026 10:5x: the task sets are called wave 1 and wave 2 — no benchmark names, no new-task-pool
    // words, just wave 1+2): the sets are wave 1, wave 2, wave 1+2 and nothing else — no source names, no gloss
    DATASETS.board.hover = 'wave 1';
    DATASETS.top.hover = 'wave 2 (the parked tasks are not in it)';
    DATASETS.board_top.hover = 'wave 1+2, on one difficulty axis';
    DATASETS['new'].hover = 'wave 2 + parked';
    DATASETS.all.hover = 'wave 1+2 + parked, on one difficulty axis';
    return;
  }
  function n(k) { var st = D.allDs && (D.allDs[k] || D.allDs['golden-' + k]); var fr = st && st.frame; return fr ? (fr.tasks_on_axis != null ? fr.tasks_on_axis : fr.tasks) : null; }
  var rb = n('board'), rt = n('top'), rn = n('new'), ra = n('all');
  var nb = f(rb), nt = f(rt), nn = f(rn), na = f(ra), nbt = (rb && rt) ? f(rb + rt) : null;
  if (nbt) { DATASETS.board_top.label = 'wave 1+2 (' + nbt + ' tasks)'; DATASETS.board_top.short = 'wave 1+2'; }
  if (nt) { DATASETS.top.label = 'wave 2 (' + nt + ' tasks)'; DATASETS.top.short = 'wave 2'; }
  if (nb) { DATASETS.board.label = 'wave 1 (' + nb + ' tasks)'; DATASETS.board.short = 'wave 1'; }
  if (nn) { DATASETS['new'].label = 'wave 2 + parked (' + nn + ' tasks)'; DATASETS['new'].short = 'wave 2 + parked'; }
  if (na) { DATASETS.all.label = 'wave 1+2 + parked (' + na + ' tasks)'; DATASETS.all.short = 'wave 1+2 + parked'; }
  DATASETS.board_top.hover = 'wave 1+2, on one difficulty axis'; DATASETS.top.hover = 'wave 2 (the parked tasks are not in it)'; DATASETS.board.hover = 'wave 1'; DATASETS['new'].hover = 'wave 2 + parked'; DATASETS.all.hover = 'wave 1+2 + parked, on one difficulty axis';
}
/* PARTIAL ARMS (the project maintainers' words of 7 Sep 2026: roughly every model should have every task; a model without them is not shown
 * by default, behind a toggle for partial arms, on this page as well):
 * an arm with attempts on fewer than 90% of this set's tasks is PARTIAL — hidden by default; the Partial arms switch (URL partial=show)
 * draws it greyed and marked, kept out of the fit; every hover carries "attempts on X of Y tasks (Z%)"; the notes name the hidden arms.
 * Coverage comes from the curves page maintainers' frames through the shared artifact (configs[].coverage {tasks, of}). */
function coverageOf(c) { var cv = c && c.coverage; if (!cv || !cv.of) return null; return { tasks: Math.min(cv.tasks, cv.of), of: cv.of, share: Math.min(1, cv.tasks / cv.of) }; }
// 30 Sep: a Bayesian fit on 32 answers a task against a set's 128 is partial too (the fits' maintainers' rule, the curves page's toggle): the builder flags the config partial_fit
function isPartial(i) { var c = D.shared.configs[i]; var cv = coverageOf(c); return (!!cv && cv.share < 0.9) || !!(c && c.partial_fit); }
function partialShown() { return state.partial === 'show'; }
function coverageText(c) { var cv = coverageOf(c); if (cv && cv.share < 0.9) return 'attempts on ' + Math.round(cv.share * 100) + '% of this set\u2019s tasks'; return (c && c.partial_fit && c.partial_note) ? c.partial_note : ''; }   // shares, never task counts (the project maintainers' word of 2026-09-10 ≈: task counts are not spoken of)
function partialArms() { return D.shared.configs.map(function (c, i) { return i; }).filter(function (i) { return isPartial(i) && !isWithheld(i); }); }
// WITHHELD ARMS (the project maintainers' word of 9 Sep 2026 : Gemma 4 12B is not shown — with a quarter of its tasks at the cap its
// performance is not measured): not drawn on any dataset, chip in place but unselectable, out of the fit, one note line; Gemma-4-31B stays.
var WITHHELD = {};   // the project maintainers' word of 2026-09-10 ≈: Gemma 4 is no longer withheld — the 09-09 hide of Gemma-4-12B is lifted (its served cut share is 5.4% on wave 1+2, 14% on wave 2); the mechanism stays for a future word
function isWithheld(i) { var c = D.shared.configs[i]; return !!(c && WITHHELD[c.id]); }
function isHidden(i) { var c = D.shared.configs[i]; return isWithheld(i) || (!partialShown() && isPartial(i)) || (isRun(i) && (!runShown(runOf(i)) || state.src !== 'bayes')) || (!!(c && c.bayes_only) && state.src !== 'bayes'); }   // bayes_only: a base model the sidecar stands in the main list from the board's Bayesian read (28 Sep)   // the run's crossings exist as Bayesian fits only: off the plane under the reference chain   // hidden from the plane and the fit right now
function withheldArms() { return D.shared.configs.map(function (c, i) { return i; }).filter(isWithheld); }
function armNote(c) { var d = c && c.disclosure; return (d && !/^covers \d/.test(d)) ? d : ''; }
function cleanedScope(c) { var sc = D.bay && D.bay.cleaned_scope; return (sc && c && sc[c.id]) || ''; }   // a cleaned fit whose cleaning is partial (the fits' maintainers' cleaned_arms[arm].scope)
function asGraded(c) { return !!(c && /removed before grading|cleaning/i.test(armNote(c)) && D.bay && !((D.bay.cleaned_arms || []).indexOf(c.id) >= 0)); }   // the reference chain carries the adopted cleaning but this arm's served Bayesian fit is still on the attempts as first graded (the fits' maintainers' cleaned_arms lists the re-fitted ones)   // the curves page maintainers' per-arm disclosure (the gpt cleaning line when it lands); the coverage sentence is already the hover's coverage row
function capTitle(t) {   // a hover stays within 300 characters (the project's critic's rule of 8 Sep): a long sentence of record is cut at its last clause boundary before the line, marked with an ellipsis; the whole sentence stays in the mark's tooltip and the legend
  t = String(t || ''); if (t.length <= 300) return t;
  var cut = t.slice(0, 296), k = Math.max(cut.lastIndexOf('; '), cut.lastIndexOf(', '), cut.lastIndexOf(' \u2014 '), cut.lastIndexOf('. '));
  if (k < 200) k = cut.lastIndexOf(' ');
  return cut.slice(0, k > 0 ? k : 296).replace(/[;,.\s]+$/, '') + ' \u2026';
}

var dataNote = null;
function showDataNote() { var el = document.getElementById('datanote'); if (el) { el.textContent = dataNote || ''; el.hidden = !dataNote; } }
var state = { data: 'board', arms: 'all', view: 'scatter', def: 'average', src: 'project', xdef: 'crossing', move: 'off',
              line: 'steps', lw: 'equal', resid: 'off', hold: 'k', lad: 'off', fitci: 'plain',
              w: 'on', wd: 'adj', xs: 'logit', ys: 'logit',
              a: 50, c: 1, kp: 'off', partial: 'hide', run: 'show' };   // K paths off by default on both versions (the project maintainers' word of 22 Sep 15:1x)
var sel = null, chips = [], srcMount = null, playTimer = null;
var LIM = null;    // shared difficulty limits (logit) for both axes

function houseName() {
  return state.def === 'average' ? 'Local-logistic crossings'
                                 : 'Binned-median crossings';
}

/* ---------------- axis transforms (percent only; logit|raw) ---- */
function tf(z, raw) { return raw ? pct(z) / 100 : z; }
function limT(raw, ax) {   // ax 'x' | 'y': the export's tightened limits when set, else the shared frame
  var B = (ax === 'y' ? LIMY : LIMX) || LIM;
  return raw ? [Math.max(0, pct(B[0]) / 100 - 0.02),
                Math.min(1, pct(B[1]) / 100 + 0.02)]
             : B;
}
function sx(z) {
  var raw = state.xs === 'raw', L = limT(raw, 'x');
  return ML + (tf(z, raw) - L[0]) / (L[1] - L[0]) * PW;
}
function sy(z) {
  var raw = state.ys === 'raw', L = limT(raw, 'y');
  return MT + (L[1] - tf(z, raw)) / (L[1] - L[0]) * PH;
}
function clampZ(v) { return Math.min(LIM[1], Math.max(LIM[0], v)); }
/* the fitted line's coordinates (the project maintainers 2026-09-14 : a linear map in whatever axes are set): under 'In the axes as set' an axis on task
 * shares hands the fit its share coordinate (tf), an axis on difficulty steps its logit; the pixel maps below are linear in those coordinates */
function inAxes() { return state.line === 'axes'; }
function FX(z) { return inAxes() && state.xs === 'raw' ? tf(z, true) : z; }
function FY(z) { return inAxes() && state.ys === 'raw' ? tf(z, true) : z; }
function pxF(v) { if (!(inAxes() && state.xs === 'raw')) return sx(v); var L = limT(true, 'x'); return ML + (v - L[0]) / (L[1] - L[0]) * PW; }
function pyF(v) { if (!(inAxes() && state.ys === 'raw')) return sy(clampZ(v)); var L = limT(true, 'y'); v = Math.min(L[1], Math.max(L[0], v)); return MT + (L[1] - v) / (L[1] - L[0]) * PH; }
function fmtY(v) { return inAxes() && state.ys === 'raw' ? (100 * v).toFixed(1) + '%' : v.toFixed(2); }
/* goodness of fit of the DRAWN line, in the fit's coordinates (the project maintainers 2026-09-14 : a number that moves when the fit gets worse): the vertical
 * misses of the fitted arms against the line, as percent of the y scale shown (the y frame's span in the fit's coordinates) */
function ySpanF() { if (inAxes() && state.ys === 'raw') { var L = limT(true, 'y'); return L[1] - L[0]; } var B = LIMY || LIM; return B[1] - B[0]; }

function residStats(f, xs, ys, labels) {
  var span = ySpanF() || 1, es = [], fv = [], big = -1, bi = 0, w5 = 0, w10 = 0, ss = 0;
  for (var i = 0; i < xs.length; i++) {
    var v = f.a + f.b * xs[i], e = ys[i] - v; es.push(e); fv.push(v); ss += e * e;
    if (Math.abs(e) > big) { big = Math.abs(e); bi = i; }
    if (Math.abs(e) / span <= 0.05) w5++;
    if (Math.abs(e) / span <= 0.10) w10++;
  }
  return { span: span, es: es, fv: fv, rmsPct: 100 * Math.sqrt(ss / Math.max(1, xs.length)) / span, bigPct: 100 * (es[bi] || 0) / span, bigLabel: labels[bi] || '', w5: w5, w10: w10, n: xs.length };
}
function sgn(v) { return (v > 0 ? '+' : v < 0 ? '\u2212' : '') + Math.abs(v).toFixed(1); }
function residPanel(RS, cols, x0, y0) {   // inset: misses against the line by fitted value (curvature shows as a bow); top-left under the panel, where the plane is empty (the project maintainers 2026-09-15)
  var fmin = Math.min.apply(null, RS.fv), fmax = Math.max.apply(null, RS.fv), emax = Math.max.apply(null, RS.es.map(Math.abs)) || 1, pad = 10;
  var t1 = 'misses vs fitted, \u00b1' + (100 * emax / RS.span).toFixed(0) + '% of the y scale \u00b7 ' + RS.w5 + '/' + RS.n + ' within \u00b15%';
  var t2 = 'typical ' + RS.rmsPct.toFixed(1) + '%, largest ' + sgn(RS.bigPct) + '% (' + RS.bigLabel + ')';
  // the box takes the width its longest line needs (the project maintainers 2026-09-15: the text ran past the window), never narrower than the plot's default inset
  var RW = Math.max(NARROW ? 150 : 230, Math.ceil(Math.max(t1.length, t2.length) * 11 * 0.56) + 2 * pad), RH = NARROW ? 90 : 120;
  var X = function (v) { return x0 + pad + (fmax > fmin ? (v - fmin) / (fmax - fmin) : 0.5) * (RW - 2 * pad); };
  var Y = function (e) { return y0 + 16 + RH / 2 - (e / emax) * (RH / 2 - pad - 16); };
  var out = '<g id="residpanel" data-critical-text pointer-events="none"><rect x="' + x0 + '" y="' + y0 + '" width="' + RW + '" height="' + RH + '" rx="6" fill="#fcfaf3" fill-opacity="0.94" stroke="#d9d2c2"/>'
    + '<text x="' + (x0 + pad) + '" y="' + (y0 + 12) + '" font-size="11" fill="#52514e">' + t1 + '</text>'
    + '<text x="' + (x0 + pad) + '" y="' + (y0 + 24) + '" font-size="10" fill="#52514e">' + t2 + '</text>'
    + '<line x1="' + (x0 + pad) + '" y1="' + Y(0).toFixed(1) + '" x2="' + (x0 + RW - pad) + '" y2="' + Y(0).toFixed(1) + '" stroke="#8b8477" stroke-dasharray="3 2"/>';
  for (var i = 0; i < RS.es.length; i++) out += '<circle cx="' + X(RS.fv[i]).toFixed(1) + '" cy="' + Y(RS.es[i]).toFixed(1) + '" r="3" fill="' + (cols[i] || '#52514e') + '" opacity="0.85" data-resid/>';
  return out + '</g>';
}

/* ---------------- level-table interpolation ------------------- */
/* tables are (firstIndex lo, window w[]) over the uniform lev_grid */
function tabAt(lo, w, gidx) {
  if (!w || !w.length) return null;
  var t = gidx - lo;
  if (t < 0 || t > w.length - 1) return null;
  var k = Math.floor(t);
  if (k >= w.length - 1) return w[w.length - 1];
  return w[k] + (t - k) * (w[k + 1] - w[k]);
}
function gidxOf(levLogit) {
  var g = D.avg.lev_grid;
  return (levLogit - g[0]) / (g[1] - g[0]);
}
/* median-chain tables are plain arrays with nulls */
function arrAt(arr, gidx) {
  var k = Math.floor(gidx);
  if (k < 0 || k >= arr.length - 1) return null;
  var a = arr[k], b = arr[k + 1];
  if (a == null || b == null) return null;
  return a + (gidx - k) * (b - a);
}

/* reading = {z, lo, hi, kind, extra} for config index i at level
 * (logit); kind: 'point' | 'lo-bound' | 'hi-bound' | 'none' */
function readAvg(i, lev) {
  var r = D.avgById[D.shared.configs[i].id];
  var g = gidxOf(lev);
  var z = tabAt(r.lo, r.z, g);
  var adj = state.wd === 'adj';
  var L = adj ? tabAt(r.loLd, r.zLd, g) : tabAt(r.loL, r.zL, g);
  var Hh = adj ? tabAt(r.loHd, r.zHd, g) : tabAt(r.loH, r.zH, g);
  if (z == null) {
    // outside the finite window: censored at the grid edge side
    var below = g < r.lo;
    return { z: below ? D.shared.reachable.floor_z
                      : D.shared.reachable.top_z,
             lo: null, hi: null,
             kind: below ? 'lo-bound' : 'hi-bound',
             extra: 'crossing outside the observed range' };
  }
  return { z: z, lo: L, hi: Hh, kind: 'point',
           extra: 'rho ' + r.rho + ' · design effect x' + r.deff };
}
function readMed(i, lev) {
  var r = D.medById[D.shared.configs[i].id];
  var g = gidxOf(lev);
  var z = arrAt(r.mid, g);
  if (z != null) {
    var k = Math.round(g);
    var df = r.dfrac[Math.max(0, Math.min(r.dfrac.length - 1, k))];
    return { z: z, lo: arrAt(r.L, g), hi: arrAt(r.H, g),
             kind: 'point',
             extra: 'defined in ' + Math.round(df * 100)
                    + '% of resamples' };
  }
  // bounds, with direction and the ceiling-bin honesty
  var lofin = null;
  for (var k2 = 0; k2 < r.mid.length; k2++)
    if (r.mid[k2] != null) { lofin = k2; break; }
  if (lofin != null && g < lofin && r.lo_bound)
    return { z: r.lo_bound[0], lo: null, hi: null, kind: 'lo-bound',
             extra: 'at or before the first measurable bin (its '
                    + 'median task has 0 failures below here)' };
  if (r.hi_bound)
    return { z: r.hi_bound[0], lo: null, hi: null, kind: 'hi-bound',
             extra: r.hi_bound[2] === 'ceiling-bin'
               ? 'at or before this bin the median task already '
                 + 'fails ALL attempts'
               : 'level not reached within the observed range' };
  return { z: null, kind: 'none', lo: null, hi: null, extra: '' };
}
/* Continuous-level Bayesian reading (2026-08-29 rework: levels are
 * draggable INSIDE the Bayesian source — the project maintainers' requirement). The
 * artifact carries a per-arm crossing table over a dense level grid
 * (D.bay.lev_fail); reading = linear interpolation BETWEEN table
 * levels (the browser's approved job), bounds never interpolated
 * through. hi_open/lo_open mark credible-band ends that reach the
 * censored edge (decision: render as open-ended bound markers). */
function prevFitName() {   // the project maintainers asked on 2026-09-14 which fit the previous-fit label meant: the set and the date of the cut the arrows move from,
  // e.g. "the 8 September cut of wave 1+2" — from the flip block's from-wave stamp, else the previous artifact's wave; a date here is the information the project maintainers asked for
  var fl = D.ds && D.ds.flip, w = String((fl && fl.from_wave) || (D.bayPrev && D.bayPrev.fit_set && D.bayPrev.fit_set.wave_id) || '');
  var m = /(\d{4})(\d{2})(\d{2})T\d{4}Z/.exec(w), MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var set = (DATASETS[D.dataId] && (DATASETS[D.dataId].short || DATASETS[D.dataId].label)) || 'this set';
  return m ? 'the ' + (+m[3]) + ' ' + MONTHS[+m[2] - 1] + ' cut of ' + set : 'the previous cut of ' + set;
}
function readBayes(i, levLogit) { return readBayesRow(D.bayById[D.shared.configs[i].id], levLogit, D.bay); }
function readBayesRow(r, levLogit, B) {   // B = the artifact the row belongs to (the served fit, or the previous fit for the arrows)
  // the def switch swaps the WHOLE chain here too (the 31 Aug 2026 fix on
  // the project maintainers' word: the median and the average under the posterior cannot show the very same
  // points, yet they did): median-task =
  // exact crossing draws; average-rate = band-inverted tables.
  var lt = state.def === 'average' ? r.levels_avg : r.levels;
  var LV = B.lev_logit;
  // the table is DEFINED at its end levels (0.2% and 99.5%): only a level strictly outside is a bound —
  // with <= every arm became a floor bound at exactly 0.2% (the drive's drag end), a row of triangles
  if (levLogit < LV[0] - 1e-9)
    return { z: lt.zg[0], lo: null, hi: null, kind: 'lo-bound',
             extra: 'level below the table range' };
  if (levLogit > LV[LV.length - 1] + 1e-9)
    return { z: lt.zg[1], lo: null, hi: null, kind: 'hi-bound',
             extra: 'level above the table range' };
  var lo_i = 0, hi_i = LV.length - 1;     // bisect (trails read this
  while (hi_i - lo_i > 1) {               // ~20k times per render)
    var mm = (lo_i + hi_i) >> 1;
    if (LV[mm] < levLogit) lo_i = mm; else hi_i = mm;
  }
  var j = hi_i, j0 = lo_i;
  if (lt.kind[j0] !== 0 || lt.kind[j] !== 0) {
    // a censored table level brackets this one: report the BOUND
    var k = lt.kind[lt.kind[j0] !== 0 ? j0 : j];
    return { z: k === -1 ? lt.zg[0] : lt.zg[1], lo: null, hi: null,
             kind: k === -1 ? 'lo-bound' : 'hi-bound',
             extra: k === -1
               ? 'crossing at or before the fitted range'
               : 'level not reached within the fitted range' };
  }
  var t = (levLogit - LV[j0]) / (LV[j] - LV[j0]);
  function ip(a) { return a[j0] + t * (a[j] - a[j0]); }
  var pc = null;
  if (lt.p_left[j0] !== null && lt.p_right[j0] !== null)
    pc = ip(lt.p_left) + ip(lt.p_right);
  var interimNote = r.interim ? 'interim fit' : null;   // no wave id, no Zulu time (the project maintainers 2026-09-07)
  return { z: ip(lt.mid), lo: ip(lt.lo), hi: ip(lt.hi), kind: 'point',
           hi_open: lt.hi_open[j0] || lt.hi_open[j],
           lo_open: lt.lo_open[j0] || lt.lo_open[j],
           extra: (interimNote ? interimNote + ' \u00b7 ' : '') + (state.def === 'average'
               ? (r.avg_source === 'exact' ? '80% uncertainty band (crossing draws, average-rate)' : B.whisker_label_avg) : B.whisker_label)
             + (pc !== null
                ? ' · ' + Math.round(pc * 100) + '% of draws censored'
                : '')
             + ((lt.hi_open[j0] || lt.hi_open[j])
                ? ' · the uncertainty band\u2019s upper end reaches the censored edge (open)'
                : '') };
}
function armFlag(i) {
  var f = D.shared.artifact_flags;
  return f && f.by_cfg[D.shared.configs[i].id] || null;
}
// CAPABILITY-C VARIANTS (the project maintainers' word of 14 Sep 2026: the distribution of difficulty may be uniform on 0–1 or uniform in logit space;
// the page shows both): capC = the difficulty maintainers' C with the population weighted evenly along the failure level (u in 0-1; today's file); capC_z = the same battery weighted
// evenly along the difficulty scale (logit u over the axis's task range; the difficulty maintainers' second file). Names stay as they are until the project maintainers and the metrics report agree
// on better ones (the project maintainers' word); the plain clauses are the difficulty maintainers'. Every Capability-C-keyed site reads the pressed variant through capBlock.
var CAP_KEYS = {
  // NAMES (the project maintainers' word of 14 Sep 2026 : the two are named capability under uniform difficulty on 0–1 and under
  // uniform logit — the names carry the distinction): the two options are named by the marginal they weight the population with; the metrics-report attribution moves to the hover clause
  // the difficulty maintainers' axis names of record : 'Capability (uniform difficulty 0\u20131)' and 'Capability (uniform logit)'; their files carry a name field from
  // their next build and the switch binds it from the block (name), typed as the fallback until then
  // THIRD VIEW + DISTRIBUTION NAMES (the project maintainers' word of 14 Sep 2026 : a third view joins the page, and the views are named after the
  // distributions of difficulty): the difficulty maintainers' names of record are Capability (uniform) = Beta(1,1) along the failure level, Capability (Haldane) = even weight per
  // logit step over the tasks' range (the improper Beta(0,0)), Capability (Jeffreys) = Beta(1/2,1/2) on the failure level; each file carries name and a distribution
  // gloss, bound here (name, clause); the fallbacks below type the same names until a file lands; the measure word waits on the names redo (the project maintainers' word)
  capC: { block: function () { return D.shared && D.shared.capC; }, fallback: 'Capability (uniform)', clause0: 'population weighted evenly along the failure level, 0 to 1 (Beta(1,1))', short: 'Capability (uniform)' },
  capC_z: { block: function () { return D.shared && D.shared.capC_z; }, fallback: 'Capability (Haldane)', clause0: 'population weighted evenly per difficulty step over the tasks\u2019 range (Beta(0,0), cut at the easiest and hardest task)', short: 'Capability (Haldane)' },
  capC_j: { block: function () { return D.shared && D.shared.capC_j; }, fallback: 'Capability (Jeffreys)', clause0: 'population weighted by the arcsine law along the failure level, heavier at both ends (Beta(\u00bd,\u00bd), no range cut)', short: 'Capability (Jeffreys)' }
};
Object.keys(CAP_KEYS).forEach(function (k) {
  CAP_KEYS[k].name = function () { var b = CAP_KEYS[k].block(); return (b && b.name) || CAP_KEYS[k].fallback; };
  CAP_KEYS[k].clause = function () {   // the hover gloss: the file's distribution field (string or {plain}), else its marginal clause, else the typed fallback
    var b = CAP_KEYS[k].block(), d = b && b.distribution;
    return (typeof d === 'string' && d) || (d && typeof d.plain === 'string' && d.plain) || (b && b.marginal_plain) || CAP_KEYS[k].clause0;
  };
});
function isCap() { return !!CAP_KEYS[state.xdef]; }
function capBlock() { var k = CAP_KEYS[state.xdef]; return k ? k.block() : null; }
function reading(i, levLogit, axis) {
  if (axis === 'x' && isCap()) {
    var CB = capBlock();
    if (!CB) return { z: null, kind: 'none', lo: null, hi: null, extra: 'no ' + CAP_KEYS[state.xdef].name() + ' for this set yet' };   // difficulty publishes the view per set; every model waits alike
    var bc = CB.by_cfg[D.shared.configs[i].id];
    if (!bc) {   // outside the Capability-C population: not drawn on this axis, named with the difficulty maintainers' reason
      var why = (CB.excluded || {})[D.shared.configs[i].id] || 'not in the Capability-C population';
      return { z: null, kind: 'none', lo: null, hi: null, extra: 'excluded from the Capability-C population \u2014 ' + why };
    }
    // whiskers appear mechanically when the difficulty maintainers' bootstrap chain
    // ships ci80_C (the project maintainers' word of 2026-09-01: ship it)
    return { z: bc.z, lo: bc.ci80_z ? bc.ci80_z[0] : null,
             hi: bc.ci80_z ? bc.ci80_z[1] : null, kind: 'point',
             extra: 'Capability C = ' + bc.C
               + (bc.ci80_C
                  ? ' [' + bc.ci80_C[0] + ', ' + bc.ci80_C[1]
                    + '] 80% uncertainty band (bootstrap, difficulty\u2019s chain)'
                  : ' (mean solve chance, calibrated pool), placed at '
                    + 'its capability C position on the difficulty scale \u2014 uncertainty chain requested, '
                    + 'whiskers land with difficulty\u2019s bootstrap') };
  }
  if (state.src === 'bayes' || bayesOnly(i)) {
    var cid = D.shared.configs[i].id;
    if (D.unfitted[cid] || !D.bayById[cid]) {   // the project maintainers' word of 2026-09-04: points without a Bayesian fit are not shown beside the fitted ones — one estimator per view: not drawn, its chip greyed, counted in the readout
      return { z: null, kind: 'none', lo: null, hi: null, extra: 'awaiting its Bayesian fit' };
    }
    var rb = readBayes(i, levLogit);
    if (cleanedScope(D.shared.configs[i])) rb.extra = (rb.extra ? rb.extra + ' \u00b7 ' : '') + 'cleaned fit, partial: ' + cleanedScope(D.shared.configs[i]);
    if (asGraded(D.shared.configs[i])) rb.extra = (rb.extra ? rb.extra + ' \u00b7 ' : '') + 'Bayesian fit on the attempts as first graded; the cleaned fit lands with the fits\u2019 next release';
    return rb;
  }
  return state.def === 'average' ? readAvg(i, levLogit)
                                 : readMed(i, levLogit);
}

/* ---------------- boot ---------------- */
// THE THIRD MODEL SET (the project maintainers' word of 22 Sep 2026 11:1x: a third model set, the Olmo run): the Olmo 3.1 7B RL-Zero Code
// run's checkpoints, from the fits' maintainers' fit files of record via build_olmo_set.py (data/olmo_run.json). Merged into the configs and the Bayesian rows
// only when the loaded dataset sits on the run's axis (the board_top axis); its own switch in the model row, its own family group and colours
// (the run's hue, lighter early to darker at the final model), each checkpoint labelled by its index in the maintainers' order; a run read along its
// steps and placed on the scale without a vote (the difficulty maintainers' rule): never in the fitted line, never in the set's model counts.
var RUNS = [];   // the run sets merged on this dataset (the sidecar's sets, or its single set), each with its own line of chips and switch (the project maintainers' word of 22 Sep 12:1x: more Olmo runs are coming)
var RUN = null;   // the first set, for one-set readers
function runSets(raw) { if (!raw) return []; if (raw.sets && raw.sets.length) return raw.sets; return raw.configs ? [raw] : []; }
function normId(id) { return String(id).replace(/_temp_[0-9.]+$/, '').replace(/_batch$/, '').replace(/--/g, '/').replace(/_think$/, '-Thinking'); }   // one model under its run forms (the palette registry's id rule); the fits' maintainers' <stem>_think_temp_<t> is the board's <stem>-Thinking (the curves page maintainers' id form; the Think final: olmo-3-7b-think-final-Thinking, 23 Sep)
function mergeRunSet(raw) {
  RUNS = []; RUN = null; state.runs = state.runs || {};
  if (!raw || !D.shared || !D.bay || !D.bay.rows) return;
  var axis = D.shared.axis && D.shared.axis.axis_id;
  // 26 Sep (the curves page's default bundle began carrying a run's checkpoints as configs): a board config that is a CHECKPOINT of a run this page
  // draws — its id is a run set's stem plus a step suffix — and has no twin in the run's set is not of record on this page yet (the series pointer of
  // record has not served it): it leaves the set before anything indexes it — no standalone mark, no chip, no row, no count. A checkpoint with a twin
  // folds into its run below (one model, one mark, in the run's own row). A run's start model keeps its plain id and is untouched here.
  var ckStem = function (id) { var s = String(id).toLowerCase().replace(/_temp_[0-9.]+$/, '').replace(/_batch$/, '').replace(/_think$/, ''); var m = /^(.*)-(?:step|ckpt|checkpoint)-?0*\d+$/.exec(s); return m ? m[1] : null; };
  var runStems = {}, runTwins = {};
  ((raw && raw.run_stems) || []).forEach(function (st) { runStems[String(st).toLowerCase()] = true; });   // 29 Sep (the runs lead's line on a stopped read): every training family's checkpoint stems from the sidecar, so a checkpoint of a family with no set yet is caught too
  runSets(raw).forEach(function (rs) { ((rs && rs.configs) || []).forEach(function (c) { if (c.base) return; var st = ckStem(c.id); if (st) runStems[st] = true; runTwins[normId(c.id)] = true; }); });
  var gone = {};
  D.shared.configs = D.shared.configs.filter(function (c) { var st = c.run ? null : ckStem(c.id); if (st && runStems[st] && !runTwins[normId(c.id)]) { gone[c.id] = true; return false; } return true; });
  if (Object.keys(gone).length) {
    var notGone = function (r) { return !gone[r.cfg]; }; var dropKeys = function (o) { if (o) Object.keys(gone).forEach(function (k) { delete o[k]; }); };
    D.bay.rows = D.bay.rows.filter(notGone); dropKeys(D.bayById);
    if (D.avg && Array.isArray(D.avg.rows)) D.avg.rows = D.avg.rows.filter(notGone); dropKeys(D.avgById);
    if (D.med && Array.isArray(D.med.rows)) D.med.rows = D.med.rows.filter(notGone); dropKeys(D.medById);
    if (Array.isArray(D.bay.unfitted)) D.bay.unfitted = D.bay.unfitted.filter(function (u) { return !gone[typeof u === 'string' ? u : (u && (u.cfg || u.id))]; });
  }
  var byNorm = {}; D.shared.configs.forEach(function (c) { if (!c.run) byNorm[normId(c.id)] = c; });
  var have = {}; D.shared.configs.forEach(function (c) { have[c.id] = true; });
  var haveRow = {}; D.bay.rows.forEach(function (r) { haveRow[r.cfg] = true; });
  runSets(raw).forEach(function (rs, k) {
    if (!rs || !rs.configs) return;
    var set = rs.set || {}; if (set.axis_id && axis && set.axis_id !== axis) return;   // merged only on the run's own axis
    if (!rs.configs.length && !(set.withheld || []).length) return;   // 26 Sep: a set with nothing drawn and nothing withheld has no row   // a run with no fit of record yet has a row only when the sidecar says it is pending (23 Sep 12:0x)
    // the run is keyed by the set's series slug (no field named key in the sidecar: a secret scanner read key":"<id> as an API key, 22 Sep)
    var R = { key: set.series || set.key || ('run' + k), name: set.name || 'run', clause: set.clause || 'a run read along its checkpoints, placed on the scale without a vote', tag: set.tag || '',
              hue: set.hue || null, ramp: set.ramp || [], dash: set.dash || '', marker: set.marker || null, think: !!set.think, withheld: set.withheld || [], stateKey: set.state_key || (k === 0 ? 'run' : 'run_' + String(set.key || k).replace(/[^a-z0-9]/gi, '')), idx: [], folded: [], dual: [],
              order: (set.order == null ? 100 + k : set.order), finalOnBoard: !!set.final_on_board };   // order: the rows under the all-models rows (Think first, then RL-Zero Code); pending: no fit of record yet; finalOnBoard: the final keeps its chip among all models, duplicated in the run's row (23 Sep 12:0x)
    var rowsById = {}; (rs.rows || []).forEach(function (r) { rowsById[r.cfg] = r; });
    rs.configs.forEach(function (c) {
      if (have[c.id]) {   // 26 Sep (Definitions' word of ): a run's START MODEL is one config shared by the runs' sets — one fit, one mark, one legend row; the second row's
        if (c.base) {     // position-0 chip folds onto the first row's config (a dual, like the board final's chip in the Think row), labelled by the labels row ('start model')
          var ei = -1; for (var q = 0; q < D.shared.configs.length; q++) if (D.shared.configs[q].id === c.id) { ei = q; break; }
          if (ei >= 0 && D.shared.configs[ei].run && D.shared.configs[ei].base) { R.idx.push(ei); R.dual.push(ei); R.dualLabel = R.dualLabel || {}; R.dualLabel[ei] = c.label || D.shared.configs[ei].label; return; }
          if (!(ei >= 0 && c.board_model && !D.shared.configs[ei].run)) return;
          // Definitions' decision 169 (28 Sep, one printed position per model): a group's checkpoint 0 carries the board's own id — the board's model folds into the group's row as the twin below, at the board's read
        } else return;
      }
      if (c.base && c.board_model && !byNorm[normId(c.id)]) {   // the project maintainers' word of 28 Sep 14:3x: our runs' checkpoint 0 IS the base model — one entity in the main model list (its plain name, its family) and at the head of its group's row as 'checkpoint 0'; the board set no longer lists it (the curves page's handoff moved it into the group), so the sidecar's board read stands it in the main list
        var mc = {}; Object.keys(c).forEach(function (kk) { mc[kk] = c[kk]; });
        // the plain name (the sidecar's board_label; an older sidecar's display name without its checkpoint clause); the board's family; a main-list model, Bayesian-only
        mc.label = c.board_label || String(c.display_name || c.label).replace(/\s*\u00b7\s*checkpoint 0$/, ''); mc.display_name = mc.label; mc.shared_page_label = null; mc.fam = c.board_family || c.fam; mc.run = false; mc.series = null; mc.bayes_only = true;
        D.shared.configs.push(mc); var mi = D.shared.configs.length - 1; have[c.id] = true; byNorm[normId(c.id)] = mc;
        var mrow = rowsById[c.id]; if (mrow && !haveRow[c.id]) { var mr = {}; Object.keys(mrow).forEach(function (kk) { mr[kk] = mrow[kk]; }); delete mr.run; mr.cfg = c.id; D.bay.rows.push(mr); haveRow[c.id] = true; if (D.bayById) D.bayById[c.id] = mr; if (D.unfitted && D.unfitted[c.id]) delete D.unfitted[c.id]; }
        R.idx.push(mi); R.dual.push(mi); R.dualLabel = R.dualLabel || {}; R.dualLabel[mi] = c.label; R.folded.push(c.id); return;
      }
      var twin = byNorm[normId(c.id)];
      if (twin) {   // ONE MODEL, ONE MARK, IN THE RUN'S OWN ROW (the project maintainers' word of 22 Sep 15:1x: the run has no chip in the top column, it is the thing in its
        // — and a group's checkpoint 0 (Definitions' decision 169, 28 Sep: one printed position per model): the builder gives the start model the board's own id, so the board's model moves into the group's row as 'checkpoint 0' at the board's read, as on the curves page; the 32-answer base read stays a record leaf
        var r = rowsById[c.id], boardHas = !!haveRow[twin.id];   // bottom row): the board's twin config joins the run — the run's label, colour and mark, out of the top row and the fitted line; its series fit stands in under the Bayesian source when the board fit set has none
        if (r && !haveRow[twin.id]) { var r2 = {}; Object.keys(r).forEach(function (kk) { r2[kk] = r[kk]; }); r2.cfg = twin.id; r2.alongside = R.key; delete r2.run; D.bay.rows.push(r2); haveRow[twin.id] = true; if (D.bayById) D.bayById[twin.id] = r2; if (D.unfitted && D.unfitted[twin.id]) delete D.unfitted[twin.id]; }   // the series fit stands in for a board model the board fit set left unfitted (the Think final, 23 Sep)
        // the project maintainers' word of 29 Sep 12:1x: the RL-Zero Code released model is not in the first chip list and not on by default — it lives in its row (the project maintainers' 22 Sep word); a set's final is dual only where
        // the sidecar's final_on_board says so (the Think run, 23 Sep); a base model stays dual (the project maintainers' 28 Sep word: one entity, the same chip on every plot)
        if (R.finalOnBoard || (DUAL_TWINS && c.base)) { var ti = D.shared.configs.indexOf(twin); twin.series = R.key; R.dualLabel = R.dualLabel || {}; R.dualLabel[ti] = c.label || twin.label; twin.gates_failed = twin.gates_failed || !!c.gates_failed; if (c.gates_failed && !twin.gate_flag) twin.gate_flag = c.gate_flag; R.idx.push(ti); R.dual.push(ti); R.folded.push(twin.id); return; }   // the board's chip stays; the run's row shows the same model again
        twin.run = true; twin.series = R.key; twin.board_label = twin.label; twin.label = c.label || twin.label; twin.display_name = c.display_name || twin.display_name; twin.shared_page_label = c.shared_page_label || twin.shared_page_label; twin.fam = c.fam || twin.fam;
        twin.step = c.step; twin.index = c.index; if (c.color) twin.color = c.color; twin.think = !!c.think; if (!boardHas) twin.alongside = R.name;   // a board model the board fit set positions itself (a group's checkpoint 0) is not 'alongside': its read is the board's own
        if (c.gates_failed) { twin.gates_failed = true; twin.gate_flag = c.gate_flag; if (!twin.disclosure) twin.disclosure = c.gate_flag; }
        R.idx.push(D.shared.configs.indexOf(twin)); R.folded.push(twin.id); return;
      }
      c.run = true; c.series = R.key; if (c.gates_failed && !c.disclosure) c.disclosure = c.gate_flag;   // a flagged fit carries its sentence where the board's arms carry theirs
      have[c.id] = true; D.shared.configs.push(c); R.idx.push(D.shared.configs.length - 1);
      var row = rowsById[c.id]; if (row && !haveRow[c.id]) { row.run = true; row.series = R.key; D.bay.rows.push(row); haveRow[c.id] = true; if (D.bayById) D.bayById[c.id] = row; }   // the row index is built at load; the run's rows join it here
    });
    if (R.idx.length || R.folded.length || R.withheld.length) { RUNS.push(R); state.runs[R.stateKey] = 'show'; }   // 26 Sep: a set with no checkpoint drawn or withheld has no row — a pending sentence is a note (the project maintainers' word of 24 Sep 12:4x); the builder emits no such set since v7.19, this is the belt
  });
  RUNS.sort(function (a, b) { return a.order - b.order; });   // the Think run's row before the RL-Zero Code row (23 Sep 12:0x)
  RUN = RUNS[0] || null;
}
// THE RUN'S MARKER OF RECORD (27 Sep; the palette registry's marker per run, the same shape on every page that draws the run — the threshold page
// took it 27 Sep 14:35): a run's checkpoints draw in the run's shape at the dot's size, the start model and every board model keep the circle;
// every mark path starts at 'M x y' so the readers of positions are untouched; open (thinking) and filled follow the dot's rule.
function markPath(shape, X, Y, r) {
  var Xs = X.toFixed(1), Ys = Y.toFixed(1), head = 'M' + Xs + ' ' + Ys, f = function (v) { return (+v).toFixed(1); };
  var poly = function (pts) { return head + pts.map(function (p, k) { return (k ? 'L' : 'M') + f(X + p[0]) + ' ' + f(Y + p[1]); }).join('') + 'Z'; };
  var ring = function (n, R, rot) { var o = []; for (var k = 0; k < n; k++) { var a = rot + k * 2 * Math.PI / n; o.push([R * Math.cos(a), R * Math.sin(a)]); } return o; };
  var star = function (n, R, r2) { var o = []; for (var k = 0; k < 2 * n; k++) { var a = -Math.PI / 2 + k * Math.PI / n, rr = k % 2 ? r2 : R; o.push([rr * Math.cos(a), rr * Math.sin(a)]); } return o; };
  var plus = function (L, w, rot) { var o = [[-w, -L], [w, -L], [w, -w], [L, -w], [L, w], [w, w], [w, L], [-w, L], [-w, w], [-L, w], [-L, -w], [-w, -w]]; if (!rot) return o; var c = Math.cos(rot), s = Math.sin(rot); return o.map(function (p) { return [p[0] * c - p[1] * s, p[0] * s + p[1] * c]; }); };
  switch (shape) {
    case 'square': { var s = r * 0.9; return head + 'm-' + f(s) + ' -' + f(s) + 'h' + f(2 * s) + 'v' + f(2 * s) + 'h-' + f(2 * s) + 'Z'; }
    case 'triangle': return head + 'm0 -' + f(r * 1.3) + 'l' + f(r * 1.15) + ' ' + f(r * 2) + 'l-' + f(r * 2.3) + ' 0Z';
    case 'triangle-down': return head + 'm0 ' + f(r * 1.3) + 'l' + f(r * 1.15) + ' -' + f(r * 2) + 'l-' + f(r * 2.3) + ' 0Z';
    case 'triangle-left': return head + 'm-' + f(r * 1.3) + ' 0l' + f(r * 2) + ' -' + f(r * 1.15) + 'l0 ' + f(r * 2.3) + 'Z';   // the registry's '<' (the 25-step re-drawn run, 29 Sep)
    case 'triangle-right': return head + 'm' + f(r * 1.3) + ' 0l-' + f(r * 2) + ' -' + f(r * 1.15) + 'l0 ' + f(r * 2.3) + 'Z';   // the registry's '>'
    case 'diamond': { var dd = r * 1.3; return head + 'm0 -' + f(dd) + 'l' + f(dd) + ' ' + f(dd) + 'l-' + f(dd) + ' ' + f(dd) + 'l-' + f(dd) + ' -' + f(dd) + 'Z'; }
    case 'star': return poly(star(5, r * 1.55, r * 0.65));
    case 'cross': return poly(plus(r * 1.45, r * 0.5, Math.PI / 4));
    case 'plus': return poly(plus(r * 1.45, r * 0.5, 0));
    case 'hexagon': return poly(ring(6, r * 1.15, 0));
    case 'pentagon': return poly(ring(5, r * 1.2, -Math.PI / 2));
    default: return head + 'm-' + r + ' 0a' + r + ' ' + r + ' 0 1 0 ' + (2 * r) + ' 0a' + r + ' ' + r + ' 0 1 0 -' + (2 * r) + ' 0Z';
  }
}
function markShape(i) { var c = D.shared && D.shared.configs[i]; if (!c || !c.run || c.base) return 'circle'; var R = runOf(i); return c.marker || (R && R.marker) || 'circle'; }   // 28 Sep: the checkpoint's own marker first (one group holds several runs, each with its marker of record)
function isRun(i) { var c = D.shared && D.shared.configs[i]; return !!(c && c.run); }
function isDual(i) { for (var k = 0; k < RUNS.length; k++) if (RUNS[k].dual && RUNS[k].dual.indexOf(i) >= 0 && runOnPlane(RUNS[k])) return true; return false; }   // a board model that a run's row shows again (final_on_board) — inside the run's legend row only while the run is on the plane; under the reference chain it is a board model with its own row
function runOf(i) { var c = D.shared && D.shared.configs[i]; if (!c || !c.run) return null; var ck = c.series || c.run_key; for (var k = 0; k < RUNS.length; k++) if (RUNS[k].key === ck) return RUNS[k]; return RUN; }
function runShown(R) { R = R || RUN; return !!R; }   // no per-run switch since 23 Sep 12:0x: a run is on the plane whenever its source is
function runOnPlane(R) { return runShown(R) && state.src === 'bayes'; }   // a run's checkpoints are read from Bayesian fits only: on the plane, in the frame line and in the caption under that source
function anyRunOnPlane() { return RUNS.some(function (R) { return R.idx.length && runOnPlane(R); }); }
function mainConfigs() { return D.shared.configs.filter(function (c) { return !c.run; }); }
function mainRows() { return D.bay && D.bay.rows ? D.bay.rows.filter(function (r) { return !r.run && !r.alongside; }) : []; }   // the board fit set's rows: a row attached from a series pointer (alongside) is not one of them

var lastMoved = null, lockNote = null, inputNote = null, undrawn = [];
var beyondFrame = 0, beyondArms = [];   // arms whose crossing lies outside the axis window this render: NOT drawn (the project maintainers' word of 9 Sep 2026 : arms beyond the frame are dropped, never drawn at the edge); one legend line, chips greyed with the reason

var partialShownN = 0;   // partial arms drawn greyed this render (legend line)

/* ---------------- chips (same pattern as CURVES) --------------- */
// URL KEYS ARE THE SLUGS OF THE NAMES OF RECORD (the project maintainers' word of 26 Sep 16:5x: a link's keys read as clear standard vocabulary — the run and its
// index, 'olmo-3-7b-think-0', never a step, a form or a temperature; the training lead's decision 135 and the new benchmarks maintainers' name_slug field derive the same way): the slug is
// the name of record lowercased, '(checkpoint k)' → '-k', '(final)' → '-final', every other run of non-alphanumerics one hyphen. Old keys (ids, stems, board ids) read on.
function slugify(name) {
  var s = String(name || '').trim().toLowerCase();
  s = s.replace(/\s*\((?:checkpoint|step)\s*(\d+)\)\s*$/, '-$1').replace(/\s*\(final\)\s*$/, '-final');
  s = s.replace(/[\u00b7()]/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return s;
}
var SLUG_OF = {}, IDX_OF_SLUG = {};
function slugIndex() {   // built once the run sets are merged; a slug taken twice (two names of record alike would break the project maintainers' 22 Sep uniqueness word) keeps the first and gives the second its id
  SLUG_OF = {}; IDX_OF_SLUG = {};
  D.shared.configs.forEach(function (c, i) { var s = c.slug || slugify(c.display_name || c.label); if (IDX_OF_SLUG[s] !== undefined) { s = c.board_id || c.id; } SLUG_OF[i] = s; IDX_OF_SLUG[s] = i; });
}

/* ---------------- seeded pairs-bootstrap fit ------------------- */
function mulberry32(seed) {
  var t = seed >>> 0;
  return function () {
    t = (t + 0x6D2B79F5) >>> 0;
    var r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
function fitLine(xs, ys) {
  var n = xs.length;
  if (n < 3) return null;
  var mx = 0, my = 0;
  for (var i = 0; i < n; i++) { mx += xs[i]; my += ys[i]; }
  mx /= n; my /= n;
  var sxy = 0, sxx = 0, syy = 0;
  for (i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) * (xs[i] - mx);
    syy += (ys[i] - my) * (ys[i] - my);
  }
  if (sxx < 1e-9 || syy < 1e-9) return null;
  var b = sxy / sxx, a = my - b * mx, rss = 0;
  for (i = 0; i < n; i++) { var e = ys[i] - a - b * xs[i]; rss += e * e; }
  return { b: b, a: a, r: sxy / Math.sqrt(sxx * syy), s: Math.sqrt(rss / Math.max(1, n - 2)) };
}
var fitCache = {};
/* band-weighted line (the fits' maintainers 2026-09-14; the maintainers's decision: a selectable option beside the line of record, never the default): errors in both
 * variables, each dot weighted 1/sigma^2 per axis from its own 80% band (York et al. 2004, uncorrelated errors), in the fit's coordinates; the
 * slope interval and the band are analytic at the page's CI level (95 plain, 80 honest); same result shape as bootFit */
function yorkFit(xs, ys, sig, level, mg) {
  var n = xs.length; if (n < 3 || !sig) return null;
  var base = fitLine(xs, ys); if (!base) return null;
  var wx = [], wy = [], i;
  for (i = 0; i < n; i++) { var s0 = Math.max(sig[i][0], 1e-6), s1 = Math.max(sig[i][1], 1e-6); wx.push(1 / (s0 * s0)); wy.push(1 / (s1 * s1)); }
  var b = base.b, W = new Array(n), U = new Array(n), V = new Array(n), beta = new Array(n), Xb = 0, Yb = 0, it;
  for (it = 0; it < 100; it++) {
    var sw = 0; Xb = 0; Yb = 0;
    for (i = 0; i < n; i++) { W[i] = wx[i] * wy[i] / (wx[i] + b * b * wy[i]); sw += W[i]; Xb += W[i] * xs[i]; Yb += W[i] * ys[i]; }
    Xb /= sw; Yb /= sw;
    var num = 0, den = 0;
    for (i = 0; i < n; i++) { U[i] = xs[i] - Xb; V[i] = ys[i] - Yb; beta[i] = W[i] * (U[i] / wy[i] + b * V[i] / wx[i]); num += W[i] * beta[i] * V[i]; den += W[i] * beta[i] * U[i]; }
    if (!(Math.abs(den) > 0)) return null;
    var bn = num / den; if (!isFinite(bn)) return null;
    var done = Math.abs(bn - b) < 1e-10; b = bn; if (done) break;
  }
  var a = Yb - b * Xb, sw2 = 0, xa = 0, xadj = new Array(n);
  for (i = 0; i < n; i++) { W[i] = wx[i] * wy[i] / (wx[i] + b * b * wy[i]); sw2 += W[i]; xadj[i] = Xb + beta[i]; xa += W[i] * xadj[i]; }
  xa /= sw2;
  var su = 0; for (i = 0; i < n; i++) { var u = xadj[i] - xa; su += W[i] * u * u; }
  if (!(su > 0)) return null;
  var vb = 1 / su, va = 1 / sw2 + xa * xa * vb, cab = -xa * vb, z = level === 80 ? 1.2816 : 1.96, rss = 0, chi = 0;
  for (i = 0; i < n; i++) { var e = ys[i] - a - b * xs[i]; rss += e * e; chi += W[i] * e * e; }
  // red = weighted scatter about the line per degree of freedom (1 when the bands explain all of it); the interval and the band are widened by its square root
  // (Birge ratio; the fits' maintainers 2026-09-14 ) and the bands-alone interval is kept beside them so the two are not confused
  var red = chi / Math.max(1, n - 2), k = Math.max(1, Math.sqrt(red)), hw = z * Math.sqrt(vb);
  var out = { b: b, a: a, r: base.r, s: Math.sqrt(rss / Math.max(1, n - 2)), level: level, lo: b - hw * k, hi: b + hw * k, lo0: b - hw, hi0: b + hw, weighted: true, iterations: it + 1, red: red, widen: k };
  mg = mg == null ? 0.15 : mg;
  var gx0 = Math.min.apply(null, xs) - mg, gx1 = Math.max.apply(null, xs) + mg;
  out.band = { xs: [], up: [], dn: [] };
  for (var gi = 0; gi <= 24; gi++) {
    var gx = gx0 + (gx1 - gx0) * gi / 24, sd = k * Math.sqrt(Math.max(0, va + gx * gx * vb + 2 * gx * cab)), yh = a + b * gx;
    out.band.xs.push(gx); out.band.up.push(yh + z * sd); out.band.dn.push(yh - z * sd);
  }
  return out;
}
/* pairs bootstrap over the visible models (B=200, seeded) — the
 * /sweep construction ported literal: plain = dots exact, pointwise
 * 95% envelope + 95% slope CI; honest = each drawn dot ALSO jittered
 * per resample by a Gaussian with its own measurement sigma per axis
 * (whisker half-width / z-score of the whisker's level), band and
 * bracket at 80%; the line itself never moves (cheap honest treatment
 * — widens uncertainty, does not correct attenuation). */
function gaussRnd(rnd) {
  var u = 0, v = 0;
  while (u === 0) u = rnd();
  while (v === 0) v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function bootFit(xs, ys, key, sig, mg) {
  if (key && fitCache[key]) return fitCache[key];
  var base = fitLine(xs, ys);
  if (!base) return null;
  var honest = !!sig;
  var rnd = mulberry32(20260828), slopes = [], lines = [];
  for (var b = 0; b < 200; b++) {
    var bx = [], by = [];
    for (var i = 0; i < xs.length; i++) {
      var k = Math.floor(rnd() * xs.length);
      var jx = honest ? gaussRnd(rnd) * sig[k][0] : 0;
      var jy = honest ? gaussRnd(rnd) * sig[k][1] : 0;
      bx.push(xs[k] + jx); by.push(ys[k] + jy);
    }
    var f = fitLine(bx, by);
    if (f) { slopes.push(f.b); lines.push([f.b, f.a]); }
  }
  slopes.sort(function (a, b2) { return a - b2; });
  var q = function (arr, p) {
    return arr[Math.max(0, Math.min(arr.length - 1,
      Math.round(p * (arr.length - 1))))];
  };
  var pl = honest ? 0.10 : 0.025, ph = honest ? 0.90 : 0.975;
  base.level = honest ? 80 : 95;
  base.lo = q(slopes, pl); base.hi = q(slopes, ph);
  var ints = lines.map(function (l) { return l[1]; }).sort(function (u, v) { return u - v; });   // the intercept's range from the same kept pairs (the fits' maintainers, 21 Sep: printed beside the intercept in the caption)
  base.aLo = q(ints, pl); base.aHi = q(ints, ph);
  // pointwise envelope of the bootstrap lines = the fit's band
  mg = mg == null ? 0.15 : mg;
  var gx0 = Math.min.apply(null, xs) - mg, gx1 = Math.max.apply(null, xs) + mg;
  base.band = { xs: [], up: [], dn: [] };
  for (var gi = 0; gi <= 24; gi++) {
    var gx = gx0 + (gx1 - gx0) * gi / 24;
    var vals = lines.map(function (l) { return l[0] * gx + l[1]; })
      .sort(function (u, v) { return u - v; });
    base.band.xs.push(gx);
    base.band.up.push(q(vals, ph)); base.band.dn.push(q(vals, pl));
  }
  if (key) {
    var ks = Object.keys(fitCache);
    if (ks.length > 400) delete fitCache[ks[0]];
    fitCache[key] = base;
  }
  return base;
}



function pctLadder(lo, hi) {   // percent ticks at the coarsest 1-2-5 step that puts three or more inside (lo, hi), for a window the reference ticks do not cover
  var steps = [20, 10, 5, 2, 1, 0.5, 0.2, 0.1, 0.05, 0.02, 0.01], t = [];
  for (var s = 0; s < steps.length; s++) {
    var st = steps[s]; t = [];
    for (var k = Math.floor(lo / st) + 1; k * st < hi; k++) { var v = +(k * st).toFixed(2); if (v > 0 && v < 100) t.push(v); }
    if (t.length >= 3) return t;
  }
  return t;
}
function floorIn(tier, zmin, stepUnder) {   // the tier's largest tick at or below a logit value, as { z, v }; a percent ladder (stepUnder) continues one step under its first tick; the fixed sets have no tick under their floor
  var fb = null;
  tier.forEach(function (v) { var zt = logit(v / 100); if (zt <= zmin + 1e-9 && (fb === null || zt > fb.z)) fb = { z: zt, v: v }; });
  if (fb === null && stepUnder && tier.length >= 2) { var st = +(tier[1] - tier[0]).toFixed(2), v0 = +(Math.floor(pct(zmin) / st) * st).toFixed(2); if (v0 > 0) fb = { z: logit(v0 / 100), v: v0 }; }
  return fb;
}
function exportTicks(ax) {   // the zoomed export's ticks on one axis (the project maintainers' word of 28 Sep): the reference set when three or more fall inside the window, else the finer ladder, else percent steps; the y axis prints the ladder its floor tick came from
  var raw = (ax === 'x' ? state.xs : state.ys) === 'raw', L = limT(raw, ax);
  var lo = raw ? L[0] * 100 : pct(L[0]), hi = raw ? L[1] * 100 : pct(L[1]);
  var inside = function (set) { return set.filter(function (v) { return v > lo && v < hi; }); };
  var t;
  if (ax === 'y' && !raw && EXPORT_TIER_Y) t = inside(EXPORT_TIER_Y);
  else { t = inside(raw ? RAW_TICKS : LOGIT_TICKS_EXPORT); if (!raw && t.length < 3) t = inside(LOGIT_TICKS_FINE); if (t.length < 3) t = pctLadder(lo, hi); }
  if (ax === 'y' && !raw && EXPORT_FLOOR_Y !== null && t.indexOf(EXPORT_FLOOR_Y) < 0 && EXPORT_FLOOR_Y > lo && EXPORT_FLOOR_Y < hi) t.push(EXPORT_FLOOR_Y);
  return t;
}
function axisGrid(xOnly, hOverride) {
  var g = '';
  var plotBot = (hOverride ? hOverride - MB : MT + PH);
  var LT = EXPORTING ? LOGIT_TICKS_EXPORT : LOGIT_TICKS, zoomed = EXPORTING && LIMX && LIMY;   // zoomed: the export tightened to the points shown (the project maintainers' word of 28 Sep)
  var xt = zoomed ? exportTicks('x') : (state.xs === 'raw' ? RAW_TICKS : LT);
  var yt2 = xOnly ? []
    : (zoomed ? exportTicks('y') : (state.ys === 'raw' ? RAW_TICKS : LT));
  if (NARROW) {   // phone: fewer ticks so 13-unit labels never touch
    var keepL = [1, 5, 20, 50, 80, 95, 99];
    xt = xt.filter(function (v) { return state.xs === 'raw' ? (v % 20 === 0 && v > 0) : keepL.indexOf(v) >= 0; });
    yt2 = yt2.filter(function (v) { return state.ys === 'raw' ? v % 20 === 0 : keepL.indexOf(v) >= 0; });
  }
  var zOf = function (v) {
    return logit(Math.min(0.9999, Math.max(0.0001, v / 100)));
  };
  xt.forEach(function (v) {
    var z = zOf(v), L = limT(state.xs === 'raw', 'x');
    if (tf(z, state.xs === 'raw') <= L[0]
        || tf(z, state.xs === 'raw') >= L[1]) return;
    g += '<line x1="' + sx(z) + '" y1="' + MT + '" x2="' + sx(z)
      + '" y2="' + plotBot + '" stroke="#e0d9c8" stroke-width="0.6"/>'
      + '<text x="' + sx(z) + '" y="' + (plotBot + FS + 5)
      + '" text-anchor="middle" fill="#52514e" font-size="' + FS + '" data-role="tick">'
      + v + '%</text>';
  });
  yt2.forEach(function (v) {
    var z = zOf(v), L = limT(state.ys === 'raw', 'y');
    if (tf(z, state.ys === 'raw') <= L[0]
        || tf(z, state.ys === 'raw') >= L[1]) return;
    g += '<line x1="' + ML + '" y1="' + sy(z) + '" x2="' + (ML + PW)
      + '" y2="' + sy(z) + '" stroke="#e0d9c8" stroke-width="0.6"/>'
      + '<text x="' + (ML - 6) + '" y="' + (sy(z) + Math.round(FS / 3))
      + '" text-anchor="end" fill="#52514e" font-size="' + FS + '" data-role="tick">'
      + v + '%</text>';
  });
  return g;
}

/* vocab-aware axis names: the reserved words belong to the
 * average-rate crossings at the adopted levels only. Layer-7 decision
 * (the maintainers 2026-08-28): titles name the estimator source
 * alongside the definition chain. Under src=bayes both chains exist
 * (2026-08-31): median-task from exact crossing draws, average-rate
 * band-inverted from the fit's average-rate quantile curves. */
function axisShort(axis) {   // the axis carries a short title; the long estimator form lives in the readout fold-out (the reference designer's read 09-04)
  if (axis === 'x' && isCap()) return CAP_KEYS[state.xdef].name();
  // no method name on the figure (the project maintainers 2026-09-14 on the error bars): the source is on the switch and in the provenance fold
  return dName(axis) + (state.def === 'median' ? ' (median task)' : '');
}
/* the axis names of record (the project maintainers' words of 18 Sep 12:1x and 13:0x: D50 and D99, D uppercase):
 * DN = the difficulty at which the model's solve chance is N%, N = 100 minus the failure level as set (50% -> D50, 1% -> D99); printed bare */
function dName(axis) {
  var lev = axis === 'x' ? +state.a : +state.c;
  return 'D' + fmtLev(100 - lev);
}
function fmtLev(v) { return String(+(+v).toFixed(2)); }
function axisName(axis) {
  if (axis === 'x' && isCap())
    return 'Capability C — mean solve chance on the calibrated pool '
      + '(metrics-report definition, counting estimator; ' + CAP_KEYS[state.xdef].clause() + ')';
  if (state.src === 'bayes') {
    var blev = axis === 'x' ? +state.a : +state.c;
    if (state.def !== 'average')
      return 'D' + (100 - blev) + ' (median task, posterior median)';
    // reserved words bind per-level on ANY average-rate chain, same
    // rule as the reference chain (the task pool maintainers' re-gate note, 2026-08-31).
    // The interim tag DERIVES from the artifact's estimator-version
    // field: when the maintainers' exact draws land (spec 2026-08-31g),
    // the label flips mechanically with the field — no prose hunt.
    var interim = (D.bay.estimator_version_avg || '')
      .indexOf('band inversion') >= 0;
    var bbase = 'D' + (100 - blev) + ' (average rate, posterior median'
      + (interim ? ', read off the fit\u2019s curves' : '') + ')';
    if (blev === 50 && axis === 'x') return 'Capability: ' + bbase;
    if (blev === 1 && axis === 'y') return 'Reliability: ' + bbase;
    return bbase.charAt(0).toUpperCase() + bbase.slice(1);
  }
  var lev = axis === 'x' ? state.a : state.c;
  var isAvg = state.def === 'average';
  var tag = isAvg ? ' (local-logistic)' : ' (binned medians)';
  var base = 'D' + (100 - (+lev)) + (isAvg ? ' (average rate)' : ' (median task)');
  if (isAvg && +lev === 50 && axis === 'x')
    return 'Capability: ' + base + tag;
  if (isAvg && +lev === 1 && axis === 'y')
    return 'Reliability: ' + base + tag;
  return base.charAt(0).toUpperCase() + base.slice(1) + tag;
}

/* level track: the drag modality (drag + type + preset parity).
 * Levels live on a logit-scaled track in the chart's top gutter. */
var TRK = { x0: ML, x1: ML + PW, y: 18,          // x0/x1/y are re-derived by layout
            lo: logit(0.002), hi: logit(0.995) };
function trkX(levLogit) {
  return TRK.x0 + (levLogit - TRK.lo) / (TRK.hi - TRK.lo)
    * (TRK.x1 - TRK.x0);
}
function trkLev(px) {
  var t = Math.max(0, Math.min(1,
    (px - TRK.x0) / (TRK.x1 - TRK.x0)));
  return TRK.lo + t * (TRK.hi - TRK.lo);
}
function levelTrack() {
  /* always drawn, always LIVE (2026-08-29 review: the Bayesian lock
   * is gone — levels drag in every source). */
  var ink = '#52514e';
  var xa = trkX(logit(state.a / 100));
  var xc = trkX(logit(state.c / 100));
  return '<g id="lvltrack">'
    + '<line x1="' + TRK.x0 + '" y1="' + TRK.y + '" x2="' + TRK.x1
    + '" y2="' + TRK.y + '" stroke="#cfc5ac" stroke-width="2"/>'
    + '<text x="' + (TRK.x0 - 6) + '" y="' + (TRK.y + 4)
    + '" text-anchor="end" font-size="' + FT + '" fill="#8b8477">levels'
    + '</text>'
    + '<circle data-handle="c" class="handle" cx="' + xc + '" cy="'
    + TRK.y + '" r="' + (NARROW ? 15 : 9) + '" fill="transparent"/>'
    + '<circle class="knob" data-knob="c" pointer-events="none" cx="' + xc
    + '" cy="' + TRK.y + '" r="5" fill="#fcfaf3" stroke="' + ink
    + '" stroke-width="1.6"/>' + (held('c') ? heldRing('c', xc, ink) : '')
    + '<text x="' + xc + '" y="' + (TRK.y - 6)
    + '" text-anchor="middle" font-size="' + FT + '" fill="' + ink + '">y '
    + state.c + '%</text>'
    + (isCap()
      ? '<text x="' + (TRK.x0 + 6) + '" y="' + (TRK.y + 16) + '" font-size="' + FT + '" fill="#8b8477">no horizontal level (the Capability view is level-free)</text>'
      : '<circle data-handle="a" class="handle" cx="' + xa + '" cy="'
    + TRK.y + '" r="' + (NARROW ? 15 : 9) + '" fill="transparent"/>'
    + '<circle class="knob" data-knob="a" pointer-events="none" cx="' + xa
    + '" cy="' + TRK.y + '" r="5" fill="' + ink + '"/>' + (held('a') ? heldRing('a', xa, ink) : '')
    + '<text x="' + xa + '" y="' + (TRK.y + 16)
    + '" text-anchor="middle" font-size="' + FT + '" fill="' + ink + '">x '
    + state.a + '%</text>') + '</g>';
}
/* the level track lives in its own PERSISTENT group: built once,
 * positions updated in place — element identity survives re-renders
 * (real pointers, and any gate holding element references, keep a
 * live target mid-drag). Track child order: line, "levels" label,
 * cHit, cKnob, cText, aHit, aKnob, aText. */
function updateTrack() {
  var tg = document.getElementById('trackg');
  tg.style.display = '';
  var structure = state.hold + '|' + state.xdef + '|' + (NARROW ? 'n' : 'w');   // held rings / x handle presence / layout class
  if (!tg.hasChildNodes() || tg.dataset.structure !== structure) {
    tg.innerHTML = levelTrack();
    tg.dataset.structure = structure;
    return;
  }
  var xa = trkX(logit(state.a / 100));
  var xc = trkX(logit(state.c / 100));
  tg.querySelectorAll('[data-handle], [data-knob], [data-ring]').forEach(function (el) {
    var key = el.dataset.handle || el.dataset.knob || el.dataset.ring;
    el.setAttribute('cx', key === 'a' ? xa : xc);
  });
  tg.querySelectorAll('text').forEach(function (t) {
    var txt = t.textContent;
    if (txt.charAt(0) === 'y' && txt.indexOf('%') > 0) {
      t.setAttribute('x', xc); t.textContent = 'y ' + state.c + '%';
    } else if (txt.charAt(0) === 'x' && txt.indexOf('%') > 0) {
      t.setAttribute('x', xa); t.textContent = 'x ' + state.a + '%';
    }
  });
}


function renderScatter() {
  if (!PANEL) { foldSweepTools(); phoneFold(); }
  if (playBtn && !PANEL) { playBtn.disabled = false; playBtn.title = ''; }
  layout();
  var chart = PANEL ? PANEL.svg : document.getElementById('chart');
  chart.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  var la = logit(state.a / 100), lc = logit(state.c / 100);
  var out = axisGrid();
  var clipAt = out.length; EXT = null;   // export: everything after the grid and tick labels is clipped to the plot box; the drawn extent restarts
  // y = x guide through data space (holds under any scale combo); under the export's per-axis limits it runs where both axes show it
  var dg = '', GX = LIMX || LIM, GY = LIMY || LIM, G0 = Math.max(GX[0], GY[0]), G1 = Math.min(GX[1], GY[1]);
  // the export's zoomed view carries no guide (the project maintainers' word of 28 Sep: the zoomed view keeps equal scale only, no diagonal through the figure); the page's plane keeps it
  var zoomedExport = EXPORTING && LIMX && LIMY;
  for (var t = 0; t <= 40 && G1 > G0 && !zoomedExport; t++) {
    var z = G0 + (G1 - G0) * t / 40;
    dg += (t ? 'L' : 'M') + sx(z).toFixed(1) + ' ' + sy(z).toFixed(1);
  }
  if (dg) out += '<path d="' + dg + '" fill="none" stroke="#cfc5ac" '
    + 'stroke-width="0.8" stroke-dasharray="3.3 2.7"/>';

  var visible = Array.from(sel).filter(function (i) { return !isHidden(i); }).sort(function (a, b) { return a - b; });   // partial arms hidden unless shown

  // constant-K trails: the arm's locus of crossing pairs holding
  // K = (x level)/(y level) fixed while the pair sweeps — the sweep
  // tool's arcs from the SAME per-level tables the dots read. Only
  // defined point-pairs are drawn; the path BREAKS at censored
  // levels (bounds are never interpolated through).
  if (state.kp === 'on' && !isCap()) {
    var K = state.a / state.c;
    var tgrid = state.src === 'bayes' ? D.bay.lev_logit
                                      : D.avg.lev_grid;
    var trails = '';
    visible.forEach(function (i) {
      var cc = D.shared.configs[i];
      var tp = '', pen = false;
      for (var ti = 0; ti < tgrid.length; ti += 2) {
        var pxl = pct(tgrid[ti]);            // x level in percent
        var pyl = pxl / K;                   // constant-ratio partner
        if (pyl < 0.2 || pyl > 99.5 || pxl < 0.2 || pxl > 99.5) {
          pen = false; continue;
        }
        var tx = reading(i, logit(pxl / 100), 'x');
        var ty = reading(i, logit(pyl / 100), 'y');
        if (tx.kind !== 'point' || ty.kind !== 'point'
            || tx.z == null || ty.z == null) { pen = false; continue; }
        tp += (pen ? 'L' : 'M') + sx(clampZ(tx.z)).toFixed(1) + ' '
            + sy(clampZ(ty.z)).toFixed(1);
        pen = true;
      }
      if (tp)
        trails += '<path d="' + tp + '" fill="none" stroke="'
          + cc.color + '" stroke-width="0.9" opacity="0.3" '
          + 'data-chain-val data-trail="' + i + '"/>';
    });
    out += '<g id="ktrails">' + trails + '</g>';
  }
  // K-LADDER trails (the /sweep fold): from the current x level a, the
  // vertical locus each dot walks as the fold K runs 1x..K_MAX (y level
  // a/K); rungs at the preset folds; breaks at censored levels.
  if (state.lad === 'on' && !isCap()) {
    var lads = '', LN = 26;
    visible.forEach(function (i) {
      var cc2 = D.shared.configs[i];
      var rx0 = reading(i, la, 'x');
      if (rx0.kind !== 'point' || rx0.z == null) return;
      var X0 = sx(clampZ(rx0.z));
      var lp = '', pen = false;
      for (var li = 0; li < LN; li++) {
        var kk = Math.pow(2, li / (LN - 1) * Math.log2(K_LADDER_MAX));   // the drawn ladder spans 1x..50x (a drawing range, not a cap on the levels)
        var pyl = state.a / kk;
        if (pyl < 0.2) break;
        var ry0 = reading(i, logit(pyl / 100), 'y');
        if (ry0.kind !== 'point' || ry0.z == null) { pen = false; continue; }
        lp += (pen ? 'L' : 'M') + X0.toFixed(1) + ' '
            + sy(clampZ(ry0.z)).toFixed(1);
        pen = true;
      }
      var rungs = '';
      K_CHIPS.forEach(function (kk) {
        var pyl = state.a / kk;
        if (pyl < 0.2) return;
        var ry1 = reading(i, logit(pyl / 100), 'y');
        if (ry1.kind !== 'point' || ry1.z == null) return;
        var Y1 = sy(clampZ(ry1.z));
        rungs += 'M' + (X0 - 3).toFixed(1) + ' ' + Y1.toFixed(1)
               + 'L' + (X0 + 3).toFixed(1) + ' ' + Y1.toFixed(1);
      });
      if (lp)
        lads += '<path d="' + lp + rungs + '" fill="none" stroke="'
          + cc2.color + '" stroke-width="0.9" opacity="0.35" '
          + 'stroke-dasharray="1.5 2" data-chain-val data-ladder="' + i
          + '"/>';
    });
    out += '<g id="ladders">' + lads + '</g>';
  }

  var fx = [], fy = [], fsig = [], fl = [], fcol = [], marks = ''; undrawn = []; beyondFrame = 0; beyondArms = []; partialShownN = 0;
  var moves = '', moveN = 0; D.moves = {};   // fit-move arrows (previous fit -> this fit), drawn under the marks
  visible.forEach(function (i) {
    var c = D.shared.configs[i];
    var part = isPartial(i), col = part ? '#8b8477' : c.color;   // a partial arm shown on request is grey and marked (the project maintainers 2026-09-07)
    var rx = reading(i, la, 'x'), ry = reading(i, lc, 'y');
    if (rx.z == null || ry.z == null) { undrawn.push(c.label + ' (' + ((rx.z == null ? rx.extra : ry.extra) || 'no ' + (state.def === 'average' ? 'average-rate' : 'median-task') + ' crossing at this pair: the level lies outside this model\u2019s observed range') + ')'); return; }
    if (rx.z > LIM[1] || rx.z < LIM[0]) { rx = Object.assign({}, rx, { kind: rx.z > LIM[1] ? 'hi-bound' : 'lo-bound', beyond: true }); }   // beyond the frame: drawn at the edge as an open bound (the reference designer 2026-09-06)
    if (ry.z > LIM[1] || ry.z < LIM[0]) { ry = Object.assign({}, ry, { kind: ry.z > LIM[1] ? 'hi-bound' : 'lo-bound', beyond: true }); }
    if (rx.beyond || ry.beyond) { beyondFrame++; beyondArms.push(i); return; }   // beyond the frame: not drawn (never clamped at the edge), named in the legend line and the readout; chip greyed
    if (part) partialShownN++;
    var X = sx(clampZ(rx.z)), Y = sy(clampZ(ry.z));
    extAdd(clampZ(rx.z), clampZ(ry.z));
    var full = rx.kind === 'point' && ry.kind === 'point';
    if (full && state.src === 'bayes' && state.move === 'on' && D.bayPrev && !isCap() && D.bayPrevById[c.id]) {   // one arrow per arm present in both fits
      var pr = D.bayPrevById[c.id], px = readBayesRow(pr, la, D.bayPrev), py = readBayesRow(pr, lc, D.bayPrev);
      if (px.kind === 'point' && py.kind === 'point' && px.z >= LIM[0] && px.z <= LIM[1] && py.z >= LIM[0] && py.z <= LIM[1]) {
        var PX = sx(px.z), PY = sy(py.z), ddx = X - PX, ddy = Y - PY, len = Math.sqrt(ddx * ddx + ddy * ddy);
        var pctOf = function (z) { return 100 / (1 + Math.exp(-z)); }, sg = function (v) { return (v > 0 ? '+' : '') + v.toFixed(1); };
        D.moves[c.id] = { dx: sg(pctOf(rx.z) - pctOf(px.z)), dy: sg(pctOf(ry.z) - pctOf(py.z)) };
        if (len >= 3) {
          extAdd(px.z, py.z);
          var ux = ddx / len, uy = ddy / len, hx = X - ux * (DR + 1), hy = Y - uy * (DR + 1);   // the head stops at the dot's rim
          moves += '<line x1="' + PX.toFixed(1) + '" y1="' + PY.toFixed(1) + '" x2="' + (hx - ux * 5).toFixed(1) + '" y2="' + (hy - uy * 5).toFixed(1) + '" stroke="' + col + '" stroke-width="1.2" opacity="0.6" data-move data-i="' + i + '"/>'
            + '<path d="M' + hx.toFixed(1) + ' ' + hy.toFixed(1) + 'L' + (hx - ux * 7 + uy * 3.2).toFixed(1) + ' ' + (hy - uy * 7 - ux * 3.2).toFixed(1) + 'L' + (hx - ux * 7 - uy * 3.2).toFixed(1) + ' ' + (hy - uy * 7 + ux * 3.2).toFixed(1) + 'Z" fill="' + col + '" opacity="0.6" data-move/>';
          moveN++;
        }
      }
    }
    var fade = full ? 1 : 0.4;
    var flg = armFlag(i);
    if (flg) fade = 0.3;   // spec 2026-09-02a (iii): non-quotable position
    if (c.gates_failed) fade = Math.min(fade, 0.55);   // a fit that failed a sampler gate: drawn with its flag (the glyph beside the mark, the sentence on hover), never plain (Definitions, 22 Sep)
    if (part) fade = Math.min(fade, 0.45);
    var standIn = false, fitEx = false;   // the project maintainers 2026-09-03: no stand-ins, no greyed excluded arms — an arm is drawn from its own estimate or absent
    var d = '', openMarks = '';
    if (state.w === 'on') {
      if (rx.lo != null && rx.hi != null) { extAdd(clampZ(rx.lo), null); extAdd(clampZ(rx.hi), null); }
      if (ry.lo != null && ry.hi != null) { extAdd(null, clampZ(ry.lo)); extAdd(null, clampZ(ry.hi)); }
      if (rx.lo != null && rx.hi != null)
        d += 'M' + sx(clampZ(rx.lo)).toFixed(1) + ' ' + Y.toFixed(1)
           + 'L' + sx(clampZ(rx.hi)).toFixed(1) + ' ' + Y.toFixed(1);
      if (ry.lo != null && ry.hi != null)
        d += 'M' + X.toFixed(1) + ' ' + sy(clampZ(ry.lo)).toFixed(1)
           + 'L' + X.toFixed(1) + ' ' + sy(clampZ(ry.hi)).toFixed(1);
      // decision (2026-08-29): a credible-band end that reaches the
      // censored edge is an OPEN-ENDED bound — open triangle at the
      // whisker end pointing toward the uncertain side
      if (rx.hi_open && rx.hi != null)
        openMarks += '<path d="M' + sx(clampZ(rx.hi)).toFixed(1) + ' '
          + Y.toFixed(1) + 'm4 0l-7 4l0 -8Z" fill="none" stroke="'
          + col + '" stroke-width="1.1"/>';
      if (ry.hi_open && ry.hi != null)
        openMarks += '<path d="M' + X.toFixed(1) + ' '
          + sy(clampZ(ry.hi)).toFixed(1)
          + 'm0 -4l4 7l-8 0Z" fill="none" stroke="'
          + col + '" stroke-width="1.1"/>';
      if (rx.lo_open && rx.lo != null)
        openMarks += '<path d="M' + sx(clampZ(rx.lo)).toFixed(1) + ' '
          + Y.toFixed(1) + 'm-4 0l7 4l0 -8Z" fill="none" stroke="'
          + col + '" stroke-width="1.1"/>';
      if (ry.lo_open && ry.lo != null)
        openMarks += '<path d="M' + X.toFixed(1) + ' '
          + sy(clampZ(ry.lo)).toFixed(1)
          + 'm0 4l4 -7l-8 0Z" fill="none" stroke="'
          + col + '" stroke-width="1.1"/>';
    }
    // the dot as a PATH (gauntlet compares d attributes): a circle
    // subpath when measured; a directional open triangle when a
    // coordinate is a bound (pointing toward the uncertain side)
    var Xs = X.toFixed(1), Ys = Y.toFixed(1), mark;
    if (full || rx.kind === 'censored-partial'
        || ry.kind === 'censored-partial') {
      var shp = markShape(i);
      mark = '<path d="' + markPath(shp, X, Y, DR) + '" fill="'
        + (c.think ? '#fcfaf3' : col) + '" stroke="'
        + (c.think ? col : '#fcfaf3')
        + '" stroke-width="1.3" data-mark data-chain-val data-shape="' + shp + '"' + (c.run ? ' data-run="' + String(c.series || '').replace(/[^a-z0-9._-]/gi, '') + '" data-arm="' + String(c.id).replace(/[^a-z0-9._\/-]/gi, '') + '"' : '') + ' data-i="' + i + '"' + (c.provisional ? ' stroke-dasharray="3 2" data-provisional="1"' : '') + '/>'
        + (flg ? '<circle cx="' + X + '" cy="' + Y + '" r="7" fill="none" '
            + 'stroke="#b3261e" stroke-dasharray="2 2" stroke-width="1.2" '
            + 'data-flag/>' : '')
;
    } else {
      var pt = ry.kind === 'hi-bound'
          ? 'm0 -6l5 10l-10 0Z'
        : ry.kind === 'lo-bound' ? 'm0 6l5 -10l-10 0Z'
        : rx.kind === 'hi-bound' ? 'm6 0l-10 5l0 -10Z'
                                 : 'm-6 0l10 5l0 -10Z';
      mark = '<path d="M' + Xs + ' ' + Ys + pt
        + '" fill="none" stroke="' + col
        + '" stroke-width="1.4" data-mark data-chain-val data-shape="bound"' + (c.run ? ' data-run="' + String(c.series || '').replace(/[^a-z0-9._-]/gi, '') + '" data-arm="' + String(c.id).replace(/[^a-z0-9._\/-]/gi, '') + '"' : '') + ' data-i="' + i + '"' + (c.provisional ? ' stroke-dasharray="3 2" data-provisional="1"' : '') + '/>';
    }
    mark += (standIn ? '<circle cx="' + X + '" cy="' + Y + '" r="8" fill="none" stroke="#8b8477" stroke-dasharray="3 2" stroke-width="1.1" data-standin/>' : '')
      + (fitEx ? '<circle cx="' + X + '" cy="' + Y + '" r="9" fill="none" stroke="#8b8477" stroke-dasharray="1.5 2.5" stroke-width="1.2" data-fitexcluded/>' : '');   // on every mark shape
    marks += '<g opacity="' + fade + '" data-i="' + i + '">'
      + '<circle class="hit" data-export="omit" cx="' + Xs + '" cy="' + Ys + '" r="' + (NARROW ? 15 : 9) + '" fill="transparent" stroke="none"/>'
      + (d ? '<path d="' + d + '" fill="none" stroke="' + col
      + '" stroke-width="1.1" opacity="0.55" data-chain-val/>' : '')
      + openMarks + mark + '</g>';
    if (full && !fitEx && !part && !isRun(i)) {   // the run's checkpoints are drawn but never fitted (placed on the scale without a vote)   // the drawn-slope fit is over the FIT POPULATION only (partial arms stay out even when shown)
      fx.push(FX(rx.z)); fy.push(FY(ry.z)); fl.push(c.label); fcol.push(col);   // in the fit's coordinates (the axes as set, or difficulty steps)
      // per-dot measurement sigma per axis from the drawn whiskers:
      // larger finite half-width / z of the whisker's own level
      // (80% credible under bayes / capC ci80 -> 1.2816; 95% otherwise)
      var zx = (state.src === 'bayes' || isCap()) ? 1.2816 : 1.96;
      var zy = state.src === 'bayes' ? 1.2816 : 1.96;
      var hwx = Math.max(rx.lo != null ? Math.abs(FX(rx.z) - FX(rx.lo)) : -1,
                         rx.hi != null ? Math.abs(FX(rx.hi) - FX(rx.z)) : -1);
      var hwy = Math.max(ry.lo != null ? Math.abs(FY(ry.z) - FY(ry.lo)) : -1,
                         ry.hi != null ? Math.abs(FY(ry.hi) - FY(ry.z)) : -1);
      fsig.push(hwx >= 0 && hwy >= 0 ? [hwx / zx, hwy / zy] : null);
    }
  });

  // fit over fully-measured dots (the approved model-point fit)
  var fitTxt = 'fit: needs 3+ ' + (state.src === 'bayes'
    ? 'in-range posterior dots' : 'fully measured dots');
  var sweeping = dragActive || !!playTimer;
  var headFit = null, headN = 0;
  if (fx.length >= 3) {
    var fkey = [state.def, state.src, state.wd, state.xdef, state.fitci, state.line, state.xs, state.ys, state.lw,
                state.a, state.c, D.dsId, Array.from(sel).join('.')].join('|');
    // honest mode: only dots with a usable width on BOTH axes enter
    // (a dot censored on both sides of an axis has no measurement
    // sigma — dropped and counted, per the /sweep rule)
    var hx = fx, hy = fy, hsig = null, hl = fl, hc = fcol, dropped = 0;
    if (state.fitci === 'honest' || state.lw === 'bands') {   // both need a usable width on both axes
      hx = []; hy = []; hsig = []; hl = []; hc = [];
      for (var qi = 0; qi < fx.length; qi++) {
        if (fsig[qi]) { hx.push(fx[qi]); hy.push(fy[qi]); hsig.push(fsig[qi]); hl.push(fl[qi]); hc.push(fcol[qi]); }
        else dropped++;
      }
    }
    // during an active drag/sweep the 200-resample fit is NOT
    // recomputed (the review's lag) — cached fits still draw, and
    // the settle render on release computes the final one
    var mgF = inAxes() && state.xs === 'raw' ? 0.03 : 0.15;
    var f = (sweeping && !fitCache[fkey]) || hx.length < 3 ? null
            : state.lw === 'bands' ? (fitCache[fkey] || (fitCache[fkey] = yorkFit(hx, hy, hsig, state.fitci === 'honest' ? 80 : 95, mgF)))
            : bootFit(hx, hy, fkey, hsig, mgF);
    var RS = f ? residStats(f, hx, hy, hl) : null;
    if (!f && sweeping)
      fitTxt = 'fit: paused while the levels move — recomputes when they stop';
    if (f) {
      var mgx = inAxes() && state.xs === 'raw' ? 0.03 : 0.15;
      var gx = [Math.min.apply(null, hx) - mgx, Math.max.apply(null, hx) + mgx];
      if (state.line !== 'off') {   // Off: the points alone (the project maintainers )
      // the fit's BAND: pointwise envelope of the bootstrap lines
      var bp = '';
      for (var bi = 0; bi < f.band.xs.length; bi++)
        bp += (bi ? 'L' : 'M') + pxF(f.band.xs[bi]).toFixed(1) + ' '
            + pyF(f.band.up[bi]).toFixed(1);
      for (var bj = f.band.xs.length - 1; bj >= 0; bj--)
        bp += 'L' + pxF(f.band.xs[bj]).toFixed(1) + ' '
            + pyF(f.band.dn[bj]).toFixed(1);
      out += '<path d="' + bp + 'Z" fill="'
        + (state.fitci === 'honest' ? '#d9c8a8' : '#cfc5ac')
        + '" opacity="0.35" stroke="none" data-chain-val="def src xdef fitci" '
        + 'data-fitband/>';
      var fp = '';
      for (var t2 = 0; t2 <= 24; t2++) {
        var zx2 = gx[0] + (gx[1] - gx[0]) * t2 / 24;
        fp += (t2 ? 'L' : 'M') + pxF(zx2).toFixed(1) + ' '
            + pyF(f.a + f.b * zx2).toFixed(1);
      }
      out += '<path d="' + fp + '" fill="none" stroke="#8b8477" '
        + 'stroke-width="1.1" data-chain-val data-fitline/>';
      }
      var droppedTxt = dropped ? '; ' + dropped + ' dot' + (dropped > 1 ? 's' : '') + ' dropped (no usable whisker width)' : '';
      var modeTxt = state.lw === 'bands' ? 'weighted by the dots\u2019 80% uncertainty bands on both axes (tighter counts more; the default line is the unweighted one)' + (f.widen > 1.05 ? '; interval widened ' + f.widen.toFixed(1) + '\u00d7 for scatter beyond the uncertainty bands' : '') + droppedTxt
                  : state.fitci === 'honest' ? 'with each dot\u2019s measurement error' + droppedTxt : 'dots taken as exact';
      var spaceTxt = inAxes() ? 'in the axes as set' : (state.xs === 'raw' || state.ys === 'raw') ? 'in logit (drawn as the curve it maps to on the linear axis)' : 'in logit';
      // few words on the linear fit (the project maintainers 2026-09-15 12:1x): slope, range, R; the misses only with the Misses switch on
      fitTxt = 'line ' + spaceTxt + ' over ' + hx.length + (state.src === 'bayes' ? ' in-range posterior-median dots' : ' fully measured dots') + ': slope ' + f.b.toFixed(2) + ' [' + f.lo.toFixed(2) + ', ' + f.hi.toFixed(2) + '], R ' + f.r.toFixed(2) + '; ' + modeTxt
        + (inAxes() ? '; intercept ' + fmtY(f.a) : '')
        + (state.resid === 'on' ? '; misses: typical ' + RS.rmsPct.toFixed(1) + '% of the y scale, largest ' + sgn(RS.bigPct) + '% (' + RS.bigLabel + '), ' + RS.w5 + ' of ' + RS.n + ' models within \u00b15%, ' + RS.w10 + ' within \u00b110%' : '')
        + (state.line === 'off' ? ' (not drawn: Fitted line is Off)' : '');
      headFit = f; headN = hx.length;
    }
  }
  if (!PANEL) { headline(headN, headFit, fx.length, sweeping); fitCaption(headFit, headN); }
  // FIT PANEL (the project maintainers 2026-09-04: the fit quality is shown as part of the chart, in the same place every time, never a
  // sentence inside prose): a fixed box at the plot's top-left — slope with its interval, R with the arm count, the uncertainty band's meaning
  var pfs = NARROW ? 15 : Math.round(14 * Math.max(1, UPX)), pfs2 = NARROW ? 12 : Math.round(12 * Math.max(1, UPX)), plx = ML + 8, ply = MT + 8;   // the slope line is the largest type in the chart (the reference designer's read 09-04)
  if (!PANEL) refreshBeyondChips();
  var drawnN = visible.length - undrawn.length - beyondArms.length, totalN = D.shared.configs.length;
  // the label names the fit's space whenever it differs from the axes' display (the project maintainers  14 Sep: are the line's quantities computed honestly across spacings)
  // PANEL (the project maintainers' word of 15 Sep 2026 12:1x: fewer words on the linear fit — the slope, its range and R, the
  // capital letter, nothing more): three short lines — the slope, its range, R (the correlation coefficient)
  // ONE LINE (the project maintainers, 2026-09-15 13:2x: one line — slope x [y, z] and R: a — instead of three): the project maintainers' shape, an em space
  // as the one gap, tabular figures, two decimals everywhere, the same on every view
  var pl1 = f ? 'slope ' + f.b.toFixed(2) + ' [' + f.lo.toFixed(2) + ', ' + f.hi.toFixed(2) + ']\u2003R: ' + f.r.toFixed(2) : (sweeping ? 'fit paused while the levels move' : NARROW ? 'no fit: under 3 fully measured models' : 'no fit: fewer than three fully measured models');
  var pl2 = f ? '' : (drawnN + ' of ' + totalN + ' models drawn');
  var pl3 = '';
  var plw = Math.max(pl1.length * pfs, pl2.length * pfs2, pl3.length * pfs2) * 0.56 + 18, plh = (pfs + 6) + ((pl2 || pl3) ? (pl3 ? 2 : 1) * (pfs2 + 4) : 0) + 8;
  var plMax = W - MR - plx - 4; if (plw > plMax) { var shrink = plMax / plw; pfs = Math.max(Math.ceil(11 * UPX), Math.floor(pfs * shrink)); pfs2 = Math.max(Math.ceil(11 * UPX), Math.floor(pfs2 * shrink)); plw = plMax; plh = (pfs + 6) + ((pl2 || pl3) ? (pl3 ? 2 : 1) * (pfs2 + 4) : 0) + 8; }
  out += (true ? '' : '<g id="fitpanel" data-critical-text data-export="omit" data-chain-val="def src xdef fitci line xs ys s l sel" pointer-events="none">'   // FIGURES CARRY NO NOTES (the project maintainers' word of 23 Sep 17:1x): the fit box leaves the plane; its words stand in the headline (slope, its interval, R) and the frame line (the counts)
    + '<rect x="' + plx + '" y="' + ply + '" width="' + plw.toFixed(0) + '" height="' + plh + '" rx="6" fill="#fcfaf3" fill-opacity="0.94" stroke="#d9d2c2"/>'
    + '<text x="' + (plx + 9) + '" y="' + (ply + pfs + 4) + '" font-size="' + pfs + '" fill="#1f1e1b" font-weight="600" style="font-variant-numeric:tabular-nums">' + pl1 + '</text>'
    + (pl2 ? '<text x="' + (plx + 9) + '" y="' + (ply + pfs + pfs2 + 9) + '" font-size="' + pfs2 + '" fill="#52514e" style="font-variant-numeric:tabular-nums">' + pl2 + '</text>' : '')
    + (pl3 ? '<text x="' + (plx + 9) + '" y="' + (ply + pfs + 2 * pfs2 + 14) + '" font-size="' + pfs2 + '" fill="#52514e">' + pl3 + '</text>' : '')
    + '</g>')
    // 1 Oct 2026 (the project maintainers' word of 12:1x UK): no running text on the figure for hidden partial models — the partial control states it
    + (f && RS && state.resid === 'on' && state.line !== 'off' ? residPanel(RS, hc, plx, ply + plh + 6) : '')
    // 1 Oct 2026 (the project maintainers' word of 12:1x UK): no 'not drawn' text on the figure — the chip of an arm beyond the frame greys with the reason in its hover (refreshBeyondChips), the indicator
  // per-key chain scope (the reference designer's kit, 2026-08-28): the titles
  // must change under def swaps (estimand word) AND src swaps
  // (source parenthetical), and are exempt from other keys' runs
  if (EXPORTING) out = out.slice(0, clipAt) + '<clipPath id="expclip"><rect x="' + ML + '" y="' + MT + '" width="' + PW + '" height="' + PH + '"/></clipPath>'
    + '<g clip-path="url(#expclip)">' + out.slice(clipAt) + '</g>';   // the export's tight limits: trails, ladders, the band and the line stop at the plot box
  // the titles are the project maintainers' names, bare (the project maintainers' word of 18 Sep 13:0x: the axis titles read D50 and D99 alone — the percent numbers on the
  // ticks say the unit and the spacing shows itself): no unit word, no spacing word, on every width
  var tyx = EXPORTING ? 20 : NARROW ? 11 : 15, tfs = EXPORTING ? EXPORT_TITLE_PX : NARROW ? 13 : Math.max(FS + 1, Math.ceil(13 * UPX));   // the titles render at 13 px or more, never under the tick type (the project maintainers 13:2x 18 Sep); twice that in the export (13:5x)
  out += '<text x="' + (ML + PW / 2) + '" y="' + (H - 6)
    + '" text-anchor="middle" fill="#52514e" font-size="' + tfs + '" data-role="axis-title" '
    + 'data-chain-val="def src">' + fitTitle(axisShort('x'), W - 20, tfs) + '</text>'
    + '<text x="' + tyx + '" y="' + (MT + PH / 2) + '" text-anchor="middle" '
    + 'fill="#52514e" font-size="' + tfs + '" transform="rotate(-90 ' + tyx + ' '
    + (MT + PH / 2) + ')" data-role="axis-title" data-chain-val="def src">' + axisShort('y') + '</text>';
  if (moveN) out += '<text x="' + (ML + 8) + '" y="' + (MT + PH - 8) + '" font-size="' + (NARROW ? 12 : 11) + '" fill="#52514e" data-chain-val="src move">arrows: moves from ' + prevFitName() + '</text>';
  var pid = PANEL ? '-p' + PANEL.idx : '';   // a panel's groups carry its index: several planes in one document, every id once
  var body = (moveN ? '<g id="moves' + pid + '">' + moves + '</g>' : '') + '<g id="marks' + pid + '">' + marks + '</g>';
  if (PANEL) { out += '<text x="' + (ML + PW - 4) + '" y="' + (MT + 11) + '" text-anchor="end" font-size="' + FT + '" fill="#52514e" data-count>n = ' + drawnN + '</text>'; PANEL.drawn = drawnN; }   // the quiet count
  (PANEL ? PANEL.g : document.getElementById('plotg')).innerHTML = out + (EXPORTING ? '<g clip-path="url(#expclip)">' + body + '</g>' : body);
  if (PANEL) return;   // the page's text blocks, track, chips and readouts are the single figure's
  (function () { var fp = document.getElementById('fitpanel'); if (fp) fp.remove(); })();   // the structure maintainers' slots (24 Sep): one caption sentence per figure — the headline carries the line's slope and R; no fit words under the plot
  updateTrack();

  // while the levels move, every text block whose wrapping depends on the numbers keeps its height
  // (phone: the readout re-wrapped as levels changed and moved the chart and everything below by ~40 px)
  if (!EXPORTING && !NO_RATCHET) ['headline', 'narrate', 'notes', 'fitline', 'kBound', 'vocabnote', 'framebar'].forEach(function (id) {   // the export redraw leaves the page's text blocks untouched (the ratchet grew #narrate by 3 px under it — the reference designer's read 18 Sep)
    var el = document.getElementById(id); if (!el) return;
    if (sweeping) { if (!el.style.height) { el.style.height = el.offsetHeight + 'px'; el.style.overflow = 'hidden'; } }
    else {
      el.style.height = ''; el.style.overflow = '';
      // RATCHET: a level-dependent block may grow once but never shrinks back (a shrink at settle scrolled the page 9 px on the
      // pool set at 390, where the readout runs longer than the board's reserves) — the min-height follows the largest height seen
      var h = el.offsetHeight; if (h > (el._ratchet || 0)) { el._ratchet = h; el.style.minHeight = h + 'px'; }
    }
  });
  var fitEl = document.getElementById('fitline') || document.createElement('div');   // no prose mount on the page (24 Sep): the words are composed for the export and the maintainer files only
  fitEl.innerHTML =
    '<span data-chain-val="def src xdef">' + fitTxt + '</span>'
    + ' <span style="color:#8b8477">· open triangles point toward '
    + 'the uncertain side (a bound, not a measurement); faded = at '
    + 'least one coordinate is a bound</span>';
  narrate(visible, fx.length);
  vocabNote();
  notes();
  stamp();
  paintChips();
  var k = state.a / state.c;
  // fixed-format, fixed-width readout: layout must not reflow as the
  // number's width changes mid-drag (2026-08-31 review: the K text
  // hopping lines made the whole page shake during x drags)
  document.getElementById('kOut').textContent =
    isCap() ? 'K n/a (the Capability view is level-free)'
      : 'K = ' + (k >= 100 ? k.toFixed(0) : k.toFixed(1));
  var kb = document.getElementById('kBound');
  var slotNotes = [inputNote, lockNote].filter(Boolean).join(' \u00b7 ');
  if (kb) kb.textContent = slotNotes ? slotNotes : isCap() ? ''
    : Math.abs(k - 1) <= 1e-6 ? 'K at 1\u00d7: the levels coincide' : k < 1 ? 'K below 1\u00d7: the horizontal level lies under the vertical level' : '';   // K is derived and uncapped; nothing follows (the project maintainers 2026-09-09)
}


/* ---------------- export: the plot as drawn, tightened to the data shown, with a legend (project helper kit-export.js) ---- */
var exportMounted = false;
function mountExport() {   // once: the reference control under the chart; the factory runs at click time so the current view is exported
  if (exportMounted) return;
  var box = document.getElementById('exportrow'); if (!box || !window.Kit || !Kit.exportButton) return;
  exportMounted = true;
  Kit.exportButton(box, exportOptions);
}
function exportView() {   // the controls' state in words for the export's stamp line
  var ds = DATASETS[state.data] || {}, parts = [ds.label || String(state.data || '')];
  parts.push(axisShort('y') + ' against ' + axisShort('x'));
  var sp = function (v) { return v === 'raw' ? 'linear' : 'logit'; };
  parts.push(state.xs === state.ys ? sp(state.xs) + ' axes' : 'horizontal ' + sp(state.xs) + ', vertical ' + sp(state.ys));
  // no estimator or method words in a shared image (the project maintainers' standing words, read 23 Sep 15:1x): the estimator's name lives on the page's switch
  return parts.join(' \u00b7 ');
}
function exportLegend() {   // every drawn model grouped by family in the colour scheme's order, within a family by size (the project maintainers 13:1x 18 Sep), its mark exactly as drawn
  var rows = [];
  famOrder(Array.from(sel).filter(function (i) { return !isHidden(i); })).forEach(function (i) {   // one row per drawn model by its name of record, a run's checkpoints like every other model (the project maintainers' word of 23 Sep 15:0x: no grouped run row, no fit-quality note in the export)
    var m = (PANEL && PANEL.svg ? PANEL.svg : document).querySelector('#marks' + (PANEL ? '-p' + PANEL.idx : '') + ' path[data-mark][data-i="' + i + '"]'); if (!m) return;   // not drawn: no crossing at this pair, or beyond the frame
    var c = D.shared.configs[i], grey = isPartial(i);
    var d = m.getAttribute('d') || '', fill = m.getAttribute('fill') || 'none', stroke = m.getAttribute('stroke') || c.color, sw = m.getAttribute('stroke-width') || '1.3';
    var op = m.parentNode && m.parentNode.getAttribute ? m.parentNode.getAttribute('opacity') : null;
    var mark = function (cx, cy) {   // the drawn path is an absolute M followed by relative commands: re-anchor it on the legend row
      return '<path d="' + d.replace(/^M[-\d.]+ [-\d.]+/, 'M' + cx + ' ' + cy) + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + sw + '"' + (op && +op < 1 ? ' opacity="' + op + '"' : '') + '/>';
    };
    rows.push({ label: ((c.run && c.shared_page_label) || c.display_name || c.label) + (grey ? ' (partial)' : '') + (c.provisional ? ' (provisional)' : ''), family: famLabel(c.fam), color: grey ? '#8b8477' : c.color, line: false, marker: mark });   // no fit-quality words in the export: the flag lives in the page's hover and tooltip   // legends carry the full display name of record (the labels rows' maintainers, 22 Sep)
  });
  // no grouped run row in the export (23 Sep 15:0x): each checkpoint drawn is its own row above
  return rows;
}
function exportOptions() {
  var chart = document.getElementById('chart'), f = D.shared.frame || {}, ds = DATASETS[state.data] || {};
  var tight = state.view !== 'ridges' && EXT && isFinite(EXT.x0) && isFinite(EXT.y0) && EXT.x1 > EXT.x0 && EXT.y1 > EXT.y0;
  EXPORT_TIER_Y = null; EXPORT_FLOOR_Y = null;
  if (tight) {   // the limits close on the drawn extent plus a small margin (2% of the span, at least 0.05 steps; the project maintainers 15:0x 18 Sep: tighter at both ends), never beyond the frame
    var padX = Math.max(0.05, (EXT.x1 - EXT.x0) * 0.02), padY = Math.max(0.05, (EXT.y1 - EXT.y0) * 0.02);
    LIMX = [Math.max(LIM[0], EXT.x0 - padX), Math.min(LIM[1], EXT.x1 + padX)];
    LIMY = [Math.max(LIM[0], EXT.y0 - padY), Math.min(LIM[1], EXT.y1 + padY)];
    // a logit axis continues down to the tick at or below its lowest drawn value, so no point sits without a tick below it ("0.1% on the graph as well, or 0.2%")
    // the floor tick (the project maintainers' word of 18 Sep: a tick at or below the lowest point) comes from the ladder the y axis prints: the coarsest of the reference set, the finer set and percent steps
    // that holds three ticks inside the window and reaches the floor within a quarter of the points' spread (at least 0.15 steps) — the zoomed view zooms tighter to the points shown (the project maintainers' word of 28 Sep)
    if (state.ys !== 'raw') {
      var lo = pct(LIMY[0]), hi = pct(LIMY[1]), tiers = [LOGIT_TICKS_EXPORT, LOGIT_TICKS_FINE, pctLadder(lo, hi)], pick = null, floor = null;
      for (var ti = 0; ti < tiers.length && !pick; ti++) {
        var isPct = ti === tiers.length - 1, tier = tiers[ti], n = tier.filter(function (v) { return v > lo && v < hi; }).length, fb = floorIn(tier, EXT.y0, isPct);
        var reach = fb ? EXT.y0 - fb.z : 0;   // a point under the ladder's lowest tick has nothing to extend to
        if ((n >= 3 && reach <= Math.max(0.15, 0.25 * (EXT.y1 - EXT.y0))) || isPct) { pick = tier; floor = fb; }
      }
      EXPORT_TIER_Y = pick;
      if (floor) { LIMY[0] = Math.max(LIM[0], Math.min(LIMY[0], floor.z - 0.06)); EXPORT_FLOOR_Y = floor.v; }
    }
    // the x axis keeps the tight margin only: snapping it to a tick re-opened the dead band left of the first point the project maintainers named on 18 Sep
    if (state.xs === state.ys) {   // equal scale: the plot's aspect follows the spans; kept between 1:2 and 2:1 by widening the shorter axis's limits inside the frame, never by unequal scales
      var rawB = state.xs === 'raw';
      var spanOf = function (B) { var L = rawB ? [Math.max(0, pct(B[0]) / 100 - 0.02), Math.min(1, pct(B[1]) / 100 + 0.02)] : B; return L[1] - L[0]; };
      var widenTo = function (B, want) {   // symmetric widening in logit, bisection on the delta (the span is monotone in it)
        var lo = 0, hi = LIM[1] - LIM[0];
        for (var k = 0; k < 40; k++) { var d = (lo + hi) / 2, C = [Math.max(LIM[0], B[0] - d), Math.min(LIM[1], B[1] + d)]; if (spanOf(C) < want) lo = d; else hi = d; }
        return [Math.max(LIM[0], B[0] - hi), Math.min(LIM[1], B[1] + hi)];
      };
      var sxp = spanOf(LIMX), syp = spanOf(LIMY);
      if (syp / sxp > 2) LIMX = widenTo(LIMX, syp / 2); else if (syp / sxp < 0.5) LIMY = widenTo(LIMY, sxp / 0.5);
    }
  }
  EXPORTING = true; render();
  var legend = state.view === 'ridges' ? [] : exportLegend();
  // the helper clones the chart synchronously in this same task; the page is drawn back before the browser paints (a microtask runs first)
  var restore = function () { EXPORTING = false; LIMX = null; LIMY = null; EXPORT_TIER_Y = null; EXPORT_FLOOR_Y = null; NO_RATCHET = true; try { render(); } finally { NO_RATCHET = false; } };   // the page's HTML is exactly as before the click
  if (window.queueMicrotask) queueMicrotask(restore); else Promise.resolve().then(restore);
  var parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  var pick = function (t) { return (parts.find(function (q) { return q.type === t; }) || {}).value || ''; };
  var slug = String(ds.label || state.data || 'view').split(' (')[0].replace(/\+/g, '-').replace(/[^\w-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return { svg: chart, legend: legend, title: '', page: '', view: exportView(),   // no page title and no page name in the exported figure: the axes, the points and the legend, with one muted line of the view's words and the data stamp (the project maintainers' word of 23 Sep 15:1x)
    stamp: (f.build_ts || f.runs_window) ? 'data as of ' + plainTs(f.build_ts || f.runs_window) : '', fileBase: 'capability-vs-reliability_' + slug + '_' + pick('year') + '-' + pick('month') + '-' + pick('day'), crop: null };   // the helper groups the rows by family in the reference order; the page's model row uses the same call (one order)
}


/* ---------------- hover ---------------- */
var tipPinned = false;
function hoverWire() {
  var box = document.getElementById('chartbox');
  function showFor(ev) {
    var g = ev.target.closest ? ev.target.closest('[data-i]') : null;
    if (!g || state.view !== 'scatter') { if (ev.type === 'pointerdown' || !tipPinned) { tipPinned = false; Kit.tooltip.hide(); } return; }
    if (ev.type === 'pointerdown' && ev.pointerType === 'touch') tipPinned = true;   // TAP = pinned readout (the phone rule)
    var psvg = g.closest ? g.closest('svg') : null;   // a mark in a panel of the composed page reads its own set's context
    if (psvg && psvg.dataset && psvg.dataset.p !== undefined && PANELS) { withPanel(PANELS[+psvg.dataset.p], function () { showBody(ev, g); }); return; }
    showBody(ev, g);
  }
  function showBody(ev, g) {
    var i = +g.dataset.i;
    var c = D.shared.configs[i];
    var la = logit(state.a / 100), lc = logit(state.c / 100);
    var rx = reading(i, la, 'x'), ry = reading(i, lc, 'y');
    function fmt(r) {
      if (r.z == null) return 'undefined';
      var v = fmtPct(r.z);
      if (r.kind === 'lo-bound') return '≤ ' + v;
      if (r.kind === 'hi-bound') return '≥ ' + v;
      var w = (r.lo != null && r.hi != null)
        ? ' [' + fmtPct(r.lo) + ', ' + fmtPct(r.hi) + ']' : '';
      return v + w;
    }
    var fl = armFlag(i), fe = D.shared.fit_excluded && D.shared.fit_excluded[c.id];
    var cf = D.bay && D.bay.disclosures && D.bay.disclosures.cut_flag && D.bay.disclosures.cut_flag[c.id];   // cut flag beside the arm (fit pointer gemma_cut_flag), never a failure claim
    Kit.tooltip.show(ev.clientX, ev.clientY, [
      { key: c.gates_failed ? '#b3261e' : c.color, value: fmt(rx), label: axisName('x') + (c.gates_failed ? ' \u00b7 flagged fit: ' + (c.gate_flag || 'the fit failed a sampler gate') : '') },
      { key: c.color, value: fmt(ry), label: axisName('y') },
      { key: null, value: '', label: rx.extra },
      { key: null, value: '', label: ry.extra === rx.extra ? '' : ry.extra },
    ].concat(D.moves && D.moves[c.id] ? [{ key: '#8b8477', value: 'moved', label: 'from ' + prevFitName() + ': x ' + D.moves[c.id].dx + ', y ' + D.moves[c.id].dy + ' (percent of the scale)' }] : []).concat(coverageText(c) ? [{ key: null, value: isPartial(i) ? 'partial' : '', label: coverageText(c) }] : []).concat(armNote(c) ? [{ key: '#8b8477', value: 'note', label: armNote(c) }] : []).concat(cf ? [{ key: '#8b8477', value: 'cut flag', label: cf }] : []).concat(fl ? [{ key: '#b3261e', value: '\u2020 non-quotable',
      label: fl.reason + ' \u2014 until ' + fl.until
        + ' (spec 2026-09-02a)' }] : []).concat(fe ? [{ key: '#8b8477', value: 'out of the fit population',
      label: (fe.short || 'protocol defect under correction') + (fe.reversible_when ? ' \u2014 reversible when ' + fe.reversible_when : '') + ' (Definitions decision 2026-09-03: drawn greyed, out of the drawn fit and the difficulty axis)' }] : []), c.label);
  }
  box.addEventListener('pointermove', showFor);
  box.addEventListener('pointerdown', showFor);
  box.addEventListener('pointerleave', function () { if (!tipPinned) Kit.tooltip.hide(); });
  document.addEventListener('pointerdown', function (ev) { if (tipPinned && !box.contains(ev.target)) { tipPinned = false; Kit.tooltip.hide(); } });
}
