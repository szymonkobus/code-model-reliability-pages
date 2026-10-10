

'use strict';

function refreshPartialChips() {   
  chips.forEach(function (b) { var i = +b.dataset.idx, c = D.shared.configs[i]; if (!c) return;
    var words = [];   
    if (c.think) words.push('thinking mode \u2014 open marker on the chart');
    if (c.run) { var Rw = runOf(i) || RUN; words.push(c.shared_page_label || c.display_name || (Rw ? Rw.name + ' \u2014 ' : '') + c.label); }   
    if (c.alongside) words.push('positioned on the served axis, not shaping it \u2014 its fit from the ' + c.alongside + ' series, read alongside the board fit set');   
    if (c.provisional) words.push(c.provisional_note || 'provisional position: a fast estimate; the full fit replaces it');
    if (c.gates_failed) words.push('flagged fit: ' + (c.gate_flag || 'the fit failed a sampler gate'));   
    var base = words.join(' \u00b7 ');
    if (isWithheld(i)) { b.disabled = true; b.setAttribute('aria-disabled', 'true'); b.classList.add('partial'); b.classList.remove('partialshown'); b.title = capTitle('not shown: ' + WITHHELD[c.id]); return; }
    if (isPartial(i)) {
      if (partialShown()) { b.disabled = false; b.removeAttribute('aria-disabled'); b.classList.remove('partial'); b.classList.add('partialshown'); b.title = capTitle((base ? base + ' \u00b7 ' : '') + 'partial model, shown greyed'); }
      else { b.disabled = true; b.setAttribute('aria-disabled', 'true'); b.classList.add('partial'); b.classList.remove('partialshown'); b.title = capTitle('partial model, hidden; the Partial models switch shows it'); }
    } else if (base) { b.title = capTitle(base); } else { b.title = ''; }
  });
}

function refreshBeyondChips() {   
  var B = {}; beyondArms.forEach(function (i) { B[i] = true; });
  chips.forEach(function (b) { var i = +b.dataset.idx; if (B[i]) { b.dataset.beyondTitle = '1'; b.title = 'at the edge: its crossing lies beyond the hardest task at these levels'; } else if (b.dataset.beyondTitle) { b.classList.remove('beyond'); delete b.dataset.beyondTitle; b.title = ''; refreshPartialChips(); } });   
}

function writeSel() {
  if (!Object.keys(SLUG_OF).length) slugIndex();
  var all = sel.size === D.shared.configs.length;
  Kit.state.set('sel', all ? null : Array.from(sel).sort(function (p, q) { return p - q; }).map(function (i) { return SLUG_OF[i] || D.shared.configs[i].id; }).join(','), null);   
}



function bayesOnly(i) { var c = D.shared.configs[i]; return isRun(i) || !!(c && c.bayes_only); }   
function capKey(i) {
  if (bayesOnly(i) && (state.src !== 'bayes' || !D.bayById || !D.bayById[D.shared.configs[i].id])) return -1e9;   
  if (state.view === 'ridges' && D.bay) {   
    var rr = D.bayById[D.shared.configs[i].id]; if (!rr) return Infinity;
    var cz = ridgeCentre(rr, state.a / 100); return cz == null || !isFinite(cz) ? Infinity : cz;
  }
  var rx = reading(i, logit(state.a / 100), 'x');
  if (!rx) return Infinity;
  if (rx.kind === 'point') return rx.z;
  if (rx.kind === 'lo-bound') return (LIM ? LIM[0] : -50) - 1;
  if (rx.kind === 'hi-bound') return (LIM ? LIM[1] : 50) + 1;
  return Infinity;
}
function sizeOf(label) { var m = /(\d+(?:\.\d+)?)\s*[Bb]\b/.exec(String(label || '')); return m ? +m[1] : Infinity; }   
function capOrder(indices) {
  if (PANELS) {   
    var bySize = indices.slice().sort(function (a, b) { var sa = sizeOf(D.shared.configs[a].label), sb = sizeOf(D.shared.configs[b].label); return sa === sb ? a - b : (sa < sb ? -1 : 1); });
    return variantsAfterBase(famOrder(bySize));
  }
  var out = indices.slice().sort(function (a, b) {
    var ka = capKey(a), kb = capKey(b); ka = isFinite(ka) ? ka : 1e9; kb = isFinite(kb) ? kb : 1e9;
    if (ka !== kb) return ka - kb;
    return D.shared.configs[a].label < D.shared.configs[b].label ? -1 : 1;
  });
  return variantsAfterBase(out);
}





function variantBase(label) {
  var s = String(label || '');
  if (/\((?:checkpoint|step)/i.test(s)) return null;
  var m = s.match(/^(.*?)\s*(?:\(|\u00b7|\u2014|\u2013|:|\|)/);
  return m && m[1].trim() ? m[1].trim() : null;
}
function variantsAfterBase(order) {
  var byLabel = {}; order.forEach(function (i) { byLabel[D.shared.configs[i].label] = i; });
  var after = {}, placed = {};
  order.forEach(function (i) {
    var base = variantBase(D.shared.configs[i].label);
    if (base && base !== D.shared.configs[i].label && byLabel[base] !== undefined && byLabel[base] !== i) { (after[byLabel[base]] = after[byLabel[base]] || []).push(i); placed[i] = true; }
  });
  var out = [];
  order.forEach(function (i) { if (placed[i]) return; out.push(i); (after[i] || []).forEach(function (v) { out.push(v); }); });
  return out;
}


var FAMILY_LABEL = { 'Qwen2.5-Instruct': 'Qwen2.5' };
function famLabel(f) { return FAMILY_LABEL[f] || f; }
function famOrder(indices) {   
  if (window.Kit && Kit.legendByFamily) {
    var rows = indices.map(function (i) { var c = D.shared.configs[i]; return { i: i, label: c.label, family: famLabel(c.fam) }; });
    return Kit.legendByFamily(rows).map(function (r) { return r.i; });
  }
  return indices.slice().sort(function (a, b) { return a - b; });
}

function buildChips() {
  var box = document.getElementById('chips');
  var fams = [];
  D.shared.configs.forEach(function (c, i) {
    var f = fams.find(function (x) { return x.name === c.fam; });
    if (!f) { f = { name: c.fam, members: [] }; fams.push(f); }
    f.members.push(i);
  });
  var allBtn = document.createElement('button');
  allBtn.className = 'util'; allBtn.textContent = 'all';
  allBtn.onclick = function () {
    D.shared.configs.forEach(function (_, i) { if (!isHidden(i) && !isRun(i)) sel.add(i); });   
    writeSel(); render();
  };
  var noneBtn = document.createElement('button');
  noneBtn.className = 'util'; noneBtn.textContent = 'none';
  noneBtn.onclick = function () { D.shared.configs.forEach(function (c, i) { if (!c.run) sel.delete(i); }); writeSel(); render(); };   
  box.appendChild(allBtn); box.appendChild(noneBtn);
  ['arms', 'partial'].forEach(function (k) { var sw = document.querySelector('#armsbar .kit-switch[data-key="' + k + '"]'); if (sw) box.appendChild(sw); });   
  
  
  
  
  
  
  var mainIdx = [], runIdx = [];
  D.shared.configs.forEach(function (c, i) { (c.run ? runIdx : mainIdx).push(i); });
  var ordered = capOrder(mainIdx);   
  var famKey = function (f) { return Math.max.apply(null, f.members.map(function (i) { var k = capKey(i); return isFinite(k) ? k : -1e9; })); };
  var isRunFam = function (f) { return f.members.length && isRun(f.members[0]); };
  fams.filter(function (f) { return !isRunFam(f); }).sort(function (p, q) { return famKey(p) - famKey(q); }).forEach(function (f) {   
    var nm = document.createElement('button');
    nm.className = 'fam'; nm.style.color = D.shared.configs[f.members[0]].color; nm.textContent = famLabel(f.name); nm.title = 'select or clear every ' + famLabel(f.name) + ' model';
    nm.onclick = function () {
      var anyOff = f.members.some(function (i) { return !sel.has(i) && (!isHidden(i)); });
      f.members.forEach(function (i) { if (anyOff) { if (!isHidden(i)) sel.add(i); } else sel.delete(i); });   
      writeSel(); render();
    };
    box.appendChild(nm);
  });
  var makeChip = function (i) {
    var c = D.shared.configs[i], b = document.createElement('button');
    b.className = 'chip'; if (c.think) { b.classList.add('think'); b.title = 'thinking mode \u2014 open marker on the chart'; }
    if (isPartial(i) || isWithheld(i)) b.classList.add('partial');
    if (c.run) { var Rc = runOf(i) || RUN; b.classList.add('run'); b.title = (c.display_name || Rc.name + ' \u2014 ' + c.label); }
    if (c.provisional) { b.classList.add('provisional'); }   
    if (c.alongside) { b.title = capTitle((b.title ? b.title + ' \u00b7 ' : '') + 'positioned on the served axis, not shaping it \u2014 its fit from the ' + c.alongside + ' series, read alongside the board fit set'); }   
    if (c.gates_failed) { b.classList.add('flagged'); var fg = document.createElement('span'); fg.className = 'flag'; fg.textContent = '\u2691'; fg.setAttribute('aria-label', 'flagged fit'); b.title = (b.title ? b.title + ' \u00b7 ' : '') + 'flagged fit: ' + (c.gate_flag || 'the fit failed a sampler gate'); b.appendChild(fg); }   
    b.style.color = c.color; b.style.borderColor = c.color;
    b.insertBefore(document.createTextNode(c.label), b.firstChild); b.dataset.idx = i;
    b.onclick = function () { if (sel.has(i)) sel.delete(i); else sel.add(i); writeSel(); render(); };
    chips.push(b); return b;
  };
  ordered.forEach(function (i) { box.appendChild(makeChip(i)); });
  
  
  var rbox = document.getElementById('chips-runs');
  if (rbox) {
    rbox.innerHTML = '';
    RUNS.forEach(function (R) {   
      if (!R.idx.length && !R.withheld.length) return;
      var line = document.createElement('div'); line.className = 'chips chips-run'; line.id = 'chips-run-' + R.key.replace(/[^a-z0-9]/gi, '-'); line.dataset.run = R.key; line.dataset.stateKey = R.stateKey;
      var lab = document.createElement('span'); lab.className = 'runlabel'; lab.style.color = R.hue || (R.idx.length ? D.shared.configs[R.idx[0]].color : '#52514e'); lab.textContent = R.name; lab.title = R.clause; line.appendChild(lab);
      if (R.idx.length) {
        var rAll = document.createElement('button'); rAll.className = 'util'; rAll.textContent = 'all'; rAll.onclick = function () { R.idx.forEach(function (i) { sel.add(i); }); writeSel(); render(); }; line.appendChild(rAll);
        var rNone = document.createElement('button'); rNone.className = 'util'; rNone.textContent = 'none'; rNone.onclick = function () { R.idx.forEach(function (i) { sel.delete(i); }); writeSel(); render(); }; line.appendChild(rNone);
        R.idx.forEach(function (i) { var ch = makeChip(i); if (R.dual.indexOf(i) >= 0) { ch.classList.add('run'); ch.dataset.dual = '1'; var fl = ch.querySelector('.flag'); ch.textContent = (R.dualLabel || {})[i] || ch.textContent; if (fl) ch.appendChild(fl); ch.title = capTitle((D.shared.configs[i].display_name || D.shared.configs[i].label) + ' \u2014 a model of the all-models rows, shown here as the run\u2019s final too'); } line.appendChild(ch); });
      }
      
      line.hidden = !runOnPlane(R);
      rbox.appendChild(line);
    });
    
    
    
  }
  
  var oldKey = document.getElementById('runkey'); if (oldKey) oldKey.remove();
  var key = document.createElement('div'); key.className = 'kit-run-key'; key.id = 'runkey'; key.hidden = true; key.innerHTML = runKeyHtml();   
  var host = document.getElementById('keyhost');   
  if (host) host.appendChild(key); else if (rbox) rbox.appendChild(key); else box.insertAdjacentElement('afterend', key);
}
function runKeyHtml() {   
  if (!window.Kit || typeof Kit.runMarkSvg !== 'function') return '';
  var ink = '#52514e', bg = '#fcfaf3', R = 3.6;
  var svg = function (inner) { return '<svg viewBox="0 0 14 14" aria-hidden="true">' + inner + '</svg>'; };
  var glyph = function (mark) {
    if (mark === 'darker') return svg(Kit.runMarkSvg(3, 7, 2.2, { shape: 'circle', color: '#c9c3b6', bg: bg }) + Kit.runMarkSvg(7.5, 7, 2.2, { shape: 'circle', color: '#8b8477', bg: bg }) + Kit.runMarkSvg(12, 7, 2.2, { shape: 'circle', color: ink, bg: bg }));
    if (mark === 'dot') return svg(Kit.runMarkSvg(7, 7, R, { shape: 'circle', dot: true, color: ink, bg: bg }));
    if (mark === 'open') return svg(Kit.runMarkSvg(7, 7, R, { shape: 'circle', open: true, color: ink, bg: bg }));
    return svg(Kit.runMarkSvg(7, 7, R, { shape: mark, color: ink, bg: bg }));
  };
  
  
  
  var out = '<span data-row="bound" hidden title="' + (typeof capTitle === 'function' ? capTitle : String)('a crossing that lies beyond the scale\u2019s end is drawn as an open chevron at the end, pointing to the side it lies beyond, with its band, and is kept out of the fitted line') + '">' + svg('<path d="M2 10.5l5 -8l5 8" fill="none" stroke="' + ink + '" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>') + '<span>a crossing beyond the scale, on the side it points</span></span>';
  if (typeof Kit.runMarksKey === 'function') out += Kit.runMarksKey().map(function (r) { return '<span data-row="' + r.mark + '" hidden' + (r.title ? ' title="' + (typeof capTitle === 'function' ? capTitle(String(r.title)) : String(r.title)).replace(/"/g, '&quot;') + '"' : '') + '>' + glyph(r.mark) + '<span>' + r.text + '</span></span>'; }).join('');   
  return out;
}
function refreshRunKey() {   
  
  var keyEl = document.getElementById('runkey'); if (!keyEl) return;
  var anyBound = !!document.querySelector('path[data-mark][data-shape="bound"]'), runsOn = runKeyWanted();   
  keyEl.querySelectorAll(':scope > span').forEach(function (sp) { sp.hidden = sp.dataset.row === 'bound' ? !anyBound : !runsOn; });
  keyEl.hidden = !(anyBound || runsOn);
}
function runKeyWanted() {   
  if (typeof runMarkOf !== 'function') return false;
  var k = document.getElementById('runkey'); if (!k || !k.childElementCount) return false;   
  return RUNS.some(function (R) { return runOnPlane(R) && R.idx.some(function (i) { return sel.has(i) && !!runMarkOf(i); }); });
}

function syncXdefPressed() {   
  if (isCap()) return;
  document.querySelectorAll('.kit-switch[data-key="xdef"] button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.value === 'crossing' ? 'true' : 'false'); });
}
function paintChips() {
  syncXdefPressed();
  RUNS.forEach(function (R) { var rsw = document.querySelector('.kit-switch[data-key="' + R.stateKey + '"]'); if (rsw) rsw.style.display = state.src === 'bayes' ? '' : 'none'; });   
  var box = document.getElementById('chips'), byIdx = {}; chips.forEach(function (b) { if (b.parentNode === box) byIdx[+b.dataset.idx] = b; });   
  var idxs = chips.map(function (b) { return +b.dataset.idx; });
  capOrder(idxs.filter(function (i) { return !isRun(i); })).forEach(function (i) { if (byIdx[i] && byIdx[i].parentNode === box) box.appendChild(byIdx[i]); });   
  RUNS.forEach(function (R) { var line = document.querySelector('.chips-run[data-run="' + R.key + '"]'); if (line) line.hidden = !runOnPlane(R); });   
  refreshRunKey();   
  var recompose = false;
  chips.forEach(function (b) {
    b.classList.toggle('off', !sel.has(+b.dataset.idx));
    b.setAttribute('aria-pressed', sel.has(+b.dataset.idx) ? 'true' : 'false');   
    var cfgId = D.shared.configs[+b.dataset.idx] && D.shared.configs[+b.dataset.idx].id;
    var nofit = (state.src === 'bayes' && !!D.bay && !D.bayById[cfgId]) || ((isRun(+b.dataset.idx) || !!(cfgC && cfgC.bayes_only)) && state.src !== 'bayes');   
    b.classList.toggle('nofit', nofit);
    var cfgC = D.shared.configs[+b.dataset.idx] || {};
    if (nofit) { b.title = capTitle((isRun(+b.dataset.idx) && state.src !== 'bayes' ? 'a run\u2019s checkpoints are Bayesian fits \u2014 not drawn under the reference chain' : 'awaiting its Bayesian fit \u2014 not drawn under the Bayesian estimator') + (cfgC.gates_failed ? ' \u00b7 flagged fit: ' + (cfgC.gate_flag || 'the fit failed a sampler gate') : '')); b.dataset.nofit = '1'; }   
    else if (b.dataset.nofit) { b.title = ''; delete b.dataset.nofit; recompose = true; }
  });
  if (recompose) refreshPartialChips();   
}






function namesOverlayLoad(mount) {   
  var mf = null;
  
  
  var base = (typeof window !== 'undefined' && window.MIRROR_MOUNT) ? (window.MIRROR_NAMES_BASE || './') : mount;
  return fetch(base + 'data/names-manifest.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; })
    .then(function (m) { mf = m; return (m && m.file) ? fetch(base + 'data/' + String(m.file).replace(/[^A-Za-z0-9_.-]/g, '')).then(function (r) { return r.ok ? r.json() : null; }) : null; })
    .then(function (o) { var names = o && o.names; return (names && typeof names === 'object') ? { names: names, file: String((mf && mf.file) || ''), labels_sha12: o.labels_sha12 || null } : null; })
    .catch(function () { return null; });
}
function namesOverlayApply(ov, shared, runRaw) {   
  if (!ov || !ov.names) return 0;
  var names = ov.names, moved = 0;
  ((shared && shared.configs) || []).forEach(function (c) { var n = names[c.id]; if (n && typeof n.label === 'string' && n.label && c.label !== n.label) { c.label_bundle = c.label; c.label = n.label; moved++; } });
  var sets = runRaw ? ((runRaw.sets && runRaw.sets.length) ? runRaw.sets : (runRaw.configs ? [runRaw] : [])) : [];
  sets.forEach(function (s) {
    (s.configs || []).forEach(function (c) { var n = names[c.id]; if (!n) return; if (typeof n.label === 'string' && n.label && c.label !== n.label) { c.label = n.label; moved++; } if (typeof n.display_name === 'string' && n.display_name) c.display_name = n.display_name; });
    (s.rows || []).forEach(function (r) { var n = names[r.cfg]; if (!n) return; if (typeof n.label === 'string' && n.label) r.label = n.label; if (typeof n.display_name === 'string' && n.display_name) r.display_name = n.display_name; });
  });
  return moved;
}
