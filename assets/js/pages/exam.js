/* 수능·LEET 실전: 세트 고르기 → 시간 재며 풀기(형광펜) → 채점·근거 문단·지문 구조 → 오답 노트 */
(function () {
  var App = window.App;
  var h = App.h;
  var X = App.exam;
  var NUM = '①②③④⑤';

  var state = { tab: 'suneung' };
  var app;
  var run = null; // 지금 푸는 세트

  /* ───── 기록 ───── */
  function bestOf(id) { return App.store.kv('examBest:' + id) || null; }
  function notes() { return App.store.kv('examNotes') || []; }
  function setNotes(list) { App.store.kv('examNotes', list); }
  function fmtTime(ms) {
    var s = Math.max(0, Math.floor(ms / 1000));
    return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2);
  }

  /* ═════════ 고르는 화면 ═════════ */
  var TABS = [
    { id: 'suneung', label: '수능 국어' },
    { id: 'leet-v', label: 'LEET 언어이해' },
    { id: 'leet-r', label: 'LEET 추리논증' },
    { id: 'notes', label: '오답 노트' },
    { id: 'info', label: '시험 안내' },
  ];

  function renderLobby() {
    stopTimer();
    run = null;
    document.body.classList.remove('is-solving');
    app.innerHTML = '';
    var tabs = h('div', { class: 'ar-tabs', role: 'tablist', 'aria-label': '시험 고르기' });
    TABS.forEach(function (t) {
      var n = t.id === 'notes' ? notes().length : 0;
      tabs.appendChild(h('button', { type: 'button', role: 'tab', class: 'ar-tab' + (state.tab === t.id ? ' is-on' : ''), 'aria-selected': state.tab === t.id ? 'true' : 'false', onclick: function () { state.tab = t.id; renderLobby(); } },
        t.label, n ? h('span', { class: 'ar-tab-n' }, n) : null));
    });
    app.appendChild(tabs);

    if (state.tab === 'notes') return app.appendChild(viewNotes());
    if (state.tab === 'info') return app.appendChild(viewInfo());

    var tr = X.track(state.tab);
    app.appendChild(h('p', { class: 'ex-trackdesc' }, tr.desc));
    var grid = h('div', { class: 'ex-sets' });
    X.sets.filter(function (s) { return s.track === tr.id; }).forEach(function (s) {
      var b = bestOf(s.id);
      grid.appendChild(h('article', { class: 'ex-setcard' },
        h('span', { class: 'ex-area' }, s.area),
        h('h3', { class: 'display' }, s.title),
        h('p', { class: 'ex-setmeta' }, s.questions.length + '문항 · 권장 ' + s.minutes + '분' + (s.passage ? ' · 지문 ' + s.passage.paras.length + '문단' : '')),
        b ? h('p', { class: 'ex-setbest' + (b.score === b.n ? ' is-full' : '') }, '최고 ' + b.score + '/' + b.n + ' · ' + fmtTime(b.time)) : h('p', { class: 'ex-setbest is-none' }, '아직 풀지 않았어요'),
        h('button', { type: 'button', class: 'btn', onclick: function () { start(s.id); } }, b ? '다시 풀기' : '풀기')
      ));
    });
    app.appendChild(grid);
    app.appendChild(h('p', { class: 'ex-note' }, '지문과 문항은 모두 국어랙돌에서 새로 쓴 연습용이에요. 기출 문제는 한국교육과정평가원과 법학전문대학원협의회 누리집에서 확인하세요.'));
  }

  function viewInfo() {
    var box = h('div', { class: 'ex-info' });
    X.tracks.forEach(function (t) {
      box.appendChild(h('section', { class: 'ex-infocard' },
        h('h2', { class: 'display' }, t.name),
        h('ul', null, t.info.map(function (x) { return h('li', null, x); }))));
    });
    box.appendChild(h('section', { class: 'ex-infocard is-tip' },
      h('h2', { class: 'display' }, '이렇게 연습해요'),
      h('ol', null,
        h('li', null, h('b', null, '시간 재기: '), '권장 시간 안에 푸는 연습을 해요. 막대가 주황색이 되면 시간을 넘긴 거예요.'),
        h('li', null, h('b', null, '형광펜: '), '지문에서 핵심 개념, 대립하는 견해, ㉠·㉡ 같은 표시를 칠하며 읽어요.'),
        h('li', null, h('b', null, '근거 찾기: '), '채점 뒤 ‘근거 문단 보기’를 눌러 정답의 근거가 지문 어디에 있는지 확인해요.'),
        h('li', null, h('b', null, '구조도: '), '지문 구조도를 보고 문단마다 한 줄 요약을 스스로 써 봐요.'),
        h('li', null, h('b', null, '오답 노트: '), '틀린 문항은 자동으로 모여요. 다시 풀어 맞히면 노트에서 지워져요.'))));
    return box;
  }

  function viewNotes() {
    var list = notes();
    if (!list.length) {
      return h('div', { class: 'ar-empty-box' },
        h('div', { class: 'ar-empty-cat', html: App.cat.peek({ mood: 'happy' }) }),
        h('p', null, '오답 노트가 비어 있어요. 세트를 풀고 틀린 문항이 생기면 여기에 모여요.'));
    }
    var box = h('div', { class: 'ex-notes' });
    box.appendChild(h('p', { class: 'ex-note' }, '틀린 문항 ' + list.length + '개 · 다시 풀어 맞히면 저절로 지워져요'));
    list.slice().reverse().forEach(function (n) {
      var s = X.set(n.set);
      if (!s) return;
      var q = s.questions[n.qi];
      if (!q) return;
      box.appendChild(h('article', { class: 'ex-notecard' },
        h('p', { class: 'ex-notecard-top' }, h('span', { class: 'ex-area' }, X.track(s.track).short + ' · ' + s.area), h('span', null, n.at || '')),
        h('h3', null, s.title + ' — ' + (n.qi + 1) + '번'),
        h('p', { class: 'ex-notecard-q' }, q.q),
        h('p', { class: 'ex-notecard-a' }, h('span', { class: 'is-no' }, '내 답 ' + (n.picked >= 0 ? NUM[n.picked] : '안 고름')), h('span', { class: 'is-ok' }, '정답 ' + NUM[q.answer] + ' ' + q.choices[q.answer])),
        h('p', { class: 'ex-notecard-why' }, q.why),
        h('div', { class: 'ex-notecard-act' },
          h('button', { type: 'button', class: 'btn small', onclick: function () { start(s.id); } }, '세트 다시 풀기'),
          h('button', { type: 'button', class: 'btn small ghost', onclick: function () {
            setNotes(notes().filter(function (x) { return !(x.set === n.set && x.qi === n.qi); }));
            renderLobby();
          } }, '노트에서 지우기'))));
    });
    return box;
  }

  /* ═════════ 푸는 화면 ═════════ */
  var timerId = 0;
  function stopTimer() { clearInterval(timerId); timerId = 0; }

  function start(id) {
    var s = X.set(id);
    if (!s) return;
    run = { set: s, picks: s.questions.map(function () { return -1; }), t0: Date.now(), done: false, hl: false };
    document.body.classList.add('is-solving');
    if (history.replaceState) history.replaceState(null, '', '#' + id);
    app.innerHTML = '';
    window.scrollTo(0, 0);

    var timeEl = h('b', { class: 'ex-time' }, '0:00');
    var bar = h('span', { class: 'ex-bar-fill' });
    var hlBtn = h('button', { type: 'button', class: 'ex-tool', 'aria-pressed': 'false', onclick: function () {
      run.hl = !run.hl;
      hlBtn.setAttribute('aria-pressed', run.hl ? 'true' : 'false');
      hlBtn.classList.toggle('is-on', run.hl);
      document.body.classList.toggle('is-hl', run.hl);
    } }, '🖍 형광펜');
    var clearBtn = h('button', { type: 'button', class: 'ex-tool', onclick: clearHighlights }, '지우기');
    var submitBtn = h('button', { type: 'button', class: 'btn coral small', onclick: submit }, '채점하기');
    var head = h('div', { class: 'ex-solvehead' },
      h('div', { class: 'wrap ex-solvehead-in' },
        h('button', { type: 'button', class: 'ex-tool', onclick: function () { if (run.done || confirm('풀던 세트를 그만두고 목록으로 갈까요?')) { history.replaceState(null, '', location.pathname); renderLobby(); } } }, '← 목록'),
        h('div', { class: 'ex-solvetitle' }, h('span', null, X.track(s.track).name + ' · ' + s.area), h('b', null, s.title)),
        h('div', { class: 'ex-timer', title: '권장 ' + s.minutes + '분' }, timeEl, h('span', { class: 'ex-bar' }, bar), h('small', null, '권장 ' + s.minutes + ':00')),
        s.passage ? hlBtn : null,
        s.passage ? clearBtn : null,
        submitBtn));
    app.appendChild(head);

    var body = h('div', { class: 'wrap ex-solve' + (s.passage ? '' : ' is-single') });
    if (s.passage) {
      var pass = h('section', { class: 'ex-passage', 'aria-label': '지문' });
      if (s.passage.label) pass.appendChild(h('p', { class: 'ex-plabel' }, s.passage.label));
      s.passage.paras.forEach(function (p, i) {
        var poem = p.indexOf('\n') >= 0;
        pass.appendChild(h('div', { class: 'ex-para' + (poem ? ' is-poem' : ''), id: 'para-' + i },
          poem ? null : h('span', { class: 'ex-pno', 'aria-hidden': 'true' }, String(i + 1)),
          h('p', null, p)));
      });
      pass.addEventListener('mouseup', onSelect);
      pass.addEventListener('touchend', function () { setTimeout(onSelect, 30); });
      body.appendChild(pass);
    }
    var qs = h('section', { class: 'ex-qs', 'aria-label': '문항' });
    s.questions.forEach(function (q, qi) {
      var choices = h('div', { class: 'ex-choices', role: 'radiogroup', 'aria-label': (qi + 1) + '번 선택지' });
      q.choices.forEach(function (c, ci) {
        choices.appendChild(h('button', { type: 'button', role: 'radio', 'aria-checked': 'false', class: 'ex-choice', dataset: { ci: String(ci) }, onclick: function () {
          if (run.done) return;
          run.picks[qi] = ci;
          choices.querySelectorAll('.ex-choice').forEach(function (b, k) {
            b.classList.toggle('is-picked', k === ci);
            b.setAttribute('aria-checked', k === ci ? 'true' : 'false');
          });
        } }, h('span', { class: 'ex-cn' }, NUM[ci]), h('span', null, c)));
      });
      qs.appendChild(h('article', { class: 'ex-q', id: 'q-' + qi },
        h('p', { class: 'ex-qq' }, h('b', { class: 'ex-qno' }, (qi + 1) + '.'), ' ', q.q),
        q.box ? h('div', { class: 'ex-box' }, q.box) : null,
        choices,
        h('div', { class: 'ex-result', hidden: true })));
    });
    qs.appendChild(h('div', { class: 'ex-submitrow' }, h('button', { type: 'button', class: 'btn coral', onclick: submit }, '채점하기')));
    body.appendChild(qs);
    app.appendChild(body);

    var limit = s.minutes * 60000;
    function tick() {
      if (!run || run.done) return;
      var el = Date.now() - run.t0;
      timeEl.textContent = fmtTime(el);
      bar.style.width = Math.min(100, (el / limit) * 100) + '%';
      head.classList.toggle('is-over', el > limit);
    }
    stopTimer();
    timerId = setInterval(tick, 500);
    tick();
  }

  /* 형광펜 */
  function onSelect() {
    if (!run || !run.hl) return;
    var sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return;
    var range = sel.getRangeAt(0);
    var pass = document.querySelector('.ex-passage');
    if (!pass || !pass.contains(range.commonAncestorContainer)) return;
    if (!String(range).trim()) return;
    try {
      var mark = document.createElement('mark');
      mark.className = 'ex-hl';
      mark.appendChild(range.extractContents());
      range.insertNode(mark);
    } catch (e) {}
    sel.removeAllRanges();
  }
  function clearHighlights() {
    document.querySelectorAll('.ex-passage mark.ex-hl').forEach(function (m) {
      var p = m.parentNode;
      while (m.firstChild) p.insertBefore(m.firstChild, m);
      p.removeChild(m);
      p.normalize();
    });
  }

  function flashParas(ev) {
    document.querySelectorAll('.ex-para.is-ev').forEach(function (p) { p.classList.remove('is-ev'); });
    var first = null;
    (ev || []).forEach(function (i) {
      var p = document.getElementById('para-' + i);
      if (p) {
        p.classList.add('is-ev');
        if (!first) first = p;
      }
    });
    if (first) first.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  function submit() {
    if (!run || run.done) return;
    var s = run.set;
    var empty = run.picks.filter(function (p) { return p < 0; }).length;
    if (empty && !confirm('고르지 않은 문항이 ' + empty + '개 있어요. 그래도 채점할까요?')) return;
    run.done = true;
    stopTimer();
    var time = Date.now() - run.t0;
    var score = 0;
    var list = notes();
    var today = new Date().toISOString().slice(0, 10);
    s.questions.forEach(function (q, qi) {
      var pick = run.picks[qi];
      var ok = pick === q.answer;
      if (ok) score++;
      list = list.filter(function (n) { return !(n.set === s.id && n.qi === qi); });
      if (!ok) list.push({ set: s.id, qi: qi, picked: pick, at: today });

      var art = document.getElementById('q-' + qi);
      art.classList.add(ok ? 'is-ok' : 'is-no');
      art.querySelectorAll('.ex-choice').forEach(function (b, ci) {
        b.disabled = true;
        if (ci === q.answer) b.classList.add('is-answer');
        if (ci === pick && !ok) b.classList.add('is-wrong');
      });
      var res = art.querySelector('.ex-result');
      res.hidden = false;
      res.appendChild(h('p', { class: 'ex-verdict' }, ok ? '정답' : (pick < 0 ? '안 고름' : '오답') + ' · 정답 ' + NUM[q.answer], q.skill ? h('span', { class: 'ex-skill' }, q.skill) : null));
      res.appendChild(h('p', { class: 'ex-why' }, q.why));
      if (q.ev && q.ev.length && s.passage) {
        res.appendChild(h('button', { type: 'button', class: 'btn small ghost', onclick: function () { flashParas(q.ev); } },
          '근거 문단 보기 (' + q.ev.map(function (i) { return i + 1; }).join(', ') + '문단)'));
      }
    });
    setNotes(list);
    var b = bestOf(s.id);
    var isBest = !b || score > b.score || (score === b.score && time < b.time);
    if (isBest) App.store.kv('examBest:' + s.id, { score: score, n: s.questions.length, time: time, at: today });

    var over = time > s.minutes * 60000;
    var mood = score === s.questions.length ? 'happy' : score === 0 ? 'sad' : 'smile';
    var sum = h('section', { class: 'ex-summary' },
      h('div', { class: 'ex-sum-cat', html: App.cat.head({ mood: mood }) }),
      h('div', { class: 'ex-sum-main' },
        h('p', { class: 'ex-sum-score display' }, score + ' / ' + s.questions.length),
        h('p', null, '걸린 시간 ' + fmtTime(time) + (over ? ' · 권장 ' + s.minutes + '분을 넘겼어요' : ' · 권장 시간 안에 풀었어요') + (isBest ? ' · 새 최고 기록!' : '')),
        h('p', { class: 'ex-sum-tip' }, score === s.questions.length ? '모두 맞혔어요! 이제 지문 구조도를 보며 문단 요약을 스스로 써 보세요.' : '틀린 문항은 오답 노트에 담았어요. ‘근거 문단 보기’로 정답의 근거를 지문에서 찾아보세요.')),
      h('div', { class: 'ex-sum-act' },
        h('button', { type: 'button', class: 'btn small', onclick: function () { start(s.id); } }, '다시 풀기'),
        h('button', { type: 'button', class: 'btn small ghost', onclick: function () { history.replaceState(null, '', location.pathname); renderLobby(); } }, '다른 세트')));
    var struct = h('details', { class: 'ex-struct', open: true },
      h('summary', null, '지문 구조도'),
      h('ol', null, s.structure.map(function (x) { return h('li', null, x); })));
    var anchor = document.querySelector('.ex-solve');
    anchor.parentNode.insertBefore(h('div', { class: 'wrap' }, sum, struct), anchor);
    document.querySelectorAll('.ex-solvehead .btn.coral, .ex-submitrow').forEach(function (x) { x.hidden = true; });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  document.addEventListener('DOMContentLoaded', function () {
    App.applyBrand();
    App.mountYarns();
    app = document.getElementById('ex-app');
    var heroCat = document.getElementById('ex-hero-cat');
    if (heroCat) heroCat.innerHTML = App.cat.sit({ mood: 'think' });
    var id = location.hash.slice(1);
    var s = X.set(id);
    if (s) {
      state.tab = s.track;
      start(id);
    } else {
      if (X.track(id) || id === 'notes' || id === 'info') state.tab = id;
      renderLobby();
    }
    /* 첫 화면의 단계 단추(#suneung, #leet-v)를 누르면 그 탭을 연다 */
    window.addEventListener('hashchange', function () {
      var k = location.hash.slice(1);
      if (run && !run.done) return;
      if (X.track(k)) {
        state.tab = k;
        renderLobby();
        app.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
})();
