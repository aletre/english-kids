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

  EKTest.test("settings.rateFor: mapea velocidades y default 1.0", function () {
    EKTest.assertEqual(EK.settings.rateFor("normal"), 1.0, "normal → 1.0");
    EKTest.assertEqual(EK.settings.rateFor("lenta"), 0.7, "lenta → 0.7");
    EKTest.assertEqual(EK.settings.rateFor("muy-lenta"), 0.4, "muy-lenta → 0.4");
    EKTest.assertEqual(EK.settings.rateFor("desconocida"), 1.0, "desconocida → 1.0");
  });

  EKTest.test("settings.get/set: persisten en storage", function () {
    EK.storage._backend = memBackend();
    EK.storage.load();
    EK.settings.setSpeed("lenta");
    EK.settings.setLang("en-GB");
    EKTest.assertEqual(EK.settings.getSpeed(), "lenta", "getSpeed refleja lo guardado");
    EKTest.assertEqual(EK.settings.getLang(), "en-GB", "getLang refleja lo guardado");
    EKTest.assertEqual(EK.storage.get("settings.speed"), "lenta", "storage tiene la velocidad");
  });

  EKTest.test("settings.setTheme + applyTheme: escribe data-theme", function () {
    EK.storage._backend = memBackend();
    EK.storage.load();
    EK.settings.setTheme("dark");
    EKTest.assertEqual(EK.settings.getTheme(), "dark", "getTheme = dark");
    EKTest.assertEqual(document.documentElement.getAttribute("data-theme"), "dark", "data-theme aplicado");
    EK.settings.setTheme("light"); // restaurar para no afectar otras suites
  });
})();
