import { describe, expect, it } from "vitest";

import { parseBusinessHours, serializeBusinessHours } from "@/lib/business-hours";

describe("parseBusinessHours (HU-UI-01)", () => {
  it("parsea el JSON del backend", () => {
    expect(parseBusinessHours('{"mon":"08:00-18:00","sun":""}')).toEqual({
      mon: "08:00-18:00",
      sun: "",
    });
  });

  it("tolera JSON inválido y vacío", () => {
    expect(parseBusinessHours("no-json")).toEqual({});
    expect(parseBusinessHours("")).toEqual({});
    expect(parseBusinessHours(null)).toEqual({});
  });

  it("acepta un objeto ya parseado", () => {
    expect(parseBusinessHours({ mon: "09:00-17:00" })).toEqual({ mon: "09:00-17:00" });
  });
});

describe("serializeBusinessHours", () => {
  it("omite los días cerrados (vacíos)", () => {
    expect(serializeBusinessHours({ mon: "08:00-18:00", sun: "" })).toBe(
      JSON.stringify({ mon: "08:00-18:00" }),
    );
  });

  it("hace roundtrip con el parser", () => {
    const raw = '{"mon":"08:00-18:00","sat":"09:00-13:00"}';
    expect(serializeBusinessHours(parseBusinessHours(raw))).toBe(raw);
  });
});
