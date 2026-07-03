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

  EKTest.test("progress.markSeen: sin duplicados y persiste", function () {
    EK.storage._backend = memBackend();
    EK.storage.load();
    EK.progress.markSeen(13);
    EK.progress.markSeen(13);
    EK.progress.markSeen(7);
    EKTest.assertDeepEqual(EK.storage.get("seen"), [13, 7], "seen sin duplicados, en orden");
  });

  EKTest.test("progress.isSeen: refleja el estado", function () {
    EK.storage._backend = memBackend();
    EK.storage.load();
    EK.progress.markSeen(5);
    EKTest.assert(EK.progress.isSeen(5) === true, "5 visto");
    EKTest.assert(EK.progress.isSeen(6) === false, "6 no visto");
  });

  EKTest.test("progress.stats: cuenta y porcentaje", function () {
    EK.storage._backend = memBackend();
    EK.storage.load();
    EK.progress.markSeen(1);
    EK.progress.markSeen(2);
    var s = EK.progress.stats();
    EKTest.assertEqual(s.total, EK.words.length, "total = 112");
    EKTest.assertEqual(s.seen, 2, "2 vistas");
    EKTest.assertEqual(s.percent, Math.round(2 / EK.words.length * 100), "porcentaje correcto");
  });
})();
