/* kit-panels.js — the reference kit, served form v1 of 02 Oct 2026, body 246525ca889c. */
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
