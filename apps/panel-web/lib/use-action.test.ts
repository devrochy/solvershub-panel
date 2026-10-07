// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { getToasts, resetToasts } from "@/lib/toast-store";
import { useAction } from "@/lib/use-action";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

describe("useAction (HU-UI-02)", () => {
  beforeEach(() => resetToasts());

  it("éxito → toast de éxito y resultado true", async () => {
    const { result } = renderHook(() => useAction());
    let ok = false;
    await act(async () => {
      ok = await result.current.run(async () => ({ ok: true, success: "Guardado." }));
    });
    expect(ok).toBe(true);
    expect(getToasts()).toContainEqual(
      expect.objectContaining({ kind: "success", message: "Guardado." }),
    );
  });

  it("fallo → toast de error, rollback y resultado false", async () => {
    const rollback = vi.fn();
    const { result } = renderHook(() => useAction({ rollback }));
    let ok = true;
    await act(async () => {
      ok = await result.current.run(async () => ({ ok: false, error: "No se pudo guardar." }));
    });
    expect(ok).toBe(false);
    expect(rollback).toHaveBeenCalledOnce();
    expect(getToasts()).toContainEqual(
      expect.objectContaining({ kind: "error", message: "No se pudo guardar." }),
    );
  });

  it("un error que no es texto no llega al toast tal cual", async () => {
    const { result } = renderHook(() => useAction());
    await act(async () => {
      await result.current.run(async () => ({
        ok: false,
        error: { code: "origen_no_permitido", message: "Origen no permitido." } as unknown as string,
      }));
    });
    expect(getToasts()).toContainEqual(
      expect.objectContaining({ kind: "error", message: "Algo salió mal. Inténtalo de nuevo." }),
    );
  });

  it("excepción de red → toast genérico y rollback", async () => {
    const rollback = vi.fn();
    const { result } = renderHook(() => useAction({ rollback }));
    await act(async () => {
      await result.current.run(async () => {
        throw new Error("red");
      });
    });
    expect(rollback).toHaveBeenCalledOnce();
    expect(getToasts()).toContainEqual(
      expect.objectContaining({ kind: "error", message: "No se pudo contactar el servidor." }),
    );
  });
});
