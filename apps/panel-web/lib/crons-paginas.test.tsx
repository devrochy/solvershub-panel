// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { AccionesCron } from "@/app/(app)/plataforma/crons/_components/acciones-cron";
import { FeedbackProviders } from "@/components/ui/providers";
import { RESPUESTAS, cronLatido, cronPausado, cronRenovacion, meMaster } from "@/lib/testing/fixtures";
import { resolverServidor } from "@/lib/testing/servidor";
import { violacionesGraves } from "@/lib/testing/axe";
import { resetToasts } from "@/lib/toast-store";

// Páginas de Plataforma → Crons (ADR-0183): solo master, módulos, historial y acciones.

const refresh = vi.fn();
let respuestas: Record<string, unknown> = {};

vi.mock("@/lib/api/server", async (original) => ({
  ...(await original<typeof import("@/lib/api/server")>()),
  apiFetch: vi.fn(async (ruta: string) => {
    const data = respuestas[ruta.split("?")[0]];
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
  useRouter: () => ({ refresh, replace: vi.fn(), push: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => "/plataforma/crons",
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
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

beforeEach(() => {
  respuestas = { ...RESPUESTAS, "/admin/me": meMaster };
  refresh.mockClear();
  resetToasts();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function pintar(nodo: ReactNode) {
  const arbol = await resolverServidor(nodo);
  return render(<FeedbackProviders>{arbol}</FeedbackProviders>);
}

type Pagina = (props: unknown) => Promise<ReactNode>;
const buscar = (sp: Record<string, string> = {}) => ({ searchParams: Promise.resolve(sp) });
const detalle = (name: string, sp: Record<string, string> = {}) => ({
  params: Promise.resolve({ name }),
  searchParams: Promise.resolve(sp),
});

describe("lista de crons", () => {
  it("agrupa por módulo en el orden de la API y muestra estado, horario y fallos", async () => {
    const Pagina = (await import("@/app/(app)/plataforma/crons/page")).default as Pagina;
    const { container } = await pintar(await Pagina(buscar()));
    expect(screen.getByRole("heading", { level: 1, name: "Crons" })).toBeTruthy();
    const modulos = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(modulos).toEqual(["Plataforma y salud", "Facturación", "Cobranza"]);

    const tabla = screen.getByRole("table", { name: "Crons de Facturación" });
    const fila = within(tabla).getAllByRole("row")[1];
    expect(fila.textContent).toMatch(/Renovación del plan/);
    expect(fila.textContent).toMatch(/Con fallo/);
    expect(fila.textContent).toMatch(/Todos los días a las 13:00 UTC \(08:00 en Colombia\)/);
    expect(fila.textContent).toMatch(/Cobra o avisa a clientes/);
    expect(within(fila).getByRole("link", { name: "Renovación del plan" }).getAttribute("href")).toBe(
      "/plataforma/crons/core.billing_renovacion",
    );

    const cobranza = within(screen.getByRole("table", { name: "Crons de Cobranza" })).getAllByRole("row")[1];
    expect(cobranza.textContent).toMatch(/Pausado/);
    expect(cobranza.textContent).toMatch(/Reprogramado/);

    const latido = within(screen.getByRole("table", { name: "Crons de Plataforma y salud" })).getAllByRole("row")[1];
    expect(latido.textContent).toMatch(/Crítico/);
    expect(latido.textContent).toMatch(/Sin historial/);
    expect(await violacionesGraves(container)).toEqual([]);
  });

  it("los KPIs salen del resumen", async () => {
    const Pagina = (await import("@/app/(app)/plataforma/crons/page")).default as Pagina;
    await pintar(await Pagina(buscar()));
    const resumen = screen.getByRole("region", { name: "Resumen" });
    expect(resumen.textContent).toMatch(/Crons.*3/);
    expect(resumen.textContent).toMatch(/Pausados.*1/);
    expect(resumen.textContent).toMatch(/Con fallo.*1/);
  });

  it.each(["owner", "tester", "colaborador"])("un %s no ve nada de los crons", async (role) => {
    respuestas["/admin/me"] = { ...meMaster, role };
    const Pagina = (await import("@/app/(app)/plataforma/crons/page")).default as Pagina;
    await pintar(await Pagina(buscar()));
    expect(screen.getByRole("alert").textContent).toMatch(/Solo el admin de plataforma/);
    expect(screen.queryByRole("table")).toBeNull();
  });
});

describe("detalle de un cron", () => {
  it("muestra el historial con resultado, disparo, duración y la clase del error", async () => {
    const Pagina = (await import("@/app/(app)/plataforma/crons/[name]/page")).default as Pagina;
    const { container } = await pintar(await Pagina(detalle("core.billing_renovacion")));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Renovación del plan");
    const filas = within(screen.getByRole("table", { name: "Ejecuciones de Renovación del plan" })).getAllByRole("row");
    expect(filas[1].textContent).toMatch(/Fallida/);
    expect(filas[1].textContent).toMatch(/ProgrammingError/);
    expect(filas[1].textContent).toMatch(/2,1 s/);
    expect(filas[2].textContent).toMatch(/Exitosa/);
    expect(filas[2].textContent).toMatch(/Manual/);
    expect(filas[3].textContent).toMatch(/Omitida/);
    expect(filas[3].textContent).toMatch(/Ya había una ejecución en curso/);
    expect(screen.getByText(/cobra o escribe a clientes/)).toBeTruthy();
    expect(await violacionesGraves(container)).toEqual([]);
  });

  it("ofrece solo las acciones que el servidor declara válidas", async () => {
    const Pagina = (await import("@/app/(app)/plataforma/crons/[name]/page")).default as Pagina;
    await pintar(await Pagina(detalle("core.billing_renovacion")));
    expect(screen.getByRole("button", { name: "Ejecutar ahora" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Pausar" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reprogramar" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Reanudar" })).toBeNull();
  });

  it("un cron que no guarda éxitos lo dice en vez de mostrarse vacío", async () => {
    const Pagina = (await import("@/app/(app)/plataforma/crons/[name]/page")).default as Pagina;
    await pintar(await Pagina(detalle("core.worker_heartbeat")));
    expect(screen.getByText(/No se registran las ejecuciones exitosas/)).toBeTruthy();
    expect(screen.getByText("Sin fallos ni ejecuciones manuales")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Pausar" })).toBeNull();
  });

  it("un cron que no existe da 404 y un no-master no ve nada", async () => {
    const Pagina = (await import("@/app/(app)/plataforma/crons/[name]/page")).default as Pagina;
    await expect(Pagina(detalle("core.no_existe"))).rejects.toThrow("NEXT_NOT_FOUND");
    respuestas["/admin/me"] = { ...meMaster, role: "tester" };
    await pintar(await Pagina(detalle("core.billing_renovacion")));
    expect(screen.getByRole("alert").textContent).toMatch(/Solo el admin de plataforma/);
  });
});

describe("acciones y reprogramación", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  const acciones = (cron = cronRenovacion) => (
    <FeedbackProviders>
      <AccionesCron cron={cron} />
    </FeedbackProviders>
  );
  const dialogo = () => screen.findByRole("alertdialog").catch(() => screen.findByRole("dialog"));

  it("ejecutar ahora un cron sensible advierte y llama a run", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 202, json: async () => ({ queued: true }) });
    render(acciones());
    fireEvent.click(screen.getByRole("button", { name: "Ejecutar ahora" }));
    const d = await dialogo();
    expect(d.textContent).toMatch(/cobra o escribe a clientes/);
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(within(d).getByRole("button", { name: "Ejecutar ahora" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0][0]).toBe("/api/platform/crons/core.billing_renovacion/run");
    expect(fetchMock.mock.calls[0][1].method).toBe("POST");
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("cancelar la confirmación no llama al servidor", async () => {
    render(acciones());
    fireEvent.click(screen.getByRole("button", { name: "Pausar" }));
    const d = await dialogo();
    fireEvent.click(within(d).getByRole("button", { name: /^(Volver|Cancelar)$/ }));
    await waitFor(() => expect(screen.queryByRole("alertdialog") ?? screen.queryByRole("dialog")).toBeNull());
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("un cron pausado se reanuda y puede restaurar su horario", async () => {
    render(acciones(cronPausado));
    expect(screen.getByRole("button", { name: "Reanudar" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Pausar" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Reprogramar" }));
    const d = await dialogo();
    expect(within(d).getByRole("button", { name: "Restaurar horario" })).toBeTruthy();
  });

  it("el editor valida la expresión en vivo y la describe en español", async () => {
    render(acciones(cronLatido));
    fireEvent.click(screen.getByRole("button", { name: "Reprogramar" }));
    const d = await dialogo();
    const campo = within(d).getByLabelText(/Expresión/);
    fireEvent.change(campo, { target: { value: "0 5 * * *" } });
    expect(d.textContent).toMatch(/Todos los días a las 05:00 UTC \(00:00 en Colombia\)/);
    expect((within(d).getByRole("button", { name: "Guardar horario" }) as HTMLButtonElement).disabled).toBe(false);
    fireEvent.change(campo, { target: { value: "61 * * * *" } });
    expect(d.textContent).toMatch(/minuto/);
    expect((within(d).getByRole("button", { name: "Guardar horario" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("guardar un horario de un cron normal hace PUT con la expresión normalizada", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    render(acciones(cronLatido));
    fireEvent.click(screen.getByRole("button", { name: "Reprogramar" }));
    const d = await dialogo();
    fireEvent.change(within(d).getByLabelText(/Expresión/), { target: { value: " */5  * * * * " } });
    fireEvent.click(within(d).getByRole("button", { name: "Guardar horario" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0][0]).toBe("/api/platform/crons/core.worker_heartbeat/schedule");
    expect(fetchMock.mock.calls[0][1].method).toBe("PUT");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ schedule: "*/5 * * * *" });
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("un error del servidor se muestra en el diálogo", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 400, json: async () => ({ error: "Horario no válido." }) });
    render(acciones(cronLatido));
    fireEvent.click(screen.getByRole("button", { name: "Reprogramar" }));
    const d = await dialogo();
    fireEvent.change(within(d).getByLabelText(/Expresión/), { target: { value: "0 5 * * *" } });
    fireEvent.click(within(d).getByRole("button", { name: "Guardar horario" }));
    expect(await within(d).findByText("Horario no válido.")).toBeTruthy();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("sin acciones válidas no se pinta nada", () => {
    render(acciones({ ...cronRenovacion, acciones: [] }));
    expect(screen.queryByRole("group")).toBeNull();
  });
});
