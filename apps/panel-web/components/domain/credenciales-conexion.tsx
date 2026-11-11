"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { InputPassword } from "@/components/ui/input-password";
import type { CampoCredencial } from "@/lib/conexiones";

const SEGUNDOS_VISIBLE = 60;

/**
 * Datos de registro de una conexión. Los secretos se muestran enmascarados y cada uno
 * tiene su propio ojo; al pulsarlo se pide la contraseña del usuario y se revelan los
 * secretos durante 60 s. Los secretos de la plataforma no se pueden revelar.
 */
/** Los nombres técnicos de Meta y del correo, dichos como los entiende el dueño. */
const ETIQUETAS_CREDENCIAL: Record<string, string> = {
  app_id: "Identificador de la app",
  app_secret: "Clave secreta de la app",
  waba_id: "Cuenta de WhatsApp Business",
  phone_number_id: "Identificador del número",
  access_token: "Token de acceso",
  verify_token: "Clave de verificación",
  host: "Servidor de correo",
  port: "Puerto",
  username: "Usuario",
  password: "Contraseña",
};

export function etiquetaDeCredencial(campo: { name: string; label: string }): string {
  return ETIQUETAS_CREDENCIAL[campo.name] ?? campo.label;
}

export function CredencialesConexion({
  campos,
  revealUrl,
}: {
  campos: CampoCredencial[];
  revealUrl: string;
}) {
  const [revelados, setRevelados] = useState<Record<string, string>>({});
  const [visibles, setVisibles] = useState<Record<string, boolean>>({});
  const [pidiendo, setPidiendo] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, []);

  function ocultarTodo() {
    setRevelados({});
    setVisibles({});
    if (temporizador.current) clearTimeout(temporizador.current);
  }

  async function revelar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pidiendo) return;
    setEnviando(true);
    setError(null);
    const res = await fetch(revealUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const json = (await res.json().catch(() => null)) as
      | { secrets?: Record<string, string>; error?: string }
      | null;
    setEnviando(false);
    setPassword("");
    if (!res.ok || !json?.secrets) {
      setError(json?.error ?? "No se pudieron revelar los secretos.");
      return;
    }
    setRevelados(json.secrets);
    setVisibles({ [pidiendo]: true });
    setPidiendo(null);
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(ocultarTodo, SEGUNDOS_VISIBLE * 1000);
  }

  function alternar(campo: CampoCredencial) {
    if (!campo.secret) return;
    if (campo.platform) return;
    if (!campo.configured) return;
    if (revelados[campo.name] === undefined) {
      setError(null);
      setPassword("");
      setPidiendo(campo.name);
      return;
    }
    setVisibles((prev) => ({ ...prev, [campo.name]: !prev[campo.name] }));
  }

  return (
    <>
      <dl className="divide-y divide-border-soft rounded-lg border border-border-soft">
        {campos.map((campo) => {
          const revelado = revelados[campo.name];
          const visible = visibles[campo.name] ?? false;
          const puedeMostrar = campo.secret && campo.configured && !campo.platform;
          return (
            <div key={campo.name} className="flex flex-wrap items-center gap-2 px-4 py-3">
              <dt className="w-48 shrink-0 text-sm text-text-soft">
                {etiquetaDeCredencial(campo)}
              </dt>
              <dd className="flex min-w-0 flex-1 items-center gap-2 text-sm text-headline">
                {campo.platform ? (
                  <span className="text-text-soft">Gestionado por la plataforma</span>
                ) : campo.secret ? (
                  campo.configured ? (
                    <span className={visible ? "break-all font-mono text-xs" : "font-mono tracking-widest"}>
                      {visible ? (revelado ?? "••••••••") : "••••••••"}
                    </span>
                  ) : (
                    <span className="text-text-soft">Sin configurar</span>
                  )
                ) : (
                  <span className="break-all">{campo.value ?? "—"}</span>
                )}
              </dd>
              {puedeMostrar && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => alternar(campo)}
                  aria-label={visible ? `Ocultar ${etiquetaDeCredencial(campo)}` : `Mostrar ${etiquetaDeCredencial(campo)}`}
                  aria-pressed={visible}
                  className="shrink-0 pointer-coarse:h-11 pointer-coarse:w-11"
                >
                  {visible ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                </Button>
              )}
            </div>
          );
        })}
      </dl>

      <Dialog
        open={pidiendo !== null}
        onOpenChange={(abierto) => {
          if (!abierto) {
            setPidiendo(null);
            setPassword("");
            setError(null);
          }
        }}
      >
        <DialogContent
          title="Confirmar contraseña"
          description="Para mostrar los secretos, confirma tu contraseña actual."
          className="max-w-md"
        >
          <form onSubmit={revelar} className="flex flex-col gap-4">
            <Field label="Contraseña actual" htmlFor="credenciales-password" required>
              <InputPassword
                id="credenciales-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                autoFocus
              />
            </Field>
            <FormFeedback error={error} />
            <p className="text-xs text-text-soft">
              Los secretos se vuelven a ocultar a los {SEGUNDOS_VISIBLE} s.
            </p>
            <div className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button type="button" variant="ghost" size="sm">
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" variant="accent" size="sm" loading={enviando} disabled={!password}>
                Mostrar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
