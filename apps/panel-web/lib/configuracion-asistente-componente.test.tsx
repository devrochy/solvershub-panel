// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { AsistenteDeConfiguracion } from "@/app/(app)/configuracion/_components/asistente-de-configuracion";
import { FeedbackProviders } from "@/components/ui/providers";
import { GUION_ATENCION, GUION_VOZ, CATALOGO_CON_ASISTENTE, PROPUESTA_DE_ATENCION, PROPUESTA_DE_VOZ } from "@/lib/testing/asistente-config";
import type { PropuestaAsistente } from "@/lib/api/types";
import { violacionesGraves } from "@/lib/testing/axe";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh, prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => "/configuracion",
  useSearchParams: () => new URLSearchParams(),
}));

const respuesta = (estado: number, cuerpo: unknown) => new Response(JSON.stringify(cuerpo), { status: estado });
// Lo que devuelve el BFF del panel (plano), no el cuerpo crudo del backend.
const errorDeApi = (code: string, message: string, fields?: Record<string, string>) => ({ error: message, code, ...(fields ? { fields } : {}) });

type Props = Partial<Parameters<typeof AsistenteDeConfiguracion>[0]>;
function montar(props: Props = {}) {
  const alAplicar = vi.fn();
  const alDescartar = vi.fn();
  render(
    <FeedbackProviders>
      <AsistenteDeConfiguracion
        guion={GUION_VOZ}
        catalogo={CATALOGO_CON_ASISTENTE}
        hayCambiosSinGuardar={false}
        onDescartar={alDescartar}
        onAplicado={alAplicar}
        {...props}
      />
    </FeedbackProviders>,
  );
  return { alAplicar, alDescartar };
}

const abrir = async () => {
  fireEvent.click(screen.getByRole("button", { name: "Ajustar con preguntas" }));
  return screen.findByRole("dialog");
};
const siguiente = (nombre = "Siguiente") => fireEvent.click(screen.getByRole("button", { name: nombre }));
const llamadas = (fetchMock: ReturnType<typeof vi.fn>) =>
  fetchMock.mock.calls.map(([url, init]) => ({ url: String(url), cuerpo: init?.body ? JSON.parse(String(init.body)) : undefined }));

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

describe("asistente por preguntas de Configuración", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    refresh.mockReset();
    window.localStorage.clear();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("abre en la primera pregunta: paso anunciado, barra de avance, ayuda por opción y foco en el título", async () => {
    montar();
    const dialogo = await abrir();
    expect(within(dialogo).getByText("Paso 1 de 3").getAttribute("aria-live")).toBe("polite");
    expect(within(dialogo).getByRole("progressbar", { name: "Avance del asistente" }).getAttribute("aria-valuetext")).toBe("Paso 1 de 3");
    const titulo = within(dialogo).getByRole("heading", { level: 3, name: "¿Cómo quieres que suene?" });
    await waitFor(() => expect(document.activeElement).toBe(titulo));
    const grupo = within(dialogo).getByRole("radiogroup", { name: "¿Cómo quieres que suene?" });
    expect(within(grupo).getAllByRole("radio").map((r) => r.getAttribute("aria-checked"))).toEqual(["false", "false"]);
    // La ayuda de cada opción sale del guion.
    expect(within(dialogo).getByText("«¡Hola! Cuéntame, ¿en qué te ayudo?»")).toBeTruthy();
    expect(within(dialogo).getByText("Si no eliges nada, esto se queda como está.")).toBeTruthy();
    // Nada se pidió al servidor todavía.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("al avanzar el foco pasa al título del paso nuevo; las de varias son casillas con nombre", async () => {
    montar();
    await abrir();
    fireEvent.click(screen.getByRole("radio", { name: /Cercano/ }));
    siguiente();
    const titulo = await screen.findByRole("heading", { level: 3, name: "¿Hay frases que nunca debe decir?" });
    await waitFor(() => expect(document.activeElement).toBe(titulo));
    expect(screen.getByText("Paso 2 de 3")).toBeTruthy();
    const grupo = screen.getByRole("group", { name: "¿Hay frases que nunca debe decir?" });
    expect(within(grupo).getAllByRole("checkbox").map((c) => c.getAttribute("aria-checked"))).toEqual(["false", "false"]);
    fireEvent.click(within(grupo).getByRole("checkbox", { name: "«gratis»" }));
    expect(within(grupo).getByRole("checkbox", { name: "«gratis»" }).getAttribute("aria-checked")).toBe("true");
    // Atrás conserva lo elegido.
    fireEvent.click(screen.getByRole("button", { name: "Atrás" }));
    await screen.findByRole("heading", { level: 3, name: "¿Cómo quieres que suene?" });
    expect(screen.getByRole("radio", { name: /Cercano/ }).getAttribute("aria-checked")).toBe("true");
  });

  it("no tiene violaciones graves de accesibilidad en una pregunta ni en la revisión", async () => {
    fetchMock.mockResolvedValue(respuesta(200, PROPUESTA_DE_VOZ));
    montar();
    await abrir();
    fireEvent.click(screen.getByRole("radio", { name: /Cercano/ }));
    expect(await violacionesGraves(document.body)).toEqual([]);
    siguiente();
    await screen.findByRole("heading", { level: 3, name: "¿Hay frases que nunca debe decir?" });
    expect(await violacionesGraves(document.body)).toEqual([]); // las casillas de las de varias
    siguiente("Ver los cambios");
    await screen.findByRole("list", { name: "Cambios propuestos" });
    expect(await violacionesGraves(document.body)).toEqual([]);
  });

  it("«Dejar como está» quita la respuesta y la pregunta no viaja", async () => {
    fetchMock.mockResolvedValue(respuesta(200, PROPUESTA_DE_VOZ));
    montar();
    await abrir();
    fireEvent.click(screen.getByRole("radio", { name: /Profesional/ }));
    fireEvent.click(screen.getByRole("button", { name: "Dejar como está" }));
    expect(screen.getByRole("radio", { name: /Profesional/ }).getAttribute("aria-checked")).toBe("false");
    siguiente();
    await screen.findByRole("heading", { level: 3, name: "¿Hay frases que nunca debe decir?" });
    fireEvent.click(screen.getByRole("checkbox", { name: "«gratis»" }));
    siguiente("Ver los cambios");
    await screen.findByText("Esto es lo que cambiaría", { exact: false });
    expect(llamadas(fetchMock)[0].cuerpo).toEqual({ respuestas: { prohibidas: ["gratis"] } });
  });

  it("la vista previa muestra cada cambio de ahora a quedaría, la marca de «a mano» y lo que no se cambia", async () => {
    fetchMock.mockResolvedValue(respuesta(200, PROPUESTA_DE_VOZ));
    montar();
    await abrir();
    fireEvent.click(screen.getByRole("radio", { name: /Cercano/ }));
    siguiente();
    await screen.findByRole("heading", { level: 3, name: "¿Hay frases que nunca debe decir?" });
    siguiente("Ver los cambios");

    const titulo = await screen.findByRole("heading", { level: 3, name: "Revisa los cambios" });
    await waitFor(() => expect(document.activeElement).toBe(titulo));
    expect(screen.getByText("Paso 3 de 3")).toBeTruthy();
    const lista = await screen.findByRole("list", { name: "Cambios propuestos" });
    const [tono, calidez] = within(lista).getAllByRole("listitem");
    expect(tono.textContent).toContain("Tono");
    expect(tono.textContent).toContain("Lo cambiaste a mano");
    expect(within(tono).getByText("Formal")).toBeTruthy(); // ahora
    expect(within(tono).getByText("Cercano")).toBeTruthy(); // quedaría
    expect(calidez.textContent).not.toContain("Lo cambiaste a mano");
    expect(calidez.textContent).toContain("3 puntos");
    expect(calidez.textContent).toContain("4 puntos");
    expect(screen.getByText("Esto no se cambiará")).toBeTruthy();
    expect(screen.getByText(/se cambia al publicar una versión del agente/)).toBeTruthy();
    expect(llamadas(fetchMock)[0]).toEqual({
      url: "/api/settings/asistente/voz/vista-previa",
      cuerpo: { respuestas: { tono: "cercano" } },
    });
    expect(screen.getByRole("button", { name: "Aplicar cambios" }).hasAttribute("disabled")).toBe(false);
  });

  it("aplicar manda las respuestas con la huella, avisa al formulario, cierra y olvida el avance", async () => {
    fetchMock.mockResolvedValueOnce(respuesta(200, PROPUESTA_DE_VOZ)).mockResolvedValueOnce(respuesta(200, PROPUESTA_DE_VOZ));
    const { alAplicar } = montar();
    await abrir();
    fireEvent.click(screen.getByRole("radio", { name: /Cercano/ }));
    siguiente();
    await screen.findByRole("heading", { level: 3, name: "¿Hay frases que nunca debe decir?" });
    siguiente("Ver los cambios");
    await screen.findByRole("list", { name: "Cambios propuestos" });
    expect(window.localStorage.getItem("configuracion-asistente:voz")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Aplicar cambios" }));
    await waitFor(() => expect(alAplicar).toHaveBeenCalledWith(PROPUESTA_DE_VOZ));
    expect(llamadas(fetchMock)[1]).toEqual({
      url: "/api/settings/asistente/voz/aplicar",
      cuerpo: { respuestas: { tono: "cercano" }, huella: "huella-1" },
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(await screen.findByText(/Listo: ajustamos tu configuración/)).toBeTruthy();
    expect(refresh).toHaveBeenCalled();
    expect(window.localStorage.getItem("configuracion-asistente:voz")).toBeNull();
  });

  it("409: avisa que la configuración cambió, no escribe, recalcula con las mismas respuestas y deja aplicar la nueva", async () => {
    const nueva: PropuestaAsistente = { ...PROPUESTA_DE_VOZ, huella: "huella-nueva", cambios: [PROPUESTA_DE_VOZ.cambios![1]] };
    fetchMock
      .mockResolvedValueOnce(respuesta(200, PROPUESTA_DE_VOZ))
      .mockResolvedValueOnce(respuesta(409, errorDeApi("conflict", "La configuración cambió mientras decidías: revisa los cambios de nuevo.")))
      .mockResolvedValueOnce(respuesta(200, nueva))
      .mockResolvedValueOnce(respuesta(200, nueva));
    const { alAplicar } = montar();
    await abrir();
    fireEvent.click(screen.getByRole("radio", { name: /Cercano/ }));
    siguiente();
    await screen.findByRole("heading", { level: 3, name: "¿Hay frases que nunca debe decir?" });
    siguiente("Ver los cambios");
    await screen.findByRole("list", { name: "Cambios propuestos" });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar cambios" }));

    const alerta = await screen.findByText(/La configuración cambió mientras decidías\. Revisa los cambios de nuevo\. No se aplicó nada/);
    expect(alerta.getAttribute("role")).toBe("alert");
    expect(alAplicar).not.toHaveBeenCalled();
    // Sigue en el último paso, con las mismas respuestas, y la lista ya es la nueva.
    await waitFor(() => expect(within(screen.getByRole("list", { name: "Cambios propuestos" })).getAllByRole("listitem")).toHaveLength(1));
    expect(llamadas(fetchMock)[2]).toEqual({ url: "/api/settings/asistente/voz/vista-previa", cuerpo: { respuestas: { tono: "cercano" } } });
    expect(screen.getByRole("heading", { level: 3, name: "Revisa los cambios" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Aplicar cambios" }));
    await waitFor(() => expect(alAplicar).toHaveBeenCalledWith(nueva));
    expect(llamadas(fetchMock)[3].cuerpo).toEqual({ respuestas: { tono: "cercano" }, huella: "huella-nueva" });
  });

  it("422: salta a la pregunta con el error y deja el mensaje junto a ella", async () => {
    fetchMock.mockResolvedValue(respuesta(422, errorDeApi("validation_error", "Revisa las respuestas marcadas.", { prohibidas: "Elige solo entre las opciones que se muestran." })));
    montar();
    await abrir();
    fireEvent.click(screen.getByRole("radio", { name: /Cercano/ }));
    siguiente();
    await screen.findByRole("heading", { level: 3, name: "¿Hay frases que nunca debe decir?" });
    siguiente("Ver los cambios");
    const alerta = await screen.findByText("Elige solo entre las opciones que se muestran.");
    expect(alerta.closest("[role]")?.getAttribute("role")).toBe("alert");
    expect(screen.getByRole("heading", { level: 3, name: "¿Hay frases que nunca debe decir?" })).toBeTruthy();
    expect(screen.getByText("Paso 2 de 3")).toBeTruthy();
  });

  it("un error del servidor en la vista previa se puede reintentar", async () => {
    fetchMock.mockResolvedValueOnce(respuesta(500, errorDeApi("internal", "No se pudo calcular."))).mockResolvedValueOnce(respuesta(200, PROPUESTA_DE_VOZ));
    montar();
    await abrir();
    fireEvent.click(screen.getByRole("radio", { name: /Cercano/ }));
    siguiente();
    await screen.findByRole("heading", { level: 3, name: "¿Hay frases que nunca debe decir?" });
    siguiente("Ver los cambios");
    expect((await screen.findByText("No se pudo calcular.")).closest("[role]")?.getAttribute("role")).toBe("alert");
    expect(screen.getByRole("button", { name: "Aplicar cambios" }).hasAttribute("disabled")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("list", { name: "Cambios propuestos" })).toBeTruthy();
  });

  it("si no cambia nada lo dice y no deja aplicar", async () => {
    fetchMock.mockResolvedValue(respuesta(200, { seccion: "voz", cambios: [], omitidos: [], huella: "x" }));
    montar();
    await abrir();
    fireEvent.click(screen.getByRole("radio", { name: /Cercano/ }));
    siguiente();
    await screen.findByRole("heading", { level: 3, name: "¿Hay frases que nunca debe decir?" });
    siguiente("Ver los cambios");
    expect(await screen.findByText("Con estas respuestas no cambia nada: tu configuración ya está así.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Aplicar cambios" }).hasAttribute("disabled")).toBe(true);
  });

  it("sin respuestas no hay nada que calcular: lo dice y no llama al servidor", async () => {
    montar();
    await abrir();
    siguiente();
    await screen.findByRole("heading", { level: 3, name: "¿Hay frases que nunca debe decir?" });
    siguiente("Ver los cambios");
    expect(await screen.findByText(/No respondiste ninguna pregunta/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Aplicar cambios" }).hasAttribute("disabled")).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("cerrar sin aplicar no escribe nada y deja el avance para retomarlo", async () => {
    montar();
    await abrir();
    fireEvent.click(screen.getByRole("radio", { name: /Cercano/ }));
    siguiente();
    await screen.findByRole("heading", { level: 3, name: "¿Hay frases que nunca debe decir?" });
    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(fetchMock).not.toHaveBeenCalled();
    expect(JSON.parse(window.localStorage.getItem("configuracion-asistente:voz") ?? "{}")).toEqual({ respuestas: { tono: "cercano" }, paso: 1 });

    // Al volver a abrir, retoma donde quedó.
    await abrir();
    expect(await screen.findByText(/Retomamos donde lo dejaste/)).toBeTruthy();
    expect(screen.getByRole("heading", { level: 3, name: "¿Hay frases que nunca debe decir?" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Empezar de nuevo" }));
    await screen.findByRole("heading", { level: 3, name: "¿Cómo quieres que suene?" });
    expect(screen.getByRole("radio", { name: /Cercano/ }).getAttribute("aria-checked")).toBe("false");
    expect(window.localStorage.getItem("configuracion-asistente:voz")).toBeNull();
  });

  it("si el almacenamiento del navegador está bloqueado, el asistente funciona igual", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    montar();
    await abrir();
    fireEvent.click(screen.getByRole("radio", { name: /Cercano/ }));
    siguiente();
    expect(await screen.findByRole("heading", { level: 3, name: "¿Hay frases que nunca debe decir?" })).toBeTruthy();
    vi.restoreAllMocks();
  });

  it("con cambios sin guardar pide confirmar antes de abrir; seguir editando no abre ni descarta", async () => {
    const { alDescartar } = montar({ hayCambiosSinGuardar: true });
    fireEvent.click(screen.getByRole("button", { name: "Ajustar con preguntas" }));
    const aviso = await screen.findByRole("alertdialog");
    expect(aviso.textContent).toContain("Tienes cambios sin guardar");
    expect(aviso.textContent).toContain("se pierden los cambios sin guardar");
    fireEvent.click(screen.getByRole("button", { name: "Seguir editando" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(alDescartar).not.toHaveBeenCalled();
  });

  it("aceptar el descarte deja el formulario como estaba guardado y abre el asistente", async () => {
    const { alDescartar } = montar({ hayCambiosSinGuardar: true });
    fireEvent.click(screen.getByRole("button", { name: "Ajustar con preguntas" }));
    await screen.findByRole("alertdialog");
    fireEvent.click(screen.getByRole("button", { name: "Descartar y abrir" }));
    expect(await screen.findByRole("dialog")).toBeTruthy();
    expect(alDescartar).toHaveBeenCalledTimes(1);
  });

  it("el guion de atención usa su propia sección y su propia clave de retoma", async () => {
    fetchMock.mockResolvedValue(respuesta(200, PROPUESTA_DE_ATENCION));
    montar({ guion: GUION_ATENCION });
    await abrir();
    fireEvent.click(screen.getByRole("radio", { name: /Lunes a viernes/ }));
    siguiente();
    await screen.findByRole("heading", { level: 3, name: "¿Qué hace cuando escriben fuera de horario?" });
    fireEvent.click(screen.getByRole("radio", { name: /Avisa y deja/ }));
    siguiente("Ver los cambios");
    const lista = await screen.findByRole("list", { name: "Cambios propuestos" });
    const [horario, , mensaje] = within(lista).getAllByRole("listitem");
    expect(horario.textContent).toContain("Siempre, sin horario");
    expect(horario.textContent).toContain("Lun a Vie 08:00–18:00");
    expect(mensaje.textContent).toContain("Volvemos mañana.");
    expect(mensaje.textContent).toContain("El aviso por defecto");
    expect(llamadas(fetchMock)[0]).toEqual({
      url: "/api/settings/asistente/atencion/vista-previa",
      cuerpo: { respuestas: { horario: "semana", fuera_de_horario: "avisa" } },
    });
    expect(window.localStorage.getItem("configuracion-asistente:atencion")).toBeTruthy();
    expect(window.localStorage.getItem("configuracion-asistente:voz")).toBeNull();
  });
});
