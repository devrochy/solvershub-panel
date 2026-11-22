// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

import { InstagramLogin } from "@/app/(app)/conexiones/instagram/_components/instagram-login";
import { ResultadoConPlan } from "@/components/domain/aviso-limite-de-plan";
import { motivoDe } from "@/components/domain/escalacion";
import { FeedbackProviders } from "@/components/ui/providers";
import { escalacionLabel } from "@/lib/labels";
import { destinoDeNotificacion, rutaDeNotificacion } from "@/lib/notificaciones/tipos";
import { RUTA_MEJORAR_PLAN } from "@/lib/plan-limite";
import { resetToasts } from "@/lib/toast-store";
import { useAction } from "@/lib/use-action";

// HU-BILL-27 parte 1: los 409 del plan v3 en Conexiones (aviso y toast con «Mejorar mi plan»), el motivo de
// escalación `creditos_agotados` y el destino de los avisos de consumo del crédito.

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/conexiones",
}));

afterEach(() => {
  cleanup();
  resetToasts();
  vi.unstubAllGlobals();
});

describe("aviso del plan en un resultado de Conexiones", () => {
  it("con un code del plan muestra el mensaje y «Mejorar mi plan»", () => {
    render(<ResultadoConPlan error="Tu plan Basic no incluye Instagram." code="plan_channel_not_included" />);
    const aviso = screen.getByRole("alert");
    expect(aviso.textContent).toMatch(/no incluye Instagram/);
    expect(screen.getByRole("link", { name: "Mejorar mi plan" }).getAttribute("href")).toBe(RUTA_MEJORAR_PLAN);
  });

  it("con otro code es el error de siempre, sin enlace", () => {
    render(<ResultadoConPlan error="La cuenta está en otro negocio." code="cuenta_en_otro_negocio" />);
    expect(screen.getByRole("alert").textContent).toMatch(/otro negocio/);
    expect(screen.queryByRole("link", { name: "Mejorar mi plan" })).toBeNull();
  });

  it("Instagram Login: el 409 `plan_channel_not_included` sale con el enlace a mejorar el plan", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ error: "Tu plan Basic no incluye Instagram. Mejora tu plan para conectarlo.", code: "plan_channel_not_included", details: { channel: "instagram", plan: "basic" } }), { status: 409 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<InstagramLogin />);
    fireEvent.click(screen.getByRole("button", { name: /Conectar con Instagram/ }));
    const enlace = await screen.findByRole("link", { name: "Mejorar mi plan" });
    expect(enlace.closest("[role=alert]")?.textContent).toMatch(/no incluye Instagram/);
  });
});

function Accion({ code }: { code?: string }) {
  const { run } = useAction();
  return (
    <button type="button" onClick={() => void run(async () => ({ ok: false, status: 409, error: "Tu plan permite 2 conexiones y ya tienes 2.", code }))}>
      Activar
    </button>
  );
}

describe("toast de una acción de fila (activar o reanudar una conexión)", () => {
  beforeEach(() => resetToasts());

  it("con el 409 del plan ofrece «Mejorar mi plan»", async () => {
    render(
      <FeedbackProviders>
        <Accion code="plan_limit_conexiones" />
      </FeedbackProviders>,
    );
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Activar" })));
    const toast = await screen.findByText(/permite 2 conexiones/);
    expect(toast.closest("[role=alert]")?.querySelector("a")?.getAttribute("href")).toBe(RUTA_MEJORAR_PLAN);
  });

  it("sin code del plan es el toast de siempre", async () => {
    render(
      <FeedbackProviders>
        <Accion code="conflicto" />
      </FeedbackProviders>,
    );
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Activar" })));
    await screen.findByText(/permite 2 conexiones/);
    expect(screen.queryByRole("link", { name: "Mejorar mi plan" })).toBeNull();
  });
});

describe("motivo de escalación y avisos del crédito (HU-BILL-20)", () => {
  it("`creditos_agotados` tiene su etiqueta y tono de advertencia", () => {
    expect(escalacionLabel("creditos_agotados")).toBe("Se agotó el crédito del plan");
    expect(motivoDe({ reason: "creditos_agotados" })).toEqual({ codigo: "creditos_agotados", etiqueta: "Se agotó el crédito del plan", tono: "warning" });
    expect(motivoDe({ reason: "x", reason_code: "creditos_agotados", reason_label: "Se agotó el crédito del plan" }).tono).toBe("warning");
  });

  it("los avisos de consumo del crédito llevan a Consumo y plan aunque no traigan target", () => {
    const permisos = { plan: "read" };
    for (const event_key of ["core.credit_80", "core.credit_100", "core.credit_buffer"]) {
      const destino = destinoDeNotificacion({ event_key, target: null });
      expect(destino).toEqual({ entity: "plan", id: null, section: "plan" });
      expect(rutaDeNotificacion(destino, permisos)).toBe("/plan");
    }
    // Quien no ve Consumo y plan no recibe un enlace que le daría 403.
    expect(rutaDeNotificacion(destinoDeNotificacion({ event_key: "core.credit_100", target: null }), { escalations: "read" })).toBeNull();
    // El target de la API manda; otros eventos sin target siguen sin destino.
    const conexion = { entity: "conexion", id: "c1", section: "connections" };
    expect(destinoDeNotificacion({ event_key: "core.credit_80", target: conexion })).toBe(conexion);
    expect(destinoDeNotificacion({ event_key: "core.otro", target: null })).toBeNull();
  });
});
