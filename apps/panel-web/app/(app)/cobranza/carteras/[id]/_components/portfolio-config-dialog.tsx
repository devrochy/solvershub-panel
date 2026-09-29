"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

type Tipo = "int" | "num" | "bool";
type Campo = { name: string; label: string; tipo: Tipo; seccion: string };

/** Espejo de _CONFIG_FIELDS del panel clásico (agrupado para el formulario). */
const CAMPOS: Campo[] = [
  { name: "cuotas_minimas_prestamo", label: "Cuotas mínimas del préstamo", tipo: "int", seccion: "Crédito" },
  { name: "cuotas_atraso_umbral", label: "Umbral de cuotas en atraso", tipo: "int", seccion: "Crédito" },
  { name: "manejo_cupo_activo", label: "Manejo de cupo activo", tipo: "bool", seccion: "Crédito" },
  { name: "cupo_default", label: "Cupo por defecto", tipo: "num", seccion: "Crédito" },
  { name: "recargo_activo", label: "Recargo activo", tipo: "bool", seccion: "Crédito" },
  { name: "bloquear_cambio_interes", label: "Bloquear cambio de interés", tipo: "bool", seccion: "Crédito" },
  { name: "comision_activa", label: "Comisión activa", tipo: "bool", seccion: "Liquidación" },
  { name: "comision_porcentaje", label: "Comisión %", tipo: "num", seccion: "Liquidación" },
  { name: "mostrar_fecha_ultima_liquidada", label: "Mostrar fecha de última liquidación", tipo: "bool", seccion: "Visibilidad APK" },
  { name: "mostrar_caja", label: "Mostrar caja", tipo: "bool", seccion: "Visibilidad APK" },
  { name: "mostrar_cobrado_liquidada", label: "Mostrar cobrado liquidado", tipo: "bool", seccion: "Visibilidad APK" },
  { name: "mostrar_prestamos", label: "Mostrar préstamos", tipo: "bool", seccion: "Visibilidad APK" },
  { name: "mostrar_cobro_estimado", label: "Mostrar cobro estimado", tipo: "bool", seccion: "Visibilidad APK" },
  { name: "ocultar_cartera", label: "Ocultar cartera", tipo: "bool", seccion: "Visibilidad APK" },
  { name: "eliminar_prestamos_apk", label: "APK: eliminar préstamos", tipo: "bool", seccion: "Permisos APK" },
  { name: "eliminar_pagos_apk", label: "APK: eliminar pagos", tipo: "bool", seccion: "Permisos APK" },
  { name: "eliminar_abonos_apk", label: "APK: eliminar abonos", tipo: "bool", seccion: "Permisos APK" },
  { name: "eliminar_gastos_apk", label: "APK: eliminar gastos", tipo: "bool", seccion: "Permisos APK" },
  { name: "eliminar_inyeccion_apk", label: "APK: eliminar inyecciones", tipo: "bool", seccion: "Permisos APK" },
  { name: "registrar_inyeccion_apk", label: "APK: registrar inyecciones", tipo: "bool", seccion: "Permisos APK" },
  { name: "generar_reportes_apk", label: "APK: generar reportes", tipo: "bool", seccion: "Permisos APK" },
  { name: "reconocimiento_facial_activo", label: "Reconocimiento facial", tipo: "bool", seccion: "Control" },
  { name: "registro_documento_cliente", label: "Registro de documento del cliente", tipo: "bool", seccion: "Control" },
  { name: "bloqueo_automatico_clientes", label: "Bloqueo automático de clientes", tipo: "bool", seccion: "Control" },
  { name: "borrar_clientes_sin_deuda", label: "Borrar clientes sin deuda", tipo: "bool", seccion: "Control" },
];

const SECCIONES = ["Crédito", "Liquidación", "Visibilidad APK", "Permisos APK", "Control"];

/** Configuración de la cartera (25 campos, como el clásico). */
export function PortfolioConfigDialog({
  portfolioId,
  values,
  trigger,
}: {
  portfolioId: string;
  values: Record<string, unknown>;
  trigger: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [estado, setEstado] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<{ loading?: boolean; error?: string }>({});

  function esActivo(campo: Campo): boolean {
    if (campo.tipo === "bool") {
      return estado[campo.name] ?? Boolean(values[campo.name]);
    }
    return false;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = {};
    for (const campo of CAMPOS) {
      if (campo.tipo === "bool") {
        payload[campo.name] = esActivo(campo);
      } else {
        payload[campo.name] = Number(data.get(campo.name) ?? 0);
      }
    }
    setStatus({ loading: true });
    const res = await fetch(`/api/pack/cobranza/portfolios/${portfolioId}/config`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values: payload }),
    });
    setStatus({ loading: false });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setStatus({ error: json.error ?? "No se pudo guardar la configuración." });
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        title="Configuración de la cartera"
        description="Crédito, comisión de liquidación, visibilidad y permisos de la app de campo."
        className="max-h-[85vh] overflow-y-auto"
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          {SECCIONES.map((seccion) => (
            <fieldset key={seccion} className="flex flex-col gap-3">
              <legend className="pb-1 text-[11px] font-medium tracking-[0.06em] text-text-soft uppercase">
                {seccion}
              </legend>
              {CAMPOS.filter((campo) => campo.seccion === seccion).map((campo) =>
                campo.tipo === "bool" ? (
                  <label key={campo.name} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-body">{campo.label}</span>
                    <Switch
                      checked={esActivo(campo)}
                      onCheckedChange={(valor) =>
                        setEstado((previo) => ({ ...previo, [campo.name]: valor }))
                      }
                    />
                  </label>
                ) : (
                  <Field key={campo.name} label={campo.label} htmlFor={campo.name}>
                    <Input
                      id={campo.name}
                      name={campo.name}
                      type="number"
                      step={campo.tipo === "num" ? "0.01" : "1"}
                      defaultValue={Number(values[campo.name] ?? 0)}
                    />
                  </Field>
                ),
              )}
            </fieldset>
          ))}
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={status.loading}>
              {status.loading ? "Guardando…" : "Guardar configuración"}
            </Button>
            <FormFeedback error={status.error} />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
