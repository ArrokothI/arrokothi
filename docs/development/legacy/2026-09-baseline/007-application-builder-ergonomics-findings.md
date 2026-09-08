# Application-builder findings

> **Historical snapshot, retired 2026-09-07.** Its status and next-step language describe the earlier checkpoint. Use the [active development plan](../../001-current-status-and-roadmap.md) and [findings register](../../003-evidence-and-findings.md) for current decisions.

Engineering observations from the current public Execution surface, not architecture changes or a
new roadmap. The [builder guide](../../../guides/agent-workflow-composition/README.md) documents usable paths.
This review used repository implementation, canonical documents and ordinary conformance/examples.
No domain-specific evaluation requirements informed the guidance.

## Fixed during the earlier builder-guidance work

**Confirmation rule shadowing — bounded implementation defect.**
[createCapabilityConfirmationPolicy](../../../../packages/core/src/reference/confirmation-policy.ts)
selected the first matching capability, then returned “not required” if its operation list did not
match. With rules for `world.trade/cancel` followed by `world.trade/execute`, execute bypassed its
listed confirmation. The lookup now matches capability and operation together, preserving first
matching-rule precedence and wildcard rules. The new
[mechanical confirmation regression](../../../../tests/conformance/interaction/mechanical-confirmation.test.ts)
failed before the fix (executor called before approval) and passes after it. No Effect or authority
contract changed.

**Confirmed capability redispatch — runtime correctness defect.**
[effect-processor.ts](../../../../packages/core/src/runtime/effect-processor.ts) previously ran the
prior-operation guard only on direct capability dispatch, while approval entered through the
`resume` path. Distinct confirmed `per_input` proposals could therefore bypass success replay and
the unresolved/unknown consequential-operation blocks. The repair performs an early guard before
creating a redundant confirmation when prior truth is already known, then repeats duplicate
classification in the same RuntimeStore transaction that commits dispatch intent. The
approval's own gated PendingOperation is excluded from candidates and is reused/settled for replay
or refusal, preserving correlation and Events. This makes concurrent approvals linearize so at most
one equivalent consequential operation reaches the executor. Dedicated mechanical-confirmation
conformance covers prior success, concurrent approvals, same-ID approval, unresolved/unknown,
definite failure, non-success terminal states, different inputs, and `none` scope. Application-owned
durable idempotency and reconciliation remain required across process crashes and uncertain external
outcomes.

**Guidance defects.** The old front door required conceptual reading and a 13-step procedure before
useful implementation, repeated the same traps across many pages, and routed some missing conveniences
to “record and stop”. Replaced by runnable-first routing, a public API map, compiled patterns/provider
wiring and concrete diagnosis. Corrected claims about host memory writes, stale between-turn gates,
Stage/terminal return, call-budget lifetime and model explanations guaranteeing exact displayed facts.
The minimal example now drains dispatched capabilities and distinguishes input waits from arbitrary
Effect waits through a shared finite offline pump. The implementation baseline's
“deadline/cancellation propagation” wording was corrected to actual child
cancellation settlement without cascade or configured child-result deadlines.

## Authoring and API concerns left for discussion

| Observation and evidence | Builder impact | Assessment / promising direction |
|---|---|---|
| Manual core assembly needs many independently deny-by-default collaborators | Missing wiring can look like model inaction | Addressed by the supported `@arrokothi/sdk` composition and preflight; [design and evidence](009-sdk-bootstrap-design-and-findings.md). Independent grants remain explicit |
| Stock controllers omit spawn/message/user-input actions that generic Effects support: [Agent controller](../../../../packages/core/src/controllers/agent/controller.ts), [Stage requests](../../../../packages/core/src/workflow/observations.ts) | Natural application compositions require host/port work | Authoring coverage gap, not absent kernel vocabulary. Consider explicit stock controller action interfaces with conformance |
| Agent `maxModelCalls` defaults to 8 and `state.step` accumulates across turns: [spec](../../../../packages/core/src/agent/spec.ts), [controller](../../../../packages/core/src/controllers/agent/controller.ts) | A healthy conversation eventually fails; no public budget-renewal operation | Internally consistent. Decide deliberate continuity/budget policy; possible future bounded renewal needs abuse/spend analysis |
| Compiler slices model-visible messages, but Agent state retains the full transcript: [compiler](../../../../packages/core/src/controllers/agent/information.ts), [state](../../../../packages/core/src/agent/control-state.ts) | Long-lived chat grows retained state; message count does not bound per-message bytes | Strategy/ergonomics concern. Measure serialized progress and introduce explicit compaction/retention policy without losing pending invocation truth |
| Stock Workflow completion accepts only literal terminal values or none: [TerminalProposal](../../../../packages/core/src/workflow/spec.ts), [transitions](../../../../packages/core/src/controllers/workflow/transitions.ts) | Computed final Stage output cannot be returned directly by a child Workflow | Internally consistent but composition-limiting. Evaluate an explicit validated result selector, keeping Stage output separate from terminal commitment |
| Child Stages accept only text/null; Agent completion forwards response text, not parsed objects: [Workflow controller](../../../../packages/core/src/controllers/workflow/controller.ts), [Agent completion](../../../../packages/core/src/controllers/agent/controller.ts) | Typed terminal schema vocabulary overpromises stock structured-return ergonomics | Do not silently coerce. Consider explicit adapters/typed output selection at the boundary in a separate design |
| Structured Memory fields start unset, host has no public setter, Stage context has no reader, spawned children have no binding: [binding](../../../../packages/core/src/execution/structured-memory.ts), [Stage](../../../../packages/core/src/ports/stage.ts), [spawn](../../../../packages/core/src/runtime/effect-processor.ts) | Initialization, deterministic gates and reusable child state require substantial host wiring | Some boundaries are intentional. Evaluate an explicit authorized initialization/read-view story rather than passing ambient stores into Stages |
| [Canonical composition §4](../../../composition.md#4-stage-transition-contract) recommends later Stages read Structured Memory; stock Stages cannot. Artifact/File is canonical but has no API | Small edge values plus unavailable shared-state readers leave awkward data-flow choices | Coverage/design tension, not resolved here. Reconsider Stage value restrictions together with explicit resource/memory views; never treat the canonical sketch as executable today |
| Forks accept one adapter-free Stage per branch and a Function join successor: [validation](../../../../packages/core/src/workflow/validation.ts) | Natural nested/multi-step plans are rejected | Deliberate implementation scope. Expand only with clear branch-state, failure, cancellation and result contracts |
| Derived queries are authored; closed claim records have no supersession/currentness metadata: [spec](../../../../packages/core/src/agent/spec.ts), [claims](../../../../packages/core/src/execution/derived-semantic-memory.ts) | Dynamic retrieval/currentness needs capability/application policy | Replaceable strategy/API limits. No new claim fields or memory semantics introduced |
| Allow-list policy chooses first matching capability, not first matching capability+operation: [authorizer](../../../../packages/core/src/reference/allow-list-authorizer.ts) | Multiple operation-specific grant entries unexpectedly deny later operations | Unlike confirmation, combining grants/constraints can widen authority, so not changed casually. Consolidate one capability rule or use a custom policy; define overlap semantics before improving helper |

## Capability schema validation boundary

**Observed API/enforcement asymmetry.**
[Model response validation](../../../../packages/core/src/model/validation.ts) checks callable arguments
against projected schemas; the Function/custom-controller `UseCapability` path in
[EffectProcessor](../../../../packages/core/src/runtime/effect-processor.ts) checks proposal shape and
permission but does not validate input against `CapabilityCatalog.input`. Agent controller binding
also does not itself replace provider schema validation. An executor cannot assume every caller
passed the model-provider path.

**Impact:** a catalog's bounded schema is not a universal domain enforcement boundary. Validate
external/domain input in the capability implementation and policy where relevant. The example
publisher validates title length independently. The public ValueSchema validation helpers are
exported from the root and `/execution` semantic surfaces.

**Assessment:** whether catalog validation should be centrally mandatory is an API/contract decision;
unknown-catalog capabilities currently have conservative consequentiality handling and may be legal.
Do not change that behavior as a side effect of documentation. Investigate a consistent public
validation utility and clearly owned dispatch-validation contract.

## Deployment limitations, not newly discovered bugs

- No crash-durable Execution RuntimeStore/scheduler ships today. Reconstructing against a new
  in-memory store is not process recovery. Durable action IDs and reconciliation belong in the
  application.
- UseCapability deadlines do not cover child results, peer replies, user-input or confirmation waits.
  Cancellation does not cascade. See [child cancellation tests](../../../../tests/conformance/composition/child-cancellation.test.ts)
  and [child deadlines](../../../../tests/conformance/composition/child-call-deadline.test.ts).
- Stock Stages cannot hand off notes or return child scratch. Cross-Execution Structured Memory and
  Artifact/File storage are unavailable. Application storage is the supported integration route.
- Trusted-local execution supplies semantic mediation, not physical containment or general
  information-flow control. Current MCP covers synchronous Tools, not full service interoperability.

## Readiness assessment

The builder guide is suitable to freeze **as a versioned guide to this implemented surface**, with
runnable evidence and explicit limits. This is not a production-readiness verdict for the kernel.
Revalidate guidance when public exports/controllers change, and resolve the findings before promising
unqualified durable application execution. SDK bootstrap is now supported above core; computed-return
composition remains a high-value design question. The [SDK implementation review](009-sdk-bootstrap-design-and-findings.md)
records the chosen boundary, additional bounded fixes and remaining concerns.

## Validation and discovery review

The completed guidance was traced from `AGENTS.md` and the builder skill against four ordinary
application questions: a stateful conversation with corrections/approval, a known process with an
Agent child, fixed model extraction/classification, and parallel lookup/wait diagnosis. An independent
read-only forward check found an unsupported child integrity option and missing authored LLM feature
requirements. Both were corrected; the new compiled classifier exercises both declared branches.

Validation on this change:

- `npm test`: 940 package/conformance tests passed, including 22 mechanical-confirmation tests.
- `npm run test:example:execution-kernel`: 18 application/example tests passed.
- `npm run test:evals`: 12 evaluation tests passed.
- `npm run typecheck`: passed, including definitions, host wiring and provider/executor factories.
- Both offline example commands passed and checked actual publication/terminal results; the
  application pattern made one publisher call for two identical `per_input` proposals.
- `npm run check:builder-docs` passed for 18 guide files, 193 local links/anchors and 26 public
  imports; a repository-wide scan passed for 48 Markdown files and 488 local links/anchors.
- Workspace dependency validation and package dry-runs for all five publishable workspaces passed.
- Active-tree legacy/path scans and `git diff --check` passed.

No live-provider quality claim follows from these runs: Gemini HTTP was faked for provider-wiring
checks. The repository's unrelated behavioral baseline was not used as a substitute for application
tests. Deployment/production certification remains outside this task.
