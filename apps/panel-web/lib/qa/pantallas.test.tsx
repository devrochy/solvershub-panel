// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { FeedbackProviders } from "@/components/ui/providers";
import type { QaCatalogo, QaCiclo, QaEjecucion, QaItem, QaTestersOut } from "@/lib/api/types";
import { violacionesGraves } from "@/lib/testing/axe";

import { Checklist } from "@/app/(app)/pruebas/_components/checklist";
import { ListaDeCiclos } from "@/app/(app)/pruebas/_components/ciclos";
import { DetalleDeInforme } from "@/app/(app)/pruebas/_components/detalle-de-informe";
import { EjecucionDePruebas } from "@/app/(app)/pruebas/_components/ejecucion";
import { GestionDeTesters } from "@/app/(app)/pruebas/_components/testers";

// Pantallas del centro de pruebas (SPEC-30, HU-QA-03/04): recorrido paso a paso con guardado
// optimista, atajos, capturas, informe y axe sin violaciones graves.

const push = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh, prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => "/pruebas",
  useSearchParams: () => new URLSearchParams(),
}));

const PROGRESO_VACIO = { total: 2, terminadas: 0, sin_correr: 2, en_curso: 0, omitida: 0, ok: 0, bloqueada: 0, falla: 0 };

function prueba(slug: string, extra: Partial<QaItem> = {}): QaItem {
  return {
    slug,
    seccion: "pruebas",
    orden: 0,
    modulo: "Panel",
    grupo: "Navegación",
    titulo: `Prueba ${slug}`,
    estado: "sin_correr",
    ejecuciones: {},
    plataforma: ["panel"],
    precondiciones: ["Sesión iniciada"],
    datos: ["Cuenta de prueba del negocio Moto"],
    pasos: [
      { accion: "Pulsar Ctrl+K", esperado: "Se abre la paleta" },
      { accion: "Escribir «prom»", esperado: "Aparece Promesas" },
    ],
    hu: ["HU-DS-05"],
    origen: [],
    vars: [],
    ...extra,
  } as QaItem;
}

const CATALOGO: QaCatalogo = {
  ciclo: { id: "c1", nombre: "Ciclo 2026-10 · SPEC-29", abierto_en: "2026-10-11T00:00:00Z" },
  catalogo: { version: 2, fecha: "2026-10-13", commit_docs: null },
  progreso: PROGRESO_VACIO,
  items: [prueba("uno", { prioridad: "P0", titulo: "Ir con Ctrl+K" }), prueba("dos", { titulo: "Atajos g + letra" })],
};

function ejecucion(extra: Partial<QaEjecucion> = {}): QaEjecucion {
  return {
    id: "8f2b9a3c-1d4e-4f5a-9b6c-7d8e9f0a1b2c",
    cycle_id: "c1",
    ciclo_nombre: "Ciclo 2026-10 · SPEC-29",
    tester: { id: "t1", nombre: "ana", email: "ana@x.test" },
    estado: "en_curso",
    editable: true,
    progreso: PROGRESO_VACIO,
    resultados: {},
    ...extra,
  } as QaEjecucion;
}

type Llamada = { url: string; method: string; body: unknown };
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
  push.mockReset();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const body = typeof init?.body === "string" ? JSON.parse(init.body) : init?.body;
      llamadas.push({ url, method: init?.method ?? "GET", body });
      if (url.includes("/steps/")) {
        const n = url.split("/steps/")[1];
        const estado = (body as { estado: string | null }).estado;
        return Response.json(
          ejecucion({
            progreso: { ...PROGRESO_VACIO, en_curso: 1, sin_correr: 1 },
            resultados: { uno: { estado: "en_curso", nota: null, pasos: { [n]: { estado, nota: null } }, adjuntos: [] } },
          }),
        );
      }
      if (url.endsWith("/runs/me/attachments")) {
        return Response.json({ id: "a1", paso: 1, nombre: "pantalla.png", mimetype: "image/png", tamano: 5 }, { status: 201 });
      }
      if (url.endsWith("/runs/me/submit")) return Response.json(ejecucion({ estado: "enviada", editable: false }));
      if (url.endsWith("/runs/me/start")) return Response.json(ejecucion());
      if (url.includes("/history")) return Response.json([]);
      return Response.json({ error: "no esperado" }, { status: 500 });
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function montar(run: QaEjecucion | null) {
  return render(
    <FeedbackProviders>
      <EjecucionDePruebas guia={{}} catalogo={CATALOGO} inicial={run} />
    </FeedbackProviders>,
  );
}

describe("Ejecutar pruebas", () => {
  it("sin ejecución, muestra la prueba en lectura y deja empezar", async () => {
    const { container } = montar(null);
    expect(screen.getByRole("heading", { name: "Ir con Ctrl+K" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Aprobar/ }).hasAttribute("disabled")).toBe(true);
    expect(await violacionesGraves(container)).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: /Empezar a probar/ }));
    await waitFor(() => expect(screen.getByRole("button", { name: /^Aprobar/ }).hasAttribute("disabled")).toBe(false));
    expect(llamadas.at(-1)?.url).toBe("/api/qa/runs/me/start");
  });

  it("aprobar guarda el paso, pasa al siguiente y el atajo F marca falla", async () => {
    const { container } = montar(ejecucion());
    const lista = screen.getAllByRole("navigation", { name: "Pruebas del catálogo" })[0];
    expect(within(lista).getByRole("button", { name: /Ir con Ctrl\+K/ }).getAttribute("aria-current")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: /^Aprobar/ }));
    await waitFor(() => expect(llamadas.some((l) => l.url.endsWith("/runs/me/items/uno/steps/1"))).toBe(true));
    expect(llamadas.find((l) => l.url.endsWith("/steps/1"))?.body).toEqual({ estado: "ok" });
    // Pasó al paso 2: su resultado esperado está a la vista.
    await waitFor(() => expect(screen.getByText("Aparece Promesas")).toBeTruthy());

    await act(async () => {
      fireEvent.keyDown(window, { key: "f" });
    });
    await waitFor(() => expect(llamadas.some((l) => l.url.endsWith("/steps/2"))).toBe(true));
    expect(llamadas.find((l) => l.url.endsWith("/steps/2"))?.body).toEqual({ estado: "falla" });
    // Una falla deja el foco en la nota: lo que se escriba no cae en los atajos.
    await waitFor(() => expect(document.activeElement?.id).toMatch(/^nota-uno-/));
    expect(await violacionesGraves(container)).toEqual([]);
  });

  it("los atajos no se disparan mientras se escribe ni después de g", async () => {
    montar(ejecucion());
    const nota = screen.getByLabelText("Nota del paso");
    fireEvent.keyDown(nota, { key: "a" });
    fireEvent.keyDown(window, { key: "g" });
    fireEvent.keyDown(window, { key: "a" });
    await new Promise((r) => setTimeout(r, 20));
    expect(llamadas.filter((l) => l.url.includes("/steps/"))).toHaveLength(0);
  });

  it("una captura soltada en el paso se sube como multipart", async () => {
    montar(ejecucion());
    const zona = screen.getByRole("group", { name: /captura/i });
    const png = new File(["\x89PNG"], "pantalla.png", { type: "image/png" });
    fireEvent.drop(zona, { dataTransfer: { files: [png] } });
    await waitFor(() => expect(screen.getByAltText("Captura pantalla.png")).toBeTruthy());
    const subida = llamadas.find((l) => l.url.endsWith("/runs/me/attachments"));
    expect(subida?.body).toBeInstanceOf(FormData);
    expect((subida?.body as FormData).get("item_slug")).toBe("uno");
  });

  it("enviar el informe pide confirmación y lleva al informe", async () => {
    montar(ejecucion());
    fireEvent.click(screen.getByRole("button", { name: /Enviar informe/ }));
    const hoja = await screen.findByRole("dialog", { name: "Enviar informe" });
    fireEvent.click(within(hoja).getByRole("button", { name: /Enviar informe/ }));
    const confirmar = await screen.findByRole("alertdialog");
    fireEvent.click(within(confirmar).getByRole("button", { name: "Enviar informe" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/pruebas/informes/8f2b9a3c-1d4e-4f5a-9b6c-7d8e9f0a1b2c"));
    expect(llamadas.find((l) => l.url.endsWith("/runs/me/submit"))?.body).toEqual({ comentario: null });
  });

  it("filtra la lista por texto", () => {
    montar(ejecucion());
    const buscador = screen.getAllByRole("searchbox", { name: "Buscar pruebas" })[0];
    fireEvent.change(buscador, { target: { value: "letra" } });
    const lista = screen.getAllByRole("navigation", { name: "Pruebas del catálogo" })[0];
    const pruebas = within(lista)
      .getAllByRole("button")
      .filter((b) => b.id.startsWith("prueba-"));
    expect(pruebas.map((b) => b.id)).toEqual(["prueba-dos"]);
  });
});

describe("Informe, ciclos, checklist y testers", () => {
  it("el informe enviado se lee con sus pasos, capturas y descarga", async () => {
    const run = ejecucion({
      estado: "enviada",
      editable: false,
      enviada_en: "2026-10-13T11:00:00Z",
      informe: {
        ciclo: { id: "c1", nombre: "Ciclo 1" },
        catalogo: { version: 2, fecha: "2026-10-13" },
        tester: { id: "t1", nombre: "ana", email: "ana@x.test" },
        iniciada_en: "2026-10-13T10:00:00Z",
        enviada_en: "2026-10-13T11:00:00Z",
        comentario: "Revisar el foco",
        progreso: { ...PROGRESO_VACIO, terminadas: 1, falla: 1, sin_correr: 1 },
        pruebas: [
          {
            slug: "uno",
            titulo: "Ir con Ctrl+K",
            grupo: "Navegación",
            hu: ["HU-DS-05"],
            estado: "falla",
            pasos: [{ n: 1, accion: "Pulsar Ctrl+K", estado: "falla", nota: "No abre", adjuntos: [{ id: "a1", nombre: "p.png", mimetype: "image/png" }] }],
          },
        ],
        sin_correr: [{ slug: "dos", titulo: "Atajos g + letra", grupo: "Navegación" }],
      },
    });
    const { container } = render(<DetalleDeInforme run={run} />);
    expect(screen.getByText("Nota: No abre")).toBeTruthy();
    expect(screen.getByAltText("Captura p.png")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Descargar Markdown/ }).getAttribute("href")).toBe(
      `/api/qa/runs/${run.id}/report.md`,
    );
    expect(await violacionesGraves(container)).toEqual([]);
  });

  it("ciclos: cerrar pide el nombre del ciclo nuevo", async () => {
    const ciclo: QaCiclo = {
      id: "c1",
      nombre: "Ciclo 1",
      abierto: true,
      abierto_en: "2026-10-11T00:00:00Z",
      catalogo: { version: 2, fecha: "2026-10-13" },
      progreso: PROGRESO_VACIO,
      por_prueba: { uno: "falla" },
      ejecuciones: [],
    } as QaCiclo;
    const { container } = render(
      <FeedbackProviders>
        <ListaDeCiclos ciclos={[ciclo]} titulos={{ uno: "Ir con Ctrl+K" }} puedeCerrar />
      </FeedbackProviders>,
    );
    expect(screen.getByText("Ir con Ctrl+K")).toBeTruthy();
    expect(await violacionesGraves(container)).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: /Cerrar ciclo y abrir otro/ }));
    expect(await screen.findByLabelText(/Nombre del ciclo nuevo/)).toBeTruthy();
  });

  it("el checklist sin permiso de edición solo muestra el estado", async () => {
    const item = {
      ...prueba("prod-x"),
      seccion: "prod",
      titulo: "Rol tester apagado",
      grupo: "Seguridad",
      porque: "Un tester vería datos reales.",
      como: "Confirmar que la variable no está.",
      vars: ["QA_TESTERS_ENABLED"],
      estado: "pendiente",
    } as QaItem;
    const { container } = render(<Checklist items={[item]} editable={false} />);
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.getByText("QA_TESTERS_ENABLED")).toBeTruthy();
    expect(await violacionesGraves(container)).toEqual([]);
  });

  it("testers: sin el rol habilitado avisa y no deja invitar", async () => {
    const datos: QaTestersOut = {
      habilitado: false,
      testers: [{ id: "t1", email: "ana@x.test", estado: "activo", invitado_en: "2026-10-13T10:00:00Z" }],
    } as QaTestersOut;
    const { container } = render(
      <FeedbackProviders>
        <GestionDeTesters inicial={datos} />
      </FeedbackProviders>,
    );
    expect(screen.getByText(/no está habilitado/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Enviar invitación/ }).hasAttribute("disabled")).toBe(true);
    expect(await violacionesGraves(container)).toEqual([]);
  });
});
