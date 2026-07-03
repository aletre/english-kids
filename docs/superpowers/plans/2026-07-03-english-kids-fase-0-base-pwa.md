# English Kids — Fase 0: Base + PWA + Datos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar una PWA instalable y offline con la base técnica: estructura de archivos, namespace global `window.EK`, wrapper de `localStorage`, las 112 palabras de vocabulario, wrapper de voz (SpeechSynthesis), estilos base con temas claro/oscuro, y un arnés de pruebas en navegador.

**Architecture:** App single-page en HTML/CSS/JS ES6 con **scripts clásicos** (sin `import/export`). Todo cuelga de un único objeto global `window.EK`. Los archivos se cargan en orden de dependencia desde `index.html`. La lógica pura (storage, datos, validación) se prueba con un arnés de test en el navegador que se abre con doble clic (sin npm/Node).

**Tech Stack:** HTML5, CSS3 (custom properties para temas), JavaScript ES6 (scripts clásicos), Web APIs: `localStorage`, `SpeechSynthesis`, Service Worker, Web App Manifest.

## Global Constraints

- **Sin frameworks** (no React/Angular/Vue/Bootstrap), **sin Node**, **sin npm**, **sin build**, **sin servidor** para desarrollo local.
- **No usar `import`/`export`**: todos los módulos JS son scripts clásicos que extienden `window.EK`.
- Debe abrir con **doble clic en `index.html`** (protocolo `file://`) Y funcionar alojado como PWA en HTTPS.
- Paleta: Verde `#58CC02`, Azul `#1CB0F6`, Amarillo `#FFD43B`, mucho blanco.
- Idioma de voz por defecto: `en-US` (fallback `en-GB`). Velocidad lenta ≈ `0.55`.
- Defaults al primer inicio: tema `light`, velocidad `normal`, idioma `en-US`.
- Vocabulario: exactamente **112 palabras**. `es` siempre es array. `basketball` normalizado a `["baloncesto"]`.
- Repositorio destino: `english-kids` → `https://aletre.github.io/english-kids/`.
- Calidad Open Source: funciones pequeñas, nombres descriptivos, comentarios solo cuando aporten valor.

---

## Estructura de archivos (Fase 0)

- Create: `index.html` — shell HTML, contenedor `#app`, carga de scripts en orden.
- Create: `css/styles.css` — tokens de tema (custom properties), reset, layout base.
- Create: `js/storage.js` — `EK.storage`: wrapper de localStorage con defaults y merge tolerante.
- Create: `js/words.js` — `EK.words` (array de 112) + `EK.wordUtils` (helpers de datos).
- Create: `js/speech.js` — `EK.speech`: SpeechSynthesis normal/lenta + detección de SpeechRecognition.
- Create: `js/app.js` — `EK.app`: bootstrap mínimo (aplica tema guardado, marca app lista).
- Create: `manifest.webmanifest` — metadatos PWA.
- Create: `service-worker.js` — cache-first para offline.
- Create: `assets/logo.svg` — logo simple.
- Create: `assets/icons/icon-192.png`, `assets/icons/icon-512.png` — íconos PWA (generados).
- Create: `tests/test-framework.js` — mini arnés de assert (`EKTest`).
- Create: `tests/tests.html` — página que carga módulos + tests y muestra resultados.
- Create: `tests/storage.test.js`, `tests/words.test.js` — pruebas de lógica.
- Create: `README.md` — cómo abrir, probar y publicar.

---

### Task 1: Scaffold del proyecto + namespace + arnés de test

Crea la estructura mínima y el arnés de pruebas que usarán las tareas siguientes.

**Files:**
- Create: `index.html`
- Create: `js/app.js`
- Create: `tests/test-framework.js`
- Create: `tests/tests.html`

**Interfaces:**
- Produces: `window.EK` (objeto global raíz). `EK.app.init()`. `window.EKTest` con `EKTest.test(name, fn)`, `EKTest.assert(cond, msg)`, `EKTest.assertEqual(a, b, msg)`, `EKTest.assertDeepEqual(a, b, msg)`, `EKTest.run(containerEl)`.

- [ ] **Step 1: Crear el arnés de pruebas `tests/test-framework.js`**

```js
// Mini arnés de pruebas en navegador. Sin dependencias.
// Uso: EKTest.test("nombre", () => { EKTest.assert(cond, "msg"); });
//      EKTest.run(document.getElementById("results"));
(function () {
  "use strict";
  var cases = [];

  function test(name, fn) {
    cases.push({ name: name, fn: fn });
  }

  function assert(cond, msg) {
    if (!cond) throw new Error(msg || "assert falló");
  }

  function assertEqual(actual, expected, msg) {
    if (actual !== expected) {
      throw new Error((msg || "assertEqual falló") + " — esperado: " + expected + ", obtenido: " + actual);
    }
  }

  function assertDeepEqual(actual, expected, msg) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error((msg || "assertDeepEqual falló") + " — esperado: " + JSON.stringify(expected) + ", obtenido: " + JSON.stringify(actual));
    }
  }

  function run(containerEl) {
    var passed = 0, failed = 0;
    cases.forEach(function (c) {
      var row = document.createElement("div");
      try {
        c.fn();
        passed++;
        row.textContent = "PASS — " + c.name;
        row.style.color = "green";
      } catch (e) {
        failed++;
        row.textContent = "FAIL — " + c.name + " :: " + e.message;
        row.style.color = "red";
      }
      containerEl.appendChild(row);
    });
    var summary = document.createElement("h2");
    summary.textContent = passed + " passed, " + failed + " failed";
    summary.style.color = failed === 0 ? "green" : "red";
    containerEl.insertBefore(summary, containerEl.firstChild);
    return { passed: passed, failed: failed };
  }

  window.EKTest = { test: test, assert: assert, assertEqual: assertEqual, assertDeepEqual: assertDeepEqual, run: run };
})();
```

- [ ] **Step 2: Crear `js/app.js` con el bootstrap mínimo**

```js
// Orquestador raíz. En Fase 0 solo inicializa el namespace y marca la app lista.
window.EK = window.EK || {};

EK.app = {
  init: function () {
    // Fase 1 conectará router y vistas aquí. Por ahora, base lista.
    document.documentElement.setAttribute("data-app", "ready");
  }
};

document.addEventListener("DOMContentLoaded", function () {
  EK.app.init();
});
```

- [ ] **Step 3: Crear `index.html` (shell)**

```html
<!DOCTYPE html>
<html lang="es" data-theme="light">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta name="theme-color" content="#58CC02" />
  <title>English Kids</title>
  <link rel="manifest" href="manifest.webmanifest" />
  <link rel="icon" href="assets/logo.svg" type="image/svg+xml" />
  <link rel="apple-touch-icon" href="assets/icons/icon-192.png" />
  <link rel="stylesheet" href="css/styles.css" />
</head>
<body>
  <div id="app">
    <!-- Fase 1 renderizará las vistas aquí -->
  </div>

  <!-- Orden de carga = orden de dependencias. Scripts clásicos, sin type=module. -->
  <script src="js/storage.js"></script>
  <script src="js/words.js"></script>
  <script src="js/speech.js"></script>
  <script src="js/app.js"></script>
  <script>
    // Registro del service worker solo cuando hay HTTP(S) (no en file://).
    if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0) {
      window.addEventListener("load", function () {
        navigator.serviceWorker.register("service-worker.js").catch(function () {});
      });
    }
  </script>
</body>
</html>
```

- [ ] **Step 4: Crear `tests/tests.html` (carga módulos + tests)**

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>English Kids — Tests</title>
</head>
<body>
  <h1>English Kids — Tests</h1>
  <div id="results" style="font-family: monospace; white-space: pre;"></div>

  <!-- Módulos bajo prueba -->
  <script src="../js/storage.js"></script>
  <script src="../js/words.js"></script>

  <!-- Arnés + suites -->
  <script src="test-framework.js"></script>
  <script src="storage.test.js"></script>
  <script src="words.test.js"></script>

  <script>
    EKTest.run(document.getElementById("results"));
  </script>
</body>
</html>
```

- [ ] **Step 5: Verificar en el navegador**

Abrir `index.html` con doble clic. Abrir la consola (F12) y confirmar:
- Sin errores en consola.
- `document.documentElement.getAttribute("data-app")` devuelve `"ready"`.
- `window.EK` existe.

Abrir `tests/tests.html` con doble clic. Como aún no hay suites (`storage.test.js`, `words.test.js` se crean después), el archivo puede dar 404 en esos `<script>`: es esperado en este punto y se resolverá en las tareas 2 y 3.

- [ ] **Step 6: Commit**

```bash
git add index.html js/app.js tests/test-framework.js tests/tests.html
git commit -m "feat: project scaffold, EK namespace and browser test harness"
```

---

### Task 2: `storage.js` — wrapper de localStorage

Persistencia central con defaults y merge tolerante (si falta una clave, se rellena).

**Files:**
- Create: `js/storage.js`
- Create: `tests/storage.test.js`

**Interfaces:**
- Consumes: `window.EK` (Task 1).
- Produces:
  - `EK.storage.DEFAULTS` — objeto con el estado por defecto.
  - `EK.storage.load()` → objeto estado completo (mezcla lo guardado sobre DEFAULTS).
  - `EK.storage.save(state)` → void (persiste todo el estado).
  - `EK.storage.get(path)` → valor en `path` con notación de puntos (ej. `"settings.theme"`).
  - `EK.storage.set(path, value)` → void (asigna y persiste).
  - `EK.storage.reset()` → void (borra el estado).
  - Inyección para tests: `EK.storage._backend` (por defecto `window.localStorage`), sustituible por un mock.

- [ ] **Step 1: Escribir la prueba que falla `tests/storage.test.js`**

```js
(function () {
  "use strict";

  // Mock de localStorage en memoria para pruebas deterministas.
  function makeMemoryBackend() {
    var data = {};
    return {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
      setItem: function (k, v) { data[k] = String(v); },
      removeItem: function (k) { delete data[k]; }
    };
  }

  EKTest.test("storage: load() devuelve DEFAULTS cuando no hay nada guardado", function () {
    EK.storage._backend = makeMemoryBackend();
    var state = EK.storage.load();
    EKTest.assertEqual(state.settings.theme, "light", "theme por defecto debe ser light");
    EKTest.assertEqual(state.settings.lang, "en-US", "lang por defecto debe ser en-US");
    EKTest.assertDeepEqual(state.favorites, [], "favorites por defecto debe ser []");
  });

  EKTest.test("storage: set()/get() por path persiste y lee", function () {
    EK.storage._backend = makeMemoryBackend();
    EK.storage.load();
    EK.storage.set("settings.theme", "dark");
    EKTest.assertEqual(EK.storage.get("settings.theme"), "dark", "debe leer el valor asignado");
  });

  EKTest.test("storage: merge tolerante rellena claves faltantes", function () {
    var backend = makeMemoryBackend();
    backend.setItem("EK.state", JSON.stringify({ favorites: [13] })); // estado parcial/antiguo
    EK.storage._backend = backend;
    var state = EK.storage.load();
    EKTest.assertDeepEqual(state.favorites, [13], "conserva lo guardado");
    EKTest.assertEqual(state.settings.speed, "normal", "rellena settings.speed faltante");
  });
})();
```

- [ ] **Step 2: Abrir `tests/tests.html` y verificar que fallan**

Abrir `tests/tests.html`. Esperado: las 3 pruebas de storage aparecen en **rojo** (FAIL) porque `EK.storage` aún no existe.

- [ ] **Step 3: Implementar `js/storage.js`**

```js
// Persistencia sobre localStorage. Estado único bajo la clave "EK.state".
window.EK = window.EK || {};

EK.storage = (function () {
  "use strict";

  var KEY = "EK.state";

  var DEFAULTS = {
    seen: [],
    favorites: [],
    lastWordId: null,
    settings: { theme: "light", speed: "normal", lang: "en-US" },
    stats: { bestQuiz: 0, studyDays: [] },
    gamification: { xp: 0, level: 1, achievements: [], streak: 0 }
  };

  var _backend = window.localStorage;
  var _state = null;

  // Copia profunda sencilla vía JSON (el estado es solo datos serializables).
  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  // Mezcla recursiva: base (defaults) + override (guardado). Rellena faltantes.
  function merge(base, override) {
    var out = clone(base);
    if (!override || typeof override !== "object") return out;
    Object.keys(override).forEach(function (k) {
      if (base[k] && typeof base[k] === "object" && !Array.isArray(base[k]) &&
          override[k] && typeof override[k] === "object" && !Array.isArray(override[k])) {
        out[k] = merge(base[k], override[k]);
      } else {
        out[k] = override[k];
      }
    });
    return out;
  }

  function load() {
    var raw = null;
    try { raw = api._backend.getItem(KEY); } catch (e) { raw = null; }
    var parsed = null;
    if (raw) {
      try { parsed = JSON.parse(raw); } catch (e) { parsed = null; }
    }
    _state = merge(DEFAULTS, parsed);
    return _state;
  }

  function save(state) {
    _state = state;
    try { api._backend.setItem(KEY, JSON.stringify(_state)); } catch (e) { /* cuota/priv mode */ }
  }

  function ensure() {
    if (_state === null) load();
    return _state;
  }

  function get(path) {
    var obj = ensure();
    var parts = path.split(".");
    for (var i = 0; i < parts.length; i++) {
      if (obj == null) return undefined;
      obj = obj[parts[i]];
    }
    return obj;
  }

  function set(path, value) {
    var obj = ensure();
    var parts = path.split(".");
    for (var i = 0; i < parts.length - 1; i++) {
      if (obj[parts[i]] == null || typeof obj[parts[i]] !== "object") obj[parts[i]] = {};
      obj = obj[parts[i]];
    }
    obj[parts[parts.length - 1]] = value;
    save(_state);
  }

  function reset() {
    try { api._backend.removeItem(KEY); } catch (e) { /* noop */ }
    _state = null;
  }

  var api = {
    DEFAULTS: DEFAULTS,
    _backend: _backend,
    load: load,
    save: save,
    get: get,
    set: set,
    reset: reset
  };
  return api;
})();
```

- [ ] **Step 4: Abrir `tests/tests.html` y verificar que pasan**

Recargar `tests/tests.html`. Esperado: las 3 pruebas de storage en **verde** (PASS).

- [ ] **Step 5: Commit**

```bash
git add js/storage.js tests/storage.test.js
git commit -m "feat: localStorage wrapper with defaults and tolerant merge"
```

---

### Task 3: `words.js` — las 112 palabras + helpers

Dataset completo y utilidades de datos. Las traducciones múltiples son arrays.

**Files:**
- Create: `js/words.js`
- Create: `tests/words.test.js`

**Interfaces:**
- Consumes: `window.EK` (Task 1).
- Produces:
  - `EK.words` — array de 112 objetos `{ id, en, es: [..], emoji|null, category }`.
  - `EK.wordUtils.byId(id)` → objeto palabra o `undefined`.
  - `EK.wordUtils.search(query)` → array de palabras cuyo `en` o cualquier `es` contiene `query` (case/acentos-insensible).
  - `EK.wordUtils.normalize(str)` → string en minúsculas, sin tildes, sin espacios extremos (usado por búsqueda y validación de examen en fases futuras).
  - `EK.wordUtils.matchesAnswer(word, input)` → boolean (input coincide con alguna variante `es` tras normalizar).

- [ ] **Step 1: Escribir la prueba que falla `tests/words.test.js`**

```js
(function () {
  "use strict";

  EKTest.test("words: hay exactamente 112 palabras", function () {
    EKTest.assertEqual(EK.words.length, 112, "deben ser 112 palabras");
  });

  EKTest.test("words: cada palabra tiene forma válida", function () {
    EK.words.forEach(function (w) {
      EKTest.assert(typeof w.id === "number", "id numérico en " + w.en);
      EKTest.assert(typeof w.en === "string" && w.en.length > 0, "en no vacío");
      EKTest.assert(Array.isArray(w.es) && w.es.length >= 1, "es es array no vacío en " + w.en);
      EKTest.assert(w.emoji === null || typeof w.emoji === "string", "emoji string o null en " + w.en);
      EKTest.assert(typeof w.category === "string" && w.category.length > 0, "category en " + w.en);
    });
  });

  EKTest.test("words: los ids son únicos", function () {
    var seen = {};
    EK.words.forEach(function (w) {
      EKTest.assert(!seen[w.id], "id duplicado: " + w.id);
      seen[w.id] = true;
    });
  });

  EKTest.test("words: basketball normalizado a ['baloncesto']", function () {
    var w = EK.words.filter(function (x) { return x.en === "basketball"; })[0];
    EKTest.assertDeepEqual(w.es, ["baloncesto"], "basketball sin duplicado");
  });

  EKTest.test("wordUtils.normalize: minúsculas y sin tildes", function () {
    EKTest.assertEqual(EK.wordUtils.normalize("  Brócoli "), "brocoli", "normaliza tildes y espacios");
  });

  EKTest.test("wordUtils.search: busca en inglés y español", function () {
    var byEn = EK.wordUtils.search("butter");
    EKTest.assert(byEn.some(function (w) { return w.en === "butterfly"; }), "encuentra butterfly por inglés");
    var byEs = EK.wordUtils.search("maripo");
    EKTest.assert(byEs.some(function (w) { return w.en === "butterfly"; }), "encuentra butterfly por español");
  });

  EKTest.test("wordUtils.matchesAnswer: acepta cualquier variante e ignora tildes", function () {
    var grumpy = EK.wordUtils.byId(43);
    EKTest.assert(EK.wordUtils.matchesAnswer(grumpy, "gruñon"), "acepta 'gruñon' sin tilde");
    EKTest.assert(EK.wordUtils.matchesAnswer(grumpy, "MALHUMORADO"), "acepta la segunda variante");
    EKTest.assert(!EK.wordUtils.matchesAnswer(grumpy, "feliz"), "rechaza incorrecta");
  });
})();
```

- [ ] **Step 2: Abrir `tests/tests.html` y verificar que fallan**

Esperado: pruebas de words en **rojo** (FAIL) porque `EK.words` / `EK.wordUtils` no existen.

- [ ] **Step 3: Implementar `js/words.js` con las 112 palabras**

> Emoji asignado donde hay uno claramente representativo; `null` para palabras
> abstractas o sin emoji fiel (la UI mostrará la inicial estilizada). Categorías
> inferidas para habilitar el futuro filtrado. `es` siempre array; variantes con
> `/` del listado original divididas en elementos.

```js
window.EK = window.EK || {};

EK.words = [
  { id: 1,   en: "absence",      es: ["ausencia"],                     emoji: null,  category: "abstract" },
  { id: 2,   en: "airport",      es: ["aeropuerto"],                   emoji: "✈️",  category: "places" },
  { id: 3,   en: "alphabet",     es: ["alfabeto"],                     emoji: "🔤",  category: "school" },
  { id: 4,   en: "antibiotic",   es: ["antibiótico"],                  emoji: "💊",  category: "health" },
  { id: 5,   en: "basketball",   es: ["baloncesto"],                   emoji: "🏀",  category: "sports" },
  { id: 6,   en: "between",      es: ["entre"],                        emoji: null,  category: "abstract" },
  { id: 7,   en: "blood",        es: ["sangre"],                       emoji: "🩸",  category: "body" },
  { id: 8,   en: "bounce",       es: ["rebotar"],                      emoji: null,  category: "action" },
  { id: 9,   en: "breakfast",    es: ["desayuno"],                     emoji: "🍳",  category: "food" },
  { id: 10,  en: "broccoli",     es: ["brócoli"],                      emoji: "🥦",  category: "food" },
  { id: 11,  en: "busy",         es: ["ocupado"],                      emoji: null,  category: "feelings" },
  { id: 12,  en: "businessman",  es: ["hombre de negocios"],           emoji: "👨‍💼", category: "people" },
  { id: 13,  en: "butterfly",    es: ["mariposa"],                     emoji: "🦋",  category: "animals" },
  { id: 14,  en: "Christmas",    es: ["Navidad"],                      emoji: "🎄",  category: "holidays" },
  { id: 15,  en: "chores",       es: ["quehaceres"],                   emoji: "🧹",  category: "home" },
  { id: 16,  en: "claws",        es: ["garras"],                       emoji: null,  category: "animals" },
  { id: 17,  en: "coach",        es: ["entrenador"],                   emoji: null,  category: "people" },
  { id: 18,  en: "comfortable",  es: ["cómodo"],                       emoji: null,  category: "feelings" },
  { id: 19,  en: "community",    es: ["comunidad"],                    emoji: null,  category: "abstract" },
  { id: 20,  en: "compass",      es: ["brújula"],                      emoji: "🧭",  category: "objects" },
  { id: 21,  en: "cough",        es: ["tos"],                          emoji: "😷",  category: "health" },
  { id: 22,  en: "cracker",      es: ["galleta salada"],               emoji: "🍘",  category: "food" },
  { id: 23,  en: "crawl",        es: ["gatear"],                       emoji: null,  category: "action" },
  { id: 24,  en: "curtains",     es: ["cortinas"],                     emoji: "🪟",  category: "home" },
  { id: 25,  en: "daughter",     es: ["hija"],                         emoji: "👧",  category: "family" },
  { id: 26,  en: "designer",     es: ["diseñador"],                    emoji: "🧑‍🎨", category: "people" },
  { id: 27,  en: "diamond",      es: ["diamante"],                     emoji: "💎",  category: "objects" },
  { id: 28,  en: "dictionary",   es: ["diccionario"],                  emoji: "📖",  category: "school" },
  { id: 29,  en: "dinosaurs",    es: ["dinosaurios"],                  emoji: "🦕",  category: "animals" },
  { id: 30,  en: "drawing",      es: ["dibujo"],                       emoji: "🎨",  category: "school" },
  { id: 31,  en: "earache",      es: ["dolor de oído"],                emoji: "👂",  category: "health" },
  { id: 32,  en: "earrings",     es: ["aretes", "pendientes"],         emoji: null,  category: "objects" },
  { id: 33,  en: "eyebrows",     es: ["cejas"],                        emoji: null,  category: "body" },
  { id: 34,  en: "excellent",    es: ["excelente"],                    emoji: "👍",  category: "feelings" },
  { id: 35,  en: "excited",      es: ["emocionado"],                   emoji: "🤩",  category: "feelings" },
  { id: 36,  en: "exercise",     es: ["ejercicio"],                    emoji: "🏃",  category: "sports" },
  { id: 37,  en: "fingernails",  es: ["uñas de las manos"],            emoji: "💅",  category: "body" },
  { id: 38,  en: "flippers",     es: ["aletas"],                       emoji: "🤿",  category: "objects" },
  { id: 39,  en: "forehead",     es: ["frente"],                       emoji: null,  category: "body" },
  { id: 40,  en: "friendship",   es: ["amistad"],                      emoji: "🤝",  category: "feelings" },
  { id: 41,  en: "grandparents", es: ["abuelos"],                      emoji: "👵",  category: "family" },
  { id: 42,  en: "greeting",     es: ["saludo"],                       emoji: "👋",  category: "abstract" },
  { id: 43,  en: "grumpy",       es: ["gruñón", "malhumorado"],        emoji: "😠",  category: "feelings" },
  { id: 44,  en: "half",         es: ["mitad"],                        emoji: null,  category: "math" },
  { id: 45,  en: "handsome",     es: ["guapo"],                        emoji: null,  category: "feelings" },
  { id: 46,  en: "harmony",      es: ["armonía"],                      emoji: null,  category: "abstract" },
  { id: 47,  en: "headache",     es: ["dolor de cabeza"],              emoji: "🤕",  category: "health" },
  { id: 48,  en: "hurt",         es: ["herir", "doler"],               emoji: "😣",  category: "health" },
  { id: 49,  en: "imagination",  es: ["imaginación"],                  emoji: "💭",  category: "abstract" },
  { id: 50,  en: "juice",        es: ["jugo"],                         emoji: "🧃",  category: "food" },
  { id: 51,  en: "kangaroo",     es: ["canguro"],                      emoji: "🦘",  category: "animals" },
  { id: 52,  en: "knock",        es: ["tocar (la puerta)"],            emoji: "🚪",  category: "action" },
  { id: 53,  en: "leaf",         es: ["hoja"],                         emoji: "🍃",  category: "nature" },
  { id: 54,  en: "leave",        es: ["salir", "dejar"],               emoji: null,  category: "action" },
  { id: 55,  en: "lettuce",      es: ["lechuga"],                      emoji: "🥬",  category: "food" },
  { id: 56,  en: "mammal",       es: ["mamífero"],                     emoji: "🐘",  category: "animals" },
  { id: 57,  en: "microwave",    es: ["microondas"],                   emoji: null,  category: "home" },
  { id: 58,  en: "mucus",        es: ["mucosidad"],                    emoji: "🤧",  category: "health" },
  { id: 59,  en: "mushroom",     es: ["hongo", "champiñón"],           emoji: "🍄",  category: "food" },
  { id: 60,  en: "nephew",       es: ["sobrino"],                      emoji: "👦",  category: "family" },
  { id: 61,  en: "niece",        es: ["sobrina"],                      emoji: "👧",  category: "family" },
  { id: 62,  en: "ninety",       es: ["noventa"],                      emoji: "🔢",  category: "numbers" },
  { id: 63,  en: "oatmeal",      es: ["avena"],                        emoji: "🥣",  category: "food" },
  { id: 64,  en: "once",         es: ["una vez"],                      emoji: null,  category: "abstract" },
  { id: 65,  en: "paragraph",    es: ["párrafo"],                      emoji: "📄",  category: "school" },
  { id: 66,  en: "paws",         es: ["patas"],                        emoji: "🐾",  category: "animals" },
  { id: 67,  en: "peanuts",      es: ["maní", "cacahuates"],           emoji: "🥜",  category: "food" },
  { id: 68,  en: "pineapple",    es: ["piña"],                         emoji: "🍍",  category: "food" },
  { id: 69,  en: "protein",      es: ["proteína"],                     emoji: "💪",  category: "health" },
  { id: 70,  en: "quarter",      es: ["cuarto", "cuarta parte"],       emoji: null,  category: "math" },
  { id: 71,  en: "referee",      es: ["árbitro"],                      emoji: null,  category: "sports" },
  { id: 72,  en: "reptile",      es: ["reptil"],                       emoji: "🦎",  category: "animals" },
  { id: 73,  en: "rhyme",        es: ["rima"],                         emoji: null,  category: "school" },
  { id: 74,  en: "sanitizer",    es: ["desinfectante"],                emoji: "🧴",  category: "health" },
  { id: 75,  en: "sausage",      es: ["salchicha"],                    emoji: "🌭",  category: "food" },
  { id: 76,  en: "skeleton",     es: ["esqueleto"],                    emoji: "💀",  category: "body" },
  { id: 77,  en: "sneeze",       es: ["estornudar"],                   emoji: "🤧",  category: "health" },
  { id: 78,  en: "sore throat",  es: ["dolor de garganta"],            emoji: "😷",  category: "health" },
  { id: 79,  en: "spikes",       es: ["púas"],                         emoji: null,  category: "objects" },
  { id: 80,  en: "spinach",      es: ["espinaca"],                     emoji: null,  category: "food" },
  { id: 81,  en: "stomachache",  es: ["dolor de estómago"],            emoji: "🤢",  category: "health" },
  { id: 82,  en: "strawberry",   es: ["fresa"],                        emoji: "🍓",  category: "food" },
  { id: 83,  en: "tennis",       es: ["tenis"],                        emoji: "🎾",  category: "sports" },
  { id: 84,  en: "subtraction",  es: ["resta"],                        emoji: "➖",  category: "math" },
  { id: 85,  en: "surprised",    es: ["sorprendido"],                  emoji: "😲",  category: "feelings" },
  { id: 86,  en: "teaspoon",     es: ["cucharadita"],                  emoji: "🥄",  category: "objects" },
  { id: 87,  en: "temperature",  es: ["temperatura"],                  emoji: null,  category: "health" },
  { id: 88,  en: "thermometer",  es: ["termómetro"],                   emoji: "🌡️",  category: "health" },
  { id: 89,  en: "through",      es: ["a través de"],                  emoji: null,  category: "abstract" },
  { id: 90,  en: "tissue",       es: ["pañuelo desechable"],           emoji: null,  category: "health" },
  { id: 91,  en: "tomato",       es: ["tomate"],                       emoji: "🍅",  category: "food" },
  { id: 92,  en: "tooth",        es: ["diente"],                       emoji: "🦷",  category: "body" },
  { id: 93,  en: "twice",        es: ["dos veces"],                    emoji: null,  category: "abstract" },
  { id: 94,  en: "unhealthy",    es: ["poco saludable"],               emoji: null,  category: "health" },
  { id: 95,  en: "usually",      es: ["usualmente"],                   emoji: null,  category: "abstract" },
  { id: 96,  en: "vegetables",   es: ["verduras"],                     emoji: "🥗",  category: "food" },
  { id: 97,  en: "virus",        es: ["virus"],                        emoji: "🦠",  category: "health" },
  { id: 98,  en: "volleyball",   es: ["voleibol"],                     emoji: "🏐",  category: "sports" },
  { id: 99,  en: "yogurt",       es: ["yogur"],                        emoji: "🥛",  category: "food" },
  { id: 100, en: "zipper",       es: ["cremallera", "cierre"],         emoji: null,  category: "objects" },
  { id: 101, en: "chest",        es: ["pecho"],                        emoji: null,  category: "body" },
  { id: 102, en: "treasure",     es: ["tesoro"],                       emoji: "💰",  category: "objects" },
  { id: 103, en: "cookie",       es: ["galleta"],                      emoji: "🍪",  category: "food" },
  { id: 104, en: "horn",         es: ["cuerno"],                       emoji: null,  category: "animals" },
  { id: 105, en: "island",       es: ["isla"],                         emoji: "🏝️",  category: "places" },
  { id: 106, en: "across",       es: ["al otro lado de"],              emoji: null,  category: "abstract" },
  { id: 107, en: "fever",        es: ["fiebre"],                       emoji: "🤒",  category: "health" },
  { id: 108, en: "cold",         es: ["resfriado"],                    emoji: "🤧",  category: "health" },
  { id: 109, en: "medicine",     es: ["medicina"],                     emoji: "💊",  category: "health" },
  { id: 110, en: "kick",         es: ["patear"],                       emoji: "🦵",  category: "sports" },
  { id: 111, en: "catch",        es: ["atrapar"],                      emoji: "🧤",  category: "sports" },
  { id: 112, en: "throw",        es: ["lanzar"],                       emoji: null,  category: "sports" }
];

EK.wordUtils = (function () {
  "use strict";

  // Quita tildes/diacríticos, pasa a minúsculas, recorta extremos.
  function normalize(str) {
    return String(str)
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "");
  }

  function byId(id) {
    for (var i = 0; i < EK.words.length; i++) {
      if (EK.words[i].id === id) return EK.words[i];
    }
    return undefined;
  }

  function search(query) {
    var q = normalize(query);
    if (q === "") return EK.words.slice();
    return EK.words.filter(function (w) {
      if (normalize(w.en).indexOf(q) !== -1) return true;
      return w.es.some(function (t) { return normalize(t).indexOf(q) !== -1; });
    });
  }

  function matchesAnswer(word, input) {
    var normInput = normalize(input);
    if (normInput === "") return false;
    return word.es.some(function (t) { return normalize(t) === normInput; });
  }

  return { normalize: normalize, byId: byId, search: search, matchesAnswer: matchesAnswer };
})();
```

- [ ] **Step 4: Abrir `tests/tests.html` y verificar que pasan**

Recargar `tests/tests.html`. Esperado: todas las pruebas de words en **verde** (PASS), incluyendo el conteo de 112.

- [ ] **Step 5: Commit**

```bash
git add js/words.js tests/words.test.js
git commit -m "feat: 112-word dataset and word utilities (search, normalize, match)"
```

---

### Task 4: `speech.js` — SpeechSynthesis + detección de reconocimiento

Pronunciación normal/lenta, elección de voz `en-US`/`en-GB`, y detección de soporte de reconocimiento (para Sprint 5).

**Files:**
- Create: `js/speech.js`

**Interfaces:**
- Consumes: `window.EK` (Task 1).
- Produces:
  - `EK.speech.speak(text, opts)` — `opts = { rate }`; usa voz `en-US`/`en-GB` si existen.
  - `EK.speech.speakSlow(text)` — atajo con `rate = 0.55`.
  - `EK.speech.isRecognitionSupported()` → boolean.
  - `EK.speech.isSupported()` → boolean (SpeechSynthesis disponible).

- [ ] **Step 1: Implementar `js/speech.js`**

> Este módulo depende de APIs del navegador (voz) que no se pueden asertar en el
> arnés headless; se verifica manualmente en el navegador (Step 2). No se escribe
> test automático para evitar falsos negativos por disponibilidad de voces.

```js
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
```

- [ ] **Step 2: Verificar manualmente en el navegador**

Abrir `index.html`, abrir consola y ejecutar:
- `EK.speech.isSupported()` → `true` en Chrome/Edge/Firefox/Safari modernos.
- `EK.speech.speak("butterfly")` → se escucha "butterfly".
- `EK.speech.speakSlow("butterfly")` → se escucha más lento.
- `EK.speech.isRecognitionSupported()` → `true` en Chrome/Edge; `false` en la mayoría de iPad (esperado).

- [ ] **Step 3: Commit**

```bash
git add js/speech.js index.html
git commit -m "feat: speech synthesis wrapper with voice selection and recognition detection"
```

---

### Task 5: `css/styles.css` — tokens de tema y layout base

Custom properties para temas claro/oscuro, reset y utilidades base con la paleta Duolingo.

**Files:**
- Create: `css/styles.css`

**Interfaces:**
- Consumes: atributo `data-theme` en `<html>` (aplicado por `EK.app` en Fase 1).
- Produces: variables CSS (`--color-green`, `--color-blue`, `--color-yellow`, `--bg`, `--surface`, `--text`, `--radius`, etc.) y clases base reutilizables por la UI de Fase 1.

- [ ] **Step 1: Implementar `css/styles.css`**

```css
/* ===== Reset mínimo ===== */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { -webkit-text-size-adjust: 100%; }
img, svg { max-width: 100%; display: block; }
button { font: inherit; cursor: pointer; }

/* ===== Tokens de tema ===== */
:root {
  --color-green: #58CC02;
  --color-blue: #1CB0F6;
  --color-yellow: #FFD43B;

  --bg: #FFFFFF;
  --surface: #F7F7F7;
  --surface-2: #EDEDED;
  --text: #3C3C3C;
  --text-muted: #777777;
  --border: #E5E5E5;

  --radius: 18px;
  --radius-lg: 28px;
  --shadow: 0 4px 0 rgba(0,0,0,0.08);
  --space: 16px;
  --font: "Nunito", "Segoe UI", system-ui, -apple-system, Arial, sans-serif;
  --tap: 56px; /* área mínima táctil para botones grandes */
}

:root[data-theme="dark"] {
  --bg: #131F24;
  --surface: #1C2A31;
  --surface-2: #26363D;
  --text: #F1F7FB;
  --text-muted: #9FB2BC;
  --border: #2E4149;
  --shadow: 0 4px 0 rgba(0,0,0,0.35);
}

/* ===== Base ===== */
body {
  font-family: var(--font);
  background: var(--bg);
  color: var(--text);
  line-height: 1.5;
  min-height: 100vh;
  transition: background 0.2s ease, color 0.2s ease;
}

#app {
  max-width: 720px;
  margin: 0 auto;
  padding: var(--space);
}

/* ===== Componentes base (usados por Fase 1) ===== */
.ek-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: var(--tap);
  padding: 0 24px;
  border: none;
  border-radius: var(--radius);
  background: var(--color-green);
  color: #fff;
  font-weight: 800;
  box-shadow: var(--shadow);
  transition: transform 0.05s ease, filter 0.15s ease;
}
.ek-btn:active { transform: translateY(2px); box-shadow: none; }
.ek-btn--blue { background: var(--color-blue); }
.ek-btn--muted { background: var(--surface-2); color: var(--text); }

.ek-card {
  background: var(--surface);
  border: 2px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 28px;
  text-align: center;
}

.ek-progress {
  height: 18px;
  background: var(--surface-2);
  border-radius: 999px;
  overflow: hidden;
}
.ek-progress__fill {
  height: 100%;
  background: var(--color-green);
  width: 0%;
  transition: width 0.3s ease;
}

/* ===== Responsive ===== */
@media (min-width: 900px) {
  #app { padding: 32px; }
}
```

- [ ] **Step 2: Verificar manualmente**

Abrir `index.html`. La página debe verse en blanco (modo claro) sin errores.
En consola, ejecutar `document.documentElement.setAttribute("data-theme","dark")`
y confirmar que el fondo cambia a oscuro.

- [ ] **Step 3: Commit**

```bash
git add css/styles.css
git commit -m "feat: theme tokens (light/dark) and base component styles"
```

---

### Task 6: PWA — manifest, íconos, service worker, README

Hace la app instalable y funcional offline. Íconos y logo mínimos.

**Files:**
- Create: `manifest.webmanifest`
- Create: `service-worker.js`
- Create: `assets/logo.svg`
- Create: `assets/icons/icon-192.png`
- Create: `assets/icons/icon-512.png`
- Create: `README.md`

**Interfaces:**
- Consumes: `index.html` (Task 1) ya enlaza el manifest y registra el SW.
- Produces: app instalable; cache offline de los recursos del núcleo.

- [ ] **Step 1: Crear `assets/logo.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" role="img" aria-label="English Kids">
  <rect width="120" height="120" rx="28" fill="#58CC02"/>
  <text x="60" y="78" font-family="Arial, sans-serif" font-size="64" font-weight="bold"
        text-anchor="middle" fill="#FFFFFF">EK</text>
</svg>
```

- [ ] **Step 2: Generar los íconos PNG (192 y 512)**

Los PNG no se pueden escribir a mano. Genéralos desde el navegador (sin instalar nada):
abrir la consola en `index.html`, pegar y ejecutar este script; descargará ambos íconos.
Luego muévelos a `assets/icons/`.

```js
[192, 512].forEach(function (size) {
  var c = document.createElement("canvas");
  c.width = c.height = size;
  var ctx = c.getContext("2d");
  ctx.fillStyle = "#58CC02";
  var r = size * 0.23;
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, r);
  ctx.fill();
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold " + (size * 0.5) + "px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("EK", size / 2, size / 2 + size * 0.03);
  var a = document.createElement("a");
  a.href = c.toDataURL("image/png");
  a.download = "icon-" + size + ".png";
  a.click();
});
```

Verificación: existen `assets/icons/icon-192.png` y `assets/icons/icon-512.png`.

- [ ] **Step 3: Crear `manifest.webmanifest`**

```json
{
  "name": "English Kids",
  "short_name": "English Kids",
  "description": "Aprende vocabulario en inglés jugando.",
  "start_url": ".",
  "scope": ".",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#FFFFFF",
  "theme_color": "#58CC02",
  "icons": [
    { "src": "assets/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "assets/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "assets/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

- [ ] **Step 4: Crear `service-worker.js` (cache-first)**

```js
// Service worker: precache del núcleo para funcionamiento offline.
var CACHE = "english-kids-v1";
var CORE = [
  ".",
  "index.html",
  "css/styles.css",
  "js/storage.js",
  "js/words.js",
  "js/speech.js",
  "js/app.js",
  "manifest.webmanifest",
  "assets/logo.svg",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE); }));
  self.skipWaiting();
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(function (cached) {
      return cached || fetch(e.request).then(function (res) {
        return caches.open(CACHE).then(function (c) {
          try { c.put(e.request, res.clone()); } catch (err) {}
          return res;
        });
      }).catch(function () { return cached; });
    })
  );
});
```

- [ ] **Step 5: Crear `README.md`**

```markdown
# English Kids

Aplicación web para aprender vocabulario en inglés (112 palabras), estilo Duolingo.
Sin frameworks, sin dependencias, funciona offline como PWA.

## Uso local
Abre `index.html` con doble clic. No requiere servidor ni instalación.
(El service worker/PWA solo se activa cuando la app está servida por HTTP/HTTPS.)

## Pruebas
Abre `tests/tests.html` con doble clic. Muestra los resultados en verde/rojo.

## Publicar como PWA (GitHub Pages)
1. Crea el repositorio `english-kids` en tu cuenta de GitHub.
2. Sube el contenido: `git push origin main`.
3. En GitHub: Settings → Pages → Source: `main` / carpeta raíz.
4. La app quedará en `https://<usuario>.github.io/english-kids/`.
5. En la tablet: abre esa URL y usa "Agregar a pantalla de inicio".

## Estructura
- `index.html` — shell y carga de módulos.
- `css/styles.css` — estilos y temas claro/oscuro.
- `js/` — módulos (`storage`, `words`, `speech`, `app`, ...).
- `assets/` — logo e íconos.
- `tests/` — arnés de pruebas en navegador.
```

- [ ] **Step 6: Verificar la PWA con un servidor local temporal (opcional pero recomendado)**

El SW no corre bajo `file://`. Si tienes Python instalado, puedes verificar (sin npm):
`python -m http.server 8000` y abrir `http://localhost:8000`. En DevTools →
Application → Manifest debe listar "English Kids" y los íconos; Service Workers
debe mostrarlo activado. Si no tienes Python, esta verificación se hará al publicar
en GitHub Pages.

- [ ] **Step 7: Commit**

```bash
git add manifest.webmanifest service-worker.js assets/ README.md
git commit -m "feat: PWA manifest, icons, offline service worker and README"
```

---

## Self-Review

**Cobertura del spec (Fase 0):**
- Estructura de archivos modular → Tasks 1-6. ✅
- Namespace `window.EK` sin `import/export` → Task 1. ✅
- `localStorage` con defaults → Task 2. ✅
- 112 palabras, `es` array, `basketball` normalizado → Task 3. ✅
- Búsqueda EN/ES y `matchesAnswer` (base del examen) → Task 3. ✅
- SpeechSynthesis normal/lenta (0.55), voz en-US/en-GB, detección de reconocimiento → Task 4. ✅
- Temas claro/oscuro con variables CSS, paleta Duolingo, responsive → Task 5. ✅
- PWA (manifest + SW offline), íconos, README con publicación → Task 6. ✅
- Defaults tema light / lang en-US → Task 2 (DEFAULTS). ✅

Elementos de Sprints 1-7 (vistas, examen UI, memoria, gamificación, "estudiar hoy",
reconocimiento de voz activo) quedan **fuera de esta fase** por diseño; se cubren en
planes posteriores.

**Escaneo de placeholders:** sin TBD/TODO. Todo paso con código o comando concreto. ✅

**Consistencia de tipos:** `EK.storage.get/set` por path de puntos usados de forma
consistente; `EK.wordUtils.normalize` reutilizado por `search` y `matchesAnswer`;
`es` es array en todo el dataset y en las utilidades. ✅
