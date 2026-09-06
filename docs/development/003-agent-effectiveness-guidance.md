# Agent effectiveness guidance

> **Status:** active engineering/evaluation guidance for the ArrokothI 0.8.x line.
> **Role:** replaceable Agent/ACI/context/retrieval/model-engineering strategy, not canonical
> architecture.

This guide records current Agent-effectiveness guidance. Canonical semantics remain under
[`docs/`](../README.md).

## 1. Keep correctness and effectiveness separate

```text
kernel semantic correctness
  lifecycle, authority, exposure, Event/Effect, memory, waiting, recovery

!=

Agent effectiveness
  observation shaping, context selection, retrieval, action descriptions,
  model choice, prompting, iteration policy, and behavioral evaluation
```

The first category belongs to kernel contracts and conformance tests. The second should remain
replaceable and evidence-driven. Do not promote a successful prompt, ranking heuristic, provider
feature, or benchmark tactic into kernel semantics merely because it improved one Agent.

## 2. Preserve explicit seams

### Observation projection

Runtime Events and capability outcomes are not automatically model messages. Keep a typed,
replaceable projection step that can select, summarize, redact, or reject model-visible
observations without rewriting the underlying Event or Effect truth.

Measure:

- task success and error recovery;
- result/context bytes and tokens;
- accidental instruction injection from untrusted content;
- whether required identifiers/provenance survive projection;
- deterministic behavior on re-entry.

### Information/context compilation

Keep information selection separate from action exposure. Context may include instructions,
bounded transcript, authorized Structured Memory, Working Notes, and Derived Semantic Memory, but
each source retains its epistemic/trust label. A context compiler selects information; it does not
grant authority or choose which operations are callable.

Useful strategies may include windowing, summaries, resource retrieval, cacheable stable prefixes,
or task-specific packing. Treat them as replaceable policy unless a canonical owner explicitly
requires a semantic property.

### Action binding and descriptions

The model should see stable aliases, descriptions, and schemas derived from an immutable projection.
The binding—not prose parsing—owns the exact target identity. Optimize descriptions and selection
quality without permitting off-view calls or changing the projection/authority chain.

Evaluate action surfaces for:

- correct-operation recall and precision;
- alias/schema ambiguity;
- token cost as catalog size grows;
- recovery after a rejected, denied, conflicted, or failed action;
- hallucinated/off-view action refusal.

### Model invocation trace

Keep a typed, inert record of what the model was shown and what it returned: information-selection
identity, action/local-control projection identities, exposed callable bindings with origin,
proposed Effects, and applied local controls. Trace is observability/evaluation evidence, not
semantic state, authority, or a recovery log.

### Retrieval and discovery

Retrieval can rank information or descriptors; it cannot grant authority. Compare cheap
deterministic retrieval with embeddings/LLM selection before adding mandatory complexity. Evaluate
retrieval recall, latency, hydrated-schema count, model-token cost, and failure modes separately.

## 3. Behavioral evaluation discipline

Keep Agent evals outside the semantic conformance suite:

```text
npm test             does the runtime preserve its contract?
npm run test:evals   did this Agent configuration accomplish the task?
```

An eval should identify at least:

```text
task/environment version        model/provider configuration
available authorized actions    exposed action subset
context/retrieval strategy      success rubric
tool/model call counts          token/context measures where available
failure classification          reproducibility limits
```

Prefer environment-grounded outcomes over style-only grading. A task is not successful merely
because the final prose sounds correct; verify the external or simulated state that the task was
supposed to change.

## 4. Suggested 0.8.x evaluation matrix

At minimum, compare:

| Axis | Representative variants |
|---|---|
| Observation projection | raw bounded result; structured summary; redacted untrusted result |
| Context strategy | minimal; transcript window; structured/working/derived memory enabled |
| Action surface | small static view; large catalog with bounded selection; heterogeneous view |
| Model/provider | deterministic fake; at least one live provider canary |
| Recovery | rejection; denial; confirmation decline; conflict; unknown consequential outcome |
| Composition | one Agent; recursive child; Workflow Stage; parallel branch |

Report quality and cost together. A strategy that improves success through unbounded context,
extra model turns, or full-catalog exposure carries a real tradeoff.

## 5. Review triggers

Stop and re-check the boundary if an effectiveness change:

- makes model-visible content the source of runtime truth;
- lets retrieval or a Definition widen Effective Authority;
- parses free text into Effects without an explicit typed binding;
- changes provider-native metadata into kernel authority/evidence;
- requires trace for correctness or restart;
- merges Structured Memory, Working Notes, Derived Semantic Memory, and context;
- adds mandatory model calls to workloads that do not enable the strategy;
- modifies Event/Effect or controller semantics merely to improve a benchmark score.

## 6. Evidence handoff

For each accepted strategy, record the workload, measurements, tradeoffs, and replaceability. If it
reveals a genuine missing kernel contract, open a separate architecture review against the relevant
canonical owner. Do not smuggle that contract into the kernel through an Agent implementation.
