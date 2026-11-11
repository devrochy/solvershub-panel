"use client";

import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { MenuDeFila } from "@/components/domain/menu-de-fila";
import { useAction } from "@/lib/use-action";
import { estadoDePedido, otrosCambios, siguientePaso, type CambioDeEstado } from "@/lib/ventas";

/** Cambia el estado de un pedido; cancelar pide confirmación porque el cliente ya no lo recibirá. */
export function useCambiarEstado(pedido: { id: string; public_order_number: string }) {
  const { run, pending } = useAction();
  const confirmar = useConfirm();

  async function cambiar(cambio: CambioDeEstado): Promise<boolean> {
    if (cambio.destructivo) {
      const ok = await confirmar({
        title: `¿Cancelar el pedido ${pedido.public_order_number}?`,
        description: "El pedido queda cancelado y deja de contar como venta. Si el cliente ya pagó, la devolución se hace por fuera del panel.",
        confirmLabel: "Cancelar el pedido",
        cancelLabel: "No, dejarlo",
        destructive: true,
      });
      if (!ok) return false;
    }
    return run(async () => {
      const res = await fetch(`/api/pack/commerce/orders/${encodeURIComponent(pedido.id)}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: cambio.estado }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        return { ok: false, status: res.status, error: json.error ?? "No se pudo cambiar el estado del pedido." };
      }
      return { ok: true, success: `${pedido.public_order_number}: ${estadoDePedido(cambio.estado).label.toLowerCase()}.` };
    });
  }

  return { cambiar, pending };
}

/** El botón del siguiente paso («Marcar como despachado»); un pedido cerrado no lo tiene. */
export function BotonSiguientePaso({
  pedido,
  variant = "accent",
  className,
}: {
  pedido: { id: string; public_order_number: string; status: string };
  variant?: "accent" | "outline";
  className?: string;
}) {
  const { cambiar, pending } = useCambiarEstado(pedido);
  const paso = siguientePaso(pedido.status);
  if (!paso) return null;
  return (
    <Button
      type="button"
      size={variant === "outline" ? "sm" : undefined}
      variant={variant}
      loading={pending}
      className={className}
      aria-label={variant === "outline" ? `${paso.label}: ${pedido.public_order_number}` : undefined}
      onClick={() => void cambiar(paso)}
    >
      {paso.label}
    </Button>
  );
}

/** Los demás cambios de estado del pedido, en «Más acciones». */
export function MasAccionesDePedido({ pedido }: { pedido: { id: string; public_order_number: string; status: string } }) {
  const { cambiar } = useCambiarEstado(pedido);
  return (
    <MenuDeFila etiqueta={`Más acciones del pedido ${pedido.public_order_number}`}>
      {otrosCambios(pedido.status).map((c) => (
        <DropdownMenuItem key={c.estado} tone={c.destructivo ? "danger" : "default"} onSelect={() => void cambiar(c)}>
          {c.label}
        </DropdownMenuItem>
      ))}
    </MenuDeFila>
  );
}
