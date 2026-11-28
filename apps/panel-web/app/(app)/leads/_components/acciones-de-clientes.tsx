"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, Megaphone, Plus, Upload } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { ImportacionLeads } from "@/lib/api/types";
import { formatNumber } from "@/lib/format";

const ESTADOS = [
  { value: "nuevo", label: "Nuevo" },
  { value: "calificado", label: "Calificado" },
  { value: "contactado", label: "Contactado" },
  { value: "convertido", label: "Convertido" },
  { value: "perdido", label: "Perdido" },
];

const MOTIVOS = [
  { value: "precio", label: "Precio" },
  { value: "sin_respuesta", label: "Sin respuesta" },
  { value: "compro_en_otro_lado", label: "Compró en otro lado" },
  { value: "no_era_para_el", label: "No era para él" },
  { value: "otro", label: "Otro" },
];

const PLANTILLA_CSV = [
  "nombre,telefono,email,interes,estado,valor,seguimiento,nota_seguimiento,motivo",
  "Ana Pérez,3001234567,ana@correo.com,Plan mensual,nuevo,250000,2026-12-01T09:00,Llamar el lunes,",
  "Carlos Ruiz,,carlos@correo.com,Asesoría,contactado,,,,",
].join("\n");

type Dialogo = "nuevo" | "importar" | "captacion" | null;

/**
 * Acciones de la cabecera de Clientes: crear un lead a mano, importar un CSV y ver el estado de la captación.
 * La captación vive en su propia configuración; aquí solo se muestra si el formulario está activo y se enlaza.
 */
export function AccionesDeClientes({
  captacionDisponible,
  captacionActiva,
  captacionConfigurada,
}: {
  captacionDisponible: boolean;
  captacionActiva: boolean;
  captacionConfigurada: boolean;
}) {
  const [dialogo, setDialogo] = useState<Dialogo>(null);

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setDialogo("importar")}>
        <Upload className="h-4 w-4" aria-hidden /> Importar
      </Button>
      {captacionDisponible && (
        <Button type="button" variant="outline" onClick={() => setDialogo("captacion")}>
          <Megaphone className="h-4 w-4" aria-hidden /> Captación
          <Badge variant={captacionActiva ? "success" : "neutral"} className="ml-1">
            {captacionActiva ? "Activa" : "Apagada"}
          </Badge>
        </Button>
      )}
      <Button type="button" variant="accent" onClick={() => setDialogo("nuevo")}>
        <Plus className="h-4 w-4" aria-hidden /> Nuevo lead
      </Button>

      <Dialog open={dialogo === "nuevo"} onOpenChange={(abierto) => setDialogo(abierto ? "nuevo" : null)}>
        <DialogContent
          title="Nuevo lead"
          description="Registra a alguien que llegó por una llamada, una recomendación o un evento. Si el teléfono o el correo ya existen, se reutiliza su ficha."
        >
          <NuevoLeadForm onListo={() => setDialogo(null)} />
        </DialogContent>
      </Dialog>

      <Dialog open={dialogo === "importar"} onOpenChange={(abierto) => setDialogo(abierto ? "importar" : null)}>
        <DialogContent
          title="Importar leads"
          description="Sube un CSV con una fila por persona. Las columnas mínimo son «nombre» y «telefono» o «email»."
        >
          <ImportarLeadsForm onListo={() => setDialogo(null)} />
        </DialogContent>
      </Dialog>

      <Dialog open={dialogo === "captacion"} onOpenChange={(abierto) => setDialogo(abierto ? "captacion" : null)}>
        <DialogContent
          title="Captación de leads"
          description="El formulario de tu página y los avisos de seguimiento se configuran una sola vez para el negocio."
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={captacionActiva ? "success" : "neutral"}>
                {captacionActiva ? "Formulario activo" : "Formulario apagado"}
              </Badge>
              {!captacionConfigurada && <Badge variant="warning">Sin configurar</Badge>}
            </div>
            <p className="text-sm text-body">
              Para que entren leads necesitas un agente con la habilidad <strong>Captar leads</strong> y el formulario
              activo. También puedes compartir el enlace del formulario o probarlo con un envío de prueba.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="accent">
                <Link href="/habilidades/captar-leads">Abrir configuración</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/habilidades">Ver habilidades</Link>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function NuevoLeadForm({ onListo }: { onListo: () => void }) {
  const router = useRouter();
  const params = useSearchParams();
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existente, setExistente] = useState<string | null>(null);
  const [estado, setEstado] = useState("nuevo");

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    const nombre = String(datos.get("nombre") ?? "").trim();
    const telefono = String(datos.get("telefono") ?? "").trim();
    const email = String(datos.get("email") ?? "").trim();
    if (!telefono && !email) {
      setError("Indica un teléfono o un correo.");
      return;
    }
    setError(null);
    setExistente(null);
    setGuardando(true);
    const cuerpo: Record<string, unknown> = {
      nombre,
      telefono: telefono || null,
      email: email || null,
      interes: String(datos.get("interes") ?? "").trim() || null,
      estado,
      valor: datos.get("valor") ? Number(datos.get("valor")) : null,
      seguimiento_en: String(datos.get("seguimiento_en") ?? "").trim() || null,
      seguimiento_nota: String(datos.get("seguimiento_nota") ?? "").trim() || null,
    };
    if (estado === "perdido") cuerpo.motivo_perdida = String(datos.get("motivo_perdida") ?? "") || null;

    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    });
    const json = (await res.json().catch(() => ({}))) as {
      id?: string;
      error?: string;
      details?: { customer_id?: string };
      fields?: Record<string, string>;
    };
    setGuardando(false);
    if (!res.ok) {
      if (res.status === 409 && json.details?.customer_id) {
        setExistente(json.details.customer_id);
        setError(json.error ?? "Ese cliente ya tiene un lead.");
        return;
      }
      const campos = json.fields ? Object.values(json.fields).filter(Boolean).join(" ") : "";
      setError(campos || json.error || "No pudimos crear el lead. Vuelve a intentarlo.");
      return;
    }
    onListo();
    if (json.id) {
      const volver = new URLSearchParams(params.toString());
      volver.set("cliente", json.id);
      router.push(`/leads?${volver.toString()}`);
    }
    router.refresh();
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={enviar}>
      <Field label="Nombre" htmlFor="nuevo-nombre">
        <Input id="nuevo-nombre" name="nombre" required maxLength={200} autoFocus />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Teléfono" htmlFor="nuevo-telefono" help="Con indicativo si es de otro país.">
          <Input id="nuevo-telefono" name="telefono" inputMode="tel" maxLength={40} />
        </Field>
        <Field label="Correo" htmlFor="nuevo-email">
          <Input id="nuevo-email" name="email" type="email" maxLength={254} />
        </Field>
      </div>
      <Field label="Interés o negocio" htmlFor="nuevo-interes">
        <Input id="nuevo-interes" name="interes" maxLength={500} placeholder="Qué busca o qué le interesa" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Etapa" htmlFor="nuevo-estado">
          <Select id="nuevo-estado" name="estado" value={estado} onChange={(e) => setEstado(e.target.value)}>
            {ESTADOS.map((opcion) => (
              <option key={opcion.value} value={opcion.value}>
                {opcion.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Valor estimado" htmlFor="nuevo-valor" help="Opcional, en pesos.">
          <Input id="nuevo-valor" name="valor" type="number" min={0} step="0.01" />
        </Field>
      </div>
      {estado === "perdido" && (
        <Field label="Motivo de la pérdida" htmlFor="nuevo-motivo">
          <Select id="nuevo-motivo" name="motivo_perdida" defaultValue="">
            <option value="">Elige el motivo</option>
            {MOTIVOS.map((motivo) => (
              <option key={motivo.value} value={motivo.value}>
                {motivo.label}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Próxima acción" htmlFor="nuevo-seguimiento">
          <Input id="nuevo-seguimiento" name="seguimiento_en" type="datetime-local" />
        </Field>
        <Field label="Nota de la acción" htmlFor="nuevo-nota">
          <Input id="nuevo-nota" name="seguimiento_nota" maxLength={200} />
        </Field>
      </div>
      {error && (
        <div role="alert" className="rounded-md border border-status-danger-border bg-status-danger-bg p-3 text-sm text-status-danger-fg">
          {error}
          {existente && (
            <Link href={`/leads?${new URLSearchParams({ ...Object.fromEntries(params.entries()), cliente: existente }).toString()}`} className="ml-2 font-medium underline">
              Abrir su ficha
            </Link>
          )}
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button type="submit" variant="accent" loading={guardando}>
          Crear lead
        </Button>
      </div>
    </form>
  );
}

function ImportarLeadsForm({ onListo }: { onListo: () => void }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resumen, setResumen] = useState<ImportacionLeads | null>(null);

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const archivo = (new FormData(evento.currentTarget).get("archivo") as File | null) ?? null;
    if (!archivo) {
      setError("Elige un archivo CSV.");
      return;
    }
    setError(null);
    setResumen(null);
    setEnviando(true);
    const form = new FormData();
    form.set("archivo", archivo);
    const res = await fetch("/api/leads/import", { method: "POST", body: form });
    const json = (await res.json().catch(() => ({}))) as ImportacionLeads & { error?: string };
    setEnviando(false);
    if (!res.ok) {
      setError(json.error || "No pudimos importar el archivo.");
      return;
    }
    setResumen(json);
    router.refresh();
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={enviar}>
      <Field
        label="Archivo CSV"
        htmlFor="importar-archivo"
        help="Hasta 1000 filas y 2 MB. Si vienes de Excel, guarda como CSV UTF-8."
      >
        <Input id="importar-archivo" name="archivo" type="file" accept=".csv,text/csv" required />
      </Field>
      <a
        href={`data:text/csv;charset=utf-8,${encodeURIComponent(PLANTILLA_CSV)}`}
        download="plantilla-leads.csv"
        className="inline-flex items-center gap-1.5 text-sm text-link hover:underline"
      >
        <Download className="h-4 w-4" aria-hidden /> Descargar plantilla
      </a>
      {error && (
        <p role="alert" className="rounded-md border border-status-danger-border bg-status-danger-bg p-3 text-sm text-status-danger-fg">
          {error}
        </p>
      )}
      {resumen && (
        <div role="status" className="flex flex-col gap-2 rounded-md border border-border-soft bg-surface p-3 text-sm">
          <p className="font-medium text-headline">
            {formatNumber(resumen.creados)} creados · {formatNumber(resumen.actualizados)} actualizados ·{" "}
            {formatNumber(resumen.omitidos)} con error
          </p>
          {resumen.errores.length > 0 && (
            <ul className="max-h-40 overflow-y-auto text-xs text-text-soft">
              {resumen.errores.map((fallo) => (
                <li key={`${fallo.fila}-${fallo.mensaje}`}>
                  Fila {fallo.fila}: {fallo.mensaje}
                </li>
              ))}
            </ul>
          )}
          <Button type="button" variant="outline" size="sm" onClick={onListo}>
            Cerrar
          </Button>
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button type="submit" variant="accent" loading={enviando}>
          Importar
        </Button>
      </div>
    </form>
  );
}
