import { describe, expect, it } from "vitest";

import {
  agruparPorModulo,
  alPorDefecto,
  cambiosFrenteAPorDefecto,
  conCuantoPregunta,
  cuantoPreguntaActual,
  opcionesDeCuantoPregunta,
  pistaDePiso,
  resumenDeCuantoPregunta,
  tipoDelAgente,
  type PoliticaDatos,
  cambiosDeAccion,
  conNivel,
  cuerpoParaGuardar,
  estaAjustada,
  estadoInicial,
  hayCambios,
  mensajeDeErrorAlGuardar,
  nombreModulo,
  pistaDePorDefecto,
  puedeEditarDatosCliente,
  restablecida,
} from "@/lib/datos-cliente";
import { politicaDatosCliente, politicaDatosCliente as politica } from "@/lib/testing/fixtures";

describe("estado y cambios", () => {
  it("parte de los niveles que trae el servidor, sin cambios", () => {
    const estado = estadoInicial(politica);
    expect(estado["ventas.crear_pedido"]).toEqual({ nombre: "requerido", direccion: "recomendado" });
    expect(hayCambios(politica, estado)).toBe(false);
  });

  it("cambia el nivel de un dato ajustable y lo cuenta como cambio sin guardar", () => {
    const estado = conNivel(politica, estadoInicial(politica), "ventas.crear_pedido", "nombre", "no_pedir");
    expect(estado["ventas.crear_pedido"].nombre).toBe("no_pedir");
    expect(hayCambios(politica, estado)).toBe(true);
    expect(cambiosDeAccion(politica, estado, "ventas.crear_pedido")).toBe(1);
    expect(cambiosDeAccion(politica, estado, "agenda.agendar_cita")).toBe(0);
  });

  it("no deja cambiar lo que exige el sistema ni datos que no existen", () => {
    const inicial = estadoInicial(politica);
    expect(conNivel(politica, inicial, "agenda.agendar_cita", "correo", "no_pedir")).toBe(inicial);
    expect(conNivel(politica, inicial, "agenda.agendar_cita", "otro", "no_pedir")).toBe(inicial);
    expect(conNivel(politica, inicial, "no.existe", "nombre", "no_pedir")).toBe(inicial);
  });

  it("restablecer deja los valores por defecto sin tocar lo que no es ajustable", () => {
    const estado = restablecida(politica, estadoInicial(politica), "ventas.crear_pedido");
    expect(estado["ventas.crear_pedido"]).toEqual({ nombre: "requerido", direccion: "requerido" });
    expect(estaAjustada(politica, estadoInicial(politica), "ventas.crear_pedido")).toBe(true);
    expect(estaAjustada(politica, estado, "ventas.crear_pedido")).toBe(false);
    expect(estaAjustada(politica, estadoInicial(politica), "agenda.agendar_cita")).toBe(false);
    expect(restablecida(politica, estadoInicial(politica), "agenda.agendar_cita")["agenda.agendar_cita"].correo).toBe("requerido");
  });
});

describe("cuerpo del PUT", () => {
  it("manda todas las acciones, solo con lo que difiere del valor por defecto", () => {
    expect(cuerpoParaGuardar(politica, estadoInicial(politica))).toEqual({
      politica: { "ventas.crear_pedido": { direccion: "recomendado" }, "agenda.agendar_cita": {} },
    });
  });

  it("una acción restablecida va vacía y los datos del sistema nunca se envían", () => {
    let estado = restablecida(politica, estadoInicial(politica), "ventas.crear_pedido");
    estado = conNivel(politica, estado, "agenda.agendar_cita", "nombre", "recomendado");
    const { politica: cuerpo } = cuerpoParaGuardar(politica, estado);
    expect(cuerpo["ventas.crear_pedido"]).toEqual({});
    expect(cuerpo["agenda.agendar_cita"]).toEqual({ nombre: "recomendado" });
    expect(JSON.stringify(cuerpo)).not.toContain("correo");
  });
});

describe("textos y agrupación", () => {
  it("nombra los módulos de forma legible", () => {
    expect(nombreModulo("ventas")).toBe("Ventas");
    expect(nombreModulo("suscripciones")).toBe("Suscripciones");
    expect(nombreModulo("cobranza")).toBe("Cobranza");
    expect(nombreModulo("pack_nuevo")).toBe("Pack nuevo");
    expect(nombreModulo("")).toBe("Otros");
  });

  it("agrupa por módulo conservando el orden", () => {
    const acciones = [
      ...politica.acciones,
      { id: "ventas.cotizar", modulo: "ventas", etiqueta: "Cotizar", campos: [] },
    ];
    const grupos = agruparPorModulo(acciones);
    expect(grupos.map((g) => [g.nombre, g.acciones.map((a) => a.id)])).toEqual([
      ["Ventas", ["ventas.crear_pedido", "ventas.cotizar"]],
      ["Agenda", ["agenda.agendar_cita"]],
    ]);
  });

  it("la pista del valor por defecto solo aparece cuando difiere", () => {
    const direccion = politica.acciones[0].campos[1];
    expect(pistaDePorDefecto(direccion, "recomendado")).toBe("Por defecto: Requerido.");
    expect(pistaDePorDefecto(direccion, "requerido")).toBeNull();
  });

  it("solo el master o quien tiene Configuración en escritura puede guardar", () => {
    expect(puedeEditarDatosCliente({ role: "master", permissions: {} })).toBe(true);
    expect(puedeEditarDatosCliente({ role: "owner", permissions: { settings: "write" } })).toBe(true);
    expect(puedeEditarDatosCliente({ role: "owner", permissions: { settings: "read" } })).toBe(false);
    expect(puedeEditarDatosCliente(null)).toBe(false);
  });

  it("explica los errores al guardar sin jerga", () => {
    expect(mensajeDeErrorAlGuardar(403)).toMatch(/permiso/);
    expect(mensajeDeErrorAlGuardar(422)).toMatch(/Recarga/);
    expect(mensajeDeErrorAlGuardar(500, "Falló.")).toBe("Falló.");
    expect(mensajeDeErrorAlGuardar(500)).toMatch(/No se pudieron guardar/);
  });
});

// HU-AOS-85: «Cuánto pregunta» (Lo mínimo, Lo justo, Completo). «Lo justo» = `por_defecto` de cada dato.

const politicaCita: PoliticaDatos = {
  ...politicaDatosCliente,
  acciones: [
    {
      id: "agenda.agendar_cita",
      modulo: "agenda",
      etiqueta: "Agendar una cita",
      campos: [
        { clave: "nombre", etiqueta: "Nombre completo", nivel: "requerido", por_defecto: "requerido", ajustable: true, ajustado: false },
        { clave: "correo", etiqueta: "Correo", nivel: "requerido", por_defecto: "requerido", ajustable: false, ajustado: false },
        { clave: "fecha", etiqueta: "Fecha del evento", nivel: "recomendado", por_defecto: "recomendado", ajustable: true, ajustado: false },
        { clave: "invitados", etiqueta: "Número de invitados", nivel: "no_pedir", por_defecto: "no_pedir", ajustable: true, ajustado: false },
      ],
    },
  ],
};
const CITA = "agenda.agendar_cita";

describe("Cuánto pregunta", () => {
  it("«Lo justo» coincide dato por dato con el por_defecto y viene elegido", () => {
    const estado = estadoInicial(politicaCita);
    expect(cuantoPreguntaActual(politicaCita, estado)).toBe("justo");
    const justo = conCuantoPregunta(politicaCita, conCuantoPregunta(politicaCita, estado, "completo"), "justo");
    for (const campo of politicaCita.acciones[0].campos) expect(justo[CITA][campo.clave]).toBe(campo.por_defecto);
    expect(cambiosFrenteAPorDefecto(politicaCita, estado)).toBe(0);
  });

  it("«Completo» sube a requerido los ajustables y «Usar lo recomendado» los devuelve", () => {
    const completo = conCuantoPregunta(politicaCita, estadoInicial(politicaCita), "completo");
    expect(completo[CITA]).toEqual({ nombre: "requerido", correo: "requerido", fecha: "requerido", invitados: "requerido" });
    expect(cuantoPreguntaActual(politicaCita, completo)).toBe("completo");
    expect(cambiosFrenteAPorDefecto(politicaCita, completo)).toBe(2);
    const vuelta = alPorDefecto(politicaCita, completo);
    expect(vuelta).toEqual(estadoInicial(politicaCita));
    expect(cambiosFrenteAPorDefecto(politicaCita, vuelta)).toBe(0);
  });

  it("«Lo mínimo» deja lo requerido por defecto y los pisos técnicos, que nunca bajan", () => {
    const minimo = conCuantoPregunta(politicaCita, estadoInicial(politicaCita), "minimo");
    expect(minimo[CITA]).toEqual({ nombre: "requerido", correo: "requerido", fecha: "no_pedir", invitados: "no_pedir" });
    // Bajar un piso técnico a mano tampoco cambia nada.
    expect(conNivel(politicaCita, minimo, CITA, "correo", "no_pedir")[CITA].correo).toBe("requerido");
    // El piso no viaja al backend (lo rechaza con 422).
    expect(cuerpoParaGuardar(politicaCita, minimo).politica[CITA]).toEqual({ fecha: "no_pedir" });
  });

  it("un ajuste a mano no es ningún nivel; los niveles que no separan nada no se ofrecen", () => {
    const amano = conNivel(politicaCita, estadoInicial(politicaCita), CITA, "invitados", "recomendado");
    expect(cuantoPreguntaActual(politicaCita, amano)).toBeNull();
    expect(opcionesDeCuantoPregunta(politicaCita)).toEqual(["minimo", "justo", "completo"]);
    // En el fixture todo es requerido por defecto: solo queda «Lo justo».
    expect(opcionesDeCuantoPregunta(politicaDatosCliente)).toEqual(["justo"]);
  });

  it("resume qué pide cada nivel y explica los pisos técnicos", () => {
    expect(resumenDeCuantoPregunta(politicaCita, "minimo")).toBe("Pide nombre completo y correo.");
    expect(resumenDeCuantoPregunta(politicaCita, "completo")).toBe("Pide nombre completo, correo, fecha del evento y 1 más.");
    expect(pistaDePiso({ etiqueta: "Agendar una cita" })).toBe("Necesario para agendar una cita.");
  });

  it("el tipo del chat sale de la key o del módulo de sus operaciones", () => {
    expect(tipoDelAgente("ventas", null)).toBe("ventas");
    expect(tipoDelAgente("mi_agente", politicaCita)).toBe("agenda");
    expect(tipoDelAgente("mi_agente", { ...politicaCita, acciones: [] })).toBeNull();
  });
});
