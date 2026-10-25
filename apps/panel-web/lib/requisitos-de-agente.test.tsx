// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { PasoPublicar, PasoSuperpoderes } from "@/app/(app)/agentes/[id]/editar/_components/pasos";
import { AvisoDeRequisitos } from "@/components/domain/aviso-de-requisitos";
import type { Requirement } from "@/lib/api/types";

import { estadoDesdeBorrador } from "./agentes-editor";
import { copiaDelRequisito, requisitosDeHabilidad } from "./requisitos-de-agente";

const COBRO: Requirement = {
  skill: "pack_payments",
  kind: "habilidad_sin_configurar",
  title: "Cobro en línea",
  explanation: "Pega tus llaves de Wompi.",
  section: "plugins",
  content: null,
};
const CATALOGO: Requirement = {
  skill: "pack_commerce",
  kind: "sin_contenido",
  title: "Ventas",
  explanation: "",
  section: "pack_commerce:productos",
  content: "catalogo",
};

describe("requisitos del agente", () => {
  afterEach(cleanup);

  it("traduce cada tipo a una acción del panel, sin claves crudas", () => {
    expect(copiaDelRequisito(COBRO)).toMatchObject({
      titulo: "Configura Cobro en línea",
      descripcion: "Pega tus llaves de Wompi.",
      href: "/habilidades/pack_payments",
    });
    expect(copiaDelRequisito(CATALOGO)).toMatchObject({ titulo: "Carga tu catálogo", href: "/comercio/productos" });
  });

  it("filtra por habilidad", () => {
    expect(requisitosDeHabilidad([COBRO, CATALOGO], "pack_commerce")).toEqual([CATALOGO]);
  });

  it("muestra el aviso con la salida a mano, y nada si no falta nada", () => {
    const { container, rerender } = render(<AvisoDeRequisitos requisitos={[COBRO, CATALOGO]} />);
    expect(screen.getByText("Configura Cobro en línea")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Cargar productos" }).getAttribute("href")).toBe("/comercio/productos");
    expect(document.body.textContent).not.toMatch(/pack_|sin_contenido|habilidad_sin_configurar/);
    rerender(<AvisoDeRequisitos requisitos={[]} />);
    expect(container.textContent).toBe("");
  });

  it("al publicar avisa pero no bloquea: la lista de conexiones sigue disponible", () => {
    render(
      <PasoPublicar
        destinos={[]}
        destinosError={null}
        elegidas={[]}
        alternar={() => {}}
        errores={{}}
        notas=""
        setNotas={() => {}}
        requisitos={[COBRO]}
      />,
    );
    expect(screen.getByText(/Puedes publicar, pero/)).toBeTruthy();
    expect(screen.getByText("Configura Cobro en línea")).toBeTruthy();
  });

  it("el paso Superpoderes muestra lo que falta", () => {
    const estado = estadoDesdeBorrador({ name: "Ventas", description: "" }, { procedures: [] }, []);
    render(
      <PasoSuperpoderes
        estado={estado}
        cambiar={() => {}}
        errores={{}}
        erroresPorPoder={{}}
        catalogo={[
          { id: "pack_commerce.tomar_pedido", version: "1.0.0", skill: "pack_commerce", title: "Tomar un pedido", description: "", phrases: ["a", "b", "c"] },
        ]}
        minFrases={3}
        requisitos={[CATALOGO]}
      />,
    );
    expect(screen.getByText("Carga tu catálogo")).toBeTruthy();
  });
});
