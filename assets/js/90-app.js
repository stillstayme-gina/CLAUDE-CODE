/* 부팅 · 지층 내비게이션 */
window.GC = window.GC || {};

(function () {
  function initNav() {
    var links = Array.prototype.slice.call(document.querySelectorAll('.strat-link'));
    var secs = links.map(function (a) {
      return document.getElementById(a.getAttribute('href').slice(1));
    });

    links.forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var t = document.getElementById(a.getAttribute('href').slice(1));
        if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var i = secs.indexOf(en.target);
        links.forEach(function (a, j) { a.classList.toggle('is-here', i === j); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    secs.forEach(function (s) { if (s) io.observe(s); });
  }

  function initFaultToggle() {
    var t = document.getElementById('faultToggle');
    var note = document.getElementById('faultNote');
    t.addEventListener('change', function () {
      GC.toggleFaults(t.checked);
      note.hidden = !t.checked;
    });
  }

  function boot() {
    GC.buildMap();
    GC.initFootprint();
    GC.initMountains();
    GC.initStories();
    GC.initQuiz();
    initFaultToggle();
    initNav();

    var qn = document.getElementById('quakeList');
    GC.quakes.forEach(function (q) {
      var li = document.createElement('li');
      li.innerHTML = '<span class="qk-mag">M ' + q.mag.toFixed(1) + '</span>' +
        '<span class="qk-nm">' + q.name + '</span>' +
        '<span class="qk-no">' + q.note + '</span>';
      qn.appendChild(li);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
