"use client";

import { useRef, useState } from "react";

import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

/** Espera tras la última tecla antes de pedir sugerencias. */
const ESPERA = 250;

type Sugerencia = { slug: string; name: string };

/**
 * Campo de negocio del master en Colaboradores: se escribe el slug con autocompletado por
 * nombre o slug (`GET /api/platform/tenants?q=`). Lista nativa (`datalist`): accesible y sin
 * dependencias. El valor que viaja es el slug, que es lo que la API espera.
 */
export function CampoDeNegocio({
  id,
  name = "tenant",
  label = "Negocio",
  help,
  required,
}: {
  id: string;
  name?: string;
  label?: string;
  help?: string;
  required?: boolean;
}) {
  const [valor, setValor] = useState("");
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listaId = `${id}-negocios`;

  function buscar(consulta: string) {
    setValor(consulta);
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/platform/tenants?q=${encodeURIComponent(consulta.trim())}`);
        const json = (await res.json().catch(() => null)) as { items?: Sugerencia[] } | null;
        setSugerencias(json?.items ?? []);
      } catch {
        setSugerencias([]);
      }
    }, ESPERA);
  }

  return (
    <>
      <Field label={label} htmlFor={id} help={help} required={required}>
        <Input
          id={id}
          name={name}
          list={listaId}
          value={valor}
          onChange={(e) => buscar(e.target.value)}
          onFocus={() => {
            if (sugerencias.length === 0) buscar(valor);
          }}
          required={required}
          autoComplete="off"
          placeholder="slug del negocio"
        />
      </Field>
      <datalist id={listaId}>
        {sugerencias.map((s) => (
          <option key={s.slug} value={s.slug}>
            {s.name}
          </option>
        ))}
      </datalist>
    </>
  );
}
