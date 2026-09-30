# Revision 4 semantic correction closure

Implementation self-review, Codex / GPT-6, 2026-09-27. This is not independent acceptance.
Authority: [contract revision 4](contract.md), [owner amendment](../K1.2/invalidation-02.md),
[review-04](review-04.md), values.md V-D1, and the inherited C1–C15/DEC-1–20/decision-02.
[Coverage-04](coverage-04.md) was written before source changes. Final clean-C observations belong
in implementation-03 and validation-03; the checks below describe the source/test argument.

## VALUE-COST-01

The defect was a retained allocation per refused position; the existing canonical-byte charge and
DEC-5 output renderer did not bound that allocation. Every pushIssue site now reaches one collector:
eight bounded details, then at most eleven exact code counters. A suffix entry owns its count and
is updated without prototype lookup. Consumers use own descriptors for optional multiplicity, so
ambient inherited occurrences cannot fabricate evidence. No raw caller message/path survives in a
suffix entry. This affects direct value diagnostics and creation/ingress as well as K1.2 roots.

The traversal, descriptor/ordinary-read pairing, early length checks, string scan, canonical byte
charges, depth/entry checks, serializer sandbox and accepted snapshots are unchanged. In particular,
compression neither stops after eight positions nor suppresses a later code or sibling root. The
existing byte stop still ends reading and counts only observed reasons. This is not a cap on errors,
accepted data or a message's aggregate roots. P5's 532,480 issues become nine records with an exact
532,472 suffix count. At most 19 small records remain per root, independent of that cardinality.
Snapshot work for the traversed accepted prefix stays within the pre-existing canonical budget;
refused leaves avoid retained snapshot entries and the JCS clone/serialization path. Path building
checks fixed lengths before concatenation, preventing long ancestors/phantom keys from creating a
new diagnostic amplification. No elapsed-time test is offered as a proof for arbitrary JavaScript
traps: caller execution and the engine's own-key enumeration retain their existing scope limits.

The producer/consumer table in coverage-04 includes structural failures before member traversal,
scalar failures, missing/accessor/incoherent descriptors, cycles/depth, array shape, object ghosts,
key scans, byte-stop and serializer failures. New tests drive 21 repeated issue families plus holes,
accessors, cycles, depth, oversized listings/names, P5 and all consuming roots. The original
values.test.ts is unchanged, including KC2-R1 read counts, every-byte-kind 1 MiB edges, shared graphs
and ambient descriptor/iterator/prototype restoration cases. V1 deliberately restores unbounded
issue retention; V2 stops reading at eight; V3 loses weights; V4 reads inherited weights; V5 retains
raw messages. Each must lose to a clean control in the revision-4 runner.

The previous pass's raw-storage assertion was an implementation choice, not decision-02's rule.
One aggregate-refusal test now requires bounded records, all 32 occurrences and the same
pre-authority nondisclosure/forbidden-mutation checks. G9 now removes multiplicity in root transfer,
rather than requiring eager projection to be absent. G2/G3/G10 anchors follow the weighted renderer;
D31/D32/R9/R10/G8 retain direct raw-renderer edge assertions as well as end-to-end capture cases.
No semantic regression, test file, original ablation, threshold or sealed record was deleted.

## EVID-01

The coordinate production code remains unchanged in this round. The new exact-coordinate oracle
ports P4's schedule and uses an independently spelled length-prefix derivation. It covers complete
and fail with both a non-ASCII and a lone-surrogate trusted namespace, a non-ASCII scope and long
keys. Diagnostic omission is asserted as a precondition. It checks code/protocol answers and holds,
redelivery/takeover grants, both hold-clearing mechanisms, history actors, acknowledgments, outside
batch terminal disposition, returned decisions, Emission and result IDs/records, resolved exchanges,
dispatch/Outcome receipts, exact terminal replay and late-report single-row mutation. Equal-position
Outcome receipts across two Executions differ, as do one Emission key's IDs across two exchanges.
This avoids the earlier common-mode comparison between two equally corrupted projections.

All sixteen sealed X8–X23 replacement spans are loaded verbatim after SHA-256 verification and run
in disposable copies against the maintained tests. The control must pass with real assertion
failures for mutants; no skipped anchor is a rejection. Exact production/return/lookup paths in
coordinator, identity, driver and inspection were traced alongside diagnosticIdentity's inventory.
The old comparison/rendering controls remain in the 67-case runner.

## Additional implementer-found dependency

**SELF-R3-PATH-01:** value diagnostics can acquire caller-sized names before key validation
(phantom object descriptors and array out-of-range names), and nested paths can multiply ancestor
text. Merely counting issue objects leaves the first retained details unbounded. The correction
bounds construction itself and preserves omission below an overlong ancestor; first-detail messages
are bounded at retention. Tests cover ghost names of one million units, accepted-length long
ancestors, the 128/129 edge, a literal `<omitted>` key (not a sentinel), and million-unit constructor
names. This is this implementer's dependency finding, not attributed to the reviewer.

Review-04 P3 O-R4-1's permitted-action qualification and the known engine-allocation input-ingress
case are clarified in BASELINE; no behavior changes or broader identity closure claim follow.
Other prior P3 editorial observations remain optional and do not release a successor.

## Cumulative source audit

| Criterion | Source trace and distinguishing evidence |
|---|---|
| C1 | submitOutcome resolves destination before capture; controls require visibility then control. Nondisclosure/getter suites and sealed B controls forbid hidden reads and writes. |
| C2 | usable exact Activation key → acceptedOutcomes lookup; exact captured identity reuses decision/receipt before terminal/currency/grant. New long-ID terminal replay/conflict checks + original replay controls. |
| C3 | decision-02 per-coordinate order unchanged; weighted diagnostics are used only in content. P5/eight-root no-grant and granted schedules assert one refusal and no other state/delivery change; existing capacity/four-limit matrices and partial-claim tests remain. |
| C4 | #accept prebuilds receipt, outputs, dispositions, exchange, history and replay wrapper before advancing acceptance index; applies only prebuilt records. Original transaction/hostile/atomic controls remain. |
| C5/C6 | continue resolves to READY, next dispatch mints a fresh exchange; complete/fail produce typed result and B-5 for unreserved input. New exact tests cover both terminal forms; terminal ingress/replay tests unchanged. |
| C7 | Effects inspected only for length, await payload unread, unknown obligation fields refuse whole; sealed ablations challenge these branches. No K1.3/K2 code added. |
| C8 | takeover checks safety then revalidates after callback, advances only epoch/grant within same exchange; stale old grants remain fenced. New exact tests + reentrant takeover/submission-lifetime suites. |
| C9/C10 | code/protocol holds remain RUNNING, pin exact exchange, clear only by named declaration/takeover/accepted Outcome as applicable. All three availability roots keep exact weights; DEC-6 payload slicing unchanged. |
| C11 | delivery capability closes over its original row; report never consults current exchange. New long-ID late-report whole-view equality + original late-report/attribution suites. |
| C12 | refusal retains exact Execution; receipt token includes exact owning Execution; output/history/dispositions frozen; view lists copy own data. New cross-Execution receipt and cross-exchange Emission uniqueness plus existing immutability suites. |
| C13 | no source observation moved or repeated; new diagnostic lists use own-array and optional counts use own descriptors. Source guard, old hostile suites, new read-count/pollution and V2/V4 controls. |
| C14 | no source module, public index export, package/dependency/lockfile change; private Kernel remains isolated from legacy core. Existing structural inventory/conformance check remains. |
| C15 | values is the sole refusal-cost owner; its representation marker, rewrite index and BASELINE agree. Roadmap adds values to amendment's maintenance scope. Identity/cycle/recovery/output/state/evidence dependencies retain semantics and all prior marker choices. |

Layers 1/2 and public SDK/guides require no change: this is a private Kernel binding correction.
No new third-party source/dependency/service is used; existing canonicalize@3.0.0 is unchanged.
Historical reconstruction/implementation-02 describe revision 3, superseded here for diagnostic
storage only. Previous closed findings remain linked through review-04; no historical acceptance
is rewritten. Clean-C suite/ablation results must be reconciled in the report before review-ready.
