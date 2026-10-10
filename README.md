<div align="center">

<!-- logo-mark-email.svg is the cream variant of the same mark; the green one
     is near-invisible on GitHub's dark canvas, so it only serves light mode. -->
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="public/logo-mark-email.svg">
  <img src="public/logo-mark.svg" alt="" width="76" height="76">
</picture>

# PickPal

**The perfect gift for the people who matter most.**

Keep what you know about each person, decide when to be reminded,
and let a model think with you when the date comes around.

[![CI](https://github.com/jm-fuster/PickPal/actions/workflows/ci.yml/badge.svg)](https://github.com/jm-fuster/PickPal/actions/workflows/ci.yml)
[![License: All rights reserved](https://img.shields.io/badge/license-all%20rights%20reserved-0C2912)](LICENSE)

**[Open the app](https://pickpal.jorgemolinafuster.com)**

[Leer en español](README.es.md)

</div>

<br>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/landing-dark.png">
  <img src="docs/screenshots/landing-light.png" alt="PickPal's landing page: the headline 'El regalo perfecto para quien más te importa' above three numbered steps" width="900">
</picture>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/agenda-dark.png">
  <img src="docs/screenshots/agenda-light.png" alt="The agenda: four upcoming dates grouped by how soon they are, each with the person, the occasion and its budget" width="900">
</picture>

## What it is

A notebook for the people you care about, with an AI feature bolted on — in that
order. You write down what you know about someone: their interests, their sizes,
what they are allergic to, what you gave them last year and how it landed. When
one of their dates approaches, PickPal reminds you and can turn everything you
wrote down into gift ideas for that specific person, occasion and budget.

Built as a personal project, and used for real. **The interface is in Spanish
only** — there is no i18n layer, the routes are Spanish words, and the model is
prompted in Spanish. Everything below is the English description of a Spanish
product.

## What it does

**An agenda that only shows the near future.** `/agenda` lists the next four
months of events sorted by how soon they are, grouped under *Hoy*, *Mañana* or
the date itself, with urgency styling once something is inside seven days. On
wide screens, picking an event opens the gift panel beside it; on narrow ones it
navigates. A bell in the header lists whatever falls inside your notification
window — 30 days by default, and while the server accepts anything from 1 to 365,
no screen exposes that control yet.

**A person is a notebook page.** Name, relationship, up to 20 interests, up to 10
favourite brands, free notes, shoe and clothing sizes, allergies, dislikes, and a
generated avatar rather than an uploaded photo. The interest field autocompletes
against a local catalogue of roughly 130 interests in 17 categories
(`src/lib/interests.ts`) — deliberately offline, so suggestions cost no model
quota and nothing about the person leaves the device to power them. Editing is
inline autosave; `/seres-queridos/[personId]/edit` exists only as a redirect back
to the detail page.

<img src="docs/screenshots/person-light.png" alt="A person page: interests as chips, favourite brands, free notes, sizes and allergies, saved ideas and gift history" width="900">

**Dates and history.** Each date carries a label, a day and month, an optional
year, a flag for annual or one-off, and an optional budget on a 0–500 € slider.
Gift history records what you gave, for which occasion, in which year, how it was
received, and any notes — and that history is fed back into the next generation.

**Gift ideas on a short leash.** Pick the occasion, pick one of four kinds of gift
(*Producto físico*, *Experiencia*, *Tiempo juntos*, *Sorpréndeme*), and press
**Generar 9 ideas**. The request asks Gemini 3.5 Flash for nine and accepts
between six and nine (`z.array(...).min(6).max(9)`, `src/lib/gifts.ts:88`), then
drops duplicate titles. Save an idea with a thumbs-up, or discard it with a
thumbs-down — discarding offers an Undo, and once it sticks, that idea's
categories are recorded so the next batch steers away from them. A saved idea
becomes gift history through **Lo regalé**. Batches are cached per user, person,
occasion and gift type, so reopening a set you already generated costs no quota.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/gifts-dark.png">
  <img src="docs/screenshots/gifts-light.png" alt="Nine generated gift ideas as cards, each with a photo, categories, a price range inside the budget and links to the chosen stores" width="900">
</picture>

**Store links.** A physical-product idea deep-links into whichever of eleven
retailers you picked in settings — narrowed to the ones the model suggested for
that specific idea, falling back to all of your picks when none of them match:
Amazon, El Corte Inglés, AliExpress, Temu, Miravia, Decathlon, IKEA,
PcComponentes, MediaMarkt, Zalando and Druni (`STORE_IDS`, `src/lib/stores.ts`).
Experiences, time together and surprises get a single search link instead.

**Email reminders**, opt-in and off by default, because the declared legal basis
is consent. Lead times are a multi-select of 0, 2, 7 and 14 days, defaulting to
`[14]`, and a user gets one grouped email per run rather than one per date.

**Settings** covers the theme, reminders, favourite stores, legal links, and
account deletion — type `ELIMINAR`, and it purges the Convex data before deleting
the Clerk user.

## How a gift idea gets made

`POST /api/recommendations` is the part of this repo worth reading first.

```
POST /api/recommendations
 │
 ├─ src/proxy.ts ─────────── default-deny matcher + Sec-Fetch-Site CSRF check
 ├─ auth() ───────────────── Clerk session, then a JWT for Convex
 ├─ env check ────────────── 503 unless GOOGLE_GENERATIVE_AI_API_KEY and
 │                           CONVEX_SERVER_SECRET are both present
 ├─ zod parse ────────────── the request body
 │
 ├─ 4 × fetchQuery ───────── person · date and budget · gift history ·
 │  (in parallel)            the last batch's dislikedCategories
 │
 ├─ reserve quota ──┐ ────── atomic, and before the model is called
 │                  │
 ├─ generateObject ─┤ ────── gemini-3.5-flash, Zod-typed output, maxRetries: 2
 ├─ dedupe titles ──┤
 ├─ enrich ─────────┤ ────── Pexels photo (4 s) · Brandfetch store (4 s / 2.5 s)
 │  (best effort)   │        both optional, both allowed to fail quietly
 │                  │
 ├─ upsert ─────────┤ ────── Convex re-validates every field server-side
 │                  │
 └─ 200 JSON        └─────── any throw above refunds the reserved unit
```

Three things in that diagram are the whole point:

- **The quota is reserved before the model call and refunded if anything throws**,
  because nothing has been persisted at that stage. This replaced a
  check-then-consume that could race.
- **The route is not trusted by the backend.** `api.recommendations.upsert`
  re-validates every field the model produced, so a compromised route handler
  still cannot write nonsense into the database.
- **Model failures are translated rather than forwarded.** Provider errors are
  classified into 503, 429-daily, 429-minute or 500 with user-safe Spanish copy,
  and the provider's response body never reaches the browser.

### Authorisation, three times over

1. **`src/proxy.ts`** — Next 16 renamed `middleware.ts` to `proxy.ts`, and
   `npm run build` prints it as `ƒ Proxy (Middleware)`. It runs `clerkMiddleware`
   with a default-deny matcher: only `/`, `/sign-in(.*)`, `/sign-up(.*)`,
   `/privacidad` and `/terminos` are public, and anything else hits
   `auth.protect()`. A new route is therefore private by accident rather than
   public by accident. It also 403s non-GET `/api` requests whose
   `Sec-Fetch-Site` header says they came from another origin.
2. **`auth()` in the route handlers**, with `ConvexProviderWithClerk` in the browser.
3. **`requireUser(ctx)` in every Convex function**, followed by a per-document
   `clerkUserId` ownership check.

The browser reaches Convex with Clerk's own session token, which carries
`aud: "convex"` plus the `email`, `name` and `given_name` claims (Clerk's Convex
integration, configured under **Sessions → Claims**); the API route handlers mint
one from a JWT template named `convex` with the same claims. Both are signed by
the same issuer, which `convex/auth.config.ts` validates against
`CLERK_JWT_ISSUER_DOMAIN` with `applicationID: "convex"`. `requireUser` returns `identity.subject`, denormalised
as `clerkUserId` on eight of the nine tables — `importantDates` is the exception,
since it is scoped through the person it belongs to. `SessionGuard` is a UX
redirect for a session that vanished, and is not a security boundary.

### Rate limiting

Two independent systems, four buckets:

| Bucket | Limit | Where |
| --- | --- | --- |
| AI generations | 10 per user per UTC day | `recommendationUsage` |
| `create_person` | 50 per day | `rateLimitBuckets` |
| `create_date` | 100 per day | `rateLimitBuckets` |
| `save_idea` | 50 per day | `rateLimitBuckets` |

The generation counter is fail-closed and its `reserve`/`refund` mutations are
guarded by the shared `CONVEX_SERVER_SECRET`, so an authenticated browser client
cannot call `refund` and reset its own quota.

### Data and jobs

Nine Convex tables: `people`, `importantDates`, `userSettings`,
`emailNotifications`, `recommendationUsage`, `rateLimitBuckets`,
`recommendations`, `savedIdeas`, `giftHistory`.

One cron — `"send daily birthday email reminders"`, `0 8 * * *`, running
`internal.emails.runDailyEmailNotifications`. It walks the users one at a time,
sends each of them batched HTML through the Resend REST API without the SDK, and
writes dedupe rows keyed by date, occurrence year and lead time, so a restart
cannot send the same reminder twice.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript 6 · Tailwind CSS 4 ·
[Convex](https://convex.dev) 1.46 · [Clerk](https://clerk.com) 7 ·
[AI SDK](https://sdk.vercel.ai) 7 with Google Gemini 3.5 Flash · Zod 4 ·
react-hook-form · [Base UI](https://base-ui.com) primitives following shadcn
conventions · next-themes · Resend · Vitest.

## Running it locally

Node 22 or newer, declared once in `.nvmrc` and mirrored by `engines` in
`package.json`. CI reads that same file rather than pinning a version of its own.

Do the accounts first, then let `npx convex dev` link the project before you set
anything on the Convex side — `npx convex env set` reads `CONVEX_DEPLOYMENT` out of
`.env.local` and exits with `No CONVEX_DEPLOYMENT set` without it. So the sequence
is: link, set the two Convex variables, run `npx convex dev` again.

1. Create a free [Clerk](https://clerk.com) application and copy the publishable
   and secret keys.
2. In Clerk, go to **Configure → JWT Templates** and create one from the
   **Convex** preset, then copy its Issuer URL. Then activate the **Convex**
   integration and, under **Sessions → Claims**, add the same user claims to the
   session token: `"email": "{{user.primary_email_address}}"`, `"name":
   "{{user.full_name}}"` and `"given_name": "{{user.first_name}}"` (add `email`
   to the template too). Convex reads them from the token (`identity.email` in
   `convex/settings.ts`, the owner's name in `convex/lists.ts`): without `email`
   the reminder cron has nobody to write to and stays silent.
3. Create a free [Convex](https://convex.dev) project.
4. Get a [Google AI Studio](https://aistudio.google.com) API key. Quota is counted
   **per project**, not per key, so use a project of your own.

Then:

```bash
git clone https://github.com/jm-fuster/PickPal.git
cd PickPal
npm install
cp .env.example .env.local        # fill it in — see Configuration below
```

Link the Convex project. This first push fails with *"Environment variable
CLERK_JWT_ISSUER_DOMAIN is used in auth config file but its value was not set"* —
that is expected, and the next two commands are what fix it:

```bash
npx convex dev --once     # writes CONVEX_DEPLOYMENT and NEXT_PUBLIC_CONVEX_URL into .env.local
```

Generate the shared secret, and keep the value — it has to go in two places:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Put that 64-character string into `CONVEX_SERVER_SECRET` in `.env.local`, and then
give Convex the same one:

```bash
npx convex env set CLERK_JWT_ISSUER_DOMAIN https://your-issuer.clerk.accounts.dev
npx convex env set CONVEX_SERVER_SECRET paste-the-same-value-here
```

Now two terminals, both long-running:

```bash
npx convex dev    # keeps watching and pushing convex/ while you work
```

```bash
npm run dev       # http://localhost:3000
```

**What works with only Clerk and Convex configured:** the agenda, people, dates,
saved ideas and account deletion. `POST /api/recommendations` answers 503 until
the AI keys are in place, and emails silently never send. That is the designed
failure mode rather than a broken install.

## Configuration

The variables live in three different places, and conflating them is the usual way
to lose an afternoon.

**Next.js** — `.env.local` locally, project settings on Vercel:

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | yes | Clerk → API keys (`pk_test_…`) |
| `CLERK_SECRET_KEY` | yes | Clerk → API keys (`sk_test_…`) |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | yes | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | yes | `/sign-up` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | yes | `/agenda` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | yes | `/agenda` |
| `NEXT_PUBLIC_CONVEX_URL` | yes | written by `npx convex dev` |
| `CONVEX_DEPLOYMENT` | yes | written by `npx convex dev` |
| `CONVEX_SERVER_SECRET` | yes | **The same value must also exist in Convex.** Missing here, `/api/recommendations` answers 503; present but different from the Convex one, it answers 429 `No autorizado.` |
| `GOOGLE_GENERATIVE_AI_API_KEY` | yes | aistudio.google.com |
| `PEXELS_API_KEY` | no | stock photos on idea cards; degrades quietly |
| `BRANDFETCH_CLIENT_ID` | no | brand-store links; degrades quietly |

**The Convex deployment** — `npx convex env set NAME value`, plus `--prod` for
production:

| Variable | Required | Notes |
| --- | --- | --- |
| `CLERK_JWT_ISSUER_DOMAIN` | yes | the Issuer of the `convex` JWT template |
| `CONVEX_SERVER_SECRET` | yes | the same value as in Next.js |
| `RESEND_API_KEY` | for email | `convex/emails.ts` throws without it |
| `EMAIL_FROM` | no | falls back to a `PickPal <…>` default |

**Vercel only** — `CONVEX_DEPLOY_KEY`. You generate it in the Convex dashboard,
not from the CLI.

<details>
<summary><strong>Deploying to Vercel and Convex</strong></summary>

1. Import the repository into Vercel.
2. Add the Next.js variables from the table above to **Settings → Environment
   Variables** — all of them except `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL`,
   which are local-only; the build derives the URL itself from `CONVEX_DEPLOY_KEY`.
3. Override the build command with `npx convex deploy --cmd 'npm run build'`, and
   add `CONVEX_DEPLOY_KEY`.
4. Add the domain Vercel assigns you to **Clerk → Domains**, and point
   `CLERK_JWT_ISSUER_DOMAIN` at your production Clerk instance.
5. **Before the first build**, set the Convex-side variables against production
   from your machine: `npx convex env set CLERK_JWT_ISSUER_DOMAIN <prod issuer> --prod`
   and `npx convex env set CONVEX_SERVER_SECRET <the same value you gave Vercel> --prod`.
   Until they exist, every build dies at `npx convex deploy` on the same auth-config
   check as the local setup. If you have already pushed, set them and redeploy.

`CONVEX_DEPLOY_KEY` decides which Convex deployment the build targets *and*
overwrites `NEXT_PUBLIC_CONVEX_URL` during the build, so changing only the URL
will not move you between deployments.

Every push to `main` redeploys. `vercel.json` skips Vercel builds for
`dependabot/*` branches, since CI already covers them.

</details>

## The design system

The part I am most attached to, and the part you cannot see from the outside: the
design system is checked against the code rather than merely described.

`npm run token-map` runs `scripts/token-map.mjs`, which joins a committed dump of
the Figma variables (`design/figma-tokens.snapshot.json`) with the real custom
properties in `src/app/globals.css`, writes the correspondence table to
[`docs/token-map.md`](docs/token-map.md), and exits non-zero **only** on
divergences, stale registry entries or conflicts that have not been declared in
`design/token-divergences.json`. A
check that goes permanently red teaches you to ignore it, so anything we chose to
live with has to be written down with a reason next to it. The current state is 71
variables mirrored and zero undeclared divergences.

Two other things that came out of doing it properly:

- Every colour token in [`docs/design-system.md`](docs/design-system.md) carries a
  measured contrast ratio rather than an opinion.
- `--primary` was split into `--primary` and `--brand`, and `--secondary` into
  `--secondary` and `--brand-secondary`, because a single token was being asked to
  satisfy two contradictory WCAG requirements at once.

On accessibility, the honest version: the skip link is real
(`src/app/(app)/layout.tsx`, `href="#contenido"`), the Figma file meets AA and the
code has caught up with it, `aria-live` appears in three places — five live regions
if you count the bare `role="status"` ones — rather than everywhere it could, and
lint still flags two raw `<img>` uses for the generated avatars.

## Quality gates

```bash
npm test        # 176 tests across 13 files
npm run lint
npm run build
```

CI (`.github/workflows/ci.yml`) runs on every push to `main` and every pull
request, on Node 22: `npm ci`, `npx tsc --noEmit`,
`npx tsc -p convex/tsconfig.json --noEmit`, then `npm test`. That second
type-check exists because Convex has its own tsconfig — without it, Convex-only
type errors sail through CI and fail the Vercel deploy instead. A second job
auto-squash-merges Dependabot patch and minor bumps once the first one is green.

CI does not yet run the linter or `next build`, so those two are on you before you
push.

## Documentation

| File | What it is |
| --- | --- |
| [`docs/security.md`](docs/security.md) | The trust model, eight mandatory patterns, a PR checklist keyed to whichever path you touched, an explicit "not implemented yet, and why" section, and a Dependabot post-mortem |
| [`docs/ia-regalos.md`](docs/ia-regalos.md) | The AI pipeline and its three layers of defence. Stale on route paths and the store count — trust the code |
| [`docs/email-notifications.md`](docs/email-notifications.md) | The daily cron end to end, and why the toggle ships off |
| [`docs/tech-stack.md`](docs/tech-stack.md) | Why Convex over Prisma, Clerk over NextAuth, Resend without its SDK. Its intro still says "Next.js 14+" |
| [`docs/figma-tokens.md`](docs/figma-tokens.md) | The normative rulebook for the Figma file: the four-layer model, alias rules, and the requirement that every token is born with a description |
| [`docs/token-map.md`](docs/token-map.md) | Generated by `npm run token-map` |
| [`docs/design-system.md`](docs/design-system.md) | A decision log: 2,193 lines, no table of contents, and a dated work journal in its second half. Good for the reasoning, bad for looking up a token |

[`AGENTS.md`](AGENTS.md) and [`CLAUDE.md`](CLAUDE.md) are this project's
contributor rulebook. They are short, and they exist to point at the three
documents you are expected to read before touching security, tokens or the design
system.

Some files under `docs/` predate the current routes and survive only as history.
The routes in this README came out of `npm run build`.

## Contributing

Issues and pull requests are welcome. For anything large, open an issue first so
we can agree on the shape before you write it. See
[`CONTRIBUTING.md`](CONTRIBUTING.md) — and note that it is currently out of date in
a few places that this README supersedes. It opens with an English summary; the
rest of it, like everything under `docs/`, is in Spanish.

Found a security bug? Do not open an issue — [`SECURITY.md`](SECURITY.md) says
where to send it, in English and Spanish.

## Credits

The code is © Jorge Molina Fuster, all rights reserved. Some of what ships alongside it is not mine:

- **Avatars.** DiceBear's *dylan* style, a remix of a Figma Community file by
  **Natalia Spivak**, used under
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). PickPal renders it for
  every person, so the credit is here and in the app's own credits, on `/terminos`.
- **Store logos** in `public/stores/` are their owners' trademarks, used for
  identification.
- **Stock photography** on idea cards comes from Pexels, linked from the
  credits on `/terminos`.
- **Type** is Geist for the interface and Fraunces for headings.

## License

© Jorge Molina Fuster. All rights reserved. See [LICENSE](LICENSE).
