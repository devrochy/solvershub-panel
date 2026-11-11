import { describe, expect, it } from "vitest";

import {
  archivadosAlFinal,
  consistencia,
  estaArchivado,
  estadoDeTarea,
  filtrosDe,
  dondeAtiende,
  estadoDeConversacion,
  hrefDeAgente,
  nombreDeEtapa,
  nombreDeProcedimiento,
  papelDelAgente,
  respuestas,
  PESTANAS,
  PESTANAS_SIN_FILTROS,
  pestanaValida,
  puedeArchivar,
  puedeEditarAgentes,
  queryDeApi,
  refValido,
  tieneConexiones,
  tieneSuperpoderes,
  tipoDeRegistro,
  ubicacionDe,
  VISTAS_DE_ACTIVIDAD,
} from "@/lib/agentes";

const ID = "3f1c2a4b-1111-4222-8333-944455556666";

describe("pestañas de la ficha del agente (HU-UX-09, AGT-04)", () => {
  it("son cuatro y Actividad agrupa conversaciones, tareas, clientes y registros", () => {
    expect(PESTANAS.map((p) => p.label)).toEqual(["Actividad", "Lo que sabe", "Dónde atiende", "Consumo"]);
    expect(VISTAS_DE_ACTIVIDAD.map((v) => v.label)).toEqual(["Conversaciones", "Tareas", "Clientes", "Registros"]);
    expect([...PESTANAS_SIN_FILTROS].sort()).toEqual(["atiende", "sabe"]);
  });

  it("los enlaces de antes siguen abriendo su lugar", () => {
    expect(ubicacionDe({})).toEqual({ tab: "actividad", ver: "conversaciones", probar: false });
    expect(ubicacionDe({ tab: "tareas" })).toEqual({ tab: "actividad", ver: "tareas", probar: false });
    expect(ubicacionDe({ tab: "registros" })).toEqual({ tab: "actividad", ver: "registros", probar: false });
    expect(ubicacionDe({ tab: "conocimiento" }).tab).toBe("sabe");
    expect(ubicacionDe({ tab: "superpoderes" }).tab).toBe("sabe");
    expect(ubicacionDe({ tab: "conexiones" }).tab).toBe("atiende");
    expect(ubicacionDe({ tab: "probar" })).toEqual({ tab: "actividad", ver: "conversaciones", probar: true });
    expect(ubicacionDe({ tab: "consumo" }).tab).toBe("consumo");
    expect(ubicacionDe({ tab: "actividad", ver: "clientes" }).ver).toBe("clientes");
    expect(ubicacionDe({ tab: "otra", ver: "otra" })).toEqual({ tab: "actividad", ver: "conversaciones", probar: false });
  });

  it("Superpoderes solo para especialistas con id; Conexiones para cualquier agente real", () => {
    expect(tieneSuperpoderes({ id: ID, kind: "specialist" })).toBe(true);
    expect(tieneSuperpoderes({ id: ID, kind: "backoffice" })).toBe(false);
    expect(tieneSuperpoderes({ id: null, kind: "specialist" })).toBe(false);
    expect(tieneConexiones({ id: ID })).toBe(true);
    expect(tieneConexiones({ id: null })).toBe(false);
  });
});

describe("sección Agentes (HU-AOS-47)", () => {
  it("acepta solo un id o `general` como ref", () => {
    expect(refValido("general")).toBe("general");
    expect(refValido(ID.toUpperCase())).toBe(ID);
    expect(refValido("ventas")).toBeNull();
    expect(refValido(undefined)).toBeNull();
  });

  it("normaliza filtros de la URL", () => {
    expect(filtrosDe({})).toEqual({ dias: 30, conexion: null, pagina: 1, estado: null });
    expect(filtrosDe({ dias: "7", conexion: ID, page: "3", estado: "closed" })).toEqual({
      dias: 7,
      conexion: ID,
      pagina: 3,
      estado: "closed",
    });
    expect(filtrosDe({ dias: "999", conexion: "x' or 1", page: "-1", estado: "raro" })).toEqual({
      dias: 30,
      conexion: null,
      pagina: 1,
      estado: null,
    });
    expect(pestanaValida("consumo")).toBe("consumo");
    expect(pestanaValida("otra")).toBe("actividad");
  });

  it("arma la query de la API con el período", () => {
    const ahora = new Date("2026-10-18T12:00:00Z");
    const qs = new URLSearchParams(queryDeApi({ dias: 7, conexion: ID, pagina: 2, estado: "open" }, ahora));
    expect(qs.get("desde")).toBe("2026-10-11T12:00:00.000Z");
    expect(qs.get("connection_id")).toBe(ID);
    expect(qs.get("page")).toBe("2");
    expect(qs.get("state")).toBe("open");
    expect(new URLSearchParams(queryDeApi({ dias: 30, conexion: null, pagina: 1, estado: null }, ahora, false)).has("page")).toBe(false);
  });

  it("conserva los filtros al cambiar de pestaña y vuelve a la página 1", () => {
    const actual = { tab: "actividad" as const, ver: "conversaciones" as const, dias: 7, conexion: ID, pagina: 4, estado: null };
    expect(hrefDeAgente("general", actual, { ver: "tareas" })).toBe(`/agentes/general?ver=tareas&dias=7&conexion=${ID}`);
    expect(hrefDeAgente("general", actual, { tab: "consumo" })).toBe(`/agentes/general?tab=consumo&dias=7&conexion=${ID}`);
    expect(hrefDeAgente("general", actual, { page: 5 })).toBe(`/agentes/general?dias=7&conexion=${ID}&page=5`);
    expect(hrefDeAgente("general", actual, { conexion: null })).toBe("/agentes/general?dias=7");
    expect(hrefDeAgente("general", { ...actual, ver: "tareas" }, { estado: "open" })).toBe(`/agentes/general?ver=tareas&dias=7&conexion=${ID}&estado=open`);
  });

  it("traduce estados, tipos y procedimientos", () => {
    expect(estadoDeTarea("escalated")).toBe("Pasó a una persona");
    expect(estadoDeTarea("nuevo")).toBe("Otro estado");
    expect(tipoDeRegistro("promesa")).toBe("Promesa de pago");
    expect(tipoDeRegistro("reserva_mesa")).toBe("reserva mesa");
    expect(nombreDeProcedimiento("comercio.agendar_cita")).toBe("Agendar cita");
    expect(nombreDeEtapa("confirmar_direccion")).toBe("Confirmar dirección");
    expect(nombreDeEtapa("informacion_de_envio")).toBe("Información de envío");
    expect(nombreDeEtapa("fin")).toBe("Terminó");
    expect(estadoDeConversacion("escalated")).toEqual({ label: "Pasó a una persona", tono: "warning" });
    expect(estadoDeConversacion("raro")).toBeNull();
    expect(respuestas(1)).toBe("1 respuesta");
  });

  it("calcula pass^k y su tendencia", () => {
    expect(consistencia([])).toEqual({ actual: null, k: null, delta: null });
    expect(consistencia([{ pass_k: 0.9, k: 4 }, { pass_k: 0.85, k: 4 }])).toEqual({ actual: 90, k: 4, delta: 5 });
  });

  it("muestra el editor solo a quien puede escribir", () => {
    expect(puedeEditarAgentes({ role: "master" }, "legacy")).toBe(true);
    expect(puedeEditarAgentes({ role: "colaborador", permissions: { settings: "write" } }, "v3")).toBe(true);
    expect(puedeEditarAgentes({ role: "colaborador", permissions: { settings: "write" } }, "legacy")).toBe(false);
    expect(puedeEditarAgentes({ role: "colaborador", permissions: { settings: "read" } }, "v3")).toBe(false);
  });
});

describe("archivar agentes", () => {
  it("el General, el Coordinador y el General virtual no se archivan", () => {
    expect(puedeArchivar({ id: ID, key: "general" })).toBe(false);
    expect(puedeArchivar({ id: ID, key: "coordinador" })).toBe(false);
    expect(puedeArchivar({ id: null, key: "general", virtual: true })).toBe(false);
    expect(puedeArchivar({ id: ID, key: "ventas" })).toBe(true);
  });

  it("los archivados van al final sin reordenar el resto", () => {
    const lista = [
      { key: "a", status: "archived" },
      { key: "b", status: "active" },
      { key: "c", status: "archived" },
      { key: "d", status: "active" },
    ];
    expect(archivadosAlFinal(lista).map((a) => a.key)).toEqual(["b", "d", "a", "c"]);
    expect(estaArchivado({ status: "archived" })).toBe(true);
    expect(estaArchivado({ status: "active" })).toBe(false);
  });
});

describe("lista de agentes en palabras (AGT-01)", () => {
  it("el General coordina; los demás dicen su propósito", () => {
    expect(papelDelAgente({ key: "general", kind: "specialist" })).toBe("Coordina a los demás y responde lo que nadie más sabe");
    expect(papelDelAgente({ key: "coordinador", kind: "core" })).toBe("Reparte cada conversación al agente que sabe");
    expect(papelDelAgente({ key: "ventas", kind: "specialist" }, "Toma pedidos")).toBe("Toma pedidos");
    expect(papelDelAgente({ key: "ventas", kind: "specialist" }, "  ")).toBe("Especialista");
  });

  it("dice dónde atiende", () => {
    expect(dondeAtiende([])).toBe("Todavía no está en ninguna conexión");
    expect(dondeAtiende([{ label: "Chat de la tienda" }])).toBe("Atiende en Chat de la tienda");
    expect(dondeAtiende([{ label: "a" }, { label: "b" }, { label: "c" }])).toBe("Atiende en 3 conexiones");
  });
});
