import { describe, expect, it } from "vitest";

import { DIAS_FRANJA, franjasATexto, leyendaDias, textoAFranjas } from "@/lib/horario-atencion";

describe("horario de atención: índice de días como el backend (ADR-0051)", () => {
  it("0 es lunes y 6 es domingo, como `weekday()` de Python", () => {
    expect(DIAS_FRANJA[0]).toBe("Lun");
    expect(DIAS_FRANJA[6]).toBe("Dom");
    expect(leyendaDias()).toBe("0 Lun · 1 Mar · 2 Mié · 3 Jue · 4 Vie · 5 Sáb · 6 Dom");
  });

  it("«lunes 08:00-18:00» va al backend como day 0 y vuelve igual", () => {
    const lunes = DIAS_FRANJA.indexOf("Lun");
    const franjas = textoAFranjas(`${lunes} 08:00-18:00`);
    expect(franjas).toEqual([{ day: 0, from: "08:00", to: "18:00" }]);
    // Lo que devuelve el GET se muestra igual que se escribió.
    expect(franjasATexto(franjas)).toBe("0 08:00-18:00");
    expect(DIAS_FRANJA[franjas[0].day]).toBe("Lun");
  });

  it("ignora líneas inválidas y días fuera de 0-6", () => {
    expect(textoAFranjas("7 08:00-18:00\nlunes 8-18\n\n 6 9:00 - 12:00 ")).toEqual([
      { day: 6, from: "9:00", to: "12:00" },
    ]);
  });
});
