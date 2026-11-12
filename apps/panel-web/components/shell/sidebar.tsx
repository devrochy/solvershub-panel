"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useEffectEvent, useState, useSyncExternalStore } from "react";
import { ArrowUpRight, ChevronRight, Lock, PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { EVENTO_ALTERNAR_MENU, useAtajos } from "@/components/shell/atajos-context";
import { NAV_GROUPS, type NavItem } from "@/components/shell/nav";
import { UserCard } from "@/components/shell/user-card";
import { Badge } from "@/components/ui/badge";
import { Marca } from "@/components/ui/marca";
import { Tooltip } from "@/components/ui/tooltip";
import type { Me } from "@/lib/api/types";
import { gruposVisibles, itemActivo } from "@/lib/shell/navegacion";
import { SIN_OBSERVABILIDAD, type EnlacesObservabilidad } from "@/lib/observabilidad-url";
import { esCampoEditable } from "@/lib/shell/paleta";
import type { EstadoModulo } from "@/lib/shell/modulos";
import { DEFAULT_THEME, type ThemeName } from "@/lib/theme";
import { cookieModoSidebar, type ModoSidebar } from "@/lib/shell/preferencias";
import { cn } from "@/lib/utils";

// Ancho desde el que el modo `auto` se ve expandido (xl de Tailwind, SPEC-29 §3).
const ANCHO_EXPANDIDA = "(min-width: 1280px)";

// Sin `matchMedia` (navegadores viejos, jsdom) se asume escritorio ancho.
function suscribirAncho(notificar: () => void) {
  if (typeof window.matchMedia !== "function") return () => undefined;
  const mq = window.matchMedia(ANCHO_EXPANDIDA);
  mq.addEventListener("change", notificar);
  return () => mq.removeEventListener("change", notificar);
}

function leerAncho(): boolean {
  return typeof window.matchMedia === "function" ? window.matchMedia(ANCHO_EXPANDIDA).matches : true;
}

export type PackState = { enabled: boolean; hasConfig: boolean };

/** Indicador de la página actual: barra de 3 px con el foco del tema + fondo elevado. */
const ACTIVO =
  "relative bg-surface-raised text-headline before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full before:bg-focus";

function NavRow({
  item,
  active,
  estado,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  /** `plan` = sin agente (mejora el plan); `pack` = el módulo está apagado. */
  estado?: EstadoModulo;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const base = "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors";
  const bloqueado = estado === "plan" || estado === "pack";
  const motivo =
    estado === "plan" ? "Mejora tu plan para usar este módulo" : estado === "pack" ? "Módulo apagado" : null;

  if (!item.ready) {
    return (
      <span aria-disabled="true" className={cn(base, "cursor-not-allowed text-text-soft")}>
        <Icon className="h-4 w-4" aria-hidden />
        <span className="flex-1">{item.label}</span>
      </span>
    );
  }

  // Un módulo bloqueado sigue enlazando: su página explica cómo mejorarlo o activarlo, sin
  // dejar interactuar con los datos (GuardiaDeModulo).
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      // Objetivo del recorrido guiado (HU-SH-06): el tour resalta el enlace por su ruta.
      data-tour={item.href}
      aria-current={active ? "page" : undefined}
      aria-label={motivo ? `${item.label} (${motivo})` : undefined}
      title={motivo ?? undefined}
      className={cn(
        base,
        active ? ACTIVO : bloqueado ? "text-text-soft hover:bg-hover" : "text-body hover:bg-hover hover:text-headline",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {estado === "plan" && (
        <Badge variant="neutral" icon={<Lock aria-hidden className="h-3 w-3" />} className="shrink-0 px-1.5 py-0">
          Plan
        </Badge>
      )}
      {estado === "pack" && <Lock className="h-3.5 w-3.5 shrink-0" aria-label="Módulo apagado" />}
      {item.legacy && <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-text-soft" aria-label="Abre el panel clásico" />}
    </Link>
  );
}

/**
 * Ícono de la barra plegada: el nombre va en `aria-label` y, a la vista, en un `Tooltip`
 * con portal que aparece al pasar el puntero o al enfocar (sin un segundo tab stop). Al
 * ir en un portal, el scroll de la barra no lo recorta ni crea un scroll lateral.
 */
function IconoDeRiel({ item, active, estado }: { item: NavItem; active: boolean; estado?: EstadoModulo }) {
  const Icon = item.icon;
  const bloqueado = estado === "plan" || estado === "pack";
  const nombre =
    estado === "plan"
      ? `${item.label} (mejora tu plan)`
      : estado === "pack"
        ? `${item.label} (módulo apagado)`
        : item.label;
  return (
    <Tooltip label={nombre} side="right" focusable={false}>
      <Link
        href={item.href}
        aria-label={nombre}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-md transition-colors",
          active ? ACTIVO : bloqueado ? "text-text-soft hover:bg-hover" : "text-body hover:bg-hover hover:text-headline",
        )}
      >
        <span className="relative flex items-center justify-center">
          <Icon className="h-[18px] w-[18px]" aria-hidden />
          {bloqueado && (
            <Lock
              aria-hidden
              className="absolute -right-1.5 -bottom-1.5 h-2.5 w-2.5 rounded-full bg-bg-deep text-text-soft"
            />
          )}
        </span>
      </Link>
    </Tooltip>
  );
}

/**
 * Menú lateral adaptativo (HU-DS-04):
 * - expandido (256 px) con grupos plegables;
 * - plegado (72 px) con un ícono por entrada del menú v2 (HU-UX-02);
 * - en `auto` (sin preferencia) se pliega entre 768 y 1279 px por CSS, sin JS ni salto.
 * La preferencia la guarda la cookie `panel_sidebar` (la lee el layout). El atajo `[`
 * pliega o expande, salvo mientras se escribe. La entrada de un pack sin habilitar se
 * muestra con candado; su página ofrece activarlo (ADR-0019).
 */
export function Sidebar({
  me,
  packs,
  modulos = {},
  modo: modoInicial = "auto",
  initialTheme = DEFAULT_THEME,
  docsUrl = null,
  observabilidad = SIN_OBSERVABILIDAD,
  className,
  onNavigate,
}: {
  me: Me;
  packs: Record<string, PackState>;
  /** Estado de cada módulo (agente publicado + pack): filas habilitadas o bloqueadas. */
  modulos?: Record<string, EstadoModulo>;
  /** Preferencia guardada; el menú móvil pasa `expandida`. */
  modo?: ModoSidebar;
  /** Tema leído de la cookie en el servidor (para la tarjeta del usuario). */
  initialTheme?: ThemeName;
  /** Destino de «Documentación» para la tarjeta del usuario (`WIKI_URL`); sin él no se muestra. */
  docsUrl?: string | null;
  /** Grafana y Kibana para la tarjeta del usuario; el layout solo los llena para el master. */
  observabilidad?: EnlacesObservabilidad;
  className?: string;
  /** El menú móvil lo usa para cerrarse al elegir una sección. */
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const [modo, setModo] = useState<ModoSidebar>(modoInicial);
  /**
   * Acordeón de una sola sección. Sin clic del usuario, se abre la sección de la página
   * actual; si no hay, la del primer módulo habilitado. El `path` evita que el grupo
   * abierto de la página anterior se quede abierto al navegar.
   */
  const [abierto, setAbierto] = useState<{ path: string; id: string | null } | null>(null);
  const anchoExpandida = useSyncExternalStore(suscribirAncho, leerAncho, () => true);
  const expandidaAhora = modo === "expandida" || (modo === "auto" && anchoExpandida);
  const esMovil = Boolean(onNavigate);

  function alternar() {
    const siguiente = expandidaAhora ? "plegada" : "expandida";
    document.cookie = cookieModoSidebar(siguiente);
    setModo(siguiente);
  }

  // Atajo `[` (no en el cajón móvil, ni mientras se escribe, ni con los atajos de una
  // tecla apagados, HU-DS-05) y la acción "Plegar o expandir el menú" de la paleta. Los
  // listeners se registran una sola vez; `useEffectEvent` les da siempre el estado actual.
  const atajosActivos = useAtajos()?.atajosActivos ?? true;
  const alPulsar = useEffectEvent((e: KeyboardEvent) => {
    if (e.key === "[" && atajosActivos && !esCampoEditable(e.target) && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      alternar();
    }
  });
  const alPedirlo = useEffectEvent(() => alternar());
  useEffect(() => {
    if (esMovil) return;
    window.addEventListener("keydown", alPulsar);
    window.addEventListener(EVENTO_ALTERNAR_MENU, alPedirlo);
    return () => {
      window.removeEventListener("keydown", alPulsar);
      window.removeEventListener(EVENTO_ALTERNAR_MENU, alPedirlo);
    };
  }, [esMovil]);

  // Permisos y rol del `/admin/me` de este render (el vigilante lo refresca si cambian).
  const visibleByGroup = gruposVisibles(me.permissions, NAV_GROUPS, me.role === "master");
  const activo = itemActivo(pathname, visibleByGroup);
  const activeHref = activo?.item.href ?? "";
  const grupoActivo = activo?.group.id ?? null;
  // Sin página activa (login, ruta fuera del menú): se abre el grupo del primer módulo usable.
  const grupoConModulo =
    visibleByGroup.find(({ visible }) => visible.some((item) => estadoDe(item) === "habilitado"))?.group.id ?? null;
  const abiertoEfectivo = abierto?.path === pathname ? abierto.id : (grupoActivo ?? grupoConModulo);

  /**
   * Estado de la fila. Con `modulos` del layout manda el agente publicado; sin él (tests o
   * llamadas antiguas) se cae al estado del pack, como antes.
   */
  function estadoDe(item: NavItem): EstadoModulo | undefined {
    if (!item.pack) return undefined;
    if (modulos?.[item.pack]) return modulos[item.pack];
    return packs[item.pack] && !packs[item.pack].enabled ? "pack" : undefined;
  }

  const habilitado = (item: NavItem) => {
    const estado = estadoDe(item);
    return estado !== "plan" && estado !== "pack";
  };
  /** Los módulos usables primero; los bloqueados al final, conservando el orden del menú. */
  const ordenados = (visible: NavItem[]) =>
    [...visible].sort((a, b) => Number(!habilitado(a)) - Number(!habilitado(b)));

  // Qué estructura se ve en cada modo (CSS; las dos se renderizan y una queda oculta).
  const verExpandida = { auto: "hidden xl:flex", expandida: "flex", plegada: "hidden" }[modo];
  const verPlegada = { auto: "flex xl:hidden", expandida: "hidden", plegada: "flex" }[modo];
  const ancho = { auto: "w-[72px] xl:w-64", expandida: "w-64", plegada: "w-[72px]" }[modo];

  return (
    <aside
      data-modo={modo}
      className={cn(
        "flex shrink-0 flex-col border-r border-border-soft bg-bg-deep py-4 transition-[width] duration-200 ease-sh-out",
        esMovil ? "w-full px-3" : ancho,
        className,
      )}
    >
      {/* Expandida (o cajón móvil). */}
      <div className={cn("min-h-0 flex-1 flex-col px-3", esMovil ? "flex" : verExpandida)}>
        <div className="mb-6 flex items-center gap-2 px-3">
          <Link href="/dashboard" onClick={onNavigate} className="flex min-w-0 flex-1 items-center gap-3">
            <Marca pieza="wordmark" className="h-6 w-auto" />
          </Link>
          {!esMovil && (
            <button
              type="button"
              onClick={alternar}
              aria-expanded={expandidaAhora}
              aria-label="Plegar menú"
              title="Plegar menú ([)"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-text-soft transition-colors hover:bg-hover hover:text-headline"
            >
              <PanelLeftClose className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>

        <nav aria-label="Secciones del panel" className="flex flex-1 flex-col gap-1.5 overflow-y-auto">
          {visibleByGroup.map(({ group, visible }) => {
            const open = abiertoEfectivo === group.id;
            return (
              <div key={group.id} className="flex flex-col gap-0.5">
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setAbierto({ path: pathname, id: open ? null : group.id })}
                  className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sh-caption font-medium tracking-[0.06em] text-text-soft uppercase transition-colors hover:text-headline"
                >
                  <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-90")} aria-hidden />
                  <span className="flex-1 text-left">{group.label}</span>
                </button>
                {open && (
                  <div className="flex flex-col gap-0.5">
                    {ordenados(visible).map((item) => (
                      <NavRow
                        key={item.href}
                        item={item}
                        active={item.href === activeHref}
                        estado={estadoDe(item)}
                        onNavigate={onNavigate}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Plegada: barra de íconos. */}
      {!esMovil && (
        <div className={cn("min-h-0 flex-1 flex-col items-center", verPlegada)}>
          <Link href="/dashboard" aria-label="SolversHub, ir al Resumen" className="mb-2 flex h-10 w-10 items-center justify-center">
            <Marca pieza="isotipo" className="h-8 w-8" />
          </Link>
          <button
            type="button"
            onClick={alternar}
            aria-expanded={expandidaAhora}
            aria-label="Expandir menú"
            title="Expandir menú ([)"
            className="mb-3 flex h-9 w-9 items-center justify-center rounded-md text-text-soft transition-colors hover:bg-hover hover:text-headline"
          >
            <PanelLeftOpen className="h-4 w-4" aria-hidden />
          </button>
          <nav aria-label="Secciones del panel" className="flex flex-1 flex-col items-center gap-1 overflow-x-hidden overflow-y-auto">
            {visibleByGroup.map(({ group, visible }, i) => (
              <div key={group.id} className="flex flex-col items-center gap-1">
                {i > 0 && <span aria-hidden className="my-1 h-px w-8 bg-border-soft" />}
                {ordenados(visible)
                  .filter((item) => item.ready)
                  .map((item) => (
                    <IconoDeRiel key={item.href} item={item} active={item.href === activeHref} estado={estadoDe(item)} />
                  ))}
              </div>
            ))}
          </nav>
        </div>
      )}

      {/* Tarjeta del usuario fija al pie. */}
      <div className={cn("mt-3 border-t border-border-soft px-3 pt-3", !expandidaAhora && !esMovil && "flex justify-center")}>
        <UserCard
          me={me}
          initialTheme={initialTheme}
          docsUrl={docsUrl}
          observabilidad={observabilidad}
          collapsed={!expandidaAhora && !esMovil}
          onNavigate={onNavigate}
        />
      </div>
    </aside>
  );
}
