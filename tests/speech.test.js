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

  EKTest.test("speech.scorePronunciation: acierta si la transcripción contiene la palabra", function () {
    EKTest.assert(EK.speech.scorePronunciation("airport", "the airport") === true, "frase que contiene la palabra");
    EKTest.assert(EK.speech.scorePronunciation("Butterfly", "butterfly") === true, "ignora mayúsculas");
    EKTest.assert(EK.speech.scorePronunciation("brócoli", "brocoli") === true, "ignora tildes");
  });

  EKTest.test("speech.scorePronunciation: falla si no coincide o está vacío", function () {
    EKTest.assert(EK.speech.scorePronunciation("airport", "airplane") === false, "palabra distinta");
    EKTest.assert(EK.speech.scorePronunciation("airport", "") === false, "transcripción vacía");
  });

  EKTest.test("speech.recognize: no-op seguro sin soporte (llama onError)", function () {
    // En el shim de Node no existe SpeechRecognition → debe llamar onError y devolver null.
    var errMsg = null;
    var ret = EK.speech.recognize({ onError: function (e) { errMsg = e; } });
    EKTest.assert(ret === null, "devuelve null sin soporte");
    EKTest.assertEqual(errMsg, "unsupported", "onError('unsupported')");
  });
})();
