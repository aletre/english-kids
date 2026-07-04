(function () {
  "use strict";

  // Localiza los dos índices de cartas que forman una pareja (mismo wordId).
  function findPair(cards) {
    for (var i = 0; i < cards.length; i++) {
      for (var j = i + 1; j < cards.length; j++) {
        if (cards[i].wordId === cards[j].wordId) return [i, j];
      }
    }
    return null;
  }
  // Localiza dos índices que NO forman pareja.
  function findNonPair(cards) {
    for (var i = 0; i < cards.length; i++) {
      for (var j = i + 1; j < cards.length; j++) {
        if (cards[i].wordId !== cards[j].wordId) return [i, j];
      }
    }
    return null;
  }

  EKTest.test("memory.start: 6 parejas = 12 cartas, cada palabra 2 veces (en+es)", function () {
    EK.memory._setRng(function () { return 0; });
    var n = EK.memory.start(6);
    EKTest.assertEqual(n, 12, "12 cartas");
    EKTest.assertEqual(EK.memory.cards().length, 12, "cards() 12");
    var counts = {};
    EK.memory.cards().forEach(function (c) { counts[c.wordId] = (counts[c.wordId] || 0) + 1; });
    var pairs = Object.keys(counts);
    EKTest.assertEqual(pairs.length, 6, "6 palabras");
    EKTest.assert(pairs.every(function (k) { return counts[k] === 2; }), "cada palabra 2 cartas");
  });

  EKTest.test("memory.flip: pareja correcta queda emparejada, cuenta 1 movimiento", function () {
    EK.memory._setRng(function () { return 0; });
    EK.memory.start(6);
    var p = findPair(EK.memory.cards());
    EKTest.assertEqual(EK.memory.flip(p[0]).status, "revealed", "primera carta revelada");
    var r = EK.memory.flip(p[1]);
    EKTest.assertEqual(r.status, "match", "match");
    EKTest.assertEqual(EK.memory.moves(), 1, "1 movimiento");
    EKTest.assert(EK.memory.isMatched(p[0]) && EK.memory.isMatched(p[1]), "ambas emparejadas");
  });

  EKTest.test("memory.flip: desacierto no empareja; clearMismatch las baja", function () {
    EK.memory._setRng(function () { return 0; });
    EK.memory.start(6);
    var np = findNonPair(EK.memory.cards());
    EK.memory.flip(np[0]);
    var r = EK.memory.flip(np[1]);
    EKTest.assertEqual(r.status, "mismatch", "mismatch");
    EKTest.assertEqual(EK.memory.revealedIndices().length, 2, "2 reveladas pendientes");
    EK.memory.clearMismatch();
    EKTest.assertEqual(EK.memory.revealedIndices().length, 0, "clearMismatch las baja");
  });

  EKTest.test("memory.flip: carta ya emparejada o repetida → ignored", function () {
    EK.memory._setRng(function () { return 0; });
    EK.memory.start(6);
    var p = findPair(EK.memory.cards());
    EK.memory.flip(p[0]); EK.memory.flip(p[1]); // emparejadas
    EKTest.assertEqual(EK.memory.flip(p[0]).status, "ignored", "carta emparejada ignorada");
  });

  EKTest.test("memory.isDone: true cuando todas las parejas se emparejan", function () {
    EK.memory._setRng(function () { return 0; });
    EK.memory.start(6);
    // Empareja todas: por cada wordId, voltea sus dos cartas.
    var cards = EK.memory.cards();
    var byWord = {};
    cards.forEach(function (c, i) { (byWord[c.wordId] = byWord[c.wordId] || []).push(i); });
    Object.keys(byWord).forEach(function (wid) {
      EK.memory.flip(byWord[wid][0]);
      EK.memory.flip(byWord[wid][1]);
    });
    EKTest.assert(EK.memory.isDone() === true, "juego completado");
  });
})();
