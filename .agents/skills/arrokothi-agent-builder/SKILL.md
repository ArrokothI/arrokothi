---
name: arrokothi-agent-builder
description: >-
  Build or improve applications on ArrokothI from product requirements, including API selection,
  Agent/Workflow composition, state, capabilities, policy, multi-turn interactions, provider wiring,
  and application testing or diagnosis. Also use when maintaining the application builder guidance.
  Not for redesigning kernel semantics or implementing a new provider/protocol adapter.
---

# Build on ArrokothI

Read [the builder front door](../../../docs/guides/agent-workflow-composition/README.md) first.
It is the single application guide: runnable start, current API map, topic routing, patterns and
diagnosis. Resolve these paths from the repository root as `docs/guides/agent-workflow-composition/`;
the Markdown links here are relative to this skill directory.

Use the quick start and current authoring surface before committing to a composition. Then read only
the topic needed. The roadmap and external engineering notes are not prerequisite manuals.

## Decisions that prevent expensive wrong turns

- Use `@arrokothi/core`, `/ports`, and `/reference` for runtime code;
  `@arrokothi/core/execution` is an equivalent focused entry point and `/testing` is test
  scaffolding. Start from
  [the current example](../../../examples/execution-kernel-minimal/README.md).
- Choose code for exact work, Workflow for declared progression, and Agent for open-ended decisions
  or a stock multi-turn conversation. Check the surface matrix: a stock Agent cannot call children,
  send messages, or emit typed user-input requests. A Workflow consumes external input only once.
- Keep hard requirements in validators, current-state gates, policy and external conditional writes.
  Memory schemas validate shape; model text does not establish reality or approval.
- Bind and authorize memory explicitly. Authored read/write keys need separate view resolvers and
  grants; writes still need final authorization. Stage code has no committed-memory reader, and
  there is no public host memory setter. The guide shows supported paths.
- Account for cumulative Agent budgets, response versus completion, child spawn credits, and the
  text-only/literal restrictions on Stage/terminal data flow. Do not infer APIs from canonical sketches.
- Use actual receipts/world state to test success. Runtime `per_input` suppression covers direct and
  confirmed capability dispatch; external idempotency and crash recovery remain application concerns.

## Deliver working applications

Translate requirements into observable behavior and enforcing mechanisms, implement a supported
composition through public APIs, and validate the application itself. Follow the guide's diagnostic
path before increasing prompt or composition complexity. Run relevant application tests and
`npm run typecheck`; run `npm test` for framework changes. Repository Agent evals do not automatically
evaluate a new application.

If a stock surface is insufficient, consider supported composition, host orchestration or an
application-supplied port and continue the expressible work. Record larger or ambiguous issues in
[builder findings](../../../docs/development/007-application-builder-ergonomics-findings.md).
Do not invent kernel contracts or bypass Harness Effects to force the design through. A separately
authorized kernel-semantic change uses `arrokothi-architecture`; implementing a new external adapter
uses `arrokothi-provider-integration`. Merely using an existing adapter does not need that workflow.
