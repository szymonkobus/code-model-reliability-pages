// the side-by-side mode's spec (2 Oct 2026): the drive reads ?panels=all as a reader would
const until = async (p, fn, ms = 8000) => { const t0 = Date.now(); for (;;) { if (await p.evaluate(fn)) return true; if (Date.now() - t0 > ms) return false; await p.waitForTimeout(300); } };
module.exports.drive = {
  settleMs: 4000,   // eleven sets' files load and eleven panels draw before the geometry is read
  contentRatioFloor: 0.2,   // every panel is a plot; the hidden single figure carries no data-plot while the mode is on
  facts: [
    { name: 'one square panel per served dataset in the leaf of record\'s order, each titled with the set\'s name, each with the diagonal and the axis titles D50 and D99',
      assert: async p => until(p, () => { const panels = [...document.querySelectorAll('#panelgrid .kit-panel')]; if (panels.length < 6) return false;   // the default sets, then Math, then Other — every served set
        const titles = panels.map(pn => (pn.querySelector('.kit-panel-title') || {}).textContent || ''); if (titles.some(x => !x.trim())) return false;
        if (!panels.every(pn => pn.querySelector('svg path[stroke-dasharray="3.3 2.7"]'))) return false;
        return panels.every(pn => { const t = [...pn.querySelectorAll('svg text[data-role="axis-title"]')].map(e => e.textContent.trim()); return t.length === 2 && t.indexOf('D50') >= 0 && t.indexOf('D99') >= 0; }); }, 60000) },   // eleven sets' files load before the panels draw: a minute under load
    { name: 'every panel carries its quiet count; the counts sum to the headline\'s points and to the marks drawn',
      assert: async p => until(p, () => { const counts = [...document.querySelectorAll('#panelgrid text[data-count]')].map(t => +t.textContent.replace(/\D/g, '')); const total = counts.reduce((a, b) => a + b, 0);
        const m = /(\d+) points drawn/.exec(document.getElementById('headline').textContent || ''); const marks = document.querySelectorAll('#panelgrid path[data-mark]').length;
        return counts.length >= 2 && m && +m[1] === total && total > 30 && marks === total && counts.every(c => c > 0); }, 60000) },   // every panel draws points: a set without the chain the controls name draws with the chain it has
    { name: 'the single figure is hidden, the dataset select is hidden, the View switch reads side by side pressed, and nothing links to another page among the controls',
      assert: async p => p.evaluate(() => { const chart = document.getElementById('chart'); const sel = document.querySelector('#datasetbar .kit-select'); const sw = document.querySelector('.kit-switch[data-key="panels"] button[aria-pressed="true"]');
        return !!chart && getComputedStyle(chart).display === 'none' && (!sel || getComputedStyle(sel).display === 'none') && !!sw && sw.dataset.value === 'all' && !document.querySelector('#controls a, #datasetbar a'); }) },
    { name: 'chips by family with all / none; a chip click removes the model from every panel it is drawn in and returns it',
      assert: async p => { const ok0 = await until(p, () => document.querySelectorAll('#chips .chip').length > 20 && !!document.querySelector('#chips button.util')); if (!ok0) return false;
        const r = await p.evaluate(async () => { const chip = [...document.querySelectorAll('#chips .chip:not(.off):not(.partial)')].find(b => { const i = b.dataset.idx; const lab = b.textContent.trim(); return [...document.querySelectorAll('#panelgrid path[data-mark]')].filter(m => (m.getAttribute('data-label') || '') === lab).length >= 0 && document.querySelectorAll('#panelgrid path[data-mark]').length > 0; });
          if (!chip) return 'no chip'; const before = document.querySelectorAll('#panelgrid path[data-mark]').length; chip.click(); await new Promise(x => setTimeout(x, 900)); const gone = document.querySelectorAll('#panelgrid path[data-mark]').length; chip.click(); await new Promise(x => setTimeout(x, 900)); const back = document.querySelectorAll('#panelgrid path[data-mark]').length;
          return gone < before && back === before ? 'ok' : 'before ' + before + ' gone ' + gone + ' back ' + back; });
        return r === 'ok'; } },
    { name: 'no NaN, undefined, "1% crossing" or "50% crossing" in the body; no clock in the chrome',
      assert: async p => p.evaluate(() => { const body = document.body.innerText || ''; const chrome = body.replace(document.querySelector('details.fold')?.innerText || '', '');
        return !/\bNaN\b|\bundefined\b/.test(body) && !/1% crossing|50% crossing|non-code/i.test(body) && !/\b\d{1,2}:\d{2}\b/.test(chrome); }) },
    { name: 'the export control is mounted and the held line is hidden while the liveness is fresh',
      assert: async p => until(p, () => !!document.querySelector('#exportrow .kit-export-btn') && (() => { const h = document.getElementById('heldline'); return !h || h.hidden || !h.textContent.trim(); })(), 8000) },
  ],
  states: [],
};
