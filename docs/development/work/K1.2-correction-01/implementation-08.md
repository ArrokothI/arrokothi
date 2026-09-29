# Implementation report — K1.2-correction-01, round 8 (contract revision 9)

Claude Code desktop, model `claude-opus-5-5`, 2026-09-29. The owner handed this round to this session
with a brief for contract revision 9 under [amendment 03](amendment-03.md). This session wrote no
earlier review, report, amendment or prompt of this packet; it is not the independent reviewer. The
report records implementer work, not acceptance.

## Design

Amendment 03 moves the acceptance evidence for correction DEC-8 and DEC-9 from static analysis to two
runtime sweeps. Both rules stay binding coding rules. Each sweep states its scope, and neither claims
more than that scope.

### DEC-8: the poisoned-prototype sweep

**Mechanism.** While a Kernel boundary call runs, every member name the zone uses is installed as an
accessor on `Object.prototype` and `Function.prototype`, amendment 03's two. The sweep also installs
them on `Array.prototype` and `String.prototype`, where Kernel lists and strings would find a live
method that C13 forbids. A zone that reads only members its objects own finds each member on the
object itself, or on a host or class prototype below these four, so it never reaches an accessor.
- *Attribution.* An accessor that does run is attributed by the first non-built-in stack frame above
  it.
  - A zone source, or the `canonicalize` dependency the zone calls, is a Kernel read.
  - A registered Proxy handler as receiver is the engine looking up a trap the caller's handler
    lacks: Proxy semantics of a caller object, not a Kernel read.
  - Anything else is caller code. The accessor answers it exactly as the prototype would have.
- *Modes.* Each scenario runs four times:
  - unpoisoned;
  - `count`, which records the read and answers as the prototype would;
  - `throw`, which throws;
  - `reenter`, which appends an input to every Execution the caller can see from inside the read, then
    answers.
- *Pass condition.* No zone firing, and every boundary result digest-equal, call by call, to the
  unpoisoned run.
- *Liveness.* A probe read on a fresh object must reach the accessor in every window, so a green run
  cannot come from poison that was never live.
- *Lifetime.* The accessors exist only between the outermost window's entry and exit. An accessor that
  a caller saves inside a window and reinstalls later carries its own saved state, and it is unwrapped
  by the next window.

**Name set** (`sweep/zone-names.ts`), derived from the 13 zone sources with the TypeScript parser. It
has 310 names:
- *Member positions:* every name spelled in a member position, meaning property-access names, literal
  element keys, and members declared by interfaces, type literals, classes and object literals.
  Declared members count even when no code reads them.
- *String literals:* every identifier-like string literal. The zone passes member names to
  `observeOwn`, `observeField` and `hostMember` as literals, and its computed reads take their keys
  from literal unions.
- *Engine-read names:* the names the engine reads for operations the zone could perform. These are
  primitive conversion, the iteration protocol, `then`, `toJSON`, `instanceof`, species lookups, the
  function protocol, `length`, `name` and `message`.
- *Indices:* 0–15.

**Why this reaches the zone's reads.** An ordinary read spells its key in one of those positions or
takes it from a literal. The only names the zone builds at run time are list positions. Engine-induced
reads are the listed protocols.

**Scenario sets**, which are the declared scope:
1. **The whole maintained Kernel suite** (`sweep/run-poison-sweep.ts` with `sweep/preload.ts`). Every
   Kernel test file runs, except the two sweep files. Each file runs with a window around:
   - every public `ExecutionCoordinator` method;
   - its constructor;
   - every zone function a test file imports (routed through a module hook).

   The six property-descriptor field names are not installed here. The suite's hostile callbacks
   convert ordinary descriptor literals, which those names would change for the caller rather than for
   the zone.
2. **A catalog** (`poison-catalog.test.ts`, which runs in `npm test`). It covers every public boundary
   with its accepted, idempotent and refused exits, plus the delivery-report capability. It also
   covers the zone paths the suite never reaches: a non-object initial input, a non-list Effect field,
   a non-record `available`, and unobservable list lengths and elements. Its callbacks use
   null-prototype descriptors, so it installs the complete name set, descriptor fields included.

**Why these sets cover the zone's reachable paths.** V8 line coverage of the zone (validation 54–55):
- The maintained suite alone executes 99.48% of zone lines.
- The suite plus the catalog execute every zone line except two:
  - `boundDiagnostic`'s catch, which only an engine fault reaches (the fault sweep reaches it);
  - a byte-limit re-check in `values.ts` that the running byte count makes unreachable.

**What it cannot see:**
- `[[HasProperty]]` (`in`), which runs no accessor;
- members of other built-in prototypes, such as `Error.prototype.name`, which has its own runtime test;
- paths no scenario reaches.

**Why it catches review 11's READ-01 mutant at runtime.** The mutant reads `resultingEpoch` from an
`ExecutionRecord` inside `inspect()`. The record does not own it, so the read walks to
`Object.prototype` and runs the accessor, with `coordinator.ts` `inspect` as the first frame. In
`count` mode that is a zone firing. In `throw` mode the inspection throws. In `reenter` mode the
returned view contains the reentrant input. The sweep reports the mutant at its exact line.

### DEC-9: the fault-injection sweep

**Mechanism** (`sweep/fault-child.ts`, run in its own process).
- *Interception.* Before the Kernel is imported, every built-in method the zone captures at load is
  replaced by a counting wrapper. There are 35 such methods: the member chains in the zone's top-level
  captures, plus the Array iterator's `next`. The zone's load-time references are therefore the
  wrappers, and the serializer window reinstalls those same references for `canonicalize`.
- *Runs per scenario.* The target call runs once to count its N operations. It then runs once for each
  k = 1..N on a fresh coordinator, with an exception at operation k. Finally it runs once more with
  k = N + 1, when the call completes.
- *Observation after each run.* The sweep records the whole view, the positions the next refusal and
  the next accepted input receive, and what the setup attempt's grant can still do. The view shows
  neither index nor the current grant.

**Oracle.** Each run must leave a state that some complete decision explains:
- *A thrown fault:* the no-call state, exactly.
- *A contained fault answered as a refusal:* the no-call state plus exactly that refusal.
- *A contained fault answered as acceptance:* the uninjected decision. For a protocol-failure report
  whose diagnostic could not be read, the fallback-diagnostic decision.
- *A takeover whose delivery fails after its commit:* the decision, with its own delivery row absent,
  pending or failed.

Where the contract declares apply windows with more than one step (a takeover that clears a hold;
Outcome acceptance), a partial state is accepted only at an apply-kind operation, and for a takeover
only as exactly its receipt appended. Such partials are reported. A partial state at any construction
operation, such as `Object.freeze`, is a violation.

**Where this departs from the brief's wording, and why.** The brief asks that, for every k, the whole
view and the next accepted receipt position equal the no-call run.
- *Faults that escape the call.* The sweep applies exactly that rule, and more strictly: it also
  compares the next refusal position and the setup grant.
- *Faults the Kernel contains.* That rule cannot hold for them, and it should not:
  - An exception while a caller field is observed makes the field unobservable. The Kernel answers
    with a recorded refusal, as it would for a throwing getter.
  - A failed Driver delivery after a committed takeover is recorded as a failed delivery row.

  Those are complete, correct decisions that differ from the no-call run by exactly their own record,
  so the sweep checks them against that record instead. This is the implementer's reading. The
  reviewer may judge whether it needs an owner call; the alternative, treating every contained fault
  as a failure, would reject the Kernel's own observation rules.

**Scope.** 37 scenarios:
- every exit of `recoverExecution` (12), `reportProtocolFailure` (7) and `requestTakeover` (8);
- the accepted and refused exits of Outcome acceptance (10).

That is 43,446 injected runs. The scenarios with few operations run in `npm test`
(`fault-sweep.test.ts`); the complete sweep runs in `npm run test:kernel-sweeps` and in validation.
Faults are injected only at intercepted operations. Property access, allocation, constructors and
string building are outside the sweep, as is any change invisible at the boundary.

**Why it catches review 11's COMMIT-01 mutants at runtime.** Both mutants advance
`nextAcceptancePosition` before the takeover builds its Activation, grant, history and answer. Those
builds call `Object.freeze`, which is intercepted. A fault there throws with the index already
advanced, so the next accepted input receives position 4 instead of 3. That state is neither the
no-call state nor a complete decision. Review 11's own fault probe is one of these fault points, and
the sweep asserts it by name as "review 11's seed".

### The static analysis

The analysis is kept as a regression guard, and its code is unchanged. Reasons:
- It still flags the plausible accidental forms it was built for.
- Every earlier runner depends on its rule tests: `ablations-07.mjs` requires one to fail for each of
  its 28 mutants.
- Simplifying it would have meant re-validating those runners without adding evidence.

Its documentation now states exactly what it detects and its known gaps: the contract's DEC-8 and
DEC-9 "Guard" bullets, BASELINE, and the headers of `zone-analysis.ts`, `ambient-reads.test.ts` and
`control-commits.test.ts`. The gaps include review 11's three forms:
- a member introduced through a partially declared or nested type assertion or predicate;
- a default parameter that supplies the record;
- a local named `undefined`.

The words "comprehensive" and "closed-world" no longer describe it anywhere.

## Identity

- **Packet and contract:** K1.2-correction-01, parent K1.2. [Contract revision 9](contract.md) records
  this round.
  - Governing decisions: [amendment 01](amendment-01.md), [amendment 02](amendment-02.md),
    [amendment 03](amendment-03.md) and [decision-05](../K1.2/decision-05.md).
  - V-D1 stays transferred to K1.1-correction-03. It is neither implemented nor certified here.
- **Governing process baseline B:** `a20d278185eaffc7f8b7489345a3624231ff6e6d`. 006, 008 and 012 are
  unchanged since B on this branch (`check-records.mjs`).
- **State:** WAITING_FOR_REVIEW, as an implementer assessment only.
- **Owner release and decisions:**
  - release `6ed7d3a6e3d7190aae5bbdfcf10dd515a6b45abb`;
  - amendment 01 and decision-05 at `13a73ad9ad0662fe585d1453280c5ac3da4f79bb`;
  - amendment 02 at `60eebc24113eb834e5d88015ca2a196c95c60493`;
  - amendment 03 at `b93ed1df6b70569ada060481523e5b37c206e324`.
  Both invalidation holds remain.
- **Branch:** `codex/k1.2-correction-01-activation-identity`, origin
  `https://github.com/ArrokothI/arrokothi.git`. The existing clean checkout already named this branch
  at `b93ed1d`, pushed. No checkout or worktree of another agent was switched; the disposable
  worktrees used by the validation runners are removed after use. Forward commits only.
- **Commits:**
  - previous reviewed H: `dcac779bdf7e887bcf42c8a6407c1b24c2083a55` (C
    `58d9c5c50ff3561c9f7b719a84acfd0b0d5d4d9f`), [review 11](review-11.md), CHANGES REQUIRED, recorded at
    `d005dc6281a17f75bbad0b32c59aec169cdcc1ae`;
  - **payload C:** `81dca4575ea56cfdde5b5f8ed72c439c7ec31821`;
  - superseded first payload `f49e86e741f145747e2b047ad8b98a0a3e62f960`, never published. Its
    validation run was stopped when entry 14 hit the collector's former 600-second limit (killed by
    SIGTERM). The new test files lengthen every full-suite ablation run, and round 7's entry 14 had
    already taken 580 seconds. Its only difference from C is that limit: C raises the default to
    30 minutes. No evidence from the stopped run is kept or used;
  - **candidate H:** the commit containing this report. The external handoff gives its full SHA.
- **C..H:** only the allowlist at the end of this report.

## Changes and coverage

**Production (C).**
- `coordinator.ts` `#refusal`: the refusal record is built and appended before the refusal index
  advances (`SELF-R8-REFUSAL-01`, below). The line the original correction ablation R1 anchors on is
  unchanged.
- `coordinator.ts` header comment: the enforcement paragraph now names the runtime evidence and calls
  the two test files guards.

**Tests (C), all new files.**
- `tests/sweep/zone-names.ts`, `poison.ts`, `preload.ts`, `run-poison-sweep.ts`: the DEC-8 sweep.
- `tests/sweep/fault-child.ts`: the DEC-9 sweep.
- `poison-catalog.test.ts` (6 tests): the catalog, in all four modes, with the complete name set.
- `fault-sweep.test.ts` (2 tests): the 18 fault scenarios with few operations, and review 11's seed.
- `whole-view-ambient.test.ts` (31 tests): review 10's 30 whole-view comparisons, with the review's
  assertions unchanged, plus the count.
- `review-11-probes.test.ts` (3 tests): review 11's inherited-read probe in its count, throw and
  reenter arms, against the clean results the review recorded.
- Review 09's 22-case matrix has been a maintained test since revision 7 (`recovery-ambient.test.ts`,
  with its `--expect-correct` oracle). It is unchanged.
- The analysis tests: header comments only (no test names or rules change). `zone-analysis.ts`: header
  comment only.

**Records and scripts (C).**
- [Contract revision 9](contract.md):
  - header, revision history and the round-8 identity entry;
  - DEC-8 and DEC-9 evidence and guard bullets, plus the refusal-exit sentence;
  - five coverage rows, with the two revision-8 rows relabelled as guards;
  - the revision-9 validation paragraph.
- BASELINE `#outcome-acceptance-api`: the recovery-control and ambient-read bullets describe the
  runtime evidence and the guard, with its gaps.
- `package.json`: the `test:kernel-sweeps` script.
- `validate.mjs`: entries 52–58, and a per-check timeout for the sweeps.
- `check-records.mjs`: the new declared test files. These are now sealed: report 07 with validation
  07, review 11 with its owner note, and amendment 03. Amendment 03 joins the link check.
- `sweeps-08.mjs`: the sweeps' negative controls. `probe-reviewed-h-08.mjs`: the sweeps and the new
  probes against a worktree of reviewed H.

**Layer 3.** No concept or mechanism page changes, because no semantics changed. Refusal-index
ordering is an implementation fact, recorded in BASELINE and DEC-9.

**Selected 012 methods:**
- normative examination: DEC-8 and DEC-9 against the sweeps' oracles;
- deterministic execution: both sweeps, the maintained probes and the negative controls;
- in-process race and fault: fault injection, reentrant accessors;
- process and documentation: records, sealed evidence, the allowlist, links.

**Exclusions:**
- native fidelity (R1), process death (K3), external gates (K1.4) and packaging (S1);
- the broader in-process threat model and enforcement by construction (DESIGN-AUDIT-01);
- V-D1 (K1.1-correction-03).

Exception injection proves only its narrower case, not process durability.

**Obligation coverage.**

| Obligation / source | Distinguishing input | Expected facts / forbidden changes | Evidence and result |
|---|---|---|---|
| DEC-8 at run time; R11-READ-01, C12, C13 | every maintained Kernel test file and the catalog, with every zone member name poisoned on four prototypes, in three modes | no zone firing; every result equal to the unpoisoned run; live in every window | whole-suite sweep (entry 53): 1,445/1,445 in all four modes, 11,532 windows, 0 zone firings, traces identical, 11,532/11,532 liveness probes; catalog 6/6 |
| DEC-9 at run time; R11-COMMIT-01, C8–C10, C12 | an exception at each of 43,446 intercepted operations in 37 scenarios | every state explained by a complete decision (view, both next positions, setup grant) | fault sweep (entry 52): 43,446 runs, 0 violations |
| Review 11's seed | a fault immediately before the takeover's Activation is built | the view is unchanged; the next input receives position 3 (review 11: 3 clean, 4 for both mutants) | `fault-sweep.test.ts`; entry 52 |
| Sensitivity | review 11's three mutants, review 10's two, ablations-07's C3–C16 and R1–R12, and three more read forms | in-scope mutants rejected; forms a runtime sweep cannot observe are run and reported | `sweeps-08.mjs` (entry 56): 28 rejected, 6 reported as outside, clean controls pass |
| Maintained probes | review 10's 30 comparisons; review 11's inherited-read probe | the review's assertions and recorded clean results | 31 + 3 tests; at reviewed H too (entry 57) |
| SELF-R8-REFUSAL-01 | a fault while a refusal record is built or appended | no refusal position consumed without its record | 57 violations at reviewed H, all at that step; none at C |
| Guard documentation, C15 | contract, BASELINE, headers | exact detections and known gaps; no comprehensive or closed-world claim | text; alias search in entry 44 |
| C1–C15, DEC-1–9 cumulative | every existing suite and runner | unchanged pass/reject | validation table |

## Semantic correction closure

- **Invariant.** DEC-8 (no read of a member an object may not own) and DEC-9 (the whole decision is
  built before the first mutation) are unchanged. What changed is the evidence. Revision 8 treated a
  static analyzer as proof of both rules for any future code. That is an open problem, which review
  11's three mutants showed. Revision 9 checks the rules on the paths that actually run, and states
  those paths.
- **Why the sweeps are not another list of known shapes.** Neither sweep inspects source shapes.
  - The poison sweep observes a read *happening*: whatever syntax, alias, cast or helper produced it, a
    read that walks past its object runs the accessor.
  - The fault sweep observes an *effect*: whatever code path advanced an index or wrote a field early,
    the state after a later fault shows it.

  What each cannot see is stated as scope, not claimed away: `in`, other prototypes, unreached paths,
  engine-level faults, and changes invisible at the boundary.
- **Dependents traced.**
  - For DEC-8: every public boundary and every exit of the three controls and of Outcome acceptance.
    The whole suite covers them, and the catalog covers every line the suite misses. The residual two
    lines are named.
  - For DEC-9: every exit of the three controls, including refusal and idempotent exits, which is
    where `SELF-R8-REFUSAL-01` was found. Also Outcome acceptance.
  - Future receipts: the next acceptance position, the next refusal position, and the setup grant's
    authority, which neither index nor the view shows.
- **Counterexamples.**
  - Review 11's three mutants and review 10's two are rejected by the sweeps. The fault mutants give
    exactly review 11's next-position shift.
  - Of ablations-07's 28 static-form mutants, 22 are rejected at run time, and six are reported as
    outside runtime observation, with reasons: C8, C10, C12, R7, R9, R10.
  - Three more read forms written for this round are rejected: `hostMember` walking onto the
    prototypes, an ordinary descriptor literal in `defineData`, and an ordinary optional read.
- **Whole-packet re-audit.** The production delta since review 11 is `#refusal`'s order and a comment.
  - The cumulative B..C diff was re-examined where this round reaches it: every refusal, which all
    boundaries share, and the three controls and Outcome acceptance, through the sweeps.
  - Accepted values, single observation, identities, ordering, diagnostics and the V-D1 transfer are
    untouched.
  - Every earlier runner is rerun on C.

## Prior findings

- `K12C1-R11-READ-01` (P2). Addressed on C. Amendment 03 makes the runtime sweep the DEC-8 evidence.
  Review 11's mutant is rejected by both poison scopes. The guard's gap for partially declared and
  nested assertions and predicates is stated in the contract and BASELINE. It is not closed by
  extending the analyzer, as the brief and amendment 03 direct.
- `K12C1-R11-COMMIT-01` (P2). Addressed on C. The fault sweep is the DEC-9 evidence. It checks the
  whole view and every next position after each fault, rejects both mutants, and reproduces review
  11's fault probe as its seed. The guard's gaps (default parameter, shadowed `undefined`) are stated.
- Review 10's general outcomes (`K12C1-R10-READ-01`, `K12C1-R10-COMMIT-01`) are carried by the same
  sweeps.
- Earlier findings keep the dispositions in [review 11's reconciliation](review-11.md#prior-findings-and-correction-closure).
  Their dependent mechanisms were re-checked in the re-audit above, and no disposition changes.
  Transferred cost findings stay open in K1.1-correction-03.

## Additional self-found defects (implementer provenance)

- **SELF-R8-REFUSAL-01 (P3-class; correction DEC-9, C12).**
  - *Defect.* `#refusal` did `record.nextRefusalPosition += 1` before `mintRefusal` and `appendOwn`. An
    exception while the record was built or appended therefore consumed a refusal position with no
    retained refusal, and the next refusal skipped it.
  - *Found by* the new fault sweep, on every refusal exit of the three controls and of Outcome
    acceptance: at reviewed H, 57 violations in 19 scenarios, all at those three operations.
  - *Scope.* The defect is in the shared helper, so it affected every boundary's recorded refusals.
    [Implementation 06](implementation-06.md)'s O4 had declared this window outside the claim.
  - *Fix.* The record is now built, appended, and then the index advances, so no fault leaves a gap.
  - *Impact.* No accepted state or accepted-index position is affected; only refusal-position
    contiguity under an engine fault.
  - *Severity* is the implementer's assessment; the reviewer decides.
- **Still outside the claim (unchanged).** `#mint` in ingress and dispatch advances the acceptance
  index before building the receipt. Those K1.1 boundaries are not in amendment 03's sweep scope, and
  the change would alter integrated K1.1 code that amendment 03 does not authorize. This is
  implementation 06's O4, narrowed to those two boundaries.

**Unresolved obligations:** none known in scope.

## Observations for the reviewer

- **O1. The sweeps depend on the engine's behaviour.** Attribution relies on V8 stack frames. Fault
  interception relies on the zone's load-time capture of built-ins, which the child derives from the
  sources and prints (`intercepted`, `notIntercepted`). Both are checked by their negative controls,
  not assumed.
- **O2. What the whole-suite sweep cannot run under poison.** It leaves out the six descriptor-field
  names, because hostile test callbacks use ordinary descriptor literals. Those names are covered by
  the catalog.
- **O3. Where a runtime sweep can be blind.** C8, C10, C12, R7, R9 and R10 each change nothing a runtime
  sweep can observe:
  - a host read without effect;
  - module state;
  - a write of the value already held;
  - `in`;
  - an own read respelled;
  - `Error.prototype`.

  The static guard still rejects all six (`ablations-07.mjs`). They are listed so that no one reads the
  sweeps as covering them.
- **O4. Tests added to every runner.** The new test files run inside every earlier ablation runner's
  suite, adding about six seconds per mutant run. They can only add rejections; all earlier verdicts
  are recomputed in validation.
- **O5. The takeover apply window.** The declared apply window of a takeover that clears a hold appears
  in the fault sweep: a fault between the two appends leaves exactly the receipt. This is the existing
  DEC-9 qualification, made observable, not a new defect.
- **O6. The historical diff checks grow about sevenfold per round.** Each historical range now also
  re-flags the previous round's own diff-check logs, which quote whitespace from sealed evidence. For
  example, entry 12 grew from 1.16 MB in round 7 to 7.97 MB. This round attaches those seven logs
  gzip-compressed. That is lossless, and as binary files they are not re-flagged by the next round's
  checks. Excluding sealed `validation-*` directories from the historical ranges would stop the growth
  at its source. That is a validation-script change for a future round, not made here.

## Validation and interpretation

The validation ran sequentially on clean C `81dca4575ea56cfdde5b5f8ed72c439c7ec31821`:
`node docs/development/work/K1.2-correction-01/validate.mjs <scratch dir>`, from the repository root,
with no manual additions. The outputs are attached under `validation-08/`.

The environment is Node v25.2.1, npm 11.6.2, TypeScript 5.9.3, Darwin arm64
([00-environment.json](validation-08/00-environment.json)). [13-results.json](validation-08/13-results.json)
records every command, exit code and timestamp, and records the tree as clean after the run.
[MANIFEST.sha256](validation-08/MANIFEST.sha256) covers the 63 other attachments; its own SHA-256 is
`1414096365f04eea0b851a7ad07ad52bb60c609fc8ccf156b63387110f451da5`.

**Compressed attachments.** The seven historical-range diff checks (12, 19, 22, 29, 33, 45 and 51) are
attached gzip-compressed (`gzip -9 -n`), because their raw logs grew to between 6.8 and 8.0 MB each
(O6). `gunzip -k` restores the exact bytes, which have these uncompressed SHA-256 digests and sizes:

| Entry | Uncompressed SHA-256 | Bytes |
|---|---|---:|
| 12-diff-check | `a5cf0899ad950700eb6a732e191bf7e1cbe4fc031a23138d1ab5b6ae04dd34b3` | 7,971,608 |
| 19-round2-diff-check | `0ef73f7715fd20985c7acd859f608e3ad85339dd3e8200912392dd233d064dcc` | 7,970,184 |
| 22-correction-diff-check | `76386eb36b805a2e579319a3cb10516c4ab50163bd1cc381e4638ebe1aca5b9e` | 7,970,184 |
| 29-round3-diff-check | `6e9ead7fedc11b1870ba5d340440cf19ebdba8b466e2b4538d905dfbfcc59390` | 7,968,943 |
| 33-round4-diff-check | `bce9893ff76d56f8ef1e39dda76da5de0c841c301e49b37e34564315a8b8e256` | 7,963,810 |
| 45-round6-diff-check | `9766086376f3e183de02b7ded88864d467b7a818839edd156443898a5e74caf1` | 7,779,572 |
| 51-round7-diff-check | `00eb65e43a67718eba70c755a23fc06419908a6ee4efca9083ef1cef7e3a51f0` | 6,814,034 |

**Results.**

| Command / raw output | Exit | Observation |
|---|---:|---|
| [01-typecheck](validation-08/01-typecheck.txt) | 0 | TypeScript passed |
| [02-full](validation-08/02-full.txt) | 0 | 3,507/3,507; 0 failed, cancelled, skipped or todo. Round 7 had 3,465; the 42 new tests are 6 catalog, 2 fault-sweep, 31 whole-view and 3 review-11 probe tests |
| [03-kernel](validation-08/03-kernel.txt) | 0 | 1,453/1,453 |
| [04-conformance](validation-08/04-conformance.txt) | 0 | 1,945/1,945 |
| [05-sdk](validation-08/05-sdk.txt) | 0 | 22/22 |
| [06-builder-docs](validation-08/06-builder-docs.txt) | 0 | 72 files; 1,845 links/anchors; 38 imports |
| [07-original-ablations](validation-08/07-original-ablations.txt) | 1 | 32/36; B6/B12/B13/B14 NOT APPLICABLE (the disclosed anchor drift, as in rounds 2–7) |
| [08-correction-ablations](validation-08/08-correction-ablations.txt) | 0 | 67/67 rejected |
| [09-r11-probe](validation-08/09-r11-probe.txt) | 0 | 8/8 `stale_exchange` |
| [10-records-links](validation-08/10-records-links.txt) | 0 | Ancestry and sealed records, now including report 07 with validation 07, review 11 with its owner note, and amendment 03; 26 files, 712 links/anchors |
| [11-evals](validation-08/11-evals.txt) | 0 | 12/12 |
| [14-original-ablations-adapted](validation-08/14-original-ablations-adapted.txt) | 0 | Control 1,453/1,453; 36/36 rejected |
| [15](validation-08/15-review-identity.txt)–[18](validation-08/18-diagnostics-maxlen.txt), [20](validation-08/20-review-aggregate.txt), [21](validation-08/21-review-equality.txt), [26](validation-08/26-review-aggregate-pre-authority.txt) review-01/02 probes | 0 | As in implementation 07 |
| [23](validation-08/23-review-cost-accept.txt)–[25](validation-08/25-review-cost-refuse-ctor.txt), [28](validation-08/28-review4-p4-p5.txt), [32](validation-08/32-review6-cost-and-blocker.txt), 34 (six handler runs), [35](validation-08/35-string-work.txt) | 0 | Cost and timing are observations only (V-D1 transferred); count and logical assertions pass |
| [27-revision4-ablations](validation-08/27-revision4-ablations.txt) | 1 | Unchanged round-3 runner: control 35/35, X8–X11 rejected, then stops at X12's unique-anchor assertion (span removed in round 6; disclosed) |
| [38-revision4-ablations-rebound](validation-08/38-revision4-ablations-rebound.txt) | 1 | Round 6's rebinding adapter: 20/21; V5 is the disclosed equivalent survivor |
| [30-review6-exact-ablations](validation-08/30-review6-exact-ablations.txt), [31-diagnostic-work-ablations](validation-08/31-diagnostic-work-ablations.txt) | 0 | Z1–Z16 rejected; T1–T4 rejected |
| [37-round6-ablations](validation-08/37-round6-ablations.txt) | 0 | H1–H22 rejected (22/22) |
| [39](validation-08/39-review9-probe-history.txt), [40](validation-08/40-review9-probe-history-mutable.txt) | 1 | Review 09's reproducers still fail at their first assertion because the defect does not reproduce |
| [41](validation-08/41-review9-matrix.txt), [42](validation-08/42-review9-matrix-expect-correct.txt) | 0 | 22 cases; `--expect-correct` 0 violations |
| [43-host-members-probe](validation-08/43-host-members-probe.txt), [44-claim-alias-search](validation-08/44-claim-alias-search.txt) | 0 | As in round 7; the alias search finds no new claim text |
| [47-round7-ablations](validation-08/47-round7-ablations.txt) | 0 | 28/28, each failing a named rule test. The round-7 DEC-9 mutants now also fail the new maintained fault sweep |
| [48](validation-08/48-review10-enforcement-rebound.txt), [49](validation-08/49-new-oracles-and-name-probe-on-reviewed-H.txt), [50](validation-08/50-review10-probes-rerun.txt) | 0 | As in round 7. Review 10's whole view is byte-identical (SHA-256 `bb2763cc…`) |
| **[52-fault-sweep](validation-08/52-fault-sweep.txt)** | 0 | 37 scenarios, 43,446 runs, **0 violations**; 35 intercepted operations. Classes: 41,968 refused (a fault contained as an unobservable field); 1,348 threw with the no-call state; 37 completed; 10 accepted after a contained fault; 10 refusals naming no Execution; 14 post-commit takeover delivery outcomes; 2 in the takeover apply window; 57 in the Outcome apply window. Seed: operation 25, view unchanged, next input at 3 |
| **[53-poison-sweep](validation-08/53-poison-sweep.txt)** | 0 | 42 Kernel test files and 310 names on four prototypes; 1,445/1,445 in off, count, throw and reenter; 11,532 windows and 11,578 traced calls, identical in every mode; **0 zone firings**; 11,532 liveness probes; 3,252,437 caller and 18,056 Proxy-handler lookups answered transparently |
| **[54](validation-08/54-zone-coverage-suite.txt), [55](validation-08/55-zone-coverage-suite-and-catalog.txt) zone coverage** | 0 | Suite alone: 99.48% of zone lines, 96.01% of branches. Suite plus catalog: 99.77% of lines and 96.97% of branches; unexecuted lines are only `envelope.ts` 325–326 and `values.ts` 1469–1479 (see Design) |
| **[56-sweep-negative-controls](validation-08/56-sweep-negative-controls.txt)** | 0 | Clean controls pass. 15 fault mutants rejected (review 11's two, C1–C7, C9, C11, C13–C16). 13 read mutants rejected (review 11's READ-01, R1–R6, R8, R11, R12, K1–K3), two of them also by the whole-suite sweep. C8, C10, C12, R7, R9 and R10 are reported as outside, with reasons |
| **[57-sweeps-on-reviewed-H](validation-08/57-sweeps-on-reviewed-H.txt)** | 0 | At H: probes and catalog 40/40; whole-suite poison clean; fault sweep 57 violations in the 19 refusal-exit scenarios, every one while a refusal record is built or appended (`SELF-R8-REFUSAL-01`) |
| [58-round8-diff-check](validation-08/58-round8-diff-check.txt) | 0 | `b93ed1d..C` whitespace-clean: this round's whole payload |
| [59-guard-claim-search](validation-08/59-guard-claim-search.txt) | 1 | No match. `git grep` exits 1 when nothing matches: no live DEC-8/9 text uses "closed-world" or "comprehensive" |
| [12](validation-08/12-diff-check.txt.gz), [19](validation-08/19-round2-diff-check.txt.gz), [22](validation-08/22-correction-diff-check.txt.gz), [29](validation-08/29-round3-diff-check.txt.gz), [33](validation-08/33-round4-diff-check.txt.gz), [45](validation-08/45-round6-diff-check.txt.gz), [51](validation-08/51-round7-diff-check.txt.gz) historical-range diff checks | 2 | Only whitespace quoted inside sealed earlier validation and review attachments. Entry 51 now includes review 11's recorded evidence and validation 07 |

The collector exits 1 because it keeps the disclosed exits above. The nonzero set is round 7's, plus
entries 51 and 59, whose results are explained above. No command timed out, was killed by a signal, or
failed to load.

**Checks not run, and limits.**
- Node 22 was not run. `run-poison-sweep.ts` uses `module.registerHooks`, which needs Node 22.15 or
  later.
- Cost and timing probes are observations only.
- The first payload `f49e86e` was not validated to completion: its run was stopped at entry 27, after
  entry 14 hit the old limit. No output of it is attached or used.
- Neither sweep claims more than its stated scope (see Design).

**Why the evidence supports each criterion (implementer assessment, not acceptance).**
- **DEC-8 / C12, C13 (READ-01).**
  - No zone frame reached any of 310 names on four built-in prototypes, across every boundary call
    of the maintained suite (entry 53) and the catalog (npm test), in three modes, with identical
    results and live poison.
  - The two sets together execute every zone line but two, and those two are explained.
  - Review 11's mutant and 12 other read forms are rejected at run time (entry 56).
  - The guard's gaps are stated, not closed.
- **DEC-9 / C8–C10, C12 (COMMIT-01).**
  - No fault at any of 43,446 intercepted operations left a state that no complete decision explains
    (entry 52). The state is checked beyond the view: both next positions and the setup grant.
  - Review 11's two mutants, review 10's two and eleven more early-mutation forms are rejected
    (entry 56).
  - Review 11's seed reproduces its recorded clean position.
- **SELF-R8-REFUSAL-01.** It is present at reviewed H and nowhere else (entry 57), and absent at C
  (entry 52).
- **Behaviour unchanged.** Full suites pass. Review 10's whole view is byte-identical (entry 50).
  Every earlier runner rejects as in round 7, and the adapted original and rebound runners are
  unchanged in verdict.
- **Every other criterion.** Unchanged suites and runners pass or reject as in round 7.

**Design choices, amendments, assumptions and strongest remaining risk.**
- *Authority.* Amendment 03 authorizes this round's evidence change. Amendment 02's same-mechanism
  permission covers the one production fix, on the controls' own refusal exits.
- *Choices the owner may review:*
  - poisoning two prototypes beyond amendment 03's two;
  - leaving the descriptor fields to the catalog;
  - the oracle for contained faults (Design);
  - keeping the analysis unchanged.
- *Strongest risk.* The sweeps' power rests on the scenarios reaching the paths and on the engine
  behaving as observed (stack attribution, load-time capture). The negative controls and the coverage
  measurement are the evidence against both failure modes.
- *Second risk.* Most fault points (41,968 of 43,446) fall inside caller-value capture, where a fault
  becomes a recorded refusal by design. The sweep's power against early mutation comes from the
  1,478 faults that escape or complete. Every early-mutation mutant tried is caught there.

**Third-party use:** none new. The sweeps use Node built-ins (`node:module` hooks, V8 stack traces,
`node:crypto`) and the repository's existing TypeScript dependency. No code was copied or adapted from
another project.

## Exact C..H administrative allowlist

```text
docs/development/007-work-packets.md
docs/development/work/K1.2-correction-01/implementation-08.md
docs/development/work/K1.2-correction-01/validation-08/00-environment.json
docs/development/work/K1.2-correction-01/validation-08/01-typecheck.txt
docs/development/work/K1.2-correction-01/validation-08/02-full.txt
docs/development/work/K1.2-correction-01/validation-08/03-kernel.txt
docs/development/work/K1.2-correction-01/validation-08/04-conformance.txt
docs/development/work/K1.2-correction-01/validation-08/05-sdk.txt
docs/development/work/K1.2-correction-01/validation-08/06-builder-docs.txt
docs/development/work/K1.2-correction-01/validation-08/07-original-ablations.txt
docs/development/work/K1.2-correction-01/validation-08/08-correction-ablations.txt
docs/development/work/K1.2-correction-01/validation-08/09-r11-probe.txt
docs/development/work/K1.2-correction-01/validation-08/10-records-links.txt
docs/development/work/K1.2-correction-01/validation-08/11-evals.txt
docs/development/work/K1.2-correction-01/validation-08/12-diff-check.txt.gz
docs/development/work/K1.2-correction-01/validation-08/13-results.json
docs/development/work/K1.2-correction-01/validation-08/14-original-ablations-adapted.txt
docs/development/work/K1.2-correction-01/validation-08/15-review-identity.txt
docs/development/work/K1.2-correction-01/validation-08/16-review-maxlen.txt
docs/development/work/K1.2-correction-01/validation-08/17-review-namespace.txt
docs/development/work/K1.2-correction-01/validation-08/18-diagnostics-maxlen.txt
docs/development/work/K1.2-correction-01/validation-08/19-round2-diff-check.txt.gz
docs/development/work/K1.2-correction-01/validation-08/20-review-aggregate.txt
docs/development/work/K1.2-correction-01/validation-08/21-review-equality.txt
docs/development/work/K1.2-correction-01/validation-08/22-correction-diff-check.txt.gz
docs/development/work/K1.2-correction-01/validation-08/23-review-cost-accept.txt
docs/development/work/K1.2-correction-01/validation-08/24-review-cost-refuse-undefined.txt
docs/development/work/K1.2-correction-01/validation-08/25-review-cost-refuse-ctor.txt
docs/development/work/K1.2-correction-01/validation-08/26-review-aggregate-pre-authority.txt
docs/development/work/K1.2-correction-01/validation-08/27-revision4-ablations.txt
docs/development/work/K1.2-correction-01/validation-08/28-review4-p4-p5.txt
docs/development/work/K1.2-correction-01/validation-08/29-round3-diff-check.txt.gz
docs/development/work/K1.2-correction-01/validation-08/30-review6-exact-ablations.txt
docs/development/work/K1.2-correction-01/validation-08/31-diagnostic-work-ablations.txt
docs/development/work/K1.2-correction-01/validation-08/32-review6-cost-and-blocker.txt
docs/development/work/K1.2-correction-01/validation-08/33-round4-diff-check.txt.gz
docs/development/work/K1.2-correction-01/validation-08/34-handler-direct-0.txt
docs/development/work/K1.2-correction-01/validation-08/34-handler-direct-1000.txt
docs/development/work/K1.2-correction-01/validation-08/34-handler-direct-10000.txt
docs/development/work/K1.2-correction-01/validation-08/34-handler-outcome-0.txt
docs/development/work/K1.2-correction-01/validation-08/34-handler-outcome-1000.txt
docs/development/work/K1.2-correction-01/validation-08/34-handler-outcome-10000.txt
docs/development/work/K1.2-correction-01/validation-08/35-string-work.txt
docs/development/work/K1.2-correction-01/validation-08/37-round6-ablations.txt
docs/development/work/K1.2-correction-01/validation-08/38-revision4-ablations-rebound.txt
docs/development/work/K1.2-correction-01/validation-08/39-review9-probe-history.txt
docs/development/work/K1.2-correction-01/validation-08/40-review9-probe-history-mutable.txt
docs/development/work/K1.2-correction-01/validation-08/41-review9-matrix.txt
docs/development/work/K1.2-correction-01/validation-08/42-review9-matrix-expect-correct.txt
docs/development/work/K1.2-correction-01/validation-08/43-host-members-probe.txt
docs/development/work/K1.2-correction-01/validation-08/44-claim-alias-search.txt
docs/development/work/K1.2-correction-01/validation-08/45-round6-diff-check.txt.gz
docs/development/work/K1.2-correction-01/validation-08/47-round7-ablations.txt
docs/development/work/K1.2-correction-01/validation-08/48-review10-enforcement-rebound.txt
docs/development/work/K1.2-correction-01/validation-08/49-new-oracles-and-name-probe-on-reviewed-H.txt
docs/development/work/K1.2-correction-01/validation-08/50-review10-probes-rerun.txt
docs/development/work/K1.2-correction-01/validation-08/51-round7-diff-check.txt.gz
docs/development/work/K1.2-correction-01/validation-08/52-fault-sweep.txt
docs/development/work/K1.2-correction-01/validation-08/53-poison-sweep.txt
docs/development/work/K1.2-correction-01/validation-08/54-zone-coverage-suite.txt
docs/development/work/K1.2-correction-01/validation-08/55-zone-coverage-suite-and-catalog.txt
docs/development/work/K1.2-correction-01/validation-08/56-sweep-negative-controls.txt
docs/development/work/K1.2-correction-01/validation-08/57-sweeps-on-reviewed-H.txt
docs/development/work/K1.2-correction-01/validation-08/58-round8-diff-check.txt
docs/development/work/K1.2-correction-01/validation-08/59-guard-claim-search.txt
docs/development/work/K1.2-correction-01/validation-08/MANIFEST.sha256
```

## Handoff

- **Ready for independent cumulative review** of B..H under contract revision 9.
- The external handoff supplies B, C, H and the verified remote SHA.
- No self-acceptance, integration, merge or successor release. Both invalidation holds stay under
  owner control.
