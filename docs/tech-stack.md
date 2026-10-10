# Tech Stack

## Resumen

| Capa | Tecnología | Motivo |
|---|---|---|
| Framework | Next.js 14+ App Router + TypeScript | Full-stack, SSR, file-based routing |
| Auth | Clerk | Auth completo out-of-the-box, UI lista, webhooks |
| Base de datos | Convex | Reactivo en tiempo real, sin servidor, schema TypeScript |
| IA | AI SDK (Vercel) + Gemini `gemini-3.5-flash` | Abstracción unificada, `generateObject` valida con Zod. Configuración de la key y condiciones de datos en [`ia-regalos.md`](ia-regalos.md). |
| Email | Resend (REST API directa, sin SDK) | Free tier 3.000/mes. Llamado desde un cron diario en Convex. Detalle en [`email-notifications.md`](email-notifications.md). |
| UI | Tailwind CSS + shadcn/ui | Componentes accesibles y personalizables |
| Links compra | URLs de búsqueda Amazon generadas | Sin API key, funcional de inmediato |

## Dependencias

```bash
# Proyecto base
npx create-next-app@latest pickpal --typescript --tailwind --app --src-dir

# Auth + BD
npm install @clerk/nextjs convex

# IA
npm install ai @ai-sdk/google

# Formularios y validación
npm install zod react-hook-form @hookform/resolvers

# UI components
npx shadcn@latest init
npx shadcn@latest add button card input badge dialog select textarea avatar
```

## Variables de entorno (`.env.local`)

```bash
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/agenda
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/agenda

# Convex
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# Google Gemini (AI SDK)
GOOGLE_GENERATIVE_AI_API_KEY=AI...
```

### Variables del entorno de Convex (no de Next.js)

Estas las consume el backend (cron de emails). Se setean con `npx convex env set ...` (añade `--prod` para el deployment de producción):

```bash
RESEND_API_KEY=re_...                          # API key de Resend, server-only
EMAIL_FROM="PickPal <hola@pickpal.jorgemolinafuster.com>"   # opcional; dominio verificado en Resend
CLERK_JWT_ISSUER_DOMAIN=https://...clerk.accounts.dev   # mismo issuer que en Next.js
```

## Decisiones técnicas relevantes

- **Convex en lugar de Prisma + SQLite:** Convex es reactivo por defecto — las queries se actualizan en tiempo real sin polling. Además, el schema está tipado en TypeScript nativo, lo que elimina la capa ORM.
- **Clerk en lugar de NextAuth:** Clerk ofrece UI de login/registro lista, gestión de usuarios en dashboard propio, y webhooks para sincronizar con Convex sin implementar lógica de sesiones a mano.
- **AI SDK + Gemini en lugar de Anthropic SDK directo:** `generateObject` del AI SDK garantiza que la respuesta cumple el schema Zod sin parsing manual. Cambiar de modelo (Gemini → Claude → GPT) es un cambio de una línea.
- **URLs Amazon sin API:** La Amazon Product Advertising API requiere cuenta de afiliado con ventas previas. Las URLs de búsqueda (`amazon.es/s?k=...`) funcionan sin autenticación y producen resultados relevantes si el modelo genera queries específicas.
- **Qué entra en la carga inicial (oct-2026):** el JS inicial de /agenda bajó de 364 a 253 KB con brotli y el de la ficha de 387 a 291, sin cambiar un píxel. Las reglas que lo sostienen:
  - **zod solo donde hay formulario.** Las constantes que pintan etiquetas viven sin zod en `src/lib/options.ts` y `src/lib/giftCatalog.ts`; `schemas.ts` y `gifts.ts` las reexportan. Los schemas de cliente importan zod por `src/lib/zod.ts`: Turbopack no recorta el espacio de nombres `z`, y con `import { z } from "zod"` entraban los cuarenta idiomas (~160 KB sin comprimir).
  - **Lo que aparece tras una interacción va en su propio chunk** con `next/dynamic`: el panel de ideas de la agenda, los formularios plegados de la ficha y de «Mi lista», la tarjeta de lista recibida y el menú móvil. Se precarga al montar la página (o tras hidratar), así que abrirlo no espera a la red; si el hueco es visible antes de abrirse, el marcador de carga es el mismo componente plegado (`AddRowButton`).
  - **Convex solo dentro de `(app)`.** El proveedor y la preconexión viven en `src/app/(app)/layout.tsx`: la landing, las páginas legales y el login no lo descargan ni abren el WebSocket.
  - **La landing es estática.** Redirige a quien tiene sesión desde `proxy.ts`, no con `auth()` en la página, y así la sirve la CDN.
  - **La ficha de persona sigue dinámica, a propósito.** Se probó ISR (`generateStaticParams` vacío): el servidor la sirve de caché, pero Next 16 sin Cache Components no la precarga desde los enlaces (solo trae el árbol de rutas, 0,8 KB) y cada navegación descarga la página entera con el layout raíz (25 KB comprimidos frente a 2 KB de la dinámica). No compensa.
  - **Fuentes:** solo Geist y Fraunces se precargan. Geist Mono vive en `src/app/fonts.ts` (ver `docs/design-system.md` · Tipografía).
  - **Cómo medirlo:** Next 16 ya no imprime tamaños en `next build`. `npx next experimental-analyze` abre el analizador de Turbopack; ojo, cuenta también los chunks diferidos de cada ruta.
- **Resend sin SDK:** llamamos a `https://api.resend.com/emails` con `fetch` directo. Una dependencia menos y la API es trivial (un POST con JSON). Si el día de mañana hace falta features avanzadas (attachments, idempotency keys, etc.), se añade `resend` y listo.
