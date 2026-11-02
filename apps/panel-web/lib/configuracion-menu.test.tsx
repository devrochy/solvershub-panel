// @vitest-environment jsdom
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
const opcion = (clave: string, grupo: Opcion["grupo"], tipo: Opcion["tipo"], etiqueta: string): Opcion => ({
  clave,
  grupo,
  tipo,
  etiqueta,
  explicacion: `Ayuda de ${etiqueta}.`,
  ejemplo: "",
  unidad: "",
  editable_por: "dueno",
  solo_lectura: false,
  almacen: "app_settings",
  ambito: "negocio",
});

const catalogo: CatalogoConfig = {
  aos_runtime: "legacy",
  version: "test",
  opciones: [
    opcion("assistant_name", "identidad", "texto", "Nombre del asistente"),
    opcion("currency", "identidad", "texto", "Moneda"),
    opcion("auto_escalate_after_turns", "escalamiento", "entero", "Escalar tras turnos"),
    opcion("business_hours_mode", "horario", "texto", "Modo de horario"),
    opcion("persona_warmth", "voz", "entero", "Calidez"),
    opcion("guardrail_max_retries", "calidad", "entero", "Reintentos"),
  ],
  asistente: [],
};

function montar(props: Partial<Parameters<typeof SettingsTabs>[0]> = {}) {
  return render(
    <FeedbackProviders>
      <SettingsTabs
        settings={ajustes}
        webChat={chatWeb}
        advanced={ajustesAvanzados as Parameters<typeof SettingsTabs>[0]["advanced"]}
        media={ajustesMultimedia as Parameters<typeof SettingsTabs>[0]["media"]}
        catalogo={catalogo}
        bajas={null}
        waweb={null}
        datosCliente={{ politica: null, error: "sin datos", puedeEditar: true, aviso: null }}
        {...props}
      />
    </FeedbackProviders>,
  );
}

const menu = () => within(screen.getByRole("navigation", { name: "Secciones de Configuración" }));
const titulo = () => screen.getByRole("heading", { level: 2 });

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
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("menú de Configuración", () => {
  it("agrupa las secciones por tarea y marca la actual", () => {
    montar();
    const nav = menu();
    for (const grupo of ["Mi negocio", "Cómo responde", "Canales y medios", "Avanzado"]) {
      expect(nav.getByText(grupo)).toBeTruthy();
    }
    expect(nav.getByRole("button", { name: "Herramientas del agente" })).toBeTruthy();
    expect(nav.getByRole("button", { name: "Identidad" }).getAttribute("aria-current")).toBe("page");
    // WhatsApp Web solo para el master: sin `waweb` no hay entrada.
    expect(nav.queryByRole("button", { name: /WhatsApp Web/ })).toBeNull();
    // En celular hay un selector con los mismos grupos.
    expect(screen.getByLabelText("Sección")).toBeTruthy();
  });

  it("elegir una sección muestra su formulario y escribe ?seccion= en la URL", async () => {
    montar();
    fireEvent.click(menu().getByRole("button", { name: "Memoria" }));
    await waitFor(() => expect(titulo().textContent).toBe("Memoria"));
    expect(screen.getByLabelText(/Turnos de contexto/)).toBeTruthy();
    expect(window.location.search).toBe("?seccion=memoria");
    expect(menu().getByRole("button", { name: "Memoria" }).getAttribute("aria-current")).toBe("page");
  });

  it("?seccion= abre esa sección y le gana a ?tab=", () => {
    montar({ defaultSeccion: "cerebro", defaultTab: "memory" });
    expect(titulo().textContent).toBe("Cerebro y modelos");
  });

  it("?tab= sigue valiendo, con los ids de la antigua pantalla y los del panel clásico", () => {
    montar({ defaultTab: "skills" });
    expect(titulo().textContent).toBe("Herramientas del agente");
    cleanup();
    montar({ defaultTab: "web-chat" });
    expect(titulo().textContent).toBe("Chat web");
    cleanup();
    montar({ defaultTab: "avanzado" });
    expect(titulo().textContent).toBe("AgentSpec y proveedor");
  });

  it("Identidad se reparte en secciones que comparten el formulario", () => {
    montar({ defaultSeccion: "horario" });
    expect(screen.getByLabelText("Escalar tras turnos")).toBeTruthy();
    expect(screen.queryByLabelText("Nombre del asistente")).toBeNull();
    fireEvent.click(menu().getByRole("button", { name: "Calidad de respuestas" }));
    expect(screen.getByLabelText("Reintentos")).toBeTruthy();
  });

  it("la ayuda de la moneda aclara que el cobro usa la de cada habilidad", () => {
    montar();
    expect(screen.getByText(/el cobro usa la moneda de cada habilidad/)).toBeTruthy();
  });

  it("el selector del celular también cambia de sección", async () => {
    montar();
    fireEvent.change(screen.getByLabelText("Sección"), { target: { value: "cerebro" } });
    await waitFor(() => expect(titulo().textContent).toBe("Cerebro y modelos"));
    expect(window.location.search).toBe("?seccion=cerebro");
  });
});

describe("cambios sin guardar", () => {
  it("pide confirmar al salir; «Seguir editando» se queda y conserva lo escrito", async () => {
    montar({ defaultSeccion: "cerebro" });
    fireEvent.change(screen.getByLabelText(/Modelo primario/), { target: { value: "otro-modelo" } });
    fireEvent.click(menu().getByRole("button", { name: "Memoria" }));
    const dialogo = await screen.findByRole("alertdialog").catch(() => screen.findByRole("dialog"));
    expect(within(dialogo).getByText(/se pierde lo que cambiaste en «Cerebro y modelos»/)).toBeTruthy();
    fireEvent.click(within(dialogo).getByRole("button", { name: "Seguir editando" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog") ?? screen.queryByRole("dialog")).toBeNull());
    expect(titulo().textContent).toBe("Cerebro y modelos");
    expect((screen.getByLabelText(/Modelo primario/) as HTMLInputElement).value).toBe("otro-modelo");
    expect(window.location.search).toBe("");
  });

  it("«Descartar cambios» cambia de sección", async () => {
    montar({ defaultSeccion: "cerebro" });
    fireEvent.change(screen.getByLabelText(/Modelo primario/), { target: { value: "otro-modelo" } });
    fireEvent.click(menu().getByRole("button", { name: "Memoria" }));
    const dialogo = await screen.findByRole("alertdialog").catch(() => screen.findByRole("dialog"));
    fireEvent.click(within(dialogo).getByRole("button", { name: "Descartar cambios" }));
    await waitFor(() => expect(titulo().textContent).toBe("Memoria"));
  });

  it("sin cambios no pregunta nada", async () => {
    montar({ defaultSeccion: "cerebro" });
    fireEvent.click(menu().getByRole("button", { name: "Memoria" }));
    await waitFor(() => expect(titulo().textContent).toBe("Memoria"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("cambiar entre secciones de Identidad no pregunta: el formulario sigue montado y conserva lo escrito", async () => {
    montar();
    fireEvent.change(screen.getByLabelText("Nombre del asistente"), { target: { value: "Lucía" } });
    fireEvent.click(menu().getByRole("button", { name: "Horario y escalamiento" }));
    await waitFor(() => expect(titulo().textContent).toBe("Horario y escalamiento"));
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(menu().getByRole("button", { name: "Identidad" }));
    await waitFor(() => expect(titulo().textContent).toBe("Identidad"));
    expect((screen.getByLabelText("Nombre del asistente") as HTMLInputElement).value).toBe("Lucía");
    // Pero salir de la familia con ese cambio sí pregunta.
    fireEvent.click(menu().getByRole("button", { name: "Memoria" }));
    expect(await screen.findByText("Tienes cambios sin guardar")).toBeTruthy();
  });
});

describe("solo lectura", () => {
  it("quien solo puede ver no tiene botón de guardar y los campos quedan desactivados", () => {
    montar({ defaultSeccion: "memoria", puedeEditar: false });
    expect(screen.queryByRole("button", { name: "Guardar memoria" })).toBeNull();
    expect(screen.getByText(/Solo puedes ver esta sección/)).toBeTruthy();
    // El `fieldset disabled` apaga el campo aunque el input no tenga `disabled` propio.
    expect(screen.getByLabelText(/Turnos de contexto/).matches(":disabled")).toBe(true);
  });
});

describe("limpieza de campos", () => {
  it("la similitud mínima se apaga cuando no se busca conocimiento (top K = 0) y lo explica", () => {
    montar({ defaultSeccion: "memoria", settings: { ...ajustes, memory: { short_term_turns: 10, rag_top_k: 0, rag_min_score: 0.3 } } });
    expect(screen.getByLabelText(/Similitud mínima/)).toHaveProperty("disabled", true);
    expect(screen.getByText(/No aplica mientras el conocimiento a buscar sea 0/)).toBeTruthy();
  });

  it("el nombre del asistente ya no es `required` (no hacía nada con noValidate)", () => {
    montar();
    expect((screen.getByLabelText("Nombre del asistente") as HTMLInputElement).required).toBe(false);
  });

  it("avisa de las líneas del horario que no se guardarán", () => {
    montar({
      defaultSeccion: "horario",
      catalogo: { ...catalogo, opciones: [...catalogo.opciones, opcion("business_ranges", "horario", "franjas", "Franjas de atención")] },
      settings: { ...ajustes, identity: { ...ajustes.identity, business_ranges: [] } },
    });
    fireEvent.change(screen.getByLabelText("Franjas de atención"), { target: { value: "0 08:00-18:00\nlunes 8 a 6" } });
    expect(screen.getByText(/Esta línea no se va a guardar/)).toBeTruthy();
    expect(screen.getByText(/«lunes 8 a 6»/)).toBeTruthy();
  });
});
