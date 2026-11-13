/* 움직이는 그림 ①  글자: 글자 만들기 · 쓰는 순서 · 받침이 넘어가는 소리 */
(function () {
  var App = window.App;
  var h = App.h;
  var H = App.hangul;
  var S = App.strokes;
  App.widgets = App.widgets || {};

  var NS = 'http://www.w3.org/2000/svg';
  var ROLE_NAME = { cho: '자음자', jung: '모음자', jong: '받침' };

  function svgEl(tag, attrs) {
    var el = document.createElementNS(NS, tag);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  /* 획을 차례로 그리는 애니메이션. 끝나는 때(ms)를 돌려준다. */
  function drawStrokes(paths, opts) {
    opts = opts || {};
    var t = opts.delay || 0;
    var each = opts.each || 260;
    var gap = opts.gap == null ? 70 : opts.gap;
    var still = App.reducedMotion();
    paths.forEach(function (p, i) {
      p.style.strokeDasharray = '1';
      if (still || !p.animate) {
        p.style.strokeDashoffset = '0';
        if (opts.onstroke) opts.onstroke(i, 0);
        return;
      }
      p.style.strokeDashoffset = '1';
      var a = p.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: each, delay: t, fill: 'forwards', easing: 'ease-in-out' });
      if (opts.onstroke) {
        (function (idx, when) {
          setTimeout(function () {
            opts.onstroke(idx, when);
          }, when);
        })(i, t);
      }
      if (opts.hold) opts.hold.push(a);
      t += each + gap;
    });
    return t;
  }

  /* 글자 한 자를 SVG 그룹으로. 역할(자음자·모음자·받침)마다 색이 다르다. */
  function blockGroup(syl, box) {
    var g = svgEl('g', { class: 'hg-block' });
    S.block(syl, box).forEach(function (part) {
      var pg = svgEl('g', { class: 'hg-part role-' + part.role, 'data-jamo': part.jamo });
      part.paths.forEach(function (d) {
        pg.appendChild(svgEl('path', { d: d, pathLength: 1 }));
      });
      g.appendChild(pg);
    });
    return g;
  }

  function guide(svg, size) {
    var s = size || 100;
    svg.appendChild(svgEl('rect', { x: 1, y: 1, width: s - 2, height: s - 2, rx: 6, class: 'hg-frame' }));
    svg.appendChild(svgEl('path', { d: 'M' + s / 2 + ' 4 V' + (s - 4) + ' M4 ' + s / 2 + ' H' + (s - 4), class: 'hg-guide' }));
  }

  /* ───────── 글자 만들기 ─────────
     props: cons, vowels, finals(없으면 받침 줄을 숨김), start, words(낱말 찾기 켜기) */
  App.widgets.jamoBuilder = function (el, props) {
    props = props || {};
    var cons = (props.cons || 'ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ').split('');
    var vows = (props.vowels || 'ㅏㅑㅓㅕㅗㅛㅜㅠㅡㅣ').split('');
    var fins = props.finals ? props.finals.split('') : [];
    var start = H.decompose(props.start || '가') || { cho: 'ㄱ', jung: 'ㅏ', jong: '' };
    var st = { cho: start.cho, jung: start.jung, jong: fins.length ? start.jong : '' };
    var found = {};

    var svg = svgEl('svg', { viewBox: '0 0 100 100', class: 'hg-svg', role: 'img' });
    var eq = h('div', { class: 'wgb-eq' });
    var tip = h('p', { class: 'wgb-tip' });
    var word = h('p', { class: 'wgb-word' });
    var sayBtn = App.sayButton('가', '읽어 줘');
    var rows = h('div', { class: 'wgb-pick' });

    function row(label, role, list, withNone) {
      var r = h('div', { class: 'wgb-row role-' + role }, h('span', { class: 'wgb-label' }, label));
      var box = h('div', { class: 'wgb-tiles' });
      (withNone ? [''].concat(list) : list).forEach(function (j) {
        box.appendChild(
          h(
            'button',
            {
              type: 'button',
              class: 'tile',
              dataset: { role: role, jamo: j },
              'aria-label': j ? label + ' ' + (H.NAMES[j] || j) : '받침 없음',
              onclick: function () {
                if (st[role] === j) return;
                st[role] = j;
                render(role);
              },
            },
            j || '없음'
          )
        );
      });
      r.appendChild(box);
      return r;
    }

    rows.appendChild(row('자음자', 'cho', cons));
    rows.appendChild(row('모음자', 'jung', vows));
    if (fins.length) rows.appendChild(row('받침', 'jong', fins, true));

    function render(changed) {
      var syl = H.compose(st.cho, st.jung, st.jong);
      svg.innerHTML = '';
      guide(svg);
      var g = blockGroup(syl);
      svg.appendChild(g);
      svg.setAttribute('aria-label', '글자 ' + syl);
      /* 바뀐 자모만 다시 그려 보인다 */
      var target = changed ? g.querySelectorAll('.role-' + changed + ' path') : g.querySelectorAll('path');
      drawStrokes(Array.prototype.slice.call(target), { each: 220, gap: 50 });

      eq.innerHTML = '';
      eq.appendChild(h('span', { class: 'eq-tile role-cho' }, st.cho));
      eq.appendChild(h('span', { class: 'eq-op' }, '+'));
      eq.appendChild(h('span', { class: 'eq-tile role-jung' }, st.jung));
      if (st.jong) {
        eq.appendChild(h('span', { class: 'eq-op' }, '+'));
        eq.appendChild(h('span', { class: 'eq-tile role-jong' }, st.jong));
      }
      eq.appendChild(h('span', { class: 'eq-op' }, '='));
      eq.appendChild(h('span', { class: 'eq-result' }, syl));

      var type = S.layout(st).type;
      var where =
        type === 'v'
          ? '자음자는 <b class="role-cho">왼쪽</b>, 모음자는 <b class="role-jung">오른쪽</b>에 써요.'
          : type === 'h'
          ? '자음자는 <b class="role-cho">위</b>, 모음자는 <b class="role-jung">아래</b>에 써요.'
          : '모음자가 자음자의 <b class="role-jung">아래와 오른쪽</b>을 함께 감싸요.';
      tip.innerHTML = where + (st.jong ? ' 받침은 <b class="role-jong">맨 아래</b>에 써요.' : '');

      var dict = (App.words && App.words.one) || {};
      var hit = props.words === false ? null : dict[syl];
      if (hit) {
        found[syl] = true;
        word.innerHTML = '<span class="wgb-emoji">' + hit + '</span> <b>' + syl + '</b> — 낱말이 됐어요! <small>(찾은 낱말 ' + Object.keys(found).length + '개)</small>';
        word.classList.add('is-on');
      } else {
        word.textContent = Object.keys(found).length ? '찾은 낱말: ' + Object.keys(found).join(', ') : '자모를 바꾸어 가며 뜻이 있는 낱말도 찾아보세요.';
        word.classList.remove('is-on');
      }
      sayBtn.setAttribute('data-say', syl);

      rows.querySelectorAll('.tile').forEach(function (t) {
        t.classList.toggle('is-on', st[t.dataset.role] === t.dataset.jamo);
      });
      if (changed && App.tts) App.tts.speak(syl);
    }

    el.appendChild(
      h(
        'div',
        { class: 'wg wg-builder' },
        h('div', { class: 'wgb-top' }, h('div', { class: 'wgb-stage' }, svg), h('div', { class: 'wgb-side' }, eq, tip, word, sayBtn)),
        rows
      )
    );
    render(null);
  };

  /* ───────── 쓰는 순서 ─────────
     props: letters('ㄱㄴㄷ…'), start */
  App.widgets.strokeOrder = function (el, props) {
    props = props || {};
    var letters = (props.letters || 'ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ').split('');
    var cur = props.start && letters.indexOf(props.start) >= 0 ? props.start : letters[0];
    var anims = [];
    var timers = [];
    var tracing = false;

    var svg = svgEl('svg', { viewBox: '0 0 100 100', class: 'hg-svg' });
    var canvas = h('canvas', { class: 'wgs-canvas', 'aria-label': '따라 쓰는 칸' });
    var board = h('div', { class: 'wgs-board' }, svg, canvas);
    var nameEl = h('strong', { class: 'wgs-name' });
    var countEl = h('span', { class: 'wgs-count' });
    var sayBtn = App.sayButton('', '이름 듣기');
    var tiles = h('div', { class: 'wgb-tiles wgs-letters' });
    var playBtn = h('button', { type: 'button', class: 'btn small', onclick: play }, '▶ 쓰는 순서 보기');
    var traceBtn = h('button', { type: 'button', class: 'btn small ghost', onclick: toggleTrace }, '✏️ 따라 쓰기');
    var clearBtn = h('button', { type: 'button', class: 'btn small ghost', onclick: clearCanvas, hidden: true }, '지우기');

    letters.forEach(function (j) {
      tiles.appendChild(
        h(
          'button',
          {
            type: 'button',
            class: 'tile',
            dataset: { jamo: j },
            'aria-label': H.NAMES[j] || j,
            onclick: function () {
              cur = j;
              show();
              play();
            },
          },
          j
        )
      );
    });

    function stopAll() {
      anims.forEach(function (a) {
        try {
          a.cancel();
        } catch (e) {}
      });
      anims = [];
      timers.forEach(clearTimeout);
      timers = [];
    }

    function show() {
      stopAll();
      svg.innerHTML = '';
      guide(svg);
      var list = S.jamoIn(cur, [10, 10, 80, 80]);
      var ghost = svgEl('g', { class: 'wgs-ghost' });
      var ink = svgEl('g', { class: 'wgs-ink' });
      var nums = svgEl('g', { class: 'wgs-nums' });
      var spots = S.numberSpots(list);
      list.forEach(function (d, i) {
        ghost.appendChild(svgEl('path', { d: d }));
        ink.appendChild(svgEl('path', { d: d, pathLength: 1 }));
        var g = svgEl('g', { class: 'wgs-num', transform: 'translate(' + spots[i][0] + ' ' + spots[i][1] + ')' });
        g.appendChild(svgEl('circle', { r: 5.6 }));
        var t = svgEl('text', { y: 2.6, 'text-anchor': 'middle' });
        t.textContent = i + 1;
        g.appendChild(t);
        nums.appendChild(g);
      });
      svg.appendChild(ghost);
      svg.appendChild(ink);
      svg.appendChild(nums);
      svg.setAttribute('aria-label', (H.NAMES[cur] || cur) + ' 쓰는 순서');
      nameEl.textContent = cur + '  ' + (H.NAMES[cur] || '');
      countEl.textContent = list.length + '번에 나누어 써요';
      sayBtn.setAttribute('data-say', H.NAMES[cur] || cur);
      tiles.querySelectorAll('.tile').forEach(function (t) {
        t.classList.toggle('is-on', t.dataset.jamo === cur);
      });
      ink.querySelectorAll('path').forEach(function (p) {
        p.style.strokeDasharray = '1';
        p.style.strokeDashoffset = '0';
      });
      nums.querySelectorAll('.wgs-num').forEach(function (n) {
        n.classList.add('is-on');
      });
      clearCanvas();
    }

    function play() {
      stopAll();
      var paths = Array.prototype.slice.call(svg.querySelectorAll('.wgs-ink path'));
      var nums = svg.querySelectorAll('.wgs-num');
      nums.forEach(function (n) {
        n.classList.remove('is-on');
      });
      drawStrokes(paths, {
        each: 620,
        gap: 260,
        delay: 150,
        hold: anims,
        onstroke: function (i, when) {
          if (nums[i]) nums[i].classList.add('is-on');
        },
      });
      if (App.reducedMotion())
        nums.forEach(function (n) {
          n.classList.add('is-on');
        });
    }

    /* 따라 쓰기 */
    var ctx = canvas.getContext('2d');
    var drawing = false;
    var last = null;
    function fit() {
      var r = board.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (!r.width) return;
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#2c6bd9';
      ctx.lineWidth = Math.max(8, r.width * 0.06);
    }
    function clearCanvas() {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }
    function pos(e) {
      var r = canvas.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    }
    canvas.addEventListener('pointerdown', function (e) {
      if (!tracing) return;
      if (!canvas.width || Math.abs(canvas.getBoundingClientRect().width * Math.min(window.devicePixelRatio || 1, 2) - canvas.width) > 2) fit();
      drawing = true;
      last = pos(e);
      canvas.setPointerCapture(e.pointerId);
      ctx.beginPath();
      ctx.arc(last[0], last[1], ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fill();
      e.preventDefault();
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!drawing) return;
      var p = pos(e);
      ctx.beginPath();
      ctx.moveTo(last[0], last[1]);
      ctx.lineTo(p[0], p[1]);
      ctx.stroke();
      last = p;
    });
    function end() {
      drawing = false;
    }
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);

    function toggleTrace() {
      tracing = !tracing;
      board.classList.toggle('is-tracing', tracing);
      traceBtn.classList.toggle('is-on', tracing);
      traceBtn.textContent = tracing ? '✏️ 따라 쓰는 중' : '✏️ 따라 쓰기';
      clearBtn.hidden = !tracing;
      if (tracing) {
        stopAll();
        fit();
        clearCanvas();
      }
    }

    el.appendChild(
      h(
        'div',
        { class: 'wg wg-stroke' },
        tiles,
        h(
          'div',
          { class: 'wgs-main' },
          board,
          h('div', { class: 'wgs-info' }, nameEl, countEl, sayBtn, h('div', { class: 'wgs-actions' }, playBtn, traceBtn, clearBtn), h('p', { class: 'wgs-hint' }, '숫자 순서대로 써요. 선은 ', h('b', null, '위에서 아래로, 왼쪽에서 오른쪽으로'), ' 그어요.'))
        )
      )
    );
    show();
  };

  /* ───────── 받침이 넘어가는 소리(소리와 글자가 다른 낱말) ─────────
     props: words [{w:'국어', p:'구거'}]  w=쓰는 글자, p=소리 */
  App.widgets.liaison = function (el, props) {
    var words = (props && props.words) || [{ w: '국어', p: '구거' }];
    var idx = 0;
    var svg = svgEl('svg', { class: 'hg-svg wgl-svg' });
    var written = h('span', { class: 'wgl-written' });
    var sound = h('span', { class: 'wgl-sound' });
    var tabs = h('div', { class: 'wgb-tiles wgl-words' });
    var stage = h('div', { class: 'wgl-stage' }, svg);
    var playBtn = h('button', { type: 'button', class: 'btn small', onclick: play }, '▶ 소리 내어 읽기');
    var backBtn = h('button', { type: 'button', class: 'btn small ghost', onclick: reset }, '글자로 돌아가기');
    var timers = [];

    words.forEach(function (it, i) {
      tabs.appendChild(
        h('button', { type: 'button', class: 'tile tile-word', onclick: function () { idx = i; reset(); } }, it.w)
      );
    });

    function cells(text, cls) {
      var n = text.length;
      svg.setAttribute('viewBox', '0 0 ' + n * 100 + ' 100');
      svg.style.maxWidth = n * 120 + 'px';
      svg.innerHTML = '';
      for (var i = 0; i < n; i++) {
        svg.appendChild(svgEl('rect', { x: i * 100 + 1, y: 1, width: 98, height: 98, rx: 6, class: 'hg-frame' }));
        var g = blockGroup(text[i], [i * 100 + 6, 6, 88, 88]);
        g.setAttribute('data-i', i);
        if (cls) g.classList.add(cls);
        svg.appendChild(g);
      }
    }

    function reset() {
      timers.forEach(clearTimeout);
      timers = [];
      var it = words[idx];
      cells(it.w);
      stage.classList.remove('is-sound');
      written.textContent = it.w;
      sound.textContent = '[ ? ]';
      sound.classList.remove('is-on');
      tabs.querySelectorAll('.tile').forEach(function (t, i) {
        t.classList.toggle('is-on', i === idx);
      });
    }

    function play() {
      var it = words[idx];
      reset();
      var still = App.reducedMotion();
      /* 넘어가는 받침을 찾아 다음 글자의 ㅇ 자리로 옮긴다 */
      var moves = [];
      for (var i = 0; i < it.w.length - 1; i++) {
        var a = H.decompose(it.w[i]);
        var b = H.decompose(it.w[i + 1]);
        if (a && b && a.jong && a.jong !== 'ㅇ' && b.cho === 'ㅇ') moves.push(i);
      }
      var groups = svg.querySelectorAll('.hg-block');
      moves.forEach(function (i) {
        var jongG = groups[i].querySelector('.role-jong');
        var to = groups[i + 1].querySelector('.role-cho');
        if (!jongG || !to) return;
        var jong = H.decompose(it.w[i]).jong;
        var pair = S.PAIRS[jong];
        var from = jongG;
        /* 자모 일부만 따로 움직이게 묶는다 */
        function part(start, end) {
          var g = svgEl('g', { class: 'hg-part role-jong' });
          Array.prototype.slice.call(jongG.querySelectorAll('path'), start, end).forEach(function (p) {
            g.appendChild(p);
          });
          jongG.appendChild(g);
          return g;
        }
        if (jong === 'ㅎ') {
          /* ㅎ 받침은 넘어가지 않고 소리가 사라진다 (좋아 → 조아) */
          jongG.classList.add('is-leaving');
          return;
        }
        if (pair && pair[0] !== pair[1]) {
          var n1 = S.jamo(pair[0]).length;
          if (pair[1] === 'ㅎ') {
            /* ㄶ, ㅀ: ㅎ은 사라지고 앞 자음자가 넘어간다 (많아 → 마나) */
            from = part(0, n1);
            Array.prototype.forEach.call(jongG.children, function (c) {
              if (c.tagName.toLowerCase() === 'path') c.classList.add('is-leaving');
            });
          } else {
            /* 겹받침: 뒤쪽 자음자만 넘어간다 (앉아 → 안자) */
            from = part(n1);
          }
        }
        var fb = from.getBBox();
        var tb = to.getBBox();
        var dx = tb.x + tb.width / 2 - (fb.x + fb.width / 2);
        var dy = tb.y + tb.height / 2 - (fb.y + fb.height / 2);
        from.classList.add('is-moving');
        to.classList.add('is-leaving');
        if (!still) from.style.transition = 'transform 0.9s cubic-bezier(.5,0,.3,1)';
        from.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
      });
      stage.classList.add('is-sound');
      timers.push(
        setTimeout(function () {
          cells(it.p, 'is-sound');
          sound.textContent = '[' + it.p + ']';
          sound.classList.add('is-on');
          if (App.tts) App.tts.speak(it.w);
        }, still ? 0 : moves.length ? 1100 : 400)
      );
    }

    el.appendChild(
      h(
        'div',
        { class: 'wg wg-liaison' },
        tabs,
        stage,
        h('div', { class: 'wgl-read' }, h('span', { class: 'wgl-tag' }, '쓸 때'), written, h('span', { class: 'wgl-arrow' }, '→'), h('span', { class: 'wgl-tag is-sound' }, '읽을 때'), sound),
        h('div', { class: 'wgs-actions' }, playBtn, backBtn)
      )
    );
    reset();
  };

  App.widgetUtil = { svgEl: svgEl, drawStrokes: drawStrokes, blockGroup: blockGroup, guide: guide };
})();
