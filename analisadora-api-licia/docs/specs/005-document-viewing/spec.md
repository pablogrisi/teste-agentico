# Spec 005 — Serving the process document

**Status:** draft · **Depends on:** [spec 001](../001-process-module/spec.md),
[spec 002](../002-public-api-contract/spec.md) ·
**Related:** [ADR-0002](../../adr/0002-module-ports.md) ·
[ADR-0003](../../adr/0003-public-and-internal-surfaces.md)

## Problem Statement

The analyst uploads a Document at registration and can never see it again.

The PDF goes into object storage under `processes/{userId}/{uuid}.pdf` and the
key is persisted on the Process row. From there it travels in exactly one
direction: the AI service claims a job and receives a presigned URL for it. No
route serves it back to the person who uploaded it.

That makes the review screen impossible to build as designed. Verifying a
Process against the Catalog means reading the Document beside the Requirements —
an Opinion is a verdict about that exact wording applied to that exact document,
and the analyst has to see the document to accept or overturn what the AI
concluded about it. Today the frontend can render the AI's commentary and no
evidence for it.

The gap is not an oversight in the storage layer — `StoragePort` can already
presign, and `MinioStorageService` already imports `GetObjectCommand`. It is
that the analyst-facing surface has no way to *ask*.

There is a rule that looks like it forbids closing the gap, and does not. Spec
001 §3 keeps `fileUrl` out of every analyst response, enforced by the allowlist
in the process mapper and pinned by a test. That rule is about the **storage
object key** — a piece of infrastructure that would let a client address the
bucket directly and outlive any ownership check. It says nothing about the
**Document**, which is the analyst's own upload and which they are the one
person entitled to read.

## Solution

One route returns the Document to the analyst who owns the Process.

`GET /processes/{id}/file` answers `200 application/pdf` with the stored bytes.
Ownership is resolved exactly as every other read in the module resolves it — a
Process belonging to another analyst answers `404`, never `403`, because `403`
would confirm the id exists (spec 001 §4).

The API fetches the object and retransmits it. It does not hand the client a
presigned URL. The reason is authentication, not preference: the frontend
presents a Bearer token that its HTTP client attaches in an interceptor, so it
must fetch the document as a blob and build an object URL for the viewer. An
`<iframe>` pointed straight at a route would carry no `Authorization` header,
and one pointed straight at storage would need a second, differently-shaped code
path. The sibling executora-api already serves its documents this way and the
frontend already consumes that shape.

The storage key stays exactly as hidden as it was. Serving content is not
publishing an address.

## User Stories

1. As an analyst, I want to open the PDF I registered, so that I can read the
   document the AI judged instead of taking its commentary on faith.
2. As an analyst, I want the document beside the Requirement list, so that I can
   decide each Opinion against the passage it refers to.
3. As an analyst, I want the document to appear inline in the page, so that
   reviewing does not mean downloading a file and switching applications.
4. As an analyst, I want to reopen the document at any point in the analysis, so
   that a Process still `processing` is not a black box while I wait.
5. As an analyst, I want another analyst's document to be unreachable, so that a
   process I am not entitled to see stays that way.
6. As an analyst, I want a process that is not mine to answer the same way as one
   that does not exist, so that the API never confirms the existence of work I
   cannot see.
7. As a frontend developer, I want the response documented as binary in the
   OpenAPI contract, so that my generated client types it as a blob rather than
   as JSON.
8. As a frontend developer, I want the error bodies documented as JSON, so that I
   can render a failure with the same `ErrorResponse` handling as every other
   route.
9. As a frontend developer, I want to know that this route needs a blob fetch and
   an object URL, so that I do not waste a day discovering that an `<iframe>`
   sends no Authorization header.
10. As a frontend developer, I want a missing document to answer `404` rather
    than `500`, so that I can show "document unavailable" instead of a generic
    error.
11. As an operator, I want a Process pointing at a vanished object to be logged
    as an error, so that a storage inconsistency is visible in the logs even
    though the analyst sees an ordinary `404`.
12. As a maintainer, I want the storage key to remain absent from every JSON
    response, so that adding this route does not quietly widen what spec 001 §3
    protects.

## Implementation Decisions

### The storage port grows a read

`StoragePort` gains `download(key)`, alongside `upload`, `delete` and
`getPresignedUrl` (ADR-0002: the module's outbound dependencies are declared as
ports, and the adapter is bound once).

It returns the bytes **or null** rather than throwing. The only caller's answer
to a missing object is a `404`, and recognising storage's "no such key" error
shape is adapter knowledge — the MinIO adapter already performs that same
inspection when probing for its bucket. Keeping it there means the service reads
as domain logic rather than as error forensics.

It returns no content type. Registration accepts `application/pdf` and nothing
else, so the type is known statically and re-deriving it from object metadata
would only introduce a way for it to be wrong.

### Ownership is resolved in the service

The service resolves the Process through the repository's owner-filtered read —
the same call `getProcess` and `deleteProcess` use — and raises `404` when it
finds nothing. Per AGENTS.md, isolation is enforced in the service layer; the
controller is never trusted to have filtered.

### A row without an object is an anomaly, reported as absence

Registration uploads before it inserts, precisely so a Process can never point at
an object that does not exist (spec 001 §14.4). If the lookup nevertheless comes
back empty, the service logs it at error level — naming the process and the key —
and answers `404` with a message distinct from "process not found". The analyst
gets the only truthful answer available; the operator gets the anomaly.

Note the deliberate asymmetry with deletion, where storage failures are swallowed
after the authoritative write has already succeeded. Here the storage read *is*
the request. Swallowing it would mean answering `200` with nothing.

### The controller does not take over the response

The handler returns Nest's binary-body value with the media type and an `inline`
disposition, rather than injecting the raw response object and writing to it.
Taking over the response would put the handler outside the global exception
filter and force it to hand-roll a `404` body that no longer matches the
published `ErrorResponse` — which is the shape the sibling executora-api ended up
with. Letting the exception propagate keeps one error contract across the whole
surface.

`inline`, not `attachment`: the deliverable is viewing.

The filename is derived from the process id. The original upload name is not
persisted, and a NUP contains `/` and `.`, which do not belong in one.

### The contract declares binary on the success response only

The `200` publishes `application/pdf` with a binary schema; the `400`, `401` and
`404` keep `application/json` with `ErrorResponse`. Declaring the media type at
operation level instead would stamp `application/pdf` onto the error bodies too —
a contract that lies to every generated client. `docs/openapi.json` is
regenerated, never hand-edited.

### What does not change

- The process mapper's allowlist, and therefore the guarantee that `fileUrl` and
  `jobToken` never appear in a JSON response.
- The presigned URL, which remains what the AI service receives on claim, with
  its own TTL sized for an analysis run.
- The internal surface, its gateway deny rule, and ADR-0003 generally.

## Testing Decisions

A good test asserts what a client observes — the status code, the bytes, the
headers, what a subsequent request can read — never how the module is wired
inside.

- **The seam is the existing one:** `createTestApp()` booting the real
  `AppModule` with production pipes and filters against a real Postgres, with
  object storage faked as it already is for every other suite. No new seam. The
  document is registered through `POST /processes` rather than seeded, so the
  test exercises the upload and the read as one cycle.
- **Unit tests** for the new service method against its ports, prior art being
  the existing process service spec. These are not redundant with the e2e: the
  coverage threshold on services applies to the unit run, which never sees the
  e2e suite.
- **Prior art for style:** the delete e2e spec for route-shape and id-validation
  cases, and the isolation e2e spec for the ownership assertions.
- **Invariants that must have e2e coverage:**
  1. **Per-analyst isolation on the new route** — another analyst's document
     answers `404`, and an unauthenticated request answers `401` (AGENTS
     invariant #1, extended to this surface).
  2. **The bytes round-trip** — what registration accepted is byte-identical to
     what the route returns, with `content-type: application/pdf`.
  3. **Inline disposition** — the response is marked for viewing, not saving.
  4. **A row outliving its object answers `404`, never `500`.**
  5. **The key stays hidden** — the JSON detail of the same process still has no
     `fileUrl` after this route exists.
  6. **Id validation** — a non-numeric id answers `400`, an unknown id `404`.
- Every bug fix ships a regression test.

## Out of Scope

- **More than one document per Process.** The route carries no `:type` segment
  because the domain has one Document. Attachments, generated reports or a
  superseding re-upload would each add a route; none is additive pressure on
  this one.
- **Downloading with `attachment`.** The ask is viewing. A saving affordance is a
  disposition parameter away if product wants one.
- **Streaming without buffering.** The API loads the object before answering.
  Editais are small enough that this is not worth the adapter complexity today;
  the trigger to revisit is memory pressure observed under real load, and the
  port method is the only thing that would change.
- **A presigned URL for the analyst.** Rejected above on authentication grounds,
  not performance. If the frontend ever renders the document outside an
  authenticated fetch, this is the alternative to reach for, and it needs a TTL
  of its own — the existing one is sized for an analysis run.
- **Frontend consumption.** `frontend-licia` has no analisadora screen yet. This
  spec makes the route available and documents the blob-and-object-URL shape it
  expects; building the viewer is separate work.
- **Range requests / partial content.** No pagination or seeking support; the
  browser's PDF viewer receives the whole document.
- **Access logging or an audit trail of who read which document.** Not asked for,
  and it belongs with a broader audit story if it ever is.

## Further Notes

- The route completes the analyst-facing surface for the review screen: the
  Process detail, its Opinions, the Requirement catalog, and now the Document
  each of those verdicts is about.
- `CONTEXT.md` gains **Document** as a domain term. It had none — the PDF was
  only ever infrastructure, and this spec is what makes it something the API
  talks about.
- Regenerating `docs/openapi.json` boots the whole `AppModule`, which reaches
  object storage during dependency injection, not only Postgres. The script's own
  note mentions Postgres alone; anyone running it needs both services up.
