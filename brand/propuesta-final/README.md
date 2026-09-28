# SolversHub — Set completo

**Versión:** 2.0 · **Fecha:** 2026-09-26 · **Movimiento:** *Sinapsis Azul*
**Lámina maestra:** [`solvershub-sistema-de-marca.pdf`](solvershub-sistema-de-marca.pdf) · [`.png`](solvershub-sistema-de-marca.png)
**Filosofía:** [`filosofia-sinapsis-azul.md`](filosofia-sinapsis-azul.md)

---

## Concepto

El isotipo es un **cerebro-bombillo**: un cerebro con membranas y giros, fisura central
luminosa, que se convierte en bombillo sobre una **base de rosca**, con un **check en
gradiente** en el centro. Alrededor, una **red de nodos con iconos** (avatar, imagen,
chat, archivos, ajustes, audio, agenda): las apps conectadas al cliente final.

- **Wordmark:** `SOLVERS` con la **“v” como ilusión de check** (brazo izquierdo a ~64 %
  de la mayúscula, derecho a ≈133 %) con el glow y el núcleo iluminado de `Solvers.jpeg`.
- **Hub siempre presente:** todo lockup lleva `SOLVERS` arriba y **`HUB` debajo con
  líneas horizontales a ambos lados**.

## Contenido

```
propuesta-final/
├─ solvershub-sistema-de-marca.pdf/.png   Lámina maestra (canvas)
├─ filosofia-sinapsis-azul.md             Manifiesto del movimiento
├─ logos/                                 Isotipo y lockups (SVG) + favicon.ico
│  ├─ solvershub-isotipo.svg              Cerebro-bombillo + nodos
│  ├─ solvershub-icon.svg                 Icono sin nodos (app icon / UI)
│  ├─ solvershub-isotipo-mono-light/navy  Versión 1 color
│  ├─ solvershub-logo-horizontal-light/dark
│  ├─ solvershub-logo-vertical-light/dark (icono arriba + SOLVERS/HUB)
│  ├─ solvershub-wordmark-light/dark      SOLVERS / HUB con líneas
│  ├─ solvershub-appicon.svg · -maskable.svg · solvershub-favicon.svg
│  └─ favicon.ico
├─ habilidades/                           Iconografía IA (línea, lucide-style)
│  ├─ cerebro-en-red.svg   agenda.svg   order-box.svg
│  ├─ ventas.svg   cobranza.svg   agendamiento.svg   marketing.svg
└─ png/                                   Export raster de todo el set
```

> Los PNG e ICO se **generan siempre desde los SVG** fuente (nunca se editan a mano).

## Uso en la landing (Next.js)

- `app/icon.svg` ← `logos/solvershub-favicon.svg`
- `app/favicon.ico` ← `logos/favicon.ico`
- `app/apple-icon.png` ← `png/appicon-180.png`
- `public/icons/appicon-{192,512}.png`, `appicon-maskable-512.png`
- Cabecera/footer ← `logos/solvershub-logo-horizontal-light.svg`
- Portada/hero ← `logos/solvershub-logo-vertical-light.svg`

## Reglas rápidas

- Gradiente de marca `135° #2F6BFF → #22C7E0` (nunca como fondo de áreas grandes).
- Paleta navy 60 % · neutros 30 % · acentos 10 %.
- Questrial (display) + Inter (cuerpo). Iconografía de línea 1.7 con extremos redondos.
- Área de respeto ≥ altura del nodo; no deformar, rotar ni recolorear fuera de la paleta.
- La “v” siempre es la ilusión de check; **Hub nunca se separa** del lockup.
