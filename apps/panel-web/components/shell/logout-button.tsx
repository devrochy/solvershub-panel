"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        await fetch("/api/session", { method: "DELETE" }).catch(() => {});
        router.replace("/login");
        router.refresh();
      }}
    >
      <LogOut className="h-4 w-4" aria-hidden />
      Salir
    </Button>
  );
}
