# Post-reconciliation benchmark normalization and case-authoring gate

> **Status:** active pre-Slice-H execution note.
> **Checkpoint:** benchmark repository `ArrokothI/benchmark` at `ccf07ecb2b8f94bb83981a4568a5cd980c31df8f` when this note was written.
> **Applies to:** the same post-Slice-G / pre-Slice-H benchmark-and-stabilization gate established by [`008`](008-post-g-benchmark-rebuild-and-stabilization-gate.md) and corrected by [`009`](009-benchmark-provider-and-source-audit-corrections.md).
> **Supersedes operationally:** the old immediate-order/status wording in `008`/`009`. Those documents remain useful rationale and provider/quota policy, but this document is the current execution checkpoint.
> **Role:** engineering coordination note, not canonical kernel architecture.

This is **not** Slice G.4/G.5 and does not begin Slice H. Slice G is complete. The project is still inside the scoped stabilization/benchmark gate that must finish before Slice H becomes the main architecture track.

Canonical kernel semantics remain owned by the documents indexed from [`../README.md`](../README.md). Benchmark requirements must not be used to redefine Execution, Event, Effect, authority, memory, confirmation, or any other kernel concept merely to improve scores.

---

## 1. Current checkpoint

The source-audit and reconciliation phase is substantially complete.

Completed work:

1. the unfinished old 369-unit campaign remains stopped and historical artifacts remain immutable;
2. P01/P02 frozen v0.8.0 evidence remains forensic/regression evidence only;
3. all four local source projects (P01-P04) received a source-only audit and an independent adversarial review;
4. the eight audit/review artifacts are preserved in `benchmark/docs/audit-results/` and are not rewritten as truth;
5. benchmark-v3 now has an explicit `Benchmark -> Task -> Case -> Subject -> Repeat -> Generation Unit -> Evaluation` hierarchy, readiness states, builder allowlisting, structured requirements/cases, resumable unit identity, and CLI discovery/validation foundations;
6. P01, P02, P03, and P04 each have a benchmark-owned reconciliation log, source lock, public normative specification, and builder brief;
7. all four task manifests currently report `ready-for-case-authoring`; no public or hidden cases have been authored yet;
8. the shared evidence vocabulary gained a provider-neutral `provider-request` channel distinct from `provider-usage`, because provider-input privacy cannot be proven from usage diagnostics;
9. P04 received an additional post-reconciliation consistency pass that removed accidental implementation-as-spec assumptions around optional fields, duplicate suppression, confirmation, failure/unknown handoff language, and voice provenance.

The immediate next phase is therefore **cross-task normalization before case authoring**, not another source audit and not immediate large-scale scenario generation.

---

## 2. Important task-specific unresolved items

`ready-for-case-authoring` does not mean every real-world/source question is solved. It means the currently reconciled task surface is coherent enough to design cases that do not depend on unresolved questions.

### 2.1 P01

- The exact 2024 IRC appendix letter (AU vs BL) remains `UNRESOLVED-HUMAN`.
- It is deliberately excluded from current normative requirements/facts, so current P01 cases must not grade a specific appendix letter.

### 2.2 P02

Two non-blocking unresolved items remain:

- rent/sell behavior versus a catalog whose structured records are purchase-priced only;
- whether an explicit visitor confirmation step precedes the lead-notification dispatch.

**Important correction to older planning language:** the old v0.8.0 forensic finding that P02 would benefit from a hard confirmation gate is an application/stabilization finding, not proof that the rebuilt standalone P02 product contract source-authoritatively requires confirmation. The reconciled benchmark currently does **not** grade confirmation either way. Do not silently reintroduce the old benchmark assumption during case authoring.

### 2.3 P03

Two non-blocking unresolved items remain:

- which visitor-associated email should receive the generic receipt when multiple candidate addresses appear;
- whether case-summary content must follow one exact historical field taxonomy versus a content-sufficiency contract.

The reconciliation added `P03-DEC-031` for the generic `provider-request` evidence-channel fix. At this checkpoint, `p03/task.yaml` still says the decision log has 30 entries while the reconciliation correctly contains 31; the next cross-task normalization pass should repair this manifest bookkeeping mismatch without reopening substantive P03 semantics.

### 2.4 P04

P04 is intentionally only the text conversational assistant plus its lead-notification effect. Full product coverage would require separate future protocols/tasks for the rendered website/image/route surface and, if desired, real-time voice.

Current unresolved items:

- general correction/retraction semantics beyond the narrower pre-dispatch stale-value rule;
- whether the source-prescribed generic `consultant will follow up` handoff wording remains permissible after a controlled `definite-failure` or `unknown` dispatch outcome.

The second item is non-blocking for general case authoring but **blocks finalizing any case whose pass/fail criterion specifically depends on that phrase under failure/unknown outcomes**.

P04 also intentionally does **not** make duplicate suppression normative: no source document establishes such a guarantee. Confirmation is likewise **not benchmark-required**, but a subject is not forbidden from adding a confirmation step.

---

## 3. Cross-task normalization is the next gate

Before writing actual P01-P04 cases, perform one independent cross-task review of the four reconciled benchmark-owned specs.

This review should not reopen source archaeology by default. Its job is to answer:

1. Do equivalent concepts use equivalent schema/evidence semantics across P01-P04?
2. Are any implementation-only behaviors still accidentally exposed as normative requirements?
3. Are any BENCHMARK POLICY rules mislabeled as SOURCE-NORMATIVE, or inconsistently applied across tasks?
4. Does every requirement declare evidence that a neutral harness can actually observe?
5. Does every builder receive every authoritative fact needed to pass later evaluation?
6. Are operation lifecycle concepts used consistently (`operation-request != confirmation != authorized-action != dispatched-payload != effect-outcome`)?
7. Are success/failure/unknown semantics task-specific where the source differs, rather than mechanically copied from another task?
8. Are hard/soft and deterministic/semantic/hybrid classifications coherent enough for a shared evaluator?
9. Are task-manifest readiness notes/counts internally correct?
10. Can the case schema express every intended case family without adding task-specific hacks?

The review may make narrow benchmark-v3 generic changes only when a genuine cross-task representation gap is proven with a failing generic test first.

Do **not** create hidden scenarios during this review.

---

## 4. Case-authoring sequence after normalization

After the cross-task review is accepted, proceed in this order.

### 4.1 Freeze a reconciled-spec baseline

Record/freeze the exact benchmark commit containing:

- all four task manifests;
- reconciliation/source-lock artifacts;
- structured requirements;
- public facts/data;
- operation/effect contracts;
- builder briefs;
- shared evidence/schema vocabulary.

This is the **case-authoring baseline**, not yet the canonical generation freeze.

### 4.2 Define one common coverage-matrix convention

Before writing scenario prose, define the machine-readable or checked-in mapping needed to express:

```text
requirement id
x case id
x applicability
x evidence channel(s)
x edge family
x deterministic/semantic evaluator ownership
```

A case may pressure several requirements, but applicability must be explicit. Hard-fail derivation must be mechanical from hard failed applicable requirements; do not maintain an independent hand-authored hard-failure list.

### 4.3 Design coverage before case count

Use requirement coverage as the authority, not a target number. The earlier rough 24-32 evaluation cases per task remains a starting heuristic only.

For each applicable hard requirement, seek:

- at least one normal/positive case;
- at least one meaningful edge/negative pressure when a realistic failure mode exists;
- deterministic assertions where the requirement is deterministic;
- evidence availability sufficient to judge the requirement.

Do not instantiate unresolved branches as if they were settled requirements.

### 4.4 Author public smoke and hidden evaluation cases separately

Public smoke cases teach protocol/contract use and may be used for compiler/runtime repair.

Hidden evaluation cases must not leak through:

- builder briefs/examples;
- competitor build workspaces;
- source-audit/reconciliation prose exposed to builders;
- previous competitor outputs;
- judge files.

### 4.5 Adversarially review the case suite before subjects see it

Run a separate review looking for:

- test leakage;
- duplicated/near-duplicated scenarios;
- missing requirement coverage;
- impossible evidence assumptions;
- benchmark-policy drift;
- cases that accidentally grade an unresolved source question;
- task-specific framework advantages;
- deterministic checks that should replace semantic judging.

### 4.6 Use deliberately broken sentinel subjects

Before a canonical competitor campaign, verify the suite catches known classes of bad behavior. Sentinel defects should be chosen from the **reconciled** task requirements, not inherited blindly from the old P01/P02 suite.

Potential examples include stale correction state, fabricated authoritative records, missing deterministic arithmetic, premature/unauthorized dispatch where the task actually requires a gate, wrong dispatched payload, false delivery prose, leaked provider-input PII, missing full transcript, or missing exact required disclaimer.

Do not include a sentinel defect for a behavior that the reconciled task intentionally does not require (for example, P04 duplicate suppression or P02 confirmation under the current task version).

---

## 5. Controlled effects and evidence rules remain mandatory

The earlier benchmark defect still stands: a controlled external outcome must affect the subject's **real execution path before the dependent assistant response**.

Canonical evidence must distinguish, when applicable:

```text
conversation
committed-state
deterministic-computation
operation-request
confirmation
authorized-action
dispatched-payload
effect-outcome
dispatch-count
provider-request
provider-usage
```

The benchmark must never infer:

```text
model-proposed arguments == authorized action
assistant claim           == dispatch
SMTP/API acceptance       == inbox delivery
provider usage            == provider request content
```

A task may legitimately omit channels it does not expose. Absence of an effect is not itself an `effect-outcome` observation.

---

## 6. Current execution order from this checkpoint

The current pre-H order is:

1. cross-task normalize/review the reconciled P01-P04 specs and repair only demonstrated inconsistencies;
2. freeze the reconciled-spec/case-authoring baseline;
3. define/freeze the common coverage-matrix and case-authoring conventions;
4. design P01-P04 requirement-to-case coverage matrices;
5. author public smoke + hidden evaluation cases without generated competitor outputs in view;
6. adversarially review the cases/evaluator mapping and add benchmark red tests/sentinel subjects;
7. finish neutral controlled-effect injection, actual-dispatch evidence, and any other harness work required by the cases;
8. add/finish the generic OpenAI-compatible provider path and Synthetic deployment configuration;
9. add quota preflight + reactive 429/checkpoint behavior with usage fallback disabled for no-overage canonical runs;
10. harden Agenerateor generally, without task-specific hidden-test tuning;
11. restore/freeze the v0.37 baseline subject source and finish v0.8.1 stabilization/red tests;
12. calibrate runtime and judge model tiers, then freeze exact resolved model identities/config only for the canonical run configuration;
13. build and freeze all P01-P04 competitor subjects from the public builder packages only;
14. run public/non-scoring provider + subject smoke tests;
15. freeze benchmark-v3 cases/evaluators/subjects/run config and start the resumable canonical campaign;
16. only after the pre-H exit criteria are satisfied or explicitly waived should Slice H become the main architecture track.

Some engineering items in steps 7-11 may proceed in parallel once the task/case interfaces they depend on are stable, but **large Synthetic quota spend and canonical subject generation remain blocked until the benchmark contract and per-unit resumability are frozen**.

---

## 7. Model/tooling policy for the remaining design work

Use model strength according to task difficulty/cost rather than as a fixed identity:

- source-heavy reconciliation/spec drafting: a strong document/repository model such as Sonnet 5 high is appropriate;
- cross-task benchmark architecture/schema/runtime review: GPT-5.6 Sol high is the default;
- xhigh reasoning is an escalation when high produces a concrete unresolved architecture/reasoning problem, not the default;
- canonical runtime/judge model identities are selected later by calibration and frozen in run config, per [`009`](009-benchmark-provider-and-source-audit-corrections.md).

This is an execution-cost preference, not part of the benchmark contract.

---

## 8. Exit criteria for the case-authoring sub-gate

Before moving from case authoring to competitor build/freeze, require all of the following:

- P01-P04 normalized specs pass schema/leakage/readiness validation;
- no known manifest/reconciliation bookkeeping mismatches remain;
- every scored requirement is covered by declared cases or explicitly documented as not applicable/unscored for this benchmark version;
- no case grades a currently unresolved human question;
- deterministic expectations derive from authoritative task data/rules;
- controlled effect outcomes are injectable before dependent responses;
- actual dispatched payload and effect outcome are separately observable where required;
- provider-input privacy requirements can inspect normalized `provider-request` evidence;
- builder materialization contains no hidden cases/provenance/judge/competitor outputs;
- sentinel bad subjects fail where expected;
- judge applicability/hard-fail invariants are mechanically enforced;
- generation and evaluation cache identities remain separate and per-unit resumability tests pass.

---

## 9. Relationship to 008 and 009

Read the documents in this order for pre-H benchmark work:

1. **`010` (this document): current checkpoint and immediate order**;
2. **`009`: provider/model/quota policy and why source audits were required**;
3. **`008`: original forensic rationale, benchmark principles, controlled-effect defect history, subject/campaign plan**.

When old wording conflicts with a reconciled benchmark task package, the reconciled task package wins for that benchmark task version.

In particular, do not treat older forensic recommendations such as a P02 confirmation gate or generic duplicate suppression as automatically normative in the rebuilt tasks. They may remain valid application-hardening ideas or regression hypotheses, but task requirements come from the reconciled benchmark-owned contract.

The central rule remains:

> **Do not spend large Synthetic quota or generate the canonical competitor corpus until the benchmark contract, hidden cases, evidence semantics, provider behavior, billing safety, and per-unit resumability are stable and frozen.**
