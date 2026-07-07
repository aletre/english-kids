# English Kids — Spelling Bee — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir la modalidad "Spelling Bee" al Examen: la app pronuncia la palabra y el niño escribe su deletreo exacto en inglés, con la traducción como pista.

**Architecture:** Se amplía el motor `EK.quiz` con el modo `"spell"` (sin opciones; corrección por comparación exacta con `word.en` normalizado) y la vista `EK.ui.renderQuizQuestion` con una rama `spell` (estímulo = audio + pista en español, cuerpo = campo de texto), reutilizando el patrón del modo "escribir". El ruteo `#quiz/spell` ya está soportado por `EK.app` (usa `EK.quiz.start(seg)`).

**Tech Stack:** JavaScript ES6 (scripts clásicos, `window.EK`), Web Speech API. Sin frameworks, sin build, sin npm.

## Global Constraints

- **Sin frameworks, sin Node, sin npm, sin build**. Abre con doble clic (file://) y como PWA en HTTPS.
- **NO usar import/export**: extender `window.EK`.
- Estímulo inglés (audio) → respuesta = deletreo en inglés. Pista = traducción en español (`word.es`), NO se muestra `word.en`.
- Ayudas de audio: 🔊 Repetir y 🐢 Repetir lento; reproducción automática al mostrar la pregunta. (Sin deletreo en voz alta.)
- Validación: `EK.wordUtils.normalize(input) === EK.wordUtils.normalize(word.en)` (deletreo exacto, insensible a mayúsculas/espacios; no acepta variantes en español).
- Feedback: correcto → "¡Correcto! 🎉"; incorrecto → "Respuesta: " + `word.en`.
- Sesión de ~10 palabras, puntaje y resultado (actualiza `stats.bestQuiz`), como los demás modos.
- Reutilizar clases/tokens CSS; una sola clase nueva (`.ek-quiz__spell-cue`) para centrar el estímulo.
- Subir la caché del service worker a `english-kids-v10`.
- Tests de navegador (`tests/tests.html`), lógica verificada con shim de Node.

## Interfaces existentes que se consumen

- `EK.quiz`: `MODES`, `start(mode,size)`, `current()`, `answer(value)`→`{correct,expected}`, `next()`, `index()`, `total()`, `score()`, `mode()`, `result()`; `makeQuestion` interno (choice/listen llevan `options`, write no).
- `EK.wordUtils.normalize`; `EK.speech.speakNormal`(vía helper `speakNormal` de ui.js), `EK.speech.speakSlow`.
- `EK.ui.el`, helpers internos `speakNormal`, `_quizFb`, `renderQuizQuestion`, `renderQuizMenu`, `advanceQuiz`, `quizHeader`.

---

### Task 1: `quiz.js` — modo `spell` en el motor

**Files:**
- Modify: `js/quiz.js`
- Modify: `tests/quiz.test.js`

**Interfaces:**
- Produces: `EK.quiz.MODES` incluye `"spell"`; una pregunta en modo spell tiene `{mode:"spell", word, prompt:word.en}` sin `options`; `answer(value)` en modo spell compara `normalize(value)===normalize(word.en)`.

- [ ] **Step 1: Añadir pruebas del modo spell a `tests/quiz.test.js`**

Añadir estos casos al final del IIFE de `tests/quiz.test.js` (antes del cierre `})();`). Reutiliza el helper `memBackend()` ya definido en ese archivo:

```js
  EKTest.test("quiz spell: MODES incluye 'spell' y la pregunta no tiene opciones", function () {
    EK.storage._backend = memBackend(); EK.storage.load();
    EKTest.assert(EK.quiz.MODES.indexOf("spell") !== -1, "MODES incluye spell");
    EK.quiz._setRng(function () { return 0; });
    EK.quiz.start("spell", 4);
    var q = EK.quiz.current();
    EKTest.assert(!q.options, "la pregunta spell no lleva opciones");
    EKTest.assert(typeof q.word.en === "string" && q.word.en.length > 0, "tiene word.en");
  });

  EKTest.test("quiz spell: valida el deletreo exacto en inglés", function () {
    EK.storage._backend = memBackend(); EK.storage.load();
    EK.quiz._setRng(function () { return 0; });
    EK.quiz.start("spell", 4);
    var q1 = EK.quiz.current();
    EKTest.assert(EK.quiz.answer(q1.word.en.toUpperCase()).correct === true, "acepta mayúsculas (deletreo correcto)");
    EK.quiz.next();
    var q2 = EK.quiz.current();
    EKTest.assert(EK.quiz.answer(q2.word.es[0]).correct === false, "rechaza la traducción en español");
    EK.quiz.next();
    var q3 = EK.quiz.current();
    EKTest.assert(EK.quiz.answer("xxwrongxx").correct === false, "rechaza mal escrito");
  });
```

- [ ] **Step 2: Verificar que fallan**

Abrir `tests/tests.html` (o shim de Node). Esperado: los 2 nuevos casos en **rojo** (`"spell"` no está en `MODES` y `answer` lo trata como opción → `q.options[value]` es `undefined` → siempre `false`, y el primer caso falla al no encontrar `spell`).

- [ ] **Step 3: Modificar `js/quiz.js`**

3a. Añadir `"spell"` a `MODES`:
```js
  var MODES = ["choice", "write", "listen", "spell"];
```

3b. En `answer`, añadir la rama de spell. Reemplazar el bloque:
```js
    if (q.mode === "write") {
      correct = EK.wordUtils.matchesAnswer(q.word, String(value));
    } else {
      correct = !!(q.options[value] && q.options[value].correct);
    }
```
por:
```js
    if (q.mode === "write") {
      correct = EK.wordUtils.matchesAnswer(q.word, String(value));
    } else if (q.mode === "spell") {
      correct = EK.wordUtils.normalize(String(value)) === EK.wordUtils.normalize(q.word.en);
    } else {
      correct = !!(q.options[value] && q.options[value].correct);
    }
```

(`makeQuestion` no cambia: solo `choice`/`listen` reciben `options`, así que las preguntas de `spell` quedan sin opciones, igual que `write`.)

- [ ] **Step 4: Verificar que pasan**

Recargar `tests/tests.html`, o shim de Node: sandbox con `window` global + `localStorage` en memoria; cargar `js/storage.js`, `js/words.js`, `js/quiz.js`; ejecutar la suite de quiz (incluyendo los 2 nuevos). Esperado: **verde**. También `node --check js/quiz.js`.

- [ ] **Step 5: Commit**

```bash
git add js/quiz.js tests/quiz.test.js
git commit -m "feat: spelling-bee mode in quiz engine (exact English spelling)"
```

---

### Task 2: `ui.js` — vista Spelling Bee + botón en el menú + CSS + refresco PWA

**Files:**
- Modify: `js/ui.js`
- Modify: `css/styles.css`
- Modify: `service-worker.js`

**Interfaces:**
- Consumes: `EK.quiz.*`, `EK.speech.speakSlow`, helper `speakNormal`, `_quizFb`.
- Produces: botón "Spelling Bee" en `renderQuizMenu`; rama `spell` en `renderQuizQuestion` (estímulo audio + pista español; cuerpo campo de texto; feedback con `word.en`).

- [ ] **Step 1: Añadir el botón "Spelling Bee" en `renderQuizMenu` (`js/ui.js`)**

Reemplazar el bloque de botones del menú (dentro de `.ek-actions`):
```js
      el("div", { class: "ek-actions" }, [
        el("button", { class: "ek-btn", onClick: function () { go("#quiz/choice"); } }, ["Opción múltiple"]),
        el("button", { class: "ek-btn ek-btn--blue", onClick: function () { go("#quiz/write"); } }, ["Escribir"]),
        el("button", { class: "ek-btn ek-btn--muted", onClick: function () { go("#quiz/listen"); } }, ["Escuchar"])
      ])
```
por (añade Spelling Bee):
```js
      el("div", { class: "ek-actions" }, [
        el("button", { class: "ek-btn", onClick: function () { go("#quiz/choice"); } }, ["Opción múltiple"]),
        el("button", { class: "ek-btn ek-btn--blue", onClick: function () { go("#quiz/write"); } }, ["Escribir"]),
        el("button", { class: "ek-btn ek-btn--blue", onClick: function () { go("#quiz/listen"); } }, ["Escuchar"]),
        el("button", { class: "ek-btn ek-btn--muted", onClick: function () { go("#quiz/spell"); } }, ["Spelling Bee"])
      ])
```

- [ ] **Step 2: Añadir la rama `spell` en `renderQuizQuestion` (`js/ui.js`)**

2a. Estímulo — reemplazar el bloque:
```js
    var stimulus;
    if (q.mode === "listen") {
      stimulus = el("button", {
        class: "ek-icon-btn ek-quiz__play", "aria-label": "Escuchar de nuevo",
        onClick: function () { speakNormal(q.word.en); }
      }, ["🔊"]);
      if (!answered) speakNormal(q.word.en); // reproducir al mostrar
    } else {
      stimulus = el("h1", { class: "ek-word-en", text: q.prompt });
    }
```
por:
```js
    var stimulus;
    if (q.mode === "listen") {
      stimulus = el("button", {
        class: "ek-icon-btn ek-quiz__play", "aria-label": "Escuchar de nuevo",
        onClick: function () { speakNormal(q.word.en); }
      }, ["🔊"]);
      if (!answered) speakNormal(q.word.en); // reproducir al mostrar
    } else if (q.mode === "spell") {
      stimulus = el("div", { class: "ek-quiz__spell-cue" }, [
        el("div", { class: "ek-study__controls" }, [
          el("button", { class: "ek-icon-btn ek-quiz__play", "aria-label": "Escuchar de nuevo", onClick: function () { speakNormal(q.word.en); } }, ["🔊"]),
          el("button", { class: "ek-icon-btn", "aria-label": "Escuchar lento", onClick: function () { EK.speech.speakSlow(q.word.en); } }, ["🐢"])
        ]),
        el("p", { class: "ek-word-es", text: q.word.es.join(" / ") })
      ]);
      if (!answered) speakNormal(q.word.en); // reproducir al mostrar
    } else {
      stimulus = el("h1", { class: "ek-word-en", text: q.prompt });
    }
```

2b. Cuerpo — reemplazar la condición del `body` para que spell use el mismo campo de texto que write, con placeholder propio. Reemplazar:
```js
    var body;
    if (q.mode === "write") {
      var input = el("input", {
        class: "ek-search ek-quiz__input", type: "text", "aria-label": "Tu respuesta",
        placeholder: "Escribe en español…", autocomplete: "off"
      });
```
por:
```js
    var body;
    if (q.mode === "write" || q.mode === "spell") {
      var input = el("input", {
        class: "ek-search ek-quiz__input", type: "text", "aria-label": "Tu respuesta",
        placeholder: q.mode === "spell" ? "Escribe la palabra en inglés…" : "Escribe en español…", autocomplete: "off"
      });
```
(El resto del bloque `write` —`if (answered)`, `check`, `keydown`, `body = ...`— queda igual.)

2c. Feedback — mostrar la escritura correcta (`word.en`) en spell. Reemplazar:
```js
      var okText = _quizFb.correct ? "¡Correcto! 🎉" : ("Respuesta: " + q.word.es.join(" / "));
```
por:
```js
      var answerText = q.mode === "spell" ? q.word.en : q.word.es.join(" / ");
      var okText = _quizFb.correct ? "¡Correcto! 🎉" : ("Respuesta: " + answerText);
```

- [ ] **Step 3: Añadir estilo a `css/styles.css`**

Añadir al FINAL de `css/styles.css`:
```css
/* ===== Spelling Bee ===== */
.ek-quiz__spell-cue { display: flex; flex-direction: column; align-items: center; gap: 10px; }
```

- [ ] **Step 4: Subir la caché del service worker (`service-worker.js`)**

```js
var CACHE = "english-kids-v10";
```
(No cambiar `CORE`: no hay archivos nuevos.)

- [ ] **Step 5: Verificar sintaxis + smoke test**

- `node --check js/ui.js` y `node --check service-worker.js`; llaves balanceadas en `css/styles.css`.
- Smoke test bajo shim de Node (DOM funcional como en fases previas; `window` global; `speechSynthesis` undefined; `localStorage` en memoria; `setTimeout/setInterval/clearInterval` definidos): cargar los 13 scripts; `EK.app.init()`.
  - `location.hash = "#quiz"`; `EK.app.route()`; verificar que existe un botón con texto "Spelling Bee".
  - `location.hash = "#quiz/spell"`; `EK.app.route()`; verificar que en `#app` hay un campo `input.ek-quiz__input`, un nodo `.ek-quiz__spell-cue`, y un botón "Comprobar"; y que **NO** aparece la palabra en inglés como `<h1 class="ek-word-en">` (el estímulo no debe mostrar `word.en`). Simular respuesta: fijar `input.value = EK.quiz.current().word.en`, invocar el handler de click de "Comprobar", y verificar que aparece un feedback con "¡Correcto! 🎉". Reportar PASS/FAIL.

- [ ] **Step 6: Verificación manual del usuario (pendiente)**

En el navegador: Examen → **Spelling Bee**. Suena la palabra (🔊/🐢 repiten), se ve la traducción en español, el niño escribe el inglés y Comprobar/Enter valida; feedback verde/rojo (rojo muestra la escritura correcta); al final, resultado con % y "mejor examen".

- [ ] **Step 7: Commit**

```bash
git add js/ui.js css/styles.css service-worker.js
git commit -m "feat: Spelling Bee quiz view (audio + Spanish hint, type English spelling)"
```

---

## Self-Review

**Cobertura del spec:**
- Modo `"spell"` en el motor → Task 1 (MODES + answer). ✅
- Audio + pista español, sin mostrar inglés → Task 2 Step 2a (estímulo). ✅
- Ayudas 🔊/🐢 + auto-reproducción → Task 2 Step 2a. ✅
- Validación exacta `normalize(input)===normalize(word.en)` → Task 1 Step 3b. ✅
- Feedback con escritura correcta → Task 2 Step 2c. ✅
- Botón en el menú de Examen → Task 2 Step 1. ✅
- Sesión/puntaje/resultado reutilizados → sin cambios (reusa `advanceQuiz`/`renderQuizResult`/`result`). ✅
- PWA v10 → Task 2 Step 4. ✅

**Escaneo de placeholders:** sin TBD/TODO; cada paso trae código o comando concreto. ✅

**Consistencia de tipos:** `answer(value)` en spell devuelve `{correct, expected}` como los otros modos; `renderQuizQuestion` reutiliza `_quizFb`, `speakNormal`, `advanceQuiz`; el campo usa la clase `ek-quiz__input` existente; la ruta `#quiz/spell` la maneja `EK.app.route` (que llama `EK.quiz.start("spell")`, válido porque `"spell"` está en `MODES`). ✅
