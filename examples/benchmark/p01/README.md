# P01 — Craig Hempcrete consultative assistant

A benchmark subject built on the current ArrokothI 0.8.x Execution-kernel surfaces
(`@arrokothi/core/execution`, `/ports`, `/reference`). It is a multi-turn consultative assistant for
hemp-lime (hempcrete) construction: it scopes wall/floor area, layer thickness, and material volume,
and explains structural and code context without overclaiming.

## Composition

| Concern | Where it lives |
|---|---|
| Multi-turn conversation, prose interpretation, tone, choosing the one follow-up question | **one Agent Execution** (`agent.ts`), model-directed |
| Current project dimensions + construction context; corrections; out-of-order inputs | **Structured Memory** fields `construction_context`, `wall_area_sq_ft`, `layer_thickness_in` — latest committed write wins |
| `volume_m3 = area_sq_ft * thickness_in / 12 * 0.0283168`; invalid-dimension rule | **`volume.ts`**, run only inside the `hempcrete.estimate_volume` capability executor (`app.ts`) — never model arithmetic |
| What the Agent may do at all | deny-by-default `EffectAuthorizer`, operation ceiling, and memory write-exposure grant (`app.ts`) |

The model only ever interprets language and explains the number it was given. It never performs the
arithmetic, and the committed state and the tool result are the source of truth.

## Run

```bash
npm run example:benchmark:p01 -- --check

printf '%s' '{"protocolVersion":"1","sessionId":"s1","generation":{"provider":"gemini","model":"gemini-3.5-flash-lite","temperature":0},"turns":[{"message":"I want a small backyard office, about 180 sq ft. How much hempcrete do I need?"}]}' \
  | npm run example:benchmark:p01
```

Live execution needs `GEMINI_API_KEY` (or `GOOGLE_API_KEY`) in the environment. The injected
`generation` config is respected as-is: provider `gemini`, the given model, temperature, and
`maxOutputTokens`. No other model is contacted for planning, correction, or rewriting.

stdout carries exactly one JSON object (`protocolVersion`, `subject`, `sessionId`, `conversation`,
`turns`, `projectState`). Diagnostics go to stderr.

## Tests

```bash
node --test --experimental-strip-types examples/benchmark/p01/subject.test.ts
```

Deterministic, offline, scripted-model. They cover the pinned arithmetic, invalid-dimension
rejection, definition validity, protocol parsing, cross-turn state retention, out-of-order inputs,
correction supersession across an unrelated turn, and deny-by-default authority.
