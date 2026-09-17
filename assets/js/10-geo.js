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

/* 지질구 폴리곤은 꼭짓점이 적어 각져 보입니다. 그리기용으로만 곡선으로 부드럽게 만듭니다.
   (판정은 원래 폴리곤을 그대로 쓰므로 경계 근처에서 몇백 m 차이가 날 수 있습니다) */
GC.smoothPath = function (poly, tension) {
  var t = tension == null ? 0.85 : tension;
  var n = poly.length;
  if (n < 3) return GC.pathOf(poly);
  var P = poly.map(function (c) { return GC.project(c[0], c[1]); });
  var d = 'M' + P[0][0].toFixed(1) + ' ' + P[0][1].toFixed(1);
  for (var i = 0; i < n; i++) {
    var p0 = P[(i - 1 + n) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n];
    var c1 = [p1[0] + (p2[0] - p0[0]) / 6 * t, p1[1] + (p2[1] - p0[1]) / 6 * t];
    var c2 = [p2[0] - (p3[0] - p1[0]) / 6 * t, p2[1] - (p3[1] - p1[1]) / 6 * t];
    d += 'C' + c1[0].toFixed(1) + ' ' + c1[1].toFixed(1) + ',' +
               c2[0].toFixed(1) + ' ' + c2[1].toFixed(1) + ',' +
               p2[0].toFixed(1) + ' ' + p2[1].toFixed(1);
  }
  return d + 'Z';
};

/* 이 좌표가 실제 육지인가 (바탕지도 기준) */
GC.onLand = function (lng, lat) {
  if (!GC.base || !GC.base.sido) return true;
  for (var i = 0; i < GC.base.sido.length; i++) {
    var rs = GC.base.sido[i].rings;
    for (var j = 0; j < rs.length; j++) if (GC.pointInPoly(lng, lat, rs[j])) return true;
  }
  return false;
};

/* 라벨 자리 — 폴리곤 안이면서 실제 육지인 점들의 평균. 바다 쪽으로 넓게 그려진
   지질구도 이름이 땅 위에 놓입니다. 육지 비율은 라벨을 붙일지 판단하는 데 씁니다. */
var lblCache = {};
GC.labelPoint = function (poly, id) {
  if (id && lblCache[id]) return lblCache[id];
  var mnx = 1e9, mny = 1e9, mxx = -1e9, mxy = -1e9;
  poly.forEach(function (c) {
    mnx = Math.min(mnx, c[0]); mxx = Math.max(mxx, c[0]);
    mny = Math.min(mny, c[1]); mxy = Math.max(mxy, c[1]);
  });
  var N = 26, inside = 0, land = 0, sx = 0, sy = 0;
  for (var i = 0; i <= N; i++) {
    for (var j = 0; j <= N; j++) {
      var x = mnx + (mxx - mnx) * i / N, y = mny + (mxy - mny) * j / N;
      if (!GC.pointInPoly(x, y, poly)) continue;
      inside++;
      if (!GC.onLand(x, y)) continue;
      land++; sx += x; sy += y;
    }
  }
  var res = land
    ? { pt: [sx / land, sy / land], landRatio: land / inside }
    : { pt: GC.centroid(poly), landRatio: 0 };
  /* 평균점이 도형 밖(오목한 모양)이면 가장 가까운 육지 표본으로 */
  if (!GC.pointInPoly(res.pt[0], res.pt[1], poly)) res.pt = GC.centroid(poly);
  if (id) lblCache[id] = res;
  return res;
};

/* 대략적인 면적 (지도 단위) — 라벨을 붙일지 판단하는 데만 씁니다 */
GC.polyArea = function (poly) {
  var s = 0;
  for (var i = 0; i < poly.length; i++) {
    var p = GC.project(poly[i][0], poly[i][1]);
    var q = GC.project(poly[(i + 1) % poly.length][0], poly[(i + 1) % poly.length][1]);
    s += p[0] * q[1] - q[0] * p[1];
  }
  return Math.abs(s / 2);
};
