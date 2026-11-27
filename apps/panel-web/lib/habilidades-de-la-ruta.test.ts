import { describe, expect, it } from "vitest";

import type { FormasDePago } from "@/lib/formas-de-pago";
import {
  AVANZADAS_DE_HABILIDADES,
  bajadaDeHabilidades,
  cuerpoDeFormas,
  elegidasDe,
  formasCambiaron,
  lineaDelHorario,
  tituloDeLasFrases,
} from "@/lib/habilidades-de-la-ruta";
import type { HorarioDelAgente } from "@/lib/horario-del-agente";
import { lugarDeLaRuta } from "@/lib/requisitos-de-agente";
import { pruebasDeFrasesPropias, respuestaAFrasePropia } from "@/lib/vista-previa";

const FORMAS = {
  forms: [
    { method: "efectivo_contraentrega", label: "Contra entrega", enabled: true, estado: "activa", falta: "", instructions: "x", superpoder: null },
    { method: "transferencia", label: "Transferencia", enabled: false, estado: "apagada", falta: "", instructions: "", superpoder: null },
  ],
  transfer_accounts: [],
  transfer_proof_required: false,
  transfer_ocr_enabled: false,
  pago_en_linea_disponible: false,
} as unknown as FormasDePago;

describe("estación 2 de la ruta (HU-UX-28)", () => {
  it("la línea de «Opciones avanzadas» ya no nombra las tools HTTP", () => {
    expect(AVANZADAS_DE_HABILIDADES).toBe("Acciones, límites por acción y horario.");
  });

  it("la pregunta de frases y la bajada siguen al tipo y al número de preguntas", () => {
    expect(tituloDeLasFrases("agenda")).toBe("¿Así te piden una cita?");
    expect(tituloDeLasFrases("ventas")).toBe("¿Así te escriben tus clientes?");
    expect(tituloDeLasFrases(null)).toBe("¿Así te escriben tus clientes?");
    expect(bajadaDeHabilidades(2)).toBe("Dos preguntas. Lo técnico queda para después.");
    expect(bajadaDeHabilidades(3)).toBe("Tres preguntas. Lo técnico queda para después.");
  });

  it("el horario: el propio si lo tiene, si no el del negocio, y sin API el de Configuración", () => {
    const negocio: HorarioDelAgente = {
      source: "negocio",
      schedule: null,
      business_hours: { ranges: [{ day: 1, from: "08:00", to: "18:00" }] },
      lock_version: 1,
    };
    expect(lineaDelHorario(negocio, null)).toMatch(/^Atiende en el horario del negocio: .*8:00/);
    expect(lineaDelHorario({ ...negocio, source: "agente", schedule: { ranges: [] } }, null)).toBe(
      "Atiende en su propio horario: Sin horario definido",
    );
    expect(lineaDelHorario(null, "lun a vie, 8:00–18:00")).toBe("Atiende en el horario del negocio: lun a vie, 8:00–18:00");
    expect(lineaDelHorario(null, null)).toBe("Atiende en el horario del negocio: sin horario definido");
  });

  it("las formas: solo cambia lo encendido y se sabe si hay que guardar", () => {
    const elegidas = elegidasDe(FORMAS);
    expect(elegidas).toEqual({ efectivo_contraentrega: true, transferencia: false });
    expect(formasCambiaron(FORMAS, elegidas)).toBe(false);
    const otras = { ...elegidas, transferencia: true };
    expect(formasCambiaron(FORMAS, otras)).toBe(true);
    expect(cuerpoDeFormas(FORMAS, otras).forms).toEqual([
      { method: "efectivo_contraentrega", enabled: true, instructions: "x" },
      { method: "transferencia", enabled: true, instructions: "" },
    ]);
  });

  it("las frases propias se prueban en el celular: las últimas primero, sin repetir las del guion", () => {
    const pruebas = pruebasDeFrasesPropias(
      [
        { texto: "uno", superpoder: "A" },
        { texto: "Quiero hacer un pedido", superpoder: "A" },
        { texto: "dos", superpoder: "B" },
        { texto: "tres", superpoder: "B" },
      ],
      [{ id: "pedido", texto: "Quiero hacer un pedido" }],
    );
    expect(pruebas.map((p) => p.texto)).toEqual(["tres", "dos"]);
    expect(respuestaAFrasePropia("Tomar pedidos")[0].texto).toContain("«Tomar pedidos»");
  });

  it("dice dónde se hace después cada salida del panel (bienvenida sin enlaces)", () => {
    expect(lugarDeLaRuta("/comercio/productos")).toBe("Comercio › Productos");
    expect(lugarDeLaRuta("/calendario?ajustes=tipos")).toBe("Calendario");
    expect(lugarDeLaRuta("/conexiones/pagos")).toBe("Conexiones › Pagos");
    expect(lugarDeLaRuta("/habilidades/pack_commerce")).toBe("Habilidades");
    expect(lugarDeLaRuta("/otra")).toBe("el panel");
  });
});
