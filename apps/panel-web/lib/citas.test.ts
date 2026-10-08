import { describe, expect, it } from "vitest";

import { enlaceValido, mensajeAsistencia, puedeMarcarAsistencia } from "@/lib/citas";

const AHORA = new Date("2026-10-08T15:00:00-05:00");

describe("asistencia (HU-SH-02)", () => {
  it("solo citas que ya terminaron", () => {
    const pasada = { kind: "appointment", status: "scheduled", end: "2026-10-08T14:00:00-05:00" };
    const futura = { ...pasada, end: "2026-10-08T16:00:00-05:00" };
    expect(puedeMarcarAsistencia(pasada, AHORA)).toBe(true);
    expect(puedeMarcarAsistencia(futura, AHORA)).toBe(false);
  });

  it("no en bloqueos ni en canceladas", () => {
    const base = { end: "2026-10-08T14:00:00-05:00" };
    expect(puedeMarcarAsistencia({ ...base, kind: "block", status: "scheduled" }, AHORA)).toBe(false);
    expect(puedeMarcarAsistencia({ ...base, kind: "appointment", status: "cancelled" }, AHORA)).toBe(false);
    expect(puedeMarcarAsistencia({ ...base, kind: "appointment", status: "no_asistio" }, AHORA)).toBe(true);
  });

  it("el mensaje dice que se ofreció reagendar", () => {
    expect(mensajeAsistencia(false)).toContain("reagendar");
  });

  it("enlace de reunión", () => {
    expect(enlaceValido("")).toBe(true);
    expect(enlaceValido("https://meet.google.com/abc")).toBe(true);
    expect(enlaceValido("meet.google.com/abc")).toBe(false);
  });
});
