# Post-corpus review and interactive-user evaluation lane

> **Status:** active pre-Slice-H coordination note.
> **Benchmark checkpoint:** `ArrokothI/benchmark` at `8331a5cd37588c81660a0daeae5337a7be3e279c` (`p04-author`) when this note was written.
> **Applies to:** the post-Slice-G / pre-Slice-H benchmark-and-stabilization gate.
> **Supersedes operationally:** the immediate checkpoint/order in [`010`](010-post-reconciliation-benchmark-case-authoring-gate.md). `008`-`010` remain historical rationale and policy evidence.
> **Role:** engineering/evaluation coordination, not canonical kernel architecture.

This is **not** Slice G.4/G.5 and does not begin Slice H. Slice G is complete. The project is still finishing the scoped pre-H benchmark/stabilization gate.

Canonical semantics remain owned by the documents indexed from [`../README.md`](../README.md). Evaluation machinery must not redefine Execution, Event, Effect, authority, memory, confirmation, provider, or interoperability semantics merely to make a benchmark easier to run or score.

---

## 1. Current checkpoint

The fixed P01-P04 scored corpus is now concrete:

```text
P01  25 cases  = 2 public + 23 evaluation
P02  26 cases  = 2 public + 24 evaluation
P03  31 cases  = 2 public + 29 evaluation
P04  30 cases  = 2 public + 28 evaluation
---------------------------------------------
total 112      = 8 public + 104 evaluation
```

The accepted case-authoring semantic baseline remains benchmark commit
`16ebbba9f236171deead6a09b8c5105e3eabf8a0`.

At this checkpoint:

- all 112 scored `case-v1` artifacts are authored;
- P01-P04 remain blocked from generation;
- canonical coverage matrices are still absent;
- final evaluator mappings/weights are still absent;
- canonical runtime/judge model identities and sampling configuration are still unfrozen;
- provider/quota/429/resumability and controlled-effect execution work must still meet the existing pre-H gate;
- no interactive simulated-user workload is part of the canonical score.

The next cheap failure-detection point is therefore a **whole-corpus review before matrix/evaluator freeze**.

---

## 2. Immediate fixed-benchmark order

The fixed 112-case benchmark remains the canonical correctness layer. Continue in this order:

1. independently review the full 112-case corpus for fairness, duplicate topology, unresolved-source leakage, evidence feasibility, and public/hidden leakage;
2. materialize and validate the four canonical coverage matrices from the reviewed concrete cases;
3. freeze requirement applicability, evaluator ownership/mapping, hard/soft behavior, and deterministic assertions before generation;
4. prove controlled effects and normalized evidence on the real execution path, including `provider-request`, actual dispatched payload, outcome, and task-specific dispatch-count semantics where applicable;
5. finish the provider-neutral/OpenAI-compatible runtime path and the intended deployment configuration;
6. preserve no-overage quota policy, quota preflight, reactive 429 handling, and per-generation-unit resumability;
7. calibrate runtime and judge model tiers and freeze exact resolved model/configuration only in the canonical run manifest;
8. build/freeze subjects from public builder material only, run public/non-scoring smoke, then run the resumable canonical fixed campaign.

The fixed benchmark must not be delayed merely because a more realistic interactive simulator is harder to score.

---

## 3. Add one non-blocking interactive-user pilot

After the fixed cases, matrices, evaluator contracts, evidence capture, and generation-unit resumability are stable enough to reuse safely, add a **small diagnostic interactive-user pilot**.

This pilot belongs to the current pre-H stabilization program as a realism/robustness lane, but it is **not a release blocker for Slice H** and is **not blended into the fixed benchmark score** at first.

If the pilot is ready before the fixed canonical campaign finishes, it may run in parallel after the shared runner/evidence contracts are frozen. If not, do not postpone Slice H solely for it; carry it forward as an effectiveness experiment and reuse it in Slice N's whole-architecture integration campaign.

Keep three evaluation layers distinct:

```text
Layer A — fixed canonical cases
  authored user turns
  strongest deterministic/semantic oracle
  canonical compliance score

Layer B — controlled interactive simulated users
  deterministic hidden director + LLM surface realization
  adaptive end-to-end conversation
  separate diagnostic robustness metrics

Layer C — free self-play / external user clients
  ArrokothI-vs-ArrokothI or third-party agent clients
  exploratory diagnostics/research
  not canonical scoring until reproducibility evidence exists
```

Layer A remains authoritative for the current benchmark-v3 canonical result.

---

## 4. Interactive simulator architecture

Do **not** let one free-running user LLM define both the scenario and its oracle.

Use this separation:

```text
interactive-scenario
  hidden user facts / goal
  persona parameters
  perturbation/stress budget
  progress obligations
  maximum-turn policy
        ↓
Deterministic User Director
  chooses the next semantic user move
        ↓
User Surface Model
  renders only that move in natural language
        ↓
Subject under test
        ↓
normalized conversation/state/effect evidence
        ↓
existing requirement evaluators where applicable
```

The director owns scenario truth. The surface model owns wording only.

This preserves a stable oracle while still allowing realistic variation in phrasing, interruptions, verbosity, impatience, mistakes, and corrections.

The user surface model must not see:

- requirement IDs;
- evaluator rubrics or hidden expected assertions;
- controlled effect outcome before the simulated user could observe it;
- subject internal state;
- hidden normalized evidence;
- builder-private or evaluation-only data unrelated to the user's role.

---

## 5. First pilot shape

Start small. A reasonable first pilot is:

```text
4 tasks
x 3 interactive scenarios per task
= 12 scenarios
```

Use one trial each until the controller/evidence/evaluation loop is trustworthy.

Suggested scenario classes per task:

1. natural cooperative user;
2. difficult but goal-directed user;
3. adversarial/noisy user.

A default upper bound of **10 user turns** is a reasonable prototype limit. Count user turns rather than total transcript messages.

Do not permit the simulator to starve the subject arbitrarily. Each scenario should declare a progress contract, for example:

```text
maxUserTurns
maxNonProgressTurns
facts that must eventually become revealable
terminal goal / acceptable incomplete reason
```

The director may adapt to the assistant's questions, but it should not spend the full budget saying only greetings, noise, or refusal unless that is the declared scenario objective.

---

## 6. Persona and perturbation model

Prefer composable behavioral parameters over vague role-play labels.

Useful dimensions include:

```text
impatient
forgetful
verbose
privacy-sensitive
code-switching
noisy / malformed non-empty input
repetition
stale self-quotation
explicit correction
false conversational recollection
format-heavy Markdown/XML/JSON-looking user content
outcome-pressure
refusal then later cooperation
```

Human-readable persona labels such as "impatient client" may exist for reports, but the executable scenario should encode bounded behaviors and budgets rather than asking a model to "be random".

Examples:

```text
irrelevantInterruptionBudget: 1
semanticNullBudget: 1
correctionBudget: 1
languageSwitchBudget: 2
staleRecallBudget: 1
```

The existing fixed-case contract-gap decisions still apply. An interactive simulator must not silently make true blank/whitespace transport behavior, arbitrary structured-field parsing, unresolved correction semantics, or other excluded questions canonical.

---

## 7. Evaluation policy

Do not grade an entire interactive transcript with one opaque "good conversation" score when stronger evidence exists.

Reuse normalized evidence and frozen task requirements wherever possible:

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

The trajectory may vary, but the oracle should still ask objective questions such as:

- was the latest effective correction retained?;
- were already-known facts re-requested contrary to a frozen requirement?;
- did explicit consent bind to the current summary where required?;
- was authorization withheld until task-specific eligibility existed?;
- did the actual payload contain current values and configured recipients?;
- did controlled outcome claims remain truthful?;
- did provider-bound privacy remain intact?;
- were exact literals/disclaimers present where the frozen task requires them?;
- did the actual transcript and state remain coherent across interruptions/language switches?;

Use semantic judging only for requirements that genuinely need semantic interpretation.

Report interactive results separately at first, for example:

```text
fixed compliance score
interactive task-completion rate
interactive hard-requirement pass rate
interactive effect-safety rate
mean user turns to completion
premature-authorization rate
stale-value rate
repeated-question rate
outcome-overclaim rate
```

Do not blend Layer B into the official Layer-A score until repeatability, simulator fairness, and evaluator stability have been measured.

---

## 8. User-model/provider policy

The interactive user side should use the same provider-neutral model abstraction as other benchmark model calls where practical. It does not require a special provider "agent API"; the benchmark can own the user loop and use an ordinary inference model for surface realization.

Do not freeze a specific user model now. Calibrate at least two model families when the pilot is implemented, because a simulator that shares too many assumptions with the subject may create correlated errors or unrealistically smooth conversations.

Canonical/diagnostic run manifests should record only non-secret reproducibility metadata such as:

```text
provider/deployment identity
resolved model identity
sampling configuration actually supported
seed if actually supported
turn/token limits
simulator/director version
scenario hash
persona/stress configuration hash
```

Provider aliases that silently change underlying models should not be used for a reproducibility-sensitive frozen campaign unless the resolved identity is also captured and the policy explicitly allows rotation.

---

## 9. Privacy, credentials, and local-only configuration

No provider credential or sensitive local configuration belongs in Git history.

Repository policy for this work:

```text
secret values                     local .env only
provider API keys                 local .env only
private bearer/access tokens      local .env only
private service endpoints         local .env only when sensitive
local user/account identifiers    local .env only when needed
real visitor/customer PII         never required for benchmark scenarios
```

The repository may contain only safe configuration names, schema, and placeholders. If an `.env.example` is added later, it must contain variable names and obviously non-secret placeholders only.

The repository already ignores `.env` and `.env.*` while allowing `.env.example`; preserve that rule.

Runtime/evaluation code for this lane must:

- read sensitive configuration from local environment variables;
- never write credential values into run manifests, checkpoints, traces, fixture files, exception snapshots, or generated docs;
- never record authorization/request headers containing secrets;
- sanitize provider errors before persistence if they may echo request headers or credentials;
- use synthetic benchmark identities/data, not real customer records;
- treat raw prompts/provider payloads containing synthetic PII as privacy-sensitive evaluation artifacts even when they are not credentials;
- keep any optional raw-content retention explicit, local, access-controlled, and outside canonical source artifacts.

Public Git history should be safe to inspect without exposing a developer's private runtime configuration.

---

## 10. Self-play and external user clients remain future experiments

A later diagnostic lane may replace the minimal surface realizer with an independently implemented user agent or client, including possibilities such as:

```text
ArrokothI user Agent ↔ ArrokothI subject Agent
external agent framework user ↔ ArrokothI subject
multiple independent user-agent implementations over the same scenario contract
```

This is useful for dogfooding interoperability, session continuity, context handling, and correlated-failure detection, but it should not become the only simulator because two ArrokothI sides may share assumptions and fail together.

Do not jointly train or adapt the user simulator and evaluated subject during a frozen benchmark campaign. Freeze user-agent build, model/deployment, scenario set, and simulator version for any reproducibility-sensitive run.

These broader experiments fit the engineering-hypothesis/effectiveness work already described in [`../future-plan.md`](../future-plan.md), especially behavioral evals and multi-Agent/evaluator compositions. They do not currently justify a new kernel Execution kind, Event, Effect, authority concept, or mandatory third-party framework dependency.

---

## 11. Relationship to Slice H and Slice N

Placement in the architecture roadmap:

```text
current pre-H fixed benchmark/stabilization gate
        ↓
112-case review + matrix/evaluator/runtime freeze
        ↓
canonical fixed campaign
        ↘
         optional non-blocking interactive-user pilot
        ↓
H  portable schema/service-descriptor foundation
        ↓
I → J → K → L → M
        ↓
N  whole-architecture integration/release-readiness campaign
        ↑
reuse/promote interactive-user lane here if evidence shows it is stable
```

The interactive pilot does **not** become H. It does not change H's dependency contract and should not postpone H merely because an LLM-user experiment remains unfinished.

If the pilot uncovers a genuine kernel/runtime defect, first reproduce the defect with the smallest deterministic conformance or fixed benchmark case possible. Only then consider changing architecture/runtime behavior.

At Slice N, a matured interactive lane can become one workload in the whole-architecture campaign, alongside deterministic integration/conformance workloads. It should still remain distinguishable from canonical semantic conformance.

---

## 12. Exit criteria for the interactive pilot

The pilot is worth retaining/promoting only if it demonstrates all of the following:

- deterministic scenario truth is separated from natural-language surface realization;
- the director cannot see or alter evaluator-only truth opportunistically during a trial;
- surface-model variation does not silently change the intended scenario contract;
- at least two user-model families can drive the same scenario schema;
- maximum-turn and non-progress budgets prevent uninformative infinite/degenerate dialogue;
- normalized evidence remains sufficient for most hard requirements;
- semantic judging is limited to genuinely semantic requirements;
- repeat trials produce interpretable variance rather than arbitrary scenario drift;
- no provider secrets or local identities enter source control or persisted canonical artifacts;
- interactive metrics are reported separately from the fixed benchmark score;
- a failure can be traced to subject behavior, simulator behavior, evaluator behavior, or environment outcome rather than collapsed into one opaque score.

If these conditions are not met, keep Layer B diagnostic or remove it; do not weaken Layer A to accommodate it.

---

## 13. Immediate recommendation

Do **not** interrupt the fixed 112-case freeze path to implement the simulator now.

Immediate order:

1. review/freeze the 112-case corpus and matrices/evaluator contracts;
2. finish controlled-effect/provider/quota/resumability prerequisites;
3. run fixed benchmark smoke/calibration/freeze work;
4. prototype the 12-scenario interactive lane only on the stable shared evidence runner;
5. keep its score separate and decide from evidence whether to run it before Slice H, in parallel with early H, or defer full expansion to Slice N.

The principle is:

> **Fixed cases define benchmark truth; interactive users pressure the path to that truth.**
