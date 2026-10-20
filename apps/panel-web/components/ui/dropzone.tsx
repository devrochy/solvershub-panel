"use client";

import { useRef, useState, type ClipboardEvent, type DragEvent, type ReactNode } from "react";
import { ImagePlus } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Zona para adjuntar archivos (HU-QA-03): arrastrar, pegar con Ctrl+V cuando tiene el foco
 * o elegir con el botón. Filtra por `accept` (tipos MIME exactos) y tamaño; lo rechazado
 * se avisa con `onReject`. No sube nada: entrega los `File` a quien la usa.
 *
 * `esAdmitido` reemplaza el filtro por MIME cuando el tipo no es confiable (los navegadores mandan
 * un `.md` sin tipo): la zona sigue ofreciendo `accept` al selector de archivos.
 */
export function Dropzone({
  onFiles,
  onReject,
  accept,
  esAdmitido,
  maxBytes,
  disabled,
  label = "Pega, arrastra o elige una captura",
  hint,
  icono,
  className,
}: {
  onFiles: (files: File[]) => void;
  onReject?: (motivo: string) => void;
  /** Tipos MIME aceptados, p. ej. `["image/png", "image/jpeg"]`. */
  accept: string[];
  /** Filtro propio en lugar de comparar `file.type` con `accept`. */
  esAdmitido?: (archivo: File) => boolean;
  maxBytes?: number;
  disabled?: boolean;
  label?: string;
  hint?: string;
  /** Ícono de la zona (por defecto, el de imagen). */
  icono?: ReactNode;
  className?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [encima, setEncima] = useState(false);

  function entregar(lista: FileList | File[] | null) {
    if (!lista || disabled) return;
    const validos: File[] = [];
    for (const archivo of Array.from(lista)) {
      if (!(esAdmitido ? esAdmitido(archivo) : accept.includes(archivo.type))) {
        onReject?.(`«${archivo.name || "archivo"}» no es un tipo admitido.`);
      } else if (maxBytes && archivo.size > maxBytes) {
        onReject?.(`«${archivo.name || "archivo"}» supera ${Math.round(maxBytes / 1024 / 1024)} MB.`);
      } else {
        validos.push(archivo);
      }
    }
    if (validos.length > 0) onFiles(validos);
  }

  function alSoltar(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setEncima(false);
    entregar(e.dataTransfer.files);
  }

  function alPegar(e: ClipboardEvent<HTMLDivElement>) {
    const archivos = Array.from(e.clipboardData.items)
      .filter((item) => item.kind === "file")
      .map((item) => item.getAsFile())
      .filter((f): f is File => f !== null);
    if (archivos.length > 0) {
      e.preventDefault();
      entregar(archivos);
    }
  }

  return (
    <div
      role="group"
      aria-label={label}
      tabIndex={disabled ? -1 : 0}
      onPaste={alPegar}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setEncima(true);
      }}
      onDragLeave={() => setEncima(false)}
      onDrop={alSoltar}
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-md border border-dashed px-3 py-2.5 text-sm transition-colors",
        encima ? "border-focus bg-focus/5" : "border-border-strong",
        disabled ? "opacity-50" : "focus-visible:border-focus",
        className,
      )}
    >
      {icono ?? <ImagePlus aria-hidden className="h-4 w-4 text-text-soft" />}
      <span className="flex-1 text-body">
        {label}
        {hint && <span className="block text-xs text-text-soft">{hint}</span>}
      </span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => input.current?.click()}
        className="rounded-md px-2 py-1 text-sm font-medium text-link hover:bg-hover"
      >
        Elegir archivo
      </button>
      <input
        ref={input}
        type="file"
        multiple
        accept={accept.join(",")}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          entregar(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
