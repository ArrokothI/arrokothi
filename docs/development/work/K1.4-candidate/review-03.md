# K1.4-candidate — independent cumulative review 03

**Verdict: CHANGES REQUIRED**, bound to H
`ddc53bd132fde4f71bc989ccec7f4d0e430a45dc`. One blocking P2 finding concerns the required adapter-test
oracle, not a demonstrated defect in the Kernel or the candidate's ledger. The collision mechanism
reported in reviews 01/02 is closed by this candidate. A third CHANGES REQUIRED triggers 006's
stop-and-redesign rule; the root-cause note and correction brief below apply.

## Identity, authority and access

- Reviewer: this independent Codex GPT-6 session, 2026-11-16. No prior work on this packet; no delegated
  review agents. The exact serving model variant is not exposed. Implementer and prior reviewers are
  distinct sessions. The planner's private notes directory was not accessed.
- Fresh remote clone of ArrokothI/arrokothi, checked out directly at H; review branch
  `codex/k1.4-candidate-review-03` starts at H. No merges. The owner's original checkout was untouched.
- B: `c1951226338de6ccd3e4e6289259549551268f61`.
- C: `41bd3aaa5cf83c51e93d41da567558d34f943410`.
- H: `ddc53bd132fde4f71bc989ccec7f4d0e430a45dc` on `claude/k1.4-candidate`.
- Policy: 006, 008, 009 and 012 at B, verified byte-identical at H; AGENTS.md and the architecture and
  slice-audit skills. Canonical owners consulted: mental-model README/reference, Kernel, identity,
  creation, waits and evidence; development front door and implemented baseline. The research reading
  map's canonical-value, timer/cancellation and evidence sections were background, not new authority.
- Contract: [brief 01](brief-01.md) KC-1..6 and [owner choices 01](owner-choice-01.md),
  [02](owner-choice-02.md), [03](owner-choice-03.md), [04](owner-choice-04.md); [design 01](design-01.md)
  with [addendum 01](design-01-addendum-01.md), [design 02](design-02.md), [design 03](design-03.md) with
  [addendum 01](design-03-addendum-01.md), all as held by H.
- External records read by commit, not merged: [review 01 at 7b8a63fa](https://github.com/ArrokothI/arrokothi/blob/7b8a63fa5f087f870663bc143257e5181d0d385c/docs/development/work/K1.4-candidate/review-01.md);
  [review 02](https://github.com/ArrokothI/arrokothi/blob/2a95a49a6e7ff46242a137f9d9ca6835e70ed946/docs/development/work/K1.4-candidate/review-02.md)
  and [brief 03](https://github.com/ArrokothI/arrokothi/blob/2a95a49a6e7ff46242a137f9d9ca6835e70ed946/docs/development/work/K1.4-candidate/review-02/brief-03.md)
  at `2a95a49a6e7ff46242a137f9d9ca6835e70ed946`;
  [design check 03](https://github.com/ArrokothI/arrokothi/blob/62092a70fec6e82ef4dcec17ce27195debf6b5ca/docs/development/work/K1.4-candidate/design-check-03.md)
  at `62092a70fec6e82ef4dcec17ce27195debf6b5ca`.

Ownership stays with test-side adaptation, its evidence and current claims. No Kernel, Runtime/Driver
or deployment semantic change is requested. No E1 capture, integration, milestone acceptance or
successor release is granted. The pushed review commit is supplied in the external handoff; it is
not a new candidate H.

## Scope and independently checked evidence

[Reproduction instructions and evidence index](review-03/README.md) accompany all new counterexamples.
The full pinned source and cumulative B..H changes were available locally. Scope checks establish:

- B is an ancestor of C, C is an ancestor of H. The complete packages/, scripts/ and tests/tooling/
  Git trees equal B. Package manifests/lock and Packet verify workflow also equal B.
- C..H is exactly 007, implementation-03.md and progress.md. I read those as status/reporting changes;
  they introduce no candidate behavior. The packet candidate command independently returns
  `facts_verified` ([result](review-03/candidate.json)).
- The only B..H K0 fixture changes are candidate.ts, fixture.ts, protocol-vocabulary.ts and
  refusal.test.ts: comments, the authorized refusal-control reason and its descriptive test text.
  The runner's executable logic, scenario matrix, sink and oracle controls remain unchanged.
- The ABL table/probe, fake Driver, encoder, verdict table and corrected evidence.md gate sentence
  are byte-identical to review 02's H. The latest-grant witness remains in ablations.test.ts; its
  assertions and discriminator remain. Its registry selection now excludes the separate identity family.

See [scope.json](review-03/scope.json) and the regenerating [scope check](review-03/scope-check.py).

### Packet verify at exact C: inspected, not repeated locally

I independently fetched [run 43798331633](https://github.com/ArrokothI/arrokothi/actions/runs/43798331633),
job 133072232338, and downloaded artifact 14201012405. The actual job log says
`REVISION: 41bd3aaa5cf83c51e93d41da567558d34f943410` and shows checkout of that commit
([log excerpt](review-03/ci-revision.log)). This is the tested revision, independently of the workflow
dispatch's metadata head. The artifact's run.txt has revision = head = C, exit 0, Node v26.10.0,
npm 11.19.1, Python 3.13.18, Linux x86_64, 2026-11-16 03:28:11–05:47:20 UTC.

I parsed the artifact's actual summary.json and counted `checks[].passed === true`: **19 of 19**.
Repository tests: 5,296 passed, zero failed/cancelled/skipped/todo. Tool tests: 777; archive: 4;
examples: 18. Raw verify.json confirms 315 registered cases / 351 kills, 358 refusal cases / 358
kills, and 18 value-cost cases / 238 kills. Typecheck, inventory/adoption/dimensions, censuses,
sweeps, race/continuation searches, builder docs and area gate all passed their checks.

The original [artifact ZIP](review-03/ci-artifact.zip) is retained because this run costs over two hours:
3,076,456 bytes, SHA-256 `9c8ac55b5c8cfe6be195b40b5b47824efb5b7b20ef6a51bba79f058a62ab0292`.
The [inspection record](review-03/ci-inspection.json), [summary](review-03/ci-summary.json) and
[run identity](review-03/ci-run.txt) are separate. This uses 006's explicit permission to cite the
exact-C CI run; it does not claim I reran the complete Packet verify command locally.

### Local reruns

Fresh npm workspace installation from the unchanged lock, Node v26.10.0 on macOS:

| Check | Independently observed result |
|---|---|
| Candidate, K0 and architecture test globs together | 1,442 tests, 122 suites; all pass, zero failures/cancelled/skipped/todo; 6,487.6 ms |
| npm run typecheck | Exit 0 |
| Existing packet runner over the twelve candidate registry cases at C | Twelve controls pass, twelve mutants killed, every claim has semantic_credit none |
| Probe setup controls | Missing workspace link without the explicit flag and a link to another checkout are invalid setup, not kills; existing wrong link is preserved |
| Review 02 original probes | Exit 1 at their first old-bug assertion, as expected after repair |
| Same review 02 schedules with corrected assertions and added displayed-reference controls | Eight result records pass |
| Independent extra identity search | 33 runs, 1,341 commands, 11,110 checked native/string pairs; pass |
| New oracle counterexamples | Four erroneous traces accepted by H's Oracle, each with a passing honest control |

The [registry result](review-03/registry.json) includes each actual named witness and invalid-run control.
No live-provider/eval or E1 run was performed; these are deterministic Kernel/laboratory checks.

## Mechanisms, interactions and bounded search

### Rendering and associations

The ledger now controls final strings, including fallbacks and every suffix, rather than reserving
only offered laboratory names. Existing native IDs retain their string; a new ID can acquire only
an unused string. Execution names are run-scoped; generation and shared input/timeout Event names
are native-Execution-scoped. The references use the inverse of those same maps. Reviewing all
assignment and projection paths found no bypass. This structural argument closes the collision
mechanism across all permitted strings; a finite enumeration alone would not do so.

Review 02's copied-output and reverse-arrival collisions, changed previously displayed timeout IDs
under ordinary/adversarial names, generation collisions and Execution collisions now discriminate.
The maintained tests include all review 01/02 traces; the original review 02 probe deliberately
asserts the former bugs and must not be treated as an acceptance test.

My additional probe does not use H's Oracle or ledger. It maintains its own historical bijection,
checks list lengths/nullability/order, and checks actual targets. It exercises mixed input/timeout
names in both orders, two Executions with repeated local spellings, copied outputs, predicted
fallback bases and occupied suffix chains through ~32. Names include empty string, __proto__,
constructor, Unicode normalization variants, a NUL-containing string, label-looking strings and
large suffix-looking strings. Generation and Execution fallbacks are later used as real references;
old references keep their old target. All four Event lists are checked through dispatch and cancellation.
This is a declared 33-run probe, not an exhaustive search of all schedules or string values.

The adapter's A1 checks correctly associate input IDs with the offered payload name (kept separately
from the rendered name), wait generations with the submitted Activation, retired generations on
replay, and a timer answer with exactly its generation's timeout. The three D03-CHK-01 fault traces,
their mirror, absent-ID/null/presence/category faults, replay, payload drift and unoffered inputs all
fail visibly while honest neighbors complete. The candidate checks the requested Execution in
viewOf; the new finding is that the independent oracle does not independently enforce that full
association. There is no evidence here of a corresponding adapter defect.

### Declared 4,126-run search and seven registry kills

The scope reduction is explicit and honored: honest assignments have **at most two non-ordinary
slots**, fault assignments at most one. Enumeration is over the declared choice positions; dynamic
or equal resulting spellings are still counted as assignments, not advertised as unique traces.
Calibration runs are setup outside the advertised searched assignments.

| Family | Runs | Checked completion |
|---|---:|---|
| E honest: nine slots, choice counts 10/6/10/7/11/11/8/11/11 | 3,282 | 45,948 Observations |
| E faults: 86 assignments × two duplicate fires × two modes | 344 | 172 newly rendered identities; 172 declared contradictions; all fault sites reached |
| X honest: six slots, choice counts 6/7/8/8/2/3 | 500 | 5,500 commands: 5,089 Observations, 411 declared unknown-reference throws |
| Total | 4,126 | Exact asserted total, no sampling |

Source counts, local rerun and C's raw CI output agree. C reports approximately 5,169 + 565 + 298 ms
for these families, within the owner's few-minute budget. References and legal X exits are deliberate;
a missing continuation is not silently counted as a successful Observation. The search is an adequate
bounded supplement to the structural rendering rule and longer targeted transition witnesses for
R03-1. It is **not complete R03-1 acceptance evidence while its required oracle check remains open**.
Increasing the slot bound would not fix the oracle defect.

All seven new cases are genuine targeted mechanism kills, independently rerun through the unchanged
registry runner; neither import/setup failure nor an unrelated failing full suite was credited:

| Mutant | Its rejecting witness |
|---|---|
| M1, emitted fallback not reserved | Three real timeouts must have three strings |
| M2, unchecked suffix fallback | Occupied base and ~2 require a distinct ~3 result |
| M3, Q2b label bypasses Event ledger | Label and input remain two strings |
| M4, input string taken from payload instead of Event ledger | Two request keys / native input IDs remain two strings |
| M5, fresh output absent from inverse map | Fire using the displayed fresh generation succeeds; unexpected UnknownLaboratoryReference is the targeted failure |
| M6, later name replaces a label | Already shown to-g1 remains to-g1 |
| M7, unchecked timeout answer | Absent or crossed timeout ID must throw AnswerContradiction |

ABL-1..5 retain their exact duplicate-response, epoch/grant, cancellation, readiness selection and
Effect-refusal witnesses. The latest-grant adapter still passes the twelve/three matrix but loses
ABL-2's expected unauthorized_submission discriminator. Registry claims retain mechanism-only
credit, the existing unread holds and rejecting-test provenance; no hold release or semantic credit.

### Census and claims

The header, README and A5 enumerate the translated output positions and command references accurately.
Inputs and timeouts share one Event scope. Activation IDs, receipts and epochs are verbatim;
Emission keys are not Emission IDs; producer/request/definition inputs are untranslated; opaque value
strings are not references. Ignored initial-input fields and timeout envelope fields remain explicitly
ignored. eventIdentity alternatives are refused by capability for both Outcome command kinds in begin
and in apply. ingressRefused is outside the mapping: a new refused input can echo an existing string;
the exact accepted-input retry after cancellation remains a replay without that refusal field.

The changed-ID claim is correctly limited to established IDs or contradictory public evidence within
one run. The first-exposure control deliberately yields equal Observations in separately named runs.
L-38 correctly records all three refusals, 51/142 lost steps and the additional eventIdentity obstacle.
L-39 records the first-exposure limit, with the minor wording issue below. Historical designs are
read with their explicit superseding addenda, not treated as current unconditional guarantees.

## Findings

### K14C-R03-01 — P2: the oracle accepts the wrong inspection and undeclared Kernel calls

**Location at H:** [identity-lab.ts lines 341–359](https://github.com/ArrokothI/arrokothi/blob/ddc53bd132fde4f71bc989ccec7f4d0e430a45dc/tests/conformance/k0-candidate/identity-lab.ts#L341)
and [499–501](https://github.com/ArrokothI/arrokothi/blob/ddc53bd132fde4f71bc989ccec7f4d0e430a45dc/tests/conformance/k0-candidate/identity-lab.ts#L499).
Governing requirement: D03-CHK-03's expected steps/calls, targets and independent associations;
design 03 addendum A1's first row and A3's claim to evaluate A1; R03-1 and R03-3.

Oracle.check chooses the first non-inspect/non-pendingTimers call as the primary, without checking
that its method is the command's operation or that the remaining calls form an allowed sequence.
It checks that primary's target, then independently takes the last inspection. Its execution
contradiction check compares the view only with the inspection argument. It never joins that
inspection to the Execution the command addressed (or a create answer named). Counting completed
Observations/pairs cannot repair this missing relationship.

[oracle-probes.mjs](review-03/oracle-probes.mjs) constructs these four broken adapter traces from
genuine H recording-lab calls/views/Observations, with an honest control for each:

1. Create x and y, dispatch y, then dispatch x but use inspect(y) and y's Observation. The primary
   targets native x while the returned executionId is y. H's Oracle reports no problem; even all
   counts equal the honest run: 4 commands, 4 Observations, 10 pairs.
2. Declare dispatch(x), but record cancelExecution(x) and its genuine inspection/Observation.
   The oracle accepts CANCELLED as an observed dispatch result without detecting the wrong method.
3. Record dispatch(x), an extra cancelExecution(x), then inspect(x). The oracle again reports no
   problem. The additional mutation is ignored when selecting the primary.
4. At a duplicate fire inject an answer-only absent timeout ID. The honest adapter throws the
   declared timeout_generation contradiction and leaves READY. Append a real cancellation and its
   inspection before the same throw: state is now CANCELLED, yet the oracle accepts it with exactly
   the honest counts (5 commands, 4 Observations, 1 contradiction, 12 pairs).

The retained [outputs](review-03/oracle-probes.jsonl) are reproducible failures of the acceptance
oracle, **not claims that H's adapter performs those actions**. The first case disproves its claim to
independently evaluate the complete A1 association table. Cases 2–4 demonstrate the same incomplete
command-to-call-to-inspection mechanism on ordinary and declared-failure paths. This is P2, not a
production P1: mandatory evidence and its current completeness claim are false. 017's nonblocking
tool-gap rule expressly applies only when neither a production defect nor a false current claim is
shown; it does not waive this named, build-right-now design-check requirement.

**Required outcome:** derive the allowed calls, their targets and the authoritative final inspection
from the command and prior independent relation, including preliminary recovery/takeover inspections,
create answers and legal early exits. Reject a mismatched final inspection, wrong method and extra
mutation before either a return or a declared throw. This needs no second Kernel state simulator.
Maintain all four counterexamples and passing honest controls; recheck the whole command family and
all five existing rejection controls, then rerun the exact search and registry. Ask the owner before
substituting a narrower claim or recorded limit.

### K14C-R03-02 — P3: L-39's opening label sentence is too broad

[017 L-39 at H, line 113](https://github.com/ArrokothI/arrokothi/blob/ddc53bd132fde4f71bc989ccec7f4d0e430a45dc/docs/development/017-known-limitations.md#L113)
still says any timeout no deliver_timer named is reported as to-<generation>, and its rationale
describes deriving the label from the mailbox. The current rule offers that label at a registration
answer, only when the generation took its offered name; an occupied label receives a fresh string.
The maintained conventions test “a label that already denotes a command-named timeout is not given
to an unnamed one” is a direct counterexample to the opening sentence's literal wording.

Align those two phrases with A2/README and the ledger's conditional offer. The same row already says
the label is offered through the ledger and accurately records the significant claim limit, so this
is a nonblocking editorial inconsistency, not an additional behavioral defect or owner decision.

## Criterion and prior-finding disposition

| Criterion | Result | Basis |
|---|---|---|
| KC-1 | PASS | Public package-root calls, deterministic recording Driver, canonical byte roots, all five real Kernel ablations; authorized projection exceptions remain explicit |
| KC-2 | PASS | Poisoned/changed/deleted expectations, read/import guards and preflight capability checks; no expectation-driven answers |
| KC-3, as amended by owner choice 02 | PASS | Exact per-scenario 12 PASS / 3 REFUSED and step counts, unchanged independent sink/runner |
| KC-4 | PASS | Existing fixture discrimination/control/blind-spot tests preserved and pass |
| KC-5 | PASS | Locator/export/version, mismatch refusal before scenario access, complete pin contract |
| KC-6 | PASS | Named baseline/fixture/gate/roadmap claims distinguish implementation, self-report and future E1; R03-specific oracle claim separately fails below |
| R02-1 / K14C-R01-01 / K14C-R02-01 | PASS; prior rendering finding CLOSED | All final strings enter one injective immutable ledger per scope; original and stronger probes discriminate |
| R02-2 / K14C-R01-02 | PASS; remains CLOSED | Five unchanged registered ablations, correct copied-Kernel setup, holds/no-credit retained |
| R02-3 / K14C-R01-03 | PASS; remains CLOSED | Owner-scoped gate sentence unchanged from review 02; no general exemption introduced |
| R02-4 preservation | PASS for its retained obligations | KC criteria and prior nondeferred D01 obligations preserved; this does not waive the new D03 failure |
| R03-1 | FAIL, required closure incomplete | Rendering mechanism passes; required independent oracle does not enforce all associations/calls, K14C-R03-01 |
| R03-2 | PASS | Review 01/02 counterexamples maintained with ordinary controls; independent rerun confirms correction |
| R03-3 | FAIL | A3's current claim to independently evaluate the whole A1 table is false; header/README census and changed-ID scope pass; L-39 also has a P3 wording note |
| R03-4 | PASS for cumulative preservation | Exact-C verification, matrix, scope, KC/R02 and nondeferred D01 obligations preserved; overall acceptance still fails R03-1/3 and D03-CHK-03 |

Every design-check disposition was reconsidered, not inherited solely from earlier acceptance:

| Check | Result |
|---|---|
| D01-CHK-01 | PASS: command-capability refusal and 51-step cost kept visible |
| D01-CHK-02 | PASS: Q2b convention as amended by owner OQ-1; label immutable and collision-checked |
| D01-CHK-03 | PASS: per-Execution rejection episode and clear/retain transitions |
| D01-CHK-04 | DEFERRED by owner choice 02 to K2.4/E2; acceptance-order witness remains |
| D01-CHK-05 | PASS: constant Effect field/no sink attempt and bounded projections expressly authorized |
| D01-CHK-06 | PASS: encoder refusals/ordinary controls, Execution scoping, inverse reference resolution and visible unsupported answers |
| D01-CHK-07 | PASS: clock starts at 1; Driver keeps attempt's own grant and reports safe replacement as declared |
| D01-CHK-08 | PASS: source/manifest/resolution/environment pin contract and loader refusal |
| D01-CHK-09 | PASS: import/ambient/expectation controls and five registry ablations; owner choice 03 resolved the former deviation |
| D03-CHK-01 | FAIL as full disposition; adapter checks and all requested traces PASS, but independent A1 first-row validation is missing in the oracle (same K14C-R03-01) |
| D03-CHK-02 | PASS: already-established-ID scope and first-exposure equality control |
| D03-CHK-03 | FAIL: independent of ledger and non-vacuous for its covered cases, but incomplete call/inspection association |
| D03-CHK-04 | PASS for declared bounds, counts, budget and seven targeted kills; overall search acceptance still depends on fixing D03-CHK-03 |
| D03-CHK-05 | PASS: full typed-position census, ignored/untranslated fields, ingressRefused and exact-retry controls |

No other mandatory criterion was deliberately left unexamined. This is a scoped review, not a claim
to prove all possible adapter, Kernel or evidence-tool behavior. Trusted in-process assumptions,
017's existing projection limits and the explicitly deferred K2/E2 work remain limits.

## Root-cause note and owner handoff

This is the third CHANGES REQUIRED, so 006 stops another patch round until the owner selects a route.
The recurring mechanism is incomplete composition of the representation/evidence pipeline. Earlier
rounds proved preferred-name bindings while emitted fallbacks bypassed the proof. Round 3 fixes that
mapping structurally, but its oracle separately validates the primary target and the final view
without proving that they belong to the same command, and ignores other recorded mutations.

The earlier corpus did not vary these independently: the wrong-target rejection control moves the
primary call, so it does not expose a correct primary followed by a wrong inspection. Five targeted
oracle controls and exact counts can pass while that join is missing. The A3 design's singular
“command's Kernel call” did not supply a complete call-sequence obligation; implementation also
weakened A1's addressed/answered-Execution row to view-versus-inspection self-consistency. This
questions the completeness of the accepted disposition, not the soundness of the new ledger rule.

Recommended route: redesign the oracle's command/call/inspection contract in a new design note and
independent design check, keeping the now-sound rendering mechanism. Alternatives under 006 are a
refined finishable claim, a split, or an explicitly accepted recorded limit, with their effects on
R03-1/3 and D03-CHK-03 stated. None follows automatically from this review. The owner was asked in
this review chat; **no route answer had been received when this record was prepared**. No correction
build is authorized by this record before that decision. [Brief 04](review-03/brief-04.md) gives the
concrete proposed correction and preserves that decision gate.

Reviewer changes are this record, its evidence/correction brief and the 007 status row only. No
candidate fix or third-party code/dependency/asset was incorporated. The new probes are independently
authored against repository APIs; the review 02 reproducer and registry wrapper are explicitly
attributed reuse of this repository's own review evidence. Existing locked dependencies were used
for verification; no new third-party license clearance is asserted.

**Transcription:** K1.4-candidate — CHANGES_REQUESTED. Independent cumulative review 03 of H
ddc53bd132fde4f71bc989ccec7f4d0e430a45dc: CHANGES REQUIRED. K14C-R02-01 closed; prior registry/gate
closures preserved. K14C-R03-01 (P2) blocks oracle-completeness closure; K14C-R03-02 is a P3 wording
note. Third CHANGES REQUIRED: stop-and-redesign, owner route pending. No acceptance, integration or
successor release.

CHANGES REQUIRED
