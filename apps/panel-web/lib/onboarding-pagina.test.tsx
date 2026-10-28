// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const nav = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => nav,
  usePathname: () => "/bienvenida",
}));

import { AvisoDeOnboarding } from "@/components/domain/aviso-de-onboarding";
import { FeedbackProviders } from "@/components/ui/providers";
import type { PrimerosPasos } from "@/lib/api/types";
import { violacionesGraves } from "@/lib/testing/axe";
import { ajustes } from "@/lib/testing/fixtures";

import { RecorridoDeBienvenida } from "@/app/(onboarding)/bienvenida/_components/recorrido";

type Recorrido = PrimerosPasos["recorrido"];

const PENDIENTE: Recorrido = { estado: "pendiente", paso: 1, total_pasos: 6, aplica: true, abrir: true, avisar: false };
const OMITIDO: Recorrido = { ...PENDIENTE, estado: "omitido", paso: 3, abrir: false, avisar: true };

const llamadas: { url: string; cuerpo: unknown }[] = [];

function respuesta(cuerpo: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(cuerpo), { status, headers: { "Content-Type": "application/json" } }));
}

type Extra = Partial<React.ComponentProps<typeof RecorridoDeBienvenida>>;

function montar(recorrido: Recorrido = PENDIENTE, extra: Extra = {}) {
  return render(
    <FeedbackProviders>
      <RecorridoDeBienvenida
        negocioId="n-1"
        nombreDelNegocio="Sport Plus"
        recorridoInicial={recorrido}
        identidad={{ ...ajustes.identity, assistant_name: "Sport Plus", business_description: "", business_ranges: [], escalation_keywords: [], persona_forbidden: [] }}
        contenido={null}
        disponibles={["ventas", "agenda"]}
        habilitara={{ ventas: ["pack_commerce"], agenda: [] }}
        {...extra}
      />
    </FeedbackProviders>,
  );
}

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

beforeEach(() => {
  llamadas.length = 0;
  window.localStorage.clear();
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string, init?: RequestInit) => {
      llamadas.push({ url, cuerpo: init?.body ? JSON.parse(String(init.body)) : null });
      if (url === "/api/onboarding/finalizar") {
        return respuesta({ error: "Faltan pasos.", details: { faltan: ["prueba"] } }, 409);
      }
      if (url === "/api/onboarding/omitir") return respuesta({ ...OMITIDO });
      if (url === "/api/onboarding/avanzar") return respuesta({ ...PENDIENTE, estado: "en_curso", abrir: false, avisar: true });
      return respuesta({ ok: true });
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  nav.replace.mockClear();
});

describe("asistente de primer uso", () => {
  it("arranca en el paso 1 sin violaciones graves de accesibilidad y marca el recorrido como empezado", async () => {
    const { container } = montar();
    expect(await screen.findByRole("heading", { level: 1, name: "Cuéntanos de tu negocio" })).toBeTruthy();
    expect(screen.getByText("Paso 1 de 6 · Tu negocio")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Lo hago después" })).toBeTruthy();
    expect(await violacionesGraves(container)).toEqual([]);
    await waitFor(() => expect(llamadas.some((l) => l.url === "/api/onboarding/avanzar")).toBe(true));
  });

  it("no deja avanzar sin tipo ni frase del negocio y dice qué falta", async () => {
    montar();
    fireEvent.click(await screen.findByRole("button", { name: /Siguiente/ }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/Elige a qué se dedica/);
    expect(llamadas.some((l) => l.url === "/api/onboarding/identidad")).toBe(false);
  });

  it("guarda el paso en Identidad y pasa al siguiente", async () => {
    montar();
    fireEvent.click(await screen.findByRole("radio", { name: /Vendo productos o planes/ }));
    fireEvent.change(screen.getByLabelText(/Cuéntanos en una frase/), { target: { value: "Vendemos ropa deportiva con envíos" } });
    fireEvent.click(screen.getByRole("button", { name: /Siguiente/ }));

    expect(await screen.findByRole("heading", { level: 1, name: "¿Cómo quieres que hable?" })).toBeTruthy();
    const guardado = llamadas.find((l) => l.url === "/api/onboarding/identidad");
    expect(guardado?.cuerpo).toMatchObject({
      cambios: { assistant_name: "Sofía", business_description: "Sport Plus. Vendemos ropa deportiva con envíos" },
    });
    expect(llamadas.filter((l) => l.url === "/api/onboarding/avanzar").pop()?.cuerpo).toEqual({ paso: 2 });
  });

  it("elegir un tipo no pide activar nada antes: avisa qué habilidad se activará al terminar", async () => {
    montar();
    expect(screen.queryByText(/Al terminar activaremos/)).toBeNull();
    fireEvent.click(await screen.findByRole("radio", { name: /Vendo productos o planes/ }));
    expect((await screen.findByText(/Al terminar activaremos/)).textContent).toMatch(/Comercio/);
    // Un tipo cuya habilidad ya está activa no dice nada.
    fireEvent.click(await screen.findByRole("radio", { name: /citas|agenda/i }));
    expect(screen.queryByText(/Al terminar activaremos/)).toBeNull();
  });

  it("un tipo que el servicio no trae sale deshabilitado y sin pedir activar una habilidad", async () => {
    montar(PENDIENTE, { disponibles: ["agenda"] });
    const ventas = (await screen.findByRole("radio", { name: /Vendo productos o planes/ })) as HTMLInputElement;
    expect(ventas.disabled).toBe(true);
    expect(screen.getAllByText(/no está disponible en tu servicio/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Falta activar una habilidad/)).toBeNull();
  });

  it("la tarjeta del agente muestra el nombre y la voz elegidos", async () => {
    montar();
    fireEvent.click(await screen.findByRole("radio", { name: /Vendo productos o planes/ }));
    const tarjeta = screen.getAllByLabelText("Tu agente, armándose")[0];
    expect(tarjeta.textContent).toContain("Sofía");
    expect(tarjeta.textContent).toContain("Responde las 24 horas");
  });

  it("omitir pide confirmación, avisa al servidor y vuelve al Resumen", async () => {
    montar();
    fireEvent.click(await screen.findByRole("button", { name: "Lo hago después" }));
    expect(await screen.findByText("¿Dejarlo para después?")).toBeTruthy();
    expect(llamadas.some((l) => l.url === "/api/onboarding/omitir")).toBe(false);
    fireEvent.click(screen.getAllByRole("button", { name: "Lo hago después" }).pop()!);
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith("/dashboard"));
    expect(llamadas.some((l) => l.url === "/api/onboarding/omitir")).toBe(true);
  });

  it("retoma en el paso donde se quedó", async () => {
    montar(OMITIDO);
    expect(await screen.findByRole("heading", { level: 1, name: "Horario y reglas" })).toBeTruthy();
    expect(screen.getByText("Paso 3 de 6 · Horario y reglas")).toBeTruthy();
  });
});

describe("aviso del primer uso", () => {
  it("se ve mientras el recorrido está saltado, con cuántos pasos faltan y cómo retomarlo", () => {
    render(<AvisoDeOnboarding recorrido={OMITIDO} />);
    expect(screen.getByRole("status").textContent).toContain("Tu agente aún no está listo para probar. Faltan 4 pasos.");
    expect(screen.getByRole("link", { name: "Continuar" }).getAttribute("href")).toBe("/bienvenida");
    expect(screen.queryByRole("button", { name: /Cerrar/ })).toBeNull();
  });

  it("no aparece si no empezó, si ya terminó o si no aplica al negocio", () => {
    const { container, rerender } = render(<AvisoDeOnboarding recorrido={PENDIENTE} />);
    expect(container.textContent).toBe("");
    rerender(<AvisoDeOnboarding recorrido={{ ...OMITIDO, estado: "completo", avisar: false }} />);
    expect(container.textContent).toBe("");
    rerender(<AvisoDeOnboarding recorrido={{ ...OMITIDO, aplica: false }} />);
    expect(container.textContent).toBe("");
    rerender(<AvisoDeOnboarding recorrido={null} />);
    expect(container.textContent).toBe("");
  });
});
