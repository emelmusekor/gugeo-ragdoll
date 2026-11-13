/* 움직이는 그림 ④  3~4학년: 글에서 골라 누르기 · 표정과 말투 · 발표 자료 만들기 */
(function () {
  var App = window.App;
  var h = App.h;
  App.widgets = App.widgets || {};
  var P = App.widgetParts;

  /* ───────── 글에서 골라 누르기 ─────────
     문단에서 중심 문장 찾기, 의견을 나타낸 문장 찾기, 높임 표현이 들어간 낱말 찾기처럼
     글의 한 부분을 눌러서 고르는 활동.
     props: rounds [{ title, ask, parts:['문장', …], answer:[정답 번호, …], lines:true(한 줄에 하나씩), done:'맞혔을 때 설명', hint:'틀렸을 때 도움말' }]
            한 판만이면 rounds 없이 같은 모양을 바로 써도 된다. */
  App.widgets.pickParts = function (el, props) {
    props = props || {};
    var rounds = props.rounds || [props];
    var r = 0;
    var doneCount = 0;
    var ask = h('p', { class: 'wgo-hint' });
    var body = h('div', { class: 'wgpk-body' });
    var fb = P.feedback();
    var progress = P.dots(rounds.length);
    var nextBtn = h('button', { type: 'button', class: 'btn small', hidden: true, onclick: function () { r = (r + 1) % rounds.length; start(); } }, '다음 →');

    function start() {
      var cur = rounds[r];
      var need = (cur.answer || []).length;
      var found = 0;
      ask.textContent = cur.ask || '알맞은 곳을 찾아 눌러 보세요.';
      body.className = 'wgpk-body' + (cur.lines ? ' is-lines' : '');
      body.innerHTML = '';
      nextBtn.hidden = true;
      progress.set(r, doneCount);
      if (cur.title) body.appendChild(h('strong', { class: 'wgpk-title' }, cur.title));
      var text = h('div', { class: 'wgpk-text' });
      (cur.parts || []).forEach(function (part, i) {
        var b = h(
          'button',
          {
            type: 'button',
            class: 'wgpk-part',
            onclick: function () {
              if (b.classList.contains('is-right') || found === need) return;
              if (cur.answer.indexOf(i) >= 0) {
                b.classList.add('is-right');
                found++;
                if (found === need) {
                  doneCount = Math.max(doneCount, r + 1);
                  progress.set(r, doneCount);
                  fb.show(cur.done || App.pick(P.GOOD), 'good');
                  if (rounds.length > 1) {
                    nextBtn.hidden = false;
                    nextBtn.textContent = r === rounds.length - 1 ? '처음부터 다시' : '다음 →';
                  }
                } else {
                  fb.show('맞아요! ' + (need - found) + '곳을 더 찾아보세요.', 'good');
                }
              } else {
                b.classList.add('is-wrong');
                P.shake(b);
                setTimeout(function () {
                  b.classList.remove('is-wrong');
                }, 800);
                fb.show(cur.hint || App.pick(P.RETRY), 'retry');
              }
            },
          },
          part
        );
        text.appendChild(b);
        text.appendChild(document.createTextNode(' '));
      });
      body.appendChild(text);
      fb.show(need > 1 ? '모두 ' + need + '곳을 찾아야 해요.' : '한 곳을 골라 눌러 보세요.', 'info');
    }

    el.appendChild(h('div', { class: 'wg wg-pick' }, progress, ask, body, h('div', { class: 'wg-foot' }, fb, nextBtn)));
    if (rounds.length) start();
  };

  /* ───────── 표정과 말투 ─────────
     같은 말도 표정과 말투에 따라 다르게 전해진다는 것을 보여 준다.
     props: { say:'괜찮아.', items:[{ label:'활짝 웃으며', mood:'happy', mean:'정말 괜찮다는 마음이 전해져요.', voice:'high' }] }
     voice(선택): fast 빠르게 · slow 느리게 · high 높게 · low 낮게 · soft 작게 */
  var VOICES = {
    fast: { rate: 1.25 },
    slow: { rate: 0.6 },
    high: { pitch: 1.6 },
    low: { pitch: 0.55, rate: 0.75 },
    soft: { volume: 0.35, rate: 0.75 },
  };

  App.widgets.faces = function (el, props) {
    props = props || {};
    var items = props.items || [];
    var cur = 0;
    var cat = h('div', { class: 'wg-cat is-big' });
    var bubble = h('p', { class: 'wgf-line' }, props.say || '');
    var mean = h('p', { class: 'wgfc-mean' });
    var row = h('div', { class: 'wg-choices' });
    var again = h('button', { type: 'button', class: 'say-btn', 'aria-label': '다시 듣기', onclick: function () { render(true); } });
    again.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.2L12 5.6v12.8l-4.8-3.9H4z" fill="currentColor"/><path d="M15.2 8.6a4.8 4.8 0 0 1 0 6.8M17.6 6.2a8.2 8.2 0 0 1 0 11.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><span>들어 보기</span>';

    items.forEach(function (it, i) {
      row.appendChild(h('button', { type: 'button', class: 'wg-choice', onclick: function () { cur = i; render(true); } }, it.label));
    });

    function render(speak) {
      var it = items[cur];
      if (!it) return;
      cat.innerHTML = App.cat.head({ mood: it.mood || 'smile' });
      bubble.textContent = it.say || props.say || '';
      mean.textContent = it.mean || '';
      row.querySelectorAll('button').forEach(function (b, i) {
        b.classList.toggle('is-pick', i === cur);
      });
      if (speak && App.tts) App.tts.speak(it.say || props.say || '', VOICES[it.voice] || {});
    }

    el.appendChild(
      h('div', { class: 'wg wg-faces' }, h('div', { class: 'wgf-top' }, cat, h('div', { class: 'wgf-bubble' }, bubble, again)), mean, row, h('p', { class: 'wg-note' }, '표정과 말투를 바꾸어 가며 같은 말이 어떻게 다르게 전해지는지 살펴보세요.'))
    );
    render(false);
  };

  /* ───────── 발표 자료 만들기 ─────────
     제목 · 그림 · 글을 골라 발표 자료 한 장을 꾸며 본다.
     props: { topic:'우리 반 텃밭', titles:[{ t:'우리 반 텃밭 이야기', ok:true }, { t:'재미있는 이야기', ok:false }],
              pics:[{ e:'🥬', ok:true }, { e:'🚀', ok:false }],
              short:['상추와 방울토마토를 심었어요', '날마다 물을 주었어요', '한 달 뒤 열매가 열렸어요'],
              long:'우리 반은 봄에 텃밭에 상추와 방울토마토를 심고 날마다 물을 주었는데 한 달이 지나자 열매가 열려서 모두 기뻐했습니다.' } */
  App.widgets.slideMaker = function (el, props) {
    props = props || {};
    var titles = props.titles || [];
    var pics = props.pics || [];
    var sel = { title: titles.length - 1, pic: pics.length - 1, text: 'long' };
    var slide = h('div', { class: 'wgsl-slide' });
    var checks = h('ul', { class: 'wgsl-checks' });
    var pick = h('div', { class: 'wgd-pick' });
    var fb = P.feedback();

    function group(name, key, list, tone, labelOf) {
      var g = h('div', { class: 'wgd-group tone-' + tone }, h('span', { class: 'wgp-head' }, name));
      var row = h('div', { class: 'wg-choices' });
      list.forEach(function (it, i) {
        row.appendChild(
          h('button', { type: 'button', class: 'wg-choice', dataset: { key: key, v: String(i) }, onclick: function () { sel[key] = key === 'text' ? it.v : i; render(); } }, labelOf(it))
        );
      });
      g.appendChild(row);
      return g;
    }
    pick.appendChild(group('① 제목', 'title', titles, 'a', function (it) { return it.t; }));
    pick.appendChild(group('② 그림', 'pic', pics, 'b', function (it) { return it.e; }));
    pick.appendChild(group('③ 글', 'text', [{ v: 'short', t: '중요한 내용만 짧게' }, { v: 'long', t: '긴 문장 그대로' }], 'c', function (it) { return it.t; }));

    function render() {
      var title = titles[sel.title] || { t: '' };
      var pic = pics[sel.pic] || { e: '' };
      var short = sel.text === 'short';
      slide.innerHTML = '';
      slide.appendChild(h('div', { class: 'wgsl-title' }, title.t));
      var body = h('div', { class: 'wgsl-body' }, h('div', { class: 'wgsl-pic' }, pic.e));
      if (short) {
        var ul = h('ul', { class: 'wgsl-points' });
        (props.short || []).forEach(function (s) {
          ul.appendChild(h('li', null, s));
        });
        body.appendChild(ul);
      } else {
        body.appendChild(h('p', { class: 'wgsl-long' }, props.long || ''));
      }
      slide.appendChild(body);

      var result = [
        { ok: !!title.ok, good: '제목만 보아도 무엇을 발표하는지 알 수 있어요.', bad: '제목에 발표할 주제가 드러나지 않아요.' },
        { ok: !!pic.ok, good: '그림이 내용과 잘 어울려요.', bad: '그림이 발표 내용과 어울리지 않아요.' },
        { ok: short, good: '중요한 내용만 짧게 써서 한눈에 들어와요.', bad: '글이 길어서 듣는 사람이 읽기 어려워요.' },
      ];
      checks.innerHTML = '';
      result.forEach(function (c) {
        checks.appendChild(h('li', { class: c.ok ? 'is-ok' : 'is-no' }, c.ok ? c.good : c.bad));
      });
      var all = result.every(function (c) {
        return c.ok;
      });
      if (all) fb.show('한눈에 들어오는 발표 자료가 되었어요!', 'good');
      else fb.show('제목, 그림, 글을 바꾸어 가며 더 좋은 발표 자료로 고쳐 보세요.', 'info');
      pick.querySelectorAll('.wg-choice').forEach(function (b) {
        var key = b.dataset.key;
        var on = key === 'text' ? (b.dataset.v === '0') === short : sel[key] === Number(b.dataset.v);
        b.classList.toggle('is-pick', on);
      });
    }

    el.appendChild(h('div', { class: 'wg wg-slide' }, props.topic ? h('p', { class: 'wgo-hint' }, '발표 주제: ' + props.topic) : null, slide, checks, pick, h('div', { class: 'wg-foot' }, fb)));
    render();
  };
})();
