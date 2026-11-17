// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { FormasDePagoDelAgente } from "@/components/domain/agentes/formas-de-pago-del-agente";
import { FeedbackProviders } from "@/components/ui/providers";
import { borradorDesde, estadoEnPantalla, problemaAlGuardar, type FormasDePago } from "@/lib/formas-de-pago";
import { violacionesGraves } from "@/lib/testing/axe";

// SPEC-48, HU-COM-21: formas de pago del agente en Personalizar › Habilidades.

function forma(method: FormasDePago["forms"][number]["method"], label: string, enabled: boolean, superpoder: string | null) {
  return { method, label, enabled, estado: enabled ? ("activa" as const) : ("apagada" as const), falta: "", instructions: "", superpoder };
}

const SIN_CONFIGURAR: FormasDePago = {
  agent_id: "a-1",
  configurada: false,
  forms: [
    forma("efectivo_contraentrega", "Contra entrega", true, null),
    forma("transferencia", "Transferencia", false, "pack_commerce.comprobar_transferencia"),
    forma("pago_en_linea", "Pago en línea", false, "pack_commerce.pago_en_linea"),
  ],
  transfer_accounts: [],
  transfer_proof_required: true,
  transfer_ocr_enabled: true,
  pago_en_linea_disponible: false,
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function montar(inicial = SIN_CONFIGURAR, puedeEditar = true) {
  return render(
    <FeedbackProviders>
      <FormasDePagoDelAgente agenteId="a-1" inicial={inicial} puedeEditar={puedeEditar} />
    </FeedbackProviders>,
  );
}

function tarjeta(metodo: string): HTMLElement {
  return document.querySelector(`[data-forma="${metodo}"]`) as HTMLElement;
}

describe("reglas de las formas de pago", () => {
  it("transferencia sin cuenta completa falta configurar; con cuenta, activa", () => {
    expect(estadoEnPantalla("transferencia", true, [], false).estado).toBe("falta_configurar");
    const cuenta = { entity: "Nequi", accountType: "", accountNumber: "300", holderName: "", holderDocument: "" };
    expect(estadoEnPantalla("transferencia", true, [cuenta], false).estado).toBe("activa");
    expect(estadoEnPantalla("pago_en_linea", true, [], false).estado).toBe("falta_configurar");
    expect(estadoEnPantalla("efectivo_contraentrega", false, [], false).estado).toBe("apagada");
  });

  it("no deja guardar sin ninguna forma encendida ni con una cuenta a medias", () => {
    const b = borradorDesde(SIN_CONFIGURAR);
    expect(problemaAlGuardar(b)).toBeNull();
    expect(problemaAlGuardar({ ...b, forms: b.forms.map((f) => ({ ...f, enabled: false })) })).toMatch(/al menos una/);
    expect(problemaAlGuardar({ ...b, transfer_accounts: [{ entity: "Nequi", accountType: "", accountNumber: "", holderName: "", holderDocument: "" }] })).toMatch(/cuenta 1/);
  });
});

describe("editor de formas de pago", () => {
  it("contra entrega activa por defecto y sin superpoder; accesible", async () => {
    const { container } = montar();
    expect(within(tarjeta("efectivo_contraentrega")).getByText("Activa")).toBeTruthy();
    expect(screen.getByRole("switch", { name: "Contra entrega" }).getAttribute("aria-checked")).toBe("true");
    expect(within(tarjeta("transferencia")).getByText("Apagada")).toBeTruthy();
    expect(await violacionesGraves(container)).toEqual([]);
  });

  it("encender transferencia sin cuenta dice «Falta configurar»; agregar la cuenta la activa y se guarda", async () => {
    const fetch = vi.fn(async (_url: string, init?: RequestInit) => {
      const cuerpo = JSON.parse(String(init?.body));
      return new Response(
        JSON.stringify({
          ...SIN_CONFIGURAR,
          configurada: true,
          transfer_accounts: cuerpo.transfer_accounts,
          forms: SIN_CONFIGURAR.forms.map((f) => ({ ...f, enabled: f.method !== "pago_en_linea", estado: f.method === "pago_en_linea" ? "apagada" : "activa" })),
        }),
        { status: 200 },
      );
    });
    vi.stubGlobal("fetch", fetch);
    montar();
    fireEvent.click(screen.getByRole("switch", { name: "Transferencia" }));
    expect(within(tarjeta("transferencia")).getByText("Falta configurar")).toBeTruthy();
    expect(within(tarjeta("transferencia")).getByText(/Agrega al menos una cuenta/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Agregar cuenta" }));
    const cuenta = screen.getByRole("group", { name: "Cuenta 1" });
    fireEvent.change(within(cuenta).getByLabelText(/Entidad/), { target: { value: "Bancolombia" } });
    fireEvent.change(within(cuenta).getByLabelText(/Número/), { target: { value: "123-456789-01" } });
    expect(within(tarjeta("transferencia")).getByText("Activa")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Guardar formas de pago" }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("/api/pack/commerce/agents/a-1/payment-forms");
    expect(init?.method).toBe("PUT");
    const enviado = JSON.parse(String(init?.body));
    expect(enviado.forms.find((f: { method: string }) => f.method === "transferencia").enabled).toBe(true);
    expect(enviado.transfer_accounts[0].accountNumber).toBe("123-456789-01");
    await waitFor(() => expect(screen.getByRole("button", { name: "Guardar formas de pago" }).hasAttribute("disabled")).toBe(true));
  });

  it("no guarda si se apaga todo y lo dice junto al botón", () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    montar();
    fireEvent.click(screen.getByRole("switch", { name: "Contra entrega" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar formas de pago" }));
    expect(screen.getByRole("alert").textContent).toMatch(/al menos una forma/);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("pago en línea sin Wompi enlaza a conectarlo; el error del servidor se muestra", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: { message: "Algo falló" } }), { status: 400 })));
    montar();
    fireEvent.click(screen.getByRole("switch", { name: "Pago en línea" }));
    expect(within(tarjeta("pago_en_linea")).getByRole("link", { name: "Conectar Wompi" }).getAttribute("href")).toBe("/conexiones/pagos");
    fireEvent.click(screen.getByRole("button", { name: "Guardar formas de pago" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Algo falló"));
  });

  it("sin permiso: todo en solo lectura y sin botón de guardar", () => {
    montar(SIN_CONFIGURAR, false);
    expect(screen.getByRole("switch", { name: "Contra entrega" }).hasAttribute("disabled")).toBe(true);
    expect(screen.queryByRole("button", { name: "Guardar formas de pago" })).toBeNull();
  });
});
