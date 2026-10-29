# ADR-0003 — Shell adaptativo: barra lateral plegable, migas, pestañas y atajos

- **Estado:** aceptado
- **Fecha:** 2026-10-11
- **Ámbito:** `apps/panel-web` (shell del panel: `components/shell/`, `lib/shell/`, `components/ui/page-header.tsx`).
- **Origen:** SPEC-29 de `solvershub-docs` (D-32: D-SPEC-29-4), HU-DS-04 y HU-DS-05 (paleta y atajos, sección 6). Se apoya en HU-UI-03 (skip link, error, carga). Enmienda 2026-10-29: título de la página en la topbar (§7).

## Contexto

Con 3 packs y más de 40 secciones, la barra lateral fija de 240 px se come el espacio de
tablas y bandeja, y llegar a una sección hermana cuesta varios clics. No había migas ni
pestañas de sección, y el menú no se podía plegar.

## Decisión

### 1. Tres modos de barra lateral

| Modo | Cuándo | Ancho |
|---|---|---|
| `auto` (sin preferencia) | Plegada entre 768 y 1279 px, expandida desde 1280 px | 72 / 256 px |
| `plegada` / `expandida` | Lo eligió el usuario | 72 / 256 px en cualquier ancho ≥ 768 |
| Cajón | Debajo de 768 px (`MobileNav`) | Pantalla completa, siempre expandido |

El modo `auto` se resuelve **por CSS** (`w-[72px] xl:w-64`): no hace falta medir el ancho con
JS y no hay salto al cargar. Se renderizan las dos estructuras (lista expandida y barra de
íconos) y el CSS oculta la que no va (`display: none`, así que solo una queda en el árbol
de accesibilidad).

### 2. La preferencia va en una cookie (D-SPEC-29-4)

`panel_sidebar=expandida|plegada` (un año, `samesite=lax`), que lee el layout en el
servidor. Con `localStorage` la barra saldría expandida y saltaría al hidratar. Los grupos
plegados siguen en `localStorage`, como antes (no afectan el ancho).

### 3. Barra plegada

- Secciones del core como íconos directos. El nombre va en `aria-label` y, a la vista, en una
  etiqueta que aparece con hover o foco, sin un segundo tab stop (el `Tooltip` del kit agrega
  uno).
- Cada pack es un ícono que abre un `DropdownMenu` a la derecha, con sus secciones como
  enlaces (`DropdownMenuLinkItem`, nuevo en el kit).
- Cada sección de un pack tiene su propio ícono (antes 12 de 14 en Cobranza usaban
  `HandCoins`). Lo exige un test.
- Indicador de página actual: barra de 3 px `bg-focus` + `surface-raised` + `aria-current`.
  En la barra plegada se marca el grupo que contiene la página.

### 4. Migas y pestañas automáticas

El `PageHeader` arma solo las migas (grupo › sección y, en un detalle, el título de la
página) y, en las secciones de un pack, las pestañas con las hermanas de la misma
subsección (`TabLinks`, enlaces con `aria-current`). Todo sale de `nav.ts` y de los permisos
(`ShellProvider`), en `lib/shell/navegacion.ts`, que tiene tests. Una página puede pasar
`breadcrumbs` o `tabs` propios si los necesita.

### 5. Atajos

`[` pliega o expande la barra (no se dispara dentro de campos editables ni con
modificadores). La paleta Ctrl/⌘ K, la ayuda de atajos y el interruptor para apagar los
atajos de una tecla (WCAG 2.1.4) son de HU-DS-05 (sección 6).

### 6. Paleta de comandos y atajos de una tecla (HU-DS-05)

| Atajo | Acción | Se puede apagar |
|---|---|---|
| Ctrl/⌘ K | Abre o cierra la paleta, también desde un campo | No (lleva modificador) |
| `/` | Enfoca el buscador de la página (`input[type="search"]`, `name="q"` o `data-buscador`) | Sí |
| `[` | Pliega o expande la barra | Sí |
| `g` + `i` · `a` · `c` · `v` | Resumen · Escalaciones · Conversaciones · Cobranza o Comercio | Sí |
| `?` | Ayuda de atajos | Sí |

- **Índice de la paleta** (`lib/shell/paleta.ts`, con tests de permisos): secciones de `nav.ts`
  que el usuario ve, sin los packs apagados del negocio; acciones rápidas (pausar o
  reactivar el asistente solo con escritura en Configuración, tema, menú, atajos); y
  registros de `GET /api/v1/search` (ADR-0096 del backend) por el BFF `/api/buscar`, a los
  250 ms de la última tecla, agrupados por sección. El backend filtra por permisos y negocio.
- **Filtro propio, no el de `cmdk`:** sin tildes ni mayúsculas, el inicio de palabra gana. Los
  registros ya vienen filtrados y pueden coincidir por un dato que no se muestra (el teléfono).
- **Carga diferida:** `cmdk` y la paleta (`next/dynamic`) se descargan al abrirla por primera
  vez (7 KB comprimidos), no con cada página.
- **Lector de pantalla:** `cmdk` 1.1.1 no actualiza `aria-activedescendant` al cambiar la
  consulta; la paleta controla la selección y lo pone a mano tras cada render. Una región
  `aria-live` dice cuántos resultados hay. El foco vuelve a donde estaba al cerrar.
- **Acciones con consecuencia:** "Pausar asistente" cierra la paleta, espera a que devuelva el
  foco y pide confirmación diciendo qué pasa con los clientes.
- **Las letras de `g`** son las del menú v2 (Inicio, Atención, Conversaciones, Ventas y
  cobros; HU-UX-02). Hasta que llegue, apuntan a las secciones actuales y la ayuda las nombra
  como se ven en el menú.
- **Preferencia:** cookie `panel_atajos=apagados` (un año, `samesite=lax`), leída en el
  servidor. Es personal y de este navegador: no va en la configuración del negocio.

### 7. Título de la página en la topbar al hacer scroll (2026-10-29)

- El `h1` del `PageHeader` se publica en un contexto del shell
  (`components/shell/titulo-de-pagina.tsx`) y la topbar lo repite cuando empieza a ocultarse
  por arriba del contenedor de scroll (`main#contenido`).
- Se mide con un listener pasivo de scroll + `requestAnimationFrame` (un cálculo por frame),
  no con `IntersectionObserver`: hace falta disparar cuando el `h1` **empieza** a salir, no
  cuando termina. Histéresis de 8 px para no parpadear en el umbral.
- Entrada desde abajo (`translate-y-2 → 0` + opacidad) con los tokens de motion del kit:
  200 ms `ease-sh-out` al aparecer, 150 ms `ease-sh-in` al retirarse; `prefers-reduced-motion`
  ya lo neutraliza globalmente.
- El `h1` real no se mueve ni se duplica: el texto de la barra es `aria-hidden`. En celular
  el título reemplaza al nombre del negocio mientras está visible; en escritorio conviven
  separados por una línea.
- La lista del selector de negocios sigue desplazable (`overscroll-contain` y alto máximo
  relativo al viewport), para que siga siendo usable con muchos negocios.

## Consecuencias

- Las páginas nuevas reciben migas y pestañas sin código propio.
- El contenido del menú (grupos y nombres) sigue en `nav.ts` y lo redefine HU-UX-02 (SPEC-12);
  este ADR no cambia nombres.
- El diseño pedía que el shell entrara detrás de `PANEL_SHELL_V2` hasta una prueba con 5
  usuarios. **No se usó la variable**: el cambio no toca datos, se revierte con un `git revert`,
  y mantener dos shells en paralelo duplicaba pruebas. La prueba con usuarios sigue pendiente.

## Alternativas descartadas

- **Medir el ancho con JS para el modo auto:** salto visible al hidratar.
- **Solo `localStorage` para la preferencia:** ídem.
- **`Tooltip` del kit en la barra plegada:** suma un tab stop por ícono.
- **Filtro de `cmdk` para la paleta:** escondía registros que coinciden por un campo oculto y
  no ignora tildes.
- **Preferencia de atajos en el backend:** valdría en todos los dispositivos del usuario, pero
  pide un endpoint nuevo para una preferencia de un navegador; se revisa si alguien lo pide.
