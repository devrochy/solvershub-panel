import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  dismiss,
  getToasts,
  pauseAutoDismiss,
  push,
  resetToasts,
  resumeAutoDismiss,
} from "./toast-store";

describe("toast-store (HU-UI-02)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetToasts();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("éxito se cierra solo a los 5 s", () => {
    const id = push("success", "Guardado.");
    expect(getToasts()).toHaveLength(1);
    vi.advanceTimersByTime(4_999);
    expect(getToasts()).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(getToasts()).toHaveLength(0);
    void id;
  });

  it("error queda hasta cerrarlo a mano", () => {
    const id = push("error", "Falló.");
    vi.advanceTimersByTime(30_000);
    expect(getToasts()).toHaveLength(1);
    dismiss(id);
    expect(getToasts()).toHaveLength(0);
  });

  it("pausa con hover y retoma al salir", () => {
    const id = push("success", "Guardado.");
    pauseAutoDismiss(id);
    vi.advanceTimersByTime(30_000);
    expect(getToasts()).toHaveLength(1);
    resumeAutoDismiss(id, "success");
    vi.advanceTimersByTime(5_000);
    expect(getToasts()).toHaveLength(0);
  });
});
