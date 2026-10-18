// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { TenantSwitcher } from "@/components/shell/tenant-switcher";
import { RESPUESTAS, me } from "@/lib/testing/fixtures";
import { resolverServidor } from "@/lib/testing/servidor";
import { getToasts, resetToasts } from "@/lib/toast-store";

// Cambio de negocio (P0 de pruebas): la vista se monta de nuevo con los datos del negocio
// nuevo, sin recargar la página, y el selector avisa si la API no acepta el cambio.

let meActual = me;
vi.mock("@/lib/api/server", async (original) => ({
  ...(await original<typeof import("@/lib/api/server")>()),
  apiFetch: vi.fn(async (ruta: string) => {
    if (ruta === "/admin/me") return { ok: true, status: 200, data: meActual };
    const data = RESPUESTAS[ruta.split("?")[0]];
    return data === undefined ? { ok: false, status: 404, error: `Sin fixture para ${ruta}` } : { ok: true, status: 200, data };
  }),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, getAll: () => [], has: () => false }),
  headers: async () => new Headers(),
}));

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh, prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => "/configuracion",
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
}));

import AppLayout from "@/app/(app)/layout";

/** Un formulario como los de Configuración: arranca con los datos del servidor. */
function Formulario({ inicial }: { inicial: string }) {
  const [valor, setValor] = useState(inicial);
  return <input aria-label="Nombre del asistente" value={valor} onChange={(e) => setValor(e.target.value)} />;
}

const respuesta = (status: number, body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));

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
  refresh.mockReset();
  resetToasts();
  // El vigilante del layout pregunta la sesión: responde lo mismo que el render.
  vi.stubGlobal("fetch", vi.fn(() => respuesta(200, meActual)));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function layoutCon(negocio: { id: string; name: string }, inicial: string) {
  meActual = { ...me, tenant: { ...me.tenant!, ...negocio } };
  return resolverServidor(await AppLayout({ children: <Formulario inicial={inicial} /> }));
}

describe("vista del negocio activo (layout)", () => {
  it("al cambiar de negocio la vista se monta de nuevo y los formularios arrancan con sus datos", async () => {
    const { rerender } = render(await layoutCon({ id: "t-1", name: "Tienda Norte" }, "Asistente Norte"));
    const campo = () => screen.getByRole("textbox", { name: "Nombre del asistente" }) as HTMLInputElement;
    fireEvent.change(campo(), { target: { value: "editado" } });
    expect(campo().value).toBe("editado");
    expect(screen.getByRole("button", { name: /Tienda Norte/ })).toBeTruthy();

    rerender(await layoutCon({ id: "t-2", name: "Tienda Sur" }, "Asistente Sur"));
    expect(campo().value).toBe("Asistente Sur");
    expect(screen.getByRole("button", { name: /Tienda Sur/ })).toBeTruthy();
  });

  it("con el mismo negocio, refrescar conserva lo que el usuario estaba escribiendo", async () => {
    const { rerender } = render(await layoutCon({ id: "t-1", name: "Tienda Norte" }, "Asistente Norte"));
    const campo = () => screen.getByRole("textbox", { name: "Nombre del asistente" }) as HTMLInputElement;
    fireEvent.change(campo(), { target: { value: "editado" } });
    rerender(await layoutCon({ id: "t-1", name: "Tienda Norte (editado)" }, "Asistente Norte"));
    expect(campo().value).toBe("editado");
    expect(screen.getByRole("button", { name: /Tienda Norte \(editado\)/ })).toBeTruthy();
  });
});

describe("selector de negocio", () => {
  const negocios = { items: [{ id: "t-1", name: "Tienda Norte", role: "owner", active: true }, { id: "t-2", name: "Tienda Sur", role: "owner", active: false }] };

  async function elegirSur(respuestaDelCambio: () => Promise<Response>) {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => (url.startsWith("/api/tenants") ? respuesta(200, negocios) : respuestaDelCambio())),
    );
    render(<TenantSwitcher current={negocios.items[0]} count={2} />);
    fireEvent.click(screen.getByRole("button", { name: /Tienda Norte/ }));
    fireEvent.click(await screen.findByRole("option", { name: /Tienda Sur/ }));
  }

  it("fija el negocio por el BFF y vuelve a pedir la vista", async () => {
    await elegirSur(() => respuesta(200, { ok: true }));
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    const llamada = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.find(([url]) => url === "/api/tenant");
    expect(JSON.parse(String((llamada?.[1] as RequestInit).body))).toEqual({ tenantId: "t-2" });
  });

  it("si la API no acepta el cambio, avisa y no refresca", async () => {
    await elegirSur(() => respuesta(403, { error: "No tienes acceso a ese negocio." }));
    await waitFor(() =>
      expect(getToasts()).toContainEqual(expect.objectContaining({ kind: "error", message: "No tienes acceso a ese negocio." })),
    );
    expect(refresh).not.toHaveBeenCalled();
  });
});
