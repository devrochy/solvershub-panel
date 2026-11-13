// @vitest-environment jsdom
// HU-CFG-09: Cerebro, Memoria, Chat web y Multimedia leen sus ayudas del catálogo, y el aviso del runtime v3.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { SettingsTabs } from "@/app/(app)/configuracion/_components/settings-tabs";
import { FeedbackProviders } from "@/components/ui/providers";
import type { CatalogoConfig } from "@/lib/api/types";
import { ajustes, ajustesAvanzados, ajustesMultimedia, chatWeb } from "@/lib/testing/fixtures";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => "/configuracion",
  useSearchParams: () => new URLSearchParams(),
}));

type Opcion = CatalogoConfig["opciones"][number];
const opcion = (clave: string, grupo: Opcion["grupo"], tipo: Opcion["tipo"], explicacion: string, extra: Partial<Opcion> = {}): Opcion => ({
  clave,
  grupo,
  tipo,
  etiqueta: clave,
  explicacion,
  ejemplo: "",
  unidad: "",
  editable_por: "dueno",
  solo_lectura: false,
  almacen: "spec:x",
  ambito: "negocio",
  ...extra,
});

const catalogo = (runtime: "legacy" | "v3", opciones: Opcion[] = []): CatalogoConfig => ({
  aos_runtime: runtime,
  version: "test",
  opciones: [opcion("assistant_name", "identidad", "texto", "Nombre del asistente."), ...opciones],
  asistente: [],
});

function montar(cat: CatalogoConfig | null) {
  return render(
    <FeedbackProviders>
      <SettingsTabs
        settings={ajustes}
        webChat={chatWeb}
        advanced={ajustesAvanzados as Parameters<typeof SettingsTabs>[0]["advanced"]}
        media={ajustesMultimedia as Parameters<typeof SettingsTabs>[0]["media"]}
        catalogo={cat}
        bajas={null}
        waweb={null}
        datosCliente={{ politica: null, error: "sin datos", puedeEditar: true, aviso: null }}
      />
    </FeedbackProviders>,
  );
}

/** Abre un ajuste del resumen en su cajón (rediseño B); si hay otro abierto, lo cierra antes. */
const irA = async (nombre: string, titulo: string) => {
  const abierto = screen.queryByRole("dialog");
  if (abierto) {
    fireEvent.click(within(abierto).getByRole("button", { name: "Cerrar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  }
  fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${nombre}`) }));
  await waitFor(() => expect(within(screen.getByRole("dialog")).getByRole("heading", { level: 2 }).textContent).toBe(titulo));
};
const verAvanzado = () => fireEvent.click(screen.getByRole("button", { name: /^Avanzado: los números exactos/ }));

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
});
beforeEach(() => window.history.replaceState(null, "", "/configuracion"));
afterEach(cleanup);

describe("ayudas del catálogo (HU-CFG-09)", () => {
  it("Cerebro y Memoria muestran la ayuda del catálogo, con su rango", async () => {
    montar(
      catalogo("legacy", [
        opcion("model_temperature", "cerebro", "decimal", "Ayuda del catálogo para la temperatura.", { minimo: 0, maximo: 2 }),
        opcion("rag_top_k", "memoria", "entero", "Ayuda del catálogo para los fragmentos.", { minimo: 0, maximo: 20 }),
      ]),
    );
    await irA("Cerebro y modelos", "Cerebro y modelos");
    expect(screen.getByText(/Ayuda del catálogo para la temperatura\. Entre 0 y 2\./)).toBeTruthy();
    await irA("Memoria", "Memoria");
    verAvanzado();
    expect(screen.getByText(/Ayuda del catálogo para los fragmentos\. Entre 0 y 20\./)).toBeTruthy();
  });

  it("sin la opción en el catálogo (un backend anterior) queda el texto de respaldo", async () => {
    montar(catalogo("legacy"));
    await irA("Cerebro y modelos", "Cerebro y modelos");
    expect(screen.getByText(/cerca de 0 el asistente es más predecible/)).toBeTruthy();
    await irA("Memoria", "Memoria");
    verAvanzado();
    expect(screen.getByText(/Cuántos mensajes recientes ve el agente/)).toBeTruthy();
  });

  it("sin catálogo tampoco se rompe", async () => {
    montar(null);
    await irA("Memoria", "Memoria");
    verAvanzado();
    expect(screen.getByText(/Cuántos mensajes recientes ve el agente/)).toBeTruthy();
  });
});

describe("aviso de la voz del agente en Identidad", () => {
  const AVISO = /Tu negocio usa el Agent OS/;

  it("avisa que nombre, descripción y voz se aplican al publicar una versión", async () => {
    montar(catalogo("v3"));
    await irA("Identidad", "Identidad");
    expect(screen.getAllByText(AVISO).length).toBeGreaterThan(0);
  });
});
