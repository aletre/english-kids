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

  EKTest.test("favorites.toggle: agrega y quita, devuelve estado", function () {
    EK.storage._backend = memBackend();
    EK.storage.load();
    EKTest.assertEqual(EK.favorites.toggle(13), true, "primer toggle marca");
    EKTest.assert(EK.favorites.isFavorite(13) === true, "queda favorita");
    EKTest.assertEqual(EK.favorites.toggle(13), false, "segundo toggle desmarca");
    EKTest.assert(EK.favorites.isFavorite(13) === false, "ya no es favorita");
  });

  EKTest.test("favorites.list: devuelve objetos palabra en orden e ignora ids inválidos", function () {
    EK.storage._backend = memBackend();
    EK.storage.load();
    EK.favorites.toggle(13); // butterfly
    EK.favorites.toggle(5);  // basketball
    EK.storage.set("favorites", [13, 99999, 5]); // 99999 no existe
    var list = EK.favorites.list();
    EKTest.assertEqual(list.length, 2, "ignora id inexistente");
    EKTest.assertEqual(list[0].en, "butterfly", "orden preservado (13 primero)");
    EKTest.assertEqual(list[1].en, "basketball", "5 después");
  });
})();
