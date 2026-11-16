"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, CopyPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { toast } from "@/lib/toast-store";
import {
  BFF_PLANTILLAS_NEGOCIO,
  frasesDeResumen,
  proveedorLabel,
  refDe,
  resultadoDeCopia,
  sumarResumen,
  type ConexionDePlantillas,
  type ResultadoDeCopia,
  type ResumenDeCopia,
} from "@/lib/plantillas-negocio";

async function postear<T>(ruta: string, cuerpo: unknown): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${BFF_PLANTILLAS_NEGOCIO}/${ruta}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    });
    const json = (await res.json().catch(() => ({}))) as T & { error?: unknown };
    if (!res.ok) return { ok: false, error: typeof json.error === "string" ? json.error : "No se pudo copiar." };
    return { ok: true, data: json };
  } catch {
    return { ok: false, error: "No se pudo conectar. Intenta de nuevo." };
  }
}

function etiqueta(c: ConexionDePlantillas): string {
  return `${c.etiqueta} · ${proveedorLabel(c.proveedor)}`;
}

function ListaDeResultados({ resultados, conexiones }: { resultados: ResultadoDeCopia[]; conexiones: readonly ConexionDePlantillas[] }) {
  if (resultados.length === 0) return null;
  const nombre = (clave: string) => conexiones.find((c) => c.clave === clave)?.etiqueta ?? "Conexión";
  return (
    <ul role="status" className="flex flex-col gap-1 rounded-md border border-border bg-surface-2 p-3 text-sm">
      {resultados.map((r) => (
        <li key={`${r.conexion}-${r.nombre}-${r.idioma}`} className="text-body">
          <span className="font-medium text-headline">{r.nombre ? `${r.nombre} → ` : ""}{nombre(r.conexion)}:</span>{" "}
          {resultadoDeCopia(r)}
        </li>
      ))}
    </ul>
  );
}

/**
 * «Copiar a otras conexiones» de una plantilla aprobada: se marca a qué conexiones va y cada una responde por su
 * lado (creada y enviada a aprobación, ya estaba, con otro texto, no se puede copiar o error).
 */
export function CopiarPlantilla({
  nombre,
  idioma,
  origenes,
  destinos,
  conexiones,
}: {
  nombre: string;
  idioma: string;
  origenes: ConexionDePlantillas[];
  destinos: ConexionDePlantillas[];
  conexiones: readonly ConexionDePlantillas[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [origen, setOrigen] = useState(origenes[0]?.clave ?? "");
  const [marcados, setMarcados] = useState<string[]>(destinos.map((d) => d.clave));
  const [pendiente, setPendiente] = useState(false);
  const [resultados, setResultados] = useState<ResultadoDeCopia[]>([]);
  if (origenes.length === 0 || destinos.length === 0) return null;
  const desde = origenes.find((c) => c.clave === origen) ?? origenes[0];

  async function copiar() {
    setPendiente(true);
    const res = await postear<ResultadoDeCopia[]>("copy", {
      origen: refDe(desde),
      nombre,
      idioma,
      destinos: destinos.filter((d) => marcados.includes(d.clave)).map(refDe),
    });
    setPendiente(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setResultados(res.data);
    const creadas = res.data.filter((r) => r.resultado === "creada").length;
    if (creadas > 0) toast.success(creadas === 1 ? "Plantilla copiada y enviada a aprobación." : `${creadas} copias enviadas a aprobación.`);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setResultados([]);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={`Copiar ${nombre} a otras conexiones`}>
          <Copy className="h-4 w-4" aria-hidden /> Copiar
        </Button>
      </DialogTrigger>
      <DialogContent
        title={`Copiar «${nombre}» a otras conexiones`}
        description="Se crea con el mismo nombre, idioma, texto, variables y categoría, y se envía a aprobación de WhatsApp en cada conexión."
      >
        <div className="flex flex-col gap-4">
          {origenes.length > 1 && (
            <Field label="Copiar desde" htmlFor="copiar-origen">
              <Select id="copiar-origen" value={desde.clave} onChange={(e) => setOrigen(e.target.value)}>
                {origenes.map((c) => (
                  <option key={c.clave} value={c.clave}>
                    {etiqueta(c)}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium text-headline">Copiar a</legend>
            {destinos.map((d) => (
              <Checkbox
                key={d.clave}
                id={`destino-${d.clave}`}
                label={etiqueta(d)}
                checked={marcados.includes(d.clave)}
                onCheckedChange={(v) => setMarcados((m) => (v ? [...m, d.clave] : m.filter((x) => x !== d.clave)))}
              />
            ))}
          </fieldset>
          <ListaDeResultados resultados={resultados} conexiones={conexiones} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cerrar
            </Button>
            <Button type="button" variant="accent" loading={pendiente} disabled={marcados.length === 0} onClick={() => void copiar()}>
              Copiar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * «Copiar todas a…»: lleva a otra conexión las plantillas aprobadas de una que le falten. El backend copia hasta
 * 10 por pedido; con `restantes` se sigue pidiendo hasta terminar, sumando el resumen.
 */
export function CopiarTodas({
  origenes,
  destinos,
  conexiones,
}: {
  origenes: ConexionDePlantillas[];
  destinos: ConexionDePlantillas[];
  conexiones: readonly ConexionDePlantillas[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [origen, setOrigen] = useState(origenes[0]?.clave ?? "");
  const [destino, setDestino] = useState(destinos.find((d) => d.clave !== origenes[0]?.clave)?.clave ?? "");
  const [pendiente, setPendiente] = useState(false);
  const [resumen, setResumen] = useState<ResumenDeCopia | null>(null);
  if (origenes.length === 0 || destinos.length === 0) return null;
  const desde = origenes.find((c) => c.clave === origen);
  const hacia = destinos.find((c) => c.clave === destino && c.clave !== origen);

  async function copiar() {
    if (!desde || !hacia) return;
    setPendiente(true);
    let total: ResumenDeCopia | null = null;
    // Tope de vueltas por si el backend no avanza: cada vuelta copia hasta 10.
    for (let vuelta = 0; vuelta < 20; vuelta++) {
      const res = await postear<ResumenDeCopia>("copy-all", { origen: refDe(desde), destino: refDe(hacia) });
      if (!res.ok) {
        toast.error(res.error);
        break;
      }
      const r = res.data;
      total = sumarResumen(total, r);
      setResumen(total);
      if (r.restantes === 0 || r.creadas + r.errores === 0) break;
    }
    setPendiente(false);
    if (total) toast.success(frasesDeResumen(total));
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setResumen(null);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <CopyPlus className="h-4 w-4" aria-hidden /> Copiar todas a…
        </Button>
      </DialogTrigger>
      <DialogContent
        title="Copiar todas las plantillas a otra conexión"
        description="Se copian las plantillas aprobadas que le falten. Las que ya están no se tocan, aunque tengan otro texto."
        className="max-h-[85vh] overflow-y-auto"
      >
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Desde" htmlFor="todas-origen">
              <Select id="todas-origen" value={origen} onChange={(e) => setOrigen(e.target.value)}>
                {origenes.map((c) => (
                  <option key={c.clave} value={c.clave}>
                    {etiqueta(c)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Hacia" htmlFor="todas-destino">
              <Select id="todas-destino" value={destino} onChange={(e) => setDestino(e.target.value)}>
                <option value="">Elige una conexión</option>
                {destinos
                  .filter((c) => c.clave !== origen)
                  .map((c) => (
                    <option key={c.clave} value={c.clave}>
                      {etiqueta(c)}
                    </option>
                  ))}
              </Select>
            </Field>
          </div>
          {resumen && (
            <>
              <p role="status" className="text-sm font-medium text-headline">
                {frasesDeResumen(resumen)}
              </p>
              <ListaDeResultados resultados={resumen.detalle.filter((d) => d.resultado !== "ya_existia")} conexiones={conexiones} />
            </>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cerrar
            </Button>
            <Button type="button" variant="accent" loading={pendiente} disabled={!desde || !hacia} onClick={() => void copiar()}>
              Copiar todas
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
