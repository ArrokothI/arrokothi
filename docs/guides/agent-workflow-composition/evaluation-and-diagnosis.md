# Test and diagnose an application

[Guide home](README.md). Application tests establish business behavior; conformance establishes
runtime boundaries. `npm run test:evals` is the repository's reference-Agent behavior baseline, not an
automatic evaluator of your new application.

## Validate in layers

```sh
npm run test:example:execution-kernel  # executable builder examples, offline
npm run typecheck                    # public TypeScript wiring throughout the repository
npm run check:builder-docs           # local links/anchors and public imports in builder artifacts
npm test                             # package + semantic conformance tests
```

Run your application's own tests first. Use a scripted/deferred `ModelProvider` to control decisions
and timing, and a fake external system whose records you can assert. `/testing` scaffolds are useful
in tests; inspect what authority and controllers a helper supplies rather than copying its default
behavior into your runtime. [patterns.test.ts](../../../examples/execution-kernel-minimal/patterns.test.ts)
uses the same public assembly as the example.

Cover required facts, schema rejection, exact calculations, action denial, confirmation pending and
decline, failure/unknown outcome, corrected state, repeated inputs, budget exhaustion, and child
return/cancellation where relevant. Add slow settlement tests when asynchronous behavior matters.
Assert that **no executor ran** on refusal, and that success changed the external record. Checking
only a response string can pass when nothing happened.

Evaluate model quality separately with realistic user language and a live configured provider:
grounding, task completion, correctness of retained state, response quality, turns, model/action
calls, context/token use, latency and cost. Keep held-out cases. Provider-reported metrics may be
missing; do not report missing usage as zero. Offline scripted outputs prove wiring, not language
understanding. Live canaries are optional and require deployment credentials.

## Find the layer that failed

| Symptom | Inspect first | Likely cause / next step |
|---|---|---|
| Wrong `defineAgent` shape or no Harness compatibility | Imports and package exports | Legacy root import; use `/execution` |
| No model request | `inspect(id)`, controller registration, input receipt | Missing controller, unknown definition/ref, no Agent start input, model resolver failure |
| No visible operations | Effective authority + actual model projection | Missing `operationAuthority`, no authored refs, catalog mismatch or exposure limit |
| Visible action but no executor call | Effect journal, pending confirmations | Missing/denying authorizer, exact gate, declined request, invalid request |
| No memory in context / no write callable | Binding, authored keys, resolver and grants | Each is independently required; defaults deny |
| “Required” field is unset | `structuredMemoryOf(id)` values | Declaring a field creates no initial value; host needs an exact completeness check |
| Workflow ignores next user turn | Workflow start state | Stock Workflow accepts only its initial input; use an Agent or host-created per-turn job |
| Parent waits after child answered | Child lifecycle and terminal result | `respond_and_wait` child, absent terminal schema, or still-pending work |
| Child creation rejected | Journal, definition/version, lineage credits | Spawn policy and budget are separate; default credits are zero |
| Child object return fails | Child terminal schema + Stage contract | Stock child Stages only accept string/null |
| Final Stage output missing from Workflow result | Completion transition | No dynamic terminal-result forwarding; output via emission/store is separate |
| Agent fails after several successful turns | Failure code, `readAgentControlState` | `agent_model_call_budget_exhausted`; budget is Execution-wide |
| Tool inaccessible in LLM Stage | `maxModelPhases` and declared callables | Nonempty callables require ≥2 phases and `capabilityCalls: 'required'`; last phase cannot request tools |
| Runtime “idle” but app unfinished | `waitingFor`, pending operations, resumptions, confirmations | Idle only means no queued Activation; keep driving after settlement |
| Same consequential action happens twice | Exact input + confirmation path + external action ID | Check known confirmed-replay gap and durable external idempotency |
| Long conversations get expensive | Retained state size and compiled context | Message window does not trim stored history or bound bytes per message |

## Observability APIs

`Harness.inspect(id)` returns runtime status, waiting dependency, failure and terminal result.
Do not use it as a mutable runtime handle. Query only the evidence you need:

| Question | Public read API |
|---|---|
| What did the app communicate? | `emissionsOf(id)`; track IDs/cursor |
| Why did it transition? | `transitionsOf(id)` |
| Was an Effect requested, authorized, dispatched, settled? | `effectJournalOf(id)`; correlate Effect/pending IDs |
| What is still pending? | `pendingOperationsOf(id)`, `controllerResumptionsOf(id)` |
| What can run / what facts were committed? | `effectiveOperationAuthorityOf(id)`, `structuredMemoryOf(id)` |
| Which human action is needed? | `confirmationRequestsOf(id)`, `userInputRequestsOf(id)` |
| Which child/peer blocks it? | `childExecutionLinksOf(id)`, `peerRequestLinksOf(id)`, `waitForEdgesFrom(id)` |

For the stock Agent, `readAgentControlState(context.control.progress)` safely decodes versioned state
and reveals transcript, pending calls, step count and invocation snapshot. Handle its tagged result;
never cast opaque progress into application truth. Agent model trace callbacks live under
`createAgentController({ models: { resolver, trace } })`; Workflow has its own `trace` and model trace
options. Trace data may contain sensitive inputs, so apply the application's logging/redaction policy.

Slow local model work uses ControllerResumptions; capability work uses PendingOperations and result
Events. Do not fake either by delivering `capability.completed` through external ingress or calling
`settleEffect` with invented results. Trusted settlement is for an executor/environment result that
actually occurred.

## When to change the framework

Reproduce a suspected defect with public APIs, inspect the owning contract and relevant conformance,
and separate application misuse from missing ergonomics and semantic uncertainty. Fix a bounded,
unambiguous defect with regression coverage when authorized. Record larger issues in
[builder findings](../../development/007-application-builder-ergonomics-findings.md); do not alter
kernel semantics just to make an application test green. Continue application work using documented
supported paths. A model quality failure alone is not evidence of a kernel bug.
