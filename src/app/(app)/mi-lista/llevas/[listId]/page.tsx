"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { PencilLine } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BackLink } from "@/components/layout/BackLink";
import { OwnerListView } from "@/components/lista/OwnerListView";
import { userErrorMessage } from "@/lib/errors";

// Valor del selector para «ninguna ficha»: el Select no admite un valor vacío.
const NONE = "ninguna";

/**
 * Una lista que llevas para otra persona (docs/encargo-listas-ninos.md,
 * opción A). Funciona como «Mi lista», salvo que ves qué está cogido (nunca
 * quién) y puedes marcar tú. La ficha de tu libreta solo sirve para que «Ya se
 * lo he regalado» vaya a su historial; no le da acceso a nadie.
 */
export default function ManagedListPage({ params }: { params: Promise<{ listId: string }> }) {
  const { listId: raw } = use(params);
  const listId = raw as Id<"managedLists">;
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const ready = isLoaded && isSignedIn;
  const list = useQuery(api.lists.managedList, ready ? { listId } : "skip");
  const people = useQuery(api.people.getAll, ready ? {} : "skip");
  const rename = useMutation(api.lists.renameManagedList);
  const linkPerson = useMutation(api.lists.linkManagedListPerson);
  const deleteList = useMutation(api.lists.deleteManagedList);

  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<unknown>, fallback: string) => {
    setBusy(true);
    try {
      await action();
    } catch (err) {
      toast.error(userErrorMessage(err, fallback));
    } finally {
      setBusy(false);
    }
  };

  if (list === undefined) {
    return (
      <main className="flex flex-1 flex-col gap-8 p-4 sm:p-6 lg:p-8 w-full max-w-5xl" role="status">
        <span className="sr-only">Cargando la lista…</span>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-8 p-4 sm:p-6 lg:p-8 w-full max-w-5xl">
      <BackLink fallbackHref="/mi-lista" label="Mi lista" />
      <div className="space-y-3">
        {editingName ? (
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-2">
              <Label htmlFor="lista-a-cargo-renombrar">¿Para quién es?</Label>
              <Input
                id="lista-a-cargo-renombrar"
                value={name}
                maxLength={40}
                autoFocus
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <Button variant="outline" onClick={() => setEditingName(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button
              className="hover:bg-primary/80"
              disabled={busy || !name.trim()}
              onClick={() =>
                run(async () => {
                  await rename({ listId, forName: name });
                  setEditingName(false);
                }, "No se pudo cambiar el nombre")
              }
            >
              Guardar
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h1 className="text-4xl font-medium">La lista de {list.forName}</h1>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Cambiar el nombre"
              title="Cambiar el nombre"
              onClick={() => {
                setName(list.forName);
                setEditingName(true);
              }}
            >
              <PencilLine className="size-3.5" aria-hidden />
            </Button>
          </div>
        )}
        <p className="text-sm text-muted-foreground">
          La llevas tú. {list.forName} no la ve: no tiene cuenta.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {people && people.length > 0 && (
            <div className="flex items-center gap-2">
              <Label htmlFor="lista-a-cargo-ficha" className="text-xs text-muted-foreground">
                Su ficha en tu libreta
              </Label>
              <Select
                value={list.personId ?? NONE}
                onValueChange={(v) => {
                  if (!v) return;
                  void run(
                    () => linkPerson({ listId, personId: v === NONE ? null : (v as Id<"people">) }),
                    "No se pudo guardar la ficha",
                  );
                }}
              >
                <SelectTrigger id="lista-a-cargo-ficha" size="sm" className="min-w-40">
                  <span>{people.find((p) => p._id === list.personId)?.name ?? "Ninguna"}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Ninguna</SelectItem>
                  {people.map((p) => (
                    <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setConfirmDelete(true)}
          >
            Borrar la lista
          </Button>
        </div>
      </div>

      <OwnerListView listId={listId} forName={list.forName} personId={list.personId} />

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Borrar la lista de {list.forName}?</DialogTitle>
            <DialogDescription>
              Se borra entera: lo apuntado, quién la ve y lo que han marcado. Quien la leía deja de
              verla. Lo que alguien ya pasó a su historial se queda en su libreta.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" disabled={busy}>Cancelar</Button>} />
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await deleteList({ listId });
                  toast.success(`Lista de ${list.forName} borrada`);
                  router.push("/mi-lista");
                }, "No se pudo borrar la lista")
              }
            >
              Borrar la lista
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
