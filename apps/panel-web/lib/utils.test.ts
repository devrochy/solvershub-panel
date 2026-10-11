import { describe, expect, it } from "vitest";

import { cn } from "./utils";

describe("cn", () => {
  it("conserva el tamaño de la escala tipográfica junto a un color de texto", () => {
    expect(cn("text-sh-hero text-headline")).toBe("text-sh-hero text-headline");
    expect(cn("font-display text-sh-h1 tracking-tight text-headline")).toContain("text-sh-h1");
  });

  it("resuelve conflictos dentro del mismo grupo", () => {
    expect(cn("text-sh-body", "text-sh-dense")).toBe("text-sh-dense");
    expect(cn("text-body", "text-status-danger-fg")).toBe("text-status-danger-fg");
    expect(cn("shadow-elev-1", "shadow-elev-2")).toBe("shadow-elev-2");
  });
});
