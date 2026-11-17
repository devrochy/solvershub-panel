// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";

import { PasoSuperpoderes } from "@/components/domain/agentes/recorrido/pasos";
import { estadoDesdeBorrador } from "@/lib/agentes-editor";
import type { components } from "@/lib/api/schema";
import { agruparPorDominio } from "@/lib/superpoderes-por-dominio";
import { violacionesGraves } from "@/lib/testing/axe";

// SPEC-48, HU-AOS-83: superpoderes agrupados por dominio; «Formas de pago» es una tarjeta.

type Superpower = components["schemas"]["Superpower"];

function poder(id: string, title: string, group: string, group_label: string): Superpower {
  return { id, version: "1.0.0", skill: "pack_commerce", title, description: "", phrases: ["a", "b", "c"], group, group_label };
}

const PEDIDO = poder("pack_commerce.tomar_pedido", "Tomar un pedido", "ventas", "Ventas");
const LINK = poder("pack_commerce.pago_en_linea", "Pago en línea", "formas_de_pago", "Formas de pago");
const COMPROBAR = poder("pack_commerce.comprobar_transferencia", "Comprobar transferencia", "formas_de_pago", "Formas de pago");
const SUELTO = { ...poder("pack_x.otro", "Otro poder", "", ""), group: "" };

afterEach(cleanup);

describe("agruparPorDominio", () => {
  it("agrupa en el orden de la API y deja «Otros» al final", () => {
    const grupos = agruparPorDominio([SUELTO, PEDIDO, LINK, COMPROBAR]);
    expect(grupos.map((g) => g.label)).toEqual(["Ventas", "Formas de pago", "Otros"]);
    expect(grupos[1].items.map((p) => p.id)).toEqual([LINK.id, COMPROBAR.id]);
  });

  it("un superpoder sin grupo (cliente viejo) cae en «Otros» sin romper", () => {
    const viejo = { ...PEDIDO, group: undefined as unknown as string, group_label: undefined as unknown as string };
    expect(agruparPorDominio([viejo])).toEqual([{ key: "otros", label: "Otros", items: [viejo] }]);
  });
});

describe("paso de superpoderes por dominio", () => {
  it("Formas de pago es una tarjeta con sus dos poderes, no poderes sueltos", async () => {
    const catalogo = [PEDIDO, LINK, COMPROBAR];
    const agente = { draft: { content: {}, lock_version: 1 } } as unknown as Parameters<typeof estadoDesdeBorrador>[0];
    const { container } = render(
      <PasoSuperpoderes
        estado={estadoDesdeBorrador(agente, {}, catalogo)}
        cambiar={() => {}}
        errores={{}}
        erroresPorPoder={{}}
        catalogo={catalogo}
        minFrases={3}
      />,
    );
    const formas = screen.getByRole("region", { name: "Formas de pago" });
    expect(within(formas).getByLabelText("Pago en línea")).toBeTruthy();
    expect(within(formas).getByLabelText("Comprobar transferencia")).toBeTruthy();
    expect(within(formas).queryByLabelText("Tomar un pedido")).toBeNull();
    expect(within(screen.getByRole("region", { name: "Ventas" })).getByLabelText("Tomar un pedido")).toBeTruthy();
    expect(container.querySelectorAll("[data-dominio]").length).toBe(2);
    expect(await violacionesGraves(container)).toEqual([]);
  });
});
