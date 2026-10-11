import { notFound } from "next/navigation";

import { Catalogo } from "@/app/(dev)/catalogo/_components/catalogo";
import { FeedbackProviders } from "@/components/ui/providers";
import { catalogoHabilitado } from "@/lib/catalogo";

export const metadata = { title: "Catálogo de componentes" };

/**
 * Catálogo vivo del kit (HU-DS-03, D-SPEC-29-3): cada componente con sus variantes y
 * estados, en claro y oscuro lado a lado. Solo existe con `PANEL_CATALOGO=1`
 * (desarrollo y test); en producción responde 404.
 */
export default function CatalogoPage() {
  if (!catalogoHabilitado()) notFound();
  return (
    <FeedbackProviders>
      <Catalogo />
    </FeedbackProviders>
  );
}
