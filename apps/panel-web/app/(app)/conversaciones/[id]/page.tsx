import { redirect } from "next/navigation";

/** La vista de detalle vive en la bandeja (HU-UX-15): los enlaces viejos abren el chat ahí. */
export default async function ConversationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/conversaciones?c=${encodeURIComponent(id)}`);
}
