# AGENTS.md — ArrokothI repository instructions

ArrokothI is a **provider-neutral execution kernel** for long-lived Agents and Workflows with
bounded authority, explicit memory, durable waiting, composable communication, and
protocol-neutral service interoperability. Workspace packages use the `@arrokothi/*` scope.

## Building an application: start here

For ordinary product requirements, use the `arrokothi-agent-builder` skill and read
[`docs/guides/agent-workflow-composition/README.md`](docs/guides/agent-workflow-composition/README.md).
That is the single builder front door: quick start → current API/surface → only the topics the
application needs → runnable patterns and diagnosis. You do not need the roadmap or external
engineering dossier before starting an application.

New applications start with `createApplication`, `defineAgent`, and `defineWorkflow` from
`@arrokothi/sdk`. Supply explicit policy, model services and domain handlers; the SDK assembles one
Harness and both stock controllers. Use `preflight` / `start` and `runUntilBlocked` before diagnosing
missing wiring as model failure. `@arrokothi/core`, `/ports`, and `/reference` remain the advanced
semantic/port surfaces. Start from
[`examples/execution-kernel-minimal/`](examples/execution-kernel-minimal/README.md). Run `npm run example:application-patterns`
and `npm run test:example:execution-kernel` for state, confirmation, and child examples.

Keep kernel semantics unchanged during application work. Use supported composition, host logic,
and application-supplied ports when they fit. SDK bootstrap lives in `packages/sdk`, above core;
it never grants permissions from definitions or catalogs. Record larger/ambiguous framework concerns in
[`docs/development/007-application-builder-ergonomics-findings.md`](docs/development/007-application-builder-ergonomics-findings.md)
and continue supported work; a missing stock convenience is not by itself a reason to stop or to
invent a kernel contract.

## Authoritative documentation

`docs/README.md` is the canonical map. It assigns **non-overlapping concept ownership** to each
document and defines precedence.

- Conceptual overview and strongest invariants: `docs/mental-model.md`
- Concept owners: `docs/execution-runtime.md`, `docs/composition.md`, `docs/authority.md`,
  `docs/memory.md`, `docs/interoperability.md`, `docs/security-guarantees.md`
- Unresolved/future questions only: `docs/future-plan.md`
- `docs/development/` holds the current implementation synthesis, active roadmap, and specialized
  engineering guidance. These are **not** architecture truth. Start from
  `docs/development/README.md`.
- `docs/guides/` holds application/developer guidance for building **on** the kernel. It is not
  architecture truth. `docs/guides/agent-workflow-composition/` is the decision procedure for
  turning application requirements into an Agent/Workflow composition; start at its `README.md`,
  which routes to the topic page for the decision at hand.
- `docs/agent-engineering/` is framework-neutral external engineering guidance synthesized from
  public Anthropic material. It is a design reference, never ArrokothI semantics.

When documents disagree, resolve by concept ownership in `docs/README.md`, not by recency or
length. If normative docs, implementation, and tests genuinely conflict, report the ambiguity
instead of silently picking one as a new permanent rule. When an authorized architecture change
leaves a question unresolved, record it in the relevant `docs/development/` note or
`docs/future-plan.md`.

This file provides repository orientation and durable workflow; shared `SKILL.md` files provide
reusable procedures. Neither is an independent source of architectural truth. An explicit current
task may authorize evaluating or changing the contract owned by a canonical document.

## Architectural boundaries to protect

The full current invariant list is in `docs/mental-model.md` and "Stable distinctions to protect"
in `docs/README.md`. For ordinary implementation, do not weaken, silently reinterpret, or route
around these constraints as a side effect. The most load-bearing are:

- Definition ≠ Execution; Workflow ≠ Agent; Stage ≠ Execution. Composition alone (a function call,
  LLM call, Adapter, or Stage) does not create an Execution boundary — independent runtime identity does.
- Event ≠ Effect. Controllers *propose* Effects; the Harness authorizes and coordinates; executors
  and the environment establish reality.
- authority ≠ exposure. Discovery, model projection, and protocol exposure never grant permission.
- Execution identity ≠ application principal identity.
- memory ≠ context; inferred memory ≠ explicitly asserted structured state; ownership ≠ communication.
- Kernel semantics remain distinct from provider and protocol mappings.

When a task explicitly asks to evaluate or change one of these distinctions, treat the current
canonical contract as the starting state rather than an immutable veto. Understand it first,
evaluate the consequences explicitly, and synchronize every accepted change as described below.

## Provider neutrality

Kernel semantics must stay neutral across model providers, retrieval frameworks, storage engines,
policy backends, tool transports, and wire protocols. Provider-specific behavior belongs in the
adapter or boundary package that implements the current ArrokothI-owned contract. External
protocols and frameworks may be compatibility targets and design references, but they do not own
kernel semantics. Do not promote a provider's or protocol's native concept into core semantics
without an explicit architectural decision recorded in `docs/`.

Intended dependency direction: applications/presets → implementation/adapter packages →
core-owned contracts. Discover the current restrictions of each boundary from its canonical owner,
current contracts, and conformance tests before modifying it.

## Before an architectural or semantic change

1. Find the canonical concept owner in `docs/README.md`.
2. Read that document first, then `docs/development/002-implemented-kernel-baseline.md` and
   `docs/development/001-current-status-and-roadmap.md`; load specialized active evidence only
   when the task requires it.
3. Inspect the affected implementation under `packages/` and its conformance tests under
   `tests/conformance/` (and `packages/*/tests/`).
4. State the existing invariant before editing it.
5. Separate genuine semantic/API changes from implementation-only, naming, or backend changes.
6. For an explicitly authorized semantic change, evaluate cross-provider, interoperability,
   security, migration, and compatibility consequences.
7. When semantics genuinely change, update the owning normative doc and relevant code/conformance
   tests in the same change — keep code, docs, and tests synchronized.
8. Update affected agent configuration only if the accepted change made it materially inaccurate;
   put unresolved questions in `docs/future-plan.md`, not accidentally into a canonical API.

## Commands

Node 22.9+. Default test suites and deterministic examples are offline. Copy `.env.example` to
`.env` only for live-provider examples or canaries.

```bash
npm install
npm test                 # semantic conformance suite (packages/*/tests + tests/conformance)
npm run typecheck        # tsc --noEmit over packages, examples, scripts, tests
npm run test:conformance # just tests/conformance/*/*.test.ts
npm run test:sdk         # SDK composition, preflight and host runner
npm run check:builder-docs # builder discovery, links, public imports and package integration
npm run test:evals       # behavioural baseline for the reference Agent (separate question)
```

`npm test` asks whether the runtime preserved semantic boundaries. `npm run test:evals` grades what
an Agent configuration accomplished. They answer different questions and stay separate. Per-package
runners (`test:core`, `test:strands`, …) and examples/canaries are in
`package.json`.

## Agent-configuration maintenance policy

- `AGENTS.md`, `CLAUDE.md`, and the skills under `.agents/skills/` are maintained repository
  artifacts.
- Do not modify them merely because a task used them.
- If a change makes an existing instruction or skill materially false, obsolete, or incomplete,
  update the affected configuration in the same change.
- New permanent architectural rules must not be invented from implementation observations; they
  must be grounded in normative repository documentation and tests.

## Project skills

Portable Agent Skills for both Claude Code and Codex live in `.agents/skills/` (canonical) and are
mirrored into `.claude/skills/` via symlink. These are **coding-agent workflow skills** and are
unrelated to the ArrokothI `Skill` composition concept in `docs/composition.md`. Either agent
should select them automatically when a task matches the trigger description in the canonical
`SKILL.md`; using a skill does not by itself justify editing it.

Building an application **on** ArrokothI — turning product requirements into an Agent/Workflow
composition, or redesigning one — uses `arrokothi-agent-builder` and
`docs/guides/agent-workflow-composition/`, not the kernel-architecture skill. Application work
does not change kernel semantics; if it appears to require a new contract, escalate through
`arrokothi-architecture` instead of adding one.
