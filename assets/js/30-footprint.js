/* 내 발밑 — 위치/지역 → 지질구 리포트 */
window.GC = window.GC || {};

(function () {
  var esc = function (s) { return GC.esc(s); };
  var last = null;

  /* 지질구 본문 — 발밑 카드와 지도 상세가 함께 씁니다 */
  GC.provinceBody = function (p) {
    return '' +
      '<div class="pv-head">' +
        '<span class="pv-era" style="--ec:' + GC.eraColor(p.era) + '">' + GC.eras[p.era].name + '</span>' +
        '<h4 class="pv-name">' + esc(p.name) + '</h4>' +
      '</div>' +
      '<p class="pv-headline">' + esc(p.headline) + '</p>' +
      '<dl class="pv-facts">' +
        '<div><dt>형성 시기</dt><dd>' + esc(p.ageText) + '</dd></div>' +
        '<div><dt>주요 암석</dt><dd>' + p.rocks.map(esc).join(' · ') + '</dd></div>' +
      '</dl>' +
      '<div class="pv-block"><h5>그때 이곳은</h5><p>' + esc(p.thenHere) + '</p></div>' +
      '<div class="pv-block pv-go"><h5>가서 볼 것</h5><p>' + esc(p.seeIt) + '</p></div>';
  };

  function nearbyParks(lng, lat) {
    var out = [];
    GC.geoparks.forEach(function (g) {
      g.sites.forEach(function (s) {
        out.push({ g: g, s: s, d: GC.distKm(lng, lat, s.at[0], s.at[1]) });
      });
    });
    return out.sort(function (a, b) { return a.d - b.d; }).slice(0, 3);
  }

  GC.showFootprint = function (placeName, lng, lat) {
    var f = GC.findProvince(lng, lat), p = f.p;
    last = { name: placeName, lng: lng, lat: lat, p: p, exact: f.exact };

    var mini = document.getElementById('fpCardMini');
    if (mini) {
      mini.innerHTML =
        '<p class="fp-place">' + esc(placeName) + '</p>' +
        '<p class="fp-age"><strong>' + p.ageNum + '</strong><span>' + p.ageUnit + ' 전</span></p>' +
        '<p class="fp-mini-p">' + esc(p.name) + ' · ' + esc(p.headline) + '</p>' +
        '<button type="button" class="btn btn-line" id="fpMore">자세히 보기</button>';
      mini.hidden = false;
      document.getElementById('fpMore').addEventListener('click', function () { GC.go('footprint'); });
    }

    var card = document.getElementById('fpCard');
    card.innerHTML =
      '<div class="fp-top">' +
        '<p class="fp-place">' + esc(placeName) + '</p>' +
        '<p class="fp-verdict">당신이 서 있는 땅은</p>' +
        '<p class="fp-age"><strong>' + p.ageNum + '</strong><span>' + p.ageUnit + ' 전에 만들어졌습니다</span></p>' +
      '</div>' +
      '<div class="fp-body">' + GC.provinceBody(p) + '</div>' +
      '<div class="fp-near"><h5>여기서 가까운 지질명소</h5><ul>' +
        nearbyParks(lng, lat).map(function (n) {
          return '<li><button type="button" class="linkish" data-gp="' + n.g.id + '">' +
            esc(n.s.name) + '</button><span>' + n.d.toFixed(n.d < 100 ? 1 : 0) + 'km · ' +
            esc(n.g.name) + ' 지질공원</span></li>';
        }).join('') + '</ul></div>' +
      '<div class="fp-foot">' +
        '<button type="button" class="btn btn-ghost" id="fpCopy">공유 문구 복사</button>' +
        '<button type="button" class="btn btn-ghost" id="fpMap">지도에서 보기</button>' +
        '<p class="fp-caveat">1:25만급 지질도를 개략화한 분류입니다. 같은 시·군 안에서도 암석은 바뀝니다. ' +
        (f.exact ? '' : '이 좌표는 지질구 경계 밖이라 가장 가까운 지질구로 표시했습니다. ') +
        '정밀한 정보는 한국지질자원연구원 지질정보시스템을 확인하세요.</p>' +
      '</div>';

    Array.prototype.forEach.call(card.querySelectorAll('[data-gp]'), function (b) {
      b.addEventListener('click', function () { GC.go('geoparks', b.getAttribute('data-gp')); });
    });

    var share = placeName + '의 땅은 ' + p.ageText + '에 만들어졌습니다. ' +
      p.headline + ' (' + p.name + ' · ' + p.rocks[0] + ')';
    document.getElementById('fpCopy').addEventListener('click', function (e) {
      var btn = e.currentTarget;
      try {
        navigator.clipboard.writeText(share).then(function () {
          btn.textContent = '복사했습니다';
          setTimeout(function () { btn.textContent = '공유 문구 복사'; }, 1800);
        });
      } catch (err) { btn.textContent = '복사할 수 없습니다'; }
    });
    document.getElementById('fpMap').addEventListener('click', function () {
      GC.focusOnMap({
        name: placeName, lng: lng, lat: lat, provId: p.id,
        sub: '내가 조회한 위치',
        note: p.name + ' · ' + p.ageText
      });
    });
  };

  /* 홈과 발밑 페이지가 같은 동작을 공유합니다 */
  function bind(prefix, thenGo) {
    var input = document.getElementById(prefix + 'Region');
    var geoBtn = document.getElementById(prefix + 'Geo');
    var goBtn = document.getElementById(prefix + 'Go');
    var status = document.getElementById(prefix + 'Status');
    if (!input) return;

    input.setAttribute('list', 'fpList');

    function pick(name) {
      var r = GC.regions.filter(function (x) { return x[0] === name; })[0] ||
              GC.regions.filter(function (x) { return x[0].indexOf(name) >= 0; })[0];
      if (!r) {
        status.textContent = '"' + name + '"을(를) 찾지 못했습니다. 목록에서 시·군·구를 골라주세요.';
        return;
      }
      status.textContent = '';
      GC.showFootprint(r[0], r[1], r[2]);
      if (thenGo) GC.go('footprint');
    }

    goBtn.addEventListener('click', function () { if (input.value.trim()) pick(input.value.trim()); });
    input.addEventListener('change', function () { if (input.value.trim()) pick(input.value.trim()); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && input.value.trim()) pick(input.value.trim());
    });

    geoBtn.addEventListener('click', function () {
      status.textContent = '위치를 확인하는 중…';
      geoBtn.disabled = true;
      locate(function () {
        geoBtn.disabled = false; status.textContent = '';
        if (thenGo) GC.go('footprint');
      }, function (m, kind) {
        geoBtn.disabled = false;
        status.textContent = m;
        if (kind === 'blocked') GC.geo.openHint(document.getElementById(prefix + 'NewTab'));
      });
    });
  }

  /* 위치 한 번 읽기 — 성공하면 발밑을 채웁니다 */
  function locate(onDone, onFail) {
    GC.geo.get(function (lng, lat) {
      GC.showFootprint('내 위치 ' + lat.toFixed(3) + '°N ' + lng.toFixed(3) + '°E', lng, lat);
      if (onDone) onDone();
    }, function (msg, kind) {
      if (onFail) onFail(msg, kind);
    });
  }

  function autoOn() { return GC.store.get('autoloc', null) === true; }

  function initAuto() {
    var ask = document.getElementById('hmAsk');
    var box = document.getElementById('fpAuto');
    var fpStatus = document.getElementById('fpStatus');
    var st = GC.geo.status();

    /* 쓸 수 없는 환경이면 자동 사용을 꺼두고, 왜 안 되는지 먼저 알려줍니다 */
    if (st !== 'ok') {
      box.checked = false;
      box.disabled = true;
      fpStatus.textContent = GC.geo.MSG[st];
      if (st === 'blocked') GC.geo.openHint(document.getElementById('fpNewTab'));
      document.getElementById('hmStatus').textContent = GC.geo.MSG[st];
      if (st === 'blocked') GC.geo.openHint(document.getElementById('hmNewTab'));
      return;
    }

    var decided = GC.store.get('autoloc', null);
    box.checked = decided === true;
    box.addEventListener('change', function () {
      GC.store.set('autoloc', box.checked);
      if (!box.checked) return;
      fpStatus.textContent = '위치를 확인하는 중…';
      locate(function () { fpStatus.textContent = ''; },
             function (m) { fpStatus.textContent = m; });
    });

    if (decided === true) {
      locate(null, function (m) { document.getElementById('hmStatus').textContent = m; });
      return;
    }
    if (decided === false) return;

    ask.hidden = false;
    document.getElementById('hmAskYes').addEventListener('click', function () {
      GC.store.set('autoloc', true);
      box.checked = true;
      ask.hidden = true;
      document.getElementById('hmStatus').textContent = '위치를 확인하는 중…';
      locate(function () {
        document.getElementById('hmStatus').textContent = '';
        GC.go('footprint');
      }, function (m) { document.getElementById('hmStatus').textContent = m; });
    });
    document.getElementById('hmAskNo').addEventListener('click', function () {
      GC.store.set('autoloc', false);
      ask.hidden = true;
    });
  }

  GC.initFootprint = function () {
    var list = document.getElementById('fpList');
    GC.regions.forEach(function (r) {
      var o = document.createElement('option');
      o.value = r[0];
      list.appendChild(o);
    });

    bind('hm', true);
    bind('fp', false);

    /* 빈 화면으로 시작하지 않도록 예시 하나 */
    var seed = GC.regions.filter(function (x) { return x[0] === '서울 종로구'; })[0] || GC.regions[0];
    document.getElementById('fpRegion').value = seed[0];
    GC.showFootprint(seed[0], seed[1], seed[2]);

    initAuto();
  };
})();
