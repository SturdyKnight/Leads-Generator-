# B-Matrix

A single-operator B2B lead generation tool. You define a campaign (a city and
some keywords), it searches the Google Places API, enriches and scores what it
finds, and tracks each business through a sales pipeline.

## Two decisions that shape everything

**There is no authentication.** No login, no JWT, no user accounts, no roles.
One implicit operator record exists so campaigns and leads have an owner for
their foreign keys (`services/operator.ts`). Do not add auth middleware or a
login flow. If this is deployed publicly, protect it at the platform layer and
restrict the Google API key by referrer or IP — not with application auth.

**Leads live inside campaigns.** There is no `/leads` page and no global leads
list in the navigation. Every lead is reached through the campaign that
discovered it, on the campaign detail page. That page is therefore the only
surface for lead work, so its filtering, pagination, and detail view have to
carry the whole job.

## Stack

| Layer | Choice |
|---|---|
| Frontend | React 18, Vite, TypeScript, TanStack Query, React Router 6, Tailwind |
| Backend | Express 4, TypeScript (ESM), Prisma 5 |
| Database | PostgreSQL |
| Shared | `@bmatrix/shared` — types and Zod schemas used by both sides |
| External | Google Places API (New), `places.googleapis.com/v1` |
| Realtime | Server-Sent Events |

## Layout

```
packages/
  shared/src/
    types/index.ts        All domain types and status constants
    validation/index.ts   All Zod schemas
  backend/src/
    routes/index.ts       Every route, in one file
    controllers/          Thin: parse, call a service, shape the envelope
    services/             All business logic
    middleware/           Errors, validation, rate limiting, request logging
    utils/                Logger, pagination, errors, Excel export
  frontend/src/
    features/             Page components by area
    components/ui/        Button, Card, Chip, Dialog, Input, Feedback, Toast
    lib/                  api-client, status (colour system), utils
    hooks/                use-sse (live updates), use-media-query
```

## Commands

```bash
npm run dev          # api on :4000, web on :3000
npm run build        # shared → backend → frontend, in that order
npm run lint         # typecheck all three packages
npm run db:migrate   # create a migration during development
npm run db:deploy    # apply migrations (this is what production runs)
npm run db:seed      # a demo campaign with five leads
```

`shared` must build before the other two — both import from it.

## How discovery works

A campaign holds config; a **discovery session** is one run against that config.
A campaign can have many sessions, and each adds only businesses the campaign
does not already have.

```
Session start
  └─ build queries        one per keyword × locality, plus chain variants
  └─ per query:
       Stage 1  text search, ids only        cheap, paginated to 3 pages
       Stage 2  place details for new ids    expensive, only for new places
       persist  score, log activity, broadcast over SSE
  └─ terminal status always written in `finally`
```

Things that matter when touching this code:

- **Field masks are the cost control.** They must include `nextPageToken`, or
  pagination silently stops at 20 results per query and `maxResults` above 20
  becomes unreachable.
- **A run must always reach a terminal status.** The loop is wrapped in
  `try/finally`, and `recoverInterruptedSessions()` sweeps sessions left
  `RUNNING` by a dead process at boot. A session stuck in `RUNNING` cannot be
  restarted from the UI.
- **Tasks are scoped by `sessionId`.** Cleanup that matches on `campaignId`
  alone will cancel a sibling session's pending work.
- **One bad lead must not kill a run.** Duplicates (`P2002`) and failed
  enrichments are skipped and counted, never thrown.

## Data model notes

- `Lead` is unique on `[campaignId, placeId]`, not on `placeId` alone. The same
  business can appear in several campaigns but only once within one.
- Campaign `totalLeads`, `leadsByStatus`, and `avgScore` are denormalized.
  Recompute them with `campaignService.recomputeStats()` **on write only** —
  reads must never write, because the detail page polls.
- JSON-ish columns (`config`, `leadsByStatus`, `categories`) are `String` and
  parsed at the service boundary, so callers always receive real objects.

## Pipeline

`DISCOVERED → QUALIFIED → CONTACTED → INTERESTED → DEMO_SCHEDULED → NEGOTIATION → WON | LOST`

The order of `LEAD_STATUSES` in `shared/src/types/index.ts` is meaningful — the
UI derives progression from the array index. Do not reorder it casually.

## Scoring

0–100 from what Places actually returns: phone 25, website 20, rating up to 25
(3.0 is the neutral point), review volume up to 20, completeness 10. Do not add
weight for fields Places does not return — an earlier version reserved 30 points
for email and a multi-store flag that nothing populated, which capped every lead
at 85 and bunched scores into a narrow band.

## API

```
GET    /health

GET    /api/campaigns                              list, filter, paginate
POST   /api/campaigns
GET    /api/campaigns/:id
PUT    /api/campaigns/:id
PATCH  /api/campaigns/:id/status                   ACTIVE | PAUSED | ARCHIVED
DELETE /api/campaigns/:id
GET    /api/campaigns/:id/tasks
GET    /api/campaigns/:id/export                   .xlsx

GET    /api/campaigns/:id/sessions
POST   /api/campaigns/:id/sessions
GET    /api/campaigns/:id/sessions/:sid
POST   /api/campaigns/:id/sessions/:sid/start      202, runs in background
POST   /api/campaigns/:id/sessions/:sid/cancel
GET    /api/campaigns/:id/sessions/:sid/leads
GET    /api/campaigns/:id/sessions/:sid/export
DELETE /api/campaigns/:id/sessions/:sid

GET    /api/leads                                  requires a campaignId filter
GET    /api/leads/:id                              includes activity log
PATCH  /api/leads/:id/status
POST   /api/leads/:id/notes                        appends, never overwrites
DELETE /api/leads/:id

GET    /api/dashboard/stats
GET    /api/settings  ·  PUT /api/settings
GET    /api/events                                 SSE
```

Responses are `{ success, data, meta?, message? }`. Errors are
`{ success: false, error: { code, message, details? } }` — the client surfaces
`error.message` directly, so write messages a person can act on.

## Frontend conventions

- **The design system lives in `tailwind.config.ts`.** There is no parallel CSS
  custom-property file. One neutral ramp, one accent, semantic colour only for
  state worth noticing. The accent is indigo-violet and it is the only saturated
  hue in the chrome; the neutral ramp is tinted toward it, so the two read as
  one system. Shadows are tinted with the accent hue rather than black.
- **Type is Inter, loaded from Google Fonts with `display=swap`,** falling back
  to the system UI face. Nothing may depend on the webfont having arrived. The
  scale runs large on purpose: a 15px floor (`xs`, which carries the secondary
  line of every list row) and a 17px body. The two display tiers are `clamp()`
  expressions that interpolate with the viewport, so page titles size themselves
  rather than needing breakpoint overrides.
- **Edges are 2px.** `borderWidth.DEFAULT` is 2px, so `border` on a card,
  control, or section band is visible on a high-density display. Row separators
  are the exception at 1.5px (`divideWidth.DEFAULT`) — at 2px a list of leads
  reads as a grid of boxes instead of one list. Use `StatGrid` for rows of
  numbers: it rules the cells with a 2px grid gap over the container background,
  which lands correctly at any column count, where `divide-x` drew a stray rule
  down the first cell of every wrapped row.
- **Motion is small and has one source.** Entrances rise 8px, lists stagger via
  the `.stagger` utility in `index.css`, interactive cards lift 2px on hover and
  return on press. Everything eases with `ease-out` from the config, and the
  whole system is switched off under `prefers-reduced-motion`.
- **Status colour comes from `lib/status.ts`,** which is the only place it is
  defined. The pipeline is ordinal, so in-progress stages share a hue and deepen
  as they advance; only the terminal outcomes get their own colour.
- **`Card` has no padding.** `CardHeader` and `CardBody` own it. Hover elevation
  is opt-in via `interactive`, because a card that lifts is claiming to be
  clickable — where a card does lift, the whole surface is a link via the
  stretched-overlay pattern, not just its title. `Stat` lives in the same file
  and is the only way to render a headline number.
- **Icon-only buttons require `label`.** The `Button` prop types enforce it.
- **Navigation is `<Link>`, never `onClick` + `navigate`.** Links give keyboard
  access, new-tab, and copy-link for free.
- **Filters and open dialogs live in the URL** via `useSearchParams`, so views
  are shareable and Back closes a dialog.
- **SSE drives cache invalidation; queries do not poll.** `useLive()` also
  exposes connection status and live discovery progress — use them rather than
  showing an indefinite spinner over a process whose real ratio is known.

## Environment

See `.env.example`. `DATABASE_URL` and `GOOGLE_PLACES_API_KEY` are required in
production and the process refuses to start without them. In development they
fall back to sensible defaults, and a missing Places key only warns — discovery
then fails with a clear message rather than silently returning nothing.

## Deployment

`render.yaml` defines two services and a database: `bmatrix-api` (which runs
`prisma migrate deploy` in its build) and `bmatrix-web` (static, with a rewrite
so client-side routes resolve). After the first deploy, set `CORS_ORIGIN` on the
API to the web URL, and `VITE_API_URL` on the web service to the API URL + `/api`.
