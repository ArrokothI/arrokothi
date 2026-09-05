# Benchmark subject-build isolation and runtime boundaries

> **Status:** active pre-Slice-H coordination note.
> **Benchmark checkpoint:** `ArrokothI/benchmark` at `2c609bb75c8da1cc349de687c0a90b0f5e179d1e` (`feat: implement normalized evidence and controlled effects harness`).
> **Agent-kernel checkpoint:** `57733491973346a4cc06ab344a7e4d8b795fe904` when this note was written.
> **Applies to:** provider/runtime implementation, framework stabilization, subject generation, and canonical benchmark execution after the controlled-effect/evidence harness gate.
> **Role:** engineering/evaluation coordination, not canonical kernel architecture.

This note tightens the operational boundary established by `008`-`012`. It does not redefine kernel semantics. Its purpose is to make the competitor-build experiment resemble normal commercial development while keeping evaluation data, credentials, and hidden benchmark machinery out of the builder and subject.

---

## 1. Current checkpoint

The fixed P01-P04 benchmark definition is now substantially complete:

- 112 scored cases are authored;
- the case-authoring semantic baseline is frozen;
- canonical coverage matrices and evaluator mappings are frozen;
- controlled-effect injection and normalized evidence capture have been implemented and tested with deterministic in-process doubles;
- P01-P04 remain generation-blocked pending downstream runtime/readiness work;
- no canonical provider/model/judge campaign has begun.

The next implementation gate is the provider-neutral runtime plus quota/429/resumability layer. Subject building follows only after the runtime boundary and framework versions are stable enough to freeze.

---

## 2. Natural client-build experiment

The canonical subject-building process should model this ordinary workflow:

```text
client requirements / product data
        +
framework source + public documentation
        ↓
strong coding agent
        ↓
production-like runnable application
```

The coding agent should not be told that the application is being built for a benchmark or hidden evaluation. It should be asked to implement a normal production-quality client application from the supplied requirements and integration contract.

The builder may use normal engineering aids:

- the complete frozen framework checkout/package it is building on;
- public framework source code;
- public framework manuals, `AGENTS.md`, `CLAUDE.md`, skills, guides, examples, and tests;
- task/public product requirements and authoritative product data;
- ordinary SDK/integration documentation;
- generic framework few-shot examples;
- compiler/type/test output;
- public/non-scoring smoke failures when the declared build budget permits repair.

In particular, an ArrokothI builder is allowed to traverse the frozen ArrokothI repository and discover any framework manuals/skills prepared there. This is desirable: the experiment should measure how naturally a strong coding agent can use the framework as a real developer would.

---

## 3. Builder-blindness boundary

The coding agent must never receive the benchmark repository root or any evaluation-only material.

Builder-visible material may include:

```text
public product requirements/specification
public authoritative product/domain data
public integration/runtime contract
framework checkout/package
framework public docs/manuals/examples/skills
public build-time tests and smoke tests
```

Builder-hidden material includes:

```text
evaluation cases / hidden user turns
case ids when they reveal evaluation topology
coverage matrices
requirement applicability matrices
evaluator mappings
semantic judge prompts
sentinels / red-subject definitions
case-authoring and normalization review artifacts
prior competitor outputs or scores
hidden-case failures
expected outcome/assertion oracles
judge/provider credentials
```

The benchmark should materialize a temporary allowlisted client workspace instead of granting the coding agent repository-root access.

A public requirement may of course describe commercially necessary behavior that is also evaluated. What must remain hidden is **how evaluation is performed**, which cases exist, which requirement is pressured by which case, and what hidden oracle/assertion will judge it.

Do not add benchmark-specific hints such as "hidden tests will check..." or "this benchmark expects...". The builder prompt should sound like ordinary client implementation work.

---

## 4. Frozen subject ownership

Framework implementation remains owned by its framework repository/package. Frozen runnable subject applications belong in the benchmark repository.

Target shape:

```text
benchmark/subjects/
  codex-direct/<task>/<build-id>/
  agenerateor/<task>/<build-id>/
  arrokothi-037/<task>/<build-id>/
  arrokothi-081/<task>/<build-id>/
```

Each subject should preserve enough information to rebuild/audit/run it without depending on a moving local checkout:

```text
subject manifest
builder identity/config hash
builder-visible input hash
framework/version/source/package hash when applicable
source hash
runtime command/protocol compatibility
source/config/prompt/tool definitions
dependency lock or content-addressed framework package reference
public/build-time tests
build report
```

Do not use the old arrangement where canonical generation reaches into a mutable framework repository and runs an application that lives there. Framework repositories may retain regression/examples, but canonical subjects are frozen benchmark artifacts.

A manual change to a frozen subject creates a new subject/build identity and source hash. Never mutate an already-frozen canonical subject in place.

---

## 5. Runtime boundaries

Keep three concerns separate.

### 5.1 Benchmark orchestration runtime

Lives in `ArrokothI/benchmark` and owns:

```text
case loading
current-turn delivery
controlled-effect installation
subject process lifecycle
normalized evidence collection
provider gateway/configuration
quota / 429 policy
per-generation-unit checkpoint/resume
run manifests
```

It must remain framework-neutral.

### 5.2 Subject/framework runtime

Lives in the frozen subject and its pinned framework dependency. Framework-native state, authorization, effects, tools, memory, and application logic remain real framework behavior. The benchmark adapter may normalize native observations but must not fabricate them or implement hidden grading logic.

### 5.3 Provider transport

The benchmark chooses the canonical provider/deployment/model configuration, but provider calls should pass through a legitimate framework/provider seam.

Prefer a benchmark-owned local OpenAI-compatible gateway when practical:

```text
subject/framework
      ↓ OpenAI-compatible request
benchmark local provider gateway
      ↓ quota / evidence / sanitized errors
real provider (for example Synthetic)
```

This gateway may own the real provider credential and expose only an ephemeral local credential/token to the subject. It must not bypass framework behavior that is material to the architecture being evaluated.

If a framework is hard-coded to one provider, make a framework-general provider abstraction improvement before freezing that competitor rather than monkey-patching private framework internals from the benchmark.

---

## 6. Secret and environment isolation

Local benchmark secrets belong only in ignored local environment configuration or an external secret store.

Recommended split:

```text
benchmark/.env                     # local, ignored, real secrets only
benchmark/.env.example             # committed names/placeholders only
benchmark/configs/...              # committed non-secret provider/model/quota policy
```

The coding agent gets no real runtime provider credential at build time.

At generation time, the benchmark runner must launch the subject with an explicit environment allowlist. Never forward the whole benchmark process environment. In particular:

- generation subjects must never receive judge credentials;
- subjects should not read `benchmark/.env` as a file;
- canonical subject commands should not load the benchmark root `.env` themselves;
- provider auth headers/tokens must never enter normalized `provider-request` evidence;
- benchmark-relevant synthetic PII in provider-visible content must remain observable, consistent with the normalized-evidence contract.

---

## 7. Subject-visible runtime information

A subject should see only information a normal commercial application could legitimately observe at that moment.

Subject-visible examples:

```text
current user turn
public/runtime product data
its own committed/native state
its legitimate tools/actions
provider configuration exposed through the runtime contract
actual effect result after an actual dispatch boundary
```

Host-only examples:

```text
hidden future turns
case id / requirement ids when unnecessary to application execution
coverage/applicability/evaluator mappings
expected evaluation outcome
hidden oracle values
judge configuration
controlled future effect result before dispatch
```

Future user turns must be delivered turn-by-turn, not preloaded into the subject. Controlled effect outcomes remain unavailable until the actual dispatch boundary, as proved by the harness.

---

## 8. ArrokothI builder manual

Before freezing the current ArrokothI competitor, it is reasonable to prepare a strong framework-only AI-builder manual/skill package from ArrokothI source and canonical public docs.

Possible public assets include:

```text
AGENTS.md
docs/using-arrokothi/**
skills/arrokothi-builder/SKILL.md
thin CLAUDE.md pointer to the canonical builder guidance
```

The manual may explain generic framework construction patterns such as Agents, Structured Memory, Effects, authorization, confirmation, providers, workflows, testing, and common application recipes.

It must be produced without P01-P04 hidden evaluation material and reviewed for both technical accuracy and evaluation leakage. Once accepted, freeze its content/hash before subject generation. The coding agent may freely traverse the framework checkout and discover/use these materials.

Other competitors do not require equivalent hand-authored manuals. A strong coding agent may use the framework's ordinary public source/docs. Record builder identity and build budget so later comparisons can distinguish framework effects from builder effects.

---

## 9. Updated downstream order

After the normalized-evidence harness checkpoint, use this order:

1. implement provider-neutral/OpenAI-compatible runtime/provider gateway;
2. implement no-overage quota preflight, reactive 429 handling, and per-generation-unit checkpoint/resumability;
3. prove live provider-request/provider-usage capture through the real runtime boundary without starting a canonical campaign;
4. prepare/review/freeze ArrokothI AI-builder guidance as a framework-only public asset;
5. perform framework-general Agenerateor hardening/provider abstraction and current ArrokothI stabilization; restore/pin the historical v0.37 framework artifact;
6. freeze exact framework/package/manual checkpoints used by builders;
7. materialize isolated client-like builder workspaces and build/freeze P01-P04 subjects from public builder material only;
8. run compiler/public/non-scoring smoke repair within the declared build budget only;
9. calibrate runtime and semantic-judge model tiers; freeze exact canonical resolved model/configuration;
10. perform the explicit benchmark task-readiness/baseline transition to `ready-for-generation` without changing frozen semantics opportunistically;
11. run the resumable canonical fixed campaign;
12. keep the interactive-user lane diagnostic/non-blocking as specified by `011`.

Do not use hidden evaluation failures to repair a frozen subject. General framework defects discovered before subject freeze may be fixed by creating a new framework/version checkpoint; after freeze, any such change requires a new subject identity/campaign decision rather than silent mutation.

---

## 10. Immediate implementation gate

The immediate next implementation pass is **provider-neutral runtime + quota/429/resumability**. It may add the interfaces needed later for isolated subject launching and environment allowlisting, but it should not yet:

- build real P01-P04 competitor subjects;
- create the ArrokothI builder manual;
- call hidden evaluation cases through real models;
- calibrate/freeze judge models;
- advance task readiness;
- begin the canonical campaign.

Clean exit verdict for that pass:

```text
READY TO STABILIZE/FREEZE FRAMEWORKS + BUILD SUBJECTS
```

If the real provider/runtime path exposes a contradiction in the frozen evidence contract, stop and report the smallest reproducible contradiction rather than silently changing task/case/evaluator semantics.
