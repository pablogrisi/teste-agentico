# The public surface is a path prefix; everything else lives outside it

> **Superseded in its mechanism by gateway-licia ADR-0015.** The goal below — the
> analyst surface public, `/internal/*` and `/docs` not — still holds. How it is
> enforced does not.
>
> This service no longer declares a global prefix at all. `/analisadora-api-licia`
> is public addressing applied by the gateway, which strips it before forwarding,
> so **every** route this service serves now sits behind the one gateway rule.
> The separation is no longer topological.
>
> **Read the "Rejected alternatives" section below with that in mind: the first
> one — a negative rule in the gateway — is what we now do.** The objection
> recorded there was not withdrawn; it was accepted as a cost. `/internal/*` and
> `/docs` are denied by the `analisadora-private` router in
> `gateway-licia/traefik/dynamic.yml`, which PGE Infrastructure must mirror into
> Istio by hand (ADR-0013). If they omit it, the claim endpoint is exposed exactly
> as this ADR warned — silently.
>
> Two things were put in place because of that. The e2e assertion that used to
> prove the boundary here now lives in `gateway-licia/scripts/smoke.sh`, which can
> be run against any environment including theirs; and the mirroring contract is
> written out in `gateway-licia/README.md` rather than explained in a message.
>
> `PUBLIC_PREFIX` in `src/api.constants.ts` still names the prefix, but it now
> describes the gateway's address for this API, not a path the service serves.

## Context

Two of this API's HTTP surfaces must never be reachable from the internet, and
until now nothing in the codebase enforced that.

`POST /internal/jobs/claim` is deliberately unauthenticated — ADR-0001 accepted
that, on the grounds that *"the endpoint is never published by the gateway"*.
But that was a promise about a file in **another repository**. The gateway
(`gateway-licia`) routes by path prefix and, for every authenticated backend,
chains `strip-identity` + `forward-auth`. Its rule for the sibling executora is
a bare `PathPrefix(/impugnacao)`, with no `stripPrefix` — the house convention
is that a service owns its own public path.

So the moment someone adds `PathPrefix(/analisadora)` for this API — which they
must, since today `/processes` falls into the catch-all and reaches the
**elaboradora** — `/analisadora/internal/jobs/claim` becomes reachable by *any
authenticated user*. Any analyst could claim a job belonging to a colleague and
receive, in the response, a presigned URL to that colleague's PDF plus the job
token that authorises the write-back. ADR-0001's safety argument would quietly
become false, and nothing would fail to warn us.

The Swagger UI, arriving with spec 002, raises the same question: it is a
developer tool with no guard on it.

## Decision

The application declares a **global prefix**, `analisadora`, and the two
non-public surfaces are declared **outside** it:

```ts
app.setGlobalPrefix('analisadora', { exclude: ['internal/(.*)', 'docs'] });
```

| Surface | Path | Reachable via `PathPrefix(/analisadora)` |
|---|---|---|
| Analyst API | `/analisadora/processes` | yes — that is the point |
| Job claim (worker) | `/internal/jobs/claim` | **no** |
| Swagger UI | `/docs` | **no** |

The AI worker reaches the claim endpoint over the Docker network
(`http://analisadora-api:3003/internal/jobs/claim`); the Swagger UI is reached
on localhost by whoever is running the API.

## Consequences

- **ADR-0001's premise becomes structural rather than conventional.** A
  `PathPrefix(/analisadora)` rule cannot route to `/internal/*` — not because
  someone remembered to write an exception, but because the path does not exist
  under that prefix. Publishing the claim endpoint now requires *deliberately*
  adding a second router for `/internal`, which is a change a reviewer sees.
- The same holds for the Swagger UI: it needs no `SWAGGER_ENABLED` flag,
  because its inaccessibility is a property of the topology and not of a
  configuration value that a deploy can get wrong.
- **The gateway still needs its router.** This ADR does not make the API
  reachable; it makes it *safely* reachable. `gateway-licia` must add
  `PathPrefix(/analisadora)` + `strip-identity` + `forward-auth`. Until then the
  frontend cannot call this service at all.
- Every e2e test path changes. That is a feature: a mistake in the prefix fails
  51 existing tests rather than surfacing in production.
- **One OpenAPI document, not two** (see the rejected alternative). The claim
  endpoint is documented under an `internal` tag, since a tag is the only thing
  in that file a code generator can filter on.

## Rejected alternatives

**A negative rule in the gateway** — `PathPrefix(/analisadora) &&
!PathPrefix(/analisadora/internal)`. Keeps the API's paths uniform, but the
safety of this service then depends on a rule in a repository this one does not
control, which nobody here can test, and whose omission fails silently and
catastrophically. The whole point of ADR-0001's trust model is that the
network topology is the authentication; that trust should not hinge on someone
remembering a `!`.

**Two OpenAPI documents**, one per audience — public for the frontend, internal
for the FastAPI worker. It keeps the claim endpoint (presigned URL, job token)
out of the artifact the frontend runs codegen against. Rejected as not worth
its cost for a single internal endpoint: it needs a second module purely so
`SwaggerModule`'s module-granular `include` can separate them, plus a second
committed artifact. Accepted consequence: the generated frontend client will
contain a `claim()` method, and only its `internal` tag and description mark it
as off-limits. Revisit if the internal surface grows.
