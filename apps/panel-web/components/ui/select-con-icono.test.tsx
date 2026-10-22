// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

import { SelectConIcono } from "@/components/ui/select-con-icono";

/** jsdom no trae estas APIs que usa el posicionamiento de Radix. */
class ResizeObserverFalso {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function Demo() {
  const [valor, setValor] = useState("CO");
  return (
    <SelectConIcono
      id="pais"
      label="Indicativo"
      value={valor}
      onChange={setValor}
      options={[
        { value: "CO", label: "Colombia (+57)", icono: "🇨🇴" },
        { value: "MX", label: "México (+52)", icono: "🇲🇽" },
      ]}
    />
  );
}

afterEach(cleanup);

describe("SelectConIcono", () => {
  it("abre el listado y elige una opción (el clic no se pierde)", async () => {
    vi.stubGlobal("ResizeObserver", ResizeObserverFalso);
    render(<Demo />);
    fireEvent.click(screen.getByRole("button", { name: /Colombia/ }));
    const lista = await screen.findByRole("listbox");
    fireEvent.click(within(lista).getByText("México (+52)"));
    expect(screen.getByRole("button", { name: /México/ })).toBeTruthy();
    vi.unstubAllGlobals();
  });
});
