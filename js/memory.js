// Motor del juego de memoria: tablero de parejas inglés↔español.
window.EK = window.EK || {};

EK.memory = (function () {
  "use strict";

  var _rng = Math.random;
  var _cards = [];      // { wordId, kind:"en"|"es", text }
  var _revealed = [];   // índices boca-arriba sin emparejar (0..2)
  var _matched = {};    // índice -> true
  var _moves = 0;

  function rngInt(n) { return Math.floor(_rng() * n); }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = rngInt(i + 1);
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function sample(pool, n) { return shuffle(pool).slice(0, n); }

  function start(pairs) {
    pairs = pairs || 6;
    var words = sample(EK.words, Math.min(pairs, EK.words.length));
    var cards = [];
    words.forEach(function (w) {
      cards.push({ wordId: w.id, kind: "en", text: w.en });
      cards.push({ wordId: w.id, kind: "es", text: w.es[0] });
    });
    _cards = shuffle(cards);
    _revealed = [];
    _matched = {};
    _moves = 0;
    return _cards.length;
  }

  function cards() { return _cards; }
  function revealedIndices() { return _revealed.slice(); }
  function isMatched(i) { return !!_matched[i]; }
  function moves() { return _moves; }

  function matchedCount() {
    var n = 0;
    for (var k in _matched) { if (_matched.hasOwnProperty(k)) n++; }
    return n;
  }
  function isDone() { return _cards.length > 0 && matchedCount() === _cards.length; }

  function clearMismatch() {
    if (_revealed.length === 2) _revealed = [];
  }

  function flip(i) {
    if (i < 0 || i >= _cards.length) return { status: "ignored" };
    if (_matched[i]) return { status: "ignored" };
    // Si hay un desacierto pendiente (2 boca-arriba), bájalas antes de continuar.
    if (_revealed.length === 2) _revealed = [];
    if (_revealed.indexOf(i) !== -1) return { status: "ignored" };

    _revealed.push(i);
    if (_revealed.length < 2) return { status: "revealed" };

    _moves++;
    var a = _cards[_revealed[0]];
    var b = _cards[_revealed[1]];
    if (a.wordId === b.wordId) {
      _matched[_revealed[0]] = true;
      _matched[_revealed[1]] = true;
      _revealed = [];
      return { status: "match", done: isDone(), moves: _moves };
    }
    return { status: "mismatch", moves: _moves };
  }

  return {
    start: start, cards: cards, revealedIndices: revealedIndices,
    isMatched: isMatched, moves: moves, isDone: isDone,
    flip: flip, clearMismatch: clearMismatch,
    _setRng: function (fn) { _rng = fn; }
  };
})();
