import * as z from "./zod";
import es from "zod/v4/locales/es.js";
import { isHttpUrl, normalizeLinkInput } from "./links";
import { RELATIONSHIPS } from "./options";

export { REACTIONS, RELATIONSHIPS } from "./options";

// Mensajes de validación por defecto en español (campos sin mensaje propio:
// `.max()`, `.url()`, `.min()`, etc.). Sin esto Zod emite textos en inglés.
// Se importa solo `es`: `z.locales.es()` mete en el bundle del cliente los
// cuarenta idiomas de zod (~160 KB sin comprimir). Ver ./zod.ts.
z.config(es());

export const giftHistorySchema = z.object({
  giftName: z.string().trim().min(1, "El nombre es obligatorio").max(120),
  occasionLabel: z.string().trim().min(1, "La ocasión es obligatoria").max(40),
  year: z.number().int().min(1900).max(2100).optional(),
  reaction: z.enum(["loved", "ok", "bad"] as [string, ...string[]]),
  notes: z.string().max(500).optional(),
});

export type GiftHistoryFormValues = z.infer<typeof giftHistorySchema>;

export const importantDateSchema = z
  .object({
    label: z.string().trim().min(1, "Etiqueta obligatoria").max(40),
    month: z.number().int().min(1).max(12),
    day: z.number().int().min(1).max(31),
    year: z
      .number()
      .int()
      .min(1900)
      .max(2100)
      .optional()
      .or(z.literal(undefined)),
    recurring: z.boolean().optional(),
    budgetMinEuros: z
      .number({ error: "Debe ser un número" })
      .min(0)
      .max(100000)
      .optional(),
    budgetMaxEuros: z
      .number({ error: "Debe ser un número" })
      .min(0)
      .max(100000)
      .optional(),
  })
  .refine(
    (v) => v.recurring !== false || v.year !== undefined,
    { message: "Indica el año del evento", path: ["year"] },
  )
  .refine(
    (v) => {
      const daysInMonth = new Date(v.year ?? 2024, v.month, 0).getDate();
      return v.day <= daysInMonth;
    },
    { message: "Día no válido para ese mes", path: ["day"] },
  )
  .refine(
    (v) =>
      v.budgetMinEuros === undefined ||
      v.budgetMaxEuros === undefined ||
      v.budgetMinEuros <= v.budgetMaxEuros,
    {
      message: "El mínimo debe ser menor o igual al máximo",
      path: ["budgetMaxEuros"],
    },
  );

export type ImportantDateFormValues = z.infer<typeof importantDateSchema>;

export const personFormSchema = z
  .object({
    name: z.string().trim().min(1, "El nombre es obligatorio").max(80),
    relationship: z.enum(
      RELATIONSHIPS.map((r) => r.value) as [string, ...string[]],
    ),
    interests: z.array(z.string().trim().min(1)).max(20),
    favoriteBrands: z.array(z.string().trim().min(1).max(40)).max(10),
    notes: z.string().max(1000).optional(),
    dates: z.array(importantDateSchema).max(10),
    shoeSize: z.string().max(20).optional(),
    clothingSize: z.string().max(20).optional(),
    allergies: z.string().max(200).optional(),
    dislikes: z.string().max(200).optional(),
    avatarUrl: z.string().url().optional(),
  });

export type PersonFormValues = z.infer<typeof personFormSchema>;

// «Mi lista» (docs/encargo-lista.md). Espejo de `validateListItemInput` en
// convex/validators.ts. El título comparte tope con `giftName` porque «Ya se lo
// he regalado» lo copia tal cual al historial.
export const listItemSchema = z.object({
  title: z.string().trim().min(1, "Escribe qué es").max(120),
  url: z
    .string()
    .trim()
    .max(2048)
    .optional()
    .refine((v) => {
      const link = normalizeLinkInput(v);
      return link === undefined || isHttpUrl(link);
    }, "Tiene que ser una dirección web, como https://…"),
  note: z.string().max(500).optional(),
});

export type ListItemFormValues = z.infer<typeof listItemSchema>;
