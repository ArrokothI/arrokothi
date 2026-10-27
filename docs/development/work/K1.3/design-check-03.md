# Bounded design check 03 — K1.3

**Verdict: APPROVED WITH REQUIRED CHANGES.** D03-CHK-01 through D03-CHK-06 below are required before the design is implemented as claimed. The successor/overlay approach is sound in principle and addresses review 02's root cause. It does not require another architectural choice. Its stated incremental predicate, transition rules and structural proof are not yet equivalent to the guarantee it advertises.

## Identity and bounds

- Subject: [design-03.md](design-03.md) at **`2a587122c928d14dda083166e7fd9cb6ca036744`**, fetched from `origin/claude/k1.3` and checked out exactly before this review's additions.
- Authority: [owner choice 04](owner-choice-04.md), option 1: retain the strong terminal-completeness guarantee and check the proposed next record before commit.
- Reviewer: independent Codex desktop session, GPT-6 per session instructions; exact serving variant not exposed. Date: **2026-10-27**. No subagents used.
- Review branch: **`codex/k1.3-design-check-03`**, created directly from the subject SHA in an isolated worktree. The recording commit's SHA is supplied in the handoff, not self-referenced here.
- Inputs examined: [review 01](review-01.md) and its guard probe; [review 02](review-02.md), its guard-search and owner-matrix probes; [brief 02](brief-02.md); [design 01 §12 and A7](design-01.md); [design 02](design-02.md); current `state.ts`, `state-records.ts`, `plan.ts`, owner-guard tests and the commit/writer analyser. Architecture was resolved through the overview/reference to core batch accounting, lifecycle and waits. Development baseline/process/review methods and the research map's plan/apply and evidence sections supplied context, not new acceptance authority.

This checks only next-record construction, P/T, writer coverage, the named counterexamples, Q6 and the proposed claim wording. **K13-1..9, owner choices 01–03 and the clock text are not reopened.** This is a design verdict, not acceptance of an implementation, a ledger update, integration or successor release. Changes belong to the Kernel's internal state-owner contract; Runtime, Driver and deployment semantics are unchanged.

## What the construction establishes

The overlay is a suitable representation of the governed next record. Resolving existing-entry writes in prepare, rejecting absent/repeated positions using `readAt`'s key semantics, and representing appends separately handles both kinds of review-02 defect. P1 scans **the overlay and its appended suffix**, so covering the old queued set cannot hide a newly queued timeout. T2 prevents writing `queued` back over that set. The shared cancellation arm covers both causes.

Copying omitted fields from the old record preserves them without copying or replacing entry/delivery identities. A fresh successor container can hold references to those identities without mutating them. “Frozen” must mean the new descriptor and its owned write/append lists, not recursively freezing shared mutable entries or delivery lists. All resolution, validation and refusal must remain in the no-existing-mutation prepare phase, before **any** write, including version/index/evidence writes. With that discipline, a *guard-refused plan* writes nothing. A host-intrinsic exception during commit is a different case (D03-CHK-06).

The writer inventory is correct at the level of record roots: creation, input, dispatch, Outcome, expiry and cancellation govern P's projection. Delivery, takeover and control alter exchange internals; settlement alters delivery rows; refusal, losing-Outcome and timer-discard alter operational evidence. They do not replace the open-exchange pointer or change P's mailbox/wait facts. Creation needs an explicit initial-record admission rule: full P before either index publishes the fresh record; the ordinary old-record transition check has no old Execution to consume.

The outstanding problem in Q1/Q4 is proving that the committed projection really equals the checked overlay, rather than merely having values with the same provenance.

## Required changes

### D03-CHK-01 — enforce value equality and complete application of the successor

**Location:** Q1 commit rule; Q4 structural enforcement.

Extending today's `commitSource` with a `next` root is insufficient by itself. In `zone-analysis.ts`, `commitSource` deliberately treats `x + <numeric literal>` as having the same source as `x`. Thus `record.registrations = next.registrations + 1` can retain the expected provenance while committing a different value. Its current conditional/loop summaries also do not prove that every required write executes exactly once: the loop summary ignores traversal bounds, and the conditional summary does not relate the condition to the checked overlay. A test witness on genuine plans is not the structural argument promised for all plans.

**Required:** use an exact-value rule for governed writes: direct matching successor member, or immutable aliases that preserve that exact value, with no arithmetic, reconstruction or alternate source. Check the applied write set, conditional presence, loop coverage/order and append multiplicity against the successor. Every changed scalar must be committed, and no unchecked governed change may occur. Require the admission call to dominate the first mutation and forbid modifying the checked successor before/during commit. Retain the current statement-order/fault-window obligations; specify how the two disposition loops consume the checked ordered writes.

The analyser must distinguish `ExecutionRecord.activation` from `ActivationRecord.activation`: the current name-only `ARM_WRITERS.activation` includes takeover, while the governed set intentionally includes only the former. Specify creation's fresh-record admission/publication exception explicitly.

**Closure:** static negative controls for `next.registrations + 1`, bypassed/missing admission, omitted scalar write, skipped disposition, duplicated append, and a plan-derived conditional that suppresses a checked change; positive controls for all six successor arms and legitimate exchange-internal takeover. These are checks of the proposed mechanism, not an expansion into general analyser hardening.

### D03-CHK-02 — make incremental P6 include the new wait's deadline equation

**Location:** Q2 P6 and its four incremental forms; Q3 T4/T6.

P6 requires each wait's `deadline` to equal its declaration's deadline. None of the four incremental forms checks that equation on a **new** live/immediately retired registration. T4 checks `registeredBy` on those paths, but copies the old deadline only when retiring an already-live wait.

Concrete typed variation: from `RUNNING`, count 0, no old wait, take a genuine live-registration Outcome for declaration deadline 5 and change only `liveWait.deadline` to 6. Generation/count remain 1, state is `WAITING`, its registering Activation is correct, and the whole batch is acknowledged. The listed incremental P6 form and T1–T6 pass; full P6 fails. For immediate expiry, mutually changing the new retirement and timeout deadlines preserves P7 while leaving the same missing declaration equality. No interrupted commit or hostile value is involved. Today's `registeredBy(...)` helper checks this equation; replacing it as proposed must not lose that check.

**Required:** check the equation for every newly installed live wait and appended retirement, and state the dependency-complete incremental check for each P clause. Include changed fields inside new objects, not just optional-object presence and generation counts.

**Closure:** live and immediate-retirement deadline/declaration disagreement controls, including a retirement/timeout pair that agrees with itself but disagrees with its declaration. Refuse before mutation and compare incremental admission with independently evaluated full P. The existing generation freshness/one-retirement/one-timeout argument otherwise holds under a valid old record and exact successor application.

### D03-CHK-03 — preserve retirement/readiness co-presence and lifetime

**Location:** Q2 P9; Q3 T5; claim that design-02 S5 is subsumed.

P9 is only `readiness ⇒ ...`; T5 constrains only a **non-null** new readiness. Take a genuine immediate-expiry Outcome and change only `readiness` to `null`. The next record is `READY`, g1 retired by deadline, with its one queued T1 and correct count/batch acknowledgment. **Full P1–P9 and T1–T6 all pass.** The same omission works for an immediate Event retirement. This field does not merely evade incremental checking: the proposed full predicate itself allows the loss.

The existing owner explicitly checks `(retired === null) === (readiness === null)` for Outcome; design 02's input guard likewise couples wake and readiness. The canonical [ending-a-wait table](../../../../mental-model/mechanisms/waits.md#ending-a-wait) makes readiness part of the retirement decision. This is preserving that established relation, not reopening Event eligibility or batch selection.

**Required:** an Event/deadline retirement in this decision must install matching readiness and `READY`; a cancellation retirement installs none. Existing readiness must be retained until dispatch consumes it or cancellation discards it. Do not require all historical retirements to retain readiness after a later dispatch.

**Closure:** independently assert refusal of missing readiness for immediate Event/deadline Outcomes and an input wake, plus valid retirement/dispatch/cancellation sequences. These cases must have an expectation independent of the presently one-way P9, or the reference oracle will bless the same defect.

### D03-CHK-04 — scope transition rules by arm and retain S1's preconditions

**Location:** Q3 T1/T3; statement that design-02 guards are subsumed.

T1's graph and “unchanged non-terminal” do not imply “dispatch requires READY.” After a legitimate ordinary empty-batch dispatch, a second dispatch can replace the open exchange while leaving `RUNNING` unchanged. P3 still holds; the other P clauses, T1 and even literal T3 (empty old batch, no acknowledgments) pass. Today's explicit `record.activation === null`/`state === READY` guards prevent this. They are not redundant consequences of P/T.

Conversely, read literally as a rule for every successor, T3 requires acknowledgment of the old open batch during ordinary **input ingress while RUNNING**. That input appends an Event, preserves the exchange and acknowledges nothing. With a nonempty old batch it would be wrongly refused. The heading “resolved exchange” suggests the intended restriction, but the table must state it and the oracle must implement it.

**Required:** retain explicit arm preconditions, or encode their equivalents in T: dispatch starts from READY/no exchange; Outcome starts from RUNNING and resolves its own current exchange; expiry retires the current live generation. Preserve existing registration-fact/retirement-cause checks unless a precise replacement proves them. Apply whole-batch T3 to the **Outcome resolving that exchange**; cancellation acknowledges none; other arms do not acknowledge or resolve the batch. Continue to allow the four operational-evidence arms on terminal records.

**Closure:** positive RUNNING input with a nonempty reserved batch; negative redispatch on RUNNING with an empty batch; wrong-state/wrong-exchange Outcome and wrong-live-generation expiry; terminal controls and evidence-arm positives. This makes S1/S4 complete within the existing arm contract, without moving plan-selection semantics wholesale into the owner.

### D03-CHK-05 — repair Q6's domain and oracle before using it as closure

**Location:** Q4 counterexample table; Q6 seeds, domains, products and oracle.

The bounded-search approach is appropriate, but the declared domain is not yet adequate or internally consistent:

1. It omits ordinary input on `R1`, the positive case that exposes T3's overreach, and RUNNING with an empty batch, which distinguishes the missing S1 precondition.
2. Review 01's mutually consistent **second** immediate expiry reusing g1 is not in the stated product. It needs a RUNNING seed after a prior retirement and simultaneous changes to count, retirement, readiness and timeout. Q6 only offers `generation + 1` for readiness and timeout; it cannot substitute the previous generation in those fields. No listed Outcome seed explicitly carries the required prior ledger. Retain the 15-case review-02 generation matrix and the original coordinated reuse case as explicit named controls, or add their exact seeds/values/products.
3. The position-matrix claim “an exact cover of 0 and 1 is accepted” conflicts with new T3. At batch `[e0]`, only acknowledgment of position 0 and terminal disposition of position 1 are valid. The original 2,257-case matrix has 12 exact covers, but **only 2** satisfy T3 (the `0`/`-0` alternatives). Preserve historical probe bytes; adapt the maintained successor test's expectations explicitly for the newly structural whole-batch rule.
4. A full `P_ref ∧ T_ref` oracle detects the incremental deadline omission, but cannot detect the missing-readiness case when its own P9 repeats the same omission. Add named independent preservation assertions from the existing guards, alongside the full predicate oracle. Verify old seed P, full post-P and T separately; record clause-specific refusals and unchanged state.
5. Freeze the actual finite generators before asserting counts/timing. As written, `liveWait` has five choices (null, genuine, generation −1/+1, another declaration), not four; other optional domains likewise do not match their product factors. With nine generator alternatives (preserving `-0` as a separate case), the length-0..3/every-split position matrix has 3,178 cases, not about 2,300; when `m = 2` duplicates an alphabet value, state whether it is deduplicated. Also define how genuine non-null templates are supplied when a base plan's optional field is null, and how retargeted plans obtain a current basis without merely failing the stale-plan check.

**Required closure:** a deterministic generator manifest and exact per-seed/base/clause counts; the above positives/negatives; fresh-generation controls for live/Event/deadline modes; and preserved review-01/02 refusal cases. Add deadline-equation variations from D03-CHK-02 and correlated variants where individually bad fields can agree with each other. Full Q6 execution/timing remains a build obligation; this check ran the smaller executable experiment below and traced the remaining families. No finite search establishes claims outside its declared domain.

### D03-CHK-06 — qualify BASELINE/L-15/L-28 to the actual proof

**Location:** Q4 concluding claim; Q5 proposed BASELINE/017 text; D1.

“A terminal record is never written again” exceeds T1 and the retained implementation. Late settlement, refusals, losing Outcomes and discarded timer fires still write operational evidence/version fields. Say **the governed lifecycle/mailbox/wait projection of a terminal record cannot be changed**, and name the operational-evidence exception.

“A plan field cannot lie past P” must mean that every governed commit value is included in the checked projection, **not** that all retained data is truthful or mutually consistent. For example, a cancellation from RUNNING can carry `record.retiredGeneration = 999` and an empty `terminalDispositions` list while actually ending the correct queued entries; P/T check cancellation presence, not those metadata relations. Likewise timeout destination/ID derivation and recorded result/receipt facts are not established by this predicate. Do not silently broaden P to all such semantics; describe its enumerated relations and retained L-15 obligations accurately.

Incremental checking is defensible with the explicit premise **the old governed record satisfies P and the preceding commits completed**. D1 correctly identifies that a partial host-intrinsic commit can invalidate that premise. A test-only full witness observes the problem; it does not restore the production induction. L-28's proposed trigger “a fault outside the declared windows” is too narrow: the note itself admits that an interruption *inside* those windows can leave a record outside P, and a later incremental check can miss the old violation.

**Required:** carry this precondition/exception into the proposed universal BASELINE and L-15 statements, distinguish guard refusal from commit failure, and describe L-28's actual lack of assurance after a P-breaking partial commit, including inside declared windows. Its trigger must include continued admission from such a record, rather than suggesting the current windows prove P preservation. Full post-checks are evidence, not production enforcement. Existing fault-policy choices are not reopened by this wording correction.

## Counterexample disposition and coverage

These are judgments of the **proposed rules**, not assertions that design 03 has shipped.

| Bounded obligation / example | Result and reason |
|---|---|
| Next-record construction; refusal writes nothing | **PASS in principle**, subject to D03-CHK-01's exact commit/admission mechanism and D03-CHK-06's commit-fault distinction. No old object needs modification to build the overlay. |
| P covers the whole governed next record and every writer | **FAIL as specified**: full P includes same-decision appends, but incremental P6 loses a conjunct; Q4's proposed provenance mechanism does not yet prove equality. D03-CHK-01/02. |
| Transition completeness / preserved S1–S5 relations | **FAIL as specified**: readiness co-presence and arm-specific transition/preconditions are missing. D03-CHK-03/04. The fresh-count/ledger induction otherwise prevents reused/skipped generations. |
| R01 duplicate cancellation `[0,0]`; overlapping complete/fail acknowledgment/end | **PASS** by constructor duplicate rejection, with P1 detecting any remaining queue. Canonical numeric-key treatment also handles `-0`/`0`. |
| R02 queued `ending`/`acknowledgment`, both terminal Outcome kinds and both cancellation causes | **PASS** by T2 and full P1. T3 additionally validates acknowledgment identity and whole-batch membership. |
| R02 terminal Outcome with same-decision timeout/readiness | **PASS** by full P1 (queued appended timeout/readiness) and P9 (readiness requires READY). This closes the old-mailbox-only proof gap. |
| R01 consistent g1 reuse; review-02 generation matrix | **PASS at the predicate level** by P6/T6 against stored count/ledger; search inclusion needs D03-CHK-05. This does not reopen the accepted design-02 freshness fix. |
| Declared Q6 search | **FAIL as specified**, D03-CHK-05. The supplemental small probe demonstrates both missed violations and an over-refused positive case. |
| L-15/BASELINE/017 claims | **FAIL as proposed**, D03-CHK-06; no current architecture/clock wording is changed by this review. |

All accessible checks in the requested scope were completed; none was abandoned after the first finding. The full implementation suites, K13-9 race search, mutation registry and CI verification are **outside this design-only check**, not newly certified or reopened here.

## Executed evidence and reproducibility

Evidence is retained in [design-check-03/](design-check-03/). Run from the repository root with Node 26.10+ and the repository's existing dependencies:

```sh
node --experimental-strip-types --no-warnings --test \
  docs/development/work/K1.3/review-01/guard-probe.test.mjs \
  docs/development/work/K1.3/review-02/owner-matrix.test.mjs \
  docs/development/work/K1.3/review-02/guard-search.test.mjs
node docs/development/work/K1.3/design-check-03/probe.mjs
```

- Supplied probes on the exact subject source: **17 tests, 9 pass, 8 expected failures**, exit 1. Review-01's six tests and review-02's two matrices/one positive pass. The eight review-02 missing-refusal failures reproduce the unchanged implementation's known defects. This is not an implementation regression caused by this review. The matrices report 2,257 position cases (12 accepted/2,245 refused) and 15 generation cases (3 accepted/12 refused). The existing clock positive was only carried with the unmodified probe, not separately reviewed.
- Independent [probe.mjs](design-check-03/probe.mjs): **exit 0**, all assertions pass. It models Q1's overlay, full P1–P9, the four stated incremental P6 forms and T1–T6 over a deliberately small set of records. It confirms the deadline mismatch, missing readiness, literal-T3 RUNNING-input refusal, RUNNING redispatch on an empty batch, terminal-timeout refusal, unchecked cancellation metadata and the position matrix's 12-versus-2 distinction. The T3 interpretation is labelled in source; these are executable design counterexamples, not a replacement implementation or an exhaustive Q6 run. Records are projections to the fields the probe uses, not loadable production plans. Their pre-state shapes are public-reachable; the metadata and successor mutations represent internal typed-plan variations, not hostile ingress claims.
- Local runtime: Node **v26.10.0**, Darwin arm64. Initial probe loading failed because the fresh worktree lacked dependencies; it was rerun after linking the primary checkout's existing `node_modules` (the lockfile is unchanged). Loader failures receive no evidence credit. No packages were installed or changed.

The new probe is independently written review evidence; no third-party source/test/asset was copied or adapted, and no dependency or service was added. No external prior-art claim is used as proof. Original historical evidence, code and architecture remain unchanged.

## Answers to the design's questions

- **D1:** approve incremental evaluation on a valid old record, with complete changed-dependency checks and the explicit completed-commit premise in D03-CHK-02/06. Do not claim a full post-state guarantee after an admitted partial-commit fault merely because the evidence witness can detect it. No new fault-containment or persistence mechanism is required by this bounded check.
- **D2:** whole-batch acknowledgment may become structural here. It directly checks the same dispositions needed for terminal completeness and preserves public K1.2 behavior. Scope it to the resolving Outcome and update the position-matrix expectations as required above.
- **D3:** the `endingAt` hint is acceptable if the owner resolves it before any mutation and verifies exact Event identity, non-timeout category and queued disposition **in the overlay**, including this Outcome's acknowledgments. It remains a hint, never the authority for the claimed Event. Appended input wakes need no old-position lookup.

The implementer can retain the successor architecture and incorporate these six bounded corrections. This conditional design approval does not close the open implementation findings: the next build must supply the corrected design, mechanism, controls and new C/H for independent acceptance.
