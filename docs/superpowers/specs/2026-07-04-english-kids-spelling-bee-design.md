# English Kids — Spelling Bee — Diseño (Spec)

**Versión:** 1.0
**Fecha:** 2026-07-04
**Estado:** Aprobado

## Objetivo

Añadir una 4ª modalidad al Examen: **Spelling Bee**. La app pronuncia la palabra en inglés y el niño escribe su deletreo correcto en inglés, con la traducción en español como pista.

## Contexto

App sin frameworks (`window.EK`, scripts clásicos). Los exámenes viven en el motor `EK.quiz` (modos `choice`/`write`/`listen`) y se dibujan en `EK.ui` (`renderQuizMenu`/`renderQuizQuestion`/`renderQuizResult`), con ruteo `#quiz` / `#quiz/<mode>` en `EK.app`.

## Decisiones

1. **Nuevo modo `"spell"`** en `EK.quiz.MODES` (`["choice","write","listen","spell"]`).
2. **Mecánica:** estímulo = audio de la palabra en inglés (reproducción automática al mostrar la pregunta) + pista = traducción en español (`word.es`). NO se muestra la palabra en inglés. Cuerpo = campo de texto donde el niño escribe el deletreo en inglés.
3. **Ayudas de audio:** 🔊 Repetir (normal) y 🐢 Repetir lento. (No se incluye deletreo en voz alta: daría la respuesta.)
4. **Validación:** deletreo **exacto** en inglés, insensible a mayúsculas y espacios extremos (`EK.wordUtils.normalize(input) === EK.wordUtils.normalize(word.en)`). No acepta variantes en español (a diferencia del modo "escribir").
5. **Feedback:** al responder, correcto → "¡Correcto! 🎉"; incorrecto → muestra la escritura correcta (`word.en`).
6. **Sesión:** ~10 palabras, puntaje, y pantalla de resultado con % que actualiza `stats.bestQuiz` (igual que los otros modos, vía `EK.quiz.result()`).
7. **Acceso:** botón **Spelling Bee** en el menú de Examen → ruta `#quiz/spell`.
8. **PWA:** subir la caché del service worker a `english-kids-v10`.

## Alcance

Solo la nueva modalidad. No modifica opción múltiple, escribir ni escuchar.

## Archivos

- Modify: `js/quiz.js` — `"spell"` en `MODES`; `makeQuestion` no genera opciones para spell; nueva rama en `answer()` (comparación exacta con `word.en` normalizado).
- Modify: `js/ui.js` — botón "Spelling Bee" en `renderQuizMenu`; rama `spell` en `renderQuizQuestion` (estímulo audio + pista español; cuerpo campo de texto; auto-reproducción; feedback con `word.en`).
- Modify: `service-worker.js` — `CACHE = "english-kids-v10"`.
- Modify: `tests/quiz.test.js` — pruebas del modo spell.

## Verificación

- Motor (`answer` en modo spell, `MODES`, `makeQuestion`) con pruebas automatizadas (shim de Node).
- Render (auto-play, campo, feedback) con smoke test de DOM y verificación manual del usuario en navegador (audio real).

## Fuera de alcance

Dificultad configurable, ranking, pistas de número de letras (se descartó), y deletreo en voz alta como ayuda.
