"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { preparePhoto } from "@/lib/photoPrep";
import { userErrorMessage } from "@/lib/errors";

const PREP_ERRORS = {
  "not-image": "Eso no es una foto.",
  "too-large": "Esa foto es demasiado grande.",
  unreadable: "No se ha podido leer esa foto. Prueba con otra o con una captura.",
} as const;

/**
 * Subir la foto de un elemento: se prepara en el navegador (src/lib/photoPrep.ts),
 * se sube a la URL de un solo uso que da Convex y se asocia al elemento, que
 * comprueba tipo y tamaño en el servidor.
 */
export function usePhotoUpload() {
  const generateUploadUrl = useMutation(api.lists.generatePhotoUploadUrl);
  const setItemPhoto = useMutation(api.lists.setItemPhoto);
  // Las que se están subiendo. Un conjunto y no una sola: con dos a la vez,
  // acabar la primera borraba el «Subiendo la foto…» de la segunda.
  const [uploading, setUploading] = useState<ReadonlySet<Id<"listItems">>>(() => new Set());

  const upload = async (id: Id<"listItems">, file: File) => {
    setUploading((prev) => new Set(prev).add(id));
    try {
      const blob = await preparePhoto(file);
      if (typeof blob === "string") {
        toast.error(PREP_ERRORS[blob]);
        return;
      }
      const url = await generateUploadUrl();
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": blob.type }, body: blob });
      if (!res.ok) throw new Error("upload");
      const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
      await setItemPhoto({ id, storageId });
      toast.success("Foto puesta");
    } catch (err) {
      toast.error(userErrorMessage(err, "No se pudo subir la foto"));
    } finally {
      setUploading((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  return { upload, uploading };
}
