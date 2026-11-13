/* 자모의 획(쓰는 순서) 자료와, 자모를 네모 칸 안에 모아 글자로 그리는 도구.
   모든 획은 100×100 칸 기준의 SVG 경로이며 배열 순서가 곧 쓰는 순서입니다. */
(function () {
  var App = (window.App = window.App || {});
  var H = App.hangul;

  var STROKES = {
    /* 자음자 */
    ㄱ: ['M18 24 L80 24 L75 84'],
    ㄴ: ['M22 16 L22 78 L84 78'],
    ㄷ: ['M18 22 L82 22', 'M20 22 L20 80 L84 80'],
    ㄹ: ['M18 18 L80 18 L80 49', 'M20 49 L80 49', 'M20 49 L20 82 L84 82'],
    ㅁ: ['M20 20 L20 82', 'M20 20 L80 20 L80 82', 'M20 82 L80 82'],
    ㅂ: ['M22 16 L22 84', 'M78 16 L78 84', 'M22 49 L78 49', 'M22 84 L78 84'],
    ㅅ: ['M50 16 Q46 56 16 84', 'M50 42 Q60 68 86 84'],
    /* 동그라미는 반원 두 개로 그린다(좁은 칸으로 줄여도 시작점과 끝점이 겹쳐 사라지지 않게) */
    ㅇ: ['M50 16 A34 34 0 1 0 50 84 A34 34 0 1 0 50 16'],
    ㅈ: ['M18 22 L80 22 Q66 60 18 86', 'M54 50 Q66 72 86 86'],
    ㅊ: ['M45 7 L57 15', 'M18 30 L80 30 Q66 62 18 88', 'M54 56 Q66 76 86 88'],
    ㅋ: ['M18 24 L80 24 L75 86', 'M20 53 L77 53'],
    ㅌ: ['M18 18 L82 18', 'M20 49 L80 49', 'M20 18 L20 82 L84 82'],
    ㅍ: ['M14 20 L86 20', 'M36 20 L36 80', 'M64 20 L64 80', 'M12 80 L88 80'],
    ㅎ: ['M44 6 L56 13', 'M16 28 L84 28', 'M50 40 A24 24 0 1 0 50 88 A24 24 0 1 0 50 40'],
    /* 모음자 */
    ㅏ: ['M42 10 L42 90', 'M42 50 L76 50'],
    ㅑ: ['M42 10 L42 90', 'M42 36 L76 36', 'M42 64 L76 64'],
    ㅓ: ['M24 50 L58 50', 'M58 10 L58 90'],
    ㅕ: ['M24 36 L58 36', 'M24 64 L58 64', 'M58 10 L58 90'],
    ㅗ: ['M50 24 L50 58', 'M10 58 L90 58'],
    ㅛ: ['M36 24 L36 58', 'M64 24 L64 58', 'M10 58 L90 58'],
    ㅜ: ['M10 42 L90 42', 'M50 42 L50 78'],
    ㅠ: ['M10 42 L90 42', 'M36 42 L36 78', 'M64 42 L64 78'],
    ㅡ: ['M10 50 L90 50'],
    ㅣ: ['M50 10 L50 90'],
    ㅐ: ['M30 14 L30 86', 'M30 50 L62 50', 'M62 10 L62 90'],
    ㅒ: ['M30 14 L30 86', 'M30 38 L62 38', 'M30 62 L62 62', 'M62 10 L62 90'],
    ㅔ: ['M14 50 L42 50', 'M42 14 L42 86', 'M70 10 L70 90'],
    ㅖ: ['M14 38 L42 38', 'M14 62 L42 62', 'M42 14 L42 86', 'M70 10 L70 90'],
  };

  /* 두 자모를 나란히 놓아 만드는 자모 (쌍자음·겹받침) */
  var PAIRS = {
    ㄲ: 'ㄱㄱ', ㄸ: 'ㄷㄷ', ㅃ: 'ㅂㅂ', ㅆ: 'ㅅㅅ', ㅉ: 'ㅈㅈ',
    ㄳ: 'ㄱㅅ', ㄵ: 'ㄴㅈ', ㄶ: 'ㄴㅎ', ㄺ: 'ㄹㄱ', ㄻ: 'ㄹㅁ', ㄼ: 'ㄹㅂ', ㄽ: 'ㄹㅅ', ㄾ: 'ㄹㅌ', ㄿ: 'ㄹㅍ', ㅀ: 'ㄹㅎ', ㅄ: 'ㅂㅅ',
  };

  /* 가로 모음 + 세로 모음으로 만드는 모음자 */
  var MIXED = { ㅘ: 'ㅗㅏ', ㅙ: 'ㅗㅐ', ㅚ: 'ㅗㅣ', ㅝ: 'ㅜㅓ', ㅞ: 'ㅜㅔ', ㅟ: 'ㅜㅣ', ㅢ: 'ㅡㅣ' };

  var VERT = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅣ';
  var WIDE = 'ㅐㅒㅔㅖ';

  function r(n) {
    return Math.round(n * 10) / 10;
  }

  /* 100×100 기준 경로를 box=[x, y, w, h] 안으로 옮긴다 */
  function mapPath(d, box) {
    var sx = box[2] / 100;
    var sy = box[3] / 100;
    var out = [];
    var re = /([MLQA])([^MLQA]*)/g;
    var m;
    while ((m = re.exec(d))) {
      var n = m[2].trim().split(/[\s,]+/).map(Number);
      if (m[1] === 'A') {
        out.push('A' + [r(n[0] * sx), r(n[1] * sy), n[2], n[3], n[4], r(box[0] + n[5] * sx), r(box[1] + n[6] * sy)].join(' '));
      } else {
        var pts = [];
        for (var i = 0; i < n.length; i += 2) pts.push(r(box[0] + n[i] * sx), r(box[1] + n[i + 1] * sy));
        out.push(m[1] + pts.join(' '));
      }
    }
    return out.join(' ');
  }

  /* 자모 하나의 획 목록 (100×100 기준). 쌍자음·겹받침·섞인 모음도 만들어 준다. */
  function jamo(j) {
    if (STROKES[j]) return STROKES[j].slice();
    var parts;
    if (PAIRS[j]) {
      parts = PAIRS[j].split('');
      return jamoIn(parts[0], [0, 4, 54, 92]).concat(jamoIn(parts[1], [46, 4, 54, 92]));
    }
    if (MIXED[j]) {
      parts = MIXED[j].split('');
      var wide = WIDE.indexOf(parts[1]) >= 0;
      return jamoIn(parts[0], [0, 18, wide ? 58 : 66, 78]).concat(jamoIn(parts[1], wide ? [40, 0, 60, 100] : [46, 0, 54, 100]));
    }
    return [];
  }

  function jamoIn(j, box) {
    return jamo(j).map(function (d) {
      return mapPath(d, box);
    });
  }

  /* 글자 한 자의 짜임: 어느 자모가 칸의 어디에 놓이는지 */
  function layout(parts) {
    var v = parts.jung;
    var fin = !!parts.jong;
    var type = VERT.indexOf(v) >= 0 ? 'v' : MIXED[v] ? 'm' : 'h';
    var b = {};
    if (type === 'v') {
      var wide = WIDE.indexOf(v) >= 0;
      b.cho = fin ? [wide ? 2 : 6, 2, wide ? 46 : 50, 56] : [wide ? 2 : 6, 12, wide ? 46 : 50, 76];
      b.jung = fin ? [wide ? 40 : 48, 0, wide ? 58 : 50, 60] : [wide ? 40 : 48, 2, wide ? 58 : 50, 96];
    } else if (type === 'h') {
      var down = 'ㅜㅠ'.indexOf(v) >= 0; // 아래로 내려 긋는 모음은 조금 올려 놓는다
      b.cho = fin ? [20, 0, 60, 36] : [18, 4, 64, 48];
      b.jung = fin ? [4, down ? 22 : 28, 92, 38] : [4, down ? 38 : 46, 92, 52];
    } else {
      var hv = MIXED[v].split('');
      var dn = 'ㅜ'.indexOf(hv[0]) >= 0;
      var wd = WIDE.indexOf(hv[1]) >= 0;
      b.cho = fin ? [6, 0, wd ? 46 : 52, 34] : [6, 4, wd ? 46 : 52, 46];
      b.jungH = fin ? [0, dn ? 22 : 28, wd ? 56 : 64, 38] : [0, dn ? 38 : 44, wd ? 56 : 64, 52];
      b.jungV = fin ? [wd ? 40 : 52, 0, wd ? 60 : 46, 60] : [wd ? 40 : 52, 2, wd ? 60 : 46, 96];
    }
    if (fin) b.jong = [14, 60, 72, 38];
    return { type: type, boxes: b };
  }

  /* 글자 한 자를 획으로 풀어 돌려준다.
     block('강') → [{role:'cho', jamo:'ㄱ', paths:[…]}, {role:'jung', …}, {role:'jong', …}]
     box를 주면 그 칸 안에 그린다(기본 0,0,100,100). */
  function block(syllable, box) {
    var parts = typeof syllable === 'string' ? H.decompose(syllable) : syllable;
    if (!parts) return [];
    var L = layout(parts);
    var cell = box || [0, 0, 100, 100];
    function place(b) {
      return [cell[0] + (b[0] * cell[2]) / 100, cell[1] + (b[1] * cell[3]) / 100, (b[2] * cell[2]) / 100, (b[3] * cell[3]) / 100];
    }
    var out = [{ role: 'cho', jamo: parts.cho, paths: jamoIn(parts.cho, place(L.boxes.cho)) }];
    if (L.type === 'm') {
      var hv = MIXED[parts.jung].split('');
      out.push({
        role: 'jung',
        jamo: parts.jung,
        paths: jamoIn(hv[0], place(L.boxes.jungH)).concat(jamoIn(hv[1], place(L.boxes.jungV))),
      });
    } else {
      out.push({ role: 'jung', jamo: parts.jung, paths: jamoIn(parts.jung, place(L.boxes.jung)) });
    }
    if (parts.jong) out.push({ role: 'jong', jamo: parts.jong, paths: jamoIn(parts.jong, place(L.boxes.jong)) });
    return out;
  }

  /* 획마다 순서 번호를 붙일 자리. 기본은 획의 시작점이고,
     앞 획과 시작점이 겹치면 자기 획이 나아가는 쪽으로 조금 옮긴다. */
  function numberSpots(paths, shift) {
    var step = shift || 13;
    var spots = [];
    paths.forEach(function (d) {
      var n = (d.match(/-?[\d.]+/g) || []).map(Number);
      var x = n[0];
      var y = n[1];
      var dx = n[2] - x;
      var dy = n[3] - y;
      if (/^M[^A-Z]*A/.test(d)) {
        /* 동그라미는 위에서 왼쪽으로 돈다 */
        dx = -1;
        dy = 0.35;
      }
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      var clash = spots.some(function (s) {
        return Math.abs(s[0] - x) < 9 && Math.abs(s[1] - y) < 9;
      });
      if (clash) {
        /* 획을 따라 조금 간 다음, 글자 가운데(50,50)에서 멀어지는 옆쪽으로 비켜 놓는다 */
        var ux = dx / len;
        var uy = dy / len;
        var side = (x - uy - 50) * (x - uy - 50) + (y + ux - 50) * (y + ux - 50) > (x + uy - 50) * (x + uy - 50) + (y - ux - 50) * (y - ux - 50) ? [-uy, ux] : [uy, -ux];
        x += ux * step * 0.6 + side[0] * step * 0.8;
        y += uy * step * 0.6 + side[1] * step * 0.8;
      }
      spots.push([r(x), r(y)]);
    });
    return spots;
  }

  /* SVG 문자열 조각: 획들을 <path>로. cls는 역할별 색을 주는 클래스 */
  function pathsHTML(paths, cls) {
    return paths
      .map(function (d) {
        return '<path class="' + (cls || '') + '" d="' + d + '" pathLength="1"/>';
      })
      .join('');
  }

  App.strokes = {
    STROKES: STROKES,
    PAIRS: PAIRS,
    MIXED: MIXED,
    jamo: jamo,
    jamoIn: jamoIn,
    mapPath: mapPath,
    layout: layout,
    block: block,
    numberSpots: numberSpots,
    pathsHTML: pathsHTML,
  };
})();
