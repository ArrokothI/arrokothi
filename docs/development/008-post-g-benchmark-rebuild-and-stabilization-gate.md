# Post-Slice-G benchmark rebuild and stabilization gate

> **Status:** active pre-Slice-H engineering gate.
> **Baseline:** `agent-kernel` `main` at `22282ed8cf2b2ddeb82f13eb3e0b7c9712012f9b` when this plan was written.
> **Scope:** benchmark redesign, v0.8.1 stabilization, competitor hardening/build/freeze, Synthetic provider support, and a new P01-P04 evaluation campaign.
> **Role:** engineering plan, not canonical architecture.

This work intentionally sits **after the completed Slice G baseline and before Slice H**. It is not
called G.4, G.5, or another Slice-G tranche: the structured-concurrency Slice G series is already
complete. Slice H should not start until the benchmark and stabilization exit criteria in this
plan are met or explicitly waived.

Canonical ArrokothI semantics remain owned by the documents indexed from `docs/README.md`. Nothing
in this benchmark plan may redefine Execution, Event, Effect, authority, memory, confirmation, or
other kernel ontology merely to improve benchmark scores.

---

## 1. Why this gate exists

The ArrokothI v0.8.0 generation corpus produced useful evidence, but the forensic review exposed a
mixture of application deficiencies and benchmark defects that makes a larger continuation of the
same experiment the wrong next step.

The immediate decision is therefore:

1. **stop the unfinished/other 369-unit generation campaign; do not resume it;**
2. preserve any already-created artifacts as historical/aborted evidence rather than mutating them;
3. keep the completed v0.8.0 P01/P02 corpus frozen and use it only for forensic/regression evidence;
4. rebuild the benchmark as a standalone P01-P04 benchmark whose normative task definitions no
   longer depend on the old P01/P02 application repositories;
5. stabilize benchmark plumbing and ArrokothI v0.8.1 against red tests before generating a new
   comparison corpus.

The new campaign is a **new experimental artifact**. It must never overwrite, silently repair, or
regenerate the frozen v0.8.0 corpus.

### 1.1 Forensic findings that must influence the rebuild

The pre-H gate starts from these confirmed or high-confidence findings:

- the frozen v0.8.0 run provenance differs from later repository HEADs; a forensic report must use
  the run manifest's exact source identities, and a canonical new run must be reproducible from a
  clean or exactly snapshotted source state;
- P01 Structured Memory, correction supersession, out-of-order inputs, long-context retention, and
  deterministic volume arithmetic have strong positive evidence; do not redesign the kernel under
  the assumption that core state is generally broken;
- P01 application/domain context omitted benchmark-authoritative workflow/material facts and is too
  weak around ambiguous square footage and some compound questions;
- P02 application data/retrieval omitted required named-property/room facts and exact lookup;
- P02 consequential handoff needs an explicit confirmation gate and stricter user-visible outcome
  wording;
- benchmark-controlled P02 terminal outcomes were attached to the canonical trace after subject
  generation rather than injected into the subject's actual effect transport, so the model could be
  judged against an outcome it never observed;
- the controlled-outcome problem is a neutral benchmark contract issue, not an ArrokothI-only
  special case;
- the judge asked `hardRequirementViolations` to agree with hard requirement assessments but local
  validation did not enforce the invariant;
- exact grounding can fail when the judge is not shown the task's authoritative facts;
- P02 action payload correctness should be evaluated from the **actual authorized/dispatched
  payload**, not from model-proposed arguments or final state alone.

These findings define regression targets. They are not permission to tune scenarios or rubrics after
seeing new competitor outputs.

---

## 2. Non-negotiable benchmark principles

The rebuilt benchmark must preserve the following rules.

### 2.1 The benchmark task package is the authority

P01, P02, P03, and P04 become independently formalized benchmark products. After formalization, a
builder, runner, judge, or future researcher must not need the old source application repository to
understand what the task requires.

Historical source projects may be used once to derive and review a standalone task specification.
After the task version is frozen, the benchmark-owned task package is normative for that benchmark
version.

### 2.2 Build-time information and evaluation-time information are different

A subject builder sees only a declared **build-input package**. Evaluation scenarios and judge
implementation are not part of build input even if they live in the same Git repository.

The build harness must materialize a temporary workspace containing only whitelisted build files.
A builder must not receive the benchmark repository root, hidden evaluation scenario files, prior
competitor outputs, judge files, or historical judgments.

### 2.3 Hard requirements should not rely on prompt obedience when code can own them

Where a task requires deterministic state, exact arithmetic, action authorization, exact payloads,
confirmation, duplicate suppression, or outcome truthfulness, prefer schema/state/gate/authority/
executor checks over natural-language prompting.

This applies to all competitors where their architecture permits it; the benchmark itself must not
reward one framework merely for exposing more internal machinery.

### 2.4 Neutral benchmark controls must affect execution, not only post-hoc evidence

A benchmark-controlled external result such as `success`, `definite_failure`, or
`outcome_unknown` must be bound to the subject's actual terminal-action transport **before the
subject produces the response that depends on that result**.

Appending a contradictory tool result after a subject terminates is forbidden in the rebuilt
benchmark.

### 2.5 Generation and judging remain separate

Generation artifacts are immutable inputs to judging. Changing a judge prompt, model, validator,
or score aggregation must never cause subject regeneration. Changing one task/scenario/subject must
not invalidate unrelated successful generation units.

### 2.6 Canonical result is canonical

The configured canonical judge result is the benchmark result. Secondary Claude/ChatGPT/manual
review may classify TP/FP/FN/TN or diagnose the benchmark, but must not silently overwrite the
canonical judgment.

### 2.7 No post-hoc rubric repair in the primary run

Task requirements, scenario applicability, deterministic assertions, semantic judge contract,
aggregation, and weights are frozen before canonical generation starts. If the benchmark itself is
wrong, publish a new benchmark version and either rejudge only when generation evidence remains
valid or create a new generation campaign when execution semantics changed.

---

## 3. Proposed benchmark-v3 repository shape

The benchmark repository should own task specifications, evaluation scenarios, builder contracts,
frozen subject agents, runner code, compact manifests, and result summaries.

A target layout is:

```text
benchmark/
├── tasks/
│   ├── p01/
│   │   ├── task.yaml
│   │   ├── requirements.md
│   │   ├── requirements.json
│   │   ├── domain/
│   │   │   ├── facts.md
│   │   │   ├── data.json                 # optional task-specific frozen records
│   │   │   └── policies.md               # optional
│   │   ├── interface/
│   │   │   ├── state.schema.json         # when canonical state exists
│   │   │   ├── operations.json           # neutral capability/action contract
│   │   │   └── effects.json              # controlled-effect meanings when applicable
│   │   ├── builder/
│   │   │   ├── brief.md                   # exact public build brief
│   │   │   └── examples.md                # optional public, non-scoring examples
│   │   ├── scenarios/
│   │   │   ├── smoke/                     # public, legal to show during repair
│   │   │   └── evaluation/                # never exposed to builders
│   │   └── judge/
│   │       ├── mapping.json
│   │       └── deterministic.json
│   ├── p02/
│   ├── p03/
│   └── p04/
├── builders/
│   ├── codex-direct/
│   │   └── system.md
│   ├── arrokothi-037/
│   │   └── system.md
│   └── arrokothi-081/
│       └── system.md
├── subjects/
│   ├── codex-direct/<task>/<build-id>/
│   ├── agenerateor/<task>/<build-id>/
│   ├── arrokothi-037/<task>/<build-id>/
│   └── arrokothi-081/<task>/<build-id>/
├── runner/
├── schemas/
├── configs/
├── artifact-index/
└── results/                              # compact summaries/manifests, not necessarily raw corpus
```

The exact names can change, but the separation must remain:

```text
normative task spec
!= builder-visible package
!= hidden evaluation scenarios
!= frozen subject implementation
!= run artifact
!= judgment
```

### 3.1 `task.yaml`

Each task manifest should at minimum declare:

- task id and benchmark task version;
- hashes of `requirements.json`, authoritative domain data, build-input file set, scenario set, and
  judge mapping;
- the neutral subject protocol version;
- allowed/required canonical evidence channels (conversation, state, actual action payload,
  confirmation, action outcome, etc.);
- scenario ids and public-vs-evaluation classification;
- whether controlled effects exist;
- task-level aggregation policy.

### 3.2 `requirements.md` and `requirements.json`

`requirements.md` is the human-readable normative contract. `requirements.json` is the
machine-readable copy with stable requirement ids.

Each requirement should include:

```text
id
statement
severity: hard | soft
type: deterministic_state | deterministic_numeric | deterministic_action |
      grounding | safety_truthfulness | semantic_behavior | ...
applicability
preferred evidence channel
evaluation mode: deterministic | semantic | hybrid
source-of-truth reference inside the task package
```

The JSON structure should be validated. The Markdown should not be independently interpreted as a
second conflicting contract.

### 3.3 Domain facts belong to the task, not hidden in the judge

If P01 requires exact workflow ranges or safety wording, they belong in P01's public normative/domain
files. If P02 uses a six-record catalog and room facts, the full authoritative records belong in
P02's task data.

The judge receives the relevant authoritative facts for applicable grounding requirements. This
prevents a judge from calling a correct catalog answer fabricated merely because the judge was never
shown the catalog.

### 3.4 Public examples are allowed, but controlled

A task may include a small `builder/examples.md` when examples materially clarify the interface.
Every competitor sees the same examples.

Examples must:

- be declared before agent generation;
- be excluded from scoring;
- not copy hidden evaluation scenario wording or values;
- teach the contract/interface, not the desired hidden test answer.

Prefer zero or a few compact examples over task-specific few-shot prompt engineering.

### 3.5 P03/P04 formalization

The semantics of P03 and P04 are not specified in this plan because their source requirements were
not supplied here. Do not invent them from a desired ArrokothI feature or from competitor behavior.

For each of P03 and P04:

1. inventory the existing source project's externally observable requirements and authoritative
   data/actions;
2. resolve source conflicts explicitly;
3. author standalone `requirements.md/json`, domain data, and neutral operation/effect contracts;
4. review the normative package without looking at generated competitor behavior;
5. freeze the task package;
6. only then write/finalize evaluation scenarios.

After that freeze, the old source project is provenance only and is not required by the benchmark.

---

## 4. Scenario redesign

Do not mechanically port the current 20 P01 + 17 P02 scenarios and then append P03/P04. Revisit all
of them from the new standalone requirements.

### 4.1 Coverage is requirement-driven

Maintain a checked-in coverage matrix:

```text
requirementId × scenarioId × evidence type × edge-family
```

Every hard requirement should have:

- at least one normal positive case when applicable;
- at least one meaningful edge/negative case when a failure mode exists;
- deterministic coverage whenever the requirement is deterministic;
- no scenario that claims to test a requirement without providing the evidence required to judge it.

### 4.2 Required scenario families

Use only the families relevant to each task, but deliberately cover:

- happy-path completion;
- front-loaded information;
- incremental information;
- out-of-order information;
- corrections and supersession;
- long-context retention with unrelated interruptions;
- ambiguous terminology/input requiring clarification or explicit assumptions;
- invalid/out-of-range input;
- compound/multi-question turns;
- missing-authoritative-data / zero-result behavior;
- pressure to fabricate unavailable data;
- conflicting user statements;
- intent/path changes;
- optional-field refusal vs required-field refusal;
- attempts to bypass authorization or confirmation;
- consequential-action success;
- consequential-action definite failure;
- consequential-action unknown outcome;
- duplicate/post-completion action suppression;
- post-action edits;
- unsupported claims about future/world-visible outcomes;
- tool/provider failure when that failure is part of the task contract.

### 4.3 Scenario diversity

Do not create diversity by changing only names/numbers. Vary conversational topology and failure
pressure:

- one-turn vs multi-turn;
- concise vs noisy user wording;
- facts split across turns vs all at once;
- direct question vs interrupted workflow;
- corrections before and after a recommendation/action is prepared;
- user refusal, uncertainty, and adversarial assertions;
- exact lookup vs search/recommendation;
- deterministic fact request vs advisory answer.

### 4.4 Target size

Use **coverage, not a fixed count**, as the authority. A practical starting target is roughly 24-32
evaluation scenarios per task, plus a small public smoke suite. Do not inflate the suite with
near-duplicates merely because Synthetic quota is available.

Canonical full runs should initially target **three repeats per evaluation scenario per subject** so
variance is measurable with simple equal weighting. Increase repeats only by a benchmark-versioned,
predeclared rule, not after seeing one method's instability.

### 4.5 Scenario quality tests

Before real generation, add benchmark tests that prove:

- every scenario maps to known requirements;
- every referenced controlled setup can be executed before the dependent assistant response;
- deterministic expected values are recomputed from authoritative task data rather than copied from
  model output;
- all exact records/facts used by evaluation exist in the task package;
- scenario/build-input leakage checks pass;
- deliberately broken sentinel subjects are caught by the scenarios they are supposed to detect.

Sentinel defects can include stale correction state, fabricated catalog rows, missing deterministic
calculation, false action-success prose, absent confirmation, duplicate dispatch, and wrong actual
payload. These are benchmark tests, not competitors.

---

## 5. Subject protocol v2 and neutral controlled effects

The rebuilt benchmark needs a neutral subject contract richer than the current generation+turns
stdin protocol.

### 5.1 Required request surface

A subject invocation should receive neutral fields such as:

```text
protocolVersion
sessionId
generation configuration
ordered user turns
task public/runtime data reference
benchmark-controlled effect bindings, when applicable
```

A controlled effect binding identifies the neutral operation/outcome behavior. It does **not** tell
the subject which framework produced the run and does not grant model authority by itself.

### 5.2 Required response/evidence surface

Canonical evidence should be able to expose, where supported by the task:

- user-visible conversation;
- canonical committed task state;
- operation/effect request identity;
- authorization/confirmation evidence;
- **actual dispatched authoritative action payload**;
- actual action result: success / definite failure / unknown outcome / denied / duplicate suppressed;
- final task state;
- model/provider usage diagnostics.

The benchmark adapter may normalize native evidence, but must not fabricate native state or turn a
model proposal into proof of an executed action.

### 5.3 P02 controlled handoff

For a controlled P02 handoff scenario:

1. the scenario declares the neutral terminal-action result;
2. the runner binds that result to the subject adapter before execution;
3. the adapter configures the subject's fake/dry-run transport accordingly;
4. the subject proposes `lead.submit` or equivalent;
5. its real authorizer/confirmation/executor path runs;
6. the controlled transport returns success/failure/unknown;
7. the runtime/model gets the real result through its normal mechanism;
8. only then may it produce the dependent assistant reply;
9. the canonical trace records the same result and actual dispatch payload.

There must be exactly one outcome truth, not one native result plus a contradictory benchmark event.

### 5.4 Confirmation

A task requiring explicit consequential-action confirmation should represent that as an execution
condition. For P02, the target gate is conceptually:

```text
required contact facts present
AND contact preference present
AND best time present
AND explicit confirmation established for the current payload
AND no prior terminal/unknown dispatch
```

before dispatch authority is granted.

Do not solve this only by adding stronger prose to a system prompt.

---

## 6. Judge redesign

### 6.1 Deterministic first, semantic second

Use deterministic evaluators whenever canonical evidence can decide the requirement:

- exact/normalized state;
- numeric calculations;
- record identity and fields;
- action requested/not requested;
- confirmation requested/resolved;
- dispatch count;
- actual payload subset/exactness;
- action outcome;
- duplicate suppression.

The LLM judge should focus on semantic/interaction requirements and hybrid cases requiring natural
language interpretation.

### 6.2 Simplify canonical judge output

Do not ask the judge to redundantly emit fields the runner can derive.

Prefer an output roughly like:

```json
{
  "status": "completed",
  "requirementAssessments": [
    { "requirementId": "...", "verdict": "pass", "score": 5 }
  ],
  "scores": { "...": 0 },
  "rationale": "..."
}
```

The runner should inject/validate severity from the frozen requirement definition and derive:

```text
hardRequirementViolations = hard requirements whose canonical verdict == fail
```

rather than trusting a second model-generated list.

### 6.3 Grounding context

For grounding requirements, the judge prompt must contain the minimal authoritative task facts needed
to verify the claim: for example the relevant frozen property record or source-fact block. It should
not need implementation identity or old source repository files.

### 6.4 Blindness

Continue to blind method/framework identity and implementation provenance from the canonical judge.
Do not blind benchmark-controlled facts needed for correctness.

### 6.5 Aggregation

Report at least:

- deterministic hard requirement pass/fail rate;
- semantic/hybrid hard requirement pass/fail rate;
- soft requirement score;
- scenario success rate;
- repeat consistency/variance;
- per-task macro result;
- four-task macro result.

Avoid letting a task with more scenarios or requirements dominate solely by count. Primary aggregate
should macro-average task-level results under a predeclared formula.

Pairwise judging, if retained, is secondary/diagnostic rather than the authority for hard-contract
compliance.

---

## 7. Synthetic provider plan

Synthetic is a good fit for the rebuilt campaign because the current subscription plan provides UI
and API access with a large request/credit allowance and exposes OpenAI-compatible and
Anthropic-compatible APIs.

Current documentation at plan time:

- pricing: <https://synthetic.new/pricing>
- rate limits: <https://synthetic.new/rate-limits>
- API overview: <https://dev.synthetic.new/>
- models: <https://dev.synthetic.new/docs/api/models>

At plan time a $30/month subscription pack advertises 500 requests per five hours, $24 weekly API
credits, and one concurrent request per model. Treat these as external configuration that can change;
query/report actual quotas in the run preflight rather than hard-coding them into benchmark
semantics.

### 7.1 Exact model pins for canonical runs

Do **not** use a rotating `syn:` alias in a canonical benchmark run. Synthetic explicitly recommends
aliases for convenience, but reproducibility requires an exact model id in the run manifest.

Initial recommendation:

```text
subject runtime/generation model:  hf:zai-org/GLM-5.2
canonical semantic judge:          hf:Qwen/Qwen3.8-27B
```

Reasons:

- GLM-5.2 is listed as an always-on large model with tools, JSON mode, structured outputs, and
  reasoning support, making it a credible common runtime model across agent frameworks;
- Qwen3.8-27B preserves continuity with the current Qwen judge family while moving quota to
  Synthetic;
- using different model families for subject generation/runtime and judging reduces same-model
  coupling.

Before the canonical run, fetch `/models`, persist the exact provider model metadata used, and run a
feature canary. If the pinned model is unavailable, fail the canonical configuration rather than
silently fall back. A changed model is a new experiment configuration.

### 7.2 Provider implementation

Add Synthetic support in three places:

1. **benchmark runner generation/runtime provider**;
2. **benchmark judge provider**;
3. **subject/framework runtime adapters**, including ArrokothI and Agenerateor.

Because Synthetic is OpenAI-compatible, prefer a reusable OpenAI-compatible provider boundary over
baking Synthetic semantics into core ArrokothI. A thin Synthetic configuration layer may supply:

```text
base URL
SYNTHETIC_API_KEY
exact model id
supported feature declaration
quota metadata
```

ArrokothI currently has a Gemini model package only, so this is a pre-H provider-boundary addition,
not a new kernel ontology.

### 7.3 Canary requirements

Before any benchmark corpus generation, prove for the exact selected models:

- plain chat;
- multi-turn history;
- tool/function call;
- tool result round-trip;
- structured JSON judge output;
- timeout/error mapping;
- rate-limit mapping;
- usage accounting;
- model identity capture.

No benchmark task should be the first integration test for Synthetic.

---

## 8. Competitor set and build/freeze protocol

The rebuilt comparison has four subject families:

1. Codex direct-build baseline;
2. Agenerateor-generated agent;
3. ArrokothI v0.37.0;
4. ArrokothI v0.8.1 (v0.8.0 only as historical evidence, not the preferred new build target).

All runtime subjects use the same benchmark-selected Synthetic model unless a task technically
requires a different modality and that exception is predeclared for every method.

### 8.1 Common builder fairness rules

For every generated subject record:

- task build-input hash;
- builder identity/version;
- builder system-prompt hash;
- framework version/commit when applicable;
- build attempt count;
- files produced;
- build/test result;
- accepted subject source hash;
- no evaluation-scenario access.

A subject is frozen **before** hidden evaluation generation starts.

No manual task-specific patch is allowed after seeing hidden scenario results. General framework
bugs may be fixed only by starting a new builder/framework version and regenerating affected agents.

### 8.2 Competitor A — Codex direct build

The direct baseline should use Codex GPT-5.6 Sol at high/xhigh reasoning as the code builder, per the
experiment design. It receives:

- the task's public builder package;
- the common neutral subject protocol SDK/contract;
- a frozen design system prompt explaining that hard requirements should be enforced deterministically
  when appropriate;
- no ArrokothI or Agenerateor APIs;
- no evaluation scenarios or prior outputs.

Build budget:

1. primary one-shot build session;
2. optional second repair/evaluation session that may see compiler/test errors and **public smoke
   test** failures only.

The second session must not see hidden evaluation outputs. Record whether it was used.

This baseline answers: *how strong is a modern coding agent when allowed to directly implement the
requirements without a specialized agent framework?*

### 8.3 Competitor B — Agenerateor

Agenerateor should be treated as a serious competitor, not left with known framework bugs.

Its current public design describes exactly two executable product shapes: FAQ/consultation and
linear lead collection, with Web Search, Maps Search, and Send Email actions. P01 and P02 appear
naturally close to those two shapes; P03/P04 require an explicit expressibility audit rather than an
assumption.

Before freezing the Agenerateor competitor, run one **framework-general hardening round**:

1. add/configure Synthetic as the runtime model provider;
2. define a benchmark-v3 build/import path from the common task build package;
3. emit the neutral subject protocol v2 evidence needed by the evaluator;
4. support benchmark-controlled action success/failure/unknown through the real action executor
   path;
5. expose actual dispatch payload + confirmation + outcome evidence;
6. verify correction, persistence, and duplicate behavior with deterministic tests;
7. audit P03/P04 expressibility.

If P03/P04 expose a genuine general Agenerateor bug or a reasonable missing capability inside its
intended product scope, fix it **before** the competitor version is frozen. If a task requires a
fundamentally different topology outside Agenerateor's declared product model, do not add a
P03/P04-specific hack merely for the benchmark; record the structural limitation.

After hardening, freeze the Agenerateor commit, generate P01-P04 once from the public task packages,
and freeze the generated agents in `benchmark/subjects/agenerateor/...`.

### 8.4 Competitor C — ArrokothI v0.37.0

The old SDK is recoverable from Git history.

Known history:

```text
b6a3b382c36d5b9e0dafbeb48f4fb0c98cc5a837  "v0.37.0"
05a4fcb0b2d2020ae862cabf9422399d507f77a8  later adds stable v0.37 P01/P02 benchmark subjects
```

Use the actual v0.37.0-era SDK in a detached worktree/package snapshot. The later P01/P02 subject
commit is useful historical reference but should not be exposed to the new agent builder because it
contains task-specific prior implementations.

Generate **new P01-P04 v0.37 agents from the rebuilt public task packages**, preferably with the same
Codex builder discipline used for the v0.8.1 framework build. This makes the comparison about what
the two SDK generations let a strong builder construct, rather than comparing a hand-maintained old
subject against a newly formalized benchmark.

Freeze the resulting subject source and the exact v0.37 framework/package artifact needed to build
it.

### 8.5 Competitor D — ArrokothI v0.8.1

Before agent generation, complete the v0.8.1 stabilization red tests described in Section 12.

Then:

1. freeze the v0.8.1 SDK commit/package artifact;
2. provide the same public P01-P04 task build packages to the controlled builder;
3. provide current ArrokothI public docs/API guidance, but not hidden scenarios;
4. build each task agent;
5. allow only compiler/public-smoke repair under the same recorded build budget;
6. freeze the source in the benchmark repository.

The current hand-built P01/P02 examples remain regression evidence for v0.8.1; they should not be the
only new benchmark subjects if the goal is a clean P01-P04 builder comparison.

---

## 9. Frozen agent artifacts inside the benchmark repository

Agent source should live in the benchmark repository. A frozen subject directory should contain only
what is required to audit/rebuild/run it, for example:

```text
subjects/arrokothi-081/p02/<build-id>/
├── subject.json
├── BUILD_REPORT.md
├── builder-input.json
├── package.json
├── package-lock.json
├── src/
└── tests/                 # public/build-time tests only
```

`subject.json` should include:

```text
subject id
method/framework/version
source hash
builder identity and prompt hash
build-input hash
framework/package artifact hash
runtime protocol version
build command
run command
Synthetic provider capability declaration
createdAt
```

Do not commit `node_modules`, caches, model transcripts containing secrets, or mutable external state.

### 9.1 Framework dependency freeze

A frozen subject source that depends on an unpinned moving local checkout is not actually frozen.
For each framework-based subject, pin one of:

- exact package versions + lockfile when packages are durably available;
- content-addressed `npm pack` tarballs;
- a content-addressed source/package bundle referenced by the subject manifest.

For v0.37 especially, preserve the exact buildable package artifact so future evaluation does not
require reconstructing a large mutable Git history by hand.

---

## 10. Git vs external artifact storage

Keep **specs, scenarios, frozen subject source, manifests, and compact summaries in Git**. These are
small, reviewable, and benefit from ordinary version control.

The current benchmark repository is still modest enough that four tasks and four subject source sets
should not by themselves require external storage. The likely growth problem is raw conversations,
large traces, attempt logs, judge outputs, packaged dependencies, and repeated full campaigns.

### 10.1 Recommended policy

Start with Git for the benchmark definition and frozen agent source. Use content-addressed object
storage for heavy raw artifacts once campaigns become large.

Preferred external store: an S3-compatible bucket such as **Cloudflare R2** (or equivalent S3/
Backblaze storage). The benchmark should not depend on a vendor-specific API beyond an S3-compatible
artifact port.

Git retains an artifact index:

```json
{
  "sha256": "...",
  "size": 123456,
  "mediaType": "application/zstd",
  "storage": "r2://arrokothi-benchmark/sha256/ab/<hash>.tar.zst"
}
```

Suggested commands:

```text
npm run artifacts:pack   -- --run <run-id>
npm run artifacts:push   -- --run <run-id>
npm run artifacts:pull   -- --run <run-id>
npm run artifacts:verify -- --run <run-id>
```

A local developer with all artifacts already present needs no storage service to inspect/run them.

GitHub Releases may be used for milestone snapshot archives, but should not be the primary
high-churn per-unit cache. Avoid Git LFS unless ordinary Git + object storage proves insufficient;
LFS adds clone/CI/recovery friction without solving experiment indexing by itself.

---

## 11. Resumable generation and content-addressed caching

The new runner must make a failed unit cheap. No failure in one P01/P02/P03/P04 scenario should
force unrelated completed work to regenerate.

### 11.1 Two identities: experiment and generation unit

The experiment manifest describes the intended campaign. Reuse happens at **unit** granularity.

A generation-unit cache key should be derived from only the inputs that can affect that unit, such
as:

```text
task spec/data hash
scenario hash
scenario controlled-setup hash
frozen subject source/build hash
subject adapter/protocol hash
exact runtime model id + generation config
repeat index / declared seed semantics
```

Do **not** make the whole experiment fingerprint the only reuse key.

Consequences:

- adding P04 does not invalidate completed P01 units;
- changing one P02 scenario invalidates only that scenario's units;
- rebuilding ArrokothI v0.8.1 does not invalidate Codex/Agenerateor/v0.37 units;
- changing the judge does not invalidate generation at all;
- changing only a result summary does not invalidate anything.

### 11.2 Canonical successful bundle

Write a successful unit transactionally and finalize it with checksums/completion metadata. Once
complete, treat that bundle as immutable content-addressed evidence.

Retries/failed attempts live separately and never replace a completed unit unless the cache key
changes.

### 11.3 Failure behavior

Classify failures:

```text
retryable provider/transient
quota checkpoint
subject deterministic build/runtime failure
benchmark adapter failure
schema/evidence invalid
terminal configuration error
```

A terminal failure should mark that unit failed and allow independent units to continue when safe.
A systemic configuration failure may stop the campaign, but resumption should start from the
remaining/mismatched units rather than regenerating all completed units.

Required CLI ergonomics:

```text
--dry-run
--resume
--retry-failed
--task <id>
--method <id>
--scenario <id>
--repeat <n>
--no-regenerate
--verify-only
```

The status command should explain **why** each unit is hit/miss/failed and which hash component
changed.

### 11.4 Build cache is separate from runtime cache

Agent generation/build is expensive and should have its own content-addressed artifact identity.
Once a subject is accepted and frozen, runtime benchmark failures must never trigger an automatic
agent rebuild.

---

## 12. v0.8.1 and benchmark red-test queue

Write these tests before fixes and verify each is red for the expected reason.

### Benchmark / harness

**B-01 — frozen provenance reproducibility**

A canonical campaign cannot claim an exact source identity from an unrecorded dirty source tree.
Require a clean commit or an exact patch/snapshot identity.

**B-02 — controlled outcome reaches execution before dependent response**

A fake subject/adapter running a controlled failure/unknown scenario must observe that outcome in its
actual action executor before it generates the dependent assistant reply.

**B-03 — ArrokothI080/081 P02 controlled transport mapping**

The neutral controlled outcome must map into the P02 fake transport; no post-hoc contradictory
terminal action event is accepted.

**B-04 — judge hard-fail invariant**

A result where hard assessment verdicts and the reported hard-fail set disagree must be impossible:
either reject it or derive the set in code.

**B-05 — grounding context completeness**

A judge evaluating a frozen-record claim receives the relevant authoritative task record. A known
correct Greenwich Townhouse-style fixture must not be judged fabricated due to missing source data.

**B-06 — actual payload evidence**

Canonical P02 evidence exposes the authoritative payload that was actually dispatched, distinct from
model-proposed arguments and final lead state.

**B-07 — per-unit cache reuse**

Changing/adding an unrelated task/scenario/subject does not invalidate an already-completed unit with
identical unit inputs.

### P01 application/integration

**P01-01 — standalone source facts**

The built agent receives all normative P01 workflow/material/safety facts from the task package; no
old source project is required.

**P01-02 — ambiguous project square footage**

A phrase such as a generic `300 sq ft project` does not become definitive wall area unless the
benchmark task explicitly establishes that meaning. The agent clarifies or states a bounded
assumption before deterministic volume.

**P01-03 — compound exact sizing**

When exact wall area/thickness are valid and a compound question also asks domain/advisory facts, the
deterministic volume path still runs and the answer addresses all required parts without inventing
packaging/inventory.

### P02 application/integration

**P02-01 — explicit consequential confirmation**

Name + phone + contact preference + time alone do not authorize dispatch; an unconfirmed submit is
denied, then the same current payload can be authorized after explicit confirmation.

**P02-02 — truthful result wording**

Delivered means team receipt only; failed means non-completion; unknown remains unknown. No state may
promise that the visitor will actually be called/texted at a specific time unless a separate
real-world action proves it.

**P02-03 — room fact exists**

The standalone P02 authoritative data contains required named room facts such as the Skyline
Penthouse Grand Salon size when that remains part of the new requirement set.

**P02-04 — exact named-property lookup**

The property capability supports exact named lookup instead of forcing the model to guess through a
location/filter search.

**P02-05 — actual handoff payload**

A corrected lead produces an exact current dispatch payload; stale values are absent; evaluator reads
that payload from transport/execution evidence.

### Kernel disposition rule

Do **not** add a core red test merely because an application prompt/data model failed. Use:

```text
A/B/C -> agent-kernel core test
D/E   -> generated subject/application/integration test
G/I   -> benchmark runner/adapter/judge-validation test
```

No current forensic evidence justifies a broad redesign of core Structured Memory or Execution
semantics.

---

## 13. Campaign phases

### Phase A — retire old active generation

- stop the unfinished 369-unit campaign;
- preserve its current status/artifacts and mark it aborted/superseded without rewriting raw units;
- keep v0.8.0 completed corpus immutable;
- record the new benchmark-v3 effort under a new experiment lineage.

### Phase B — standalone task specification

- formalize P01 and P02 from their current frozen contracts, resolving known source conflicts;
- formalize P03/P04 independently from their source requirements;
- create task package schemas and build-input whitelists;
- review/freeze task versions.

### Phase C — scenario/evaluator redesign

- build the requirement × scenario coverage matrix;
- rewrite/review P01/P02 scenarios rather than mechanically porting them;
- create P03/P04 scenarios;
- add deterministic assertions and controlled-effect setup;
- add sentinel benchmark tests;
- freeze benchmark-v3 evaluation contract.

### Phase D — runner + Synthetic plumbing

- subject protocol v2;
- neutral pre-execution controlled effects;
- actual dispatch-payload evidence;
- Synthetic provider for subject runtime and judge;
- exact model identity capture;
- quota preflight/checkpointing;
- per-unit content-addressed cache;
- artifact pack/push/pull/verify path.

### Phase E — competitor hardening

- one Agenerateor general hardening pass;
- restore/test v0.37 SDK artifact;
- complete v0.8.1 red-test stabilization;
- freeze framework commits/package artifacts.

### Phase F — build and freeze agents

For each P01-P04 task:

1. Codex direct build;
2. Agenerateor generation;
3. ArrokothI v0.37 build;
4. ArrokothI v0.8.1 build;
5. compiler/public-smoke repair only under declared budget;
6. freeze subject source/manifests in benchmark Git.

No hidden evaluation is run until all four methods for the task are frozen.

### Phase G — non-scoring pilot

Use public smoke/canary scenarios to:

- verify Synthetic reliability and actual quota/credit consumption;
- verify every frozen subject launches from a clean checkout;
- verify action controls and trace evidence;
- verify judge structured output;
- estimate full-campaign scheduling.

Do not tune task behavior against hidden evaluation during this pilot.

### Phase H0 — canonical benchmark-v3 generation and judge

This is deliberately named H0 **inside this plan only as a campaign step, not ArrokothI Slice H**.
To avoid ambiguity in implementation issues/commits, prefer the name `campaign-full`.

- generate all P01-P04 × four subjects × canonical repeats;
- preserve per-unit artifacts transactionally;
- freeze generation manifest;
- run deterministic evaluation;
- run canonical blind Synthetic Qwen semantic judge;
- produce per-task and macro summaries;
- run secondary forensic review only after canonical results are frozen.

---

## 14. Suggested first full-run scale

If the final suite lands around 24-32 evaluation scenarios per task, four tasks × four subject
families × three repeats yields roughly 1,152-1,536 generation units. A unit may contain multiple
model requests, so request quota rather than unit count is the scheduling constraint.

Do not assume the $30 Synthetic subscription makes all of this instantaneous. Use the actual
subscription quota endpoint/usage accounting and checkpoint continuously. The design goal is that
quota exhaustion is merely a resumable schedule boundary, not a reason to regenerate prior work.

Run order should be interleaved/round-robin across methods within a task where practical so a
provider incident does not systematically affect only the last competitor. Preserve exact
configuration and timestamps for diagnosis.

---

## 15. Exit criteria before ArrokothI Slice H

This pre-H gate is complete when all of the following are true.

### Benchmark definition

- P01-P04 each have a standalone normative task package;
- no build/evaluation path requires the old P01/P02/P03/P04 application repository;
- requirement ids, domain facts, interfaces, scenario mapping, and evaluation modes are frozen;
- scenario coverage and sentinel tests pass;
- hidden evaluation is excluded from builder workspaces by test.

### Harness/judge

- controlled outcomes are execution-time truths, not post-hoc trace edits;
- actual action payload, confirmation, and outcome can be evaluated when required;
- judge hard-fail derivation is internally consistent;
- grounding requirements receive authoritative task evidence;
- deterministic requirements are not unnecessarily delegated to the LLM judge;
- per-unit cache/resume tests prove unrelated units are reusable.

### Providers

- Synthetic runtime and judge canaries pass against exact pinned models;
- quota/model identity is captured in manifests;
- no silent model fallback exists in canonical runs.

### Competitors

- Codex direct-build protocol is frozen;
- Agenerateor general hardening is complete and its benchmark commit is frozen;
- v0.37.0 buildable SDK/package artifact is recovered and frozen;
- v0.8.1 red-test stabilization is complete;
- P01-P04 subjects for all four methods are frozen in benchmark Git with build provenance.

### Storage/reproducibility

- every frozen subject rebuilds from a clean checkout;
- heavy artifacts can be packed/verified and, if external storage is enabled, pulled by content
  hash;
- a failed scenario does not force unrelated units to regenerate;
- old v0.8.0 and aborted 369 artifacts remain unchanged.

### Evidence

- at least one complete non-scoring end-to-end P01-P04 smoke campaign passes infrastructure checks;
- the canonical benchmark-v3 campaign can then run as a new immutable experimental artifact.

Only after this gate should Slice H portable-schema/service-descriptor work become the main
architecture track again.

---

## 16. Immediate execution order

The next concrete work should be:

1. snapshot/mark the old 369 campaign as stopped without mutating completed units;
2. create benchmark-v3 task package schemas and the build-input sandbox rule;
3. formalize P01/P02 standalone requirements/domain data;
4. gather and formalize P03/P04 source requirements;
5. redesign the four scenario sets and coverage matrix;
6. write benchmark red tests B-01 through B-07;
7. implement Synthetic provider canaries and provider adapters;
8. implement neutral controlled-effect injection + actual-payload evidence;
9. harden Agenerateor;
10. restore/freeze v0.37;
11. finish v0.8.1 red tests/fixes;
12. build/freeze all P01-P04 competitor agents;
13. run public smoke campaign;
14. freeze benchmark-v3 and start the new canonical campaign.

This order intentionally delays expensive API generation until the task contract, scenario quality,
subject artifacts, provider plumbing, and resumability guarantees are all stable.
