# English Kids — Fase 7: Sprint 7 ("Estudiar hoy") — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir el modo "Estudiar hoy": una sesión guiada de ~10 palabras con el flujo Aprender → Repasar → Mini examen → Resultado.

**Architecture:** Un motor `EK.today` que selecciona ~10 palabras (priorizando las no vistas) y maneja una máquina de estados de fases (learn → review → quiz → result), reutilizando `EK.quiz.buildOptions` para el mini examen y `EK.progress` para marcar vistas. El render vive en `EK.ui` (reutiliza la tarjeta de estudio y las opciones de examen) y el ruteo en `EK.app`. El motor es puro/testeable (azar inyectable).

**Tech Stack:** JavaScript ES6 (scripts clásicos, `window.EK`), CSS3 (tokens/clases de fases previas). Sin frameworks, sin build, sin npm.

## Global Constraints

- **Sin frameworks, sin Node, sin npm, sin build**. Abre con doble clic (file://) y como PWA en HTTPS.
- **NO usar import/export**: extender `window.EK`.
- Reutilizar clases/tokens CSS existentes (`.ek-view`, `.ek-back`, `.ek-card`, `.ek-study`, `.ek-word-en`, `.ek-word-es`, `.ek-study__controls`, `.ek-icon-btn`, `.ek-quiz__head`, `.ek-quiz__options`, `.ek-opt`, `.ek-opt.is-correct/.is-wrong`, `.ek-quiz__fb`, `.ek-quiz__result/__score/__pct`, `.ek-nav__count`, `.ek-btn*`, `.ek-actions`). No se necesitan clases nuevas.
- Flujo: **Aprender** (ver cada palabra) → **Repasar** (verlas otra vez) → **Mini examen** (una pregunta de opción múltiple por palabra) → **Resultado**.
- ~**10 palabras** por sesión (menos si el set es menor); priorizar las **no vistas**.
- Mini examen: estímulo inglés → 4 opciones en español (reutiliza `EK.quiz.buildOptions`).
- Ver una palabra en Aprender/Repasar la marca como vista (`EK.progress.markSeen`).
- El azar es inyectable (`EK.today._setRng(fn)`); por defecto `Math.random`.
- Subir la caché del service worker a `english-kids-v7` y añadir `js/today.js` a `CORE`.
- Tests de navegador (`tests/tests.html`), lógica verificada con shim de Node.

## Interfaces existentes que se consumen

- `EK.words`; `EK.progress.isSeen(id)`, `EK.progress.markSeen(id)`; `EK.quiz.buildOptions(word, pool)` → 4 `{text,correct}`.
- `EK.ui.el`, `EK.ui.render(route)`, `renderHome`, `speakNormal`, `badgeEl` (helpers internos de ui.js); `EK.app.parseHash/route`.
- CSS/tokens de fases 0-6.

---

## Estructura de archivos (Fase 7)

- Create: `js/today.js` — `EK.today`: selección de palabras + máquina de fases + mini examen.
- Modify: `js/ui.js` — `renderToday` (sub-render por fase) + caso `"today"` en `render` + botón "Estudiar hoy" en `renderHome`.
- Modify: `js/app.js` — `route`: al entrar en `#today` arranca la sesión.
- Modify: `index.html` — cargar `js/today.js` antes de `js/ui.js`.
- Modify: `service-worker.js` — `CACHE = "english-kids-v7"`; añadir `js/today.js` a `CORE`.
- Create: `tests/today.test.js` — pruebas del motor.
- Modify: `tests/tests.html` — cargar `js/today.js` y `today.test.js`.

Orden de carga final: `storage → words → speech → settings → progress → favorites → study → quiz → memory → gamification → today → ui → app`.

---

### Task 1: `today.js` — motor de la sesión "Estudiar hoy"

**Files:**
- Create: `js/today.js`
- Create: `tests/today.test.js`
- Modify: `tests/tests.html`

**Interfaces:**
- Consumes: `EK.words`, `EK.progress.isSeen/markSeen`, `EK.quiz.buildOptions`.
- Produces:
  - `EK.today.start()` → fase inicial ("learn"); selecciona ~10 palabras (no vistas primero), reinicia estado, marca la primera como vista.
  - `EK.today.phase()` → "learn" | "review" | "quiz" | "result".
  - `EK.today.words()` → array de palabras de la sesión.
  - `EK.today.index()` / `EK.today.total()` → índice actual (0-based) / nº de palabras.
  - `EK.today.current()` → palabra actual (learn/review) o pregunta `{word,prompt,options}` (quiz), o `null`.
  - `EK.today.next()` → avanza; transiciona de fase al llegar al final; devuelve la fase resultante.
  - `EK.today.answer(idx)` → `{correct}` (solo en quiz); suma al puntaje una sola vez por pregunta.
  - `EK.today.answered()` → boolean (pregunta actual ya respondida).
  - `EK.today.score()` → aciertos del mini examen.
  - `EK.today.result()` → `{score, total, percent}`.
  - `EK.today._setRng(fn)` — inyecta el azar (tests).

- [ ] **Step 1: Escribir la prueba que falla `tests/today.test.js`**

```js
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

  EKTest.test("today.start: fase learn con 10 palabras", function () {
    EK.storage._backend = memBackend(); EK.storage.load();
    EK.today._setRng(function () { return 0; });
    var ph = EK.today.start();
    EKTest.assertEqual(ph, "learn", "empieza en learn");
    EKTest.assertEqual(EK.today.total(), 10, "10 palabras");
    EKTest.assertEqual(EK.today.index(), 0, "índice 0");
  });

  EKTest.test("today.start: prioriza palabras no vistas", function () {
    EK.storage._backend = memBackend(); EK.storage.load();
    // Marca vistas todas menos 103..112 (10 no vistas exactas).
    var seen = [];
    for (var i = 1; i <= 102; i++) seen.push(i);
    EK.storage.set("seen", seen);
    EK.today._setRng(function () { return 0; });
    EK.today.start();
    var ids = EK.today.words().map(function (w) { return w.id; }).sort(function (a, b) { return a - b; });
    EKTest.assertDeepEqual(ids, [103, 104, 105, 106, 107, 108, 109, 110, 111, 112], "las 10 no vistas");
  });

  EKTest.test("today.next: transiciona learn → review → quiz → result", function () {
    EK.storage._backend = memBackend(); EK.storage.load();
    EK.today._setRng(function () { return 0; });
    EK.today.start(); // learn, i=0
    var k;
    for (k = 0; k < 10; k++) EK.today.next(); // 10 avances → review
    EKTest.assertEqual(EK.today.phase(), "review", "tras 10 → review");
    for (k = 0; k < 10; k++) EK.today.next(); // 10 avances → quiz
    EKTest.assertEqual(EK.today.phase(), "quiz", "tras 10 → quiz");
    EKTest.assert(EK.today.current().options.length === 4, "pregunta con 4 opciones");
    for (k = 0; k < 10; k++) EK.today.next(); // 10 avances → result
    EKTest.assertEqual(EK.today.phase(), "result", "tras 10 → result");
  });

  EKTest.test("today.answer: acierto suma una vez", function () {
    EK.storage._backend = memBackend(); EK.storage.load();
    EK.today._setRng(function () { return 0; });
    EK.today.start();
    var k;
    for (k = 0; k < 20; k++) EK.today.next(); // hasta quiz
    var q = EK.today.current();
    var ci = -1;
    for (var i = 0; i < q.options.length; i++) if (q.options[i].correct) ci = i;
    EKTest.assert(EK.today.answer(ci).correct === true, "correcto");
    EKTest.assertEqual(EK.today.score(), 1, "puntaje 1");
    EK.today.answer(ci); // repetir no suma
    EKTest.assertEqual(EK.today.score(), 1, "sin doble conteo");
  });

  EKTest.test("today.result: porcentaje", function () {
    EK.storage._backend = memBackend(); EK.storage.load();
    EK.today._setRng(function () { return 0; });
    EK.today.start();
    var k;
    for (k = 0; k < 20; k++) EK.today.next(); // quiz, primera pregunta
    // Responder todas correctamente.
    for (k = 0; k < EK.today.total(); k++) {
      var q = EK.today.current();
      var ci = 0;
      for (var i = 0; i < q.options.length; i++) if (q.options[i].correct) ci = i;
      EK.today.answer(ci);
      EK.today.next();
    }
    var res = EK.today.result();
    EKTest.assertEqual(res.total, 10, "10 preguntas");
    EKTest.assertEqual(res.score, 10, "10 aciertos");
    EKTest.assertEqual(res.percent, 100, "100%");
  });
})();
```

- [ ] **Step 2: Verificar que falla**

Abrir `tests/tests.html`. Esperado: pruebas de today en **rojo** (`EK.today` no existe).

- [ ] **Step 3: Implementar `js/today.js`**

```js
// Modo "Estudiar hoy": sesión guiada de ~10 palabras (aprender→repasar→mini examen→resultado).
window.EK = window.EK || {};

EK.today = (function () {
  "use strict";

  var WORDS_PER_DAY = 10;
  var _rng = Math.random;
  var _s = null; // { words, phase, i, score, questions, answered }

  function rngInt(n) { return Math.floor(_rng() * n); }
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = rngInt(i + 1);
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // Selecciona ~10 palabras, priorizando las no vistas.
  function selectWords() {
    var unseen = EK.words.filter(function (w) { return !EK.progress.isSeen(w.id); });
    var seen = EK.words.filter(function (w) { return EK.progress.isSeen(w.id); });
    var pool = shuffle(unseen).concat(shuffle(seen));
    return pool.slice(0, Math.min(WORDS_PER_DAY, EK.words.length));
  }

  // Marca la palabra actual como vista (solo en learn/review).
  function landLearn() {
    if (!_s) return;
    if (_s.phase === "learn" || _s.phase === "review") {
      var w = _s.words[_s.i];
      if (w) EK.progress.markSeen(w.id);
    }
  }

  function buildQuestions() {
    _s.questions = _s.words.map(function (w) {
      return { word: w, prompt: w.en, options: EK.quiz.buildOptions(w, EK.words) };
    });
  }

  function start() {
    _s = { words: selectWords(), phase: "learn", i: 0, score: 0, questions: [], answered: false };
    landLearn();
    return _s.phase;
  }

  function phase() { return _s ? _s.phase : null; }
  function words() { return _s ? _s.words : []; }
  function index() { return _s ? _s.i : 0; }
  function total() { return _s ? _s.words.length : 0; }
  function score() { return _s ? _s.score : 0; }
  function answered() { return _s ? _s.answered : false; }

  function current() {
    if (!_s) return null;
    if (_s.phase === "quiz") return _s.questions[_s.i] || null;
    return _s.words[_s.i] || null;
  }

  function next() {
    if (!_s) return null;
    if (_s.phase === "learn") {
      _s.i++;
      if (_s.i >= _s.words.length) { _s.phase = "review"; _s.i = 0; }
      landLearn();
    } else if (_s.phase === "review") {
      _s.i++;
      if (_s.i >= _s.words.length) { _s.phase = "quiz"; _s.i = 0; buildQuestions(); _s.answered = false; }
      else { landLearn(); }
    } else if (_s.phase === "quiz") {
      _s.i++;
      _s.answered = false;
      if (_s.i >= _s.questions.length) { _s.phase = "result"; }
    }
    return _s.phase;
  }

  function answer(idx) {
    if (!_s || _s.phase !== "quiz") return null;
    var q = _s.questions[_s.i];
    var correct = !!(q && q.options[idx] && q.options[idx].correct);
    if (correct && !_s.answered) _s.score++;
    _s.answered = true;
    return { correct: correct };
  }

  function result() {
    var t = _s ? _s.questions.length : 0;
    var pct = t > 0 ? Math.round(_s.score / t * 100) : 0;
    return { score: _s ? _s.score : 0, total: t, percent: pct };
  }

  return {
    start: start, phase: phase, words: words, index: index, total: total,
    score: score, answered: answered, current: current, next: next,
    answer: answer, result: result, _setRng: function (fn) { _rng = fn; }
  };
})();
```

- [ ] **Step 4: Añadir módulo y suite a `tests/tests.html`**

En módulos, después de `<script src="../js/gamification.js"></script>`: añadir `<script src="../js/today.js"></script>`.
En suites, después de la última: añadir `<script src="today.test.js"></script>`.

- [ ] **Step 5: Verificar que pasan**

Recargar `tests/tests.html`, o shim de Node: sandbox con `window` global + `localStorage` en memoria; cargar `js/storage.js`, `js/words.js`, `js/progress.js`, `js/quiz.js`, `js/today.js`; ejecutar las 5 pruebas. Esperado: **verde**. También `node --check js/today.js`.

- [ ] **Step 6: Commit**

```bash
git add js/today.js tests/today.test.js tests/tests.html
git commit -m "feat: 'study today' engine (learn/review/quiz/result flow)"
```

---

### Task 2: `ui.js` — vista "Estudiar hoy" + botón en la home

**Files:**
- Modify: `js/ui.js`

**Interfaces:**
- Consumes: `EK.today.*`, `EK.speech`, `EK.ui.el/clear/go`, helpers internos `speakNormal` y `badgeEl`.
- Produces: `EK.ui.renderToday()`; caso `"today"` en `render`; botón "Estudiar hoy" en `renderHome`.

- [ ] **Step 1: Añadir `renderToday` dentro del IIFE de `js/ui.js`**

Insertar ANTES de `function render(route)`, reutilizando `el`, `clear`, `go`, `speakNormal`, `badgeEl`:

```js
  // ---- Estudiar hoy ----
  var _todayChosen = null;

  function renderTodayResult(r) {
    var res = EK.today.result();
    r.appendChild(el("div", { class: "ek-view" }, [
      el("h1", { class: "ek-title", text: "Estudiar hoy" }),
      el("div", { class: "ek-card ek-quiz__result" }, [
        el("div", { class: "ek-quiz__score", text: "¡Bien hecho! 🎉" }),
        el("div", { class: "ek-quiz__pct", text: "Aciertos: " + res.score + " / " + res.total + " · " + res.percent + "%" })
      ]),
      el("div", { class: "ek-actions" }, [
        el("button", { class: "ek-btn", onClick: function () { _todayChosen = null; EK.today.start(); renderToday(); } }, ["Repetir"]),
        el("button", { class: "ek-btn ek-btn--muted", onClick: function () { _todayChosen = null; go("#home"); } }, ["Inicio"])
      ])
    ]));
  }

  function renderToday() {
    var ph = EK.today.phase();
    var r = clear();
    if (ph === "result") { renderTodayResult(r); return; }

    var back = el("button", { class: "ek-back", onClick: function () { _todayChosen = null; go("#home"); } }, ["← Inicio"]);
    var labels = { learn: "Aprender", review: "Repasar", quiz: "Mini examen" };
    var head = el("div", { class: "ek-quiz__head" }, [
      el("span", { class: "ek-nav__count", text: labels[ph] }),
      el("span", { class: "ek-nav__count", text: (EK.today.index() + 1) + " / " + EK.today.total() })
    ]);

    if (ph === "learn" || ph === "review") {
      var w = EK.today.current();
      var card = el("div", { class: "ek-card ek-study" }, [
        badgeEl(w, "ek-badge--lg"),
        el("h1", { class: "ek-word-en", text: w.en }),
        el("p", { class: "ek-word-es", text: w.es.join(" / ") }),
        el("div", { class: "ek-study__controls" }, [
          el("button", { class: "ek-icon-btn", "aria-label": "Pronunciar", onClick: function () { speakNormal(w.en); } }, ["🔊"]),
          el("button", { class: "ek-icon-btn", "aria-label": "Pronunciación lenta", onClick: function () { EK.speech.speakSlow(w.en); } }, ["🐢"]),
          el("button", { class: "ek-icon-btn", "aria-label": "Deletrear", onClick: function () { EK.speech.spell(w.en); } }, ["🔤"])
        ])
      ]);
      var last = EK.today.index() >= EK.today.total() - 1;
      var label = ph === "review" && last ? "Ir al examen" : "Siguiente";
      var nextBtn = el("button", { class: "ek-btn ek-btn--blue", onClick: function () { EK.today.next(); renderToday(); } }, [label]);
      r.appendChild(el("div", { class: "ek-view" }, [back, head, card, nextBtn]));
      return;
    }

    // Fase quiz
    var q = EK.today.current();
    var isAnswered = EK.today.answered();
    var options = el("div", { class: "ek-quiz__options" }, q.options.map(function (opt, idx) {
      var cls = "ek-opt";
      if (isAnswered) {
        if (opt.correct) cls += " is-correct";
        else if (_todayChosen === idx) cls += " is-wrong";
      }
      return el("button", {
        class: cls,
        onClick: function () {
          if (EK.today.answered()) return;
          _todayChosen = idx;
          EK.today.answer(idx);
          renderToday();
        }
      }, [opt.text]);
    }));

    var feedback = null;
    if (isAnswered) {
      var correct = !!(q.options[_todayChosen] && q.options[_todayChosen].correct);
      feedback = el("div", { class: "ek-quiz__fb " + (correct ? "is-correct" : "is-wrong"),
        text: correct ? "¡Correcto! 🎉" : ("Respuesta: " + q.word.es.join(" / ")) });
    }

    var nextBtn2 = isAnswered
      ? el("button", { class: "ek-btn ek-btn--blue",
          onClick: function () { _todayChosen = null; EK.today.next(); renderToday(); } },
          [EK.today.index() >= EK.today.total() - 1 ? "Ver resultado" : "Siguiente"])
      : null;

    r.appendChild(el("div", { class: "ek-view" }, [
      back, head,
      el("div", { class: "ek-card ek-quiz" }, [el("h1", { class: "ek-word-en", text: q.prompt }), options, feedback]),
      nextBtn2
    ]));
  }
```

- [ ] **Step 2: Añadir el caso a `render` y el botón a `renderHome` (`js/ui.js`)**

En `render`, añadir el caso (antes del `default`):
```js
      case "today": renderToday(); break;
```

En `renderHome`, reemplazar el bloque `var buttons = el("div", { class: "ek-actions" }, [ ... ]);` por (añade "Estudiar hoy" como primer botón, destacado en verde):
```js
    var buttons = el("div", { class: "ek-actions" }, [
      el("button", { class: "ek-btn", onClick: function () { go("#today"); } }, ["Estudiar hoy"]),
      el("button", { class: "ek-btn ek-btn--blue", onClick: function () { go("#study"); } }, ["Estudiar"]),
      el("button", { class: "ek-btn ek-btn--blue", onClick: function () { go("#quiz"); } }, ["Examen"]),
      el("button", { class: "ek-btn ek-btn--blue", onClick: function () { go("#memory"); } }, ["Memoria"]),
      el("button", { class: "ek-btn ek-btn--blue", onClick: function () { go("#favorites"); } }, ["Favoritas"]),
      el("button", { class: "ek-btn ek-btn--muted", onClick: function () { go("#settings"); } }, ["Configuración"])
    ]);
```

En el `return { ... }` de `EK.ui`, añadir:
```js
    renderToday: renderToday,
```

- [ ] **Step 3: Verificar sintaxis**

`node --check js/ui.js` (esperado: sin error).

- [ ] **Step 4: Commit**

```bash
git add js/ui.js
git commit -m "feat: 'study today' view (learn/review/mini-quiz/result) and home button"
```

---

### Task 3: `app.js` ruteo + wiring (index.html, service-worker) + smoke

**Files:**
- Modify: `js/app.js`
- Modify: `index.html`
- Modify: `service-worker.js`

**Interfaces:**
- Consumes: `EK.today.start`, `EK.ui.render`.

- [ ] **Step 1: Actualizar `route` en `js/app.js`**

En la función `route`, añadir la rama de `today` (arranca la sesión al entrar). El cuerpo de `route` queda:

```js
  function route() {
    var r = parseHash();
    EK.ui.stopMemoryTimer();
    if (r.view === "study") {
      if (r.id != null) {
        EK.study.start(EK.words, r.id);
      } else {
        var last = EK.storage.get("lastWordId");
        EK.study.start(EK.words, last != null ? last : EK.words[0].id);
      }
    } else if (r.view === "quiz" && r.seg) {
      EK.quiz.start(r.seg);
      EK.ui.resetQuizFb();
    } else if (r.view === "memory") {
      EK.ui.startMemory();
      return;
    } else if (r.view === "today") {
      EK.today.start();
    }
    EK.ui.render(r);
  }
```

- [ ] **Step 2: Cargar `js/today.js` en `index.html`**

Insertar antes de `<script src="js/ui.js"></script>`:
```html
  <script src="js/today.js"></script>
```
Orden: storage, words, speech, settings, progress, favorites, study, quiz, memory, gamification, today, ui, app.

- [ ] **Step 3: Actualizar el precache del `service-worker.js`**

Subir a `english-kids-v7` y añadir `"js/today.js"` a `CORE` (después de `"js/gamification.js"`). `CORE` debe quedar:
```js
var CACHE = "english-kids-v7";
var CORE = [
  ".",
  "index.html",
  "css/styles.css",
  "js/storage.js",
  "js/words.js",
  "js/speech.js",
  "js/settings.js",
  "js/progress.js",
  "js/favorites.js",
  "js/study.js",
  "js/quiz.js",
  "js/memory.js",
  "js/gamification.js",
  "js/today.js",
  "js/ui.js",
  "js/app.js",
  "manifest.webmanifest",
  "assets/logo.svg",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png"
];
```

- [ ] **Step 4: Verificar sintaxis + smoke test**

- `node --check js/app.js` y `node --check service-worker.js`.
- `index.html` carga los 13 scripts en orden; todos los paths de `CORE` existen.
- Smoke test bajo shim de Node (DOM funcional como en fases previas; `window.setTimeout/setInterval/clearInterval` definidos; `Date` disponible; `localStorage` en memoria; `speechSynthesis` undefined): cargar los 13 scripts; `EK.app.init()`; `location.hash = "#home"`; `EK.app.route()`; verificar que existe un botón con texto "Estudiar hoy". Luego `location.hash = "#today"`; `EK.app.route()`; verificar que `#app` contiene una tarjeta `.ek-study` (fase learn) y un botón "Siguiente". Luego avanzar el motor hasta la fase quiz (`for k<20: EK.today.next()`), `EK.ui.renderToday()`, y verificar que hay 4 nodos `.ek-opt`. Reportar PASS/FAIL.

- [ ] **Step 5: Verificación manual del usuario (pendiente)**

En el navegador: Home muestra **Estudiar hoy** (primer botón). Al entrar: fase **Aprender** con ~10 tarjetas (🔊/🐢/🔤 + Siguiente); luego **Repasar** (mismas palabras, botón "Ir al examen" en la última); luego **Mini examen** (opción múltiple con feedback correcto/incorrecto); al final **Resultado** con aciertos/porcentaje y Repetir/Inicio. Las palabras vistas suman al progreso y XP.

- [ ] **Step 6: Commit**

```bash
git add js/app.js index.html service-worker.js
git commit -m "feat: 'study today' routing and PWA wiring (service worker v7)"
```

---

## Self-Review

**Cobertura del spec (Sprint 7):**
- Modo "Estudiar hoy" → Tasks 1-3. ✅
- Elige ~10 palabras (priorizando no vistas) → `selectWords` (Task 1). ✅
- Flujo Aprender → Repasar → Mini examen → Resultado → máquina de fases `next()` (Task 1) + `renderToday` por fase (Task 2). ✅
- Mini examen (opción múltiple sobre las palabras de la sesión) → `buildQuestions` con `EK.quiz.buildOptions` (Task 1) + fase quiz en `renderToday` (Task 2). ✅
- Resultado → `result()` (Task 1) + `renderTodayResult` (Task 2). ✅
- Acceso desde la home → botón "Estudiar hoy" + ruta `#today` (Tasks 2-3). ✅
- Ver palabras suma al progreso/XP → `landLearn` llama `EK.progress.markSeen` (Task 1). ✅
- PWA offline con el nuevo archivo → `CORE` + `english-kids-v7` (Task 3). ✅

Con esta fase se completan los 7 sprints del spec (Sprint 4 imágenes ya cubierto por emojis; Sprint 5 reconocimiento de voz queda como opcional pendiente, no funciona en iPad).

**Escaneo de placeholders:** sin TBD/TODO; cada paso trae código o comando concreto. ✅

**Consistencia de tipos:** `EK.today.current()` devuelve palabra (learn/review) o `{word,prompt,options}` (quiz), consumido correctamente por `renderToday` según `phase()`; `EK.today.answer(idx)`→`{correct}`; `EK.today.result()`→`{score,total,percent}` consumido por `renderTodayResult`; reutiliza `EK.quiz.buildOptions` (4 `{text,correct}`), `speakNormal`, `badgeEl`; caso `"today"` en `render` coincide con `#today`. ✅
