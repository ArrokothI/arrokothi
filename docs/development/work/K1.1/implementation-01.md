# Implementation report — K1.1, round 1

## Identity

- **Packet / parent:** K1.1, parent milestone K1 ([001 K1](../../001-current-status-and-roadmap.md)).
  **Contract:** [work/K1.1/contract.md](contract.md), **revision 1**.
  **Governing process baseline:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b` — 006, 007, 008, 012 and
  015 exactly as they stand on integrated `main`, untouched by this candidate.
- **State:** WAITING_FOR_REVIEW. **Owner release:** explicit instruction on 2026-09-14 ("Let's
  release K1.1") delivered through [Prompt A](../../009-universal-prompts.md#prompt-a--coding-agent).
- **Prerequisite ACCEPT and integration:** K1.0 with corrections 01–02, independently ACCEPTED at H
  `def91fb9f34ade40a65cbde999c0ffe192d18239` (A `4c3c2cf6cb0d4a0c6dd5ecbd97ceccadb8f161b0`,
  [review-01](../K1.0-correction-02/review-01.md)), integrated on `main` as
  `4f02e6cad2dbc9d5444fededbdc27f0dc695060d`, verified an ancestor of C in
  [01-tree-and-environment.log](validation-01/01-tree-and-environment.log). Its formal integration
  receipts were still owed at that commit; see [K1.1-OPEN-1](#unresolved-obligations).
- **Branch:** `codex/k1.1-create-reserve-async-dispatch`. **Configured remote:**
  `https://github.com/ArrokothI/arrokothi.git`.
- **Base:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b`. **Payload C:**
  `8cd9e269b1c08f166dec1b567aedf7d1b4810b34`. **Previous reviewed H:** none — this is round 1.
- **Candidate H:** the commit containing this report. Its full SHA and the verified advertised remote
  SHA are supplied in the owner handoff after the push.
- **Exact C..H administrative file allowlist:**
  - `docs/development/work/K1.1/implementation-01.md` (this report)
  - `docs/development/work/K1.1/validation-01/` (11 declared output-only attachments; MANIFEST plus
    ten logs, each naming C, its command and its SHA-256)
  - `docs/development/007-work-packets.md` (K1.1 status transcription only)
- **Working tree at C:** clean apart from the validation directory the run itself writes; recorded in
  `01-tree-and-environment.log`. **Push:** pending; performed after H and reported in the handoff.
- **One deliberate `.gitignore` exception.** The repository ignores `*.log`, so the ten evidence logs
  are added with `git add -f`, as K1.0-correction-02's evidence was. Without it the manifest would
  cite digests of payloads a reviewer could not open, which 006 treats as evidence that is not
  available. `.gitignore` itself is unchanged.
- **Implementer:** Claude Opus 5 (`claude-opus-5`), Claude Code session, 2026-09-14. The `codex/`
  branch prefix is 006's naming convention for a packet branch, not a claim about which agent wrote
  it. No independent review is claimed or implied by anything in this report.

## Changes and coverage

### Change groups and the cumulative diff

Base→C is 26 files, 4,104 insertions, 61 deletions
([01-tree-and-environment.log](validation-01/01-tree-and-environment.log)).

| Group | Paths | What it does | Governing source |
|---|---|---|---|
| Value model | `packages/kernel/src/values.ts` | Boundary-value validity without repair, RFC 8785/JCS canonical form, logical equality, the four semantic limits, and a seal that makes accepted content immutable | [values](../../../../mental-model/concepts/values.md) |
| Identity and receipts | `packages/kernel/src/identity.ts`, `refusal.ts`, `result.ts` | The authenticated caller, the Input ID triple, the caller-scoped creation key, injective identity packing, three per-boundary receipts, the refusal vocabulary, the accept/refuse result | [identity](../../../../mental-model/concepts/identity.md) |
| Protocol boundary | `packages/kernel/src/coordinator.ts`, `driver.ts`, `lifecycle.ts`, `inspection.ts` | Creation, ingress, reservation, dispatch, redelivery, cancellation, inspection, and the Driver port | [creation](../../../../mental-model/mechanisms/creation.md), [execution-cycle](../../../../mental-model/mechanisms/execution-cycle.md), [core](../../../../mental-model/concepts/core.md), [lifecycle](../../../../mental-model/mechanisms/lifecycle.md) |
| Package surface | `packages/kernel/src/index.ts` | Exports the K1.1 surface; keeps K1.0's refusal mechanism | — |
| Cases | `packages/kernel/tests/*` (9 new files, 1 updated, 1 helper) | 105 cases, up from 4 | [012](../../012-review-methods.md) |
| Structural guard | `tests/conformance/architecture/kernel-landing-zone.test.ts`, `docs/development/work/K1.0/ownership-inventory.md` | K1.0's guard and its written half updated to the measured candidate tree | [015](../../015-structural-evidence-rules.md) |
| Documentation | `docs/development/002-implemented-kernel-baseline.md`, `mental-model/README.md`, `mental-model/mechanisms/evidence.md`, `docs/development/work/K1.1/contract.md` | Baseline note, Layer-1/3 maintenance, the contract | [006 reference maintenance](../../006-development-process.md#maintaining-the-mental-model-reference) |

**Ownership.** Everything new lives in `packages/kernel/src`, the K1.0 target zone. Nothing in
`packages/core`, `packages/sdk`, any provider package, `examples/` or `docs/guides/` changes, and
`tests/conformance/k0` is byte-identical to base; each is listed with a zero change count in
`01-tree-and-environment.log`. No consumer is routed through the new package and its manifest is
unchanged, so it is still `private` with one export.

### Selected 012 methods, and what is excluded

**Deterministic execution** is the primary method: every criterion is driven through
`ExecutionCoordinator` with controlled fake Drivers and explicit barriers, and each case asserts the
whole observable result rather than the headline state. **Normative decisions** covers the identity,
equality and receipt rules — both orders of interacting operations, absent/empty cases, exact limit
edges, and duplicate/conflicting submissions. **Race and fault** is used narrowly, for dispatch
asynchrony and for the ordering of ingress against reservation, using a Driver whose promise settles
only when a case releases it. **Process/documentation** covers the K1.0 guard and inventory
maintenance.

Materially excluded, with reasons: **native Runtime/Driver** (no real Driver exists; R1 owns it),
**external evidence/gate** (no E gate is claimed or run), **packaging/release** (the zone stays
private and unpublished), and **process-failure** evidence (the coordinator is in memory; K3 owns
that claim and this packet makes none).

### Obligation and interaction coverage

Every row was derived from the governing source before the code was written, and re-derived against
the finished packet before this handoff. "Result" is the implementer's assessment, not acceptance.

| Criterion and obligation | Distinguishing case | Expected facts and forbidden changes | Evidence | Result |
|---|---|---|---|---|
| **C1** atomic bind, `READY`, no `CREATED` | create once, inspect everything | every bound field readable, `READY`, one mailbox entry at position 1, revision 0, no Activation | `creation.test.ts` "binds every field" | PASS |
| **C1** lost-response rows 1–3 | create, then retry twice | same Execution, same creation receipt, same initial Event; **no** second Execution, Event or receipt; the full snapshot is byte-equal before and after | `creation.test.ts` "rows 2 and 3" | PASS |
| **C1** conflict, not update | `week 37` then `week 38` under one key | `duplicate_conflict` recorded on the original; mailbox, receipts and Execution list unchanged | `creation.test.ts` "changing the content" | PASS |
| **C1** the whole creation content is bound | six one-field variations | each conflicts, including the Definition revision, the Runtime contract revision, the codec, the authority context, the input kind and an added subscription class | `creation.test.ts` "any changed part" | PASS |
| **C1** equality is logical | member order permuted; array order reversed | reorder replays, reversal conflicts | `creation.test.ts` "honest re-serialization" | PASS |
| **C1** fresh key, identical content | two keys, one payload | two Executions, two receipts | `creation.test.ts` "second intentional run" | PASS |
| **C1** cross-producer and cross-scope keys | one key text, two producers; one caller, two scopes | four distinct Executions; each retry finds its own | `creation.test.ts` "same key text", "two authority scopes" | PASS |
| **C1** no packing collision | `("a","b c","d")` versus `("a b","c","d")` — identical once joined | two Executions, second not a replay | `creation.test.ts` "no packing" | PASS |
| **C1** the principal is not payload-supplied | payload carrying `producer`/`namespace`/`principal` | scoping ignores them; a second caller with the same payload collides with nothing | `creation.test.ts` "the payload cannot supply" | PASS |
| **C1** authorization precedes the lookup | caller without the scope | `unauthorized_scope`, nothing created | `creation.test.ts` "may not scope" | PASS |
| **C2** triple identity and acceptance | submit one input | content, provenance, mailbox entry and position recorded together; nothing acknowledged | `ingress.test.ts` "acceptance records" | PASS |
| **C2** exact replay | submit identical twice | recorded disposition and original receipt returned; position unmoved; snapshot byte-equal | `ingress.test.ts` "exact replay" | PASS |
| **C2** content conflict | same triple, different payload | `duplicate_conflict`; payload not edited, nothing queued, no receipt | `ingress.test.ts` "different content" | PASS |
| **C2** absent is not present | add `subscriptionClass` on retry | conflict, not a silent match | `ingress.test.ts` "declared subscription class" | PASS |
| **C2** the initial input under its own triple | replay and conflict the creation key as an input key | replay returns the creation receipt; conflict refuses | `ingress.test.ts` "reachable under its own triple" | PASS |
| **C2** cross-producer, cross-destination, no packing collision | one key text, two producers; one producer, two Executions; two triples identical once joined | four distinct Events; the colliding pair stays distinct | `ingress.test.ts` three cases | PASS |
| **C2** terminal destination | cancel, then submit new input | refused; not queued and not a terminal disposition; no Event minted | `ingress.test.ts` "third answer" | PASS |
| **C2** replay after the end | accept, cancel, replay exactly | recorded disposition returned, now terminal | `ingress.test.ts` "replay of input accepted before the end" | PASS |
| **C2** conflict after the end | accept, cancel, conflicting resubmission | identity conflict, decided before admission | `ingress.test.ts` "still an identity conflict" | PASS |
| **C2** unknown versus invisible | missing ID; another scope's ID | identical classification and reason; refusal names no Execution; nothing recorded against it | `ingress.test.ts`, `receipts.test.ts` | PASS |
| **C2** capacity | fill to the declared capacity, submit one more | refused before acknowledgment; mailbox unchanged; capacity below one is a constructor error | `ingress.test.ts` two cases | PASS |
| **C2** independent of what the Execution is doing | replay, conflict and new input while `RUNNING` | same answers as while `READY`; new input queued and outside the reserved batch | `ingress.test.ts` two cases | PASS |
| **C3** validity without repair | `NaN`, `±Infinity`, `undefined` member and element, array hole, symbol value and key, bigint, `Date`, `Map`, class instance, non-enumerable member, array with extra properties, lone surrogates in values and names, cycle | each refused with a located code; no coercion to `null`, `"NaN"` or U+FFFD; sharing is not a cycle; every reason reported, not only the first | `values.test.ts` seven cases | PASS |
| **C3** canonical form | key-order and array-order twins, `{}` vs `{"answer":null}`, the five number spellings, every escape class, `/` and DEL direct, UTF-16 versus code-point ordering | exactly the spellings values.md names; equality on canonical bytes | `values.test.ts` seven cases | PASS |
| **C3** the four limits | at-limit and one-over for strings, member names, array and object entries, depth (`A32`/`A33` and the mixed `T32`/`T33`), canonical bytes; astral strings; two containers of 4,096; two 700 KiB siblings; 50,000-deep input | at-limit passes, one unit over is refused, siblings are not summed, deep input is refused rather than exhausting the stack | `values.test.ts` seven cases | PASS |
| **C3** roots are independent at the boundaries | a payload at exactly the depth limit, and one over, at creation and at ingress | the at-limit payload is accepted; the envelope adds no level and no bytes; the reason names the field | `ingress.test.ts` three cases | PASS |
| **C4** what the intent pins | dispatch and read the Activation and the view | every pinned field equals what creation bound; `RUNNING`; per-Execution codec and revisions, never inferred | `dispatch.test.ts` two cases | PASS |
| **C4** reservation is not acknowledgment | dispatch with three queued Events at bound 2 | batch pinned; all three still unacknowledged and queued; `reserved` is a separate property | `dispatch.test.ts` "acknowledges none of it" | PASS |
| **C4** the bound | bounds 1, 2, 3, 9 over three Events; 0, −1, 1.5, NaN | acceptance-order prefix; each invalid bound refused and no exchange opened | `dispatch.test.ts` "acceptance-order prefix" | PASS |
| **C4** one unresolved Activation | dispatch twice | second refused; first exchange untouched | `dispatch.test.ts` "at most one" | PASS |
| **C4** the intent precedes the send | Driver throws; Driver's promise rejects; Driver reads the Kernel back from inside `deliver` | intent and `RUNNING` stand in all three; the re-entrant read already sees the Activation and its batch; input submitted from there is queued and does not join it; failures are operational, not state changes | `dispatch.test.ts` three cases | PASS |
| **C4** asynchrony | delayed Driver on A, then dispatch B | B completes while A's promise is outstanding; A stays pending across an event-loop turn | `dispatch.test.ts` two cases | PASS |
| **C4/C5** the exchange is immutable | a Driver that edits the Activation it was handed | the write throws | `dispatch.test.ts` "identity, epoch, base revision and batch" | PASS |
| **C5** redelivery | dispatch, accept a new Event, redeliver | same Activation ID, epoch, base revision and batch; content equals a snapshot taken before the redelivery; the late Event stays queued; no new receipt | `dispatch.test.ts` "the same exchange" | PASS |
| **C5** redelivery of nothing | before dispatch; after cancellation; invisible Execution | refused each time, nothing created | `dispatch.test.ts` two cases | PASS |
| **C5** no epoch advance | three redeliveries; the takeover surface | epoch stays 1; takeover refuses naming K1.2 | `dispatch.test.ts` "nothing advances a writer epoch" | PASS |
| **C6** per-boundary receipts | one Execution through create → input → dispatch | three receipts, three boundaries, three tokens; ordered by position | `receipts.test.ts` two cases | PASS |
| **C6** replay returns the original | replay each replayable boundary | original tokens; no fourth receipt | `receipts.test.ts` "exact replay" | PASS |
| **C6** refusals mint none | seven refusal paths in sequence | receipt list unchanged | `receipts.test.ts` "every refusal mints none" | PASS |
| **C6** scoped reads, shape and cost | hidden versus missing, in both orders | identical classification and reason; identical record-position cost | `receipts.test.ts` two cases | PASS |
| **C7** unlanded surfaces | `submitOutcome`, `requestTakeover`, `recoverExecution` | each throws naming its owner packet and returns nothing; the full snapshot is byte-equal before and after | `refusals.test.ts` two cases | PASS |
| **C8** no discriminator | scan the zone's executable text; read the exported surface; read the Driver port | zero occurrences of Agent/Workflow or legacy controller vocabulary outside comments; no exported name matches; the Activation pins three revisions instead | `boundary.test.ts` five cases | PASS |
| **C9** inspection is complete and inert | drive one Execution through every boundary and read it twice | every accepted fact present; two reads equal; nothing acknowledged | `inspection.test.ts` two cases | PASS |
| **C9** views and accepted content are copies | edit a returned view; edit the caller's own object after acceptance | the Execution is unchanged; the frozen copy throws | `inspection.test.ts` two cases | PASS |
| **C9** scoped listing | four callers over two scopes | each sees exactly its own | `inspection.test.ts` "visibleExecutions" | PASS |
| **C10** zone rules | the real transitive import graph; the inventory against the tree | no violation; document and policy agree; approved-leaf list still empty; still private | [08-architecture-suite.log](validation-01/08-architecture-suite.log), `boundary.test.ts` | PASS |
| **C10** deferred rows this packet owns | DX-1, DX-2, DX-3, DX-12 | each disposed in writing by its owner, with the reason | [ownership-inventory.md](../K1.0/ownership-inventory.md#k11-disposition-of-its-assigned-rows) | PASS |
| **C11** terminal disposition | cancel a `READY` and a `RUNNING` Execution | every unacknowledged Event, reserved or not, gets an explicit terminal disposition; no deletion, no acknowledgment, no installed progress; the exchange is fenced | `cancellation.test.ts` two cases | PASS |
| **C11** idempotence, ID-1 and isolation | cancel twice; five create-and-cancel rounds; cancel one of two | second cancel reports the terminal result and disposes nothing; no Execution ID reissued; the other Execution is byte-equal | `cancellation.test.ts` three cases | PASS |

**Interactions, not just criteria.** Four pairs were exercised deliberately, because individually
correct sections do not make a coherent packet: ingress against reservation (a late Event never joins
a pinned batch, in three separate cases including one submitted from inside `deliver`); identity
against termination (replay and conflict both keep their meaning after the Execution ends, and they
answer differently from new input); scoping against every other boundary (creation, ingress,
dispatch, redelivery, cancellation and inspection all refuse an invisible Execution the same way, by
one shared code path and one shared reason constant); and the value model against both acceptance
boundaries (each field is its own root at creation and at ingress, so the envelope adds no level and
no bytes).

**The oracle rejects wrong implementations.** 012 asks for a plausible broken behaviour the cases
would catch. [09b-distinguishing-ablations.log](validation-01/09b-distinguishing-ablations.log)
applies sixteen one-behaviour ablations to C in a detached worktree — locale key ordering, a dropped
`undefined` member, a repaired non-finite number, an off-by-one depth limit, a string limit counted
in code units, content retained by reference, a wrapper root, reservation treated as acknowledgment,
a re-selected redelivery batch, an intent written after the send, a second concurrent dispatch,
terminal ingress queued, cancellation deleting input, an Input ID keyed on the bare request key,
separator-joined identity packing, and an invisible destination that costs one extra record position.
Each is rejected, by one to seven named cases.

### Tests added, ported and removed

105 cases in `packages/kernel/tests`, up from 4. Nothing was removed or weakened:
`unsupported.test.ts`'s four cases are all retained, with the refusal example moved from
`createExecution` — which K1.1 implements — to `acceptOutcome`, which K1.2 owns, and its exact
export-list assertion updated to the new surface rather than loosened.

In the architecture suite, three assertions in K1.0's landing-zone guard were updated to the measured
candidate tree and none was removed: the exact reachable-file list (now ten paths, still exact, so a
module that stopped being reachable and therefore guarded would fail), the exact export list (still
exact, plus a new check that no exported name advertises an unbuilt boundary), and the refusal
example. Fourteen literal anchors inside that file's mutated-document controls carry the measured
file count or the zone's status prose; each was updated to keep its control meaningful, including the
two counterexamples that must reproduce a prefix-parsing failure against the real count. The suite
still reports 360 tests, 0 failures — the same count it had at K1.0's acceptance.

**Compatibility and refusal.** No public behaviour changes. `@arrokothi/core`, `@arrokothi/sdk`, every
provider package and every example are untouched, `npm run test:sdk` passes unchanged, and
`packages/kernel` stays `private` with one export. Every target surface this packet does not
implement refuses by name through K1.0's mechanism rather than answering with a no-op.

### Reference maintenance

- **Accepted semantic sources:** [creation](../../../../mental-model/mechanisms/creation.md),
  [execution-cycle](../../../../mental-model/mechanisms/execution-cycle.md),
  [core](../../../../mental-model/concepts/core.md),
  [identity](../../../../mental-model/concepts/identity.md),
  [state](../../../../mental-model/concepts/state.md),
  [values](../../../../mental-model/concepts/values.md),
  [lifecycle](../../../../mental-model/mechanisms/lifecycle.md) — the
  [roadmap mapping for K1.1](../../../../mental-model/roadmap.md#k11) plus `values` and `lifecycle`,
  which the code depends on and the map does not list.
- **Layer-3 owners changed: one.** [evidence](../../../../mental-model/mechanisms/evidence.md)'s
  structural-evidence section described the target package as refusal-only, which stops being true
  the moment a protocol packet lands in it. It now says what K1.0's pass established, that a later
  packet landing real code there changes nothing about what that pass proved, and that the inventory
  is maintained by whichever packet changes the tree it measures.
- **No other Layer-3 semantics changed, deliberately.** This packet *implements* rules it does not
  redefine, so no definition, mechanism or Status line was edited to match the code. In particular no
  page was changed to say that a gate has been met: whether K1.1 is accepted and integrated belongs
  to [007](../../007-work-packets.md), and an implementer cannot record it.
- **Layer 1:** [the overview](../../../../mental-model/README.md)'s "Target, not shipped" note listed
  what each accepted packet has done and ended at K1.0. It now also names which packet owns the first
  protocol boundaries, and points at the status ledger "for what has actually been accepted and
  integrated" rather than for "acceptance and release". This is a status sentence inside that note,
  not a change to the whole-system model.
- **Dependencies inspected beyond the map:** `mechanisms/waits.md` and `mechanisms/output.md` (to
  confirm nothing here anticipates them), `mechanisms/authority.md` (the authority context is carried
  opaquely and no policy is evaluated), `concepts/operations.md` (the three clocks; none is
  implemented here) and `mechanisms/recovery.md` (no recovery claim is made).
- **Placeholders resolved:** none. **Superseded current prose replaced:** the two passages above,
  plus the K1.0 inventory's measurement preamble, which named only K1.0's base and candidate and
  would otherwise have reported a K1.1 measurement as a K1.0 one — the exact confusion
  [015](../../015-structural-evidence-rules.md) warns about.
- **Index, link and example validation:** `npm run check:builder-docs` passes over 26 Markdown files
  and 286 local links and anchors; no vocabulary index entry changed, because no term was added,
  renamed or redefined.
- **Baseline:** [002](../../002-implemented-kernel-baseline.md) gains a K1.1 structural note beside
  the K1.0 one, stating what the package now implements, that nothing in the legacy map changed, and
  that acceptance and integration are recorded in 007 and never there.

All of this documentation is payload in C and therefore inside the reviewed candidate, as
[006](../../006-development-process.md#maintaining-the-mental-model-reference) requires; none of it
is attached as output-only evidence or left for cleanup.

### Semantic correction closure

No prior finding exists to close — this is round 1 — but two changes made during self-review are
semantic corrections in 012's sense, and each was traced through its dependants rather than patched
where it was noticed.

1. **Each field is its own boundary-value root.** The first implementation canonicalized one wrapper
   object per request and compared its bytes. That is a different rule from the one
   [values.md](../../../../mental-model/concepts/values.md) states: a root is measured independently
   and "the enclosing envelope is not an extra aggregate size root". *Counterexample:* a payload of
   exactly depth 32, or of exactly 1,048,576 canonical bytes, passes its limit on its own and fails
   inside a wrapper — so the implementation refused values the contract says must be accepted.
   *Dependent paths walked:* who creates the fact (both acceptance boundaries), who validates it
   (one shared routine now), where identity is computed (the packing, which had to become injective
   over parts because the wrapper's canonical bytes no longer exist), who consumes it (the mailbox
   entry, the Activation and the inspection view all now carry the sealed per-root copy), and how a
   refusal is reported (issue paths are now located under the field name, so `initialInput.payload`
   is distinguishable from `authorityContext`). *Evidence added:* three ingress cases at both
   boundaries, and the wrapper ablation, which seven cases reject.
2. **Accepted content is immutable.** Acceptance retained the caller's own object, so an application
   could edit an accepted payload afterwards, and an observer could edit it through an inspection
   view, while the canonical bytes that decided its identity stayed the same. *Dependent paths
   walked:* canonicalization now returns a frozen structural copy, both boundaries retain that copy
   rather than the argument, the Activation carries it, each carried Event and the events array are
   frozen so a Driver cannot edit the exchange it was handed and have the edit reappear on
   redelivery, and every view array and disposition is a fresh copy. *Evidence added:* two inspection
   cases, two Driver-mutation assertions, and the by-reference ablation.

### Prior findings

None. This is the packet's first candidate; no review exists yet.

### Additional defects found by the implementer

Separately from the two corrections above, self-review under 012 found and fixed:

- **Two non-discriminating cases**, found by the ablation pass, fixed in payload commit
  `8cd9e269b1c08f166dec1b567aedf7d1b4810b34` and described in its message. The identity-packing case
  used two triples that a space-join keeps apart, so a separator-joined packing passed it; the
  scoped-refusal case normalised the record position before comparing, so an implementation that
  advanced the counter differently for a hidden Execution passed it, although
  [identity.md](../../../../mental-model/concepts/identity.md) forbids distinguishing by shape *or
  timing*. Both are now constructed to fail against those implementations.
- **A capacity below one was accepted as configuration.** Creation accepts its initial input in the
  same atomic decision, so a coordinator declaring a capacity of zero would break its own limit on
  the first Execution. It is now a constructor `RangeError`, not a runtime refusal to discover later.

## Validation and interpretation

### Commands

All run from `/Users/rex-shih/Documents/ArrokothI/arrokothi` against clean payload C
`8cd9e269b1c08f166dec1b567aedf7d1b4810b34`, on Node v25.2.1, npm 11.6.2, TypeScript 5.9.3,
Darwin 25.6.0 arm64. Raw output, per-file SHA-256 digests and the exact result of each are in
[validation-01/MANIFEST.md](validation-01/MANIFEST.md).

| Command | Exit | Result |
|---|---|---|
| `npm run typecheck` | 0 | clean |
| `npm test` | 0 | 2,161 tests, 323 suites, 0 fail, 0 skipped (base: 2,060 / 302) |
| `npm run test:conformance` | 0 | 1,947 tests, 283 suites, 0 fail, 0 skipped (unchanged from base) |
| `npm run test:sdk` | 0 | 22 tests, 0 fail — the public host path is unchanged |
| `npm run check:builder-docs` | 0 | 26 Markdown files, 286 links/anchors, 38 public package imports |
| `npm run test:kernel` | 0 | 105 tests, 0 fail (base: 4) |
| architecture suite, TAP | 0 | 360 tests, 0 fail — the same count as at K1.0's acceptance |
| packet cases, TAP | 0 | 105 tests, 22 suites, every case named |
| 16 ablations of C in a detached worktree | 0 | each rejected by 1–7 named cases; worktree clean afterwards |

### External fixtures, gates and decisions

**None executed and none claimed.** No E0–E6 gate was run. The K0.2 public fixture in
`tests/conformance/k0/` — the one the benchmark's E1 kernel-fixture pin names — is byte-identical to
base and no candidate was ported onto it; that port is [K1.4](../../007-work-packets.md#k14--legacy-bridge-and-k1e1-gate)'s.
This packet deliberately borrows that fixture's vocabulary (`READY`/`RUNNING`, `duplicate_conflict`,
batch, acceptance order) so the later port is wiring rather than translation, which is a
convenience for K1.4 and not evidence of anything. No external decision, benchmark revision or
evaluator version is relied on.

### Checks not run, and the resulting limits

- **`npm run test:evals`** — not run. 006 requires it for Agent behaviour; this packet adds no Agent,
  no model path and no eval fixture, and the eval suite is unchanged from base. Limit: no claim about
  Agent behaviour is made or supported.
- **No process-kill, restart or persistence run.** The coordinator is in memory. Limit: nothing here
  supports a durability or recovery claim; K3 owns that method and those claims.
- **No native Driver.** Every Driver in the cases is a fake that records or delays. Limit: nothing
  here supports a fidelity claim about any real Runtime; R1 owns that.
- **No packaging or clean-consumer check.** The zone is private and unpublished. Limit: no
  installability or release claim.
- **No concurrency beyond single-threaded interleaving.** The asynchrony evidence shows the
  coordinator does not await the Driver; it says nothing about multiple workers or shared state,
  which K3 owns.

### Why the evidence supports each criterion — and where it stops

Each criterion has at least one case that would fail against a plausible wrong implementation, and
sixteen such implementations were built and rejected. What the evidence does **not** establish, and
should not be read as establishing: that the protocol works end to end — no Outcome is ever accepted,
so no Execution in this packet ever makes progress, completes or fails through a Runtime; that any
gate is met; or that the design survives persistence, concurrency, real Drivers or Effects. Three
criteria rest on limits that are honest rather than comfortable, and are stated as
[open items](#unresolved-obligations): progress is trivially absent (C4), an empty batch is
unreachable (C4), and C11 exists because C2 needs a terminal state that no other K1.1 mechanism can
produce.

### Design choices, assumptions and the strongest remaining risk

- **Authority is modelled as a scope string plus a caller's scope list.** The mental model requires
  authenticated callers and an authority context but does not fix a representation; K2.2 owns real
  policy. This is the smallest model that makes "input to an unknown destination" and "input to an
  Execution you may not see" answerable identically, which C2 requires.
- **The initial input's Input ID is `(caller namespace, new Execution ID, creation key)`.** Creation
  is one atomic decision that binds the initial input, so its receipt is the creation receipt and the
  two ingress paths cannot disagree about one key. A later input under that key is therefore a replay
  or a conflict, which is asserted rather than left implicit.
- **One Driver per coordinator, and an explicit `dispatch` call.** Scheduling is K3's. The acceptance
  criterion is about one coordinator, and an explicit control keeps a scheduler out of this packet.
- **Strongest remaining risk:** that K1.2 finds this boundary's shape wrong once Outcomes exist —
  specifically that the dispatch intent does not retain something acceptance will need, or that
  `RefusalRecord` does not fit the four Outcome rejection classifications the K0.2 fixture names.
  Both were checked against that fixture's vocabulary while writing, but neither can be proven until
  a packet actually accepts an Outcome. The second risk is C11: if the reviewer judges cancellation
  out of scope, C2's terminal case loses its evidence, and the contract says so explicitly rather
  than leaving it to be discovered.

### Third-party review under AGENTS.md

**None.** No third-party code, test, script, asset, fixture or dependency was copied, adapted,
vendored or added. No package manifest gained a dependency; `packages/kernel/package.json` and the
root manifest are byte-unchanged from base. The target zone's dependency rule is unchanged — `node:`
builtins only, and `node:buffer` is the only external specifier it uses — and no portable leaf was
approved. The canonical encoder is written against
[values.md](../../../../mental-model/concepts/values.md)'s own stated rules and its own worked
examples, which are repository-owned text; RFC 8785 is cited as the normative reference the
repository already adopts, and no code, test vector or corpus from it or from any implementation of
it was consulted or copied. The one unresolved licensing-adjacent question is
[K1.1-OPEN-2](#unresolved-obligations), which is an owner decision about whether to adopt a
third-party JCS implementation at all, not a use of one.

## Unresolved obligations

These do not pass because the suite passed. Each is stated in
[the contract](contract.md#unresolved-obligations-and-open-decisions) and repeated here so a reviewer
does not have to reconstruct them.

- **K1.1-OPEN-1 — the prerequisite's integration receipts are still owed.** 007 records that the
  formal receipts for K1.0 and K1.0-correction-02 remain owed before K1.1 release. They are owner
  records; this packet neither writes nor substitutes for them, and its base is the verified merge.
  *Unblock:* the owner appends them.
- **K1.1-OPEN-2 — "unmodified conforming JCS implementation" versus the zone's dependency rule.**
  values.md prefers an unmodified conforming implementation over an almost-equivalent serializer; the
  zone may not add a third-party package without an owner decision under AGENTS.md's third-party
  review, and K1.0's inventory says so. The encoding is therefore implemented in-zone, behind one
  module, directly against values.md's rules. The divergence from the stated preference is real.
  *Unblock:* an owner decision, either adopting a reviewed dependency or confirming the in-zone
  implementation.
- **K1.1-OPEN-3 — accepted progress is unavoidably trivial.** Progress is installed only by Outcome
  acceptance (K1.2), so every Activation here pins base revision 0 and absent progress. What is
  proven is the *pinning*; "returned to the Runtime unchanged" is not exercised.
- **K1.1-OPEN-4 — an empty batch is unreachable.** `B-2` permits an ordinary continuation to carry
  one, but nothing here acknowledges an Event, so no mailbox drains. It belongs to K1.2's first
  accepted `continue`.
- **K1.1-OPEN-5 — the expired-key policy, published.** This profile is in memory and process-scoped:
  no creation key and no Input ID ever expires while the coordinator lives, and nothing survives it.
  There is therefore no expired-key case to test, and no bounded-retention profile may be claimed
  from this packet.
- **K1.1-OPEN-6 — no durability, isolation or Driver-fidelity claim.**
- **K1.1-OPEN-7 — the delivery-attempt log is unbounded.** Each redelivery appends one operational
  record and nothing trims them. Operational traffic rather than accepted state; retention is K5's.
- **K1.1-DEC-1 — cancellation is a scope judgment the reviewer should rule on**, not an unresolved
  obligation, but it is the item most likely to be contested. See
  [the contract](contract.md#decisions-taken-within-this-contract) for why removing it alone would
  leave C2's terminal case unevidenced.

## Handoff

- **Ready for independent review.** No known mandatory defect, no unresolved owned semantic case and
  no missing result for a claimed criterion. Every limitation above is stated rather than deferred.
- **Base** `777b9955fb3a443f700b4f3d1f4f2aef1869345b`, **payload C**
  `8cd9e269b1c08f166dec1b567aedf7d1b4810b34`, **candidate H** the commit containing this report; its
  full SHA and the verified advertised remote SHA are supplied in the owner handoff after the push.
  Review `base..H` and the C..H allowlist named under [Identity](#identity).
- **No self-acceptance.** This report is the implementer's assessment. Acceptance requires a separate
  reviewer session bound to the exact H, and the successor packet remains owner-controlled and
  unreleased.
