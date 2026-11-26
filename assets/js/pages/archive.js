/* 문학 서고: 연표 · 갈래 · 개념어 사전 · 내 서재 · 한 줄 퀴즈 */
(function () {
  var App = window.App;
  var h = App.h;
  var L = App.lit;

  var state = { tab: 'era', era: '전체', genre: '전체', q: '' };
  var view, filters, tabsEl, dialog, dInner;

  var TABS = [
    { id: 'era', label: '시대로 보기' },
    { id: 'genre', label: '갈래로 보기' },
    { id: 'concept', label: '개념어 사전' },
    { id: 'shelf', label: '내 서재' },
    { id: 'quiz', label: '한 줄 퀴즈' },
  ];

  /* ───── 서재 기록 ───── */
  function saved() {
    return App.store.kv('litShelf') || [];
  }
  function isSaved(id) {
    return saved().indexOf(id) >= 0;
  }
  function toggleSaved(id) {
    var s = saved().slice();
    var i = s.indexOf(id);
    if (i >= 0) s.splice(i, 1);
    else s.push(id);
    App.store.kv('litShelf', s);
    return i < 0;
  }

  /* ───── 찾기 ───── */
  function norm(s) {
    return String(s || '').replace(/\s+/g, '').toLowerCase();
  }
  function haystack(w) {
    var cons = (w.con || [])
      .map(function (c) {
        var k = L.concept(c);
        return k ? k.w : '';
      })
      .join(' ');
    return norm([w.t, w.a, w.era, w.y, w.g, w.theme, w.sum, (w.pts || []).join(' '), cons].join(' '));
  }
  function matches(w) {
    if (state.era !== '전체' && w.era !== state.era) return false;
    if (state.genre !== '전체' && w.g !== state.genre) return false;
    if (state.q) {
      var words = state.q.split(/\s+/).filter(Boolean);
      var hay = haystack(w);
      for (var i = 0; i < words.length; i++) if (hay.indexOf(norm(words[i])) < 0) return false;
    }
    return true;
  }
  function list() {
    return L.works.filter(matches);
  }

  /* ───── 카드 ───── */
  function tone(w) {
    if (L.isVerse(w)) return 'is-verse';
    if (w.g === '민속극') return 'is-drama';
    return 'is-prose';
  }
  function card(w) {
    var badges = [];
    if (w.room) badges.push(h('span', { class: 'ar-badge is-room', title: '문학 방탈출에 나와요' }, '방탈출'));
    if (w.units && w.units.length) badges.push(h('span', { class: 'ar-badge', title: '국어 공책 단원에서 다뤄요' }, '공책 ' + w.units.length));
    if (isSaved(w.id)) badges.push(h('span', { class: 'ar-badge is-saved' }, '서재'));
    return h(
      'button',
      { type: 'button', class: 'ar-card ' + tone(w), onclick: function () { openWork(w.id); }, 'aria-label': w.t + ', ' + w.a + ' 자세히 보기' },
      h('span', { class: 'ar-card-g' }, w.g),
      h('span', { class: 'ar-card-t display' }, w.t),
      h('span', { class: 'ar-card-a' }, w.a + ' · ' + w.y),
      h('span', { class: 'ar-card-theme' }, w.theme),
      badges.length ? h('span', { class: 'ar-card-badges' }, badges) : null
    );
  }
  function grid(works) {
    if (!works.length) return h('p', { class: 'ar-empty' }, '찾는 작품이 없어요. 다른 낱말로 찾아보거나 거르개를 풀어 보세요.');
    return h('div', { class: 'ar-grid' }, works.map(card));
  }

  /* ───── 거르개 ───── */
  function chipRow(label, items, current, onPick) {
    return h(
      'div',
      { class: 'ar-chiprow', role: 'group', 'aria-label': label },
      h('span', { class: 'ar-chiprow-l' }, label),
      ['전체'].concat(items).map(function (it) {
        return h('button', { type: 'button', class: 'chip' + (it === current ? ' is-on' : ''), 'aria-pressed': it === current ? 'true' : 'false', onclick: function () { onPick(it); } }, it);
      })
    );
  }
  function renderFilters() {
    filters.innerHTML = '';
    if (state.tab === 'concept' || state.tab === 'quiz' || state.tab === 'shelf') return;
    var eras = L.eras.filter(function (e) {
      return L.works.some(function (w) { return w.era === e; });
    });
    var genres = L.genres.filter(function (g) {
      return L.works.some(function (w) { return w.g === g; });
    });
    filters.appendChild(chipRow('시대', eras, state.era, function (v) { state.era = v; render(); }));
    filters.appendChild(chipRow('갈래', genres, state.genre, function (v) { state.genre = v; render(); }));
  }

  /* ───── 보기: 시대 ───── */
  function viewEra() {
    var works = list();
    if (!works.length) return grid([]);
    var box = h('div', { class: 'ar-timeline' });
    L.eras.forEach(function (era) {
      var ws = works.filter(function (w) { return w.era === era; });
      if (!ws.length) return;
      box.appendChild(
        h('section', { class: 'ar-era' },
          h('div', { class: 'ar-era-head' }, h('span', { class: 'ar-era-dot', 'aria-hidden': 'true' }), h('h2', { class: 'display' }, era), h('span', { class: 'ar-era-n' }, ws.length + '편')),
          grid(ws)
        )
      );
    });
    return box;
  }

  /* ───── 보기: 갈래 ───── */
  function viewGenre() {
    var works = list();
    if (!works.length) return grid([]);
    var box = h('div', { class: 'ar-timeline' });
    L.genres.forEach(function (g) {
      var ws = works.filter(function (w) { return w.g === g; });
      if (!ws.length) return;
      box.appendChild(
        h('section', { class: 'ar-era' },
          h('div', { class: 'ar-era-head' }, h('span', { class: 'ar-era-dot', 'aria-hidden': 'true' }), h('h2', { class: 'display' }, g), h('span', { class: 'ar-era-n' }, ws.length + '편')),
          grid(ws)
        )
      );
    });
    return box;
  }

  /* ───── 보기: 개념어 ───── */
  function viewConcept() {
    var q = norm(state.q);
    var items = L.concepts.filter(function (c) {
      return !q || norm(c.w + c.d).indexOf(q) >= 0;
    });
    if (!items.length) return h('p', { class: 'ar-empty' }, '찾는 개념어가 없어요.');
    return h(
      'div',
      { class: 'ar-concepts' },
      items.map(function (c) {
        var ws = L.works.filter(function (w) { return (w.con || []).indexOf(c.id) >= 0; });
        return h('article', { class: 'ar-concept', id: 'c-' + c.id },
          h('h3', { class: 'display' }, c.w),
          h('p', null, c.d),
          ws.length
            ? h('div', { class: 'ar-concept-ws' }, h('span', null, '이 개념이 나오는 작품'),
                ws.map(function (w) { return h('button', { type: 'button', class: 'ar-link', onclick: function () { openWork(w.id); } }, w.t); }))
            : null
        );
      })
    );
  }

  /* ───── 보기: 내 서재 ───── */
  function viewShelf() {
    var ws = saved().map(L.work).filter(Boolean);
    if (!ws.length) {
      return h('div', { class: 'ar-empty-box' },
        h('div', { class: 'ar-empty-cat', html: App.cat.peek({ mood: 'think' }) }),
        h('p', null, '아직 서재가 비어 있어요. 작품 카드를 열고 ', h('b', null, '서재에 담기'), '를 누르면 여기에 모여요. 시험 전에 다시 볼 작품을 모아 두세요.')
      );
    }
    return h('div', null, h('p', { class: 'ar-note' }, '담은 작품 ' + ws.length + '편 · 이 기기에만 저장돼요'), grid(ws));
  }

  /* ───── 보기: 한 줄 퀴즈 ───── */
  var quizScore = { ok: 0, n: 0 };
  function viewQuiz() {
    var pool = L.works.filter(function (w) { return w.lines && w.lines.length; });
    var box = h('div', { class: 'ar-quiz' });
    function round() {
      box.innerHTML = '';
      var w = App.pick(pool);
      var lines = w.lines.filter(function (l) { return l && l !== '……'; });
      var start = Math.floor(Math.random() * Math.max(1, lines.length - 1));
      var shown = lines.slice(start, start + 2);
      var others = App.shuffle(pool.filter(function (x) { return x.id !== w.id; })).slice(0, 3);
      var choices = App.shuffle([w].concat(others));
      var done = false;
      var st = h('p', { class: 'ar-quiz-st', role: 'status' }, '이 구절은 어느 작품일까요?');
      box.appendChild(h('div', { class: 'ar-quiz-score' }, '맞힌 수 ' + quizScore.ok + ' / ' + quizScore.n));
      box.appendChild(h('blockquote', { class: 'ar-quiz-q display' }, shown.map(function (l) { return h('span', null, l); })));
      box.appendChild(st);
      var btns = h('div', { class: 'ar-quiz-choices' });
      choices.forEach(function (c) {
        btns.appendChild(h('button', { type: 'button', class: 'ar-quiz-c', onclick: function (e) {
          if (done) return;
          done = true;
          quizScore.n++;
          var ok = c.id === w.id;
          if (ok) quizScore.ok++;
          e.currentTarget.classList.add(ok ? 'is-ok' : 'is-no');
          btns.querySelectorAll('button').forEach(function (b, i) { if (choices[i].id === w.id) b.classList.add('is-ok'); });
          st.textContent = (ok ? '맞았어요! ' : '아쉬워요. ') + '「' + w.t + '」(' + w.a + ') — ' + w.theme;
          st.className = 'ar-quiz-st ' + (ok ? 'is-ok' : 'is-no');
          next.hidden = false;
          more.hidden = false;
        } }, h('b', null, c.t), h('small', null, c.a)));
      });
      box.appendChild(btns);
      var next = h('button', { type: 'button', class: 'btn', hidden: true, onclick: round }, '다음 구절 →');
      var more = h('button', { type: 'button', class: 'btn ghost', hidden: true, onclick: function () { openWork(w.id); } }, '작품 카드 보기');
      box.appendChild(h('div', { class: 'ar-quiz-nav' }, next, more));
    }
    round();
    return box;
  }

  /* ───── 작품 상세 ───── */
  function openWork(id) {
    var w = L.work(id);
    if (!w) return;
    dInner.innerHTML = '';
    var saveBtn = h('button', { type: 'button', class: 'btn small ' + (isSaved(id) ? 'coral' : 'ghost'), onclick: function () {
      var on = toggleSaved(id);
      saveBtn.className = 'btn small ' + (on ? 'coral' : 'ghost');
      saveBtn.textContent = on ? '서재에 담았어요 ✓' : '서재에 담기';
      if (state.tab === 'shelf') render();
    } }, isSaved(id) ? '서재에 담았어요 ✓' : '서재에 담기');

    var head = h('header', { class: 'ar-d-head ' + tone(w) },
      h('span', { class: 'ar-card-g' }, w.g + ' · ' + w.era),
      h('h2', { class: 'display', id: 'ar-d-title' }, w.t),
      h('p', { class: 'ar-d-meta' }, w.a + ' · ' + w.y),
      h('button', { type: 'button', class: 'ar-d-close', 'aria-label': '닫기', onclick: closeWork }, '×')
    );
    var body = h('div', { class: 'ar-d-body' });
    body.appendChild(h('p', { class: 'ar-d-theme' }, h('b', null, '주제 '), w.theme));
    body.appendChild(h('p', { class: 'ar-d-sum' }, w.sum));

    if (w.lines && w.lines.length) {
      var poem = h('blockquote', { class: 'ar-d-lines display' });
      w.lines.forEach(function (l) {
        poem.appendChild(l ? h('span', null, l) : h('span', { class: 'gap', 'aria-hidden': 'true' }));
      });
      body.appendChild(h('div', { class: 'ar-d-quote' },
        h('div', { class: 'ar-d-quote-bar' }, h('span', null, w.modern ? '인용 (현대어 표기)' : '인용'), App.sayButton(w.lines.filter(function (l) { return l && l !== '……'; }).join(' '), '읽어 주기')),
        poem));
    } else {
      body.appendChild(h('p', { class: 'ar-note' }, '이 작품은 저작권 보호 기간이 남아 있어 본문을 싣지 않았어요. 교과서나 도서관에서 원문을 함께 읽어 보세요.'));
    }

    if (w.pts && w.pts.length) {
      body.appendChild(h('h3', { class: 'ar-d-h' }, '수능·내신 감상 포인트'));
      body.appendChild(h('ul', { class: 'ar-d-pts' }, w.pts.map(function (p) { return h('li', { html: App.fmt(p) }); })));
    }

    var cons = (w.con || []).map(L.concept).filter(Boolean);
    if (cons.length) {
      body.appendChild(h('h3', { class: 'ar-d-h' }, '이 작품의 개념어'));
      var def = h('p', { class: 'ar-d-def', role: 'status' }, '개념어를 누르면 뜻이 보여요.');
      body.appendChild(h('div', { class: 'ar-d-cons' }, cons.map(function (c) {
        return h('button', { type: 'button', class: 'chip', onclick: function (e) {
          def.innerHTML = '<b>' + App.esc(c.w) + '</b> ' + App.esc(c.d);
          e.currentTarget.parentNode.querySelectorAll('.chip').forEach(function (x) { x.classList.remove('is-on'); });
          e.currentTarget.classList.add('is-on');
        } }, c.w);
      })));
      body.appendChild(def);
    }

    var pairs = (w.pair || []).map(L.work).filter(Boolean);
    if (pairs.length) {
      body.appendChild(h('h3', { class: 'ar-d-h' }, '함께 읽기 (복합 지문 연습)'));
      body.appendChild(h('div', { class: 'ar-d-pairs' }, pairs.map(function (p) {
        return h('button', { type: 'button', class: 'ar-pair', onclick: function () { openWork(p.id); } }, h('b', null, p.t), h('small', null, p.a + ' · ' + p.theme));
      })));
    }

    var links = h('div', { class: 'ar-d-links' });
    (w.units || []).forEach(function (uid) {
      var m = /^(\d+-\d)-(\d+)$/.exec(uid);
      if (!m) return;
      links.appendChild(h('a', { class: 'btn small ghost', href: 'handbook.html#/u/' + uid }, '국어 공책 ' + App.semName(m[1], true) + ' ' + Number(m[2]) + '단원'));
    });
    if (w.room && App.escape) {
      var r = App.escape.room(w.room);
      if (r) links.appendChild(h('a', { class: 'btn small coral', href: 'escape.html#' + r.id }, '방탈출 「' + r.title + '」'));
    }
    if (links.childNodes.length) {
      body.appendChild(h('h3', { class: 'ar-d-h' }, '이어서 공부하기'));
      body.appendChild(links);
    }

    dInner.appendChild(head);
    dInner.appendChild(body);
    dInner.appendChild(h('footer', { class: 'ar-d-foot' }, saveBtn));
    if (!dialog.open) {
      if (dialog.showModal) dialog.showModal();
      else dialog.setAttribute('open', '');
    }
    dInner.scrollTop = 0;
    if (location.hash !== '#w=' + id) history.replaceState(null, '', '#w=' + id);
  }
  function closeWork() {
    if (App.tts) App.tts.stop();
    if (dialog.close) dialog.close();
    else dialog.removeAttribute('open');
  }

  /* ───── 그리기 ───── */
  function renderTabs() {
    tabsEl.innerHTML = '';
    TABS.forEach(function (t) {
      tabsEl.appendChild(h('button', { type: 'button', role: 'tab', class: 'ar-tab' + (state.tab === t.id ? ' is-on' : ''), 'aria-selected': state.tab === t.id ? 'true' : 'false', onclick: function () { state.tab = t.id; render(); } },
        t.label, t.id === 'shelf' && saved().length ? h('span', { class: 'ar-tab-n' }, saved().length) : null));
    });
  }
  function render() {
    renderTabs();
    renderFilters();
    view.innerHTML = '';
    var fn = { era: viewEra, genre: viewGenre, concept: viewConcept, shelf: viewShelf, quiz: viewQuiz }[state.tab];
    view.appendChild(fn());
  }

  function shelfArt() {
    var spines = ['진달래꽃', '서시', '청산별곡', '구운몽', '날개', '절정', '춘향전', '봄봄', '가시리', '광야', '관동별곡', '동백꽃'];
    var colors = ['#2c6bd9', '#e8604c', '#2e9e6b', '#7a5cc9', '#e9a23b', '#5b4034', '#2a9db0', '#c4452f'];
    var s = '<svg viewBox="0 0 360 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="문학 작품이 꽂힌 책장">';
    s += '<rect x="10" y="10" width="340" height="280" rx="10" fill="#8a6244"/><rect x="22" y="22" width="316" height="256" rx="4" fill="#5b4034"/>';
    for (var row = 0; row < 2; row++) {
      var y0 = 30 + row * 128;
      var x = 30;
      for (var i = 0; i < 6; i++) {
        var k = row * 6 + i;
        var w = 40 + ((k * 7) % 12);
        var hgt = 96 + ((k * 13) % 18);
        var c = colors[k % colors.length];
        s += '<g><rect x="' + x + '" y="' + (y0 + 112 - hgt) + '" width="' + w + '" height="' + hgt + '" rx="3" fill="' + c + '"/>';
        s += '<rect x="' + x + '" y="' + (y0 + 112 - hgt + 10) + '" width="' + w + '" height="3" fill="rgba(255,255,255,.45)"/>';
        s += '<text x="' + (x + w / 2) + '" y="' + (y0 + 112 - hgt + 22) + '" fill="#fffdf8" font-family="Gowun Batang, serif" font-weight="700" font-size="14" text-anchor="middle" writing-mode="tb" glyph-orientation-vertical="0" letter-spacing="1">' + spines[k] + '</text></g>';
        x += w + 4;
      }
      s += '<rect x="22" y="' + (y0 + 112) + '" width="316" height="10" fill="#c39366"/>';
    }
    s += '</svg>';
    return s;
  }

  document.addEventListener('DOMContentLoaded', function () {
    App.applyBrand();
    App.mountYarns();
    view = document.getElementById('ar-view');
    filters = document.getElementById('ar-filters');
    tabsEl = document.getElementById('ar-tabs');
    dialog = document.getElementById('ar-dialog');
    dInner = document.getElementById('ar-d-inner');
    var art = document.getElementById('ar-shelf-art');
    art.innerHTML = shelfArt();
    var cat = h('div', { class: 'ar-shelf-cat', html: App.cat.peek({ mood: 'wink' }) });
    art.appendChild(cat);

    var verse = L.works.filter(L.isVerse).length;
    document.getElementById('ar-stats').textContent =
      '작품 ' + L.works.length + '편 (시가 ' + verse + ' · 산문 ' + (L.works.length - verse) + ') · 개념어 ' + L.concepts.length + '개 · 시대 ' + L.eras.length + '단계';

    var input = document.getElementById('ar-q');
    var t;
    input.addEventListener('input', function () {
      clearTimeout(t);
      t = setTimeout(function () {
        state.q = input.value.trim();
        if (state.tab === 'shelf' || state.tab === 'quiz') state.tab = 'era';
        render();
      }, 120);
    });

    dialog.addEventListener('click', function (e) {
      if (e.target === dialog) closeWork();
    });
    dialog.addEventListener('close', function () {
      if (/^#w=/.test(location.hash)) history.replaceState(null, '', location.pathname + location.search);
      render();
    });

    render();
    var m = /^#w=([\w-]+)/.exec(location.hash);
    if (m) openWork(m[1]);
    var c = /^#c=([\w-]+)/.exec(location.hash);
    if (c) {
      state.tab = 'concept';
      render();
      var el = document.getElementById('c-' + c[1]);
      if (el) { el.classList.add('is-flash'); el.scrollIntoView({ block: 'center' }); }
    }
  });
})();
