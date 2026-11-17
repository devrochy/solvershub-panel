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
});
