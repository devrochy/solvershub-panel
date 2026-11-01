import { ClientesDeModulo, type FiltrosClientesDeModulo } from "@/components/domain/clientes-de-modulo";

export const metadata = { title: "Clientes de Ventas" };

export default async function ClientesDeVentasPage({ searchParams }: { searchParams: Promise<FiltrosClientesDeModulo> }) {
  return (
    <ClientesDeModulo
      agente="ventas"
      basePath="/comercio/clientes"
      titulo="Clientes de Ventas"
      descripcion="Las personas con las que Ventas ha conversado o a quienes les ha vendido. Abre una para ver y corregir sus datos de venta."
      sp={await searchParams}
      helpSection="leads"
      vacioDescripcion="Cuando el agente de Ventas atienda al primer cliente, aparecerá aquí."
      operable={{ etapa: "estado_lead", filtros: ["clasificacion"], pluginDeEtapa: "pack_commerce" }}
    />
  );
}
