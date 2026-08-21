# P02 — EstatePro

This is the standalone Agent_SDK build of P02. It is reconstructed from the EstatePro reference
project's property catalog and concierge behavior, without importing its React state machine,
embedded prompt, Gemini calls, Google Maps tool, or email implementation.

The build maps the product into Agent_SDK as follows:

- `AgentDefinition`: goal, semantic rules, memory, Host Context, Knowledge, Flow, and policies;
- Structured Memory: current intent and criteria, corrections, selected property, and contact data;
- record Knowledge: exact property and room data with deterministic filtering;
- document Knowledge: rental, availability, seller-routing, and capability limits;
- coarse Flow: qualification, seller routing, confirmation-gated handoff, and completion;
- Action: one injected human-handoff executor with exact-payload consent and session idempotency.

The executable constructs the primary `AgentHarness` with the offline `ReferenceLoopEngine`, so it
is a complete standalone Agent_SDK application without network/quota requirements. A host can swap
in `StrandsLoopEngine` without changing this AgentDefinition, record Knowledge, Flow, or handoff
authority.

Run the offline end-to-end fixture from the workspace root:

```bash
npm run example:p02
```
