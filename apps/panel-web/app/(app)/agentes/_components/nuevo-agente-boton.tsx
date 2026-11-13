"use client";

import Link from "next/link";

import { AvisoLimiteDePlan } from "@/components/domain/aviso-limite-de-plan";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";

/**
 * «Nuevo agente» con el tope del plan delante: con cupo navega al asistente; al tope abre un
 * aviso con «Mejorar mi plan» y no deja empezar un agente que después no se podrá publicar.
 */
export function NuevoAgenteBoton({ aviso }: { aviso: string | null }) {
  if (!aviso) {
    return (
      <Button asChild variant="accent">
        <Link href="/agentes/nuevo">Nuevo agente</Link>
      </Button>
    );
  }
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="accent">Nuevo agente</Button>
      </DialogTrigger>
      <DialogContent
        title="Llegaste al tope de agentes"
        description="Tu plan ya tiene todos los agentes publicados que incluye. Para crear otro, primero mejora el plan."
      >
        <AvisoLimiteDePlan mensaje={aviso} />
        <div className="mt-4 flex justify-end">
          <DialogClose asChild>
            <Button variant="outline">Entendido</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
