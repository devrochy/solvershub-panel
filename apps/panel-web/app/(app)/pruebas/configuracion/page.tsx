import { EmptyState } from "@/components/ui/empty-state";
import { apiFetch } from "@/lib/api/server";
import type { Me, QaCatalogo } from "@/lib/api/types";

import { Checklist } from "../_components/checklist";

export const metadata = { title: "Configurar test" };

/** Pruebas › Configurar test (HU-QA-03): lo que falta en el entorno de test. */
export default async function ConfigurarTestPage() {
  const [catalogo, me] = await Promise.all([apiFetch<QaCatalogo>("/admin/qa/catalog?seccion=test"), apiFetch<Me>("/admin/me")]);
  if (!catalogo.ok) {
    return <p role="alert" className="text-status-danger-fg">No se pudo cargar el checklist: {catalogo.error}</p>;
  }
  if (catalogo.data.items.length === 0) {
    return <EmptyState title="Sin puntos de configuración" description="El catálogo importado no trae configuración de test." />;
  }
  const rol = me.ok ? me.data.role : "";
  return (
    <Checklist
      items={catalogo.data.items}
      editable={rol === "master" || rol === "tester"}
      aviso="Lo que falta configurar en el entorno de test para poder ejecutar todas las pruebas. No se reinicia con cada ciclo."
    />
  );
}
