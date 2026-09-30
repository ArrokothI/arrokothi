# Implementation report — K1.2-correction-01, round 7 (contract revision 8)

Claude Code desktop, model `claude-opus-5-5`, 2026-09-29. The owner handed this correction to this
session with review 10's compact handoff. This session wrote no earlier review or report of this
packet; it is not the independent reviewer. [Owner note 10](owner-note-10.md) advised a different
implementation agent or an escalated enforcement design before another probe-and-patch round; the
owner's choice of implementer is recorded here, and this report records implementer work, not
acceptance.

## Identity

- **Packet and contract:** K1.2-correction-01, parent K1.2. [Contract revision 8](contract.md) records
  this round; [amendment 01](amendment-01.md), [amendment 02](amendment-02.md) and
  [decision-05](../K1.2/decision-05.md) still govern. V-D1 stays transferred to K1.1-correction-03:
  not implemented or certified here.
- **Governing process baseline B:** `a20d278185eaffc7f8b7489345a3624231ff6e6d`. 006, 008 and 012 are
  unchanged since B on this branch (`check-records.mjs`).
- **State:** WAITING_FOR_REVIEW, as an implementer assessment only.
- **Owner release and decisions:** release `6ed7d3a6e3d7190aae5bbdfcf10dd515a6b45abb`; decision records
  at `13a73ad9ad0662fe585d1453280c5ac3da4f79bb` (amendment 01, decision-05) and
  `60eebc24113eb834e5d88015ca2a196c95c60493` (amendment 02). Both invalidation holds remain.
- **Prerequisites:** unchanged (K1.1 and K1.1-correction-02 integrated, ancestors of B).
- **Branch:** `codex/k1.2-correction-01-activation-identity`; origin
  `https://github.com/ArrokothI/arrokothi.git`. The existing clean checkout already named this branch
  at `0efe0ba`; no checkout or other agent's worktree was switched. Forward commits only.
- **Commits:**
  - previous reviewed H: `35c6ba0277542236f21f95d695154fa0164feb96` (C
    `602ea3b3955f1aea935849e993ebfb66b64ebd5b`), [review 10](review-10.md), CHANGES REQUIRED;
  - review record (start of this round): `0efe0ba2ebb3fdde71ac8ab5b7a3ae048f5f5ac1`, local, one commit
    ahead of the remote branch when this round started;
  - **payload C: `58d9c5c50ff3561c9f7b719a84acfd0b0d5d4d9f`**;
  - **candidate H:** the commit containing this report. The external handoff gives its full SHA.
- **C..H:** only the allowlist at the end of this report.

## What review 10 found, and the mechanism chosen

Both findings are against the *enforcement* of correction DEC-8 and DEC-9, not their runtime
behaviour, which review 10 found correct. Round 6's rules were denylists over shapes their author
had in mind:

- **READ-01.** The scanner recognised dot and string-element access, a `BindingElement` read through
  its spelling, and `in`. Quoted and computed binding names and assignment destructuring are also
  reads of a member, and it saw none of them. Its model also assumed that a *required* declared
  member is owned. That holds for Kernel records built by literals, but not for members TypeScript's
  `lib` declares on built-in types (a built-in prototype supplies them), not for a member a type
  assertion makes required, and not for caller envelopes.
- **COMMIT-01.** The ordering rule located "the first mutation" by four callee names and property
  assignment. `this.#mint(...)` and `++` were not mutations to it, so it checked the wrong window,
  and both regressions passed all 1,331 Kernel tests.

Round 6 validated each rule only with probes and mutants of the forms it already recognised. The
correction ([coverage-07](coverage-07.md), written before the code) makes both rules closed-world:
what is permitted is enumerated, and everything else fails.

**DEC-8 (`ambient-reads.test.ts`, via `zone-analysis.ts` and `zone-inventory.ts`).**
- A TypeScript program over the 13 zone sources with the repository `tsconfig.json` (the round-6
  scanner used its own options, under which `Buffer` was `any`).
- *Permitted syntax:* every executable node kind, binary and prefix operator, and assignment target is
  in an allowlist taken from the zone's actual syntax. Destructuring of any form, the iteration
  protocol, `in`, `instanceof`, `==`/`!=`, `++`/`--`, `await`/`async`/generators, labels, `switch`,
  `super.x`, `arguments` and assignment patterns are failures by absence.
- *Every access classified:* declared optional, declared by no type (index signature or `any`),
  declared by `lib` and reached after module load (`length` of a list or string is own), computed on
  a non-list (dynamic) or a list (index), object spread, type assertions and predicates that
  introduce members or make an optional one required, implicit conversion of a possible object, `lib`
  globals read after load, and caller envelopes. A non-`caller` parameter of a public coordinator
  method may only be compared, tested or handed to a call; a call into zone code carries the rule
  into the callee's parameter.
- *Inventory:* every reported site must match `zone-inventory.ts` exactly: 54 entries, 71 sites, each
  with a reason. Guarded descriptor reads keep their `hasOwnValue` precondition (6 entries); 14 index
  entries have their loop bound checked mechanically; every `hostMember` key must name an optional
  member of its holder.
- *Trust boundary, stated in the contract:* declared types are trusted except where the source makes
  an unchecked claim. Assertions and predicates that introduce members or strengthen optionality are
  those claims and are classified. Casts of `unknown`/`any` to a primitive or list are runtime type
  claims backed by the capture discipline's `typeof`/`Array.isArray` checks. They introduce no member
  declarations and are outside the static rule.

**DEC-9 (`control-commits.test.ts`, via the effect analysis in `zone-analysis.ts`).**
- *Resolution:* every call resolves to zone code, a primordial classified in `PRIMORDIAL_EFFECTS`, or
  a foreign call inventoried by its whole spelling. There are four foreign calls: the Driver's
  delivery, the Driver's safety callback, a host accessor, and the serializer dependency. An
  unclassified call is a failure.
- *Effects:* a fixpoint over every zone function records which pre-existing objects its own code may
  mutate: any assignment operator, `delete`, a mutating primordial (`freeze`, `defineProperty`,
  `Map.set`, …), or a helper that mutates an argument.
  - Provenance is a set of atoms (fresh, a parameter's own object, anything reachable from a
    parameter, the receiver, a captured binding, unknown). It distinguishes an object's identity
    (for shallow writes) from what it reaches (for callees).
  - It follows values through aliases, containers, constructors, closures, callbacks, stores into
    fresh objects and hand-offs to foreign code.
  - It never trusts a static type to say a value holds no object: a Kernel list widened to `unknown`
    and cast to `string` is still that list.
  - The serializer environment's install-and-restore of built-in slots is the one declared override.
- *Controls:* each of `recoverExecution`, `reportProtocolFailure` and `requestTakeover` must end in an
  apply suffix of a fixed grammar: appends of prebuilt locals (or `applyControlCommit`), then plain
  writes of prebuilt locals, `null` or a local plus one, then the post-commit delivery, then `return`
  of a prebuilt local.
  - Before the suffix, nothing that can reach accepted state is mutated, except refusal exits
    (`return err(this.#refusal(…))`, and `#requireControl`/`#openExchange` in their exact
    call-then-exit form, whose own bodies mutate only inside such exits).
  - Every foreign call precedes the first value the suffix commits or returns.
  - Mutation of a control's own caller-supplied parameters is not accepted state and is not counted.
- *Helpers and writers:* `applyControlCommit` must be commit-field bindings, then appends, then plain
  writes of commit fields, with derived effects only on the record and exchange. Hold fields,
  recovery history, receipts and the acceptance index have fixed writers, found by field name (any
  access form, alias-resolved, or a define call naming it) and by list element type.
- *Self-checks:* the summaries must be identical when functions are analysed in reverse order. This
  check exposed, and now pins, a memoisation bug that I found while writing the negative controls
  (see "Semantic correction closure").

**Production.** None of the control code changed: it already had the enforced shape, so every sealed
ablation anchor still applies. The only executable production change is `SELF-R7-UNSUPPORTED-01`
(below). The `coordinator.ts` header comment no longer claims that the only remaining sites are
descriptor fields.

## Changes and coverage

**Production (C).**
- `unsupported.ts`: `name` is a class field (own data) instead of `this.name = …`.
- `coordinator.ts`: comment only (the enforcement description).

**Tests (C).**
- `zone-analysis.ts` (new module): program construction, permitted syntax, access classification,
  the caller-envelope rule, callee resolution, the effect analysis and the control checks.
- `zone-inventory.ts` (new module): the reasoned access inventory, the extra envelope seed
  (`acceptInputContent#0`, handed an observed value by an inventoried assertion), the foreign calls,
  the serializer override and the fixed writers.
- `ambient-reads.test.ts` (rewritten, 8 → 46 tests). Zone checks: typechecking, syntax, inventory,
  guards, loop bounds and `hostMember` keys. A runtime case for `SELF-R7-UNSUPPORTED-01`. 36
  negative-control probes, including review 10's six reads verbatim, each checked to be reported on
  its own line. A clean control.
- `control-commits.test.ts` (new, 42 tests):
  - the zone checks: resolution, three controls, pinned suffixes, the commit helper, writers,
    order-independence, the refusal helpers and the `occurrences` precondition;
  - 31 in-memory mutants of `coordinator.ts`, analysed by the same code, each required to be
    reported *for the reason it exists*, and each required to typecheck, so that only the rule can
    reject it;
  - a clean control.
- No other test file changes. The round-6 checks are subsumed:
  - "every optional, dynamic and `in` access is inventoried" → the inventory test;
  - the vacuity probe → the 36 probes;
  - the three ordering scans → the control checks;
  - the `applyControlCommit` scan → the commit-helper grammar;
  - the write-site scan → the writers test.

**Records and scripts (C).**
- [Contract revision 8](contract.md): the DEC-8 and DEC-9 enforcement bullets, a round-7 identity entry,
  four coverage rows (the revision-7 structural row is marked superseded) and the revision-8
  validation paragraph.
- [Coverage-07](coverage-07.md): the pre-code reconstruction. It is kept as written before the code;
  the forms added afterwards (see "Semantic correction closure") are recorded here, not back-edited
  there.
- `check-records.mjs`: the declared test files gain the new test and two modules. Review 09, report 06
  with validation 06, and review 10 with owner note 10 are pinned as sealed. Coverage-07 joins the
  link check.
- `validate.mjs`: entries 47–51.
- `ablations-07.mjs`: 28 full-suite mutants. Each must fail at least one *named rule test*, not only a
  behavioural test or an in-memory negative control whose anchors the mutant itself changed.
- `probe-enforcement-rebound-07.mjs`: verifies the sealed review-10 probe's SHA-256, takes its six
  reads and two regressions from the sealed text, and asserts the opposite result on this tree. The
  sealed probe cannot run here: it slices round 6's scanner out of the test, and it writes into
  `review-10/`.
- `probe-reviewed-h-07.mjs`: runs the new enforcement files, and the `Error.name` probe, against a
  disposable worktree of review 10's H.
- `probe-review10-rerun-07.mjs`: reruns review 10's whole-view and read-effects probes in a disposable
  worktree, because both write into `review-10/`.

**Layer 3 and implementation records (C).** BASELINE `#outcome-acceptance-api`: the ambient-reads and
recovery-control bullets now describe the enforcement actually checked. No concept or mechanism page
changes: no semantics changed.

**Selected 012 methods:** normative examination (DEC-8/9 text against the enforced rules);
deterministic execution (static analysis over pinned source, in-memory and full-suite mutants,
runtime probes); in-process fault/ambient injection (`Error.prototype.name` accessor);
process/documentation (records, sealed evidence, allowlist, links). **Exclusions:** native fidelity
(R1), process death (K3), external gates (K1.4), packaging (S1); the broader in-process threat model
(DESIGN-AUDIT-01); V-D1 (K1.1-correction-03).

**Obligation/interaction coverage.**

| Obligation / source | Distinguishing input | Expected facts / forbidden changes | Evidence and result |
|---|---|---|---|
| READ-01; DEC-8, C13 | review 10's six reads; 35 further probes of equivalent forms (see contract) | every form reported; the zone's 71 sites inventoried with reasons; clean probe reports nothing | `ambient-reads.test.ts` 46/46; rebound probe 6/6; R1–R12 rejected |
| COMMIT-01; DEC-9, C8–C10, C12 | review 10's two regressions; 29 further in-memory mutants | each reported for its reason; unmodified source clean; analysis order irrelevant | `control-commits.test.ts` 42/42; rebound probe 2/2; C1–C16 rejected |
| No-op, refusal, reentry paths of the three controls | duplicate report, no-change recovery, every refusal exit, Driver callback | no accepted-state mutation before exits; foreign calls before builds | control checks; mutants "refusal recorded without exiting", "untested helper", "helper mutating on its continuing path", "foreign code after build" |
| Behaviour unchanged | review 10's whole-view probe (30 comparisons) and full suites | identical answers and views | validation 50; full suites |
| SELF-R7-UNSUPPORTED-01; DEC-8, C13 | accessor on `Error.prototype.name` | receives nothing; error owns its name | runtime test; probe at H (defect) and C (fixed); R10 rejected |
| C1–C15, DEC-1–9 cumulative | every existing suite and runner | unchanged | validation table |

## Semantic correction closure

- **Invariant.** DEC-8: no ordinary access to a member its object may not own. DEC-9: the recovery
  controls build their whole decision before the first accepted-state mutation, and apply appends
  before plain writes. Neither rule changed. What was misunderstood was the *enforcement*: a check
  that recognises the shapes it knows is not a check of the invariant.
- **Dependents traced.**
  - For DEC-8: every node kind that can reach a member, including implicit ones (conversion,
    iteration, `then`, `super`) and type-level claims (assertions, predicates, index signatures,
    `lib` members, envelope parameter types).
  - For DEC-9: every mutation primitive, every helper through the fixpoint, every way to carry an
    object into an unrecognised position, and every way to hand one to code outside the zone.
  - The census and analysis cover all 13 zone sources, not only `coordinator.ts`.
- **Counterexamples added.** 36 DEC-8 probes; 31 in-memory and 28 full-suite DEC-9/DEC-8 mutants. I
  also red-teamed the analysis itself:
  - **Laundering** (before the first payload). A Kernel list widened to `unknown`, then cast to
    `string`, then mutated through a helper. With the analysis's former shortcut, "a primitive-typed
    value holds no object", it goes unreported (verified by reinstating the shortcut), so provenance
    is now purely structural.
  - After the first payload (`50e9ee9`, unpublished and never validated), three more gaps, fixed by
    amending it:
    - **Logical assignment.** A binding set by `??=` was treated as holding nothing. DEC-8 already
      rejects the operator; DEC-9 now stands on its own. Its negative control fails under the first
      payload's analysis (the mutant goes unreported) and passes now.
    - **Constructed object.** A constructor may keep its arguments. The first mutant was caught only
      through an imprecise path, so it was made a write that stores nothing. Its negative control
      fails under the first payload's analysis and passes now.
    - **Foreign hand-off.** An object handed to foreign code was not marked as possibly holding
      anything. It is now. No separate mutant exists: the foreign-call inventory's whole-spelling key
      already rejects any change to what foreign code is handed ("a Kernel object handed to foreign
      code").
- **A defect in the new analysis, found by its own negative control.** Binding provenance was
  memoised, but a result computed while a dependency cycle was cut (record ↔ exchange ↔ intent) was
  cached as if complete. So `exchange` in `reportProtocolFailure` could look fresh depending on
  traversal order, and a mutant writing a hold early was caught only by the writers rule. Now only
  results whose cycles close at themselves are cached. The order-independence test pins this: it
  fails if the old memoisation is restored.
- **Why round 6 missed both.** See "What review 10 found". The method change is closed-world rules plus
  negative controls built from *other* forms than the ones the rule was written against.
- **Whole-packet re-audit.** The cumulative diff B..C was re-examined for this round's reach. The
  production delta since review 10 is `unsupported.ts` and a comment. Accepted values, single
  observation, identities, ordering, diagnostics and V-D1's transfer are untouched. Every existing
  runner still applies unadapted (the round-6 H1–H22 anchors included) and is rerun in validation.

## Prior findings

- `K12C1-R10-READ-01` (P2): addressed on C by the closed-world DEC-8 enforcement above. Review 10's six
  forms are reported (maintained probe and rebound probe); R1–R12 are rejected by rule tests.
- `K12C1-R10-COMMIT-01` (P2): addressed on C by the DEC-9 effect analysis. Review 10's two regressions
  are reported in memory and rejected by the full suite (C1, C2, and the rebound probe), along with
  C3–C16.
- Earlier findings keep the dispositions in
  [review 10's reconciliation](review-10.md#reconciliation-with-submitted-evidence-and-earlier-findings),
  which carries review 09's. Their dependent mechanisms were re-checked in the whole-packet re-audit
  above; no disposition changes. Transferred cost findings stay open in K1.1-correction-03.
  SELF-R6-HOST-01–03 keep implementer provenance and their round-6 fixes.

## Additional self-found defects (implementer provenance)

- **SELF-R7-UNSUPPORTED-01 (P3-class, correction DEC-8/C13).** `UnsupportedKernelSurfaceError`'s
  constructor did `this.name = "UnsupportedKernelSurfaceError"`. `name` is a member only
  `Error.prototype` supplies, so the write was a `[[Set]]` that an accessor installed there (residue
  from earlier caller code) received.
  - At review 10's H the accessor received the string, and the thrown error owned no `name` and
    reported `"Error"`.
  - Now `name` is a class field, defined as own data.
  - Found by the new `lib`-member rule, confirmed by `probe-reviewed-h-07.mjs` at H and C. No accepted
    state or evidence is affected; only the refusal the host receives.
  - Severity is the implementer's assessment; the reviewer decides.
- **Not a runtime defect: `values.ts` `(entry as { occurrences: number }).occurrences += 1`.** A cast
  hid an optional member from round 6's scanner. It is safe, because only `pushIssue` appends to
  those lists and every entry at index ≥ 8 owns `occurrences`. It is now inventoried as an
  optionality-strengthening assertion, and the precondition is checked (`control-commits.test.ts`).

**Unresolved obligations:** none known in scope.

## Observations for the reviewer

- **O1.** The static DEC-8 rule's trust boundary is stated in the contract. The zone has 35 type
  assertions from `unknown`/`any`. The 2 that introduce named members (the null-prototype descriptor
  builders) are inventoried. The other 33 narrow to primitives, lists, `object`, a type parameter or
  `BoundaryValue`, and are runtime type claims backed by `typeof`/`Array.isArray`/capture checks. The
  analysis does not prove that each such cast is dominated by its check.
- **O2.** DEC-9 excludes mutation of a control's own caller-supplied parameters from the ordering rule,
  because they are not accepted state. The analysis over-approximates capture functions as possibly
  mutating their inputs, so counting them would reject the current code without a real defect.
- **O3.** The effect analysis counts foreign code as possibly running anything, and pins what each
  foreign call is handed by its whole spelling. It does not model frozenness: the Driver is handed
  frozen objects, and that is argued in the inventory reasons, not checked.
- **O4.** The in-memory DEC-9 negative controls anchor on `coordinator.ts` text. A full-suite mutant
  that changes those spans also fails them, which inflates failure counts. `ablations-07.mjs` therefore
  requires a *rule* test to fail and prints rule failures separately.
- **O5.** Engine exhaustion between an index advance and its record, in `#refusal` and in
  ingress/dispatch `#mint`, remains outside this in-memory packet's claim. This is implementation 06's
  O4, unchanged. The DEC-9 checks cover the three recovery controls, as the contract states.
- **O6.** `zone-analysis.ts` is a large test module (≈1,600 lines). Its soundness claims are narrower
  than a general JavaScript analysis: it covers the zone's permitted syntax, which DEC-8 enforces.

## Validation and interpretation

The validation ran sequentially on clean C `58d9c5c50ff3561c9f7b719a84acfd0b0d5d4d9f`:
`node docs/development/work/K1.2-correction-01/validate.mjs <scratch dir>`, from the repository root,
with no manual additions. The outputs are attached under `validation-07/`.

The environment is Node v25.2.1, npm 11.6.2, TypeScript 5.9.3, Darwin arm64
([00-environment.json](validation-07/00-environment.json)). [13-results.json](validation-07/13-results.json) records
every command, exit code and timestamp, and records the tree as clean after the run.
[MANIFEST.sha256](validation-07/MANIFEST.sha256) covers the 55 other attachments; its own SHA-256 is
`86f7103c9382a7fc98b6feec887b86755cc436ca42621e1682f375bf7760019d`.

| Command / raw output | Exit | Observation |
|---|---:|---|
| [01-typecheck](validation-07/01-typecheck.txt) | 0 | TypeScript passed |
| [02-full](validation-07/02-full.txt) | 0 | 3,465/3,465; 0 failed/cancelled/skipped/todo (round 6: 3,385; +88 enforcement tests, −8 retired) |
| [03-kernel](validation-07/03-kernel.txt) | 0 | 1,411/1,411 |
| [04-conformance](validation-07/04-conformance.txt) | 0 | 1,945/1,945 |
| [05-sdk](validation-07/05-sdk.txt) | 0 | 22/22 |
| [06-builder-docs](validation-07/06-builder-docs.txt) | 0 | 72 files; 1,846 links/anchors; 38 imports |
| [07-original-ablations](validation-07/07-original-ablations.txt) | 1 | Control 1,411/1,411; 32/36; B6/B12/B13/B14 NOT APPLICABLE (the disclosed anchor drift, as in rounds 2–6) |
| [08-correction-ablations](validation-07/08-correction-ablations.txt) | 0 | 67/67 rejected |
| [09-r11-probe](validation-07/09-r11-probe.txt) | 0 | 8/8 `stale_exchange` |
| [10-records-links](validation-07/10-records-links.txt) | 0 | Ancestry, sealed records (now including review 09, report 06 and review 10); 25 files, 707 links/anchors |
| [11-evals](validation-07/11-evals.txt) | 0 | 12/12 |
| [14-original-ablations-adapted](validation-07/14-original-ablations-adapted.txt) | 0 | Control 1,411/1,411; 36/36 rejected |
| [15](validation-07/15-review-identity.txt)–[18](validation-07/18-diagnostics-maxlen.txt), [20](validation-07/20-review-aggregate.txt), [21](validation-07/21-review-equality.txt), [26](validation-07/26-review-aggregate-pre-authority.txt) review-01/02 probes | 0 | As in implementation 06 |
| [23](validation-07/23-review-cost-accept.txt)–[25](validation-07/25-review-cost-refuse-ctor.txt), [28](validation-07/28-review4-p4-p5.txt), [32](validation-07/32-review6-cost-and-blocker.txt), 34 (six handler runs), [35](validation-07/35-string-work.txt) | 0 | Cost and timing are observations only (V-D1 transferred); count and logical assertions pass |
| [27-revision4-ablations](validation-07/27-revision4-ablations.txt) | 1 | Unchanged round-3 runner: control 35/35, X8–X11 rejected, then stops at X12's unique-anchor assertion (span removed in round 6; disclosed) |
| [38-revision4-ablations-rebound](validation-07/38-revision4-ablations-rebound.txt) | 1 | Round 6's rebinding adapter: 20/21; V5 is the disclosed equivalent survivor |
| [30-review6-exact-ablations](validation-07/30-review6-exact-ablations.txt) | 0 | Control 1,411/1,411; Z1–Z16 rejected |
| [31-diagnostic-work-ablations](validation-07/31-diagnostic-work-ablations.txt) | 0 | T1–T4 rejected |
| [37-round6-ablations](validation-07/37-round6-ablations.txt) | 0 | Control 1,411/1,411; H1–H22 rejected (22/22); every round-6 anchor still applies |
| [39](validation-07/39-review9-probe-history.txt), [40](validation-07/40-review9-probe-history-mutable.txt) | 1 | Review 09's reproducers still fail at their first assertion because the defect does not reproduce (as in round 6) |
| [41](validation-07/41-review9-matrix.txt), [42](validation-07/42-review9-matrix-expect-correct.txt) | 0 | 22 cases; `--expect-correct` 0 violations |
| [43-host-members-probe](validation-07/43-host-members-probe.txt) | 0 | Start source reproduces SELF-R6-HOST-01–03; current source refuses all three |
| [44-claim-alias-search](validation-07/44-claim-alias-search.txt) | 0 | Same hits as round 6, except review 10's own 007 row; no new claim text |
| **[47-round7-ablations](validation-07/47-round7-ablations.txt)** | 0 | Control 1,411/1,411; **28/28** (R1–R12, C1–C16), each failing a named rule test, printed per mutant |
| **[48-review10-enforcement-rebound](validation-07/48-review10-enforcement-rebound.txt)** | 0 | Sealed probe SHA-256 verified; **6/6** forms reported (sealed at H: 3/6); **2/2** regressions rejected with the takeover rule test failing (sealed at H: both passed 1,331/1,331) |
| **[49-new-oracles-and-name-probe-on-reviewed-H](validation-07/49-new-oracles-and-name-probe-on-reviewed-H.txt)** | 0 | At H the new files fail only the inventory (unsupported.ts `this.name`) and the SELF-R7 runtime case; DEC-9 checks pass at H, whose ordering was correct. Name probe: at H the accessor receives the write and the error reports `Error`; on C the error owns its name |
| **[50-review10-probes-rerun](validation-07/50-review10-probes-rerun.txt)** | 0 | Review 10's whole-view probe 30/30 on C, results **byte-identical** to review 10's recorded file at H (SHA-256 `bb2763cc…`); read-effects 6/6 inherited reads in its standalone snippet, zone inventory 1,067 sites (1,068 at H: `this.name` removed); repository unchanged |
| [51-round7-diff-check](validation-07/51-round7-diff-check.txt) | 0 | `0efe0ba..C` whitespace-clean: this round's whole payload |
| [45](validation-07/45-round6-diff-check.txt), [33](validation-07/33-round4-diff-check.txt), [29](validation-07/29-round3-diff-check.txt), [22](validation-07/22-correction-diff-check.txt), [19](validation-07/19-round2-diff-check.txt), [12](validation-07/12-diff-check.txt) historical-range diff checks | 2 | Only whitespace quoted inside sealed earlier validation/review attachments |

The collector exits 1 because it keeps the disclosed exits above; the nonzero set is the same as in
round 6. No command timed out, was killed by a signal, or failed to load.

**Checks not run, and limits.**
- Node 22 was not run.
- Cost and timing probes are observations only.
- The first payload `50e9ee9` was never validated: its validation run was stopped when the three gaps
  listed under "Semantic correction closure" were found, and it was amended before any evidence was kept.
- The static rules are shown only against the forms their negative controls exercise and within the
  zone's permitted syntax; no exhaustive proof over all JavaScript is claimed (O6).

**Why the evidence supports each criterion (implementer assessment, not acceptance).**
- **DEC-8 / C13 (READ-01):** review 10's six forms are reported (maintained probe and entry 48). 35
  other equivalent forms are reported. The real zone's sites are all inventoried with reasons.
  Twelve full-suite mutants that introduce such reads into real zone code are rejected by rule tests
  (47).
- **DEC-9 / C8–C10, C12 (COMMIT-01):** review 10's two regressions are rejected in memory, by the full
  suite (47) and by the rebound probe (48). 29 other in-memory mutants and 14 other full-suite mutants
  are rejected, each for its reason. The unmodified source is clean, and the analysis is
  order-independent.
- **Behaviour unchanged:** full suites; entry 50's byte-identical whole-view observations; every
  earlier runner rejects as before.
- **Every other criterion:** unchanged suites and runners pass or reject as in round 6.

**Design choices, amendments, assumptions and strongest remaining risk.**
- Amendment 02 authorizes the one production change (same mechanism). The control code is unchanged.
- The enforcement's grammar for apply suffixes and its syntax allowlist are deliberately narrow. A
  future legitimate change of shape must update them in a reviewed change; that is the intended cost
  of closed-world rules.
- **Strongest risk:** the analysis is large and new. Its soundness rests on the permitted syntax and on
  its own negative controls. A reviewer may find a form that neither DEC-8's allowlist nor the effect
  analysis models. The order-independence check and the old-analysis controls in "Semantic
  correction closure" are the evidence against the failure modes already met.
- **Second risk:** the trust boundary O1 (casts of `unknown` to primitives) is stated rather than
  enforced.

**Third-party use:** none new. The TypeScript compiler API is the repository's existing development
dependency, already used by round 6's test and `tests/conformance/architecture/module-graph.ts`.

## Exact C..H administrative allowlist

```text
docs/development/007-work-packets.md
docs/development/work/K1.2-correction-01/implementation-07.md
docs/development/work/K1.2-correction-01/validation-07/00-environment.json
docs/development/work/K1.2-correction-01/validation-07/01-typecheck.txt
docs/development/work/K1.2-correction-01/validation-07/02-full.txt
docs/development/work/K1.2-correction-01/validation-07/03-kernel.txt
docs/development/work/K1.2-correction-01/validation-07/04-conformance.txt
docs/development/work/K1.2-correction-01/validation-07/05-sdk.txt
docs/development/work/K1.2-correction-01/validation-07/06-builder-docs.txt
docs/development/work/K1.2-correction-01/validation-07/07-original-ablations.txt
docs/development/work/K1.2-correction-01/validation-07/08-correction-ablations.txt
docs/development/work/K1.2-correction-01/validation-07/09-r11-probe.txt
docs/development/work/K1.2-correction-01/validation-07/10-records-links.txt
docs/development/work/K1.2-correction-01/validation-07/11-evals.txt
docs/development/work/K1.2-correction-01/validation-07/12-diff-check.txt
docs/development/work/K1.2-correction-01/validation-07/13-results.json
docs/development/work/K1.2-correction-01/validation-07/14-original-ablations-adapted.txt
docs/development/work/K1.2-correction-01/validation-07/15-review-identity.txt
docs/development/work/K1.2-correction-01/validation-07/16-review-maxlen.txt
docs/development/work/K1.2-correction-01/validation-07/17-review-namespace.txt
docs/development/work/K1.2-correction-01/validation-07/18-diagnostics-maxlen.txt
docs/development/work/K1.2-correction-01/validation-07/19-round2-diff-check.txt
docs/development/work/K1.2-correction-01/validation-07/20-review-aggregate.txt
docs/development/work/K1.2-correction-01/validation-07/21-review-equality.txt
docs/development/work/K1.2-correction-01/validation-07/22-correction-diff-check.txt
docs/development/work/K1.2-correction-01/validation-07/23-review-cost-accept.txt
docs/development/work/K1.2-correction-01/validation-07/24-review-cost-refuse-undefined.txt
docs/development/work/K1.2-correction-01/validation-07/25-review-cost-refuse-ctor.txt
docs/development/work/K1.2-correction-01/validation-07/26-review-aggregate-pre-authority.txt
docs/development/work/K1.2-correction-01/validation-07/27-revision4-ablations.txt
docs/development/work/K1.2-correction-01/validation-07/28-review4-p4-p5.txt
docs/development/work/K1.2-correction-01/validation-07/29-round3-diff-check.txt
docs/development/work/K1.2-correction-01/validation-07/30-review6-exact-ablations.txt
docs/development/work/K1.2-correction-01/validation-07/31-diagnostic-work-ablations.txt
docs/development/work/K1.2-correction-01/validation-07/32-review6-cost-and-blocker.txt
docs/development/work/K1.2-correction-01/validation-07/33-round4-diff-check.txt
docs/development/work/K1.2-correction-01/validation-07/34-handler-direct-0.txt
docs/development/work/K1.2-correction-01/validation-07/34-handler-direct-1000.txt
docs/development/work/K1.2-correction-01/validation-07/34-handler-direct-10000.txt
docs/development/work/K1.2-correction-01/validation-07/34-handler-outcome-0.txt
docs/development/work/K1.2-correction-01/validation-07/34-handler-outcome-1000.txt
docs/development/work/K1.2-correction-01/validation-07/34-handler-outcome-10000.txt
docs/development/work/K1.2-correction-01/validation-07/35-string-work.txt
docs/development/work/K1.2-correction-01/validation-07/37-round6-ablations.txt
docs/development/work/K1.2-correction-01/validation-07/38-revision4-ablations-rebound.txt
docs/development/work/K1.2-correction-01/validation-07/39-review9-probe-history.txt
docs/development/work/K1.2-correction-01/validation-07/40-review9-probe-history-mutable.txt
docs/development/work/K1.2-correction-01/validation-07/41-review9-matrix.txt
docs/development/work/K1.2-correction-01/validation-07/42-review9-matrix-expect-correct.txt
docs/development/work/K1.2-correction-01/validation-07/43-host-members-probe.txt
docs/development/work/K1.2-correction-01/validation-07/44-claim-alias-search.txt
docs/development/work/K1.2-correction-01/validation-07/45-round6-diff-check.txt
docs/development/work/K1.2-correction-01/validation-07/47-round7-ablations.txt
docs/development/work/K1.2-correction-01/validation-07/48-review10-enforcement-rebound.txt
docs/development/work/K1.2-correction-01/validation-07/49-new-oracles-and-name-probe-on-reviewed-H.txt
docs/development/work/K1.2-correction-01/validation-07/50-review10-probes-rerun.txt
docs/development/work/K1.2-correction-01/validation-07/51-round7-diff-check.txt
docs/development/work/K1.2-correction-01/validation-07/MANIFEST.sha256
```

## Handoff

- **Ready for independent cumulative review** of B..H under contract revision 8.
- The external handoff supplies B, C, H and the verified remote SHA.
- No self-acceptance, integration, merge or successor release. Both invalidation holds stay under
  owner control.
