# Agent_SDK v0.35 P01/P02 triad benchmark

This is a **RETROSPECTIVE DEVELOPMENT-SET / REGRESSION COMPARISON**. P01 and P02 informed Agent_SDK's development; they are not held-out evidence.

The primary runner compares, scenario by scenario:

- the original bespoke implementation;
- the frozen Agenerateor reconstruction;
- the frozen Arrokothi Agent_SDK definition running through the canonical v0.35 `AgentHarness` and `StrandsLoopEngine`.

All agent-side text inference must request `gemini-3.5-flash-lite`. The runner fails closed on missing/distinctness credential checks or an observed model mismatch. Each scenario receives a fresh session and system order rotates by scenario. External handoff/email transports are dry-run or locally mocked.

## Prerequisites

Start the three local services in separate shells:

```sh
# Agenerateor (loads .dev.vars)
cd ../Agenerateor && npm run dev

# Craig (loads its own .env)
cd ../Craig-Hempcrete-DemoSitee && npm run dev -- --port 3110

# EstatePro mock email endpoint; never sends real email
cd ../Agenerateor/tests/benchmarks/real-agents/estate
ESTATE_MOCK_INJECT_FAKE_CREDS=1 node --import ./mock-nodemailer-loader.mjs ./bespoke-email-server.mjs
```

Then, from Agent_SDK:

```sh
BENCHMARK_MIN_CALL_INTERVAL_MS=15000 npm run bench:triad-v035
```

Useful controls are `ONLY_PROJECT=p01|p02`, `ONLY_SCENARIO=<id>`, `BENCHMARK_MIN_CALL_INTERVAL_MS`, `BENCHMARK_MAX_RETRIES`, and `BENCHMARK_RETRY_BASE_MS`.

The runner copies and hashes authoritative canonical inputs into each result directory and writes records incrementally so an interrupted run remains auditable.
