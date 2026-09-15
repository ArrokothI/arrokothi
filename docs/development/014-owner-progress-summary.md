# ArrokothI and benchmark: progress summary for the owner

**Snapshot: 2026-09-15.** Checked ArrokothI remote `main`
`07f7502c4a7d75aa37ab7694c5e62522e0e8c9ec`, accepted implementation H5
`52b1600f3b42e3a360fdc3395178f1d147edf304`, acceptance/status A
`519ba002378707a4deccff1ea0a243d21eb694b7`, reference C `2dc3cedb02888d891ec0a6389439b7cfb3b07943`, and reference H
`d4bd49fd49fb6d70a992635cf2b6bf8317c3af89` in the
[cleanup handoff](work/K1.1-correction-01/cleanup-01.md). Benchmark remote `main` remains
`5a3f1ba525f68244701b1f73a1d29c4902ffe589`; its E1 branch remains
`8de04779d279dba82cf834d419e465d2b677ef46`.

This is the human-readable account of accepted work and its limits. The
[ArrokothI ledger](007-work-packets.md) and
[benchmark ledger](https://github.com/ArrokothI/benchmark/blob/codex/e1-kernel-acceptance-capture/docs/development/007-evidence-packets.md)
own status; linked reviews and cleanup records hold the evidence.

## Where things stand

| Repository | Accepted and integrated | Open |
|---|---|---|
| ArrokothI | K0.1-process-review, K0.1, K0.2 (**K0 closed**), K1.0 | Corrected K1.1 implementation independently accepted at H5; reference supplement awaiting independent review, final cleanup and owner integration pending. K1.2–K1.4 planned; `next_release: none`. |
| benchmark | PROC-1, E0 | E1 blocked and unmerged on its branch. |

The private target package can now create an Execution, accept later input and dispatch a fixed
Activation through a Driver in memory. It cannot yet accept an Outcome or complete the exchange.
Remote main contains an earlier K1.1 tree whose invalidation history is preserved; it does not
contain the accepted corrective H5. The correction's acceptance is real, while the current branch
still needs an independent review of its reference supplement before a merge-ready handoff.

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
[review-08](work/K1.1-correction-01/review-08.md). The separate reference supplement records the
accepted identity/value boundaries and updates delivery evidence; it awaits independent review.
[Cleanup](work/K1.1-correction-01/cleanup-01.md) is blocked on that review, and corrected
implementation integration remains pending. This is not closure of the parent K1 milestone.

**Limit:** no Outcome acceptance, accepted progress update, Event acknowledgment, terminal result,
wait/cancellation implementation, persistence, physical isolation, native Driver fidelity or E1
result. The implementation's Node 25.2.1 full-suite evidence is green; the independent reviewer
recorded two legacy Effect-test cancellations on Node 22.22.3, also reproduced at the original base.
That existing Node-version issue remains an owner observation, not a claim of universal test success.

## The next few steps

### Finish reference review, then owner integration

Have a separate reviewer check the bounded [reference contract](work/K1.1-reference-01/contract.md)
and exact C/H in its [report](work/K1.1-reference-01/implementation-01.md). H5's implementation
ACCEPT is preserved. After the supplement is accepted, final cleanup can be completed and the
branch handed back for manual merge. There is no successor release yet.

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

Each remains planned pending its own prerequisites and owner release. K2 governs actions; R1
native fidelity; K3 persistence; K4/K5 composition and operations; D1 isolation; E5 comparative value.
None follows merely from the current acceptance.

## What you need to inspect personally

The immediate decision is selecting the separate reference reviewer using the exact handoff in
[cleanup-01](work/K1.1-correction-01/cleanup-01.md). Keep the existing Node 22 legacy-suite issue
visible for separate maintenance. After a completed cleanup handoff, merge manually and report
that merge so its actual ancestry/content can be verified before an integration receipt is written.

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
