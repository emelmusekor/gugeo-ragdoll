/* 움직이는 그림 ②  낱말과 문장: 낱말 카드 · 순서 맞추기 · 띄어쓰기 · 흉내 내는 말 · 짝 맞추기 · 나누어 담기 · 문장 만들기 */
(function () {
  var App = window.App;
  var h = App.h;
  var H = App.hangul;
  App.widgets = App.widgets || {};

  function dots(n) {
    var box = h('div', { class: 'wg-dots', 'aria-hidden': 'true' });
    for (var i = 0; i < n; i++) box.appendChild(h('i'));
    box.set = function (cur, doneUpTo) {
      Array.prototype.forEach.call(box.children, function (d, i) {
        d.className = i < doneUpTo ? 'is-done' : i === cur ? 'is-on' : '';
      });
    };
    if (n < 2) box.hidden = true;
    return box;
  }

  function feedback() {
    var el = h('p', { class: 'wg-feedback', role: 'status' });
    el.show = function (text, kind) {
      el.textContent = text;
      el.className = 'wg-feedback is-' + (kind || 'info');
    };
    el.clear = function () {
      el.textContent = '';
      el.className = 'wg-feedback';
    };
    return el;
  }

  function shake(el) {
    el.classList.remove('is-shake');
    void el.offsetWidth;
    el.classList.add('is-shake');
  }

  var GOOD = ['딩동댕! 맞았어요.', '참 잘했어요!', '우아, 맞혔어요!', '바로 그거예요!'];
  var RETRY = ['다시 한번 해 볼까요?', '조금만 더 생각해 봐요.', '괜찮아요, 한 번 더!'];

  /* ───────── 낱말 카드 ─────────
     props: items [{e:'🍎', w:'사과', d:'설명(선택)'}], flip(true면 그림만 보이다가 누르면 낱말이 나온다) */
  App.widgets.wordCards = function (el, props) {
    var items = (props && props.items) || [];
    var grid = h('div', { class: 'wg-cards' + (props && props.flip ? ' is-flip' : '') + (props && props.small ? ' is-small' : '') });
    items.forEach(function (it) {
      var card = h(
        'button',
        {
          type: 'button',
          class: 'wg-card',
          onclick: function () {
            card.classList.add('is-open');
            if (App.tts) App.tts.speak(it.say || it.w, { el: card });
          },
        },
        it.e ? h('span', { class: 'wg-card-pic' }, it.e) : null,
        h('span', { class: 'wg-card-word' }, it.w),
        it.d ? h('span', { class: 'wg-card-desc' }, it.d) : null
      );
      grid.appendChild(card);
    });
    el.appendChild(h('div', { class: 'wg wg-wordcards' }, grid, props && props.flip ? h('p', { class: 'wg-note' }, '그림을 누르면 낱말이 나와요. 먼저 소리 내어 말해 보세요.') : h('p', { class: 'wg-note' }, '카드를 누르면 소리로 읽어 줘요.')));
  };

  /* ───────── 순서 맞추기(문장 만들기 · 일의 차례) ─────────
     props: rounds [{tiles:['나는','학교에','갑니다.'], pic:'🏫', hint:'…'}]  tiles 순서가 정답 */
  App.widgets.orderTiles = function (el, props) {
    var rounds = (props && props.rounds) || [];
    var r = 0;
    var placed = [];
    var pool = [];
    var locked = false;
    var pic = h('div', { class: 'wgo-pic' });
    var hint = h('p', { class: 'wgo-hint' });
    var line = h('div', { class: 'wgo-line' });
    var poolEl = h('div', { class: 'wgo-pool' });
    var fb = feedback();
    var nextBtn = h('button', { type: 'button', class: 'btn small', hidden: true, onclick: function () { r = (r + 1) % rounds.length; start(); } }, '다음 →');
    var progress = dots(rounds.length);
    var doneCount = 0;

    function start() {
      var cur = rounds[r];
      placed = [];
      pool = App.shuffleDifferent(
        cur.tiles.map(function (t, i) {
          return { t: t, i: i };
        })
      );
      locked = false;
      pic.textContent = cur.pic || '';
      pic.hidden = !cur.pic;
      hint.textContent = cur.hint || '카드를 차례대로 눌러 보세요.';
      fb.clear();
      nextBtn.hidden = true;
      progress.set(r, doneCount);
      draw();
    }

    function tileBtn(item, from) {
      return h(
        'button',
        {
          type: 'button',
          class: 'wgo-tile',
          onclick: function () {
            if (locked) return;
            if (from === 'pool') {
              pool.splice(pool.indexOf(item), 1);
              placed.push(item);
            } else {
              placed.splice(placed.indexOf(item), 1);
              pool.push(item);
            }
            draw();
            if (!pool.length) check();
          },
        },
        item.t
      );
    }

    function draw() {
      line.innerHTML = '';
      poolEl.innerHTML = '';
      placed.forEach(function (it) {
        line.appendChild(tileBtn(it, 'line'));
      });
      if (!placed.length) line.appendChild(h('span', { class: 'wgo-empty' }, '여기에 차례대로 놓여요'));
      pool.forEach(function (it) {
        poolEl.appendChild(tileBtn(it, 'pool'));
      });
    }

    function check() {
      var cur = rounds[r];
      var ok = placed.every(function (it, i) {
        return it.t === cur.tiles[i];
      });
      if (ok) {
        locked = true;
        line.classList.add('is-right');
        doneCount = Math.max(doneCount, r + 1);
        progress.set(r, doneCount);
        fb.show(cur.done || App.pick(GOOD), 'good');
        if (cur.say !== false && App.tts) App.tts.speak(cur.say || cur.tiles.join(' '));
        if (rounds.length > 1) {
          nextBtn.hidden = false;
          nextBtn.textContent = r === rounds.length - 1 ? '처음부터 다시' : '다음 →';
        }
        setTimeout(function () {
          line.classList.remove('is-right');
        }, 900);
      } else {
        shake(line);
        fb.show(App.pick(RETRY), 'retry');
        setTimeout(function () {
          pool = App.shuffleDifferent(pool.concat(placed));
          placed = [];
          draw();
        }, 700);
      }
    }

    el.appendChild(h('div', { class: 'wg wg-order' }, progress, pic, hint, line, poolEl, h('div', { class: 'wg-foot' }, fb, nextBtn)));
    if (rounds.length) start();
  };

  /* ───────── 띄어쓰기 ─────────
     props: items [{text:'나는 학교에 갑니다.', pic:'🏫'}]  text의 띄어쓰기가 정답 */
  App.widgets.spacing = function (el, props) {
    var items = (props && props.items) || [];
    var n = 0;
    var gaps = [];
    var doneCount = 0;
    var row = h('div', { class: 'wgsp-row' });
    var pic = h('div', { class: 'wgo-pic' });
    var fb = feedback();
    var progress = dots(items.length);
    var checkBtn = h('button', { type: 'button', class: 'btn small', onclick: check }, '다 띄었어요');
    var nextBtn = h('button', { type: 'button', class: 'btn small ghost', hidden: true, onclick: function () { n = (n + 1) % items.length; start(); } }, '다음 문장 →');

    function answerGaps(text) {
      var out = [];
      var pos = 0;
      text.split('').forEach(function (ch) {
        if (ch === ' ') out.push(pos);
        else pos++;
      });
      return out;
    }

    function start() {
      var it = items[n];
      var raw = it.text.replace(/ /g, '');
      gaps = [];
      row.innerHTML = '';
      pic.textContent = it.pic || '';
      pic.hidden = !it.pic;
      raw.split('').forEach(function (ch, i) {
        if (i > 0) {
          var g = h('button', { type: 'button', class: 'wgsp-gap', 'aria-label': i + '번째 글자 뒤 띄우기', dataset: { i: i } }, h('span', null, '∨'));
          g.addEventListener('click', function () {
            var k = gaps.indexOf(i);
            if (k >= 0) gaps.splice(k, 1);
            else gaps.push(i);
            g.classList.toggle('is-on', k < 0);
            g.classList.remove('is-wrong');
            fb.clear();
          });
          row.appendChild(g);
        }
        row.appendChild(h('span', { class: 'wgsp-ch' }, ch));
      });
      fb.show('글자 사이를 눌러서 띄어 보세요.', 'info');
      nextBtn.hidden = true;
      checkBtn.hidden = false;
      progress.set(n, doneCount);
    }

    function check() {
      var it = items[n];
      var ans = answerGaps(it.text);
      var wrong = 0;
      row.querySelectorAll('.wgsp-gap').forEach(function (g) {
        var i = Number(g.dataset.i);
        var on = gaps.indexOf(i) >= 0;
        var should = ans.indexOf(i) >= 0;
        g.classList.toggle('is-wrong', on !== should && on);
        if (on !== should) wrong++;
      });
      if (!wrong) {
        doneCount = Math.max(doneCount, n + 1);
        progress.set(n, doneCount);
        fb.show(it.done || '바르게 띄어 썼어요!  ' + it.text, 'good');
        if (App.tts) App.tts.speak(it.text);
        checkBtn.hidden = true;
        if (items.length > 1) {
          nextBtn.hidden = false;
          nextBtn.textContent = n === items.length - 1 ? '처음부터 다시' : '다음 문장 →';
        }
      } else {
        shake(row);
        var missing = ans.filter(function (i) {
          return gaps.indexOf(i) < 0;
        }).length;
        fb.show(missing ? '띄어야 할 곳이 ' + missing + '군데 더 있어요.' : '붙여 써야 하는 곳을 띄었어요. 빨간 곳을 다시 눌러 보세요.', 'retry');
      }
    }

    el.appendChild(h('div', { class: 'wg wg-spacing' }, progress, pic, row, h('div', { class: 'wg-foot' }, fb, checkBtn, nextBtn)));
    if (items.length) start();
  };

  /* ───────── 흉내 내는 말 ─────────
     props: items [{e:'🐰', anim:'hop', answer:'깡충깡충', choices:[…], kind:'모양'|'소리'}] */
  App.widgets.mimic = function (el, props) {
    var items = (props && props.items) || [];
    var n = 0;
    var doneCount = 0;
    var stage = h('div', { class: 'wgm-stage' });
    var actor = h('span', { class: 'wgm-actor' });
    var word = h('span', { class: 'wgm-word' });
    var kind = h('span', { class: 'wgm-kind' });
    var choices = h('div', { class: 'wg-choices' });
    var fb = feedback();
    var progress = dots(items.length);
    var nextBtn = h('button', { type: 'button', class: 'btn small', hidden: true, onclick: function () { n = (n + 1) % items.length; start(); } }, '다음 →');
    stage.appendChild(kind);
    stage.appendChild(actor);
    stage.appendChild(word);

    function start() {
      var it = items[n];
      actor.textContent = it.e;
      actor.className = 'wgm-actor';
      word.textContent = '';
      kind.textContent = it.kind === '소리' ? '어떤 소리가 날까요?' : '어떤 모양일까요?';
      choices.innerHTML = '';
      fb.clear();
      nextBtn.hidden = true;
      progress.set(n, doneCount);
      App.shuffle(it.choices).forEach(function (c) {
        var b = h(
          'button',
          {
            type: 'button',
            class: 'wg-choice',
            onclick: function () {
              if (c === it.answer) {
                b.classList.add('is-right');
                actor.className = 'wgm-actor anim-' + (it.anim || 'hop');
                word.textContent = it.answer;
                word.className = 'wgm-word is-on';
                fb.show((it.line || '') || App.pick(GOOD), 'good');
                if (App.tts) App.tts.speak(it.say || it.answer);
                doneCount = Math.max(doneCount, n + 1);
                progress.set(n, doneCount);
                choices.querySelectorAll('button').forEach(function (x) {
                  x.disabled = true;
                });
                if (items.length > 1) {
                  nextBtn.hidden = false;
                  nextBtn.textContent = n === items.length - 1 ? '처음부터 다시' : '다음 →';
                }
              } else {
                b.classList.add('is-wrong');
                shake(b);
                fb.show(App.pick(RETRY), 'retry');
              }
            },
          },
          c
        );
        choices.appendChild(b);
      });
    }

    el.appendChild(h('div', { class: 'wg wg-mimic' }, progress, stage, choices, h('div', { class: 'wg-foot' }, fb, nextBtn)));
    if (items.length) start();
  };

  /* ───────── 짝 맞추기 ─────────
     props: pairs [['크다','작다'], …], left:'낱말', right:'반대말' */
  App.widgets.matchPairs = function (el, props) {
    var pairs = (props && props.pairs) || [];
    var leftCol = h('div', { class: 'wgp-col' });
    var rightCol = h('div', { class: 'wgp-col' });
    var fb = feedback();
    var pickL = null;
    var solved = 0;
    var COLORS = ['a', 'b', 'c', 'd', 'e', 'f'];

    function build() {
      leftCol.innerHTML = '';
      rightCol.innerHTML = '';
      solved = 0;
      pickL = null;
      fb.show('왼쪽에서 하나, 오른쪽에서 짝을 골라 보세요.', 'info');
      if (props.left) leftCol.appendChild(h('span', { class: 'wgp-head' }, props.left));
      if (props.right) rightCol.appendChild(h('span', { class: 'wgp-head' }, props.right));
      pairs.forEach(function (p, i) {
        var b = h('button', { type: 'button', class: 'wgp-item', dataset: { i: i } }, p[0]);
        b.addEventListener('click', function () {
          if (b.classList.contains('is-done')) return;
          leftCol.querySelectorAll('.is-pick').forEach(function (x) {
            x.classList.remove('is-pick');
          });
          b.classList.add('is-pick');
          pickL = i;
          if (App.tts) App.tts.speak(p[0]);
        });
        leftCol.appendChild(b);
      });
      App.shuffleDifferent(
        pairs.map(function (p, i) {
          return i;
        })
      ).forEach(function (i) {
        var b = h('button', { type: 'button', class: 'wgp-item', dataset: { i: i } }, pairs[i][1]);
        b.addEventListener('click', function () {
          if (b.classList.contains('is-done')) return;
          if (pickL == null) {
            fb.show('왼쪽 카드를 먼저 골라요.', 'info');
            return;
          }
          if (pickL === i) {
            var l = leftCol.querySelector('[data-i="' + i + '"]');
            var tone = 'tone-' + COLORS[solved % COLORS.length];
            [l, b].forEach(function (x) {
              x.classList.remove('is-pick');
              x.classList.add('is-done', tone);
            });
            solved++;
            pickL = null;
            if (App.tts) App.tts.speak(pairs[i][0] + ', ' + pairs[i][1]);
            fb.show(solved === pairs.length ? '모두 짝을 찾았어요! 참 잘했어요.' : pairs[i][0] + ' — ' + pairs[i][1] + '  ' + App.pick(GOOD), 'good');
          } else {
            shake(b);
            fb.show(App.pick(RETRY), 'retry');
          }
        });
        rightCol.appendChild(b);
      });
    }

    el.appendChild(
      h('div', { class: 'wg wg-pairs' }, h('div', { class: 'wgp-grid' }, leftCol, rightCol), h('div', { class: 'wg-foot' }, fb, h('button', { type: 'button', class: 'btn small ghost', onclick: build }, '다시 섞기')))
    );
    build();
  };

  /* ───────── 나누어 담기 ─────────
     props: bins ['자음자','모음자'], items [{w:'ㄱ', bin:0, e:'(선택)'}], ask:'어느 바구니일까요?' */
  App.widgets.sortBins = function (el, props) {
    var bins = (props && props.bins) || [];
    var items = [];
    var n = 0;
    var counts = [];
    var card = h('div', { class: 'wgb2-card' });
    var ask = h('p', { class: 'wgo-hint' }, (props && props.ask) || '어느 바구니에 담을까요?');
    var binRow = h('div', { class: 'wgb2-bins' });
    var fb = feedback();
    var left = h('span', { class: 'wgb2-left' });
    var againBtn = h('button', { type: 'button', class: 'btn small ghost', hidden: true, onclick: start }, '한 번 더');

    function start() {
      items = App.shuffle(props.items || []);
      n = 0;
      counts = bins.map(function () {
        return [];
      });
      againBtn.hidden = true;
      fb.clear();
      draw();
    }

    function draw() {
      binRow.innerHTML = '';
      bins.forEach(function (name, i) {
        var b = h(
          'button',
          {
            type: 'button',
            class: 'wgb2-bin tone-' + 'abcdef'[i % 6],
            onclick: function () {
              var it = items[n];
              if (!it) return;
              if (it.bin === i) {
                counts[i].push(it.w);
                if (App.tts) App.tts.speak(it.say || it.w);
                fb.show(it.why || App.pick(GOOD), 'good');
                n++;
                draw();
              } else {
                shake(b);
                fb.show(App.pick(RETRY), 'retry');
              }
            },
          },
          h('strong', null, name),
          h('span', { class: 'wgb2-got' }, counts[i].join(' '))
        );
        binRow.appendChild(b);
      });
      var it = items[n];
      card.innerHTML = '';
      if (it) {
        if (it.e) card.appendChild(h('span', { class: 'wgb2-pic' }, it.e));
        card.appendChild(h('span', { class: 'wgb2-word' }, it.w));
        card.classList.remove('is-pop');
        void card.offsetWidth;
        card.classList.add('is-pop');
        left.textContent = n + 1 + ' / ' + items.length;
      } else {
        card.appendChild(h('span', { class: 'wgb2-pic' }, '🎉'));
        card.appendChild(h('span', { class: 'wgb2-word is-small' }, '모두 담았어요!'));
        left.textContent = '';
        againBtn.hidden = false;
        binRow.querySelectorAll('button').forEach(function (b) {
          b.disabled = true;
        });
      }
    }

    el.appendChild(h('div', { class: 'wg wg-bins' }, ask, h('div', { class: 'wgb2-top' }, card, left), binRow, h('div', { class: 'wg-foot' }, fb, againBtn)));
    start();
  };

  /* ───────── 문장 만들기(누가 + 무엇을 + 어찌하다) ─────────
     props: who [{w:'하니', e:'🐱'}], what [{w:'우유', e:'🥛', ok:[0]}], does ['마셔요','먹어요','읽어요']
            what[].ok = 어울리는 does 번호들 */
  App.widgets.sentenceMaker = function (el, props) {
    props = props || {};
    var who = props.who || [];
    var what = props.what || [];
    var does = props.does || [];
    var sel = { who: 0, what: 0, does: 0 };
    var out = h('p', { class: 'wgsm-out' });
    var pic = h('div', { class: 'wgsm-pic' });
    var fb = feedback();
    var cols = h('div', { class: 'wgsm-cols' });

    function col(title, key, list, tone) {
      var c = h('div', { class: 'wgsm-col tone-' + tone }, h('span', { class: 'wgp-head' }, title));
      list.forEach(function (it, i) {
        var label = typeof it === 'string' ? it : (it.e ? it.e + ' ' : '') + it.w;
        c.appendChild(
          h(
            'button',
            {
              type: 'button',
              class: 'wgp-item',
              dataset: { key: key, i: i },
              onclick: function () {
                sel[key] = i;
                render(true);
              },
            },
            label
          )
        );
      });
      return c;
    }
    cols.appendChild(col('누가', 'who', who, 'a'));
    cols.appendChild(col('무엇을', 'what', what, 'b'));
    cols.appendChild(col('어찌하다', 'does', does, 'c'));

    function render(speak) {
      var a = who[sel.who];
      var b = what[sel.what];
      var v = does[sel.does];
      var sentence = a.w + H.josa(a.w, '이/가') + ' ' + b.w + H.josa(b.w, '을/를') + ' ' + v + '.';
      var ok = (b.ok || []).indexOf(sel.does) >= 0;
      out.innerHTML = '';
      out.appendChild(h('span', { class: 'tone-a' }, a.w + H.josa(a.w, '이/가')));
      out.appendChild(document.createTextNode(' '));
      out.appendChild(h('span', { class: 'tone-b' }, b.w + H.josa(b.w, '을/를')));
      out.appendChild(document.createTextNode(' '));
      out.appendChild(h('span', { class: 'tone-c' }, v + '.'));
      pic.textContent = (a.e || '') + ' ' + (ok ? b.e || '' : '❓');
      cols.querySelectorAll('.wgp-item').forEach(function (x) {
        x.classList.toggle('is-pick', sel[x.dataset.key] === Number(x.dataset.i));
      });
      if (ok) {
        fb.show('뜻이 통하는 문장이에요.', 'good');
        if (speak && App.tts) App.tts.speak(sentence);
      } else {
        fb.show('어? 말이 어색해요. ‘' + b.w + '’에 어울리는 말을 골라 보세요.', 'retry');
      }
    }

    el.appendChild(h('div', { class: 'wg wg-sentence' }, h('div', { class: 'wgsm-top' }, pic, out), cols, h('div', { class: 'wg-foot' }, fb)));
    if (who.length && what.length && does.length) render(false);
  };

  App.widgetParts = { dots: dots, feedback: feedback, shake: shake, GOOD: GOOD, RETRY: RETRY };
})();
