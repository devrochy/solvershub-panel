# Sistema de diseño · build del kit

Compila el kit del panel para el sistema de diseño de SolversHub, el artifact
«SolversHub Design System» en claude.ai: <https://claude.ai/artifact/DqBnViGJ8SUNb4o2g4Kwhz>.
Sus vistas previas montan los componentes reales de `components/ui`, `components/dataviz`
y `components/templates`, no copias.

```bash
npm run design-system:build
```

La salida queda en `build/design-system/project/components/` (ignorada por git):

| Archivo | Qué es |
|---|---|
| `bundle.js` | Un script clásico que asigna `window.SolversHub` con el kit (ver `entrada.mjs`). Lee `window.React` y `window.ReactDOM`. La primera línea es la cabecera `@ds-bundle` con el orden de las tarjetas (`ORDEN` en `build.mjs`). |
| `bundle.css` | El CSS que Tailwind v4 genera para esos componentes con el `@theme` de `app/globals.css`. **No** incluye `app/tokens.css`: los colores, espacios y radios salen de `tokens.json` del sistema. Solo agrega lo que los tokens no publican como variables (escala `--sh-type-*` y `--sh-motion-*`, leídas de `app/tokens.css`). |
| `lib/react*.production.min.js` | React y ReactDOM de `node_modules`, armados como scripts clásicos (React 19 no publica builds UMD). |
| `<Comp>/preview.html` | Copias de `previews/<Comp>.html`. |

## Cómo funciona

- **esbuild** resuelve `@/…` como el `tsconfig`, cambia `next/link` por un `<a>` y
  `next/navigation` por un router inerte (`shims/`), y toma React de `window`.
- **Tailwind** escanea los componentes, dos piezas del shell que usa `PageHeader` y las
  vistas previas (`@source`), así el CSS trae justo las clases que se usan.
- **Temas:** el sistema los llama `dark` y `light` (el panel, `sh-dark` y `sh-light`); el
  script ajusta los selectores de `globals.css`.

## Agregar o cambiar un componente

1. Si es nuevo, expórtalo en `entrada.mjs` y agrégalo a `ORDEN` en `build.mjs` (el build
   falla si `ORDEN` y `previews/` no coinciden).
2. Escribe o ajusta `previews/<Comp>.html`: la línea 1 es el marcador
   `<!-- @dsCard group="…" height=N subtitle="…" -->`; luego un `<div id="root">` y un
   `<script>` que monta `window.SolversHub.<Comp>` con `React.createElement` (sin JSX ni
   imports: la vista previa ya trae React, el bundle y el CSS cargados).
3. Si la vista previa usa un ícono nuevo, agrégalo a `iconos.mjs`.
4. Corre `npm run design-system:build` y publica la salida en el artifact; por ejemplo,
   pidiéndole a Claude Code que suba `build/design-system/project/` al sistema de diseño.
   La guía de cada componente (`README.md` en el artifact) se edita allá.

`AppShell` no está en el bundle: la barra lateral real necesita sesión, permisos, cookies
y el router de Next. Su vista previa es marcado estático con las clases de
`components/shell/sidebar.tsx` y `topbar.tsx`.
