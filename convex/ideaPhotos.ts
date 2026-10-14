import { MutationCtx, QueryCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { isAllowedListPhoto } from "./validators";

/**
 * Las fotos de las ideas propias («Apuntar una idea»). Usan las mismas
 * direcciones de subida y los mismos límites que las de «Mi lista»
 * (`lists.generatePhotoUploadUrl`): la foto se prepara en el navegador, que la
 * reduce y le quita los metadatos, y aquí solo se mira lo que Convex apuntó del
 * archivo. Nunca se descarga de la tienda (decisión 3 de docs/encargo-lista.md).
 */

export const IDEA_PHOTO_REJECTED = "Esa foto no vale: tiene que ser JPG, PNG o WebP de menos de 1,5 MB.";

/**
 * ¿Puede este archivo ser la foto de una idea? Tiene que existir, ser una foto
 * válida y no ser ya la foto de un elemento de una lista o de otra idea:
 * compartirlo haría que quitar una borrase la otra.
 */
export async function isUsableIdeaPhoto(ctx: MutationCtx, storageId: Id<"_storage">): Promise<boolean> {
  const meta = await ctx.db.system.get("_storage", storageId);
  if (!meta || !isAllowedListPhoto(meta)) return false;
  const inList = await ctx.db
    .query("listItems")
    .withIndex("by_photo", (q) => q.eq("photoStorageId", storageId))
    .first();
  if (inList) return false;
  const inIdea = await ctx.db
    .query("savedIdeas")
    .withIndex("by_photo", (q) => q.eq("photoStorageId", storageId))
    .first();
  return !inIdea;
}

export async function ideaPhotoUrl(ctx: QueryCtx, idea: Doc<"savedIdeas">): Promise<string | null> {
  return idea.photoStorageId ? await ctx.storage.getUrl(idea.photoStorageId) : null;
}

/**
 * Borra una idea guardada y, si tenía foto, el archivo. Es el único camino
 * para borrar ideas: lo usan quitar una idea, pasarla al historial, borrar la
 * ficha y borrar la cuenta.
 */
export async function deleteSavedIdea(ctx: MutationCtx, idea: Doc<"savedIdeas">) {
  if (idea.photoStorageId && (await ctx.db.system.get("_storage", idea.photoStorageId))) {
    await ctx.storage.delete(idea.photoStorageId);
  }
  await ctx.db.delete(idea._id);
}
