import { describe, expect, it } from "vitest";

import {
  formatCellValue,
  formatCop,
  formatDate,
  formatDateTime,
  formatList,
  formatMoney,
  formatNumber,
  parseList,
} from "@/lib/format";

describe("formatCellValue", () => {
  it("marca vacíos como guion", () => {
    expect(formatCellValue(null)).toBe("—");
    expect(formatCellValue(undefined)).toBe("—");
    expect(formatCellValue("")).toBe("—");
  });

  it("humaniza booleanos", () => {
    expect(formatCellValue(true)).toBe("Sí");
    expect(formatCellValue(false)).toBe("No");
  });

  it("aplana arrays y serializa objetos", () => {
    expect(formatCellValue(["a", 2, true])).toBe("a, 2, Sí");
    expect(formatCellValue({ a: 1 })).toBe('{"a":1}');
  });

  it("deja pasar números y strings", () => {
    expect(formatCellValue(42)).toBe("42");
    expect(formatCellValue("texto")).toBe("texto");
  });
});

describe("fechas", () => {
  it("devuelve guion si no hay valor", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDateTime(undefined)).toBe("—");
  });

  it("formatea ISO válido sin lanzar", () => {
    expect(formatDate("2026-09-28T12:00:00Z").length).toBeGreaterThan(0);
  });
});

describe("listas", () => {
  it("parseList limpia y descarta vacíos", () => {
    expect(parseList(" a, b ,, c ")).toEqual(["a", "b", "c"]);
    expect(parseList("")).toEqual([]);
  });

  it("formatList une con coma", () => {
    expect(formatList(["a", "b"])).toBe("a, b");
  });
});

describe("formatNumber", () => {
  it("devuelve un string con los dígitos", () => {
    expect(formatNumber(1234)).toContain("1");
    expect(formatNumber(0)).toBe("0");
  });
});

describe("formatMoney (HU-UI-01)", () => {
  it("usa la moneda del negocio", () => {
    expect(formatMoney(1500, "COP")).toContain("1.500");
    expect(formatMoney(1500, "USD")).toContain("US$");
  });

  it("default COP sin decimales", () => {
    expect(formatMoney(185000)).not.toContain(",");
    expect(formatMoney(185000)).toContain("185.000");
  });

  it("formatCop delega en formatMoney", () => {
    expect(formatCop(200000)).toBe(formatMoney(200000, "COP"));
  });
});
