// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { EditorDeAgente } from "@/components/domain/agentes/recorrido/editor-de-agente";
import { PasoSuperpoderes } from "@/components/domain/agentes/recorrido/pasos";
import { FeedbackProviders } from "@/components/ui/providers";
import { AvisoAlSalir } from "@/lib/cambios-sin-guardar";
import type { AgentDetail, LlmModelCatalog, PublishTarget, Superpower } from "@/lib/api/types";

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
  phrases: ["quiero comprar"],
};
const PLAN: Superpower = { ...PEDIDO, id: "pack_commerce.contratar_plan", title: "Contratar un plan", phrases: ["a", "b", "c"].map((x) => `plan ${x}`) };

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
  });

  it("ocho pasos comunes, sin «Proveedor y modelo», y los ids de antes siguen abriendo algo", () => {
    expect(PASOS.map((p) => p.id)).toEqual(["identidad", "voz", "reglas", "habilidades", "flujo", "conocimiento", "probar", "publicar"]);
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
  });

  it("cada error de la API va a su paso y a su superpoder", () => {
    expect(pasoDelCampo("model.primary")).toBe("publicar");
    expect(pasoDelCampo("procedures[1].overrides.examples")).toBe("habilidades");
    expect(pasoDelCampo("tools[2].tool")).toBe("habilidades");
    expect(pasoDelCampo("datos.crear_pedido")).toBe("habilidades");
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

  it("los ids de antes abren el paso que los contiene", () => {
    abrir({ pasoInicial: "habilidades" });
    expect(screen.getByRole("heading", { level: 2, name: "¿Qué sabe hacer Ventas?" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 3, name: "Datos del cliente" })).toBeTruthy();
  });

  it("al crear (HU-AOS-77) los pasos van en orden y «Siguiente» guarda antes de avanzar", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ lockVersion: 2, content: BASE }), { status: 200 }));
    abrir({ modo: "crear", pasoInicial: "voz" });
    expect(screen.queryByRole("button", { name: "Guardar cambios" })).toBeNull();
    expect(screen.getByText("Paso 2 de 8 · Cómo habla")).toBeTruthy();
    // En orden: no se puede saltar a un paso futuro desde la barra.
    expect(screen.queryAllByRole("button", { name: /^Publicar$/ })).toHaveLength(0);
    fireEvent.click(screen.getByRole("switch", { name: /voz de la conexión/ }));
    fireEvent.click(screen.getByRole("button", { name: /Siguiente/ }));
    await waitFor(() => expect(screen.getByText("Paso 3 de 8 · Horario")).toBeTruthy());
    expect(fetchMock.mock.calls.some(([u]) => String(u) === `/api/agent-editor/${agente.id}/draft`)).toBe(true);
  });

  it("en la bienvenida (HU-UX-23) son los pasos 5 a 9 de 9, vuelve a los del negocio y prepara la prueba", async () => {
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({ lockVersion: 2, content: BASE }), { status: 200 }));
    const volverA = vi.fn();
    const avanzar = vi.fn();
    const prepararPrueba = vi.fn(async () => null);
    const terminar = vi.fn(async () => {});
    const bienvenida = {
      pasosDelNegocio: ["Tu negocio", "Identidad", "Cómo habla", "Horario"].map((t, i) => ({ id: `negocio-${i}`, titulo: t })),
      volverA,
      avanzar,
      prepararPrueba,
      prueba: <p>Chat de prueba</p>,
      probado: false,
      terminar,
      terminando: false,
    };
    abrir({ modo: "bienvenida", pasoInicial: "habilidades", bienvenida });
    expect(screen.getByText("Paso 5 de 9 · Habilidades")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1, name: "¿Qué sabe hacer Ventas?" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Guardar cambios" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Atrás/ }));
    expect(volverA).toHaveBeenCalledWith(4);

    cleanup();
    abrir({ modo: "bienvenida", pasoInicial: "conocimiento", bienvenida });
    fireEvent.click(screen.getByRole("button", { name: /Siguiente/ }));
    await waitFor(() => expect(screen.getByText("Paso 8 de 9 · Pruébalo")).toBeTruthy());
    expect(prepararPrueba).toHaveBeenCalled();
    expect(avanzar).toHaveBeenCalledWith(8);
    expect(screen.getByText("Chat de prueba")).toBeTruthy();
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
    abrir({ modo: "bienvenida", pasoInicial: "publicar", bienvenida });
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
