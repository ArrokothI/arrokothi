# Identity, attempts and accepted versions

A long-running Execution produces several kinds of “same thing” questions. Is this request a retry or a new request? Is this Runtime still working on the same exchange, or has another Runtime taken it over? Is this message the same dispatch being delivered again? Is this accepted state a new version of progress, a new Definition, or evidence about an action?

ArrokothI answers those questions with separate identities. No one identifier answers all of them. The separation is deliberate: a request can be retried while its Runtime attempt is replaced; a dispatch can be redelivered without creating a new Activation; an Outcome can be accepted while the action it proposes remains unsettled. Treating these as one identity would make ordinary recovery look like new work, or would make evidence of a decision look like evidence that the outside world obeyed it.

This page follows one illustrative Execution, `E`, created from an application request and later advanced through several Activations. The example is only a way to keep the identities visible; it does not add a special lifecycle or a required token format.

## A running example

An application asks ArrokothI to prepare a report. The application chooses the request key `report-17` in its own producer scope. The Kernel accepts the creation request and creates Execution `E`. The request may be sent again because the response was lost. The retry must identify the same creation request, not merely contain equal text.

Later, the Runtime receives an Activation for `E`. It does not receive a permanent right to write `E`; it receives one bounded exchange: the Kernel has selected a finite batch of accepted Events, pinned the progress from which the Runtime must work, and authorized the current attempt to propose one Outcome. The Runtime may be redelivered the same Activation, or an authorized replacement Runtime may take over the unresolved exchange. Those are different physical circumstances, but they remain one semantic exchange.

Suppose the Runtime's accepted Outcome says that `E` should wait for a report source. The Kernel records a wait and later accepts a new Event from trusted ingress. That Event belongs to the next Activation. It is not a revision of the original request, not a continuation of the old Runtime attempt, and not a new physical action merely because it caused another dispatch.

Finally, suppose the Runtime proposes a mediated action. Acceptance can create an obligation to perform that action; admission can authorize a concrete physical attempt; settlement can later record what happened. Each decision has its own identity and receipt. A receipt for one of those decisions must not be used as proof of another.

The example exposes the organizing rule: every identity answers a narrower question than “what happened to `E`?” The sections below name those questions and show where each boundary lies.

## Request key and Input ID

A **request key** is a caller-chosen name for one logical request in one producer scope. The caller reuses it when retrying because it means “this is the same request I already sent.” It is not a content hash. Equal payloads do not imply equal requests, and different payloads under one key are not a harmless update: they conflict with the key's promise.

Creation uses a caller-scoped creation key. If the application sends `report-17` and the Kernel commits creation but loses the response, a retry with the same authenticated scope, key and immutable creation content can return the existing creation decision. If the first creation never committed, the same retry may commit it. A new intentional run needs a new creation key, even when its input is byte-for-byte equal to the earlier run.

Later input has a different identity shape. Its **Input ID** is the triple:

- the authenticated producer namespace;
- the destination Execution ID; and
- the producer's request key.

The namespace comes from trusted principal context. A payload field claiming to be a tenant, user or producer cannot choose the namespace that controls deduplication. The destination is part of the identity too: the same producer key sent to two Executions names two Inputs.

Creation and later input occupy separate identity domains. Accepting the initial Event as part of creation does not consume the same request text for a later Input ID. The application may subsequently send ordinary input to `E` using `report-17`; that later ingress receives its own Event and ingress receipt. If the application retries that later ingress with equal content, the Kernel returns the recorded ingress decision. If it changes the content under the same Input ID, the Kernel reports a conflict. Retrying creation still addresses creation, not that later Event.

This separation prevents two opposite mistakes. A system must not create a duplicate Execution when a caller retries a lost creation response. It must also not treat every later use of the same human-readable key as a duplicate of creation. The authenticated producer scope, destination and identity domain determine what “same” means.

## Runtime attempt

A **Runtime attempt** is the currently authorized effort to resolve one Activation. It belongs to that Activation's exchange, not to the whole Execution and not to one model call. The Runtime receives a fixed exchange and may propose an Outcome; the Kernel decides whether that proposal is still eligible for acceptance.

Ordinary re-sending does not create a new Runtime attempt. A transport can retry delivery, or the same Runtime can receive the same exchange again after a transient failure, while the Kernel still regards the unresolved work as the same attempt. Redelivery is therefore not new semantic input and does not mint a new Activation ID.

Authorized takeover is different. If the current attempt can no longer be trusted to finish the exchange, the Kernel may authorize a replacement attempt. The replacement has a new writer position for the same exchange, but it does not represent a new Activation or new user request. The old attempt's later write must be rejected rather than allowed to compete with the replacement.

Do not confuse a Runtime attempt with a **physical action attempt**. A Runtime attempt is about proposing an Outcome to the Kernel. A physical action attempt is about an admitted mediated action reaching an external service. One Runtime attempt can propose an Effect; that proposal does not prove that an external service received it. Conversely, recovering an external action can require its own attempt identity even when the Runtime exchange remains unchanged.

The distinction lets recovery be conservative. The Kernel can recognize a duplicate delivery as the same exchange, fence a stale Runtime after takeover, and still separately reconcile whether native work might have occurred.

## Writer epoch

The **writer epoch** identifies which authorized attempt may have its Outcome accepted for the current Activation. The epoch advances only through authenticated takeover and increases monotonically within that exchange. It is a fencing value: a stale attempt may still return bytes, but those bytes no longer have authority to change accepted Kernel state.

The fence covers the whole acceptance, not only progress. A current Outcome can propose several consequences together: acknowledgment of the reserved Event batch, a progress revision, Emissions, Effect intents, a wait or deadline, readiness, and a next state. A stale attempt must not commit any subset of those consequences. Otherwise a takeover could prevent the old Runtime from publishing progress while still allowing it to acknowledge input or admit an action.

The writer epoch is not authentication. It does not identify the application principal, grant authority to call the Kernel, or prove that a Runtime is allowed to perform a mediated action. It is also not a lock on a native session, process, filesystem or external service. Those resources need their own ownership and recovery contracts.

The epoch belongs to the current exchange. The identity rules do not prescribe whether it resets across a later Activation; that question is implementation-owned. A later Activation is a new exchange even if it continues the same Execution and even if it carries the same progress lineage. Do not use an epoch value as a global attempt counter or infer a relationship between numbers from two different exchanges.

## Dispatch and delivery

**Dispatch** is the Kernel's preparation and sending of one Activation through a Driver. Before sending, the Kernel records a **dispatch intent**. That accepted record fixes the exchange input, the reserved Event batch and the current Runtime attempt. It is the Kernel's durable answer to “what did we intend to send?” when a crash or lost transport response interrupts the send.

The dispatch identity answers a narrower question than the Activation identity. It identifies one accepted sending decision. Recovery can therefore retain the same dispatch intent and ask the Driver whether sending, re-sending or holding is safe. A transport retry does not by itself create a new Activation, change the reserved batch or acknowledge the batch.

**Delivery** is an ordinary transport word, so it must say what was delivered and to whom. Delivery of an Activation to a Runtime, delivery of an Outcome to the Kernel, and delivery of an external result are different statements. The word does not define a universal second identity, and the architecture does not require two particular physical hops.

Receipt of bytes at either side is not Outcome acceptance. The Runtime may return an Outcome that the Kernel rejects because the writer epoch is stale, the exchange is unresolved, or the proposed contents fail validation. Conversely, acceptance is a Kernel decision recorded at the acceptance boundary; it is not inferred from a socket write, a callback, or a successful return from `deliver`.

The same distinction applies beyond Runtime transport. An accepted output obligation is not proof that an external recipient saw the output. An admitted action is not proof that the provider completed it. Each later fact needs its own evidence and, where applicable, its own receipt.

## Revision

A **revision** is a versioned accepted or referenced object, but “the revision” is not one universal counter. ArrokothI uses several revision kinds because different objects change for different reasons and have different creators. A progress revision cannot stand in for an Operation revision, and an action-evidence revision cannot be used to infer that progress advanced.

The seven named revision kinds are:

1. **Accepted progress** — the progress the Kernel accepted as part of an Outcome.
2. **Base progress** — the progress from which an Activation's Runtime exchange is formed.
3. **Definition/Runtime contract** — the version of the Definition and Runtime contract that gives the exchange its executable meaning.
4. **Progress codec** — the version that determines how progress is encoded and decoded.
5. **Operation/schema** — the versioned meaning and schema of a mediated Operation.
6. **Resource/state** — the relevant version or immutable identity of a resource and its state.
7. **Action evidence** — the evolving record of admission, physical attempts, settlement and reconciliation evidence for an action.

The creator and meaning differ across these kinds. Accepted progress comes from an accepted Outcome; an Operation/schema revision belongs to the declared Operation contract; action evidence grows as trusted attempts and settlement facts are recorded. A single integer that increments every time any of these changes would erase the distinctions a reader needs for recovery and authorization.

For example, “progress revision 4” does not imply that Runtime attempt 1 produced “revision 5.” The numbers may belong to different domains, may not be integers at all, and need not share a counter. When a rule needs a revision, it should name the kind: a consent decision binds to an Operation revision and exact arguments; recovery checks a progress codec against the progress it must decode; an action settlement updates action evidence without rewriting accepted progress.

Revision identity also does not turn mutable native work into a snapshot. A resource locator may point to changing state, and a native session may advance independently of the Kernel. A revision can identify what the Kernel accepted or what evidence a trusted subsystem recorded; it cannot manufacture guarantees that the underlying resource or external service does not provide.

## Acceptance, boundary and receipt

**Acceptance** is the Kernel's decision to record a proposed fact or obligation. The **acceptance boundary** is the point at which that decision becomes part of the accepted Execution history. A **receipt** proves that one named decision crossed one named boundary. These terms are related, but they are not interchangeable: a proposed Outcome is not accepted merely because it was sent, and a receipt does not prove every consequence that a later system might associate with it.

The architecture has six receipt scopes:

1. **Creation or input ingress** — the Kernel accepted a creation request or later Input/Event ingress.
2. **Dispatch intent** — the Kernel accepted the intention to send one Activation through a Driver.
3. **Outcome acceptance** — the Kernel accepted one Runtime Outcome for one Activation.
4. **Effect admission** — the Kernel authorized a concrete mediated action attempt.
5. **Effect settlement** — the system recorded what is known about an action attempt and its obligations.
6. **Child/message operation** — the Kernel accepted a child-creation or message operation and its relevant identity/correlation decision.

There is no single receipt for an entire Execution. A creation receipt does not prove that a Runtime ran. An Outcome receipt does not prove that an Effect ran. An Effect-admission receipt does not prove that a provider received the request. A settlement receipt records evidence and responsibility; it does not rewrite uncertain external history into certainty.

Receipt lookup is itself scoped and authorized. The Kernel authenticates the requester and checks the relevant producer, destination, Execution and decision scope before revealing receipt content or even confirming that a record exists. Refusal shape and timing must not become an existence oracle. A receipt token's serialization, transport format and storage representation are implementation choices, not architectural identities.

Kernel timeout acceptance does not add a seventh caller-facing receipt scope. A timeout is a Kernel-minted Event for an expired wait generation, and its acceptance follows the Event and Outcome rules already defined for the Execution. It may produce another dispatch or accepted state, but it does not create a new universal kind of receipt.

The practical test is always: **same as what, and accepted where?** The request key answers whether a producer is retrying one request. The Input ID adds producer namespace and destination. The Runtime attempt and writer epoch answer which effort may resolve one Activation. Dispatch intent answers which sending decision the Kernel recorded. Revision identifies one version domain. A receipt answers which accepted boundary was crossed. Keeping those answers separate is what lets ArrokothI retry, recover and reconcile without confusing a repeated message with new work or a recorded decision with an accomplished external result.