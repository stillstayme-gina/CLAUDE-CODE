/* 지질 트레일 — 고도 프로파일 + 지질 단면도 */
window.GC = window.GC || {};

(function () {
  var SVGNS = 'http://www.w3.org/2000/svg';
  var esc = function (s) { return GC.esc(s); };
  var M = { l: 46, r: 14, t: 14, b: 34 };
  var W = 720, H = 300;
  var cur = null, mode = 'chart';

  function el(tag, a) {
    var n = document.createElementNS(SVGNS, tag);
    for (var k in a) n.setAttribute(k, a[k]);
    return n;
  }
  function byId(id) { return GC.trails.filter(function (t) { return t.id === id; })[0]; }

  /* 같은 시대의 두 암체는 색상 대신 명도 단계로 구분합니다 */
  function unitFill(u) {
    return GC.provFill({ era: u.era, shade: u.shade || 0 });
  }
  /* 거리 x 에서의 고도 (선형 보간) */
  function elevAt(t, x) {
    var p = t.profile;
    for (var i = 1; i < p.length; i++) {
      if (x <= p[i][0]) {
        var r = (x - p[i - 1][0]) / (p[i][0] - p[i - 1][0] || 1);
        return p[i - 1][1] + (p[i][1] - p[i - 1][1]) * r;
      }
    }
    return p[p.length - 1][1];
  }
  function baseAt(u, x) {
    if (typeof u.base === 'number') return u.base;
    for (var i = 1; i < u.base.length; i++) {
      if (x <= u.base[i][0]) {
        var r = (x - u.base[i - 1][0]) / (u.base[i][0] - u.base[i - 1][0] || 1);
        return u.base[i - 1][1] + (u.base[i][1] - u.base[i - 1][1]) * r;
      }
    }
    return u.base[u.base.length - 1][1];
  }
  /* 지표에서 밟게 되는 암체 */
  function surfaceUnit(t, x) {
    var e = elevAt(t, x);
    for (var i = 0; i < t.units.length; i++) if (baseAt(t.units[i], x) < e) return t.units[i];
    return t.units[t.units.length - 1];
  }

  function draw(t) {
    var host = document.getElementById('trChart');
    host.innerHTML = '';

    var elevs = t.profile.map(function (p) { return p[1]; });
    var top = Math.max.apply(null, elevs);
    var lowSurface = Math.min.apply(null, elevs);
    /* 아래로 얼마나 보여줄지 — 핵심은 경계선이지 기반암의 부피가 아닙니다 */
    var bases = t.units.map(function (u) { return typeof u.base === 'number' ? u.base : Math.min.apply(null, u.base.map(function (b) { return b[1]; })); })
                       .filter(function (v) { return v > -900; });
    var deepest = Math.min.apply(null, [lowSurface].concat(bases));
    var floor = deepest - (top - deepest) * 0.18;
    var yMax = top + (top - floor) * 0.1;

    var X = function (km) { return M.l + (km / t.distKm) * (W - M.l - M.r); };
    var Y = function (m) { return M.t + (1 - (m - floor) / (yMax - floor)) * (H - M.t - M.b); };

    var svg = el('svg', {
      viewBox: '0 0 ' + W + ' ' + H, class: 'tr-svg',
      role: 'img',
      'aria-label': t.name + ' 고도 프로파일과 지질 단면. ' +
        t.units.map(function (u) { return u.rock + ' ' + u.age; }).join(', ')
    });

    /* 눈금 — 뒤로 물러나게 */
    var g = el('g', { class: 'ax' });
    var step = (yMax - floor) > 1400 ? 400 : (yMax - floor) > 600 ? 200 : 50;
    for (var m = Math.ceil(floor / step) * step; m <= yMax; m += step) {
      g.appendChild(el('line', { x1: M.l, x2: W - M.r, y1: Y(m), y2: Y(m), class: 'grid' }));
      var tx = el('text', { x: M.l - 8, y: Y(m) + 4, class: 'ax-y' });
      tx.textContent = m;
      g.appendChild(tx);
    }
    var kstep = t.distKm > 4.5 ? 1 : 0.5;
    for (var k = 0; k <= t.distKm + 0.001; k += kstep) {
      var kx = el('text', { x: X(k), y: H - M.b + 20, class: 'ax-x' });
      kx.textContent = (Math.round(k * 10) / 10) + 'km';
      g.appendChild(kx);
    }
    var yl = el('text', { x: M.l - 8, y: M.t - 2, class: 'ax-unit' });
    yl.textContent = '고도 m';
    g.appendChild(yl);
    svg.appendChild(g);

    /* 단면 — 위 암체부터 차례로, 지표선 아래를 채웁니다 */
    var N = 160;
    var gu = el('g', { class: 'units' });
    t.units.forEach(function (u, ui) {
      var upper = [], lower = [];
      for (var i = 0; i <= N; i++) {
        var x = t.distKm * i / N, e = elevAt(t, x);
        var hiB = ui === 0 ? e : Math.min(e, baseAt(t.units[ui - 1], x));
        var loB = Math.min(e, baseAt(u, x) < -900 ? floor : baseAt(u, x));
        if (loB > hiB) loB = hiB;
        upper.push([X(x), Y(hiB)]);
        lower.push([X(x), Y(Math.max(loB, floor))]);
      }
      var d = 'M' + upper.map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join('L') +
              'L' + lower.reverse().map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join('L') + 'Z';
      var path = el('path', { d: d, fill: unitFill(u), class: 'unit', 'data-u': ui });
      var ti = el('title'); ti.textContent = u.rock + ' · ' + u.age;
      path.appendChild(ti);
      gu.appendChild(path);

      /* 경계선 — 표면색 2px 틈으로 두 암체를 떼어 놓습니다 */
      if (ui > 0) {
        var cd = 'M' + upper.map(function (p, i2) {
          return p[0].toFixed(1) + ' ' + p[1].toFixed(1) + (i2 ? '' : '');
        }).join('L');
        gu.appendChild(el('path', { d: cd, class: 'contact' }));
      }
    });
    svg.appendChild(gu);

    /* 암체 직접 라벨 — 띠가 충분히 두꺼운 자리에 */
    var gl = el('g', { class: 'ulbl' });
    t.units.forEach(function (u, ui) {
      var best = null;
      for (var i = 2; i < N - 2; i++) {
        var x = t.distKm * i / N, e = elevAt(t, x);
        var hi = ui === 0 ? e : Math.min(e, baseAt(t.units[ui - 1], x));
        var lo = Math.min(e, baseAt(u, x) < -900 ? floor : baseAt(u, x));
        var h = Y(Math.max(lo, floor)) - Y(hi);
        /* 띠가 균일하면 가운데에 놓이도록 중앙 가중치를 줍니다 */
        var score = h * (1 - 0.4 * Math.abs(x - t.distKm / 2) / (t.distKm / 2));
        if (h > 26 && (!best || score > best.s)) best = { x: x, s: score, mid: (Y(hi) + Y(Math.max(lo, floor))) / 2 };
      }
      if (!best) return;
      var tx = el('text', { x: X(best.x), y: best.mid + 4, class: 'u-lbl' });
      tx.textContent = u.rock.replace(/\s*\(.*\)/, '');
      gl.appendChild(tx);
    });
    svg.appendChild(gl);

    /* 지표선 */
    var line = 'M' + t.profile.map(function (p) { return X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1); }).join('L');
    svg.appendChild(el('path', { d: line, class: 'terrain' }));

    /* 지점 */
    var gp = el('g', { class: 'wp' });
    t.points.forEach(function (p, i) {
      var gx = el('g', { class: 'wp-i', 'data-p': i, tabindex: '0', role: 'button' });
      gx.appendChild(el('circle', { cx: X(p.at), cy: Y(elevAt(t, p.at)), r: 5, class: 'wp-dot' }));
      var n = el('text', { x: X(p.at), y: Y(elevAt(t, p.at)) - 12, class: 'wp-n' });
      n.textContent = p.name;
      gx.appendChild(n);
      var ti = el('title'); ti.textContent = p.name + ' — ' + p.what;
      gx.appendChild(ti);
      gp.appendChild(gx);
    });
    svg.appendChild(gp);

    /* 십자선 + 툴팁 */
    var cross = el('g', { class: 'cross' });
    cross.setAttribute('hidden', '');
    cross.appendChild(el('line', { y1: M.t, y2: H - M.b, class: 'cross-l' }));
    cross.appendChild(el('circle', { r: 4, class: 'cross-d' }));
    svg.appendChild(cross);
    svg.appendChild(el('rect', { x: M.l, y: M.t, width: W - M.l - M.r, height: H - M.t - M.b, class: 'hit' }));

    host.appendChild(svg);

    var tip = document.getElementById('trTip');
    var hit = svg.querySelector('.hit');
    function move(ev) {
      var r = svg.getBoundingClientRect();
      var px = (ev.clientX - r.left) / r.width * W;
      var km = Math.max(0, Math.min(t.distKm, (px - M.l) / (W - M.l - M.r) * t.distKm));
      var e = elevAt(t, km), u = surfaceUnit(t, km);
      cross.removeAttribute('hidden');
      cross.querySelector('.cross-l').setAttribute('x1', X(km));
      cross.querySelector('.cross-l').setAttribute('x2', X(km));
      cross.querySelector('.cross-d').setAttribute('cx', X(km));
      cross.querySelector('.cross-d').setAttribute('cy', Y(e));
      tip.innerHTML = '<b>' + km.toFixed(1) + 'km · ' + Math.round(e) + 'm</b>' +
        '<span class="tip-r"><i style="background:' + unitFill(u) + '"></i>' + esc(u.rock) + '</span>' +
        '<span class="tip-a">' + esc(u.age) + '</span>';
      tip.hidden = false;
      var left = (X(km) / W) * r.width;
      tip.style.left = Math.max(4, Math.min(r.width - 170, left - 80)) + 'px';
    }
    hit.addEventListener('mousemove', move);
    hit.addEventListener('touchmove', function (ev) { move(ev.touches[0]); ev.preventDefault(); }, { passive: false });
    hit.addEventListener('mouseleave', function () {
      cross.setAttribute('hidden', ''); tip.hidden = true;
    });
    svg.querySelectorAll('.wp-i').forEach(function (n) {
      n.addEventListener('click', function () {
        var li = document.querySelector('#trPoints li[data-p="' + n.getAttribute('data-p') + '"]');
        if (li) { li.classList.add('is-hl'); li.scrollIntoView({ behavior: 'smooth', block: 'center' }); 
                  setTimeout(function () { li.classList.remove('is-hl'); }, 1600); }
      });
    });
  }

  function table(t) {
    return '<table class="tr-table"><caption>' + esc(t.name) + ' — 구간별 암석</caption>' +
      '<thead><tr><th>구간</th><th>암석</th><th>나이</th></tr></thead><tbody>' +
      t.units.map(function (u, i) {
        var prev = i === 0 ? '지표' : (typeof t.units[i - 1].base === 'number' ? t.units[i - 1].base + 'm' : '경계');
        var b = u.base < -900 ? '그 아래 전부' : (typeof u.base === 'number' ? u.base + 'm 까지' : '경계까지');
        return '<tr><td>' + prev + ' ~ ' + b + '</td><td><i class="sw" style="background:' + unitFill(u) + '"></i>' +
          esc(u.rock) + '</td><td>' + esc(u.age) + '</td></tr>';
      }).join('') + '</tbody></table>';
  }

  function open(id, quiet) {
    var t = byId(id);
    if (!t) return;
    cur = id;
    document.getElementById('trHead').innerHTML =
      '<p class="tr-where">' + esc(t.where) + '</p>' +
      '<h3 class="tr-name">' + esc(t.name) + '</h3>' +
      '<p class="tr-lead">' + esc(t.lead) + '</p>' +
      '<dl class="tr-stats">' +
        '<div><dt>거리</dt><dd>' + t.distKm + '<span>km</span></dd></div>' +
        '<div><dt>누적 상승</dt><dd>' + t.gainM + '<span>m</span></dd></div>' +
        '<div><dt>예상 시간</dt><dd>' + Math.floor(t.timeMin / 60) + '<span>시간</span>' +
          (t.timeMin % 60 ? ' ' + (t.timeMin % 60) + '<span>분</span>' : '') + '</dd></div>' +
        '<div><dt>난이도</dt><dd class="tr-lv">' + t.level + '</dd></div>' +
      '</dl>';

    document.getElementById('trHero').innerHTML =
      '<p class="hero-n">' + t.heroNum + '<span>' + t.heroUnit + '</span></p>' +
      '<p class="hero-l">' + esc(t.heroLabel) + '</p>';

    document.getElementById('trLegend').innerHTML = t.units.length > 1
      ? t.units.map(function (u) {
          return '<span class="tr-lg"><i style="background:' + unitFill(u) + '"></i>' +
            esc(u.rock) + '<em>' + esc(u.age) + '</em></span>';
        }).join('')
      : '<span class="tr-lg tr-lg--one"><i style="background:' + unitFill(t.units[0]) + '"></i>' +
        esc(t.units[0].rock) + '<em>' + esc(t.units[0].age) + '</em></span>';

    document.getElementById('trUnits').innerHTML = t.units.map(function (u) {
      return '<li><h5><i style="background:' + unitFill(u) + '"></i>' + esc(u.rock) +
        '<span>' + esc(u.age) + '</span></h5><p>' + esc(u.note) + '</p></li>';
    }).join('');

    document.getElementById('trPoints').innerHTML = t.points.map(function (p, i) {
      return '<li data-p="' + i + '"><span class="pt-km">' + p.at.toFixed(1) + 'km</span>' +
        '<div><h5>' + esc(p.name) + '</h5><p>' + esc(p.what) + '</p></div></li>';
    }).join('');

    document.getElementById('trPunch').textContent = t.punch;
    document.getElementById('trAccess').textContent = t.access;
    var lk = document.getElementById('trLink');
    lk.textContent = (t.link.page === 'mountains' ? '이 산의 탄생 이야기' : '이 지질공원 명소 보기') + ' →';
    lk.onclick = function () { GC.go(t.link.page, t.link.id); };

    document.getElementById('trTableBox').innerHTML = table(t);
    Array.prototype.forEach.call(document.querySelectorAll('.tr-card'), function (b) {
      b.classList.toggle('is-sel', b.getAttribute('data-id') === id);
    });

    draw(t);
    if (!quiet) document.getElementById('trHead').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  GC.initTrails = function () {
    var grid = document.getElementById('trGrid');
    GC.trails.forEach(function (t) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'tr-card';
      b.setAttribute('data-id', t.id);
      b.style.setProperty('--ec', unitFill(t.units[0]));
      b.innerHTML =
        '<span class="trc-w">' + esc(t.where.split(' · ')[0]) + '</span>' +
        '<span class="trc-n">' + esc(t.name) + '</span>' +
        '<span class="trc-h">' + t.heroNum + t.heroUnit + '</span>' +
        '<span class="trc-m">' + t.distKm + 'km · ' + t.level + '</span>';
      b.addEventListener('click', function () { open(t.id); });
      grid.appendChild(b);
    });
    document.getElementById('trNote').textContent = GC.trailNote;

    var tog = document.getElementById('trToggle');
    tog.addEventListener('click', function () {
      mode = mode === 'chart' ? 'table' : 'chart';
      document.getElementById('trChartBox').hidden = mode !== 'chart';
      document.getElementById('trTableBox').hidden = mode !== 'table';
      tog.textContent = mode === 'chart' ? '표로 보기' : '단면도로 보기';
    });

    open(GC.trails[0].id, true);
    window.addEventListener('resize', function () { if (cur) draw(byId(cur)); });
  };

  GC.openTrail = function (id) { open(id); };
})();
