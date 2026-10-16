"use client"

import * as React from "react"
import { Slider as SliderPrimitive } from "@base-ui/react/slider"
import { cn } from "@/lib/utils"

function SliderRoot({
  className,
  ...props
}: SliderPrimitive.Root.Props<number | readonly number[]>) {
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={cn("relative flex w-full touch-none select-none items-center", className)}
      {...props}
    />
  )
}

function SliderControl({ className, ...props }: SliderPrimitive.Control.Props) {
  return (
    <SliderPrimitive.Control
      data-slot="slider-control"
      className={cn("relative flex h-4 w-full cursor-pointer touch-none items-center", className)}
      {...props}
    />
  )
}

function SliderTrack({ className, ...props }: SliderPrimitive.Track.Props) {
  return (
    <SliderPrimitive.Track
      data-slot="slider-track"
      className={cn(
        "relative h-2 w-full grow rounded-full bg-muted overflow-hidden",
        className,
      )}
      {...props}
    />
  )
}

function SliderIndicator({ className, ...props }: SliderPrimitive.Indicator.Props) {
  return (
    <SliderPrimitive.Indicator
      data-slot="slider-indicator"
      className={cn("absolute h-full bg-primary", className)}
      {...props}
    />
  )
}

// El foco no cae en el thumb (un div) sino en el <input type="range"> oculto
// que lleva dentro, así que `focus-visible:` en el thumb no se activaba nunca.
// Va con has-[:focus-visible] y en contorno sólido, como la capa base: el halo
// ring/50 daba 1,84:1 en oscuro. El halo se queda para el arrastre.
function SliderThumb({ className, ...props }: SliderPrimitive.Thumb.Props) {
  return (
    <SliderPrimitive.Thumb
      data-slot="slider-thumb"
      className={cn(
        "block size-4 shrink-0 rounded-full bg-primary shadow-sm ring-ring/50 transition-[width,height] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring data-dragging:size-5 data-dragging:ring-3",
        className,
      )}
      {...props}
    />
  )
}

export { SliderRoot, SliderControl, SliderTrack, SliderIndicator, SliderThumb }
