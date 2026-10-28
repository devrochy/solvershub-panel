import { describe, expect, it } from "vitest";

import { mensajeAcceso } from "./acceso-dueno";

const base = { tipo: "enlace", expires_at: "2026-11-03T15:00:00Z" } as const;

describe("mensajeAcceso (ADR-0175)", () => {
  it("con enlace enviado dice cuándo vence", () => {
    const m = mensajeAcceso({ ...base, estado: "enviado" });
    expect(m.tono).toBe("ok");
    expect(m.texto).toContain("Negocio creado.");
    expect(m.texto).toContain("03/11/2026");
  });

  it("invitación en la app no promete un enlace", () => {
    const m = mensajeAcceso({ estado: "enviado", tipo: "app", expires_at: null });
    expect(m.texto).toContain("acepte la invitación");
    expect(m.texto).not.toContain("enlace");
  });

  it("si el correo no salió avisa y manda a reenviar, sin ocultar que el negocio se creó", () => {
    for (const estado of ["sin_smtp", "fallido"] as const) {
      const m = mensajeAcceso({ ...base, estado });
      expect(m.tono).toBe("aviso");
      expect(m.texto).toContain("Negocio creado.");
      expect(m.texto).toContain("Reenviar acceso");
    }
  });

  it("al reenviar no repite «Negocio creado» ni manda a reenviar de nuevo", () => {
    const m = mensajeAcceso({ ...base, estado: "fallido" }, { reenvio: true });
    expect(m.texto).not.toContain("Negocio creado");
    expect(m.texto).not.toContain("Reenviar acceso");
    expect(mensajeAcceso({ ...base, estado: "enviado" }, { reenvio: true }).texto).not.toContain("Negocio creado");
  });

  it("doble envío y cuenta ya miembro", () => {
    expect(mensajeAcceso({ ...base, estado: "ya_emitida" }).tono).toBe("ok");
    expect(mensajeAcceso({ estado: "ya_es_miembro", tipo: "app", expires_at: null }).texto).toContain("ya es parte");
  });
});
