// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { EditorDeAgente } from "@/app/(app)/agentes/[id]/editar/_components/editor-de-agente";
import { PasoSuperpoderes } from "@/app/(app)/agentes/[id]/editar/_components/pasos";
import { FeedbackProviders } from "@/components/ui/providers";
import type { AgentDetail, LlmModelCatalog, PublishTarget, Superpower } from "@/lib/api/types";

import {
  contenidoDesdeEstado,
  erroresDelPaso,
  erroresPorSuperpoder,
  estadoDesdeBorrador,
  frasesDistintas,
  pasoDelCampo,
  rangoCompatible,
  textoDeCosto,
} from "./agentes-editor";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn(), push: vi.fn() }),
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
    const errores = erroresDelPaso("superpoderes", estado, [PEDIDO, PLAN], { minFrases: 3 });
    expect(errores).toEqual({
      "procedures[0].overrides.examples": "«Tomar un pedido» necesita al menos 3 frases distintas de clientes: agrega 2 más.",
    });
  });

  it("al menos un superpoder, un nombre y una conexión", () => {
    const sin = { ...estado, nombre: " ", superpoderes: {} };
    expect(erroresDelPaso("superpoderes", sin, [PEDIDO], { minFrases: 3 })).toHaveProperty("procedures");
    expect(erroresDelPaso("identidad", sin, [PEDIDO], { minFrases: 3 })).toHaveProperty("name");
    expect(erroresDelPaso("publicar", sin, [PEDIDO], { minFrases: 3, conexiones: [] })).toHaveProperty("connection_ids");
  });

  it("cada error de la API va a su paso y a su superpoder", () => {
    expect(pasoDelCampo("model.primary")).toBe("modelo");
    expect(pasoDelCampo("procedures[1].overrides.examples")).toBe("superpoderes");
    expect(pasoDelCampo("memory.readScopes")).toBe("memoria");
    expect(pasoDelCampo("connection_ids[0]")).toBe("publicar");
    expect(pasoDelCampo("persona.maxLength")).toBe("identidad");
    expect(erroresPorSuperpoder({ "procedures[0].overrides.examples": "Faltan frases." }, BASE)).toEqual({
      [PEDIDO.id]: "Faltan frases.",
    });
  });

  it("costo estimado: sin consumo lo dice", () => {
    expect(textoDeCosto(null)).toMatch(/Sin estimado/);
    expect(textoDeCosto(0.392)).toMatch(/0,392 por cada 1\.000 respuestas/);
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
    fireEvent.click(screen.getByRole("button", { name: /Paso 5/ }));
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
