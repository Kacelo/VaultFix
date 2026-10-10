# FaultFx — Project Documentation

> Electrical fault reporting and electrician dispatch for Namibia. Clients log
> faults (often by scanning a QR code on a wall), find NTA-verified
> electricians, and get a job, a certificate and a signed receipt out the other
> end.

**Last updated:** 2026-10-10 · **Branch:** `feat/dashboard-and-deploy-prep` ·
**Status:** pre-launch, deploying to Vercel

---

## 1. Status at a glance

| Area | State |
|---|---|
| Public marketing site (`/`) | Working |
| Registration / login (email+password, magic link, Google) | Working, **Google path broken** (§9.1) |
| Electrician directory + profiles | Working, verified against live data |
| Fault reporting (incl. anonymous QR flow) | Working |
| Booking an electrician | Built, **not exercised against a real session** |
| Role-aware dashboard (client / electrician / admin) | Built, **not exercised against a real session** |
| NTA verification queue (admin, approvable in place) | Built, unverified |
| Mark a job complete | **Backend done, no UI** (§9.3) |
| Admin-side job assignment | **Not built** |
| Organisations / maintenance contracts | **Not built** (§10.1) |
| Notifications of any kind | **Do not exist** (§10.1) |
| Automated tests | **None** |

The honest summary: the public, read-only surface is verified working. Most of
the authenticated surface is written, typechecked and built, but has never been
clicked through by a human. That gap is the single biggest risk in the project
right now — a rendering bug and a data bug are currently indistinguishable.

---

## 2. Stack

| | |
|---|---|
| Framework | Next.js **16.2.9**, App Router, Turbopack |
| UI | React **19.2.4**, Tailwind CSS **v4**, shadcn/ui (`radix-nova` style) |
| ORM | Prisma **7.9.1** via `@prisma/adapter-pg` |
| Database | PostgreSQL (Supabase-hosted) |
| Auth | Supabase Auth (`@supabase/ssr`) |
| Hosting | Vercel |
| Other | `qrcode` for QR generation |

> **Next.js 16 is not the Next.js most references describe.** `params` and
> `searchParams` are Promises, middleware is now `proxy.ts`, and `PageProps<'/route'>`
> / `LayoutProps<'/route'>` are globally available generated types. The bundled
> docs in `node_modules/next/dist/docs/` are the authority — see `AGENTS.md`.

---

## 3. Repository layout

```
VaultFix/
├── docs/                        # this file, progress report
├── package.json                 # STRAY: unused Supabase deps, no `next` (§9.5)
└── prisma/
    ├── package.json             # Prisma CLI + tsx + scripts
    ├── prisma.config.ts         # Migrate config; uses DIRECT_URL
    ├── scripts/make-admin.ts    # out-of-band admin bootstrap (§8)
    └── prisma/
    │   ├── schema.prisma        # the schema
    │   └── migrations/          # init + enable_rls
    └── frontend/                # ← THE NEXT.JS APP (Vercel Root Directory)
        ├── src/app/             # routes
        ├── src/components/      # Navbar, Footer, AccessNotice, ui/ (shadcn)
        ├── src/lib/
        │   ├── prisma.ts        # client singleton (pooled, globalThis-cached)
        │   └── supabase/
        │       ├── actions.ts   # ALL 54 server actions (~1,500 lines)
        │       ├── server.ts    # cookie-based server client
        │       ├── client.ts    # browser client
        │       └── admin.ts     # service-role client (bypasses RLS)
        └── src/proxy.ts         # Next 16 middleware: session refresh + route guard
```

**The layout is inverted and it causes real friction.** The Next app lives
*inside* a folder called `prisma/`, and the schema lives one level *above* the
app. Consequences: Vercel needs Root Directory set to `prisma/frontend`, and the
build must reach outside it (`--schema ../prisma/schema.prisma`). Worth
restructuring eventually; not worth doing mid-deploy.

---

## 4. Architecture: where authority lives

This is the most important section in the document.

**Supabase owns authentication. Prisma owns all data.**

Prisma connects as the **database owner**, which means **Row Level Security does
not apply to anything the app does.** The `enable_rls` migration exists, but it
protects nothing on this code path. There is exactly one security boundary:

> Every exported function in `actions.ts` must authorise its own caller.

Server Actions compile to **public HTTP POST endpoints**. They are reachable by
`curl` with arbitrary JSON, not only through our own forms. A TypeScript type on
a parameter is erased at compile time and provides **zero** runtime protection.
Both vulnerabilities found and fixed in `5bb9928` were this exact mistake.

### The guards (`actions.ts`)

| Guard | Meaning |
|---|---|
| `getSessionUserId()` | Memoised per request; the one Supabase auth round trip |
| `getCallerUser()` | Memoised `users` row (`id`, `role`) |
| `requireUserId()` | Throws unless signed in |
| `requireRole([...])` | Throws unless the caller's **database** role matches |
| `requireElectricianProfileId()` | Caller's electrician profile, or throws |
| `requireJobAccess(jobId)` | Caller is the job's client, its electrician, or admin |

All of these are memoised with React `cache()` for the lifetime of one request.
Before that, rendering a single page cost three separate Supabase auth calls.

### Authorization surface

- **54** exported server actions.
- **39** are guarded.
- **15** have no guard, and that is deliberate. They are: the four auth entry
  points, `getCurrentUser` (self-scoping — returns `null` when signed out), the
  five public directory reads, `getLocation` / `listLocationsForReporting` /
  `createFaultReport` (the anonymous QR reporting flow), `getFaultReportByRef`
  and `getCertificateByRef` (lookup by unguessable ref — the "guest tracking"
  path), and `listReviewsForElectrician`.
- `setElectricianAvailability` *looks* unguarded but delegates to
  `updateElectricianProfile`, which guards. Static audits flag it; it is fine.

**Rule for new work:** if you add an exported function to `actions.ts`, it needs
a guard or a written justification for why it is public.

---

## 5. Data model

Models: `User`, `ElectricianProfile`, `Location`, `FaultReport`, `Job`,
`Certificate`, `Review`, `Receipt`, `Subscription`.

### Enums

| Enum | Values |
|---|---|
| `Role` | `CLIENT`, `ELECTRICIAN`, `ADMIN` |
| `FaultPriority` | `CRITICAL`, `HIGH`, `MEDIUM`, `LOW` |
| `FaultStatus` | `OPEN`, `ASSIGNED`, `IN_PROGRESS`, `RESOLVED`, `CLOSED` |
| `JobStatus` | `PENDING`, `ACCEPTED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED` |
| `CertType` | `COC`, `WIREMAN_LICENSE`, `NTA_VERIFIED` |
| `SubscriptionPlan` | `FREE`, `CLIENT_PRO`, `ELECTRICIAN_PRO` |
| `SubscriptionStatus` | `ACTIVE`, `CANCELLED`, `EXPIRED`, `TRIALING` |

### Invariants that shape the product

These `@unique` constraints are not incidental — they define what the product
can and cannot do:

- `User.email` — **one human, one account.** Two accounts means two email
  addresses. This is why the "work account + personal account" request (§10.2)
  is not a small change.
- `User.id` **is the Supabase auth user id.** Not a separate key.
- `ElectricianProfile.userId` — one profile per user.
- `ElectricianProfile.ntaUid` — an NTA UID cannot be registered twice.
- **`Job.faultId`** — **one job per fault, forever.** This single constraint is
  the root of the cancellation bug in §9.2.
- `Review.jobId`, `Receipt.jobId` — one each per job.
- `Subscription.userId` — **billing is per person, not per organisation.**
  Relevant to §10.

### Core flow

```
Location (QR on a wall)
    │
    ▼
FaultReport ──(createJob)──> Job ──> Certificate
  reporterId?                 │  ├──> Receipt (dual-signed)
  (null = anonymous)          │  └──> Review (client → electrician)
                              ▼
                    updates FaultReport.status
```

A **Job always hangs off a FaultReport.** There is no standalone "book an
electrician" — booking means *attaching an electrician to an existing fault*.
This is why the booking form on a technician's profile asks you to pick one of
your open faults, and why there is nothing to book if you have none.

### The NTA verification gate

`ntaVerified` is the commercial heart of the platform:

- An unverified electrician **cannot be assigned a job** (`createJob` refuses).
- An unverified electrician **cannot mark themselves available**
  (`updateElectricianProfile` refuses).
- Re-submitting an NTA UID **resets** `ntaVerified` and withdraws the
  electrician from call-outs — the number an admin approved is no longer the
  number on file.
- Only an `ADMIN` can verify, via `verifyElectrician`.

Everyone in the verification queue is therefore blocked from earning until an
admin acts. That makes the admin queue the highest-value screen in the app.

---

## 6. Routes

| Route | Rendering | Access |
|---|---|---|
| `/` | Static | Public |
| `/login`, `/register` | Static | Public |
| `/fault-log` | Static | Public (anonymous reporting allowed) |
| `/fault-log/[locationId]` | Dynamic | Public — QR scan destination, 404s on bad id |
| `/technicians` | Dynamic | Public |
| `/technicians/[id]` | Dynamic | Public |
| `/certs`, `/certs/generate` | Mixed | Electrician / admin |
| `/receipts` | Dynamic | Parties to the job |
| `/dashboard` | Dynamic | Any signed-in user; content dispatches on role |
| `/electrician/verification` | Dynamic | Electrician |
| `/admin/qr-codes` | Dynamic | **ADMIN only** (enforced in the action, not the proxy) |
| `/auth/callback` | Route handler | Public (OAuth/OTP exchange) |

`proxy.ts` protects `/dashboard` and `/admin` — but it only checks **that you
are signed in, not what role you hold.** Role enforcement for `/admin` happens
in `getAllLocations`, which requires `ADMIN`. Don't mistake the proxy for a
role gate.

`/about` is linked in the navbar but **does not exist** (404).

---

## 7. Deployment (Vercel)

### Required settings

- **Root Directory:** `prisma/frontend`. Without it the build inspects the stray
  repo-root `package.json`, finds no `next`, and fails.
- **Include files outside the Root Directory:** must be **enabled** — the build
  reads `../prisma/schema.prisma`.

### Environment variables

| Variable | Needed at | Notes |
|---|---|---|
| `DATABASE_URL` | **build + runtime** | Transaction pooler, `:6543`. Needed at build because `prisma.ts` constructs the client at module load. No query runs at build. |
| `DIRECT_URL` | migrations only | Session pooler, `:5432`. DDL over the transaction pooler hangs silently. |
| `NEXT_PUBLIC_SUPABASE_URL` | **build** | Inlined into the client bundle |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **build** | Inlined into the client bundle |
| `NEXT_PUBLIC_APP_URL` | **build** | Inlined |
| `SUPABASE_SERVICE_ROLE_KEY` | runtime | **Registration fails without it** — `syncUserProfile` verifies the auth user via the admin API |

The three `NEXT_PUBLIC_*` variables are substituted at build time. If they are
missing the build *succeeds* and the app breaks in the browser, which is a far
more confusing failure than a missing `DATABASE_URL`.

### Build

```jsonc
"build": "prisma generate --schema ../prisma/schema.prisma && next build"
```

The generated client (`src/generated/prisma/`) is a **build artifact** and is
gitignored. Inline rather than `prebuild`, because pnpm does not run pre/post
scripts by default. The `prisma` CLI is pinned to **exactly** `7.9.1` to match
`@prisma/client`: a caret let it drift to 7.10.0, which generated a client newer
than the runtime library.

### Also required

- Add the Vercel domain to **Supabase Auth → redirect allowlist**, or
  confirmation emails and Google OAuth bounce to `localhost`.
- Run `prisma migrate deploy` against production.

### Gotcha: QR codes bake in their origin

`Location.qrUrl` is written **at creation time** from the request origin. Any
location created on `localhost` has `http://localhost:3000/...` stored in the
database. `NEXT_PUBLIC_APP_URL` only changes what the admin screen *displays*.
Printed QR codes made from dev data are dead in production and those rows need
regenerating.

---

## 8. Operations

### Creating an admin

There is **deliberately no way to become an admin through the application.**
`syncUserProfile` is the only function that writes `role`, and it rejects
anything but `CLIENT`/`ELECTRICIAN` at runtime so that a public endpoint cannot
mint administrators.

```bash
cd prisma
pnpm make-admin someone@example.com      # promotes an EXISTING account
pnpm make-admin someone@example.com --demote
```

Requires direct database credentials (`DIRECT_URL`), and the generated Prisma
client. Role is read from the database on every request, so it takes effect
immediately with no sign-out.

If an "invite an admin" feature is ever wanted, it must be an action guarded by
`requireRole(["ADMIN"])` — an existing admin promoting someone else. Never
anything reachable without a session.

---

## 9. Known issues

Ordered by how much damage they do.

### 9.1 Google sign-in creates an account with no database row

`/auth/callback` exchanges the OAuth code and redirects, but **never calls
`syncUserProfile`**. The result: a valid Supabase auth session with **no `users`
row at all**. `getCurrentUser()` returns `null`, so `/dashboard` tells the user
to sign in *while they are signed in*, and they have no role, no profile and no
ability to do anything. The navbar now shows them a Dashboard button that leads
to that dead end.

**Fix:** have the callback upsert the profile after a successful exchange.
Google provides no role, so it needs a role-selection step or a `CLIENT`
default.

### 9.2 Cancelling a job strands its fault forever

`Job.faultId` is `@unique` and `createJob` refuses when `fault.job` exists.
Cancelling sets the **fault** back to `OPEN` — which reads as "available
again" — but the `Job` row remains, so **that fault can never be assigned to
anyone, ever.** The fault looks open indefinitely and every booking attempt
fails with "This fault already has a job assigned."

**Fix options:** delete the job row on cancellation, or drop the `@unique` on
`faultId` and scope the "already assigned" check to non-cancelled jobs. The
second is better history-keeping; the first is a smaller change.

### 9.3 No UI to progress or complete a job

`updateJobStatus` is complete and correct — transactional, stamps
`startedAt`/`completedAt`, moves the fault to `RESOLVED`, and only lets the
assigned electrician or an admin progress a job (a client may only cancel).
**Nothing in the UI calls it.** The capability exists only as a POST endpoint.

Natural home: a per-row status control in the electrician dashboard's
"Your call-outs" table.

### 9.4 No job status transition validation

`updateJobStatus` accepts any status from any status. A job can jump
`PENDING → COMPLETED` without ever being `IN_PROGRESS`, and a completed job can
be moved backwards. Because the action is a public endpoint, the state machine
has to be enforced **server-side**, not just by which buttons the UI renders.

### 9.5 Smaller items

- **Stray repo-root `package.json`/`package-lock.json`** — unused Supabase
  deps, no `next`. This is what breaks Vercel framework detection when Root
  Directory is unset. Safe to delete.
- **`/about` 404s** from the navbar.
- **The landing page's own "Get Started" CTA** still shows to signed-in users.
- **`getAllElectricians` has no callers** and is an unauthenticated endpoint
  returning the whole table. Deleting it would reduce attack surface.
- **No input validation library.** Server actions parse raw input by hand. The
  escalation bug in `5bb9928` was this class of problem; Zod at the
  unauthenticated boundary (especially `createFaultReport`, a public *write*)
  would help.
- **`actions.ts` is ~1,500 lines.** Domain sections are already marked; the
  split is mechanical.
- **No tests at all.** The app's correctness is overwhelmingly authorization
  logic, which is exactly what tests would protect.

---

## 10. Requested features

### 10.1 Maintenance contracts: route faults to a contracted provider

**Client's request (26 Sep 2026):**

> "I just don't want it to give a job alert to a random electrician because in
> some circumstances companies have maintenance contracts with an individual
> company. […] let's say FNB Namibia has a maintenance contract with VoltCore
> technical services, and then when an FNB employee reports an electrical fault
> it should notify only VoltCore technical services technicians not all the
> technicians on the platform." — and for large providers, only the technicians
> **assigned to that building**.

#### Read this first: there are no notifications in the system

The request is framed around *alerts* — "give a job alert", "notify only
VoltCore". **FaultFx has no notification mechanism of any kind.** No email
(beyond Supabase's own auth mails), no SMS, no push, no in-app alerts. Nothing
is ever "pushed out to all electricians on the platform" today.

The current model is **pull, not push**: a client browses `/technicians`, picks
someone, and attaches them to a fault. So the concern as stated — jobs being
broadcast to random electricians — **does not happen today.**

That splits the request in two, and they should be priced separately:

- **(a) Restrict eligibility.** For a building under contract, only the
  contracted provider's technicians may be selected/assigned. Achievable on the
  current architecture. This is the part that delivers the client's actual
  intent.
- **(b) Actually notify technicians.** A dispatch/notification system —
  genuinely new infrastructure (provider, templates, delivery, preferences,
  retries), not an add-on.

The client believes this is "just an add on on what we have." Part (a) nearly
is. Part (b) is a new subsystem. **Worth clarifying with them which they
actually want first** — my read is they want (a), and described it in terms of
(b) because that is how they imagine it working.

#### Blocker: organisations do not exist

There is **no organisation, tenant, company or team model anywhere** in the
schema, and `Location` has **no owner** — rooms are global, and any signed-in
user can file a fault against any room. "FNB's buildings" and "VoltCore's
technicians" are both currently inexpressible.

So this feature *is* the multi-tenancy work (§10.2), plus routing on top. The
two requests are the same foundation.

#### Proposed design

```prisma
enum OrgKind { CLIENT_ORG, PROVIDER }   // FNB vs VoltCore

model Organisation {
  id   String  @id @default(cuid())
  name String
  kind OrgKind
  // memberships, locations, contracts…
}

model Membership {                       // one human, many orgs
  userId         String
  organisationId String
  role           OrgRole                 // OWNER | MANAGER | MEMBER | TECHNICIAN
  @@unique([userId, organisationId])
}

model MaintenanceContract {
  id            String    @id @default(cuid())
  clientOrgId   String                     // FNB
  providerOrgId String                     // VoltCore
  locationId    String?                    // null = the whole client org
  startsAt      DateTime
  endsAt        DateTime?
  active        Boolean   @default(true)
}

model TechnicianAssignment {              // "assigned to maintenance on that building"
  membershipId String
  locationId   String
  @@unique([membershipId, locationId])
}
```

Plus `Location.organisationId`, and a nullable `organisationId` on `FaultReport`
and `Job` recording which hat the reporter was wearing.

**Routing rule** when a fault is reported at a location:

1. Resolve the location's owning organisation.
2. Look for an active contract covering it — **most specific first**: a
   location-scoped contract beats an org-wide one.
3. If a contract exists → eligible electricians are that provider's
   technicians, narrowed to those with a `TechnicianAssignment` for the
   location *if any exist for it*.
4. If no contract → fall back to today's open marketplace.

Step 4 is what makes it genuinely additive: uncontracted clients keep the
current behaviour exactly.

#### Cost, honestly

The schema is the easy half. The expensive half is that **all 54 server actions
guard against a single global `role`**, and every scoped read assumes
"mine = mine personally". Tenancy turns authorization into *(user, org, role)*:
a new `requireOrgRole(orgId, [...])` guard and rewritten scoping in every read.
That lands directly on the security surface hardened in `5bb9928`, so it wants
doing deliberately.

`createJob` also needs a new refusal: *this fault is under contract and you are
not the contracted provider.* Enforced server-side, since filtering a dropdown
protects nothing.

Billing needs a decision too: `Subscription.userId` is `@unique`, one per
person. If FNB or VoltCore pays, subscriptions belong to the organisation.

### 10.2 Organisation vs personal accounts

**Stakeholder's request:** a NamWater employee uses the app for facilities
maintenance at work *and* to book an electrician for their own home.

**Recommendation: one identity, many contexts — not two accounts.** Same login,
a workspace switcher ("NamWater" / "Personal"), and each fault records which
context it was raised in. Two literal accounts works today with zero code
(`email @unique` means two email addresses) but gives two passwords, no
switching, and no shared visibility.

**What they may not have realised:** FaultFx cannot do organisational facilities
maintenance *at all* right now, regardless of account separation.
`listFaultReports` scopes a client to `reporterId = caller.id`, so a NamWater
facilities manager cannot see a fault a colleague logged. The missing piece is
not account separation — it is **shared, org-scoped visibility**.

This shares its entire foundation with §10.1. Do them together.

### 10.3 Timing

The cheapest moment to introduce tenancy is **now**, with a handful of users and
near-zero data. Retrofitting organisation ownership onto thousands of existing
faults and locations is the genuinely painful version. That said, it should not
block the first deploy.

---

## 11. Design decisions worth not re-litigating

**The navbar reads the session in the browser, not on the server.** The Navbar
lives in the root layout; reading cookies there would opt *every* page —
including the static landing, login and register pages — into per-request
rendering, and add an auth call plus a user query to each. `onAuthStateChange`
emits `INITIAL_SESSION` from the cookie the page already carried, so it costs no
network round trip, and login/logout update the nav without a reload. The
trade-off is a brief unresolved state, held with a fixed-size placeholder so the
header does not shift.

**The navbar does not branch on role.** One `/dashboard` link for everyone; the
page renders client/electrician/admin content from the **database** role.
`user_metadata` is self-asserted and is used for display only.

**Sign-out goes through the browser client, not the `signOut` server action.**
The action clears the cookie but cannot notify the navbar's listener, so the nav
would keep showing the user as signed in after the redirect.

**Existence checks for `/technicians/[id]` live in the layout, not the page.**
`loading.tsx` puts the page behind a Suspense boundary, so the 200 status is
committed before the page body runs — a `notFound()` there renders 404 content
with a **200 status**, a soft 404 that search engines index. The layout renders
outside that boundary and is the last place able to set the status.

**shadcn is themed to FaultFx, not the reverse.** `shadcn init` overwrote
`--border`/`--primary`/`--accent`, added a full light theme with a `@layer base`
rule painting `body` white, and injected Geist over Inter. All reverted; every
shadcn token now maps onto the existing palette, so components render dark
teal-and-glass. `--accent` is the one token whose meaning changed (shadcn reads
it as a subtle hover surface, so the brand amber moved to `--brand-accent`).
Cards keep the frosted look by passing `.glass`, which is declared unlayered and
so beats Tailwind's utilities — they also need `ring-0` and an explicit 20px
radius, because Card draws its own ring at a 12px radius.

**Reads are parallelised and session lookups memoised.** The technician profile
once issued six queries and three auth calls in series (~3.9s); it now issues
three queries in one batch (~640ms).

---

## 12. Verification status

Be precise about this, because much of the app has never been run by a human.

**Verified against live data:**
- Public pages return 200; the directory renders and filters correctly.
- `/technicians/[id]` renders, and a bad id returns a real HTTP 404.
- `/dashboard` 307s to `/login` for signed-out callers.
- The credential leak is closed — `ntaUid` and `wiremanLicense` no longer
  appear in the anonymous `/technicians` payload.
- A clean `git clone` + install + build succeeds (this is what Vercel does).
- shadcn tokens resolve to the FaultFx palette with no white leakage.
- `make-admin` connects, queries and reports correctly for a missing address.

**Built and typechecked but never exercised with a real session:**
- Registration — *and it changed*; it now requires `SUPABASE_SERVICE_ROLE_KEY`.
- All three dashboard role branches.
- The booking form on a technician's profile.
- The signed-in navbar (identity, Dashboard, sign out).
- The admin verification queue's approve buttons.
- `make-admin`'s actual promotion branch (it writes to production data).

**Next action, before building anything further:** create an admin with
`pnpm make-admin`, then click through all three dashboards, a registration, and
a booking. It takes minutes and converts the largest block of unknowns in the
project into known state.
