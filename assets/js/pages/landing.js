/* 랜딩 화면 */
(function () {
  var App = window.App;
  var h = App.h;
  var H = App.hangul;

  var DOMS = [
    { key: '듣기·말하기', cls: '듣말' },
    { key: '읽기', cls: '읽기' },
    { key: '쓰기', cls: '쓰기' },
    { key: '문법', cls: '문법' },
    { key: '문학', cls: '문학' },
    { key: '매체', cls: '매체' },
  ];

  /* ───── 첫 화면 놀이: 털실 공으로 자음자·모음자 맞히기 ───── */
  function heroToy() {
    var hero = document.getElementById('hero');
    var canvas = hero.querySelector('.hero-play');
    var strip = document.getElementById('hero-strip');
    var catBox = document.getElementById('hero-cat');
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    var CONS = 'ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ'.split('');
    var VOWS = 'ㅏㅑㅓㅕㅗㅛㅜㅠㅡㅣ'.split('');
    var W = 0;
    var Ht = 0;
    var dpr = 1;
    var parts = [];
    var pops = [];
    var trail = [];
    var made = [];
    var ball = { x: 0, y: 0, vx: 1.6, vy: -1.1, r: 24, rot: 0, hold: '' };
    var pointer = { x: -9999, y: -9999, px: -9999, py: -9999 };
    var running = false;
    var still = App.reducedMotion();
    var SLOTS = 8;

    function renderStrip(fresh) {
      strip.innerHTML = '';
      for (var i = 0; i < SLOTS; i++) {
        var ch = made[i] || '';
        var cell = h('span', { class: 'cell' + (ch ? '' : ' is-empty') + (fresh && i === made.length - 1 ? ' is-new' : '') }, ch);
        if (ch) cell.setAttribute('data-say', ch);
        strip.appendChild(cell);
      }
    }

    function spawn(p, first) {
      var isC = p.kind === 'c';
      p.ch = App.pick(isC ? CONS : VOWS);
      p.x = 40 + Math.random() * (W - 80);
      p.y = 40 + Math.random() * (Ht - 80);
      var a = Math.random() * Math.PI * 2;
      var sp = 0.12 + Math.random() * 0.22;
      p.vx = Math.cos(a) * sp;
      p.vy = Math.sin(a) * sp;
      p.size = 26 + Math.random() * 18;
      p.wob = Math.random() * 6;
      p.alpha = first ? 1 : 0;
    }

    function resize() {
      var rect = hero.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = rect.width;
      Ht = rect.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(Ht * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var want = Math.max(10, Math.min(22, Math.round((W * Ht) / 46000)));
      while (parts.length < want) {
        var p = { kind: parts.length % 2 ? 'v' : 'c' };
        spawn(p, true);
        parts.push(p);
      }
      parts.length = want;
      if (!ball.x) {
        ball.x = W * 0.78;
        ball.y = Ht * 0.3;
      }
      ball.x = Math.min(Math.max(ball.x, ball.r), W - ball.r);
      ball.y = Math.min(Math.max(ball.y, ball.r), Ht - ball.r);
      if (still) draw();
    }

    function cheer() {
      if (!catBox) return;
      catBox.innerHTML = App.cat.sit({ mood: 'happy' });
      catBox.classList.add('is-happy');
      clearTimeout(cheer.t);
      cheer.t = setTimeout(function () {
        catBox.innerHTML = App.cat.sit({ mood: 'smile' });
        catBox.classList.remove('is-happy');
      }, 1100);
    }

    var lastBat = -1e9; // 마지막으로 공을 친 때
    var lastCatch = -1e9; // 마지막으로 자모를 붙인 때

    function hit(p) {
      /* 가만히 둘 때는 가끔씩만 붙는다. 직접 치면 바로바로 붙는다. */
      var now = performance.now();
      var playing = now - lastBat < 3500;
      var wanted = ball.hold ? p.kind === 'v' : p.kind === 'c';
      if (wanted && !playing && now - lastCatch < 4200) return;
      if (wanted) lastCatch = now;
      if (!ball.hold && p.kind === 'c') {
        ball.hold = p.ch;
        pops.push({ text: p.ch, x: p.x, y: p.y, life: 1, color: '#1e4fa6' });
        spawn(p);
      } else if (ball.hold && p.kind === 'v') {
        var syl = H.compose(ball.hold, p.ch, '');
        pops.push({ text: ball.hold + ' + ' + p.ch + ' = ' + syl, x: p.x, y: p.y, life: 1.4, color: '#c4452f', big: true });
        made.push(syl);
        if (made.length > SLOTS) made.shift();
        renderStrip(true);
        ball.hold = '';
        cheer();
        spawn(p);
      } else {
        /* 짝이 안 맞으면 톡 튕겨 낸다 */
        var dx = p.x - ball.x;
        var dy = p.y - ball.y;
        var d = Math.hypot(dx, dy) || 1;
        p.vx = (dx / d) * 1.4;
        p.vy = (dy / d) * 1.4;
      }
    }

    function step() {
      /* 포인터가 공을 밀어낸다 */
      var mvx = pointer.x - pointer.px;
      var mvy = pointer.y - pointer.py;
      pointer.px = pointer.x;
      pointer.py = pointer.y;
      var dx = ball.x - pointer.x;
      var dy = ball.y - pointer.y;
      var d = Math.hypot(dx, dy);
      if (d < ball.r + 46 && d > 0.01) {
        var push = Math.min(2.2, 0.5 + Math.hypot(mvx, mvy) * 0.18);
        ball.vx += (dx / d) * push;
        ball.vy += (dy / d) * push;
        lastBat = performance.now();
      }
      var sp = Math.hypot(ball.vx, ball.vy);
      if (sp > 11) {
        ball.vx *= 11 / sp;
        ball.vy *= 11 / sp;
      }
      ball.vx *= 0.992;
      ball.vy *= 0.992;
      if (sp < 0.7) {
        /* 멈추지 않고 느릿느릿 굴러다닌다 */
        var a = Math.atan2(ball.vy, ball.vx) + (Math.random() - 0.5) * 0.3;
        ball.vx = Math.cos(a) * 0.72;
        ball.vy = Math.sin(a) * 0.72;
      }
      ball.x += ball.vx;
      ball.y += ball.vy;
      ball.rot += ball.vx * 0.045;
      if (ball.x < ball.r) { ball.x = ball.r; ball.vx = Math.abs(ball.vx); }
      if (ball.x > W - ball.r) { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx); }
      if (ball.y < ball.r) { ball.y = ball.r; ball.vy = Math.abs(ball.vy); }
      if (ball.y > Ht - ball.r) { ball.y = Ht - ball.r; ball.vy = -Math.abs(ball.vy); }
      trail.push(ball.x, ball.y);
      if (trail.length > 150) trail.splice(0, 2);

      parts.forEach(function (p) {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.985;
        p.vy *= 0.985;
        if (Math.hypot(p.vx, p.vy) < 0.14) {
          p.vx *= 1.06;
          p.vy *= 1.06;
        }
        p.wob += 0.01;
        if (p.alpha < 1) p.alpha = Math.min(1, p.alpha + 0.02);
        if (p.x < 24 || p.x > W - 24) p.vx *= -1;
        if (p.y < 24 || p.y > Ht - 24) p.vy *= -1;
        p.x = Math.min(Math.max(p.x, 20), W - 20);
        p.y = Math.min(Math.max(p.y, 20), Ht - 20);
        if (p.alpha > 0.6 && Math.hypot(p.x - ball.x, p.y - ball.y) < ball.r + p.size * 0.42) hit(p);
      });
      pops = pops.filter(function (o) {
        o.life -= 0.012;
        o.y -= 0.5;
        return o.life > 0;
      });
    }

    function draw() {
      ctx.clearRect(0, 0, W, Ht);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      /* 떠다니는 자모 */
      parts.forEach(function (p) {
        var wanted = ball.hold ? p.kind === 'v' : p.kind === 'c';
        ctx.globalAlpha = p.alpha * (wanted ? 0.62 : 0.26);
        ctx.fillStyle = p.kind === 'c' ? '#2c6bd9' : '#e8604c';
        ctx.font = '700 ' + p.size + 'px "Gowun Batang", serif';
        ctx.fillText(p.ch, p.x, p.y + Math.sin(p.wob) * 3);
      });
      ctx.globalAlpha = 1;

      /* 풀린 털실 */
      if (trail.length > 4) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        for (var i = 2; i < trail.length; i += 2) {
          var t = i / trail.length;
          ctx.strokeStyle = 'rgba(232, 96, 76, ' + (t * 0.55).toFixed(3) + ')';
          ctx.lineWidth = 1 + t * 2.4;
          ctx.beginPath();
          ctx.moveTo(trail[i - 2], trail[i - 1]);
          ctx.lineTo(trail[i], trail[i + 1]);
          ctx.stroke();
        }
      }

      /* 털실 공 */
      ctx.save();
      ctx.translate(ball.x, ball.y);
      ctx.beginPath();
      ctx.arc(0, 0, ball.r, 0, Math.PI * 2);
      ctx.fillStyle = '#e8604c';
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#b8402f';
      ctx.stroke();
      ctx.save();
      ctx.rotate(ball.rot);
      ctx.beginPath();
      ctx.arc(0, 0, ball.r - 1.5, 0, Math.PI * 2);
      ctx.clip();
      ctx.strokeStyle = 'rgba(255, 200, 185, 0.9)';
      ctx.lineWidth = 2.2;
      for (var k = -2; k <= 2; k++) {
        ctx.beginPath();
        ctx.ellipse(0, k * 9, ball.r * 1.2, ball.r * 0.5, 0.5, Math.PI, Math.PI * 2);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(160, 50, 35, 0.5)';
      for (var m = -1; m <= 1; m++) {
        ctx.beginPath();
        ctx.ellipse(m * 10, 0, ball.r * 0.45, ball.r * 1.2, -0.3, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();
      }
      ctx.restore();
      if (ball.hold) {
        ctx.beginPath();
        ctx.arc(0, 0, ball.r * 0.62, 0, Math.PI * 2);
        ctx.fillStyle = '#fffdf8';
        ctx.fill();
        ctx.fillStyle = '#1e4fa6';
        ctx.font = '700 ' + ball.r * 0.9 + 'px "Gowun Batang", serif';
        ctx.fillText(ball.hold, 0, 1);
      }
      ctx.restore();

      /* 톡! 하고 떠오르는 글자 */
      pops.forEach(function (o) {
        ctx.globalAlpha = Math.min(1, o.life);
        ctx.fillStyle = o.color;
        ctx.font = '700 ' + (o.big ? 30 : 22) + 'px "Gowun Batang", serif';
        ctx.fillText(o.text, Math.min(Math.max(o.x, 90), W - 90), o.y - 30);
      });
      ctx.globalAlpha = 1;
    }

    function loop() {
      if (!running) return;
      step();
      draw();
      requestAnimationFrame(loop);
    }
    function setRunning(on) {
      if (still) return;
      if (on && !running) {
        running = true;
        requestAnimationFrame(loop);
      } else if (!on) {
        running = false;
      }
    }

    function track(e) {
      var rect = hero.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
    }
    hero.addEventListener('pointermove', track);
    hero.addEventListener('pointerdown', function (e) {
      track(e);
      pointer.px = pointer.x;
      pointer.py = pointer.y;
      /* 가까이 누르면 '톡' 하고 쳐 낸다 */
      var dx = ball.x - pointer.x;
      var dy = ball.y - pointer.y;
      var d = Math.hypot(dx, dy);
      if (d < ball.r + 70 && d > 0.01) {
        ball.vx += (dx / d) * 6;
        ball.vy += (dy / d) * 6;
        lastBat = performance.now();
      }
    });
    hero.addEventListener('pointerleave', function () {
      pointer.x = pointer.y = pointer.px = pointer.py = -9999;
    });

    renderStrip(false);
    resize();
    window.addEventListener('resize', resize);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (still) draw(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        setRunning(entries[0].isIntersecting && !document.hidden);
      }).observe(hero);
    } else {
      setRunning(true);
    }
    document.addEventListener('visibilitychange', function () {
      var r = hero.getBoundingClientRect();
      setRunning(!document.hidden && r.bottom > 0 && r.top < window.innerHeight);
    });
  }

  /* ───── 이어서 하기 ───── */
  function continueButton() {
    var btn = document.getElementById('continue-btn');
    var last = App.store.last();
    var unit = last && App.unitById ? App.unitById(last) : null;
    if (!btn || !unit) return;
    btn.textContent = '이어서 하기';
    btn.href = 'handbook.html#/u/' + unit.id;
    btn.title = App.semName(unit) + ' ' + unit.no + '단원 · ' + unit.title;
  }

  /* ───── 두루마리 미리 보기 ───── */
  function demo() {
    var el = document.getElementById('demo-widget');
    if (!el || !App.widgets || !App.widgets.jamoBuilder) return;
    App.widgets.jamoBuilder(el, { cons: 'ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅎ', vowels: 'ㅏㅓㅗㅜㅡㅣ', start: '고' });
  }

  /* ───── 교육과정 영역 ───── */
  function domains() {
    var grid = document.getElementById('domain-grid');
    var switcher = document.getElementById('band-switch');
    if (!grid || !App.standards) return;
    var units = App.units || [];
    /* 단원이 들어 있는 학년군만 고를 수 있게 한다 */
    var bandKeys = Object.keys(App.standards.bands).filter(function (key) {
      return units.some(function (u) {
        var s = App.semester(u.semKey);
        return s && s.band === key;
      });
    });
    if (!bandKeys.length) bandKeys = ['1-2'];
    var current = bandKeys[0];

    if (switcher) {
      switcher.hidden = bandKeys.length < 2;
      bandKeys.forEach(function (key) {
        switcher.appendChild(
          h('button', { type: 'button', class: 'chip', role: 'tab', dataset: { band: key }, onclick: function () { current = key; draw(); } }, App.standards.bands[key].short)
        );
      });
    }
    draw();

    function draw() {
      grid.innerHTML = '';
      if (switcher) {
        switcher.querySelectorAll('.chip').forEach(function (c) {
          var on = c.dataset.band === current;
          c.classList.toggle('is-on', on);
          c.setAttribute('aria-selected', on ? 'true' : 'false');
        });
      }
      drawBand(App.standards.bands[current]);
    }

    function drawBand(band) {
    DOMS.forEach(function (d) {
      var list = band.domains[d.key] || [];
      var covered = list.filter(function (s) {
        return units.some(function (u) {
          return u.standards.indexOf(s.code) >= 0;
        });
      }).length;
      var unitCount = units.filter(function (u) {
        return u.standards.some(function (code) {
          return list.some(function (s) {
            return s.code === code;
          });
        });
      }).length;
      grid.appendChild(
        h(
          'div',
          { class: 'domain-card dom-' + d.cls, style: { '--fill': (list.length ? Math.round((covered / list.length) * 100) : 0) + '%' } },
          h('b', null, d.key),
          h('span', null, '성취기준 ' + covered + ' / ' + list.length + '개 연결'),
          h('span', null, '단원 ' + unitCount + '개'),
          h('i')
        )
      );
    });
    }
  }

  /* ───── 학습지 서랍 ───── */
  function shelf() {
    var filterBox = document.getElementById('shelf-filter');
    var grid = document.getElementById('shelf-grid');
    var sheets = App.sheets || [];
    if (!grid || !sheets.length) return;
    var cats = ['전체'];
    sheets.forEach(function (s) {
      if (cats.indexOf(s.cat) < 0) cats.push(s.cat);
    });
    var current = '전체';

    function card(s) {
      var page = h(
        'div',
        { class: 'sheet-page' },
        h('h4', null, s.title),
        h(
          'div',
          { class: 'mini-grid' },
          (s.preview || '가나다라마').split('').map(function (ch, i) {
            return h('span', { class: i > 1 ? 'ghost' : '' }, ch === '_' ? '' : ch);
          }),
          '     '.split('').map(function () {
            return h('span');
          })
        ),
        h('div', { class: 'mini-cat', html: App.cat.head({ mood: s.mood || 'smile', blink: false }) })
      );
      var actions = h('div', { class: 'sheet-actions' }, h('a', { class: 'btn small', href: 'print.html?sheet=' + s.id, target: '_blank', rel: 'noopener' }, '인쇄하기'));
      if (s.key) actions.appendChild(h('a', { class: 'btn small ghost', href: 'print.html?sheet=' + s.id + '&key=1', target: '_blank', rel: 'noopener' }, s.keyLabel || '정답 보기'));
      return h(
        'article',
        { class: 'sheet-card', dataset: { cat: s.cat } },
        h('div', { class: 'sheet-thumb' }, page),
        h(
          'div',
          { class: 'sheet-body' },
          h('div', { class: 'sheet-meta' }, h('span', { class: 'chip' }, s.cat), h('span', null, s.grade + ' · A4 ' + s.pages + '쪽')),
          h('h3', null, s.title),
          h('p', null, s.desc),
          s.std && s.std.length ? h('p', { class: 'sheet-std' }, '성취기준 ' + s.std.map(function (c) { return '[' + c + ']'; }).join(' ')) : null,
          actions
        )
      );
    }

    function render() {
      grid.innerHTML = '';
      sheets
        .filter(function (s) {
          return current === '전체' || s.cat === current;
        })
        .forEach(function (s) {
          grid.appendChild(card(s));
        });
      filterBox.querySelectorAll('.chip').forEach(function (c) {
        var on = c.dataset.cat === current;
        c.classList.toggle('is-on', on);
        c.setAttribute('aria-selected', on ? 'true' : 'false');
      });
    }

    cats.forEach(function (c) {
      filterBox.appendChild(
        h('button', { class: 'chip', type: 'button', role: 'tab', dataset: { cat: c }, onclick: function () { current = c; render(); } }, c)
      );
    });
    render();

    /* 머리글의 '한글 · 낱말 · 문장' 바로 가기 */
    document.querySelectorAll('[data-filter]').forEach(function (a) {
      a.addEventListener('click', function () {
        var f = a.getAttribute('data-filter');
        current = f === 'all' || cats.indexOf(f) < 0 ? '전체' : f;
        render();
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    App.applyBrand();
    App.mountYarns();
    App.mountCats();
    App.mountScenes();
    App.mountCovers();
    var mark = document.getElementById('hero-wordmark');
    if (mark) {
      mark.innerHTML = App.config.brand
        .split('')
        .map(function (ch) {
          return '<span class="cell">' + App.esc(ch) + '</span>';
        })
        .join('');
    }
    heroToy();
    continueButton();
    demo();
    domains();
    shelf();
  });
})();
