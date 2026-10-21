import { describe, expect, it } from "vitest";

import { FOTO_URL_MAX, esFotoValida } from "./foto-producto";

describe("esFotoValida", () => {
  it("acepta un link https", () => {
    expect(esFotoValida("https://cdn.tienda.com/casco.jpg")).toBe(true);
    expect(esFotoValida("  HTTPS://cdn.tienda.com/casco.jpg ")).toBe(true);
  });

  it("rechaza lo que la API rechaza", () => {
    for (const url of [
      "http://cdn.tienda.com/casco.jpg",
      "javascript:alert(1)",
      "cdn.tienda.com/casco.jpg",
      "https://",
      "https://cdn.tienda.com/mi casco.jpg",
      `https://x.com/${"a".repeat(FOTO_URL_MAX)}`,
    ]) {
      expect(esFotoValida(url)).toBe(false);
    }
  });
});
