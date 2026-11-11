"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Check, MailPlus, X } from "lucide-react";

import { CampoTelefono } from "@/components/ui/campo-telefono";
import { SelectorDeRol, type RolSeleccion } from "@/app/(app)/colaboradores/_components/selector-de-rol";
import { AvisoLimiteDePlan } from "@/components/domain/aviso-limite-de-plan";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputPassword } from "@/components/ui/input-password";
import { esLimiteDePlan } from "@/lib/plan-limite";
import { useAction } from "@/lib/use-action";
import { PAIS_POR_DEFECTO, indicativoNumerico } from "@/lib/paises";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type EstadoUsername = "idle" | "checking" | "libre" | "ocupado" | "invalido";

/**
 * «Invitar a alguien» (EQU-11, D-SPEC-34): primero el correo. Si ya tiene cuenta se le envía
 * una invitación; si no, se le crea una con usuario y contraseña (la API no invita correos sin
 * cuenta). El rol se elige por lo que hará y el negocio es siempre el activo.
 */
export function NewCollaboratorDialog({
  packRoles = [],
  esMaster = false,
}: {
  packRoles?: { value: string; label: string }[];
  esMaster?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [paso, setPaso] = useState<"email" | "perfil">("email");

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [existe, setExiste] = useState(false);
  const [buscando, setBuscando] = useState(false);

  const [nombre, setNombre] = useState("");
  const [username, setUsername] = useState("");
  const [estadoUsername, setEstadoUsername] = useState<EstadoUsername>("idle");
  const [rol, setRol] = useState<RolSeleccion>({ role: "colaborador", pack_roles: [] });
  const [indicativo, setIndicativo] = useState(PAIS_POR_DEFECTO);
  const [numero, setNumero] = useState("");
  const [password, setPassword] = useState("");
  const [limite, setLimite] = useState<string | null>(null);

  const { run, pending } = useAction();
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, []);

  function reiniciar() {
    setPaso("email");
    setEmail("");
    setEmailError(null);
    setExiste(false);
    setNombre("");
    setUsername("");
    setEstadoUsername("idle");
    setRol({ role: "colaborador", pack_roles: [] });
    setIndicativo(PAIS_POR_DEFECTO);
    setNumero("");
    setPassword("");
    setLimite(null);
  }

  async function verificarEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const correo = email.trim();
    if (!EMAIL_RE.test(correo)) {
      setEmailError("Escribe un correo válido, por ejemplo ana@correo.com.");
      return;
    }
    setEmailError(null);
    setBuscando(true);
    try {
      const res = await fetch(`/api/collaborators/existe?email=${encodeURIComponent(correo)}`);
      const json = (await res.json().catch(() => null)) as { existe?: boolean } | null;
      setExiste(json?.existe ?? false);
      setPaso("perfil");
    } catch {
      setEmailError("No se pudo verificar el correo. Inténtalo de nuevo.");
    } finally {
      setBuscando(false);
    }
  }

  function cambiarUsername(valor: string) {
    setUsername(valor);
    const limpio = valor.trim();
    if (!limpio) {
      setEstadoUsername("idle");
      return;
    }
    if (!/^[a-z0-9._-]+$/i.test(limpio) || limpio.length < 3) {
      setEstadoUsername("invalido");
      return;
    }
    setEstadoUsername("checking");
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/collaborators/username-disponible?username=${encodeURIComponent(limpio)}`);
        const json = (await res.json().catch(() => null)) as { disponible?: boolean } | null;
        setEstadoUsername(json?.disponible ? "libre" : "ocupado");
      } catch {
        setEstadoUsername("idle");
      }
    }, 350);
  }

  const passwordValida = password.length >= 8;

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const telefono = [`+${indicativoNumerico(indicativo)}`, numero.trim()].filter(Boolean).join(" ");
    const ok = await run(async () => {
      const res = await fetch(existe ? "/api/invitations" : "/api/collaborators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          existe
            ? { email: email.trim(), role: rol.role, pack_roles: rol.pack_roles }
            : {
                email: email.trim(),
                password,
                role: rol.role,
                username: username.trim(),
                nombre: nombre.trim(),
                telefono,
                pack_roles: rol.pack_roles,
              },
        ),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; code?: string; resultado?: string };
      if (!res.ok) {
        setLimite(esLimiteDePlan(json.code) ? (json.error ?? "Llegaste al tope de colaboradores de tu plan.") : null);
        return { ok: false, status: res.status, error: json.error ?? "No se pudo guardar." };
      }
      setLimite(null);
      return { ok: true, success: existe ? "Invitación enviada." : "Colaborador agregado." };
    });
    if (ok) {
      reiniciar();
      setOpen(false);
    }
  }

  const puedeEnviar =
    !pending &&
    (!existe
      ? nombre.trim().length > 0 && username.trim().length >= 3 && estadoUsername === "libre" && passwordValida
      : true);

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reiniciar(); }}>
      <DialogTrigger asChild>
        <Button variant="accent">Invitar a alguien</Button>
      </DialogTrigger>
      <DialogContent
        title="Invitar a alguien"
        description={
          paso === "email"
            ? "Escribe su correo. Si ya tiene cuenta, le llega una invitación a este negocio; si no, le creas una."
            : existe
              ? "Ya tiene cuenta: elige qué va a hacer y le llega la invitación a este negocio."
              : "Todavía no tiene cuenta: completa sus datos y la creas en este negocio."
        }
      >
        {paso === "email" && (
          <form onSubmit={verificarEmail} noValidate className="flex flex-col gap-4">
            <Field label="Correo" htmlFor="new-email" required error={emailError ?? undefined} help="Con este correo entra al panel.">
              <Input
                id="new-email"
                name="email"
                type="email"
                autoFocus
                required
                autoComplete="off"
                placeholder="ana@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <div className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button type="button" variant="ghost">Cancelar</Button>
              </DialogClose>
              <Button type="submit" variant="accent" loading={buscando}>
                Continuar
              </Button>
            </div>
          </form>
        )}

        {paso === "perfil" && (
          <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
            <p className="flex flex-wrap items-center gap-x-2 text-sm text-body">
              Para <strong className="font-medium text-headline">{email.trim()}</strong>
              <button
                type="button"
                onClick={() => setPaso("email")}
                className="text-link hover:underline focus-visible:outline-2 focus-visible:outline-focus"
              >
                Cambiar el correo
              </button>
            </p>
            {existe && (
              <p className="flex items-start gap-2 rounded-lg border border-status-warning-border bg-status-warning-bg px-3 py-2.5 text-sm text-status-warning-fg">
                <MailPlus aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
                Ya existe una cuenta con este correo. Le llega una invitación y entra a tu negocio cuando la acepte.
              </p>
            )}

            {!existe && (
              <Field label="Nombre completo" htmlFor="new-nombre" required>
                <Input
                  id="new-nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Nombre y apellido"
                  autoComplete="name"
                />
              </Field>
            )}

            {!existe && (
              <CampoTelefono
                indicativo={indicativo}
                numero={numero}
                onIndicativo={setIndicativo}
                onNumero={setNumero}
              />
            )}

            <div className="flex flex-col gap-1.5">
              <span className="text-sh-label font-medium text-body">¿Qué va a hacer?</span>
              <SelectorDeRol packRoles={packRoles} esMaster={esMaster} value={rol} onChange={setRol} />
            </div>

            {!existe && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Usuario"
                  htmlFor="new-username"
                  required
                  help="Único y sin espacios."
                  error={
                    estadoUsername === "ocupado"
                      ? "Ese usuario ya está en uso."
                      : estadoUsername === "invalido"
                        ? "Mínimo 3 caracteres: letras, números, puntos, guiones."
                        : undefined
                  }
                >
                  <div className="relative">
                    <Input
                      id="new-username"
                      value={username}
                      onChange={(e) => cambiarUsername(e.target.value)}
                      placeholder="ana.perez"
                      autoComplete="off"
                      className="pr-8"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-soft">
                      {estadoUsername === "libre" && <Check aria-hidden className="h-4 w-4 text-status-success-fg" />}
                      {estadoUsername === "ocupado" && <X aria-hidden className="h-4 w-4 text-status-danger-fg" />}
                    </span>
                  </div>
                  <span aria-live="polite">
                    {estadoUsername === "checking" && <span className="text-xs text-text-soft">Revisando si está libre…</span>}
                    {estadoUsername === "libre" && <span className="text-xs text-status-success-fg">Disponible</span>}
                  </span>
                </Field>

                <Field
                  label="Contraseña"
                  htmlFor="new-password"
                  required
                  help="Mínimo 8 caracteres. Compártela tú: con ella entra la primera vez."
                  error={password.length > 0 && !passwordValida ? "Mínimo 8 caracteres." : undefined}
                >
                  <InputPassword
                    id="new-password"
                    name="password"
                    required
                    autoComplete="new-password"
                    placeholder="Mínimo 8 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </Field>
              </div>
            )}

            {limite && <AvisoLimiteDePlan mensaje={limite} />}

            <div className="mt-2 flex justify-end gap-2">
              <DialogClose asChild>
                <Button type="button" variant="ghost">Cancelar</Button>
              </DialogClose>
              <Button type="submit" variant="accent" disabled={!puedeEnviar} loading={pending}>
                {existe ? "Enviar invitación" : "Crear la cuenta"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
