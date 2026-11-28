"use client";

import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FileText, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Dropzone } from "@/components/ui/dropzone";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { RadioGroup } from "@/components/ui/radio-group";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { FeedbackCatalogo, FeedbackReporte } from "@/lib/api/types";
import {
  AYUDA_DEL_TIPO,
  DESCRIPCION_MAX,
  EVENTO_REPORTAR,
  TITULO_MAX,
  areaDeLaRuta,
  areasDelCatalogo,
  ayudaDeAdjuntos,
  campoDelError,
  claveDeEnvio,
  mensajeDeEnvio,
  segundosDeEspera,
  sumarAdjuntos,
  tamanoDeArchivo,
  validarReporte,
  type ErroresDelReporte,
  type TipoDeReporte,
} from "@/lib/feedback";

/**
 * «Reportar un problema» (SPEC-54, HU-FB-05): se monta una vez en el layout y se abre con el evento
 * `EVENTO_REPORTAR` (lo emite el menú del avatar), así sobrevive al cierre del menú móvil. Cada apertura
 * monta un formulario nuevo con su propia `Idempotency-Key`.
 */
export function ReportarProblema({ catalogo }: { catalogo: FeedbackCatalogo }) {
  const [apertura, setApertura] = useState(0);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    const abrir = () => {
      setApertura((n) => n + 1);
      setAbierto(true);
    };
    window.addEventListener(EVENTO_REPORTAR, abrir);
    return () => window.removeEventListener(EVENTO_REPORTAR, abrir);
  }, []);

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      {abierto && (
        <DialogContent
          title="Reportar un problema"
          description="Cuéntanos qué pasó o qué te gustaría. Si lo aprobamos, tu negocio recibe créditos de regalo."
          className="max-w-xl"
        >
          <FormularioDeReporte key={apertura} catalogo={catalogo} onCerrar={() => setAbierto(false)} />
        </DialogContent>
      )}
    </Dialog>
  );
}

export function FormularioDeReporte({ catalogo, onCerrar }: { catalogo: FeedbackCatalogo; onCerrar: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const { limites } = catalogo;
  const [areas] = useState(() => areasDelCatalogo(catalogo));
  // Una por apertura: un reintento (doble clic, red caída) repite la misma y la API devuelve el mismo reporte.
  const [clave] = useState(claveDeEnvio);
  const [tipo, setTipo] = useState<TipoDeReporte | "">("");
  const [area, setArea] = useState(() => areaDeLaRuta(pathname ?? "", areas));
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [adjuntos, setAdjuntos] = useState<File[]>([]);
  const [avisos, setAvisos] = useState<string[]>([]);
  const [errores, setErrores] = useState<ErroresDelReporte>({});
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState<FeedbackReporte | null>(null);

  function agregar(nuevos: File[]) {
    const resultado = sumarAdjuntos(adjuntos, nuevos, limites);
    setAdjuntos(resultado.archivos);
    setAvisos(resultado.avisos);
  }

  // Ctrl+V en cualquier parte del formulario pega la captura (la zona de adjuntos ya lo hace con su foco).
  function alPegar(e: ClipboardEvent<HTMLFormElement>) {
    if (e.defaultPrevented) return;
    const archivos = Array.from(e.clipboardData.items)
      .filter((item) => item.kind === "file")
      .map((item) => item.getAsFile())
      .filter((f): f is File => f !== null && limites.mimetypes.includes(f.type));
    if (archivos.length === 0) return;
    e.preventDefault();
    agregar(archivos);
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (enviando) return;
    const validacion = validarReporte({ tipo, area, titulo, descripcion });
    setErrores(validacion);
    setError(null);
    if (Object.keys(validacion).length > 0) return;
    const form = new FormData();
    form.set("tipo", tipo);
    form.set("area", area);
    form.set("titulo", titulo.trim());
    form.set("descripcion", descripcion.trim());
    for (const archivo of adjuntos) form.append("adjuntos", archivo, archivo.name || "captura.png");
    setEnviando(true);
    try {
      const res = await fetch("/api/feedback/reports", { method: "POST", headers: { "Idempotency-Key": clave }, body: form });
      const cuerpo = (await res.json().catch(() => null)) as (FeedbackReporte & { error?: string; code?: string }) | null;
      if (res.ok && cuerpo) {
        setEnviado(cuerpo);
        router.refresh();
        return;
      }
      // Un error de un campo se muestra junto a él; el resto, al pie del formulario.
      const campo = campoDelError(cuerpo?.code);
      if (campo && cuerpo?.error) setErrores({ [campo]: cuerpo.error });
      else setError(mensajeDeEnvio(res.status, cuerpo, segundosDeEspera(res.headers.get("Retry-After"))));
    } catch {
      setError("No pudimos contactar el servidor. Revisa tu conexión y vuelve a enviar: no se duplicará.");
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <div className="flex flex-col gap-5">
        <FormFeedback success="Recibimos tu reporte. Te avisaremos cuando lo revisemos." />
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" asChild>
            <Link href={`/reportes/${enviado.id}`} onClick={onCerrar}>
              Ver el reporte
            </Link>
          </Button>
          <Button type="button" onClick={onCerrar}>
            Listo
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={enviar} onPaste={alPegar} className="flex flex-col gap-5">
      <Field label="¿Qué quieres reportar?" error={errores.tipo} required>
        <RadioGroup
          label="¿Qué quieres reportar?"
          name="tipo-de-reporte"
          value={tipo}
          onValueChange={(v) => setTipo(v as TipoDeReporte)}
          options={catalogo.tipos.map((t) => ({
            value: t.clave,
            label: t.etiqueta,
            description: AYUDA_DEL_TIPO[t.clave as TipoDeReporte],
          }))}
          className="sm:flex-row sm:gap-6"
        />
      </Field>
      <Field label="¿En qué parte del panel?" htmlFor="reporte-area" error={errores.area} required>
        <Select id="reporte-area" value={area} onChange={(e) => setArea(e.target.value)}>
          <option value="">Elige una sección</option>
          {areas.map((a) => (
            <option key={a.clave} value={a.clave}>
              {a.etiqueta}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Título" htmlFor="reporte-titulo" error={errores.titulo} help="En una frase: qué pasa o qué propones." required>
        <Input id="reporte-titulo" value={titulo} maxLength={TITULO_MAX} onChange={(e) => setTitulo(e.target.value)} />
      </Field>
      <Field
        label="Descripción"
        htmlFor="reporte-descripcion"
        error={errores.descripcion}
        help={`Qué hacías, qué esperabas y qué pasó. ${descripcion.length}/${DESCRIPCION_MAX}`}
        required
      >
        <Textarea
          id="reporte-descripcion"
          rows={5}
          value={descripcion}
          maxLength={DESCRIPCION_MAX}
          onChange={(e) => setDescripcion(e.target.value)}
        />
      </Field>
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-headline">Evidencia (opcional)</span>
        <Dropzone
          accept={limites.mimetypes}
          maxBytes={limites.max_bytes_por_archivo}
          onFiles={agregar}
          onReject={(motivo) => setAvisos([motivo])}
          disabled={enviando || adjuntos.length >= limites.max_adjuntos}
          label="Pega una captura con Ctrl+V, arrástrala o elígela"
          hint={ayudaDeAdjuntos(limites)}
        />
        {adjuntos.length > 0 && (
          <ul aria-label="Adjuntos" className="flex flex-col gap-1.5">
            {adjuntos.map((archivo, i) => (
              <li
                key={`${archivo.name}-${archivo.size}-${archivo.lastModified}-${i}`}
                className="flex items-center gap-3 rounded-md border border-border-soft px-2 py-1.5 text-sm"
              >
                <Miniatura archivo={archivo} />
                <span className="min-w-0 flex-1 truncate text-headline">{archivo.name || "captura.png"}</span>
                <span className="shrink-0 text-xs text-text-soft">{tamanoDeArchivo(archivo.size)}</span>
                <button
                  type="button"
                  aria-label={`Quitar ${archivo.name || "captura"}`}
                  onClick={() => setAdjuntos(adjuntos.filter((_, j) => j !== i))}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-text-soft hover:bg-hover hover:text-headline"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
        {avisos.map((aviso) => (
          <FormFeedback key={aviso} error={aviso} />
        ))}
      </div>
      <FormFeedback error={error} />
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCerrar} disabled={enviando}>
          Cancelar
        </Button>
        <Button type="submit" loading={enviando}>
          Enviar reporte
        </Button>
      </div>
    </form>
  );
}

/** Vista previa de una imagen elegida (blob local); un PDF lleva su ícono. */
function Miniatura({ archivo }: { archivo: File }) {
  const img = useRef<HTMLImageElement>(null);
  const imagen = archivo.type.startsWith("image/");
  // El blob se crea y se libera con la miniatura: se le asigna directo al <img>, sin pasar por el estado.
  useEffect(() => {
    if (!imagen || !img.current || typeof URL.createObjectURL !== "function") return;
    const creada = URL.createObjectURL(archivo);
    img.current.src = creada;
    return () => URL.revokeObjectURL(creada);
  }, [archivo, imagen]);
  if (!imagen) return <FileText className="h-8 w-8 shrink-0 p-1.5 text-text-soft" aria-hidden />;
  // eslint-disable-next-line @next/next/no-img-element -- blob local: next/image no lo optimiza.
  return <img ref={img} alt="" className="h-8 w-8 shrink-0 rounded-sm bg-bg-deep object-cover" />;
}
