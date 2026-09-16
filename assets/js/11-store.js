/* 이 기기에만 저장되는 기록 (체크인 도감). 저장이 막혀 있어도 페이지는 정상 동작합니다. */
window.GC = window.GC || {};

GC.store = {
  get: function (k, dflt) {
    try {
      var v = localStorage.getItem('gc.' + k);
      return v ? JSON.parse(v) : dflt;
    } catch (e) { return dflt; }
  },
  set: function (k, v) {
    try { localStorage.setItem('gc.' + k, JSON.stringify(v)); return true; }
    catch (e) { return false; }
  }
};

/* 두 좌표 사이 거리(km) */
GC.distKm = function (lng1, lat1, lng2, lat2) {
  var R = 6371, rad = Math.PI / 180;
  var dLat = (lat2 - lat1) * rad, dLng = (lng2 - lng1) * rad;
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
};

GC.esc = function (s) {
  return String(s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
  });
};
