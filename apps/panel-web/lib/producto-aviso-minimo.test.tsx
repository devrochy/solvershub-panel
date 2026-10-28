// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

import { ProductDialog } from "@/app/(app)/comercio/productos/_components/product-dialog";
import { violacionesGraves } from "@/lib/testing/axe";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn(), push: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
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
afterEach(cleanup);

const producto = (price: number, billing_period: string | null) => ({
  id: "p1", name: "Plan Pro", description: "", category_id: null, price,
  variants: [{ sku: "PRO", stock: 0, billing_period }],
});
const sandbox = { minimo: 150_000, cuentas_de_transferencia: 2 };

function abrir(ui: React.ReactElement) {
  render(ui);
  fireEvent.click(screen.getByRole("button", { name: "Editar" }));
  return screen.findByRole("dialog");
}

describe("aviso al guardar un plan bajo el mínimo (HU-SUB-25)", () => {
  it("avisa sin bloquear y ofrece trimestral o anual con el precio ya calculado", async () => {
    const dialogo = await abrir(<ProductDialog product={producto(80_000, "mensual")} categories={[]} minimo={sandbox} />);
    expect(within(dialogo).getByText("Este plan no podrá cobrarse con link de pago")).toBeTruthy();
    expect(within(dialogo).getByText(/mínimo para pagar en línea es/)).toBeTruthy();
    expect(within(dialogo).queryByText(/Todavía no configuraste cuentas/)).toBeNull();
    // No bloquea: el guardado sigue disponible.
    expect((within(dialogo).getByRole("button", { name: "Guardar producto" }) as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(within(dialogo).getByRole("button", { name: /Plan trimestral a/ }));
    expect((within(dialogo).getByLabelText("Precio") as HTMLInputElement).value).toBe("240000");
    expect((within(dialogo).getByLabelText("Cobro") as HTMLSelectElement).value).toBe("trimestral");
    // Con el plan nuevo ya llega al mínimo: el aviso desaparece.
    expect(within(dialogo).queryByText("Este plan no podrá cobrarse con link de pago")).toBeNull();
  });

  it("reacciona a lo que el dueño escribe y no avisa en venta única", async () => {
    const dialogo = await abrir(<ProductDialog product={producto(80_000, null)} categories={[]} minimo={sandbox} />);
    expect(within(dialogo).queryByText("Este plan no podrá cobrarse con link de pago")).toBeNull();
    fireEvent.change(within(dialogo).getByLabelText("Cobro"), { target: { value: "mensual" } });
    expect(within(dialogo).getByText("Este plan no podrá cobrarse con link de pago")).toBeTruthy();
    fireEvent.change(within(dialogo).getByLabelText("Precio"), { target: { value: "200000" } });
    expect(within(dialogo).queryByText("Este plan no podrá cobrarse con link de pago")).toBeNull();
  });

  it("sin cuentas de transferencia lo dice y enlaza a la configuración", async () => {
    const dialogo = await abrir(
      <ProductDialog product={producto(80_000, "mensual")} categories={[]} minimo={{ minimo: 150_000, cuentas_de_transferencia: 0 }} />,
    );
    expect(within(dialogo).getByText(/Todavía no configuraste cuentas de transferencia/)).toBeTruthy();
    expect(within(dialogo).getByRole("link", { name: "Configurarlas" }).getAttribute("href")).toBe("/habilidades/pack_commerce");
  });

  it("sin mínimo del servidor (sin pasarela o error) no avisa", async () => {
    const dialogo = await abrir(<ProductDialog product={producto(80_000, "mensual")} categories={[]} minimo={null} />);
    expect(within(dialogo).queryByText("Este plan no podrá cobrarse con link de pago")).toBeNull();
  });

  it("el aviso no tiene violaciones graves de accesibilidad", async () => {
    const dialogo = await abrir(<ProductDialog product={producto(80_000, "mensual")} categories={[]} minimo={sandbox} />);
    expect(await violacionesGraves(dialogo)).toEqual([]);
  });
});
