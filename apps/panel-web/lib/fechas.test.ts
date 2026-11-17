import { describe, expect, it } from "vitest";

import {
  formatFecha,
  formatFechaHora,
  formatFechaHoraTecnica,
  formatFechaLarga,
  formatHora,
  formatRelativo,
} from "@/lib/fechas";

describe("formatFecha", () => {
  it("una fecha-solo no se desplaza de día", () => {
    expect(formatFecha("2026-11-16", "America/Bogota")).toBe("16/11/2026");
    expect(formatFecha("2026-11-16", "Pacific/Kiritimati")).toBe("16/11/2026");
  });

  it("un instante se pinta en la zona del negocio", () => {
    // 2026-11-16T01:30Z = 15 de noviembre, 20:30 en Bogotá.
    expect(formatFecha("2026-11-16T01:30:00Z", "America/Bogota")).toBe("15/11/2026");
    expect(formatFecha("2026-11-16T01:30:00Z", "UTC")).toBe("16/11/2026");
  });

  it("vacío es guion", () => {
    expect(formatFecha(null)).toBe("—");
    expect(formatFecha("no-es-fecha")).toBe("—");
  });
});

describe("formatFechaHora", () => {
  it("convierte el instante a la zona del negocio en 24 h", () => {
    expect(formatFechaHora("2026-11-16T13:23:00Z", "America/Bogota")).toBe("16/11/2026 08:23");
    expect(formatFechaHora("2026-11-16T13:23:00Z", "Europe/Madrid")).toBe("16/11/2026 14:23");
  });

  it("una fecha-solo se muestra como fecha", () => {
    expect(formatFechaHora("2026-11-16", "America/Bogota")).toBe("16/11/2026");
  });

  it("una zona inválida cae a la del negocio por defecto", () => {
    expect(formatFechaHora("2026-11-16T13:23:00Z", "No/Existe")).toBe("16/11/2026 08:23");
  });
});

describe("formatFechaLarga", () => {
  it("usa el formato largo en español", () => {
    expect(formatFechaLarga("2026-11-16T13:23:00Z", "America/Bogota")).toBe("16 de noviembre de 2026");
    expect(formatFechaLarga("2026-11-16T13:23:00Z", "America/Bogota", true)).toBe(
      "16 de noviembre de 2026, 08:23",
    );
  });
});

describe("formatHora y técnico", () => {
  it("hora local y UTC", () => {
    expect(formatHora("2026-11-16T13:23:00Z", "America/Bogota")).toBe("08:23");
    expect(formatHora("2026-11-16T13:23:00Z", "UTC")).toBe("13:23");
    expect(formatFechaHoraTecnica("2026-11-16T13:23:00Z", "America/Bogota")).toBe(
      "16/11/2026 08:23 (13:23 UTC)",
    );
  });
});

describe("formatRelativo", () => {
  const ahora = new Date("2026-11-16T13:23:00Z");

  it("duraciones en español", () => {
    expect(formatRelativo("2026-11-16T13:18:00Z", ahora)).toContain("5");
    expect(formatRelativo("2026-11-16T15:23:00Z", ahora)).toContain("2");
  });
});
