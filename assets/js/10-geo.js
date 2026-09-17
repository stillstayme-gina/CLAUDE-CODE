/* 투영 · 점-다각형 판정 · 지질구 조회 */
window.GC = window.GC || {};

(function () {
  var K = Math.cos(36 * Math.PI / 180);   // 위도 36도에서의 경도 축척 보정
  var S = 100;                            // 1도 = 100 단위
  var ORIGIN_LNG = 126.02, ORIGIN_LAT = 38.60;

  GC.project = function (lng, lat) {
    return [(lng - ORIGIN_LNG) * K * S, (ORIGIN_LAT - lat) * S];
  };

  GC.pathOf = function (poly) {
    var d = '';
    for (var i = 0; i < poly.length; i++) {
      var p = GC.project(poly[i][0], poly[i][1]);
      d += (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1);
    }
    return d + 'Z';
  };

  GC.lineOf = function (line) {
    return line.map(function (c) {
      var p = GC.project(c[0], c[1]);
      return p[0].toFixed(1) + ',' + p[1].toFixed(1);
    }).join(' ');
  };

  /* 광선 교차법 */
  GC.pointInPoly = function (lng, lat, poly) {
    var inside = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if ((yi > lat) !== (yj > lat) &&
          lng < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };

  GC.centroid = function (poly) {
    var x = 0, y = 0;
    poly.forEach(function (c) { x += c[0]; y += c[1]; });
    return [x / poly.length, y / poly.length];
  };

  GC.byId = function (id) {
    return GC.provinces.filter(function (p) { return p.id === id; })[0];
  };

  /* 좌표 → 지질구. 우선순위(hit)가 낮은 것부터 검사하고,
     어디에도 안 들어가면 가장 가까운 지질구로 보정합니다. */
  GC.findProvince = function (lng, lat) {
    var sorted = GC.provinces.slice().sort(function (a, b) { return a.hit - b.hit; });
    for (var i = 0; i < sorted.length; i++) {
      if (GC.pointInPoly(lng, lat, sorted[i].poly)) return { p: sorted[i], exact: true };
    }
    var best = null, bestD = Infinity;
    GC.provinces.forEach(function (p) {
      if (p.inset || p.noFallback) return;
      var c = GC.centroid(p.poly);
      var dx = (c[0] - lng) * K, dy = c[1] - lat;
      var d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = p; }
    });
    return { p: best, exact: false };
  };

  /* 시대색은 CSS 토큰이 원본입니다 — 라이트/다크가 각각 따로 검증돼 있습니다 */
  GC.eraColor = function (key) {
    if (typeof getComputedStyle === 'function') {
      var v = getComputedStyle(document.documentElement).getPropertyValue('--e-' + key).trim();
      if (v) return v;
    }
    return (GC.eras[key] || {}).color || '#888';
  };
})();

/* 같은 시대의 인접 지질구를 구분하기 위한 명도 조정 */
(function () {
  function mix(hex, t) {
    var n = parseInt(hex.slice(1), 16);
    var r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    var to = t > 0 ? 255 : 0, a = Math.abs(t);
    function c(v) { return Math.round(v + (to - v) * a); }
    return '#' + ((1 << 24) + (c(r) << 16) + (c(g) << 8) + c(b)).toString(16).slice(1);
  }
  GC.provFill = function (p) {
    var base = GC.eraColor(p.era);
    if (!p.shade) return base;
    return mix(base, p.shade > 0 ? 0.28 : -0.26);
  };
})();

/* 지질구 폴리곤은 해안선까지 정확히 닿지 않습니다. 중심에서 조금 부풀린
   사본을 밑에 한 겹 깔면 해안 가장자리의 빈 땅이 메워지고, 그 위에 원본을
   그리면 내부 경계는 원래대로 유지됩니다. (바다로 넘친 부분은 육지 클립이 잘라냅니다) */
GC.expandPoly = function (poly, k) {
  var c = GC.centroid(poly);
  return poly.map(function (p) {
    return [c[0] + (p[0] - c[0]) * (1 + k), c[1] + (p[1] - c[1]) * (1 + k)];
  });
};
