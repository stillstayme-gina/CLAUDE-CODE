/* 실제 행정경계 위에 지질구를 입힌 지도 + 타임 슬라이더 */
window.GC = window.GC || {};

(function () {
  var SVGNS = 'http://www.w3.org/2000/svg';
  var state = { stop: GC.timeline.length - 1, sel: null, built: false };
  var fullVB = null, curVB = null, pending = null, anim = null;

  function el(tag, attrs) {
    var n = document.createElementNS(SVGNS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  function landBounds() {
    var b = { minX: 1e9, minY: 1e9, maxX: -1e9, maxY: -1e9 };
    GC.base.sido.forEach(function (s) {
      s.rings.forEach(function (r) {
        r.forEach(function (c) {
          var q = GC.project(c[0], c[1]);
          if (q[0] < b.minX) b.minX = q[0];
          if (q[0] > b.maxX) b.maxX = q[0];
          if (q[1] < b.minY) b.minY = q[1];
          if (q[1] > b.maxY) b.maxY = q[1];
        });
      });
    });
    return b;
  }

  var landPath = null;
  function landD() {
    if (landPath) return landPath;
    var d = '';
    GC.base.sido.forEach(function (s) { s.rings.forEach(function (r) { d += GC.pathOf(r); }); });
    return (landPath = d);
  }

  GC.buildMap = function () {
    var host = document.getElementById('mapStage');
    if (!host || state.built) return;
    state.built = true;

    var b = landBounds(), pad = 10, GUT = 6;
    fullVB = [b.minX - pad, b.minY - pad,
              (b.maxX - b.minX) + pad * 2 + GUT,
              (b.maxY - b.minY) + pad * 2];
    curVB = fullVB.slice();
    var svg = el('svg', {
      viewBox: fullVB.join(' '),
      class: 'kmap', role: 'img',
      'aria-label': '실제 행정경계 위에 지질구를 표시한 남한 지질도'
    });

    /* 육지 윤곽을 클립으로 써서 지질구가 해안선을 벗어나지 않게 합니다 */
    var defs = el('defs');
    var cp = el('clipPath', { id: 'gcLand', clipRule: 'nonzero' });
    cp.appendChild(el('path', { d: landD() }));
    defs.appendChild(cp);
    svg.appendChild(defs);

    svg.appendChild(el('path', { d: landD(), class: 'land-base' }));

    /* 밑판 — 실제 시군구 경계를 그 지역의 지질구 색으로 채웁니다.
       지질구 폴리곤이 해안선까지 닿지 않는 가장자리와 섬이 이걸로 메워집니다. */
    var gU = el('g', { class: 'lyr-under', 'clip-path': 'url(#gcLand)' });
    GC.base.muni.forEach(function (mu) {
      var p = GC.findProvince(mu.c[0], mu.c[1]).p;
      var d = '';
      mu.r.forEach(function (r) { d += GC.pathOf(r); });
      gU.appendChild(el('path', { d: d, fill: GC.provFill(p), class: 'under', 'data-id': p.id }));
    });
    svg.appendChild(gU);

    var gProv = el('g', { class: 'lyr-prov', 'clip-path': 'url(#gcLand)' });
    GC.provinces.forEach(function (p) {
      if (p.inset) return;
      var path = el('path', {
        d: GC.pathOf(p.poly), class: 'prov', 'data-id': p.id,
        fill: GC.provFill(p), tabindex: '0', role: 'button'
      });
      var t = el('title'); t.textContent = p.name + ' · ' + p.ageText;
      path.appendChild(t);
      gProv.appendChild(path);
    });
    svg.appendChild(gProv);

    var gSido = el('g', { class: 'lyr-sido' });
    GC.base.sido.forEach(function (s) {
      var d = '';
      s.rings.forEach(function (r) { d += GC.pathOf(r); });
      gSido.appendChild(el('path', { d: d, class: 'sido' }));
    });
    svg.appendChild(gSido);
    svg.appendChild(el('path', { d: landD(), class: 'coast' }));

    var gF = el('g', { class: 'lyr-fault' });
    GC.faults.forEach(function (f) {
      gF.appendChild(el('polyline', { points: GC.lineOf(f.line), class: 'fault' }));
    });
    GC.quakes.forEach(function (q) {
      var c = GC.project(q.at[0], q.at[1]);
      gF.appendChild(el('circle', { cx: c[0], cy: c[1], r: (q.mag - 3) * 2.2, class: 'quake-halo' }));
      gF.appendChild(el('circle', { cx: c[0], cy: c[1], r: 2.2, class: 'quake-dot' }));
    });
    svg.appendChild(gF);

    var gM = el('g', { class: 'lyr-mt' });
    GC.mountains.forEach(function (m) {
      var c = GC.project(m.at[0], m.at[1]);
      var g = el('g', { class: 'mt', 'data-mt': m.id, tabindex: '0', role: 'button' });
      g.appendChild(el('path', {
        d: 'M' + c[0] + ' ' + (c[1] - 4.4) + 'l3.9 6.8h-7.8Z', class: 'mt-glyph'
      }));
      var t = el('title'); t.textContent = m.name + ' ' + m.height + 'm';
      g.appendChild(t);
      gM.appendChild(g);
    });
    svg.appendChild(gM);

    /* 산 160곳 — 작은 점. 깊이 다룬 일곱 곳은 위의 삼각형으로 따로 표시됩니다 */
    var gP = el('g', { class: 'lyr-peak' });
    var deepNames = {};
    GC.mountains.forEach(function (m) { deepNames[m.name] = 1; });
    GC.peaks.forEach(function (pk) {
      if (deepNames[pk[0]] || pk[3] > 130) return;
      var c = GC.project(pk[3], pk[4]);
      var g = el('g', { class: 'peak', 'data-pk': pk[0], tabindex: '0', role: 'button' });
      g.appendChild(el('circle', { cx: c[0], cy: c[1], r: 1.7, class: 'peak-dot' }));
      var t = el('title'); t.textContent = pk[0] + ' ' + pk[1] + 'm · ' + pk[2];
      g.appendChild(t);
      gP.appendChild(g);
    });
    svg.appendChild(gP);

    var gS = el('g', { class: 'lyr-site' });
    GC.geoparks.forEach(function (gp) {
      gp.sites.forEach(function (s) {
        if (s.at[0] > 130) return;                   // 울릉·독도는 삽도에서
        var c = GC.project(s.at[0], s.at[1]);
        var g = el('g', { class: 'site', 'data-gp': gp.id, tabindex: '0', role: 'button' });
        g.appendChild(el('circle', { cx: c[0], cy: c[1], r: 2.3, class: 'site-dot' }));
        var t = el('title'); t.textContent = s.name + ' — ' + gp.name + ' 지질공원';
        g.appendChild(t);
        gS.appendChild(g);
      });
    });
    svg.appendChild(gS);

    var gPin = el('g', { class: 'lyr-pin' });
    gPin.setAttribute('hidden', '');
    gPin.appendChild(el('line', { class: 'fx-cross', x1: -16, x2: -6, y1: 0, y2: 0 }));
    gPin.appendChild(el('line', { class: 'fx-cross', x1: 6, x2: 16, y1: 0, y2: 0 }));
    gPin.appendChild(el('line', { class: 'fx-cross', x1: 0, x2: 0, y1: -16, y2: -6 }));
    gPin.appendChild(el('line', { class: 'fx-cross', x1: 0, x2: 0, y1: 6, y2: 16 }));
    gPin.appendChild(el('circle', { r: 9, class: 'pin-ring' }));
    gPin.appendChild(el('circle', { r: 3.4, class: 'fx-dot' }));
    var fxL = el('text', { class: 'fx-lbl' });
    gPin.appendChild(fxL);
    svg.appendChild(gPin);
    GC._fxLbl = fxL;

    /* 동해 삽도 — 울릉도와 독도 */
    var ix = b.maxX - 64, iy = b.minY + 2;   // 북동쪽 바다 여백에 삽도를 얹습니다
    var gI = el('g', { class: 'lyr-inset' });
    gI.appendChild(el('rect', { x: ix, y: iy, width: 62, height: 54, rx: 3, class: 'inset-box' }));
    var cap = el('text', { x: ix + 5, y: iy + 11, class: 'inset-cap' });
    cap.textContent = '동해';
    gI.appendChild(cap);
    [['ulleung', ix + 19, iy + 27, '울릉도', 5.5], ['dokdo', ix + 46, iy + 39, '독도', 2.6]].forEach(function (d) {
      var p = GC.byId(d[0]);
      var g = el('g', { class: 'prov-inset', 'data-id': d[0], tabindex: '0', role: 'button' });
      g.appendChild(el('circle', { cx: d[1], cy: d[2], r: d[4], fill: GC.provFill(p), class: 'prov' }));
      var tx = el('text', { x: d[1], y: d[2] + d[4] + 8, class: 'inset-lbl' });
      tx.textContent = d[3];
      g.appendChild(tx);
      var t = el('title'); t.textContent = p.name + ' · ' + p.ageText;
      g.appendChild(t);
      gI.appendChild(g);
    });
    svg.appendChild(gI);

    host.appendChild(svg);
    GC._svg = svg; GC._gPin = gPin;

    svg.addEventListener('click', onPick);
    svg.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { onPick(e); e.preventDefault(); }
    });

    var reset = document.getElementById('mapReset');
    if (reset) reset.addEventListener('click', function () { GC.resetMapView(); });

    buildLegend();
    bindSlider();
    applyStop();
    GC.applyMapFocus();

    /* 지도는 해당 페이지를 처음 열 때 만들어지므로, 체크박스의 현재 상태를 반영합니다 */
    ['siteToggle:lyr-site', 'faultToggle:lyr-fault', 'peakToggle:lyr-peak'].forEach(function (pair) {
      var bits = pair.split(':');
      var box = document.getElementById(bits[0]);
      GC.toggleLayer(bits[1], !!(box && box.checked));
    });
  };

  function onPick(e) {
    var mt = e.target.closest('.mt');
    if (mt) { GC.go('mountains', mt.getAttribute('data-mt')); return; }
    var pk = e.target.closest('.peak');
    if (pk) { GC.go('mountains'); setTimeout(function () { GC.openPeakByName(pk.getAttribute('data-pk')); }, 80); return; }
    var st = e.target.closest('.site');
    if (st) { GC.go('geoparks', st.getAttribute('data-gp')); return; }
    var pv = e.target.closest('[data-id]');
    if (pv) GC.selectProvince(pv.getAttribute('data-id'));
  }

  function buildLegend() {
    var box = document.getElementById('mapLegend');
    if (!box) return;
    GC.provinces.slice().sort(function (a, b) { return b.birthMa - a.birthMa; })
      .forEach(function (p) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'lg-row';
        b.setAttribute('data-id', p.id);
        b.innerHTML =
          '<span class="lg-sw" style="background:' + GC.provFill(p) + '"></span>' +
          '<span class="lg-nm">' + p.name + '</span>' +
          '<span class="lg-ag">' + p.ageText.replace(' 전', '') + '</span>';
        b.addEventListener('click', function () { GC.selectProvince(p.id); });
        box.appendChild(b);
      });
  }

  function bindSlider() {
    var s = document.getElementById('timeSlider');
    s.max = String(GC.timeline.length - 1);
    s.value = String(state.stop);
    s.addEventListener('input', function () { state.stop = +s.value; applyStop(); });

    var ticks = document.getElementById('timeTicks');
    GC.timeline.forEach(function (t, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'tick';
      b.style.setProperty('--tc', GC.eraColor(t.era));
      b.setAttribute('data-i', i);
      b.setAttribute('aria-label', t.label + ' ' + t.title);
      b.title = t.label + ' — ' + t.title;
      b.addEventListener('click', function () { state.stop = i; s.value = String(i); applyStop(); });
      ticks.appendChild(b);
    });

    document.getElementById('timePrev').addEventListener('click', function () {
      state.stop = Math.max(0, state.stop - 1); s.value = String(state.stop); applyStop();
    });
    document.getElementById('timeNext').addEventListener('click', function () {
      state.stop = Math.min(GC.timeline.length - 1, state.stop + 1); s.value = String(state.stop); applyStop();
    });
  }

  function applyStop() {
    var t = GC.timeline[state.stop];
    var prevAge = state.stop > 0 ? GC.timeline[state.stop - 1].age : Infinity;

    GC.provinces.forEach(function (p) {
      var born = p.birthMa >= t.age;
      var fresh = born && p.birthMa < prevAge;
      var nodes = GC._svg.querySelectorAll('[data-id="' + p.id + '"]');
      Array.prototype.forEach.call(nodes, function (n) {
        n.classList.toggle('is-unborn', !born);
        n.classList.toggle('is-fresh', fresh);
      });
      var row = document.querySelector('#mapLegend [data-id="' + p.id + '"]');
      if (row) {
        row.classList.toggle('is-unborn', !born);
        row.classList.toggle('is-fresh', fresh);
      }
    });

    document.getElementById('tlLabel').textContent = t.label;
    document.getElementById('tlTitle').textContent = t.title;
    document.getElementById('tlLead').textContent = t.lead;
    document.getElementById('tlPaleo').textContent = t.paleo;
    document.getElementById('tlNote').textContent = t.note;
    document.getElementById('timeSlider').setAttribute('aria-valuetext', t.label + ' ' + t.title);

    Array.prototype.forEach.call(document.querySelectorAll('#timeTicks .tick'), function (b, i) {
      b.classList.toggle('is-on', i <= state.stop);
      b.classList.toggle('is-now', i === state.stop);
    });

    var n = GC.provinces.filter(function (p) { return p.birthMa >= t.age; }).length;
    document.getElementById('tlCount').textContent = n + ' / ' + GC.provinces.length;
  }

  GC.selectProvince = function (id) {
    var p = GC.byId(id);
    if (!p || !GC._svg) return;
    state.sel = id;
    Array.prototype.forEach.call(GC._svg.querySelectorAll('.prov'), function (n) {
      var nid = n.getAttribute('data-id') || (n.parentNode && n.parentNode.getAttribute('data-id'));
      n.classList.toggle('is-sel', nid === id);
    });
    Array.prototype.forEach.call(document.querySelectorAll('#mapLegend .lg-row'), function (n) {
      n.classList.toggle('is-sel', n.getAttribute('data-id') === id);
    });
    var out = document.getElementById('provDetail');
    out.innerHTML = GC.provinceBody(p);
    out.hidden = false;
  };

  /* 확대해도 마커와 글자가 커지지 않도록 현재 배율만큼 되돌립니다 */
  function rescale() {
    if (!GC._svg || !fullVB) return;
    var k = curVB[2] / fullVB[2];
    GC._svg.style.setProperty('--mk', k);
    /* 확대 중에는 동해 삽도를 숨깁니다 (지도 좌표에 놓여 있어 같이 커집니다) */
    GC._svg.classList.toggle('is-zoomed', k < 0.92);
  }

  function setVB(vb) {
    curVB = vb.slice();
    GC._svg.setAttribute('viewBox', vb.join(' '));
    rescale();
  }

  function animateVB(to, done) {
    if (anim) cancelAnimationFrame(anim);
    var from = curVB.slice();
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setVB(to); if (done) done(); return; }
    var t0 = performance.now(), D = 520;
    (function step(t) {
      var e = Math.min(1, (t - t0) / D);
      var u = 1 - Math.pow(1 - e, 3);
      setVB(from.map(function (v, i) { return v + (to[i] - v) * u; }));
      if (e < 1) anim = requestAnimationFrame(step);
      else { anim = null; if (done) done(); }
    })(t0);
  }

  /* 한 지점을 화면 가운데에 두고 확대합니다 */
  function zoomTo(lng, lat, widthUnits) {
    var c = GC.project(lng, lat);
    var w = widthUnits, h = w * (fullVB[3] / fullVB[2]);
    var vb = [c[0] - w / 2, c[1] - h / 2, w, h];
    /* 지도 밖으로 나가지 않게 가둡니다 */
    vb[0] = Math.max(fullVB[0], Math.min(fullVB[0] + fullVB[2] - w, vb[0]));
    vb[1] = Math.max(fullVB[1], Math.min(fullVB[1] + fullVB[3] - h, vb[1]));
    animateVB(vb);
  }

  GC.setPin = function (lng, lat) {
    if (!GC._gPin) return;
    var c = GC.project(lng, lat);
    GC._gPin.setAttribute('transform', 'translate(' + c[0] + ' ' + c[1] + ')');
    GC._gPin.removeAttribute('hidden');
  };

  /* {name, sub, note, lng, lat, provId} — 지도로 이동해 그 지점을 확대하고 이름을 붙입니다 */
  GC.focusOnMap = function (f) {
    pending = f;
    GC.go('map', f.provId || null);
    if (state.built) GC.applyMapFocus();
  };

  GC.applyMapFocus = function () {
    if (!pending || !GC._svg) return;
    var f = pending;
    pending = null;
    GC.setPin(f.lng, f.lat);
    GC._fxLbl.textContent = f.name || '';
    zoomTo(f.lng, f.lat, fullVB[2] * 0.34);

    var bar = document.getElementById('mapFocus');
    if (bar) {
      document.getElementById('mapFocusN').textContent = f.name || '';
      document.getElementById('mapFocusS').textContent = f.sub || '';
      document.getElementById('mapFocusD').textContent = f.note || '';
      bar.hidden = false;
    }
    if (f.provId) GC.selectProvince(f.provId);
  };

  GC.resetMapView = function () {
    if (!GC._svg || !fullVB) return;
    animateVB(fullVB.slice());
    GC._gPin.setAttribute('hidden', '');
    var bar = document.getElementById('mapFocus');
    if (bar) bar.hidden = true;
    Array.prototype.forEach.call(GC._svg.querySelectorAll('.prov.is-sel'), function (n) {
      n.classList.remove('is-sel');
    });
    Array.prototype.forEach.call(document.querySelectorAll('#mapLegend .lg-row.is-sel'), function (n) {
      n.classList.remove('is-sel');
    });
    state.sel = null;
  };

  GC.toggleLayer = function (cls, on) {
    if (GC._svg) GC._svg.querySelector('.' + cls).classList.toggle('is-on', on);
  };
})();
