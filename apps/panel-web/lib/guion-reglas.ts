import type { AccionDelFlujo, FlujoDelAgente, FlujoSeccion } from "@/lib/agentes-editor";
import type { FormasDePago } from "@/lib/formas-de-pago";
import { conversacionDeFlujo, type MensajeDeVistaPrevia } from "@/lib/vista-previa";

/**
 * Guion dinámico por formas de pago (SPEC-48, HU-COM-25, D7): reglas declarativas. El guion es el
 * flujo del agente (ADR-0195); el backend lo sigue validando al guardarlo (`PUT /flow`).
 *
 * - Solo contra entrega → sin bloque de comprobación.
 * - Transferencia activa y con comprobante → bloque «Comprobar comprobante».
 * - Pago en línea activo → bloque «Verificar pago».
 * Una forma encendida a la que le falta algo deja su bloque «Opcional» (no entra al guion).
 */

export type EstadoDeBloque = "activo" | "opcional" | "oculto";

export type BloqueDePago = {
  id: string;
  label: string;
  purpose: string;
  tools: string[];
  metodo: "transferencia" | "pago_en_linea";
  /** Cómo se ve en el teléfono de la vista previa (textos fijos, sin modelo). */
  dialogo: { cliente: string; agente: string };
};

export const BLOQUES_DE_PAGO: readonly BloqueDePago[] = [
  {
    id: "comprobar_comprobante",
    label: "Comprobar comprobante",
    purpose: "Cuando el cliente transfiere, pedirle la foto del comprobante y revisarla contra su pedido. Solo el servidor confirma el pago.",
    tools: ["comprobar_comprobante"],
    metodo: "transferencia",
    dialogo: {
      cliente: "Listo, ya transferí. Te mando el comprobante 📎",
      agente: "¡Gracias! Reviso tu comprobante contra el pedido y te confirmo en un momento.",
    },
  },
  {
    id: "verificar_pago",
    label: "Verificar pago",
    purpose: "Si paga en línea, enviarle el link de pago y verificar el pago antes de darlo por hecho.",
    tools: ["confirmar_pago_pedido", "verificar_pago_pedido"],
    metodo: "pago_en_linea",
    dialogo: {
      cliente: "¿Me mandas el link para pagar?",
      agente: "Claro, aquí tienes tu link de pago. Te aviso apenas se confirme.",
    },
  },
];

const IDS_DE_PAGO = new Set(BLOQUES_DE_PAGO.map((b) => b.id));

export type BloqueConEstado = BloqueDePago & { estado: EstadoDeBloque; enElGuion: boolean };

export const ETIQUETA_DE_BLOQUE: Record<EstadoDeBloque, string> = { activo: "Activo", opcional: "Opcional", oculto: "Oculto" };

/** Estado de cada bloque de pago según las formas (lo que se ve en pantalla, guardado o no). */
export function estadosDeBloques(
  formas: Pick<FormasDePago, "forms" | "transfer_proof_required"> | null,
  flujo: FlujoDelAgente,
): BloqueConEstado[] {
  const enGuion = new Set(flujo.sections.map((s) => s.id));
  return BLOQUES_DE_PAGO.map((bloque) => {
    const forma = formas?.forms.find((f) => f.method === bloque.metodo);
    let estado: EstadoDeBloque = "oculto";
    if (forma && forma.estado !== "apagada") {
      const conComprobante = bloque.metodo !== "transferencia" || Boolean(formas?.transfer_proof_required);
      estado = forma.estado === "activa" && conComprobante ? "activo" : "opcional";
    }
    return { ...bloque, estado, enElGuion: enGuion.has(bloque.id) };
  });
}

function seccionDe(bloque: BloqueDePago, acciones: readonly AccionDelFlujo[]): FlujoSeccion {
  const disponibles = new Set(acciones.filter((a) => a.enabled || a.by_superpower).map((a) => a.tool));
  return { id: bloque.id, label: bloque.label, purpose: bloque.purpose, tools: bloque.tools.filter((t) => disponibles.has(t)) };
}

/**
 * El guion con los bloques de pago que tocan: quita los que quedaron oculto u opcional y agrega al
 * final los activos que falten. El resto de las secciones (y sus cambios a mano) no se toca.
 */
export function componerGuion(
  flujo: FlujoDelAgente,
  bloques: readonly BloqueConEstado[],
  acciones: readonly AccionDelFlujo[],
): FlujoDelAgente {
  const activos = new Set(bloques.filter((b) => b.estado === "activo").map((b) => b.id));
  const sections = flujo.sections.filter((s) => !IDS_DE_PAGO.has(s.id) || activos.has(s.id));
  for (const bloque of bloques) {
    if (bloque.estado === "activo" && !sections.some((s) => s.id === bloque.id)) sections.push(seccionDe(bloque, acciones));
  }
  return { sections };
}

/** «Restaurar guion sugerido»: la semilla del pack con los bloques de las formas activas. */
export function guionSugerido(
  semilla: FlujoDelAgente,
  bloques: readonly BloqueConEstado[],
  acciones: readonly AccionDelFlujo[],
): FlujoDelAgente {
  return componerGuion({ sections: semilla.sections.filter((s) => !IDS_DE_PAGO.has(s.id)) }, bloques, acciones);
}

export function mismoGuion(a: FlujoDelAgente, b: FlujoDelAgente): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** La conversación del teléfono para el paso Flujo: cada etapa y, en los bloques de pago, su diálogo. */
export function conversacionDelGuion(flujo: FlujoDelAgente): MensajeDeVistaPrevia[] {
  return flujo.sections.flatMap((s, i) => {
    const bloque = BLOQUES_DE_PAGO.find((b) => b.id === s.id);
    const base = conversacionDeFlujo([{ nombre: s.label, proposito: bloque ? "" : s.purpose }]).map((m) =>
      m.tipo === "etapa" ? { ...m, texto: `${i + 1} · ${s.label.trim() || `Etapa ${i + 1}`}` } : m,
    );
    return bloque
      ? [...base, { tipo: "cliente" as const, texto: bloque.dialogo.cliente }, { tipo: "agente" as const, texto: bloque.dialogo.agente }]
      : base;
  });
}
