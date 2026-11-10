import { describe, expect, it } from "vitest";

import { aIso, diaLargo, etiquetaDeDuracion, etiquetaDeHora, minutosEntre, opcionesDeDuracion, opcionesDeHora, partesLocales } from "./formulario";

describe("día, hora y duración de la cita (AGE-06)", () => {
  it("las horas se leen como en Colombia", () => {
    expect(etiquetaDeHora("16:00")).toBe("4:00 p. m.");
    expect(etiquetaDeHora("09:30")).toBe("9:30 a. m.");
  });

  it("opciones cada 15 minutos, con la hora actual aunque no caiga en el paso", () => {
    const opciones = opcionesDeHora(15, 8, 9, "08:10");
    expect(opciones.map((o) => o.value)).toEqual(["08:00", "08:10", "08:15", "08:30", "08:45", "09:00"]);
  });

  it("duraciones en palabras y la de la cita incluida", () => {
    expect(etiquetaDeDuracion(20)).toBe("20 min");
    expect(etiquetaDeDuracion(60)).toBe("1 h");
    expect(etiquetaDeDuracion(90)).toBe("1 h 30 min");
    expect(opcionesDeDuracion(25)).toContain(25);
  });

  it("de ISO a día y hora y de vuelta, con la duración", () => {
    const { dia, hora } = partesLocales("2026-11-10T15:00:00.000Z");
    expect(aIso(dia, hora)).toBe("2026-11-10T15:00:00.000Z");
    expect(aIso(dia, hora, 30)).toBe("2026-11-10T15:30:00.000Z");
    expect(minutosEntre("2026-11-10T15:00:00Z", "2026-11-10T15:20:00Z")).toBe(20);
  });

  it("el día en palabras", () => {
    expect(diaLargo("2026-11-10")).toBe("martes, 10 de noviembre");
  });
});
