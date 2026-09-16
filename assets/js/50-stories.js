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
          '<p class="story-go"><span>가 볼 곳</span>' + esc(s.go) + '</p>' +
        '</div>';
      var btn = art.querySelector('.story-hd'), bd = art.querySelector('.story-bd');
      btn.addEventListener('click', function () {
        var open = bd.hidden;
        bd.hidden = !open;
        btn.setAttribute('aria-expanded', String(open));
      });
      host.appendChild(art);
    });
  };

  GC.initQuiz = function () {
    var i = 0, score = 0, answered = false;
    var qEl = document.getElementById('qzQ'), wEl = document.getElementById('qzWhy');
    var oBtn = document.getElementById('qzO'), xBtn = document.getElementById('qzX');
    var nBtn = document.getElementById('qzNext'), pEl = document.getElementById('qzProg');
    var sEl = document.getElementById('qzScore');

    function render() {
      var q = GC.quiz[i];
      qEl.textContent = q.q;
      wEl.hidden = true;
      wEl.className = 'qz-why';
      nBtn.hidden = true;
      answered = false;
      oBtn.disabled = xBtn.disabled = false;
      oBtn.classList.remove('is-right', 'is-wrong');
      xBtn.classList.remove('is-right', 'is-wrong');
      pEl.textContent = (i + 1) + ' / ' + GC.quiz.length;
      sEl.textContent = score + '점';
    }

    function answer(v) {
      if (answered) return;
      answered = true;
      var q = GC.quiz[i];
      var ok = v === q.a;
      if (ok) score++;
      oBtn.disabled = xBtn.disabled = true;
      (q.a ? oBtn : xBtn).classList.add('is-right');
      if (!ok) (v ? oBtn : xBtn).classList.add('is-wrong');
      wEl.innerHTML = '<strong>' + (ok ? '맞습니다.' : '아닙니다.') + '</strong> ' + esc(q.why);
      wEl.className = 'qz-why ' + (ok ? 'ok' : 'no');
      wEl.hidden = false;
      sEl.textContent = score + '점';
      nBtn.hidden = false;
      nBtn.textContent = i === GC.quiz.length - 1 ? '결과 보기' : '다음 문제';
    }

    oBtn.addEventListener('click', function () { answer(true); });
    xBtn.addEventListener('click', function () { answer(false); });
    nBtn.addEventListener('click', function () {
      if (i === GC.quiz.length - 1) {
        qEl.textContent = GC.quiz.length + '문제 중 ' + score + '문제를 맞혔습니다.';
        wEl.innerHTML = score >= 8
          ? '<strong>전공자 수준입니다.</strong> 이제 현장에서 확인할 차례입니다.'
          : score >= 5
            ? '<strong>절반은 넘겼습니다.</strong> 틀린 문제의 설명을 다시 읽어보세요.'
            : '<strong>대부분이 여기서 시작합니다.</strong> 위의 지도와 이야기를 먼저 보고 다시 도전해보세요.';
        wEl.className = 'qz-why ok';
        wEl.hidden = false;
        oBtn.disabled = xBtn.disabled = true;
        nBtn.textContent = '다시 풀기';
        nBtn.onclick = function () { i = 0; score = 0; nBtn.onclick = null; render(); };
        return;
      }
      i++; render();
    });

    render();
  };
})();
