/* 모든 페이지 공통 메뉴: 같은 차례의 메뉴 + 휴대폰·태블릿용 펼침 메뉴(☰).
   메뉴를 바꾸려면 아래 LINKS 만 고치면 됩니다. */
(function () {
  var App = (window.App = window.App || {});

  var LINKS = [
    { href: 'handbook.html', label: '국어 공책', ico: '📒', desc: '초등부터 고등 공통국어까지 단원 두루마리' },
    { href: 'archive.html', label: '문학 서고', ico: '📚', desc: '작품 카드 · 개념어 사전 · 한 줄 퀴즈' },
    { href: 'escape.html', label: '문학 방탈출', ico: '🗝️', desc: '3D 방을 걸으며 작품 속 인물과 수수께끼' },
    { href: 'exam.html', label: '수능·LEET', ico: '📝', desc: '새로 쓴 지문 · 시간 재기 · 오답 노트' },
    { href: 'index.html#shelf', label: '학습지', ico: '🖨️', desc: '인쇄해서 쓰는 학습지 서랍' },
    { href: 'maru.html', label: '마루', ico: '🐾', desc: '하니와 끝말잇기 · 초성 퀴즈 · 삼행시' },
    { href: 'my.html', label: '내 공부방', ico: '🏠', desc: '진도 · 기록 · 오답 모아 보기, 기록 옮기기' },
  ];

  function page() {
    var p = location.pathname.split('/').pop() || 'index.html';
    return p;
  }

  function build() {
    var head = document.querySelector('.site-head .wrap');
    var nav = head && head.querySelector('.site-nav');
    if (!head || !nav) return;
    var cur = page();
    nav.innerHTML = '';
    LINKS.forEach(function (l) {
      var a = document.createElement('a');
      a.href = l.href;
      a.textContent = l.label;
      if (l.href.split('#')[0] === cur && l.href.indexOf('#') < 0) a.setAttribute('aria-current', 'page');
      nav.appendChild(a);
    });

    /* ☰ 단추와 펼침 메뉴 */
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'nav-toggle';
    btn.setAttribute('aria-label', '메뉴 열기');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', 'nav-drawer');
    btn.innerHTML = '<span></span><span></span><span></span>';
    head.appendChild(btn);

    var drawer = document.createElement('div');
    drawer.className = 'nav-drawer';
    drawer.id = 'nav-drawer';
    drawer.hidden = true;
    var html = '<div class="nav-drawer-panel" role="dialog" aria-modal="true" aria-label="전체 메뉴">';
    html += '<div class="nav-drawer-top"><a class="logo" href="index.html"><span class="nav-cat"></span>' + App.esc((App.config && App.config.brand) || '국어하니') + '</a>';
    html += '<button type="button" class="nav-close" aria-label="메뉴 닫기">×</button></div><ul>';
    LINKS.forEach(function (l) {
      var on = l.href.split('#')[0] === cur && l.href.indexOf('#') < 0;
      html += '<li><a href="' + l.href + '"' + (on ? ' aria-current="page"' : '') + '><span class="nav-ico" aria-hidden="true">' + l.ico + '</span><span><b>' + App.esc(l.label) + '</b><small>' + App.esc(l.desc) + '</small></span></a></li>';
    });
    html += '</ul><p class="nav-note">가입 없이 무료 · 기록은 이 기기에만 저장돼요</p></div>';
    drawer.innerHTML = html;
    document.body.appendChild(drawer);
    var cat = drawer.querySelector('.nav-cat');
    if (cat && App.cat) cat.innerHTML = App.cat.head({ mood: 'happy' });

    function open() {
      drawer.hidden = false;
      requestAnimationFrame(function () { drawer.classList.add('is-open'); });
      btn.setAttribute('aria-expanded', 'true');
      document.documentElement.classList.add('nav-locked');
      var first = drawer.querySelector('a[href]');
      if (first) first.focus();
    }
    function close() {
      drawer.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
      document.documentElement.classList.remove('nav-locked');
      setTimeout(function () { drawer.hidden = true; }, 200);
    }
    btn.addEventListener('click', open);
    drawer.querySelector('.nav-close').addEventListener('click', close);
    drawer.addEventListener('click', function (e) {
      if (e.target === drawer) close();
      if (e.target.closest && e.target.closest('a')) close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !drawer.hidden) close();
    });
  }

  /* 맨 위로 단추 */
  function toTop() {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'to-top';
    b.setAttribute('aria-label', '맨 위로');
    b.innerHTML = '↑';
    b.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
    document.body.appendChild(b);
    var on = false;
    window.addEventListener('scroll', function () {
      var want = window.scrollY > 900;
      if (want !== on) {
        on = want;
        b.classList.toggle('is-on', on);
      }
    }, { passive: true });
  }

  App.nav = { links: LINKS };
  document.addEventListener('DOMContentLoaded', function () {
    build();
    if (!document.body.classList.contains('book-page')) toTop();
  });
})();
