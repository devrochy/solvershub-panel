// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { ProductDialog } from "@/app/(app)/comercio/productos/_components/product-dialog";
import { PlanDialog } from "@/app/(app)/suscripciones/planes/_components/plan-dialog";
import type { PlanOut } from "@/lib/api/types";
import { violacionesGraves } from "@/lib/testing/axe";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, replace: vi.fn(), push: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
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
beforeEach(() => refresh.mockClear());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const plan = (precio: number, periodicidad: PlanOut["periodicidad"], extra: Partial<PlanOut> = {}): PlanOut => ({
  id: "p1", codigo: "PRO", nombre: "Plan Pro", descripcion: "", precio, moneda: "COP", periodicidad, trial_dias: 0,
  entitlements: { clientes: 500 }, plan_plataforma: "pro", activo: true, orden: 2, ...extra,
});
const sandbox = { minimo: 150_000, cuentas_de_transferencia: 2 };

function abrir(ui: React.ReactElement, nombre: string | RegExp = /^Editar/) {
  render(ui);
  fireEvent.click(screen.getByRole("button", { name: nombre }));
  return screen.findByRole("dialog");
}

describe("aviso al guardar un plan bajo el mínimo (HU-SUB-25, ahora en Planes)", () => {
  it("avisa sin bloquear y ofrece trimestral o anual con el precio ya calculado", async () => {
    const dialogo = await abrir(<PlanDialog plan={plan(80_000, "mensual")} minimo={sandbox} />);
    expect(within(dialogo).getByText("Este plan no podrá cobrarse con link de pago")).toBeTruthy();
    expect(within(dialogo).getByText(/mínimo para pagar en línea es/)).toBeTruthy();
    expect(within(dialogo).queryByText(/Todavía no configuraste cuentas/)).toBeNull();
    // No bloquea: el guardado sigue disponible.
    expect((within(dialogo).getByRole("button", { name: "Guardar plan" }) as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(within(dialogo).getByRole("button", { name: /Trimestral a/ }));
    expect((within(dialogo).getByLabelText("Precio (COP)") as HTMLInputElement).value).toBe("240000");
    expect((within(dialogo).getByLabelText("Periodicidad") as HTMLSelectElement).value).toBe("trimestral");
    // Con la periodicidad nueva ya llega al mínimo: el aviso desaparece.
    expect(within(dialogo).queryByText("Este plan no podrá cobrarse con link de pago")).toBeNull();
  });

  it("reacciona a lo que el dueño escribe y no avisa en un plan gratis", async () => {
    const dialogo = await abrir(<PlanDialog minimo={sandbox} />, "Nuevo plan");
    expect(within(dialogo).queryByText("Este plan no podrá cobrarse con link de pago")).toBeNull();
    fireEvent.change(within(dialogo).getByLabelText("Precio (COP)"), { target: { value: "80000" } });
    expect(within(dialogo).getByText("Este plan no podrá cobrarse con link de pago")).toBeTruthy();
    fireEvent.change(within(dialogo).getByLabelText("Precio (COP)"), { target: { value: "200000" } });
    expect(within(dialogo).queryByText("Este plan no podrá cobrarse con link de pago")).toBeNull();
  });

  it("sin cuentas de transferencia lo dice y enlaza a la configuración", async () => {
    const dialogo = await abrir(
      <PlanDialog plan={plan(80_000, "mensual")} minimo={{ minimo: 150_000, cuentas_de_transferencia: 0 }} />,
    );
    expect(within(dialogo).getByText(/Todavía no configuraste cuentas de transferencia/)).toBeTruthy();
    expect(within(dialogo).getByRole("link", { name: "Configurarlas" }).getAttribute("href")).toBe("/habilidades/pack_commerce");
  });

  it("sin mínimo del servidor (sin pasarela o error) no avisa", async () => {
    const dialogo = await abrir(<PlanDialog plan={plan(80_000, "mensual")} minimo={null} />);
    expect(within(dialogo).queryByText("Este plan no podrá cobrarse con link de pago")).toBeNull();
  });

  it("el aviso no tiene violaciones graves de accesibilidad", async () => {
    const dialogo = await abrir(<PlanDialog plan={plan(80_000, "mensual")} minimo={sandbox} />);
    expect(await violacionesGraves(dialogo)).toEqual([]);
  });
});

describe("guardar un plan (HU-SUB-31)", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("crea el plan con POST, sin bloquear aunque esté bajo el mínimo, y refresca la lista", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 201, json: async () => ({}) });
    const dialogo = await abrir(<PlanDialog minimo={sandbox} moneda="COP" />, "Nuevo plan");
    fireEvent.change(within(dialogo).getByLabelText(/^Nombre/), { target: { value: "Plan Básico" } });
    fireEvent.change(within(dialogo).getByLabelText(/^Código/), { target: { value: "PLAN-BASICO" } });
    fireEvent.change(within(dialogo).getByLabelText("Precio (COP)"), { target: { value: "80000" } });
    expect(within(dialogo).getByText("Este plan no podrá cobrarse con link de pago")).toBeTruthy();
    fireEvent.click(within(dialogo).getByRole("button", { name: "Guardar plan" }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0][0]).toBe("/api/pack/pack_subscriptions/planes");
    expect(fetchMock.mock.calls[0][1].method).toBe("POST");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      codigo: "PLAN-BASICO", nombre: "Plan Básico", precio: 80000, moneda: "COP", periodicidad: "mensual", trial_dias: 0, activo: true,
    });
  });

  it("editar usa PUT al plan y devuelve lo que el formulario no muestra", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    const dialogo = await abrir(<PlanDialog plan={plan(200_000, "mensual")} minimo={sandbox} />);
    fireEvent.change(within(dialogo).getByLabelText("Precio (COP)"), { target: { value: "250000" } });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Guardar plan" }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0][0]).toBe("/api/pack/pack_subscriptions/planes/p1");
    expect(fetchMock.mock.calls[0][1].method).toBe("PUT");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      precio: 250000, entitlements: { clientes: 500 }, plan_plataforma: "pro", orden: 2,
    });
  });

  it("la prueba solo se habilita en un plan de $0 y con precio se envía en 0", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    const dialogo = await abrir(<PlanDialog plan={plan(0, "mensual", { trial_dias: 30 })} />);
    const prueba = within(dialogo).getByLabelText("Días de prueba") as HTMLInputElement;
    expect(prueba.disabled).toBe(false);
    expect(prueba.value).toBe("30");
    fireEvent.change(within(dialogo).getByLabelText("Precio (COP)"), { target: { value: "99000" } });
    expect(prueba.disabled).toBe(true);
    expect(within(dialogo).getByText("Solo un plan de $0 tiene prueba.")).toBeTruthy();
    fireEvent.click(within(dialogo).getByRole("button", { name: "Guardar plan" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ precio: 99000, trial_dias: 0 });
  });

  it("un código repetido (409) se muestra y no cierra el diálogo", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 409, json: async () => ({ error: "Ya existe un plan con ese código." }) });
    const dialogo = await abrir(<PlanDialog plan={plan(200_000, "mensual")} />);
    fireEvent.click(within(dialogo).getByRole("button", { name: "Guardar plan" }));
    expect(await within(dialogo).findByText("Ya existe un plan con ese código.")).toBeTruthy();
    expect(screen.queryByRole("dialog")).not.toBeNull();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("un dato inválido se avisa en el diálogo sin llamar al servidor", async () => {
    const dialogo = await abrir(<PlanDialog plan={plan(200_000, "mensual")} />);
    fireEvent.change(within(dialogo).getByLabelText(/^Nombre/), { target: { value: "   " } });
    fireEvent.submit(within(dialogo).getByRole("button", { name: "Guardar plan" }).closest("form")!);
    expect(await within(dialogo).findByText("Escribe el nombre del plan.")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("Productos ya no habla de planes (HU-COM-18)", () => {
  it("el diálogo de producto no ofrece «Cobro», «Días de prueba» ni el aviso de mínimo", async () => {
    const dialogo = await abrir(
      <ProductDialog
        product={{ id: "p1", name: "Camisa", description: "", category_id: null, price: 80_000, variants: [{ sku: "CAM", stock: 3 }] }}
        categories={[]}
      />,
      "Editar",
    );
    expect(within(dialogo).queryByLabelText("Cobro")).toBeNull();
    expect(within(dialogo).queryByLabelText("Días de prueba")).toBeNull();
    expect(within(dialogo).queryByText(/link de pago/)).toBeNull();
    expect(within(dialogo).getByLabelText("Precio")).toBeTruthy();
    expect(within(dialogo).getByRole("button", { name: "Guardar producto" })).toBeTruthy();
  });
});
