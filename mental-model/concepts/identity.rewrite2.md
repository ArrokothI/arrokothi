# Identity, attempts and accepted versions

Every “is this the same?” question in ArrokothI has a scope and an equality rule, and the wrong pair is how work is done twice or not at all. This page names the identifiers that make those questions answerable. [Creation](../mechanisms/creation.md) and [the execution cycle](../mechanisms/execution-cycle.md) apply them.

The names below are conceptual. They do not freeze an API, a field list or a wire spelling.

Each identity answers a different “same as what?” Reusing one of them for another’s question is the usual source of duplicate work or lost work.

- **Same request from a caller** — [request key and Input ID](#request-key-and-input-id).
- **Same effort at one Activation** — [Runtime attempt](#runtime-attempt) and [writer epoch](#writer-epoch).
- **Same send** — [dispatch and delivery](#dispatch-and-delivery).
- **Same accepted state** — [revision](#revision).
- **What an accepted answer covers** — [acceptance, boundary and receipt](#acceptance-boundary-and-receipt).

[Retry versus takeover](../mechanisms/execution-cycle.md#retry-versus-takeover) shows the three cases where mixing these matters most.

## A running example

Follow one Execution through these terms before the detailed definitions.

The application creates Execution E with request key `submit-report-17` and the week-37 brief. That key, together with the authenticated caller, identifies *this create request*. The Kernel accepts creation as one decision: E exists, its program is pinned, its authority is bound, and the brief is the initial input. A later retry with the same caller, the same key and the same content is still that create. It must not mint a second Execution.

E’s first [Activation](core.md#activation) runs as Runtime attempt 1 under writer epoch 1. The Runtime drafts the report. If that attempt stalls and an operator authorizes takeover, the question stays the same — same Activation ID, same pinned progress, same Event batch — and writer epoch advances to 2. Epoch 1’s [Outcome](core.md#outcome), arriving late, is rejected in full even if the draft looks correct. Nothing about its content changed. What changed is who is allowed to answer.

If, instead, the first Outcome is accepted, the next Activation is a new exchange: a new Activation ID, newly selected input. An Outcome written against the old exchange is stale for a different reason.

The sections below define each of these terms, and cover the cases this summary skips — duplicate retries, the other revision kinds, and receipt scope by boundary.

## Request key and Input ID

A **request key** is a caller-chosen identifier reused when retrying one intended request, such as `submit-report-17`. It is not a content hash. Two intentional requests may carry identical content — two publications of the same draft, two “continue” messages with the same text — and must still be distinguishable. Hashing the payload would collapse them into one request, and the second would look like a retry of the first.

An **Input ID** is a triple: authenticated producer namespace, destination [Execution](core.md#execution) ID, and producer request key. The namespace comes from trusted principal context, not from a payload field that claims to be a `user_id`. Two producers can both use the text `17` without colliding. The same producer sending `17` to two Executions names two different inputs. An Input ID is never a global cross-tenant deduplication identifier. Equality of content is not identity of request.

A **caller-scoped creation key** applies the same retry idea to creation, before an Execution exists. The authenticated caller scope and request key identify one create request, and its binding includes the complete creation content — [Definition](core.md#definition) revision, Runtime contract, authority, initial input. This is a scope rule, not a new durable object type and not a fixed token format. Same scope, same key, different content is a conflict that creates nothing: the key promised “this is the same request as before,” and different content breaks that promise. A fresh key with identical content is a second intentional run.

Creation and later input use **separate identity domains**. Accepting the initial Event during creation does not consume a post-creation Input ID. A later input from that same producer may reuse the creation-key text; it is a new ingress request, not a creation replay and not a conflict against an Event nobody submitted.

The weekly report makes the separation concrete. Account A creates E with creation key `report-17`. A then sends ordinary input to E with request key `report-17`. That first ingress gets its own [Event](core.md#event) and its own ingress receipt, even if the payload equals the initial brief. Retrying that ingress with equal content returns the ingress receipt. Changing the content under that same Input ID conflicts. Retrying creation still returns the creation decision. The two lookups never consult each other.

The initial Event keeps creation provenance and a creation receipt. Only later ingress participates in Input-ID replay and conflict lookup. [Later input has a destination](../mechanisms/creation.md#later-input-has-a-destination) walks the same example from the mechanism side.

Folding the two domains into one would permanently burn, for every Execution, one ingress key — the creation-key text — on input that was never submitted. A producer who then used that text as a real later request would be answered with the creation receipt, or with a conflict against content they did not send. Keeping the domains apart leaves each boundary with its own identity, and a receipt from one is never returned for the other.

Deduplication is not unlimited. Lookup respects the [retention contract](../mechanisms/evidence.md#retention-and-deletion). An expired key must never silently become another consequential request. The exact expired-key policy is published by the profile that expires keys; it is not decided here.

## Runtime attempt

A **Runtime attempt** is the currently authorized effort to perform one unresolved Activation exchange.

Ordinary re-sending to the [Driver](core.md#execution-driver) is still the same attempt. The Kernel is not asking a new question, and it is not authorizing a new writer. It is repeating a send that may not have arrived. Authorized takeover creates a *replacement* attempt of that same exchange: same question, new effort, previous effort no longer allowed to commit.

Use **physical action attempt** for a service invocation. It has a different owner, a different fence and a different lifecycle. The Runtime attempt that proposed “please publish” and the physical attempt that calls the publication service can fail, retry and complete independently. [Admission](actions.md#admission-and-physical-action-attempt) fences the latter; writer epoch fences the former.

A Runtime attempt is not a process, a native session or a conversation turn. A disconnected old attempt may still be computing. A native job may still be running. What the term identifies is who is currently allowed to submit an Outcome for this exchange, not how much work is in flight anywhere.

## Writer epoch

A **writer epoch** identifies which Runtime attempt’s Outcome may be accepted for the current Activation. It is a monotonically increasing integer, or an equivalent total order, *within that exchange*. Only authenticated takeover advances it. Ordinary delivery retry preserves it.

Whether it resets for a later Activation is implementation-owned. Pinning a representation the protocol left open — comparing epoch values literally across new Activation IDs, for example — is not a rule this page states, and treating an example as if it were has made conforming implementations unpassable. An implementation may start each exchange at 1, or continue a counter; either is fine so long as a stale epoch for the *current* exchange is always rejected.

The epoch fences **the entire Outcome acceptance**: batch acknowledgment, progress, emissions, Effect intents, wait and deadline, readiness and next state. It does not protect progress alone. A late Outcome from epoch 1 after a takeover to epoch 2 is rejected in full even when its draft is correct. Accepting the progress and dropping the rest, or dropping the progress and keeping the acknowledgment, would leave the accepted record describing a decision nobody made.

The token is not authentication. It is not a lock on a native session or a filesystem. Kernel single-writer acceptance cannot fence a shell, a file or a provider session; [shared mutation](../mechanisms/resources.md#shared-mutation) and [recovery](../mechanisms/recovery.md) own those questions. An already accepted exact duplicate of an Outcome returns its original [receipt](#acceptance-boundary-and-receipt) rather than advancing anything.

“Attempt epoch” formerly meant this writer epoch. Use **writer epoch** consistently.

An **attempt envelope** is the transport or protocol wrapper carrying attempt metadata around the immutable exchange. It is not another epoch, not another identity and not a recovery mechanism. Takeover can replace the attempt metadata without changing the exchange’s semantic input — which is exactly what “same Activation ID, advanced epoch” means.

## Dispatch and delivery

**Activation dispatch** is the Kernel’s preparation and sending of one Activation through a Driver toward a Runtime. Its **dispatch intent** is the accepted record that fixes, before sending, the exchange input, the reserved [batch](core.md#batch-reservation-and-acknowledgment) and the current attempt.

Recording the intent before the send is what makes a crash between “decided to dispatch” and “the Runtime heard about it” recoverable. On restart the Kernel finds a pinned exchange it can redeliver unchanged, rather than having to guess which Events it had meant to hand over. Dispatch is not Execution creation, and it is not merely choosing which Runtime implements the work.

**Delivery** is an ordinary transport verb. Always name what is delivered and to whom. “Activation delivery to the Driver” can be in-process. “Driver submission to the native Runtime” can be remote. The logical route is Kernel → Driver → Runtime, without requiring two physical hops. Receipt of bytes at either hop is not Outcome acceptance. A Driver reporting that the hand-off was acknowledged has not submitted an Outcome, and a reported failure does not prove that native work never started.

The Kernel-owned reporting capability, its attempt-local evidence and the first-report rule are specified once in the [delivery reporting boundary](../mechanisms/execution-cycle.md#delivery-reporting-boundary). This page does not restate them.

Several neighbouring operations also use “dispatch” or “delivery,” and they are not this one. **Action dispatch** is the send of an admitted physical attempt. **Destination-mailbox acceptance** is what message-send success means. **External output delivery** is an adapter pushing accepted output to a channel. Bare “Execution delivery” names nothing. Do not treat every use of “delivery” as one subsystem.

## Revision

A **revision** identifies a particular version of a named value or contract. Always name which value. There is no global “the revision.”

| Revision | Creator / change point | Purpose |
|---|---|---|
| Accepted progress revision | Kernel when it accepts replacement progress | Reject an Outcome based on superseded progress |
| Base progress revision | Activation copies the accepted version it started from | Compare a proposal against its actual starting point |
| Definition / Runtime contract revision | Definition or integration publisher | Select code and protocol meaning |
| Progress codec version | Runtime / Driver publisher | Decode continuation with compatible code |
| Operation / schema revision | Operation owner | Pin action meaning and validation |
| Resource / state revision | Resource service when its value changes | Preconditions, exact consent and conflict detection |
| Action evidence revision | Trusted settlement / reconciliation path | Append a refinement without rewriting consumed evidence |

Progress revision 4 with writer epoch 2 means “attempt 2 is working from accepted progress 4.” It does not mean that attempt 1 produced an accepted progress 5. The epoch says which attempt may write. The progress revision says which saved state that attempt started from. They move for different reasons and are not two names for one counter.

These labels need not all be integers, and they need not share a counter. A Definition revision can be a content digest; a codec version can be a semver string; an evidence revision can be an append-only sequence. What they share is the job: name a particular version so a later decision can say whether it is still the one in force.

Two progress revisions in particular are easy to run together because both appear on every Activation. The **accepted** progress revision is the Kernel’s current pin — the last Outcome that installed progress. The **base** progress revision is a copy of that pin as it stood when this Activation was created. An Outcome is checked against the base it claims to have started from. If a later Outcome has already advanced the accepted revision, this one is stale even at a matching epoch. The two numbers agree at dispatch; they disagree exactly when someone else has already committed.

A Definition revision and a Runtime-contract revision are also easy to collapse, because both are pinned at creation and both are about “can this code still run this work.” They answer different halves of that question, which [Definition](core.md#definition) and [Runtime contract](core.md#runtime-contract) already separate: *which program*, and *how this exchange is read*. Compatibility is decided by those pins, never by an Agent or Workflow tag.

## Acceptance, boundary and receipt

**Acceptance** is an authoritative decision to record a request or fact under the relevant contract. Receipt of a network packet is not it. Validation alone is not it. Admission of an external action is not it. Those are real events, and they are different events. Calling all of them “acceptance” is how a page starts treating a TCP ACK as proof that an Outcome committed, or an Outcome receipt as proof that a publication ran.

An **atomic acceptance boundary** names facts that must commit together or not at all. It is a consistency requirement, not necessarily a machine or a transport boundary. Creation binds Execution ID, program, authority and initial input in one decision because an Execution that existed before those were fixed would be a lifetime with no accepted meaning. Outcome acceptance commits acknowledgment, progress, output, intents and next state together because they describe one Runtime decision. Elsewhere say “API,” “process,” “owner” or “interface” when that is what is meant.

A **receipt** is retained evidence that one specific request was accepted at one named acceptance boundary and revision or position. It can be returned to a caller. It is not inherently a Kernel-to-Runtime acknowledgment message. An **acceptance position** orders accepted facts within the owning record or domain. It is not a global clock. One Execution’s positions say nothing about another’s.

| Receipt scope | Question it answers |
|---|---|
| Creation / input ingress | Was this creation or this input accepted? |
| Activation dispatch intent | Was this exact dispatch intent recorded? |
| Outcome acceptance | Was this Runtime proposal accepted? |
| Effect admission | Was this physical attempt authorized and recorded? |
| Effect settlement | Was this evidence or result accepted? |
| Child / message operation | Was this specific child or routing operation accepted? |

There is no single receipt per Execution. A receipt proves nothing beyond its named decision. An Outcome receipt is not proof that an action in that Outcome ran. A creation receipt is not proof that native work started. A dispatch-intent receipt is not proof the Driver delivered anything. Kernel timeout acceptance records an internal fact; it introduces no seventh caller-facing receipt API, because no external submitter requested it.

Exact duplicates return the retained decision only within the declared retention contract. Different content under an accepted identity conflicts, and mints no new receipt. A refusal mints none.

Lookup authenticates and scopes access before revealing content *or existence*. Refusal shape and timing must not distinguish another principal’s hidden record from a missing one. A caller who asks about an Execution they cannot see, and a caller who asks about an Execution that does not exist, receive answers that cannot be used to tell those two cases apart.

Receipt serialization, token representation and request-key hashing remain implementation choices. What is fixed is the scope of each receipt, the boundary it names, and the fact that it is evidence of that decision only.