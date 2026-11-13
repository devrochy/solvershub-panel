import { RulesForm } from "@/app/(app)/cobranza/reglas/_components/rules-form";
import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { ListPage } from "@/components/templates/list-page";
import { apiFetch } from "@/lib/api/server";

export const metadata = { title: "Reglas de negociación" };

type Rules = {
  max_dias_prorroga: number;
  min_abono_pct: number;
  max_reprogramaciones: number;
  umbral_saldo_autonomo: number;
};

export default async function RulesPage() {
  const res = await apiFetch<Rules>("/pack/cobranza/rules");
  const header = {
    title: "Reglas de negociación",
    description: "Los límites que el agente respeta al negociar prórrogas, abonos y reprogramaciones.",
    helpSection: "cobranza",
  };
  if (!res.ok) {
    return (
      <ListPage header={header}>
        <ErrorDeCarga titulo="No se pudieron cargar las reglas" detalle={res.error} />
      </ListPage>
    );
  }

  return (
    <ListPage header={header}>
      <div className="max-w-2xl">
        <RulesForm rules={res.data} />
      </div>
    </ListPage>
  );
}
