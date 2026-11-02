"use client";

import { Select } from "@/components/ui/select";
import { GRUPOS_MENU, type Seccion, type SeccionId } from "@/lib/configuracion-secciones";
import { cn } from "@/lib/utils";

/** Indicador de la sección actual: barra de 3 px con el foco del tema + fondo elevado (como el menú lateral). */
const ACTIVO =
  "relative bg-surface-raised text-headline before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full before:bg-focus";

/**
 * Menú interno de Configuración, agrupado por tarea. En escritorio es una columna con los grupos;
 * en celular, un selector nativo (cabe en cualquier ancho y abre el selector del teléfono). Los dos
 * llevan al mismo sitio: `onElegir` decide si se puede salir (cambios sin guardar).
 */
export function MenuDeSecciones({
  secciones,
  actual,
  onElegir,
}: {
  secciones: Seccion[];
  actual: SeccionId;
  onElegir: (id: SeccionId) => void;
}) {
  const grupos = GRUPOS_MENU.map((g) => ({ ...g, secciones: secciones.filter((s) => s.grupo === g.id) })).filter(
    (g) => g.secciones.length > 0,
  );

  return (
    <>
      <div className="md:hidden">
        <label htmlFor="configuracion-seccion" className="mb-1.5 block text-[13px] font-medium text-body">
          Sección
        </label>
        <Select id="configuracion-seccion" value={actual} onChange={(e) => onElegir(e.target.value as SeccionId)}>
          {grupos.map((g) => (
            <optgroup key={g.id} label={g.titulo}>
              {g.secciones.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.titulo}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
      </div>

      <nav aria-label="Secciones de Configuración" className="hidden md:sticky md:top-4 md:block">
        <div className="flex flex-col gap-5">
          {grupos.map((g) => (
            <div key={g.id}>
              <p
                id={`menu-grupo-${g.id}`}
                className="px-3 pb-1.5 text-[11px] font-medium tracking-[0.06em] text-text-soft uppercase"
              >
                {g.titulo}
              </p>
              <ul aria-labelledby={`menu-grupo-${g.id}`} className="flex flex-col gap-0.5">
                {g.secciones.map((s) => {
                  const activa = s.id === actual;
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => onElegir(s.id)}
                        aria-current={activa ? "page" : undefined}
                        className={cn(
                          "flex min-h-10 w-full items-center rounded-md px-3 py-2 text-left text-sm transition-colors",
                          activa ? ACTIVO : "text-body hover:bg-hover hover:text-headline",
                        )}
                      >
                        {s.titulo}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>
    </>
  );
}
