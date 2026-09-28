import { RulesForm } from "@/app/(app)/cobranza/reglas/_components/rules-form";
import { PageHeader } from "@/components/ui/page-header";
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
  if (!res.ok) {
    return (
      <p role="alert" className="text-danger">
        No se pudieron cargar las reglas: {res.error}
      </p>
    );
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <PageHeader
        title="Reglas de negociación"
        description="Límites deterministas que el asistente respeta al negociar (prórrogas, abonos y reprogramaciones)."
      />
      <RulesForm rules={res.data} />
    </div>
  );
}
