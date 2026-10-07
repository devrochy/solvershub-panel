/**
 * CSV para descargar desde el panel (se abre en Excel o Google Sheets).
 *
 * - Separador coma y fin de línea CRLF (RFC 4180); los campos con coma, comilla o salto
 *   de línea van entre comillas y las comillas se duplican.
 * - Una celda que empieza por `=`, `+`, `-`, `@`, tabulador o retorno se antepone con `'`
 *   para que la hoja de cálculo no la ejecute como fórmula (inyección de CSV).
 * - BOM UTF-8 al inicio para que Excel lea bien las tildes.
 */

export type CsvColumn<T> = { header: string; value: (row: T) => string | number | boolean | null | undefined };

const FORMULA_START = /^[=+\-@\t\r]/;

function cell(raw: string | number | boolean | null | undefined): string {
  let text = raw === null || raw === undefined ? "" : String(raw);
  if (FORMULA_START.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const lines = [columns.map((c) => cell(c.header)).join(",")];
  for (const row of rows) lines.push(columns.map((c) => cell(c.value(row))).join(","));
  return `﻿${lines.join("\r\n")}\r\n`;
}
