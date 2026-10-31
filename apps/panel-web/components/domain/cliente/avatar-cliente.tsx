"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Avatar } from "@/components/ui/avatar";
import { IconAction } from "@/components/ui/icon-action";

/**
 * Avatar central de la ficha con cambio de foto. La subida y el borrado van por
 * el BFF del panel; el backend guarda la imagen en el almacenamiento del negocio.
 */
export function AvatarCliente({
  leadId,
  nombre,
  avatarUrl,
}: {
  leadId: string;
  nombre: string;
  avatarUrl?: string | null;
}) {
  const router = useRouter();
  const entrada = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  async function subir(event: ChangeEvent<HTMLInputElement>) {
    const archivo = event.target.files?.[0];
    event.target.value = "";
    if (!archivo) return;
    if (archivo.size > 2 * 1024 * 1024) {
      setError("La imagen no puede superar 2 MB.");
      return;
    }
    setError(null);
    setSubiendo(true);
    setPreview(URL.createObjectURL(archivo));
    const form = new FormData();
    form.append("file", archivo);
    const res = await fetch(`/api/leads/${encodeURIComponent(leadId)}/avatar`, {
      method: "POST",
      body: form,
    }).catch(() => null);
    const json = (await res?.json().catch(() => ({}))) as { error?: string } | undefined;
    setSubiendo(false);
    if (!res?.ok) {
      setPreview(null);
      setError(json?.error ?? "No se pudo subir la foto.");
      return;
    }
    router.refresh();
  }

  async function quitar() {
    setSubiendo(true);
    setError(null);
    const res = await fetch(`/api/leads/${encodeURIComponent(leadId)}/avatar`, { method: "DELETE" }).catch(
      () => null,
    );
    setSubiendo(false);
    if (!res?.ok) {
      setError("No se pudo quitar la foto.");
      return;
    }
    setPreview(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <Avatar name={nombre} src={preview ?? avatarUrl} size="2xl" />
        <div className="absolute -bottom-1 right-0 flex items-center gap-1 rounded-full border border-border-soft bg-surface p-0.5 shadow-elev-1">
          <IconAction
            label={`Cambiar la foto de ${nombre}`}
            tone="editar"
            onClick={() => entrada.current?.click()}
            disabled={subiendo}
          >
            {subiendo ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Camera className="h-4 w-4" aria-hidden />}
          </IconAction>
          {avatarUrl || preview ? (
            <IconAction
              label={`Quitar la foto de ${nombre}`}
              tone="eliminar"
              onClick={() => void quitar()}
              disabled={subiendo}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </IconAction>
          ) : null}
        </div>
        <input
          ref={entrada}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          onChange={(e) => void subir(e)}
        />
      </div>
      {error ? (
        <p role="alert" className="text-xs text-status-danger-fg">
          {error}
        </p>
      ) : null}
    </div>
  );
}
