// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { EditorDeAgente } from "@/components/domain/agentes/recorrido/editor-de-agente";
import { PasoSuperpoderes } from "@/components/domain/agentes/recorrido/pasos";
import { FeedbackProviders } from "@/components/ui/providers";
import { AvisoAlSalir } from "@/lib/cambios-sin-guardar";
import type { AgentDetail, LlmModelCatalog, PublishTarget, Superpower } from "@/lib/api/types";
import type { AgenteDatos } from "@/lib/datos-cliente";
import { violacionesGraves } from "@/lib/testing/axe";

import {
  contenidoDesdeEstado,
  erroresDelPaso,
  erroresPorSuperpoder,
  estadoDesdeBorrador,
  flujoDesdeApi,
  frasesDistintas,
  idDeSeccion,
  nombreDeSuperpoder,
  pasoDelCampo,
  pasoDesdeParametro,
  pasosConCambios,
  preguntaDelPaso,
  PASOS,
  rangoCompatible,
  superpoderesFueraDelEnfoque,
} from "./agentes-editor";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn(), push }),
}));

const PEDIDO: Superpower = {
  id: "pack_commerce.tomar_pedido",
  version: "1.2.0",
  skill: "pack_commerce",
  title: "Tomar un pedido",
  description: "",
  phrases: ["quiero comprar"], group: "ventas", group_label: "Ventas",
};
const PLAN: Superpower = { ...PEDIDO, id: "pack_commerce.contratar_plan", title: "Contratar un plan", phrases: ["a", "b", "c"].map((x) => `plan ${x}`), group: "ventas", group_label: "Ventas" };

const BASE = {
  contract: "agentspec/3",
  description: "Ventas",
  persona: { inheritConnectionVoice: true, maxLength: 500, forbiddenPhrases: [] },
  model: { primary: "deepseek-flash", temperature: 0.3, fallback: "gpt-4o-mini" },
  procedures: [{ id: PEDIDO.id, version: "^1.0" }],
  memory: { shortTermTurns: 30, readScopes: ["customer", "connection", "tenant"], writeNamespaces: [] },
  tools: [{ tool: "crear_pedido", enabled: true }],
};

describe("estado y contenido del borrador", () => {
  it("lee el borrador y lo devuelve con los cambios, sin tocar lo que el editor no muestra", () => {
    const estado = estadoDesdeBorrador({ name: "Ventas", description: "" }, BASE, [PEDIDO, PLAN]);
    expect(estado.superpoderes[PEDIDO.id]).toEqual({ activo: true, frases: [] });
    expect(estado.superpoderes[PLAN.id]).toEqual({ activo: false, frases: [] });

    const nuevo = contenidoDesdeEstado(
      BASE,
      {
        ...estado,
        modelo: "deepseek-v4-pro",
        superpoderes: {
          [PEDIDO.id]: { activo: true, frases: ["Me lo vendes", "me lo vendes!", " "] },
          [PLAN.id]: { activo: true, frases: [] },
        },
      },
      [PEDIDO, PLAN],
    );
    expect(nuevo.tools).toEqual(BASE.tools);
    expect(nuevo.model).toEqual({ primary: "deepseek-v4-pro", temperature: 0.3, fallback: "gpt-4o-mini" });
    expect(nuevo.procedures).toEqual([
      { id: PEDIDO.id, version: "^1.0", overrides: { examples: ["Me lo vendes"] } },
      { id: PLAN.id, version: "^1.0" },
    ]);
    expect((nuevo.memory as { writeNamespaces: unknown }).writeNamespaces).toEqual([]);
  });

  it("rango compatible de una versión publicada", () => {
    expect(rangoCompatible("2.3.1")).toBe("^2.0");
  });
});

describe("validación del editor", () => {
  const estado = estadoDesdeBorrador({ name: "Ventas", description: "" }, BASE, [PEDIDO, PLAN]);

  it("frases mínimas: las copias de la habilidad no suman", () => {
    expect(frasesDistintas(PEDIDO, ["Quiero COMPRAR", "quiéro comprar"])).toBe(1);
    expect(frasesDistintas(PEDIDO, ["hacer un pedido", "me lo vendes"])).toBe(3);
    const errores = erroresDelPaso("habilidades", estado, [PEDIDO, PLAN], { minFrases: 3 });
    expect(errores).toEqual({
      "procedures[0].overrides.examples": "«Tomar un pedido» necesita al menos 3 frases distintas de clientes: agrega 2 más.",
    });
  });

  it("al menos un superpoder, un nombre y una conexión", () => {
    const sin = { ...estado, nombre: " ", superpoderes: {} };
    expect(erroresDelPaso("habilidades", sin, [PEDIDO], { minFrases: 3 })).toHaveProperty("procedures");
    expect(erroresDelPaso("identidad", sin, [PEDIDO], { minFrases: 3 })).toHaveProperty("name");
    expect(erroresDelPaso("publicar", sin, [PEDIDO], { minFrases: 3, conexiones: [] })).toHaveProperty("connection_ids");
    // Sin ningún tipo de pedido no puede cerrar pedidos; si el paso no conoce los métodos, no se mira.
    expect(erroresDelPaso("datos-cliente", sin, [PEDIDO], { minFrases: 3, metodosDeEntrega: [] })).toHaveProperty(
      "datos.metodos_entrega",
    );
    expect(erroresDelPaso("datos-cliente", sin, [PEDIDO], { minFrases: 3, metodosDeEntrega: ["domicilio"] })).toEqual({});
    expect(erroresDelPaso("datos-cliente", sin, [PEDIDO], { minFrases: 3 })).toEqual({});
  });

  it("nueve pasos, con «Datos del cliente» entre Habilidades y Flujo, y los ids de antes siguen abriendo algo", () => {
    expect(PASOS.map((p) => p.id)).toEqual([
      "identidad",
      "voz",
      "reglas",
      "habilidades",
      "datos-cliente",
      "flujo",
      "conocimiento",
      "probar",
      "publicar",
    ]);
    // HU-AOS-85: el paso propio, con su pregunta y abierto desde `?paso=`.
    expect(preguntaDelPaso("datos-cliente", "Laura")).toBe("¿Qué datos pide Laura?");
    expect(pasoDesdeParametro("datos-cliente")).toBe("datos-cliente");
    expect(pasoDesdeParametro("datos")).toBe("datos-cliente");
    expect(PASOS.some((p) => p.titulo.includes("modelo"))).toBe(false);
    expect(pasoDesdeParametro("publicar")).toBe("publicar");
    expect(pasoDesdeParametro("modelo")).toBe("publicar");
    expect(pasoDesdeParametro("superpoderes")).toBe("habilidades");
    expect(pasoDesdeParametro("memoria")).toBe("conocimiento");
    expect(pasoDesdeParametro("otro")).toBeUndefined();
    expect(preguntaDelPaso("voz", "Sofía")).toBe("¿Cómo quieres que hable Sofía?");
    expect(preguntaDelPaso("voz", " ")).toBe("¿Cómo quieres que hable tu agente?");
  });

  it("marca los pasos con cambios sin guardar", () => {
    expect(pasosConCambios(estado, estado).size).toBe(0);
    const cambiado = { ...estado, nombre: "Otra", frasesProhibidas: ["te lo regalo"], alcances: [] };
    expect([...pasosConCambios(cambiado, estado)].sort()).toEqual(["conocimiento", "identidad", "voz"]);
    // El modelo no tiene paso: cambiarlo no marca ninguno.
    expect(pasosConCambios({ ...estado, modelo: "otro" }, estado).size).toBe(0);
    // Los datos del cliente marcan su paso, no Habilidades (HU-AOS-85).
    expect([...pasosConCambios(estado, estado, { datosCliente: true })]).toEqual(["datos-cliente"]);
  });

  it("cada error de la API va a su paso y a su superpoder", () => {
    expect(pasoDelCampo("model.primary")).toBe("publicar");
    expect(pasoDelCampo("procedures[1].overrides.examples")).toBe("habilidades");
    expect(pasoDelCampo("tools[2].tool")).toBe("habilidades");
    expect(pasoDelCampo("datos.crear_pedido")).toBe("datos-cliente");
    expect(pasoDelCampo("datos.metodos_entrega")).toBe("datos-cliente");
    expect(pasoDelCampo("memory.readScopes")).toBe("conocimiento");
    expect(pasoDelCampo("flow.sections[0].label")).toBe("flujo");
    expect(pasoDelCampo("connection_ids[0]")).toBe("publicar");
    expect(pasoDelCampo("persona.maxLength")).toBe("voz");
    expect(pasoDelCampo("name")).toBe("identidad");
    expect(erroresPorSuperpoder({ "procedures[0].overrides.examples": "Faltan frases." }, BASE)).toEqual({
      [PEDIDO.id]: "Faltan frases.",
    });
  });
});

describe("superpoder sin las frases mínimas", () => {
  afterEach(cleanup);

  it("muestra el error junto al campo del superpoder, no un JSON", () => {
    const estado = estadoDesdeBorrador({ name: "Ventas", description: "" }, BASE, [PEDIDO]);
    render(
      <PasoSuperpoderes
        estado={estado}
        cambiar={() => {}}
        errores={{}}
        erroresPorPoder={{ [PEDIDO.id]: "«Tomar un pedido» necesita al menos 3 frases distintas de clientes: agrega 2 más." }}
        catalogo={[PEDIDO]}
        minFrases={3}
      />,
    );
    const campo = screen.getByLabelText("Tus frases");
    expect(campo.getAttribute("aria-invalid")).toBe("true");
    const error = document.getElementById(campo.getAttribute("aria-describedby") ?? "");
    expect(error?.textContent).toMatch(/necesita al menos 3 frases/);
    expect(screen.getByText("1 frases (mínimo 3)")).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/[{}]/);
  });
});

describe("publicar (D-35)", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  const agente = {
    id: "11111111-1111-4111-8111-111111111111",
    key: "ventas",
    kind: "specialist",
    contract: "agentspec/3",
    name: "Ventas",
    description: "",
    status: "active",
    latest_version: null,
    created_at: "2026-10-18T00:00:00Z",
    draft: { content: BASE, lock_version: 1, base_version_id: null, updated_at: "2026-10-18T00:00:00Z" },
    versions: [],
  } as unknown as AgentDetail;
  const modelos = {
    items: [],
    total: 0,
    page: 1,
    page_size: 100,
    has_more: false,
    provider: "deepseek",
    byok_model: null,
    avg_input_tokens: null,
    avg_output_tokens: null,
    sample_turns: 0,
    min_phrases: 3,
    business_model: "deepseek-flash",
  } as LlmModelCatalog;
  const conexion: PublishTarget = {
    connection_id: "22222222-2222-4222-8222-222222222222",
    label: "WhatsApp tienda",
    channel: "whatsapp",
    installed: false,
    covers_skills: true,
    missing_skills: [],
    active_release_id: null,
  };

  it("los errores por campo de la API llevan al paso y se muestran junto al superpoder", async () => {
    const plan = { ...PLAN, id: PEDIDO.id, title: "Tomar un pedido" };
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: "El spec tiene 1 problema(s) del contrato.",
          code: "invalid_spec",
          fields: { "procedures[0].overrides.examples": "«Tomar un pedido» necesita al menos 3 frases distintas." },
        }),
        { status: 422 },
      ),
    );
    render(
      <FeedbackProviders>
        <EditorDeAgente
          agente={agente}
          superpoderes={[plan]}
          modelos={modelos}
          destinos={[conexion]}
          destinosError={null}
          puedeActivar
        />
      </FeedbackProviders>,
    );
    fireEvent.click(screen.getAllByRole("button", { name: /^Publicar$/ })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Publicar versión" }));
    await waitFor(() => expect(screen.getByLabelText("Tus frases").getAttribute("aria-invalid")).toBe("true"));
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body)).toMatchObject({ connection_ids: [conexion.connection_id], lock_version: 1 });
    const campo = screen.getByLabelText("Tus frases");
    expect(document.getElementById(campo.getAttribute("aria-describedby") ?? "")?.textContent).toMatch(
      /necesita al menos 3 frases distintas/,
    );
  });
});

describe("editar con el recorrido común (HU-AOS-78)", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  const agente = {
    id: "11111111-1111-4111-8111-111111111111",
    key: "ventas",
    kind: "specialist",
    contract: "agentspec/3",
    name: "Ventas",
    description: "",
    status: "active",
    latest_version: null,
    created_at: "2026-10-18T00:00:00Z",
    draft: { content: BASE, lock_version: 1, base_version_id: null, updated_at: "2026-10-18T00:00:00Z" },
    versions: [],
  } as unknown as AgentDetail;
  const modelos = {
    items: [],
    total: 0,
    page: 1,
    page_size: 100,
    has_more: false,
    provider: "deepseek",
    byok_model: null,
    avg_input_tokens: null,
    avg_output_tokens: null,
    sample_turns: 0,
    min_phrases: 3,
    business_model: "deepseek-flash",
  } as LlmModelCatalog;
  const segmento = (nombre: RegExp) => screen.getAllByRole("button", { name: nombre })[0];
  const conexionDeCrear: PublishTarget = {
    connection_id: "33333333-3333-4333-8333-333333333333",
    label: "WhatsApp",
    channel: "whatsapp",
    installed: false,
    covers_skills: true,
    missing_skills: [],
    active_release_id: null,
  };

  function abrir(props: Partial<Parameters<typeof EditorDeAgente>[0]> = {}) {
    return render(
      <FeedbackProviders>
        <EditorDeAgente
          agente={agente}
          superpoderes={[PEDIDO]}
          modelos={modelos}
          destinos={[]}
          destinosError={null}
          puedeActivar
          modeloEfectivo={{ nombre: "deepseek-flash", origen: "negocio" }}
          {...props}
        />
      </FeedbackProviders>,
    );
  }

  it("ocho pasos libres y sin «Proveedor y modelo»; Publicar dice el modelo del negocio", () => {
    abrir();
    expect(screen.getByRole("heading", { level: 2, name: "¿Cómo se llama tu agente y para qué sirve?" })).toBeTruthy();
    expect(screen.queryByText(/Proveedor y modelo/)).toBeNull();
    fireEvent.click(segmento(/^Publicar$/));
    expect(screen.getByText(/Usa el modelo de tu negocio:/).textContent).toContain("deepseek-flash");
    fireEvent.click(segmento(/^Flujo/));
    expect(screen.getByRole("heading", { level: 2, name: "¿Con qué pasos atiende Ventas?" })).toBeTruthy();
  });

  it("cambiar de paso no guarda: marca «con cambios» y guarda con «Guardar cambios»", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
    abrir();
    const guardar = screen.getByRole("button", { name: "Guardar cambios" });
    expect((guardar as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: "Ventas Centro" } });
    fireEvent.click(screen.getByRole("button", { name: /Siguiente/ }));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(segmento(/Identidad, con cambios/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`/api/agent-editor/${agente.id}`);
    expect(JSON.parse(init.body)).toMatchObject({ name: "Ventas Centro" });
  });

  it("Habilidades ya no trae la sección de datos del cliente (HU-AOS-85)", () => {
    abrir({ pasoInicial: "habilidades" });
    expect(screen.getByRole("heading", { level: 2, name: "¿Qué sabe hacer Ventas?" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Datos del cliente" })).toBeNull();
  });

  it("al crear (HU-AOS-86) son las estaciones 2 a 5 de 5, en orden, con «Guardar y seguir» y sin «Guardar cambios»", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ lockVersion: 2, content: BASE }), { status: 200 }));
    // Un enlace viejo con `?paso=voz` arranca igual en la primera estación del editor.
    abrir({ modo: "crear", pasoInicial: "voz" });
    expect(screen.queryByRole("button", { name: "Guardar cambios" })).toBeNull();
    expect(screen.getAllByText("Paso 2 de 5 · Habilidades").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { level: 1, name: "¿Qué sabe hacer Ventas?" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Atrás/ }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("link", { name: "Terminar después" }).getAttribute("href")).toBe(`/agentes/${agente.id}`);
    // «Datos del cliente» ya no es sección de Habilidades: es la estación 3.
    expect(screen.queryByRole("heading", { level: 3, name: "Datos del cliente" })).toBeNull();
    expect(screen.getByRole("button", { name: /Guardar y seguir: Datos del cliente/ })).toBeTruthy();
    cleanup();
    abrir({ modo: "crear", pasoInicial: "conocimiento" });
    expect(screen.getAllByText("Paso 4 de 5 · Datos para probar").length).toBeGreaterThan(0);
    // En la creación este paso es solo «Datos para probar»: sin memoria.
    expect(screen.queryByText(/Lo que sabe del cliente/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Guardar y seguir: Revisar y publicar/ }));
    await waitFor(() => expect(screen.getAllByText("Paso 5 de 5 · Revisar y publicar").length).toBeGreaterThan(0));
  });

  it("la estación 5 resume lo hecho con «Editar», ofrece «Dónde atiende» y «Guardar como borrador» no publica", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ lockVersion: 2, content: BASE }), { status: 200 }));
    push.mockReset();
    abrir({ modo: "crear", pasoInicial: "probar", destinos: [conexionDeCrear] });
    expect(screen.getByRole("heading", { level: 1, name: "Revisa y publica a Ventas" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /Listo para responder|le falta algo|Todavía no puede responder/ })).toBeTruthy();
    const resumen = screen.getByRole("list", { name: "Lo que ya está listo" });
    expect(within(resumen).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      expect.stringContaining("Habilidades"),
      expect.stringContaining("Datos del cliente"),
      expect.stringContaining("Datos para probar"),
    ]);
    expect(screen.getByRole("group", { name: "Dónde atiende" })).toBeTruthy();
    expect(screen.getByLabelText(/Nota de versión/)).toBeTruthy();
    fireEvent.click(within(resumen).getByRole("button", { name: "Editar Datos del cliente" }));
    expect(screen.getAllByText("Paso 3 de 5 · Datos del cliente").length).toBeGreaterThan(0);
    cleanup();
    abrir({ modo: "crear", pasoInicial: "probar", destinos: [conexionDeCrear] });
    fireEvent.click(screen.getByRole("button", { name: "Guardar como borrador" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith(`/agentes/${agente.id}`));
    expect(fetchMock.mock.calls.some(([u]) => String(u).endsWith("/publish"))).toBe(false);
  });

  it("«Publicar a {nombre}» publica la versión 1, la activa en la conexión elegida y va a la ficha", async () => {
    push.mockReset();
    fetchMock.mockImplementation(async (url: string) => {
      if (url.endsWith("/publish")) {
        return new Response(
          JSON.stringify({
            version: { version: 1 },
            warnings: [],
            connections: [
              {
                connection_id: conexionDeCrear.connection_id,
                instance: "created",
                release_id: "r-1",
                release_number: 1,
                release_created: true,
                error: null,
              },
            ],
          }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({ lockVersion: 2, content: BASE }), { status: 200 });
    });
    abrir({ modo: "crear", pasoInicial: "probar", destinos: [conexionDeCrear], modelos: { ...modelos, min_phrases: 1 } });
    fireEvent.click(screen.getByRole("button", { name: "Publicar a Ventas" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith(`/agentes/${agente.id}`));
    const publicar = fetchMock.mock.calls.find(([u]) => String(u).endsWith("/publish"));
    expect(JSON.parse(publicar?.[1].body)).toMatchObject({ connection_ids: [conexionDeCrear.connection_id] });
    const activar = fetchMock.mock.calls.find(([u]) => u === "/api/agent-editor/activate");
    expect(JSON.parse(activar?.[1].body)).toEqual({ connection_id: conexionDeCrear.connection_id, release_id: "r-1" });
  });

  it("sin conexiones, «Publicar» no se puede usar y queda «Guardar como borrador»", () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
    abrir({ modo: "crear", pasoInicial: "probar" });
    expect((screen.getByRole("button", { name: "Publicar a Ventas" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Guardar como borrador" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("en la bienvenida (HU-AOS-81) son los pasos 2 a 4 de 4, vuelve al del negocio y prepara la prueba", async () => {
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({ lockVersion: 2, content: BASE }), { status: 200 }));
    const volverA = vi.fn();
    const avanzar = vi.fn();
    const prepararPrueba = vi.fn(async () => null);
    const terminar = vi.fn(async () => {});
    const bienvenida = {
      pasosDelNegocio: [{ id: "negocio-negocio", titulo: "Tu negocio" }],
      volverA,
      avanzar,
      prepararPrueba,
      prueba: <p>Chat de prueba</p>,
      probado: false,
      terminar,
      terminando: false,
    };
    abrir({ modo: "bienvenida", pasoInicial: "habilidades", bienvenida });
    expect(screen.getByText("Paso 2 de 4 · Habilidades")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1, name: "¿Qué sabe hacer Ventas?" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Guardar cambios" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Atrás/ }));
    expect(volverA).toHaveBeenCalledWith(1);

    cleanup();
    abrir({ modo: "bienvenida", pasoInicial: "conocimiento", bienvenida });
    expect(screen.getByText("Paso 3 de 4 · Datos")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Siguiente/ }));
    await waitFor(() => expect(screen.getByText("Paso 4 de 4 · Revisar")).toBeTruthy());
    expect(prepararPrueba).toHaveBeenCalled();
    expect(avanzar).toHaveBeenCalledWith(4);
    expect(screen.getByText("Chat de prueba")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Terminar" })).toBeTruthy();
  });

  it("en la bienvenida «Terminar» espera a que le escriba a su agente", () => {
    const terminar = vi.fn(async () => {});
    const bienvenida = {
      pasosDelNegocio: [{ id: "negocio-0", titulo: "Tu negocio" }],
      volverA: vi.fn(),
      avanzar: vi.fn(),
      prepararPrueba: vi.fn(async () => null),
      prueba: null,
      probado: false,
      terminar,
      terminando: false,
    };
    abrir({ modo: "bienvenida", pasoInicial: "probar", bienvenida });
    expect((screen.getByRole("button", { name: /Terminar/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/escríbele al menos un mensaje/)).toBeTruthy();
  });

  it("sin permiso de escritura se ve todo, sin guardar ni publicar", () => {
    abrir({ puedeEditar: false, pasoInicial: "publicar" });
    expect(screen.queryByRole("button", { name: "Guardar cambios" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Publicar versión" })).toBeNull();
    fireEvent.click(segmento(/^Identidad$/));
    expect(screen.getByLabelText(/Nombre/).matches(":disabled")).toBe(true);
  });
});

describe("«Datos del cliente» como paso propio en Personalizar (HU-AOS-85)", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  const agente = {
    id: "11111111-1111-4111-8111-111111111111",
    key: "ventas",
    kind: "specialist",
    contract: "agentspec/3",
    name: "Laura",
    description: "",
    status: "active",
    latest_version: null,
    created_at: "2026-10-18T00:00:00Z",
    draft: { content: BASE, lock_version: 1, base_version_id: null, updated_at: "2026-10-18T00:00:00Z" },
    versions: [{ version: 1 }],
  } as unknown as AgentDetail;
  const modelos = { items: [], min_phrases: 3, business_model: "deepseek-flash" } as unknown as LlmModelCatalog;
  const politica: AgenteDatos = {
    agente_id: agente.id,
    niveles: ["requerido", "recomendado", "no_pedir"],
    herramientas_del_agente: false,
    metodos_entrega: ["domicilio", "recoger_en_tienda"],
    procedimientos: [],
    acciones: [
      {
        id: "ventas.crear_pedido",
        modulo: "ventas",
        etiqueta: "Crear un pedido",
        campos: [
          { clave: "telefono", etiqueta: "Teléfono", nivel: "requerido", por_defecto: "requerido", ajustable: false, ajustado: false },
          { clave: "nombre", etiqueta: "Nombre", nivel: "requerido", por_defecto: "requerido", ajustable: true, ajustado: false },
          { clave: "correo", etiqueta: "Correo", nivel: "recomendado", por_defecto: "recomendado", ajustable: true, ajustado: false },
          { clave: "notas", etiqueta: "Notas del pedido", nivel: "no_pedir", por_defecto: "no_pedir", ajustable: true, ajustado: false },
        ],
      },
    ],
  };
  /** El texto del paso en la barra de escritorio, con su marca («, con cambios») si la tiene. */
  const enLaBarra = (titulo: string) =>
    within(within(screen.getByRole("navigation", { name: "Pasos del editor de agentes" })).getAllByRole("list")[0])
      .getAllByRole("listitem")
      .map((li) => li.textContent ?? "")
      .find((t) => t.startsWith(titulo)) ?? "";
  const nivelDe = (dato: string) =>
    (within(screen.getByRole("radiogroup", { name: `${dato} (Crear un pedido)` })).getAllByRole("radio") as HTMLInputElement[]).find(
      (r) => r.checked,
    )?.value;

  function abrir(props: Partial<Parameters<typeof EditorDeAgente>[0]> = {}) {
    return render(
      <FeedbackProviders>
        <EditorDeAgente
          agente={agente}
          superpoderes={[PEDIDO]}
          modelos={modelos}
          destinos={[]}
          destinosError={null}
          puedeActivar
          datosCliente={politica}
          {...props}
        />
      </FeedbackProviders>,
    );
  }

  it("9 pasos con «Datos del cliente» entre Habilidades y Flujo; la pregunta es el título y no hay botón propio", async () => {
    const { container } = abrir({ pasoInicial: "datos-cliente" });
    const barra = screen.getByRole("navigation", { name: "Pasos del editor de agentes" });
    // La barra de escritorio (la primera lista; la segunda es la del celular).
    const nombres = within(within(barra).getAllByRole("list")[0])
      .getAllByRole("listitem")
      .map((li) => li.textContent ?? "");
    expect(nombres).toHaveLength(9);
    const i = nombres.findIndex((n) => n.includes("Datos del cliente"));
    expect(nombres[i - 1]).toContain("Habilidades");
    expect(nombres[i + 1]).toContain("Flujo");
    expect(screen.getByRole("heading", { level: 2, name: "¿Qué datos pide Laura?" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Guardar datos del cliente" })).toBeNull();
    // Jerarquía: pregunta (h2) → módulo y bloques (h3) → operación (h4); nunca un h2 dentro de un h3.
    expect(screen.getByRole("heading", { level: 3, name: "Ventas" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 3, name: "Tipos de pedido" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 4, name: /Crear un pedido/ })).toBeTruthy();
    expect(container.querySelectorAll("h3 h2, h3 h1").length).toBe(0);
    expect(await violacionesGraves(container)).toEqual([]);
  });

  it("apagar «A domicilio» marca el paso (no Habilidades) y «Guardar cambios» guarda política, herramientas y métodos", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
    abrir({ pasoInicial: "datos-cliente" });
    fireEvent.click(screen.getByRole("switch", { name: "Ofrecer a domicilio" }));
    fireEvent.click(screen.getByRole("switch", { name: /consulte los datos/ }));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(enLaBarra("Datos del cliente")).toContain("con cambios");
    expect(enLaBarra("Habilidades")).not.toContain("con cambios");
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`/api/agent-editor/${agente.id}/datos-cliente`);
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body)).toEqual({
      politica: { "ventas.crear_pedido": {} },
      herramientas_del_agente: true,
      metodos_entrega: ["recoger_en_tienda"],
    });
    await waitFor(() => expect(enLaBarra("Datos del cliente")).not.toContain("con cambios"));
    expect((screen.getByRole("switch", { name: "Ofrecer a domicilio" }) as HTMLButtonElement).getAttribute("aria-checked")).toBe(
      "false",
    );
  });

  it("mientras se guardan los datos del cliente, «Guardar cambios» no manda otro PUT", async () => {
    let soltar: (r: Response) => void = () => {};
    fetchMock.mockReturnValue(new Promise<Response>((r) => (soltar = r)));
    abrir({ pasoInicial: "datos-cliente" });
    fireEvent.click(screen.getByRole("switch", { name: "Ofrecer a domicilio" }));
    const boton = screen.getByRole("button", { name: "Guardar cambios" });
    fireEvent.click(boton);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect((boton as HTMLButtonElement).disabled).toBe(true));
    fireEvent.click(boton);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    soltar(new Response(JSON.stringify({}), { status: 200 }));
    await waitFor(() => expect(enLaBarra("Datos del cliente")).not.toContain("con cambios"));
  });

  it("al recargar, «A domicilio» sigue apagado si el servidor lo guardó así", () => {
    abrir({ pasoInicial: "datos-cliente", datosCliente: { ...politica, metodos_entrega: ["recoger_en_tienda"] } });
    expect(screen.getByRole("switch", { name: "Ofrecer a domicilio" }).getAttribute("aria-checked")).toBe("false");
    // El único encendido no se puede apagar.
    expect((screen.getByRole("switch", { name: "Ofrecer recoger en tienda" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("«Lo justo» viene elegido con «Recomendado»; «Completo» sube los ajustables y «Usar lo recomendado» los devuelve", () => {
    abrir({ pasoInicial: "datos-cliente" });
    const cuanto = screen.getByRole("radiogroup", { name: "Cuánto pregunta" });
    const justo = within(cuanto).getByRole("radio", { name: /Lo justo/ }) as HTMLInputElement;
    expect(justo.checked).toBe(true);
    expect(justo.closest("label")?.textContent).toContain("Recomendado");
    expect(nivelDe("Correo")).toBe("recomendado");
    expect(nivelDe("Notas del pedido")).toBe("no_pedir");

    fireEvent.click(within(cuanto).getByRole("radio", { name: /Completo/ }));
    expect(nivelDe("Nombre")).toBe("requerido");
    expect(nivelDe("Correo")).toBe("requerido");
    expect(nivelDe("Notas del pedido")).toBe("requerido");
    expect(screen.getByText(/2 cambios/)).toBeTruthy();
    expect(enLaBarra("Datos del cliente")).toContain("con cambios");

    fireEvent.click(screen.getByRole("button", { name: /Usar lo recomendado/ }));
    expect(nivelDe("Correo")).toBe("recomendado");
    expect(nivelDe("Notas del pedido")).toBe("no_pedir");
    expect(justo.checked).toBe(true);
    expect(screen.queryByRole("button", { name: /Usar lo recomendado/ })).toBeNull();
  });

  it("los pisos técnicos no bajan con «Lo mínimo» y dicen para qué se necesitan", () => {
    abrir({ pasoInicial: "datos-cliente" });
    fireEvent.click(within(screen.getByRole("radiogroup", { name: "Cuánto pregunta" })).getByRole("radio", { name: /Lo mínimo/ }));
    expect(nivelDe("Teléfono")).toBe("requerido");
    expect(nivelDe("Correo")).toBe("no_pedir");
    const grupo = screen.getByRole("radiogroup", { name: "Teléfono (Crear un pedido)" });
    for (const radio of within(grupo).getAllByRole("radio")) expect((radio as HTMLInputElement).disabled).toBe(true);
    expect(document.getElementById(grupo.getAttribute("aria-describedby") ?? "")?.textContent).toBe(
      "Necesario para crear un pedido.",
    );
  });

  it("el chat de vista previa del paso es el simulado de «Datos del cliente», sin modelo", () => {
    abrir({ pasoInicial: "datos-cliente", negocio: { nombre: "La Espiga", voz: null, resumenDeVoz: null, horario: null, motivos: null } });
    fireEvent.click(screen.getAllByRole("button", { name: "«Quiero un domicilio»" })[0]);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getAllByText(/Hola, soy Laura, de La Espiga/).length).toBeGreaterThan(0);
  });

  it("al crear (HU-AOS-86) es la estación 3: «Guardar y seguir: Datos para probar» guarda política, herramientas y métodos", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
    abrir({ modo: "crear", pasoInicial: "datos-cliente" });
    expect(screen.getAllByText("Paso 3 de 5 · Datos del cliente").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Guardar datos del cliente" })).toBeNull();
    fireEvent.click(within(screen.getByRole("radiogroup", { name: "Cuánto pregunta" })).getByRole("radio", { name: /Completo/ }));
    fireEvent.click(screen.getByRole("switch", { name: "Ofrecer a domicilio" }));
    fireEvent.click(screen.getByRole("button", { name: /Guardar y seguir: Datos para probar/ }));
    await waitFor(() => expect(screen.getAllByText("Paso 4 de 5 · Datos para probar").length).toBeGreaterThan(0));
    const put = fetchMock.mock.calls.find(([u]) => String(u).endsWith("/datos-cliente"));
    expect(put?.[1].method).toBe("PUT");
    const cuerpo = JSON.parse(put?.[1].body);
    expect(cuerpo).toHaveProperty("politica");
    expect(cuerpo).toHaveProperty("herramientas_del_agente");
    expect(cuerpo.metodos_entrega).toEqual(["recoger_en_tienda"]);
  });
});

describe("salir del editor con cambios sin guardar (HU-AOS-78)", () => {
  const fetchMock = vi.fn();
  // Lo que llega al documento sin frenar (sin aviso): se frena aquí para que jsdom no navegue.
  const sinAviso = vi.fn((evento: MouseEvent) => evento.preventDefault());
  beforeEach(() => {
    fetchMock.mockReset();
    push.mockReset();
    sinAviso.mockClear();
    vi.stubGlobal("fetch", fetchMock);
    document.addEventListener("click", sinAviso);
  });
  afterEach(() => {
    document.removeEventListener("click", sinAviso);
    cleanup();
    vi.unstubAllGlobals();
  });

  const agente = {
    id: "11111111-1111-4111-8111-111111111111",
    key: "ventas",
    kind: "specialist",
    contract: "agentspec/3",
    name: "Ventas",
    description: "",
    status: "active",
    latest_version: null,
    created_at: "2026-10-18T00:00:00Z",
    draft: { content: BASE, lock_version: 1, base_version_id: null, updated_at: "2026-10-18T00:00:00Z" },
    versions: [],
  } as unknown as AgentDetail;
  const modelos = { items: [], min_phrases: 3, business_model: "deepseek-flash" } as unknown as LlmModelCatalog;

  function abrir() {
    return render(
      <FeedbackProviders>
        <AvisoAlSalir>
          <a href={`/agentes/${agente.id}`}>Volver a Ventas</a>
          <EditorDeAgente
            agente={agente}
            superpoderes={[PEDIDO]}
            modelos={modelos}
            destinos={[]}
            destinosError={null}
            puedeActivar
          />
        </AvisoAlSalir>
      </FeedbackProviders>,
    );
  }
  const volver = () => screen.getByRole("link", { name: "Volver a Ventas" });
  const cambiarNombre = () => fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: "Ventas Centro" } });
  const cerrarPestana = () => {
    const evento = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(evento);
    return evento.defaultPrevented;
  };

  it("sin cambios se sale sin preguntar y la pestaña se cierra sin aviso", () => {
    abrir();
    fireEvent.click(volver());
    expect(screen.queryByText("Tienes cambios sin guardar")).toBeNull();
    expect(sinAviso).toHaveBeenCalled();
    expect(cerrarPestana()).toBe(false);
  });

  it("con cambios, «Volver» pide confirmar: «Seguir editando» se queda", async () => {
    abrir();
    cambiarNombre();
    fireEvent.click(volver());
    expect(sinAviso).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole("button", { name: "Seguir editando" }));
    await waitFor(() => expect(screen.queryByText("Tienes cambios sin guardar")).toBeNull());
    expect(push).not.toHaveBeenCalled();
    expect((screen.getByLabelText(/Nombre/) as HTMLInputElement).value).toBe("Ventas Centro");
  });

  it("con cambios, «Descartar cambios» sale a la ficha", async () => {
    abrir();
    cambiarNombre();
    fireEvent.click(volver());
    fireEvent.click(await screen.findByRole("button", { name: "Descartar cambios" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith(`/agentes/${agente.id}`));
  });

  it("con cambios avisa al cerrar la pestaña; tras guardar ya no", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ lockVersion: 2, content: BASE }), { status: 200 }));
    abrir();
    cambiarNombre();
    expect(cerrarPestana()).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect((screen.getByRole("button", { name: "Guardar cambios" }) as HTMLButtonElement).disabled).toBe(true));
    expect(cerrarPestana()).toBe(false);
    fireEvent.click(volver());
    expect(screen.queryByText("Tienes cambios sin guardar")).toBeNull();
    expect(push).not.toHaveBeenCalled();
  });
});

describe("superpoder de otro enfoque", () => {
  afterEach(cleanup);
  const CITA = { ...BASE, procedures: [...BASE.procedures, { id: "pack_calendar.agendar_cita", version: "^1.0" }] };

  it("detecta lo marcado que el catálogo del agente no ofrece y le pone nombre legible", () => {
    const estado = estadoDesdeBorrador({ name: "Ventas", description: "" }, CITA, [PEDIDO]);
    expect(superpoderesFueraDelEnfoque(estado, [PEDIDO])).toEqual(["pack_calendar.agendar_cita"]);
    expect(nombreDeSuperpoder("pack_calendar.agendar_cita")).toBe("Agendar cita");
  });

  it("se puede quitar desde el editor y deja de ir en el contenido", () => {
    const estado = estadoDesdeBorrador({ name: "Ventas", description: "" }, CITA, [PEDIDO]);
    const cambiar = vi.fn();
    render(
      <PasoSuperpoderes
        estado={estado}
        cambiar={cambiar}
        errores={{}}
        erroresPorPoder={{ "pack_calendar.agendar_cita": "«Agendar una cita» no es parte del enfoque de este agente." }}
        catalogo={[PEDIDO]}
        minFrases={3}
      />,
    );
    expect(screen.getByText("Agendar cita")).toBeTruthy();
    expect(screen.getByText(/no es parte del enfoque/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Quitar" }));
    const { superpoderes } = cambiar.mock.calls[0][0];
    expect(superpoderes["pack_calendar.agendar_cita"].activo).toBe(false);
    const quitado = contenidoDesdeEstado(CITA, { ...estado, superpoderes }, [PEDIDO]);
    expect((quitado.procedures as { id: string }[]).map((p) => p.id)).toEqual([PEDIDO.id]);
  });
});


describe("flujo de atención por agente (ADR-0195)", () => {
  it("lee la respuesta de la API y descarta secciones sin id o sin nombre", () => {
    expect(
      flujoDesdeApi({
        sections: [
          { id: "cotizacion", label: "Cotización", purpose: "Preparar", tools: ["generar_cotizacion"] },
          { id: "", label: "Sin id", tools: [] },
          { id: "sin_nombre" },
        ],
      }),
    ).toEqual({
      sections: [{ id: "cotizacion", label: "Cotización", purpose: "Preparar", tools: ["generar_cotizacion"] }],
    });
  });

  it("genera ids únicos a partir del nombre", () => {
    expect(idDeSeccion("Nueva sección", [])).toBe("nueva_seccion");
    expect(idDeSeccion("Nueva sección", ["nueva_seccion"])).toBe("nueva_seccion_2");
  });

  it("exige nombre en cada sección", () => {
    const estado = estadoDesdeBorrador({ name: "Ventas", description: "" }, BASE, [], {
      sections: [{ id: "a", label: "", purpose: "", tools: [] }],
    });
    expect(erroresDelPaso("flujo", estado, [], { minFrases: 3 })).toEqual({
      "flow.sections[0].label": "Ponle un nombre a la sección.",
    });
  });

  it("el flujo entra al estado del editor pero no al AgentSpec", () => {
    const flujo = { sections: [{ id: "a", label: "A", purpose: "", tools: ["x"] }] };
    const estado = estadoDesdeBorrador({ name: "Ventas", description: "" }, BASE, [], flujo);
    expect(estado.flujo).toEqual(flujo);
    expect(contenidoDesdeEstado(BASE, estado, [])).not.toHaveProperty("flow");
  });
});
