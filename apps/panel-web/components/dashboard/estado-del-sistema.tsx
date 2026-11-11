import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Dashboard } from "@/lib/api/types";
import { formatUsd } from "@/lib/format";

const FILA =
  "-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-2 transition-colors hover:bg-hover";

/**
 * Tu asistente: si atiende, cuántas habilidades tiene activas, lo que va gastado en IA los últimos
 * 30 días y su plan. El modelo que usa solo le dice algo a la plataforma.
 */
export function EstadoDelSistema({ d, esPlataforma = false }: { d: Dashboard; esPlataforma?: boolean }) {
  const diasRestantes = d.billing?.days_left;
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Tu asistente</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 text-sm">
        <Link href="/agentes" className={FILA}>
          <span className="text-body">Agente</span>
          <Badge variant={d.bot_paused ? "danger" : "success"}>{d.bot_paused ? "Pausado" : "Activo"}</Badge>
        </Link>
        {esPlataforma && (
          <Link href="/configuracion?tab=advanced" className={FILA}>
            <span className="text-body">Proveedor LLM</span>
            <span className="font-mono text-xs tabular-nums text-headline">{d.llm_label}</span>
          </Link>
        )}
        <Link href="/habilidades" className={FILA}>
          <span className="text-body">Habilidades activas</span>
          <Badge variant="accent">{d.kpi.active_plugins}</Badge>
        </Link>
        {/* Los costos en dólares son del equipo de SolversHub (rediseño B de Consumo y plan). */}
        {esPlataforma && (
          <Link href="/costos" className={FILA}>
            <span className="text-body">Costo IA, 30 días</span>
            <span className="font-medium tabular-nums text-headline">{formatUsd(d.kpi.cost_30d, 2)}</span>
          </Link>
        )}
        {d.billing?.has_plan && (
          <Link href="/plan" className={FILA}>
            <span className="text-body">Plan</span>
            <span className="flex flex-wrap items-center justify-end gap-x-2">
              <Badge variant={d.billing.operational ? "success" : "danger"}>{d.billing.plan_name}</Badge>
              {diasRestantes !== null && diasRestantes !== undefined && (
                <span className="text-xs text-text-soft">
                  {diasRestantes === 1 ? "1 día restante" : `${diasRestantes} días restantes`}
                </span>
              )}
            </span>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
