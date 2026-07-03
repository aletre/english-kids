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

## Íconos
Los íconos incluidos en `assets/icons/` (`icon-192.png`, `icon-512.png`) son
placeholders sólidos en verde de marca (`#58CC02`), generados sin navegador
(entorno headless). Para reemplazarlos por íconos con el logo "EK", abre la
consola en `index.html` (servido por HTTP) y pega/ejecuta este script; descargará
ambos íconos con el diseño del logo, listos para mover a `assets/icons/`:

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
