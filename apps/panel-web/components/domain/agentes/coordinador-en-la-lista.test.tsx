// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { CoordinadorEnLaLista } from "@/components/domain/agentes/coordinador-en-la-lista";

afterEach(cleanup);

describe("CoordinadorEnLaLista", () => {
  it("lleva a su ficha y, con permiso, a Personalizar", () => {
    render(<CoordinadorEnLaLista id="c1" nombre="Coordinador" puedeEditar />);
    expect(screen.getByRole("link", { name: /Coordinador/ }).getAttribute("href")).toBe("/agentes/c1");
    expect(screen.getByRole("link", { name: "Personalizar" }).getAttribute("href")).toBe("/agentes/c1/personalizar");
  });

  it("sin permiso de edición no ofrece Personalizar", () => {
    render(<CoordinadorEnLaLista id="c1" nombre="Coordinador" puedeEditar={false} />);
    expect(screen.queryByRole("link", { name: "Personalizar" })).toBeNull();
  });
});
