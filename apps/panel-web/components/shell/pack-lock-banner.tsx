"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

import { EnablePackButton } from "@/components/shell/enable-pack-button";
import { NAV_GROUPS } from "@/components/shell/nav";
import type { PackState } from "@/components/shell/sidebar";

/**
 * Aviso transversal cuando se navega a una sección de un pack que no está
 * habilitado para el tenant: en vez de una página a medias, se explica y se
 * ofrece habilitarlo (con su configuración previa si la exige).
 */
export function PackLockBanner({ packs }: { packs: Record<string, PackState> }) {
  const pathname = usePathname();
  const [cerrado, setCerrado] = useState(false);
  const grupo = NAV_GROUPS.find(
    (group) =>
      group.pack &&
      group.items.some(
        (item) =>
          item.ready &&
          !item.legacy &&
          (pathname === item.href || pathname.startsWith(`${item.href}/`)),
      ),
  );
  if (cerrado || !grupo?.pack) return null;
  const pack = packs[grupo.pack];
  if (!pack || pack.enabled) return null;

  return (
    <div role="alert" className="mb-6 rounded-lg border border-status-warning-border bg-status-warning-bg p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-headline">
          El pack {grupo.label} no está habilitado para este negocio.
        </p>
        <button
          aria-label="Cerrar el aviso"
          className="rounded p-1 text-text-soft hover:text-headline"
          onClick={() => setCerrado(true)}
          type="button"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <p className="pb-3 text-sm text-body">
        Sus secciones aparecen bloqueadas en el menú y los datos pueden estar vacíos.
      </p>
      <EnablePackButton pluginId={grupo.pack} label={grupo.label} hasConfig={pack.hasConfig} />
    </div>
  );
}
