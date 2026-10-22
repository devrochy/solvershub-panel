"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Camera, Trash2 } from "lucide-react";

import { CampoTelefono } from "@/app/(app)/colaboradores/_components/campo-telefono";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputPassword } from "@/components/ui/input-password";
import type { Me } from "@/lib/api/types";
import { indicativoNumerico, parsearTelefono } from "@/lib/paises";
import { toast } from "@/lib/toast-store";

/**
 * Perfil propio: foto, nombre, teléfono, usuario y contraseña. Guarda contra el BFF y refresca
 * la vista del servidor para que la tarjeta del menú y el avatar se actualicen.
 */
export function PerfilForm({ me }: { me: Me }) {
  const router = useRouter();
  const inicial = parsearTelefono(me.telefono);

  const [nombre, setNombre] = useState(me.nombre ?? "");
  const [indicativo, setIndicativo] = useState(inicial.indicativo);
  const [numero, setNumero] = useState(inicial.numero);
  const [username, setUsername] = useState(me.username ?? "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [subiendo, setSubiendo] = useState(false);
  const fotoRef = useRef<HTMLInputElement>(null);

  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [cambiando, setCambiando] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);

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
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <section className="flex flex-col gap-5 rounded-lg border border-border-soft bg-surface p-5">
        <h2 className="font-display text-sh-block text-headline">Datos personales</h2>

        <div className="flex items-center gap-4">
          <Avatar name={me.nombre || me.username || me.email} src={me.avatar_url ? "/api/perfil/avatar" : null} size="lg" />
          <div className="flex flex-col gap-2">
            <input
              ref={fotoRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              onChange={(e) => void subirFoto(e)}
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => fotoRef.current?.click()} loading={subiendo}>
                <Camera aria-hidden className="h-4 w-4" />
                Cambiar foto
              </Button>
              {me.avatar_url && (
                <Button type="button" variant="ghost" size="sm" onClick={() => void quitarFoto()} disabled={subiendo}>
                  <Trash2 aria-hidden className="h-4 w-4" />
                  Quitar
                </Button>
              )}
            </div>
            <span className="text-xs text-text-soft">JPG, PNG, WebP o GIF de hasta 2 MB.</span>
          </div>
        </div>

        <form onSubmit={guardar} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre completo" htmlFor="perfil-nombre">
              <Input
                id="perfil-nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre y apellido"
                autoComplete="name"
              />
            </Field>
            <Field label="Correo" htmlFor="perfil-email" help="El correo no se puede cambiar.">
              <Input id="perfil-email" value={me.email} readOnly disabled />
            </Field>
          </div>

          <CampoTelefono
            indicativo={indicativo}
            numero={numero}
            onIndicativo={setIndicativo}
            onNumero={setNumero}
          />

          <Field
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

          <div className="flex justify-end">
            <Button type="submit" variant="accent" loading={guardando}>
              Guardar cambios
            </Button>
          </div>
        </form>
      </section>

      <section className="flex flex-col gap-4 self-start rounded-lg border border-border-soft bg-surface p-5">
        <h2 className="font-display text-sh-block text-headline">Contraseña</h2>
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
          <div className="flex justify-end">
            <Button type="submit" variant="outline" loading={cambiando} disabled={!actual || !nueva}>
              Cambiar contraseña
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
