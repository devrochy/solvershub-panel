"use client";

import { useState, type InputHTMLAttributes, type KeyboardEvent } from "react";

import { Input } from "@/components/ui/input";

/** Quita los ceros a la izquierda que sobran: `04` → `4`, `007` → `7`; `0`, `0.5` y `-0.5` quedan igual. */
export function sinCerosIzquierda(texto: string): string {
  const signo = texto.startsWith("-") ? "-" : "";
  const cuerpo = signo ? texto.slice(1) : texto;
  return signo + cuerpo.replace(/^0+(?=\d)/, "");
}

/** Número del texto (acepta coma decimal); `null` si todavía no hay uno completo (vacío, «-», «,»). */
export function leerNumero(texto: string): number | null {
  const normal = texto.replace(",", ".");
  if (!/\d/.test(normal)) return null;
  const n = Number(normal.endsWith(".") ? normal.slice(0, -1) : normal);
  return Number.isFinite(n) ? n : null;
}

export function acotarNumero(n: number, min?: number, max?: number): number {
  let salida = n;
  if (min !== undefined && salida < min) salida = min;
  if (max !== undefined && salida > max) salida = max;
  return salida;
}

function decimalesDe(paso: number): number {
  const texto = String(paso);
  const punto = texto.indexOf(".");
  return punto === -1 ? 0 : texto.length - punto - 1;
}

type Props = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type" | "min" | "max" | "step" | "inputMode"
> & {
  value: number;
  onValueChange: (valor: number) => void;
  min?: number;
  max?: number;
  /** Salto de las flechas ↑ ↓ (por defecto 1). */
  step?: number;
  /** Acepta parte decimal (punto o coma). Por defecto solo enteros. */
  decimal?: boolean;
};

/**
 * Campo numérico que se deja borrar y reescribir. El texto vive en el propio campo: así quedar vacío
 * mientras se escribe no devuelve un `0` ni deja `04`. Hacia el formulario siempre sale un número ya
 * acotado a `min`/`max` (Enter para guardar nunca manda un valor fuera de rango); el texto se
 * normaliza al salir del campo, y si quedó vacío vuelve al último valor válido.
 */
export function InputNumero({ value, onValueChange, min, max, step = 1, decimal = false, onBlur, onKeyDown, ...resto }: Props) {
  const [texto, setTexto] = useState(String(value));
  const [valorPrevio, setValorPrevio] = useState(value);
  const conSigno = min !== undefined && min < 0;
  const patron = decimal
    ? conSigno ? /^-?\d*[.,]?\d*$/ : /^\d*[.,]?\d*$/
    : conSigno ? /^-?\d*$/ : /^\d*$/;

  // Cambio de fuera (cargar, restaurar): el campo muestra el nuevo valor. Si el texto ya lo produce, no se toca.
  if (value !== valorPrevio) {
    setValorPrevio(value);
    const actual = leerNumero(texto);
    if (actual === null || acotarNumero(actual, min, max) !== value) setTexto(String(value));
  }

  function informar(n: number) {
    if (n !== value) onValueChange(n);
  }

  function alCambiar(bruto: string) {
    if (!patron.test(bruto)) return;
    const limpio = sinCerosIzquierda(bruto);
    setTexto(limpio);
    const n = leerNumero(limpio);
    if (n !== null) informar(acotarNumero(n, min, max));
  }

  function alSalir() {
    const n = acotarNumero(leerNumero(texto) ?? value, min, max);
    setTexto(String(n));
    informar(n);
  }

  function alPresionar(event: KeyboardEvent<HTMLInputElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) return;
    event.preventDefault();
    const base = leerNumero(texto) ?? value;
    const sube = event.key === "ArrowUp" ? 1 : -1;
    const n = acotarNumero(Number((base + sube * step).toFixed(decimalesDe(step))), min, max);
    setTexto(String(n));
    informar(n);
  }

  return (
    <Input
      {...resto}
      type="text"
      inputMode={decimal ? "decimal" : "numeric"}
      autoComplete="off"
      value={texto}
      onChange={(e) => alCambiar(e.target.value)}
      onBlur={(e) => {
        alSalir();
        onBlur?.(e);
      }}
      onKeyDown={alPresionar}
    />
  );
}
