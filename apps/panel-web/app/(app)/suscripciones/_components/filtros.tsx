import Link from "next/link";

import { SUBSCRIPTION_STATUS, CHARGE_STATUS } from "@/components/domain/status-badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  ESTADOS_PAGO,
  ESTADOS_SUSCRIPCION,
  PERIODICIDADES,
  TIPOS_PAGO,
  periodicidadLabel,
  tipoDePagoLabel,
  type FiltrosClientesSuscripcion,
  type FiltrosPagos,
  type FiltrosSuscripciones,
  type OpcionDePlan,
} from "@/lib/suscripciones-admin";

function Limpiar({ href, activos }: { href: string; activos: boolean }) {
  return activos ? (
    <Link href={href} className="pb-2.5 text-sm text-link hover:underline">
      Limpiar
    </Link>
  ) : null;
}

function Mora({ valor, etiqueta = "Con mora" }: { valor?: string; etiqueta?: string }) {
  return (
    <Field label="Mora" htmlFor="con_mora" className="w-40">
      <Select id="con_mora" name="con_mora" defaultValue={valor === "1" || valor === "true" ? "1" : ""}>
        <option value="">Todas</option>
        <option value="1">{etiqueta}</option>
      </Select>
    </Field>
  );
}

/** Filtros de la lista de suscripciones. Formulario GET: la URL es el estado. */
export function FiltrosSuscripciones({ sp, planes }: { sp: FiltrosSuscripciones; planes: OpcionDePlan[] }) {
  const activos = Boolean(sp.q || sp.estado || sp.plan || sp.periodicidad || sp.con_mora || sp.cliente_id);
  return (
    <form method="get" className="flex flex-wrap items-end gap-3">
      {sp.cliente_id && <input type="hidden" name="cliente_id" value={sp.cliente_id} />}
      <Field label="Buscar" htmlFor="q" className="w-60">
        <Input id="q" name="q" type="search" defaultValue={sp.q ?? ""} placeholder="Cliente, teléfono o plan" />
      </Field>
      <Field label="Estado" htmlFor="estado" className="w-40">
        <Select id="estado" name="estado" defaultValue={sp.estado ?? ""}>
          <option value="">Todos</option>
          {ESTADOS_SUSCRIPCION.map((e) => (
            <option key={e} value={e}>
              {SUBSCRIPTION_STATUS[e].label}
            </option>
          ))}
        </Select>
      </Field>
      {planes.length > 0 && (
        <Field label="Plan" htmlFor="plan" className="w-52">
          <Select id="plan" name="plan" defaultValue={sp.plan ?? ""}>
            <option value="">Todos</option>
            {planes.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Field label="Periodicidad" htmlFor="periodicidad" className="w-40">
        <Select id="periodicidad" name="periodicidad" defaultValue={sp.periodicidad ?? ""}>
          <option value="">Todas</option>
          {PERIODICIDADES.map((p) => (
            <option key={p} value={p}>
              {periodicidadLabel(p)}
            </option>
          ))}
        </Select>
      </Field>
      <Mora valor={sp.con_mora} />
      <Button type="submit" variant="outline">
        Filtrar
      </Button>
      <Limpiar href="/suscripciones/lista" activos={activos} />
    </form>
  );
}

/** Filtros de los pagos (cobros). */
export function FiltrosPagos({ sp }: { sp: FiltrosPagos }) {
  const activos = Boolean(sp.q || sp.estado || sp.tipo || sp.vencidos || sp.desde || sp.hasta || sp.suscripcion_id);
  return (
    <form method="get" className="flex flex-wrap items-end gap-3">
      {sp.suscripcion_id && <input type="hidden" name="suscripcion_id" value={sp.suscripcion_id} />}
      <Field label="Buscar" htmlFor="q" className="w-60">
        <Input id="q" name="q" type="search" defaultValue={sp.q ?? ""} placeholder="Cliente, teléfono o plan" />
      </Field>
      <Field label="Estado" htmlFor="estado" className="w-40">
        <Select id="estado" name="estado" defaultValue={sp.estado ?? ""}>
          <option value="">Todos</option>
          {ESTADOS_PAGO.map((e) => (
            <option key={e} value={e}>
              {CHARGE_STATUS[e].label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Tipo" htmlFor="tipo" className="w-44">
        <Select id="tipo" name="tipo" defaultValue={sp.tipo ?? ""}>
          <option value="">Todos</option>
          {TIPOS_PAGO.map((t) => (
            <option key={t} value={t}>
              {tipoDePagoLabel(t)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Vence desde" htmlFor="desde" className="w-40">
        <Input id="desde" name="desde" type="date" defaultValue={sp.desde ?? ""} />
      </Field>
      <Field label="Vence hasta" htmlFor="hasta" className="w-40">
        <Input id="hasta" name="hasta" type="date" defaultValue={sp.hasta ?? ""} />
      </Field>
      <Field label="Vencimiento" htmlFor="vencidos" className="w-44">
        <Select id="vencidos" name="vencidos" defaultValue={sp.vencidos === "1" || sp.vencidos === "true" ? "1" : ""}>
          <option value="">Todos</option>
          <option value="1">Solo vencidos sin pagar</option>
        </Select>
      </Field>
      <Button type="submit" variant="outline">
        Filtrar
      </Button>
      <Limpiar href="/suscripciones/pagos" activos={activos} />
    </form>
  );
}

/** Filtros de los clientes con suscripción. */
export function FiltrosClientes({ sp }: { sp: FiltrosClientesSuscripcion }) {
  const activos = Boolean(sp.q || sp.con_mora || sp.incluir_canceladas);
  return (
    <form method="get" className="flex flex-wrap items-end gap-3">
      <Field label="Buscar" htmlFor="q" className="w-60">
        <Input id="q" name="q" type="search" defaultValue={sp.q ?? ""} placeholder="Nombre o teléfono" />
      </Field>
      <Mora valor={sp.con_mora} />
      <Field label="Canceladas" htmlFor="incluir_canceladas" className="w-56">
        <Select
          id="incluir_canceladas"
          name="incluir_canceladas"
          defaultValue={sp.incluir_canceladas === "1" || sp.incluir_canceladas === "true" ? "1" : ""}
        >
          <option value="">Solo con suscripción vigente</option>
          <option value="1">Incluir quienes ya cancelaron</option>
        </Select>
      </Field>
      <Button type="submit" variant="outline">
        Filtrar
      </Button>
      <Limpiar href="/suscripciones/clientes" activos={activos} />
    </form>
  );
}
