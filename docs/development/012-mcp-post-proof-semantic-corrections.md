# Slice MCP-1.1 — Post-Proof Outcome and Schema Semantic Corrections

> **Status: accepted corrective implementation record. Not canonical architecture.**
>
> Canonical outcome semantics remain in [`../execution-runtime.md`](../execution-runtime.md),
> authority semantics in [`../authority.md`](../authority.md), and portable/protocol boundaries in
> [`../interoperability.md`](../interoperability.md). This retrofit changes implementation back into
> alignment with those owners; it does not create a new architectural contract.

## 1. Baseline and audit result

The merged MCP-1 proof established the right boundary shape: MCP Tools import as existing capability
operations, execute behind `CapabilityExecutor`, and export only through an explicit allowlist. Its
post-proof audit found three narrower implementation mismatches:

1. `isError: true` was treated as definite failure even for consequential calls, although MCP says
   only that Tool execution ended in an error and does not establish rollback.
2. `structuredContent` was restricted to objects, although the 2026-07-28 protocol accepts any JSON
   value.
3. omitted `additionalProperties` was treated as the same default on both sides, although JSON
   Schema defaults it to true and Arrokoth `ObjectSchema` defaults it to false.

No canonical ambiguity was found. The existing `success | failure | unknown` vocabulary is
sufficient: `failure` remains proof that the operation did not take effect; uncertainty about a
consequential external effect remains `unknown`.

## 2. Corrections adopted now

### Outcome certainty is stronger than protocol labels

The importer now reads consequentiality only from the authorized request and normalizes settled
results conservatively:

```text
isError: true
  consequential       -> unknown
  non-consequential   -> failure, without automatic retry advice

unrepresentable rich or invalid structured result after a returned call
  consequential       -> unknown
  non-consequential   -> failure
```

MCP annotations remain advisory and cannot establish rollback safety. Clearly pre-dispatch JSON-RPC
rejections remain failure; lost transport, timeout, internal error, and other ambiguous exceptions
retain the existing consequential `unknown` / non-consequential `failure` split.

The safety regression runs a real MCP handler that increments a counter before returning
`isError: true`. With a consequential imported descriptor it produces exactly one remote call, one
side effect, one executor dispatch, and journal phases
`requested -> authorized -> dispatch_started -> unknown_outcome`. The pending operation and Agent
observation both say `unknown`; no `failed` phase is written and no retry is manufactured.

### Structured observations are JSON values, not necessarily objects

Presence is checked with `structuredContent !== undefined`. Object, array, string, number, boolean,
and null are recursively validated as actual JSON data and cloned before becoming an ordinary
Arrokoth observation. Class instances, cycles, sparse arrays, `undefined`, non-finite numbers,
functions, symbols, and bigints are refused locally; no SDK-owned or non-JSON value escapes into an
Event. An empty successful result becomes successful observation `null`.

The export handler already returns Arrokoth `JsonValue`. On a negotiated 2026-07-28 official-SDK
exchange it now preserves every JSON top-level kind in `structuredContent` while retaining the text
mirror. No MCP-specific result ontology was added.

### Generic JSON Schema projection preserves object acceptance sets

`toJsonSchema` now emits `additionalProperties` for every object node:

```text
ObjectSchema true          -> JSON Schema true
ObjectSchema false/absent  -> JSON Schema false
```

Nested objects follow the same rule. Arrokoth validation and defaults are unchanged. Gemini's
capability-schema edge was audited through the live canary. Gemini returned HTTP 400
`INVALID_ARGUMENT`, identifying `additionalProperties` as an unknown function-declaration field.
The Gemini adapter consequently omits that keyword only from provider-facing function schemas;
descriptors and Harness validation remain exact. Its structured-output projection remains a separate
provider dialect surface.

The MCP importer normalizes in the other direction:

```text
JSON Schema omitted  -> ObjectSchema true
JSON Schema true     -> ObjectSchema true
JSON Schema false    -> ObjectSchema false
```

Schema-valued `additionalProperties` remains refused because the present `ObjectSchema` cannot hold
its constraint. Import fidelity is therefore defined as a semantically equivalent acceptance set
over the supported subset, not a byte-identical document. Tests exercise actual Arrokoth validation
for omitted, true, false, and nested objects.

The export proof uses the descriptor's general `toJsonSchema` projection. In a real negotiated
2026-07-28 exchange, an undeclared argument against a strict descriptor is rejected before its
handler runs, while the same argument reaches a descriptor that explicitly permits additional
properties. No adapter-local duplicate validator exists.

## 3. Architecture feedback classification

### Adopt now

- Outcome certainty must be stronger than protocol success/error labels.
- A protocol Tool error cannot by itself prove rollback of a consequential effect.
- Generic JSON Schema projection must preserve `additionalProperties` semantics recursively.
- Structured operation observations may be any JSON value; object-only is unnecessary.

These are corrections to current implementation against current owners, so delaying them would
leave a safety or contract-fidelity defect in the accepted MCP seam.

### Adopt in the owning future interoperability slice

- JSON Schema 2020-12 as the mature portable operation/service schema contract.
- A first-class portable output schema, for which MCP 2026 supplies concrete pressure.
- Portable rich Result/Artifact/Resource representation rather than protocol content blocks.

Those remain v0.7 portable-schema/resource work. MCP-1.1 continues to refuse constraints and rich
blocks it cannot represent instead of weakening or leaking them.

### Carry into composition/interaction design; do not implement here

MCP 2026 `input_required` and its multi-round-trip continuation provide useful evidence for keeping
these Arrokoth concepts distinct:

```text
PendingOperation
RequestUserInput
continuation / input requirement
external protocol continuation state
```

The protocol's mechanism is not copied into core. Composition and interaction owners should use it
as design pressure when those slices exist.

### Keep interoperability-only

- MCP wire names and protocol envelopes
- MCP client/server SDK classes and transport details
- protocol-specific annotations
- response-cache and protocol-version fields

None becomes a core type, Event, Effect, authority record, or controller concept.

### Rejected or deferred

- a fourth `CapabilityOutcome` arm: rejected as unnecessary;
- a local "definite MCP Tool error" override: rejected without general rollback evidence;
- automatic retries: out of scope and unsafe for unknown consequential outcomes;
- rich MCP blocks, Resources, Tasks, Prompts, `input_required`, subscriptions, and Slice E:
  deferred to their owning roadmap slices.

## 4. Boundary preservation

All MCP-1 boundaries remain unchanged:

```text
MCP Tool != Effect
MCP Tool <-> existing capability operation
discovery != authority
authority ceiling -> policy -> CapabilityExecutor
explicit export allowlist only
no fabricated Execution or AuthorizedGrant
no MCP Event or Effect kind
MCP SDK dependencies remain outside core
```

The core edit is provider-neutral `ObjectSchema -> JSON Schema` projection. It imports no MCP
vocabulary and adds no export. Existing authority-negative tests remain the evidence that discovery,
projection, and a permissive policy cannot cross the runtime-owned effective-authority ceiling.

## 5. Configuration and roadmap consequence

No `AGENTS.md`, `CLAUDE.md`, or `.agents/skills/*` instruction became false. No configuration change
is justified.

```text
MCP-1 proof landed
  -> MCP-1.1 post-proof semantic correction
  -> MCP proof accepted
  -> Slice E composition next
```

MCP-1.1 stops here. It does not begin Slice E.
