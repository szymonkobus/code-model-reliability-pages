/* project UI kit v1 — the site design maintainers (tools-convergence Day 0).
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
 * mount: element|selector, // where to render
 * key: 'def', // URL query param
 * label: 'Definition', // visible label
 * options: [{value:'average', label:'Average'},
 * {value:'median', label:'Median'}],
 * dflt: 'average', // default (omitted from URL)
 * onchange: fn(value) // fires on init AND every change
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

  global.Kit = Kit;
})(window);
