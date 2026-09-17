/* 부팅 */
window.GC = window.GC || {};

(function () {
  function boot() {
    GC.initSources();
    GC.initFootprint();
    GC.initRouter();

    var t = document.getElementById('faultToggle');
    var note = document.getElementById('faultNote');
    t.addEventListener('change', function () {
      GC.toggleLayer('lyr-fault', t.checked);
      note.hidden = !t.checked;
    });
    [['siteToggle', 'lyr-site'], ['peakToggle', 'lyr-peak']].forEach(function (pair) {
      var box = document.getElementById(pair[0]);
      box.addEventListener('change', function () { GC.toggleLayer(pair[1], box.checked); });
    });

    var qn = document.getElementById('quakeList');
    GC.quakes.forEach(function (q) {
      var li = document.createElement('li');
      li.innerHTML = '<span class="qk-mag">M ' + q.mag.toFixed(1) + '</span>' +
        '<span class="qk-nm">' + q.name + '</span>' +
        '<span class="qk-no">' + q.note + '</span>';
      qn.appendChild(li);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
