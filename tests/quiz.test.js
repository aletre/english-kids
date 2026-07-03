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

  function correctIndex(q) {
    for (var i = 0; i < q.options.length; i++) if (q.options[i].correct) return i;
    return -1;
  }

  EKTest.test("quiz.buildOptions: 4 opciones, exactamente 1 correcta = es[0]", function () {
    EK.quiz._setRng(function () { return 0; });
    var word = EK.wordUtils.byId(13); // butterfly / mariposa
    var opts = EK.quiz.buildOptions(word, EK.words);
    EKTest.assertEqual(opts.length, 4, "4 opciones");
    var corrects = opts.filter(function (o) { return o.correct; });
    EKTest.assertEqual(corrects.length, 1, "exactamente 1 correcta");
    EKTest.assertEqual(corrects[0].text, "mariposa", "la correcta es es[0]");
  });

  EKTest.test("quiz.start(choice): sesión de tamaño N con opciones", function () {
    EK.storage._backend = memBackend(); EK.storage.load();
    EK.quiz._setRng(function () { return 0; });
    EK.quiz.start("choice", 5);
    EKTest.assertEqual(EK.quiz.total(), 5, "5 preguntas");
    EKTest.assertEqual(EK.quiz.mode(), "choice", "modo choice");
    EKTest.assert(EK.quiz.current().options.length === 4, "pregunta con 4 opciones");
  });

  EKTest.test("quiz.answer(choice): correcto suma, incorrecto no; sin doble conteo", function () {
    EK.storage._backend = memBackend(); EK.storage.load();
    EK.quiz._setRng(function () { return 0; });
    EK.quiz.start("choice", 3);
    var ci = correctIndex(EK.quiz.current());
    var r1 = EK.quiz.answer(ci);
    EKTest.assert(r1.correct === true, "respuesta correcta");
    EKTest.assertEqual(EK.quiz.score(), 1, "puntaje 1");
    EK.quiz.answer(ci); // segunda respuesta a la misma pregunta
    EKTest.assertEqual(EK.quiz.score(), 1, "no doble conteo");
    EK.quiz.next();
    var wrong = (correctIndex(EK.quiz.current()) + 1) % 4;
    EKTest.assert(EK.quiz.answer(wrong).correct === false, "respuesta incorrecta");
    EKTest.assertEqual(EK.quiz.score(), 1, "puntaje sigue 1");
  });

  EKTest.test("quiz.answer(write): acepta cualquier variante e ignora tildes", function () {
    EK.storage._backend = memBackend(); EK.storage.load();
    EK.quiz._setRng(function () { return 0; });
    EK.quiz.start("write", 3);
    var q = EK.quiz.current(); // alguna palabra; su word.es
    var variant = q.word.es[q.word.es.length - 1]; // última variante
    var r = EK.quiz.answer(variant.toUpperCase());
    EKTest.assert(r.correct === true, "acepta variante en mayúsculas");
  });

  EKTest.test("quiz.next/result: recorre y calcula porcentaje + bestQuiz", function () {
    EK.storage._backend = memBackend(); EK.storage.load();
    EK.quiz._setRng(function () { return 0; });
    EK.quiz.start("choice", 2);
    var ci0 = correctIndex(EK.quiz.current());
    EK.quiz.answer(ci0);
    EKTest.assert(EK.quiz.next() !== null, "hay segunda pregunta");
    EK.quiz.answer((correctIndex(EK.quiz.current()) + 1) % 4); // fallar la 2ª
    EKTest.assert(EK.quiz.next() === null, "no hay tercera; terminó");
    EKTest.assert(EK.quiz.isFinished() === true, "isFinished");
    var res = EK.quiz.result();
    EKTest.assertEqual(res.total, 2, "total 2");
    EKTest.assertEqual(res.score, 1, "1 acierto");
    EKTest.assertEqual(res.percent, 50, "50%");
    EKTest.assertEqual(EK.storage.get("stats.bestQuiz"), 50, "bestQuiz = 50");
  });
})();
