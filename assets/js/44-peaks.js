/* 산 도감 — 검색 · 필터 · 상세 */
window.GC = window.GC || {};

(function () {
  var esc = function (s) { return GC.esc(s); };
  var list = null, sel = null, near = null;

  function build() {
    if (list) return list;
    list = GC.peaks.map(function (p, i) {
      var f = GC.findProvince(p[3], p[4]);
      var deep = GC.mountains.filter(function (m) { return m.name === p[0]; })[0];
      return {
        i: i, name: p[0], h: p[1], sido: p[2], lng: p[3], lat: p[4],
        prov: f.p, deep: deep || null,
        key: (p[0] + ' ' + p[2] + ' ' + f.p.name + ' ' + f.p.rocks.join(' ')).toLowerCase()
      };
    });
    return list;
  }

  function match() {
    var q = document.getElementById('pkQ').value.trim().toLowerCase();
    var sd = document.getElementById('pkSido').value;
    var pv = document.getElementById('pkProv').value;
    var out = build().filter(function (p) {
      if (sd && p.sido !== sd) return false;
      if (pv && p.prov.id !== pv) return false;
      if (q && p.key.indexOf(q) < 0) return false;
      return true;
    });
    if (near) {
      out.forEach(function (p) { p.d = GC.distKm(near[0], near[1], p.lng, p.lat); });
      out.sort(function (a, b) { return a.d - b.d; });
    } else {
      out.sort(function (a, b) { return b.h - a.h; });
    }
    return out;
  }

  function render() {
    var rows = match();
    var host = document.getElementById('pkList');
    document.getElementById('pkCount').textContent = rows.length + ' 곳';
    if (!rows.length) {
      host.innerHTML = '<p class="pk-empty">조건에 맞는 산이 없습니다. 검색어나 필터를 바꿔보세요.</p>';
      return;
    }
    host.innerHTML = rows.slice(0, 200).map(function (p) {
      return '<button type="button" class="pk-row' + (sel === p.i ? ' is-sel' : '') + '" data-i="' + p.i + '">' +
        '<span class="pk-sw" style="background:' + GC.provFill(p.prov) + '"></span>' +
        '<span class="pk-n">' + esc(p.name) + (p.deep ? '<em>자세히</em>' : '') + '</span>' +
        '<span class="pk-sd">' + esc(p.sido) + '</span>' +
        '<span class="pk-pv">' + esc(p.prov.name) + '</span>' +
        '<span class="pk-h">' + p.h.toLocaleString() + '<i>m</i></span>' +
        (p.d != null ? '<span class="pk-d">' + p.d.toFixed(0) + 'km</span>' : '') +
        '</button>';
    }).join('');
    Array.prototype.forEach.call(host.querySelectorAll('.pk-row'), function (b) {
      b.addEventListener('click', function () { open(+b.getAttribute('data-i')); });
    });
  }

  function open(i) {
    sel = i;
    var p = build()[i];
    var out = document.getElementById('pkDetail');
    out.innerHTML =
      '<div class="pk-head" style="--ec:' + GC.provFill(p.prov) + '">' +
        '<p class="pk-loc">' + esc(p.sido) + '</p>' +
        '<h3 class="pk-title">' + esc(p.name) + ' <span>' + p.h.toLocaleString() + 'm</span></h3>' +
      '</div>' +
      '<div class="pk-body">' + GC.provinceBody(p.prov) + '</div>' +
      '<div class="pk-acts">' +
        (p.deep ? '<button type="button" class="btn btn-solid" id="pkDeep">' + esc(p.name) + '이 이 모양이 된 과정 →</button>' : '') +
        '<button type="button" class="btn btn-line" id="pkMap">지도에서 보기</button>' +
      '</div>' +
      '<p class="pk-caveat">지질구는 정상부 좌표를 지질구 경계에 넣어 자동으로 붙인 것입니다. ' +
        '한 산 안에서도 암석은 바뀌고, 특히 경계에 걸친 산은 실제와 다를 수 있습니다.</p>';
    out.hidden = false;

    var d = document.getElementById('pkDeep');
    if (d) d.addEventListener('click', function () {
      GC.openMountain(p.deep.id);
      document.getElementById('mtDeep').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    document.getElementById('pkMap').addEventListener('click', function () {
      GC.go('map', p.prov.id);
      setTimeout(function () { GC.setPin(p.lng, p.lat); }, 60);
    });
    render();
    out.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  GC.initPeaks = function () {
    build();
    var sd = document.getElementById('pkSido');
    var seen = {};
    GC.peaks.forEach(function (p) { seen[p[2]] = 1; });
    Object.keys(seen).sort(function (a, b) { return a.localeCompare(b, 'ko'); }).forEach(function (k) {
      var o = document.createElement('option'); o.value = k; o.textContent = k; sd.appendChild(o);
    });
    var pv = document.getElementById('pkProv');
    GC.provinces.slice().sort(function (a, b) { return b.birthMa - a.birthMa; }).forEach(function (x) {
      var o = document.createElement('option'); o.value = x.id; o.textContent = x.name; pv.appendChild(o);
    });

    document.getElementById('pkQ').addEventListener('input', render);
    sd.addEventListener('change', render);
    pv.addEventListener('change', render);
    document.getElementById('pkClear').addEventListener('click', function () {
      document.getElementById('pkQ').value = ''; sd.value = ''; pv.value = ''; near = null;
      document.getElementById('pkNearNote').hidden = true;
      render();
    });
    document.getElementById('pkNear').addEventListener('click', function (e) {
      var btn = e.currentTarget;
      if (!navigator.geolocation) return;
      btn.disabled = true;
      navigator.geolocation.getCurrentPosition(function (pos) {
        btn.disabled = false;
        near = [pos.coords.longitude, pos.coords.latitude];
        document.getElementById('pkNearNote').hidden = false;
        render();
      }, function () { btn.disabled = false; }, { timeout: 8000 });
    });
    document.getElementById('pkNote').textContent = GC.peakNote;
    render();
  };

  GC.openPeakByName = function (name) {
    var p = build().filter(function (x) { return x.name === name; })[0];
    if (p) open(p.i);
  };
})();
