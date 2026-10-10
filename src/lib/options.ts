// Opciones cerradas de los selects de persona e historial. Viven aparte de
// schemas.ts para que las páginas que solo pintan etiquetas (agenda, tarjetas,
// lista de seres queridos) no arrastren zod al bundle del cliente. schemas.ts
// las reexporta, así que importarlas desde allí sigue funcionando.

export const REACTIONS = [
  { value: "loved", label: "Le encantó" },
  { value: "ok", label: "Le dio igual" },
  { value: "bad", label: "No gustó" },
] as const;

export const RELATIONSHIPS = [
  { value: "friend", label: "Amigo/a" },
  { value: "family", label: "Familia" },
  { value: "partner", label: "Pareja" },
  { value: "colleague", label: "Compañero/a" },
  { value: "other", label: "Otro" },
] as const;
