import Link from "next/link";
import { Compass } from "lucide-react";
import { buttonVariants } from "@/components/ui/button-variants";
import { PageMessage } from "@/components/layout/PageMessage";
import { PlainShell } from "@/components/layout/PlainShell";

// La 404 de toda la app (hay un solo layout raíz, así que basta este archivo).
// Antes salía la de Next, en inglés: «This page could not be found». El inicio
// manda a la Agenda si hay sesión.
export default function NotFound() {
  return (
    <PlainShell>
      <PageMessage
        icon={Compass}
        title="Esta página no existe"
        description="Puede que el enlace esté mal copiado o que la página ya no esté."
      >
        <Link href="/" className={buttonVariants({ size: "lg" })}>
          Ir al inicio
        </Link>
      </PageMessage>
    </PlainShell>
  );
}
