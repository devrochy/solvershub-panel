import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { interpretarRetorno } from "@/lib/instagram-alta";

import { RetornoDeInstagram } from "../_components/retorno-de-instagram";

export const metadata = { title: "Conectar Instagram" };

type Params = { code?: string; state?: string; error?: string; error_reason?: string; error_description?: string };

/** A donde Instagram devuelve a la persona tras autorizar (o cancelar) la conexión (`INSTAGRAM_LOGIN_REDIRECT_URI`). */
export default async function RetornoDeInstagramPage({ searchParams }: { searchParams: Promise<Params> }) {
  const retorno = interpretarRetorno(await searchParams);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Conectar Instagram" description="Estamos terminando de conectar tu cuenta." />
      {retorno.tipo === "listo" ? (
        <RetornoDeInstagram code={retorno.code} state={retorno.state} />
      ) : (
        <div className="flex flex-col gap-4">
          <p role={retorno.tipo === "invalido" ? "alert" : "status"} className="text-sm text-body">
            {retorno.tipo === "cancelado"
              ? retorno.motivo
              : "Esta dirección no trae la autorización de Instagram. Empieza de nuevo desde la pantalla de conexión."}
          </p>
          <div>
            <Button asChild variant="accent">
              <Link href="/conexiones/instagram">Volver a Instagram</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
