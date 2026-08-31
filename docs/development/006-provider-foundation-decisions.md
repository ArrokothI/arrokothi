# Provider Foundation Decisions Before Workflow/Agent Execution

> **Status: implemented v0.4 provider-foundation baseline.**
>
> This note records the narrow decisions made in the provider-foundation slice after Slice B and
> before Workflow Slice C / Agent Slice D. Canonical architecture documents and accepted migration
> decisions remain authoritative.

## Implemented boundary

```text
logical model ref + portable requirements
        ↓
ModelResolver
        ↓
ResolvedModel (descriptive deployment data)
        ↓ provider-id registry at composition root
ModelProvider
        ↓
semantic model output + separated metadata/diagnostics
```

Resolution and invocation are separate responsibilities. A provider receives an already-resolved
concrete provider/model description and cannot perform application-level routing. Neither contract
can reach the Harness, RuntimeStore, Effect processor, or CapabilityExecutor.

## Portable vocabulary

The initial feature vocabulary is intentionally limited to:

```text
text
capability calls
structured output
cancellation
usage metadata
```

Text is the required baseline. Each other requirement is either `required`, `optional`, or absent.
Required unsupported features fail during resolution. Missing optional features are listed on the
resolved result; no fallback is silently selected by core or a provider.

Streaming, media, provider caching, reasoning controls, grounding/search, computer use, logprobs,
and vendor safety options remain outside the portable contract.

## Capability-call boundary

The model layer uses capability-call specs and capability-call result data. These carry no executor,
authority grant, Effect proposal, or settlement function. A later Agent/LLM controller may interpret
a model call request and propose an Effect; only the Harness can authorize and dispatch it.

`CapabilityCatalog` remains unchanged and separate. Model-facing callable specs are a projection of
the active exposed view, not a transfer of capability ownership into the model subsystem.

## Structured output

Structured output uses the existing dependency-free `ObjectSchema`. The provider boundary validates
the normalized result before returning it. A model that cannot satisfy a required structured-output
feature is rejected during resolution; there is no prompt-only silent fallback.

## Failures

Resolution uses stable configuration categories:

```text
invalid_configuration
logical_model_not_configured
provider_not_registered
concrete_model_unavailable
required_feature_unsupported
```

Invocation uses stable provider categories:

```text
invalid_request
authentication
rate_limit
transport
provider_rejected
invalid_response
cancelled
```

Vendor codes are normalized at the adapter boundary. Retryability remains an explicit property of
an invocation error rather than being inferred by a controller from a vendor string.

## Migration disposition

The new target API is additive under:

```text
@agent-sdk/core/ports
@agent-sdk/core/reference
@agent-sdk/core/testing
```

The legacy root `ModelPolicy { providerId, model }` path remains temporarily isolated so current
pre-v1 Session/Flow examples, Studio, and benchmark subjects keep their known baseline. It is not
imported by the new core model foundation and is not a target definition contract.

The Gemini package now provides `GeminiModelProvider` for the new port and runs the published model
provider contract against deterministic HTTP fixtures. The old `GeminiProvider` is explicitly
deprecated compatibility for unmigrated legacy consumers. Both surfaces share the proven Gemini
HTTP retry and schema-projection mechanisms; only the v0.4 surface uses the stable resolution,
capability, response, and error contracts.

## Groq, local, and Strands readiness

Static resolution conformance includes a deployment mapping for provider `groq` and concrete model
`qwen/qwen3.8-27b`; no Groq transport is implemented in this slice. A `local` provider/model mapping
uses the same contract without selecting a backend.

The inspected Strands SDK integration requires a native `Model` object but its model boundary is
bridgeable: Slice D can implement a Strands `Model` backed by `ModelProvider` and `ResolvedModel`.
Strands' existing invocation-local state, cancellation, capability interception, context refresh,
and metadata hooks remain useful mechanisms. Its current provider-id/Google fallback is legacy and
must not own logical model resolution in Slice D.

No architectural incompatibility or human decision was found for Slice C/D. This slice does not
implement Workflow Stages, an Agent controller, an Agent executor loop, or a Strands bridge.
