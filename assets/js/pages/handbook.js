/* 국어 공책: 표지 → 학년 고르기 → 학기 고르기 → 목차 → 두루마리 */
(function () {
  var App = window.App;
  var h = App.h;
  var H = App.hangul;
  var ST = App.standards;

  var book;
  var hint;
  var curEl = null;
  var curKey = null;
  var curDepth = 0;
  var flipping = false;
  var pending = false;
  var mapBand = '1-2';

  var TONES = ['', 'tone-coral', 'tone-mint', 'tone-amber', 'tone-violet'];
  /* 학년군(고등학교는 과목 묶음)마다 보여 줄 말. 단원 파일이 실려 있으면 문이 열리고, 없으면 ‘준비 중’으로 성취기준만 보여 준다. */
  var BAND_INFO = {
    '1-2': { no: '1·2', name: '초등 1~2학년', sub: '한글 깨치기부터 문장, 이야기, 그림일기까지' },
    '3-4': { no: '3·4', name: '초등 3~4학년', sub: '문단과 글의 짜임, 국어사전, 의견과 토의, 매체 예절' },
    '5-6': { no: '5·6', name: '초등 5~6학년', sub: '토의와 토론, 주장하는 글, 문장 성분, 작품 깊이 읽기' },
    '7-9': {
      no: '중',
      name: '중학교 1~3학년',
      sub: '품사와 문장, 음운과 한글, 논증과 토론, 시와 소설 깊이 읽기',
      intro: function (n) {
        return '교육과정에서 중학교 1~3학년은 한 묶음(학년군)이에요. 세 해 동안 여섯 영역의 성취기준 ' + n + '개를 배워요. 어느 학년에 무엇을 배우는지는 학교와 교과서마다 조금씩 달라서, 여기서는 배우기 좋은 차례로 여섯 학기에 나누어 담았어요.';
      },
    },
    high: {
      no: '고',
      name: '고등 공통국어',
      sub: '공통국어1·2 — 음운 변동, 한글 맞춤법, 논증과 토론, 한국 문학의 흐름',
      intro: function (n) {
        return '공통국어1과 공통국어2는 고등학교에서 모든 학생이 배우는 공통 과목이에요. 두 과목에 여섯 영역의 성취기준 ' + n + '개가 들어 있고, 보통 1학년 1학기와 2학기에 나누어 배워요.';
      },
    },
  };

  function wide() {
    return window.matchMedia('(min-width: 861px)').matches;
  }

  /* ───── 쪽 만들기 ───── */
  function page(side, o) {
    var body = h('div', { class: 'page-body' }, o.body);
    return h(
      'section',
      { class: 'page ' + side },
      h(
        'div',
        { class: 'page-inner' },
        h('div', { class: 'page-head' }, h('span', null, side === 'left' ? App.config.book : o.running || ''), h('span', null, side === 'left' ? o.running || '' : App.config.brand)),
        body,
        h('div', { class: 'page-foot' }, o.no ? '— ' + o.no + ' —' : '')
      )
    );
  }

  function title(text, back) {
    return h('h2', { class: 'page-title' }, text, back ? h('a', { class: 'back-btn', href: back.href }, '◀ ' + back.label) : null);
  }

  function pick(o) {
    var tag = o.href ? 'a' : 'div';
    var el = h(
      tag,
      { class: 'pick ' + (o.tone || '') + (o.soon ? ' is-soon' : '') + (o.tile ? ' is-tile' : ''), href: o.href, title: o.tip || null },
      h('span', { class: 'pick-no' }, o.no),
      h('span', { class: 'pick-main' }, h('span', { class: 'pick-title' }, o.title), o.sub ? h('span', { class: 'pick-sub' }, o.sub) : null, o.meta ? h('span', { class: 'pick-meta' }, o.meta) : null),
      h('span', { class: 'pick-go', 'aria-hidden': 'true' }, o.soon ? '준비 중' : '▶')
    );
    if (o.done) el.appendChild(h('span', { class: 'stamp', title: '발도장을 찍은 단원', html: App.cat.paw() }));
    return el;
  }

  function domChip(domain, text) {
    return h('span', { class: 'dom-chip dom-' + ST.cls(domain) }, text || domain);
  }

  function progressBox(label, done, total) {
    return h(
      'div',
      { class: 'progress' },
      h('div', { class: 'progress-row' }, h('span', null, label), h('span', null, done + ' / ' + total)),
      h('div', { class: 'progress-bar', style: { '--fill': (total ? Math.round((done / total) * 100) : 0) + '%' } }, h('i'))
    );
  }

  function doneCount(units) {
    return units.filter(function (u) {
      return App.store.isDone(u.id);
    }).length;
  }

  function bandUnits(bandKey) {
    return App.units.filter(function (u) {
      var s = App.semester(u.semKey);
      return s && s.band === bandKey;
    });
  }

  function bandStdCount(bandKey) {
    var n = 0;
    ST.order.forEach(function (d) {
      n += ST.bands[bandKey].domains[d].length;
    });
    return n;
  }

  function bandKeys() {
    return (ST.bandOrder || Object.keys(ST.bands)).filter(function (k) {
      return BAND_INFO[k];
    });
  }

  function bandOpen(bandKey) {
    return bandUnits(bandKey).length > 0;
  }

  /* 단원을 짧게 부르는 이름: ‘1-1 3단원 글자를 만들어요’, ‘중2-1 3단원 …’ */
  function unitShort(u) {
    return App.semName(u, true) + ' ' + u.no + '단원 ' + u.title;
  }

  /* ───── 펼침면들 ───── */
  function spreadCover() {
    var right = h('section', { class: 'page right is-coverpage', role: 'button', tabindex: '0', 'aria-label': App.config.book + ' 펴기', html: App.coverHTML({ editable: true }) });
    function open(e) {
      if (e.target.closest && e.target.closest('.cover-name')) return; // 이름을 쓰는 중에는 넘기지 않는다
      location.hash = '#/home';
    }
    right.addEventListener('click', open);
    right.addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ' ') && e.target === right) {
        e.preventDefault();
        location.hash = '#/home';
      }
    });
    var input = right.querySelector('[data-cover-name]');
    if (input) {
      input.addEventListener('input', function () {
        App.store.name(input.value.trim());
      });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          input.blur();
          location.hash = '#/home';
        }
      });
    }
    return { cover: true, left: h('section', { class: 'page left is-blank' }), right: right };
  }

  function spreadHome() {
    var name = App.store.name();
    var all = App.units;
    var marks = App.store
      .get()
      .marks.map(App.unitById)
      .filter(Boolean);
    var last = App.unitById(App.store.last());

    var hello = h(
      'div',
      { class: 'hello' },
      h('div', { class: 'hello-cat', html: App.cat.sit({ mood: 'happy' }) }),
      h('p', {
        class: 'hello-bubble',
        html: '안녕? 나는 랙돌 고양이 <b>' + App.esc(App.config.cat) + '</b>야.<br>' + (name ? '<b>' + App.esc(name) + '</b>' + H.josa(name, '아/야') + ', ' : '') + '나랑 같이 국어 공부하자!',
      })
    );
    var steps = h('ol', { class: 'steps' }, h('li', { html: '<b>학년과 학기</b>를 골라요.' }), h('li', { html: '<b>단원 두루마리</b>를 펼쳐요.' }), h('li', { html: '그림을 눌러 보고 <b>확인 문제</b>를 풀면 발도장 꾹!' }));

    var left = page('left', {
      running: '처음',
      no: 1,
      body: [hello, steps, progressBox('모은 발도장', doneCount(all), all.length), h('p', { class: 'note-line' }, '공부한 기록은 이 기기에만 저장돼요. 표지에 이름을 써 두면 ' + App.config.cat + '가 이름을 불러 줘요.')],
    });

    var rightBody = [title('어디부터 할까요?')];
    if (last) {
      rightBody.push(
        h('div', { class: 'picks' }, pick({ tone: 'tone-coral', no: '↩', title: '이어서 하기', sub: App.semName(last) + ' ' + last.no + '단원 · ' + last.title, href: '#/u/' + last.id }))
      );
    }
    /* 학년군을 작은 카드로 나란히: 초등 1~2 · 3~4 · 5~6 / 중학교 · 고등학교 · 교육과정 지도 */
    var tiles = h('div', { class: 'picks is-tiles' });
    bandKeys().forEach(function (key, i) {
      var info = BAND_INFO[key];
      var units = bandUnits(key);
      tiles.appendChild(
        pick({
          tile: true,
          tone: TONES[i % TONES.length],
          no: info.no,
          title: info.name,
          meta: units.length ? units.length + '단원' : '준비 중',
          soon: !units.length,
          tip: info.sub,
          href: '#/band/' + key,
        })
      );
    });
    tiles.appendChild(pick({ tile: true, tone: 'tone-violet', no: '지도', title: '교육과정 지도', meta: '성취기준 한눈에', tip: '단원과 성취기준이 어떻게 이어지는지 한눈에 보기', href: '#/map' }));
    rightBody.push(tiles);
    rightBody.push(h('p', { class: 'note-line' }, '초등학교 1학년부터 고등학교 공통국어까지, 학년을 고르면 학기와 단원이 나와요.'));

    if (marks.length) {
      rightBody.push(h('p', { class: 'note-line' }, '책갈피를 끼운 단원'));
      var mk = h('div', { class: 'std-units dom-읽기' });
      marks.forEach(function (u) {
        mk.appendChild(h('a', { href: '#/u/' + u.id }, unitShort(u)));
      });
      rightBody.push(mk);
    }
    return { left: left, right: page('right', { running: '학년 고르기', no: 2, body: rightBody }) };
  }

  function stdList(bandKey, withUnits) {
    var list = h('div', { class: 'std-list' });
    ST.order.forEach(function (d) {
      var items = ST.bands[bandKey].domains[d];
      var ul = h('ul');
      items.forEach(function (s) {
        var li = h('li', { class: 'std-item' }, h('span', { class: 'std-code' }, '[' + s.code + '] '), s.text);
        if (withUnits) {
          var units = App.units.filter(function (u) {
            return u.standards.indexOf(s.code) >= 0;
          });
          if (units.length) {
            var row = h('div', { class: 'std-units' });
            units.forEach(function (u) {
              row.appendChild(h('a', { href: '#/u/' + u.id, title: u.title }, unitShort(u)));
            });
            li.appendChild(row);
          }
          if (ST.notes[s.code]) li.appendChild(h('details', null, h('summary', null, '성취기준 해설 보기'), h('p', null, ST.notes[s.code])));
        }
        ul.appendChild(li);
      });
      list.appendChild(h('div', { class: 'std-group dom-' + ST.cls(d) }, h('h4', null, domChip(d), h('span', null, items.length + '개')), ul));
    });
    return list;
  }

  function spreadBand(key) {
    var band = ST.bands[key];
    var info = BAND_INFO[key];
    if (!band) return spreadHome();
    if (!info) return spreadHome();
    var label = info.name;
    var chips = h('div', { class: 'dom-row' });
    ST.order.forEach(function (d) {
      chips.appendChild(domChip(d, d + ' ' + band.domains[d].length));
    });
    var since = band.applied || '이 교육과정은 ' + band.since + '부터 ' + band.grades.join('·') + '학년에 적용되었어요.';

    if (!bandOpen(key)) {
      return {
        left: page('left', {
          running: label,
          no: 3,
          body: [
            title(label, { href: '#/home', label: '처음으로' }),
            h('span', { class: 'soon-stamp' }, '준비 중'),
            h('p', { class: 'page-sub' }, '이 학년의 단원 두루마리는 지금 만들고 있어요. 그동안 무엇을 배우는지 오른쪽에서 성취기준을 미리 볼 수 있어요.'),
            chips,
            h('p', { class: 'note-line' }, since),
            h('p', { class: 'note-line' }, '출처: ' + ST.source),
          ],
        }),
        right: page('right', { running: '배울 내용 미리 보기', no: 4, body: [title('이 학년에서 배우는 것'), stdList(key, false)] }),
      };
    }

    var units = bandUnits(key);
    var sems = App.semesters.filter(function (s) {
      return s.band === key;
    });
    /* 학기가 많으면(중학교 여섯 학기) 두 줄로 나란히 놓는다 */
    var many = sems.length > 4;
    var picks = h('div', { class: 'picks' + (many ? ' is-two' : '') });
    sems.forEach(function (s, i) {
      var list = App.unitsOf(s.key);
      picks.appendChild(
        pick({
          tone: TONES[i % TONES.length],
          no: s.no,
          title: many ? s.name.replace('중학교 ', '') : s.name,
          sub: many ? s.title : s.title + ' — ' + s.desc,
          meta: list.length ? list.length + '단원 · 발도장 ' + doneCount(list) + '/' + list.length : '준비 중',
          soon: !list.length,
          tip: s.desc,
          href: list.length ? '#/toc/' + s.key : null,
        })
      );
    });
    var intro = info.intro
      ? info.intro(bandStdCount(key))
      : '교육과정에서 ' + band.grades[0] + '학년과 ' + band.grades[1] + '학년은 한 묶음(학년군)이에요. 두 해 동안 여섯 영역의 성취기준 ' + bandStdCount(key) + '개를 배워요.';

    return {
      left: page('left', {
        running: label,
        no: 3,
        body: [
          title(label, { href: '#/home', label: '처음으로' }),
          h('p', { class: 'page-sub' }, intro),
          chips,
          progressBox(key === 'high' ? '공통국어에서 모은 발도장' : '이 학년군에서 모은 발도장', doneCount(units), units.length),
          h('p', { class: 'note-line' }, since),
          h('p', { class: 'note-line' }, '출처: ' + ST.source),
        ],
      }),
      right: page('right', { running: key === 'high' ? '과목 고르기' : '학기 고르기', no: 4, body: [title(key === 'high' ? '과목 고르기' : '학기 고르기'), picks] }),
    };
  }

  function unitPick(u, i) {
    return pick({
      tone: TONES[i % TONES.length],
      no: u.no,
      title: u.title,
      sub: u.hook,
      meta: [domChip(u.domain), h('span', null, '움직이는 그림 ' + u.widgetCount + ' · 확인 ' + u.quizCount)],
      done: App.store.isDone(u.id),
      href: '#/u/' + u.id,
    });
  }

  function spreadToc(key) {
    var sem = App.semester(key);
    var list = sem ? App.unitsOf(key) : [];
    if (!sem || !list.length) return spreadBand(sem ? sem.band : '1-2');
    var half = Math.ceil(list.length / 2);
    /* 한 쪽에 다섯 단원이 넘게 들어가면 카드를 조금 촘촘하게 놓는다 */
    var dense = half > 4 ? ' is-dense' : '';
    var leftPicks = h('div', { class: 'picks' + dense });
    var rightPicks = h('div', { class: 'picks' + dense });
    list.forEach(function (u, i) {
      (i < half ? leftPicks : rightPicks).appendChild(unitPick(u, i));
    });
    var name = sem.name;
    var backLabel = sem.band === 'high' ? '과목 고르기' : '학기 고르기';
    return {
      left: page('left', { running: name, no: 5, body: [title(name + ' · 목차', { href: '#/band/' + sem.band, label: backLabel }), h('p', { class: 'page-sub' }, sem.title + ' — ' + sem.desc), leftPicks] }),
      right: page('right', { running: '목차', no: 6, body: [rightPicks, h('p', { class: 'note-line' }, '단원을 누르면 두루마리가 펼쳐져요. 다 읽고 발도장을 찍으면 🐾 표시가 남아요.')] }),
    };
  }

  function spreadMap() {
    var rightBody = h('div');
    var tabs = h('div', { class: 'band-tabs' });
    var legend = h('div', { class: 'dom-row' });

    function fill() {
      rightBody.innerHTML = '';
      rightBody.appendChild(title(ST.bands[mapBand].label + ' 성취기준'));
      rightBody.appendChild(stdList(mapBand, true));
      tabs.querySelectorAll('.chip').forEach(function (c) {
        c.classList.toggle('is-on', c.dataset.band === mapBand);
      });
      legend.innerHTML = '';
      ST.order.forEach(function (d) {
        var items = ST.bands[mapBand].domains[d];
        var covered = items.filter(function (s) {
          return App.units.some(function (u) {
            return u.standards.indexOf(s.code) >= 0;
          });
        }).length;
        legend.appendChild(domChip(d, d + ' ' + covered + '/' + items.length));
      });
    }
    bandKeys().forEach(function (b) {
      tabs.appendChild(
        h('button', { type: 'button', class: 'chip', dataset: { band: b }, onclick: function () { mapBand = b; fill(); } }, ST.bands[b].short)
      );
    });
    fill();

    return {
      left: page('left', {
        running: '교육과정 지도',
        no: 3,
        body: [
          title('교육과정 지도', { href: '#/home', label: '처음으로' }),
          h('p', { class: 'page-sub' }, App.config.brand + '의 단원은 2022 개정 국어과 교육과정의 성취기준에 맞추어 만들었어요. 오른쪽에서 성취기준마다 어느 단원에서 배우는지 볼 수 있어요.'),
          tabs,
          h('p', { class: 'note-line' }, '영역별로 단원과 이어진 성취기준 수'),
          legend,
          h('p', { class: 'note-line' }, '성취기준은 학년군(초등 1~2, 3~4, 5~6학년, 중학교 1~3학년)이나 과목(고등학교 공통국어1·2)마다 정해져 있어요. 그래서 한 성취기준을 여러 학기에 걸쳐 조금씩 깊게 배우기도 해요.'),
          h('p', { class: 'note-line' }, '성취기준과 해설 문구 출처: ' + ST.source),
        ],
      }),
      right: page('right', { running: '성취기준', no: 4, body: rightBody }),
    };
  }

  /* ───── 책장 넘기기 ───── */
  function show(spread, key, depth, instant) {
    var next = h('div', { class: 'spread' + (spread.cover ? ' is-cover' : '') });
    next.appendChild(spread.left);
    next.appendChild(spread.right);
    var old = curEl;
    var dir = depth >= curDepth ? 1 : -1;
    curKey = key;
    curDepth = depth;
    book.classList.toggle('is-closed', !!spread.cover);
    hint.classList.toggle('is-off', !spread.cover);
    document.getElementById('close-book').hidden = !!spread.cover;

    if (!old || instant || !wide() || App.reducedMotion()) {
      if (old) old.remove();
      if (old && !instant) next.classList.add('is-fading');
      book.appendChild(next);
      curEl = next;
      if (!wide()) window.scrollTo(0, 0);
      return;
    }

    flipping = true;
    var forward = dir > 0;
    var leaf = h('div', { class: 'leaf ' + (forward ? 'from-right' : 'from-left') });
    var front = h('div', { class: 'leaf-face front' });
    var back = h('div', { class: 'leaf-face back' });
    var oldSide = old.querySelector(forward ? '.page.right' : '.page.left');
    var nextSide = next.querySelector(forward ? '.page.left' : '.page.right');
    book.insertBefore(next, old);
    front.appendChild(oldSide);
    back.appendChild(nextSide.cloneNode(true));
    nextSide.style.visibility = 'hidden';
    leaf.appendChild(front);
    leaf.appendChild(back);
    book.appendChild(leaf);
    curEl = next;
    void leaf.offsetWidth;
    leaf.classList.add('is-turn');

    var finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      old.remove();
      leaf.remove();
      nextSide.style.visibility = '';
      flipping = false;
      if (pending) {
        pending = false;
        route();
      }
    }
    leaf.addEventListener('transitionend', function (e) {
      if (e.target === leaf) finish();
    });
    setTimeout(finish, 1200);
  }

  /* ───── 길 찾기(#/home, #/band/1-2, #/toc/1-1, #/u/1-1-03, #/map) ───── */
  function parse() {
    var p = location.hash.replace(/^#\/?/, '').split('/');
    if (!p[0]) return { name: 'cover', depth: 0 };
    if (p[0] === 'home') return { name: 'home', depth: 1 };
    if (p[0] === 'band' && ST.bands[p[1]]) return { name: 'band', key: p[1], depth: 2 };
    if (p[0] === 'map') return { name: 'map', depth: 2 };
    if (p[0] === 'toc' && App.semester(p[1])) return { name: 'toc', key: p[1], depth: 3 };
    if (p[0] === 'u' && App.unitById(p[1])) return { name: 'unit', id: p[1], depth: 4 };
    return { name: 'home', depth: 1 };
  }

  function build(r) {
    if (r.name === 'cover') return spreadCover();
    if (r.name === 'band') return spreadBand(r.key);
    if (r.name === 'toc') return spreadToc(r.key);
    if (r.name === 'map') return spreadMap();
    return spreadHome();
  }

  function route() {
    if (flipping) {
      pending = true;
      return;
    }
    var r = parse();
    if (r.name === 'unit') {
      var unit = App.unitById(r.id);
      var tocKey = 'toc/' + unit.semKey;
      if (curKey !== tocKey) show(spreadToc(unit.semKey), tocKey, 3, true);
      App.scroll.open(unit);
      return;
    }
    var wasOpen = App.scroll.isOpen();
    App.scroll.close();
    var key = r.name + (r.key ? '/' + r.key : '');
    /* 두루마리를 보고 돌아오면 발도장이 바뀌었을 수 있으니 같은 면도 다시 그린다 */
    if (key === curKey && !wasOpen) return;
    show(build(r), key, r.depth, key === curKey || wasOpen);
  }

  document.addEventListener('DOMContentLoaded', function () {
    book = document.getElementById('book');
    hint = document.getElementById('desk-hint');
    App.applyBrand();
    App.mountYarns();
    /* 표지는 단원 파일 없이도 그릴 수 있으니 먼저 보여 주고, 단원 파일을 다 불러온 뒤에 길을 찾는다 */
    if (!location.hash.replace(/^#\/?/, '')) show(spreadCover(), 'cover', 0, true);
    App.loadUnits(function () {
      route();
      window.addEventListener('hashchange', route);
      var wasWide = wide();
      window.addEventListener('resize', function () {
        if (wide() !== wasWide) {
          wasWide = wide();
          if (!flipping && !App.scroll.isOpen()) show(build(parse()), curKey, curDepth, true);
        }
      });
    });
  });
})();
