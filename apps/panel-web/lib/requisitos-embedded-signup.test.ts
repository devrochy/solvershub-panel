import { describe, expect, it } from "vitest";

import { resumenRevision } from "./requisitos-embedded-signup";

const base = { finished_at: null, ok: false, pending: [] as string[] };

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
});
