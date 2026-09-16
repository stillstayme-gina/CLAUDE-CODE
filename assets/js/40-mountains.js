/* 산의 탄생 */
window.GC = window.GC || {};

(function () {
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function byId(id) { return GC.mountains.filter(function (m) { return m.id === id; })[0]; }

  GC.initMountains = function () {
    var grid = document.getElementById('mtGrid');
    GC.mountains.forEach(function (m) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'mt-card';
      b.setAttribute('data-id', m.id);
      b.style.setProperty('--ec', GC.eraColor(m.era));
      b.innerHTML =
        '<span class="mt-h">' + m.height.toLocaleString() + '<i>m</i></span>' +
        '<span class="mt-n">' + esc(m.name) + '</span>' +
        '<span class="mt-q">' + esc(m.ask) + '</span>';
      b.addEventListener('click', function () { GC.openMountain(m.id); });
      grid.appendChild(b);
    });
    GC.openMountain(GC.mountains[0].id, true);
  };

  GC.openMountain = function (id, quiet) {
    var m = byId(id);
    if (!m) return;
    var c = byId(m.compare);
    var p = GC.byId(m.province);
    var out = document.getElementById('mtDetail');

    out.innerHTML = '' +
      '<div class="mt-hd" style="--ec:' + GC.eraColor(m.era) + '">' +
        '<p class="mt-ask">' + esc(m.ask) + '</p>' +
        '<h3 class="mt-title">' + esc(m.name) + ' <span>' + m.height.toLocaleString() + 'm</span></h3>' +
        '<p class="mt-one">' + esc(m.oneline) + '</p>' +
        '<p class="mt-prov">' + esc(p.name) + ' · ' + esc(p.ageText) + '</p>' +
      '</div>' +
      '<ol class="seq">' + m.steps.map(function (s, i) {
        return '<li class="seq-i"><span class="seq-n">' + (i + 1) + '</span>' +
               '<div><h5>' + esc(s.t) + '</h5><p>' + esc(s.d) + '</p></div></li>';
      }).join('') + '</ol>' +
      '<div class="mt-find"><h5>등산 중에 찾아볼 것</h5><p>' + esc(m.find) + '</p></div>' +
      (c ? '<button type="button" class="cmp" data-id="' + c.id + '">' +
        '<span class="cmp-k">나란히 보기</span>' +
        '<span class="cmp-b"><b>' + esc(m.name) + '</b>' + esc(m.oneline) + '</span>' +
        '<span class="cmp-b"><b>' + esc(c.name) + '</b>' + esc(c.oneline) + '</span>' +
        '<span class="cmp-go">' + esc(c.name) + ' 보기 →</span></button>' : '');

    Array.prototype.forEach.call(document.querySelectorAll('.mt-card'), function (b) {
      b.classList.toggle('is-sel', b.getAttribute('data-id') === id);
    });
    var cmp = out.querySelector('.cmp');
    if (cmp) cmp.addEventListener('click', function () { GC.openMountain(cmp.getAttribute('data-id')); });

    if (!quiet) out.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };
})();
