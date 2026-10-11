# ADR-0002 — Sistema de diseño v2: tokens extendidos, paleta de datos y gráficos propios

- **Estado:** aceptado
- **Fecha:** 2026-10-10
- **Ámbito:** `brand/tokens` (fuente única), `apps/panel-web` y, por sincronización,
  `solvershub-apk` (`src/core/theme/tokens.ts`).
- **Origen:** SPEC-29 de `solvershub-docs` (decisión D-32: D-SPEC-29-2, 3 y 9), HU-DS-01.

## Contexto

Los tokens DTCG v1.3 cubrían color, gradiente, familias, radios y espacios. Todo lo demás
(tamaños de letra, sombras, duraciones, alturas de controles) se decidía en cada pantalla,
así que el panel y la app divergían con cada PR. Además, la revisión del 2026-10-10 midió
dos fallas de contraste que contradecían `DESIGN.md`:

- Los colores de estado usados como texto (`text-success`, `text-warning`, `text-danger`,
  135 usos) dan 3,3:1, 2,3:1 y 4,4:1 sobre blanco.
- `Button variant="accent"` pone texto blanco sobre `#2F6BFF → #22C7E0`: 2,04:1 en el
  extremo cyan.

## Decisión

### 1. Tokens v1.4 (aditivos)

| Grupo | Qué agrega | Salidas |
|---|---|---|
| `color.status.{light,dark}` + `theme.*.status-{success,warning,danger,info}-{fg,bg,border}` | Texto de estado por tema con AA (incluso sobre su propio tinte). Los `success/warning/danger` base quedan para rellenos y marcas no textuales | CSS, Tailwind (`text-status-*-fg`, `bg-status-*-bg`, `border-status-*-border`), RN, Android |
| `color.data.{light,dark}` + `theme.*.data-*` | 4 colores categóricos de orden fijo, serie única, rampa secuencial de 5 pasos, grilla y ejes. Validados con `validate_palette.js` de la skill dataviz | CSS, Tailwind (`*-data-1…4`, `*-data-seq-*`), RN, Android |
| `gradient.cta` | `navy-700 → blue-600`: texto blanco ≥ 5,39:1 en todo el recorrido. `gradient.brand` queda para acentos sin texto | CSS |
| `type.web` / `type.app` | Escala tipográfica (hero, h1, block, body, dense, label, caption, mono). Web en CSS; app en RN con la familia que ya trae el peso (`Montserrat_700Bold`) | CSS (`--sh-type-*`), Tailwind (`text-sh-*`), RN (`shType`) |
| `theme.*.elev-0…3` | Elevación. En oscuro la marca el paso de superficie; la sombra solo separa popovers y diálogos | CSS, Tailwind (`shadow-elev-*`), RN (`boxShadow`) |
| `motion.duration` / `motion.easing` | 100/150/200/250 ms y curvas `out`, `in`, `emphasized`. La transición por defecto de Tailwind pasa a `fast` + `out` | CSS, Tailwind (`ease-sh-*`), RN (`shMotion`) |
| `density`, `breakpoint` | Alturas de filas y controles (40/48) y el contrato de anchos del shell | CSS, RN (`shDensity`) |

Los tamaños tipográficos de Tailwind llevan el prefijo `sh-` porque `text-body` ya es un
color del panel.

Nada se renombra ni se borra: los componentes actuales siguen igual. La migración de los
135 usos de estado y del botón `accent` es de HU-DS-02, junto con la regla de lint que marca
como deprecados los usos de texto de `success/warning/danger`.

### 2. El contraste se verifica en el CI

`brand/tokens/contrast.mjs` (sin dependencias) mide 88 pares por versión: texto, enlaces y
estados sobre `bg`, `surface` y `surface-2` (≥ 4,5:1), estados sobre su tinte compuesto,
bordes de control, foco y marcas de datos (≥ 3:1), y el texto blanco en cada parada de
`gradient.cta`. El job `tokens` del CI lo corre y además verifica que `app/tokens.css` del
panel sea la copia exacta de `brand/tokens/tokens.css`.

### 3. Gráficos con primitivas propias (D-SPEC-29-2)

Sparkline, línea/área, barras y anillo se construyen sobre `d3-scale` y `d3-shape` (y
`react-native-svg` en la app), con los colores de `data-*`. No se agrega Recharts, Victory
ni ECharts. Lo implementa HU-DS-06.

### 4. Catálogo vivo en `/catalogo` (D-SPEC-29-3)

Página interna del panel, visible solo con `PANEL_CATALOGO=1` (desarrollo y test), que
muestra cada componente con sus variantes y estados en claro y oscuro. Sin Storybook. Lo
implementa HU-DS-03.

### 5. Superficies sólidas (D-SPEC-29-9)

Sin `backdrop-filter` ni transparencias en superficies con texto: el contraste debe poder
calcularse. La jerarquía sale de `elev-*` y de los pasos de superficie.

## Consecuencias

- Una pantalla nueva no decide tamaños, sombras ni duraciones: usa tokens.
- Un cambio de marca que rompa el contraste falla en el CI antes del merge.
- La app recibe los mismos tokens con `npm run tokens:sync` (HU-DS-01, PR de la app).
- `DESIGN.md` se reescribe con estas reglas en HU-DS-02.

## Alternativas descartadas

- **Solo corregir los hex de estado:** arregla el síntoma, pero no evita la próxima deriva
  ni le da a la app tipografía y motion comunes.
- **Style Dictionary u otra herramienta de tokens:** el generador propio sin dependencias ya
  cubre las 4 salidas; agregar una herramienta no se justifica para un equipo de una persona.
- **Recharts o ECharts:** ver D-SPEC-29-2 en SPEC-29.
