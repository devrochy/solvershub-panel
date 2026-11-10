import { describe, expect, it } from "vitest";

import { estadoCheck } from "./estado-check";

describe("estadoCheck", () => {
  it("true es ok", () => {
    expect(estadoCheck(true)).toEqual({ label: "Correcto", variant: "success" });
  });

  it("false es revisar", () => {
    expect(estadoCheck(false)).toEqual({ label: "Revisar", variant: "warning" });
  });

  it("null (no concluyente) es informativo, no un fallo", () => {
    expect(estadoCheck(null)).toEqual({ label: "Informativo", variant: "neutral" });
  });
});
