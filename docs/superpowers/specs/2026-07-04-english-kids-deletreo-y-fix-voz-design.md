# English Kids — Deletreo + arreglo de voz — Diseño (Spec)

**Versión:** 1.0
**Fecha:** 2026-07-04
**Estado:** Aprobado

## Objetivo

Dos mejoras pequeñas sobre la app ya publicada:
1. Corregir el bug por el que la pronunciación a veces empieza a la mitad de la palabra (ej. "airport" → "port").
2. Añadir la posibilidad de **deletrear** una palabra letra por letra en modo estudio.

## Contexto

App sin frameworks (`window.EK`, scripts clásicos). `EK.speech` envuelve `SpeechSynthesis`. La tarjeta de estudio (`EK.ui.renderStudy`) ya tiene botones 🔊 (normal), 🐢 (lento) y ⭐. Publicada como PWA con service worker cache-first.

## Decisiones

1. **Fix de truncado:** en `EK.speech.speak`, la secuencia `synth.cancel()` + `synth.speak()` síncrona corta el inicio en Chrome/Safari. Solución: tras `cancel()`, ejecutar `speak()` con un retardo pequeño (~90 ms) vía `setTimeout`. `speakSlow` se beneficia porque delega en `speak`.
2. **Deletreo:** nuevo `EK.speech.spell(text)` que encola una locución por letra (velocidad ~0.6) usando la voz/idioma configurados; las locuciones encoladas producen pausas naturales entre letras. Solo letras `a–z` (ignora espacios y signos); no repite la palabra completa al final.
3. **Helper testeable:** `EK.speech.spellSequence(text)` → array de letras (ej. `"airport"` → `["a","i","r","p","o","r","t"]`, `"sore throat"` → letras sin el espacio). Pura, sin DOM ni audio → testeable con shim de Node.
4. **UI:** botón 🔤 (aria-label "Deletrear") en la tarjeta de estudio junto a 🔊/🐢/⭐; al pulsar → `EK.speech.spell(word.en)`. Reutiliza `.ek-icon-btn` (sin CSS nuevo).
5. **PWA:** subir la caché del service worker a `english-kids-v4` para que los dispositivos instalados reciban `speech.js`/`ui.js` actualizados. `CORE` no cambia (no hay archivos nuevos de runtime).

## Alcance

Solo modo estudio. No toca exámenes ni otros módulos.

## Archivos

- Modify: `js/speech.js` — fix `speak` (cancel diferido); añadir `spell` y `spellSequence`.
- Modify: `js/ui.js` — botón 🔤 en `renderStudy`.
- Modify: `service-worker.js` — `CACHE = "english-kids-v4"`.
- Create: `tests/speech.test.js` — prueba de `spellSequence`.
- Modify: `tests/tests.html` — cargar `speech.js` (módulo) y `speech.test.js` (suite).

## Verificación

- `spellSequence` con pruebas automatizadas (shim de Node).
- `isSupported()` falso → `speak`/`spell` son no-op (no lanzan) — importante para file:// y navegadores sin soporte.
- Audio real (que ya no corte y que deletree bien) → verificación manual del usuario en su dispositivo.

## Fuera de alcance

Deletreo en exámenes; repetir palabra completa tras deletrear; resaltar la letra en pantalla mientras se pronuncia.
