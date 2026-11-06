import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Dashboard } from "@/lib/api/types";
import { formatUsd } from "@/lib/format";

const FILA =
  "-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-2 transition-colors hover:bg-hover";

/**
 * Estado del sistema del negocio: si el agente atiende, con qué modelo, cuántas habilidades tiene
 * activas y lo que va gastado en IA los últimos 30 días, con los días que le quedan al plan.
 */
export function EstadoDelSistema({ d }: { d: Dashboard }) {
  const diasRestantes = d.billing?.days_left;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Estado del sistema</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 text-sm">
        <Link href="/agentes" className={FILA}>
          <span className="text-body">Agente</span>
          <Badge variant={d.bot_paused ? "danger" : "success"}>{d.bot_paused ? "Pausado" : "Activo"}</Badge>
        </Link>
        <Link href="/configuracion?tab=advanced" className={FILA}>
          <span className="text-body">Proveedor LLM</span>
          <span className="font-mono text-xs tabular-nums text-headline">{d.llm_label}</span>
        </Link>
        <Link href="/habilidades" className={FILA}>
          <span className="text-body">Habilidades activas</span>
          <Badge variant="accent">{d.kpi.active_plugins}</Badge>
        </Link>
        <Link href="/costos" className={FILA}>
          <span className="text-body">Costo IA · 30 días</span>
          <span className="flex flex-wrap items-baseline justify-end gap-x-2">
            <span className="font-medium tabular-nums text-headline">{formatUsd(d.kpi.cost_30d, 2)}</span>
            {diasRestantes !== null && diasRestantes !== undefined && (
              <span className="text-xs text-text-soft">
                {diasRestantes === 1 ? "1 día restante del plan" : `${diasRestantes} días restantes del plan`}
              </span>
            )}
          </span>
        </Link>
      </CardContent>
    </Card>
  );
}
