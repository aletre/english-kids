(function () {
  "use strict";

  EKTest.test("ui.badge: usa emoji cuando existe", function () {
    var b = EK.ui.badge({ id: 13, en: "butterfly", es: ["mariposa"], emoji: "🦋", category: "animals" });
    EKTest.assertEqual(b.type, "emoji", "tipo emoji");
    EKTest.assertEqual(b.value, "🦋", "valor emoji");
  });

  EKTest.test("ui.badge: usa inicial estilizada cuando no hay emoji", function () {
    var b = EK.ui.badge({ id: 1, en: "absence", es: ["ausencia"], emoji: null, category: "abstract" });
    EKTest.assertEqual(b.type, "initial", "tipo inicial");
    EKTest.assertEqual(b.value, "A", "inicial en mayúscula");
    EKTest.assert(typeof b.color === "string" && b.color.charAt(0) === "#", "color hex");
  });

  EKTest.test("ui.colorForCategory: determinista", function () {
    EKTest.assertEqual(
      EK.ui.colorForCategory("animals"),
      EK.ui.colorForCategory("animals"),
      "misma categoría → mismo color"
    );
  });
})();
