# SolversHub — Set de marca (logo definitivo)

Vectorización del logo definitivo de SolversHub y todas sus derivadas: logos, wordmarks
de 1 y 2 líneas, isotipos, íconos de app y favicon, en **tema oscuro**, **tema claro** y
**monocromo**. Colores y tipografía del manual de marca (`brand/manual-de-marca.md`
§5 y §6).

Abre **`index.html`** para ver la lámina con todas las piezas y descargarlas
(`python3 -m http.server -d brand/logo-definitivo` y entra a `http://localhost:8000`, o ábrelo
directo en el navegador).

## Estructura

```
brand/logo-definitivo/
├── index.html            lámina de previsualización del set
├── svg/                  vectores maestros (fuente de verdad)
│   ├── logo-vertical/                   isotipo + SOLVERS / — HUB —  (logo principal)
│   ├── logo-horizontal/                 isotipo a la izquierda + wordmark de 2 líneas
│   ├── logo-horizontal-1-linea/         isotipo + SOLVERSHUB en una línea
│   ├── logo-horizontal-simple/          igual, con el isotipo sin mini-iconos (< 240 px)
│   ├── logo-horizontal-1-linea-simple/  ídem para la versión de 1 línea
│   ├── wordmark-2-lineas/               SOLVERS sobre — HUB —
│   ├── wordmark-1-linea/                SOLVERSHUB
│   ├── isotipo/                         cerebro-foco con mini-iconos (desde 96 px)
│   ├── isotipo-simple/                  sin mini-iconos (24–96 px)
│   ├── app-icon/                        íconos de app (cuadrado, redondeado, capas Android)
│   └── favicon/                         favicon maestro
├── png/                  exportaciones con fondo transparente (lado largo 2048 px; isotipos 1024 px)
├── favicon/              listo para web: favicon.ico/.svg, apple-touch-icon, PWA, manifest, <head>
├── app/                  listo para la app Expo (mismos nombres que usa solvershub-apk)
└── _src/                 generador: geometry.py, build.py, preview.py, render.mjs, fuente
```

Cada pieza existe en cuatro temas; el sufijo indica **para qué fondo es**:

| Sufijo | Fondo | Tinta | HUB y líneas | Núcleo y V |
|---|---|---|---|---|
| `-tema-oscuro` | navy (`#0B1733`, `#080F22`, `#172F6C`) | blanco `#FFFFFF` | cian `#22C7E0` | degradado `#2F6BFF → #22C7E0` |
| `-tema-claro` | blanco o paper `#F7F9FC` | navy `#0B1733` | azul `#2F6BFF` | degradado |
| `-mono-blanco` | fotos, fondos de color | blanco | blanco | blanco, check calado |
| `-mono-navy` | impresión a una tinta | navy `#0B1733` | navy | navy, check calado |

En el tema claro HUB pasa de cian a azul 500 porque el cian no da contraste sobre blanco
(manual §5.4); `#2F6BFF` sobre blanco da 4,5:1.

## Qué archivo usar

| Contexto | Archivo |
|---|---|
| Portada, splash, presentación, redes | `svg/logo-vertical/…-tema-oscuro.svg` |
| Cabecera de la landing (fondo navy) | `svg/logo-horizontal/…-tema-oscuro.svg` |
| Barra lateral y login del panel (24–28 px de alto) | `svg/logo-horizontal-1-linea-simple/…` o `svg/wordmark-1-linea/…` |
| Documentos, propuestas, facturas (fondo claro) | `svg/logo-horizontal/…-tema-claro.svg` |
| Firma de correo | `png/logo-horizontal-1-linea-simple/…` (180 px de ancho) |
| Avatar de redes y WhatsApp | `svg/app-icon/solvershub-appicon-redondeado-tema-oscuro.svg` |
| Sello, grabado, impresión a un color | `svg/*/…-mono-navy.svg` |
| Sobre fotografía | `svg/*/…-mono-blanco.svg` (con velo navy al 60–75 %) |

## Favicon y PWA

`favicon/` trae todo lo necesario; las etiquetas para el `<head>` están en `favicon/head.html`.
El favicon es la silueta sólida del cerebro-foco en el degradado con el check en blanco: es la
única forma que se lee a 16 px y funciona igual en pestañas claras y oscuras, así que no
necesita variante por tema.

En la landing (Next.js, carpeta `app/`) el reemplazo es directo:

| Landing | Set |
|---|---|
| `app/favicon.ico` | `favicon/favicon.ico` |
| `app/icon.svg` | `favicon/favicon.svg` |
| `app/icon.png` (48 px) | `favicon/favicon-48.png` |
| `app/apple-icon.png` | `favicon/apple-touch-icon.png` |
| `public/icons/appicon-192.png`, `-512.png`, `-maskable-512.png` | `favicon/icon-192.png`, `icon-512.png`, `icon-maskable-512.png` |

## App (Expo)

`app/` usa los nombres de `solvershub-apk/app.json`, así que se copia sobre `solvershub-apk/assets/`:

| Archivo | Uso |
|---|---|
| `icon.png` | Ícono de iOS y por defecto (1024, sin transparencia) |
| `icon-tema-claro.png` | Variante clara (iOS 18, `ios.icon.light`) |
| `android-icon-foreground.png` | Ícono adaptativo: primer plano dentro de la zona segura 66/108 |
| `android-icon-background.png` | Ícono adaptativo: fondo navy radial |
| `android-icon-monochrome.png` | Íconos temáticos de Android 13+ |
| `logo-transparente.png` | Splash y pantalla de login (fondo navy) |
| `favicon.png` | Web de Expo |

## Reglas

- **Área de respeto:** el radio del núcleo del isotipo (≈ 1/5 de su altura) libre por cada lado.
- **Tamaños mínimos:** horizontal 120 px de ancho (versión `-simple` por debajo de 240 px);
  isotipo simple 24 px; isotipo completo 96 px; por debajo de 24 px, el favicon.
- **Nunca:** deformar, rotar, recolorear fuera de la paleta, cambiar el degradado, quitar el
  check de la V o separar SOLVERS de HUB.
- El logotipo va en mayúsculas por diseño; en texto corrido el nombre se escribe siempre
  **SolversHub** (manual §3).

## Cómo se construyó

- El arte final es un JPG de 1033 × 1024 px. Se midió con precisión subpíxel y se reconstruyó
  con geometría limpia: el contorno del cerebro son 8 lóbulos circulares simétricos con trazo
  de 12,5 u, el núcleo es un círculo de radio 66,6 u y la rosca son 3 líneas de remate redondo.
  El calco coincide con el original (IoU por elemento de 0,94 a 0,99).
- El texto es **Montserrat Bold** (la fuente del manual) convertida a trazos, con el tracking
  medido del arte (≈ −0,02 em). La **V** es un check propio: brazos a ±27,5°, 34,4 u de grosor,
  base redondeada y brazo derecho que sube 38,75 u sobre la altura de mayúsculas.
- Los mini-iconos se redibujaron como iconos de línea (trazo 3,1 u, remates redondos), fieles en
  forma y posición a los del arte, siguiendo el estilo de iconografía del manual (§7).
- Los colores se ajustaron a la paleta oficial: el JPG traía tonos aproximados (por ejemplo, HUB en
  `#33B0CF` y la V empezando en un índigo `#3752D7`).

## Regenerar

```bash
python3 brand/logo-definitivo/_src/build.py
```

Necesita Python con `fontTools` y `Pillow`, y `node` con `sharp`: lo busca en el `node_modules` más cercano (o en un `solvershub-landing/`
vecino); si no está, indica la ruta con `SHARP_PATH=/ruta/a/node_modules/sharp`. Toda la geometría vive en
`_src/geometry.py`; los temas, lockups e íconos en `_src/build.py`. No edites los SVG ni los PNG a
mano: cambia el generador y vuelve a correrlo.

Montserrat se distribuye bajo SIL Open Font License (`_src/fonts/OFL.txt`).
