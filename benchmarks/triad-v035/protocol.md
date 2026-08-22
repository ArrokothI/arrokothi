# Protocol notes

- Dataset role: `retrospective-development`.
- Subject definitions and Agent_SDK runtime packages are frozen.
- Canonical scenarios and graders are loaded from the authoritative Agenerateor repository and copied byte-for-byte into run evidence with SHA-256 provenance.
- Arrokothi semantic preflight uses `GeminiProvider`; its iterative execution uses `createStrandsGeminiEngine`. Both receive Agent_SDK's own root `.env` credential, while model policy comes from the frozen definitions.
- One system executes at a time. System order rotates `bespoke → agenerateor → arrokothi`, then `agenerateor → arrokothi → bespoke`, then `arrokothi → bespoke → agenerateor`.
- A degraded/fallback result is infrastructure evidence, never semantic evidence. HTTP adapters retry the same turn without advancing state. Retries are bounded.
- Logical model calls are counted at the nearest behavior-preserving boundary. Agent_SDK uses `RunTurnResult.metrics` and model-call events. Agenerateor uses its returned extraction/provider metadata. Bespoke call counts follow the faithful provider boundary. Unknown token fields remain `null`.
- Email/handoff execution is always dry-run or locally mocked, including success and controlled failure paths.
