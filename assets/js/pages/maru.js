/* 하니네 마루: 끝말잇기 · 초성 퀴즈 · 삼행시 빨랫줄 */
(function () {
  var App = window.App;
  var h = App.h;
  var H = App.hangul;
  var catEl;
  var bubbleEl;
  var panel;

  /* 하니가 말하기 */
  function say(text, mood, jump) {
    bubbleEl.textContent = text;
    bubbleEl.style.animation = 'none';
    void bubbleEl.offsetWidth;
    bubbleEl.style.animation = '';
    catEl.innerHTML = App.cat.sit({ mood: mood || 'smile' });
    if (jump) {
      catEl.classList.add('is-jump');
      setTimeout(function () {
        catEl.classList.remove('is-jump');
      }, 450);
    }
  }

  function status() {
    var el = h('p', { class: 'g-status', role: 'status' });
    el.set = function (text, kind) {
      el.textContent = text;
      el.className = 'g-status' + (kind ? ' is-' + kind : '');
    };
    return el;
  }

  function eulo(syl) {
    return '‘' + syl + '’' + H.josa(syl, '으로/로');
  }

  /* ───────── 끝말잇기 ───────── */
  function gameChain(root) {
    var words = App.words.chain;
    var used = [];
    var over = false;
    var wins = App.store.maru('chainWins') || 0;
    var chainEl = h('div', { class: 'chain', 'aria-live': 'polite' });
    var input = h('input', { class: 'g-input', type: 'text', maxlength: '8', placeholder: '낱말을 써요', autocomplete: 'off', 'aria-label': '내 낱말', lang: 'ko' });
    var st = status();
    var score = h('span', { class: 'g-score' });

    function isUsed(w) {
      return used.some(function (u) {
        return u.w === w;
      });
    }
    function starts(w, syl) {
      return H.dueum(syl).indexOf(w[0]) >= 0;
    }
    function lastSyl() {
      var w = used[used.length - 1].w;
      return w[w.length - 1];
    }
    function candidates(syl) {
      return words.filter(function (w) {
        return starts(w, syl) && !isUsed(w);
      });
    }
    /* 하니는 되도록 다음 사람이 이을 수 있는 낱말을 고른다 */
    function catPick(syl) {
      var list = candidates(syl);
      if (!list.length) return null;
      var fair = list.filter(function (w) {
        return candidates(w[w.length - 1]).length > 1;
      });
      return App.pick(fair.length ? fair : list);
    }

    function render() {
      chainEl.innerHTML = '';
      used.forEach(function (u, i) {
        if (i) chainEl.appendChild(h('span', { class: 'chain-arrow' }, '→'));
        chainEl.appendChild(h('span', { class: 'chain-word' + (u.who === 'me' ? ' is-me' : '') }, h('small', null, u.who === 'me' ? '나' : App.config.cat), h('span', { html: App.esc(u.w.slice(0, -1)) + '<u>' + App.esc(u.w.slice(-1)) + '</u>' })));
      });
      if (!over) {
        chainEl.appendChild(h('span', { class: 'chain-arrow' }, '→'));
        chainEl.appendChild(h('span', { class: 'chain-next', title: '이 글자로 시작해요' }, lastSyl()));
      }
      score.textContent = '내가 이긴 판 ' + wins;
      chainEl.scrollTop = chainEl.scrollHeight;
    }

    function start() {
      var starters = words.filter(function (w) {
        return w.length <= 3 && candidates(w[w.length - 1]).length > 2;
      });
      var first = App.pick(starters);
      used = [{ w: first, who: 'cat' }];
      over = false;
      input.disabled = false;
      input.value = '';
      say('내가 먼저 할게. “' + first + '”!', 'happy', true);
      st.set(eulo(lastSyl()) + ' 시작하는 낱말을 써 보세요.');
      render();
    }

    function submit() {
      if (over) return;
      var w = input.value.trim();
      if (!w) return;
      var need = lastSyl();
      if (!H.isHangulWord(w)) return st.set('한글 낱말로 써 주세요.', 'bad');
      if (w.length < 2) return st.set('한 글자 낱말은 안 돼요. 두 글자부터 쓸 수 있어요.', 'bad');
      if (!starts(w, need)) return st.set(eulo(need) + ' 시작해야 해요.', 'bad');
      if (isUsed(w)) return st.set('이미 나온 낱말이에요. 다른 낱말을 떠올려 봐요.', 'bad');
      used.push({ w: w, who: 'me' });
      input.value = '';
      var end = w[w.length - 1];
      var reply = catPick(end);
      if (!reply) {
        over = true;
        wins++;
        App.store.maru('chainWins', wins);
        input.disabled = true;
        say('앗, ' + eulo(end) + ' 시작하는 말이 생각 안 나… 네가 이겼어!', 'wow', true);
        st.set('이겼어요! ‘새로 하기’를 누르면 한 판 더 할 수 있어요.', 'good');
      } else {
        used.push({ w: reply, who: 'cat' });
        say('“' + reply + '”!', 'smile', true);
        if (App.tts) App.tts.speak(reply);
        st.set(eulo(lastSyl()) + ' 시작하는 낱말!');
      }
      render();
      if (!over) input.focus();
    }

    function hint() {
      if (over) return;
      var list = candidates(lastSyl());
      if (!list.length) {
        over = true;
        input.disabled = true;
        say('이건 나도 모르겠어. 이번 판은 비긴 걸로 하자!', 'think');
        st.set('이을 낱말이 없어요. ‘새로 하기’를 눌러요.');
        render();
        return;
      }
      var w = App.pick(list);
      say('귓속말로 알려 줄게. 초성은 ' + H.chosung(w) + '!', 'wink');
      st.set('도움말: ' + w.length + '글자 낱말이고, 초성은 ' + H.chosung(w) + '예요.');
    }

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.isComposing) submit();
    });

    root.appendChild(h('h2', null, '끝말잇기'));
    root.appendChild(h('p', { class: 'rule' }, App.config.cat + '가 말한 낱말의 끝 글자로 시작하는 낱말을 이어 가요. 두 글자부터, 사전에 있는 낱말만 쓰기로 약속!'));
    root.appendChild(chainEl);
    root.appendChild(h('div', { class: 'g-row' }, input, h('button', { type: 'button', class: 'btn', onclick: submit }, '말하기'), h('button', { type: 'button', class: 'btn ghost', onclick: hint }, '도움말'), h('button', { type: 'button', class: 'btn ghost', onclick: start }, '새로 하기')));
    root.appendChild(h('div', { class: 'g-row' }, st, score));
    start();
  }

  /* ───────── 초성 퀴즈 ───────── */
  function gameCho(root) {
    var pool = App.shuffle(App.words.quiz);
    var idx = 0;
    var streak = 0;
    var best = App.store.maru('choBest') || 0;
    var letters = h('div', { class: 'wongoji cho-letters' });
    var hintEl = h('p', { class: 'cho-hint' });
    var pic = h('div', { class: 'cho-pic' });
    var choices = h('div', { class: 'cho-choices' });
    var st = status();
    var score = h('span', { class: 'g-score' });
    var nextBtn = h('button', { type: 'button', class: 'btn', hidden: true, onclick: next }, '다음 문제 →');

    function next() {
      var it = pool[idx % pool.length];
      idx++;
      var others = App.shuffle(
        pool.filter(function (o) {
          return o.w !== it.w && o.w.length === it.w.length && H.chosung(o.w) !== H.chosung(it.w);
        })
      ).slice(0, 3);
      letters.innerHTML = '';
      H.chosung(it.w)
        .split('')
        .forEach(function (c) {
          letters.appendChild(h('span', { class: 'cell' }, c));
        });
      hintEl.textContent = it.d;
      pic.textContent = '❓';
      choices.innerHTML = '';
      nextBtn.hidden = true;
      st.set('초성을 보고 알맞은 낱말을 골라 보세요.');
      score.textContent = '이어 맞히기 ' + streak + ' · 최고 ' + best;
      App.shuffle([it].concat(others)).forEach(function (o) {
        var b = h(
          'button',
          {
            type: 'button',
            class: 'cho-choice',
            onclick: function () {
              if (!nextBtn.hidden) return;
              if (o.w === it.w) {
                b.classList.add('is-right');
                pic.textContent = it.e;
                streak++;
                if (streak > best) {
                  best = streak;
                  App.store.maru('choBest', best);
                }
                say(App.pick(['딩동댕! “' + it.w + '” 맞아!', '우아, 잘한다!', '정답이야! 야옹!']), 'happy', true);
                if (App.tts) App.tts.speak(it.w);
                st.set('정답! ' + it.w + ' — ' + it.d, 'good');
                nextBtn.hidden = false;
              } else {
                b.classList.add('is-wrong');
                b.disabled = true;
                streak = 0;
                say('음… 초성을 하나씩 다시 살펴봐!', 'think');
                st.set('‘' + o.w + '’의 초성은 ' + H.chosung(o.w) + '예요. 다시 골라 보세요.', 'bad');
              }
              score.textContent = '이어 맞히기 ' + streak + ' · 최고 ' + best;
            },
          },
          o.w
        );
        choices.appendChild(b);
      });
    }

    root.appendChild(h('h2', null, '초성 퀴즈'));
    root.appendChild(h('p', { class: 'rule' }, '낱말의 첫소리(초성)만 보고 어떤 낱말인지 맞혀요. 뜻풀이가 실마리예요.'));
    root.appendChild(h('div', { class: 'cho-card' }, pic, letters, hintEl));
    root.appendChild(choices);
    root.appendChild(h('div', { class: 'g-row' }, st, score, nextBtn));
    say('초성만 보고 맞혀 봐. 준비됐지?', 'wink');
    next();
  }

  /* ───────── 삼행시 빨랫줄 ───────── */
  var POEM_WORDS = ['고양이', '무지개', '소나기', '다람쥐', '도토리', '바나나', '자전거', '코끼리', '솜사탕', '개나리', '병아리', '옥수수', '눈사람', '놀이터', '우리말', '한글날'];
  var POEM_EXAMPLES = {
    고양이: ['고개를 들어 보니', '양지바른 마루 위에', '이불처럼 누운 하니!'],
    무지개: ['무슨 색이 제일 좋아?', '지금 하늘 좀 봐!', '개나리색도 걸려 있어.'],
    소나기: ['소리도 없이 오더니', '나뭇잎을 톡톡 두드리고', '기지개 켜니 벌써 그쳤네.'],
  };

  function gamePoem(root) {
    var word = App.pick(POEM_WORDS);
    var form = h('div', { class: 'poem-form' });
    var example = h('div', { class: 'poem-example' });
    var listEl = h('div', { class: 'clothesline' });
    var st = status();
    var inputs = [];

    function poems() {
      return App.store.maru('poems') || [];
    }

    function drawForm() {
      form.innerHTML = '';
      inputs = [];
      word.split('').forEach(function (syl, i) {
        var input = h('input', { class: 'g-input', type: 'text', maxlength: '24', placeholder: eulo(syl) + ' 시작하는 한 줄', 'aria-label': syl + ' 줄', autocomplete: 'off', lang: 'ko' });
        input.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' && !e.isComposing) {
            if (inputs[i + 1]) inputs[i + 1].focus();
            else hang();
          }
        });
        inputs.push(input);
        form.appendChild(h('div', { class: 'poem-line' }, h('span', { class: 'cell' }, syl), input));
      });
      var ex = POEM_EXAMPLES[word] || POEM_EXAMPLES['고양이'];
      var exWord = POEM_EXAMPLES[word] ? word : '고양이';
      example.innerHTML = '<b>' + App.esc(App.config.cat) + '의 본보기 (' + exWord + ')</b><br>' + ex.map(App.esc).join('<br>');
      st.set('‘' + word + '’' + H.josa(word, '으로/로') + ' 삼행시를 지어 보세요. 줄마다 그 글자로 시작하면 돼요.');
    }

    function drawList() {
      var list = poems();
      listEl.innerHTML = '';
      if (!list.length) {
        listEl.appendChild(h('p', { class: 'line-empty' }, '아직 걸린 삼행시가 없어요. 첫 쪽지를 걸어 보세요!'));
        return;
      }
      list.forEach(function (p, i) {
        var body = h('div');
        p.lines.forEach(function (l) {
          body.appendChild(h('div', null, l));
        });
        listEl.appendChild(
          h(
            'div',
            { class: 'note' },
            h('b', null, p.word),
            body,
            h('time', null, p.at),
            h(
              'button',
              {
                type: 'button',
                'aria-label': p.word + ' 삼행시 떼기',
                onclick: function () {
                  var cur = poems();
                  cur.splice(i, 1);
                  App.store.maru('poems', cur);
                  drawList();
                },
              },
              '×'
            )
          )
        );
      });
    }

    function hang() {
      var lines = [];
      for (var i = 0; i < inputs.length; i++) {
        var v = inputs[i].value.trim();
        if (!v) {
          st.set('‘' + word[i] + '’ 줄이 비어 있어요.', 'bad');
          inputs[i].focus();
          return;
        }
        /* 줄 첫 글자가 빠졌으면 붙여 준다 */
        lines.push(v[0] === word[i] ? v : word[i] + v);
      }
      var list = poems();
      list.unshift({ word: word, lines: lines, at: new Date().toISOString().slice(0, 10) });
      App.store.maru('poems', list.slice(0, 30));
      say('우아, 멋진 삼행시야! 빨랫줄에 걸어 뒀어.', 'happy', true);
      st.set('빨랫줄에 걸었어요!', 'good');
      newWord();
      drawList();
    }

    function newWord() {
      var prev = word;
      for (var n = 0; n < 8 && word === prev; n++) word = App.pick(POEM_WORDS);
      drawForm();
    }

    root.appendChild(h('h2', null, '삼행시 빨랫줄'));
    root.appendChild(h('p', { class: 'rule' }, '낱말의 글자 하나하나로 시작하는 짧은 글을 지어요. 다 지으면 빨랫줄에 걸어 두고 다음에 와서 다시 읽어 봐요.'));
    root.appendChild(form);
    root.appendChild(h('div', { class: 'g-row' }, h('button', { type: 'button', class: 'btn coral', onclick: hang }, '빨랫줄에 걸기'), h('button', { type: 'button', class: 'btn ghost', onclick: newWord }, '다른 낱말')));
    root.appendChild(st);
    root.appendChild(example);
    root.appendChild(h('div', { class: 'line-wrap' }, h('h3', null, '내가 걸어 둔 삼행시'), listEl));
    say('세 글자로 시를 지어 볼까? 엉뚱해도 좋아!', 'smile');
    drawForm();
    drawList();
  }

  /* ───────── 방석(놀이 고르기) ───────── */
  var GAMES = [
    { key: 'chain', icon: '🧶', name: '끝말잇기', sub: App.config.cat + '와 한 판', run: gameChain },
    { key: 'cho', icon: '🔎', name: '초성 퀴즈', sub: '첫소리로 맞히기', run: gameCho },
    { key: 'poem', icon: '📝', name: '삼행시 빨랫줄', sub: '짓고 걸어 두기', run: gamePoem },
  ];

  function open(key) {
    var game =
      GAMES.filter(function (g) {
        return g.key === key;
      })[0] || GAMES[0];
    document.querySelectorAll('.maru-tab').forEach(function (t) {
      t.setAttribute('aria-selected', t.dataset.key === game.key ? 'true' : 'false');
    });
    if (App.tts) App.tts.stop();
    panel.innerHTML = '';
    game.run(panel);
    App.store.maru('lastGame', game.key);
  }

  document.addEventListener('DOMContentLoaded', function () {
    catEl = document.getElementById('maru-cat');
    bubbleEl = document.getElementById('maru-bubble');
    panel = document.getElementById('maru-panel');
    App.applyBrand();
    App.mountYarns();
    document.getElementById('maru-scene').innerHTML = App.scene.maru({ cat: false });
    catEl.innerHTML = App.cat.sit({ mood: 'happy' });
    var tabs = document.getElementById('maru-tabs');
    GAMES.forEach(function (g) {
      tabs.appendChild(
        h('button', { type: 'button', class: 'maru-tab', role: 'tab', dataset: { key: g.key }, onclick: function () { open(g.key); } }, h('i', { 'aria-hidden': 'true' }, g.icon), h('b', null, g.name), h('span', null, g.sub))
      );
    });
    var name = App.store.name();
    open(App.store.maru('lastGame') || 'chain');
    if (name) say(name + H.josa(name, '아/야') + ', 어서 와! 오늘은 뭐 하고 놀까?', 'happy', true);
  });
})();
