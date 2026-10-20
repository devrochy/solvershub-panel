// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

import type { MessageItem } from "@/lib/api/types";
import {
  INTERVALO_HILO_MS,
  INTERVALO_LISTA_MS,
  cursorDe,
  unirMensajes,
  useHiloEnVivo,
  useListaEnVivo,
  usePolling,
} from "@/lib/conversaciones/en-vivo";

// Bandeja en vivo (HU-UX-15, D-SPEC-31-1): polling solo con la pestaña visible.

let visibilidad: DocumentVisibilityState = "visible";

function cambiarVisibilidad(estado: DocumentVisibilityState) {
  visibilidad = estado;
  document.dispatchEvent(new Event("visibilitychange"));
}

function mensaje(id: string, created_at: string, content = id): MessageItem {
  return { id, direction: "inbound", sender_type: "customer", content, status: "sent", created_at };
}

function respuesta(data: unknown) {
  return Promise.resolve(new Response(JSON.stringify(data), { status: 200 }));
}

beforeEach(() => {
  vi.useFakeTimers();
  visibilidad = "visible";
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => visibilidad });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("usePolling", () => {
  it("consulta en cada intervalo solo con la pestaña visible y retoma al volver", async () => {
    const tarea = vi.fn(async () => undefined);
    renderHook(() => usePolling(tarea, 1_000));

    await act(() => vi.advanceTimersByTimeAsync(3_000));
    expect(tarea).toHaveBeenCalledTimes(3);

    act(() => cambiarVisibilidad("hidden"));
    await act(() => vi.advanceTimersByTimeAsync(5_000));
    expect(tarea).toHaveBeenCalledTimes(3);

    // Al volver a la pestaña consulta enseguida, sin esperar el próximo tick.
    await act(async () => cambiarVisibilidad("visible"));
    expect(tarea).toHaveBeenCalledTimes(4);
  });

  it("no solapa una consulta con la anterior si todavía no terminó", async () => {
    let terminar: () => void = () => undefined;
    const tarea = vi.fn(() => new Promise<void>((resolve) => (terminar = resolve)));
    renderHook(() => usePolling(tarea, 1_000));

    await act(() => vi.advanceTimersByTimeAsync(3_000));
    expect(tarea).toHaveBeenCalledTimes(1);
    await act(async () => terminar());
    await act(() => vi.advanceTimersByTimeAsync(1_000));
    expect(tarea).toHaveBeenCalledTimes(2);
  });

  it("deja de consultar al desmontar y un fallo no corta el polling", async () => {
    const tarea = vi.fn(async () => {
      throw new Error("red caída");
    });
    const { unmount } = renderHook(() => usePolling(tarea, 1_000));
    await act(() => vi.advanceTimersByTimeAsync(2_000));
    expect(tarea).toHaveBeenCalledTimes(2);
    unmount();
    await act(() => vi.advanceTimersByTimeAsync(5_000));
    expect(tarea).toHaveBeenCalledTimes(2);
  });
});

describe("unirMensajes y cursorDe", () => {
  it("deduplica el solape por id, actualiza y ordena por fecha", () => {
    const a = mensaje("a", "2026-10-09T15:00:00.000001Z");
    const b = mensaje("b", "2026-10-09T15:00:01.000001Z");
    const bEditado = { ...b, status: "delivered" };
    const c = mensaje("c", "2026-10-09T15:00:00.500000Z");
    const unidos = unirMensajes([a, b], [bEditado, c]);
    expect(unidos.map((m) => m.id)).toEqual(["a", "c", "b"]);
    expect(unidos[2].status).toBe("delivered");
    expect(unirMensajes([a], [])).toEqual([a]);
  });

  it("el cursor es el created_at crudo del último (con microsegundos)", () => {
    expect(cursorDe([])).toBeNull();
    expect(cursorDe([mensaje("a", "2026-10-09T15:00:00.123456Z")])).toBe("2026-10-09T15:00:00.123456Z");
  });
});

describe("useHiloEnVivo", () => {
  it(`trae lo nuevo con ?after= cada ${INTERVALO_HILO_MS} ms y no consulta con la pestaña oculta`, async () => {
    const inicial = [mensaje("m1", "2026-10-09T15:00:00.123456Z", "Hola")];
    const fetchMock = vi.fn<(url: string) => Promise<Response>>(() =>
      respuesta({
        items: [inicial[0], mensaje("m2", "2026-10-09T15:00:04.000001Z", "¿Hay envío?")],
        has_more: false,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useHiloEnVivo("conv-1", inicial));
    expect(result.current).toHaveLength(1);

    await act(() => vi.advanceTimersByTimeAsync(INTERVALO_HILO_MS));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      `/api/conversations/conv-1/messages?after=${encodeURIComponent("2026-10-09T15:00:00.123456Z")}`,
    );
    expect(result.current.map((m) => m.content)).toEqual(["Hola", "¿Hay envío?"]);

    // El siguiente pide desde el mensaje nuevo.
    await act(() => vi.advanceTimersByTimeAsync(INTERVALO_HILO_MS));
    expect(fetchMock.mock.calls[1][0]).toContain(encodeURIComponent("2026-10-09T15:00:04.000001Z"));

    act(() => cambiarVisibilidad("hidden"));
    await act(() => vi.advanceTimersByTimeAsync(INTERVALO_HILO_MS * 5));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("un error del servidor deja el hilo como estaba", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response("{}", { status: 502 }))));
    const inicial = [mensaje("m1", "2026-10-09T15:00:00Z")];
    const { result } = renderHook(() => useHiloEnVivo("conv-1", inicial));
    await act(() => vi.advanceTimersByTimeAsync(INTERVALO_HILO_MS));
    expect(result.current).toEqual(inicial);
  });
});

describe("useListaEnVivo", () => {
  it(`repite los filtros cada ${INTERVALO_LISTA_MS} ms y reemplaza la lista`, async () => {
    const chat = {
      id: "c1",
      customer_name: "Ana",
      external_id: null,
      channel: "whatsapp",
      status: "open",
      bot_paused: false,
      started_at: "2026-10-09T15:00:00Z",
    };
    const fetchMock = vi.fn<(url: string) => Promise<Response>>(() =>
      respuesta({ items: [{ ...chat, status: "escalated" }], total: 1, page: 1, page_size: 25, has_more: false }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const iniciales = [chat];
    const { result } = renderHook(() => useListaEnVivo("status=open&connection_id=k1", iniciales));
    await act(() => vi.advanceTimersByTimeAsync(INTERVALO_LISTA_MS - 1));
    expect(fetchMock).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(fetchMock.mock.calls[0][0]).toBe("/api/conversations?status=open&connection_id=k1");
    expect(result.current[0].status).toBe("escalated");
  });
});
