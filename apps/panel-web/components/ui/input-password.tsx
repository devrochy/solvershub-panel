"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface InputPasswordProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** Qué se oculta, para el nombre accesible del botón ("Mostrar PIN"). Por defecto, contraseña. */
  etiqueta?: string;
}

/**
 * Campo oculto (contraseña, PIN, llave) con botón para ver/ocultar. Conserva los atributos
 * del `Input` y reserva espacio para el ojo; el botón se anuncia con `aria-pressed`.
 */
export function InputPassword({
  className,
  id,
  etiqueta = "contraseña",
  ...props
}: InputPasswordProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        {...props}
        id={id}
        type={visible ? "text" : "password"}
        className={cn("pr-10", className)}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? `Ocultar ${etiqueta}` : `Mostrar ${etiqueta}`}
        aria-pressed={visible}
        className="absolute right-1 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-text-soft transition-colors hover:bg-hover hover:text-headline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        {visible ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
      </button>
    </div>
  );
}
