"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { CollectorPermissionsDialog } from "@/app/(app)/cobranza/_components/collector-permissions-dialog";
import { SelectorDeNegocio } from "@/app/(app)/colaboradores/_components/selector-de-negocio";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { Field } from "@/components/ui/field";
import { InputPassword } from "@/components/ui/input-password";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Switch } from "@/components/ui/switch";
import type { CollaboratorItem } from "@/lib/api/types";
import { esDueno, perfilDePack, puedeEliminar, rolDeCuenta } from "@/lib/colaboradores";
import { rolLabel } from "@/lib/labels";
import { useAction } from "@/lib/use-action";

type Accion = "toggle" | "password" | "link" | "unlink" | "delete" | "reactivate";

/** POST al BFF de una cuenta, con el formato que espera `useAction`. */
async function enviar(id: string, action: Accion, payload: Record<string, unknown>, success: string) {
  const res = await fetch(`/api/collaborators/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: string };
  return { ok: res.ok, status: res.status, error: json.error, success };
}

/**
 * Activar o desactivar el acceso (EQU-04), desde la ficha o el menú de la fila. Desactivar pide
 * confirmación porque corta el acceso enseguida y libera el cupo del plan.
 */
export function useAlternarAcceso(persona: CollaboratorItem) {
  const confirm = useConfirm();
  const { run, pending } = useAction();
  const nombre = persona.nombre || persona.email;

  async function alternar(activar: boolean) {
    if (!activar) {
      const aceptado = await confirm({
        title: `Desactivar el acceso de ${nombre}`,
        description:
          "Deja de entrar al panel enseguida y sus permisos dejan de aplicar hasta que lo actives. Su historial se queda. Libera su cupo del plan: para activarlo de nuevo necesitarás cupo.",
        confirmLabel: "Desactivar el acceso",
        destructive: true,
      });
      if (!aceptado) return false;
    }
    return run(() => enviar(persona.id, "toggle", {}, activar ? "Acceso activado." : "Acceso desactivado."));
  }

  return { alternar, pending };
}

/**
 * Baja lógica de una persona del equipo (ADR-0198). Pide confirmación porque corta el acceso y
 * la saca de Equipo; el historial, los registros de cartera y el Gestor se conservan.
 */
export function useEliminarPersona(persona: CollaboratorItem) {
  const confirm = useConfirm();
  const { run, pending } = useAction();
  const router = useRouter();
  const nombre = persona.nombre || persona.email;

  async function eliminar() {
    const aceptado = await confirm({
      title: `Eliminar a ${nombre} del equipo`,
      description:
        "Deja de entrar al panel y desaparece del equipo. Se conservan su historial y los registros que hizo en las carteras (pagos, notas, gastos). El correo no se reasigna: si vuelve, se reactiva esta misma cuenta.",
      confirmLabel: "Eliminar del equipo",
      destructive: true,
    });
    if (!aceptado) return false;
    const ok = await run(() => enviar(persona.id, "delete", {}, "Cuenta eliminada."));
    if (ok) router.replace("/colaboradores", { scroll: false });
    return ok;
  }

  return { eliminar, pending };
}

/** Reactiva la MISMA cuenta eliminada, con su correo, historial y perfil de Gestor (ADR-0198). */
export function useReactivarPersona(persona: CollaboratorItem) {
  const confirm = useConfirm();
  const { run, pending } = useAction();
  const router = useRouter();
  const nombre = persona.nombre || persona.email;

  async function reactivar() {
    const aceptado = await confirm({
      title: `Reactivar a ${nombre}`,
      description:
        "Vuelve a entrar al panel y a su lugar en el equipo. Su historial, sus carteras y su perfil de Cobranza siguen asociados a esta misma cuenta. Restablécele la contraseña si no la recuerda.",
      confirmLabel: "Reactivar cuenta",
    });
    if (!aceptado) return false;
    const ok = await run(() => enviar(persona.id, "reactivate", {}, "Cuenta reactivada."));
    if (ok) router.replace("/colaboradores", { scroll: false });
    return ok;
  }

  return { reactivar, pending };
}

/** Qué hace cada rol, para leerlo en la ficha. */
function descripcionDeRol(persona: CollaboratorItem): string {
  if (persona.is_platform_master) return "Administra toda la plataforma.";
  if (esDueno(persona)) return "Ve y cambia todo el negocio.";
  if (persona.role === "tester") return "Prueba el panel con datos de prueba.";
  return "Usa el panel según sus permisos.";
}

function Bloque({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-medium text-headline">{titulo}</h3>
      {children}
    </section>
  );
}

const ROLES_VINCULO = [
  { value: "colaborador", label: "Colaborador" },
  { value: "owner", label: "Dueño" },
];

/**
 * Pestaña Acceso de la ficha (EQU-03): si puede entrar, su rol, sus negocios, su perfil de
 * Cobranza y su contraseña. Lo que la sesión no puede hacer no se muestra.
 */
export function AccesoDePersona({
  persona,
  puedeActuar,
  esMaster,
  abrirContrasena = false,
}: {
  persona: CollaboratorItem;
  puedeActuar: boolean;
  esMaster: boolean;
  /** Llega desde «Restablecer la contraseña» del menú de la fila. */
  abrirContrasena?: boolean;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const { run, pending } = useAction();
  const { alternar, pending: alternando } = useAlternarAcceso(persona);
  const { eliminar, pending: eliminando } = useEliminarPersona(persona);
  const { reactivar, pending: reactivando } = useReactivarPersona(persona);
  const [activa, setActiva] = useState(persona.active);
  const [cambiandoClave, setCambiandoClave] = useState(abrirContrasena);
  const [negocio, setNegocio] = useState<{ slug: string; name: string } | null>(null);
  const [rolVinculo, setRolVinculo] = useState("colaborador");
  const nombre = persona.nombre || persona.email;
  const perfiles = (persona.pack_profiles ?? []).map(perfilDePack);
  const puedeDesvincular = puedeActuar && !persona.is_self;

  async function cambiarAcceso(activar: boolean) {
    setActiva(activar);
    const ok = await alternar(activar);
    if (!ok) setActiva(!activar);
  }

  async function desvincular(link: CollaboratorItem["links"][number]) {
    const aceptado = await confirm({
      title: `Desvincular de ${link.name}`,
      description:
        "Deja de ver ese negocio y sus permisos ahí dejan de aplicar. Para volver, habrá que vincularla o invitarla de nuevo.",
      confirmLabel: "Desvincular",
      destructive: true,
    });
    if (!aceptado) return;
    await run(() => enviar(persona.id, "unlink", { tenant: link.slug }, `Desvinculada de ${link.name}.`));
  }

  function vincular() {
    if (!negocio) return;
    void run(async () => {
      const r = await enviar(persona.id, "link", { tenant: negocio.slug, role: rolVinculo }, `Vinculada a ${negocio.name}.`);
      if (r.ok) setNegocio(null);
      return r;
    });
  }

  async function cambiarClave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get("password") ?? "");
    const ok = await run(() => enviar(persona.id, "password", { password }, "Contraseña cambiada."));
    if (ok) setCambiandoClave(false);
  }

  if (persona.deleted) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1 rounded-lg border border-border-soft bg-surface-2 p-4">
          <span className="text-sm font-medium text-headline">Esta cuenta está eliminada</span>
          <span className="text-xs text-text-soft">
            No puede entrar al panel. Su historial, sus carteras y los registros que hizo se conservan.
          </span>
        </div>
        {persona.can_reactivate ? (
          <Button
            type="button"
            variant="accent"
            size="sm"
            className="self-start"
            onClick={() => void reactivar()}
            loading={reactivando}
          >
            Reactivar cuenta
          </Button>
        ) : (
          <p className="text-xs text-text-soft">Un administrador de la plataforma puede reactivarla.</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-lg border border-border-soft bg-surface-2 p-4">
        {puedeActuar && !persona.is_self ? (
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 flex-col">
              <label htmlFor={`acceso-${persona.id}`} className="text-sm font-medium text-headline">
                Puede entrar al panel
              </label>
              <span className="text-xs text-text-soft">Si lo apagas, deja de entrar enseguida. Su historial se queda.</span>
            </div>
            <Switch
              id={`acceso-${persona.id}`}
              checked={activa}
              onCheckedChange={(v) => void cambiarAcceso(v)}
              disabled={alternando}
              aria-label={`Acceso de ${nombre} al panel`}
            />
          </div>
        ) : (
          <p className="text-sm text-headline">{persona.active ? "Puede entrar al panel." : "Su acceso está desactivado."}</p>
        )}
        <div className="flex flex-col border-t border-border-soft pt-3">
          <span className="text-sm font-medium text-headline">{rolDeCuenta(persona)}</span>
          <span className="text-xs text-text-soft">{descripcionDeRol(persona)}</span>
        </div>
      </div>

      <Bloque titulo="Negocios">
        {persona.links.length === 0 ? (
          <p className="text-sm text-text-soft">Todavía no está vinculada a ningún negocio.</p>
        ) : (
          <ul className="overflow-hidden rounded-lg border border-border-soft">
            {persona.links.map((link) => (
              <li
                key={`${link.slug}-${link.role}`}
                className="flex items-center justify-between gap-3 border-b border-border-soft px-3 py-2 last:border-b-0"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm text-headline">{link.name}</span>
                  <span className="text-xs text-text-soft">{rolLabel(link.role)}</span>
                </span>
                {puedeDesvincular && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void desvincular(link)}
                    disabled={pending}
                    aria-label={`Desvincular de ${link.name}`}
                  >
                    Desvincular
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
        {esMaster && (
          <div className="flex flex-col gap-3 rounded-lg border border-border-soft p-3">
            <span className="text-sm text-headline">Vincular a otro negocio</span>
            <Field label="Negocio" htmlFor={`vincular-${persona.id}`}>
              <SelectorDeNegocio
                id={`vincular-${persona.id}`}
                label="Negocio"
                value={negocio?.slug ?? ""}
                nombre={negocio?.name}
                onChange={(slug, name) => setNegocio({ slug, name })}
              />
            </Field>
            <SegmentedControl label="Rol en ese negocio" options={ROLES_VINCULO} value={rolVinculo} onChange={setRolVinculo} className="self-start" />
            <Button type="button" variant="outline" size="sm" className="self-start" onClick={vincular} disabled={pending || !negocio}>
              Vincular
            </Button>
          </div>
        )}
      </Bloque>

      {perfiles.length > 0 && (
        <Bloque titulo="En Cobranza">
          {perfiles.map((perfil) => (
            <div key={perfil.clave} className="flex flex-col gap-1 text-sm">
              <span className="text-headline">
                {perfil.etiqueta}
                {perfil.detalle?.estatus && <span className="text-text-soft"> · {perfil.detalle.estatus}</span>}
              </span>
              {perfil.detalle && (
                <span className="text-text-soft">
                  {perfil.detalle.carteras.length === 0
                    ? "Sin carteras asignadas"
                    : `Carteras: ${perfil.detalle.carteras.map((c) => c.nombre).join(", ")}`}
                  {perfil.detalle.permisos &&
                    ` · ${perfil.detalle.permisos.activos} de ${perfil.detalle.permisos.total} permisos de campo`}
                </span>
              )}
              {perfil.detalle && (
                <span className="flex flex-wrap gap-x-4 gap-y-1">
                  <Link className="text-link hover:underline" href="/cobranza/gestores">
                    Asignar carteras
                  </Link>
                  {perfil.edicion && (
                    <CollectorPermissionsDialog
                      collectorId={perfil.edicion.refId}
                      nombre={nombre}
                      onSaved={() => router.refresh()}
                      trigger={
                        <button
                          type="button"
                          className="text-link hover:underline focus-visible:outline-2 focus-visible:outline-focus"
                          aria-label={`Permisos de campo de ${nombre}`}
                        >
                          Cambiar los permisos de campo
                        </button>
                      }
                    />
                  )}
                </span>
              )}
            </div>
          ))}
        </Bloque>
      )}

      {puedeActuar && (
        <Bloque titulo="Contraseña">
          {cambiandoClave ? (
            <form onSubmit={(e) => void cambiarClave(e)} className="flex flex-col gap-3">
              <Field
                label="Nueva contraseña"
                htmlFor={`clave-${persona.id}`}
                required
                help={persona.is_self ? "Mínimo 8 caracteres." : "Mínimo 8 caracteres. Compártela tú: con ella vuelve a entrar."}
              >
                <InputPassword id={`clave-${persona.id}`} name="password" required minLength={8} autoComplete="new-password" autoFocus />
              </Field>
              <div className="flex gap-2">
                <Button type="submit" variant="outline" size="sm" loading={pending}>
                  Cambiar la contraseña
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setCambiandoClave(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          ) : (
            <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => setCambiandoClave(true)}>
              Restablecer la contraseña
            </Button>
          )}
        </Bloque>
      )}

      {puedeEliminar(persona) && (
        <Bloque titulo="Zona de riesgo">
          <p className="text-xs text-text-soft">
            Eliminar la cuenta le quita el acceso y la saca del equipo. Su historial y los registros
            que hizo en las carteras se conservan; el correo no se reasigna.
          </p>
          <Button
            type="button"
            variant="danger"
            size="sm"
            className="self-start"
            onClick={() => void eliminar()}
            loading={eliminando}
          >
            Eliminar del equipo
          </Button>
        </Bloque>
      )}
    </div>
  );
}
