"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

/** Fragmento del chat web para pegar en el sitio (pestaña Instalación de la ficha, HU-UX-09). */
export function InstalacionChatWeb({ snippet }: { snippet: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-5">
        {snippet ? (
          <>
            <label htmlFor="fragmento-chat-web" className="text-[13px] font-medium text-body">
              Fragmento para tu sitio
            </label>
            <Textarea id="fragmento-chat-web" readOnly rows={3} value={snippet} className="font-mono text-xs" />
            <p className="text-xs text-text-soft">
              Pégalo antes de cerrar la etiqueta <code>&lt;/body&gt;</code> en cada página donde quieras el chat. Solo
              funciona en los dominios permitidos de Apariencia.
            </p>
            <div>
              <Button type="button" variant="outline" onClick={() => void copiar()}>
                {copiado ? "Copiado" : "Copiar fragmento"}
              </Button>
            </div>
          </>
        ) : (
          <p className="text-sm text-body">Activa el chat web en Apariencia y guarda para generar el fragmento.</p>
        )}
      </CardContent>
    </Card>
  );
}
