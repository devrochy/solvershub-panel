import { describe, expect, it } from "vitest";

import type { Requirement } from "@/lib/api/types";
import type { FormasDePago } from "@/lib/formas-de-pago";
import { semaforo } from "@/lib/listo-para-responder";

// SPEC-47, HU-AOS-81: «Listo para responder» por módulo.

const CATALOGO: Requirement = { skill: "pack_commerce", kind: "sin_contenido", title: "Catálogo", explanation: "Carga productos.", section: "comercio", content: "catalogo" };
const SIN_CONFIG: Requirement = { skill: "pack_calendar", kind: "habilidad_sin_configurar", title: "Agenda", explanation: "Conecta tu calendario.", section: "agenda", content: null };

function formas(estado: "activa" | "falta_configurar"): FormasDePago {
  return {
    agent_id: "a", configurada: true, pago_en_linea_disponible: false, transfer_accounts: [], transfer_proof_required: true, transfer_ocr_enabled: true,
    forms: [{ method: "transferencia", label: "Transferencia", enabled: true, estado, falta: "Agrega una cuenta.", instructions: "", superpoder: null }],
  };
}

describe("semáforo Listo para responder", () => {
  it("verde sin pendientes", () => {
    expect(semaforo({ requisitos: [], formas: formas("activa"), superpoderesActivos: 1, conDatos: true }).luz).toBe("verde");
  });

  it("ámbar por contenido o por una forma de pago a medias", () => {
    const s = semaforo({ requisitos: [CATALOGO], formas: formas("falta_configurar"), superpoderesActivos: 1, conDatos: false });
    expect(s.luz).toBe("ambar");
    expect(s.pendientes.map((p) => p.texto)).toEqual(["Catálogo: Carga productos.", "Transferencia: Agrega una cuenta."]);
  });

  it("rojo con una habilidad sin configurar o sin superpoderes", () => {
    expect(semaforo({ requisitos: [SIN_CONFIG], formas: null, superpoderesActivos: 1, conDatos: false }).luz).toBe("rojo");
    expect(semaforo({ requisitos: [], formas: null, superpoderesActivos: 0, conDatos: false }).titulo).toBe("Todavía no puede responder");
  });

  it("Pagos en línea sin configurar solo cuenta si la forma «Pago en línea» está encendida (SPEC-48)", () => {
    const WOMPI: Requirement = { skill: "pack_payments", kind: "habilidad_sin_configurar", title: "Pagos en línea", explanation: "Configura tus llaves de Wompi.", section: "pagos", content: null };
    const enLinea = (estado: "apagada" | "falta_configurar"): FormasDePago => ({
      ...formas("activa"),
      forms: [{ method: "pago_en_linea", label: "Pago en línea", enabled: estado !== "apagada", estado, falta: "", instructions: "", superpoder: null }],
    });
    expect(semaforo({ requisitos: [WOMPI], formas: formas("activa"), superpoderesActivos: 1, conDatos: true }).luz).toBe("verde");
    expect(semaforo({ requisitos: [WOMPI], formas: enLinea("apagada"), superpoderesActivos: 1, conDatos: true }).luz).toBe("verde");
    expect(semaforo({ requisitos: [WOMPI], formas: enLinea("falta_configurar"), superpoderesActivos: 1, conDatos: true }).luz).toBe("rojo");
    // Sin formas leídas (agente sin Comercio) se mantiene el requisito.
    expect(semaforo({ requisitos: [WOMPI], formas: null, superpoderesActivos: 1, conDatos: true }).luz).toBe("rojo");
  });
});
