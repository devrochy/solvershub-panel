import { describe, expect, it } from "vitest";

import {
  cuerpoDelAviso,
  mensajeDeErrorAlRetirar,
  mensajeDeErrorAviso,
  mostrarEnFicha,
  puedeActivar,
  puedeRetirarDatos,
  type ConsentimientoDatos,
} from "@/lib/aviso-datos";

const base: ConsentimientoDatos = { aviso_activo: true, estado: "sin_aviso", historial: [] };

describe("aviso de datos", () => {
  it("al activar manda la confirmación legal; al apagar nunca la manda", () => {
    expect(cuerpoDelAviso(true, "  Hola  ", true)).toEqual({ activo: true, texto: "Hola", confirmo_revision_legal: true });
    expect(cuerpoDelAviso(false, "Hola", true)).toEqual({ activo: false, texto: "Hola", confirmo_revision_legal: false });
  });

  it("no se puede activar sin confirmar la revisión legal", () => {
    expect(puedeActivar("Texto", false, false)).toBe(false);
    expect(puedeActivar("Texto", true, false)).toBe(true);
    expect(puedeActivar("", true, false)).toBe(false);
    expect(puedeActivar("", true, true)).toBe(true); // borrador del sistema
  });

  it("la ficha solo muestra el bloque con el aviso activo o con historia", () => {
    expect(mostrarEnFicha(null)).toBe(false);
    expect(mostrarEnFicha({ ...base, aviso_activo: false })).toBe(false);
    expect(mostrarEnFicha(base)).toBe(true);
    const fila = { estado: "otorgado" as const, origen: "aviso_en_chat", version_aviso: "v", evidencia: "", quien: "el cliente", created_at: "2026-10-28T10:00:00Z" };
    expect(mostrarEnFicha({ aviso_activo: false, estado: "otorgado", historial: [fila] })).toBe(true);
  });

  it("solo se retiran los datos de quien no los había retirado ya", () => {
    expect(puedeRetirarDatos(null)).toBe(false);
    expect(puedeRetirarDatos(base)).toBe(true);
    expect(puedeRetirarDatos({ ...base, estado: "revocado" })).toBe(false);
  });

  it("explica los errores sin mostrar detalles técnicos", () => {
    expect(mensajeDeErrorAviso(403)).toMatch(/permiso/);
    expect(mensajeDeErrorAviso(422, "Para activar el aviso confirma que el texto fue revisado legalmente.")).toMatch(/revisado/);
    expect(mensajeDeErrorAviso(500)).toBe("No se pudo guardar el aviso.");
    expect(mensajeDeErrorAlRetirar(403)).toMatch(/propietario/);
    expect(mensajeDeErrorAlRetirar(500)).toBe("No se pudieron retirar los datos.");
  });
});
