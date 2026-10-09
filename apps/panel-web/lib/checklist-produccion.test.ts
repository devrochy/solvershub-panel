import { describe, expect, it } from "vitest";

import { enCurso, enlaceReparacion, estadoItem, resumenCorrida } from "./checklist-produccion";

const item = (key: string, ok: boolean | null) => ({ key, label: key, ok });

describe("checklist de producción (HU-CONN-07)", () => {
  it("solo consulta mientras la corrida está en cola o corriendo", () => {
    expect(enCurso("queued")).toBe(true);
    expect(enCurso("running")).toBe(true);
    expect(enCurso("done")).toBe(false);
    expect(enCurso("failed")).toBe(false);
    expect(enCurso("never")).toBe(false);
  });

  it("resume la corrida", () => {
    expect(resumenCorrida({ status: "never" }).label).toBe("Sin revisar");
    expect(resumenCorrida({ status: "running" }).label).toBe("Revisando…");
    expect(resumenCorrida({ status: "failed" }).variant).toBe("danger");
    expect(resumenCorrida({ status: "done", ready: true }).label).toBe("Lista para producción");
    expect(
      resumenCorrida({ status: "done", ready: false, items: [item("a", false), item("b", false), item("c", true)] })
        .label,
    ).toBe("Faltan 2");
    expect(resumenCorrida({ status: "done", ready: false, items: [item("a", false)] }).label).toBe("Falta 1");
    expect(resumenCorrida({ status: "done", ready: false, items: [item("a", null)] }).label).toBe(
      "Sin datos suficientes",
    );
  });

  it("un ítem sin evaluar no se muestra como fallo", () => {
    expect(estadoItem(null).variant).toBe("neutral");
    expect(estadoItem(false).variant).toBe("danger");
    expect(estadoItem(true).variant).toBe("success");
  });

  it("traduce la reparación a una ruta de la conexión", () => {
    expect(enlaceReparacion("add_number", "c1")?.href).toBe("/conexiones/meta/c1/numeros");
    expect(enlaceReparacion("manage_templates", "c1")?.href).toBe("/conexiones/meta/c1/plantillas");
    expect(enlaceReparacion("reauthorize", "c1")?.href).toBe("/conexiones/whatsapp");
    expect(enlaceReparacion(null, "c1")).toBeNull();
    expect(enlaceReparacion("desconocida", "c1")).toBeNull();
  });
});
