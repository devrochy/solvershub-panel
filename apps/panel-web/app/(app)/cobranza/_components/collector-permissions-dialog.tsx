"use client";

import { useEffect, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Switch } from "@/components/ui/switch";

const ETIQUETAS: Record<string, string> = {
  registrar_prestamo: "Registrar préstamo",
  registrar_pago: "Registrar pago",
  registrar_abono: "Registrar abono",
  registrar_gasto: "Registrar gasto",
  registrar_no_pago: "Registrar no pago",
  anotar_notas_cartera: "Anotar notas de cartera",
  actualizar_cliente: "Actualizar cliente",
  eliminar_prestamo: "Eliminar préstamo",
  eliminar_pago: "Eliminar pago",
  eliminar_abono: "Eliminar abono",
  eliminar_gasto: "Eliminar gasto",
  registrar_inyeccion: "Registrar inyección",
  ver_cartera: "Ver cartera",
  generar_reporte: "Generar reporte",
};

/** Matriz de permisos del gestor para la app de campo (14 permisos). */
export function CollectorPermissionsDialog({
  collectorId,
  nombre,
  trigger,
  onSaved,
}: {
  collectorId: string;
  nombre: string;
  trigger: ReactNode;
  /** Se llama tras guardar (p. ej. para refrescar el conteo en Equipo). */
  onSaved?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [catalogo, setCatalogo] = useState<string[]>([]);
  const [activos, setActivos] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<{ loading?: boolean; error?: string }>({});

  useEffect(() => {
    if (!open) return;
    let activo = true;
    void fetch(`/api/pack/cobranza/collectors/${collectorId}/permissions`)
      .then(async (res) => {
        const json = (await res.json().catch(() => ({}))) as {
          catalogo?: string[];
          activos?: string[];
          error?: string;
        };
        if (!activo) return;
        if (!res.ok) {
          setStatus({ error: json.error ?? "No se pudieron cargar los permisos." });
          return;
        }
        setCatalogo(json.catalogo ?? []);
        setActivos(new Set(json.activos ?? []));
        setStatus({});
      })
      .catch(() => {
        if (activo) setStatus({ error: "No se pudieron cargar los permisos." });
      });
    return () => {
      activo = false;
    };
  }, [open, collectorId]);

  // Cargando derivado (sin setState sincrónico dentro del efecto).
  const cargando = open && catalogo.length === 0 && !status.error;

  async function guardar() {
    setStatus({ loading: true });
    const res = await fetch(`/api/pack/cobranza/collectors/${collectorId}/permissions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permisos: Array.from(activos) }),
    });
    setStatus({ loading: false });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setStatus({ error: json.error ?? "No se pudieron guardar los permisos." });
      return;
    }
    setOpen(false);
    onSaved?.();
  }

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        title={`Permisos de ${nombre}`}
        description="Lo que este gestor puede hacer en la app de campo."
        className="max-h-[85vh] overflow-y-auto"
      >
        <div className="flex flex-col gap-3">
          {cargando && <p className="text-sm text-text-soft">Cargando permisos…</p>}
          {catalogo.map((permiso) => (
            <label key={permiso} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-body">{ETIQUETAS[permiso] ?? permiso.replaceAll("_", " ")}</span>
              <Switch
                checked={activos.has(permiso)}
                onCheckedChange={(valor) =>
                  setActivos((previo) => {
                    const siguiente = new Set(previo);
                    if (valor) siguiente.add(permiso);
                    else siguiente.delete(permiso);
                    return siguiente;
                  })
                }
              />
            </label>
          ))}
          <div className="flex items-center gap-3 pt-2">
            <Button disabled={status.loading || cargando} onClick={guardar} type="button">
              {status.loading ? "Guardando…" : "Guardar permisos"}
            </Button>
            <FormFeedback error={status.error} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
