/* 읽어 주기: 브라우저에 들어 있는 한국어 목소리(Web Speech API)를 씁니다.
   한국어 목소리가 없는 기기에서는 조용히 넘어갑니다. */
(function () {
  var App = (window.App = window.App || {});
  var synth = window.speechSynthesis;
  var voice = null;
  var speakingEl = null;
  var activeSeq = null; // 지금 이어 읽고 있는 것

  function pickVoice() {
    if (!synth) return;
    var list = synth.getVoices().filter(function (v) {
      return /^ko([-_]|$)/i.test(v.lang);
    });
    if (!list.length) return;
    /* 자연스러운 목소리를 먼저 고른다 */
    var prefer = [/natural/i, /sunhi|선희/i, /google/i, /yuna|유나/i, /heami|혜미/i];
    for (var i = 0; i < prefer.length && !voice; i++) {
      for (var j = 0; j < list.length; j++) {
        if (prefer[i].test(list[j].name)) {
          voice = list[j];
          break;
        }
      }
    }
    voice = voice || list[0];
  }

  if (synth) {
    pickVoice();
    if (synth.addEventListener) synth.addEventListener('voiceschanged', pickVoice);
  }

  function clearMark() {
    if (speakingEl) speakingEl.classList.remove('is-speaking');
    speakingEl = null;
  }

  /* speak('안녕', {rate, el, onend})  el에는 읽는 동안 is-speaking 클래스가 붙는다 */
  function speak(text, opts) {
    opts = opts || {};
    if (!synth || !text) {
      if (opts.onend) opts.onend();
      return false;
    }
    /* 이어 읽기(sequence) 도중에 다른 것을 읽어 달라고 하면 이어 읽기를 멈춘다 */
    if (activeSeq && !opts.fromSeq) activeSeq.halt();
    synth.cancel();
    clearMark();
    if (!voice) pickVoice();
    var plain = App.plain ? App.plain(text) : String(text);
    var u = new SpeechSynthesisUtterance(plain);
    u.lang = 'ko-KR';
    if (voice) u.voice = voice;
    u.rate = opts.rate || 0.85;
    u.pitch = opts.pitch || 1.05;
    if (opts.volume) u.volume = opts.volume;
    if (opts.el) {
      speakingEl = opts.el;
      speakingEl.classList.add('is-speaking');
    }
    var done = false;
    var guard = null;
    function finish() {
      if (done) return;
      done = true;
      clearTimeout(guard);
      if (speakingEl === opts.el) clearMark();
      if (opts.onend) opts.onend();
    }
    u.onend = finish;
    u.onerror = finish;
    /* 목소리가 없어 끝났다는 신호가 오지 않는 기기에서도 멈추지 않게 */
    guard = setTimeout(finish, 2500 + plain.length * 450);
    synth.speak(u);
    return true;
  }

  /* 여러 조각을 차례로, 사이사이 쉬면서 읽는다. onstep(i) 으로 지금 읽는 조각을 알려 준다. */
  function sequence(parts, opts) {
    opts = opts || {};
    var i = 0;
    var stopped = false;
    var ctrl = {
      /* 소리는 그대로 두고 이어 읽기만 멈춘다 */
      halt: function () {
        if (stopped) return;
        stopped = true;
        if (activeSeq === ctrl) activeSeq = null;
        if (opts.onstep) opts.onstep(-1);
      },
      stop: function () {
        var was = stopped;
        ctrl.halt();
        if (!was) stop();
      },
    };
    function next() {
      if (stopped) return;
      if (i >= parts.length) {
        stopped = true;
        if (activeSeq === ctrl) activeSeq = null;
        if (opts.onstep) opts.onstep(-1);
        if (opts.onend) opts.onend();
        return;
      }
      var idx = i++;
      if (opts.onstep) opts.onstep(idx);
      var gap = typeof opts.gap === 'function' ? opts.gap(idx) : opts.gap || 350;
      speak(parts[idx], {
        rate: opts.rate,
        fromSeq: true,
        onend: function () {
          setTimeout(next, gap);
        },
      });
    }
    if (activeSeq) activeSeq.halt();
    activeSeq = ctrl;
    if (!synth) {
      /* 소리 없이 강조만 차례로 보여 준다 */
      (function silent() {
        if (stopped) return;
        if (i >= parts.length) {
          stopped = true;
          if (activeSeq === ctrl) activeSeq = null;
          if (opts.onstep) opts.onstep(-1);
          if (opts.onend) opts.onend();
          return;
        }
        var idx = i++;
        if (opts.onstep) opts.onstep(idx);
        setTimeout(silent, 500 + String(parts[idx]).length * 160);
      })();
    } else {
      next();
    }
    return ctrl;
  }

  function stop() {
    if (activeSeq) activeSeq.halt();
    if (synth) synth.cancel();
    clearMark();
  }

  App.tts = {
    supported: !!synth,
    hasKorean: function () {
      if (!voice) pickVoice();
      return !!voice;
    },
    speak: speak,
    sequence: sequence,
    stop: stop,
  };

  /* 🔊 버튼 만들기 */
  App.sayButton = function (text, label) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'say-btn';
    b.setAttribute('data-say', text);
    b.setAttribute('aria-label', (label || '소리로 듣기') + ': ' + (App.plain ? App.plain(text) : text));
    b.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.2L12 5.6v12.8l-4.8-3.9H4z" fill="currentColor"/><path d="M15.2 8.6a4.8 4.8 0 0 1 0 6.8M17.6 6.2a8.2 8.2 0 0 1 0 11.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>' +
      (label ? '<span>' + label + '</span>' : '');
    return b;
  };

  window.addEventListener('pagehide', stop);
})();
