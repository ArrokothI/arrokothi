# Identity, attempts and accepted versions

[Core](core.md) named the pieces of one exchange. This page names how those pieces are told apart when a caller retries, a host is replaced, or a later reader asks what was actually accepted. [Creation](../mechanisms/creation.md) and [the execution cycle](../mechanisms/execution-cycle.md) apply the terms; they are defined here and nowhere else.

The names are conceptual. They do not freeze an API, a field list, or a wire spelling.

They also do not substitute for one another. “Same request,” “same effort at this Activation,” “same send,” “same accepted state,” and “what this answer covers” are five different questions. Reusing one identity for another’s question is how work is done twice, or not at all.

- **Same request from a caller** — [request key and Input ID](#request-key-and-input-id).
- **Same effort at one Activation** — [Runtime attempt](#runtime-attempt) and [writer epoch](#writer-epoch).
- **Same send** — [dispatch and delivery](#dispatch-and-delivery).
- **Same accepted state** — [revision](#revision).
- **What an accepted answer covers** — [acceptance, boundary and receipt](#acceptance-boundary-and-receipt).

[Retry versus takeover](../mechanisms/execution-cycle.md#retry-versus-takeover) is the place that puts the first three of those side by side. This page says what each identifier is.

## A running example

The weekly report again, this time for the identities the earlier pages left out.

The application asks ArrokothI to prepare week 37, and chooses the request key `submit-report-17` for that ask. The Kernel accepts one [Execution](core.md#execution) E, with that key, that brief, a pinned program and an authority binding, in a single decision. The network drops the reply. The application sends the same key and the same brief again. That second send is still the original create: it must return E, not mint a sibling.

E’s first [Activation](core.md#activation) goes out as Runtime attempt 1, writer epoch 1. The Runtime drafts the report. The host holding that attempt goes quiet. Recovery authorizes a replacement: same Activation, same pinned progress, same Event batch, writer epoch 2. The original host later reconnects and submits its draft. The draft can be perfect. It is still rejected in full. Epoch 1 is no longer allowed to write *any* part of that Outcome — not the progress, not the acknowledgment, not an intent to publish.

Had epoch 1’s Outcome been accepted first, the next Activation would be a new exchange: new Activation ID, newly selected input. An Outcome written against the old exchange would then be stale for a different reason. Same Activation ID with a new epoch, and a new Activation ID, look identical from outside. They are not the same operation.

The sections below fill in the cases that sketch skipped: a later input that happens to reuse the creation-key text, the other revision kinds, and the fact that “the receipt” is never one object per Execution.

## Request key and Input ID

A caller who did not see a reply cannot tell whether the Kernel accepted the request. They send it again. The Kernel has to decide whether this is the same intention or a second one, and it cannot decide that by reading the payload. Two intentional publications of the same draft are allowed to exist; hashing the draft would collapse them into one request, and the second would be answered as a retry of the first.

A **request key** is the identifier the caller chooses for one intended request, such as `submit-report-17`, and reuses when retrying it. It is not a content hash, and equal content is not identity of request.

An **Input ID** is how that key becomes unique once an Execution exists. It is a triple: authenticated producer namespace, destination Execution ID, and the producer’s request key. The namespace comes from trusted principal context. A payload field named `user_id` does not supply it, and must not be able to. Two producers may both use the text `17` without colliding. One producer sending `17` to two Executions names two different inputs. The triple is never a global, cross-tenant deduplication identifier.

Before an Execution exists, the same idea applies as a **caller-scoped creation key**: authenticated caller scope plus request key identifies one create request, and the binding includes the complete creation content — [Definition](core.md#definition) revision, Runtime contract, authority, initial input. Same scope, same key, different content is a conflict that creates nothing. The key promised “this is the same request,” and different content breaks the promise. A fresh key with identical content is a second intentional run. This is a scope rule, not a new durable object type, and not a token format.

Creation and later input are **separate identity domains**. Accepting the initial Event during creation does not consume a post-creation Input ID. After E exists, the same producer may send ordinary input to E using the text `report-17` — the same text as the creation key. That send is a new ingress request. It gets its own [Event](core.md#event) and its own ingress receipt, even if the payload equals the original brief. Retrying *that* ingress with equal content returns the ingress receipt. Changing the content under that Input ID conflicts. Retrying creation still returns the creation decision. The two lookups never consult each other.

The initial Event keeps creation provenance and a creation receipt. Only later ingress participates in Input-ID replay and conflict lookup. [Later input has a destination](../mechanisms/creation.md#later-input-has-a-destination) walks this from the mechanism side.

If the two domains were one, every Execution would permanently occupy, in its producer’s ingress key space, the text that created it — on input nobody submitted. A later real request using that text would then be answered with the creation receipt, or with a conflict against content the caller did not send. Keeping the domains apart is what lets each boundary have its own identity, and what keeps a receipt from one from being returned for the other.

Deduplication is not unlimited. Lookup respects the [retention contract](../mechanisms/evidence.md#retention-and-deletion). An expired key must never silently become another consequential request. The profile that expires keys publishes that policy; this page does not.

## Runtime attempt

A **Runtime attempt** is the currently authorized effort to perform one unresolved Activation.

The Kernel can ask the Driver to send that Activation again because the first send may not have arrived. That re-send is still the same attempt: same question, same writer. Authorized takeover is the other operation that looks, from outside, like “ask the Runtime again.” It is not the same attempt. It is a *replacement* attempt at the same exchange — same question, new effort, previous effort no longer allowed to commit.

A Runtime attempt is not a [physical action attempt](actions.md#admission-and-physical-action-attempt). The effort that is allowed to submit an Outcome, and the effort that calls the publication service, have different owners, different fences and different lifecycles. A takeover that retires a Runtime attempt does not, by itself, cancel a publication that has already been admitted.

It is also not a process, a native session or a conversation turn. The old attempt may still be computing after it has been replaced. A native job may still be running. What the term identifies is who may currently submit an Outcome for this exchange, not how much work is in flight anywhere.

## Writer epoch

A **writer epoch** identifies which Runtime attempt’s Outcome may be accepted for the current Activation. Within that exchange it is a monotonically increasing integer, or an equivalent total order. Authenticated takeover is the only thing that advances it. Ordinary delivery retry leaves it alone.

The epoch fences the **whole** of [Outcome acceptance](../mechanisms/execution-cycle.md#outcome-acceptance): batch acknowledgment, progress, emissions, Effect intents, wait and deadline, readiness, and next state. It is not a lock on progress. Return to the stalled draft. Epoch 2 is now the writer. Epoch 1’s Outcome arrives, proposing the draft, an acknowledgment of the Events it was given, and an intent to publish. Accepting the progress and dropping the rest — or dropping the progress and keeping the acknowledgment — would leave the accepted record describing a decision nobody made. The whole proposal loses.

The token is not authentication. It is not a lock on a native session, a filesystem, or a shell. Kernel single-writer acceptance cannot fence those; [shared mutation](../mechanisms/resources.md#shared-mutation) and [recovery](../mechanisms/recovery.md) own what has to be true of the native side before a replacement may continue. An already accepted exact duplicate of an Outcome does not go through this fence again: it returns its original [receipt](#acceptance-boundary-and-receipt) and mutates nothing.

Whether the epoch resets when a later Activation begins is not decided here. <!-- OPEN(implementation): whether writer epoch resets across a later Activation. Either reset or continue is conforming so long as a stale epoch for the *current* exchange is always rejected. Do not pin a representation or a starting value. rewrite-index.md §4; WS ID-4; K02-R13-01 --> An example that happens to start each exchange at 1 is an example, not a rule. Treating it as a rule has made conforming implementations unpassable.

“Attempt epoch” formerly meant this writer epoch. Use **writer epoch**.

An **attempt envelope** is the wrapper that carries attempt metadata around the immutable exchange. It is not another epoch, not another identity, and not a recovery mechanism. Takeover replaces the envelope and leaves the exchange’s semantic input untouched — which is what “same Activation ID, advanced epoch” actually says.

## Dispatch and delivery

**Activation dispatch** is the Kernel preparing one Activation and sending it through a Driver toward a Runtime. Its **dispatch intent** is the accepted record of that decision: the exchange input, the reserved [batch](core.md#batch-reservation-and-acknowledgment), and the current attempt, all fixed *before* the send.

The order is the point. A crash between “decided to dispatch” and “the Runtime heard about it” is recoverable only if the Kernel already has a pinned exchange it can redeliver unchanged. Without the intent, restart would have to guess which Events had been meant for that Activation. Dispatch is not Execution creation, and it is not the choice of which Runtime implements the work.

**Delivery** is an ordinary transport verb. Name what is delivered and to whom, every time. “Activation delivery to the Driver” can be in-process. “Driver submission to the native Runtime” can be remote. The logical route Kernel → Driver → Runtime does not require two physical hops. Bytes arriving at either hop are not Outcome acceptance. A Driver reporting that the hand-off was acknowledged has not submitted an Outcome. A reported failure does not prove that native work never started.

The Kernel-owned reporting capability, the attempt-local evidence, and the first-report rule live in one place: the [delivery reporting boundary](../mechanisms/execution-cycle.md#delivery-reporting-boundary). This page does not restate them.

The same English words name neighbouring operations that are not this one. **Action dispatch** is the send of an admitted physical attempt. **Destination-mailbox acceptance** is what message-send success means. **External output delivery** is an adapter pushing accepted output onto a channel. Bare “Execution delivery” names nothing. Do not treat every “delivery” as one subsystem.

## Revision

A **revision** identifies a particular version of a named value or contract. Always name which value. There is no global “the revision.”

| Revision | Who creates or changes it | What it is for |
|---|---|---|
| Accepted progress revision | Kernel, when it accepts replacement progress | Reject an Outcome based on superseded progress |
| Base progress revision | The Activation, copying the accepted version it started from | Compare a proposal against its actual starting point |
| Definition / Runtime contract revision | Definition or integration publisher | Select code, and the meaning of the exchange |
| Progress codec version | Runtime or Driver publisher | Decode continuation with compatible code |
| Operation / schema revision | Operation owner | Pin action meaning and validation |
| Resource / state revision | Resource service, when its value changes | Preconditions, exact consent, conflict detection |
| Action evidence revision | Trusted settlement or reconciliation path | Append a refinement without rewriting consumed evidence |

These labels need not be integers, and they need not share a counter. A Definition revision can be a digest; a codec version can be a string; evidence can be an append-only sequence. What they share is the job: name one version so a later decision can say whether it is still the one in force.

Two progress revisions sit on every Activation and are easy to treat as one number. The **accepted** progress revision is the Kernel’s current pin — whatever the last accepted Outcome installed. The **base** progress revision is a copy of that pin taken when this Activation was created. An Outcome is checked against the base it claims to have started from. They agree at dispatch. They disagree exactly when another Outcome has already committed. Writer epoch 2 working from accepted progress 4 says only that: attempt 2 started from 4. It does not say that attempt 1 produced a progress 5. The epoch says who may write. The progress revision says which saved state they started from. They move for different reasons.

[Definition](core.md#definition) revision and [Runtime contract](core.md#runtime-contract) revision are the other pair that collapse under a casual reading of “can this code still run this work.” One answers *which program*. The other answers *how this exchange is read*. Compatibility is decided by those pins, never by an Agent or Workflow tag.

## Acceptance, boundary and receipt

**Acceptance** is an authoritative decision to record a request or fact under the relevant contract. Several other events get called by the same word, and they are not interchangeable. Bytes arriving on the network are not acceptance. Validation alone is not acceptance. [Admission](actions.md#admission-and-physical-action-attempt) of an external action is not Outcome acceptance, and an Outcome receipt is not proof that the action ran. Calling all of those “acceptance” is how a TCP ACK starts being treated as a committed Outcome.

An **atomic acceptance boundary** names the facts that must commit together or not at all. It is a consistency requirement. It is not a machine, and it is not a transport hop. Creation binds Execution ID, program, authority and initial input in one decision because an Execution that existed before those were fixed would be a lifetime with no accepted meaning. Outcome acceptance commits acknowledgment, progress, output, intents and next state together because they describe one Runtime decision. When the thing in view is an API, a process, an owner or an interface, say that.

A **receipt** is retained evidence that one specific request was accepted at one named boundary, at a particular revision or position. It can be returned to a caller. It is not inherently a Kernel-to-Runtime acknowledgment. An **acceptance position** orders accepted facts inside the owning record or domain. It is not a global clock, and one Execution’s positions say nothing about another’s.

| Receipt scope | Question it answers |
|---|---|
| Creation / input ingress | Was this creation, or this input, accepted? |
| Activation dispatch intent | Was this exact dispatch intent recorded? |
| Outcome acceptance | Was this Runtime proposal accepted? |
| Effect admission | Was this physical attempt authorized and recorded? |
| Effect settlement | Was this evidence or result accepted? |
| Child / message operation | Was this specific child or routing operation accepted? |

There is no single receipt per Execution. A receipt proves its named decision and nothing further. A creation receipt is not proof that native work started. A dispatch-intent receipt is not proof the Driver delivered anything. An Outcome receipt is not proof that an action proposed in that Outcome ran. Kernel timeout acceptance records an internal fact and introduces no seventh caller-facing receipt, because no external submitter asked for it.

Exact duplicates return the retained decision, only within the declared retention contract. Different content under an accepted identity conflicts, and mints no receipt. A refusal mints none.

Lookup authenticates and scopes access before revealing content *or existence*. The shape and timing of a refusal must not let a caller tell another principal’s hidden record from a missing one. Asking about an Execution you cannot see, and asking about an Execution that does not exist, must be indistinguishable.

How a receipt is serialized, how a token is represented, and how a request key is hashed are implementation choices. <!-- OPEN(implementation): receipt serialization, token representation, and request-key hashing. rewrite-index.md §4; WS §2 --> What is fixed is the scope of each receipt, the boundary it names, and the fact that it is evidence of that decision only.
