"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldOff } from "lucide-react";

import { useShell } from "@/components/shell/shell-context";
import { Button } from "@/components/ui/button";
import { primeraSeccionVisible, puedeVerRuta, type SesionRenderizada } from "@/lib/shell/sesion";

/**
 * Bloquea la página de una sección que la sesión ya no puede ver (P0 de pruebas): misma
 * regla que el menú (presencia del permiso de `/admin/me`, ADR-0047), así una sección
 * revocada no se queda a medias con un error de la API dentro. Una ruta fuera del menú
 * se muestra siempre: su página decide. Sin shell (tests, catálogo) no bloquea nada.
 */
export function GuardiaDeSeccion({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const shell = useShell();
  if (!shell) return <>{children}</>;
  const sesion: SesionRenderizada = { permisos: shell.permisos, esMaster: shell.esMaster, negocioId: shell.negocioId };
  if (puedeVerRuta(pathname, sesion)) return <>{children}</>;
  return <SinAcceso destino={primeraSeccionVisible(sesion)} />;
}

/** Aviso claro de sección sin acceso, con salida a la primera sección visible. */
export function SinAcceso({ destino }: { destino: { href: string; label: string } | null }) {
  return (
    <div role="alert" className="mx-auto flex max-w-lg flex-col items-center gap-4 py-16 text-center">
      <ShieldOff className="h-8 w-8 text-status-warning-fg" aria-hidden />
      <h1 className="font-display text-sh-h1 text-headline">No tienes acceso a esta sección</h1>
      <p className="text-sm text-body">
        Tus permisos cambiaron o esta sección no está incluida en tu rol. Si la necesitas, pídesela a
        quien administra el negocio.
      </p>
      {destino && (
        <Button asChild variant="outline">
          <Link href={destino.href}>Ir a {destino.label}</Link>
        </Button>
      )}
    </div>
  );
}
