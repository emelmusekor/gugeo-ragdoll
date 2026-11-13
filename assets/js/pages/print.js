/* 학습지 인쇄: data/sheets.js 의 학습지를 A4 쪽으로 만들어 보여 줍니다. */
(function () {
  var App = window.App;
  var h = App.h;
  var H = App.hangul;
  var S = App.strokes;

  var params = new URLSearchParams(location.search);
  var sheet = (App.sheets || []).filter(function (s) {
    return s.id === params.get('sheet');
  })[0];
  var showKey = params.get('key') === '1';

  /* ───── 칸 만들기 ───── */
  function cell(ch, cls) {
    var punc = /^[.,?!]$/.test(ch);
    return h('div', { class: 'cell' + (cls ? ' ' + cls : '') + (punc ? ' punc' : '') }, ch === ' ' ? '' : ch);
  }
  function cells(text, cls) {
    return String(text)
      .split('')
      .map(function (ch) {
        return cell(ch, cls);
      });
  }
  function blanks(n) {
    var out = [];
    for (var i = 0; i < n; i++) out.push(cell('', ''));
    return out;
  }
  function row(list, size) {
    return h('div', { class: 'row', style: size ? { '--c': size } : null }, list);
  }
  function chunk(arr, n) {
    var out = [];
    for (var i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
    return out;
  }
  /* 여러 쪽에 고르게 나누기 */
  function spread(items, perPage) {
    var pages = Math.ceil(items.length / perPage);
    var size = Math.ceil(items.length / pages);
    return chunk(items, size);
  }

  function jamoCell(j, mode) {
    var paths = S.jamoIn(j, [15, 15, 70, 70]);
    var svg = '<svg viewBox="0 0 100 100" aria-hidden="true">';
    paths.forEach(function (d) {
      svg += '<path class="' + (mode === 'model' ? 'jm' : 'jt') + '" d="' + d + '"/>';
    });
    if (mode === 'model') {
      S.numberSpots(paths, 20).forEach(function (p, i) {
        svg += '<circle class="jn" cx="' + p[0] + '" cy="' + p[1] + '" r="9.5"/><text class="jnt" x="' + p[0] + '" y="' + (p[1] + 4.3) + '">' + (i + 1) + '</text>';
      });
    }
    return h('div', { class: 'cell', html: svg + '</svg>' });
  }

  /* ───── 학습지 종류별로 쪽 만들기: [{sub, body:[…]}] ───── */
  function buildJamo(s) {
    var letters = s.letters.split('');
    var extra = s.rows <= 5; // 글자 수가 적으면 빈 줄을 하나 더 준다
    return chunk(letters, s.rows).map(function (group) {
      return {
        sub: '빨간 숫자 순서대로 써요. 회색 글자를 따라 쓴 다음, 빈칸에 혼자 써 보세요.',
        body: group.map(function (j) {
          var first = [jamoCell(j, 'model'), jamoCell(j, 'trace'), jamoCell(j, 'trace'), jamoCell(j, 'trace')].concat(blanks(5));
          var block = h('div', { class: 'jamo-row' }, h('div', { class: 'jamo-label' }, H.NAMES[j] || j), h('div', null, row(first), extra ? row(blanks(9)) : null));
          return block;
        }),
      };
    });
  }

  function buildTable(s) {
    var cons = 'ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ'.split('');
    var vows = 'ㅏㅑㅓㅕㅗㅛㅜㅠㅡㅣ'.split('');
    function table(withBlanks) {
      var head = h('tr', null, h('th', { class: 'corner' }, ''));
      vows.forEach(function (v) {
        head.appendChild(h('th', null, v));
      });
      var body = h('tbody');
      cons.forEach(function (c, r) {
        var tr = h('tr', null, h('th', null, c));
        vows.forEach(function (v, k) {
          var hide = withBlanks && (r + k) % 2 === 1;
          tr.appendChild(h('td', { class: hide ? 'blank' : '' }, H.compose(c, v, '')));
        });
        body.appendChild(tr);
      });
      return h('table', { class: 'syl-table' }, h('thead', null, head), body);
    }
    return [
      { sub: '왼쪽의 자음자와 위쪽의 모음자가 만나 글자가 돼요. 가로로, 세로로 소리 내어 읽어 보세요.', body: [table(false)] },
      { sub: '빈칸에 들어갈 글자를 써 보세요. 자음자와 모음자를 합치면 돼요.', body: [table(true)] },
    ];
  }

  function buildText(s) {
    var COLS = 10;
    var SIZE = '16.4mm';
    var blocks = s.items.map(function (text) {
      var len = text.length;
      var rows = [];
      if (len <= 4) {
        /* 낱말: 본보기 + 따라 쓰기 + 빈칸을 한 줄에 */
        var line = cells(text, 'ink');
        var copies = len <= 2 ? 2 : 1;
        for (var k = 0; k < copies; k++) line = line.concat(cells(text, 'ghost'));
        rows.push(row(line.concat(blanks(COLS - line.length)), SIZE));
      } else {
        /* 문장: 본보기 줄, 따라 쓰는 줄, 혼자 쓰는 줄 */
        var parts = chunk(text.split(''), COLS);
        ['ink', 'ghost', ''].forEach(function (cls) {
          parts.forEach(function (p) {
            var line = cls === '' ? blanks(COLS) : p.map(function (ch) { return cell(ch, cls); }).concat(blanks(COLS - p.length));
            rows.push(row(line, SIZE));
          });
        });
      }
      return { el: h('div', { class: 'block' }, rows), lines: rows.length };
    });
    /* 한 쪽에 들어가는 줄 수에 맞추어 나누기 */
    var MAX = 228; // mm
    var pages = [[]];
    var used = 0;
    blocks.forEach(function (b) {
      var need = b.lines * 16.4 + 4.5;
      if (used + need > MAX && pages[pages.length - 1].length) {
        pages.push([]);
        used = 0;
      }
      pages[pages.length - 1].push(b.el);
      used += need;
    });
    /* 마지막 쪽이 너무 비면 앞쪽과 고르게 */
    if (pages.length > 1) {
      var flat = [].concat.apply([], pages);
      pages = spread(flat, Math.ceil(flat.length / pages.length));
    }
    return pages.map(function (p) {
      return { sub: '검은 글자를 읽고, 회색 글자를 따라 쓴 다음, 빈칸에 혼자 써 보세요.', body: p };
    });
  }

  function buildSpacing(s, key) {
    var COLS = 12;
    var SIZE = '15mm';
    return spread(
      s.items.map(function (text, i) {
        return { text: text, no: i + 1 };
      }),
      5
    ).map(function (group) {
      return {
        sub: key ? '정답이에요. 띄어 쓴 곳을 견주어 보세요.' : '붙어 있는 문장을 읽고, 알맞게 띄어 아래 칸에 옮겨 써 보세요. 띄는 곳은 한 칸을 비워요.',
        body: group.map(function (it) {
          var line = key ? cells(it.text, 'ink').concat(blanks(Math.max(0, COLS - it.text.length))) : blanks(COLS);
          return h('div', { class: 'sp-item' }, h('div', { class: 'sp-q' }, h('b', null, it.no), it.text.replace(/ /g, '')), row(line, SIZE), key ? null : row(blanks(COLS), SIZE));
        }),
      };
    });
  }

  function buildDictation(s) {
    var COLS = 11;
    return s.sets.map(function (set, i) {
      var body = [];
      for (var n = 1; n <= 10; n++) body.push(h('div', { class: 'dict-row' }, h('span', { class: 'dict-no' }, n + '.'), row(blanks(COLS))));
      body.push(h('div', { class: 'dict-score' }, '맞은 개수', h('i'), '/ 10'));
      body.push(h('p', { class: 'pg-note' }, '틀려도 괜찮아요! 틀린 글자는 바르게 한 번만 다시 써 보면 충분해요.'));
      return { title: s.title + ' — ' + (i + 1) + '회', sub: set.name + ' · 불러 주는 말을 잘 듣고 칸에 맞추어 써요.', body: body };
    });
  }

  function buildDictationKey(s) {
    var withNo = s.sets.map(function (set, i) {
      return { set: set, no: i + 1 };
    });
    return chunk(withNo, 6).map(function (group, gi) {
      var cols = h('div', { class: 'key-cols' });
      group.forEach(function (g) {
        var ol = h('ol');
        g.set.items.forEach(function (it) {
          ol.appendChild(h('li', null, it));
        });
        cols.appendChild(h('div', { class: 'key-set' }, h('h3', null, g.no + '회 · ' + g.set.name), ol));
      });
      var body = [cols];
      if (gi === 0) {
        body.unshift(
          h('p', { class: 'pg-note', style: { marginTop: '0', marginBottom: '5mm' } }, '불러 주는 법: 보통 빠르기로 한 번, 천천히 한 번 불러 주세요. 교육과정은 받아쓰기가 부담이 되지 않도록 신중하게 쓰라고 안내합니다. 점수보다 스스로 고쳐 써 보는 경험을 칭찬해 주세요.')
        );
      }
      return { title: s.title + ' — 불러 주는 글', sub: '어른이 보고 불러 주는 쪽이에요.', body: body, noName: true };
    });
  }

  function buildDiary() {
    var text = h('div', { class: 'diary-text' });
    for (var i = 0; i < 5; i++) text.appendChild(row(blanks(10)));
    return [
      {
        sub: '오늘 있었던 일 가운데 하나를 골라 그림으로 그리고, 있었던 일과 생각이나 느낌을 써요.',
        body: [
          h(
            'div',
            { class: 'diary-top' },
            h('span', null, h('i'), '년 ', h('i'), '월 ', h('i'), '일 ', h('i'), '요일'),
            h('span', { class: 'weather' }, h('small', null, '날씨'), '☀️', '⛅', '☁️', '☂️', '⛄')
          ),
          h('div', { class: 'diary-pic' }, h('span', null, '그림')),
          text,
        ],
      },
    ];
  }

  function buildGrid() {
    var body = [];
    for (var i = 0; i < 13; i++) body.push(row(blanks(10), '18.2mm'));
    return [{ sub: '한 칸에 한 글자씩 써요. 띄어 쓰는 곳은 한 칸을 비워요.', body: [h('div', { class: 'block' }, body)] }];
  }

  /* ───── 3~4학년 학습지 ───── */

  /* 국어사전 차례와 기본형. 정답은 글자 코드 순서(=사전 차례)로 자동 정렬해서 만든다. */
  function buildDict(s, key) {
    var groups = h('div', { class: 'dict-groups' });
    s.groups.forEach(function (g, i) {
      var sorted = g.slice().sort();
      var given = h('div', { class: 'dict-given' });
      g.forEach(function (w) {
        given.appendChild(h('span', null, w));
      });
      var slots = h('div', { class: 'dict-slots' });
      sorted.forEach(function (w, k) {
        if (k) slots.appendChild(h('em', null, '→'));
        slots.appendChild(h('span', { class: key ? 'is-key' : '' }, key ? w : ''));
      });
      groups.appendChild(h('div', { class: 'dict-group' }, h('b', null, i + 1), h('div', null, given, slots)));
    });
    var forms = h('div', { class: 'dict-forms' });
    s.forms.forEach(function (f, i) {
      forms.appendChild(h('div', { class: 'dict-form' }, h('b', null, i + 1), h('span', { class: 'dict-word' }, f[0]), h('em', null, '→'), h('span', { class: 'dict-blank' + (key ? ' is-key' : '') }, key ? f[1] : '')));
    });
    return [
      { title: '국어사전 ① 실리는 차례' + (key ? ' (정답)' : ''), sub: '낱말을 국어사전에 실리는 차례대로 옮겨 써요. 첫 자음자 → 모음자 → 받침 차례로 견주어요.', body: [groups] },
      { title: '국어사전 ② 기본형' + (key ? ' (정답)' : ''), sub: '형태가 바뀐 낱말을 국어사전에서 찾으려면 기본형을 알아야 해요. 기본형을 써 보세요.', body: [forms, h('p', { class: 'pg-note' }, '기본형은 형태가 바뀌지 않는 부분에 ‘-다’를 붙인 꼴이에요. ‘걸어서 → 걷다’, ‘도와서 → 돕다’처럼 모양이 조금 달라지는 낱말도 있어요.')] },
    ];
  }

  /* 고쳐 쓰기(높임 표현 등) */
  function buildRewrite(s, key) {
    var body = s.items.map(function (it, i) {
      return h('div', { class: 'rw-item' }, h('div', { class: 'rw-q' }, h('b', null, i + 1), it.q), h('div', { class: 'rw-line' + (key ? ' is-key' : '') }, key ? it.a : ''), key ? null : h('div', { class: 'rw-line' }));
    });
    return [{ title: s.title + (key ? ' (정답)' : ''), sub: key ? '내가 쓴 문장과 견주어 보세요. 높임이 알맞으면 조금 달라도 괜찮아요.' : s.guide, body: body }];
  }

  /* 짜임에 맞추어 쓰는 양식(문단 · 편지 · 보고하는 글 · 의견) */
  function buildForm(s) {
    var body = s.sections.map(function (sec) {
      var lines = h('div', { class: 'form-lines' });
      for (var i = 0; i < sec.lines; i++) lines.appendChild(h('i'));
      return h('div', { class: 'form-sec' }, h('div', { class: 'form-label' }, h('b', null, sec.label), sec.note ? h('span', null, sec.note) : null), lines);
    });
    if (s.checks) {
      body.push(
        h(
          'div',
          { class: 'form-checks' },
          h('b', null, '다 쓴 뒤에 스스로 살펴봐요'),
          h(
            'ul',
            null,
            s.checks.map(function (c) {
              return h('li', null, c);
            })
          )
        )
      );
    }
    return [{ sub: s.guide || s.desc, body: body }];
  }

  /* 400자 원고지 (20칸 × 20줄) */
  function buildManuscript() {
    var ms = h('div', { class: 'ms' });
    for (var r = 0; r < 20; r++) {
      var line = h('div', { class: 'ms-row' });
      for (var c = 0; c < 20; c++) line.appendChild(h('span'));
      ms.appendChild(line);
    }
    return [{ sub: '한 칸에 한 글자씩 써요. 문단을 시작할 때는 첫 칸을 비우고, 문장 부호도 한 칸에 써요.', body: [ms] }];
  }

  function build(s) {
    if (showKey && s.kind === 'dictation') return buildDictationKey(s);
    switch (s.kind) {
      case 'dict':
        return buildDict(s, showKey);
      case 'rewrite':
        return buildRewrite(s, showKey);
      case 'form':
        return buildForm(s);
      case 'manuscript':
        return buildManuscript();
      case 'jamo':
        return buildJamo(s);
      case 'table':
        return buildTable(s);
      case 'text':
        return buildText(s);
      case 'spacing':
        return buildSpacing(s, showKey);
      case 'dictation':
        return buildDictation(s);
      case 'diary':
        return buildDiary();
      case 'grid':
        return buildGrid();
      default:
        return [];
    }
  }

  /* ───── 쪽 틀 ───── */
  function render() {
    var root = document.getElementById('pages');
    var titleEl = document.getElementById('toolbar-title');
    if (!sheet) {
      titleEl.textContent = '학습지를 찾을 수 없어요';
      root.appendChild(h('p', { style: { textAlign: 'center', padding: '60px 20px' } }, '주소가 올바르지 않아요. ', h('a', { href: 'index.html#shelf', style: { textDecoration: 'underline' } }, '학습지 서랍'), '에서 다시 골라 주세요.'));
      document.getElementById('print-btn').hidden = true;
      return;
    }
    var pages = build(sheet);
    var keyName = showKey ? ' (' + (sheet.keyLabel || '정답') + ')' : '';
    titleEl.textContent = sheet.title + keyName;
    document.title = sheet.title + keyName + ' — ' + App.config.brand;
    var std = (sheet.std || [])
      .map(function (c) {
        return '[' + c + ']';
      })
      .join(' ');

    pages.forEach(function (p, i) {
      root.appendChild(
        h(
          'section',
          { class: 'pg' },
          h(
            'header',
            { class: 'pg-head' },
            h('div', null, h('h1', { class: 'pg-title' }, p.title || sheet.title + (showKey && sheet.kind === 'spacing' ? ' — 정답' : '')), h('p', { class: 'pg-sub' }, p.sub || sheet.desc)),
            p.noName ? null : h('div', { class: 'pg-name' }, '이름 ', h('i'), h('br'), h('i', { class: 'short' }), '월 ', h('i', { class: 'short' }), '일')
          ),
          h('div', { class: 'pg-body' }, p.body),
          h('footer', { class: 'pg-foot' }, h('span', { class: 'foot-cat', html: App.cat.head({ blink: false }) }), h('span', null, App.config.brand + ' ' + App.config.shelf + (std ? ' · 성취기준 ' + std : '')), h('span', null, i + 1 + ' / ' + pages.length))
        )
      );
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    render();
    document.getElementById('print-btn').addEventListener('click', function () {
      window.print();
    });
  });
})();
