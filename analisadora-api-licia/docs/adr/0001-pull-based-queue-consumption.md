# Queue consumption is pull-based via an internal `claim` endpoint

## Context

The design (D3/D6) fixes Postgres-as-queue, HTTP write-back, NestJS as sole
schema owner, and a per-job token — but leaves *who initiates* the hand-off of
a `pending` process to the FastAPI worker unstated. The two docs are in mild
tension: the AI-service doc calls FastAPI "the queue consumer" that "consumes
jobs from the queue" yet "never touches Postgres."

## Decision

**Pull.** NestJS exposes an internal `POST /internal/jobs/claim` endpoint.
FastAPI polls it; each call atomically selects the oldest `pending` process
(`SELECT … FOR UPDATE SKIP LOCKED`), transitions it `pending → processing`, and
returns the payload (presigned file URL + full requirement list + the per-job
token). An idle queue returns `204`. FastAPI never touches Postgres — NestJS
performs all DML — so "FastAPI is the consumer" and "FastAPI never touches
Postgres" are both satisfied.

The claim deliberately does **not** stamp `started_at`: that column belongs to
the human-analysis clock and is set at registration (spec 001 §2). The job clock
is `processing_status` alone; collapsing the two would violate D7.

## Consequences

- **Faithful to the deferred RabbitMQ future (D3).** Consumers pull from a
  broker; the port swaps FastAPI's queue-client from HTTP-against-NestJS to
  AMQP-against-broker, and NestJS's `claim` becomes a publish at enqueue.
- **`claim` authentication is network-topology trust only**, not the per-job
  token. Claim happens *before* FastAPI holds a token (it calls claim to
  *learn* the token), so the token can't guard it; and D6 rejected a static
  global key. Claim is an internal endpoint never exposed by the gateway. This
  rests file-URL + token disclosure on the internal network being unreachable
  from outside — the same assumption D5/D6 already make. A static internal key
  is an additive hardening if the threat model changes.
- **No automatic stuck-job recovery in the MVP.** A visibility-timeout reclaim
  can't distinguish "worker crashed" from "worker still processing a large
  PDF," so it risks re-firing LLM calls (token waste). A process stranded in
  `processing` is a manual intervention. Adding a reclaim later is additive.

## Rejected alternative

**Push** — a NestJS background worker polls its own `pending` rows and POSTs
each to a FastAPI `/analyze` endpoint. Rejected because it makes FastAPI an
HTTP callee rather than a queue consumer (contradicting the AI doc), forces
NestJS to know FastAPI's URL, and diverges from the broker port model.
