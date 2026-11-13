/* 솜이네 마루: 달밤의 한옥 마루 그림 (직접 그린 SVG) */
(function () {
  var App = (window.App = window.App || {});

  function stars() {
    var pts = [
      [60, 50, 1.6], [150, 110, 1.2], [230, 40, 1.8], [320, 150, 1.1], [400, 70, 1.5], [480, 30, 1.2], [560, 120, 1.7],
      [640, 60, 1.2], [720, 30, 1.6], [800, 100, 1.1], [880, 40, 1.4], [1130, 60, 1.5], [1170, 150, 1.1], [100, 190, 1.2],
      [270, 230, 1.4], [450, 200, 1.1], [610, 190, 1.3], [1090, 190, 1.2], [30, 130, 1.1], [760, 150, 1.3],
    ];
    return pts
      .map(function (p, i) {
        return '<circle class="sc-star" style="animation-delay:' + ((i * 0.37) % 3).toFixed(2) + 's" cx="' + p[0] + '" cy="' + p[1] + '" r="' + p[2] + '" fill="#fff"/>';
      })
      .join('');
  }

  function fireflies() {
    var pts = [[120, 330], [220, 280], [330, 350], [430, 300], [520, 360], [590, 310], [80, 380], [280, 390], [470, 250], [380, 400]];
    return pts
      .map(function (p, i) {
        return (
          '<g class="sc-fly" style="animation-delay:-' + (i * 1.3).toFixed(1) + 's;animation-duration:' + (7 + (i % 4) * 1.6) + 's">' +
          '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="9" fill="#FFF3A6" opacity=".18"/>' +
          '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="2.6" fill="#FFF7C2"/></g>'
        );
      })
      .join('');
  }

  function lattice(x, y, w, h) {
    var s = '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="url(#sc-paper)"/>';
    var i;
    s += '<g stroke="#8E6546" stroke-width="3" fill="none">';
    s += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '"/>';
    for (i = 1; i < 6; i++) s += '<path d="M' + (x + (w * i) / 6) + ' ' + y + ' v' + h + '"/>';
    for (i = 1; i < 4; i++) s += '<path d="M' + x + ' ' + (y + (h * i) / 4) + ' h' + w + '"/>';
    s += '</g>';
    s += '<path d="M' + (x + w / 2) + ' ' + y + ' v' + h + '" stroke="#6E4B37" stroke-width="6"/>';
    return s;
  }

  function note(x, y, rot, fill, peg) {
    return (
      '<g transform="translate(' + x + ' ' + y + ') rotate(' + rot + ')">' +
      '<rect x="-17" y="0" width="34" height="46" rx="3" fill="' + fill + '"/>' +
      '<path d="M-10 14 h20 M-10 23 h20 M-10 32 h13" stroke="#8B7E72" stroke-width="2.4" stroke-linecap="round"/>' +
      '<rect x="-4" y="-6" width="8" height="12" rx="2" fill="' + peg + '"/>' +
      '</g>'
    );
  }

  function eaveTiles() {
    var s = '';
    for (var x = 566; x < 1230; x += 22) s += '<circle cx="' + x + '" cy="240" r="7" fill="#1E2748"/>';
    return s;
  }

  /* opts.cat === false 이면 고양이를 빼고 그린다 */
  function maru(opts) {
    opts = opts || {};
    var cat = '';
    if (opts.cat !== false && App.cat) {
      cat = App.cat.sit({ mood: opts.mood || 'happy' }).replace('<svg ', '<svg x="742" y="296" width="140" height="178" ');
    }
    return (
      '<svg class="scene-maru" viewBox="0 0 1200 520" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="달밤의 한옥 마루에 랙돌 고양이 솜이가 앉아 있는 그림">' +
      '<style>' +
      '.sc-star{animation:sc-tw 3.2s ease-in-out infinite}@keyframes sc-tw{0%,100%{opacity:.9}50%{opacity:.25}}' +
      '.sc-fly{animation:sc-fl 9s ease-in-out infinite}@keyframes sc-fl{0%,100%{transform:translate(0,0);opacity:.2}30%{transform:translate(26px,-18px);opacity:1}60%{transform:translate(-14px,-34px);opacity:.5}80%{transform:translate(10px,-10px);opacity:1}}' +
      '.sc-glow{animation:sc-gl 4s ease-in-out infinite}@keyframes sc-gl{0%,100%{opacity:.75}50%{opacity:1}}' +
      '</style>' +
      '<defs>' +
      '<linearGradient id="sc-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#131A36"/><stop offset=".7" stop-color="#2B3C72"/><stop offset="1" stop-color="#3D5596"/></linearGradient>' +
      '<radialGradient id="sc-moon" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FFF4CF" stop-opacity=".5"/><stop offset="1" stop-color="#FFF4CF" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="sc-paper" cx="50%" cy="60%" r="75%"><stop offset="0" stop-color="#FFEFC4"/><stop offset="1" stop-color="#EFC98A"/></radialGradient>' +
      '<linearGradient id="sc-floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C39366"/><stop offset="1" stop-color="#8A6244"/></linearGradient>' +
      '<radialGradient id="sc-lamp" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FFD98A" stop-opacity=".7"/><stop offset="1" stop-color="#FFD98A" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="sc-spill" cx="50%" cy="0%" r="100%"><stop offset="0" stop-color="#FFE6AE" stop-opacity=".55"/><stop offset="1" stop-color="#FFE6AE" stop-opacity="0"/></radialGradient>' +
      '</defs>' +
      '<rect width="1200" height="520" fill="url(#sc-sky)"/>' +
      stars() +
      '<circle cx="905" cy="84" r="112" fill="url(#sc-moon)"/><circle cx="905" cy="84" r="46" fill="#FFF4CF"/>' +
      '<circle cx="892" cy="71" r="8" fill="#F3E3B0" opacity=".7"/><circle cx="920" cy="98" r="5.5" fill="#F3E3B0" opacity=".7"/>' +
      /* 먼 산 */
      '<path d="M0 340 C120 270 220 300 330 322 C430 262 540 280 640 320 C760 280 880 300 1200 330 V520 H0 Z" fill="#202C55"/>' +
      '<path d="M0 372 C140 330 300 350 420 366 C520 340 640 352 760 372 V520 H0 Z" fill="#1A2447"/>' +
      /* 한옥 */
      '<path d="M508 236 C590 226 652 198 694 158 L1260 158 L1260 240 L556 242 C540 242 522 240 508 236 Z" fill="#111730"/>' +
      '<path d="M694 158 L1260 158" stroke="#232D55" stroke-width="6"/>' +
      eaveTiles() +
      '<rect x="578" y="244" width="660" height="14" fill="#3B2A22"/>' +
      lattice(662, 262, 238, 138) +
      lattice(922, 262, 238, 138) +
      '<rect x="640" y="254" width="22" height="148" fill="#6E4B37"/><rect x="900" y="254" width="22" height="148" fill="#6E4B37"/><rect x="1160" y="254" width="22" height="148" fill="#6E4B37"/>' +
      '<rect x="640" y="254" width="6" height="148" fill="#8A6247"/><rect x="900" y="254" width="6" height="148" fill="#8A6247"/><rect x="1160" y="254" width="6" height="148" fill="#8A6247"/>' +
      /* 마루 */
      '<rect x="0" y="400" width="1200" height="120" fill="url(#sc-floor)"/>' +
      '<rect x="0" y="400" width="1200" height="7" fill="#DDB07E"/>' +
      '<g stroke="#7A543A" stroke-width="2" opacity=".55"><path d="M0 432 H1200 M0 466 H1200 M0 502 H1200"/>' +
      '<path d="M180 407 V432 M520 407 V432 M860 407 V432 M1120 407 V432 M60 432 V466 M380 432 V466 M700 432 V466 M1010 432 V466 M240 466 V502 M560 466 V502 M900 466 V502"/></g>' +
      '<ellipse cx="910" cy="404" rx="330" ry="96" fill="url(#sc-spill)"/>' +
      /* 빨랫줄과 삼행시 쪽지 */
      '<path d="M651 274 Q780 304 911 274 M911 274 Q1040 304 1171 274" fill="none" stroke="#E9DCC6" stroke-width="2.5"/>' +
      note(694, 284, -5, '#FFFDF5', '#E8604C') +
      note(960, 286, 4, '#FDE3E0', '#2C6BD9') +
      note(1018, 292, -3, '#E4EEFD', '#E8604C') +
      note(1078, 290, 5, '#FFF1C9', '#2E9E6B') +
      note(1130, 281, -4, '#FFFDF5', '#2C6BD9') +
      /* 청사초롱 */
      '<circle class="sc-glow" cx="606" cy="304" r="62" fill="url(#sc-lamp)"/>' +
      '<path d="M606 244 V276" stroke="#3B2A22" stroke-width="3"/>' +
      '<rect x="592" y="274" width="28" height="7" rx="2" fill="#3B2A22"/>' +
      '<path d="M588 281 h36 v24 h-36 Z" fill="#E8604C"/><path d="M588 305 h36 v22 q-18 8 -36 0 Z" fill="#2C6BD9"/>' +
      '<path d="M588 281 h36 v46 q-18 8 -36 0 Z" fill="none" stroke="#3B2A22" stroke-width="2.5"/>' +
      '<path d="M606 332 v16" stroke="#E8604C" stroke-width="3" stroke-linecap="round"/>' +
      /* 책 더미와 털실 */
      '<g transform="translate(688 438)"><rect x="0" y="16" width="58" height="12" rx="2" fill="#2C6BD9"/><rect x="5" y="4" width="50" height="12" rx="2" fill="#FFF1C9"/><rect x="2" y="-8" width="54" height="12" rx="2" fill="#E8604C"/></g>' +
      '<path d="M902 470 C860 496 760 474 660 492 C560 510 470 478 380 494" fill="none" stroke="#E8604C" stroke-width="3.5" stroke-linecap="round"/>' +
      '<g transform="translate(884 438) scale(.44)"><circle cx="50" cy="50" r="38" fill="#E8604C" stroke="#B8402F" stroke-width="5"/>' +
      '<g fill="none" stroke="#F58B76" stroke-width="5" stroke-linecap="round"><path d="M18 40 Q46 20 82 38"/><path d="M14 56 Q48 34 86 56"/><path d="M20 72 Q50 52 82 70"/></g></g>' +
      fireflies() +
      cat +
      '</svg>'
    );
  }

  App.scene = { maru: maru };

  App.mountScenes = function (root) {
    (root || document).querySelectorAll('[data-scene]').forEach(function (el) {
      var fn = App.scene[el.getAttribute('data-scene')];
      if (fn) el.innerHTML = fn();
    });
  };
})();
