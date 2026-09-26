/* 이야기 · 퀴즈 */
window.GC = window.GC || {};

(function () {
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  var cur = null;

  function open(i, quiet) {
    var st = GC.stories[i];
    if (!st) return;
    cur = i;
    var out = document.getElementById('storyDetail');
    out.innerHTML =
      '<div class="sd-head" style="--ec:' + GC.eraColor(st.era) + '">' +
        '<p class="sd-kick">' + esc(st.kicker) + '</p>' +
        '<h3 class="sd-key">' + esc(st.key) + '</h3>' +
        '<p class="sd-title">' + esc(st.title) + '</p>' +
        '<p class="sd-lead">' + esc(st.lead) + '</p>' +
      '</div>' +
      '<div class="sd-body">' +
        st.body.map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('') +
        '<p class="story-punch">' + esc(st.punch) + '</p>' +
      '</div>' +
      '<div class="story-go"><h5>가 볼 곳</h5><ul>' +
        (st.places || []).map(function (pl, j) {
          return '<li><button type="button" class="place" data-j="' + j + '">' +
            '<span class="place-n">' + esc(pl.n) + '</span>' +
            '<span class="place-w">' + esc(pl.w) + '</span>' +
            '<span class="place-go">지도에서 보기 →</span></button></li>';
        }).join('') + '</ul></div>';

    Array.prototype.forEach.call(out.querySelectorAll('.place'), function (b2) {
      b2.addEventListener('click', function () {
        var pl = st.places[+b2.getAttribute('data-j')];
        var f = GC.findProvince(pl.at[0], pl.at[1]);
        GC.focusOnMap({
          name: pl.n, lng: pl.at[0], lat: pl.at[1], provId: f.p.id,
          sub: st.title, note: pl.w
        });
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('.st-card'), function (c) {
      c.classList.toggle('is-sel', +c.getAttribute('data-i') === i);
    });
    if (!quiet) out.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  GC.initStories = function () {
    var host = document.getElementById('storyList');
    host.innerHTML = GC.stories.map(function (st, i) {
      return '<button type="button" class="st-card" data-i="' + i + '" ' +
        'style="--ec:' + GC.eraColor(st.era) + '">' +
        '<span class="st-kick">' + esc(st.kicker) + '</span>' +
        '<span class="st-key">' + esc(st.key) + '</span>' +
        '<span class="st-sub">' + esc(st.keySub) + '</span>' +
        '<span class="st-go">읽기 →</span>' +
        '</button>';
    }).join('');
    Array.prototype.forEach.call(host.querySelectorAll('.st-card'), function (c) {
      c.addEventListener('click', function () { open(+c.getAttribute('data-i')); });
    });
    open(0, true);
  };

  GC.openStory = function (i) { open(i); };
})();
