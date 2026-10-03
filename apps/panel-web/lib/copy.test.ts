import { describe, expect, it } from "vitest";

import { SECTION_HELP, sectionHelp } from "@/lib/copy";

describe("ayuda contextual (HU-UX-03)", () => {
  it("cada sección tiene pregunta, qué es y primeros pasos", () => {
    for (const [clave, h] of Object.entries(SECTION_HELP)) {
      expect(h.question, clave).toMatch(/¿Qué/);
      expect(h.what.length, clave).toBeGreaterThan(20);
      expect(h.first.length, clave).toBeGreaterThan(0);
    }
  });

  it("no usa jerga técnica en los textos", () => {
    const jerga = ["fernter", "fernet", ".env", "waba", "json", "api", "endpoint", "token"];
    for (const h of Object.values(SECTION_HELP)) {
      const blob = `${h.what} ${h.first.join(" ")}`.toLowerCase();
      for (const j of jerga) {
        expect(blob.includes(j), `${j} en "${h.question}"`).toBe(false);
      }
    }
  });

  it("devuelve undefined para una sección desconocida", () => {
    expect(sectionHelp("no-existe")).toBeUndefined();
  });
});
