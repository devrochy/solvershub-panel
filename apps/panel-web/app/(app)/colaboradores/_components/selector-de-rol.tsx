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

/**
 * Selector de rol del alta de colaborador: tarjetas con icono y texto. Combina los roles
 * base (Colaborador, Master) con los roles de pack habilitados (p. ej. Gestor de cobranza),
 * que al elegirlos se guardan como `role: colaborador` + el rol de pack correspondiente.
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
      label: "Colaborador",
      descripcion: "Gestiona el negocio según sus permisos",
      icono: User,
      seleccion: { role: "colaborador", pack_roles: [] },
    },
    ...packRoles.map((p) => ({
      key: p.value,
      label: p.label,
      descripcion: "Rol de habilidad del pack",
      icono: UserCog,
      seleccion: { role: "colaborador", pack_roles: [p.value] },
    })),
    ...(esMaster
      ? [
          {
            key: "master",
            label: "Master",
            descripcion: "Administra la plataforma",
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
    <div role="radiogroup" aria-label="Rol" className="grid gap-2 sm:grid-cols-3">
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
              "flex flex-col items-start gap-1.5 rounded-lg border p-3 text-left transition-colors",
              "hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
              elegida ? "border-focus bg-surface-2" : "border-control-border bg-bg-deep",
            )}
          >
            <Icono aria-hidden className={cn("h-5 w-5", elegida ? "text-link" : "text-text-soft")} />
            <span className="text-sm font-medium text-headline">{o.label}</span>
            <span className="text-xs leading-snug text-text-soft">{o.descripcion}</span>
          </button>
        );
      })}
    </div>
  );
}
