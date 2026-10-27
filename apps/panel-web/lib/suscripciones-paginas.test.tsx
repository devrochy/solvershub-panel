// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { AccionesSuscripcion } from "@/app/(app)/suscripciones/_components/acciones-suscripcion";
import { ReenviarLink } from "@/app/(app)/suscripciones/_components/reenviar-link";
import { RegistrarPago } from "@/app/(app)/suscripciones/_components/registrar-pago";
import { FeedbackProviders } from "@/components/ui/providers";
import { RESPUESTAS, suscripcionDetalle } from "@/lib/testing/fixtures";
import { resolverServidor } from "@/lib/testing/servidor";
import { violacionesGraves } from "@/lib/testing/axe";
import { resetToasts } from "@/lib/toast-store";

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
  usePathname: () => "/suscripciones",
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
  respuestas = { ...RESPUESTAS };
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

describe("páginas de Suscripciones (SPEC-35)", () => {
  it("la lista muestra cliente, plan, estado, valor, próximo cobro y mora", async () => {
    const Pagina = (await import("@/app/(app)/suscripciones/lista/page")).default as Pagina;
    const { container } = await pintar(await Pagina(buscar()));
    expect(screen.getByRole("heading", { level: 1, name: "Suscripciones" })).toBeTruthy();
    const filas = within(screen.getByRole("table")).getAllByRole("row");
    const ana = filas.find((f) => f.textContent?.includes("Ana Prueba"))!;
    expect(ana.textContent).toMatch(/Plan Pro/);
    expect(ana.textContent).toMatch(/Activa/);
    expect(ana.textContent).toMatch(/10 días de mora/);
    expect(within(ana).getByRole("link", { name: "Ana Prueba" }).getAttribute("href")).toBe("/suscripciones/lista/test-sub-1");
    const beto = filas.find((f) => f.textContent?.includes("+573000000002"))!;
    expect(beto.textContent).toMatch(/Pausada por el negocio/);
    expect(await violacionesGraves(container)).toEqual([]);
  });

  it("el detalle ofrece las acciones válidas, los cobros, los avisos y el historial", async () => {
    const Pagina = (await import("@/app/(app)/suscripciones/lista/[id]/page")).default as Pagina;
    const { container } = await pintar(await Pagina({ params: Promise.resolve({ id: "test-sub-1" }) }));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/Plan Pro · Ana Prueba/);
    expect(screen.getByRole("button", { name: "Pausar" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Reanudar" })).toBeNull();
    expect(screen.getByText(/Cambio de plan programado: Pasará a «Plan Basic»/)).toBeTruthy();
    expect(screen.getByText("Recordatorio de pago")).toBeTruthy();
    expect(screen.getByText("Entregado")).toBeTruthy();
    expect(screen.getAllByText("duena@test").length).toBe(2);
    // Solo el cobro pendiente de período se puede reenviar.
    expect(screen.getAllByRole("button", { name: /Reenviar link de pago a Ana Prueba/ })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: /Registrar pago por transferencia de Ana Prueba/ })).toHaveLength(1);
    expect(await violacionesGraves(container)).toEqual([]);
  });

  it("un colaborador de solo lectura ve el detalle sin botones de acción", async () => {
    const lectura = { ...(RESPUESTAS["/admin/me"] as object), role: "colaborador", permissions: { "pack_subscriptions:suscripciones": "read" } };
    respuestas["/admin/me"] = lectura;
    const Pagina = (await import("@/app/(app)/suscripciones/lista/[id]/page")).default as Pagina;
    await pintar(await Pagina({ params: Promise.resolve({ id: "test-sub-1" }) }));
    expect(screen.queryByRole("button", { name: "Pausar" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Reenviar link/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Registrar pago/ })).toBeNull();
    expect(screen.getByText("Cobros")).toBeTruthy();
  });

  it("una suscripción que no existe da 404", async () => {
    const Pagina = (await import("@/app/(app)/suscripciones/lista/[id]/page")).default as Pagina;
    await expect(Pagina({ params: Promise.resolve({ id: "no-existe" }) })).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("los pagos distinguen pendiente, pagado y vencido, sin enums crudos", async () => {
    const Pagina = (await import("@/app/(app)/suscripciones/pagos/page")).default as Pagina;
    await pintar(await Pagina(buscar({ vencidos: "1" })));
    const texto = screen.getByRole("table").textContent ?? "";
    expect(texto).toMatch(/Pendiente/);
    expect(texto).toMatch(/Pagado/);
    expect(texto).toMatch(/10 días de mora/);
    expect(texto).not.toMatch(/pendiente|pagado|periodo/);
  });

  it("los clientes con suscripción enlazan a su ficha y a sus suscripciones", async () => {
    const Pagina = (await import("@/app/(app)/suscripciones/clientes/page")).default as Pagina;
    await pintar(await Pagina(buscar()));
    expect(screen.getByRole("link", { name: "Ana Prueba" }).getAttribute("href")).toBe(
      "/leads?cliente=test-cliente-ana&agente=suscripciones",
    );
    expect(screen.getByRole("link", { name: /Ver las suscripciones de Ana Prueba/ }).getAttribute("href")).toBe(
      "/suscripciones/lista?cliente_id=test-cliente-ana",
    );
    expect(screen.getByRole("table").textContent).toMatch(/1\s*de 2/);
    expect(screen.getByText("2026-09")).toBeTruthy();
  });

  it("el resumen trae el ingreso recurrente, la mora por antigüedad y la retención", async () => {
    const Pagina = (await import("@/app/(app)/suscripciones/page")).default as Pagina;
    await pintar(await Pagina({}));
    expect(screen.getByText("Ingreso mensual recurrente")).toBeTruthy();
    expect(screen.getByText(/14,3 % frente al cierre del mes anterior/)).toBeTruthy();
    expect(screen.getByText("Hasta 7 días")).toBeTruthy();
    expect(screen.getByText("75 %")).toBeTruthy();
    expect(screen.getByText("octubre de 2026")).toBeTruthy();
  });

  it("avisa que las suscripciones de otra habilidad todavía no aparecen aquí", async () => {
    respuestas["/admin/settings/subscription-provider"] = {
      estado: "ok", efectivo: "pack_cobranza", configurado: "pack_cobranza", mensaje: "",
      habilitados: [{ id: "pack_subscriptions", label: "Suscripciones" }, { id: "pack_cobranza", label: "Cobranza" }],
    };
    const Pagina = (await import("@/app/(app)/suscripciones/lista/page")).default as Pagina;
    await pintar(await Pagina(buscar()));
    expect(screen.getByRole("note").textContent).toMatch(/se cobran con Cobranza.*todavía no aparecen aquí/);
  });
});

describe("acciones con confirmación", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  const acciones = (extra: Partial<typeof suscripcionDetalle> = {}) => (
    <FeedbackProviders>
      <AccionesSuscripcion suscripcion={{ ...suscripcionDetalle, ...extra }} puedeEscribir />
    </FeedbackProviders>
  );

  it("pausar pide confirmar, explica la consecuencia y llama al servidor", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    render(acciones());
    fireEvent.click(screen.getByRole("button", { name: "Pausar" }));
    const dialogo = await screen.findByRole("alertdialog").catch(() => screen.findByRole("dialog"));
    expect(dialogo.textContent).toMatch(/¿Pausar «Plan Pro» de Ana Prueba\?/);
    expect(dialogo.textContent).toMatch(/siguen abiertos/);
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(within(dialogo).getByRole("button", { name: "Pausar suscripción" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0][0]).toBe("/api/pack/pack_subscriptions/suscripciones/test-sub-1/pausar");
    expect(fetchMock.mock.calls[0][1].method).toBe("POST");
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("si el negocio cancela el diálogo no pasa nada", async () => {
    render(acciones());
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    const dialogo = await screen.findByRole("alertdialog").catch(() => screen.findByRole("dialog"));
    expect(dialogo.textContent).toMatch(/no se puede reanudar/);
    fireEvent.click(within(dialogo).getByRole("button", { name: /^(Volver|Cancelar)$/ }));
    await waitFor(() => expect(screen.queryByRole("alertdialog") ?? screen.queryByRole("dialog")).toBeNull());
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("una pausada se reanuda; una cancelada no ofrece nada", () => {
    const { rerender } = render(acciones({ acciones: ["reanudar", "cancelar"] }));
    expect(screen.getByRole("button", { name: "Reanudar" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Pausar" })).toBeNull();
    rerender(acciones({ acciones: [] }));
    expect(screen.queryByRole("group", { name: /Acciones/ })).toBeNull();
  });

  it("sin permiso de escritura no se muestra ninguna acción", () => {
    render(
      <FeedbackProviders>
        <AccionesSuscripcion suscripcion={suscripcionDetalle} puedeEscribir={false} />
      </FeedbackProviders>,
    );
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("un error del servidor se muestra en español y no refresca", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 409, json: async () => ({ error: "Solo se puede pausar una suscripción en prueba, activa o vencida." }) });
    render(acciones());
    fireEvent.click(screen.getByRole("button", { name: "Pausar" }));
    const dialogo = await screen.findByRole("alertdialog").catch(() => screen.findByRole("dialog"));
    fireEvent.click(within(dialogo).getByRole("button", { name: "Pausar suscripción" }));
    expect(await screen.findByText(/Solo se puede pausar/)).toBeTruthy();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("reenviar el link sin WhatsApp copia el link y lo dice", async () => {
    const copiar = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText: copiar } });
    fetchMock.mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({ enviado: false, link: "https://pago.test/abc", motivo: "sin_conversacion_whatsapp" }),
    });
    render(
      <FeedbackProviders>
        <ReenviarLink cargo={{ id: "test-cargo-1", periodo: "2026-10", monto: 200000, moneda: "COP" }} cliente="Ana Prueba" />
      </FeedbackProviders>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Reenviar link de pago a Ana Prueba/ }));
    const dialogo = await screen.findByRole("alertdialog").catch(() => screen.findByRole("dialog"));
    fireEvent.click(within(dialogo).getByRole("button", { name: "Reenviar link" }));
    await waitFor(() => expect(copiar).toHaveBeenCalledWith("https://pago.test/abc"));
    expect(await screen.findByText(/no tiene una conversación de WhatsApp.*Ya quedó copiado/)).toBeTruthy();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/pack/pack_subscriptions/cargos/test-cargo-1/reenviar-link");
  });
  it("registrar el pago pide la referencia, la envía y confirma", async () => {
    fetchMock.mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({ estado: "registrado", suscripcion_estado: "activa" }),
    });
    render(
      <FeedbackProviders>
        <RegistrarPago cargo={{ id: "test-cargo-1", periodo: "2026-10", monto: 200000, moneda: "COP" }} cliente="Ana Prueba" />
      </FeedbackProviders>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Registrar pago por transferencia de Ana Prueba/ }));
    const dialogo = await screen.findByRole("dialog");
    const enviar = within(dialogo).getByRole("button", { name: "Registrar pago" });
    expect((enviar as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(within(dialogo).getByLabelText(/Referencia de la transferencia/), { target: { value: "  CUS-123456 " } });
    expect((enviar as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(enviar);
    expect(await screen.findByText("Pago registrado. La suscripción está activa.")).toBeTruthy();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/pack/pack_subscriptions/cargos/test-cargo-1/registrar-pago");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ referencia: "CUS-123456" });
    expect(refresh).toHaveBeenCalled();
  });

  it("un error del servidor al registrar el pago se muestra y no cierra el diálogo", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 409, json: async () => ({ error: "El cobro ya está pagado con otra referencia." }) });
    render(
      <FeedbackProviders>
        <RegistrarPago cargo={{ id: "test-cargo-1", periodo: "2026-10", monto: 200000, moneda: "COP" }} cliente="Ana Prueba" />
      </FeedbackProviders>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Registrar pago por transferencia de Ana Prueba/ }));
    const dialogo = await screen.findByRole("dialog");
    fireEvent.change(within(dialogo).getByLabelText(/Referencia de la transferencia/), { target: { value: "ABC" } });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Registrar pago" }));
    expect(await screen.findByText(/ya está pagado con otra referencia/)).toBeTruthy();
    expect(screen.queryByRole("dialog")).not.toBeNull();
    expect(refresh).not.toHaveBeenCalled();
  });
});
