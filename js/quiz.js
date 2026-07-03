// Motor de examen: sesión de preguntas, opciones, corrección y puntaje.
window.EK = window.EK || {};

EK.quiz = (function () {
  "use strict";

  var MODES = ["choice", "write", "listen"];
  var _rng = Math.random;
  var _session = null; // { mode, questions:[...], i, score, answered }

  function rngInt(n) { return Math.floor(_rng() * n); }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = rngInt(i + 1);
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function sample(pool, n) {
    return shuffle(pool).slice(0, n);
  }

  // Opciones para choice/listen: 1 correcta (es[0]) + 3 distractores de otras palabras.
  function buildOptions(word, pool) {
    var others = pool.filter(function (w) { return w.id !== word.id; });
    var distract = sample(others, 3).map(function (w) { return { text: w.es[0], correct: false }; });
    var opts = [{ text: word.es[0], correct: true }].concat(distract);
    return shuffle(opts);
  }

  function makeQuestion(word, mode, pool) {
    var q = { mode: mode, word: word, prompt: word.en };
    if (mode === "choice" || mode === "listen") q.options = buildOptions(word, pool);
    return q;
  }

  function start(mode, size) {
    if (MODES.indexOf(mode) === -1) mode = "choice";
    size = size || 10;
    var pool = EK.words;
    var chosen = sample(pool, Math.min(size, pool.length));
    _session = {
      mode: mode,
      questions: chosen.map(function (w) { return makeQuestion(w, mode, pool); }),
      i: 0, score: 0, answered: false
    };
    return current();
  }

  function current() { return _session ? _session.questions[_session.i] : null; }

  function answer(value) {
    var q = current();
    if (!q) return null;
    var correct;
    if (q.mode === "write") {
      correct = EK.wordUtils.matchesAnswer(q.word, String(value));
    } else {
      correct = !!(q.options[value] && q.options[value].correct);
    }
    if (correct && !_session.answered) _session.score++;
    _session.answered = true;
    return { correct: correct, expected: q.word.es };
  }

  function next() {
    if (!_session) return null;
    if (_session.i < _session.questions.length - 1) {
      _session.i++;
      _session.answered = false;
      return current();
    }
    return null;
  }

  function index() { return _session ? _session.i : 0; }
  function total() { return _session ? _session.questions.length : 0; }
  function score() { return _session ? _session.score : 0; }
  function mode() { return _session ? _session.mode : null; }

  function isFinished() {
    return _session ? (_session.i >= _session.questions.length - 1 && _session.answered) : false;
  }

  function result() {
    var t = total();
    var pct = t > 0 ? Math.round(score() / t * 100) : 0;
    var best = EK.storage.get("stats.bestQuiz") || 0;
    if (pct > best) EK.storage.set("stats.bestQuiz", pct);
    return { score: score(), total: t, percent: pct };
  }

  return {
    MODES: MODES,
    buildOptions: buildOptions,
    start: start, current: current, answer: answer, next: next,
    index: index, total: total, score: score, mode: mode,
    isFinished: isFinished, result: result,
    _setRng: function (fn) { _rng = fn; }
  };
})();
