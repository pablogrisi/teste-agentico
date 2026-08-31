# CSV → JSON conversion lives in the repo

## Context

The Requirement catalog is seeded from `prisma/seed/requirements.json`, in the
PGE's own shape (`{ lista_requisitos: [...] }` with a nested `metadado`). The
seed pipeline (`requirement.seed.ts`, spec 003) validates that file and inserts
it idempotently.

Until now the JSON was treated as an external artifact: the PGE exported their
spreadsheet, converted it on their side, and handed the JSON over committed
as-is. `requirement.seed.ts` said so explicitly — *"the conversion from their
spreadsheet happens on their side"* — and the whole point of the `parseSeedFile`
validation was to be *"the safety net a CSV parser would otherwise have been"*.

That premise no longer holds. The PGE now hands over a **CSV export**
(`seed_requisitos.csv`), not the finished JSON. The columns are the same fields,
but `metadado` arrives flattened into dotted columns
(`metadado.lei`, `metadado.artigo`, …), UTF-8 with a BOM, CRLF line endings, and
quoted fields carrying embedded commas. Reshaping it by hand is exactly the
fragile, error-prone step the original design wanted to avoid — and doing it
"on their side" is not something this repo controls or can reproduce.

## Decision

**The CSV → JSON conversion lives in the repo**, as a committed script:
`scripts/requirements-csv-to-json.script.ts`
(`npm run requirements:convert`).

- The CSV source is versioned under `prisma/seed/sources/requirements.csv`; it
  is the canonical input.
- The script uses a real CSV parser (`csv-parse`, `bom: true`) — never
  `split(',')` — so the BOM, CRLF and quoted commas are handled correctly.
- It only **transforms**: reads the CSV, re-nests the `metadado.*` columns into a
  `metadado` object (blank cells → `null`, matching `LegalReferenceDto`), and
  writes `prisma/seed/requirements.json`. It does not validate or touch the
  database.
- `parseSeedFile` stays the safety net. It now catches a bad *export* rather than
  a bad hand-edit, but its role is unchanged: reject a malformed file, naming the
  offending row, before anything is written.

The workflow is two steps: `npm run requirements:convert` (regenerate the JSON,
review the diff), then `npm run seed:requirements` (validate + insert).

## Consequences

- **The transformation is reproducible and reviewable.** Regenerating the JSON
  is a command, and the diff on `requirements.json` is inspectable in the PR —
  where before it was an opaque handoff.
- **The generated JSON stays committed.** The seed still reads JSON, not CSV;
  production never runs the converter, so `csv-parse` is a `devDependency`
  (pruned from the production image). The JSON in git remains the source of
  truth the seed consumes.
- **Adopting the CSV as canonical is a source-of-truth change, not a database
  migration.** The current CSV carries 25 rows; the previous JSON carried 337.
  Regenerating shrinks the *file*, but the seed is additive
  (`createMany({ skipDuplicates: true })`, ADR-0004) and never deletes — so a
  re-run does **not** remove rows already in the database. Reducing the live
  catalog, if ever wanted, is a separate deliberate act. The previous 337-row
  file is preserved as `prisma/seed/requirements.legacy.json`.
- **Responsibilities stay split.** The converter reshapes; `parseSeedFile`
  validates; `seedRequirements` inserts. Each is independently testable, and the
  converter carries no Prisma or Nest dependency.

## Rejected alternatives

**Keep converting on the PGE side.** The original design. Rejected because the
PGE now delivers a CSV, not JSON: there is no "their side" conversion to rely on,
and hand-reshaping the export in-repo is the fragile step this avoids.

**Teach the seed to read CSV directly.** Fold the parsing into
`seedRequirements` and drop the intermediate JSON. Rejected: it couples the
insert path to a file format and loses the reviewable, committed artifact the
seed validates. Keeping JSON as the seed's input preserves spec 003 unchanged
and keeps a bad export from ever reaching the database untranslated.
