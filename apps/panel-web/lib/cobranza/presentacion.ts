import { estadoLegible, type StatusMap } from "@/components/domain/status-badge";
import { formatCop, formatDate, formatDateTime, formatNumber } from "@/lib/format";

/** Una sola fuente para cómo se leen los valores de Cobranza: el backend los manda como enums. */

export const RIESGO_STATUS: StatusMap = {
  blanco: { label: "Sin riesgo", variant: "neutral" },
  azul: { label: "En seguimiento", variant: "accent" },
  rojo: { label: "Riesgo alto", variant: "danger" },
};

export const CARTERA_STATUS: StatusMap = {
  activo: { label: "Activa", variant: "success" },
  activa: { label: "Activa", variant: "success" },
  inactivo: { label: "Inactiva", variant: "neutral" },
  inactiva: { label: "Inactiva", variant: "neutral" },
};

export const GESTOR_STATUS: StatusMap = {
  activo: { label: "Activo", variant: "success" },
  inactivo: { label: "Inactivo", variant: "neutral" },
};

export const PROMESA_STATUS: StatusMap = {
  pendiente: { label: "Pendiente", variant: "warning" },
  cumplida: { label: "Cumplida", variant: "success" },
  incumplida: { label: "Incumplida", variant: "danger" },
};

export const MOVIMIENTO_STATUS: StatusMap = {
  pago: { label: "Pago", variant: "success" },
  abono: { label: "Abono", variant: "accent" },
};

export const INYECCION_STATUS: StatusMap = {
  activa: { label: "Activa", variant: "success" },
  eliminada: { label: "Eliminada", variant: "neutral" },
};

export const PRESTAMO_STATUS: StatusMap = {
  vigente: { label: "Vigente", variant: "accent" },
  liquidado: { label: "Liquidado", variant: "success" },
  cancelado: { label: "Cancelado", variant: "neutral" },
};

export const OPERACION_STATUS: StatusMap = {
  crear: { label: "Creación", variant: "success" },
  editar: { label: "Edición", variant: "warning" },
  eliminar: { label: "Eliminación", variant: "danger" },
};

export function etiquetaDeRiesgo(riesgo: string): string {
  return RIESGO_STATUS[riesgo]?.label ?? estadoLegible(riesgo);
}

const METODOS: Record<string, string> = {
  efectivo: "Efectivo",
  nequi: "Nequi",
  daviplata: "Daviplata",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta",
};

export function metodoDePago(metodo: string): string {
  return metodo ? (METODOS[metodo] ?? estadoLegible(metodo)) : "—";
}

const ENTIDADES: Record<string, string> = {
  inyeccion: "Inyección",
  prestamo: "Préstamo",
};

export function entidadLegible(entidad: string): string {
  return ENTIDADES[entidad] ?? estadoLegible(entidad);
}

/** Quién pactó una promesa, para leer «Pactó el agente». */
export function quienPacto(creadoPor: string): string {
  if (creadoPor === "ia" || creadoPor === "agente") return "el agente";
  if (creadoPor === "gestor") return "el gestor";
  if (creadoPor === "propietario") return "el dueño";
  return creadoPor;
}

/** Qué cubre una promesa. `null` en la promesa corriente sin alcance: no hay nada que aclarar. */
export function loQueCubre(alcance: string | null | undefined, tipo: string): string | null {
  if (alcance === "vencido") return "Cuotas vencidas";
  if (alcance === "saldo_total") return "Saldo total";
  if (tipo === "abono_parcial") return "Abono parcial";
  if (tipo === "refinanciacion") return "Refinanciación";
  return null;
}

/** El resumen trae los montos ya formateados («48.350.000») y sin moneda. */
export function montoDeResumen(valor: string | undefined): number {
  return Number((valor ?? "0").replace(/\./g, "").replace(",", ".")) || 0;
}

/** Las fechas con hora de la API llegan como «2026-11-08 17:10», en UTC. */
export function fechaHoraDeApi(valor: string | null | undefined): string {
  if (!valor) return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) return formatDate(valor);
  return formatDateTime(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(valor) ? `${valor.replace(" ", "T")}:00Z` : valor);
}

const CAMPOS: Record<string, string> = {
  valor_esperado: "Valor",
  vence: "Vencimiento",
  estatus: "Estado",
  metodo: "Método",
  num_cuotas: "Cuotas",
  numero: "Cuota número",
  km: "Kilómetros",
  prestamos_vigentes: "Préstamos vigentes",
  cobrado_dia: "Cobrado del día",
  telefono: "Teléfono",
  telefono_whatsapp: "Teléfono WhatsApp",
  tipo_documento: "Tipo de documento",
  numero_documento: "Número de documento",
};

const CAMPOS_DE_DINERO = new Set(["valor", "valor_esperado", "saldo", "mora", "gastos", "cobrado", "cobrado_dia", "caja", "caja_final"]);

export function campoLegible(campo: string): string {
  return CAMPOS[campo] ?? estadoLegible(campo);
}

function valorLegible(campo: string, valor: unknown): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  if (typeof valor === "boolean") return valor ? "Sí" : "No";
  if (typeof valor === "number") return CAMPOS_DE_DINERO.has(campo) ? formatCop(valor) : formatNumber(valor);
  if (campo === "vence") return formatDate(String(valor));
  if (campo === "estado" || campo === "estatus" || campo === "resultado") return estadoLegible(String(valor));
  if (campo === "metodo") return metodoDePago(String(valor));
  return String(valor);
}

function esCampoInterno(campo: string): boolean {
  return campo === "id" || campo.endsWith("_id");
}

/** Cada campo que cambió, escrito para leerse: «Valor: $ 50.000 → $ 45.000». */
export function cambiosDeAuditoria(
  antes: Record<string, unknown> | null,
  despues: Record<string, unknown> | null,
): string[] {
  const campos = [...new Set([...Object.keys(antes ?? {}), ...Object.keys(despues ?? {})])].filter((c) => !esCampoInterno(c));
  return campos.flatMap((campo) => {
    const previo = antes?.[campo];
    const nuevo = despues?.[campo];
    const etiqueta = campoLegible(campo);
    if (antes && despues && campo in antes && campo in despues) {
      return previo === nuevo ? [] : [`${etiqueta}: ${valorLegible(campo, previo)} → ${valorLegible(campo, nuevo)}`];
    }
    return [`${etiqueta}: ${valorLegible(campo, campo in (despues ?? {}) ? nuevo : previo)}`];
  });
}

/** Las cifras de un cierre del día, con nombre; los conteos anidados van a la misma línea. */
export function cifrasDelCierre(datos: Record<string, unknown>): string {
  const partes: string[] = [];
  for (const [campo, valor] of Object.entries(datos)) {
    if (valor === null || valor === undefined) continue;
    if (typeof valor === "object") {
      for (const [interno, numero] of Object.entries(valor as Record<string, unknown>)) {
        if (typeof numero !== "object") partes.push(`${campoLegible(interno)}: ${valorLegible(interno, numero)}`);
      }
    } else {
      partes.push(`${campoLegible(campo)}: ${valorLegible(campo, valor)}`);
    }
  }
  return partes.join(" · ") || "—";
}

/** Mora de una ruta en días, como se dice: «Al día», «1 día», «12 días». */
export function diasDeMora(dias: number): string {
  if (dias <= 0) return "Al día";
  return dias === 1 ? "1 día" : `${formatNumber(dias)} días`;
}
