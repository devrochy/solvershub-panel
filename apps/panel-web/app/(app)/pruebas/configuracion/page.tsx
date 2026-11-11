import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { EmptyState } from "@/components/ui/empty-state";
import { apiFetch } from "@/lib/api/server";
import type { Me, QaCatalogo } from "@/lib/api/types";

import { Checklist } from "../_components/checklist";
import { EntornoDeLaLista } from "../_components/entornos";

export const metadata = { title: "Entorno de test" };

/** Pruebas › Entornos › Test (HU-QA-03): lo que falta en el entorno de test. */
export default async function ConfigurarTestPage() {
  const [catalogo, me] = await Promise.all([apiFetch<QaCatalogo>("/admin/qa/catalog?seccion=test"), apiFetch<Me>("/admin/me")]);
  const rol = me.ok ? me.data.role : "";
  return (
    <div className="flex flex-col gap-4">
      <EntornoDeLaLista actual="test" />
      {!catalogo.ok ? (
        <ErrorDeCarga titulo="No pudimos cargar la lista de test" detalle={catalogo.error} />
      ) : catalogo.data.items.length === 0 ? (
        <EmptyState title="Nada que configurar en test" description="El catálogo importado no trae puntos de configuración de test." />
      ) : (
        <Checklist
          items={catalogo.data.items}
          editable={rol === "master" || rol === "tester"}
          aviso="Lo que falta en el entorno de test para poder correr todas las pruebas. No se reinicia con cada ciclo."
        />
      )}
    </div>
  );
}
