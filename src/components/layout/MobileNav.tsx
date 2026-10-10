"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

// El panel lateral (base-ui Dialog con su gestor de foco) va en su propio
// chunk y solo en el cliente: se descarga justo después de hidratar, ya montado
// y cerrado, así que abrir el menú no espera a la red y la carga inicial de
// cada página no lo paga.
const MobileNavSheet = dynamic(
  () => import("./MobileNavSheet").then((m) => m.MobileNavSheet),
  { ssr: false },
);

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Abrir menú"
        onClick={() => setOpen(true)}
      >
        <Menu className="size-5" />
      </Button>

      <MobileNavSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
