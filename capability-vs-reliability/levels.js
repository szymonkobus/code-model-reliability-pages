

'use strict';




var rafId = 0;
function scheduleRender() {
  if (rafId) return;
  rafId = requestAnimationFrame(function () { rafId = 0; render(); });
}

 
var elA, elC, elU = null, playBtn, holdSw = null;
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
      var name = key === 'a' ? 'x' : key === 'u' ? 'the upper level' : 'y';
      if (raw === '' || !isFinite(n)) {   
        inputNote = (raw === '' ? 'typed ' + name + ' is empty or not a number' : 'typed ' + name + ' \u201c' + raw + '\u201d is not a level') + '; ' + name + ' kept at ' + prev + '%';
        inp.value = prev; render(); return;
      }
      var v = Math.max(0.1, Math.min(99.5, n));
      inputNote = v !== n ? 'typed ' + name + ' ' + n + '% is outside the 0.1\u201399.5% grid; set to ' + v + '%' : null;
      onset(v);
      var got = state[key]; if (inp._slide) inp._slide.value = got;   
      if (got !== r2(v)) inputNote = (inputNote ? inputNote + ' \u00b7 ' : '') + 'typed ' + name + ' ' + v + '% became ' + got + '%';
      if (key !== 'u') {
      var other = key === 'a' ? 'y' : 'x', otherPrev = key === 'a' ? prevC : prevA, otherNow = key === 'a' ? state.c : state.a;
      if (otherNow !== otherPrev) inputNote = (inputNote ? inputNote + ' \u00b7 ' : '') + other + ' ' + (otherNow > otherPrev ? 'raised' : 'lowered') + ' to ' + otherNow + '%';
      }
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
  elC = num(SPAN ? 'Transition from (failure rate)' : 'Vertical level (failure rate)', 'c', state.c, function (v) {
    applyLevel('c', v);   
    if (SPAN && state.u <= state.c) { state.u = Math.min(99.5, r2(state.c + 0.1)); if (elU) elU.value = state.u; Kit.state.set('u', String(state.u), '99'); }   
    Kit.state.set('a', String(state.a), '50');
    Kit.state.set('c', String(state.c), '1'); render();
  });
  if (SPAN) {   
    elU = num('to (failure rate)', 'u', state.u, function (v) {
      if (v <= state.c) { inputNote = 'the upper level must exceed the lower (' + state.c + '%); kept at ' + state.u + '%'; elU.value = state.u; return; }
      state.u = r2(v); Kit.state.set('u', String(state.u), '99'); render();
    });
    
    var slide = function (inp, key, apply) {
      var rg = document.createElement('input'); rg.type = 'range'; rg.min = '0.2'; rg.max = '99.5'; rg.step = '0.1'; rg.value = String(state[key]); rg.className = 'levslide'; rg.setAttribute('aria-label', (key === 'a' ? 'horizontal level' : key === 'c' ? 'transition from' : 'transition to') + ', failure rate');
      rg.addEventListener('input', function () { var v = +rg.value; apply(v); inp.value = state[key]; scheduleRender(); });
      rg.addEventListener('change', function () { Kit.state.set('a', String(state.a), '50'); Kit.state.set('c', String(state.c), '1'); Kit.state.set('u', String(state.u), '99'); render(); });
      inp.parentNode.appendChild(rg); inp._slide = rg;
    };
    slide(elA, 'a', function (v) { applyLevel('a', v); });
    slide(elC, 'c', function (v) { applyLevel('c', v); if (state.u <= state.c) { state.u = Math.min(99.5, r2(state.c + 0.1)); elU.value = state.u; if (elU._slide) elU._slide.value = state.u; } });
    slide(elU, 'u', function (v) { if (v > state.c) state.u = r2(v); });
  }
  (SPAN ? [[1, 99], [5, 95], [10, 90], [20, 80]] : [[50, 1], [50, 5], [20, 1], [50, 20]]).forEach(function (p) {
    var b = document.createElement('button');
    if (SPAN) {   
      b.className = 'preset'; b.dataset.c = String(p[0]); b.dataset.u = String(p[1]);
      b.textContent = 'D' + fmtLev(100 - p[0]) + ' to D' + fmtLev(100 - p[1]);
      b.title = 'transition preset: from the ' + p[0] + '% failure crossing to the ' + p[1] + '% one';
      b.onclick = function () { state.c = p[0]; state.u = p[1]; if (elC) { elC.value = state.c; if (elC._slide) elC._slide.value = state.c; } if (elU) { elU.value = state.u; if (elU._slide) elU._slide.value = state.u; } Kit.state.set('c', String(state.c), '1'); Kit.state.set('u', String(state.u), '99'); render(); };
      box.appendChild(b); return;
    }
    b.className = 'preset'; b.dataset.a = String(p[0]); b.dataset.c = String(p[1]);
    b.textContent = 'D' + fmtLev(100 - p[0]) + ' / D' + fmtLev(100 - p[1]);   
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
  var kBound = document.createElement('span');   
  kBound.id = 'kBound';
  box.appendChild(kBound);
  
  var holdMount = document.createElement('span');
  holdMount.id = 'holdMount';
  box.appendChild(holdMount);
  state.hold = 'c'; holdSw = null; Kit.state.set('hold', null, null);   
  var kl = document.createElement('label');
  kl.innerHTML = '<b>fold K</b> ';
  var ks = document.createElement('input');
  ks.type = 'range'; ks.id = 'kSlider'; ks.min = String(-Math.ceil(Math.log2(K_MAX) * 100) / 100);   
  ks.max = String(Math.ceil(Math.log2(K_MAX) * 100) / 100); ks.step = '0.01';  
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
  if (SPAN) {   
    [playBtn, kOut, kBound, holdMount, kl].forEach(function (e) { if (e) e.style.display = 'none'; });
    box.querySelectorAll('.kchip').forEach(function (e) { e.style.display = 'none'; });
  }
}
function clampLev(v) { return Math.max(0.2, Math.min(99.5, v)); }
function r2(v) { return Math.round(v * 100) / 100; }



function playLabel() {   
  return '\u25b6 sweep x (y stays)';
}


function fitTitle(text, maxUnits, fontSize) {
  var perChar = fontSize * 0.55, full = text;
  if (text.length * perChar > maxUnits) text = text.replace(/\s*\([^)]*\)/g, '');
  if (text.length * perChar > maxUnits) text = text.slice(0, Math.max(8, Math.floor(maxUnits / perChar) - 1)) + '\u2026';
  return text === full ? text : text + '</text><title>' + full.replace(/</g, '&lt;') + '</title><text style="display:none">';
}   
function applyLevel(key, v, K0) {
  lastMoved = key; if (key === 'a') lockNote = null;
  if (dragActive) inputNote = null;   
  v = clampLev(v);
  var K = K0 || (state.a / state.c);
  
  
  
  
  
  
  
  
  
  
  
  
  
  if (key === 'a') state.a = v; else state.c = v;   
  state.a = r2(state.a); state.c = r2(state.c);
  elA.value = state.a; elC.value = state.c;
}


function setK(K) {
  K = Math.max(1 / K_MAX, Math.min(K_MAX, K));
  state.a = r2(clampLev(K * state.c));   
  elA.value = state.a; elC.value = state.c;
  var ks = document.getElementById('kSlider');
  if (ks) ks.value = Math.log2(state.a / state.c);
}


function heldRing(key, x, ink) {   
  return '<circle class="heldring" data-ring="' + key + '" pointer-events="none" cx="' + x + '" cy="' + TRK.y
    + '" r="9" fill="none" stroke="' + ink + '" stroke-width="1" stroke-dasharray="2 2"><title>' + HELD_TIP + '</title></circle>';
}
function held(key) {
  return false;   
}
var HELD_TIP = 'held fixed against the other controls (other handle, fold K, play); drag or type it to move it directly — at the 1x/50x K bound the other level follows';
function syncHoldUI() {
  if (!elA) return;
  if (playBtn && !playTimer) playBtn.textContent = playLabel();
  elA.disabled = isCap();           
  elC.disabled = false;
  elA.parentElement.title = isCap() ? 'no horizontal level: the Capability view is level-free' : held('a') ? HELD_TIP : '';
  elC.parentElement.title = held('c') ? HELD_TIP : '';
  var ks = document.getElementById('kSlider');
  if (ks && !dragKey) ks.value = Math.log2(state.a / state.c);
}
function setLevels(a, c) {
  lastMoved = null; lockNote = null; inputNote = null;   
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
    Kit.state.set('a', String(state.a), '50');  
    Kit.state.set('c', String(state.c), '1');
    render();                                   
    return;
  }
  
  
  
  
  
  
  var K = state.a / state.c, dir = 1;
  var lo = Math.max(0.2, pct(D.shared.reachable.floor_z));
  playBtn.textContent = 'stop the sweep';   
  if (state.hold === 'a') {
    var lk = 0;                                   
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
    var aLo = logit(0.2 / 100), aHi = logit(99.5 / 100);   
    playTimer = setInterval(function () {
      var cur = logit(state.a / 100), next = cur + dir * 0.12;
      if (next >= aHi) { dir = -1; next = cur; }
      if (next <= aLo) { dir = 1; next = cur; }
      state.a = r2(pct(next)); elA.value = state.a;
      scheduleRender();
    }, 140);
    return;
  }
  var hi = Math.min(99.5 / K, 99.5);            
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
  sw.style.display = inert ? 'none' : '';   
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


function foldSweepTools() {   
  
  
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
  var rowEl2 = document.getElementById('sweeprow');   
  var hm2 = document.getElementById('holdMount'); if (hm2 && hm2.parentNode !== rowEl2) rowEl2.appendChild(hm2);
  var ksl2 = document.getElementById('kSlider'), kll = ksl2 && ksl2.closest('label');   
  if (kll) { if (det.parentNode === lv) { if (kll.nextSibling !== det) lv.insertBefore(kll, det); } else if (kll.parentNode !== lv) lv.appendChild(kll); }
  lv.querySelectorAll(':scope > .preset.kchip').forEach(function (b) { rowEl2.appendChild(b); });
  if (playBtn.parentNode !== rowEl2) rowEl2.appendChild(playBtn);
  var kb2 = document.getElementById('kBound'); if (kb2 && kb2.parentNode !== rowEl2) rowEl2.appendChild(kb2);
  var on = document.querySelector('.kit-switch[data-key="hold"] button[aria-pressed="true"]');
  var sum = document.getElementById('sweepsum'), txt = 'Sweep and hold · held fixed: ' + (on ? on.textContent.trim() : ({ k: 'K', a: 'horizontal level', c: 'vertical level' })[state.hold] || state.hold);   
  if (sum && sum.textContent !== txt) sum.textContent = txt;
}

var phoneFolded = false;
function phoneFold() {   
  
  
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
    var st = document.getElementById('sweeptools'); if (st && st.parentNode !== more) more.appendChild(st);   
  }
  phoneFolded = true;
}


function syncPresets() {
  if (SPAN) { document.querySelectorAll('#levels .preset[data-u], #morelevels .preset[data-u]').forEach(function (b) { b.setAttribute('aria-pressed', (+b.dataset.c === +state.c && +b.dataset.u === +state.u) ? 'true' : 'false'); }); return; }   
  document.querySelectorAll('#levels .preset:not(.kchip), #morelevels .preset:not(.kchip)').forEach(function (b) {
    var on = b.dataset.a !== undefined && +b.dataset.a === +state.a && +b.dataset.c === +state.c;
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
}

var dragKey = null;
var dragActive = false;
function wireDrag() {
  var svg = document.getElementById('chart');
  
  
  
  
  
  
  svg.addEventListener('touchstart', function (ev) {
    var h = ev.target.closest ? ev.target.closest('[data-handle]') : null;
    if (h && !(h.dataset.handle === 'a' && isCap())) ev.preventDefault();
  }, { passive: false });
  svg.addEventListener('pointerdown', function (ev) {
    var h = ev.target.closest ? ev.target.closest('[data-handle]')
                              : null;
    if (!h) return;
    if (h.dataset.handle === 'a' && isCap()) return;   
    dragKey = h.dataset.handle;
    dragK0 = state.a / state.c;                 
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
    render();                    
  }
  svg.addEventListener('pointerup', release);
  svg.addEventListener('pointercancel', release);
}

