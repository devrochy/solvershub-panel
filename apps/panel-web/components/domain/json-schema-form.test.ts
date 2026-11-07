import { describe, expect, it } from "vitest";

import { effType, enumLabels, errorDeCampo, parseJsonField } from "@/components/domain/json-schema-form";

describe("effType (HU-FWK-08)", () => {
  it("devuelve el tipo directo", () => {
    expect(effType({ type: "string" })).toMatchObject({ type: "string", nullable: false });
  });

  it("desenvuelve anyOf con null como nullable", () => {
    const prop = { anyOf: [{ type: "number" }, { type: "null" }] };
    expect(effType(prop)).toMatchObject({ type: "number", nullable: true });
  });

  it("cae a string si hay varias variantes no nulables", () => {
    const prop = { anyOf: [{ type: "number" }, { type: "string" }] };
    expect(effType(prop).type).toBe("string");
  });
});

describe("enumLabels", () => {
  it("mapea un array de etiquetas", () => {
    expect(enumLabels({ enum: ["a", "b"], "x-enumLabels": ["Alfa", "Beta"] })).toEqual({
      a: "Alfa",
      b: "Beta",
    });
  });

  it("acepta un objeto de etiquetas", () => {
    expect(enumLabels({ enum: ["a"], "x-enumLabels": { a: "Alfa" } })).toEqual({ a: "Alfa" });
  });

  it("sin etiquetas devuelve vacío", () => {
    expect(enumLabels({ enum: ["a"] })).toEqual({});
  });
});

describe("parseJsonField", () => {
  it("vacío es null válido", () => {
    expect(parseJsonField("")).toEqual({ ok: true, data: null });
  });

  it("JSON válido se parsea", () => {
    expect(parseJsonField('{"a":1}')).toEqual({ ok: true, data: { a: 1 } });
  });

  it("JSON inválido falla", () => {
    expect(parseJsonField("{roto")).toEqual({ ok: false });
  });
});

describe("errorDeCampo (HU-UX-13: validación propia, en español)", () => {
  const entero = { type: "integer", title: "Días de tolerancia", minimum: 0, maximum: 30 };

  it("avisa de un número fuera de rango, con el título del campo", () => {
    expect(errorDeCampo(entero, -1, true)).toBe("«Días de tolerancia» debe estar entre 0 y 30.");
    expect(errorDeCampo(entero, 31, true)).toBe("«Días de tolerancia» debe estar entre 0 y 30.");
    expect(errorDeCampo({ type: "number", title: "Monto", minimum: 0 }, -5, true)).toBe(
      "«Monto» debe ser mayor o igual a 0.",
    );
    expect(errorDeCampo({ type: "number", title: "Monto", maximum: 9 }, 10, true)).toBe(
      "«Monto» debe ser menor o igual a 9.",
    );
    expect(errorDeCampo(entero, 5, true)).toBeNull();
  });

  it("un entero no admite decimales", () => {
    expect(errorDeCampo(entero, 2.5, true)).toBe("«Días de tolerancia» debe ser un número entero.");
  });

  it("lo obligatorio no puede quedar vacío, pero lo opcional sí", () => {
    expect(errorDeCampo({ type: "string", title: "Nombre" }, "  ", true)).toBe("«Nombre» es obligatorio.");
    expect(errorDeCampo(entero, "", true)).toBe("«Días de tolerancia» es obligatorio.");
    expect(errorDeCampo({ type: "string", title: "Nombre", enum: ["a"] }, "", true)).toBe("«Nombre» es obligatorio.");
    expect(errorDeCampo({ type: "string", title: "Nombre" }, "", false)).toBeNull();
    expect(errorDeCampo(entero, "", false)).toBeNull();
  });

  it("ignora los tipos que valida otro camino", () => {
    expect(errorDeCampo({ type: "boolean" }, false, true)).toBeNull();
    expect(errorDeCampo({ type: "array", items: { type: "string" } }, [], true)).toBeNull();
    expect(errorDeCampo({ type: "string", writeOnly: true }, "", true)).toBeNull();
  });

  it("usa el nombre del campo si no tiene título", () => {
    expect(errorDeCampo({ type: "string" }, "", true, "dias_tolerancia")).toBe("«Dias tolerancia» es obligatorio.");
  });
});
