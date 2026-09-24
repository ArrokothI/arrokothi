# Continuation, retained information and resources

The pages before this one followed the weekly report through its exchanges: what the [Kernel](core.md#kernel) accepts, what an action is, which identities make a retry recognizable, where code runs, and how a [Runtime](core.md#execution-runtime) is built on the inside. This page asks the same report a different question: **what does it keep, and who stands behind each thing it keeps?**

A running Execution gathers information of many kinds. There is the point the Runtime had reached, and the record of what the Kernel decided. There are facts the application vouches for, conclusions a model drew from a document, and reminders the Runtime left for itself. There is a draft in a document store and a workspace full of downloaded figures. Once stored, these all look much the same — records with fields, objects with names — and it is tempting to call the lot "state" or "memory" and keep it all in one place. But they differ in the two ways that decide how each may be used: **who is answerable for the information**, and **what anyone may conclude from holding it**.

The terms below name those differences, and they are not all the same kind of term. The first and third groups name what the protocol carries or depends on, whoever wrote the Runtime. The middle group is optional: roles that ArrokothI's own reference facilities use for what a Runtime knows. A Runtime may adopt them or keep its framework's memory exactly as it is.

There are ten terms, in three groups, and each group answers one question:

- **How does the work continue?** — [progress](#progress), the [checkpoint and locator](#checkpoint-and-locator) that progress can carry, [recovery and re-execution](#recovery-and-re-execution), and the [Execution History](#execution-history) the Kernel keeps of its own decisions.
- **What does the work know, and who answers for it?** — [structured state](#structured-state), [Derived Semantic Memory](#derived-semantic-memory) and [Working Notes](#working-notes), in descending order of the weight each can bear. This group is optional.
- **What does the work hold outside the protocol?** — the [artifact reference](#artifact-reference), the [resource binding and attachment](#resource-binding-and-attachment), and the [retention, pins and tombstones](#retention-pin-and-tombstone) that stop either from vanishing while something still needs it.

This page says what each term means. Other pages specify how the terms behave together: [recovery](../mechanisms/recovery.md) covers continuing after a crash; [state and memory](../mechanisms/state.md) covers assertions, claims, notes and artifacts; [resources](../mechanisms/resources.md) covers bindings and cleanup; and [evidence](../mechanisms/evidence.md#retention-and-deletion) covers retention and deletion.

## A first example

Return to the weekly report in the production deployment from the [operational terms](operations.md#a-first-example). Kernel Workers there are backed by Postgres, and the deployment's [operating profile](operations.md#operating-profile-and-durability) promises that accepted state outlives the process that was advancing it. The Runtime is the Agent from [the roles page](roles.md#a-first-example).

**Monday.** The Agent finishes a first draft and needs the editor before it can go further. Its [Outcome](core.md#outcome) proposes a wait. Alongside the wait, the Outcome carries the little the Agent will need to pick up again later:

```text
{ phase: "await-editor", draftRef }
```

That object is the report's **progress**. The Kernel accepts it together with the wait. From then on the Kernel holds it without reading it.

The draft itself is not in the progress. Its twelve pages sit in the application's document store, and `draftRef` is an **artifact reference** to them. The reference names which store, which document, which exact version — v3 — and a digest of v3's bytes. v3 was **pinned** before the reference was proposed, so the store will not delete it while accepted progress still needs it.

Several other kinds of information are in play around the report. Each is worth naming before anything goes wrong:

- **Figures.** The figures the Agent downloaded sit in a workspace the deployment set aside for this report, which is a **resource binding**. The host reached the workspace through an open client, an **attachment**, and closed that client when the exchange ended. The workspace stayed.
- **A reminder.** The Agent left itself a note: *Finance may revise the Q3 sheet on Thursday — recheck before sending.* That is a **Working Note**. This Agent keeps its notes in its host's memory. So far that has been enough, because the same host has run every exchange.
- **Two headcounts.** The HR system, which the application runs and stands behind, records a headcount of 208; that record is **structured state**. The Agent's retrieval also turned up a line extracted from last quarter's board minutes: *headcount 212*. That line is a claim in **Derived Semantic Memory**: something concluded from a document, which may be out of date.
- **The Kernel's own record.** The Kernel has a record of what it decided: the report was created with its input, an Activation was dispatched, an Outcome was accepted and a wait was registered. That record is the **Execution History**.

**Wednesday.** The editor replies — *tighten section 2* — and the reply is accepted as an [Event](core.md#event). The Kernel dispatches a new [Activation](core.md#activation) carrying the reply. Halfway through the revision, the host running the Agent loses power. It had begun writing a v4 of the draft into the document store.

Go down the list again and ask what is still there.

- **The Kernel's records** are all present, because this deployment's store survived. That covers the accepted progress, still pointing at v3; the batch carrying the editor's reply; and the Activation that never got an answer. The Execution is still `RUNNING`, because an Activation is unresolved.
- **The draft.** v3 is intact and still pinned. The half-written v4 exists too, but no accepted record names it: v4 is an orphan in the store.
- **The workspace** is intact. Losing the attachment ended one host's access to the workspace, and nothing more.
- **The note** is gone with the host's memory. Nothing the Kernel accepted was lost, but whoever continues the work will not know to recheck Finance's sheet.
- **The two headcounts** are both unchanged. The crash has made neither of them more true or less true.

The Kernel now has to decide what happens to the unanswered Activation, and it does not simply start the work again. Rebuilding the accepted records was the easy half; those records are what survived. The other half is a question only the [Driver](core.md#execution-driver) can answer: can the native work continue safely? For this Runtime, everything it needs to continue is in the accepted progress and the pinned batch, and there is no running job to reconnect to.

Suppose this Runtime's Driver declares that an exchange in this phase reaches nothing outside the Runtime except model calls and new draft objects in the store. Suppose also that the application has accepted the cost of repeating those. Then **replay** is safe. A replacement attempt is given the same exchange: the same Activation, the same pinned progress, the same batch. The dead host's attempt is [fenced](identity.md#writer-epoch) off, so the Kernel will refuse anything it submits if it ever returns. The Driver's declaration made that decision possible; the lapse of a lease could not have.

Change one fact and the answer changes. Suppose the Agent could also send email natively in this phase. Then nobody could prove that the dead host had not already sent the report to the board. The Driver cannot establish that continuing is safe, so the Execution stays `RUNNING` but **recovery-held**, and the reason is visible to anyone who inspects it.

Now suppose another team runs a similar Agent inside a session hosted by its model provider, and that team's progress holds only the session's ID. When that team's host died, the provider kept the session running. By the time recovery looks, the session has taken four more steps that no Outcome proposed and the Kernel never accepted. The ID still finds the session, so it is a **locator**. It may be possible to reattach to the session and learn what it did. What cannot be done is to resume from the point the Kernel accepted, because nothing preserved that point. A **checkpoint** would have preserved it.

**Friday.** The report completes. From here on, what keeps any of its information available is **retention**: each kind of record is kept for its declared period, and none of them forever. Eventually the report's original input is deleted. After that, a **deduplication tombstone** can still bind the original create request's identity to its content, so that a very late exact duplicate is recognized as a duplicate and not taken for a new request.

Each term that story introduced has an entry below, and the rest of the page makes each one exact.

## How the work continues

An Execution continues across Activations, across hosts, and sometimes across crashes. Four terms describe what makes that possible. Progress is the continuation the Runtime saves. Checkpoints and locators are the two very different kinds of native reference that progress can hold. Recovery is what happens to all of it when a host is lost. The Execution History is the Kernel's own record of what it decided.

### Progress

**Progress** is Runtime-owned continuation information. The Runtime proposes it in an Outcome, the Kernel accepts it, and the Kernel hands it back unchanged in the next Activation. The meaning belongs to the Runtime. The Kernel owns which version is accepted, and binds that accepted version to its retention.

That split lets two parties coordinate around a value that only one of them understands. The Kernel never learns whether `{phase: "await-editor"}` means the draft is done. It needs to know only two things: which version is accepted now, and which version the exchange behind a proposal started from. The accepted and base progress [revisions](identity.md#revision) carry exactly that, and nothing about the content. The Runtime, for its part, gets back precisely what it last had accepted. It never gets a merged, repaired or reinterpreted version, and it never gets whatever it may have written somewhere since.

Progress takes one of three forms, and the forms differ in what they promise after a crash:

1. **Inline structured continuation.** The continuation itself, such as `{phase: "await-editor", draftRef}`. Everything inside it comes back with the accepted record.
2. **An immutable checkpoint reference.** A pointer to saved native state from which the work can resume.
3. **A locator for a still-running native job.** A way to find work that is carrying on somewhere else.

The second and third forms are both small references into somebody else's store, and they are easy to mistake for each other; [the next section](#checkpoint-and-locator) is about that difference. What matters here is that a progress record keeps the three forms visibly distinct. Pack them into one opaque value and nobody can tell which promise a given continuation makes, and recovery is when that matters most. A Driver's [support record](../mechanisms/integration.md#support-record) declares which of these forms the Driver uses. Code whose whole continuation fits in the first form needs neither of the others.

Every persisted form of progress is pinned to what can interpret it: the [Definition](core.md#definition) and [Runtime contract](core.md#runtime-contract) revisions, and the version of the progress [codec](values.md#codec), the format in which the Runtime or Driver stores continuation and reads it back. All three are fixed at [creation](../mechanisms/creation.md#one-atomic-creation), before the first progress exists. Change any of those and stored progress can stop being usable. Worse, it can go on decoding cleanly while meaning something new, which is why [compatibility](../mechanisms/recovery.md#compatibility-and-migration) is checked before restored progress is run.

Progress does not have to contain the work. In the example it holds a phase and a pointer, and the twelve pages live in a document store. What progress must carry is enough to continue. Everything else can be named instead of held.

### Checkpoint and locator

A **checkpoint** identifies one specific resumable native state, together with the compatible code and the resources required to resume it. A **locator** only finds something: a mutable native session, or a job that already exists and may still be running.

One question separates them: *can the thing it points at change without the Kernel accepting anything?* A checkpoint cannot change, because staying fixed is the whole point of one. A locator can, and often does. So a session ID counts as a checkpoint only if the session's contents cannot advance independently of accepted progress. Many native sessions can advance on their own, and an ID for one of them is a locator, whatever the field that holds it is called.

After a crash the difference becomes concrete. A checkpoint lets the Driver resume from exactly the state the Kernel accepted. A locator lets the Driver ask where a session or job is now and what it has done since. That answer is useful for [reattachment](#recovery-and-re-execution), and it is no help at all for getting back to a particular earlier point.

The two parties split the work of making a checkpoint. The Runtime creates the native state, in a native store the Kernel does not own. The Kernel accepts only the reference to that state and never inspects what lies behind it. Acceptance pins the checkpoint; rejection pins nothing. The native store and the Kernel's store share no transaction, so a checkpoint has to exist before the Outcome that names it is proposed, and it must not be collected while acceptance is still pending or while an accepted reference still names it. [Checkpoint publication](../mechanisms/recovery.md#checkpoint-publication) states what every implementation must guarantee across that gap. How an implementation stores and pins its checkpoints is the implementation's own choice, and that page names one option without requiring it.

"Resumable" does not have to mean a serialized process image. A native engine may rebuild a resumable state from its own pinned durable history by rerunning compatible deterministic code, provided its recovery contract establishes that the rebuilt state is equivalent to the state named. That history belongs to the engine and is pinned by the Driver. It is not the Kernel's [Execution History](#execution-history), which records decisions, not steps.

The opposite mistake is treating a saved copy of the work as a way back into it. A saved conversation holds the conversation, and a filesystem snapshot holds files. Neither holds a tool call still waiting for its result, a model invocation in flight, or the position the engine had reached in its own control flow. A checkpoint that has to resume those things must actually contain them.

### Recovery and re-execution

**Recovery** reconstructs accepted state and then, if the supported native contract allows it, continues the same logical work. Those are two jobs, done in a fixed order.

- **Reconstructing** is mechanical. Whether there is anything to rebuild from depends only on whether the deployment's storage kept the Kernel's accepted records.
- **Continuing** is not mechanical. The Kernel does not own the native work and cannot look at it, so the Driver's contract for the exact native phase decides.

[Deciding permission before replacing work](../mechanisms/recovery.md#decide-permission-before-replacing-work) owns the procedure.

Continuing the same work can take several forms, each with its own precondition. The first is resuming from a checkpoint, which needs the checkpoint, compatible code and the resources the checkpoint requires. Two others have names of their own, and the table adds a third term that does not continue the work at all:

| Term | What it does | Only when |
|---|---|---|
| **Reattachment** | Reconnects to a native job that already exists | The job can still be found, typically through a locator, and the Driver declares exclusive ownership of it or how to reconcile what it did |
| **Replay** | Performs the same immutable exchange again: same Activation, same pinned input | The contract for that exact phase proves that repeating it is safe |
| **Restart-from-input** | Starts an explicitly authorized *new* Execution, linked by causation to the original | Someone with the authority to create that Execution decides to |

Replay needs its precondition because an exchange may already have reached the world, and the repeat reaches it again. In the report's example, repeated model calls are billed twice, and a repeated native email is sent twice.

Restart-from-input stands apart from the other two: it does not continue the original at all. **A terminal lifetime never reopens.** When a completed, failed or cancelled report needs doing again, the new work is a new Execution that points back at the old one. That separation keeps a finished lifetime from acquiring new actions after its result was recorded. What a restart may and may not carry over from the original is set out in [compatibility and migration](../mechanisms/recovery.md#compatibility-and-migration).

**Recovery-held** is what happens when no form of continuing can be shown to be safe. It is an inspectable operational condition: an Activation is still unresolved, and it cannot safely continue. The lifecycle state stays `RUNNING`.

- **Not `WAITING`:** `WAITING` means an accepted Outcome declared something the Execution needs, and nobody declared anything here.
- **Not failed:** the native work may still be alive, and may already have done something.

Holding with a visible reason is the honest report of that situation. [Inspection](../mechanisms/evidence.md#inspection-grows-with-the-supported-mechanism) shows the reason and the permitted next steps.

### Execution History

**Execution History** is the Kernel's evidence of its own decisions and observations:

- the input it accepted;
- the Activations it dispatched;
- the Outcomes it accepted or rejected, and the progress they installed;
- action evidence;
- routing, lifecycle changes and recovery decisions.

The History is the Kernel's side of the story and only that side. That rules out three things it is commonly expected to be.

- **Not an Agent transcript.** The Kernel never saw the report's model calls, prompts or tool loops, which all happened inside the Runtime.
- **Not a business database.** The headcount lives in the HR system. The History can show that an Outcome was accepted, but it holds none of the application's own records.
- **Not an automatic replay engine.** Some durable engines rebuild state by rerunning code against a recorded history of their steps. The Execution History records decisions, not the Runtime's steps, so rerunning arbitrary Runtime code against it reproduces nothing. A Runtime that recovers by replaying history does so against its own pinned history, under its Driver's contract.

Native traces, such as the Runtime's logs or a provider's record of a run, can be linked from the History so that an investigator can follow the story across the boundary. Linking a trace does not make it part of the accepted record: a trace is the Runtime's account, not the Kernel's decision. [What evidence proves](../mechanisms/evidence.md#what-evidence-proves) says what each kind of record establishes.

## What the work knows, and who answers for it

The next three terms are optional. They name the roles in ArrokothI's reference facilities for keeping what a Runtime knows. In descending order of the weight each can bear, the roles are an assertion, an inference and a note. A Runtime may adopt those facilities or keep its framework's own memory. Either way, the Kernel stores none of the three and never reads them.

What adoption buys is a set of promises kept by the facilities, not by the Kernel:

- a claim becomes fact only through explicit, validated promotion;
- a corrected claim stays explainable;
- a child or branch inherits only what was explicitly selected for it;
- whether notes survive a crash is decided in advance.

[State and memory](../mechanisms/state.md) specifies those promises.

### Structured state

**Structured state** is application values that someone deliberately asserted, bound to a schema. The HR system's headcount of 208 is structured state: the application recorded it on purpose and stands behind it.

Both halves of that definition do work. The schema makes the value checkable. The deliberate assertion makes the value a fact the application answers for. A schema alone cannot do the second job. A model that reads the board minutes and emits `{"headcount": 212}` has produced valid JSON under the very same schema, and has asserted nothing. Structure is a property of the record, while assertion is an act by an accountable party.

The application or resource service that holds structured state owns its validation, its revisions and its retention. Those revisions are resource and state revisions in [the identity page's sense](identity.md#revision). A write conditioned on "still revision 17" checks against them, and [the state service contract](../mechanisms/state.md#state-service-contract) specifies that write and the rest of how such a service behaves.

### Derived Semantic Memory

**Derived Semantic Memory** is retained inferred content: claims that something concluded from sources, which may be wrong, stale or contradictory. *Headcount 212, per last quarter's minutes* is such a claim. It may have been true when the minutes were written, it may be a misreading, and another claim may contradict it.

The name is narrower than "memory" in everyday use. It does not mean everything an Agent remembers: the Runtime's progress, its notes and its [context](roles.md#context) are other things. It means this one role, content that was derived and so has to be believed with its derivation in view.

A claim is only as good as its source, so the Runtime or provider that keeps a claim owns its source provenance and its correction. [Claims, promotion and correction](../mechanisms/state.md#claims-promotion-and-correction) says what a useful claim records, and how a correction keeps the earlier claim explainable.

**Promotion** is how a claim becomes structured state: the application's explicit, validated decision to assert that claim as application state. Suppose someone in HR confirms that an acquisition brought the headcount to 212. The application can then promote the claim: it validates the claim against that confirmation and asserts 212 as its own value, under its own revision. Nothing about promotion is automatic. A claim does not graduate by being retrieved often, by sounding confident or by being well-formed.

Neither inference nor promotion automatically grants authority. Suppose a document states that *the board pre-approves every weekly report*. A claim extracted from it is evidence that the document says so. It cannot approve this week's publication. Promoting the claim would make it an application fact, and an application fact still counts as evidence for authority only under a trusted policy contract. In no case does it become this action's [consent](actions.md#exact-consent). [Content is not authority](../mechanisms/authority.md#content-is-not-authority) owns that boundary.

### Working Notes

**Working Notes** are bounded, Runtime-local scratch: plans, hypotheses and continuity notes that a Runtime keeps for itself. *Recheck Finance's sheet on Thursday* is a Working Note. So is a half-formed plan for section 2, or a hypothesis the Agent means to test.

Three properties define Working Notes.

- **Bounded:** notes are a scratchpad, not an ever-growing log.
- **Local to the Runtime:** nobody else relies on them, and the Kernel does not see them.
- **Optional:** a Runtime need not keep any. In particular, notes are not a required record of a model's private reasoning. A note is whatever the Runtime found worth writing down, not a transcript owed to anyone.

Work that divides can divide its scratch space too. A [local branch](roles.md#stage-and-local-branch) can have its own writable **scratch frame**, starting from inherited information that was explicitly selected for it. If the report's Agent runs three searches side by side, each of those branches could start from the brief and keep its own jottings, without one branch's half-thoughts leaking into another. [Notes and handoff](../mechanisms/state.md#notes-and-handoff) specifies what is inherited and how retained facts are brought back together.

What happens to notes in a crash is a design decision, and the only wrong answer is never having made it. In the example, the Finance reminder vanished with the host, and the Kernel lost nothing it had accepted. If the report's recovery had genuinely depended on that reminder, the notes would have had to be part of what the Runtime's checkpoint contract retains. Otherwise their loss is a quality limitation the Runtime declares in advance, not a failure of recovery.

## What the work holds outside the protocol

The last three terms concern things an Execution depends on that live in stores the Kernel does not own. These are work products and source material; backing resources such as a workspace or a session; and the rules that stop either from being deleted while something still needs it. In each case, what crosses the protocol is small — a reference, a binding, a retention obligation — and the thing itself stays where it is.

### Artifact reference

An **artifact** is source material or a work product held by an application or native store: the twelve-page draft, the Q3 sheet, a generated chart. An **artifact reference** is how an artifact crosses the protocol. It does not carry the bytes. It carries a bundle of facts sufficient to find exactly the right content again, and to say who is responsible for it:

- the store or namespace, and the object within it;
- the exact immutable version or digest the reference requires;
- a media or schema hint;
- the size;
- the access owner, whose permission governs reading the artifact;
- the retention responsibility, which says who keeps the artifact available.

`draftRef` in the report's progress is an artifact reference. Its version is what makes "the draft" mean v3 specifically, even after a v4 exists. Its access owner is why a replacement host still needs permission to read v3. Its retention responsibility says who answers for v3 staying available while accepted progress points at it.

This is a contract for what a reference must carry, not a universal Kernel Artifact class. Artifacts stay in whatever stores the application and Runtime already use.

A URL or a hash on its own falls short in both directions. A hash identifies content without saying where it is or whether it still exists. A URL says where to look without guaranteeing that the bytes are there, that they are the intended ones, or that the reader may fetch them. Neither supplies access, and neither supplies availability. [Artifacts and files](../mechanisms/state.md#artifacts-and-files) covers publishing, verifying and handing references on.

### Resource binding and attachment

A **resource binding** associates a workload or principal with a specific backing resource: a workspace, a native session, a database view. It records the resource's intended owner, its identity and version, the sharing that is permitted, and who is responsible for cleaning it up or retaining it. An **attachment** is temporary access to that resource, through a host's client or a lease.

The two last for very different lengths of time. The report's binding to its workspace lasts as long as the report needs the workspace: across Activations, across hosts and across the crash. Each attachment lasts only as long as one host's use of the workspace. So releasing an attachment does not destroy the backing resource. When the host that died on Wednesday lost its client, the workspace was still there, and so was the binding that says whose it is, ready for recovery. Destroying a resource is a separate operation, with its own check of ownership.

A serialized client is not a durable binding. Save a live database client into progress and restore it after a restart, and what comes back is configuration, not a connection. It may even be a credential stored somewhere a credential should never be. The binding is the durable fact, and fresh clients are made from it.

Creation has an asymmetry of its own. A resource can be allocated successfully and then have its handle lost before anyone records it. That is not a failed allocation: the resource exists, and no record names it. [Resource operations](../mechanisms/resources.md#resource-operations) owns the whole allocate, attach, release and destroy sequence, including how such an orphan is found.

### Retention, pin and tombstone

**Retention** is the declared period or condition under which data stays available. A **pin** prevents deletion while an accepted or in-use reference still requires the data under its retention contract. A **deduplication tombstone** keeps the permitted binding between an identity and its content after the full payload has been deleted.

This is the retention sense of *pin*. Earlier pages also say that an Activation *pins* its progress and batch, or that creation *pins* a Definition revision, meaning it fixes one exact version so that everyone later resolves the same thing. The two senses meet but do not coincide: fixing a version says which data is meant, and a retention pin keeps that data from being deleted while something still needs it.

Each of the three is a promise with limits, and the limits are the point.

- **Retention is declared,** which means written down, not assumed. A supported profile [publishes](../deployment.md#what-a-supported-profile-publishes) its retention windows, and the report's accepted progress, its artifacts, its receipts and its traces can each have a different window.
- **A pin holds data because something still needs it,** and only within the supported contract. v3 stays pinned because accepted progress names it. The pin lasts as long as that need, not longer, and it is no promise to keep v3 forever.
- **A tombstone keeps enough to recognize, not enough to restore.** After the report's input is deleted, a tombstone can still bind the create request's identity to its content, so an exact duplicate can be told apart from a conflicting request. It cannot replay the request. It does not make the content anonymous either: a hash of a short or guessable value can often be reversed by trying the candidates.

So neither a pin nor a tombstone implies unlimited retention, replay, or anonymity of hashes. What happens when retention ends belongs to [evidence retention](../mechanisms/evidence.md#retention-and-deletion). That covers how deletion is reported, and why a record that no longer exists must say so, not answer as if nothing had happened. Cleanup of the resources themselves belongs to [resources](../mechanisms/resources.md#capacity-cancellation-and-retention).

Next in the reading order: [values](values.md) — the exact rules for when two values are the same, and how large one may be.
