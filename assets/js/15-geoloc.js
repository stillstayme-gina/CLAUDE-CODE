/* 위치 확인 — 발행본은 교차 출처 iframe 안에서 돌기 때문에, 브라우저가 권한 정책으로
   위치를 아예 차단합니다(오류 code 1). 이 경우 navigator.permissions 는 여전히
   'granted' 를 돌려주므로 믿을 수 없고, document.featurePolicy 로 미리 확인해야 합니다. */
window.GC = window.GC || {};

GC.geo = (function () {
  function inFrame() {
    try { return window.self !== window.top; } catch (e) { return true; }
  }

  /* 'ok' | 'blocked' | 'unsupported' */
  function status() {
    if (!navigator.geolocation) return 'unsupported';
    try {
      if (document.featurePolicy && document.featurePolicy.allowsFeature &&
          !document.featurePolicy.allowsFeature('geolocation')) return 'blocked';
    } catch (e) { /* 알 수 없으면 일단 시도해 봅니다 */ }
    return 'ok';
  }

  var MSG = {
    blocked: '이 미리보기 창에서는 브라우저가 위치 기능을 막습니다. ' +
             '새 탭에서 열면 위치를 쓸 수 있고, 그냥 아래에서 지역을 골라도 됩니다.',
    unsupported: '이 브라우저는 위치 기능을 지원하지 않습니다. 아래에서 지역을 골라주세요.',
    denied: '위치 권한이 거부되었습니다. 주소창 옆 자물쇠 아이콘에서 위치를 허용하거나, ' +
            '아래에서 지역을 골라주세요.',
    unavailable: '지금은 위치를 확인할 수 없습니다. 아래에서 지역을 골라주세요.',
    timeout: '위치 확인이 오래 걸립니다. 다시 시도하거나 아래에서 지역을 골라주세요.',
    outside: '한국 밖에 계신 것 같습니다. 아래에서 지역을 골라보세요.'
  };

  /* 위치를 한 번 읽습니다. onOk(lng, lat) / onErr(메시지, 종류) */
  function get(onOk, onErr) {
    var st = status();
    if (st !== 'ok') { if (onErr) onErr(MSG[st], st); return; }
    navigator.geolocation.getCurrentPosition(function (pos) {
      var lng = pos.coords.longitude, lat = pos.coords.latitude;
      if (lng < 124 || lng > 132.5 || lat < 32.5 || lat > 39) {
        if (onErr) onErr(MSG.outside, 'outside');
        return;
      }
      if (onOk) onOk(lng, lat, pos.coords.accuracy);
    }, function (e) {
      var kind = e && e.code === 1 ? 'denied' : e && e.code === 3 ? 'timeout' : 'unavailable';
      /* 프레임 안에서의 code 1 은 대개 사용자가 거부한 게 아니라 정책 차단입니다 */
      if (kind === 'denied' && inFrame() && /policy|disabled/i.test(e.message || '')) kind = 'blocked';
      if (onErr) onErr(MSG[kind], kind);
    }, { timeout: 10000, maximumAge: 60000, enableHighAccuracy: false });
  }

  /* 차단된 경우 새 탭에서 열기 버튼을 붙입니다 */
  function openHint(el) {
    if (!el) return;
    el.innerHTML = '<button type="button" class="btn btn-line js-newtab">새 탭에서 열기</button>';
    el.hidden = false;
    el.querySelector('.js-newtab').addEventListener('click', function () {
      try { window.open(location.href, '_blank', 'noopener'); }
      catch (e) { /* 팝업이 막히면 아무 일도 하지 않습니다 */ }
    });
  }

  return { status: status, get: get, inFrame: inFrame, openHint: openHint, MSG: MSG };
})();
