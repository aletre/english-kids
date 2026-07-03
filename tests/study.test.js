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

  EKTest.test("study.start: arranca en el id dado y marca visto + lastWordId", function () {
    EK.storage._backend = memBackend();
    EK.storage.load();
    EK.study.start(EK.words, 13);
    EKTest.assertEqual(EK.study.current().id, 13, "arranca en 13");
    EKTest.assert(EK.progress.isSeen(13) === true, "13 marcado visto");
    EKTest.assertEqual(EK.storage.get("lastWordId"), 13, "lastWordId guardado");
    EKTest.assertEqual(EK.study.total(), 112, "total = 112");
  });

  EKTest.test("study.next/prev: navegan y se detienen en los extremos", function () {
    EK.storage._backend = memBackend();
    EK.storage.load();
    EK.study.start(EK.words, EK.words[0].id); // índice 0
    EKTest.assertEqual(EK.study.index(), 0, "empieza en 0");
    EK.study.prev();
    EKTest.assertEqual(EK.study.index(), 0, "prev en el primero se queda en 0");
    EK.study.next();
    EKTest.assertEqual(EK.study.index(), 1, "next avanza a 1");
    EKTest.assertEqual(EK.study.current().id, EK.words[1].id, "current coincide con la lista");
  });

  EKTest.test("study.goToId: salta y marca visto", function () {
    EK.storage._backend = memBackend();
    EK.storage.load();
    EK.study.start(EK.words, EK.words[0].id);
    EK.study.goToId(50);
    EKTest.assertEqual(EK.study.current().id, 50, "saltó a 50");
    EKTest.assert(EK.progress.isSeen(50) === true, "50 marcado visto");
  });
})();
