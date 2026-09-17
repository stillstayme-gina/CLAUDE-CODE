/* 자료 출처 — 전용 페이지와, 각 페이지 하단의 출처 줄 */
window.GC = window.GC || {};

(function () {
  var esc = function (s) { return GC.esc(s); };
  function byId(id) { return GC.sources.filter(function (s) { return s.id === id; })[0]; }

  /* 페이지 하단에 "이 페이지가 쓴 자료" 한 줄 */
  GC.mountSourceLine = function (page, host) {
    var ids = GC.pageSources[page];
    if (!ids || !host) return;
    host.innerHTML =
      '<span class="src-k">이 페이지가 쓴 자료</span>' +
      ids.map(function (id) {
        var s = byId(id);
        return s ? '<a class="src-chip" href="' + s.url + '" target="_blank" rel="noopener">' +
          esc(s.org) + '</a>' : '';
      }).join('') +
      '<button type="button" class="linkish src-more">자세히 →</button>';
    host.querySelector('.src-more').addEventListener('click', function () { GC.go('sources'); });
  };

  GC.initSources = function () {
    document.getElementById('srcList').innerHTML = GC.sources.map(function (s) {
      return '<article class="src-card">' +
        '<p class="src-tag">' + esc(s.tag) + '</p>' +
        '<h3 class="src-org">' + esc(s.org) + '</h3>' +
        '<p class="src-name">' + esc(s.name) + '</p>' +
        '<div class="src-used"><h4>여기서 가져온 것</h4><ul>' +
          s.used.map(function (u) { return '<li>' + esc(u) + '</li>'; }).join('') +
        '</ul></div>' +
        '<p class="src-how"><span>이 시안에서 어떻게 썼나</span>' + esc(s.how) + '</p>' +
        '<a class="src-link" href="' + s.url + '" target="_blank" rel="noopener">' +
          esc(s.url.replace(/^https?:\/\//, '')) + ' ↗</a>' +
        '</article>';
    }).join('');
    document.getElementById('srcNote').textContent = GC.sourceNote;

    /* 각 페이지의 출처 줄도 여기서 한 번에 채웁니다 */
    Object.keys(GC.pageSources).forEach(function (page) {
      GC.mountSourceLine(page, document.getElementById('src-' + page));
    });
  };
})();
