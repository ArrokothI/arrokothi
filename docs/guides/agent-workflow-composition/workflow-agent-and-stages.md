# Choose control and Stages

[Guide home](README.md). Canonical owner: [composition](../../composition.md).

Use ordinary deterministic code when the answer is computable. Put it in a Function Stage only when
it belongs to an explicitly managed process. Use a Workflow when you can declare the possible semantic
steps and transitions. Use an Agent for the part whose next action cannot be enumerated in advance.
A model choosing among fixed labels is still a Workflow; neither tool use nor many LLM calls makes a
Workflow an Agent.

## Four Stage kinds

| Kind | Authoring fields | Application wiring |
|---|---|---|
| `function` | `implementationRef`, optional `config` / `resourceViews`, transitions | `createFunctionStageRegistry` handlers |
| `llm` | `model`, `system`, `prompt`, optional `callables`, `maxModelPhases`, transitions | Workflow model resolver and providers |
| `agent` | `child: { definitionId, definitionVersion }`, optional `requestedOperations` | Saved child definition, Agent controller, spawn policy + credits |
| `workflow` | Same child-reference shape | Saved Workflow definition/controller, spawn policy + credits |

Router, validator, retriever, gate, aggregator and evaluator are application roles, not additional
Stage kinds. Stage IDs are graph identities, not Execution IDs. Stages have no independent mailbox,
lifecycle, authority, or cancellation.

## Function Stage re-entry

A handler receives `input`, `config`, serializable `progress`, `observations`, read-only declared
resources, activation facts, and (at a join) branch results. It returns one of:

- `{ status: 'completed', result: string | null, transition?, progress?, emissions? }`
- `{ status: 'awaitEffects', effects: [...], progress?, emissions? }`
- `{ status: 'failed', code, message }`

After requested Effects settle, the same Stage visit runs again. Look up the observation by its
Stage-local `key`, check its `outcome`, and only then complete or propose the next round. Returning
the initial request unconditionally on every invocation repeats work. Observations are replaced for
each round; preserve still-needed facts in `progress`. Keys must be unique within a request batch.
The controller does not infer a retry/merge policy for you.

A completed Stage passes its result to the next Stage. For `always` transitions omit `transition`;
for `labeled` transitions return one declared label. Undeclared labels fail. `progress` is Stage-local
and does not automatically flow to the next Stage. See the compiled handler in
[patterns.ts](../../../examples/execution-kernel-minimal/patterns.ts).

## LLM Stage constraints

The prompt substitutes `{{input}}` with incoming Stage text. `maxModelPhases` defaults to 1. Callables
are offered only before the final phase, so a Stage that must call a capability then interpret the
result needs at least 2 phases. A model returning a callable on the final phase fails explicitly.
The Stage's callables map model-facing names to declared capability/operation identities; they do
not grant those operations.

Labelled transitions use the controller's structured output for `{ transition, result }`. There is
no arbitrary per-Stage object output schema slot. A bounded extraction can return text that a
Function Stage parses/validates; persist accepted facts through that Function Stage's WriteMemory
Effect if needed. Raw JSON serialized as text is possible but is an application encoding: validate
it at each boundary and do not describe it as typed kernel data flow.

LLM Stages have no Agent memory/notes/context compiler. An Agent is appropriate when the language
subtask needs repeated open-ended operation choices or Agent context features, not merely because
an LLM Stage field is missing. Check the [surface matrix](current-authoring-surface.md) first.

## Responses and completion

Agent `completion` defaults to `respond_and_wait`: text is emitted and the Agent waits for more input.
Use this for a conversation. `complete_on_response` finishes on text; for a one-shot child that must
return text also declare a **string** `terminalResult` schema. Without a terminal schema the Agent
can emit text and complete but return no value. An object terminal schema does not parse the text.

Workflow completion is a declared transition. Its optional terminal proposal is an authored literal,
not the latest Stage output. Read [child and data-flow limitations](composition-children-and-concurrency.md)
before designing reusable computed-return subworkflows.

## Useful combinations

- Conversation: root Agent, grounding operations, optional Structured Memory, exact gates in current
  host policy, and trusted confirmation UI.
- Known process: Function prepare → LLM classify → declared branches → Function act via Effects.
- Known process with exploration: Agent child Stage → Function validate the child's result → next
  action. The parent should establish acceptance independently of the child's prose.
- Pure deterministic transform: ordinary function. No Execution needed unless identity/lifecycle or
  runtime-managed Effects are part of the product requirement.

See [worked patterns](worked-examples.md) and [tests/diagnosis](evaluation-and-diagnosis.md).
