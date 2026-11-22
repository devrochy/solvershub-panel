// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { PluginActions } from "@/app/(app)/habilidades/_components/plugin-actions";
import { FeedbackProviders } from "@/components/ui/providers";
import { getToasts, resetToasts } from "@/lib/toast-store";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, replace: vi.fn(), push: vi.fn() }),
}));

/** ADR-0206 (HU-AOS-91): sin interruptor a nivel negocio; solo reintentar y explicar dónde se instala. */
describe("acciones de una habilidad", () => {
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

  function montar(enabled: boolean, hasError: boolean) {
    return render(
      <FeedbackProviders>
        <PluginActions pluginId="pack_calendar" enabled={enabled} hasError={hasError} />
      </FeedbackProviders>,
    );
  }

  it("no ofrece encender ni apagar la habilidad", () => {
    montar(false, false);
    expect(screen.queryByRole("switch")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("sin habilitar explica que se instala en el agente y enlaza a Agentes", () => {
    montar(false, false);
    expect(screen.getByText(/Se instala en el agente que la usa/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Ir a Agentes" }).getAttribute("href")).toBe("/agentes");
  });

  it("habilitada y sana no muestra nada", () => {
    const { container } = montar(true, false);
    expect(container.textContent).toBe("");
  });

  it("con error de salud reintenta con la acción retry", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    montar(true, true);
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    expect(JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body))).toEqual({ action: "retry" });
    expect(getToasts()).toContainEqual(expect.objectContaining({ kind: "success" }));
  });
});
