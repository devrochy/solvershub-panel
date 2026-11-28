import type { OpcionSegmentada } from "@/components/ui/segmented-control";
import { queryDeReportes } from "@/lib/feedback";

/** «Míos · Del negocio» (solo el propietario): conserva el filtro de estado. */
export function opcionesDeAlcance(estado: string | null): OpcionSegmentada[] {
  return [
    { value: "mios", label: "Míos", href: `/reportes${queryDeReportes({ estado })}` },
    { value: "negocio", label: "Del negocio", href: `/reportes${queryDeReportes({ alcance: "negocio", estado })}` },
  ];
}

/** Todos y cada estado (cinco opciones): conserva el alcance. */
export function opcionesDeEstado(alcance: string): OpcionSegmentada[] {
  const ruta = (estado: string | null) => `/reportes${queryDeReportes({ alcance, estado })}`;
  return [
    { value: "todos", label: "Todos", href: ruta(null) },
    { value: "recibido", label: "Recibidos", href: ruta("recibido") },
    { value: "en_revision", label: "En revisión", href: ruta("en_revision") },
    { value: "aprobado", label: "Aprobados", href: ruta("aprobado") },
    { value: "rechazado", label: "Rechazados", href: ruta("rechazado") },
  ];
}
