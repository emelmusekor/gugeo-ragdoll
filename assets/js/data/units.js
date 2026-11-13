/* 단원 등록부. units-*.js 파일들이 App.unit({...})으로 단원을 등록합니다.

   단원 하나의 모양
   App.unit({
     id: '1-1-03',                 // 학년-학기-단원 번호 (중학교 1~3학년은 7~9, 고등학교 공통국어1·2는 10-1, 10-2)
     title: '글자를 만들어요',      // 목차에 보이는 이름
     hook: '자음자와 모음자가 만나면', // 두루마리 맨 위 큰 제목
     domain: '문법',               // 대표 영역 (듣기·말하기 | 읽기 | 쓰기 | 문법 | 문학 | 매체)
     standards: ['2국04-01'],      // 연결된 성취기준 코드 (data/standards.js 에 있는 것만)
     goals: ['…', '…'],            // 이 단원에서 할 수 있게 되는 것 2~3가지
     sections: [ { title, lead, blocks: [ … ] } ],
     wrap: ['…', '…', '…'],        // 한 장 요약
   });

   blocks 에 쓸 수 있는 것
   { t:'p', text }                         본문. **굵게** ==형광펜== [[소리]] {{누르면 읽어 주는 낱말}}
   { t:'say', text, mood }                 솜이의 말풍선 (mood: smile|happy|wow|think|sad|shy|wink …)
   { t:'widget', kind, props, title, note } 움직이는 그림 (kind 는 assets/js/widgets 에 있는 이름)
   { t:'box', title, lines:[…] }           보기 글 상자
   { t:'table', title, head:[…], rows:[[…],…], note }   정리 표 (칸 안에서도 **굵게** 를 쓸 수 있어요)
   { t:'quiz', q, pic, choices:[…], answer:0, why }   고르는 확인 문제 (answer 는 0부터 세는 정답 번호)
   { t:'reveal', q, a }                    눌러서 답 보기
   { t:'tip', text }                       도움말 (초등은 함께하는 어른께, 중·고는 공부하는 학생에게) */
(function () {
  var App = (window.App = window.App || {});

  App.units = [];

  /* 사이트에 실린 단원 파일(학기 key 와 같다). 새 학기 파일 units-<key>.js 를 다 쓰면 여기에 더한다.
     화면들은 이 목록을 보고 단원 파일을 불러오므로, HTML 에는 따로 적지 않아도 된다. */
  App.unitFiles = ['1-1', '1-2', '2-1', '2-2', '3-1', '3-2', '4-1', '4-2', '6-1', '7-2', '9-1'];

  /* 단원 파일을 쓴 차례대로 불러온 뒤 done 을 부른다. 이미 불러왔으면 바로 부른다. */
  var loadState = 0; // 0 아직 · 1 불러오는 중 · 2 끝
  var waiting = [];
  App.loadUnits = function (done) {
    if (loadState === 2) {
      if (done) done();
      return;
    }
    if (done) waiting.push(done);
    if (loadState === 1) return;
    loadState = 1;
    var left = App.unitFiles.length;
    function finish() {
      loadState = 2;
      waiting.splice(0).forEach(function (f) {
        f();
      });
    }
    if (!left) return finish();
    App.unitFiles.forEach(function (key) {
      var s = document.createElement('script');
      s.src = 'assets/js/data/units-' + key + '.js';
      s.async = false; // 넣은 차례대로 실행되게
      s.onload = s.onerror = function () {
        if (--left === 0) finish();
      };
      document.head.appendChild(s);
    });
  };

  App.semesters = [
    { key: '1-1', grade: 1, sem: 1, band: '1-2', title: '한글과 친해져요', desc: '자음자와 모음자부터 글자, 낱말, 첫 문장까지' },
    { key: '1-2', grade: 1, sem: 2, band: '1-2', title: '문장과 이야기를 만나요', desc: '마음을 말하고, 그림일기를 쓰고, 이야기를 읽어요' },
    { key: '2-1', grade: 2, sem: 1, band: '1-2', title: '생각을 말과 글로', desc: '발표하고, 소개하는 글을 쓰고, 시와 말놀이를 즐겨요' },
    { key: '2-2', grade: 2, sem: 2, band: '1-2', title: '더 넓게 읽고 써요', desc: '인물이 되어 보고, 중심 내용을 찾고, 매체를 만나요' },
    { key: '3-1', grade: 3, sem: 1, band: '3-4', title: '문단과 낱말의 세계로', desc: '문단의 짜임, 높임 표현, 국어사전, 이야기의 흐름' },
    { key: '3-2', grade: 3, sem: 2, band: '3-4', title: '생각을 나누고 글로 펼쳐요', desc: '중심 생각, 의견과 이유, 낱말의 관계, 인터넷 자료 찾기' },
    { key: '4-1', grade: 4, sem: 1, band: '3-4', title: '정확하게 읽고 조리 있게 말해요', desc: '사실과 의견, 문장의 짜임, 보고하는 글, 자료 발표' },
    { key: '4-2', grade: 4, sem: 2, band: '3-4', title: '함께 생각하고 책임 있게 나눠요', desc: '토의, 믿을 만한 자료, 매체 예절, 우리말 사랑' },
    { key: '5-1', grade: 5, sem: 1, band: '5-6', title: '깊이 읽고 조리 있게 써요', desc: '비유하는 표현, 글의 구조와 요약, 설명하는 글, 문장 성분과 호응' },
    { key: '5-2', grade: 5, sem: 2, band: '5-6', title: '근거를 따져 듣고 주장해요', desc: '주장과 근거, 관용 표현, 뉴스의 신뢰성, 작가의 의도' },
    { key: '6-1', grade: 6, sem: 1, band: '5-6', title: '더 넓은 세상과 소통해요', desc: '면담과 토론, 시간 표현, 표준어와 방언, 극 읽기' },
    { key: '6-2', grade: 6, sem: 2, band: '5-6', title: '스스로 점검하며 읽고 써요', desc: '말과 글의 차이, 고쳐 쓰기, 매체 자료 만들기, 작품과 나의 삶' },
    { key: '7-1', grade: 7, sem: 1, band: '7-9', title: '새로운 눈으로 읽고 말해요', desc: '운율과 비유, 요약하기, 품사, 설명 방법, 갈등' },
    { key: '7-2', grade: 7, sem: 2, band: '7-9', title: '생각을 키우는 말과 글', desc: '의도 추론, 단어의 짜임, 주장하는 글, 성장 소설, 어휘의 양상' },
    { key: '8-1', grade: 8, sem: 1, band: '7-9', title: '짜임을 보는 눈', desc: '화자와 시점, 논증 방법, 문장의 짜임, 발표, 설득 전략' },
    { key: '8-2', grade: 8, sem: 2, band: '7-9', title: '함께 풀어 가는 문제', desc: '토의, 음운과 한글, 사회·문화적 상황, 갈등 조정, 광고 읽기' },
    { key: '9-1', grade: 9, sem: 1, band: '7-9', title: '논리와 책임', desc: '상징과 창작, 주제 통합적 읽기, 피동·인용 표현, 토론, 한글 맞춤법' },
    { key: '9-2', grade: 9, sem: 2, band: '7-9', title: '나와 세계를 잇는 국어', desc: '작품 해석, 진로 독서, 언어와 세계, 존중하는 말, 매체의 공정성' },
    { key: '10-1', grade: 10, sem: 1, band: 'high', name: '공통국어1', short: '공통국어1', no: '1', title: '말과 글의 원리를 탐구해요', desc: '문학 갈래, 대화의 원리, 음운 변동, 논증과 토론, 매체 분석' },
    { key: '10-2', grade: 10, sem: 2, band: 'high', name: '공통국어2', short: '공통국어2', no: '2', title: '깊이 읽고 책임 있게 소통해요', desc: '한국 문학의 흐름, 국어의 변화, 논증하는 글, 협상, 한글 맞춤법, 매체 비평' },
  ];

  /* 학기 이름: name ‘1학년 1학기’·‘중학교 1학년 1학기’·‘공통국어1’, short ‘1-1’·‘중1-1’, no 는 고르는 칸에 적는 번호.
     teen 이 참이면(중·고) 도움말을 어른이 아니라 공부하는 학생에게 건넨다. */
  App.semesters.forEach(function (s) {
    var mid = s.grade >= 7 && s.grade <= 9;
    var g = mid ? s.grade - 6 : s.grade;
    if (!s.name) s.name = (mid ? '중학교 ' : '') + g + '학년 ' + s.sem + '학기';
    if (!s.short) s.short = (mid ? '중' : '') + g + '-' + s.sem;
    if (!s.no) s.no = g + '-' + s.sem;
    s.teen = s.grade >= 7;
  });

  App.unit = function (def) {
    var m = /^(\d{1,2})-(\d)-(\d+)$/.exec(def.id || '');
    if (!m) {
      if (window.console) console.warn('단원 id 가 올바르지 않습니다:', def.id);
      return;
    }
    def.grade = Number(m[1]);
    def.sem = Number(m[2]);
    def.no = Number(m[3]);
    def.semKey = m[1] + '-' + m[2];
    def.standards = def.standards || [];
    def.sections = def.sections || [];
    def.wrap = def.wrap || [];
    var widgets = 0;
    var quizzes = 0;
    def.sections.forEach(function (s, si) {
      s.id = 's' + (si + 1);
      var q = 0;
      (s.blocks || []).forEach(function (b) {
        if (b.t === 'widget') widgets++;
        if (b.t === 'quiz' || b.t === 'reveal') {
          quizzes++;
          b.key = s.id + '-q' + ++q;
        }
      });
    });
    def.widgetCount = widgets;
    def.quizCount = quizzes;
    App.units.push(def);
  };

  App.unitById = function (id) {
    for (var i = 0; i < App.units.length; i++) if (App.units[i].id === id) return App.units[i];
    return null;
  };

  App.unitsOf = function (semKey) {
    return App.units
      .filter(function (u) {
        return u.semKey === semKey;
      })
      .sort(function (a, b) {
        return a.no - b.no;
      });
  };

  App.semester = function (key) {
    for (var i = 0; i < App.semesters.length; i++) if (App.semesters[i].key === key) return App.semesters[i];
    return null;
  };

  /* 단원(또는 학기 key)이 든 학기의 이름: ‘1학년 1학기’, ‘중학교 2학년 1학기’, ‘공통국어1’.
     short 가 참이면 ‘1-1’, ‘중2-1’, ‘공통국어1’ */
  App.semName = function (unitOrKey, short) {
    var s = App.semester(typeof unitOrKey === 'string' ? unitOrKey : unitOrKey.semKey);
    return s ? (short ? s.short : s.name) : '';
  };

  /* 같은 학기의 다음 단원, 없으면 다음 학기의 첫 단원 */
  App.nextUnit = function (unit) {
    var list = App.unitsOf(unit.semKey);
    var i = list.indexOf(unit);
    if (i >= 0 && i < list.length - 1) return list[i + 1];
    var si = App.semesters.indexOf(App.semester(unit.semKey));
    for (var k = si + 1; k < App.semesters.length; k++) {
      var nextList = App.unitsOf(App.semesters[k].key);
      if (nextList.length) return nextList[0];
    }
    return null;
  };
})();
