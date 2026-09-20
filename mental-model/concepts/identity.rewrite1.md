# Identity, attempts and accepted versions

These are the canonical definitions of the terms that answer "is this the same as that?" Each one is defined here and nowhere else. How they are applied belongs elsewhere: [creation](../mechanisms/creation.md) owns how a request becomes an Execution and an Event, [the execution cycle](../mechanisms/execution-cycle.md) owns how one Activation is retried, taken over, and answered.

Names below are conceptual. They do not freeze API or wire spelling. An implementation may call a request key `idempotencyKey` and carry a writer epoch as a number, a string, or a pair — what matters is that it keeps the sameness promises this page states, not the field names it uses.

## A running example

Keep one Execution in mind for the whole page. The application asks ArrokothI to prepare the weekly report. It creates Execution E with the caller-chosen key `submit-report-17`. The Kernel accepts the creation, pins the Definition and Runtime contract revisions, and records the initial input as the Execution's first accepted Event.

The Kernel then asks the Runtime to advance E. That question is Activation A1: start from the pinned progress, take this fixed batch of Events into account. The Driver carries A1 to the Runtime. That carriage is the first Runtime attempt, working under writer epoch 1. The Runtime answers with an Outcome — saved progress, some output, and a next step — and the Kernel accepts it at progress revision 1. The caller gets a receipt: yes, that Outcome was accepted.

Then things go wrong in the ordinary ways networks and processes go wrong, and each wrongness needs a different word:

- The application's first creation request times out on the way back, so the application sends it again with the same key `submit-report-17`. The Kernel must recognize the second send as the same request, not a second report.
- The first delivery of A1 may never have arrived, so the Kernel sends A1 again unchanged. The Runtime must not treat the second send as a second question.
- The attempt stalls — the host dies, the job hangs — and an operator authorizes a replacement effort at the same A1. The Kernel must let the replacement commit and refuse the stale original when it finally answers, even though the two answers look identical.
- A year later someone asks "was this accepted?" for each of those moments. Each question needs its own receipt, because proof that the creation was accepted says nothing about whether the Outcome was.

Six sections below name the six sameness questions in that story: are two *requests* the same, are two *efforts at one Activation* the same and which one may win, are two *sends* the same, are two *accepted states* the same, and what does a *receipt* actually prove.

Each identity answers exactly one of those questions. Reusing one of them for another's question is how a system produces duplicate reports or loses answered work — the failure this whole page exists to prevent.

## Request key and Input ID

A caller retries by sending the same request again. The Kernel has to tell "same request, sent twice" from "two requests that happen to look alike." That distinction is what this section owns.

A **request key** is a caller-chosen identifier the caller reuses when retrying one intended request. `submit-report-17` is a request key. It is not a content hash. Two intentional requests may carry byte-identical content and still be different requests — the application meant to prepare two reports — and two sends of one request may carry slightly different envelopes and still be the same request.

A key by itself is not enough, because two different callers can choose the same text. An **Input ID** is the triple that makes a post-creation input unique: the authenticated producer namespace, the destination Execution ID, and the producer's request key. The namespace comes from trusted principal context — who the Kernel authenticated — never from a payload field the caller wrote. Two producers can each use the text `17` without colliding. One producer can send `17` to two Executions and name two different inputs. An Input ID is never a global cross-tenant deduplication ID, and equal content never implies the same request.

Creation needs the same retry idea before any Execution exists to address. A **caller-scoped creation key** is the authenticated caller scope plus the request key, identifying one create request, and its binding includes the complete creation content — Definition revision, authority, initial input. This is a scope rule, not a new durable object type and not a fixed token format. Retrying creation with the same key but different content is a conflict that creates nothing, because the key promised "this is the same request as before" and different content breaks that promise.

Creation and later input use separate identity domains. Accepting the initial Event during creation does not consume a post-creation Input ID. If the same producer later sends input carrying the same key text to the now-existing Execution, that send is a new ingress request with its own Input ID, not a creation replay and not a conflict. The initial Event keeps its creation provenance and its creation receipt; only later ingress participates in Input-ID replay and conflict lookup. [Later input](../mechanisms/creation.md#later-input-has-a-destination) owns the worked reuse case.

Why two domains rather than one shared key space? Because a shared space forces a choice between two wrong answers. Either the later input replays as "already accepted" and a genuine new instruction is silently dropped, or it conflicts as "same key, different content" and a legitimate follow-up is refused. Neither describes what happened: the creation happened once, and then a new thing arrived. Separate domains let each answer stay true — the creation receipt proves the creation, the Input-ID receipt proves the later input — without one lookup corrupting the other.

What this section is not: it does not promise that any caller can deduplicate any other caller's work, it does not let a payload claim its own namespace, and it does not turn "same bytes" into "same request."

## Runtime attempt

An Activation is one immutable semantic exchange — the pinned progress revision, the reserved Event batch, and the input the Runtime is asked to advance from. That exchange needs a name that survives the ordinary accidents of delivery. An **Activation ID** is that name. The Kernel mints a new one only for a genuinely new exchange, after the previous one has resolved.

Doing the work the exchange asks for is a separate fact from the exchange itself. A **Runtime attempt** is the currently authorized effort to perform one unresolved Activation exchange. The distinction matters because one exchange can have more than one effort, spread across time, while still being one question.

Ordinary re-sending is still the same attempt. The Kernel sends A1; the network drops it; the Kernel sends A1 again with the same Activation ID, the same pinned input, the same batch, and the same writer epoch below. The Runtime receiving it twice has received one question twice, not two questions. Answering twice is harmless: the second answer is recognized as a duplicate of the first.

Authorized takeover creates a replacement attempt of the same exchange. The host holding A1 dies; recovery decides the original effort may no longer commit; the Kernel authorizes a new effort at A1 with the same Activation ID and the same pinned input but an advanced writer epoch. This is a new attempt at the same question, not a new question. The old effort may still be computing somewhere — a disconnected process does not know it was replaced — and if it answers, its answer is checkable as stale rather than mistaken for a second exchange.

Use **physical action attempt** for a service invocation through a trusted adapter. It has a different owner and a different lifecycle from a Runtime attempt, and the two must never share a counter or a fence. A Runtime attempt is fenced by the writer epoch below. A physical action attempt is fenced by action dispatch ownership, which [actions](actions.md#admission-and-physical-action-attempt) defines.

A Runtime attempt is not a model call, not a conversation turn, and not a native run. The Driver may map one Activation onto several native calls, or several Activations onto one long-lived session. The attempt counts efforts at the Kernel's exchange. How many native calls an effort took is the Driver's business.

## Writer epoch

Two efforts at one Activation can both answer. Only one answer may become accepted state. The **writer epoch** is the identity that says which effort's answer that is.

Concretely, a writer epoch identifies which Runtime attempt's Outcome may be accepted for the current Activation. It is a monotonically increasing order within that exchange — an integer or any equivalent total order. Only authenticated takeover advances it. Ordinary delivery retry preserves it. Whether it resets for a later Activation is implementation-owned: the protocol leaves that open, and pinning it one way or the other would make some conforming implementation unpassable.

The epoch fences the entire Outcome acceptance, not progress alone. Batch acknowledgment, replacement progress, emissions, Effect intents, the wait and deadline, the readiness, and the next state all commit or all refuse together, and the epoch guards all of them together. Fencing progress alone would admit the incoherences [core](core.md#outcome) warns about: an acknowledgment accepted without the progress that accounted for it loses an Event the Runtime never processed into accepted state, and an action intent accepted without its deciding progress holds an obligation no saved state remembers asking for. The epoch exists so a stale attempt cannot smuggle any part of a superseded decision through, however innocent that part looks in isolation.

The epoch token is not authentication, and it is not a lock on a native session or a filesystem. Knowing the current number authorizes nothing; the Kernel checks it only after authenticating the submitter and only for the question "may this attempt's Outcome for this Activation be accepted." A stale native session mutating shared files after takeover is a Driver containment problem, not something a larger epoch number prevents. Fencing decides which proposal becomes accepted truth. It never reaches into the world and stops a process.

Two edge rules complete the picture, and they are easy to run together because both involve "an answer that looks like one already seen":

- An Outcome from a superseded epoch is rejected in full, even when its bytes are identical to the replacement's. Content equality is not authorization. The late answer from epoch 1 after takeover to epoch 2 changes nothing — no acknowledgment, no progress, no intents — because the effort that produced it is no longer the effort allowed to commit.
- An already accepted exact duplicate from the *current* epoch instead returns its original receipt. Accepting it twice would double-count one decision; refusing it as a failure would lie about a success. Returning the retained receipt says the one true thing: this was accepted, once, and here is the proof.

An older name for this identity, "attempt epoch," means exactly this writer epoch — use **writer epoch** everywhere. An **attempt envelope** is the transport or protocol wrapper carrying attempt metadata around the immutable exchange. It is not another epoch, another identity, or another recovery mechanism. Takeover replaces the envelope's metadata without changing the exchange's semantic input, which is precisely why the Activation ID stays fixed while the epoch advances.

## Dispatch and delivery

Sending is where an accepted decision meets an unreliable network, and this section keeps the words for the two apart.

**Activation dispatch** is the Kernel's preparation and sending of one Activation through a Driver toward a Runtime. Its **dispatch intent** is the accepted record the Kernel fixes before sending: the exchange input, the reserved batch, and the current attempt. Fixing that record first is what makes a crash between "decided to send" and "actually sent" survivable — the intent survives, so the same exchange can be sent again unchanged rather than reconstructed from memory.

**Delivery** is an ordinary transport verb. Always say what was delivered and to whom. "Activation delivery to the Driver" can be an in-process handoff. "Driver submission to the native Runtime" can be a remote job submission. The logical route Kernel → Driver → Runtime requires no two physical hops; one process may host all three, and a remote provider may supply the last leg as a job API. Receipt of bytes at either hop is not Outcome acceptance. Bytes arriving proves a message moved. Acceptance proves the Runtime's proposal became accepted state. The [delivery reporting boundary](../mechanisms/execution-cycle.md#delivery-reporting-boundary) owns the explicit reporting capability by which a Driver tells the Kernel "the hand-off was acknowledged," including the first-report rule and what a late or missing report means — but no sentence here depends on following that link to be true.

Three other operations use nearby words and must not be confused with Activation dispatch. **Action dispatch** sends an admitted action attempt through a trusted adapter. **Destination-mailbox acceptance** records that a routed message arrived in its destination Execution's mailbox. **External output delivery** gets accepted output to a person or a channel. Each has its own mechanism and its own receipt. Bare "Execution delivery" names none of them — do not use it.

Dispatch is also not creation and not Runtime selection. Creating an Execution brings a new lifetime into being with its authority and initial input bound atomically. Dispatching advances an existing lifetime by asking its already-selected Runtime to do the next unit of work. Choosing which Runtime implements an Execution happens once, at creation, through the pinned Definition and contract revisions. Dispatching assumes that choice and asks the next question under it.

## Revision

An accepted system holds many versioned things at once — progress, code pins, schemas, resources, evidence — and "the revision" without qualification could mean any of them. A **revision** always identifies a particular version of a named value or contract. Always name which value. There is no global "the revision."

| Revision | Who creates it, and when it changes | What it is for |
|---|---|---|
| Accepted progress revision | The Kernel, when it accepts replacement progress | Rejecting an Outcome built on superseded progress |
| Base progress revision | The Activation, which copies the accepted version it started from | Comparing a proposal against its actual starting point |
| Definition / Runtime contract revision | The Definition or integration publisher | Selecting the code and the protocol meaning that read the exchange |
| Progress codec version | The Runtime or Driver publisher | Decoding saved continuation with compatible code |
| Operation / schema revision | The operation owner | Pinning the meaning and validation an action was admitted under |
| Resource / state revision | The resource service, when its value changes | Preconditions, exact consent binding, and conflict detection |
| Action evidence revision | The trusted settlement or reconciliation path | Appending a refinement without rewriting evidence already consumed |

The point of keeping seven separate counters is that each one changes for a different reason, under a different authority, at a different moment. Collapsing any two answers a question nobody asked with a number that means two things at once.

The report example shows the failure that separation prevents. Suppose A1 works from accepted progress revision 4 under writer epoch 2. That sentence says "attempt 2 is working from accepted progress 4." It does not say attempt 1 produced an accepted progress 5 — attempt 1 may never have answered at all. A reader who treats progress revisions and epochs as one shared counter will go looking for a revision 5 that never existed, and worse, may treat the epoch number as a progress version and accept an Outcome against the wrong starting point. Separate names keep the comparison honest: the base revision in the Activation must equal the accepted revision the Outcome was built on, whatever the epoch happens to be.

These labels need not all be integers and need not share a counter. One store may number progress revisions sequentially while operation revisions are content hashes and evidence revisions are timestamps. The protocol asks only that eachKind orders its own versions well enough to answer "is this the version I think it is," never that all kinds share one number line.

## Acceptance, boundary and receipt

The last group answers the question the other five leave open: once the Kernel has decided something, what proves it, and what exactly does that proof cover.

**Acceptance** is the Kernel's authoritative decision to record a request or a fact under the relevant contract. Receiving a network packet is not acceptance. Validating a shape is not acceptance. Admitting an external action for sending is not acceptance of its result. Each of those is a real event, and none of them is the decision this term names.

Some facts must commit together or not at all. An **atomic acceptance boundary** names such a set. It is a consistency requirement, not necessarily a machine or transport boundary: Outcome acceptance commits progress, batch acknowledgment, emissions, Effect intents, wait state, and next state in one step, wherever the store lives. Elsewhere in these pages, "API," "process," "owner," or "interface" say what they mean — "boundary" here always means an atomic acceptance boundary unless a sentence explicitly qualifies it otherwise.

A **receipt** is retained evidence that one specific request was accepted at one named boundary and revision or position. It can be handed back to a caller, but it is not inherently a Kernel-to-Runtime acknowledgment message. Most receipts travel toward the caller that asked — the application that created, the Runtime that proposed — rather than across the Kernel/Runtime divide. An **acceptance position** orders accepted facts within their owning record or domain. It is not a global clock: position 40 in one Execution's history says nothing about position 40 in another's.

Each receipt answers exactly one question:

| Receipt scope | The question it answers |
|---|---|
| Creation / input ingress | Was this creation or this input accepted? |
| Activation dispatch intent | Was this exact dispatch intent recorded? |
| Outcome acceptance | Was this Runtime proposal accepted? |
| Effect admission | Was this physical attempt authorized and recorded? |
| Effect settlement | Was this evidence or result accepted? |
| Child / message operation | Was this specific child-creation or routing operation accepted? |

There is no single receipt per Execution, and a receipt proves nothing beyond its named decision. An Outcome receipt proves the proposal was accepted — it does not prove any action inside it ran. An admission receipt proves an attempt was authorized and recorded — it does not prove the service received it. A settlement receipt proves evidence was accepted — it does not prove the evidence is true beyond what the trusted path vouches for. Treating any one receipt as proof of a neighboring decision is how a system comes to believe a report was published because proposing the publication was accepted.

Two closing rules keep receipts honest over time. First, the Kernel's own timeout acceptance — minting the timeout Event when a wait generation expires — records an internal fact and introduces no seventh caller-facing receipt API. There is nothing for a caller to retry there, so there is nothing to prove to one. Second, lookup authenticates and scopes access before revealing content or existence, and a refusal must not distinguish another principal's hidden record from a missing one in either shape or timing. Exact duplicates return their retained decisions, but only within the declared retention contract — a receipt promise is bounded by how long the deployment promises to keep the proof, not forever.

Receipt serialization, token representation, and key hashing remain implementation choices. What the protocol fixes is which questions have receipts at all, and what each one is allowed to prove.
