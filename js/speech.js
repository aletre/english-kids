// Pronunciación con Web Speech API. Voz preferida en-US, fallback en-GB.
window.EK = window.EK || {};

EK.speech = (function () {
  "use strict";

  var synth = window.speechSynthesis || null;

  function isSupported() {
    return !!synth && typeof window.SpeechSynthesisUtterance === "function";
  }

  // Elige la mejor voz inglesa disponible según el idioma preferido.
  function pickVoice(preferredLang) {
    if (!isSupported()) return null;
    var voices = synth.getVoices() || [];
    var exact = voices.filter(function (v) { return v.lang === preferredLang; })[0];
    if (exact) return exact;
    var usAny = voices.filter(function (v) { return v.lang && v.lang.indexOf("en-US") === 0; })[0];
    if (usAny) return usAny;
    var gbAny = voices.filter(function (v) { return v.lang && v.lang.indexOf("en-GB") === 0; })[0];
    if (gbAny) return gbAny;
    var enAny = voices.filter(function (v) { return v.lang && v.lang.indexOf("en") === 0; })[0];
    return enAny || null;
  }

  function speak(text, opts) {
    if (!isSupported()) return;
    opts = opts || {};
    var preferredLang = (EK.storage && EK.storage.get("settings.lang")) || "en-US";
    var u = new window.SpeechSynthesisUtterance(String(text));
    var voice = pickVoice(preferredLang);
    if (voice) { u.voice = voice; u.lang = voice.lang; }
    else { u.lang = preferredLang; }
    u.rate = typeof opts.rate === "number" ? opts.rate : 1;
    synth.cancel(); // evita solapes
    synth.speak(u);
  }

  function speakSlow(text) {
    speak(text, { rate: 0.55 });
  }

  function isRecognitionSupported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  return {
    isSupported: isSupported,
    speak: speak,
    speakSlow: speakSlow,
    isRecognitionSupported: isRecognitionSupported
  };
})();
