/* levels.js — the level controls (the two typed levels, the presets, the fold K slider and chips, the sweep, the hold, the drag on the figure's track) as a module
 * loaded by /capability-vs-reliability/ and by its side-by-side page (the project maintainers' word of 2 Oct 2026 13:0x UK: composition). */
'use strict';

/* render throttle: at most one full render per animation frame
 * (review: per-pointermove full renders + a 200-resample fit per
 * tick caused the drag lag) */
var rafId = 0;
function scheduleRender() {
  if (rafId) return;
  rafId = requestAnimationFrame(function () { rafId = 0; render(); });
}

/* ---------------- level controls (drag + type + preset + play) - */
var elA, elC, playBtn, holdSw = null;
function buildLevels() {
  var box = document.getElementById('levels');
  function num(label, key, val, onset) {
    var lab = document.createElement('label');
    lab.innerHTML = '<b>' + label + '</b> ';
    var inp = document.createElement('input');
    inp.type = 'number'; inp.min = '0.1'; inp.max = '99.5';
    inp.step = 'any'; inp.value = val;
    inp.addEventListener('change', function () {
      var raw = inp.value, n = parseFloat(raw), prevA = state.a, prevC = state.c, prev = state[key];
      var name = key === 'a' ? 'x' : 'y';
      if (raw === '' || !isFinite(n)) {   // refused: keep the previous level and say so
        inputNote = (raw === '' ? 'typed ' + name + ' is empty or not a number' : 'typed ' + name + ' \u201c' + raw + '\u201d is not a level') + '; ' + name + ' kept at ' + prev + '%';
        inp.value = prev; render(); return;
      }
      var v = Math.max(0.1, Math.min(99.5, n));
      inputNote = v !== n ? 'typed ' + name + ' ' + n + '% is outside the 0.1\u201399.5% grid; set to ' + v + '%' : null;
      onset(v);
      var got = state[key];
      if (got !== r2(v)) inputNote = (inputNote ? inputNote + ' \u00b7 ' : '') + 'typed ' + name + ' ' + v + '% became ' + got + '%';
      var other = key === 'a' ? 'y' : 'x', otherPrev = key === 'a' ? prevC : prevA, otherNow = key === 'a' ? state.c : state.a;
      if (otherNow !== otherPrev) inputNote = (inputNote ? inputNote + ' \u00b7 ' : '') + other + ' ' + (otherNow > otherPrev ? 'raised' : 'lowered') + ' to ' + otherNow + '%';
      render();
    });
    lab.appendChild(inp);
    lab.appendChild(document.createTextNode(' %'));
    box.appendChild(lab);
    return inp;
  }
  elA = num('Horizontal level (failure rate)', 'a', state.a, function (v) {
    applyLevel('a', v);
    Kit.state.set('a', String(state.a), '50');
    Kit.state.set('c', String(state.c), '1'); render();
  });
  elC = num('Vertical level (failure rate)', 'c', state.c, function (v) {
    applyLevel('c', v);   // y moves alone (the project maintainers' word of 2026-09-09 : x and y move independently)
    Kit.state.set('a', String(state.a), '50');
    Kit.state.set('c', String(state.c), '1'); render();
  });
  [[50, 1], [50, 5], [20, 1], [50, 20]].forEach(function (p) {
    var b = document.createElement('button');
    b.className = 'preset'; b.dataset.a = String(p[0]); b.dataset.c = String(p[1]);
    b.textContent = 'D' + fmtLev(100 - p[0]) + ' / D' + fmtLev(100 - p[1]);   // the level pair in the project maintainers' names (D50 / D99 at the adopted levels)
    b.title = 'level pair preset: x ' + p[0] + '%, y ' + p[1] + '%';
    b.onclick = function () { setLevels(p[0], p[1]); };
    box.appendChild(b);
  });
  syncPresets();
  playBtn = document.createElement('button');
  playBtn.id = 'playBtn';
  playBtn.textContent = playLabel();
  playBtn.onclick = togglePlay;
  box.appendChild(playBtn);
  var kOut = document.createElement('span');
  kOut.id = 'kOut';
  box.appendChild(kOut);
  var kBound = document.createElement('span');   // fixed-width slot: names a pinned K bound, else blank
  kBound.id = 'kBound';
  box.appendChild(kBound);
  // ---- /sweep fold: hold mode + fold slider + fold chips ----
  var holdMount = document.createElement('span');
  holdMount.id = 'holdMount';
  box.appendChild(holdMount);
  state.hold = 'c'; holdSw = null; Kit.state.set('hold', null, null);   // NO HELD OR LOCKED QUANTITY (the project maintainers' word of 2026-09-09 : no cap on K, no automatic move of y when x moves, no locked K): the two levels are independent inputs; the K slider and chips set x = K × y with y unchanged; ▶ sweeps x alone; a hold= in a link is dropped
  var kl = document.createElement('label');
  kl.innerHTML = '<b>fold K</b> ';
  var ks = document.createElement('input');
  ks.type = 'range'; ks.id = 'kSlider'; ks.min = String(-Math.ceil(Math.log2(K_MAX) * 100) / 100);   // K below 1 (x under y) is a legal pair
  ks.max = String(Math.ceil(Math.log2(K_MAX) * 100) / 100); ks.step = '0.01';  // step-aligned; setK clamps to K_MAX
  ks.value = String(Math.log2(state.a / state.c));
  ks.setAttribute('aria-label', 'fold K, log2 scale');
  ks.style.width = '9rem';
  ks.addEventListener('input', function () {
    setK(Math.pow(2, +ks.value)); scheduleRender();
  });
  ks.addEventListener('change', function () {
    Kit.state.set('a', String(state.a), '50');
    Kit.state.set('c', String(state.c), '1'); render();
  });
  kl.appendChild(ks);
  box.appendChild(kl);
  K_CHIPS.forEach(function (kk) {
    var b = document.createElement('button');
    b.className = 'preset kchip';
    b.textContent = kk + '\u00d7';
    b.title = 'set the fold K = ' + kk;
    b.onclick = function () {
      setK(kk);
      Kit.state.set('a', String(state.a), '50');
      Kit.state.set('c', String(state.c), '1'); render();
    };
    box.appendChild(b);
  });
}
function clampLev(v) { return Math.max(0.2, Math.min(99.5, v)); }
function r2(v) { return Math.round(v * 100) / 100; }
/* apply a change to level `key` under the active hold mode — the held
 * quantity never moves, the third follows */

function playLabel() {   // what ▶ moves under the current hold (the critic's drive #3: 'K-path' was promised under hold y while x alone moved)
  return '\u25b6 sweep x (y stays)';
}
/* a title that would overrun its band is compacted (parentheticals dropped), then cut with an ellipsis; the full text
 * rides in <title> (the critic's re-drive 09-03: state 3's Capability-C x title overhung the chart edge on both viewports) */
function fitTitle(text, maxUnits, fontSize) {
  var perChar = fontSize * 0.55, full = text;
  if (text.length * perChar > maxUnits) text = text.replace(/\s*\([^)]*\)/g, '');
  if (text.length * perChar > maxUnits) text = text.slice(0, Math.max(8, Math.floor(maxUnits / perChar) - 1)) + '\u2026';
  return text === full ? text : text + '</text><title>' + full.replace(/</g, '&lt;') + '</title><text style="display:none">';
}   // readout-only: which level moved last (hold-K follow narration); the typed-y lock announcement
function applyLevel(key, v, K0) {
  lastMoved = key; if (key === 'a') lockNote = null;
  if (dragActive) inputNote = null;   // a drag supersedes a typed-value message
  v = clampLev(v);
  var K = K0 || (state.a / state.c);
  // RANGES SHRINK (the /sweep rule): the moving level is bounded so K
  // stays within 1x..K_MAX and the follower stays within [0.2, 99.5] —
  // without this, hold-y drags can push K past 50 (or below 1) silently
  // HELD = protected from INDIRECT change (the other handle, the fold
  // slider, play) — never locked against a DIRECT drag or typed value.
  // Moving a held level directly moves it ALONE: the other level stays,
  // K recomputes within 1x..K_MAX (the project maintainers' word of 2 Sep 2026: K holds
  // fixed while other options change, and moves only when moved
  // directly).
  // NO SILENT CEILING (the reference designer's cold run 2026-09-02: typing 95 reverted
  // to 50, a rightward drag was inert): the level being moved is ALWAYS
  // honored; K = x/y stays within 1x..K_MAX by letting the OTHER level
  // yield at a bound (K pinned, named in #kBound) — never by ignoring input.
  if (key === 'a') state.a = v; else state.c = v;   // INDEPENDENT LEVELS (the project maintainers 2026-09-09 ): the moved level moves alone, the other never follows; K = x/y is derived and uncapped
  state.a = r2(state.a); state.c = r2(state.c);
  elA.value = state.a; elC.value = state.c;
}
/* the K slider / fold chips: under hold-c the x level moves, else the
 * y level does (a is the anchor) */
function setK(K) {
  K = Math.max(1 / K_MAX, Math.min(K_MAX, K));
  state.a = r2(clampLev(K * state.c));   // the K slider and chips set x = K × y; y never moves (the project maintainers 2026-09-09)
  elA.value = state.a; elC.value = state.c;
  var ks = document.getElementById('kSlider');
  if (ks) ks.value = Math.log2(state.a / state.c);
}
/* held(key): this level is protected from the OTHER controls; it is still
 * draggable and typable itself (see applyLevel). Visual: a dashed ring. */
function heldRing(key, x, ink) {   // dashed ring = held (protected), still draggable
  return '<circle class="heldring" data-ring="' + key + '" pointer-events="none" cx="' + x + '" cy="' + TRK.y
    + '" r="9" fill="none" stroke="' + ink + '" stroke-width="1" stroke-dasharray="2 2"><title>' + HELD_TIP + '</title></circle>';
}
function held(key) {
  return false;   // nothing is held or locked any more (the project maintainers 2026-09-09 )
}
var HELD_TIP = 'held fixed against the other controls (other handle, fold K, play); drag or type it to move it directly — at the 1x/50x K bound the other level follows';
function syncHoldUI() {
  if (!elA) return;
  if (playBtn && !playTimer) playBtn.textContent = playLabel();
  elA.disabled = isCap();           // level-free x axis: no x level exists
  elC.disabled = false;
  elA.parentElement.title = isCap() ? 'no horizontal level: the Capability view is level-free' : held('a') ? HELD_TIP : '';
  elC.parentElement.title = held('c') ? HELD_TIP : '';
  var ks = document.getElementById('kSlider');
  if (ks && !dragKey) ks.value = Math.log2(state.a / state.c);
}
function setLevels(a, c) {
  lastMoved = null; lockNote = null; inputNote = null;   // a preset/typed pair: nothing 'follows', no lock or typed-value note to announce
  state.a = a; state.c = c;
  elA.value = a; elC.value = c;
  Kit.state.set('a', String(a), '50');
  Kit.state.set('c', String(c), '1');
  render();
}
function togglePlay() {
  if (playTimer) {
    clearInterval(playTimer); playTimer = null;
    playBtn.textContent = playLabel();
    Kit.state.set('a', String(state.a), '50');  // URL once, on stop
    Kit.state.set('c', String(state.c), '1');
    render();                                   // settle: full fit
    return;
  }
  // Play sweeps the FREE quantity under the hold mode (the /sweep fold):
  //   hold K — the level pair slides along the constant-K arcs
  //            (the project maintainers' word of 2026-08-31: the points seen travelling along the paths);
  //   hold x — K runs 1x..K_MAX and every dot rides its vertical ladder;
  //   hold y — x sweeps with K following (dots slide horizontally).
  // NO URL write per tick (review: replaceState floods) — written on stop.
  var K = state.a / state.c, dir = 1;
  var lo = Math.max(0.2, pct(D.shared.reachable.floor_z));
  playBtn.textContent = 'stop the sweep';   // no glyph a headless font may lack; same width class via CSS min-width
  if (state.hold === 'a') {
    var lk = 0;                                   // log2 K phase
    playTimer = setInterval(function () {
      lk += dir * 0.06;
      if (lk >= Math.log2(K_LADDER_MAX)) { dir = -1; lk = Math.log2(K_LADDER_MAX); }
      if (lk <= 0) { dir = 1; lk = 0; }
      setK(Math.pow(2, lk));
      scheduleRender();
    }, 140);
    return;
  }
  if (state.hold === 'c') {
    var aLo = logit(0.2 / 100), aHi = logit(99.5 / 100);   // x sweeps its whole range; y stays (the project maintainers 2026-09-09)
    playTimer = setInterval(function () {
      var cur = logit(state.a / 100), next = cur + dir * 0.12;
      if (next >= aHi) { dir = -1; next = cur; }
      if (next <= aLo) { dir = 1; next = cur; }
      state.a = r2(pct(next)); elA.value = state.a;
      scheduleRender();
    }, 140);
    return;
  }
  var hi = Math.min(99.5 / K, 99.5);            // x = K*y stays <= 99.5
  playTimer = setInterval(function () {
    var cur = logit(state.c / 100), next = cur + dir * 0.12;
    if (next >= logit(hi / 100)) { dir = -1; next = cur; }
    if (next <= logit(lo / 100)) { dir = 1; next = cur; }
    var c = r2(pct(next)), a = r2(Math.min(99.5, K * c));
    if (a < 0.1 || c < 0.1) return;
    state.c = c; state.a = a;
    elC.value = c; elA.value = a;
    scheduleRender();
  }, 140);
}
/* 2026-08-29 rework: the Bayesian level LOCK is gone — the project maintainers'
 * review: dragging levels in the Bayesian source must move the
 * posterior crossings, never switch estimator. Levels are now live
 * in every source; the continuous-level tables carry the readings. */
/* the whisker-widths choice exists in the average-rate frequentist
 * construction ONLY (plain vs design-effect-adjusted). Under the
 * median chain (bootstrap quantiles) and the Bayesian source (80%
 * credible intervals) it is inert — grey it and say why rather than
 * leave a live-looking control that silently does nothing (the
 * bounce's silent-lock class). The stored value still says which
 * width you return to, like def does under bayes. */
function syncXdefLock() {
  var on = isCap();
  var reason = 'the Capability view is level-free — the horizontal level, K paths and '
    + 'the K sweep apply to crossing definitions only';
  if (elA) {
    elA.disabled = on;
    elA.parentElement.style.opacity = on ? .45 : 1;
    elA.parentElement.title = on ? reason : '';
  }
  document.querySelectorAll('#levels .preset').forEach(function (b) {
    b.disabled = on; b.style.opacity = on ? .45 : 1;
    b.title = on ? reason : '';
  });
  if (playBtn) {
    playBtn.disabled = on; playBtn.style.opacity = on ? .45 : 1;
    playBtn.title = on ? reason : '';
  }
  ['kp', 'lad', 'hold'].forEach(function (key) {
    var sw = document.querySelector('.kit-switch[data-key="' + key + '"]');
    if (!sw) return;
    sw.classList.toggle('inert', on);
    sw.title = on ? reason : '';
    sw.querySelectorAll('button').forEach(function (b) { b.disabled = on; });
  });
  var ks2 = document.getElementById('kSlider');
  if (ks2) { ks2.disabled = on; ks2.parentElement.style.opacity = on ? .45 : 1; }
  syncHoldUI();
}
function syncWdLock() {
  var sw = document.querySelector('.kit-switch[data-key="wd"]');
  if (!sw) return;
  var inert = state.src === 'bayes' || state.def === 'median';
  sw.classList.toggle('inert', inert);
  sw.style.display = inert ? 'none' : '';   // a control that cannot apply is absent, not greyed with a hover reason (the critic's 2nd read 09-04); the kit's display rule beats [hidden]
  sw.title = capTitle(!inert ? ''
    : state.src === 'bayes'
      ? 'widths apply to the average-rate frequentist whiskers only '
        + '— whiskers: the fit\u2019s 80% uncertainty band (finite attempts and the spread across tasks)'
      : 'widths apply to the average-rate chain only — median-task '
        + 'whiskers are the quantiles of the bootstrap uncertainty band');
  sw.querySelectorAll('button').forEach(function (b) {
    b.disabled = inert;
  });
}


function foldSweepTools() {   // the /sweep tools (held fixed, fold K slider + K presets, the sweep button, the pinned-bound slot) live behind one
  // closed details at every width; its summary names the current hold so the held quantity stays visible (the critic's 2nd read 09-04: 294 px of the
  // controls column were these tools; the project maintainers 09-03: a held quantity must stay directly movable -- it is, one click away, and never frozen)
  var lv = document.getElementById('levels'); if (!lv || !playBtn || !playBtn.parentNode) return;
  var det = document.getElementById('sweeptools');
  if (!det) {
    det = document.createElement('details'); det.id = 'sweeptools'; det.className = 'about';
    det.innerHTML = '<summary id="sweepsum"></summary>';
    var rowEl = document.createElement('div'); rowEl.className = 'kit-filter-row kit-static'; rowEl.id = 'sweeprow'; det.appendChild(rowEl);
    var hm = document.getElementById('holdMount'); if (hm) rowEl.appendChild(hm);
    lv.querySelectorAll('.preset.kchip').forEach(function (b) { rowEl.appendChild(b); });
    rowEl.appendChild(playBtn);
    var kb = document.getElementById('kBound'); if (kb) rowEl.appendChild(kb);
    lv.appendChild(det);
  }
  var rowEl2 = document.getElementById('sweeprow');   // re-runnable: the fold K slider and K presets are appended after the first render
  var hm2 = document.getElementById('holdMount'); if (hm2 && hm2.parentNode !== rowEl2) rowEl2.appendChild(hm2);
  var ksl2 = document.getElementById('kSlider'), kll = ksl2 && ksl2.closest('label');   // the fold K slider stays visible in the levels block, right above the fold (on phone the fold sits in More controls)
  if (kll) { if (det.parentNode === lv) { if (kll.nextSibling !== det) lv.insertBefore(kll, det); } else if (kll.parentNode !== lv) lv.appendChild(kll); }
  lv.querySelectorAll(':scope > .preset.kchip').forEach(function (b) { rowEl2.appendChild(b); });
  if (playBtn.parentNode !== rowEl2) rowEl2.appendChild(playBtn);
  var kb2 = document.getElementById('kBound'); if (kb2 && kb2.parentNode !== rowEl2) rowEl2.appendChild(kb2);
  var on = document.querySelector('.kit-switch[data-key="hold"] button[aria-pressed="true"]');
  var sum = document.getElementById('sweepsum'), txt = 'Sweep and hold · held fixed: ' + (on ? on.textContent.trim() : ({ k: 'K', a: 'horizontal level', c: 'vertical level' })[state.hold] || state.hold);   // words, never a variable letter
  if (sum && sum.textContent !== txt) sum.textContent = txt;
}

var phoneFolded = false;
function phoneFold() {   // phone (<=600 px): short pill labels; the rarely touched controls fold behind "More controls" -- view, K paths, K ladders,
  // whiskers, whisker widths, fit CI, the level presets and the sweep-tools details (the reference designer's and the critic's 2nd reads 2026-09-04: "three phone
  // screens between the chart and MODELS SHOWN"). Re-runnable: later-built tools fold on the next call; desktop returns at once.
  if (!(window.matchMedia && window.matchMedia('(max-width:600px)').matches)) return;
  var cc = document.getElementById('chartcontrols'); if (!cc) return;
  var more = document.getElementById('morecontrols');
  if (!more) {
    var SHORT = { data: shortMap(), xdef: { crossing: 'D', capC: CAP_KEYS.capC.short, capC_z: CAP_KEYS.capC_z.short, capC_j: CAP_KEYS.capC_j.short }, xs: { logit: 'logit', raw: 'normal' }, ys: { logit: 'logit', raw: 'normal' }, line: { off: 'Off', steps: 'logit', axes: 'axes as set' }, lw: { equal: 'each dot equal', bands: 'by the 80% uncertainty bands' }, resid: { off: 'Off', on: 'On' }, src: { project: 'project', bayes: 'Bayesian' }, def: { average: 'average', median: 'median task' } };
    Object.keys(SHORT).forEach(function (k) { document.querySelectorAll('.kit-switch[data-key="' + k + '"] button').forEach(function (b) { if (SHORT[k][b.dataset.value]) b.textContent = SHORT[k][b.dataset.value]; }); });
    more = document.createElement('details'); more.id = 'morecontrols'; more.className = 'about'; more.innerHTML = '<summary>More controls</summary>';
    var moreRow = document.createElement('div'); moreRow.className = 'kit-filter-row kit-static'; moreRow.id = 'moreswitches'; more.appendChild(moreRow);
    var lvRow = document.createElement('div'); lvRow.className = 'kit-filter-row kit-static'; lvRow.id = 'morelevels'; more.appendChild(lvRow);
    cc.appendChild(more);
  }
  var msw = document.getElementById('moreswitches'), mlv = document.getElementById('morelevels');
  ['view', 'kp', 'lad', 'w', 'wd', 'fitci', 'move'].forEach(function (k) { var sw = document.querySelector('#chartcontrols .kit-switch[data-key="' + k + '"]'); if (sw && sw.parentNode !== msw) msw.appendChild(sw); });
  var lv = document.getElementById('levels');
  if (lv) {
    lv.querySelectorAll('.preset:not(.kchip)').forEach(function (b) { if (b.parentNode !== mlv) mlv.appendChild(b); });
    var st = document.getElementById('sweeptools'); if (st && st.parentNode !== more) more.appendChild(st);   // the fold K slider itself stays in the levels block (rendered, draggable)
  }
  phoneFolded = true;
}


function syncPresets() {   // the preset matching the current level pair reads PRESSED (the project's critic 2026-09-08 on the project maintainers' 09-07 word: no switch without a default): a row of choices shows which one is in force
  document.querySelectorAll('#levels .preset:not(.kchip), #morelevels .preset:not(.kchip)').forEach(function (b) {
    var on = b.dataset.a !== undefined && +b.dataset.a === +state.a && +b.dataset.c === +state.c;
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
}

var dragKey = null;
var dragActive = false;
function wireDrag() {
  var svg = document.getElementById('chart');
  // Chromium ignores touch-action on SVG descendants (the reference designer's fix
  // matrix, 2026-09-02: only the <svg> root and HTML ancestors count), so a
  // vertical finger travel on a handle pans the page and cancels the
  // pointer. Delegated NON-PASSIVE touchstart preventDefault on handles
  // (they re-render as SVG strings, so no per-element listeners); the svg
  // stays touch-action:pan-y so the plot body still scrolls the page.
  svg.addEventListener('touchstart', function (ev) {
    var h = ev.target.closest ? ev.target.closest('[data-handle]') : null;
    if (h && !(h.dataset.handle === 'a' && isCap())) ev.preventDefault();
  }, { passive: false });
  svg.addEventListener('pointerdown', function (ev) {
    var h = ev.target.closest ? ev.target.closest('[data-handle]')
                              : null;
    if (!h) return;
    if (h.dataset.handle === 'a' && isCap()) return;   // no x level under a level-free x axis
    dragKey = h.dataset.handle;
    dragK0 = state.a / state.c;                 // hold-K drags keep this
    dragActive = true;
    svg.setPointerCapture(ev.pointerId);
    ev.preventDefault();
  });
  svg.addEventListener('pointermove', function (ev) {
    if (!dragKey) return;
    var r = svg.getBoundingClientRect();
    var px = (ev.clientX - r.left) / r.width * W;
    var v = Math.round(pct(trkLev(px)) * 10) / 10;
    v = Math.max(0.2, Math.min(99.5, v));
    // NO URL write during drag (replaceState floods stall the
    // page — the review's freeze); URL written once on release
    applyLevel(dragKey, v, dragK0);
    scheduleRender();
  });
  function release(ev) {
    if (!dragKey) return;
    dragKey = null;
    dragActive = false;
    Kit.state.set('a', String(state.a), '50');
    Kit.state.set('c', String(state.c), '1');
    try { svg.releasePointerCapture(ev.pointerId); } catch (e) {}
    render();                    // settle render: full fit
  }
  svg.addEventListener('pointerup', release);
  svg.addEventListener('pointercancel', release);
}

