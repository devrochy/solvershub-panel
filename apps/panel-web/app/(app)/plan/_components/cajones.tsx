"use client";

import { Check, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { SubscribeButton } from "@/app/(app)/plan/_components/subscribe-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import type { PlanResponse } from "@/lib/api/types";
import {
  accionDePlan,
  canalDelPago,
  errorDeRecarga,
  estadoDelPago,
  funcionesEnPalabras,
  limiteEnPalabras,
  PLAN_MAS_ELEGIDO,
  precioDelPlan,
  recargaEnPalabras,
  tituloDelPago,
} from "@/lib/consumo";
import { formatCop, formatNumber } from "@/lib/format";
import { enlaceDePago, limitesOrdenados } from "@/lib/plan-limite";
import { cn } from "@/lib/utils";

type Plan = PlanResponse["plans"][number];
type Pago = PlanResponse["payments"][number];
type Recarga = PlanResponse["recargas"][number];

/**
 * Los planes en un cajón (CYP-05, planes v3 de D-79): cada uno con su precio y sus créditos al mes, sus
 * topes y beneficios en palabras y el botón según el caso («Mejorar a Premium», «Cambiar a Basic»).
 * Premium va destacado como «Más elegido». Si el plan se cambia con el asistente de SolversHub, lo dice
 * en vez de ofrecer el botón.
 */
export function CajonDePlanes({ planes, porElAsistente }: { planes: Plan[]; porElAsistente: boolean }) {
  const router = useRouter();
  const actual = planes.find((p) => p.current);
  return (
    <Sheet open onOpenChange={(abierto) => !abierto && router.replace("/plan", { scroll: false })}>
      <SheetContent
        title="Planes"
        description="Lo que incluye cada uno. Todo lo que hace tu asistente en el mes sale del crédito: respuestas, notas de voz, imágenes y plantillas. 1 crédito = $ 10."
        className="sm:max-w-2xl"
      >
        {planes.length === 0 ? (
          <EmptyState title="No hay planes para mostrar" description="Escríbenos y te ayudamos a elegir." />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2" aria-label="Planes">
            {planes.map((plan) => {
              const accion = accionDePlan(plan, actual);
              const destacado = plan.id === PLAN_MAS_ELEGIDO;
              const beneficios = funcionesEnPalabras(plan.features);
              return (
                <li
                  key={plan.id}
                  className={cn(
                    "flex flex-col gap-3 rounded-lg border bg-surface p-4",
                    plan.current || destacado ? "border-focus ring-1 ring-inset ring-focus" : "border-border-soft",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col">
                      <span className="font-medium text-headline">{plan.name}</span>
                      <span className="font-display text-xl font-semibold tabular-nums text-headline">{precioDelPlan(plan)}</span>
                      {plan.monthly_credits != null && (
                        <span className="text-sm tabular-nums text-body">{formatNumber(plan.monthly_credits)} créditos al mes</span>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {plan.current && <Badge variant="accent">Tu plan</Badge>}
                      {destacado && (
                        <Badge variant="accent" icon={<Star className="h-3 w-3" aria-hidden />}>
                          Más elegido
                        </Badge>
                      )}
                    </div>
                  </div>
                  <ul className="flex flex-col gap-1 text-sm text-body">
                    {limitesOrdenados(plan.limits).map(([clave, valor]) => (
                      <li key={clave}>{limiteEnPalabras(clave, valor)}</li>
                    ))}
                  </ul>
                  {beneficios.length > 0 && (
                    <ul className="flex flex-col gap-1 text-sm text-headline">
                      {beneficios.map((f) => (
                        <li key={f} className="flex items-start gap-1.5">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-status-success-fg" aria-hidden />
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-auto pt-1">
                    {accion.tipo === "actual" || accion.tipo === "gratis" ? (
                      <p className="text-sm text-text-soft">{accion.label}</p>
                    ) : porElAsistente ? (
                      <p className="text-sm text-text-soft">Para cambiar de plan, escríbele al asistente de SolversHub por WhatsApp.</p>
                    ) : (
                      <SubscribeButton planId={plan.id} label={accion.label} variant={accion.tipo === "mejorar" ? "accent" : "outline"} />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SheetContent>
    </Sheet>
  );
}

/**
 * Comprar créditos en un cajón (HU-BILL-27 parte 2b, HU-BILL-23): los paquetes con el precio del plan
 * vigente (de lista tachado y «−15 %» si hay descuento). Al elegir uno se pide el link de pago y se abre
 * el checkout. `recarga_bajo_minimo` muestra el mensaje del backend tal cual (trae precio y mínimo).
 */
export function CajonDeRecargas({ paquetes }: { paquetes: Recarga[] }) {
  const router = useRouter();
  const [estado, setEstado] = useState<{ abriendo?: string; error?: string }>({});

  async function comprar(paquete: string) {
    setEstado({ abriendo: paquete });
    const res = await fetch("/api/plan/recargas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paquete }),
    }).catch(() => null);
    const json = ((await res?.json().catch(() => ({}))) ?? {}) as { checkout_url?: string; error?: string; code?: string };
    if (!res?.ok || !json.checkout_url) {
      setEstado({ error: errorDeRecarga(json.code, json.error) });
      return;
    }
    window.location.assign(json.checkout_url);
  }

  return (
    <Sheet open onOpenChange={(abierto) => !abierto && router.replace("/plan", { scroll: false })}>
      <SheetContent
        title="Comprar créditos"
        description="Se suman a tu saldo y se usan después del crédito del mes y lo acumulado. 1 crédito = $ 10."
        className="sm:max-w-lg"
      >
        {paquetes.length === 0 ? (
          <EmptyState title="Tu plan no permite comprar créditos" description="Las recargas son para negocios con un plan pago activo." />
        ) : (
          <div className="flex flex-col gap-3">
            <ul className="flex flex-col gap-3" aria-label="Paquetes de créditos">
              {paquetes.map((p) => {
                const r = recargaEnPalabras(p);
                return (
                  <li key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-border-soft bg-surface p-4">
                    <div className="flex min-w-0 flex-col">
                      <span className="font-medium tabular-nums text-headline">{r.creditos}</span>
                      <span className="flex flex-wrap items-baseline gap-2 text-sm tabular-nums">
                        {r.lista && (
                          <s className="text-text-soft">
                            <span className="sr-only">Antes </span>
                            {r.lista}
                          </s>
                        )}
                        <span className="font-semibold text-headline">{r.precio}</span>
                        {r.descuento && <Badge variant="accent">{r.descuento}</Badge>}
                      </span>
                    </div>
                    <Button
                      variant="accent"
                      size="sm"
                      onClick={() => void comprar(p.id)}
                      loading={estado.abriendo === p.id}
                      disabled={Boolean(estado.abriendo)}
                      aria-label={`Comprar ${r.creditos} por ${r.precio}`}
                    >
                      {estado.abriendo === p.id ? "Abriendo el pago…" : "Comprar"}
                    </Button>
                  </li>
                );
              })}
            </ul>
            <FormFeedback error={estado.error} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

/** Los pagos del plan y las recargas en un cajón (CYP-06): por mes, con su canal y qué hacer si no pasó. */
export function CajonDePagos({ pagos, planes }: { pagos: Pago[]; planes: Plan[] }) {
  const router = useRouter();
  return (
    <Sheet open onOpenChange={(abierto) => !abierto && router.replace("/plan", { scroll: false })}>
      <SheetContent title="Pagos" description="Los pagos de tu plan y tus recargas, del más reciente al más antiguo." className="sm:max-w-lg">
        {pagos.length === 0 ? (
          <EmptyState title="Aún no hay pagos" description="Cuando pagues tu plan, el pago aparece aquí." />
        ) : (
          <ul className="flex flex-col" aria-label="Pagos">
            {pagos.map((p, i) => {
              const estado = estadoDelPago(p.status);
              const enlace = enlaceDePago(p);
              return (
                <li key={`${p.periodo ?? p.created_at}-${i}`} className="flex flex-col gap-2 border-b border-border-soft py-3 last:border-b-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col">
                      <span className="font-medium text-headline">{tituloDelPago(p, planes)}</span>
                      <span className="text-xs text-text-soft">
                        {canalDelPago(p.provider)}
                        {estado.explicacion ? ` · ${estado.explicacion}` : ""}
                      </span>
                    </div>
                    <span className="shrink-0 font-medium tabular-nums text-headline">{formatCop(p.amount_cop)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <Badge variant={estado.tono}>{estado.label}</Badge>
                    {enlace && (
                      <Button asChild size="sm" variant="accent">
                        <a href={enlace}>Pagar {formatCop(p.amount_cop)}</a>
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SheetContent>
    </Sheet>
  );
}
