# ArrokothI and benchmark: progress summary for the owner

**Snapshot: 2026-09-16 (post-merge).** ArrokothI `main` is the K1.1 integration commit
`b53ccb48a8fd4b9d0b0028fc11e925d563e284fa` (PR #28; parents pre-merge `main`
`07f7502c4a7d75aa37ab7694c5e62522e0e8c9ec` and cleanup head
`d7aa89b4ab2997c4bc0d7ce3571f5bf4d21144b9`; tree
`01e3cd3a04492b0830fff244cb9251dd058514db`, identical to the cleanup head), carrying implementation H5
`52b1600f3b42e3a360fdc3395178f1d147edf304`, reference C9
`a117b2983278f09c03027e2b3553a9a644d18986`, accepted reference H9
`644dfffc7904176ee3a4f9943310cf926408a113`, independent review record
`50eae5a653faa2afeb76d243adf63a1daa14dd98`, and acceptance transcription A
`09220e6be976aff90c30fb47d95c46d6d5e18b0f`. The
[parent receipt](work/K1.1/integration-01.md), [correction receipt](work/K1.1-correction-01/integration-01.md)
and [reference receipt](work/K1.1-reference-01/integration-01.md) record the verification and limits.
By a separate owner instruction on 2026-09-16, K1.2 is released (not inferred from the merge).
Benchmark remote `main` is `5a3f1ba525f68244701b1f73a1d29c4902ffe589`; its E1 branch is
`8de04779d279dba82cf834d419e465d2b677ef46`. Both advertised revisions and the E1 branch ledger
were checked; benchmark main still lists E1 as planned, while its unmerged branch records the blocker.
Benchmark remote `main` is `5a3f1ba525f68244701b1f73a1d29c4902ffe589`; its E1 branch is
`8de04779d279dba82cf834d419e465d2b677ef46`. Both advertised revisions and the E1 branch ledger
were checked; benchmark main still lists E1 as planned, while its unmerged branch records the blocker.

This is the human-readable account of accepted work and its limits. The
[ArrokothI ledger](007-work-packets.md) and
[benchmark ledger](https://github.com/ArrokothI/benchmark/blob/codex/e1-kernel-acceptance-capture/docs/development/007-evidence-packets.md)
own status; linked reviews and cleanup records hold the evidence.

## Where things stand

| Repository | Accepted and integrated | Open |
|---|---|---|
| ArrokothI | K0.1-process-review, K0.1, K0.2 (**K0 closed**), K1.0, K1.1 with correction-01 and reference-01 (accepted, cleanup-complete, integrated and owner-closed; see receipts) | K1.2 released 2026-09-16 by separate owner decision, ready for implementation; K1.3–K1.4 planned; `next_release: none` at integration. |
| benchmark | PROC-1, E0 | E1 blocked and unmerged on its branch. |

The private target package can now create an Execution, accept later input and dispatch a fixed
Activation through a Driver in memory. It cannot yet accept an Outcome or complete the exchange.
Remote `main` now contains the accepted corrective H5 and reference H9 as integrated in `b53ccb4`
(PR #28); the earlier invalidation history is preserved in ancestry. The implementation and reference
acceptances remain recorded separately, with parent, correction and reference integration receipts.
Final cleanup is complete; K1.1 is owner-closed. This is not closure of the parent K1 milestone.

## What has been achieved

### The working process — ArrokothI K0.1-process-review and benchmark PROC-1

**Question answered:** how can each accepted increment be traced to the code and evidence reviewed?

Both repositories have bounded packet contracts, exact candidate identities, separate independent
reviews and preserved raw evidence. Benchmark records also pin fixture and evaluator identities,
keeping evidence ownership separate from ArrokothI implementation ownership.

**Status:** accepted and integrated; current process is owned by
[006](006-development-process.md), [008](008-implementation-report.md) and
[012](012-review-methods.md).

**Limit:** process records do not themselves establish runtime correctness or benchmark success.

### The protocol contract — ArrokothI K0.1

**Question answered:** what must the target Kernel accept, reject, preserve or refuse?

K0.1 settled value equality and limits, scoped identity and retries, receipts, input batches,
clock roles, waits, cancellation, terminal obligations and progress compatibility. It classified
legacy behavior as migratable, legacy-only or refused. The current definitions live in the
[mental-model reference](../../mental-model/reference.md).

**Status:** accepted and integrated; [integration receipt](work/K0.1/integration-01.md).

**Limit:** this packet specified behavior; it did not implement the target protocol.

### The testable contract — ArrokothI K0.2

**Question answered:** can public observations expose plausible violations of the protocol?

The public K0 fixture supplies ordered schedules, expected observations, an adapter boundary and
an independent operation sink. Deliberately wrong controls demonstrate that headline lifecycle
states cannot hide forbidden progress, acknowledgment or sink attempts.

**Status:** accepted and integrated, with E0 satisfied; K0 is closed in the ledger.

**Limit:** fixture tests prove the checking machinery. The pinned benchmark adapter still refuses
target scenarios, and the full K1/E1 gate remains open.

### Public evidence and attribution — benchmark E0

**Question answered:** what would an experiment observe, and which component earns the result?

E0 defines public application shapes, identities, observation policy and reference-corpus inputs
for mediated publication and restartable work. It separates application outcomes, Kernel behavior,
Runtime quality and protection supplied by the laboratory.

**Status:** accepted and integrated in the benchmark ledger.

**Limit:** neither comparison arm nor comparative value was measured by E0; comparison belongs to E5.

### The target boundary and legacy quarantine — ArrokothI K1.0

**Question answered:** where does target Kernel code live, and how is its dependency boundary checked?

K1.0 established the private `@arrokothi/kernel` package, four source ownership zones, a transitive
import guard and a checked ownership inventory. Negative controls challenge import resolution,
whole-cell document reading and collection identity. Legacy exports and behavior remain in
`@arrokothi/core`. K1.1 subsequently populated the target package and added the explicitly approved
exact `canonicalize@3.0.0` dependency; K1.0's original refusal-only exports are historical.

The useful lesson was to test the inventory's meaning across every parsing/comparison step.
[015](015-structural-evidence-rules.md) owns the resulting structural evidence rules.

**Status:** cumulative acceptance at `def91fb9f34ade40a65cbde999c0ffe192d18239`, integrated by
PR #21 `9baff3a03662720af6eefe1ecfabc41fde99298f`. Both the
[parent receipt](work/K1.0/integration-01.md) and
[correction receipt](work/K1.0-correction-02/integration-01.md) exist; their ledger reconciliation
was integrated through PR #26.

**Limit:** K1.0 established source boundaries, not protocol execution, durability or E1 acceptance.

### Creation, input and asynchronous dispatch — ArrokothI K1.1

**Question answered:** can the Kernel retain one coherent request and fixed Activation while the
Driver performs work asynchronously?

The private in-memory coordinator now creates Executions atomically with their initial input,
accepts subsequent input under scoped identities, retains separate receipts, reserves a bounded
batch without acknowledging it, and dispatches that fixed Activation. Redelivery preserves the
exchange and creates a separate delivery-attempt record. A Driver reports delivery explicitly
through a Kernel-owned capability; its first report wins, and pending delivery does not create
`WAITING` or prevent another Execution from dispatching. Scoped inspection exposes those facts.

The review history's useful lesson is that implementation identity, validation identity and prose
about them must agree. The accepted evidence now derives its interval statements from Git and
preserves earlier mistakes as historical records instead of rewriting them.

**Status:** the cumulative implementation is independently accepted at H5
`52b1600f3b42e3a360fdc3395178f1d147edf304` by
[review-08](work/K1.1-correction-01/review-08.md). The reference supplement is also independently accepted at H9.
[Final cleanup](work/K1.1-reference-01/cleanup-01.md) closed the documentation dependency recorded
in the [earlier cleanup](work/K1.1-correction-01/cleanup-01.md); the correction plus supplement are
integrated on `main` as `b53ccb48a8fd4b9d0b0028fc11e925d563e284fa` (PR #28) and K1.1 is owner-closed
([parent](work/K1.1/integration-01.md), [correction](work/K1.1-correction-01/integration-01.md) and
[reference](work/K1.1-reference-01/integration-01.md) receipts). This is not closure of the parent K1 milestone.

**Limit:** no Outcome acceptance, accepted progress update, Event acknowledgment, terminal result,
wait/cancellation implementation, persistence, physical isolation, native Driver fidelity or E1
result. The implementation's Node 25.2.1 full-suite evidence is green; the independent reviewer
recorded two legacy Effect-test cancellations on Node 22.22.3, also reproduced at the original base.
That existing Node-version issue remains an owner observation, not a claim of universal test success.

### Canonical reference for accepted boundaries — ArrokothI K1.1-reference-01

**Question answered:** where can readers find the precise meaning of the accepted creation,
value-capture and delivery boundaries without reconstructing them from review history?

The reference now distinguishes creation keys from later Input IDs, with a fresh-input/replay
example and separate receipts. It defines immutable in-process value capture and its refusal
limits, keeps delivery reporting in one mechanism page, and links these owners through the
vocabulary index and roadmap. Specification pages route current implementation and acceptance
questions to the baseline and ledger.

The review history showed why copied status prose drifts: precise definitions and current build
status need separate owners, and evidence claims must name the revision actually measured.

**Status:** independently accepted at H9 `644dfffc7904176ee3a4f9943310cf926408a113` by
[review-08](work/K1.1-reference-01/review-08.md); cleanup complete, integrated on `main` as
`b53ccb48a8fd4b9d0b0028fc11e925d563e284fa` (PR #28) with K1.1 owner-closed.

**Limit:** this is reference maintenance, not new executable behavior, a new wire schema, a
benchmark result or a release. The review's five non-blocking P3 observations and the existing
Node 22 limitation remain recorded in the cleanup handoff.

## The next few steps

### Owner integration — done; K1.2 released separately

The accepted branch was manually merged as PR #28 (`b53ccb48a8fd4b9d0b0028fc11e925d563e284fa`);
ancestry and tree-equivalence are verified in the parent, correction and reference integration
receipts. K1.1 is owner-closed with `next_release: none` at integration. By a separate owner
instruction on 2026-09-16, K1.2 is released; that release is an explicit owner decision, not
something inferred from the merge. A fresh K1.2 coding agent can now begin from integrated `main`.

### Benchmark E1 — prepared, blocked, unmerged

The E1 branch contains deterministic capture material pinned to ArrokothI K0 fixture revision
`0535160e677231da41b06d9f822e62e2f0364dd1`. Its current ledger remains `BLOCKED_EXTERNAL`:
all fifteen schedules are `REFUSED`, and the full gate has `NO_RESULT`. Preparation is not gate
acceptance. It needs a candidate implementing the pinned fixture port and a separate owner release
to run against it. K1.4 owns that integration; K1.1 acceptance does not unblock E1 by itself.

### ArrokothI K1.2 → K1.4

| Packet | Work remaining | Observable result |
|---|---|---|
| K1.2 | Outcome validation/acceptance, receipts, fencing, whole-batch acknowledgment and progress/output | Exact replay retains its receipt; invalid/stale proposals mutate no accepted state. |
| K1.3 | Waits, subscriptions, deadlines, cancellation and terminal disposition | Races retain accepted input and never reopen terminal work. |
| K1.4 | SDK host/legacy bridge, supported/refused migration, full K1/E1 gate | The supported entry drives actual target behavior and the benchmark obtains a real gate result. |

K1.2 is released and ready; K1.3–K1.4 remain planned pending their own prerequisites and owner
release. K2 governs actions; R1
native fidelity; K3 persistence; K4/K5 composition and operations; D1 isolation; E5 comparative value.
None follows merely from the current acceptance.

## What you need to inspect personally

The merge above is done and verified. Keep the existing Node 22 legacy-suite
issue, the documentation-checker coverage gap and the predecessor evidence-digest annotations
visible for separate maintenance; the [cleanup record](work/K1.1-reference-01/cleanup-01.md)
gives their precise limits. E1 remains blocked on its own branch; K1 is not closed.

## Maintaining this page

This page is rewritten in place after each independent ACCEPT and cleanup, as part of Prompt C's
administrative duties; it is not a log. Update the snapshot header, the status table and the
narrative so a reader who has never seen the previous version gets the current picture. Add a
completed packet under *What has been achieved* using the same shape — question answered, what
now exists, how it got here if that carries a lesson, status, limit — and move it out of *The next
few steps*. Do not prepend dated "update" blocks, do not enumerate review rounds or correction
packets beyond a one-paragraph lesson, and do not restate rules that belong in 006, 007, 012 or
015. Anything historical belongs in the sealed `work/` records, which this page links to and never
paraphrases as authority.
