# DESIGN.md — Panel SolversHub

Reglas del sistema de diseño del panel (**v2**, SPEC-29). Toda pieza nueva debe
cumplirlas. La identidad viene de `brand/` (manual + tokens DTCG v1.4); aquí se
documenta cómo se aplica en este proyecto. Decisiones: ADR-0002 (`docs/adr/`).

## Principio

El panel es un **instrumento**: calmado, preciso, sin decoración que no sirva.
El atrevimiento se gasta en **un** lugar (el lenguaje de datos en cyan); el resto
se mantiene callado.

Diales: **densidad 4/10** (aireado) · **motion 3/10** (sobrio) · **varianza baja**
(admin funcional). Excepción documentada: se mantiene **Inter** en cuerpo aunque
algunas guías anti-slop la eviten — el manual de marca manda.

## Arquitectura de componentes (responsabilidad única)

| Capa | Responsabilidad | Prohibido |
|---|---|---|
| `app/**/page.tsx` | fetch + composición | formateo, markup de tabla, lógica de dominio |
| `app/(app)/<seccion>/_components/` | piezas exclusivas de esa sección | reutilización forzada |
| `components/ui/` | primitivos sin dominio, props tipadas | fetch, reglas de negocio |
| `components/domain/` | widgets de dominio compartidos (reciben datos) | fetch |
| `components/shell/` | estructura (sidebar, topbar, tema) | lógica de negocio |
| `lib/api/resources/` | una función por endpoint, tipada | JSX |
| `lib/format.ts` | formateo puro | estado |

Reglas: si un componente se usa en 2+ secciones, sube a `ui`/`domain`; si es de una
sola, vive en su `_components/`. Ningún componente de `ui/` conoce el negocio.

## Kit de componentes (HU-DS-03)

Antes de escribir markup, busca en el kit. **Catálogo vivo**: `/catalogo` con
`PANEL_CATALOGO=1` (desarrollo y test; en producción da 404), con cada componente en claro
y oscuro lado a lado. Una pieza nueva del kit entra al catálogo en el mismo PR.

| Nivel | Componentes (`components/ui` salvo indicación) |
|---|---|
| Átomos | `Button` (`loading` conserva el ancho y pone `aria-busy`), `Badge` (con tono de estado trae su ícono y el tipo no deja quitarlo), `Avatar`, `Kbd`, `Skeleton` (estático, `lines`), `Input`/`Select`/`Textarea` (`aria-invalid` pinta el borde de error), `Checkbox`, `RadioGroup`, `Switch`, `Tooltip` |
| Moléculas | `Field` (une ayuda o error con el control vía `aria-describedby`), `SearchInput` (atajo opcional, Escape limpia), `Breadcrumbs`, `Tabs` (contenido en la misma página) y `TabLinks` (pestañas que cambian de ruta), `DropdownMenu`, `Popover`, `KpiTile` (delta escrito + `polarity`; `StatCard` es alias deprecado), `EmptyState`, `Pagination` |
| Organismos | `DataTable` (`density`, `maxHeight` con encabezado fijo, `loading`, `error` + `errorAction`, `caption`), `Dialog`, `Confirm`, `Sheet` (panel lateral), `PageHeader` (migas + título + acciones + pestañas) |
| Gráficos (`components/dataviz`) | `Sparkline` (ranura de `KpiTile`; decorativa o con `label` resumen), `LineChart` (con `area`), `BarChart` (una serie o agrupadas), `ProgressRing` (consumo del plan). Geometría y formato puros en `escalas.ts` (los mismos casos en la app) |
| Plantillas (`components/templates`) | `ListPage` (cabecera, filtros, contenido), `DetailPage` (cabecera, resumen, contenido), `DashboardPage` (grilla 12/6/1), `SettingsPage` (pestañas, ancho de lectura) |

### Gráficos (HU-DS-06)

SVG propio sobre `d3-scale`/`d3-shape` (ADR-0002, D-SPEC-29-2); nada de Recharts ni ECharts.

- **Un solo eje Y.** La API no tiene segundo eje (`yFormat` y `yDomain` son escalares). Dos
  medidas de escala distinta van en dos gráficos o indexadas a una base común.
- **Color por entidad.** Cada serie tiene `key` estable; el color sale de su posición en
  `series` (orden fijo `data-1…4`, nunca cíclico; desde la 5.ª se suman en «Otros», neutro).
  `visibleKeys` filtra sin repintar. Una sola serie usa `data-single`. Los estados no son series.
- **Marcas finas.** Línea de 2 px, área al 10 %, punto de r 4 con anillo de superficie, barras de
  24 px como máximo con extremo redondeado de 4 px y 2 px de aire; grilla y base de 1 px sólidas
  (`data-grid`, `data-axis`). El texto (ticks, leyenda, tooltip) va en tokens de texto.
- **Leyenda** desde 2 series; etiqueta directa solo para el valor final de una serie única.
- **Accesible:** «Ver tabla» con los mismos datos (`DataTable`), crosshair o barra activa con
  puntero y con ← → cuando el gráfico tiene el foco, anunciado por `aria-live`. Sin animación
  de entrada.
- El filtro de series o período va en la fila de filtros de la página, nunca dentro de la tarjeta.

`cn()` (`lib/utils.ts`) conoce la escala `text-sh-*` y las sombras `shadow-elev-*`: sin eso,
tailwind-merge las tomaba por colores y las descartaba.


- Contenedor de contenido: `max-w-[1200px]` centrado, padding `px-6 py-8`.
- Barra lateral adaptativa (HU-DS-04, ADR-0003): expandida 256 px, plegada 72 px (íconos)
  o cajón en celular. Sin preferencia se pliega entre 768 y 1279 px. La preferencia del
  usuario va en la cookie `panel_sidebar`; se alterna con el botón del pie o con `[`.
- Menú v2 (HU-UX-02, D-37): una entrada por tarea y sus páginas como pestañas (`tabs` en
  `nav.ts`). Una página nueva entra como pestaña de su entrada, no como ítem nuevo del menú;
  toda ruta del panel es una entrada o una pestaña (lo verifica `navegacion.test.ts`).
- Cada entrada del menú necesita un ícono propio (la barra plegada se lee por íconos).
- Migas y pestañas de sección salen solas del `PageHeader` (desde `nav.ts` y los
  permisos). En un detalle, el título de la página es el último nivel de las migas.
- Topbar `h-16`, con el botón «Buscar…» que abre la paleta (solo ícono debajo de 1024 px).
- Paleta de comandos y atajos (HU-DS-05, ADR-0003): Ctrl/⌘ K abre la paleta (secciones
  permitidas, acciones rápidas y registros de `GET /search`). Los atajos de una tecla (`/`,
  `[`, `?`, `g` + letra) no se disparan en campos ni diálogos y se apagan en la ayuda (`?`),
  en la paleta o en Configuración → Accesibilidad (cookie `panel_atajos`). Una página que
  quiera que `/` enfoque su buscador usa `input[type="search"]`, `name="q"` o `data-buscador`.
  Una acción que afecte a clientes pide confirmación con su consecuencia.
- Ritmo vertical entre bloques: 24 px (`gap-6`); dentro de tarjetas, 20 px.
- Una sola `PageHeader` por página (es el único `h1`).

## Tipografía

Escala por token (`text-sh-*`; la familia va aparte con `font-display` o `font-sans`):

| Rol | Utilidad | Tamaño / alto / peso | Familia |
|---|---|---|---|
| Cifra héroe (KPI) | `text-sh-hero` | 30/36/700 | Montserrat · `tabular-nums` |
| Título de página (`h1`) | `text-sh-h1` | 24/32/600 | Montserrat |
| Título de bloque | `text-sh-block` | 17/24/600 | Montserrat |
| Cuerpo | `text-sh-body` | 15/24/400 | Inter |
| Cuerpo denso (tablas compactas) | `text-sh-dense` | 14/20/400 | Inter |
| Etiqueta | `text-sh-label` | 13/18/500 | Inter |
| Ayuda | `text-sh-caption` | 12/16/400 | Inter |

- Toda cifra comparable (KPI, montos en tablas) lleva `tabular-nums`.
- Mayúsculas **solo** en cabeceras de tabla, con `tracking 0.06em`.
- Nada de justificado.

## Color

- Tokens semánticos siempre (`surface`, `border-soft`, `text-soft`…); nunca hex suelto.
- Oscuro: texto `ice #E8EDF7` (no blanco puro), secundario `fog`, terciario `haze`.
- Claro: `paper #F7F9FC`, texto `navy-900`, secundario `slate-600`, terciario `slate-500`.

| Necesito… | Uso | No uso (lo bloquea el lint) |
|---|---|---|
| Texto o ícono de estado | `text-status-{success,warning,danger,info}-fg` | `text-success`, `text-warning`, `text-danger` |
| Fondo de badge o banner de estado | `bg-status-*-bg` + `border-status-*-border` | `bg-success/10`, `border-warning/40`… |
| Enlace o texto de acento | `text-link` (blue-600 en claro, cyan en oscuro) | `text-accent` (cyan sobre blanco da 2,0:1) |
| Botón principal | `Button variant="accent"` → `bg-cta` (navy-700 → blue-600) | `from-blue to-accent` con texto blanco |
| Botón por defecto / destructivo | `bg-action` / `bg-danger-strong` (blanco ≥ 5,4:1) | `bg-blue`, `bg-danger` con texto blanco |
| Indicador no textual (foco, pestaña activa, interruptor) | `border-focus`, `bg-focus`, `ring-focus` | `border-accent`, `bg-accent` |
| Serie o identidad categórica (canales, gráficos) | `text-data-1…4`, `bg-data-*` (orden fijo) | `text-gold`, `text-primary`, `text-blue` |
| Barra de progreso | `bg-data-single`; aviso y exceso con `bg-status-*-fg` | `bg-warning` (2,3:1 sobre blanco) |

- Los colores base `success/warning/danger`, el cyan y el oro siguen existiendo para
  rellenos decorativos y marcas que no necesitan contraste (bordes de banner, tintes).
- El gradiente de marca (blue → cyan) es solo para acentos sin texto.
- Estados en **tinte suave**, nunca relleno saturado, y siempre con ícono o texto.
- El contraste **se verifica en el CI**: `brand/tokens/contrast.mjs` mide 91 pares
  (texto ≥ 4,5:1, no texto ≥ 3:1, estados sobre su tinte, blanco sobre rellenos de botón).

## Elevación

`shadow-elev-0…3`: plano, tarjeta, popover y diálogo. En oscuro la jerarquía la marca el
paso de superficie (`surface` → `surface-2` → `surface-raised`) y el borde; la sombra solo
separa popovers y diálogos. Sin `backdrop-filter` ni transparencias detrás de texto.

## Motion

- Duraciones por token: `--sh-motion-duration-{instant 100, fast 150, base 200, slow 250}`.
  La transición por defecto de Tailwind (`transition`) ya usa `fast` + curva `out`.
- Curvas: `ease-sh-out` (entradas), `ease-sh-in` (salidas, 75 % de la entrada),
  `ease-sh-emphasized` (sheet y cajón). Nada de `duration-300` sueltos.
- Microinteracciones 150 ms; overlays 200 ms.
- Se anima solo lo que cambia de estado (hover, foco, apertura). Nada de pulsing,
  hover-scale global ni stagger decorativo.
- `prefers-reduced-motion` respetado de forma global.

## Accesibilidad

- Foco visible (outline 2 px del tema) en todo elemento interactivo.
- Controles con nombre accesible; iconos decorativos `aria-hidden`.
- El color nunca es el único portador de información (siempre etiqueta o icono).
- Carga con `Skeleton` estático (conserva la forma), no spinners. La única excepción es
  el indicador dentro de un `Button` en carga.

## Feedback y acciones (kit, HU-UI-02)

Toda acción que cambia estado usa el kit; **nada de `window.confirm`** ni estados
locales de carga/éxito/error en las páginas migradas.

| Pieza | Regla |
|---|---|
| `components/ui/toaster.tsx` + `lib/toast-store.ts` | `toast.success()` (`role="status"`, se cierra a los 5 s y pausa con hover) y `toast.error()` (`role="alert"`, queda hasta cerrarlo). Animación ≤200 ms, sin animación con `prefers-reduced-motion` |
| `components/ui/confirm.tsx` · `useConfirm()` | Diálogo `alertdialog` con título, **consecuencia** y botón `danger` para lo destructivo. Devuelve `Promise<boolean>`; Escape/Cancelar = `false`. El foco lo devuelve Radix |
| `lib/use-action.ts` · `useAction()` | Ejecuta el fetch al BFF, muestra el toast, refresca (`router.refresh`) y ejecuta `rollback` de lo optimista si falla |
| `lib/labels.ts` | Estados, canales, roles, motivos de escalación y claves de permiso en español claro; **nunca** se muestra el enum crudo |
| `components/ui/providers.tsx` | `FeedbackProviders` (ConfirmProvider + Toaster), montado en el layout de `(app)` |

Destructivas confirmadas con consecuencia: eliminar conexión, desactivar
colaborador, resolver conversación, cancelar cita/eliminar bloqueo, activar
versión de spec.

`IconAction` y `ChannelIcon` usan tonos semánticos del tema (sin pasteles fijos
ni `hover:scale`).

## Onboarding (HU-SH-06)

| Pieza | Regla |
|---|---|
| `components/domain/primeros-pasos.tsx` | Checklist del Resumen. El estado lo calcula el backend (`GET /admin/onboarding`); el panel solo traduce con `lib/primeros-pasos.ts` (sin claves ni motivos crudos). La acción de un paso se muestra solo si `puede_actuar`. Se pliega (`aria-expanded`); la preferencia va en la cookie `panel_pasos_plegados`, que lee el servidor: sin salto al cargar |
| `components/domain/tour-guiado.tsx` + `lib/tour.ts` | Recorrido propio de 5 pasos (D-SPEC-12-1 = A, sin librerías). Diálogo sin fondo oscuro, abajo a la derecha, para que se vea lo resaltado (`data-tour` → outline cyan de 2 px, sin animación). Teclado: Tab dentro del diálogo, ← y → cambian de paso, Escape lo salta. Cada paso se anuncia (`role="status"`) y el foco vuelve a quien lo abrió. Cómo terminó queda en la cookie `panel_tour` |
| `components/domain/bienvenida.tsx` | Primera visita: ofrece el recorrido («Empezar recorrido» / «Ahora no») mientras queden pasos |
| `components/domain/invitaciones-pendientes.tsx` | Invitaciones que esperan respuesta, en el layout de `(app)`: aceptar deja el negocio activo; rechazar pide confirmación |
| `components/domain/tarjeta-de-acceso.tsx` | Marco de las pantallas sin sesión: `/login`, `/invitacion` (el token llega en el fragmento `#` y se borra de la barra) y `/recuperar` |

Un elemento que quiera aparecer en el recorrido lleva `data-tour="<id>"` (los enlaces del
menú ya llevan su `href`). Los modales de ayuda por sección y las guías por habilidad son de
SPEC-12, no de este recorrido.

## Copy

- Voz de interfaz, frase corta, voz activa y sentence case.
- El botón dice exactamente lo que pasa ("Guardar identidad", no "Enviar").
- Errores: qué pasó y cómo seguir. Vacíos: invitación a actuar.
- **Glosario y arquitectura de información**: ver
  [`docs/adr/0001-arquitectura-de-informacion.md`](../../docs/adr/0001-arquitectura-de-informacion.md)
  y `brand/manual-de-marca.md` §9.3. "Habilidad", no plugin/pack; "negocio", no tenant.

## Gates

En el CI de cada PR:

- `npm run typecheck` · `npm run lint` (incluye la regla de colores sin AA) ·
  `npm run build` · `npm run test:coverage`.
- `lib/a11y/paginas.test.tsx`: las páginas principales sin violaciones graves de axe.
  Una página nueva importante se agrega a esa lista con sus fixtures.
- `node brand/tokens/contrast.mjs` y la copia de `tokens.css` al día (job `tokens`).
- `npm run api:types:check`: los tipos coinciden con el OpenAPI de `develop` (job `api-types`).

Antes de cerrar, además: revisión de foco y teclado y mirar la página en claro y oscuro.
