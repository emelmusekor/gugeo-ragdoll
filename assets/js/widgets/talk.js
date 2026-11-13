/* 움직이는 그림 ③  말하기·읽기·쓰기: 문장 부호 · 마음을 나타내는 말 · 목소리 크기 · 말차례 · 띄어 읽기 · 이야기 읽기 · 그림일기 */
(function () {
  var App = window.App;
  var h = App.h;
  App.widgets = App.widgets || {};
  var P = App.widgetParts;

  function catBox(mood, cls) {
    var box = h('div', { class: 'wg-cat ' + (cls || '') });
    box.set = function (m) {
      box.innerHTML = App.cat.head({ mood: m });
    };
    box.set(mood || 'smile');
    return box;
  }

  /* ───────── 문장 부호 ─────────
     props: marks(선택) [{m:'.', name, when, ex, mood}] */
  App.widgets.punct = function (el, props) {
    var marks = (props && props.marks) || [
      { m: '.', name: '마침표', when: '설명하는 문장 끝에 써요.', ex: '나는 솜이야.', mood: 'smile' },
      { m: '?', name: '물음표', when: '묻는 문장 끝에 써요.', ex: '너는 누구니?', mood: 'think' },
      { m: '!', name: '느낌표', when: '느낌을 나타내는 문장 끝에 써요.', ex: '우아, 눈이 온다!', mood: 'wow' },
      { m: ',', name: '쉼표', when: '부르는 말이나 대답하는 말 뒤에 써요.', ex: '솜이야, 같이 놀자.', mood: 'wink' },
    ];
    var cur = 0;
    var cat = catBox('smile');
    var big = h('span', { class: 'wgpu-big' });
    var name = h('strong', { class: 'wgpu-name' });
    var when = h('p', { class: 'wgpu-when' });
    var ex = h('p', { class: 'wgpu-ex' });
    var say = App.sayButton('', '읽어 줘');
    var row = h('div', { class: 'wgb-tiles wgpu-row' });

    marks.forEach(function (mk, i) {
      row.appendChild(
        h('button', { type: 'button', class: 'tile wgpu-tile', 'aria-label': mk.name, onclick: function () { cur = i; render(true); } }, mk.m)
      );
    });

    function render(speak) {
      var mk = marks[cur];
      big.textContent = mk.m;
      name.textContent = mk.name;
      when.textContent = mk.when;
      ex.innerHTML = App.esc(mk.ex).replace(new RegExp('\\' + mk.m, 'g'), '<b>' + mk.m + '</b>');
      say.setAttribute('data-say', mk.ex);
      cat.set(mk.mood);
      row.querySelectorAll('.tile').forEach(function (t, i) {
        t.classList.toggle('is-on', i === cur);
      });
      if (speak && App.tts) App.tts.speak(mk.name + '. ' + mk.ex);
    }

    el.appendChild(
      h('div', { class: 'wg wg-punct' }, row, h('div', { class: 'wgpu-main' }, h('div', { class: 'wgpu-mark' }, big), h('div', { class: 'wgpu-info' }, name, when, h('div', { class: 'wgpu-bubble' }, cat, ex, say))))
    );
    render(false);
  };

  /* ───────── 마음을 나타내는 말 ─────────
     props: items [{word:'기뻐요', mood:'happy', line:'칭찬을 받아서 기뻐요.'}] */
  App.widgets.feelings = function (el, props) {
    var items = (props && props.items) || [
      { word: '기뻐요', mood: 'happy', line: '선물을 받아서 기뻐요.' },
      { word: '슬퍼요', mood: 'sad', line: '아끼던 풍선이 날아가서 슬퍼요.' },
      { word: '화나요', mood: 'angry', line: '동생이 내 그림에 낙서해서 화나요.' },
      { word: '무서워요', mood: 'scared', line: '천둥이 크게 쳐서 무서워요.' },
      { word: '부끄러워요', mood: 'shy', line: '친구들 앞에서 넘어져서 부끄러워요.' },
      { word: '신나요', mood: 'wow', line: '내일 소풍을 가서 신나요.' },
    ];
    var cur = 0;
    var cat = catBox('smile', 'is-big');
    var line = h('p', { class: 'wgf-line' });
    var say = App.sayButton('', '읽어 줘');
    var row = h('div', { class: 'wg-choices' });
    items.forEach(function (it, i) {
      row.appendChild(h('button', { type: 'button', class: 'wg-choice', onclick: function () { cur = i; render(true); } }, it.word));
    });
    function render(speak) {
      var it = items[cur];
      cat.set(it.mood);
      line.innerHTML = App.esc(it.line).replace(it.word.replace(/요$/, ''), '<mark>' + it.word.replace(/요$/, '') + '</mark>');
      say.setAttribute('data-say', it.line);
      row.querySelectorAll('button').forEach(function (b, i) {
        b.classList.toggle('is-pick', i === cur);
      });
      if (speak && App.tts) App.tts.speak(it.line);
    }
    el.appendChild(h('div', { class: 'wg wg-feel' }, h('div', { class: 'wgf-top' }, cat, h('div', { class: 'wgf-bubble' }, line, say)), row, h('p', { class: 'wg-note' }, '마음을 나타내는 말을 누르면 솜이 얼굴이 바뀌어요.')));
    render(false);
  };

  /* ───────── 목소리 크기 ─────────
     props: scenes [{label:'도서관에서 친구에게', best:1, pic:'📚'}]  best: 1(속삭임)~4(큰 소리) */
  App.widgets.voiceMeter = function (el, props) {
    var scenes = (props && props.scenes) || [
      { label: '도서관에서 친구에게 말할 때', best: 1, pic: '📚' },
      { label: '짝과 이야기할 때', best: 2, pic: '🧑‍🤝‍🧑' },
      { label: '교실에서 발표할 때', best: 3, pic: '🙋' },
      { label: '운동장에서 멀리 있는 친구를 부를 때', best: 4, pic: '🏃' },
    ];
    var LEVELS = ['', '소곤소곤', '도란도란', '또박또박', '쩌렁쩌렁'];
    var cur = 0;
    var level = 2;
    var cat = catBox('smile');
    var bubble = h('div', { class: 'wgv-bubble' }, '안녕?');
    var scenePic = h('span', { class: 'wgv-pic' });
    var levelName = h('strong', { class: 'wgv-level' });
    var fb = P.feedback();
    var tabs = h('div', { class: 'wg-choices' });
    var slider = h('input', { type: 'range', min: 1, max: 4, step: 1, value: 2, class: 'wgv-range', 'aria-label': '목소리 크기' });

    scenes.forEach(function (s, i) {
      tabs.appendChild(h('button', { type: 'button', class: 'wg-choice', onclick: function () { cur = i; render(); } }, s.label));
    });
    slider.addEventListener('input', function () {
      level = Number(slider.value);
      render();
    });

    function render() {
      var s = scenes[cur];
      scenePic.textContent = s.pic || '';
      bubble.style.fontSize = 12 + level * 7 + 'px';
      bubble.dataset.level = level;
      levelName.textContent = LEVELS[level];
      tabs.querySelectorAll('button').forEach(function (b, i) {
        b.classList.toggle('is-pick', i === cur);
      });
      if (level === s.best) {
        cat.set('happy');
        fb.show('딱 알맞은 크기예요!', 'good');
      } else if (level < s.best) {
        cat.set('think');
        fb.show('잘 안 들려요. 조금 더 크게 말해 볼까요?', 'retry');
      } else {
        cat.set('scared');
        fb.show('너무 커요! 조금 작게 말해 볼까요?', 'retry');
      }
    }

    el.appendChild(
      h(
        'div',
        { class: 'wg wg-voice' },
        tabs,
        h('div', { class: 'wgv-stage' }, scenePic, cat, bubble),
        h('div', { class: 'wgv-control' }, h('span', null, '작게'), slider, h('span', null, '크게'), levelName),
        h('div', { class: 'wg-foot' }, fb)
      )
    );
    render();
  };

  /* ───────── 말차례 ─────────
     props: lines [{who:0|1, text}], names ['솜이','보리'], pics ['🐱','🐶'] */
  App.widgets.turnTaking = function (el, props) {
    props = props || {};
    var lines = props.lines || [
      { who: 0, text: '어제 뭐 했어?' },
      { who: 1, text: '공원에서 자전거를 탔어. 너는?' },
      { who: 0, text: '나는 할머니 댁에 다녀왔어.' },
      { who: 1, text: '우아, 재미있었겠다!' },
    ];
    var names = props.names || ['솜이', '보리'];
    var pics = props.pics || ['🐱', '🐶'];
    /* compare: false 이면 ‘한꺼번에 말하기’ 없이 대화만 들려준다 (말차례가 주제가 아닌 단원에서) */
    var compare = props.compare !== false;
    var stage = h('div', { class: 'wgt-stage' });
    var fb = P.feedback();
    var seq = null;
    var timers = [];

    function clear() {
      if (seq) seq.stop();
      seq = null;
      timers.forEach(clearTimeout);
      timers = [];
      stage.innerHTML = '';
      stage.className = 'wgt-stage';
    }

    function bubble(l) {
      return h('div', { class: 'wgt-line who-' + l.who }, h('span', { class: 'wgt-face' }, pics[l.who]), h('div', { class: 'wgt-bubble' }, h('b', null, names[l.who]), l.text));
    }

    function inTurn() {
      clear();
      fb.show(compare ? '한 사람씩 차례대로 말해요.' : '대화를 차례대로 들어 봐요.', 'info');
      var els = lines.map(bubble);
      seq = App.tts.sequence(
        lines.map(function (l) {
          return l.text;
        }),
        {
          gap: 420,
          onstep: function (i) {
            if (i < 0) {
              fb.show(props.done || (compare ? '차례를 지키니 서로의 말이 잘 들려요!' : '대화를 끝까지 들었어요.'), 'good');
              return;
            }
            stage.appendChild(els[i]);
            els[i].classList.add('is-in');
          },
        }
      );
    }

    function allAtOnce() {
      clear();
      stage.classList.add('is-clash');
      lines.slice(0, 2).forEach(function (l, i) {
        var b = bubble({ who: l.who, text: l.text });
        b.classList.add('is-in', 'is-jam');
        stage.appendChild(b);
      });
      stage.appendChild(h('div', { class: 'wgt-noise', 'aria-hidden': 'true' }, '와글와글 @#%!'));
      fb.show('둘이 한꺼번에 말하니 무슨 말인지 알 수 없어요.', 'retry');
    }

    el.appendChild(
      h(
        'div',
        { class: 'wg wg-turn' },
        h('div', { class: 'wgs-actions' }, h('button', { type: 'button', class: 'btn small', onclick: inTurn }, compare ? '▶ 차례대로 말하기' : '▶ 대화 듣기'), compare ? h('button', { type: 'button', class: 'btn small ghost', onclick: allAtOnce }, '한꺼번에 말하기') : null),
        stage,
        h('div', { class: 'wg-foot' }, fb)
      )
    );
    fb.show(compare ? '버튼을 눌러 두 가지를 견주어 보세요.' : '버튼을 눌러 대화를 들어 보세요.', 'info');
    lines.slice(0, 2).forEach(function (l) {
      var b = bubble(l);
      b.classList.add('is-in', 'is-dim');
      stage.appendChild(b);
    });
  };

  /* ───────── 띄어 읽기 ─────────
     props: text '나는∨학교에∨갑니다.≫친구도∨같이∨갑니다.'   ∨ 조금 쉬기, ≫ 조금 더 쉬기 */
  App.widgets.pauseRead = function (el, props) {
    var text = (props && props.text) || '';
    var tokens = [];
    text.split(/([∨≫])/).forEach(function (t) {
      if (t === '∨' || t === '≫') tokens.push({ mark: t });
      else if (t.trim()) tokens.push({ text: t.trim() });
    });
    var chunks = tokens.filter(function (t) {
      return t.text;
    });
    var line = h('p', { class: 'wgr-line' });
    var fb = P.feedback();
    var seq = null;
    var spans = [];

    tokens.forEach(function (t) {
      if (t.mark) {
        /* ≫ 는 겹쐐기표(쐐기표 두 개를 겹친 모양)로 보여 준다 */
        line.appendChild(h('span', { class: 'wgr-mark' + (t.mark === '≫' ? ' is-long' : ''), title: t.mark === '≫' ? '겹쐐기표: 조금 더 쉬어 읽기' : '쐐기표: 조금 쉬어 읽기' }, t.mark === '≫' ? '∨∨' : '∨'));
      } else {
        var s = h('span', { class: 'wgr-chunk' }, t.text);
        spans.push(s);
        line.appendChild(s);
      }
    });

    function gapAfter(i) {
      /* i번째 덩이 뒤의 표시에 따라 쉬는 길이를 정한다 */
      var idx = tokens.indexOf(chunks[i]);
      var next = tokens[idx + 1];
      if (!next || !next.mark) return 250;
      return next.mark === '≫' ? 950 : 430;
    }

    function stop() {
      if (seq) seq.stop();
      seq = null;
      spans.forEach(function (s) {
        s.classList.remove('is-on');
      });
    }

    function play() {
      stop();
      fb.show('∨에서는 조금, ≫에서는 조금 더 쉬어요.', 'info');
      seq = App.tts.sequence(
        chunks.map(function (c) {
          return c.text;
        }),
        {
          gap: gapAfter,
          onstep: function (i) {
            spans.forEach(function (s, k) {
              s.classList.toggle('is-on', k === i);
            });
            if (i < 0) fb.show('알맞게 띄어 읽으니 뜻이 잘 전해져요.', 'good');
          },
        }
      );
    }

    function rush() {
      stop();
      fb.show('쉬지 않고 읽으면 숨이 차고 뜻을 알기 어려워요.', 'retry');
      App.tts.speak(
        chunks
          .map(function (c) {
            return c.text;
          })
          .join(''),
        { rate: 1.35 }
      );
    }

    el.appendChild(
      h(
        'div',
        { class: 'wg wg-read' },
        line,
        h('div', { class: 'wgs-actions' }, h('button', { type: 'button', class: 'btn small', onclick: play }, '▶ 띄어 읽기'), h('button', { type: 'button', class: 'btn small ghost', onclick: rush }, '쉬지 않고 읽기')),
        h('div', { class: 'wg-foot' }, fb)
      )
    );
  };

  /* ───────── 이야기·시 읽기(따라 읽기) ─────────
     props: title, pic, by(선택), lines [..], poem(true면 가운데 정렬) */
  App.widgets.story = function (el, props) {
    props = props || {};
    var lines = props.lines || [];
    var body = h('div', { class: 'wgst-body' + (props.poem ? ' is-poem' : '') });
    var seq = null;
    var btn = h('button', { type: 'button', class: 'btn small', onclick: toggle }, '▶ 읽어 주기');
    var ps = lines.map(function (l) {
      if (l === '') return h('span', { class: 'wgst-gap' });
      var p = h('p', { class: 'wgst-line', 'data-say': l, html: App.fmt(l) });
      return p;
    });
    ps.forEach(function (p) {
      body.appendChild(p);
    });
    var speakable = ps.filter(function (p) {
      return p.tagName === 'P';
    });

    function toggle() {
      if (seq) {
        seq.stop();
        seq = null;
        btn.textContent = '▶ 읽어 주기';
        return;
      }
      btn.textContent = '■ 그만 읽기';
      seq = App.tts.sequence(
        speakable.map(function (p) {
          return p.getAttribute('data-say');
        }),
        {
          gap: props.poem ? 520 : 380,
          onstep: function (i) {
            speakable.forEach(function (p, k) {
              p.classList.toggle('is-on', k === i);
            });
            if (i >= 0 && speakable[i].scrollIntoView) speakable[i].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            if (i < 0) {
              seq = null;
              btn.textContent = '▶ 읽어 주기';
            }
          },
        }
      );
    }

    el.appendChild(
      h(
        'div',
        { class: 'wg wg-story' },
        h('div', { class: 'wgst-head' }, props.pic ? h('span', { class: 'wgst-pic' }, props.pic) : null, h('div', null, h('strong', { class: 'wgst-title' }, props.title || ''), props.by ? h('span', { class: 'wgst-by' }, props.by) : null), btn),
        body,
        h('p', { class: 'wg-note' }, '한 줄을 누르면 그 줄만 읽어 줘요.')
      )
    );
  };

  /* ───────── 그림일기 ─────────
     props: did(선택) [{e, text, more}], feel(선택) [{e, text}] */
  App.widgets.diary = function (el, props) {
    props = props || {};
    var weather = [
      { e: '☀️', w: '맑음' },
      { e: '⛅', w: '구름 조금' },
      { e: '🌧️', w: '비' },
      { e: '⛄', w: '눈' },
    ];
    var did = props.did || [
      { e: '🎠', text: '놀이터에서 그네를 탔다.', more: '하늘까지 올라가는 것 같았다.' },
      { e: '🍉', text: '가족과 수박을 먹었다.', more: '씨를 누가 멀리 뱉나 내기를 했다.' },
      { e: '🚲', text: '아빠와 자전거를 탔다.', more: '처음으로 혼자 다섯 바퀴를 굴렸다.' },
      { e: '🎂', text: '동생 생일잔치를 했다.', more: '내가 만든 카드를 선물로 주었다.' },
    ];
    var feel = props.feel || [
      { e: '😊', text: '참 재미있었다.' },
      { e: '🥰', text: '마음이 뿌듯했다.' },
      { e: '😮', text: '정말 신기했다.' },
      { e: '😋', text: '또 하고 싶다.' },
    ];
    var sel = { w: 0, d: 0, f: 0 };
    var now = new Date();
    var DAYS = ['일', '월', '화', '수', '목', '금', '토'];
    var dateText = now.getFullYear() + '년 ' + (now.getMonth() + 1) + '월 ' + now.getDate() + '일 ' + DAYS[now.getDay()] + '요일';

    var page = h('div', { class: 'wgd-page' });
    var pick = h('div', { class: 'wgd-pick' });

    function group(title, key, list, tone) {
      var g = h('div', { class: 'wgd-group tone-' + tone }, h('span', { class: 'wgp-head' }, title));
      var row = h('div', { class: 'wg-choices' });
      list.forEach(function (it, i) {
        row.appendChild(
          h('button', { type: 'button', class: 'wg-choice', dataset: { key: key, i: i }, onclick: function () { sel[key] = i; render(); } }, it.e + ' ' + (it.w || it.text.replace(/\.$/, '')))
        );
      });
      g.appendChild(row);
      return g;
    }
    pick.appendChild(group('① 날씨', 'w', weather, 'a'));
    pick.appendChild(group('② 있었던 일', 'd', did, 'b'));
    pick.appendChild(group('③ 생각이나 느낌', 'f', feel, 'c'));

    function render() {
      var w = weather[sel.w];
      var d = did[sel.d];
      var f = feel[sel.f];
      var text = d.text + ' ' + d.more + ' ' + f.text;
      page.innerHTML = '';
      page.appendChild(
        h('div', { class: 'wgd-head' }, h('span', { class: 'wgd-tag tone-a' }, '날짜와 요일'), h('span', null, dateText), h('span', { class: 'wgd-tag tone-a' }, '날씨'), h('span', null, w.e + ' ' + w.w))
      );
      page.appendChild(h('div', { class: 'wgd-pic' }, h('span', { class: 'wgd-tag tone-b' }, '그림'), h('span', { class: 'wgd-emoji' }, d.e), h('span', { class: 'wgd-sky' }, w.e)));
      var grid = h('div', { class: 'wgd-text' });
      grid.appendChild(h('span', { class: 'wgd-tag tone-b' }, '있었던 일'));
      grid.appendChild(h('span', { class: 'wgd-tag tone-c' }, '생각·느낌'));
      grid.appendChild(h('p', { html: '<span class="tone-b">' + App.esc(d.text + ' ' + d.more) + '</span> <span class="tone-c">' + App.esc(f.text) + '</span>' }));
      grid.appendChild(App.sayButton(text, '읽어 줘'));
      page.appendChild(grid);
      pick.querySelectorAll('.wg-choice').forEach(function (b) {
        b.classList.toggle('is-pick', sel[b.dataset.key] === Number(b.dataset.i));
      });
    }

    el.appendChild(h('div', { class: 'wg wg-diary' }, pick, page));
    render();
  };
})();
