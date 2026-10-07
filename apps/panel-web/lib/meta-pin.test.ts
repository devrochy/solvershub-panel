import { describe, expect, it } from "vitest";

import { parsePin } from "@/lib/meta-pin";

describe("parsePin", () => {
  it("vacío deja que el backend genere el PIN", () => {
    expect(parsePin("")).toEqual({ pin: null });
    expect(parsePin("   ")).toEqual({ pin: null });
  });

  it("acepta 6 dígitos, sin espacios alrededor", () => {
    expect(parsePin(" 246810 ")).toEqual({ pin: "246810" });
  });

  it.each(["12345", "1234567", "12a456", "１２３４５６"])("rechaza %s", (raw) => {
    expect(parsePin(raw)).toEqual({ error: "El PIN tiene que ser de 6 dígitos." });
  });
});
