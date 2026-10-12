"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, HandHeart } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AddRowButton } from "@/components/layout/AddRowButton";
import { userErrorMessage } from "@/lib/errors";
import { MAX_MANAGED_LISTS } from "@/lib/listLimits";

const things = (n: number) => (n === 1 ? "1 cosa" : `${n} cosas`);
const readers = (n: number) => (n === 0 ? "no la ve nadie" : n === 1 ? "la ve 1 persona" : `la ven ${n} personas`);

/**
 * «Listas que llevas»: las listas de quien no tiene cuenta (casi siempre un
 * niño) que llevas tú, cada una con su página (docs/encargo-listas-ninos.md,
 * opción A). Solo el nombre de pila: ni edad ni fecha de nacimiento.
 */
export function ManagedListsCard() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const lists = useQuery(api.lists.myManagedLists, isLoaded && isSignedIn ? {} : "skip");
  const createList = useMutation(api.lists.createManagedList);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  if (lists === undefined) return null;
  const full = lists.length >= MAX_MANAGED_LISTS;

  const handleCreate = async () => {
    setSaving(true);
    try {
      const listId = await createList({ forName: name });
      router.push(`/mi-lista/llevas/${listId}`);
    } catch (err) {
      toast.error(userErrorMessage(err, "No se pudo crear la lista"));
      setSaving(false);
    }
  };

  return (
    <Card className="border-border/60 shadow-sm">
      <CardContent className="space-y-4 p-5">
        <div className="space-y-1">
          <h2 className="font-sans text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-2">
            <HandHeart className="size-3.5" aria-hidden />
            Listas que llevas
          </h2>
          <p className="text-sm text-muted-foreground">
            Para quien no tiene cuenta, como un niño: apuntas lo que le haría ilusión y la compartes con
            quien le regala. Tú ves qué está cogido, no quién lo regala.
          </p>
        </div>

        {lists.length > 0 && (
          <ul className="space-y-2">
            {lists.map((l) => (
              <li key={l.listId}>
                <Link
                  href={`/mi-lista/llevas/${l.listId}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/60 p-3 text-sm transition-colors hover:bg-muted/40"
                >
                  <span className="min-w-0">
                    <span className="block font-medium">La lista de {l.forName}</span>
                    <span className="text-xs text-muted-foreground">
                      {things(l.itemCount)} · {readers(l.readerCount)}
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}

        {full ? (
          <p className="text-sm text-muted-foreground">
            Ya llevas {MAX_MANAGED_LISTS} listas, el máximo. Borra alguna para empezar otra.
          </p>
        ) : creating ? (
          <div className="space-y-3 rounded-xl border border-dashed border-border/70 bg-background/40 p-4">
            <div className="space-y-2">
              <Label htmlFor="lista-a-cargo-nombre">¿Para quién es?</Label>
              <Input
                id="lista-a-cargo-nombre"
                value={name}
                maxLength={40}
                autoFocus
                placeholder="Lucía"
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && name.trim()) void handleCreate();
                }}
              />
              <p className="text-xs text-muted-foreground">Basta el nombre de pila. No hace falta su edad.</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreating(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button className="hover:bg-primary/80" onClick={handleCreate} disabled={saving || !name.trim()}>
                {saving ? "Creando…" : "Crear la lista"}
              </Button>
            </div>
          </div>
        ) : (
          <AddRowButton onClick={() => setCreating(true)}>Llevar una lista para otra persona</AddRowButton>
        )}
      </CardContent>
    </Card>
  );
}
