/* 부팅 */
window.GC = window.GC || {};

(function () {
  function boot() {
    GC.initFootprint();
    GC.initRouter();

    var t = document.getElementById('faultToggle');
    var note = document.getElementById('faultNote');
    t.addEventListener('change', function () {
      GC.toggleLayer('lyr-fault', t.checked);
      note.hidden = !t.checked;
    });
    var st = document.getElementById('siteToggle');
    st.addEventListener('change', function () { GC.toggleLayer('lyr-site', st.checked); });

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
