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

/** «Continuar» de la pregunta abierta (el de la última dice «Listo»). */
function continuar(texto: "Continuar" | "Listo" = "Continuar") {
  fireEvent.click(screen.getByRole("button", { name: texto }));
}

/** Responde las tres preguntas con lo que haya (lo recomendado, si no se tocó nada). */
async function responderTodo() {
  await screen.findByRole("heading", { name: "¿Qué hará tu agente?" });
  continuar();
  continuar();
  continuar("Listo");
}

const TONO = { persona_tone: "cercano" };

describe("bienvenida en 5 estaciones (HU-UX-25, HU-UX-27)", () => {
  it("arranca en «Tu negocio» a pantalla completa, con el logo arriba, el celular y sin violaciones graves", async () => {
    const { container } = montar();
    expect(await screen.findByRole("heading", { level: 1, name: "Arma a tu primer agente" })).toBeTruthy();
    expect(screen.getByText("Tres preguntas. Lo demás viene recomendado por SolversHub.")).toBeTruthy();
    expect(screen.getAllByText("Paso 1 de 5 · Tu negocio").length).toBeGreaterThan(0);
    // Las 5 estaciones de la ruta, en orden.
    const ruta = screen.getByRole("navigation", { name: "Estaciones de la bienvenida" });
    const estaciones = within(within(ruta).getAllByRole("list")[0]).getAllByRole("listitem").map((li) => li.textContent ?? "");
    expect(estaciones.map((t) => t.replace(/\(.*\)|actual|hecha|^\d/g, "").trim())).toEqual(
      expect.arrayContaining([expect.stringContaining("Tu negocio"), expect.stringContaining("Revisar y publicar")]),
    );
    expect(estaciones).toHaveLength(5);
    // El logo horizontal y «Seguir después» en el encabezado; el celular a la derecha (HU-UX-26).
    const encabezado = screen.getByRole("banner");
    expect(encabezado.querySelectorAll('img[src="/marca/horizontal-tema-oscuro.svg"]').length).toBe(1);
    expect(encabezado.querySelectorAll('img[src="/marca/horizontal-tema-claro.svg"]').length).toBe(1);
    expect(within(encabezado).getByRole("button", { name: "Seguir después" })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Seguir después" })).toHaveLength(1);
    expect(screen.getByRole("region", { name: "Vista previa del agente en el celular" })).toBeTruthy();
    expect(screen.queryByRole("complementary", { name: "Lo que gana tu agente" })).toBeNull();
    expect(await violacionesGraves(container)).toEqual([]);
    await waitFor(() => expect(llamadas.some((l) => l.url === "/api/onboarding/avanzar")).toBe(true));
    expect(llamadas.find((l) => l.url === "/api/onboarding/avanzar")?.cuerpo).toEqual({ paso: 1 });
  });

  it("pregunta una cosa a la vez, en orden: qué hará, cómo se llama y cómo se llama el negocio; el pie dice cuántas faltan", async () => {
    montar();
    expect(await screen.findByText("Pregunta 1 de 3")).toBeTruthy();
    const titulos = () => screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(titulos()).toEqual([
      "¿Qué hará tu agente?",
      expect.stringContaining("¿Cómo se llama?"),
      expect.stringContaining("¿Cómo se llama tu negocio?"),
    ]);
    expect(screen.getByText("Faltan 3 preguntas")).toBeTruthy();
    // Mientras falten preguntas no se crea el agente.
    expect((screen.getByRole("button", { name: /Crear a Laura y seguir/ }) as HTMLButtonElement).disabled).toBe(true);
    continuar();
    expect(screen.getByText("Pregunta 2 de 3")).toBeTruthy();
    expect(screen.getByText("Faltan 2 preguntas")).toBeTruthy();
    // El foco pasa al título de la que se abre.
    expect(document.activeElement?.textContent).toBe("¿Cómo se llama?");
    continuar();
    expect((screen.getByLabelText(/Nombre de tu negocio/) as HTMLInputElement).value).toBe("Sport Plus");
    expect(screen.getByText("Falta 1 pregunta")).toBeTruthy();
    continuar("Listo");
    expect(screen.queryByText(/Falta/)).toBeNull();
    expect((screen.getByRole("button", { name: /Crear a Laura y seguir/ }) as HTMLButtonElement).disabled).toBe(false);
    // Las respondidas quedan en una línea con lo elegido.
    expect(screen.getByRole("region", { name: /¿Qué hará tu agente\?, respondida/ }).textContent).toContain("Vendo productos");
    expect(screen.getByRole("region", { name: /¿Cómo se llama\?, respondida/ }).textContent).toContain("Laura");
  });

  it("llega con lo recomendado: «Vendo productos», «Laura» con ideas y, en avanzadas, el largo, el tono y la frase del tipo", async () => {
    montar();
    const ventas = (await screen.findByRole("radio", { name: /Vendo productos/ })) as HTMLInputElement;
    expect(ventas.checked).toBe(true);
    expect(ventas.closest("label")?.parentElement?.textContent).toContain("Recomendado");
    expect(screen.getByText("Todo viene con lo recomendado por SolversHub")).toBeTruthy();
    expect(screen.queryByRole("textbox", { name: /producto/i })).toBeNull();
    continuar();
    expect((screen.getByLabelText(/Nombre de tu agente/) as HTMLInputElement).value).toBe("Laura");
    const ideas = within(screen.getByRole("radiogroup", { name: "Ideas de nombre" })).getAllByRole("radio") as HTMLInputElement[];
    expect(ideas.map((r) => r.value)).toEqual(["Laura", "Sofía", "Vera", "Mateo"]);
    // «Opciones avanzadas», plegada al final, con su línea.
    expect(screen.getByText("Largo de las respuestas, tono de voz y la frase de tu negocio.")).toBeTruthy();
    expect((screen.getByRole("radio", { name: /Normales/ }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole("radio", { name: /Cercano/ }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText(/Cuéntanos en una frase/) as HTMLTextAreaElement).value).toBe(fraseDelTipo("ventas"));
  });

  it("cambiar el tipo cambia la frase si no la editó; si la editó, la respeta, y «Usar lo recomendado» vuelve a todo", async () => {
    montar();
    fireEvent.click(await screen.findByRole("radio", { name: /Agendo citas/ }));
    const frase = screen.getByLabelText(/Cuéntanos en una frase/) as HTMLTextAreaElement;
    expect(frase.value).toBe(fraseDelTipo("agenda"));
    expect(screen.getByText(/1 cambio/)).toBeTruthy();
    fireEvent.change(frase, { target: { value: "Clases de panadería con cita previa" } });
    fireEvent.click(screen.getByRole("radio", { name: /Cobro cartera/ }));
    expect(frase.value).toBe("Clases de panadería con cita previa");
    fireEvent.click(screen.getByRole("radio", { name: /Profesional/ }));
    fireEvent.click(screen.getByRole("radio", { name: /Cortas/ }));
    expect(screen.getByText(/4 cambios/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Usar lo recomendado/ }));
    expect((screen.getByRole("radio", { name: /Vendo productos/ }) as HTMLInputElement).checked).toBe(true);
    expect(frase.value).toBe(fraseDelTipo("ventas"));
    expect((screen.getByRole("radio", { name: /Cercano/ }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole("radio", { name: /Normales/ }) as HTMLInputElement).checked).toBe(true);
  });

  it("«Cambiar» reabre una respondida con lo elegido y conserva las demás respuestas", async () => {
    montar();
    await responderTodo();
    fireEvent.click(screen.getByRole("button", { name: "Cambiar: ¿Qué hará tu agente?" }));
    expect(document.activeElement?.textContent).toBe("¿Qué hará tu agente?");
    expect((screen.getByRole("radio", { name: /Vendo productos/ }) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole("radio", { name: /Agendo citas/ }));
    continuar();
    expect((screen.getByLabelText(/Nombre de tu agente/) as HTMLInputElement).value).toBe("Laura");
    continuar();
    expect((screen.getByLabelText(/Nombre de tu negocio/) as HTMLInputElement).value).toBe("Sport Plus");
  });

  it("el chat del celular es simulado: saluda con el nombre del tipo elegido sin llamar al servidor", async () => {
    montar();
    const telefono = (await screen.findAllByRole("region", { name: "Vista previa en WhatsApp" }))[0];
    expect(telefono.textContent).toContain("Hola, soy Laura, de Sport Plus.");
    const antes = llamadas.length;
    fireEvent.click(within(telefono).getByRole("button", { name: "¿Quién eres?" }));
    expect(llamadas.length).toBe(antes);
    continuar();
    fireEvent.click(screen.getByRole("radio", { name: "Sofía" }));
    expect(screen.getAllByRole("region", { name: "Vista previa en WhatsApp" })[0].textContent).toContain("Hola, soy Sofía, de Sport Plus.");
  });

  it("sin nombre no deja continuar, y el celular dice «tu agente» en minúscula", async () => {
    montar();
    continuar();
    fireEvent.change(await screen.findByLabelText(/Nombre de tu agente/), { target: { value: " " } });
    expect(screen.getAllByText("Ponle un nombre para seguir").length).toBeGreaterThan(0);
    expect((screen.getByRole("button", { name: "Continuar" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getAllByRole("region", { name: "Vista previa en WhatsApp" })[0].textContent).toContain("Hola, soy tu agente, de Sport Plus.");
    expect((screen.getByRole("button", { name: /Crear mi agente y seguir/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(llamadas.some((l) => l.url === "/api/onboarding/identidad")).toBe(false);
  });

  it("sin frase no crea: avisa y abre «Opciones avanzadas», donde está", async () => {
    montar();
    await responderTodo();
    fireEvent.change(screen.getByLabelText(/Cuéntanos en una frase/), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /Crear a Laura y seguir/ }));
    expect((await screen.findAllByRole("alert")).some((a) => /frase/.test(a.textContent ?? ""))).toBe(true);
    expect((screen.getByText("Opciones avanzadas").closest("details") as HTMLDetailsElement).open).toBe(true);
    expect(llamadas.some((l) => l.url === "/api/agent-editor/from-script")).toBe(false);
  });

  it("un tipo que el servicio no trae sale deshabilitado y se recomienda el primero disponible", async () => {
    montar(PENDIENTE, { disponibles: ["agenda"] });
    const ventas = (await screen.findByRole("radio", { name: /Vendo productos/ })) as HTMLInputElement;
    expect(ventas.disabled).toBe(true);
    expect((screen.getByRole("radio", { name: /Agendo citas/ }) as HTMLInputElement).checked).toBe(true);
    expect(screen.getAllByText(/No está en tu servicio por ahora/).length).toBeGreaterThan(0);
  });

  it("«Seguir después» confirma con los textos de la ruta, guarda en el negocio y vuelve a Inicio", async () => {
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
      cambios: { business_description: `Sport Plus. ${fraseDelTipo("ventas")}`, assistant_name: "Laura", ...TONO },
    });
  });

  it("«Seguir después» con algo que falta no guarda en el negocio, pero igual deja para después", async () => {
    montar();
    continuar();
    fireEvent.change(await screen.findByLabelText(/Nombre de tu agente/), { target: { value: "" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Seguir después" })[0]);
    fireEvent.click(await screen.findByRole("button", { name: "Terminar después" }));
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith("/dashboard"));
    expect(llamadas.some((l) => l.url === "/api/onboarding/identidad")).toBe(false);
  });

  it("al volver a «Tu negocio» tras omitir en una estación posterior no retrocede el recorrido y el tipo es el del agente", async () => {
    montar({ ...OMITIDO, paso: 4, agente_id: "a-9" }, { tipoDelAgente: "agenda" });
    // Con el agente creado llegan todas respondidas.
    expect((await screen.findByRole("region", { name: /¿Qué hará tu agente\?, respondida/ })).textContent).toContain("Agendo citas");
    fireEvent.click(screen.getByRole("button", { name: "Cambiar: ¿Qué hará tu agente?" }));
    expect((screen.getByRole("radio", { name: /Agendo citas/ }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole("radio", { name: /Vendo productos/ }) as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByText("Tu agente ya está creado como «Agendo citas».")).toBeTruthy();
    expect((screen.getByLabelText(/Cuéntanos en una frase/) as HTMLTextAreaElement).value).toBe(fraseDelTipo("agenda"));
    await waitFor(() => expect(llamadas.find((l) => l.url === "/api/onboarding/avanzar")?.cuerpo).toEqual({ paso: 4 }));
  });

  it("al salir de «Tu negocio» guarda el negocio, el tono y el agente (con el largo), lo crea, lo deja listo y sigue en Habilidades", async () => {
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
    // En avanzadas: un tono y un largo distintos de lo recomendado.
    fireEvent.click(await screen.findByRole("radio", { name: /Relajado/ }));
    fireEvent.click(screen.getByRole("radio", { name: /Cortas/ }));
    await responderTodo();
    fireEvent.click(screen.getByRole("button", { name: /Crear a Laura y seguir/ }));
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith("/bienvenida/agente/a-1"));
    expect(llamadas.find((l) => l.url === "/api/onboarding/identidad")?.cuerpo).toEqual({
      cambios: { business_description: `Sport Plus. ${fraseDelTipo("ventas")}`, assistant_name: "Laura", persona_tone: "informal" },
    });
    expect(llamadas.find((l) => l.url === "/api/agent-editor/from-script")?.cuerpo).toEqual({
      template_key: "ventas",
      answers: { largo_respuesta: "cortas" },
      name: "Laura",
    });
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
    fireEvent.click(await screen.findByRole("button", { name: "Cambiar: ¿Cómo se llama?" }));
    fireEvent.change(screen.getByLabelText(/Nombre de tu agente/), { target: { value: "Vera" } });
    continuar();
    continuar("Listo");
    // No se crea otro agente: el botón guarda y el pie dice a qué estación vuelve.
    expect(screen.getByText("Sigue: Datos del cliente.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Guardar y seguir" }));
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith("/bienvenida/agente/a-9"));
    expect(llamadas.some((l) => l.url === "/api/agent-editor/from-script")).toBe(false);
    expect(llamadas.find((l) => l.url === "/api/agent-editor/a-9")?.cuerpo).toEqual({ name: "Vera" });
    // Vuelve a donde iba (estación 3), no a «Habilidades».
    expect(llamadas.filter((l) => l.url === "/api/onboarding/avanzar").pop()?.cuerpo).toEqual({ paso: 3 });
  });

  it("al retomar recuerda lo que el dueño escribió en esta estación y la pregunta en la que iba", async () => {
    window.localStorage.setItem(
      "sh-onboarding:n-1",
      JSON.stringify({
        tipo: "agenda",
        negocio: "La Espiga",
        descripcion: "Clases con cita previa",
        nombreDelAgente: "Tomás",
        tono: "formal",
        largo: "detalladas",
        abierta: 2,
      }),
    );
    montar();
    expect(await screen.findByText("Pregunta 3 de 3")).toBeTruthy();
    expect(screen.getByRole("region", { name: /¿Qué hará tu agente\?, respondida/ }).textContent).toContain("Agendo citas");
    expect(screen.getByRole("region", { name: /¿Cómo se llama\?, respondida/ }).textContent).toContain("Tomás");
    expect((screen.getByLabelText(/Nombre de tu negocio/) as HTMLInputElement).value).toBe("La Espiga");
    expect((screen.getByLabelText(/Cuéntanos en una frase/) as HTMLTextAreaElement).value).toBe("Clases con cita previa");
    expect((screen.getByRole("radio", { name: /Profesional/ }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole("radio", { name: /Detalladas/ }) as HTMLInputElement).checked).toBe(true);
  });

  it("guarda en el borrador local la pregunta abierta al continuar", async () => {
    montar();
    await screen.findByText("Pregunta 1 de 3");
    continuar();
    expect(JSON.parse(window.localStorage.getItem("sh-onboarding:n-1") ?? "{}")).toMatchObject({ abierta: 1, tipo: "ventas" });
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
