// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { SettingsTabs } from "@/app/(app)/configuracion/_components/settings-tabs";
import { FeedbackProviders } from "@/components/ui/providers";
import type { CatalogoConfig } from "@/lib/api/types";
import { CATALOGO_CON_ASISTENTE, PROPUESTA_DE_ATENCION } from "@/lib/testing/asistente-config";
import { ajustes, ajustesAvanzados, ajustesMultimedia, chatWeb } from "@/lib/testing/fixtures";

// El asistente dentro de Configuración (HU-CFG-11): dónde aparece, y que el formulario manual de debajo
// refleje el resultado y siga guardando como siempre.

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => "/configuracion",
  useSearchParams: () => new URLSearchParams(),
}));

function montar(props: Partial<Parameters<typeof SettingsTabs>[0]> = {}) {
  return render(
    <FeedbackProviders>
      <SettingsTabs
        settings={ajustes}
        webChat={chatWeb}
        advanced={ajustesAvanzados as Parameters<typeof SettingsTabs>[0]["advanced"]}
        media={ajustesMultimedia as Parameters<typeof SettingsTabs>[0]["media"]}
        catalogo={CATALOGO_CON_ASISTENTE}
        bajas={null}
        waweb={null}
        datosCliente={{ politica: null, error: "sin datos", puedeEditar: true, aviso: null }}
        {...props}
      />
    </FeedbackProviders>,
  );
}

const respuesta = (estado: number, cuerpo: unknown) => new Response(JSON.stringify(cuerpo), { status: estado });
const boton = () => screen.queryByRole("button", { name: "Ajustar con preguntas" });
// Por id (la clave del registro): el título del grupo «Horario de atención» comparte nombre con su campo.
const campo = (clave: string) => document.getElementById(clave) as HTMLInputElement;

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
  window.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  window.localStorage.clear();
  window.history.replaceState(null, "", "/configuracion");
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("«Ajustar con preguntas» en Configuración", () => {
  it("aparece en Voz y estilo y en Horario y escalamiento, y en ninguna otra sección", () => {
    montar({ defaultSeccion: "horario" });
    expect(boton()).toBeTruthy();
    expect(screen.getByText("Cuándo y cómo atiende")).toBeTruthy();
    cleanup();
    montar({ defaultSeccion: "voz" });
    expect(boton()).toBeTruthy();
    expect(screen.getByText("Cómo habla tu asistente")).toBeTruthy();
    for (const seccion of ["identidad", "calidad", "memoria", "cerebro"]) {
      cleanup();
      montar({ defaultSeccion: seccion });
      expect(boton(), seccion).toBeNull();
    }
  });

  it("sin permiso de edición, sin guion en el catálogo o con un catálogo viejo no hay botón ni error", () => {
    montar({ defaultSeccion: "horario", puedeEditar: false });
    expect(boton()).toBeNull();
    cleanup();
    montar({ defaultSeccion: "horario", catalogo: { ...CATALOGO_CON_ASISTENTE, asistente: [] } });
    expect(boton()).toBeNull();
    expect(campo("business_hours_mode")).toBeTruthy(); // el formulario sigue ahí
    cleanup();
    // Un backend anterior no manda el campo `asistente`.
    const { asistente: _omitido, ...viejo } = CATALOGO_CON_ASISTENTE; // eslint-disable-line @typescript-eslint/no-unused-vars
    montar({ defaultSeccion: "horario", catalogo: viejo as CatalogoConfig });
    expect(boton()).toBeNull();
    expect(campo("business_hours_mode")).toBeTruthy();
  });

  it("tras aplicar, el formulario manual de abajo ya muestra el resultado y guarda como siempre", async () => {
    // El horario del guion llega como franjas; el modo fuera de horario cambia de «bloquea» a «informativo».
    const aplicada = {
      ...PROPUESTA_DE_ATENCION,
      cambios: [
        PROPUESTA_DE_ATENCION.cambios![0],
        { clave: "business_hours_mode", etiqueta: "Fuera de horario", actual: "bloquea", propuesto: "informativo", editado_a_mano: false },
      ],
    };
    fetchMock
      .mockResolvedValueOnce(respuesta(200, aplicada))
      .mockResolvedValueOnce(respuesta(200, aplicada))
      .mockResolvedValueOnce(respuesta(200, {}));
    montar({ defaultSeccion: "horario" });
    expect(campo("business_ranges").value).toBe("");
    expect(campo("business_hours_mode").value).toBe("bloquea");

    fireEvent.click(boton()!);
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("radio", { name: /Lunes a viernes/ }));
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    await screen.findByRole("heading", { level: 3, name: "¿Qué hace cuando escriben fuera de horario?" });
    fireEvent.click(screen.getByRole("radio", { name: "Responde igual" }));
    fireEvent.click(screen.getByRole("button", { name: "Ver los cambios" }));
    await screen.findByRole("list", { name: "Cambios propuestos" });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar cambios" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    expect(campo("business_ranges").value).toBe("0 08:00-18:00\n1 08:00-18:00\n2 08:00-18:00\n3 08:00-18:00\n4 08:00-18:00");
    expect(campo("business_hours_mode").value).toBe("informativo");

    // Aplicar deja el formulario limpio: pasar a otra sección no pide confirmar nada. (Se usa una hermana
    // de la misma familia porque en ésta el formulario sigue montado; la página real se refresca sola.)
    fireEvent.click(within(screen.getByRole("navigation", { name: "Secciones de Configuración" })).getByRole("button", { name: "Voz y estilo" }));
    await waitFor(() => expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("Voz y estilo"));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    fireEvent.click(within(screen.getByRole("navigation", { name: "Secciones de Configuración" })).getByRole("button", { name: "Horario y escalamiento" }));
    await waitFor(() => expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("Horario y escalamiento"));

    // Guardar a mano manda lo que dejó el asistente.
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    const [url, init] = fetchMock.mock.calls[2] as [string, RequestInit];
    expect(url).toBe("/api/settings/identity");
    const cuerpo = JSON.parse(init.body as string) as { business_ranges: unknown[]; business_hours_mode: string };
    expect(cuerpo.business_hours_mode).toBe("informativo");
    expect(cuerpo.business_ranges).toHaveLength(5);
  });

  it("con cambios sin guardar, descartar los quita del formulario antes de abrir el asistente", async () => {
    montar({ defaultSeccion: "horario" });
    fireEvent.change(campo("business_hours_mode"), { target: { value: "informativo" } });
    expect(campo("business_hours_mode").value).toBe("informativo");

    fireEvent.click(boton()!);
    await screen.findByRole("alertdialog");
    fireEvent.click(screen.getByRole("button", { name: "Seguir editando" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(campo("business_hours_mode").value).toBe("informativo"); // seguir editando no pierde nada

    fireEvent.click(boton()!);
    await screen.findByRole("alertdialog");
    fireEvent.click(screen.getByRole("button", { name: "Descartar y abrir" }));
    await screen.findByRole("dialog");
    expect(campo("business_hours_mode").value).toBe("bloquea"); // el asistente parte de lo guardado
  });
});
