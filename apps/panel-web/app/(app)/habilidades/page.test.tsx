import { describe, expect, it, vi } from "vitest";

const redirect = vi.fn((destino: string) => {
  throw new Error(`NEXT_REDIRECT:${destino}`);
});
vi.mock("next/navigation", () => ({ redirect }));

describe("/habilidades (HU-AOS-95)", () => {
  it("la lista por negocio redirige a Agentes", async () => {
    const { default: Pagina } = await import("./page");
    expect(() => Pagina()).toThrow("NEXT_REDIRECT:/agentes");
    expect(redirect).toHaveBeenCalledWith("/agentes");
  });
});
