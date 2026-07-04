# English Kids — Fase 5: Sprint 5 (Reconocimiento de voz) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir práctica de pronunciación: el niño pronuncia la palabra y la app la evalúa (comparación texto-a-texto), como función **opcional** que solo aparece donde el navegador soporta reconocimiento de voz.

**Architecture:** Se amplía `EK.speech` con una función pura y testeable `scorePronunciation(target, transcript)` (compara lo reconocido con la palabra usando `EK.wordUtils.normalize`) y un envoltorio `recognize(opts)` sobre la Web Speech API (solo navegador). En la tarjeta de estudio (`EK.ui.renderStudy`) se añade un botón 🎤 condicional a `EK.speech.isRecognitionSupported()`, con un texto de estado que muestra el resultado. Se sube la caché del service worker.

**Tech Stack:** JavaScript ES6 (scripts clásicos, `window.EK`), Web Speech API (`SpeechRecognition`/`webkitSpeechRecognition`). Sin frameworks, sin build, sin npm.

## Global Constraints

- **Sin frameworks, sin Node, sin npm, sin build**. Abre con doble clic (file://) y como PWA en HTTPS.
- **NO usar import/export**: extender `window.EK`.
- Reconocimiento **opcional**: el botón 🎤 solo se muestra si `EK.speech.isRecognitionSupported()` es `true`. Donde no (ej. iPad/Safari), no aparece nada roto ni un botón muerto.
- Evaluación **texto-a-texto**: se compara la transcripción con la palabra en inglés, ignorando mayúsculas/tildes; acierto si la transcripción contiene la palabra objetivo. No evalúa acento real.
- Preferir el idioma configurado (`settings.lang`, default `en-US`) para el reconocimiento.
- Reutilizar clases CSS existentes; añadir solo una clase para el texto de estado.
- Subir la caché del service worker a `english-kids-v8` (sin cambios en `CORE`: no hay archivos nuevos).
- `isRecognitionSupported()` falso → `recognize` es no-op seguro (llama `onError("unsupported")`, no lanza).
- Tests de navegador (`tests/tests.html`); la lógica pura (`scorePronunciation`) se verifica con shim de Node. El reconocimiento en vivo se verifica manualmente en el navegador.

## Interfaces existentes que se consumen

- `EK.speech` IIFE con `isSupported`, `speak`, `speakSlow`, `spell`, `spellSequence`, `isRecognitionSupported`; ya detecta `window.SpeechRecognition || window.webkitSpeechRecognition`.
- `EK.wordUtils.normalize(str)`; `EK.storage.get("settings.lang")`.
- `EK.ui.el`, `EK.ui.renderStudy`, `EK.study.current()`.

---

### Task 1: `speech.js` — `scorePronunciation` + `recognize`

**Files:**
- Modify: `js/speech.js`
- Modify: `tests/speech.test.js`

**Interfaces:**
- Consumes: `EK.wordUtils.normalize`, `EK.storage.get`, `window.SpeechRecognition`/`webkitSpeechRecognition`.
- Produces:
  - `EK.speech.scorePronunciation(target, transcript)` → boolean (acierto si la transcripción normalizada contiene la palabra objetivo normalizada; `false` si alguna está vacía).
  - `EK.speech.recognize(opts)` → objeto de reconocimiento o `null`; `opts = { lang?, onResult(transcript), onError(err), onEnd() }`. No-op seguro si no hay soporte (llama `onError("unsupported")`).

- [ ] **Step 1: Añadir pruebas de `scorePronunciation` y `recognize` (sin soporte) a `tests/speech.test.js`**

Añadir estos casos al final del IIFE de `tests/speech.test.js` (antes del cierre `})();`):

```js
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
```

- [ ] **Step 2: Verificar que fallan**

Abrir `tests/tests.html` (o shim de Node). Esperado: los 3 nuevos casos de speech en **rojo** (`scorePronunciation`/`recognize` no existen).

- [ ] **Step 3: Añadir `scorePronunciation` y `recognize` a `js/speech.js`**

Insertar estas dos funciones ANTES del `return` del IIFE de `EK.speech`:

```js
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
```

Y añadir ambas al objeto devuelto. El `return` de `EK.speech` queda:

```js
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
```

- [ ] **Step 4: Verificar que pasan**

Recargar `tests/tests.html`, o shim de Node: sandbox con `window` global (SIN `SpeechRecognition`) + `localStorage` en memoria; cargar `js/storage.js`, `js/words.js`, `js/speech.js`; ejecutar la suite de speech (incluyendo los 3 nuevos). Esperado: **verde** (recognize devuelve null y llama `onError("unsupported")`). También `node --check js/speech.js`.

- [ ] **Step 5: Commit**

```bash
git add js/speech.js tests/speech.test.js
git commit -m "feat: pronunciation scoring and speech recognition wrapper"
```

---

### Task 2: `ui.js` — botón 🎤 en la tarjeta de estudio (condicional) + CSS + refresco PWA

**Files:**
- Modify: `js/ui.js`
- Modify: `css/styles.css`
- Modify: `service-worker.js`

**Interfaces:**
- Consumes: `EK.speech.isRecognitionSupported`, `EK.speech.recognize`, `EK.speech.scorePronunciation`, `EK.study.current`, `EK.ui.el`.

- [ ] **Step 1: Añadir el botón 🎤 y el estado en `renderStudy` (`js/ui.js`)**

En `renderStudy`, dentro del contenedor `.ek-study__controls`, añadir el botón de micrófono DESPUÉS del botón 🔤 (deletrear) y ANTES del botón ⭐, **solo si hay soporte**. Para insertarlo condicionalmente, construye el arreglo de controles con los botones fijos y añade el de micrófono con `filter(Boolean)`. Reemplaza el bloque de controles por:

```js
      el("div", { class: "ek-study__controls" }, [
        el("button", { class: "ek-icon-btn", "aria-label": "Pronunciar", onClick: function () { speakNormal(w.en); } }, ["🔊"]),
        el("button", { class: "ek-icon-btn", "aria-label": "Pronunciación lenta", onClick: function () { EK.speech.speakSlow(w.en); } }, ["🐢"]),
        el("button", { class: "ek-icon-btn", "aria-label": "Deletrear", onClick: function () { EK.speech.spell(w.en); } }, ["🔤"]),
        EK.speech.isRecognitionSupported()
          ? el("button", { class: "ek-icon-btn", "aria-label": "Pronuncia tú", onClick: function () { onSpeechPractice(w); } }, ["🎤"])
          : null,
        el("button", {
          class: "ek-icon-btn" + (fav ? " is-active" : ""), "aria-label": "Favorita",
          onClick: function () { EK.favorites.toggle(w.id); renderStudy(); }
        }, [fav ? "⭐" : "☆"])
      ].filter(Boolean))
```

Y añadir, DESPUÉS del `card` (dentro del arreglo de hijos del `.ek-view`, entre `card` y `nav`), un párrafo de estado del micrófono solo si hay soporte. Localiza la línea que arma la vista de estudio:
```js
    r.appendChild(el("div", { class: "ek-view" }, [back, card, nav]));
```
y reemplázala por:
```js
    var micStatus = EK.speech.isRecognitionSupported()
      ? el("p", { class: "ek-mic-status", id: "ek-mic-status", text: "" })
      : null;
    r.appendChild(el("div", { class: "ek-view" }, [back, card, micStatus, nav].filter(Boolean)));
```

- [ ] **Step 2: Añadir el manejador `onSpeechPractice` dentro del IIFE de `js/ui.js`**

Insertar esta función cerca de `speakNormal` (antes de `renderStudy`):

```js
  // Práctica de pronunciación: escucha al niño y compara con la palabra.
  function onSpeechPractice(w) {
    var statusEl = document.getElementById("ek-mic-status");
    if (statusEl) statusEl.textContent = "🎤 Escuchando…";
    EK.speech.recognize({
      onResult: function (transcript) {
        var okp = EK.speech.scorePronunciation(w.en, transcript);
        if (statusEl) statusEl.textContent = (okp ? "✅ ¡Muy bien! " : "❌ Escuché: ") + transcript;
      },
      onError: function () {
        if (statusEl) statusEl.textContent = "No te escuché, intenta de nuevo.";
      }
    });
  }
```

- [ ] **Step 3: Añadir estilo del estado a `css/styles.css`**

Añadir al FINAL de `css/styles.css`:
```css
/* ===== Fase 5: práctica de pronunciación ===== */
.ek-mic-status { text-align: center; font-weight: 800; color: var(--text-muted); min-height: 1.4em; }
```

- [ ] **Step 4: Subir la caché del service worker (`service-worker.js`)**

Cambiar la versión para refrescar `speech.js`/`ui.js` en dispositivos instalados:
```js
var CACHE = "english-kids-v8";
```
(No cambiar `CORE`: no hay archivos nuevos.)

- [ ] **Step 5: Verificar sintaxis + smoke test**

- `node --check js/ui.js` y `node --check service-worker.js`.
- Confirmar llaves balanceadas en `css/styles.css`.
- Smoke test bajo shim de Node (DOM funcional como en fases previas; `window` SIN `SpeechRecognition` ni `webkitSpeechRecognition`; `speechSynthesis` undefined; `localStorage` en memoria; `setTimeout/setInterval/clearInterval` definidos): cargar los 13 scripts; `EK.app.init()`; `location.hash = "#study/2"`; `EK.app.route()`. Como NO hay soporte de reconocimiento, verificar que **NO** existe ningún botón con `aria-label="Pronuncia tú"` ni nodo `#ek-mic-status` (el botón 🎤 se oculta correctamente), y que los botones 🔊/🐢/🔤/⭐ siguen presentes. Reportar PASS/FAIL.
  - (Opcional) Repetir el smoke definiendo `window.webkitSpeechRecognition = function(){ return { start:function(){}, }; }` antes de cargar los scripts, y verificar que SÍ aparece el botón `aria-label="Pronuncia tú"` y el nodo `#ek-mic-status`. Reportar PASS/FAIL.

- [ ] **Step 6: Verificación manual del usuario (pendiente)**

En un navegador con soporte (Chrome/Edge de escritorio o Android): en modo estudio aparece 🎤; al tocarlo pide permiso de micrófono, muestra "🎤 Escuchando…", y tras hablar muestra "✅ ¡Muy bien!" si la palabra coincide o "❌ Escuché: …". En iPad/Safari el botón 🎤 no aparece (correcto). Requiere HTTPS (la PWA en GitHub Pages) y micrófono.

- [ ] **Step 7: Commit**

```bash
git add js/ui.js css/styles.css service-worker.js
git commit -m "feat: optional speech-practice mic button in study card; PWA cache v8"
```

---

## Self-Review

**Cobertura del spec (Sprint 5):**
- Reconocimiento de voz, el niño pronuncia → botón 🎤 + `recognize` (Tasks 1-2). ✅
- La app evalúa la pronunciación → `scorePronunciation` texto-a-texto (Task 1) + feedback en UI (Task 2). ✅
- Usa `SpeechRecognition` si el navegador lo soporta; opcional con detección → botón condicional a `isRecognitionSupported()`, `recognize` no-op sin soporte (Tasks 1-2). ✅
- No rompe iPad/Safari → el botón y el estado solo se renderizan con soporte (Task 2). ✅
- PWA offline refrescada → `english-kids-v8` (Task 2). ✅

Con esta fase quedan implementados los 7 sprints del spec. (Sprint 4 imágenes ya cubierto por emojis.)

**Escaneo de placeholders:** sin TBD/TODO; cada paso trae código o comando concreto. ✅

**Consistencia de tipos:** `EK.speech.scorePronunciation(target, transcript)`→boolean usado por `onSpeechPractice`; `EK.speech.recognize({onResult,onError})` usado por `onSpeechPractice`; `isRecognitionSupported()` gobierna tanto el botón como el `#ek-mic-status`; se reutiliza `EK.wordUtils.normalize`. El `filter(Boolean)` permite insertar el botón/estado condicionalmente sin romper el arreglo de hijos. ✅
