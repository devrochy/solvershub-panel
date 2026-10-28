import { describe, expect, it } from "vitest";

import {
  contadorPendientes,
  formatCellValue,
  formatCop,
  formatDate,
  formatDateTime,
  formatHoraChat,
  formatList,
  formatMoney,
  formatNumber,
  parseList,
  textoPendientes,
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

describe("formatHoraChat (HU-UX-15)", () => {
  const ahora = new Date(2026, 9, 19, 18, 0);
  it("de hoy muestra la hora y de otro día la fecha", () => {
    expect(formatHoraChat(new Date(2026, 9, 19, 9, 5), ahora)).toMatch(/9:05/);
    expect(formatHoraChat(new Date(2026, 9, 18, 9, 5), ahora)).toMatch(/18\/10\/(20)?26/);
    expect(formatHoraChat(null, ahora)).toBe("");
  });
});

describe("pendientes de respuesta", () => {
  it("la píldora usa el número y tope 99+", () => {
    expect(contadorPendientes(0)).toBe("0");
    expect(contadorPendientes(7)).toBe("7");
    expect(contadorPendientes(100)).toBe("99+");
  });

  it("el texto accesible concuerda en singular y plural", () => {
    expect(textoPendientes(1)).toBe("1 mensaje sin responder");
    expect(textoPendientes(3)).toBe("3 mensajes sin responder");
    expect(textoPendientes(100)).toBe("Más de 99 mensajes sin responder");
  });
});
