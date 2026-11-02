"use client";

import { useEffect } from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { PageMessage } from "@/components/layout/PageMessage";
import { PlainShell } from "@/components/layout/PlainShell";

// La página de un fallo inesperado. No enseña `error.message`: en producción
// Next lo sustituye por uno genérico y, aun así, no es para quien usa la app
// (docs/security.md, sanitización de errores). `retry` vuelve a pedir y a
// pintar lo que falló (Next 16.3+; `reset` solo borra el estado).
export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PlainShell>
      <PageMessage
        icon={TriangleAlert}
        title="No se ha podido cargar esta página"
        description="Ha fallado algo por nuestra parte. Vuelve a intentarlo y, si sigue igual, prueba dentro de un rato."
      >
        <Button size="lg" onClick={() => retry()}>
          Volver a intentarlo
        </Button>
        <Link href="/" className={buttonVariants({ variant: "outline", size: "lg" })}>
          Ir al inicio
        </Link>
      </PageMessage>
    </PlainShell>
  );
}
