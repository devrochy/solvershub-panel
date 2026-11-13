// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";

import { FeedbackProviders } from "@/components/ui/providers";
import type { ConnectionsConsole } from "@/lib/api/types";
import type { ConexionConsola } from "@/lib/conexiones";
import { violacionesGraves } from "@/lib/testing/axe";
import { consolaConexiones, me } from "@/lib/testing/fixtures";
import { resolverServidor } from "@/lib/testing/servidor";

// Ficha de conexión por tipo (HU-UX-09): pestañas según el tipo, pestaña Agentes, lista con una
// fila clicable por conexión y redirecciones de las rutas viejas.

const META = "00000000-0000-4000-8000-0000000000a1";
const WA = "00000000-0000-4000-8000-0000000000c1";
const WA2 = "00000000-0000-4000-8000-0000000000c2";
const QR = "00000000-0000-4000-8000-0000000000c3";
const GOOGLE = "00000000-0000-4000-8000-0000000000c4";
const WEB = "00000000-0000-4000-8000-0000000000c5";
const AG_COORD = "00000000-0000-4000-8000-0000000000e1";
const AG_VENTAS = "00000000-0000-4000-8000-0000000000e2";
const AG_NUEVO = "00000000-0000-4000-8000-0000000000e3";
const INST_COORD = "00000000-0000-4000-8000-0000000000f1";
const INST_VENTAS = "00000000-0000-4000-8000-0000000000f2";

const respuestas: Record<string, unknown> = {};
let ruta = `/conexiones/${WA}/salud`;

vi.mock("@/lib/api/server", async (original) => ({
  ...(await original<typeof import("@/lib/api/server")>()),
  apiFetch: vi.fn(async (r: string) => {
    const data = respuestas[r.split("?")[0]];
    return data === undefined ? { ok: false, status: 404, error: "sin fixture" } : { ok: true, status: 200, data };
  }),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, getAll: () => [], has: () => false }),
  headers: async () => new Headers(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => ruta,
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn((destino: string) => {
    throw new Error(`REDIRECT:${destino}`);
  }),
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));

beforeAll(() => {
  window.matchMedia ??= ((query: string) => ({
    matches: false, media: query, onchange: null, addListener: () => undefined, removeListener: () => undefined,
    addEventListener: () => undefined, removeEventListener: () => undefined, dispatchEvent: () => false,
  })) as typeof window.matchMedia;
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

afterEach(() => {
  cleanup();
  for (const k of Object.keys(respuestas)) delete respuestas[k];
});

const base = consolaConexiones.items[0];
function fila(parcial: Partial<ConexionConsola>): ConexionConsola {
  return { ...base, ...parcial };
}

const agente = (instance_id: string, agent_id: string, name: string, extra: Partial<ConexionConsola["agents"][number]> = {}) => ({
  instance_id, agent_id, key: name.toLowerCase(), name, role: "specialist" as const, is_default: false, enabled: true,
  priority: 100, release_version: 2, latest_version: 2, ...extra,
});

const ITEMS: ConexionConsola[] = [
  fila({
    id: WA, label: "WhatsApp ventas", external_id: "+57 300 000 0001", meta_connection_id: META, is_primary: true,
    coordinator: agente(INST_COORD, AG_COORD, "General", { role: "core", is_default: false, priority: 0 }),
    agents: [agente(INST_VENTAS, AG_VENTAS, "Ventas", { is_default: true, release_version: 3, latest_version: 4 })],
    active_release: { id: "00000000-0000-4000-8000-000000000101", number: 7, created_at: "2026-11-01T00:00:00Z" },
  }),
  fila({ id: WA2, label: "WhatsApp soporte", external_id: "+57 300 000 0002", meta_connection_id: META, health: "degraded" }),
  fila({ id: QR, label: "WhatsApp QR", type_id: "whatsapp_waweb", meta_connection_id: null, pause_scope: "connection", external_id: "573000000003" }),
  fila({ id: WEB, label: "Chat del sitio", type_id: "webchat", channel: "web", meta_connection_id: null, pause_scope: "connection", external_id: "tunegocio.com" }),
  fila({
    id: GOOGLE, label: "Agenda Google", type_id: "google_calendar", channel: "", conversational: false, meta_connection_id: null,
    pausable: false, pause_scope: "connection", external_id: "agenda@test.example", health: "error",
  }),
];

const CONSOLA: ConnectionsConsole = { ...consolaConexiones, items: ITEMS, total: ITEMS.length, runtime: "v3" };

function preparar(extra: Record<string, unknown> = {}) {
  Object.assign(respuestas, { "/admin/connections/console": CONSOLA, "/admin/me": me }, extra);
}

type Props = { params: Promise<Record<string, unknown>>; searchParams?: Promise<Record<string, unknown>>; children?: ReactNode };

async function pagina(modulo: Promise<{ default: unknown }>, props: Props) {
  const Pagina = (await modulo).default as (p: Props) => Promise<ReactNode>;
  return resolverServidor(await Pagina(props));
}

async function destino(modulo: Promise<{ default: unknown }>, props: Props): Promise<string> {
  try {
    await pagina(modulo, props);
  } catch (e) {
    const m = /^REDIRECT:(.*)$/.exec((e as Error).message);
    if (m) return m[1];
    throw e;
  }
  throw new Error("no redirigió");
}

async function ficha(id: string, contenido: ReactNode = null) {
  const arbol = await pagina(import("@/app/(app)/conexiones/[id]/(ficha)/layout"), {
    params: Promise.resolve({ id }),
    children: contenido,
  });
  return render(<FeedbackProviders>{arbol}</FeedbackProviders>);
}

const pestanas = () =>
  within(screen.getByRole("navigation", { name: "Secciones de la conexión" }))
    .getAllByRole("link")
    .map((l) => l.textContent);

describe("cabecera y pestañas de la ficha por tipo", () => {
  it("WhatsApp oficial: migas, tipo · detalle con sus números, un estado, Pausar y las pestañas con Avanzado; accesible", async () => {
    preparar();
    ruta = `/conexiones/${WA}/salud`;
    const { container } = await ficha(WA);
    expect(screen.getByRole("heading", { level: 1, name: "WhatsApp ventas" })).toBeTruthy();
    expect(screen.getByText("WhatsApp oficial · +57 300 000 0001 · Cuenta de Meta con 2 números")).toBeTruthy();
    expect(screen.getByText("Funciona")).toBeTruthy();
    const migas = within(screen.getByRole("navigation", { name: "Migas de pan" }));
    expect(migas.getAllByRole("link", { name: "Conexiones" })[0].getAttribute("href")).toBe("/conexiones");
    expect(screen.getByRole("button", { name: /Pausar/ })).toBeTruthy();
    expect(pestanas()).toEqual(["Salud", "Agentes", "Números", "Plantillas", "Costos"]);
    expect(screen.getByRole("button", { name: "Avanzado" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Salud" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("button", { name: /Más acciones de WhatsApp ventas/ })).toBeTruthy();
    expect(await violacionesGraves(container)).toEqual([]);
  });

  it("una subruta deja activa su pestaña, también dentro de Avanzado (Datos de la cuenta → Webhook)", async () => {
    preparar();
    ruta = `/conexiones/${WA}/webhook/credenciales`;
    await ficha(WA);
    expect(screen.getByRole("button", { name: "Avanzado: Webhook" }).getAttribute("aria-current")).toBe("page");
  });

  it("WhatsApp con QR: Estado, Agentes y Versiones, sin Avanzado ni cuenta de Meta", async () => {
    preparar();
    ruta = `/conexiones/${QR}/estado`;
    await ficha(QR);
    expect(pestanas()).toEqual(["Estado", "Agentes", "Versiones"]);
    expect(screen.queryByRole("button", { name: /Avanzado/ })).toBeNull();
    expect(screen.queryByText(/Cuenta de Meta con/)).toBeNull();
  });

  it("Google Calendar: Cuenta y Agenda, sin Agentes ni Pausar", async () => {
    preparar();
    ruta = `/conexiones/${GOOGLE}/cuenta`;
    await ficha(GOOGLE);
    expect(pestanas()).toEqual(["Cuenta", "Agenda"]);
    expect(screen.queryByRole("button", { name: /Pausar/ })).toBeNull();
  });

  it("una conexión de otro negocio es 404", async () => {
    preparar();
    await expect(ficha("00000000-0000-4000-8000-000000000999")).rejects.toThrow("NOT_FOUND");
  });

  it("una pestaña que no es del tipo es 404: Agentes en Google, Plantillas en WhatsApp Web", async () => {
    preparar();
    await expect(
      pagina(import("@/app/(app)/conexiones/[id]/(ficha)/agentes/page"), { params: Promise.resolve({ id: GOOGLE }) }),
    ).rejects.toThrow("NOT_FOUND");
    await expect(
      pagina(import("@/app/(app)/conexiones/[id]/(ficha)/plantillas/page"), { params: Promise.resolve({ id: QR }) }),
    ).rejects.toThrow("NOT_FOUND");
  });
});

describe("pestaña Agentes", () => {
  const instancias = [
    { id: INST_COORD, agent_id: AG_COORD, key: "general", name: "General", role: "core", is_default: false, priority: 0, enabled: true, latest_version: 2 },
    { id: INST_VENTAS, agent_id: AG_VENTAS, key: "ventas", name: "Ventas", role: "specialist", is_default: true, priority: 100, enabled: true, latest_version: 4 },
  ];
  const agentes = [
    { id: AG_VENTAS, key: "ventas", kind: "specialist", contract: "v3", name: "Ventas", description: "", status: "published", latest_version: 4, created_at: "2026-10-01T00:00:00Z" },
    { id: AG_NUEVO, key: "cobros", kind: "specialist", contract: "v3", name: "Cobros", description: "", status: "published", latest_version: 1, created_at: "2026-10-01T00:00:00Z" },
    { id: AG_COORD, key: "general", kind: "core", contract: "v3", name: "General", description: "", status: "published", latest_version: 2, created_at: "2026-10-01T00:00:00Z" },
  ];

  async function abrir(extra: Record<string, unknown> = {}) {
    preparar({ [`/admin/connections/${WA}/agents`]: instancias, "/admin/agents": agentes, ...extra });
    const arbol = await pagina(import("@/app/(app)/conexiones/[id]/(ficha)/agentes/page"), { params: Promise.resolve({ id: WA }) });
    return render(<FeedbackProviders>{arbol}</FeedbackProviders>);
  }

  it("tabla con enlace a la ficha del agente, rol, un estado, prioridad y versión; acciones en un menú; accesible", async () => {
    const { container } = await abrir();
    const tabla = screen.getByRole("table");
    expect(within(tabla).getByRole("link", { name: "Ventas" }).getAttribute("href")).toBe(`/agentes/${AG_VENTAS}`);
    expect(within(tabla).getByRole("link", { name: "General" }).getAttribute("href")).toBe(`/agentes/${AG_COORD}`);
    expect(within(tabla).getByText("Coordinador")).toBeTruthy();
    expect(within(tabla).getByText("Principal")).toBeTruthy();
    expect(within(tabla).getByText("v3 (hay v4)")).toBeTruthy();
    // Ni el Coordinador ni el principal llevan menú: no se quitan ni se deshabilitan.
    expect(within(tabla).queryByRole("button", { name: /Más acciones/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Asignar agente" }).hasAttribute("disabled")).toBe(false);
    expect(screen.getByText(/aplican con la próxima versión/)).toBeTruthy();
    expect(await violacionesGraves(container)).toEqual([]);
  });

  it("sin Coordinador: aviso y no deja asignar", async () => {
    await abrir({
      "/admin/connections/console": { ...CONSOLA, items: [{ ...ITEMS[0], coordinator: null }, ...ITEMS.slice(1)] },
      [`/admin/connections/${WA}/agents`]: [instancias[1]],
    });
    expect(screen.getByText(/todavía no tiene Coordinador/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Asignar agente" }).hasAttribute("disabled")).toBe(true);
  });
});

describe("lista de conexiones", () => {
  it("una fila clicable por conexión con un solo estado (la salud solo en las Meta) y quién atiende; accesible", async () => {
    const { ConsolaConexiones } = await import("@/app/(app)/conexiones/_components/consola-conexiones");
    const { container } = render(
      <FeedbackProviders>
        <ConsolaConexiones consola={CONSOLA} webhookUrl="https://api.test/webhook/abc" />
      </FeedbackProviders>,
    );
    const filas = within(screen.getByRole("list", { name: "Conexiones del negocio" })).getAllByRole("listitem");
    expect(filas).toHaveLength(ITEMS.length);
    expect(within(filas[0]).getByRole("link", { name: "WhatsApp ventas" }).getAttribute("href")).toBe(`/conexiones/${WA}`);
    expect(within(filas[0]).getByText(/^Funciona · /)).toBeTruthy();
    expect(within(filas[1]).getByText(/^Con avisos/)).toBeTruthy();
    // La salud de Google (error) no se muestra: no es una conexión de Meta.
    expect(within(filas[4]).getByText("Funciona · Integración")).toBeTruthy();
    // Arriba, lo que pide atención: solo la de Meta con avisos.
    expect(screen.getByRole("link", { name: /WhatsApp soporte tiene un aviso de Meta/ }).getAttribute("href")).toBe(`/conexiones/${WA2}`);
    expect(screen.queryByText(/no está funcionando/)).toBeNull();
    // Los datos técnicos del negocio solo los ve la plataforma.
    expect(screen.queryByText("https://api.test/webhook/abc")).toBeNull();
    expect(screen.queryByText("Enrutamiento")).toBeNull();
    expect(await violacionesGraves(container)).toEqual([]);
  });
});

describe("redirecciones", () => {
  it("/conexiones/[id] abre la primera pestaña del tipo y conserva la query", async () => {
    preparar();
    const abrir = (id: string, query: Record<string, string> = {}) =>
      destino(import("@/app/(app)/conexiones/[id]/page"), {
        params: Promise.resolve({ id }),
        searchParams: Promise.resolve(query),
      });
    expect(await abrir(WA)).toBe(`/conexiones/${WA}/salud`);
    expect(await abrir(QR)).toBe(`/conexiones/${QR}/estado`);
    expect(await abrir(WEB)).toBe(`/conexiones/${WEB}/apariencia`);
    expect(await abrir(GOOGLE, { google: "ok" })).toBe(`/conexiones/${GOOGLE}/cuenta?google=ok`);
  });

  it("/conexiones/meta/[metaId]/** va a la pestaña del número principal de la cuenta", async () => {
    preparar();
    const ir = (resto: string[] | undefined, query: Record<string, string> = {}, metaId = META) =>
      destino(import("@/app/(app)/conexiones/meta/[connectionId]/[[...resto]]/page"), {
        params: Promise.resolve({ connectionId: metaId, resto }),
        searchParams: Promise.resolve(query),
      });
    expect(await ir(undefined, { alta: "1" })).toBe(`/conexiones/${WA}/salud?alta=1`);
    expect(await ir(["plantillas"])).toBe(`/conexiones/${WA}/plantillas`);
    expect(await ir(["numeros", "negocio"])).toBe(`/conexiones/${WA}/numeros/negocio`);
    expect(await ir(["pasar-a-produccion"])).toBe(`/conexiones/${WA}/produccion/pasar`);
    expect(await ir(["credenciales"])).toBe(`/conexiones/${WA}/webhook/credenciales`);
    expect(await ir(["salud"], {}, "00000000-0000-4000-8000-0000000000a9")).toBe("/conexiones");
  });

  it("la «Salud de Meta» global va a la lista", async () => {
    expect(await destino(import("@/app/(app)/conexiones/meta/page"), { params: Promise.resolve({}) })).toBe("/conexiones");
  });

  it("Producción y Plantillas globales: a la ficha si hay un solo WhatsApp oficial, si no a la lista", async () => {
    preparar();
    expect(await destino(import("@/app/(app)/conexiones/produccion/page"), { params: Promise.resolve({}) })).toBe("/conexiones");
    expect(await destino(import("@/app/(app)/plantillas/page"), { params: Promise.resolve({}) })).toBe("/conexiones");
    preparar({ "/admin/connections/console": { ...CONSOLA, items: [ITEMS[0], ITEMS[2]] } });
    expect(await destino(import("@/app/(app)/conexiones/produccion/page"), { params: Promise.resolve({}) })).toBe(
      `/conexiones/${WA}/produccion`,
    );
    expect(await destino(import("@/app/(app)/plantillas/page"), { params: Promise.resolve({}) })).toBe(`/conexiones/${WA}/plantillas`);
  });

  it("WhatsApp Web y chat web: a la ficha si la conexión existe; si no, el alta", async () => {
    preparar();
    expect(await destino(import("@/app/(app)/conexiones/waweb/page"), { params: Promise.resolve({}) })).toBe(
      `/conexiones/${QR}/estado`,
    );
    expect(await destino(import("@/app/(app)/conexiones/chat-web/page"), { params: Promise.resolve({}) })).toBe(
      `/conexiones/${WEB}/apariencia`,
    );
    preparar({
      "/admin/connections/console": { ...CONSOLA, items: [ITEMS[0]] },
      "/admin/meta/waweb": { status: "", risk_ok: false, jid: null, qr_image: null, last_error: null },
    });
    const arbol = await pagina(import("@/app/(app)/conexiones/waweb/page"), { params: Promise.resolve({}) });
    render(<FeedbackProviders>{arbol}</FeedbackProviders>);
    expect(screen.getByRole("heading", { level: 1, name: "Conectar WhatsApp con QR" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Acepto el riesgo" })).toBeTruthy();
  });
});
