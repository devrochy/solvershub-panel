// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";

import type { MissingTemplates } from "@/lib/api/types";
import { resolverServidor } from "@/lib/testing/servidor";
import { desglosarFaltantes } from "@/lib/plantillas";

const apiFetch = vi.fn();
vi.mock("@/lib/api/server", () => ({ apiFetch: (...a: unknown[]) => apiFetch(...a) }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));

import { MissingTemplatesBanner } from "@/components/domain/missing-templates-banner";

const item = (tipo: "evento" | "opcion", clave?: string) => ({
  conversation_id: "c1",
  detail: "x",
  created_at: "2026-10-27T10:00:00Z",
  tipo,
  ...(clave ? { clave } : {}),
});

async function pintar(datos: Partial<MissingTemplates> & { total_7d: number }) {
  apiFetch.mockResolvedValue({ ok: true, status: 200, data: { recent: [], total_eventos_7d: 0, total_opciones_7d: 0, ...datos } });
  render(await resolverServidor(await MissingTemplatesBanner()));
}

beforeEach(() => apiFetch.mockReset());
afterEach(cleanup);

describe("MissingTemplatesBanner (SPEC-40)", () => {
  it("no muestra nada sin avisos o sin permiso", async () => {
    apiFetch.mockResolvedValue({ ok: false, status: 403, error: "x" });
    expect(await MissingTemplatesBanner()).toBeNull();
    apiFetch.mockResolvedValue({ ok: true, status: 200, data: { total_7d: 0, recent: [], total_eventos_7d: 0, total_opciones_7d: 0 } });
    expect(await MissingTemplatesBanner()).toBeNull();
  });

  it("solo eventos: texto de siempre y enlace a plantillas por evento", async () => {
    await pintar({ total_7d: 2, total_eventos_7d: 2 });
    const alerta = screen.getByRole("alert");
    expect(alerta.textContent).toMatch(/2 avisos no se enviaron/);
    expect(alerta.textContent).toMatch(/el evento no tiene una plantilla aprobada/);
    expect(screen.getByRole("link", { name: "Configurar plantillas por evento" }).getAttribute("href")).toBe("/plantillas/eventos");
    expect(screen.queryByRole("link", { name: "Ver plantillas con opciones" })).toBeNull();
  });

  it("solo opciones: no dice «el evento» y enlaza a la sección nueva", async () => {
    await pintar({ total_7d: 1, total_opciones_7d: 1, recent: [item("opcion", "confirmar_cita")] });
    const alerta = screen.getByRole("alert");
    expect(alerta.textContent).toMatch(/1 mensaje con opciones no se envió/);
    expect(alerta.textContent).not.toMatch(/el evento no tiene/);
    expect(alerta.textContent).toMatch(/confirmar_cita/);
    expect(screen.getByRole("link", { name: "Ver plantillas con opciones" }).getAttribute("href")).toBe("/plantillas-opciones");
    expect(screen.queryByRole("link", { name: "Configurar plantillas por evento" })).toBeNull();
  });

  it("mixto: separa los totales, cada uno con su enlace, en una sola alerta", async () => {
    await pintar({ total_7d: 5, total_eventos_7d: 3, total_opciones_7d: 2 });
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    const eventos = within(document.querySelector('[data-origen="eventos"]') as HTMLElement);
    const opciones = within(document.querySelector('[data-origen="opciones"]') as HTMLElement);
    expect(eventos.getByText(/3 avisos no se enviaron/)).toBeTruthy();
    expect(opciones.getByText(/2 mensajes con opciones no se enviaron/)).toBeTruthy();
    expect(eventos.getByRole("link").getAttribute("href")).toBe("/plantillas/eventos");
    expect(opciones.getByRole("link").getAttribute("href")).toBe("/plantillas-opciones");
  });

  it("un backend sin desglose cuenta todo como evento, como antes", async () => {
    apiFetch.mockResolvedValue({ ok: true, status: 200, data: { total_7d: 4, recent: [] } });
    render(await resolverServidor(await MissingTemplatesBanner()));
    expect(screen.getByRole("alert").textContent).toMatch(/4 avisos no se enviaron/);
    expect(screen.queryByRole("link", { name: "Ver plantillas con opciones" })).toBeNull();
  });
});

describe("desglosarFaltantes", () => {
  it("separa por origen y toma hasta tres claves distintas de opciones", () => {
    expect(
      desglosarFaltantes({
        total_7d: 6,
        total_eventos_7d: 1,
        total_opciones_7d: 5,
        recent: [item("opcion", "a"), item("opcion", "a"), item("evento"), item("opcion", "b"), item("opcion", "c"), item("opcion", "d")],
      }),
    ).toEqual({ eventos: 1, opciones: 5, clavesDeOpciones: ["a", "b", "c"] });
  });

  it("sin desglose todo es de eventos", () => {
    expect(desglosarFaltantes({ total_7d: 3 })).toEqual({ eventos: 3, opciones: 0, clavesDeOpciones: [] });
    expect(desglosarFaltantes({ total_7d: 3, total_eventos_7d: 0, total_opciones_7d: 0 })).toEqual({ eventos: 3, opciones: 0, clavesDeOpciones: [] });
  });
});
