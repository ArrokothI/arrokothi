# Strands + Gemini

This v0.37 example wires an Agent_SDK `AgentDefinition`, Durable Session, semantic Preflight,
Agent_SDK document Knowledge, `CapabilityGateway`, and the canonical `StrandsLoopEngine` together.

The default command is deterministic and makes no network request:

```bash
npm run example:strands
```

With Gemini credentials, the same application can use Strands' Google model implementation:

```bash
GEMINI_API_KEY=... npm run example:strands -- --live
```

Credentials enter only at the application boundary and are never stored in `AgentDefinition`.
The example relies on full authoritative Knowledge observations and the generic invocation-local
read cache; it has no one-call retrieval rule or product-specific terminal correction.
