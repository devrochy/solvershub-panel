import { describe, expect, it } from "vitest";

import { cambiosDeVoz } from "./coordinador-voz";

const base = { assistant_name: "Lía", business_description: "Tienda", brand_voice: "cercana" };

describe("cambiosDeVoz", () => {
  it("sin cambios no envía nada", () => {
    expect(cambiosDeVoz(base, { ...base })).toEqual({});
  });
  it("solo envía lo que cambió", () => {
    expect(cambiosDeVoz(base, { ...base, brand_voice: "formal" })).toEqual({ brand_voice: "formal" });
  });
});
