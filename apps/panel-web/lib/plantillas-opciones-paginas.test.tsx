// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { FeedbackProviders } from "@/components/ui/providers";
import { me, plantillaDeOpciones } from "@/lib/testing/fixtures";
import { resolverServidor } from "@/lib/testing/servidor";

const apiFetch = vi.fn();
vi.mock("@/lib/api/server", () => ({ apiFetch: (...a: unknown[]) => apiFetch(...a) }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/plantillas-opciones",
  useSearchParams: () => new URLSearchParams(),
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));

import EditorPage from "@/app/(app)/plantillas-opciones/[clave]/page";
import ListaPage from "@/app/(app)/plantillas-opciones/page";

const BANDERA = { ok: false, status: 404, error: "No habilitadas.", code: "opciones_directas_no_habilitadas" };

function responder(rutas: Record<string, unknown>) {
  apiFetch.mockImplementation(async (ruta: string) => (ruta in rutas ? rutas[ruta] : { ok: false, status: 404, error: "sin fixture" }));
}
const bien = (data: unknown) => ({ ok: true, status: 200, data });

beforeEach(() => {
  apiFetch.mockReset();
  window.matchMedia ??= (() => ({ matches: false, addEventListener: () => undefined, removeEventListener: () => undefined })) as unknown as typeof window.matchMedia;
});
afterEach(cleanup);

async function pintar(nodo: Promise<React.ReactNode>) {
  render(<FeedbackProviders>{await resolverServidor(await nodo)}</FeedbackProviders>);
}

describe("lista de plantillas con opciones", () => {
  it("con la bandera apagada explica que no está activada, sin alertas rojas", async () => {
    responder({ "/plantillas-opciones": BANDERA, "/admin/me": bien(me) });
    await pintar(ListaPage());
    expect(screen.getByText(/no están activadas en tu negocio/)).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByRole("button", { name: /Nueva plantilla/ })).toBeNull();
  });

  it("otro error de la API sí se muestra como error", async () => {
    responder({ "/plantillas-opciones": { ok: false, status: 502, error: "No se pudo contactar el backend." }, "/admin/me": bien(me) });
    await pintar(ListaPage());
    expect(screen.getByRole("alert").textContent).toMatch(/No se pudieron cargar las plantillas: No se pudo contactar/);
  });

  it("lista con estado, versión vigente y el botón de crear para el propietario", async () => {
    responder({
      "/plantillas-opciones": bien({
        plantillas: [
          { clave: "confirmar_cita", nombre: "Confirmar cita", estado: "published", version_vigente: 2, tiene_borrador_sin_publicar: true, creada_en: "2026-10-20T15:00:00Z", actualizada_en: "2026-10-27T10:00:00Z" },
          { clave: "recordar_pago", nombre: "", estado: "draft", version_vigente: null, tiene_borrador_sin_publicar: true, creada_en: "2026-10-20T15:00:00Z", actualizada_en: "2026-10-27T10:00:00Z" },
        ],
      }),
      "/admin/me": bien(me),
      "/admin/settings/message-templates/missing": bien({ total_7d: 0, recent: [], total_eventos_7d: 0, total_opciones_7d: 0 }),
    });
    await pintar(ListaPage());
    expect(screen.getByText("Activa")).toBeTruthy();
    expect(screen.getByText("Borrador")).toBeTruthy();
    expect(screen.getByText("Versión 2")).toBeTruthy();
    expect(screen.getByText("Cambios sin publicar")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Confirmar cita/ }).getAttribute("href")).toBe("/plantillas-opciones/confirmar_cita");
    // Sin nombre se muestra la clave.
    expect(screen.getByRole("link", { name: /recordar_pago/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Nueva plantilla/ })).toBeTruthy();
  });

  it("quien no es propietario ve la lista sin poder crear", async () => {
    const colaborador = { ...me, role: "agent", tenant: { ...me.tenant!, role: "agent" } };
    responder({ "/plantillas-opciones": bien({ plantillas: [] }), "/admin/me": bien(colaborador), "/admin/settings/message-templates/missing": bien({ total_7d: 0, recent: [], total_eventos_7d: 0, total_opciones_7d: 0 }) });
    await pintar(ListaPage());
    expect(screen.queryByRole("button", { name: /Nueva plantilla/ })).toBeNull();
    expect(screen.getByText(/solo el propietario del negocio puede crearlas/)).toBeTruthy();
    expect(screen.getByText(/Cuando el propietario cree una/)).toBeTruthy();
  });
});

describe("editor de una plantilla", () => {
  const params = (clave: string) => Promise.resolve({ clave });

  it("con la bandera apagada explica que no está activada", async () => {
    responder({
      "/plantillas-opciones/confirmar_cita": BANDERA,
      "/plantillas-opciones/catalogo-acciones": BANDERA,
      "/plantillas-opciones/catalogo-variables": BANDERA,
      "/admin/me": bien(me),
    });
    await pintar(EditorPage({ params: params("confirmar_cita") }));
    expect(screen.getByText(/no están activadas en tu negocio/)).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("una plantilla que no existe es un 404, no un error en pantalla", async () => {
    responder({
      "/plantillas-opciones/otra": { ok: false, status: 404, error: "No existe.", code: "not_found" },
      "/plantillas-opciones/catalogo-acciones": bien({ acciones: [] }),
      "/plantillas-opciones/catalogo-variables": bien({ variables: [] }),
      "/admin/me": bien(me),
    });
    await expect(EditorPage({ params: params("otra") })).rejects.toThrow("NOT_FOUND");
  });

  it("una clave con formato inválido ni llega al backend", async () => {
    await expect(EditorPage({ params: params("Mala-Clave") })).rejects.toThrow("NOT_FOUND");
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("pasa la plantilla, los catálogos y el permiso al editor", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ valida: true, hallazgos: [] }), { status: 200 })));
    responder({
      "/plantillas-opciones/confirmar_cita": bien(plantillaDeOpciones),
      "/plantillas-opciones/catalogo-acciones": bien({ acciones: [] }),
      "/plantillas-opciones/catalogo-variables": bien({ variables: [] }),
      "/admin/me": bien(me),
    });
    await pintar(EditorPage({ params: params("confirmar_cita") }));
    expect(screen.getByRole("heading", { level: 1, name: "Confirmar cita" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Publicar" })).toBeTruthy();
    vi.unstubAllGlobals();
  });
});
