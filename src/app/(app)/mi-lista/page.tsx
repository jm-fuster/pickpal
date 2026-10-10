"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { BookHeart, PencilLine, X } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AddRowButton } from "@/components/layout/AddRowButton";
import { EmptyState } from "@/components/layout/EmptyState";
import { ListItemLink } from "@/components/lista/ListItemLink";
import { ListReaders } from "@/components/lista/ListReaders";
import { userErrorMessage } from "@/lib/errors";

// El formulario (react-hook-form + zod) solo aparece al apuntar o editar algo.
// Va en su propio chunk, que se pide al montar la página: llega mucho antes de
// que la lista cargue, así que el botón lo abre sin esperas.
const loadListItemForm = () => import("@/components/lista/ListItemForm");
const ListItemForm = dynamic(() => loadListItemForm().then((m) => m.ListItemForm));

/**
 * «Mi lista»: lo que te haría ilusión recibir, para quien te regala
 * (docs/encargo-lista.md). Es la única pantalla de la app que habla de ti y no
 * de otra persona. Lo que se marca para regalarte no aparece en ningún sitio
 * de esta página.
 */
export default function MyListPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const items = useQuery(api.lists.myItems, isLoaded && isSignedIn ? {} : "skip");
  const removeItem = useMutation(api.lists.removeItem);

  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<Id<"listItems"> | null>(null);

  useEffect(() => {
    void loadListItemForm();
  }, []);

  const handleRemove = async (id: Id<"listItems">) => {
    try {
      await removeItem({ id });
      toast.success("Quitado de tu lista");
    } catch (err) {
      toast.error(userErrorMessage(err, "No se pudo quitar"));
    }
  };

  return (
    <main className="flex flex-1 flex-col gap-8 p-4 sm:p-6 lg:p-8 w-full max-w-5xl">
      <div>
        <h1 className="text-4xl font-medium">Mi lista</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Lo que te haría ilusión recibir, para quien te regala.
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {items === undefined ? (
          <div className="space-y-3" role="status">
            <span className="sr-only">Cargando tu lista…</span>
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                aria-hidden
                className="h-16 rounded-2xl border border-dashed border-border/60 animate-pulse"
              />
            ))}
          </div>
        ) : items.length === 0 && !adding ? (
          <EmptyState
            icon={BookHeart}
            title="Nada apuntado todavía"
            description="Apunta lo que te haría ilusión recibir, con su enlace si lo tienes. Quien tenga acceso a tu lista lo verá en su libreta, junto a tus fechas."
            cta={
              <Button size="lg" onClick={() => setAdding(true)} className="hover:bg-primary/80">
                Apuntar lo primero
              </Button>
            }
          />
        ) : (
          <Card className="border-border/60 shadow-sm">
            <CardContent className="space-y-4 p-5">
              <h2 className="font-sans text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-2">
                <BookHeart className="size-3.5" aria-hidden />
                Lo que te haría ilusión
              </h2>

              {adding ? (
                <ListItemForm onDone={() => setAdding(false)} />
              ) : (
                <AddRowButton onClick={() => setAdding(true)}>Apuntar algo</AddRowButton>
              )}

              {items.length > 0 && (
                <ul className="space-y-2">
                  {items.map((item) => (
                    <li key={item._id}>
                      {editingId === item._id ? (
                        <ListItemForm item={item} onDone={() => setEditingId(null)} />
                      ) : (
                        <div className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-background/60 p-3 text-sm">
                          <div className="min-w-0 flex-1 space-y-1">
                            <p className="font-medium leading-snug">{item.title}</p>
                            {item.url && <ListItemLink url={item.url} />}
                            {item.note && (
                              <p className="whitespace-pre-line text-xs text-muted-foreground">
                                {item.note}
                              </p>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Editar ${item.title}`}
                              title="Editar"
                              onClick={() => setEditingId(item._id)}
                            >
                              <PencilLine className="size-3.5" aria-hidden />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Quitar ${item.title} de tu lista`}
                              title="Quitar"
                              onClick={() => handleRemove(item._id)}
                            >
                              <X className="size-3.5" aria-hidden />
                            </Button>
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}

        <ListReaders />
      </div>
    </main>
  );
}
