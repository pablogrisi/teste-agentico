# Spec 001 — Process module

**Status:** draft · **Depends on design decisions:** D1, D2, D3, D5, D6, D7 ·
**Related:** [ADR-0001](../../adr/0001-pull-based-queue-consumption.md) ·
[ADR-0002](../../adr/0002-module-ports.md)

> **Amended during implementation.** Four clauses below were found to be
> unimplementable as written or in conflict with `docs/design.md`. See §14.

## 1. Purpose & scope

The Process module owns the `process` row end-to-end: registration (NUP +
contract object + PDF upload), listing and detail reads with per-analyst
ownership, the asynchronous analysis trigger (`202` + enqueue + job-token
emission), and the processing **state machine**. It is the NestJS feature
module `src/modules/process/`.

This is **Scope A**: the module stops at the boundary of the `opinion` table.
It merges design slices **1** (cadastro/listagem) and **3** (enfileiramento/
máquina de estados).

**In scope**

- `POST /processes` — create + enqueue (multipart).
- `GET /processes` — list own processes (paged).
- `GET /processes/:id` — detail of own process (also the status-poll).
- `DELETE /processes/:id` — delete own process (any state).
- `POST /internal/jobs/claim` — pull the next `pending` job (service→service).
- The state machine: `pending → processing` (claim) and the terminal
  transition **method** `processing → processed | partially_processed | error`.

**Out of scope (sibling modules / later slices)**

- The write-back HTTP endpoint that persists opinions and *invokes* the
  terminal transition — **slice 4, Opinion module**.
- Reading/editing opinions, `verified` checkbox, human conclusion
  (`finishedAt`) — **slice 5, Opinion/analysis screen**.
- Granular per-opinion retry — **slice 6, Opinion module**.
- Requirement catalog seed/management — **slice 2, Requirement module**
  (this module only *reads* the catalog to build the claim payload).
- No `PATCH`/edit endpoint. No report/export.

## 2. Data model

Uses the existing scaffolded `Process` model (`prisma/schema.prisma`). No new
columns and **no migration** required by this spec.

Field semantics fixed by this spec:

| Field | Meaning |
|---|---|
| `processingStatus` | The **job clock** — `pending → processing → processed \| partially_processed \| error`. Driven by this module. |
| `startedAt` (NOT NULL) | The **human-analysis clock, start** — the moment the analyst *initiates* the analysis, i.e. process creation. Set once, at create. |
| `finishedAt` (nullable) | The **human-analysis clock, end** — D7's `concluida_em`, set in **slice 5** when all opinions are `verified`. This module never writes it. |
| `createdAt` | Row-insert bookkeeping. |
| `jobToken` | **SHA-256 hash** of the per-job token (see §6). Nulled on write-back success. |
| `errorDetail` | Process-level failure reason (segmentation failed pre-opinion). Set by the terminal transition to `error`. |
| `fileUrl` | MinIO object **key** (not a public URL). |

The two clocks (`processingStatus` vs `finishedAt`) are **never collapsed**
(D7). Processing sub-moments (claim, completion) are intentionally **not**
timestamped in the MVP; `processingStatus` + `updatedAt` suffice. Adding
nullable `claimedAt`/`processedAt` later is additive.

## 3. Create + enqueue — `POST /processes`

Registration **is** enqueue; there is no draft state. Single multipart request.

**Request:** multipart form — `nup` (string), `contractObject` (string), and
exactly one `file` (the PDF).

**Validation (400 on failure):**

- `nup`: required, trimmed, non-empty, `≤ 40` chars. **Not** unique (see §9),
  no format mask.
- `contractObject`: required, trimmed, non-empty.
- `file`: exactly one, `Content-Type: application/pdf`, size `≤ MAX_FILE_SIZE`
  (§10). No page-count check — page counting borders on "reading the
  document," which is the AI service's job.

**Behaviour (in order):**

1. Persist the `process` row: `userId` from `X-User-Id`, `processingStatus =
   pending`, `startedAt = now`, `fileUrl` provisional.
2. Upload the PDF to MinIO under key `processes/{userId}/{uuid}.pdf`; set
   `fileUrl` to that key.
3. Mint the job token (§6) and store its hash.
4. If the upload fails, the whole request fails and no dangling `pending` row
   is left (transaction / compensating cleanup).

**Response:** `202 Accepted` with the created resource — `id`, `nup`,
`contractObject`, `processingStatus`, `startedAt`, `createdAt`. **Never**
`jobToken`, **never** raw `fileUrl`. `202` (not `201`) because the meaningful
event is that asynchronous work has been accepted.

## 4. Reads

### `GET /processes` (list, own)

- Ownership: filtered by `userId` in the **service layer**.
- Pagination: offset — `?page` (default 1), `?pageSize` (default 20, max 100).
  Response `{ data, total, page, pageSize }`.
- Ordering: `created_at DESC` (fixed).
- Filtering: `?status=` (one or more `processingStatus` values). No free-text
  NUP/object search in the MVP.
- Item shape: summary — `id`, `nup`, `contractObject`, `processingStatus`,
  `startedAt`, `finishedAt`, `createdAt`.

### `GET /processes/:id` (detail, own — doubles as status poll)

- Returns process fields only, **not** opinions (opinions are read via the
  sibling Opinion module's `GET /processes/:id/opinions`; the analysis screen
  composes the two).
- Carries `processingStatus` and, when `error`, `errorDetail`. The frontend
  polls this endpoint while `processing`.

### Ownership posture

For `GET`/`DELETE /processes/:id`, an id belonging to **another analyst** or
that **does not exist** returns **`404` in both cases** — never `403` (a `403`
would leak existence). Implemented as `WHERE id = :id AND user_id = :userId`
→ empty → `404`. Enforced in the **service layer**, always (AGENTS invariant).

## 5. Delete — `DELETE /processes/:id`

- Own only; **allowed in any state**, including `processing`.
- Hard delete: the `process` row, its opinions (cascade), and the MinIO object.
- Rationale & recovery model: with no `PATCH` and **no automatic stuck-job
  recovery**, `delete + recreate` is the *only* correction path and the manual
  recovery path for a job stranded in `processing` (crash) or ended in `error`
  (nothing to retry granularly). A late write-back for a deleted process is
  harmless: it fails token/row validation and is rejected — a note carried to
  slice 4 (write-back must reject a vanished/mismatched process cleanly,
  never a 500).
- **Recovery matrix:** `processing`-stuck → delete+recreate · `error` →
  delete+recreate · `partially_processed` → granular opinion retry (slice 6) ·
  `processed` → nothing. **There is no process-level retry** (D8).

## 6. Job token

- **Minted at create/enqueue** (create == enqueue). **Never** returned to the
  analyst — a service secret, handed out only in the claim payload (§7).
- **Format:** 256-bit CSPRNG value, `crypto.randomBytes(32).toString('hex')`.
- **Storage:** `job_token` stores `sha256(token)`. A plain fast hash is correct
  because the token is high-entropy — no salt, no bcrypt/argon (those defend
  low-entropy passwords, of which this is not one). Protects against a DB dump.
- **Single-use invalidation:** on successful write-back (slice 4), set
  `job_token = NULL` in the same transaction as the terminal status write. A
  write-back whose `sha256(presented)` ≠ stored hash, or against a process not
  in `processing`, is rejected. (Regeneration on retry is slice 6.)

## 7. Queue & claim — `POST /internal/jobs/claim`

Pull-based consumption (ADR-0001). FastAPI polls; NestJS performs all DML.

- **Selection:** oldest eligible process, atomically —
  `SELECT … FOR UPDATE SKIP LOCKED` over `processingStatus = 'pending'`,
  `ORDER BY created_at ASC LIMIT 1`. `SKIP LOCKED` is used even though the MVP
  runs a single worker (free correctness for future concurrency).
- **Transition:** `pending → processing`. (Processing sub-timestamps not
  stored — §2.)
- **Payload returned:** `processId`, a freshly-minted **presigned MinIO URL**
  for the PDF (time-boxed; not stored), the **plaintext job token**, and the
  **full requirement list** (each entry: `requirementId`, `text`, `tab`,
  `section`). ~200 requirements ≈ a few hundred KB of JSON — fine.
  - The requirement list is assembled by calling a **Requirement module
    service method** (e.g. `requirementService.getCatalog()`), an in-process
    read dependency — this module does not touch the `requirement` table
    directly.
- **Empty queue:** `204 No Content`.
- **No automatic stuck-job recovery** (ADR-0001): the claim query does **not**
  reclaim rows stuck in `processing`. A visibility-timeout reclaim can't tell
  "crashed" from "still grinding a large PDF" and would risk re-firing LLM
  calls (token waste). Stranded jobs are recovered via delete+recreate (§5).
- **Auth:** **network-topology trust only** — internal endpoint, never exposed
  by the gateway. The per-job token can't guard `claim` (claim is how FastAPI
  *learns* the token). Rests file-URL + token disclosure on the internal
  network being unreachable from outside (same assumption as D5/D6).

## 8. State machine

Owned entirely by this module.

- `pending` — set at create (§3). Eligible for claim.
- `pending → processing` — the claim transition (§7). Fully owned & tested here.
- `processing → processed | partially_processed | error` — the **terminal
  transition method** (e.g. `ProcessService.completeProcessing(tx, processId,
  outcome, errorDetail?)`). Sets the aggregate status and nulls `job_token`.
  - The **aggregate is stored, not derived** (D7): safe because there is a
    single atomic write point.
  - The method **accepts a Prisma transaction client** so slice 4's write-back
    can upsert ~200 opinions **and** flip the aggregate status in **one
    transaction** (D7 atomicity). This spec builds and unit-tests the method;
    slice 4 wires the HTTP write-back that invokes it.
  - Outcome mapping (computed by the caller from the write-back batch): all
    requirements `ok` → `processed`; some `failed` → `partially_processed`;
    segmentation failed before any opinion → `error` (with `errorDetail`).

## 9. NUP uniqueness (deferred constraint)

NUP is **not** constrained unique in the MVP, though conceptually it should be.
When added later: (1) decide scope — global (NUP identifies one procurement
process) vs per-analyst; the leaning is **global** but it is genuinely open;
(2) adding the unique index requires **deduping existing rows first** — not a
free migration once duplicates exist. Eyes-open deferral.

## 10. Configuration (validated at startup)

No hardcoded secrets; all from env, validated at boot (AGENTS). At least:

- `MAX_FILE_SIZE` — max PDF bytes.
- `MINIO_*` — endpoint, bucket, credentials (per `executora` pattern).
- Presigned-URL TTL for the claim payload.
- DB connection.

The internal write-back endpoint (slice 4) must set a **generous request-body
size limit** to accept a ~200-item batch — noted here as it derives from this
module's payload sizing.

## 11. Authentication summary

- **User-facing endpoints** (`/processes*`): `IdentityGuard` reads
  `X-User-Id`/`X-User-Email`/`X-User-Role` injected by the Traefik forward-auth
  (per `executora`); identity exposed via a `@User()` param decorator. No JWT
  validation here (D5). Authorization is **ownership** by `userId`; role does
  not gate routes (single analyst profile).
- **Internal endpoint** (`/internal/jobs/claim`): network-topology trust, no
  gateway, no user identity (§7).

## 12. Testing (AGENTS thresholds)

- ≥ 80% coverage on `services` and `guards`.
- Mandatory e2e regardless of totals:
  1. **Per-analyst isolation** — no endpoint returns/mutates another user's
     process (list, detail, delete all filtered by `userId`; cross-user access
     → `404`).
  2. **One verdict per requirement per analysis** — the
     `UNIQUE(process_id, requirement_id)` surfaces as `409`, never `500`
     (exercised via the transition/upsert seam; full coverage in slice 4).
- Additional coverage: create validation (bad mimetype/size/empty fields →
  `400`), `202` shape excludes `jobToken`/`fileUrl`, claim atomicity
  (`SKIP LOCKED`, `pending → processing`, `204` on empty), delete-in-`processing`
  allowed, token hashed-at-rest and single-use.
- Every bug fix ships a regression test.

## 13. Open items / handoffs to later slices

- **Slice 4 (write-back):** invokes `completeProcessing` in one transaction
  with opinion upserts; validates the job token (hash compare + row in
  `processing`); rejects vanished/mismatched processes cleanly; sets generous
  body-size limit.
- **Slice 5 (analysis screen):** sets `finishedAt` (`concluida_em`) on human
  conclusion; reads opinions.
- **Slice 6 (retry):** regenerates the job token per re-dispatch.

## 14. Amendments (recorded during implementation)

### 14.1 The job token is minted at **claim**, not at create (supersedes §6)

§6 said the token is minted at create and stored as `sha256(token)`; §7 said the
claim response returns the **plaintext**. Both cannot hold — if only the hash is
persisted at create, the plaintext is unrecoverable by claim time, and storing
plaintext was explicitly rejected.

`POST /processes` therefore leaves `job_token` NULL. The claim operation mints a
fresh 256-bit token and writes `sha256(token)` in the *same atomic statement*
that flips `pending → processing`, returning the plaintext in the response — the
one moment it exists.

This is also more faithful to D6, which says the token is generated *"no momento
do enfileiramento"* and handed to FastAPI *"junto do payload"*. Under ADR-0001's
pull model those are the same moment: claim. A `pending` process that is never
claimed correctly has no token at all.

### 14.2 Queue access goes through a port (refines §7)

Design D3 holds an inviolable principle §7 did not mention: *"todo acesso passa
pela abstração de enfileiramento"*. The `FOR UPDATE SKIP LOCKED` statement lives
behind `ProcessQueuePort` (`process.port.ts`), implemented by
`PostgresProcessQueue`. That adapter is the only place in the codebase that
treats `processing_status` as a queue predicate. See [ADR-0002](../../adr/0002-module-ports.md).

### 14.3 A baseline migration **is** required (corrects §2)

§2's "no migration required" meant "no new columns". But `prisma/migrations/`
did not exist — the schema had never been migrated. The baseline migration also
carries two corrections the spec's behaviour depends on:

- `Opinion.process` gains `onDelete: Cascade`. Prisma defaults to `Restrict`, so
  §5's "hard delete: the process row, its opinions (cascade)" would otherwise
  raise a foreign-key violation.
- `Process.startedAt` and the `createdAt` columns gain `@default(now())`.

(Separately, all `id` columns moved from `BigInt` to `Int` before implementation.)

### 14.4 The PDF is uploaded **before** the row is inserted (supersedes §3)

§3 ordered it insert → upload → backfill `fileUrl`. That opens a race: the row is
`pending` and therefore claimable the instant it is inserted, so a claim landing
between insert and upload hands FastAPI a presigned URL for an object that does
not exist yet.

Upload to `processes/{userId}/{uuid}.pdf` first, then insert with the final
`fileUrl`. A failed upload leaves no row — which is what §3 actually requires
("no dangling `pending` row"). A failed insert triggers a compensating object
delete.

### 14.5 An oversized upload is `413`, not `400` (refines §3)

§3 asked for `400` on every rejected upload. NestJS's `FileInterceptor` already
converts multer failures into HTTP exceptions: `LIMIT_FILE_SIZE` becomes
`413 Payload Too Large`, and every other multer error becomes `400`. `413` is
the correct status for a body that exceeds the server's limit, so the framework
behaviour is kept rather than overridden.

Bad mimetype, blank `nup`, blank `contractObject`, over-long `nup`, and a
missing file all remain `400`.
