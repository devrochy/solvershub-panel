"use client";

import type { ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

/**
 * Las acciones de una fila en un menú; `modal={false}` para poder abrir un diálogo desde él. Dentro
 * de un cajón o diálogo va `dentroDeUnCajon`: el menú tiene que atrapar el foco o el cajón se lo
 * quita y el menú se cierra apenas se abre.
 */
export function MenuDeFila({
  etiqueta,
  children,
  dentroDeUnCajon = false,
}: {
  etiqueta: string;
  children: ReactNode;
  dentroDeUnCajon?: boolean;
}) {
  return (
    <DropdownMenu modal={dentroDeUnCajon}>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" aria-label={etiqueta} title={etiqueta} className="pointer-coarse:h-11 pointer-coarse:w-11">
          <MoreHorizontal className="h-4 w-4" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>{children}</DropdownMenuContent>
    </DropdownMenu>
  );
}
