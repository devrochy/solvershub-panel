import { describe, expect, it } from "vitest";

import { nivelAlcanza, nivelDeSesion, type SesionAyuda } from "@/lib/ayuda/acceso";

const sesion = (extra: Partial<SesionAyuda> = {}): SesionAyuda => ({
  role: "agent",
  tenant: { id: "t1", name: "Negocio", role: "agent", active: true },
  permissions: { dashboard: "read", conversations: "write" },
  ...extra,
});

describe("nivelDeSesion", () => {
  it("un colaborador sin permisos de Equipo ni Configuración es «usuario»", () => {
    expect(nivelDeSesion(sesion())).toBe("usuario");
  });

  it("el dueño del negocio es «administrador»", () => {
    expect(nivelDeSesion(sesion({ tenant: { id: "t1", name: "N", role: "owner", active: true } }))).toBe("administrador");
  });

  it("un colaborador con Equipo o con Configuración es «administrador»", () => {
    expect(nivelDeSesion(sesion({ permissions: { collaborators: "read" } }))).toBe("administrador");
    expect(nivelDeSesion(sesion({ permissions: { settings: "write" } }))).toBe("administrador");
  });

  it("un permiso en null no cuenta (presencia = puede ver)", () => {
    expect(nivelDeSesion(sesion({ permissions: { settings: null, collaborators: null } }))).toBe("usuario");
  });

  it("master y tester son «tecnico», con o sin negocio", () => {
    expect(nivelDeSesion(sesion({ role: "master", tenant: null }))).toBe("tecnico");
    expect(nivelDeSesion(sesion({ role: "tester" }))).toBe("tecnico");
  });

  it("sin negocio ni permisos queda en «usuario»", () => {
    expect(nivelDeSesion(sesion({ tenant: null, permissions: {} }))).toBe("usuario");
  });
});

describe("nivelAlcanza", () => {
  it("cada nivel ve el suyo y los inferiores", () => {
    expect(nivelAlcanza("usuario", "usuario")).toBe(true);
    expect(nivelAlcanza("usuario", "administrador")).toBe(false);
    expect(nivelAlcanza("usuario", "tecnico")).toBe(false);
    expect(nivelAlcanza("administrador", "usuario")).toBe(true);
    expect(nivelAlcanza("administrador", "administrador")).toBe(true);
    expect(nivelAlcanza("administrador", "tecnico")).toBe(false);
    expect(nivelAlcanza("tecnico", "tecnico")).toBe(true);
  });

  it("un `acceso` desconocido no lo ve nadie", () => {
    expect(nivelAlcanza("tecnico", "secreto")).toBe(false);
    expect(nivelAlcanza("tecnico", "")).toBe(false);
  });
});
