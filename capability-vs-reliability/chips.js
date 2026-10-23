

'use strict';

function refreshPartialChips() {   
  
  
  chips.forEach(function (b) { var i = +b.dataset.idx, c = D.shared.configs[i]; if (!c) return;
    b.title = '';
    if (isWithheld(i)) { b.disabled = true; b.setAttribute('aria-disabled', 'true'); b.classList.add('partial'); b.classList.remove('partialshown'); return; }
    if (isPartial(i)) {
      if (partialShown()) { b.disabled = false; b.removeAttribute('aria-disabled'); b.classList.remove('partial'); b.classList.add('partialshown'); }
      else { b.disabled = true; b.setAttribute('aria-disabled', 'true'); b.classList.add('partial'); b.classList.remove('partialshown'); }
    }
  });
  writeModelStates();
}

function writeModelStates() {   
  var fold = document.getElementById('statefold'), el = document.getElementById('modelstates'); if (!fold || !el || !D.shared) return;
  var byIdx = {}; chips.forEach(function (b) { byIdx[+b.dataset.idx] = b; });
  var name = function (i) { var c = D.shared.configs[i]; return c.run ? (c.shared_page_label || c.display_name || c.label) : c.label; };
  var lines = [], groups = { partialHidden: [], partialShown: [], withheld: [], nofit: [], runNofit: [], flagged: [], provisional: [], alongside: [], beyond: [], single: [] };
  var B = {}; (typeof beyondArms !== 'undefined' ? beyondArms : []).forEach(function (i) { B[i] = true; });
  D.shared.configs.forEach(function (c, i) {
    var b = byIdx[i]; if (!b) return;
    if (isWithheld(i)) groups.withheld.push(name(i) + (WITHHELD[c.id] ? ' (' + WITHHELD[c.id] + ')' : ''));
    else if (isPartial(i)) (partialShown() ? groups.partialShown : groups.partialHidden).push(name(i));
    if (b.dataset.nofit) (isRun(i) && state.src !== 'bayes' ? groups.runNofit : groups.nofit).push(name(i));
    if (c.gates_failed) groups.flagged.push({ n: name(i), g: c.gate_flag || 'the fit did not pass its own check' });   
    if (c.provisional) groups.provisional.push(name(i) + (c.provisional_note ? ' — ' + c.provisional_note : ''));
    if (c.alongside) groups.alongside.push(name(i) + (String(c.alongside) === name(i) ? '' : ' — its fit from the ' + c.alongside + ' series'));
    if (B[i]) groups.beyond.push(name(i));
    if (typeof c.single_form_note === 'string' && c.single_form_note.trim()) groups.single.push(name(i) + ' — ' + c.single_form_note.trim().replace(/\.+$/, ''));
  });
  var seen = {}; var uniq = function (arr) { return arr.filter(function (x) { if (seen[x]) return false; seen[x] = true; return true; }); };
  if (groups.partialHidden.length) lines.push('Partial models (attempts on under 90% of the set’s tasks), hidden; the Partial models switch shows them: ' + uniq(groups.partialHidden).join(', ') + '.');
  seen = {}; if (groups.partialShown.length) lines.push('Partial models (attempts on under 90% of the set’s tasks), shown greyed and out of the fit: ' + uniq(groups.partialShown).join(', ') + '.');
  seen = {}; if (groups.withheld.length) lines.push('Not shown: ' + uniq(groups.withheld).join('; ') + '.');
  seen = {}; if (groups.nofit.length) lines.push('No Bayesian fit under this estimator (a dotted chip, no point): ' + uniq(groups.nofit).join(', ') + '.');
  seen = {}; if (groups.runNofit.length) lines.push('A run’s checkpoints are Bayesian fits, not drawn under this estimator: ' + uniq(groups.runNofit).join(', ') + '.');
  if (groups.flagged.length) {   
    var fnames = [], fseen = {}, bySent = {}, order = [];
    groups.flagged.forEach(function (f) { if (!fseen[f.n]) { fseen[f.n] = true; fnames.push(f.n); } var m = /^every attempt failed on (\d+)% of this model[’']s tasks(.*)$/.exec(f.g); var k = m ? 'PCT' + m[2] : f.g; if (!bySent[k]) { bySent[k] = { pcts: [], tail: m ? m[2] : null, text: f.g }; order.push(k); } if (m) bySent[k].pcts.push(+m[1]); });
    var sents = order.map(function (k) { var e = bySent[k]; if (e.tail === null) return e.text; var lo = Math.min.apply(null, e.pcts), hi = Math.max.apply(null, e.pcts); return 'every attempt failed on ' + (lo === hi ? lo + '%' : lo + '–' + hi + '%') + ' of the model’s tasks' + e.tail; });
    lines.push('Fits that did not pass their own checks (out of the fit): ' + fnames.join(', ') + ' — ' + sents.join(' ') + '.');
  }
  seen = {}; if (groups.provisional.length) lines.push('Provisional positions (a fast estimate the full fit replaces): ' + uniq(groups.provisional).join('; ') + '.');
  seen = {}; if (groups.alongside.length) lines.push('Positioned on the served axis, not shaping it: ' + uniq(groups.alongside).join('; ') + '.');
  seen = {}; if (groups.beyond.length) lines.push('Beyond the scale at these levels (an open chevron at the chart’s edge, out of the fit): ' + uniq(groups.beyond).join(', ') + '.');
  seen = {}; if (groups.single.length) lines.push('Read in one mode: ' + uniq(groups.single).join('; ') + '.');
  el.innerHTML = lines.map(function (t) { return '<span class="stateline">' + String(t).replace(/[&<>"]/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]; }) + '</span>'; }).join('<br>');
  fold.hidden = !lines.length;
}

function refreshBeyondChips() {   
  var B = {}; beyondArms.forEach(function (i) { B[i] = true; });
  chips.forEach(function (b) { var i = +b.dataset.idx; if (B[i]) { b.dataset.beyondTitle = '1'; } else if (b.dataset.beyondTitle) { b.classList.remove('beyond'); delete b.dataset.beyondTitle; } });   
  writeModelStates();   
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





function tierKey(label, fam) {
  var s = String(label || '').toLowerCase();
  if (fam === 'Claude' || /claude|\bhaiku\b|\bsonnet\b|\bopus\b|\bfable\b/.test(s)) {
    var t = { haiku: 1, sonnet: 2, opus: 3, fable: 4 };
    for (var k in t) if (s.indexOf(k) >= 0) { var vm = s.match(new RegExp('\\b' + k + '\\s*(\\d+(?:\\.\\d+)?)')); return t[k] + (vm ? parseFloat(vm[1]) / 100 : 0); }
    return null;
  }
  if (/\bgpt[-\s]?5/.test(s)) return /\bnano\b/.test(s) ? 1 : /\bmini\b/.test(s) ? 2 : 3;
  if (/\bgemini\b/.test(s)) { var v = (s.match(/\b(\d\.\d)\b/) || [])[1]; return (v ? parseFloat(v) * 10 : 0) + (/flash[-\s]?lite/.test(s) ? 1 : /flash/.test(s) ? 2 : /pro/.test(s) ? 3 : 2); }
  return null;
}
function placeUnmeasured(order) {
  var out = order.slice();
  var measured = function (j) { return isFinite(capKey(j)); };
  order.forEach(function (i) {
    if (measured(i)) return;
    var c = D.shared.configs[i], tk = tierKey(c.label, c.fam); if (tk === null) return;
    var pred = -1, predKey = -Infinity, first = -1;
    out.forEach(function (j, pos) {
      if (j === i) return; var cj = D.shared.configs[j]; if (cj.fam !== c.fam || !measured(j)) return;
      var kj = tierKey(cj.label, cj.fam); if (kj === null) return;
      if (kj < tk) { if (kj >= predKey) { predKey = kj; pred = pos; } } else if (first < 0) first = pos;
    });
    var cur = out.indexOf(i);
    if (pred >= 0) { out.splice(cur, 1); if (cur < pred) pred -= 1; out.splice(pred + 1, 0, i); }
    else if (first >= 0) { out.splice(cur, 1); if (cur < first) first -= 1; out.splice(first, 0, i); }
  });
  return out;
}






var TIER_FAMS = { 'Claude': 1, 'GPT-5': 1, 'Gemini': 1 };
var BASE_SPLIT = /\s*(?:\(|·|—|–|:|\|)|\s+(?=(?:thinking|think|chat|fine-?tune[sd]?|arm|rl|re-?run|rerun|raw|coverage|solutions?|code|maths?|math|sft|dpo|grpo|lora|tuned|trained)\b)|-(?=(?:think|thinking|chat|rl|sft|dpo)\b)/i;
function registryBase(label) { return String(label || '').toLowerCase().split(BASE_SPLIT)[0].replace(/[\s,;:·—–-]+$/, '').replace(/\s+/g, ' ').trim().replace(/^claude\s+/, ''); }
function idxOfId(id) { for (var k = 0; k < D.shared.configs.length; k++) if (D.shared.configs[k].id === id) return k; return -1; }
function rootIdx(i) { var cur = i, seen = {}; for (var t = 0; t < 6; t++) { var c = D.shared.configs[cur]; if (!c || !c.model || c.model === c.id || seen[cur]) break; seen[cur] = 1; var j = idxOfId(c.model); if (j < 0) break; cur = j; } return cur; }
function sizeRank(label) { var s = String(label || ''); if (/b-a\d/i.test(s)) return null; var m = /(\d+(?:\.\d+)?)\s?b\b/i.exec(s); return m ? parseFloat(m[1]) : null; }   
function ladderRanks(heads, fam, reg) {   
  var out = {}, tier = {}, regs = [];
  if (!TIER_FAMS[fam]) { heads.forEach(function (i) { out[i] = sizeRank(D.shared.configs[rootIdx(i)].label); }); return out; }   
  heads.forEach(function (i) { var root = D.shared.configs[rootIdx(i)]; var r = reg[registryBase(root.label)], t = tierKey(root.label, fam); tier[i] = t; if (typeof r === 'number') { out[i] = r; if (t !== null) regs.push({ t: t, reg: r }); } });
  if (!regs.length) { heads.forEach(function (i) { out[i] = null; }); return out; }
  heads.forEach(function (i) { if (out[i] !== undefined) return; var t = tier[i]; if (t === null) { out[i] = null; return; }
    var same = regs.filter(function (g) { return g.t === t; })[0]; if (same) { out[i] = same.reg; return; }
    var below = regs.filter(function (g) { return g.t < t; }).sort(function (a, b) { return b.t - a.t; })[0], above = regs.filter(function (g) { return g.t > t; }).sort(function (a, b) { return a.t - b.t; })[0];
    out[i] = below && above ? (below.reg + above.reg) / 2 : below ? below.reg + 0.5 : above.reg - 0.5; });
  return out;
}
function unitsOf(seq) {   
  var units = [], cur = null, heads = variantsAfterBase.heads || {};
  seq.forEach(function (i) { if (heads[i] || !cur) { cur = { head: i, members: [i] }; units.push(cur); } else cur.members.push(i); });
  return units;
}
function ladderWithinFamilies(seq) {
  
  
  
  var R = (D.shared.registry_ranks && typeof D.shared.registry_ranks === 'object') ? D.shared.registry_ranks : null;
  var units = unitsOf(seq), out = units.slice(), byFam = {};
  
  
  var unmeasured = function (u) { return !isFinite(capKey(u.head)) || isPartial(u.head) || isWithheld(u.head); }, measured = function (u) { return !unmeasured(u); };
  units.forEach(function (u, pos) { var c = D.shared.configs[u.head]; if (c && c.fam && (!TIER_FAMS[c.fam] || (R && R[c.fam]))) (byFam[c.fam] = byFam[c.fam] || []).push(pos); });
  Object.keys(byFam).forEach(function (fam) {
    var slots = byFam[fam].filter(function (pos) { return measured(units[pos]); });
    var heads = slots.map(function (pos) { return units[pos].head; }), rk = ladderRanks(heads, fam, R ? (R[fam] || {}) : {}), pos0 = {};
    slots.forEach(function (pos) { pos0[units[pos].head] = pos; });
    var ranked = heads.filter(function (h) { return typeof rk[h] === 'number'; }).sort(function (a, b) { return (rk[a] - rk[b]) || (pos0[a] - pos0[b]); });
    var rankedSlots = slots.filter(function (pos) { return typeof rk[units[pos].head] === 'number'; });
    rankedSlots.forEach(function (pos, k) { out[pos] = units[pos0[ranked[k]]]; });
  });
  Object.keys(byFam).forEach(function (fam) {
    var um = byFam[fam].filter(function (pos) { return unmeasured(units[pos]); }).map(function (pos) { return units[pos]; });
    if (!um.length) return;
    var reg = R ? (R[fam] || {}) : {};
    
    
    var placed = [], rkAll = ladderRanks(units.filter(function (v) { var c = D.shared.configs[v.head]; return c && c.fam === fam; }).map(function (v) { return v.head; }), fam, reg);
    um.sort(function (a, b) { var ra = rkAll[a.head], rb = rkAll[b.head]; return (typeof ra === 'number' && typeof rb === 'number') ? ra - rb : 0; });
    um.forEach(function (u) {
      var ms = out.filter(function (v) { var c = D.shared.configs[v.head]; return c && c.fam === fam && (measured(v) || placed.indexOf(v) >= 0); });
      var rk = ladderRanks(ms.map(function (v) { return v.head; }).concat([u.head]), fam, reg), r = rk[u.head];
      if (typeof r !== 'number') return;
      var pred = null, first = null;
      ms.forEach(function (v) { var rv = rk[v.head]; if (typeof rv !== 'number') return; if (rv <= r) pred = v; else if (first === null) first = v; });
      var cur = out.indexOf(u); if (cur < 0 || (!pred && !first)) return;
      out.splice(cur, 1);
      out.splice(pred ? out.indexOf(pred) + 1 : out.indexOf(first), 0, u);
      placed.push(u);
    });
  });
  var flat = []; out.forEach(function (u) { flat.push.apply(flat, u.members); }); return flat;
}
function capOrder(indices) {
  if (PANELS) {   
    var bySize = indices.slice().sort(function (a, b) { var sa = sizeOf(D.shared.configs[a].label), sb = sizeOf(D.shared.configs[b].label); return sa === sb ? a - b : (sa < sb ? -1 : 1); });
    return ladderWithinFamilies(variantsAfterBase(famOrder(bySize)));   
  }
  var out = indices.slice().sort(function (a, b) {
    var ka = capKey(a), kb = capKey(b); ka = isFinite(ka) ? ka : 1e9; kb = isFinite(kb) ? kb : 1e9;
    if (ka !== kb) return ka - kb;
    return D.shared.configs[a].label < D.shared.configs[b].label ? -1 : 1;
  });
  return ladderWithinFamilies(variantsAfterBase(placeUnmeasured(out)));   
}





function variantBase(label) {
  var s = String(label || '');
  if (/\((?:checkpoint|step)/i.test(s)) return null;
  var m = s.match(/^(.*?)\s*(?:\(|\u00b7|\u2014|\u2013|:|\|)/);
  return m && m[1].trim() ? m[1].trim() : null;
}
function variantsAfterBase(order) {
  
  
  var byLabel = {}, byId = {}; order.forEach(function (i) { byLabel[D.shared.configs[i].label] = i; byId[D.shared.configs[i].id] = i; });
  var after = {}, placed = {};
  order.forEach(function (i) {
    var c = D.shared.configs[i], baseIdx;
    if (c.model && c.model !== c.id && byId[c.model] !== undefined) baseIdx = byId[c.model];
    else { var base = variantBase(c.label); baseIdx = (base && base !== c.label && byLabel[base] !== undefined && byLabel[base] !== i) ? byLabel[base] : undefined; }
    if (baseIdx !== undefined && baseIdx !== i) { (after[baseIdx] = after[baseIdx] || []).push(i); placed[i] = true; }
  });
  var out = [], seen = {}, heads = {}; variantsAfterBase.heads = heads;   
  function emit(i) { if (seen[i]) return; seen[i] = true; out.push(i); var vs = after[i] || [], id = D.shared.configs[i].id; vs.filter(function (v) { return D.shared.configs[v].model === id; }).forEach(emit); vs.filter(function (v) { return D.shared.configs[v].model !== id; }).forEach(emit); }
  order.forEach(function (i) { if (!placed[i]) { heads[i] = true; emit(i); } });
  order.forEach(function (i) { if (!seen[i]) { heads[i] = true; emit(i); } });   
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
  var famKey = function (f) { var ks = f.members.map(function (i) { return capKey(i); }).filter(function (k) { return isFinite(k); }); return ks.length ? Math.max.apply(null, ks) : 1e9; };   
  var isRunFam = function (f) { return f.members.length && isRun(f.members[0]); };
  fams.filter(function (f) { return !isRunFam(f); }).sort(function (p, q) { return famKey(p) - famKey(q); }).forEach(function (f) {   
    var nm = document.createElement('button');
    nm.className = 'fam'; nm.style.color = D.shared.configs[f.members[0]].color; nm.textContent = famLabel(f.name);   
    nm.onclick = function () {
      var anyOff = f.members.some(function (i) { return !sel.has(i) && (!isHidden(i)); });
      f.members.forEach(function (i) { if (anyOff) { if (!isHidden(i)) sel.add(i); } else sel.delete(i); });   
      writeSel(); render();
    };
    box.appendChild(nm);
  });
  var makeChip = function (i) {
    var c = D.shared.configs[i], b = document.createElement('button');
    b.className = 'chip'; if (c.think) { b.classList.add('think'); }   
    if (isPartial(i) || isWithheld(i)) b.classList.add('partial');
    if (c.run) { b.classList.add('run'); }
    if (c.provisional) { b.classList.add('provisional'); }   
    
    if (c.gates_failed) { b.classList.add('flagged'); }   
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
      var lab = document.createElement('span'); lab.className = 'runlabel'; lab.style.color = R.hue || (R.idx.length ? D.shared.configs[R.idx[0]].color : '#52514e'); lab.textContent = R.name; line.appendChild(lab);   
      if (R.idx.length) {
        var rAll = document.createElement('button'); rAll.className = 'util'; rAll.textContent = 'all'; rAll.onclick = function () { R.idx.forEach(function (i) { sel.add(i); }); writeSel(); render(); }; line.appendChild(rAll);
        var rNone = document.createElement('button'); rNone.className = 'util'; rNone.textContent = 'none'; rNone.onclick = function () { R.idx.forEach(function (i) { sel.delete(i); }); writeSel(); render(); }; line.appendChild(rNone);
        R.idx.forEach(function (i) { var ch = makeChip(i); if (R.dual.indexOf(i) >= 0) { ch.classList.add('run'); ch.dataset.dual = '1'; ch.textContent = (R.dualLabel || {})[i] || ch.textContent; } line.appendChild(ch); });   
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
  
  
  
  var out = '<span data-row="bound" hidden>' + svg('<path d="M2 10.5l5 -8l5 8" fill="none" stroke="' + ink + '" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>') + '<span>a crossing beyond the scale, on the side it points</span></span>';
  if (typeof Kit.runMarksKey === 'function') out += Kit.runMarksKey().map(function (r) { return '<span data-row="' + r.mark + '" hidden>' + glyph(r.mark) + '<span>' + r.text + '</span></span>'; }).join('');   
  out += '<span data-row="move" hidden>' + svg('<path d="M2 11l8 -8" fill="none" stroke="' + ink + '" stroke-width="1.4"/><path d="M6 3h4v4" fill="none" stroke="' + ink + '" stroke-width="1.4" stroke-linejoin="round"/>') + '<span>moved from the previous fit</span></span>';   
  return out;
}
function refreshRunKey() {   
  
  var keyEl = document.getElementById('runkey'); if (!keyEl) return;
  var anyBound = !!document.querySelector('path[data-mark][data-shape="bound"]'), runsOn = runKeyWanted(), anyMove = !!document.querySelector('#moves line');   
  keyEl.querySelectorAll(':scope > span').forEach(function (sp) { sp.hidden = sp.dataset.row === 'bound' ? !anyBound : sp.dataset.row === 'move' ? !anyMove : !runsOn; });
  keyEl.hidden = !(anyBound || runsOn || anyMove);
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
    if (nofit) { b.dataset.nofit = '1'; }   
    else if (b.dataset.nofit) { delete b.dataset.nofit; recompose = true; }
  });
  refreshPartialChips();   
}






function namesOverlayLoad(mount) {   
  var mf = null;
  
  
  var base = (typeof window !== 'undefined' && window.MIRROR_MOUNT) ? (window.MIRROR_NAMES_BASE || './') : mount;
  return fetch(base + 'data/names-manifest.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; })
    .then(function (m) { mf = m; return (m && m.file) ? fetch(base + 'data/' + String(m.file).replace(/[^A-Za-z0-9_.-]/g, '')).then(function (r) { return r.ok ? r.json() : null; }) : null; })
    .then(function (o) { var names = o && o.names; return (names && typeof names === 'object') ? { names: names, file: String((mf && mf.file) || ''), labels_sha12: o.labels_sha12 || null, ranks: (o.ranks && typeof o.ranks === 'object') ? o.ranks : null } : null; })
    .catch(function () { return null; });
}
function namesOverlayApply(ov, shared, runRaw) {   
  if (!ov || !ov.names) return 0;
  var names = ov.names, moved = 0;
  if (shared && ov.ranks) shared.registry_ranks = ov.ranks;   
  ((shared && shared.configs) || []).forEach(function (c) { var n = names[c.id]; if (n && typeof n.label === 'string' && n.label && c.label !== n.label) { c.label_bundle = c.label; c.label = n.label; moved++; } });
  var sets = runRaw ? ((runRaw.sets && runRaw.sets.length) ? runRaw.sets : (runRaw.configs ? [runRaw] : [])) : [];
  sets.forEach(function (s) {
    (s.configs || []).forEach(function (c) { var n = names[c.id]; if (!n) return; if (typeof n.label === 'string' && n.label && c.label !== n.label) { c.label = n.label; moved++; } if (typeof n.display_name === 'string' && n.display_name) c.display_name = n.display_name; });
    (s.rows || []).forEach(function (r) { var n = names[r.cfg]; if (!n) return; if (typeof n.label === 'string' && n.label) r.label = n.label; if (typeof n.display_name === 'string' && n.display_name) r.display_name = n.display_name; });
  });
  return moved;
}






function goldenKey(id) { return String(id).split('|')[0].replace(/_temp_[0-9.]+$/, '').replace(/_batch$/, '').replace(/--/g, '/').replace(/_think$/, '-Thinking'); }   
function goldenSetLoad(mount) {   
  return fetch(mount + 'data/golden_set.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; })
    .then(function (g) { if (!g || !Array.isArray(g.arms) || !g.arms.length) return null; var keys = {}; g.arms.forEach(function (a) { [a.id].concat(a.pool_ids || []).forEach(function (x) { if (x) keys[goldenKey(x)] = 1; }); }); return { n: g.n_arms || g.arms.length, arms: g.arms, keys: keys, source: g.source || null }; })
    .catch(function () { return null; });
}
function goldenMember(G, id) { return !!(G && G.keys && G.keys[goldenKey(id)]); }
function goldenCount(G, shared) { return ((shared && shared.configs) || []).filter(function (c) { return goldenMember(G, c.id); }).length; }   
function goldenApply(G, shared) {   
  if (!G || !shared || !Array.isArray(shared.configs)) return 0;
  shared.configs = shared.configs.filter(function (c) { return goldenMember(G, c.id); });
  return shared.configs.length;
}
