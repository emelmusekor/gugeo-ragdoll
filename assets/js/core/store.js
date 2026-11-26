/* 학습 기록: 가입 없이 이 기기(브라우저)에만 저장합니다. */
(function () {
  var App = (window.App = window.App || {});
  var KEY = (App.config && App.config.storageKey) || 'gugeo-ragdoll.v1';
  var memory = null;

  function blank() {
    return { name: '', units: {}, last: null, marks: [], maru: {}, kv: {} };
  }

  function load() {
    if (memory) return memory;
    try {
      memory = Object.assign(blank(), JSON.parse(localStorage.getItem(KEY) || '{}'));
    } catch (e) {
      memory = blank();
    }
    return memory;
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(memory));
    } catch (e) {
      /* 저장할 수 없는 환경(사생활 보호 모드 등)에서는 이번 방문 동안만 기억한다 */
    }
  }

  function unit(id) {
    var s = load();
    if (!s.units[id]) s.units[id] = { seen: [], quiz: {}, done: false };
    return s.units[id];
  }

  App.store = {
    get: load,
    save: save,

    name: function (v) {
      var s = load();
      if (v === undefined) return s.name || '';
      s.name = String(v).slice(0, 12);
      save();
      return s.name;
    },

    /* 단원 기록 */
    unit: unit,
    seeSection: function (id, sectionId) {
      var u = unit(id);
      if (u.seen.indexOf(sectionId) < 0) {
        u.seen.push(sectionId);
        save();
      }
    },
    answer: function (id, quizKey, ok) {
      var u = unit(id);
      if (u.quiz[quizKey] === true) return; // 한 번 맞힌 문제는 그대로 둔다
      u.quiz[quizKey] = !!ok;
      save();
    },
    complete: function (id) {
      var u = unit(id);
      if (!u.done) {
        u.done = true;
        u.at = new Date().toISOString().slice(0, 10);
        save();
      }
    },
    isDone: function (id) {
      var s = load();
      return !!(s.units[id] && s.units[id].done);
    },
    solved: function (id) {
      var s = load();
      var q = (s.units[id] && s.units[id].quiz) || {};
      return Object.keys(q).filter(function (k) {
        return q[k] === true;
      }).length;
    },

    /* 마지막으로 본 단원 */
    last: function (id) {
      var s = load();
      if (id === undefined) return s.last;
      s.last = id;
      save();
    },

    /* 책갈피 */
    isMarked: function (id) {
      return load().marks.indexOf(id) >= 0;
    },
    toggleMark: function (id) {
      var s = load();
      var i = s.marks.indexOf(id);
      if (i >= 0) s.marks.splice(i, 1);
      else s.marks.push(id);
      save();
      return i < 0;
    },

    /* 쉼터(마루)에서 쓰는 작은 기록 */
    maru: function (key, value) {
      var s = load();
      if (value === undefined) return s.maru[key];
      s.maru[key] = value;
      save();
    },

    /* 문학 서고·방탈출·실전 문제에서 쓰는 기록 (서재, 최고 기록, 오답 노트 등) */
    kv: function (key, value) {
      var s = load();
      if (!s.kv) s.kv = {};
      if (value === undefined) return s.kv[key];
      s.kv[key] = value;
      save();
    },

    reset: function () {
      memory = blank();
      save();
    },
  };
})();
