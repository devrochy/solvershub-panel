import { BotonReintentar, EstadoDeError } from "@/components/ui/estado-de-error";
import { AccionesDeClientes } from "@/app/(app)/leads/_components/acciones-de-clientes";
import { ClientesDeModulo } from "@/components/domain/clientes-de-modulo";
import { FichaCliente } from "@/components/domain/cliente/ficha-cliente";
import { apiFetch } from "@/lib/api/server";
import type { CaptarLeadsConfigResponse, LeadDetail, Me } from "@/lib/api/types";
import {
  esPropietarioOPlataforma,
  hrefListaClientes,
  puedeEditarClientes,
  type FiltrosClientes,
} from "@/lib/clientes";

export const metadata = { title: "Clientes" };

/**
 * Clientes (rediseño 2026-11): una sola sección. La lista y el embudo son vistas de la misma página; «Leads» dejó de
 * ser una pestaña aparte y ahora es el filtro «Con datos» + la vista «Embudo». La ficha se abre encima de la lista y
 * conserva la vista y los filtros.
 */
export default async function ClientesPage({ searchParams }: { searchParams: Promise<FiltrosClientes> }) {
  const sp = await searchParams;
  const [ficha, me, captacion] = await Promise.all([
    sp.cliente ? apiFetch<LeadDetail>(`/admin/leads/${encodeURIComponent(sp.cliente)}`) : null,
    apiFetch<Me>("/admin/me"),
    apiFetch<CaptarLeadsConfigResponse>("/admin/captar-leads/config"),
  ]);

  const hrefLista = hrefListaClientes(sp);
  const puedeEditar = me.ok ? puedeEditarClientes(me.data) : false;
  const captacionActiva = Boolean(
    captacion.ok && (captacion.data.values as Record<string, unknown>).lead_intake_enabled,
  );

  const fichaNode = ficha ? (
    ficha.ok ? (
      <FichaCliente
        key={`${ficha.data.id}-${sp.agente ?? "general"}-${sp.editar ?? ""}`}
        detalle={ficha.data}
        closeHref={hrefLista}
        agenteInicial={sp.agente}
        editarInicial={sp.editar === "1"}
        hrefBase={hrefLista}
        puedeEditar={puedeEditar}
        esPropietario={me.ok ? esPropietarioOPlataforma(me.data) : false}
      />
    ) : (
      <EstadoDeError
        forma="en-linea"
        titulo="No pudimos abrir la ficha"
        descripcion="Vuelve a intentarlo o elige otro cliente de la lista."
        detalle={ficha.error}
        accion={<BotonReintentar />}
      />
    )
  ) : null;

  return (
    <ClientesDeModulo
      basePath="/leads"
      titulo="Clientes"
      descripcion="Las personas que escribieron a tu agente o llegaron por tu formulario. Mira la lista completa o el embudo de leads, y abre una ficha para corregir sus datos o pausar al agente solo para ella."
      sp={sp}
      helpSection="leads"
      vacioDescripcion="Cuando tu agente atienda al primer cliente, aparecerá aquí. También puedes crearlo a mano o importar una lista."
      operable={{
        etapa: "estado_lead",
        filtros: ["origen", "clasificacion", "motivo_perdida", "valor"],
        motivoDePerdida: "motivo_perdida",
        valor: "valor",
        pluginDeEtapa: "leads",
        seguimiento: "seguimiento",
        conDatos: "lead_datos",
      }}
      directorio
      columnasDe="leads"
      columnasOcultas={["estado_lead", "seguimiento_nota", "puntaje", "motivo_perdida", "interes", "origen", "negocio", "valor_estimado"]}
      sesion={me.ok ? me.data : null}
      headerActions={
        puedeEditar ? (
          <AccionesDeClientes
            captacionDisponible={captacion.ok}
            captacionActiva={captacionActiva}
            captacionConfigurada={Boolean(captacion.ok && captacion.data.configured)}
          />
        ) : undefined
      }
      ficha={fichaNode}
      etiquetaDeLista="Clientes"
    />
  );
}
