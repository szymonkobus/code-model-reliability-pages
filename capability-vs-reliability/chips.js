/* chips.js — the models' chips (by family, all/none, the run's own line, the partial and beyond-frame states) as a module loaded by /capability-vs-reliability/
 * and by its side-by-side page (the project maintainers' word of 2 Oct 2026 13:0x UK: composition). Reads the plane module's data and selection. */
'use strict';

function refreshPartialChips() {   // the project maintainers 2026-09-07 : hidden partial chips stay in place, greyed and UNSELECTABLE, with a hint; switch on = normal chips
  chips.forEach(function (b) { var i = +b.dataset.idx, c = D.shared.configs[i]; if (!c) return;
    var words = [];   // the chip's hover, in order: the mark, the run and its clause, the board twin's standing, the flag, then the coverage
    if (c.think) words.push('thinking mode \u2014 open marker on the chart');
    if (c.run) { var Rw = runOf(i) || RUN; words.push(c.shared_page_label || c.display_name || (Rw ? Rw.name + ' \u2014 ' : '') + c.label); }   // 27 Sep: outside its run's row a checkpoint is named by the labels rows' shared_page_label (run · k/N), the name of record with the checkpoint tail as fallback   // the full display name of record on hover (the labels rows' maintainers, 22 Sep); the run's clause is on the run line's label and the frame line, not on every chip (the project's critic, 23 Sep: hovers within 300 characters)
    if (c.alongside) words.push('positioned on the served axis, not shaping it \u2014 its fit from the ' + c.alongside + ' series, read alongside the board fit set');   // the difficulty maintainers' word of 22 Sep
    if (c.provisional) words.push(c.provisional_note || 'provisional position: a fast estimate; the fit of record replaces it');
    if (c.gates_failed) words.push('flagged fit: ' + (c.gate_flag || 'the fit failed a sampler gate'));   // a flagged fit is shown with its flag and its sentence, never plain (Definitions, 22 Sep); the sentence of record follows the word
    var base = words.join(' \u00b7 ');
    if (isWithheld(i)) { b.disabled = true; b.setAttribute('aria-disabled', 'true'); b.classList.add('partial'); b.classList.remove('partialshown'); b.title = capTitle('not shown: ' + WITHHELD[c.id]); return; }
    if (isPartial(i)) {
      if (partialShown()) { b.disabled = false; b.removeAttribute('aria-disabled'); b.classList.remove('partial'); b.classList.add('partialshown'); b.title = capTitle((base ? base + ' \u00b7 ' : '') + 'partial model, shown greyed'); }
      else { b.disabled = true; b.setAttribute('aria-disabled', 'true'); b.classList.add('partial'); b.classList.remove('partialshown'); b.title = capTitle('partial model, hidden; the Partial models switch shows it'); }
    } else if (base) { b.title = capTitle(base); } else { b.title = ''; }
  });
}

function refreshBeyondChips() {   // the chips of arms not drawn at these levels read greyed with the reason; they stay selectable
  var B = {}; beyondArms.forEach(function (i) { B[i] = true; });
  chips.forEach(function (b) { var i = +b.dataset.idx; if (B[i]) { b.classList.add('beyond'); b.dataset.beyondTitle = '1'; b.title = 'not drawn: its crossing lies beyond the hardest task at these levels'; } else if (b.dataset.beyondTitle) { b.classList.remove('beyond'); delete b.dataset.beyondTitle; b.title = ''; refreshPartialChips(); } });
}

function writeSel() {
  if (!Object.keys(SLUG_OF).length) slugIndex();
  var all = sel.size === D.shared.configs.length;
  Kit.state.set('sel', all ? null : Array.from(sel).sort(function (p, q) { return p - q; }).map(function (i) { return SLUG_OF[i] || D.shared.configs[i].id; }).join(','), null);   // the slugs of the names of record (26 Sep); before: arm keys (2026-09-04)
}
/* ONE ORDER (the project maintainers' word of 15 Sep 2026 12:2x: one ordering of all the models, by their capability, lowest to
 * highest, everywhere): every list of models on the page — the chips, the ridges — follows the capability
 * reading shown (the x axis as set, at the x level), lowest first; a bound sorts at the end it points to; an arm without a reading goes last */
function bayesOnly(i) { var c = D.shared.configs[i]; return isRun(i) || !!(c && c.bayes_only); }   // a run's checkpoint, or a base model stood in the main list from the board's Bayesian read (28 Sep): no project-chain row
function capKey(i) {
  if (bayesOnly(i) && (state.src !== 'bayes' || !D.bayById || !D.bayById[D.shared.configs[i].id])) return -1e9;   // no project-chain row for the run's checkpoints, nor for a Bayesian-only base model
  if (state.view === 'ridges' && D.bay) {   // the ridges are drawn from the Bayesian artifact whatever estimator the scatter shows: their order is their own centres at the x level
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
function sizeOf(label) { var m = /(\d+(?:\.\d+)?)\s*[Bb]\b/.exec(String(label || '')); return m ? +m[1] : Infinity; }   // a model's size from its name of record ('7B', '236B-A21B' reads 236); a name without one sorts after the sized ones
function capOrder(indices) {
  if (PANELS) {   // the composed page: its models come from several sets on different difficulty axes, so no one capability reading orders them — the reference family order, within a family by size (the ladder), ties in the sets' order, a variant right after its base
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
// A VARIANT SITS RIGHT AFTER ITS BASE (the project maintainers' word of 25 Sep 13:4x: on every chip row the base first, then its variants and fine-tunes, so the
// comparison is visible before a toggle; the reference LADDER ORDER row reads it so): the row keeps the capability order, and a label that names a base present
// in the row followed by a parenthesis or a variant clause ('Opus 5 (thinking)', 'Qwen3 4B (2507)', 'DeepSeek-Coder 6.7B · RL on all tasks') moves to directly after that base,
// variants of one base keeping their capability order among themselves; a checkpoint chip '(checkpoint k)' is a series, not a variant, and a variant whose
// plain base is not in the row stays where the capability order put it
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
// FAMILY LABELS OF RECORD (models, the names maintainers, 26 Sep 20:3x: the coinage 'Qwen2.5-Instruct' retires on the project maintainers' faces — the family's name is 'Qwen2.5', the coder line
// 'Qwen2.5-Coder'; 'Instruct' stays in ids and data fields): the dataset's fam key is kept for grouping and ordering, the printed label maps here until the shared builder writes the name
var FAMILY_LABEL = { 'Qwen2.5-Instruct': 'Qwen2.5' };
function famLabel(f) { return FAMILY_LABEL[f] || f; }
function famOrder(indices) {   // the reference family order (kit-export.js registry: the order the hues run), the dataset's order within a family; the dataset's order when the helper is absent
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
    D.shared.configs.forEach(function (_, i) { if (!isHidden(i) && !isRun(i)) sel.add(i); });   // hidden partial arms are unselectable (the project maintainers 2026-09-07 ); the run's line has its own all/none (the project maintainers' word of 22 Sep)
    writeSel(); render();
  };
  var noneBtn = document.createElement('button');
  noneBtn.className = 'util'; noneBtn.textContent = 'none';
  noneBtn.onclick = function () { D.shared.configs.forEach(function (c, i) { if (!c.run) sel.delete(i); }); writeSel(); render(); };   // the run's chips keep their own selection
  box.appendChild(allBtn); box.appendChild(noneBtn);
  ['arms', 'partial'].forEach(function (k) { var sw = document.querySelector('#armsbar .kit-switch[data-key="' + k + '"]'); if (sw) box.appendChild(sw); });   // 2 Oct 2026 (the project maintainers' word of 14:3x UK: a switch about the models sits beside the model chips, not at the top of the page): the Models and Partial models switches stand in the chips' first row beside all and none, on every page that builds its chips here
  // LEGEND ORDER (the project maintainers' word of 18 Sep 13:1x: the legend sorts by model family, not by capability, so the colours
  // make sense): family buttons in the colour scheme's family order, then every model grouped by family, within a
  // family by size — the dataset's own order; never by capability or any measured value
  // MODEL ROW ORDER (the project maintainers' answer to the brief's call 7, 21 Sep 10:4x: the model list and the curves stay in capability order
  // while the legend goes by family — "for now"; the export legend keeps the reference family order): family buttons in the order of the family's
  // most capable member, then every model in ONE flat row by capability, lowest first
  var mainIdx = [], runIdx = [];
  D.shared.configs.forEach(function (c, i) { (c.run ? runIdx : mainIdx).push(i); });
  var ordered = capOrder(mainIdx);   // the main row; the run's checkpoints go to their own line below (the project maintainers' word of 22 Sep 11:46)
  var famKey = function (f) { return Math.max.apply(null, f.members.map(function (i) { var k = capKey(i); return isFinite(k) ? k : -1e9; })); };
  var isRunFam = function (f) { return f.members.length && isRun(f.members[0]); };
  fams.filter(function (f) { return !isRunFam(f); }).sort(function (p, q) { return famKey(p) - famKey(q); }).forEach(function (f) {   // the run's family has its own line below
    var nm = document.createElement('button');
    nm.className = 'fam'; nm.style.color = D.shared.configs[f.members[0]].color; nm.textContent = famLabel(f.name); nm.title = 'select or clear every ' + famLabel(f.name) + ' model';
    nm.onclick = function () {
      var anyOff = f.members.some(function (i) { return !sel.has(i) && (!isHidden(i)); });
      f.members.forEach(function (i) { if (anyOff) { if (!isHidden(i)) sel.add(i); } else sel.delete(i); });   // family clicks skip hidden partial arms
      writeSel(); render();
    };
    box.appendChild(nm);
  });
  var makeChip = function (i) {
    var c = D.shared.configs[i], b = document.createElement('button');
    b.className = 'chip'; if (c.think) { b.classList.add('think'); b.title = 'thinking mode \u2014 open marker on the chart'; }
    if (isPartial(i) || isWithheld(i)) b.classList.add('partial');
    if (c.run) { var Rc = runOf(i) || RUN; b.classList.add('run'); b.title = (c.display_name || Rc.name + ' \u2014 ' + c.label); }
    if (c.provisional) { b.classList.add('provisional'); }   // a provisional designation (a fast estimate the fit of record replaces): dashed chip, hollow dashed mark, the word on hover, in the tooltip and the legend   // the full display name of record on hover; the clause is on the run line's label (a finding of the critic)
    if (c.alongside) { b.title = capTitle((b.title ? b.title + ' \u00b7 ' : '') + 'positioned on the served axis, not shaping it \u2014 its fit from the ' + c.alongside + ' series, read alongside the board fit set'); }   // the difficulty maintainers' word of 22 Sep: a run's final admitted to the board is positioned, never voting
    if (c.gates_failed) { b.classList.add('flagged'); var fg = document.createElement('span'); fg.className = 'flag'; fg.textContent = '\u2691'; fg.setAttribute('aria-label', 'flagged fit'); b.title = (b.title ? b.title + ' \u00b7 ' : '') + 'flagged fit: ' + (c.gate_flag || 'the fit failed a sampler gate'); b.appendChild(fg); }   // a flagged fit is shown with its flag and its sentence, never plain (Definitions, 22 Sep)
    b.style.color = c.color; b.style.borderColor = c.color;
    b.insertBefore(document.createTextNode(c.label), b.firstChild); b.dataset.idx = i;
    b.onclick = function () { if (sel.has(i)) sel.delete(i); else sel.add(i); writeSel(); render(); };
    chips.push(b); return b;
  };
  ordered.forEach(function (i) { box.appendChild(makeChip(i)); });
  // THE RUN'S OWN LINE OF CHIPS (the project maintainers' word of 22 Sep 11:46: a line of chips for the run below the models' row, shown when the
  // run toggle is on, not bound to the all/none buttons above, with its own all/none, so the run's checkpoints compare with one another)
  var rbox = document.getElementById('chips-runs');
  if (rbox) {
    rbox.innerHTML = '';
    RUNS.forEach(function (R) {   // one line per run set: its name, its own all/none, its checkpoints in the run's order, and the checkpoints not shown said in words
      if (!R.idx.length && !R.withheld.length) return;
      var line = document.createElement('div'); line.className = 'chips chips-run'; line.id = 'chips-run-' + R.key.replace(/[^a-z0-9]/gi, '-'); line.dataset.run = R.key; line.dataset.stateKey = R.stateKey;
      var lab = document.createElement('span'); lab.className = 'runlabel'; lab.style.color = R.hue || (R.idx.length ? D.shared.configs[R.idx[0]].color : '#52514e'); lab.textContent = R.name; lab.title = R.clause; line.appendChild(lab);
      if (R.idx.length) {
        var rAll = document.createElement('button'); rAll.className = 'util'; rAll.textContent = 'all'; rAll.onclick = function () { R.idx.forEach(function (i) { sel.add(i); }); writeSel(); render(); }; line.appendChild(rAll);
        var rNone = document.createElement('button'); rNone.className = 'util'; rNone.textContent = 'none'; rNone.onclick = function () { R.idx.forEach(function (i) { sel.delete(i); }); writeSel(); render(); }; line.appendChild(rNone);
        R.idx.forEach(function (i) { var ch = makeChip(i); if (R.dual.indexOf(i) >= 0) { ch.classList.add('run'); ch.dataset.dual = '1'; var fl = ch.querySelector('.flag'); ch.textContent = (R.dualLabel || {})[i] || ch.textContent; if (fl) ch.appendChild(fl); ch.title = capTitle((D.shared.configs[i].display_name || D.shared.configs[i].label) + ' \u2014 a model of the all-models rows, shown here as the run\u2019s final too'); } line.appendChild(ch); });
      }
      // the project maintainers' word of 24 Sep 12:4x: the page states the current truth only — no per-checkpoint notes about re-judging, counts, moves or hours under the run's chips
      line.hidden = !runOnPlane(R);
      rbox.appendChild(line);
    });
  }
}

function syncXdefPressed() {   // one D button (24 Sep 12:4x): pressed under any crossing level; the views pressed by the kit on click
  if (isCap()) return;
  document.querySelectorAll('.kit-switch[data-key="xdef"] button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.value === 'crossing' ? 'true' : 'false'); });
}
function paintChips() {
  syncXdefPressed();
  RUNS.forEach(function (R) { var rsw = document.querySelector('.kit-switch[data-key="' + R.stateKey + '"]'); if (rsw) rsw.style.display = state.src === 'bayes' ? '' : 'none'; });   // a run's switch only where its fits are read
  var box = document.getElementById('chips'), byIdx = {}; chips.forEach(function (b) { if (b.parentNode === box) byIdx[+b.dataset.idx] = b; });   // the all-models chips only: a model shown again in a run's row has a second chip there, which must not shadow this one (the Think final sat first, unsorted, 23 Sep 13:4x)
  var idxs = chips.map(function (b) { return +b.dataset.idx; });
  capOrder(idxs.filter(function (i) { return !isRun(i); })).forEach(function (i) { if (byIdx[i] && byIdx[i].parentNode === box) box.appendChild(byIdx[i]); });   // the main row by capability; the run's line keeps the run's order
  RUNS.forEach(function (R) { var line = document.querySelector('.chips-run[data-run="' + R.key + '"]'); if (line) line.hidden = !runOnPlane(R); });   // the run's line shows only when the run is on the plane (the project maintainers' word of 22 Sep)   // capability order, re-read at every render (the brief's call 7, 21 Sep)   // one order, re-read at every render
  var recompose = false;
  chips.forEach(function (b) {
    b.classList.toggle('off', !sel.has(+b.dataset.idx));
    b.setAttribute('aria-pressed', sel.has(+b.dataset.idx) ? 'true' : 'false');   // selection readable by probes (the reference designer's 2nd read 09-04)
    var cfgId = D.shared.configs[+b.dataset.idx] && D.shared.configs[+b.dataset.idx].id;
    var nofit = (state.src === 'bayes' && !!D.bay && !D.bayById[cfgId]) || ((isRun(+b.dataset.idx) || !!(cfgC && cfgC.bayes_only)) && state.src !== 'bayes');   // one estimator per view: an arm without a posterior is a greyed chip, never a point; the run's checkpoints are Bayesian fits only
    b.classList.toggle('nofit', nofit);
    var cfgC = D.shared.configs[+b.dataset.idx] || {};
    if (nofit) { b.title = capTitle((isRun(+b.dataset.idx) && state.src !== 'bayes' ? 'a run\u2019s checkpoints are Bayesian fits \u2014 not drawn under the reference chain' : 'awaiting its Bayesian fit \u2014 not drawn under the Bayesian estimator') + (cfgC.gates_failed ? ' \u00b7 flagged fit: ' + (cfgC.gate_flag || 'the fit failed a sampler gate') : '')); b.dataset.nofit = '1'; }   // the flag stays on the hover in every state (Definitions, 22 Sep)
    else if (b.dataset.nofit) { b.title = ''; delete b.dataset.nofit; recompose = true; }
  });
  if (recompose) refreshPartialChips();   // a chip back from no-fit gets its hover words again
}

