// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { FeedbackProviders } from "@/components/ui/providers";
import type { DispositivoAcceso, EventoAcceso, PoliticaAcceso } from "@/lib/seguridad";
import { RESPUESTAS } from "@/lib/testing/fixtures";
import { resolverServidor } from "@/lib/testing/servidor";
import { violacionesGraves } from "@/lib/testing/axe";
import { resetToasts } from "@/lib/toast-store";

// Seguridad en una sola página (rediseño B, SEG-01 a 12) y el historial de accesos.

const refresh = vi.fn();
const redirect = vi.fn((ruta: string) => {
  throw new Error(`NEXT_REDIRECT ${ruta}`);
});
let respuestas: Record<string, unknown> = {};

vi.mock("@/lib/api/server", async (original) => ({
  ...(await original<typeof import("@/lib/api/server")>()),
  // Primero la ruta con su query (los filtros), luego la ruta sola.
  apiFetch: vi.fn(async (ruta: string) => {
    const data = respuestas[ruta] ?? respuestas[ruta.split("?")[0]];
    return data === undefined ? { ok: false, status: 404, error: `Sin fixture para ${ruta}` } : { ok: true, status: 200, data };
  }),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, getAll: () => [], has: () => false }),
  headers: async () => new Headers(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, replace: vi.fn(), push: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => "/seguridad",
  useSearchParams: () => new URLSearchParams(),
  redirect: (ruta: string) => redirect(ruta),
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

const hace = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();
const cuenta = (id: string, nombre: string | null, email: string, rol: "owner" | "colaborador" = "colaborador") => ({ id, nombre, email, rol });
const equipo = (id: string, parcial: Partial<DispositivoAcceso>): DispositivoAcceso => ({
  id, cuenta: cuenta("g-1", "Gestor Uno", "gestor@test.example"), device_id_corto: "a1b2c3", device_label: "Samsung A15", plataforma: "android",
  estado: "activo", origen: "autoregistro", rol_al_registrar: "gestor", bloqueo_equipo: false, legacy: false, ultimo_uso_at: hace(3),
  ultima_ip: null, aprobado_at: null, bloqueado_at: null, motivo: null, created_at: hace(2), ...parcial,
});
const PENDIENTE = equipo("d1", { estado: "pendiente", ultimo_uso_at: null });
const ACTIVO = equipo("d5", { cuenta: cuenta("g-5", "Pedro Gestor", "pedro@test.example"), device_label: "Moto G54", device_id_corto: "5c5c12" });
const BLOQUEADO = equipo("d3", { cuenta: cuenta("g-3", null, "desconocido@test.example"), estado: "bloqueado", bloqueado_at: hace(300), motivo: "Equipo perdido" });
const evento = (id: string, parcial: Partial<EventoAcceso>): EventoAcceso => ({
  id, tipo: "dispositivo_pendiente", severidad: "aviso", canal: "campo", rol: "gestor", cuenta: PENDIENTE.cuenta,
  device_id_corto: "a1b2c3", ip: "190.25.1.10", detalle: null, occurred_at: hace(2), ...parcial,
});
const CRITICA = evento("e3", { tipo: "dispositivo_bloqueado_usado", severidad: "critico", cuenta: BLOQUEADO.cuenta, occurred_at: hace(1) });
const FALLIDO = evento("e2", { tipo: "login_fallido", cuenta: null, device_id_corto: null, ip: "181.1.1.1", detalle: { repeticiones_previas: 2 }, occurred_at: hace(3) });
const POLITICA: PoliticaAcceso = { owner: "abierto", colaborador: "abierto", gestor: "restringido" };

beforeEach(() => {
  respuestas = {
    ...RESPUESTAS,
    "/access/devices": { items: [PENDIENTE, ACTIVO, BLOQUEADO], next_cursor: null },
    "/access/devices?estado=pendiente": { items: [PENDIENTE], next_cursor: null },
    "/access/policy": POLITICA,
    "/access/events": { items: [CRITICA, evento("e1", {}), FALLIDO], next_cursor: null },
    "/access/events?severidad=critico": { items: [CRITICA], next_cursor: null },
    "/admin/collaborators": [],
  };
  refresh.mockClear();
  redirect.mockClear();
  resetToasts();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function pintar(nodo: ReactNode) {
  return render(<FeedbackProviders>{await resolverServidor(nodo)}</FeedbackProviders>);
}
type Pagina = (props: unknown) => Promise<ReactNode> | ReactNode;
const buscar = (sp: Record<string, string> = {}) => ({ searchParams: Promise.resolve(sp) });
const abrirMenu = (nombre: string | RegExp) =>
  fireEvent.pointerDown(screen.getByRole("button", { name: nombre }), { button: 0, ctrlKey: false, pointerType: "mouse" });

describe("Seguridad en una sola página (rediseño B)", () => {
  it("dice qué necesita atención: el equipo por aprobar y la alerta crítica, con su acción", async () => {
    const Pagina = (await import("@/app/(app)/seguridad/page")).default as Pagina;
    const { container } = await pintar(await Pagina(buscar()));
    expect(screen.getByRole("heading", { level: 1, name: "Seguridad" })).toBeTruthy();
    expect(screen.getByText("2 cosas necesitan tu atención.")).toBeTruthy();
    const atencion = screen.getByRole("heading", { name: "Necesita atención" }).closest("section")!;
    expect(within(atencion).getByText("Gestor Uno quiere entrar")).toBeTruthy();
    expect(within(atencion).getByRole("button", { name: /^Aprobar el Samsung A15/ })).toBeTruthy();
    expect(within(atencion).getByRole("button", { name: /^Rechazar el Samsung A15/ })).toBeTruthy();
    expect(within(atencion).getByText("Un equipo bloqueado de desconocido@test.example intentó entrar")).toBeTruthy();
    expect(within(atencion).getByRole("link", { name: "Ver el equipo" }).getAttribute("href")).toBe("#equipo-d3");
    expect(await violacionesGraves(container)).toEqual([]);
  });

  it("los equipos van en palabras, sin el pendiente, con la acción del estado y el resto en «Más acciones»", async () => {
    const Pagina = (await import("@/app/(app)/seguridad/page")).default as Pagina;
    await pintar(await Pagina(buscar()));
    const lista = screen.getByRole("list", { name: "Equipos" });
    expect(within(lista).queryByText(/Gestor Uno/)).toBeNull();
    expect(lista.textContent).toMatch(/Moto G54 · Android · usado hace 3 h/);
    expect(lista.textContent).toMatch(/bloqueado el .* · Equipo perdido/);
    expect(within(lista).getByRole("button", { name: /^Reactivar el Samsung A15/ })).toBeTruthy();
    abrirMenu(/^Más acciones de el Moto G54/);
    expect(await screen.findByRole("menuitem", { name: "Bloquear" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Dar de baja" })).toBeTruthy();
  });

  it("bloquear abre su diálogo con el alcance en un control segmentado", async () => {
    const Pagina = (await import("@/app/(app)/seguridad/page")).default as Pagina;
    await pintar(await Pagina(buscar()));
    abrirMenu(/^Más acciones de el Moto G54/);
    fireEvent.click(await screen.findByRole("menuitem", { name: "Bloquear" }));
    const dialogo = await screen.findByRole("dialog", { name: "Bloquear equipo" });
    expect(within(dialogo).getByRole("button", { name: "Solo esta cuenta" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(within(dialogo).getByRole("button", { name: "El equipo entero" }));
    expect(within(dialogo).getByText(/Nadie podrá entrar desde este equipo/)).toBeTruthy();
  });

  it("la actividad reciente va en frases y lleva al historial; la política, en una línea", async () => {
    const Pagina = (await import("@/app/(app)/seguridad/page")).default as Pagina;
    await pintar(await Pagina(buscar()));
    const actividad = screen.getByRole("list", { name: "Actividad reciente" });
    expect(actividad.textContent).toMatch(/3 intentos fallidos de entrar con una cuenta que no existe/);
    expect(screen.getByRole("link", { name: "Ver todo" }).getAttribute("href")).toBe("/seguridad/alertas");
    expect(screen.getByText("Gestores: necesitan tu aprobación · Dueño y colaboradores: entran sin aprobación")).toBeTruthy();
  });

  it("cambiar la política pide confirmar antes de exigir aprobación al dueño", async () => {
    const Pagina = (await import("@/app/(app)/seguridad/page")).default as Pagina;
    await pintar(await Pagina(buscar()));
    fireEvent.click(screen.getByRole("button", { name: "Cambiar" }));
    const panel = await screen.findByRole("dialog", { name: "Equipos nuevos" });
    const dueno = within(panel).getByRole("group", { name: "Equipos nuevos de dueño" });
    fireEvent.click(within(dueno).getByRole("button", { name: "Con aprobación" }));
    fireEvent.click(within(panel).getByRole("button", { name: "Guardar" }));
    const confirmar = await screen.findByRole("alertdialog");
    expect(confirmar.textContent).toMatch(/Pedir aprobación al dueño/);
  });

  it("sin la sección de alertas no se ve la actividad ni las alertas críticas", async () => {
    respuestas["/admin/me"] = {
      ...(RESPUESTAS["/admin/me"] as object),
      role: "admin",
      tenant: { id: "t", name: "T", role: "colaborador", active: true },
      permissions: { devices: "read" },
    };
    const Pagina = (await import("@/app/(app)/seguridad/page")).default as Pagina;
    await pintar(await Pagina(buscar()));
    expect(screen.queryByRole("heading", { name: "Actividad reciente" })).toBeNull();
    expect(screen.queryByText(/intentó entrar/)).toBeNull();
    expect(screen.getByText("Gestor Uno quiere entrar")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Aprobar/ })).toBeNull();
  });

  it("si los equipos no cargan, lo dice y ofrece reintentar", async () => {
    delete respuestas["/access/devices"];
    const Pagina = (await import("@/app/(app)/seguridad/page")).default as Pagina;
    await pintar(await Pagina(buscar()));
    expect(screen.getByText("No pudimos cargar los equipos")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeTruthy();
  });

  it("la ruta vieja de Dispositivos lleva a Seguridad", async () => {
    const Pagina = (await import("@/app/(app)/seguridad/dispositivos/page")).default as Pagina;
    expect(() => Pagina({})).toThrow("NEXT_REDIRECT /seguridad");
  });
});

describe("historial de accesos", () => {
  it("agrupa por día, cada alerta en una frase con su acción, y filtra con palabras del negocio", async () => {
    const Pagina = (await import("@/app/(app)/seguridad/alertas/page")).default as Pagina;
    const { container } = await pintar(await Pagina(buscar()));
    expect(screen.getByRole("heading", { level: 1, name: "Historial de accesos" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Hoy" })).toBeTruthy();
    expect(screen.getByText("Gestor Uno pidió entrar desde un equipo nuevo")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Revisar" }).getAttribute("href")).toBe("/seguridad");
    expect(screen.getByRole("link", { name: "Necesitan atención" }).getAttribute("href")).toBe("/seguridad/alertas?severidad=critico");
    expect(screen.queryByText(/Informativo|Crítico/)).toBeNull();
    expect(await violacionesGraves(container)).toEqual([]);
  });

  it("filtra por severidad y lo dice cuando no hay", async () => {
    respuestas["/access/events?severidad=info"] = { items: [], next_cursor: null };
    const Pagina = (await import("@/app/(app)/seguridad/alertas/page")).default as Pagina;
    await pintar(await Pagina(buscar({ severidad: "info" })));
    expect(screen.getByText("No hay alertas de este tipo.")).toBeTruthy();
    await waitFor(() => expect(screen.getByRole("link", { name: "Informativas" }).getAttribute("aria-current")).toBeTruthy());
  });
});
