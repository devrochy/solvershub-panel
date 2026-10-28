// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { FeedbackProviders } from "@/components/ui/providers";
import type { PlatformTenant } from "@/lib/api/types";
import { violacionesGraves } from "@/lib/testing/axe";

// Interruptor «Avisos por canal» (ADR-0178 D2): mismo comportamiento que el de plantillas con opciones, con su ruta
// y sus textos. Aquí se prueba lo propio (ruta, textos, el que sea solo del master y que conviva con el otro).

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh }),
  usePathname: () => "/tenants",
  useSearchParams: () => new URLSearchParams(),
}));

import { AvisosPorCanalSection } from "@/app/(app)/tenants/_components/avisos-por-canal-section";
import { TenantActions } from "@/app/(app)/tenants/_components/tenant-actions";

const ID = "0b6f6d3e-6a43-4c39-9a52-4b6c1c1e2f10";
const URL_BANDERA = `/api/platform/tenants/${ID}/avisos-por-canal`;
const NEGOCIO: PlatformTenant = {
  id: ID,
  name: "Café Aurora",
  slug: "cafe-aurora",
  status: "active",
  created_at: "2026-10-01T10:00:00Z",
  plan_name: "Básico",
  plan_status: "active",
  operational: true,
};

type Respuesta = { status: number; cuerpo?: unknown } | Error;
let estado: boolean;
let lecturas: Respuesta[];
let escrituras: Respuesta[];
const llamadas: { metodo: string; url: string; cuerpo?: unknown }[] = [];

const json = (r: { status: number; cuerpo?: unknown }) => new Response(JSON.stringify(r.cuerpo ?? {}), { status: r.status });

function simular() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const metodo = init?.method ?? "GET";
      // El otro interruptor (opciones directas) vive en el mismo diálogo: responde apagado, sin contar.
      if (String(url).endsWith("/opciones-directas")) return json({ status: 200, cuerpo: { habilitada: false } });
      if (!String(url).endsWith("/avisos-por-canal")) return json({ status: 404, cuerpo: { error: "otra" } });
      llamadas.push({ metodo, url: String(url), cuerpo: init?.body ? JSON.parse(String(init.body)) : undefined });
      const cola = metodo === "GET" ? lecturas : escrituras;
      const siguiente = cola.shift();
      if (siguiente instanceof Error) throw siguiente;
      if (siguiente) return json(siguiente);
      if (metodo === "PUT") {
        estado = (JSON.parse(String(init?.body)) as { habilitada: boolean }).habilitada;
        return json({ status: 200, cuerpo: { habilitada: estado } });
      }
      return json({ status: 200, cuerpo: { habilitada: estado } });
    }),
  );
}

beforeEach(() => {
  estado = false;
  lecturas = [];
  escrituras = [];
  llamadas.length = 0;
  refresh.mockReset();
  window.matchMedia ??= (() => ({ matches: false, addEventListener: () => undefined, removeEventListener: () => undefined })) as unknown as typeof window.matchMedia;
  simular();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function pintar() {
  render(
    <FeedbackProviders>
      <AvisosPorCanalSection tenantId={ID} negocio="Café Aurora" />
    </FeedbackProviders>,
  );
}
const interruptor = () => screen.findByRole("switch", { name: "Avisos por canal" });

describe("interruptor «Avisos por canal» por negocio (ADR-0178 D2)", () => {
  it("lee el estado con GET de su ruta y lo muestra apagado de fábrica", async () => {
    pintar();
    expect((await interruptor()).getAttribute("aria-checked")).toBe("false");
    expect(screen.getByText("Apagados")).toBeTruthy();
    expect(llamadas).toEqual([{ metodo: "GET", url: URL_BANDERA, cuerpo: undefined }]);
  });

  it("muestra encendido lo que devuelve la API", async () => {
    estado = true;
    pintar();
    expect((await interruptor()).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByText("Encendidos")).toBeTruthy();
  });

  it("encender pide confirmación con lo que envía y sus políticas, y al aceptar hace PUT {habilitada: true}", async () => {
    pintar();
    fireEvent.click(await interruptor());
    const dialogo = await screen.findByRole("alertdialog");
    expect(dialogo.textContent).toContain("¿Encender los avisos por canal en Café Aurora?");
    expect(dialogo.textContent).toMatch(/clientes finales/);
    expect(dialogo.textContent).toMatch(/permite escribir primero/);
    expect(dialogo.textContent).toMatch(/dentro de las 24 horas/);
    expect(dialogo.textContent).toMatch(/los avisos de cobro no salen por QR/);
    expect(dialogo.textContent).toMatch(/Enciéndelos primero en un negocio de prueba/);
    expect(llamadas.map((l) => l.metodo)).toEqual(["GET"]);

    fireEvent.click(within(dialogo).getByRole("button", { name: "Encender" }));
    await waitFor(() => expect(screen.getByRole("switch", { name: "Avisos por canal" }).getAttribute("aria-checked")).toBe("true"));
    expect(llamadas[1]).toEqual({ metodo: "PUT", url: URL_BANDERA, cuerpo: { habilitada: true } });
    expect(await screen.findByText("Avisos por canal encendidos en Café Aurora.")).toBeTruthy();
    expect(refresh).toHaveBeenCalled();
  });

  it("apagar avisa que vuelven a salir solo por WhatsApp y hace PUT {habilitada: false}", async () => {
    estado = true;
    pintar();
    fireEvent.click(await interruptor());
    const dialogo = await screen.findByRole("alertdialog");
    expect(dialogo.textContent).toContain("¿Apagar los avisos por canal en Café Aurora?");
    expect(dialogo.textContent).toMatch(/solo por WhatsApp/);
    fireEvent.click(within(dialogo).getByRole("button", { name: "Apagar" }));
    await waitFor(() => expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("false"));
    expect(llamadas[1]).toEqual({ metodo: "PUT", url: URL_BANDERA, cuerpo: { habilitada: false } });
    expect(await screen.findByText("Avisos por canal apagados en Café Aurora.")).toBeTruthy();
  });

  it("cancelar la confirmación no escribe nada", async () => {
    pintar();
    fireEvent.click(await interruptor());
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(llamadas.map((l) => l.metodo)).toEqual(["GET"]);
  });

  it("un 403 al leer explica que es del admin de plataforma, sin interruptor ni reintento", async () => {
    lecturas.push({ status: 403 });
    pintar();
    const alerta = await screen.findByRole("alert");
    expect(alerta.textContent).toMatch(/solo el admin de plataforma puede encender o apagar los avisos por canal/);
    expect(screen.queryByRole("switch")).toBeNull();
    expect(screen.queryByRole("button", { name: "Reintentar" })).toBeNull();
  });

  it("un PUT con 404 dice que el negocio no existe y deja el estado como estaba", async () => {
    pintar();
    escrituras.push({ status: 404 });
    fireEvent.click(await interruptor());
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Encender" }));
    await waitFor(() => expect(screen.getAllByRole("alert").map((a) => a.textContent).join(" ")).toMatch(/No encontramos este negocio/));
    expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("false");
  });

  it("un corte de red al guardar se puede reintentar con el mismo interruptor", async () => {
    pintar();
    escrituras.push(new TypeError("fetch failed"));
    fireEvent.click(await interruptor());
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Encender" }));
    await waitFor(() => expect(screen.getAllByRole("alert").map((a) => a.textContent).join(" ")).toMatch(/Puede que el cambio no se haya aplicado/));
    fireEvent.click(screen.getByRole("switch"));
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Encender" }));
    await waitFor(() => expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("true"));
  });

  it("sin violaciones graves de accesibilidad", async () => {
    pintar();
    await interruptor();
    expect(await violacionesGraves(document.body)).toEqual([]);
  });
});

describe("el interruptor solo lo ve el master en las acciones del negocio", () => {
  async function abrir(esMaster: boolean) {
    render(
      <FeedbackProviders>
        <TenantActions tenant={NEGOCIO} esMaster={esMaster} />
      </FeedbackProviders>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Gestionar Café Aurora/ }));
    await screen.findByText("Gestionar negocio");
  }

  it("el master ve los dos interruptores, cada uno con su id", async () => {
    await abrir(true);
    expect(await interruptor()).toBeTruthy();
    expect(screen.getByRole("switch", { name: "Plantillas con opciones" })).toBeTruthy();
    const ids = screen.getAllByRole("switch").map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("los demás roles no lo ven ni se consulta la bandera", async () => {
    await abrir(false);
    expect(screen.queryByRole("switch", { name: "Avisos por canal" })).toBeNull();
    expect(screen.queryByText("Avisos por canal")).toBeNull();
    expect(llamadas).toEqual([]);
  });

  it("con `abrirInicial` el foco queda en el interruptor de opciones, no en este", async () => {
    render(
      <FeedbackProviders>
        <TenantActions tenant={NEGOCIO} esMaster abrirInicial />
      </FeedbackProviders>,
    );
    const otro = await screen.findByRole("switch", { name: "Plantillas con opciones" });
    await waitFor(() => expect(document.activeElement).toBe(otro));
    expect(await interruptor()).not.toBe(document.activeElement);
  });
});
