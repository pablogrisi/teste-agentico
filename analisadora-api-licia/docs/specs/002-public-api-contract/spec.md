# Spec 002 — Public API contract

**Status:** draft · **Depends on:** [spec 001](../001-process-module/spec.md) ·
**Design decisions:** D5 ·
**Related:** [ADR-0001](../../adr/0001-pull-based-queue-consumption.md) ·
[ADR-0003](../../adr/0003-public-and-internal-surfaces.md)

> **Revised twice.** The prefix became `analisadora-api-licia` (gateway ADR-0014),
> and then stopped being this service's at all: the gateway now applies it and
> strips it before forwarding (gateway ADR-0015), so every route below is served
> at the root. Read `/analisadora/...` as the **public** address of the day.
>
> The one consequence that is not cosmetic is in §"Prefix" below: the internal
> surface is no longer separated from the public one by routing. It is denied at
> the gateway edge instead — see the revision note on ADR-0003.

## Problem Statement

Spec 001 shipped a working Process module, and the frontend cannot use any of
it.

Three things are missing, and only one of them is documentation:

1. **The frontend cannot reach this API.** The gateway routes by path prefix and
   has no router for the analisadora. `/processes` falls into the catch-all
   `PathPrefix(/)` and is served by the **elaboradora**.
2. **The browser would block the call even if it did reach us.** This API never
   calls `enableCors`. Traefik answers only the preflight `OPTIONS` at the edge;
   the actual response must carry the backend's own CORS headers, as the sibling
   services already do.
3. **Nothing describes the contract.** A frontend developer has no way to learn
   that the multipart body wants `nup` + `contractObject` + `file`, that the
   response is `202` and not `201`, that `startedAt` and `processingStatus` mean
   two unrelated things (D7), or — most costly of all — that a `404` on a
   process detail may mean *"it exists but is not yours"* rather than *"it was
   deleted"* (spec 001 §4). Today that knowledge lives only in markdown that the
   frontend team does not read.

The integration cost of all three lands on the frontend as guesswork.

## Solution

The API publishes a machine-readable contract of its analyst-facing surface, and
becomes callable from a browser.

- The analyst API is served under a path prefix the gateway can route to, and
  the two surfaces that must never be public — the worker's claim endpoint and
  the Swagger UI — are declared *outside* that prefix, so no gateway rule can
  reach them (ADR-0003).
- CORS is enabled, so a browser response is not discarded.
- An OpenAPI document is generated from the code itself and served as an
  interactive Swagger UI for local development, and **committed to the
  repository** as `docs/openapi.json`, so the frontend can generate a typed
  client without running this service, and so any change to the contract shows
  up as a diff in the merge request that caused it.

## User Stories

1. As a frontend developer, I want a machine-readable description of every
   endpoint, so that I can generate a typed client instead of transcribing a
   markdown spec by hand.
2. As a frontend developer, I want the exact shape of the multipart registration
   body, so that I know the PDF goes in a field called `file` alongside `nup` and
   `contractObject`.
3. As a frontend developer, I want to know that registration answers `202` and
   not `201`, so that my success handler does not silently never fire.
4. As a frontend developer, I want a realistic `nup` example, so that I build the
   right input mask even though the API does not validate the format.
5. As a frontend developer, I want the `404` on a process detail to *tell me* it
   also means "not yours", so that I show "you do not have access" instead of
   "this process was deleted".
6. As a frontend developer, I want every documented error to carry a typed body,
   so that I can render the message without `catch (e: any)`.
7. As a frontend developer, I want to know that an oversized PDF answers `413`
   and a non-PDF answers `400`, so that I can distinguish the two in the UI.
8. As a frontend developer, I want the paged list response documented with its
   `total`/`page`/`pageSize`, so that I can build pagination without probing the
   API.
9. As a frontend developer, I want to know which status values `?status=` accepts,
   so that my filter chips match the server's enum exactly.
10. As a frontend developer, I want the response schemas to never mention
    `jobToken` or `fileUrl`, so that I do not build a feature on a field the API
    will never send.
11. As a frontend developer, I want to see that I authenticate against the
    gateway with a Bearer token, so that I do not try to set `X-User-Id` myself
    and spend a day wondering why the gateway ignores it.
12. As a frontend developer, I want a browser to be able to call this API, so
    that my requests are not rejected by CORS.
13. As a backend developer, I want to try an endpoint from a browser without
    writing a `curl` invocation, so that exploring the multipart upload is not
    an exercise in flag archaeology.
14. As a backend developer, I want the committed `openapi.json` to be verified by
    a test, so that a stale contract fails CI instead of misleading the frontend.
15. As a backend developer, I want a contract change to appear as a diff in the
    same merge request as the code that changed it, so that a reviewer can see
    that a response shape moved.
16. As an AI-worker (FastAPI) developer, I want the claim endpoint documented, so
    that I know the payload carries a presigned URL, a single-use job token, and
    the requirement catalog.
17. As an AI-worker developer, I want the claim endpoint's documentation to state
    that it is unauthenticated by design and unreachable through the gateway, so
    that I do not "fix" it by adding a token.
18. As a platform engineer, I want the internal endpoint to be unroutable from
    the gateway *by construction*, so that publishing this API cannot
    accidentally expose another analyst's PDF and job token.
19. As a platform engineer, I want the Swagger UI to be unreachable from the
    internet without depending on a feature flag being set correctly in a deploy.
20. As an analyst, I want the process list and detail I see in the frontend to be
    only my own, so that a colleague's procurement analysis never appears in my
    screen — the contract must not offer the frontend any way to ask for someone
    else's.

## Implementation Decisions

### 1. Global prefix, with the non-public surfaces outside it

`setGlobalPrefix('analisadora')`, excluding the internal jobs controller and the
Swagger UI path. Recorded in **ADR-0003**, including the rejected alternative (a
negative rule in the gateway) and the reason: it makes ADR-0001's
"never published by the gateway" premise structural instead of conventional.

| Surface | Path |
|---|---|
| Analyst API | `/analisadora/processes` |
| Job claim (worker) | `/internal/jobs/claim` |
| Swagger UI | `/docs` |

Consequence: every existing e2e path changes. This is desirable — a mistake in
the prefix fails the suite rather than production.

### 2. CORS

Enabled in the shared `configureApp`, so the e2e suite exercises the same
configuration as production, matching the sibling services. Traefik answers the
preflight `OPTIONS` at the edge for the routers it owns; the real response still
needs this service's own headers.

### 3. The OpenAPI document is built from explicit decorators

Response types today are TypeScript `interface`s, which are erased at runtime;
`@nestjs/swagger` reflects over runtime metadata and would document every
response as `{}`. They become **classes with explicit `@ApiProperty`**, and the
mappers are typed by those classes — so a field added to the mapper without a
matching schema entry is a compile error, and the response allowlist (spec 001
§3, which is what keeps `jobToken` and `fileUrl` from ever leaking) cannot drift
away from the published schema.

The `@nestjs/swagger` **CLI plugin is deliberately not used**. It is a
compile-time transformer that runs under `nest build` but not under `ts-jest`, so
the document built inside the drift test would differ from the one built by the
generation script — comparing two documents produced by different pipelines. The
drift test is only meaningful if the document is the same from every entry point.

### 4. Two security schemes, one per server

This API never validates a JWT (D5): it trusts `X-User-Id`, injected by Traefik's
forward-auth. The frontend, meanwhile, sends `Authorization: Bearer <jwt>` to the
**gateway** and must never send `X-User-Id` — the gateway's `strip-identity`
middleware erases it. Both facts are true; each is true of a different address.

The document therefore declares two servers and two schemes, `security` being an
OR:

- `bearerAuth` — the gateway server. Listed **first**, so a code generator picks
  it, which is what the frontend needs.
- `edgeIdentity` — an `apiKey` in header `X-User-Id`, the localhost server. Its
  description states that the gateway injects it and the client must never send
  it. This is what makes the local Swagger UI's "Try it out" button work.

The `servers` public URL comes from a new `PUBLIC_BASE_URL` environment variable,
validated at startup like the rest, defaulting to localhost — so no host is
hardcoded into the committed artifact.

### 5. One document, with the internal endpoint tagged

Tags: `processes` and `internal`. The claim endpoint is documented, under the
`internal` tag, with a description stating it is service-to-service, is
unauthenticated by design (ADR-0001), and is not routable through the gateway.

Accepted consequence, recorded in ADR-0003: a generated frontend client will
contain a `claim()` method. A description is a comment, not a barrier — the tag
is the only thing in the artifact a generator can filter on. Two separate
documents were considered and rejected as not worth the cost for one endpoint.

### 6. Multipart

`POST /processes` is `multipart/form-data`; the `file` is bound by
`@UploadedFile`, not by the DTO, so Swagger cannot infer it. The `file` field is
declared on `CreateProcessDto` decorated **only** with `@ApiProperty` (binary
format), which is the standard NestJS recipe. The field is never populated at
runtime — multer removes the file from `req.body` — and never read by the
service. Accepted for a single upload endpoint; if a second one appears, this
moves to a documentation-only class that extends the DTO.

Must be verified: an undecorated (by `class-validator`) property must not
interfere with the global `whitelist` / `forbidNonWhitelisted` validation.

### 7. Errors

A shared `ErrorResponse` class documents the `{ statusCode, message, error }`
shape that Nest and `PrismaExceptionFilter` already emit. Documented per route:
`400` (validation, non-PDF, non-numeric id), `401` (no identity), `404`, `413`
(oversized PDF). `409` is **not** documented here — it is unreachable on these
endpoints, arising only in the slice-4 write-back.

The `404` description must state that it covers *both* "does not exist" and
"belongs to another analyst", and why (a `403` would confirm the id exists).

### 8. Operation ids

Explicit: `createProcess`, `listProcesses`, `getProcess`, `deleteProcess`,
`claimNextJob`. Without them Nest emits `ProcessController_create`, and the
frontend's generated client inherits those names.

### 9. Artifacts

- `docs/openapi.json` — committed.
- `npm run openapi:generate` — regenerates it.
- The Swagger UI at `/docs`.

## Testing Decisions

A good test here asserts what a **client** can observe — a status code, a
header, a response body, the bytes of the published artifact — never how the
document was assembled.

**One seam, and it already exists:** `createTestApp()` (`test/setup/`), which
boots the real `AppModule` with the production pipes and filters against a real
Postgres. It hands back an `INestApplication`, which is exactly what
`SwaggerModule.createDocument()` needs — so the contract test needs no new seam
and no `preview: true` workaround. All three tests below run in the existing e2e
suite.

1. **Prefix.** The existing e2e specs move to `/analisadora/processes`; a wrong
   prefix fails all 51 of them. One new test asserts that
   `/analisadora/internal/jobs/claim` is **not** routed, while
   `/internal/jobs/claim` is — the mechanical form of ADR-0003.
2. **CORS.** A real (non-`OPTIONS`) response carries
   `Access-Control-Allow-Origin`.
3. **Contract drift.** The document built from the live app equals the committed
   `docs/openapi.json`. This is what stops the artifact from rotting; a committed
   contract that lies is worse than none.
4. **The allowlist, restated at the schema level.** The published schema for a
   process response contains neither `jobToken` nor `fileUrl`. Spec 001 already
   asserts this of the *response body*; asserting it of the *schema* is what
   stops a future contributor from documenting a field the API must never send.

Prior art: `test/process-isolation.e2e-spec.ts` and
`test/unique-constraint.e2e-spec.ts`, which pin AGENTS' two inviolable invariants
at the HTTP boundary in exactly this style.

## Out of Scope

- **The gateway router.** `gateway-licia` must add `PathPrefix(/analisadora)` +
  `strip-identity` + `forward-auth`. That is a different repository and a
  separate task; until it lands, the frontend still cannot reach this API. This
  spec makes the API *safely* routable, not routed.
- Documenting the slice-4 write-back, opinions, the requirement catalog CRUD, or
  anything else that does not exist yet.
- Generating the frontend's client. This spec ships the contract; the codegen
  tool and its wiring are the frontend repository's choice.
- API versioning (`/v1`). Not needed while there is one consumer and no
  published contract to break.
- Authenticating or hiding the Swagger UI behind a flag — ADR-0003 makes it
  unreachable by topology instead.

## Further Notes

The `nup` example in the document uses the standard Número Único de Protocolo
shape (`19.000123/2025-45`), with a description stating explicitly that the
format is **not** validated in the MVP (spec 001 §9). An example that guides
without promising validation is worth more to the frontend than either silence or
a rule the server does not enforce.
