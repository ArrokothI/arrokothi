# AGENTS.md — ArrokothI repository instructions

ArrokothI is a **provider-neutral execution kernel** for long-lived Agents and Workflows with
bounded authority, explicit memory, durable waiting, composable communication, and
protocol-neutral service interoperability. Workspace packages use the `@agent-sdk/*` scope in
code (some prose still calls it `@arrokoth/*`).

## Authoritative documentation

`docs/README.md` is the canonical map. It assigns **non-overlapping concept ownership** to each
document and defines precedence.

- Conceptual overview and strongest invariants: `docs/mental-model.md`
- Concept owners: `docs/execution-runtime.md`, `docs/composition.md`, `docs/authority.md`,
  `docs/memory.md`, `docs/interoperability.md`, `docs/security-guarantees.md`
- Unresolved/future questions only: `docs/future-plan.md`
- `docs/development/` holds implementation plans, slice decisions, audits, and reviews. These are
  engineering working documents, **not** architecture truth. Start from `docs/development/README.md`
  for the current slice sequence.
- `docs/architecture-research-dossier.md` is retained research evidence, never canonical.

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
adapter or boundary package that implements the current Arrokoth-owned contract. External
protocols and frameworks may be compatibility targets and design references, but they do not own
kernel semantics. Do not promote a provider's or protocol's native concept into core semantics
without an explicit architectural decision recorded in `docs/`.

Intended dependency direction: applications/presets → implementation/adapter packages →
core-owned contracts. Discover the current restrictions of each boundary from its canonical owner,
current contracts, and conformance tests before modifying it.

## Before an architectural or semantic change

1. Find the canonical concept owner in `docs/README.md`.
2. Read that document first, then relevant `docs/development/` history.
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
`.env` only for live-provider examples, benchmark execution, or canaries.

```bash
npm install
npm test                 # semantic conformance suite (packages/*/tests + tests/conformance)
npm run typecheck        # tsc --noEmit over packages, apps, examples, scripts, tests
npm run test:conformance # just tests/conformance/*/*.test.ts
npm run test:evals       # behavioural baseline for the reference Agent (separate question)
```

`npm test` asks whether the runtime preserved semantic boundaries. `npm run test:evals` grades what
an Agent configuration accomplished. They answer different questions and stay separate. Per-package
runners (`test:core`, `test:strands`, `test:storage-sqlite`, …) and examples/canaries are in
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
