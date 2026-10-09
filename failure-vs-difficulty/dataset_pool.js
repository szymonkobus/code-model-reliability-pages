









function numWord(n) { n = parseInt(n, 10); return ({ 1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five' })[n] || String(n); }
function withCommas(n) { return String(parseInt(n, 10)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

(function (global) {
  'use strict';
  var Z = { '80': 1.2815515655446004, '90': 1.6448536269514722, '95': 1.959963984540054 };
  function clip(p) { return Math.min(0.9995, Math.max(0.0005, p)); }
  function logit(p) { p = clip(p); return Math.log(p / (1 - p)); }
  function r4(x) { return Math.round(x * 1e4) / 1e4; }
  function pct(z) { return 100 / (1 + Math.exp(-z)); }
  
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
    
    
    function armKey(ident) {
      var st = String(ident).split('|')[0];
      st = st.replace(/_temp_[0-9.]+$/, '').replace(/(_vllm[a-z]*|_anthropic|_batch)+$/, '');
      var think = /_think(_|$)/.test(st); st = st.replace(/_think/g, '');
      st = st.replace(/@.*$/, '').replace(/--/g, '/');
      if (think && !/-Thinking$/.test(st)) st += '-Thinking';
      return st;
    }

    
    
    var card = (P.flags_meta && P.flags_meta.card) || {};
    var notesBase = P.notes_base || card.notes_base || '/progress/notes.html';
    function cardFlags(id) {
      var keys = (card.by_ident && card.by_ident[id]) || [];
      var out = [], seen = {};
      keys.forEach(function (k) {
        var rec = card.keys && card.keys[k]; if (!rec || rec.frame_wide) return;   
        var r = rec.render || {};
        var anchor = rec.anchor || k; if (seen[anchor]) return; seen[anchor] = 1;
        
        var hv = rec.status_line_plain || r.hover || rec.render_hover || rec.status_line || k;   
        if (typeof hv === 'string' && typeof rec[hv] === 'string') hv = rec[hv];
        out.push({ key: k, glyph: r.glyph || '§', hover: hv, href: notesBase + '#' + anchor });
      });
      return out;
    }

    var cfgs = P.configs || [];
    var frame = P.frame || {};
    
    var zById = {};
    cfgs.forEach(function (c) {
      var d = c.dots || {}; var t = d.t || [], z = d.z || [];
      for (var i = 0; i < t.length; i++) if (!(t[i] in zById)) zById[t[i]] = z[i];
    });
    var ids = Object.keys(zById).sort(function (a, b) { return zById[a] - zById[b]; });
    var idx = {}; ids.forEach(function (t, i) { idx[t] = i; });
    var tasks = { id: ids, z: ids.map(function (t) { return r4(zById[t]); }) };

    
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
               
               
               disclosure: [c.flag ? (c.flag.mark + ' ' + c.flag.label) : '', c.partial && c.partial.label ? c.partial.label : '']
                 .concat(cardFlags(c.id).map(function (nf) { return nf.hover; }))
                 .filter(function (t) { return !!t; }).join(' · ') + (c.partial && c.partial.note ? ' — ' + c.partial.note : ''),
               notes_flags: cardFlags(c.id),
               n_cells: c.n_cells, n_axis_cells: c.n_axis_cells };
    });

    
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
      
      var d = c.dots || {}; var fails = new Array(ids.length).fill(null), ns = new Array(ids.length).fill(null);
      (d.t || []).forEach(function (t, i) { var k = idx[t]; if (k != null) { fails[k] = d.f[i]; ns[k] = d.n[i]; } });
      dots.configs[c.id] = { fails: fails, n: ns };
    });

    
    var B = P.bayes || {};
    (B.arms || []).forEach(function (a) {
      if (!byId[a.ident]) return;
      var q = function (blk) { return [blk.q10, blk.q10, blk.q10, blk.q50, blk.q90, blk.q90, blk.q90]; };
      
      
      var servedWave = !!(B.coverage && B.coverage.served);
      var interim = servedWave ? null : (a.interim || null);
      if (a.avg && a.avg.q50) avg.configs[a.ident].bayes = { zgrid: a.zgrid, q: q(a.avg), levels: ['80'], linefit: a.linefit || null, interim: interim, cross_record: a.cross_record || null, state: a.state || null };
      if (a.typ && a.typ.q50) med.configs[a.ident].bayes = { zgrid: a.zgrid, q: q(a.typ), levels: ['80'], linefit: a.linefit || null, interim: interim, cross_record: a.cross_record || null, state: a.state || null };
    });

    
    var cn = P.coverage_note || {};
    var landing = (cn.landing_in_progress || []).map(function (e) { return e && e.label; }).filter(function (l) { return !!l; });   
    var withheld = [].concat(cn.pending || [], (cn.held || []).map(function (h) { return h.label; }), landing)
      .filter(function (v, i, a) { return a.indexOf(v) === i; });   
    var reasons = {};
    
    
    
    var landingN = (cn.landing_in_progress || []).length;
    
    (cn.pending || []).forEach(function (l) { reasons[l] = 'no certified results on these tasks yet'; });
    (cn.held || []).forEach(function (h) { reasons[h.label] = 'no certified results on these tasks yet'; });
    var display = {};   
    landing.forEach(function (l) { reasons[l] = 'landing in progress (difficulty\'s flag of record): out of the curves and counts until the run role\'s whole word'; display[l] = 'results still arriving'; });
    var sframe = {
      dataset: 'new', dataset_label: 'new tasks (pool)',
      off_panel: frame.off_panel || null, landing: frame.landing || null, landing_hidden_n: landingN,   
      population_M: cfgs.length, fitted_M: cfgs.length, complete_M: cfgs.length,
      sampled_M: cn.roster_total || cfgs.length, difficulty_population_M: cn.roster_total || cfgs.length,
      tasks: parseInt(frame.axis_tasks || ids.length, 10), tasks_manifest: parseInt(frame.manifest_tasks || 0, 10),
      keep_set_hash: frame.manifest_sha || '', runs_fingerprint: frame.label_store_sha || '',
      inputs_content_sha: frame.manifest_sha || '', build_date: (P.stamp || '').slice(0, 10), stamp: P.stamp || '',
      withheld_configs: withheld, withheld_reasons: reasons, withheld_display: display, withdrawn: {}, fit_excluded: [],
      scorer: 'pool loader (§1b-valid results; every-attempt denominators; difficulty\'s module defaults)',
      band_rule: frame.band || '', med_band_rule: frame.med_band || '', sigma_logit: frame.sigma_logit,
      fit_floor: frame.min_cells ? ('at least ' + numWord(frame.min_cells) + ' valid result' + (frame.min_cells > 1 ? 's' : '') + ' to be fitted') : '',   
      bayes_fits: B.available ? { serving_pointer: 'pool bundle Bayesian block (the wave 2 serving pointer)', wave_id: B.wave_id, set_fingerprint: (B.wave_id || '').slice(-12),
                                  n_fits: (B.arms || []).length, fit_n_tasks: [B.n_tasks],
                                  matches_axis: ((B.arms || []).length === cfgs.length && B.n_tasks === parseInt(frame.axis_tasks || ids.length, 10)),
                                  levels: ['80'], note: B.coverage ? (B.coverage.served ? ('served fit set · ' + (B.coverage.landed != null ? B.coverage.landed : (B.arms || []).length) + ' models fitted')   
                                          : ('interim fits: ' + (typeof B.coverage.summary === 'string' ? B.coverage.summary
                                          : (B.coverage.landed != null ? B.coverage.landed + ' of ' + B.coverage.of + ' models landed from wave ' + (B.coverage.wave_id || '?') + ', drawn as interim' : JSON.stringify(B.coverage))))) : '',
                                  coverage: B.coverage || null }
                                : ((B.coverage && (B.coverage.rule || B.coverage.withheld)) ? {   
                                    serving_pointer: 'pool bundle Bayesian block (the wave 2 serving pointer)', n_fits: 0, withheld_by_rule: true,
                                    note: String(B.coverage.rule || 'no default fitted layer for this set by difficulty\'s decision'), coverage: B.coverage } : null),
      
      coverage_by_cause: { shown: (cn.shown != null ? cn.shown : cfgs.length), roster_total: cn.roster_total || null,
                           pending: (cn.pending || []).length, held: (cn.held || []).length,
                           subthreshold: (cn.subthreshold_total != null ? cn.subthreshold_total : (cn.subthreshold || []).length),
                           frame_only: (cn.frame_only_arms || []).length },
      axis_rule: (frame.min_cover ? ('a task is on this axis when at least ' + numWord(frame.min_cover) + ' fitted model' + (frame.min_cover > 1 ? 's have' : ' has')   
                   + (frame.min_cells ? ' at least ' + numWord(frame.min_cells) + ' valid result' + (frame.min_cells > 1 ? 's' : '') : ' a valid result') + ' on it (' + withCommas(frame.axis_tasks || ids.length) + ' tasks)') : ''),
      links: [{ label: 'result browser', href: './pool/browser/' }, { label: 'stats', href: './pool/stats/' },
              { label: 'the intake surface', href: '/difficulty/pool-intake/' }],
      notes_base: P.notes_base || (P.flags_meta && P.flags_meta.card && P.flags_meta.card.notes_base) || '/progress/notes.html',
      
      
      sources_state: (P.sources_state && typeof P.sources_state === 'object') ? {
        store_newest: P.sources_state.store_newest || null, fleet_state: P.sources_state.fleet_state || null,
        glyph: P.sources_state.glyph || null,   
        hold: (P.sources_state.fleet_hold && P.sources_state.fleet_hold.state) || null,
        stale: P.sources_state.stale || null,
        sentence: (P.sources_state.fleet_hold && P.sources_state.fleet_hold.sentence) || P.sources_state.sentence || '' } : null,
      source: 'the pool bundle (data.json)',
      vocab_ruled: '2026-08-27'
    };
    var ax = frame.axis_source || null;   
    var axLive = !!(ax && ax.mirror && (ax.mirror.axis_basis === 'live' || ax.mirror.wave_of_record === 'unified-live'));   
    var axDef = ax && ax.mirror ? (axLive ? (String(ax.basis || ax.mirror.axis_plain || 'live axis').replace(/\.\s*$/, '') + '; the tasks used take their positions from the mirror' + ((ax.n_interim_live || ax.n_interim || 0) > 0 ? ', some of them interim' : ''))
                                          : ('the difficulty axis, wave ' + (ax.mirror.wave_of_record || '?') + ' (cut ' + (ax.mirror.cut || '?') + '); '
                                   + 'the tasks used take their positions from the mirror' + ((ax.n_interim || 0) > 0 ? ', some of them interim' : '')))
                                : 'pool loader difficulty (D_hat, §1b-valid results; one axis definition, Definitions\' recipe)';
    if (frame.population === 'golden') {   
      sframe.population = 'golden';
      axDef = (ax && ax.basis ? ax.basis : 'golden axis: the golden wave 2 axis export over the 12 golden models') + ' — ' + (frame.axis_label || 'a data point, not the difficulty definition');
    }
    var waveRec = ax && ax.mirror && ax.mirror.wave_of_record ? ax.mirror.wave_of_record : null;
    var shared = { frame: sframe, axis: { axis_id: waveRec ? (waveRec.indexOf('golden') === 0 ? waveRec : 'pool-' + waveRec) : 'pool-jeffreys-M' + cfgs.length + '-' + (frame.manifest_sha || ''),
                                          definition: axDef,
                                          
                                          axis_time: ax && ax.mirror ? (ax.mirror.snapshot_ts || ax.mirror.cut || null) : null,
                                          axis_basis: ax && ax.mirror ? (ax.mirror.axis_basis || null) : null,
                                          axis_sha12: ax && ax.mirror ? (ax.mirror.axis_sha12 || null) : null,
                                          axis_plain: ax && ax.mirror ? (ax.mirror.axis_plain || null) : null },
                   tasks: tasks, bins: bins, configs: shared_configs, vocab: {}, withdrawn: [] };
    return { shared: shared, avg: avg, med: med, dots: dots, man: { files: {}, frame: sframe, dataset: 'new' } };
  }
  global.PoolDataset = { toBoard: poolToBoard };
})(typeof window !== 'undefined' ? window : globalThis);
