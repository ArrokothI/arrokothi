# Identity, attempts and accepted versions

“Same request” always needs a scope and an equality rule. This page defines the terms; [creation](../mechanisms/creation.md) and [the execution cycle](../mechanisms/execution-cycle.md) apply them. Names below are conceptual; they do not freeze API or wire spelling.

## A running example

Follow one Execution through these terms before the detailed definitions below. The application creates Execution E using request key `submit-report-17`. Its first Activation runs as Runtime attempt 1 under writer epoch 1. That attempt's Outcome is accepted at progress revision 1, producing a receipt for that Outcome-acceptance boundary. If the attempt stalls and an operator authorizes takeover, writer epoch advances to 2 for a new Runtime attempt of the same exchange; epoch 1's Outcome, if it arrives late, is rejected in full even though nothing about its content changed. The sections below define each of these terms precisely and cover cases this summary skips — duplicate retries, the other revision kinds and receipt scope by boundary.

Each identity answers a different "same as what?" question. Request key and Input ID say whether two *requests from a caller* are the same. Runtime attempt and writer epoch say whether two *efforts to answer one Activation* are the same, and which one is allowed to win. Dispatch and delivery say whether two *sends* are the same. Revisions say whether two *accepted states* are the same. Receipts say what an accepted answer *covers*. Reusing one of these for another's question is the usual source of duplicate work or lost work — the [execution cycle](../mechanisms/execution-cycle.md#retry-versus-takeover) shows the three cases where this matters most.

## Request key and Input ID

A **request key** is a caller-chosen identifier reused when retrying one intended request, such as `submit-report-17`. It is not a content hash: two intentional requests may carry identical content and must still be distinguishable.

An **Input ID** is a triple: authenticated producer namespace, destination Execution ID, and producer request key. The namespace comes from trusted principal context, not a payload's self-declared `user_id`. Two producers can use the text `17` without colliding; the same producer sending `17` to two Executions also names different inputs. It is never a global cross-tenant deduplication ID.

A **caller-scoped creation key** applies the same retry idea to creation, before an Execution exists: the authenticated caller scope and request key identify one create request, and its binding includes the complete creation content. This is a scope rule, not a new durable object type or a fixed token format.

Creation and later input use separate identity domains. Accepting the initial Event during creation does not consume a post-creation Input ID. A later input from that same producer may reuse the creation-key text: it is a new ingress request, not a creation replay or conflict. The initial Event retains creation provenance and a creation receipt; only later ingress participates in Input-ID replay/conflict lookup. See the [reuse example](../mechanisms/creation.md#later-input-has-a-destination).

## Runtime attempt

A **Runtime attempt** is the currently authorized effort to perform one unresolved Activation exchange. Ordinary re-sending to the Driver is still the same attempt. Authorized takeover creates a replacement attempt of that same exchange. Use **physical action attempt** for a service invocation; it has a different owner and lifecycle.

## Writer epoch

A **writer epoch** identifies which Runtime attempt's Outcome may be accepted for the current Activation. It is a monotonically increasing integer, or an equivalent total order, within that exchange. Only authenticated takeover advances it; ordinary delivery retry preserves it. Whether it resets for a later Activation is implementation-owned.

It fences **the entire Outcome acceptance**: batch acknowledgment, progress, emissions, Effect intents, wait/deadline, readiness and next state. It does not protect progress alone. The token is not authentication or a lock on a native session/filesystem. An already accepted exact duplicate instead returns its original receipt.

“Attempt epoch” formerly meant this writer epoch; use **writer epoch** consistently. An **attempt envelope** is the transport/protocol wrapper carrying attempt metadata around the immutable exchange. It is not another epoch, identity or recovery mechanism. Takeover can replace the attempt metadata without changing the exchange's semantic input.

## Dispatch and delivery

**Activation dispatch** is the Kernel's preparation and sending of one Activation through a Driver toward a Runtime. Its **dispatch intent** is the accepted record fixing the exchange input, reserved batch and current attempt before sending. Dispatch is not Execution creation or simply choosing which Runtime implements it.

**Delivery** is an ordinary transport verb: always name what is delivered and to whom. “Activation delivery to the Driver” can be in-process; “Driver submission to the native Runtime” can be remote. The logical route is Kernel → Driver → Runtime, without requiring two physical hops. Receipt of bytes at either hop is not Outcome acceptance. The Kernel-owned reporting capability, its attempt-local evidence and first-report rule are specified once in the [delivery reporting boundary](../mechanisms/execution-cycle.md#delivery-reporting-boundary).

**Action dispatch**, **destination-mailbox acceptance** and **external output delivery** refer to different operations, specified by their respective mechanisms. Avoid bare “Execution delivery” and do not treat every use of “delivery” as one subsystem.

## Revision

A **revision** identifies a particular version of a named value or contract. Always name which value: there is no global “the revision.”

| Revision | Creator/change point | Purpose |
|---|---|---|
| Accepted progress revision | Kernel when it accepts replacement progress | Reject an Outcome based on superseded progress |
| Base progress revision | Activation copies the accepted version it started from | Compare proposal against its actual starting point |
| Definition / Runtime contract revision | Definition or integration publisher | Select code and protocol meaning |
| Progress codec version | Runtime/Driver publisher | Decode continuation with compatible code |
| Operation/schema revision | Operation owner | Pin action meaning and validation |
| Resource/state revision | Resource service when its value changes | Preconditions, exact consent and conflict detection |
| Action evidence revision | Trusted settlement/reconciliation path | Append a refinement without rewriting consumed evidence |

For example, progress revision 4 with writer epoch 2 means “attempt 2 is working from accepted progress 4.” It does not mean that attempt 1 produced an accepted progress 5. These labels need not all be integers or share a counter.

## Acceptance, boundary and receipt

**Acceptance** is an authoritative decision to record a request/fact under the relevant contract. Receipt of a network packet, validation alone and admission of an external action are not interchangeable acceptance points.

An **atomic acceptance boundary** names facts that must commit together or not at all. It is a consistency requirement, not necessarily a machine or transport boundary. Elsewhere use “API,” “process,” “owner” or “interface” when that is what is meant.

A **receipt** is retained evidence that one specific request was accepted at one named acceptance boundary and revision/position. It can be returned to a caller, but it is not inherently a Kernel → Runtime acknowledgment message. An **acceptance position** orders accepted facts within the owning record/domain; it is not a global clock.

| Receipt scope | Question it answers |
|---|---|
| Creation/input ingress | Was this creation/input accepted? |
| Activation dispatch intent | Was this exact dispatch intent recorded? |
| Outcome acceptance | Was this Runtime proposal accepted? |
| Effect admission | Was this physical attempt authorized and recorded? |
| Effect settlement | Was this evidence/result accepted? |
| Child/message operation | Was this specific child/routing operation accepted? |

There is no single receipt per Execution. A receipt proves nothing beyond its named decision: an Outcome receipt is not proof that its action ran. Kernel timeout acceptance records an internal fact; it introduces no seventh caller-facing receipt API.

Lookup authenticates and scopes access before revealing content or existence. Refusal shape/timing must not distinguish another principal's hidden record from a missing one. Exact duplicates return retained decisions only within the declared retention contract. Receipt serialization, token representation and key hashing remain implementation choices.
