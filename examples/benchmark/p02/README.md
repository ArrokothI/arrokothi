# P02 benchmark subject

This directory implements the EstatePro text concierge against the ArrokothI checkout that contains
it. The source website's React presentation and browser voice/audio plumbing are reference-framework
details; this subject preserves the staged text contract, six property records, Google Maps-compatible
grounding seam, validated lead state, automatic completion handoff, errors, trace, and serialization.

## Entrypoint

```bash
npm run example:benchmark:p02 -- --check
printf '%s' '{"protocolVersion":"1","turns":["I want to buy."]}' \
  | npm run example:benchmark:p02
```

Normal execution requires `GEMINI_API_KEY` (or another Gemini key name accepted by the framework
provider). A request may override `model`, `temperature`, and `maxOutputTokens` in `generation`. The
reference model is `gemini-3.5-flash-lite`.

The importable `createP02Subject` surface accepts any ArrokothI `ModelProvider`, an optional
`WebSearchProvider` for Google Maps-compatible place grounding, and a `ToolExecutor` for `send_email`.
The CLI and default subject use a dry-run email executor, so benchmark execution cannot send a real
message. A production host may inject its own transport; the reference application's `GMAIL_USER`
and `GMAIL_APP_PASSWORD` remain transport-level concerns rather than model-visible configuration.

Input is one JSON object on stdin. `turns` is a non-empty array of strings or `{ "message": "..." }`
objects. Output contains the initial assistant message, reconstructed conversation, per-turn replies,
events, compiled contexts, metrics, and final validated session state.
