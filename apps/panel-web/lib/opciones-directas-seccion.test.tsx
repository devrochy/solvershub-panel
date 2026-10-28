// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { FeedbackProviders } from "@/components/ui/providers";
import type { PlatformTenant } from "@/lib/api/types";
import { violacionesGraves } from "@/lib/testing/axe";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh }),
  usePathname: () => "/tenants",
  useSearchParams: () => new URLSearchParams(),
}));

import { OpcionesDirectasSection } from "@/app/(app)/tenants/_components/opciones-directas-section";
import { TenantActions } from "@/app/(app)/tenants/_components/tenant-actions";

const ID = "0b6f6d3e-6a43-4c39-9a52-4b6c1c1e2f10";
const URL_BANDERA = `/api/platform/tenants/${ID}/opciones-directas`;
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
      if (!String(url).endsWith("/opciones-directas")) return json({ status: 404, cuerpo: { error: "otra" } });
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
      <OpcionesDirectasSection tenantId={ID} negocio="Café Aurora" />
    </FeedbackProviders>,
  );
}
const interruptor = () => screen.findByRole("switch", { name: "Plantillas con opciones" });

describe("interruptor «Plantillas con opciones» por negocio (SPEC-40, PR 10b)", () => {
  it("lee el estado con GET y lo muestra apagado de fábrica", async () => {
    pintar();
    const sw = await interruptor();
    expect(sw.getAttribute("aria-checked")).toBe("false");
    expect(screen.getByText("Apagadas")).toBeTruthy();
    expect(llamadas).toEqual([{ metodo: "GET", url: URL_BANDERA, cuerpo: undefined }]);
  });

  it("encender pide confirmación con lo que habilita y, al aceptar, hace PUT {habilitada: true}", async () => {
    pintar();
    fireEvent.click(await interruptor());
    const dialogo = await screen.findByRole("alertdialog");
    expect(dialogo.textContent).toContain("¿Encender las plantillas con opciones en Café Aurora?");
    expect(dialogo.textContent).toMatch(/editor de plantillas con opciones/);
    expect(dialogo.textContent).toMatch(/herramienta de envío para los agentes/);
    expect(dialogo.textContent).toMatch(/sin LLM/);
    expect(dialogo.textContent).toMatch(/solo en negocios de prueba hasta cerrar la prueba real de Meta/);
    expect(dialogo.textContent).toMatch(/Para apagarlas/);
    // Todavía no se escribió nada: solo la lectura.
    expect(llamadas.map((l) => l.metodo)).toEqual(["GET"]);

    fireEvent.click(within(dialogo).getByRole("button", { name: "Encender" }));
    await waitFor(() => expect(screen.getByRole("switch", { name: "Plantillas con opciones" }).getAttribute("aria-checked")).toBe("true"));
    expect(llamadas[1]).toEqual({ metodo: "PUT", url: URL_BANDERA, cuerpo: { habilitada: true } });
    expect(screen.getByText("Encendidas")).toBeTruthy();
    expect(await screen.findByText("Plantillas con opciones encendidas en Café Aurora.")).toBeTruthy();
    expect(refresh).toHaveBeenCalled();
  });

  it("cancelar la confirmación no escribe nada", async () => {
    pintar();
    fireEvent.click(await interruptor());
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(llamadas.map((l) => l.metodo)).toEqual(["GET"]);
    expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("false");
  });

  it("apagar usa otra confirmación, más liviana, y avisa que los botones enviados dejan de ejecutar", async () => {
    estado = true;
    pintar();
    const sw = await interruptor();
    expect(sw.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(sw);
    const dialogo = await screen.findByRole("alertdialog");
    expect(dialogo.textContent).toContain("¿Apagar las plantillas con opciones en Café Aurora?");
    expect(dialogo.textContent).toMatch(/botones que ya se enviaron dejan de ejecutar/);
    expect(dialogo.textContent).not.toMatch(/negocios de prueba/);
    fireEvent.click(within(dialogo).getByRole("button", { name: "Apagar" }));
    await waitFor(() => expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("false"));
    expect(llamadas[1]).toEqual({ metodo: "PUT", url: URL_BANDERA, cuerpo: { habilitada: false } });
    expect(await screen.findByText("Plantillas con opciones apagadas en Café Aurora.")).toBeTruthy();
  });

  it("encender, apagar y volver a encender deja siempre el estado que confirma la API, sin errores", async () => {
    pintar();
    for (const [boton, final] of [["Encender", "true"], ["Apagar", "false"], ["Encender", "true"]] as const) {
      fireEvent.click(await interruptor());
      fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: boton }));
      await waitFor(() => expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe(final));
    }
    expect(llamadas.filter((l) => l.metodo === "PUT").map((l) => l.cuerpo)).toEqual([
      { habilitada: true },
      { habilitada: false },
      { habilitada: true },
    ]);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("si la API ya tenía ese valor, se muestra el estado que ella devuelve", async () => {
    pintar();
    // La lectura (vieja) dijo apagada, pero otro master ya la había encendido: el PUT idempotente responde encendida.
    escrituras.push({ status: 200, cuerpo: { habilitada: true } });
    fireEvent.click(await interruptor());
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Encender" }));
    await waitFor(() => expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("true"));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("dos clics seguidos abren una sola confirmación y mandan un solo PUT", async () => {
    pintar();
    const sw = await interruptor();
    fireEvent.click(sw);
    fireEvent.click(sw);
    const dialogos = await screen.findAllByRole("alertdialog");
    expect(dialogos).toHaveLength(1);
    fireEvent.click(within(dialogos[0]).getByRole("button", { name: "Encender" }));
    await waitFor(() => expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("true"));
    expect(llamadas.filter((l) => l.metodo === "PUT")).toHaveLength(1);
  });

  it("no tiene violaciones graves de accesibilidad, ni con el interruptor ni con el error", async () => {
    pintar();
    await interruptor();
    expect(await violacionesGraves(document.body)).toEqual([]);
    cleanup();
    lecturas.push({ status: 403 });
    pintar();
    await screen.findByRole("alert");
    expect(await violacionesGraves(document.body)).toEqual([]);
  });

  it("403 al leer: mensaje de permiso, sin interruptor y sin reintento", async () => {
    lecturas.push({ status: 403, cuerpo: { error: "forbidden" } });
    pintar();
    const alerta = await screen.findByRole("alert");
    expect(alerta.textContent).toMatch(/solo el admin de plataforma puede encender o apagar/);
    expect(screen.queryByRole("switch")).toBeNull();
    expect(screen.queryByRole("button", { name: "Reintentar" })).toBeNull();
    expect(alerta.textContent).not.toMatch(/403|forbidden/i);
  });

  it("404 al leer: negocio no encontrado, sin reintento", async () => {
    lecturas.push({ status: 404, cuerpo: { error: "not_found" } });
    pintar();
    expect((await screen.findByRole("alert")).textContent).toMatch(/No encontramos este negocio/);
    expect(screen.queryByRole("button", { name: "Reintentar" })).toBeNull();
  });

  it("error de red al leer: ofrece Reintentar y, al volver la red, muestra el interruptor", async () => {
    lecturas.push(new TypeError("fetch failed"));
    pintar();
    expect((await screen.findByRole("alert")).textContent).toMatch(/No se pudo contactar el servidor/);
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect((await interruptor()).getAttribute("aria-checked")).toBe("false");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("un PUT con 403 deja el estado como estaba y explica el permiso", async () => {
    pintar();
    escrituras.push({ status: 403, cuerpo: { error: "forbidden" } });
    fireEvent.click(await interruptor());
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Encender" }));
    const alertas = await screen.findAllByRole("alert");
    expect(alertas.map((a) => a.textContent).join(" ")).toMatch(/solo el admin de plataforma/);
    expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("false");
    expect(screen.getByText(/No se cambió nada/)).toBeTruthy();
  });

  it("un PUT con 404 dice que el negocio no existe", async () => {
    pintar();
    escrituras.push({ status: 404, cuerpo: { error: "not_found" } });
    fireEvent.click(await interruptor());
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Encender" }));
    await waitFor(() => expect(screen.getAllByRole("alert").map((a) => a.textContent).join(" ")).toMatch(/No encontramos este negocio/));
  });

  it("un corte de red al guardar se puede reintentar con el mismo interruptor", async () => {
    pintar();
    escrituras.push(new TypeError("fetch failed"));
    fireEvent.click(await interruptor());
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Encender" }));
    await waitFor(() => expect(screen.getAllByRole("alert").map((a) => a.textContent).join(" ")).toMatch(/Puede que el cambio no se haya aplicado/));
    expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("false");
    // El interruptor volvió a quedar libre: reintento.
    fireEvent.click(screen.getByRole("switch"));
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Encender" }));
    await waitFor(() => expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("true"));
    expect(screen.queryByText(/Puede que el cambio no se haya aplicado/)).toBeNull();
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

  it("el master lo ve", async () => {
    await abrir(true);
    expect(await interruptor()).toBeTruthy();
  });

  it("los demás roles no ven el interruptor ni se consulta la bandera", async () => {
    await abrir(false);
    expect(screen.queryByRole("switch", { name: "Plantillas con opciones" })).toBeNull();
    expect(screen.queryByText("Plantillas con opciones")).toBeNull();
    expect(llamadas).toEqual([]);
  });

  it("con `abrirInicial` (enlace del editor) el diálogo nace abierto con el interruptor enfocado", async () => {
    render(
      <FeedbackProviders>
        <TenantActions tenant={NEGOCIO} esMaster abrirInicial />
      </FeedbackProviders>,
    );
    const sw = await interruptor();
    await waitFor(() => expect(document.activeElement).toBe(sw));
  });

  it("con `abrirInicial` pero sin ser master no abre nada", () => {
    render(
      <FeedbackProviders>
        <TenantActions tenant={NEGOCIO} esMaster={false} abrirInicial />
      </FeedbackProviders>,
    );
    expect(screen.queryByText("Gestionar negocio")).toBeNull();
  });
});
