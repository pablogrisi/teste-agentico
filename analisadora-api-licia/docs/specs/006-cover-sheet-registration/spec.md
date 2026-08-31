# Spec 006 — Registration reads the Cover Sheet

**Status:** draft · **Depends on:** [spec 001](../001-process-module/spec.md)
(the process module, registration, ownership),
[spec 002](../002-public-api-contract/spec.md) (the published contract) ·
**Related:** `CONTEXT.md` (*Cover Sheet*, *NUP*, *Contract object*,
*Requesting unit*, *Conclusion*), `docs/design.md` D1/D2/D3,
[ADR-0003](../../adr/0003-public-and-internal-surfaces.md),
ms-analisadora spec 006 and its ADR-0003

## Problem Statement

Registration asks the analyst to type the NUP and the contract object into a
form, then attach the PDF those values were read from. The transcription is the
weakest step in the flow: a NUP is eighteen punctuation-heavy characters
(`24001.028501/2025-75`), the service validates no format (spec 001 §9), and
nothing downstream can tell a typo from a real identifier.

The document states both. It also states a third thing the registry does not
record at all and the Central de Licitação cares about — which unit opened the
process. Every one of the ten annotated procurement PDFs carries them on page 1,
in the SUITE's own generated Cover Sheet, in a form identical across processes.

The registry cannot read it. This API holds no PDF pipeline and no model, and by
design D1 must not acquire either.

## Solution

Registration takes only the Document. The three fields are read from its Cover
Sheet by the AI service and persisted as read.

1. **The form loses its text fields.** `POST /processes` becomes a single-file
   upload. Nothing is typed.
2. **The API asks the AI service, synchronously, before it stores anything.**
   The PDF's bytes go out, three fields come back — or one failure.
3. **A failed reading fails the registration.** Nothing is written: no object,
   no row, no queue entry. The analyst uploads again, or has no Process.
4. **The reading is authoritative, and correctable.** A new `PATCH` lets the
   analyst fix any of the three fields afterwards, in every state but a
   concluded one.
5. **The registry grows a column.** `requesting_unit` joins `nup` and
   `contract_object`.

Everything about the analysis is unchanged. Registration still answers `202`,
still enqueues, and the AI worker still claims and writes back exactly as
before — the Claim payload does not carry these fields and never did.

## User Stories

1. As an analyst, I want to register a Process by choosing a file and nothing
   else, so that registration is an upload rather than a form.
2. As an analyst, I want the stored NUP to be the document's NUP, so that a
   process can be found by the identifier the PGE actually uses.
3. As an analyst, I want the requesting unit recorded, so that I can tell two
   processes of the same category apart.
4. As an analyst, I want a registration whose Cover Sheet could not be read to
   fail immediately and say so, so that I never find a blank NUP days later.
5. As an analyst, I want a failed registration to leave nothing behind, so that
   I do not have to hunt for and delete a half-made Process.
6. As an analyst, I want to correct a misread field, so that one bad reading
   does not force me to delete a Process and re-upload 40 MB.
7. As an analyst, I want to correct a field while the analysis is still running,
   so that a wrong NUP is not frozen for the minutes the machine takes.
8. As an analyst, I want a concluded analysis to be uncorrectable, so that what
   I signed off on is what stays recorded.
9. As an analyst, I want to correct one field without resending the other two,
   so that fixing a typo cannot blank a field I did not touch.
10. As an analyst, I want the correction never to disturb the analysis, so that
    fixing a label does not re-run or invalidate work.
11. As an analyst, I want my Processes listed with their requesting unit, so
    that the list is readable without opening each one.
12. As an analyst, I want to be unable to edit another analyst's Process, so
    that ownership means the same thing for writes as it does for reads.
13. As a frontend developer, I want the published contract to state the new
    request and response shapes, so that the client is generated and not
    guessed.
14. As a frontend developer, I want the failure to be one documented status with
    one code, so that I render one message and not a taxonomy.
15. As an operator, I want the AI service's address to be validated at startup,
    so that a mis-provisioned deployment fails at boot rather than on an
    analyst's first upload.
16. As an operator, I want an unreachable AI service to fail registration
    cleanly, so that a dependency incident is visible instead of silent.
17. As a maintainer, I want the AI service behind a port like every other
    outbound dependency, so that the tests that cover registration do not need
    a live FastAPI.
18. As a maintainer, I want this service to remain ignorant of PDFs, so that
    design D1's boundary holds.

## Implementation Decisions

### The order of operations changes, and the rollback path disappears

Registration is today: upload the object, insert the row, enqueue. The upload
comes first deliberately — the reverse would publish a claimable `pending` row
whose object does not exist, and a claim landing in that window would hand the
AI service a presigned URL pointing at nothing. The cost is a compensating
delete when the insert fails.

It becomes: **read the Cover Sheet, upload the object, insert the row, enqueue.**

The reading goes first because it is the step most likely to fail and the only
one that can fail without having written anything. When it fails, nothing has
been created anywhere — no object to delete, no row to roll back, no
compensating path to get wrong. The existing quiet-delete on insert failure stays
for the case it was written for.

### The PDF travels as bytes, not as a presigned URL

The API posts the multipart bytes it already holds in memory. Handing over a
presigned URL — the shape `claim` uses — was rejected because it forces the
object to be stored *before* the service knows the registration can succeed,
which puts the compensating delete straight back.

### The AI service is a port

An outbound dependency gets an injected port and a concrete adapter bound once,
like storage. This keeps registration testable without a live FastAPI, and keeps
the HTTP client out of the service layer.

Its base URL is a new validated environment variable. It is this service's
**first** reference to the AI service: until now the arrow pointed only inward,
and the API had no variable naming the worker at all. It cannot be expressed as
a compose `depends_on` — the AI service already declares one on this API, and the
reverse edge is a cycle. The dependency is at request time, so an unreachable
service is a failed reading, not a failed boot.

### The request DTO loses two fields and gains nothing

`CreateProcessDto` keeps only the documentation-only `file` property. `nup` and
`contractObject` are removed from the request entirely — not made optional. A
client that still sends them is rejected by the existing global
`forbidNonWhitelisted`, which is the correct answer: a caller that supplies a
NUP is a caller working from the old contract, and silently ignoring it would
store a document whose stated NUP disagrees with the stored one.

### The response gains a field; the allowlist still governs

`ProcessSummary` and `ProcessDetail` gain `requestingUnit`. They remain classes
rather than interfaces so the published schema and the response allowlist cannot
drift apart without `tsc` objecting — the mechanism that keeps `jobToken` and
`fileUrl` out of analyst-facing responses (spec 001 §3) is unchanged and now
covers one more field.

### `contractObject` keeps its name, knowingly

The field receives the Cover Sheet's *Assunto*: the SUITE's three-level
classification of the purchase, not a description of what is bought. The name is
kept because it is the team's current vocabulary, and the mismatch is recorded in
`CONTEXT.md` rather than hidden. Four of ten observed processes carry the
identical value, so it does not distinguish purchases and should not be relied on
to.

### `requestingUnit` is one column holding two lines

The Cover Sheet's *Órgão/Unidade de abertura* is always the agency followed by
the unit beneath it. They are stored joined by a newline, in one text column.
Two columns were considered and rejected: all ten observed processes name the
same agency, so splitting would be structure invented from a single-valued
sample. Splitting later is additive.

Two neighbouring Cover Sheet fields are deliberately not stored — *Unidade
atual*, which is where the process sits now and is usually the PGE itself, and
*Interessado*, the same opening unit abbreviated.

### The NUP is still not validated

Spec 001 §9's deferral stands and now covers a machine's reading as well as a
human's: a NUP is supplied information either way. The published example is
corrected — the observed shape is `24001.028501/2025-75`, five digits before the
dot, and the current example shows two.

### A failed reading is one status with one code

Registration answers a single documented failure meaning the Cover Sheet could
not be read, whether the page was unreadable, the model refused, the AI service
was unreachable, or the PDF was never a SUITE process. The analyst's next action
is identical in all four cases. A second code distinguishing "not a SUITE
process" was considered and rejected as a distinction neither service can draw
reliably.

This makes a domain rule structural: **a Document whose Cover Sheet cannot be
read never becomes a Process.** There is no manual-entry path and no
half-registered upload to return to. Legacy processes and PDFs exported without
the SUITE cover cannot be registered at all. This is a deliberate MVP
constraint, recorded in `CONTEXT.md`.

### The three fields become required and stay required

The columns remain `NOT NULL`. Partial readings are rejected by the AI service,
so no code path produces a Process missing a field. `PATCH` cannot blank one
either — a supplied field must be non-empty, and an omitted field is untouched.

### `PATCH` accepts the three Cover Sheet fields, in every state but concluded

A new partial-update route on the process resource, restricted to `nup`,
`contractObject` and `requestingUnit`. Omitted fields are left alone; an empty
body is rejected rather than treated as a no-op.

It is permitted while `processingStatus` is `processing`. This is a deliberate,
narrow exception to the rule the glossary states for Opinions — human writes
only while the machine is quiet — and the reason the rule does not reach here is
that the machine never touches these columns. The Claim payload carries
`processId`, `fileUrl`, `jobToken` and the requirements; the write-back carries
verdicts and the aggregate state. The Cover Sheet fields and the analysis
contend for nothing.

It is refused after **Conclusion**. The glossary already says a concluded
analysis is frozen, and changing the NUP of an analysis an analyst signed off on
would falsify what was signed.

Ownership is resolved exactly as elsewhere: another analyst's Process answers
`404`, never `403`, because a `403` would confirm the id exists (spec 001 §4).

### The migration

One additive column, `requesting_unit`, `NOT NULL` on a table whose existing
rows have no value for it. Since no environment carries production data yet, the
migration adds the column outright rather than staging a nullable-backfill-tighten
sequence. If that assumption is false at deploy time, the sequence is the fallback
and the spec is wrong about the environment, not about the shape.

## Testing Decisions

A good test here asserts what a client can observe over HTTP: status, body, and
what is left in Postgres and in storage afterwards. It does not assert how the
AI service was called or in what order the service's internals ran.

**The seam is the existing e2e harness** — the real Nest app, real Postgres, with
`STORAGE` already faked through `overrideProvider`. The AI-service port is faked
the same way, at the same seam. No new seam is introduced, and the existing
`process-create.e2e-spec.ts` is where most of this lands.

Through registration's spec:

- A single-file upload with no text fields is accepted, and the row carries the
  three fields the fake returned.
- A request still carrying `nup` or `contractObject` is rejected by
  `forbidNonWhitelisted`.
- A failed reading answers the documented status and code, **and leaves the
  storage fake empty and the `process` table empty** — this is the assertion
  that matters most, and it is observable precisely because storage is a fake
  whose contents the test can inspect.
- An unreachable AI service is indistinguishable, from the client's side, from a
  failed reading.
- A non-PDF and an oversized upload are still rejected before the AI service is
  reached — the existing validators run first, and the fake records no call.
- The response never exposes `fileUrl` or `jobToken`, now with one more field
  present.

A new spec covers `PATCH`, in the shape of `process-isolation.e2e-spec.ts` and
`process-delete.e2e-spec.ts`:

- One field updated, the other two untouched.
- An empty body rejected; a blank value rejected.
- Accepted while `processing`; refused once concluded.
- Another analyst's Process answers `404`.
- A field outside the three is rejected rather than ignored.
- The analysis is undisturbed: `processingStatus`, `jobToken` and any existing
  Opinions are identical before and after.

`openapi.e2e-spec.ts` covers the published contract: the new route present, the
removed request fields gone, `requestingUnit` on both response schemas.

The service-level unit spec (`process.service.spec.ts`) gains the ordering
guarantee that e2e cannot see cleanly — that a failed reading never reaches the
storage or repository ports at all.

## Out of Scope

- **Renaming `contractObject`.** Deferred deliberately; the glossary records
  that the name is wrong. Trigger: any other reason to migrate the table.
- **Splitting `requestingUnit` into agency and unit.** Additive later; the
  corpus shows no variation in the agency to justify it now.
- **A manual-entry registration path** for documents with no SUITE Cover Sheet.
  Trigger: the first real process that cannot be registered.
- **NUP format validation.** Still deferred (spec 001 §9), now for readings too.
- **Reopening a concluded analysis** so its fields can be corrected. Reopening
  was already deferred; this spec does not touch it.
- **Editing anything but the three Cover Sheet fields.** `PATCH` is not a
  general update route and does not become one.
- **`MAX_FILE_SIZE`.** It is 50 MB, and one of the ten real corpus processes is
  55.5 MB — that process cannot be uploaded today, independently of this
  feature. Found during design; recorded here so it is not lost, fixed
  elsewhere.

## Further Notes

**The AI service's puller principle is narrowed, not broken.** Its `AGENTS.md`
forbade any inbound document surface; its ADR-0003 narrows that to the analysis
cycle, on the ground that a puller structurally cannot perform a step that runs
before a Process exists — there is nothing to claim. The synchronous coupling
this spec introduces lives entirely in that gap. Any future request from this
API to that service for something about an *existing* Process fails that test.

**Design D3 is not violated.** D3 rejected synchronous *analysis* — 200 pages
through an LLM, minutes, gateway timeouts. This is one rendered page through a
small model. The category of risk is the same; the magnitude is not. It remains
the decision in this spec most likely to be revisited, and the AI service
deliberately declares no timeout on the model call, inheriting its SDK's
600-second default.

**The Cover Sheet is not the procurement's first page.** The SUITE prepends it.
In the annotated corpus the earliest Document Piece begins on page 4, and usually
much later. Nothing here reads the procurement's own content.
