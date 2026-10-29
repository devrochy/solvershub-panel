// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { ImportarDatosDelAgente } from "@/app/(app)/agentes/_components/importar-datos";
import { FeedbackProviders } from "@/components/ui/providers";
import type { EstadoImportacion, VistaPreviaImportacion } from "@/lib/api/types";
import { violacionesGraves } from "@/lib/testing/axe";

// Importar datos existentes por agente (HU-QA-12).

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh, prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => "/agentes/a1",
  useSearchParams: () => new URLSearchParams(),
}));

const AGENTE = "6f1c2a3b-1d4e-4f5a-9b6c-7d8e9f0a1b2c";

function estado(extra: Partial<EstadoImportacion> = {}): EstadoImportacion {
  return {
    disponible: true,
    motivo: null,
    plantilla: {
      id: "productos",
      titulo: "Productos",
      ayuda: "Un producto por fila.",
      columna_clave: "sku",
      columnas: [
        { nombre: "sku", descripcion: "Código del producto.", obligatoria: true },
        { nombre: "nombre", descripcion: "Nombre del producto.", obligatoria: true },
        { nombre: "stock", descripcion: "Unidades disponibles.", obligatoria: false },
      ],
      tope_filas: 500,
      tope_bytes: 1_000_000,
    },
    importado: null,
    ...extra,
  } as EstadoImportacion;
}

function vista(extra: Partial<VistaPreviaImportacion> = {}): VistaPreviaImportacion {
  return {
    total_filas: 3,
    nuevas: 2,
    existentes: 0,
    con_errores: 0,
    errores: [],
    errores_total: 0,
    columnas_ignoradas: [],
    columnas_faltantes: [],
    ...extra,
  };
}

type Llamada = { url: string; method: string; solo?: string | null };
let llamadas: Llamada[] = [];
let respuestaVista: VistaPreviaImportacion;

beforeAll(() => {
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
  window.HTMLElement.prototype.scrollIntoView ??= () => undefined;
});

beforeEach(() => {
  llamadas = [];
  respuestaVista = vista();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const cuerpo = init?.body instanceof FormData ? init.body : null;
      llamadas.push({ url, method: init?.method ?? "GET", solo: cuerpo ? (cuerpo.get("solo_validas") as string | null) : null });
      if (url.endsWith("/importar-datos/validar")) return Response.json(respuestaVista);
      if (url.endsWith("/importar-datos") && init?.method === "POST") {
        return Response.json(
          { lote_id: AGENTE, plantilla: "productos", creado_en: "2026-10-28T12:00:00Z", creadas: 2, existentes: 1, con_errores: 1, conteos: { producto: 2, categoria: 1 } },
          { status: 201 },
        );
      }
      if (url.endsWith("/importar-datos") && init?.method === "DELETE") return Response.json({ retirados: 4 });
      return Response.json({ error: "no esperado" }, { status: 500 });
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function montar(e: EstadoImportacion = estado()) {
  return render(
    <FeedbackProviders>
      <ImportarDatosDelAgente agenteId={AGENTE} nombre="Ventas" estado={e} />
    </FeedbackProviders>,
  );
}

async function subir(nombre = "datos.csv") {
  fireEvent.click(screen.getByRole("button", { name: /Importar datos/ }));
  const dialogo = await screen.findByRole("dialog");
  const archivo = new File(["sku,nombre\nA,Cera\n"], nombre, { type: "text/csv" });
  fireEvent.change(within(dialogo).getByLabelText(/Sube tu archivo CSV/), { target: { files: [archivo] } });
  return dialogo;
}

describe("Importar datos existentes (HU-QA-12)", () => {
  it("no aparece si el agente no importa datos", () => {
    const { container } = montar(estado({ disponible: false, motivo: "El General no usa datos.", plantilla: null }));
    expect(container.textContent).toBe("");
  });

  it("muestra la plantilla con sus columnas y el enlace de descarga", async () => {
    const { baseElement } = montar();
    fireEvent.click(screen.getByRole("button", { name: /Importar datos/ }));
    const dialogo = await screen.findByRole("dialog");
    expect(within(dialogo).getByText("Importar productos de Ventas")).toBeTruthy();
    expect(within(dialogo).getByText(/Un producto por fila\./)).toBeTruthy();
    expect(within(dialogo).getAllByText(/\(obligatoria\)/, { selector: "li" })).toHaveLength(2);
    const enlace = within(dialogo).getByRole("link", { name: /Descargar plantilla/ });
    expect(enlace.getAttribute("href")).toBe(`/api/agentes/${AGENTE}/importar-datos/plantilla`);
    expect(await violacionesGraves(baseElement)).toEqual([]);
  });

  it("sin errores, revisa el archivo y confirma sin escribir antes", async () => {
    montar();
    const dialogo = await subir();
    await waitFor(() => expect(within(dialogo).getByText(/3 filas: 2 nuevas, 0 ya existían y 0 con errores\./)).toBeTruthy());
    expect(llamadas.map((l) => l.url)).toEqual([`/api/agentes/${AGENTE}/importar-datos/validar`]);

    fireEvent.click(within(dialogo).getByRole("button", { name: "Importar 2 filas" }));
    await waitFor(() => expect(llamadas.length).toBe(2));
    expect(llamadas[1]).toMatchObject({ url: `/api/agentes/${AGENTE}/importar-datos`, method: "POST", solo: null });
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("con errores muestra cada uno junto a su fila y deja importar solo las válidas", async () => {
    respuestaVista = vista({
      total_filas: 4,
      nuevas: 2,
      existentes: 1,
      con_errores: 1,
      errores: [{ fila: 3, columna: "precio", mensaje: "Debe ser un número." }],
      errores_total: 1,
      columnas_ignoradas: ["telefono"],
    });
    montar();
    const dialogo = await subir();
    const fila = await within(dialogo).findByRole("row", { name: /Debe ser un número\./ });
    expect(within(fila).getByText("3")).toBeTruthy();
    expect(within(fila).getByText("precio")).toBeTruthy();
    expect(within(dialogo).getByText(/No se importan teléfonos ni correos \(telefono\)/)).toBeTruthy();
    expect(within(dialogo).queryByRole("button", { name: /^Importar 2 filas$/ })).toBeNull();

    fireEvent.click(within(dialogo).getByRole("button", { name: "Importar solo las 2 válidas" }));
    await waitFor(() => expect(llamadas.length).toBe(2));
    expect(llamadas[1]?.solo).toBe("true");
  });

  it("si faltan columnas obligatorias no deja importar", async () => {
    respuestaVista = vista({ total_filas: 1, nuevas: 0, columnas_faltantes: ["precio"] });
    montar();
    const dialogo = await subir();
    expect(await within(dialogo).findByText(/le faltan columnas obligatorias: precio/)).toBeTruthy();
    expect(within(dialogo).queryByRole("button", { name: /Importar/ })).toBeNull();
  });

  it("«Borrar lo importado» pide confirmar y solo borra lo importado", async () => {
    montar(estado({ importado: { lotes: 1, creado_en: "2026-10-28T12:00:00Z", conteos: { producto: 2 } } }));
    fireEvent.click(screen.getByRole("button", { name: /Borrar lo importado/ }));
    const confirmacion = await screen.findByRole("alertdialog");
    expect(within(confirmacion).getByText(/Los datos de prueba generados y lo que creaste a mano no cambian/)).toBeTruthy();
    fireEvent.click(within(confirmacion).getByRole("button", { name: "Borrar lo importado" }));
    await waitFor(() => expect(llamadas).toEqual([{ url: `/api/agentes/${AGENTE}/importar-datos`, method: "DELETE", solo: null }]));
  });
});
