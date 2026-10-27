import { beforeEach, describe, expect, it, vi } from "vitest";

import CobrosPage from "@/app/(app)/cobranza/cobros/page";
import ClienteViejoPage from "@/app/(app)/cobranza/clientes/[id]/page";

const redirect = vi.fn((destino: string) => {
  throw new Error(`REDIRECT:${destino}`);
});
let respuesta: { ok: boolean; status: number; data?: unknown; error?: string } = { ok: false, status: 404 };

vi.mock("next/navigation", () => ({
  redirect: (destino: string) => redirect(destino),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("@/lib/api/server", () => ({ apiFetch: vi.fn(async () => respuesta) }));

beforeEach(() => {
  redirect.mockClear();
  respuesta = { ok: false, status: 404 };
});

/** Rutas de Cobranza que cambiaron de lugar con la navegación por jerarquía de datos. */
describe("redirecciones de Cobranza", () => {
  it("«Cobros al propietario» salió de Cobranza: el enlace viejo llega a Pagos", () => {
    expect(() => CobrosPage()).toThrow("REDIRECT:/cobranza/pagos");
  });

  it("la ficha vieja de un cliente llega a su ficha dentro de la cartera", async () => {
    respuesta = { ok: true, status: 200, data: { cliente: { id: "42", cartera_id: "7" } } };
    await expect(ClienteViejoPage({ params: Promise.resolve({ id: "42" }) })).rejects.toThrow(
      "REDIRECT:/cobranza/carteras/7/clientes/42",
    );
  });

  it("un cliente que no existe es 404, no una redirección", async () => {
    await expect(ClienteViejoPage({ params: Promise.resolve({ id: "x" }) })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(redirect).not.toHaveBeenCalled();
  });
});
