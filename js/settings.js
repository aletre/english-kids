// Configuración del usuario: tema, velocidad de voz, idioma. Persiste vía EK.storage.
window.EK = window.EK || {};

EK.settings = (function () {
  "use strict";

  var SPEEDS = { "muy-lenta": 0.4, "lenta": 0.7, "normal": 1.0 };

  function rateFor(speed) {
    return Object.prototype.hasOwnProperty.call(SPEEDS, speed) ? SPEEDS[speed] : 1.0;
  }

  function applyTheme(theme) {
    if (typeof document !== "undefined" && document.documentElement) {
      document.documentElement.setAttribute("data-theme", theme);
    }
  }

  function getTheme() { return EK.storage.get("settings.theme"); }
  function setTheme(theme) { EK.storage.set("settings.theme", theme); applyTheme(theme); }

  function getSpeed() { return EK.storage.get("settings.speed"); }
  function setSpeed(speed) { EK.storage.set("settings.speed", speed); }

  function getLang() { return EK.storage.get("settings.lang"); }
  function setLang(lang) { EK.storage.set("settings.lang", lang); }

  return {
    SPEEDS: SPEEDS,
    rateFor: rateFor,
    applyTheme: applyTheme,
    getTheme: getTheme, setTheme: setTheme,
    getSpeed: getSpeed, setSpeed: setSpeed,
    getLang: getLang, setLang: setLang
  };
})();
