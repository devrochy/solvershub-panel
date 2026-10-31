// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { AccionesSuscripcion } from "@/app/(app)/suscripciones/_components/acciones-suscripcion";
import { ReenviarLink } from "@/app/(app)/suscripciones/_components/reenviar-link";
import { ConfirmarPago } from "@/app/(app)/suscripciones/_components/confirmar-pago";
import { RegistrarPago } from "@/app/(app)/suscripciones/_components/registrar-pago";
import { AccionesDePlan } from "@/app/(app)/suscripciones/planes/_components/acciones-de-plan";
import { FeedbackProviders } from "@/components/ui/providers";
import { RESPUESTAS, cargoDeInscripcion, suscripcionDetalle, suscripcionPendiente } from "@/lib/testing/fixtures";
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

const lectura = () => ({
  ...(RESPUESTAS["/admin/me"] as object),
  role: "colaborador",
  permissions: { "pack_subscriptions:suscripciones": "read" },
});

describe("planes e inscripciones pendientes (SPEC-43, HU-SUB-31)", () => {
  it("Planes lista nombre, precio, periodicidad, prueba y estado, con crear, editar y desactivar", async () => {
    const Pagina = (await import("@/app/(app)/suscripciones/planes/page")).default as Pagina;
    const { container } = await pintar(await Pagina({}));
    expect(screen.getByRole("heading", { level: 1, name: "Planes" })).toBeTruthy();
    const filas = within(screen.getByRole("table")).getAllByRole("row");
    const pro = filas.find((f) => f.textContent?.includes("Plan Pro"))!;
    expect(pro.textContent).toMatch(/PLAN-PRO/);
    expect(pro.textContent).toMatch(/200\.000/);
    expect(pro.textContent).toMatch(/Mensual/);
    expect(pro.textContent).toMatch(/Activo/);
    const free = filas.find((f) => f.textContent?.includes("Plan Free"))!;
    expect(free.textContent).toMatch(/Gratis/);
    expect(free.textContent).toMatch(/30 días/);
    const viejo = filas.find((f) => f.textContent?.includes("Plan Viejo"))!;
    expect(viejo.textContent).toMatch(/Inactivo/);
    expect(viejo.textContent).toMatch(/Trimestral/);
    expect(screen.getByRole("button", { name: "Nuevo plan" })).toBeTruthy();
    expect(within(pro).getByRole("button", { name: "Editar Plan Pro" })).toBeTruthy();
    expect(within(pro).getByRole("button", { name: "Desactivar Plan Pro" })).toBeTruthy();
    expect(within(viejo).getByRole("button", { name: "Activar Plan Viejo" })).toBeTruthy();
    expect(await violacionesGraves(container)).toEqual([]);
  });

  it("un colaborador de solo lectura ve los planes sin crear, editar ni desactivar", async () => {
    respuestas["/admin/me"] = lectura();
    const Pagina = (await import("@/app/(app)/suscripciones/planes/page")).default as Pagina;
    await pintar(await Pagina({}));
    expect(screen.getByRole("table").textContent).toMatch(/Plan Pro/);
    expect(screen.queryByRole("button", { name: /Nuevo plan/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^(Editar|Desactivar|Activar|Eliminar)/ })).toBeNull();
    expect(screen.queryByRole("columnheader", { name: "Acciones" })).toBeNull();
  });

  it("sin planes muestra el vacío con la acción de crear el primero", async () => {
    respuestas["/pack/pack_subscriptions/planes"] = [];
    const Pagina = (await import("@/app/(app)/suscripciones/planes/page")).default as Pagina;
    await pintar(await Pagina({}));
    expect(screen.getByText("Todavía no tienes planes")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Nuevo plan" }).length).toBeGreaterThanOrEqual(1);
  });

  it("si la API falla avisa y no pinta una lista vacía", async () => {
    delete respuestas["/pack/pack_subscriptions/planes"];
    const Pagina = (await import("@/app/(app)/suscripciones/planes/page")).default as Pagina;
    await pintar(await Pagina({}));
    expect(screen.getByRole("alert").textContent).toMatch(/No se pudieron cargar los planes/);
    expect(screen.queryByText("Todavía no tienes planes")).toBeNull();
  });

  it("sin permiso de escritura el vacío no ofrece crear", async () => {
    respuestas["/admin/me"] = lectura();
    respuestas["/pack/pack_subscriptions/planes"] = [];
    const Pagina = (await import("@/app/(app)/suscripciones/planes/page")).default as Pagina;
    await pintar(await Pagina({}));
    expect(screen.queryByRole("button", { name: "Nuevo plan" })).toBeNull();
  });

  it("el filtro «Plan» de la lista se alimenta de /planes, con los apagados rotulados", async () => {
    const Pagina = (await import("@/app/(app)/suscripciones/lista/page")).default as Pagina;
    await pintar(await Pagina(buscar()));
    const select = screen.getByLabelText("Plan") as HTMLSelectElement;
    expect([...select.options].map((o) => o.textContent)).toEqual(["Todos", "Plan Free", "Plan Pro", "Plan Viejo (inactivo)"]);
    expect([...select.options].map((o) => o.value)).toEqual(["", "test-plan-free", "test-plan-pro", "test-plan-viejo"]);
  });

  it("una inscripción pendiente muestra el badge, el cargo con su monto y «Confirmar pago»", async () => {
    respuestas["/pack/pack_subscriptions/cargos"] = { items: [cargoDeInscripcion], total: 1, page: 1, page_size: 100, has_more: false };
    const Pagina = (await import("@/app/(app)/suscripciones/lista/page")).default as Pagina;
    await pintar(await Pagina(buscar()));
    const fila = within(screen.getByRole("table")).getAllByRole("row").find((f) => f.textContent?.includes("Caro Prueba"))!;
    expect(fila.textContent).toMatch(/Pendiente de pago/);
    expect(fila.textContent).toMatch(/Espera .*99\.000/);
    expect(within(fila).getByRole("button", { name: "Confirmar pago de Caro Prueba" })).toBeTruthy();
    // Solo las inscripciones que esperan pago llevan el botón.
    expect(screen.getAllByRole("button", { name: /Confirmar pago de/ })).toHaveLength(1);
  });

  it("sin el cargo a mano, la lista cae al valor del período y sigue ofreciendo confirmar", async () => {
    delete respuestas["/pack/pack_subscriptions/cargos"];
    const Pagina = (await import("@/app/(app)/suscripciones/lista/page")).default as Pagina;
    await pintar(await Pagina(buscar()));
    const fila = within(screen.getByRole("table")).getAllByRole("row").find((f) => f.textContent?.includes("Caro Prueba"))!;
    expect(fila.textContent).toMatch(/Espera .*99\.000/);
    expect(within(fila).getByRole("button", { name: "Confirmar pago de Caro Prueba" })).toBeTruthy();
  });

  it("un colaborador de solo lectura ve el badge pero no «Confirmar pago»", async () => {
    respuestas["/admin/me"] = lectura();
    const Pagina = (await import("@/app/(app)/suscripciones/lista/page")).default as Pagina;
    await pintar(await Pagina(buscar()));
    expect(screen.getByRole("table").textContent).toMatch(/Pendiente de pago/);
    expect(screen.queryByRole("button", { name: /Confirmar pago/ })).toBeNull();
  });

  it("el detalle de una inscripción pendiente ofrece confirmar su cargo de inscripción", async () => {
    respuestas["/pack/pack_subscriptions/suscripciones/test-sub-3"] = {
      ...suscripcionDetalle, ...suscripcionPendiente, cambio_programado: null, acciones: ["cancelar"], cargos: [cargoDeInscripcion], historial: [],
    };
    const Pagina = (await import("@/app/(app)/suscripciones/lista/[id]/page")).default as Pagina;
    await pintar(await Pagina({ params: Promise.resolve({ id: "test-sub-3" }) }));
    expect(screen.getAllByText("Pendiente de pago").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Inscripción")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Confirmar pago de Caro Prueba" })).toBeTruthy();
    // El cargo de inscripción no se reenvía ni se registra como pago de período.
    expect(screen.queryByRole("button", { name: /Reenviar link/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Registrar pago por transferencia/ })).toBeNull();
  });

  it("el resumen cuenta las inscripciones que esperan pago y muestra el descuento vigente", async () => {
    respuestas["/pack/pack_subscriptions/metricas"] = {
      ...(RESPUESTAS["/pack/pack_subscriptions/metricas"] as object),
      pendientes_de_pago: 2, mrr_descuento: 30000, suscripciones_con_descuento: 2,
    };
    const Pagina = (await import("@/app/(app)/suscripciones/page")).default as Pagina;
    await pintar(await Pagina({}));
    expect(screen.getByText("Esperando pago")).toBeTruthy();
    expect(screen.getByText(/Descuento vigente: −.*30\.000\/mes en 2 suscripciones/)).toBeTruthy();
  });
});

describe("Comercio › Productos sin planes (HU-COM-18)", () => {
  it("la tabla no tiene filtro «Tipo» ni badge de plan", async () => {
    respuestas["/pack/commerce/modulos"] = { aliados: false };
    respuestas["/pack/commerce/products"] = [
      { id: "pr1", name: "Camisa", description: "", category_id: null, category: "Ropa", price: 80000, variants: [{ id: "v1", sku: "CAM", attributes: {}, price: 80000, stock: 4, active: true }] },
    ];
    respuestas["/pack/commerce/categories"] = [];
    respuestas["/admin/datos-de-prueba/ventas"] = { modulo: "ventas", titulo: "Ventas", disponible: false, motivo: "x" };
    const Pagina = (await import("@/app/(app)/comercio/productos/page")).default as Pagina;
    await pintar(await Pagina(buscar({ tipo: "planes" })));
    expect(screen.getByRole("table").textContent).toMatch(/Camisa/);
    expect(screen.getByRole("table").textContent).toMatch(/CAM · .*80\.000 · 4 en stock/);
    expect(screen.queryByLabelText("Tipo")).toBeNull();
    expect(screen.queryByText(/Planes \(suscripción\)/)).toBeNull();
    expect(screen.queryByText(/plan mensual|Plan mensual/)).toBeNull();
    // `?tipo=planes` (enlace viejo) ya no filtra nada.
    expect(screen.getByRole("table").textContent).toMatch(/Camisa/);
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
  it("confirmar el pago pide la referencia, la envía a confirmar-pago y confirma", async () => {
    fetchMock.mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({ estado: "confirmado", suscripcion_id: "test-sub-3", cargo_id: "c", suscripcion_estado: "activa" }),
    });
    render(
      <FeedbackProviders>
        <ConfirmarPago suscripcionId="test-sub-3" plan="Plan Premium" cliente="Caro Prueba" cargo={{ monto: 99000, moneda: "COP", tipo: "inscripcion" }} />
      </FeedbackProviders>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Confirmar pago de Caro Prueba" }));
    const dialogo = await screen.findByRole("dialog");
    expect(dialogo.textContent).toMatch(/Caro Prueba pagó la inscripción al plan «Plan Premium» por .*99\.000/);
    const enviar = within(dialogo).getByRole("button", { name: "Confirmar pago" });
    expect((enviar as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(within(dialogo).getByLabelText(/Referencia de la transferencia/), { target: { value: "  CUS-998877 " } });
    fireEvent.click(enviar);
    expect(await screen.findByText("Pago confirmado. La suscripción está activa.")).toBeTruthy();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/pack/pack_subscriptions/suscripciones/test-sub-3/confirmar-pago");
    expect(fetchMock.mock.calls[0][1].method).toBe("POST");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ referencia: "CUS-998877" });
    expect(refresh).toHaveBeenCalled();
  });

  it("repetir la confirmación con la misma referencia responde ya_confirmado y no duplica", async () => {
    fetchMock.mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({ estado: "ya_confirmado", suscripcion_id: "test-sub-3", cargo_id: "c", suscripcion_estado: "activa" }),
    });
    render(
      <FeedbackProviders>
        <ConfirmarPago suscripcionId="test-sub-3" plan="Plan Premium" cliente="Caro Prueba" cargo={{ monto: 99000, moneda: "COP" }} />
      </FeedbackProviders>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Confirmar pago de Caro Prueba" }));
    const dialogo = await screen.findByRole("dialog");
    fireEvent.change(within(dialogo).getByLabelText(/Referencia de la transferencia/), { target: { value: "CUS-998877" } });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Confirmar pago" }));
    expect(await screen.findByText(/ya estaba confirmado/)).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("un error al confirmar el pago se muestra y no cierra el diálogo", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 409, json: async () => ({ error: "Esta inscripción ya no espera pago." }) });
    render(
      <FeedbackProviders>
        <ConfirmarPago suscripcionId="test-sub-3" plan="Plan Premium" cliente="Caro Prueba" cargo={{ monto: 99000 }} />
      </FeedbackProviders>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Confirmar pago de Caro Prueba" }));
    const dialogo = await screen.findByRole("dialog");
    fireEvent.change(within(dialogo).getByLabelText(/Referencia de la transferencia/), { target: { value: "ABC" } });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Confirmar pago" }));
    expect(await screen.findByText(/ya no espera pago/)).toBeTruthy();
    expect(screen.queryByRole("dialog")).not.toBeNull();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("desactivar un plan pide confirmar y lo envía completo con activo en falso", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    const plan = (RESPUESTAS["/pack/pack_subscriptions/planes"] as { id: string }[])[1] as never;
    render(
      <FeedbackProviders>
        <AccionesDePlan plan={plan} />
      </FeedbackProviders>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Desactivar Plan Pro" }));
    const dialogo = await screen.findByRole("alertdialog").catch(() => screen.findByRole("dialog"));
    expect(dialogo.textContent).toMatch(/siguen pagando/);
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(within(dialogo).getByRole("button", { name: "Desactivar plan" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0][0]).toBe("/api/pack/pack_subscriptions/planes/test-plan-pro");
    expect(fetchMock.mock.calls[0][1].method).toBe("PUT");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      codigo: "PLAN-PRO", precio: 200000, activo: false, entitlements: { clientes: 500, mensajes: 15000 }, plan_plataforma: "pro", orden: 1,
    });
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("eliminar un plan usa DELETE y avisa que los inscritos siguen cobrándose", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 204, json: async () => ({}) });
    const plan = (RESPUESTAS["/pack/pack_subscriptions/planes"] as { id: string }[])[1] as never;
    render(
      <FeedbackProviders>
        <AccionesDePlan plan={plan} />
      </FeedbackProviders>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Eliminar Plan Pro" }));
    const dialogo = await screen.findByRole("alertdialog").catch(() => screen.findByRole("dialog"));
    expect(dialogo.textContent).toMatch(/siguen cobrándose/);
    fireEvent.click(within(dialogo).getByRole("button", { name: "Eliminar plan" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0][1].method).toBe("DELETE");
    await waitFor(() => expect(refresh).toHaveBeenCalled());
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
