/**
 * Etiqueta de una comprobación automática de Meta. `ok: null` es "no concluyente" en la
 * API (p. ej. `rls_tests_pass`, que corre en CI, o `prod_secret_differs_from_dev` sin hash
 * de desarrollo): se muestra como informativo, no como un fallo.
 */
export function estadoCheck(ok: boolean | null): {
  label: string;
  variant: "success" | "warning" | "neutral";
} {
  if (ok === null) return { label: "Informativo", variant: "neutral" };
  return ok ? { label: "Correcto", variant: "success" } : { label: "Revisar", variant: "warning" };
}
