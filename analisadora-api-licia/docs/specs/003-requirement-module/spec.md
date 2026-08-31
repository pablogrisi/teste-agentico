# Spec 003 — Requirement module

**Status:** draft · **Depends on:** [spec 001](../001-process-module/spec.md) ·
**Design decisions:** D2 (amended — see below) ·
**Related:** [ADR-0002](../../adr/0002-module-ports.md) ·
[ADR-0004](../../adr/0004-requirements-are-superseded-never-rewritten.md)

This is design slice **2** — *"Catálogo de requisitos — seed e gestão do catálogo
fixo"*.

## Problem Statement

The Catalog is empty, and nothing can fill it.

The Requirement module exists as a read-only sliver: `ProcessService` reads the
Catalog to build a claim payload, and that is all. There is no way to put a
Requirement into the database except by hand-writing SQL — which AGENTS.md
forbids — so today every environment starts with an empty Catalog.

An empty Catalog does not fail. It produces a **vacuous analysis**: `claim` hands
the AI worker `requirements: []`, the worker's unit of work is the
(requirement, document) pair so it makes zero model calls, it reports success,
and the write-back marks the Process `processed` with zero Opinions. The analyst
opens a completed analysis and finds nothing in it. Nobody made a mistake and
the result is a lie.

The PGE's rules arrive as spreadsheets — roughly a dozen today, "planilhas com
dezenas de entradas já chegando". They need to get into the Catalog reliably,
repeatedly, and without a developer editing code each time.

## Solution

The Requirement module gains the two halves design slice 2 calls for:

- **A seed.** A JSON file of Requirements, versioned in the repository, and a
  script that loads it — validating before it writes, and safe to run twice.
- **A management surface.** Four routes: list the Catalog, fetch one Requirement,
  add a Requirement, and edit a Requirement's presentation or retire it.

What it deliberately does *not* gain is the ability to **rewrite a rule**. A
Requirement's `text` is the rule, and an Opinion is a verdict about that exact
wording; editing it would retroactively change what a past analysis is recorded
as having judged, silently, in the one system whose product is the trail that
defends a procurement decision. Rewording is expressed as what it actually is:
a **new** Requirement, and the old one **retired**. See ADR-0004.

And `claim` stops handing out jobs against an empty Catalog, so a mis-provisioned
environment fails loudly instead of producing empty analyses.

## User Stories

1. As an admin, I want to load the PGE's requirement spreadsheet into the
   Catalog, so that analyses are judged against the real rules.
2. As an admin, I want to run the seed twice without duplicating anything, so
   that I can re-run it after a failure without fear.
3. As an admin, I want the seed to reject a malformed file before it writes
   anything, so that a bad conversion does not leave the Catalog half-loaded.
4. As an admin, I want the seed to tell me *which row* is bad and *why*, so that
   I can fix the file instead of guessing.
5. As an admin, I want the seed to reject a file containing the same rule twice,
   so that a copy-paste in the spreadsheet does not become two rules the AI pays
   to check twice.
6. As an admin, I want to add a single Requirement through the UI, so that a rule
   agreed in a meeting does not have to wait for a deploy.
7. As an admin, I want to recategorize a Requirement under a different type,
   so that the analysis screen matches how analysts actually read the checklist.
8. As an admin, I want to retire a Requirement that no longer applies, so that
   new analyses stop being judged against a rule that was revoked.
9. As an admin, I want to un-retire a Requirement, so that a mis-click is not a
   migration.
10. As an admin, I want to be *unable* to edit a Requirement's text, so that I
    cannot accidentally falsify the record of an analysis someone already signed
    off on.
11. As an admin, I want rewording a rule to be an explicit two-step act (add the
    new, retire the old), so that the difference between "fixing the wording" and
    "changing the rule" is one I am forced to think about.
12. As an admin, I want to see retired Requirements when I ask for them, so that
    I can audit what the Catalog used to contain.
13. As an analyst, I want the Catalog I am shown to contain only rules in force,
    so that I am not asked about a rule that was revoked.
14. As an analyst, I want an analysis I completed months ago to still display the
    exact rule I judged, even if that rule has since been retired, so that my
    review remains readable and defensible.
15. As an analyst, I want to be unable to change the Catalog, so that the ruler
    my work is measured against is not something a colleague can move under me.
16. As an analyst, I want a Process I register never to come back as "processed"
    with zero Opinions, so that I am never shown an empty analysis presented as a
    complete one.
17. As an AI-worker developer, I want the claim payload to carry only Requirements
    in force, so that I do not spend model calls on retired rules.
18. As an AI-worker developer, I want `claim` to refuse rather than hand me an
    empty requirement list, so that a mis-provisioned environment surfaces as an
    error I can see instead of a run that silently does nothing.
19. As a frontend developer, I want a single endpoint returning the Catalog, so
    that I can build the type-grouping skeleton once and cache it, rather than
    receiving the same rule text repeated inside every one of ~30 Opinions.
20. As a frontend developer, I want to fetch a Requirement by id regardless of
    whether it is retired, so that the analysis screen of an old Process can
    render every Opinion it holds.
21. As a developer, I want the Catalog's uniqueness enforced by the database, so
    that the guarantee holds for the seed, for the API, and for any write path
    added later.
22. As a developer, I want a change to the Catalog data to arrive as a diff in a
    merge request, so that a change to what the AI checks is reviewed like any
    other change.

## Implementation Decisions

### 1. Schema (a migration, per AGENTS)

Six changes to `requirement`:

- **`tab` and `section` are dropped; `type VARCHAR(120) NOT NULL` replaces
  them.** The PGE validated the data model: there is no tab/section
  distinction — the only grouping the domain recognises is the requirement's
  `tipo` (JURIDICA, DOCUMENTAL, HABILITACAO, …). A plain string, **not an
  enum**: the value vocabulary belongs to the PGE, and constraining it is
  deliberately deferred. The `requirement_tab` Postgres enum goes with the
  column.

- **`UNIQUE(text)`.** The rule *is* the text. D2 already said the grouping
  fields *"não definem a regra — são metadado de apresentação"*, so two rows
  with the same text are the same rule, whatever type they carry. This is the
  natural key
  that makes the seed idempotent, and it means a spreadsheet holding the same
  text twice is a data-entry error that gets rejected rather than silently turned
  into two rules the AI pays to check twice.

  > Known limit: a btree unique index caps an entry at roughly 2700 bytes. A
  > requirement is a sentence, so this is ample — but a pathologically long one
  > would fail the insert with an obscure index-size error rather than a clear
  > validation message.

- **`active BOOLEAN NOT NULL DEFAULT true`.** This **reverses D2**, which
  rejected the column on the premise *"hoje os requisitos só crescem"*. A revised
  spreadsheet from the PGE is precisely a rewritten requirement, and without
  `active` it becomes a permanent duplicate that nothing can remove — deletion is
  barred by `opinion.requirement_id ON DELETE RESTRICT`. Recorded in ADR-0004.

- **`code VARCHAR(20) NULL UNIQUE`.** The PGE's spreadsheet turned out to carry
  its own identifiers (`NC0001`…`NC0337`), unknown when this spec was first
  drafted. Persisting them keeps the Catalog traceable to the source document —
  when the PGE says "o NC0042 mudou", the row is findable without grepping rule
  text. Nullable: a Requirement born in the UI has no spreadsheet counterpart.
  The code identifies the *spreadsheet row*, not the rule — the rule is still
  the `text`, and the code creates no update path for it (see Further Notes).

- **`legal_reference JSONB NULL`.** The spreadsheet's `metadado` object
  (`{ lei, artigo, inciso, paragrafo, alinea }`) — the legal grounds behind the
  rule. Presentation metadata like `type`: `PATCH` may edit it, so an admin
  can fix a mistyped article without retiring the rule.

- No `supersedes` / `superseded_by` link, and no ordering column (D2 rejected
  `ordem`; Requirements are ordered by `id`, so a new one lands at the end of
  its type).

### 2. The `text` is immutable — the load-bearing decision

`PATCH` accepts `type`, `active` and `legalReference`. A request
carrying `text` is rejected with `400`; it is not silently ignored, because
silently ignoring it would leave the admin believing the rule changed.

Rewording is two calls: `POST` the new Requirement, `PATCH` the old one to
`active: false`. **Accepted cost:** this is not atomic and records no provenance.
An admin who forgets the second call leaves both rules in force and the AI checks
both wordings — visible on the management screen and fixable with one more call,
unlike the silent falsification the alternative buys. Revisit if the Catalog
outgrows what a human can eyeball. See ADR-0004.

### 3. Two reads, never collapsed

| Read | Returns |
|---|---|
| The Catalog (`getCatalog()`, and `GET /requirements`) | `active = true` only |
| A Requirement by id (`GET /requirements/:id`) | Any, retired included |

`getCatalog()` is what fills the claim payload, so retired rules stop reaching
the AI. But the Opinions of an old Process still point at retired rules, and the
analysis screen (slice 5) has to render them — collapsing these two reads would
either break that screen or feed the AI rules that were revoked.

`GET /requirements` takes an `includeRetired` flag for the management screen.

### 4. API

| Route | Who | Notes |
|---|---|---|
| `GET /requirements` | analyst | The Catalog. `?includeRetired=true` for the management screen — open to any authenticated identity: a retired rule is not a secret, it is already reachable by id. |
| `GET /requirements/:id` | analyst | Retired included — see §3. |
| `POST /requirements` | **admin** | `409` on a duplicate `text` or `code` (the DB constraints, translated by the existing filter). |
| `PATCH /requirements/:id` | **admin** | `type`, `active`, `legalReference`. `text` → `400`. |

No `DELETE`. The FK forbids it, and the audit trail needs the row.

Unpaginated: the Catalog is hundreds of rules, not thousands.

### 5. Authorization — the first use of `X-User-Role`

A `RolesGuard` reads the role the `IdentityGuard` already puts on the request.
Confirmed against the source: users-api issues exactly two roles (`admin` |
`regular`) and Traefik forwards them as `X-User-Role`. Until now the guard read
the header and every other line of code ignored it.

Writes require `admin`; reads accept any authenticated identity. A missing or
non-admin role on a write is `403` — the resource exists and the caller may read
it, so the ownership-hiding argument that makes `404` right for a Process (spec
001 §4) does not apply here.

### 6. The seed

The PGE's own JSON, committed as-is at `prisma/seed/requirements.json`, plus an
npm script (`npm run seed:requirements`) that loads it. The file arrived while
this slice was being planned: **337 Requirements** (not the ~12 first
estimated), shaped

```json
{ "lista_requisitos": [ { "id": "NC0001", "tipo": "JURIDICA",
    "declaracao": "Verificar se…",
    "metadado": { "lei": "…", "artigo": "3º", "inciso": null,
                  "paragrafo": null, "alinea": null } } ] }
```

Committing the PGE's format rather than converting it was deliberate: with a
real format in hand, re-shaping 337 rows by hand is exactly the fragile manual
step the design wanted to eliminate. A revised spreadsheet is a new export
dropped over the same file, reviewed as a diff in an MR. The script owns the
translation:

| Seed field | Catalog column | Note |
|---|---|---|
| `id` | `code` | External identifier, kept for traceability. |
| `declaracao` | `text` | The rule. |
| `tipo` | `type` | Verbatim — the PGE's categories are the grouping vocabulary, and the schema does not constrain them. |
| `metadado` | `legal_reference` | As-is. |

Because the export is produced outside the repo, **the script validates before
it writes**, and this replaces the parser as the safety net:

- `tipo`, `id` and `declaracao` non-empty. The `tipo` is deliberately **not**
  checked against a known set: the vocabulary belongs to the PGE, and an
  eleventh category must load without a code change. A typo becomes a stray
  grouping — visible on the management screen and fixable with a `PATCH`.
- The file must not contain the same `declaracao` twice, nor the same `id` twice.
- On any violation: abort, insert nothing, and name the offending row.

Insertion is idempotent (`skipDuplicates` against the new `UNIQUE(text)` and
`UNIQUE(code)`), so a re-run is safe.

**It does not resurrect.** The seed inserts what is missing; it does not
reconcile state. A Requirement retired through the API stays retired even if it
is still listed in the seed file — the unique constraint makes the row a
duplicate, and it is skipped.

**It is a deliberate act**, run by hand — not wired into the container entrypoint.
A deploy does not mutate data, and a malformed data file cannot take the API down.

### 7. `claim` refuses an empty Catalog

The defence for a mis-provisioned environment lives where the damage happens.
`claimNextJob` already reads the Catalog before claiming (spec 001, so that a
catalog failure cannot strand a job in `processing`); it now also refuses to
claim when the Catalog is empty. The queue is left untouched and the worker gets
**`503 Service Unavailable`**, naming the cause — distinguishable from `204`
("no work") and from `500` ("a genuine bug"): the environment is not
provisioned to judge anything yet, which is precisely what 503 means.

### 8. Module shape (ADR-0002)

The module already follows the port convention after the pre-merge refactor: a
`RequirementServicePort` (the inbound surface — the whole service, of which
`ProcessService` may only ever call `getCatalog`) and a
`RequirementRepositoryPort` (the outbound dependency, speaking rows). This slice
extends both, adds the controller, and the module exports only the service port —
the repository stays internal.

## Testing Decisions

A good test here asserts what a **client** can observe: a status code, a response
body, the rows in the database after an operation. Not that the service called
the repository.

**No new seams.** The seed's logic — read, validate, insert — is a function the
script merely invokes, so the e2e suite drives it against the real Postgres of
`createTestApp()`, the seam all 63 existing tests already use. Everything below
lands in suites that exist.

**e2e** (real Postgres):

1. **The text is immutable.** `PATCH` carrying `text` → `400`, and the stored row
   is unchanged. *This is ADR-0004 in executable form* — the test that stops a
   future contributor from "fixing" the API by making it more convenient.
2. **Authorization.** `POST` and `PATCH` without `X-User-Role: admin` → `403`;
   `GET` with any identity → `200`.
3. **The two reads.** A retired Requirement is absent from `GET /requirements`,
   present with `?includeRetired=true`, and always fetchable by id.
4. **Duplicate text** → `409`, not `500` (the existing `PrismaExceptionFilter`
   translates `P2002`; this pins that it covers this table too).
5. **The seed is idempotent.** Running it twice leaves exactly one row per rule.
6. **The seed validates.** A file with a blank `tipo`, an empty `declaracao`,
   or the same `declaracao` twice inserts **nothing** — asserted by counting
   rows after the failure, not by reading the error message.
7. **The seed does not resurrect.** Retire a Requirement, re-run the seed, it is
   still retired.
8. **`claim` refuses an empty Catalog** — and, critically, **leaves the Process
   `pending`**. A refusal that consumed the job would be worse than the bug.
9. **Retired rules do not reach the AI.** A claim payload contains only active
   Requirements.

**Unit:**

- `RolesGuard`, mirroring `identity.guard.spec.ts`.
- `RequirementService`, against the in-memory fake of the repository port that
  already exists.

Prior art: `process-isolation.e2e-spec.ts` and `unique-constraint.e2e-spec.ts`
pin AGENTS' inviolable invariants at the HTTP boundary in exactly this style, and
`requirement.service.spec.ts` already drives the service through a fake port.

## Out of Scope

- **Opinions** — the write-back (slice 4), the analysis screen (slice 5), and
  granular retry (slice 6). This slice stops at the `requirement` table.
- **A provenance link between a rule and the one that replaced it.** Considered
  and dropped (ADR-0004); superseding is two calls and records no link.
- **Ordering within a type.** D2 rejected the column; `id` is the order.
- **Constraining the `type` vocabulary.** An enum, a check constraint or a
  lookup table were all deliberately deferred — the value set belongs to the
  PGE and is still settling.
- **Pagination and search on the Catalog.** Hundreds of rules.
- **A general role/permission system.** `RolesGuard` checks one role against one
  header. If a third role appears, that is a different spec.
- **Deleting a Requirement.** Not deferred — forbidden.

## Further Notes

**The seed data arrived during planning — and reshaped §6.** The real export
carries 337 Requirements, its own identifiers (`NC0001`…) and a legal-reference
object, none of which the first draft anticipated. Hence `code` and
`legal_reference` in the schema, the PGE-format seed file, and "hundreds, not
thousands" where this spec first said "tens".

**The tab/section split did not survive the data validation.** The screens'
tab-and-section grouping was a design assumption; the PGE confirmed the domain
recognises a single categorisation — the requirement's `tipo`. Both columns
(and the `requirement_tab` enum) were dropped in favour of `type`, a free
string. This also dissolved the seed's `tipo → tab` mapping: the value now
flows through verbatim. The claim payload shape changed with it
(`{ requirementId, text, type }`) — **a breaking change for the AI worker**,
to be coordinated before deploy.

**Editing the text via the external code was considered and deferred.** With
`code` as a stable identity, an "edit" could be expressed safely as an atomic
supersede (new row, same code, old row retired — provenance for free). The
team has not yet decided; until it does, ADR-0004 stands untouched: `text` is
immutable, superseding is two explicit calls, and the code is traceability
only. Whatever the decision, an in-place `UPDATE` of a judged rule's text
remains off the table — that part is not up for a vote, it is the audit trail.

**This slice reverses a design decision.** D2 rejected the `ativo` column. The
premise it rejected it on — *"hoje os requisitos só crescem"* — does not survive
the management screen this slice is asked to ship, and ADR-0004 records why. Any
reader who finds the column and then reads D2 will otherwise conclude the code
is wrong.
