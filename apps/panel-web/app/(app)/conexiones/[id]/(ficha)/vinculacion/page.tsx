import { redirect } from "next/navigation";

/** Vinculación se unió con Estado (CON-21): los enlaces viejos llegan a esa pestaña. */
export default async function VinculacionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/conexiones/${id}/estado`);
}
