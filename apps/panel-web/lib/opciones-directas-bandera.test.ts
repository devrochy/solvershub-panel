import { describe, expect, it } from "vitest";

import {
  confirmarApagar,
  confirmarEncender,
  cuerpoValido,
  enlaceAlInterruptor,
  esMasterDePlataforma,
  esReintentable,
  mensajeDeError,
} from "@/lib/opciones-directas-bandera";
import { me } from "@/lib/testing/fixtures";

const comoMaster = { ...me, role: "master" };

describe("interruptor de plantillas con opciones: lógica pura (SPEC-40, PR 10b)", () => {
  it("el cuerpo es exactamente {habilitada: boolean}", () => {
    expect(cuerpoValido({ habilitada: true })).toEqual({ habilitada: true });
    expect(cuerpoValido({ habilitada: false })).toEqual({ habilitada: false });
    expect(cuerpoValido({ habilitada: "si" })).toBeNull();
    expect(cuerpoValido({ habilitada: 1 })).toBeNull();
    expect(cuerpoValido({})).toBeNull();
    expect(cuerpoValido({ habilitada: true, tenant_id: "otro" })).toBeNull();
    expect(cuerpoValido(null)).toBeNull();
    expect(cuerpoValido([true])).toBeNull();
  });

  it("solo el master es admin de plataforma (ni dueño, ni colaborador, ni tester)", () => {
    expect(esMasterDePlataforma(comoMaster)).toBe(true);
    for (const role of ["owner", "agent", "admin", "tester"]) expect(esMasterDePlataforma({ role }), role).toBe(false);
  });

  it("el enlace del estado vacío lleva a Tenants con el negocio actual, solo para el master", () => {
    const href = enlaceAlInterruptor(comoMaster)!;
    const url = new URL(href, "http://panel.test");
    expect(url.pathname).toBe("/tenants");
    expect(url.searchParams.get("abrir")).toBe(me.tenant!.id);
    expect(url.searchParams.get("q")).toBe(me.tenant!.name);
    for (const role of ["owner", "agent", "tester"]) expect(enlaceAlInterruptor({ ...me, role }), role).toBeNull();
    expect(enlaceAlInterruptor({ ...comoMaster, tenant: null })).toBeNull();
  });

  it("sin nombre de negocio no manda `q` (no filtra la lista)", () => {
    const href = enlaceAlInterruptor({ ...comoMaster, tenant: { ...me.tenant!, name: "" } })!;
    expect(new URL(href, "http://panel.test").searchParams.has("q")).toBe(false);
  });

  it("los errores se explican sin jerga y solo los de red se reintentan", () => {
    expect(mensajeDeError(403)).toMatch(/solo el admin de plataforma/);
    expect(mensajeDeError(404)).toMatch(/No encontramos este negocio/);
    expect(mensajeDeError(0)).toMatch(/No se pudo contactar el servidor/);
    expect(mensajeDeError(502)).toBe(mensajeDeError(0));
    for (const s of [401, 403, 404]) expect(esReintentable(s), String(s)).toBe(false);
    for (const s of [0, 500, 502]) expect(esReintentable(s), String(s)).toBe(true);
  });

  it("al encender la confirmación dice qué habilita, que es para negocios de prueba y cómo se apaga", () => {
    const c = confirmarEncender("Café Aurora");
    expect(c.title).toContain("Café Aurora");
    expect(c.description).toMatch(/editor de plantillas con opciones/);
    expect(c.description).toMatch(/herramienta de envío para los agentes/);
    expect(c.description).toMatch(/sin pasar por el asistente \(sin LLM\)/);
    expect(c.description).toMatch(/solo en negocios de prueba hasta cerrar la prueba real de Meta/);
    expect(c.description).toMatch(/Para apagarlas, vuelve a este interruptor/);
    expect(c.destructive).toBe(false);
  });

  it("al apagar avisa que los botones ya enviados dejan de ejecutar", () => {
    const c = confirmarApagar("Café Aurora");
    expect(c.description).toMatch(/botones que ya se enviaron dejan de ejecutar/);
    expect(c.destructive).toBe(false);
  });
});
