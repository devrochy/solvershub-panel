import { redirect } from "next/navigation";

import { destinoDeRutaVieja } from "@/lib/calendario/redirecciones";

/** Agenda es una sola vista (HU-CAL-08): esta pestaña pasa a `/calendario`. */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  redirect(destinoDeRutaVieja("citas", await searchParams));
}
