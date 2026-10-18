// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { PluginActions } from "@/app/(app)/habilidades/_components/plugin-actions";
import { FeedbackProviders } from "@/components/ui/providers";
import { getToasts, resetToasts } from "@/lib/toast-store";

import { mensajeDeHabilitacion } from "./habilidades";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, replace: vi.fn(), push: vi.fn() }),
}));

describe("mensaje del tope del plan", () => {
  it("dice cuántas habilidades permite el plan", () => {
    expect(mensajeDeHabilitacion("Tu plan no permite habilitar más habilidades (2/2).", 403)).toBe(
      "Tu plan permite 2 habilidades y ya las usas todas. Deshabilita una o mejora el plan para habilitar otra.",
    );
    expect(mensajeDeHabilitacion("Tu plan no permite habilitar más habilidades (1/1).", 403)).toMatch(/permite 1 habilidad y/);
    expect(mensajeDeHabilitacion("Falta configurarla.", 400)).toBe("Falta configurarla.");
    expect(mensajeDeHabilitacion(undefined, 403)).toMatch(/Tu plan no permite/);
  });
});

describe("interruptor de habilidad", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    resetToasts();
    refresh.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  function montar() {
    render(
      <FeedbackProviders>
        <PluginActions pluginId="pack_calendar" enabled={false} hasError={false} />
      </FeedbackProviders>,
    );
    return screen.getByRole("switch", { name: "Habilitar pack_calendar" });
  }

  it("al tope del plan vuelve a apagado y explica el límite", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "Tu plan no permite habilitar más habilidades (2/2)." }), { status: 403 }),
    );
    const interruptor = montar();
    fireEvent.click(interruptor);
    await waitFor(() =>
      expect(getToasts()).toContainEqual(
        expect.objectContaining({ kind: "error", message: expect.stringMatching(/Tu plan permite 2 habilidades/) }),
      ),
    );
    await waitFor(() => expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("false"));
    expect(screen.getByText("No habilitada")).toBeTruthy();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("si la API acepta, queda encendido, avisa y refresca", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    fireEvent.click(montar());
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("true");
    expect(getToasts()).toContainEqual(expect.objectContaining({ kind: "success", message: "Habilidad habilitada." }));
    expect(JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body))).toEqual({ action: "activate" });
  });
});
