import { redirect } from "next/navigation";

/** Alertas de acceso pasó a Seguridad, funcionalidad del negocio (ADR-0174). Redirect por una release. */
export default function AlertasMovida() {
  redirect("/seguridad/alertas");
}
