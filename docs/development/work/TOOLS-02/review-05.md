# Independent review 05 — TOOLS-02 ranges 2–4

**Verdict: CHANGES REQUIRED**, bound to exact H `19c1f43f2989acc1a501c96ca0f0f08dbba339b9`.

One P2 finding, T2-R5-CLAIM-01: BASELINE (002) and 017 L-17 state a false current count of unread register
entries. The brief's review gate names that kind of defect. T2-3 and T2-4 meet their criteria. Design 06's routes
keep the family rule, at the strength stated below. The T2-5 audit found **0 unsafe errors in 150** (bound 3), with
3 minor errors. The relevance samples found no irrelevant binding. Four P3 observations follow.

This is TOOLS-02's fourth CHANGES REQUIRED, so 006's stop-and-redesign rule applies. The
[root-cause note](#root-cause-note-006-stop-and-redesign) and [correction brief 05](review-05/brief-05.md) were
added after the owner's answer. Neither changes the verdict, the findings or the audit.

## Audit seeds, chosen before any sample was drawn

- **Candidate H:** `19c1f43f2989acc1a501c96ca0f0f08dbba339b9`, over C `302fee9de7dc857ce58cf1e86d7fbb223af7c5fb`,
  on B `335ae7e6b6ddf7fa3c32a8605559268ed8a4e39b`.
- **Population:** `tests/fixtures/packet-tools/adoption.json` as frozen at H, read through
  `tests/tooling/triage-sample.py --revision 19c1f43f2989acc1a501c96ca0f0f08dbba339b9`.
- **Seeds**, drawn with Python's `secrets.randbelow(2**31)` at 2026-11-01T17:51:19Z, before the sampler was run
  with any seed:

| Sample | Population | Size | Seed |
|---|---|---:|---:|
| Unsafe-error audit (design 02 §5) | `retired` | 150 | 1640414241 |
| Relevance, closed | `closed` | 10 | 1500317432 |
| Relevance, extracted | `extracted` | 10 | 1015389638 |

- **Bound:** at most ⌊0.02 · 150⌋ = 3 unsafe errors; 4 or more fires the brief's stop (design 01 §5.5, design 02 §5).

This table was committed and pushed as `4562bc14` on `claude/tools-02-review-05` before the sampler ran. It is
unchanged here.

## Identity and scope

- **Reviewer:** a fresh Claude Code desktop session (`claude-opus-5-5`), 2026-11-01, under
  [owner choice 12](owner-choice-12.md). No subagents were used.
- **Independence.** This session wrote none of the work under review:
  - ranges 2–3, and range 4's triage through `9f6321b4`, are by Codex GPT-6 sessions;
  - the work from `9f6321b4` to H is by another Claude Opus session.

  This session's auto-memory holds notes that the implementing session wrote. I used them only to find files, and
  checked every fact this review relies on against the repository, the CI artifact or my own runs. Implementer and
  reviewer are the same model, so their assumptions may be correlated. The independent work here is the seeded
  samples and the mutation checks, which do not depend on the implementer's readings.
- **Contract:** [brief 01](brief-01.md) (scope B), amended by [owner choice 01](owner-choice-01.md). Also owner
  choices [02](owner-choice-02.md)–[14](owner-choice-14.md); designs [01](design-01.md), [02](design-02.md),
  [03](design-03.md) (with §6, which completes D03-CHK-01) and [06](design-06.md); design checks
  [01](design-check-01.md), [02](design-check-02.md) and [03](design-check-03.md).
- **Process:** 006, 008 and 012 at B.
- **Branch:** this record is on `claude/tools-02-review-05`, from `origin/main` (`335ae7e6`). Its relative links
  name records in H's tree, `codex/tools-02`.
- **Read:**
  - [implementation 05](implementation-05.md), [progress](progress.md),
    [self-audit-05.json](self-audit-05.json) and [triage-05.json](triage-05.json);
  - extraction builds [01](extraction-build-01.md), [02](extraction-build-02.md) and [03](extraction-build-03.md);
  - projections 05–12 and group reviews 06–14;
  - the C..H diff and the code changes from B to C.
- **Ownership:** this is repository evidence tooling. Product source is unchanged (below), so no Kernel,
  Runtime/Driver or deployment semantics are involved.

## Verification

**Candidate.** I ran `packet_tools.py candidate --payload C --head H` in a fresh clone (`git clone --no-local`,
`npm ci` exit 0, Node v26.10.0, Python 3.13.5, macOS 26.6.2 arm64). It returned exit 0 and `facts_verified`:
- the B→C→H chain holds;
- all 48 preserved paths are unchanged;
- C..H is exactly the four administrative files, and their content is as implementation 05 states;
- the design 04 whitespace accommodation is the same as at review 04.

**Packet verify.** Under 006, I cite CI rather than repeat the full run.
- Run [41286444190](https://github.com/ArrokothI/arrokothi/actions/runs/41286444190), job `124788600198`,
  artifact `13079501063`. The zip's SHA-256 is `fa98a22db70d05101f7c6122b96b758eb32e2f9022bdd0adf3a123948c8acb80`,
  matching GitHub's digest; it is retained in [review-05/](review-05/).
- `run.txt` names C as both the revision and the HEAD, with exit 0. The workflow event head (`335ae7e6`, main's
  workflow file) is not taken as the payload.
- Environment: Linux x86_64, 4 CPUs, Node v26.10.0, npm 11.19.1, Python 3.13.17.
- `verify.json` reports `checks_passed`, 19 of 19:
  - tool tests 777;
  - inventory `provenance_verified`;
  - adoption `mappings_complete`: 1,280 triaged, 269 complete;
  - mutants killed: 339 registered, 358 refusal, 238 value-cost; all 303 registered controls passed;
  - repository tests 4,766, with 0 failures, cancellations, skips or todos;
  - the remaining checks as implementation 05 lists them.

**Local reruns in the fresh clone:**
- `corpus` at C returned `mappings_complete` in 361 s. Its states, retirement classes, closure and family counts
  are identical to CI's.
- Tool-test modules, all OK:

| Module | Tests |
|---|---:|
| `test_runner_targets` | 12 |
| `test_value_cost_probe` | 29 |
| `test_released_holds` | 64 |
| `test_case_register` | 4 |
| `test_transfer_limits` | 53 |
| `test_family_tools` | 22 |
| `test_context_references` | 16 |
| `test_closure_tools` | 22 |
| `test_triage_tools` | 16 |
| `test_venv_register` | 4 |
| `test_refusal_guards` | 220 |

  That is 462 tests in all, and the clone stayed clean.

- Mutation runs, in a second `--no-local` clone: [covered-mutations.json](review-05/covered-mutations.json).
- Not rerun: the full verify, the archive and examples suites, and the external profiles (`profiles_not_run`).

## T2-3 — target-set kills have provenance (range 2): met

**Mechanism.** It is design 01 §3 as built:
- `run_targets` runs each target file in its own direct process, with the witness and the reporter beside the
  error object;
- a kill needs a witnessed assertion of the named test;
- the source policy refuses production code that names `AssertionError` or imports `assert`.

**Controls in `test_runner_targets` pass:**
- a real assertion and a helper assertion are killed;
- a production `AssertionError`, with or without `stackStartFn`, is `setup_error`;
- forged shape, cross-leaf rethrow, nested `assert.throws`, hooks and renamed targets are observations;
- duplicate joined names refuse the control.

**Registered mutants.** Eight T2-3 mutants (`result.target-*`) pin the classification, and CI killed each.

**At C.** All 167 target-set kills in CI carry `killed_by` sites, and each site is bound to its expected target:
- each site is in a test-side module;
- its invocation's `file` and `fullName` equal the expected target.

The witnessed sites are `assert.equal` 46, `assert.ok` 44, `assert.deepEqual` 32, `assert.fail` 29,
`assert.match` 15 and `assert.notEqual` 1. No target-set kill rests on frames.

## T2-4 — the hold register matches current claims (range 3): met; its docs claim is false (T2-R5-CLAIM-01)

**The register at H** has 1,186 entries:

| Classification | Entries |
|---|---:|
| `unread`, V-ENV | 1,100 |
| `unread`, Proxy | 41 |
| `unread`, V-D1 | 21 |
| `unread`, re-prototyped built-in | 12 |
| `not_held`, V-ENV | 11 |
| `superseded`, Proxy | 1 |

- No entry is `held`, and `rule_1` is 0.
- All four claims are marked `released`, each with its release record.
- `corpus` refuses a mismatch.
- The 11 `not_held` entries carry per-entry readings that name their detector sites. I read two: the
  `control-observation` leaf (binding-facade captures, a core decision) and the `builder-docs-anchor` leaf (a child
  process that runs the doc checker). Both are concrete.

**Design 03 §6.1.** D03-CHK-01's C2-LIMIT cascade is implemented as stated: `limited_origins.released_venv_unread`
requires all four conditions, and the extra-target guard requires the same entry and the `unread` P1-H refusal. The
old `held` form is refused. The §6.1 controls are in `test_transfer_limits` (53, OK). Retiring a limited origin as
S5, as sample item 28 is, leaves its members uncredited.

**Design 03 §6.2.** No `limit` class exists.

**The defect.** 002 lines 190–192 and 017 L-17 say 983 unread entries, which is range 3's count. Range 4's
recomputation (build 03 §4: 227 added, 26 carried, 11 read) made it 1,174 (T2-R5-CLAIM-01).

## Design 06 ruling (owner choice 13: no separate design check)

The question is whether each route keeps design 01 §5.4's family rule: a test that passes while the decision is
mutated must not close a member.

**§1, the shared `mutation` route: keeps the rule.**
- The route must name the registered mutant of another family's member: a mutant whose `obligation` is
  `<family>#<key>`. CI killed every such mutant.
- When the member declares `reuses`, `via` must name that same member.
- Of the 114 shared routes, 104 copy a member with the same member key. Their runners import the source definitions:
  - `ablations-03` and `review-04/oracle-vs-mutants` read review-04's reviewer runner;
  - `original-ablations-02` reads `K1.2/ablations.mjs`;
  - `ablations-03-rebound-06` re-anchors the same members.
- The other 10 name a different label. I compared each pair's sealed edits:
  - seven are the same edit (C13↔H7, W2↔G9, W6↔V3, K3↔H15, N9↔D35, review-11 READ-01, R1↔B12);
  - UNSUPPORTED-NAME↔R10 is the same decision;
  - review-02 R3↔G13 is a relocation reading: R3's `outcome.ts` anchor is absent at C, and the required result is
    the same;
  - K1↔H19 differs (K1 removes both prototype stops). I ran K1's edit at C: H19's registered target leaf ("a Driver
    without the method is refused even when the request's getter installs an inherited one") fails, so H19's
    kill covers K1.

**§2, the `covered` route: keeps the rule only at S5 strength, by reading, not by mechanism.**

`covered_pointer` checks that a case exists in the scheduled registry, or that a leaf is the one passing catalog
leaf of that name. Nothing checks that a pointer fails when the member's decision is mutated. A wrong reading could
therefore close a member with a test that passes under its mutation. Owner choice 13 accepted this, as "checked
like S5 pointers", and it earns no kill.

I tested a seeded sample: `random.Random(1640414241).sample(range(98), 12)` over the 98 covered members.
- For each, I wrote its historical edit, or its re-anchoring from the group reviews, at C. Then I ran its pointers:
  - leaves, with `node --test` on the file;
  - oracle and state-owner cases, through the case's own control command.
- **All 12 hold.** At least one pointer fails under every mutation:
  - C2, in two forms: an early postfix write and a double advance;
  - C3, H6, H8, A1, A4, B6, R3, R6, N3 and N2;
  - item 63 (sweeps-08 C1) is C2's decision.

  The fault-oracle sweep leaf fails in every Kernel case. The oracle case controls do not pass.
- One more, outside the sample: H13's only pointer is `state-owner.dropped-coupled-field`. That case's registered
  mutant is byte-identical to H13's edit, and CI killed it.

No sampled member is closed by a test that passes while its decision is mutated.

The guarantee stays a reading, at about S5's strength. So "269 closed under P1" includes families whose members are
partly covered (98 members) or shared (114). Implementation 05 states this ("counted, never a kill").

**§5–§6 (owner choice 14): consistent with the owner's answers.**
- One hop is design 01 §5.4's declared minimum context. `context_check` now reads only the origin's minimum context.
- Every form in the accepted refusal control still refuses, and the refusal census is 358/358 in CI.
- One small point: a plain-text relative spelling of an existing file outside `docs/` is neither required nor a
  candidate. That matches D04-CHK-06 (production files are targets, not context), but §5 does not say it.

## T2-5 — independent audit

**Retired sample** ([audit-retired.json](review-05/audit-retired.json)): n = 150 from 1,280 retired origins.
- Population SHA-256 `538b3aaa319f4ecc68e159edb6ed42994f232fcc4700e3181640ead02aee5738`, the same as the self-audit's.
- Classes in the sample: 91 `covered_elsewhere`, 45 `not_a_counterexample`, 11 `superseded`, 3 `recorded_limit`.
- Method: I read each origin in its minimum context at its pin, with its class, rationale and pointer. For
  `covered_by` pointers, I read the named leaf where the rationale alone did not settle it.

| Result | Count | Items |
|---|---:|---|
| Unsafe errors | **0** (bound 3) | — |
| Minor errors | 3 | 56, 121, 144 |
| Safe but borderline | 2 | 16, 89 |
| Safe | 145 | — |

**Minor errors** (safe; wrong class or pointer):
- **56 and 121** (K1.1 implementation-16:160, implementation-17:145). These are generation-script paragraphs. Their
  rationale is a file-level template: "the same minimum context also names current nondisclosure … results", with
  nondisclosure pointers. Neither paragraph names any such result. The same sentence at implementation-14:151
  (item 17) is S2, under TOOLS-01 design-02. By contrast, item 96's paragraph does name the X9 battery, so its
  pointer is right.
- **144** (K1.1 review-06-supplement-01:90, the K11-R6-VAL-04 scratch write). It is retired S3/L-01. But
  `packages/sdk/tests/value-capture.test.ts`'s describe "K11-R6-VAL-04 one observation survives an indexed accessor
  installed while observing it" asserts the result without the Proxy trigger. The mixed rule therefore makes it S5.
  Also, L-01 names global replacement and shadowing, not inherited indexed accessors.

**Borderline.** Items 16 and 89 (K1.2-correction-01 review-01 R8, review-02 `probe-maxlen`) concern a wrong caller
identity near the engine's string maximum. No maintained test uses that size. The 50,000,000-unit DIAG-01 leaves
take the same pre-concatenation omission branch, and 002 and `identity.md` qualify engine allocation. I count them
safe. A regression that concatenates before truncating would pass the 50M leaves and fail only near the maximum.

**Self-audit.** It is consistent with this result: seed 20261026, n = 50, 0 unsafe and 2 minor.

**Relevance samples** ([relevance.json](review-05/relevance.json)):
- **Closed (seed 1500317432, 10 of 57): all relevant.**
  - Seven were complete at B (TOOLS-01) and their closures are byte-identical.
  - The three TOOLS-02 closures bind a test file to its own leaves, or a cleanup record to the 53 realm cases it
    names.
  - All 26 TOOLS-02 closures are the P1 revalidations: 20 test files closed as unread witnesses (no credit) and 6
    DESIGN-AUDIT-01 realm records.
- **Extracted (seed 1015389638, 10 of 212): all relevant.** One is over-linked (T2-R5-RELEVANCE-01).

## Test groups, adoptions and caps

- **Counts:** 15 test groups (cap 25) and 152 adoption cases with 179 mutants (cap 250).
- **New tests:** 16 new suite targets, in origin-regressions (9), control-observation (5), nondisclosure (1) and
  builder-docs-anchor (1). Every one is linked by a complete, extracted origin.
- **Edited maintained tests:** exact-coordinates, host-members and nondisclosure. The edits add assertions
  (`returnsNormally`, a pre-creation nondisclosure test), or move `refused(...)` out of the polluted window. None
  removes an assertion.
- **Controls and kills at C (CI):** 303/303 controls passed, 339/339 mutants killed, and every target-set kill is
  witness-bound.
- **Complete pass (owner choice 13, 1,200 s):** pass-2 took 776.867 s at `cf95cf52`, with 152/152 controls and
  179/179 kills. Between `cf95cf52` and C, `mutations.json` changes only in 190 claim attributions, the P3 case and
  `package-lock.json` in shared files; no case, edit or test byte changes. The raw pass logs sit in the
  implementer's scratchpad and only their hashes are in the ledger, so CI's run at C is the independent check.
- **`mappings_complete`:** reproduced locally.
- **Scope:**
  - no file under `packages/*/src`, and no manifest or lockfile, changed from B to C;
  - the only pre-existing records modified are `progress.md` and `verification.json`;
  - design 03, design check 03 and owner choice 02 are byte-identical to `c71818c8`;
  - the caps of owner choices 07–13 held: 15/25 test groups, 152/250 adoptions, 776.867/1,200 s.

## Findings

| ID | Severity | Finding |
|---|---|---|
| T2-R5-CLAIM-01 | **P2** | False current count in BASELINE and 017. Details below. |
| T2-R5-WITNESS-01 | P3 | 540 of the 560 `unread_witness` counterexamples keep the `required_result` text "Held for BINDING-01 under V-ENV: Held by owner choice 08 rule 1 …". The `kind` field is authoritative, and design 03 §1 keeps "the same claim and members". The prose still reads as an active hold. A later `regenerate` could rewrite it. |
| T2-R5-TRIAGE-01 | P3 | The 3 minor errors above, for the owner's judgement under design 01 §5.5. Items 56 and 121 come from one mechanism: a file-level rationale applied to every mention in a K1.1 implementation report, whether or not that paragraph names the result. Other mentions in those reports may share it. All are safe. |
| T2-R5-RELEVANCE-01 | P3 | `K1.2-correction-01/coverage-07.md:124` (the COMMIT-01 row) links the seven READ-01 cases of the row above it, as well as its own c8/c10 cases. This is over-linking with no gap: its C-members close through the ablations-07 family. |

**T2-R5-CLAIM-01 in detail.**
- 002 lines 190–192 say: "The register now records the released … claims, with 983 unread entries (017 L-17)."
- 017 L-17 says: "Credit from the 983 unread hold-register entries matching released claims …".
- At H the register has 1,174 unread entries, plus 11 `not_held` and 1 `superseded`, out of 1,186. So the limit's
  scope is understated by 191 entries.

*Mechanism.* The count was copied by hand at range 3's checkpoint (`d45c971e`: 983 unread). Range 4 recomputed the
register, and no check ties the prose to the corpus. 002's earlier "853 rule-1 held entries" (891 measured) was the
same kind of drift.

*Required change.* State the count at C, or cite the corpus report's `register.by_classification` without copying a
figure, in both 002 and 017. The new C should keep everything else byte-identical.

## Root-cause note (006 stop-and-redesign)

**The rule applies.** Reviews 01, 02 and 03 of range 1 each returned CHANGES REQUIRED, and review 03 recorded
the third. 006 stops patching once a packet reaches its third CHANGES REQUIRED. I read this fourth one as still
past that point. The note was missing from this review when it was first committed (`3e478016`). It was added
after the owner's answer below, and it changes no verdict, finding or audit result.

**Mechanism.** A figure derived from the corpus was copied by hand into current prose. When the corpus was
regenerated, the prose kept the old figure.
- 002 and 017 L-17 took 983 from range 3's checkpoint (`d45c971e`: 909 V-ENV, 41 Proxy, 21 V-D1 and 12
  re-prototyped).
- Range 4's recompute made the count 1,174. All 191 added entries are V-ENV.
- Nothing compares the prose with the corpus report's `register.by_classification`.
- 002's earlier "853 rule-1 held entries" (891 measured) drifted the same way.

The read-identity mechanism behind reviews 01–03 is not involved. The rule applies here because of the count of
CHANGES REQUIRED verdicts, not because one subsystem keeps failing.

**Why earlier passes missed it.** T2-4's criterion compares the register with the released claims. The corpus
check and the self-audit both test the register itself, and neither reads 002 or 017. The prose was updated at
range 3 and not checked again after range 4, and no review compared a prose count with the corpus report. So the
gap is in the criterion: the claim had no check that could close it.

**Owner options**, in 006's terms:
- **Refined finishable claim (recommended).** 002 and 017 L-17 either cite the corpus report's unread rows with no
  copied figure, or give a figure together with the revision it was measured at. A pinned figure stays true, and
  a reference has nothing to drift. Two lines change, and the owner has already chosen the bounded review below.
- **Redesign:** a check that ties every prose count to the corpus. That is far more than this defect needs, and
  figures in other packets' records would also need it.
- **Split:** accept ranges 2–4 now and make the correction in cleanup. The owner has already declined this route.
- **Accepted, recorded limit:** not available. A limit cannot leave a false current claim in BASELINE.

## Owner answer

**The question**, verbatim from this session's wrap-up:

> How should the correction for T2-R5-CLAIM-01 be reviewed?

**The owner's answer**, the selected option verbatim:

> Bounded delta review

The option meant what this section's question proposed when the review was committed (`3e478016`): the
correction round's review covers only the C..C2 delta and T2-R5-CLAIM-01, and the rest of this review stands for
the new H.

This departs from 006's rule that every round reviews the cumulative base-to-candidate diff as well as the
correction delta. The owner's answer allows it for this one round, and only while C2's tree differs from C in the
correction's files and administrative records. [Brief 05](review-05/brief-05.md) states that condition as a
criterion. The answer narrows the review, not the verification: C2 still needs a passing Packet verify run.

The owner gave this answer before the root-cause note above existed.

## Owner question

Which 006 route applies? I recommend the refined finishable claim. Brief 05 is written for that route and needs
changes under any other.

## Handoff

This verdict binds exact H `19c1f43f2989acc1a501c96ca0f0f08dbba339b9` only. It grants no acceptance, lifts no hold
and releases no packet. [Correction brief 05](review-05/brief-05.md) carries the next round, once the owner
chooses the 006 route. The P3 observations are not part of that round. Evidence is in
[review-05/](review-05/), with digests in [checks.json](review-05/checks.json).

CHANGES REQUIRED — H `19c1f43f2989acc1a501c96ca0f0f08dbba339b9` — TOOLS-02 ranges 2–4 (T2-3, T2-4, T2-5).
