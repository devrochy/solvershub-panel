// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { TableroEmbudo } from "@/components/domain/cliente/tablero-embudo";
import type { ColumnaDeEmbudo, TarjetaDeEmbudo } from "@/lib/embudo";
import { getToasts, resetToasts } from "@/lib/toast-store";

// HU-CRM-24: tablero de embudo: columnas con cantidad y suma, mover una tarjeta (arrastrando o con el menú
// «Mover a…»), motivo al perder, reversa si el servidor rechaza, «Ver más» y solo lectura.

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh, push: vi.fn() }),
}));

class ResizeObserverFalso {
  observe() {}
  unobserve() {}
  disconnect() {}
}
const fetchMock = vi.fn();

beforeEach(() => {
  refresh.mockReset();
  fetchMock.mockReset();
  resetToasts();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("ResizeObserver", ResizeObserverFalso);
  window.HTMLElement.prototype.hasPointerCapture = () => false;
  window.HTMLElement.prototype.releasePointerCapture = () => undefined;
  window.HTMLElement.prototype.setPointerCapture = () => undefined;
  window.HTMLElement.prototype.scrollIntoView = () => undefined;
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const tarjeta = (id: string, nombre: string, extra: Partial<TarjetaDeEmbudo> = {}): TarjetaDeEmbudo => ({
  id,
  nombre,
  puntaje: null,
  valor: null,
  actividad: null,
  vencido: false,
  href: `/leads?cliente=${id}&agente=ventas`,
  ...extra,
});

const columna = (value: string, label: string, tarjetas: TarjetaDeEmbudo[], extra: Partial<ColumnaDeEmbudo> = {}): ColumnaDeEmbudo => ({
  value,
  label,
  total: tarjetas.length,
  suma: tarjetas.reduce((s, t) => s + (t.valor ?? 0), 0),
  tarjetas,
  entraron: [],
  hayMas: false,
  ...extra,
});

const MOTIVOS = [
  { value: "precio", label: "Precio" },
  { value: "otro", label: "Otro" },
];

const CONSULTA = { agente: "ventas", q: "ana", filtros: ["clasificacion:fiel"], orden: "valor_desc" };

function columnas(): ColumnaDeEmbudo[] {
  return [
    columna("nuevo", "Nuevo", [
      tarjeta("a", "Ana Prueba", { puntaje: 72, valor: 250000, vencido: true, actividad: "2026-11-01T10:00:00Z" }),
      tarjeta("b", "Beto Prueba"),
    ]),
    columna("calificado", "Calificado", [tarjeta("c", "Carla Prueba", { valor: 100000 })]),
    columna("perdido", "Perdido", []),
  ];
}

function pintar(opts: { puedeMover?: boolean; cols?: ColumnaDeEmbudo[]; motivos?: typeof MOTIVOS } = {}) {
  return render(
    <TableroEmbudo
      titulo="Clientes de Ventas"
      columnas={opts.cols ?? columnas()}
      pluginId="pack_commerce"
      clave="estado_lead"
      motivos={opts.motivos ?? MOTIVOS}
      puedeMover={opts.puedeMover ?? true}
      consulta={CONSULTA}
    />,
  );
}

const respuesta = (status: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { "Content-Type": "application/json" } });

const columnaDe = (nombre: string) => screen.getByRole("region", { name: nombre, hidden: true });

async function moverConMenu(nombre: string, destino: string) {
  const boton = screen.getByRole("button", { name: `Mover a ${nombre} a otra etapa` });
  fireEvent.pointerDown(boton, { button: 0, ctrlKey: false, pointerType: "mouse" });
  await screen.findByRole("menu");
  fireEvent.click(screen.getByRole("menuitem", { name: destino }));
}

describe("TableroEmbudo", () => {
  it("pinta una columna por etapa con su cantidad y la suma en pesos, y la tarjeta con sus datos", () => {
    pintar();
    const nuevo = within(columnaDe("Nuevo"));
    expect(nuevo.getByText("2")).toBeTruthy();
    // La suma de la columna y el valor de la tarjeta.
    expect(nuevo.getAllByText(/250\.000/)).toHaveLength(2);
    expect(nuevo.getByRole("link", { name: "Ana Prueba" }).getAttribute("href")).toBe("/leads?cliente=a&agente=ventas");
    expect(nuevo.getByText("Puntaje 72")).toBeTruthy();
    expect(nuevo.getByText("Seguimiento vencido")).toBeTruthy();
    expect(within(columnaDe("Calificado")).queryByText("Seguimiento vencido")).toBeNull();
    expect(within(columnaDe("Perdido")).getByText("Sin clientes en esta etapa.")).toBeTruthy();
  });

  it("«Mover a…» pasa la tarjeta al instante, ajusta cantidades y sumas y la guarda en el pack", async () => {
    let terminar: (r: Response) => void = () => undefined;
    fetchMock.mockReturnValue(new Promise<Response>((r) => (terminar = r)));
    pintar();
    await moverConMenu("Ana Prueba", "Calificado");

    // El servidor aún no respondió y la tarjeta ya cambió de columna.
    await waitFor(() => expect(within(columnaDe("Calificado")).getByRole("link", { name: "Ana Prueba" })).toBeTruthy());
    expect(within(columnaDe("Nuevo")).queryByRole("link", { name: "Ana Prueba" })).toBeNull();
    expect(within(columnaDe("Calificado")).getByText("2")).toBeTruthy();
    expect(within(columnaDe("Calificado")).getByText(/350\.000/)).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/leads/a/pack/pack_commerce",
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ valores: { estado_lead: "calificado" } }) }),
    );

    terminar(respuesta(200, {}));
    await waitFor(() => expect(getToasts().map((t) => t.message)).toContain("Ana Prueba pasó a Calificado."));
    // No recarga la página: el tablero ya quedó al día.
    expect(refresh).not.toHaveBeenCalled();
  });

  it("arrastrar la tarjeta a otra columna hace el mismo cambio", async () => {
    fetchMock.mockResolvedValue(respuesta(200, {}));
    pintar();
    const datos = new Map<string, string>();
    const dataTransfer = {
      setData: (k: string, v: string) => datos.set(k, v),
      getData: (k: string) => datos.get(k) ?? "",
      effectAllowed: "",
      dropEffect: "",
    };
    const carta = screen.getByRole("link", { name: "Beto Prueba" }).closest("li")!;
    expect(carta.getAttribute("draggable")).toBe("true");
    fireEvent.dragStart(carta, { dataTransfer });
    fireEvent.dragOver(columnaDe("Calificado"), { dataTransfer });
    fireEvent.drop(columnaDe("Calificado"), { dataTransfer });

    await waitFor(() => expect(within(columnaDe("Calificado")).getByRole("link", { name: "Beto Prueba" })).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/leads/b/pack/pack_commerce",
      expect.objectContaining({ body: JSON.stringify({ valores: { estado_lead: "calificado" } }) }),
    );
  });

  it("si el servidor rechaza el cambio la tarjeta vuelve a su columna y se explica por qué", async () => {
    fetchMock.mockResolvedValue(respuesta(409, { error: "Solo una persona puede reabrir un lead perdido." }));
    pintar();
    await moverConMenu("Ana Prueba", "Calificado");

    await waitFor(() =>
      expect(getToasts().map((t) => t.message)).toContain("Solo una persona puede reabrir un lead perdido."),
    );
    expect(within(columnaDe("Nuevo")).getByRole("link", { name: "Ana Prueba" })).toBeTruthy();
    expect(within(columnaDe("Nuevo")).getByText("2")).toBeTruthy();
    expect(within(columnaDe("Calificado")).getByText("1")).toBeTruthy();
  });

  it("si falla la red la tarjeta vuelve a su columna", async () => {
    fetchMock.mockRejectedValue(new TypeError("Network request failed"));
    pintar();
    await moverConMenu("Ana Prueba", "Calificado");
    await waitFor(() => expect(getToasts().some((t) => t.kind === "error")).toBe(true));
    expect(within(columnaDe("Nuevo")).getByRole("link", { name: "Ana Prueba" })).toBeTruthy();
  });

  it("mover a «perdido» pide el motivo antes de guardar y lo manda con la etapa", async () => {
    fetchMock.mockResolvedValue(respuesta(200, {}));
    pintar();
    await moverConMenu("Ana Prueba", "Perdido");

    // Todavía no cambia nada.
    expect(fetchMock).not.toHaveBeenCalled();
    expect(within(columnaDe("Nuevo")).getByRole("link", { name: "Ana Prueba", hidden: true })).toBeTruthy();

    const dialogo = await screen.findByRole("dialog", { name: "¿Por qué se perdió?" });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Marcar como perdido" }));
    expect(await within(dialogo).findByText("Elige el motivo de la pérdida.")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.change(within(dialogo).getByLabelText(/Motivo de la pérdida/), { target: { value: "precio" } });
    fireEvent.change(within(dialogo).getByLabelText(/Nota/), { target: { value: " Muy caro " } });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Marcar como perdido" }));

    await waitFor(() => expect(within(columnaDe("Perdido")).getByRole("link", { name: "Ana Prueba", hidden: true })).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/leads/a/pack/pack_commerce",
      expect.objectContaining({
        body: JSON.stringify({ valores: { estado_lead: "perdido", motivo_perdida: "precio", nota_perdida: "Muy caro" } }),
      }),
    );
  });

  it("cancelar el motivo no mueve la tarjeta", async () => {
    pintar();
    await moverConMenu("Ana Prueba", "Perdido");
    const dialogo = await screen.findByRole("dialog", { name: "¿Por qué se perdió?" });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(fetchMock).not.toHaveBeenCalled();
    expect(within(columnaDe("Nuevo")).getByRole("link", { name: "Ana Prueba", hidden: true })).toBeTruthy();
  });

  it("sin permiso para editar se ven las columnas pero no se puede mover ni arrastrar", () => {
    pintar({ puedeMover: false });
    expect(screen.queryByRole("button", { name: /Mover a/ })).toBeNull();
    const carta = screen.getByRole("link", { name: "Ana Prueba" }).closest("li")!;
    expect(carta.getAttribute("draggable")).not.toBe("true");

    const dataTransfer = { setData: vi.fn(), getData: () => "a", effectAllowed: "", dropEffect: "" };
    fireEvent.drop(columnaDe("Calificado"), { dataTransfer });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(within(columnaDe("Nuevo")).getByRole("link", { name: "Ana Prueba" })).toBeTruthy();
  });

  it("«Ver más» pide la página siguiente con los mismos filtros y no repite tarjetas", async () => {
    fetchMock.mockResolvedValue(
      respuesta(200, { tarjetas: [tarjeta("b", "Beto Prueba"), tarjeta("z", "Zoe Prueba")], hay_mas: false }),
    );
    pintar({
      cols: [columna("nuevo", "Nuevo", [tarjeta("a", "Ana Prueba"), tarjeta("b", "Beto Prueba")], { total: 120, hayMas: true })],
    });
    expect(within(columnaDe("Nuevo")).getByText("Mostrando 2 de 120")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Ver más clientes en Nuevo" }));

    await waitFor(() => expect(within(columnaDe("Nuevo")).getByRole("link", { name: "Zoe Prueba" })).toBeTruthy());
    const url = new URL(fetchMock.mock.calls[0][0] as string, "http://local");
    expect(url.pathname).toBe("/api/leads/embudo");
    expect(url.searchParams.get("desde")).toBe("2");
    expect(url.searchParams.get("valor")).toBe("nuevo");
    expect(url.searchParams.get("q")).toBe("ana");
    expect(url.searchParams.getAll("filtro")).toEqual(["clasificacion:fiel"]);
    expect(url.searchParams.get("orden")).toBe("valor_desc");
    expect(within(columnaDe("Nuevo")).getAllByRole("link", { name: "Beto Prueba" })).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /Ver más/ })).toBeNull();
  });

  it("tras mover una tarjeta fuera de la columna, «Ver más» sigue una posición antes para no saltarse ninguna", async () => {
    fetchMock.mockResolvedValueOnce(respuesta(200, {})).mockResolvedValueOnce(respuesta(200, { tarjetas: [], hay_mas: false }));
    pintar({
      cols: [
        columna("nuevo", "Nuevo", [tarjeta("a", "Ana Prueba"), tarjeta("b", "Beto Prueba")], { total: 120, hayMas: true }),
        columna("calificado", "Calificado", []),
      ],
    });
    await moverConMenu("Ana Prueba", "Calificado");
    await waitFor(() => expect(getToasts().map((t) => t.message)).toContain("Ana Prueba pasó a Calificado."));

    fireEvent.click(screen.getByRole("button", { name: "Ver más clientes en Nuevo" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(new URL(fetchMock.mock.calls[1][0] as string, "http://local").searchParams.get("desde")).toBe("1");
  });

  it("si «Ver más» falla lo avisa y deja el botón para reintentar", async () => {
    fetchMock.mockResolvedValue(respuesta(502, { error: "No se pudo contactar el backend." }));
    pintar({ cols: [columna("nuevo", "Nuevo", [tarjeta("a", "Ana Prueba")], { total: 80, hayMas: true })] });
    fireEvent.click(screen.getByRole("button", { name: "Ver más clientes en Nuevo" }));
    await waitFor(() => expect(getToasts().map((t) => t.message)).toContain("No se pudo contactar el backend."));
    expect(screen.getByRole("button", { name: "Ver más clientes en Nuevo" })).toBeTruthy();
  });

  it("una columna que no cargó dice por qué y no tumba las demás", () => {
    pintar({
      cols: [
        columna("nuevo", "Nuevo", [], { error: "No se pudo cargar la etapa: Error 500" }),
        columna("calificado", "Calificado", [tarjeta("c", "Carla Prueba")]),
      ],
    });
    expect(within(columnaDe("Nuevo")).getByRole("alert").textContent).toContain("Error 500");
    expect(within(columnaDe("Calificado")).getByRole("link", { name: "Carla Prueba" })).toBeTruthy();
  });
});
