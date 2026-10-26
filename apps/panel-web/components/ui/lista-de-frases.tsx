"use client";

import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizarFrase } from "@/lib/agentes-editor";

/**
 * Lista editable de frases (las que dice un cliente, las que el agente nunca dice o las palabras que
 * escalan). Se agrega con Enter o con el botón y se quita con la ✕ de cada una. Sin repetidas. Acepta
 * espacios y comas dentro de la frase.
 */
export function ListaDeFrases({
  id,
  frases,
  onChange,
  placeholder,
  agregarLabel,
  max = 50,
  minLargo = 3,
  invalido = false,
  describedBy,
  disabled = false,
}: {
  id: string;
  frases: string[];
  onChange: (frases: string[]) => void;
  placeholder: string;
  agregarLabel: string;
  max?: number;
  /** Largo mínimo de cada frase, sin contar espacios de los bordes. */
  minLargo?: number;
  invalido?: boolean;
  describedBy?: string;
  disabled?: boolean;
}) {
  const [nueva, setNueva] = useState("");

  function agregar() {
    const texto = nueva.trim();
    if (texto.length < minLargo || frases.length >= max) return;
    if (frases.some((f) => normalizarFrase(f) === normalizarFrase(texto))) {
      setNueva("");
      return;
    }
    onChange([...frases, texto.slice(0, 300)]);
    setNueva("");
  }

  function alPresionar(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      agregar();
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {frases.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {frases.map((frase, i) => (
            <li
              key={`${frase}-${i}`}
              className="inline-flex items-center gap-1 rounded-sm bg-hover px-2 py-1 text-sm text-headline"
            >
              {frase}
              <button
                type="button"
                className="rounded-sm text-text-soft hover:text-headline focus-visible:outline-2 disabled:opacity-50"
                aria-label={`Quitar «${frase}»`}
                disabled={disabled}
                onClick={() => onChange(frases.filter((_, j) => j !== i))}
              >
                <X aria-hidden className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Input
          id={id}
          value={nueva}
          disabled={disabled}
          maxLength={300}
          placeholder={placeholder}
          aria-invalid={invalido || undefined}
          aria-describedby={describedBy}
          onChange={(e) => setNueva(e.target.value)}
          onKeyDown={alPresionar}
        />
        <Button type="button" variant="outline" onClick={agregar} disabled={disabled || nueva.trim().length < minLargo || frases.length >= max}>
          {agregarLabel}
        </Button>
      </div>
    </div>
  );
}
