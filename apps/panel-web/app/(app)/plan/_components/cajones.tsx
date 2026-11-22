"use client";

import { Check, Star } from "lucide-react";
import { useRouter } from "next/navigation";

import { SubscribeButton } from "@/app/(app)/plan/_components/subscribe-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import type { PlanResponse } from "@/lib/api/types";
import {
  accionDePlan,
  canalDelPago,
  estadoDelPago,
  funcionesEnPalabras,
  limiteEnPalabras,
  mesDelPago,
  nombreDelPlan,
  PLAN_MAS_ELEGIDO,
  precioDelPlan,
} from "@/lib/consumo";
import { formatCop, formatNumber } from "@/lib/format";
import { enlaceDePago, limitesOrdenados } from "@/lib/plan-limite";
import { cn } from "@/lib/utils";

type Plan = PlanResponse["plans"][number];
type Pago = PlanResponse["payments"][number];

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

/** Los pagos del plan en un cajón (CYP-06): por mes, con su canal y qué hacer si no pasó. */
export function CajonDePagos({ pagos, planes }: { pagos: Pago[]; planes: Plan[] }) {
  const router = useRouter();
  return (
    <Sheet open onOpenChange={(abierto) => !abierto && router.replace("/plan", { scroll: false })}>
      <SheetContent title="Pagos" description="Los pagos de tu plan, del más reciente al más antiguo." className="sm:max-w-lg">
        {pagos.length === 0 ? (
          <EmptyState title="Aún no hay pagos" description="Cuando pagues tu plan, el pago aparece aquí." />
        ) : (
          <ul className="flex flex-col" aria-label="Pagos del plan">
            {pagos.map((p, i) => {
              const estado = estadoDelPago(p.status);
              const enlace = enlaceDePago(p);
              return (
                <li key={`${p.periodo ?? p.created_at}-${i}`} className="flex flex-col gap-2 border-b border-border-soft py-3 last:border-b-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col">
                      <span className="font-medium text-headline">
                        {mesDelPago(p)} · Plan {nombreDelPlan(p.plan_id, planes)}
                      </span>
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
