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
    synth.cancel();
    // Retardo tras cancel(): evita que Chrome/Safari corten el inicio de la palabra.
    setTimeout(function () { synth.speak(u); }, 90);
  }

  function speakSlow(text) {
    speak(text, { rate: 0.55 });
  }

  function isRecognitionSupported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  // Letras a deletrear (solo a-z, ignora espacios/signos).
  function spellSequence(text) {
    return String(text).split("").filter(function (ch) { return /[a-zA-Z]/.test(ch); });
  }

  // Deletrea la palabra: una locución por letra, lenta, con pausas naturales.
  function spell(text) {
    if (!isSupported()) return;
    var letters = spellSequence(text);
    if (!letters.length) return;
    var preferredLang = (EK.storage && EK.storage.get("settings.lang")) || "en-US";
    var voice = pickVoice(preferredLang);
    synth.cancel();
    setTimeout(function () {
      letters.forEach(function (ch) {
        var u = new window.SpeechSynthesisUtterance(ch);
        if (voice) { u.voice = voice; u.lang = voice.lang; }
        else { u.lang = preferredLang; }
        u.rate = 0.6;
        synth.speak(u); // se encolan → pausa natural entre letras
      });
    }, 90);
  }

  // Compara lo reconocido con la palabra objetivo (texto-a-texto, sin tildes/mayúsculas).
  function scorePronunciation(target, transcript) {
    var t = EK.wordUtils.normalize(target);
    var s = EK.wordUtils.normalize(transcript);
    if (t === "" || s === "") return false;
    return s.indexOf(t) !== -1;
  }

  // Reconocimiento de voz (Web Speech API). No-op seguro si el navegador no lo soporta.
  function recognize(opts) {
    opts = opts || {};
    var Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Rec) { if (opts.onError) opts.onError("unsupported"); return null; }
    var rec = new Rec();
    rec.lang = opts.lang || (EK.storage && EK.storage.get("settings.lang")) || "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = function (e) {
      var transcript = e.results[0][0].transcript;
      if (opts.onResult) opts.onResult(transcript);
    };
    rec.onerror = function (e) { if (opts.onError) opts.onError((e && e.error) || "error"); };
    rec.onend = function () { if (opts.onEnd) opts.onEnd(); };
    try { rec.start(); } catch (err) { if (opts.onError) opts.onError("start-failed"); }
    return rec;
  }

  return {
    isSupported: isSupported,
    speak: speak,
    speakSlow: speakSlow,
    spell: spell,
    spellSequence: spellSequence,
    isRecognitionSupported: isRecognitionSupported,
    scorePronunciation: scorePronunciation,
    recognize: recognize
  };
})();
