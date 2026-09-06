# Execution-kernel application examples

Start from the [builder guide](../../docs/guides/agent-workflow-composition/README.md).
These examples run offline using the current public Execution API. The Harness, controllers,
authorization, state commits, child creation and confirmation are real; the model and external
publisher are deterministic fakes. They demonstrate implementation behavior, not language quality.

```sh
npm install
npm run example:execution-kernel
npm run example:application-patterns
npm run test:example:execution-kernel
npm run typecheck
```

| File | Read for |
|---|---|
| [app.ts](app.ts) | Small standalone Agent assembly; catalog, executor, operation ceiling, model resolution, policy |
| [main.ts](main.ts) / [app.test.ts](app.test.ts) | Allowed/denied lookup with identical model prose; journal establishes what happened |
| [settle.ts](settle.ts) | Shared finite offline pump; distinguish input/confirmation waits from unsettled model/capability work |
| [classification.ts](classification.ts) / [classification.test.ts](classification.test.ts) | One-phase labelled LLM Stage, authored feature requirements, exact branch routing |
| [patterns.ts](patterns.ts) | Full memory chain, several-turn Agent, current-state action gate, exact confirmation, Workflow → Agent child → Function Effect barrier |
| [patterns-main.ts](patterns-main.ts) / [patterns.test.ts](patterns.test.ts) | Fake UI driver, state/action assertions, stale title, decline, budget exhaustion, child return, application idempotency |
| [provider-wiring.ts](provider-wiring.ts) / [provider-wiring.test.ts](provider-wiring.test.ts) | Gemini wiring for reference/Strands executors and Workflow; fake-HTTP validation without a key |

Copy the relevant composition root into your application and replace domain definitions/policy and
executor code. Do not treat these example helpers as a new SDK. Runtime files import only
`@arrokothi/core` (or its focused `/execution` entry point), `/ports`, `/reference`, and concrete
provider adapters; `/testing` belongs in tests.

The fake publisher creates one article per exact title and returns an existing receipt on repetition.
This is a deliberately simple application unique-key rule. A real service should use a durable
application action ID and atomic conditional write. Runtime `per_input` recognition covers direct and
confirmed dispatch; the repeated-proposal test verifies that the known duplicate replays without a
second publisher call while the application guard remains in place for crash-safe external correctness.

`settleOffline` drains finite offline work. It is not a network timeout or a production worker loop.
The examples use in-memory stores and deterministic IDs/clocks; they provide no process-crash
recovery. The CLI's automatic approval is solely a simulated decision for a fake publisher. A real
application must present the stored proposal and resolve it through an authenticated human action.
