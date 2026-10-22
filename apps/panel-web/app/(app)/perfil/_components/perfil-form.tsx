"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Camera, KeyRound, Trash2 } from "lucide-react";

import { CampoTelefono } from "@/app/(app)/colaboradores/_components/campo-telefono";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { IconAction } from "@/components/ui/icon-action";
import { Input } from "@/components/ui/input";
import { InputPassword } from "@/components/ui/input-password";
import type { Me } from "@/lib/api/types";
import {
  marcarAvatarQuitado,
  marcarAvatarSubido,
  urlAvatarPropio,
  useAvatarPerfil,
} from "@/lib/avatar-version";
import { indicativoNumerico, parsearTelefono } from "@/lib/paises";
import { rolLabel } from "@/lib/labels";
import { toast } from "@/lib/toast-store";

/**
 * Perfil propio: cabecera con foto (agregar/quitar), nombre, correo, rol y negocio; datos
 * editables; y la contraseña en una modal. La foto se refresca al instante en la tarjeta del
 * menú y aquí (store compartido + `router.refresh`).
 */
export function PerfilForm({ me }: { me: Me }) {
  const router = useRouter();
  const inicial = parsearTelefono(me.telefono);
  const { version, preview } = useAvatarPerfil();
  const avatarSrc = urlAvatarPropio(me.avatar_url, { version, preview });

  const [nombre, setNombre] = useState(me.nombre ?? "");
  const [indicativo, setIndicativo] = useState(inicial.indicativo);
  const [numero, setNumero] = useState(inicial.numero);
  const [username, setUsername] = useState(me.username ?? "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [subiendo, setSubiendo] = useState(false);
  const fotoRef = useRef<HTMLInputElement>(null);

  const [passOpen, setPassOpen] = useState(false);
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [cambiando, setCambiando] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);

  const nombreMostrado = me.nombre?.trim() || me.username || me.email;

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGuardando(true);
    setError(null);
    const telefono = [`+${indicativoNumerico(indicativo)}`, numero.trim()].filter(Boolean).join(" ");
    const res = await fetch("/api/perfil", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, telefono, username }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    setGuardando(false);
    if (!res.ok) {
      setError(json.error ?? "No se pudo guardar el perfil.");
      return;
    }
    toast.success("Perfil actualizado.");
    router.refresh();
  }

  async function subirFoto(event: ChangeEvent<HTMLInputElement>) {
    const archivo = event.target.files?.[0];
    event.target.value = "";
    if (!archivo) return;
    const form = new FormData();
    form.append("file", archivo);
    setSubiendo(true);
    const res = await fetch("/api/perfil/avatar", { method: "POST", body: form });
    setSubiendo(false);
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(json.error ?? "No se pudo subir la foto.");
      return;
    }
    // Se ve al instante (preview) mientras el servidor refresca el resto del panel.
    marcarAvatarSubido(URL.createObjectURL(archivo));
    toast.success("Foto actualizada.");
    router.refresh();
  }

  async function quitarFoto() {
    setSubiendo(true);
    const res = await fetch("/api/perfil/avatar", { method: "DELETE" });
    setSubiendo(false);
    if (!res.ok) {
      toast.error("No se pudo quitar la foto.");
      return;
    }
    marcarAvatarQuitado();
    toast.success("Foto quitada.");
    router.refresh();
  }

  async function cambiarPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (nueva.length < 8) {
      setPassError("La contraseña nueva debe tener al menos 8 caracteres.");
      return;
    }
    if (nueva !== confirmar) {
      setPassError("Las contraseñas no coinciden.");
      return;
    }
    setCambiando(true);
    setPassError(null);
    const res = await fetch("/api/perfil/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actual, nueva }),
    });
    setCambiando(false);
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setPassError(json.error ?? "No se pudo cambiar la contraseña.");
      return;
    }
    toast.success("Contraseña cambiada.");
    setActual("");
    setNueva("");
    setConfirmar("");
    setPassOpen(false);
  }

  return (
    <section className="rounded-xl border border-border-soft bg-surface p-5 sm:p-6">
      <div className="mb-4 flex justify-end">
        <Dialog open={passOpen} onOpenChange={setPassOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" size="sm">
              <KeyRound aria-hidden className="h-4 w-4" />
              Cambiar contraseña
            </Button>
          </DialogTrigger>
          <DialogContent
            title="Cambiar contraseña"
            description="Escribe tu contraseña actual y la nueva."
            className="max-w-md"
          >
            <form onSubmit={cambiarPassword} noValidate className="flex flex-col gap-4">
              <Field label="Contraseña actual" htmlFor="perfil-actual" required>
                <InputPassword
                  id="perfil-actual"
                  value={actual}
                  onChange={(e) => setActual(e.target.value)}
                  placeholder="Tu contraseña actual"
                  autoComplete="current-password"
                />
              </Field>
              <Field label="Contraseña nueva" htmlFor="perfil-nueva" required>
                <InputPassword
                  id="perfil-nueva"
                  value={nueva}
                  onChange={(e) => setNueva(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                />
              </Field>
              <Field
                label="Repite la contraseña nueva"
                htmlFor="perfil-confirmar"
                required
                error={passError ?? undefined}
              >
                <InputPassword
                  id="perfil-confirmar"
                  value={confirmar}
                  onChange={(e) => setConfirmar(e.target.value)}
                  placeholder="Repite la contraseña"
                  autoComplete="new-password"
                />
              </Field>
              <div className="flex justify-end gap-2">
                <DialogClose asChild>
                  <Button type="button" variant="ghost">
                    Cancelar
                  </Button>
                </DialogClose>
                <Button type="submit" variant="accent" loading={cambiando} disabled={!actual || !nueva}>
                  Guardar contraseña
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-[13rem_1fr]">
        <div className="flex flex-col items-center gap-3">
          <Avatar name={nombreMostrado} src={avatarSrc} size="xl" />
          <div className="flex w-24 items-center justify-center gap-1">
            <IconAction
              label="Cambiar foto"
              tone="editar"
              onClick={() => fotoRef.current?.click()}
              disabled={subiendo}
            >
              <Camera className="h-4 w-4" aria-hidden />
            </IconAction>
            <input
              ref={fotoRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              onChange={(e) => void subirFoto(e)}
            />
            {(me.avatar_url || preview) && (
              <IconAction label="Quitar foto" tone="eliminar" onClick={() => void quitarFoto()} disabled={subiendo}>
                <Trash2 className="h-4 w-4" aria-hidden />
              </IconAction>
            )}
          </div>
          <div className="flex flex-col items-center gap-1 text-center">
            <h2 className="font-display text-sh-block text-headline">{nombreMostrado}</h2>
            <span className="text-sm text-body">{me.email}</span>
            <div className="mt-1 flex flex-wrap justify-center gap-1.5">
              <Badge variant={me.role === "master" ? "accent" : "neutral"}>{rolLabel(me.role)}</Badge>
              {me.tenant && <Badge variant="neutral">{me.tenant.name}</Badge>}
            </div>
          </div>
        </div>

        <form onSubmit={guardar} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-12">
            <Field className="sm:col-span-7" label="Nombre completo" htmlFor="perfil-nombre">
              <Input
                id="perfil-nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre y apellido"
                autoComplete="name"
              />
            </Field>
            <Field
              className="sm:col-span-5"
              label="Correo"
              htmlFor="perfil-email"
              help="El correo no se puede cambiar."
            >
              <Input id="perfil-email" value={me.email} readOnly disabled />
            </Field>

            <div className="sm:col-span-7">
              <CampoTelefono
                indicativo={indicativo}
                numero={numero}
                onIndicativo={setIndicativo}
                onNumero={setNumero}
              />
            </div>
            <Field
              className="sm:col-span-5"
              label="Usuario"
              htmlFor="perfil-username"
              help="Único y sin espacios. Puedes dejarlo vacío."
              error={error ?? undefined}
            >
              <Input
                id="perfil-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ana.perez"
                autoComplete="username"
              />
            </Field>
          </div>

          <div className="flex justify-end">
            <Button type="submit" variant="accent" loading={guardando}>
              Guardar cambios
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
