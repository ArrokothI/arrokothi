# P01 — Craig Hempcrete

This is the standalone Agent_SDK build of P01. It is reconstructed from the Craig reference
project's requirements and product facts, without importing its chat route, prompt, fallback
classifier, UI state, or runtime implementation.

The build maps the product into Agent_SDK as follows:

- `AgentDefinition`: goal, semantic rules, memory, Host Context, Knowledge, and policies;
- Structured Memory: project dimensions, approach, priority, wall type, and jurisdiction;
- document Knowledge: product, code, method, cost, curing, and business-limit facts;
- deterministic Tool: wall-area/thickness arithmetic with an authoritative result;
- no Action: the reference product has no checkout, order, payment, or production lead system.

The executable constructs the primary `AgentHarness` with the offline `ReferenceLoopEngine`, so it
is a complete standalone Agent_SDK application without network/quota requirements. A host can swap
in `StrandsLoopEngine` without changing this AgentDefinition, Knowledge, or Tool authority.

The older Word requirements say IRC Appendix AU, while the current reference application's explicit
assistant instructions and visible product copy say Appendix BL. This build follows the current
reference implementation (Appendix BL) and keeps the local-adoption/permit caveat.

Run the offline end-to-end fixture from the workspace root:

```bash
npm run example:p01
```
