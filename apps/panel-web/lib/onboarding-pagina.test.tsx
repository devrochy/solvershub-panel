// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const nav = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => nav,
  usePathname: () => "/bienvenida",
}));

import { AvisoDeOnboarding } from "@/components/domain/aviso-de-onboarding";
import { FeedbackProviders } from "@/components/ui/providers";
import type { PrimerosPasos } from "@/lib/api/types";
import { fraseDelTipo } from "@/lib/onboarding";
import { violacionesGraves } from "@/lib/testing/axe";
import { ajustes } from "@/lib/testing/fixtures";

import { RecorridoDeBienvenida } from "@/app/(onboarding)/bienvenida/_components/recorrido";

type Recorrido = PrimerosPasos["recorrido"];

const PENDIENTE: Recorrido = { estado: "pendiente", paso: 1, total_pasos: 5, aplica: true, abrir: true, avisar: false };
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
  nav.push.mockClear();
});

describe("bienvenida en 5 estaciones (HU-UX-25)", () => {
  it("arranca en «Tu negocio» a pantalla completa, con el escenario, el logo actual y sin violaciones graves", async () => {
    const { container } = montar();
    expect(await screen.findByRole("heading", { level: 1, name: "Cuéntanos de tu negocio" })).toBeTruthy();
    expect(screen.getAllByText("Paso 1 de 5 · Tu negocio").length).toBeGreaterThan(0);
    // Las 5 estaciones de la ruta, en orden.
    const ruta = screen.getByRole("navigation", { name: "Estaciones de la bienvenida" });
    const estaciones = within(within(ruta).getAllByRole("list")[0]).getAllByRole("listitem").map((li) => li.textContent ?? "");
    expect(estaciones.map((t) => t.replace(/\(.*\)|actual|hecha|^\d/g, "").trim())).toEqual(
      expect.arrayContaining([expect.stringContaining("Tu negocio"), expect.stringContaining("Revisar y publicar")]),
    );
    expect(estaciones).toHaveLength(5);
    // El escenario a la izquierda con el logo horizontal; en el celular, la franja con el simple.
    expect(screen.getByRole("complementary", { name: "Lo que gana tu agente" })).toBeTruthy();
    expect(container.querySelectorAll('img[src="/marca/horizontal-tema-oscuro.svg"]').length).toBe(1);
    expect(container.querySelectorAll('img[src="/marca/horizontal-simple-tema-oscuro.svg"]').length).toBe(1);
    expect(screen.getAllByRole("button", { name: "Seguir después" }).length).toBeGreaterThan(0);
    expect(await violacionesGraves(container)).toEqual([]);
    await waitFor(() => expect(llamadas.some((l) => l.url === "/api/onboarding/avanzar")).toBe(true));
    expect(llamadas.find((l) => l.url === "/api/onboarding/avanzar")?.cuerpo).toEqual({ paso: 1 });
  });

  it("llega con lo recomendado: «Vendo productos», «Laura» con ideas y la frase del tipo, sin pedir producto", async () => {
    montar();
    const ventas = (await screen.findByRole("radio", { name: /Vendo productos/ })) as HTMLInputElement;
    expect(ventas.checked).toBe(true);
    expect(ventas.closest("label")?.parentElement?.textContent).toContain("Recomendado");
    expect((screen.getByLabelText(/Nombre de tu agente/) as HTMLInputElement).value).toBe("Laura");
    const ideas = within(screen.getByRole("radiogroup", { name: "Ideas de nombre" })).getAllByRole("radio") as HTMLInputElement[];
    expect(ideas.map((r) => r.value)).toEqual(["Laura", "Sofía", "Vera", "Mateo"]);
    expect((screen.getByLabelText(/Cuéntanos en una frase/) as HTMLTextAreaElement).value).toBe(fraseDelTipo("ventas"));
    expect(screen.getByText("Todo viene con lo recomendado por SolversHub")).toBeTruthy();
    expect(screen.queryByRole("textbox", { name: /producto/i })).toBeNull();
    expect(screen.getByRole("button", { name: /Crear a Laura y seguir/ })).toBeTruthy();
  });

  it("cambiar el tipo cambia la frase si no la editó; si la editó, la respeta, y «Usar lo recomendado» vuelve", async () => {
    montar();
    fireEvent.click(await screen.findByRole("radio", { name: /Agendo citas/ }));
    const frase = screen.getByLabelText(/Cuéntanos en una frase/) as HTMLTextAreaElement;
    expect(frase.value).toBe(fraseDelTipo("agenda"));
    expect(screen.getByText(/1 cambio/)).toBeTruthy();
    fireEvent.change(frase, { target: { value: "Clases de panadería con cita previa" } });
    fireEvent.click(screen.getByRole("radio", { name: /Cobro cartera/ }));
    expect(frase.value).toBe("Clases de panadería con cita previa");
    fireEvent.click(screen.getByRole("button", { name: /Usar lo recomendado/ }));
    expect((screen.getByRole("radio", { name: /Vendo productos/ }) as HTMLInputElement).checked).toBe(true);
    expect(frase.value).toBe(fraseDelTipo("ventas"));
  });

  it("el chat del escenario es simulado: responde con el nombre sin llamar al servidor", async () => {
    montar();
    const telefono = (await screen.findAllByRole("region", { name: "Vista previa en WhatsApp" }))[0];
    expect(telefono.textContent).toContain("Hola, soy Laura, de Sport Plus.");
    const antes = llamadas.length;
    fireEvent.click(within(telefono).getByRole("button", { name: "¿Quién eres?" }));
    expect(llamadas.length).toBe(antes);
  });

  it("no deja seguir sin nombre del agente y dice qué falta", async () => {
    montar();
    fireEvent.change(await screen.findByLabelText(/Nombre de tu agente/), { target: { value: " " } });
    fireEvent.click(screen.getByRole("button", { name: /Crear mi agente y seguir/ }));
    expect((await screen.findAllByRole("alert")).some((a) => /nombre/.test(a.textContent ?? ""))).toBe(true);
    expect(llamadas.some((l) => l.url === "/api/onboarding/identidad")).toBe(false);
  });

  it("un tipo que el servicio no trae sale deshabilitado y se recomienda el primero disponible", async () => {
    montar(PENDIENTE, { disponibles: ["agenda"] });
    const ventas = (await screen.findByRole("radio", { name: /Vendo productos/ })) as HTMLInputElement;
    expect(ventas.disabled).toBe(true);
    expect((screen.getByRole("radio", { name: /Agendo citas/ }) as HTMLInputElement).checked).toBe(true);
    expect(screen.getAllByText(/No está en tu servicio por ahora/).length).toBeGreaterThan(0);
  });

  it("«Seguir después» confirma con los textos de la ruta, avisa al servidor y vuelve a Inicio", async () => {
    montar();
    fireEvent.click((await screen.findAllByRole("button", { name: "Seguir después" }))[0]);
    expect(await screen.findByText("Laura no atiende hasta que termines.")).toBeTruthy();
    expect(screen.getByText("Lo que llevas queda guardado y retomas aquí desde Inicio.")).toBeTruthy();
    expect(llamadas.some((l) => l.url === "/api/onboarding/omitir")).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Terminar después" }));
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith("/dashboard"));
    // Lo que lleva queda guardado en el negocio (no solo en este navegador) antes de dejarlo para después.
    const urls = llamadas.map((l) => l.url);
    expect(urls.indexOf("/api/onboarding/identidad")).toBeGreaterThanOrEqual(0);
    expect(urls.indexOf("/api/onboarding/identidad")).toBeLessThan(urls.indexOf("/api/onboarding/omitir"));
    expect(llamadas.find((l) => l.url === "/api/onboarding/identidad")?.cuerpo).toEqual({
      cambios: { business_description: `Sport Plus. ${fraseDelTipo("ventas")}`, assistant_name: "Laura" },
    });
  });

  it("«Seguir después» con algo que falta no guarda en el negocio, pero igual deja para después", async () => {
    montar();
    fireEvent.change(await screen.findByLabelText(/Nombre de tu agente/), { target: { value: "" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Seguir después" })[0]);
    fireEvent.click(await screen.findByRole("button", { name: "Terminar después" }));
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith("/dashboard"));
    expect(llamadas.some((l) => l.url === "/api/onboarding/identidad")).toBe(false);
  });

  it("al volver a «Tu negocio» tras omitir en una estación posterior no retrocede el recorrido y el tipo es el del agente", async () => {
    montar({ ...OMITIDO, paso: 4, agente_id: "a-9" }, { tipoDelAgente: "agenda" });
    expect(((await screen.findByRole("radio", { name: /Agendo citas/ })) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole("radio", { name: /Vendo productos/ }) as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByText("Tu agente ya está creado como «Agendo citas».")).toBeTruthy();
    expect((screen.getByLabelText(/Cuéntanos en una frase/) as HTMLTextAreaElement).value).toBe(fraseDelTipo("agenda"));
    await waitFor(() => expect(llamadas.find((l) => l.url === "/api/onboarding/avanzar")?.cuerpo).toEqual({ paso: 4 }));
  });

  it("al salir de «Tu negocio» guarda el negocio y el agente, lo crea, lo deja listo y sigue en Habilidades", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string, init?: RequestInit) => {
        llamadas.push({ url, cuerpo: init?.body ? JSON.parse(String(init.body)) : null });
        if (url === "/api/agent-editor/from-script") return respuesta({ agentId: "a-1" });
        if (url === "/api/onboarding/dejar-listo") {
          return respuesta({ conexion_id: "c-1", listo: true, pasos: [], recorrido: { ...PENDIENTE, estado: "en_curso", paso: 2, agente_id: "a-1" } });
        }
        if (url === "/api/onboarding/avanzar") return respuesta({ ...PENDIENTE, estado: "en_curso" });
        return respuesta({ ok: true });
      }),
    );
    montar({ ...PENDIENTE, estado: "en_curso" });
    // Con lo recomendado basta: «Guardar y seguir» sin tocar nada.
    fireEvent.click(await screen.findByRole("button", { name: /Crear a Laura y seguir/ }));
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith("/bienvenida/agente/a-1"));
    expect(llamadas.find((l) => l.url === "/api/onboarding/identidad")?.cuerpo).toEqual({
      cambios: { business_description: `Sport Plus. ${fraseDelTipo("ventas")}`, assistant_name: "Laura" },
    });
    expect(llamadas.find((l) => l.url === "/api/agent-editor/from-script")?.cuerpo).toMatchObject({ template_key: "ventas", name: "Laura" });
    expect(llamadas.find((l) => l.url === "/api/onboarding/dejar-listo")?.cuerpo).toEqual({ agent_id: "a-1" });
    expect(llamadas.filter((l) => l.url === "/api/onboarding/avanzar").pop()?.cuerpo).toEqual({ paso: 2 });
  });

  it("al volver a «Tu negocio» con el agente ya creado no crea otro: lo renombra, lo deja listo y retoma donde iba", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string, init?: RequestInit) => {
        llamadas.push({ url, cuerpo: init?.body ? JSON.parse(String(init.body)) : null });
        if (url === "/api/onboarding/dejar-listo") return respuesta({ conexion_id: "c-1", listo: true, pasos: [], recorrido: PENDIENTE });
        return respuesta({ ok: true });
      }),
    );
    montar({ ...PENDIENTE, estado: "en_curso", paso: 3, agente_id: "a-9" });
    fireEvent.change(await screen.findByLabelText(/Nombre de tu agente/), { target: { value: "Vera" } });
    // No se crea otro agente: el botón guarda y el pie dice a qué estación vuelve.
    expect(screen.getByText("Sigue: Datos del cliente.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Guardar y seguir" }));
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith("/bienvenida/agente/a-9"));
    expect(llamadas.some((l) => l.url === "/api/agent-editor/from-script")).toBe(false);
    expect(llamadas.find((l) => l.url === "/api/agent-editor/a-9")?.cuerpo).toEqual({ name: "Vera" });
    // Vuelve a donde iba (estación 3), no a «Habilidades».
    expect(llamadas.filter((l) => l.url === "/api/onboarding/avanzar").pop()?.cuerpo).toEqual({ paso: 3 });
  });

  it("al retomar recuerda lo que el dueño escribió en esta estación", async () => {
    window.localStorage.setItem(
      "sh-onboarding:n-1",
      JSON.stringify({ tipo: "agenda", negocio: "La Espiga", descripcion: "Clases con cita previa", nombreDelAgente: "Tomás" }),
    );
    montar();
    expect(((await screen.findByRole("radio", { name: /Agendo citas/ })) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText(/Nombre de tu agente/) as HTMLInputElement).value).toBe("Tomás");
    expect((screen.getByLabelText(/Cuéntanos en una frase/) as HTMLTextAreaElement).value).toBe("Clases con cita previa");
  });
});

describe("aviso del primer uso", () => {
  it("se ve mientras el recorrido está saltado, con cuántos pasos faltan y cómo retomarlo", () => {
    render(<AvisoDeOnboarding recorrido={OMITIDO} />);
    expect(screen.getByRole("status").textContent).toContain("Tu agente aún no está listo para responder. Faltan 3 de 5 pasos.");
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
