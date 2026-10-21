import { apiFetch } from "@/lib/api/server";
import type { Me, QaCatalogo, QaCiclo, QaEvolucion } from "@/lib/api/types";

import { ListaDeCiclos } from "../_components/ciclos";
import { Evolucion } from "../_components/evolucion";

export const metadata = { title: "Ciclos de pruebas" };

/** Pruebas › Ciclos (HU-QA-03, HU-QA-08): el abierto en vivo, los cerrados como foto fija
 * y la evolución por versión del catálogo. */
export default async function CiclosPage() {
  const [ciclos, catalogo, evolucion, me] = await Promise.all([
    apiFetch<QaCiclo[]>("/admin/qa/cycles"),
    apiFetch<QaCatalogo>("/admin/qa/catalog?seccion=pruebas"),
    apiFetch<QaEvolucion>("/admin/qa/evolution"),
    apiFetch<Me>("/admin/me"),
  ]);
  if (!ciclos.ok) {
    return (
      <p role="alert" className="text-status-danger-fg">
        No se pudieron cargar los ciclos: {ciclos.error}
      </p>
    );
  }
  // Cerrar un ciclo: master, o tester en test (ADR-0134). Nunca un 403 por diseño.
  const rol = me.ok ? me.data.role : "";
  const puedeCerrar = rol === "master" || (rol === "tester" && me.ok && me.data.qa_testers_habilitados);
  const titulos = Object.fromEntries((catalogo.ok ? catalogo.data.items : []).map((i) => [i.slug, i.titulo]));
  return (
    <div className="flex flex-col gap-8">
      <ListaDeCiclos ciclos={ciclos.data} titulos={titulos} puedeCerrar={puedeCerrar} />
      <Evolucion versiones={evolucion.ok ? evolucion.data.versiones : []} />
    </div>
  );
}
