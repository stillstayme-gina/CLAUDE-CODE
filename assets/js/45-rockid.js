/* 이 돌 이름이 뭐예요 — 사진으로 묻기(기본) / 질문으로 좁히기(대안) */
window.GC = window.GC || {};

(function () {
  var esc = function (s) { return GC.esc(s); };
  var sampleFn = null, limits = null, trail = [], ctl = null, lastFile = null;

  var KEYS = Object.keys(GC.rocks);
  var NAMES = KEYS.map(function (k) { return GC.rocks[k].name; });

  var PROMPT =
    '당신은 한국의 야외 지질 답사를 돕습니다. 첨부한 사진은 등산객이 한국의 산이나 계곡에서 찍은 암석입니다.\n' +
    '사진만 보고 암석의 종류를 추정하세요. 한국에 흔한 다음 암석 중에서 고르는 것을 우선하되, ' +
    '해당하지 않으면 다른 암석 이름을 써도 됩니다.\n' +
    '후보 목록(key: 이름): ' + KEYS.map(function (k) { return k + ': ' + GC.rocks[k].name; }).join(', ') + '\n\n' +
    '규칙:\n' +
    '- 사진만으로는 확정할 수 없다는 점을 전제로, 가능성이 높은 순서로 최대 3개를 제시하세요.\n' +
    '- 각 후보마다 사진에서 실제로 보이는 근거를 한 문장으로 쓰세요(알갱이 크기, 줄무늬, 구멍, 색, 층리 등).\n' +
    '- 각 후보마다 현장에서 손으로 확인할 방법을 한 문장으로 쓰세요.\n' +
    '- 사진이 너무 흐리거나 암석이 보이지 않으면 candidates를 빈 배열로 두고 notEnough를 true로 하세요.\n' +
    '- 모든 문장은 한국어 존댓말로, 군더더기 없이 씁니다.\n\n' +
    '다음 JSON만 출력하세요:\n' +
    '{"notEnough": false, "scene": "사진에 보이는 것 한 문장", ' +
    '"candidates": [{"key": "granite 또는 목록에 없으면 null", "name": "암석 이름", ' +
    '"confidence": "높음|보통|낮음", "why": "사진에서 보이는 근거", "check": "현장 확인 방법"}]}';

  var ERR = {
    not_granted: 'Claude 사용을 허용해야 사진 판별을 쓸 수 있습니다. 아래 질문으로 찾기를 이용해 주세요.',
    sampling_disabled: '이 계정에서는 사진 판별을 쓸 수 없습니다. 아래 질문으로 찾기를 이용해 주세요.',
    images_unavailable: '이 환경에서는 사진을 보낼 수 없습니다. 아래 질문으로 찾기를 이용해 주세요.',
    image_rejected: '사진을 읽지 못했습니다. 다른 사진으로 다시 시도해 주세요.',
    rate_limited: '요청이 많습니다. 잠시 후 다시 시도해 주세요.',
    prompt_too_large: '사진이 너무 큽니다. 더 작은 사진으로 시도해 주세요.',
    invalid_json: '답을 읽지 못했습니다. 다시 시도해 주세요.',
    refused: '이 사진으로는 답할 수 없습니다. 암석이 잘 보이는 다른 사진을 올려주세요.',
    cancelled: ''
  };

  /* ── 사진 ── */
  function photoUI() {
    return '' +
      '<div class="rk-photo">' +
        '<label class="rk-drop" id="rkDrop">' +
          '<input type="file" id="rkFile" accept="image/*" capture="environment" hidden>' +
          '<span class="rk-drop-i" aria-hidden="true"></span>' +
          '<span class="rk-drop-t">사진 찍기 또는 고르기</span>' +
          '<span class="rk-drop-s">바위 표면이 화면을 가득 채우게, 밝은 곳에서 찍으면 정확해집니다.</span>' +
        '</label>' +
        '<div class="rk-prev" id="rkPrev" hidden></div>' +
        '<p class="rk-msg" id="rkMsg" role="status"></p>' +
        '<div class="rk-out" id="rkOut"></div>' +
      '</div>';
  }

  function renderResult(d) {
    var out = document.getElementById('rkOut');
    if (d.notEnough || !d.candidates || !d.candidates.length) {
      out.innerHTML = '<p class="rk-none">사진에서 암석을 알아보기 어렵습니다. ' +
        '바위 표면에 더 가까이, 밝은 곳에서 다시 찍어보세요.</p>';
      return;
    }
    out.innerHTML =
      (d.scene ? '<p class="rk-scene">' + esc(d.scene) + '</p>' : '') +
      d.candidates.slice(0, 3).map(function (c, i) {
        var known = c.key && GC.rocks[c.key] ? GC.rocks[c.key] : null;
        var col = known ? GC.eraColor(known.era) : 'var(--text-3)';
        return '<article class="rk-cand' + (i === 0 ? ' is-top' : '') + '" style="--ec:' + col + '">' +
          '<header>' +
            '<span class="rk-rank">' + (i === 0 ? '가장 가능성 높음' : '다음 후보') + '</span>' +
            '<h4>' + esc(c.name || '알 수 없음') + '</h4>' +
            '<span class="rk-conf rk-conf--' + (c.confidence === '높음' ? 'hi' : c.confidence === '낮음' ? 'lo' : 'mid') + '">' +
              '확신 ' + esc(c.confidence || '보통') + '</span>' +
          '</header>' +
          (c.why ? '<p class="rk-why2"><span>사진에서 보이는 것</span>' + esc(c.why) + '</p>' : '') +
          (c.check ? '<p class="rk-check"><span>현장에서 확인하기</span>' + esc(c.check) + '</p>' : '') +
          (known ? '<button type="button" class="linkish" data-rk="' + c.key + '">' +
            esc(known.name) + '은 어떻게 만들어지나 →</button>' : '') +
          '</article>';
      }).join('') +
      '<p class="rk-caveat">사진만으로 하는 추정입니다. 실제 동정에는 현미경과 화학 분석이 필요하고, ' +
      '자연에는 중간 성질의 암석이 훨씬 많습니다. 국립공원과 지질공원에서 돌을 채취하는 것은 금지되어 있습니다.</p>';

    Array.prototype.forEach.call(out.querySelectorAll('[data-rk]'), function (b) {
      b.addEventListener('click', function () { showRock(b.getAttribute('data-rk')); });
    });
  }

  function ask(file) {
    var msg = document.getElementById('rkMsg');
    var out = document.getElementById('rkOut');
    lastFile = file;

    var prev = document.getElementById('rkPrev');
    var url = URL.createObjectURL(file);
    prev.innerHTML = '<img src="' + url + '" alt="올린 암석 사진">' +
      '<button type="button" class="btn btn-ghost" id="rkRetry">다른 사진</button>';
    prev.hidden = false;
    document.getElementById('rkRetry').addEventListener('click', function () {
      document.getElementById('rkFile').value = '';
      document.getElementById('rkFile').click();
    });

    out.innerHTML = '';
    msg.textContent = '사진을 보는 중…';
    ctl = new AbortController();

    sampleFn.json(PROMPT, { images: file, signal: ctl.signal, modelTier: 'default' })
      .then(function (d) { msg.textContent = ''; renderResult(d); })
      .catch(function (e) {
        msg.textContent = ERR[e.code] || '판별하지 못했습니다. 다시 시도해 주세요.';
        if (e.code === 'not_granted' || e.code === 'sampling_disabled' || e.code === 'images_unavailable') {
          switchMode('quiz', true);
        }
      });
  }

  function bindPhoto() {
    var input = document.getElementById('rkFile');
    var drop = document.getElementById('rkDrop');
    input.addEventListener('change', function () {
      if (input.files && input.files[0]) ask(input.files[0]);
    });
    ['dragenter', 'dragover'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('is-over'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('is-over'); });
    });
    drop.addEventListener('drop', function (e) {
      var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f && /^image\//.test(f.type)) ask(f);
    });
  }

  /* ── 질문으로 좁히기 ── */
  function askQ(key) {
    var q = GC.rockTree[key];
    var out = document.getElementById('rkQuiz');
    out.innerHTML =
      '<p class="rk-step">질문 ' + (trail.length + 1) + '</p>' +
      '<h4 class="rk-q">' + esc(q.q) + '</h4>' +
      '<p class="rk-hint">' + esc(q.hint) + '</p>' +
      '<div class="rk-opts">' + q.a.map(function (o, i) {
        return '<button type="button" class="rk-opt" data-i="' + i + '">' + esc(o.t) + '</button>';
      }).join('') + '</div>' +
      (trail.length ? '<button type="button" class="linkish rk-back">한 단계 뒤로</button>' : '');
    Array.prototype.forEach.call(out.querySelectorAll('.rk-opt'), function (b) {
      b.addEventListener('click', function () {
        var o = q.a[+b.getAttribute('data-i')];
        trail.push(key);
        if (o.r) showRock(o.r, true); else askQ(o.to);
      });
    });
    var back = out.querySelector('.rk-back');
    if (back) back.addEventListener('click', function () { askQ(trail.pop()); });
  }

  function showRock(id, inQuiz) {
    var r = GC.rocks[id];
    if (!r) return;
    var mt = r.go ? GC.mountains.filter(function (m) { return m.id === r.go; })[0] : null;
    var html =
      '<div class="rk-res" style="--ec:' + GC.eraColor(r.era) + '">' +
        '<h4 class="rk-name">' + esc(r.name) + '</h4>' +
        '<p class="rk-type">' + esc(r.type) + '</p>' +
        '<div class="rk-block"><h5>어떻게 만들어졌나</h5><p>' + esc(r.made) + '</p></div>' +
        '<div class="rk-block"><h5>확인 요령</h5><p>' + esc(r.tell) + '</p></div>' +
        '<div class="rk-block rk-where"><h5>한국에서 볼 수 있는 곳</h5><p>' + esc(r.where) + '</p></div>' +
        '<div class="rk-acts">' +
          (inQuiz ? '<button type="button" class="btn btn-solid" id="rkAgain">다시 하기</button>' : '') +
          (mt ? '<button type="button" class="btn btn-line" id="rkGo">' + esc(mt.name) + ' 이야기 보기</button>' : '') +
        '</div>' +
      '</div>';
    var host = document.getElementById(inQuiz ? 'rkQuiz' : 'rkOut');
    if (inQuiz) host.innerHTML = html; else host.insertAdjacentHTML('beforeend', html);
    var a = document.getElementById('rkAgain');
    if (a) a.addEventListener('click', function () { trail = []; askQ(GC.rockTree.start); });
    var g = document.getElementById('rkGo');
    if (g) g.addEventListener('click', function () { GC.go('mountains', r.go); });
    host.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function switchMode(m, force) {
    document.getElementById('rkTabPhoto').classList.toggle('is-on', m === 'photo');
    document.getElementById('rkTabQuiz').classList.toggle('is-on', m === 'quiz');
    document.getElementById('rkPhotoPane').hidden = m !== 'photo';
    document.getElementById('rkQuizPane').hidden = m !== 'quiz';
    if (m === 'quiz' && !document.getElementById('rkQuiz').innerHTML) {
      trail = []; askQ(GC.rockTree.start);
    }
    if (force) document.getElementById('rkTabPhoto').disabled = true;
  }

  GC.initRockId = function () {
    document.getElementById('rkPhotoPane').innerHTML = photoUI();
    bindPhoto();
    document.getElementById('rkTabPhoto').addEventListener('click', function () { switchMode('photo'); });
    document.getElementById('rkTabQuiz').addEventListener('click', function () { switchMode('quiz'); });
    switchMode('photo');

    /* Claude를 쓸 수 없는 환경이면 질문 방식만 남깁니다 */
    (window.claude && claude.use ? claude.use('sample') : Promise.resolve(null))
      .then(function (fn) {
        if (!fn) throw 0;
        sampleFn = fn;
        return fn.limits().catch(function () { return null; });
      })
      .then(function (l) {
        limits = l;
        if (!l || !l.images) throw 0;
        var input = document.getElementById('rkFile');
        input.accept = l.images.mediaTypes.join(',');
      })
      .catch(function () {
        document.getElementById('rkMsg').textContent =
          '이 환경에서는 사진 판별을 쓸 수 없습니다.';
        document.getElementById('rkDrop').classList.add('is-off');
        document.getElementById('rkFile').disabled = true;
        var n = document.getElementById('rkFallback');
        n.textContent = '사진 판별은 claude.ai에서 이 페이지를 열었을 때만 동작합니다. ' +
          '지금은 질문으로 찾기를 이용해 주세요.';
        n.hidden = false;
        switchMode('quiz', true);
      });
  };
})();
