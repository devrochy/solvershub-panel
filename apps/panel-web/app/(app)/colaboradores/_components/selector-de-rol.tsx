"use client";

import { Crown, User, UserCog } from "lucide-react";

import { cn } from "@/lib/utils";

export type RolSeleccion = { role: string; pack_roles: string[] };

type OpcionDeRol = {
  key: string;
  label: string;
  descripcion: string;
  icono: typeof User;
  seleccion: RolSeleccion;
};

/** Lo que hace cada rol de pack conocido, en palabras del negocio (EQU-11). */
const QUE_HACE: Record<string, { titulo: string; descripcion: string }> = {
  gestor: { titulo: "Salir a cobrar", descripcion: "Usa la app del celular y solo ve las carteras que le asignes." },
};

/**
 * Selector de rol de «Invitar a alguien»: tarjetas que dicen qué va a hacer la persona. Combina
 * los roles base (Colaborador, Master) con los roles de pack habilitados (p. ej. Gestor de
 * cobranza), que al elegirlos se guardan como `role: colaborador` + el rol de pack.
 */
export function SelectorDeRol({
  packRoles,
  esMaster,
  value,
  onChange,
}: {
  packRoles: { value: string; label: string }[];
  esMaster: boolean;
  value: RolSeleccion;
  onChange: (seleccion: RolSeleccion) => void;
}) {
  const opciones: OpcionDeRol[] = [
    {
      key: "colaborador",
      label: "Ayudar en el panel",
      descripcion: "Colaborador. Atiende conversaciones y clientes; después ajustas qué más puede ver.",
      icono: User,
      seleccion: { role: "colaborador", pack_roles: [] },
    },
    ...packRoles.map((p) => ({
      key: p.value,
      label: QUE_HACE[p.value]?.titulo ?? p.label,
      descripcion: QUE_HACE[p.value] ? `${p.label}. ${QUE_HACE[p.value].descripcion}` : `${p.label}, además de lo de un colaborador.`,
      icono: UserCog,
      seleccion: { role: "colaborador", pack_roles: [p.value] },
    })),
    ...(esMaster
      ? [
          {
            key: "master",
            label: "Master",
            descripcion: "Administra toda la plataforma.",
            icono: Crown,
            seleccion: { role: "master", pack_roles: [] },
          },
        ]
      : []),
  ];

  const activa = (o: OpcionDeRol) =>
    value.role === o.seleccion.role &&
    JSON.stringify(value.pack_roles) === JSON.stringify(o.seleccion.pack_roles);

  return (
    <div role="radiogroup" aria-label="Qué va a hacer" className="flex flex-col gap-2">
      {opciones.map((o) => {
        const Icono = o.icono;
        const elegida = activa(o);
        return (
          <button
            key={o.key}
            type="button"
            role="radio"
            aria-checked={elegida}
            onClick={() => onChange(o.seleccion)}
            className={cn(
              "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors",
              "hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
              elegida ? "border-focus bg-surface-2" : "border-control-border bg-bg-deep",
            )}
          >
            <Icono aria-hidden className={cn("mt-0.5 h-5 w-5 shrink-0", elegida ? "text-link" : "text-text-soft")} />
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-headline">{o.label}</span>
              <span className="text-xs leading-snug text-text-soft">{o.descripcion}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
