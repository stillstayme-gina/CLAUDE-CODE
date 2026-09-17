/* 해시 라우터 — #/map, #/mountains/bukhansan 처럼 페이지 + 인자 */
window.GC = window.GC || {};

(function () {
  var PAGES = ['home', 'footprint', 'map', 'mountains', 'geoparks', 'trails', 'stories', 'rock', 'visits', 'quiz', 'sources', 'about'];
  var inited = {};
  var current = null;

  var LAZY = {
    map: function () { GC.buildMap(); },
    mountains: function () { GC.initPeaks(); GC.initMountains(); },
    geoparks: function () { GC.initGeoparks(); },
    trails: function () { GC.initTrails(); },
    stories: function () { GC.initStories(); },
    rock: function () { GC.initRockId(); },
    visits: function () { GC.initVisits(); },
    quiz: function () { GC.initQuiz(); }
  };

  function parse() {
    var h = (location.hash || '').replace(/^#\/?/, '');
    var bits = h.split('/').filter(Boolean);
    var page = bits[0] || 'home';
    if (PAGES.indexOf(page) < 0) page = 'home';
    return { page: page, arg: bits[1] || null };
  }

  function show(route) {
    PAGES.forEach(function (p) {
      var n = document.getElementById('page-' + p);
      if (n) n.hidden = p !== route.page;
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-nav]'), function (a) {
      a.classList.toggle('is-here', a.getAttribute('data-nav') === route.page);
    });

    if (!inited[route.page] && LAZY[route.page]) { LAZY[route.page](); inited[route.page] = true; }

    if (route.arg) {
      if (route.page === 'mountains') GC.openMountain(route.arg, true);
      if (route.page === 'geoparks') GC.openPark(route.arg);
      if (route.page === 'trails') GC.openTrail(route.arg);
      if (route.page === 'map') GC.selectProvince(route.arg);
    }
    if (route.page === 'map' && GC.applyMapFocus) {
      GC.applyMapFocus();
    }

    document.documentElement.setAttribute('data-page', route.page);
    if (current !== null) window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    current = route.page;
  }

  GC.go = function (page, arg) {
    location.hash = '#/' + page + (arg ? '/' + arg : '');
  };

  GC.initRouter = function () {
    window.addEventListener('hashchange', function () { show(parse()); });
    show(parse());
  };
})();
