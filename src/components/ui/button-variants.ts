import { cva } from "class-variance-authority"

// Solo los estilos de Button, sin el componente: así un server component que
// pinta un <Link> con forma de botón no arrastra el Button de base-ui (unos
// 3,5 KB br) a la página. `ui/button` lo reexporta.
//
// Sin outline-none ni anillo propio: el foco es el contorno de la capa base
// (globals.css), como en enlaces y teselas. El borde --ring + halo ring/50 de
// shadcn se quedaba en 1,84:1 en oscuro en `default` (el borde es del color del
// relleno) y por debajo de 2:1 en `destructive` en los dos temas. La transición
// no es `transition-all` para que el contorno salga de golpe, como en un enlace,
// y no crezca desde el borde en 150 ms.
//
// Táctil en dos niveles (pointer-coarse; «Touch & fit», 21-oct-2026): los
// tamaños por defecto (default, lg, icon, icon-lg) crecen a 44 px, y los
// pequeños (xs, sm, icon-xs, icon-sm) se ven igual y ganan una zona de toque
// invisible de 44 px con un ::after, como Switch. Con ratón no cambia nada.
// `relative` va sin variante: con `pointer-coarse:relative`, tailwind-merge no
// lo quitaría frente al `absolute` de un botón posicionado (cerrar un diálogo).
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-[color,background-color,border-color,box-shadow,translate,opacity] select-none active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        outline:
          "border-input bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30",
        link: "text-brand underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-8 gap-2 px-3 pointer-coarse:h-11 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "relative h-6 gap-1 pointer-coarse:after:absolute pointer-coarse:after:inset-x-0 pointer-coarse:after:-inset-y-2.5 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "relative h-7 gap-1 pointer-coarse:after:absolute pointer-coarse:after:inset-x-0 pointer-coarse:after:-inset-y-2 rounded-[min(var(--radius-md),12px)] px-3 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-2 px-3 pointer-coarse:h-11 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8 pointer-coarse:size-11",
        "icon-xs":
          "relative size-6 pointer-coarse:after:absolute pointer-coarse:after:-inset-2.5 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "relative size-7 pointer-coarse:after:absolute pointer-coarse:after:-inset-2 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9 pointer-coarse:size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export { buttonVariants }
