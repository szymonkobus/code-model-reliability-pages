/* project UI kit v1 — the reference template (its first day, 31 Aug 2026).
 * CANONICAL: ~/reliability/how-we-work/the maintainers/ui-kit/kit.js (upstream). Served sites vendor a copy at their own gated build and name the
 * version they carry; copies are the design, drift is not (cleanup-0909 F5-108). Version line: kit.js 3d03181b, 2026-09-10; 23 Sep 2026: Kit.ladderRank / Kit.sortByLadder — the within-family ladder (the LADDER ORDER row's rule); 21 Sep 2026: Kit.scrollTables — every table in a sideways-scrolling box (the project maintainers' word of 21 Sep). 22 Sep 2026: Kit.phoneCharts — a chart keeps its labels at 10 px on a phone inside a sideways-scrolling box (the presentation critic's finding of 22 Sep).
 *
 * Consumed by the three tools (curves / crossings / cumulative): maintainers
 * vendor kit.js + kit.css into their site at build. No dependencies.
 *
 * Core contract (the maintainers's estimator-chain-swap binding): a switch
 * emits ONE state-change event carrying the full control state; the site
 * re-derives EVERYTHING from that state. The kit never lets a control
 * restyle part of a view — partial swaps are structurally impossible
 * because the only signal is "state changed, re-render".
 *
 * URL-state: every control round-trips through the query string, so any
 * page state is a copyable link and every bug report is a one-link repro.
 */
(function (global) {
  'use strict';
  var Kit = {};

  /* ---------------- URL state ---------------- */
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

  /* ---------------- the switch widget ----------------
   * Kit.switchControl({
   *   mount: element|selector,   // where to render
   *   key: 'def',                // URL query param
   *   label: 'Definition',       // visible label
   *   options: [{value:'average', label:'Average'},
   *             {value:'median',  label:'Median'}],
   *   dflt: 'average',           // default (omitted from URL)
   *   onchange: fn(value)        // fires on init AND every change
   * }) -> { value, set(value) }
   * Semantics: onchange means "the whole estimator chain for this key
   * changed — re-derive everything that depends on it".
   * Keyboard: Left/Right/Home/End on the group; buttons are real buttons.
   */
  Kit.switchControl = function (cfg) {
    var el = typeof cfg.mount === 'string'
      ? document.querySelector(cfg.mount) : cfg.mount;
    var current = Kit.state.get(cfg.key, cfg.dflt);
    if (!cfg.options.some(function (o) { return o.value === current; }))
      current = cfg.dflt;

    var wrap = document.createElement('div');
    wrap.className = 'kit-switch';
    wrap.dataset.key = cfg.key;   // gauntlet locates switches by URL key
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

  /* ---------------- filter row ----------------
   * One row above the content that hosts every control (dataviz rule:
   * filters scope everything below; never per-chart). */
  Kit.filterRow = function (mount) {
    var el = typeof mount === 'string' ? document.querySelector(mount) : mount;
    var row = document.createElement('div');
    row.className = 'kit-filter-row';
    el.appendChild(row);
    return row;
  };

  /* ---------------- flow chip fitter ----------------
   * For measured-layout SVGs (the process-flow diagram, flow-gen.js): a
   * chip is a rect + a HIDDEN <text data-fit-src> holding the [data-slot]
   * tspans (the binder's stable target — never restructured) + a VISIBLE
   * <text data-fit-dst> that this fitter rebuilds as wrapped lines from
   * src.textContent after every bind. Wrap: ' · '-separated units greedily,
   * word-wrapping any unit wider than the chip; reserve exceeded ->
   * data-fit-overflow="1" on the dst (gate-visible), content kept.
   * WHY HERE and not a <script> in the svg: pages inject the svg via
   * DOMParser + adoptNode, and DOMParser-parsed scripts never execute
   * (caught 08-31 pre-delivery). Auto-armed: a document observer fits chips
   * whenever a [data-fit-src] subtree appears or its text changes. */
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
    // bound-or-absent for FRAGMENTS (the maintainers decision, 08-31): a unit whose
    // slot is still the "…" placeholder is SUPPRESSED when any sibling unit
    // is bound ("2175 · ref …" renders "2175") — render nothing rather than
    // a stub that looks like a binding failure. A chip that is ONLY "…"
    // keeps its honest pre-bind placeholder.
    var boundUnits = raw.filter(function (u) { return !/…\s*$/.test(u); });
    if (boundUnits.length && boundUnits.length < raw.length) raw = boundUnits;
    // separator rides the line END ("Targeted 171 ·"), never the start —
    // leading middots read as stray bullets (flow-judge polish note 2)
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
        // svg subtree just injected?
        return m.type === 'childList' && [].some.call(m.addedNodes, function (a) {
          return a.nodeType === 1 && (a.matches && a.matches('svg') || a.querySelector && a.querySelector('[data-fit-src]'));
        });
      });
      if (!hit) return;
      mo.disconnect();          // fitting mutates dst; never observe our own work
      Kit.flowFit();
      arm();
    });
    function arm() { mo.observe(document.documentElement, { subtree: true, childList: true, characterData: true }); }
    if (document.readyState === 'loading')
      document.addEventListener('DOMContentLoaded', function () { Kit.flowFit(); arm(); });
    else { Kit.flowFit(); arm(); }
  })();

  /* ---------------- tables scroll sideways in their own box (the project maintainers' word of 21 Sep) ---------------- */
  Kit.scrollTables = function (root) {   // wraps every bare table under root (default: the document) in a .kit-table-scroll box; idempotent; returns the count wrapped
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

  /* ---------------- charts keep their labels readable on a phone (the presentation critic's finding of 22 Sep, the class of the project
     maintainers' word of 21 Sep on tables) ---------------- */
  Kit.phoneCharts = function (root, minPx) {   // every inline chart (an SVG with a viewBox, at least five labels, not an icon) whose smallest label would
    // render under minPx (default 10) at the container's width gets a .kit-chart-scroll box and a minimum drawing width so the labels keep
    // that size and the box scrolls sideways instead; idempotent; returns the count wrapped
    minPx = minPx || 10; var n = 0, svgs = (root || document).querySelectorAll('svg');
    for (var i = 0; i < svgs.length; i++) {
      var sv = svgs[i], p = sv.parentElement; if (!p || p.closest('svg, button, nav, footer, table, .project-minimap, .kit-chart-scroll')) continue;   // closest includes the element itself: ask its parent
      var vb = (sv.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number); if (vb.length !== 4 || !vb[2]) continue;
      var texts = sv.querySelectorAll('text'); if (texts.length < 5) continue;
      var minFont = Infinity; for (var k = 0; k < texts.length; k++) { var f = parseFloat(getComputedStyle(texts[k]).fontSize); if (f && f < minFont) minFont = f; }
      if (!isFinite(minFont)) continue;
      var need = Math.ceil(vb[2] * minPx / minFont);   // the drawing width at which the smallest label renders minPx tall
      if (need > vb[2]) need = Math.ceil(vb[2]);        // never wider than the drawing's own width
      var have = p.getBoundingClientRect().width; if (have >= need) continue;
      var box = document.createElement('div'); box.className = 'kit-chart-scroll'; p.insertBefore(box, sv); box.appendChild(sv);
      sv.style.minWidth = need + 'px'; sv.style.height = 'auto'; n++;
    }
    return n;
  };

  // A FAMILY'S ORDER IS ITS LADDER (the project maintainers' words of 23 Sep 2026, twice that day: inside a model family the order is the family's own
  // ladder, smallest to largest — Haiku → Sonnet → Opus → Fable, Qwen and Gemma by size, GPT-5 nano → mini, Gemini Flash-Lite → Flash — a thinking or
  // other variant beside its base, never alphabetical, never a measured value). The same rule the reference checker's LADDER ORDER row reads
  // (project-template/ladder-order.js), so a page that sorts with Kit.sortByLadder measures clean. Families keep the palette's order (Kit.FAMILIES in
  // kit-export.js when present, else the list below); mixtures (30B-A3B), version lines (DeepSeek-V3) and a series' final keep the page's order.
  var LADDER_FAMILIES = [['Qwen2.5-Coder', /qwen[-\s]?2\.5[-\s]?coder/i], ['Qwen2.5-Instruct', /qwen[-\s]?2\.5(?![-\s]?coder)/i], ['Qwen3-Coder', /qwen[-\s]?3[-\s]?coder/i], ['Qwen3.5', /qwen[-\s]?3\.5/i], ['Qwen3', /qwen[-\s]?3(?![.\d])/i],
    ['Claude', /claude|\bhaiku\b|\bsonnet\b|\bopus\b|\bfable\b/i], ['GLM', /\bglm\b/i], ['Kimi', /\bkimi\b|moonshot|moonlight/i], ['DeepSeek-Coder-V2', /deepseek[-\s]?coder[-\s]?v2/i], ['DeepSeek-Coder', /deepseek[-\s]?coder/i],
    ['DeepSeek-R1-Distill', /r1[-\s]?distill|\bds[-\s]?r1d\b/i], ['DeepSeek-V3', /deepseek[-\s]?v3|deepseek[-\s]?r1[-\s]?0528/i], ['GPT-5', /\bgpt[-\s]?5/i], ['Gemini', /\bgemini\b/i], ['Gemma-4', /\bgemma\b/i], ['OLMo-2', /\bolmo[-\s]?2\b/i], ['Olmo 3', /\bolmo[-\s]?3(?:\.\d+)?\b/i]];
  var LADDERS = { 'Qwen3': [0.6, 1.7, 4, 8, 14, 32], 'Qwen2.5-Instruct': [0.5, 1.5, 3, 7, 14, 32], 'Qwen2.5-Coder': [0.5, 1.5, 3, 7, 14, 32] };   // the registry's FLEET_SIZE_ARMS
  Kit.ladderFamily = function (label) { for (var i = 0; i < LADDER_FAMILIES.length; i++) if (LADDER_FAMILIES[i][1].test(label)) return LADDER_FAMILIES[i][0]; return null; };
  Kit.ladderRank = function (label) {   // → { family, familyIndex, rank } ; rank null = the page's order stands (unranked by the rule)
    var fam = Kit.ladderFamily(label); if (!fam) return { family: null, familyIndex: LADDER_FAMILIES.length, rank: null };
    var fi = -1; for (var i = 0; i < LADDER_FAMILIES.length; i++) if (LADDER_FAMILIES[i][0] === fam) fi = i;
    var s = String(label).toLowerCase(), base = null, m;
    if (/b-a\d/.test(s) || fam === 'DeepSeek-V3' || /\(final/.test(s)) return { family: fam, familyIndex: fi, rank: null };
    if (fam === 'Claude') { var t = { haiku: 1, sonnet: 2, opus: 3, fable: 4 }; for (var k in t) if (s.indexOf(k) >= 0) base = t[k]; }
    else if (fam === 'GPT-5') base = /\bnano\b/.test(s) ? 1 : /\bmini\b/.test(s) ? 2 : 3;
    else if (fam === 'Gemini') { m = s.match(/\b(\d\.\d)\b/); base = (m ? parseFloat(m[1]) * 10 : 0) + (/flash[-\s]?lite/.test(s) ? 1 : /flash/.test(s) ? 2 : /pro/.test(s) ? 3 : 2); }
    else { m = s.match(/(\d+(?:\.\d+)?)\s?b\b/); if (m) { base = parseFloat(m[1]); var lad = LADDERS[fam]; if (lad && lad.indexOf(base) >= 0) base = lad.indexOf(base); else if (lad) base = lad.length + base / 1000; } }
    if (base === null) return { family: fam, familyIndex: fi, rank: null };
    m = s.match(/\((?:checkpoint|step)\s*(\d+)\)/); if (m) base += parseInt(m[1], 10) / 1e6;   // a series by position; a variant ranks with its base
    return { family: fam, familyIndex: fi, rank: base };
  };
  Kit.sortByLadder = function (labels, labelOf) {   // stable: families in the palette's order, the ladder inside, unranked items keep their place after their family's ranked ones
    labelOf = labelOf || function (x) { return String(x); };
    return labels.map(function (x, i) { var r = Kit.ladderRank(labelOf(x)); return { x: x, i: i, fi: r.familyIndex, rank: r.rank }; })
      .sort(function (a, b) { if (a.fi !== b.fi) return a.fi - b.fi; if (a.rank === null && b.rank === null) return a.i - b.i; if (a.rank === null) return 1; if (b.rank === null) return -1; if (a.rank !== b.rank) return a.rank - b.rank; return a.i - b.i; })
      .map(function (o) { return o.x; });
  };

  global.Kit = Kit;
})(window);
