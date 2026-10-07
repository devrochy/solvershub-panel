import { describe, expect, it } from "vitest";

import { toCsv } from "./csv";

type Fila = { numero: string; nombre: string | null; activo: boolean };

const columnas = [
  { header: "Número", value: (f: Fila) => f.numero },
  { header: "Nombre", value: (f: Fila) => f.nombre },
  { header: "Activo", value: (f: Fila) => (f.activo ? "Sí" : "No") },
];

describe("toCsv", () => {
  it("arma cabecera y filas con BOM y CRLF", () => {
    const csv = toCsv([{ numero: "573001234567", nombre: "Tienda", activo: true }], columnas);
    expect(csv).toBe("﻿Número,Nombre,Activo\r\n573001234567,Tienda,Sí\r\n");
  });

  it("entrecomilla comas, comillas y saltos de línea", () => {
    const csv = toCsv([{ numero: "1", nombre: 'Casa "Bella", sede\nnorte', activo: false }], columnas);
    expect(csv.split("\r\n")[1]).toBe('1,"Casa ""Bella"", sede\nnorte",No');
  });

  it("neutraliza celdas que empezarían una fórmula", () => {
    const csv = toCsv(
      [
        { numero: "+57 300 000 0000", nombre: "=HYPERLINK(\"x\")", activo: true },
        { numero: "-1", nombre: "@SUM(A1)", activo: true },
      ],
      columnas,
    );
    const [, fila1, fila2] = csv.split("\r\n");
    expect(fila1).toBe("'+57 300 000 0000,\"'=HYPERLINK(\"\"x\"\")\",Sí");
    expect(fila2).toBe("'-1,'@SUM(A1),Sí");
  });

  it("los vacíos quedan como celda vacía", () => {
    const csv = toCsv([{ numero: "1", nombre: null, activo: false }], columnas);
    expect(csv.split("\r\n")[1]).toBe("1,,No");
  });
});
