"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useSyncExternalStore } from "react";
import { ArrowUpRight, ChevronRight, Lock, X } from "lucide-react";

import { EnablePackButton } from "@/components/shell/enable-pack-button";
import {
  DEFAULT_COLLAPSED_GROUPS,
  NAV_GROUPS,
  type NavItem,
} from "@/components/shell/nav";
import type { Me } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "panel_nav_collapsed";

// Estado de grupos colapsados en localStorage, expuesto con useSyncExternalStore
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

export type PackState = { enabled: boolean; hasConfig: boolean };

function isActiveHref(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

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
  const base = "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors duration-150";

  if (!item.ready || locked) {
    return (
      <span
        aria-disabled="true"
        className={cn(base, "cursor-not-allowed text-text-soft/60")}
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
      className={cn(
        base,
        active ? "bg-surface text-headline shadow-sm" : "text-body hover:bg-hover hover:text-headline",
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
      <span className="flex-1">{item.label}</span>
      {item.legacy && (
        <ArrowUpRight className="h-3.5 w-3.5 text-text-soft" aria-label="Abre el panel clásico" />
      )}
    </Link>
  );
}

/**
 * Menú lateral por grupos colapsables: los del core por dominio y uno por pack
 * con sus subsecciones (como el clásico). Un pack sin habilitar se muestra con
 * candado y su CTA para activarlo (ADR-0019), en vez de esconder la sección.
 */
export function Sidebar({
  me,
  packs,
  className,
  onNavigate,
}: {
  me: Me;
  packs: Record<string, PackState>;
  /** Visibilidad/medidas: oculto en celular en el layout, a pantalla en el menú móvil. */
  className?: string;
  /** El menú móvil lo usa para cerrarse al elegir una sección. */
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const collapsedIds = useSyncExternalStore(
    suscribir,
    leerColapsados,
    () => DEFAULT_COLLAPSED_GROUPS,
  );

  function toggle(id: string) {
    escribirColapsados(
      collapsedIds.includes(id)
        ? collapsedIds.filter((value) => value !== id)
        : [...collapsedIds, id],
    );
  }

  const visibleByGroup = NAV_GROUPS.map((group) => ({
    group,
    visible: group.items.filter((item) => me.permissions?.[item.section]),
  })).filter(({ visible }) => visible.length > 0);

  // Solo el enlace más específico queda marcado como activo (p. ej. /cobranza/carteras
  // no debe marcar también /cobranza).
  let activeHref = "";
  for (const { visible } of visibleByGroup) {
    for (const item of visible) {
      if (item.ready && isActiveHref(pathname, item.href) && item.href.length > activeHref.length) {
        activeHref = item.href;
      }
    }
  }

  return (
    <aside
      className={cn(
        "flex w-60 shrink-0 flex-col border-r border-border-soft bg-bg-deep px-3 py-4",
        className,
      )}
    >
      <Link href="/dashboard" onClick={onNavigate} className="mb-6 flex items-center gap-3 px-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-wordmark.svg" alt="SolversHub" className="h-6 w-auto" />
      </Link>

      <nav
        aria-label="Secciones del panel"
        className="flex flex-1 flex-col gap-1.5 overflow-y-auto"
      >
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
                <ChevronRight
                  className={cn("h-3.5 w-3.5 transition-transform duration-150", open && "rotate-90")}
                  aria-hidden
                />
                {GroupIcon && <GroupIcon className="h-3.5 w-3.5" aria-hidden />}
                <span className="flex-1 text-left">{group.label}</span>
                {locked && <Lock className="h-3.5 w-3.5" aria-label="Pack no habilitado" />}
              </button>

              {open && locked && group.pack ? (
                // Pack deshabilitado: solo el mensaje para habilitarlo (sin la lista
                // de ítems bloqueados) y con cierre para no volver a verlo.
                <div className="mx-3 mb-1 rounded-md border border-border-soft bg-surface p-3">
                  <div className="flex items-start justify-between gap-2 pb-2">
                    <p className="text-xs text-body">
                      Este pack no está habilitado para el negocio.
                    </p>
                    <button
                      aria-label="Cerrar el aviso del pack"
                      className="-mt-1 -mr-1 rounded p-1 text-text-soft hover:text-headline"
                      onClick={() => toggle(group.id)}
                      type="button"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>
                  <EnablePackButton
                    pluginId={group.pack}
                    label={group.label}
                    hasConfig={Boolean(pack?.hasConfig)}
                  />
                </div>
              ) : open ? (
                <div className="flex flex-col gap-0.5">
                  {visible.map((item, index) => (
                    <Fragment key={`${item.href}-${index}`}>
                      {item.sub && item.sub !== visible[index - 1]?.sub && (
                        <p className="px-3 pt-1 text-[10px] tracking-[0.08em] text-text-soft/70 uppercase">
                          {item.sub}
                        </p>
                      )}
                      <NavRow
                        item={item}
                        active={item.href === activeHref}
                        locked={locked}
                        onNavigate={onNavigate}
                      />
                    </Fragment>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>

      <div className="mt-4 px-3 pt-2 text-xs text-text-soft">SolversHub · un producto de Roshi</div>
    </aside>
  );
}
