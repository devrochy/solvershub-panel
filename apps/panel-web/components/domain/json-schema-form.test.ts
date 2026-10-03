import { describe, expect, it } from "vitest";

import { effType, enumLabels, parseJsonField } from "@/components/domain/json-schema-form";

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
