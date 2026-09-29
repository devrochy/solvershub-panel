"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

type Tipo = "int" | "num" | "bool" | "select";
type Campo = { name: string; label: string; tipo: Tipo; seccion: string; opciones?: string[] };

/** Espejo de _CONFIG_FIELDS del panel clásico (agrupado para el formulario). */
const CAMPOS: Campo[] = [
  { name: "cuotas_minimas_prestamo", label: "Cuotas mínimas del préstamo", tipo: "int", seccion: "Crédito" },
  { name: "cuotas_atraso_umbral", label: "Umbral de cuotas en atraso", tipo: "int", seccion: "Crédito" },
  { name: "manejo_cupo_activo", label: "Manejo de cupo activo", tipo: "bool", seccion: "Crédito" },
  { name: "cupo_default", label: "Cupo por defecto", tipo: "num", seccion: "Crédito" },
  { name: "recargo_activo", label: "Recargo activo", tipo: "bool", seccion: "Crédito" },
  { name: "bloquear_cambio_interes", label: "Bloquear cambio de interés", tipo: "bool", seccion: "Crédito" },
  {
    name: "permitir_cambio_fecha_prestamo",
    label: "Permitir cambio de fecha del préstamo",
    tipo: "bool",
    seccion: "Crédito",
  },
  { name: "comision_activa", label: "Comisión activa", tipo: "bool", seccion: "Liquidación" },
  { name: "comision_porcentaje", label: "Comisión %", tipo: "num", seccion: "Liquidación" },
  {
    name: "periodo_liquidacion",
    label: "Periodo de liquidación",
    tipo: "select",
    seccion: "Liquidación",
    opciones: ["diario", "semanal", "quincenal", "mensual"],
  },
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
  {
    name: "dias_no_laborables",
    label: "Días no laborables",
    tipo: "select",
    seccion: "Operación y avisos",
    opciones: ["solo_domingos", "domingos_y_feriados"],
  },
  {
    name: "dias_anticipacion_notificacion",
    label: "Días de anticipación de la notificación",
    tipo: "int",
    seccion: "Operación y avisos",
  },
  { name: "aviso_dia_cobro", label: "Aviso el día de cobro", tipo: "bool", seccion: "Operación y avisos" },
  {
    name: "umbral_mora_notificacion",
    label: "Umbral de mora para notificar",
    tipo: "int",
    seccion: "Operación y avisos",
  },
  { name: "ruta_habilitada", label: "Ruta habilitada (función)", tipo: "bool", seccion: "Operación y avisos" },
];

const DESCRIPCION_SECCION: Record<string, string> = {
  Crédito: "Parámetros con los que el agente ofrece préstamos y cupos.",
  Liquidación: "Comisión del gestor y cada cuánto se liquida la caja.",
  "Operación y avisos": "Días no laborables, avisos de cobro y mora, y si la ruta está habilitada.",
  "Visibilidad APK": "Qué información ve el gestor en la app de campo.",
  "Permisos APK": "Acciones destructivas habilitadas desde la app de campo.",
  Control: "Controles automáticos y de identidad de los clientes.",
};

const SECCIONES = [
  "Crédito",
  "Liquidación",
  "Operación y avisos",
  "Visibilidad APK",
  "Permisos APK",
  "Control",
];

/** Configuración de la cartera (los 32 campos del clásico). */
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
      } else if (campo.tipo === "select") {
        payload[campo.name] = String(data.get(campo.name) ?? "");
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
        description="Crédito, liquidación, avisos, visibilidad y permisos de la app de campo."
        className="max-h-[85vh] overflow-y-auto"
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          {SECCIONES.map((seccion) => (
            <fieldset key={seccion} className="flex flex-col gap-3">
              <legend className="pb-1 text-[11px] font-medium tracking-[0.06em] text-text-soft uppercase">
                {seccion}
              </legend>
              {DESCRIPCION_SECCION[seccion] && (
                <p className="text-xs text-text-soft">{DESCRIPCION_SECCION[seccion]}</p>
              )}
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
                ) : campo.tipo === "select" ? (
                  <Field key={campo.name} label={campo.label} htmlFor={campo.name}>
                    <Select
                      id={campo.name}
                      name={campo.name}
                      defaultValue={String(values[campo.name] ?? campo.opciones?.[0] ?? "")}
                    >
                      {(campo.opciones ?? []).map((opcion) => (
                        <option key={opcion} value={opcion}>
                          {opcion.replaceAll("_", " ")}
                        </option>
                      ))}
                    </Select>
                  </Field>
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
