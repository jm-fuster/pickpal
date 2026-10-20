import { LogoMark } from "@/components/ui/LogoMark";
import { cn } from "@/lib/utils";

// El logotipo: símbolo + «PickPal» en Geist SemiBold, sin tracking. Es la única
// forma de escribir el nombre junto al símbolo; LogoMark a secas solo donde el
// nombre no va al lado (la réplica del correo de la landing, por ejemplo).
// Hereda el color del contenedor, como el símbolo: el coral no cambia.
// Va en un <span>: el enlace, si lo hay, lo pone quien lo usa. La separación es
// 8 px en los dos tamaños (space/inline/xs en el Figma, que no tiene 6).
const SIZES = {
  default: { root: "text-lg", mark: "size-7" }, // símbolo 28 px, nombre 18 px
  sm: { root: "text-sm", mark: "size-5" }, // símbolo 20 px, nombre 14 px
} as const;

export function Logo({
  size = "default",
  className,
}: {
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-sans font-semibold tracking-normal",
        SIZES[size].root,
        className,
      )}
    >
      <LogoMark className={cn("shrink-0", SIZES[size].mark)} />
      PickPal
    </span>
  );
}
