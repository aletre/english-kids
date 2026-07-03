# English Kids — Documento de Diseño (Spec)

**Versión:** 1.0
**Fecha:** 2026-07-03
**Estado:** Aprobado, pendiente de plan de implementación

> Este spec refina y toma decisiones sobre el documento de arquitectura original
> (`English Kids.md`). Donde haya conflicto, este documento manda.

---

## 1. Objetivo

Aplicación web educativa para que niños de 6 a 12 años aprendan vocabulario en
inglés de forma interactiva, estilo Duolingo. Debe funcionar **offline**,
publicarse como **PWA** y ser reutilizable con otras listas de vocabulario.

## 2. Decisiones tomadas (resumen)

| Tema | Decisión |
|---|---|
| Vocabulario | Las 112 palabras provistas por el usuario (inglés + español) |
| Alcance | App completa (Sprints 1-7), implementada por fases secuenciales |
| Stack | HTML5 + CSS3 + JavaScript ES6, **sin frameworks, sin build, sin npm** |
| Módulos JS | **Scripts clásicos** bajo namespace global `window.EK` (NO `import/export`) |
| Distribución | **PWA en GitHub Pages**, cuenta `aletre` → `https://aletre.github.io/english-kids/` |
| Visual tarjetas | Emoji donde exista; inicial estilizada en círculo de color donde no |
| Imágenes (Sprint 4) | Emojis grandes como ilustración (offline, sin licencias) |
| Reconoc. voz (Sprint 5) | Opcional con detección de soporte; se oculta si el dispositivo no lo permite (ej. iPad) |
| Examen escribir | Acepta **cualquier** variante de traducción; ignora tildes y mayúsculas |
| Defaults | Tema **Claro** + voz **English US** (todo cambiable en Configuración) |

### 2.1 Justificación de decisiones clave

- **Scripts clásicos, no ES6 modules:** los módulos ES6 (`<script type="module">`)
  se bloquean por CORS bajo `file://` en la mayoría de navegadores. Usar scripts
  clásicos con namespace `window.EK` permite que el **mismo código** funcione
  abriendo `index.html` con doble clic (escritorio) Y alojado como PWA (tablet).
- **PWA para tablet:** abrir un `index.html` local en una tablet (iPad/Android) es
  inviable. La vía profesional es alojar en URL con HTTPS (GitHub Pages) y usar
  "Agregar a pantalla de inicio". Requiere HTTPS para el service worker.
- **Emojis en vez de 112 imágenes:** evita problemas de licencias, peso del bundle
  offline y trabajo de sourcing. Cumple el Sprint 4 con visuales limpios.

## 3. Arquitectura de archivos

```
english-kids/
├── index.html              # ~250 líneas — estructura + contenedores de vistas
├── manifest.webmanifest    # PWA: nombre, íconos, colores, display standalone
├── service-worker.js       # cachea todos los recursos para offline
├── css/
│   └── styles.css          # ~900 — variables CSS (temas claro/oscuro), layout responsive
├── js/
│   ├── app.js              # orquestador: init, router de vistas (hash), eventos, teclado
│   ├── ui.js               # render de pantallas y componentes (manipulación DOM)
│   ├── storage.js          # wrapper de localStorage (get/set con namespace + defaults)
│   ├── speech.js           # SpeechSynthesis (normal/lenta) + SpeechRecognition opcional
│   ├── words.js            # las 112 palabras + emoji + metadatos
│   ├── quiz.js             # exámenes: opción múltiple, escribir, escuchar
│   ├── memory.js           # juego de parejas
│   ├── settings.js         # tema, velocidad, idioma
│   └── gamification.js     # XP, niveles, logros, rachas (Sprint 6)
├── assets/
│   ├── logo.svg
│   └── icons/              # íconos PWA (192x192, 512x512)
└── README.md
```

- Cada archivo tiene **una única responsabilidad**.
- Todo cuelga de `window.EK` (ej. `EK.words`, `EK.storage`, `EK.speech`).
- El orden de carga en `index.html` respeta dependencias (storage y words antes que app).
- `gamification.js` es un módulo adicional al doc original: el Sprint 6 introduce
  gamificación pero el doc no le asigna archivo. Se le da uno propio para respetar
  "una responsabilidad por archivo".

## 4. Modelo de datos

### 4.1 Vocabulario (`words.js`)

```js
window.EK = window.EK || {};
EK.words = [
  { id: 13, en: "butterfly", es: ["mariposa"], emoji: "🦋", category: "animals" },
  { id: 43, en: "grumpy",    es: ["gruñón", "malhumorado"], emoji: "😠", category: "feelings" },
  { id: 1,  en: "absence",   es: ["ausencia"], emoji: null, category: "abstract" },
  // ... 112 en total
];
```

Reglas de datos:
- `es` es **siempre un array**. Las traducciones separadas por `/` en la lista
  original se dividen en elementos (ej. `"gruñón / malhumorado"` → `["gruñón","malhumorado"]`).
- Corrección: la palabra #5 `basketball` tenía "baloncesto / baloncesto" (duplicado);
  se normaliza a `["baloncesto"]`.
- `emoji: null` → la UI renderiza la inicial de la palabra inglesa en un círculo de
  color (color derivado de la categoría o del índice).
- `category` se infiere (animals, food, body, feelings, sports, health, family,
  school, abstract, etc.). Habilita "Futuro: categorías" sin costo extra.

### 4.2 Estado del usuario (localStorage vía `storage.js`)

Clave raíz `EK.state`:

```js
{
  seen: [/* ids de palabras vistas */],
  favorites: [/* ids marcados con ⭐ */],
  lastWordId: 13,
  settings: { theme: "light", speed: "normal", lang: "en-US" },
  stats: {
    bestQuiz: 0,           // mejor puntaje de examen (%)
    studyDays: [/* fechas ISO de días con estudio */]
  },
  gamification: { xp: 0, level: 1, achievements: [], streak: 0 }
}
```

- `storage.js` provee defaults y valida el objeto al cargar (migración tolerante:
  si falta una clave, se rellena con el default sin romper).
- Escritura automática al marcar favorita, ver palabra, terminar examen, etc.

## 5. Pantallas y navegación

Single-page: `index.html` con contenedores de vista que `app.js` muestra/oculta
mediante un **router por hash** (`#home`, `#study`, `#quiz`, `#memory`,
`#favorites`, `#settings`, `#today`).

- **Principal (`#home`):** logo, barra de progreso (`██████░░ 47% — 53 de 112`),
  buscador, botones grandes: Estudiar · Favoritas · Examen · Memoria · Estudiar hoy
  · Configuración. Muestra nivel/XP/racha de gamificación.
- **Estudio (`#study`):** tarjeta con emoji/inicial grande, palabra en inglés,
  traducción en español, `🔊 Pronunciar`, `🐢 Pronunciación lenta`, `⭐ Favorita`,
  navegación `◀ 12 / 112 ▶`. Marca la palabra como vista.
- **Buscador:** filtra en vivo por inglés **y** español (coincidencia parcial).
- **Examen (`#quiz`):** 3 modos (ver sección 6).
- **Memoria (`#memory`):** parejas inglés↔español, animaciones, contador y tiempo.
- **Estudiar hoy (`#today`):** ~10 palabras → Aprender → Repasar → Mini examen → Resultado.
- **Configuración (`#settings`):** tema (Claro/Oscuro), velocidad (Muy lenta/Lenta/Normal),
  idioma (English US / English UK, según disponibilidad de voces).

### Estilo (inspirado en Duolingo)
- Limpio, mucho espacio en blanco, botones grandes, esquinas redondeadas.
- Responsive: Desktop, Tablet, Celular.
- Paleta: Verde `#58CC02`, Azul `#1CB0F6`, Amarillo `#FFD43B`, blanco.
- Modo claro/oscuro mediante variables CSS (`:root` / `[data-theme="dark"]`).

### Navegación
- **Mouse, Touch y Teclado.** Teclas: `←` anterior, `→` siguiente, `Espacio`
  pronunciar, `Enter` confirmar/avanzar.

## 6. Exámenes (`quiz.js`) — Sprint 2

Tres modalidades:

1. **Opción múltiple:** muestra la palabra en inglés y 4 opciones de traducción
   (1 correcta + 3 distractores aleatorios de otras palabras).
2. **Escribir:** muestra el español, el niño escribe el inglés (o viceversa).
   Validación: **acepta cualquier variante** de la traducción, **ignora tildes y
   mayúsculas**, recorta espacios. (No se aceptan errores de tecleo: comparación
   exacta tras normalizar.)
3. **Escuchar:** reproduce una palabra con SpeechSynthesis; el niño elige la
   correcta entre opciones.

Al terminar: puntaje, actualización de `stats.bestQuiz` y XP.

## 7. Pronunciación (`speech.js`)

- **SpeechSynthesis** para voz normal y lenta (velocidad lenta ≈ `0.55`).
- Preferir voz `en-US`; si no existe, `en-GB`.
- **SpeechRecognition (Sprint 5)** es opcional: se detecta soporte
  (`window.SpeechRecognition || window.webkitSpeechRecognition`). Si no está
  disponible (ej. iPad/Safari) la opción se **oculta limpiamente**, sin errores.
  Comparación texto-a-texto (acierta / no acierta la palabra), no evalúa acento.

## 8. PWA y offline

- `manifest.webmanifest`: nombre, íconos 192/512, `theme_color`, `background_color`,
  `display: standalone`, `start_url`.
- `service-worker.js`: cachea `index.html`, CSS, JS, assets en la instalación
  (cache-first) para funcionamiento offline tras la primera carga.
- Requiere HTTPS → GitHub Pages lo provee. Publicación en
  `https://aletre.github.io/english-kids/`.

## 9. Gamificación (`gamification.js`) — Sprint 6

- **XP** por acciones (ver palabra, acertar examen, completar memoria).
- **Niveles** derivados del XP.
- **Logros / medallas:** 🥉 25 palabras, 🥈 50 palabras, 🥇 100 palabras, etc.
- **Rachas** por días consecutivos de estudio.

## 10. Estadísticas

Guardar y mostrar: palabras vistas, favoritas, porcentaje aprendido, mejor examen,
días de estudio.

## 11. Calidad de código

Escribir como proyecto Open Source: principios SOLID donde apliquen, separación de
responsabilidades, funciones pequeñas, nombres descriptivos, comentarios solo
cuando aporten valor, código limpio. README con instrucciones de uso y publicación.

## 12. Plan de implementación por fases

Cada fase será su propio plan (spec → plan → implementación) para validación incremental.

0. **Base + PWA:** estructura de archivos, `styles.css` con temas, `storage.js`,
   `words.js` (112 palabras), `speech.js`, `manifest` + `service-worker`.
   Resultado: app instalable, base técnica validada.
1. **Sprint 1:** principal, estudio, buscador, favoritas, progreso, configuración.
   Resultado: app usable de punta a punta.
2. **Sprint 2:** exámenes (3 modos).
3. **Sprint 3:** juego de memoria.
4. **Sprints 4 + 6:** emojis grandes como ilustración + gamificación.
5. **Sprint 7:** "Estudiar hoy".
6. **Sprint 5:** reconocimiento de voz opcional.
7. **Publicación:** subir a GitHub Pages (`aletre/english-kids`).

Sprint 5 va casi al final por ser el más frágil (no funciona en iPad, no es offline).

## 13. Fuera de alcance (Futuro)

Sincronización, exportar progreso, importar Excel/CSV, frases y pronunciación de
frases, imágenes IA, generación automática de cursos, autenticación. La estructura
de datos (categorías, `words.js` desacoplado) queda preparada para importar nuevos
cursos, pero la UI de importación no entra en esta entrega.
