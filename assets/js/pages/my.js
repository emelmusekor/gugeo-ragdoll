/* 내 공부방: 공책 · 서고 · 방탈출 · 실전 기록을 한곳에 모으고, 기록을 파일로 옮긴다 */
(function () {
  var App = window.App;
  var h = App.h;

  function fmtTime(ms) {
    var s = Math.max(0, Math.floor(ms / 1000));
    return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2);
  }
  function kv(k) { return App.store.kv(k); }
  function stars(n) { return '★★★'.slice(0, n) + '☆☆☆'.slice(0, 3 - n); }

  /* 날짜로 고르는 오늘의 작품 (같은 날엔 모두에게 같은 작품) */
  function todayWork() {
    var d = new Date();
    var seed = d.getFullYear() * 400 + (d.getMonth() + 1) * 31 + d.getDate();
    var pool = App.lit.works.filter(function (w) { return w.lines && w.lines.length; });
    return pool[seed % pool.length];
  }
  App.todayWork = todayWork;

  function tile(num, label, sub, tone, href) {
    return h(href ? 'a' : 'div', { class: 'my-tile ' + (tone || ''), href: href || null },
      h('b', null, String(num)), h('span', null, label), sub ? h('small', null, sub) : null);
  }
  function section(title, body, more) {
    return h('section', { class: 'my-sec' }, h('div', { class: 'my-sec-head' }, h('h2', { class: 'display' }, title), more || null), body);
  }

  function render() {
    var root = document.getElementById('my-app');
    root.innerHTML = '';
    var s = App.store.get();

    /* 공책 */
    var unitIds = Object.keys(s.units || {});
    var done = unitIds.filter(function (id) { return s.units[id].done; });
    var solvedQ = unitIds.reduce(function (n, id) {
      var q = s.units[id].quiz || {};
      return n + Object.keys(q).filter(function (k) { return q[k] === true; }).length;
    }, 0);

    /* 서고 */
    var shelf = (kv('litShelf') || []).map(App.lit.work).filter(Boolean);

    /* 방탈출 */
    var rooms = App.escape.rooms;
    var cleared = rooms.filter(function (r) { return kv('escapeBest:' + r.id); });
    var starSum = cleared.reduce(function (n, r) { return n + kv('escapeBest:' + r.id).stars; }, 0);

    /* 실전 */
    var sets = App.exam.sets;
    var tried = sets.filter(function (x) { return kv('examBest:' + x.id); });
    var right = 0;
    var total = 0;
    tried.forEach(function (x) { var b = kv('examBest:' + x.id); right += b.score; total += b.n; });
    var notes = kv('examNotes') || [];

    /* 인사 */
    var name = App.store.name();
    var greet = h('section', { class: 'my-hero' },
      h('div', { class: 'my-hero-cat', html: App.cat.sit({ mood: done.length || tried.length ? 'happy' : 'wink' }) }),
      h('div', { class: 'my-hero-copy' },
        h('p', { class: 'eyebrow' }, '내 공 부 방'),
        h('h1', { class: 'display' }, (name ? name + ', ' : '') + '오늘도 한 걸음!'),
        h('p', { class: 'lead' }, '국어 공책, 문학 서고, 방탈출, 실전 문제에서 쌓은 기록을 한곳에 모았어요. 기록은 이 기기의 브라우저에만 있으니, 다른 기기로 옮길 땐 아래 ‘기록 옮기기’를 써 주세요.'),
        h('label', { class: 'my-name' }, '내 이름 ',
          h('input', { type: 'text', maxlength: '12', value: name, placeholder: '이름이나 별명', 'aria-label': '내 이름', onchange: function (e) { App.store.name(e.target.value.trim()); render(); } }))));
    root.appendChild(greet);

    root.appendChild(h('div', { class: 'my-tiles' },
      tile(done.length, '공책 단원 완료', '확인 문제 ' + solvedQ + '개 맞힘', 'tone-blue', 'handbook.html'),
      tile(shelf.length, '서재에 담은 작품', '전체 ' + App.lit.works.length + '편 중', 'tone-violet', 'archive.html'),
      tile(cleared.length + '/' + rooms.length, '방탈출 성공', '별 ' + starSum + '/' + rooms.length * 3, 'tone-night', 'escape.html'),
      tile(tried.length + '/' + sets.length, '실전 세트 풀이', total ? '정답률 ' + Math.round((right / total) * 100) + '%' : '아직 기록 없음', 'tone-coral', 'exam.html'),
      tile(notes.length, '오답 노트', notes.length ? '다시 풀면 지워져요' : '깨끗해요!', 'tone-amber', 'exam.html#notes')));

    /* 이어서 하기 */
    var next = h('div', { class: 'my-next' });
    if (s.last) {
      var m = /^(\d+-\d)-(\d+)$/.exec(s.last);
      var lastCard = h('a', { class: 'my-card', href: 'handbook.html#/u/' + s.last },
        h('span', { class: 'my-card-k' }, '📒 이어서 공부하기'),
        h('b', { class: 'display', id: 'my-last-title' }, m ? App.semName(m[1]) + ' ' + Number(m[2]) + '단원' : s.last),
        h('small', null, '마지막으로 펼친 단원'));
      next.appendChild(lastCard);
      if (m) loadTitle(m[1], s.last);
    } else {
      next.appendChild(h('a', { class: 'my-card', href: 'handbook.html' }, h('span', { class: 'my-card-k' }, '📒 국어 공책'), h('b', { class: 'display' }, '첫 단원 펼치기'), h('small', null, '학년과 학기를 골라요')));
    }
    var roomNext = rooms.filter(function (r) { return !kv('escapeBest:' + r.id); })[0];
    if (roomNext) next.appendChild(h('a', { class: 'my-card', href: 'escape.html#' + roomNext.id }, h('span', { class: 'my-card-k' }, '🗝️ 다음 방탈출'), h('b', { class: 'display' }, roomNext.title), h('small', null, roomNext.sub)));
    var setNext = sets.filter(function (x) { return !kv('examBest:' + x.id); })[0];
    if (setNext) next.appendChild(h('a', { class: 'my-card', href: 'exam.html#' + setNext.id }, h('span', { class: 'my-card-k' }, '📝 아직 안 푼 실전 세트'), h('b', { class: 'display' }, setNext.title), h('small', null, setNext.area + ' · ' + setNext.questions.length + '문항 · ' + setNext.minutes + '분')));
    var tw = todayWork();
    if (tw) next.appendChild(h('a', { class: 'my-card is-today', href: 'archive.html#w=' + tw.id }, h('span', { class: 'my-card-k' }, '🌙 오늘의 작품'), h('b', { class: 'display' }, '「' + tw.t + '」'), h('small', null, tw.a + ' · ' + tw.theme)));
    root.appendChild(section('이어서 하기', next));

    /* 방탈출 기록 */
    var rl = h('div', { class: 'my-rooms' });
    rooms.forEach(function (r) {
      var b = kv('escapeBest:' + r.id);
      var p = kv('escape:' + r.id);
      rl.appendChild(h('a', { class: 'my-room' + (b ? ' is-done' : ''), href: 'escape.html#' + r.id },
        h('b', null, r.title),
        h('span', { class: 'my-stars' }, b ? stars(b.stars) : '☆☆☆'),
        h('small', null, b ? '최고 ' + fmtTime(b.time) : p && p.solved && p.solved.length ? '조각 ' + p.solved.length + '/' + r.items.length + ' 진행 중' : '아직 도전 전')));
    });
    root.appendChild(section('문학 방탈출', rl, h('a', { class: 'my-more', href: 'escape.html' }, '방 고르기 →')));

    /* 실전 기록 */
    var byTrack = App.exam.tracks.map(function (t) {
      var ss = sets.filter(function (x) { return x.track === t.id; });
      var tr = ss.filter(function (x) { return kv('examBest:' + x.id); });
      var r = 0;
      var n = 0;
      tr.forEach(function (x) { var b = kv('examBest:' + x.id); r += b.score; n += b.n; });
      var pct = n ? Math.round((r / n) * 100) : 0;
      return h('div', { class: 'my-track' },
        h('div', { class: 'my-track-top' }, h('b', null, t.name), h('span', null, tr.length + '/' + ss.length + '세트' + (n ? ' · ' + pct + '%' : ''))),
        h('div', { class: 'my-bar', role: 'img', 'aria-label': t.name + ' 푼 세트 ' + tr.length + '개, 정답률 ' + pct + '%' }, h('span', { style: { width: (ss.length ? (tr.length / ss.length) * 100 : 0) + '%' } })),
        h('div', { class: 'my-setchips' }, ss.map(function (x) {
          var b = kv('examBest:' + x.id);
          return h('a', { class: 'my-setchip' + (b ? (b.score === b.n ? ' is-full' : ' is-part') : ''), href: 'exam.html#' + x.id, title: x.title }, (b ? b.score + '/' + b.n + ' ' : '') + x.area);
        })));
    });
    root.appendChild(section('수능·LEET 실전', h('div', { class: 'my-tracks' }, byTrack), h('a', { class: 'my-more', href: 'exam.html#notes' }, '오답 노트 ' + notes.length + '개 →')));

    /* 서재 */
    root.appendChild(section('내 서재',
      shelf.length
        ? h('div', { class: 'my-shelf' }, shelf.map(function (w) { return h('a', { class: 'my-book', href: 'archive.html#w=' + w.id }, h('b', { class: 'display' }, w.t), h('small', null, w.a)); }))
        : h('p', { class: 'my-empty' }, '아직 담은 작품이 없어요. 문학 서고에서 작품 카드를 열고 ‘서재에 담기’를 눌러 보세요.'),
      h('a', { class: 'my-more', href: 'archive.html' }, '서고 가기 →')));

    /* 기록 옮기기 */
    var fileIn = h('input', { type: 'file', accept: 'application/json,.json', hidden: true, onchange: importFile });
    root.appendChild(section('기록 옮기기',
      h('div', { class: 'my-backup' },
        h('p', null, '공부 기록은 서버로 보내지 않고 이 브라우저에만 저장돼요. 다른 컴퓨터나 태블릿으로 옮기려면 기록 파일을 내려받은 뒤, 그 기기의 내 공부방에서 불러오세요.'),
        h('div', { class: 'my-backup-btns' },
          h('button', { type: 'button', class: 'btn', onclick: exportFile }, '기록 파일 내려받기'),
          h('button', { type: 'button', class: 'btn ghost', onclick: function () { fileIn.click(); } }, '기록 파일 불러오기'),
          h('button', { type: 'button', class: 'btn ghost my-danger', onclick: resetAll }, '모든 기록 지우기'),
          fileIn),
        h('p', { class: 'my-status', id: 'my-status', role: 'status' }))));
  }

  function loadTitle(semKey, id) {
    /* 그 학기 파일 하나만 불러와 단원 이름을 채운다 */
    var sc = document.createElement('script');
    sc.src = 'assets/js/data/units-' + semKey + '.js';
    sc.onload = function () {
      var u = App.unitById(id);
      var el = document.getElementById('my-last-title');
      if (u && el) el.textContent = App.semName(u, true) + ' ' + u.no + '단원 · ' + u.title;
    };
    document.head.appendChild(sc);
  }

  function status(msg, ok) {
    var el = document.getElementById('my-status');
    if (el) {
      el.textContent = msg;
      el.className = 'my-status' + (ok ? ' is-ok' : ' is-no');
    }
  }
  function exportFile() {
    var data = { app: 'gugeo-hani', version: 1, savedAt: new Date().toISOString(), data: App.store.get() };
    var blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '국어하니-기록-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    status('기록 파일을 내려받았어요.', true);
  }
  function importFile(e) {
    var f = e.target.files && e.target.files[0];
    if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      try {
        var obj = JSON.parse(r.result);
        if (!obj || obj.app !== 'gugeo-hani' || !obj.data || typeof obj.data !== 'object') throw new Error('형식');
        if (!confirm('지금 이 기기의 기록을 불러온 파일의 기록으로 바꿀까요?')) return;
        localStorage.setItem((App.config && App.config.storageKey) || 'gugeo-ragdoll.v1', JSON.stringify(obj.data));
        status('기록을 불러왔어요. 화면을 새로 고칠게요.', true);
        setTimeout(function () { location.reload(); }, 600);
      } catch (err) {
        status('국어하니 기록 파일이 아니에요. 내 공부방에서 내려받은 파일을 골라 주세요.', false);
      }
      e.target.value = '';
    };
    r.readAsText(f);
  }
  function resetAll() {
    if (!confirm('이 기기에 저장된 모든 공부 기록(진도, 서재, 방탈출, 오답 노트)을 지울까요? 되돌릴 수 없어요.')) return;
    App.store.reset();
    render();
    status('모든 기록을 지웠어요.', true);
  }

  document.addEventListener('DOMContentLoaded', function () {
    App.applyBrand();
    App.mountYarns();
    render();
  });
})();
