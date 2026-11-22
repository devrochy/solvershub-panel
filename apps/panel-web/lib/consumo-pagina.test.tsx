// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";

import { FeedbackProviders } from "@/components/ui/providers";
import type { Me, PlanResponse } from "@/lib/api/types";
import { me as sesionDueno, plan as planDePrueba } from "@/lib/testing/fixtures";
import { resolverServidor } from "@/lib/testing/servidor";

// Rediseño B de Consumo y plan: una sola página con cajones de planes y pagos; los costos técnicos
// son del master.

const respuestas: Record<string, unknown> = {};
const redirigido = vi.hoisted(() => ({ a: null as string | null }));

vi.mock("@/lib/api/server", async (original) => ({
  ...(await original<typeof import("@/lib/api/server")>()),
  apiFetch: vi.fn(async (ruta: string) => {
    const data = respuestas[ruta.split("?")[0]];
    return data === undefined ? { ok: false, status: 404, error: "sin fixture" } : { ok: true, status: 200, data };
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => "/plan",
  useSearchParams: () => new URLSearchParams(),
  redirect: (a: string) => {
    redirigido.a = a;
    throw new Error(`NEXT_REDIRECT ${a}`);
  },
}));

afterEach(() => {
  cleanup();
  redirigido.a = null;
  for (const k of Object.keys(respuestas)) delete respuestas[k];
});

type Pagina = (p: { searchParams: Promise<Record<string, string>> }) => Promise<ReactNode>;

const CON_PAGOS: PlanResponse = {
  ...planDePrueba,
  payments: [
    { plan_id: "basic", amount_cop: 129000, status: "pending", provider: "wompi", created_at: "2026-11-09T12:00:00Z", paid_at: null, checkout_url: "https://checkout.wompi.co/l/x", periodo: "2026-11", concepto: "plan" },
    { plan_id: "basic", amount_cop: 129000, status: "declined", provider: "plataforma", created_at: "2026-10-09T12:00:00Z", paid_at: null, checkout_url: null, periodo: "2026-10", concepto: "plan" },
  ],
  cobro: { referencia: "PLAN-BASIC-2026-11", inicio: "2026-10-20T12:00:00Z", fin: "2026-11-19T12:00:00Z", plan_id: "basic", monto_cop: 129000, estado: "pendiente", pagado_por: null, disponible_desde: null },
};

async function pintar(ruta: string, sp: Record<string, string> = {}) {
  const pagina = (await import(`@/app/(app)${ruta}/page`)).default as unknown as Pagina;
  render(<FeedbackProviders>{await resolverServidor(await pagina({ searchParams: Promise.resolve(sp) }))}</FeedbackProviders>);
}

describe("Consumo y plan (rediseño B)", () => {
  it("el plan va en una tarjeta con su pago pendiente como acción principal (CYP-01)", async () => {
    respuestas["/admin/plan"] = CON_PAGOS;
    respuestas["/admin/me"] = sesionDueno;
    await pintar("/plan");
    expect(screen.getByRole("heading", { level: 1, name: "Consumo y plan" })).toBeTruthy();
    expect(screen.getByText("Pago pendiente")).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Pagar \$\s129\.000$/ })).toBeTruthy();
    expect(screen.queryByText(/PLAN-BASIC/)).toBeNull();
    expect(screen.getByRole("link", { name: "Pagos anteriores" }).getAttribute("href")).toBe("/plan?ver=pagos");
    // El dueño no ve costos en dólares ni el enlace a los costos técnicos.
    expect(screen.queryByRole("link", { name: "Costos técnicos" })).toBeNull();
  });

  it("los planes se comparan en un cajón con su acción (CYP-05)", async () => {
    respuestas["/admin/plan"] = CON_PAGOS;
    respuestas["/admin/me"] = sesionDueno;
    await pintar("/plan", { ver: "planes" });
    const cajon = await screen.findByRole("dialog", { name: "Planes" });
    expect(within(cajon).getByRole("button", { name: "Mejorar a Premium" })).toBeTruthy();
    expect(within(cajon).getByRole("button", { name: "Mejorar a Empresarial" })).toBeTruthy();
    expect(within(cajon).getByText("Tu plan actual")).toBeTruthy();
    expect(within(cajon).queryByText("∞")).toBeNull();
    // Precio y créditos al mes del catálogo v3 (HU-BILL-18).
    const premium = within(cajon).getByText("Premium").closest("li") as HTMLElement;
    expect(within(premium).getByText(/299\.000 al mes$/)).toBeTruthy();
    expect(within(premium).getByText("40.000 créditos al mes")).toBeTruthy();
    // Premium va destacado, y es el único.
    expect(within(premium).getByText("Más elegido")).toBeTruthy();
    expect(within(cajon).getAllByText("Más elegido")).toHaveLength(1);
    // Topes estructurales y beneficios en palabras simples.
    expect(within(premium).getByText("6 conexiones")).toBeTruthy();
    expect(within(premium).getByText("3 correos")).toBeTruthy();
    expect(within(premium).getByText("IA Avanzada para tus agentes")).toBeTruthy();
    expect(within(premium).getByText("15 % de descuento al comprar créditos")).toBeTruthy();
    expect(within(premium).getByText("El crédito que no uses pasa al mes siguiente")).toBeTruthy();
    expect(within(premium).getByText("Tu marca, sin la de SolversHub")).toBeTruthy();
    expect(within(premium).getByText("Historial de 1 año")).toBeTruthy();
    expect(within(premium).getByText("Campañas a tus clientes")).toBeTruthy();
    expect(within(premium).getByText("Soporte prioritario")).toBeTruthy();
    const free = within(cajon).getByText("Free").closest("li") as HTMLElement;
    expect(within(free).getByText("Sin correos")).toBeTruthy();
    const empresarial = within(cajon).getByText("Empresarial").closest("li") as HTMLElement;
    expect(within(empresarial).getByText("Agentes sin límite")).toBeTruthy();
    expect(within(empresarial).getByText("Historial sin límite")).toBeTruthy();
    // Nada de topes de volumen de v1.
    expect(within(cajon).queryByText(/conversaciones|mensajes|notas de voz al mes/i)).toBeNull();
  });

  it("los pagos van por mes, con «Pagar» y qué pasó si no se aprobó (CYP-06)", async () => {
    respuestas["/admin/plan"] = CON_PAGOS;
    respuestas["/admin/me"] = sesionDueno;
    await pintar("/plan", { ver: "pagos" });
    const cajon = await screen.findByRole("dialog", { name: "Pagos" });
    expect(within(cajon).getByText("Noviembre 2026 · Plan Basic")).toBeTruthy();
    expect(within(cajon).getByRole("link", { name: /^Pagar \$\s129\.000$/ }).getAttribute("href")).toBe("https://checkout.wompi.co/l/x");
    expect(within(cajon).getByText(/Cobro automático · El banco no lo aprobó\./)).toBeTruthy();
  });

  it("el master ve el enlace a los costos técnicos del negocio", async () => {
    respuestas["/admin/plan"] = planDePrueba;
    respuestas["/admin/me"] = { ...sesionDueno, role: "master" } satisfies Me;
    await pintar("/plan");
    expect(screen.getByRole("link", { name: "Costos técnicos" }).getAttribute("href")).toBe("/costos");
  });
});

describe("Costos técnicos (Plataforma, solo master)", () => {
  it("quien no es master vuelve a Consumo y plan", async () => {
    respuestas["/admin/me"] = sesionDueno;
    await expect(pintar("/costos")).rejects.toThrow("NEXT_REDIRECT /plan");
    expect(redirigido.a).toBe("/plan");
  });
});
