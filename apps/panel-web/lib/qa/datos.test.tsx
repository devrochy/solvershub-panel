// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { FeedbackProviders } from "@/components/ui/providers";
import type { QaCatalogo, QaDatos, QaItem, QaMisDatos } from "@/lib/api/types";
import { violacionesGraves } from "@/lib/testing/axe";

import { DatosDePrueba } from "@/app/(app)/pruebas/_components/datos-de-prueba";
import { EjecucionDePruebas } from "@/app/(app)/pruebas/_components/ejecucion";

// Datos de prueba (HU-QA-07) y lista por entorno y sección (HU-QA-08).

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh, prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => "/pruebas/datos",
  useSearchParams: () => new URLSearchParams(),
}));

const CONTENIDO = [
  { habilidad: "Comercio", detalle: ["Café de origen 500 g · QA-CAFE-500"] },
  { habilidad: "Cobranza", detalle: ["Juana Pérez · en mora (9 cuotas atrasadas)"] },
];

const CUENTAS = [
  { rol: "dueno", titulo: "Dueño del negocio", uso: "Panel y APK.", email: "dueno.abc@pruebas.solvershub.test", creada: true },
  { rol: "gestor", titulo: "Gestor de cobranza", uso: "App de campo.", email: "gestor.abc@pruebas.solvershub.test", creada: true },
  { rol: "colaborador", titulo: "Colaborador", uso: "Panel limitado.", email: "colaborador.abc@pruebas.solvershub.test", creada: true },
] as QaDatos["cuentas"];

function datos(extra: Partial<QaDatos> = {}): QaDatos {
  return {
    estado: "listo",
    negocio: { id: "6f1c2a3b-1d4e-4f5a-9b6c-7d8e9f0a1b2c", slug: "qa-abc", nombre: "QA · ana" },
    cuentas: CUENTAS,
    contenido: CONTENIDO,
    ...extra,
  } as QaDatos;
}

const GUIA = [
  {
    slug: "datos-wompi-sandbox",
    seccion: "datos",
    orden: 0,
    grupo: "Pagos",
    titulo: "Tarjeta de prueba de Wompi (sandbox)",
    resumen: "Tarjeta 4242.",
    porque: "Test cobra en sandbox.",
    como: "Usa 4242 4242 4242 4242.",
    estado: "guia",
  },
] as QaItem[];

type Llamada = { url: string; method: string };
let llamadas: Llamada[] = [];

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
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      llamadas.push({ url, method: init?.method ?? "GET" });
      if (url.endsWith("/api/qa/datos")) {
        return Response.json(datos({ contrasenas: { dueno: "clave-dueno", gestor: "clave-gestor", colaborador: "clave-colab" } }), {
          status: 201,
        });
      }
      if (url.endsWith("/api/qa/datos/contrasenas")) {
        return Response.json(datos({ contrasenas: { dueno: "otra-dueno", gestor: "otra-gestor", colaborador: "otra-colab" } }));
      }
      return Response.json({ error: "no esperado" }, { status: 500 });
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function montar(inicial: QaMisDatos) {
  return render(
    <FeedbackProviders>
      <DatosDePrueba inicial={inicial} guia={GUIA} />
    </FeedbackProviders>,
  );
}

describe("Datos de prueba", () => {
  it("sin datos, prepara y muestra las contraseñas una sola vez", async () => {
    const { container } = montar({ disponible: true, datos: null, contenido: CONTENIDO });
    expect(screen.getByText(/Juana Pérez · en mora/)).toBeTruthy();
    expect(await violacionesGraves(container)).toEqual([]);

    fireEvent.click(screen.getByRole("button", { name: /Preparar mis datos/ }));
    await waitFor(() => expect(screen.getByText("clave-dueno")).toBeTruthy());
    expect(llamadas).toEqual([{ url: "/api/qa/datos", method: "POST" }]);
    expect(screen.getByText(/no se vuelven a mostrar/)).toBeTruthy();
    const fila = screen.getByRole("region", { name: "Gestor de cobranza" });
    expect(within(fila).getByText("gestor.abc@pruebas.solvershub.test")).toBeTruthy();
    expect(within(fila).getByRole("button", { name: /Copiar la contraseña de Gestor de cobranza/ })).toBeTruthy();
    expect(await violacionesGraves(container)).toEqual([]);
  });

  it("con datos listos no muestra contraseñas y las nuevas piden confirmación", async () => {
    montar({ disponible: true, datos: datos(), contenido: CONTENIDO });
    expect(screen.queryByText("Contraseña")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Contraseñas nuevas/ }));
    const dialogo = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialogo).getByRole("button", { name: /Generar contraseñas nuevas/ }));
    await waitFor(() => expect(screen.getByText("otra-dueno")).toBeTruthy());
    expect(llamadas.at(-1)).toEqual({ url: "/api/qa/datos/contrasenas", method: "POST" });
  });

  it("fuera de test avisa, no deja preparar y la guía queda con su ancla", () => {
    montar({ disponible: false, datos: null, contenido: CONTENIDO });
    expect(screen.getByText(/solo existen en el entorno de test/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Preparar mis datos/ })).toBeNull();
    const ficha = screen.getByRole("heading", { name: /Tarjeta de prueba de Wompi/ }).closest("article");
    expect(ficha?.id).toBe("datos-wompi-sandbox");
    expect(within(ficha as HTMLElement).getByText("Usa 4242 4242 4242 4242.")).toBeTruthy();
  });
});

describe("Lista por entorno y sección", () => {
  const items = [
    { entorno: "apk", area: "Campo (gestor)", titulo: "Registrar un pago", slug: "pago" },
    { entorno: "panel", area: "Colaboradores", titulo: "Crear un colaborador", slug: "colab", requiere: ["datos-wompi-sandbox"] },
  ].map(
    (x, orden) =>
      ({
        seccion: "pruebas",
        orden,
        grupo: "G",
        estado: "sin_correr",
        ejecuciones: {},
        pasos: [{ accion: "Abrir", esperado: "Abre" }],
        ...x,
      }) as QaItem,
  );
  const catalogo: QaCatalogo = {
    ciclo: { id: "c1", nombre: "Ciclo", abierto_en: null },
    catalogo: { version: 6, fecha: "2026-10-13", commit_docs: null },
    progreso: { total: 2, terminadas: 0, sin_correr: 2, en_curso: 0, omitida: 0, ok: 0, bloqueada: 0, falla: 0 },
    items,
  };

  it("agrupa Panel antes que APK, con sus secciones, y enlaza los datos que requiere", () => {
    render(
      <FeedbackProviders>
        <EjecucionDePruebas catalogo={catalogo} inicial={null} guia={{ "datos-wompi-sandbox": "Tarjeta de Wompi" }} />
      </FeedbackProviders>,
    );
    const nav = screen.getAllByRole("navigation", { name: "Pruebas del catálogo" })[0];
    const entornos = within(nav).getAllByRole("region").map((r) => r.getAttribute("aria-label"));
    expect(entornos).toEqual(["Entorno Panel", "Entorno APK"]);
    expect(within(nav).getByRole("button", { name: /Campo \(gestor\)/ })).toBeTruthy();
    // La primera pendiente en el orden de la lista es la del panel, y enlaza su guía.
    const enlace = screen.getByRole("link", { name: "Tarjeta de Wompi" });
    expect(enlace.getAttribute("href")).toBe("/pruebas/datos#datos-wompi-sandbox");
  });
});
