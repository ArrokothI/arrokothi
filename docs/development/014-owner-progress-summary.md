# Owner progress summary

Snapshot: checked remote main `ed509e11dc39ff24e10c1ace68189776c4270919`, which integrates
K1.2-correction-01's accepted candidate `b7191dbf630defeff7756122a6798e15d0b73dd3` and its
review/status transcription `b0ff7052aa8993d7547fbde48123dd058d2e0107`. Current authority is the
[status ledger](007-work-packets.md); exact acceptance and integration identities stay there and
in its linked records.

| Area | Current position |
|---|---|
| K0 | Closed |
| K1.0 / earlier K1.1 work | Accepted, integrated and owner-closed |
| Repository cleanup and planning | DOCS-CLEANUP-01 and PLAN-01 accepted, integrated and owner-closed; archive cloud upload remains an owner action |
| Value-capture refusal bound | K1.1-correction-02 accepted, integrated and owner-closed; its V-D1 cost claim is held for K1.1-correction-03 |
| K1.2 Outcome acceptance | K1.2 and its cumulative correction K1.2-correction-01 accepted, integrated and owner-closed; the earlier H14 integration hold is lifted |
| DESIGN-AUDIT-01, K1.1-correction-03 | Planned; not released |
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
the Kernel can rule on an asynchronous Runtime's answer: accept it whole or refuse it without
changing accepted state, with one authorized writer per exchange through takeover, recovery holds and
late reports. The private Kernel now:

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

1. Decide whether to release DESIGN-AUDIT-01, which settles the in-process capture threat model.
   K1.1-correction-03, the metered V-D1 bound, waits on it. Its ledger seed names K1.2-correction-01
   revision 6 as a prerequisite, but revision 10, which changes production code, is what was
   accepted. Confirm that dependency when releasing it. The V-D1 claim stays held until then.
2. K1.3 (waits, deadlines, cancellation) needs a separate owner release. K1.4 then owns the SDK host
   bridge and the full K1/E1 gate. External blocker: before K1.3 closes, the benchmark owner must
   confirm that the E1 fixtures drive the new supported entry; otherwise K1.4 is BLOCKED_EXTERNAL.
   Fixture preparation is not an E1 result.
3. Upload the verified archive to owner-controlled cloud storage.

Carry forward:
- the historical Node 22.22.3 legacy Effect-test cancellation limitation;
- the reference review's five non-blocking P3 observations and its authentication limit;
- the limits stated in the K1.2-correction-01 report and review: finite sweeps, and runs on Node 25 only, with no
  Node 22 run (the poison sweep needs Node 22.15 or later).

Their scope remains in the ledger's pinned reviews. No new external benchmark result is claimed here.

## Maintaining this page

Rewrite this account in place when accepted results change. Keep a checked-revision snapshot,
current status table, concrete achievements and the next few steps. Explain the question answered,
what exists, its status and its limits; keep review rounds in packet records, decisions in 007 and
implemented capability in 002. Do not turn preparation, acceptance or cleanup into integration or
successor release.
