# Owner progress summary

Snapshot: checked remote main `8292d6f3e56223c425bd5d048299735ccc248ac4`, which adds the audit's closure
note (PR #42) and the [prior-art research](research/README.md) (PR #43) to the merge of PR #40 (`c65894e7b907fd8ce6a4f8b4dd13b8646c84d955`) and its receipt (PR #41). PR #40
integrates DESIGN-AUDIT-01's accepted candidate `ce0b5a7098a9f65cf16dc55ce6eb013946564508`, its
acceptance transcription `dc03b365cbc65bdcb68333bc7ad74726cb62835d` and the owner hold record
`3d36a05de4f4b8cdb219449c31cd17b296768402`. Earlier on main are K1.2-correction-01
(`ed509e11dc39ff24e10c1ace68189776c4270919`) and the process reset (PR #39). Current authority is the [status ledger](007-work-packets.md);
exact acceptance and integration identities stay there and in its linked records.

| Area | Current position |
|---|---|
| K0 | Closed |
| K1.0 / earlier K1.1 work | Accepted, integrated and owner-closed; some value-capture claims are held (below) |
| Repository cleanup and planning | DOCS-CLEANUP-01 and PLAN-01 accepted, integrated and owner-closed; archive cloud upload remains an owner action |
| Value-capture refusal bound | K1.1-correction-02 accepted, integrated and owner-closed; its V-D1 cost claim is held for K1.1-correction-03 |
| K1.2 Outcome acceptance | K1.2 and its cumulative correction K1.2-correction-01 accepted, integrated and owner-closed; the earlier H14 integration hold is lifted |
| Held value-capture claims | V-D1 refusal cost ([invalidation-02](work/K1.2/invalidation-02.md)); re-prototyped built-in classification ([invalidation-01](work/DESIGN-AUDIT-01/invalidation-01.md)); environment-independent canonical bytes, V-ENV ([invalidation-03](work/DESIGN-AUDIT-01/invalidation-03.md)) |
| DESIGN-AUDIT-01 | Accepted, integrated and owner-closed. Owner [decision-01](work/DESIGN-AUDIT-01/decision-01.md) adopts CORE as the target direction and answers PROXY-01 (refuse every Proxy); wrapper packaging is open |
| TOOLS-01 | Released 2026-10-02 and in progress on `codex/tools-01`; its release record and ledger row are on that branch |
| K1.1-correction-03 | Planned, with scope amended by decision-01; not released |
| K1.3 | Planned; not released |
| K1 / E1 | Open; no E1 gate result |

## What has been achieved

**A private Kernel foundation.** The question was whether execution coordination could be separated
from the legacy runtime. On main, the private Kernel creates Executions, accepts input, reserves
batches, dispatches asynchronous Activations and, since K1.2, rules on their Outcomes (below).
K1.0 and the earlier K1.1 work are accepted, integrated and owner-closed. Waits, cancellation and
mediated Effects are later packets. The supported application SDK still uses
the legacy core. [002](002-implemented-kernel-baseline.md) describes the implemented surface.

**Answerable Outcome acceptance.** K1.2, completed by its cumulative correction, answered whether
the Kernel can rule on an asynchronous Runtime's answer. The Kernel accepts the answer whole or
refuses it without changing accepted state, with one authorized writer per exchange through
takeover, recovery holds and late reports. The private Kernel now:

- accepts an Outcome whole or refuses it whole. An exact replay returns the original receipt and
  conflicting content is refused. A stale proposal is refused before submission authority is
  checked, and authority is checked before content.
- gives each Runtime attempt its own `SubmissionGrant`, handed over as the third `deliver`
  argument. Redelivery keeps the grant; takeover replaces it.
- on acceptance, acknowledges the whole reserved batch, installs progress, records Emissions and the
  typed result, and moves the Execution to `READY`, `COMPLETED` or `FAILED`. At `complete` or `fail`,
  every still-queued Event gets a terminal disposition.
- advances the writer epoch through control-authorized takeover, and only when the Driver declares
  replacement safe.
- keeps the Execution `RUNNING` under a code hold (pinned code unavailable) or a protocol-failure
  hold, with a visible reason, permitted next actions and a retained recovery history.
- lets a late delivery report settle only its own delivery row.
- can answer, take over, hold and clear every Activation ID it mints.
- bounds refusal diagnostics while keeping exact identities and issue counts.

Outcome acceptance and the three recovery controls build every record before changing state.
A fault-injection sweep over 66 declared scenarios checks this. A poisoned-prototype sweep checks
that the Kernel reads no member its objects may not own.

The lesson from its review history is that evidence tooling needs the same adversarial checking as
the code it judges. Most late findings were checks that recognized chosen regressions without
establishing the general claim. The accepted evidence names every comparison its fault checker makes,
shows each one is needed, and draws its list of control exits from the source rather than from the
scenarios.

Status: independently accepted at the candidate above, integrated and owner-closed; K1.3 is not
released. Limits:
- The Kernel is in-process and not durable. How submission authority survives a restart is open
  for K3.2.
- There are no Effects (K2), waits, deadlines or cancellation (K1.3), and no output reads (K4.4).
- Kernel fencing does not stop a superseded native attempt; the Driver must exclude it or refuse
  takeover.
- The sweeps are finite evidence for their declared scenarios, not a proof over arbitrary future
  code.
- No V-D1 refusal-cost claim is made, and the supported SDK is unchanged.
- Two value-capture claims inherited from K1.1 are held.
  - A re-prototyped built-in, such as a null-prototype Map, is accepted as a plain object
    ([invalidation-01](work/DESIGN-AUDIT-01/invalidation-01.md)).
  - Code that runs during capture can declare a global `let JSON` that steers the canonical bytes. A
    conflicting creation retry is then answered as a replay
    ([invalidation-03](work/DESIGN-AUDIT-01/invalidation-03.md)).

**A root-cause audit of accepted design.** DESIGN-AUDIT-01 answered which choices accepted in
K0.1–K1.2 keep producing defect families, and what the owner's options are for each. It looked hardest at
the in-process capture threat model. What now exists, under [its directory](work/DESIGN-AUDIT-01/):

- A design-debt register. It covers 278 classified review-finding labels in 16 families and six items: the
  same-process threat model, the own-array and serializer environment, exotic classification,
  coordinator responsibilities, evidence infrastructure, and process notes. Each option has its cost,
  the accepted claims it would keep, narrow or remove, and how its follow-up would close.
- 23 decision drafts for the owner to adopt or reject, none of them adopted. The joint CORE draft
  follows the owner's recorded direction: a scoped contract, a canonical-bytes Kernel core, a caller-side
  live-object wrapper and a separate transport adapter. The proposed sequence is TOOLS-01,
  K1.1-correction-03, a binding packet, a coordinator refactor, then K1.3.
- A hostile-input corpus of 16 recorded labels and 8 serializer bindings, with executable
  expectations. It shows that Node's `--frozen-intrinsics` flag alone does not stop the serializer's
  bindings being replaced. Only bindings pinned non-writable and non-configurable before caller code
  refuse it.
- One verify command that regenerates the register, measurements and corpus checks.

The lesson from its review history concerns the corpus. Twice, a counterexample the corpus held had a
variant one access form further on that defeated the drafted closure: first replacing a whole global
binding, then declaring a global `let`. The second also defeated the integrated Kernel, which is the
invalidation-03 hold above. A corpus entry needs to vary how a binding is reached, not only which
binding.

Status: independently accepted, integrated and owner-closed. Owner
[decision-01](work/DESIGN-AUDIT-01/decision-01.md) adopts CORE as the target direction and answers PROXY-01:
refuse every Proxy at capture. Adoption ships nothing; the implementing packets change the canonical pages.
Limits:
- The audit changes no code and no claim. Its recommendations bind nothing until the owner adopts them
  through separate records and packets.
- Per-option reconciliation closes by reading. Its checkers catch omissions, not wrong prose.
- Realm hardening is evaluated, not guaranteed. A declaration made before the binding starts remains
  outside every check that reads only the global object.
- Probes ran only on Node v25 and v26; no other engine was tried.

**A smaller current documentation tree.** DOCS-CLEANUP-01 answered how to preserve closed evidence
while making current guidance easier to find. The sealed archive and relocated active fixtures now
exist. The packet is accepted, integrated and owner-closed. Cloud upload of the archive remains the
owner's action, as [archive](archive.md) describes. This establishes no Kernel capability or gate
result.

**Bounded value-capture refusal.** K1.1-correction-02 answered whether a small shared object graph or
an oversized scalar could make refusal require unbounded Kernel traversal. Capture now charges each
occurrence while reading and bounds scalar/key scanning and descriptor classification. The work is
accepted, integrated and owner-closed. Its broader V-D1 claim, that refusing costs no more than
accepting at the limits, is held: some refusals were later shown to cost more than the costliest
acceptance, and the owner moved that bound to a metered design in K1.1-correction-03. Host
enumeration and caller callbacks remain outside the Kernel traversal bound. This implements neither
tombstone retention nor a wire decoder.

**An explicit product sequence.** PLAN-01 records the owner's direction: build the Kernel/Driver
foundation first, then ArrokothI's own Agent and Workflow systems. It also records packet preparation
obligations. The plan is accepted, integrated and owner-closed; it implements no runtime feature.

## The next few steps

1. Finish TOOLS-01, then run its independent review, final cleanup and merge.
2. Decide the wrapper's packaging: a separate entry point in the Kernel package, or the SDK. Then create
   the ledger rows for the binding packet and the coordinator refactor.
3. Release K1.1-correction-03, starting with a brief. Its amended scope:
   - the metered V-D1 bound;
   - refusal of re-prototyped built-ins;
   - refusal of every Proxy at capture.

   On acceptance it releases the classification and V-D1 holds.
4. Then the binding packet (bytes core, wrapper, 8 MiB transport adapter), which carries the V-ENV hold;
   then the coordinator refactor; then K1.3. None of these is released.
5. K1.4 owns the SDK host bridge and the full K1/E1 gate. External blocker: before K1.3 closes, the
   benchmark owner must confirm that the E1 fixtures drive the new supported entry; otherwise K1.4 is
   BLOCKED_EXTERNAL. Fixture preparation is not an E1 result.
6. Upload the verified archive to owner-controlled cloud storage.

Carry forward:
- the historical Node 22.22.3 legacy Effect-test cancellation limitation;
- the reference review's five non-blocking P3 observations and its authentication limit;
- the limits stated in the K1.2-correction-01 report and review: finite sweeps, and runs on Node 25 only, with no
  Node 22 run (the poison sweep needs Node 22.15 or later);
- the audit review's three non-blocking P3 intake items for TOOLS-01 or the successor corpus, listed in
  the cleanup record.

Their scope remains in the ledger's pinned reviews. No new external benchmark result is claimed here.

## Maintaining this page

Rewrite this account in place when accepted results change. Keep a checked-revision snapshot,
current status table, concrete achievements and the next few steps. Explain the question answered,
what exists, its status and its limits; keep review rounds in packet records, decisions in 007 and
implemented capability in 002. Do not turn preparation, acceptance or cleanup into integration or
successor release.
