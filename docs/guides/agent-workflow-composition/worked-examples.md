# Worked application patterns

[Guide home](README.md). Start from the linked executable source; sketches below explain adaptation
choices, not additional APIs. All examples use ordinary domain requirements and public imports.

## Conversation with accepted state and a confirmed action

**Requirement:** collect a draft title over multiple turns, allow corrections, and publish the exact
current title only after approval.

[patterns.ts](../../../examples/execution-kernel-minimal/patterns.ts) implements `draftingAgent` and
`createPatternApp`; [patterns.test.ts](../../../examples/execution-kernel-minimal/patterns.test.ts)
proves the state/action path. Run `npm run example:application-patterns`.

```text
user text → Agent → proposed title write → Harness commit
next model call ← authorized current title
publish proposal → host authorizer compares exact payload to current committed title
                 → confirmation UI → fresh authorization → publisher → actual receipt
```

The memory binding, authored read/write keys, both resolver grants, and memory-write authorization
are all explicit. The host's policy reads current state on each authorization, so a correction during
the turn invalidates a stale publish payload. The title is a user preference; its acceptance standard
is modest. For consequential factual fields add independent acceptance, not just schema validation.

The host owns the transport, serializes turns, tracks response emissions, and distinguishes input
waits from approval waits. The CLI approves its own scripted fake-world action solely to demonstrate
the API; a real UI must authenticate a human decision. `completion` stays `respond_and_wait`.

The publisher's exact-title unique key is a sample domain rule. Replace it with a durable application
action ID and conditional insert when appropriate. The test verifies application idempotency even
though repeated confirmed proposals currently bypass runtime replay. It also verifies that a model
claiming “Published!” after denial creates no article.

## Fixed process containing an Agent subtask

**Requirement:** propose an article title for a topic, validate its shape, then publish with approval.

The same file implements `publishingWorkflow`:

```text
Agent Stage (title-reviewer child, text terminal result)
  → Function Stage (validate → awaitEffects publication → inspect outcome → emit receipt)
  → Workflow complete with no terminal value
```

The reviewer is deliberately a tiny child example to teach the boundary. A real fixed title-generation
task would normally use an LLM Stage; retain an Agent child when the subtask needs exploration or
independent identity. The example proves the child path without hiding a second runtime in a tool.

The child has `complete_on_response` plus a string terminal schema, no delegated operations, and no
Structured Memory. Parent creation grants one spawn credit and policy allows only the reviewer
Definition. Decline fails the business step explicitly; an application could instead add a declared
“declined” branch. The receipt is an emission, **not** a dynamically computed Workflow terminal
result. Read [composition](composition-children-and-concurrency.md) before making it a reusable child
Workflow.

## Grounded support or investigation

[app.ts](../../../examples/execution-kernel-minimal/app.ts) implements a handbook lookup Agent and
[its tests](../../../examples/execution-kernel-minimal/app.test.ts) compare allowed and denied runs
using identical model prose. Run `npm run example:execution-kernel`.

For a larger investigation, expose `search` returning compact references and `read` returning bounded
source detail. Add Working Notes for hypotheses and open questions, sources in returned evidence,
and a finite cumulative call budget. Use a one-shot terminal Agent if a caller awaits one answer.
Validate factual claims independently where consequences depend on them. Do not import a hidden
provider tool loop or expose every remote endpoint without a task reason.

## Fixed classification

[classification.ts](../../../examples/execution-kernel-minimal/classification.ts) shows a one-phase
LLM Stage choosing `ready` or `needs_review`, followed by a Function Stage that emits the exact
category and the model's explanation. The definition requests `structuredOutput: 'required'`; the
deployment advertises that feature separately. [Tests](../../../examples/execution-kernel-minimal/classification.test.ts)
exercise both branches without a provider key. This is a bounded Workflow, not an Agent, and performs
no external Effect. Supply `geminiWiring(...).workflowModels` to use the compiled real-provider wiring.

## Extraction, calculation, and retained facts

For a fixed input: LLM Stage returns text → Function parses and validates → exact calculation →
optional WriteMemory Effect → explanation. The Function can use its input and operation observations;
it cannot look up committed memory through Stage context. Prefer an ordinary parser when the input
format is deterministic. Store large structured results externally and pass references.

For a conversation: Agent gathers candidate values → accepted state → host computes → model explains
from supplied output. Render deterministic numbers/status directly when the UI requires exactness.
See [requirements](requirements-and-control.md) for acceptance and
[state](state-memory-and-context.md) for visibility/continuity.

## Independent concurrent lookups

Use a Workflow fork for two or more independent single-Stage lookups; merge results in the Function
join successor. The join is in authored order. Handle each branch outcome, avoid concurrent shared
writes, and use a sequence when concurrency provides no measurable benefit. Exact authoring examples
are in [parallel-fork-join.test.ts](../../../tests/conformance/workflow/parallel-fork-join.test.ts);
its test harness wiring is test-specific. Current restrictions are in
[composition](composition-children-and-concurrency.md#parallel-workflow-branches).
