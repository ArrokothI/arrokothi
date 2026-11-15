# Independent review 02 — K1.4-candidate

**Verdict: CHANGES REQUIRED on exact H `14a7ef485282ab2c16d08702be5d61cfeb9997e7`.**
K14C-R01-02 and K14C-R01-03 close. K14C-R01-01 does not: its original examples pass, but exposed
identity strings can themselves collide with laboratory names. New finding **K14C-R02-01 (P2)**
records the common mechanism and counterexamples in the timeout, wait-generation and Execution paths.
This is a test-side adapter defect, not a demonstrated Kernel defect.

## Identity, independence and access

- Reviewer: independent Codex desktop session, GPT-6 per the session identity; exact serving variant
  not exposed. Date: 2026-11-15. This session did not plan, design or implement the packet or its
  earlier review. No planner notes directory was read.
- Fresh remote clone: `/private/tmp/arrokothi-k14-review02`. Review branch
  `codex/k1.4-candidate-review-02` starts directly at H. No prior-review branch was merged.
- B: `c1951226338de6ccd3e4e6289259549551268f61`.
- C: `7392e4a640c07c9a2989464cd2a979938c37ee25`.
- H: `14a7ef485282ab2c16d08702be5d61cfeb9997e7`, supplied on `claude/k1.4-candidate`.
- Policy: 006/007/008/009/012 at B; the review-policy files are unchanged by this candidate.
  Release 01 and the integrated K1.4 prerequisite are present in B. Owner choice 01 confirms the
  implementer's changed role; owner choices 02–03 govern the amended contract.
- Contract: [brief 01](brief-01.md), [owner choices 01](owner-choice-01.md),
  [02](owner-choice-02.md) and [03](owner-choice-03.md), [design 01](design-01.md),
  [addendum 01](design-01-addendum-01.md), and [design 02](design-02.md), all as pinned by H.
  Design check 01 was read by commit
  `e06984a9573efd1524692ab74332eb7744941bcf`.
- Prior review and correction brief were read by commit
  [`7b8a63fa5f087f870663bc143257e5181d0d385c`](https://github.com/ArrokothI/arrokothi/tree/7b8a63fa5f087f870663bc143257e5181d0d385c/docs/development/work/K1.4-candidate):
  `review-01.md` and `review-01/brief-02.md`, including R02-4 preservation.
- Access: full pinned Git source, cumulative B..H diff, local shell/tests, GitHub Actions logs and
  downloadable raw artifact. No private owner transcript was available or needed. No benchmark E1
  capture, live provider, persistence, process-death or isolation experiment was performed.

The review inspected the whole candidate, including the three implementation modules, candidate tests,
ablation table/probe, fixture edits, registry/coverage/adoption entries, current claims and administrative
records. Canonical ownership was traced through the mental-model reference to execution/authority,
wait/batch, value and evidence mechanisms. Kernel source around the public entries and ablation sites
was inspected as the source of observations. The research reading map's timer and evidence-tooling
sections were background, not acceptance evidence or permission to copy code.

## Evidence and scope verification

The retained evidence and reproduction commands are indexed in [review-02/README.md](review-02/README.md).
They distinguish locally rerun commands from inspected CI. The full 91-minute composed verification
was not repeated locally: its exact-C raw artifact was independently downloaded and inspected, while
the candidate corpus, new registry cases, typecheck and C/H checks were rerun.

**CI:** [Packet verify run 43704493967](https://github.com/ArrokothI/arrokothi/actions/runs/43704493967),
job `132782552879`, artifact `14160801105`, named
`packet-verify-7392e4a640c07c9a2989464cd2a979938c37ee25`.
The downloaded archive's independently computed SHA-256 is
`071fa3cc80c05cff24aab58462a70b478849fd9afa8eb53b5d258b56939b1d49`, matching the artifact metadata.
The job's `REVISION` line is **C**, as is the explicit checkout; the retained
[log excerpt](review-02/ci-revision.log) records it. Workflow metadata's dispatch head at B is not the
tested checkout. Extracted `run.txt` records `revision=C`, `head=C`, Node `v26.10.0`, npm `11.19.1`,
exit 0. I counted `checks[].passed === true` in the artifact's `summary.json`: **19 of 19**.
Raw `verify.json` reports `checks_passed`; repository tests are **5,225 passed**, no failures,
cancellations, skips or todos. `registered-mutants` has **308 cases / 344 killed mutants**;
all five candidate cases have passing controls, valid named-step kills and `semantic_credit: none`.

| Independently rerun at H (unchanged candidate payload) | Result |
|---|---|
| Candidate, K0 fixture and architecture corpus with Node 26.10.0 | 1,371 tests / 112 suites; all pass; no fail/cancel/skip/todo |
| `npm run typecheck` | PASS |
| Existing packet-tools candidate check, B/C/H and `verification.json` | `facts_verified` |
| Existing mutation runner, the five unchanged C registry cases, including repeated controls/kills | `selected_cases_passed`, 5 killed, all semantic credit `none` |
| Missing workspace link without opt-in; existing link to another checkout | Both invalid setup runs, neither credited as a kill; existing link preserved |
| Independent identity probes, eight output records | Defects reproduced; adjacent preserved cases pass. A probe exit 0 means reproduction, not conformance |
| Fixed-revision scope script and `git diff --check B H` | PASS |

**C..H is exactly the three files declared in `verification.json`'s `administrative_files`:**
`docs/development/007-work-packets.md`,
`docs/development/work/K1.4-candidate/implementation-02.md`, and
`docs/development/work/K1.4-candidate/progress.md`. The verification specification itself is
identical at C and H. B is an ancestor of C, and C of H.

`packages/`, `scripts/` and `tests/tooling/` are each identical to B by Git tree-object equality
([scope.json](review-02/scope.json)). The fixture delta is exactly four files: comments in
`fixture.ts` and `protocol-vocabulary.ts` (executable text identical after TypeScript comment removal),
the refusing candidate's reason and its test's describe title. Scenarios, runner behavior, oracle
assertions and `/1` remain intact. There are no new production dependencies.

## Independent coverage and cumulative criteria

Coverage was organized around the adapter's boundaries: command capability and oracle access;
command encoding/public entry; identity binding and observation projection; grant/episode/clock
state; oracle discrimination and mutation attribution; locator/loading; and gate ownership/current
claims. A green fixture matrix alone cannot establish lossless identity projection.

| Criterion | Result | Evidence and discriminating trace |
|---|---|---|
| KC-1: real Kernel and faithful observations, with owner exceptions | **FAIL** | Public package-root imports, deterministic fake Driver and five actual Kernel ablations are sound. Inspection/refusal/encoder paths are traced to Kernel answers. Q2b, Q3b and `effectIntents: []` remain declared exceptions. K14C-R02-01 nevertheless hides distinct returned identities in observations. |
| KC-2: oracle blindness | **PASS** | Source reads only scenario identity and command capability in preflight; no expectations/forbids are consulted. Tripwire and altered-expectation controls pass for supported and refused schedules; apply uses its supplied command. Guards cover implementation/helper closure, not an arbitrary-host security claim. |
| KC-3 as amended: exact matrix | **PASS** | Twelve PASS and three capability REFUSED, pinned by name/reason/first unsupported step. Preflight examines kind/category, not scenario names or expected validity. The 51/142 unexecuted steps stay excluded only by owner choice 02; none is called a pass. |
| KC-4: oracle discrimination | **PASS** | Existing refusing/conforming/violating controls retain REFUSED/PASS/named-step FAIL. Original fixture/control suites run unchanged. The five ablations discriminate actual coordinator behavior. |
| KC-5: pinnable locator | **PASS** | Module/export/version and fixture-version rejection are tested. README inventories both fixture and subject, loaded Kernel source, resolution inputs/link real path, tool versions and flags; a commit label alone is not described as verification. Independent benchmark re-pin/load remains unreleased. |
| KC-6: current claims | **FAIL** | Gate, baseline, roadmap, supported/refused scope and self-report attribution are consistent. README lines 112–117 promises literal identity differences that K14C-R02-01 disproves; the related L-39/design assertions need reconciliation with the corrected mechanism. |
| R02-1: timeout provenance | **FAIL** | Original two review probes and ordinary adjacent cases now pass. Generated exposed spellings bypass the checked map, so the identity-preservation mechanism remains incomplete. |
| R02-2: registered ablations | **PASS** | All five sites/obligations/rejecting tests/hold records match the maintained table and actual controls/kills; see below. |
| R02-3: gate exclusions | **PASS** | `evidence.md` now requires an owner's approved, predeclared scope. Unsupported in-scope behavior remains missing gate evidence, and an excluded refusal remains a refusal. |
| R02-4: cumulative preservation | **FAIL** | Source/tooling/fixture boundaries and prior corpus hold, but KC-1/KC-6 and the alias obligations fail. |

Design-check dispositions, checked cumulatively rather than accepted from the implementer's table:

| Design check | Result | Reason |
|---|---|---|
| D01-CHK-01 | PASS | Capability preflight, exact three refusals and lost step/boundary coverage remain explicit; trusted ingress alone is not said to solve identity-before-ingress. |
| D01-CHK-02 | FAIL | The own-generation Q2b label is maintained as authorized, but its composition with exposure does not preserve visible identity differences. |
| D01-CHK-03 | PASS | Rejection memory is keyed per Execution by state/Activation/epoch. Accepted input, inspect and ordinary redelivery retain it; dispatch, accepted Outcome, takeover and cancellation clear on episode change. Cross-Execution witnesses pass. |
| D01-CHK-04 | DEFERRED | Owner choice 02 assigns acknowledgment-order repair to K2.4/E2. The witness still pins current acceptance-order projection versus cumulative acknowledgment order. No K1 implementation credit. |
| D01-CHK-05 | PASS | Effect-intent, readiness multiplicity, hold and emission projections are bounded explicitly. The independent sink ledger and whole-envelope Effect refusal remain checked. |
| D01-CHK-06 | FAIL in item 3; other items PASS | Encoder domain/golden/refusal/self-check tests, Execution scoping and Kernel-answer/refusal behavior hold. Identity-preserving alias composition fails in all three translated families. |
| D01-CHK-07 | PASS | Fake delivery is immediate without native work; grants remain keyed by attempt, clock lookup by Execution/kind/generation. Known stale timers reach the Kernel; no early-fire/Execution-deadline claim is added. |
| D01-CHK-08 | PASS | Locator and full pin/resolution contract are documented and tested; E1 enforcement is future benchmark work. |
| D01-CHK-09 | PASS | Blindness/edge controls and the five ablations are maintained; registry adoption is now complete and claims remain limited. |

The acknowledged scope limits are not new findings: in-process recovery/takeover, no native session
containment, no SDK/legacy Driver quality verdict, no K2 Effect execution, the three owner-deferred
schedules and acknowledgment order, and no independent E1 result. The canonical evidence sentence
does not implement any of these future guarantees. No mandatory in-packet obligation was left
unexamined because of the first defect; this is a bounded review, not exhaustive program verification.

## Finding K14C-R02-01 — emitted fallback strings bypass identity collision checks

**P2; mandatory adapter/claim correction.** Primary site at H:
`tests/conformance/k0-candidate/kernel-candidate.ts:230`; related sites `:150`, `:317`, `:371`;
design 02 §1; addendum 01 §A3; candidate README lines 101–117.
Governing obligations: KC-1/KC-6, R02-1/R02-4, D01-CHK-02 and D01-CHK-06 item 3.

`TimeoutNames` records command and convention names, but its exposed result
`kernel-event:${id}` is returned without reserving or checking that spelling. Laboratory names are
arbitrary strings; there is no separate type or reserved namespace at the fixture boundary. Keeping
the provenance of a failed binding does not make the final projection injective.

The independently written [probes](review-02/probes.mjs) and [observations](review-02/probes.jsonl)
demonstrate:

1. **Exposure before command, unchanged Kernel.** Fire successive waits `alpha` and `beta` under
   `taken`. The second timeout is exposed as E = `kernel-event:<second native ID>`. Fire a third wait
   under command name E. Its distinct third native ID is shown as E too. An observation contains E
   in both `acknowledged` and `queued`; dispatch and terminal dispositions carry the collision forward.
   The three native timeout IDs are distinct.
2. **Command before exposure, unchanged Kernel.** Obtain the deterministic second timeout's ID in a
   separate calibration run; use its exposed spelling as the first timeout's command name. Reuse it
   for the second timeout. Exposure equals the existing name: two distinct native IDs are again E.
3. **Changed ID on duplicate fire, fault injection.** Name the first timeout
   `kernel-event:review-drift`. A test coordinator then changes the public duplicate-fire answer and
   corresponding inspected Event ID to `review-drift`. The candidate exposes the changed identity
   under precisely the old name: **the entire Observation before and after is equal**. The same fault
   with `ordinary-name` produces an observable difference, a positive control. This faults public
   answers deliberately; it is not an allegation that the real Kernel changes the ID.
4. **Wait-generation fallback, unchanged Kernel.** Name generation 1 `kernel-generation:2`; end it,
   then offer the same name for actual generation 2. `Aliases.bind` refuses the second pair, but
   fallback `kernel-generation:2` is identical to the first name. Both live-generation observations
   have the same string; a fire using it still addresses retired generation 1, leaving generation 2
   WAITING. Design 02's statement that the plain alias case is harmless is false.
5. **Execution fallback, unchanged Kernel.** Calibrate the native ID for creation key `second-key`.
   Create `first-key` using laboratory name `kernel-execution:<that ID>`, then create `second-key`
   with the same laboratory name. The native Executions differ, but returned `executionId` strings
   are identical for the same reason.

The search also varied three successive waits, both collision orders, duplicate and ended-generation
fires, due-at-registration unnamed timeout followed by explicit naming, retention of the old label,
two Executions with the same names/generations, Unicode and `__proto__` names, and the three emitted
prefix families. The unnamed/renamed/duplicate/stale/per-Execution controls pass. The initial review
01 examples were retained by the implementation and pass; no result here depends on their specific
`to-g2` spelling, on fixture expectations, or on changing production source.

**Impact and required outcome.** The adapter can conceal the identity error it is supposed to expose,
including complete observation equality after a changed public ID. Thus the claimed structural
closure is false even though the twelve standard schedules pass. The repair needs a complete rule
for all emitted identity forms and their composition with allowed names, or a visible failure under
an explicit mapping rule. Merely choosing another prefix or adding the five literal strings to the
corpus cannot establish that rule. Preserve ordinary naming, approved conventions, all prior probes
and the five registered kills; make the new witnesses maintained tests for the corrected contract.
Reconcile current README/design/017 claims. Do not change Kernel or fixture semantics to accommodate
the adapter without a separately approved scope decision.

## Closed prior findings and deviation judgments

**K14C-R01-02 CLOSED.** The five `k14-candidate.abl-1` through `-5` entries are honest mechanism
witnesses, not semantic conformance credit. `mutations.json` edits match `ablation-table.ts` exactly;
each run first passes an unedited copy, then rejects the required first failing step and fields.
An unexpected throw/refusal/import failure or wrong failure text is invalid, not a kill.

| Case | Actual site/obligation | Rejecting witness |
|---|---|---|
| ABL-1 | Coordinator accepted-Outcome lookup disabled; OA-2 recorded duplicate response | `control-duplicate-conflicting-outcome`, step 3, `rejection: stale_exchange` |
| ABL-2 | Coordinator currency epoch guard disabled; ID-4/OA-3 stale classification | `identity-create-and-activation`, step 7, `rejection: unauthorized_submission`; grant fence still prevents commit |
| ABL-3 | Coordinator cancellation branch disabled by its unique two-line anchor; CX-6 | `control-cancel-versus-complete`, step 3, `rejection: terminal_destination` |
| ABL-4 | Coordinator readiness branch forced to ordinary selection; B-2/B-6 | `k0-trace`, step 7, batch `bq-1` instead of `cont-1` |
| ABL-5 | Outcome nonempty-Effect refusal disabled; EF-1/EF-2 whole-envelope refusal | `effect-refusal-and-sink-attribution`, step 2, the table's ten fields, including state READY |

The coverage category/family includes all five. The adoption manifest supplies the five `unread`
entries for the recomputed V-ENV / re-prototyped-built-in matches, with the released claim's provenance;
neither lexical matching nor these Kernel-decision mutants earn correction/conformance credit.
Both local runner results and the pinned CI raw entries confirm `semantic_credit: none`.

The **latest-grant witness is kept and killed by ABL-2**. The deliberately wrong adapter can pass
the twelve/three matrix while a spy observes a newer delivered grant paired with older proposal
coordinates. The genuine candidate has no such mismatch. With ABL-2, the wrong adapter loses the
expected `unauthorized_submission` discriminator and is rejected by the maintained ablation rule.
The changed helper/table layout preserves these witnesses and the five original ablation test titles.

**Deviation 2 is acceptable.** Only the standalone test probe's explicit
`--link-workspace-kernel` flag creates the absent package workspace link in the registry's temporary
copy. It verifies resolution against that copy's Kernel before import. The no-flag missing-link and
wrong-existing-link controls fail as invalid setup; the latter is not overwritten. Thus mutations
reach the copied, edited Kernel through the package root, not an unedited installed Kernel. The
candidate implementation gains no filesystem capability, and packet tools remain byte-identical to B.
This is reproducible test setup, not a waiver of KC-1 or a containment guarantee.

**K14C-R01-03 CLOSED.** `mental-model/mechanisms/evidence.md` §Attribution and gates now makes an
exclusion valid only inside the owner's approved scope recorded before capture; missing support for
an in-scope obligation stays missing evidence. Checked against 007's K1.4-candidate/K1.4-gate,
K2.4, K3.4 and milestone rows, both roadmaps, README, BASELINE §15 and 017 L-38/L-41/L-44.
The twelve-schedule K1 matrix and three refused schedules remain exact; K2/E2 still owns the latter
and D01-CHK-04; K3.4 still requires its complete core E4 gate. There is no generalized exemption.

**Deviation 4: a new design check was not mandatory for that attempted routine correction.**
Owner choice 02's permission applied to the round-1 addendum; it was not a blanket waiver for
design 02. Independently, 006 permits routine corrections inside an approved design without another
check. Brief 02 already required identity-preserving binding/projection and allowed exposure or a
visible throw. Design 02 §1 attempted that contract without changing Kernel semantics, and the
second-failure trigger had not fired before its build. I therefore do not add a procedural finding
solely because §1 lacked a check. Its structural argument is substantively false, as demonstrated
above. **A new design check is now required by the owner's stop-and-redesign choice.**

## Root cause and owner decision

006 stop-and-redesign applies: this is the second CHANGES REQUIRED in the corrected identity-naming
subsystem. It also contradicts the earlier review's assessment of the adjacent plain alias paths.

The recurring mechanism is a partial identity map presented as a complete observation map.
Addendum 01 §A3 assumed a marked Kernel spelling necessarily differs from a laboratory name.
Design 02 improved provenance for commands and conventions but retained that assumption for exposed
strings and explicitly declared the other families harmless. The earlier corpus/search checked
ordinary spellings and binding conflicts, but did not compose generated output spellings back into
the permitted command-name domain. This is a gap in the accepted design argument and the search,
not just a missing special case.

The available 006 routes were redesign with a new design check, a refined finishable claim, a split,
or an accepted recorded limit with its gate consequences. I recommended redesign of the complete
rendering/mapping boundary. **The owner selected “Redesign with a design check (recommended)” in
this review session**, recorded separately in [owner-choice.md](review-02/owner-choice.md).
This approves the route, not an implementation or a weakened claim. The Execution/generation
witnesses identify the same adapter mechanism; the next design must account for them as well.
No further patch round starts before the required new design check.

## Handoff and exact status text

Use [brief 03](review-02/brief-03.md) for the same released packet. The reviewer has made no
candidate/Kernel/fixture/tooling repair. The review branch contains only this authentic review,
its evidence/correction brief/owner-route record and the 007 status update. No third-party code,
test, asset or dependency was incorporated; review probes are independently authored against the
repository's API, and local checks use its existing locked dependencies.

Transcription: **K1.4-candidate — CHANGES_REQUESTED. Independent review 02 of H
`14a7ef485282ab2c16d08702be5d61cfeb9997e7`: CHANGES REQUIRED. K14C-R01-02 and K14C-R01-03
closed; K14C-R01-01 remains unresolved through K14C-R02-01 (P2). Owner selected redesign with a
new design check under 006. No gate/milestone acceptance or successor release.**

CHANGES REQUIRED
