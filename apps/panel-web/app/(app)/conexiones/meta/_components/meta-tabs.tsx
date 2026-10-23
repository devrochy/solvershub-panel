import { TabLinks } from "@/components/ui/tab-links";
import { metaTabs } from "@/lib/conexiones";

/** Pestañas del hub de una conexión Meta. `current` es el href de la página activa. */
export function MetaTabs({ connectionId, current }: { connectionId: string; current: string }) {
  return <TabLinks label="Secciones de la conexión" items={metaTabs(connectionId)} current={current} />;
}
