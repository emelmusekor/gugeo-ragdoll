/* 사이트 전체에서 쓰는 이름·문구. 브랜드를 바꾸려면 여기만 고치면 됩니다. */
(function () {
  var App = (window.App = window.App || {});

  App.config = {
    brand: '국어하니',
    tagline: '고등 공통국어부터 초등까지 · 국어를 움직이는 그림으로',
    cat: '하니', // 주인공 랙돌 이름
    book: '국어 공책', // 핸드북 이름
    rest: '하니네 마루', // 쉼터 이름
    shelf: '학습지 서랍', // 인쇄 학습지 모음 이름
    curriculum: '2022 개정 교육과정',
    curriculumNote: '교육부 고시 제2022-33호 [별책 5] 국어과 교육과정',
    storageKey: 'gugeo-ragdoll.v1',
  };

  /* data-brand 속성이 붙은 곳에 이름을 채워 넣습니다. */
  App.applyBrand = function (root) {
    (root || document).querySelectorAll('[data-brand]').forEach(function (el) {
      var key = el.getAttribute('data-brand') || 'brand';
      if (App.config[key] != null) el.textContent = App.config[key];
    });
  };
})();
