"use client";

import { MessageSquareWarning } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EVENTO_REPORTAR } from "@/lib/feedback";

/** Abre el formulario «Reportar un problema» del layout. */
export function BotonReportar() {
  return (
    <Button type="button" onClick={() => window.dispatchEvent(new Event(EVENTO_REPORTAR))}>
      <MessageSquareWarning className="h-4 w-4" aria-hidden />
      Reportar un problema
    </Button>
  );
}
