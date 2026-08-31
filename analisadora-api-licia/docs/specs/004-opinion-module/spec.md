# Spec 004 — Opinion module

**Status:** draft · **Depends on:** [spec 001](../001-process-module/spec.md) ·
[spec 003](../003-requirement-module/spec.md) ·
**Design decisions:** D2, D4, D6, D7, D8 ·
**Related:** [ADR-0001](../../adr/0001-pull-based-queue-consumption.md) ·
[ADR-0002](../../adr/0002-module-ports.md) ·
[ADR-0003](../../adr/0003-public-and-internal-surfaces.md) ·
[ADR-0004](../../adr/0004-requirements-are-superseded-never-rewritten.md)

This is design slices **4** (write-back), **5** (analysis screen) and **6**
(granular retry) — deliberately one spec: the three slices mutate the same
table, share one inter-module contract, and the AI microservice cannot be
built until write-back *and* retry fix its contract. The vocabulary used here
(Opinion, Review, Verified, Effective verdict, Conclusion, Retry, Write-back)
is defined in `CONTEXT.md` and was settled in the grilling session that
produced this spec.

## Problem Statement

The Opinion is the product, and it does not exist yet.

Everything around it is finished. A Process can be registered, queued, claimed
by the AI worker with a presigned PDF, a single-use job token and the
Requirement Catalog. And there it dies: the worker has **no endpoint to
deliver its results to** — the `opinion` table has never had a row written to
it, `completeProcessing` (built and unit-tested in spec 001) has no caller,
and every claimed Process is stranded in `processing` forever.

Even if results existed, the analyst could do nothing with them. There is no
way to read an Opinion, no way to record the human decision the whole system
exists to capture (D2's "sugestão da IA + decisão do humano"), no way to
conclude an analysis (`finishedAt` has no writer), and no way to re-run the
requirements that failed — D8's granular retry is a design promise with no
code behind it. The recovery matrix in spec 001 §5 explicitly points
`partially_processed` at "granular opinion retry (slice 6)", which does not
exist.

Without this module the product is a queue that accepts work and never
returns it.

## Solution

An Opinion module — the owner of the `opinion` table — closing the loop in
both directions:

- **Machine-facing (write-back):** one internal endpoint where the AI worker
  delivers everything a run produced, authenticated by the job token. One
  atomic transaction persists the batch (Opinions are born here, succeeded
  and failed alike), derives and flips the Process's aggregate outcome, and
  burns the token. The worker reports facts; this API owns the state machine.
- **Analyst-facing (analysis screen):** read a Process's Opinions with their
  Requirements embedded; record the Review (the human decision, independent
  of the AI's suggestion — a failed Opinion can be judged manually); mark
  Opinions Verified; conclude the analysis as an explicit act once every
  Opinion is verified.
- **Analyst-facing (retry):** one act that re-dispatches the
  failed-and-unverified remainder of a partially processed analysis through
  the same queue, without ever touching a requirement that already has a
  verdict — the AI's or a human's.

The Process module keeps sole ownership of the process row and the queue; it
exports a narrow completion surface (verify token, complete processing,
re-enqueue) that the Opinion module consumes through ports (ADR-0002).

## User Stories

1. As an AI-worker developer, I want a single internal endpoint to deliver a
   finished job to, so that write-back is one HTTP call and not a
   choreography.
2. As an AI-worker developer, I want to report per-requirement outcomes —
   verdict or failure — in one batch, so that a partially failed run is
   representable without inventing my own semantics.
3. As an AI-worker developer, I want to report a run that broke before
   producing anything (segmentation failure) through the same endpoint, so
   that I never have to decide between two endpoints for one event.
4. As an AI-worker developer, I want to authenticate the write-back with the
   job token I received at claim, so that I need no static credentials.
5. As an AI-worker developer, I want a retry job's claim payload to look
   exactly like a first run's (a list of requirements to judge), so that my
   worker has no retry-awareness at all.
6. As an AI-worker developer, I want a rejected write-back to tell me clearly
   why (bad token, wrong state, malformed batch), so that a vanished process
   is a clean 4xx and never a 500.
7. As a platform engineer, I want the write-back unreachable through the
   gateway by construction, so that publishing the analyst API can never
   expose the service-to-service surface.
8. As a platform engineer, I want the job token burned in the same
   transaction that persists the results, so that a replayed write-back is
   rejected instead of double-applied.
9. As an analyst, I want to open a processed Process and see every
   requirement with the AI's suggested status, commentary and evidence pages,
   so that I can review the analysis instead of reading 200 pages myself.
10. As an analyst, I want each Opinion to show its Requirement's text, type
    and legal reference, so that I know exactly which rule — in the wording
    that was judged — I am reviewing.
11. As an analyst, I want Opinions grouped by the Requirement's type in the
    UI, so that I work through the analysis the way the PGE's categories are
    organised.
12. As an analyst, I want to record my own status and comment on any Opinion,
    so that my decision is captured when I disagree with the AI.
13. As an analyst, I want agreeing with the AI to cost one click (Verify) and
    not a rewrite of its verdict, so that reviewing 200 requirements is not
    200 redundant form submissions.
14. As an analyst, I want to review and verify a requirement the AI failed to
    process, judging it manually from the document, so that a stubborn
    failure never blocks my work.
15. As an analyst, I want to mark each Opinion as Verified, so that I can
    track my progress through the analysis.
16. As an analyst, I want to un-verify or change my review while the analysis
    is open, so that I can correct myself before signing off.
17. As an analyst, I want to conclude the analysis as an explicit action, so
    that finishing is my deliberate sign-off and never an accident of
    checking the last checkbox.
18. As an analyst, I want the conclusion refused with a clear message when
    Opinions are still unverified, so that I know exactly what is left.
19. As an analyst, I want a concluded analysis to be frozen, so that
    "concluded" is a fact I can rely on and not a mood.
20. As an analyst, I want to see which requirements failed, why, and after
    how many attempts, so that I can decide between retrying and judging them
    manually.
21. As an analyst, I want one action that retries everything still failed and
    unverified, so that completing a partial analysis is a button and not a
    checklist.
22. As an analyst, I want a retry to never re-run requirements that already
    have a verdict — the AI's or mine — so that reviewed work is never
    overwritten and LLM cost is never re-paid (D8).
23. As an analyst, I want to see the analysis screen lock while a retry is in
    flight and unlock when it finishes, so that I never race the machine.
24. As an analyst, I want to keep reading the already-produced verdicts while
    a retry runs, so that waiting doesn't hide my work.
25. As an analyst, I want my Processes' Opinions to be invisible and immutable
    to other analysts, so that per-analyst isolation holds on every new
    surface.
26. As an Admin, I want retiring a Requirement to leave running and past
    analyses untouched — including their retries — so that Catalog
    housekeeping never corrupts in-flight work.
27. As a frontend developer, I want every new endpoint in the committed
    OpenAPI document with typed errors and explicit operation ids, so that I
    can extend the generated client without probing the API.
28. As a frontend developer, I want the Effective-verdict rule
    (`review ?? ai`) stated in the contract, so that I render the deciding
    status without inventing my own precedence.
29. As a frontend developer, I want mutation attempts in the wrong state to
    answer a consistent 409, so that I can drive the screen's locking from
    the API's answers.
30. As a product owner, I want tacit agreement distinguishable from an active
    human decision in the data, so that "how often was the AI accepted
    as-is?" is a query, not a guess.
31. As an auditor, I want AI-produced fields write-once and human decisions
    in separate fields, so that the audit trail survives every review and
    retry (AGENTS invariant).

## Implementation Decisions

### The module and its boundary

- A new **Opinion module** — controller(s), service, repository — owning every
  write to the `opinion` table. Sibling of Process and Requirement, same
  anatomy (ADR-0002): outbound dependencies declared as ports next to their
  injection symbols; the service never sees Prisma.
- The **Process module exports a narrow completion surface**, consumed by the
  Opinion module through ports: *verify the presented job token against a
  Process*, *complete processing (within a caller-supplied transaction)*, and
  *re-enqueue for retry*. The Opinion module never sees the process
  repository, the queue internals, or token cryptography; the Process module
  never writes an Opinion. This direction (Opinion → Process, never both
  ways) is deliberate: the token is minted by claim and stored on the process
  row, so token logic stays in the Process module, and no circular module
  dependency exists.
- **One documented exception** to table ownership: the queue adapter's claim
  operation performs a **read-only** query over `opinion` rows to compose the
  job payload (see *Retry through the queue* below). Job content is queue
  state, and the queue adapter is already the single blessed place for queue
  predicates (AGENTS). No Nest-module import is involved — the provider graph
  stays acyclic.
- **No schema migration.** The `opinion` table, its enums, the
  `UNIQUE(process_id, requirement_id)` constraint and the delete cascade
  already exist.

### Write-back (slice 4)

- **One internal endpoint**, `POST /internal/jobs/:processId/results`,
  declared outside the global prefix like claim (ADR-0003), tagged
  `internal` in the OpenAPI document. The job token travels in an
  `X-Job-Token` header — credential, not payload.
- **The body carries exactly one of two reports**, mutually exclusive
  (both present or both absent → 400):
  - `results` — one item per Requirement handed at claim, each carrying
    `requirementId` and either a verdict (`aiStatus`, `aiComment`,
    optional `evidence` — nullable because a non-compliance by absence has
    no page) or that requirement's failure (`errorDetail`).
  - `error` — the process-level failure: the run broke before producing
    anything; carries the detail persisted on the process row.
- **Coverage is a contract obligation, not a server check:** the worker must
  report every Requirement received at claim exactly once — a requirement it
  could not judge is a failure item, never an omission. The server validates
  what it can see: duplicated `requirementId` in the batch → 400; unknown
  `requirementId` → 400; the whole batch is rejected (all-or-nothing).
  Verifying coverage against the claim-time snapshot is **not possible in the
  MVP** (the snapshot is not persisted, and comparing against the current
  Catalog would judge the batch against rules the worker never received) —
  an accepted, documented risk. Re-evaluation trigger: omission observed in
  practice → persist the claim snapshot (additive).
- **Opinions are born here** — succeeded and failed alike, via upsert on
  `UNIQUE(process_id, requirement_id)` (D4 idempotency): insert on first run,
  update of the re-dispatched rows on a retry write-back. A failure item
  writes `aiProcessingStatus = failed` + `errorDetail` and **no verdict**;
  a verdict item writes `aiProcessingStatus = ok` + the `ai*` fields and
  clears `errorDetail`.
- **One transaction** persists the batch, flips the aggregate, and nulls the
  token hash (single-use, D6). Nothing is observable half-applied.
- **The aggregate is derived by this API, never declared by the worker** —
  from the Process's **entire resulting Opinion set**, not the batch alone
  (a retry batch covers only the re-dispatched subset): zero Opinions →
  `error`; any `failed` or `pending` remaining → `partially_processed`; all
  `ok` → `processed`.
- **A process-level `error` report against a Process that already has
  Opinions** (a retry run that broke pre-verdict) must not hide existing
  verdicts behind D7's `error` ("nothing useful to show"). Rule: the report
  stores its detail on the process row and marks the run's in-flight
  (`pending`) Opinions `failed` with that same detail; the aggregate then
  derives as above — landing on `partially_processed`, existing verdicts
  intact, the failed remainder still retryable. On a first run (zero
  Opinions) the same rule derives to `error`, matching D7 exactly.
- **Rejections:** absent/mismatched token → 401 (covers the
  deleted-mid-flight process: its row and hash are gone — spec 001 §5's
  "reject a vanished process cleanly"); Process not in `processing` → 409
  (covers replay after success, since the token is also burned); malformed
  batch → 400. Never a 500 for a well-formed but stale delivery.
- The endpoint accepts a **generous request-body size limit** (a ~200-item
  batch with commentary; carried from spec 001 §10).

### Reading Opinions (slice 5)

- `GET /processes/:id/opinions` (under the global prefix, `IdentityGuard`,
  ownership in the service layer as always): **all** of the Process's
  Opinions, no pagination — the analysis screen needs the whole set to draw
  the type groups; ~200 rows is the payload ceiling by construction. Ordered
  by `requirementId` (stable). Readable in **any** processing state — reads
  never lock; an empty array before the first write-back is the truthful
  answer.
- Each item embeds its **Requirement** (`id`, `code`, `type`, `text`,
  `legalReference`, `active`) — embedded, not referenced, because a retired
  Requirement must keep rendering inside the analyses that judged it
  (ADR-0004), and the Catalog listing would not contain it.
- Item shape: the requirement, `aiProcessingStatus`, `attempts`,
  `errorDetail`, `aiStatus`, `aiComment`, `evidence`, `reviewStatus`,
  `reviewComment`, `verified`, timestamps. Response classes with explicit
  `@ApiProperty` per spec 002's allowlist discipline.
- Ownership posture inherited from spec 001 §4: someone else's Process or a
  nonexistent one → 404, both cases, on every route in this spec.

### Review & Verified (slice 5)

- `PATCH /processes/:processId/opinions/:opinionId` — partial body:
  `reviewStatus?`, `reviewComment?`, `verified?`. Explicit `null` clears a
  review field (returning that Opinion to tacit agreement). **These three
  fields are the entire analyst-writable surface** of an Opinion; `ai*`
  fields, `evidence`, `attempts`, `errorDetail` have no analyst write path
  ever (AGENTS: AI output is write-once).
- **A Review never requires the AI's suggestion.** A failed Opinion (no
  `aiStatus`) can be reviewed and verified — the analyst judges the
  requirement manually. The AI suggests; the human decides.
- **Effective verdict** = `reviewStatus ?? aiStatus`, derived, never stored,
  stated in the OpenAPI descriptions. Agreement is tacit: verifying without
  writing a review means the suggestion stood. The frontend must never copy
  the AI's value into the review fields — that would flatten the
  accepted-as-is vs. actively-decided distinction (audit data, story 30).
- **Invariant:** no Opinion may be `verified` without an Effective verdict. A
  PATCH whose outcome would violate it — verifying a verdict-less Opinion, or
  clearing the review that was a failed Opinion's only verdict while it is
  verified — → 400 with a message naming the rule.
- **Mutation gate:** analyst writes (review PATCH, finish, retry) are
  accepted only while the machine is quiet — `processingStatus` in
  `processed | partially_processed` — and, for review/retry, only while the
  analysis is not concluded. Everything else → 409. One simple rule instead
  of a clever one: during a retry run the untouched Opinions are technically
  safe to review, but the simple rule costs minutes of waiting and saves the
  frontend from knowing which rows a job will touch.

### Conclusion (slice 5)

- `POST /processes/:id/finish` — the explicit human act (never a side effect
  of the last verify). Preconditions, violation → 409 with a message stating
  what is missing: machine quiet, at least one Opinion, **every** Opinion
  verified, not already concluded. Sets `finishedAt`; returns the process
  detail shape.
- A concluded analysis is **frozen**: review PATCH, finish and retry → 409.
  Reopening (clearing `finishedAt`) is deferred; additive when product asks.
- The two clocks stay orthogonal (D7): `partially_processed` +
  `finishedAt` set is a legitimate terminal combination — the machine never
  succeeded on some requirements, the human decided them manually and signed
  off. A concluded Process never needs to reach `processed`.

### Retry (slice 6)

- `POST /processes/:id/retry` → 202 (it is an enqueue, same semantics as
  registration). Preconditions (else 409): owner's, `partially_processed`,
  not concluded, at least one eligible Opinion.
- **Eligible set:** Opinions with `aiProcessingStatus` in `failed | pending`
  **and `verified = false`** — the whole set at once, one act, one job, no
  per-requirement selection (the LLM cost is per failed requirement either
  way). `pending` is included as self-healing for a coverage-violating
  worker that left rows stranded. A manually verified failure is **excluded
  forever**: it has a verdict — a human one — and D8 forbids reprocessing
  verdicts. Consequence, accepted: such a Process never reaches `processed`
  (see Conclusion above).
- **A Requirement's retirement does not exclude its Opinion from retry**: the
  analysis's requirement set was fixed at claim; retirement governs *new*
  analyses only (Catalog semantics, ADR-0004).
- **Dispatch mechanics:** the retry flips eligible Opinions to `pending`
  (their `errorDetail` kept until the next write-back overwrites it),
  increments their `attempts` (dispatch-time: `attempts` counts dispatches
  that included this Opinion), and re-enqueues the Process
  (`partially_processed → pending`) through the exported Process surface.
  D8's "new token per dispatch" needs no extra step: claim already mints a
  fresh token when it hands out the job (spec 001 §14.1); the burned one was
  nulled by the previous write-back.

### Retry through the queue

- The claim payload gains two faces behind one shape — the worker never
  knows which it got: a Process with **no** Opinions (first run) carries the
  full active Catalog, as today; a Process **with** Opinions carries only
  the Requirements of its `pending` Opinions. Composed by the queue
  adapter's read-only query over `opinion` (the documented ownership
  exception above). The rejected alternative — duplicating the retry set
  into a column on the process row for the claim to read — is derived state
  with drift risk, exactly what D7 told us to avoid.

### Contract & configuration

- Operation ids: `listProcessOpinions`, `reviewOpinion`, `finishProcess`,
  `retryProcess`, `submitJobResults`. OpenAPI regenerated and committed; the
  existing drift test covers the new surface for free.
- Wire enums follow the existing mapped lowercase values
  (`compliant | non_compliant | not_applicable`; `pending | ok | failed`).
- Any new limits (write-back body size) arrive as environment configuration
  validated at startup, like everything else.

## Testing Decisions

A good test asserts what a client observes — status codes, response bodies,
the state another request can read afterwards — never how the module is wired
inside.

- **The seam is the existing one and only one:** `createTestApp()` booting the
  real `AppModule` with production pipes/filters against a real Postgres. The
  AI worker is **simulated over HTTP** — a claim call followed by a
  write-back call — so the entire machine cycle (claim → write-back → retry →
  claim → write-back) runs at the same boundary the real worker uses. No new
  seams.
- Unit tests for the Opinion service against its ports (prior art: the
  process service's spec), covering the aggregate derivation and the
  eligibility/guard rules; ≥ 80% coverage on services and guards (AGENTS).
- Prior art for style: the isolation and unique-constraint e2e specs (the two
  AGENTS invariants at the HTTP boundary), and the claim e2e spec for
  queue-cycle tests.
- **Invariants that must have e2e coverage:**
  1. **Per-analyst isolation on every new route** — another analyst's
     Process answers 404 for opinions list, review PATCH, finish and retry
     (AGENTS invariant #1 extended to the new surface).
  2. **One verdict per requirement per analysis** — the write-back upsert
     never duplicates; the unique constraint surfaces as a 4xx, never a 500
     (AGENTS invariant #2, now exercised through its real caller).
  3. **Single-use token** — a second write-back with the same token → 401;
     a write-back with a foreign or absent token → 401; after a mid-flight
     delete → 401.
  4. **Write-back atomicity** — a batch with one unknown `requirementId`
     persists nothing and leaves the Process in `processing`.
  5. **AI fields are write-once** — no review PATCH payload can alter
     `ai*`/`evidence`/`attempts` (whitelist rejection), and a retry
     write-back leaves untouched `ok` Opinions byte-identical.
  6. **Aggregate derivation** — all-ok → `processed`; mixed →
     `partially_processed`; process-level error on first run → `error`; on a
     retry run → `partially_processed` with prior verdicts intact.
  7. **Mutation gate & freeze** — review/finish/retry answer 409 in
     `pending`/`processing` and after conclusion; reads answer 200
     throughout.
  8. **Verified requires an Effective verdict** — verifying a failed,
     unreviewed Opinion → 400; after a manual review → 200.
  9. **Retry eligibility** — re-dispatches failed-and-unverified only;
     excludes verified failures; includes retired Requirements; the retry
     claim payload carries exactly the re-dispatched subset; `attempts`
     increments on dispatch.
- Every bug fix ships a regression test.

## Out of Scope

- **Reopening a concluded analysis** — deferred; additive (clear
  `finishedAt`) when product decides.
- **Per-requirement selective retry** — the retry re-dispatches the whole
  eligible set; a picker UI would change nothing about cost.
- **Persisting the claim-time Catalog snapshot** — accepted risk (coverage
  is a worker obligation); trigger: omission observed in practice.
- **Process-level retry** — unchanged from spec 001 §5: `error` recovers by
  delete + recreate.
- **Attempt history** — `attempts` keeps frequency only; intermediate errors
  are overwritten in place (D8, eyes-open deferral).
- **Report/export of a concluded analysis** — design §4's deferred product
  decision.
- **Pagination of the opinions list** — bounded by the Catalog size by
  construction.
- **Push/webhook notification of job completion** — the frontend polls the
  process detail (spec 001 §4); the worker polls claim (ADR-0001).
- **The AI microservice itself** — this spec fixes the persistence side of
  its contract (claim payload faces + write-back); the service is the next
  project.

## Further Notes

- **One rule resolved while writing this spec** (not explicitly grilled,
  follows from D7/D8): the process-level `error` report on a retry run —
  ruled above as "mark in-flight rows failed, derive, land on
  `partially_processed`" — exists so a broken retry can never hide verdicts
  that D7's `error` state promises don't exist. If this reading is wrong, the
  write-back section is the only place to amend.
- The Effective-verdict precedence (`review ?? ai`) is consumer-facing
  knowledge; it must appear in the OpenAPI field descriptions, not only
  here.
- `CONTEXT.md` gained the terms this spec leans on (Review, Verified,
  Effective verdict, Conclusion, Retry, Write-back) during the grilling
  session; the spec deliberately reuses them instead of redefining.
- Spec 001 §7's claim-payload field list (`tab`, `section`) predates spec
  003's amendment of the Requirement shape; the catalog entries carry
  `type`/`legalReference` since then. The retry face added here changes the
  *selection* of requirements, never their shape.
