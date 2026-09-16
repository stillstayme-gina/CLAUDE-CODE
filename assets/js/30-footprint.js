/* 내 발밑 — 위치/지역 → 지질구 리포트 */
window.GC = window.GC || {};

(function () {
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /* 지질구 본문 — 발밑 카드와 지도 상세 패널이 함께 씁니다 */
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

  GC.showFootprint = function (placeName, lng, lat, approx) {
    var f = GC.findProvince(lng, lat);
    var p = f.p;
    var card = document.getElementById('fpCard');

    card.innerHTML = '' +
      '<div class="fp-top">' +
        '<p class="fp-place">' + esc(placeName) + '</p>' +
        '<p class="fp-verdict">당신이 서 있는 땅은</p>' +
        '<p class="fp-age"><strong>' + p.ageNum + '</strong><span>' + p.ageUnit + ' 전에 만들어졌습니다</span></p>' +
      '</div>' +
      '<div class="fp-body">' + GC.provinceBody(p) + '</div>' +
      '<div class="fp-foot">' +
        '<button type="button" class="btn btn-ghost" id="fpCopy">공유 문구 복사</button>' +
        '<button type="button" class="btn btn-ghost" id="fpMap">지도에서 보기</button>' +
        '<p class="fp-caveat">1:25만급 지질도를 개략화한 분류입니다. 같은 시·군 안에서도 암석은 바뀝니다. ' +
        (f.exact ? '' : '이 좌표는 경계 밖이라 가장 가까운 지질구로 표시했습니다. ') +
        '정밀한 정보는 한국지질자원연구원 지질정보시스템을 확인하세요.</p>' +
      '</div>';

    card.setAttribute('data-state', 'filled');

    var share = placeName + '의 땅은 ' + p.ageText + '에 만들어졌습니다. ' +
      p.headline + ' (' + p.name + ' · ' + p.rocks[0] + ')';

    document.getElementById('fpCopy').addEventListener('click', function (e) {
      var btn = e.currentTarget;
      try {
        navigator.clipboard.writeText(share).then(function () {
          btn.textContent = '복사했습니다';
          setTimeout(function () { btn.textContent = '공유 문구 복사'; }, 1800);
        });
      } catch (err) {
        btn.textContent = '복사할 수 없습니다';
      }
    });

    document.getElementById('fpMap').addEventListener('click', function () {
      GC.setPin(lng, lat);
      GC.selectProvince(p.id);
      document.getElementById('map').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    GC.setPin(lng, lat);
  };

  GC.initFootprint = function () {
    var input = document.getElementById('fpRegion');
    var list = document.getElementById('fpList');
    var geoBtn = document.getElementById('fpGeo');
    var status = document.getElementById('fpStatus');

    GC.regions.forEach(function (r) {
      var o = document.createElement('option');
      o.value = r[0];
      list.appendChild(o);
    });

    function pick(name) {
      var r = GC.regions.filter(function (x) { return x[0] === name; })[0];
      if (!r) {
        r = GC.regions.filter(function (x) { return x[0].indexOf(name) >= 0; })[0];
      }
      if (!r) {
        status.textContent = '"' + name + '"을(를) 찾지 못했습니다. 목록에서 시·군·구를 골라주세요.';
        return;
      }
      status.textContent = '';
      GC.showFootprint(r[0], r[1], r[2], false);
    }

    document.getElementById('fpGo').addEventListener('click', function () {
      if (input.value.trim()) pick(input.value.trim());
    });
    input.addEventListener('change', function () {
      if (input.value.trim()) pick(input.value.trim());
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && input.value.trim()) pick(input.value.trim());
    });

    geoBtn.addEventListener('click', function () {
      if (!navigator.geolocation) {
        status.textContent = '이 브라우저는 위치 기능을 지원하지 않습니다. 아래에서 지역을 골라주세요.';
        return;
      }
      status.textContent = '위치를 확인하는 중…';
      geoBtn.disabled = true;
      navigator.geolocation.getCurrentPosition(function (pos) {
        geoBtn.disabled = false;
        status.textContent = '';
        var lng = pos.coords.longitude, lat = pos.coords.latitude;
        if (lng < 124 || lng > 132.5 || lat < 32.5 || lat > 39) {
          status.textContent = '한국 밖에 계신 것 같습니다. 아래에서 지역을 골라보세요.';
          return;
        }
        GC.showFootprint('내 위치 ' + lat.toFixed(3) + '°N ' + lng.toFixed(3) + '°E', lng, lat, false);
        document.getElementById('fpCard').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, function () {
        geoBtn.disabled = false;
        status.textContent = '위치를 가져오지 못했습니다. 아래에서 지역을 직접 골라주세요.';
      }, { timeout: 8000 });
    });

    /* 첫 화면은 비워두지 않습니다 — 예시로 시작 */
    var seed = GC.regions.filter(function (x) { return x[0] === '서울 종로구'; })[0];
    input.value = seed[0];
    GC.showFootprint(seed[0], seed[1], seed[2], false);
  };
})();
