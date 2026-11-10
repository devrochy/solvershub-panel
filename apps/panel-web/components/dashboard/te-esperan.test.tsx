// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { escalaciones } from "@/lib/testing/fixtures";
import { violacionesGraves } from "@/lib/testing/axe";

import { TeEsperan } from "./te-esperan";

afterEach(cleanup);

const AHORA = new Date("2026-11-10T12:00:00Z");

describe("TeEsperan", () => {
  it("cada persona enlaza a su chat y el total lleva a Escalaciones", async () => {
    const { container } = render(<TeEsperan escalaciones={escalaciones.items} total={2} ahora={AHORA} />);
    expect(screen.getByRole("heading", { level: 2, name: /Te esperan/ })).toBeTruthy();
    const enlace = screen.getByRole("link", { name: /Ana Prueba/ });
    expect(enlace.getAttribute("href")).toContain("/conversaciones?c=");
    expect(screen.getByRole("link", { name: "Ver todas" }).getAttribute("href")).toBe("/escalaciones?estado=pendiente");
    expect(screen.getByText("2 personas")).toBeTruthy();
    expect(await violacionesGraves(container)).toEqual([]);
  });

  it("muestra como máximo cuatro personas", () => {
    const muchas = Array.from({ length: 6 }, (_, i) => ({ ...escalaciones.items[0], conversation_id: `c-${i}` }));
    render(<TeEsperan escalaciones={muchas} total={6} ahora={AHORA} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
  });

  it("sin nadie esperando lo dice, y en el celular no ocupa lugar", () => {
    const { container } = render(<TeEsperan escalaciones={[]} total={0} ahora={AHORA} />);
    expect(screen.getByText("Nadie te espera por ahora.")).toBeTruthy();
    expect((container.firstElementChild as HTMLElement).className).toContain("max-xl:hidden");
  });
});
