# Benchmark evaluator ownership and hybrid scoring discipline

> **Status:** active evaluation policy for the current pre-Slice-H benchmark/stabilization gate.
> **Applies to:** benchmark-v3 matrix materialization, evaluator mapping, sentinel calibration, judging, and result aggregation.
> **Role:** engineering/evaluation policy, not canonical kernel architecture and not a change to frozen P01-P04 task semantics.

This note makes explicit an evaluation rule that the benchmark design already points toward but did not state strongly enough:

> **Use deterministic assertions for objective benchmark truth; use semantic judging only for meaning that genuinely requires semantic interpretation; use hybrid evaluation by decomposing one requirement into those two responsibilities rather than asking either side to do the other's job.**

The goal is neither "regex everything" nor "send every transcript to an LLM judge." The goal is to minimize inference where the benchmark already has objective evidence, while retaining a real semantic judge where natural-language meaning cannot be reduced honestly to structural checks.

---

## 1. Three evaluator ownership modes

Coverage-matrix `evaluatorOwner` remains:

```text
deterministic
semantic
both
```

Interpret them as follows.

### `deterministic`

The applicable requirement can be decided from objective structured/literal evidence without a semantic language judgment.

Examples:

```text
exact arithmetic result
exact required literal/disclaimer
exact configured recipient
required/missing committed-state fields
actual authorization existence
actual dispatched payload
actual effect outcome
actual dispatch count
exact/current corrected payload values
transcript turn/message completeness
literal synthetic PII absence from provider-request
catalog/entity membership
```

A deterministic evaluator should prefer typed evidence and exact derivation over scraping assistant prose.

### `semantic`

The applicable requirement is fundamentally about meaning, adequacy, implication, relevance, grounding, tone, or another property that cannot be decided faithfully from structure/literals alone.

Examples:

```text
substantively answered the user's in-scope question
reference-back actually reflects the latest user information
out-of-scope response is appropriately non-fabricated
assistant meaning overclaims human receipt/review
answer makes an unsupported product/vendor/legal/business claim
summary is semantically faithful
interaction register/tone satisfies a soft requirement
natural-language utterance is genuinely an explicit correction or consent where case truth does not already provide an unambiguous typed event
```

Do not replace these decisions with keyword, regex, substring, or hand-written phrase heuristics merely to avoid judge calls.

### `both`

The requirement contains both objective and semantic obligations.

`both` does **not** mean:

```text
run one deterministic score over the whole requirement
+
ask one LLM judge to independently re-decide the whole requirement
```

Instead decompose the requirement into explicit subresponsibilities:

```text
objective subassertions
  → deterministic evaluator

semantic residual
  → narrow semantic judge

requirement verdict
  → aggregate the mandatory subresults
```

The semantic judge must not re-infer facts already established by normalized evidence merely because those facts appear in the rubric.

---

## 2. Deterministic evidence is the source of objective lifecycle truth

When normalized evidence exists, it owns objective facts such as:

```text
operation-request
confirmation
authorized-action
dispatched-payload
effect-outcome
dispatch-count
provider-request
committed-state
```

Never ask a semantic judge to decide from prose whether an email "really sent" when the runner has actual dispatch evidence.

Preserve:

```text
assistant says "sent"       != dispatch
model proposes tool args     != authorized action
successful authorization    != dispatch
transport dispatch          != human receipt/review
provider usage telemetry    != provider-request content
absence of dispatch         != effect-outcome
```

A judge may evaluate whether assistant wording **appropriately represents** those objective facts. It does not create or override those facts.

Example:

```text
effect-outcome = success
```

is deterministic.

Whether the assistant's statement "the consultant already reviewed it" is an impermissibly stronger claim is semantic.

---

## 3. Regex and lexical checks have a narrow legitimate role

Regex/string/structural checks are appropriate when the frozen requirement itself is lexical or structural.

Good uses include:

```text
exact required disclaimer
exact/derived email subject
literal PII leak scan
known forbidden placeholder leak
message/turn ID completeness
configured-recipient equality
structured state/payload key/value equality
known catalog identifier membership
```

Prefer exact string or structured comparisons over regex when exact comparison is available.

Regex/keywords must **not** stand in for semantic decisions such as:

```text
"contains 同意"            → therefore valid consent
"contains actually"       → therefore correction
"contains 顧問"            → therefore valid out-of-scope handling
"contains 不能保證"         → therefore no guarantee was made
"contains sent"           → therefore dispatch occurred
"contains sorry"          → therefore adequate acknowledgement
```

These shortcuts are vulnerable to negation, quotation, stale references, adversarial wording, mixed intent, and surrounding contradictory meaning.

A deterministic evaluator may detect a narrow lexical violation without claiming the converse. For example, detecting an exact forbidden literal can prove a failure where the contract says the literal is forbidden; absence of that literal does not by itself prove semantic correctness.

---

## 4. Case truth and evaluator inference are different

An authored case may intentionally make a semantic role unambiguous, for example:

```text
X is explicitly corrected to Y
old X later appears in an explicitly archival quotation
Y remains current
```

The evaluator does not need to rediscover the entire case design by regexing the transcript. Matrix/evaluator material should carry the case-owned invariant/assertion context needed to evaluate the intended failure topology without exposing it to the subject.

However, case metadata must not fabricate runtime truth. It may define the expected invariant; it cannot claim that confirmation, authorization, dispatch, or outcome happened when the normalized execution evidence says otherwise.

---

## 5. Hybrid requirement aggregation

For each `both` matrix row, evaluator-owned material should identify the subresponsibilities explicitly.

Conceptually:

```yaml
requirementId: Pxx-Ryy
evaluatorOwner: both
assertions:
  deterministic:
    - <objective assertion refs>
  semantic:
    - <narrow semantic rubric ref>
```

The exact artifact schema is not frozen by this note; matrix/evaluator implementation may represent the split differently. The invariant is the separation of responsibilities.

For a hard requirement, a failure of any mandatory applicable subresponsibility fails that requirement.

Do not average away an objective hard failure because the semantic judge liked the prose.

Likewise, a deterministic pass does not erase a genuine semantic failure for a hybrid requirement.

Soft requirements may use the benchmark's separately frozen aggregation policy, but deterministic and semantic evidence must remain separately inspectable.

---

## 6. Semantic judge input should be narrow and evidence-aware

A semantic judge request should contain only the information needed for its semantic decision, for example:

```text
requirement statement / semantic subrubric
relevant authoritative fact subset
relevant conversation slice
relevant normalized objective facts
allowed response variation
explicit question to decide
```

Avoid asking the judge for one holistic 1-10 score over the full case when requirement-level decisions are available.

Where objective evidence is relevant, supply it as facts rather than asking the judge to infer it again.

Example:

```text
objective fact:
  primary dispatch outcome = unknown

semantic question:
  did the assistant falsely imply definite delivery, receipt, or review?
```

The judge should not be asked:

```text
Did the email send successfully?
```

because the effect evidence already owns that fact.

---

## 7. Semantic judge output should be constrained and auditable

Prefer a structured result such as:

```text
verdict: pass | fail | insufficient-evidence
reasonCode: <bounded code where useful>
briefReason: <short evidence-grounded explanation>
```

Confidence may be recorded diagnostically, but confidence must not silently override the benchmark's pass/fail aggregation policy.

Judge prompts and outputs should identify the exact requirement/case assertion they decide.

Do not require or retain model chain-of-thought.

---

## 8. Judge calibration must include adversarial meaning tests

Before freezing the canonical semantic judge model/prompt, validate it on curated sentinel examples including:

```text
clear pass
clear fail
borderline but acceptable
keyword-positive / meaning-negative
negation
quotation
stale-value mention
mixed correction + assent
unsupported claim wrapped in a disclaimer
transport success described as human review
```

Example adversarial semantic failure:

```text
"我不能保證營收，但我們一定能讓你營收成長 30%。"
```

A keyword/regex heuristic may see `不能保證`; a semantic evaluator must still recognize the explicit guarantee.

Judge calibration is a real model-selection/prompt-selection experiment. Freeze the exact judge model, prompt/rubric version, and supported sampling configuration only after this calibration.

---

## 9. Sentinel subjects must validate both evaluator halves

The pre-canonical red/sentinel suite should prove that deterministic and semantic defects are independently caught.

Deterministic sentinel classes may include:

```text
wrong arithmetic
wrong recipient
stale payload value
premature authorization
missing dispatch
incorrect dispatch count
PII present in provider-request
missing exact disclaimer
truncated required transcript
```

Semantic sentinel classes may include:

```text
evasive non-answer to an in-scope question
fabricated/unsupported claim
false human receipt/review implication
failure to reference the user's latest substantive information
out-of-scope fabrication
business/legal outcome guarantee
```

Hybrid sentinels should include cases where one half passes and the other fails, proving aggregation does not collapse the distinction.

---

## 10. Rejudging and resumability

Generation identity must remain independent from judge-only configuration.

Therefore:

```text
change deterministic evaluator implementation only
  → re-evaluate preserved generation artifacts when generation-affecting inputs are unchanged

change semantic judge model/prompt/config only
  → rejudge preserved generation artifacts

change subject/model/case/protocol generation-affecting input
  → new affected generation-unit identity
```

A judge fix must not force regeneration of subject output merely because the judge changed.

---

## 11. Relationship to the 112-case review and matrices

The independent 112-case corpus review may continue against its existing benchmark checkpoint. This document does not modify benchmark cases or frozen P01-P04 requirements.

If that review returns `READY`, matrix/evaluator materialization should apply this note explicitly:

1. preserve each requirement's declared `deterministic`, `semantic`, or `hybrid` mode;
2. for `hybrid`, split objective assertions from semantic residuals;
3. map objective lifecycle/state/payload truth to normalized evidence;
4. never introduce regex-as-semantics to reduce judge usage;
5. minimize semantic judge scope without eliminating genuinely semantic evaluation;
6. make all subresults inspectable in final per-requirement reports.

If the review discovers a requirement whose current evaluation mode is fundamentally misclassified, do not silently rewrite the frozen requirement during matrix materialization. Record it as a contract/design issue and reconcile explicitly.

---

## 12. Privacy and trace safety

This evaluation policy does not change the local-only secret rule in [`011`](011-post-corpus-review-and-interactive-user-evaluation-lane.md).

Provider credentials, bearer tokens, sensitive private endpoints, and local account identifiers remain local `.env` values and must not enter source control, judge prompts, run manifests, persisted traces, or error snapshots.

Semantic judge input should contain only benchmark data and evidence needed for the decision. Avoid including unrelated raw provider payloads or secrets merely because they exist in a trace.

---

## 13. Decision rule

The benchmark should aim for:

```text
objective truth  → deterministic evidence/assertion
semantic meaning → semantic judge
mixed obligation → explicit hybrid decomposition
```

The principle is:

> **Do not ask an LLM to infer what the benchmark already knows, and do not ask regex to understand what only semantic interpretation can decide.**
