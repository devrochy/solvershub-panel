import { redirect } from "next/navigation";

/** Dispositivos pasó a Seguridad, funcionalidad del negocio (ADR-0174). Redirect por una release. */
export default function DispositivosMovida() {
  redirect("/seguridad/dispositivos");
}
