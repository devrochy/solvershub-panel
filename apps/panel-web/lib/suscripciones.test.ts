import { describe, expect, it } from "vitest";

import { textoEstado } from "@/lib/suscripciones";

const base = {
  configurado: null,
  efectivo: null,
  habilitados: [
    { id: "pack_subscriptions", label: "Suscripciones" },
    { id: "pack_cobranza", label: "Cobranza" },
  ],
  mensaje: "",
};

describe("proveedor de suscripciones (HU-SUB-09)", () => {
  it("dice con qué habilidad se cobran los planes", () => {
    expect(textoEstado({ ...base, estado: "ok", efectivo: "pack_cobranza" })).toBe(
      "Los planes se cobran con Cobranza.",
    );
  });

  it("muestra el motivo cuando no hay un proveedor claro", () => {
    const mensaje = "Hay más de un proveedor. Elige uno en la configuración del negocio.";
    expect(textoEstado({ ...base, estado: "ambiguo", mensaje })).toBe(mensaje);
  });
});
