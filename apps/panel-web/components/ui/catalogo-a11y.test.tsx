// @vitest-environment jsdom
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
// `pure`: sin el cleanup automático tras cada `it`, para renderizar el catálogo una sola vez.
import { cleanup, render } from "@testing-library/react/pure";

import { Catalogo, GRUPOS } from "@/app/(dev)/catalogo/_components/catalogo";
import { violacionesGraves } from "@/lib/testing/axe";

// El catálogo muestra `ErrorDeCarga`, cuyo «Reintentar» usa el router.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/catalogo",
  useSearchParams: () => new URLSearchParams(),
}));

/*
 * axe sobre el catálogo entero en un solo `it` tardaba 10–20 s en el runner con cobertura y a
 * veces pasaba de 30 s. Se reparte por grupo del índice, más un `it` con lo que queda fuera de
 * las piezas (índice, cabecera y títulos de grupo): cada nodo del catálogo se revisa una vez,
 * igual que antes, y cada parte cabe en el tiempo por defecto.
 */
describe("catálogo: sin violaciones graves de accesibilidad", () => {
  let contenedor: HTMLElement;

  beforeAll(() => {
    contenedor = render(<Catalogo />).container;
  });
  afterAll(cleanup);

  const pieza = (id: string) => {
    const el = contenedor.querySelector<HTMLElement>(`section[id="${id}"]`);
    expect(el, `la pieza «${id}» del índice no está en el catálogo`).toBeTruthy();
    return el as HTMLElement;
  };

  it.each(GRUPOS)("grupo $titulo", async (grupo) => {
    expect(await violacionesGraves({ include: grupo.piezas.map((p) => pieza(p.id)) })).toEqual([]);
  });

  it("índice, cabecera y títulos de grupo", async () => {
    const piezas = GRUPOS.flatMap((g) => g.piezas.map((p) => pieza(p.id)));
    expect(await violacionesGraves({ include: [contenedor], exclude: piezas })).toEqual([]);
  });
});
