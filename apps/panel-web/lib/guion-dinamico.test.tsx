// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

import { PasoFlujo } from "@/components/domain/agentes/recorrido/pasos";
import type { FlujoDelAgente } from "@/lib/agentes-editor";
import { conversacionDelGuion, estadosDeBloques } from "@/lib/guion-reglas";
import { violacionesGraves } from "@/lib/testing/axe";

// SPEC-48, HU-COM-25: la línea de tiempo del guion en el paso Flujo y el teléfono de la vista previa.

afterEach(cleanup);

const BASE: FlujoDelAgente = { sections: [{ id: "atender", label: "Atender", purpose: "Saludar", tools: [] }] };

function formas(transferencia: "activa" | "apagada" | "falta_configurar") {
  return {
    forms: [
      { method: "efectivo_contraentrega" as const, label: "Contra entrega", enabled: true, estado: "activa" as const, falta: "", instructions: "", superpoder: null },
      { method: "transferencia" as const, label: "Transferencia", enabled: transferencia !== "apagada", estado: transferencia, falta: "", instructions: "", superpoder: null },
      { method: "pago_en_linea" as const, label: "Pago en línea", enabled: false, estado: "apagada" as const, falta: "", instructions: "", superpoder: null },
    ],
    transfer_proof_required: true,
  };
}

describe("guion por formas de pago en el paso Flujo", () => {
  it("dice qué bloque está activo, oculto u opcional y restaura lo sugerido", async () => {
    const onRestaurar = vi.fn();
    const { container } = render(
      <PasoFlujo
        flujo={BASE}
        acciones={[]}
        cambiar={() => {}}
        errores={{}}
        semilla={false}
        guion={{ bloques: estadosDeBloques(formas("activa"), BASE), onRestaurar, restaurado: false }}
      />,
    );
    const region = screen.getByRole("region", { name: "Bloques por formas de pago" });
    const comprobar = region.querySelector('[data-bloque="comprobar_comprobante"]') as HTMLElement;
    expect(within(comprobar).getByText("Activo")).toBeTruthy();
    expect(comprobar.textContent).toContain("falta en el guion");
    const verificar = region.querySelector('[data-bloque="verificar_pago"]') as HTMLElement;
    expect(within(verificar).getByText("Oculto")).toBeTruthy();
    fireEvent.click(within(region).getByRole("button", { name: "Restaurar guion sugerido" }));
    expect(onRestaurar).toHaveBeenCalledOnce();
    expect(await violacionesGraves(container)).toEqual([]);
  });

  it("transferencia sin terminar de configurar deja el bloque opcional", () => {
    render(
      <PasoFlujo
        flujo={BASE}
        acciones={[]}
        cambiar={() => {}}
        errores={{}}
        semilla={false}
        guion={{ bloques: estadosDeBloques(formas("falta_configurar"), BASE), onRestaurar: () => {}, restaurado: true }}
      />,
    );
    const region = screen.getByRole("region", { name: "Bloques por formas de pago" });
    expect(within(region).getByText("Opcional")).toBeTruthy();
    expect(within(region).getByRole("button", { name: "Restaurar guion sugerido" }).hasAttribute("disabled")).toBe(true);
  });

  it("el teléfono muestra el diálogo del comprobante, sin modelo", () => {
    const flujo: FlujoDelAgente = {
      sections: [...BASE.sections, { id: "comprobar_comprobante", label: "Comprobar comprobante", purpose: "x", tools: [] }],
    };
    const mensajes = conversacionDelGuion(flujo);
    expect(mensajes[0]).toEqual({ tipo: "etapa", texto: "1 · Atender" });
    expect(mensajes).toContainEqual({ tipo: "etapa", texto: "2 · Comprobar comprobante" });
    expect(mensajes.some((m) => m.tipo === "cliente" && m.texto.includes("comprobante"))).toBe(true);
  });
});
