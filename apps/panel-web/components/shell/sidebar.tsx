"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useEffectEvent, useState, useSyncExternalStore } from "react";
import { ArrowUpRight, ChevronRight, Lock, PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { EVENTO_ALTERNAR_MENU, useAtajos } from "@/components/shell/atajos-context";
import { DEFAULT_COLLAPSED_GROUPS, NAV_GROUPS, type NavItem } from "@/components/shell/nav";
import { Kbd } from "@/components/ui/kbd";
import { Marca } from "@/components/ui/marca";
import { Tooltip } from "@/components/ui/tooltip";
import type { Me } from "@/lib/api/types";
import { gruposVisibles, itemActivo } from "@/lib/shell/navegacion";
import { esCampoEditable } from "@/lib/shell/paleta";
import { cookieModoSidebar, type ModoSidebar } from "@/lib/shell/preferencias";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "panel_nav_collapsed";

// Grupos colapsados en localStorage, expuesto con useSyncExternalStore
// (evita setState dentro de un efecto y mantiene la referencia estable).
let colapsadosCache: string[] | null = null;
const oyentes = new Set<() => void>();

function leerColapsados(): string[] {
  if (colapsadosCache) return colapsadosCache;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    colapsadosCache = raw ? (JSON.parse(raw) as string[]) : DEFAULT_COLLAPSED_GROUPS;
  } catch {
    colapsadosCache = DEFAULT_COLLAPSED_GROUPS;
  }
  return colapsadosCache;
}

function escribirColapsados(next: string[]) {
  colapsadosCache = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* sin persistencia */
  }
  oyentes.forEach((notificar) => notificar());
}

function suscribir(notificar: () => void) {
  oyentes.add(notificar);
  return () => {
    oyentes.delete(notificar);
  };
}

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
  locked,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  locked?: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const base = "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors";

  if (!item.ready) {
    return (
      <span aria-disabled="true" className={cn(base, "cursor-not-allowed text-text-soft")}>
        <Icon className="h-4 w-4" aria-hidden />
        <span className="flex-1">{item.label}</span>
      </span>
    );
  }

  // Un pack apagado sigue enlazando: su página explica cómo habilitarlo (PackLockBanner).
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      // Objetivo del recorrido guiado (HU-SH-06): el tour resalta el enlace por su ruta.
      data-tour={item.href}
      aria-current={active ? "page" : undefined}
      title={locked ? "Pack no habilitado" : undefined}
      className={cn(
        base,
        active ? ACTIVO : locked ? "text-text-soft hover:bg-hover" : "text-body hover:bg-hover hover:text-headline",
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
      <span className="flex-1">{item.label}</span>
      {locked && <Lock className="h-3.5 w-3.5" aria-label="Pack no habilitado" />}
      {item.legacy && <ArrowUpRight className="h-3.5 w-3.5 text-text-soft" aria-label="Abre el panel clásico" />}
    </Link>
  );
}

/**
 * Ícono de la barra plegada: el nombre va en `aria-label` y, a la vista, en un `Tooltip`
 * con portal que aparece al pasar el puntero o al enfocar (sin un segundo tab stop). Al
 * ir en un portal, el scroll de la barra no lo recorta ni crea un scroll lateral.
 */
function IconoDeRiel({ item, active, locked }: { item: NavItem; active: boolean; locked: boolean }) {
  const Icon = item.icon;
  const nombre = locked ? `${item.label} (no habilitado)` : item.label;
  return (
    <Tooltip label={nombre} side="right" focusable={false}>
      <Link
        href={item.href}
        aria-label={nombre}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-md transition-colors",
          active ? ACTIVO : "text-body hover:bg-hover hover:text-headline",
        )}
      >
        <Icon className="h-[18px] w-[18px]" aria-hidden />
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
  modo: modoInicial = "auto",
  className,
  onNavigate,
}: {
  me: Me;
  packs: Record<string, PackState>;
  /** Preferencia guardada; el menú móvil pasa `expandida`. */
  modo?: ModoSidebar;
  className?: string;
  /** El menú móvil lo usa para cerrarse al elegir una sección. */
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const [modo, setModo] = useState<ModoSidebar>(modoInicial);
  const collapsedIds = useSyncExternalStore(suscribir, leerColapsados, () => DEFAULT_COLLAPSED_GROUPS);
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

  function toggle(id: string) {
    escribirColapsados(
      collapsedIds.includes(id) ? collapsedIds.filter((value) => value !== id) : [...collapsedIds, id],
    );
  }

  // Permisos y rol del `/admin/me` de este render (el vigilante lo refresca si cambian).
  const visibleByGroup = gruposVisibles(me.permissions, NAV_GROUPS, me.role === "master");
  const activeHref = itemActivo(pathname, visibleByGroup)?.item.href ?? "";
  const bloqueada = (item: NavItem) => Boolean(item.pack && packs[item.pack] && !packs[item.pack].enabled);

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
        <Link href="/dashboard" onClick={onNavigate} className="mb-6 flex items-center gap-3 px-3">
          <Marca pieza="wordmark" className="h-6 w-auto" />
        </Link>

        <nav aria-label="Secciones del panel" className="flex flex-1 flex-col gap-1.5 overflow-y-auto">
          {visibleByGroup.map(({ group, visible }) => {
            const conActiva = visible.some((item) => item.href === activeHref);
            const open = conActiva || !collapsedIds.includes(group.id);
            return (
              <div key={group.id} className="flex flex-col gap-0.5">
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => toggle(group.id)}
                  className="flex items-center gap-2 rounded-md px-3 py-1.5 text-[11px] font-medium tracking-[0.06em] text-text-soft uppercase transition-colors hover:text-headline"
                >
                  <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-90")} aria-hidden />
                  <span className="flex-1 text-left">{group.label}</span>
                </button>
                {open && (
                  <div className="flex flex-col gap-0.5">
                    {visible.map((item) => (
                      <NavRow
                        key={item.href}
                        item={item}
                        active={item.href === activeHref}
                        locked={bloqueada(item)}
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
          <Link href="/dashboard" aria-label="SolversHub, ir al Resumen" className="mb-5 flex h-10 w-10 items-center justify-center">
            <Marca pieza="isotipo" className="h-8 w-8" />
          </Link>
          <nav aria-label="Secciones del panel" className="flex flex-1 flex-col items-center gap-1 overflow-x-hidden overflow-y-auto">
            {visibleByGroup.map(({ group, visible }, i) => (
              <div key={group.id} className="flex flex-col items-center gap-1">
                {i > 0 && <span aria-hidden className="my-1 h-px w-8 bg-border-soft" />}
                {visible
                  .filter((item) => item.ready)
                  .map((item) => (
                    <IconoDeRiel key={item.href} item={item} active={item.href === activeHref} locked={bloqueada(item)} />
                  ))}
              </div>
            ))}
          </nav>
        </div>
      )}

      {/* Plegar o expandir (no en el cajón móvil). */}
      {!esMovil && (
        <div className={cn("mt-3 border-t border-border-soft px-3 pt-3", !expandidaAhora && "flex justify-center")}>
          <button
            type="button"
            onClick={alternar}
            aria-expanded={expandidaAhora}
            aria-label={expandidaAhora ? "Plegar menú" : "Expandir menú"}
            className={cn(
              "flex items-center gap-2 rounded-md text-sm text-body transition-colors hover:bg-hover hover:text-headline",
              expandidaAhora ? "w-full px-3 py-2" : "h-10 w-10 justify-center",
            )}
          >
            {expandidaAhora ? <PanelLeftClose className="h-4 w-4" aria-hidden /> : <PanelLeftOpen className="h-4 w-4" aria-hidden />}
            {expandidaAhora && (
              <>
                <span className="flex-1 text-left">Plegar menú</span>
                <Kbd keys={["["]} />
              </>
            )}
          </button>
        </div>
      )}
    </aside>
  );
}
