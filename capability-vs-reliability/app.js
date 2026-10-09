











'use strict';

if (window.Kit && Kit.setExportLegendFont) Kit.setExportLegendFont(17);   

 

fetch(MOUNT + 'data/manifest.json')
  .then(function (r) { if (!r.ok) throw new Error('manifest: HTTP ' + r.status); return r.json(); })
  .catch(function (e) {   
    var why = String(e && e.message || e); why = /HTTP \d+/.test(why) ? why.replace(/^manifest: /, '') : 'not readable as data';   
    setHeld('Held: the data manifest is missing or unreadable (' + why + '); nothing is drawn until the rebuild loop writes it.', 'manifest');
    if (!heldTimer) { heldCheck(); heldTimer = setInterval(heldCheck, 120000); }
    return new Promise(function () {});   
  })
  .then(function (man) {
    D.man = man;
    


    var ds = man.datasets || { board: { files: man.files, label: DATASETS.board ? DATASETS.board.label : '', fingerprint: man.fingerprint, frame: man.frame } };
    Object.keys(DATASETS).forEach(function (k) { DATASETS[k].available = !!ds[k] || !!DATASETS[k].page; });   
    var DEFAULT_DATA = (window.MIRROR_DEFAULT && ds[window.MIRROR_DEFAULT]) ? window.MIRROR_DEFAULT : ds.board_top ? 'board_top' : ds.board ? 'board'
                     : (Object.keys(DATASETS).filter(function (k) { return ds[k]; })[0] || Object.keys(DATASETS)[0]);   
    D.defaultData = DEFAULT_DATA;
    var want = Kit.state.get('data', DEFAULT_DATA);
    var ALIASES = { boardfocused: 'board_top', focused: 'top' };
    var RETIRED = {};   
    if (ALIASES[want]) { want = ALIASES[want]; Kit.state.set('data', want, null); }
    if (DATASETS[want] && DATASETS[want].page) { location.replace(MOUNT + DATASETS[want].page); return new Promise(function () {}); }   
    if (!DATASETS[want] && /^golden-/.test(want) && ds[want]) { want = want.slice(7); Kit.state.set('arms', 'golden', 'all'); Kit.state.set('data', want, DEFAULT_DATA); }   
    relabel();   
    if (!DATASETS[want] || !ds[want]) {   
      dataNote = (DATASETS[want] ? 'dataset \u201c' + DATASETS[want].label + '\u201d is not served yet \u2014 ' + DATASETS[want].reason
                                 : RETIRED[want] && !DATASETS[want] ? RETIRED[want] + ' is not on this page (coding sets only; the maths results have their own mirror page)'
                                 : 'dataset \u201c' + String(want).slice(0, 40) + '\u201d is not one of ' + Object.keys(DATASETS).join(' | ')) + '; showing ' + DATASETS[DEFAULT_DATA].label;
      want = DEFAULT_DATA; Kit.state.set('data', null, null);
    }
    



    var armsWant = Kit.state.get('arms', 'all'), armsKey = armsWant === 'golden' ? 'golden-' + want : want;
    if (armsWant !== 'all' && armsWant !== 'golden') { dataNote = (dataNote ? dataNote + ' \u00b7 ' : '') + 'arms=' + String(armsWant).slice(0, 40) + ' is not one of all | golden; showing all models'; armsWant = 'all'; armsKey = want; Kit.state.set('arms', null, null); }
    else if (armsWant === 'golden' && !ds[armsKey]) { dataNote = (dataNote ? dataNote + ' \u00b7 ' : '') + 'the golden set is not served yet for \u201c' + DATASETS[want].label + '\u201d; showing all models'; armsWant = 'all'; armsKey = want; Kit.state.set('arms', null, null); }
    state.data = want; state.arms = armsWant; D.dsId = armsKey; D.dataId = want; D.ds = ds[armsKey]; D.golden = armsWant === 'golden'; D.allDs = ds;
    var files = ds[armsKey].files;   
    return Promise.all(['shared', 'chain_average', 'chain_median', 'bayes', 'bayes_prev'].map(function (k) {
      return files[k] ? fetch(MOUNT + 'data/' + files[k]).then(function (r) { return r.json(); }) : Promise.resolve(null);
    }).concat([(window.MIRROR_MOUNT && !window.MIRROR_RUN_SETS) ? Promise.resolve(null) : fetch(window.MIRROR_RUN_SETS || (MOUNT + 'data/olmo_run.json')).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })]));   
  }).then(function (all) {
    D.shared = all[0]; D.avg = all[1]; D.med = all[2]; D.bay = all[3]; D.bayPrev = all[4] || null;
    D.runRaw = all[5] || null;   
    return namesOverlay(D).then(function () {
      prepareSet(D);   
      boot();
    });
  });

function namesOverlay(D) {   
  return namesOverlayLoad(MOUNT).then(function (ov) { var moved = namesOverlayApply(ov, D.shared, D.runRaw); D.namesOverlay = ov ? { file: ov.file, ids: Object.keys(ov.names).length, moved: moved, labels_sha12: ov.labels_sha12 } : null; });
}


function boot() {
  mergeRunSet(D.runRaw);
  var g = D.avg.lev_grid;
  


  LIM = D.shared.limits
    ? [D.shared.limits.lo - 0.15, D.shared.limits.hi + 0.15]
    : [D.shared.reachable.floor_z - 0.35,
       D.shared.reachable.top_z + 0.35];
  var zFloor = logit(AXIS_FLOOR_PCT / 100) - 0.15;   
  if (LIM[0] > zFloor) LIM[0] = zFloor;

  sel = new Set();
  var selParam = Kit.state.get('sel', null), selRewrite = false;
  if (selParam !== null && selParam !== '') {
    
    
    
    slugIndex();
    var keyOf = function (c) { return c.board_id || c.id; };
    var byKey = {}; D.shared.configs.forEach(function (c, i) { byKey[keyOf(c)] = i; byKey[c.id] = i; byKey[SLUG_OF[i]] = i; byKey[slugify(c.display_name || c.label)] = i; });
    D.shared.configs.forEach(function (c, i) { if (c.run && c.slug && byKey[c.slug] === undefined) byKey[c.slug] = i; });   
    D.shared.configs.forEach(function (c, i) { if (byKey[normId(c.id)] === undefined) byKey[normId(c.id)] = i; });
    D.shared.configs.forEach(function (c, i) { (c.name_aliases || []).forEach(function (a) { var s = slugify(String(a)); if (s && byKey[s] === undefined) byKey[s] = i; }); });   
    if (/^[\d.]+$/.test(selParam)) {
      var rebound = [];
      selParam.split('.').forEach(function (t) { var i = +t; if (i >= 0 && i < D.shared.configs.length) { sel.add(i); rebound.push(keyOf(D.shared.configs[i])); } });
      dataNote = (dataNote ? dataNote + ' \u00b7 ' : '') + 'link re-bound: the selection was stored by chip position (' + selParam + '), which differs between datasets; it now carries model ids (' + rebound.join(', ') + ')';
      selRewrite = true;
    } else {
      var bad = [];
      selParam.split(',').forEach(function (k) { if (byKey[k] !== undefined) { sel.add(byKey[k]); if (SLUG_OF[byKey[k]] !== k) selRewrite = true; } else if (k) bad.push(k); });   
      if (bad.length) { selRewrite = true; }   
    }
    var dropped = withheldArms().filter(function (i) { return sel.has(i); });
    if (dropped.length) { dropped.forEach(function (i) { sel.delete(i); }); selRewrite = true; }   
    if (!sel.size) { D.shared.configs.forEach(function (_, i) { if (!isWithheld(i) && !isRun(i)) sel.add(i); }); selRewrite = true; }
    if (Kit.state.get('partial', 'hide') !== 'show' && sel.size && Array.from(sel).every(isPartial)) {   
      dataNote = (dataNote ? dataNote + ' \u00b7 ' : '') + 'the link named only partial models, which are hidden; every shown model is drawn';
      D.shared.configs.forEach(function (_, i) { if (!isPartial(i) && !isWithheld(i) && !isRun(i)) sel.add(i); }); selRewrite = true;
    }
    if (selRewrite) writeSel();   
  } else {
    D.shared.configs.forEach(function (_, i) { if (!isWithheld(i) && !isRun(i)) sel.add(i); });   
  }
  state.a = +Kit.state.get('a', 50);
  state.c = +Kit.state.get('c', 1);
  if (window.PLANE_Y === 'span') {   
    var INERT = { view: 'scatter', kp: 'off', lad: 'off', fitci: 'plain', line: 'steps', lw: 'equal', resid: 'off', move: 'off' };
    Object.keys(INERT).forEach(function (k) { if (Kit.state.get(k, null) != null) Kit.state.set(k, null, null); state[k] = INERT[k]; });
  }
  if (window.PLANE_Y === 'span') { ['fa', 'ft', 'fn'].forEach(function (k) { state[k] = Kit.state.get(k, 'off') === 'on' ? 'on' : 'off'; }); state.zoom = Kit.state.get('zoom', 'eq') === 'fit' ? 'fit' : 'eq'; state.yq = Kit.state.get('yq', 'len') === 'ent' ? 'ent' : 'len'; state.ed = ['capC', 'capC_j', 'capC_z'].indexOf(Kit.state.get('ed', 'capC_j')) >= 0 ? Kit.state.get('ed', 'capC_j') : 'capC_j'; state.es = Kit.state.get('es', 'normal') === 'log' ? 'log' : 'normal'; var uq = +Kit.state.get('u', 99); state.u = isFinite(uq) ? Math.max(0.2, Math.min(99.5, uq)) : 99; if (state.u <= state.c) state.u = Math.min(99.5, Math.round((state.c + 0.1) * 100) / 100); }   

   
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
  row.classList.add('kit-static'); 
  
  
  
  var _dsDflt = D.defaultData || (D.allDs.board_top ? 'board_top' : 'board');
  var _opt = function (k) { return { value: k, label: String(DATASETS[k].label).replace(/\s*\([^)]*\)\s*$/, ''), disabled: !DATASETS[k].available }; };   
  var dsRow = Kit.filterRow('#datasetbar');   
  var dataSw = Kit.selectControl({ mount: dsRow, key: 'data', label: 'Dataset',   
    options: Object.keys(DATASETS).filter(function (k) { return !DATASETS[k].group; }).map(_opt),
    
    
    groups: [{ label: 'Math', options: ['math500', 'aime', 'gsm8k_platinum'].map(_opt) }, { label: 'Other', options: ['ifeval', 'cruxeval_i', 'cruxeval_o'].map(_opt) }],   
    dflt: _dsDflt,
    onchange: function (v) {
      var ds = DATASETS[v] || DATASETS[_dsDflt] || DATASETS.board;
      if (ds.page && v !== D.dataId) { location.href = MOUNT + ds.page; return; }   
      if (!ds.available) { if (dataSw) dataSw.set(D.dataId); return; }
      if (v !== D.dataId && DATASETS[v]) location.reload();   
    } });
  (function () { var sel = dataSw.element.querySelector('select'); [].forEach.call(sel.options, function (o) { var d = DATASETS[o.value]; if (!d) return; o.title = d.available ? (d.hover || '') : (d.label + ': ' + d.reason); }); })();   
  if (dataSw.value() !== D.dataId) dataSw.set(D.dataId);   
  var armsSw = Kit.switchControl({ mount: document.getElementById('armsbar') || row, key: 'arms', label: CONTROL_WORDS.arms.label,   
    options: CONTROL_WORDS.arms.options,
    dflt: 'all',
    onchange: function (v) {
      if (v === 'golden' && !D.allDs['golden-' + D.dataId]) { if (armsSw) armsSw.set(state.arms); return; }
      if (v !== state.arms) location.reload();
    } });
  if (armsSw.value() !== state.arms) armsSw.set(state.arms);
  if (!D.allDs['golden-' + D.dataId]) { var gb = document.querySelector('.kit-switch[data-key="arms"] button[data-value="golden"]'); if (gb) { gb.disabled = true; gb.setAttribute('aria-disabled', 'true'); gb.title = CONTROL_WORDS.arms.goldenMissing; } }
  var partialSw = Kit.switchControl({ mount: document.getElementById('armsbar') || row, key: 'partial', label: CONTROL_WORDS.partial.label,   
    options: CONTROL_WORDS.partial.options,
    dflt: 'hide',
    onchange: function (v) { state.partial = v === 'show' ? 'show' : 'hide'; Kit.state.set('partial', state.partial, 'hide'); refreshPartialChips(); render(); } });
  if (!partialArms().length) { var psw = document.querySelector('.kit-switch[data-key="partial"]'); if (psw) psw.style.display = 'none'; }   
  
  showDataNote();
  Kit.switchControl({ mount: row, key: 'view', label: CONTROL_WORDS.view.label,
    options: CONTROL_WORDS.view.options,
    dflt: 'scatter',
    onchange: function (v) { if (window.PLANE_Y === 'span') { state.view = 'scatter'; Kit.state.set('view', null, null); return; } state.view = v; Kit.state.set('view', state.view, 'scatter'); if (sel) render(); } });   
  Kit.switchControl({ mount: row, key: 'def', label: CONTROL_WORDS.def.label,
    options: CONTROL_WORDS.def.options,
    dflt: 'average',
    onchange: function (v) {
      state.def = v; Kit.state.set('def', state.def, 'average');   
      if (srcMount) buildSrcSwitch();
      if (sel) render();
    } });
  
  
  
  
  
  var CAPC_REASON = 'Capability C is computed for wave 1 only; choose Dataset = wave 1 to use it';   
  var xdefReady = false;   
  var xdefSw = Kit.switchControl({ mount: row, key: 'xdef', label: CONTROL_WORDS.xdef.label,
    
    
    options: CONTROL_WORDS.xdef.options,
    dflt: 'crossing',
    onchange: function (v) {
      if (v === 'crossing') { state.xdef = 'crossing'; Kit.state.set('xdef', null, null); syncXdefLock(); if (xdefReady && sel) render(); return; }   
      state.xdef = v;
      syncXdefLock();
      if (sel) render();
    } });
  xdefReady = true;
  (function () { var bD = row.querySelector('.kit-switch[data-key="xdef"] button[data-value="crossing"]'); if (bD) bD.title = 'D: the crossing at the horizontal level the level controls set'; })();
  Object.keys(CAP_KEYS).forEach(function (k) {   
    var capBtn = row.querySelector('.kit-switch[data-key="xdef"] button[data-value="' + k + '"]'); if (capBtn) capBtn.title = CAP_KEYS[k].clause();
  });
  srcMount = document.createElement('span');
  row.appendChild(srcMount);
  buildSrcSwitch();
  
  LIMITS.forEach(function (L) {   
    if (L[2]) return;
    var b = row.querySelector('.kit-switch[data-key="' + L[0] + '"] button[data-value="' + L[1] + '"]');
    if (b) { b.disabled = true; b.setAttribute('aria-disabled', 'true'); b.title = L[4]; }
  });
  showDataNote();
  
  
  
  
  
  
  
  Kit.switchControl({ mount: row, key: 'kp', label: CONTROL_WORDS.kp.label,
    options: CONTROL_WORDS.onoff,
    dflt: 'off',   
    onchange: function (v) { state.kp = v; if (sel) render(); } });
  Kit.switchControl({ mount: row, key: 'lad', label: CONTROL_WORDS.lad.label,
    options: CONTROL_WORDS.onoff,
    dflt: 'off',
    onchange: function (v) { state.lad = v; if (sel) render(); } });
  Kit.switchControl({ mount: row, key: 'w', label: CONTROL_WORDS.w.label,
    options: CONTROL_WORDS.onoff,
    dflt: 'on',
    onchange: function (v) { state.w = v; if (sel) render(); } });
  if (window.PLANE_Y === 'span') {   
    Kit.switchControl({ mount: row, key: 'yq', label: 'Vertical axis', options: [{ value: 'len', label: 'Transition length' }, { value: 'ent', label: 'Average outcome entropy' }], dflt: 'len',
      onchange: function (v) { state.yq = v === 'ent' ? 'ent' : 'len'; Kit.state.set('yq', state.yq, 'len'); if (sel) render(); } });
    Kit.switchControl({ mount: row, key: 'ed', label: 'Difficulty weight', options: CONTROL_WORDS.xdef.options.filter(function (o) { return o.value !== 'crossing'; }), dflt: 'capC_j',   
      onchange: function (v) { state.ed = ['capC', 'capC_j', 'capC_z'].indexOf(v) >= 0 ? v : 'capC_j'; Kit.state.set('ed', state.ed, 'capC_j'); if (sel) render(); } });
    Kit.switchControl({ mount: row, key: 'es', label: 'Vertical scale', options: [{ value: 'normal', label: 'Normal' }, { value: 'log', label: 'Log' }], dflt: 'normal',   
      onchange: function (v) { state.es = v === 'log' ? 'log' : 'normal'; Kit.state.set('es', state.es, 'normal'); if (sel) render(); } });
  }
  if (window.PLANE_Y === 'span') {   
    [['fa', 'Linear fit'], ['ft', 'Linear fit, thinking only'], ['fn', 'Linear fit, non-thinking only']].forEach(function (T) {
      Kit.switchControl({ mount: row, key: T[0], label: T[1], options: [{ value: 'off', label: 'Off' }, { value: 'on', label: 'On' }], dflt: 'off',
        onchange: function (v) { state[T[0]] = v === 'on' ? 'on' : 'off'; Kit.state.set(T[0], state[T[0]], 'off'); if (sel) render(); } });
    });
    Kit.switchControl({ mount: row, key: 'zoom', label: 'Axes', options: [{ value: 'eq', label: 'Same scale, zoomed to the points' }, { value: 'fit', label: 'Each axis to its own data' }], dflt: 'eq',   
      onchange: function (v) { state.zoom = v === 'fit' ? 'fit' : 'eq'; Kit.state.set('zoom', state.zoom, 'eq'); if (sel) render(); } });
  }
  Kit.switchControl({ mount: row, key: 'wd', label: CONTROL_WORDS.wd.label,
    options: CONTROL_WORDS.wd.options,
    dflt: 'adj',
    onchange: function (v) { state.wd = v; if (sel) render(); } });
  
  
  Kit.switchControl({ mount: row, key: 'fitci', label: CONTROL_WORDS.fitci.label,
    options: CONTROL_WORDS.fitci.options,
    dflt: 'honest',   
    onchange: function (v) { state.fitci = v; if (sel) render(); } });
  if (D.bayPrev) {   
    
    Kit.switchControl({ mount: row, key: 'move', label: CONTROL_WORDS.move.label + prevFitName(),   
      options: CONTROL_WORDS.onoff,
      dflt: 'off',
      onchange: function (v) { state.move = v; if (sel) render(); } });
  }

  
  
  
  
  
  
  
  
  if (Kit.state.get('space', null) === 'uniform') { Kit.state.set('xs', 'raw', 'logit'); Kit.state.set('ys', 'raw', 'logit'); Kit.state.set('space', null, null); }
  ['xs', 'ys'].forEach(function (k) { var v0 = Kit.state.get(k, null); if (v0 !== null && v0 !== 'raw' && v0 !== 'logit') Kit.state.set(k, null, null); });   
  var lv0 = Kit.state.get('line', null); if (lv0 !== null && lv0 !== 'off' && lv0 !== 'steps' && lv0 !== 'axes') Kit.state.set('line', null, null);
  var lw0 = Kit.state.get('lw', null); if (lw0 !== null && lw0 !== 'equal' && lw0 !== 'bands') Kit.state.set('lw', null, null);
  var rs0 = Kit.state.get('resid', null); if (rs0 !== null && rs0 !== 'off' && rs0 !== 'on') Kit.state.set('resid', null, null);
  else if (Kit.state.get('space', null) !== null) Kit.state.set('space', null, null);
  var sb = document.getElementById('spacebar'), moreDet = document.getElementById('morecontrols');
  if (!moreDet && sb) {
    moreDet = document.createElement('details'); moreDet.id = 'morecontrols'; moreDet.className = 'about';
    moreDet.innerHTML = '<summary>' + CONTROL_WORDS.more + '</summary><div class="kit-filter-row kit-static" id="moreswitches"></div><div class="kit-filter-row kit-static" id="morelevels"></div>';
    sb.parentNode.insertBefore(moreDet, sb); moreDet.appendChild(sb);
  }
  [['xs', CONTROL_WORDS.xs.label], ['ys', CONTROL_WORDS.ys.label]].forEach(function (ax) {   
    Kit.switchControl({ mount: sb,
      key: ax[0], label: ax[1],
      options: CONTROL_WORDS.scale,   
      dflt: 'logit',
      onchange: function (v) {
        state[ax[0]] = v === 'raw' ? 'raw' : 'logit';
        if (sel) render();
      } });
  });
  state.xs = Kit.state.get('xs', 'logit') === 'raw' ? 'raw' : 'logit'; state.ys = Kit.state.get('ys', 'logit') === 'raw' ? 'raw' : 'logit';
  
  
  Kit.switchControl({ mount: sb, key: 'line', label: CONTROL_WORDS.line.label,
    options: CONTROL_WORDS.line.options,
    dflt: 'steps',
    onchange: function (v) { state.line = (v === 'off' || v === 'axes') ? v : 'steps'; if (sel) render(); } });
  var lv = Kit.state.get('line', 'steps'); state.line = (lv === 'off' || lv === 'axes') ? lv : 'steps';
  
  
  
  Kit.switchControl({ mount: sb, key: 'lw', label: CONTROL_WORDS.lw.label,
    options: CONTROL_WORDS.lw.options,
    dflt: 'equal',
    onchange: function (v) { state.lw = v === 'bands' ? 'bands' : 'equal'; if (sel) render(); } });
  state.lw = Kit.state.get('lw', 'equal') === 'bands' ? 'bands' : 'equal';
  
  
  Kit.switchControl({ mount: sb, key: 'resid', label: CONTROL_WORDS.resid.label,
    options: CONTROL_WORDS.onoff,
    dflt: 'off',
    onchange: function (v) { state.resid = v === 'on' ? 'on' : 'off'; if (sel) render(); } });
  state.resid = Kit.state.get('resid', 'off') === 'on' ? 'on' : 'off';
  var mvSw = document.querySelector('#chartcontrols .kit-switch[data-key="move"]'); if (mvSw) sb.appendChild(mvSw);
  
  
  var sn = document.createElement('p'); sn.id = 'spacenote'; sn.style.cssText = 'font-size:.85rem;color:#52514e;margin:.4rem 0 0;max-width:80ch';
  
  sn.textContent = 'Straight scale by definition: ' + CAP_KEYS.capC_z.name() + ' \u2014 linear; ' + CAP_KEYS.capC.name() + ', ' + CAP_KEYS.capC_j.name() + ' and ' + dName('x') + ' \u2014 logit.';
  sb.appendChild(sn);

  buildLevels();
  state.xdef = Kit.state.get('xdef', 'crossing'); if (/^D\d+$/.test(state.xdef)) state.xdef = 'crossing';   
  state.move = Kit.state.get('move', 'off') === 'on' ? 'on' : 'off';   
  state.partial = Kit.state.get('partial', 'hide') === 'show' ? 'show' : 'hide';
  state.runs = state.runs || {};   
  
  
  state.src = (function () { var v = Kit.state.get('src', bayesDefault() ? 'bayes' : 'project'); return v === 'bayes' && D.bay ? 'bayes' : 'project'; })();
  buildChips(); refreshPartialChips();   
  hoverWire();
  wireDrag();
  render();
}

var srcCtl = null;



function bayesDefault() { return !!(D.bay && D.shared && D.bay.rows.length * 2 >= D.shared.configs.length); }
function buildSrcSwitch() {
  srcMount.textContent = '';
  srcCtl = Kit.switchControl({ mount: srcMount, key: 'src',
    label: CONTROL_WORDS.src.label,
    options: [{ value: 'project', label: houseName() },
              { value: 'bayes', label: CONTROL_WORDS.src.bayes }],
    dflt: bayesDefault() ? 'bayes' : 'project',   
    onchange: function (v) {
      var was = state.src;
      state.src = v;
      if (sel && v !== was) { render(); frameLine(); }   
    } });
}



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

 

var heldTimer = null;
function render() {
  syncPresets(); syncMissingChains();
  if (!heldTimer) { heldCheck(); heldTimer = setInterval(heldCheck, 120000); }
  if (!elA || !sel) return;      
  mountExport();
  syncWdLock();
  syncXdefLock();
  markControlData();
  if (state.view === 'ridges') { renderRidges(); renderOpusFold(); return; }
  if (EXPORTING) { renderScatter(); renderOpusFold(); return; }   
  
  
  
  var sweeping = dragActive || !!playTimer;
  if (!sweeping || !CROP) { LIMX = null; LIMY = null; renderScatter(); CROP = cropRange(EXT, LIM); }   
  if (CROP) { LIMX = CROP.slice(); LIMY = CROP.slice(); try { renderScatter(); } finally { LIMX = null; LIMY = null; } }
  renderOpusFold();
}

 





var OPUS_PAIR = ['claude-opus-5', 'claude-opus-5-thinking'];
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
  var band = function (a) { return a.lo != null && a.hi != null ? ' [' + P(a.lo) + ', ' + P(a.hi) + ']' : ''; };   
  var moreAvg = A.avg.z > B.avg.z ? A : B, lessAvg = moreAvg === A ? B : A;
  var moreRidge = A.ridge.median_z > B.ridge.median_z ? A : B, lessRidge = moreRidge === A ? B : A;
  var overlap = A.avg.lo != null && B.avg.lo != null && Math.max(A.avg.lo, B.avg.lo) <= Math.min(A.avg.hi, B.avg.hi);
  var tA = A.r.tau && A.r.tau.median, tB = B.r.tau && B.r.tau.median;
  var wide = tA != null && tB != null ? (tA > tB ? A : B) : null;
  var spread = wide ? ' The ' + wide.c.label + ' model spreads more from task to task (spread ' + Math.max(tA, tB).toFixed(1) + ' against ' + Math.min(tA, tB).toFixed(1) + ' difficulty units): a heavier tail of tasks it keeps failing pulls its average failure rate up and its average-rate crossing down, while its typical task is the safer one.'
                    : ' The model with the wider spread from task to task has a heavier tail of tasks it keeps failing, which pulls its average failure rate up and its average-rate crossing down while its typical task stays safer.';
  var cens = (A.ridge.p_censored > 0.05 || B.ridge.p_censored > 0.05)
    ? ' Part of the D99 draws are censored here (' + Math.round(100 * A.ridge.p_censored) + '% and ' + Math.round(100 * B.ridge.p_censored) + '%); read the ridges with that share in mind.'
    : ' This is not a censoring effect: no draw of either model’s D99 is censored; the open chevrons on the plane concern D50.';
  var cov = '';
  [A, B].forEach(function (a) { var cv = coverageOf(a.c); if (cv && cv.tasks < cv.of) cov += ' ' + a.c.label + ' has attempts on ' + Math.round(cv.share * 100) + '% of this set\u2019s tasks; the tasks it did not attempt (its refusals) are out of its fit, which favours it a little under the average-rate reading.'; });
  txt.textContent = 'Ridge here = the posterior of the median-task D99, the quantity the ridges view used to draw under every definition: the difficulty at which a typical task is failed less than once in a hundred. Scatter = the default point, the average-rate D99: the difficulty at which the average failure rate over tasks reaches 1%; that is the default reliability. '
    + 'Under the default definition ' + A.c.label + ' reads ' + P(A.avg.z) + band(A.avg) + ' and ' + B.c.label + ' ' + P(B.avg.z) + band(B.avg) + ', so ' + moreAvg.c.label + ' is the more reliable' + (overlap ? ', and the two uncertainty bands overlap: the ordering is suggestive, not settled.' : ', and the two uncertainty bands do not overlap: the difference is statistically significant.')
    + ' On the ridges ' + moreRidge.c.label + ' is the higher (' + P(moreRidge.ridge.median_z) + ' against ' + P(lessRidge.ridge.median_z) + '): on a typical task it is the safer model.'
    + (moreAvg !== moreRidge ? ' Both readings are right about different things.' : '') + spread + cens + cov
    + ' Trust the scatter for reliability, the default definition; read the median-task ridge as the typical-task view. The ridges view itself now follows the definition switch: under the average-rate definition it shows the 80% uncertainty band of the same crossing the dot marks, so the two views agree; the median-task ridges remain under the Median definition where that chain is served.';
}

 
function vocabNote() {   
  var el = document.getElementById('vocabnote'); if (!el) return;
  el.textContent = isCap()
    ? dName('y') + ': the difficulty at which a model\u2019s solve chance is ' + fmtLev(100 - state.c) + '%.'
    : dName('x') + ' and ' + dName('y') + ': the difficulty at which a model\u2019s solve chance is ' + fmtLev(100 - state.a) + '% and ' + fmtLev(100 - state.c) + '%.';
}
function avgWhiskerLabel() {   
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
      medNote = ' · bootstrap support at this pair: down to ' + Math.round(worst * 100) + '% of resamples for some models (per-dot fractions on hover)';   
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
var CAPC_CHECKS_RUNNING = false;  
function notes() {
  var el = document.getElementById('notes') || document.createElement('div');   
  el.textContent = '';
  function warn(html) {
    var w = document.createElement('div');
    w.className = 'warn';
    w.innerHTML = html;
    el.appendChild(w);
  }
  if (state.src === 'bayes') { var cs = D.shared.configs.filter(cleanedScope); if (cs.length) warn('Cleaned fits with a partial scope: ' + cs.map(function (c) { return c.label + ' \u2014 ' + cleanedScope(c); }).join('; ') + '.'); }
  if (state.src === 'bayes') { var ag = D.shared.configs.filter(asGraded); if (ag.length) warn('The fitted curves use the attempts as first graded (the cleaned fits land with the fits\u2019 next release): ' + ag.map(function (c) { return c.label; }).join(', ') + '. the reference estimator already carries the adopted cleaning.'); }
  var ab = D.bay && D.bay.disclosures && D.bay.disclosures.abandoned_cut;   
  if (ab && ab.plain && state.src === 'bayes') warn(ab.plain);
  var noted = D.shared.configs.filter(function (c) { return armNote(c); });
  if (noted.length) warn('Model notes: ' + noted.map(function (c) { return c.label + ' \u2014 ' + armNote(c); }).join('; ') + '.');   
  var wa = withheldArms();
  if (wa.length) warn('Not shown: ' + wa.map(function (i) { var c = D.shared.configs[i]; return c.label + ' \u2014 ' + WITHHELD[c.id]; }).join('; ') + '.');   
  var pa = partialArms();
  if (pa.length) {   
    var pnames = pa.map(function (i) { var c = D.shared.configs[i], cv = coverageOf(c); return c.label + ' (' + Math.round(cv.share * 100) + '%)'; });
    warn((partialShown() ? 'Partial models shown greyed and kept out of the fit' : 'Partial models hidden') + ' \u2014 attempts on fewer than 90% of this set\u2019s tasks: ' + pnames.join(', ') + (partialShown() ? '.' : '. The Partial models switch shows them.'));
  }
  
  
  if (state.src === 'bayes' && D.bay) {
    var nEx = D.bay.rows.filter(function (r) { return r.avg_source === 'exact'; }).length, nAll = D.bay.rows.length;
    warn(state.def === 'average'
      ? 'Bayesian reliability shown = the average-rate D99 (the default reliability): ' + (nEx === nAll ? 'exact crossing draws for every model.' : nEx ? 'exact crossing draws for ' + nEx + ' of ' + nAll + ' models; the rest read off the fit\u2019s average-rate curves (an interim estimator; the served set predates the fits\u2019 export switch \u2014 those numbers move at the switch, per model, announced).' : 'read off the fit\u2019s pointwise average-rate curves \u2014 an interim estimator until the fits\u2019 maintainers exports exact average-rate crossing draws; the numbers move at that switch, per model, announced.')
      : 'Median-task definition: exact crossing draws from the fits\u2019 levels tables; the default reliability is the average-rate D99 (the \u201cAverage rate\u201d definition), one to two steps of the difficulty scale easier for most models.');
  }
  
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
  var SPACING_CHECKS_RUNNING = false;  
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
      + 'per-task measurement floor are BOUNDS (open chevrons '
      + 'pointing toward the uncertain side), never interpolated '
      + 'through censored bins; the average-rate chain reaches deep '
      + 'levels by pooling where the median chain cannot at 128 '
      + 'attempts per task.');
}
 
var BENCH_NAME = { humaneval: 'wave 1', mbpp: 'wave 1' };   
function sampledNote(f) {
  if (!f.n_arms_sampled || f.n_arms_sampled === f.population_M) return '';
  var wh = f.partial_arms_withheld || [], byb = f.n_arms_by_benchmark || {};
  var pending = Object.keys(byb).filter(function (b) { return byb[b] < f.n_arms_sampled; }).map(function (b) { return BENCH_NAME[b] || 'wave 1'; }).filter(function (v, i, a) { return a.indexOf(v) === i; });
  var reasons = f.withheld_reasons || {};
  var parts = wh.map(function (x) { var r = reasons[x]; return x.replace(/^[^/]+\//, '') + (r ? ' \u2014 ' + String(r).split(' (')[0] : ''); });   
  var unexplained = wh.some(function (x) { return !reasons[x]; });
  return ' (' + f.n_arms_sampled + ' sampled \u00b7 ' + wh.length + ' withheld: ' + parts.join(', ')
    + (unexplained ? (pending.length ? ', ' + pending.join(' + ') + ' pending' : ', a benchmark pending') : '') + ')';
}




function asOf(ts) {   
  var s = String(ts || ''), t = Date.parse(s), out = plainTs(s);
  if (isFinite(t)) { var ageH = (Date.now() - t) / 36e5; if (ageH > 36) out += ' (inputs unchanged for ' + Math.round(ageH / 24) + ' days)'; }
  return out;
}
function bayesNote() {   
  if (!(D.bay && (D.bay.interim && D.bay.interim.n || !bayesDefault()))) return '';
  return 'Bayesian: ' + D.bay.rows.length + ' of ' + D.shared.configs.length + ' models with posteriors' + (D.bay.interim && D.bay.interim.n ? ', ' + D.bay.interim.n + ' interim (from the newer fit)' : '') + (bayesDefault() ? '' : ' \u2014 project estimator shown by default, Bayesian one click away');
}
function recordCount(dataId) {   
  var C = D && D.man && D.man.counts_of_record; if (!C) return null;
  var k = { board: 'wave1', top: 'wave2', board_top: 'wave12', 'new': 'new_total', all: 'all' }[dataId];
  return k && C[k] != null ? +C[k] : null;
}
function tasksText(f, dsId) {   
  var t = tasksTextBase(f, dsId), rc = D && D.golden ? null : recordCount(D && D.dataId), shown = f.tasks_kept != null ? f.tasks_kept : f.tasks;
  if (rc == null || shown == null || rc === shown) return t;
  var fmt = function (n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); };
  var clause = rc < shown ? 'the kept count is now ' + fmt(rc) + '; this fit frame predates a withdrawal' : 'the kept count is ' + fmt(rc) + '; the rest awaits the axis';
  return /\)$/.test(t) ? t.replace(/\)$/, '; ' + clause + ')') : t + ' (' + clause + ')';   
}
function tasksTextBase(f, dsId) {   
  if (f.tasks_kept != null && f.tasks_kept !== f.tasks) return f.tasks + ' tasks on the axis (' + f.tasks_kept + ' kept; ' + (f.tasks_awaiting_axis != null ? f.tasks_awaiting_axis : f.tasks_kept - f.tasks) + ' await the next axis fit)';
  if (f.tasks_on_axis != null) return f.tasks + ' tasks on the axis';
  return f.tasks + (dsId === 'board' ? ' kept tasks' : ' tasks');
}


function heldCheck() { return;   /* standalone copy: no rebuild loop, no held line */
  var el = document.getElementById('framebar'); if (!el) return;
  fetch(MOUNT + 'liveness.txt', { cache: 'no-store' }).then(function (r) { return r.ok ? r.text() : Promise.reject(r.status); })
    .then(function (t) {
      var ts = Date.parse(String(t).trim()), age = isFinite(ts) ? (Date.now() - ts) / 60000 : Infinity;
      
      setHeld(age > 10 ? 'Held: the rebuild loop is not ticking; the numbers stand as built and refresh when it returns.' : '');
    })
    .catch(function () { setHeld('Held: no liveness from the rebuild loop; the numbers stand as built and refresh when it returns.'); });
}
var HELD = {};   
function setHeld(msg, kind) {
  HELD[kind || 'liveness'] = msg || '';
  msg = Object.keys(HELD).map(function (k) { return HELD[k]; }).filter(Boolean).join(' ');
  var el = document.getElementById('framebar') || document.querySelector('main') || document.body; if (!el) return;
  var h = document.getElementById('heldline');
  if (!h) { h = document.createElement('div'); h.id = 'heldline';  h.style.cssText = 'color:#8a2f0e;font-size:.85rem;margin:.1rem 0 .3rem'; if (el.id === 'framebar') el.parentNode.insertBefore(h, el); else el.insertBefore(h, el.firstChild); }
  h.textContent = msg; h.hidden = !msg;
  if (msg) h.setAttribute('data-critical-text', ''); else h.removeAttribute('data-critical-text');   
}
function frameLine() {
  var el = document.getElementById('framebar'); if (!el || !D || !D.shared) return;
  var f = D.shared.frame || {};
  var base = (D.golden ? 'golden set (12) \u00b7 ' : '') + (DATASETS[D.dataId] ? (DATASETS[D.dataId].frameLabel || DATASETS[D.dataId].label) + ' \u00b7 ' : '') + mainConfigs().length + ' models';   
  
  el.textContent = base;
  var mc = document.getElementById('machinery'); if (mc) mc.textContent = 'as of ' + asOf(f.build_ts || f.build_date) + ', ' + CADENCE + '.';   
  if (location.pathname === '/' || D.dsId !== 'board') return;   
  fetch('./fvd-data/manifest.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (m) {
    var bf = m && (m.frame || m); if (!bf || bf.population_M == null) return;
    if (bf.population_M !== mainConfigs().length || (bf.keep_set_hash && bf.keep_set_hash !== f.keep_set_hash)) {
      el.textContent = base + ' Board tool today: ' + bf.population_M + ' models' + (bf.keep_set_hash && bf.keep_set_hash !== f.keep_set_hash ? ' on another keep-set' : '') + '.';
      el.classList.add('tear');
    } else { el.textContent = base; el.classList.remove('tear'); }
  }).catch(function () {});
}


function reliabilityDefinition() {
  var el = document.getElementById('reliability-def'); if (!el || !D.shared) return;
  var f = D.shared.frame, ft = D.bay && D.bay.fit_frame ? D.bay.fit_frame.tasks : f.tasks;
  var frameClause = 'an estimate names the keep-set it was fitted on (the current keep-set ' + f.keep_set_hash
    + (ft !== f.tasks ? '; the fitted rows on this page were fitted on the keep-set before its latest label decisions' : '') + ')';   
  el.textContent = 'Reliability: the difficulty up to which a model fails fewer than one attempt in a hundred. Its adopted name is the average-rate D99: '
    + 'the difficulty at which the model\u2019s fitted average failure rate first reaches 1%, on the kept tasks; ' + frameClause + '. '
    + 'Two estimators of this one quantity appear on this site and are named wherever a number is shown: the average-rate estimate (a local-logistic fit of failure rate against pooled task difficulty) '
    + 'and the Bayesian estimate (the posterior-median crossing of the fitted model, read off the fit\u2019s curves). They differ most in the 1% tail, so a figure is comparable only with its estimator and its task frame named.';
}





function fitCaption(fit, n) {
  var el = document.getElementById('fitcaption'); if (!el) return;
  var logitFit = !inAxes() || (state.xs !== 'raw' && state.ys !== 'raw');
  var fold = document.getElementById('fitfold');
  if (!fit || !n || state.line === 'off' || state.lw === 'bands' || !logitFit || fit.lo == null) { el.textContent = ''; el.hidden = true; if (fold) fold.hidden = true; return; }
  var xn = dName('x'), yn = dName('y'), xl = fmtLev(state.a) + '%', yl = fmtLev(state.c) + '%';
  var a = fit.a, b = fit.b, ea = Math.exp(a);
  var eaTxt = a < 0 ? '1/' + Math.round(1 / ea) : ea.toFixed(2);
  var aRange = (fit.aLo != null && fit.aHi != null) ? ' [' + fit.aLo.toFixed(2) + ', ' + fit.aHi.toFixed(2) + ']' : '';
  var set = String((DATASETS[state.data] && DATASETS[state.data].label) || state.data).replace(/\s*\([^)]*\)\s*$/, '');   
  var runDrawn = anyRunOnPlane() && Array.from(sel).some(function (i) { return isRun(i) && !isHidden(i); });
  var outs = [state.partial === 'show' ? 'the faded partial models' : null, runDrawn ? 'the run\u2019s checkpoints' : null].filter(Boolean);
  var drawnTxt = outs.length ? 'across the fitted models (' + outs.join(' and ') + ' drawn are not in the fit)' : 'across the drawn models';   
  el.hidden = false; if (fold) fold.hidden = false;   
  el.textContent = 'Both axes are positions on the difficulty scale. A task’s position is its failure rate averaged over the models that shape the scale (one vote per model), smoothed toward one half by the Jeffreys step on the total attempts, placed on the scale by its odds: one step on the scale multiplies the odds of failure by about 2.7, and positions print as shares (a difficulty of 70% is a task those models fail on 70% of their attempts on average). '
    + xn + ' is the difficulty at which a model’s fitted failure curve crosses ' + xl + ', ' + yn + ' the difficulty at which the same curve crosses ' + yl + '. A straight line is fitted through the models in scale steps ' + drawnTxt + ' (ordinary least squares, every dot equal; equal axes): it gives ' + yn + ' as an intercept a plus a slope b times ' + xn + '. The slope b is how many steps ' + yn + ' moves for each step of ' + xn + ' across models; with b near one the intercept a is a constant gap: every model’s ' + yn + ' sits a steps below its ' + xn + ' (the size of a), the same gap for every model, and the odds of failure at the ' + yn + ' position are e to the power a times those at the ' + xn + ' position. With b away from one the gap changes by (b − 1) steps per step of ' + xn + ', so the intercept alone is the gap at the scale’s 50% mark. '
    + 'A crossing that lies beyond the scale\u2019s end is drawn as an open chevron at the end, pointing to the side it lies beyond, with its band, and is kept out of the fitted line. '
    + 'Today: slope ' + b.toFixed(2) + ' [' + fit.lo.toFixed(2) + ', ' + fit.hi.toFixed(2) + '], intercept ' + a.toFixed(2) + aRange + ' steps (e to the power ' + a.toFixed(2) + ', about ' + eaTxt + '), R ' + fit.r.toFixed(2) + ', ' + n + ' models on ' + set + '.';
}
function headline(nFit, fit, nFull, sweeping) {
  var el = document.getElementById('headline'); if (!el) return;
  if (window.PLANE_Y === 'span') {   
    el.textContent = (window.SPAN_LEAF_STATE === 'missing' && state.src === 'bayes' && state.def === 'average' && state.yq !== 'ent') ? 'The spans of record are unreadable; nothing is drawn.' : (state.yq === 'ent' ? 'How does the average outcome entropy of a model\u2019s fitted failure curve, integrated over logit difficulty with the ' + edWord() + ' weight, run against D' + fmtLev(100 - state.a) + '?' : 'How does the transition length ' + dName('y').replace(/ \(.*$/, '') + ', from failing ' + fmtLev(state.c) + '% of tasks to failing ' + fmtLev(state.u) + '%, run against D' + fmtLev(100 - state.a) + '?');
    document.body.classList.toggle('yq-ent', state.yq === 'ent');
    var fb0 = document.getElementById('fitbox');
    if (!fb0) { fb0 = document.createElement('div'); fb0.id = 'fitbox'; fb0.className = 'kit-readout-box'; fb0.setAttribute('data-chain-val', 'def src xdef fitci'); el.insertAdjacentElement('afterend', fb0); }
    var rows = (D.spanFits || []);
    if (!rows.length) { fb0.textContent = ''; fb0.hidden = true; fb0.style.display = 'none'; return; }   
    var escS = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    fb0.innerHTML = rows.map(function (r) {   
      if (!r.fit) return '<div><span class="fitlead">Linear fit, ' + escS(r.label) + ': </span><span class="fittail">too few points to fit a line (' + r.n + ' drawn; the fit needs three)</span></div>';
      return '<div><span class="fitlead">Linear fit of ' + escS(dName('y').replace(/ \(.*$/, '')) + ' against ' + escS(dName('x')) + ', ' + escS(r.label) + ' (n = ' + r.n + '): </span><b>slope ' + r.fit.b.toFixed(2) + ' [' + r.fit.lo.toFixed(2) + ', ' + r.fit.hi.toFixed(2) + '], R ' + r.fit.r.toFixed(2) + '</b><span class="fittail">' + (state.yq === 'ent' && state.es === 'log' ? ', the entropy in log10' : ', in logit space') + '</span></div>';
    }).join('');
    fb0.hidden = false; fb0.style.display = '';
    return;
  }
  if (sweeping && !fit) return; 
  var capC = isCap();
  
  var q = capC ? (DATASETS[D.dataId] && DATASETS[D.dataId].group ? 'Does a model that solves more of the set also stay reliable further up the difficulty scale?' : 'Does a model that solves more of the pool also stay reliable further up the difficulty scale?')
               : 'Does a more capable model also stay reliable further up the difficulty scale?';
  var est = state.src === 'bayes' ? 'estimates from the fitted failure curves' : 'estimates from the smoothed failure trend';   
  var xw = capC ? CAP_KEYS[state.xdef].name() : dName('x');
  var ans;
  if (fit) {
    
    
    
    ans = 'The fitted line across the models, ' + dName('y') + ' against ' + xw + ': slope ' + fit.b.toFixed(2) + ' [' + fit.lo.toFixed(2) + ', ' + fit.hi.toFixed(2) + '], R ' + fit.r.toFixed(2) + (inAxes() ? ', in the axes as set' : ', in logit space') + (state.lw === 'bands' ? ', each dot weighted by its bands' : '') + '.';
  } else ans = 'Too few fully measured models at these levels to fit a line (' + nFull + ' measured; the fit needs three).';
  if (isCap() && !capBlock()) { q = ''; ans = CAP_KEYS[state.xdef].name() + ' is not published for this set yet; no model is drawn.'; }   
  
  var fb = document.getElementById('fitbox');
  if (!fb) { fb = document.createElement('div'); fb.id = 'fitbox'; fb.className = 'kit-readout-box'; fb.setAttribute('data-chain-val', 'def src xdef fitci'); el.insertAdjacentElement('afterend', fb); }   
  var escH = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  el.textContent = q;
  var fm = fit ? /^(.*?: )(slope [-\d.]+ \[[^\]]+\], R [-\d.]+)(.*)$/.exec(ans) : null;
  if (fm) fb.innerHTML = '<span class="fitlead">' + escH(fm[1]) + '</span><b>' + escH(fm[2]) + '</b><span class="fittail">' + escH(fm[3]) + '</span>';
  else fb.textContent = ans;
}
var frameLineDone = false;
function disclosureLine() {   
  var dz = D.bay && D.bay.disclosures; if (!dz) return '';
  var out = '';
  
  
  var provisionalDrawn = (D.shared && D.shared.configs || []).some(function (c) { return c.provisional; }) || !!document.querySelector('[data-mark][data-provisional="1"]');
  if (provisionalDrawn && dz.provisional_classes && dz.provisional_classes.length) out += ' \u00b7 provisional: ' + dz.provisional_classes.map(function (c) { return c['class'] || c; }).join(', ');
  return out;
}
function fitSetCount() {   
  var nInt = (D.bay.interim && D.bay.interim.n) || mainRows().filter(function (r) { return r.source === 'interim'; }).length, served = mainRows().length - nInt, n = D.bay.fit_set.n_arms;
  return (served === n ? served + ' models' : served + ' of ' + n + ' models served') + (nInt ? ' · ' + nInt + ' interim from the wave in flight' : '');
}
function stamp() {
  if (!frameLineDone) { frameLineDone = true; frameLine(); reliabilityDefinition(); }
  var f = D.shared.frame;
  
  
  
  (document.getElementById('stamp') || document.createElement('div')).innerHTML =   
    '<span data-chain-inv>' + mainConfigs().length + ' models · keep-set ' + f.keep_set_hash + ' · data fingerprint ' + f.runs_fingerprint + (f.runs_window ? ' · runs window ' + plainTs(f.runs_window) : '')
    + ' · axis ' + D.shared.axis.axis_id + (D.golden ? ' · ' + String(f.golden_note || 'golden set: a data point, not the difficulty definition').replace(new RegExp('\\s*\\((' + String.fromCharCode(83, 122, 121, 109, 111, 110) + ' [0-9-]+|as adopted)\\)'), '') : '') + '</span>'
    + (D.bay && D.bay.fit_set && D.bay.fit_set.sha12 ? ' · Bayesian fit set <span data-fit-set>' + D.bay.fit_set.sha12 + '</span> (' + fitSetCount() + ')' : '')
    + ' · <a href="' + MOUNT + 'data/manifest.json">data manifest</a>';
  var more = document.getElementById('stampmore');
  if (!more) { more = document.createElement('div'); }   
  more.innerHTML = (D.bay ? 'estimators: <span data-chain-val="def src">median-task ' + D.bay.estimator_version + ' · average-rate ' + D.bay.estimator_version_avg + '</span>' : 'estimator: project average-rate chain (crossing rows from the pool curves; no posterior tables yet)')
    + (D.shared.capC ? ' · ' + CAP_KEYS.capC.name() + ' <span data-chain-val="xdef">' + D.shared.capC.method_version + '</span>' + (D.shared.capC.frame && D.shared.capC.frame.population_M ? ' (population ' + D.shared.capC.frame.population_M + ')' : '') : '')
    + (D.shared.capC_z ? ' · ' + CAP_KEYS.capC_z.name() + ' <span data-chain-val="xdef">' + D.shared.capC_z.method_version + '</span>' : '')
    + (D.shared.capC_j ? ' · ' + CAP_KEYS.capC_j.name() + ' <span data-chain-val="xdef">' + D.shared.capC_j.method_version + '</span>' : '')
    + (D.shared.artifact_flags ? ' · <span data-chain-val>\u2020 artifact flags active</span>' : '')
    + (D.bay && D.bay.gates && D.bay.gates.line ? ' · ' + D.bay.gates.line : '')
    + disclosureLine();   
}

