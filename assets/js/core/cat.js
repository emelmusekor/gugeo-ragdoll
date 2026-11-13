/* 주인공 랙돌 '솜이'를 SVG로 그립니다. (직접 그린 원본 캐릭터)
   랙돌의 특징: 크림색 긴 털, 귀·얼굴·꼬리의 짙은 포인트, 얼굴 가운데 흰 ∧ 무늬, 파란 눈.

   App.cat.head({mood})   얼굴만            viewBox 240×214
   App.cat.sit({mood})    앉은 모습         viewBox 240×306
   App.cat.peek({mood})   턱을 걸친 모습    viewBox 240×214
   App.cat.yarn()         털실 공           viewBox 100×100

   mood: smile | happy | wow | sad | angry | shy | think | sleepy | scared | wink */
(function () {
  var App = (window.App = window.App || {});
  var uid = 0;

  var C = {
    line: '#4A3329', // 윤곽선
    cream: '#FFF9EC', // 몸 털
    white: '#FFFFFF',
    seal: '#7A5646', // 포인트(귀·얼굴·꼬리)
    sealLight: '#B8937D',
    ear: '#EDB9AB',
    nose: '#F29BA5',
    blush: '#F7B7BC',
    eye1: '#9AD0FF',
    eye2: '#3F86E0',
    eye3: '#1F56B4',
    pupil: '#1B2038',
    mouth: '#C9566B',
    tongue: '#F58E9C',
    whisker: '#8F7C6F',
    yarn: '#E8604C',
    yarnDark: '#B8402F',
    yarnLight: '#F58B76',
  };

  var HEAD =
    'M120 48 C150 46 178 58 194 82 C204 96 210 112 208 126 l14 6 l-12 8 l10 12 l-16 4 l4 14 l-18 -2 ' +
    'C172 186 148 194 120 194 C92 194 68 186 50 168 l-18 2 l4 -14 l-16 -4 l10 -12 l-12 -8 l14 -6 ' +
    'C30 112 36 96 46 82 C62 58 90 46 120 48 Z';

  var MASK_L = 'M34 100 C46 66 82 48 113 49 L105 94 C102 118 92 134 74 139 C54 142 37 130 35 112 Z';

  function eye(cx, cy, mood, side, id) {
    var open =
      '<g class="cat-eye" style="transform-origin:' + cx + 'px ' + cy + 'px">' +
      '<ellipse cx="' + cx + '" cy="' + cy + '" rx="15.5" ry="16.5" fill="url(#' + id + 'i)" stroke="' + C.line + '" stroke-width="3.5"/>' +
      '<ellipse cx="' + (cx + px(mood, side)) + '" cy="' + (cy + py(mood)) + '" rx="' + (mood === 'scared' ? 4 : 6.5) + '" ry="' + (mood === 'scared' ? 6 : 10) + '" fill="' + C.pupil + '"/>' +
      '<circle cx="' + (cx - 5 + px(mood, side)) + '" cy="' + (cy - 6 + py(mood)) + '" r="' + (mood === 'wow' ? 5.6 : 4.6) + '" fill="#fff"/>' +
      '<circle cx="' + (cx + 5 + px(mood, side)) + '" cy="' + (cy + 6 + py(mood)) + '" r="2.2" fill="#fff" opacity=".9"/>' +
      '</g>';
    var arcUp = '<path d="M' + (cx - 14) + ' ' + (cy + 4) + ' Q' + cx + ' ' + (cy - 14) + ' ' + (cx + 14) + ' ' + (cy + 4) + '" fill="none" stroke="' + C.line + '" stroke-width="4.5" stroke-linecap="round"/>';
    var arcDown = '<path d="M' + (cx - 13) + ' ' + (cy - 1) + ' Q' + cx + ' ' + (cy + 9) + ' ' + (cx + 13) + ' ' + (cy - 1) + '" fill="none" stroke="' + C.line + '" stroke-width="4.5" stroke-linecap="round"/>';
    if (mood === 'happy') return arcUp;
    if (mood === 'sleepy') return arcDown;
    if (mood === 'wink' && side > 0) return arcUp;
    return open;
  }
  function px(mood, side) {
    if (mood === 'think') return 4;
    if (mood === 'shy') return -3 * side;
    return 0;
  }
  function py(mood) {
    if (mood === 'think') return -4;
    if (mood === 'shy' || mood === 'sad') return 3;
    return 0;
  }

  function brows(mood) {
    var s = 'fill="none" stroke="' + C.line + '" stroke-width="4" stroke-linecap="round"';
    if (mood === 'sad' || mood === 'scared') return '<path d="M70 90 L96 82" ' + s + '/><path d="M170 90 L144 82" ' + s + '/>';
    if (mood === 'angry') return '<path d="M70 82 L98 92" ' + s + '/><path d="M170 82 L142 92" ' + s + '/>';
    if (mood === 'think') return '<path d="M142 84 Q156 78 170 86" ' + s + '/>';
    return '';
  }

  function mouth(mood) {
    var s = 'fill="none" stroke="' + C.line + '" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"';
    var w = '<path d="M120 145 V151 M120 151 Q112 161 102 155 M120 151 Q128 161 138 155" ' + s + '/>';
    if (mood === 'happy' || mood === 'wink')
      return (
        '<path d="M120 145 V150" ' + s + '/>' +
        '<path d="M104 151 Q120 150 136 151 Q134 170 120 171 Q106 170 104 151 Z" fill="' + C.mouth + '" stroke="' + C.line + '" stroke-width="3.5" stroke-linejoin="round"/>' +
        '<path d="M111 164 Q120 158 129 164 Q125 170 120 170 Q115 170 111 164 Z" fill="' + C.tongue + '"/>'
      );
    if (mood === 'wow' || mood === 'scared')
      return '<path d="M120 145 V149" ' + s + '/><ellipse cx="120" cy="158" rx="' + (mood === 'scared' ? 9 : 7) + '" ry="8.5" fill="' + C.mouth + '" stroke="' + C.line + '" stroke-width="3.5"/>';
    if (mood === 'sad') return '<path d="M120 145 V151 M106 161 Q120 150 134 161" ' + s + '/>';
    if (mood === 'angry') return '<path d="M120 145 V150 M106 159 Q113 152 120 157 Q127 152 134 159" ' + s + '/>';
    if (mood === 'think') return '<path d="M120 145 V151 M112 156 H130" ' + s + '/>';
    if (mood === 'sleepy') return '<path d="M120 145 V151 M113 155 Q120 160 127 155" ' + s + '/>';
    return w;
  }

  function extras(mood) {
    if (mood === 'sad') return '<path d="M70 132 q-7 12 0 17 q7 -5 0 -17 Z" fill="#8CC6FF" stroke="' + C.eye2 + '" stroke-width="1.5"/>';
    if (mood === 'sleepy') return '<text x="196" y="52" font-size="26" font-weight="700" fill="' + C.eye2 + '" font-family="sans-serif">z</text><text x="212" y="32" font-size="18" font-weight="700" fill="' + C.eye2 + '" font-family="sans-serif">z</text>';
    if (mood === 'wow') return '<path d="M30 46 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 l10 -4 Z" fill="#FFC94A"/><path d="M212 30 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3 Z" fill="#FFC94A"/>';
    if (mood === 'angry') return '<path d="M196 44 l10 -10 M206 44 l-10 -10 M186 30 l10 0" fill="none" stroke="#E8604C" stroke-width="4" stroke-linecap="round"/>';
    if (mood === 'scared') return '<path d="M38 60 q-5 9 0 13 q5 -4 0 -13 Z" fill="#8CC6FF"/>';
    return '';
  }

  /* 얼굴 한 벌 (귀 → 머리 → 포인트 무늬 → 윤곽 → 이목구비) */
  function face(mood, id, o) {
    var sw = o.bold ? 7 : 4;
    var blush = mood === 'shy' ? 0.95 : 0.55;
    var ear =
      '<path d="M46 92 C43 62 50 34 60 19 C77 27 95 42 105 58 Z" fill="' + C.seal + '" stroke="' + C.line + '" stroke-width="' + sw + '" stroke-linejoin="round"/>' +
      '<path d="M58 78 C57 60 60 45 65 36 C74 42 84 50 91 60 Z" fill="' + C.ear + '"/>';
    return (
      '<defs>' +
      '<radialGradient id="' + id + 'i" cx="50%" cy="38%" r="70%"><stop offset="0" stop-color="' + C.eye1 + '"/><stop offset=".55" stop-color="' + C.eye2 + '"/><stop offset="1" stop-color="' + C.eye3 + '"/></radialGradient>' +
      '<linearGradient id="' + id + 'm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + C.seal + '"/><stop offset="1" stop-color="' + C.sealLight + '"/></linearGradient>' +
      '<clipPath id="' + id + 'c"><path d="' + HEAD + '"/></clipPath>' +
      '<filter id="' + id + 'b" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3.2"/></filter>' +
      '</defs>' +
      ear +
      '<g transform="translate(240 0) scale(-1 1)">' + ear + '</g>' +
      '<path d="' + HEAD + '" fill="' + C.cream + '"/>' +
      '<g clip-path="url(#' + id + 'c)"><g filter="url(#' + id + 'b)" fill="url(#' + id + 'm)">' +
      '<path d="' + MASK_L + '"/><g transform="translate(240 0) scale(-1 1)"><path d="' + MASK_L + '"/></g>' +
      '</g></g>' +
      '<path d="' + HEAD + '" fill="none" stroke="' + C.line + '" stroke-width="' + sw + '" stroke-linejoin="round"/>' +
      '<ellipse cx="62" cy="150" rx="13" ry="8" fill="' + C.blush + '" opacity="' + blush + '"/>' +
      '<ellipse cx="178" cy="150" rx="13" ry="8" fill="' + C.blush + '" opacity="' + blush + '"/>' +
      (o.bold
        ? ''
        : '<g fill="none" stroke="' + C.whisker + '" stroke-width="1.8" stroke-linecap="round" opacity=".85">' +
          '<path d="M80 150 Q52 142 20 140"/><path d="M80 156 Q50 156 18 158"/><path d="M82 162 Q54 168 26 176"/>' +
          '<path d="M160 150 Q188 142 220 140"/><path d="M160 156 Q190 156 222 158"/><path d="M158 162 Q186 168 214 176"/>' +
          '</g>') +
      brows(mood) +
      eye(86, 114, mood, -1, id) +
      eye(154, 114, mood, 1, id) +
      '<path d="M111 136 Q120 132 129 136 Q127 144 120 146 Q113 144 111 136 Z" fill="' + C.nose + '" stroke="' + C.line + '" stroke-width="2"/>' +
      mouth(mood) +
      extras(mood)
    );
  }

  function wrap(viewBox, inner, o, label) {
    var cls = 'cat' + (o.blink === false ? '' : ' cat-blink') + (o.class ? ' ' + o.class : '');
    return (
      '<svg class="' + cls + '" viewBox="' + viewBox + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + (o.label || label) + '">' + inner + '</svg>'
    );
  }

  function head(o) {
    o = o || {};
    var id = 'c' + ++uid;
    return wrap('0 0 240 214', face(o.mood || 'smile', id, o), o, '랙돌 고양이 솜이');
  }

  function sit(o) {
    o = o || {};
    var id = 'c' + ++uid;
    var L = 'stroke="' + C.line + '" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"';
    var body =
      /* 꼬리 */
      '<g class="cat-tail" style="transform-origin:168px 268px"><path d="M152 276 C204 292 240 254 226 212 C220 192 196 190 194 210 C192 232 184 246 152 250 Z" fill="' + C.seal + '" ' + L + '/>' +
      '<path d="M204 216 q6 14 -2 30 M214 232 q0 12 -8 22" fill="none" stroke="' + C.sealLight + '" stroke-width="3" stroke-linecap="round" opacity=".7"/></g>' +
      /* 몸 */
      '<path d="M72 176 C42 206 36 262 58 286 C74 300 166 300 182 286 C204 262 198 206 168 176 Z" fill="' + C.cream + '" ' + L + '/>' +
      /* 가슴 털 */
      '<path d="M92 196 q8 14 14 4 q6 14 14 2 q8 12 14 -2 q6 10 14 -4" fill="none" stroke="' + C.line + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity=".55"/>' +
      /* 앞발 */
      '<ellipse cx="98" cy="286" rx="21" ry="13" fill="' + C.white + '" ' + L + '/>' +
      '<ellipse cx="142" cy="286" rx="21" ry="13" fill="' + C.white + '" ' + L + '/>' +
      '<path d="M91 284 v8 M105 284 v8 M135 284 v8 M149 284 v8" fill="none" stroke="' + C.line + '" stroke-width="2.5" stroke-linecap="round" opacity=".6"/>';
    return wrap('0 0 240 306', body + face(o.mood || 'smile', id, o), o, '앉아 있는 랙돌 고양이 솜이');
  }

  function peek(o) {
    o = o || {};
    var id = 'c' + ++uid;
    var L = 'stroke="' + C.line + '" stroke-width="4" stroke-linejoin="round"';
    var paws =
      '<ellipse cx="66" cy="198" rx="24" ry="14" fill="' + C.white + '" ' + L + '/>' +
      '<ellipse cx="174" cy="198" rx="24" ry="14" fill="' + C.white + '" ' + L + '/>' +
      '<path d="M58 196 v9 M74 196 v9 M166 196 v9 M182 196 v9" fill="none" stroke="' + C.line + '" stroke-width="2.5" stroke-linecap="round" opacity=".6"/>';
    return wrap('0 0 240 214', face(o.mood || 'smile', id, o) + paws, o, '빼꼼 내다보는 랙돌 고양이 솜이');
  }

  function yarn(o) {
    o = o || {};
    return (
      '<svg class="yarn' + (o.class ? ' ' + o.class : '') + '" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      (o.tail === false ? '' : '<path d="M78 78 Q92 92 70 96 Q52 99 44 92" fill="none" stroke="' + C.yarn + '" stroke-width="4" stroke-linecap="round"/>') +
      '<circle cx="50" cy="50" r="38" fill="' + C.yarn + '" stroke="' + C.yarnDark + '" stroke-width="4"/>' +
      '<g fill="none" stroke="' + C.yarnLight + '" stroke-width="3.5" stroke-linecap="round">' +
      '<path d="M18 40 Q46 20 82 38"/><path d="M14 56 Q48 34 86 56"/><path d="M20 72 Q50 52 82 70"/>' +
      '</g>' +
      '<g fill="none" stroke="' + C.yarnDark + '" stroke-width="3" stroke-linecap="round" opacity=".55">' +
      '<path d="M34 18 Q58 46 44 86"/><path d="M56 14 Q78 46 62 86"/>' +
      '</g>' +
      '</svg>'
    );
  }

  /* 발바닥 도장 */
  function paw(color) {
    var c = color || C.yarn;
    return (
      '<svg class="paw" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g fill="' + c + '">' +
      '<ellipse cx="50" cy="66" rx="24" ry="19"/><ellipse cx="22" cy="42" rx="9" ry="12" transform="rotate(-24 22 42)"/>' +
      '<ellipse cx="40" cy="26" rx="9" ry="12" transform="rotate(-8 40 26)"/><ellipse cx="60" cy="26" rx="9" ry="12" transform="rotate(8 60 26)"/>' +
      '<ellipse cx="78" cy="42" rx="9" ry="12" transform="rotate(24 78 42)"/></g></svg>'
    );
  }

  App.cat = { head: head, sit: sit, peek: peek, yarn: yarn, paw: paw, colors: C };

  /* data-cat="sit|head|peek" data-mood="…" 인 자리에 솜이를 그려 넣는다 */
  App.mountCats = function (root) {
    (root || document).querySelectorAll('[data-cat]').forEach(function (el) {
      if (el.dataset.catDone) return;
      var kind = el.getAttribute('data-cat') || 'head';
      var fn = App.cat[kind] || App.cat.head;
      el.innerHTML = fn({ mood: el.getAttribute('data-mood') || 'smile', bold: el.hasAttribute('data-bold') });
      el.dataset.catDone = '1';
    });
  };
})();
