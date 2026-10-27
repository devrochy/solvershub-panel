// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { EditorDePlantilla } from "@/app/(app)/plantillas-opciones/_components/editor";
import { FormularioArgumentos } from "@/app/(app)/plantillas-opciones/_components/formulario-argumentos";
import { FeedbackProviders } from "@/components/ui/providers";
import type {
  OpcionesAccion,
  OpcionesAccionDelCatalogo,
  OpcionesDefinicion,
  OpcionesHallazgo,
  OpcionesPlantilla,
  OpcionesVariable,
  OpcionesVistaPrevia,
} from "@/lib/api/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/plantillas-opciones/confirmar_cita",
  useSearchParams: () => new URLSearchParams(),
}));

const VARIABLES: OpcionesVariable[] = [
  { ruta: "cliente.nombre", descripcion: "Nombre del cliente", origen: "conversacion" },
  { ruta: "negocio.nombre", descripcion: "Nombre del negocio", origen: "conversacion" },
];

const CONFIRMAR_CITA: OpcionesAccionDelCatalogo = {
  tool: "confirmar_cita",
  descripcion: "Confirma la cita del cliente",
  parameters: {
    type: "object",
    properties: { motivo: { type: "string", title: "Motivo" }, minutos: { type: "integer", title: "Minutos de aviso" } },
    required: ["motivo"],
  },
  sensible: false,
  confirmacion_obligatoria: false,
};
const COBRAR: OpcionesAccionDelCatalogo = {
  tool: "crear_link_de_pago",
  descripcion: "Crea un link de pago",
  parameters: { type: "object", properties: { monto: { type: "number", title: "Monto" } } },
  sensible: true,
  confirmacion_obligatoria: true,
};
const ACCIONES = [CONFIRMAR_CITA, COBRAR];

const DEFINICION: OpcionesDefinicion = {
  body: "Hola {cliente.nombre}, ¿confirmas tu cita?",
  footer: null,
  variables: ["cliente.nombre"],
  exclusivo: true,
  ttl_horas: 24,
  opciones: [
    {
      id: "op1",
      titulo: "Sí, confirmo",
      accion: { tool: "confirmar_cita", args_fijos: { motivo: "cliente" }, args_contexto: {}, confirmar: false },
      respuesta_ok: "Listo.",
      respuesta_error: "No pudimos.",
      result_keys: [],
    },
  ],
};

function plantilla(extra: Partial<OpcionesPlantilla> = {}): OpcionesPlantilla {
  return {
    clave: "confirmar_cita",
    nombre: "Confirmar cita",
    estado: "draft",
    version_vigente: null,
    tiene_borrador_sin_publicar: true,
    creada_en: "2026-10-27T10:00:00Z",
    actualizada_en: "2026-10-27T10:00:00Z",
    borrador: DEFINICION,
    definicion_vigente: null,
    versiones: [],
    ...extra,
  };
}

const VISTA: OpcionesVistaPrevia = {
  interactivo: { type: "button", body: "Hola Ana, ¿confirmas tu cita?", buttons: [{ id: "x", title: "Sí, confirmo" }] },
  cabe_en_whatsapp: true,
  componentes_meta: [],
  cuerpo_meta_renderizado: "Hola Ana",
  texto_de_respaldo: "Hola Ana\n\n1. Sí, confirmo",
  hallazgos: [],
};

type Llamada = { metodo: string; ruta: string; cuerpo: unknown };
type Manejador = (llamada: Llamada) => { status: number; cuerpo?: unknown } | undefined;

function error(status: number, code: string, message: string, details?: unknown) {
  return { status, cuerpo: { error: message, code, ...(details ? { details } : {}) } };
}

function simular(manejador: Manejador, opciones: { hallazgos?: OpcionesHallazgo[] } = {}) {
  const llamadas: Llamada[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const llamada: Llamada = {
        metodo: init?.method ?? "GET",
        ruta: new URL(url, "http://panel.test").pathname.replace("/api/", ""),
        cuerpo: init?.body ? JSON.parse(String(init.body)) : undefined,
      };
      llamadas.push(llamada);
      const propia = manejador(llamada);
      const r =
        propia ??
        (llamada.ruta === "plantillas-opciones/validar"
          ? { status: 200, cuerpo: { valida: !(opciones.hallazgos ?? []).some((h) => h.severity === "error"), hallazgos: opciones.hallazgos ?? [] } }
          : llamada.ruta === "plantillas-opciones/vista-previa"
            ? { status: 200, cuerpo: VISTA }
            : { status: 404, cuerpo: { error: "sin simular" } });
      return new Response(r.cuerpo === undefined ? null : JSON.stringify(r.cuerpo), { status: r.status });
    }),
  );
  return llamadas;
}

function pintar(inicial: OpcionesPlantilla = plantilla(), puedeEscribir = true) {
  return render(
    <FeedbackProviders>
      <EditorDePlantilla inicial={inicial} acciones={ACCIONES} variables={VARIABLES} puedeEscribir={puedeEscribir} />
    </FeedbackProviders>,
  );
}

const botonPublicar = () => screen.getByRole("button", { name: "Publicar" }) as HTMLButtonElement;
const esperarValidacion = () => waitFor(() => expect(screen.queryByText("Revisando el borrador…")).toBeNull());

beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("editor · validación en vivo", () => {
  it("muestra cada hallazgo junto al campo de su path y no deja publicar mientras haya errores", async () => {
    simular(() => undefined, {
      hallazgos: [
        { path: "opciones[0].titulo", code: "titulo_largo", severity: "error", mensaje: "El título admite 20 caracteres; tiene 25." },
        { path: "opciones[0].accion.args_fijos.motivo", code: "arg_invalido", severity: "error", mensaje: "«motivo» no es válido." },
        { path: "body", code: "cuerpo_largo", severity: "error", mensaje: "El cuerpo es muy largo." },
        { path: "opciones[0].accion.confirmar", code: "confirmacion_obligatoria", severity: "warning", mensaje: "Pedirá confirmación." },
      ],
    });
    pintar();
    const tarjeta = await screen.findByLabelText("Opción 1");
    await waitFor(() => expect(within(tarjeta).getByText(/admite 20 caracteres/)).toBeTruthy());

    // Cada mensaje cuelga del campo de su path.
    const campoTitulo = within(tarjeta).getByLabelText("Texto del botón");
    expect(campoTitulo.getAttribute("aria-invalid")).toBe("true");
    const motivo = tarjeta.querySelector('[data-argumento="motivo"]') as HTMLElement;
    expect(within(motivo).getByText(/«motivo» no es válido/)).toBeTruthy();
    expect(screen.getByText(/El cuerpo es muy largo/)).toBeTruthy();
    expect(within(tarjeta).getByText(/Pedirá confirmación/)).toBeTruthy();

    await esperarValidacion();
    expect(botonPublicar().disabled).toBe(true);
    expect(screen.getByText("Corrige los errores marcados para poder publicar.")).toBeTruthy();
    // Con errores no hay vista previa nueva: se explica, no se muestra rojo.
    expect(screen.getByText(/Hay errores: se muestra la última vista|Corrige los errores marcados para ver cómo se verá/)).toBeTruthy();
  });

  it("un aviso (warning) no bloquea publicar", async () => {
    simular(() => undefined, {
      hallazgos: [{ path: "variables", code: "variable_sin_usar", severity: "warning", mensaje: "Una variable sin usar." }],
    });
    pintar();
    await esperarValidacion();
    await waitFor(() => expect(botonPublicar().disabled).toBe(false));
  });

  it("la vista previa muestra los botones que armó el backend", async () => {
    simular(() => undefined);
    pintar();
    await waitFor(() => expect(screen.getAllByText("Sí, confirmo").length).toBeGreaterThan(1));
    expect(screen.getByText("Hola Ana, ¿confirmas tu cita?")).toBeTruthy();
  });

  it("con la bandera apagada muestra el estado vacío, sin errores rojos", async () => {
    simular((l) =>
      l.ruta === "plantillas-opciones/validar" ? error(404, "opciones_directas_no_habilitadas", "Las opciones directas no están habilitadas.") : undefined,
    );
    pintar();
    expect(await screen.findByText(/no están activadas en tu negocio/)).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("editor · guardar y publicar", () => {
  it("publicar guarda primero el borrador y después publica", async () => {
    const llamadas = simular((l) => {
      if (l.metodo === "PUT") return { status: 200, cuerpo: plantilla() };
      if (l.ruta === "plantillas-opciones/confirmar_cita/publicar")
        return { status: 201, cuerpo: { clave: "confirmar_cita", version_n: 1, definition_hash: "h", publicada_en: "2026-10-27T10:00:00Z", message_template_id: null, hallazgos: [] } };
      if (l.metodo === "GET") return { status: 200, cuerpo: plantilla({ estado: "published", version_vigente: 1, tiene_borrador_sin_publicar: false }) };
      return undefined;
    });
    pintar();
    await waitFor(() => expect(botonPublicar().disabled).toBe(false));
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Confirmar cita v2" } });
    fireEvent.click(botonPublicar());
    await waitFor(() => expect(screen.getAllByText(/Versión 1 publicada como mensaje interactivo/).length).toBeGreaterThan(0));
    const orden = llamadas.filter((l) => l.metodo !== "POST" || !/validar|vista-previa/.test(l.ruta)).map((l) => `${l.metodo} ${l.ruta}`);
    expect(orden.slice(0, 2)).toEqual(["PUT plantillas-opciones/confirmar_cita/borrador", "POST plantillas-opciones/confirmar_cita/publicar"]);
    const put = llamadas.find((l) => l.metodo === "PUT")!;
    expect(put.cuerpo).toMatchObject({ nombre: "Confirmar cita v2", definicion: { body: DEFINICION.body } });
    await waitFor(() => expect(screen.getByText("Activa")).toBeTruthy());
  });

  it("un 409 sin_cambios al republicar es «ya está publicada», no un error", async () => {
    simular((l) => {
      if (l.metodo === "PUT") return { status: 200, cuerpo: plantilla({ estado: "published", version_vigente: 1 }) };
      if (l.ruta.endsWith("/publicar")) return error(409, "sin_cambios", "El borrador es igual a la versión publicada.");
      if (l.metodo === "GET") return { status: 200, cuerpo: plantilla({ estado: "published", version_vigente: 1, tiene_borrador_sin_publicar: false }) };
      return undefined;
    });
    pintar(plantilla({ estado: "published", version_vigente: 1, definicion_vigente: DEFINICION }));
    await waitFor(() => expect(botonPublicar().disabled).toBe(false));
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Otro nombre" } });
    fireEvent.click(botonPublicar());
    await waitFor(() => expect(screen.getByText(/Ya está publicada: el borrador es igual a la versión vigente/)).toBeTruthy());
    // El aviso es de éxito (role=status), no una alerta de error.
    expect(screen.queryByText("El borrador es igual a la versión publicada.")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("un 422 al publicar pinta los hallazgos de error.details.hallazgos junto a su campo", async () => {
    simular((l) => {
      if (l.metodo === "PUT") return { status: 200, cuerpo: plantilla() };
      if (l.ruta.endsWith("/publicar"))
        return error(422, "definicion_con_errores", "La definición tiene errores.", {
          hallazgos: [{ path: "opciones[0].respuesta_ok", code: "respuesta_vacia", severity: "error", mensaje: "Escribe lo que verá el cliente." }],
        });
      return undefined;
    });
    pintar();
    await waitFor(() => expect(botonPublicar().disabled).toBe(false));
    fireEvent.click(botonPublicar());
    const tarjeta = screen.getByLabelText("Opción 1");
    await waitFor(() => expect(within(tarjeta).getByText("Escribe lo que verá el cliente.")).toBeTruthy());
    expect(screen.getByText("La definición tiene errores.")).toBeTruthy();
  });

  it("sin permiso de escritura es solo lectura: sin acciones y con los campos bloqueados", async () => {
    simular(() => undefined);
    pintar(plantilla({ estado: "published", version_vigente: 1 }), false);
    await esperarValidacion();
    expect(screen.queryByRole("button", { name: "Publicar" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Guardar borrador" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Enviar prueba" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Agregar opción/ })).toBeNull();
    expect(screen.getByText("Solo lectura")).toBeTruthy();
    expect((screen.getByLabelText("Nombre") as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText("Texto del botón") as HTMLInputElement).disabled).toBe(true);
  });

  it("no pasa de 10 opciones ni de 20 caracteres por título", async () => {
    simular(() => undefined);
    const diez = { ...DEFINICION, opciones: Array.from({ length: 10 }, (_, i) => ({ ...DEFINICION.opciones[0], id: `op${i + 1}`, titulo: `Opción ${i + 1}` })) };
    pintar(plantilla({ borrador: diez }));
    expect((await screen.findByRole("button", { name: /Agregar opción/ })) as HTMLButtonElement).toHaveProperty("disabled", true);
    expect(screen.getByText("Llegaste al máximo de 10 opciones.")).toBeTruthy();
    expect(screen.getAllByLabelText("Texto del botón")[0].getAttribute("maxlength")).toBe("20");
  });

  it("reordena las opciones con los botones de subir y bajar", async () => {
    simular(() => undefined);
    const dos = {
      ...DEFINICION,
      opciones: [
        { ...DEFINICION.opciones[0], id: "op1", titulo: "Primera" },
        { ...DEFINICION.opciones[0], id: "op2", titulo: "Segunda" },
      ],
    };
    pintar(plantilla({ borrador: dos }));
    await screen.findByLabelText("Opción 2");
    fireEvent.click(screen.getByRole("button", { name: "Subir la opción 2" }));
    const titulos = () => screen.getAllByLabelText("Texto del botón").map((el) => (el as HTMLInputElement).value);
    expect(titulos()).toEqual(["Segunda", "Primera"]);
    expect(screen.getByText("Cambios sin guardar")).toBeTruthy();
  });

  it("inserta una variable como chip y la declara en el borrador que se guarda", async () => {
    const llamadas = simular((l) => (l.metodo === "PUT" ? { status: 200, cuerpo: plantilla() } : undefined));
    pintar(plantilla({ borrador: { ...DEFINICION, body: "Hola ", variables: [] } }));
    await esperarValidacion();
    fireEvent.click(within(screen.getByRole("group", { name: "Insertar dato del cliente" })).getByRole("button", { name: "Nombre del negocio" }));
    expect((screen.getByLabelText(/^Mensaje/) as HTMLTextAreaElement).value).toBe("Hola {negocio.nombre}");
    fireEvent.click(screen.getByRole("button", { name: "Guardar borrador" }));
    await waitFor(() => expect(llamadas.some((l) => l.metodo === "PUT")).toBe(true));
    expect((llamadas.find((l) => l.metodo === "PUT")!.cuerpo as { definicion: OpcionesDefinicion }).definicion.variables).toEqual(["negocio.nombre"]);
  });
});

describe("editor · enviar prueba", () => {
  const publicada = () => plantilla({ estado: "published", version_vigente: 2, tiene_borrador_sin_publicar: false, definicion_vigente: DEFINICION });
  const CONVERSACIONES = { items: [{ id: "11111111-1111-4111-8111-111111111111", customer_name: "Ana Pérez", external_id: "57300", channel: "whatsapp", status: "open", bot_paused: false, started_at: "2026-10-27T10:00:00Z", last_message: "Hola" }] };

  async function abrirDialogo() {
    fireEvent.click(await screen.findByRole("button", { name: "Enviar prueba" }));
    const dialogo = await screen.findByRole("dialog");
    fireEvent.click(await within(dialogo).findByLabelText(/Ana Pérez/));
    return dialogo;
  }

  it("exige la confirmación explícita antes de enviar un mensaje real", async () => {
    const llamadas = simular((l) => {
      if (l.ruta === "conversations") return { status: 200, cuerpo: CONVERSACIONES };
      if (l.ruta.endsWith("/enviar-prueba"))
        return { status: 200, cuerpo: { enviado: true, ya_enviado: false, via: "plantilla", ejecucion_directa: true, degradado: false, send_id: "s1" } };
      return undefined;
    });
    pintar(publicada());
    const dialogo = await abrirDialogo();
    expect(within(dialogo).getByText("Esto envía un mensaje real a un cliente real.")).toBeTruthy();
    const enviar = within(dialogo).getByRole("button", { name: "Enviar mensaje real" }) as HTMLButtonElement;
    expect(enviar.disabled).toBe(true);
    expect(llamadas.some((l) => l.ruta.endsWith("/enviar-prueba"))).toBe(false);

    fireEvent.click(within(dialogo).getByRole("checkbox", { name: /mensaje real a este cliente/ }));
    expect(enviar.disabled).toBe(false);
    await act(async () => fireEvent.click(enviar));

    await waitFor(() => expect(within(dialogo).getByText(/Salió como plantilla de Meta/)).toBeTruthy());
    const envio = llamadas.find((l) => l.ruta.endsWith("/enviar-prueba"))!;
    expect(envio.cuerpo).toMatchObject({ conversation_id: CONVERSACIONES.items[0].id });
    const clave = (envio.cuerpo as { clave_idempotencia: string }).clave_idempotencia;
    expect(clave.length).toBeGreaterThanOrEqual(8);
    expect(clave.length).toBeLessThanOrEqual(64);
  });

  it("reintentar tras un fallo reutiliza la clave de idempotencia del mismo intento y explica el error", async () => {
    let intentos = 0;
    const llamadas = simular((l) => {
      if (l.ruta === "conversations") return { status: 200, cuerpo: CONVERSACIONES };
      if (l.ruta.endsWith("/enviar-prueba")) {
        intentos += 1;
        return intentos === 1
          ? error(409, "sin_plantilla", "Sin plantilla.", { motivo: "plantilla_no_aprobada" })
          : { status: 200, cuerpo: { enviado: true, ya_enviado: false, via: "interactivo", ejecucion_directa: true, degradado: false, send_id: "s1" } };
      }
      return undefined;
    });
    pintar(publicada());
    const dialogo = await abrirDialogo();
    fireEvent.click(within(dialogo).getByRole("checkbox", { name: /mensaje real/ }));
    const enviar = within(dialogo).getByRole("button", { name: "Enviar mensaje real" });
    await act(async () => fireEvent.click(enviar));
    await waitFor(() => expect(within(dialogo).getByRole("alert").textContent).toMatch(/más de 24 horas.*todavía no está aprobada/));
    await act(async () => fireEvent.click(enviar));
    await waitFor(() => expect(within(dialogo).getByText(/Salió como mensaje interactivo/)).toBeTruthy());
    const claves = llamadas.filter((l) => l.ruta.endsWith("/enviar-prueba")).map((l) => (l.cuerpo as { clave_idempotencia: string }).clave_idempotencia);
    expect(claves).toHaveLength(2);
    expect(claves[0]).toBe(claves[1]);
  });

  it("solo se ofrece con la plantilla publicada", async () => {
    simular(() => undefined);
    pintar(plantilla());
    await esperarValidacion();
    expect(screen.queryByRole("button", { name: "Enviar prueba" })).toBeNull();
  });
});

describe("formulario de argumentos generado", () => {
  const accion = (extra: Partial<OpcionesAccion> = {}): OpcionesAccion => ({ tool: "confirmar_cita", args_fijos: {}, args_contexto: {}, confirmar: false, ...extra });

  function formulario(ficha: OpcionesAccionDelCatalogo, a: OpcionesAccion, onChange = vi.fn(), reportar = vi.fn()) {
    render(
      <FormularioArgumentos ficha={ficha} accion={a} variables={VARIABLES} onChange={onChange} base="opciones[0].accion" hallazgos={[]} reportarError={reportar} claveError="op1.t" />,
    );
    return { onChange, reportar };
  }

  it("un campo pasa de valor fijo a dato del contexto y no queda en los dos mapas", () => {
    const { onChange } = formulario(CONFIRMAR_CITA, accion({ args_fijos: { motivo: "x", minutos: 5 } }));
    fireEvent.click(screen.getByRole("switch", { name: /Motivo: tomar el valor de un dato del contexto/ }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ args_fijos: { minutos: 5 }, args_contexto: { motivo: "" } }));
  });

  it("escribir un valor fijo lo guarda tipado y vaciarlo quita el argumento", () => {
    const { onChange } = formulario(CONFIRMAR_CITA, accion({ args_fijos: { motivo: "x" } }));
    fireEvent.change(screen.getByLabelText(/Minutos de aviso/, { selector: "input" }), { target: { value: "15" } });
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ args_fijos: { motivo: "x", minutos: 15 } }));
    fireEvent.change(screen.getByLabelText(/Motivo/, { selector: "input,textarea" }), { target: { value: "" } });
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ args_fijos: {} }));
  });

  it("un schema que no sabe pintar cae a un editor JSON validado sin romper", () => {
    const rara: OpcionesAccionDelCatalogo = { ...CONFIRMAR_CITA, parameters: { oneOf: [{ type: "object" }, { type: "string" }] } };
    const { onChange, reportar } = formulario(rara, accion());
    const editor = screen.getByLabelText("Valores fijos (JSON)");
    fireEvent.change(editor, { target: { value: "{roto" } });
    expect(reportar).toHaveBeenLastCalledWith("op1.t.args", "El JSON no es válido.");
    expect(screen.getByRole("alert").textContent).toMatch(/JSON no es válido/);
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.change(editor, { target: { value: '{"motivo":"x"}' } });
    expect(reportar).toHaveBeenLastCalledWith("op1.t.args", null);
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ args_fijos: { motivo: "x" } }));
  });

  it("un campo suelto con $ref sin resolver cae a JSON solo él", () => {
    const parcial: OpcionesAccionDelCatalogo = {
      ...CONFIRMAR_CITA,
      parameters: { type: "object", properties: { motivo: { type: "string" }, extra: { $ref: "https://x/y.json" } } },
    };
    formulario(parcial, accion());
    expect(screen.getByLabelText(/Motivo/, { selector: "input,textarea" }).tagName).toBe("INPUT");
    expect(screen.getByLabelText(/Extra/, { selector: "input,textarea" }).tagName).toBe("TEXTAREA");
  });
});

describe("tarjeta de opción · confirmación", () => {
  it("una acción sensible deja la confirmación activa y bloqueada, con la explicación", async () => {
    simular(() => undefined);
    const sensible = { ...DEFINICION, opciones: [{ ...DEFINICION.opciones[0], accion: { tool: "crear_link_de_pago", args_fijos: {}, args_contexto: {}, confirmar: false } }] };
    pintar(plantilla({ borrador: sensible }));
    const tarjeta = await screen.findByLabelText("Opción 1");
    const interruptor = within(tarjeta).getByRole("switch", { name: /Pedir confirmación al cliente/ }) as HTMLButtonElement;
    expect(interruptor.getAttribute("aria-checked")).toBe("true");
    expect(interruptor.disabled).toBe(true);
    expect(within(tarjeta).getByText(/No se puede quitar: es una acción sensible/)).toBeTruthy();
    expect(within(tarjeta).getByText(/Acción sensible: siempre pide confirmación/)).toBeTruthy();
  });

  it("al cambiar a una acción que exige confirmar, queda activa; al volver a una libre, parte en no", async () => {
    simular(() => undefined);
    pintar();
    const tarjeta = await screen.findByLabelText("Opción 1");
    const select = within(tarjeta).getByLabelText("Qué hace al tocarla");
    fireEvent.change(select, { target: { value: "crear_link_de_pago" } });
    const interruptor = within(tarjeta).getByRole("switch", { name: /Pedir confirmación al cliente/ });
    expect(interruptor.getAttribute("aria-checked")).toBe("true");
    fireEvent.change(select, { target: { value: "confirmar_cita" } });
    expect(within(tarjeta).getByRole("switch", { name: /Pedir confirmación al cliente/ }).getAttribute("aria-checked")).toBe("false");
  });
});
