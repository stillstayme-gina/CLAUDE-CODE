/* 방문 지도 — 동의한 방문자의 "시·도 + 지질구"만 익명으로 기록해 집계합니다.
   좌표·시각·식별자는 저장하지 않습니다. */
window.GC = window.GC || {};

(function () {
  var SVGNS = 'http://www.w3.org/2000/svg';
  var esc = function (s) { return GC.esc(s); };
  var dbRef = null, rows = null, pending = null;

  function el(t, a) { var n = document.createElementNS(SVGNS, t); for (var k in a) n.setAttribute(k, a[k]); return n; }
  function db() {
    if (dbRef) return dbRef;
    dbRef = (window.claude && claude.use) ? claude.use('db') : Promise.resolve(null);
    return dbRef;
  }

  /* 발밑 조회가 끝나면 기록 제안을 띄웁니다 (기본 꺼짐, 누를 때만 저장) */
  GC.offerVisit = function (placeName, prov) {
    var sido = (placeName.match(/^(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)/) || [])[1];
    var box = document.getElementById('fpVisit');
    if (!box) return;
    if (!sido) { box.hidden = true; return; }
    pending = { sido: sido, prov: prov.id, provName: prov.name };
    box.hidden = false;
    box.innerHTML =
      '<button type="button" class="btn btn-line" id="fpVisitGo">이 지역을 방문 지도에 남기기</button>' +
      '<p class="fp-visit-n">' + esc(sido) + ' · ' + esc(prov.name) + ' 두 가지만 익명으로 기록합니다. ' +
      '정확한 좌표와 시각, 누구인지는 저장하지 않습니다.</p>';
    document.getElementById('fpVisitGo').addEventListener('click', function (e) {
      var b = e.currentTarget;
      b.disabled = true; b.textContent = '기록하는 중…';
      db().then(function (d) {
        if (!d) throw 0;
        return d.collection('visits').doc().set({
          sido: pending.sido, prov: pending.prov,
          day: new Date().toISOString().slice(0, 10)
        });
      }).then(function () {
        b.textContent = '기록했습니다';
        box.insertAdjacentHTML('beforeend',
          '<button type="button" class="linkish" id="fpVisitSee">방문 지도 보기 →</button>');
        document.getElementById('fpVisitSee').addEventListener('click', function () { GC.go('visits'); });
        rows = null;
      }).catch(function () {
        b.disabled = false; b.textContent = '이 지역을 방문 지도에 남기기';
        box.querySelector('.fp-visit-n').textContent =
          '지금은 기록할 수 없습니다. 이 페이지를 볼 수만 있는 상태이거나 저장 기능이 꺼져 있습니다.';
      });
    });
  };

  function load() {
    return db().then(function (d) {
      if (!d) return null;
      return d.collection('visits').limit(1000).get();
    }).then(function (snap) {
      if (!snap) return null;
      return (snap.docs || []).map(function (x) { return x.data || {}; });
    }).catch(function () { return null; });
  }

  /* 순차 색상 — 한 색조를 밝은 쪽에서 어두운 쪽으로 (개수는 크기이지 정체성이 아닙니다) */
  function ramp(t) {
    var steps = getComputedStyle(document.documentElement)
      .getPropertyValue('--ramp').trim().split(/\s+/);
    if (steps.length < 5) steps = ['#EFE3D8', '#E0BFA2', '#CE9468', '#B96B38', '#A8471F'];
    return steps[Math.max(0, Math.min(steps.length - 1, Math.floor(t * steps.length - 1e-9)))];
  }

  function draw(counts, max) {
    var host = document.getElementById('vzMap');
    host.innerHTML = '';
    var b = { minX: 1e9, minY: 1e9, maxX: -1e9, maxY: -1e9 };
    GC.base.sido.forEach(function (s) {
      s.rings.forEach(function (r) { r.forEach(function (c) {
        var q = GC.project(c[0], c[1]);
        b.minX = Math.min(b.minX, q[0]); b.maxX = Math.max(b.maxX, q[0]);
        b.minY = Math.min(b.minY, q[1]); b.maxY = Math.max(b.maxY, q[1]);
      }); });
    });
    var pad = 8;
    var svg = el('svg', {
      viewBox: [b.minX - pad, b.minY - pad, (b.maxX - b.minX) + pad * 2, (b.maxY - b.minY) + pad * 2].join(' '),
      class: 'kmap vz-svg', role: 'img',
      'aria-label': '시·도별 방문 기록 수. ' + Object.keys(counts).map(function (k) {
        return k + ' ' + counts[k] + '건';
      }).join(', ')
    });
    GC.base.sido.forEach(function (s) {
      var d = '';
      s.rings.forEach(function (r) { d += GC.pathOf(r); });
      var n = counts[s.name] || 0;
      var p = el('path', {
        d: d, class: 'vz-sido' + (n ? '' : ' is-zero'),
        fill: n ? ramp(max ? n / max : 0) : 'var(--surface-2)'
      });
      var t = el('title'); t.textContent = s.name + ' ' + n + '건';
      p.appendChild(t);
      svg.appendChild(p);
    });
    host.appendChild(svg);
  }

  function render(data) {
    var box = document.getElementById('vzBody');
    if (data === null) {
      box.innerHTML = '<p class="vz-off">이 환경에서는 방문 기록을 읽을 수 없습니다. ' +
        'claude.ai에서 이 페이지를 열면 집계가 보입니다.</p>';
      return;
    }
    if (!data.length) {
      box.innerHTML = '<p class="vz-off">아직 기록이 없습니다. ' +
        '<button type="button" class="linkish" id="vzGoFp">내 발밑</button>에서 지역을 조회한 뒤 ' +
        '&lsquo;방문 지도에 남기기&rsquo;를 누르면 첫 기록이 됩니다.</p>';
      document.getElementById('vzGoFp').addEventListener('click', function () { GC.go('footprint'); });
      return;
    }

    var bySido = {}, byProv = {};
    data.forEach(function (r) {
      if (r.sido) bySido[r.sido] = (bySido[r.sido] || 0) + 1;
      if (r.prov) byProv[r.prov] = (byProv[r.prov] || 0) + 1;
    });
    var sidoRows = Object.keys(bySido).map(function (k) { return [k, bySido[k]]; })
      .sort(function (a, b) { return b[1] - a[1]; });
    var provRows = Object.keys(byProv).map(function (k) {
      var p = GC.byId(k);
      return [p ? p.name : k, byProv[k], p];
    }).sort(function (a, b) { return b[1] - a[1]; });
    var max = sidoRows.length ? sidoRows[0][1] : 0;

    box.innerHTML =
      '<div class="vz-top">' +
        '<div class="vz-stat"><b>' + data.length + '</b><span>건의 기록</span></div>' +
        '<div class="vz-stat"><b>' + sidoRows.length + '</b><span>개 시·도</span></div>' +
        '<div class="vz-stat"><b>' + provRows.length + '</b><span>개 지질구</span></div>' +
      '</div>' +
      '<div class="vz-grid">' +
        '<figure class="vz-fig"><figcaption>시·도별 기록 수</figcaption>' +
          '<div id="vzMap"></div>' +
          '<div class="vz-scale"><span>적음</span><i class="vz-ramp"></i><span>많음 (' + max + '건)</span></div>' +
        '</figure>' +
        '<div class="vz-lists">' +
          '<h4 class="tr-sub">지역</h4><ul class="vz-bars">' +
            sidoRows.map(function (r) {
              return '<li><span class="vz-l">' + esc(r[0]) + '</span>' +
                '<span class="vz-b"><i style="width:' + (r[1] / max * 100) + '%"></i></span>' +
                '<span class="vz-v">' + r[1] + '</span></li>';
            }).join('') + '</ul>' +
          '<h4 class="tr-sub">지질구</h4><ul class="vz-bars">' +
            provRows.map(function (r) {
              return '<li><span class="vz-l"><i class="vz-sw" style="background:' +
                (r[2] ? GC.provFill(r[2]) : 'var(--text-3)') + '"></i>' + esc(r[0]) + '</span>' +
                '<span class="vz-b"><i style="width:' + (r[1] / provRows[0][1] * 100) + '%"></i></span>' +
                '<span class="vz-v">' + r[1] + '</span></li>';
            }).join('') + '</ul>' +
        '</div>' +
      '</div>';
    draw(bySido, max);
  }

  GC.initVisits = function () {
    document.getElementById('vzBody').innerHTML = '<p class="vz-off">불러오는 중…</p>';
    load().then(function (d) { rows = d; render(d); });
  };
})();
