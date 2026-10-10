// Puerta de zod para los schemas que viajan al cliente (schemas.ts). Turbopack
// no recorta el espacio de nombres `z` de "zod": con `import { z }` entran en
// el bundle los cuarenta idiomas, el conversor de JSON Schema y todo lo demás.
// Reexportando solo lo que se usa, se queda fuera. Si un schema de cliente
// necesita otra pieza de zod, añádela aquí.
export { array, boolean, config, enum, literal, number, object, string } from "zod";
export type { infer } from "zod";
