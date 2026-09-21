# Identity, attempts and accepted versions

Every question on this page has the same grammar: *is this one the same as that one?* A request arrives twice: is the second arrival a retry of the first, or a second intention that happens to carry identical content? A host goes quiet, a replacement is authorized, and then the original host returns with work in hand: is its answer a valid reply to the open question, or a ghost from an effort that may no longer commit? Two producers each send input keyed `correction-1`: are those the same input twice, or two inputs that share a label?

None of these can be settled by comparing content, because content is the one thing all the confused cases share. Each question needs two things before it can be answered: a **scope** that says what range the comparison runs over, and an **equality rule** that says what counts as the same inside that range. The identities on this page supply those, one question at a time. Reusing one of them to answer another's question is the usual origin of duplicated work or lost work.

The names are conceptual. They fix what must be distinguishable and on what basis — never how an API spells a field, how a wire format encodes it, or how storage lays it out. This page defines the terms; [creation](../mechanisms/creation.md) and [the execution cycle](../mechanisms/execution-cycle.md) apply them. It assumes the [core vocabulary](core.md), and the weekly report introduced there runs through every section, so the cast never changes.

## A first example

An application asks for the weekly report. Its create request carries a key the application chose itself, `report-17`. The response never comes back — a connection dropped somewhere between the two of them. The application does the obvious thing and sends the same request again under the same key. Exactly one Execution exists at the end of it: the second call is answered with the first call's decision. The key is what makes "again" mean *the same request*, and the caller chooses it rather than deriving it from the content, because the same content could equally have been a second report somebody genuinely wanted.

The [Kernel](core.md#kernel) now prepares the report's first exchange. It pins the accepted [progress](state.md#progress) the work starts from, fixes the [batch](core.md#batch-reservation-and-acknowledgment) of [Events](core.md#event) this exchange will carry, records all of that as an accepted decision, and only then hands the [Activation](core.md#activation) to the [Driver](core.md#execution-driver). Two identities are now in play. The Activation ID names the question being asked. The writer epoch — 1 here — names which working effort is allowed to answer it.

The host preparing the report goes quiet. Its [scheduler lease](operations.md#three-clocks) expires, which proves that time passed and nothing else: the host may be dead, or merely slow and still writing. [Recovery](../mechanisms/recovery.md#decide-permission-before-replacing-work) establishes that the native work can safely be taken over, and a replacement attempt is authorized. The question does not change — same Activation ID, same pinned progress, same batch. What changes is the epoch, which advances to 2.

Then the original host comes back, holding a perfectly good draft, and submits its [Outcome](core.md#outcome). The Kernel rejects it in full. Not because the draft is bad, and not because the Activation ID is wrong — that ID still names exactly the exchange that is open. It is rejected because the epoch it carries is no longer the one permitted to commit.

The alternative arrangement deserves a moment, because it sounds tidier and is not. Had the takeover minted a *new* Activation ID, that same late answer would have been refused for naming a question that no longer existed — a false account of what happened. The question was live the whole time. Only the right to answer it had moved.

Attempt 2 finishes the draft. The Kernel accepts its Outcome, installs the draft's progress as the report's first accepted version — progress revision 1 — and returns a receipt. The receipt is evidence of one decision: this proposal was accepted, at this boundary. It is evidence of nothing the proposal merely asked for.

Had the Outcome requested publication of the report, that request would now exist as an accepted obligation; whether anything was ever published is a different question, answered by different evidence. And if attempt 2 never hears the answer and submits the same Outcome again, that receipt is what comes back: the decision has been made, and making it twice is not on offer.

Five kinds of identity appeared in that story:

- **Requests from a caller** — the [request key and the Input ID](#request-key-and-input-id) built from it, and the creation key that works before an Execution exists.
- **Efforts at one exchange** — the [Runtime attempt](#runtime-attempt) that performs an Activation, and the [writer epoch](#writer-epoch) that decides which attempt may commit.
- **Sends** — [dispatch and delivery](#dispatch-and-delivery), and why "delivery" must always name what travelled and to whom.
- **Accepted states** — the several kinds of [revision](#revision), which share no counter.
- **What an accepted answer covers** — [acceptance, boundary and receipt](#acceptance-boundary-and-receipt).

The sections below take them in that order.

## Request key and Input ID

A **request key** is text the caller chooses and reuses when it retries one intended request. `report-17` is one. It exists so that a caller who never heard an answer can ask again without risking a second report, and so that a caller who genuinely wants a second report can say so — by choosing a different one.

A request key is deliberately **not** a content hash. This is the property most likely to be optimized away by someone who notices that hashing the payload would need no cooperation from the caller. Two intentional requests may carry byte-identical content: the same report ordered twice, the same payment made twice on purpose. Content equality cannot distinguish those from a retry, because the distinction lives in the caller's intent, and only the caller can express it. Deriving identity from content would erase exactly the intention the system most needs to preserve.

Content equality is still used, but for the opposite job. Once a request key names *which* request to compare against, the recorded content is compared with the new arrival's: the same key with the same content is answered from the decision already recorded, and the same key with different content is a conflict that creates nothing. The two checks have separate work — the key selects the request, and the comparison verifies the caller repeated it faithfully. [Canonical form](values.md#canonical-form) owns what "the same content" means, independently of how any transport happened to spell it.

A request key alone cannot identify an input, though, because text means nothing without a scope. Two unrelated producers may both send input keyed `correction-1`, and one producer may send that key to two different Executions. So an input is identified not by its key but by an **Input ID** built around it — the same move [actions](actions.md#effect) makes when a Runtime's proposal key becomes an Effect ID. That is the convention throughout: a *key* is the submitter's own text, and an *ID* is the complete identity built from it.

An Input ID is a triple, and each part earns its place by ruling out a collision the other two cannot:

| Component | What it distinguishes |
|---|---|
| Authenticated producer namespace | Which producer's request keys these are |
| Destination [Execution](core.md#execution) ID | Which logical lifetime receives the input |
| Producer request key | Which intended input that producer is submitting |

Spelled out: `(editor-A, report-E, correction-1)` and `(editor-B, report-E, correction-1)` are different inputs, because two producers may each key something `correction-1` without either shadowing the other. `(editor-A, report-F, correction-1)` is a third input, because one producer addressing two Executions means two different things by one request key.

Only repeating all three components asks about the same input again — and only then does content decide whether the repetition is a faithful retry or a conflict. Two of the three are the caller's to choose: the destination it addresses and the text it picks. The namespace is not.

The namespace comes from trusted principal context established at ingress — never from a field inside the payload. A `user_id` written into a message body is content, and content [is not authority](../mechanisms/authority.md#content-is-not-authority): a producer that could name its own namespace could address, replay, or deliberately conflict with another producer's inputs simply by writing that producer's name into a message. The namespace separates producers globally. The destination and request key then decide sameness within one producer's traffic, so an Input ID never deduplicates across producers.

Creation needs the same idea one step earlier, before any Execution exists to be addressed. The caller supplies a **creation key** — request-key text again — and the request is identified by a **Creation request ID** built around it.

A Creation request ID has the same three-part shape as an Input ID, and only the middle part differs. An Input ID names the destination Execution that receives the input. A Creation request ID names the [authority](actions.md#principal-and-authority) the new Execution will be created under: the one the caller selected and must be entitled to use, never its whole list of permissions. There is no destination yet, and that authority stands in its place — so one creation key used under two authorities names two different requests, exactly as one producer's `correction-1` sent to two Executions named two different inputs.

A Creation request ID binds the complete creation content, so a retry carrying changed content is a conflict rather than a quiet update. It introduces no new durable object and fixes no token format.

Creation and later input are separate identity domains, even though a Creation request ID and an Input ID can be built around the same request-key text. A producer may use its creation key again later as the request key on ordinary input. [Later input has a destination](../mechanisms/creation.md#later-input-has-a-destination) explains the mechanism behind that.

One identity used throughout this page is defined elsewhere. The Execution ID — one logical lifetime, never reissued even after deletion — is defined with [Execution](core.md#execution), and its never-reused rule is what lets every identifier here assume that a destination names at most one piece of work, ever.

## Runtime attempt

An **Activation ID** names one immutable semantic exchange — the pinned progress revision, the fixed Event batch, and the input that [Activation](core.md#activation) defines — for as long as that exchange remains unresolved. It answers *what is being asked?* A new Activation ID is minted only when a genuinely new exchange begins, which is to say after the previous one resolves and the Kernel prepares a fresh dispatch. Resending bytes never mints one.

A **Runtime attempt** is the currently authorized effort to perform one unresolved Activation exchange. It answers *whose work is this?*, and it is a separate identity from the Activation because one question can outlive more than one effort to answer it. Sending the same dispatch again, because the first send may not have arrived, continues the same attempt — nothing about who is working has been re-decided. Only an authorized takeover replaces the effort, and what it produces is a second attempt at the very same exchange.

Keeping the two identities apart is what makes a late answer classifiable at all. Three situations look identical from outside — a Runtime is being asked to work on something again — and they differ only in which identity survived: ordinary redelivery keeps both, takeover keeps the exchange and replaces the effort, and a new exchange after resolution replaces both.

[Retry versus takeover](../mechanisms/execution-cycle.md#retry-versus-takeover) sets the three side by side, and owns what becomes of input that arrives while a takeover is being decided. It is worth reading once: an implementation that conflates any two of them cannot say what a reconnecting host's Outcome means — a valid reply to the live question, a ghost of an effort that may no longer commit, or an answer computed against an exchange that has already closed.

A Runtime attempt is not a model call, a conversation turn, or a native run. How efforts at an exchange line up with the Runtime's own runs and sessions is the [Driver's](core.md#execution-driver) mapping to declare.

A **physical action attempt** — one invocation of a mediated action through a trusted adapter — borrows the word *attempt* for a different concept with a different owner, defined under [admission](actions.md#admission-and-physical-action-attempt). The two are not nested sizes of one idea. A Runtime attempt is an effort to answer the Kernel's question; a physical action attempt is an effort to change something in the world. They are fenced separately and fail for unrelated reasons.

## Writer epoch

A **writer epoch** identifies which Runtime attempt's Outcome may be accepted for the current Activation. It is a monotonically increasing integer, or an equivalent total order, within that one exchange. An authenticated takeover decision advances it. Nothing else does — ordinary redelivery of the same dispatch preserves it, because redelivery re-decides nothing about who is working.

Numbers make the fence easy to follow. The first attempt at the report's unresolved Activation carries epoch 1. Takeover is authorized, and the current epoch becomes 2; both attempts still name the same Activation and still start from the same accepted progress. When the first host submits its never-accepted Outcome under epoch 1, the Kernel refuses it, because the right to commit has moved.

The epoch fences **the whole of an Outcome acceptance**, not progress alone. A stale attempt arriving late is refused every part of the decision it proposed: the acknowledgment of its batch, its progress, its [emissions](actions.md#emission-result-and-output-obligation), its [Effect](actions.md#effect) intents, its wait and deadline, the [readiness](core.md#readiness) they imply, and its next state. Letting any of those through under a superseded epoch would blend two attempts into one accepted record, describing a decision that neither of them made.

A stale attempt and a merely repeating one are different cases, and only the first is refused. If the current attempt resubmits an Outcome that has already been accepted — because it never heard the answer — what comes back is the original receipt, not a second application of the decision. A repeated submission is not a second proposal, and [Outcome acceptance](../mechanisms/execution-cycle.md#outcome-acceptance) owns the order of checks that keeps the two cases apart.

The epoch resembles three things it is not. It is **not authentication**: it says which attempt may commit, having assumed the answer to who is calling, which trusted ingress settles beforehand. It is **not derived from liveness**: a host that is still answering has not thereby kept the right to commit, and an expired scheduler lease has not thereby taken it away. Only an accepted takeover moves the epoch — so in the gap between a lease lapsing and that decision, the original attempt may still commit.

And it is **not a lock on anything physical** — not on a native session, not on a filesystem, not on another Execution's shared state. A fenced-out attempt may keep running native code and keep touching a native session for hours; what it cannot do is make the Kernel believe any of it. Single-writer acceptance decides whose write becomes accepted truth, which is a narrower guarantee than it sounds — and exactly why [shared mutation](../mechanisms/resources.md#shared-mutation) remains its own problem with its own owner.

That last limit has a consequence the Kernel cannot discharge by itself. Because a superseded attempt may still hold live native work, authorizing a takeover needs a separate guarantee from the [Driver](core.md#execution-driver) that native continuation is exclusive or otherwise safe to replace. Where no such guarantee can be established, takeover is refused or held rather than assumed. [Deciding permission before replacing work](../mechanisms/recovery.md#decide-permission-before-replacing-work) owns that decision.

Two representation questions stay deliberately open. How an epoch is spelled — an integer, a fencing token, something else — is an implementation choice. So is whether the sequence restarts or continues when a genuinely new Activation begins: a deployment may number each exchange from 1 or carry one order across exchanges, and both preserve the only property the architecture requires, which is that a stale epoch for the *current* exchange is rejected. <!-- OPEN(unassigned): writer-epoch representation, and whether the sequence restarts or continues across a later Activation. Both are deliberately implementation-owned rather than awaiting an owner; the architecture requires only that a stale epoch for the current exchange is rejected. The epoch numbers used in this section are illustrative and fix no representation, no starting value, and no relationship between one exchange's epochs and the next's — a conformance fixture comparing epoch values across different Activation IDs over-constrains conforming implementations (K0.2 round 13, K02-R13-01), and K1.1-DEC-2 numbers each exchange from 1 as an implementation choice, not architecture. If an owner ever fixes a representation: restate this paragraph in those terms and delete this marker. rewrite-index.md §4; WS ID-4 -->

Two nearby terms are easy to mistake for this one. **Attempt epoch** is a former name for the writer epoch; these pages use *writer epoch* everywhere, and the old name should stay retired — a reader who meets both will reasonably assume two mechanisms.

An **attempt envelope** is the transport or protocol wrapper that carries attempt metadata — the writer epoch, and whatever a Driver needs to route and report on the attempt — around the immutable exchange. It is a container: not a second epoch, not an identity of its own, and not a recovery mechanism. A takeover replaces what the envelope carries without touching the exchange's semantic input, which is precisely the property that keeps the Activation ID meaningful across it.

## Dispatch and delivery

**Activation dispatch** is the Kernel preparing one Activation and sending it through a Driver toward a Runtime. It is not Execution creation, and it is not the choice of which Runtime implements the work.

A dispatch's **dispatch intent** is the accepted record that fixes the exchange's input, its reserved batch, and its current attempt *before* anything is sent. Recording first and sending second is the whole design, and the reason is a crash window. A Kernel that sent first and recorded afterwards could die in between, leaving a Runtime at work on an exchange the survivors cannot reconstruct: which Events were handed over, from which pinned progress, as which attempt?

With no record of what was asked, neither safe redelivery of the same question nor a safe new question is possible. With the intent accepted first, a restart instead finds a pinned exchange it can redeliver unchanged. [Before sending](../mechanisms/execution-cycle.md#before-sending) owns the full list of what gets pinned.

What that record settles is which question to resend. It does not settle whether resending is safe, because a lost hand-off acknowledgment can hide native work that started successfully. That question belongs to [crash windows](../mechanisms/recovery.md#crash-windows) and to what the Driver can preserve — the intent is a record of the Kernel's decision, not a license to repeat the world's work.

**Delivery** is an ordinary transport verb, and this page's rule about it is a naming rule: always say what was delivered, and to whom. Two named hops need the distinction. Activation delivery to the Driver may be a function call inside one process. Driver submission to the native Runtime may cross a network to a job API.

The route Kernel → Driver → Runtime is a statement about responsibility rather than about machines, so naming two hops implies no two physical sends — one process can hold all three roles. And neither hop is Outcome acceptance: bytes arriving somewhere is a property of a transport, not a decision of the Kernel.

Between send and answer, the Kernel wants exactly one fact from the Driver — *did the hand-off reach the Runtime* — and it is reported explicitly rather than inferred from whatever the dispatching call happened to return. A reported failure, in particular, does not prove that native work never started. [The delivery reporting boundary](../mechanisms/execution-cycle.md#delivery-reporting-boundary) owns how that fact is reported, and what an unreported or late report means.

Three other operations in this architecture are also, in plain English, a dispatch or a delivery, and each has its own owner. [Action dispatch](actions.md#admission-and-physical-action-attempt) sends a mediated action toward an external service. [Destination-mailbox acceptance](operations.md#message-request-and-correlation) is what makes sending a message successful. [External output delivery](../mechanisms/output.md#external-delivery) gets accepted output to somebody outside the protocol.

Bare "Execution delivery" names none of them and should not be written. The cost of leaving the word unqualified is not pedantry: "it was delivered" is true of a byte arriving at a Driver, of a message reaching a mailbox, and of a report landing in the editor's inbox — and those three facts support wildly different conclusions.

## Revision

A **revision** identifies one version of a named value or contract. The discipline that makes revisions usable is a naming rule: always say *which value's* revision is meant, because there is no global "the revision" of an Execution, and nothing anywhere counts versions on its behalf.

Two of them concern progress alone, and separating those two is what lets the Kernel check an answer it cannot read. Some exchanges later, the report's **accepted progress revision** stands at 4. The next Activation copies 4 as its **base progress revision**, recording the version this exchange starts from — and if the attempt is replaced, the replacement still starts from 4, because takeover changed who may answer, not the answer already accepted. A later accepted Outcome installs replacement progress under a new accepted progress revision.

The two carry the same value much of the time and still do different jobs. The accepted revision names the Kernel's current record. The base revision ties one exchange, and the answer proposed for it, to the state that exchange began from. Comparing those two bindings tells the Kernel whether a proposal was built on what is still current — without the Kernel ever needing to know whether the progress means "draft complete" or "waiting for the editor." That meaning stays with the Runtime.

Seven kinds appear across these pages. They stay separate because their creators, their change points, and the questions they settle are all different.

| Revision | Who creates or changes it | The question it settles |
|---|---|---|
| Accepted progress revision | The Kernel, whenever it accepts replacement progress | Is this proposal built on the progress currently accepted, or on a superseded one? |
| Base progress revision | The Activation, copying the accepted version this exchange starts from | Which starting point was this answer computed against? |
| Definition and Runtime contract revision | The publisher of the code, or of the integration | Which program is this, and how is this exchange read? |
| Progress codec version | The Runtime or Driver publisher | Can this stored continuation still be decoded by compatible code? |
| Operation and schema revision | The operation's owner | Which contract were these arguments validated, approved, and settled under? |
| Resource and state revision | The resource service, when its value changes | Is the value still the one this decision assumed? |
| Action evidence revision | The trusted settlement or reconciliation path | What is known now, without rewriting what was known before? |

Reading two kinds together is where the naming discipline pays. "Progress revision 4, writer epoch 2" says that the attempt authorized under epoch 2 is working from accepted progress 4. It does not say that four attempts preceded this one, or that anything else in the Execution sits at version 4. The two labels count different things in different domains, and the only relationship between them is that both were pinned by the same exchange.

None of these needs to be an integer, and no two share a counter or advance together. [Compatibility and migration](../mechanisms/recovery.md#compatibility-and-migration) owns what becomes of these bindings when work resumes, pairing each one with the check that has to pass before reconstructed state can actually be used.

## Acceptance, boundary and receipt

**Acceptance** is an authoritative decision to record a request or a fact under the relevant contract. It is the moment something stops being a claim and becomes part of what the Kernel will answer questions from.

Several nearby events look like acceptance and are not: a network packet arriving, a payload passing validation, an external action being admitted. Each of those is real, and none of them is the decision. A packet describes a transport, validation describes content, and admission authorizes an attempt at something in the world; none of the three, by itself, records anything as having happened. Treating any of them as acceptance is how a system comes to report progress that nothing ever recorded.

An **atomic acceptance boundary** names a set of facts that must commit together or not at all. *Boundary* here is a consistency requirement, not machinery: one process may hold several boundaries, and one boundary may be implemented across more than one component, as long as an observer never sees half of it. The word is doing narrower work here than usual: it is not an API, an interface, or a line of ownership. [The atomic decisions table](../mechanisms/execution-cycle.md#atomic-decisions-across-the-system) lists which facts belong together at each boundary.

A **receipt** is retained evidence that one specific request was accepted at one named boundary, at a stated revision or position. It can be handed back to a caller, but it is not inherently a message from the Kernel to a Runtime, and it is not a token that carries permission. What it proves is its named decision — and, by construction, nothing adjacent to that decision.

Six boundaries issue receipts, because the six decisions are made at different moments and under different contracts, and a caller needs to ask about each one without borrowing evidence from another:

| Boundary | The one question its receipt answers |
|---|---|
| Creation or input ingress | Was this create or input request accepted? |
| Activation dispatch intent | Was this exact dispatch recorded before sending? |
| Outcome acceptance | Was this Runtime proposal accepted? |
| Effect admission | Was this physical attempt authorized and recorded? |
| Effect settlement | Was this evidence accepted? |
| Child or message operation | Was this specific child-creation or routing operation accepted? |

There is accordingly no single receipt per Execution, and inventing one is not a harmless abbreviation. The overreach the separation blocks is everyday: an Outcome-acceptance receipt proves that a proposal *containing* a publication request was accepted, and proves nothing whatever about whether anything was published. That question belongs to [admission](actions.md#admission-and-physical-action-attempt) and [settlement](actions.md#settlement-and-reconciliation), which issue their own receipts for it. A Kernel-minted [timeout Event](core.md#timeout-event) is accepted too, but that acceptance is bookkeeping inside the Kernel's own machinery and introduces no seventh receipt for callers to ask about.

A receipt also names a position, and that word claims less than it looks. An **acceptance position** orders accepted facts within the record that owns them — enough to resume a read, or to say which of two decisions from the same authority came first. It is not a clock: no ordering across two accepting domains, or across two Executions, is promised, because none can be observed.

Knowing which receipt to ask for is not the same as being allowed to see it. Lookup authenticates the caller and bounds what that caller may see *before* revealing anything — the content first of all, but the very existence of the record too. A refusal must not distinguish "no such record" from "a record exists and it is not yours": not by its message, not by its shape, not by how long it takes to come back. A lookup that betrays the difference is an oracle — anyone holding a guessable identifier can enumerate another principal's work without ever being authorized to read any of it.

Permission is not the only limit; time is the other. While the record of an acceptance is retained, an exact duplicate of that request is answered from it — the same receipt, not a second decision. Once retention lapses the guarantee ends, but expiry does not turn an old request into a new intention, so an expired key cannot quietly commission a second real report. What happens instead is a published choice: require fresh intentional input, or refuse outright. [Retention and deletion](../mechanisms/evidence.md#retention-and-deletion) owns that contract, including what a deployment retains and for how long.

What a receipt concretely is stays open. Whether it is an opaque token or a structured tuple, how it is serialized, and how a request key is hashed for lookup are implementation choices. What these pages fix is narrower and more durable: which decision a receipt names, and what it is — and is not — evidence of.
