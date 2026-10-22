"use client";

import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SelectConIcono, type Opcion } from "@/components/ui/select-con-icono";
import { PAISES, PAIS_POR_DEFECTO } from "@/lib/paises";

const OPCIONES: Opcion[] = PAISES.map((p) => ({
  value: p.codigo,
  label: `${p.nombre} (${p.indicativo})`,
  icono: <span aria-hidden>{p.bandera}</span>,
}));

/**
 * Teléfono con indicativo (bandera) y número, en una sola fila. El valor que entrega es el
 * teléfono completo con indicativo (p. ej. «+57 300 123 4567»).
 */
export function CampoTelefono({
  indicativo,
  numero,
  onIndicativo,
  onNumero,
}: {
  indicativo: string;
  numero: string;
  onIndicativo: (codigo: string) => void;
  onNumero: (numero: string) => void;
}) {
  const pais = PAISES.find((p) => p.codigo === indicativo) ?? PAISES[0];

  return (
    <Field label="Teléfono" htmlFor="new-telefono" help="Con indicativo, por ejemplo +57.">
      <div className="grid grid-cols-[9.5rem_1fr] gap-2">
        <SelectConIcono
          id="new-indicativo"
          label="Indicativo"
          value={pais.codigo}
          onChange={onIndicativo}
          options={OPCIONES}
        />
        <Input
          id="new-telefono"
          inputMode="tel"
          autoComplete="tel"
          placeholder="300 123 4567"
          value={numero}
          onChange={(e) => onNumero(e.target.value.replace(/[^\d\s]/g, ""))}
        />
      </div>
    </Field>
  );
}

export { PAIS_POR_DEFECTO };
