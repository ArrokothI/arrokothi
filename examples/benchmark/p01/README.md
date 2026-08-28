# P01 benchmark subject

This directory implements the Craig Hempcrete text assistant against the ArrokothI checkout that
contains it. The reference website's Next.js UI, browser audio plumbing, and visual calculators are
not part of the agent subject; the externally observable text instructions, ten-message context
window, model defaults, turn results, and error trace are preserved here.

## Entrypoint

```bash
npm run example:benchmark:p01 -- --check
printf '%s' '{"protocolVersion":"1","turns":["I am planning a hemp-lime wall."]}' \
  | npm run example:benchmark:p01
```

Normal execution requires `GEMINI_API_KEY` (or another Gemini key name accepted by the framework
provider). `GEMINI_MODEL` is an optional application-level default. A request may override `model`,
`temperature`, and `maxOutputTokens` in `generation`. The importable `createP01Subject` surface also
accepts any ArrokothI `ModelProvider`, which is how offline validation and an external adapter inject
their own generation implementation.

Input is one JSON object on stdin. `turns` is a non-empty array of strings or `{ "message": "..." }`
objects. Output is one JSON object containing the initial assistant message, reconstructed
conversation, per-turn replies, events, compiled contexts, metrics, and final session state.
