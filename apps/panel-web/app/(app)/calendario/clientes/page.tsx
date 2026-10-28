import { ClientesDeModulo, type FiltrosClientesDeModulo } from "@/components/domain/clientes-de-modulo";

export const metadata = { title: "Clientes de Agenda" };

export default async function ClientesDeAgendaPage({ searchParams }: { searchParams: Promise<FiltrosClientesDeModulo> }) {
  return (
    <ClientesDeModulo
      agente="agenda"
      basePath="/calendario/clientes"
      titulo="Clientes de Agenda"
      descripcion="Las personas que han agendado una cita. Abre una para ver y corregir sus datos de agenda."
      sp={await searchParams}
      helpSection="leads"
      vacioDescripcion="Cuando un cliente agende su primera cita, aparecerá aquí."
    />
  );
}
