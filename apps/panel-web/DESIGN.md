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
| Átomos | `Button` (`loading` conserva el ancho y pone `aria-busy`), `Badge` (con tono de estado trae su ícono y el tipo no deja quitarlo), `Avatar`, `Kbd`, `Contador` (`99+` desde 100; `etiqueta` para lectores de pantalla), `Skeleton` (estático, `lines`), `Input`/`Select`/`Textarea` (`aria-invalid` pinta el borde de error), `InputPassword` (ojo de 44 px de ancho dentro del campo), `Checkbox`, `RadioGroup`, `Switch`, `Tooltip` |
| Moléculas | `Field` (une ayuda o error con el control vía `aria-describedby`), `SearchInput` (atajo opcional, Escape limpia), `Breadcrumbs`, `Tabs` (contenido en la misma página; si no caben, la fila se desplaza sola hasta la activa) y `TabLinks` (pestañas que cambian de ruta; `size="compact"` para filas largas: menos relleno y la fila se desplaza sola hasta la activa), `DropdownMenu`, `Popover`, `KpiTile` (delta escrito + `polarity`; `size="compact"` en cabeceras: una fila baja en móvil, normal desde `sm`; `StatCard` es alias deprecado), `EmptyState`, `Pagination`, `SegmentedControl` (2 a 5 opciones excluyentes; con botones o, si todas llevan `href`, como enlaces), `EstadoDeError` (qué pasó, cómo seguir y una acción, con el detalle técnico plegado; `forma` «pagina» o «en-linea») |
| Organismos | `DataTable` (`density`, `maxHeight` con encabezado fijo, `loading`, `error` + `errorAction`, `caption`; con `getRowHref` la fila entera abre su detalle y no lleva botón «Ver»), `Dialog`, `Confirm`, `Sheet` (panel lateral; `antesDelTitulo` y `despuesDelTitulo` ponen un avatar o una etiqueta en la franja del título), `PageHeader` (migas + título + acciones + pestañas; `densidad="compacta"` para herramientas de pantalla completa: título y pestañas en una franja y la descripción en «¿Qué es esto?») |
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


- Contenedor de contenido: `max-w-[1600px]` centrado (`app/(app)/layout.tsx`), padding `px-6 py-8`.
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
- Título de la página en la topbar (ADR-0003 §7): cuando el `h1` del `PageHeader` empieza a
  ocultarse por arriba, la barra lo repite tras el selector de negocio. Entra desde abajo
  (`translate-y-2 → 0`, 200 ms `ease-sh-out`) y se retira con 150 ms `ease-sh-in`; el
  contenedor lo recorta para que nazca de la barra. El texto de la barra es `aria-hidden`
  (el `h1` real no se mueve ni se duplica para lectores de pantalla). En celular reemplaza
  al nombre del negocio mientras está visible. La lista del selector de negocios se
  desplaza con `overscroll-contain` y se limita al alto de la ventana.
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

## Centro de notificaciones (ADR-0167)

La campana vive siempre en la barra superior (sticky), a la derecha. Dos ejes visuales: el
**icono** es de la categoría (conversaciones, ventas, cobros, agenda, sistema) y el **color**
es de la severidad (`status-*`: info, éxito, atención, urgente); lo urgente lleva etiqueta y
lo no leído, punto y negrita. Se abre como popover (≥ 768 px) o como hoja desde abajo (celular)
con `sh-notif-*` (globals.css, tokens de motion, sin librería). Las preferencias del push
(categorías y silencio) están dentro del mismo centro. Mapa de destinos en `lib/notificaciones/tipos.ts`.

Destructivas confirmadas con consecuencia: eliminar conexión, desactivar
colaborador, resolver conversación, cancelar cita/eliminar bloqueo, activar
versión de spec.

`IconAction` y `ChannelIcon` usan tonos semánticos del tema (sin pasteles fijos
ni `hover:scale`).

## Resumen (SPEC-29, ADR-0171)

El Resumen se lee de arriba abajo, en secciones, y se organiza por agente:

| Sección | Qué lleva |
|---|---|
| Te esperan | Columna fija a la derecha (desde 1280 px; en el celular va arriba de todo): quién espera a una persona, por qué y hace cuánto. Sin nadie esperando, en el celular no ocupa lugar |
| Todo el negocio | La cifra principal (`KpiTile size="hero"`: conversaciones con la tendencia diaria de todo el negocio), las demás cifras del negocio y, si hay, los módulos que ningún agente gestiona. Una cifra sin datos no ocupa tarjeta: se dice en una línea |
| Evolución diaria | Una gráfica de líneas por agente con actividad; el selector de métrica (respuestas, conversaciones, costo) va en el encabezado de la tarjeta; en el celular el gráfico arranca plegado |
| Agentes | Una tarjeta plegable por agente (`<details>` nativo, la primera abierta en escritorio y todas plegadas en el celular). Plegada: nombre, dos cifras de su módulo y «Última actividad». Abierta: enlace «Ver agente», sus cifras y su módulo |
| Conversaciones recientes · Tu asistente | Debajo de «Te esperan», en la columna derecha. Recientes: avatar con iniciales (o el ícono del canal si el visitante no dio nombre), nombre, «hace X» y estado. Tu asistente: agente, habilidades, «Costo IA, 30 días» y plan con sus días restantes; el modelo solo lo ve la plataforma |

- Con el Resumen por agente, «Todo el negocio» va **primero**; los primeros pasos y el recorrido (HU-SH-06) se intercalan justo debajo (`despuesDelGeneral`). Sin él, los pasos siguen arriba: es un negocio recién creado.
- El nombre de un cliente sale de `lib/conversaciones/nombre.ts`, el mismo de la bandeja de Conversaciones: un visitante del chat web se lee «Visitante web · cf78», no `web:cf78…`.
- El período (7, 15 o 30 días) gobierna todo y va en el encabezado de la página (`SegmentedControl`), no dentro de una tarjeta.
- Un agente gestiona **un solo módulo**. El Coordinador y el agente «General» no son tarjetas.
- La insignia de tipo solo sale para **back-office**; «especialista» es lo normal y no se rotula.
- Las cifras del título plegado salen de `lib/resumen/resumen-agente.ts`; un módulo que el panel no conoce muestra sus dos primeras.
- El enlace al agente va **dentro del cuerpo**, nunca en el `<summary>` (un enlace dentro del control que pliega falla `nested-interactive`).
- Todo delta dice contra qué compara («+12 % frente a los 7 días anteriores»); las fotos de hoy (escalaciones, tareas, citas de hoy) no llevan delta.
- Cargando: esqueleto con la forma de la página (`app/(app)/dashboard/loading.tsx`), sin spinner.

## Cobranza (SPEC-29)

- Dentro de una ficha (cartera, cliente) la fila propia de pestañas reemplaza a las áreas de Cobranza; las migas llevan de vuelta. `PageHeader` recibe `tabs` y, junto al título, el estado en `despuesDelTitulo`.
- Las listas usan `TablaCobranza`: tabla en escritorio y filas de un toque en el celular. Las acciones de una fila van en `MenuDeFila`.
- El historial que no hace falta a diario va en `SeccionPlegada`, con su conteo.
- Promesas es una agenda: Vencidas, Hoy, Esta semana y Más adelante, con la decisión a un toque.
- Los enums del backend se leen desde `lib/cobranza/presentacion.ts`; una página de servidor no importa constantes de un módulo `"use client"`.

## Onboarding (HU-SH-06)

| Pieza | Regla |
|---|---|
| `components/domain/primeros-pasos.tsx` | Checklist del Resumen. El estado lo calcula el backend (`GET /admin/onboarding`); el panel solo traduce con `lib/primeros-pasos.ts` (sin claves ni motivos crudos). La acción de un paso se muestra solo si `puede_actuar`. Se pliega (`aria-expanded`); la preferencia va en la cookie `panel_pasos_plegados`, que lee el servidor: sin salto al cargar |
| `components/domain/tour-guiado.tsx` + `lib/tour.ts` | Recorrido propio de 5 pasos (D-SPEC-12-1 = A, sin librerías). Diálogo sin fondo oscuro, abajo a la derecha, para que se vea lo resaltado (`data-tour` → outline cyan de 2 px, sin animación). Teclado: Tab dentro del diálogo, ← y → cambian de paso, Escape lo salta. Cada paso se anuncia (`role="status"`) y el foco vuelve a quien lo abrió. |
| `components/domain/bienvenida.tsx` | Un solo bloque mientras queden pasos: los primeros pasos, con «Ver recorrido del panel». El único botón principal es el siguiente paso |
| `components/domain/invitaciones-pendientes.tsx` | Invitaciones que esperan respuesta, en el layout de `(app)`: aceptar deja el negocio activo; rechazar pide confirmación |
| `components/domain/tarjeta-de-acceso.tsx` | Marco a fondo completo de las pantallas sin sesión: logo vertical, umbral degradado, formulario de 420 px y cambio de tema al pie. `/login`, `/invitacion` (el token llega en el fragmento `#` y se borra de la barra) y `/recuperar` |

Un elemento que quiera aparecer en el recorrido lleva `data-tour="<id>"` (los enlaces del
menú ya llevan su `href`). Los modales de ayuda por sección y las guías por habilidad son de
SPEC-12, no de este recorrido.

## Asistente de primer uso (HU-UX-21, SPEC-41)

| Pieza | Regla |
|---|---|
| `app/(onboarding)/bienvenida` | Pantalla completa fuera del shell (sin menú). 6 pasos; cada uno guarda al avanzar y se retoma donde quedó. El layout `(app)` redirige aquí cuando el servidor dice `recorrido.abrir` (negocio nuevo, sin tocar, dueño). «Completo» lo decide el servidor al terminar |
| `components/domain/aviso-de-onboarding.tsx` | Aviso permanente (`role="status"`, tonos `status-warning-*`) bajo la barra superior mientras el recorrido está empezado o saltado. No se puede cerrar; solo desaparece con «completo». Lo ven el dueño y el master |
| `_components/elegibles.tsx` | Tarjetas y fichas de un clic con `input` radio o checkbox nativos (flechas, foco y lector gratis); la selección se ve por anillo cian y marca, no solo por color. Objetivo ≥ 44 px |
| `_components/tarjeta-del-agente.tsx` | La idea memorable: «Tu agente, armándose». Lo vacío con línea punteada, lo decidido sólido; la burbuja de voz sale de frases fijas por tono, calidez, emojis y largo (`lib/onboarding.ts`), sin modelo. En móvil se pliega arriba (`details`) |
| Horario | Es el del equipo del comercio; el agente responde 24/7 (`business_hours_mode = informativo`). Se elige con atajos de días, días a mano y bloque de horas |
| Logo | Horizontal con icono (`public/marca/horizontal-*`); bajo 240 px de ancho, `horizontal-simple` (manual §4). Nunca se recolorea |
| Movimiento | Solo transiciones de selección (200 ms) y el giro de «creando»; todo se apaga con `prefers-reduced-motion` |

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
