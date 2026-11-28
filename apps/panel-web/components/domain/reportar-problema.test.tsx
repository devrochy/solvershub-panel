// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ReportarProblema } from "@/components/domain/reportar-problema";
import type { FeedbackCatalogo } from "@/lib/api/types";
import { EVENTO_REPORTAR } from "@/lib/feedback";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/conversaciones",
}));

const CATALOGO: FeedbackCatalogo = {
  tipos: [
    { clave: "error", etiqueta: "Error" },
    { clave: "mejora", etiqueta: "Mejora" },
    { clave: "idea", etiqueta: "Idea" },
  ],
  areas: [
    { clave: "conversations", etiqueta: "Conversaciones" },
    { clave: "agents", etiqueta: "Agentes" },
    { clave: "otra", etiqueta: "Otra" },
  ],
  limites: {
    max_adjuntos: 5,
    max_bytes_por_archivo: 8 * 1024 * 1024,
    max_bytes_total: 25 * 1024 * 1024,
    mimetypes: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
  },
};

const REPORTE = { id: "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b", estado: "recibido" };
const fetchMock = vi.fn();

// jsdom no trae ResizeObserver, que usa el grupo de opciones de Radix.
class ResizeObserverFalso {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", ResizeObserverFalso);
  // El `URL` de Node no acepta el `File` de jsdom: la miniatura usa uno de mentira.
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:captura");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  refresh.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function abrir() {
  act(() => {
    window.dispatchEvent(new Event(EVENTO_REPORTAR));
  });
  return screen.getByRole("dialog", { name: "Reportar un problema" });
}

function llenar() {
  fireEvent.click(screen.getByRole("radio", { name: /Error/ }));
  fireEvent.change(screen.getByLabelText(/^Título/), { target: { value: "El chat no carga" } });
  fireEvent.change(screen.getByLabelText(/^Descripción/), { target: { value: "Abro un chat y queda en blanco." } });
}

function claveDe(llamada: number): string {
  const [, init] = fetchMock.mock.calls[llamada] as [string, RequestInit];
  return (init.headers as Record<string, string>)["Idempotency-Key"];
}

describe("Reportar un problema", () => {
  it("se abre con el evento del menú y preselecciona el área de la página", () => {
    render(<ReportarProblema catalogo={CATALOGO} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    abrir();
    expect((screen.getByLabelText(/¿En qué parte del panel\?/) as HTMLSelectElement).value).toBe("conversations");
  });

  it("valida antes de enviar y no llama al BFF", () => {
    render(<ReportarProblema catalogo={CATALOGO} />);
    abrir();
    fireEvent.click(screen.getByRole("button", { name: "Enviar reporte" }));
    expect(screen.getByText("Elige si es un error, una mejora o una idea.")).toBeTruthy();
    expect(screen.getByText("Escribe un título de al menos 3 caracteres.")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("pega una captura con Ctrl+V y la envía en multipart con su Idempotency-Key", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(REPORTE), { status: 201 }));
    render(<ReportarProblema catalogo={CATALOGO} />);
    const dialogo = abrir();
    llenar();
    const captura = new File([new Uint8Array([137, 80, 78, 71])], "image.png", { type: "image/png" });
    fireEvent.paste(dialogo.querySelector("form")!, {
      clipboardData: { items: [{ kind: "file", getAsFile: () => captura }] },
    });
    expect(screen.getByRole("list", { name: "Adjuntos" }).textContent).toContain("image.png");

    fireEvent.click(screen.getByRole("button", { name: "Enviar reporte" }));
    await screen.findByText("Recibimos tu reporte. Te avisaremos cuando lo revisemos.");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/feedback/reports");
    expect(claveDe(0)).toMatch(/^[A-Za-z0-9_.:-]{8,128}$/);
    const body = init.body as FormData;
    expect(body.get("tipo")).toBe("error");
    expect(body.get("area")).toBe("conversations");
    expect(body.get("titulo")).toBe("El chat no carga");
    expect((body.getAll("adjuntos")[0] as File).name).toBe("image.png");
    expect(screen.getByRole("link", { name: "Ver el reporte" }).getAttribute("href")).toBe(`/reportes/${REPORTE.id}`);
    expect(refresh).toHaveBeenCalled();
  });

  it("un 429 dice cuándo reintentar y el reintento repite la misma clave", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Demasiados.", code: "demasiados_reportes" }), {
          status: 429,
          headers: { "Retry-After": "600" },
        }),
      )
      .mockRejectedValueOnce(new TypeError("red caída"))
      .mockResolvedValueOnce(new Response(JSON.stringify(REPORTE), { status: 200 }));
    render(<ReportarProblema catalogo={CATALOGO} />);
    abrir();
    llenar();
    fireEvent.click(screen.getByRole("button", { name: "Enviar reporte" }));
    await screen.findByText("Enviaste varios reportes seguidos. Vuelve a intentarlo en 10 minutos.");

    fireEvent.click(screen.getByRole("button", { name: "Enviar reporte" }));
    await screen.findByText(/no se duplicará/);

    // El tercero es el replay: 200 con el mismo reporte, y se muestra como enviado.
    fireEvent.click(screen.getByRole("button", { name: "Enviar reporte" }));
    await screen.findByText(/Recibimos tu reporte/);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(claveDe(1)).toBe(claveDe(0));
    expect(claveDe(2)).toBe(claveDe(0));
  });

  it("un 422 de validación marca su campo y un 413 lo explica", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "Área desconocida.", code: "area_invalida" }), { status: 422 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "x", code: "adjuntos_muy_grandes" }), { status: 413 }));
    render(<ReportarProblema catalogo={CATALOGO} />);
    abrir();
    llenar();
    fireEvent.click(screen.getByRole("button", { name: "Enviar reporte" }));
    // El mensaje queda junto a su campo, no repetido abajo.
    expect((await screen.findAllByText("Área desconocida.")).length).toBe(1);
    fireEvent.click(screen.getByRole("button", { name: "Enviar reporte" }));
    await screen.findByText("Los adjuntos pesan demasiado en total. Quita alguno y vuelve a enviar.");
  });

  it("cada apertura del formulario estrena clave", async () => {
    fetchMock.mockImplementation(async () => new Response(JSON.stringify(REPORTE), { status: 201 }));
    render(<ReportarProblema catalogo={CATALOGO} />);
    abrir();
    llenar();
    fireEvent.click(screen.getByRole("button", { name: "Enviar reporte" }));
    fireEvent.click(await screen.findByRole("button", { name: "Listo" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    abrir();
    llenar();
    fireEvent.click(screen.getByRole("button", { name: "Enviar reporte" }));
    await screen.findByText(/Recibimos tu reporte/);
    expect(claveDe(1)).not.toBe(claveDe(0));
  });
});
