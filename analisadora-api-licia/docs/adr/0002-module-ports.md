# Each module declares its outbound dependencies as ports

## Context

Design decision D3 requires that the queue transport sit behind an abstraction:
*"nenhum código de negócio consulta o estado da fila diretamente … todo acesso
passa pela abstração de enfileiramento"*, and rests D3's reversibility claim on
it — *"por estar atrás de abstração, o porte para RabbitMQ troca só o
transporte."* The sibling `executora-api` injects `PrismaService` and the MinIO
client straight into its services, which would make that claim false here.

## Decision

Every feature module declares **all** of its outbound dependencies — repository,
queue, object storage, crypto — as ports in a single `<resource>.port.ts` file,
holding each interface next to its injection symbol. Implementations live
alongside (`process.repository.ts`, `process-queue.adapter.ts`, …) and are bound
once, in the module:

```ts
{ provide: PROCESS_REPOSITORY, useClass: PrismaProcessRepository }
```

Services inject the symbol, never the concrete class. Nest cannot inject a
TypeScript interface, so the symbol is load-bearing rather than ceremony.

Everything else stays as `executora` has it: layered NestJS, controller ·
service · module · dto per feature. No hexagonal directory tree, no separate
domain layer, no domain-error hierarchy.

## Consequences

- **The RabbitMQ port (D3, deferred) becomes a one-file change** — a new
  `ProcessQueuePort` implementation, rebound in `ProcessModule`. Nothing in
  `ProcessService` learns that the queue moved.
- **`PostgresProcessQueue` is the only file permitted to treat
  `processing_status` as a queue predicate**, which is exactly what D3's
  inviolable principle asks for and is now mechanically checkable by grepping
  for `SKIP LOCKED` / `processing_status` outside that file.
- **Services are unit-testable without Prisma.** `ProcessService` specs run
  against hand-written in-memory fakes rather than `jest.mock` over the
  generated client — which is what makes AGENTS' ≥80% service coverage cheap
  instead of a mocking chore. This matters more than usual here: Prisma 7's move
  to driver adapters already forced one breaking change to client construction.
- **Cost:** one extra indirection per dependency, and a port file that must be
  kept in step with its implementation. Accepted deliberately; the modules are
  small and the seams are the ones the design doc already named.
- Because a port file imports nothing from its own module, it cannot create an
  import cycle. This retires `executora`'s `.constants.ts` workaround, where the
  injection symbol was exiled to a third file to break the module↔service cycle.

## Amendment (2026-07-14): what a port file may contain

A review of the port files found them accumulating named interfaces for every
method input and return — a layer that neither the NestJS ports & adapters
literature (the community pattern declares ports with *"domain entities and
plain data shapes — no Prisma input types, no HTTP types"*) nor a Go-style
dto/entity/mapper layering has. The convention is therefore sharpened:

- **A port file holds injection tokens, port interfaces, and nothing else** —
  except a type that is genuinely shared domain vocabulary with no other home
  (today: `ProcessingOutcome`). Method inputs and returns are **plain shapes
  inlined in the signature**; implementations and test fakes re-state the
  literal, and structural typing keeps them honest.
- **Wire shapes are classes in `dto/`, and they are the single source of
  truth for their type.** A port may reference one with a **type-only import**
  (`import type`): it is erased at compilation, so the "a port file imports
  nothing from its own module" rule below survives as what it always was — a
  guarantee about *runtime* import cycles. Duplicating a dto class as a port
  interface plus an `implements` clause is retired.
- **Rows-as-entities stands.** Strict hexagonal would also ban Prisma model
  types (`Process`, `Requirement`) from ports, behind a hand-rolled domain
  layer. Rejected again for the reason the original decision gives: the
  modules are small, and the extra layer would add types, not remove risk.

One inline shape carries an invariant: `RequirementRepositoryPort.update`'s
data literal **excludes `text`** — that omission is ADR-0004 enforced by the
compiler. The comment on the signature says so; do not "complete" the shape.

## Rejected alternative

**Inject `PrismaService` and the storage client directly into services**, as
`executora` does. Simpler and one fewer file per dependency, but it puts the
queue's `SELECT … WHERE processing_status = 'pending'` inside business code —
violating D3's inviolable principle — and makes the deferred broker port a
rewrite of `ProcessService` rather than of one adapter.
