// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { SettingsTabs } from "@/app/(app)/configuracion/_components/settings-tabs";
import { FeedbackProviders } from "@/components/ui/providers";
import type { CatalogoConfig } from "@/lib/api/types";
import { ajustes, ajustesAvanzados, ajustesMultimedia, chatWeb } from "@/lib/testing/fixtures";

// El chat web lleva una casilla de Radix, que mide su tamaño con ResizeObserver (jsdom no lo trae).
class ResizeObserverFalso {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverFalso as unknown as typeof ResizeObserver;

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
        datosCliente={{ puedeEditar: true, aviso: null }}
        {...props}
      />
    </FeedbackProviders>,
  );
}

/** Fila del resumen (rediseño B): el nombre del ajuste y su valor actual. */
const fila = (nombre: string | RegExp) => screen.getByRole("button", { name: typeof nombre === "string" ? new RegExp(`^${nombre}`) : nombre });
const cajon = () => screen.getByRole("dialog");
const titulo = () => within(cajon()).getByRole("heading", { level: 2 });

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

describe("resumen de Configuración (rediseño B)", () => {
  it("agrupa los ajustes por tarea y muestra el valor de cada uno", () => {
    montar();
    for (const grupo of ["Mi negocio", "Cómo responde", "Canales y medios", "Avanzado"]) {
      expect(screen.getByRole("heading", { name: grupo })).toBeTruthy();
    }
    // Memoria se lee en palabras.
    expect(fila("Memoria").textContent).toMatch(/Recuerda \d+ mensajes/);
    expect(fila("Chat web").textContent).toMatch(/Apagado|Activo en/);
    // WhatsApp Web y Cuenta y proveedor son del equipo de SolversHub: sin master no aparecen (CFG-04).
    expect(screen.queryByRole("button", { name: /^WhatsApp Web/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Cuenta y proveedor/ })).toBeNull();
    // Sin sección pedida no hay cajón abierto.
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("el master ve Cuenta y proveedor", () => {
    montar({ esMaster: true });
    expect(fila("Cuenta y proveedor").textContent).toContain("deepseek · deepseek-chat");
    // Herramientas del negocio se retiró con el v2 (HU-AOS-91): las tools viven en cada agente.
    expect(screen.queryByRole("button", { name: /^Herramientas del agente/ })).toBeNull();
  });

  it("Cuenta y proveedor deja solo el LLM propio y las evals: sin spec, versiones ni guardrails (HU-AOS-91)", () => {
    montar({ defaultSeccion: "agentspec", esMaster: true });
    const cajon = screen.getByRole("dialog");
    expect(cajon.textContent).toContain("Proveedor LLM");
    expect(cajon.textContent).toContain("Últimas corridas de evals");
    expect(cajon.textContent).toContain("Los guardrails y las tools de cada agente se configuran en el agente.");
    for (const retirado of ["Editor crudo del AgentSpec", "Versiones del agente", "Guardrails personalizados"]) {
      expect(cajon.textContent).not.toContain(retirado);
    }
  });

  it("habilidades y mensajes fallidos son filas más, con su estado (CFG-11)", () => {
    montar({
      habilidades: [{ id: "pack_commerce", name: "pack_commerce", display_name: "Comercio", enabled_for_tenant: true, status: "loaded" } as never],
      fallidos: 2,
    });
    expect(screen.getByRole("link", { name: /^Habilidades.*Comercio activa/ }).getAttribute("href")).toBe("/habilidades");
    expect(screen.getByRole("link", { name: /^Mensajes fallidos.*2 por reintentar/ }).getAttribute("href")).toBe("/dlq");
  });

  it("tocar un ajuste lo abre en un cajón y escribe ?seccion= en la URL", async () => {
    montar();
    fireEvent.click(fila("Memoria"));
    expect(await screen.findByRole("dialog")).toBeTruthy();
    expect(titulo().textContent).toBe("Memoria");
    expect(within(cajon()).getByRole("group", { name: "Cuánto recuerda de la conversación" })).toBeTruthy();
    expect(window.location.search).toBe("?seccion=memoria");
  });

  it("?seccion= abre ese ajuste y le gana a ?tab=", () => {
    montar({ defaultSeccion: "cerebro", defaultTab: "memory" });
    expect(titulo().textContent).toBe("Cerebro");
  });

  it("?tab= sigue valiendo, con los ids de la antigua pantalla y los del panel clásico", () => {
    montar({ defaultTab: "brain" });
    expect(titulo().textContent).toBe("Cerebro");
    cleanup();
    montar({ defaultTab: "web-chat" });
    expect(titulo().textContent).toBe("Chat web");
    cleanup();
    montar({ defaultTab: "avanzado", esMaster: true });
    expect(titulo().textContent).toBe("Cuenta y proveedor");
  });

  it("Horario muestra solo sus campos del formulario de identidad", () => {
    montar({ defaultSeccion: "horario" });
    expect(within(cajon()).getByLabelText("Escalar tras turnos")).toBeTruthy();
    expect(within(cajon()).queryByLabelText("Nombre del asistente")).toBeNull();
  });

  it("la ayuda de la moneda aclara que el cobro usa la de cada habilidad, y la moneda se elige de una lista", () => {
    montar({ defaultSeccion: "identidad" });
    expect(screen.getByText(/el cobro usa la moneda de cada habilidad/)).toBeTruthy();
    expect(within(cajon()).getByLabelText("Moneda").tagName).toBe("SELECT");
  });
});

describe("cambios sin guardar", () => {
  it("cerrar con cambios pregunta; «Seguir editando» se queda y conserva lo escrito", async () => {
    // El modelo solo lo edita el master (ADR-0210 §5).
    montar({ defaultSeccion: "cerebro", esMaster: true });
    fireEvent.change(screen.getByLabelText(/Modelo primario/), { target: { value: "otro-modelo" } });
    fireEvent.click(within(cajon()).getByRole("button", { name: "Cerrar" }));
    const pregunta = await screen.findByRole("alertdialog");
    expect(within(pregunta).getByText(/Si cierras «Cerebro», se pierde lo que cambiaste/)).toBeTruthy();
    fireEvent.click(within(pregunta).getByRole("button", { name: "Seguir editando" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect((screen.getByLabelText(/Modelo primario/) as HTMLInputElement).value).toBe("otro-modelo");
  });

  it("«Descartar cambios» cierra el cajón y la URL vuelve al resumen", async () => {
    montar({ defaultSeccion: "cerebro", esMaster: true });
    window.history.replaceState(null, "", "/configuracion?seccion=cerebro");
    fireEvent.change(screen.getByLabelText(/Modelo primario/), { target: { value: "otro-modelo" } });
    fireEvent.click(within(cajon()).getByRole("button", { name: "Cerrar" }));
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Descartar cambios" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(window.location.search).toBe("");
  });

  it("sin cambios cierra sin preguntar", async () => {
    montar({ defaultSeccion: "cerebro" });
    fireEvent.click(within(cajon()).getByRole("button", { name: "Cerrar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });
});

describe("solo lectura", () => {
  it("quien solo puede ver no tiene botón de guardar y los campos quedan desactivados", () => {
    montar({ defaultSeccion: "memoria", puedeEditar: false });
    expect(screen.queryByRole("button", { name: "Guardar" })).toBeNull();
    expect(screen.getByText(/Solo puedes ver esta sección/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /^Avanzado: los números exactos/ }));
    // El `fieldset disabled` apaga el campo aunque el input no tenga `disabled` propio.
    expect(screen.getByLabelText(/Mensajes que recuerda/).matches(":disabled")).toBe(true);
  });
});

describe("limpieza de campos", () => {
  it("el parecido mínimo se apaga cuando no se busca conocimiento y lo explica", () => {
    montar({ defaultSeccion: "memoria", settings: { ...ajustes, memory: { short_term_turns: 10, rag_top_k: 0, rag_min_score: 0.3 } } });
    fireEvent.click(screen.getByRole("button", { name: /^Avanzado: los números exactos/ }));
    expect(screen.getByLabelText(/Parecido mínimo/)).toHaveProperty("disabled", true);
    expect(screen.getByText(/No aplica mientras el conocimiento a buscar sea 0/)).toBeTruthy();
  });

  it("el nombre del asistente ya no es `required` (no hacía nada con noValidate)", () => {
    montar({ defaultSeccion: "identidad" });
    expect((screen.getByLabelText("Nombre del asistente") as HTMLInputElement).required).toBe(false);
  });

  it("el horario se elige por día: encender un día le pone horas y se pueden cambiar (CFG-01)", () => {
    montar({
      defaultSeccion: "horario",
      catalogo: { ...catalogo, opciones: [...catalogo.opciones, opcion("business_ranges", "horario", "franjas", "Franjas de atención")] },
      settings: { ...ajustes, identity: { ...ajustes.identity, business_ranges: [{ day: 0, from: "09:00", to: "18:00" }] } },
    });
    expect((screen.getByRole("switch", { name: "Abierto el lunes" }) as HTMLButtonElement).getAttribute("aria-checked")).toBe("true");
    expect((screen.getByLabelText("Lunes: desde") as HTMLSelectElement).value).toBe("09:00");
    fireEvent.click(screen.getByRole("switch", { name: "Abierto el sábado" }));
    expect((screen.getByLabelText("Sábado: hasta") as HTMLSelectElement).value).toBe("18:00");
    fireEvent.click(screen.getByRole("button", { name: "Copiar el lunes a los demás días" }));
    expect((screen.getByRole("switch", { name: "Abierto el domingo" }) as HTMLButtonElement).getAttribute("aria-checked")).toBe("true");
    expect(screen.queryByText(/Días: 0 Lun/)).toBeNull();
  });
});

describe("el modelo solo lo ve el master (HU-BILL-24, HU-BILL-27)", () => {
  const brainDelGestor = { ...ajustes.brain, model_primary: "", model_router: null, model_fallback: null };

  it("al gestor el resumen del Cerebro no pinta el modelo vacío ni «null»", () => {
    montar({ settings: { ...ajustes, brain: brainDelGestor } });
    const resumen = fila("Cerebro");
    expect(resumen.textContent).toContain("Respuestas precisas");
    expect(resumen.textContent).not.toMatch(/null|·/);
  });

  it("al gestor el Cerebro no muestra los campos de modelo y se puede guardar", () => {
    montar({ defaultSeccion: "cerebro", settings: { ...ajustes, brain: brainDelGestor } });
    expect(within(cajon()).queryByLabelText(/Modelo primario/)).toBeNull();
    expect(within(cajon()).queryByLabelText(/Modelo de razonamiento/)).toBeNull();
    expect(within(cajon()).queryByLabelText(/Modelo de respaldo/)).toBeNull();
    expect(within(cajon()).getByRole("button", { name: "Guardar" })).toBeTruthy();
  });

  it("el master sigue viendo el modelo en el resumen y en el formulario", () => {
    montar({ defaultSeccion: "cerebro", esMaster: true });
    expect((within(cajon()).getByLabelText(/Modelo primario/) as HTMLInputElement).value).toBe(ajustes.brain.model_primary);
    cleanup();
    montar({ esMaster: true });
    expect(fila("Cerebro").textContent).toContain(`${ajustes.brain.model_primary} · respuestas precisas`);
  });
});
