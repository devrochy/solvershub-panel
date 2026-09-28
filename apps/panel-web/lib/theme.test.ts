import { describe, expect, it } from "vitest";

import { DEFAULT_THEME, normalizeTheme, toggleTheme } from "@/lib/theme";

describe("normalizeTheme", () => {
  it("acepta solo los temas conocidos", () => {
    expect(normalizeTheme("sh-light")).toBe("sh-light");
    expect(normalizeTheme("sh-dark")).toBe("sh-dark");
  });

  it("cae al tema por defecto ante valores inválidos o ausentes", () => {
    expect(normalizeTheme(undefined)).toBe(DEFAULT_THEME);
    expect(normalizeTheme(null)).toBe(DEFAULT_THEME);
    expect(normalizeTheme("hacker")).toBe(DEFAULT_THEME);
  });
});

describe("toggleTheme", () => {
  it("alterna entre claro y oscuro", () => {
    expect(toggleTheme("sh-dark")).toBe("sh-light");
    expect(toggleTheme("sh-light")).toBe("sh-dark");
  });
});
