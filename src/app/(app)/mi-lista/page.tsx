"use client";

import { OwnerListView } from "@/components/lista/OwnerListView";
import { ManagedListsCard } from "@/components/lista/ManagedListsCard";

/**
 * «Mi lista»: lo que te haría ilusión recibir, para quien te regala
 * (docs/encargo-lista.md). Es la única pantalla de la app que habla de ti y no
 * de otra persona. Lo que se marca para regalarte no aparece en ningún sitio
 * de esta página.
 *
 * Debajo, las listas que llevas para quien no tiene cuenta
 * (docs/encargo-listas-ninos.md), cada una en su propia página.
 */
export default function MyListPage() {
  return (
    <main className="flex flex-1 flex-col gap-8 p-4 sm:p-6 lg:p-8 w-full max-w-5xl">
      <div>
        <h1 className="text-4xl font-medium">Mi lista</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Lo que te haría ilusión recibir, para quien te regala.
        </p>
      </div>

      <OwnerListView />

      <ManagedListsCard />
    </main>
  );
}
