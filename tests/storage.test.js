(function () {
  "use strict";

  // Mock de localStorage en memoria para pruebas deterministas.
  function makeMemoryBackend() {
    var data = {};
    return {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
      setItem: function (k, v) { data[k] = String(v); },
      removeItem: function (k) { delete data[k]; }
    };
  }

  EKTest.test("storage: load() devuelve DEFAULTS cuando no hay nada guardado", function () {
    EK.storage._backend = makeMemoryBackend();
    var state = EK.storage.load();
    EKTest.assertEqual(state.settings.theme, "light", "theme por defecto debe ser light");
    EKTest.assertEqual(state.settings.lang, "en-US", "lang por defecto debe ser en-US");
    EKTest.assertDeepEqual(state.favorites, [], "favorites por defecto debe ser []");
  });

  EKTest.test("storage: set()/get() por path persiste y lee", function () {
    EK.storage._backend = makeMemoryBackend();
    EK.storage.load();
    EK.storage.set("settings.theme", "dark");
    EKTest.assertEqual(EK.storage.get("settings.theme"), "dark", "debe leer el valor asignado");
  });

  EKTest.test("storage: merge tolerante rellena claves faltantes", function () {
    var backend = makeMemoryBackend();
    backend.setItem("EK.state", JSON.stringify({ favorites: [13] })); // estado parcial/antiguo
    EK.storage._backend = backend;
    var state = EK.storage.load();
    EKTest.assertDeepEqual(state.favorites, [13], "conserva lo guardado");
    EKTest.assertEqual(state.settings.speed, "normal", "rellena settings.speed faltante");
  });
})();
