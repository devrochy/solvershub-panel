"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { AlertTriangle, FileText, RotateCw, Trash2 } from "lucide-react";

import { AvisoLimiteDePlan } from "@/components/domain/aviso-limite-de-plan";
import { Badge } from "@/components/ui/badge";
import { useConfirm } from "@/components/ui/confirm";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Dropzone } from "@/components/ui/dropzone";
import { IconAction } from "@/components/ui/icon-action";
import type { KnowledgeDocument } from "@/lib/api/types";
import {
  archivoAdmitido,
  detalleDeDocumento,
  estadoDeDocumento,
  hayEnProceso,
  INTERVALO_DE_REVISION_MS,
  MAX_BYTES,
  motivoDeFalla,
  TIPOS_ACEPTADOS,
} from "@/lib/conocimiento";
import { usePolling } from "@/lib/conversaciones/en-vivo";
import { formatDateTime } from "@/lib/format";
import { esLimiteDePlan } from "@/lib/plan-limite";
import { toast } from "@/lib/toast-store";

type Respuesta = { error?: string; code?: string };

/**
 * Pestaña «Conocimiento» de la ficha del agente (HU-AOS-49): los documentos del negocio con los
 * que responde. Se suben acá; el worker los procesa (en cola → procesando → listo) y la lista se
 * revisa sola mientras haya alguno en proceso.
 */
export function ConocimientoDelAgente({
  agenteId,
  nombre,
  documentos: iniciales,
  puedeEscribir,
  usaConocimiento,
  puedeEditar,
}: {
  agenteId: string;
  nombre: string;
  documentos: KnowledgeDocument[];
  puedeEscribir: boolean;
  /** El borrador del agente declara la búsqueda (`buscar_conocimiento`). */
  usaConocimiento: boolean;
  /** Puede abrir el editor del agente para activarla. */
  puedeEditar: boolean;
}) {
  const [documentos, setDocumentos] = useState(iniciales);
  const [subiendo, setSubiendo] = useState(0);
  const [limite, setLimite] = useState<string | null>(null);
  const confirmar = useConfirm();
  const base = `/api/agent-knowledge/${agenteId}/documents`;

  const recargar = useCallback(
    async (senal?: AbortSignal) => {
      const res = await fetch(base, { cache: "no-store", signal: senal });
      if (res.ok) setDocumentos((await res.json()) as KnowledgeDocument[]);
    },
    [base],
  );
  usePolling(recargar, INTERVALO_DE_REVISION_MS, hayEnProceso(documentos) || subiendo > 0);

  async function subir(archivos: File[]) {
    setLimite(null);
    for (const archivo of archivos) {
      setSubiendo((n) => n + 1);
      try {
        const form = new FormData();
        form.set("archivo", archivo, archivo.name);
        const res = await fetch(base, { method: "POST", body: form });
        if (res.ok) {
          toast.success(`«${archivo.name}» quedó en cola para procesarse.`);
          continue;
        }
        const json = (await res.json().catch(() => ({}))) as Respuesta;
        const mensaje = json.error ?? "No se pudo subir el archivo.";
        if (esLimiteDePlan(json.code)) {
          setLimite(mensaje);
          break;
        }
        toast.error(json.code === "documento_duplicado" ? `«${archivo.name}» ya está subido.` : mensaje);
      } catch {
        toast.error("No se pudo contactar el servidor.");
      } finally {
        setSubiendo((n) => n - 1);
      }
    }
    await recargar();
  }

  async function borrar(doc: KnowledgeDocument) {
    const ok = await confirmar({
      title: `¿Borrar «${doc.titulo}»?`,
      description: `${nombre} dejará de usarlo al responder. Se borra el archivo y todo lo que se extrajo de él.`,
      confirmLabel: "Borrar documento",
      destructive: true,
    });
    if (!ok) return;
    const res = await fetch(`${base}/${doc.id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as Respuesta;
      toast.error(json.error ?? "No se pudo borrar el documento.");
      return;
    }
    setDocumentos((actuales) => actuales.filter((d) => d.id !== doc.id));
    toast.success("Documento borrado.");
  }

  async function reprocesar(doc: KnowledgeDocument) {
    const res = await fetch(`${base}/${doc.id}/reprocess`, { method: "POST" });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as Respuesta;
      toast.error(json.error ?? "No se pudo volver a procesar.");
      return;
    }
    toast.success(`«${doc.titulo}» volvió a la cola.`);
    await recargar();
  }

  const columnas: Column<KnowledgeDocument>[] = [
    {
      key: "titulo",
      header: "Documento",
      cell: (d) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-headline">{d.titulo}</span>
          <span className="text-xs text-text-soft">{detalleDeDocumento(d)}</span>
          {d.pii_detectada > 0 && (
            <span className="flex items-center gap-1 text-xs text-status-warning-fg">
              <AlertTriangle aria-hidden className="h-3 w-3" />
              Parece tener datos personales: no subas listas de clientes.
            </span>
          )}
        </div>
      ),
    },
    {
      key: "estado",
      header: "Estado",
      cell: (d) => {
        const estado = estadoDeDocumento(d.estado);
        const motivo = d.estado === "fallido" ? motivoDeFalla(d.error_codigo) : null;
        return (
          <div className="flex flex-col items-start gap-1">
            <Badge variant={estado.tono}>{estado.label}</Badge>
            {motivo && <span className="max-w-xs text-xs text-text-soft">{motivo}</span>}
            {d.desactualizado && (
              <span className="max-w-xs text-xs text-text-soft">Procesado con una versión anterior: reprocésalo.</span>
            )}
          </div>
        );
      },
    },
    { key: "subido", header: "Subido", cell: (d) => formatDateTime(d.created_at) },
    ...(puedeEscribir
      ? [
          {
            key: "acciones",
            header: <span className="sr-only">Acciones</span>,
            className: "w-24",
            cell: (d: KnowledgeDocument) => (
              <div className="flex justify-end gap-1">
                {(d.estado === "fallido" || d.desactualizado) && (
                  <IconAction label={`Volver a procesar «${d.titulo}»`} onClick={() => void reprocesar(d)}>
                    <RotateCw aria-hidden className="h-4 w-4" />
                  </IconAction>
                )}
                <IconAction tone="eliminar" label={`Borrar «${d.titulo}»`} onClick={() => void borrar(d)}>
                  <Trash2 aria-hidden className="h-4 w-4" />
                </IconAction>
              </div>
            ),
          } satisfies Column<KnowledgeDocument>,
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-4">
      {!usaConocimiento && (
        <div role="note" className="rounded-md bg-status-info-bg px-3 py-2 text-sm text-status-info-fg">
          {nombre} todavía no responde con estos documentos.{" "}
          {puedeEditar ? (
            <>
              Actívalo en{" "}
              <Link href={`/agentes/${agenteId}/editar`} className="font-medium underline underline-offset-2">
                Editar agente → Memoria y conocimiento
              </Link>{" "}
              y publica la nueva versión.
            </>
          ) : (
            "Pídele a quien administra los agentes que active el conocimiento en su configuración."
          )}{" "}
          La habilidad «Conocimiento» tiene que estar activa en{" "}
          <Link href="/habilidades" className="font-medium underline underline-offset-2">
            Habilidades
          </Link>
          .
        </div>
      )}
      {limite && <AvisoLimiteDePlan mensaje={limite} />}
      {puedeEscribir && (
        <Dropzone
          accept={TIPOS_ACEPTADOS}
          esAdmitido={archivoAdmitido}
          maxBytes={MAX_BYTES}
          disabled={subiendo > 0}
          icono={<FileText aria-hidden className="h-4 w-4 text-text-soft" />}
          label={subiendo > 0 ? "Subiendo…" : "Arrastra o elige preguntas frecuentes, catálogos o políticas"}
          hint="PDF con texto, DOCX, TXT o Markdown, hasta 20 MB."
          onFiles={(archivos) => void subir(archivos)}
          onReject={(motivo) => toast.error(motivo)}
        />
      )}
      <DataTable
        columns={columnas}
        rows={documentos}
        getRowKey={(d) => d.id}
        caption={`Documentos de ${nombre}`}
        emptyTitle={`${nombre} todavía no tiene documentos`}
        emptyDescription={
          puedeEscribir
            ? "Sube tus preguntas frecuentes, catálogos o políticas: el agente los usará para responder con información de tu negocio."
            : "Cuando alguien con permiso suba documentos, aparecerán aquí."
        }
      />
    </div>
  );
}
