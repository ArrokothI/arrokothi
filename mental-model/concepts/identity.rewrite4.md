# Identity, attempts and accepted versions

In an asynchronous execution kernel, the question “is this the same request?” is never simple. A client retries an HTTP call after a network timeout; a partitioned worker wakes up after its replacement has already been dispatched; an external payment webhook arrives two hours late; a model produces the exact same draft text for two different users. If the system answers “are these the same?” using a single global identifier or a naive content hash, it will either silently drop distinct work or duplicate unrepeatable side effects.

This page defines the canonical concepts that govern identity, execution attempts, versioning, and accepted decisions in ArrokothI. Each term is defined here and nowhere else. How these terms interact during creation is specified in [creation](../mechanisms/creation.md); how they govern the dispatch and completion of work is specified in [the execution cycle](../mechanisms/execution-cycle.md).

Every identifier in ArrokothI answers a different "same as what?" question:

- **Caller requests**: "Did the producer ask for this work twice, or are these two separate intentions?" $\to$ [Request key and Input ID](#request-key-and-input-id).
- **Execution efforts**: "Which worker's computation is currently authorized to advance this exchange, and which one wins if both report back?" $\to$ [Runtime attempt](#runtime-attempt) and [Writer epoch](#writer-epoch).
- **Physical transport**: "Did the Kernel commit to sending this work, and did the adapter receive it?" $\to$ [Dispatch and delivery](#dispatch-and-delivery).
- **State and contract evolution**: "Which snapshot of code, state, or schema does this data adhere to?" $\to$ [Revision](#revision).
- **Authoritative commitments**: "What specific decision did the Kernel commit to, and what proof covers that decision?" $\to$ [Acceptance, boundary and receipt](#acceptance-boundary-and-receipt).

Conflating any two of these questions is the most common source of state corruption, ghost executions, and unauthorized actions in distributed agent systems.

## A running example

Consider the weekly report service introduced in [Core coordination vocabulary](core.md#a-first-example). A finance manager wants the weekly expenditure report generated and audited.

1. **Creation**: The manager's client sends a creation request with the client-chosen request key `weekly-report-2026-w38`. The network drops before the client receives the confirmation. The client retries with the exact same key. The Kernel recognizes the key within the finance manager's authenticated namespace, creates no second Execution, and returns the existing Execution ID `exec-901` along with its creation receipt.
2. **First Activation**: The Kernel prepares the first [Activation](core.md#activation) to draft the report. It records its dispatch intent, pins the reserved input, and sends the Activation to the Driver as **Runtime attempt 1** under **writer epoch 1**.
3. **Partition and Takeover**: The host running attempt 1 experiences a severe garbage collection pause and loses network contact with the Kernel. The Kernel detects the lease expiry and an operator or supervisor authorizes a takeover. The Kernel initiates **Runtime attempt 2** for the *exact same Activation exchange*, advancing the **writer epoch to 2**.
4. **Fencing**: Worker 1 suddenly recovers and submits an [Outcome](core.md#outcome) containing its completed draft. The Kernel inspects the submission: the Outcome carries epoch 1, but the current epoch is 2. The Kernel **rejects Worker 1's Outcome in its entirety**. A few moments later, Worker 2 finishes its work and submits its Outcome under epoch 2. The Kernel accepts it, committing the draft as **accepted progress revision 1**.
5. **Subsequent Ingress**: Two days later, the finance manager submits an approval decision using the request key `weekly-report-2026-w38`. Even though the text string matches the creation key, it belongs to a completely separate identity domain: it is accepted as a new input [Event](core.md#event), not rejected as a duplicate creation.
6. **Revisions and Receipts**: Throughout this lifecycle, the Execution relies on seven distinct kinds of revisions—from the code definition to the publication schema—and generates receipts covering six separate acceptance boundaries. An Outcome receipt proves that the draft was accepted into Kernel state; it does not prove that the report was published to the company channel.

The sections below examine each of these concepts, the problems they solve, and the failure modes they prevent.

## Request key and Input ID

A **request key** is a caller-chosen identifier reused when retrying one intended request. It is not a content hash.

An **Input ID** is a triple consisting of:
1. the authenticated producer namespace,
2. the destination [Execution](core.md#execution) ID, and
3. the producer's request key.

A **caller-scoped creation key** is the pair of the authenticated caller namespace and the caller's request key, used to identify a creation request before an Execution ID exists.

### Why caller-chosen keys instead of content hashes

In automated workflows, two intentional, distinct requests frequently carry identical content. A user may click a button twice to "increment counter by 1", "retry step", or "append empty row". If the system derived request identity from a hash of the payload, both requests would share an identity. The second click would be silently deduplicated away as a retransmission, dropping the user's deliberate second action.

Conversely, a network retry of an identical intention might arrive with altered whitespace, reordered JSON keys, or an updated client-side timestamp. A content hash would treat the retransmission as a brand-new request, executing the action a second time.

A request key decouples *caller intention* from *payload serialization*. The caller explicitly declares: "Whenever you see key `req-42` from me, it refers to this specific intended action. If you have already accepted it, do not execute it again."

### The Input ID triple and namespace security

An Input ID bounds deduplication to the exact context where it is safe:

```text
Input ID = ( Authenticated Producer Namespace, Destination Execution ID, Producer Request Key )
```

Each component of the triple protects against a specific failure mode:

- **Authenticated Producer Namespace**: The namespace is derived exclusively from the trusted principal context established during transport authentication (such as mTLS certificates, verified JWT claims, or internal RPC credentials). It is **never** extracted from an untrusted payload field such as `body.user_id` or `body.tenant_id`. If identity were extracted from payload fields, a malicious or buggy tenant could forge another tenant's namespace, intentionally colliding with their request keys to hijack their receipts or deduplicate their legitimate input out of existence.
- **Destination Execution ID**: Deduplication is strictly local to the target Execution. If Producer A sends request key `approve` to Execution 1 and the same request key `approve` to Execution 2, they represent two distinct Input IDs. Neither Execution interferes with the other.
- **Producer Request Key**: The caller-controlled string that distinguishes separate requests from the same producer to the same Execution.

Because an Input ID is scoped by namespace and destination, it is never a global cross-tenant deduplication token. Two independent callers can both use the request key `"1"` without coordinating, and without any danger of collision.

### Separate identity domains for creation and ingress

A critical architectural invariant established in K1.1 is that **creation and post-creation input use separate identity domains**.

When an application creates an Execution, it provides a caller-scoped creation key (`caller_namespace`, `request_key`). Creation is an atomic decision that binds four facts at once:
- the newly minted Execution ID,
- the pinned [Definition](core.md#definition) revision,
- the initial authority binding, and
- the initial input Event.

Accepting this initial Event during creation does **not** consume a post-creation Input ID. The initial Event carries creation provenance and is verified against the creation receipt.

Later, while the Execution is running, the same producer might send an input Event into the Execution's [mailbox](core.md#mailbox) and reuse the string `"weekly-report-2026-w38"` as its request key. The Kernel treats this as a valid, fresh ingress request. It constructs an Input ID using the destination Execution ID, finds no prior post-creation ingress under that Input ID, and accepts the Event.

If creation and ingress shared a single deduplication namespace, one of two bugs would occur:
1. The later input Event would be falsely rejected as a duplicate of the creation request, preventing the caller from using natural correlation names; or
2. A caller retrying an Execution creation could accidentally match a pre-existing mailbox input from an entirely different workflow, corrupting the new Execution's genesis state.

### Conflict vs idempotent replay

When a creation request arrives with a creation key that has already been accepted:
- If the request content (Definition, authority, initial input) is **identical** to the accepted record, the Kernel returns an **idempotent success**: the existing Execution ID and the original creation receipt.
- If the request content **differs** from the accepted record under that same creation key, the Kernel declares a **creation conflict**. It creates nothing, mutates nothing, and returns an error. A creation key cannot be used to update, patch, or overwrite an existing Execution.

## Runtime attempt

A **Runtime attempt** is the currently authorized effort by an [Execution Runtime](core.md#execution-runtime) to compute and resolve one specific, unresolved [Activation](core.md#activation) exchange.

### The nature of an attempt

An Activation is an immutable semantic contract: it commands the Runtime to resume from pinned progress and process a specific, reserved batch of Events. But real-world computation is messy. The host running the Runtime might crash, suffer a network partition, hit an out-of-memory error, or hang indefinitely in an external LLM call.

To achieve fault tolerance, the Kernel must be able to try executing that same immutable exchange more than once without minting a new exchange. Each authorized undertaking of that exchange is a **Runtime attempt**.

It is essential to distinguish between a transport re-send and a new attempt:
- **Transport re-send**: If a network glitch interrupts delivery of an Activation to the Driver, the Kernel may re-transmit the Activation packet. This is an operational retry of the **same attempt**.
- **Authorized takeover**: If the host executing the attempt is declared dead or unresponsive, an authorized supervisor or recovery protocol initiates a replacement attempt. This replacement attempt works on the **same Activation ID**, but under a new attempt identity and an incremented [writer epoch](#writer-epoch).

### Runtime attempt vs physical action attempt

A Runtime attempt must never be confused with a **physical action attempt**:

| Dimension | Runtime Attempt | Physical Action Attempt |
|---|---|---|
| **What it executes** | An Activation exchange (running agent/workflow code). | A Kernel-mediated [Effect](actions.md#effect) (e.g., calling an external payment API or publishing a report). |
| **Who executes it** | An [Execution Host](operations.md#execution-host) running Runtime code. | An action adapter invoking an external system. |
| **Fencing mechanism** | [Writer epoch](#writer-epoch). | Dispatch ownership and settlement certainty. |
| **Lifecycle owner** | [The execution cycle](../mechanisms/execution-cycle.md). | [Actions mechanism](../mechanisms/actions.md). |

Collapsing these two attempts into one generic "attempt" counter obscures whether a failure occurred inside the agent's internal thinking process or out in the external world during an irreversible side effect.

## Writer epoch

A **writer epoch** is a monotonically increasing integer, or equivalent total order, that identifies which Runtime attempt's [Outcome](core.md#outcome) is currently authorized to be accepted for an Activation exchange.

### The split-brain problem in execution runtimes

Consider what happens without an epoch fence:
1. Worker 1 receives Activation `act-1` to draft the weekly report.
2. Worker 1 hits a 60-second garbage collection freeze or network partition.
3. The Kernel's scheduler lease expires. The Kernel assumes Worker 1 is dead and assigns Activation `act-1` to Worker 2.
4. Worker 2 quickly drafts the report and submits its Outcome. The Kernel accepts it.
5. Suddenly, Worker 1 unfreezes. Oblivious to the fact that it was superseded, Worker 1 finishes its own draft and sends its Outcome to the Kernel.

If the Kernel simply accepted whatever Outcome arrived for `act-1`, Worker 1 would overwrite Worker 2's accepted progress. Even worse, if Worker 1 proposed side effects (such as emailing the draft to executives), those side effects would be executed twice.

### The writer epoch as a total fence

The writer epoch solves this by strictly ordering attempts within an Activation:
- When Activation `act-1` is first dispatched, it is assigned **writer epoch 1**.
- When Worker 1 stalls and a takeover is authorized, the replacement dispatch to Worker 2 retains the identity `act-1` but advances to **writer epoch 2**.
- When Worker 1 recovers and submits its Outcome under epoch 1, the Kernel compares the submission against the current accepted epoch (2). Because $1 < 2$, Worker 1's submission is recognized as stale and is **rejected immediately and completely**.

```text
Kernel Timeline:
[Dispatch act-1 (epoch 1)] --------------------------> [Takeover act-1 (epoch 2)] ---> [Accept Outcome (epoch 2)]
                                                                                              ^
Worker 1: (hangs / partitioned) ................................. [Submits Outcome (epoch 1)] |
                                                                   |                          |
                                                                   v                          |
                                                          REJECTED (Stale Epoch)              |
Worker 2:                                              [Runs attempt 2] ----------------------+
```

### What the writer epoch fences

A dangerous inference is to assume that the writer epoch only protects the Runtime's saved state ([progress](state.md#progress)).

The writer epoch fences **the entire Outcome acceptance boundary in one atomic decision**:
- **Batch acknowledgment**: Stale Worker 1 cannot cause the reserved batch of Events to be acknowledged.
- **Progress replacement**: Stale Worker 1 cannot commit its continuation data.
- **Emissions**: Stale Worker 1 cannot publish output drafts.
- **Effect intents**: Stale Worker 1 cannot schedule external actions, send messages, or spawn child Executions.
- **Wait and deadline registrations**: Stale Worker 1 cannot register new wait conditions or timers.
- **Readiness and lifecycle transitions**: Stale Worker 1 cannot mark the Execution complete or failed.

If any piece of an Outcome slipped past the fence, a stale worker could trigger irreversible external actions while having its internal state rejected. In ArrokothI, an Outcome is accepted as an indivisible whole: if the writer epoch matches, all proposed changes commit together; if it does not match, nothing commits.

### What the writer epoch does not do

To prevent false security assumptions, understand the boundaries of the writer epoch:
1. **It does not mint a new Activation ID**: Takeover creates a replacement attempt for the *same* Activation ID. The input, the reserved batch, and the logical exchange remain identical; only the authorized writer epoch advances.
2. **It is not an operating system lock**: The writer epoch is an internal Kernel fencing token. It prevents a stale worker from committing accepted facts to the Kernel. It **cannot** physically prevent a stale worker running on a remote host from writing to an unmediated local scratch disk or invoking unmediated ambient network endpoints. Physical containment belongs to [Isolated Execution](operations.md#isolated-execution), not logical Kernel fencing.
3. **It does not dictate multi-exchange continuity**: Whether the writer epoch resets to `1` when a *subsequent* Activation (`act-2`) begins or continues incrementing monotonically across the entire Execution lifetime is **implementation-owned**. The Kernel protocol requires monotonicity only *within* the resolution of a single Activation exchange.

### Attempt envelopes

An **attempt envelope** is the transport wrapper that carries attempt-specific metadata (such as the writer epoch, dispatch timestamp, and lease bounds) alongside the immutable Activation exchange. It is a transport vehicle, not a distinct identity or recovery mechanism.

## Dispatch and delivery

**Activation dispatch** is the Kernel's authoritative act of preparing and sending one Activation through an [Execution Driver](core.md#execution-driver) toward a Runtime.

Its **dispatch intent** is the accepted Kernel record that immutably fixes the exchange input, the reserved Event batch, and the currently authorized attempt metadata *before* the message is transmitted.

**Delivery** is an ordinary transport verb describing the transmission of data across a boundary. It must always be qualified by naming *what* is delivered and *to whom*.

### The dispatch intent: Recording before sending

In distributed systems, a process crash can occur at any millisecond. If the Kernel sent an Activation across the network before recording what it sent, a crash during transmission would leave the system in an unrecoverable state: an external worker would be computing on an exchange that the Kernel had no record of dispatching.

Therefore, the Kernel commits a **dispatch intent** to its authoritative store first. The dispatch intent records:
- the target Execution ID,
- the Activation ID and attempt epoch,
- the exact pinned base progress revision,
- the exact list of reserved Event IDs forming the batch, and
- the lease deadline.

Only after this record is accepted does transmission begin. If the Kernel Worker crashes immediately afterward, recovery can inspect the dispatch intent, evaluate the lease clock, and safely decide whether to wait for the attempt or initiate a takeover.

### The logical path vs physical hops

The protocol specifies the logical path of dispatch as:

```text
Kernel  ──(Activation dispatch)──>  Driver  ──(Native submission)──>  Runtime
```

This logical separation does not require multiple physical machines or network hops:
- In a co-located deployment, the Kernel, Driver, and Runtime can run in a single process. Dispatch is a TypeScript function call, and delivery is an in-memory object reference hand-off.
- In a distributed deployment, the Kernel might write to a queue, a Driver worker might poll the queue and invoke an HTTP endpoint on a remote cluster, which in turn invokes an agent container.

The architecture remains identical in both cases. Crucially, **the receipt of bytes at either hop is not Outcome acceptance**. A Driver confirming that it received an Activation means only that the packet arrived; it does not mean the Runtime executed the work, and it does not mean any progress was accepted.

### The delivery reporting boundary

Between dispatching an Activation and receiving an Outcome, the Kernel needs to know one operational fact: *Did the Driver succeed in handing off the work to the Runtime?*

This is governed by the **delivery reporting boundary** (formalized in K1.1 decision `KC1-ARCH-1`):
1. **One-way capability**: Alongside the Activation, the Kernel provides the Driver with an attempt-scoped reporting capability:
   ```typescript
   deliver(report: DeliveryReport): undefined
   ```
2. **First report wins**: The Driver reports delivery success or delivery failure. The Kernel accepts the first report for that attempt and ignores duplicate or conflicting subsequent reports for that same attempt.
3. **No accepted state change**: A delivery report is operational evidence. It changes **no accepted business state**:
   - It does not acknowledge the reserved batch of Events.
   - It does not advance progress.
   - It does not alter the Execution's lifecycle state.
   A Driver reporting "delivery succeeded" merely records attempt evidence inside the Kernel; it does not mean the report has been drafted.
4. **Late reports settle only their attempt**: If Worker 1 was superseded by Worker 2, and Worker 1's Driver belatedly calls `deliver(...)`, the report is recorded against attempt 1's historical log. It has zero effect on attempt 2 or the current Execution state.

### Disambiguating delivery

Because "delivery" is a common word, it is frequently misapplied in architecture discussions. Always qualify the term:
- **Activation delivery**: Moving an Activation from Kernel to Driver.
- **Action dispatch**: Transmitting an authorized Effect to an external service adapter.
- **Mailbox acceptance**: Delivering an Event into an Execution's destination mailbox.
- **Output delivery**: Pushing emitted output strings through external channel adapters (e.g., Slack, webhooks) to human readers.

Phrases like "Execution delivery" have no canonical meaning and must be avoided.

## Revision

A **revision** identifies a specific, immutable version of a named value, state, or contract.

There is **no global "Execution revision"**. Different components of the system evolve at different rates, are authored by different principals, and require different consistency guarantees.

```text
+-----------------------------------------------------------------------------------+
|                               Seven Distinct Revisions                            |
+-----------------------------------------------------------------------------------+
| Code & Meaning:   [Definition Revision]         [Runtime Contract Revision]       |
| Interpretation:   [Progress Codec Version]      [Operation / Schema Revision]     |
| State & Progress: [Base Progress Revision] ---> [Accepted Progress Revision]     |
| External World:   [Resource / State Revision]   [Action Evidence Revision]        |
+-----------------------------------------------------------------------------------+
```

### The seven revision kinds

ArrokothI explicitly defines seven distinct kinds of revisions:

| Revision Kind | Creator / Change Point | Purpose | What Failure It Prevents |
|---|---|---|---|
| **Accepted progress revision** | The Kernel, at the exact moment it accepts an Outcome proposing replacement progress. | Identifies the latest accepted checkpoint of Runtime continuation data. | Prevents a stale attempt from overwriting progress that has already moved forward. |
| **Base progress revision** | The Kernel, when constructing an Activation. It copies the current accepted progress revision. | Informs the Runtime of the exact state baseline it is being asked to advance from. | Prevents a Runtime from computing changes against an outdated baseline it did not realize was superseded. |
| **Definition / Runtime contract revision** | The application developer or deployment publisher, at release time. | Pins the exact version of the executable code (Definition) and the protocol semantics (Contract). | Prevents an in-flight Execution from experiencing uncoordinated code drift or breaking API changes mid-run. |
| **Progress codec version** | The Runtime or Driver author. | Specifies the serialization format used to encode and decode progress bytes. | Prevents a newly deployed worker from attempting to deserialize continuation data written in an incompatible binary format. |
| **Operation / schema revision** | The owner of a mediated operation. | Pins the input/output schema, argument meaning, and validation rules for an action. | Prevents an action from being admitted under arguments that no longer match the external service's current contract. |
| **Resource / state revision** | An external resource service (e.g., database or document store). | Tracks modifications to shared external state accessed during execution. | Prevents race conditions and lost updates when multiple Executions interact with governed external resources. |
| **Action evidence revision** | The trusted settlement or reconciliation path. | Appends new evidence or refined certainty to an action attempt record. | Allows the Kernel to update its understanding of an external action (e.g., from "unknown" to "settled") without rewriting historical evidence. |

### Why a single global counter fails

To understand why seven revisions are necessary, consider the failure of a single global integer counter:
- Suppose an Execution is at "Revision 4".
- A worker is running an Activation.
- Concurrently, an external service updates the revision of a governed database record from 12 to 13, and a background reconciliation job refines the settlement evidence of a previous email action from "pending" to "delivered".
- What is the Execution's revision now? Is it Revision 5? Revision 6?
- When the worker finally submits its Outcome proposing "Revision 5", the Kernel would be forced to reject it because the global counter moved to 6—even though the worker's progress was completely orthogonal to the email delivery evidence.

Decoupling revisions ensures that progress advances when and only when progress actually changes. If an Execution is running attempt 2 with writer epoch 2, based on base progress revision 4, and the Kernel accepts its Outcome, the new accepted progress revision becomes 5. Attempt 1 did not produce revision 5; epoch 2 did.

Revisions need not all be integers, and they never share a global sequence.

## Acceptance, boundary and receipt

**Acceptance** is an authoritative decision by the Kernel to commit a request or observation under its governing contract.

An **atomic acceptance boundary** defines a set of facts that must commit together in one indivisible transaction, or not at all.

A **receipt** is durable, retained evidence proving that a specific request was accepted at a named acceptance boundary, revision, and position.

### The meaning of acceptance

In casual engineering conversations, people often say: "The server accepted the message." But what does that mean?
- Does it mean the TCP socket received the bytes?
- Does it mean the JSON parser parsed the body without error?
- Does it mean the schema validator verified the fields?
- Does it mean the business logic checked authorization?
- Does it mean the state change was committed to disk?

In ArrokothI, **acceptance** has a strict, narrow meaning: it is the authoritative commit point.
- Receiving a packet is transport ingress, not acceptance.
- Passing schema validation is syntactic verification, not acceptance.
- Authorizing an action is admission, not acceptance.

Nothing is accepted until the Kernel commits it to the authoritative Execution record. Prior to acceptance, any failure leaves zero trace in accepted state. Following acceptance, the state is permanently bound, survives process crashes (in accordance with the deployment's storage profile), and can be authoritatively inspected.

### The six receipt scopes

A receipt is not a generic "HTTP 200 OK" message. A receipt proves only what its specific boundary committed. There is no single receipt for an Execution; there are six distinct receipt scopes:

| Receipt Scope | Boundary Question It Answers | What It Proves | What It Does NOT Prove |
|---|---|---|---|
| **Creation / input ingress** | "Was this creation request or mailbox Event accepted?" | The Execution exists, or the Event is safely stored in the Execution's mailbox. | It does **not** prove the Runtime has seen, processed, or obeyed the Event. |
| **Activation dispatch intent** | "Was this exact dispatch intent committed before transmission?" | The Kernel has authoritatively reserved the batch and bound the attempt epoch. | It does **not** prove the Driver or Runtime received the packet. |
| **Outcome acceptance** | "Was this Runtime proposal accepted as the new state baseline?" | Progress, emissions, intents, waits, and state transitions committed atomically. | It does **not** prove that any proposed [Effects](actions.md#effect) have run in the external world. |
| **Effect admission** | "Was this physical action attempt authorized and recorded?" | The request passed authority, policy, and exact consent, and dispatch ownership was assigned. | It does **not** prove the external service received or executed the call. |
| **Effect settlement** | "Was the external action result or evidence accepted?" | The outcome of the physical attempt (success, failure, or permanent unknown) is recorded. | It does **not** prove the caller's higher-level goal was accomplished. |
| **Child / message operation** | "Was this child spawn or cross-execution message accepted?" | The child Execution was created, or the message was committed to the destination mailbox. | It does **not** prove the child has finished or that the recipient has read the message. |

### The receipt proof invariant

The central rule governing receipts is:

> **A receipt proves only its named decision and nothing beyond it.**

A common, dangerous reasoning mistake is to hand an **Outcome acceptance receipt** to an end user and claim: "Your report has been emailed to the board."

An Outcome acceptance receipt proves only that the Kernel accepted the Runtime's proposal to email the board. At the moment that receipt is generated:
- The email action is merely an [intent](actions.md#logical-action-and-intent).
- It has not yet been admitted against current policy.
- It has not received human consent (if required).
- No network packet has been sent to the SMTP server.
- The SMTP server has certainly not settled the request.

Conflating an Outcome receipt with an Effect settlement receipt is how systems falsely promise real-world side effects that subsequently fail admission or crash in the network queue.

### Internal transitions create no caller receipts

Not every Kernel transition produces a caller-facing receipt. When a wait deadline expires, the Kernel mints a [Timeout Event](core.md#timeout-event). This is an internal, trusted scheduler transition. It records an internal fact in the Execution's history, but it introduces no seventh caller-facing receipt API. Receipts exist to provide external callers with verifiable proof of boundary commitments.

### Security, privacy, and lookup semantics

Receipts are sensitive audit records. Looking up a receipt requires strict access control:
1. **Authentication and scoping first**: When a client requests verification of a receipt using a request key or receipt token, the Kernel authenticates the caller and establishes their authorized tenant namespace *before* performing any lookup.
2. **Timing and error non-leakage**: If a caller queries a request key that belongs to another tenant or principal, the Kernel must not return a distinguishable error such as "Access Denied (Key Exists)". Doing so allows attackers to enumerate active request keys across tenants. The response must return a uniform "Not Found" error, and execution timing must not reveal whether the record exists in another partition.
3. **Idempotent replay within retention bounds**: If a legitimate caller retries a request with an identical request key within the declared retention window, the Kernel returns the original receipt. If the retention period has expired and deduplication tombstones have been purged, the key is treated as fresh under the governing operating profile.

Receipt serialization formats, cryptographic signatures, and token representations remain implementation-owned choices. The protocol defines what receipts prove, what boundaries they bind, and how they isolate authority.
