# Benchmark provider, quota, and source-audit corrections

> **Status:** active correction to [`008-post-g-benchmark-rebuild-and-stabilization-gate.md`](008-post-g-benchmark-rebuild-and-stabilization-gate.md).
> **Applies to:** the pre-Slice-H benchmark rebuild/stabilization gate.
> **Supersedes in 008:** fixed model recommendations, proactive local RPM/TPM pacing assumptions, and the P03/P04-direct-formalization sequence.

This note records three corrections discovered immediately after the initial benchmark-rebuild plan.
Where this note conflicts with `008`, this note wins until the two documents are consolidated.

## 1. Model selection is policy-driven, not model-name-driven

Do not predeclare one fixed judge model such as Qwen3.8-27B, and do not predeclare one fixed subject
runtime model such as GLM-5.2 before the benchmark workload and current Synthetic catalog are
measured.

The selection principle is:

```text
harder task / harder semantic judgment -> stronger model
simpler deterministic or smoke work     -> cheaper/faster model when quality is sufficient
```

For framework comparison, all competitors for the **same task and benchmark tier** must receive the
same runtime model/configuration unless a modality difference makes that impossible and the
exception is declared before results are seen.

Model choice should optimize these dimensions in order:

1. correctness/capability for the task;
2. latency and throughput;
3. subscription request-weight consumption;
4. subscription weekly-credit consumption;
5. context window and tool/structured-output capability;
6. reproducibility/availability for the run.

The canonical judge should be chosen by a small predeclared calibration set containing clear pass,
clear fail, grounding, tool/action truthfulness, and ambiguous-language cases. Choose the least
expensive/fastest model that is reliable enough for that judge contract; move to a stronger model
when the task requires it. Do not choose a judge merely to preserve historical model lineage.

At canonical-run start, freeze the exact resolved model identity in the manifest. Model selection may
be revisited for a **new** benchmark configuration when Synthetic rotates models.

## 2. Synthetic billing and quota safety

Current Synthetic documentation describes the $30/month subscription as all-inclusive for always-on
models, subject to three subscription limits:

- a weighted five-hour request allowance;
- a weekly API-credit allowance;
- per-model concurrency.

At the time of this correction, one subscription pack advertises 500 weighted requests per five
hours, $24 weekly API credits (slightly more than $102/month of regenerated value), and one
concurrent request per model. Both request and credit allowances regenerate incrementally rather
than resetting only at one large boundary.

Important billing distinction:

- with subscription limits exhausted and **usage fallback disabled**, Synthetic returns HTTP 429;
- Synthetic also offers a **usage fallback** billing toggle; when enabled, traffic may fall through
  to usage-based per-token billing after subscription limits are exhausted instead of stopping at
  the subscription limit.

Therefore canonical benchmark runs must use this safety rule:

```text
usage fallback MUST be disabled unless the experiment explicitly authorizes paid overage
```

Do not depend on a UI warning before overage. Current public documentation exposes a billing UI and a
`GET /v2/quotas` endpoint, but does not guarantee an automatic warning before paid fallback would be
used. The runner should protect itself.

### 2.1 Required quota preflight

Before a real run:

1. operator confirms subscription/usage-fallback policy;
2. runner calls `/v2/quotas` and records the visible quota state;
3. runner records the selected model metadata/pricing/weight information available from `/models`;
4. runner refuses an explicitly no-overage canonical run when the declared billing safety state is
   not satisfied;
5. secrets and billing credentials are never written to run artifacts.

`/v2/quotas` calls do not count against subscription limits according to Synthetic documentation, so
polling it is preferable to guessing quota state locally.

## 3. Reactive rate-limit handling; no slow proactive RPM/TPM scheduler

Do not reproduce the old local RPM/TPM token-bucket scheduler if it materially under-utilizes the
provider.

The desired benchmark behavior is **provider-driven bursting**:

```text
send work as fast as the provider/concurrency contract allows
        ↓
provider accepts -> continue immediately
provider queues same-model concurrency -> let it queue or keep local concurrency at the declared cap
HTTP 429 -> pause/react to the provider signal, then retry the same benchmark unit
```

Rate-limit handling rules:

1. do not intentionally pre-sleep between ordinary successful requests;
2. on 429, honor a reliable provider `Retry-After`/retry hint when present;
3. if no reliable retry hint exists, wait approximately one minute, re-check `/v2/quotas`, then
   retry the same unit;
4. do not turn a 429 into a failed benchmark repeat;
5. every retry reacquires quota and remains inside the same repeat;
6. if repeated quota checks show the weekly-credit boundary is exhausted, checkpoint rather than
   busy-looping for hours;
7. transient 5xx/network failures still use bounded backoff separate from quota pacing.

Synthetic's documented subscription regeneration is not classic RPM/TPM: five-hour request quota
regenerates in increments and weekly credits regenerate on a longer cadence. The one-minute retry is
therefore a reactive probe, not a claim that every quota resets in one minute.

## 4. Provider responsibility vs context engineering

Switching from Gemini/Groq-hosted Qwen to Synthetic does **not** mean ArrokothI must newly invent the
whole application context/prompt layer.

The current provider-neutral ArrokothI contract already passes a compiled model request containing:

```text
system
messages
tools/capabilities
structured-output requirements
resolved model
sampling/output limits
```

The provider adapter is responsible for translating that portable request into the provider's wire
format, invoking the API, mapping tool calls/structured output/usage, and normalizing transport and
quota failures.

The **semantic context engineering remains an ArrokothI/controller/application concern**:

- which memory/state enters context;
- which conversation turns are retained/projected;
- which capabilities are visible;
- what system instructions are compiled;
- what observation an authorized Effect returns to the model;
- compaction/working-note strategy when needed.

Synthetic's OpenAI-compatible Chat Completions endpoint still receives the conversation as
`messages` plus optional `tools`/structured-output parameters. Synthetic/model serving handles the
model tokenizer/chat template/inference details; it is not a persistent application conversation
store that replaces ArrokothI state/context compilation.

The preferred implementation is therefore a **generic OpenAI-compatible model-provider adapter**
with Synthetic deployment configuration rather than Synthetic concepts in core. It should preserve
the same provider-neutral request semantics already used by Gemini.

Strands may still own its framework-native invocation/snapshot/tool-call conversation mechanics, but
ArrokothI must continue intercepting consequential calls before native execution so provider changes
do not bypass Harness authority.

## 5. P01-P04 local source projects must be audited before benchmark formalization

P01, P02, P03, and P04 are local source projects. Do **not** directly copy them into the benchmark
and declare their current implementation to be the normative benchmark contract.

The correct sequence is:

```text
local source project
    ↓ source-only audit
candidate product contract + authoritative facts + ambiguities + implementation defects
    ↓ independent adversarial review
resolved benchmark task specification
    ↓ freeze public build package
scenario design + evaluator mapping
    ↓ freeze hidden evaluation
build/freeze competitor agents
```

This matters because an existing implementation can contain both intended requirements and bugs. A
bug must not silently become a benchmark requirement simply because it exists in source code.
Conversely, requirements present in docs/data but missing from the current implementation must not be
lost.

### 5.1 Recommended two-model audit workflow

Use the restored Claude Code and Codex quotas before benchmark implementation.

**Round 1 — primary source audit**

Have one coding agent inspect each local project independently using the same audit template. It may
read the project's source, tests, docs, fixtures, prompts, schemas, and authoritative data, but not
the new hidden benchmark scenarios or competitor outputs.

For each P01-P04 it produces one report with:

1. externally observable product purpose and user journey;
2. explicit requirements with source evidence;
3. authoritative domain facts/data and their source locations;
4. state fields, corrections/supersession semantics, and required persistence;
5. tools/actions/effects and exact input/output meanings;
6. consequential-action authorization/confirmation/outcome semantics;
7. deterministic computations and normalization rules;
8. unavailable-data/refusal/grounding behavior;
9. known or suspected implementation bugs that must **not** be promoted to requirements;
10. conflicting/ambiguous source statements requiring a human decision;
11. candidate edge-case families and observability needs;
12. proposed public build inputs vs source material that should remain provenance only.

**Round 2 — independent adversarial review**

Have the other coding agent read the same local project plus the Round-1 report and try to falsify
it. It should report omitted requirements, unsupported claims, source conflicts, accidental
implementation-as-spec assumptions, missing action/state evidence, and edge cases the first audit
missed. It should not rewrite the task to favor ArrokothI.

This is more useful than spending both quotas generating two full independent benchmark suites.

### 5.2 Benchmark formalization starts only after the audits

After both reports exist, reconcile them into:

```text
requirements.md
requirements.json
domain/facts.md and/or data.json
interface/state.schema.json when needed
interface/operations.json
interface/effects.json when needed
OPEN-QUESTIONS.md for unresolved human decisions
```

Only resolved/frozen task specifications should drive hidden scenario creation.

P01/P02 existing benchmark requirements remain valuable forensic input, but the local source audits
must verify which facts are truly product requirements and identify any previous benchmark
assumptions that should be removed or rewritten. P03/P04 should follow the same process rather than
being treated differently merely because they are new to the standalone benchmark.

## 6. Revised immediate order

The pre-Slice-H execution order is now:

1. stop/preserve the old 369 campaign without mutating completed evidence;
2. audit local P01-P04 source projects with the common source-only audit template;
3. independently adversarially review those four audit reports;
4. reconcile/freeze standalone P01-P04 task specifications;
5. build requirement-to-scenario coverage matrices and redesign all four scenario suites;
6. write benchmark/harness red tests;
7. add the generic OpenAI-compatible/Synthetic provider path;
8. add quota preflight and reactive 429/checkpoint handling, with paid fallback disabled for
   no-overage canonical runs;
9. implement neutral controlled-effect injection and actual-dispatch evidence;
10. harden Agenerateor generally;
11. restore/freeze v0.37;
12. finish v0.8.1 stabilization;
13. choose runtime/judge models by calibrated task difficulty, speed, request/credit consumption,
    and billing safety; freeze exact resolved identities only when the run configuration freezes;
14. build and freeze all P01-P04 competitor agents;
15. run public/non-scoring provider + subject smoke tests;
16. freeze benchmark-v3 and start the new resumable canonical campaign.

The central rule is: **do not spend large Synthetic quota until source contracts, hidden scenarios,
provider behavior, billing safety, and per-unit resumability are all stable.**
