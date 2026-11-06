import { notFound } from "next/navigation";

import { SeccionFicha } from "@/app/(app)/conexiones/_components/seccion-ficha";
import { ListaDeVersiones } from "@/app/(app)/conexiones/[id]/(ficha)/versiones/_components/lista-de-versiones";
import { PruebaConUnaParte } from "@/app/(app)/conexiones/[id]/(ficha)/versiones/_components/prueba-con-una-parte";
import { apiFetch } from "@/lib/api/server";
import type { CanaryState, Evaluation, Me, ReleaseSummary } from "@/lib/api/types";
import { fichaDePestana } from "@/lib/conexion-ficha-servidor";
import { estadoDe, puedeOperarVersiones } from "@/lib/versiones";

export const metadata = { title: "Versiones" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Candidatas cuya medición se lee al abrir (las más nuevas): el resto se mide desde la tarjeta.
const MAX_MEDICIONES = 3;

/**
 * Versiones de una conexión (HU-AOS-27): la activa con «Volver a la anterior», las candidatas con
 * sus diferencias, el estado de las pruebas automáticas y «Publicar a todos» / «Probar con una
 * parte» / «Detener», la prueba en curso con su comparación (HU-AOS-32) y el historial.
 */
export default async function VersionesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const [releases, ficha, meRes, pruebaRes] = await Promise.all([
    apiFetch<ReleaseSummary[]>(`/admin/connections/${id}/releases?limit=50`),
    fichaDePestana(id, "versiones"),
    apiFetch<Me>("/admin/me"),
    apiFetch<CanaryState | null>(`/admin/connections/${id}/canary`),
  ]);
  if (!releases.ok) {
    if (releases.status === 404) notFound();
    return (
      <p role="alert" className="text-status-danger-fg">
        No se pudieron cargar las versiones: {releases.error}
      </p>
    );
  }
  const runtime = ficha?.consola.runtime ?? "legacy";
  const puedeOperar = meRes.ok && puedeOperarVersiones(meRes.data, runtime);
  const prueba = pruebaRes.ok ? pruebaRes.data : null;
  const activa = releases.data.find((r) => r.active) ?? null;
  const candidatas = releases.data
    .filter((r) => estadoDe(r, activa?.number ?? null) === "candidata")
    .slice(0, MAX_MEDICIONES);
  const mediciones = Object.fromEntries(
    await Promise.all(
      candidatas.map(async (r) => {
        const ev = await apiFetch<Evaluation>(`/admin/connections/${id}/releases/${r.id}/evaluation`);
        return [r.id, ev.ok ? ev.data : null] as const;
      }),
    ),
  );

  return (
    <SeccionFicha
      titulo="Versiones"
      descripcion="Cada cambio de tus agentes crea una versión. Revisa qué cambia, pruébala y publícala, o vuelve a la anterior."
    >
    {runtime !== "v3" && (
      <p className="rounded-lg border border-status-info-border bg-status-info-bg px-4 py-3 text-sm text-body">
        Las versiones se activan con el Agent OS de tu negocio: por ahora solo el equipo de SolversHub las gestiona.
      </p>
    )}
    {prueba && <PruebaConUnaParte conexionId={id} prueba={prueba} puedeOperar={puedeOperar} />}
    <ListaDeVersiones
      conexionId={id}
      versiones={releases.data}
      mediciones={mediciones}
      puedeOperar={puedeOperar}
      puedeProbar={puedeOperar && runtime === "v3"}
      hayPrueba={prueba !== null}
    />
    </SeccionFicha>
  );
}
