# Identity, attempts and accepted versions

[Core](core.md#kernel) defines the pieces of one exchange; [actions](actions.md) defines the terms used when an Execution asks the world to do something. This page explains how those pieces stay distinct when a caller retries, a host is replaced, or a reader asks what was actually accepted.

Every identity answers the same question: *same as what?* Two create requests, two efforts at one exchange, two sends, two saved states and two claims of acceptance each need a different answer. Content alone is not enough: different requests may have identical content, while one request may arrive twice. Each comparison therefore needs a **scope** and an **equality rule**. The names here provide those without fixing an API, wire format or storage schema. [Creation](../mechanisms/creation.md) and [the execution cycle](../mechanisms/execution-cycle.md) apply them.

- **Requests from a caller** — [request key and Input ID](#request-key-and-input-id), including the creation key used before an Execution exists.
- **Efforts at one exchange** — [Runtime attempt](#runtime-attempt) and [writer epoch](#writer-epoch).
- **Sends** — [dispatch and delivery](#dispatch-and-delivery).
- **Accepted states** — the separate kinds of [revision](#revision).
- **What an acceptance covers** — [acceptance, boundary and receipt](#acceptance-boundary-and-receipt).

## A first example

An application asks for a weekly report. Its create request carries the caller-chosen key `report-17` and the content "report for week 37." The response is lost, so the application retries with the same scoped key and content. Exactly one Execution exists; the second call receives the first call's decision. The key, not a content hash, makes "again" mean the same request. A different key can express a second intentional report, even when the content is identical.

The [Kernel](core.md#kernel) prepares the first exchange by pinning accepted [progress](state.md#progress) revision 0, the [batch](core.md#batch-reservation-and-acknowledgment) of [Events](core.md#event), and the other exchange data before handing the [Activation](core.md#activation) to the Driver. The Activation ID names the question. The writer epoch says which Runtime attempt's Outcome may be accepted.

The host goes quiet and its [scheduler lease](operations.md#three-clocks) expires. That proves the lease lapsed, not that the process died or the native work failed. If [recovery](state.md#recovery-and-re-execution) establishes the Driver-specific permission for takeover, a replacement Runtime attempt is authorized. It keeps the same Activation ID, pinned progress and batch, while the writer epoch advances from 1 to 2.

The original host returns with a good draft, but its Outcome is rejected in full because its epoch is stale. The question did not disappear; only the authority to commit its answer moved. Attempt 2 finishes, and the Kernel accepts its Outcome at progress revision 1 and returns a receipt. That receipt proves the proposal was accepted at its boundary and position; it does not prove that a publication requested by the proposal happened.

Later, the caller sends ordinary input to the same Execution using the text `report-17` again. Creation and later ingress are separate identity domains, so this is a new input with its own Event and ingress receipt, not a creation replay.

The story contains five different questions. [Retry versus takeover](../mechanisms/execution-cycle.md#retry-versus-takeover) puts the first three beside one another; the sections below define each one.

## Request key and Input ID

A **request key** is a caller-chosen identifier reused when retrying one intended request. It is not a content hash. Two intentional requests may contain identical bytes, while a retry may need to be recognized without deriving anything from its content. When a key is reused, the recorded content is checked: same scoped key and same content returns the recorded decision; different content is a conflict, not an update. A different key means a different request.

An **Input ID** is the triple *authenticated producer namespace, destination Execution ID, producer request key*. The namespace comes from trusted principal context at ingress, never from a `user_id` or other field in the payload. Two producers may use the text `17` without colliding, and one producer may use `17` for two Executions without colliding. An Input ID is not a global cross-tenant deduplication identifier; equal content does not imply equal input.

A **caller-scoped creation key** applies the same rule before an Execution exists. The caller scope plus request key identify one create request, and the key binds the complete creation content — [Definition](core.md#definition) revision, Runtime contract, authority and initial input. Reusing the key with changed content is a conflict that creates nothing. This is a scope rule, not a new durable object or a token-format decision.

Creation and later input are separate identity domains. Accepting the initial input during creation does not consume a post-creation Input ID: the initial [Event](core.md#event) keeps its creation provenance and creation receipt, while later ingress may reuse the creation key's text. If the domains were merged, a later input could receive a creation receipt for an ingress that never happened, or genuinely new content could be refused as a conflict for a request the producer never made. [Later input has a destination](../mechanisms/creation.md#later-input-has-a-destination) works through the rule.

The Execution ID belongs to [Execution](core.md#execution), not this page. Its never-reused rule ensures that a destination names at most one logical lifetime.

## Runtime attempt

An **Activation ID** names one immutable semantic exchange: the pinned progress, fixed Event batch and input carried by an [Activation](core.md#activation). It answers *which question is this?* A new Activation ID begins only when the previous exchange has resolved and a genuinely new exchange is prepared; redelivering bytes does not create one.

A **Runtime attempt** is an effort authorized to perform one unresolved exchange. It answers *whose effort is this?* Ordinary delivery retry keeps the same attempt and exchange. An authorized takeover keeps the exchange but replaces the Runtime attempt. A new exchange after resolution replaces both. Confusing these cases makes a late Outcome impossible to classify.

A **physical action attempt** is one invocation of a mediated action through an adapter, defined under [admission](actions.md#admission-and-physical-action-attempt). It is not a smaller Runtime attempt: the first answers the Kernel's question, while the second tries to change something in the world. They have independent owners and fences. A Runtime attempt is also not a model call, conversation turn or native run; the Driver declares that mapping.

## Writer epoch

A **writer epoch** identifies which Runtime attempt's Outcome may be accepted for the current Activation. It advances only when an authenticated takeover is accepted; ordinary redelivery preserves it. The epoch fences the **whole Outcome acceptance**: batch acknowledgment, progress, emissions, Effect intents, waits and deadlines, readiness, and the next lifecycle state. A stale attempt cannot commit only some of its proposal.

The epoch is not authentication, proof of liveness or a physical lock. A reachable host may be stale; a lease expiry does not prove its process died; and fencing does not stop a native session, filesystem or shared resource from being changed. It only decides whose proposal becomes accepted Kernel state. [Shared mutation](../mechanisms/resources.md#shared-mutation) has its own owner.

A stale Outcome is rejected in full even if its bytes match a replacement's. An exact duplicate of an already accepted Outcome under the current epoch returns the original receipt instead of applying the decision twice. Content equality is not authorization.

The concrete epoch representation is open: it may be an integer, fencing token or another ordered value. Whether it resets or continues across a later Activation is also open; only comparison within the current exchange is architectural. A conformance fixture that compared epoch values across different Activation IDs therefore over-constrained conforming implementations. K1.1's per-exchange numbering from 1 is an implementation choice, not architecture.

<!-- OPEN(unassigned): the concrete representation of a writer epoch is not fixed — the protocol requires only a total order within one exchange and the rejection of a stale value. Whoever fixes the form: state it here and delete this marker; until then prose, examples and fixtures must not pin one. rewrite-index.md §4; WS ID-4 -->
<!-- OPEN(unassigned): whether the epoch resets or continues across a later Activation. Both are conforming while a stale epoch for the current exchange is always rejected. K1.1-DEC-2 chose one epoch per exchange starting at 1 — an implementation choice, not architecture. Whoever fixes it: restate this paragraph in those terms and delete this marker. rewrite-index.md §4; WS ID-4; K02-R13-01 -->

**Attempt epoch** is a former name for writer epoch and should stay retired. An **attempt envelope** is a transport or protocol wrapper carrying attempt metadata around the immutable exchange; it is not another identity or recovery mechanism.

## Dispatch and delivery

**Activation dispatch** is the Kernel preparing and sending one Activation through a Driver toward a Runtime. It is not Execution creation. Creation pins the Definition and Runtime-contract revisions; the Driver declares how that contract maps to native work, so the protocol does not require a particular Driver or native mapping to have been selected at creation.

The **dispatch intent** is the accepted record made before sending. It pins the exchange, its reserved batch and current attempt, along with the other data required by [before sending](../mechanisms/execution-cycle.md#before-sending). Recording first makes a crash recoverable: after restart the Kernel can redeliver the same question instead of guessing which Events or progress it had meant to send.

**Delivery** is a transport verb and must name what traveled and to whom. Activation delivery to a Driver may be an in-process call; Driver submission to a native Runtime may be remote. Neither byte arrival nor a Driver delivery report is Outcome acceptance. The Kernel-owned [delivery reporting boundary](../mechanisms/execution-cycle.md#delivery-reporting-boundary) records the first report for each delivery attempt; a late report can update only that attempt's retained operational record. A reported failure does not prove that native work never started, and redelivery is not permission to repeat native work.

A [dispatch of a mediated action](actions.md#admission-and-physical-action-attempt), [destination-mailbox acceptance](operations.md#message-request-and-correlation), and [external output delivery](../mechanisms/output.md#external-delivery) are different operations with different owners. Bare "Execution delivery" names none of them and should be avoided.

## Revision

A **revision** identifies one version of one named value or contract. There is no global "the revision"; these seven kinds have different owners, change points and comparison questions.

| Revision | Who creates or changes it | What comparing it settles |
|---|---|---|
| Accepted progress revision | Kernel, when it accepts replacement progress | Whether a proposal is based on current or superseded progress |
| Base progress revision | Activation, copying its starting accepted revision | Which progress the exchange actually started from |
| Definition and Runtime contract revision | Code or integration publisher | Which program runs and how the exchange is interpreted |
| Progress codec version | Runtime or Driver publisher | Whether stored continuation bytes can still be decoded |
| Operation and schema revision | Operation owner | Which contract validates, approves and settles arguments |
| Resource and state revision | Resource service, when its value changes | Whether an assumed value is still current |
| Action evidence revision | Settlement or reconciliation path | What is known now without rewriting earlier evidence |

For example, a **base progress revision** and writer epoch identify the starting state and authorized effort; neither is a count of all attempts or a global Execution version. The accepted progress revision may have moved since the Activation began. Likewise, a progress codec says how bytes become a value, while a Runtime contract says what that value means. Different revisions catch different incompatibilities, and no shared counter is implied.

## Acceptance, boundary and receipt

**Acceptance** is the authoritative decision to record a request or fact under its contract. A packet arriving and validation passing are not acceptance. **Admission** is an acceptance of an authorized physical-attempt record, but it does not prove that an external service received or performed the action.

An **atomic acceptance boundary** is a set of facts that commits together or not at all. It is a consistency requirement, not necessarily a machine, process or transport edge. [The atomic decisions table](../mechanisms/execution-cycle.md#atomic-decisions-across-the-system) lists the facts owned by each boundary.

A **receipt** is retained evidence that one request was accepted at one named boundary, at a stated revision or position. It may be returned to a caller, but it is not inherently a Kernel-to-Runtime message and carries no permission of its own.

| Receipt scope | Question it answers |
|---|---|
| Creation or input ingress | Was this create or input request accepted? |
| Activation dispatch intent | Was this exact dispatch recorded before sending? |
| Outcome acceptance | Was this Runtime proposal accepted? |
| Effect admission | Was this physical attempt authorized and recorded? |
| Effect settlement | Was this evidence accepted? |
| Child or message operation | Was this child or routing operation accepted? |

There is no single receipt per Execution. An Outcome receipt proves that a proposal was accepted, not that a requested publication occurred. An admission receipt proves authorization and recording, not external receipt. A settlement receipt proves evidence was accepted, not that the outside world obeyed it. Acceptance of a Kernel-minted timeout Event is internal bookkeeping and introduces no seventh caller-facing receipt.

An **acceptance position** orders facts within the record that owns them. It is not a global clock. Receipt lookup must authenticate and scope access before revealing content or even existence; a refusal must not reveal, through its message, shape or timing, whether another principal's record exists.

Retention bounds the promise. Within the declared contract, an exact duplicate returns the retained decision. After retention lapses, the duplicate guarantee ends; the operating profile must publish whether the key is refused, requires fresh intentional input or may be treated as new. It must never silently create another consequential request. [Retention and deletion](../mechanisms/evidence.md#retention-and-deletion) owns the published policy.

What a receipt looks like remains open. It may be an opaque token or structured value; serialization, token representation and request-key hashing are implementation-owned.

<!-- OPEN(unassigned): receipt serialization / token representation and request-key hashing remain implementation-owned. When an owner fixes them: state the choice here and delete this marker. rewrite-index.md §4; WS §2 -->

The page reduces to one test: **same as what, and accepted where?** A request key identifies a caller's retry; an Input ID adds producer and destination. A Runtime attempt identifies an effort; the writer epoch says which effort may commit. Dispatch identifies a recorded send decision, a revision identifies one versioned value, and a receipt identifies one boundary. Keeping those answers separate is what permits retry, recovery and reconciliation without confusing repeated work with new work, or accepted evidence with success in the world.