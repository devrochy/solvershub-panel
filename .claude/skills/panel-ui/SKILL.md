---
name: panel-ui
description: >
  Implementa o modifica UI en el panel nuevo de SolversHub (apps/panel-web, Next.js 16).
  Úsala cuando se toque una vista, componente, formulario, tabla o el BFF del panel, o
  cuando se lea cualquiera de los gates de diseño. Hace cumplir DESIGN.md, los tokens,
  el BFF con X-Tenant-Id y el formateo es-CO.
---

Trabaja en `apps/panel-web` respetando [`DESIGN.md`](../../DESIGN.md) y la identidad de
`solvershub/brand/` (manual + tokens DTCG). El panel es un **instrumento**: calmado,
preciso, sin decoración que no sirva.

## Antes de escribir

1. Lee `apps/panel-web/DESIGN.md` (diales: densidad 4/10, motion 3/10, varianza baja).
2. Lee `apps/panel-web/AGENTS.md`: **este Next.js no es el que conoces**; consulta
   `node_modules/next/dist/docs/` antes de usar una API de framework.
3. Mira una vista existente de la misma sección y copia su estructura.

## Reglas duras (de `DESIGN.md`)

- **Capas con responsabilidad única**: `app/**/page.tsx` hace fetch + composición;
  las piezas de una sección viven en `_components/`; lo reutilizable sube a
  `components/ui/` (sin dominio) o `components/domain/` (widgets con datos).
  Ningún componente de `ui/` conoce el negocio.
- **Nada de fetch en `components/`**: los datos entran por props; el fetch vive en
  `page.tsx` o en `lib/api/resources/*` (una función por endpoint, tipada).
- **Color solo por tokens semánticos** (`surface`, `border-soft`, `text-soft`…),
  nunca hex suelto. Estados con tinte suave `/12`, no relleno saturado. Gradiente
  de marca **solo** en la CTA principal.
- **Tipografía**: Montserrat en display, Inter 15 px en cuerpo; mayúsculas solo en
  cabeceras de tabla (`tracking 0.06em`). Una sola `PageHeader` por página (único `h1`).
- **Motion**: microinteracciones 150 ms, overlays 200 ms, `ease-out`; se anima solo
  lo que cambia de estado. `prefers-reduced-motion` respetado.
- **Accesibilidad**: foco visible, controles con nombre accesible, iconos decorativos
  `aria-hidden`, el color nunca es el único portador de información. WCAG AA mínimo.
- **Carga**: `Skeleton` que conserva la forma, no spinners.
- **Nunca un 403 por diseño**: si el usuario no puede hacer algo, la acción no se muestra.

## BFF y datos

- El navegador nunca ve el token: las llamadas al backend pasan por el BFF
  (`lib/api/server.ts`), que reenvía `Authorization: Bearer` desde la cookie
  `httpOnly` y el negocio activo como **`X-Tenant-Id`** (cookie `panel_tenant`).
  Si escribes una ruta `app/api/**/route.ts`, propaga el `X-Tenant-Id` del negocio
  seleccionado; guardar en el negocio equivocado es un bug de aislamiento.
- Tipos de la API: se generan de `docs/openapi.json` (`lib/api/schema.d.ts`); no los
  edites a mano.
- **Dinero en COP del negocio**: usa `formatCop` (no `formatUsd`) para montos del
  negocio; `formatUsd` solo para costos de proveedor. Fechas con `formatDate`/
  `formatDateTime`; valores crudos con `formatCellValue` (nunca `undefined` visible).
- **Sin enums crudos**: traduce a texto legible antes de mostrar.

## Copy

- Voz de interfaz, frase corta, sentence case, voz activa.
- El botón dice exactamente lo que pasa ("Guardar identidad", no "Enviar").
- Errores: qué pasó y cómo seguir. Vacíos: invitación a actuar.

## Gates antes de cerrar

`npm run test` · `npm run typecheck` · `npm run lint` · `npm run build`
(`make panel-check`). Además: revisar accesibilidad (foco y teclado) y anti-patterns.
Para mirar la página, usa el navegador integrado (`built-in-browser`).

## Al construir piezas nuevas

- `HU-UI-02` define `ui/toast` + `useConfirm` + `useAction` (fetch + toast + refresco
  + rollback). Hasta que existan, no inventes otro patrón: sigue el estado actual del
  repo o impleméntalos como parte de esa HU.
- Toda acción irreversible pide confirmación y explica la consecuencia.
