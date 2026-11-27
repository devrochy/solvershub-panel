// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { EditorDeAgente, type BienvenidaDelEditor } from "@/components/domain/agentes/recorrido/editor-de-agente";
import { FeedbackProviders } from "@/components/ui/providers";
import type { AgentDetail, LlmModelCatalog, PublishTarget, Superpower } from "@/lib/api/types";
import { violacionesGraves } from "@/lib/testing/axe";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn(), push }),
}));

/** HU-UX-31: estación 5 · Revisar y publicar, una pregunta a la vez, con la última prueba en el celular. */

const CITA: Superpower = {
  id: "pack_agenda.agendar",
  version: "1.0.0",
  skill: "pack_agenda",
  title: "Agendar citas",
  description: "Agenda, mueve y cancela citas.",
  phrases: ["quiero una cita", "necesito agendar", "tienen espacio mañana"],
  group: "agenda",
  group_label: "Agenda",
};

const BASE = {
  contract: "agentspec/3",
  description: "Agenda",
  persona: { inheritConnectionVoice: true, maxLength: 500, forbiddenPhrases: [] },
  model: { primary: "deepseek-flash", temperature: 0.3, fallback: "gpt-4o-mini" },
  procedures: [{ id: CITA.id, version: "^1.0" }],
  memory: { shortTermTurns: 30, readScopes: ["customer", "connection", "tenant"], writeNamespaces: [] },
  tools: [],
};

const ID = "11111111-1111-4111-8111-111111111111";
const CONEXION_DE_PRUEBAS = "22222222-2222-4222-8222-222222222222";
const agente = {
  id: ID,
  key: "agenda",
  kind: "specialist",
  contract: "agentspec/3",
  name: "Tomás",
  description: "",
  status: "active",
  nivel_ia: "estandar",
  latest_version: null,
  created_at: "2026-10-18T00:00:00Z",
  draft: { content: BASE, lock_version: 1, base_version_id: null, updated_at: "2026-10-18T00:00:00Z" },
  versions: [],
} as unknown as AgentDetail;

const modelos = { items: [], min_phrases: 1, business_model: "deepseek-flash" } as unknown as LlmModelCatalog;

const WEB: PublishTarget = {
  connection_id: "33333333-3333-4333-8333-333333333333",
  label: "Chat web",
  channel: "web",
  installed: false,
  covers_skills: true,
  missing_skills: [],
  active_release_id: null,
};
const WHATSAPP: PublishTarget = { ...WEB, connection_id: "44444444-4444-4444-8444-444444444444", label: "WhatsApp", channel: "whatsapp" };

const fetchMock = vi.fn();
const json = (cuerpo: unknown, status = 200) => new Response(JSON.stringify(cuerpo), { status });
const cuerpos = (accion: string) =>
  fetchMock.mock.calls
    .filter(([u, i]) => u === "/api/playground" && i?.method === "POST")
    .map(([, i]) => JSON.parse(String(i.body)) as Record<string, string>)
    .filter((c) => c.action === accion);

beforeEach(() => {
  push.mockReset();
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
    if (String(url).startsWith("/api/playground")) {
      if (init?.method !== "POST") return json({ turns: [] });
      const cuerpo = JSON.parse(String(init.body));
      return cuerpo.action === "message" ? json({ text: "Con gusto. ¿Qué día te sirve?" }) : json({ ok: true });
    }
    if (String(url).endsWith("/publish")) {
      return json({
        version: { version: 1 },
        warnings: [],
        connections: [
          { connection_id: WEB.connection_id, instance: "created", release_id: "r-1", release_number: 1, release_created: true, error: null },
        ],
      });
    }
    return json({ lockVersion: 2, content: BASE });
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
        superpoderes={[CITA]}
        modelos={modelos}
        destinos={[WEB]}
        destinosError={null}
        puedeActivar
        modo="crear"
        pasoInicial="probar"
        {...props}
      />
    </FeedbackProviders>,
  );
}

/** La bienvenida con su recorrido: `probado` cambia con la respuesta por la conexión de pruebas. */
function Bienvenida({ conexion = CONEXION_DE_PRUEBAS, terminar = vi.fn(async () => {}) }: { conexion?: string | null; terminar?: () => Promise<void> }) {
  const [probado, setProbado] = useState(false);
  const bienvenida: BienvenidaDelEditor = {
    pasosDelNegocio: [{ id: "negocio-0", titulo: "Tu negocio" }],
    volverA: vi.fn(),
    avanzar: vi.fn(),
    seguirDespues: () => null,
    prepararPrueba: vi.fn(async () => null),
    conexionDePrueba: conexion,
    onRespuesta: () => setProbado(true),
    probado,
    terminar,
    terminando: false,
  };
  return (
    <FeedbackProviders>
      <EditorDeAgente
        agente={agente}
        superpoderes={[CITA]}
        modelos={modelos}
        destinos={[]}
        destinosError={null}
        puedeActivar
        modo="bienvenida"
        pasoInicial="probar"
        bienvenida={bienvenida}
      />
    </FeedbackProviders>
  );
}

const pregunta = (nombre: string | RegExp) => screen.getByRole("heading", { name: nombre });
const continuar = () => fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
const estado = () => screen.getAllByRole("status").map((s) => s.textContent);
const aviso = () => screen.queryByText("Escribe aquí para probar a Tomás");

describe("estación 5 de Nuevo agente: las tres preguntas", () => {
  it("revisión con «Cambiar», última prueba y dónde atiende, una a la vez", async () => {
    abrir();
    expect(screen.getByRole("heading", { level: 1, name: "Revisa y publica a Tomás" })).toBeTruthy();
    expect(screen.getByText("Revisa, pruébalo una vez y elige dónde atiende.")).toBeTruthy();
    expect(estado()).toContain("Faltan 3 preguntas");
    expect(pregunta("¿Todo quedó como querías?")).toBeTruthy();
    const resumen = screen.getByRole("list", { name: "Lo que ya está listo" });
    expect(within(resumen).getAllByRole("button").map((b) => b.textContent)).toEqual(["Cambiar", "Cambiar", "Cambiar"]);
    expect(screen.getByText(/No queda nada por configurar: Tomás ya puede atender/)).toBeTruthy();
    continuar();
    expect(screen.getByText("Revisado")).toBeTruthy();
    expect(pregunta("Hazle una última prueba")).toBeTruthy();
    // En Nuevo agente se publica como hoy: la prueba no es obligatoria.
    continuar();
    expect(screen.getByText("Sin probar")).toBeTruthy();
    expect(pregunta("¿Dónde atiende Tomás?")).toBeTruthy();
    expect(estado()).toContain("Falta 1 pregunta");
    expect((screen.getByRole("button", { name: "Publicar a Tomás" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Listo" }));
    expect(estado()).toContain("Listo para publicar");
    expect((screen.getByRole("button", { name: "Publicar a Tomás" }) as HTMLButtonElement).disabled).toBe(false);
    // «Cambiar» de la revisión vuelve a la estación y, al regresar, la 5 abre en su primera pregunta.
    fireEvent.click(screen.getByRole("button", { name: "Cambiar: ¿Todo quedó como querías?" }));
    fireEvent.click(within(screen.getByRole("list", { name: "Lo que ya está listo" })).getByRole("button", { name: "Cambiar Habilidades" }));
    expect(screen.getAllByText("Paso 2 de 5 · Habilidades").length).toBeGreaterThan(0);
  });

  it("no lleva la nota de versión, el modelo ni los enlaces a Cómo habla, Horario y Flujo", () => {
    abrir({ modeloEfectivo: { nombre: "deepseek-flash", origen: "negocio" } });
    expect(screen.queryByLabelText(/Nota de versión/)).toBeNull();
    expect(screen.queryByText(/deepseek-flash/)).toBeNull();
    expect(screen.queryByRole("link", { name: /Cómo habla|Horario|Flujo/ })).toBeNull();
  });

  it("no tiene violaciones graves de accesibilidad", async () => {
    const { container } = abrir();
    expect(await violacionesGraves(container)).toEqual([]);
  });
});

describe("estación 5: la última prueba en el celular", () => {
  it("el aviso sale con la prueba abierta, en el celular y como punto en la burbuja, y se cierra al escribir", async () => {
    abrir();
    expect(aviso()).toBeNull();
    expect(screen.getByRole("button", { name: "Probar el chat" }).textContent).not.toContain("tiene un aviso");
    continuar();
    expect(aviso()).toBeTruthy();
    expect(screen.getByRole("button", { name: /Probar el chat/ }).textContent).toContain("tiene un aviso");
    fireEvent.change(screen.getByRole("textbox", { name: "Mensaje para Tomás" }), { target: { value: "H" } });
    expect(aviso()).toBeNull();
    expect(screen.getByRole("button", { name: "Probar el chat" }).textContent).not.toContain("tiene un aviso");
  });

  it("el aviso se cierra con su × y al tocar una frase", async () => {
    abrir();
    continuar();
    fireEvent.click(screen.getByRole("button", { name: "Cerrar aviso" }));
    expect(aviso()).toBeNull();
    cleanup();
    abrir();
    continuar();
    fireEvent.click(within(screen.getByRole("group", { name: "Frases para probar" })).getAllByRole("button")[0]);
    expect(aviso()).toBeNull();
  });

  it("en Nuevo agente le escribe al borrador por /api/playground y el agente responde en el celular", async () => {
    abrir();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(`/api/playground?agent_id=${ID}`));
    continuar();
    // Las frases son las del tipo (Agenda), porque no se cargó nada en la estación 4.
    expect(within(screen.getByRole("group", { name: "Frases para probar" })).getAllByRole("button").map((b) => b.textContent)).toEqual([
      "Hola, quiero agendar una cita",
      "¿Qué horarios tienen disponibles?",
      "Necesito cancelar mi cita",
    ]);
    fireEvent.change(screen.getByRole("textbox", { name: "Mensaje para Tomás" }), { target: { value: "¿Tienen cita mañana?" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect(await screen.findByText("Con gusto. ¿Qué día te sirve?")).toBeTruthy();
    expect(cuerpos("message")).toEqual([{ action: "message", text: "¿Tienen cita mañana?", agent_id: ID }]);
    expect(screen.getByText("Tomás respondió en el celular. Prueba otra frase o sigue.")).toBeTruthy();
    continuar();
    expect(screen.getByText("1 mensaje de prueba")).toBeTruthy();
  });

  it("al dejar la estación se cierra la prueba (el backend la purga)", async () => {
    abrir();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(`/api/playground?agent_id=${ID}`));
    fireEvent.click(screen.getByRole("button", { name: /Atrás/ }));
    await waitFor(() => expect(cuerpos("close")).toEqual([{ action: "close", agent_id: ID }]));
  });

  it("en la bienvenida va por la conexión de pruebas y no sigue ni publica sin una respuesta", async () => {
    const terminar = vi.fn(async () => {});
    render(<Bienvenida terminar={terminar} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(`/api/playground?connection_id=${CONEXION_DE_PRUEBAS}`));
    continuar();
    expect((screen.getByRole("button", { name: "Continuar" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("Para publicar a Tomás, envíale al menos una frase.")).toBeTruthy();
    fireEvent.click(within(screen.getByRole("group", { name: "Frases para probar" })).getAllByRole("button")[0]);
    expect(await screen.findByText("Con gusto. ¿Qué día te sirve?")).toBeTruthy();
    expect(cuerpos("message")[0]).toMatchObject({ connection_id: CONEXION_DE_PRUEBAS });
    continuar();
    fireEvent.click(screen.getByRole("button", { name: "Listo" }));
    fireEvent.click(screen.getByRole("button", { name: "Publicar a Tomás" }));
    expect(terminar).toHaveBeenCalled();
  });

  it("en la bienvenida sin conexión de pruebas lo dice y no muestra la caja", () => {
    render(<Bienvenida conexion={null} />);
    continuar();
    expect(screen.getAllByText(/Tomás todavía no está listo para probar/).length).toBeGreaterThan(0);
    expect(screen.queryByRole("textbox", { name: "Mensaje para Tomás" })).toBeNull();
    expect(aviso()).toBeNull();
  });
});

describe("estación 5: dónde atiende", () => {
  it("en Nuevo agente elige las conexiones de publish-targets y WhatsApp sin número lleva a Conexiones", () => {
    abrir();
    continuar();
    continuar();
    const web = screen.getByRole("switch", { name: "Atiende en Chat web" });
    expect(web.getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("link", { name: "Conectar en Conexiones" }).getAttribute("href")).toBe("/conexiones");
    fireEvent.click(web);
    expect((screen.getByRole("button", { name: "Listo" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(web);
    fireEvent.click(screen.getByRole("button", { name: "Listo" }));
    expect(screen.getAllByText("Chat web").length).toBeGreaterThan(0);
  });

  it("con WhatsApp conectado no ofrece conectarlo", () => {
    abrir({ destinos: [WEB, WHATSAPP] });
    continuar();
    continuar();
    expect(screen.getByRole("switch", { name: "Atiende en WhatsApp" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Conectar en Conexiones" })).toBeNull();
  });

  it("en la bienvenida es informativa: Chat web encendido y WhatsApp como texto", async () => {
    render(<Bienvenida />);
    continuar();
    fireEvent.click(within(screen.getByRole("group", { name: "Frases para probar" })).getAllByRole("button")[0]);
    await screen.findByText("Con gusto. ¿Qué día te sirve?");
    continuar();
    const canales = screen.getByRole("list", { name: "Canales" });
    expect(within(canales).getByText("Encendido")).toBeTruthy();
    expect(within(canales).getByText("Lo conectas después de terminar, en Conexiones.")).toBeTruthy();
    expect(within(canales).queryByRole("link")).toBeNull();
    expect(within(canales).queryByRole("switch")).toBeNull();
  });
});

describe("estación 5: opciones avanzadas", () => {
  it("lleva solo el nivel de IA, con el actual, lo que trae el plan y «Cambiar»", () => {
    abrir({ incluyeAvanzado: false });
    fireEvent.click(screen.getByText("Opciones avanzadas"));
    expect(screen.getByText("El nivel de IA con que responde.")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Nivel de IA" }).parentElement?.textContent).toContain("Estándar");
    expect(screen.getByText("Tu plan incluye Estándar. Avanzado viene en Premium y Empresarial.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Cambiar" }).getAttribute("href")).toBe(`/agentes/${ID}?tab=consumo`);
    cleanup();
    abrir({ incluyeAvanzado: true, agente: { ...agente, nivel_ia: "avanzado" } });
    expect(screen.getByRole("heading", { name: "Nivel de IA" }).parentElement?.textContent).toContain("Avanzado");
    expect(screen.getByText("Tu plan incluye Estándar y Avanzado.")).toBeTruthy();
  });

  it("en la bienvenida «Cambiar» va como texto, sin enlace", () => {
    render(<Bienvenida />);
    const nivel = screen.getByRole("heading", { name: "Nivel de IA" }).parentElement as HTMLElement;
    expect(within(nivel).queryByRole("link")).toBeNull();
    expect(nivel.textContent).toContain("Lo cambias después en la ficha del agente");
  });
});

describe("estación 5: publicar", () => {
  it("publica y activa como hoy y dice «{nombre} ya está atendiendo» con las 5 estaciones hechas", async () => {
    abrir();
    continuar();
    continuar();
    fireEvent.click(screen.getByRole("button", { name: "Listo" }));
    fireEvent.click(screen.getByRole("button", { name: "Publicar a Tomás" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Tomás ya está atendiendo" })).toBeTruthy();
    expect(screen.getByText("Atiende en Chat web. Cuando conectes WhatsApp, lo activas desde Conexiones.")).toBeTruthy();
    const publicar = fetchMock.mock.calls.find(([u]) => String(u).endsWith("/publish"));
    expect(JSON.parse(String(publicar?.[1].body))).toMatchObject({ connection_ids: [WEB.connection_id] });
    const activar = fetchMock.mock.calls.find(([u]) => u === "/api/agent-editor/activate");
    expect(JSON.parse(String(activar?.[1].body))).toEqual({ connection_id: WEB.connection_id, release_id: "r-1" });
    const ruta = screen.getByRole("navigation", { name: "Pasos para crear el agente" });
    expect(within(ruta).getAllByText(/, hecho/).length).toBeGreaterThanOrEqual(5);
    expect(screen.queryByRole("button", { name: /Atrás/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Guardar como borrador" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Ir a la ficha de Tomás" }));
    expect(push).toHaveBeenCalledWith(`/agentes/${ID}`);
  });
});
