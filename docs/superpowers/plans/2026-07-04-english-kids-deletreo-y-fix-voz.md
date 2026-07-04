# English Kids — Deletreo + arreglo de voz — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corregir el truncado de la pronunciación (empieza a la mitad) y añadir un botón para deletrear la palabra letra por letra en modo estudio.

**Architecture:** Se ajusta `EK.speech` (fix del `cancel()`+`speak()` con un retardo, y nuevos `spell`/`spellSequence`), se añade el botón 🔤 en `EK.ui.renderStudy`, y se sube la caché del service worker para refrescar la PWA. La lógica pura de extracción de letras (`spellSequence`) es testeable; el audio se verifica manualmente.

**Tech Stack:** JavaScript ES6 (scripts clásicos, `window.EK`), Web Speech API (SpeechSynthesis). Sin frameworks, sin build, sin npm.

## Global Constraints

- **Sin frameworks, sin Node, sin npm, sin build**. Abre con doble clic (file://) y como PWA en HTTPS.
- **NO usar import/export**: extender `window.EK`.
- Fix de truncado: tras `synth.cancel()`, ejecutar `synth.speak()` con retardo de **~90 ms** (`setTimeout`).
- Deletreo: solo letras `a–z` (ignora espacios/signos), velocidad **0.6**, una locución por letra (pausas naturales), voz/idioma configurados; no repite la palabra completa.
- Botón 🔤 (aria-label "Deletrear") en la tarjeta de estudio, junto a 🔊/🐢/⭐, reutilizando `.ek-icon-btn`.
- Subir la caché del service worker a `english-kids-v4` (sin cambios en `CORE`).
- `isSupported()` falso → `speak`/`spell` son no-op (no lanzan).
- Tests de navegador (`tests/tests.html`), verificados con shim de Node para la lógica pura.

## Interfaces existentes que se consumen

- `EK.speech` IIFE con `synth`, `isSupported()`, `pickVoice(preferredLang)`, `speak(text,opts)`, `speakSlow(text)`, `isRecognitionSupported()`; devuelve `{isSupported, speak, speakSlow, isRecognitionSupported}`.
- `EK.storage.get("settings.lang")`, `EK.ui.el`, `EK.ui.renderStudy`, `EK.study.current()`.

---

### Task 1: `speech.js` — fix de truncado + `spell`/`spellSequence`

**Files:**
- Modify: `js/speech.js`
- Create: `tests/speech.test.js`
- Modify: `tests/tests.html`

**Interfaces:**
- Produces:
  - `EK.speech.spellSequence(text)` → array de letras `a–z` (ignora lo demás).
  - `EK.speech.spell(text)` → void; encola una locución por letra (rate 0.6). No-op si no hay soporte o no hay letras.
  - `EK.speech.speak` ahora difiere `synth.speak` ~90 ms tras `cancel()`.

- [ ] **Step 1: Escribir la prueba que falla `tests/speech.test.js`**

```js
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
```

- [ ] **Step 2: Verificar que falla**

Abrir `tests/tests.html` (o shim de Node). Esperado: pruebas de speech en **rojo** (`EK.speech.spellSequence` no existe).

- [ ] **Step 3: Modificar `js/speech.js`**

3a. Reemplazar la función `speak` para diferir el `speak` tras `cancel()`:

```js
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
```

3b. Añadir, antes del `return`, las funciones `spellSequence` y `spell`:

```js
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
```

3c. Añadir `spell` y `spellSequence` al objeto devuelto. El `return` queda:

```js
  return {
    isSupported: isSupported,
    speak: speak,
    speakSlow: speakSlow,
    spell: spell,
    spellSequence: spellSequence,
    isRecognitionSupported: isRecognitionSupported
  };
```

- [ ] **Step 4: Añadir módulo y suite a `tests/tests.html`**

En la sección de módulos, después de `<script src="../js/words.js"></script>`, añadir (si no está ya):
```html
  <script src="../js/speech.js"></script>
```
En la sección de suites, después de `<script src="words.test.js"></script>`, añadir:
```html
  <script src="speech.test.js"></script>
```

- [ ] **Step 5: Verificar que pasan**

Recargar `tests/tests.html`, o shim de Node: sandbox con `window` global (SIN `speechSynthesis`, para forzar `isSupported()`=false) + `localStorage` en memoria; cargar `js/storage.js`, `js/words.js`, `js/speech.js`; ejecutar las 4 pruebas. Esperado: **verde** (incluye que `spell` no lanza sin soporte). También `node --check js/speech.js`.

- [ ] **Step 6: Commit**

```bash
git add js/speech.js tests/speech.test.js tests/tests.html
git commit -m "feat: spell-out helper and fix speech start-truncation"
```

---

### Task 2: botón 🔤 en la tarjeta de estudio + refresco de PWA

**Files:**
- Modify: `js/ui.js`
- Modify: `service-worker.js`

**Interfaces:**
- Consumes: `EK.speech.spell`, `EK.study.current`, `EK.ui.el`.

- [ ] **Step 1: Añadir el botón 🔤 en `renderStudy` (`js/ui.js`)**

En la función `renderStudy`, dentro del contenedor `.ek-study__controls`, insertar el botón de deletrear justo DESPUÉS del botón 🐢 (pronunciación lenta) y ANTES del botón ⭐. El bloque de controles queda:

```js
      el("div", { class: "ek-study__controls" }, [
        el("button", { class: "ek-icon-btn", "aria-label": "Pronunciar", onClick: function () { speakNormal(w.en); } }, ["🔊"]),
        el("button", { class: "ek-icon-btn", "aria-label": "Pronunciación lenta", onClick: function () { EK.speech.speakSlow(w.en); } }, ["🐢"]),
        el("button", { class: "ek-icon-btn", "aria-label": "Deletrear", onClick: function () { EK.speech.spell(w.en); } }, ["🔤"]),
        el("button", {
          class: "ek-icon-btn" + (fav ? " is-active" : ""), "aria-label": "Favorita",
          onClick: function () { EK.favorites.toggle(w.id); renderStudy(); }
        }, [fav ? "⭐" : "☆"])
      ])
```

- [ ] **Step 2: Subir la caché del service worker (`service-worker.js`)**

Cambiar la versión de caché para forzar el refresco de `speech.js`/`ui.js` en dispositivos ya instalados:
```js
var CACHE = "english-kids-v4";
```
(No cambiar `CORE`: no hay archivos nuevos.)

- [ ] **Step 3: Verificar sintaxis + smoke test**

- `node --check js/ui.js` y `node --check service-worker.js` (esperado: sin error).
- Smoke test bajo shim de Node (DOM funcional, como en fases anteriores; `window.speechSynthesis` undefined, y define `window.setTimeout = setTimeout`): cargar los 10 scripts en orden; `EK.app.init()`; `location.hash = "#study/2"` (airport); `EK.app.route()`; localizar en `#app` un botón con `aria-label="Deletrear"` y confirmar que existe; invocar su handler de click y confirmar que **no lanza** (spell es no-op sin soporte). Reportar PASS/FAIL.
- Confirmar que los botones 🔊/🐢/⭐ siguen presentes (no se rompió el bloque de controles).

- [ ] **Step 4: Verificación manual del usuario (pendiente)**

En el navegador: en modo estudio, el botón 🔤 deletrea la palabra letra por letra (lento), y 🔊/🐢 ya no cortan el inicio. (Requiere audio real; lo verifica el usuario en su dispositivo.)

- [ ] **Step 5: Commit**

```bash
git add js/ui.js service-worker.js
git commit -m "feat: spell button in study card; bump PWA cache to v4"
```

---

## Self-Review

**Cobertura del spec:**
- Fix de truncado (retardo tras cancel) → Task 1 Step 3a. ✅
- `spell` (letras, 0.6, una locución por letra, solo a-z, no repite palabra) → Task 1 Step 3b. ✅
- `spellSequence` testeable → Task 1 Step 1/3b. ✅
- Botón 🔤 en tarjeta de estudio, reutiliza `.ek-icon-btn` → Task 2 Step 1. ✅
- PWA refresco `english-kids-v4` → Task 2 Step 2. ✅
- No-op sin soporte → Task 1 (guardas `isSupported()`) + prueba. ✅

**Escaneo de placeholders:** sin TBD/TODO; todo con código o comando concreto. ✅

**Consistencia de tipos:** `EK.speech.spell(w.en)` usado en ui.js coincide con la firma definida; `spellSequence(text)`→array usado en `spell` y en pruebas; el `return` de speech.js expone ambas. ✅
