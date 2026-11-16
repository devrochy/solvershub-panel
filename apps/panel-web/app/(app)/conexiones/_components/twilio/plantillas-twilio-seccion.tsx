import {
  MenuPlantillaTwilio,
  NuevaPlantillaTwilio,
  SincronizarPlantillasTwilio,
} from "@/app/(app)/conexiones/_components/twilio/plantillas-twilio";
import { SeccionFicha } from "@/app/(app)/conexiones/_components/seccion-ficha";
import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { TablaResponsiva } from "@/components/domain/tabla-responsiva";
import { Badge } from "@/components/ui/badge";
import { type Column } from "@/components/ui/data-table";
import { apiFetch } from "@/lib/api/server";
import type { Me } from "@/lib/api/types";
import {
  esSandbox,
  estadoPlantillaTwilio,
  puedeEscribirTwilio,
  type ConexionTwilio,
  type PlantillaTwilio,
} from "@/lib/conexion-twilio";
import { categoriaPlantillaMetaLabel, idiomaLabel } from "@/lib/labels";

/**
 * Plantillas de un número de WhatsApp vía Twilio (HU-CONN-14, ADR-0186 §8): nombre, estado de la aprobación de
 * WhatsApp con su motivo de rechazo, categoría e idioma. Crear, enviar a aprobación, consultar, sincronizar y borrar
 * son del propietario o el master. En el Sandbox (HU-CONN-20) solo sirven las plantillas preaprobadas de Twilio:
 * se traen con Sincronizar y no se crean, envían ni borran.
 */
export async function PlantillasTwilioSeccion({ connectionId, activa }: { connectionId: string; activa: boolean }) {
  const id = encodeURIComponent(connectionId);
  const [conexion, plantillas, me] = await Promise.all([
    apiFetch<ConexionTwilio>(`/admin/connections/twilio/${id}`),
    apiFetch<PlantillaTwilio[]>(`/admin/connections/twilio/${id}/templates`),
    apiFetch<Me>("/admin/me"),
  ]);
  if (!conexion.ok || !plantillas.ok) {
    return (
      <SeccionFicha titulo="Plantillas">
        <ErrorDeCarga
          titulo="No se pudieron cargar las plantillas"
          detalle={!conexion.ok ? conexion.error : !plantillas.ok ? plantillas.error : undefined}
        />
      </SeccionFicha>
    );
  }
  const sandbox = esSandbox(conexion.data);
  const escribe = me.ok && puedeEscribirTwilio(me.data) && activa;

  const estado = (p: PlantillaTwilio) => {
    const e = estadoPlantillaTwilio(p.estado);
    return (
      <div className="flex flex-col items-start gap-1">
        <Badge variant={e.tono}>{e.label}</Badge>
        {p.motivo_rechazo && <span className="text-xs text-status-danger-fg">{p.motivo_rechazo}</span>}
      </div>
    );
  };
  const menu = (p: PlantillaTwilio) =>
    escribe ? <MenuPlantillaTwilio connectionId={connectionId} plantilla={p} sandbox={sandbox} /> : null;

  const columns: Column<PlantillaTwilio>[] = [
    {
      key: "nombre",
      header: "Plantilla",
      cell: (p) => (
        <span className="flex min-w-0 flex-col">
          <span className="font-medium text-headline">{p.nombre}</span>
          <span className="line-clamp-2 text-xs text-text-soft">{p.cuerpo}</span>
        </span>
      ),
    },
    { key: "estado", header: "Estado", cell: estado },
    { key: "categoria", header: "Categoría", cell: (p) => <span className="text-body">{categoriaPlantillaMetaLabel(p.categoria)}</span> },
    { key: "idioma", header: "Idioma", cell: (p) => <span className="text-body">{idiomaLabel(p.idioma)}</span> },
    {
      key: "acciones",
      header: <span className="sr-only">Acciones</span>,
      align: "right",
      className: "w-10",
      cell: menu,
    },
  ];

  return (
    <SeccionFicha
      titulo="Plantillas"
      descripcion="Los mensajes que WhatsApp aprueba para escribirle a un cliente fuera de las 24 horas de la conversación."
      acciones={
        escribe ? (
          <>
            <SincronizarPlantillasTwilio connectionId={connectionId} />
            {!sandbox && <NuevaPlantillaTwilio connectionId={connectionId} />}
          </>
        ) : undefined
      }
    >
      {sandbox && (
        <div role="status" className="rounded-md border border-status-info-border bg-status-info-bg px-4 py-3 text-sm text-headline">
          El Sandbox de Twilio solo usa sus 3 plantillas preaprobadas: no se crean, envían a aprobación ni borran
          plantillas propias. Usa Sincronizar para traerlas.
        </div>
      )}
      {!activa && (
        <p className="text-sm text-body">La conexión está pausada: reanúdala para crear o cambiar plantillas.</p>
      )}

      <TablaResponsiva
        etiqueta="Plantillas de WhatsApp vía Twilio"
        columns={columns}
        rows={plantillas.data}
        getRowKey={(p) => p.id}
        emptyTitle="Todavía no hay plantillas"
        emptyDescription={
          sandbox
            ? "Sincroniza para traer las plantillas preaprobadas del Sandbox."
            : "Crea la primera o sincroniza si ya las tienes en la consola de Twilio."
        }
        filaCelular={(p) => ({
          titulo: p.nombre,
          detalle: [
            estadoPlantillaTwilio(p.estado).label,
            categoriaPlantillaMetaLabel(p.categoria),
            idiomaLabel(p.idioma),
            p.motivo_rechazo || null,
          ]
            .filter(Boolean)
            .join(" · "),
          accion: menu(p),
        })}
      />
    </SeccionFicha>
  );
}
