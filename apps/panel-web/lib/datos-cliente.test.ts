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
  cambiosDeLaEstacion3,
  conMetodo,
  datosRecomendadosEnLaRuta,
  NIVELES_EN_LA_RUTA,
  operacionesEnLaRuta,
  preguntaPorEntregas,
  resumenDeOperacion,
  type MetodoEntrega,
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

// ------------------------------------------------------------------ estación 3 de la ruta (HU-UX-29)

const campo = (clave: string, etiqueta: string, nivel: "requerido" | "recomendado" | "no_pedir", ajustable = true) => ({
  clave,
  etiqueta,
  nivel,
  por_defecto: nivel,
  ajustable,
  ajustado: false,
});

/** Las dos entregas de Comercio (`pack_commerce/datos.py`) y una operación de otro módulo. */
const deVentas: PoliticaDatos = {
  agente_id: "22222222-2222-2222-2222-222222222222",
  niveles: ["requerido", "recomendado", "no_pedir"],
  herramientas_del_agente: false,
  metodos_entrega: ["domicilio", "recoger_en_tienda"],
  procedimientos: [],
  acciones: [
    {
      id: "ventas.pedido_domicilio",
      modulo: "ventas",
      etiqueta: "Pedido a domicilio",
      campos: [campo("name", "Nombre completo", "requerido"), campo("address", "Dirección", "requerido", false), campo("email", "Correo", "no_pedir")],
    },
    {
      id: "ventas.pedido_retiro",
      modulo: "ventas",
      etiqueta: "Pedido para recoger en tienda",
      campos: [campo("name", "Nombre completo", "requerido"), campo("email", "Correo", "recomendado")],
    },
    {
      id: "suscripciones.inscribirse",
      modulo: "suscripciones",
      etiqueta: "Inscribirse a un plan",
      campos: [campo("name", "Nombre completo", "requerido")],
    },
  ],
};

describe("preguntas de la estación 3 (HU-UX-29)", () => {
  it("una pregunta por entrega encendida, con el nombre de la entrega, y una por cada otra operación", () => {
    expect(operacionesEnLaRuta(deVentas, ["domicilio", "recoger_en_tienda"]).map((o) => o.titulo)).toEqual([
      "A domicilio · ¿Qué datos pide?",
      "Recoger en tienda · ¿Qué datos pide?",
      "¿Qué datos pide para inscribirse a un plan?",
    ]);
    const soloRetiro = operacionesEnLaRuta(deVentas, ["recoger_en_tienda"]);
    expect(soloRetiro.map((o) => o.accion.id)).toEqual(["ventas.pedido_retiro", "suscripciones.inscribirse"]);
    expect(soloRetiro[0].entrega).toBe("recoger_en_tienda");
    expect(soloRetiro[1].entrega).toBeNull();
  });

  it("en Agenda la pregunta habla de la cita y no hay pregunta de entregas", () => {
    expect(operacionesEnLaRuta(politica, []).map((o) => o.titulo)).toEqual([
      "¿Qué datos pide para crear un pedido?",
      "¿Qué datos pide para agendar una cita?",
    ]);
    expect(preguntaPorEntregas(politica)).toBe(false);
    expect(preguntaPorEntregas(deVentas)).toBe(true);
  });

  it("los niveles se ven como Siempre, Si se puede y No, en el orden de requerido, recomendado y no_pedir", () => {
    expect(NIVELES_EN_LA_RUTA.map((n) => [n.id, n.etiqueta])).toEqual([
      ["requerido", "Siempre"],
      ["recomendado", "Si se puede"],
      ["no_pedir", "No"],
    ]);
  });

  it("en la ruta se pueden desmarcar todas las entregas; en Personalizar la última no se apaga", () => {
    expect(conMetodo(["recoger_en_tienda"], "domicilio", true)).toEqual(["domicilio", "recoger_en_tienda"]);
    expect(conMetodo(["domicilio", "recoger_en_tienda"], "domicilio", false, true)).toEqual(["recoger_en_tienda"]);
    expect(conMetodo(["recoger_en_tienda"], "recoger_en_tienda", false, true)).toEqual([]);
    expect(conMetodo(["recoger_en_tienda"], "recoger_en_tienda", false)).toEqual(["recoger_en_tienda"]);
  });

  it("resume lo que pide siempre y lo que pide si se puede", () => {
    const estado = estadoInicial(deVentas);
    expect(resumenDeOperacion(deVentas.acciones[0], estado)).toBe("Siempre: nombre completo y dirección");
    expect(resumenDeOperacion(deVentas.acciones[1], estado)).toBe("Siempre: nombre completo · Si se puede: correo");
    const sinNada = conNivel(deVentas, estado, "suscripciones.inscribirse", "name", "no_pedir");
    expect(resumenDeOperacion(deVentas.acciones[2], sinNada)).toBe("No pide datos");
  });

  it("apagar una entrega conserva su política: sigue en el PUT con lo ajustado", () => {
    const ajustado = conNivel(deVentas, estadoInicial(deVentas), "ventas.pedido_domicilio", "email", "recomendado");
    // Apagar «A domicilio» quita su pregunta, pero no toca el estado.
    expect(operacionesEnLaRuta(deVentas, ["recoger_en_tienda"]).some((o) => o.accion.id === "ventas.pedido_domicilio")).toBe(false);
    expect(cuerpoParaGuardar(deVentas, ajustado).politica["ventas.pedido_domicilio"]).toEqual({ email: "recomendado" });
  });

  it("cuenta los cambios de lo visible, las entregas y la memoria; una entrega apagada no cuenta sus datos", () => {
    const recomendado = { metodos: ["domicilio", "recoger_en_tienda"] as MetodoEntrega[], herramientas: false };
    const inicial = estadoInicial(deVentas);
    expect(cambiosDeLaEstacion3(deVentas, inicial, recomendado.metodos, false, recomendado)).toBe(0);
    const ajustado = conNivel(deVentas, inicial, "ventas.pedido_domicilio", "email", "recomendado");
    expect(cambiosDeLaEstacion3(deVentas, ajustado, recomendado.metodos, false, recomendado)).toBe(1);
    // Sin domicilio: cuenta la entrega apagada, no su dato.
    expect(cambiosDeLaEstacion3(deVentas, ajustado, ["recoger_en_tienda"], false, recomendado)).toBe(1);
    expect(cambiosDeLaEstacion3(deVentas, ajustado, ["recoger_en_tienda"], true, recomendado)).toBe(2);
  });

  it("«Usar lo recomendado» deja lo visible en su valor por defecto y conserva lo de la entrega apagada", () => {
    let estado = conNivel(deVentas, estadoInicial(deVentas), "ventas.pedido_domicilio", "email", "recomendado");
    estado = conNivel(deVentas, estado, "ventas.pedido_retiro", "email", "no_pedir");
    const conTodo = datosRecomendadosEnLaRuta(deVentas, estado, ["domicilio", "recoger_en_tienda"]);
    expect(conTodo["ventas.pedido_domicilio"].email).toBe("no_pedir");
    expect(conTodo["ventas.pedido_retiro"].email).toBe("recomendado");
    const soloRetiro = datosRecomendadosEnLaRuta(deVentas, estado, ["recoger_en_tienda"]);
    expect(soloRetiro["ventas.pedido_domicilio"].email).toBe("recomendado");
    expect(soloRetiro["ventas.pedido_retiro"].email).toBe("recomendado");
  });
});
