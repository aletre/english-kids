(function () {
  "use strict";

  EKTest.test("words: hay exactamente 112 palabras", function () {
    EKTest.assertEqual(EK.words.length, 112, "deben ser 112 palabras");
  });

  EKTest.test("words: cada palabra tiene forma válida", function () {
    EK.words.forEach(function (w) {
      EKTest.assert(typeof w.id === "number", "id numérico en " + w.en);
      EKTest.assert(typeof w.en === "string" && w.en.length > 0, "en no vacío");
      EKTest.assert(Array.isArray(w.es) && w.es.length >= 1, "es es array no vacío en " + w.en);
      EKTest.assert(w.emoji === null || typeof w.emoji === "string", "emoji string o null en " + w.en);
      EKTest.assert(typeof w.category === "string" && w.category.length > 0, "category en " + w.en);
    });
  });

  EKTest.test("words: los ids son únicos", function () {
    var seen = {};
    EK.words.forEach(function (w) {
      EKTest.assert(!seen[w.id], "id duplicado: " + w.id);
      seen[w.id] = true;
    });
  });

  EKTest.test("words: basketball normalizado a ['baloncesto']", function () {
    var w = EK.words.filter(function (x) { return x.en === "basketball"; })[0];
    EKTest.assertDeepEqual(w.es, ["baloncesto"], "basketball sin duplicado");
  });

  EKTest.test("wordUtils.normalize: minúsculas y sin tildes", function () {
    EKTest.assertEqual(EK.wordUtils.normalize("  Brócoli "), "brocoli", "normaliza tildes y espacios");
  });

  EKTest.test("wordUtils.search: busca en inglés y español", function () {
    var byEn = EK.wordUtils.search("butter");
    EKTest.assert(byEn.some(function (w) { return w.en === "butterfly"; }), "encuentra butterfly por inglés");
    var byEs = EK.wordUtils.search("maripo");
    EKTest.assert(byEs.some(function (w) { return w.en === "butterfly"; }), "encuentra butterfly por español");
  });

  EKTest.test("wordUtils.matchesAnswer: acepta cualquier variante e ignora tildes", function () {
    var grumpy = EK.wordUtils.byId(43);
    EKTest.assert(EK.wordUtils.matchesAnswer(grumpy, "gruñon"), "acepta 'gruñon' sin tilde");
    EKTest.assert(EK.wordUtils.matchesAnswer(grumpy, "MALHUMORADO"), "acepta la segunda variante");
    EKTest.assert(!EK.wordUtils.matchesAnswer(grumpy, "feliz"), "rechaza incorrecta");
  });
})();
