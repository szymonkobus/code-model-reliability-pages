



'use strict';

var W = 860, H = 720, ML = 62, MR = 16, MT = 40, MB = 46;
var PW = W - ML - MR, PH = H - MT - MB;




var EXPORTING = false, LIMX = null, LIMY = null, EXT = null, NO_RATCHET = false;





var SPAN = (typeof window !== 'undefined' && window.PLANE_Y === 'span');
function spanLevels() {   
  var grid = state.src === 'bayes' && D.bay && D.bay.lev_logit ? D.bay.lev_logit : (D.avg && D.avg.lev_grid ? D.avg.lev_grid : null);
  var top = grid && grid.length ? grid[grid.length - 1] : logit(0.995);
  return [logit((+state.c || 1) / 100), Math.min(logit((+state.u || 99) / 100), top)];
}
function spanDefaultLevels() { return +state.c === 1 && +state.u === 99; }   
function spanEndNames() { return ['D' + fmtLev(100 - (+state.c || 1)), 'D' + fmtLev(100 - (+state.u || 99))]; }   





var SPAN_LEAF = null, SPAN_LEAF_STATE = 'off';   
function spanNum(v) { return (v === '' || v == null || v !== v) ? null : +v; }
function loadSpanLeaf() {
  SPAN_LEAF_STATE = 'loading';
  return fetch(MOUNT + 'data/curve_span_of_record.json', { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); }).then(function (t) {
    
    
    var j = JSON.parse(t.replace(/:(-?Infinity|NaN)(?=[,}\]])/g, ':null'));
    var by = {}; (j.rows || []).forEach(function (row) { if (!row || !row.arm) return; (by[row.arm] = by[row.arm] || []).push(row); var k2 = String(row.arm).replace(/_eiv(?:on|off)$/, ''); if (k2 !== row.arm) (by[k2] = by[k2] || []).push(row); });   
    SPAN_LEAF = { byArm: by, written: (j.form || {}).written_at || null, n: (j.rows || []).length }; SPAN_LEAF_STATE = 'ok';
  }).catch(function () { SPAN_LEAF = null; SPAN_LEAF_STATE = 'missing'; }).then(function () { try { if (typeof render === 'function' && typeof sel !== 'undefined' && sel && D.shared) render(); } catch (e) {} });
}






function entropyNats(p) { return (p <= 0 || p >= 1) ? 0 : -(p * Math.log(p) + (1 - p) * Math.log(1 - p)); }
function readingEntropy(i) {
  var c = D.shared.configs[i], pairs = [];
  if (state.src === 'bayes' || bayesOnly(i)) {
    if (D.unfitted[c.id] || !D.bayById[c.id]) return { z: null, kind: 'none', lo: null, hi: null, extra: 'awaiting its Bayesian fit' };
    
    
    
    if (state.def === 'average' && SPAN_LEAF_STATE === 'ok') {
      var lrow = spanRowFor(i), wk = state.ed === 'capC' ? 'uniform' : state.ed === 'capC_z' ? 'haldane' : 'jeffreys';
      if (lrow && lrow.aoe_uniform_nats != null && lrow.aoe_uniform_nats !== '' && lrow.aoe_jeffreys_nats != null && lrow.aoe_haldane_nats != null) {
        var ev = spanNum(lrow['aoe_' + wk + '_nats']), elo = spanNum(lrow['aoe_' + wk + '_env_lo']), ehi = spanNum(lrow['aoe_' + wk + '_env_hi']);
        if (ev != null) return { z: LIM[0] + entPos(ev), lo: elo != null ? LIM[0] + entPos(Math.max(0, elo)) : null, hi: ehi != null ? LIM[0] + entPos(Math.max(0, ehi)) : null, kind: 'point', ent: ev, entLo: elo, entHi: ehi,
          extra: 'average outcome entropy ' + ev.toFixed(3) + ' nats over logit difficulty with the ' + edWord() + ' weight \u2014 the fits\u2019 maintainers\u2019s column on the posterior-median curve' + (elo != null && ehi != null ? '; the whisker an envelope from the 10th and 90th percentile curves [' + elo.toFixed(3) + ', ' + ehi.toFixed(3) + ']' : '') + (wk === 'haldane' && lrow.aoe_haldane_range_lo != null ? '; averaged over the axis tasks\u2019 span, logit ' + (+lrow.aoe_haldane_range_lo).toFixed(1) + ' to ' + (+lrow.aoe_haldane_range_hi).toFixed(1) : (lrow['aoe_' + wk + '_tail_share'] != null ? '; ' + Math.round(+lrow['aoe_' + wk + '_tail_share'] * 100) + '% of the weight lies beyond the fitted grid, where the curve is held at its end values' : '')) };
      }
    }
    var r = D.bayById[c.id], lt = r.levels_avg || r.levels, g = D.bay.lev_fail;
    if (!lt || !lt.mid || !g) return { z: null, kind: 'none', lo: null, hi: null, extra: 'no level table for this arm' };
    for (var k = 0; k < lt.mid.length && k < g.length; k++) if (lt.mid[k] != null) pairs.push([g[k], lt.mid[k]]);
  } else {
    var ra = D.avgById[c.id], gg = D.avg.lev_grid;
    if (!ra || !ra.z || !gg) return { z: null, kind: 'none', lo: null, hi: null, extra: 'no level table for this arm' };
    for (var q = 0; q < ra.z.length; q++) if (ra.z[q] != null && gg[ra.lo + q] != null) pairs.push([pct(gg[ra.lo + q]) / 100, ra.z[q]]);
  }
  if (pairs.length < 2) return { z: null, kind: 'none', lo: null, hi: null, extra: 'no level table for this arm' };
  
  
  
  
  
  
  
  
  var wOf = state.ed === 'capC' ? function (z) { var q = 1 / (1 + Math.exp(-z)); return q * (1 - q); } : state.ed === 'capC_z' ? function () { return 1; } : function (z) { var q = 1 / (1 + Math.exp(-z)); return Math.sqrt(q * (1 - q)); };
  var wMass = function (a, b) { if (b <= a) return 0; var n = Math.max(8, Math.ceil((b - a) / 0.02)), h = (b - a) / n, acc = 0; for (var q = 0; q <= n; q++) { var zq = a + h * q; acc += wOf(zq) * ((q === 0 || q === n) ? 0.5 : 1); } return acc * h; };
  var tot = 0;
  for (var j = 1; j < pairs.length; j++) { var za = pairs[j - 1][1], zb = pairs[j][1]; if (zb > za) tot += (entropyNats(pairs[j - 1][0]) * wOf(za) + entropyNats(pairs[j][0]) * wOf(zb)) / 2 * (zb - za); }
  var zA = Math.max(LIM[0], pairs[0][1]), zB = Math.min(LIM[1], pairs[pairs.length - 1][1]), N = wMass(LIM[0], LIM[1]) || 1;
  var tailA = entropyNats(pairs[0][0]) * wMass(LIM[0], zA), tailB = entropyNats(pairs[pairs.length - 1][0]) * wMass(zB, LIM[1]);
  tot /= N; tailA /= N; tailB /= N;
  var tailMax = tailA + tailB, unsure = tailMax > 0.02, Hm = unsure ? tot : tot + tailMax / 2, word = edWord();
  var cover = Math.round(pct(pairs[0][1])) + ' to ' + Math.round(pct(pairs[pairs.length - 1][1])) + '% of the difficulty scale';
  return { z: LIM[0] + entPos(Hm), lo: null, hi: null, kind: unsure ? 'hi-bound' : 'point', ent: Hm, entLo: tot, entHi: tot + tailMax,
           extra: 'average outcome entropy ' + Hm.toFixed(3) + ' nats over logit difficulty with the ' + word + ' weight, from the fitted failure curve\u2019s level table (it covers ' + cover + '; beyond, the entropy is under ' + Math.max(entropyNats(pairs[0][0]), entropyNats(pairs[pairs.length - 1][0])).toFixed(3) + ')' + (unsure ? ' \u2014 at least; the uncovered ends could add up to ' + tailMax.toFixed(3) : '') };
}
function entLog() { return SPAN && state.yq === 'ent' && state.es === 'log'; }   
function yRawEff() { return state.ys === 'raw' && !(SPAN && state.yq === 'ent'); }   
function entPos(h) { return entLog() ? 2 + Math.log10(Math.max(h, 0.001)) : h; }   
function edWord() { var o = (CONTROL_WORDS.xdef.options || []).filter(function (x) { return x.value === state.ed; })[0]; return (o && o.label) || 'Jeffreys'; }   
function readingY(i) { return (SPAN && state.yq === 'ent') ? readingEntropy(i) : readingSpan(i); }   
function spanRowFor(i) {   
  if (!SPAN_LEAF) return null;
  var r = D.bayById && D.bayById[D.shared.configs[i].id], fid = r && r.fit_id; if (!fid) return null;
  var rows = SPAN_LEAF.byArm[fid]; if (!rows || !rows.length) return null;
  var pb = String((D.bay && D.bay.fit_set && D.bay.fit_set.pointer) || '').split('/').pop();
  if (!pb) {   
    var dsk = String(D.dsId || state.data || ''), gold = /^golden-/.test(dsk), core = dsk.replace(/^golden-/, ''), core2 = { board_top: 'board_top', top: 'top', all: 'combined', 'new': 'pool', board: 'board' }[core];
    pb = 'serving_' + (core2 ? (gold ? 'golden_' + core2 : core2) : 'nb_' + core) + '.json';
  }
  for (var k = 0; k < rows.length; k++) if (rows[k].pointer === pb) return rows[k];
  return null;
}
function readingSpan(i) {   
  var c = D.shared.configs[i];
  if (state.src === 'bayes' || bayesOnly(i)) {
    if (D.unfitted[c.id] || !D.bayById[c.id]) return { z: null, kind: 'none', lo: null, hi: null, extra: 'awaiting its Bayesian fit' };
    if (state.def === 'average' && spanDefaultLevels()) {
      if (SPAN_LEAF_STATE !== 'ok') return { z: null, kind: 'none', lo: null, hi: null, extra: SPAN_LEAF_STATE === 'loading' ? 'the spans of record are loading' : 'the spans of record are unreadable' };
      var row = spanRowFor(i);
      if (!row) return { z: null, kind: 'none', lo: null, hi: null, extra: 'no span of record for this arm yet' };
      var st = String(row.span_status || ''), L = spanNum(row.span_z), z99r = spanNum(row.d99_z), z1r = spanNum(row.fail99_z);
      if (!st || L == null || z99r == null || z1r == null) return { z: null, kind: 'none', lo: null, hi: null, extra: 'no 99% crossing determinable from this fit\u2019s element' };
      if (/^unavailable/i.test(st)) return { z: null, kind: 'none', lo: null, hi: null, extra: st };   
      var lo = spanNum(row.span_lo), hi = spanNum(row.span_hi), S = pct(z1r) - pct(z99r), raw = state.ys === 'raw', bound = st !== 'point';
      var zz = raw ? logit(Math.min(0.9999, Math.max(0.0001, S / 100))) : LIM[0] + Math.max(0, L);
      return { z: zz, lo: (raw || lo == null) ? null : LIM[0] + Math.max(0, lo), hi: (raw || hi == null) ? null : LIM[0] + Math.max(0, hi), kind: bound ? 'hi-bound' : 'point',
               span: L, share: S, z99: z99r, z1: z1r, spanLo: lo, spanHi: hi, grad: spanNum(row.gradient_logit_per_z), gradStatus: row.gradient_status || '',
               extra: 'transition from D99 at ' + fmtPct(z99r) + ' to D1 at ' + fmtPct(z1r) + ' of the scale: ' + L.toFixed(2) + ' logit units' + (lo != null && hi != null ? ' [' + lo.toFixed(2) + ', ' + hi.toFixed(2) + ']' : '') + ', ' + S.toFixed(1) + ' percentage points of the difficulty scale' + (bound ? ' \u2014 ' + st + ' (the 99% crossing is ' + (row.fail99_status || 'bound') + ')' : '') + '; the span of record' };
    }
  }
  var lv = spanLevels(), r99 = reading(i, lv[0], 'y'), r1 = reading(i, lv[1], 'y');
  if (r99.unresolved || r1.unresolved) return Object.assign({}, r99.unresolved ? r99 : r1, { side: 'upper' });
  if (r99.z == null || r1.z == null) return { z: null, kind: 'none', lo: null, hi: null, extra: (r99.z == null ? r99.extra : r1.extra) || 'no crossing at one end of the transition' };
  var L = r1.z - r99.z, S = pct(r1.z) - pct(r99.z), raw = state.ys === 'raw';
  var z = raw ? logit(Math.min(0.9999, Math.max(0.0001, S / 100))) : LIM[0] + Math.max(0, L);
  var bound = r99.kind !== 'point' || r1.kind !== 'point';
  
  
  
  var hasB = !bound && r99.lo != null && r99.hi != null && r1.lo != null && r1.hi != null;
  var bLo = hasB ? Math.max(0, r1.lo - r99.hi) : null, bHi = hasB ? r1.hi - r99.lo : null;
  return { z: z, lo: (!raw && hasB) ? LIM[0] + bLo : null, hi: (!raw && hasB) ? LIM[0] + bHi : null, kind: bound ? 'hi-bound' : 'point', span: L, share: S, z99: r99.z, z1: r1.z, spanLo: bLo, spanHi: bHi,
           lo_open: !!(hasB && (r99.hi_open || r1.lo_open)), hi_open: !!(hasB && (r1.hi_open || r99.lo_open)),
           extra: 'transition from ' + spanEndNames()[0] + ' at ' + fmtPct(r99.z) + ' to ' + spanEndNames()[1] + ' at ' + fmtPct(r1.z) + ' of the scale: ' + L.toFixed(2) + ' logit units' + (hasB ? ' [' + bLo.toFixed(2) + ', ' + bHi.toFixed(2) + ']' : '') + ', ' + S.toFixed(1) + ' percentage points of the difficulty scale' + (bound ? ' at least \u2014 one end lies beyond the observed range' : '') + '; read from the fitted curves\u2019 level tables at the levels set, the band the widest from the two ends\u2019' };
}
var CROP = null;   
var PANELS = null, PANEL = null;   
function withPanel(ctx, fn) {   
  var s0 = [D, LIM, RUNS, RUN, SLUG_OF, IDX_OF_SLUG, sel]; D = ctx.D; LIM = ctx.LIM; RUNS = ctx.RUNS || []; RUN = ctx.RUN || null; SLUG_OF = ctx.SLUG_OF || {}; IDX_OF_SLUG = ctx.IDX_OF_SLUG || {}; sel = ctx.sel || new Set();
  try { return fn(); } finally { D = s0[0]; LIM = s0[1]; RUNS = s0[2]; RUN = s0[3]; SLUG_OF = s0[4]; IDX_OF_SLUG = s0[5]; sel = s0[6]; }
}
var CONTROL_WORDS = {   
  def: { label: 'Definition', options: [{ value: 'average', label: 'Average rate' }, { value: 'median', label: 'Median task' }] },
  src: { label: 'Crossing estimator', bayes: 'Bayesian (posterior)' },   
  partial: { label: 'Partial models', options: [{ value: 'hide', label: 'hidden' }, { value: 'show', label: 'show partial models' }] },
  xs: { label: 'Horizontal scale' }, ys: { label: 'Vertical scale' }, scale: [{ value: 'logit', label: 'Logit' }, { value: 'raw', label: 'Normal' }],
  xdef: { label: 'Capability axis', options: [{ value: 'crossing', label: 'D' }, { value: 'capC', label: 'Uniform' }, { value: 'capC_j', label: 'Jeffreys' }, { value: 'capC_z', label: 'Haldane' }] },
  onoff: [{ value: 'off', label: 'Off' }, { value: 'on', label: 'On' }],   
  kp: { label: 'K paths' }, lad: { label: 'K ladders' }, w: { label: 'Whiskers' }, resid: { label: 'Misses against the line' },
  wd: { label: 'Whisker widths', options: [{ value: 'adj', label: 'Correlation-adjusted' }, { value: 'ind', label: 'Independence' }] },
  fitci: { label: 'Fit CI', options: [{ value: 'plain', label: '95%, dots exact' }, { value: 'honest', label: '80% with measurement error' }] },
  move: { label: 'Move from ' },   
  line: { label: 'Fitted line', options: [{ value: 'off', label: 'Off' }, { value: 'steps', label: 'In logit' }, { value: 'axes', label: 'In the axes as set' }] },
  lw: { label: 'Line weighting', options: [{ value: 'equal', label: 'Each dot equal' }, { value: 'bands', label: 'By the 80% uncertainty bands' }] },
  arms: { label: 'Models', options: [{ value: 'all', label: 'all models' }, { value: 'golden', label: 'golden set' }], goldenMissing: 'golden set (12): no golden bundle for this dataset yet' },
  more: 'More controls',
  view: { label: 'View', options: [{ value: 'scatter', label: 'Scatter' }, { value: 'ridges', label: 'Posterior ridges' }] },
};
function markControlData() {   
  var mv = document.querySelector('.kit-switch[data-key="move"] .kit-switch-label');
  if (mv && !mv.querySelector('[data-label-data]')) { var t = mv.textContent || ''; if (t.indexOf(CONTROL_WORDS.move.label) === 0) { mv.textContent = ''; mv.appendChild(document.createTextNode(CONTROL_WORDS.move.label)); var sp = document.createElement('span'); sp.setAttribute('data-label-data', ''); sp.textContent = t.slice(CONTROL_WORDS.move.label.length); mv.appendChild(sp); } }
  ['partial', 'arms'].forEach(function (k) { var sw = document.querySelector('.kit-switch[data-key="' + k + '"]'); if (sw) sw.setAttribute('data-by-data', ''); });
  var hb = document.querySelector('.kit-switch[data-key="src"] button[data-value="project"]'); if (hb) hb.setAttribute('data-option-data', '');
}
function cropRange(ext, lim) {   
  if (!(ext && isFinite(ext.x0) && isFinite(ext.y0) && ext.x1 >= ext.x0 && ext.y1 >= ext.y0)) return null;
  var lo = Math.min(ext.x0, ext.y0), hi = Math.max(ext.x1, ext.y1); if (hi - lo < 1) { var mid = (lo + hi) / 2; lo = mid - 0.5; hi = mid + 0.5; } var pad = (hi - lo) * 0.06;
  var r = [Math.max(lim[0], lo - pad), Math.min(lim[1], hi + pad)];
  return r[1] - r[0] >= (lim[1] - lim[0]) - 1e-9 ? null : r;
}
var DUAL_TWINS = true;   
var CHART_VH_GAP = 170;
var EXPORT_TITLE_PX = 46, EXPORT_TICK_PX = 24, PANEL_EXPORT_TITLE_PX = 26, PANEL_EXPORT_TICK_PX = 18;   
function extAdd(zx, zy) {
  if (!EXT) EXT = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
  if (zx != null && isFinite(zx)) { if (zx < EXT.x0) EXT.x0 = zx; if (zx > EXT.x1) EXT.x1 = zx; }
  if (zy != null && isFinite(zy)) { if (zy < EXT.y0) EXT.y0 = zy; if (zy > EXT.y1) EXT.y1 = zy; }
}
var NARROW = false, FS = 12, FT = 11, DR = 5, UPX = 1;   



function layout() {
  if (PANEL) {   
    NARROW = false; W = PANEL.size.width; UPX = 1;
    if (EXPORTING) { ML = 90; MR = 30; MT = 40; MB = 62; DR = 4.5; FS = PANEL_EXPORT_TICK_PX; FT = 11; } else { ML = 44; MR = 10; MT = 10; MB = 34; DR = 3.5; FS = 10; FT = 9; }   
    PW = W - ML - MR; PH = PW; H = PH + MT + MB; TRK.x0 = ML; TRK.x1 = ML + PW; TRK.y = 6; return;
  }
  if (EXPORTING) {   
    NARROW = false; W = 970; ML = 150; MR = 40; MT = 50; MB = 105; DR = 6; PW = W - ML - MR; UPX = 1; FS = EXPORT_TICK_PX; FT = 11;   
    
    
    
    var LX = limT(state.xs === 'raw', 'x'), LY = limT(state.ys === 'raw', 'y');
    PH = state.xs === state.ys && LIMX && LIMY ? Math.round(PW * (LY[1] - LY[0]) / (LX[1] - LX[0])) : PW;
    H = PH + MT + MB; TRK.x0 = ML; TRK.x1 = ML + PW; TRK.y = 18; return;
  }
  var cb = document.getElementById('chartbox'), w = cb ? cb.clientWidth : 860;
  NARROW = w > 0 && w < 600;
  var deskW = Math.max(860, Math.min(1600, Math.round(w || 860)));   
  
  
  
  
  W = NARROW ? 380 : deskW; ML = NARROW ? 56 : 62; MR = NARROW ? 24 : 16; MT = NARROW ? 52 : 40; MB = NARROW ? 44 : 46;   
  DR = NARROW ? 5 : 4.5;   
  PW = W - ML - MR; PH = PW; H = PH + MT + MB;
  var hAvail = Math.max(360, (window.innerHeight || 900) - CHART_VH_GAP), rw = w > 0 ? Math.min(w, hAvail * W / H) : W;   
  UPX = rw > 0 ? W / rw : 1;
  if (!NARROW) DR = Math.max(4.5, 4 * UPX);   
  FS = NARROW ? 13 : Math.max(12, Math.ceil(11.5 * UPX)); FT = NARROW ? 13 : Math.max(11, Math.ceil(10.5 * UPX));   
  TRK.x0 = ML; TRK.x1 = ML + PW; TRK.y = NARROW ? 22 : 18;
}
var LOGIT_TICKS = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 80, 90, 95, 98, 99, 99.5];   
var AXIS_FLOOR_PCT = 0.1;   
var LOGIT_TICKS_EXPORT = [0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 80, 90, 95, 98, 99, 99.5, 99.8, 99.9];
var LOGIT_TICKS_FINE = [0.05, 0.07, 0.1, 0.15, 0.2, 0.3, 0.5, 0.7, 1, 1.5, 2, 3, 5, 7, 10, 15, 20, 30, 40, 50, 60, 70, 80, 85, 90, 93, 95, 97, 98, 99, 99.3, 99.5, 99.7, 99.8, 99.9];

var EXPORT_TIER_Y = null, EXPORT_FLOOR_Y = null;   



var K_MAX = 99.5 / 0.2, K_LADDER_MAX = 50, K_CHIPS = [2, 4, 8, 10, 16, 32, 50];   
var dragK0 = null;
var RAW_TICKS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
function logit(p) { return Math.log(p / (1 - p)); }
function pct(z) { return 100 / (1 + Math.exp(-z)); }
function fmtPct(z, d) { return pct(z).toFixed(d == null ? 1 : d) + '%'; }


var D = {};
var MOUNT = window.MIRROR_MOUNT || './';   
if (SPAN) loadSpanLeaf();   
var PLANE_HOOKS = { drawn: [], legend: [] };   
window.Plane = window.Plane || {};
Plane.onDrawn = function (fn) { if (typeof fn === 'function') PLANE_HOOKS.drawn.push(fn); return function () { PLANE_HOOKS.drawn = PLANE_HOOKS.drawn.filter(function (g) { return g !== fn; }); }; };   
Plane.legendRows = function (fn) { if (typeof fn === 'function') PLANE_HOOKS.legend.push(fn); };   
Plane.read = function (i, levLogit, axis) { return reading(i, levLogit, axis); };   
Plane.helpers = { logit: logit, pct: pct, clampZ: function (v) { return clampZ(v); } };
function fireDrawn(arms, la, lc) {   
  if (!PLANE_HOOKS.drawn.length) return;
  var root = PANEL ? PANEL.g : document.getElementById('plotg'), svg = PANEL ? PANEL.svg : document.getElementById('chart');
  arms.forEach(function (a) { a.el = root ? root.querySelector('path[data-mark][data-i="' + a.i + '"]') : null; });
  var ctx = { svg: svg, g: root, panel: PANEL, state: state, exporting: EXPORTING, frame: { LIM: LIM, LIMX: LIMX, LIMY: LIMY, ext: EXT, W: W, H: H, ML: ML, MT: MT, PW: PW, PH: PH, DR: DR }, map: { sx: sx, sy: sy, pxF: pxF, pyF: pyF, FX: FX, FY: FY }, levels: { a: state.a, c: state.c, la: la, lc: lc }, arms: arms, read: Plane.read, helpers: Plane.helpers };
  PLANE_HOOKS.drawn.forEach(function (fn) { try { fn(ctx); } catch (e) { if (window.console) console.warn('plane hook', e); } });
}
function prepareSet(X, quiet) {   
  



  var WITHDRAWN = {};   
  (X.shared.withdrawn || []).forEach(function (id) { WITHDRAWN[id] = 1; });
  Object.keys(X.shared.fit_excluded || {}).forEach(function (id) { WITHDRAWN[id] = 1; });
  X.shared.configs = X.shared.configs.filter(function (c) { return !WITHDRAWN[c.id]; });
  ['avg', 'med', 'bay'].forEach(function (k) { if (X[k]) X[k].rows = X[k].rows.filter(function (r) { return !WITHDRAWN[r.cfg || r.id]; }); });
  X.shared.fit_excluded = null;
  [X.shared.capC, X.shared.capC_z, X.shared.capC_j].forEach(function (CB) { if (CB && CB.excluded) Object.keys(WITHDRAWN).forEach(function (id) { delete CB.excluded[id]; }); });
  


  X.avgById = {}; X.medById = {}; X.bayById = {};
  X.avg.rows.forEach(function (r) { X.avgById[r.cfg] = r; });
  if (X.med) X.med.rows.forEach(function (r) { X.medById[r.cfg] = r; });
  if (X.bay) X.bay.rows.forEach(function (r) { X.bayById[r.cfg] = r; });
  X.bayPrevById = {};   
  if (X.bayPrev && X.bayPrev.rows && X.bay) { X.bayPrev.rows.forEach(function (r) { X.bayPrevById[r.cfg] = r; }); X.bayPrev.lev_logit = X.bayPrev.lev_fail.map(function (p) { return Math.log(p / (1 - p)); }); }
  
  
  if (X.bay && (!X.bay.lev_fail || !X.bay.rows[0].levels
      || !X.bay.rows[0].levels_avg)) {
    if (!quiet) document.body.insertAdjacentText('afterbegin',
      'DATA VERSION MISMATCH: this build needs BOTH Bayesian '
      + 'crossing-table chains (median-task + average-rate, '
      + '2026-08-31 def-switch fix) — artifacts are being '
      + 'regenerated.');
    throw new Error('bayes artifact predates the average chain');
  }
  
  if (X.bay) X.bay.lev_logit = X.bay.lev_fail.map(function (p) {
    return Math.log(p / (1 - p));
  });
  
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

 




var HOUSE_DATASETS = {   
  
  
  
  
  
  
  
  
  
  board_top: { label: 'wave 1+2', hover: 'wave 1+2, on one difficulty axis', available: false, reason: 'this set is not served yet' },
  board: { label: 'wave 1', hover: 'wave 1', available: true, reason: 'wave 1 are always served' },
  top: { label: 'wave 2', hover: 'wave 2 (the parked tasks are not in it)', available: false, reason: 'this set is not served yet' },
  'new': { label: 'wave 2 + parked', hover: 'wave 2 + parked', available: false, reason: 'crossing rows for wave 2 over the frozen level grid are not published yet' },
  all: { label: 'wave 1+2 + parked', hover: 'wave 1+2 + parked, on one difficulty axis', available: false, reason: 'no single axis covers the original and wave 2 yet (difficulty computes one over the combined set)' },
  
  
  
  math500: { label: 'MATH-500', hover: 'MATH-500, on its own difficulty axis', available: false, reason: 'this set is not served yet', group: 'Math' },
  ifeval: { label: 'IFEval', hover: 'IFEval, on its own difficulty axis', available: false, reason: 'this set is not served yet', group: 'Other' },
  gsm8k_platinum: { label: 'GSM8K-Platinum', hover: 'GSM8K-Platinum, on its own difficulty axis', available: false, reason: 'this set is not served yet', group: 'Math' },
  cruxeval_i: { label: 'CRUXEval input', hover: 'CRUXEval input prediction, on its own difficulty axis', available: false, reason: 'this set is not served yet', group: 'Other' },
  cruxeval_o: { label: 'CRUXEval output', hover: 'CRUXEval output prediction, on its own difficulty axis', available: false, reason: 'this set is not served yet', group: 'Other' },
  aime: { label: 'AIME', hover: 'AIME, on its own difficulty axis', available: false, reason: 'this set is not served yet', group: 'Math' },
  
  
};



var CODING_KEYS = ['board_top', 'top', 'board', 'new', 'all'];
function mirrorMap(m) { var o = {}; Object.keys(m).forEach(function (k) { var e = m[k] || {}; o[k] = { label: e.label || k, short: e.short || String(e.label || k).split(' (')[0], hover: e.hover || '', available: false, reason: e.reason || 'this set is not served yet' }; }); return o; }
var DATASETS = window.MIRROR_DATASETS ? mirrorMap(window.MIRROR_DATASETS) : HOUSE_DATASETS;
var CADENCE = window.MIRROR_CADENCE_PLAIN || 'rebuilds with every landing of new results and every Bayesian fit flip (checked every two minutes)';   
function shortMap() { var F = { board_top: 'original + new', top: 'first new', board: 'original', 'new': 'new', all: 'all' }, o = {}; Object.keys(DATASETS).forEach(function (k) { o[k] = DATASETS[k].short || F[k] || DATASETS[k].label; }); return o; }
function plainTs(ts) {   
  var s = String(ts || ''), m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?(Z|[+-]\d{2}:?\d{2})?)?/.exec(s), MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  if (!m) return s;
  if (!m[4]) return (+m[3]) + ' ' + MON[+m[2] - 1];
  var d = new Date(m[1] + '-' + m[2] + '-' + m[3] + 'T' + m[4] + ':' + m[5] + ':' + (m[6] || '00') + (m[7] || 'Z'));   
  if (!isFinite(d)) return (+m[3]) + ' ' + MON[+m[2] - 1] + ' ' + m[4] + ':' + m[5];
  var g = {}; new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(d).forEach(function (x) { g[x.type] = x.value; });
  return (+g.day) + ' ' + MON[+g.month - 1] + ' ' + g.hour + ':' + g.minute;   
}
function relabel() {   
  Object.keys(DATASETS).forEach(function (k) {   
    if (CODING_KEYS.indexOf(k) >= 0) return; var e = D.man && D.man.datasets && D.man.datasets[k];
    
    if (e && e.label && DATASETS[k].group) { var par = /\(([^)]*)\)\s*$/.exec(String(e.label)); DATASETS[k].frameLabel = DATASETS[k].label + (par ? ' (' + par[1] + ')' : ''); DATASETS[k].short = DATASETS[k].label; return; }
    if (e && e.label) { DATASETS[k].label = e.label; DATASETS[k].frameLabel = e.label; DATASETS[k].short = String(e.label).split(' (')[0]; } });
  if (!CODING_KEYS.every(function (k) { return DATASETS[k]; })) return;   
  
  
  
  function f(v) { return v == null ? null : String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  var C = D.man && D.man.counts_of_record;
  if (C && C.wave1 != null) {
    DATASETS.board.label = 'wave 1 (' + f(C.wave1) + ' tasks)'; DATASETS.board.short = 'wave 1';
    DATASETS.top.label = 'wave 2 (' + f(C.wave2) + ' tasks)'; DATASETS.top.short = 'wave 2';
    DATASETS.board_top.label = 'wave 1+2 (' + f(C.wave12) + ' tasks)'; DATASETS.board_top.short = 'wave 1+2';
    DATASETS['new'].label = 'wave 2 + parked (' + f(C.new_total) + ' tasks)'; DATASETS['new'].short = 'wave 2 + parked';
    DATASETS.all.label = 'wave 1+2 + parked (' + f(C.all) + ' tasks)'; DATASETS.all.short = 'all waves';
    
    
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





function coverageOf(c) { var cv = c && c.coverage; if (!cv || !cv.of) return null; return { tasks: Math.min(cv.tasks, cv.of), of: cv.of, share: Math.min(1, cv.tasks / cv.of) }; }

function isPartial(i) { var c = D.shared.configs[i]; var cv = coverageOf(c); return (!!cv && cv.share < 0.9) || !!(c && c.partial_fit); }
function partialShown() { return state.partial === 'show'; }
function coverageText(c) { var cv = coverageOf(c); if (cv && cv.share < 0.9) return 'attempts on ' + Math.round(cv.share * 100) + '% of this set\u2019s tasks'; return (c && c.partial_fit && c.partial_note) ? c.partial_note : ''; }   
function partialArms() { return D.shared.configs.map(function (c, i) { return i; }).filter(function (i) { return isPartial(i) && !isWithheld(i); }); }


var WITHHELD = {};   
function isWithheld(i) { var c = D.shared.configs[i]; return !!(c && WITHHELD[c.id]); }
function isHidden(i) { var c = D.shared.configs[i]; return isWithheld(i) || (!partialShown() && isPartial(i)) || (isRun(i) && (!runShown(runOf(i)) || state.src !== 'bayes')) || (!!(c && c.bayes_only) && state.src !== 'bayes'); }   
function withheldArms() { return D.shared.configs.map(function (c, i) { return i; }).filter(isWithheld); }
function armNote(c) { var d = c && c.disclosure; return (d && !/^covers \d/.test(d)) ? d : ''; }
function cleanedScope(c) { var sc = D.bay && D.bay.cleaned_scope; return (sc && c && sc[c.id]) || ''; }   
function asGraded(c) { return !!(c && /removed before grading|cleaning/i.test(armNote(c)) && D.bay && !((D.bay.cleaned_arms || []).indexOf(c.id) >= 0)); }   
function capTitle(t) {   
  t = String(t || ''); if (t.length <= 300) return t;
  var cut = t.slice(0, 296), k = Math.max(cut.lastIndexOf('; '), cut.lastIndexOf(', '), cut.lastIndexOf(' \u2014 '), cut.lastIndexOf('. '));
  if (k < 200) k = cut.lastIndexOf(' ');
  return cut.slice(0, k > 0 ? k : 296).replace(/[;,.\s]+$/, '') + ' \u2026';
}

var dataNote = null;
function showDataNote() { var el = document.getElementById('datanote'); if (el) { el.textContent = dataNote || ''; el.hidden = !dataNote; } }
var state = { data: 'board', arms: 'all', view: 'scatter', def: 'average', src: 'project', xdef: 'crossing', move: 'off',
              line: 'steps', lw: 'equal', resid: 'off', hold: 'k', lad: 'off', fitci: 'honest',   
              w: 'on', wd: 'adj', xs: 'logit', ys: 'logit',
              a: 50, c: 1, u: 99, fa: 'off', ft: 'off', fn: 'off', zoom: 'eq', yq: 'len', ed: 'capC_j', es: 'normal', kp: 'off', partial: 'hide', run: 'show' };   
var sel = null, chips = [], srcMount = null, playTimer = null;
var LIM = null;    

function houseName() {
  return state.def === 'average' ? 'Local-logistic crossings'
                                 : 'Binned-median crossings';
}

 
function tf(z, raw) { return raw ? pct(z) / 100 : z; }
function limT(raw, ax) {   
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
  var raw = yRawEff(), L = limT(raw, 'y');
  return MT + (L[1] - tf(z, raw)) / (L[1] - L[0]) * PH;
}
function clampZ(v) { return Math.min(LIM[1], Math.max(LIM[0], v)); }


function inAxes() { return state.line === 'axes'; }
function FX(z) { return inAxes() && state.xs === 'raw' ? tf(z, true) : z; }
function FY(z) { return inAxes() && state.ys === 'raw' ? tf(z, true) : z; }
function pxF(v) { if (!(inAxes() && state.xs === 'raw')) return sx(v); var L = limT(true, 'x'); return ML + (v - L[0]) / (L[1] - L[0]) * PW; }
function pyF(v) { if (!(inAxes() && state.ys === 'raw')) return sy(clampZ(v)); var L = limT(true, 'y'); v = Math.min(L[1], Math.max(L[0], v)); return MT + (L[1] - v) / (L[1] - L[0]) * PH; }
function fmtY(v) { return inAxes() && state.ys === 'raw' ? (100 * v).toFixed(1) + '%' : v.toFixed(2); }


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
function residPanel(RS, cols, x0, y0) {   
  var fmin = Math.min.apply(null, RS.fv), fmax = Math.max.apply(null, RS.fv), emax = Math.max.apply(null, RS.es.map(Math.abs)) || 1, pad = 10;
  var t1 = 'misses vs fitted, \u00b1' + (100 * emax / RS.span).toFixed(0) + '% of the y scale \u00b7 ' + RS.w5 + '/' + RS.n + ' within \u00b15%';
  var t2 = 'typical ' + RS.rmsPct.toFixed(1) + '%, largest ' + sgn(RS.bigPct) + '% (' + RS.bigLabel + ')';
  
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
 
function arrAt(arr, gidx) {
  var k = Math.floor(gidx);
  if (k < 0 || k >= arr.length - 1) return null;
  var a = arr[k], b = arr[k + 1];
  if (a == null || b == null) return null;
  return a + (gidx - k) * (b - a);
}



function readAvg(i, lev) {
  var r = D.avgById[D.shared.configs[i].id];
  var g = gidxOf(lev);
  var z = tabAt(r.lo, r.z, g);
  var adj = state.wd === 'adj';
  var L = adj ? tabAt(r.loLd, r.zLd, g) : tabAt(r.loL, r.zL, g);
  var Hh = adj ? tabAt(r.loHd, r.zHd, g) : tabAt(r.loH, r.zH, g);
  if (z == null) {
    
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







function prevFitName() {   
  
  var fl = D.ds && D.ds.flip, w = String((fl && fl.from_wave) || (D.bayPrev && D.bayPrev.fit_set && D.bayPrev.fit_set.wave_id) || '');
  var m = /(\d{4})(\d{2})(\d{2})T\d{4}Z/.exec(w), MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var set = (DATASETS[D.dataId] && (DATASETS[D.dataId].short || DATASETS[D.dataId].label)) || 'this set';
  return m ? 'the ' + (+m[3]) + ' ' + MONTHS[+m[2] - 1] + ' cut of ' + set : 'the previous cut of ' + set;
}
function sorAt(r, levLogit) {   
  if (!r || !r.sor) return null;
  var p = pct(levLogit), hit = null; Object.keys(r.sor).forEach(function (k) { if (Math.abs(+k - p) < 1e-4) hit = r.sor[k]; });
  if (!hit || hit.length < 6 || hit[3] == null) return null;   
  var lt = (state.def === 'average' ? r.levels_avg : r.levels) || r.levels_avg || r.levels, zg = lt && lt.zg ? lt.zg : null;
  var z = hit[3], lo = hit[4], hi = hit[5];
  var loOpen = lo != null && zg ? lo <= zg[0] + 1e-6 : false, hiOpen = hi != null && zg ? hi >= zg[1] - 1e-6 : false;
  if (hit[0] === 'bound') {
    var low = hit[1] === 'lower' || (hit[1] !== 'upper' && zg && z <= zg[0] + 1e-6);
    return { z: z, lo: low ? z : lo, hi: low ? hi : z, kind: low ? 'lo-bound' : 'hi-bound', lo_open: low ? true : loOpen, hi_open: low ? hiOpen : true,
             extra: (low ? 'the curve crosses this level below the easiest tasks: the bottom of the scale, a bound' : 'the curve crosses this level beyond the hardest tasks: the top of the scale, a bound') + ' — drawn with its band, out of the fitted line' };
  }
  return { z: z, lo: lo, hi: hi, kind: 'point', lo_open: loOpen, hi_open: hiOpen, extra: '80% uncertainty band (crossing draws, average-rate)' };
}
function asEdgePoint(rd) {   
  if (!rd || (rd.kind !== 'lo-bound' && rd.kind !== 'hi-bound')) return rd;
  var low = rd.kind === 'lo-bound';
  return Object.assign({}, rd, { lo: low ? rd.z : rd.lo, hi: low ? rd.hi : rd.z, lo_open: low ? true : !!rd.lo_open, hi_open: low ? !!rd.hi_open : true,
    extra: (low ? 'the curve crosses this level below the easiest tasks: the bottom of the scale, a bound' : 'the curve crosses this level beyond the hardest tasks: the top of the scale, a bound') + ' — drawn with its band, out of the fitted line' });
}
function readBayes(i, levLogit) { var r = D.bayById[D.shared.configs[i].id]; return asEdgePoint((state.def === 'average' ? sorAt(r, levLogit) : null) || readBayesRow(r, levLogit, D.bay)); }   
function readBayesRow(r, levLogit, B) {   
  
  
  
  
  var lt = state.def === 'average' ? r.levels_avg : r.levels;
  var LV = B.lev_logit;
  
  
  if (levLogit < LV[0] - 1e-9)
    return { z: lt.zg[0], lo: null, hi: null, kind: 'lo-bound',
             extra: 'level below the table range' };
  if (levLogit > LV[LV.length - 1] + 1e-9)
    return { z: lt.zg[1], lo: null, hi: null, kind: 'hi-bound',
             extra: 'level above the table range' };
  var lo_i = 0, hi_i = LV.length - 1;     
  while (hi_i - lo_i > 1) {               
    var mm = (lo_i + hi_i) >> 1;
    if (LV[mm] < levLogit) lo_i = mm; else hi_i = mm;
  }
  var j = hi_i, j0 = lo_i;
  if (lt.kind[j0] !== 0 || lt.kind[j] !== 0) {
    
    var jj = lt.kind[j0] !== 0 ? j0 : j, k = lt.kind[jj];
    return { z: k === -1 ? lt.zg[0] : lt.zg[1], lo: (lt.lo && lt.lo[jj] != null) ? lt.lo[jj] : null, hi: (lt.hi && lt.hi[jj] != null) ? lt.hi[jj] : null,   
             lo_open: !!(lt.lo_open && lt.lo_open[jj]), hi_open: !!(lt.hi_open && lt.hi_open[jj]),
             kind: k === -1 ? 'lo-bound' : 'hi-bound',
             extra: k === -1
               ? 'crossing at or before the fitted range'
               : 'level not reached within the fitted range' };
  }
  var t = (levLogit - LV[j0]) / (LV[j] - LV[j0]);
  function ip(a) { return a[j0] + t * (a[j] - a[j0]); }
  
  
  if (lt.p_left && lt.p_right && lt.p_left[j0] !== null && lt.p_left[j] !== null && lt.p_right[j0] !== null && lt.p_right[j] !== null) {
    var plh = ip(lt.p_left), prh = ip(lt.p_right);
    if (plh >= 0.5 || prh >= 0.5) {
      var lowB = plh >= prh;
      return { z: lowB ? lt.zg[0] : lt.zg[1], lo: (lt.lo && lt.lo[j0] != null) ? lt.lo[j0] : null, hi: (lt.hi && lt.hi[j0] != null) ? lt.hi[j0] : null,
               lo_open: !!(lt.lo_open && (lt.lo_open[j0] || lt.lo_open[j])), hi_open: !!(lt.hi_open && (lt.hi_open[j0] || lt.hi_open[j])),
               kind: lowB ? 'lo-bound' : 'hi-bound',
               extra: (lowB ? 'crossing below the easiest tasks' : 'crossing beyond the hardest tasks') + ' (' + Math.round((lowB ? plh : prh) * 100) + '% of draws beyond the scale)' };
    }
  }
  var pc = null;
  if (lt.p_left[j0] !== null && lt.p_right[j0] !== null)
    pc = ip(lt.p_left) + ip(lt.p_right);
  var interimNote = r.interim ? 'interim fit' : null;   
  
  
  var rlo = ip(lt.lo), rhi = ip(lt.hi), lopen = !!(lt.lo_open[j0] || lt.lo_open[j]), hopen = !!(lt.hi_open[j0] || lt.hi_open[j]);
  if (lt.p_left && lt.p_left[j0] !== null && lt.p_left[j] !== null && ip(lt.p_left) > 0.10) { rlo = lt.zg[0]; lopen = true; }
  if (lt.p_right && lt.p_right[j0] !== null && lt.p_right[j] !== null && ip(lt.p_right) > 0.10) { rhi = lt.zg[1]; hopen = true; }
  return { z: ip(lt.mid), lo: rlo, hi: rhi, kind: 'point',
           hi_open: hopen,
           lo_open: lopen,
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




var CAP_KEYS = {
  
  
  
  
  
  
  
  
  capC: { block: function () { return D.shared && D.shared.capC; }, fallback: 'Capability (uniform)', clause0: 'population weighted evenly along the failure level, 0 to 1 (Beta(1,1))', short: 'Capability (uniform)' },
  capC_z: { block: function () { return D.shared && D.shared.capC_z; }, fallback: 'Capability (Haldane)', clause0: 'population weighted evenly per difficulty step over the tasks\u2019 range (Beta(0,0), cut at the easiest and hardest task)', short: 'Capability (Haldane)' },
  capC_j: { block: function () { return D.shared && D.shared.capC_j; }, fallback: 'Capability (Jeffreys)', clause0: 'population weighted by the arcsine law along the failure level, heavier at both ends (Beta(\u00bd,\u00bd), no range cut)', short: 'Capability (Jeffreys)' }
};
Object.keys(CAP_KEYS).forEach(function (k) {
  CAP_KEYS[k].name = function () { var b = CAP_KEYS[k].block(); return (b && b.name) || CAP_KEYS[k].fallback; };
  CAP_KEYS[k].clause = function () {   
    var b = CAP_KEYS[k].block(), d = b && b.distribution;
    return (typeof d === 'string' && d) || (d && typeof d.plain === 'string' && d.plain) || (b && b.marginal_plain) || CAP_KEYS[k].clause0;
  };
});
function isCap() { return !!CAP_KEYS[state.xdef]; }
function capBlock() { var k = CAP_KEYS[state.xdef]; return k ? k.block() : null; }
function reading(i, levLogit, axis) {
  if (axis === 'x' && isCap()) {
    var CB = capBlock();
    if (!CB) return { z: null, kind: 'none', lo: null, hi: null, extra: 'no ' + CAP_KEYS[state.xdef].name() + ' for this set yet' };   
    var bc = CB.by_cfg[D.shared.configs[i].id];
    if (!bc) {   
      var why = (CB.excluded || {})[D.shared.configs[i].id] || 'not in the Capability-C population';
      return { z: null, kind: 'none', lo: null, hi: null, extra: 'excluded from the Capability-C population \u2014 ' + why };
    }
    
    
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
    if (D.unfitted[cid] || !D.bayById[cid]) {   
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

 





var RUNS = [];   
var RUN = null;   
function runSets(raw) { if (!raw) return []; if (raw.sets && raw.sets.length) return raw.sets; return raw.configs ? [raw] : []; }
function normId(id) { return String(id).replace(/_temp_[0-9.]+$/, '').replace(/_batch$/, '').replace(/--/g, '/').replace(/_think$/, '-Thinking'); }   
function mergeRunSet(raw) {
  RUNS = []; RUN = null; state.runs = state.runs || {};
  if (!raw || !D.shared || !D.bay || !D.bay.rows) return;
  var axis = D.shared.axis && D.shared.axis.axis_id;
  
  
  
  
  var ckStem = function (id) { var s = String(id).toLowerCase().replace(/_temp_[0-9.]+$/, '').replace(/_batch$/, '').replace(/_think$/, ''); var m = /^(.*)-(?:step|ckpt|checkpoint)-?0*\d+$/.exec(s); return m ? m[1] : null; };
  var runStems = {}, runTwins = {};
  ((raw && raw.run_stems) || []).forEach(function (st) { runStems[String(st).toLowerCase()] = true; });   
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
    var set = rs.set || {}; if (set.axis_id && axis && set.axis_id !== axis) return;   
    if (!rs.configs.length && !(set.withheld || []).length) return;   
    
    var R = { key: set.series || set.key || ('run' + k), name: set.name || 'run', clause: set.clause || 'a run read along its checkpoints, placed on the scale without a vote', tag: set.tag || '',
              hue: set.hue || null, ramp: set.ramp || [], dash: set.dash || '', marker: set.marker || null, think: !!set.think, withheld: set.withheld || [], stateKey: set.state_key || (k === 0 ? 'run' : 'run_' + String(set.key || k).replace(/[^a-z0-9]/gi, '')), idx: [], folded: [], dual: [],
              order: (set.order == null ? 100 + k : set.order), finalOnBoard: !!set.final_on_board };   
    var rowsById = {}; (rs.rows || []).forEach(function (r) { rowsById[r.cfg] = r; });
    rs.configs.forEach(function (c) {
      if (have[c.id]) {   
        if (c.base) {     
          var ei = -1; for (var q = 0; q < D.shared.configs.length; q++) if (D.shared.configs[q].id === c.id) { ei = q; break; }
          if (ei >= 0 && D.shared.configs[ei].run && D.shared.configs[ei].base) { R.idx.push(ei); R.dual.push(ei); R.dualLabel = R.dualLabel || {}; R.dualLabel[ei] = c.label || D.shared.configs[ei].label; return; }
          if (!(ei >= 0 && c.board_model && !D.shared.configs[ei].run)) return;
          
        } else return;
      }
      if (c.base && c.board_model && !byNorm[normId(c.id)]) {   
        var mc = {}; Object.keys(c).forEach(function (kk) { mc[kk] = c[kk]; });
        
        mc.label = c.board_label || String(c.display_name || c.label).replace(/\s*\u00b7\s*checkpoint 0$/, ''); mc.display_name = mc.label; mc.shared_page_label = null; mc.fam = c.board_family || c.fam; mc.run = false; mc.series = null; mc.bayes_only = true;
        D.shared.configs.push(mc); var mi = D.shared.configs.length - 1; have[c.id] = true; byNorm[normId(c.id)] = mc;
        var mrow = rowsById[c.id]; if (mrow && !haveRow[c.id]) { var mr = {}; Object.keys(mrow).forEach(function (kk) { mr[kk] = mrow[kk]; }); delete mr.run; mr.cfg = c.id; D.bay.rows.push(mr); haveRow[c.id] = true; if (D.bayById) D.bayById[c.id] = mr; if (D.unfitted && D.unfitted[c.id]) delete D.unfitted[c.id]; }
        R.idx.push(mi); R.dual.push(mi); R.dualLabel = R.dualLabel || {}; R.dualLabel[mi] = c.label; R.folded.push(c.id); return;
      }
      var twin = byNorm[normId(c.id)];
      if (twin) {   
        
        var r = rowsById[c.id], boardHas = !!haveRow[twin.id];   
        if (r && !haveRow[twin.id]) { var r2 = {}; Object.keys(r).forEach(function (kk) { r2[kk] = r[kk]; }); r2.cfg = twin.id; r2.alongside = R.key; delete r2.run; D.bay.rows.push(r2); haveRow[twin.id] = true; if (D.bayById) D.bayById[twin.id] = r2; if (D.unfitted && D.unfitted[twin.id]) delete D.unfitted[twin.id]; }   
        
        
        if (R.finalOnBoard || (DUAL_TWINS && c.base)) { var ti = D.shared.configs.indexOf(twin); twin.series = R.key; R.dualLabel = R.dualLabel || {}; R.dualLabel[ti] = c.label || twin.label; twin.gates_failed = twin.gates_failed || !!c.gates_failed; if (c.gates_failed && !twin.gate_flag) twin.gate_flag = c.gate_flag; R.idx.push(ti); R.dual.push(ti); R.folded.push(twin.id); return; }   
        twin.run = true; twin.series = R.key; twin.board_label = twin.label; twin.label = c.label || twin.label; twin.display_name = c.display_name || twin.display_name; twin.shared_page_label = c.shared_page_label || twin.shared_page_label; twin.fam = c.fam || twin.fam;
        twin.step = c.step; twin.index = c.index; if (c.color) twin.color = c.color; twin.think = !!c.think; if (!boardHas) twin.alongside = R.name;   
        if (c.gates_failed) { twin.gates_failed = true; twin.gate_flag = c.gate_flag; if (!twin.disclosure) twin.disclosure = c.gate_flag; }
        R.idx.push(D.shared.configs.indexOf(twin)); R.folded.push(twin.id); return;
      }
      c.run = true; c.series = R.key; if (c.gates_failed && !c.disclosure) c.disclosure = c.gate_flag;   
      have[c.id] = true; D.shared.configs.push(c); R.idx.push(D.shared.configs.length - 1);
      var row = rowsById[c.id]; if (row && !haveRow[c.id]) { row.run = true; row.series = R.key; D.bay.rows.push(row); haveRow[c.id] = true; if (D.bayById) D.bayById[c.id] = row; }   
    });
    if (R.idx.length || R.folded.length || R.withheld.length) { RUNS.push(R); state.runs[R.stateKey] = 'show'; }   
  });
  RUNS.sort(function (a, b) { return a.order - b.order; });   
  RUN = RUNS[0] || null;
}



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
    case 'triangle-left': return head + 'm-' + f(r * 1.3) + ' 0l' + f(r * 2) + ' -' + f(r * 1.15) + 'l0 ' + f(r * 2.3) + 'Z';   
    case 'triangle-right': return head + 'm' + f(r * 1.3) + ' 0l-' + f(r * 2) + ' -' + f(r * 1.15) + 'l0 ' + f(r * 2.3) + 'Z';   
    case 'diamond': { var dd = r * 1.3; return head + 'm0 -' + f(dd) + 'l' + f(dd) + ' ' + f(dd) + 'l-' + f(dd) + ' ' + f(dd) + 'l-' + f(dd) + ' -' + f(dd) + 'Z'; }
    case 'star': return poly(star(5, r * 1.55, r * 0.65));
    case 'cross': return poly(plus(r * 1.45, r * 0.5, Math.PI / 4));
    case 'plus': return poly(plus(r * 1.45, r * 0.5, 0));
    case 'hexagon': return poly(ring(6, r * 1.15, 0));
    case 'pentagon': return poly(ring(5, r * 1.2, -Math.PI / 2));
    default: return head + 'm-' + r + ' 0a' + r + ' ' + r + ' 0 1 0 ' + (2 * r) + ' 0a' + r + ' ' + r + ' 0 1 0 -' + (2 * r) + ' 0Z';
  }
}



function runMarkOf(i) { var c = D.shared && D.shared.configs[i]; if (!c || !c.run || c.base || !window.Kit || typeof Kit.runMarks !== 'function') return null; try { return Kit.runMarks(c.display_name || c.shared_page_label || c.label || '') || null; } catch (e) { return null; } }
function dotColorOfName(name) {   
  var rm = (window.Kit && typeof Kit.runMarks === 'function') ? Kit.runMarks(name) : null;
  if (!rm || !rm.dot || !rm.teacher || !D.shared) return null;
  var t = String(rm.teacher).trim().toLowerCase();
  var hit = D.shared.configs.find(function (c) { return !c.run && String(c.label || '').trim().toLowerCase() === t; })
    || D.shared.configs.find(function (c) { return !c.run && String(c.display_name || '').trim().toLowerCase() === t; });
  return (hit && hit.color) || null;
}
function dotColorOf(i) { var c = D.shared && D.shared.configs[i]; if (!c || !c.run || c.base) return null; try { return dotColorOfName(c.display_name || c.label); } catch (e) { return null; } }







var END_LABELS = false;   
function runEndLabels(arms, pid) {
  if (!arms || arms.length < 2 || !window.Kit || typeof Kit.sharedMarkGroups !== 'function' || typeof Kit.drawRunEndLabel !== 'function') return;
  var mg = (PANEL && PANEL.svg ? PANEL.svg : document).querySelector('#marks' + pid); if (!mg || !mg.parentNode) return;
  
  var g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.setAttribute('id', 'runlabels' + pid); mg.parentNode.insertBefore(g, mg.nextSibling);
  var runOf = function (n) { return String(n || '').replace(/\s*·\s*\d+\s+steps?\s*$/i, '').replace(/\s*\((?:step|checkpoint)?\s*\d+\s*steps?\)\s*$/i, '').trim(); };
  var pts = [];
  arms.forEach(function (a) {
    var c = D.shared.configs[a.i]; if (!c || !c.run || c.base || a.X == null || a.Y == null) return;
    var nm = c.shared_page_label || c.display_name || c.label || '', m = /(\d+)\s+steps?\b/.exec(c.display_name || c.label || '');
    pts.push({ i: a.i, x: a.X, y: a.Y, color: a.color, name: nm, step: m ? parseInt(m[1], 10) : (c.step != null ? +c.step : -1) });
  });
  var none = function () { if (g.parentNode && !g.childNodes.length) g.parentNode.removeChild(g); };
  if (pts.length < 2) { none(); return; }
  var groups; try { groups = Kit.sharedMarkGroups(pts); } catch (e) { none(); return; }
  if (!groups || !groups.length) { none(); return; }
  var words = {};
  groups.forEach(function (grp) {
    var byRun = {}; grp.forEach(function (p) { var rn = runOf(p.name); if (!byRun[rn]) byRun[rn] = p.name; });
    var runs = Object.keys(byRun); if (runs.length < 2) return;
    var toks = runs.map(function (rn) { return rn.split(/\s*[·,]\s*/).map(function (x) { return x.trim(); }).filter(Boolean); });
    
    
    var uniq = toks.map(function (tk, k) { return tk.filter(function (w) { return toks.every(function (o, j) { return j === k || o.indexOf(w) < 0; }); }).join(', '); });
    var diff = toks.map(function (tk, k) { return tk.filter(function (w) { return toks.some(function (o, j) { return j !== k && o.indexOf(w) < 0; }); }).join(', '); });
    var distinct = function (arr) { return arr.every(function (w, k) { return w && arr.indexOf(w) === k; }); };
    var pick = distinct(uniq) ? uniq : distinct(diff) ? diff : null;
    runs.forEach(function (rn, k) {
      if (words[rn]) return;
      var kw = ''; try { kw = Kit.runEndLabelWords(byRun[rn]) || ''; } catch (e) { kw = ''; }
      var w = (pick && pick[k]) || uniq[k] || diff[k] || kw; if (w) words[rn] = w;
    });
  });
  
  
  var fs = EXPORTING ? 17 : 11, h = fs + 2, est = function (t) { return t.length * fs * 0.56; };   
  var right = ML + PW - 2, left = ML + 2, top = MT + fs, bottom = MT + PH - 3, items = [];
  Object.keys(words).forEach(function (rn) {
    var last = null; pts.forEach(function (p) { if (runOf(p.name) === rn && (!last || p.step > last.step)) last = p; });
    if (!last) return;
    var text = words[rn], w = est(text), side = (last.x + 8 + w <= right || last.x - 8 - w < left) ? 1 : -1;
    var tx = last.x + side * 8, x0 = side > 0 ? tx : tx - w;
    items.push({ i: last.i, px: last.x, py: last.y, color: last.color, text: text, side: side, tx: tx, x0: x0, x1: x0 + w, y: Math.min(bottom, Math.max(top, last.y + 4)) });
  });
  if (!items.length) { none(); return; }
  items.sort(function (a, b) { return a.y - b.y || a.px - b.px; });
  var xo = function (a, b) { return a.x0 < b.x1 + 4 && a.x1 + 4 > b.x0; };
  for (var k = 1; k < items.length; k++) for (var j = 0; j < k; j++) if (xo(items[k], items[j]) && items[k].y < items[j].y + h) items[k].y = items[j].y + h;
  for (var k2 = items.length - 1; k2 >= 0; k2--) { if (items[k2].y > bottom) items[k2].y = bottom; for (var j2 = k2 - 1; j2 >= 0; j2--) if (xo(items[k2], items[j2]) && items[j2].y > items[k2].y - h) items[j2].y = items[k2].y - h; }
  var ns = 'http://www.w3.org/2000/svg';
  items.forEach(function (it) {
    if (Math.abs(it.y - 4 - it.py) > fs * 0.6) {
      var ln = document.createElementNS(ns, 'line'); ln.setAttribute('class', 'kit-run-end-lead'); ln.setAttribute('x1', (it.px + it.side * (DR + 1.5)).toFixed(1)); ln.setAttribute('y1', it.py.toFixed(1));
      ln.setAttribute('x2', (it.tx - it.side * 2).toFixed(1)); ln.setAttribute('y2', (it.y - fs * 0.35).toFixed(1)); ln.setAttribute('stroke', it.color); ln.setAttribute('stroke-width', '0.6'); ln.setAttribute('opacity', '0.7'); ln.setAttribute('pointer-events', 'none'); g.appendChild(ln);
    }
    var el = Kit.drawRunEndLabel(g, it.px, it.py, it.text, { color: it.color, size: fs, dx: it.side * 8, dy: it.y - it.py, anchor: it.side > 0 ? null : 'end', bg: '#fcfaf3' });
    if (el) { el.setAttribute('pointer-events', 'none'); el.setAttribute('data-run-end-label', String(it.i)); }
  });
}

function markShape(i) { var c = D.shared && D.shared.configs[i]; if (!c || !c.run || c.base) return 'circle'; var rm = runMarkOf(i); if (rm && rm.shape) return rm.shape; var R = runOf(i); return c.marker || (R && R.marker) || 'circle'; }   
function isRun(i) { var c = D.shared && D.shared.configs[i]; return !!(c && c.run); }
function isDual(i) { for (var k = 0; k < RUNS.length; k++) if (RUNS[k].dual && RUNS[k].dual.indexOf(i) >= 0 && runOnPlane(RUNS[k])) return true; return false; }   
function runOf(i) { var c = D.shared && D.shared.configs[i]; if (!c || !c.run) return null; var ck = c.series || c.run_key; for (var k = 0; k < RUNS.length; k++) if (RUNS[k].key === ck) return RUNS[k]; return RUN; }
function runShown(R) { R = R || RUN; return !!R; }   
function runOnPlane(R) { return runShown(R) && state.src === 'bayes'; }   
function anyRunOnPlane() { return RUNS.some(function (R) { return R.idx.length && runOnPlane(R); }); }
function mainConfigs() { return D.shared.configs.filter(function (c) { return !c.run; }); }
function mainRows() { return D.bay && D.bay.rows ? D.bay.rows.filter(function (r) { return !r.run && !r.alongside; }) : []; }   

var lastMoved = null, lockNote = null, inputNote = null, undrawn = [];
var beyondFrame = 0, beyondArms = [], unresolvedN = 0;   

var partialShownN = 0;   

 



function slugify(name) {
  var s = String(name || '').trim().toLowerCase();
  s = s.replace(/\s*\((?:checkpoint|step)\s*(\d+)\)\s*$/, '-$1').replace(/\s*\(final\)\s*$/, '-final');
  s = s.replace(/[\u00b7()]/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return s;
}
var SLUG_OF = {}, IDX_OF_SLUG = {};
function slugIndex() {   
  SLUG_OF = {}; IDX_OF_SLUG = {};
  
  
  
  D.shared.configs.forEach(function (c, i) { var s = (c.run && !c.base && c.step != null) ? slugify(c.display_name || c.label) : (c.slug || slugify(c.display_name || c.label)); if (IDX_OF_SLUG[s] !== undefined) { s = c.board_id || c.id; } SLUG_OF[i] = s; IDX_OF_SLUG[s] = i; });
}

 
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
  var rnd = mulberry32(20260825), slopes = [], lines = [];   
  for (var b = 0; b < 2000; b++) {   
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
  var ints = lines.map(function (l) { return l[1]; }).sort(function (u, v) { return u - v; });   
  base.aLo = q(ints, pl); base.aHi = q(ints, ph);
  
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



function pctLadder(lo, hi) {   
  var steps = [20, 10, 5, 2, 1, 0.5, 0.2, 0.1, 0.05, 0.02, 0.01], t = [];
  for (var s = 0; s < steps.length; s++) {
    var st = steps[s]; t = [];
    for (var k = Math.floor(lo / st) + 1; k * st < hi; k++) { var v = +(k * st).toFixed(2); if (v > 0 && v < 100) t.push(v); }
    if (t.length >= 3) return t;
  }
  return t;
}
function floorIn(tier, zmin, stepUnder) {   
  var fb = null;
  tier.forEach(function (v) { var zt = logit(v / 100); if (zt <= zmin + 1e-9 && (fb === null || zt > fb.z)) fb = { z: zt, v: v }; });
  if (fb === null && stepUnder && tier.length >= 2) { var st = +(tier[1] - tier[0]).toFixed(2), v0 = +(Math.floor(pct(zmin) / st) * st).toFixed(2); if (v0 > 0) fb = { z: logit(v0 / 100), v: v0 }; }
  return fb;
}
function exportTicks(ax) {   
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
  var LT = EXPORTING ? LOGIT_TICKS_EXPORT : LOGIT_TICKS, zoomed = EXPORTING && LIMX && LIMY;   
  var xt = zoomed ? exportTicks('x') : (state.xs === 'raw' ? RAW_TICKS : LT);
  var yt2 = xOnly ? []
    : (zoomed ? exportTicks('y') : (state.ys === 'raw' ? RAW_TICKS : LT));
  if (NARROW) {   
    var keepL = [1, 5, 20, 50, 80, 95, 99];
    xt = xt.filter(function (v) { return state.xs === 'raw' ? (v % 20 === 0 && v > 0) : keepL.indexOf(v) >= 0; });
    yt2 = yt2.filter(function (v) { return state.ys === 'raw' ? v % 20 === 0 : keepL.indexOf(v) >= 0; });
  }
  var zOf = function (v) {
    return logit(Math.min(0.9999, Math.max(0.0001, v / 100)));
  };
  if (PANEL) {   
    var pick = function (ax, set) { var raw = (ax === 'x' ? state.xs : state.ys) === 'raw'; if (raw) return set; var L = limT(false, ax), lo = pct(L[0]), hi = pct(L[1]);
      var inside = function (s) { return s.filter(function (v) { return v > lo && v < hi; }); };
      var t = inside([1, 5, 20, 50, 80, 95, 99]); if (t.length < 3) t = inside(LOGIT_TICKS); if (t.length < 3) t = inside(LOGIT_TICKS_FINE); if (t.length < 3) t = pctLadder(lo, hi); return t; };
    xt = pick('x', xt); if (!xOnly) yt2 = pick('y', yt2);
    var thin = function (t, pos, gap) { var out = [], last = -Infinity; t.slice().sort(function (p, q) { return pos(p) - pos(q); }).forEach(function (v) { var x = pos(v); if (x - last >= gap(v)) { out.push(v); last = x; } }); return out; };
    xt = thin(xt, function (v) { return sx(zOf(v)); }, function (v) { return (String(v).length + 1) * FS * 0.62 + 4; });
    yt2 = thin(yt2, function (v) { return -sy(zOf(v)); }, function () { return FS + 3; });
  }
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
  if (SPAN && !xOnly && (state.ys !== 'raw' || state.yq === 'ent')) {   
    var Ls = limT(false, 'y'), yTick = function (zs, label) { g += '<line x1="' + ML + '" y1="' + sy(zs) + '" x2="' + (ML + PW) + '" y2="' + sy(zs) + '" stroke="#e0d9c8" stroke-width="0.6"/>' + '<text x="' + (ML - 6) + '" y="' + (sy(zs) + Math.round(FS / 3)) + '" text-anchor="end" fill="#52514e" font-size="' + FS + '" data-role="tick">' + label + '</text>'; };
    if (entLog()) {
      var coarse = [0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5], fine = [0.001, 0.0015, 0.002, 0.003, 0.005, 0.007, 0.01, 0.015, 0.02, 0.03, 0.05, 0.07, 0.1, 0.15, 0.2, 0.3, 0.5, 0.7];
      var inside = function (lad) { return lad.filter(function (hv) { var zs = LIM[0] + entPos(hv); return zs > Ls[0] + 1e-9 && zs < Ls[1] - 1e-9; }); };
      var ladder = inside(coarse).length >= 3 ? inside(coarse) : inside(fine);   
      ladder.forEach(function (hv) { yTick(LIM[0] + entPos(hv), String(hv)); });
    } else {
      var wid = Ls[1] - Ls[0], want = wid / (NARROW ? 4 : 6), stepS = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5].filter(function (v) { return v >= want; })[0] || 5, dec = stepS < 0.1 ? 2 : stepS < 1 ? 1 : 0;
      for (var ki = Math.ceil((Ls[0] - LIM[0]) / stepS - 1e-9); ki * stepS <= Ls[1] - LIM[0] + 1e-9; ki++) {
        var ks = +(ki * stepS).toFixed(6), zs = LIM[0] + ks; if (zs <= Ls[0] + 1e-9 || zs >= Ls[1] - 1e-9) continue;
        yTick(zs, ks.toFixed(dec));
      }
    }
    yt2 = [];
  }
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







function axisShort(axis) {   
  if (axis === 'x' && isCap()) return CAP_KEYS[state.xdef].name();
  
  return dName(axis) + (state.def === 'median' ? ' (median task)' : '');
}


function dName(axis) {
  if (axis === 'y' && SPAN) { if (state.yq === 'ent') return 'Entropy over logit difficulty, ' + edWord() + ' (nats)'; var en = spanEndNames(); return en[1] + ' \u2212 ' + en[0] + (state.ys === 'raw' ? ' (percentage points of the difficulty scale)' : ' (logit)'); }   
  var lev = axis === 'x' ? +state.a : +state.c;
  return 'D' + fmtLev(100 - lev);
}
function fmtLev(v) { return String(+(+v).toFixed(2)); }
function axisName(axis) {
  if (axis === 'y' && SPAN && state.yq === 'ent') return 'Average outcome entropy: the Shannon entropy of the fitted failure rate, \u2212p ln p \u2212 (1 \u2212 p) ln(1 \u2212 p) in nats, integrated over the logit difficulty axis with the ' + edWord() + ' prior\u2019s density on the logit space as the weight (Uniform \u03c3(1 \u2212 \u03c3), Jeffreys \u221a(\u03c3(1 \u2212 \u03c3)), Haldane flat), over the difficulty scale 0 to 100%';
  if (axis === 'y' && SPAN) { var enn = spanEndNames(); return enn[1] + ' \u2212 ' + enn[0] + ': ' + (state.ys === 'raw' ? 'the distance in percentage points of the difficulty scale (0 to 100%) between the ' + fmtLev(state.c) + '% failure crossing (' + enn[0] + ') and the ' + fmtLev(state.u) + '% crossing (' + enn[1] + ')' : 'the difficulty span from the ' + fmtLev(state.c) + '% failure crossing (' + enn[0] + ') to the ' + fmtLev(state.u) + '% crossing (' + enn[1] + '), in logit units of the scale'); }
  if (axis === 'x' && isCap())
    return 'Capability C — mean solve chance on the calibrated pool '
      + '(metrics-report definition, counting estimator; ' + CAP_KEYS[state.xdef].clause() + ')';
  if (state.src === 'bayes') {
    var blev = axis === 'x' ? +state.a : +state.c;
    if (state.def !== 'average')
      return 'D' + (100 - blev) + ' (median task, posterior median)';
    
    
    
    
    
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



var TRK = { x0: ML, x1: ML + PW, y: 18,          
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
    + TRK.y + '" r="' + (NARROW ? 16 : 12) + '" fill="transparent"/>'
    + '<circle class="knob" data-knob="c" pointer-events="none" cx="' + xc
    + '" cy="' + TRK.y + '" r="5" fill="#fcfaf3" stroke="' + ink
    + '" stroke-width="1.6"/>' + (held('c') ? heldRing('c', xc, ink) : '')
    + '<text data-handle="c" class="handle" x="' + xc + '" y="' + (TRK.y - 6)
    + '" text-anchor="middle" font-size="' + FT + '" fill="' + ink + '">y '
    + state.c + '%</text>'
    + (isCap()
      ? '<text x="' + (TRK.x0 + 6) + '" y="' + (TRK.y + 16) + '" font-size="' + FT + '" fill="#8b8477">no horizontal level (the Capability view is level-free)</text>'
      : '<circle data-handle="a" class="handle" cx="' + xa + '" cy="'
    + TRK.y + '" r="' + (NARROW ? 16 : 12) + '" fill="transparent"/>'
    + '<circle class="knob" data-knob="a" pointer-events="none" cx="' + xa
    + '" cy="' + TRK.y + '" r="5" fill="#fcfaf3" stroke="' + ink + '" stroke-width="1.6"/>' + (held('a') ? heldRing('a', xa, ink) : '')
    + '<text data-handle="a" class="handle" x="' + xa + '" y="' + (TRK.y + 16)
    + '" text-anchor="middle" font-size="' + FT + '" fill="' + ink + '">x '
    + state.a + '%</text>') + '</g>';
}





function updateTrack() {
  var tg = document.getElementById('trackg');
  tg.style.display = '';
  var structure = state.hold + '|' + state.xdef + '|' + (NARROW ? 'n' : 'w');   
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
  if (SPAN && !EXPORTING && !PANEL) {   
    
    
    
    LIMX = null; LIMY = null;
    var pre = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity }, preAdd = function (ax, v) { if (v == null || !isFinite(v)) return; v = clampZ(v); if (ax === 'x') { if (v < pre.x0) pre.x0 = v; if (v > pre.x1) pre.x1 = v; } else { if (v < pre.y0) pre.y0 = v; if (v > pre.y1) pre.y1 = v; } };
    Array.from(sel).filter(function (i) { return !isHidden(i); }).forEach(function (i) {
      var px = reading(i, la, 'x'), py = readingY(i);
      if (px.z == null || py.z == null || px.unresolved || py.unresolved) return;
      preAdd('x', px.z); preAdd('y', py.z);
      if (state.w === 'on') { preAdd('x', px.lo); preAdd('x', px.hi); preAdd('y', py.lo); preAdd('y', py.hi); }
    });
    if (isFinite(pre.x0) && isFinite(pre.y0)) {
      var win = function (lo, hi) { if (hi - lo < 0.5) { var m = (lo + hi) / 2; lo = m - 0.25; hi = m + 0.25; } var pd = (hi - lo) * 0.06; return [Math.max(LIM[0], lo - pd), Math.min(LIM[1], hi + pd)]; };
      var WX = win(pre.x0, pre.x1), WY = win(pre.y0, pre.y1);
      if (state.zoom !== 'fit' && state.yq !== 'ent') {   
        var ux = PW / (WX[1] - WX[0]), uy = PH / (WY[1] - WY[0]);
        var widen = function (B, want) { var m = (B[0] + B[1]) / 2, lo = m - want / 2, hi = m + want / 2; if (lo < LIM[0]) { hi += LIM[0] - lo; lo = LIM[0]; } if (hi > LIM[1]) { lo -= hi - LIM[1]; hi = LIM[1]; } return [Math.max(LIM[0], lo), Math.min(LIM[1], hi)]; };
        if (ux < uy) WY = widen(WY, PH / ux); else if (uy < ux) WX = widen(WX, PW / uy);
      }
      LIMX = WX; LIMY = WY;
    }
  }
  var out = axisGrid();
  var clipAt = out.length; EXT = null;   
  
  var dg = '', GX = LIMX || LIM, GY = LIMY || LIM, G0 = Math.max(GX[0], GY[0]), G1 = Math.min(GX[1], GY[1]);
  
  var zoomedExport = EXPORTING && LIMX && LIMY;
  for (var t = 0; t <= 40 && G1 > G0 && !zoomedExport && !SPAN; t++) {
    var z = G0 + (G1 - G0) * t / 40;
    dg += (t ? 'L' : 'M') + sx(z).toFixed(1) + ' ' + sy(z).toFixed(1);
  }
  if (dg) out += '<path d="' + dg + '" fill="none" stroke="#cfc5ac" '
    + 'stroke-width="0.8" stroke-dasharray="3.3 2.7"/>';

  var visible = Array.from(sel).filter(function (i) { return !isHidden(i); }).sort(function (a, b) { return a - b; });   
  var drawnArms = [];   

  
  
  
  
  
  if (state.kp === 'on' && !isCap()) {
    var K = state.a / state.c;
    var tgrid = state.src === 'bayes' ? D.bay.lev_logit
                                      : D.avg.lev_grid;
    var trails = '';
    visible.forEach(function (i) {
      var cc = D.shared.configs[i];
      var tp = '', pen = false;
      for (var ti = 0; ti < tgrid.length; ti += 2) {
        var pxl = pct(tgrid[ti]);            
        var pyl = pxl / K;                   
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
  
  
  
  if (state.lad === 'on' && !isCap()) {
    var lads = '', LN = 26;
    visible.forEach(function (i) {
      var cc2 = D.shared.configs[i];
      var rx0 = reading(i, la, 'x');
      if (rx0.kind !== 'point' || rx0.z == null) return;
      var X0 = sx(clampZ(rx0.z));
      var lp = '', pen = false;
      for (var li = 0; li < LN; li++) {
        var kk = Math.pow(2, li / (LN - 1) * Math.log2(K_LADDER_MAX));   
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

  var fx = [], fy = [], fsig = [], fl = [], fcol = [], marks = ''; undrawn = []; beyondFrame = 0; beyondArms = []; partialShownN = 0; unresolvedN = 0;
  function edgeCoord(r, axis) {   
    if (!r.unresolved) return r.z == null ? null : (axis === 'x' ? sx(clampZ(r.z)) : sy(clampZ(r.z)));
    var lo = r.side === 'lower';
    if (axis === 'x') return lo ? ML - Math.min(7, ML - DR - 1) : ML + PW + Math.min(7, MR - DR - 1);
    return lo ? MT + PH + Math.min(7, MB - DR - 1) : MT - Math.min(7, MT - DR - 1);
  }
  var moves = '', moveN = 0; D.moves = {};   
  visible.forEach(function (i) {
    var c = D.shared.configs[i];
    var part = isPartial(i), col = part ? '#8b8477' : c.color;   
    var rx = reading(i, la, 'x'), ry = SPAN ? readingY(i) : reading(i, lc, 'y');
    if (rx.unresolved || ry.unresolved) {   
      unresolvedN++;
      var eX = edgeCoord(rx, 'x'), eY = edgeCoord(ry, 'y');
      if (eX == null || eY == null) { undrawn.push(c.label + ' (' + ((rx.z == null && !rx.unresolved ? rx.extra : ry.extra) || 'no crossing at this pair') + ')'); return; }
      marks += '<g opacity="' + (part ? 0.45 : 0.75) + '" data-i="' + i + '">'
        + '<circle class="hit" data-export="omit" cx="' + eX.toFixed(1) + '" cy="' + eY.toFixed(1) + '" r="' + (NARROW ? 15 : 9) + '" fill="transparent" stroke="none"/>'
        + '<path d="' + markPath(markShape(i), eX, eY, DR) + '" fill="none" stroke="' + col + '" stroke-width="1.3" stroke-dasharray="2 1.6" data-mark data-chain-val data-shape="unresolved" data-i="' + i + '"/>'
        + '</g>';
      return;
    }
    if (rx.z == null || ry.z == null) { undrawn.push(c.label + ' (' + ((rx.z == null ? rx.extra : ry.extra) || 'no ' + (state.def === 'average' ? 'average-rate' : 'median-task') + ' crossing at this pair: the level lies outside this model\u2019s observed range') + ')'); return; }
    if (rx.z > LIM[1] || rx.z < LIM[0]) { rx = Object.assign({}, rx, { kind: rx.z > LIM[1] ? 'hi-bound' : 'lo-bound', beyond: true }); }   
    if (ry.z > LIM[1] || ry.z < LIM[0]) { ry = Object.assign({}, ry, { kind: ry.z > LIM[1] ? 'hi-bound' : 'lo-bound', beyond: true }); }
    if (rx.beyond || ry.beyond) { beyondFrame++; beyondArms.push(i); }   
    if (part) partialShownN++;
    var X = sx(clampZ(rx.z)), Y = sy(clampZ(ry.z));
    extAdd(clampZ(rx.z), clampZ(ry.z));
    var full = rx.kind === 'point' && ry.kind === 'point';
    drawnArms.push({ i: i, id: c.id, label: c.display_name || c.label, color: col, x: rx.z, y: ry.z, kindX: rx.kind, kindY: ry.kind, point: full, beyond: !!(rx.beyond || ry.beyond), open: !!c.think, run: !!c.run, partial: part, X: X, Y: Y });   
    if (full && state.src === 'bayes' && state.move === 'on' && D.bayPrev && !isCap() && !SPAN && D.bayPrevById[c.id]) {   
      var pr = D.bayPrevById[c.id], px = readBayesRow(pr, la, D.bayPrev), py = readBayesRow(pr, lc, D.bayPrev);
      if (px.kind === 'point' && py.kind === 'point' && px.z >= LIM[0] && px.z <= LIM[1] && py.z >= LIM[0] && py.z <= LIM[1]) {
        var PX = sx(px.z), PY = sy(py.z), ddx = X - PX, ddy = Y - PY, len = Math.sqrt(ddx * ddx + ddy * ddy);
        var pctOf = function (z) { return 100 / (1 + Math.exp(-z)); }, sg = function (v) { return (v > 0 ? '+' : '') + v.toFixed(1); };
        D.moves[c.id] = { dx: sg(pctOf(rx.z) - pctOf(px.z)), dy: sg(pctOf(ry.z) - pctOf(py.z)) };
        if (len >= 3) {
          extAdd(px.z, py.z);
          var ux = ddx / len, uy = ddy / len, hx = X - ux * (DR + 1), hy = Y - uy * (DR + 1);   
          moves += '<line x1="' + PX.toFixed(1) + '" y1="' + PY.toFixed(1) + '" x2="' + (hx - ux * 5).toFixed(1) + '" y2="' + (hy - uy * 5).toFixed(1) + '" stroke="' + col + '" stroke-width="1.2" opacity="0.6" data-move data-i="' + i + '"/>'
            + '<path d="M' + hx.toFixed(1) + ' ' + hy.toFixed(1) + 'L' + (hx - ux * 7 + uy * 3.2).toFixed(1) + ' ' + (hy - uy * 7 - ux * 3.2).toFixed(1) + 'L' + (hx - ux * 7 - uy * 3.2).toFixed(1) + ' ' + (hy - uy * 7 + ux * 3.2).toFixed(1) + 'Z" fill="' + col + '" opacity="0.6" data-move/>';
          moveN++;
        }
      }
    }
    var fade = full ? 1 : 0.4;
    var flg = armFlag(i);
    if (flg) fade = 0.3;   
    if (c.gates_failed) fade = Math.min(fade, 0.55);   
    if (part) fade = Math.min(fade, 0.45);
    var standIn = false, fitEx = false;   
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
      
      
      
      if (rx.hi_open && rx.hi != null)
        openMarks += '<path d="M' + sx(clampZ(rx.hi)).toFixed(1) + ' '
          + Y.toFixed(1) + 'm-1 -4l4 4l-4 4" fill="none" stroke-linejoin="round" stroke-linecap="round" stroke="'
          + col + '" stroke-width="1.3"/>';
      if (ry.hi_open && ry.hi != null)
        openMarks += '<path d="M' + X.toFixed(1) + ' '
          + sy(clampZ(ry.hi)).toFixed(1)
          + 'm-4 1l4 -4l4 4" fill="none" stroke-linejoin="round" stroke-linecap="round" stroke="'
          + col + '" stroke-width="1.3"/>';
      if (rx.lo_open && rx.lo != null)
        openMarks += '<path d="M' + sx(clampZ(rx.lo)).toFixed(1) + ' '
          + Y.toFixed(1) + 'm1 -4l-4 4l4 4" fill="none" stroke-linejoin="round" stroke-linecap="round" stroke="'
          + col + '" stroke-width="1.3"/>';
      if (ry.lo_open && ry.lo != null)
        openMarks += '<path d="M' + X.toFixed(1) + ' '
          + sy(clampZ(ry.lo)).toFixed(1)
          + 'm-4 -1l4 4l4 -4" fill="none" stroke-linejoin="round" stroke-linecap="round" stroke="'
          + col + '" stroke-width="1.3"/>';
    }
    
    
    
    var Xs = X.toFixed(1), Ys = Y.toFixed(1), mark;
    if (full || rx.kind === 'censored-partial'
        || ry.kind === 'censored-partial') {
      var shp = markShape(i);
      mark = '<path d="' + markPath(shp, X, Y, DR) + '" fill="'
        + (c.think ? '#fcfaf3' : col) + '" stroke="'
        + (c.think ? col : '#fcfaf3')
        + '" stroke-width="1.3" data-mark data-chain-val data-shape="' + shp + '"' + (c.run ? ' data-run="' + String(c.series || '').replace(/[^a-z0-9._-]/gi, '') + '" data-arm="' + String(c.id).replace(/[^a-z0-9._\/-]/gi, '') + '"' : '') + ((c.run && (runMarkOf(i) || {}).dot) ? ' data-dot="1"' + (dotColorOf(i) ? ' data-dot-color="' + dotColorOf(i) + '"' : '') : '') + ' data-i="' + i + '"' + (c.provisional ? ' stroke-dasharray="3 2" data-provisional="1"' : '') + '/>'
        + (flg ? '<circle cx="' + X + '" cy="' + Y + '" r="7" fill="none" '
            + 'stroke="#b3261e" stroke-dasharray="2 2" stroke-width="1.2" '
            + 'data-flag/>' : '')
        + ((c.run && (runMarkOf(i) || {}).dot) ? '<circle cx="' + Xs + '" cy="' + Ys + '" r="1.7" fill="' + (dotColorOf(i) || (c.think ? col : '#fcfaf3')) + '" data-dot-mark data-i="' + i + '"/>' : '')
;
    } else {
      var pt = ry.kind === 'hi-bound'
          ? 'm-5 3l5 -8l5 8'
        : ry.kind === 'lo-bound' ? 'm-5 -3l5 8l5 -8'
        : rx.kind === 'hi-bound' ? 'm-3 -5l8 5l-8 5'
                                 : 'm3 -5l-8 5l8 5';
      mark = '<path d="M' + Xs + ' ' + Ys + pt
        + '" fill="none" stroke="' + col
        + '" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" data-mark data-chain-val data-shape="bound"' + (c.run ? ' data-run="' + String(c.series || '').replace(/[^a-z0-9._-]/gi, '') + '" data-arm="' + String(c.id).replace(/[^a-z0-9._\/-]/gi, '') + '"' : '') + ' data-i="' + i + '"' + (c.provisional ? ' stroke-dasharray="3 2" data-provisional="1"' : '') + '/>';
    }
    mark += (standIn ? '<circle cx="' + X + '" cy="' + Y + '" r="8" fill="none" stroke="#8b8477" stroke-dasharray="3 2" stroke-width="1.1" data-standin/>' : '')
      + (fitEx ? '<circle cx="' + X + '" cy="' + Y + '" r="9" fill="none" stroke="#8b8477" stroke-dasharray="1.5 2.5" stroke-width="1.2" data-fitexcluded/>' : '');   
    marks += '<g opacity="' + fade + '" data-i="' + i + '">'
      + '<circle class="hit" data-export="omit" cx="' + Xs + '" cy="' + Ys + '" r="' + (NARROW ? 15 : 9) + '" fill="transparent" stroke="none"/>'
      + (d ? '<path d="' + d + '" fill="none" stroke="' + col
      + '" stroke-width="1.1" opacity="0.55" data-chain-val/>' : '')
      + openMarks + mark + '</g>';
    if (full && !fitEx && !part && !isRun(i) && !SPAN) {   
      fx.push(FX(rx.z)); fy.push(FY(ry.z)); fl.push(c.label); fcol.push(col);   
      
      
      
      var zx = (state.src === 'bayes' || isCap()) ? 1.2816 : 1.96;
      var zy = state.src === 'bayes' ? 1.2816 : 1.96;
      var hwx = Math.max(rx.lo != null && !rx.lo_open ? Math.abs(FX(rx.z) - FX(rx.lo)) : -1,   
                         rx.hi != null && !rx.hi_open ? Math.abs(FX(rx.hi) - FX(rx.z)) : -1);
      var hwy = Math.max(ry.lo != null && !ry.lo_open ? Math.abs(FY(ry.z) - FY(ry.lo)) : -1,
                         ry.hi != null && !ry.hi_open ? Math.abs(FY(ry.hi) - FY(ry.z)) : -1);
      fsig.push(hwx >= 0 && hwy >= 0 ? [hwx / zx, hwy / zy] : null);
    }
  });

  
  
  
  
  D.spanFits = [];
  if (SPAN && (state.ys !== 'raw' || state.yq === 'ent')) {   
    var pop = drawnArms.filter(function (a) { return a.point && !a.partial && !a.run; }).map(function (a) { var c = D.shared.configs[a.i]; return { x: a.x, y: a.y - LIM[0], think: !!c.think }; });
    var sfOut = '';
    [['fa', 'all', 'all shown models', function () { return true; }, '', '#8b8477'], ['ft', 'think', 'thinking models', function (q) { return q.think; }, '7 3.5', '#3f3d3a'], ['fn', 'plain', 'non-thinking models', function (q) { return !q.think; }, '1.6 2.6', '#3f3d3a']].forEach(function (T) {
      if (state[T[0]] !== 'on') return;
      var sub = pop.filter(T[3]); if (sub.length < 3) { D.spanFits.push({ key: T[1], label: T[2], n: sub.length, fit: null }); return; }
      var xs = sub.map(function (q) { return q.x; }), ys = sub.map(function (q) { return q.y; });
      var fk = ['span', T[1], state.yq, state.ed, state.ys, state.src, state.def, state.xdef, state.a, state.c, state.u, D.dsId, Array.from(sel).join('.')].join('|');   
      var f = null; try { f = bootFit(xs, ys, fk, null, 0.15); } catch (e) { f = null; }
      D.spanFits.push({ key: T[1], label: T[2], n: sub.length, fit: f });
      if (!f) return;
      var gx0 = Math.min.apply(null, xs) - 0.15, gx1 = Math.max.apply(null, xs) + 0.15, pth = '';
      for (var tq = 0; tq <= 24; tq++) { var zx = gx0 + (gx1 - gx0) * tq / 24; pth += (tq ? 'L' : 'M') + sx(clampZ(zx)).toFixed(1) + ' ' + sy(clampZ(LIM[0] + f.a + f.b * zx)).toFixed(1); }
      sfOut += '<path d="' + pth + '" fill="none" stroke="' + T[5] + '" stroke-width="1.4"' + (T[4] ? ' stroke-dasharray="' + T[4] + '"' : '') + ' data-chain-val data-spanfit="' + T[1] + '"/>';
    });
    if (sfOut) out += '<g id="spanfits">' + sfOut + '</g>';
  }
  
  var fitNum = '';   
  var fitTxt = 'fit: needs 3+ ' + (state.src === 'bayes'
    ? 'in-range posterior dots' : 'fully measured dots');
  var sweeping = dragActive || !!playTimer;
  var headFit = null, headN = 0;
  if (fx.length >= 3) {
    var fkey = [state.def, state.src, state.wd, state.xdef, state.fitci, state.line, state.xs, state.ys, state.lw,
                state.a, state.c, D.dsId, Array.from(sel).join('.')].join('|');
    
    
    
    var hx = fx, hy = fy, hsig = null, hl = fl, hc = fcol, dropped = 0;
    if (state.fitci === 'honest' || state.lw === 'bands') {   
      hx = []; hy = []; hsig = []; hl = []; hc = [];
      for (var qi = 0; qi < fx.length; qi++) {
        if (fsig[qi]) { hx.push(fx[qi]); hy.push(fy[qi]); hsig.push(fsig[qi]); hl.push(fl[qi]); hc.push(fcol[qi]); }
        else dropped++;
      }
    }
    
    
    
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
      if (state.line !== 'off') {   
      
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
      
      fitNum = 'slope ' + f.b.toFixed(2) + ' [' + f.lo.toFixed(2) + ', ' + f.hi.toFixed(2) + '], R ' + f.r.toFixed(2);
      fitTxt = 'line ' + spaceTxt + ' over ' + hx.length + (state.src === 'bayes' ? ' in-range posterior-median dots' : ' fully measured dots') + '; ' + modeTxt
        + (inAxes() ? '; intercept ' + fmtY(f.a) : '')
        + (state.resid === 'on' ? '; misses: typical ' + RS.rmsPct.toFixed(1) + '% of the y scale, largest ' + sgn(RS.bigPct) + '% (' + RS.bigLabel + '), ' + RS.w5 + ' of ' + RS.n + ' models within \u00b15%, ' + RS.w10 + ' within \u00b110%' : '')
        + (state.line === 'off' ? ' (not drawn: Fitted line is Off)' : '');
      headFit = f; headN = hx.length;
    }
  }
  if (!PANEL) { headline(headN, headFit, fx.length, sweeping); fitCaption(headFit, headN); }
  
  
  var pfs = NARROW ? 15 : Math.round(14 * Math.max(1, UPX)), pfs2 = NARROW ? 12 : Math.round(12 * Math.max(1, UPX)), plx = ML + 8, ply = MT + 8;   
  if (!PANEL) refreshBeyondChips();
  var drawnN = visible.length - undrawn.length - beyondArms.length - unresolvedN, totalN = D.shared.configs.length;
  
  
  
  
  
  var pl1 = f ? 'slope ' + f.b.toFixed(2) + ' [' + f.lo.toFixed(2) + ', ' + f.hi.toFixed(2) + ']\u2003R: ' + f.r.toFixed(2) : (sweeping ? 'fit paused while the levels move' : NARROW ? 'no fit: under 3 fully measured models' : 'no fit: fewer than three fully measured models');
  var pl2 = f ? '' : (drawnN + ' of ' + totalN + ' models drawn');
  var pl3 = '';
  var plw = Math.max(pl1.length * pfs, pl2.length * pfs2, pl3.length * pfs2) * 0.56 + 18, plh = (pfs + 6) + ((pl2 || pl3) ? (pl3 ? 2 : 1) * (pfs2 + 4) : 0) + 8;
  var plMax = W - MR - plx - 4; if (plw > plMax) { var shrink = plMax / plw; pfs = Math.max(Math.ceil(11 * UPX), Math.floor(pfs * shrink)); pfs2 = Math.max(Math.ceil(11 * UPX), Math.floor(pfs2 * shrink)); plw = plMax; plh = (pfs + 6) + ((pl2 || pl3) ? (pl3 ? 2 : 1) * (pfs2 + 4) : 0) + 8; }
  out += (true ? '' : '<g id="fitpanel" data-critical-text data-export="omit" data-chain-val="def src xdef fitci line xs ys s l sel" pointer-events="none">'   
    + '<rect x="' + plx + '" y="' + ply + '" width="' + plw.toFixed(0) + '" height="' + plh + '" rx="6" fill="#fcfaf3" fill-opacity="0.94" stroke="#d9d2c2"/>'
    + '<text x="' + (plx + 9) + '" y="' + (ply + pfs + 4) + '" font-size="' + pfs + '" fill="#1f1e1b" font-weight="600" style="font-variant-numeric:tabular-nums">' + pl1 + '</text>'
    + (pl2 ? '<text x="' + (plx + 9) + '" y="' + (ply + pfs + pfs2 + 9) + '" font-size="' + pfs2 + '" fill="#52514e" style="font-variant-numeric:tabular-nums">' + pl2 + '</text>' : '')
    + (pl3 ? '<text x="' + (plx + 9) + '" y="' + (ply + pfs + 2 * pfs2 + 14) + '" font-size="' + pfs2 + '" fill="#52514e">' + pl3 + '</text>' : '')
    + '</g>')
    
    + (f && RS && state.resid === 'on' && state.line !== 'off' ? residPanel(RS, hc, plx, ply + plh + 6) : '')
    
  
  
  
  if (EXPORTING) out = out.slice(0, clipAt) + '<clipPath id="expclip' + (PANEL ? '-p' + PANEL.idx : '') + '"><rect x="' + ML + '" y="' + MT + '" width="' + PW + '" height="' + PH + '"/></clipPath>'
    + '<g clip-path="url(#expclip' + (PANEL ? '-p' + PANEL.idx : '') + ')">' + out.slice(clipAt) + '</g>';   
  
  
  var tyx = EXPORTING ? (PANEL ? 20 : 44) : NARROW ? 11 : 15, tfs = EXPORTING ? (PANEL ? PANEL_EXPORT_TITLE_PX : EXPORT_TITLE_PX) : NARROW ? 13 : Math.max(FS + 1, Math.ceil(13 * UPX));   
  var ytt = axisShort('y'), tfsY = tfs;   
  if (EXPORTING && !PANEL) { var needY = ytt.length * tfs * 0.56; if (needY > PH * 0.96) tfsY = Math.max(28, Math.floor(tfs * PH * 0.96 / needY)); }
  out += '<text x="' + (ML + PW / 2) + '" y="' + (H - 6)
    + '" text-anchor="middle" fill="#52514e" font-size="' + tfs + '"' + (EXPORTING && !PANEL ? ' font-weight="700"' : '') + ' data-role="axis-title" '
    + 'data-chain-val="def src">' + fitTitle(axisShort('x'), W - 20, tfs) + '</text>'
    + '<text x="' + tyx + '" y="' + (MT + PH / 2) + '" text-anchor="middle" '
    + 'fill="#52514e" font-size="' + tfsY + '"' + (EXPORTING && !PANEL ? ' font-weight="700"' : '') + ' transform="rotate(-90 ' + tyx + ' '
    + (MT + PH / 2) + ')" data-role="axis-title" data-chain-val="def src">' + ytt + '</text>';
  if (moveN) out += '<text x="' + (ML + 8) + '" y="' + (MT + PH - 8) + '" font-size="' + (NARROW ? 12 : 11) + '" fill="#52514e" data-chain-val="src move">arrows: moves from ' + prevFitName() + '</text>';
  var pid = PANEL ? '-p' + PANEL.idx : '';   
  var body = (moveN ? '<g id="moves' + pid + '">' + moves + '</g>' : '') + '<g id="marks' + pid + '">' + marks + '</g>';
  if (PANEL) { out += '<text x="' + (ML + PW - 4) + '" y="' + (MT + 11) + '" text-anchor="end" font-size="' + (EXPORTING ? PANEL_EXPORT_TICK_PX : FT) + '" fill="#52514e" data-count>n = ' + drawnN + '</text>'; PANEL.drawn = drawnN; }
  else if (EXPORTING) out += '<text x="' + (ML + PW - 6) + '" y="' + (MT + PH - 10) + '" text-anchor="end" font-size="' + EXPORT_TICK_PX + '" fill="#52514e" data-count>n = ' + drawnN + '</text>';   
  (PANEL ? PANEL.g : document.getElementById('plotg')).innerHTML = out + (EXPORTING ? '<g clip-path="url(#expclip' + (PANEL ? '-p' + PANEL.idx : '') + ')">' + body + '</g>' : body);
  if (END_LABELS) runEndLabels(drawnArms, pid);   
  fireDrawn(drawnArms, la, lc);   
  if (PANEL) return;   
  (function () { var fp = document.getElementById('fitpanel'); if (fp) fp.remove(); })();   
  updateTrack();

  
  
  if (!EXPORTING && !NO_RATCHET) ['headline', 'narrate', 'notes', 'fitline', 'kBound', 'vocabnote', 'framebar'].forEach(function (id) {   
    var el = document.getElementById(id); if (!el) return;
    if (sweeping) { if (!el.style.height) { el.style.height = el.offsetHeight + 'px'; el.style.overflow = 'hidden'; } }
    else {
      el.style.height = ''; el.style.overflow = '';
      
      
      var h = el.offsetHeight; if (h > (el._ratchet || 0)) { el._ratchet = h; el.style.minHeight = h + 'px'; }
    }
  });
  var fitEl = document.getElementById('fitline') || document.createElement('div');   
  fitEl.innerHTML =
    (fitNum ? '<div class="kit-readout" data-chain-val="def src xdef fitci">' + fitNum + '</div>' : '')
    + '<span data-chain-val="def src xdef">' + fitTxt + '</span>'
    + ' <span style="color:#8b8477">· an open chevron: a crossing at the scale\u2019s end (a bound), pointing to the side it lies beyond, drawn with its band and out of the fit · an open whisker end marks a band that runs past the scale</span>';   
  narrate(visible, fx.length);
  vocabNote();
  notes();
  stamp();
  paintChips();
  var k = state.a / state.c;
  
  
  
  document.getElementById('kOut').textContent =
    isCap() ? 'K n/a (the Capability view is level-free)'
      : 'K = ' + (k >= 100 ? k.toFixed(0) : k.toFixed(1));
  var kb = document.getElementById('kBound');
  var slotNotes = [inputNote, lockNote].filter(Boolean).join(' \u00b7 ');
  if (kb) kb.textContent = slotNotes ? slotNotes : isCap() ? ''
    : Math.abs(k - 1) <= 1e-6 ? 'K at 1\u00d7: the levels coincide' : k < 1 ? 'K below 1\u00d7: the horizontal level lies under the vertical level' : '';   
}


 
function tableAt(lt, levLogit) {   
  var LV = D.bay && (D.bay.lev_logit || (D.bay.lev_fail || []).map(logit)); if (!lt || !LV || !LV.length) return null;
  if (levLogit < LV[0] - 1e-9 || levLogit > LV[LV.length - 1] + 1e-9) return null;
  var lo_i = 0, hi_i = LV.length - 1;
  while (hi_i - lo_i > 1) { var mm = (lo_i + hi_i) >> 1; if (LV[mm] < levLogit) lo_i = mm; else hi_i = mm; }
  if (lt.kind[lo_i] !== 0 || lt.kind[hi_i] !== 0) return null;
  var t = (levLogit - LV[lo_i]) / (LV[hi_i] - LV[lo_i]);
  var ip = function (a) { return a && a[lo_i] != null && a[hi_i] != null ? a[lo_i] + t * (a[hi_i] - a[lo_i]) : null; };
  return { z: ip(lt.mid), lo: ip(lt.lo), hi: ip(lt.hi) };
}
function ridgeCentre(r, lev) {   
  var t = tableAt(state.def === 'average' ? r.levels_avg : r.levels, logit(lev)); if (t && t.z != null) return t.z;
  var b = state.def === 'average' ? (lev === 0.5 ? r.d50_avg : r.d1_avg) : null; b = b || (lev === 0.5 ? r.d50 : r.d1); return b ? b.median_z : -Infinity;
}
function renderRidges() {
  if (playBtn && !PANEL) { playBtn.disabled = true; playBtn.title = 'the sweep moves the scatter; switch the view back to use it'; }
  var chart = PANEL ? PANEL.svg : document.getElementById('chart');   
  var visible = Array.from(sel).filter(function (i) { return !isHidden(i); }).sort(function (a, b) { return a - b; });   
  var skipped = visible.filter(function (i) { return !D.bayById[D.shared.configs[i].id]; }).length;
  var rows = visible.filter(function (i) { return !!D.bayById[D.shared.configs[i].id]; }).map(function (i) {
    return { i: i, r: D.bayById[D.shared.configs[i].id] };
  }).sort(function (a, b) { return capOrder([a.i, b.i])[0] === a.i ? -1 : 1; });   
  var g = D.bay.kde_grid, avgDef = state.def === 'average';
  





  layout();
  var rh = PANEL ? 18 : 24, RML = PANEL ? Math.round(W * 0.42) : NARROW ? 120 : 195;   
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
  (PANEL ? PANEL.g : document.getElementById('plotg')).innerHTML = out;
  if (PANEL) { PANEL.drawn = rows.length; return; }   
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

 
var exportMounted = false;
function mountExport() {   
  if (exportMounted) return;
  var box = document.getElementById('exportrow'); if (!box || !window.Kit || !Kit.exportButton) return;
  exportMounted = true;
  Kit.exportButton(box, exportOptions);
}
function exportView() {   
  var ds = DATASETS[state.data] || {}, parts = [ds.label || String(state.data || '')];
  parts.push(axisShort('y') + ' against ' + axisShort('x'));
  var sp = function (v) { return v === 'raw' ? 'linear' : 'logit'; };
  parts.push(state.xs === state.ys ? sp(state.xs) + ' axes' : 'horizontal ' + sp(state.xs) + ', vertical ' + sp(state.ys));
  
  return parts.join(' \u00b7 ');
}
function exportLegend() {   
  var rows = [];
  famOrder(Array.from(sel).filter(function (i) { return !isHidden(i); })).forEach(function (i) {   
    var m = (PANEL && PANEL.svg ? PANEL.svg : document).querySelector('#marks' + (PANEL ? '-p' + PANEL.idx : '') + ' path[data-mark][data-i="' + i + '"]'); if (!m) return;   
    var c = D.shared.configs[i], grey = isPartial(i);
    var d = m.getAttribute('d') || '', fill = m.getAttribute('fill') || 'none', stroke = m.getAttribute('stroke') || c.color, sw = m.getAttribute('stroke-width') || '1.3'; var da = m.getAttribute('stroke-dasharray') || '';
    var op = m.parentNode && m.parentNode.getAttribute ? m.parentNode.getAttribute('opacity') : null;
    var dot = m.getAttribute('data-dot') === '1', dotFill = m.getAttribute('data-dot-color') || (fill === '#fcfaf3' ? stroke : '#fcfaf3');   
    var mark = function (cx, cy) {   
      return '<path d="' + d.replace(/^M[-\d.]+ [-\d.]+/, 'M' + cx + ' ' + cy) + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + sw + '"' + (da ? ' stroke-dasharray="' + da + '"' : '') + (op && +op < 1 ? ' opacity="' + op + '"' : '') + '/>'
        + (dot ? '<circle cx="' + cx + '" cy="' + cy + '" r="1.7" fill="' + dotFill + '"/>' : '');
    };
    rows.push({ label: ((c.run && c.shared_page_label) || c.display_name || c.label) + (grey ? ' (partial)' : '') + (c.provisional ? ' (provisional)' : ''), family: famLabel(c.fam), color: grey ? '#8b8477' : c.color, line: false, marker: mark });   
  });
  
  PLANE_HOOKS.legend.forEach(function (fn) { try { (fn() || []).forEach(function (r) { if (r && r.label) rows.push(r); }); } catch (e) { if (window.console) console.warn('plane legend hook', e); } });   
  return rows;
}
function exportOptions() {
  var chart = document.getElementById('chart'), f = D.shared.frame || {}, ds = DATASETS[state.data] || {};
  
  
  
  var tight = state.view !== 'ridges' && EXT && isFinite(EXT.x0) && isFinite(EXT.y0) && isFinite(EXT.x1) && isFinite(EXT.y1) && EXT.x1 >= EXT.x0 && EXT.y1 >= EXT.y0;
  EXPORT_TIER_Y = null; EXPORT_FLOOR_Y = null;
  if (tight) {   
    var padX = Math.max(0.05, (EXT.x1 - EXT.x0) * 0.02), padY = Math.max(0.05, (EXT.y1 - EXT.y0) * 0.02);
    LIMX = [Math.max(LIM[0], EXT.x0 - padX), Math.min(LIM[1], EXT.x1 + padX)];
    LIMY = [Math.max(LIM[0], EXT.y0 - padY), Math.min(LIM[1], EXT.y1 + padY)];
    
    
    
    if (state.ys !== 'raw' && !SPAN) {   
      var lo = pct(LIMY[0]), hi = pct(LIMY[1]), tiers = [LOGIT_TICKS_EXPORT, LOGIT_TICKS_FINE, pctLadder(lo, hi)], pick = null, floor = null;
      for (var ti = 0; ti < tiers.length && !pick; ti++) {
        var isPct = ti === tiers.length - 1, tier = tiers[ti], n = tier.filter(function (v) { return v > lo && v < hi; }).length, fb = floorIn(tier, EXT.y0, isPct);
        var reach = fb ? EXT.y0 - fb.z : 0;   
        if ((n >= 3 && reach <= Math.max(0.15, 0.25 * (EXT.y1 - EXT.y0))) || isPct) { pick = tier; floor = fb; }
      }
      EXPORT_TIER_Y = pick;
      if (floor) { LIMY[0] = Math.max(LIM[0], Math.min(LIMY[0], floor.z - 0.06)); EXPORT_FLOOR_Y = floor.v; }
    }
    
    if (state.xs === state.ys && !(SPAN && state.yq === 'ent')) {   
      var rawB = state.xs === 'raw';
      var spanOf = function (B) { var L = rawB ? [Math.max(0, pct(B[0]) / 100 - 0.02), Math.min(1, pct(B[1]) / 100 + 0.02)] : B; return L[1] - L[0]; };
      var widenTo = function (B, want) {   
        var lo = 0, hi = LIM[1] - LIM[0];
        for (var k = 0; k < 40; k++) { var d = (lo + hi) / 2, C = [Math.max(LIM[0], B[0] - d), Math.min(LIM[1], B[1] + d)]; if (spanOf(C) < want) lo = d; else hi = d; }
        return [Math.max(LIM[0], B[0] - hi), Math.min(LIM[1], B[1] + hi)];
      };
      var sxp = spanOf(LIMX), syp = spanOf(LIMY);
      if (syp / sxp > 2) LIMX = widenTo(LIMX, syp / 2); else if (syp / sxp < 0.5) LIMY = widenTo(LIMY, sxp / 0.5);
    }
    if (state.ys !== 'raw' && !SPAN) {   
      
      var lo2 = pct(LIMY[0]), hi2 = pct(LIMY[1]), have = (EXPORT_TIER_Y || []).filter(function (v) { return v > lo2 && v < hi2; }).length;
      if (have < 2) {
        var tiers2 = [LOGIT_TICKS_EXPORT, LOGIT_TICKS_FINE, pctLadder(lo2, hi2)], pick2 = null;
        for (var tj = 0; tj < tiers2.length && !pick2; tj++) { var n2 = tiers2[tj].filter(function (v) { return v > lo2 && v < hi2; }).length; if (n2 >= 3 || tj === tiers2.length - 1) pick2 = tiers2[tj]; }
        EXPORT_TIER_Y = pick2;
      }
    }
  }
  EXPORTING = true; render();
  var legend = state.view === 'ridges' ? [] : exportLegend();
  
  var restore = function () { EXPORTING = false; LIMX = null; LIMY = null; EXPORT_TIER_Y = null; EXPORT_FLOOR_Y = null; NO_RATCHET = true; try { render(); } finally { NO_RATCHET = false; } };   
  if (window.queueMicrotask) queueMicrotask(restore); else Promise.resolve().then(restore);
  var parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  var pick = function (t) { return (parts.find(function (q) { return q.type === t; }) || {}).value || ''; };
  var slug = String(ds.label || state.data || 'view').split(' (')[0].replace(/\+/g, '-').replace(/[^\w-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return { svg: chart, legend: legend, title: '', page: '', view: '',   
    stamp: '', fileBase: (SPAN ? (state.yq === 'ent' ? 'capability-vs-average-outcome-entropy_' : 'capability-vs-transition-length_') : 'capability-vs-reliability_') + slug + '_' + pick('year') + '-' + pick('month') + '-' + pick('day'), crop: null };   
}


 
var tipPinned = false;
function hoverWire() {
  var box = document.getElementById('chartbox');
  function showFor(ev) {
    var g = ev.target.closest ? ev.target.closest('[data-i]') : null;
    if (!g || state.view !== 'scatter') { if (ev.type === 'pointerdown' || !tipPinned) { tipPinned = false; Kit.tooltip.hide(); } return; }
    if (ev.type === 'pointerdown' && ev.pointerType === 'touch') tipPinned = true;   
    var psvg = g.closest ? g.closest('svg') : null;   
    if (psvg && psvg.dataset && psvg.dataset.p !== undefined && PANELS) { withPanel(PANELS[+psvg.dataset.p], function () { showBody(ev, g); }); return; }
    showBody(ev, g);
  }
  function showBody(ev, g) {
    var i = +g.dataset.i;
    var c = D.shared.configs[i];
    var la = logit(state.a / 100), lc = logit(state.c / 100);
    var rx = reading(i, la, 'x'), ry = SPAN ? readingY(i) : reading(i, lc, 'y');
    function fmt(r) {
      if (r.z == null) return r.unresolved ? 'no number at this level' : 'no reading at this level';   
      var v = fmtPct(r.z);
      if (r.kind === 'lo-bound') return '≤ ' + v;
      if (r.kind === 'hi-bound') return '≥ ' + v;
      var w = (r.lo != null && r.hi != null)
        ? ' [' + fmtPct(r.lo) + ', ' + fmtPct(r.hi) + ']' : '';
      return v + w;
    }
    function fmtSpan(r) {   
      if (r.z == null) return r.unresolved ? 'no number at one end' : 'no reading at one end';
      if (r.ent != null) return (r.kind === 'point' ? '' : '\u2265 ') + r.ent.toFixed(3) + ' nats';
      var v = state.ys === 'raw' ? r.share.toFixed(1) + ' percentage points of the difficulty scale' : r.span.toFixed(2) + ' logit units' + (r.spanLo != null && r.spanHi != null ? ' [' + r.spanLo.toFixed(2) + ', ' + r.spanHi.toFixed(2) + ']' : '');
      return (r.kind === 'point' ? '' : '\u2265 ') + v;
    }
    var fl = armFlag(i), fe = D.shared.fit_excluded && D.shared.fit_excluded[c.id];
    var cf = D.bay && D.bay.disclosures && D.bay.disclosures.cut_flag && D.bay.disclosures.cut_flag[c.id];   
    Kit.tooltip.show(ev.clientX, ev.clientY, [
      { key: c.gates_failed ? '#b3261e' : c.color, value: fmt(rx), label: axisName('x') + (c.gates_failed ? ' \u00b7 flagged fit: ' + (c.gate_flag || 'the fit failed a sampler gate') : '') },
      { key: c.color, value: SPAN ? fmtSpan(ry) : fmt(ry), label: axisName('y') },
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
