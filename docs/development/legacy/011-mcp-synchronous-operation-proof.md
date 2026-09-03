# Slice MCP-1 — Narrow Synchronous MCP Operation Import/Export Proof

> **Status: implementation record for the first MCP vertical proof. Not canonical architecture.**
>
> Canonical interoperability semantics remain in [`../../interoperability.md`](../../interoperability.md);
> authority/exposure semantics in [`../../authority.md`](../../authority.md); runtime Effect/Event
> semantics in [`../../execution-runtime.md`](../../execution-runtime.md). This document records what the
> proof became in code and why, per
> [`007` DEC-I20](007-interoperability-decisions-before-agent-slice.md) and
> [`008` §3](008-v0.4-to-v1.0-development-roadmap.md).
>
> **No canonical document changed.** A subsequent independent audit found three implementation
> mismatches with already-canonical semantics: outcome certainty, JSON-valued structured results,
> and JSON Schema `additionalProperties` defaults. MCP-1.1 corrects them and records the evidence in
> [`012`](012-mcp-post-proof-semantic-corrections.md).

---

## 1. What the slice implements

Exactly two directions, both synchronous, both narrow:

```text
IMPORT
  an MCP Tool  ->  the EXISTING CapabilityOperationDescriptor
                   + an MCP-backed CapabilityExecutor
                   -> the ordinary Agent path, unchanged

EXPORT
  one explicitly named capability operation  ->  one MCP Tool
                   -> an explicit adapter-owned service handler
```

Nothing else. MCP Resources, Prompts, Tasks, elicitation, subscriptions, notifications, sampling,
OAuth, HTTP hosting, and stdio process management are all absent — see §12.

The purpose is architectural feedback about the portable-operation seam. The original proof needed
no semantic core API change, but MCP-1.1 later corrected the general `toJsonSchema` projection in
core so its output preserves the existing `ObjectSchema` acceptance set. That correction changed no
core vocabulary or default; §13 and [`012`](012-mcp-post-proof-semantic-corrections.md) record the
distinction.

---

## 2. Package and dependency boundary

New workspace package:

```text
packages/interoperability/mcp        @agent-sdk/integration-mcp
```

Dependency direction, asserted by `tests/conformance/architecture/mcp-boundaries.test.ts`:

```text
@modelcontextprotocol/client @2.0.0
@modelcontextprotocol/server @2.0.0
        v
@agent-sdk/integration-mcp
        v
@agent-sdk/core     (/ports, /execution, /reference only)
```

Never the reverse. The architecture suite asserts, over the real files and manifests:

- no `packages/core` source imports or names an MCP package or wire type;
- `packages/core/package.json` declares no MCP dependency in any section;
- the adapter is the **only** workspace package that declares one;
- the adapter's whole transitive bare-import set is exactly
  `@agent-sdk/core/{execution,ports,reference}` plus the two MCP packages — no HTTP framework, no
  transport library, no validator, no second kernel entry point;
- `@modelcontextprotocol/*` appears repo-wide only under `packages/interoperability/mcp/`,
  `tests/conformance/mcp/`, and `scripts/mcp-gemini-canary.ts`.

**Core gained no export.** Everything the adapter needs — `CapabilityOperationDescriptor`,
`CapabilityExecutor`, `AuthorizedCapabilityRequest`, `CapabilityOutcome`, `ObjectSchema`,
`toJsonSchema`, `createCapabilityCatalog`, `capabilityId`/`isOperationId` — was already published.
That is itself a result: the Slice-D surface was sufficient for a second operation source without
being widened for one.

### SDK line

Official MCP TypeScript SDK **v2**, the stable line for the 2026-07-28 specification, using the
split packages `@modelcontextprotocol/client` and `@modelcontextprotocol/server` (both `2.0.0`,
published 2026-07-28; they share `@modelcontextprotocol/core@2.0.0`). The legacy v1 monolithic
`@modelcontextprotocol/sdk` (latest `1.30.0`) is **not** used and no technical obstacle to v2 was
found. Versions are pinned exactly, matching how the repository pins its other adapter dependencies.

Lockfile impact is three packages: `@modelcontextprotocol/{client,core,server}`. Their transitive
dependencies (`zod`, `jose`, `cross-spawn`, `eventsource`, `eventsource-parser`, `pkce-challenge`)
were already present in the tree, so the net addition is 74 lockfile lines and no new top-level
transitive family.

---

## 3. Why an MCP Tool maps to the capability-operation descriptor, not to an Effect

Canonical interoperability already answers this
([`interoperability.md`](../../interoperability.md) §2, §13):

```text
MCP Tool  ↔  portable Operation  ↔  capability operation
Effect    ≠  portable Operation
```

An Effect is a *request made by an Execution at a point in time*, authorized by the Harness. A Tool
is an *interface description*. Mapping a Tool to an Effect kind would have meant a new dispatch
vocabulary per protocol, a new authorization arm per protocol, and a new Event arm per protocol —
and it would have made "which protocol did this come from" a kernel-visible fact.

Mapping it to the existing descriptor instead means one operation has one identity, one description,
one schema, and one consequentiality baseline whichever surface projects it, exactly as
[`007` DEC-I14](007-interoperability-decisions-before-agent-slice.md) requires. There is no
`McpToolDescriptor` in Arrokoth, no universal action registry, no MCP-specific Effect, Event,
authority type, or `AgentSpec` field, and no MCP client inside `AgentController` or `AgentExecutor`.
The Harness is unaware MCP exists.

---

## 4. Local identity: the remote server never chooses it

```text
local application configuration   ->  capability     always
local application configuration   ->  operation      when it names one
remote tool name                  ->  operation      only when already a valid OperationId
```

`importMcpTools({ capability, client, tools? })` **requires** the local capability namespace. Example:

```text
local capability   "external.lookup"
remote tool        "lookup_code"
Arrokoth identity   external.lookup / lookup_code
```

That pair is what an `EffectiveOperationAuthority` grants, what the Active View exposes, what the
projection binds, and what `UseCapability` names.

A remote tool name is accepted as an operation id **only when it is already a valid `OperationId`**.
There is no normalization, slugification, truncation, or nearest-match: `"../../admin"`,
`"has space"`, `""`, non-ASCII, and over-long names are all refused with
`tool_name_not_an_operation_id`. An application may supply an explicit `operation` to rename an
otherwise-unusable remote name; a *misconfigured* local id is refused too
(`configured_operation_id_invalid`). Every one of those is a silent absence from the catalog plus a
structured issue, so one unusable tool does not prevent the usable ones from importing;
`importMcpToolsStrict` turns the same refusals into a startup error for deployments that name exact
tools.

The executor holds the only routing table from local operation id back to remote tool name, and
refuses a request naming a different capability (`mcp_capability_not_imported`) or an operation the
snapshot never imported (`mcp_operation_not_imported`) **before any network work**. So a mis-wired
authority grant, a hostile Active View, or a hand-built proposal cannot cause a `tools/call` for a
tool that was never imported.

---

## 5. Remote metadata is information; it is never permission

Copied from the remote descriptor: `title`, `description`, `inputSchema`.

Owned locally and never derived from the remote: `capability`, `operation`, `consequential`,
`groups`.

### Consequentiality policy

Imported operations default to **`consequential: true`**. Only trusted local adapter configuration
may classify one otherwise. MCP `annotations` — `readOnlyHint`, `destructiveHint`, `idempotentHint`,
`openWorldHint` — never reach the descriptor at all. They are retained beside it as
`McpImportedOperation.advisory`, explicitly documented as advisory protocol metadata that nothing in
Arrokoth reads.

The reason is narrow and important. `consequential` decides how a *lost response* is interpreted: a
consequential operation whose outcome is unknown must not be retried blind. Letting a remote server
set it would hand that decision to the party with the most to gain from getting it wrong. The
conformance suite asserts that a server claiming `readOnlyHint: true` changes nothing, and that the
imported descriptor's field set is exactly
`{capability, operation, consequential, title, description, input, groups}` with no protocol hint.

A tool description containing instruction-like text is untrusted content like any other. It may
influence what the model asks for; it creates no authority, and the Effect gateway decides what
happens (§7 Case D).

---

## 6. Schema mapping: lossless subset or refusal

`CapabilityOperationDescriptor.input` is Arrokoth's serializable `ObjectSchema`. The canonical docs
anticipate a richer portable JSON Schema boundary later
([`interoperability.md`](../../interoperability.md) §10,
[`future-plan.md`](../../future-plan.md) §4.4); **this slice is not that project** and deliberately did
not redesign the schema layer or add arbitrary JSON Schema to the descriptor.

`objectSchemaFromJsonSchema` translates only what the current vocabulary holds without semantic
guessing, and returns structured `McpSchemaIssue[]` otherwise.

### Supported

```text
root object with properties / required
additionalProperties as a boolean
string  (minLength, maxLength, pattern)
number  (minimum, maximum)
integer (minimum, maximum)          -> { kind: "number", integer: true }
boolean
string enum                          -> { kind: "enum", choices }
array with a supported item schema (maxItems)
nested objects, recursively
property description                 -> FieldSpec.description
```

Pure annotations that constrain no value are ignored rather than refused: `title`, `description` at
a root, `$comment`, `examples`, `deprecated`, and a recognized `$schema` dialect.

### Explicitly refused

```text
oneOf / anyOf / allOf / not          $ref / $defs / definitions
if / then / else                     const / default
prefixItems / tuple items            contains / unevaluatedItems / unevaluatedProperties
dependentSchemas / dependentRequired patternProperties / propertyNames
schema-valued additionalProperties   non-string enum, mixed-type `type` unions
minItems / uniqueItems               minProperties / maxProperties
exclusiveMinimum / exclusiveMaximum  multipleOf / format / contentEncoding
an enum carrying a length or pattern constraint
an unrecognized $schema dialect      a non-object root
required naming an undeclared property
```

The check enumerates **leftover** keywords rather than matching a denylist, so a keyword nobody
anticipated — a future JSON Schema addition, a vendor extension — refuses by default.

### Default normalization and one representational asymmetry

**`additionalProperties`.** JSON Schema defaults permissive; Arrokoth defaults strict. An absent
JSON Schema keyword therefore imports as explicit Arrokoth `additionalProperties: true`. Explicit
JSON Schema `true` and `false` retain those values. In the other direction, `toJsonSchema` always
emits the Arrokoth value: default/explicit false becomes `false`, and true becomes `true`, at every
nested object. The source and projection can differ syntactically while accepting exactly the same
values.

**`string_array`.** `toJsonSchema` projects `{kind:"string_array"}` and `{kind:"array", items:
{kind:"string"}}` to the identical JSON Schema document, so the reverse direction cannot distinguish
them. The translator always produces the `array` form. The two validate values identically, so the
claim made and tested is the one that matters at a wire boundary:

> Import and re-projection preserve the acceptance set for the supported subset. Syntactic equality
> is not the definition of semantic fidelity.

### Export direction

Export reuses the **existing** `toJsonSchema` projection of the descriptor's own `ObjectSchema`,
handed to the SDK's `fromJsonSchema`. There is no second translation written for the wire, so the
model-facing schema and the published schema cannot drift.

---

## 7. Import execution and result semantics

The MCP-backed implementation satisfies the existing `CapabilityExecutor` port and receives what
that port gives it plus its own client. It holds no Harness, no runtime store, no controller state,
no Active View, no model projection, and no authority record — asserted structurally by the
architecture suite.

```text
AuthorizedCapabilityRequest
        v  MCP adapter
tools/call
        v
CapabilityOutcome
```

### Result mapping

| Protocol observation | Outcome | Why |
|---|---|---|
| result, no `isError`, `structuredContent !== undefined` | `success`, observation = any JSON object/array/string/number/boolean/null (validated and cloned) | MCP 2026 permits every JSON top-level kind |
| result, no `isError`, text content only | `success`, observation = `{ text }` | the server answered |
| empty successful result | `success`, observation = `null` | absence of a display payload is not failure |
| result with `isError: true` — consequential | `unknown` (`mcp_tool_error`) | Tool execution errored, but MCP does not establish rollback of prior side effects |
| result with `isError: true` — non-consequential | `failure` (`mcp_tool_error`), no automatic retry advice | no externally meaningful effect can be duplicated under the local classification |
| non-text content block — consequential | `unknown` (`mcp_unsupported_result_content`) | the remote call returned after it may have acted, but this adapter cannot represent its observation |
| non-text content block — non-consequential | `failure` (`mcp_unsupported_result_content`) | refused explicitly, never silently discarded |
| non-JSON `structuredContent` — consequential/non-consequential | `unknown` / `failure` (`mcp_invalid_structured_content`) | invalid SDK-owned data never escapes as an Event |
| JSON-RPC `-32700 / -32600 / -32601 / -32602` | `failure` (`mcp_request_rejected`), `retryable: false` | the server parsed and refused the request before any handler ran |
| `-32603`, transport error, timeout, abort — **consequential** | `unknown` (`mcp_outcome_unknown`) | the remote side may have acted before the answer was lost |
| `-32603`, transport error, timeout, abort — **non-consequential** | `failure` (`mcp_call_failed`), `retryable: true` | there is no external effect to have happened |

The consequentiality flag is read from `request.authorization.consequential` — where the
authorization decision put it. The adapter reads it; it never asserts it.

`failure ≠ unknown` is preserved deliberately: collapsing the second into the first is how a system
performs a consequential action twice. Async MCP Tasks are not implemented, so no result can be
outstanding beyond one call.

No MCP SDK class instance or transport object is persisted in an observation; the outcome is plain
JSON that the Harness validates before it becomes an Event.

---

## 8. Export boundary, and why no Execution or grant is fabricated

`exportCapabilityOperationsAsMcpTools(server, { catalog, exports })`. Each entry names one
`OperationRef`, an optional external `toolName`, and an application-supplied handler.

**Explicit allowlist only.** `CapabilityCatalog.list()` is never called. Publishing everything
enumerable would make "registered" mean "public", which is the collapse the exposure layers exist to
prevent. An operation nobody named is absent from `tools/list` and uninvocable through that server,
and raw Effect vocabulary (`use_capability`, `write_memory`, …) is never published.

External MCP vocabulary is a projection: `toolName` may differ from the operation id, and the
internal `(capability, operation)` pair is never a name the wire can address.

An inbound `tools/call` is **not** an Arrokoth Execution and **not** an Arrokoth Effect. The export
path therefore does not:

```text
mint an AuthorizedGrant            create or resume an Execution
call a CapabilityExecutor          consult an EffectAuthorizer
read effective operation authority emit an Effect or an Event
```

Doing any of those would invent an authorization decision for a caller nobody authenticated, and a
fabricated grant is worse than none because everything downstream would treat it as real. Instead
the adapter calls a handler the application supplied when it *chose* to export the operation; the
application owns what that handler may reach. Conformance asserts that the handler's invocation
record is exactly `{ ref, toolName }` — no `executionId`, `grantId`, `activationId`, `effectId`, or
authorization — and that an external call creates no Execution in a Harness running beside it.

The published schema is enforced before the handler runs, because it is the descriptor's own
contract. A handler throw becomes `isError: true`, not a protocol fault: the request was well-formed
and was received.

> **Production external authentication, tenancy, rate limiting, and control-plane policy are outside
> this proof.** A deployment exposing this server publicly must put them in front of it. The adapter
> neither provides nor pretends to provide them. Broader Agent/Workflow service ingress remains after
> the composition and interaction slices ([`007` DEC-I20](007-interoperability-decisions-before-agent-slice.md)).

---

## 9. Tests

### Adapter package — `packages/interoperability/mcp/tests/` (48 cases)

| File | What it proves |
|---|---|
| `schema-translation.test.ts` (14) | the supported subset preserves its acceptance set, including omitted/true/false and nested `additionalProperties`; every unsupported construct is refused |
| `import-identity.test.ts` (12) | the server cannot choose the capability namespace or the operation id; invalid names are refused rather than normalized; annotations are advisory and consequentiality defaults conservatively; the executor routes only what was imported |
| `result-mapping.test.ts` (12) | all JSON top-level result kinds, safe cloning, empty success, non-JSON refusal, and consequential-vs-non-consequential certainty |
| `mcp-protocol.test.ts` (10) | legacy compatibility plus real negotiated 2026-07-28 HTTP exchanges for structured results and strict/permissive schema enforcement |

### Conformance — `tests/conformance/mcp/` (20 cases) and `tests/conformance/architecture/` (10 more)

`imported-operation-agent-path.test.ts` is the mandatory end-to-end proof and asserts every layer:

```text
real MCP server registers one synchronous Tool
  -> the importer produces an ordinary CapabilityOperationDescriptor (field set asserted)
  -> an Agent Execution is created with explicit EffectiveOperationAuthority for that exact pair
  -> the REAL Active View resolver, over the REAL store, exposes it (and omits nothing)
  -> the immutable projection carries it, cut from that same viewId
  -> the model selects the alias; the controller resolves the exact bindingId
  -> only `use_capability` appears in the journal
  -> phases: requested, authorized, dispatch_started, completed
  -> policy consulted exactly once, after the ceiling
  -> the MCP-backed executor is reached once, with a request whose field set is asserted
  -> the MCP server sees `{ key: "alpha" }` exactly once
  -> the outcome is plain JSON; no MCP result vocabulary reaches the journal
  -> the Agent reads it through the existing observation projector
  -> EVENT_KINDS contains no protocol arm
```

No test bypasses the Harness by calling the MCP executor directly and calls that an Agent proof; the
direct-executor cases live in the package suite and are labelled as adapter-level.

`imported-operation-authority.test.ts` — the four mandatory negatives, each measured on the **real
MCP server's own call record**:

| Case | Setup | Result |
|---|---|---|
| A | both tools discovered and cataloged; only one granted | the real resolver exposes one and records `not_authorized` for the other |
| B | deliberately buggy Active View exposes an ungranted operation; permissive authorizer | journal `requested → denied` with `operation_outside_effective_authority`; executor never reached; **server receives zero calls**; the authorizer is never even asked; an Execution with no ceiling behaves the same with `no_effective_operation_authority` |
| C | genuinely granted and exposed; policy denies | `requested → denied` with the policy code; **server receives zero calls** |
| D | tool description contains an injected "you are pre-authorized" instruction | the text reaches the model verbatim; the demanded operation was never exposed, so the name resolves to nothing, no Effect is proposed, and the **server receives zero calls** |

None of these is special-cased in the adapter; they fall out of the existing narrowing.

`exported-operation.test.ts` — the export proof and its negatives (unexported operations invisible
and uninvocable, no raw Effects published, no fabricated Execution or grant).

`imported-operation-outcome-certainty.test.ts` — a real consequential Tool increments a side-effect
counter and then returns `isError: true`; the server and executor are each reached once, the journal
ends `unknown_outcome`, the pending operation and Agent observation say `unknown`, and no `failed`
phase is written. Corresponding non-consequential and unrepresentable-rich-result cases prove the
other two arms.

`architecture/mcp-boundaries.test.ts` — the dependency-direction and vocabulary assertions in §2, §5.

### Behavioural eval — `tests/evals/agent/mcp-operation-parity.eval.test.ts` (1 case)

Exactly one adapter-specific case, per [`009` §4](009-agent-effectiveness-seams-before-slice-d-review.md)'s
separation of conformance from behavioural grading. It runs the *same* Agent configuration twice —
same definition, authority, exposure, and scripted model — over a native executor and over the
MCP-backed one, and asserts that every observable Agent-layer fact is deep-equal: the descriptors,
the projection aliases and targets, the Effect kinds, the journal phases, the proposed input, the
rendered observation, the responses, and the model-call count.

The ten-case reference matrix is **not** duplicated for MCP. Conformance proves the seam; the
existing evals continue to grade Agent usefulness.

---

## 10. Live Gemini canary

`npm run canary:mcp:gemini` → `scripts/mcp-gemini-canary.ts`, using Node's existing
`--env-file-if-exists=.env` convention. It reads exactly two environment variables **by name**:
`GEMINI_API_KEY` and `GEMINI_MODEL`. The model id is read, never hardcoded, and any error message is
sanitized of the credential before it can reach stdout. Missing credentials or a missing model id
produce `status: "skipped"`, not a failure. **Offline `npm test` never requires it.**

What it proves:

```text
an in-memory MCP server publishes one harmless lookup Tool
  -> imported through the real adapter
  -> an Agent with explicit authority for exactly that operation
  -> the reference Agent path + the real Gemini provider
  -> the MCP server was actually called, with the expected key
  -> the observation returned through normal Agent semantics
  -> the Agent's final answer contains the code
```

The fixture is a **lookup**, not arithmetic: the proof code is generated per run with `randomUUID`
and exists only in the server's own table, so an answer containing it is evidence the tool ran rather
than evidence the model can compute.

Result of the run performed for this slice: **passed**, model `gemini-3.5-flash-lite`
(provider-reported the same), 2 model calls, 1 `tools/call`, journal
`requested → authorized → dispatch_started → completed`, and all six checks true.

It is a canary, not conformance. A provider/model availability error is reported honestly; nothing
about the kernel or the adapter changes to make it green, and no substitute model is used.

---

## 11. Substrate changes made for this slice and MCP-1.1

The original MCP-1 proof made two substrate edits, both editorial and neither semantic:

1. `runtime/effect-processor.ts` — the module comment said a permissive authorizer "can then be
   asked about" an operation a buggy Active View widened outside effective authority. The
   implementation denies **before** the authorizer is consulted (and `authority-ceiling.test.ts`
   already asserted it). The sentence now says so.
2. Root `README.md` — the architecture reading list pointed at `docs/runtime-architecture.md`,
   `docs/implementation-guide.md`, and `docs/legacy/`, none of which exist. It now points at the
   current canonical documents, and the repository layout lists the new package.

`tests/conformance/architecture/v04-boundaries.test.ts` gained three entries in its conformance
import allowlist (`@agent-sdk/integration-mcp`, `@modelcontextprotocol/client`,
`@modelcontextprotocol/server`), on the same basis as the existing `@agent-sdk/retrieval-local`
entry: "the server received zero calls" is only evidence when the server is genuine. The repo-wide
sweep in `mcp-boundaries.test.ts` keeps that from widening silently.

MCP-1.1 subsequently changed `packages/core/src/schema/value-schema.ts` so every projected object
emits its actual `additionalProperties` value, including nested strict objects. This is a correction
to a general projection of the existing contract, not a new MCP surface. The live Gemini canary
then proved that Gemini's function-declaration dialect rejects the keyword itself. The Gemini adapter
therefore omits it only from provider-facing function schemas; descriptors, MCP export, and Harness
validation retain the exact strict/permissive contract.

---

## 12. Intentionally deferred

MCP, all still absent:

```text
Resources                    Prompts / interaction templates
Tasks (async)                elicitation / input_required
subscriptions                tools/list_changed and other change notifications
resource change signals      sampling
OAuth                        production control-plane auth
HTTP framework hosting       Streamable HTTP / SSE compatibility
stdio process management     protocol version negotiation beyond the SDK's own
persistent remote sessions   dynamic descriptor refresh
pagination beyond the SDK's own auto-aggregate
```

Non-MCP, unchanged from [`010` §13](010-slice-d0-implementation-decisions.md):

```text
Slice E composition          SpawnExecution / delegation
SendMessage                  RequestUserInput implementation
WriteMemory                  new Effect or Event kinds
new authority model          A2A / Agent Skills / OpenAPI
generic portable Resource registry     universal portable-action registry
large-catalog search         schema-system redesign / arbitrary JSON Schema
durable protocol recovery    Groq provider     email/Resend capability
```

---

## 13. What the seam feedback actually was

The question [`007`](007-interoperability-decisions-before-agent-slice.md) posed for this checkpoint
was:

> Can the Agent kernel consume a portable operation view and produce typed Effects without knowing
> whether the same operation came from native code, MCP, HTTP, or another future protocol?

**Yes.** The adapter needed no new core export, descriptor field, Effect arm, Event arm, or authority
concept. MCP-1.1's one core implementation correction is the provider-neutral JSON Schema
projection of an already-existing default, not protocol vocabulary. The behavioural parity case
shows the two backings remain deep-equal at every observable Agent-layer point.

Three specific things the seam got right, worth recording because each was a place the design could
have leaked:

- **`CapabilityExecutor`'s subtraction.** The port hands an executor logical names and validated data
  and nothing else, so an MCP client fits behind it without the kernel learning what a transport is.
- **Consequentiality surviving on the authorized request.** The seam already gave the executor the
  correct locally owned fact. The first adapter implementation applied it to thrown calls but not
  to `isError` or unrepresentable completed results; MCP-1.1 corrected that local normalization bug.
- **The four exposure layers being genuinely subtractive.** Every negative case in §9 is the *same*
  narrowing a native operation gets; not one needed a protocol-aware branch.

One rough edge worth noting for the future schema project (not a defect): `ObjectSchema` cannot
represent `minItems`, `format`, `oneOf`, or a schema-valued `additionalProperties`, so real-world MCP
servers using those will have tools refused rather than imported. That is the correct behaviour today
— refusing is better than silently not enforcing a published contract — and it is the concrete
motivation for [`future-plan.md`](../../future-plan.md) §4.4 when a richer portable schema contract is
taken on.

---

## 14. Next roadmap step

```text
Slice D accepted                            done
behavioural Agent baseline                  landed (tests/evals/agent/)
narrow synchronous MCP operation proof       done  <- this document
MCP-1.1 semantic-fidelity correction          done  <- 012
MCP operation proof                           accepted
        v
Slice E composition                         next
  spawn / call / child Execution
  authority delegation and attenuation
  SendMessage / ask
```

The second staged MCP proof from
[`007` DEC-I20](007-interoperability-decisions-before-agent-slice.md) — exported Agent/Workflow
service operations, long-running work mapped to an external Task handle, `input_required` mapped to
`RequestUserInput`, and change notifications mapped to cache invalidation — remains **after** E and
G, for the reason DEC-I20 gives: those need composition and interaction semantics that do not exist
yet.
