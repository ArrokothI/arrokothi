# ArrokothI and benchmark: progress summary for the owner

**Snapshot: 2026-09-14.** Checked against ArrokothI `main`
`cb9854764caa1fd17b1b56528909846dd1e5af5e` and benchmark `main`
`5a3f1ba525f68244701b1f73a1d29c4902ffe589` with E1 branch head
`8de04779d279dba82cf834d419e465d2b677ef46`.

This page is the human-readable account of what has been accepted, what each accepted step
actually gives you, and what comes next. It assumes you have read [the mental model](../../mental-model/README.md)
and does not repeat the architecture. It is a summary, not an authority: the
[ArrokothI status ledger](007-work-packets.md) and the
[benchmark status ledger](https://github.com/ArrokothI/benchmark/blob/main/docs/development/007-evidence-packets.md)
decide status, and the linked review and cleanup records hold the evidence. Round-by-round review
history and corrective-packet mechanics are deliberately left out; follow the ledger links when a
particular finding matters to a decision.

## Where things stand

| Repository | Accepted and integrated | Open |
|---|---|---|
| ArrokothI | K0.1-process-review, K0.1, K0.2 (closing **K0**), **K1.0** | K1.1–K1.4 unreleased; `next_release: none` |
| benchmark | PROC-1, E0 | **E1 blocked**, living only on its branch |

In one sentence: the contract for the target Kernel is settled and testable, the public evidence
design is settled, both repositories have a working review process, and the codebase now has a
guarded empty room where the target Kernel will be built — but no line of the asynchronous
Activation/Outcome protocol has been implemented yet, and nothing has been measured against it.

## What has been achieved

The steps below are ordered by what each one answers, not by exact chronology.

### The working process — ArrokothI K0.1-process-review and benchmark PROC-1

**Question answered:** how do coding, review and integration produce progress you can trust
without re-reading every transcript?

Both repositories now run the same shape of workflow. A coding agent works one owner-released
packet on a scoped branch against a bounded contract with stable criterion IDs, and hands off an
exact candidate commit plus raw evidence. A separate reviewer session inspects the cumulative
candidate — not the latest patch — and returns a single verdict bound to that exact commit. A
delegated cleanup role then verifies the tree, maintains the mental-model reference, records
status and pushes the branch. You merge manually. Acceptance, integration and permission to start
the next packet are three separate decisions, and pasting a role prompt releases nothing.

Two rules from the K0.1 retrospective matter most in practice: a reviewer finding is a starting
counterexample, so the fix must cover the affected behaviour and its neighbours rather than the
reported example; and nothing passes merely because tests are green — every obligation needs a
distinguishing counterexample the check would actually reject.

The benchmark's PROC-1 adds rules specific to evidence: frozen experiment identities, private
evaluation material, and the fact that moving a document or editing a comment can change what a
pinned fixture means. The benchmark accepts no ArrokothI work and ArrokothI accepts none of the
benchmark's; each ledger records the other only as an observed, pinned input.

### The protocol contract — ArrokothI K0.1

**Question answered:** what exactly must a future Kernel accept, reject, preserve or refuse?

K0.1 turned the architecture into decisions an implementer can apply directly: value equality and
limits, scoped identity and retry rules, receipts, input batches, the three clock roles, waits,
cancellation, terminal obligations and progress compatibility. It also classified every piece of
current 0.8.x data and behaviour as *migratable*, *legacy-only* or *refused*.

The characteristic move is that a decision covers the whole observable change, not a label. A
cancellation race is not settled by the Execution ending as `CANCELLED`; the losing Outcome must
also have installed no progress, acknowledged no input and published no output.

**Limit:** K0.1 implemented nothing. The running code is still the synchronous
`Harness`/controller design.

### The testable contract — ArrokothI K0.2

**Question answered:** can observable examples expose plausible violations of those decisions?

K0.2 supplies the public conformance fixture at `tests/conformance/k0`: ordered command
schedules, expected observations, an adapter boundary a future candidate plugs into, an independent
operation sink that records what was really dispatched, and deliberately wrong transcripts the
checks must reject. Schedules cover delayed Runtime work, duplicate and conflicting Outcomes,
input arriving before, during and after a wait, stale timers, cancellation races and refusal of
missing progress. The failing controls are the point: one keeps the correct cancellation headline
while committing the losing progress underneath it; another reports a refusal while the sink
recorded a call.

Accepting K0.2, with E0 satisfied, closed **K0**.

**Limit:** the fixture's own tests prove the checking machinery, not a Kernel. The current
repository candidate refuses every target scenario, which is the correct answer today. Some
obligations need observation surfaces that only K1–K5 will provide and are assigned there.

### Public evidence and attribution — benchmark E0

**Question answered:** what would a public experiment observe, and who deserves credit or blame?

E0 specifies two fresh public application shapes — a reviewed artifact publication with explicit
review authority and attempted actions, and a restartable request across two independent jobs plus
human input — together with how an ArrokothI-based implementation and competent ordinary code
would each be built, where authoritative facts live, which observations are independent, and how
planned unsafe and state-losing controls would expose attribution mistakes. Fixture, observation
policy and reference-corpus identities are versioned so any change to the inputs is detectable.

The rule to carry forward: **laboratory protection earns the subject no credit.** If the lab
blocked the harm or restored the checkpoint, that proves nothing about whether the system under
test would have.

**Limit:** E0 implements neither arm and measures nothing. Comparison belongs to E5.

### The target boundary and legacy quarantine — ArrokothI K1.0

**Question answered:** where does new Kernel code live, and how do we stop it from quietly
inheriting the old implementation?

This is the first K1 packet and the most recent acceptance. It is structural: it decides where
future work lands and what it may depend on, and it changes nothing about what the code does.

What now exists on `main`:

- **A private target package, `@arrokothi/kernel`** at `packages/kernel/src`. It is `private`
  in its manifest so an unimplemented Kernel cannot be published by accident. It exports exactly
  two things — `UnsupportedKernelSurfaceError` and `refuseUnsupportedSurface` — and the refusal
  throws, naming the surface and the packet that owns it. There is deliberately no no-op API that
  answers a caller with silence.
- **Four ownership zones** by path: `target-kernel`, `legacy-core` (`packages/core`, the 0.8.x
  Harness/controller implementation, explicitly legacy and fully supported), `runtime-integrations`
  (Strands, Gemini, local retrieval, MCP adapters) and `host-sdk`.
- **An allowed-import rule for the target zone:** modules inside `packages/kernel/src`, `node:`
  builtins, nothing else. No portable leaf from legacy is approved yet; approving one is a
  reviewed decision in the packet that first needs it.
- **Import guards that mean something.** A transitive scanner walks the real import graph
  including type-only imports, barrels, re-exports, dynamic imports, `import()` types and
  reference directives, and fails closed on any target it cannot resolve statically. Twenty-three
  fixture repositories prove the guard rejects each way TypeScript can name a module and accepts
  the permitted cases, so a green result is not an empty graph.
- **A written ownership inventory that the tests check against the code** in both directions:
  [ownership-inventory.md](work/K1.0/ownership-inventory.md) declares zones, roots, exports,
  measured cross-boundary dependencies and twelve deferred extractions, and
  `kernel-landing-zone.test.ts` asserts the document and the executable policy agree. The
  inventory cannot claim a boundary the code does not enforce, and the code cannot enforce one the
  inventory does not declare.
- **Every deferred extraction has an owner.** The plausible portable leaves (`hash`, `json`,
  `result`, `value-schema`) go to K1.1/K1.2 for audit; the Harness, resumption processor, effect
  processor, store and scheduler ports and stock controllers stay behind a legacy bridge owned by
  K1.4, K2.1, K3.1 and R2.1; the Strands step adapter is R1.1's; the closed `DefinitionKind`
  controller port is *refused* and will be replaced by the Driver boundary in K1.1.
- **Legacy is pinned, not moved.** `@arrokothi/core`'s five export subpaths keep their exact
  export maps and their 227/227/44/33/21 runtime names by digest; no legacy source file moved.

Fresh check for this snapshot at `cb98547`: 2,060 tests pass with 0 failures and 0 skips;
typecheck is clean.

**How it got here, briefly.** K1.0 took many review rounds and two corrective packets. Almost
every finding had the same shape: a stage of the inventory check assumed the meaning arriving from
the previous stage had survived — a row was located but a cell was only partially read; a heading
was matched after over-broad whitespace stripping; two lists were compared as one joined string
rather than as members. Each was a way for a false inventory to pass the guard whose job is to
reject false inventories. The durable outcome is [015 — structural evidence rules](015-structural-evidence-rules.md),
which now owns how that document is read and compared. The correction records themselves are
preserved under `work/K1.0-correction-01` and `work/K1.0-correction-02` and are not needed to
understand the current state.

**Status.** The cumulative packet is independently accepted at
`def91fb9f34ade40a65cbde999c0ffe192d18239` and was merged into `main` (PR #21, merge
`9baff3a03662720af6eefe1ecfabc41fde99298f`). The ledger's integration receipt for that merge is
the remaining administrative step.

**Limit — read this one carefully.** K1.0 implements no protocol handler, freezes no target
semantics, and claims no E1 result. A passing guard is evidence about dependency direction in
source only. It says nothing about durability, isolation, Driver fidelity or protocol correctness.
K1.4 rechecks all of these obligations against actual behaviour.

## The next few steps

### Benchmark E1 — built, blocked, unmerged

E1 is the benchmark's Kernel acceptance evidence: pin the ArrokothI K0 fixture at an exact
revision, drive the deterministic schedules, capture raw traces and produce an invariant report
offline with no model or judge.

The preparation is done and lives only on `codex/e1-kernel-acceptance-capture`. It pins
`ArrokothI/arrokothi@0535160e677231da41b06d9f822e62e2f0364dd1` `tests/conformance/k0` by per-file
digest, defines protocol `e1-kernel-acceptance-capture-v1` with identities `e1-capture-set-v1` and
`e1-capture-policy-v1`, and its capture path is repeatable byte-for-byte. Round 1 came back
CHANGES REQUIRED on two governance and coverage findings; round 2 corrected them and is the
current candidate.

**Why it is blocked.** The E1 gate is "zero invariant violations within the declared scope". At
the pinned revision the target protocol does not exist, so all fifteen schedules are `REFUSED`
and the gate reads `NO_RESULT`. That is the honest answer, and it is not a pass: the ten satisfied
checks are preparation checks. The ledger therefore records `BLOCKED_EXTERNAL` on two things
outside the benchmark's control — an ArrokothI candidate that actually implements the pinned
fixture's port, and a separate owner release to run against it. Nothing in the branch relabels
the gate as optional.

**Your options.** Leave E1 blocked on its branch until K1 produces a real candidate (the default
and what both ledgers assume), or adopt an explicit scope amendment that accepts the preparation
on its own while preserving the full gate for later. Only the second needs a decision from you now.
Because the pinned bytes are `tests/conformance/k0`, ArrokothI treats that directory as frozen;
even its stale comment waits for K1.4, which will own both the fixture and the pin.

### ArrokothI K1.1 → K1.4 — the actual protocol, one packet at a time

Each needs its predecessor accepted and integrated plus a separate owner release. Order and
scope are fixed in the [ledger](007-work-packets.md); the summary here is what each one buys you.

| Packet | What it implements | What you will be able to observe |
|---|---|---|
| **K1.1** | Atomic create with initial input, scoped identity, opaque pinned progress, reservation and asynchronous Driver dispatch, with minimum inspection. Audits the first portable leaves (hash, json, result) and replaces the refused controller port. | A delayed fake Runtime A does not stop Execution B from being dispatched on the same coordinator; retries preserve identity and batch; reservation acknowledges no input; no Agent/Workflow discriminator exists in the new boundary. |
| **K1.2** | Whole-envelope Outcome validation, receipts with replay and conflict handling, epoch and revision checks, whole-batch acknowledgment, accepted output, continue/complete/fail. Audits the value schema leaf. | Stale, conflicting or malformed proposals change no accepted state; an exact duplicate returns the original receipt; one progress writer; typed terminal and output semantics. Effects and waits are still explicitly refused. |
| **K1.3** | Finite any-of waits, input subscriptions, eligible-unmatched accounting, wait generations and deadlines, out-of-band cancellation and terminal disposition. | Arrivals before, during and after a wait, stale timers, unmatched backlog and cancel/complete races lose no accepted input or wake and never reopen a terminal Execution. |
| **K1.4** | Integrate the new boundary with SDK host driving; bridge viable existing controllers as private Runtime machinery; port useful conformance; document unsupported legacy features. **This is the K1/E1 gate.** | The full K1/E1 matrix passes on actual behaviour through the supported entry, K1.0's structural obligations are rechecked live, legacy resumptions drive no new Kernel types or stores, and existing supported behaviour is preserved or explicitly migrated or refused. |

E1 unblocks at K1.4: that is the first point where a benchmark capture against a real candidate
can produce a result other than `REFUSED`. E2 depends on E1 accepted, so the whole benchmark
evidence track waits on the K1 gate.

### What none of this establishes yet

Process-crash durability (K3), governed actions and consent (K2), composition and operability
(K4/K5), native Driver fidelity (R1), physical isolation (D1) and any comparative application
value (E5) are later work. Do not read a K1 result as evidence for any of them.

## What you need to inspect personally

For each future packet the cleanup handoff should give you: the concrete change, what its
evidence proves, remaining limits, the independent verdict, integration status, and the next
release or hold. Ask for the underlying review only when a finding, tradeoff or unsupported claim
affects your decision.

For K1.1 onwards the mental-model pages to have fresh in mind are
[Execution protocol](../../mental-model/mechanisms/execution-cycle.md),
[Waits](../../mental-model/mechanisms/waits.md),
[Lifecycle](../../mental-model/mechanisms/lifecycle.md) and
[Evidence](../../mental-model/mechanisms/evidence.md), in particular its
[structural evidence](../../mental-model/mechanisms/evidence.md#structural-evidence) section.

The role prompts are in [ArrokothI's role launchers](009-universal-prompts.md) and the
[benchmark's role launchers](https://github.com/ArrokothI/benchmark/blob/main/docs/development/009-role-launchers.md):
A for coding, B in a separate reviewer session with the exact candidate, C for delegated final
cleanup before your manual merge.

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
