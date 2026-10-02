# Design 04 — TOOLS-01 grouped counterexamples and verified suite targets

**Date:** 2026-10-02. **Role:** Codex implementer under 006.
**Status:** proposal awaiting owner approval; no revision-3 implementation or P1 mapping.

Recommend separating the complete origin inventory from a registry of distinct counterexamples.
Each counterexample carries its input, required result and claim attribution once. Origins link
to those records. Suite destinations name exact tests and source-bound input/assertion relations;
mutation runners expand into individually accounted registry members. Existing mappings receive
no grandfathered revision-3 credit.

## Identity, authority and scope

Fetch confirmed clean branch `codex/tools-01`, with local and origin both at
`c450d8a02fd55c73a9b48861b73a66e3b55c3760`. This note's parent is that commit. The owner
explicitly requested this proposal, a commit and non-force push, then a stop for approval.
The pilot `72b334e1afde391da4045f2ba42f2b00a64e8ecc` and its independent review at the
starting head remain unchanged. Neither supplies mapping or acceptance credit.

The live [contract](contract.md) stays at revision 2 until approval. Its governing 006/008/012
baseline remains `b759d0abc01915ea5abc94b4607c6f9101bbbcc7`; this proposal cannot relax its own
review. This is development evidence tooling. It changes no Kernel, Runtime/Driver or deployment
semantics. [Evidence attribution](../../../../mental-model/mechanisms/evidence.md) remains the
canonical owner. No production, hostile-suite, analyzer, Layer-3, sealed-record or 007 edit is
proposed. A maintained adapter under `tests/tooling/` can exercise existing sources without
editing them. A needed semantic correction goes to its owner.

Read AGENTS.md, the whole-system model and reference index, development front door, implemented
baseline and roadmap; 006, 008's design-note fields and 012's finishable-criteria/corpus rules;
the contract, designs 02–03, owner choice 01, continuation 01, pilot and pilot review, tooling
README, and DESIGN-AUDIT-01 decisions 01–02. Read the research map's evidence-tooling section,
strict-validator testing section and Problem 2. Those reports provide background, not authority.

## Mechanism behind the gap

At the starting head, `scripts/packet_tools.py`'s `corpus` validates the origin set, nonempty
rationales, case/suite IDs, suite file existence and scheduled commands/profiles. It never reads
a named test from a mapping: the format has none. A whole-file target can therefore survive
removal of the only relevant assertion. Conversely, repeated prose mentions require repeated
classification even when they describe one input and one obligation. These are design-02
limitations, not defects that more prose in 1,395 rows will fix.

Source checks for this proposal used `git show` at the inventory's exact revisions. The pilot's
lists were leads only. For its first ten origins, all pin
`66bc041175e6fc191c2e7cf88de198111e7d97c9`:

| Source under `docs/development/work/` | Rechecked facts and consequence |
|---|---|
| `K1.1-correction-02/measure-probe.mjs`; `review-01.md:58` | Script has three ASCII lengths, 1,048,576 / 8,388,608 / 33,554,432, and a 550,000-member Proxy. The fence repeats the third string; surrounding review adds a 17,000-member descriptor case. These make five input variants across the source context, not nine new tests. Historical bad read counts are observations, not regression expectations. V-D1/Proxy attribution is held. |
| `K1.2-correction-01/ablations-03-rebound-06.mjs` | Executes the entire 21-member round-3 family after rebinding four members, X12/X18/X19/X20. Its extraction must account for 21 members, including 17 inherited definitions. Counting only four loses the runner's actual membership. |
| `ablations-03.mjs` | 16 sealed X8–X23 definitions plus V1–V5 = 21. Read the referenced `review-04/reviewer-ablations.mjs` and verified its declared SHA-256. |
| `ablations-04.mjs` | Z1–Z16 = 16; read `review-06/mutants.py` and verified its declared SHA-256. That dependency also contains W1–W8, outside this runner's selection and still part of its own origin. |
| `ablations-06.mjs`; `ablations-07.mjs` | H1–H22 = 22; R1–R12 plus C1–C16 = 28, some with multiple edits. `RULE_TESTS` has 18 names. C13/C14 explicitly repeat H7/H3; selection of an enforcement oracle remains an additional obligation. |
| `ablations.mjs` | Exactly 67: I1–I7, 31 renderer sites, D31–D34, 11 R members, G1–G14. The generated renderer labels are D35 and D1–D30. Recounted the generator's regex over the pinned coordinator/outcome source: 30 + 1 matches. Current-source generation must not silently replace that historical membership. |
| `check-records.mjs` | Read all 88 lines: ancestry, preserved bytes/slices, declared changed files and local links. No Kernel input/result scenario. Proposed later disposition is `non_executable / historical_command`, with its own rationale. No mapping changes in this note. |
| `diagnostic-ablations-04.mjs` | Four members T1–T4. T1 reads an older `describe` implementation at a separately pinned revision; extraction must include that dependency. |

These seven runners have **179 runner-member occurrences** (21+21+16+22+28+67+4), not
179 distinct faults or demonstrated kills. Seventeen occurrences are inherited unchanged by
the rebound runner; four are changed historical anchors for the same named faults. Further
equivalences need source review. No historical runner was executed for this proposal.

### Historical defect → required-result test

For an unchanged contract, preserve the historical input and test the **required corrected
result**, never the old defective observation. Record both, in different fields. A nearby size,
similar topic or green whole file does not establish the same input/result relation. For example,
the current `value-diagnostic-work.test.ts` test titled
`V-D1 UTF-16 preflight: huge values and names do zero character reads and keep full byte charges`
uses 16,777,216 `x` characters. It is not an exact-input mapping of the historical 33,554,432
`a` characters. This proposal requires an exact stored case for that input; it does not add an
automatic size-equivalence rule. Its V-D1 relation remains held even if a concrete observation passes.

Existing precedent: `artifact-b06e44e7a30c0b735cf084aa`, pinned to
`9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49:docs/development/work/K1.1-correction-01/blocker-01.md:76`.
The source is the rejected Promise with a non-configurable throwing own constructor. Read that
source and KC1-ARCH-1 `decision-01.md` at the same revision. The decision explicitly retires the
Promise-return API and prohibits treating an unhandled rejection as a passing oracle. Its current
mapping appropriately points to replacement delivery obligations. Verified these exact titles in
`packages/kernel/tests/dispatch.test.ts`:

- `Promise independence: hostile ambient constructor/species slots change nothing`
- `return misuse: an inert hostile return is never observed; the attempt stays pending`
- `Driver-internal asynchronous failure reports with zero unhandled (strict subprocess)`

The second asserts `thenCalls === 0` and a pending delivery; the third asserts zero unhandled
events. This is an **explicitly authorized contract replacement**, not same-input equivalence.
Revision 3 records the retired witness as superseded, with KC1-ARCH-1 attribution and zero suite
credit. Separate active replacement counterexamples may target these three tests. They retain
a `replaces` link to the historical witness and the decision. Thus this precedent supports the
corrected-result rule without implying the old Promise was made safe or that every superseded
witness can be credited as current conformance.

## Exact proposed contract amendment

The following unified diff is against the starting head's `contract.md`. It is embedded for
approval and has **not** been applied. Designs 02–03 otherwise continue to govern; the new
grouping, target checks and held/superseded attribution below replace their conflicting mapping
language. Historical notes remain as written.

```diff
--- a/docs/development/work/TOOLS-01/contract.md
+++ b/docs/development/work/TOOLS-01/contract.md
@@ -1,4 +1,4 @@
-# TOOLS-01 contract — revision 2
+# TOOLS-01 contract — revision 3

 [Release](release-01.md) authorizes the research-independent foundation first. Governing policy:
 006/008/012 at `b759d0abc01915ea5abc94b4607c6f9101bbbcc7`; proposed tools cannot weaken their
@@ -11,13 +11,30 @@
 | ID | Requirement | Closing evidence |
 |---|---|---|
 | F1 | Validate exact Git commit identities, B→C→H ancestry and C..H's exact declared file set; preserve declared historical paths; verify accessible attachment bytes/digests. Read the verification specification from C. | Temporary Git fixtures for valid and wrong identity, ancestry, scope, sealed bytes and evidence; real candidate run at handover. Report structural facts only, never ACCEPT or release. |
-| F2 | Index every pinned audit artifact/fence and prose locator; verify source bytes and retain stable provenance IDs, proposed dispositions and extraction status. Include final-review executable intake and its policy-only item. | Recompute 208 source digests and 1,333 prose locations; missing/duplicate/corrupt mappings fail. Pending records remain counted as pending. This is provenance coverage, not executable adoption. |
-| F3 | Provide a versioned case/mutation registry and isolated runner with a passing control, unique mutation-site check, reached witness and named assertion. | Real injective-identity mutant plus controls for survived, uncovered, invalid baseline, not applicable, setup error, timeout and malformed result. No process exit alone earns a kill. |
+| F2 | Preserve the complete pinned origin inventory and stable provenance IDs; group semantic adoption by distinct counterexample with explicit origin/member links. Include all final-review additions. | Recompute 208 artifact/fence digests, 1,333 prose locations and eight additions; exact-set checks reject missing, duplicate, corrupt or dangling origin/member links. Pending extraction and revalidation remain visible. Provenance completeness is not executable adoption. |
+| F3 | Provide a versioned case/mutation registry and isolated runner with exact family membership, a passing control, uniquely applicable edits, reached witness and named qualifying assertion. | Existing injective-identity/oracle controls plus family, multi-edit and wrong-kill controls. Preserve survived, uncovered, invalid baseline, not applicable, setup error, timeout and malformed-result categories. No process exit, reading argument or family count earns a kill. |
 | F4 | Keep runner changes in temporary source copies; preserve candidate files and isolate each process. Bound execution duration and retained output. | Candidate hash checks and deliberate hanging/noisy/failed fixtures; interrupted or failed mutation cannot patch the shared checkout. Supported host: POSIX with Python 3 and Node 22.9+. |
-| F5 | Keep release/status/results distinct; one CLI reports facts, explicit limits and unresolved work. | JSON summaries; pending-extraction inventory cannot produce full-corpus completion. Tests assert the distinction. |
+| F5 | Keep provenance, semantic mappings, target verification, execution, held claims and acceptance distinct; report facts, limits and unresolved work. | JSON summaries with separate origin/counterexample/family/member/target/kill counts. Pending extraction or revalidation blocks mapping completion; held reproduction and source/title checks never release a claim or establish acceptance. |
 | F6 | Document use, corpus migration obligations, validation and an outside-repository handover; no new third-party material. | Source/link checks, tests, exact local commits and clean checkout at handover. No Layer-3 edits: no semantic rule changes. |
-| P1 | Reconcile the whole historical inventory into maintained runnable cases, existing-suite mappings, justified duplicates/retired runners, or explicit non-executable evidence; preserve the complete-decision oracle and its controls. | Per-entry semantic mapping, runnable fixtures and causal mutations; every still-pending entry closes. Held semantic defects stay attributed to their correction owners. Mandatory remainder after this build. |
+| P1 | Reconcile every historical origin through distinct counterexamples, structured suite targets, registered cases/mutations, attributed held/superseded witnesses or justified non-executable evidence. Preserve the complete-decision oracle and controls. | P1-G/T/H/M/R/C below close by exact checks, structural attribution and a declared bounded source review. No pending origin, member or revalidation remains. Full packet obligation, not a foundation acceptance gate. |
 | P2 | Complete the per-packet verification composition and current-profile corpus integration, negative controls for its own oracles, cumulative self-review and independent acceptance. | Clean-C verification of the completed packet, exact C/H and independent review under 006. Mandatory remainder; research may inform integration choices but does not waive it. |
+
+## P1 closing rules
+
+The implementation mechanism and migration are specified in [design 04](design-04.md). Adoption
+format version 2 is distinct from this contract revision. The bounded semantic review covers all
+1,549 pinned origins, their cited source contexts and explicitly referenced input/mutation
+sources, then each chosen test’s input/helper/assertion closure. It claims nothing about unindexed
+history or arbitrary JavaScript. Every extracted member has an explicit disposition.
+
+| ID | Rule | Closing mechanism |
+|---|---|---|
+| P1-G | Group repeated mentions of the same input, environment, operation and required result; preserve distinct variants and all origin/member provenance. | Exact inventory/member-set reconciliation plus the bounded source review above. An origin referencing several members closes only when all are accounted for; pending cannot disappear through grouping. |
+| P1-T | Every suite target names its candidate file, exact unique leaf test title, concrete input and required-result relation, and source-bound setup/assertion references. For the same contract, test the corrected required result, never the old defective observation. A changed contract requires an explicit replacing decision and separate replacement records. | Corpus at C checks exact source bindings and fresh deterministic native test-title/results in bounded temporary copies. The bounded review judges semantic linkage and oracle adequacy. File existence, prose rationale, similar input or title existence alone is insufficient. |
+| P1-H | Held or superseded required results are attributed witness/case records, never suite credit. Retain V-D1, Proxy and re-prototyped built-in attribution to K1.1-correction-03, and V-ENV to BINDING-01. | Structural destination/claim validation, owner/decision locators and explicit observed-versus-required results; the bounded source review checks classification. Witness reproduction/observation-check kills give no conformance, correction or hold-release credit. Authorized historical retirement retains its witness and replacement links without current executable credit. |
+| P1-M | Each mutation-runner family declares all N historical members and maps each to registered edits, a named rejecting case/assertion or an explicit pending/justified reading disposition. | Exact family-set checks and fresh passing control, applicable edits, reached witness and qualifying named assertion for each current kill. Distinct mutations, case/mutation pairs and family references are counted separately. Reading, stale sites and invalid runs never count as kills; unresolved non-equivalent survivors require attribution or an owner decision. |
+| P1-R | Revalidate all existing 116 suite and eight case mappings; recheck the 30 non-executable dispositions. No grandfathering. Preserve all 1,395 currently pending origins. | Exact reconciliation against the revision-2 manifest at c450d8a02fd55c73a9b48861b73a66e3b55c3760, bounded relation review and fresh target/control checks. Unconverted rows remain pending_revalidation. |
+| P1-C | Keep adoption closure separate from execution and independent acceptance; retain all separately profiled commands and not-run status under owner choice 01. | Negative summary/composition controls for pending origins/members, missing targets, stale results and held/profile credit. Adoption of an attributed held witness or separately profiled case does not claim corrected behavior or execution. |

 Foundation F1–F6 is an incremental delivery within TOOLS-01, not a new acceptance gate or a split
 that silently defers P1/P2. The full packet stays IN_PROGRESS. No semantic benchmark credit or
```

## Proposed data model

Use adoption format **version 2** (distinct from contract revision 3). Keep the inventory and
all 1,549 existing origin IDs/digests unchanged. Maintain these tables in `adoption.json`:

| Table | Required fields and invariant |
|---|---|
| `origins` | One row per inventory ID. `extraction` (`pending` or `complete`), source-context locators, explicit member links and/or justified non-executable parts. A complete mixed origin accounts for every extracted input/mutant and each non-executable remainder. No filename classification or duplicate-of-origin chain can close it. |
| `counterexamples` | Stable readable `id`; `kind` (`behavior`, `mutation`, `held_witness` or `superseded_witness`); concrete input/recipe and environment/access/stage; `historical_observation` if applicable; `required_result` plus authority locator; claim IDs; destinations; source-member provenance. A content fingerprint detects accidental identity conflicts. It is not a semantic-equivalence proof. |
| `suite_targets` | Unique ID, candidate-relative `file`, exact leaf `test_title`, declaration/source anchors, input binding, expected predicates with assertion anchors, declared command/profile and title-catalog run. No wildcard, prefix, substring or file-only target. |
| `families` | Named runner/family, pinned source/dependency locators and digests, exact ordered historical member list, `declared_count`, and each member's counterexample/registry destination or explicit pending/reading disposition. A family is a grouping convenience, never a single test or kill. |
| `holds` | Claim ID, owner, decision/invalidation locators and reason. Cases reference these records; held/superseded records cannot use a suite destination. |
| `migration` | Original format/source commit and old-row disposition for all 154 previously mapped origins. Unreviewed conversions remain `pending_revalidation`; the old rationale is retained as provenance. |

An origin may name several counterexamples and several origins may name the same counterexample.
Grouping requires the same input construction, relevant environment, operation/schedule and
required observable result under the same authority. Share equivalent prose references directly;
do not create transitive duplicate chains. A new input length, different mutation site, different
assertion obligation or different hold attribution is a distinct variant unless an explicit
owner-authorized contract replacement applies. Families can share fixtures without collapsing
their variants. Conflicting historical/current expectations are recorded, not silently merged.

Every link has a source-context range and member label, including references found only in prose.
For a fence, distinguish what is in the fence from what surrounding prose contributes. Extraction
records list all members found by reading that finite source context and its explicitly named
dependencies. The tool verifies locators, digests, references and exact membership equality.
Humans still judge whether extraction missed a distinct obligation.

### Structured suite target and what the tool can prove

A target contains:

```text
file, test_title, declaration_anchor
input: { recipe_or_values, source_refs[], environment, operation }
expected: [{ subject, predicate, value_or_recipe, assertion_refs[] }]
relation: { counterexample_id, mode: exact_input | authorized_replacement,
            authority_ref, explanation }
source_refs/assertion_refs: { file, exact_anchor, sha256, role }
command, profile, catalog_run
```

`required_result` is a finite list of named observables. Each target names the observable IDs it
covers, uses the counterexample's stored input by reference, and binds each expected predicate to
the corresponding stored required result. The validator rejects a differing input/expected value,
an unknown observable or an uncovered required observable across the destination set. For an
authorized replacement it instead resolves a separate active counterexample and its decision;
it never overwrites the historical record. Predicates are data (for example equality, ordered
equality or an explicit bound), not expressions the validator evaluates as JavaScript.

Recipes preserve exact literals/bytes and construction steps, not a seed alone. Source references
pin the test declaration, setup, helpers/fixture tables and assertions used in the relation.
Each anchor must occur exactly once at C; its digest must agree. An assertion reference includes
the exact assertion text and any referenced expected-data fragment. Dynamic cases additionally
name their concrete parameter row. A digest covers content; line numbers are navigation only.
Any changed or ambiguous anchor requires renewed review, not automatic acceptance of the new text.

**Recommended title mechanism:** `corpus --revision C` builds an isolated copy of the declared
candidate sources/dependencies and runs each distinct deterministic catalog command once per
invocation. Use Node's native test reporter events, extending the existing
`assertion-reporter.mjs`, to retain candidate-relative file, exact leaf name, declaration location,
pass/fail/skip/todo and execution validity. The pinned
[Node 22.9 test-event documentation](https://nodejs.org/download/release/v22.9.0/docs/api/test.html#event-testpass)
documents name, file and location fields. This is metadata extraction from actual test execution;
no source-code analyzer or evaluator of arbitrary title expressions is proposed.

Run complete selected test files, so generated titles come from real registration rather than
string guessing. Match the exact `(file, test_title)` to **one** leaf result and the registered
declaration anchor. Duplicate names within a file are ambiguous and cannot earn suite credit;
use a named case adapter if necessary. A title printed in stdout, mentioned in a comment, present
only in another file, skipped, cancelled, todo, unexecuted or absent cannot satisfy the check.
Missing location metadata, an invalid run, failing control, timeout or output overflow is explicit
attention-required. Include child failures and harness errors; never infer a pass from exit alone.

The corpus command deterministically checks all required fields, exact source anchors, relation
references, claim eligibility and actual title results at C. It emits separate
`source_bindings_verified`, `titles_executed`, `targets_passed`, `pending_revalidation` and
`semantic_review: required` facts. A test result remains a test result; `full_corpus_complete`
and acceptance cannot follow merely from these checks. Mutations are still separate runs.

**Human judgment remains:** whether the cited setup reaches the asserted operation, the assertion
actually consumes that input/result, a helper or conditional skips an assertion, the oracle is
complete for the claimed observable, the authority permits a replacement, and all historical
variants were extracted. Matching source text and a passing test cannot prove those facts.
Review each relation within the finite inventory and cited helper closure. Where that trace is
unclear, keep the counterexample pending and use a stored registry case/causal mutation. Do not
build a general semantic analyzer or call prose predicates machine-proved. Existing design-03
ablation requirements continue for adopted refusal checks and witness observation checks.

This makes `corpus` more expensive than revision 2: it now executes deterministic title catalogs.
Catalog argv, source/dependency sets, time/output bounds and profile are declared in the candidate
specification. `checks.json` schedules them and the corpus; standalone corpus also runs them
fresh. Initially allow the scheduled catalog check and corpus to repeat work for simplicity;
there is no persistent cache or imported pass receipt. Report time/file/title counts. Do not
quietly replace the full repository tests, sweeps or registered mutation runs with the catalog.

Live-provider and large-memory/timing profiles keep commands and explicit not-run status under
owner choice 01. Their non-test scripts belong to named registry cases with stored input and
expected observations, not invented suite titles. Source/membership verification can close their
adoption while default execution stays `not_run`. No paid or large experiment is triggered by
the deterministic catalog command. A source-only catalog cannot supply executable title credit.

### Held and superseded witnesses

Seed `holds` from the governing records already read:

| Claims | Correction owner | Attribution |
|---|---|---|
| V-D1 | K1.1-correction-03 | K1.2 decision-05; DESIGN-AUDIT-01 invalidation-02 and decision-01 §3 |
| Proxy; re-prototyped built-in classification | K1.1-correction-03 | DESIGN-AUDIT-01 decision-01 §§2–3 and invalidation-01; current acceptance is superseded target behavior |
| V-ENV | BINDING-01 | DESIGN-AUDIT-01 invalidation-03, decision-01 and decision-02 |

Keep `required_result` (including the target's hold) separate from `observed_current_result`.
A maintained case may assert reproduction of the current defect, or a narrower observed result
while a broader claim remains held. It must declare which observation it tests. Its result is
`witness_reproduced`, `witness_changed`, invalid or not-run, with `semantic_credit: none` and
owner/decision in every summary. Changes in current behavior cause investigation, never automatic
hold release. A case pointing to an existing test still remains a held case, not a suite mapping.

A superseded witness keeps the replacing decision and old input/result. If reproduction requires
a retired API, retain a pinned historical recipe/command and current replacement links; do not
manufacture the bad result in today's Kernel. It receives no current conformance or kill credit.
Any unexecuted historical witness uses an explicitly declared profile and reason; a novel profile
exclusion beyond owner choice 01 requires an owner decision. A supersession without an applicable
decision stays pending. For already authorized retirement such as KC1-ARCH-1, bounded source review
plus the replacement links closes provenance, while the superseded witness stays visible.

The hold check is structural after classification: every destination is resolved through its
counterexample and claim table; suite destinations for held/superseded records fail. Removing
claim tags from a genuinely held counterexample is a semantic mapping defect caught by the
bounded source review, not something arbitrary text matching can reliably detect.

### Families of mutation-runner members

1. Extract the runner's exact finite member set, including selected imports and generated members,
   from its pinned source and input tree. Record N and every label. Store generated edits literally;
   verify the extraction census against the historical generator, without running its mutation
   loop or writing the checkout. Counts alone do not establish matching members.
2. Register each distinct mutation with its obligation, source input, candidate edit(s), case ID
   and expected exact rejecting test/assertion names. A multi-edit mutant is one mutation, applied
   atomically to a temporary copy. All anchors must match exactly once in the original C bytes;
   reject overlapping/conflicting edits before writing. Its key binds the ordered edit list and
   operator. Retain original single-edit keys for unchanged existing mutants.
3. Preserve historical and candidate anchors separately. An explicit rebinding records old/new
   content keys and the same-fault argument. A missing original site is `not_applicable`, never a
   kill or reason to omit a member. An unresolved rebinding/coverage gap stays pending. A retired
   site can close by a bounded no-longer-applicable argument with authority/replacement; that
   disposition is visible and receives zero executable credit.
4. Run a passing control and each applicable mutant at C. Keep existing isolation/reach/exit and
   nondeterminism checks. Require a named assertion failure in the member's expected target set.
   Preserve historical extra obligations, such as a Z member's exact-coordinate oracle or a
   READ/COMMIT member's enforcement-rule failure. An unrelated failure is not that member's kill.
   Record first observed failure and first qualifying `killed_by` separately when they differ.
5. Report source origins, family memberships N, distinct logical counterexamples, distinct mutant
   keys, case/mutant pairs, current named kills, held observation-check kills, reading closures,
   obsolete/superseded members, survivors, invalid runs and pending members separately. The same
   content-identical mutant may meet several family links without multiplying unique kill counts;
   distinct required oracle targets still need their own results. N mapped members is not N kills.

An origin closes only when its declared membership is fully accounted for. A historical runner
cannot become `suite` by reading matching test files, or `non_executable` merely because a newer
runner exists. The whole historical corpus remains available and its membership is retained.
Reading-only equivalence closures need their finite argument and remain outside kill totals.
A known non-equivalent survivor needs a maintained witness/correction attribution or an explicit
owner limit; it cannot become a successful mutant or a silent waiver.

## Tool, schema and test changes after approval

| Maintained path | Proposed change |
|---|---|
| `scripts/packet_tools.py` | Validate adoption v2 and the origin/member/counterexample graph; run bounded title catalogs from C; reconcile targets and holds; add multi-edit mutation support and qualifying named kills; preserve separate completion/execution/hold counts. Reject unsupported schema versions. |
| `tests/fixtures/packet-tools/adoption.json` | Keep all origins, split provenance from semantic destinations, add targets/families/holds and migration bookkeeping. No automatic semantic conversion. |
| `tests/fixtures/packet-tools/mutations.json` | Versioned family/member data and multi-edit records, named rejecting targets, profile and claim references. Retain current stored inputs, exact observation controls and complete-decision oracle. |
| `tests/tooling/assertion-reporter.mjs`; new small catalog adapter in `tests/tooling/` | Preserve exact file/title/location and valid leaf results. Use native events, not grep of test output. Apply the same identity to named mutant kills. |
| `tests/tooling/test_corpus_tools.py`, `test_packet_tools.py`, `test_research_tools.py`, `test_adapter_inputs.py` | Temporary-candidate graph, title, source-binding, family, mutation, migration, profile and input-consumption controls listed below. Test fixtures live under tooling; existing Kernel suites stay unchanged. |
| `tests/fixtures/packet-tools/refusal-guards.json`; `tests/tooling/test_refusal_guards.py` | Register and ablate every new refusal guard, keeping the existing finite guard census complete. |
| `tests/fixtures/packet-tools/coverage.json`; `tests/tooling/README.md` | Add declared categories for new refusals and document the schema, attribution and costs. Retain current dimension gaps. |
| TOOLS-01 `contract.md`, `checks.json`, later implementation report | Apply only the approved diff; schedule the new checks and profiles; record exact migration counts, candidate runs and remainder. Candidate identity/preservation rules in `verification.json` keep their current meaning. |

No standalone JSON-schema package is required: validation remains in the existing Python tool,
with versioned fixtures and documented fields. Proposed Node changes use the built-in runner.
Third-party use is reading documentation and continuing existing pinned runtime/dependency use;
no source is copied/adapted from another project, dependency added or service introduced. Any
expanded dependency subset must retain existing version/digest and license/notice checks. This is
not new license clearance.

## Why the new criteria close

The bounded semantic search covers **all 1,549 origins**, their cited source contexts, explicitly
referenced input/mutation definitions and the chosen tests' helper/assertion closure. It ends when
each has a recorded disposition and every extracted member has a destination or attributed hold/
authorized retirement. New discoveries within that scope are added; no universal claim about
unindexed history or all possible JavaScript behavior is made.

| Criterion | Closing method and required distinguishing controls |
|---|---|
| P1-G grouping | Structural exact-set reconciliation plus the bounded source search above. Missing/unknown/duplicate origins or members, conflicting content IDs, dangling links, partial origin presented as complete and duplicate-to-pending shortcuts must fail. Distinct inputs/obligations remain variants. |
| P1-T suite targets | Fresh candidate title results and exact source-binding checks, plus bounded review of each input/assertion relation. Negative fixtures: absent/renamed title, title only in comment/stdout, wrong file, duplicate leaf name, deleted/changed input or assertion anchor, dynamic parameter mismatch, skipped/todo/cancelled test, malformed events, setup failure and a matching test from another commit. A fixture with dead/unrelated assertion text documents the human semantic limit; it is not advertised as automatically rejected. |
| P1-H attribution | All destination resolution goes through the claim table. Reject held/superseded→suite, missing owner/decision and conversion of reproduction into correction credit. Check the four claim categories in the finite table and the KC1-ARCH-1 replacement example by source review. |
| P1-M mutation families | Exact declared member-set equality; fresh control/reach and named qualifying failures for current kills. Drop one member, change a generated input tree, reuse a key for changed edits, overlap multi-edits, stale one anchor, fail an unrelated test, corrupt the baseline or introduce import/timeout errors: no kill. Test inherited membership, rebinding provenance and duplicate references without inflated counts. |
| P1-R migration | Exact reconciliation of 116 old suite rows, 8 case rows and 30 non-executable rows against the pinned v1 manifest. Missing rows and unresolved conversion cannot produce completion. Bounded source review of every converted relation; run each distinct target/control at C. |
| P1-C reporting | Deterministic summary/CLI tests keep origin mapping, relation checks, current execution, profile exclusions, holds and independent acceptance separate. Pending extraction, revalidation or unresolved members block P1 completion; a declared held witness can close adoption but never release its hold. |

F1/F4 remain unchanged. F2/F3/F5 implement these finite mechanisms. F6 gains the schema and migration
documentation. P2 still requires the completed clean-C verification, cumulative self-review and
independent acceptance under 006. These tests are planned, not results claimed by this note.

## Migration plan and cost

1. After approval, implement format/checking support and its negative controls first. Keep v1
   readable for historical inspection with `target_verification: legacy_unverified`; it cannot
   satisfy revision-3 completion. Missing/unknown versions fail. The version-2 schema permits
   explicit pending rows so intermediate commits remain honest and checkable.
2. Convert origin identities and old rationales mechanically. Mark all **116 suite + 8 case = 124**
   executable-mapping rows `pending_revalidation`. Preserve the 30 non-executable rationales and
   recheck their classifications in the finite origin pass. Preserve all 1,395 pending rows.
   Do not copy old pass/kill numbers into current observations.
3. Revalidate by distinct target/family and attach all relevant origins. The 116 suite rows have
   120 edges to **71 files: 53 `.test.ts` files and 18 other files**. Helper/fixture modules map
   through actual consuming tests and their assertions, executable non-test scripts through cases,
   and pure historical commands through reasoned evidence dispositions. Whole test-file origins
   need an explicit member census; one convenient test cannot stand for all their scenarios.
4. Recheck all eight case origins, which currently reference **77 distinct case IDs and 77
   case/mutant pairs**. These are 29 complete-decision comparisons, one work-charge witness,
   ten built-in witnesses and 37 realm cases. Reuse their stored input/observation/claim machinery
   after checking each relation, then rerun the controls and mutants. The entire main registry
   currently has 98 cases/pairs; the other 21 are not erased or counted as newly migrated origins.
5. Extract pending artifacts first, then attach prose mentions by source context. Keep prose-only
   counterexamples as new records. Audit non-executable parts explicitly. Reconcile the final
   profile plan and complete-decision oracle; run the completed default corpus/mutation suite.
   Commit/push each coherent batch and report exact pending origins, pending groups and unresolved
   family members. Only a complete packet can become review-ready.

**Cost estimate, not a gate:** allow 3–5 focused implementer days for schema/title/family tooling
and its refusal controls, then 3–6 days for existing-mapping revalidation. The latter is more than
124 field edits: a rough lexical census of the 53 test files finds 1,056 `test(`/`it(` call sites,
55 with template-literal first arguments. Those numbers include nested/string-source matches and
are neither discovered test counts nor distinct counterexample counts. Native catalog execution
and the member census replace that rough estimate. Budget one review of each source scenario,
one catalog run per distinct command per invocation, and at least 77 control/mutant pairs for
the already-mapped cases; P2's complete fresh runs remain additional work. Timing is measured
after the mechanism exists, not used as an acceptance threshold.

### Estimated remaining P1 size after grouping

Exact starting census from inventory/adoption:

| Measure | Count |
|---|---:|
| All origins | 1,549 |
| Pending artifact origins | 82 |
| Pending prose mentions | 1,312, in 169 pinned source documents |
| Pending final-review addition | 1 (`review-03/hop/frozen-graph.mjs`, V-ENV intake) |
| Distinct revision/path pairs across pending intake | 244 |
| Already mapped origins requiring migration review | 154 (124 executable mappings + 30 non-executable) |

For the **currently pending** intake, plan for roughly **300–700 distinct counterexample or
mutation-member records**, organized into roughly **40–80 families**, plus non-executable source
dispositions. Confidence is low until the finite census is complete. This is a planning range,
not an extracted inventory or a target to force the data into. The seven pilot runners already
contain 179 member occurrences; after the explicit rebound inheritance and H/C repeats they
still expose well over a hundred distinct candidate obligations. The other 72 artifact origins
include further mutation batteries, behavioral probes and repeated runners. The 1,312 mentions
will often attach to those records, but prose-only variants can increase the count.

Grouping therefore saves repeated semantic work on mentions, not the requirement to account for
all 1,549 origins. It does not turn 1,395 pending origins into ten small mappings. The 300–700
estimate excludes the existing 77 case relations and the potentially large member census of
already retained whole test files. Plan another 5–10 focused days for pending extraction/adapters
after tooling and migration, with independent review and unexpected semantic blockers additional.
Replace these estimates with exact counts after the 82-artifact extraction and the 169-document
prose pass. Neither forecast bounds or waives a discovered obligation.

## Accepted designs relied on

- 006/008/012 remain fit: independent acceptance, exact candidates, accumulated counterexamples
  and finishable criteria. No workflow-policy amendment is requested.
- Design 01's immutable inputs and temporary runner remain fit. Multi-edit support extends the
  runner without authorizing shared-tree mutation.
- Design 02's origin preservation, profiles and explicit pending state remain fit. Its file-level
  suite targets and repeated per-origin semantic decisions are replaced by the approved revision.
- Design 03's stored inputs, content keys, non-vacuity, ablations and sampled determinism remain
  fit. Their results need family/target identities and separate attribution, not a new oracle.
- Owner decisions 01–02 define target changes and existing holds. They supply no TOOLS-01
  conformance credit or release. The pilot/review expose design gaps but grant no acceptance.

## Owner questions and stop

1. **Approve the revision-3 diff and adoption-v2 design?** This includes exact-input mappings,
   explicitly authorized replacement links, and no suite credit for held/superseded witnesses.
2. **Approve fresh deterministic title-catalog execution inside `corpus`?** It checks real titles,
   including generated titles, at the cost of extra suite execution. A cheaper source-only title
   scan would be a different, weaker proposal and is not assumed here.
3. **Approve full revalidation of the 124 executable mappings and the proposed P1 work budget?**
   No grandfathering is recommended. The corpus size is an estimate; approve the mechanism and
   staged census, not a fixed maximum counterexample count.

The owner explicitly required stopping before revision implementation. Per the applied
[slice-audit skill](../../../../.agents/skills/arrokothi-slice-audit/SKILL.md), “Ask the owner
early” reinforces that gate; it is the owner's instruction, not an inferred skill restriction.
No approval, hold release, packet acceptance or next-packet release is inferred.

## Validation and handover

At starting head `c450d8a02fd55c73a9b48861b73a66e3b55c3760`, Node v25.2.1 / Python 3.14.6:

- `npm run test:packet-tools`: exit 0; `Ran 158 tests in 48.095s`, `OK`.
- `inventory`: exit 0; `provenance_verified`, 208 artifacts, 1,333 mentions, eight additions.
- `corpus`: exit 0; `extraction_pending`, 1,549 origins; suite 116, case 8,
  non_executable 30, **pending_adoption 1,395**. This is revision-2 output, not revision-3 evidence.
- `adoption.json` blob at both `60fc5bf8` and starting head:
  `673b68ec2a0ad7219d90465b2aa60cff09076736`. No mapping gained from the pilot/review.
- Embedded contract diff: apply-check only; live contract remains revision 2.
- `git diff --check`: recorded after the final note edit, before commit; exit 0, no output.

Only `design-04.md` is changed. The final response supplies its pushed commit identity and
post-commit corpus/diff checks; this note does not attempt to name its own containing SHA.

**Exact remainder:** owner answers/design check first. Then apply the approved revision, implement
and test the versioned graph/title/family/hold mechanisms, revalidate all 154 old dispositions,
and reconcile the unchanged 82 pending artifacts + 1,312 mentions + one final-review addition.
The proposed `check-records.mjs` disposition is still pending. Finish P2's composed fresh checks,
cumulative self-review, exact C/H report and independent acceptance workflow. No production or
held-claim correction is authorized by this handover. The packet remains IN_PROGRESS.
