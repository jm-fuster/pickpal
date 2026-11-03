import Link from "next/link";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

/**
 * Una lista que llevas y que ya no está: borrada (desde otra pestaña) o un
 * enlace viejo. Como «Persona no encontrada» en la ficha.
 */
export function ManagedListGone() {
  return (
    <main className="flex flex-1 flex-col gap-4 p-8">
      <p>Esta lista ya no existe.</p>
      <Link href="/mi-lista" className={cn(buttonVariants({ variant: "outline" }), "self-start")}>
        Volver a Mi lista
      </Link>
    </main>
  );
}
