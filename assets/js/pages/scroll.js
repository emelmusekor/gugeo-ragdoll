/* 단원 두루마리: 본문 · 움직이는 그림 · 확인 문제 · 한 장 요약 · 발도장 */
(function () {
  var App = window.App;
  var h = App.h;
  var ST = App.standards;
  var view = null;
  var state = null;

  function shake(el) {
    el.classList.remove('is-shake');
    void el.offsetWidth;
    el.classList.add('is-shake');
  }

  /* ───── 블록 그리기 ───── */
  function blockP(b) {
    var p = h('p', { class: 'blk blk-p', html: App.fmt(b.text) + ' ' });
    p.appendChild(App.sayButton(b.say || b.text));
    return p;
  }

  function blockSay(b) {
    var bubble = h('div', { class: 'say-bubble', html: App.fmt(b.text) + ' ' });
    bubble.appendChild(App.sayButton(b.say || b.text));
    return h('div', { class: 'blk blk-say' }, h('div', { class: 'say-cat', html: App.cat.head({ mood: b.mood || 'smile' }) }), bubble);
  }

  function blockWidget(b) {
    var mount = h('div', { class: 'widget-mount' });
    var fn = App.widgets && App.widgets[b.kind];
    if (fn) {
      try {
        fn(mount, b.props || {});
      } catch (e) {
        mount.textContent = '이 그림을 불러오지 못했어요.';
        if (window.console) console.error(b.kind, e);
      }
    } else {
      mount.textContent = '준비 중인 그림이에요. (' + b.kind + ')';
    }
    return h('figure', { class: 'blk blk-widget' }, h('figcaption', null, h('span', { class: 'tag tag-move' }, '움직이는 그림'), b.title ? h('span', { class: 'widget-title' }, b.title) : null), mount, b.note ? h('p', { class: 'widget-note', html: App.fmt(b.note) }) : null);
  }

  function blockBox(b) {
    var body = h('div', { class: 'box-body' });
    (b.lines || []).forEach(function (l) {
      body.appendChild(l === '' ? h('span', { class: 'box-gap' }) : h('p', { html: App.fmt(l) }));
    });
    var head = h('div', { class: 'box-head' }, h('strong', null, b.title || '보기'));
    head.appendChild(App.sayButton((b.lines || []).join(' '), '읽어 줘'));
    return h('div', { class: 'blk blk-box' + (b.center ? ' is-center' : '') }, head, body);
  }

  /* 정리 표: { t:'table', title, head:[…], rows:[[…]], note, rowHead:false } — 첫 칸은 줄 제목으로 굵게 보인다 */
  function blockTable(b) {
    var rowHead = b.rowHead !== false;
    var table = h('table');
    if (b.head && b.head.length) {
      table.appendChild(
        h(
          'thead',
          null,
          h(
            'tr',
            null,
            b.head.map(function (c) {
              return h('th', { scope: 'col', html: App.fmt(String(c)) });
            })
          )
        )
      );
    }
    var body = h('tbody');
    (b.rows || []).forEach(function (r) {
      body.appendChild(
        h(
          'tr',
          null,
          r.map(function (c, i) {
            return i === 0 && rowHead ? h('th', { scope: 'row', html: App.fmt(String(c)) }) : h('td', { html: App.fmt(String(c)) });
          })
        )
      );
    });
    table.appendChild(body);
    var sayText = (b.head && b.head.length ? b.head.join(', ') + '. ' : '') +
      (b.rows || [])
        .map(function (r) {
          return r.join(', ');
        })
        .join('. ');
    var head = h('div', { class: 'box-head' }, h('strong', null, b.title || '정리'));
    head.appendChild(App.sayButton(sayText, '읽어 줘'));
    return h('div', { class: 'blk blk-box blk-table' }, head, h('div', { class: 'table-wrap' }, table), b.note ? h('p', { class: 'table-note', html: App.fmt(b.note) }) : null);
  }

  /* 도움말: 초등은 함께하는 어른께, 중·고는 공부하는 학생에게 */
  function blockTip(b, unit) {
    var sem = unit && App.semester(unit.semKey);
    return h('aside', { class: 'blk blk-tip' }, h('strong', null, sem && sem.teen ? '공부 도움말' : '함께하는 어른께'), h('p', { html: App.fmt(b.text) }));
  }

  function quizHead(b, sayText) {
    var q = h('p', { class: 'quiz-q', html: App.fmt(b.q) + ' ' });
    q.appendChild(App.sayButton(sayText));
    return h('div', { class: 'quiz-head' }, h('span', { class: 'tag tag-check' }, '확인'), q);
  }

  function blockQuiz(b, unit, onChange) {
    var solved = App.store.unit(unit.id).quiz[b.key] === true;
    var big = b.choices.every(function (c) {
      return String(c).length <= 3;
    });
    var why = h('p', { class: 'quiz-why', hidden: true });
    var choices = h('div', { class: 'quiz-choices' + (big ? ' is-big' : '') });
    var root = h('div', { class: 'blk blk-quiz' });
    /* 보기 순서는 볼 때마다 섞는다(keep: true 이면 쓴 순서 그대로) */
    var order = b.choices.map(function (c, i) {
      return i;
    });
    if (!b.keep) order = App.shuffle(order);
    var sayText =
      b.q +
      ' ' +
      order
        .map(function (ci, n) {
          return n + 1 + '번, ' + b.choices[ci];
        })
        .join('. ');

    function solve(live) {
      root.classList.add('is-solved');
      choices.querySelectorAll('button').forEach(function (btn) {
        btn.disabled = true;
        btn.classList.remove('is-wrong');
        if (Number(btn.dataset.i) === b.answer) btn.classList.add('is-right');
      });
      why.hidden = false;
      why.className = 'quiz-why is-good';
      why.innerHTML = '<b>딩동댕!</b> ' + App.fmt(b.why || '잘 골랐어요.');
      if (live) {
        App.store.answer(unit.id, b.key, true);
        onChange();
      }
    }

    order.forEach(function (ci, n) {
      var c = b.choices[ci];
      var btn = h(
        'button',
        {
          type: 'button',
          class: 'wg-choice',
          dataset: { i: ci },
          onclick: function () {
            if (root.classList.contains('is-solved')) return;
            if (ci === b.answer) {
              solve(true);
            } else {
              btn.classList.add('is-wrong');
              shake(btn);
              why.hidden = false;
              why.className = 'quiz-why is-retry';
              why.textContent = b.hint || '다시 한번 생각해 볼까요?';
              App.store.answer(unit.id, b.key, false);
            }
          },
        },
        h('span', { class: 'choice-no' }, n + 1),
        h('span', { html: App.fmt(String(c)) })
      );
      choices.appendChild(btn);
    });

    root.appendChild(quizHead(b, sayText));
    if (b.pic) root.appendChild(h('div', { class: 'quiz-pic' }, b.pic));
    root.appendChild(choices);
    root.appendChild(why);
    if (solved) solve(false);
    return root;
  }

  function blockReveal(b, unit, onChange) {
    var answer = h('div', { class: 'reveal-a', hidden: true, html: App.fmt(b.a) + ' ' });
    answer.appendChild(App.sayButton(b.a));
    var btn = h(
      'button',
      {
        type: 'button',
        class: 'reveal-btn',
        onclick: function () {
          answer.hidden = !answer.hidden;
          btn.textContent = answer.hidden ? '눌러서 답 보기' : '답 접기';
          if (!answer.hidden) {
            App.store.answer(unit.id, b.key, true);
            onChange();
          }
        },
      },
      '눌러서 답 보기'
    );
    var root = h('div', { class: 'blk blk-quiz blk-reveal' }, quizHead(b, b.q));
    if (b.pic) root.appendChild(h('div', { class: 'quiz-pic' }, b.pic));
    root.appendChild(btn);
    root.appendChild(answer);
    return root;
  }

  function renderBlock(b, unit, onChange) {
    switch (b.t) {
      case 'p':
        return blockP(b);
      case 'say':
        return blockSay(b);
      case 'widget':
        return blockWidget(b);
      case 'box':
        return blockBox(b);
      case 'table':
        return blockTable(b);
      case 'tip':
        return blockTip(b, unit);
      case 'quiz':
        return blockQuiz(b, unit, onChange);
      case 'reveal':
        return blockReveal(b, unit, onChange);
      default:
        return h('p', { class: 'blk' }, '');
    }
  }

  /* ───── 발도장 ───── */
  function stampSVG() {
    return (
      '<svg viewBox="0 0 200 200" aria-hidden="true"><g fill="none" stroke="currentColor">' +
      '<circle cx="100" cy="100" r="88" stroke-width="8"/><circle cx="100" cy="100" r="74" stroke-width="2.5"/></g>' +
      '<g fill="currentColor"><ellipse cx="100" cy="94" rx="17" ry="13.5"/><ellipse cx="80" cy="76" rx="6.5" ry="8.5" transform="rotate(-22 80 76)"/>' +
      '<ellipse cx="93" cy="65" rx="6.5" ry="8.5" transform="rotate(-7 93 65)"/><ellipse cx="107" cy="65" rx="6.5" ry="8.5" transform="rotate(7 107 65)"/>' +
      '<ellipse cx="120" cy="76" rx="6.5" ry="8.5" transform="rotate(22 120 76)"/>' +
      '<text x="100" y="146" text-anchor="middle" font-size="27" font-weight="700" font-family="Gowun Batang, serif">참 잘했어요</text></g></svg>'
    );
  }

  function finishBox(unit) {
    var box = h('div', { class: 'sv-finish' });
    function draw(fresh) {
      var done = App.store.isDone(unit.id);
      var solved = App.store.solved(unit.id);
      var next = App.nextUnit(unit);
      box.innerHTML = '';
      if (unit.quizCount) {
        box.appendChild(h('p', { class: 'sv-score', html: '확인 문제 <b>' + Math.min(solved, unit.quizCount) + '</b> / ' + unit.quizCount + '개 해결' + (solved < unit.quizCount ? ' <small>— 남은 문제는 다음에 풀어도 괜찮아요.</small>' : ' 🎉') }));
      }
      if (done) {
        box.appendChild(h('div', { class: 'stamp-mark' + (fresh ? ' is-fresh' : ''), html: stampSVG() }));
        box.appendChild(h('p', { class: 'sv-done-text' }, '이 단원에 발도장을 찍었어요!'));
      } else {
        box.appendChild(
          h(
            'button',
            {
              type: 'button',
              class: 'btn coral stamp-btn',
              onclick: function () {
                App.store.complete(unit.id);
                draw(true);
                if (App.tts) App.tts.speak('참 잘했어요!');
              },
            },
            h('span', { class: 'stamp-paw', html: App.cat.paw('#fff') }),
            '다 읽었어요! 발도장 꾹'
          )
        );
      }
      var links = h('div', { class: 'sv-next' });
      if (next) {
        links.appendChild(h('a', { class: 'btn', href: '#/u/' + next.id }, '다음 단원: ' + next.title + ' →'));
      }
      links.appendChild(h('a', { class: 'btn ghost', href: '#/toc/' + unit.semKey }, '목차로'));
      box.appendChild(links);
    }
    draw(false);
    box.refresh = function () {
      draw(false);
    };
    return box;
  }

  /* ───── 두루마리 펼치기 ───── */
  function open(unit) {
    view = view || document.getElementById('scroll-view');
    if (state) teardown();
    App.store.last(unit.id);
    document.title = unit.title + ' — ' + App.config.book;

    var finish = finishBox(unit);
    var onChange = function () {
      finish.refresh();
    };

    /* 본문 */
    var paper = h('div', { class: 'sv-paper', tabindex: '0' });
    var stdList = h('ul');
    unit.standards.forEach(function (code) {
      var s = ST.find(code);
      if (s) stdList.appendChild(h('li', { class: 'dom-' + ST.cls(s.domain) }, h('b', null, '[' + code + '] '), s.text));
    });
    var head = h(
      'header',
      { class: 'sv-head sv-sec', id: 'sec-top' },
      h('div', { class: 'sv-chips' }, h('span', { class: 'chip is-on' }, App.semName(unit) + ' · ' + unit.no + '단원'), h('span', { class: 'dom-chip dom-' + ST.cls(unit.domain) }, unit.domain)),
      h('h1', { class: 'sv-hook' }, unit.hook),
      h('p', { class: 'sv-title' }, unit.title),
      unit.goals && unit.goals.length
        ? h(
            'ul',
            { class: 'sv-goals' },
            unit.goals.map(function (g) {
              return h('li', null, g);
            })
          )
        : null,
      h('details', { class: 'sv-std' }, h('summary', null, '이 단원과 이어진 성취기준 ' + unit.standards.length + '개'), stdList)
    );
    paper.appendChild(head);

    var railItems = [{ id: 'sec-top', label: '처음' }];
    unit.sections.forEach(function (s, i) {
      var sec = h('section', { class: 'sv-sec', id: 'sec-' + s.id }, h('h2', { class: 'sv-h2' }, h('span', { class: 'sv-num' }, i + 1), h('span', null, s.title)), s.lead ? h('p', { class: 'sv-lead' }, s.lead) : null);
      (s.blocks || []).forEach(function (b) {
        sec.appendChild(renderBlock(b, unit, onChange));
      });
      paper.appendChild(sec);
      railItems.push({ id: 'sec-' + s.id, label: s.title, sid: s.id });
    });

    var wrap = h(
      'section',
      { class: 'sv-sec sv-wrap', id: 'sec-wrap' },
      h('h2', { class: 'sv-h2' }, h('span', { class: 'sv-num is-star' }, '★'), h('span', null, '한 장 요약')),
      h(
        'ul',
        { class: 'sv-summary' },
        unit.wrap.map(function (w) {
          return h('li', { html: App.fmt(w) });
        })
      ),
      finish
    );
    paper.appendChild(wrap);
    railItems.push({ id: 'sec-wrap', label: '한 장 요약' });

    /* 왼쪽 길잡이(털실 길) */
    var marker = h('span', { class: 'rail-yarn', html: App.cat.yarn({ tail: false }) });
    var threadDone = h('i', { class: 'rail-thread-done' });
    var list = h('ol', { class: 'rail-list' });
    railItems.forEach(function (it, i) {
      it.el = h(
        'li',
        null,
        h(
          'button',
          {
            type: 'button',
            onclick: function () {
              var target = paper.querySelector('#' + it.id);
              if (target) paper.scrollTo({ top: target.offsetTop - 8, behavior: App.reducedMotion() ? 'auto' : 'smooth' });
            },
          },
          it.label
        )
      );
      list.appendChild(it.el);
    });
    var rail = h('nav', { class: 'sv-rail', 'aria-label': '이 단원의 차례' }, h('div', { class: 'rail-inner' }, h('i', { class: 'rail-thread' }), threadDone, list, marker));

    /* 위 막대 */
    var markBtn = h(
      'button',
      {
        type: 'button',
        class: 'btn small ghost sv-mark',
        'aria-pressed': App.store.isMarked(unit.id) ? 'true' : 'false',
        onclick: function () {
          var on = App.store.toggleMark(unit.id);
          markBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
          markBtn.lastChild.textContent = on ? '책갈피 끼움' : '책갈피';
        },
      },
      h('span', { 'aria-hidden': 'true' }, '🔖'),
      h('span', null, App.store.isMarked(unit.id) ? '책갈피 끼움' : '책갈피')
    );
    var bar = h(
      'div',
      { class: 'sv-bar' },
      h('a', { class: 'btn small ghost', href: '#/toc/' + unit.semKey }, '← 목차'),
      h('div', { class: 'sv-crumb' }, h('span', null, App.semName(unit) + ' · ' + unit.no + '단원'), h('b', null, unit.title)),
      markBtn
    );
    var meter = h('div', { class: 'sv-meter' }, h('i'));

    var roll = h('div', { class: 'sv-roll' }, h('div', { class: 'sv-rod top' }), paper, h('div', { class: 'sv-rod bottom' }));
    view.innerHTML = '';
    view.appendChild(bar);
    view.appendChild(meter);
    view.appendChild(h('div', { class: 'sv-main' }, rail, roll));
    view.hidden = false;
    document.body.classList.add('is-scroll-open');
    roll.style.setProperty('--sv-h', paper.clientHeight + 'px');
    roll.classList.add('is-unrolling');

    /* 읽는 자리에 맞추어 길잡이 움직이기 */
    var active = -1;
    var ticking = false;
    function update() {
      ticking = false;
      var top = paper.scrollTop + paper.clientHeight * 0.3;
      var idx = 0;
      railItems.forEach(function (it, i) {
        var el = paper.querySelector('#' + it.id);
        if (el && el.offsetTop <= top) idx = i;
      });
      if (paper.scrollTop + paper.clientHeight >= paper.scrollHeight - 4) idx = railItems.length - 1;
      var max = paper.scrollHeight - paper.clientHeight;
      meter.firstChild.style.width = (max > 0 ? Math.min(100, (paper.scrollTop / max) * 100) : 100) + '%';
      if (idx === active) return;
      active = idx;
      railItems.forEach(function (it, i) {
        it.el.className = i < idx ? 'is-done' : i === idx ? 'is-on' : '';
      });
      var li = railItems[idx].el;
      var y = li.offsetTop + li.offsetHeight / 2;
      marker.style.transform = 'translateY(' + y + 'px) rotate(' + idx * 150 + 'deg)';
      threadDone.style.height = Math.max(0, y - list.firstChild.offsetHeight / 2) + 'px';
      if (railItems[idx].sid) App.store.seeSection(unit.id, railItems[idx].sid);
    }
    function onScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }
    paper.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
    setTimeout(function () {
      roll.classList.remove('is-unrolling');
      update();
    }, 800);

    function onKey(e) {
      if (e.key === 'Escape') location.hash = '#/toc/' + unit.semKey;
    }
    document.addEventListener('keydown', onKey);

    state = {
      unit: unit,
      off: function () {
        paper.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
        document.removeEventListener('keydown', onKey);
      },
    };
    try {
      paper.focus({ preventScroll: true });
    } catch (e) {}
  }

  function teardown() {
    if (!state) return;
    state.off();
    state = null;
    if (App.tts) App.tts.stop();
  }

  function close() {
    if (!state) return;
    teardown();
    view.hidden = true;
    view.innerHTML = '';
    document.body.classList.remove('is-scroll-open');
    document.title = App.config.book + ' — ' + App.config.brand;
  }

  App.scroll = {
    open: open,
    close: close,
    isOpen: function () {
      return !!state;
    },
  };
})();
