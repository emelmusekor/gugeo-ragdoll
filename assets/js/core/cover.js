/* 국어 공책 표지 그리기 */
(function () {
  var App = (window.App = window.App || {});

  /* cells('국어') → 원고지 칸 */
  App.cells = function (text, cls) {
    return (
      '<span class="wongoji' + (cls ? ' ' + cls : '') + '">' +
      String(text)
        .split('')
        .map(function (ch) {
          return '<span class="cell">' + (ch === ' ' ? '' : App.esc(ch)) + '</span>';
        })
        .join('') +
      '</span>'
    );
  };

  /* editable: true 이면 표지에 이름을 직접 쓸 수 있다 */
  App.coverHTML = function (opts) {
    opts = opts || {};
    var name = App.store ? App.store.name() : '';
    var nameSlot = opts.editable
      ? '<input type="text" maxlength="12" value="' + App.esc(name) + '" placeholder="여기에 이름을 써요" aria-label="내 이름" data-cover-name autocomplete="off" />'
      : App.esc(name);
    return (
      '<div class="cover">' +
      '<div class="cover-spine"></div>' +
      '<div class="cover-label">' +
      App.cells(App.config.book.replace(/\s/g, ''), 'cover-title') +
      '<p class="cover-sub">1학년부터 차근차근</p>' +
      '</div>' +
      '<div class="cover-name"><span>이름</span><span class="cover-name-line">' + nameSlot + '</span></div>' +
      '<div class="cover-yarn">' + App.cat.yarn() + '</div>' +
      '<div class="cover-cat">' + App.cat.peek({ mood: 'smile' }) + '</div>' +
      '<div class="cover-badge">2022 개정 교육과정</div>' +
      '</div>'
    );
  };

  App.mountCovers = function (root, opts) {
    (root || document).querySelectorAll('[data-cover]').forEach(function (el) {
      el.innerHTML = App.coverHTML(opts);
    });
  };

  App.mountYarns = function (root) {
    (root || document).querySelectorAll('[data-yarn]').forEach(function (el) {
      el.innerHTML = App.cat.yarn({ tail: false });
    });
  };
})();
