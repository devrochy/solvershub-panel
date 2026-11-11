import { describe, expect, it } from "vitest";

import type { Me } from "@/lib/api/types";
import {
  TIPOS_DE_EVENTO,
  TIPO_EVENTO,
  accionesDeDispositivo,
  contextoDeAcciones,
  cuentasSinEquipo,
  cuerpoDeAccion,
  hayCambios,
  mensajeDeAccionRechazada,
  nombreDelEquipo,
  restringeAlDueno,
  rolDelDispositivo,
  type DispositivoAcceso,
} from "./seguridad";

const dispositivo = (parcial: Partial<DispositivoAcceso> = {}): DispositivoAcceso => ({
  id: "d-1",
  cuenta: { id: "a-1", nombre: "Ana", email: "ana@x.co", rol: "colaborador" },
  device_id_corto: "ab12cd",
  device_label: null,
  plataforma: "android",
  estado: "activo",
  origen: "autoregistro",
  rol_al_registrar: "colaborador",
  bloqueo_equipo: false,
  legacy: false,
  ultimo_uso_at: null,
  ultima_ip: null,
  aprobado_at: null,
  bloqueado_at: null,
  motivo: null,
  created_at: "2026-10-30T10:00:00Z",
  ...parcial,
});

const negocio = (role: string) => ({ id: "t", name: "T", role, active: true });

const me = (parcial: Partial<Me> = {}): Me =>
  ({
    admin_id: "yo",
    email: "yo@x.co",
    username: null,
    role: "admin",
    tenant: negocio("owner"),
    tenant_count: 1,
    permissions: {},
    invitaciones_pendientes: 0,
    ...parcial,
  }) as Me;

const dueno = contextoDeAcciones(me());
const colaboradorConEscritura = contextoDeAcciones(
  me({ tenant: negocio("colaborador"), permissions: { devices: "write" } }),
);

describe("contextoDeAcciones", () => {
  it("el dueño, el master y el tester escriben; un colaborador solo con la sección en escritura", () => {
    expect(dueno).toMatchObject({ puedeEscribir: true, esDuenoOMaster: true, miAdminId: "yo" });
    expect(contextoDeAcciones(me({ role: "master", tenant: null }))).toMatchObject({ esDuenoOMaster: true });
    expect(contextoDeAcciones(me({ role: "tester" }))).toMatchObject({ esDuenoOMaster: true });
    expect(colaboradorConEscritura).toMatchObject({ puedeEscribir: true, esDuenoOMaster: false });
    const soloLectura = contextoDeAcciones(
      me({ tenant: negocio("colaborador"), permissions: { devices: "read" } }),
    );
    expect(soloLectura.puedeEscribir).toBe(false);
    expect(contextoDeAcciones(null).puedeEscribir).toBe(false);
  });
});

describe("accionesDeDispositivo", () => {
  it("ofrece solo lo que la API acepta según el estado", () => {
    expect(accionesDeDispositivo(dispositivo({ estado: "pendiente" }), dueno)).toEqual(["aprobar", "dar_de_baja"]);
    expect(accionesDeDispositivo(dispositivo({ estado: "activo" }), dueno)).toEqual(["bloquear", "dar_de_baja"]);
    // Un bloqueado no se da de baja: con la política abierta el bloqueo se evaporaría.
    expect(accionesDeDispositivo(dispositivo({ estado: "bloqueado" }), dueno)).toEqual(["reactivar"]);
  });

  it("nadie aprueba ni reactiva su propio equipo", () => {
    const propio = { cuenta: { id: "yo", nombre: null, email: "yo@x.co", rol: "owner" as const } };
    expect(accionesDeDispositivo(dispositivo({ ...propio, estado: "pendiente" }), dueno)).toEqual(["dar_de_baja"]);
    expect(accionesDeDispositivo(dispositivo({ ...propio, estado: "bloqueado" }), dueno)).toEqual([]);
  });

  it("los equipos de un dueño solo los gestiona un dueño o el master", () => {
    const deDueno = dispositivo({ cuenta: { id: "o-1", nombre: null, email: "o@x.co", rol: "owner" } });
    expect(accionesDeDispositivo(deDueno, colaboradorConEscritura)).toEqual([]);
    expect(accionesDeDispositivo(deDueno, dueno)).toEqual(["bloquear", "dar_de_baja"]);
  });

  it("sin escritura no hay acciones", () => {
    expect(accionesDeDispositivo(dispositivo(), contextoDeAcciones(null))).toEqual([]);
  });
});

describe("cuerpoDeAccion", () => {
  it("manda el estado que se veía en todas las acciones", () => {
    const d = dispositivo({ estado: "pendiente" });
    expect(cuerpoDeAccion("aprobar", d)).toEqual({ esperado: "pendiente" });
    expect(cuerpoDeAccion("reactivar", dispositivo({ estado: "bloqueado" }))).toEqual({ esperado: "bloqueado" });
    expect(cuerpoDeAccion("dar_de_baja", d)).toEqual({ esperado: "pendiente" });
  });

  it("bloquear lleva alcance (cuenta por defecto) y el motivo solo si lo hay", () => {
    const d = dispositivo();
    expect(cuerpoDeAccion("bloquear", d)).toEqual({ esperado: "activo", alcance: "cuenta" });
    expect(cuerpoDeAccion("bloquear", d, { alcance: "equipo", motivo: "  perdido  " })).toEqual({
      esperado: "activo",
      alcance: "equipo",
      motivo: "perdido",
    });
    expect(cuerpoDeAccion("bloquear", d, { motivo: "   " })).toEqual({ esperado: "activo", alcance: "cuenta" });
  });
});

describe("textos", () => {
  it("explica el 409 de estado desactualizado y deja pasar el mensaje de la API", () => {
    expect(mensajeDeAccionRechazada(409, "estado_desactualizado", "x")).toMatch(/cambió mientras lo mirabas/);
    expect(mensajeDeAccionRechazada(403, "forbidden", "Sin permiso.")).toBe("Sin permiso.");
    expect(mensajeDeAccionRechazada(500, undefined, undefined)).toMatch(/Inténtalo de nuevo/);
  });

  it("tiene etiqueta en español para cada tipo de evento", () => {
    expect(TIPOS_DE_EVENTO).toHaveLength(12);
    for (const tipo of TIPOS_DE_EVENTO) expect(TIPO_EVENTO[tipo]).not.toMatch(/_/);
  });

  it("nombra el equipo y el rol sin enums crudos", () => {
    expect(nombreDelEquipo({ device_label: " Celular de Ana ", plataforma: "android", legacy: false })).toBe("Celular de Ana");
    expect(nombreDelEquipo({ device_label: null, plataforma: "ios", legacy: false })).toBe("iPhone");
    expect(nombreDelEquipo({ device_label: null, plataforma: "android", legacy: true })).toBe("Equipo del registro anterior");
    expect(rolDelDispositivo(dispositivo({ rol_al_registrar: "gestor" }))).toBe("Gestor");
    expect(rolDelDispositivo(dispositivo({ rol_al_registrar: null }))).toBe("Colaborador");
  });
});

describe("política", () => {
  const abierta = { owner: "abierto", colaborador: "abierto", gestor: "restringido" } as const;

  it("avisa solo al pasar al dueño a restringido", () => {
    expect(restringeAlDueno(abierta, { ...abierta, owner: "restringido" })).toBe(true);
    expect(restringeAlDueno({ ...abierta, owner: "restringido" }, { ...abierta, owner: "restringido" })).toBe(false);
    expect(restringeAlDueno(abierta, { ...abierta, colaborador: "restringido" })).toBe(false);
  });

  it("detecta cambios por rol", () => {
    expect(hayCambios(abierta, { ...abierta })).toBe(false);
    expect(hayCambios(abierta, { ...abierta, gestor: "abierto" })).toBe(true);
  });

  it("lee las cuentas sin equipo del 409 y descarta lo mal formado", () => {
    expect(cuentasSinEquipo({ cuentas: [{ id: "1", email: "a@x.co" }, { id: 2 }, null] })).toEqual([{ id: "1", email: "a@x.co" }]);
    expect(cuentasSinEquipo(null)).toEqual([]);
    expect(cuentasSinEquipo({ cuentas: "x" })).toEqual([]);
  });
});

describe("en palabras (SEG)", () => {
  const ahora = new Date("2026-11-11T12:00:00Z");

  it("el equipo dice qué es y qué pasó con él", async () => {
    const { lineaDelEquipo, equipoEnPalabras } = await import("./seguridad");
    expect(equipoEnPalabras(dispositivo({ device_label: "Pixel 8" }))).toBe("Pixel 8 · Android");
    expect(equipoEnPalabras(dispositivo({ device_label: "iPhone 12", plataforma: "ios" }))).toBe("iPhone 12");
    expect(lineaDelEquipo(dispositivo({ device_label: "Pixel 8", ultimo_uso_at: "2026-11-11T10:00:00Z" }), ahora)).toBe(
      "Pixel 8 · Android · usado hace 2 h",
    );
    expect(lineaDelEquipo(dispositivo({ estado: "pendiente", created_at: "2026-11-11T11:00:00Z" }), ahora)).toBe(
      "Android · pidió entrar hace 1 h",
    );
    expect(
      lineaDelEquipo(dispositivo({ estado: "bloqueado", bloqueado_at: "2026-10-29", motivo: "Equipo perdido", bloqueo_equipo: true }), ahora),
    ).toBe("Android · bloqueado para todas las cuentas el 29 de oct. · Equipo perdido");
  });

  it("cada alerta es una frase y su segunda línea dice desde dónde y cuándo", async () => {
    const { fraseDeEvento, lineaDeEvento } = await import("./seguridad");
    const cuenta = { id: "a-1", nombre: "Ana", email: "ana@x.co", rol: "colaborador" as const };
    expect(fraseDeEvento({ tipo: "dispositivo_bloqueado_usado", cuenta, detalle: null })).toBe("Un equipo bloqueado de Ana intentó entrar");
    expect(fraseDeEvento({ tipo: "login_fallido", cuenta: null, detalle: { repeticiones_previas: 2 } })).toBe(
      "3 intentos fallidos de entrar con una cuenta que no existe",
    );
    expect(fraseDeEvento({ tipo: "login_fallido", cuenta, detalle: null })).toBe("Un intento fallido de entrar con la cuenta de Ana");
    // Cada tipo tiene su frase.
    for (const tipo of TIPOS_DE_EVENTO) expect(fraseDeEvento({ tipo, cuenta, detalle: null })).toBeTruthy();
    expect(lineaDeEvento({ canal: "campo", device_id_corto: "ab", ip: "1.2.3.4", occurred_at: "2026-11-11T11:00:00Z" }, ahora)).toBe(
      "App de campo · IP 1.2.3.4 · hace 1 h",
    );
  });

  it("la política en una línea", async () => {
    const { resumenDePolitica } = await import("./seguridad");
    expect(resumenDePolitica({ owner: "abierto", colaborador: "abierto", gestor: "restringido" })).toBe(
      "Gestores: necesitan tu aprobación · Dueño y colaboradores: entran sin aprobación",
    );
    expect(resumenDePolitica({ owner: "restringido", colaborador: "abierto", gestor: "abierto" })).toBe(
      "Dueño: necesita tu aprobación · Colaboradores y gestores: entran sin aprobación",
    );
  });

  it("una alerta se une a su equipo por cuenta e identificador", async () => {
    const { equipoDelEvento } = await import("./seguridad");
    const equipos = [dispositivo({ id: "d-1" }), dispositivo({ id: "d-2", device_id_corto: "zz99" })];
    expect(equipoDelEvento({ cuenta: { id: "a-1", nombre: null, email: "ana@x.co", rol: "colaborador" }, device_id_corto: "zz99" }, equipos)?.id).toBe("d-2");
    expect(equipoDelEvento({ cuenta: null, device_id_corto: null }, equipos)).toBeUndefined();
  });
});
