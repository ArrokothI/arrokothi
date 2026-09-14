# Interoperability baseline and next constraints

> **Historical snapshot, retired 2026-09-07.** Its status and next-step language describe the earlier checkpoint. Use the [active development plan](../../../development/001-current-status-and-roadmap.md) and [findings register](../../../development/003-evidence-and-findings.md) for current decisions.

> **Status:** active engineering baseline for interoperability work in the ArrokothI 0.8.x line.
> **Role:** implementation evidence and boundary constraints, not canonical architecture.

Canonical interoperability semantics remain in [`../interoperability.md`](https://github.com/ArrokothI/Agent_SDK/blob/9fc2b4472d41e35402bfbfb24f7a62ee21c2e2f3/docs/interoperability.md).
This document summarizes what the current MCP proof demonstrates and what future MCP/A2A/service
work must preserve.

## 1. Proven MCP baseline

The boundary package `packages/interoperability/mcp` uses MCP SDK v2 types internally and proves:

```text
MCP listTools + callTool
  → explicit import mapping
  → ArrokothI CapabilityOperationDescriptor + CapabilityExecutor

explicit ArrokothI operation allowlist
  → export mapping
  → MCP Tool list/call handler
```

The proof is deliberately narrow: synchronous Tool import/export only. It does not claim MCP
Resources, Prompts/templates, Tasks, elicitation, notifications, sessions, auth, or hosting.

## 2. Kernel semantics stay kernel-owned

```text
MCP Tool/Resource/Prompt/Task/notification
  are protocol objects

ArrokothI Operation/Resource/Execution/Event/Effect/PendingOperation
  are kernel objects
```

An adapter may correlate or project the two; it must not make an MCP object the definition of a
kernel concept. In particular:

```text
MCP Task          != Execution
MCP notification  != Event automatically
MCP authorization != Execution authority
MCP metadata      != authorization evidence
```

The MCP SDK and wire types stay outside `@arrokothi/core`.

## 3. Identity mapping

Imported Tools become capability/operation identities under an explicit local namespace chosen by
the importing application. Remote names are validated against the accepted local identity grammar;
they are not silently normalized, truncated, or collision-suffixed. A refused remote name stays a
refusal until the application supplies an explicit mapping.

Provider-facing aliases are projections and are never parsed back into kernel identity. Export is
an explicit allowlist of local operations; catalog membership or MCP discovery is not permission to
publish or invoke.

## 4. Schema acceptance-set fidelity

The current importer accepts a documented lossless subset of MCP/JSON Schema input objects and
refuses unsupported constructs. It preserves object-property requiredness and the JSON Schema
default that omitted `additionalProperties` means additional properties are allowed. Export emits
the actual nested boolean/object constraints represented by the internal schema.

The invariant is about accepted values, not textual schema similarity:

```text
values accepted before mapping == values accepted after mapping
```

Current evidence does **not** justify claiming complete JSON Schema 2020-12 support. The next
portable-schema tranche should declare a versioned ArrokothI profile/subset and prove its
normalization/refusal rules rather than accepting keywords opportunistically.

## 5. Structured JSON result semantics

Successful MCP Tool results may be any JSON value: object, array, string, number, boolean, or null.
The adapter validates/clones structured results and does not require every success to be an object.
An empty successful Tool result maps to JSON `null`; unrepresentable or invalid payloads are not
invented into meaningful data.

Text/content compatibility fallbacks remain adapter behavior and must not overwrite a valid
structured result merely because it is inconvenient for one provider.

## 6. Honest outcome certainty

For consequential operations, the adapter must distinguish a definite pre-dispatch refusal from a
remote outcome that may already have happened:

```text
definite request rejection before dispatch       → failure
ordinary successful structured result            → success
MCP isError / lost or unrepresentable response
  for a consequential operation                  → unknown
same failure for a non-consequential operation    → failure where safely retryable
```

Do not turn transport/library exceptions into a blanket claim that consequential work did not
occur. Kernel retry/idempotency policy depends on the certainty being honest.

## 7. Authority remains an ArrokothI boundary

Remote descriptions, annotations, and consequentiality hints are untrusted information. The local
application decides descriptors and defaults; the current importer defaults uncertain operations
conservatively. Effective Authority and Active View membership are established by ArrokothI
policy, and the Harness reauthorizes each concrete Effect.

```text
MCP discovery
  → possible descriptor data
  → local catalog admission
  → Effective Authority
  → Active View / projection
  → model selection
  → concrete Effect
  → fresh Harness authorization
```

No earlier step grants a later one.

## 8. Import/export asymmetry is allowed

An imported operation may have local policy, identity, consequentiality, and failure mapping that
cannot be inferred from the remote Tool. An exported operation is published only by explicit local
selection. Do not require round-trip identity or metadata symmetry where the two trust boundaries
are genuinely different; require instead that the supported behavior and refusal rules be explicit.

## 9. Constraints for the next interoperability work

Future Resources, Prompts/templates, Tasks/handles, elicitation, notifications, A2A, and service
projections must define, per mapping:

- portable ArrokothI descriptor/schema used;
- protocol identity and kernel identity correlation;
- import and export direction separately;
- authority/exposure point and deny-before-disclosure ordering;
- Event/Effect/wait mapping, if any;
- result/outcome-certainty mapping;
- lifecycle/cancellation/retry behavior;
- unsupported states and fail-closed behavior;
- protocol SDK containment and dependency direction;
- deterministic conformance plus live canary coverage where drift matters.

### Resources

A protocol Resource should map to a portable read/resource contract only when scope, identity,
content type, freshness, and access behavior are representable. Resource discovery does not grant
read authority, and a protocol change notification does not automatically become an Event.

### Prompts/templates

Treat protocol prompt/templates as external content or descriptor data with an explicit trust
label. They do not become Agent instructions, Definitions, or authority merely by import.

### Long-running Tasks/handles

Use a portable asynchronous external-handle contract. Correlate it with kernel waiting or a
PendingOperation only where the real interaction crosses the Effect boundary. Never identify an
MCP Task as the Execution itself.

### Elicitation/input-required

Map only through an explicit portable interaction/input requirement, schema, correlation, and
authorized user-input path. Protocol elicitation is not mechanical confirmation unless the exact
proposal/decision semantics match.

### Notifications/change signals

Specify which signals are merely transport/cache invalidation and which are admitted as kernel
Events. Preserve provenance and do not treat notification delivery as completion evidence without
an explicit contract.

### A2A/service projection

Project Agent/Workflow services rather than replacing their ontology. Preserve:

```text
A2A Task    != Execution
A2A Message != SendMessage Effect
```

## 10. Current conformance evidence

Representative implementation:

- `packages/interoperability/mcp/src/import/importer.ts`
- `packages/interoperability/mcp/src/import/identity.ts`
- `packages/interoperability/mcp/src/import/result.ts`
- `packages/interoperability/mcp/src/schema/from-json-schema.ts`
- `packages/interoperability/mcp/src/export/tools.ts`

Representative tests:

- `packages/interoperability/mcp/tests/mcp-protocol.test.ts`
- `packages/interoperability/mcp/tests/schema-translation.test.ts`
- `packages/interoperability/mcp/tests/import-identity.test.ts`
- `tests/conformance/mcp/imported-operation-agent-path.test.ts`
- `tests/conformance/mcp/imported-operation-authority.test.ts`
- `tests/conformance/mcp/imported-operation-outcome-certainty.test.ts`
- `tests/conformance/mcp/exported-operation.test.ts`
- `tests/conformance/architecture/mcp-boundaries.test.ts`
