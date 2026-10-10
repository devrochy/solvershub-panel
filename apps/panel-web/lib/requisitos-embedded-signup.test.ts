import { describe, expect, it } from "vitest";

import { resumenRevision } from "./requisitos-embedded-signup";

const base = { finished_at: null, ok: false, pending: [] as string[], expired: false, expires_at: null };
const DIA = 24 * 60 * 60 * 1000;
const hace = (dias: number) => new Date(Date.now() - dias * DIA).toISOString();

describe("requisitos de Embedded Signup: revisión de la plataforma", () => {
  it("pide revisar si nunca se revisó o si falló", () => {
    expect(resumenRevision({ ...base, status: "never" })).toMatch(/Todavía no/);
    expect(resumenRevision({ ...base, status: "failed" })).toMatch(/falló/);
  });

  it("avisa que está en curso", () => {
    expect(resumenRevision({ ...base, status: "running" })).toMatch(/en curso/);
  });

  it("distingue verde de pendientes en una corrida terminada", () => {
    expect(resumenRevision({ ...base, status: "done", ok: true })).toMatch(/en verde/);
    expect(resumenRevision({ ...base, status: "done", pending: ["Webhook"] })).toMatch(/pendientes/);
  });

  it("una revisión de hace 29 días sigue en verde", () => {
    const texto = resumenRevision({ ...base, status: "done", ok: true, finished_at: hace(29), expires_at: hace(-1) });
    expect(texto).toMatch(/en verde/);
  });

  it("una revisión de hace 31 días venció: pide correrla de nuevo, con su fecha", () => {
    const texto = resumenRevision({ ...base, status: "done", expired: true, finished_at: hace(31), expires_at: hace(1) });
    expect(texto).toMatch(/venció \(.+\)/);
    expect(texto).toMatch(/de nuevo en App de Meta/);
    expect(texto).not.toMatch(/en verde/);
  });
});
