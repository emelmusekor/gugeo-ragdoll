/* 문학 방탈출: three.js 로 그린 3D 방에서 단서를 풀고 글자 조각을 모아 문을 연다.
   방과 문제는 data/escape-rooms.js, 3D 그림과 진행은 이 파일. */
(function () {
  'use strict';
  var App = window.App;
  var h = App.h;
  var E = App.escape;
  var $ = function (s) { return document.querySelector(s); };

  var R = 5; // 방 반지름(벽까지 거리)
  var H = 3.2; // 천장 높이
  var EYE = 1.55;
  var QUARTER = Math.PI / 2;
  var WALL_NAMES = ['앞', '왼쪽', '뒤', '오른쪽'];
  var FONT = "'Gowun Batang', 'Nanum Myeongjo', serif";

  /* ───────────── 소리 ───────────── */
  var AC = null;
  var MUTE = false;
  try { MUTE = localStorage.getItem('gugeo-escape-mute') === '1'; } catch (e) {}
  var SFX = {
    ok: [[660, 0.08], [880, 0.14]], bad: [[220, 0.1], [170, 0.16]], tile: [[784, 0.06], [1046, 0.12]],
    click: [[540, 0.035]], turn: [[392, 0.04]], open: [[392, 0.12], [523, 0.12], [659, 0.12], [784, 0.12], [1046, 0.3]],
  };
  function beep(type) {
    if (MUTE) return;
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      if (AC.state === 'suspended' && AC.resume) AC.resume();
      var t = AC.currentTime;
      (SFX[type] || SFX.click).forEach(function (n) {
        var o = AC.createOscillator();
        var g = AC.createGain();
        o.type = 'triangle';
        o.frequency.value = n[0];
        g.gain.setValueAtTime(type === 'click' || type === 'turn' ? 0.04 : 0.1, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + n[1]);
        o.connect(g).connect(AC.destination);
        o.start(t);
        o.stop(t + n[1] + 0.02);
        t += n[1];
      });
    } catch (e) {}
  }

  /* ───────────── 기록 ───────────── */
  function progKey(id) { return 'escape:' + id; }
  function loadProg(id) { return App.store.kv(progKey(id)) || null; }
  function saveProg() {
    if (!G) return;
    App.store.kv(progKey(G.room.id), { solved: G.solved.slice(), hints: G.hints, mistakes: G.mistakes, t: elapsed(), done: G.done });
  }
  function best(id) { return App.store.kv('escapeBest:' + id) || null; }

  function fmtTime(ms) {
    var s = Math.floor(ms / 1000);
    var m = Math.floor(s / 60);
    s = s % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  /* ═════════════ 로비 ═════════════ */
  function renderLobby(focusId) {
    var list = $('#es-rooms');
    list.innerHTML = '';
    E.rooms.forEach(function (r, i) {
      var b = best(r.id);
      var p = loadProg(r.id);
      var going = p && !p.done && p.solved && p.solved.length;
      var stars = b ? '★★★'.slice(0, b.stars) + '☆☆☆'.slice(0, 3 - b.stars) : '';
      var card = h('article', { class: 'es-room tone-' + i + (focusId === r.id ? ' is-focus' : ''), id: 'room-' + r.id },
        h('div', { class: 'es-room-art', html: roomArt(r, i) }),
        h('div', { class: 'es-room-body' },
          h('p', { class: 'es-room-sub' }, r.sub),
          h('h2', { class: 'display' }, r.title),
          h('p', { class: 'es-room-intro' }, r.intro),
          h('p', { class: 'es-room-meta' },
            h('span', null, '권장 ' + r.level),
            h('span', null, '단서 ' + r.items.length + '개'),
            b ? h('span', { class: 'es-best' }, '최고 기록 ' + fmtTime(b.time) + ' ' + stars) : null,
            going ? h('span', { class: 'es-going' }, '조각 ' + p.solved.length + '/' + r.items.length + ' 진행 중') : null
          ),
          h('div', { class: 'es-room-cta' },
            h('button', { type: 'button', class: 'btn coral', onclick: function () { enter(r.id, false); } }, going ? '이어서 탈출하기' : '입장하기'),
            going ? h('button', { type: 'button', class: 'btn ghost small', onclick: function () { enter(r.id, true); } }, '처음부터') : null
          )
        )
      );
      list.appendChild(card);
    });
    if (focusId) {
      var el = document.getElementById('room-' + focusId);
      if (el) setTimeout(function () { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 200);
    }
  }

  function roomArt(r, i) {
    var bg = ['#1f2a52', '#efe2c6', '#3b2a22'][i % 3];
    var fg = ['#fff4cf', '#6e4b37', '#ffcf8a'][i % 3];
    var s = '<svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">';
    s += '<rect width="320" height="180" fill="' + bg + '"/>';
    s += '<path d="M0 140 L320 140 L320 180 L0 180Z" fill="rgba(0,0,0,.25)"/>';
    s += '<rect x="40" y="36" width="90" height="70" rx="3" fill="none" stroke="' + fg + '" stroke-width="3"/>';
    s += '<path d="M85 36 V106 M40 71 H130" stroke="' + fg + '" stroke-width="2"/>';
    s += '<rect x="200" y="40" width="70" height="100" rx="3" fill="none" stroke="' + fg + '" stroke-width="3"/>';
    s += '<circle cx="258" cy="92" r="5" fill="' + fg + '"/>';
    var word = r.final.word;
    for (var k = 0; k < word.length; k++) {
      s += '<g transform="translate(' + (150 + (k - word.length / 2) * 30) + ' 150) rotate(' + ((k % 2 ? 6 : -6)) + ')"><rect x="0" y="0" width="26" height="26" rx="4" fill="#fffdf8" stroke="#e9b7ac" stroke-width="2"/><text x="13" y="19" font-size="16" font-family="Gowun Batang, serif" font-weight="700" text-anchor="middle" fill="#2c2521">?</text></g>';
    }
    if (i === 0) s += '<circle cx="290" cy="26" r="12" fill="#fff4cf"/><circle cx="60" cy="20" r="1.6" fill="#fff"/><circle cx="160" cy="14" r="1.4" fill="#fff"/><circle cx="230" cy="24" r="1.2" fill="#fff"/>';
    s += '</svg>';
    return s;
  }

  /* ═════════════ 3D ═════════════ */
  var THREE = window.THREE;
  var renderer, scene, camera, raycaster, pointer;
  var G = null; // 지금 하는 게임
  var cam = { yaw: 0, pitch: -0.04, yawT: 0, pitchT: -0.04, offYaw: 0, offPitch: 0, fov: 62, fovT: 62, focus: null };
  var hover = null;
  var clock3 = null;
  var running = false;

  function tex(w, hgt, draw) {
    var c = document.createElement('canvas');
    c.width = w;
    c.height = hgt;
    var g = c.getContext('2d');
    draw(g, w, hgt);
    var t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }
  function mat(color, o) {
    o = o || {};
    return new THREE.MeshStandardMaterial({ color: color, roughness: o.rough != null ? o.rough : 0.8, metalness: o.metal || 0, map: o.map || null, emissive: o.emissive || 0x000000, emissiveIntensity: o.ei || 0, transparent: !!o.transparent, opacity: o.opacity != null ? o.opacity : 1, side: o.side || THREE.FrontSide, wireframe: !!o.wire });
  }
  function box(w, hgt, d, m, x, y, z) {
    var mesh = new THREE.Mesh(new THREE.BoxGeometry(w, hgt, d), m);
    mesh.position.set(x || 0, y || 0, z || 0);
    return mesh;
  }
  function cyl(rt, rb, hgt, m, x, y, z, seg) {
    var mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, hgt, seg || 24), m);
    mesh.position.set(x || 0, y || 0, z || 0);
    return mesh;
  }
  function shade(hex, k) {
    var c = new THREE.Color(hex);
    c.multiplyScalar(k);
    return c;
  }

  /* ───── 무늬 ───── */
  function woodTex(base) {
    return tex(512, 512, function (g, w, hgt) {
      g.fillStyle = base;
      g.fillRect(0, 0, w, hgt);
      for (var p = 0; p < 6; p++) {
        var y0 = (p * hgt) / 6;
        g.fillStyle = 'rgba(0,0,0,' + (0.04 + (p % 3) * 0.03) + ')';
        g.fillRect(0, y0, w, hgt / 6);
        for (var i = 0; i < 22; i++) {
          g.strokeStyle = 'rgba(40,20,10,' + (0.05 + Math.random() * 0.08) + ')';
          g.lineWidth = 1 + Math.random() * 1.5;
          g.beginPath();
          var yy = y0 + Math.random() * (hgt / 6);
          g.moveTo(0, yy);
          for (var x = 0; x <= w; x += 32) g.lineTo(x, yy + Math.sin(x / 60 + i) * 2.5);
          g.stroke();
        }
        g.fillStyle = 'rgba(30,15,8,.45)';
        g.fillRect(0, y0, w, 2);
        var seam = ((p * 197) % w);
        g.fillRect(seam, y0, 2, hgt / 6);
      }
    });
  }
  function hanjiTex(base) {
    return tex(512, 512, function (g, w, hgt) {
      g.fillStyle = base;
      g.fillRect(0, 0, w, hgt);
      for (var i = 0; i < 2400; i++) {
        g.fillStyle = 'rgba(' + (Math.random() < 0.5 ? '255,255,255' : '120,90,60') + ',' + Math.random() * 0.06 + ')';
        g.fillRect(Math.random() * w, Math.random() * hgt, 2, 2);
      }
      for (var k = 0; k < 90; k++) {
        g.strokeStyle = 'rgba(255,255,255,' + (0.08 + Math.random() * 0.12) + ')';
        g.lineWidth = 0.8;
        g.beginPath();
        var x = Math.random() * w;
        var y = Math.random() * hgt;
        g.moveTo(x, y);
        g.quadraticCurveTo(x + Math.random() * 40 - 20, y + Math.random() * 40 - 20, x + Math.random() * 60 - 30, y + Math.random() * 60 - 30);
        g.stroke();
      }
    });
  }
  function wongojiTex(text) {
    return tex(512, 384, function (g, w, hgt) {
      g.fillStyle = '#fffbef';
      g.fillRect(0, 0, w, hgt);
      var cols = 12;
      var rows = 9;
      var cw = (w - 40) / cols;
      var ch = (hgt - 40) / rows;
      g.strokeStyle = '#d9826f';
      g.lineWidth = 1.4;
      for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) g.strokeRect(20 + c * cw, 20 + r * ch, cw, ch);
      g.fillStyle = '#2c2521';
      g.font = '700 ' + Math.floor(cw * 0.62) + 'px ' + FONT;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      var lines = String(text || '').split('\n');
      lines.forEach(function (line, r) {
        Array.from(line).forEach(function (ch2, c) {
          if (c < cols && r < rows) g.fillText(ch2, 20 + c * cw + cw / 2, 20 + r * ch + ch / 2 + 2);
        });
      });
    });
  }
  function artTex(kind, night) {
    return tex(512, 400, function (g, w, hgt) {
      var grd;
      if (kind === 'winter') {
        grd = g.createLinearGradient(0, 0, 0, hgt);
        grd.addColorStop(0, '#6b7a99');
        grd.addColorStop(1, '#c9d3e3');
        g.fillStyle = grd;
        g.fillRect(0, 0, w, hgt);
        g.lineWidth = 16;
        ['#8a96a8', '#a7b1bf', '#c3cad4', '#dfe3e9'].forEach(function (c, i) {
          g.strokeStyle = c;
          g.beginPath();
          g.arc(w / 2, hgt * 0.95, 200 - i * 16, Math.PI, 0);
          g.stroke();
        });
        g.fillStyle = '#f4f6fa';
        g.beginPath();
        g.moveTo(0, hgt);
        g.lineTo(0, hgt * 0.7);
        g.lineTo(w * 0.3, hgt * 0.5);
        g.lineTo(w * 0.55, hgt * 0.72);
        g.lineTo(w * 0.8, hgt * 0.55);
        g.lineTo(w, hgt * 0.68);
        g.lineTo(w, hgt);
        g.fill();
        g.fillStyle = '#2c2521';
        g.beginPath();
        g.moveTo(w * 0.3, hgt * 0.5);
        g.lineTo(w * 0.3 - 6, hgt * 0.5 - 30);
        g.lineTo(w * 0.3 + 6, hgt * 0.5 - 30);
        g.fill();
        for (var s = 0; s < 120; s++) {
          g.fillStyle = 'rgba(255,255,255,.8)';
          g.fillRect(Math.random() * w, Math.random() * hgt, 2, 2);
        }
      } else if (kind === 'river') {
        g.fillStyle = '#efe6d2';
        g.fillRect(0, 0, w, hgt);
        g.strokeStyle = 'rgba(40,40,50,.55)';
        for (var i = 0; i < 14; i++) {
          g.lineWidth = 2 + (i % 3);
          g.beginPath();
          var y = 150 + i * 18;
          g.moveTo(0, y);
          for (var x = 0; x <= w; x += 20) g.lineTo(x, y + Math.sin(x / 30 + i) * 6);
          g.stroke();
        }
        g.fillStyle = 'rgba(40,40,50,.75)';
        g.beginPath();
        g.moveTo(0, 140);
        g.quadraticCurveTo(80, 40, 160, 120);
        g.quadraticCurveTo(220, 60, 300, 130);
        g.lineTo(0, 140);
        g.fill();
        g.fillStyle = '#2c2521';
        g.beginPath();
        g.arc(330, 215, 8, 0, Math.PI * 2);
        g.fill();
        g.fillRect(326, 222, 8, 26);
        g.fillStyle = '#b33';
        g.fillRect(w - 70, 30, 34, 34);
        g.fillStyle = '#fff';
        g.font = '700 20px ' + FONT;
        g.fillText('渡', w - 63, 55);
      } else if (kind === 'night') {
        grd = g.createLinearGradient(0, 0, 0, hgt);
        grd.addColorStop(0, '#131a36');
        grd.addColorStop(1, '#3d5596');
        g.fillStyle = grd;
        g.fillRect(0, 0, w, hgt);
        for (var k = 0; k < 90; k++) {
          g.fillStyle = 'rgba(255,255,255,' + (0.4 + Math.random() * 0.6) + ')';
          g.beginPath();
          g.arc(Math.random() * w, Math.random() * hgt * 0.75, Math.random() * 1.8 + 0.4, 0, Math.PI * 2);
          g.fill();
        }
        g.fillStyle = '#fff4cf';
        g.beginPath();
        g.arc(w * 0.75, hgt * 0.25, 34, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#1a2447';
        g.beginPath();
        g.moveTo(0, hgt);
        g.quadraticCurveTo(w * 0.3, hgt * 0.7, w * 0.6, hgt * 0.85);
        g.quadraticCurveTo(w * 0.8, hgt * 0.75, w, hgt * 0.82);
        g.lineTo(w, hgt);
        g.fill();
      } else if (kind === 'day') {
        grd = g.createLinearGradient(0, 0, 0, hgt);
        grd.addColorStop(0, '#8fc4ef');
        grd.addColorStop(1, '#e3f1fb');
        g.fillStyle = grd;
        g.fillRect(0, 0, w, hgt);
        g.fillStyle = '#7ba86a';
        g.beginPath();
        g.moveTo(0, hgt);
        g.quadraticCurveTo(w * 0.3, hgt * 0.55, w * 0.6, hgt * 0.8);
        g.quadraticCurveTo(w * 0.85, hgt * 0.6, w, hgt * 0.75);
        g.lineTo(w, hgt);
        g.fill();
        g.fillStyle = '#fff';
        [[120, 80], [360, 120]].forEach(function (c) {
          g.beginPath();
          g.arc(c[0], c[1], 22, 0, 7);
          g.arc(c[0] + 26, c[1] - 6, 26, 0, 7);
          g.arc(c[0] + 52, c[1], 20, 0, 7);
          g.fill();
        });
      } else if (kind === 'songs') {
        g.fillStyle = '#f4ead4';
        g.fillRect(0, 0, w, hgt);
        var names = ['향가', '신체시', '고대 가요', '고려 가요'];
        for (var p = 0; p < 4; p++) {
          var x0 = (p * w) / 4;
          g.strokeStyle = '#6e4b37';
          g.lineWidth = 6;
          g.strokeRect(x0 + 3, 3, w / 4 - 6, hgt - 6);
          g.strokeStyle = 'rgba(46,110,80,.6)';
          g.lineWidth = 3;
          g.beginPath();
          g.moveTo(x0 + 20, hgt - 60);
          g.quadraticCurveTo(x0 + 64, hgt - 140 - p * 10, x0 + 108, hgt - 70);
          g.stroke();
          g.fillStyle = '#2c2521';
          g.font = '700 28px ' + FONT;
          g.textAlign = 'center';
          Array.from(names[p]).forEach(function (ch2, k) {
            g.fillText(ch2, x0 + w / 8, 60 + k * 34);
          });
        }
      } else if (kind === 'map') {
        g.fillStyle = '#efdcb4';
        g.fillRect(0, 0, w, hgt);
        g.strokeStyle = 'rgba(120,80,40,.4)';
        for (var m = 0; m < 6; m++) {
          g.beginPath();
          g.moveTo(40 + m * 80, 60);
          g.lineTo(80 + m * 80, 20);
          g.lineTo(120 + m * 80, 60);
          g.stroke();
        }
        g.setLineDash([10, 8]);
        g.strokeStyle = '#8b2b1d';
        g.lineWidth = 5;
        g.beginPath();
        g.moveTo(70, 300);
        g.bezierCurveTo(180, 180, 300, 320, 440, 150);
        g.stroke();
        g.setLineDash([]);
        g.fillStyle = '#fff';
        for (var d = 0; d < 160; d++) {
          g.beginPath();
          g.arc(150 + Math.random() * 200, 200 + Math.random() * 120, 2, 0, 7);
          g.fill();
        }
        g.fillStyle = '#2c2521';
        g.font = '700 30px ' + FONT;
        g.fillText('봉평', 40, 350);
        g.fillText('대화', 410, 120);
        g.font = '700 20px ' + FONT;
        g.fillText('메밀밭', 210, 260);
      }
    });
  }
  function clockTex() {
    return tex(256, 256, function (g, w) {
      g.fillStyle = '#fffbef';
      g.beginPath();
      g.arc(w / 2, w / 2, w / 2 - 4, 0, 7);
      g.fill();
      g.strokeStyle = '#3b2a22';
      g.lineWidth = 6;
      g.stroke();
      g.fillStyle = '#3b2a22';
      g.font = '700 26px ' + FONT;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      for (var i = 1; i <= 12; i++) {
        var a = (i / 12) * Math.PI * 2 - Math.PI / 2;
        g.fillText(String(i), w / 2 + Math.cos(a) * 96, w / 2 + Math.sin(a) * 96);
      }
      g.lineWidth = 7;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(w / 2, w / 2);
      g.lineTo(w / 2 + 40, w / 2 - 30);
      g.moveTo(w / 2, w / 2);
      g.lineTo(w / 2 - 12, w / 2 - 78);
      g.stroke();
    });
  }
  function signTex(text, color) {
    return tex(256, 256, function (g, w) {
      g.fillStyle = color || '#e8604c';
      g.beginPath();
      g.arc(w / 2, w / 2, w / 2 - 10, 0, 7);
      g.fill();
      g.strokeStyle = '#fff';
      g.lineWidth = 12;
      g.stroke();
      g.fillStyle = '#fff';
      g.font = '900 140px sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(text, w / 2, w / 2 + 8);
    });
  }

  /* ───── 물건 만들기 (벽에 등을 댄 채 +z 쪽으로 튀어나오게) ───── */
  var T; // 방마다 색
  var BUILD = {
    desk: function (o) {
      var g = new THREE.Group();
      var wood = mat(shade(T.trim, 1.25), { map: T.woodMap });
      g.add(box(1.5, 0.07, 0.7, wood, 0, 0.74, 0.42));
      [[-0.68, 0.12], [0.68, 0.12], [-0.68, 0.72], [0.68, 0.72]].forEach(function (p) { g.add(box(0.07, 0.74, 0.07, wood, p[0], 0.37, p[1])); });
      g.add(box(1.4, 0.18, 0.06, wood, 0, 0.62, 0.74));
      var paper = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.42), mat(0xffffff, { map: wongojiTex('죽는날까지하늘을\n우러러한점\n\n잎새에이는바람에도\n나는괴로워했다.'), rough: 0.95 }));
      paper.rotation.x = -Math.PI / 2;
      paper.rotation.z = 0.08;
      paper.position.set(-0.15, 0.781, 0.44);
      g.add(paper);
      g.add(box(0.16, 0.03, 0.1, mat(0x222222), 0.45, 0.79, 0.35));
      var brush = cyl(0.008, 0.008, 0.26, mat(0x6b4a2f), 0.32, 0.79, 0.55, 8);
      brush.rotation.z = Math.PI / 2;
      brush.rotation.y = 0.5;
      g.add(brush);
      g.add(box(0.26, 0.06, 0.2, mat(0x2c6bd9), 0.55, 0.8, 0.62));
      g.add(box(0.24, 0.05, 0.19, mat(0xe8604c), 0.55, 0.855, 0.62));
      return g;
    },
    shelf: function () {
      var g = new THREE.Group();
      var wood = mat(shade(T.trim, 1.1), { map: T.woodMap });
      g.add(box(1.2, 2.1, 0.04, wood, 0, 1.05, 0.02));
      g.add(box(0.05, 2.1, 0.36, wood, -0.58, 1.05, 0.18));
      g.add(box(0.05, 2.1, 0.36, wood, 0.58, 1.05, 0.18));
      var colors = [0x2c6bd9, 0xe8604c, 0x2e9e6b, 0x7a5cc9, 0xe9a23b, 0x5b4034, 0x2a9db0, 0xf5eedf];
      for (var s = 0; s < 5; s++) {
        var y = 0.05 + s * 0.5;
        g.add(box(1.16, 0.04, 0.36, wood, 0, y, 0.18));
        if (s === 4) break;
        var x = -0.52;
        while (x < 0.5) {
          var bw = 0.05 + Math.random() * 0.05;
          var bh = 0.3 + Math.random() * 0.12;
          if (x + bw > 0.54) break;
          var b = box(bw, bh, 0.26, mat(colors[Math.floor(Math.random() * colors.length)], { rough: 0.7 }), x + bw / 2, y + 0.02 + bh / 2, 0.2);
          if (Math.random() < 0.12) { b.rotation.z = 0.18; b.position.x += 0.02; }
          g.add(b);
          x += bw + 0.006;
        }
      }
      return g;
    },
    window: function () {
      var g = new THREE.Group();
      var sky = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.05), new THREE.MeshBasicMaterial({ map: artTex(T.night ? 'night' : 'day') }));
      sky.position.set(0, 1.65, 0.01);
      g.add(sky);
      var wood = mat(T.trim);
      g.add(box(1.46, 0.08, 0.1, wood, 0, 2.2, 0.05));
      g.add(box(1.46, 0.08, 0.1, wood, 0, 1.1, 0.05));
      g.add(box(0.08, 1.18, 0.1, wood, -0.69, 1.65, 0.05));
      g.add(box(0.08, 1.18, 0.1, wood, 0.69, 1.65, 0.05));
      for (var i = 1; i < 4; i++) g.add(box(0.025, 1.05, 0.04, wood, -0.65 + (1.3 * i) / 4, 1.65, 0.04));
      for (var k = 1; k < 3; k++) g.add(box(1.3, 0.025, 0.04, wood, 0, 1.12 + (1.05 * k) / 3, 0.04));
      g.add(box(1.6, 0.06, 0.24, wood, 0, 1.07, 0.12));
      if (T.night) {
        var rain = new THREE.Group();
        for (var r = 0; r < 26; r++) rain.add(box(0.005, 0.12, 0.002, new THREE.MeshBasicMaterial({ color: 0xbfd2ff, transparent: true, opacity: 0.6 }), -0.6 + Math.random() * 1.2, 1.2 + Math.random() * 0.9, 0.015));
        rain.userData.rain = true;
        g.add(rain);
      }
      return g;
    },
    frame: function (o) {
      var g = new THREE.Group();
      var pic = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.7), mat(0xffffff, { map: artTex(o.art || 'night'), rough: 0.9 }));
      pic.position.set(0, 1.65, 0.035);
      g.add(pic);
      var fr = mat(0x6e4b37, { rough: 0.5 });
      g.add(box(1.02, 0.07, 0.06, fr, 0, 2.035, 0.03));
      g.add(box(1.02, 0.07, 0.06, fr, 0, 1.265, 0.03));
      g.add(box(0.07, 0.84, 0.06, fr, -0.485, 1.65, 0.03));
      g.add(box(0.07, 0.84, 0.06, fr, 0.485, 1.65, 0.03));
      if (o.art === 'river') {
        g.add(cyl(0.025, 0.025, 1.1, mat(0x3b2a22), 0, 2.08, 0.04, 10).rotateZ(Math.PI / 2));
      }
      return g;
    },
    map: function (o) {
      o.art = 'map';
      return BUILD.frame(o);
    },
    chest: function () {
      var g = new THREE.Group();
      var wood = mat(0x5b3a26, { map: T.woodMap, rough: 0.6 });
      var brass = mat(0xc9a24a, { metal: 0.8, rough: 0.35 });
      g.add(box(1.1, 0.72, 0.5, wood, 0, 0.42, 0.27));
      g.add(box(1.14, 0.05, 0.54, wood, 0, 0.8, 0.27));
      [[-0.5, 0.12], [0.5, 0.12], [-0.5, 0.42], [0.5, 0.42]].forEach(function (p) { g.add(box(0.06, 0.08, 0.04, wood, p[0], 0.04, p[1])); });
      g.add(box(1.0, 0.015, 0.01, mat(0x2f1d12), 0, 0.5, 0.525));
      [[-0.42, 0.7], [0.42, 0.7], [-0.42, 0.2], [0.42, 0.2]].forEach(function (p) { g.add(box(0.14, 0.14, 0.01, brass, p[0], p[1], 0.525)); });
      g.add(box(0.2, 0.22, 0.012, brass, 0, 0.62, 0.527));
      var lock = new THREE.Group();
      lock.add(box(0.09, 0.07, 0.03, brass, 0, 0, 0));
      var shackle = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.007, 8, 16, Math.PI), brass);
      shackle.position.y = 0.035;
      lock.add(shackle);
      lock.position.set(0, 0.56, 0.55);
      g.add(lock);
      return g;
    },
    cage: function () {
      var g = new THREE.Group();
      var wood = mat(T.trim, { map: T.woodMap });
      g.add(cyl(0.3, 0.32, 0.05, wood, 0, 0.9, 0.4));
      g.add(cyl(0.04, 0.06, 0.88, wood, 0, 0.44, 0.4, 12));
      g.add(cyl(0.25, 0.25, 0.04, wood, 0, 0.94, 0.4));
      var wire = mat(0xc9a24a, { metal: 0.6, rough: 0.4, wire: true });
      g.add(cyl(0.24, 0.24, 0.6, wire, 0, 1.25, 0.4, 16));
      var dome = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), wire);
      dome.position.set(0, 1.55, 0.4);
      g.add(dome);
      g.add(cyl(0.006, 0.006, 0.4, mat(0x6b4a2f), 0, 1.15, 0.4, 6).rotateZ(Math.PI / 2));
      [-0.08, 0.08].forEach(function (x, i) {
        var bird = new THREE.Group();
        var yel = mat(0xf2c230, { rough: 0.5 });
        var body = new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 10), yel);
        body.scale.set(1, 0.9, 1.3);
        bird.add(body);
        var head = new THREE.Mesh(new THREE.SphereGeometry(0.032, 12, 8), yel);
        head.position.set(0, 0.05, 0.04);
        bird.add(head);
        var beak = new THREE.Mesh(new THREE.ConeGeometry(0.01, 0.03, 6), mat(0xe8604c));
        beak.rotation.x = Math.PI / 2;
        beak.position.set(0, 0.05, 0.08);
        bird.add(beak);
        var tail = box(0.03, 0.01, 0.06, mat(0x3b2a22), 0, 0.01, -0.07);
        bird.add(tail);
        bird.position.set(x, 1.2, 0.4);
        bird.rotation.y = i ? -0.6 : 0.6;
        bird.userData.bob = i;
        g.add(bird);
      });
      return g;
    },
    screen: function (o) {
      var g = new THREE.Group();
      var t = artTex(o.art || 'songs');
      for (var p = 0; p < 4; p++) {
        var panel = new THREE.Mesh(new THREE.BoxGeometry(0.46, 1.55, 0.025), [mat(T.trim), mat(T.trim), mat(T.trim), mat(T.trim), mat(0xffffff, { map: t, rough: 0.9 }), mat(T.trim)]);
        var tt = t.clone();
        tt.needsUpdate = true;
        tt.repeat.set(0.25, 1);
        tt.offset.set(p * 0.25, 0);
        panel.material[4] = mat(0xffffff, { map: tt, rough: 0.9 });
        var ang = p % 2 ? -0.35 : 0.35;
        panel.position.set(-0.69 + p * 0.46, 0.85, 0.25 + (p % 2 ? 0.07 : 0));
        panel.rotation.y = ang * 0.3;
        g.add(panel);
      }
      return g;
    },
    table: function () {
      var g = new THREE.Group();
      var wood = mat(0x7a4b2a, { map: T.woodMap, rough: 0.5 });
      g.add(cyl(0.55, 0.55, 0.05, wood, 0, 0.72, 0.75, 32));
      g.add(cyl(0.06, 0.1, 0.7, wood, 0, 0.36, 0.75, 12));
      g.add(cyl(0.3, 0.32, 0.03, wood, 0, 0.02, 0.75, 20));
      var bowl = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0, 0), new THREE.Vector2(0.06, 0), new THREE.Vector2(0.12, 0.03), new THREE.Vector2(0.15, 0.1), new THREE.Vector2(0.14, 0.1)], 24), mat(0xf3efe6, { rough: 0.3, side: THREE.DoubleSide }));
      bowl.position.set(0, 0.745, 0.75);
      g.add(bowl);
      g.add(cyl(0.135, 0.135, 0.01, mat(0xf6f1e2, { rough: 0.2 }), 0, 0.83, 0.75, 24));
      var spoon = box(0.02, 0.01, 0.26, mat(0xcfcfcf, { metal: 0.9, rough: 0.2 }), 0.22, 0.755, 0.8);
      spoon.rotation.y = 0.3;
      g.add(spoon);
      var steam = new THREE.Group();
      for (var s = 0; s < 3; s++) {
        var puff = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.2 }));
        puff.position.set(-0.04 + s * 0.04, 0.9 + s * 0.05, 0.75);
        steam.add(puff);
      }
      steam.userData.steam = true;
      g.add(steam);
      return g;
    },
    pot: function () {
      var g = new THREE.Group();
      g.add(cyl(0.2, 0.15, 0.36, mat(0x8a5a3c, { rough: 0.9 }), 0, 0.18, 0.4));
      g.add(cyl(0.02, 0.025, 0.6, mat(0x5b4034), 0, 0.6, 0.4, 8));
      var leaf = mat(0x2f6b3f, { rough: 0.8 });
      var flower = mat(0xf2c230, { emissive: 0x553a00, ei: 0.2 });
      [[0, 1.0, 0.4, 0.28], [0.15, 0.88, 0.45, 0.2], [-0.16, 0.9, 0.36, 0.2]].forEach(function (p) {
        var s = new THREE.Mesh(new THREE.IcosahedronGeometry(p[3], 1), leaf);
        s.position.set(p[0], p[1], p[2]);
        g.add(s);
      });
      for (var i = 0; i < 16; i++) {
        var f = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), flower);
        var a = Math.random() * Math.PI * 2;
        var r = 0.18 + Math.random() * 0.1;
        f.position.set(Math.cos(a) * r, 0.85 + Math.random() * 0.3, 0.4 + Math.sin(a) * r);
        g.add(f);
      }
      return g;
    },
    gramophone: function () {
      var g = new THREE.Group();
      var wood = mat(0x5b3a26, { map: T.woodMap, rough: 0.5 });
      var brass = mat(0xd4a64a, { metal: 0.85, rough: 0.3, side: THREE.DoubleSide });
      g.add(box(0.8, 0.75, 0.5, wood, 0, 0.375, 0.3));
      g.add(box(0.5, 0.18, 0.42, wood, 0, 0.84, 0.3));
      var disc = cyl(0.19, 0.19, 0.012, mat(0x111111, { rough: 0.3 }), 0, 0.94, 0.3, 32);
      disc.userData.spin = true;
      g.add(disc);
      g.add(cyl(0.05, 0.05, 0.014, mat(0xe8604c), 0, 0.948, 0.3, 16));
      var arm = cyl(0.012, 0.012, 0.45, brass, 0.16, 1.1, 0.3, 8);
      arm.rotation.z = 0.7;
      g.add(arm);
      var horn = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.55, 24, 1, true), brass);
      horn.rotation.z = -2.1;
      horn.position.set(0.12, 1.42, 0.3);
      g.add(horn);
      for (var i = 0; i < 4; i++) {
        var rec = cyl(0.17, 0.17, 0.01, mat([0x2c6bd9, 0xe8604c, 0x2e9e6b, 0x7a5cc9][i]), -0.55, 0.06 + i * 0.012, 0.35, 24);
        g.add(rec);
      }
      return g;
    },
    clock: function () {
      var g = new THREE.Group();
      var wood = mat(0x4a2f1f, { map: T.woodMap, rough: 0.5 });
      g.add(box(0.48, 1.0, 0.18, wood, 0, 1.75, 0.09));
      var face = new THREE.Mesh(new THREE.CircleGeometry(0.17, 32), mat(0xffffff, { map: clockTex(), rough: 0.6 }));
      face.position.set(0, 2.03, 0.185);
      g.add(face);
      var glass = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.42), mat(0x223344, { transparent: true, opacity: 0.35, metal: 0.4, rough: 0.1 }));
      glass.position.set(0, 1.55, 0.185);
      g.add(glass);
      var pend = new THREE.Group();
      pend.add(box(0.012, 0.3, 0.01, mat(0xd4a64a, { metal: 0.8, rough: 0.3 }), 0, -0.15, 0));
      pend.add(cyl(0.05, 0.05, 0.012, mat(0xd4a64a, { metal: 0.8, rough: 0.3 }), 0, -0.32, 0, 20).rotateX(Math.PI / 2));
      pend.position.set(0, 1.74, 0.17);
      pend.userData.pendulum = true;
      g.add(pend);
      return g;
    },
    lamp: function () {
      var g = new THREE.Group();
      g.add(cyl(0.16, 0.2, 0.05, mat(0x3b2a22), 0, 0.025, 0.35));
      g.add(cyl(0.02, 0.02, 1.5, mat(0x3b2a22), 0, 0.78, 0.35, 8));
      var red = mat(0xe8604c, { emissive: 0xe8604c, ei: 0.45 });
      var blue = mat(0x2c6bd9, { emissive: 0x2c6bd9, ei: 0.35 });
      g.add(cyl(0.16, 0.16, 0.22, red, 0, 1.62, 0.35, 8));
      g.add(cyl(0.16, 0.12, 0.18, blue, 0, 1.42, 0.35, 8));
      g.add(box(0.36, 0.03, 0.36, mat(0x3b2a22), 0, 1.74, 0.35));
      var light = new THREE.PointLight(0xffc98a, 2.5, 4, 2);
      light.position.set(0, 1.55, 0.6);
      g.add(light);
      return g;
    },
    door: function () {
      var g = new THREE.Group();
      var wood = mat(T.trim, { map: T.woodMap });
      g.add(box(1.34, 0.1, 0.16, wood, 0, 2.25, 0.08));
      g.add(box(0.1, 2.25, 0.16, wood, -0.62, 1.125, 0.08));
      g.add(box(0.1, 2.25, 0.16, wood, 0.62, 1.125, 0.08));
      var beyond = new THREE.Mesh(new THREE.PlaneGeometry(1.14, 2.16), new THREE.MeshBasicMaterial({ color: 0xfff3d1 }));
      beyond.position.set(0, 1.08, 0.004);
      g.add(beyond);
      var leaf = new THREE.Group(); // 경첩이 왼쪽에 있는 문짝
      var paper = mat(0xfff4dc, { emissive: 0xffe2a8, ei: T.night ? 0.25 : 0.05, rough: 0.95 });
      leaf.add(box(1.14, 2.14, 0.03, paper, 0.57, 1.07, 0));
      for (var i = 0; i <= 4; i++) leaf.add(box(0.035, 2.14, 0.05, wood, (1.14 * i) / 4, 1.07, 0.01));
      for (var k = 0; k <= 7; k++) leaf.add(box(1.14, 0.035, 0.05, wood, 0.57, (2.14 * k) / 7, 0.01));
      leaf.add(box(1.14, 0.5, 0.05, wood, 0.57, 0.25, 0.01));
      var brass = mat(0xc9a24a, { metal: 0.8, rough: 0.3 });
      var ring = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.01, 8, 20), brass);
      ring.position.set(1.0, 1.05, 0.05);
      leaf.add(ring);
      var lock = new THREE.Group();
      lock.add(box(0.16, 0.13, 0.05, brass, 0, 0, 0));
      var shackle = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.012, 8, 16, Math.PI), brass);
      shackle.position.y = 0.065;
      lock.add(shackle);
      lock.position.set(0.95, 1.25, 0.07);
      leaf.add(lock);
      leaf.position.set(-0.57, 0, 0.06);
      leaf.userData.doorLeaf = true;
      lock.userData.lock = true;
      g.add(leaf);
      return g;
    },
    rug: function () {
      var g = new THREE.Group();
      var t = tex(256, 256, function (c, w) {
        c.fillStyle = '#8b2b1d';
        c.fillRect(0, 0, w, w);
        c.strokeStyle = '#e9a23b';
        c.lineWidth = 8;
        c.strokeRect(14, 14, w - 28, w - 28);
        c.strokeStyle = '#1e4fa6';
        c.lineWidth = 5;
        c.strokeRect(34, 34, w - 68, w - 68);
        c.fillStyle = '#e9a23b';
        c.beginPath();
        c.arc(w / 2, w / 2, 40, 0, 7);
        c.fill();
      });
      var rug = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.8), mat(0xffffff, { map: t, rough: 1 }));
      rug.rotation.x = -Math.PI / 2;
      rug.position.set(0, 0.006, R);
      g.add(rug);
      return g;
    },
  };

  /* ───── 글자 그림(이름표·느낌표) ───── */
  function textSprite(text, o) {
    o = o || {};
    var fs = o.fs || 56;
    var pad = o.pad || 16;
    var c = document.createElement('canvas');
    var g = c.getContext('2d');
    g.font = fs + "px 'Jua', sans-serif";
    var w = Math.ceil(g.measureText(text).width) + pad * 2;
    var hh = fs + pad * 1.4;
    c.width = w;
    c.height = hh;
    g.font = fs + "px 'Jua', sans-serif";
    g.fillStyle = o.bg || 'rgba(255,255,255,.95)';
    var r = hh / 2;
    g.beginPath();
    g.moveTo(r, 0);
    g.arcTo(w, 0, w, hh, r);
    g.arcTo(w, hh, 0, hh, r);
    g.arcTo(0, hh, 0, 0, r);
    g.arcTo(0, 0, w, 0, r);
    g.fill();
    if (o.border) {
      g.strokeStyle = o.border;
      g.lineWidth = 6;
      g.stroke();
    }
    g.fillStyle = o.fg || '#1d3557';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, w / 2, hh / 2 + 3);
    var t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
    var height = o.h || 0.3;
    s.scale.set((height * w) / hh, height, 1);
    s.renderOrder = 12;
    return s;
  }

  /* ───── 인물 (English_3D 의 캡슐 인물을 본뜸) ───── */
  function makePerson(npc) {
    var o = npc.look || {};
    var g = new THREE.Group();
    var skin = o.skin != null ? o.skin : 0xf5cfa8;
    var hairC = o.hair != null ? o.hair : 0x2b2118;
    var shirt = o.shirt != null ? o.shirt : 0x4a6fa5;
    var pants = o.pants != null ? o.pants : 0x3b3b4f;
    var adult = o.adult !== false;
    function cap(r, l, c) {
      return new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 4, 10), typeof c === 'number' ? mat(c, { rough: 0.85 }) : c);
    }
    function sph(r, c, x, y, z, p, sx, sy, sz) {
      var m = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), mat(c, { rough: 0.7 }));
      m.position.set(x, y, z);
      m.scale.set(sx || 1, sy || 1, sz || 1);
      p.add(m);
      return m;
    }
    var legs = [-0.11, 0.11].map(function (x) {
      var piv = new THREE.Group();
      piv.position.set(x, 0.74, 0);
      g.add(piv);
      var leg = cap(0.085, 0.5, o.girl ? skin : pants);
      leg.position.y = -0.36;
      piv.add(leg);
      var shoe = cap(0.085, 0.14, o.shoe || 0x3a3a3a);
      shoe.rotation.x = Math.PI / 2;
      shoe.position.set(0, -0.655, 0.05);
      piv.add(shoe);
      return piv;
    });
    if (o.girl) {
      var skirt = new THREE.Mesh(new THREE.ConeGeometry(0.46, 1.0, 18, 1, true), mat(o.skirt != null ? o.skirt : 0xc94f6d, { side: THREE.DoubleSide }));
      skirt.position.y = 0.52;
      g.add(skirt);
    } else if (o.hat === 'gat' || o.robe) {
      var robe = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.95, 16, 1, true), mat(o.robe || shirt, { side: THREE.DoubleSide }));
      robe.position.y = 0.66;
      g.add(robe);
    }
    var body = cap(0.27, 0.4, shirt);
    body.position.y = 1.08;
    body.scale.z = 0.85;
    g.add(body);
    if (o.collar) {
      var col = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.035, 6, 16), mat(o.collar));
      col.rotation.x = Math.PI / 2;
      col.position.y = 1.42;
      g.add(col);
    }
    var arms = [-1, 1].map(function (sd) {
      var piv = new THREE.Group();
      piv.position.set(sd * 0.34, 1.36, 0);
      piv.rotation.z = sd * 0.12;
      g.add(piv);
      var arm = cap(0.065, 0.44, shirt);
      arm.position.y = -0.28;
      piv.add(arm);
      sph(0.075, skin, 0, -0.6, 0, piv);
      return piv;
    });
    var headG = new THREE.Group();
    headG.position.y = 1.72;
    g.add(headG);
    var Rr = adult ? 0.265 : 0.3;
    sph(Rr, skin, 0, 0, 0, headG);
    sph(0.07, skin, -Rr, 0, 0, headG);
    sph(0.07, skin, Rr, 0, 0, headG);
    var hcap = new THREE.Mesh(new THREE.SphereGeometry(Rr * 1.07, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.52), mat(hairC));
    hcap.position.set(0, 0.02, -0.03);
    hcap.rotation.x = -0.35;
    headG.add(hcap);
    var st = o.hairStyle || 'short';
    if (st === 'short') {
      sph(0.12, hairC, -0.08, Rr * 0.8, Rr * 0.62, headG, 1.5, 0.6, 0.8);
      sph(0.1, hairC, 0.1, Rr * 0.85, Rr * 0.55, headG, 1.2, 0.6, 0.8);
    }
    if (st === 'long' || st === 'braid') {
      var lh = cap(Rr * 0.78, st === 'braid' ? 0.2 : 0.42, hairC);
      lh.position.set(0, -0.2, -0.16);
      lh.scale.z = 0.5;
      headG.add(lh);
      if (st === 'braid') {
        var br = cap(0.06, 0.6, hairC);
        br.position.set(0, -0.55, -0.22);
        headG.add(br);
        sph(0.05, 0xc92a2a, 0, -0.9, -0.22, headG);
      }
    }
    if (st === 'bun') sph(0.13, hairC, 0, Rr * 0.75, -Rr * 0.7, headG);
    if (st === 'topknot') sph(0.09, hairC, 0, Rr * 1.05, -0.02, headG);
    if (st === 'bob') {
      var bb = cap(Rr * 0.86, 0.14, hairC);
      bb.position.set(0, -0.08, -0.12);
      bb.scale.z = 0.6;
      headG.add(bb);
    }
    if (st === 'pony') {
      sph(0.13, hairC, 0, Rr + 0.02, -Rr * 1.0, headG);
      sph(0.1, hairC, 0, Rr - 0.2, -Rr * 1.2, headG);
    }
    [-1, 1].forEach(function (sd) {
      sph(0.055, 0xffffff, sd * 0.1, 0.035, Rr * 0.86, headG, 1, 1.15, 0.6);
      sph(0.038, 0x2b1d14, sd * 0.1, 0.035, Rr * 0.86 + 0.022, headG, 1, 1.12, 0.6);
      sph(0.045, 0xff9e8f, sd * 0.17, -0.07, Rr * 0.78, headG, 1, 0.7, 0.5);
    });
    var smile = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.012, 6, 14, Math.PI), mat(0xb5443f));
    smile.position.set(0, -0.085, Rr * 0.93);
    smile.rotation.z = Math.PI;
    headG.add(smile);
    if (o.glasses) {
      [-1, 1].forEach(function (sd) {
        var r = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.01, 6, 18), mat(0x3b2a22));
        r.position.set(sd * 0.1, 0.035, Rr * 0.96);
        headG.add(r);
      });
    }
    if (o.hat === 'gat') {
      var black = mat(0x15151a, { transparent: true, opacity: 0.88, rough: 0.5 });
      headG.add(cyl(0.46, 0.46, 0.02, black, 0, Rr * 0.72, 0, 28));
      headG.add(cyl(0.15, 0.17, 0.28, black, 0, Rr * 0.72 + 0.15, 0, 20));
    } else if (o.hat === 'cap') {
      headG.add(cyl(0.29, 0.29, 0.12, mat(0x1d2330), 0, Rr * 0.75, 0, 20));
      var visor = box(0.3, 0.02, 0.16, mat(0x1d2330), 0, Rr * 0.68, Rr * 0.85);
      headG.add(visor);
    } else if (o.hat === 'band') {
      var band = new THREE.Mesh(new THREE.TorusGeometry(Rr * 1.04, 0.03, 6, 20), mat(0xc92a2a));
      band.rotation.x = Math.PI / 2 - 0.2;
      band.position.y = 0.1;
      headG.add(band);
    }
    var tag = textSprite(npc.name, { h: 0.26, fg: '#1d3557' });
    tag.position.y = 2.32;
    g.add(tag);
    var mark = textSprite('!', { h: 0.42, bg: '#ffd43b', fg: '#c92a2a', border: '#c92a2a', fs: 70, pad: 22 });
    mark.position.y = 2.75;
    g.add(mark);
    var sc = adult ? 1.05 : 0.95;
    g.scale.setScalar(sc);
    g.userData.person = { head: headG, arms: arms, legs: legs, mark: mark, tag: tag, wave: 0, ph: Math.random() * 6 };
    return g;
  }

  /* ───── 바닥 ───── */
  function stoneTex() {
    return tex(512, 512, function (g, w) {
      g.fillStyle = '#8d8f93';
      g.fillRect(0, 0, w, w);
      var n = 4;
      for (var y = 0; y < n; y++) {
        for (var x = 0; x < n; x++) {
          var v = 128 + Math.floor(Math.random() * 30);
          g.fillStyle = 'rgb(' + v + ',' + (v + 2) + ',' + (v + 6) + ')';
          g.fillRect(x * (w / n) + 3, y * (w / n) + 3, w / n - 6, w / n - 6);
        }
      }
      for (var i = 0; i < 1500; i++) {
        g.fillStyle = 'rgba(0,0,0,' + Math.random() * 0.08 + ')';
        g.fillRect(Math.random() * w, Math.random() * w, 2, 2);
      }
    });
  }

  /* ───── 방 짓기 ───── */
  function buildRoom(room) {
    scene = new THREE.Scene();
    T = Object.assign({}, room.theme);
    T.woodMap = woodTex('#8a6244');
    scene.background = new THREE.Color(T.night ? 0x10142a : 0xcfd9e6);

    var fk = room.theme.floorKind || 'wood';
    var ft = fk === 'stone' ? stoneTex() : woodTex(fk === 'maru' ? '#c39366' : room.theme.floor);
    ft.wrapS = ft.wrapT = THREE.RepeatWrapping;
    ft.repeat.set(fk === 'stone' ? 3 : 4, fk === 'stone' ? 3 : 4);
    var floor = new THREE.Mesh(new THREE.PlaneGeometry(R * 2, R * 2), mat(0xffffff, { map: ft, rough: 0.65 }));
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    var ceil = new THREE.Mesh(new THREE.PlaneGeometry(R * 2, R * 2), mat(shade(room.theme.wall, 0.7)));
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = H;
    scene.add(ceil);
    var beam = mat(room.theme.trim, { map: T.woodMap });
    for (var b = -2; b <= 2; b++) scene.add(box(R * 2, 0.16, 0.2, beam, 0, H - 0.08, b * 2.2));

    var wallTex = hanjiTex(room.theme.wall);
    for (var k = 0; k < 4; k++) {
      var pivot = new THREE.Group();
      pivot.rotation.y = k * QUARTER;
      var wall = new THREE.Mesh(new THREE.PlaneGeometry(R * 2, H), mat(0xffffff, { map: wallTex, rough: 0.95 }));
      wall.position.set(0, H / 2, -R);
      pivot.add(wall);
      pivot.add(box(R * 2, 0.14, 0.04, beam, 0, 0.07, -R + 0.02));
      pivot.add(box(R * 2, 0.1, 0.06, beam, 0, H - 0.3, -R + 0.03));
      pivot.add(box(0.18, H, 0.18, beam, -R + 0.09, H / 2, -R + 0.09));
      pivot.add(box(0.14, H, 0.12, beam, -R / 2, H / 2, -R + 0.06));
      pivot.add(box(0.14, H, 0.12, beam, R / 2, H / 2, -R + 0.06));
      scene.add(pivot);
    }

    scene.add(new THREE.HemisphereLight(T.night ? 0x8899cc : 0xffffff, 0x6b4a2f, T.night ? 1.1 : 1.6));
    scene.add(new THREE.AmbientLight(0xffffff, T.night ? 0.4 : 0.65));
    [[-2.2, -2.2], [2.2, 2.2], [-2.2, 2.2], [2.2, -2.2]].forEach(function (p) {
      var L = new THREE.PointLight(room.theme.light, T.night ? 7 : 5, 8, 1.6);
      L.position.set(p[0], H - 0.45, p[1]);
      scene.add(L);
      var bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), new THREE.MeshBasicMaterial({ color: room.theme.light }));
      bulb.position.copy(L.position);
      scene.add(bulb);
      scene.add(cyl(0.005, 0.005, 0.3, mat(0x222222), p[0], H - 0.2, p[1], 6));
    });

    G.anim = [];
    G.people = [];
    G.targets = [];
    G.colliders = [];
    G.markers = {};

    function place(def, id) {
      var isNpc = !!(def.npc && id);
      var obj = isNpc ? makePerson(def.npc) : (BUILD[def.type] || BUILD.chest)(def);
      var pv = new THREE.Group();
      pv.rotation.y = def.wall * QUARTER;
      scene.add(pv);
      if (def.type === 'rug') obj.position.set(0, 0, -R);
      else if (isNpc) obj.position.set(def.x || 0, 0, -R + 1.5);
      else obj.position.set(def.x || 0, 0, -R + 0.005);
      pv.add(obj);
      pv.updateMatrixWorld(true);
      if (isNpc) {
        scene.attach(obj);
        G.people.push({ obj: obj, id: id });
      }
      obj.traverse(function (m) {
        if (m.userData.doorLeaf) G.doorLeaf = m;
        if (m.userData.lock) G.doorLock = m;
        if (m.userData.rain || m.userData.steam || m.userData.spin || m.userData.pendulum || m.userData.bob != null) G.anim.push(m);
      });
      var center = new THREE.Vector3();
      if (isNpc) {
        center.set(obj.position.x, 1.3, obj.position.z);
        G.colliders.push({ x0: obj.position.x - 0.35, x1: obj.position.x + 0.35, z0: obj.position.z - 0.35, z1: obj.position.z + 0.35 });
      } else {
        var bb = new THREE.Box3().setFromObject(obj);
        bb.getCenter(center);
        if (def.type !== 'rug' && bb.min.y < 1.2) G.colliders.push({ x0: bb.min.x, x1: bb.max.x, z0: bb.min.z, z1: bb.max.z });
        if (id) {
          var marker = new THREE.Sprite(new THREE.SpriteMaterial({ map: id === '__door' ? signTex('문', '#2c6bd9') : signTex('?', '#e76f51'), depthTest: false, transparent: true }));
          marker.scale.set(0.24, 0.24, 1);
          marker.position.set(center.x, bb.max.y + 0.22, center.z);
          marker.renderOrder = 10;
          marker.userData.baseY = marker.position.y;
          scene.add(marker);
          G.markers[id] = marker;
        }
      }
      if (id) G.targets.push({ id: id, obj: obj, center: center, npc: isNpc ? def.npc : null });
      return obj;
    }
    room.decor.forEach(function (d) { place(d, d.type === 'door' ? '__door' : null); });
    room.items.forEach(function (it) { place(it, it.id); });
    G.solved.forEach(function (id) { markSolved(id, true); });
  }

  function markSolved(id, quiet) {
    var m = G.markers[id];
    if (m) {
      m.material.map = signTex('✓', '#2a9d8f');
      m.material.needsUpdate = true;
    }
    G.people.forEach(function (p) { if (p.id === id) p.obj.userData.person.mark.visible = false; });
    if (!quiet) beep('tile');
  }

  /* ═════════════ 움직이기 ═════════════ */
  var P = { x: 0, z: 1.6, yaw: 0, pitch: -0.05, bob: 0 };
  var keys = {};
  var joy = { id: null, x: 0, y: 0, cx: 0, cy: 0 };
  var look = null;

  function blocked(x, z) {
    var lim = R - 0.35;
    if (x < -lim || x > lim || z < -lim || z > lim) return true;
    for (var i = 0; i < G.colliders.length; i++) {
      var c = G.colliders[i];
      if (x > c.x0 - 0.28 && x < c.x1 + 0.28 && z > c.z0 - 0.28 && z < c.z1 + 0.28) return true;
    }
    return false;
  }
  function step(dt) {
    if (G.modal || G.overlay) return;
    var f = 0;
    var s = 0;
    if (keys.w || keys.arrowup) f += 1;
    if (keys.s || keys.arrowdown) f -= 1;
    if (keys.a) s -= 1;
    if (keys.d) s += 1;
    if (keys.arrowleft || keys.q) P.yaw += dt * 1.9;
    if (keys.arrowright || keys.e2) P.yaw -= dt * 1.9;
    f += joy.y;
    s += joy.x;
    var len = Math.sqrt(f * f + s * s);
    if (len > 1) { f /= len; s /= len; }
    if (!len) return;
    var sp = keys.shift ? 4 : 2.5;
    var dx = (-Math.sin(P.yaw) * f + Math.cos(P.yaw) * s) * sp * dt;
    var dz = (-Math.cos(P.yaw) * f - Math.sin(P.yaw) * s) * sp * dt;
    if (!blocked(P.x + dx, P.z)) P.x += dx;
    if (!blocked(P.x, P.z + dz)) P.z += dz;
    P.bob += dt * sp * 3;
  }

  function angleTo(t) {
    return Math.atan2(-(t.center.x - P.x), -(t.center.z - P.z));
  }
  function wrapA(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }
  function distTo(t) {
    var dx = t.center.x - P.x;
    var dz = t.center.z - P.z;
    return Math.sqrt(dx * dx + dz * dz);
  }
  function nearTarget() {
    var best = null;
    var bd = 1e9;
    G.targets.forEach(function (t) {
      var d = distTo(t);
      if (d > 2.4) return;
      var a = Math.abs(wrapA(angleTo(t) - P.yaw));
      if (a > 1.05) return;
      var score = d + a;
      if (score < bd) { bd = score; best = t; }
    });
    return best;
  }
  function nextGoal() {
    for (var i = 0; i < G.room.items.length; i++) {
      var it = G.room.items[i];
      if (G.solved.indexOf(it.id) < 0) return targetOf(it.id);
    }
    return targetOf('__door');
  }
  function targetOf(id) {
    for (var i = 0; i < G.targets.length; i++) if (G.targets[i].id === id) return G.targets[i];
    return null;
  }

  /* ═════════════ 그리기 ═════════════ */
  function baseFov() {
    var minV = (2 * Math.atan(Math.tan((64 * Math.PI) / 360) / Math.max(0.3, camera.aspect)) * 180) / Math.PI;
    return Math.min(100, Math.max(66, minV));
  }
  var near = null;
  function frame() {
    if (!running) return;
    requestAnimationFrame(frame);
    var dt = Math.min(0.05, clock3.getDelta());
    var tt = clock3.elapsedTime;
    step(dt);

    if (G.focus) {
      var a = Math.atan2(-(G.focus.x - P.x), -(G.focus.z - P.z));
      var dy = G.focus.y - EYE;
      var dd = Math.sqrt(Math.pow(G.focus.x - P.x, 2) + Math.pow(G.focus.z - P.z, 2));
      var k = 1 - Math.pow(0.004, dt);
      P.yaw += wrapA(a - P.yaw) * k;
      P.pitch += (Math.atan2(dy, dd) - 0.12 - P.pitch) * k;
    }
    camera.position.set(P.x, EYE + Math.sin(P.bob) * 0.025, P.z);
    camera.rotation.set(P.pitch, P.yaw, 0, 'YXZ');
    var fv = baseFov();
    if (Math.abs(camera.fov - fv) > 0.05) {
      camera.fov += (fv - camera.fov) * 0.2;
      camera.updateProjectionMatrix();
    }

    G.anim.forEach(function (m) {
      if (m.userData.rain) m.children.forEach(function (d) { d.position.y -= dt * 1.4; if (d.position.y < 1.15) d.position.y = 2.15; });
      if (m.userData.steam) m.children.forEach(function (p, i) { p.position.y = 0.88 + ((tt * 0.15 + i * 0.07) % 0.25); p.material.opacity = 0.25 - ((tt * 0.15 + i * 0.07) % 0.25); });
      if (m.userData.spin) m.rotation.y += dt * 2;
      if (m.userData.pendulum) m.rotation.z = Math.sin(tt * 2.2) * 0.22;
      if (m.userData.bob != null) m.position.y = 1.2 + Math.abs(Math.sin(tt * 3 + m.userData.bob * 1.7)) * 0.03;
    });
    G.people.forEach(function (p) {
      var u = p.obj.userData.person;
      var dx = P.x - p.obj.position.x;
      var dz = P.z - p.obj.position.z;
      var want = Math.atan2(dx, dz);
      if (dx * dx + dz * dz < 30) p.obj.rotation.y += wrapA(want - p.obj.rotation.y) * Math.min(1, dt * 3);
      u.head.rotation.x = Math.sin(tt * 1.3 + u.ph) * 0.04;
      u.arms[0].rotation.x = Math.sin(tt * 1.6 + u.ph) * 0.06;
      if (u.wave > 0) {
        u.wave -= dt;
        u.arms[1].rotation.x = -2.4 + Math.sin(tt * 12) * 0.3;
      } else u.arms[1].rotation.x = Math.sin(tt * 1.6 + u.ph + 1) * 0.06;
      u.mark.position.y = 2.75 + Math.sin(tt * 3) * 0.05;
    });
    Object.keys(G.markers).forEach(function (id, i) {
      var m = G.markers[id];
      m.position.y = m.userData.baseY + Math.sin(tt * 2 + i) * 0.04;
    });
    if (G.doorLeaf && G.done) {
      G.doorLeaf.rotation.y += (-1.4 - G.doorLeaf.rotation.y) * Math.min(1, dt * 2);
      if (G.doorLock) G.doorLock.visible = false;
    }

    /* 가까운 단서 알림 · 길 안내 화살표 */
    near = G.modal || G.overlay ? null : nearTarget();
    var pr = $('#g-prompt');
    var act = $('#g-act');
    if (near) {
      var lbl = near.id === '__door' ? '잠긴 문' : near.npc ? near.npc.name + '에게 말 걸기' : labelOf(near.id);
      pr.innerHTML = '<b>E</b> ' + App.esc(lbl);
      pr.style.display = 'block';
      act.classList.add('ready');
    } else {
      pr.style.display = 'none';
      act.classList.remove('ready');
    }
    var goal = G.done ? null : nextGoal();
    var arrow = $('#g-arrow');
    var dist = $('#g-dist');
    if (goal && !G.modal && !G.overlay && distTo(goal) > 1.6) {
      var rel = wrapA(angleTo(goal) - P.yaw);
      arrow.style.display = 'block';
      arrow.style.transform = 'rotate(' + (-rel * 180) / Math.PI + 'deg)';
      dist.textContent = distTo(goal).toFixed(1) + 'm';
    } else {
      arrow.style.display = 'none';
      dist.textContent = '';
    }
    if (tt - (G.lastHud || 0) > 0.25) {
      G.lastHud = tt;
      $('#g-time').textContent = '⏱ ' + fmtTime(elapsed());
      if (G.mapOn) drawMap();
    }
    renderer.render(scene, camera);
  }

  function resize() {
    if (!renderer) return;
    var c = renderer.domElement;
    var w = c.clientWidth;
    var hh = c.clientHeight;
    if (!w || !hh) return;
    renderer.setSize(w, hh, false);
    camera.aspect = w / hh;
    camera.updateProjectionMatrix();
  }

  function elapsed() {
    if (!G) return 0;
    return G.base + (G.done || G.overlay ? 0 : Date.now() - G.start);
  }

  /* ───── 지도 ───── */
  function drawMap() {
    var c = $('#g-mapc');
    var g = c.getContext('2d');
    var W = c.width;
    var s = (W - 40) / (R * 2);
    var tx = function (x) { return 20 + (x + R) * s; };
    var tz = function (z) { return 20 + (z + R) * s; };
    g.clearRect(0, 0, W, W);
    g.fillStyle = '#f7f3ea';
    g.fillRect(0, 0, W, W);
    g.strokeStyle = '#1d3557';
    g.lineWidth = 4;
    g.strokeRect(20, 20, W - 40, W - 40);
    g.fillStyle = 'rgba(29,53,87,.15)';
    G.colliders.forEach(function (cc) { g.fillRect(tx(cc.x0), tz(cc.z0), (cc.x1 - cc.x0) * s, (cc.z1 - cc.z0) * s); });
    G.targets.forEach(function (t) {
      var done = G.solved.indexOf(t.id) >= 0;
      g.fillStyle = t.id === '__door' ? '#2c6bd9' : done ? '#2a9d8f' : '#e76f51';
      g.beginPath();
      g.arc(tx(t.center.x), tz(t.center.z), 9, 0, 7);
      g.fill();
      g.fillStyle = '#fff';
      g.font = "bold 12px 'Jua', sans-serif";
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(t.id === '__door' ? '문' : done ? '✓' : '?', tx(t.center.x), tz(t.center.z) + 1);
    });
    var px = tx(P.x);
    var pz = tz(P.z);
    g.save();
    g.translate(px, pz);
    g.rotate(-P.yaw);
    g.fillStyle = '#ff3b6b';
    g.beginPath();
    g.moveTo(0, -12);
    g.lineTo(8, 8);
    g.lineTo(-8, 8);
    g.closePath();
    g.fill();
    g.restore();
  }

  /* ───── 알림 ───── */
  var toastT = 0;
  function toast(msg) {
    var t = $('#g-toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(function () { t.classList.remove('show'); }, 2200);
  }
  function banner(big, small) {
    var b = $('#g-banner');
    b.innerHTML = '<b>' + App.esc(big) + '</b><span>' + App.esc(small || '') + '</span>';
    b.classList.add('show');
    setTimeout(function () { b.classList.remove('show'); }, 1900);
  }

  /* ───── 위쪽 칸 ───── */
  function labelOf(id) {
    if (id === '__door') return '잠긴 문';
    var it = itemById(id);
    return it ? it.label : '';
  }
  function itemById(id) {
    return G.room.items.filter(function (x) { return x.id === id; })[0];
  }
  function renderHud(flashId) {
    if (!G) return;
    $('#g-stars span').textContent = String(G.stars);
    if (flashId) {
      var sp = $('#g-stars');
      sp.classList.remove('pop');
      void sp.offsetWidth;
      sp.classList.add('pop');
    }
    $('#g-stage').textContent = G.room.title + ' · 단서 ' + G.solved.length + '/' + G.room.items.length;
    var obj;
    if (G.done) obj = '탈출 성공! 방을 자유롭게 둘러보세요.';
    else if (G.solved.length === G.room.items.length) obj = '조각을 모두 모았어요! 빨간 화살표를 따라 문으로 가서 글자 자물쇠를 풀어요.';
    else {
      var g = nextGoal();
      var it = g && itemById(g.id);
      obj = '다음 단서: ' + (it ? (it.npc ? it.npc.name + '에게 말 걸기' : it.label) : '') + ' — 화살표를 따라가요';
    }
    $('#g-obj').textContent = obj;
    var bar = $('#g-tilebar');
    bar.innerHTML = '';
    G.room.items.forEach(function (it) {
      var got = G.solved.indexOf(it.id) >= 0;
      bar.appendChild(h('span', { class: 'g-slot' + (got ? ' fill' : '') + (flashId === it.id ? ' pop' : ''), title: it.label }, got ? it.tile : '?'));
    });
    $('#g-hintn').textContent = String(G.hintsLeft());
  }

  /* ═════════════ 대화창 ═════════════ */
  function openDlg(who, nodes, buttons, color) {
    G.modal = true;
    var d = $('#g-dlg');
    $('#g-who').textContent = who;
    $('#g-who').style.background = color || '';
    var body = $('#g-dbody');
    body.innerHTML = '';
    (Array.isArray(nodes) ? nodes : [nodes]).forEach(function (n) { if (n) body.appendChild(n); });
    var row = $('#g-drow');
    row.innerHTML = '';
    (buttons || []).forEach(function (b) { if (b) row.appendChild(b); });
    d.classList.add('show');
    body.scrollTop = 0;
    var f = body.querySelector('input, .g-choice, select') || row.querySelector('.g-next');
    if (f) setTimeout(function () { f.focus({ preventScroll: true }); }, 80);
  }
  function closeDlg() {
    if (!G) return;
    G.modal = false;
    G.focus = null;
    $('#g-dlg').classList.remove('show');
    if (App.tts) App.tts.stop();
    renderHud();
  }
  function btn(label, cls, fn) {
    return h('button', { type: 'button', class: cls || '', onclick: fn }, label);
  }
  function somiTip(text, mood) {
    return h('div', { class: 'g-somi' }, h('div', { class: 'g-somi-cat', html: App.cat.head({ mood: mood || 'wink' }) }), h('p', null, text));
  }

  function interact(t) {
    if (!t || G.modal || G.overlay) return;
    beep('click');
    G.focus = t.center.clone();
    if (t.id === '__door') return openDoor();
    var it = itemById(t.id);
    if (!it) return;
    if (it.npc && G.solved.indexOf(it.id) < 0) {
      var p = G.people.filter(function (x) { return x.id === it.id; })[0];
      if (p) p.obj.userData.person.wave = 1.2;
      talk(it, 0);
    } else showPuzzle(it);
  }
  function talk(it, i) {
    var lines = it.npc.say || [];
    if (i >= lines.length) return showPuzzle(it);
    openDlg(it.npc.name, h('p', { class: 'g-line' }, lines[i]), [
      App.sayButton ? (function () { var b = App.sayButton(lines[i], '듣기'); b.classList.add('g-ghost'); return b; })() : null,
      btn(i < lines.length - 1 ? '다음 ▶' : '문제 듣기 ▶', 'g-next', function () { talk(it, i + 1); }),
    ], '#2a9d8f');
  }

  function showPuzzle(it) {
    var p = it.puzzle;
    var solved = G.solved.indexOf(it.id) >= 0;
    var nodes = [];
    var who = (it.npc ? it.npc.name + ' · ' : '') + it.label;
    nodes.push(h('p', { class: 'g-q' }, p.q));
    if (p.text && p.kind !== 'fill') nodes.push(h('blockquote', { class: 'g-text' }, p.text.split('\n').map(function (l) { return h('span', null, l); })));
    var fb = h('p', { class: 'g-fb', role: 'status' });
    var hintBox = h('div');
    var why = h('div', { class: 'g-why', hidden: true });
    var area = h('div', { class: 'g-area' });
    nodes.push(area, fb, hintBox, why);
    var check = null;
    var miss = 0;

    function showWhy() {
      why.hidden = false;
      why.innerHTML = '';
      why.appendChild(h('b', null, '풀이 '));
      why.appendChild(document.createTextNode(p.why));
      var links = h('div', { class: 'g-why-links' });
      (p.works || []).forEach(function (wid) {
        var w = App.lit && App.lit.work(wid);
        if (w) links.appendChild(h('a', { class: 'g-tag', href: 'archive.html#w=' + wid, target: '_blank', rel: 'noopener' }, '📚 「' + w.t + '」'));
      });
      why.appendChild(links);
    }
    function doneButtons() {
      return [btn('계속 탐험 ▶', 'g-next', closeDlg)];
    }
    function success() {
      if (G.solved.indexOf(it.id) < 0) {
        G.solved.push(it.id);
        var gain = !G.hintUsed[it.id] && miss === 0 ? 2 : 1;
        G.stars += gain;
        markSolved(it.id);
        saveProg();
        banner('글자 조각 「' + it.tile + '」', '⭐ +' + gain + (gain === 2 ? ' 한 번에 맞혔어요!' : ''));
        renderHud(it.id);
      }
      fb.textContent = '정답이에요!';
      fb.className = 'g-fb is-ok';
      showWhy();
      area.querySelectorAll('input, select, button').forEach(function (x) { x.disabled = true; });
      var row = $('#g-drow');
      row.innerHTML = '';
      doneButtons().forEach(function (b) { row.appendChild(b); });
      setTimeout(function () { why.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, 50);
    }
    function fail(msg) {
      miss++;
      G.mistakes++;
      saveProg();
      beep('bad');
      fb.textContent = msg || '다시 생각해 봐요.';
      fb.className = 'g-fb is-no';
      var d = $('#g-dlg');
      d.classList.remove('shake');
      void d.offsetWidth;
      d.classList.add('shake');
    }

    if (p.kind === 'choice') {
      var list = h('div', { class: 'g-choices' });
      p.choices.forEach(function (c, i) {
        list.appendChild(h('button', { type: 'button', class: 'g-choice', onclick: function (e) {
          if (i === p.answer) { e.currentTarget.classList.add('right'); beep('ok'); success(); }
          else { e.currentTarget.classList.add('wrong'); e.currentTarget.disabled = true; fail('그건 아니에요. 다른 답을 골라 보세요.'); }
        } }, h('span', { class: 'num' }, String(i + 1)), h('span', null, c)));
      });
      area.appendChild(list);
    } else if (p.kind === 'fill') {
      var parts = p.text.split('( ? )');
      var input = h('input', { class: 'g-input', type: 'text', maxlength: '12', autocomplete: 'off', lang: 'ko', 'aria-label': '빈칸에 들어갈 말' });
      var bq = h('blockquote', { class: 'g-text' });
      var lines = parts[0].split('\n');
      lines.slice(0, -1).forEach(function (l) { bq.appendChild(h('span', null, l)); });
      var rest = (parts[1] || '').split('\n');
      bq.appendChild(h('span', null, lines[lines.length - 1], input, rest[0]));
      rest.slice(1).forEach(function (l) { bq.appendChild(h('span', null, l)); });
      area.appendChild(bq);
      check = function () {
        var v = input.value.replace(/\s+/g, '');
        if (!v) { input.focus(); return; }
        if (p.answer.some(function (a) { return a.replace(/\s+/g, '') === v; })) { beep('ok'); input.classList.add('right'); success(); }
        else fail('‘' + v + '’은(는) 아니에요. 힌트를 써 봐도 좋아요.');
      };
      input.addEventListener('keydown', function (e) { e.stopPropagation(); if (e.key === 'Enter') check(); });
    } else if (p.kind === 'order') {
      var picked = [];
      var order = App.shuffleDifferent(p.items);
      var ans = h('div', { class: 'g-orderAns' });
      var pool = h('div', { class: 'g-orderPool' });
      var draw = function () {
        ans.innerHTML = '';
        picked.forEach(function (x, i) { ans.appendChild(h('span', { class: 'g-chip on' }, (i + 1) + '. ' + x)); });
        if (!picked.length) ans.appendChild(h('span', { class: 'g-ph' }, '아래 카드를 차례대로 누르세요'));
        pool.innerHTML = '';
        order.forEach(function (x) {
          if (picked.indexOf(x) >= 0) return;
          pool.appendChild(h('button', { type: 'button', class: 'g-chip', onclick: function () {
            picked.push(x);
            beep('click');
            draw();
            if (picked.length === p.items.length) {
              if (picked.every(function (y, i) { return y === p.items[i]; })) { beep('ok'); success(); }
              else { fail('순서가 맞지 않아요. 처음부터 다시 놓아 볼까요?'); setTimeout(function () { picked = []; draw(); }, 800); }
            }
          } }, x));
        });
      };
      draw();
      area.appendChild(ans);
      area.appendChild(pool);
    } else if (p.kind === 'match') {
      var rights = App.shuffle(p.pairs.map(function (x) { return x[1]; }));
      var sels = [];
      var tbl = h('div', { class: 'g-match' });
      p.pairs.forEach(function (pair) {
        var sel = h('select', { class: 'g-sel', 'aria-label': pair[0] + '의 짝' }, h('option', { value: '' }, '고르세요'), rights.map(function (r) { return h('option', { value: r }, r); }));
        sel.addEventListener('keydown', function (e) { e.stopPropagation(); });
        sels.push(sel);
        tbl.appendChild(h('label', { class: 'g-match-row' }, h('span', null, '「' + pair[0] + '」'), h('span', { class: 'g-arr', 'aria-hidden': 'true' }, '→'), sel));
      });
      area.appendChild(tbl);
      check = function () {
        var wrong = 0;
        var empty = 0;
        sels.forEach(function (s, i) {
          s.classList.remove('right', 'wrong');
          if (!s.value) empty++;
          else if (s.value !== p.pairs[i][1]) { wrong++; s.classList.add('wrong'); }
          else s.classList.add('right');
        });
        if (empty) { fb.textContent = '아직 고르지 않은 칸이 ' + empty + '개 있어요.'; fb.className = 'g-fb'; return; }
        if (!wrong) { beep('ok'); success(); }
        else fail(wrong + '개가 짝이 맞지 않아요. 빨간 칸을 다시 골라 보세요.');
      };
    }

    var hintBtn = btn('💡 힌트 (' + G.hintsLeft() + ')', 'g-ghost', function () {
      if (G.hintsLeft() <= 0 && !G.hintUsed[it.id]) { hintBox.innerHTML = ''; hintBox.appendChild(somiTip('힌트를 다 썼어요. 문학 서고에서 작품 카드를 찾아봐도 좋아요!', 'sad')); return; }
      if (!G.hintUsed[it.id]) { G.hintUsed[it.id] = true; G.hints++; saveProg(); renderHud(); }
      hintBox.innerHTML = '';
      hintBox.appendChild(somiTip(p.hint, 'wink'));
      hintBtn.textContent = '💡 힌트 다시 보기';
    });
    var buttons;
    if (solved) {
      fb.textContent = '이미 푼 단서예요. 얻은 조각: 「' + it.tile + '」';
      fb.className = 'g-fb is-ok';
      showWhy();
      buttons = doneButtons();
      setTimeout(function () { area.querySelectorAll('input, select, button').forEach(function (x) { x.disabled = true; }); }, 0);
    } else {
      buttons = [hintBtn, btn('닫기', 'g-ghost', closeDlg), check ? btn('확인', 'g-next', function () { check(); }) : null];
    }
    openDlg(who, nodes, buttons, it.npc ? '#2a9d8f' : '');
  }

  /* ───── 마지막 문 ───── */
  function openDoor() {
    var room = G.room;
    if (G.done) return openDlg('탈출구', somiTip('벌써 탈출했어요! 결과를 다시 볼까요?', 'happy'), [btn('결과 보기', 'g-next', function () { closeDlg(); showEnd(); }), btn('닫기', 'g-ghost', closeDlg)]);
    var need = room.items.length - G.solved.length;
    if (need > 0) {
      var left = h('ul', { class: 'g-left' });
      room.items.forEach(function (it) {
        if (G.solved.indexOf(it.id) < 0) left.appendChild(h('li', null, (it.npc ? it.npc.name + ' — ' : '') + it.label + ' (' + WALL_NAMES[it.wall] + ' 벽)'));
      });
      return openDlg('잠긴 문', [somiTip('자물쇠에 글자 칸이 ' + room.final.word.length + '개 있어요. 아직 조각이 ' + need + '개 모자라요. 빨간 ? 와 ! 표시를 찾아보세요!', 'think'), left], [btn('계속 찾기 ▶', 'g-next', closeDlg)]);
    }
    var placed = [];
    var tries = 0;
    var tiles = App.shuffleDifferent(room.final.word.map(function (t, i) { return { t: t, i: i }; }));
    var slots = h('div', { class: 'g-slots' });
    var pool = h('div', { class: 'g-tiles' });
    var fb = h('p', { class: 'g-fb', role: 'status' });
    function draw() {
      slots.innerHTML = '';
      room.final.word.forEach(function (_, i) { slots.appendChild(h('span', { class: 'g-slot big' + (placed[i] ? ' fill' : '') }, placed[i] ? placed[i].t : '')); });
      pool.innerHTML = '';
      tiles.forEach(function (x) {
        pool.appendChild(h('button', { type: 'button', class: 'g-tile', disabled: placed.indexOf(x) >= 0, onclick: function () {
          placed.push(x);
          beep('click');
          draw();
          if (placed.length === tiles.length) {
            var word = placed.map(function (y) { return y.t; }).join('');
            if (word === room.final.word.join('')) {
              G.stars += tries === 0 ? 2 : 1;
              fb.textContent = '철컥! 자물쇠가 풀렸어요.';
              fb.className = 'g-fb is-ok';
              finish();
            } else {
              tries++;
              G.mistakes++;
              saveProg();
              beep('bad');
              fb.textContent = '‘' + word + '’… 자물쇠가 꿈쩍도 안 해요. 다시 놓아 봐요.';
              fb.className = 'g-fb is-no';
              setTimeout(function () { placed = []; draw(); }, 900);
            }
          }
        } }, x.t));
      });
    }
    draw();
    openDlg('글자 자물쇠', [h('p', { class: 'g-q' }, room.final.q), slots, pool, fb], [btn('다시 놓기', 'g-ghost', function () { placed = []; draw(); }), btn('닫기', 'g-ghost', closeDlg)], '#2c6bd9');
  }

  function grade() {
    var max = G.room.items.length * 2 + 2;
    var r = G.stars / max;
    return r >= 0.9 ? 3 : r >= 0.6 ? 2 : 1;
  }
  function finish() {
    G.base = elapsed();
    G.done = true;
    G.grade = grade();
    saveProg();
    var b = best(G.room.id);
    G.newBest = !b || G.grade > b.stars || (G.grade === b.stars && G.base < b.time);
    if (G.newBest) App.store.kv('escapeBest:' + G.room.id, { time: G.base, stars: G.grade, at: new Date().toISOString().slice(0, 10) });
    beep('open');
    renderHud();
    setTimeout(closeDlg, 700);
    setTimeout(function () { banner('탈출 성공!', '문이 열렸어요'); }, 800);
    setTimeout(showEnd, 2600);
  }

  /* ───── 오버레이 (시작 · 끝) ───── */
  function showOverlay(id, nodes) {
    G.overlay = true;
    var ov = $('#' + id);
    var panel = ov.querySelector('.g-panel');
    panel.innerHTML = '';
    nodes.forEach(function (n) { if (n) panel.appendChild(n); });
    ov.classList.add('show');
  }
  function hideOverlay(id) {
    $('#' + id).classList.remove('show');
    G.overlay = false;
    G.start = Date.now();
  }
  function showTitle() {
    var room = G.room;
    showOverlay('g-title', [
      h('div', { class: 'g-sub' }, room.sub),
      h('h1', null, room.title),
      h('p', null, room.intro),
      h('div', { class: 'g-keys' },
        h('div', { class: 'desk' }, h('kbd', null, 'W'), h('kbd', null, 'A'), h('kbd', null, 'S'), h('kbd', null, 'D'), ' / 방향키 이동'),
        h('div', { class: 'desk' }, '화면을 끌어서 둘러보기 · ', h('kbd', null, 'Shift'), ' 달리기'),
        h('div', { class: 'desk' }, h('kbd', null, 'E'), ' 또는 클릭: 살펴보기 · 말 걸기'),
        h('div', { class: 'desk' }, h('kbd', null, 'M'), ' 지도 · ', h('kbd', null, 'Space'), ' 다음 대사'),
        h('div', null, '📱 태블릿: 왼쪽 손가락으로 이동, 오른쪽 손가락으로 둘러보기, ', h('b', null, '살펴보기'), ' 단추'),
        h('div', null, '❗ 머리 위 느낌표 인물과 빨간 ? 물건에 단서가 있어요. 빨간 화살표가 다음 단서로 안내해요.')),
      G.solved.length ? h('p', { class: 'g-cont' }, '지난번에 모은 조각 ' + G.solved.length + '개를 가지고 이어서 시작해요.') : null,
      h('button', { type: 'button', class: 'g-big', onclick: function () { hideOverlay('g-title'); beep('ok'); renderHud(); } }, G.solved.length ? '이어서 탐험하기' : '탐험 시작'),
      h('div', { class: 'g-links' }, h('a', { href: 'archive.html', target: '_blank', rel: 'noopener' }, '📚 문학 서고'), h('a', { href: 'escape.html', onclick: function (e) { e.preventDefault(); leave(); } }, '🚪 방 고르기')),
    ]);
  }
  function showEnd() {
    var room = G.room;
    var idx = E.rooms.indexOf(room);
    var next = E.rooms[idx + 1];
    var fw = App.lit && App.lit.work(room.final.work);
    var met = [];
    room.items.forEach(function (it) { (it.puzzle.works || []).forEach(function (w) { if (met.indexOf(w) < 0) met.push(w); }); });
    if (met.indexOf(room.final.work) < 0) met.push(room.final.work);
    showOverlay('g-end', [
      h('h1', null, '🎉 「' + room.title + '」 탈출!'),
      h('div', { class: 'g-grade', 'aria-label': '별 ' + G.grade + '개' }, '★★★'.slice(0, G.grade), h('span', null, '☆☆☆'.slice(0, 3 - G.grade))),
      h('div', { class: 'g-stat' },
        h('div', null, h('b', null, fmtTime(G.base)), '걸린 시간'),
        h('div', null, h('b', null, '⭐ ' + G.stars), '모은 별'),
        h('div', null, h('b', null, String(G.hints)), '힌트'),
        h('div', null, h('b', null, String(G.mistakes)), '틀린 횟수')),
      G.newBest ? h('p', { class: 'g-newbest' }, '새 최고 기록이에요!') : null,
      fw ? somiTip('문을 연 열쇠는 ' + fw.a + '의 「' + fw.t + '」였어요. 주제는 ‘' + fw.theme + '’.', 'happy') : null,
      h('p', { class: 'g-h3' }, '이 방에서 만난 작품 (누르면 문학 서고로)'),
      h('div', { class: 'g-met' }, met.map(function (id) {
        var w = App.lit && App.lit.work(id);
        return w ? h('a', { class: 'g-tag', href: 'archive.html#w=' + id, target: '_blank', rel: 'noopener' }, '「' + w.t + '」 ' + w.a) : null;
      })),
      h('div', { class: 'g-endbtns' },
        h('button', { type: 'button', class: 'g-big ghost', onclick: function () { hideOverlay('g-end'); } }, '자유 탐험하기'),
        next ? h('button', { type: 'button', class: 'g-big', onclick: function () { leave(); setTimeout(function () { enter(next.id, true); }, 50); } }, '다음 방: ' + next.title) : h('a', { class: 'g-big', href: 'exam.html' }, '수능·LEET 실전으로'),
        h('button', { type: 'button', class: 'g-big alt', onclick: function () { leave(); } }, '방 고르기')),
    ]);
  }

  /* ═════════════ 입력 ═════════════ */
  function pick(e) {
    var rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    var objs = G.targets.map(function (t) { return t.obj; }).concat(Object.keys(G.markers).map(function (k) { return G.markers[k]; }));
    var hits = raycaster.intersectObjects(objs, true);
    for (var i = 0; i < hits.length; i++) {
      var o = hits[i].object;
      if (o.isSprite) for (var key in G.markers) if (G.markers[key] === o) return targetOf(key);
      while (o) {
        for (var j = 0; j < G.targets.length; j++) if (G.targets[j].obj === o) return G.targets[j];
        o = o.parent;
      }
    }
    return null;
  }
  function tryInteract(t) {
    if (!t) return;
    if (distTo(t) > 2.6) {
      toast('조금 더 가까이 가 보세요 (' + distTo(t).toFixed(1) + 'm)');
      return;
    }
    interact(t);
  }
  function bindInput(canvas) {
    canvas.addEventListener('pointerdown', function (e) {
      if (!G || G.modal || G.overlay) return;
      if (e.pointerType === 'touch') document.body.classList.add('g-touch');
      if (e.pointerType === 'touch' && e.clientX < window.innerWidth * 0.42 && joy.id === null) {
        joy.id = e.pointerId;
        joy.cx = e.clientX;
        joy.cy = e.clientY;
        var j = $('#g-joy');
        j.style.display = 'block';
        j.style.left = e.clientX - 60 + 'px';
        j.style.top = e.clientY - 60 + 'px';
      } else if (!look) {
        look = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false };
      }
      try { canvas.setPointerCapture(e.pointerId); } catch (er) {}
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!G) return;
      if (e.pointerId === joy.id) {
        var dx = e.clientX - joy.cx;
        var dy = e.clientY - joy.cy;
        var l = Math.min(50, Math.sqrt(dx * dx + dy * dy));
        var a = Math.atan2(dy, dx);
        var kx = Math.cos(a) * l;
        var ky = Math.sin(a) * l;
        $('#g-knob').style.transform = 'translate(' + kx + 'px,' + ky + 'px)';
        joy.x = kx / 50;
        joy.y = -ky / 50;
        return;
      }
      if (look && e.pointerId === look.id) {
        var mx = e.clientX - look.x;
        var my = e.clientY - look.y;
        look.x = e.clientX;
        look.y = e.clientY;
        if (Math.abs(e.clientX - look.sx) + Math.abs(e.clientY - look.sy) > 6) look.moved = true;
        if (!G.modal) {
          P.yaw -= mx * 0.0045;
          P.pitch = Math.max(-0.9, Math.min(0.7, P.pitch - my * 0.0035));
        }
      }
    });
    function up(e) {
      if (!G) return;
      if (e.pointerId === joy.id) {
        joy.id = null;
        joy.x = joy.y = 0;
        $('#g-joy').style.display = 'none';
        $('#g-knob').style.transform = '';
        return;
      }
      if (look && e.pointerId === look.id) {
        var wasTap = !look.moved;
        look = null;
        if (wasTap && !G.modal && !G.overlay) tryInteract(pick(e));
      }
    }
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    window.addEventListener('keydown', function (e) {
      if (!G || !running) return;
      var k = e.key.toLowerCase();
      if (G.overlay) return;
      if (G.modal) {
        if (k === 'escape') closeDlg();
        if (k === ' ' || k === 'enter') {
          var nx = $('#g-drow .g-next');
          if (nx && document.activeElement.tagName !== 'INPUT') { e.preventDefault(); nx.click(); }
        }
        if (/^[1-5]$/.test(k)) {
          var cs = document.querySelectorAll('#g-dbody .g-choice');
          var c = cs[Number(k) - 1];
          if (c && !c.disabled) c.click();
        }
        return;
      }
      if (k === 'e' || k === 'enter') { if (near) interact(near); return; }
      if (k === 'm') { toggleMap(); return; }
      if (['w', 'a', 's', 'd', 'q', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'].indexOf(k) >= 0) {
        keys[k] = true;
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', function (e) { keys[e.key.toLowerCase()] = false; });
    window.addEventListener('blur', function () { keys = {}; });
    $('#g-act').addEventListener('click', function () { if (near) interact(near); else toast('가까이에 살펴볼 것이 없어요. 화살표를 따라가 보세요.'); });
    $('#g-prompt').addEventListener('click', function () { if (near) interact(near); });
  }
  /* 자동 점검용: 콘솔에서 App.escape.debug() 로 상태를 본다 */
  E.debug = function () { return { P: P, G: G, near: near, step: step }; };

  function toggleMap() {
    G.mapOn = !G.mapOn;
    $('#g-map').classList.toggle('show', G.mapOn);
    if (G.mapOn) drawMap();
  }

  /* ═════════════ 들어가기 / 나가기 ═════════════ */
  function enter(id, fresh) {
    var room = E.room(id);
    if (!room) return;
    if (!THREE) {
      alert('3D 그림을 불러오지 못했어요. 인터넷 연결을 확인해 주세요.');
      return;
    }
    var prog = fresh ? null : loadProg(id);
    if (prog && prog.done) prog = null;
    G = {
      room: room,
      solved: prog ? prog.solved.slice() : [],
      hints: prog ? prog.hints : 0,
      mistakes: prog ? prog.mistakes : 0,
      stars: prog ? prog.stars || prog.solved.length : 0,
      base: prog ? prog.t : 0,
      start: Date.now(),
      done: false,
      modal: false,
      overlay: false,
      hintUsed: {},
    };
    G.hintsLeft = function () { return Math.max(0, 3 - G.hints); };
    if (history.replaceState) history.replaceState(null, '', '#' + id);
    P.x = 0;
    P.z = 1.6;
    P.yaw = 0;
    P.pitch = -0.05;
    keys = {};

    document.body.classList.add('is-playing');
    $('#es-lobby').hidden = true;
    $('#es-game').hidden = false;

    var canvas = $('#es-canvas');
    if (!renderer) {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      camera = new THREE.PerspectiveCamera(66, 1, 0.05, 40);
      raycaster = new THREE.Raycaster();
      pointer = new THREE.Vector2();
      clock3 = new THREE.Clock();
      bindInput(canvas);
      window.addEventListener('resize', resize);
    }
    buildRoom(room);
    resize();
    renderHud();
    if (!running) {
      running = true;
      clock3.getDelta();
      frame();
    }
    G.overlay = true;
    showTitle();
  }

  function leave() {
    if (G && !G.done) {
      G.base = elapsed();
      saveProg();
    }
    if (G) {
      $('#g-dlg').classList.remove('show');
      $('#g-title').classList.remove('show');
      $('#g-end').classList.remove('show');
      $('#g-map').classList.remove('show');
    }
    running = false;
    G = null;
    document.body.classList.remove('is-playing');
    $('#es-game').hidden = true;
    $('#es-lobby').hidden = false;
    if (history.replaceState) history.replaceState(null, '', location.pathname);
    renderLobby();
  }

  function saveProg() {
    if (!G) return;
    App.store.kv(progKey(G.room.id), { solved: G.solved.slice(), hints: G.hints, mistakes: G.mistakes, stars: G.stars, t: elapsed(), done: G.done });
  }

  document.addEventListener('DOMContentLoaded', function () {
    App.applyBrand();
    App.mountYarns();
    var lobbyCat = $('#es-lobby-cat');
    if (lobbyCat) lobbyCat.innerHTML = App.cat.sit({ mood: 'wink' });
    var focus = location.hash.slice(1);
    renderLobby(E.room(focus) ? focus : null);
    $('#g-exit').addEventListener('click', leave);
    $('#g-mapbtn').addEventListener('click', toggleMap);
    var mute = $('#g-mute');
    mute.textContent = MUTE ? '🔇 소리' : '🔊 소리';
    mute.addEventListener('click', function () {
      MUTE = !MUTE;
      try { localStorage.setItem('gugeo-escape-mute', MUTE ? '1' : '0'); } catch (e) {}
      mute.textContent = MUTE ? '🔇 소리' : '🔊 소리';
    });
    if ('ontouchstart' in window) document.body.classList.add('g-touch');
    if (!THREE) {
      var warn = $('#es-nothree');
      if (warn) warn.hidden = false;
    }
  });
})();
