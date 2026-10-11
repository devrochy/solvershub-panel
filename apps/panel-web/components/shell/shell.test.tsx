// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import ErrorDePagina from "@/app/(app)/error";
import NoEncontrada from "@/app/not-found";
import { FeedbackProviders } from "@/components/ui/providers";
import { DataTable, type Column } from "@/components/ui/data-table";
import { violacionesGraves } from "@/lib/testing/axe";

import { EstadoAsistente } from "./estado-asistente";
import { TenantSwitcher } from "./tenant-switcher";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  refresh.mockClear();
});

const respuesta = (status: number, body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));

describe("Estado del asistente (HU-UI-03)", () => {
  it("activo: no muestra nada", () => {
    const { container } = render(<EstadoAsistente pausado={false} puedeReactivar />);
    expect(container.textContent).toBe("");
  });

  it("pausado sin permiso: lo dice, sin botón", () => {
    render(<EstadoAsistente pausado puedeReactivar={false} />);
    expect(screen.getByRole("status").textContent).toContain("Asistente pausado");
    expect(screen.queryByRole("button", { name: "Reactivar" })).toBeNull();
  });

  it("pausado con permiso: reactivar llama al BFF, avisa y refresca", async () => {
    const fetchMock = vi.fn(() => respuesta(200, { pausado: false }));
    vi.stubGlobal("fetch", fetchMock);
    render(
      <FeedbackProviders>
        <EstadoAsistente pausado puedeReactivar />
      </FeedbackProviders>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Reactivar" }));

    expect(await screen.findByText("El asistente volvió a responder.")).toBeTruthy();
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/settings/asistente");
    expect(JSON.parse(String(init.body))).toEqual({ pausado: false });
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });
});

describe("Selector de negocio", () => {
  const negocios = {
    items: [
      { id: "t1", name: "Tienda Norte", role: "owner", active: true },
      { id: "t2", name: "Tienda Sur", role: "collaborator", active: false },
    ],
  };

  it("se recorre con flechas y Escape devuelve el foco al botón", async () => {
    vi.stubGlobal("fetch", vi.fn(() => respuesta(200, negocios)));
    render(<TenantSwitcher current={negocios.items[0]} count={2} />);
    const disparador = screen.getByRole("button", { name: /Tienda Norte/ });

    fireEvent.click(disparador);
    const lista = await screen.findByRole("listbox", { name: "Negocios" });
    await within(lista).findByRole("option", { name: /Tienda Sur/ });

    const buscador = screen.getByRole("textbox", { name: "Buscar negocio" });
    fireEvent.keyDown(buscador, { key: "ArrowDown" });
    expect(document.activeElement?.textContent).toContain("Tienda Norte");
    fireEvent.keyDown(document.activeElement as Element, { key: "ArrowDown" });
    expect(document.activeElement?.textContent).toContain("Tienda Sur");
    fireEvent.keyDown(document.activeElement as Element, { key: "ArrowUp" });
    fireEvent.keyDown(document.activeElement as Element, { key: "ArrowUp" });
    expect(document.activeElement).toBe(buscador);

    fireEvent.keyDown(buscador, { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(document.activeElement).toBe(disparador);
  });
});

describe("Orden de las tablas", () => {
  type Fila = { id: string; nombre: string; total: number };
  const columnas: Column<Fila>[] = [
    { key: "nombre", header: "Nombre", cell: (f) => f.nombre },
    { key: "total", header: "Total", cell: (f) => String(f.total), align: "right" },
  ];
  const filas: Fila[] = Array.from({ length: 9 }, (_, i) => ({ id: String(i), nombre: `Cliente ${i}`, total: (i * 7) % 10 }));

  it("los encabezados se ordenan con teclado y anuncian el orden", async () => {
    render(<DataTable columns={columnas} rows={filas} getRowKey={(f) => f.id} />);
    const total = await screen.findByRole("columnheader", { name: "Total" });
    await waitFor(() => expect(total.getAttribute("aria-sort")).toBe("none"));
    expect(total.tabIndex).toBe(0);

    act(() => {
      fireEvent.keyDown(total, { key: "Enter" });
    });
    await waitFor(() => expect(total.getAttribute("aria-sort")).toBe("ascending"));
    act(() => {
      fireEvent.keyDown(total, { key: " " });
    });
    await waitFor(() => expect(total.getAttribute("aria-sort")).toBe("descending"));
    expect(screen.getByRole("columnheader", { name: "Nombre" }).getAttribute("aria-sort")).toBe("none");
  });
});

describe("Error y 404", () => {
  it("el error de página explica y reintenta", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const retry = vi.fn();
    const { container } = render(<ErrorDePagina error={Object.assign(new Error("caída"), { digest: "abc123" })} retry={retry} />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("No se pudo cargar esta página");
    expect(screen.getByRole("alert").textContent).toContain("abc123");
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: "Ir al Resumen" }).getAttribute("href")).toBe("/dashboard");
    expect(await violacionesGraves(container)).toEqual([]);
  });

  it("la 404 está en español y lleva al inicio", async () => {
    const { container } = render(<NoEncontrada />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Esta página no existe");
    expect(screen.getByRole("link", { name: "Ir al Resumen" }).getAttribute("href")).toBe("/dashboard");
    expect(await violacionesGraves(container)).toEqual([]);
  });
});
