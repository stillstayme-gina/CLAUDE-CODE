/* 지질공원 · 지질명소 · 현장 체크인 */
window.GC = window.GC || {};

(function () {
  var esc = function (s) { return GC.esc(s); };
  var NEAR_KM = 3;
  var checks = null;

  function load() { if (!checks) checks = GC.store.get('checkins', {}); return checks; }
  function save() { return GC.store.set('checkins', checks); }
  function allSites() {
    var out = [];
    GC.geoparks.forEach(function (g) { g.sites.forEach(function (s) { out.push({ g: g, s: s }); }); });
    return out;
  }
  function parkById(id) { return GC.geoparks.filter(function (g) { return g.id === id; })[0]; }
  function doneIn(g) {
    var c = load(), n = 0;
    g.sites.forEach(function (s) { if (c[s.id]) n++; });
    return n;
  }

  /* ── 도감 요약 ── */
  function renderSummary() {
    var c = load(), total = allSites().length;
    var got = Object.keys(c).length;
    var full = GC.geoparks.filter(function (g) { return doneIn(g) === g.sites.length; });
    var gps = Object.keys(c).filter(function (k) { return c[k].mode === 'gps'; }).length;

    document.getElementById('gpSummary').innerHTML =
      '<div class="dex">' +
        '<div class="dex-n"><b>' + got + '</b><span>/ ' + total + ' 곳</span></div>' +
        '<div class="dex-meta">' +
          '<p class="dex-t">내 지질 도감</p>' +
          '<div class="dex-bar"><i style="width:' + (got / total * 100).toFixed(1) + '%"></i></div>' +
          '<p class="dex-s">현장 체크인 ' + gps + '곳 · 완주한 지질공원 ' + full.length + ' / ' + GC.geoparks.length + '</p>' +
        '</div>' +
        (got ? '<button type="button" class="btn btn-ghost" id="gpReset">기록 지우기</button>' : '') +
      '</div>' +
      (full.length ? '<div class="badges">' + full.map(function (g) {
        return '<span class="badge" style="--ec:' + GC.eraColor(g.era) + '">' + esc(g.name) + ' 완주</span>';
      }).join('') + '</div>' : '');

    var r = document.getElementById('gpReset');
    if (r) r.addEventListener('click', function () {
      if (!window.confirm('이 기기에 저장된 체크인 기록을 모두 지웁니다. 계속할까요?')) return;
      checks = {}; save(); renderSummary(); renderList();
      if (curPark) openPark(curPark);
    });
  }

  /* ── 공원 목록 ── */
  function renderList() {
    var host = document.getElementById('gpList');
    host.innerHTML = '';
    GC.geoparks.forEach(function (g) {
      var n = doneIn(g);
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'gp-card' + (n === g.sites.length ? ' is-full' : '');
      b.setAttribute('data-id', g.id);
      b.style.setProperty('--ec', GC.eraColor(g.era));
      b.innerHTML =
        '<span class="gp-kind gp-kind--' + g.kind + '">' +
          (g.kind === 'unesco' ? '유네스코 세계지질공원' : '국가지질공원') +
          (g.since ? ' · ' + g.since : '') + '</span>' +
        '<span class="gp-n">' + esc(g.name) + '</span>' +
        '<span class="gp-h">' + esc(g.headline) + '</span>' +
        '<span class="gp-f"><i style="width:' + (n / g.sites.length * 100) + '%"></i>' +
          '<em>' + n + '/' + g.sites.length + '</em></span>';
      b.addEventListener('click', function () { openPark(g.id); });
      host.appendChild(b);
    });
  }

  /* ── 공원 상세 ── */
  var curPark = null;
  function openPark(id, quiet) {
    var g = parkById(id);
    if (!g) return;
    curPark = id;
    var c = load();
    var out = document.getElementById('gpDetail');

    out.innerHTML =
      '<div class="gp-hd" style="--ec:' + GC.eraColor(g.era) + '">' +
        '<p class="gp-kind gp-kind--' + g.kind + '">' +
          (g.kind === 'unesco' ? '유네스코 세계지질공원' : '국가지질공원') +
          (g.since ? ' · ' + g.since + ' 인증' : '') + ' · ' + esc(g.area) + '</p>' +
        '<h3 class="gp-title">' + esc(g.name) + '</h3>' +
        '<p class="gp-head">' + esc(g.headline) + '</p>' +
        '<p class="gp-why">' + esc(g.why) + '</p>' +
      '</div>' +
      '<ul class="site-list">' + g.sites.map(function (s) {
        var done = c[s.id];
        return '<li class="site-row' + (done ? ' is-done' : '') + '" data-site="' + s.id + '">' +
          '<div class="site-main">' +
            '<h4>' + esc(s.name) + (done ? '<span class="site-chk">' +
              (done.mode === 'gps' ? '현장 체크인' : '방문 기록') + '</span>' : '') + '</h4>' +
            '<p class="site-hook">' + esc(s.hook) + '</p>' +
            '<p class="site-look"><span>이것만은 보고 오세요</span>' + esc(s.look) + '</p>' +
          '</div>' +
          '<div class="site-act">' +
            '<button type="button" class="btn ' + (done ? 'btn-ghost' : 'btn-line') + ' js-check" data-site="' + s.id + '">' +
              (done ? '기록 취소' : '체크인') + '</button>' +
            '<button type="button" class="btn btn-ghost js-where" data-site="' + s.id + '">위치 보기</button>' +
            '<p class="site-msg" role="status"></p>' +
          '</div>' +
        '</li>';
      }).join('') + '</ul>';

    Array.prototype.forEach.call(out.querySelectorAll('.js-check'), function (btn) {
      btn.addEventListener('click', function () { checkIn(g, btn.getAttribute('data-site'), btn); });
    });
    Array.prototype.forEach.call(out.querySelectorAll('.js-where'), function (btn) {
      btn.addEventListener('click', function () {
        var site = g.sites.filter(function (x) { return x.id === btn.getAttribute('data-site'); })[0];
        if (!site) return;
        GC.focusOnMap({
          name: site.name, lng: site.at[0], lat: site.at[1], provId: g.prov,
          sub: g.name + ' 지질공원', note: site.hook
        });
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('.gp-card'), function (b) {
      b.classList.toggle('is-sel', b.getAttribute('data-id') === id);
    });
    if (!quiet) out.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function mark(siteId, mode) {
    load()[siteId] = { ts: Date.now(), mode: mode };
    var ok = save();
    renderSummary(); renderList(); openPark(curPark, true);
    return ok;
  }

  function checkIn(g, siteId, btn) {
    var site = g.sites.filter(function (s) { return s.id === siteId; })[0];
    var row = btn.closest('.site-row');
    var msg = row.querySelector('.site-msg');

    if (load()[siteId]) {
      delete checks[siteId];
      save(); renderSummary(); renderList(); openPark(curPark, true);
      return;
    }

    if (!navigator.geolocation) {
      if (mark(siteId, 'manual') === false) msg.textContent = '이 브라우저에서는 기록을 저장할 수 없습니다.';
      return;
    }

    msg.textContent = '위치를 확인하는 중…';
    btn.disabled = true;
    navigator.geolocation.getCurrentPosition(function (pos) {
      btn.disabled = false;
      var d = GC.distKm(pos.coords.longitude, pos.coords.latitude, site.at[0], site.at[1]);
      if (d <= NEAR_KM) {
        mark(siteId, 'gps');
      } else {
        msg.innerHTML = esc(site.name) + '에서 <b>' + d.toFixed(d < 100 ? 1 : 0) + 'km</b> 떨어져 있습니다. ' +
          '<button type="button" class="linkish js-manual">그래도 방문 기록 남기기</button>';
        msg.querySelector('.js-manual').addEventListener('click', function () { mark(siteId, 'manual'); });
      }
    }, function () {
      btn.disabled = false;
      msg.innerHTML = '위치를 가져오지 못했습니다. ' +
        '<button type="button" class="linkish js-manual">방문 기록만 남기기</button>';
      msg.querySelector('.js-manual').addEventListener('click', function () { mark(siteId, 'manual'); });
    }, { timeout: 8000, enableHighAccuracy: true });
  }

  GC.initGeoparks = function () {
    document.getElementById('gpNote').textContent = GC.geoparkNote;
    renderSummary();
    renderList();
    openPark(GC.geoparks[0].id, true);
  };

  GC.openPark = function (id) { openPark(id); };
})();
