import { SegmentedControl } from "@/components/ui/segmented-control";

/** Test o Producción (PRU-01): las dos listas de verificación en una sola pestaña, «Entornos». */
export function EntornoDeLaLista({ actual }: { actual: "test" | "prod" }) {
  return (
    <SegmentedControl
      label="Entorno"
      value={actual}
      className="self-start"
      options={[
        { value: "test", label: "Test", href: "/pruebas/configuracion" },
        { value: "prod", label: "Producción", href: "/pruebas/produccion" },
      ]}
    />
  );
}
