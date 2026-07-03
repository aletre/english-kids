# English Kids — Fase 2: Sprint 2 (Exámenes) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir un módulo de exámenes con tres modalidades —opción múltiple, escribir y escuchar— con puntaje, resultado y actualización de "mejor examen".

**Architecture:** Un motor de examen puro y testeable (`EK.quiz`) separado del render del DOM (que vive en `EK.ui`, como en la Fase 1) y de la orquestación/ruteo (`EK.app`). El estímulo de cada pregunta es la palabra en inglés y la respuesta es el español; el modo "escribir" acepta cualquier variante de traducción reusando `EK.wordUtils.matchesAnswer`. El azar es inyectable para tests deterministas.

**Tech Stack:** HTML5, CSS3 (tokens de Fase 0/1), JavaScript ES6 (scripts clásicos, `window.EK`), Web Speech API (para "escuchar"). Sin frameworks, sin build, sin npm.

## Global Constraints

- **Sin frameworks, sin Node, sin npm, sin build**. Abre con doble clic en `index.html` (file://) y como PWA en HTTPS.
- **NO usar import/export**: los módulos extienden `window.EK` como scripts clásicos.
- Reutilizar tokens/clases CSS existentes (`.ek-btn`, `.ek-btn--blue`, `.ek-btn--muted`, `.ek-card`, `.ek-view`, `.ek-back`, `.ek-title`, `.ek-seg`, `.ek-icon-btn`, variables `--color-*`, `--surface*`, `--text*`, `--radius*`, `--tap`, `--space`). Añadir clases nuevas solo cuando haga falta.
- Las tres modalidades: **estímulo en inglés → respuesta en español**.
  - Opción múltiple: muestra la palabra en inglés y 4 opciones en español (1 correcta + 3 distractores).
  - Escribir: muestra la palabra en inglés, el niño escribe el español; **acepta cualquier variante** (`EK.wordUtils.matchesAnswer`), ignora tildes y mayúsculas.
  - Escuchar: reproduce la palabra en inglés (SpeechSynthesis) y muestra 4 opciones en español.
- Tamaño de examen por defecto: **10 preguntas** (o menos si el set es menor).
- Al terminar: puntaje, porcentaje, y actualizar `stats.bestQuiz` (máximo) vía `EK.storage`.
- El azar debe ser **inyectable** (`EK.quiz._setRng(fn)`) para pruebas deterministas; por defecto `Math.random`.
- Los tests son de navegador (`tests/tests.html`); se verifican con un shim de Node (`vm`) por ser entorno headless.

## Interfaces existentes que este plan consume

- `EK.words` (112 `{id,en,es:[...],emoji|null,category}`), `EK.wordUtils.matchesAnswer(word,input)`, `EK.wordUtils.normalize`.
- `EK.storage.get(path)`, `EK.storage.set(path,value)` (clave `stats.bestQuiz`, default 0 en DEFAULTS).
- `EK.speech.speak(text,{rate})`, `EK.settings.rateFor(getSpeed())`.
- `EK.ui.el(tag,attrs,children)`, `EK.ui.render(route)`, patrón de vistas de Fase 1; `EK.app.parseHash/route`.
- CSS tokens/clases de Fase 0/1.

---

## Estructura de archivos (Fase 2)

- Create: `js/quiz.js` — `EK.quiz`: motor de examen (sesión, preguntas, opciones, respuesta, puntaje, resultado).
- Modify: `js/ui.js` — añadir `renderQuizMenu`, `renderQuizQuestion`, `renderQuizResult`; caso `"quiz"` en `render`; botón "Examen" en `renderHome`.
- Modify: `js/app.js` — `parseHash` expone el segmento string (`seg`); `route` arranca el examen al entrar en `#quiz/<mode>`.
- Modify: `index.html` — cargar `js/quiz.js` antes de `js/ui.js`.
- Modify: `service-worker.js` — añadir `js/quiz.js` a `CORE` y subir la caché a `english-kids-v3`.
- Modify: `css/styles.css` — estilos de opciones, feedback correcto/incorrecto y pantalla de resultado.
- Create: `tests/quiz.test.js` — pruebas del motor.
- Modify: `tests/tests.html` — cargar `js/quiz.js` y `quiz.test.js`.

Orden de carga final en `index.html`:
`storage → words → speech → settings → progress → favorites → study → quiz → ui → app`.

---

### Task 1: `quiz.js` — motor de examen

**Files:**
- Create: `js/quiz.js`
- Create: `tests/quiz.test.js`
- Modify: `tests/tests.html`

**Interfaces:**
- Consumes: `EK.words`, `EK.wordUtils.matchesAnswer`, `EK.storage.get/set`.
- Produces:
  - `EK.quiz.MODES` — `["choice", "write", "listen"]`.
  - `EK.quiz.buildOptions(word, pool)` → array de 4 `{ text, correct }` (1 correcta = `word.es[0]`, 3 distractores; mezcladas).
  - `EK.quiz.start(mode, size)` → primera pregunta; crea sesión de `size` (default 10) preguntas muestreadas de `EK.words`.
  - `EK.quiz.current()` → `{ mode, word, prompt, options? }` o `null`.
  - `EK.quiz.answer(value)` → `{ correct: boolean, expected: string[] }` (para choice/listen `value` = índice de opción; para write `value` = string). Suma al puntaje una sola vez por pregunta.
  - `EK.quiz.next()` → siguiente pregunta o `null` si terminó.
  - `EK.quiz.index()`, `EK.quiz.total()`, `EK.quiz.score()`, `EK.quiz.mode()`.
  - `EK.quiz.isFinished()` → boolean (última pregunta respondida).
  - `EK.quiz.result()` → `{ score, total, percent }`; actualiza `stats.bestQuiz` al máximo.
  - `EK.quiz._setRng(fn)` — inyecta el generador de azar (tests).

- [ ] **Step 1: Escribir la prueba que falla `tests/quiz.test.js`**

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

  function correctIndex(q) {
    for (var i = 0; i < q.options.length; i++) if (q.options[i].correct) return i;
    return -1;
  }

  EKTest.test("quiz.buildOptions: 4 opciones, exactamente 1 correcta = es[0]", function () {
    EK.quiz._setRng(function () { return 0; });
    var word = EK.wordUtils.byId(13); // butterfly / mariposa
    var opts = EK.quiz.buildOptions(word, EK.words);
    EKTest.assertEqual(opts.length, 4, "4 opciones");
    var corrects = opts.filter(function (o) { return o.correct; });
    EKTest.assertEqual(corrects.length, 1, "exactamente 1 correcta");
    EKTest.assertEqual(corrects[0].text, "mariposa", "la correcta es es[0]");
  });

  EKTest.test("quiz.start(choice): sesión de tamaño N con opciones", function () {
    EK.storage._backend = memBackend(); EK.storage.load();
    EK.quiz._setRng(function () { return 0; });
    EK.quiz.start("choice", 5);
    EKTest.assertEqual(EK.quiz.total(), 5, "5 preguntas");
    EKTest.assertEqual(EK.quiz.mode(), "choice", "modo choice");
    EKTest.assert(EK.quiz.current().options.length === 4, "pregunta con 4 opciones");
  });

  EKTest.test("quiz.answer(choice): correcto suma, incorrecto no; sin doble conteo", function () {
    EK.storage._backend = memBackend(); EK.storage.load();
    EK.quiz._setRng(function () { return 0; });
    EK.quiz.start("choice", 3);
    var ci = correctIndex(EK.quiz.current());
    var r1 = EK.quiz.answer(ci);
    EKTest.assert(r1.correct === true, "respuesta correcta");
    EKTest.assertEqual(EK.quiz.score(), 1, "puntaje 1");
    EK.quiz.answer(ci); // segunda respuesta a la misma pregunta
    EKTest.assertEqual(EK.quiz.score(), 1, "no doble conteo");
    EK.quiz.next();
    var wrong = (correctIndex(EK.quiz.current()) + 1) % 4;
    EKTest.assert(EK.quiz.answer(wrong).correct === false, "respuesta incorrecta");
    EKTest.assertEqual(EK.quiz.score(), 1, "puntaje sigue 1");
  });

  EKTest.test("quiz.answer(write): acepta cualquier variante e ignora tildes", function () {
    EK.storage._backend = memBackend(); EK.storage.load();
    EK.quiz._setRng(function () { return 0; });
    EK.quiz.start("write", 3);
    var q = EK.quiz.current(); // alguna palabra; su word.es
    var variant = q.word.es[q.word.es.length - 1]; // última variante
    var r = EK.quiz.answer(variant.toUpperCase());
    EKTest.assert(r.correct === true, "acepta variante en mayúsculas");
  });

  EKTest.test("quiz.next/result: recorre y calcula porcentaje + bestQuiz", function () {
    EK.storage._backend = memBackend(); EK.storage.load();
    EK.quiz._setRng(function () { return 0; });
    EK.quiz.start("choice", 2);
    var ci0 = correctIndex(EK.quiz.current());
    EK.quiz.answer(ci0);
    EKTest.assert(EK.quiz.next() !== null, "hay segunda pregunta");
    EK.quiz.answer((correctIndex(EK.quiz.current()) + 1) % 4); // fallar la 2ª
    EKTest.assert(EK.quiz.next() === null, "no hay tercera; terminó");
    EKTest.assert(EK.quiz.isFinished() === true, "isFinished");
    var res = EK.quiz.result();
    EKTest.assertEqual(res.total, 2, "total 2");
    EKTest.assertEqual(res.score, 1, "1 acierto");
    EKTest.assertEqual(res.percent, 50, "50%");
    EKTest.assertEqual(EK.storage.get("stats.bestQuiz"), 50, "bestQuiz = 50");
  });
})();
```

- [ ] **Step 2: Verificar que falla**

Abrir `tests/tests.html`. Esperado: las pruebas de quiz en **rojo** (no existe `EK.quiz`).

- [ ] **Step 3: Implementar `js/quiz.js`**

```js
// Motor de examen: sesión de preguntas, opciones, corrección y puntaje.
window.EK = window.EK || {};

EK.quiz = (function () {
  "use strict";

  var MODES = ["choice", "write", "listen"];
  var _rng = Math.random;
  var _session = null; // { mode, questions:[...], i, score, answered }

  function rngInt(n) { return Math.floor(_rng() * n); }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = rngInt(i + 1);
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function sample(pool, n) {
    return shuffle(pool).slice(0, n);
  }

  // Opciones para choice/listen: 1 correcta (es[0]) + 3 distractores de otras palabras.
  function buildOptions(word, pool) {
    var others = pool.filter(function (w) { return w.id !== word.id; });
    var distract = sample(others, 3).map(function (w) { return { text: w.es[0], correct: false }; });
    var opts = [{ text: word.es[0], correct: true }].concat(distract);
    return shuffle(opts);
  }

  function makeQuestion(word, mode, pool) {
    var q = { mode: mode, word: word, prompt: word.en };
    if (mode === "choice" || mode === "listen") q.options = buildOptions(word, pool);
    return q;
  }

  function start(mode, size) {
    if (MODES.indexOf(mode) === -1) mode = "choice";
    size = size || 10;
    var pool = EK.words;
    var chosen = sample(pool, Math.min(size, pool.length));
    _session = {
      mode: mode,
      questions: chosen.map(function (w) { return makeQuestion(w, mode, pool); }),
      i: 0, score: 0, answered: false
    };
    return current();
  }

  function current() { return _session ? _session.questions[_session.i] : null; }

  function answer(value) {
    var q = current();
    if (!q) return null;
    var correct;
    if (q.mode === "write") {
      correct = EK.wordUtils.matchesAnswer(q.word, String(value));
    } else {
      correct = !!(q.options[value] && q.options[value].correct);
    }
    if (correct && !_session.answered) _session.score++;
    _session.answered = true;
    return { correct: correct, expected: q.word.es };
  }

  function next() {
    if (!_session) return null;
    if (_session.i < _session.questions.length - 1) {
      _session.i++;
      _session.answered = false;
      return current();
    }
    return null;
  }

  function index() { return _session ? _session.i : 0; }
  function total() { return _session ? _session.questions.length : 0; }
  function score() { return _session ? _session.score : 0; }
  function mode() { return _session ? _session.mode : null; }

  function isFinished() {
    return _session ? (_session.i >= _session.questions.length - 1 && _session.answered) : false;
  }

  function result() {
    var t = total();
    var pct = t > 0 ? Math.round(score() / t * 100) : 0;
    var best = EK.storage.get("stats.bestQuiz") || 0;
    if (pct > best) EK.storage.set("stats.bestQuiz", pct);
    return { score: score(), total: t, percent: pct };
  }

  return {
    MODES: MODES,
    buildOptions: buildOptions,
    start: start, current: current, answer: answer, next: next,
    index: index, total: total, score: score, mode: mode,
    isFinished: isFinished, result: result,
    _setRng: function (fn) { _rng = fn; }
  };
})();
```

- [ ] **Step 4: Añadir módulo y suite a `tests/tests.html`**

Añadir en la sección de módulos, después de `<script src="../js/study.js"></script>`:
```html
  <script src="../js/quiz.js"></script>
```
Añadir en la sección de suites, después de `<script src="study.test.js"></script>`:
```html
  <script src="quiz.test.js"></script>
```

- [ ] **Step 5: Verificar que pasan**

Recargar `tests/tests.html` (o shim de Node: sandbox con `window` global + `localStorage` en memoria; cargar `js/storage.js`, `js/words.js`, `js/quiz.js`; ejecutar los escenarios). Esperado: todas las pruebas de quiz en **verde**.

- [ ] **Step 6: Commit**

```bash
git add js/quiz.js tests/quiz.test.js tests/tests.html
git commit -m "feat: quiz engine (choice, write, listen) with scoring"
```

---

### Task 2: `ui.js` — vistas del examen + CSS + botón en la home

**Files:**
- Modify: `js/ui.js`
- Modify: `css/styles.css`

**Interfaces:**
- Consumes: `EK.quiz.*`, `EK.speech.speak`, `EK.settings.rateFor/getSpeed`, `EK.ui.el`.
- Produces: `EK.ui.renderQuizMenu()`, `EK.ui.renderQuizQuestion()`, `EK.ui.renderQuizResult()`; el caso `"quiz"` en `EK.ui.render`; botón "Examen" en la home.

> Las funciones de render manipulan el DOM y se verifican manualmente/por smoke test en Task 3.

- [ ] **Step 1: Añadir las funciones de examen dentro del IIFE de `js/ui.js`**

Insertar estas funciones ANTES de la función `render` (que está cerca del final del IIFE), reutilizando los helpers existentes `el`, `clear`, `root`, `go` y `speakNormal`:

```js
  // ---- Examen ----
  var _quizFb = null; // { i, correct, expected } feedback de la pregunta respondida

  function renderQuizMenu() {
    var r = clear();
    var back = el("button", { class: "ek-back", onClick: function () { go("#home"); } }, ["← Inicio"]);
    r.appendChild(el("div", { class: "ek-view" }, [
      back,
      el("h1", { class: "ek-title", text: "Examen" }),
      el("p", { class: "ek-progress-text", text: "Elige una modalidad:" }),
      el("div", { class: "ek-actions" }, [
        el("button", { class: "ek-btn", onClick: function () { go("#quiz/choice"); } }, ["Opción múltiple"]),
        el("button", { class: "ek-btn ek-btn--blue", onClick: function () { go("#quiz/write"); } }, ["Escribir"]),
        el("button", { class: "ek-btn ek-btn--muted", onClick: function () { go("#quiz/listen"); } }, ["Escuchar"])
      ])
    ]));
  }

  function quizHeader() {
    return el("div", { class: "ek-quiz__head" }, [
      el("button", { class: "ek-back", onClick: function () { go("#quiz"); } }, ["← Examen"]),
      el("span", { class: "ek-nav__count", text: (EK.quiz.index() + 1) + " / " + EK.quiz.total() + " · Aciertos: " + EK.quiz.score() })
    ]);
  }

  function renderQuizResult() {
    var r = clear();
    var res = EK.quiz.result();
    var m = EK.quiz.mode();
    r.appendChild(el("div", { class: "ek-view" }, [
      el("h1", { class: "ek-title", text: "Resultado" }),
      el("div", { class: "ek-card ek-quiz__result" }, [
        el("div", { class: "ek-quiz__score", text: res.score + " / " + res.total }),
        el("div", { class: "ek-quiz__pct", text: res.percent + "%" })
      ]),
      el("div", { class: "ek-actions" }, [
        el("button", { class: "ek-btn", onClick: function () { _quizFb = null; go("#quiz/" + m); } }, ["Reintentar"]),
        el("button", { class: "ek-btn ek-btn--muted", onClick: function () { _quizFb = null; go("#home"); } }, ["Inicio"])
      ])
    ]));
  }

  function advanceQuiz() {
    _quizFb = null;
    if (EK.quiz.next() === null) { renderQuizResult(); }
    else { renderQuizQuestion(); }
  }

  function renderQuizQuestion() {
    var q = EK.quiz.current();
    if (!q) { renderQuizMenu(); return; }
    var r = clear();
    var answered = _quizFb && _quizFb.i === EK.quiz.index();

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

    var body;
    if (q.mode === "write") {
      var input = el("input", {
        class: "ek-search ek-quiz__input", type: "text", "aria-label": "Tu respuesta",
        placeholder: "Escribe en español…", autocomplete: "off"
      });
      if (answered) { input.value = ""; input.setAttribute("disabled", "disabled"); }
      var check = el("button", { class: "ek-btn", onClick: function () {
        if (answered) return;
        _quizFb = { i: EK.quiz.index() };
        var res = EK.quiz.answer(input.value);
        _quizFb.correct = res.correct; _quizFb.expected = res.expected;
        renderQuizQuestion();
      } }, ["Comprobar"]);
      input.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); check.click(); } });
      body = el("div", { class: "ek-quiz__write" }, [input, check]);
    } else {
      body = el("div", { class: "ek-quiz__options" }, q.options.map(function (opt, idx) {
        var cls = "ek-opt";
        if (answered) {
          if (opt.correct) cls += " is-correct";
          else if (_quizFb.chosen === idx) cls += " is-wrong";
        }
        return el("button", {
          class: cls,
          onClick: function () {
            if (answered) return;
            _quizFb = { i: EK.quiz.index(), chosen: idx };
            var res = EK.quiz.answer(idx);
            _quizFb.correct = res.correct; _quizFb.expected = res.expected;
            renderQuizQuestion();
          }
        }, [opt.text]);
      }));
    }

    var feedback = null;
    if (answered) {
      var okText = _quizFb.correct ? "¡Correcto! 🎉" : ("Respuesta: " + q.word.es.join(" / "));
      feedback = el("div", { class: "ek-quiz__fb " + (_quizFb.correct ? "is-correct" : "is-wrong"), text: okText });
    }

    var nextBtn = answered
      ? el("button", { class: "ek-btn ek-btn--blue", onClick: advanceQuiz },
          [EK.quiz.index() >= EK.quiz.total() - 1 ? "Ver resultado" : "Siguiente"])
      : null;

    r.appendChild(el("div", { class: "ek-view" }, [
      quizHeader(),
      el("div", { class: "ek-card ek-quiz" }, [stimulus, body, feedback]),
      nextBtn
    ]));
  }
```

- [ ] **Step 2: Actualizar `render` y `renderHome` en `js/ui.js`**

En la función `render`, añadir el caso `"quiz"` (antes del `default`):
```js
      case "quiz": (route && route.seg) ? renderQuizQuestion() : renderQuizMenu(); break;
```

En `renderHome`, reemplazar el bloque `var buttons = el("div", { class: "ek-actions" }, [ ... ]);` por (añade "Examen"):
```js
    var buttons = el("div", { class: "ek-actions" }, [
      el("button", { class: "ek-btn", onClick: function () { go("#study"); } }, ["Estudiar"]),
      el("button", { class: "ek-btn ek-btn--blue", onClick: function () { go("#quiz"); } }, ["Examen"]),
      el("button", { class: "ek-btn ek-btn--blue", onClick: function () { go("#favorites"); } }, ["Favoritas"]),
      el("button", { class: "ek-btn ek-btn--muted", onClick: function () { go("#settings"); } }, ["Configuración"])
    ]);
```

En el `return { ... }` de `EK.ui`, añadir las nuevas funciones:
```js
    renderQuizMenu: renderQuizMenu,
    renderQuizQuestion: renderQuizQuestion,
    renderQuizResult: renderQuizResult,
```

- [ ] **Step 3: Añadir estilos a `css/styles.css`**

Añadir al FINAL de `css/styles.css`:
```css
/* ===== Fase 2: examen ===== */
.ek-quiz { display: flex; flex-direction: column; gap: 16px; align-items: stretch; }
.ek-quiz__head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.ek-quiz__play { align-self: center; font-size: 32px; }
.ek-quiz__options { display: flex; flex-direction: column; gap: 10px; }
.ek-opt {
  min-height: var(--tap); padding: 0 18px; font: inherit; font-weight: 800;
  border: 2px solid var(--border); border-radius: var(--radius);
  background: var(--surface); color: var(--text); text-align: center;
}
.ek-opt.is-correct { background: var(--color-green); border-color: var(--color-green); color: #fff; }
.ek-opt.is-wrong { background: #FF4B4B; border-color: #FF4B4B; color: #fff; }
.ek-quiz__write { display: flex; flex-direction: column; gap: 10px; }
.ek-quiz__input { text-align: center; }
.ek-quiz__fb { text-align: center; font-weight: 800; padding: 8px; border-radius: var(--radius); }
.ek-quiz__fb.is-correct { color: var(--color-green); }
.ek-quiz__fb.is-wrong { color: #FF4B4B; }
.ek-quiz__result { align-items: center; text-align: center; }
.ek-quiz__score { font-size: 40px; font-weight: 800; }
.ek-quiz__pct { font-size: 22px; color: var(--text-muted); }
```

- [ ] **Step 4: Verificar sintaxis**

Correr `node --check js/ui.js` (esperado: sin error) y confirmar que las llaves de `css/styles.css` siguen balanceadas.

- [ ] **Step 5: Commit**

```bash
git add js/ui.js css/styles.css
git commit -m "feat: quiz views (menu, question, result) and home Examen button"
```

---

### Task 3: `app.js` ruteo del examen + wiring (index.html, service-worker) + smoke test

**Files:**
- Modify: `js/app.js`
- Modify: `index.html`
- Modify: `service-worker.js`

**Interfaces:**
- Consumes: `EK.quiz.start`, `EK.ui.render`.
- Produces: `parseHash` con `seg` (segmento string); `route` arranca `EK.quiz.start(seg)` al entrar en `#quiz/<mode>`.

- [ ] **Step 1: Actualizar `parseHash` y `route` en `js/app.js`**

Reemplazar la función `parseHash` por (añade `seg`, el segmento crudo como string):
```js
  function parseHash() {
    var h = (location.hash || "").replace(/^#\/?/, "");
    var parts = h.split("/");
    var idNum = parts[1] != null && parts[1] !== "" ? parseInt(parts[1], 10) : null;
    var seg = parts[1] != null && parts[1] !== "" ? parts[1] : null;
    return { view: parts[0] || "home", id: isNaN(idNum) ? null : idNum, seg: seg };
  }
```

En la función `route`, añadir el arranque del examen. El cuerpo de `route` queda:
```js
  function route() {
    var r = parseHash();
    if (r.view === "study") {
      if (r.id != null) {
        EK.study.start(EK.words, r.id);
      } else {
        var last = EK.storage.get("lastWordId");
        EK.study.start(EK.words, last != null ? last : EK.words[0].id);
      }
    } else if (r.view === "quiz" && r.seg) {
      EK.quiz.start(r.seg);
    }
    EK.ui.render(r);
  }
```

- [ ] **Step 2: Cargar `js/quiz.js` en `index.html`**

En `index.html`, insertar antes de `<script src="js/ui.js"></script>`:
```html
  <script src="js/quiz.js"></script>
```
El orden queda: storage, words, speech, settings, progress, favorites, study, quiz, ui, app.

- [ ] **Step 3: Actualizar el precache del `service-worker.js`**

Subir la versión a `english-kids-v3` y añadir `"js/quiz.js"` a `CORE` (después de `"js/study.js"`). El array `CORE` debe quedar:
```js
var CACHE = "english-kids-v3";
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
  "js/ui.js",
  "js/app.js",
  "manifest.webmanifest",
  "assets/logo.svg",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png"
];
```

- [ ] **Step 4: Verificar sintaxis + smoke test de ruteo**

- `node --check js/app.js` y `node --check service-worker.js` (esperado: sin error).
- Confirmar que `index.html` carga `js/quiz.js` entre `study.js` y `ui.js`, y que todos los paths de `CORE` existen.
- Smoke test bajo shim de Node (DOM funcional, como en Fase 1): cargar los 10 scripts en orden; `EK.app.init()`; luego para cada hash (`#quiz`, `#quiz/choice`, `#quiz/write`, `#quiz/listen`) fijar `location.hash`, llamar `EK.app.route()` y verificar que `#app` recibe ≥1 hijo sin excepción. Además, tras `#quiz/choice`, localizar un botón `.ek-opt`, invocar su handler de click (opción con `correct`), y confirmar que un segundo render muestra el botón "Siguiente"/"Ver resultado". Reportar PASS/FAIL por vista.
  - Para `listen`, el shim debe tolerar `EK.speech.speak` (define `window.speechSynthesis` como `undefined` → `isSupported()` es false y `speak` es no-op; no debe lanzar).

- [ ] **Step 5: Verificación manual en navegador (pendiente para el usuario)**

Abrir `index.html`: Home muestra el botón **Examen** → menú con 3 modalidades.
- **Opción múltiple:** palabra en inglés + 4 opciones; al elegir, resalta correcta (verde) / incorrecta (roja) y aparece Siguiente; al final, pantalla de resultado con puntaje y %.
- **Escribir:** palabra en inglés + campo; escribir el español y Enter/Comprobar; acepta variantes (ej. para "peanuts": "maní" o "cacahuates").
- **Escuchar:** suena la palabra (🔊 repite) + 4 opciones.
- Reintentar reinicia; el "mejor examen" se guarda (revisar que no baje al sacar menos).
- Consola sin errores.

- [ ] **Step 6: Commit**

```bash
git add js/app.js index.html service-worker.js
git commit -m "feat: quiz routing and PWA wiring (service worker v3)"
```

---

## Self-Review

**Cobertura del spec (Sprint 2):**
- Examen con tres modalidades → Tasks 1-3. ✅
- Opción múltiple (inglés + 4 opciones español) → `buildOptions` (Task 1) + `renderQuizQuestion` (Task 2). ✅
- Escribir (acepta variantes, ignora tildes/mayúsculas) → `answer` con `matchesAnswer` (Task 1) + modo write (Task 2). ✅
- Escuchar (reproduce palabra, elige correcta) → modo listen con `speakNormal` + opciones (Task 2). ✅
- Puntaje, resultado y "mejor examen" → `result()` actualiza `stats.bestQuiz` (Task 1) + `renderQuizResult` (Task 2). ✅
- Acceso desde la home → botón "Examen" (Task 2) + ruta `#quiz` (Task 3). ✅
- PWA sigue offline con el nuevo archivo → `CORE` + `english-kids-v3` (Task 3). ✅

Fuera de alcance (fases siguientes): memoria (Sprint 3), imágenes (Sprint 4), reconocimiento de voz (Sprint 5), gamificación (Sprint 6), "estudiar hoy" (Sprint 7).

**Nota de diseño:** las tres modalidades usan estímulo en inglés → respuesta en español (coincide con el ejemplo de opción múltiple del spec y permite que "escribir" reuse `matchesAnswer` para aceptar cualquier variante, honrando la decisión del usuario). El ejemplo textual de "escribir" del documento original mostraba la dirección inversa; se elige inglés→español por consistencia entre modos y por el soporte de variantes.

**Escaneo de placeholders:** sin TBD/TODO; cada paso trae código o comando concreto. ✅

**Consistencia de tipos:** `EK.quiz.answer(value)` → `{correct, expected}` consumido por `renderQuizQuestion`; `EK.quiz.result()` → `{score,total,percent}` consumido por `renderQuizResult`; `EK.quiz.mode()` usado en Reintentar; `parseHash().seg` consumido por `route` y por `render` (caso quiz). Reutiliza `el/clear/go/speakNormal` ya existentes en `ui.js`. ✅
