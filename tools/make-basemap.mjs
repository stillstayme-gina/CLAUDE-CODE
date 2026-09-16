/* 실제 행정경계(통계청 2013, southkorea-maps) → 지도 바탕 + 시군구 실좌표 */
import fs from 'node:fs';

const prov = JSON.parse(fs.readFileSync('data/skorea-provinces.src.json', 'utf8'));
const muni = JSON.parse(fs.readFileSync('data/skorea-municipalities.src.json', 'utf8'));

/* Douglas–Peucker */
function simplify(ring, tol) {
  if (ring.length < 5) return ring;
  const keep = new Uint8Array(ring.length);
  keep[0] = keep[ring.length - 1] = 1;
  const stack = [[0, ring.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let far = -1, dmax = 0;
    const [x1, y1] = ring[a], [x2, y2] = ring[b];
    const dx = x2 - x1, dy = y2 - y1, den = dx * dx + dy * dy;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = ring[i];
      let d;
      if (den === 0) d = (px - x1) ** 2 + (py - y1) ** 2;
      else {
        let t = ((px - x1) * dx + (py - y1) * dy) / den;
        t = Math.max(0, Math.min(1, t));
        d = (px - (x1 + t * dx)) ** 2 + (py - (y1 + t * dy)) ** 2;
      }
      if (d > dmax) { dmax = d; far = i; }
    }
    if (dmax > tol * tol && far > 0) { keep[far] = 1; stack.push([a, far], [far, b]); }
  }
  return ring.filter((_, i) => keep[i]);
}

const area = r => Math.abs(r.reduce((s, p, i) => {
  const q = r[(i + 1) % r.length];
  return s + (p[0] * q[1] - q[0] * p[1]);
}, 0) / 2);

const rings = f => (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates)
  .map(poly => poly[0]);

const SHORT = {
  '서울특별시': '서울', '부산광역시': '부산', '대구광역시': '대구', '인천광역시': '인천',
  '광주광역시': '광주', '대전광역시': '대전', '울산광역시': '울산', '세종특별자치시': '세종',
  '경기도': '경기', '강원도': '강원', '충청북도': '충북', '충청남도': '충남',
  '전라북도': '전북', '전라남도': '전남', '경상북도': '경북', '경상남도': '경남',
  '제주특별자치도': '제주'
};

/* ── 1. 시도 경계 + 육지 윤곽 (본토 + 제주. 울릉·독도는 삽도로 따로) ── */
const MIN_AREA = 0.00035;          // 약 3.5 km² 미만 섬은 생략
const sido = [];
let kept = 0, dropped = 0;
for (const f of prov.features) {
  const name = SHORT[f.properties.name] || f.properties.name;
  const rs = rings(f)
    .filter(r => {
      const lng = r.reduce((s, p) => s + p[0], 0) / r.length;
      if (lng > 130) { dropped++; return false; }   // 울릉·독도
      if (area(r) < MIN_AREA) { dropped++; return false; }
      return true;
    })
    .map(r => simplify(r, 0.0045).map(p => [+p[0].toFixed(4), +p[1].toFixed(4)]));
  rs.forEach(r => { kept += r.length; });
  if (rs.length) sido.push({ name, code: f.properties.code, rings: rs });
}

/* ── 2. 시군구 실제 중심좌표 ── */
const codeToSido = {};
prov.features.forEach(f => { codeToSido[f.properties.code] = SHORT[f.properties.name] || f.properties.name; });

function centroid(r) {
  let a = 0, x = 0, y = 0;
  for (let i = 0; i < r.length; i++) {
    const [x1, y1] = r[i], [x2, y2] = r[(i + 1) % r.length];
    const c = x1 * y2 - x2 * y1;
    a += c; x += (x1 + x2) * c; y += (y1 + y2) * c;
  }
  a *= 0.5;
  if (!a) return r[0];
  return [x / (6 * a), y / (6 * a)];
}
function inRing(pt, r) {
  let inside = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [xi, yi] = r[i], [xj, yj] = r[j];
    if ((yi > pt[1]) !== (yj > pt[1]) &&
        pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/* 시군구 폴리곤 — 지도의 밑판. 지질구 폴리곤이 해안선까지 닿지 않는
   가장자리와 섬을 실제 행정경계로 메웁니다. */
const muniShapes = [];
const regions = [];
for (const f of muni.features) {
  const sd = codeToSido[String(f.properties.code).slice(0, 2)];
  if (!sd) continue;
  const rs = rings(f).sort((a, b) => area(b) - area(a));
  const big = rs[0];
  let c = centroid(big);
  if (!inRing(c, big)) {                       // 오목한 모양이면 내부 점으로 보정
    c = big.reduce((best, p) => inRing(p, big) ? p : best, big[Math.floor(big.length / 2)]);
  }
  regions.push([sd + ' ' + f.properties.name, +c[0].toFixed(4), +c[1].toFixed(4)]);

  const shape = rs
    .filter(r => {
      const lng = r.reduce((s2, q) => s2 + q[0], 0) / r.length;
      return lng < 130 && area(r) >= MIN_AREA;
    })
    .map(r => {
      const sr = simplify(r, 0.014);
      const cx = sr.reduce((s2, q) => s2 + q[0], 0) / sr.length;
      const cy = sr.reduce((s2, q) => s2 + q[1], 0) / sr.length;
      /* 3% 부풀려 이웃과 겹치게 — 클립이 바다 쪽 넘침을 잘라냅니다 */
      return sr.map(q => [+(cx + (q[0] - cx) * 1.05).toFixed(3), +(cy + (q[1] - cy) * 1.05).toFixed(3)]);
    });
  if (shape.length) muniShapes.push({ c: [+c[0].toFixed(4), +c[1].toFixed(4)], r: shape });
}
regions.sort((a, b) => a[0].localeCompare(b[0], 'ko'));

const out = `/* 실제 행정경계 바탕지도 — 통계청 2013 시도/시군구 경계를 단순화한 것입니다.
   출처: github.com/southkorea/southkorea-maps (KOSTAT 2013)
   본토와 제주만 담고, 울릉도·독도는 지도의 동해 삽도에서 따로 그립니다. */
window.GC = window.GC || {};

GC.base = {
  sido: ${JSON.stringify(sido)},
  muni: ${JSON.stringify(muniShapes)}
};

/* 시·군·구 ${regions.length}곳 — 실제 경계에서 계산한 중심 좌표 */
GC.regions = ${JSON.stringify(regions).replace(/\],\[/g, '],\n  [').replace(/^\[/, '[\n  ').replace(/\]$/, '\n]')};
`;
fs.writeFileSync('assets/js/07-data-basemap.js', out);
fs.rmSync('assets/js/03-data-regions.js', { force: true });

console.log('시도', sido.length, '| 육지 링', sido.reduce((s, d) => s + d.rings.length, 0),
            '| 점', kept, '(생략된 섬/원거리 링', dropped, ')');
console.log('밑판 시군구', muniShapes.length, '| 점', muniShapes.reduce((s2,m)=>s2+m.r.reduce((t,r)=>t+r.length,0),0));
console.log('시군구', regions.length, '| 파일', (fs.statSync('assets/js/07-data-basemap.js').size / 1024).toFixed(1) + 'KB');
