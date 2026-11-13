/* 작은 DOM 도우미 */
(function () {
  var App = (window.App = window.App || {});

  function append(el, child) {
    if (child == null || child === false) return;
    if (Array.isArray(child)) {
      child.forEach(function (c) {
        append(el, c);
      });
    } else if (child.nodeType) {
      el.appendChild(child);
    } else {
      el.appendChild(document.createTextNode(String(child)));
    }
  }

  /* h('div', {class: 'a', onclick: fn}, child, ...) */
  App.h = function (tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v == null || v === false) return;
        if (k === 'class') el.className = v;
        else if (k === 'html') el.innerHTML = v;
        else if (k === 'text') el.textContent = v;
        else if (k === 'style' && typeof v === 'object') {
          Object.keys(v).forEach(function (p) {
            /* --로 시작하는 CSS 변수는 setProperty 로만 넣을 수 있다 */
            if (p.slice(0, 2) === '--') el.style.setProperty(p, v[p]);
            else el.style[p] = v[p];
          });
        }
        else if (k === 'dataset') Object.assign(el.dataset, v);
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else el.setAttribute(k, v === true ? '' : v);
      });
    }
    for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  };

  App.esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  /* 본문용 간단 표기:
     **굵게**   ==형광펜==   [[소리]] → [소리]   {{낱말}} → 누르면 읽어 주는 낱말   줄바꿈 → <br> */
  App.fmt = function (text) {
    return App.esc(text)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/==(.+?)==/g, '<mark>$1</mark>')
      .replace(/\[\[(.+?)\]\]/g, '<span class="pron">[$1]</span>')
      .replace(/\{\{(.+?)\}\}/g, '<button type="button" class="say-word" data-say="$1">$1</button>')
      .replace(/\n/g, '<br>');
  };

  /* 읽어 주기용: 표기 기호를 걷어 낸 글 */
  App.plain = function (text) {
    return String(text)
      .replace(/\*\*|==|\{\{|\}\}/g, '')
      .replace(/\[\[(.+?)\]\]/g, '$1')
      .replace(/[∨≫]/g, ' ');
  };

  App.shuffle = function (arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  };

  /* 원래 순서와 다르게 섞기(가능하면) */
  App.shuffleDifferent = function (arr) {
    if (arr.length < 2) return arr.slice();
    for (var n = 0; n < 12; n++) {
      var s = App.shuffle(arr);
      if (
        s.some(function (x, i) {
          return x !== arr[i];
        })
      )
        return s;
    }
    return arr.slice().reverse();
  };

  App.pick = function (arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  };

  App.reducedMotion = function () {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  };

  /* 누르면 읽어 주는 낱말({{낱말}})과 data-say 버튼을 한 번에 연결 */
  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-say]') : null;
    if (!el || !App.tts) return;
    App.tts.speak(el.getAttribute('data-say'), { el: el });
  });
})();
