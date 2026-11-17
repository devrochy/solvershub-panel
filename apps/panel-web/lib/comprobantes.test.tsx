// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { ComprobanteDelPedido } from "@/app/(app)/comercio/pedidos/_components/comprobante-del-pedido";
import { FeedbackProviders } from "@/components/ui/providers";
import { datosLeidos, motivosEnPalabras, type Comprobantes } from "@/lib/comprobantes";
import { pagoDePedido } from "@/lib/ventas";
import { violacionesGraves } from "@/lib/testing/axe";

// SPEC-48, HU-COM-22: el comprobante del pedido, en revisión, con confirmar y rechazar.

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), replace: vi.fn(), push: vi.fn() }) }));

const EN_REVISION: Comprobantes = {
  order_id: "o-1",
  payment_status: "en_revision",
  payment_method: "transferencia",
  payment_status_changed_at: null,
  payment_status_reason: null,
  items: [
    {
      id: "p-1",
      status: "en_revision",
      image_url: "https://api.test/api/v1/files/firma",
      extracted: { monto: 85000, fecha: "2026-11-17", estado: "exitoso", banco: "Bancolombia", cuenta_destino: "8901" },
      match: { resultado: "en_revision", motivos: ["sin_cuenta"] },
      reviewed_at: null,
      review_note: null,
      created_at: "2026-11-17T10:00:00Z",
    },
  ],
};

function respuesta(cuerpo: unknown, status = 200) {
  return new Response(JSON.stringify(cuerpo), { status });
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function montar(puedeEditar = true) {
  return render(
    <FeedbackProviders>
      <ComprobanteDelPedido pedidoId="o-1" moneda="COP" puedeEditar={puedeEditar} />
    </FeedbackProviders>,
  );
}

describe("comprobantes en palabras", () => {
  it("en revisión es un estado de pago con su palabra", () => {
    expect(pagoDePedido("en_revision")).toEqual({ label: "Pago en revisión", tono: "info" });
  });

  it("los motivos y los datos leídos no se muestran crudos", () => {
    expect(motivosEnPalabras({ motivos: ["monto_menor", "x"] })).toEqual(["El monto es menor que el total", "Otro motivo"]);
    const datos = datosLeidos({ monto: 85000, cuenta_destino: "8901", estado: "exitoso" }, (n) => `$ ${n}`);
    expect(datos).toContainEqual({ label: "Cuenta", valor: "terminada en 8901" });
    expect(datos).toContainEqual({ label: "Estado", valor: "Exitosa" });
  });
});

describe("bloque Comprobante", () => {
  it("muestra la foto, lo leído y el motivo; confirmar deja el pedido pagado", async () => {
    const fetch = vi.fn(async (url: string, init?: RequestInit) =>
      init?.method === "POST"
        ? respuesta({ ...EN_REVISION, payment_status: "pagado", items: [{ ...EN_REVISION.items[0], status: "pagado" }] })
        : respuesta(EN_REVISION),
    );
    vi.stubGlobal("fetch", fetch);
    const { container } = montar();
    expect(await screen.findByText("En revisión")).toBeTruthy();
    expect(screen.getByRole("img", { name: "Comprobante que mandó el cliente" })).toBeTruthy();
    expect(screen.getByText("terminada en 8901")).toBeTruthy();
    expect(screen.getByText("No se ve la cuenta que recibe")).toBeTruthy();
    expect(await violacionesGraves(container)).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Confirmar pago" }));
    await waitFor(() => expect(screen.getByText("Coincide: pago confirmado")).toBeTruthy());
    const [, init] = fetch.mock.calls[1];
    expect(JSON.parse(String(init?.body))).toMatchObject({ accion: "confirmar", proof_id: "p-1" });
    expect(screen.queryByRole("button", { name: "Confirmar pago" })).toBeNull();
  });

  it("rechazar pide el motivo antes de enviar", async () => {
    const fetch = vi.fn(async (_url: string, init?: RequestInit) =>
      init?.method === "POST"
        ? respuesta({ ...EN_REVISION, payment_status: "rechazado", items: [{ ...EN_REVISION.items[0], status: "rechazado", review_note: "No coincide" }] })
        : respuesta(EN_REVISION),
    );
    vi.stubGlobal("fetch", fetch);
    montar();
    fireEvent.click(await screen.findByRole("button", { name: "Rechazar" }));
    const enviar = screen.getByRole("button", { name: "Rechazar comprobante" });
    expect(enviar.hasAttribute("disabled")).toBe(true);
    fireEvent.change(screen.getByLabelText("Motivo del rechazo"), { target: { value: "No coincide" } });
    fireEvent.click(enviar);
    await waitFor(() => expect(screen.getByText("No coincide", { selector: "span" })).toBeTruthy());
    expect(JSON.parse(String(fetch.mock.calls[1][1]?.body))).toMatchObject({ accion: "rechazar", nota: "No coincide" });
  });

  it("sin comprobante ofrece marcar pagado; sin permiso, solo se lee", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => respuesta({ ...EN_REVISION, payment_status: "pendiente", items: [] })));
    montar();
    expect(await screen.findByText(/Aún no llega un comprobante/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Marcar pagado" })).toBeTruthy();
    cleanup();
    vi.stubGlobal("fetch", vi.fn(async () => respuesta(EN_REVISION)));
    montar(false);
    expect(await screen.findByText("En revisión")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Confirmar pago" })).toBeNull();
  });

  it("si no carga, lo dice y deja reintentar", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => respuesta({ error: { message: "caído" } }, 500)));
    montar();
    expect(await screen.findByText("No pudimos cargar el comprobante")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeTruthy();
  });
});
