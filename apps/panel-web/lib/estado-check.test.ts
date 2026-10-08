import { describe, expect, it } from "vitest";

import { estadoCheck } from "./estado-check";

describe("estadoCheck", () => {
  it("true es ok", () => {
    expect(estadoCheck(true)).toEqual({ label: "ok", variant: "success" });
  });

  it("false es revisar", () => {
    expect(estadoCheck(false)).toEqual({ label: "revisar", variant: "warning" });
  });

  it("null (no concluyente) es informativo, no un fallo", () => {
    expect(estadoCheck(null)).toEqual({ label: "info", variant: "neutral" });
  });
});
