// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";

import { FeedbackProviders } from "@/components/ui/providers";
import { violacionesGraves } from "@/lib/testing/axe";
import { RESPUESTAS } from "@/lib/testing/fixtures";
import { resolverServidor } from "@/lib/testing/servidor";

// Accesibilidad de las páginas principales (HU-UI-04): se renderiza cada página con
// respuestas de prueba del backend y axe no debe encontrar violaciones graves.

vi.mock("@/lib/api/server", async (original) => ({
  ...(await original<typeof import("@/lib/api/server")>()),
  apiFetch: vi.fn(async (ruta: string) => {
    const data = RESPUESTAS[ruta.split("?")[0]];
    return data === undefined
      ? { ok: false, status: 404, error: `Sin fixture para ${ruta}` }
      : { ok: true, status: 200, data };
  }),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, getAll: () => [], has: () => false }),
  headers: async () => new Headers(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

type Pagina = (props: { searchParams: Promise<Record<string, string>>; params: Promise<Record<string, string>> }) => Promise<ReactNode>;

const PAGINAS: [string, () => Promise<{ default: unknown }>][] = [
  ["Iniciar sesión", () => import("@/app/login/page")],
  ["Recuperar contraseña", () => import("@/app/recuperar/page")],
  ["Activar cuenta", () => import("@/app/invitacion/page")],
  ["Resumen", () => import("@/app/(app)/dashboard/page")],
  ["Agentes", () => import("@/app/(app)/agentes/page")],
  ["Agentes · Colaboración", () => import("@/app/(app)/agentes/colaboracion/page")],
  ["Conversaciones", () => import("@/app/(app)/conversaciones/page")],
  ["Escalaciones", () => import("@/app/(app)/escalaciones/page")],
  ["Leads", () => import("@/app/(app)/leads/page")],
  ["Colaboradores", () => import("@/app/(app)/colaboradores/page")],
  ["Habilidades", () => import("@/app/(app)/habilidades/page")],
  ["Conexiones", () => import("@/app/(app)/conexiones/page")],
  ["Plan", () => import("@/app/(app)/plan/page")],
  ["Negocios", () => import("@/app/(app)/tenants/page")],
  ["Configuración", () => import("@/app/(app)/configuracion/page")],
  ["Cobranza", () => import("@/app/(app)/cobranza/page")],
  ["Suscripciones · Resumen", () => import("@/app/(app)/suscripciones/page")],
  ["Suscripciones · Lista", () => import("@/app/(app)/suscripciones/lista/page")],
  ["Suscripciones · Clientes", () => import("@/app/(app)/suscripciones/clientes/page")],
  ["Suscripciones · Pagos", () => import("@/app/(app)/suscripciones/pagos/page")],
  ["Agenda", () => import("@/app/(app)/calendario/page")],
  ["Plantillas con opciones", () => import("@/app/(app)/plantillas-opciones/page")],
  ["Mensajes", () => import("@/app/(app)/mensajes/page")],
  ["Plantilla con opciones · Editor", () => import("@/app/(app)/plantillas-opciones/[clave]/page")],
];

beforeAll(() => {
  // jsdom no trae matchMedia ni ResizeObserver; algunos componentes del cliente los usan.
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

afterEach(cleanup);

describe("accesibilidad de las páginas principales", () => {
  it.each(PAGINAS)("%s no tiene violaciones graves de axe", async (_nombre, cargar) => {
    const Pagina = (await cargar()).default as Pagina;
    const arbol = await resolverServidor(await Pagina({ searchParams: Promise.resolve({}), params: Promise.resolve({ clave: "confirmar_cita" }) }));
    const { container } = render(<FeedbackProviders>{arbol}</FeedbackProviders>);

    expect(container.querySelector("h1"), "la página tiene su h1").not.toBeNull();
    expect(await violacionesGraves(container)).toEqual([]);
  }, 15_000);
});
