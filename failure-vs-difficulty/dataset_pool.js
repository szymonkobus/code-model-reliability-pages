/* dataset_pool.js — adapter: the pool pages' bundle (difficulty-plot/pool-site/
 * failure-vs-difficulty/data.json; contract stable-or-announced) -> the board
 * tool's D shape {shared, avg, med, dots, man}. The project maintainers' word of 3 Sep 2026: a dataset
 * switch at the top — the board or the new tasks;
 * the switch changes the tasks used and nothing else (Definitions'
 * line). Units: the pool trend/band/median/rm are failure PROPORTIONS; the
 * board tool draws on the logit axis, so everything is converted here.
 * Bayesian arms carry q10/q50/q90 (80% interval): under this dataset the 90%
 * and 95% band levels are not available and the page says so. */
// counting words for the pool view's frame lines: small counts in words, large counts with commas
function numWord(n) { n = parseInt(n, 10); return ({ 1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five' })[n] || String(n); }
function withCommas(n) { return String(parseInt(n, 10)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

(function (global) {
  'use strict';
  var Z = { '80': 1.2815515655446004, '90': 1.6448536269514722, '95': 1.959963984540054 };
  function clip(p) { return Math.min(0.9995, Math.max(0.0005, p)); }
  function logit(p) { p = clip(p); return Math.log(p / (1 - p)); }
  function r4(x) { return Math.round(x * 1e4) / 1e4; }
  function pct(z) { return 100 / (1 + Math.exp(-z)); }
  // pool cross {z, kind: point | lo-bound | hi-bound, lo, hi} -> board average-chain cell
  function avgCross(cr) {
    if (!cr) return null;
    var out = {};
    ['50', '1'].forEach(function (lv) {
      var c = cr[lv]; if (!c) return;
      if (c.kind === 'point') out[lv] = { value_pct: pct(c.z), censored: null,
        plain95_pct: [c.lo != null ? pct(c.lo) : null, c.hi != null ? pct(c.hi) : null] };
      else if (c.kind === 'lo-bound') out[lv] = { value_pct: null, censored: 'left', plain95_pct: [null, pct(c.z)] };
      else out[lv] = { value_pct: null, censored: 'right', plain95_pct: [pct(c.z), null] };
    });
    return out;
  }
  // pool cross_med {z, kind, lo, hi, pc} -> board median-chain cell
  function medCross(cr) {
    if (!cr) return null;
    var out = {};
    ['50', '1'].forEach(function (lv) {
      var c = cr[lv]; if (!c) return;
      out[lv] = { value_z: c.z, crossing_defined: c.kind === 'point',
                  kind: c.kind === 'lo-bound' ? 'bound_at_first' : (c.kind === 'point' ? 'point' : 'bound_beyond_last'),
                  ci95_z: (c.lo != null && c.hi != null) ? [c.lo, c.hi] : null,
                  boot_defined_frac: c.pc != null ? Math.max(0, 1 - c.pc) : 1 };
    });
    return out;
  }

  function poolToBoard(P) {
    // cross-dataset identity for the selection: the board-style arm name derived from the pool ident
    // ("claude-haiku-4-5|batch" -> "claude-haiku-4-5"; "Qwen--Qwen3-8B_think|t0.6" -> "Qwen/Qwen3-8B-Thinking")
    function armKey(ident) {
      var st = String(ident).split('|')[0];
      st = st.replace(/_temp_[0-9.]+$/, '').replace(/(_vllm[a-z]*|_anthropic|_batch)+$/, '');
      var think = /_think(_|$)/.test(st); st = st.replace(/_think/g, '');
      st = st.replace(/@.*$/, '').replace(/--/g, '/');
      if (think && !/-Thinking$/.test(st)) st += '-Thinking';
      return st;
    }

    // per-arm disclosure card (the pool pages' flags_meta.card, keyed by config ident): § glyph, hover = the
    // record's render hover, link = notes_base#anchor — the same reading as outcome-distributions
    var card = (P.flags_meta && P.flags_meta.card) || {};
    var notesBase = P.notes_base || card.notes_base || '/progress/notes.html';
    function cardFlags(id) {
      var keys = (card.by_ident && card.by_ident[id]) || [];
      var out = [], seen = {};
      keys.forEach(function (k) {
        var rec = card.keys && card.keys[k]; if (!rec || rec.frame_wide) return;   // frame-wide keys are not per-row glyphs (the rule of 09-02)
        var r = rec.render || {};
        var anchor = rec.anchor || k; if (seen[anchor]) return; seen[anchor] = 1;
        // render.hover may NAME a field of the record ('status_line', 'sentence') rather than carry the text
        var hv = rec.status_line_plain || r.hover || rec.render_hover || rec.status_line || k;   // the pool pages' build word  09-07: the task pool's stamp-free twin first
        if (typeof hv === 'string' && typeof rec[hv] === 'string') hv = rec[hv];
        out.push({ key: k, glyph: r.glyph || '§', hover: hv, href: notesBase + '#' + anchor });
      });
      return out;
    }

    var cfgs = P.configs || [];
    var frame = P.frame || {};
    // ---- shared tasks: union of every config's dot tasks, ascending z ----
    var zById = {};
    cfgs.forEach(function (c) {
      var d = c.dots || {}; var t = d.t || [], z = d.z || [];
      for (var i = 0; i < t.length; i++) if (!(t[i] in zById)) zById[t[i]] = z[i];
    });
    var ids = Object.keys(zById).sort(function (a, b) { return zById[a] - zById[b]; });
    var idx = {}; ids.forEach(function (t, i) { idx[t] = i; });
    var tasks = { id: ids, z: ids.map(function (t) { return r4(zById[t]); }) };

    // ---- bins from the median chain (shared across configs) ----
    var c0 = cfgs[0] || {}; var med0 = c0.med || [];
    var bins = { centers: med0.map(function (b) { return b.z; }), n: med0.map(function (b) { return b.n; }),
                 allocation: 'pool builder: ' + (frame.nbins || med0.length) + ' equal-count bins over the axis tasks' };

    var think = function (id) { return /think/i.test(id); };
    var byId = {};
    var shared_configs = cfgs.map(function (c) {
      byId[c.id] = c;
      return { id: c.id, label: c.label, family: c.family, think: think(c.id), color: c.color,
               arm_key: armKey(c.id),
               excluded: false, exclusion: '',
               // § text: the pool flag (mark + label) and, when the bundle marks the config partial (rows generated under
               // another cap before a re-cut), the pool pages' partial.label with partial.note as the hover tail
               disclosure: [c.flag ? (c.flag.mark + ' ' + c.flag.label) : '', c.partial && c.partial.label ? c.partial.label : '']
                 .concat(cardFlags(c.id).map(function (nf) { return nf.hover; }))
                 .filter(function (t) { return !!t; }).join(' · ') + (c.partial && c.partial.note ? ' — ' + c.partial.note : ''),
               notes_flags: cardFlags(c.id),
               n_cells: c.n_cells, n_axis_cells: c.n_axis_cells };
    });

    // ---- average chain: trend on the grid (logit), bands from se ----
    var grid = P.grid || [];
    var avg = { trend_zs: grid, configs: {}, chain: 'average', frame: frame };
    var med = { configs: {}, chain: 'median', frame: frame };
    var dots = { configs: {} };
    cfgs.forEach(function (c) {
      var tr = c.trend || [], se = (c.band && c.band.se) || [];
      var bands = {};
      ['80', '90', '95'].forEach(function (lv) {
        bands[lv] = { lo: tr.map(function (p, i) { return logit(p - Z[lv] * (se[i] || 0)); }),
                      hi: tr.map(function (p, i) { return logit(p + Z[lv] * (se[i] || 0)); }) };
      });
      avg.configs[c.id] = { trend: tr.map(logit), bands: bands, crossings: avgCross(c.cross) };
      // median chain: per-bin median (proportion) + bootstrap quantiles; censored bins -> null with direction
      var mb = c.med || [];
      var bm = mb.map(function (b) { return b.cens ? null : logit(b.m); });
      var mbands = {};
      ['80', '90', '95'].forEach(function (lv) {
        mbands[lv] = { lo: mb.map(function (b) { return (b.cens || !b.q || !b.q[lv]) ? null : logit(b.q[lv][0]); }),
                       hi: mb.map(function (b) { return (b.cens || !b.q || !b.q[lv]) ? null : logit(b.q[lv][1]); }) };
      });
      var rm = c.rm ? { z: c.rm.z, y: (c.rm.v || []).map(logit) } : null;
      med.configs[c.id] = { bin_median: bm, bands: mbands, bin_censor: mb.map(function (b) { return b.cens || 0; }),
                            raw_median: rm, crossings: medCross(c.cross_med) };
      // dots aligned to the shared task order; per-task n (pool attempt counts vary)
      var d = c.dots || {}; var fails = new Array(ids.length).fill(null), ns = new Array(ids.length).fill(null);
      (d.t || []).forEach(function (t, i) { var k = idx[t]; if (k != null) { fails[k] = d.f[i]; ns[k] = d.n[i]; } });
      dots.configs[c.id] = { fails: fails, n: ns };
    });

    // ---- Bayesian arms (q10/q50/q90 = 80% interval) ----
    var B = P.bayes || {};
    (B.arms || []).forEach(function (a) {
      if (!byId[a.ident]) return;
      var q = function (blk) { return [blk.q10, blk.q10, blk.q10, blk.q50, blk.q90, blk.q90, blk.q90]; };
      // the fit maintainers' interim landings ( rule): labelled, never silent — but once the block says the wave is SERVED
      // (coverage.served, Definitions' 12-of-12 rule) the interim label drops for every arm
      var servedWave = !!(B.coverage && B.coverage.served);
      var interim = servedWave ? null : (a.interim || null);
      if (a.avg && a.avg.q50) avg.configs[a.ident].bayes = { zgrid: a.zgrid, q: q(a.avg), levels: ['80'], linefit: a.linefit || null, interim: interim, cross_record: a.cross_record || null, state: a.state || null };
      if (a.typ && a.typ.q50) med.configs[a.ident].bayes = { zgrid: a.zgrid, q: q(a.typ), levels: ['80'], linefit: a.linefit || null, interim: interim, cross_record: a.cross_record || null, state: a.state || null };
    });

    // ---- frame / stamp (the tasks used, never "frame" on the face) ----
    var cn = P.coverage_note || {};
    var landing = (cn.landing_in_progress || []).map(function (e) { return e && e.label; }).filter(function (l) { return !!l; });   // Definitions' landing flag (S0 half, 20 Sep): a model whose landing is in progress is withheld whole — curve, chip, counts — and named here by its name of record until the run role's whole word
    var withheld = [].concat(cn.pending || [], (cn.held || []).map(function (h) { return h.label; }), landing)
      .filter(function (v, i, a) { return a.indexOf(v) === i; });   // one entry per arm (held is per config)
    var reasons = {};
    // Definitions' landing flag (S0 half, 20 Sep; Definitions' word ): a model whose landing is in progress is hidden whole — curve, chip,
    // counts — and the face says only the fact BY COUNT (one model's results are still arriving, in those words) until the flag releases it; its name
    // and ids stay in the record fields (coverage_note.landing_in_progress, frame.landing), never on the face while hidden
    var landingN = (cn.landing_in_progress || []).length;
    // data facts only on the display (the project maintainers 2026-09-03); the bundle keeps the register words
    (cn.pending || []).forEach(function (l) { reasons[l] = 'no certified results on these tasks yet'; });
    (cn.held || []).forEach(function (h) { reasons[h.label] = 'no certified results on these tasks yet'; });
    var display = {};   // the data fact the display may say for a withheld model (the project maintainers 2026-09-03: no decision words on the display); the register's words stay in reasons
    landing.forEach(function (l) { reasons[l] = 'landing in progress (difficulty\'s flag of record): out of the curves and counts until the run role\'s whole word'; display[l] = 'results still arriving'; });
    var sframe = {
      dataset: 'new', dataset_label: 'new tasks (pool)',
      off_panel: frame.off_panel || null, landing: frame.landing || null, landing_hidden_n: landingN,   // record field + the count the face may say landing: frame.landing || null,   // the landing block (arm ids, flag sha, error) rides as a record field; the face reads the withheld list   // difficulty  18 Sep: the plain line for off-panel arms with cells (rendered under the chips)
      population_M: cfgs.length, fitted_M: cfgs.length, complete_M: cfgs.length,
      sampled_M: cn.roster_total || cfgs.length, difficulty_population_M: cn.roster_total || cfgs.length,
      tasks: parseInt(frame.axis_tasks || ids.length, 10), tasks_manifest: parseInt(frame.manifest_tasks || 0, 10),
      keep_set_hash: frame.manifest_sha || '', runs_fingerprint: frame.label_store_sha || '',
      inputs_content_sha: frame.manifest_sha || '', build_date: (P.stamp || '').slice(0, 10), stamp: P.stamp || '',
      withheld_configs: withheld, withheld_reasons: reasons, withheld_display: display, withdrawn: {}, fit_excluded: [],
      scorer: 'pool loader (§1b-valid results; every-attempt denominators; difficulty\'s module defaults)',
      band_rule: frame.band || '', med_band_rule: frame.med_band || '', sigma_logit: frame.sigma_logit,
      fit_floor: frame.min_cells ? ('at least ' + numWord(frame.min_cells) + ' valid result' + (frame.min_cells > 1 ? 's' : '') + ' to be fitted') : '',   // the counting word (difficulty, 19 Sep): results, in words
      bayes_fits: B.available ? { serving_pointer: 'pool bundle Bayesian block (the wave 2 serving pointer)', wave_id: B.wave_id, set_fingerprint: (B.wave_id || '').slice(-12),
                                  n_fits: (B.arms || []).length, fit_n_tasks: [B.n_tasks],
                                  matches_axis: ((B.arms || []).length === cfgs.length && B.n_tasks === parseInt(frame.axis_tasks || ids.length, 10)),
                                  levels: ['80'], note: B.coverage ? (B.coverage.served ? ('served fit set · ' + (B.coverage.landed != null ? B.coverage.landed : (B.arms || []).length) + ' models fitted')   // no wave id on a face (the project maintainers' 09-07 word)
                                          : ('interim fits: ' + (typeof B.coverage.summary === 'string' ? B.coverage.summary
                                          : (B.coverage.landed != null ? B.coverage.landed + ' of ' + B.coverage.of + ' models landed from wave ' + (B.coverage.wave_id || '?') + ', drawn as interim' : JSON.stringify(B.coverage))))) : '',
                                  coverage: B.coverage || null }
                                : ((B.coverage && (B.coverage.rule || B.coverage.withheld)) ? {   // Definitions' decision via the fit maintainers (10 Sep): no default fitted layer for this set — the bundle says why in one sentence
                                    serving_pointer: 'pool bundle Bayesian block (the wave 2 serving pointer)', n_fits: 0, withheld_by_rule: true,
                                    note: String(B.coverage.rule || 'no default fitted layer for this set by difficulty\'s decision'), coverage: B.coverage } : null),
      // pool-page features folded in (the project maintainers: the official pages host the pool curves): arms by cause, the axis rule, the pool's own surfaces
      coverage_by_cause: { shown: (cn.shown != null ? cn.shown : cfgs.length), roster_total: cn.roster_total || null,
                           pending: (cn.pending || []).length, held: (cn.held || []).length,
                           subthreshold: (cn.subthreshold_total != null ? cn.subthreshold_total : (cn.subthreshold || []).length),
                           frame_only: (cn.frame_only_arms || []).length },
      axis_rule: (frame.min_cover ? ('a task is on this axis when at least ' + numWord(frame.min_cover) + ' fitted model' + (frame.min_cover > 1 ? 's have' : ' has')   // Definitions' plain form (19 Sep): models and results, singular verb, the count with its comma
                   + (frame.min_cells ? ' at least ' + numWord(frame.min_cells) + ' valid result' + (frame.min_cells > 1 ? 's' : '') : ' a valid result') + ' on it (' + withCommas(frame.axis_tasks || ids.length) + ' tasks)') : ''),
      links: [{ label: 'result browser', href: './pool/browser/' }, { label: 'stats', href: './pool/stats/' },
              { label: 'the intake surface', href: '/difficulty/pool-intake/' }],
      notes_base: P.notes_base || (P.flags_meta && P.flags_meta.card && P.flags_meta.card.notes_base) || '/progress/notes.html',
      // source freshness (the pool pages' sources_state, 2026-09-05; the project maintainers : pages mark partial/stale inputs while
      // the cluster is unreadable): newest outcome in the store, project-state time, hold state + sentence
      sources_state: (P.sources_state && typeof P.sources_state === 'object') ? {
        store_newest: P.sources_state.store_newest || null, fleet_state: P.sources_state.fleet_state || null,
        glyph: P.sources_state.glyph || null,   // the hold glyph (‖) for the machinery line (the pool pages lead's word  09-09)
        hold: (P.sources_state.fleet_hold && P.sources_state.fleet_hold.state) || null,
        stale: P.sources_state.stale || null,
        sentence: (P.sources_state.fleet_hold && P.sources_state.fleet_hold.sentence) || P.sources_state.sentence || '' } : null,
      source: 'the pool bundle (data.json)',
      vocab_ruled: '2026-08-27'
    };
    var ax = frame.axis_source || null;   // since  the bundle sits on the difficulty axis of record
    var axLive = !!(ax && ax.mirror && (ax.mirror.axis_basis === 'live' || ax.mirror.wave_of_record === 'unified-live'));   // Definitions' live count-based axis (10 Sep 13:31); "unified-live" is an identifier, never a wave name on a face
    var axDef = ax && ax.mirror ? (axLive ? (String(ax.basis || ax.mirror.axis_plain || 'live axis').replace(/\.\s*$/, '') + '; the tasks used take their positions from the mirror' + ((ax.n_interim_live || ax.n_interim || 0) > 0 ? ', some of them interim' : ''))
                                          : ('the difficulty axis, wave ' + (ax.mirror.wave_of_record || '?') + ' (cut ' + (ax.mirror.cut || '?') + '); '
                                   + 'the tasks used take their positions from the mirror' + ((ax.n_interim || 0) > 0 ? ', some of them interim' : '')))
                                : 'pool loader difficulty (D_hat, §1b-valid results; one axis definition, Definitions\' recipe)';
    if (frame.population === 'golden') {   // the pool pages' golden block: its own axis (the fit maintainers' golden wave export), a data point
      sframe.population = 'golden';
      axDef = (ax && ax.basis ? ax.basis : 'golden axis: the golden wave 2 axis export over the 12 golden models') + ' — ' + (frame.axis_label || 'a data point, not the difficulty definition');
    }
    var waveRec = ax && ax.mirror && ax.mirror.wave_of_record ? ax.mirror.wave_of_record : null;
    var shared = { frame: sframe, axis: { axis_id: waveRec ? (waveRec.indexOf('golden') === 0 ? waveRec : 'pool-' + waveRec) : 'pool-jeffreys-M' + cfgs.length + '-' + (frame.manifest_sha || ''),
                                          definition: axDef,
                                          // the live axis names itself by time and content sha (app.js axisWords): the mirror's own clock and sha from the maintainers' frame
                                          axis_time: ax && ax.mirror ? (ax.mirror.snapshot_ts || ax.mirror.cut || null) : null,
                                          axis_basis: ax && ax.mirror ? (ax.mirror.axis_basis || null) : null,
                                          axis_sha12: ax && ax.mirror ? (ax.mirror.axis_sha12 || null) : null,
                                          axis_plain: ax && ax.mirror ? (ax.mirror.axis_plain || null) : null },
                   tasks: tasks, bins: bins, configs: shared_configs, vocab: {}, withdrawn: [] };
    return { shared: shared, avg: avg, med: med, dots: dots, man: { files: {}, frame: sframe, dataset: 'new' } };
  }
  global.PoolDataset = { toBoard: poolToBoard };
})(typeof window !== 'undefined' ? window : globalThis);
