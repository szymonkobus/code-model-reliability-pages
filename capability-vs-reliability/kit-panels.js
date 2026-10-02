/* kit-panels.js v1 — several datasets side by side as a MODE of the main page (the maintainers, 2 Oct 2026). Version line: kit-panels.js v1, 2026-10-02.
 * the record at the coordination's terminal 2 Oct, 11:2x UK, on the six-panel page: good to see all the sets at once, but a special version of the main
 * page loading several datasets side by side, not its own page — the main page good and fast, the multi-view inheriting from it so fixes trickle
 * down (the maintainers's section A VIEW OF SEVERAL DATASETS SIDE BY SIDE IS A MODE OF THE MAIN PAGE THAT INHERITS FROM IT, NEVER A NEW PAGE).
 * The kit does the grid and the redraw plumbing; the page keeps its controls, its data and its one draw function:
 *   const grid = Kit.panelGrid({ mount, keys, labels, draw, min, cols });
 *     mount  — the element that holds the panels while the mode is on (the single figure's place; the page hides the single figure);
 *     keys   — the dataset keys to draw, in the page's dataset order (the leaf of record's);
 *     labels — key → the set's name of record, printed once as the panel's title (the only chrome a panel carries; axes and ticks are the draw's);
 *     draw(key, panelEl, size) — the page's own draw for ONE dataset into panelEl (the same function the single figure uses), size = {width, height};
 *     min    — the smallest panel width in px (default 300; one column under that); cols — a fixed column count (default auto-fit).
 *   grid.redraw  — every control event of the page calls it (the page's controls govern every panel alike; the kit forwards nothing);
 *   grid.destroy — leaves the mode (the mount emptied; the page shows its single figure again);
 *   grid.panels    — [{ key, el, body }].
 * Each panel is a square box: the page's axis code crops to the panel's points, so the AXIS SPAN rule holds per panel. The mode is entered by the
 * page's own control — a kit switch 'View: one set | side by side', or ?panels=all honoured at load — never a link to another page.
 */
(function () {
  var Kit = window.Kit = window.Kit || {};
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  Kit.panelGrid = function (cfg) {
    var mount = cfg.mount, keys = cfg.keys || [], labels = cfg.labels || {}, draw = cfg.draw, min = cfg.min || 300, cols = cfg.cols || 0;
    if (!mount || typeof draw !== 'function') throw new Error('Kit.panelGrid: mount and draw are required');
    mount.classList.add('kit-panels');
    mount.style.gridTemplateColumns = cols ? 'repeat(' + cols + ', minmax(0, 1fr))' : 'repeat(auto-fit, minmax(' + min + 'px, 1fr))';
    mount.textContent = '';
    var panels = keys.map(function (key) {
      var box = el('section', 'kit-panel'); box.setAttribute('data-panel', key);
      var title = el('h3', 'kit-panel-title', labels[key] || key); box.appendChild(title);
      var body = el('div', 'kit-panel-body'); box.appendChild(body);
      mount.appendChild(box);
      return { key: key, el: box, body: body };
    });
    var pending = 0;
    function redraw() {
      if (pending) return; pending = requestAnimationFrame(function () { pending = 0;
        panels.forEach(function (p) { var r = p.body.getBoundingClientRect(); var w = Math.max(120, Math.floor(r.width)); draw(p.key, p.body, { width: w, height: w }); }); });
    }
    var ro = (typeof ResizeObserver !== 'undefined') ? new ResizeObserver(redraw) : null; if (ro) ro.observe(mount);
    redraw();
    return { redraw: redraw, destroy: function () { if (ro) ro.disconnect(); if (pending) cancelAnimationFrame(pending); mount.textContent = ''; mount.classList.remove('kit-panels'); mount.style.gridTemplateColumns = ''; }, panels: panels };
  };
})();
