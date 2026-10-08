# Owner progress summary

Snapshot: checked 2026-10-08 against remote main `8f82900337e38dfdb93026b04de2066df75b175c`, the
merge of TOOLS-01 (PR #45) into base `f62527e8d564a6e2f63b83cbb52e24053f333540`. TOOLS-01's accepted H is
`a50c38867c93c63094f271d099cec71624382577`, payload C is
`83094969e591dba5c4f25d19c572522b78a7a396`, and independent review 06 is recorded at
`82b09e1f9ddbfe60e86a64f4adbdb8feab67e9c4`. Its [cleanup](work/TOOLS-01/cleanup-01.md)
is complete, and it is [integrated](work/TOOLS-01/integration-01.md). Main also contains the accepted,
owner-closed DESIGN-AUDIT-01 and K1.2-correction-01 work. The [status ledger](007-work-packets.md)
and linked records own exact acceptance, integration and release identities.

| Area | Current position |
|---|---|
| K0 | Closed |
| K1.0 / earlier K1.1 work | Accepted, integrated and owner-closed; some value-capture claims are held (below) |
| Repository cleanup and planning | DOCS-CLEANUP-01 and PLAN-01 accepted, integrated and owner-closed; the archive is kept locally only, by owner choice, and was re-verified on 2026-10-02 |
| Value-capture refusal bound | K1.1-correction-02 accepted, integrated and owner-closed; its V-D1 cost claim is held for K1.1-correction-03 |
| K1.2 Outcome acceptance | K1.2 and its cumulative correction K1.2-correction-01 accepted, integrated and owner-closed; the earlier H14 integration hold is lifted |
| Held value-capture claims | V-D1 refusal cost ([invalidation-02](work/K1.2/invalidation-02.md)); re-prototyped built-in classification ([invalidation-01](work/DESIGN-AUDIT-01/invalidation-01.md)); environment-independent canonical bytes, V-ENV ([invalidation-03](work/DESIGN-AUDIT-01/invalidation-03.md)) |
| DESIGN-AUDIT-01 | Accepted, integrated and owner-closed. Owner [decision-01](work/DESIGN-AUDIT-01/decision-01.md) adopts CORE as the target direction and answers PROXY-01 (refuse every Proxy). [Decision-02](work/DESIGN-AUDIT-01/decision-02.md) gives the wrapper to the SDK, moved in stages |
| BINDING-01, COORD-REFACTOR-01 | Planned; not released |
| TOOLS-01 | Independently accepted at H above; integrated at `8f829003` (PR #45) |
| TOOLS-02 | Planned remaining corpus extraction; not released; acceptance and integration required before K1.4 acceptance |
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

Status: K1.2 and its cumulative correction are independently accepted, integrated and owner-closed;
K1.3 is not released. Limits:
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
- 23 decision drafts, with the adopted CORE direction and SDK-wrapper ownership recorded separately
  in the owner decisions below. The joint CORE draft describes a scoped contract, a canonical-bytes
  Kernel core, a caller-side
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
- The audit itself changes no code and releases no held claim. Owner decisions select direction;
  the implementing packets must establish it.
- Per-option reconciliation closes by reading. Its checkers catch omissions, not wrong prose.
- Realm hardening is evaluated, not guaranteed. A declaration made before the binding starts remains
  outside every check that reads only the global object.
- Probes ran only on Node v25 and v26; no other engine was tried.

**Maintained packet evidence tooling.** TOOLS-01 answered how to check a packet's exact source and
historical evidence while keeping observations, credit and acceptance distinct. It now provides:

- A verifier for B/C/H identities, administrative file sets, preserved source and accessible evidence;
  a provenance inventory of 1,549 origins; and one composition for the declared checks.
- An isolated mutation runner with passing controls, reached witnesses and qualifying probe assertions,
  plus negative controls for the tooling's own refusal and comparison rules. Target-set observations
  remain separate and earn no kill.
- Revalidation of 154 earlier origin mappings: 107 close through checked routes and 47 remain
  explicitly transferred. A further 1,395 origins remain pending for TOOLS-02.
- A conservative intrinsic-contact register, attributed held witnesses and an advisory report of open
  origins in touched areas. The accepted corpus retains 49 preserved members and 15 target readings;
  it claims zero adoption kills.

The lesson is to require positive evidence before granting credit. Successive attempts to recognize
only dangerous syntax missed combinations that still reached a credited result. The accepted rule
holds every recognized intrinsic reference in the declared run set, with no safe-position exemption,
and checks the path from recognition through every credit consumer.

Status: independently accepted and [integrated](work/TOOLS-01/integration-01.md) at `8f829003`
(PR #45). Limits: this is development tooling, not a Kernel capability,
complete historical-corpus adoption, a sound analysis of arbitrary JavaScript, a hold release or an
E1 result. The advisory report blocks no packet. Live-provider, large-memory/timing and the recorded
known-base-failure profile were not run. The repository verification floor is now Node 26.10+;
this does not change the supported SDK's runtime declaration.

**A smaller current documentation tree.** DOCS-CLEANUP-01 answered how to preserve closed evidence
while making current guidance easier to find. The sealed archive and relocated active fixtures now
exist. The packet is accepted, integrated and owner-closed. By the owner's choice the archive is
kept locally only. [Archive](archive.md) records its verification and the Git fallback. This establishes no Kernel capability or gate
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

All successors remain unreleased. The dependencies below come from 007 and become eligible for an
owner release only after their prerequisites are accepted and integrated.

1. **K1.1-correction-03** depends on TOOLS-01. Its brief covers the metered V-D1 bound, refusal of
   re-prototyped built-ins by internal-slot checks, and refusal of every Proxy before own-key listing.
   Acceptance is to release the recorded refusal-cost and classification holds.
2. **BINDING-01** depends on both TOOLS-01 and correction-03. It owns the canonical-bytes core,
   8 MiB transport adapter and capture wrapper moved into the SDK as an internal module, plus the
   V-ENV hold. It must classify the 853 rule-1 V-ENV entries. The 96 V-ENV-matching category entries
   retain correction-03's ownership. Runtime evidence, such as evaluating Node's
   `--frozen-intrinsics`, is a candidate approach for its brief, not an owner-selected design or
   evidence that the hold can be lifted. The supported SDK surface changes at K1.4, as
   [decision-02](work/DESIGN-AUDIT-01/decision-02.md) specifies.
3. **TOOLS-02** also depends on TOOLS-01. It owns the remaining extraction, mention triage and
   mutation-family work, target-set assertion-provenance design, and all 47 transferred origins.
   These include [choice 11](work/TOOLS-01/owner-choice-11.md)'s three origins and the limited member
   `kernel-landing-zone.test.ts:1200:9@deedd7950724`, to bind normally or address through a reviewed
   multi-leaf admission design if needed. TOOLS-02 must be accepted and integrated before K1.4
   acceptance; 007 does not make it a prerequisite for correction-03, BINDING-01 or K1.3.
4. **COORD-REFACTOR-01**, after BINDING-01, then **K1.3** retain their planned sequence. They have no
   release from this cleanup.
5. **K1.4** owns the SDK host bridge and full K1/E1 gate. The external dependency is unchanged:
   before K1.3 closes, the benchmark owner must confirm that E1 fixtures drive the new supported
   entry. An unavailable fixture makes K1.4 BLOCKED_EXTERNAL. Fixture preparation is not an E1
   result; no E1 gate result is recorded in the current ledger.

Carry forward:
- the historical Node 22.22.3 legacy Effect-test cancellation limitation, distinct from TOOLS-01's
  accepted Node 26.10 verification and host-handle test fix;
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
