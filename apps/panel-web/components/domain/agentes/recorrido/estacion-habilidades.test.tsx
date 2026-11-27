// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { EditorDeAgente } from "@/components/domain/agentes/recorrido/editor-de-agente";
import { FeedbackProviders } from "@/components/ui/providers";
import type { AgentDetail, LlmModelCatalog, Superpower } from "@/lib/api/types";
import type { FormasDePago } from "@/lib/formas-de-pago";
import type { HorarioDelAgente } from "@/lib/horario-del-agente";
import type { ToolsHttpDelAgente } from "@/lib/reglas-y-tools-del-agente";
import { violacionesGraves } from "@/lib/testing/axe";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn(), push: vi.fn() }),
}));

/** HU-UX-28: estación 2 · Habilidades de la ruta, una pregunta a la vez. */

const PEDIDO: Superpower = {
  id: "pack_commerce.tomar_pedido",
  version: "1.2.0",
  skill: "pack_commerce",
  title: "Tomar pedidos",
  description: "Pedidos del catálogo, para recoger o a domicilio.",
  phrases: ["quiero pedir dos hamburguesas", "me lo mandan a la casa", "quiero hacer un pedido"],
  group: "ventas",
  group_label: "Ventas",
};
const TRANSFERENCIA: Superpower = {
  ...PEDIDO,
  id: "pack_commerce.comprobar_transferencia",
  title: "Comprobar transferencias",
  description: "Recibe el comprobante y confirma el pago.",
  phrases: ["ya hice la transferencia", "te mando el comprobante", "ya transferí"],
};
const CITA: Superpower = {
  ...PEDIDO,
  id: "pack_agenda.agendar",
  skill: "pack_agenda",
  title: "Agendar citas",
  description: "Ofrece horarios disponibles y reserva.",
  phrases: ["quiero agendar una cita", "tienen espacio el jueves", "me das una cita para mañana"],
  group: "agenda",
  group_label: "Agenda",
};

const BASE = {
  contract: "agentspec/3",
  description: "Ventas",
  persona: { inheritConnectionVoice: true, maxLength: 500, forbiddenPhrases: [] },
  model: { primary: "deepseek-flash", temperature: 0.3, fallback: "gpt-4o-mini" },
  procedures: [
    { id: PEDIDO.id, version: "^1.0" },
    { id: TRANSFERENCIA.id, version: "^1.0" },
  ],
  memory: { shortTermTurns: 30, readScopes: ["customer", "connection", "tenant"], writeNamespaces: [] },
  tools: [{ tool: "crear_pedido", enabled: true }],
};

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
  versions: [],
} as unknown as AgentDetail;

const modelos = { items: [], min_phrases: 3, business_model: "deepseek-flash" } as unknown as LlmModelCatalog;

const FORMAS: FormasDePago = {
  agent_id: agente.id,
  configurada: true,
  forms: [
    { method: "efectivo_contraentrega", label: "Efectivo contra entrega", enabled: true, estado: "activa", falta: "", instructions: "Ten el cambio", superpoder: null },
    { method: "transferencia", label: "Transferencia", enabled: false, estado: "apagada", falta: "", instructions: "", superpoder: TRANSFERENCIA.id },
    { method: "pago_en_linea", label: "Pago en línea", enabled: false, estado: "apagada", falta: "", instructions: "", superpoder: null },
  ],
  transfer_accounts: [{ entity: "Banco", accountType: "Ahorros", accountNumber: "123", holderName: "", holderDocument: "" }],
  transfer_proof_required: true,
  transfer_ocr_enabled: false,
  pago_en_linea_disponible: false,
} as FormasDePago;

const HORARIO_DEL_NEGOCIO: HorarioDelAgente = {
  schedule: null,
  business_hours: {
    tz: "America/Bogota",
    ranges: [1, 2, 3, 4, 5].map((day) => ({ day, from: "08:00", to: "18:00" })),
  },
  source: "negocio",
  lock_version: 1,
};

const TOOLS_HTTP = { tools: [], secrets: [], omitted: [], lock_version: 1 } as unknown as ToolsHttpDelAgente;

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url: string) => {
    if (String(url).endsWith("/payment-forms")) {
      return new Response(JSON.stringify({ ...FORMAS, forms: FORMAS.forms.map((f) => ({ ...f, enabled: true })) }), { status: 200 });
    }
    return new Response(JSON.stringify({ lockVersion: 2, content: BASE }), { status: 200 });
  });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function abrir(props: Partial<Parameters<typeof EditorDeAgente>[0]> = {}) {
  return render(
    <FeedbackProviders>
      <EditorDeAgente
        agente={agente}
        superpoderes={[PEDIDO, TRANSFERENCIA]}
        modelos={modelos}
        destinos={[]}
        destinosError={null}
        puedeActivar
        modo="crear"
        pasoInicial="habilidades"
        formasDePago={FORMAS}
        horarioDelAgente={HORARIO_DEL_NEGOCIO}
        toolsHttpDelAgente={TOOLS_HTTP}
        negocio={{ nombre: "La Espiga", voz: null, resumenDeVoz: null, horario: "lun a vie, 8:00–18:00", motivos: null }}
        {...props}
      />
    </FeedbackProviders>,
  );
}

const continuar = () => fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
const listo = () => fireEvent.click(screen.getByRole("button", { name: "Listo" }));
const titulosDe = (nivel: number) => screen.getAllByRole("heading", { level: nivel }).map((h) => h.textContent);

describe("Estación 2 · Habilidades una pregunta a la vez (HU-UX-28)", () => {
  it("con Comercio pregunta en orden qué hará, cómo te pagan y las frases, y no muestra lo técnico", () => {
    abrir();
    expect(screen.getByRole("heading", { level: 1, name: "¿Qué sabe hacer Laura?" })).toBeTruthy();
    expect(screen.getByText("Tres preguntas. Lo técnico queda para después.")).toBeTruthy();
    expect(titulosDe(2)).toEqual([
      "¿Qué hará Laura por tus clientes?",
      "¿Cómo te pagan tus clientes?, pregunta 2 de 3, pendiente",
      "¿Así te escriben tus clientes?, pregunta 3 de 3, pendiente",
    ]);
    expect(screen.getByText("Pregunta 1 de 3")).toBeTruthy();
    // Los superpoderes recomendados llegan encendidos, como casillas.
    const pedido = screen.getByRole("checkbox", { name: /Tomar pedidos/ }) as HTMLInputElement;
    expect(pedido.checked).toBe(true);
    expect(screen.getByText("Faltan 3 preguntas")).toBeTruthy();
    expect((screen.getByRole("button", { name: /Guardar y seguir: Datos del cliente/ }) as HTMLButtonElement).disabled).toBe(true);
    // Tools HTTP fuera del onboarding (decisión del dueño, 2026-11-26); acciones solo en «Opciones avanzadas».
    expect(screen.queryByText(/Tools HTTP/)).toBeNull();
    expect(screen.queryByRole("heading", { name: "Formas de pago" })).toBeNull();
    const avanzadas = screen.getByText("Opciones avanzadas").closest("details") as HTMLDetailsElement;
    expect(avanzadas.open).toBe(false);
    expect(within(avanzadas).getByText("Acciones, límites por acción y horario.")).toBeTruthy();
    avanzadas.open = true;
    expect(within(avanzadas).getByRole("heading", { name: "Acciones y límites por acción" })).toBeTruthy();
    expect(within(avanzadas).getAllByRole("switch").length).toBeGreaterThan(0);

    continuar();
    expect(screen.getByText("Pregunta 2 de 3")).toBeTruthy();
    const enLinea = screen.getByRole("checkbox", { name: /Pago en línea/ });
    expect(enLinea.getAttribute("aria-describedby")).toBeTruthy();
    expect(screen.getByText("Necesita Wompi")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Conectar Wompi" }).getAttribute("href")).toBe("/conexiones/pagos");
    continuar();
    expect(screen.getByText("Pregunta 3 de 3")).toBeTruthy();
    // Una tarjeta de frases por superpoder encendido, con las sugeridas y las propias.
    expect(screen.getByRole("heading", { level: 3, name: "Tomar pedidos" })).toBeTruthy();
    expect(screen.getByRole("list", { name: "Frases sugeridas de Tomar pedidos" })).toBeTruthy();
    expect(screen.getAllByLabelText("Tus frases")).toHaveLength(2);
    listo();
    expect(screen.queryByText(/Faltan/)).toBeNull();
    expect((screen.getByRole("button", { name: /Guardar y seguir: Datos del cliente/ }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("sin Comercio (Agenda) son dos preguntas y la de frases dice «¿Así te piden una cita?»", () => {
    abrir({
      agente: { ...agente, key: "agenda", name: "Tomás", draft: { ...agente.draft, content: { ...BASE, procedures: [{ id: CITA.id, version: "^1.0" }] } } },
      superpoderes: [CITA],
      formasDePago: null,
    });
    expect(screen.getByText("Dos preguntas. Lo técnico queda para después.")).toBeTruthy();
    expect(titulosDe(2)).toEqual(["¿Qué hará Tomás por tus clientes?", "¿Así te piden una cita?, pregunta 2 de 2, pendiente"]);
    expect(screen.queryByText("¿Cómo te pagan tus clientes?")).toBeNull();
  });

  it("«Cambiar» reabre la pregunta con lo elegido y las demás quedan como estaban", () => {
    abrir();
    fireEvent.click(screen.getByRole("checkbox", { name: /Comprobar transferencias/ }));
    continuar();
    fireEvent.click(screen.getByRole("checkbox", { name: /Transferencia/ }));
    continuar();
    expect(screen.getByText("Tomar pedidos", { selector: "p" })).toBeTruthy();
    expect(screen.getByText("Contra entrega · Transferencia")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cambiar: ¿Qué hará Laura por tus clientes?" }));
    expect(screen.getByText("Pregunta 1 de 3")).toBeTruthy();
    expect((screen.getByRole("checkbox", { name: /Comprobar transferencias/ }) as HTMLInputElement).checked).toBe(false);
    expect(document.activeElement?.textContent).toBe("¿Qué hará Laura por tus clientes?");
    expect(titulosDe(2)[2]).toBe("¿Así te escriben tus clientes?, pregunta 3 de 3, pendiente");
    // Al seguir, la de pagos se abre con lo que ya había elegido.
    continuar();
    expect((screen.getByRole("checkbox", { name: /Transferencia/ }) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Cambiar: ¿Qué hará Laura por tus clientes?" }));
    // «Usar lo recomendado» vuelve a encender lo que trajo el agente y a las formas guardadas.
    expect(screen.getByText(/2 cambios/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Usar lo recomendado/ }));
    expect((screen.getByRole("checkbox", { name: /Comprobar transferencias/ }) as HTMLInputElement).checked).toBe(true);
    expect(screen.queryByText(/cambios?$/)).toBeNull();
  });

  it("al seguir guarda las formas de pago y el borrador con la frase propia, sin tocar las tools HTTP", async () => {
    abrir();
    continuar();
    fireEvent.click(screen.getByRole("checkbox", { name: /Transferencia/ }));
    continuar();
    const [caja] = screen.getAllByLabelText("Tus frases");
    fireEvent.change(caja, { target: { value: "me lo traen al trabajo" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Agregar frase" })[0]);
    // La frase propia aparece como prueba en el celular.
    const celular = screen.getByRole("region", { name: "Vista previa del agente en el celular" });
    expect(within(celular).getByRole("button", { name: "me lo traen al trabajo" })).toBeTruthy();
    listo();
    expect(screen.getByText("Frases sugeridas y 1 tuya")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Guardar y seguir: Datos del cliente/ }));
    await waitFor(() => expect(screen.getAllByText("Paso 3 de 5 · Datos del cliente").length).toBeGreaterThan(0));

    const urls = fetchMock.mock.calls.map(([u]) => String(u));
    expect(urls.some((u) => u.includes("declarative-tools"))).toBe(false);
    const formas = fetchMock.mock.calls.find(([u]) => String(u) === `/api/pack/commerce/agents/${agente.id}/payment-forms`);
    expect(formas?.[1].method).toBe("PUT");
    // El mismo cuerpo de Personalizar: solo cambia lo encendido; instrucciones y cuentas quedan como estaban.
    expect(JSON.parse(formas?.[1].body)).toEqual({
      forms: [
        { method: "efectivo_contraentrega", enabled: true, instructions: "Ten el cambio" },
        { method: "transferencia", enabled: true, instructions: "" },
        { method: "pago_en_linea", enabled: false, instructions: "" },
      ],
      transfer_accounts: FORMAS.transfer_accounts,
      transfer_proof_required: true,
      transfer_ocr_enabled: false,
    });
    const borrador = fetchMock.mock.calls.find(([u]) => String(u) === `/api/agent-editor/${agente.id}/draft`);
    expect(urls.indexOf(`/api/pack/commerce/agents/${agente.id}/payment-forms`)).toBeLessThan(
      urls.indexOf(`/api/agent-editor/${agente.id}/draft`),
    );
    expect(JSON.parse(borrador?.[1].body).content.procedures).toEqual([
      { id: PEDIDO.id, version: "^1.0", overrides: { examples: ["me lo traen al trabajo"] } },
      { id: TRANSFERENCIA.id, version: "^1.0" },
    ]);
  });

  it("si no cambian las formas de pago no las vuelve a guardar, y suma la frase escrita sin agregar", async () => {
    abrir();
    continuar();
    continuar();
    fireEvent.change(screen.getAllByLabelText("Tus frases")[1], { target: { value: "ya consigné" } });
    listo();
    fireEvent.click(screen.getByRole("button", { name: /Guardar y seguir: Datos del cliente/ }));
    await waitFor(() => expect(screen.getAllByText("Paso 3 de 5 · Datos del cliente").length).toBeGreaterThan(0));
    const urls = fetchMock.mock.calls.map(([u]) => String(u));
    expect(urls.some((u) => u.endsWith("/payment-forms"))).toBe(false);
    const borrador = fetchMock.mock.calls.find(([u]) => String(u) === `/api/agent-editor/${agente.id}/draft`);
    expect(JSON.parse(borrador?.[1].body).content.procedures[1]).toEqual({
      id: TRANSFERENCIA.id,
      version: "^1.0",
      overrides: { examples: ["ya consigné"] },
    });
  });

  it("si falla el guardado de las formas de pago, no sigue y reabre esa pregunta con el error", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      String(url).endsWith("/payment-forms")
        ? new Response(JSON.stringify({ error: { message: "Deja al menos una forma de pago encendida." } }), { status: 422 })
        : new Response(JSON.stringify({ lockVersion: 2, content: BASE }), { status: 200 }),
    );
    abrir();
    continuar();
    fireEvent.click(screen.getByRole("checkbox", { name: /Pago en línea/ }));
    continuar();
    listo();
    fireEvent.click(screen.getByRole("button", { name: /Guardar y seguir: Datos del cliente/ }));
    await waitFor(() => expect(screen.getByText("Pregunta 2 de 3")).toBeTruthy());
    expect(screen.getAllByText("Deja al menos una forma de pago encendida.").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Paso 2 de 5 · Habilidades").length).toBeGreaterThan(0);
    expect(fetchMock.mock.calls.some(([u]) => String(u).endsWith("/draft"))).toBe(false);
  });

  it("«Opciones avanzadas» muestra el horario del negocio, solo para leer, con «Cambiar» a Personalizar › Horario y reglas", () => {
    abrir();
    const horario = screen.getByText(/^Atiende en el horario del negocio:/);
    expect(horario.textContent).toContain("8:00");
    const cambiar = screen.getByRole("link", { name: "Cambiar el horario en Personalizar" });
    expect(cambiar.textContent).toBe("Cambiar");
    expect(cambiar.getAttribute("href")).toBe(`/agentes/${agente.id}/personalizar?paso=reglas`);
    cleanup();
    abrir({
      horarioDelAgente: {
        ...HORARIO_DEL_NEGOCIO,
        source: "agente",
        schedule: { tz: "America/Bogota", ranges: [{ day: 6, from: "09:00", to: "13:00" }] },
      },
    });
    expect(screen.getByText(/^Atiende en su propio horario:/).textContent).toContain("9:00");
    cleanup();
    // Sin respuesta de la API, el horario del negocio de Configuración.
    abrir({ horarioDelAgente: null });
    expect(screen.getByText(/^Atiende en el horario del negocio: lun a vie, 8:00–18:00/)).toBeTruthy();
  });

  it("en la bienvenida es la misma estación y, al volver a ella, llega con todo respondido", async () => {
    const bienvenida = {
      pasosDelNegocio: [{ id: "negocio-negocio", titulo: "Tu negocio" }],
      volverA: vi.fn(),
      avanzar: vi.fn(),
      seguirDespues: () => null,
      prepararPrueba: vi.fn(async () => null),
      conexionDePrueba: null,
      onRespuesta: vi.fn(),
      probado: false,
      terminar: vi.fn(async () => {}),
      terminando: false,
    };
    abrir({ modo: "bienvenida", bienvenida });
    expect(screen.getByRole("heading", { level: 2, name: "¿Qué hará Laura por tus clientes?" })).toBeTruthy();
    continuar();
    continuar();
    listo();
    fireEvent.click(screen.getByRole("button", { name: /Guardar y seguir: Datos del cliente/ }));
    await waitFor(() => expect(bienvenida.avanzar).toHaveBeenCalledWith(3));
    fireEvent.click(screen.getByRole("button", { name: /Atrás/ }));
    expect(screen.getAllByText("Paso 2 de 5 · Habilidades").length).toBeGreaterThan(0);
    expect(screen.queryByText(/^Pregunta \d de 3$/)).toBeNull();
    expect(screen.getByRole("button", { name: "Cambiar: ¿Cómo te pagan tus clientes?" })).toBeTruthy();
  });

  it("en la bienvenida lo que se hace después va como texto, sin enlaces que el recorrido no deja abrir", () => {
    const requisitos = [
      { skill: "pack_commerce", kind: "sin_contenido", title: "Aún no hay productos", explanation: "", section: "pack_commerce", content: "catalogo" },
    ] as unknown as Parameters<typeof EditorDeAgente>[0]["requisitos"];
    const bienvenida = {
      pasosDelNegocio: [{ id: "negocio-negocio", titulo: "Tu negocio" }],
      volverA: vi.fn(),
      avanzar: vi.fn(),
      seguirDespues: () => null,
      prepararPrueba: vi.fn(async () => null),
      conexionDePrueba: null,
      onRespuesta: vi.fn(),
      probado: false,
      terminar: vi.fn(async () => {}),
      terminando: false,
    };
    abrir({ modo: "bienvenida", bienvenida, requisitos });
    const aviso = screen.getByText("Para que funcione del todo").closest("[role=status]") as HTMLElement;
    expect(within(aviso).queryByRole("link")).toBeNull();
    expect(within(aviso).getByText("Lo haces después en Comercio › Productos.")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Cambiar el horario en Personalizar" })).toBeNull();
    const horario = screen.getByText(/^Atiende en el horario del negocio: .* Lo cambias después en Personalizar\.$/).textContent ?? "";
    // Sin punto doble cuando el horario termina en «p. m.».
    expect(horario).not.toContain("..");
    continuar();
    expect(screen.queryByRole("link", { name: "Conectar Wompi" })).toBeNull();
    expect(screen.getByText(/Lo haces después en Conexiones › Pagos\./)).toBeTruthy();
    cleanup();
    // En Nuevo agente los enlaces se quedan.
    abrir({ requisitos });
    const enNuevo = screen.getByText("Para que funcione del todo").closest("[role=status]") as HTMLElement;
    expect(within(enNuevo).getByRole("link", { name: "Cargar productos" }).getAttribute("href")).toBe("/comercio/productos");
    expect(screen.getByRole("link", { name: "Cambiar el horario en Personalizar" })).toBeTruthy();
  });

  it("sin violaciones graves de axe en cada pregunta, con «Opciones avanzadas» abierta", async () => {
    const { container } = abrir();
    expect(await violacionesGraves(container)).toEqual([]);
    continuar();
    expect(await violacionesGraves(container)).toEqual([]);
    continuar();
    (screen.getByText("Opciones avanzadas").closest("details") as HTMLDetailsElement).open = true;
    expect(await violacionesGraves(container)).toEqual([]);
  });

  it("Personalizar sigue con su página de Habilidades completa, con las tools HTTP", () => {
    abrir({ modo: "editar" });
    expect(screen.getByRole("heading", { level: 3, name: "Tools HTTP" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 3, name: "Formas de pago" })).toBeTruthy();
    expect(screen.queryByText("¿Qué hará Laura por tus clientes?")).toBeNull();
  });
});
