// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { FeedbackProviders } from "@/components/ui/providers";
import { me, RESPUESTAS } from "@/lib/testing/fixtures";
import { resolverServidor } from "@/lib/testing/servidor";

// Permisos de Configuración: quien no puede escribir ve los formularios sin guardar, pero si no se
// pudo saber quién es (falló /admin/me) no se le bloquea nada ni se le culpa al permiso.

const respuestaDeMe = vi.hoisted(() => ({ valor: null as unknown }));

vi.mock("@/lib/api/server", async (original) => ({
  ...(await original<typeof import("@/lib/api/server")>()),
  apiFetch: vi.fn(async (ruta: string) => {
    const base = ruta.split("?")[0];
    if (base === "/admin/me") {
      return respuestaDeMe.valor
        ? { ok: true, status: 200, data: respuestaDeMe.valor }
        : { ok: false, status: 502, error: "No se pudo contactar el servidor" };
    }
    const data = RESPUESTAS[base];
    return data === undefined ? { ok: false, status: 404, error: `Sin fixture para ${ruta}` } : { ok: true, status: 200, data };
  }),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, getAll: () => [], has: () => false }),
  headers: async () => new Headers(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => "/configuracion",
  useSearchParams: () => new URLSearchParams(),
}));

async function montarPagina(seccion: string) {
  const Pagina = (await import("@/app/(app)/configuracion/page")).default;
  const arbol: ReactNode = await resolverServidor(await Pagina({ searchParams: Promise.resolve({ seccion }) }));
  return render(<FeedbackProviders>{arbol}</FeedbackProviders>);
}

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
});
beforeEach(() => {
  respuestaDeMe.valor = me;
});
afterEach(cleanup);

describe("permisos de Configuración", () => {
  it("si falla /admin/me, los formularios siguen editables y no se culpa al permiso", async () => {
    respuestaDeMe.valor = null;
    await montarPagina("memoria");
    expect(screen.getByRole("button", { name: "Guardar memoria" })).toBeTruthy();
    expect(screen.queryByText(/Solo puedes ver esta sección/)).toBeNull();
    expect(screen.getByLabelText(/Turnos de contexto/).matches(":disabled")).toBe(false);
  });

  it("quien tiene permiso de escritura edita", async () => {
    await montarPagina("memoria");
    expect(screen.getByRole("button", { name: "Guardar memoria" })).toBeTruthy();
  });

  it("quien solo puede leer ve el formulario sin guardar y con el aviso", async () => {
    respuestaDeMe.valor = { ...me, role: "colaborador", permissions: { ...me.permissions, settings: "read" } };
    await montarPagina("memoria");
    expect(screen.queryByRole("button", { name: "Guardar memoria" })).toBeNull();
    expect(screen.getByText(/Solo puedes ver esta sección/)).toBeTruthy();
    expect(screen.getByLabelText(/Turnos de contexto/).matches(":disabled")).toBe(true);
  });
});
