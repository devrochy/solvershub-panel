// @vitest-environment jsdom
// HU-CFG-12: Voz y estilo con opciones de un vistazo y momento de aplicación.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { SettingsTabs } from "@/app/(app)/configuracion/_components/settings-tabs";
import { FeedbackProviders } from "@/components/ui/providers";
import type { CatalogoConfig, SettingsResponse } from "@/lib/api/types";
import { ajustes, ajustesAvanzados, ajustesMultimedia, chatWeb } from "@/lib/testing/fixtures";

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
const valor = (v: string, etiqueta: string, nota = "") => ({ valor: v, etiqueta, nota });
const opcion = (
  clave: string,
  grupo: Opcion["grupo"],
  tipo: Opcion["tipo"],
  etiqueta: string,
  extra: Partial<Opcion> = {},
): Opcion => ({
  clave,
  grupo,
  tipo,
  etiqueta,
  explicacion: `Ayuda de ${etiqueta}.`,
  ejemplo: "",
  unidad: "",
  editable_por: "dueno",
  solo_lectura: false,
  almacen: "spec:persona",
  ambito: "negocio",
  ...extra,
});

const catalogo: CatalogoConfig = {
  version: "test",
  opciones: [
    opcion("brand_voice", "identidad", "texto_largo", "Voz de marca"),
    opcion("persona_tone", "voz", "elegir_una", "Tono de personalidad", {
      valores: [valor("cercano", "Cercano"), valor("formal", "Formal"), valor("neutral", "Neutral"), valor("informal", "Informal")],
    }),
    opcion("persona_warmth", "voz", "entero", "Calidez", { minimo: 0, maximo: 5 }),
    opcion("persona_emojis", "voz", "elegir_una", "Emojis", {
      valores: [valor("none", "Ninguno"), valor("sparse", "Pocos"), valor("free", "Libres")],
    }),
    opcion("persona_max_length", "voz", "entero", "Largo máximo de la respuesta", { minimo: 100, maximo: 2000 }),
    opcion("persona_forbidden", "voz", "lista_de_textos", "Frases prohibidas"),
    opcion("debounce_mode", "respuesta", "elegir_una", "Velocidad de respuesta", {
      valores: [
        valor("inmediato", "Inmediata", "responde sin esperar"),
        valor("corto", "Corta", "espera 3 s"),
        valor("rapido", "Rápida", "espera 5 s"),
        valor("natural", "Natural", "espera 15 s"),
        valor("pausado", "Pausada", "espera 30 s"),
      ],
    }),
    opcion("split_style", "respuesta", "elegir_una", "Estilo de envío", {
      valores: [
        valor("un_mensaje", "Un solo mensaje", "1 por respuesta"),
        valor("pocos_cortos", "Pocos mensajes cortos", "hasta 3 por respuesta"),
        valor("varios_cortos", "Varios mensajes cortos", "hasta 6 por respuesta"),
      ],
    }),
    opcion("guardrail_fail_action", "calidad", "elegir_una", "Si el asistente no logra corregir su respuesta", {
      valores: [valor("escalate", "Escalar a una persona"), valor("neutral", "Responder que va a verificar")],
    }),
  ],
  asistente: [],
};

function montar(identity: Partial<SettingsResponse["identity"]> = {}, puedeEditar = true) {
  return render(
    <FeedbackProviders>
      <SettingsTabs
        settings={{ ...ajustes, identity: { ...ajustes.identity, ...identity } }}
        webChat={chatWeb}
        advanced={ajustesAvanzados as Parameters<typeof SettingsTabs>[0]["advanced"]}
        media={ajustesMultimedia as Parameters<typeof SettingsTabs>[0]["media"]}
        catalogo={catalogo}
        bajas={null}
        waweb={null}
        datosCliente={{ puedeEditar: true, aviso: null }}
        puedeEditar={puedeEditar}
      />
    </FeedbackProviders>,
  );
}

const abrirVoz = async () => {
  fireEvent.click(screen.getByRole("button", { name: /^Voz y estilo/ }));
  await waitFor(() =>
    expect(within(screen.getByRole("dialog")).getByRole("heading", { level: 2 }).textContent).toBe("Voz y estilo"),
  );
  return screen.getByRole("dialog");
};

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

describe("Voz y estilo (HU-CFG-12)", () => {
  it("separa personalidad, ritmo y avanzado, y no usa menús para velocidad ni envío", async () => {
    montar();
    const dialogo = await abrirVoz();

    expect(within(dialogo).getByRole("heading", { name: "Personalidad" })).toBeTruthy();
    expect(within(dialogo).getByRole("heading", { name: "Ritmo" })).toBeTruthy();
    expect(within(dialogo).getByText(/Avanzado · límites de este negocio/)).toBeTruthy();
    expect(within(dialogo).getByText("Aplica al publicar")).toBeTruthy();
    expect(within(dialogo).getByText("Aplica ahora")).toBeTruthy();
    expect(within(dialogo).getByText(/Tu negocio usa el Agent OS/)).toBeTruthy();

    // La voz y el ritmo se eligen con tarjetas/botones; ningún `select` en la sección.
    expect(within(dialogo).queryAllByRole("combobox")).toHaveLength(0);
    expect(within(dialogo).getByRole("radio", { name: /Rápida/ })).toBeTruthy();
    expect(within(dialogo).getByRole("radio", { name: /Un solo mensaje/ })).toBeTruthy();
  });

  it("el resumen del ritmo sigue a la velocidad y al envío elegidos", async () => {
    montar();
    const dialogo = await abrirVoz();

    expect(within(dialogo).getByText(/espera 15 s y envía un solo mensaje\./)).toBeTruthy();
    fireEvent.click(within(dialogo).getByRole("radio", { name: /Pausada/ }));
    expect(within(dialogo).getByText(/espera 30 s y envía un solo mensaje\./)).toBeTruthy();
    fireEvent.click(within(dialogo).getByRole("radio", { name: /Pocos mensajes cortos/ }));
    expect(within(dialogo).getByText(/espera 30 s y envía pocos mensajes cortos\./)).toBeTruthy();
  });

  it("«Más opciones» muestra las velocidades secundarias y no esconde la guardada", async () => {
    montar();
    const dialogo = await abrirVoz();

    expect(within(dialogo).queryByRole("radio", { name: /Corta/ })).toBeNull();
    fireEvent.click(within(dialogo).getByRole("button", { name: "Más opciones" }));
    expect(within(dialogo).getByRole("radio", { name: /Inmediata/ })).toBeTruthy();
    expect(within(dialogo).getByRole("radio", { name: /Corta/ })).toBeTruthy();
  });

  it("si la velocidad guardada es secundaria, se ve seleccionada al abrir", async () => {
    montar({ debounce_mode: "corto" });
    const dialogo = await abrirVoz();

    const corta = within(dialogo).getByRole("radio", { name: /Corta/ });
    expect(corta).toBeTruthy();
    expect((corta as HTMLInputElement).checked).toBe(true);
    expect(within(dialogo).queryByRole("button", { name: "Menos opciones" })).toBeNull();
  });

  it("la muestra de voz cambia con el tono, sin llamar al modelo", async () => {
    montar();
    const dialogo = await abrirVoz();

    const burbuja = dialogo.querySelector('[aria-live="polite"]');
    expect(burbuja?.textContent).toMatch(/Soy Asistente de prueba/);
    fireEvent.click(within(dialogo).getByRole("radio", { name: /Profesional/ }));
    expect(burbuja?.textContent).toMatch(/^Buenas tardes\./);
    expect(burbuja?.textContent).toMatch(/Le atiende Asistente de prueba/);
  });

  it("los límites viven en Avanzado y la regla de fallo ya no está en Voz", async () => {
    montar();
    const dialogo = await abrirVoz();

    expect(within(dialogo).queryByText("Si el asistente no logra corregir su respuesta")).toBeNull();
    expect(within(dialogo).getByText(/Aplica al crear el agente/)).toBeTruthy();
    fireEvent.click(within(dialogo).getByText(/Avanzado · límites de este negocio/));
    expect(within(dialogo).getByText("Largo máximo de la respuesta")).toBeTruthy();
    expect(within(dialogo).getByText("Frases prohibidas")).toBeTruthy();

    // La regla de fallo está en Calidad de respuestas.
    fireEvent.click(within(dialogo).getByRole("button", { name: "Calidad de respuestas" }));
    await waitFor(() =>
      expect(within(screen.getByRole("dialog")).getByRole("heading", { level: 2 }).textContent).toBe("Calidad de respuestas"),
    );
    expect(within(screen.getByRole("dialog")).getByText("Si el asistente no logra corregir su respuesta")).toBeTruthy();
  });

  it("en solo lectura no hay botón de guardar y se explica por qué", async () => {
    montar({}, false);
    const dialogo = await abrirVoz();

    expect(within(dialogo).queryByRole("button", { name: "Guardar" })).toBeNull();
    expect(within(dialogo).getByText(/Solo puedes ver esta sección/)).toBeTruthy();
  });
});
