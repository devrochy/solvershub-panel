import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { EmptyState } from "@/components/ui/empty-state";
import { apiFetch } from "@/lib/api/server";
import type { Me, QaCatalogo } from "@/lib/api/types";

import { Checklist } from "../_components/checklist";
import { EntornoDeLaLista } from "../_components/entornos";

export const metadata = { title: "Paso a producción" };

/** Pruebas › Entornos › Producción (HU-QA-03): lo que hay que validar antes del corte. Lo marca el master. */
export default async function PasoAProduccionPage() {
  const [catalogo, me] = await Promise.all([apiFetch<QaCatalogo>("/admin/qa/catalog?seccion=prod"), apiFetch<Me>("/admin/me")]);
  const esMaster = me.ok && me.data.role === "master";
  return (
    <div className="flex flex-col gap-4">
      <EntornoDeLaLista actual="prod" />
      {!catalogo.ok ? (
        <ErrorDeCarga titulo="No pudimos cargar la lista de producción" detalle={catalogo.error} />
      ) : catalogo.data.items.length === 0 ? (
        <EmptyState title="Nada que validar antes de producción" description="El catálogo importado no trae puntos de paso a producción." />
      ) : (
        <Checklist
          items={catalogo.data.items}
          editable={esMaster}
          aviso={
            esMaster
              ? "Configuraciones, variables y cuentas que hay que validar antes de pasar a producción."
              : "Configuraciones, variables y cuentas que hay que validar antes de pasar a producción. Solo el admin de plataforma las marca."
          }
        />
      )}
    </div>
  );
}
