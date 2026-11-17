"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  borradorDesde,
  cuentaVacia,
  DESCRIPCION,
  ETIQUETA_DE_ESTADO,
  estadoEnPantalla,
  mismoBorrador,
  problemaAlGuardar,
  TONO_DE_ESTADO,
  type Borrador,
  type CuentaDeTransferencia,
  type FormasDePago,
  type Metodo,
} from "@/lib/formas-de-pago";
import { toast } from "@/lib/toast-store";

const CAMPOS_DE_CUENTA: { clave: keyof CuentaDeTransferencia; label: string; obligatorio?: boolean }[] = [
  { clave: "entity", label: "Entidad", obligatorio: true },
  { clave: "accountType", label: "Tipo de cuenta" },
  { clave: "accountNumber", label: "Número", obligatorio: true },
  { clave: "holderName", label: "Titular" },
  { clave: "holderDocument", label: "Documento del titular" },
];

/**
 * Formas de pago del agente (SPEC-48, HU-COM-21), dentro de Personalizar › Habilidades. Contra entrega
 * es una forma sin superpoder; transferencia lleva cuentas y la comprobación; pago en línea depende de
 * la cuenta de Wompi del negocio. Se guarda aparte del borrador: no cambia la versión publicada del
 * agente, pero el agente solo ofrece lo que queda «Activa».
 */
export function FormasDePagoDelAgente({
  agenteId,
  inicial,
  puedeEditar,
}: {
  agenteId: string;
  inicial: FormasDePago;
  puedeEditar: boolean;
}) {
  const [datos, setDatos] = useState(inicial);
  const [borrador, setBorrador] = useState<Borrador>(() => borradorDesde(inicial));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const base = useId();
  const sinGuardar = !mismoBorrador(borrador, borradorDesde(datos));
  const soloLectura = !puedeEditar || guardando;

  function forma(metodo: Metodo) {
    return borrador.forms.find((f) => f.method === metodo)!;
  }
  function cambiarForma(metodo: Metodo, cambio: Partial<Borrador["forms"][number]>) {
    setBorrador((b) => ({ ...b, forms: b.forms.map((f) => (f.method === metodo ? { ...f, ...cambio } : f)) }));
  }
  function cambiarCuenta(i: number, clave: keyof CuentaDeTransferencia, valor: string) {
    setBorrador((b) => ({
      ...b,
      transfer_accounts: b.transfer_accounts.map((c, j) => (j === i ? { ...c, [clave]: valor } : c)),
    }));
  }

  async function guardar() {
    const problema = problemaAlGuardar(borrador);
    if (problema) {
      setError(problema);
      return;
    }
    setError(null);
    setGuardando(true);
    try {
      const res = await fetch(`/api/pack/commerce/agents/${agenteId}/payment-forms`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(borrador),
      });
      const cuerpo = await res.json().catch(() => null);
      if (!res.ok) {
        setError(cuerpo?.error?.message ?? "No pudimos guardar las formas de pago. Inténtalo de nuevo.");
        return;
      }
      setDatos(cuerpo as FormasDePago);
      setBorrador(borradorDesde(cuerpo as FormasDePago));
      toast.success("Formas de pago guardadas.");
    } catch {
      setError("No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-text-soft">
        El agente solo ofrece las formas activas. Cómo entrega y qué datos pide al cliente se ajusta en «Datos del cliente».
      </p>
      <ul className="flex flex-col gap-3">
        {datos.forms.map((f) => {
          const enPantalla = forma(f.method);
          const { estado, falta } = estadoEnPantalla(
            f.method,
            enPantalla.enabled,
            borrador.transfer_accounts,
            datos.pago_en_linea_disponible,
          );
          const idInstrucciones = `${base}-${f.method}-instrucciones`;
          return (
            <li key={f.method} className="flex flex-col gap-3 rounded-md border border-border-soft p-4" data-forma={f.method}>
              <div className="flex flex-wrap items-start gap-3">
                <Switch
                  id={`${base}-${f.method}`}
                  aria-label={f.label}
                  checked={enPantalla.enabled}
                  disabled={soloLectura}
                  onCheckedChange={(enabled) => cambiarForma(f.method, { enabled })}
                />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="text-sm font-medium text-headline">{f.label}</p>
                  <p className="text-sm text-text-soft">{DESCRIPCION[f.method]}</p>
                </div>
                {TONO_DE_ESTADO[estado] === "neutral" ? (
                  <Badge variant="neutral">{ETIQUETA_DE_ESTADO[estado]}</Badge>
                ) : (
                  <Badge variant={TONO_DE_ESTADO[estado] as "success" | "warning"}>{ETIQUETA_DE_ESTADO[estado]}</Badge>
                )}
              </div>
              {estado === "falta_configurar" && (
                <p className="text-sm text-status-warning-fg">
                  {falta}{" "}
                  {f.method === "pago_en_linea" && (
                    <Link className="text-link underline underline-offset-2" href="/conexiones/pagos">
                      Conectar Wompi
                    </Link>
                  )}
                </p>
              )}
              {enPantalla.enabled && (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor={idInstrucciones} className="text-sm font-medium text-headline">
                    Instrucciones para el cliente (opcional)
                  </label>
                  <Textarea
                    id={idInstrucciones}
                    value={enPantalla.instructions}
                    maxLength={500}
                    disabled={soloLectura}
                    placeholder="Por ejemplo: paga en efectivo y ten el cambio listo."
                    onChange={(e) => cambiarForma(f.method, { instructions: e.target.value })}
                  />
                </div>
              )}
              {f.method === "transferencia" && enPantalla.enabled && (
                <fieldset className="flex flex-col gap-3" disabled={soloLectura}>
                  <legend className="text-sm font-medium text-headline">Cuentas para recibir transferencias</legend>
                  {borrador.transfer_accounts.length === 0 && (
                    <p className="text-sm text-text-soft">Aún no hay cuentas. Agrega la primera para que el agente pueda ofrecer transferencia.</p>
                  )}
                  {borrador.transfer_accounts.map((cuenta, i) => (
                    <div key={i} className="flex flex-col gap-3 rounded-md border border-border-soft p-3" role="group" aria-label={`Cuenta ${i + 1}`}>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {CAMPOS_DE_CUENTA.map((campo) => {
                          const id = `${base}-cuenta-${i}-${campo.clave}`;
                          return (
                            <div key={campo.clave} className="flex flex-col gap-1.5">
                              <label htmlFor={id} className="text-sm font-medium text-headline">
                                {campo.label}
                                {campo.obligatorio && <span className="sr-only"> (obligatorio)</span>}
                              </label>
                              <Input
                                id={id}
                                value={cuenta[campo.clave] ?? ""}
                                maxLength={80}
                                required={campo.obligatorio}
                                className="min-h-11"
                                onChange={(e) => cambiarCuenta(i, campo.clave, e.target.value)}
                              />
                            </div>
                          );
                        })}
                      </div>
                      <div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="min-h-11"
                          onClick={() =>
                            setBorrador((b) => ({ ...b, transfer_accounts: b.transfer_accounts.filter((_, j) => j !== i) }))
                          }
                        >
                          <Trash2 aria-hidden="true" className="size-4" />
                          Quitar la cuenta {i + 1}
                        </Button>
                      </div>
                    </div>
                  ))}
                  {borrador.transfer_accounts.length < 10 && (
                    <div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="min-h-11"
                        onClick={() => setBorrador((b) => ({ ...b, transfer_accounts: [...b.transfer_accounts, cuentaVacia()] }))}
                      >
                        <Plus aria-hidden="true" className="size-4" />
                        Agregar cuenta
                      </Button>
                    </div>
                  )}
                  <div className="flex flex-col gap-3 border-t border-border-soft pt-3">
                    <div className="flex items-start gap-3">
                      <Switch
                        id={`${base}-comprobante`}
                        aria-label="Pedir el comprobante"
                        checked={borrador.transfer_proof_required}
                        disabled={soloLectura}
                        onCheckedChange={(v) =>
                          setBorrador((b) => ({ ...b, transfer_proof_required: v, transfer_ocr_enabled: v ? b.transfer_ocr_enabled : false }))
                        }
                      />
                      <div className="flex flex-col gap-0.5">
                        <p className="text-sm font-medium text-headline">Pedir el comprobante</p>
                        <p className="text-sm text-text-soft">El agente pide la foto del comprobante antes de dar el pedido por pagado.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Switch
                        id={`${base}-lectura`}
                        aria-label="Leer el comprobante automáticamente"
                        checked={borrador.transfer_ocr_enabled}
                        disabled={soloLectura || !borrador.transfer_proof_required}
                        onCheckedChange={(v) => setBorrador((b) => ({ ...b, transfer_ocr_enabled: v }))}
                      />
                      <div className="flex flex-col gap-0.5">
                        <p className="text-sm font-medium text-headline">Leer el comprobante automáticamente</p>
                        <p className="text-sm text-text-soft">
                          Lo compara con el pedido. Solo lo da por pagado si el monto, la cuenta y la fecha coinciden; si no, queda en revisión
                          para una persona.
                        </p>
                      </div>
                    </div>
                  </div>
                </fieldset>
              )}
            </li>
          );
        })}
      </ul>
      <FormFeedback error={error} />
      {puedeEditar && (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" loading={guardando} disabled={!sinGuardar} onClick={() => void guardar()}>
            Guardar formas de pago
          </Button>
          {sinGuardar && <span className="text-sm text-status-warning-fg">Hay cambios sin guardar en las formas de pago.</span>}
        </div>
      )}
    </div>
  );
}
