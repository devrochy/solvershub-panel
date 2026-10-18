"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useEffectEvent, useState, useSyncExternalStore } from "react";
import { ArrowUpRight, ChevronRight, Lock, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";

import { EVENTO_ALTERNAR_MENU, useAtajos } from "@/components/shell/atajos-context";
import { EnablePackButton } from "@/components/shell/enable-pack-button";
import { DEFAULT_COLLAPSED_GROUPS, NAV_GROUPS, type NavGroupDef, type NavItem } from "@/components/shell/nav";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuLinkItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Kbd } from "@/components/ui/kbd";
import { Marca } from "@/components/ui/marca";
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

  if (!item.ready || locked) {
    return (
      <span
        aria-disabled="true"
        className={cn(base, "cursor-not-allowed text-text-soft")}
        title={locked ? "Pack no habilitado" : undefined}
      >
        <Icon className="h-4 w-4" aria-hidden />
        <span className="flex-1">{item.label}</span>
        {locked && <Lock className="h-3.5 w-3.5" aria-hidden />}
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      // Objetivo del recorrido guiado (HU-SH-06): el tour resalta el enlace por su ruta.
      data-tour={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(base, active ? ACTIVO : "text-body hover:bg-hover hover:text-headline")}
    >
      <Icon className="h-4 w-4" aria-hidden />
      <span className="flex-1">{item.label}</span>
      {item.legacy && <ArrowUpRight className="h-3.5 w-3.5 text-text-soft" aria-label="Abre el panel clásico" />}
    </Link>
  );
}

/**
 * Ícono de la barra plegada: el nombre va en `aria-label` y, a la vista, en una etiqueta
 * que aparece al pasar el puntero o al enfocar (sin un segundo tab stop).
 */
function IconoDeRiel({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group/riel flex h-10 w-10 items-center justify-center rounded-md transition-colors",
        active ? ACTIVO : "text-body hover:bg-hover hover:text-headline",
      )}
    >
      <Icon className="h-[18px] w-[18px]" aria-hidden />
      <span
        aria-hidden
        className="pointer-events-none absolute left-full z-50 ml-3 hidden whitespace-nowrap rounded-md border border-border-soft bg-surface px-2.5 py-1.5 text-xs text-headline shadow-elev-2 group-hover/riel:block group-focus-visible/riel:block"
      >
        {item.label}
      </span>
    </Link>
  );
}

/** Grupo con muchas secciones en la barra plegada: un ícono que abre un menú flotante. */
function GrupoDeRiel({
  group,
  items,
  activeHref,
  locked,
}: {
  group: NavGroupDef;
  items: NavItem[];
  activeHref: string;
  locked: boolean;
}) {
  const Icon = group.icon ?? items[0].icon;
  const conActiva = items.some((item) => item.href === activeHref);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={locked ? `${group.label} (no habilitado)` : group.label}
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-md transition-colors",
          conActiva ? ACTIVO : "text-body hover:bg-hover hover:text-headline",
        )}
      >
        <Icon className="h-[18px] w-[18px]" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="start" className="max-h-[70vh] overflow-y-auto">
        <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
        {items.map((item) => {
          const ItemIcon = item.icon;
          const activo = item.href === activeHref;
          return (
            <DropdownMenuLinkItem key={item.href} href={item.href} current={activo} disabled={locked || !item.ready}>
              <ItemIcon className="h-4 w-4 text-text-soft" aria-hidden />
              {item.label}
            </DropdownMenuLinkItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Menú lateral adaptativo (HU-DS-04):
 * - expandido (256 px) con grupos plegables, como antes;
 * - plegado (72 px) con íconos: las secciones del core directo y cada pack como un
 *   ícono que abre un menú flotante;
 * - en `auto` (sin preferencia) se pliega entre 768 y 1279 px por CSS, sin JS ni salto.
 * La preferencia la guarda la cookie `panel_sidebar` (la lee el layout). El atajo `[`
 * pliega o expande, salvo mientras se escribe. Un pack sin habilitar se muestra con
 * candado y su CTA para activarlo (ADR-0019).
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
            const pack = group.pack ? packs[group.pack] : undefined;
            const locked = Boolean(group.pack) && pack ? !pack.enabled : false;
            const conActiva = visible.some((item) => item.href === activeHref);
            const open = conActiva || !collapsedIds.includes(group.id);
            const GroupIcon = group.icon;
            return (
              <div key={group.id} className="flex flex-col gap-0.5">
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => toggle(group.id)}
                  className="flex items-center gap-2 rounded-md px-3 py-1.5 text-[11px] font-medium tracking-[0.06em] text-text-soft uppercase transition-colors hover:text-headline"
                >
                  <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-90")} aria-hidden />
                  {GroupIcon && <GroupIcon className="h-3.5 w-3.5" aria-hidden />}
                  <span className="flex-1 text-left">{group.label}</span>
                  {locked && <Lock className="h-3.5 w-3.5" aria-label="Pack no habilitado" />}
                </button>

                {open && locked && group.pack ? (
                  // Pack deshabilitado: solo el mensaje para habilitarlo (sin la lista
                  // de ítems bloqueados) y con cierre para no volver a verlo.
                  <div className="mx-3 mb-1 rounded-md border border-border-soft bg-surface p-3">
                    <div className="flex items-start justify-between gap-2 pb-2">
                      <p className="text-xs text-body">Este pack no está habilitado para el negocio.</p>
                      <button
                        aria-label="Cerrar el aviso del pack"
                        className="-mt-1 -mr-1 rounded p-1 text-text-soft hover:text-headline"
                        onClick={() => toggle(group.id)}
                        type="button"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </div>
                    <EnablePackButton pluginId={group.pack} label={group.label} hasConfig={Boolean(pack?.hasConfig)} />
                  </div>
                ) : open ? (
                  <div className="flex flex-col gap-0.5">
                    {visible.map((item, index) => (
                      <Fragment key={`${item.href}-${index}`}>
                        {item.sub && item.sub !== visible[index - 1]?.sub && (
                          <p className="px-3 pt-1 text-[10px] tracking-[0.08em] text-text-soft uppercase">{item.sub}</p>
                        )}
                        <NavRow item={item} active={item.href === activeHref} locked={locked} onNavigate={onNavigate} />
                      </Fragment>
                    ))}
                  </div>
                ) : null}
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
          <nav aria-label="Secciones del panel" className="flex flex-1 flex-col items-center gap-1 overflow-y-auto overflow-x-visible">
            {visibleByGroup.map(({ group, visible }, i) => {
              const pack = group.pack ? packs[group.pack] : undefined;
              const locked = Boolean(group.pack) && pack ? !pack.enabled : false;
              return (
                <div key={group.id} className="relative flex flex-col items-center gap-1">
                  {i > 0 && <span aria-hidden className="my-1 h-px w-8 bg-border-soft" />}
                  {group.pack ? (
                    <GrupoDeRiel group={group} items={visible} activeHref={activeHref} locked={locked} />
                  ) : (
                    visible
                      .filter((item) => item.ready)
                      .map((item) => (
                        <div key={item.href} className="relative">
                          <IconoDeRiel item={item} active={item.href === activeHref} />
                        </div>
                      ))
                  )}
                </div>
              );
            })}
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
