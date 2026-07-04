(function () {
  "use strict";

  function memBackend() {
    var d = {};
    return {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(d, k) ? d[k] : null; },
      setItem: function (k, v) { d[k] = String(v); },
      removeItem: function (k) { delete d[k]; }
    };
  }

  EKTest.test("today.start: fase learn con 10 palabras", function () {
    EK.storage._backend = memBackend(); EK.storage.load();
    EK.today._setRng(function () { return 0; });
    var ph = EK.today.start();
    EKTest.assertEqual(ph, "learn", "empieza en learn");
    EKTest.assertEqual(EK.today.total(), 10, "10 palabras");
    EKTest.assertEqual(EK.today.index(), 0, "índice 0");
  });

  EKTest.test("today.start: prioriza palabras no vistas", function () {
    EK.storage._backend = memBackend(); EK.storage.load();
    // Marca vistas todas menos 103..112 (10 no vistas exactas).
    var seen = [];
    for (var i = 1; i <= 102; i++) seen.push(i);
    EK.storage.set("seen", seen);
    EK.today._setRng(function () { return 0; });
    EK.today.start();
    var ids = EK.today.words().map(function (w) { return w.id; }).sort(function (a, b) { return a - b; });
    EKTest.assertDeepEqual(ids, [103, 104, 105, 106, 107, 108, 109, 110, 111, 112], "las 10 no vistas");
  });

  EKTest.test("today.next: transiciona learn → review → quiz → result", function () {
    EK.storage._backend = memBackend(); EK.storage.load();
    EK.today._setRng(function () { return 0; });
    EK.today.start(); // learn, i=0
    var k;
    for (k = 0; k < 10; k++) EK.today.next(); // 10 avances → review
    EKTest.assertEqual(EK.today.phase(), "review", "tras 10 → review");
    for (k = 0; k < 10; k++) EK.today.next(); // 10 avances → quiz
    EKTest.assertEqual(EK.today.phase(), "quiz", "tras 10 → quiz");
    EKTest.assert(EK.today.current().options.length === 4, "pregunta con 4 opciones");
    for (k = 0; k < 10; k++) EK.today.next(); // 10 avances → result
    EKTest.assertEqual(EK.today.phase(), "result", "tras 10 → result");
  });

  EKTest.test("today.answer: acierto suma una vez", function () {
    EK.storage._backend = memBackend(); EK.storage.load();
    EK.today._setRng(function () { return 0; });
    EK.today.start();
    var k;
    for (k = 0; k < 20; k++) EK.today.next(); // hasta quiz
    var q = EK.today.current();
    var ci = -1;
    for (var i = 0; i < q.options.length; i++) if (q.options[i].correct) ci = i;
    EKTest.assert(EK.today.answer(ci).correct === true, "correcto");
    EKTest.assertEqual(EK.today.score(), 1, "puntaje 1");
    EK.today.answer(ci); // repetir no suma
    EKTest.assertEqual(EK.today.score(), 1, "sin doble conteo");
  });

  EKTest.test("today.result: porcentaje", function () {
    EK.storage._backend = memBackend(); EK.storage.load();
    EK.today._setRng(function () { return 0; });
    EK.today.start();
    var k;
    for (k = 0; k < 20; k++) EK.today.next(); // quiz, primera pregunta
    // Responder todas correctamente.
    for (k = 0; k < EK.today.total(); k++) {
      var q = EK.today.current();
      var ci = 0;
      for (var i = 0; i < q.options.length; i++) if (q.options[i].correct) ci = i;
      EK.today.answer(ci);
      EK.today.next();
    }
    var res = EK.today.result();
    EKTest.assertEqual(res.total, 10, "10 preguntas");
    EKTest.assertEqual(res.score, 10, "10 aciertos");
    EKTest.assertEqual(res.percent, 100, "100%");
  });
})();
