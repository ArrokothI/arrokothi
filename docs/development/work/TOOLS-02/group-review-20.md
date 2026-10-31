# Group review 20 — control observation schedules and reviewer-04 routes

2026-10-30, implementing Codex GPT-6 session. Historical source pin
66bc041175e6fc191c2e7cf88de198111e7d97c9; current source reading at 618f06d4.
Origins 1,158–1,170 read; origin 1,171 partly resolved before the cap stop.
Six retirement readings and eight extraction-origin plans, including that partial
origin, give **1,027 retired / 144 plans**. Plans are not completed P1 extractions.

**At least 13 distinct new-test groups / 135 mutation adoptions** (148 combined;
separate caps apply). Five test groups and three adoptions added. The test-group
cap of 12 is exceeded. [Projection 10](projection-10.md) records the stop and both
projections. All measured adoption runtime remains **250.717 seconds**, unchanged.
No new test, mutant or registry case was executed; 67 cases are built and 68 remain
planned, with the previously retained shared variants still required.

## Five distinct request-observation schedules

Read all of review-04/p3-control-reentry.ts and its five sealed rows in
review-04/probes-p1-p3.txt. Each uses an authorized caller, recording Driver and
one open exchange. The request's own activationId getter makes the inner decision,
then returns the original Activation coordinate. The outer control must observe
that getter exactly once and decide against the state the inner decision left.

| New test group suffix | Outer control | Getter's inner decision | Outer refusal | Final state / current epoch / total deliveries |
|---|---|---|---|---|
| takeover-resolve | requestTakeover | valid continue Outcome | no_unresolved_exchange | READY / none / 1 |
| takeover-takeover | requestTakeover | nested takeover | stale_exchange | RUNNING / 2 / 2 |
| protocol-takeover | reportProtocolFailure | nested takeover | stale_exchange | RUNNING / 2 / 2 |
| recover-resolve | recoverExecution with missing codec | valid continue Outcome | no_unresolved_exchange | READY / none / 1 |
| protocol-complete | reportProtocolFailure | valid complete Outcome | terminal_destination | COMPLETED / none / 1 |

Group IDs start k12c1-control-observation-. Each needs a maintained test comparing
an independently captured post-inner snapshot with the post-outer view: exactly
one outer refusal, no additional accepted receipt, hold, history or delivery, and
the inner decision preserved. Nonterminal executions must remain answerable.
The historical probe's deliveriesAdded field actually prints total deliveries;
retain the source unchanged and make the maintained assertion explicit.

These are five P1-G groups: the outer operations, inner schedules and required
classifications differ. Sharing a getter fixture or one future test file does not
make the input/operation/result tuples identical. This is an evidence gap found by
source review, not a newly observed product failure. The current control code
captures the request before #openExchange and epoch checks. BINDING-01 design 01's
L-09 row explicitly retains own-getter envelope behavior; the byte binding did not
retire this schedule. Build on unchanged product code only after owner disposition,
reconfirm at build C, and stop if a new test exposes a product defect.

The bounded coverage search included all maintained Kernel and conformance test
references to reentry and activationId getters, then the bodies and helper callers
of takeover-reentrancy, refusal-diagnostics, outcome-hostile, transaction,
recovery-ambient, whole-view-ambient, review-11-probes, host-members, poison-catalog,
fault-scenarios and the control code. Both registry mutation inventories were read.

- Safety-callback tests reenter after initial control checks. They do not exercise
  a mutating request getter before those checks.
- Outcome-getter tests use a different outer operation.
- recovery-ambient's duringObservation hook installs resultingEpoch. Its nested
  retry lives in that inherited accessor, which correct code must never invoke.
  The other hook usage only installs counting accessors. Whole-view/review-11
  probes have the same zero-invocation requirement.
- poison-catalog's request getter calls inspect; it does not resolve, replace or
  complete the exchange.
- Sequential refusal tests start the outer call after the inner decision, so they
  do not establish ordering within request observation.

## Three existing-leaf adoptions

Read the entire reviewer-ablations.mjs, oracle-vs-mutants.mjs, P4 probe, both sealed
reviewer result files, P4 control and all mutant comparisons. The runner has 19
members, X1–X3 and X8–X23; X4–X7 are not members. Historical full-suite failures and
passes do not provide current qualified kills.

| New adoption | Current edit and existing passing leaf |
|---|---|
| k12c1-review4-x1 | Add a 2^20 code-unit cap to the shared Activation predicate. The DIAG-01 wrong-50-million-units leaf requires usable primitive identity classification, bounded diagnostics and refusal-only state. I1/I2's surrogate input does not distinguish this cap. |
| k12c1-review4-x2 | Reject the empty string at that shared predicate. The authorized terminal/takeover empty-text leaf requires terminal_destination, not malformed_value. This is a different input/result from I1/I2 and X1. |
| k12c1-review4-x3 | Skip accepted-Outcome lookup for IDs longer than 65,536. The long-key producer/consumer leaf asserts exact replay without a grant and the original receipt. The old mapGet moved to ExecutionReader.acceptedOutcome; the unique current caller uses null for absence. I3 mutates validation, a different decision. |

The selected leaves exist and passed in the previously recorded catalog. No
current registry contains these production edits. All current anchors are unique;
these three are planned for the existing registries only. All X8–X23 coordinate
anchors were also rechecked unique, using group review 09's individual relocations.
Their existing cases are retained, not counted again. Final-C controls/kills and
P1-M bindings remain outstanding.

## Other readings and exact resume

The large-identity diagnostic observation shares the maintained DIAG-01 schedule.
P2's long-key/exchange-10 lifecycle is maintained. The P5 invalid-position collector
moved to the SDK: weighted undefined-position diagnostics, eight-root observation
and per-position work have maintained witnesses. Timing/heap observations are
historical under L-03. The engine-allocation paragraphs describe the current
qualification and source ordering; they do not require an above-limit allocation
or a particular exception. Current input-key/derived-ID construction precedes
state-owner apply. Provenance and the handoff fence supply no new executable credit.

**Origin 1,171 remains partial:** review-04/README.md:11,
mention-b521726deecc3636dce692c5. Its linked P1 source and sealed absent/false-Driver
rows have been read, but whether the combined protocol-hold/permitted-actions and
unsafe-replacement schedule has maintained coverage or a superseding reading is
unresolved. Do not retire it by combining unrelated safe-Driver and no-hold tests.
Resume that reading after owner disposition, then README.md:13 (origin 1,172,
mention-53d6a79b7dd3b84c37cd5da4) and source order. The later P1/P2/P3 artifact origins
remain pending even though their files have already been read; reuse the readings
without losing those origins.

Only human origin state/triage fields changed in adoption.json. Every other origin
field and derived table was compared unchanged. No product or historical evidence
edit, regeneration, new execution, P3 completion, self-audit, mappings_complete,
final C/H or CI dispatch. No third-party material was incorporated. IN_PROGRESS,
stopped for owner disposition; not review-ready and not accepted.
