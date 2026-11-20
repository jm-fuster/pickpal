# Tabla de correspondencia Figma ↔ código

<!-- GENERADO por scripts/token-map.mjs. No editar a mano: se regenera. -->

Figma: **PickPal · Product case study & design system** · volcado del 2026-11-20 · 359 variables.
Código: [`src/app/globals.css`](../src/app/globals.css).

Este documento responde a una sola pregunta: **¿dónde dicen Figma y el código cosas distintas?**
No genera CSS desde Figma — solo 71 de las 359 variables tienen contraparte en código
y las otras 288 no deben tenerla, así que un generador aplanaría el criterio en vez de aplicarlo.

## Resumen

| | Nº |
|---|---|
| Espejados (Figma ↔ código) | 71 |
| … de acuerdo | 71 |
| … iguales salvo redondeo oklch↔hex | 0 |
| … en divergencia **ya declarada** | 0 |
| … en divergencia **nueva, sin declarar** | 0 |
| Props del código que varias variables de Figma reclaman con valores distintos | 0 |
| Solo-código (sin variable en Figma) | 6 |
| Solo-Figma · capa Semantic (decisión pendiente) | 145 |
| Solo-Figma · Primitives (por diseño: ocultos al publicar) | 134 |

## Espejados

Las 67 variables de Figma con `codeSyntax.WEB` relleno, que es el puente que Figma trae de serie.
Valores: `Figma / código`. `≈` = mismo color, ±1 por canal del ida y vuelta oklch↔hex.

| Variable Figma | Colección | Custom property | Origen del valor | Light | Dark |
|---|---|---|---|---|---|
| `color/bg` | Semantic | `--background` | :root / .dark | ✅ #faf6f1 / #faf6f1 | ✅ #16100d / #16100d |
| `color/text` | Semantic | `--foreground` | :root / .dark | ✅ #302621 / #302621 | ✅ #efeae2 / #efeae2 |
| `color/bg/surface` | Semantic | `--card` | :root / .dark | ✅ #fffbf6 / #fffbf6 | ✅ #211914 / #211914 |
| `color/bg/surface-raised` | Semantic | `--popover` | :root / .dark | ✅ #fffbf6 / #fffbf6 | ✅ #211914 / #211914 |
| `color/fill/brand-solid` | Semantic | `--primary` | :root / .dark | ✅ #0c2912 / #0c2912 | ✅ #547959 / #547959 |
| `color/text/on-brand-solid` | Semantic | `--primary-foreground` | :root / .dark | ✅ #faf6f1 / #faf6f1 | ✅ #faf6f1 / #faf6f1 |
| `color/fill/brand-secondary-solid` | Semantic | `--secondary` | :root / .dark | ✅ #c56a3e / #c56a3e | ✅ #dc855d / #dc855d |
| `color/text/on-brand-secondary-solid` | Semantic | `--secondary-foreground` | :root / .dark | ✅ #16100d / #16100d | ✅ #16100d / #16100d |
| `color/fill/component` | Semantic | `--muted` | :root / .dark | ✅ #f3e6d2 / #f3e6d2 | ✅ #302621 / #302621 |
| `color/text/secondary` | Semantic | `--muted-foreground` | :root / .dark | ✅ #5a4234 / #5a4234 | ✅ #cec2b3 / #cec2b3 |
| `color/fill/component-focus` | Semantic | `--accent` | :root / .dark | ✅ #f3e6d2 / #f3e6d2 | ✅ #2f281d / #2f281d |
| `color/text/on-component-focus` | Semantic | `--accent-foreground` | :root / .dark | ✅ #5a4234 / #5a4234 | ✅ #efeae2 / #efeae2 |
| `color/fill/destructive-solid` | Semantic | `--destructive` | :root / .dark | ✅ #cc2823 / #cc2823 | ✅ #fa6863 / #fa6863 |
| `color/border` | Semantic | `--border` | :root / .dark | ✅ #e1d6c6 / #e1d6c6 | ✅ #ffffff/10 / #ffffff/10 |
| `color/border/focus` | Semantic | `--ring` | :root / .dark | ✅ #0c2912 / #0c2912 | ✅ #547959 / #547959 |
| `color/fill/category/1` | Semantic | `--chart-1` | :root / .dark | ✅ #0c2912 / #0c2912 | ✅ #547959 / #547959 |
| `color/fill/category/2` | Semantic | `--chart-2` | :root / .dark | ✅ #c56a3e / #c56a3e | ✅ #dc855d / #dc855d |
| `color/fill/category/3` | Semantic | `--chart-3` | :root / .dark | ✅ #e3a757 / #e3a757 | ✅ #e3a757 / #e3a757 |
| `color/fill/category/4` | Semantic | `--chart-4` | :root / .dark | ✅ #d5b59e / #d5b59e | ✅ #6f6149 / #6f6149 |
| `color/fill/category/5` | Semantic | `--chart-5` | :root / .dark | ✅ #775e50 / #775e50 | ✅ #5a4234 / #5a4234 |
| `typography/font-family/sans` | Typography | `--font-sans` | @theme inline | — Geist / var(--font-geist-sans) | — Geist / var(--font-geist-sans) |
| `typography/font-family/serif` | Typography | `--font-heading` | @theme inline | — Fraunces / var(--font-fraunces) | — Fraunces / var(--font-fraunces) |
| `typography/font-family/mono` | Typography | `--font-mono` | @theme inline | — Geist Mono / var(--font-geist-mono) | — Geist Mono / var(--font-geist-mono) |
| `typography/font-weight/regular` | Typography | `--font-weight-normal` | — | — 400 / — | — 400 / — |
| `typography/font-weight/medium` | Typography | `--font-weight-medium` | — | — 500 / — | — 500 / — |
| `typography/font-weight/semibold` | Typography | `--font-weight-semibold` | — | — 600 / — | — 600 / — |
| `typography/font-weight/bold` | Typography | `--font-weight-bold` | — | — 700 / — | — 700 / — |
| `typography/font-size/xs` | Typography | `--text-xs` | — | — 12 / — | — 12 / — |
| `typography/font-size/sm` | Typography | `--text-sm` | — | — 14 / — | — 14 / — |
| `typography/font-size/base` | Typography | `--text-base` | — | — 16 / — | — 16 / — |
| `typography/font-size/lg` | Typography | `--text-lg` | — | — 18 / — | — 18 / — |
| `typography/font-size/xl` | Typography | `--text-xl` | — | — 20 / — | — 20 / — |
| `typography/font-size/2xl` | Typography | `--text-2xl` | — | — 24 / — | — 24 / — |
| `typography/font-size/4xl` | Typography | `--text-4xl` | @theme | ✅ 34 / 34 | ✅ 34 / 34 |
| `typography/font-size/5xl` | Typography | `--text-5xl` | @theme | ✅ 40 / 40 | ✅ 40 / 40 |
| `typography/font-size/6xl` | Typography | `--text-6xl` | @theme | ✅ 48 / 48 | ✅ 48 / 48 |
| `typography/font-size/7xl` | Typography | `--text-7xl` | @theme | ✅ 60 / 60 | ✅ 60 / 60 |
| `color/text/brand` | Semantic | `--brand` | :root / .dark | ✅ #0c2912 / #0c2912 | ✅ #8eaa91 / #8eaa91 |
| `color/text/destructive` | Semantic | `--destructive` | :root / .dark | ✅ #cc2823 / #cc2823 | ✅ #fa6863 / #fa6863 |
| `color/border/destructive` | Semantic | `--destructive` | :root / .dark | ✅ #cc2823 / #cc2823 | ✅ #fa6863 / #fa6863 |
| `color/text/warning` | Semantic | `--warning` | :root / .dark | ✅ #b45309 / #b45309 | ✅ #f3ae51 / #f3ae51 |
| `radius/base` | Primitives | `--radius` | :root | ✅ 16 / 16 | ✅ 16 / 16 |
| `radius/sm` | Primitives | `--radius-sm` | @theme inline | ✅ 8 / 8 | ✅ 8 / 8 |
| `radius/md` | Primitives | `--radius-md` | @theme inline | ✅ 12 / 12 | ✅ 12 / 12 |
| `radius/lg` | Primitives | `--radius-lg` | @theme inline | — 16 / var(--radius) | — 16 / var(--radius) |
| `radius/xl` | Primitives | `--radius-xl` | @theme inline | ✅ 20 / 20 | ✅ 20 / 20 |
| `radius/2xl` | Primitives | `--radius-2xl` | @theme inline | ✅ 24 / 24 | ✅ 24 / 24 |
| `radius/3xl` | Primitives | `--radius-3xl` | @theme inline | ✅ 28 / 28 | ✅ 28 / 28 |
| `radius/4xl` | Primitives | `--radius-4xl` | @theme inline | ✅ 32 / 32 | ✅ 32 / 32 |
| `radius/xs` | Primitives | `--radius-xs` | @theme inline | ✅ 4 / 4 | ✅ 4 / 4 |
| `color/icon/brand` | Semantic | `--brand` | :root / .dark | ✅ #0c2912 / #0c2912 | ✅ #8eaa91 / #8eaa91 |
| `color/icon/on-brand-solid` | Semantic | `--primary-foreground` | :root / .dark | ✅ #faf6f1 / #faf6f1 | ✅ #faf6f1 / #faf6f1 |
| `typography/font-size/2xs` | Typography | `--text-2xs` | — | — 11 / — | — 11 / — |
| `typography/font-size/3xl` | Typography | `--text-3xl` | @theme | ✅ 28 / 28 | ✅ 28 / 28 |
| `typography/font-size/8xl` | Typography | `--text-8xl` | @theme | ✅ 72 / 72 | ✅ 72 / 72 |
| `typography/line-height/tight` | Typography | `--leading-tight` | @theme | ✅ 1.100000023841858 / 1.1 | ✅ 1.100000023841858 / 1.1 |
| `typography/line-height/snug` | Typography | `--leading-snug` | @theme | ✅ 1.2000000476837158 / 1.2 | ✅ 1.2000000476837158 / 1.2 |
| `typography/line-height/snug-alt` | Typography | `--leading-snug-alt` | @theme | ✅ 1.2999999523162842 / 1.3 | ✅ 1.2999999523162842 / 1.3 |
| `typography/line-height/normal` | Typography | `--leading-normal` | @theme | ✅ 1.399999976158142 / 1.4 | ✅ 1.399999976158142 / 1.4 |
| `typography/line-height/relaxed` | Typography | `--leading-relaxed` | @theme | ✅ 1.5 / 1.5 | ✅ 1.5 / 1.5 |
| `typography/letter-spacing/tighter` | Typography | `--tracking-tighter` | @theme | ✅ -0.019999999552965164 / -0.02 | ✅ -0.019999999552965164 / -0.02 |
| `typography/letter-spacing/tight` | Typography | `--tracking-tight` | @theme | ✅ -0.009999999776482582 / -0.01 | ✅ -0.009999999776482582 / -0.01 |
| `typography/letter-spacing/normal` | Typography | `--tracking-normal` | @theme | ✅ 0 / 0 | ✅ 0 / 0 |
| `typography/letter-spacing/wide` | Typography | `--tracking-wide` | @theme | ✅ 0.009999999776482582 / 0.01 | ✅ 0.009999999776482582 / 0.01 |
| `typography/letter-spacing/wider` | Typography | `--tracking-wider` | @theme | ✅ 0.019999999552965164 / 0.02 | ✅ 0.019999999552965164 / 0.02 |
| `color/text/brand-secondary` | Semantic | `--brand-secondary` | :root / .dark | ✅ #a44c1d / #a44c1d | ✅ #dc855d / #dc855d |
| `color/text/tertiary` | Semantic | `--subtle-foreground` | :root / .dark | ✅ #6e6055 / #6e6055 | ✅ #a99c8e / #a99c8e |
| `color/icon/tertiary` | Semantic | `--subtle-foreground` | :root / .dark | ✅ #6e6055 / #6e6055 | ✅ #a99c8e / #a99c8e |
| `color/fill/field-disabled` | Semantic | `--field-disabled` | :root / .dark | ✅ #efeae2 / #efeae2 | ✅ #302621 / #302621 |
| `color/field/border` | Semantic | `--input` | :root / .dark | ✅ #917a6d / #917a6d | ✅ #ffffff/36 / #ffffff/36 |
| `color/icon/category/3` | Semantic | `--category-amber` | :root / .dark | ✅ #b45309 / #b45309 | ✅ #f3ae51 / #f3ae51 |

## Solo-código

Custom properties reales sin ninguna variable de Figma que las reclame. Cada una es una
decisión: o se crea la variable en Figma, o se documenta por qué el código va por delante.

Capa de tokens (`:root` / `.dark`):

- `--card-foreground` — Light `#302621` · Dark `#efeae2`
- `--popover-foreground` — Light `#302621` · Dark `#efeae2`

Escalas propias en `@theme` sin variable equivalente:

- `--animate-breathe` — `breathe 2.4s var(--ease-swap) infinite`
- `--leading-loose` — `initial (desactivado)`
- `--text-9xl` — `initial (desactivado)`
- `--tracking-widest` — `initial (desactivado)`

## Solo-Figma

### Capa Semantic — 145 variables sin contraparte

Aquí está el trabajo pendiente de verdad: por cada una hay que decidir si merece una custom
property, si el código ya lo resuelve con utilidades de Tailwind, o si es de uso exclusivo en Figma.
Mientras no se decida, ni Figma ni el código están completos.

| Grupo | Nº | Variables |
|---|---|---|
| `space/` | 45 | `space/badge/padding-x`, `space/card/padding`, `space/card/padding-dense`, `space/card/padding-lg`, `space/container/padding`, `space/container/padding-lg`, `space/control/gap`, `space/control/gap-sm`, `space/control/padding-x`, `space/control/padding-x-sm`, `space/control/padding-y-lg`, `space/control/padding-y-md`, `space/control/padding-y-sm`, `space/control/padding-y-xs`, `space/empty-state/padding-full`, `space/empty-state/padding-minimal`, `space/field-group/gap`, `space/field/gap`, `space/inline/2xs`, `space/inline/lg`, `space/inline/md`, `space/inline/sm`, `space/inline/xl`, `space/inline/xs`, `space/inset/2xs`, `space/inset/lg`, `space/inset/md`, `space/inset/sm`, `space/inset/xl`, `space/inset/xs`, `space/layout/grid-gap`, `space/menu/item-padding-x`, `space/menu/padding`, `space/page/padding-lg`, `space/panel/gap`, `space/popover/padding`, `space/section/gap`, `space/section/gap-hero`, `space/stack/2xs`, `space/stack/lg`, `space/stack/md`, `space/stack/sm`, `space/stack/xl`, `space/stack/xs`, `space/switch/track-inset` |
| `sizing/` | 34 | `sizing/avatar/badge-default`, `sizing/avatar/badge-lg`, `sizing/avatar/badge-sm`, `sizing/avatar/default`, `sizing/avatar/lg`, `sizing/avatar/sm`, `sizing/card/visual-header`, `sizing/checkbox/box`, `sizing/control/default`, `sizing/control/icon-md`, `sizing/control/icon-sm`, `sizing/control/icon-xs`, `sizing/control/lg`, `sizing/control/sm`, `sizing/event-column/width`, `sizing/icon/lg`, `sizing/icon/md`, `sizing/icon/sm`, `sizing/icon/xl`, `sizing/selection/lg`, `sizing/selection/md`, `sizing/selection/sm`, `sizing/sidebar/width`, `sizing/slider/thumb`, `sizing/slider/thumb-dragging`, `sizing/slider/track`, `sizing/spinner/dot`, `sizing/switch/thumb-default`, `sizing/switch/thumb-sm`, `sizing/switch/track-height-default`, `sizing/switch/track-height-sm`, `sizing/switch/track-width-default`, `sizing/switch/track-width-sm`, `sizing/textarea/min-height` |
| `color/icon/` | 11 | `color/icon`, `color/icon/destructive`, `color/icon/info`, `color/icon/on-brand-secondary-solid`, `color/icon/on-destructive-solid`, `color/icon/on-success-solid`, `color/icon/on-warning-solid`, `color/icon/secondary`, `color/icon/strong`, `color/icon/success`, `color/icon/warning` |
| `brand/` | 10 | `brand/logo`, `brand/primary`, `brand/primary-border`, `brand/primary-hover`, `brand/primary-subtle`, `brand/primary-text`, `brand/secondary`, `brand/secondary-border`, `brand/secondary-hover`, `brand/secondary-text` |
| `color/fill/` | 10 | `color/fill/brand-secondary-solid-hover`, `color/fill/brand-solid-hover`, `color/fill/brand-subtle`, `color/fill/destructive-subtle`, `color/fill/destructive-subtle-hover`, `color/fill/success-solid`, `color/fill/success-subtle`, `color/fill/sunken`, `color/fill/warning-solid`, `color/fill/warning-subtle` |
| `radius/` | 8 | `radius/checkbox`, `radius/control`, `radius/control-sm`, `radius/logo`, `radius/panel`, `radius/pill`, `radius/surface`, `radius/tag` |
| `z-index/` | 6 | `z-index/dropdown`, `z-index/modal`, `z-index/overlay`, `z-index/popover`, `z-index/sticky`, `z-index/toast` |
| `color/text/` | 5 | `color/text/info`, `color/text/on-destructive-solid`, `color/text/on-success-solid`, `color/text/on-warning-solid`, `color/text/success` |
| `color/border/` | 4 | `color/border/brand`, `color/border/brand-secondary`, `color/border/strong`, `color/border/subtle` |
| `color/field/` | 4 | `color/field/border-destructive`, `color/field/border-focus`, `color/field/fill-disabled`, `color/field/placeholder` |
| `opacity/` | 4 | `opacity/disabled`, `opacity/hover`, `opacity/pressed`, `opacity/skeleton` |
| `border-width/` | 3 | `border-width/default`, `border-width/focus`, `border-width/strong` |
| `color/bg/` | 1 | `color/bg/subtle` |

### Primitives — 134 variables, y está bien así

Los primitivos tienen scope vacío y están ocultos al publicar: no viajan a los archivos que
consumen la librería y no deben aparecer en el CSS. El código consume la capa semántica, no la rampa.
Los 9 `radius/*` que sí cruzan son la excepción documentada.

| Grupo | Nº |
|---|---|
| `spacing/` | 29 |
| `color/Terracotta/` | 14 |
| `color/Red/` | 13 |
| `color/Amber/` | 11 |
| `color/Bronze/` | 11 |
| `color/Green/` | 11 |
| `color/Neutral/` | 11 |
| `color/Umber/` | 11 |
| `color/Cream/` | 7 |
| `opacity/` | 7 |
| `border-width/` | 4 |
| `color/White/` | 4 |
| `radius/` | 1 |

---

## Cómo se regenera

```bash
node scripts/token-map.mjs
```

Devuelve código 1 solo con divergencias **nuevas**, entradas obsoletas del registro o
conflictos sin declarar — nunca por los desacuerdos ya anotados en
[`design/token-divergences.json`](../design/token-divergences.json). Así sirve de puerta antes de
dar por cerrada una pasada de Figma sin quedarse en rojo permanente, que es como una puerta
deja de informar de nada.

El snapshot en `design/figma-tokens.snapshot.json` es derivado y se refresca desde Figma; las
instrucciones están en la cabecera del script. `--check` informa sin reescribir el documento.
