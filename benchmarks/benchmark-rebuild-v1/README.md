# benchmark-rebuild-v1 — Arrokothai subjects

This directory is the active clean P01/P02 rebuild for Agent_SDK v0.37.0. It does not import historical scenario prompts, graders, results, or adapter code.

## Native architecture

- P01 conversational facts live in structured memory; source facts live in document Knowledge; `compute_wall_volume` is a declared read tool with an injected deterministic executor. There is no Workflow because the task is consultative rather than a fixed process.
- P02 conversational and contact facts live in structured memory; the exact six-property and eight-room records live in record-set Knowledge; `send_lead_to_team` is an external side-effect tool with authoritative arguments, payload-specific confirmation, `once_per_session` idempotency, and an injected dry-run executor. No Workflow is added.
- Gemini proposes memory, retrieval, and tool requests. The runtime validates schemas, permissions, phase availability, confirmation, argument authority, and idempotency. Executors return authoritative `ToolResult` observations.

No framework-core file is changed by this rebuild.

## Live model convention

Copy [`.env.example`](../../.env.example) to `.env` and set both `GEMINI_API_KEY` and `GEMINI_MODEL`. Both are mandatory for these smokes; there is no fallback model or local reply path.

```bash
npm run smoke:rebuild:p01:arrokothai
npm run smoke:rebuild:p02:arrokothai
```

Each command writes a neutral `benchmark-raw-run-v1` JSON file under `results/`, including the conversation, requested and runtime-reported model identifiers, generation settings, model-call and usage data, canonical state, Knowledge events, complete tool/confirmation/executor events, dispatch count, errors, timing, and the framework-native event stream.
