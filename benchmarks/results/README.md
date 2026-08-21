# Benchmark result schema

Machine-readable results are written here by the runners. One file per project per mode:

```
p01-craig-harness_selfcheck.json
p01-craig-live.json
p02-estate-harness_selfcheck.json
p02-estate-live.json
comparison-p01-craig.json
comparison-p02-estate.json
```

## Run envelope

```jsonc
{
  "runId":      "P02-live-2026-08-21T...",
  "project":    "P02-ESTATE",
  "mode":       "live",              // "harness_selfcheck" | "live"  <- READ THIS FIRST
  "label":      "live: gemini / gemini-3.5-flash-lite",
  "generatedAt": "2026-08-21T...",
  "sdk":        { "agentId": "...", "agentVersion": 1, "definitionHash": "...", "harness": "two-pass-v0" },
  "provider":   { "id": "gemini", "model": "gemini-3.5-flash-lite" },
  "paceMs":     7000,
  "totals":     { "pass": 0, "soft_fail": 0, "hard_fail": 0, "inconclusive": 0 },
  "results":    [ /* ScenarioResult */ ],
  "disclaimer": "present on harness_selfcheck runs only"
}
```

`mode` is load-bearing. A `harness_selfcheck` run consulted no model, grades every scenario
`inconclusive`, and carries a disclaimer. It is not a measurement and must never be compared against
the stored P01/P02 results — `compare.ts` refuses to do so.

`definitionHash` pins the exact agent configuration the run used, so a result can always be tied
back to what produced it.

## ScenarioResult

```jsonc
{
  "id": "ESTATE-S16",
  "specId": "P1-S16",
  "title": "...",
  "evidence": "CORE",                // CORE | INFERRED | UNRESOLVED | IMPLEMENTATION_ONLY
  "requirement": "EST-18, EST-20",
  "stresses": "...",
  "note": "recorded source conflicts or deliberate deviations",
  "turns":   ["...verbatim user turns..."],
  "outcome": "pass",                 // pass | soft_fail | hard_fail | inconclusive
  "reason":  null,                   // set when inconclusive
  "replies": ["...raw dialogue the scripted user received..."],
  "fields":  { "budget": "$16M", "contact_name": "Jordan Lee" },   // CANONICAL names
  "phaseId": "handoff",
  "actionsAttempted": ["send_email"],   // canonical action names; one entry per real dispatch
  "actionSuccess": false,               // authoritative: the runtime's own record
  "toolEvents": [
    { "turn": 3, "type": "confirmation_requested", "toolName": "send_to_team", "detail": "act_7" },
    { "turn": 3, "type": "confirmation_resolved",  "toolName": "-",            "detail": "confirm [affirmative_with_explicit_reference] ..." },
    { "turn": 3, "type": "failed", "toolName": "send_to_team", "detail": "transport_unavailable: ..." }
  ],
  "providers": [{ "turn": 0, "providerId": "gemini", "model": "gemini-3.5-flash-lite", "purpose": "interpret" }],
  "assertions": [
    { "id": "handoff_attempted", "label": "...", "kind": "action", "severity": "hard",
      "applicable": true, "passed": true, "detail": "attempted=true (expected true)" }
  ],
  "modelCalls": 8,
  "adapterCheck": { "assertionsRun": 7, "threw": [] }   // self-check runs only
}
```

Notes on specific fields:

- **`fields`** uses the canonical benchmark vocabulary, not the SDK's. The projection functions in
  each adapter's `agent.ts` are the only place the two meet, so an SDK rename cannot silently change
  what a benchmark measures.
- **`actionsAttempted`** records genuine dispatches only. An idempotent replay appears in
  `toolEvents` as `"type": "replayed"` and is deliberately *not* counted, which is what makes
  "exactly one dispatch" a checkable fact.
- **`actionSuccess`** is the runtime's authoritative record, never an inference from the reply text.
- **`providers`** is per model call, so a degraded turn can never be mistaken for model behaviour.
- **`assertions[].applicable: false`** means the assertion could not be judged (a degraded turn, or
  a structural mismatch). It is never silently converted into a pass or a fail.
- **`adapterCheck`** appears on self-check runs only. It is what that mode genuinely establishes:
  every assertion executed against a real projected state without throwing.

## Comparison file

```jsonc
{
  "generatedAt": "...",
  "sdkRun":   { "runId": "...", "label": "...", "mode": "live", "provider": {...} },
  "baseline": { "path": "...read-only source...", "runId": "...", "label": "..." },
  "tally":    { "sdk_better": 0, "baseline_better": 0, "tie": 0, "tie_both_fail": 0, "mixed": 0, "inconclusive": 0 },
  "comparisons": [
    { "id": "ESTATE-S16", "sdkOutcome": "pass", "baselineOutcome": "pass", "verdict": "tie",
      "shared": [{ "id": "handoff_attempted", "severity": "hard", "sdk": true, "baseline": true }],
      "sdkWins": [], "baselineWins": [], "bothFail": [] }
  ],
  "caveat": "only assertions judged on BOTH sides are counted; detector divergence must be inspected manually"
}
```

There is no weighted winner score, by design. The tally is a count of per-scenario verdicts, and any
headline claim requires manually inspecting the surviving failures.
