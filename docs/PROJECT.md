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
| Registration / login (email+password, magic link, Google) | Working; the Google no-profile bug is fixed (§9.1) |
| Electrician directory + profiles | Working, verified against live data |
| Fault reporting (incl. anonymous QR flow) | Working |
| Booking an electrician | Built, **not exercised against a real session** |
| Role-aware dashboard (client / electrician / admin) | Built, **not exercised against a real session** |
| NTA verification queue (admin, approvable in place) | Built, unverified |
| Mark a job complete | Electrician control shipped (§9.3) — unverified in UI |
| Admin-side job assignment | **Not built** |
| Organisations, memberships, work/personal switcher | Built (§10.2) — unverified in UI |
| Maintenance contracts | **Not built** (§10.1) |
| Notifications of any kind | **Do not exist** (§10.1) |
| Automated tests | 36, covering the authorization boundary (§12) |

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

A conventional single-app Next.js repo. One package, schema beside it.

```
VaultFix/
├── .env                    # DATABASE_URL, DIRECT_URL (gitignored)
├── .env.local              # Supabase + app vars (gitignored)
├── AGENTS.md / CLAUDE.md   # the Next.js 16 warning — read before writing code
├── package.json            # the only package
├── next.config.ts, tsconfig.json, postcss.config.mjs, components.json
├── prisma.config.ts        # Migrate config; uses DIRECT_URL
├── prisma/
│   ├── schema.prisma
│   └── migrations/         # init + enable_rls
├── scripts/
│   └── make-admin.ts       # out-of-band admin bootstrap (§8)
├── docs/                   # this file, progress report, legacy landing mockup
├── public/
└── src/
    ├── app/                # routes
    ├── components/         # Navbar, Footer, AccessNotice, ui/ (shadcn)
    ├── generated/          # Prisma client — BUILD ARTIFACT, gitignored
    ├── lib/
    │   ├── prisma.ts       # client singleton (pooled, globalThis-cached)
    │   └── supabase/
    │       ├── actions.ts  # ALL 54 server actions (~1,500 lines)
    │       ├── server.ts   # cookie-based server client
    │       ├── client.ts   # browser client
    │       └── admin.ts    # service-role client (bypasses RLS)
    └── proxy.ts            # Next 16 middleware: session refresh + route guard
```

> **This was flattened on 2026-10-10.** The app previously sat at
> `prisma/frontend/` — inside a folder named after the ORM, with the schema one
> level *above* it. That cost us three separate failures: Vercel inspecting the
> wrong `package.json`, a build that had to reach outside its own root for the
> schema, and `tsc` silently picking up a parent `tsconfig.json`. If you find a
> reference to `prisma/frontend` anywhere, it is stale.

### Node version

There is no `.tool-versions` committed, and asdf has no version selected
globally, so `pnpm` can fail with "No version is set for command node". Any
Node 20.9+ works (Next 16's floor); 24.21.0 is what the current lockfile was
installed and built with. Worth pinning if this trips anyone else up.

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
| `getActiveOrganisationId()` | The org the caller is acting as, or null for personal |
| `requireOrgRole(orgId, roles)` | Throws unless the caller holds one of `roles` in that org |

### Organisation context — read this before touching it

The active context is held in an **httpOnly cookie**, and that cookie only
**selects** a context; it never **grants** one. Whatever it claims is checked
against the `memberships` table on **every request**, so a forged, stale or
copied cookie resolves to personal rather than to someone else's
organisation. `access.test.ts` asserts exactly this.

`requireOrgRole` is the only way to assert organisation access. Platform
`ADMIN`s get **no implicit bypass** — running the platform is not the same as
being inside a customer's account, and a silent bypass would make every
org-scoped check untrustworthy. Where admins need to see across
organisations, the read says so explicitly.

Fault visibility goes through one predicate, `visibleFaultFilter`: staff see
everything; a client sees either their own personal faults or everything
belonging to the organisation they are acting as. Personal context
deliberately **excludes** organisation faults, so "personal" means personal.

**Fault ownership follows the building first.** A fault in an FNB stairwell is
FNB's whoever reported it, including an anonymous QR scan; it falls back to the
reporter's active context only when the building is unowned. That is the rule
maintenance contracts (§10.1) will route on.

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

Models: `User`, `Organisation`, `Membership`, `ElectricianProfile`, `Location`,
`FaultReport`, `Job`, `Certificate`, `Review`, `Receipt`, `Subscription`.

### Enums

| Enum | Values |
|---|---|
| `Role` | `CLIENT`, `ELECTRICIAN`, `ADMIN` (platform-wide) |
| `OrgRole` | `OWNER`, `MANAGER`, `MEMBER` (within one organisation) |
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
- `Membership` is unique on `(userId, organisationId)` — one standing per
  person per organisation.
- `Organisation.slug` is unique; `createOrganisation` falls back to a suffixed
  slug so similarly-named organisations do not block each other.
- `Subscription.userId` — **billing is still per person, not per
  organisation.** Unresolved, and §10.1 will force the question.

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

- **Root Directory:** leave **blank** (the repository root). The app is at the
  root as of 2026-10-10 — if this is still set to `prisma/frontend` from an
  earlier deploy, the build will fail with "No Next.js version detected".
- **Include files outside the Root Directory:** no longer needed. The build used
  to reach up for the schema; it is now a sibling.

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
"build": "prisma generate --schema prisma/schema.prisma && next build"
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

**Phase 1 cleared §9.1 through §9.4 on 2026-10-13.** They are kept below with
their resolutions, because the reasoning is worth having when the same shapes
recur — particularly §9.2, which is now an application-level invariant rather
than a database one.

### 9.1 ~~Google sign-in creates an account with no database row~~ — FIXED

`/auth/callback` exchanges the OAuth code and redirects, but **never calls
`syncUserProfile`**. The result: a valid Supabase auth session with **no `users`
row at all**. `getCurrentUser()` returns `null`, so `/dashboard` tells the user
to sign in *while they are signed in*, and they have no role, no profile and no
ability to do anything. The navbar now shows them a Dashboard button that leads
to that dead end.

**Done:** the callback now calls `ensureCurrentUserProfile()` after a
successful exchange. That function requires a session and takes **no
arguments**, reading identity from the token — the opposite of
`syncUserProfile`, and what makes it safe. Create-only, so Google sign-in can
never rewrite an existing electrician's or admin's role. New accounts default
to `CLIENT`. The `?error=` codes the callback has always emitted are now
displayed on the login page, where they were previously silent.

### 9.2 ~~Cancelling a job strands its fault forever~~ — FIXED

`Job.faultId` is `@unique` and `createJob` refuses when `fault.job` exists.
Cancelling sets the **fault** back to `OPEN` — which reads as "available
again" — but the `Job` row remains, so **that fault can never be assigned to
anyone, ever.** The fault looks open indefinitely and every booking attempt
fails with "This fault already has a job assigned."

**Done:** took the history-keeping option. `FaultReport.jobs` is now a list,
the unique index is a plain one, and `createJob` ignores cancelled rows.

> **Carry this forward:** "at most one ACTIVE job per fault" is now enforced in
> application code, not by the database. A partial unique index
> (`WHERE status <> 'CANCELLED'`) would be stronger, but Prisma cannot express
> one in the schema and reports it as drift on every later migrate. Two
> concurrent `createJob` calls for one fault could therefore both succeed.

### 9.3 ~~No UI to progress or complete a job~~ — FIXED

`updateJobStatus` is complete and correct — transactional, stamps
`startedAt`/`completedAt`, moves the fault to `RESOLVED`, and only lets the
assigned electrician or an admin progress a job (a client may only cancel).
**Nothing in the UI calls it.** The capability exists only as a POST endpoint.

**Done:** each call-out in the electrician dashboard offers exactly one forward
step — Accept, Start work, Mark complete — plus Cancel until completion.
Terminal states offer nothing. Labels live in the UI; `JOB_TRANSITIONS` in
actions.ts remains the authority.

### 9.4 ~~No job status transition validation~~ — FIXED

`updateJobStatus` accepted any status from any status: a job could jump
`PENDING → COMPLETED` unworked, or a completed job be dragged backwards.

**Done:** `JOB_TRANSITIONS` enforces the lifecycle server-side — accept, start,
complete, with cancellation available until completion and both end states
terminal. Re-sending a job's current status is a no-op rather than an error, so
a double-click is not alarming.

### 9.5 Smaller items

- ~~**`/about` 404s** from the navbar~~ — link removed. Three dead links
  remain by choice: `/forgot-password`, `/privacy` and `/terms`. Those are a
  missing feature and missing legal pages, not stray markup; deleting the links
  would hide real gaps.
- **The landing page's own "Get Started" CTA** still shows to signed-in users.
- **`getAllElectricians` has no callers** and is an unauthenticated endpoint
  returning the whole table. Deleting it would reduce attack surface.
- **No input validation library.** Server actions parse raw input by hand. The
  escalation bug in `5bb9928` was this class of problem; Zod at the
  unauthenticated boundary (especially `createFaultReport`, a public *write*)
  would help.
- **`actions.ts` is ~1,500 lines.** Domain sections are already marked; the
  split is mechanical.

---

## 10. Requested features

### 10.0 Agreed build order

Settled 2026-10-11. Each phase is shippable on its own, and the order is
deliberate: the security boundary gets rewritten in phase 2, so the known bugs
are cleared first rather than carried through it.

**Phase 1 — clear the known issues (§9).** Largely done on 2026-10-13: §9.1
through §9.4 are fixed and the authorization boundary has tests. Outstanding:
input validation at the public boundary, and splitting actions.ts.

- Google sign-in creates the `users` record, defaulting to role `CLIENT` (§9.1)
- Cancelling a job frees its fault for reassignment (§9.2)
- Electricians get a control to start and complete jobs (§9.3)
- The **server** enforces valid job status transitions, not just the UI (§9.4)
- The small items in §9.5
- **Tests for the access checks** — the first tests in the project, aimed at
  exactly the layer that has produced every bug found so far

**Phase 2 — organisations (§10.2).** Built on 2026-10-13: organisations,
memberships, organisation-owned buildings, the work/personal switcher, and
colleague-shared fault visibility. See §4 for the context rules.

Outstanding in this phase: jobs, receipts and certificates are still scoped
per person, not per organisation — a colleague cannot yet see the job raised
off a shared fault. `Job` has no `organisationId`; it is derivable through
`fault.organisationId`, which is the likely fix.

> This phase *is* the security boundary. All 54 actions currently guard against
> a single global role, and every scoped read assumes "mine = mine personally".
> Budget for care, not speed.

**Phase 3 — maintenance contracts (§10.1).** A fault at a building under
contract can only be assigned to the contracted provider's technicians — and
only to those assigned to that building, where such assignments exist. Enforced
server-side, because filtering a dropdown protects nothing. Buildings with no
contract keep today's open marketplace, which is what makes this additive.
Admins get a screen to set contracts up.

> Phase 3 delivers the client's intent but **not notifications** — those still
> do not exist (see §10.1). Confirm with him whether restricting eligibility is
> what he actually wants, or whether he is expecting push alerts too.


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

**Done — one identity, many contexts, not two accounts.** Same login, a
switcher in the navbar, and each fault records the context it was raised in.
A `Membership` row per organisation; `email @unique` is untouched, so nobody
needs a second address.

The answer to give the stakeholder: yes, one login with a workspace switcher.

The capability that was actually missing — **shared, org-scoped
visibility** — is the part that now works: in an organisation context a client
sees every fault belonging to it, not just their own. `listFaultReports`,
`listBookableFaults` and `getFaultReport` all route through
`visibleFaultFilter`.

§10.1 builds directly on this foundation.

### 10.3 Why tenancy should not wait

The cheapest moment to introduce organisations is **now**, with a handful of
users and near-zero data. Retrofitting organisation ownership onto thousands of
existing faults and locations is the genuinely painful version. It should not
block the first deploy, but it should not drift either.

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

**Covered by tests (`pnpm test`):** 36 tests over the authorization boundary —
including that a cookie naming an organisation the caller does not belong to
falls back to personal scope, that a plain member cannot add colleagues or
rewrite their reports, that a manager cannot mint owners, that the last owner
cannot be removed, and that fault ownership follows the building —
signed-out rejection, role gates, `syncUserProfile`'s role allowlist,
`createJob`'s four refusals, the job lifecycle, and fault ownership. Supabase,
Prisma and `next/*` are mocked so the real guard logic runs.

**Verified against live data:**
- Public pages return 200; the directory renders and filters correctly.
- `/technicians/[id]` renders, and a bad id returns a real HTTP 404.
- `/dashboard` 307s to `/login` for signed-out callers.
- The credential leak is closed — `ntaUid` and `wiremanLicense` no longer
  appear in the anonymous `/technicians` payload.
- A clean `git clone` + install + build succeeds (this is what Vercel does).
- shadcn tokens resolve to the FaultFx palette with no white leakage.
- `make-admin` connects, queries and reports correctly for a missing address.
- Cancelling a job frees its fault: exercised end to end against the live
  database inside a rolled-back transaction — unbookable while the job is
  live, bookable once cancelled, and a second job can then be created. Zero
  rows persisted.
- The organisation schema, likewise: creating an organisation grants its
  creator an OWNER membership atomically, a building can be owned by it, an
  org-scoped read sees a *colleague's* fault, and a personal-scoped read does
  not. Zero rows persisted.

**Built and typechecked but never exercised with a real session:**
- Registration — *and it changed*; it now requires `SUPABASE_SERVICE_ROLE_KEY`.
- All three dashboard role branches.
- The booking form on a technician's profile.
- The signed-in navbar (identity, Dashboard, sign out).
- The admin verification queue's approve buttons.
- The new job status control (Accept / Start work / Mark complete).
- The context switcher and the organisations panel, end to end in a browser.
- `make-admin`'s actual promotion branch (it writes to production data).

**Next action, before building anything further:** create an admin with
`pnpm make-admin`, then click through all three dashboards, a registration, and
a booking. It takes minutes and converts the largest block of unknowns in the
project into known state.
