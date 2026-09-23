/* project plot export — the reference template, 18 Sep 2026 (v6.1, 23 Sep 15:2x UK: NO TITLE in an export and no page name in its footer — the record at the terminal 15:1x UK via the coordination, the same on every page's export; v6.0.3: served comments carry no project phrase — the maintainers's static-words check; v6.0.2: Kit.exportButton leaves the SVG twin out for a canvas export — opts.svg false, a canvases object, or factory.canvas = true; v6.0.1: Kit.exportCanvas legend rows may carry dash (a dashed line swatch) and open (a hollow swatch) / composeCanvasExport — the canvas path, one PNG of stacked canvases with an HTML legend, for the coverage matrix and the maintainers; v5.9, 22 Sep 12:2x UK: the Olmo family key reads 'Olmo 3' — the generation, its 3 and 3.1 releases one hue — the pattern unchanged; v5.8, 21 Sep 17:4x UK: a legend row with ramp: [shades…] draws a checkpoint series as ONE gradient bar, first step's shade to the last's, the label carrying the step range — the long-series form; v5.7, 21 Sep 11:2x UK: the Olmo region's two families — OLMo-2, then the Olmo 3.1 checkpoint series — join Kit.FAMILIES after Gemma-4, the palette registry's order; every other family's grouping unchanged; v5.6, 21 Sep 06:2x UK: attributions by role and date only, the place of speaking dropped from served comments — the presentation critic's finding of 21 Sep; v5.5, 20 Sep 06:xx UK: served comments attribute by role and date, no name or pronoun — the presentation critic's finding of 20 Sep; v5.4, 14:4x UK: EXPORT TEXT SIZES restated — the word is the RATIO, twice and one and a half times the page's own sizes; 26/18 px are those ratios for a 13/12 page; doc only; v5.3, 14:1x UK: EXPORT TEXT SIZES documented + Kit.EXPORT_TEXT constants, behaviour identical to v5.2, no re-vendor needed for behaviour; v5.2, 14:0x UK: the download anchor is removed the moment it is clicked, so the page HTML is unchanged at once — capability-vs-reliability's read; v5.1, 13:4x UK: DeepSeek patterns matched before Qwen — "DeepSeek-R1-Distill-Qwen-32B" was filed under Qwen3 by "Qwen-3…" — and the Qwen3 pattern stops at a digit; v5, 13:3x UK: legend rows grouped by family in the palette's order, Kit.legendByFamily, the project maintainers' word of 18 Sep 13:1x UK; v4, 13:1x UK: legendTitle; v3: scatter rows without a line, the page's own marks, data-legend on server-built SVGs, download links for static figures). The project maintainers' ask of 18 Sep 12:1x UK, on the capability-vs-reliability page (the words are filed in the reference ledger): every plot on a page the reader studies gets
 * an export button; the export shows the plot's axes and a legend of every model beside it, exactly what the plot shows and nothing
 * more, produced by a robust method close to the page's own rendering, as the default way every plot exports.
 *
 * CANONICAL: ~/reliability/how-we-work/the maintainers/ui-kit/kit-export.js; served sites vendor a copy with kit.js. No dependencies.
 *
 * The page keeps its own rendering path: it hands over the SVG it drew (best: re-drawn by the same function with domains tightened to
 * the data shown, so axes and ticks fit the crop) and a legend of every drawn model. The helper groups the legend's rows by family
 * (the project maintainers' word of 18 Sep 13:1x UK: a legend is sorted by the model families, never by capability, so the
 * colours make sense), families in the palette registry's order, the plot's order kept within a family. It never redraws
 * data; it (1) clones the SVG and inlines computed styles so the file looks like the screen without the page's CSS, (2) optionally
 * crops the frame to the data layer's bounding box plus a margin (fallback when the page cannot redraw with tight domains),
 * (3) lays a legend panel beside the plot — one row per model: swatch with the model's colour, line dash and marker, then the label,
 * never truncated — (4) writes a title above and one muted stamp line below (page · view · data as of <UK time>), and (5) downloads a
 * PNG at 2× (default) or the SVG. No fetches, no web fonts (the system stack), deterministic size: the same view gives the same bytes.
 *
 * API:  Kit.exportPlot({ svg, legend, title, view, stamp, fileBase, format, scale, crop, background })
 *   svg        SVGSVGElement or a function returning one (the page's own plot; a fresh element drawn with tight domains is best)
 *   legend     [{ label, color, dash, marker, width, line, family }] in any order — the helper groups the rows by family (the project maintainers' word of 18 Sep)
 *              in the palette registry's order (Kit.FAMILIES; FAMILY_HUES in pages/failure-vs-difficulty/plot_difficulty.py) and keeps the
 *              given order within a family; family: an explicit family name, else read from the label; rows of no known family keep
 *              their order after the models. legendOrder: 'given' opts out (rows that are not models). Kit.legendByFamily(rows) is the same grouping.
 *   legendTitle the legend's heading, default 'Models' — a set-keyed or category-keyed plot names its rows ('Task sets', 'Categories')
 *              dash: an SVG stroke-dasharray string or ''; line: false (or width: 0) for a scatter row with no line series;
 *              ramp: [hex, hex, …] — a checkpoint series as ONE row: a gradient bar from the first step's shade to the last's, the label the series' name and step range
 *              marker: 'circle' | 'open-circle' | 'square' | 'open-square' | 'triangle' | 'open-triangle' | 'none', or the page's own mark
 *              as { d, fill, stroke, strokeWidth, scale } (a path fragment drawn in a box centred on the row) or a function (cx, cy, color) → svg
 *   title      the page's plot title in plain words;  view: the controls' state in words;  stamp: 'data as of 18 Sep 12:07 UK'
 *   fileBase   file name without extension (page_view_date is the reference form)
 *   format     'png' (default) | 'svg';  scale: PNG pixel ratio (default 2)
 *   crop       null (default, the frame as drawn) | 'data' (trim the dead bands above and right of the [data-layer="data"] groups + 4%;
 *              the axis strips at left and bottom stay — the left dead band goes only when the page redraws with tight domains)
 *   Elements marked data-export="omit" (a levels slider, hover targets) are left out of the file.
 *   A server-built SVG (no client draw function) may carry data-legend (JSON rows), data-title, data-page, data-view, data-stamp on the
 *   <svg>; the helper reads them when the call leaves them out, so a Python builder emits the legend once with the figure.
 *   A STATIC figure (PNG/SVG file, legend drawn inside) exports as itself: Kit.exportFigureLink(container, { href, label, svgHref }).
 *   background the ground colour behind everything (default the chart ground #fcfaf3)
 * Returns a Promise resolving to { svgText, width, height } after the download starts.
 *
 * EXPORT TEXT SIZES (the project maintainers' word of 18 Sep 13:5x UK: on the export plot the axis names twice as big and the
 *   axis numbers half again): the page's export redraw sets its axis names at TWICE the page's size and its tick numbers at
 *   ONE AND A HALF times, the page itself unchanged — the RATIOS are the word: a page drawing 13 px names and 12 px ticks exports at 26/18,
 *   a page at 13/13 exports at 26/20 (round 1.5 × 13 up). Kit.EXPORT_TEXT (capability-vs-reliability's method for a 13/12 page): a
 *   900 px plot, axis names 26 px, tick numbers 18 px, margins left 90 / right 30 / top 40 / bottom 62, x tick baseline tick + 5 below the
 *   axis, y ticks centred at tick ÷ 3, the y title at x = 20 rotated, the x title 6 px above the bottom edge; legend 12 px and caption 11 px
 *   as before. The helper never rescales text (bigger text needs re-laid margins only the draw knows). Mark axis names data-role="axis-title"
 *   and tick labels data-role="tick" so the reference gate reads the sizes exactly.
 *
 * Button: Kit.exportButton(container, optionsOrFactory) mounts the project "Export plot" button (and a small "SVG" twin) into a
 * control strip; the factory runs at click time so the current view is exported. */
(function (global) {
  'use strict';
  var Kit = global.Kit = global.Kit || {};
  var FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  var STYLE_PROPS = ['fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin', 'stroke-opacity',
    'opacity', 'font-family', 'font-size', 'font-weight', 'font-style', 'text-anchor', 'dominant-baseline', 'letter-spacing', 'visibility', 'display'];
  var NS = 'http://www.w3.org/2000/svg';
  Kit.EXPORT_TEXT = { plotWidth: 900, axisTitle: 26, tick: 18, axisTitleScale: 2, tickScale: 1.5, margins: { left: 90, right: 30, top: 40, bottom: 62 } };   // the project maintainers' word of 18 Sep 13:5x UK: the SCALES rule (2× and 1.5× the page's own sizes); 26/18 are those scales for a 13/12 page
  Kit.exportTextSizes = function (pageAxisTitlePx, pageTickPx) { return { axisTitle: Math.round(2 * pageAxisTitlePx), tick: Math.round(1.5 * pageTickPx) }; };   // the sizes an export redraw takes for a page drawing at the given px
  // the palette registry's family order (its FAMILY_HUES table and design record) — one hue a family,
  // lightness rungs within it, so a legend grouped by family in this order reads as the colours do (the project maintainers' word of 18 Sep 13:1x UK)
  var FAMILIES = Kit.FAMILIES = [
    ['Qwen2.5-Coder', /qwen[-\s]?2\.5[-\s]?coder/i],
    ['Qwen2.5-Instruct', /qwen[-\s]?2\.5(?![-\s]?coder)/i],
    ['Qwen3', /qwen[-\s]?3(?![.\d])/i],
    ['Qwen3.5', /qwen[-\s]?3\.5/i],
    ['Claude', /claude|\bhaiku\b|\bsonnet\b|\bopus\b|\bfable\b/i],
    ['GLM', /\bglm\b/i],
    ['Kimi', /\bkimi\b|moonshot/i],
    ['DeepSeek-Coder', /deepseek[-\s]?coder(?![-\s]?v2)/i],
    ['DeepSeek-Coder-V2', /deepseek[-\s]?coder[-\s]?v2/i],
    ['DeepSeek-V3', /deepseek[-\s]?v3/i],
    ['DeepSeek-R1-Distill', /deepseek[-\s]?r1|\br1[-\s]?distill|\bds[-\s]?r1d?\b/i],
    ['GPT-5', /\bgpt[-\s]?5/i],
    ['Gemini', /\bgemini\b/i],
    ['Gemma-4', /\bgemma\b/i],
    ['OLMo-2', /\bolmo[-\s]?2\b/i],   // the Olmo region (21 Sep): newbench's released models, then the Olmo 3.1 checkpoint series
    ['Olmo 3', /\bolmo[-\s]?3(?:\.\d+)?\b/i]   // the generation's key (was 'Olmo 3.1' until 22 Sep): the 3 and 3.1 releases, one hue
  ];
  // patterns are tried DeepSeek first: a distilled model's label names its base ("DeepSeek-R1-Distill-Qwen-32B", "…-Llama-8B"), and the
  // registry's order (Qwen before DeepSeek) is a RANK for the legend, not a match order
  var MATCH_ORDER = [10, 8, 7, 9].concat(FAMILIES.map(function (_, i) { return i; }).filter(function (i) { return [7, 8, 9, 10].indexOf(i) < 0; }));
  Kit.familyOf = function (row) {   // the family of a legend row: its family field (a registry name), else the first registry pattern its label matches; '' when none
    var name = row && row.family != null ? String(row.family) : '', label = row && row.label != null ? String(row.label) : '';
    for (var i = 0; i < FAMILIES.length; i++) { if (name && name.toLowerCase() === FAMILIES[i][0].toLowerCase()) return FAMILIES[i][0]; }
    for (var j = 0; j < MATCH_ORDER.length; j++) { var f = FAMILIES[MATCH_ORDER[j]]; if (f[1].test(name || label)) return f[0]; }
    return '';
  };
  Kit.familyRank = function (row) { var f = Kit.familyOf(row); for (var i = 0; i < FAMILIES.length; i++) { if (FAMILIES[i][0] === f) return i; } return FAMILIES.length; };
  Kit.legendByFamily = function (rows) {   // a new array: rows grouped by family in the registry's order, the given order kept within a family (stable); unknown rows last, in their order
    return (rows || []).map(function (r, i) { return { r: r, i: i, k: Kit.familyRank(r) }; })
      .sort(function (a, b) { return a.k - b.k || a.i - b.i; })
      .map(function (x) { return x.r; });
  };

  function inlineStyles(src, dst) {   // walk both trees in step; copy the computed values the file needs to look like the screen
    var a = src.querySelectorAll('*'), b = dst.querySelectorAll('*');
    for (var i = 0; i < a.length && i < b.length; i++) {
      var cs = getComputedStyle(a[i]); var s = '';
      for (var j = 0; j < STYLE_PROPS.length; j++) { var v = cs.getPropertyValue(STYLE_PROPS[j]); if (v && v !== 'normal' && v !== 'auto') s += STYLE_PROPS[j] + ':' + v + ';'; }
      if (s) b[i].setAttribute('style', s);
      if (b[i].tagName === 'text' || b[i].tagName === 'tspan') b[i].setAttribute('font-family', FONT);
    }
    var root = getComputedStyle(src); dst.setAttribute('font-family', FONT); dst.setAttribute('font-size', root.fontSize || '12px');
  }

  function viewBoxOf(svg) {
    var vb = (svg.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
    if (vb.length === 4 && vb.every(function (n) { return !isNaN(n); })) return { x: vb[0], y: vb[1], w: vb[2], h: vb[3] };
    var r = svg.getBoundingClientRect(); return { x: 0, y: 0, w: r.width || 800, h: r.height || 500 };
  }

  function dataCrop(src, vb) {   // trims the dead bands ABOVE and to the RIGHT of the data (the union of [data-layer="data"] boxes plus a 4%
    // margin); the left and bottom strips stay because the axes live there and a viewBox cannot move them — the dead band named on 18 Sep
    // between the y-axis and the first point (below 5%) goes only when the page redraws with tight domains, which is the reference form;
    // a degenerate box (under a quarter of the frame, or fewer than three marks) leaves the frame as drawn
    var layers = src.querySelectorAll('[data-layer="data"]'); if (!layers.length) return null;
    var y1 = Infinity, x2 = -Infinity, w = 0, h = 0, marks = 0, x1 = Infinity, y2 = -Infinity;
    for (var i = 0; i < layers.length; i++) { var bb; try { bb = layers[i].getBBox(); } catch (e) { continue; } if (!bb || !bb.width || !bb.height) continue;
      x1 = Math.min(x1, bb.x); y1 = Math.min(y1, bb.y); x2 = Math.max(x2, bb.x + bb.width); y2 = Math.max(y2, bb.y + bb.height); marks += layers[i].querySelectorAll('circle, rect, path, polygon, use').length; }
    if (!isFinite(y1) || marks < 3) return null;
    w = x2 - x1; h = y2 - y1; if (w < vb.w * 0.25 || h < vb.h * 0.25) return null;
    var top = Math.max(vb.y, y1 - h * 0.04), right = Math.min(vb.x + vb.w, x2 + w * 0.04);
    return { x: vb.x, y: top, w: right - vb.x, h: vb.y + vb.h - top };
  }

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  function markerSvg(kind, cx, cy, color, bg) {   // the page's own mark: a kind word, a path fragment { d, fill, stroke, strokeWidth } drawn
    // in a box centred on (cx, cy), or a function (cx, cy, color) → svg text; open kinds are hollow with the plot ground inside
    var r = 4.5, ground = bg || '#fcfaf3';
    if (typeof kind === 'function') return kind(cx, cy, color) || '';
    if (kind && typeof kind === 'object' && kind.d) {
      var fill = kind.fill === undefined ? color : kind.fill, stroke = kind.stroke === undefined ? (kind.fill === 'none' ? color : 'none') : kind.stroke;
      return '<path d="' + esc(kind.d) + '" transform="translate(' + cx + ',' + cy + ')' + (kind.scale ? ' scale(' + kind.scale + ')' : '') + '" fill="' + esc(fill === 'none' ? ground : fill) + '" stroke="' + esc(stroke) + '" stroke-width="' + (kind.strokeWidth || 1.8) + '"/>';
    }
    if (kind === 'none') return '';
    if (kind === 'square') return '<rect x="' + (cx - r) + '" y="' + (cy - r) + '" width="' + 2 * r + '" height="' + 2 * r + '" fill="' + color + '"/>';
    if (kind === 'open-square') return '<rect x="' + (cx - r) + '" y="' + (cy - r) + '" width="' + 2 * r + '" height="' + 2 * r + '" fill="' + ground + '" stroke="' + color + '" stroke-width="1.8"/>';
    if (kind === 'triangle') return '<path d="M' + cx + ',' + (cy - r) + ' L' + (cx + r) + ',' + (cy + r) + ' L' + (cx - r) + ',' + (cy + r) + ' Z" fill="' + color + '"/>';
    if (kind === 'open-triangle') return '<path d="M' + cx + ',' + (cy - r) + ' L' + (cx + r) + ',' + (cy + r) + ' L' + (cx - r) + ',' + (cy + r) + ' Z" fill="' + ground + '" stroke="' + color + '" stroke-width="1.8"/>';
    if (kind === 'open-circle') return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + ground + '" stroke="' + color + '" stroke-width="1.8"/>';
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + color + '"/>';
  }

  function legendPanel(legend, x, y, maxH, bg, title) {   // columns of rows; every label whole; returns { svg, width, height }
    var rowH = 18, colW = 0, probe = document.createElementNS(NS, 'svg'); probe.setAttribute('width', 10); probe.setAttribute('height', 10); probe.style.position = 'absolute'; probe.style.left = '-9999px';
    var t = document.createElementNS(NS, 'text'); t.setAttribute('font-family', FONT); t.setAttribute('font-size', '12'); probe.appendChild(t); document.body.appendChild(probe);
    var widths = legend.map(function (m) { t.textContent = m.label || ''; return t.getComputedTextLength(); });
    document.body.removeChild(probe);
    colW = Math.ceil(Math.max.apply(null, widths.concat([60]))) + 44;
    var perCol = Math.max(20, Math.floor((maxH - 24) / rowH)), cols = Math.min(4, Math.ceil(legend.length / perCol)); perCol = Math.ceil(legend.length / cols);   // at least 20 rows a column, at most four columns; the panel may stand taller than the plot
    var out = '<text class="kit-legend-title" x="' + x + '" y="' + (y + 12) + '" font-family="' + FONT + '" font-size="12" font-weight="600" fill="#1a1a1a">' + esc(title || 'Models') + '</text>';   // legendTitle: what the rows are (task sets, categories) when not models
    legend.forEach(function (m, i) {
      var c = Math.floor(i / perCol), r = i % perCol, lx = x + c * colW, ly = y + 30 + r * rowH, color = m.color || '#52514e';
      if (m.ramp && m.ramp.length > 1) {   // a checkpoint series drawn as ONE row: a gradient bar from the first step's shade to the last's (21 Sep); the label carries the step range
        var gid = 'kit-ramp-' + i + '-' + Math.random().toString(36).slice(2, 7);
        out += '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="1" y2="0">' + m.ramp.map(function (col, k) { return '<stop offset="' + (m.ramp.length === 1 ? 0 : k / (m.ramp.length - 1)) + '" stop-color="' + esc(col) + '"/>'; }).join('') + '</linearGradient></defs>';
        out += '<rect x="' + lx + '" y="' + (ly - 4) + '" width="26" height="8" rx="2" fill="url(#' + gid + ')"' + (m.dash ? ' stroke="' + esc(m.ramp[m.ramp.length - 1]) + '" stroke-dasharray="' + esc(m.dash) + '" stroke-width="1"' : '') + '/>';
        out += '<text class="kit-legend-row" data-family="' + esc(Kit.familyOf(m)) + '" x="' + (lx + 34) + '" y="' + (ly + 4) + '" font-family="' + FONT + '" font-size="12" fill="#1a1a1a">' + esc(m.label) + '</text>';
        return;
      }
      if (m.line !== false && m.width !== 0) out += '<line x1="' + lx + '" y1="' + ly + '" x2="' + (lx + 26) + '" y2="' + ly + '" stroke="' + color + '" stroke-width="' + (m.width || 2) + '"' + (m.dash ? ' stroke-dasharray="' + esc(m.dash) + '"' : '') + '/>';   // a scatter row has no line series: line: false (or width: 0)
      out += markerSvg(m.marker || 'circle', lx + 13, ly, color, bg);
      out += '<text class="kit-legend-row" data-family="' + esc(Kit.familyOf(m)) + '" x="' + (lx + 34) + '" y="' + (ly + 4) + '" font-family="' + FONT + '" font-size="12" fill="#1a1a1a">' + esc(m.label) + '</text>';   // the marks let a gate read the composed legend's order
    });
    return { svg: out, width: cols * colW, height: Math.min(legend.length, perCol) * rowH + 30 };
  }

  Kit.composePlotExport = function (opts) {
    var src = typeof opts.svg === 'function' ? opts.svg() : opts.svg; if (!src) throw new Error('exportPlot: no svg');
    // a server-built figure (Python-rendered SVG, no client draw function) carries its legend and words on the element itself:
    // data-legend (a JSON array of rows), data-title, data-page, data-view, data-stamp — read when the call leaves them out
    if (!opts.legend && src.getAttribute('data-legend')) { try { opts.legend = JSON.parse(src.getAttribute('data-legend')); } catch (e) { opts.legend = []; } }
    ['title', 'page', 'view', 'stamp'].forEach(function (k) { if (!opts[k] && src.getAttribute('data-' + k)) opts[k] = src.getAttribute('data-' + k); });
    var vb = viewBoxOf(src), crop = opts.crop === 'data' ? (dataCrop(src, vb) || vb) : vb;
    var clone = src.cloneNode(true); inlineStyles(src, clone);
    Array.prototype.forEach.call(clone.querySelectorAll('[data-export="omit"]'), function (el) { el.parentNode && el.parentNode.removeChild(el); });   // interactive-only marks (a levels slider, hover targets) stay out of the file
    clone.removeAttribute('width'); clone.removeAttribute('height'); clone.removeAttribute('style'); clone.removeAttribute('class'); clone.removeAttribute('id');
    clone.setAttribute('viewBox', crop.x + ' ' + crop.y + ' ' + crop.w + ' ' + crop.h);
    // NO TITLE IN AN EXPORT (the project maintainers' word at the terminal 23 Sep 2026 15:1x UK, via the coordination: drop the page's title when the image is downloaded — an export is shared as part of the plot): the axes, the points and the legend, cropped to the data; the footer keeps the controls' words and the data stamp, not the page's name
    var plotW = Math.round(crop.w), plotH = Math.round(crop.h), pad = 16, titleH = 0, stampH = 22;
    var legend = opts.legendOrder === 'given' ? (opts.legend || []) : Kit.legendByFamily(opts.legend || []);   // grouped by family (the project maintainers' word of 18 Sep); 'given' for rows that are not models
    var lg = legend.length ? legendPanel(legend, plotW + pad * 2, pad + titleH, plotH, opts.background || '#fcfaf3', opts.legendTitle) : { svg: '', width: 0, height: 0 };
    var W = plotW + pad * 2 + (lg.width ? lg.width + pad : 0), H = pad + titleH + Math.max(plotH, lg.height) + stampH + pad;
    clone.setAttribute('x', pad); clone.setAttribute('y', pad + titleH); clone.setAttribute('width', plotW); clone.setAttribute('height', plotH);
    var bg = opts.background || '#fcfaf3';
    var head = '<svg xmlns="' + NS + '" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" font-family="' + FONT + '">' +
      '<rect width="' + W + '" height="' + H + '" fill="' + bg + '"/>' +
      '';   // no title row (23 Sep)
    var stamp = [opts.view, opts.stamp].filter(Boolean).join(' · ');   // the view's words and the data stamp; no page name (23 Sep)
    var foot = (stamp ? '<text x="' + pad + '" y="' + (H - pad) + '" font-size="11" fill="#6b675f">' + esc(stamp) + '</text>' : '') + '</svg>';
    var svgText = head + new XMLSerializer().serializeToString(clone) + lg.svg + foot;
    return { svgText: svgText, width: W, height: H };
  };

  function download(blob, name) {   // the anchor leaves the body the moment it is clicked, so the page is as it was at once (a gate that diffs the HTML after a real download sees no change); the blob URL lives a second longer for the download to start
    var a = document.createElement('a'), url = URL.createObjectURL(blob); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  Kit.exportPlot = function (opts) {
    var out = Kit.composePlotExport(opts), base = (opts.fileBase || 'plot').replace(/[^\w.-]+/g, '-');
    if ((opts.format || 'png') === 'svg') { download(new Blob([out.svgText], { type: 'image/svg+xml' }), base + '.svg'); return Promise.resolve(out); }
    var scale = opts.scale || 2;
    return new Promise(function (resolve, reject) {
      var img = new Image(); var url = URL.createObjectURL(new Blob([out.svgText], { type: 'image/svg+xml' }));
      img.onload = function () {
        var cv = document.createElement('canvas'); cv.width = Math.round(out.width * scale); cv.height = Math.round(out.height * scale);
        var ctx = cv.getContext('2d'); ctx.scale(scale, scale); ctx.drawImage(img, 0, 0); URL.revokeObjectURL(url);
        cv.toBlob(function (blob) { if (!blob) { reject(new Error('exportPlot: no PNG')); return; } download(blob, base + '.png'); resolve(out); }, 'image/png');
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('exportPlot: the SVG did not rasterise')); };
      img.src = url;
    });
  };

  // CANVAS EXPORT (23 Sep 2026; the maintainers's coverage matrix — two canvases in one scroller, an HTML legend — and capability-vs-reliability's
  // the maintainers): the same one PNG the SVG path gives — title above, the canvases stacked at their device pixels (the whole drawing, not the
  // scrolled viewport), the legend rows below (from an HTML legend element's swatches and words, or from rows {label, color}), one muted stamp
  // line (page · view · data as of <UK time>) — at 2×, and no SVG twin for a bitmap. API: Kit.exportCanvas({ canvases, legend, title, page, view,
  // stamp, fileBase, scale }) → Promise; Kit.composeCanvasExport(opts) → the composed canvas (for a page that wants the bitmap itself).
  function legendRowsOf(legend) {   // rows {label, color} from an array of rows or an HTML element whose children carry a swatch (a background colour) and words
    if (!legend) return [];
    if (Array.isArray(legend)) return legend.map(function (r) { return { label: r.label || '', color: r.color || '#52514e', dash: r.dash || null, open: !!r.open }; });   // dash: a line swatch with that pattern (a thinking arm's dashed line); open: a hollow swatch
    var rows = [];
    Array.prototype.forEach.call(legend.children, function (item) {
      var sw = null; Array.prototype.some.call(item.querySelectorAll('*'), function (el) { var bg = getComputedStyle(el).backgroundColor; if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent' && el.getBoundingClientRect().width <= 40) { sw = bg; return true; } return false; });
      var words = (item.textContent || '').replace(/\s+/g, ' ').trim(); if (words) rows.push({ label: words, color: sw || getComputedStyle(item).color || '#52514e' });
    });
    return rows;
  }
  Kit.composeCanvasExport = function (opts) {
    var cvs = (opts.canvases || []).filter(Boolean); if (!cvs.length) throw new Error('composeCanvasExport: no canvases');
    var s = opts.scale || 2, pad = 16 * s, titleH = 0, stampH = 22 * s, rowH = 20 * s, font = FONT;   // no title row in an export (23 Sep)
    var rows = legendRowsOf(opts.legend), legendH = rows.length ? rows.length * rowH + pad : 0;
    var drawW = 0, drawH = 0; cvs.forEach(function (c) { drawW = Math.max(drawW, c.width); drawH += c.height; });
    var W = Math.max(drawW + pad * 2, 400 * s), H = pad + titleH + drawH + legendH + stampH + pad;
    var out = document.createElement('canvas'); out.width = W; out.height = H; var ctx = out.getContext('2d');
    ctx.fillStyle = opts.background || '#faf6ec'; ctx.fillRect(0, 0, W, H);
    var y = pad;
    cvs.forEach(function (c) { ctx.drawImage(c, pad, y, c.width, c.height); y += c.height; });
    if (rows.length) { y += pad / 2; ctx.font = (12 * s) + 'px ' + font; ctx.textBaseline = 'middle';
      rows.forEach(function (r) { if (r.dash) { ctx.save(); ctx.strokeStyle = r.color; ctx.lineWidth = 2.5 * s; ctx.setLineDash(r.dash.map(function (d) { return d * s; })); ctx.beginPath(); ctx.moveTo(pad, y + rowH / 2); ctx.lineTo(pad + 14 * s, y + rowH / 2); ctx.stroke(); ctx.restore(); } else if (r.open) { ctx.save(); ctx.strokeStyle = r.color; ctx.lineWidth = 2 * s; ctx.strokeRect(pad + s, y + rowH / 2 - 4 * s, 12 * s, 8 * s); ctx.restore(); } else { ctx.fillStyle = r.color; ctx.fillRect(pad, y + rowH / 2 - 5 * s, 14 * s, 10 * s); } ctx.fillStyle = '#1a1a1a'; ctx.fillText(r.label, pad + 20 * s, y + rowH / 2); y += rowH; }); y += pad / 2; }
    var stamp = [opts.view, opts.stamp].filter(Boolean).join(' · ');   // no page name (23 Sep)
    if (stamp) { ctx.fillStyle = '#6b675f'; ctx.font = (11 * s) + 'px ' + font; ctx.textBaseline = 'bottom'; ctx.fillText(stamp, pad, H - pad); }
    return out;
  };
  Kit.exportCanvas = function (opts) {
    var out = Kit.composeCanvasExport(opts), base = (opts.fileBase || 'plot').replace(/[^\w.-]+/g, '-');
    return new Promise(function (resolve, reject) { out.toBlob(function (blob) { if (!blob) { reject(new Error('exportCanvas: no PNG')); return; } download(blob, base + '.png'); resolve({ width: out.width, height: out.height }); }, 'image/png'); });
  };
  Kit.exportFigureLink = function (container, opts) {   // a STATIC figure (a PNG or SVG file drawn server-side, legend inside): the export is the
    // file itself — a project-styled download link in the same row under the figure; opts: { href, label, svgHref } (an SVG twin when one exists)
    var wrap = document.createElement('span'); wrap.className = 'kit-export';
    var a = document.createElement('a'); a.className = 'kit-export-btn'; a.href = opts.href; a.download = opts.download || ''; a.textContent = opts.label || 'Download figure'; a.title = 'The figure as drawn, legend inside'; wrap.appendChild(a);
    if (opts.svgHref) { var b = document.createElement('a'); b.className = 'kit-export-btn kit-export-svg'; b.href = opts.svgHref; b.download = ''; b.textContent = 'SVG'; wrap.appendChild(b); }
    (container || document.body).appendChild(wrap); return wrap;
  };

  Kit.exportButton = function (container, factory, opts) {   // the reference control: "Export plot" (PNG) with an "SVG" twin; the factory runs at click time.
    // A bitmap has no SVG twin: the twin is left out when the factory's object carries canvases, when the factory function is marked
    // factory.canvas = true, or when opts.svg === false (ops's finding on /activity/, 23 Sep: a dead "SVG" control beside a canvas export).
    opts = opts || {};
    var noSvg = opts.svg === false || (factory && typeof factory === 'object' && !!factory.canvases) || (typeof factory === 'function' && factory.canvas === true);
    var wrap = document.createElement('span'); wrap.className = 'kit-export';
    var b1 = document.createElement('button'); b1.type = 'button'; b1.className = 'kit-export-btn'; b1.textContent = 'Export plot'; b1.title = noSvg ? 'Download this plot as a PNG with its legend' : 'Download this plot as a PNG with a legend of every model, cropped to the data shown';
    var run = function (fmt) { var o = typeof factory === 'function' ? factory() : factory; if (o.canvases) { if (fmt === 'png') Kit.exportCanvas(o).catch(function (e) { console.error(e); }); return; } o.format = fmt; Kit.exportPlot(o).catch(function (e) { console.error(e); }); };
    b1.addEventListener('click', function () { run('png'); }); wrap.appendChild(b1);
    if (!noSvg) { var b2 = document.createElement('button'); b2.type = 'button'; b2.className = 'kit-export-btn kit-export-svg'; b2.textContent = 'SVG'; b2.title = 'The same export as an SVG file'; b2.addEventListener('click', function () { run('svg'); }); wrap.appendChild(b2); }
    (container || document.body).appendChild(wrap); return wrap;
  };
})(typeof window !== 'undefined' ? window : this);
