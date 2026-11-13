/* 한글 다루기: 글자 합치기·풀기, 조사 고르기, 초성 뽑기, 두음 법칙 */
(function () {
  var App = (window.App = window.App || {});

  var CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
  var JUNG = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'];
  var JONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

  var NAMES = {
    ㄱ: '기역', ㄴ: '니은', ㄷ: '디귿', ㄹ: '리을', ㅁ: '미음', ㅂ: '비읍', ㅅ: '시옷',
    ㅇ: '이응', ㅈ: '지읒', ㅊ: '치읓', ㅋ: '키읔', ㅌ: '티읕', ㅍ: '피읖', ㅎ: '히읗',
    ㄲ: '쌍기역', ㄸ: '쌍디귿', ㅃ: '쌍비읍', ㅆ: '쌍시옷', ㅉ: '쌍지읒',
    ㅏ: '아', ㅑ: '야', ㅓ: '어', ㅕ: '여', ㅗ: '오', ㅛ: '요', ㅜ: '우', ㅠ: '유', ㅡ: '으', ㅣ: '이',
    ㅐ: '애', ㅒ: '얘', ㅔ: '에', ㅖ: '예', ㅘ: '와', ㅙ: '왜', ㅚ: '외', ㅝ: '워', ㅞ: '웨', ㅟ: '위', ㅢ: '의',
  };

  function isSyllable(ch) {
    var c = ch ? ch.charCodeAt(0) : 0;
    return c >= 0xac00 && c <= 0xd7a3;
  }

  /* compose('ㄱ','ㅏ','ㅇ') → '강'. 만들 수 없으면 '' */
  function compose(cho, jung, jong) {
    var ci = CHO.indexOf(cho);
    var ji = JUNG.indexOf(jung);
    var ki = JONG.indexOf(jong || '');
    if (ci < 0 || ji < 0 || ki < 0) return '';
    return String.fromCharCode(0xac00 + (ci * 21 + ji) * 28 + ki);
  }

  /* decompose('강') → {cho:'ㄱ', jung:'ㅏ', jong:'ㅇ'} */
  function decompose(ch) {
    if (!isSyllable(ch)) return null;
    var n = ch.charCodeAt(0) - 0xac00;
    return { cho: CHO[Math.floor(n / 588)], jung: JUNG[Math.floor((n % 588) / 28)], jong: JONG[n % 28] };
  }

  function hasBatchim(word) {
    var d = decompose(String(word).slice(-1));
    return !!(d && d.jong);
  }

  /* josa('사과', '을/를') → '를'   josa('책', '이/가') → '이'
     '으로/로'는 ㄹ 받침일 때도 '로' */
  function josa(word, pair) {
    var parts = pair.split('/');
    var d = decompose(String(word).slice(-1));
    if (!d) return parts[0];
    if (pair === '으로/로') return d.jong && d.jong !== 'ㄹ' ? '으로' : '로';
    return d.jong ? parts[0] : parts[1];
  }

  function withJosa(word, pair) {
    return word + josa(word, pair);
  }

  /* chosung('고양이') → 'ㄱㅇㅇ' */
  function chosung(word) {
    return String(word)
      .split('')
      .map(function (ch) {
        var d = decompose(ch);
        return d ? d.cho : ch;
      })
      .join('');
  }

  /* 두음 법칙: 끝말잇기에서 '리'로 끝나면 '이'로 시작해도 되는 것처럼
     같은 소리로 볼 수 있는 첫 글자들을 돌려준다. dueum('리') → ['리','이'] */
  function dueum(syl) {
    var d = decompose(syl);
    if (!d) return [syl];
    var out = [syl];
    var yVowel = 'ㅑㅕㅖㅛㅠㅣ'.indexOf(d.jung) >= 0;
    if (d.cho === 'ㄹ') out.push(compose(yVowel ? 'ㅇ' : 'ㄴ', d.jung, d.jong));
    if (d.cho === 'ㄴ' && yVowel) out.push(compose('ㅇ', d.jung, d.jong));
    return out;
  }

  function isHangulWord(word) {
    return /^[가-힣]+$/.test(word);
  }

  App.hangul = {
    CHO: CHO,
    JUNG: JUNG,
    JONG: JONG,
    NAMES: NAMES,
    isSyllable: isSyllable,
    compose: compose,
    decompose: decompose,
    hasBatchim: hasBatchim,
    josa: josa,
    withJosa: withJosa,
    chosung: chosung,
    dueum: dueum,
    isHangulWord: isHangulWord,
  };
})();
