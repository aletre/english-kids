# English Kids
## Documento de Arquitectura y Plan de Desarrollo

**Versión:** 1.0  
**Fecha:** Julio 2026

---

# Objetivo del proyecto

Desarrollar una aplicación web educativa para niños que permita aprender vocabulario en inglés de forma interactiva, moderna y divertida.

El proyecto debe ser completamente funcional sin necesidad de servidor, permitiendo posteriormente evolucionar a una Progressive Web App (PWA).

---

# Filosofía del proyecto

No se busca desarrollar un simple listado de palabras.

El objetivo es construir una aplicación con calidad suficiente para:

- ser utilizada por niños de 6 a 12 años
- ser utilizada en colegios
- poder publicarse como PWA
- poder convertirse posteriormente en aplicación Android/iOS
- poder reutilizarse con cualquier lista de vocabulario

Inspiración visual:

- Duolingo
- Khan Academy Kids
- Lingokids

---

# Restricciones

## Tecnologías

No utilizar frameworks.

No utilizar:

- React
- Angular
- Vue
- Bootstrap

Tecnologías permitidas:

- HTML5
- CSS3
- JavaScript ES6

Debe abrir únicamente haciendo doble clic sobre:

```
index.html
```

Sin instalar nada.

Sin Node.

Sin npm.

Sin servidor.

---

# Arquitectura

```
EnglishKids/

│
├── index.html
│
├── css/
│      styles.css
│
├── js/
│      app.js
│      ui.js
│      storage.js
│      speech.js
│      words.js
│      quiz.js
│      memory.js
│      settings.js
│
├── assets/
│      logo.svg
│
├── assets/icons/
│
├── assets/images/
│
└── README.md
```

La aplicación debe ser modular.

Cada archivo debe tener una única responsabilidad.

---

# Diseño

## Estilo

Inspirado en Duolingo.

Características:

- limpio
- mucho espacio
- botones grandes
- esquinas redondeadas
- responsive
- agradable para niños

Evitar interfaces saturadas.

---

# Paleta

Verde

```
#58CC02
```

Azul

```
#1CB0F6
```

Amarillo

```
#FFD43B
```

Mucho blanco.

Modo oscuro.

---

# Responsive

Debe funcionar correctamente en:

- Desktop
- Tablet
- Celular

---

# Navegación

Debe soportar:

- Mouse
- Touch
- Teclado

Teclas:

←

→

Espacio

Enter

---

# Persistencia

Utilizar

```
localStorage
```

Guardar:

- progreso
- favoritas
- configuración
- velocidad de pronunciación
- última palabra vista
- estadísticas

---

# Sprint 1

## Pantalla principal

Contendrá:

- Logo
- Barra de progreso
- Buscador
- Estudiar
- Favoritas
- Configuración

---

## Modo estudio

Cada palabra tendrá una tarjeta.

Ejemplo:

```
Butterfly

🦋

Mariposa

🔊 Pronunciar

🐢 Pronunciación lenta

⭐ Favorita

◀       12 / 112      ▶
```

---

# Pronunciación

Utilizar

```
SpeechSynthesis
```

Debe soportar:

- voz normal
- voz lenta

Preferir:

en-US

Si existe:

en-GB

La velocidad lenta será aproximadamente:

```
0.55
```

---

# Buscador

Debe buscar tanto por:

Inglés

como por

Español.

Ejemplo

```
butter

↓

Butterfly
```

o

```
maripo

↓

Butterfly
```

---

# Palabras

Inicialmente serán las 112 palabras extraídas de la imagen proporcionada por el usuario.

Posteriormente la aplicación deberá soportar importar nuevos cursos.

---

# Favoritas

Cada tarjeta tendrá:

⭐

Al marcarla:

Guardar automáticamente.

---

# Barra de progreso

Debe mostrar:

```
██████████░░░░░

47%

53 de 112 palabras
```

---

# Estadísticas

Guardar:

- palabras vistas
- favoritas
- porcentaje aprendido
- mejor examen
- días de estudio

---

# Configuración

Permitir:

Tema

- Claro
- Oscuro

Velocidad

- Muy lenta
- Lenta
- Normal

Idioma

- English US
- English UK

(según disponibilidad)

---

# Sprint 2

Agregar:

## Examen

Tres modalidades.

### Opción múltiple

```
What is

Butterfly

○ Mariposa

○ Tomate

○ Diamante

○ Dinosaurio
```

---

### Escribir

```
¿Cómo se dice?

Mariposa

_____________
```

---

### Escuchar

Escuchar una palabra.

Seleccionar la correcta.

---

# Sprint 3

Juego memoria.

Encontrar parejas.

```
Butterfly

Mariposa
```

Agregar:

- animaciones
- contador
- tiempo

---

# Sprint 4

Agregar imágenes.

Cada palabra tendrá una ilustración.

Ejemplo

```
Butterfly

(imagen)

Mariposa
```

No usar emojis cuando exista una imagen adecuada.

---

# Sprint 5

Reconocimiento de voz.

El niño pronunciará.

La aplicación evaluará la pronunciación.

Utilizar:

```
SpeechRecognition
```

(si el navegador lo soporta)

---

# Sprint 6

Gamificación.

Agregar:

- logros
- medallas
- rachas
- XP
- niveles

Ejemplo

```
🥉

25 palabras

🥈

50 palabras

🥇

100 palabras
```

---

# Sprint 7

Modo

"Estudiar hoy"

La aplicación elegirá automáticamente aproximadamente 10 palabras.

Flujo:

```
Aprender

↓

Repasar

↓

Mini examen

↓

Resultado
```

---

# Futuro

Agregar:

- sincronización
- exportar progreso
- importar Excel
- importar CSV
- categorías
- frases
- pronunciación de frases
- imágenes IA
- generación automática de cursos
- autenticación

---

# Calidad del código

El proyecto debe escribirse como si fuera Open Source.

Seguir principios:

- SOLID (cuando aplique)
- separación de responsabilidades
- funciones pequeñas
- nombres descriptivos
- comentarios únicamente cuando aporten valor
- código limpio

---

# Objetivo final

Al terminar, el resultado debe sentirse como una aplicación profesional.

No debe parecer un ejemplo de HTML.

Debe ser suficientemente buena para:

- publicarla en GitHub
- utilizarla en un colegio
- distribuirla como PWA
- reutilizarla para otros cursos

---

# Estimación de tamaño

```
index.html          ~250 líneas

styles.css          ~900

app.js              ~900

ui.js               ~700

quiz.js            ~1200

memory.js           ~900

speech.js           ~300

storage.js          ~300

settings.js         ~300

words.js            ~700

TOTAL

≈ 6.500 líneas
```

---

# Decisiones tomadas

✅ No utilizar frameworks.

✅ No utilizar Bootstrap.

✅ Todo funcionará offline.

✅ Arquitectura modular.

✅ Responsive.

✅ Código mantenible.

✅ Preparado para evolucionar a PWA.

✅ Persistencia mediante localStorage.

✅ Pronunciación mediante SpeechSynthesis.

✅ Desarrollo incremental por sprints.

✅ Calidad suficiente para un proyecto Open Source.
