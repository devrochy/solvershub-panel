import { CuentasWompi } from "@/components/domain/pagos/cuentas-wompi";
import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import type { Me, PaymentAccount } from "@/lib/api/types";
import { puedeAdministrarCuentas } from "@/lib/habilidades-del-agente";

export const metadata = { title: "Pagos" };

/**
 * Cuentas Wompi del negocio (ADR-0190, HU-AOS-66): se registran una vez y cada agente con Pagos en línea elige con cuál
 * cobra. Cambiar las llaves aquí aplica a todos los agentes que usan la cuenta, sin publicar.
 */
export default async function PagosPage() {
  const [res, meRes] = await Promise.all([
    apiFetch<PaymentAccount[]>("/pack/payments/accounts"),
    apiFetch<Me>("/admin/me"),
  ]);
  if (!res.ok) {
    return <ErrorDeCarga titulo="No se pudieron cargar las cuentas de pago" detalle={res.error} />;
  }
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pagos"
        description="Tus cuentas Wompi. Cada agente con Pagos en línea elige con cuál cobra; si cambias las llaves aquí, aplica a todos los agentes que la usan."
      />
      <CuentasWompi inicial={res.data} puedeEditar={meRes.ok && puedeAdministrarCuentas(meRes.data)} />
    </div>
  );
}
