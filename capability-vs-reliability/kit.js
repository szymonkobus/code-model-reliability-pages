/* kit.js — the reference kit, served form 3d03181b, built 23 Sep 2026 from source 27cf95564768. */
(function (global) {
  'use strict';
  var Kit = {};
  var listeners = [];
  function params() { return new URLSearchParams(location.search); }
  Kit.state = {
    get: function (key, dflt) {
      var v = params().get(key);
      return v === null ? dflt : v;
    },
    set: function (key, value, dflt) {
      var p = params();
      if (value === null || value === undefined || value === dflt) p.delete(key);
      else p.set(key, value);
      var qs = p.toString();
      history.replaceState(null, '',
        location.pathname + (qs ? '?' + qs : '') + location.hash);
      listeners.forEach(function (fn) { fn(key, value); });
    },
    onChange: function (fn) { listeners.push(fn); },
  };
  Kit.switchControl = function (cfg) {
    var el = typeof cfg.mount === 'string'
      ? document.querySelector(cfg.mount) : cfg.mount;
    var current = Kit.state.get(cfg.key, cfg.dflt);
    if (!cfg.options.some(function (o) { return o.value === current; }))
      current = cfg.dflt;

    var wrap = document.createElement('div');
    wrap.className = 'kit-switch';
    wrap.dataset.key = cfg.key;
    wrap.setAttribute('role', 'group');
    var lab = document.createElement('span');
    lab.className = 'kit-switch-label';
    lab.textContent = cfg.label;
    wrap.appendChild(lab);
    var seg = document.createElement('div');
    seg.className = 'kit-switch-seg';
    wrap.appendChild(seg);

    var buttons = cfg.options.map(function (o) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = o.label;
      b.dataset.value = o.value;
      b.setAttribute('aria-pressed', String(o.value === current));
      b.addEventListener('click', function () { set(o.value); });
      seg.appendChild(b);
      return b;
    });

    seg.addEventListener('keydown', function (ev) {
      var idx = cfg.options.findIndex(function (o) { return o.value === current; });
      var to = null;
      if (ev.key === 'ArrowRight') to = Math.min(idx + 1, cfg.options.length - 1);
      else if (ev.key === 'ArrowLeft') to = Math.max(idx - 1, 0);
      else if (ev.key === 'Home') to = 0;
      else if (ev.key === 'End') to = cfg.options.length - 1;
      if (to !== null && to !== idx) {
        ev.preventDefault();
        set(cfg.options[to].value);
        buttons[to].focus();
      }
    });

    function paint() {
      buttons.forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.dataset.value === current));
      });
    }
    function set(value) {
      if (value === current) return;
      current = value;
      paint();
      Kit.state.set(cfg.key, value, cfg.dflt);
      if (cfg.onchange) cfg.onchange(value);
    }

    el.appendChild(wrap);
    paint();
    if (cfg.onchange) cfg.onchange(current); // init fire: render from state
    return { value: function () { return current; },
             set: set, element: wrap };
  };
  Kit.filterRow = function (mount) {
    var el = typeof mount === 'string' ? document.querySelector(mount) : mount;
    var row = document.createElement('div');
    row.className = 'kit-filter-row';
    el.appendChild(row);
    return row;
  };
  var SEP = ' · ';
  function fitChip(dst) {
    var src = dst.parentNode && dst.parentNode.querySelector('[data-fit-src]');
    if (!src) return;
    var max = +dst.getAttribute('data-fit-max');
    var maxLines = +dst.getAttribute('data-fit-lines');
    var lh = +dst.getAttribute('data-fit-lh');
    var cx = +dst.getAttribute('x');
    var full = src.textContent.replace(/\s+/g, ' ').trim();
    while (dst.firstChild) dst.removeChild(dst.firstChild);
    var probe = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
    dst.appendChild(probe);
    function width(s) { probe.textContent = s; return probe.getComputedTextLength(); }
    var raw = full.split(SEP);
    var boundUnits = raw.filter(function (u) { return !/…\s*$/.test(u); });
    if (boundUnits.length && boundUnits.length < raw.length) raw = boundUnits;
    var units = raw.map(function (u, i) { return u + (i < raw.length - 1 ? ' ·' : ''); });
    var lines = [], cur = '';
    function pushWordWrapped(u) {
      u.split(' ').forEach(function (word) {
        var cand = cur ? cur + ' ' + word : word;
        if (width(cand) <= max || !cur) cur = cand;
        else { lines.push(cur); cur = word; }
      });
    }
    units.forEach(function (u) {
      if (width(u) > max) { pushWordWrapped(u); return; }
      var cand = cur ? cur + ' ' + u : u;
      if (width(cand) <= max || !cur) cur = cand;
      else { lines.push(cur); cur = u; }
    });
    if (cur) lines.push(cur);
    dst.removeChild(probe);
    if (lines.length > maxLines) dst.setAttribute('data-fit-overflow', '1');
    else dst.removeAttribute('data-fit-overflow');
    lines.forEach(function (s, i) {
      var t = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
      t.setAttribute('x', cx);
      if (i) t.setAttribute('dy', lh);
      t.textContent = s;
      dst.appendChild(t);
    });
  }
  Kit.flowFit = function (root) {
    var scope = root || document;
    var dsts = scope.querySelectorAll('[data-fit-dst]');
    for (var i = 0; i < dsts.length; i++) fitChip(dsts[i]);
  };
  (function armFlowFit() {
    var mo = new MutationObserver(function (muts) {
      var hit = muts.some(function (m) {
        var n = m.target.nodeType === 3 ? m.target.parentNode : m.target;
        if (!n || !n.closest) return false;
        if (n.closest('[data-fit-src]')) return true;
        return m.type === 'childList' && [].some.call(m.addedNodes, function (a) {
          return a.nodeType === 1 && (a.matches && a.matches('svg') || a.querySelector && a.querySelector('[data-fit-src]'));
        });
      });
      if (!hit) return;
      mo.disconnect();
      Kit.flowFit();
      model();
    });
    function model() { mo.observe(document.documentElement, { subtree: true, childList: true, characterData: true }); }
    if (document.readyState === 'loading')
      document.addEventListener('DOMContentLoaded', function () { Kit.flowFit(); model(); });
    else { Kit.flowFit(); model(); }
  })();
  Kit.scrollTables = function (root) {
    var n = 0, tables = (root || document).querySelectorAll('table');
    for (var i = 0; i < tables.length; i++) {
      var t = tables[i], p = t.parentElement, has = false;
      if (!p || t.closest('code, pre, .kit-table-scroll, .tblwrap, .bleed') || p.closest('table')) continue;
      for (var a = p; a && a !== document.body && a !== document.documentElement; a = a.parentElement) { var cs = getComputedStyle(a); if (/(auto|scroll)/.test(cs.overflowX)) { has = true; break; } }
      if (has) continue;
      var box = document.createElement('div'); box.className = 'kit-table-scroll'; p.insertBefore(box, t); box.appendChild(t); n++;
    }
    return n;
  };
  Kit.phoneCharts = function (root, minPx) {
    minPx = minPx || 10; var n = 0, svgs = (root || document).querySelectorAll('svg');
    for (var i = 0; i < svgs.length; i++) {
      var sv = svgs[i], p = sv.parentElement; if (!p || p.closest('svg, button, nav, footer, table, .project-minimap, .kit-chart-scroll')) continue;
      var vb = (sv.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number); if (vb.length !== 4 || !vb[2]) continue;
      var texts = sv.querySelectorAll('text'); if (texts.length < 5) continue;
      var minFont = Infinity; for (var k = 0; k < texts.length; k++) { var f = parseFloat(getComputedStyle(texts[k]).fontSize); if (f && f < minFont) minFont = f; }
      if (!isFinite(minFont)) continue;
      var need = Math.ceil(vb[2] * minPx / minFont);
      if (need > vb[2]) need = Math.ceil(vb[2]);
      var have = p.getBoundingClientRect().width; if (have >= need) continue;
      var box = document.createElement('div'); box.className = 'kit-chart-scroll'; p.insertBefore(box, sv); box.appendChild(sv);
      sv.style.minWidth = need + 'px'; sv.style.height = 'auto'; n++;
    }
    return n;
  };

  var LADDER_FAMILIES = [['Qwen2.5-Coder', /qwen[-\s]?2\.5[-\s]?coder/i], ['Qwen2.5-Instruct', /qwen[-\s]?2\.5(?![-\s]?coder)/i], ['Qwen3.5', /qwen[-\s]?3\.5/i], ['Qwen3', /qwen[-\s]?3(?![.\d])/i]   /* Qwen3-Coder is Qwen3 in the palette registry (an appended rung), one family here too */,
    ['Claude', /claude|\bhaiku\b|\bsonnet\b|\bopus\b|\bfable\b/i], ['GLM', /\bglm\b/i], ['Kimi', /\bkimi\b|moonshot|moonlight/i], ['DeepSeek-Coder-V2', /deepseek[-\s]?coder[-\s]?v2/i], ['DeepSeek-Coder', /deepseek[-\s]?coder/i],
    ['DeepSeek-R1-Distill', /r1[-\s]?distill|\bds[-\s]?r1d\b/i], ['DeepSeek-V3', /deepseek[-\s]?v3|deepseek[-\s]?r1[-\s]?0528/i], ['GPT-5', /\bgpt[-\s]?5/i], ['Gemini', /\bgemini\b/i], ['Gemma-4', /\bgemma\b/i], ['OLMo-2', /\bolmo[-\s]?2\b/i], ['Olmo 3', /\bolmo[-\s]?3(?:\.\d+)?\b/i]];
  var LADDERS = { 'Qwen3': [0.6, 1.7, 4, 8, 14, 32], 'Qwen2.5-Instruct': [0.5, 1.5, 3, 7, 14, 32], 'Qwen2.5-Coder': [0.5, 1.5, 3, 7, 14, 32] };
  Kit.ladderFamily = function (label) { for (var i = 0; i < LADDER_FAMILIES.length; i++) if (LADDER_FAMILIES[i][1].test(label)) return LADDER_FAMILIES[i][0]; return null; };
  Kit.ladderRank = function (label) {
    var fam = Kit.ladderFamily(label); if (!fam) return { family: null, familyIndex: LADDER_FAMILIES.length, rank: null };
    var fi = -1; for (var i = 0; i < LADDER_FAMILIES.length; i++) if (LADDER_FAMILIES[i][0] === fam) fi = i;
    var s = String(label).toLowerCase(), base = null, m;
    if (/b-a\d/.test(s) || fam === 'DeepSeek-V3' || /\(final/.test(s)) return { family: fam, familyIndex: fi, rank: null };
    if (fam === 'Claude') { var t = { haiku: 1, sonnet: 2, opus: 3, fable: 4 }; for (var k in t) if (s.indexOf(k) >= 0) base = t[k]; }
    else if (fam === 'GPT-5') base = /\bnano\b/.test(s) ? 1 : /\bmini\b/.test(s) ? 2 : 3;
    else if (fam === 'Gemini') { m = s.match(/\b(\d\.\d)\b/); base = (m ? parseFloat(m[1]) * 10 : 0) + (/flash[-\s]?lite/.test(s) ? 1 : /flash/.test(s) ? 2 : /pro/.test(s) ? 3 : 2); }
    else { m = s.match(/(\d+(?:\.\d+)?)\s?b\b/); if (m) { base = parseFloat(m[1]); var lad = LADDERS[fam]; if (lad && lad.indexOf(base) >= 0) base = lad.indexOf(base); else if (lad) base = lad.length + base / 1000; } }
    if (base === null) return { family: fam, familyIndex: fi, rank: null };
    m = s.match(/\((?:checkpoint|step)\s*(\d+)\)/); if (m) base += parseInt(m[1], 10) / 1e6;
    return { family: fam, familyIndex: fi, rank: base };
  };
  Kit.sortByLadder = function (labels, labelOf) {
    labelOf = labelOf || function (x) { return String(x); };
    return labels.map(function (x, i) { var r = Kit.ladderRank(labelOf(x)); return { x: x, i: i, fi: r.familyIndex, rank: r.rank }; })
      .sort(function (a, b) { if (a.fi !== b.fi) return a.fi - b.fi; if (a.rank === null && b.rank === null) return a.i - b.i; if (a.rank === null) return 1; if (b.rank === null) return -1; if (a.rank !== b.rank) return a.rank - b.rank; return a.i - b.i; })
      .map(function (o) { return o.x; });
  };

  global.Kit = Kit;
})(window);
