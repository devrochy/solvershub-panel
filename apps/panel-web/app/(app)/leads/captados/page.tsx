import { ClientesDeModulo, type FiltrosClientesDeModulo } from "@/components/domain/clientes-de-modulo";

export const metadata = { title: "Leads" };

/**
 * Leads (HU-AOS-70, ADR-0193): los clientes con un lead del core, con su etapa, origen, seguimiento y negocio, tenga
 * o no comercio el negocio. Sin comercio no hay columnas de pedidos ni cotizaciones; con comercio, Ventas › Clientes
 * sigue sumándolas.
 */
export default async function LeadsCaptadosPage({ searchParams }: { searchParams: Promise<FiltrosClientesDeModulo> }) {
  return (
    <ClientesDeModulo
      agente="leads"
      basePath="/leads/captados"
      titulo="Leads"
      descripcion="Las personas que tus agentes con Captar leads registraron, o que llegaron por el formulario de tu página. Abre una para ver y corregir sus datos."
      sp={await searchParams}
      helpSection="leads"
      vacioDescripcion="Cuando un agente con Captar leads registre al primer cliente, aparecerá aquí."
      operable={{
        etapa: "estado_lead",
        filtros: ["origen", "motivo_perdida", "valor"],
        motivoDePerdida: "motivo_perdida",
        valor: "valor",
        pluginDeEtapa: "leads",
        seguimiento: "seguimiento",
      }}
    />
  );
}
