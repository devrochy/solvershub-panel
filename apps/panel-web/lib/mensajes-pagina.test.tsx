// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

import { FeedbackProviders } from "@/components/ui/providers";
import { catalogoDeMensajes } from "@/lib/testing/fixtures";
import { resolverServidor } from "@/lib/testing/servidor";

const apiFetch = vi.fn();
vi.mock("@/lib/api/server", () => ({ apiFetch: (...a: unknown[]) => apiFetch(...a) }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/mensajes",
  useSearchParams: () => new URLSearchParams(),
}));

import MensajesPage from "@/app/(app)/mensajes/page";

beforeEach(() => {
  apiFetch.mockReset();
  window.matchMedia ??= (() => ({ matches: false, addEventListener: () => undefined, removeEventListener: () => undefined })) as unknown as typeof window.matchMedia;
});
afterEach(cleanup);

async function pintar() {
  render(<FeedbackProviders>{await resolverServidor(await MensajesPage())}</FeedbackProviders>);
}

describe("pantalla Mensajes (solo lectura)", () => {
  it("lista los cuatro tipos y cada mensaje enlaza a su editor actual", async () => {
    apiFetch.mockResolvedValue({ ok: true, status: 200, data: catalogoDeMensajes });
    await pintar();
    expect(apiFetch).toHaveBeenCalledWith("/mensajes/catalogo");
    expect(screen.getByRole("heading", { level: 1, name: "Mensajes" })).toBeTruthy();
    const href = (nombre: RegExp) => screen.getByRole("link", { name: nombre }).getAttribute("href");
    expect(href(/^cobro_nuevo$/)).toBe("/conexiones/meta/c1/plantillas");
    expect(href(/^subscription\.charge_created$/)).toBe("/plantillas/eventos");
    expect(href(/^Confirmar cita$/)).toBe("/plantillas-opciones/confirmar_cita");
    expect(href(/correo de confirmación/)).toBe("/habilidades/pack_calendar");
  });

  it("no ofrece ninguna acción que escriba", async () => {
    apiFetch.mockResolvedValue({ ok: true, status: 200, data: catalogoDeMensajes });
    await pintar();
    expect(screen.queryByRole("button", { name: /nueva|crear|guardar|publicar|enviar|eliminar/i })).toBeNull();
  });

  it("el filtro por tipo deja solo ese tipo", async () => {
    apiFetch.mockResolvedValue({ ok: true, status: 200, data: catalogoDeMensajes });
    await pintar();
    fireEvent.click(screen.getByRole("tab", { name: /Aviso por evento/ }));
    const tabla = screen.getByRole("table");
    expect(within(tabla).getByText("subscription.charge_created")).toBeTruthy();
    expect(within(tabla).queryByText("cobro_nuevo")).toBeNull();
  });

  it("avisa qué tipos no se muestran y por qué", async () => {
    apiFetch.mockResolvedValue({
      ok: true,
      status: 200,
      data: { mensajes: [catalogoDeMensajes.mensajes[1]], omitidas: [{ tipo: "opciones", motivo: "bandera_apagada" }, { tipo: "meta", motivo: "sin_permiso" }], truncado: [] },
    });
    await pintar();
    expect(screen.getByText(/Plantilla con opciones: la función está desactivada/)).toBeTruthy();
    expect(screen.getByText(/Plantilla de WhatsApp: tu rol no tiene acceso/)).toBeTruthy();
    expect(screen.queryByRole("tab", { name: /Plantilla con opciones/ })).toBeNull();
  });

  it("sin ninguna sección legible explica el 403 sin mostrar el error crudo", async () => {
    apiFetch.mockResolvedValue({ ok: false, status: 403, error: "Sin permiso." });
    await pintar();
    expect(screen.getByRole("alert").textContent).toMatch(/no tiene acceso a ninguna/);
  });
});
