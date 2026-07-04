// Modo "Estudiar hoy": sesión guiada de ~10 palabras (aprender→repasar→mini examen→resultado).
window.EK = window.EK || {};

EK.today = (function () {
  "use strict";

  var WORDS_PER_DAY = 10;
  var _rng = Math.random;
  var _s = null; // { words, phase, i, score, questions, answered }

  function rngInt(n) { return Math.floor(_rng() * n); }
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = rngInt(i + 1);
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // Selecciona ~10 palabras, priorizando las no vistas.
  function selectWords() {
    var unseen = EK.words.filter(function (w) { return !EK.progress.isSeen(w.id); });
    var seen = EK.words.filter(function (w) { return EK.progress.isSeen(w.id); });
    var pool = shuffle(unseen).concat(shuffle(seen));
    return pool.slice(0, Math.min(WORDS_PER_DAY, EK.words.length));
  }

  // Marca la palabra actual como vista (solo en learn/review).
  function landLearn() {
    if (!_s) return;
    if (_s.phase === "learn" || _s.phase === "review") {
      var w = _s.words[_s.i];
      if (w) EK.progress.markSeen(w.id);
    }
  }

  function buildQuestions() {
    _s.questions = _s.words.map(function (w) {
      return { word: w, prompt: w.en, options: EK.quiz.buildOptions(w, EK.words) };
    });
  }

  function start() {
    _s = { words: selectWords(), phase: "learn", i: 0, score: 0, questions: [], answered: false };
    landLearn();
    return _s.phase;
  }

  function phase() { return _s ? _s.phase : null; }
  function words() { return _s ? _s.words : []; }
  function index() { return _s ? _s.i : 0; }
  function total() { return _s ? _s.words.length : 0; }
  function score() { return _s ? _s.score : 0; }
  function answered() { return _s ? _s.answered : false; }

  function current() {
    if (!_s) return null;
    if (_s.phase === "quiz") return _s.questions[_s.i] || null;
    return _s.words[_s.i] || null;
  }

  function next() {
    if (!_s) return null;
    if (_s.phase === "learn") {
      _s.i++;
      if (_s.i >= _s.words.length) { _s.phase = "review"; _s.i = 0; }
      landLearn();
    } else if (_s.phase === "review") {
      _s.i++;
      if (_s.i >= _s.words.length) { _s.phase = "quiz"; _s.i = 0; buildQuestions(); _s.answered = false; }
      else { landLearn(); }
    } else if (_s.phase === "quiz") {
      _s.i++;
      _s.answered = false;
      if (_s.i >= _s.questions.length) { _s.phase = "result"; }
    }
    return _s.phase;
  }

  function answer(idx) {
    if (!_s || _s.phase !== "quiz") return null;
    var q = _s.questions[_s.i];
    var correct = !!(q && q.options[idx] && q.options[idx].correct);
    if (correct && !_s.answered) _s.score++;
    _s.answered = true;
    return { correct: correct };
  }

  function result() {
    var t = _s ? _s.questions.length : 0;
    var pct = t > 0 ? Math.round(_s.score / t * 100) : 0;
    return { score: _s ? _s.score : 0, total: t, percent: pct };
  }

  return {
    start: start, phase: phase, words: words, index: index, total: total,
    score: score, answered: answered, current: current, next: next,
    answer: answer, result: result, _setRng: function (fn) { _rng = fn; }
  };
})();
