// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { EditorDeAgente } from "@/components/domain/agentes/recorrido/editor-de-agente";
import { FeedbackProviders } from "@/components/ui/providers";
import type { AgentDetail, LlmModelCatalog, Superpower } from "@/lib/api/types";
import type { AvisoDatos } from "@/lib/aviso-datos";
import type { AgenteDatos } from "@/lib/datos-cliente";
import { violacionesGraves } from "@/lib/testing/axe";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn(), push: vi.fn() }),
}));

/** HU-UX-29: estación 3 · Datos del cliente de la ruta, por tipo de entrega, una pregunta a la vez. */

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

const BASE = {
  contract: "agentspec/3",
  description: "Ventas",
  persona: { inheritConnectionVoice: true, maxLength: 500, forbiddenPhrases: [] },
  model: { primary: "deepseek-flash", temperature: 0.3, fallback: "gpt-4o-mini" },
  procedures: [{ id: PEDIDO.id, version: "^1.0" }],
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

type Nivel = "requerido" | "recomendado" | "no_pedir";
const campo = (clave: string, etiqueta: string, nivel: Nivel, ajustable = true) => ({
  clave,
  etiqueta,
  nivel,
  por_defecto: nivel,
  ajustable,
  ajustado: false,
});

/** Las dos operaciones de entrega de Comercio, como las arma `pack_commerce/datos.py`. */
const DE_VENTAS: AgenteDatos = {
  agente_id: agente.id,
  niveles: ["requerido", "recomendado", "no_pedir"],
  herramientas_del_agente: false,
  metodos_entrega: ["domicilio", "recoger_en_tienda"],
  procedimientos: [{ id: PEDIDO.id, titulo: "Tomar pedidos", datos: [{ clave: "producto", etiqueta: "Producto", obligatorio: true }] }],
  acciones: [
    {
      id: "ventas.pedido_domicilio",
      modulo: "ventas",
      etiqueta: "Pedido a domicilio",
      campos: [
        campo("name", "Nombre completo", "requerido"),
        campo("address", "Dirección", "requerido", false),
        campo("email", "Correo", "no_pedir"),
      ],
    },
    {
      id: "ventas.pedido_retiro",
      modulo: "ventas",
      etiqueta: "Pedido para recoger en tienda",
      campos: [campo("name", "Nombre completo", "requerido"), campo("email", "Correo", "no_pedir")],
    },
  ],
};

const DE_AGENDA: AgenteDatos = {
  ...DE_VENTAS,
  procedimientos: [],
  acciones: [
    {
      id: "agenda.agendar_cita",
      modulo: "agenda",
      etiqueta: "Agendar una cita",
      campos: [campo("email", "Correo", "requerido", false), campo("name", "Nombre completo", "recomendado")],
    },
  ],
};

const AVISO: AvisoDatos = {
  activo: false,
  texto: "Usamos tus datos para atenderte.",
  texto_propio: "",
  es_borrador: true,
  version: "abc123",
};

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () => new Response(JSON.stringify({ lockVersion: 2, content: BASE }), { status: 200 }));
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
        superpoderes={[PEDIDO]}
        modelos={modelos}
        destinos={[]}
        destinosError={null}
        puedeActivar
        modo="crear"
        pasoInicial="datos-cliente"
        datosCliente={DE_VENTAS}
        avisoDeDatos={AVISO}
        negocio={{ nombre: "La Espiga", voz: null, resumenDeVoz: null, horario: null, motivos: null }}
        {...props}
      />
    </FeedbackProviders>,
  );
}

const continuar = () => fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
const listo = () => fireEvent.click(screen.getByRole("button", { name: "Listo" }));
const titulos = () => screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
const entrega = (nombre: RegExp) => screen.getByRole("checkbox", { name: nombre }) as HTMLInputElement;
const nivel = (dato: string, etiqueta: "Siempre" | "Si se puede" | "No") =>
  within(screen.getByRole("group", { name: `${dato}: cuándo lo pide` })).getByRole("button", { name: etiqueta });
const seguir = () => screen.getByRole("button", { name: /Guardar y seguir: Datos para probar/ }) as HTMLButtonElement;
const cuerpoDelPut = () => {
  const put = fetchMock.mock.calls.find(([u]) => String(u).endsWith("/datos-cliente"));
  return put ? JSON.parse(put[1].body) : null;
};

describe("Estación 3 · Datos del cliente por tipo de entrega (HU-UX-29)", () => {
  it("en Ventas empieza por «¿Cómo entregas los pedidos?» y sigue con una pregunta por entrega y la de recordar", async () => {
    const { container } = abrir();
    expect(screen.getByRole("heading", { level: 1, name: "¿Qué datos pide Laura?" })).toBeTruthy();
    expect(titulos()).toEqual([
      "¿Cómo entregas los pedidos?",
      "A domicilio · ¿Qué datos pide?, pregunta 2 de 4, pendiente",
      "Recoger en tienda · ¿Qué datos pide?, pregunta 3 de 4, pendiente",
      "¿Recuerda a quien ya te escribió?, pregunta 4 de 4, pendiente",
    ]);
    expect(entrega(/A domicilio/).checked).toBe(true);
    expect(entrega(/Recoger en tienda/).checked).toBe(true);
    expect(screen.getByText("Faltan 4 preguntas")).toBeTruthy();
    expect(seguir().disabled).toBe(true);
    // Salen de la estación (dueño, 2026-11-26): atajos, datos de cada superpoder y «Restablecer».
    expect(screen.queryByRole("radiogroup", { name: "Cuánto pregunta" })).toBeNull();
    expect(screen.queryByText("Lo justo")).toBeNull();
    expect(screen.queryByText("Datos que exige cada superpoder")).toBeNull();
    expect(screen.queryByRole("button", { name: /Restablecer/ })).toBeNull();
    expect(await violacionesGraves(container)).toEqual([]);
  });

  it("con solo «Recoger en tienda» no aparece la pregunta de «A domicilio», y sin ninguna no deja seguir", () => {
    abrir();
    fireEvent.click(entrega(/A domicilio/));
    expect(titulos()).toEqual([
      "¿Cómo entregas los pedidos?",
      "Recoger en tienda · ¿Qué datos pide?, pregunta 2 de 3, pendiente",
      "¿Recuerda a quien ya te escribió?, pregunta 3 de 3, pendiente",
    ]);
    fireEvent.click(entrega(/Recoger en tienda/));
    expect(screen.getByRole("alert").textContent).toContain("Marca al menos una");
    expect((screen.getByRole("button", { name: "Continuar" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(entrega(/Recoger en tienda/));
    continuar();
    expect(screen.getByRole("heading", { level: 2, name: "Recoger en tienda · ¿Qué datos pide?" })).toBeTruthy();
    expect(screen.queryByText(/A domicilio · ¿Qué datos pide\?/)).toBeNull();
  });

  it("los niveles son Siempre, Si se puede y No; lo que exige el sistema va con candado; se envía como requerido", async () => {
    abrir();
    continuar();
    const grupo = screen.getByRole("group", { name: "Nombre completo: cuándo lo pide" });
    expect(within(grupo).getAllByRole("button").map((b) => b.textContent)).toEqual(["Siempre", "Si se puede", "No"]);
    expect(nivel("Nombre completo", "Siempre").getAttribute("aria-pressed")).toBe("true");
    // La dirección no es ajustable: candado, «Necesario para…» y sin control.
    expect(screen.queryByRole("group", { name: "Dirección: cuándo lo pide" })).toBeNull();
    expect(screen.getByText("Necesario para pedido a domicilio.")).toBeTruthy();
    fireEvent.click(nivel("Correo", "Siempre"));
    continuar();
    // La respondida resume lo elegido.
    expect(screen.getByText("Siempre: nombre completo, dirección y correo")).toBeTruthy();
    fireEvent.click(nivel("Correo", "Si se puede"));
    continuar();
    listo();
    fireEvent.click(seguir());
    await waitFor(() => expect(cuerpoDelPut()).not.toBeNull());
    expect(cuerpoDelPut()).toEqual({
      politica: { "ventas.pedido_domicilio": { email: "requerido" }, "ventas.pedido_retiro": { email: "recomendado" } },
      herramientas_del_agente: false,
      metodos_entrega: ["domicilio", "recoger_en_tienda"],
    });
  });

  it("al apagar «A domicilio» su pregunta desaparece y su política se conserva, también en lo que se envía", async () => {
    abrir();
    continuar();
    fireEvent.click(nivel("Correo", "Si se puede"));
    continuar();
    // Vuelve a la primera y apaga «A domicilio».
    fireEvent.click(screen.getByRole("button", { name: "Cambiar: ¿Cómo entregas los pedidos?" }));
    fireEvent.click(entrega(/A domicilio/));
    expect(screen.queryByText(/A domicilio · ¿Qué datos pide\?/)).toBeNull();
    // Al encenderla otra vez, vuelve con lo ajustado.
    fireEvent.click(entrega(/A domicilio/));
    continuar();
    expect(screen.getByRole("heading", { level: 2, name: "A domicilio · ¿Qué datos pide?" })).toBeTruthy();
    expect(nivel("Correo", "Si se puede").getAttribute("aria-pressed")).toBe("true");
    // Apagada, se guarda igual con su ajuste.
    fireEvent.click(screen.getByRole("button", { name: "Cambiar: ¿Cómo entregas los pedidos?" }));
    fireEvent.click(entrega(/A domicilio/));
    continuar();
    continuar();
    listo();
    fireEvent.click(seguir());
    await waitFor(() => expect(cuerpoDelPut()).not.toBeNull());
    expect(cuerpoDelPut()).toEqual({
      politica: { "ventas.pedido_domicilio": { email: "recomendado" }, "ventas.pedido_retiro": {} },
      herramientas_del_agente: false,
      metodos_entrega: ["recoger_en_tienda"],
    });
  });

  it("en Agenda la pregunta es «¿Qué datos pide para agendar una cita?», sin la de entregas", () => {
    abrir({ agente: { ...agente, key: "agenda", name: "Tomás" }, datosCliente: DE_AGENDA });
    expect(titulos()).toEqual([
      "¿Qué datos pide para agendar una cita?",
      "¿Recuerda a quien ya te escribió?, pregunta 2 de 2, pendiente",
    ]);
    expect(screen.queryByText("¿Cómo entregas los pedidos?")).toBeNull();
    expect(screen.getByText("Necesario para agendar una cita.")).toBeTruthy();
    expect(screen.getByText("Cada operación pide sus propios datos. Viene con lo justo, como lo recomienda SolversHub.")).toBeTruthy();
  });

  it("«Sí, que lo recuerde» guarda herramientas_del_agente=true", async () => {
    abrir({ agente: { ...agente, key: "agenda", name: "Tomás" }, datosCliente: DE_AGENDA });
    continuar();
    fireEvent.click(screen.getByRole("radio", { name: /Sí, que lo recuerde/ }));
    listo();
    expect(screen.getByText("Sí, consulta sus datos e historial")).toBeTruthy();
    expect(seguir().disabled).toBe(false);
    fireEvent.click(seguir());
    await waitFor(() => expect(cuerpoDelPut()).not.toBeNull());
    expect(cuerpoDelPut().herramientas_del_agente).toBe(true);
  });

  it("«Usar lo recomendado» vuelve los niveles, las entregas y la memoria a lo recomendado", () => {
    abrir();
    fireEvent.click(entrega(/A domicilio/));
    continuar();
    fireEvent.click(nivel("Correo", "Siempre"));
    expect(screen.getByText(/2 cambios/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Usar lo recomendado" }));
    expect(screen.queryByRole("button", { name: "Usar lo recomendado" })).toBeNull();
    // Con otras entregas se vuelve a la primera pregunta.
    expect(screen.getByText("Pregunta 1 de 4")).toBeTruthy();
    expect(entrega(/A domicilio/).checked).toBe(true);
  });

  it("en «Opciones avanzadas» va solo el aviso de datos: en Nuevo agente con enlace a Configuración", () => {
    abrir();
    const avanzadas = screen.getByText("Opciones avanzadas").closest("details") as HTMLDetailsElement;
    expect(within(avanzadas).getByText("El aviso de tratamiento de datos.")).toBeTruthy();
    avanzadas.open = true;
    expect(within(avanzadas).getByText(/Apagado. El texto es un borrador sin revisión legal./)).toBeTruthy();
    expect(within(avanzadas).getByRole("link", { name: /Cambiar el aviso/ }).getAttribute("href")).toBe("/configuracion?seccion=datos-cliente");
  });

  it("en la bienvenida el aviso va como texto, sin enlace, porque el panel no se abre hasta terminar", () => {
    const bienvenida = {
      pasosDelNegocio: [{ id: "negocio-negocio", titulo: "Tu negocio" }],
      volverA: vi.fn(),
      avanzar: vi.fn(),
      seguirDespues: () => null,
      prepararPrueba: vi.fn(async () => null),
      prueba: () => null,
      probado: false,
      terminar: vi.fn(async () => {}),
      terminando: false,
    };
    abrir({ modo: "bienvenida", bienvenida, avisoDeDatos: { ...AVISO, activo: true } });
    const avanzadas = screen.getByText("Opciones avanzadas").closest("details") as HTMLDetailsElement;
    avanzadas.open = true;
    expect(within(avanzadas).getByText(/Activo: el agente lo muestra antes de pedir datos personales. Lo cambias después en Configuración./)).toBeTruthy();
    expect(within(avanzadas).queryByRole("link")).toBeNull();
  });

  it("sin el aviso no hay «Opciones avanzadas»", () => {
    abrir({ avisoDeDatos: null });
    expect(screen.queryByText("Opciones avanzadas")).toBeNull();
  });

  it("Personalizar sigue con su paso de hoy: atajos, interruptores y «Restablecer»", () => {
    abrir({ modo: "editar" });
    expect(screen.getByRole("radiogroup", { name: "Cuánto pregunta" })).toBeTruthy();
    expect(screen.getByRole("switch", { name: "Ofrecer a domicilio" })).toBeTruthy();
    expect(screen.getByText("Datos que exige cada superpoder")).toBeTruthy();
    expect(screen.queryByText("¿Cómo entregas los pedidos?")).toBeNull();
  });
});

describe("llegar a la estación 3 (HU-UX-29)", () => {
  it("volviendo desde la 4 llega todo respondido, como la estación 2", () => {
    abrir({ pasoInicial: "conocimiento" });
    fireEvent.click(screen.getByRole("button", { name: "Atrás" }));
    expect(screen.getByRole("heading", { level: 1, name: "¿Qué datos pide Laura?" })).toBeTruthy();
    expect(screen.queryByText(/Pregunta \d de/)).toBeNull();
    expect(screen.queryByText(/Faltan/)).toBeNull();
    expect(seguir().disabled).toBe(false);
  });

  it("«Seguir después» con las dos entregas desmarcadas guarda las de antes, no una lista vacía", async () => {
    let guardar: (() => Promise<boolean>) | null = null;
    const bienvenida = {
      pasosDelNegocio: [{ id: "negocio-negocio", titulo: "Tu negocio" }],
      volverA: vi.fn(),
      avanzar: vi.fn(),
      seguirDespues: (o: { guardar: () => Promise<boolean> }) => {
        guardar = o.guardar;
        return null;
      },
      prepararPrueba: vi.fn(async () => null),
      prueba: () => null,
      probado: false,
      terminar: vi.fn(async () => {}),
      terminando: false,
    };
    abrir({ modo: "bienvenida", bienvenida });
    fireEvent.click(entrega(/A domicilio/));
    fireEvent.click(entrega(/Recoger en tienda/));
    expect(await (guardar as unknown as () => Promise<boolean>)()).toBe(true);
    expect(cuerpoDelPut().metodos_entrega).toEqual(["domicilio", "recoger_en_tienda"]);
  });
});
