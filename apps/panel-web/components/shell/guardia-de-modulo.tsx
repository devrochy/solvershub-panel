"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, LockKeyhole, type LucideIcon } from "lucide-react";

import { useShell } from "@/components/shell/shell-context";
import type { PackState } from "@/components/shell/sidebar";
import { Button } from "@/components/ui/button";
import type { EstadoModulo } from "@/lib/shell/modulos";
import { hojaDe, rutasDelMenu } from "@/lib/shell/navegacion";
import { RUTA_MEJORAR_PLAN, TEXTO_MEJORAR_PLAN } from "@/lib/plan-limite";

/** Lo que incluye cada módulo, para que la pantalla de bloqueo diga algo concreto. */
const INCLUYE: Record<string, string[]> = {
  pack_commerce: ["Pedidos y productos", "Promociones y aliados", "Clientes con datos de ventas"],
  pack_calendar: ["Citas y agenda del equipo", "Horarios y bloqueos", "Clientes que agendan"],
  pack_cobranza: ["Carteras y cobros", "Promesas de pago", "Reportes de recaudo"],
  pack_subscriptions: ["Suscripciones y planes", "Pagos recurrentes", "Clientes suscritos"],
};

function incluyeDe(pack: string, label: string): string[] {
  return INCLUYE[pack] ?? [`Lo que hace el módulo ${label}`, "Sus datos del negocio", "Sus reportes"];
}

/**
 * Bloquea la página de un módulo que el negocio no tiene habilitado (regla del dueño,
 * 2026-11-12): sin especialista publicado se pide mejorar el plan; con especialista pero
 * sin la habilidad instalada se lleva a Agentes (ADR-0206: la habilidad es del negocio solo
 * si algún agente activo la tiene instalada; no hay interruptor a nivel negocio). No se renderiza el contenido: no hay datos ni acciones
 * que se puedan tocar. A diferencia de `GuardiaDeSeccion` (permisos), esto es del negocio.
 */
export function GuardiaDeModulo({
  packs,
  children,
}: {
  packs: Record<string, PackState>;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const shell = useShell();
  const entrada = rutasDelMenu().find((ruta) => {
    const item = hojaDe(ruta);
    return (
      Boolean(ruta.entrada.pack) &&
      item.ready &&
      !item.legacy &&
      (pathname === item.href || pathname.startsWith(`${item.href}/`))
    );
  })?.entrada;
  if (!entrada?.pack) return <>{children}</>;

  const estado: EstadoModulo =
    shell?.modulos?.[entrada.pack] ??
    (packs[entrada.pack]?.enabled === false ? "pack" : "habilitado");
  if (estado === "habilitado") return <>{children}</>;

  return <ModuloBloqueado entrada={entrada} pack={entrada.pack} estado={estado} />;
}

function ModuloBloqueado({
  entrada,
  pack,
  estado,
}: {
  entrada: { label: string; icon: LucideIcon };
  pack: string;
  estado: Exclude<EstadoModulo, "habilitado">;
}) {
  const Icon = entrada.icon;
  const esPlan = estado === "plan";
  const titulo = esPlan ? `${entrada.label} no está en tu plan` : `${entrada.label} está apagado`;

  return (
    <section
      aria-labelledby="modulo-bloqueado-titulo"
      className="mx-auto flex max-w-lg flex-col items-center gap-4 py-12 text-center md:py-16"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-hover text-text-soft">
        <Icon className="h-6 w-6" aria-hidden />
      </span>
      <p className="text-sh-caption font-medium tracking-[0.06em] text-text-soft uppercase">
        {esPlan ? "Módulo no incluido" : "Módulo apagado"}
      </p>
      <h1 id="modulo-bloqueado-titulo" className="font-display text-sh-h1 tracking-tight text-headline">
        {titulo}
      </h1>
      <p className="text-sm text-body">
        {esPlan
          ? `Tu plan actual no incluye el agente de ${entrada.label}. Mejora tu plan para usarlo desde el panel.`
          : `Ningún agente activo tiene instalada la habilidad de ${entrada.label}. Se instala en el agente que la usa: al crearlo desde una plantilla o en sus habilidades.`}
      </p>
      <ul className="flex w-full flex-col gap-2 rounded-lg border border-border-soft bg-surface p-4 text-left text-sm">
        <li className="flex items-center gap-2 text-body">
          <LockKeyhole className="h-4 w-4 shrink-0 text-text-soft" aria-hidden />
          {esPlan ? "Disponible al mejorar tu plan" : "Disponible al instalar la habilidad en un agente"}
        </li>
        {incluyeDe(pack, entrada.label).map((linea) => (
          <li key={linea} className="flex items-center gap-2 text-body">
            <Check className="h-4 w-4 shrink-0 text-link" aria-hidden />
            {linea}
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-2 sm:flex-row">
        {esPlan ? (
          <Button asChild variant="accent">
            <Link href={`${RUTA_MEJORAR_PLAN}?ver=planes`}>{TEXTO_MEJORAR_PLAN}</Link>
          </Button>
        ) : (
          <Button asChild variant="accent">
            <Link href="/agentes">Ir a Agentes</Link>
          </Button>
        )}
        <Button asChild variant="outline">
          <Link href="/dashboard">Volver al Resumen</Link>
        </Button>
      </div>
    </section>
  );
}
