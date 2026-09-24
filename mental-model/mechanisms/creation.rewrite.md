# Creating an Execution and retrying the request

Every Execution starts with the application asking for it. So does most trouble, because the application asks across a connection that can drop the answer. The question here is simple. A caller sent a request and heard nothing back. Did it work? And is it safe to ask again? This page explains how ArrokothI makes "ask again" safe. It covers the request that creates an Execution and every later piece of input sent to it.

**Status:** Required Kernel contract. Introduced by K1.1. This is target specification, not shipped behavior.

## Reading a mechanism page

The concept pages named things one at a time. From here on the named things act together. A mechanism page follows one interaction from start to finish: who acts, what gets decided, what is recorded together, and what the caller can rely on afterwards. [The mechanisms introduction](README.md) explains how these pages lean on the concept vocabulary.

This page is the first of those interactions. It needs the core vocabulary ([Execution](../concepts/core.md#execution), [Event](../concepts/core.md#event), [mailbox](../concepts/core.md#mailbox)), the request identities from [identity](../concepts/identity.md#request-key-and-input-id), and the idea of [canonical equality](../concepts/values.md#canonical-form). Nothing else is assumed.

## A first example

The report application is the service that produces the weekly report. It creates Executions in the authority scope `weekly-reports`, which its authenticated identity is allowed to use. On Monday morning it asks the Kernel to create one, with the creation key `report-17` and the initial input "report for week 37".

1. The Kernel accepts the request. Execution E now exists and is `READY`. Its mailbox holds one Event, the initial input. The Kernel sends back a creation receipt, but the connection drops before the reply arrives.
2. The report application sees a timeout. It cannot tell whether anything happened, so it sends the identical request again, under the same key.
3. The Kernel recognizes the request. It creates nothing. It answers with E and the original creation receipt, as if the first reply had never been lost.
4. That afternoon the editor sends a correction to E under the request key `correction-1`. The Kernel accepts it as a second Event in E's mailbox and returns an ingress receipt.

At the end there is one Execution holding two Events, however many times either request was sent. The rest of the page explains why each step behaves the way it does, and where each guarantee stops.

## One atomic creation

Creation answers two questions, in a fixed order: who is asking, and what exactly is being created.

**Who is asking** is settled before anything else. The Kernel authenticates the caller at a trusted ingress path and checks that the caller may create Executions in the authority scope the request names. Nothing inside the request can stand in for that check. An Execution ID the caller happens to know does not count. Neither does a `user_id` field in the input, or an identity a model wrote into its output. If the caller is not entitled to that scope, the request is refused and nothing is created.

**What is being created** is five facts, accepted as one decision:

- the new Execution's ID;
- the [Definition](../concepts/core.md#definition) revision, which fixes which program runs;
- the [Runtime contract](../concepts/core.md#runtime-contract) revision, which fixes how the Driver reads each exchange;
- the authority context, which bounds what this Execution may do through [mediated](../concepts/actions.md#exposure-and-mediation) actions;
- the initial input, which becomes the Execution's first Event.

The [Definition entry](../concepts/core.md#definition) in the core vocabulary explains why these belong in one decision rather than several: an Execution must never exist without an accepted answer to who may act for it and which code reads its progress. This page adds a view of where each fact goes next, because every mechanism after this one reads from this decision.

| Accepted at creation | Read later by |
|---|---|
| Execution ID | Every later request that names this Execution: input, inspection, cancellation |
| Definition and Runtime contract revisions | [Dispatch](execution-cycle.md#before-sending), which pins them into every Activation, and [recovery](recovery.md#compatibility-and-migration), which checks them before restored progress runs |
| Authority context | [Authority](authority.md), whenever this Execution asks for a mediated action |
| Initial input | [Batch selection](waits.md#selecting-the-batch), because it sits in the mailbox as the first candidate for the first Activation |

The initial input is not sent separately after the Execution exists. It is accepted inside the creation decision itself, and the Event it becomes keeps that origin: its provenance is creation, and the receipt that covers it is the creation receipt. An Execution therefore never exists, even briefly, with an empty mailbox and nothing to do.

The accepted Execution is `READY`. There is no `CREATED` state for anyone to observe, because nothing between "no Execution" and "complete Execution" was ever committed. `READY` means the Execution is eligible for its first Activation. It does not mean an Activation has been sent, and scheduling capacity may delay one. Sending it is the [execution cycle's](execution-cycle.md) job, on the next page.

## The lost-response cases

Go back to step 2 of the example. The report application saw a timeout, and a timeout can mean three different things:

- the request never reached the Kernel;
- the Kernel accepted it, and the reply was lost on the way back;
- the reply arrived, and the application sent the request again anyway, perhaps because an application worker restarted before recording it.

From the caller's side the three look the same. Only the Kernel can tell whether the first request was accepted, and it can do so only if the second request carries something that says "this is the first request again". That something is the creation key.

The caller chooses the key, and the choice carries meaning. Reusing `report-17` says "same request as before". A fresh key says "this is new", even when the content is identical, as it would be if the editor genuinely wanted two copies of the week 37 report. The Kernel cannot derive this from content, because identical content is exactly what a retry and a second deliberate request have in common. [Request key and Input ID](../concepts/identity.md#request-key-and-input-id) develops that argument.

The key is also only text. The Kernel compares requests by the complete [Creation request ID](../concepts/identity.md#request-key-and-input-id), which combines the key with the caller's context. In the in-process binding that context is the producer's authenticated namespace plus the selected authority scope. Step 2 is therefore identified as roughly (report application, `weekly-reports`, `report-17`). How another implementation spells the caller's context is its own choice. The identity page records where the in-process binding writes its answer down.

With the identity found, the Kernel compares content. "The same content" means equal [canonical form](../concepts/values.md#canonical-form), not equal bytes: a gateway that reformats the JSON, reorders its keys or writes the number `37` as `37.0` has not changed the request. The possible outcomes:

| The Kernel finds | Content | Answer |
|---|---|---|
| No record under this Creation request ID | — | Create now: this is the first time the request is accepted |
| An accepted creation under it | Equal | Return that Execution and its original creation receipt; create nothing |
| An accepted creation under it | Different | Refuse as a conflict; create nothing and change nothing already accepted |

The first two rows cover all three timeout cases at once. If the request never arrived, the retry is simply the first acceptance. If the reply was lost, or arrived and was ignored, the retry is answered from the decision already made. The caller does not need to know which case it was in, which is the point: a caller facing uncertainty has one safe action, and the action is to repeat itself exactly.

The third row protects that safety. Suppose the retry said "week 38" instead of "week 37". Treating it as an update would be convenient and wrong. The retry path exists to repeat a decision, and letting it carry a change would give every caller a way to alter an existing Execution's input without anyone deciding to do so. The Kernel therefore refuses the mismatched request. The original Execution is untouched. A caller that really wants a week 38 report sends a new request under a new key.

The key does not reach beyond its caller's context. The Agent team runs its own service, authenticated under its own producer namespace. If that service also creates a report with the key `report-17`, the result is a second, unrelated Execution. Neither request can find, replay or conflict with the other, because the two Creation request IDs differ in the part the caller does not control. In the in-process binding the same holds for one producer using one key in two authority scopes it is entitled to.

One limit is worth fixing firmly in mind. Everything above guarantees one logical creation: one Execution, one creation decision. It guarantees nothing about native work. Whether a native job is ever submitted twice is decided later, by [dispatch](execution-cycle.md) and by the [Driver](../concepts/core.md#execution-driver), and creation does not touch it.

## Later input has a destination

Once E exists, the editor's correction has somewhere to go. Input sent to an existing Execution uses the same retry idea as creation, with one change: the identity now names the destination Execution, which creation could not name because nothing existed yet.

Input is identified by its [Input ID](../concepts/identity.md#request-key-and-input-id): the producer's authenticated namespace, the destination Execution, and the producer's request key. In step 4 that is (editor, E, `correction-1`). The destination is what makes the key's scope obvious here. The editor's `correction-1` sent to E and the same key sent to another report are two different inputs, because they name two different destinations.

Accepting one input records four things together:

- its immutable content;
- its trusted provenance, meaning the ingress path it arrived through, which later decides its [source category](../concepts/core.md#event);
- its mailbox entry, as a new Event in E's accepted order;
- any [readiness](../concepts/core.md#readiness) the arrival creates, which happens when the Event ends a live [wait](waits.md#ending-a-wait) and retires it in the same decision.

These facts go into one decision for the same reason creation's five do. Picture them split. The Event would be in the mailbox while the readiness that should follow it was lost, and a waiting Execution would sit next to the very input it was waiting for with nothing left to wake it. Recorded together, a restart finds both or neither. (Whether the records survive a restart at all depends on the deployment's [operating profile](../concepts/operations.md#operating-profile-and-durability).)

Retries follow the creation rule. The same Input ID with equal content is answered from the record: the same Event, the same ingress receipt and the Event's current disposition. The same Input ID with different content is refused as a conflict and changes nothing already accepted.

### When a key is used twice

One case looks like a collision and is not. The report application created E with the key `report-17`. Later it sends E ordinary input and happens to reuse the text `report-17` as that input's request key.

Creation and later input are separate [identity domains](../concepts/identity.md#request-key-and-input-id), so this is simply new input. It gets its own Event and its own ingress receipt, even if its content matches the initial input word for word. Each domain answers its own retries: repeating the input returns the ingress receipt, and repeating the creation request still returns the creation decision. Neither is mistaken for the other.

The alternative would have a strange cost. If the initial Event occupied the Input ID (report application, E, `report-17`), the producer could never use that text as an ordinary request key. Its first honest use would be answered with a creation receipt for input it never sent through ingress, or refused as a conflict with it.

## When the destination cannot take the input

An input can be well formed and still have nowhere to go. Three situations refuse it at the door rather than accepting it and letting it disappear later.

**The caller may not reach the destination.** Sending input is a [separate power](authority.md#establish-identity-at-trusted-ingress) from creating or inspecting, and the caller needs it for this Execution. A caller with no view of E learns nothing from the refusal. The answer is the same as it would be if E did not exist, in wording, shape and timing. [Receipt lookup](../concepts/identity.md#acceptance-boundary-and-receipt) is held to the same standard.

**The Execution has ended.** A terminal Execution accepts no new ordinary input. A correction sent after the report completed is refused. It does not wait in the mailbox for a lifetime that will never read it. Two neighboring cases take other paths:

- Input the Execution accepted before it ended, and never processed, is not refused retroactively. It receives a [terminal disposition](../concepts/core.md#batch-reservation-and-acknowledgment) under [lifecycle](lifecycle.md) that records that nobody will process it.
- Authenticated evidence about an action the Execution started, such as the publication service reporting on `publish_report` after the report was cancelled, is not ordinary input. It updates that action's record under [actions](actions.md), and the Execution stays ended.

**The mailbox is full.** A mailbox has a declared capacity. Input beyond it is refused at ingress, before anything about it is accepted, so a full mailbox never turns into accepted input that silently goes missing.

A retry of input the Execution already accepted is not new input, so the second and third checks do not apply to it. It is answered from its record, like every exact duplicate, even after the Execution has ended or its mailbox has filled, for as long as that record is retained. The first check still comes before the record is consulted: a caller who can no longer reach E is refused exactly as above, because the record is part of what that caller may not see.

## Remembering has a period

Both retry rules rest on the Kernel still holding the earlier decision. Records cost storage, and a deployment need not keep them forever. What happens to a creation key after its record expires?

It must never quietly become a new request. Picture the production deployment, where the Kernel Workers keep accepted state in Postgres. A retry of `report-17` arrives long after that key's record has lapsed. If the Kernel simply created a fresh Execution, a retry would produce the second weekly report that keys exist to prevent, and nobody would have decided to produce it. So [retention and deletion](evidence.md#retention-and-deletion) requires a stated behavior instead: demand fresh, intentional input, or refuse outright.

Which of those a deployment does, and after how long, is a published part of its [operating profile](../concepts/operations.md#operating-profile-and-durability). A caller can then know how long "ask again" stays safe, rather than discovering it. The same period bounds receipt lookup: a receipt can be returned only while its record is retained.

## Children use the same idea

An Execution can create another Execution as its [child](../concepts/operations.md#child-and-ownership). It does so by proposing an [Effect](../concepts/actions.md#effect) in its Outcome, not by calling the creation path described above. The retry principle carries over unchanged: one stable request identity names one child, however many times the request is repeated. The parent side adds two things that must travel with that identity: the parent's [correlation](../concepts/operations.md#message-request-and-correlation) to the child, and its budget reservation. [Child creation](communication.md#children) owns those rules. The reason to mention children here is to rule out a misreading: a lost reply on the parent side creates a second child no more than a lost reply to the report application creates a second report.

## The contract at a glance

For a reader who comes back to look something up:

| Situation | The Kernel's answer |
|---|---|
| Caller not authenticated, or not entitled to the selected authority scope, even on a retry | Refuse; create nothing |
| New Creation request ID, valid content | Accept one decision binding the Execution ID, the Definition and Runtime contract revisions, the authority context and the initial input; the Execution is `READY` |
| Same Creation request ID, equal content | Return the same Execution and the original creation receipt |
| Same Creation request ID, different content | Refuse as a conflict; change nothing already accepted |
| Same content, fresh creation key | A second, independent Execution |
| Same key text from another producer | A different Creation request ID; no interaction |
| New Input ID to a reachable, live Execution with room | Accept content, provenance, mailbox entry and any readiness together |
| Same Input ID, equal content | Return the recorded Event, ingress receipt and disposition, even if the Execution has since ended or filled its mailbox |
| Same Input ID, different content | Refuse as a conflict; change nothing already accepted |
| Creation key text reused as an input request key | New input, in a separate identity domain |
| Destination not visible to the caller, even on a retry | Refuse exactly as for a nonexistent Execution |
| New ordinary input to a terminal Execution | Refuse; it is not queued |
| Mailbox at declared capacity | Refuse at ingress |
| Retry after the retained record expired | The operating profile's published behavior; never a silent new request |

Next in the reading order: [the execution cycle](execution-cycle.md) — what the Kernel records before it sends the first Activation, and what it does when the Runtime answers.
