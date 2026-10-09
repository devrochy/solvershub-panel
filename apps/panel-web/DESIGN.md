# DESIGN.md — Panel SolversHub

Reglas del sistema de diseño del panel. Toda pieza nueva debe cumplirlas. La
identidad viene de `solvershub/brand/` (manual + tokens DTCG); aquí se documenta
cómo se aplica en este proyecto.

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

## Layout

- Contenedor de contenido: `max-w-[1200px]` centrado, padding `px-6 py-8`.
- Sidebar `w-60`; topbar `h-16`.
- Ritmo vertical entre bloques: 24 px (`gap-6`); dentro de tarjetas, 20 px.
- Una sola `PageHeader` por página (es el único `h1`).

## Tipografía

- Display: **Montserrat** — títulos de página 24 px/600, cifras grandes 30 px/700.
- Cuerpo: **Inter** 15 px, `line-height 1.6`.
- Labels y ayudas: 12–13 px.
- Mayúsculas **solo** en cabeceras de tabla, con `tracking 0.06em`.
- Nada de justificado.

## Color

- Tokens semánticos siempre (`surface`, `border-soft`, `text-soft`…); nunca hex suelto.
- Oscuro: texto `ice #E8EDF7` (no blanco puro), secundario `fog`, terciario `haze`.
- Claro: `paper #F7F9FC`, texto `navy-900`, secundario `slate-600`, terciario `slate-500`.
- Acentos: cyan para **datos** y enlaces; gradiente de marca **solo** en la CTA principal.
- Estados en **tinte suave** (`/12`), nunca relleno saturado.
- Contraste verificado: AA mínimo; AAA en texto de cuerpo.

## Motion

- Microinteracciones 150 ms; overlays 200 ms; `ease-out`.
- Se anima solo lo que cambia de estado (hover, foco, apertura). Nada de pulsing,
  hover-scale global ni stagger decorativo.
- `prefers-reduced-motion` respetado de forma global.

## Accesibilidad

- Foco visible (outline 2 px del tema) en todo elemento interactivo.
- Controles con nombre accesible; iconos decorativos `aria-hidden`.
- El color nunca es el único portador de información (siempre etiqueta o icono).
- Carga con `Skeleton` (conserva la forma), no spinners.

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

`npm run test` · `npm run typecheck` · `npm run lint` · `npm run build`
(`make panel-check`) + auditorías de accesibilidad y anti-patterns antes de cerrar.
