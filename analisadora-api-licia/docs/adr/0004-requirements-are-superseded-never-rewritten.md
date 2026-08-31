# Requirements are superseded, never rewritten

## Context

The Requirement catalog needs a management surface: the PGE hands over revised
spreadsheets, and rules get added, regrouped, and occasionally reworded.

Design decision **D2 explicitly rejected an `ativo` column**: *"`ativo` só serve
para aposentar requisito sem apagá-lo, e hoje os requisitos só crescem."* That
premise does not survive contact with the management screen the slice is
supposed to ship.

The reason is not convenience, it is the audit trail. An Opinion is a verdict
about a Requirement's **exact wording**. Rewrite requirement 7 from *"O edital
contém a justificativa da contratação?"* to *"O edital contém o estudo técnico
preliminar?"*, and the record now says an analyst approved the presence of a
study she never looked at. No row changed. No log fired. The falsification is
retroactive and undetectable — in a system whose product is the compliance trail
that defends a public procurement decision when it is challenged.

AGENTS.md already forbids this from the other side: *"AI-produced verdicts form
an audit trail and are write-once."* Editing the rule underneath the verdict
violates that principle without ever touching the protected table.

Deletion is not an escape either: `opinion.requirement_id` is `ON DELETE
RESTRICT`, so a Requirement that has ever been judged cannot be removed.

## Decision

**A Requirement's `text` is immutable.** It is the rule; an Opinion is a verdict
about that wording.

`type` and `legal_reference` are not — D2 itself said the grouping fields
*"não definem a regra — são metadado de apresentação"*. They may be edited
freely: recategorizing a rule in the UI does not change what was judged.
(As first written this ADR said `tab` and `section`; the PGE's data validation
later collapsed both into the single free-string `type` — the principle is
unchanged.)

A rule leaves the catalog by being **retired**, not deleted. `active` returns as
a column, reversing D2 on this point.

| Operation | Allowed |
|---|---|
| `POST /requirements` | Create a Requirement |
| `PATCH /requirements/:id` | `type`, `legal_reference`, `active` — **never `text`** |
| Delete | Never (the FK forbids it, and the trail needs it) |

Rewording a rule is therefore **two acts, not one**: create the new Requirement,
retire the old. They are distinct rows with distinct ids, and every past Opinion
keeps pointing at the exact text it was judged against.

Two reads follow, and must not be collapsed:

- **The catalog** (`active = true`) — what a *new* analysis is judged against;
  what `getCatalog()` hands the AI in a claim payload.
- **A Requirement by id** — resolvable regardless of `active`, because the
  Opinions of an old Process still point at retired rules and the analysis screen
  has to render them.

Writes are **admin-only**. The users-api issues exactly two roles (`admin` |
`regular`) and Traefik already injects `X-User-Role`; a `RolesGuard` reads it.
The catalog is the ruler every analyst's work is measured against — it is not
any single analyst's to move.

## Consequences

- **The audit trail stays true by construction.** There is no code path that can
  change what a past verdict was about. That is a property of the schema, not a
  rule someone must remember.
- **The catalog is append-only and grows forever.** Retired rules accumulate.
  With a catalog of hundreds of rules this is free; it would need revisiting
  at thousands.
- **`UNIQUE(text)` becomes the natural key** — the rule *is* the text, so two
  rows with the same text are the same rule. This is what makes the seed
  idempotent, and it means a spreadsheet containing the same text under two
  types is a data-entry error the seed will reject rather than silently turn
  into two rules the AI pays to check twice.
- **Superseding is not atomic.** It is a `POST` followed by a `PATCH`. An admin
  who forgets the second leaves both rules active, and the AI checks both
  wordings. Accepted deliberately: the failure is visible on the management
  screen and fixable with one more call — unlike the silent corruption the
  alternative buys — and no provenance link (`superseded_by`) is recorded, so
  nobody will be able to say which rule replaced which. Revisit if the catalog
  grows past a size a human can eyeball.
- **The seed does not resurrect.** It inserts what is missing; it does not
  reconcile state. A rule retired through the API stays retired even if it is
  still in the seed file.

## Amendment (2026-07-14): the external code

The PGE's export turned out to carry its own identifiers (`NC0001`…`NC0337`).
They are persisted as `code VARCHAR(20) NULL UNIQUE` — **traceability to the
spreadsheet, nothing more**. The rule is still the `text`, and the code creates
no update path for it.

A code-keyed *atomic supersede* was proposed on the back of it: `PATCH` accepts
`text`, but the service creates a new row (same code, new wording) and retires
the old one in a single transaction — an "edit" to the admin, an untouched
audit trail underneath, and the provenance link this ADR accepted losing. The
team deferred the decision. Until it is made, this ADR stands as written; if it
is adopted, it amends the *mechanics* of superseding, not the decision — no
path may ever rewrite the wording a past Opinion was judged against.

## Rejected alternatives

**Let `PATCH` edit the text.** What was asked for, and what every CRUD scaffold
would give. Rejected: it retroactively falsifies every analysis already made
against that rule, leaving no trace. The whole product is the trail.

**Allow the text to change only while the Requirement has no Opinions.** Covers
the honest case — *"I typo'd it and want to fix it before anyone runs an
analysis"* — and preserves the trail. Rejected as a rule that silently changes
behaviour under the user: the same button works on Tuesday and fails on
Wednesday, for reasons invisible on the screen. Retire-and-recreate does the
same job with one more click and no surprise.

**Keep D2 as written — no `active`, catalog only grows.** Then a reworded rule
becomes a permanent duplicate that nothing can remove, because the FK forbids
deleting a rule that has been judged. The catalog degrades and there is no way
back.
