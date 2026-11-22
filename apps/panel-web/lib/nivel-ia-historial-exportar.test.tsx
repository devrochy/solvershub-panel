// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { NivelDeIa } from "@/components/domain/agentes/nivel-de-ia";
import { ExportarConversaciones, RUTA_EXPORTAR_CONVERSACIONES } from "@/components/domain/exportar-conversaciones";
import { FeedbackProviders } from "@/components/ui/providers";
import type { PlanResponse } from "@/lib/api/types";
import { funcionesEnPalabras } from "@/lib/consumo";
import { creditosEnPalabras, CREDITOS_POR_CONVERSACION, incluyeAvanzado } from "@/lib/nivel-ia";
import {
  avisoDeHistorial,
  esLimiteDePlan,
  funcionesDelPlanActual,
  incluyeExportar,
  RUTA_MEJORAR_PLAN,
} from "@/lib/plan-limite";
import { RESPUESTAS, plan as planBasic, planesV3 } from "@/lib/testing/fixtures";
import { resolverServidor } from "@/lib/testing/servidor";

// HU-BILL-27, parte 2a: el nivel de IA por agente (HU-BILL-24), la conversación fuera del historial del plan
// y «Exportar conversaciones» (HU-BILL-25). El negocio nunca ve el modelo.

const respuestas: Record<string, unknown> = { ...RESPUESTAS };
const errores: Record<string, { status: number; error: string; code?: string; details?: Record<string, unknown> }> = {};

vi.mock("@/lib/api/server", async (original) => ({
  ...(await original<typeof import("@/lib/api/server")>()),
  apiFetch: vi.fn(async (ruta: string) => {
    const clave = ruta.split("?")[0];
    if (errores[clave]) return { ok: false, ...errores[clave] };
    const data = respuestas[clave];
    return data === undefined ? { ok: false, status: 404, error: `Sin fixture para ${ruta}` } : { ok: true, status: 200, data };
  }),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, getAll: () => [], has: () => false }),
  headers: async () => new Headers(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => "/conversaciones",
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

beforeAll(() => {
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  for (const clave of Object.keys(errores)) delete errores[clave];
  respuestas["/admin/plan"] = RESPUESTAS["/admin/plan"];
  window.localStorage.clear();
});

const conPlan = (id: string): PlanResponse => ({ ...planBasic, plans: planesV3.map((p) => ({ ...p, current: p.id === id })) });

describe("lógica del plan (HU-BILL-24/25)", () => {
  it("el 409 de nivel de IA es del plan: ofrece «Mejorar mi plan»", () => {
    expect(esLimiteDePlan("plan_nivel_ia_not_included")).toBe(true);
    expect(esLimiteDePlan("nivel_ia_not_applicable")).toBe(false);
  });

  it("Avanzado y Exportar solo en Premium y Empresarial; sin plan leído no se sabe", () => {
    for (const [id, si] of [["free", false], ["basic", false], ["premium", true], ["empresarial", true]] as const) {
      const funciones = funcionesDelPlanActual(conPlan(id));
      expect(incluyeAvanzado(funciones)).toBe(si);
      expect(incluyeExportar(funciones)).toBe(si);
    }
    expect(incluyeAvanzado(funcionesDelPlanActual(null))).toBeNull();
    expect(incluyeExportar(funcionesDelPlanActual({ ...planBasic, plans: [] }))).toBeNull();
  });

  it("créditos aproximados por conversación, sin el modelo", () => {
    expect(CREDITOS_POR_CONVERSACION).toEqual({ estandar: 11, avanzado: 45 });
    expect(creditosEnPalabras("estandar")).toBe("≈ 11 créditos por conversación");
    expect(creditosEnPalabras("avanzado")).toBe("≈ 45 créditos por conversación");
  });

  it("el aviso de historial cita los días del plan y dice que no se borró nada", () => {
    const aviso = avisoDeHistorial({
      status: 409,
      code: "plan_feature_not_included",
      details: { feature: "historial", plan: "basic", historial_dias: 90 },
    });
    expect(aviso?.titulo).toBe("Esta conversación es de hace más de 90 días");
    expect(aviso?.descripcion).toMatch(/^Tu plan muestra 90 días de historial\. No se borró nada/);
    // Otro 409 del plan (exportar) u otro error no es este aviso.
    expect(avisoDeHistorial({ code: "plan_feature_not_included", details: { feature: "exportar", plan: "basic" } })).toBeNull();
    expect(avisoDeHistorial({ status: 404, code: "not_found" })).toBeNull();
    // Sin los días, el aviso no inventa un número.
    expect(avisoDeHistorial({ code: "plan_feature_not_included", details: { feature: "historial" } })?.titulo).not.toMatch(/\d/);
  });

  it("la tarjeta del plan nombra Exportar en palabras", () => {
    expect(funcionesEnPalabras({ exportar: true })).toEqual(["Descarga tu historial en CSV"]);
    expect(funcionesEnPalabras({ exportar: false })).toEqual([]);
  });
});

function montarNivel(props: Partial<Parameters<typeof NivelDeIa>[0]> = {}) {
  return render(
    <FeedbackProviders>
      <NivelDeIa agenteId="11111111-1111-4111-8111-111111111111" inicial="estandar" incluyeAvanzado={null} puedeEditar {...props} />
    </FeedbackProviders>,
  );
}

describe("selector de nivel de IA", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("muestra los dos niveles con sus créditos, «Se aplica al publicar» y nunca un modelo", () => {
    const { container } = montarNivel();
    expect(screen.getByRole("radio", { name: /Estándar · ≈ 11 créditos por conversación/ })).toBeTruthy();
    expect(screen.getByRole("radio", { name: /Avanzado · ≈ 45 créditos por conversación/ })).toBeTruthy();
    expect(screen.getByText(/Se aplica al publicar/)).toBeTruthy();
    expect(container.textContent).not.toMatch(/deepseek|gpt|modelo/i);
  });

  it("sin Avanzado en el plan: la opción atenuada y «Mejorar mi plan»", () => {
    montarNivel({ incluyeAvanzado: false });
    expect((screen.getByRole("radio", { name: /Avanzado/ }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("radio", { name: /Estándar/ }) as HTMLButtonElement).disabled).toBe(false);
    expect(screen.getByRole("link", { name: "Mejorar mi plan" }).getAttribute("href")).toBe(RUTA_MEJORAR_PLAN);
  });

  it("si el plan ya no incluye Avanzado, el nivel vigente se ve y se puede volver a Estándar", () => {
    montarNivel({ inicial: "avanzado", incluyeAvanzado: false });
    expect(screen.getByText(/Tu plan ya no incluye Avanzado: este agente atiende en Estándar/)).toBeTruthy();
    expect((screen.getByRole("radio", { name: /Estándar/ }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("elegir guarda solo el nivel en el agente", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    montarNivel({ incluyeAvanzado: true });
    fireEvent.click(screen.getByRole("radio", { name: /Avanzado/ }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/agent-editor/11111111-1111-4111-8111-111111111111");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({ nivel_ia: "avanzado" });
    expect(await screen.findByText(/Nivel Avanzado guardado\. Se aplica al publicar\./)).toBeTruthy();
  });

  it("con el plan sin leer, el 409 de la API vuelve a Estándar y ofrece «Mejorar mi plan»", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ error: "Tu plan Basic no incluye el nivel Avanzado.", code: "plan_nivel_ia_not_included" }),
        { status: 409 },
      ),
    );
    montarNivel();
    const avanzado = screen.getByRole("radio", { name: /Avanzado/ });
    fireEvent.click(avanzado);
    expect(await screen.findByText("Tu plan Basic no incluye el nivel Avanzado.")).toBeTruthy();
    await waitFor(() => expect(screen.getByRole("radio", { name: /Estándar/ }).getAttribute("aria-checked")).toBe("true"));
    expect(screen.getAllByRole("link", { name: "Mejorar mi plan" }).length).toBeGreaterThan(0);
  });

  it("sin permiso de edición se ve el nivel pero no se cambia", () => {
    montarNivel({ puedeEditar: false });
    expect((screen.getByRole("radio", { name: /Avanzado/ }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("botón «Exportar conversaciones»", () => {
  it("con `features.exportar` descarga el CSV del BFF", () => {
    render(<ExportarConversaciones incluido />);
    const enlace = screen.getByRole("link", { name: /Exportar conversaciones/ });
    expect(enlace.getAttribute("href")).toBe(RUTA_EXPORTAR_CONVERSACIONES);
    expect(enlace.hasAttribute("download")).toBe(true);
  });

  it("sin el feature: atenuado, «Disponible en Premium» y enlace a mejorar el plan", () => {
    render(<ExportarConversaciones incluido={false} />);
    expect((screen.getByRole("button", { name: /Exportar conversaciones/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/Disponible en Premium/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Mejorar mi plan" }).getAttribute("href")).toBe(RUTA_MEJORAR_PLAN);
  });

  it("sin el plan leído no se muestra", () => {
    const { container } = render(<ExportarConversaciones incluido={null} />);
    expect(container.textContent).toBe("");
  });
});

async function renderBandeja(searchParams: Record<string, string>) {
  const { default: Pagina } = await import("@/app/(app)/conversaciones/page");
  const arbol = await resolverServidor(await Pagina({ searchParams: Promise.resolve(searchParams) }));
  return render(<FeedbackProviders>{arbol}</FeedbackProviders>);
}

describe("bandeja: historial y exportar", () => {
  it("una conversación fuera del historial muestra el aviso del plan, no un error genérico", async () => {
    errores["/admin/conversations/conv-vieja"] = {
      status: 409,
      error: "Tu plan no incluye esto.",
      code: "plan_feature_not_included",
      details: { feature: "historial", plan: "basic", historial_dias: 90 },
    };
    await renderBandeja({ c: "conv-vieja" });
    const chat = screen.getByRole("region", { name: "Conversación" });
    expect(within(chat).getByText("Esta conversación es de hace más de 90 días")).toBeTruthy();
    expect(within(chat).getByText(/Tu plan muestra 90 días de historial\. No se borró nada/)).toBeTruthy();
    expect(within(chat).getByRole("link", { name: "Mejorar mi plan" }).getAttribute("href")).toBe(RUTA_MEJORAR_PLAN);
    expect(within(chat).queryByText(/No pudimos abrir la conversación/)).toBeNull();
    expect(within(chat).queryByText(/Detalle técnico/)).toBeNull();
  });

  it("Basic: «Exportar conversaciones» atenuado; Premium: habilitado", async () => {
    await renderBandeja({});
    expect((screen.getByRole("button", { name: /Exportar conversaciones/ }) as HTMLButtonElement).disabled).toBe(true);
    cleanup();
    respuestas["/admin/plan"] = conPlan("premium");
    await renderBandeja({});
    expect(screen.getByRole("link", { name: /Exportar conversaciones/ }).getAttribute("href")).toBe(RUTA_EXPORTAR_CONVERSACIONES);
  });

  it("sin acceso al plan, el botón no aparece y la bandeja abre igual", async () => {
    errores["/admin/plan"] = { status: 403, error: "Sin permiso." };
    await renderBandeja({});
    expect(screen.getByRole("navigation", { name: "Lista de conversaciones" })).toBeTruthy();
    expect(screen.queryByText(/Exportar conversaciones/)).toBeNull();
  });
});
