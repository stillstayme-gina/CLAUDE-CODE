/* 이야기 · 퀴즈 */
window.GC = window.GC || {};

(function () {
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  GC.initStories = function () {
    var host = document.getElementById('storyList');
    GC.stories.forEach(function (s, i) {
      var art = document.createElement('article');
      art.className = 'story';
      art.style.setProperty('--ec', GC.eraColor(s.era));
      art.innerHTML =
        '<button type="button" class="story-hd" aria-expanded="' + (i === 0) + '">' +
          '<span class="story-kick">' + esc(s.kicker) + '</span>' +
          '<span class="story-t">' + esc(s.title) + '</span>' +
          '<span class="story-lead">' + esc(s.lead) + '</span>' +
          '<span class="story-more" aria-hidden="true"></span>' +
        '</button>' +
        '<div class="story-bd"' + (i === 0 ? '' : ' hidden') + '>' +
          s.body.map(function (b) { return '<p>' + esc(b) + '</p>'; }).join('') +
          '<p class="story-punch">' + esc(s.punch) + '</p>' +
          '<div class="story-go"><h5>가 볼 곳</h5><ul>' +
            (s.places || []).map(function (pl, j) {
              return '<li><button type="button" class="place" data-i="' + i + '" data-j="' + j + '">' +
                '<span class="place-n">' + esc(pl.n) + '</span>' +
                '<span class="place-w">' + esc(pl.w) + '</span>' +
                '<span class="place-go">지도에서 보기 →</span></button></li>';
            }).join('') + '</ul></div>' +
        '</div>';
      Array.prototype.forEach.call(art.querySelectorAll('.place'), function (b) {
        b.addEventListener('click', function () {
          var st = GC.stories[+b.getAttribute('data-i')];
          var pl = st.places[+b.getAttribute('data-j')];
          var f = GC.findProvince(pl.at[0], pl.at[1]);
          GC.focusOnMap({
            name: pl.n, lng: pl.at[0], lat: pl.at[1], provId: f.p.id,
            sub: st.title, note: pl.w
          });
        });
      });
      var btn = art.querySelector('.story-hd'), bd = art.querySelector('.story-bd');
      btn.addEventListener('click', function () {
        var open = bd.hidden;
        bd.hidden = !open;
        btn.setAttribute('aria-expanded', String(open));
      });
      host.appendChild(art);
    });
  };
})();
