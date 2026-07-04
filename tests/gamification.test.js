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

  EKTest.test("gamification.levelForXp: 100 XP por nivel", function () {
    EKTest.assertEqual(EK.gamification.levelForXp(0), 1, "0 → nivel 1");
    EKTest.assertEqual(EK.gamification.levelForXp(99), 1, "99 → nivel 1");
    EKTest.assertEqual(EK.gamification.levelForXp(100), 2, "100 → nivel 2");
    EKTest.assertEqual(EK.gamification.levelForXp(250), 3, "250 → nivel 3");
  });

  EKTest.test("gamification.currentStreak: días consecutivos terminando hoy", function () {
    EKTest.assertEqual(
      EK.gamification.currentStreak(["2026-07-02", "2026-07-03", "2026-07-04"], "2026-07-04"), 3, "3 seguidos");
    EKTest.assertEqual(
      EK.gamification.currentStreak(["2026-07-01", "2026-07-04"], "2026-07-04"), 1, "con hueco → 1");
    EKTest.assertEqual(EK.gamification.currentStreak([], "2026-07-04"), 0, "vacío → 0");
    EKTest.assertEqual(
      EK.gamification.currentStreak(["2026-07-02", "2026-07-03"], "2026-07-04"), 0, "hoy ausente → 0");
  });

  EKTest.test("gamification.recordToday: agrega día (sin duplicar) y devuelve racha", function () {
    EK.storage._backend = memBackend(); EK.storage.load();
    EK.storage.set("stats.studyDays", ["2026-07-02", "2026-07-03"]);
    var streak = EK.gamification.recordToday("2026-07-04");
    EKTest.assertEqual(streak, 3, "racha 3");
    EKTest.assertDeepEqual(EK.storage.get("stats.studyDays"), ["2026-07-02", "2026-07-03", "2026-07-04"], "día agregado");
    EK.gamification.recordToday("2026-07-04"); // idempotente
    EKTest.assertEqual(EK.storage.get("stats.studyDays").length, 3, "sin duplicar");
  });

  EKTest.test("gamification.summary: XP = vistas×10 + mejor examen", function () {
    EK.storage._backend = memBackend(); EK.storage.load();
    EK.storage.set("seen", [1, 2, 3]);
    EK.storage.set("stats.bestQuiz", 50);
    var s = EK.gamification.summary();
    EKTest.assertEqual(s.xp, 80, "3×10 + 50 = 80");
    EKTest.assertEqual(s.level, 1, "nivel 1");
    EKTest.assertEqual(s.seen, 3, "3 vistas");
    EKTest.assertEqual(s.percent, 80, "80% del nivel");
  });

  EKTest.test("gamification.achievements: desbloqueo por umbrales", function () {
    EK.storage._backend = memBackend(); EK.storage.load();
    var seen = [];
    for (var i = 1; i <= 30; i++) seen.push(i);
    EK.storage.set("seen", seen);
    EK.storage.set("stats.bestQuiz", 100);
    var a = EK.gamification.achievements();
    function byId(id) { return a.filter(function (x) { return x.id === id; })[0]; }
    EKTest.assert(byId("w25").unlocked === true, "25 palabras desbloqueado");
    EKTest.assert(byId("w50").unlocked === false, "50 palabras bloqueado");
    EKTest.assert(byId("quiz100").unlocked === true, "examen perfecto desbloqueado");
  });
})();
