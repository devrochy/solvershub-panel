import { AlertTriangle } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";

/** El bot ya manda sus mensajes a otra dirección (409 `webhook_ajeno`): se avisa y se pide confirmar el reemplazo. */
export function AvisoWebhookAjeno({
  id,
  url,
  confirma,
  onConfirma,
}: {
  id: string;
  url: string;
  confirma: boolean;
  onConfirma: (v: boolean) => void;
}) {
  return (
    <div role="alert" className="flex flex-col gap-3 rounded-md border border-status-warning-border bg-status-warning-bg p-4 text-sm">
      <p className="flex items-start gap-2 text-headline">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-status-warning-fg" aria-hidden />
        <span>
          Este bot ya manda sus mensajes a otra dirección{url ? <> (<span className="break-all">{url}</span>)</> : null}. Puede
          ser otra integración tuya: si sigues, la reemplazamos por la de solvershub y esa deja de recibirlos.
        </span>
      </p>
      <Checkbox id={id} label="Entiendo, reemplazar la dirección" checked={confirma} onCheckedChange={onConfirma} />
    </div>
  );
}
