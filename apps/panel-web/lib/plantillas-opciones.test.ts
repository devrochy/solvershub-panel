import { describe, expect, it } from "vitest";

import type { OpcionesDefinicion, OpcionesHallazgo } from "@/lib/api/types";
import {
  agruparHallazgos,
  apuntaA,
  claveDeIdempotencia,
  claveDesdeNombre,
  confirmacionFija,
  contar,
  definicionVacia,
  esBanderaApagada,
  esLimiteDePlantillas,
  esSinCambios,
  hallazgosDe,
  hallazgosSinCampo,
  hayErrores,
  idNuevo,
  insertarEn,
  leerError,
  mensajeDeEnvio,
  moverOpcion,
  opcionNueva,
  puedeEscribirOpciones,
  resumenDePrueba,
  sePuedePublicar,
  sinArgumento,
  sincronizarVariables,
  sinVacios,
  variablesDelCuerpo,
} from "@/lib/plantillas-opciones";

const h = (path: string, severity: "error" | "warning" = "error", code = "x"): OpcionesHallazgo => ({ path, code, severity, mensaje: `m ${path}` });

describe("definición", () => {
  it("nace con una opción en blanco y el id estable", () => {
    const d = definicionVacia();
    expect(d.opciones).toHaveLength(1);
    expect(d.opciones[0]).toMatchObject({ id: "op1", titulo: "", accion: { tool: "", confirmar: false } });
  });

  it("el id nuevo no reutiliza uno borrado y respeta los existentes", () => {
    expect(idNuevo([])).toBe("op1");
    expect(idNuevo(["op1", "op3"])).toBe("op4");
    expect(idNuevo(["a", "b"])).toBe("op3");
    expect(opcionNueva([{ id: "op1" }, { id: "op2" }]).id).toBe("op3");
  });

  it("las variables salen del cuerpo, sin repetir y solo las válidas", () => {
    expect(variablesDelCuerpo("Hola {cliente.nombre}, de {negocio.nombre}. {cliente.nombre} {Mal} {}")).toEqual([
      "cliente.nombre",
      "negocio.nombre",
    ]);
  });

  it("sincroniza `variables` con el cuerpo y conserva la referencia si no cambia", () => {
    const base: OpcionesDefinicion = { ...definicionVacia(), body: "Hola {cliente.nombre}" };
    const sync = sincronizarVariables(base);
    expect(sync.variables).toEqual(["cliente.nombre"]);
    expect(sincronizarVariables(sync)).toBe(sync);
    expect(sincronizarVariables({ ...sync, body: "sin variables" }).variables).toEqual([]);
  });

  it("inserta una variable en el cursor", () => {
    expect(insertarEn("Hola ", "{cliente.nombre}")).toEqual({ valor: "Hola {cliente.nombre}", cursor: 21 });
    expect(insertarEn("Hola !", "{a}", 5, 5)).toEqual({ valor: "Hola {a}!", cursor: 8 });
    expect(insertarEn("Hola XX!", "{a}", 5, 7).valor).toBe("Hola {a}!");
  });

  it("reordena sin perder ni duplicar opciones", () => {
    expect(moverOpcion(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
    expect(moverOpcion(["a", "b", "c"], 2, 1)).toEqual(["a", "c", "b"]);
    expect(moverOpcion(["a", "b"], 0, 5)).toEqual(["a", "b"]);
  });

  it("cuenta como el backend: un emoji es un carácter", () => {
    expect(contar("Sí 👍")).toBe(4);
    expect("Sí 👍".length).toBe(5);
  });

  it("la confirmación queda fija si la tool es sensible o la exige", () => {
    expect(confirmacionFija({ sensible: true, confirmacion_obligatoria: true })).toBe(true);
    expect(confirmacionFija({ sensible: false, confirmacion_obligatoria: true })).toBe(true);
    expect(confirmacionFija({ sensible: false, confirmacion_obligatoria: false })).toBe(false);
    expect(confirmacionFija(undefined)).toBe(false);
  });

  it("un argumento no queda a la vez como fijo y de contexto", () => {
    const a = sinArgumento({ args_fijos: { x: 1, y: 2 }, args_contexto: { x: "cliente.nombre" } }, "x");
    expect(a).toEqual({ args_fijos: { y: 2 }, args_contexto: {} });
  });

  it("quita los vacíos de los argumentos", () => {
    expect(sinVacios({ a: "", b: "x", c: { d: "", e: null }, f: [], g: NaN, h: 0, i: false })).toEqual({ b: "x", h: 0, i: false });
    expect(sinVacios("")).toBeUndefined();
  });

  it("la clave sale del nombre en el formato del backend", () => {
    expect(claveDesdeNombre("Confirmar cita ¡Hoy!")).toBe("confirmar_cita_hoy");
    expect(claveDesdeNombre("Reagendar — Niño")).toBe("reagendar_nino");
    expect(claveDesdeNombre("a".repeat(60))).toHaveLength(40);
    expect(claveDesdeNombre("???")).toBe("");
  });

  it("la clave de idempotencia cumple 8 a 64 caracteres y cambia en cada intento", () => {
    const a = claveDeIdempotencia();
    expect(a.length).toBeGreaterThanOrEqual(8);
    expect(a.length).toBeLessThanOrEqual(64);
    expect(claveDeIdempotencia()).not.toBe(a);
  });

  it("solo se publica lo que tiene cambios o aún no se publicó", () => {
    expect(sePuedePublicar({ estado: "draft", tiene_borrador_sin_publicar: true })).toBe(true);
    expect(sePuedePublicar({ estado: "retired", tiene_borrador_sin_publicar: false })).toBe(true);
    expect(sePuedePublicar({ estado: "published", tiene_borrador_sin_publicar: false })).toBe(false);
    expect(sePuedePublicar({ estado: "published", tiene_borrador_sin_publicar: true })).toBe(true);
  });
});

describe("hallazgos por campo", () => {
  it("un path apunta a sí mismo y a lo que cuelga de él, no a hermanos", () => {
    expect(apuntaA("opciones[1].accion.tool", "opciones[1]")).toBe(true);
    expect(apuntaA("opciones[1].accion.tool", "opciones[1].accion")).toBe(true);
    expect(apuntaA("opciones[10].titulo", "opciones[1]")).toBe(false);
    expect(apuntaA("opciones[1].accion.args_fijos.monto", "opciones[1].accion.args_fijos.monto")).toBe(true);
    expect(apuntaA("opciones[1].accion.args_fijos.monto_total", "opciones[1].accion.args_fijos.monto")).toBe(false);
    expect(apuntaA("variables[0]", "variables")).toBe(true);
  });

  it("junta los hallazgos del campo, con los errores primero", () => {
    const todos = [h("opciones[0].titulo", "warning"), h("opciones[0].titulo"), h("opciones[1].titulo"), h("body")];
    expect(hallazgosDe(todos, "opciones[0].titulo").map((x) => x.severity)).toEqual(["error", "warning"]);
    expect(hallazgosDe(todos, "opciones[0].accion.args_fijos.a", "opciones[0].accion.args_contexto.a")).toEqual([]);
  });

  it("reparte los hallazgos por zona y deja lo desconocido como general", () => {
    const g = agruparHallazgos([
      h("body"),
      h("footer"),
      h("ttl_horas"),
      h("variables[0]"),
      h("variables", "warning"),
      h("opciones"),
      h("opciones[2].titulo"),
      h("opciones[2].accion.args_fijos.monto"),
      h("opciones[0].id"),
      h("definicion"),
    ]);
    expect(g.cuerpo).toHaveLength(1);
    expect(g.pie).toHaveLength(1);
    expect(g.vigencia).toHaveLength(1);
    expect(g.variables).toHaveLength(2);
    expect(g.lista).toHaveLength(1);
    expect(g.porOpcion.get(2)).toHaveLength(2);
    expect(g.porOpcion.get(0)).toHaveLength(1);
    expect(g.general.map((x) => x.path)).toEqual(["definicion"]);
  });

  it("separa los hallazgos que ningún campo pintado consume", () => {
    const sobrantes = hallazgosSinCampo([h("opciones[0].titulo"), h("opciones[0].accion.args_fijos.raro")], ["opciones[0].titulo"]);
    expect(sobrantes.map((x) => x.path)).toEqual(["opciones[0].accion.args_fijos.raro"]);
  });

  it("solo un error bloquea; un aviso no", () => {
    expect(hayErrores([h("body", "warning")])).toBe(false);
    expect(hayErrores([h("body", "warning"), h("footer")])).toBe(true);
    expect(hayErrores([])).toBe(false);
  });
});

describe("errores de la API", () => {
  it("lee el error aplanado del BFF con sus hallazgos", () => {
    const e = leerError(422, {
      error: "La definición tiene errores.",
      code: "definicion_con_errores",
      details: { hallazgos: [h("body"), { path: 1 }, "no"] },
    });
    expect(e).toMatchObject({ status: 422, mensaje: "La definición tiene errores.", code: "definicion_con_errores" });
    expect(e.hallazgos).toEqual([h("body")]);
  });

  it("lee también el sobre crudo de la API", () => {
    const e = leerError(409, { error: { code: "sin_plantilla", message: "No hay plantilla.", details: { motivo: "plantilla_no_aprobada" } } });
    expect(e).toMatchObject({ code: "sin_plantilla", mensaje: "No hay plantilla.", motivo: "plantilla_no_aprobada", hallazgos: [] });
  });

  it("no lanza con un cuerpo roto y da un mensaje", () => {
    expect(leerError(500, null).mensaje).toMatch(/no se pudo/i);
    expect(leerError(502, "texto").hallazgos).toEqual([]);
  });

  it("reconoce la bandera apagada, el sin cambios y el límite", () => {
    expect(esBanderaApagada({ status: 404, code: "opciones_directas_no_habilitadas" })).toBe(true);
    expect(esBanderaApagada({ status: 404, code: "not_found" })).toBe(false);
    expect(esSinCambios({ status: 409, code: "sin_cambios" })).toBe(true);
    expect(esSinCambios({ status: 422, code: "sin_cambios" })).toBe(false);
    expect(esLimiteDePlantillas({ status: 409, code: "limite_de_plantillas" })).toBe(true);
  });

  it("explica cada fallo de enviar prueba con qué hacer", () => {
    const e = (status: number, code: string, motivo?: string) => ({ status, code, mensaje: "x", hallazgos: [], ...(motivo ? { motivo } : {}) });
    expect(mensajeDeEnvio(e(404, "conversacion_no_encontrada"))).toMatch(/Elige otra/);
    expect(mensajeDeEnvio(e(404, "not_found"))).toMatch(/ya no existe/);
    expect(mensajeDeEnvio(e(409, "no_publicada"))).toMatch(/Publica la plantilla/);
    expect(mensajeDeEnvio(e(409, "sin_plantilla", "plantilla_no_aprobada"))).toMatch(/más de 24 horas.*no está aprobada|todavía no está aprobada/);
    expect(mensajeDeEnvio(e(409, "pausada"))).toMatch(/en pausa/);
    expect(mensajeDeEnvio(e(502, "no_se_pudo_enviar"))).toMatch(/problema del canal/);
    expect(mensajeDeEnvio({ status: 0, mensaje: "No se pudo contactar el servidor.", hallazgos: [] })).toBe("No se pudo contactar el servidor.");
  });

  it("dice por qué vía salió la prueba", () => {
    const base = { ya_enviado: false, ejecucion_directa: true, degradado: false };
    expect(resumenDePrueba({ ...base, via: "interactivo" })).toMatch(/interactivo/);
    expect(resumenDePrueba({ ...base, via: "plantilla" })).toMatch(/plantilla de Meta/);
    expect(resumenDePrueba({ ...base, via: "texto", ejecucion_directa: false, degradado: true })).toMatch(/no ejecuta nada.*degradó/);
    expect(resumenDePrueba({ ...base, via: null, ya_enviado: true })).toMatch(/ya se había enviado/);
  });
});

describe("permisos", () => {
  const sesion = (role: string, tenantRole: string, connections: string | undefined) =>
    ({ role, tenant: { id: "t", name: "N", role: tenantRole, active: true }, permissions: connections ? { connections } : {} }) as Parameters<typeof puedeEscribirOpciones>[0];

  it("escribe el propietario y el master con Conexiones en escritura; el resto lee", () => {
    expect(puedeEscribirOpciones(sesion("owner", "owner", "write"))).toBe(true);
    expect(puedeEscribirOpciones(sesion("master", "agent", "write"))).toBe(true);
    expect(puedeEscribirOpciones(sesion("agent", "agent", "write"))).toBe(false);
    expect(puedeEscribirOpciones(sesion("owner", "owner", "read"))).toBe(false);
    expect(puedeEscribirOpciones(sesion("owner", "owner", undefined))).toBe(false);
  });
});
