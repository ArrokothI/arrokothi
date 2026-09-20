# Identity, attempts and accepted versions

Every question on this page has the same grammar: *is this one the same as that one?* Two create requests from the same caller. Two efforts to answer one question. Two sends of one message. Two saved states. Two claims that something was accepted. None of these can be settled by comparing content, because two genuinely different requests may carry identical content, and one unchanged request may arrive twice looking like two. Each question needs a **scope** that says what range the comparison runs over, and an **equality rule** that says what counts as the same inside that range. The identifiers below supply those, one question at a time.

Their names are conceptual. They say what must be distinguishable and on what basis, not how any API, wire format or storage schema spells it.

## A first example

An application asks for the weekly report, and its create request carries a key it chose itself: `report-17`. The response never comes back — a connection dropped somewhere between the two of them. The application does the obvious thing and sends the same request again under the same key, and exactly one Execution exists at the end of it: the second call is answered with the first one's decision. The key is what makes "again" mean *the same request*, and the caller chooses it rather than deriving it from the content, because the same content could equally well have been a second report somebody genuinely wanted.

The [Kernel](core.md#kernel) now prepares the first exchange. It pins the accepted [progress](state.md#progress) the work starts from, fixes the [batch](core.md#batch-reservation-and-acknowledgment) of [Events](core.md#event) this exchange will carry, records all of that as an accepted decision, and only then hands the [Activation](core.md#activation) to the [Driver](core.md#execution-driver). Two identities are now in play. The Activation ID names the question being asked. The writer epoch — 1, here — names who is allowed to answer it.

The host working on the report goes quiet. Its scheduler lease expires, which proves that time passed and nothing else; the host may be dead, or merely slow and still writing. Recovery establishes that the native work can safely be taken over, and a replacement attempt is authorized. The question does not change: same Activation ID, same pinned progress, same batch. What changes is the epoch, which advances to 2.

Then the original host comes back, holding a perfectly good draft, and submits its [Outcome](core.md#outcome). The Kernel rejects it in full. Not because the draft is bad, and not because the Activation ID is wrong — that ID still names exactly the exchange that is open. It is rejected because the epoch it carries is no longer the one permitted to commit. An earlier draft of this design minted a *new* Activation ID for the takeover instead, and the difference is not cosmetic: under that scheme the late answer would have been refused for naming a question that no longer existed, which is a false account of what happened. The question was live the whole time. Only the right to answer it had moved.

Attempt 2 finishes the draft, and the Kernel accepts its Outcome at progress revision 1, returning a receipt. That receipt is evidence of one decision — this proposal was accepted, at this boundary, at this position — and of nothing the proposal asked for.

Five kinds of identity appeared in that story, and each answers a different "same as what?"

- **Requests from a caller** — [request key and Input ID](#request-key-and-input-id), including the [creation key](#request-key-and-input-id) that works before an Execution exists.
- **Efforts at one exchange** — the [Runtime attempt](#runtime-attempt) that performs an Activation, and the [writer epoch](#writer-epoch) that decides which attempt may commit.
- **Sends** — [dispatch and delivery](#dispatch-and-delivery), and why "delivery" always has to name what travelled and to whom.
- **Accepted states** — the several kinds of [revision](#revision), which do not share a counter.
- **What an accepted answer covers** — [acceptance, boundary and receipt](#acceptance-boundary-and-receipt).

Reusing one of these to answer another's question is the usual origin of duplicated work or lost work. The report runs through all five as the example below.

## Request key and Input ID

A **request key** is an identifier the caller chooses and reuses when it retries one intended request. `report-17` is one. It exists so that a caller who never heard an answer can ask again without risking a second report, and so that a caller who genuinely wants a second report can say so by choosing a different key.

A request key is deliberately **not** a content hash, and this is the one property most likely to be optimized away by someone who notices that hashing the payload would need no cooperation from the caller. Two intentional requests may carry byte-identical content: the same report ordered twice, the same payment made twice on purpose. Content equality cannot distinguish those from a retry, because the distinction lives in the caller's intent, and only the caller can express it. Content equality is still used, but for the opposite job — checking that a *reused* key really does name the same request, rather than quietly carrying a changed one.

An **Input ID** is a triple: the authenticated producer namespace, the destination [Execution](core.md#execution) ID, and that producer's request key. Each part earns its place by ruling out a collision the other two cannot. Two unrelated tenants may both send a request keyed `17`, and neither should shadow the other. One producer may send `17` to two different Executions, and those are two different inputs. Only the third part is caller-supplied text.

The namespace comes from trusted principal context established at ingress — never from a field inside the payload. A `user_id` written into a message body is content, and content [is not authority](../mechanisms/authority.md#content-is-not-authority): a producer that could name its own namespace could address, replay or conflict with another producer's inputs by writing that producer's name into a message. An Input ID is therefore not a global deduplication identifier that different callers share; it is scoped by construction.

A **caller-scoped creation key** applies the same retry idea one step earlier, before any Execution exists to be a destination. The authenticated caller scope plus the caller's request key identify one create request, and what that key binds includes the complete creation content, which is how a retry carrying different content is recognized as a conflict rather than an update. This is a scope rule. It introduces no new durable object type and fixes no token format.

Creation and later input are **separate identity domains**, and the reason is worth following concretely because the alternative looks harmless. Accepting the initial input during creation does not consume a post-creation Input ID; the initial [Event](core.md#event) keeps its creation provenance and its creation receipt. A later ordinary input from that same producer may reuse the creation key's text, and it is a new ingress request rather than a creation replay.

Collapse those two domains — let creation seed the producer's ingress key space with the creation key — and the producer's own name works against it. Sending ordinary input under the key it chose for creation returns a *creation* receipt for an ingress it never performed, answering the wrong question with a straight face. Worse, sending genuinely new content under that key is refused permanently as a duplicate conflict, for a request the producer never made, because its own key has already been spent by creation. [Later input has a destination](../mechanisms/creation.md#later-input-has-a-destination) owns the ingress rules and shows the reuse case.

One identity used throughout this page belongs elsewhere: the Execution ID, one logical lifetime that is never reissued, is defined with [Execution](core.md#execution). Its never-reused rule is what lets every identifier here assume that a destination names at most one piece of work, ever.

## Runtime attempt

An **Activation ID** names one immutable semantic exchange — the pinned progress revision, the fixed Event batch and the input that [Activation](core.md#activation) defines — for as long as that exchange remains unresolved. It answers *which question is this*. A new Activation ID is minted only when a genuinely new exchange begins, which is to say after the previous one resolves and the Kernel prepares a fresh dispatch.

A **Runtime attempt** is the currently authorized effort to perform one unresolved Activation exchange. It answers *whose work is this*, and it is a separate identity from the Activation because one question can outlive more than one effort to answer it. Sending the same dispatch again because the first send may not have arrived is the same attempt, continuing. Only an authorized takeover replaces the effort, and what it produces is a second attempt at the very same exchange.

Keeping the two apart is what makes a late answer classifiable at all. Three situations look identical from outside — a Runtime is being asked to work on something again — and they differ only in which identity survived: ordinary redelivery keeps both, takeover keeps the exchange and replaces the effort, and a new exchange after resolution replaces both. [Retry versus takeover](../mechanisms/execution-cycle.md#retry-versus-takeover) sets the three side by side, which is worth reading once, because an implementation that conflates any two of them cannot say what a reconnecting host's Outcome means.

A **physical action attempt** — one invocation of a mediated action through an adapter — is a different concept with a different owner and lifecycle, defined under [admission](actions.md#admission-and-physical-action-attempt). The two attempts are not nested versions of one idea: a Runtime attempt is an effort to answer the Kernel's question, and a physical action attempt is an effort to make something happen in the world. They are fenced separately, they fail for unrelated reasons, and the word **attempt** should never appear unqualified where both are in scope.

## Writer epoch

A **writer epoch** identifies which Runtime attempt's Outcome may be accepted for the current Activation. It is a monotonically increasing integer, or an equivalent total order, within that one exchange. An authenticated takeover decision advances it. Nothing else does — ordinary redelivery of the same dispatch preserves it, because redelivery changes nothing about who is working on the exchange.

The epoch fences **the whole of an Outcome acceptance**, not progress alone. A stale attempt that arrives late is refused every part of the decision it proposed: the acknowledgment of its batch, its progress, its [emissions](actions.md#emission-result-and-output-obligation), its [Effect](actions.md#effect) intents, its wait and deadline, the [readiness](core.md#readiness) they imply, and its next state. Fencing only progress would be a strange half-measure with a concrete failure attached — the replacement attempt would own the saved state while the superseded attempt's requests and acknowledgments had been let through underneath it, and the accepted record would describe a decision that no single attempt ever made.

Three things the epoch resembles, and is not. It is not authentication: it says which attempt may commit, having assumed the answer to who is calling, which trusted ingress settles beforehand. It is not proof of ownership through liveness: a host being reachable establishes nothing, and a lease expiring establishes nothing either, so the authoritative record decides rather than whichever host is talking. And it is not a lock on anything physical — not a native session, not a filesystem, not another Execution's shared state. Single-writer acceptance decides whose write becomes accepted truth, which is a narrower guarantee than it sounds and is exactly why [shared mutation](../mechanisms/resources.md#shared-mutation) remains its own problem with its own owner. A fenced-out attempt can still be running native code and still be touching a native session; what it cannot do is make the Kernel believe any of it.

Two representation questions stay deliberately open. How an epoch is spelled — an integer, a fencing token, something else — is an implementation choice. So is whether the counter resets or continues when a genuinely new Activation begins, and that one has a cautionary history: a conformance expectation that compared epoch values literally across new Activation IDs would fail every implementation that restarts the count per exchange, and pass only implementations that happened to share one accidental convention. What every conforming implementation must do is reject a stale epoch for the *current* exchange. What none of them owes anyone is a particular number.

Two nearby words are easy to mistake for this one. **Attempt epoch** is a former name for the writer epoch; the pages use *writer epoch* everywhere and the old name should not be revived, because a reader who meets both will reasonably assume two mechanisms. An **attempt envelope** is the transport or protocol wrapper that carries attempt metadata around the immutable exchange — a container, not a second epoch, not an identity of its own and not a recovery mechanism. A takeover replaces what the envelope carries without touching the exchange's semantic input, which is precisely the property that keeps the Activation ID meaningful across it.

## Dispatch and delivery

**Activation dispatch** is the Kernel preparing one Activation and sending it through a Driver toward a Runtime. It is neither Execution creation nor the choice of which Runtime implements the work; both of those were settled earlier, at creation.

Its **dispatch intent** is the accepted record that fixes the exchange's input, its reserved batch and its current attempt *before* anything is sent. Recording first and sending second is the whole design, and the reason is a crash window. If the Kernel sent first and recorded afterwards, a process that died in between would leave a Runtime working on an exchange the Kernel could not reconstruct — it would not know which Events it had handed over, so it could neither redeliver the same question nor safely ask a different one. With the intent accepted first, a restart finds a pinned exchange it can redeliver unchanged. [Before sending](../mechanisms/execution-cycle.md#before-sending) owns the full list of what gets pinned.

**Delivery** is an ordinary transport verb, and this page's rule about it is a naming rule: always say what was delivered and to whom. Two named hops need the distinction. Activation delivery to the Driver may be a function call in the same process. Driver submission to the native Runtime may cross a network to a job API. The route Kernel → Driver → Runtime is a statement about responsibility rather than about machines, so naming two hops implies no two physical sends: one process can hold all three roles. Neither hop is Outcome acceptance either — bytes arriving somewhere is not a decision, and the Kernel treats it as none.

That leaves exactly one fact the Kernel wants from the Driver in between, which is whether the hand-off succeeded, and it is reported explicitly rather than inferred from anything returned. [The delivery reporting boundary](../mechanisms/execution-cycle.md#delivery-reporting-boundary) specifies that reporting once, including what an unreported or late report means.

Three other operations in this system are also, in plain English, a dispatch or a delivery, and each has its own owner: **action dispatch** sends a mediated action toward an external service, **destination-mailbox acceptance** is what makes a message send successful, and **external output delivery** gets accepted output to somebody outside. Bare "Execution delivery" names none of them and should not be written. The cost of leaving the word unqualified is not pedantic: "it was delivered" is true of a byte arriving at a Driver, of a message reaching a mailbox and of a report landing in a person's inbox, and those three facts support wildly different conclusions.

## Revision

A **revision** identifies one version of a named value or contract. The rule that makes revisions usable is a naming discipline: always say which value's revision you mean, because there is no global "the revision" of an Execution and nothing in this system counts versions on its behalf.

Seven of them appear across these pages. They are separate because their creators, their change points and the questions they settle are all different.

| Revision | Who creates or changes it | The question it settles |
|---|---|---|
| Accepted progress revision | The Kernel, whenever it accepts replacement progress | Is this proposal built on the progress currently accepted, or a superseded one? |
| Base progress revision | The Activation, copying the accepted version this exchange starts from | Which starting point was this answer computed against? |
| Definition and Runtime contract revision | The publisher of the code, or of the integration | Which program is this, and how is this exchange read? |
| Progress codec version | The Runtime or Driver publisher | Can this stored continuation still be decoded by compatible code? |
| Operation and schema revision | The operation's owner | Which contract were these arguments validated, approved and settled under? |
| Resource and state revision | The resource service, when its value changes | Is the value still the one this decision assumed? |
| Action evidence revision | The trusted settlement or reconciliation path | What is known now, without rewriting what was known before? |

Reading two of them together is where the discipline pays. "Progress revision 4, writer epoch 2" says that attempt 2 is working from accepted progress 4. It does not say that attempt 1 produced an accepted progress 5, or that four attempts preceded this one, or that anything else in the Execution is at version 4. The two labels count different things in different domains, and the only relationship between them is that both are pinned by the same exchange.

None of these needs to be an integer, and no two of them need to share a counter or advance together. An implementation is free to use hashes, opaque tokens or version strings wherever a total order is not required.

## Acceptance, boundary and receipt

**Acceptance** is an authoritative decision to record a request or a fact under the relevant contract. It is the moment something stops being a claim and becomes part of what the Kernel will answer questions from. Several nearby events look like acceptance and are not: a network packet arriving, a payload passing validation, an external action being admitted. Each of those is real and none of them is the decision; treating any of them as acceptance is how a system comes to report progress that nothing recorded.

An **atomic acceptance boundary** names a set of facts that must commit together or not at all. It is a consistency requirement rather than a machine, a process or a transport boundary — one process may hold several, and one boundary may be implemented across more than one component, as long as an observer never sees half of it. Where the word "boundary" means an API, an interface or an ownership line instead, these pages use those words. [The atomic decisions table](../mechanisms/execution-cycle.md#atomic-decisions-across-the-system) lists which facts belong together at each one.

A **receipt** is retained evidence that one specific request was accepted at one named boundary, at a stated revision or position. It can be handed back to a caller, but it is not inherently a message from the Kernel to a Runtime, and it is not a token that carries permission.

Six boundaries issue them, and a receipt from one answers only that boundary's question.

| Boundary | The question its receipt answers |
|---|---|
| Creation or input ingress | Was this create or input request accepted? |
| Activation dispatch intent | Was this exact dispatch recorded before sending? |
| Outcome acceptance | Was this Runtime proposal accepted? |
| Effect admission | Was this physical attempt authorized and recorded? |
| Effect settlement | Was this evidence accepted? |
| Child or message operation | Was this specific child-creation or routing operation accepted? |

There is no single receipt per Execution, and the six exist separately because they are decided at different times by different authorities. A caller needs to be able to ask "was *this* accepted" and get an answer about that decision alone. The overreach the separation prevents is concrete and tempting: an Outcome-acceptance receipt proves that a proposal containing a publication request was accepted, and proves nothing whatever about whether anything was published. That question belongs to admission and settlement, which issue their own. A Kernel-minted [timeout Event](core.md#timeout-event) is accepted too, but its acceptance is an internal fact and introduces no seventh receipt for callers to ask about.

An **acceptance position** orders accepted facts within the record that owns them. It is not a global clock, and it does not order one Execution's facts against another's — no ordering across accepting domains is promised, because none can be observed. A position is useful for exactly what it claims: resuming a read, comparing two facts in the same domain, saying which of two accepted decisions came first where both were accepted by the same authority.

Receipt lookup authenticates the caller and scopes access before revealing anything, including whether the thing exists. A refusal must not distinguish "this does not exist" from "this exists and is not yours" — not through its message, not through its shape, and not through how long it takes to come back. A lookup that leaks that difference is an oracle: anyone holding a guessable identifier can enumerate another principal's work without ever being authorized to read any of it.

A retained decision is only retrievable while its retention contract says so. An exact duplicate of an earlier request returns that retained decision, which means that once retention lapses, the same request is a fresh one — and that is a consequential change of meaning rather than a cache miss, so an expired key must never quietly become a second real request. [Retention and deletion](../mechanisms/evidence.md#retention-and-deletion) owns what a deployment has to publish about that.

What a receipt looks like stays open. Whether it is an opaque token or a structured tuple, how it is serialized, and how a request key is hashed for lookup are implementation choices; what these pages fix is which decision a receipt names and what it is not evidence of.
