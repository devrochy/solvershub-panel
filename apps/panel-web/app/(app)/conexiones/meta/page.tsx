import { redirect } from "next/navigation";

/** La «Salud de Meta» global ya no existe (HU-UX-09): la salud vive en la ficha de cada número. */
export default function SaludDeMetaGlobal() {
  redirect("/conexiones");
}
