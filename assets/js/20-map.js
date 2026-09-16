/* 타임 슬라이더 지질도 */
window.GC = window.GC || {};

(function () {
  var SVGNS = 'http://www.w3.org/2000/svg';
  var state = { stop: GC.timeline.length - 1, faults: false, sel: null, pin: null };

  function el(tag, attrs) {
    var n = document.createElementNS(SVGNS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  function bounds() {
    var minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    GC.provinces.forEach(function (p) {
      if (p.inset) return;
      p.poly.forEach(function (c) {
        var q = GC.project(c[0], c[1]);
        minX = Math.min(minX, q[0]); maxX = Math.max(maxX, q[0]);
        minY = Math.min(minY, q[1]); maxY = Math.max(maxY, q[1]);
      });
    });
    return { minX: minX, minY: minY, maxX: maxX, maxY: maxY };
  }

  GC.buildMap = function () {
    var host = document.getElementById('mapStage');
    if (!host) return;
    var b = bounds(), pad = 12, GUT = 74;   // GUT = 동해 삽도 자리
    var vb = [b.minX - pad, b.minY - pad,
              (b.maxX - b.minX) + pad * 2 + GUT, (b.maxY - b.minY) + pad * 2];

    var svg = el('svg', {
      viewBox: vb.join(' '), class: 'kmap',
      role: 'img', 'aria-label': '한반도 남부 지질구 지도'
    });

    var gProv = el('g', { class: 'lyr-prov' });
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

    /* 활성단층 · 지진 */
    var gF = el('g', { class: 'lyr-fault' });
    GC.faults.forEach(function (f) {
      gF.appendChild(el('polyline', { points: GC.lineOf(f.line), class: 'fault' }));
    });
    GC.quakes.forEach(function (q) {
      var c = GC.project(q.at[0], q.at[1]);
      gF.appendChild(el('circle', { cx: c[0], cy: c[1], r: (q.mag - 3) * 2.4, class: 'quake-halo' }));
      gF.appendChild(el('circle', { cx: c[0], cy: c[1], r: 2.6, class: 'quake-dot' }));
    });
    svg.appendChild(gF);

    /* 산 */
    var gM = el('g', { class: 'lyr-mt' });
    GC.mountains.forEach(function (m) {
      var c = GC.project(m.at[0], m.at[1]);
      var g = el('g', { class: 'mt', 'data-id': m.id, tabindex: '0', role: 'button' });
      g.appendChild(el('path', {
        d: 'M' + c[0] + ' ' + (c[1] - 5) + 'l4.4 7.6h-8.8Z', class: 'mt-glyph'
      }));
      var t = el('title'); t.textContent = m.name + ' ' + m.height + 'm';
      g.appendChild(t);
      gM.appendChild(g);
    });
    svg.appendChild(gM);

    /* 내 위치 핀 */
    var gPin = el('g', { class: 'lyr-pin' });
    gPin.setAttribute('hidden', '');
    gPin.appendChild(el('circle', { r: 9, class: 'pin-ring' }));
    gPin.appendChild(el('circle', { r: 3.4, class: 'pin-dot' }));
    svg.appendChild(gPin);

    /* 울릉도 · 독도 삽도 */
    var ix = b.maxX + 8, iy = b.minY + 6;
    var gI = el('g', { class: 'lyr-inset' });
    gI.appendChild(el('rect', { x: ix, y: iy, width: 66, height: 56, rx: 3, class: 'inset-box' }));
    var il = el('text', { x: ix + 5, y: iy + 12, class: 'inset-cap' });
    il.textContent = '동해';
    gI.appendChild(il);
    [['ulleung', ix + 20, iy + 28, '울릉도'], ['dokdo', ix + 49, iy + 40, '독도']].forEach(function (d) {
      var p = GC.byId(d[0]);
      var g = el('g', { class: 'prov-inset', 'data-id': d[0], tabindex: '0', role: 'button' });
      g.appendChild(el('circle', { cx: d[1], cy: d[2], r: d[0] === 'ulleung' ? 6 : 3, fill: GC.provFill(p), class: 'prov' }));
      var tx = el('text', { x: d[1], y: d[2] + (d[0] === 'ulleung' ? 15 : 11), class: 'inset-lbl' });
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

    buildLegend();
    bindSlider();
    applyStop();
  };

  function onPick(e) {
    var mt = e.target.closest('.mt');
    if (mt) { GC.openMountain(mt.getAttribute('data-id')); return; }
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
    if (!s) return;
    s.max = String(GC.timeline.length - 1);
    s.value = String(state.stop);
    s.addEventListener('input', function () {
      state.stop = +s.value;
      applyStop();
    });

    var ticks = document.getElementById('timeTicks');
    GC.timeline.forEach(function (t, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'tick';
      b.style.setProperty('--tc', GC.eraColor(t.era));
      b.setAttribute('data-i', i);
      b.setAttribute('aria-label', t.label + ' ' + t.title);
      b.title = t.label;
      b.addEventListener('click', function () {
        state.stop = i; s.value = String(i); applyStop();
      });
      ticks.appendChild(b);
    });

    var prev = document.getElementById('timePrev'), next = document.getElementById('timeNext');
    prev.addEventListener('click', function () {
      state.stop = Math.max(0, state.stop - 1); s.value = String(state.stop); applyStop();
    });
    next.addEventListener('click', function () {
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
    document.getElementById('tlNote').textContent = t.note;
    document.getElementById('timeSlider').setAttribute('aria-valuetext', t.label + ' ' + t.title);

    Array.prototype.forEach.call(document.querySelectorAll('#timeTicks .tick'), function (b, i) {
      b.classList.toggle('is-on', i <= state.stop);
      b.classList.toggle('is-now', i === state.stop);
    });

    var born = GC.provinces.filter(function (p) { return p.birthMa >= t.age; });
    document.getElementById('tlCount').textContent = born.length + ' / ' + GC.provinces.length;
  }

  GC.selectProvince = function (id) {
    var p = GC.byId(id);
    if (!p) return;
    state.sel = id;
    Array.prototype.forEach.call(GC._svg.querySelectorAll('.prov, .prov-inset'), function (n) {
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

  GC.setPin = function (lng, lat) {
    var c = GC.project(lng, lat);
    GC._gPin.setAttribute('transform', 'translate(' + c[0] + ' ' + c[1] + ')');
    GC._gPin.removeAttribute('hidden');
  };

  GC.toggleFaults = function (on) {
    GC._svg.querySelector('.lyr-fault').classList.toggle('is-on', on);
  };
})();
