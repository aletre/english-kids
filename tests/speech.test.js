(function () {
  "use strict";

  EKTest.test("speech.spellSequence: extrae letras de una palabra", function () {
    EKTest.assertDeepEqual(EK.speech.spellSequence("airport"), ["a", "i", "r", "p", "o", "r", "t"], "airport");
  });

  EKTest.test("speech.spellSequence: ignora espacios (frase de dos palabras)", function () {
    EKTest.assertDeepEqual(
      EK.speech.spellSequence("sore throat"),
      ["s", "o", "r", "e", "t", "h", "r", "o", "a", "t"],
      "sin el espacio"
    );
  });

  EKTest.test("speech.spellSequence: cadena sin letras → []", function () {
    EKTest.assertDeepEqual(EK.speech.spellSequence("  -  "), [], "vacío");
  });

  EKTest.test("speech.spell: no lanza cuando no hay soporte de voz", function () {
    // En el shim de Node, window.speechSynthesis es undefined → isSupported() false.
    var threw = false;
    try { EK.speech.spell("airport"); } catch (e) { threw = true; }
    EKTest.assert(threw === false, "spell es no-op sin soporte");
  });
})();
