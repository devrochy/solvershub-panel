// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { violacionesGraves } from "@/lib/testing/axe";

import { Dropzone } from "./dropzone";
import { Progress } from "./progress";
import { Stepper } from "./stepper";

afterEach(cleanup);

describe("Progress (HU-QA-03)", () => {
  it("anuncia el avance en palabras y reparte los segmentos", async () => {
    const { container } = render(
      <Progress
        label="Mi avance"
        value={5}
        max={10}
        valueText="5 de 10 pruebas"
        segments={[
          { key: "ok", value: 4, label: "OK", tone: "success" },
          { key: "falla", value: 1, label: "Falla", tone: "danger" },
          { key: "nada", value: 0, label: "Nada", tone: "neutral" },
        ]}
      />,
    );
    const barra = screen.getByRole("progressbar", { name: "Mi avance" });
    expect(barra.getAttribute("aria-valuenow")).toBe("5");
    expect(barra.getAttribute("aria-valuetext")).toBe("5 de 10 pruebas");
    expect(barra.children).toHaveLength(2);
    expect((barra.children[0] as HTMLElement).style.width).toBe("40%");
    expect(await violacionesGraves(container)).toEqual([]);
  });

  it("acota el valor y no divide por cero", () => {
    render(<Progress label="Vacía" value={3} max={0} />);
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("0");
  });
});

describe("Stepper (HU-QA-03)", () => {
  it("marca el paso activo, escribe el estado y abre otro con onSelect", async () => {
    const onSelect = vi.fn();
    const { container } = render(
      <Stepper
        label="Pasos"
        onSelect={onSelect}
        steps={[
          { id: "1", title: "Abrir", state: "complete", stateLabel: "Aprobado" },
          { id: "2", title: "Escribir", state: "current", content: <p>Controles</p> },
          { id: "3", title: "Enviar", state: "upcoming" },
        ]}
      />,
    );
    const items = screen.getAllByRole("listitem");
    expect(items[1].getAttribute("aria-current")).toBe("step");
    expect(screen.getByText("Controles")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Paso 1, Aprobado" }));
    expect(onSelect).toHaveBeenCalledWith("1");
    expect(await violacionesGraves(container)).toEqual([]);
  });
});

describe("Dropzone (HU-QA-03)", () => {
  it("acepta los tipos permitidos, rechaza el resto y lee lo pegado", () => {
    const onFiles = vi.fn();
    const onReject = vi.fn();
    render(<Dropzone accept={["image/png"]} maxBytes={10} onFiles={onFiles} onReject={onReject} />);
    const zona = screen.getByRole("group");
    const png = new File(["12345"], "a.png", { type: "image/png" });
    const grande = new File(["0123456789AB"], "b.png", { type: "image/png" });
    const exe = new File(["MZ"], "c.exe", { type: "application/x-msdownload" });
    fireEvent.drop(zona, { dataTransfer: { files: [png, grande, exe] } });
    expect(onFiles).toHaveBeenCalledWith([png]);
    expect(onReject).toHaveBeenCalledTimes(2);
    fireEvent.paste(zona, { clipboardData: { items: [{ kind: "file", getAsFile: () => png }] } });
    expect(onFiles).toHaveBeenCalledTimes(2);
  });
});
