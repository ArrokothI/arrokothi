# Identity, attempts and accepted versions

A request can arrive twice even though the caller wanted the work done once. A Runtime can be replaced even though the work it was asked to do has not changed. A caller can lose an answer even though the Kernel has already accepted the decision behind it. ArrokothI needs to recognize each of these situations without confusing one with another.

That is what the identities on this page are for. They let the Kernel distinguish the caller's intention, the exchange being performed, the effort currently permitted to answer it, and the decision already recorded. An Execution ID gives all of these a common destination; it cannot answer their individual questions. An Execution can receive many requests and pass through many exchanges during its lifetime.

The [core concepts](core.md) introduce the participants: the Kernel coordinates accepted work, the Runtime performs the computation, and the Driver connects them. This page explains how those participants keep referring to the right work as requests repeat and circumstances change. The names describe conceptual distinctions; API names, token formats and wire representations can vary while preserving them.

## A running example

An application asks for the weekly report. Before sending the create request, it chooses the request key `weekly-17`. The Kernel accepts the request and creates an Execution, but the response is lost. From the application's side, silence looks the same as a request that never reached the Kernel.

The application sends the same request again with `weekly-17`. Within the retained decision's lifetime, the Kernel recognizes the authenticated caller, the key and the unchanged content, and returns the original creation decision. The application now knows which Execution to address. Repeating the send has not ordered a second report.

The Kernel asks a Runtime to prepare the report through an **Activation**, one exchange with fixed input. The Runtime starts drafting, then its host becomes unreachable before any Outcome is accepted. Recovery establishes that a replacement can safely take over. The replacement works on the same Activation, starting from the same accepted progress and observations; only the authorization to submit the next accepted answer has changed.

When the original host reconnects, it still has a draft. The Kernel can recognize that draft as an answer to the right Activation from an effort that is no longer authorized to commit. It refuses the proposal. The replacement's Outcome is accepted instead, advancing the saved progress. If the replacement loses the acceptance response and submits that exact Outcome again, the Kernel returns evidence of the existing decision without accepting the proposal a second time.

Three interruptions have occurred, and each required a different distinction. The creation retry needed the caller's request identity. The host replacement needed separate identities for the exchange and the effort performing it. The lost acceptance response needed evidence of a decision that had already happened. The sections below develop those distinctions in that order, then connect them to delivery, versions and receipts.

## Request key and Input ID

A **request key** is a name the caller chooses for one intended request and retains when sending that request again. The caller supplies the key because the caller knows whether another send means “try that request again” or “I want another one.” The Kernel cannot recover that intention from the content alone.

Suppose the application deliberately orders two reports using identical instructions. Both requests say “prepare the weekly report,” but they are two requests because the application chose to commission the work twice. Conversely, a request sent twice after a connection failure can still be one request. Deriving the key from a content hash would erase this distinction: identical instructions would always collapse into one intention.

Content comparison still matters once the identity has been established. A caller retrying `weekly-17` must keep the content that the key already names. Changing the requested week under that key conflicts with the accepted request; it does not revise the original Execution. This gives the two checks separate jobs: identity identifies the request to compare, and equality establishes whether the caller repeated it faithfully. [Canonical value equality](values.md#canonical-form) defines that comparison independently of transport formatting.

### Scope keeps unrelated requests apart

A key only has meaning within a scope. Two customers may independently choose `weekly-17`, and one producer may use that text when addressing two different Executions. Neither case should let one request suppress the other. The Kernel therefore needs more than the caller's key text to identify an input.

An **Input ID** identifies a post-creation input through three components:

| Component | What it distinguishes |
|---|---|
| Authenticated producer namespace | Which producer's request-key space this is |
| Destination Execution ID | Which logical lifetime receives the input |
| Producer request key | Which intended input that producer is submitting |

For example, `(editor-A, report-E, correction-1)` and `(editor-B, report-E, correction-1)` identify different inputs. Changing the destination to `report-F` also identifies a different input. Repeating all three components asks about the same input, and then its content determines whether the repetition is an exact retry or a conflict.

The namespace comes from trusted authentication context at ingress. A payload can mention an editor's name, but that mention cannot select the producer namespace. Otherwise a caller could reuse another producer's keys simply by putting that producer's name into the input. Authentication establishes who submitted the request; the input's own claims remain content for the Runtime to interpret.

The destination has a separate lifetime rule. An [Execution ID is never reissued](core.md#execution), even after deletion. A delayed input addressed to an old report therefore cannot accidentally become input to an unrelated new report that inherited its identifier.

### Creation precedes the destination

Creation needs a retry identity before the caller has a destination Execution. A **caller-scoped creation key** identifies the create request using the authenticated caller scope and the caller's chosen key. Acceptance binds that identity to the complete creation content and the resulting Execution. The [creation mechanism](../mechanisms/creation.md#one-atomic-creation) explains how the initial input, executable revisions and authority binding become one accepted decision.

The creation key and later Input IDs occupy separate identity domains. Consider the application that created the report with `weekly-17`. It may later submit ordinary input to the resulting Execution using `weekly-17` as that input's request key. This is the first request in the later-input domain, so creation has not already consumed it. Subject to ingress checks, it receives its own Event and input receipt.

This separation matters even when the later input repeats the initial content exactly. The initial Event records the creation request, with creation provenance and a creation receipt. The later Event records an input submitted to an existing destination. Returning the creation receipt for that later input would answer a different question from the one the caller asked. The [creation and input retry example](../mechanisms/creation.md#later-input-has-a-destination) follows both identities through subsequent retries.

## Runtime attempt

Once work has been created, the Kernel needs to distinguish the question sent to a Runtime from the effort that tries to answer it. An **Activation ID** identifies one immutable semantic exchange. The exchange fixes the accepted progress it starts from and the Event batch it supplies, along with the other pinned inputs described by [Activation](core.md#activation). An answer belongs to that question for as long as the exchange remains unresolved.

A **Runtime attempt** is the currently authorized effort to perform that exchange. An attempt can continue through repeated deliveries of the same Activation. If recovery authorizes takeover, a replacement attempt takes responsibility for answering the existing question. The Activation ID survives because its semantic input has not changed.

In the report example, imagine that an editor submits a correction while the first host is unreachable. The correction enters the mailbox, but it cannot be inserted into the Activation that the first host was already answering. A replacement attempt receives the original pinned batch too. Supplying the correction would change the question while retaining the identity of the old one, making two answers to supposedly identical input incomparable. The correction can be selected for a later exchange after the current exchange resolves.

Resolution is the point at which another exchange can begin. If the Kernel accepts an Outcome that asks to continue, it can prepare a new Activation using the newly accepted progress and a newly selected batch. That Activation has a new ID. A takeover, by contrast, addresses the absence of an accepted answer to the current Activation; it does not reopen an exchange whose Outcome was already accepted.

Ordinary redelivery changes neither the question nor the authorized effort. The Driver may receive the same Activation twice because the first hand-off was uncertain. Treating that second delivery as a replacement attempt would unnecessarily invalidate a legitimate answer already being computed. The [retry and takeover mechanism](../mechanisms/execution-cycle.md#retry-versus-takeover) specifies how redelivery, takeover and the next exchange preserve or change their identities.

Runtime attempts also need a distinct name from **physical action attempts**. A physical action attempt is an invocation of a mediated action through an adapter, such as an attempt to publish the completed report. Its authorization and evidence belong to the [action mechanism](actions.md#admission-and-physical-action-attempt). Replacing the Runtime that proposed publication does not, by itself, decide whether a publication request may be sent again.

## Writer epoch

The Kernel needs a way to recognize which Runtime attempt may commit an Outcome for the current Activation. A **writer epoch** supplies that ordering. An authenticated takeover advances the epoch within the exchange; ordinary redelivery retains it. The epoch can be a monotonically increasing integer or an equivalent total order.

Take the unresolved report Activation and label its initial epoch `1`. After safe takeover is authorized, the current epoch is `2`. Both attempts still name the same Activation and start from the same progress. When the old host submits its never-accepted Outcome under epoch `1`, the Kernel rejects it because the right to commit has moved. Even a useful draft cannot make that superseded authorization current again.

The fence covers every component of Outcome acceptance. A stale attempt cannot acknowledge its batch, install progress, emit accepted output, create Effect intents, register a wait or deadline, establish readiness, or choose the Execution's next state. Those changes belong to one decision. Allowing the old attempt's publication request through while rejecting its progress would assemble an accepted record from two different attempts' decisions.

An exact retry of an already accepted Outcome is a different case. The submitter is asking for the answer to a decision already made, so the Kernel returns the retained original receipt. It does not authorize another write. The [Outcome acceptance procedure](../mechanisms/execution-cycle.md#outcome-acceptance) performs authenticated duplicate lookup before fresh validation, preserving this distinction even after later policy changes or cancellation.

### What an epoch can establish

An epoch has meaning only alongside the current exchange and authenticated authority. Knowing the number `2` does not authenticate a submitter. A reachable host does not gain permission because it can answer quickly, and an expired lease does not prove that the previous host stopped. The Kernel's accepted ownership decision determines which attempt is current.

The same limit applies to native work. Rejecting the old host's Outcome cannot prevent that host from writing a file or mutating a native session. Safe takeover needs a separate Driver guarantee that native continuation is exclusive or otherwise safe; when that guarantee cannot be established, takeover must be refused or held. The [recovery contract](../mechanisms/recovery.md#decide-permission-before-replacing-work) connects that physical question to the Kernel's authorization decision.

Epoch values across different Activations carry no prescribed relationship. A deployment may start each exchange at `1`, or use an ordering that continues across exchanges. Both can preserve the required fence within the current exchange. The numbers in the report example illustrate successive authorization within one Activation; they do not select a representation or a starting value for the next one.

An **attempt envelope** is the wrapper that carries attempt metadata around the immutable exchange. Takeover can change that metadata while retaining the exchange's input. The wrapper introduces no additional identity or recovery mechanism. Older material may call the writer epoch an “attempt epoch”; this page uses **writer epoch** for that concept throughout.

## Dispatch and delivery

With an exchange and its current attempt identified, the Kernel can prepare to send the work. **Activation dispatch** comprises that preparation and the send through a Driver toward the Runtime. The Kernel first accepts a **dispatch intent**, the record fixing the exchange input, reserved batch and current attempt. Sending follows that decision.

Recording the intent first makes an interrupted hand-off explainable. Suppose the Kernel loses its connection to the Driver just as the Driver receives the report Activation. The accepted intent still identifies what was sent, even though its arrival is uncertain. In a persistent deployment whose storage survives, a replacement Kernel Worker can reconstruct that same intent after process failure. Sending before recording would leave it unable to tell which input a possibly active Runtime had received.

That record establishes the question to resend; it does not establish that repeating native work is safe. The Driver must preserve the native Runtime's submission and recovery guarantees. A lost hand-off acknowledgment may conceal a job that started successfully. [Dispatch preparation](../mechanisms/execution-cycle.md#before-sending) owns the pinned record, while [native recovery](../mechanisms/recovery.md#crash-windows) owns what can be done when submission evidence is missing.

### Name what reached whom

**Delivery** describes transport and needs both an object and a recipient. Activation delivery to a Driver and Driver submission to a native Runtime name different parts of the route. A Driver might receive an in-process call and then submit a remote job; it might also adapt a Runtime in the same process. The logical route Kernel → Driver → Runtime does not require two physical network hops.

The Driver explicitly reports its delivery acknowledgment through a Kernel-owned capability associated with that delivery attempt. A normal return from the Driver call is insufficient. A pending report can remain pending while other Executions advance, and a failure report does not prove that native work never started. These reports change operational evidence, not accepted progress or lifecycle state.

Repeated delivery calls can therefore produce several delivery-attempt records for one Runtime attempt. Each report concerns its own send. A late report from an earlier send cannot replace the evidence for a newer send or authorize a new Outcome. The [delivery reporting boundary](../mechanisms/execution-cycle.md#delivery-reporting-boundary) defines the first-report rule and the in-process binding, including the Driver's ownership of its asynchronous work.

Other parts of the system also deliver things, with different meanings of success. An action dispatcher sends a publication request to a service. A message succeeds when its destination mailbox accepts the input. A channel adapter delivers accepted output to a person. Naming the object and recipient keeps those facts distinguishable: “the Activation reached the Driver” cannot answer “did the editor receive the published report?” Bare “Execution delivery” leaves that distinction unresolved.

## Revision

Identities establish which request or exchange is under discussion. A **revision** identifies which version of a named value or contract that discussion depends on. Revisions let the Kernel and Driver detect change without requiring the Kernel to understand the Runtime's saved state.

Consider a report whose accepted progress is at revision `4`. A new Activation copies `4` as its **base progress revision**, recording the version it starts from. If the original Runtime attempt is replaced, the replacement still starts from revision `4`; takeover has changed who may answer, not the answer already accepted. A later accepted Outcome can install replacement progress and its new accepted revision.

The two progress revisions serve different roles even when they carry the same value. The accepted revision names the Kernel's recorded state. The base revision ties one exchange and its proposed answer to that starting state. The Kernel can compare those bindings without inspecting whether the progress means “draft complete” or “waiting for an editor.” Meaning stays with the Runtime.

Other revisions answer compatibility questions beyond progress. The **Definition revision** identifies the executable code or configuration selected for the Execution. The **Runtime contract revision** identifies how the Driver and Runtime interpret the exchange. The **progress codec version** identifies how continuation data can be decoded. Successfully decoding saved bytes does not establish that today's program interprets them as the same continuation; the code and contract bindings matter too.

The following families collect those version questions by what changes and who owns the change:

| Revision family | Who supplies or changes it | What a reader can determine from it |
|---|---|---|
| Accepted progress | Kernel, when accepting replacement progress | Which continuation is the accepted one |
| Base progress | Activation, by copying its starting accepted revision | Which continuation this exchange began from |
| Definition / Runtime contract | Publisher of the executable or integration contract | Which program and interpretation were selected |
| Progress codec | Runtime or Driver publisher | Which decoding contract the continuation requires |
| Operation / schema | Owner of the operation | Which action contract governs arguments and results |
| Resource / state | Service owning the resource or application value | Which version a precondition or decision refers to |
| Action evidence | Trusted settlement or reconciliation path | Which refinement of knowledge about an action is recorded |

Action evidence illustrates why a revision need not mean replacement of everything that preceded it. Publication might initially be uncertain and later be confirmed by trusted evidence. The later evidence has its own revision; an Event the Runtime already consumed remains a record of what was known then. Keeping both makes the Runtime's earlier decision understandable. [Settlement and refinement](../mechanisms/actions.md#settlement-and-refinement) owns how that evidence is appended.

No global Execution revision combines these families. “Progress revision `4`, writer epoch `2`” means that the effort authorized under epoch `2` is answering from progress `4`. It does not imply that another effort installed progress `5`, or that the publication operation is at revision `4`. Always name the value or contract whose revision is being compared. Revisions need not be integers, and separate owners need not share a counter or advance together.

The [compatibility checks for recovery](../mechanisms/recovery.md#compatibility-and-migration) explain how these bindings are used when work resumes. They make missing code, incompatible interpretation and unavailable resources explicit instead of treating any decodable progress as safe to run.

## Acceptance, boundary and receipt

All the preceding identities eventually support an authoritative decision: the Kernel accepts a request or records a fact under the contract governing it. That decision is **acceptance**. An accepted input establishes that the particular observation entered the Execution's record. An accepted Outcome establishes the proposed progress and associated changes. Each acceptance has a subject, and its evidence extends only as far as that subject.

An **atomic acceptance boundary** specifies which facts must commit together. When the Kernel accepts the report Runtime's Outcome, the saved progress and acknowledgment of its batch cannot disagree about whether the proposal was accepted. The output, action intents and next state belonging to that decision commit with them. The boundary describes this consistency requirement; it need not coincide with a process boundary or a network hop.

Atomic acceptance makes the accepted record coherent. Whether the record survives a process failure depends on the deployment's storage guarantees. A persistent profile can retain evidence for recovery, while an in-memory profile cannot promise to retrieve a decision after losing its process. Keeping those questions separate matters when a caller relies on a receipt after a disconnection or restart.

### A receipt answers one decision's question

A **receipt** is retained evidence of a specific accepted request at a named boundary and revision or position. Return to the replacement Runtime that lost its Outcome response. A receipt lets it learn that its proposal was accepted without requiring the Kernel to repeat that proposal's mutations. The receipt describes the decision already made; it does not grant permission to make another one.

The report can accumulate receipts for several different decisions:

| Receipt scope | The question it answers |
|---|---|
| Creation or input ingress | Did the Kernel accept this create or input request? |
| Activation dispatch intent | Did the Kernel record this exact dispatch intent? |
| Outcome acceptance | Did the Kernel accept this Runtime proposal? |
| Effect admission | Was this concrete action attempt authorized and recorded? |
| Effect settlement | Was this action evidence accepted? |
| Child or message operation | Was this particular creation or routing operation accepted? |

These scopes prevent a receipt from being stretched into evidence of later work. An Outcome containing a request to publish can be accepted before the Kernel admits a publication attempt. An admission receipt proves that an attempt was authorized and recorded, while its result may still be unknown. A settlement receipt concerns the evidence subsequently accepted. The **intent**, **admission** and **settlement** distinctions from [actions](actions.md) remain visible even when every caller receives an acknowledgment that looks similar.

A receipt can be returned through an API or retrieved later; the concept does not prescribe a Kernel-to-Runtime acknowledgment message. Nor does every internal accepted fact add another caller-facing receipt interface. A Kernel timeout Event, for example, records that a wait generation expired without introducing a seventh receipt scope.

An **acceptance position** places an accepted fact within the order maintained by its owning record or domain. It can distinguish two decisions where that domain orders them. It does not provide a global clock for unrelated Executions or external services. The revision or position on a receipt must therefore be read together with its boundary and scope, never as a system-wide sequence number.

### Retrieval has an access boundary and a lifetime

Knowing a request's identity does not authorize looking it up. Receipt lookup authenticates the caller and establishes its permitted scope before revealing content or existence. Otherwise an unauthorized caller could discover another principal's work by guessing keys and distinguishing “missing” from “present but forbidden.” Refusal shape and timing must preserve the same nondisclosure boundary as the returned content.

The ability to retrieve an earlier decision also depends on retention. While the relevant decision is retained under its contract, an exact duplicate can recover that decision. After retention expires, the Kernel must follow the deployment's published expired-key policy: require fresh intentional input or explicitly refuse. Expiry alone does not turn an old request into a new intention, and it must never silently commission a second consequential action.

The [retention and deletion contract](../mechanisms/evidence.md#retention-and-deletion) explains what can remain after full payload deletion and what must be reported as unavailable. Receipt serialization, token representation and request-key hashing remain implementation choices. Whatever their representation, the retained records must keep the same distinctions the report depended on: who asked, which request they meant, which effort could commit, and which decision the answer actually proves.
