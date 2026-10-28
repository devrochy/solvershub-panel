import { NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/server";

/** BFF (HU-CRM-16): guarda el texto y el interruptor del aviso de tratamiento de datos. */
export async function PUT(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    activo?: unknown;
    texto?: unknown;
    confirmo_revision_legal?: unknown;
  } | null;
  if (
    !body ||
    typeof body.activo !== "boolean" ||
    typeof body.texto !== "string" ||
    body.texto.length > 1000 ||
    (body.confirmo_revision_legal !== undefined && typeof body.confirmo_revision_legal !== "boolean")
  ) {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }
  const res = await apiFetch("/admin/datos-cliente/aviso", {
    method: "PUT",
    body: {
      activo: body.activo,
      texto: body.texto,
      confirmo_revision_legal: body.confirmo_revision_legal === true,
    },
  });
  if (!res.ok) {
    return NextResponse.json(
      { error: res.error, ...(res.fields ? { fields: res.fields } : {}) },
      { status: res.status },
    );
  }
  return NextResponse.json(res.data);
}
