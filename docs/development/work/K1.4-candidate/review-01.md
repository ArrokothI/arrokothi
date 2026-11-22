# Independent review 01 — K1.4-candidate

**Verdict: CHANGES REQUIRED**, bound to **H `484afd13d7652958f6496afc56d9aa9c098d58b1`**.
Three P2 findings remain: a timeout alias collision hidden by the Q2b fallback, the unwaived
mutation-registry deviation, and an overbroad gate-exclusion rule. The required twelve schedules
do pass, and the five Kernel ablations do fail at their named steps. Those results do not close
the remaining obligations below. K1.4-gate, the K1 milestone decision and benchmark E1 are outside
this review; none is released or accepted here.

## Identity, independence and access

| Item | Identity |
|---|---|
| Reviewer/operator | Codex desktop, GPT-6 per this session's instructions; independent review session, shell account `rex-shih`, Git author configured as `Rex-Shih`. No implementation or design-check work on this packet in this session; no subagents; no planner-notes directory accessed. |
| Date | 2026-11-15, America/New_York |
| Machine / OS | Host `MacBookAir`, arm64; macOS 26.6.2 (25G83); Darwin 25.6.0, `RELEASE_ARM64_T8103`. |
| Fresh source | `git clone --no-checkout https://github.com/ArrokothI/arrokothi.git /private/tmp/arrokothi-k14-review01-20261115`, then new branch `codex/k1.4-candidate-review-01` directly from H. The original workspace was not edited. |
| Base B | `c1951226338de6ccd3e4e6289259549551268f61`. The launcher's `c19512268` did not resolve; the owner explicitly corrected B to this full SHA in this review chat before B-dependent conclusions. |
| Payload C | `61ea8126507506b043ce5ba6515073f62c19c42f` |
| Reviewed H | `484afd13d7652958f6496afc56d9aa9c098d58b1`, also the freshly fetched `origin/claude/k1.4-candidate` |
| Runtime/install | Node **v26.10.0**, npm **11.19.1**, `/private/tmp/node-v26.10.0-darwin-arm64/bin`; `npm ci` completed, 190 packages installed. Initial sandboxed clone/install attempts failed DNS; network-enabled retries succeeded. No dependency or install-script policy was changed. |
| Design check | Read **by commit**, `e06984a9573efd1524692ab74332eb7744941bcf:docs/development/work/K1.4-candidate/design-check-01.md`, branch `codex/k1.4-candidate-design-check-01`; not merged into this review. |
| Previous implementation review | None. This is review 01 of H, not a continuation of the design check. |

The governing contract is [brief 01](brief-01.md), [release 01](release-01.md), owner choices
[01](owner-choice-01.md) and [02](owner-choice-02.md), and [design 01](design-01.md) as amended by
[addendum 01](design-01-addendum-01.md). Read [implementation 01](implementation-01.md), the
K1.4-candidate/K1.4-gate sections and rows and K1 milestone text in 007, and the applicable
006/008/012 policy at H. Owner choice 02 makes KC-3 **12 PASS, 3 REFUSED, pinned exactly**.

Architecture was resolved through the overview/reference and the Kernel/Driver, values,
execution-cycle, waits and evidence owners; the development front door and implemented baseline
separate target contracts from this in-memory implementation. The research map's canonical-bytes,
creation, fencing, timers and evidence-tooling sections were background, not acceptance evidence.
No third-party assertion or source was incorporated. Review probes were independently written;
temporary copies contain this repository's own candidate/Kernel/fixture files. Existing locked
dependencies were installed, with no added/copied/adapted third-party dependency or source.

Ownership is **test-side adapter and deterministic fake Runtime/Driver**, plus evidence wording.
No Kernel semantics or deployment claim needs changing to correct the findings.

## Revision and scope checks

[scope-check.mjs](review-01/scope-check.mjs) reproduces the checks against fixed B/C/H even after
the review is committed; [scope.json](review-01/scope.json) records the result.

- B is an ancestor of C, and C of H. **C..H is exactly** `verification.json`'s
  `administrative_files`: `docs/development/007-work-packets.md`,
  `docs/development/work/K1.4-candidate/implementation-01.md`, and that packet's `progress.md`.
  The verification spec itself is identical at C and H.
- `packages/` has the same tree object at B and H:
  **`3525377b4425feb24132a011938ce5b8fcf6cc63`**. No Kernel source, package test or manifest changed.
- The only changed fixture files are `candidate.ts`, `fixture.ts`, `protocol-vocabulary.ts`
  and `refusal.test.ts`. Comment-free TypeScript transpilation confirms identical executable
  content in the middle two; in `candidate.ts` only the refusal reason changes; in
  `refusal.test.ts` only the `describe` title changes. The title is reporting prose, with no
  assertion or verdict change. Scenarios, runner logic, sink and all other fixture tests are unchanged.
- Read the cumulative diff, including the three implementation files, all five candidate test
  files and helper, README, architecture importer list, legacy mapping, scope/limit prose and
  packet records. The importer extension names exactly the new root importers; it adds no
  Kernel-internal edge. No benchmark file changed.
- `packet_tools.py candidate --payload C --head H --spec
  docs/development/work/K1.4-candidate/verification.json` returned **`facts_verified`**;
  [candidate.json](review-01/candidate.json) is retained. This is identity evidence, not acceptance.

## Validation: independently rerun versus inspected

The existing [Packet verify run 43676796376](https://github.com/ArrokothI/arrokothi/actions/runs/43676796376)
was inspected through the GitHub connector. **No workflow was dispatched or rerun.** Job
`132698613279`'s log contains `REVISION: 61ea8126507506b043ce5ba6515073f62c19c42f`, checkout of
that exact commit, and `node: v26.10.0`; see [the log excerpt](review-01/ci-revision.log).
The workflow's own main-branch head is not mistaken for the tested revision.

Downloaded artifact `14150323794`, `packet-verify-61ea8126507506b043ce5ba6515073f62c19c42f`,
is retained as [ci-artifact.zip](review-01/ci-artifact.zip). Its SHA-256 is
`285288a5b43909affd1f19eac083beb98983fcd1eef544aa3a6c0657fe5a07b3`, matching GitHub's digest.
Its [run.txt](review-01/ci-run.txt) names both revision and head as C. Counting the actual downloaded
[summary.json](review-01/ci-summary.json) gives **19/19 passed checks**; repository tests are
**5,212**, with **0 fail/cancelled/skipped/todo**. The raw `verify.json` in the ZIP records
`selected_cases_passed` for the three registries: 339, 358 and 238 killed mutants respectively
(303, 358 and 18 cases). These are their declared tooling results, not five additional candidate
ablation registrations. The adoption check is `mappings_complete`.
[ci-inspection.json](review-01/ci-inspection.json) records the independently extracted counts.

Under Node v26.10.0 in the fresh H checkout I reran:

| Command/check | Observed result |
|---|---|
| `npm ci` | Exit 0. |
| `npm run typecheck` | Exit 0. |
| `node --test --test-reporter=tap tests/conformance/k0-candidate/*.test.ts tests/conformance/k0/*.test.ts` | **968/968 PASS**, no fail/cancel/skip/todo: 158 adapter tests plus 810 fixture tests. Includes all five ablations, all blindness/convention/encoder/locator tests and KC-4 controls. |
| `node --test --test-reporter=tap tests/conformance/architecture/kernel-landing-zone.test.ts tests/conformance/architecture/legacy-mapping.test.ts` | **222/222 PASS**, no fail/cancel/skip/todo. |
| Candidate identity command above; `node .../review-01/scope-check.mjs` | `facts_verified`; `scope_verified`. |
| `node docs/development/work/K1.4-candidate/review-01/probes.mjs` | Reproduces finding 01 and the additional mutant experiment; [output](review-01/probes.jsonl). |

The complete repository suite, registry runners and broader sweeps were **inspected at clean C
in that downloaded CI artifact**, not rerun locally. Their payload is unchanged at H. The
targeted local runs and new probes supply independent adapter evidence; they are not E1.
No SDK timing-flake reproduction, live provider, native Driver, process-death or benchmark run
is claimed. Cheap local checks are reproducible; [local-validation.txt](review-01/local-validation.txt)
retains their command/result summary rather than full TAP.

### Five ablations, independently rerun

Every row first passed on an unedited Kernel copy, matched its mutation anchor exactly once,
then failed through the unchanged fixture runner at the zero-based step below. A throw, refused
schedule or import failure was not counted as a kill.

| Ablation | Supported witness / step | Observed distinguishing change |
|---|---|---|
| ABL-1: remove accepted-Outcome lookup | `control-duplicate-conflicting-outcome`, 3 | `rejection` becomes `stale_exchange` instead of absent. |
| ABL-2: remove epoch-currency check | `identity-create-and-activation`, 7 | `rejection` becomes `unauthorized_submission`, not `stale_exchange`; the retired grant still fences. |
| ABL-3: remove CX-6 branch | `control-cancel-versus-complete`, 3 | `terminal_destination`, not `cancellation_terminal_conflict`. The two-line anchor selects exactly that branch. |
| ABL-4: bypass retired-wait selection | `k0-trace`, 7 | `dispatchedBatch` is `["bq-1"]`, not `["cont-1"]`. |
| ABL-5: remove Effect-list refusal | `effect-refusal-and-sink-attribution`, 2 | Outcome accepted: `state` RUNNING→READY; differences in all ten named fields: state, progressRevision, progress, emissions, acknowledged, queued, dispatchedBatch, activationId, receipt, rejection. |

These executions establish dependence on actual Kernel decisions. Finding 02 concerns their
required maintenance/registration mechanism, not whether these executions happened.

## Independent obligation map

| Criterion | Result | Evidence and interpretation |
|---|---|---|
| KC-1: real Kernel, faithful observations, root boundary | **FAIL** | Public-root imports, rejected-edge controls, source inspection and five ablations pass. The three implementation files import no fixture values except `FIXTURE_VERSION`; all state/control decisions come from the coordinator. But timeout alias projection violates the explicit identity/fallback contract (01), and required registry integration is absent (02). `effectIntents: []` remains the authorized Q4 exception. |
| KC-2: blind oracle | **PASS** | All 15 tripwire runs permit `id`, traversal of `steps`, and `step.command` only; other step/scenario reads throw. Altered expectations preserve only the Activation/epoch fields needed by runner adaptation and yield identical actual observations. Rename, different begin/apply schedules and unsupported-category controls pass. Bounded source review of all three implementation files finds no expectation import/read or ambient file/network/text-evaluation path. Q2b/Q3b remain declared design-time conventions, not proof of independent convention selection. |
| KC-3: exact amended verdicts | **PASS** | Per-scenario table and step counts hold: 12 PASS/91 steps; REFUSED are `control-stale-timer-and-lost-wake` (first unsupported step 2), `wait-structure-not-satisfiability` (4), `cited-decision-edges` (2), totaling 51 steps not run. Reasons are capability-based, refusals have empty ledgers, no scenario omitted. This does not certify every excluded obligation has a replacement witness. |
| KC-4: oracle discrimination | **PASS** | The 810 unchanged fixture tests keep refusal controls REFUSED, conforming controls PASS and violating candidates FAIL at their named steps, including the sink-attempt liar. Prose/title/reason edits change no assertions. |
| KC-5: locator and pin | **PASS** | Exact module/export/version, fixture mismatch refusal before any scenario read, real-path package-root resolution and README checks pass. README requires pre-import inventories/digests of fixture/candidate/loaded Kernel source, unexpected-member rejection, revision/provenance, manifests/lockfile/workspace-link resolution, versions and loader flags. Recording a SHA alone is explicitly insufficient. No new E1 loader is claimed. |
| KC-6: truthful current claims | **FAIL** | Baseline, 007 candidate/gate/K1/K2 rows, both roadmaps, README and 017 correctly carry the owner-selected 12/3 split, K2 assignments and independent-capture boundary. But evidence.md generalizes this specific scope decision into automatic exclusions at every gate (03); L-39's narrow fallback description is not fully implemented (01). |

The command path preserves producer namespace, offered coordinates, complete Effect proposals and
the grant delivered for that attempt. Unexpected control refusals throw; supported timer no-change
answers remain Kernel decisions. Clock selection is by Execution/kind/generation and monotonic;
the fake acknowledges delivery without producing an Outcome. Generation/timeout tables, rejection
memory and grant keys are per Execution. Both directions of Execution/generation alias binding
are retained; **timeout fallback is the exception found below**, despite its table being bidirectional.

Encoder review and tests cover `NaN`/infinity/undefined rejection, own `__proto__`, numeric-looking
and non-BMP key ordering, lone surrogates in values and keys, arrays, escaping and `-0`, plus the
decode/compare check. No serializer or Kernel-value repair was found in that declared domain.
This is not a hostile-realm/Proxy containment or unbounded-cost claim.

### Design-check dispositions

| Finding | Result at H |
|---|---|
| D01-CHK-01 | **PASS.** Capability preflight, rename invariance, 51 lost steps/boundary rows, future Event-identity issue and exact owner gate amendment are recorded. |
| D01-CHK-02 | **FAIL.** Normal Q2b and per-Execution witnesses pass, but a rejected explicit alias binding falls through to unnamed naming (01). |
| D01-CHK-03 | **PASS.** Exact per-Execution `(state, activationId, writerEpoch)` memory; input/inspect/redelivery retain, episode changes clear, another Execution cannot clear it. |
| D01-CHK-04 | **DEFERRED to K2.4/E2 by owner choice 02.** The older-backlog/newer-wake/older-ack-later witness pins acceptance order now; L-42 and 007 carry the later decision. It is not silently claimed implemented. |
| D01-CHK-05 | **PASS.** Q4 constant and ledger limits, bounded projections and in-memory scope are explicit; whole-envelope Effect refusal still has meaningful evidence. |
| D01-CHK-06 | **FAIL in item 3.** Encoder, per-Execution maps, response handling and original grants are sound within the checked scope; the composed timeout projection does not preserve both alias directions (01). |
| D01-CHK-07 | **PASS.** Immediate delivered acknowledgment, retained attempt grants, justified fake takeover, cancellation-request-only observation and exact timer clock convention. |
| D01-CHK-08 | **PASS.** README pin contract covers executed bytes and resolution; no benchmark implementation is implied. |
| D01-CHK-09 | **FAIL only for required registry workflow (02).** Tripwire, altered observations, test-side boundary, bounded guard claim and five reachable, named ablations otherwise pass. |

## Additional bounded search and findings

Beyond rerunning the maintained tests and inspecting the existing registry evidence, the new
search varied the interaction between **two successive wait generations in one Execution**, an
explicit timeout name already bound to another ID, and that name's equality with Q2b's generated
spelling. It also replaced attempt-specific grant lookup with a plausible latest-per-Execution
lookup in a temporary candidate copy, first across all 15 fixture schedules and then across all
158 adapter tests. An adjacent public-response fault injection changes a timeout ID on duplicate
delivery while keeping the laboratory commands identical. No source in H was mutated. Existing witnesses additionally cover two
Executions, both Execution alias directions, timeout duplicate delivery, Q3 retention/drop,
ordering projections and the encoder domain. This is a finite adapter search, not a proof over
arbitrary schedules, providers or hostile JavaScript.

### K14C-R01-01 — P2: an explicit timeout alias collision is treated as an unnamed timeout

**Location:** `tests/conformance/k0-candidate/kernel-candidate.ts:253–259`, with `Aliases.bind`
at 144–147 and the timer binding at 468. **Sources:** KC-1, D01-CHK-02 and -06 item 3;
owner choice 02 Q2b; addendum A3–A4. A conflicting binding must remain a visible identity
difference; Q2b applies only when no `deliver_timer` command named the observed timeout.

The probe creates X, registers g1/deadline 10, fires it under explicit name `to-g2`, dispatches
and acknowledges that timeout, then registers g2/deadline 20 and fires it under the same explicit
name `to-g2`. Public inspection shows **two distinct Kernel timeout IDs**, ending in `1:1` and
`1:2`. `bind` correctly declines the second name→ID pair, but returns no outcome to the caller.
`eventNames` sees only an absent reverse binding and produces `to-g2` from generation g2.
The second observation therefore reports both `acknowledged: ["initial", "to-g2"]` and
`queued: ["to-g2"]`, hiding the identity collision. This uses the unchanged real Kernel.

An adjacent probe needs no reused label across generations: it repeats the same valid g1 timer
command named `to-g1`, but injects a changed timeout ID into the duplicate fire's public answer,
mailbox and queue. The **entire returned Observation remains identical** to the first fire.
That injection models a broken Kernel identity response; it is not a claim that the real Kernel
has this defect. It demonstrates that the adapter conceals exactly the name→different-ID error
D01-CHK-06 requires it to expose, even with unchanged laboratory commands.

**Required outcome:** distinguish an actually unnamed timeout from an attempted/conflicting
explicit binding. Keep the original binding and expose the new identity (or fail visibly under
a documented mapping-error rule); do not feed an explicit collision into Q2b. Preserve normal
unnamed registration, later explicit naming, duplicate/stale fires, both alias directions and
per-Execution scoping. Add this witness and adjacent collisions to maintained tests. The root
mechanism is loss of binding provenance between `bind` and the fallback, not a Kernel timer bug.
Choosing a different prefix alone would leave the same defect family.

### K14C-R01-02 — P2: the five required ablations bypass the required mutation registry

**Location:** `tests/conformance/k0-candidate/ablations.test.ts:20–23`;
`design-01-addendum-01.md:181–187`; `017-known-limitations.md` L-44.
**Sources:** D01-CHK-09 and 012's “Maintained corpus and mutation registry”, especially line 67.

The separate test table/runner works and its kills are real, but none of ABL-1..5 is in
`tests/fixtures/packet-tools/mutations.json`. Owner choice 02 adopts the design check's required
changes and requests a named ablation plan; it does **not** waive its explicit existing-workflow
requirement. The implementer's addendum and limitation entry disclose the deviation, but are not
an owner waiver. A previous packet's similar exception does not establish one here.

**Required outcome:** register the five sites/obligations/rejecting witnesses through the existing
workflow, with any required honest hold/adoption records and no invented semantic credit; or
obtain an explicit owner amendment authorizing this maintained-test exception. Preserve the
unedited-copy control, exact-once anchors, named step/field checks and invalid-run rejection.
Do not fix this by hiding the deviation or counting these five among the existing 339 kills.

### K14C-R01-03 — P2: a specific K1 scope amendment became a universal gate waiver

**Location:** `mental-model/mechanisms/evidence.md:61`. **Sources:** KC-6; owner choice 02's
explicit K1 matrix and three named K2 deferrals; 007's gate obligations; AGENTS.md architecture
ownership and accepted-behavior rules.

The new sentence says that at **a gate**, a schedule for which the subject has no surface **is
excluded**, rather than saying that authorized exclusions must be predeclared. That changes who
decides the gate: lack of subject support becomes sufficient to remove an obligation. Applied
to K3.4, a subject lacking recovery could pre-exclude process-death schedules, despite 007
requiring the complete E4 core matrix and an owner decision. Predeclaration alone does not
authorize that weakening. Owner choice 02 authorized three specific exclusions at K1, not this
general rule. Keeping REFUSED distinct from PASS is correct but does not close the gate gap.

**Required outcome:** retain predeclared, visible, attributed exclusions while tying them to the
gate's owner-approved scope. Missing support for an in-scope obligation must remain missing gate
evidence, not automatically exempt it. Keep the specific K1 twelve-schedule matrix and three
K2 assignments in their owning ledger/roadmap. No new general exclusion policy is authorized.

### Plausible wrong candidate that passes all twelve

The temporary mutant changes only the candidate's grant lookup: instead of
`driver.grantFor(executionId, outcome.activationId, outcome.writerEpoch)`, it uses the most recent
delivered grant for the Execution. It still gets **12 PASS, 3 REFUSED, 0 FAIL**, while a public-call
spy observes submitted epoch 1 accompanied by grant epoch 2. This violates the adapter's required
attempt provenance, but the intact Kernel's earlier epoch fence masks it in the twelve schedules.

The **existing ABL-2 supplemental test kills this mutant**: removing the epoch check no longer
produces the expected `unauthorized_submission`, because the adapter repaired the grant. The
temporary candidate suite reports **157 pass, 1 fail**, with ABL-2 as the failing leaf.
Thus the search found the requested plausible twelve-schedule survivor, but it is not a survivor
of the complete packet evidence. No fourth finding is raised. Keep this reproducer as evidence
that the supplemental ablations carry information the matrix alone lacks.

This is the first implementation review, so 006's repeated-failure stop-and-redesign trigger has
not fired. Finding 01 nevertheless identifies the common mechanism and asks for its repair,
rather than another fixture-specific spelling. Finding 03 corrects overgeneralization of an
accepted owner decision without reopening that decision.

## Disposition of implementation deviations 1–8

| Deviation | Judgment |
|---|---|
| 1: ablations outside registry | **Not accepted without correction/explicit owner amendment**, finding 02. Successful local kills are acknowledged. |
| 2: generated literal-import child process | **Accepted.** Temporary copy execution preserves the existing conformance import guard. Failed load/run is invalid, not a kill; test-side access is explicitly separated from candidate imports. |
| 3: expanded ABL-3 anchor | **Accepted.** The two-line site is uniquely selected and the named reachable classification change was rerun. |
| 4: lone-surrogate member-name fix | **Accepted.** Required refusal is present at C/H and its regression runs, including nested forms. |
| 5: evidence.md sentence | **Not accepted as written**, finding 03. Updating the canonical owner is appropriate; the generalized permission is not supported by owner choice 02. |
| 6: refusal.test.ts title/header | **Accepted as reporting prose.** Independent transpilation comparison confirms assertions and behavior unchanged. |
| 7: importer-list edit without line shifts | **Accepted within this change.** Exactly named root importers, unchanged assertions and independently passing boundary tests; CI adoption is `mappings_complete`. No new claim that line-number identities are robust or that held cases earn credit. |
| 8: SDK timing flake | **Recorded, not reproduced or fixed here.** `packages/` is identical to B; pinned CI passes all 5,212. The implementer's local failure remains a K1.4 test-owner concern, not evidence that this packet fixed it. |

017 L-38/L-40–43 accurately bound the omitted steps, rejection convention, constant Effect field,
projections and fake/in-memory scope. L-39 needs its implementation brought into agreement
(01); L-44 truthfully discloses a deviation but cannot approve it (02). The bounded current-text
scan leaves historical “unimplemented” wording, the retained refusal-control name and old
architecture test labels distinguished from capability claims. Existing package-root comments
about the SDK/bridge are stale baseline prose; `packages/` is expressly unchanged/out of edit
scope here. No additional Kernel rewrite is demanded by this review.

## Correction handoff and transcription

Use [review-01/brief-02.md](review-01/brief-02.md) for the next round. Preserve this report and
its probes. Correct in the same packet with new C/H and affected validation; if the owner chooses
the registry exception, record the explicit amendment rather than inferring it from this review.
Do not start K1.4-gate or E1 as a consequence of these findings.

Exact status text for owner transcription: **K1.4-candidate CHANGES_REQUIRED at H
`484afd13d7652958f6496afc56d9aa9c098d58b1`; K14C-R01-01, K14C-R01-02 and K14C-R01-03 remain open.
KC-2/3/4/5 pass; KC-1/6 fail. D01-CHK-04 remains assigned to K2.4/E2. No gate or milestone acceptance.**

**Outcome: CHANGES REQUIRED — H `484afd13d7652958f6496afc56d9aa9c098d58b1`.**
