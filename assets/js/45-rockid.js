/* 이 돌 이름이 뭐예요 — 현장 간이 검색표 */
window.GC = window.GC || {};

(function () {
  var esc = function (s) { return GC.esc(s); };
  var trail = [];

  function ask(key) {
    var q = GC.rockTree[key];
    var out = document.getElementById('rkStage');
    out.innerHTML =
      '<p class="rk-step">질문 ' + (trail.length + 1) + '</p>' +
      '<h3 class="rk-q">' + esc(q.q) + '</h3>' +
      '<p class="rk-hint">' + esc(q.hint) + '</p>' +
      '<div class="rk-opts">' + q.a.map(function (o, i) {
        return '<button type="button" class="rk-opt" data-i="' + i + '">' + esc(o.t) + '</button>';
      }).join('') + '</div>' +
      (trail.length ? '<button type="button" class="linkish rk-back">한 단계 뒤로</button>' : '');

    Array.prototype.forEach.call(out.querySelectorAll('.rk-opt'), function (b) {
      b.addEventListener('click', function () {
        var o = q.a[+b.getAttribute('data-i')];
        trail.push(key);
        if (o.r) result(o.r); else ask(o.to);
      });
    });
    var back = out.querySelector('.rk-back');
    if (back) back.addEventListener('click', function () { ask(trail.pop()); });
  }

  function result(id) {
    var r = GC.rocks[id];
    var out = document.getElementById('rkStage');
    var mt = r.go ? GC.mountains.filter(function (m) { return m.id === r.go; })[0] : null;

    out.innerHTML =
      '<div class="rk-res" style="--ec:' + GC.eraColor(r.era) + '">' +
        '<p class="rk-verdict">아마도 이 돌은</p>' +
        '<h3 class="rk-name">' + esc(r.name) + '</h3>' +
        '<p class="rk-type">' + esc(r.type) + '</p>' +
        '<div class="rk-block"><h5>어떻게 만들어졌나</h5><p>' + esc(r.made) + '</p></div>' +
        '<div class="rk-block"><h5>확인 요령</h5><p>' + esc(r.tell) + '</p></div>' +
        '<div class="rk-block rk-where"><h5>한국에서 볼 수 있는 곳</h5><p>' + esc(r.where) + '</p></div>' +
        '<div class="rk-acts">' +
          '<button type="button" class="btn btn-solid" id="rkAgain">다시 하기</button>' +
          (mt ? '<button type="button" class="btn btn-line" id="rkGo">' + esc(mt.name) + ' 이야기 보기</button>' : '') +
        '</div>' +
        '<p class="rk-caveat">눈과 손으로만 하는 간이 판별입니다. 실제 암석 동정은 현미경과 화학 분석이 필요하고, ' +
        '자연에는 중간 성질의 암석이 훨씬 많습니다. 국립공원과 지질공원에서 돌을 채취하는 것은 금지되어 있습니다.</p>' +
      '</div>';

    document.getElementById('rkAgain').addEventListener('click', function () {
      trail = []; ask(GC.rockTree.start);
    });
    var go = document.getElementById('rkGo');
    if (go) go.addEventListener('click', function () { GC.go('mountains', r.go); });
  }

  GC.initRockId = function () { trail = []; ask(GC.rockTree.start); };
})();
