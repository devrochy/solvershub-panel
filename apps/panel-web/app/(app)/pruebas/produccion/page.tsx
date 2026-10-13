import { EmptyState } from "@/components/ui/empty-state";
import { apiFetch } from "@/lib/api/server";
import type { Me, QaCatalogo } from "@/lib/api/types";

import { Checklist } from "../_components/checklist";

export const metadata = { title: "Paso a producción" };

/** Pruebas › Paso a producción (HU-QA-03): lo que hay que validar antes del corte. Lo marca el master. */
export default async function PasoAProduccionPage() {
  const [catalogo, me] = await Promise.all([apiFetch<QaCatalogo>("/admin/qa/catalog?seccion=prod"), apiFetch<Me>("/admin/me")]);
  if (!catalogo.ok) {
    return <p role="alert" className="text-status-danger-fg">No se pudo cargar el checklist: {catalogo.error}</p>;
  }
  if (catalogo.data.items.length === 0) {
    return <EmptyState title="Sin puntos de paso a producción" description="El catálogo importado no trae validaciones de producción." />;
  }
  const esMaster = me.ok && me.data.role === "master";
  return (
    <Checklist
      items={catalogo.data.items}
      editable={esMaster}
      aviso={
        esMaster
          ? "Configuraciones, variables y cuentas que hay que validar antes de pasar a producción."
          : "Configuraciones, variables y cuentas que hay que validar antes de pasar a producción. Solo el admin de plataforma las marca."
      }
    />
  );
}
