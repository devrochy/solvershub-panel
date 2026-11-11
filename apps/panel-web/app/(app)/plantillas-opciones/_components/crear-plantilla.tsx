"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { CLAVE_VALIDA, claveDesdeNombre, esBanderaApagada, esLimiteDePlantillas } from "@/lib/plantillas-opciones";
import { opcionesApi } from "@/lib/plantillas-opciones-cliente";
import { toast } from "@/lib/toast-store";
import { cn } from "@/lib/utils";

/**
 * «Nueva plantilla»: pide el nombre y abre el editor con un borrador vacío. La clave sale del nombre y queda
 * plegada en «Avanzado» (PLA-04); se abre sola si hay que corregirla.
 */
export function CrearPlantilla({ onBanderaApagada }: { onBanderaApagada?: () => void }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [clave, setClave] = useState("");
  const [claveEditada, setClaveEditada] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorClave, setErrorClave] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const [avanzado, setAvanzado] = useState(false);

  function abrir() {
    setNombre("");
    setClave("");
    setClaveEditada(false);
    setError(null);
    setErrorClave(null);
    setAvanzado(false);
    setAbierto(true);
  }

  function cambiarNombre(valor: string) {
    setNombre(valor);
    if (!claveEditada) setClave(claveDesdeNombre(valor));
  }

  async function crear(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setErrorClave(null);
    if (!nombre.trim()) {
      setError("Escribe un nombre para la plantilla.");
      return;
    }
    if (!CLAVE_VALIDA.test(clave)) {
      setErrorClave("La clave admite minúsculas, números y guion bajo (hasta 40).");
      setAvanzado(true);
      return;
    }
    setCreando(true);
    const res = await opcionesApi.crear({ clave, nombre: nombre.trim() });
    setCreando(false);
    if (res.ok) {
      toast.success("Plantilla creada. Arma tu mensaje y sus opciones.");
      router.push(`/plantillas-opciones/${encodeURIComponent(clave)}`);
      return;
    }
    if (esBanderaApagada(res)) {
      setAbierto(false);
      onBanderaApagada?.();
      return;
    }
    if (res.code === "clave_repetida") {
      setErrorClave("Ya tienes una plantilla con esa clave. Cámbiala para continuar.");
      setAvanzado(true);
    }
    else if (esLimiteDePlantillas(res)) setError(`${res.mensaje} Elimina o retira alguna que ya no uses.`);
    else setError(res.mensaje);
  }

  return (
    <>
      <Button type="button" variant="accent" onClick={abrir}>
        <Plus className="h-4 w-4" aria-hidden />
        Nueva plantilla
      </Button>
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent title="Nueva plantilla con opciones" description="Ponle un nombre. Después armas el mensaje, sus botones y lo que hace cada uno.">
          <form onSubmit={crear} className="flex flex-col gap-4" noValidate>
            <Field label="Nombre" htmlFor="nueva-nombre" required help="Es para ti: tus clientes no lo ven.">
              <Input id="nueva-nombre" value={nombre} maxLength={120} autoFocus placeholder="Ej.: Confirmar cita" onChange={(e) => cambiarNombre(e.target.value)} />
            </Field>
            <button
              type="button"
              aria-expanded={avanzado}
              aria-controls="nueva-avanzado"
              onClick={() => setAvanzado((v) => !v)}
              className="flex items-center justify-between rounded-md border border-dashed border-border px-3 py-2.5 text-left text-sm text-body hover:bg-hover focus-visible:outline-2 focus-visible:outline-focus"
            >
              Avanzado: clave de la plantilla
              <ChevronDown aria-hidden className={cn("h-4 w-4 text-text-soft transition-transform duration-150", avanzado && "rotate-180")} />
            </button>
            {avanzado && (
              <div id="nueva-avanzado">
                <Field
                  label="Clave"
                  htmlFor="nueva-clave"
                  required
                  help="Sale del nombre y la usa el sistema para identificarla. No se puede cambiar después."
                  error={errorClave ?? undefined}
                >
                  <Input
                    id="nueva-clave"
                    className="font-mono"
                    value={clave}
                    maxLength={40}
                    onChange={(e) => {
                      setClaveEditada(true);
                      setClave(e.target.value.toLowerCase());
                    }}
                  />
                </Field>
              </div>
            )}
            <FormFeedback error={error} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setAbierto(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="accent" loading={creando}>
                Crear plantilla
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
