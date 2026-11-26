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
y oscuro lado a lado, ordenado por tarea (Mostrar, Pedir, Avisar, Navegar, Marca) y con
cuándo usar cada pieza. Una pieza nueva del kit entra al catálogo en el mismo PR.

| Nivel | Componentes (`components/ui` salvo indicación) |
|---|---|
| Átomos | `Button` (`loading` conserva el ancho y pone `aria-busy`), `Badge` (con tono de estado trae su ícono y el tipo no deja quitarlo), `Avatar`, `Kbd`, `Contador` (`99+` desde 100; `etiqueta` para lectores de pantalla), `Skeleton` (estático, `lines`), `Input`/`Select`/`Textarea` (`aria-invalid` pinta el borde de error), `InputPassword` (ojo de 44 px de ancho dentro del campo), `Checkbox`, `RadioGroup`, `Switch`, `Tooltip` |
| Moléculas | `Field` (une ayuda o error con el control vía `aria-describedby`), `SearchInput` (atajo opcional, Escape limpia), `Breadcrumbs`, `Tabs` (contenido en la misma página; si no caben, la fila se desplaza sola hasta la activa) y `TabLinks` (pestañas que cambian de ruta; `size="compact"` para filas largas: menos relleno y la fila se desplaza sola hasta la activa), `DropdownMenu`, `Popover`, `KpiTile` (delta escrito + `polarity`; `size="compact"` en cabeceras: una fila baja en móvil, normal desde `sm`), `EmptyState`, `Pagination`, `SegmentedControl` (2 a 5 opciones excluyentes; con botones o, si todas llevan `href`, como enlaces), `EstadoDeError` (qué pasó, cómo seguir y una acción, con el detalle técnico plegado; `forma` «pagina» o «en-linea») |
| Organismos | `DataTable` (`density`, `maxHeight` con encabezado fijo, `loading`, `error` + `errorAction`, `caption`; con `getRowHref` la fila entera abre su detalle y no lleva botón «Ver»), `Dialog`, `Confirm`, `Sheet` (panel lateral; `antesDelTitulo` y `despuesDelTitulo` ponen un avatar o una etiqueta en la franja del título), `PageHeader` (migas + título + acciones + pestañas; el icono informativo junto al título abre la descripción y los primeros pasos; `densidad="compacta"` para herramientas de pantalla completa: título y pestañas en una franja) |
| Gráficos (`components/dataviz`) | `Sparkline` (ranura de `KpiTile`; decorativa o con `label` resumen), `LineChart` (con `area`), `BarChart` (una serie o agrupadas), `ProgressRing` (consumo del plan). Geometría y formato puros en `escalas.ts` (los mismos casos en la app) |
| Plantillas (`components/templates`) | `ListPage` (cabecera, filtros, contenido), `DetailPage` (cabecera, resumen, contenido), `DashboardPage` (grilla 12/6/1) |

### Elegir la pieza (rediseño del kit)

- **Cambiar de vista.** `TabLinks` cuando cada vista es su propia ruta (se comparte el enlace:
  las pestañas de una ficha o de una sección). `SegmentedControl` para filtrar o mostrar lo mismo
  de otra forma, con 2 a 5 opciones cortas (Todas · Abiertas · Cerradas; Lista · Embudo; la vista
  previa de una plantilla). `Tabs` para partes distintas de un mismo objeto sin ruta propia, dentro
  de un panel o diálogo (Acceso · Permisos de una persona, los ajustes de la Agenda), o un filtro
  con más de 5 opciones o rótulos largos (el catálogo de Mensajes).
- **Errores.** Una página o un bloque que no cargó: `ErrorDeCarga` (o `EstadoDeError` en línea),
  con la cabecera en pie y «Reintentar». Dentro de un formulario o un diálogo: `FormFeedback`, con
  ícono y texto. Nunca una línea roja suelta.
- **Carga.** `Skeleton` o `CargandoLista` con la forma de lo que viene; nunca «Cargando…» en texto.
  El botón que espera usa `loading`.
- **Letra.** Siempre de la escala (`text-sh-*`, `text-xs`, `text-sm`); nada de `text-[13px]`.
- `IconAction` (botón de solo ícono) queda para acciones sobre una imagen, como la foto del perfil.

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
| Título de la ruta de lanzamiento (solo bienvenida y Nuevo agente, desde `md`; ver «Recorrido de una pregunta a la vez») | `text-sh-ruta` | 32/40/700 | Montserrat |
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
| `components/ui/confirm.tsx` · `useConfirm()` | Diálogo `alertdialog` con título, **consecuencia** y botón `danger` para lo destructivo. Devuelve `Promise<boolean>`; Escape/Cancelar = `false`. Al cerrar, el foco vuelve a quien la pidió, o al botón del menú si se pidió desde un ítem (`lib/foco.ts`) |
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
- Las listas usan `TablaResponsiva`: tabla en escritorio y filas de un toque en el celular. Las acciones de una fila van en `MenuDeFila`. Un diálogo, cajón o confirmación abierto desde uno de sus ítems devuelve el foco al botón del menú al cerrarse (`lib/foco.ts`, ya está en `DialogContent`, `SheetContent` y `useConfirm`).
- El historial que no hace falta a diario va en `SeccionPlegada`, con su conteo.
- Promesas es una agenda: Vencidas, Hoy, Esta semana y Más adelante, con la decisión a un toque.
- Los enums del backend se leen desde `lib/cobranza/presentacion.ts`; una página de servidor no importa constantes de un módulo `"use client"`.

## Conexiones (SPEC-29)

- Una conexión tiene un solo estado (`estadoDeConexion`): Funciona, Con avisos, No funciona, Sin terminar o Pausada. La salud de Meta solo cuenta en las conexiones con cuenta de Meta.
- La lista se ve en lista (`TablaResponsiva`) o en cuadrícula (tarjetas con estado, agentes y la semana); la vista viaja en `?vista=` y se recuerda en este navegador (`lib/vista-guardada.ts`). Arriba, un enlace por cada conexión que pide atención. Webhook, enrutamiento y consistencia solo los ve la plataforma.
- En la ficha, el ícono va antes del título y el estado después. Pausar es el único botón; lo demás va en el menú «Más acciones».
- Pestañas: las de todos los días a la vista; Webhook, Producción y Versiones en «Avanzado», que muestra la elegida («Avanzado: Webhook»).
- Nada técnico a la vista: estados, categorías, idiomas y motivos de Meta en palabras (`lib/labels.ts`); los identificadores de Meta van en el CSV o entre paréntesis en el campo que los pide.
- Una revisión se dibuja con `MarcaDeRevision` y siempre con su texto. Los pasos largos (Pasar a producción) van de a uno con `Stepper`.
- En las altas, el camino recomendado va primero y los otros plegados. No hay botones «← Volver»: las migas y las pestañas llevan de vuelta.

## Agenda (SPEC-29)

- Una sola vista: la cabecera con Ajustes y Nueva cita, la columna «Hoy» (se muestra u oculta con «Citas de hoy» y se recuerda por negocio en el navegador) y el calendario con su propia barra del kit: flechas, Hoy y Día/Semana/Mes. En el celular abre en el día.
- La grilla muestra de una hora antes de abrir a una después de cerrar (`horarioAGrilla`) y sombrea lo cerrado. Al cambiar el ancho (la columna Hoy) se llama `updateSize()`.
- Cada cita lleva el color de su agenda, nunca el de su tipo, y dice el cliente primero; el tipo va en palabras, sin siglas. La hora solo aparece en las citas largas.
- Una cita se abre en un resumen con «¿Vino?» arriba; editar es un paso aparte. El formulario pide el cliente, el tipo, el día y la hora en formato de Colombia (`lib/calendario/formulario.ts`), y el fin sale de la duración.
- Los ajustes van en pestañas dentro del cajón. Un `MenuDeFila` dentro del cajón funciona igual que en una página, y Escape con el menú abierto cierra solo el menú. Para eso todos los paquetes de Radix tienen que compartir una sola copia de `react-dismissable-layer` y `react-focus-scope` (revisarlo con `npm ls` al subir uno).

## Equipo (SPEC-29)

- Una fila por persona (`TablaResponsiva`): rol y estado en palabras (`rolDeCuenta`), un resumen de permisos (`resumenDePermisos`) y de Cobranza (`resumenDePerfiles`), y un menú con las acciones escritas. Nada de interruptores ni íconos sueltos en la fila.
- La fila abre la ficha en un cajón; la ficha viaja en la URL (`?persona=`, `pestana=permisos`, `abrir=contrasena`), así el menú lleva directo a lo que nombra. Dos pestañas: Acceso (si entra, rol, negocios, Cobranza y contraseña) y Permisos, solo para quien tiene permisos propios (un dueño o el master ya lo ven todo).
- Los permisos se agrupan y se nombran como el menú (`gruposDePermisos`, a partir de `NAV_GROUPS`): una sección que vive en varias pestañas toma su lugar más directo y lo que no está en el menú queda en «Otras». Un `SegmentedControl` por sección; solo lo cambiado para la persona se marca, con «Volver a lo de su rol».
- Se guarda solo lo cambiado (`permisosAGuardar`): lo que no se manda vuelve a lo que da su rol. Guardar va fijo al pie del cajón y dice cuántos cambios hay sin guardar.
- Las invitaciones pendientes van antes de la tabla. «Invitar a alguien» elige el rol por lo que hará la persona; a quien no tiene cuenta se le crea con contraseña (la API solo invita cuentas que existen).

## Plantillas (SPEC-29)

- Se llega desde Agentes › Mensajes: las migas de Plantillas con opciones y de Avisos por evento vuelven a Mensajes.
- El editor tiene una acción principal (Publicar) y Guardar borrador; enviar una prueba, probar con el asistente y retirar o eliminar van en «Más acciones». Las opciones se pliegan en filas con su resumen y se abren de a una; con un error, la fila dice «Revisar».
- Nada técnico a la vista: la clave, los nombres en Meta y los datos que devuelve una acción quedan en «Avanzado»; las acciones y los datos se nombran en palabras. Cada dato de la acción dice de dónde sale con «Lo escribo yo / De la conversación».
- La vista previa queda fija al lado en escritorio; en el celular se abre con «Ver cómo queda».
- Avisos por evento: una lista por módulo con lo que le llega al cliente («Con plantilla», «Solo dentro de 24 horas», «Sin aviso»). Cada aviso se edita en un cajón con su propio Guardar; el texto por canal va plegado. La API guarda el mapa completo, así que guardar un aviso manda también lo guardado de los demás.

## Configuración (SPEC-29)

- Es un resumen, no un formulario: cada ajuste en una fila con su valor actual en palabras (`lib/configuracion-resumen.ts`: «Lun a vie, 9:00 a. m. a 6:00 p. m.», «Recuerda 10 mensajes (normal)»), agrupado por tarea. Tocar una fila abre el ajuste en un cajón; la sección abierta vive en la URL (`?seccion=`, `?tab=` y sus alias siguen valiendo).
- En el cajón se guarda con «Guardar» y el cajón se cierra; cerrarlo con cambios pide confirmación. Habilidades y Mensajes fallidos son filas más (enlaces a sus páginas), no pestañas.
- Nada técnico a la vista: el horario se elige por día (`EditorDeFranjas`), la memoria y la temperatura en palabras con los números exactos en «Avanzado», la moneda de una lista y los rangos cortos con puntos. AgentSpec y proveedor solo lo ve el master.
- Mensajes fallidos dice el mensaje y cuándo llegó (sin ids de WhatsApp ni del negocio) y nombra los avisos del sistema (`lib/fallidos.ts`); cada fila tiene «Reintentar» con texto.

## Ventas (SPEC-29)

- Todo en palabras (`lib/ventas.ts`): «Hoy, 5:30 p. m.», «3 variantes · 15 en stock», «19 % en Ropa · del 20 al 21 de nov.». Nada de SKU, letra de código ni valores de la API a la vista; el código de un producto va en «Avanzado» de su ficha.
- El resumen muestra lo que pide acción (por despachar, pago pendiente, agotados) y lo vendido en el mes; cada cifra abre su lista filtrada.
- Un pedido se abre en un cajón (`?pedido=`) con un solo botón para el paso siguiente; los demás cambios de estado van en «Más acciones» y cancelar pide confirmación. Pedidos tiene un solo filtro (control segmentado) y una búsqueda que filtra mientras se escribe.
- Dos formas de ver: Productos y Categorías en lista o vitrina (tarjetas con foto; en la vitrina de productos, la promoción vigente), Pedidos en lista o por etapa. La vista viaja en `?vista=` y se recuerda en este navegador (`lib/vista-guardada.ts`); los enlaces solo la escriben cuando difiere de la guardada.
- Productos, promociones, categorías y aliados se editan en un cajón o diálogo que vive en la URL. Las acciones de fila van en «Más acciones», nunca como íconos sueltos; borrar dice qué pasa con lo que depende de eso.
- Un pedido por transferencia lleva el bloque «Comprobante» (HU-COM-22, SPEC-48): la foto (enlace a la imagen firmada), lo que leyó la visión en palabras (`lib/comprobantes.ts`, la cuenta solo «terminada en 1234»), el resultado y por qué no se confirmó solo. En revisión: «Confirmar pago» y «Rechazar» (pide el motivo); sin comprobante, «Marcar pagado» con confirmación. Carga con esqueleto y error con «Reintentar». «Pago en revisión» es un estado de pago con su palabra.
- Aliados es pestaña solo con el módulo encendido: `comercio/layout.tsx` lo consulta y las pestañas `oculta` con `mostrarCon` salen con `PestanasOpcionales`.

## Consumo y plan (SPEC-29)

- Una sola página para el dueño, en créditos y en pesos, nunca en dólares (`lib/consumo.ts`): «Te quedan 9.588 créditos · unos $ 95.880 · para 9 días». Desde el 80 % avisa con el ritmo («se acaba el 14 de nov.»).
- El plan va en una tarjeta con su estado en palabras y, si hay un período por pagar, «Pagar $ …» como acción principal. Los planes y los pagos se abren en un cajón (`?ver=planes`, `?ver=pagos`).
- Cada tope dice qué pasa al llegar («No puedes publicar otro agente») y ofrece «Mejorar mi plan»; lo que no tiene tope dice «sin límite», sin barra ni «∞».
- Los costos en dólares (IA por agente y modelo, WhatsApp por categoría) son del equipo de SolversHub: Plataforma › Costos técnicos, solo master. Quien no es master y entra a `/costos` vuelve a Consumo y plan.

## Agentes (SPEC-29)

- La lista dice qué hace cada agente (el General coordina) y qué hizo en 30 días, en conversaciones y créditos del mes (`lib/agentes.ts`, `creditosPorAgenteId`). Se ve en cuadrícula o en lista (`?vista=`, recordada como en Ventas).
- La ficha cambia de agente desde el título (un menú, no una fila de insignias) y dice lo que hizo en una frase: «48 conversaciones esta semana · 95 % sin pasar a una persona · 3.200 créditos este mes». Los dólares de proveedor solo los ve el master, también en Consumo y Calidad.
- Cuatro pestañas: Actividad (conversaciones, tareas, clientes y registros en un control segmentado), Lo que sabe (superpoderes y documentos), Dónde atiende y Consumo. «Probar» es un botón que abre el chat en un cajón. Las pestañas de antes (`?tab=tareas`, `?tab=conocimiento`, `?tab=probar`…) siguen abriendo su lugar.
- El período es un control segmentado que se aplica al tocarlo; la conexión, un menú. Las filas abren la conversación (sin columnas «Ver» ni «Versión»); en el celular son filas de un toque.
- Todo en palabras: etapas con tildes, el motivo de una tarea que falló, «Atiende primero» en vez de prioridades, «9 de cada 10 en menos de 2 s» en vez de p95, permisos como frases («Agenda puede consultarle a Ventas») y claves de mensajes con su nombre.
- El editor es una tarea enfocada: sin las pestañas de la sección y con «Volver a Ventas». Los tipos de «Nuevo agente» son tarjetas con ícono y su descripción; lo que falta preparar se avisa debajo, con el tipo elegido.

## Plataforma (SPEC-29)

- Negocios es una lista con búsqueda al escribir (`BuscarEnUrl`); cada fila abre un cajón (`?negocio=`) con Cuenta (estado, plan, acceso del dueño), Funciones (interruptores; los del master solo los ve el master) y Asistente. Eliminar vive en el menú de la fila y al pie del cajón, con su frase de confirmación.
- El asistente se describe en palabras: «Motor», «Reparte entre especialistas», «Recorridos guiados»; el runbook queda plegado en «Antes de encender».
- Alta automática pone primero las altas en revisión (motivo como título y «Aprobar» como acción; descartar va al menú) y luego los documentos como filas con «Versión de octubre de 2026 · desde el 12 de oct.».
- App de Meta muestra primero lo que falla, cada chequeo con «Cómo arreglarlo» (`lib/plataforma.ts`, `comoArreglar`), y pliega «N en orden». Los ids técnicos van en «Detalles».
- Crons dice el estado en una línea («3 crons · 1 con fallo · 2 atrasados»), avisa si el planificador parece detenido y filtra con un control segmentado (Todos, Con fallo, En pausa, Atrasados). Los horarios van primero en hora de Colombia; un cron atrasado se marca «Atrasado 8 d» (`lib/crons.ts`, `atraso`).
- Quien no es master y entra a una página de Plataforma vuelve a su inicio, nunca ve un 403. Las cargas usan `CargandoLista`.

## Suscripciones (SPEC-29)

- El Resumen abre con una frase («Cobras $ 231.400 al mes de 3 suscripciones activas. 3 suscripciones deben $ 297.700.») y tres tarjetas: ingreso recurrente, mora y el mes (altas y bajas). Las fórmulas viven en «¿Cómo se calcula?». Siguen «Quién debe» (filas que abren la suscripción, con los tramos en una línea) y «Cuánto se quedan» por plan, con el detalle por mes plegado.
- La tarjeta de datos de prueba solo aparece cuando ofrece algo (generar o borrar).
- Un solo estado por suscripción (`SUBSCRIPTION_SITUATION`): «Pausada por mora», «Pausada por el negocio», «Esperando el primer pago». La línea de cada fila dice lo que debe o qué sigue (`lineaDeSuscripcion`).
- Las listas filtran al tocar: búsqueda al escribir, un control segmentado con lo más usado y lo demás en «Filtros» (se aplica al elegir). Pagos empieza en «Por cobrar» (`vistaDePagos`); `?ver=todos` lo quita.
- La ficha lleva al cliente como título, una frase con lo que pasa (`fraseDeLaSuscripcion`) y la acción que lo resuelve a la vista («Registrar pago» del cobro más viejo, «Confirmar pago» de la inscripción o «Reanudar»). «Cancelar suscripción» va en «Más acciones».
- Los cobros dicen el mes en palabras («octubre de 2026»), cuándo vencen o cómo se pagaron («Pagó con Wompi»), y sus acciones van en el menú de la fila (`AccionesDeCobro`; el diálogo vive fuera del menú). Un aviso que no salió va arriba con «Cómo arreglarlo»; avisos y cambios se juntan en «Historial», plegado.
- En Planes la fila abre el editor (`?plan=`); dejar de ofrecer y eliminar van en «Más acciones». El código de un plan nuevo sale del nombre y vive en «Avanzado»; el de uno que existe no cambia al renombrarlo.

## Seguridad (SPEC-29)

- Una sola página (`/seguridad`, rediseño B): una frase («3 equipos entran a la app. 3 cosas necesitan tu atención.»), «Necesita atención» con los equipos que esperan aprobación («Rechazar», «Aprobar») y las alertas críticas de la semana («Ver el equipo» lleva a su fila), los equipos y la actividad reciente lado a lado, y la política de equipos nuevos en una línea al final.
- La política se cambia en un panel lateral, con un control segmentado por rol (Sin aprobación · Con aprobación) y el aviso de lo que no frena. Pedir aprobación al dueño pide confirmación.
- Cada equipo en palabras (`lineaDelEquipo`: «Pixel 8 · Android · usado hace 12 min»), sin el identificador a la vista. La acción del estado lleva texto («Aprobar», «Reactivar»); bloquear y dar de baja van en «Más acciones». Bloquear elige el alcance con un control segmentado.
- Cada alerta es una frase (`fraseDeEvento`) con su segunda línea (canal, IP, hace cuánto). El historial (`/seguridad/alertas`, no es pestaña) agrupa por día y filtra con Todas · Necesitan atención · Avisos · Informativas. Quien solo tiene `access_alerts` entra directo al historial; `/seguridad/dispositivos` redirige a `/seguridad`.
- En el celular cada fila pone el texto arriba y los botones debajo.

## Acceso, perfil y canales (SPEC-29)

- Las pantallas sin sesión (entrar, recuperar la contraseña, activar la cuenta y la de tester) comparten `TarjetaDeAcceso`, rediseño D: en escritorio, a la izquierda la marca —el logo vertical centrado, la promesa («Tu agente atiende, vende, cobra y agenda por WhatsApp.») y «Atiende por» con los canales— y a la derecha el formulario de siempre (campos altos, ojo de la contraseña, botón largo, cambio de tema). En el celular, el logo y la promesa centrados arriba, sin los canales.
- La portada se presenta al cargar: el logo aparece y crece un poco, la promesa sube y los canales aparecen uno a uno (`sh-acceso-logo`, `sh-acceso-sube` en `globals.css`; `prefers-reduced-motion` los apaga).
- El Perfil va en dos secciones: «Tus datos» (la foto y quién eres a la izquierda, los campos a la derecha, el teléfono con la bandera del país) y «Acceso» (el correo fijo, la contraseña y el enlace a tus equipos en Seguridad).
- Los canales se pintan con `ChannelIcon` en todo el panel: el logo oficial de WhatsApp, Instagram y Messenger (Simple Icons, los mismos de la landing) y un icono genérico para los demás, «bounded y desvanecido» en un solo tono, el de la marca (`bg-link/14`, `border-link/30`, `text-link`): cian en oscuro, azul en claro.

## Pruebas (SPEC-30)

- Seis pestañas: Ejecutar, Datos, Informes, Ciclos, Entornos (Test · Producción en un control segmentado) y Testers. La explicación vive en el icono informativo, no en cada pestaña.
- En palabras (`lib/qa/estados.ts`): «Imprescindible» en vez de «Humo · P0», fechas como «4 de nov.», «En este ciclo: 2 la aprobaron» y resúmenes sin ceros («14 aprobadas · 3 con falla»).
- La lista de Ejecutar filtra el estado con un control segmentado y lo demás en «Filtros». En el celular el avance va en una línea y el paso ofrece Aprobar y Falla, con lo demás en un menú.
- El informe empieza por fallas y bloqueos, dice por entorno solo lo que no está bien y pliega las aprobadas (completas al imprimir). Informes van por ciclo y la fila abre el informe.
- Cerrar un ciclo se hace desde su tarjeta y la confirmación dice cuántas ejecuciones quedan en solo lectura. «Cómo va cada sección» muestra cada catálogo por su fecha y la tendencia en palabras.
- Las listas de verificación son filas con el estado en un menú; «Por qué», «Cómo», variables y nota se ven al abrir la fila.

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

## Asistente de primer uso (HU-UX-21, SPEC-41; HU-UX-25, SPEC-49)

| Pieza | Regla |
|---|---|
| `app/(onboarding)/bienvenida` | Pantalla completa fuera del shell (sin menú): arriba, a todo el ancho, el logo horizontal y «Seguir después» (`MarcoDeBienvenida`, HU-UX-26); el celular va a la derecha, como en Nuevo agente. Ruta de 5 estaciones (HU-UX-25, D-77): 1 «Tu negocio» en `/bienvenida`, que llega con lo recomendado (Vendo productos, «Laura» con ideas y la frase genérica del tipo, que sigue al tipo mientras no se edite) y no pide producto; al seguir se crea el agente y se deja listo, y las estaciones 2 a 5 (Habilidades, Datos del cliente, Datos para probar y Revisar y publicar) son el editor del agente en modo `bienvenida` en `/bienvenida/agente/[id]`. El chat de las estaciones 1 a 4 es simulado; la prueba de la 5 va por la conexión de `dejar-listo` y es la que deja «Publicar a {nombre}» (`dejar-listo` + `finalizar`). Cómo habla y el horario quedan con lo sugerido y se ajustan en Personalizar. Cada estación guarda al avanzar y se retoma donde quedó (`pasos: 5` al servidor, que traduce lo guardado con 4, 9 o 6). «Seguir después» confirma con «{nombre} no atiende hasta que termines.» y deja el aviso. El layout `(app)` redirige aquí cuando el servidor dice `recorrido.abrir`. «Completo» lo decide el servidor al terminar |
| `components/domain/aviso-de-onboarding.tsx` | Aviso permanente (`role="status"`, tonos `status-warning-*`) bajo la barra superior mientras el recorrido está empezado o saltado, con las estaciones que faltan de 5. No se puede cerrar; solo desaparece con «completo». Lo ven el dueño y el master |
| `components/ui/elegibles.tsx` | Tarjetas y fichas de un clic con `input` radio o checkbox nativos (flechas, foco y lector gratis); la selección se ve por anillo cian y marca, no solo por color. Objetivo ≥ 44 px |
| Vista previa | El chat simulado del kit va en el celular de la derecha (`CelularDeVistaPrevia`), con las pruebas de cada estación y respuestas fijas, sin modelo. En la estación 5 el celular no simula: la prueba real va en el formulario |
| Horario | Es el del equipo del comercio; el agente responde 24/7 (`business_hours_mode = informativo`). Se elige con atajos de días, días a mano y bloque de horas |
| Logo | En el encabezado, el horizontal en la tinta del tema (`Marca pieza="horizontal"`). Nunca se recolorea |
| Movimiento | Solo transiciones de selección (150–200 ms); todo se apaga con `prefers-reduced-motion` |

## Recorrido del agente (HU-UX-22, SPEC-47)

La bienvenida, Nuevo agente y Editar usan el mismo cascarón (D-75); la bienvenida y Nuevo agente recorren las 5 estaciones de la ruta de lanzamiento (D-77, HU-AOS-86) y Personalizar sus pasos libres. La bienvenida
sigue a pantalla completa con su logo; crear y editar viven en Agentes, dentro del shell.

| Pieza | Regla |
|---|---|
| `components/ui/barra-de-pasos.tsx` | Avance «Paso X de N · {corto}» y un segmento por paso con su nombre corto; por debajo de `md`, píldoras deslizables. `en-orden` solo deja volver; `libre` deja ir a cualquiera. Las marcas «con cambios» (`status-warning-fg`) y «revisar» (`status-danger-fg`) llevan texto para el lector, no solo color. Reemplaza a `Progress` y a `Stepper` en estos tres flujos; `Stepper` sigue en Pruebas y Pasar a producción |
| `components/domain/agentes/recorrido/recorrido-del-agente.tsx` | Cascarón: barra, la pregunta del paso como único `h1` (recibe el foco al cambiar de paso, no al montar), contenido y vista previa a la derecha (`lg`). Pie pegado abajo con «Atrás», la acción principal y, al editar, «Guardar cambios». No guarda ni navega: cada flujo decide |
| `components/domain/agentes/recorrido/vista-previa-whatsapp.tsx` | Teléfono con una conversación de WhatsApp de ejemplo y frases para probar. Reemplaza a la tarjeta viva. Por debajo de `lg`, `HojaDeVistaPrevia`: las dos últimas burbujas sobre el pie y «Ver teléfono» abre el teléfono en un `Sheet` |
| `lib/vista-previa.ts` | Las conversaciones salen de textos fijos por voz, superpoder y etapa: sin modelo ni créditos, y sin cifras que el dueño no cargó. Un superpoder apagado responde que pasa a una persona. Solo «Pruébalo» habla con el agente |
| `components/ui/elegibles.tsx` y `components/domain/agentes/paso-datos.tsx`, `paso-lo-cargado.tsx` | Compartidos por los tres flujos; ningún recorrido tiene su copia |
| Pie | `bg-surface` sólido, sin `backdrop-blur` |
| Personalizar (`/agentes/[id]/personalizar`, HU-AOS-78, HU-AOS-80) | Dentro del shell: el `PageHeader` conserva el único `h1` y la pregunta va en `h2` (`nivelDePregunta="h2"`); el pie usa `dentroDelPanel` para cubrir el relleno del `main`. Modo libre: cambiar de paso no guarda, «Guardar cambios» guarda todo (datos del cliente, nombre, borrador y flujo) sin publicar y «Publicar versión» valida los ocho pasos. Sin permiso de escritura, los pasos van en un `fieldset disabled` y no hay ni guardar ni publicar. Habilidades junta Superpoderes, Acciones y Datos del cliente; en Horario y reglas las reglas son del negocio y el horario puede ser «Heredado del negocio» o «Cambiar solo para este agente» (HU-AOS-82, `HorarioDelAgenteEditable`, con el `EditorDeFranjas` compartido): se guarda en el borrador con su propio botón y entra con la próxima publicación |
| Nuevo agente (`/agentes/nuevo` y `/agentes/[id]/personalizar?modo=crear`, HU-AOS-86, SPEC-49) | Ruta de lanzamiento de 5 estaciones (D-77, `disposicion="ruta"`): 1 Tipo (esta página: tipos en `TarjetaElegible` con baldosa, el primero libre y disponible preelegido con «Recomendado»; el guion con su `Question.default` y su porqué; `NombreSugerido` con el primero del tipo, «Tomás» en Agenda; «Crear a {nombre} y seguir» crea el borrador con `from-script`), 2 Habilidades, 3 Datos del cliente (el paso de HU-AOS-85), 4 Datos para probar (`PasoDatos`; sin ninguna forma de carga, estado vacío con «Seguir sin datos») y 5 Revisar y publicar (`SemaforoListo`, `ResumenDeEstaciones` con «Editar», la prueba del borrador y `PasoPublicar alCrear` con «Dónde atiende» y «Nota de versión»). «Publicar a {nombre}» publica la versión 1, la activa en lo elegido y lleva a la ficha; «Guardar como borrador» guarda sin publicar. Las estaciones 2 a 4 dicen «Guardar y seguir: {siguiente}». Un tipo que el negocio ya tiene (`/admin/agents/overview`, misma `key`, sin virtuales) va deshabilitado con «Ya tienes un agente «Ventas»: edítalo en vez de crear otro.» y «Editar a {nombre}»; si está archivado, «Desarchívalo» (el `PATCH` de `ArchivarAgente`, con confirmación). El 409 `key_taken` muestra el mismo texto. Voz, horario y flujo se ajustan en Personalizar |
| Personalizar en la ficha (HU-AOS-80, D-SPEC-47-3) | La acción principal de la ficha dice «Personalizar» (`BotonPersonalizar`): punto de novedad (`bg-focus`, `aria-hidden`) y «Nuevo: personaliza tu agente aquí» por `aria-describedby`; la primera vez que se enfoca o se señala abre una explicación corta sin robar el foco. Un banner de primera visita (`BannerPersonalizar`, `status-info`) dice qué cambió. Cerrar cualquiera de los dos, o entrar, lo da por visto para ese usuario y ese agente (`lib/novedad.ts`, en este navegador). `/agentes/[id]/editar` redirige conservando la query; las rutas salen de `lib/rutas-de-agente.ts`. «Lo que sabe» conserva sus interruptores y enlaza a Personalizar |
| Superpoderes por dominio (HU-AOS-83, SPEC-48) | En Habilidades (y en «Lo que sabe», que usa el mismo paso) los superpoderes van en una tarjeta por dominio con su `h3` («Ventas», «Formas de pago», «Agenda»…), en el orden de la API; un poder sin dominio cae en «Otros», al final (`lib/superpoderes-por-dominio.ts`). Las plantillas de Nuevo agente dicen lo que saben hacer con una línea por dominio |
| Formas de pago (HU-COM-21, SPEC-48) | Sección de Habilidades, solo en agentes con Comercio: una fila por forma (contra entrega, transferencia, pago en línea) con interruptor, estado en palabras (Activa, Falta configurar, Apagada; nunca solo color) y qué falta. Transferencia abre sus cuentas y la comprobación; pago en línea sin Wompi enlaza a Conexiones › Pagos. Se guarda con su propio «Guardar formas de pago» (`lib/formas-de-pago.ts`); la entrega y los datos del cliente siguen en «Datos del cliente» |
| Guion por formas de pago (HU-COM-25, SPEC-48) | En el paso Flujo, «Bloques por formas de pago» dice el estado de cada bloque en palabras (Activo, Opcional, Oculto) y por qué: «Comprobar comprobante» con transferencia y comprobante, «Verificar pago» con pago en línea; lo que falta configurar lo deja Opcional. Al guardar las formas, el guion se recompone solo (queda «con cambios» y se guarda con «Guardar cambios», sin publicar); «Restaurar guion sugerido» vuelve a la semilla con los bloques activos. Las reglas viven en `lib/guion-reglas.ts`; el teléfono muestra el diálogo de cada bloque con textos fijos |
| Conocimiento y datos | En los dos modos suma «Carga sus datos» (`PasoDatos`, `PasoLoCargado`, SPEC-45) bajo la memoria y los documentos |

## Recorrido de una pregunta a la vez (HU-UX-24, SPEC-49; HU-UX-26, SPEC-52)

Kit para crear un agente en 5 estaciones (D-77): la bienvenida (1 Tu negocio · 2 Habilidades · 3 Datos del
cliente · 4 Datos para probar · 5 Revisar y publicar) y Nuevo agente (1 Tipo y las mismas cuatro). Desde
SPEC-52 (D-80) cada estación pregunta una cosa a la vez, con el celular a la derecha en los dos recorridos.
El marco (stepper, celular y burbuja) entra con HU-UX-26; cada estación pasa a sus preguntas en HU-UX-27 a
HU-UX-31 y hasta entonces conserva su formulario.

| Pieza | Regla |
|---|---|
| Título de la ruta (**D-SPEC-52-5**, enmienda D-SPEC-49-8) | La pregunta de cada estación va en Montserrat 700 de 32/40 px desde `md` (`text-sh-ruta`), por encima del `h1` de 24/32/600 del sistema. Solo en la bienvenida y Nuevo agente; por debajo de `md`, `text-sh-h1`. Encima, el eyebrow «Paso N de 5 · {estación}» (`text-link`, 14/600) y debajo una bajada de 17–18 px (`text-body`) |
| `components/ui/barra-de-pasos.tsx` · `forma="estaciones"` | Nodos de 36 px unidos por tramos de 2 px. Hecha (D-SPEC-52-4): borde de 2 px `focus` sobre `surface` con la V del wordmark (`VDeLaMarca`, degradado de la marca `#2F6BFF → #22C7E0`, `aria-hidden`) y «hecho» para el lector. Actual: anillo de 2 px y `aria-current="step"`. Pendiente: borde `control-border` y su número. Por debajo de `md`, 5 puntos con el actual alargado y «Paso N de 5 · {estación}». Conserva `modo` y `onIr`; los segmentos siguen siendo la forma por defecto (Personalizar) |
| `components/ui/elegibles.tsx` | `TarjetaElegible` suma `baldosa` (ícono en baldosa de 44 px), `etiqueta` («Recomendado», texto sobre el borde), `razon` (por qué; se lee con la opción) y, con `deshabilitada`, `nota` (por qué no se puede elegir, borde punteado, leída por `aria-describedby`) y `accion` (enlace fuera del radio, por ejemplo «Editar a Laura»). `FichaUnica` suma `inicial` (círculo con la letra, ✓ al elegirla). `GrupoDeOpciones unica` se anuncia como `radiogroup`. Sin las props nuevas, todo se ve como antes |
| «Recomendado» | Sale del guion (`Question.default`), de los procedimientos de la plantilla y del `por_defecto` de Datos del cliente (D-SPEC-49-5). Es texto, nunca solo color, y no se usa para el nivel `recomendado` de Datos del cliente, que lleva su propio ícono. `BarraRecomendado` dice «Todo viene con lo recomendado por SolversHub» y, con cambios, «· N cambios» y «Usar lo recomendado»; los cuenta `cambiosFrenteARecomendado` (`lib/ruta-de-lanzamiento.ts`, las listas como conjuntos) |
| `NombreSugerido` | Campo con el nombre sugerido («Laura» en la bienvenida, el primero del tipo en Nuevo agente: «Tomás» en Agenda), la marca «Sugerido» mientras no cambie e ideas en fichas con inicial. Vacío dice «Ponle un nombre para seguir» y `errorDelNombre` no deja avanzar |
| Escenario (`escenario-pantalla-completa.tsx`, `escenario-tarjeta.tsx`, `escenario-piezas.tsx`) | **Ya no se usa en la ruta** (HU-UX-26: lo reemplaza el celular) y se retira en HU-UX-31; queda en `/catalogo`. Contaba lo que gana el agente en la estación. En la bienvenida, columna de 500 px a la izquierda con el logo horizontal en tinta blanca (`Marca sobreOscuro`); en Nuevo agente, tarjeta de 340 px a la derecha (`lateral` de `RecorridoDelAgente`); en el celular, `FranjaDelEscenario` arriba (logo, o ✕ «Cerrar» con «Nuevo agente · N de 5»). Siempre oscuro en los dos temas (`data-theme="sh-dark"` en el contenedor). Tarjetas sólidas `bg-escena-tarjeta` con borde `escena-borde/40` (hecha, con ✓) o punteado `escena-borde-pendiente` (pendiente); nunca transparencia detrás de texto. Las órbitas son SVG `aria-hidden` |
| Chat simulado (`ChatDeVistaPrevia`, `lib/vista-previa.ts`) | Teléfono con mensajes de prueba por estación y tipo (`sugerenciasPorEstacion`) bajo «Pruebas de «{estación}» · toca una». Al tocar uno: «escribiendo…» y una respuesta fija (`respuestaDePrueba`), sin modelo, sin red y sin créditos, con la leyenda «Es una vista previa: no le escribe a nadie». En las estaciones 1 a 3 ninguna respuesta lleva cifras ni productos; desde la 4 solo aparecen los nombres y el detalle (precio incluido) que el dueño cargó. La única prueba real sigue en la estación 5 |
| `RecorridoDelAgente disposicion="ruta"` | La barra en estaciones con `extremo` a la derecha («Terminar después» en Nuevo agente), eyebrow, título grande, `bajada`, el contenido centrado hasta 960 px y, desde 1280 px de pantalla, el `celular` a la derecha en una columna de `clamp(480px, 36vw, 720px)` igual en las 5 estaciones (D-SPEC-52-2). Por debajo de 1280 px todo va en una fila y el celular se abre desde la burbuja. El pie suma el `estado` («Faltan 2 preguntas», `role="status"`) y la línea `queSigue` («Sigue: Habilidades.») junto a la acción principal, que dice lo que pasa («Guardar y seguir: Datos del cliente», «Publicar a Laura»). Conserva el pie pegado, el foco en la pregunta y `dentroDelPanel`. El menú del panel se pliega a 72 px por debajo de `xl` y se oculta por debajo de `md`, como en el resto |
| `PreguntaDelRecorrido` y `ListaDePreguntas` (`pregunta-del-recorrido.tsx`) | Una sola pregunta abierta (D-SPEC-52-1): tarjeta `surface` con borde `focus/40`, «Pregunta n de m» (`text-link`, 13/500), título de 24 px (`text-sh-h1`, en `h2`, o `h3` dentro del shell), ayuda de 15 px y «Continuar» («Listo» en la última; deshabilitado si falta algo). Respondida: una línea con el favicon (`FaviconDeLaMarca`, `aria-hidden`), la pregunta en 14 px `text-soft` con «, respondida» para el lector, la respuesta y «Cambiar» (nombre accesible «Cambiar: {pregunta}»). Pendiente: su número en un círculo y el título en `text-soft`. Cada una es una `section` con `aria-labelledby`. La lista solo lleva cuál está abierta: las respuestas las guarda la estación, así «Cambiar» no borra las siguientes. Al continuar o cambiar, el foco pasa al título de la abierta; al montar no se mueve. `textoDeFaltan` da el estado del pie |
| `OpcionesAvanzadas` (`opciones-avanzadas.tsx`) | Al final de la estación, lo técnico (D-SPEC-52-8): `<details>` en la misma página con el ícono de ajustes, «Opciones avanzadas» en `text-link` y una línea `text-soft` con lo que hay adentro. Qué va adentro se define con el dueño en la HU de cada estación; si no hay nada, no se pone |
| `CelularDeVistaPrevia` (`celular-de-vista-previa.tsx`) | El chat simulado de la estación (`ChatDeVistaPrevia enCelular`, con la caja «Escribe como un cliente…» que en las estaciones 1 a 4 no escribe) en un teléfono de hasta 440 px, que se achica para caber en el alto de la pantalla, sobre un fondo de nodos unidos a los 8 canales (SVG `aria-hidden`, colores por token). `aviso` opcional: una línea en `bg-focus` / `text-surface` que flota sobre la caja de texto, dentro del celular, y se cierra con su × o al tocar una frase. Sin tipo o sin estación muestra `sinChat`. Leyenda: «Vista previa: no le escribe a nadie. Conectas tus canales después.» |
| `BurbujaDePrueba` (`burbuja-de-prueba.tsx`) | Por debajo de 1280 px (D-SPEC-52-3): «Probar el chat» fija abajo a la derecha (20 px del borde, 92 px sobre el pie), `bg-action` con texto blanco (el degradado del lienzo no da AA en oscuro) y punto con «, tiene un aviso» cuando el celular avisa. Abre el celular en un `Sheet` de `min(480px, 100vw)`: foco atrapado, cierre con la ×, Escape o tocando fuera, y el foco vuelve a la burbuja. Entra en 220 ms (`sh-celular-entra`), sin animación con `prefers-reduced-motion`. Reemplaza a `FranjaDelEscenario` y a `HojaDeVistaPrevia` en la ruta |

**Propuestas de esta HU (pendientes de aprobación del dueño; no son regla todavía):**

1. **Titular de Nuevo agente.** Regla desde HU-AOS-86 (diseño aprobado de SPEC-49, tableros `rn1`–`rn5`): en `/agentes/nuevo` y en `/agentes/[id]/personalizar?modo=crear` el titular grande es la pregunta de la estación y arriba solo van las migas («Agentes / Nuevo agente»), sin `PageHeader`. Es la única excepción a «una sola `PageHeader`, único `h1`»: el `h1` es la pregunta (`RecorridoDelAgente` con `nivelDePregunta="h1"`). Los avisos de esas rutas (sin permiso, tope del plan, error) conservan su `PageHeader`.
2. **Tokens del escenario.** `escena-fondo` (navy-950), `escena-tarjeta` (navy-800, el `#11224d` de los tableros), `escena-borde` y `escena-acento` (cyan-400), `escena-borde-pendiente` (steel), `escena-texto` (white) y `escena-texto-suave` (fog), más el fondo `bg-escena`. Son alias en `app/globals.css` de primitivos que ya existen en `brand/tokens`; no hay hex nuevo. Si se aprueban, pasan a `tokens.json` como rol semántico.
3. **Tablas de 5 estaciones.** Hecho con HU-UX-25: «Asistente de primer uso» y «Recorrido del agente» describen las 5 estaciones, con Datos del cliente como estación propia y fuera de Habilidades.

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
