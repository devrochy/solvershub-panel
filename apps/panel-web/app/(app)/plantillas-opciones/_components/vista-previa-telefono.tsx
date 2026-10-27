"use client";

import { useState } from "react";
import { List, TriangleAlert } from "lucide-react";

import { Tabs } from "@/components/ui/tabs";
import type { OpcionesVistaPrevia } from "@/lib/api/types";
import { MAX_BOTONES } from "@/lib/plantillas-opciones";
import { cn } from "@/lib/utils";

type Interactivo = {
  type?: string;
  body?: string;
  footer?: string;
  button?: string;
  buttons?: { id?: string; title?: string }[];
  rows?: { id?: string; title?: string }[];
};

type ComponenteMeta = { type?: string; text?: string; buttons?: { type?: string; text?: string }[] };

function leerInteractivo(vista: OpcionesVistaPrevia): Interactivo {
  return (vista.interactivo ?? {}) as Interactivo;
}

function Burbuja({ children }: { children: React.ReactNode }) {
  return <div className="max-w-[92%] rounded-lg rounded-tl-sm border border-border-soft bg-surface p-3 text-sm text-headline shadow-elev-1">{children}</div>;
}

function Boton({ children, icono }: { children: React.ReactNode; icono?: boolean }) {
  return (
    <div className="mt-1.5 flex max-w-[92%] items-center justify-center gap-1.5 rounded-lg border border-border-soft bg-surface px-3 py-2 text-center text-sm font-medium text-link shadow-elev-1">
      {icono && <List className="h-4 w-4" aria-hidden />}
      {children}
    </div>
  );
}

/**
 * Vista previa viva (HU-OPC-06): un teléfono con lo que verá el cliente según la vía (mensaje interactivo,
 * plantilla de Meta o el texto de respaldo). Sale de `POST /vista-previa`: lo que se ve es lo que armaría el backend.
 */
export function VistaPreviaTelefono({
  vista,
  cargando,
  desactualizada,
  motivoSinVista,
}: {
  vista: OpcionesVistaPrevia | null;
  cargando: boolean;
  /** Hay errores: se muestra la última vista sin errores. */
  desactualizada: boolean;
  motivoSinVista?: string;
}) {
  const [pestana, setPestana] = useState("interactivo");

  return (
    <section aria-label="Vista previa" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-base font-semibold text-headline">Vista previa</h2>
        {cargando && <span className="text-xs text-text-soft" role="status">Actualizando…</span>}
      </div>
      <Tabs
        items={[
          { id: "interactivo", label: "Interactivo" },
          { id: "plantilla", label: "Plantilla de Meta" },
          { id: "respaldo", label: "Texto" },
        ]}
        value={pestana}
        onValueChange={setPestana}
      />
      <div
        className={cn(
          "mx-auto flex min-h-[320px] w-full max-w-[320px] flex-col overflow-hidden rounded-[28px] border-2 border-border bg-bg-deep shadow-elev-2",
          desactualizada && "opacity-70",
        )}
      >
        <div className="border-b border-border-soft bg-surface px-4 py-2.5 text-center text-xs font-medium text-body">Tu negocio</div>
        <div className="flex flex-1 flex-col gap-1 p-3" aria-live="polite">
          {vista ? (
            pestana === "interactivo" ? (
              <PanelInteractivo vista={vista} />
            ) : pestana === "plantilla" ? (
              <PanelPlantilla vista={vista} />
            ) : (
              <PanelRespaldo vista={vista} />
            )
          ) : (
            <p className="m-auto max-w-[230px] text-center text-sm text-text-soft">
              {motivoSinVista ?? (cargando ? "Armando la vista previa…" : "Completa el cuerpo y las opciones para ver cómo se verá.")}
            </p>
          )}
        </div>
      </div>
      {desactualizada && vista && (
        <p className="text-center text-xs text-status-warning-fg">
          <TriangleAlert className="mr-1 inline h-3.5 w-3.5" aria-hidden />
          Hay errores: se muestra la última vista sin errores.
        </p>
      )}
    </section>
  );
}

function PanelInteractivo({ vista }: { vista: OpcionesVistaPrevia }) {
  const m = leerInteractivo(vista);
  const lista = m.type === "list";
  const filas = lista ? (m.rows ?? []) : (m.buttons ?? []);
  return (
    <>
      <Burbuja>
        <p className="whitespace-pre-wrap break-words">{m.body}</p>
        {m.footer && <p className="mt-2 text-xs text-text-soft">{m.footer}</p>}
      </Burbuja>
      {lista ? (
        <>
          <Boton icono>{m.button ?? "Ver opciones"}</Boton>
          <ul className="mt-2 max-w-[92%] divide-y divide-border-soft rounded-lg border border-border-soft bg-surface text-sm" aria-label="Opciones de la lista">
            {filas.map((f, i) => (
              <li key={i} className="px-3 py-2 text-headline">
                {f.title}
              </li>
            ))}
          </ul>
        </>
      ) : (
        filas.map((f, i) => <Boton key={i}>{f.title}</Boton>)
      )}
      <p className="mt-auto pt-3 text-center text-xs text-text-soft">
        {lista ? `Lista de ${filas.length} opciones` : `${filas.length} ${filas.length === 1 ? "botón" : "botones"} (hasta ${MAX_BOTONES}; con más sale una lista)`}
      </p>
      {!vista.cabe_en_whatsapp && (
        <p role="status" className="text-center text-xs text-status-warning-fg">
          No cabe en un mensaje interactivo de WhatsApp: saldría como texto con las opciones numeradas.
        </p>
      )}
    </>
  );
}

function PanelPlantilla({ vista }: { vista: OpcionesVistaPrevia }) {
  const componentes = (vista.componentes_meta ?? []) as ComponenteMeta[];
  const pie = componentes.find((c) => c.type === "FOOTER")?.text;
  const botones = componentes.find((c) => c.type === "BUTTONS")?.buttons ?? [];
  return (
    <>
      <Burbuja>
        <p className="whitespace-pre-wrap break-words">{vista.cuerpo_meta_renderizado}</p>
        {pie && <p className="mt-2 text-xs text-text-soft">{pie}</p>}
      </Burbuja>
      {botones.map((b, i) => (
        <Boton key={i}>{b.text}</Boton>
      ))}
      <p className="mt-auto pt-3 text-center text-xs text-text-soft">Así se vería fuera de las 24 horas, cuando Meta apruebe la plantilla.</p>
    </>
  );
}

function PanelRespaldo({ vista }: { vista: OpcionesVistaPrevia }) {
  return (
    <>
      <Burbuja>
        <p className="whitespace-pre-wrap break-words">{vista.texto_de_respaldo}</p>
      </Burbuja>
      <p className="mt-auto pt-3 text-center text-xs text-text-soft">
        En canales sin botones el cliente responde con el número y tocar no ejecuta nada.
      </p>
    </>
  );
}
