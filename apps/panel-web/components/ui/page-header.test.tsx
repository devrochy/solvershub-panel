// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { PageHeader } from "@/components/ui/page-header";

/** jsdom no trae estas APIs que usa el posicionamiento de Radix. */
class ResizeObserverFalso {
  observe() {}
  unobserve() {}
  disconnect() {}
}

afterEach(cleanup);

describe("PageHeader · ayuda en contexto", () => {
  it("muestra el icono y deja la descripción y los primeros pasos en el popover", async () => {
    vi.stubGlobal("ResizeObserver", ResizeObserverFalso);
    render(
      <PageHeader
        title="Agenda"
        description="Descripción de la agenda"
        helpSection="agenda"
        breadcrumbs={[]}
        tabs={false}
      />,
    );

    expect(screen.queryByText("Descripción de la agenda")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "¿Qué es esto?" }));

    expect(await screen.findByText("Descripción de la agenda")).toBeTruthy();
    expect(screen.getByText(/Las citas de tu negocio/)).toBeTruthy();
    vi.unstubAllGlobals();
  });

  it("sin ayuda deja la descripción visible y no pinta el icono", () => {
    render(<PageHeader title="Otra sección" description="Texto visible" breadcrumbs={[]} tabs={false} />);

    expect(screen.getByText("Texto visible")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "¿Qué es esto?" })).toBeNull();
  });
});
