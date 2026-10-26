import { describe, expect, it } from "vitest";

import { claveDeFrase } from "@/lib/agentes-editor";
import { completarLista } from "@/lib/frases-pendientes";

describe("completarLista", () => {
  it("suma el texto pendiente al final, recortado", () => {
    expect(completarLista(["uno solo"], "  no, gracias  ", 3, 10)).toEqual({ frases: ["uno solo", "no, gracias"] });
  });

  it("sin texto no cambia la lista ni avisa", () => {
    expect(completarLista(["uno solo"], "   ", 3, 10)).toEqual({ frases: null });
  });

  it("una repetida se absorbe sin avisar (sin importar mayúsculas ni tildes)", () => {
    expect(completarLista(["Cancelación"], "CANCELACION", 3, 10)).toEqual({ frases: null });
  });

  it("una frase demasiado corta avisa en vez de perderse", () => {
    const r = completarLista([], "ab", 3, 10);
    expect(r.frases).toBeNull();
    expect(r.error).toContain("«ab»");
    expect(r.error).toContain("mínimo 3");
  });

  it("con la lista llena avisa en vez de perderse", () => {
    const r = completarLista(["uno", "dos"], "tres", 3, 2);
    expect(r.frases).toBeNull();
    expect(r.error).toContain("máximo de 2");
  });

  it("corta a 300 caracteres, como el campo", () => {
    expect(completarLista([], "x".repeat(400), 3, 10).frases![0]).toHaveLength(300);
  });

  it("dos frases de solo emojis distintas no se toman como repetidas", () => {
    expect(completarLista(["👍"], "🙏", 1, 10)).toEqual({ frases: ["👍", "🙏"] });
    expect(completarLista(["👍"], "👍", 1, 10)).toEqual({ frases: null });
  });
});

describe("claveDeFrase", () => {
  it("normaliza igual que normalizarFrase cuando queda texto", () => {
    expect(claveDeFrase("  ¡No, Gracias! ")).toBe("no gracias");
  });

  it("si la normalización queda vacía usa el texto recortado en minúsculas", () => {
    expect(claveDeFrase(" 👍 ")).toBe("👍");
    expect(claveDeFrase("👍")).not.toBe(claveDeFrase("🙏"));
  });
});
