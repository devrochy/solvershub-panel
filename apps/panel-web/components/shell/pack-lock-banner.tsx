"use client";

import { usePathname } from "next/navigation";

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
  if (!grupo?.pack) return null;
  const pack = packs[grupo.pack];
  if (!pack || pack.enabled) return null;

  return (
    <div role="alert" className="mb-6 rounded-lg border border-warning/40 bg-warning/10 p-4">
      <p className="text-sm font-medium text-headline">
        El pack {grupo.label} no está habilitado para este negocio.
      </p>
      <p className="pb-3 text-sm text-body">
        Sus secciones aparecen bloqueadas en el menú y los datos pueden estar vacíos.
      </p>
      <EnablePackButton pluginId={grupo.pack} label={grupo.label} hasConfig={pack.hasConfig} />
    </div>
  );
}
