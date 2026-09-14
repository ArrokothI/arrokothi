# ArrokothI and benchmark: completed foundations and the next step

## Current update — K1.0 correction-02 cleanup complete, 2026-09-14

**K1.0's pre-merge implementation, review and cleanup are complete. Integration awaits your manual GitHub merge after the verified push in the cleanup handoff.** The independent reviewer accepted the whole cumulative packet at H `def91fb9f34ade40a65cbde999c0ffe192d18239`. The final correction compares lists by their actual members and size, so two different lists cannot pass merely because joining their members produces the same text. Earlier acceptance and reopening records remain intact.

The practical result is a private location for future Kernel implementation, meaningful import guards, and an ownership inventory checked against the code. Existing legacy consumers remain supported. This still implements no asynchronous protocol and establishes no E1 result. **K0 remains closed; K1 remains open; `next_release: none`.**

Cleanup reran the 2,060-test suite, typecheck and builder-doc checks, checked the now-present evidence manifests, and independently challenged 342,225 collection pairs. Current remote main is still the original reviewed base, so there is no intervening main change or merge conflict. See [the cleanup record](work/K1.0-correction-02/cleanup-01.md), [independent ACCEPT](work/K1.0-correction-02/review-01.md) and [authoritative ledger](007-work-packets.md).

**Next owner action:** manually merge the verified scoped branch. Then request verification of the actual remote merge before recording integration. Prompt B/C copy/paste formatting is cleaned up without changing their adopted instructions. The requested fixing-prompt and progress-based escalation improvements are prepared separately as an unaccepted prompt-maintenance draft; 006 requires independent review before adopting substantive workflow changes.

## Earlier update — correction-02 awaiting review (historical)

The following update describes the submitted candidate before its independent ACCEPT; the current update above supersedes its next action and holds.

## Current owner update — correction-02 submitted for review, 2026-09-14

**Do not merge K1.0 yet.** The defect cleanup found is fixed and the packet is back with a reviewer, not accepted. The guard used to decide whether two lists agree by gluing each list into one string with commas and comparing the strings. Two different lists can produce the same string — five real export subpaths and one invented subpath that happens to contain commas look identical that way — so a false inventory passed the guard whose whole job is to reject false inventories.

The correction changes what “the same list” means rather than banning the comma: two lists agree only when they are the same length and hold the same members, and one shared rule now decides that for every list in the inventory, including the two dependency columns that previously compared on their own. Listing members in a different order is still fine, which the real document depends on. Measured against the previously reviewed code, it accepted 22 of 22 false lists; this candidate accepts none, and also catches the mirror case that a comma ban would have missed.

All 2,060 tests pass with zero failures or skips (nine new ones this round, none removed); typecheck and builder-doc checks pass. Historical ACCEPTs are preserved and **C4 claims and integration stay on hold** until a fresh, separate independent review of the whole packet returns ACCEPT. [Report](work/K1.0-correction-02/implementation-01.md), [evidence](work/K1.0-correction-02/validation-01/MANIFEST.md), [original finding](work/K1.0-correction-01/cleanup-01.md), [authoritative ledger](007-work-packets.md).

**Next owner action:** send the pushed candidate head to a **fresh, separate** review session for a cumulative review of base → H against K1.0-C1–C9. The coding session cannot accept its own work. Worth asking that reviewer specifically: does any *other* stage of this pipeline still assume the meaning arriving from upstream survives — that is the shape all three findings have shared. Universal Prompt B/C changes remain pending under the owner's “if accept” condition.

The private target zone and legacy quarantine remain on the branch, unmerged. No asynchronous protocol or E1 result is established. K0 stays closed, K1 stays open, benchmark E1 preparation stays unaccepted, and `next_release: none`.

## Earlier owner update — K1.0 cleanup reopened, 2026-09-13

The following update describes the first cleanup and is superseded by the current update above.

**Do not merge K1.0 yet.** The owner released it against already-built but unaccepted benchmark E1
preparation. Round 16 received an authentic independent ACCEPT at
`f3aa29d7ecba2a23aa85788b7efdebdd383cab24`, but final cleanup found a reproducible C4 evidence defect:
the inventory guard accepts `2.5` as two files and can discard a named dependency if the same cell
also says “nothing.” The actual inventory is correct; the check cannot reliably reject these false
claims. All 2,030 tests, typecheck and builder-doc checks passed during cleanup, showing why the
additional semantic counterexamples matter.

The historical ACCEPT remains. **C4 claims and integration are on hold**, with corrective packet
**K1.0-correction-01** requesting correction of whole-cell parsing and fresh cumulative independent
review. The private target Kernel location and legacy quarantine exist on the branch, but nothing
has been merged and no asynchronous protocol or E1 result is established. K0 remains closed; K1
remains open. Benchmark E1 preparation remains unaccepted. `next_release: none`.

**Next owner action:** hand the [copy-ready fixing prompt](work/K1.0-correction-01/handoff-01.md) to
a coding session. After correction, obtain new C/H validation, independent ACCEPT and a repeated
cleanup before manual GitHub merge. [Cleanup finding and evidence](work/K1.0/cleanup-01.md);
[authoritative ledger](007-work-packets.md). The requested universal Prompt B/C improvements remain
pending under the owner's “if accept” condition; the immediate corrective fixing prompt is supplied.

## Earlier foundation snapshot — historical

The remainder records the snapshot before the K1.0 release. Its “next step” and release-hold wording
is superseded by the current update above; the completed-foundation explanations remain useful.

**Status snapshot: 2026-09-13, America/New_York.**

The contract, public fixtures, evidence preparation and development workflows are accepted and
integrated. **K0 is closed. The next useful work is benchmark E1 fixture preparation, followed by
ArrokothI K1.0 structural preparation and then K1 protocol implementation.** E1 and K1.0 still need
explicit owner release; this summary releases neither.

This document is enough to understand the completed work and make the next sequencing decision
without reading each implementation report or review round. It assumes familiarity with the
top-level architecture and explains the practical consequences instead of repeating it. It is a dated
summary, not a live monitor: a later release, review, integration or blocking finding needs a new
status update. The linked ledgers remain authoritative.

## The four completed steps

There are five accepted packet IDs. For this overview, the two process packets are grouped into one
step because they establish the corresponding workflows in the two repositories. The ordering below
explains their purpose rather than their exact implementation chronology.

| Step | Accepted packets | Question answered | What you can use now |
|---|---|---|---|
| 1. Establish the working process | ArrokothI **K0.1-process-review** and benchmark **PROC-1** | How do coding, review and integration produce trustworthy progress? | Repository-specific coding/reviewer/integration prompts, bounded contracts, evidence handoffs and preserved review history |
| 2. Settle the protocol contract | ArrokothI **K0.1** | What exactly must a future Kernel accept, reject, preserve or refuse? | The accepted protocol and legacy-disposition worksheet |
| 3. Make the contract testable | ArrokothI **K0.2** | Can observable examples expose plausible violations of those decisions? | Deterministic schedules, observation checks, failing controls and an independent operation ledger |
| 4. Define attributable public evidence | Benchmark **E0** | What would a public experiment observe, and who deserves credit or blame? | Two public application specifications, a direct-baseline contract and versioned evidence/ownership controls |

### 1. The working process: K0.1-process-review and PROC-1

The ArrokothI process review used K0.1's repeated correction rounds to improve how work is scoped,
checked and handed off. A reviewer finding now starts a check of the affected behavior and its
dependencies; fixing only the reported example is insufficient. Reviewers examine the cumulative
candidate, including interactions and prior findings, rather than accepting a collection of green
checks or reviewing only the latest patch.

PROC-1 establishes the corresponding benchmark workflow, with additional attention to frozen
experiment identities, private evaluation material and historical references. Moving a document or
editing an apparently harmless comment can affect reproducibility, so those changes have explicit
rules and checks.

For you, the useful result is a repeatable handoff: the coding agent supplies an exact candidate and
evidence, a separate reviewer decides whether it passes, and you control integration and the next
release. Acceptance, integration and permission to start the next packet remain separate decisions.
Each repository owns its own decisions. These process packets establish a usable workflow; they do
not prove that every future implementation will be correct or that review will take fewer rounds.

### 2. The protocol contract: K0.1

K0.1 turns broad architectural intent into decisions an implementer can apply: equality and value
limits, identity and retry rules, receipts, input batches, clock roles, waits, cancellation, terminal
obligations and progress compatibility. It also classifies old implementation data and behavior as
migratable, legacy-only or refused.

For example, a cancellation race is about more than the final `CANCELLED` label. A losing Outcome
must not quietly install progress, acknowledge inputs or publish output while displaying that label.
The contract specifies the whole accepted or rejected change.

You can use this as the implementation contract for later work. **K0.1 did not implement the new
asynchronous Kernel.** The current 0.8.x runtime still has the older Harness/controller design.

### 3. The testable contract: K0.2

K0.2 supplies executable fixture machinery: ordered commands, expected observations, an adapter
boundary for a future candidate, and deliberately wrong transcripts that the checks must reject.
The schedules include delayed Runtime work, duplicate/conflicting Outcomes, wait/input ordering,
stale timers, cancellation races and missing-progress refusal. An independent operation sink catches
cases where a candidate claims it refused an operation but actually dispatched it.

For example, one control preserves the correct cancellation headline while incorrectly committing
the losing progress underneath it. Another reports a correct refusal while the independent sink
records a call. These distinguish meaningful contract violations from merely different wording.

The completed K0.2 gate also records the accepted benchmark E0 evidence, closing K0. However,
**passing the fixture's own tests proves the prepared checking machinery, not a working target
Kernel.** The current repository candidate explicitly refuses unsupported target scenarios. Some
obligations require later K1/K2/K3/K4/K5 observation surfaces and remain assigned there.

### 4. Public evidence and ownership: E0

E0 prepares two fresh public application shapes:

1. **Reviewed artifact publication:** a controlled publication process with explicit review,
   authority, attempted actions and observable outcomes.
2. **A restartable request across two independent jobs plus human input:** a setting for examining
   coordination, accepted input, state ownership and failure handling.

It specifies how an ArrokothI-based implementation and competent ordinary code would use comparable
services and validation. It records where authoritative facts live, which observations are independent,
and how planned unsafe and state-losing controls would expose attribution mistakes. Fixture,
observation-policy and reference-corpus identities make changes to the evidence inputs detectable.

The central practical rule is that laboratory protection earns no subject credit. If the lab prevents
harm or preserves a checkpoint, that alone does not prove the system under test prevented the action
or recovered its own state.

**E0 implements neither comparison arm and measures no application advantage.** Completing and
comparing these applications belongs to E5. E0 acceptance means their public evidence preparation
is accepted, not that ArrokothI is better, durable or isolated.

## The next step: benchmark E1, starting with fixture preparation

E1 turns the accepted K0 conformance material into a repeatable benchmark capture and reporting path.
It pins the ArrokothI fixture at an exact revision, drives deterministic schedules, records raw
observations and produces an invariant report independently of model logs. It reuses the Kernel's
conformance contract rather than inventing a second competing Kernel oracle.

The important cases are delayed computation without global blocking, duplicate/conflicting Outcomes,
input arrival around waits, cancellation/completion races, stale ownership tokens and terminal
obligations. The report must show the relevant accepted identities, revisions, intents and dispatch
counts, with unsupported observations stated explicitly. This work runs offline without a model or
semantic judge.

E0 is accepted and the K0 fixture is available, so the foundation for E1 is present. **The remaining
entry decision is your explicit E1 release**, followed by the agent recording the exact input revision
and bounded contract. E1 is not currently split into approved sub-packets; this summary creates none.

Preparation and the eventual gate result happen at different points:

| Order | Work | What completion means |
|---|---|---|
| Next | **Benchmark E1 fixture preparation** | The versioned capture path, schedules and reporting controls exist before K1 implementation. This supplies a prerequisite, not an E1 pass for a target Kernel. |
| Then, after separate release | **ArrokothI K1.0** | Establish a protected location for new Kernel code and quarantine legacy Runtime internals. Import guards reject forbidden dependencies, while existing supported behavior keeps working. No new protocol behavior or E1 result is claimed. |
| Then, under subsequent releases | **ArrokothI K1.1–K1.3** | Implement creation/reservation/asynchronous dispatch, whole-Outcome acceptance and receipts, then waits and cancellation races. |
| At the K1 gate | **ArrokothI K1.4 with benchmark E1 evidence** | Exercise actual supported candidate behavior and close the applicable K1/E1 obligations. Later K2/K4 work extends the evidence for its own guarantees. |

This ordering prevents two mistakes: beginning Kernel migration before the independent capture
fixtures are prepared, and reporting successful fixture preparation as successful Kernel execution.
No current step establishes process-crash durability, native Driver fidelity, physical isolation or
comparative application value; those belong to later roadmap work.

## What you need to inspect personally

You do not need to replay every historical review to decide what comes next. For each future packet,
the owner handoff should give you the concrete change, what its evidence proves, remaining limits,
the independent verdict, integration status and the next release or hold. Ask for the underlying
review only when a finding, tradeoff or unsupported claim affects your decision.

Your planned detail-design reading can proceed alongside this preparation. For understanding E1 and
K1, prioritize [Execution protocol](../detail-design/execution-protocol.md), then
[Evidence and observability](../detail-design/evidence-and-observability.md), and the relevant parts
of [Recovery and compatibility](../detail-design/recovery-and-compatibility.md). The agents still
must read the governing detail pages before implementing their contracts. You do not have to finish
every optional Runtime design before understanding or releasing E1 preparation.

The universal prompts are available in [ArrokothI's role launchers](009-universal-prompts.md) and
[benchmark's role launchers](https://github.com/ArrokothI/benchmark/blob/ea37331f1e337b5c1106bb6c26784707f306ae0c/docs/development/009-role-launchers.md).
Use A for coding, B in a separate reviewer session with the exact candidate, and C for explicitly
requested administration. Pasting a launcher by itself releases no successor.

## Evidence behind this snapshot

This summary was checked against ArrokothI `ed3c48be28f7e2d8fa1c31dd7ff40192b172b919` and benchmark
`ea37331f1e337b5c1106bb6c26784707f306ae0c`. It summarizes existing acceptance rather than issuing a new
independent ACCEPT or changing packet status.

The preceding readiness check verified all five acceptance/integration chains. ArrokothI typecheck
and 1,775 tests passed, including 810 K0 fixture tests. Benchmark's full check passed with 471 tests
passing and four skipped because a container runtime was unavailable; those skips supply no physical
isolation evidence. Four benchmark identities matched their accepted values. These are recorded
readiness observations from that check, not fresh test runs performed to write this document.

For later updates, use the [ArrokothI status ledger](007-work-packets.md) and
[benchmark status ledger at the inspected revision](https://github.com/ArrokothI/benchmark/blob/ea37331f1e337b5c1106bb6c26784707f306ae0c/docs/development/007-evidence-packets.md).
They link the exact independent reviews and separate integration/owner decisions. Historical reports
may still say “pending” or “unreleased”; those describe their own candidates and dates, and are
preserved rather than rewritten to match a later decision.
