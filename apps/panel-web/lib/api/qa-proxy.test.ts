import { describe, expect, it } from "vitest";

import { rutaPermitida } from "@/lib/api/qa-proxy";

const ID = "8f2b9a3c-1d4e-4f5a-9b6c-7d8e9f0a1b2c";

describe("lista blanca del BFF de pruebas", () => {
  it("deja pasar solo las rutas y métodos del centro de pruebas", () => {
    expect(rutaPermitida("GET", "catalog")).toBe(true);
    expect(rutaPermitida("PUT", "runs/me/items/pruebas-uno/steps/2")).toBe(true);
    expect(rutaPermitida("POST", "runs/me/attachments")).toBe(true);
    expect(rutaPermitida("GET", `attachments/${ID}`)).toBe(true);
    expect(rutaPermitida("GET", `runs/${ID}/report.md`)).toBe(true);
    expect(rutaPermitida("POST", `testers/${ID}/revoke`)).toBe(true);
    expect(rutaPermitida("GET", "evolution")).toBe(true);
    expect(rutaPermitida("POST", "evolution")).toBe(false);
  });

  it("rechaza métodos cambiados, traversal y rutas inventadas", () => {
    expect(rutaPermitida("DELETE", "catalog")).toBe(false);
    expect(rutaPermitida("POST", "catalog/import")).toBe(false);
    expect(rutaPermitida("GET", "../collaborators")).toBe(false);
    expect(rutaPermitida("PUT", "runs/me/items/../../x/steps/1")).toBe(false);
    expect(rutaPermitida("GET", "attachments/no-es-uuid")).toBe(false);
    expect(rutaPermitida("PUT", "runs/me/items/Pruebas_Uno/steps/1")).toBe(false);
  });
});
