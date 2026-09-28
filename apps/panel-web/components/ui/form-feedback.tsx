import { cn } from "@/lib/utils";

/** Mensaje de resultado de una acción (éxito o error). */
export function FormFeedback({
  error,
  success,
  className,
}: {
  error?: string | null;
  success?: string | null;
  className?: string;
}) {
  if (!error && !success) return null;
  return (
    <p
      role={error ? "alert" : "status"}
      className={cn("text-sm", error ? "text-danger" : "text-success", className)}
    >
      {error ?? success}
    </p>
  );
}
