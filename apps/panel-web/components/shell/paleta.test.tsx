// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { violacionesGraves } from "@/lib/testing/axe";
import { ConfirmProvider } from "@/components/ui/confirm";
import type { Permisos } from "@/lib/shell/navegacion";

import { AtajosProvider } from "./atajos";
import { ShellProvider } from "./shell-context";

const push = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard", useRouter: () => ({ push, refresh }) }));

const DUENO: Permisos = {
  dashboard: "write",
  conversations: "write",
  escalations: "write",
  settings: "write",
  "pack_cobranza:promesas": "write",
  "pack_cobranza:clientes": "write",
  pack_commerce: "write",
};
const PACKS = { pack_cobranza: { enabled: true }, pack_commerce: { enabled: true } };

function montar({
  permisos = DUENO,
  puedeEditarAsistente = true,
  atajosActivos = true,
}: { permisos?: Permisos; puedeEditarAsistente?: boolean; atajosActivos?: boolean } = {}) {
  return render(
    <ShellProvider permisos={permisos} packs={PACKS} puedeEditarAsistente={puedeEditarAsistente}>
      <ConfirmProvider>
        <AtajosProvider atajosActivosIniciales={atajosActivos}>
          <button type="button">Antes</button>
          <input aria-label="Nota" />
          <main id="contenido">
            <input name="q" aria-label="Filtro de la página" />
          </main>
        </AtajosProvider>
      </ConfirmProvider>
    </ShellProvider>,
  );
}

function pulsar(key: string, opciones: KeyboardEventInit = {}, destino: Element | Window = window) {
  fireEvent.keyDown(destino, { key, ...opciones });
}

async function abrirPaleta() {
  pulsar("k", { ctrlKey: true });
  return screen.findByRole("combobox", {}, { timeout: 3000 });
}

const fetchMock = vi.fn();

beforeEach(() => {
  push.mockReset();
  refresh.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  // jsdom no implementa scrollIntoView (cmdk lo usa para el elemento activo).
  Element.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  document.cookie = "panel_atajos=; path=/; max-age=0";
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("paleta de comandos (HU-DS-05)", () => {
  it("Ctrl+K, «prome» y Enter llevan a Cobranza › Promesas, y el foco vuelve a donde estaba", async () => {
    montar();
    const antes = screen.getByRole("button", { name: "Antes" });
    antes.focus();
    const entrada = await abrirPaleta();
    fireEvent.change(entrada, { target: { value: "prome" } });
    const opcion = screen.getAllByRole("option")[0];
    expect(opcion.textContent).toBe("Cobranza › Promesas");
    expect(opcion.getAttribute("aria-selected")).toBe("true");
    pulsar("Enter", {}, entrada);
    expect(push).toHaveBeenCalledWith("/cobranza/promesas");
    await waitFor(() => expect(screen.queryByRole("combobox")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(antes));
  });

  it("Ctrl+K abre la paleta también desde un campo, y Escape la cierra", async () => {
    montar();
    const nota = screen.getByRole("textbox", { name: "Nota" });
    nota.focus();
    pulsar("k", { ctrlKey: true }, nota);
    const entrada = await screen.findByRole("combobox", {}, { timeout: 3000 });
    pulsar("Escape", {}, entrada);
    await waitFor(() => expect(screen.queryByRole("combobox")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(nota));
  });

  it("un colaborador sin permiso de cobranza no ve sus secciones", async () => {
    montar({ permisos: { conversations: "write", pack_commerce: "read" }, puedeEditarAsistente: false });
    const entrada = await abrirPaleta();
    fireEvent.change(entrada, { target: { value: "prom" } });
    const opciones = screen.getAllByRole("option").map((o) => o.textContent);
    expect(opciones).toContain("Ventas › Promociones");
    expect(opciones.some((o) => o?.startsWith("Cobranza"))).toBe(false);
  });

  it("busca registros a los 250 ms y los agrupa por sección", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          resultados: [
            {
              seccion: "pack_cobranza:clientes",
              label: "Clientes de cobranza",
              items: [{ id: "k1", tipo: "cliente_cobranza", titulo: "Ana Pérez", subtitulo: "CC 123", extra: {} }],
            },
          ],
        }),
        { status: 200 },
      ),
    );
    montar();
    const entrada = await abrirPaleta();
    fireEvent.change(entrada, { target: { value: "Ana" } });
    expect(screen.getByText("Buscando en los registros…")).toBeTruthy();
    const grupo = await screen.findByRole("group", { name: "Clientes de cobranza" }, { timeout: 2000 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/buscar?q=Ana");
    fireEvent.click(within(grupo).getByRole("option", { name: /Ana Pérez/ }));
    expect(push).toHaveBeenCalledWith("/cobranza/clientes/k1");
  });

  it("si la búsqueda falla lo dice y sigue mostrando las secciones", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: "x" }), { status: 502 }));
    montar();
    const entrada = await abrirPaleta();
    fireEvent.change(entrada, { target: { value: "zzz" } });
    expect(
      await screen.findByText(/No se pudo buscar en los registros/, {}, { timeout: 2000 }),
    ).toBeTruthy();
  });

  it("«pausar» ofrece Pausar asistente, que pide confirmación con su consecuencia", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ pausado: true }), { status: 200 }));
    montar();
    const entrada = await abrirPaleta();
    fireEvent.change(entrada, { target: { value: "pausar" } });
    pulsar("Enter", {}, entrada);
    const dialogo = await screen.findByRole("alertdialog");
    expect(within(dialogo).getByText("¿Pausar el asistente?")).toBeTruthy();
    expect(within(dialogo).getByText(/Dejará de responder a los clientes/)).toBeTruthy();
    fireEvent.click(within(dialogo).getByRole("button", { name: "Pausar asistente" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls.find(([u]) => u === "/api/settings/asistente") as [string, RequestInit];
    expect(url).toBe("/api/settings/asistente");
    expect(JSON.parse(init.body as string)).toEqual({ pausado: true });
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("sin permiso de escritura no aparece Pausar asistente", async () => {
    montar({ puedeEditarAsistente: false });
    const entrada = await abrirPaleta();
    fireEvent.change(entrada, { target: { value: "pausar" } });
    expect(screen.queryByRole("option", { name: /Pausar asistente/ })).toBeNull();
  });

  it("anuncia el resultado activo y la cantidad, sin violaciones graves de axe", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ resultados: [] }), { status: 200 }));
    montar();
    const entrada = await abrirPaleta();
    fireEvent.change(entrada, { target: { value: "co" } });
    const activa = screen.getAllByRole("option")[0];
    await waitFor(() => expect(entrada.getAttribute("aria-activedescendant")).toBe(activa.id));
    pulsar("ArrowDown", {}, entrada);
    const siguiente = screen.getAllByRole("option")[1];
    await waitFor(() => expect(entrada.getAttribute("aria-activedescendant")).toBe(siguiente.id));
    expect(screen.getByText(/^\d+ resultados/).getAttribute("aria-live")).toBe("polite");
    expect(await violacionesGraves(document.body)).toEqual([]);
  });
});

describe("atajos de una tecla", () => {
  it("g y luego i van al Resumen; no dentro de un campo", () => {
    montar();
    pulsar("g");
    pulsar("i");
    expect(push).toHaveBeenCalledWith("/dashboard");
    push.mockReset();
    const nota = screen.getByRole("textbox", { name: "Nota" });
    pulsar("g", {}, nota);
    pulsar("i", {}, nota);
    expect(push).not.toHaveBeenCalled();
  });

  it("apagados, g i no hace nada pero Ctrl+K sigue funcionando", async () => {
    montar({ atajosActivos: false });
    pulsar("g");
    pulsar("i");
    expect(push).not.toHaveBeenCalled();
    expect(await abrirPaleta()).toBeTruthy();
  });

  it("/ enfoca el filtro de la página", () => {
    montar();
    pulsar("/");
    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Filtro de la página" }));
  });

  it("? abre la ayuda, desde donde se apagan los atajos (cookie)", async () => {
    montar();
    pulsar("?", { shiftKey: true });
    const ayuda = await screen.findByRole("dialog", { name: "Atajos de teclado" });
    expect(within(ayuda).getByText("Ir a Resumen")).toBeTruthy();
    const interruptor = within(ayuda).getByRole("switch", { name: "Atajos de una tecla" });
    expect(interruptor.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(interruptor);
    expect(document.cookie).toContain("panel_atajos=apagados");
    expect(interruptor.getAttribute("aria-checked")).toBe("false");
    expect(await violacionesGraves(ayuda)).toEqual([]);
    await act(async () => pulsar("Escape", {}, ayuda));
    pulsar("g");
    pulsar("i");
    expect(push).not.toHaveBeenCalled();
  });
});
