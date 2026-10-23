# Brief 01 — COORD-REFACTOR-01 (DRAFT, not released)

Planner: the owner's Claude Code desktop session (`claude-opus-5-5`), 2026-10-22, at the owner's request
(Prompt D). It is written under [006 working principle 6](../../006-development-process.md#working-principles)
and [017](../../017-known-limitations.md): build right now what K1.3 builds on, and record the rest as limits.

## Goal

Refactor `packages/kernel/src/coordinator.ts` (2,471 lines) so that the only path to state change is a
single owner that applies an immutable plan. Several accepted finding families (authority, history, reads,
commits) then become structural guarantees, not inventory obligations
([coordinator map](../DESIGN-AUDIT-01/coordinator-map.md)). Behaviour must not change. K1.3 then adds its
waits and Effects as new plan variants rather than new mutation paths
([owner-decisions-02](../DESIGN-AUDIT-01/owner-decisions-02.md) extra check d; [007](../../007-work-packets.md#coord-refactor-01--coordinator-planapply-refactor)).

## Build right now (blocking quality)

K1.3 and every later Kernel packet will extend these shapes, so they are expensive to change.

| ID | Criterion | Closes by |
|---|---|---|
| CR1-1 | **Plan union.** Every state-changing public operation forms one frozen value of a closed, discriminated plan union before any state changes. The operations are creation, input, dispatch, redelivery, Outcome, takeover, recovery, protocol-failure report and the control commits. A plan holds data only: no functions or callbacks. It includes preallocated history, receipts and the returned answer. An authorized refusal that appends history is a plan too, never a no-op. | Structural: a type check plus a runtime freeze/shape assertion in each operation's tests. A plan that carries a function fails a must-fail type fixture. |
| CR1-2 | **One state owner.** One module holds the mutable Execution records and exports only `apply(plan)` and read-only views. Only that module can construct the next state, through a runtime brand (`#private` or a module-private constructor), not a type-only brand. Caller, Driver and host callbacks run before planning or after apply. A plan formed before a callback is revalidated against the resulting state. | Structural: a project-written module dependency check in which only the owner imports the state module. Every rule must match at least one file (no vacuous pass). It has a must-fail fixture with an injected bypass import. `@ts-expect-error` fixtures pin the expected diagnostic code ([research §7](../../research/2026-10-02-canonical-bytes-kernel.md#7-planapply-decomposition-and-structural-single-writer)). |
| CR1-3 | **Behaviour is identical.** These are unchanged: every complete-decision scenario, the fault and poison sweeps, K1.2's Outcome tests, the public Kernel exports, receipts, IDs, refusal classification and refusal precedence. | Deterministic: the CI composed verify. No oracle expectation, scenario or golden vector is edited. |
| CR1-4 | **Bypass mutants fail.** Registered mutants include: (a) a write to state outside `apply`; (b) an apply that drops one coupled field (history, receipt, hold or grant); (c) a callback invoked inside `apply`; (d) a view that aliases mutable state. Each one is killed. | Mutation registry, one case per mutant family, with determinism. |

## Keep as-is or record as limits (non-blocking)

- **No new semantics.** No waits, Effects, persistence, cancellation or concurrency model. `cancelExecution`
  stays unimplemented.
- **No performance work.** No new hardening, and no change to the bytes core, envelope or Driver contract.
- **Plan selection stays a semantic claim.** Restricting writes is structural, but choosing the right plan
  still rests on the oracle and the tests. The design note says which families become structural and which
  stay oracle obligations ([coordinator map](../DESIGN-AUDIT-01/coordinator-map.md), last column).
- **Evidence churn goes to TOOLS-02.** Moving code invalidates scanner census rows and adoption read
  digests. Regenerate them mechanically in a fresh clone, with no new credit. The tooling fixes are
  [BINDING-01 cleanup](../BINDING-01/cleanup-01.md)'s P3 items.

## Known counterexamples to keep passing

- The complete-decision oracle (`fault-oracle.test.ts`), the fault and poison sweeps (`sweep/`), and
  `control-commits`, `ambient-reads`, `recovery-ambient` and `whole-view-ambient`.
- The finding families in the coordinator map: F11 authority, F12/F09 history, F15 reads and commits, F03
  identity and nondisclosure, F13 delivery. Each keeps its maintained test.

## Suspect design

1. **Source-site inventories.** `zone-analysis.ts`, `zone-inventory.ts`, `ambient-reads.test.ts` and
   `control-commits.test.ts` check `coordinator.ts` by source location and layout. A refactor breaks them
   wholesale. Owner-decisions-02 extra check e says to retire the zone analyzer only after this refactor,
   with a coverage mapping. **Question:** for each one, port it, or retire it with a mapping from each
   obligation to a CR1-2 structural check or a maintained test? Bare deletion is forbidden.
2. **`ControlCommit` / `applyControlCommit`** are already partly a plan and apply. Do they become the
   general mechanism, or are they replaced?
3. **Driver and host callbacks** (`isSafeToReplace`, `deliver`, host members). Where does each one run
   relative to plan and apply? Which plans need revalidation after a callback?

## Questions before code

1. Use one plan union, or one per operation sharing an apply? Show how K1.3 would add a wait plan
   without a new mutation path.
2. What is the module layout, and how does the boundary check work? Recommended: extend the existing
   architecture conformance check (`tests/conformance/architecture/`), with no new dependency. A third-party
   tool needs a license check first (AGENTS.md).
3. Which runtime brand: `#private` fields or a module-private constructor?
4. What is each source-site inventory's fate (suspect design 1)?
5. Which test files change, and why? Name any that cannot stay unchanged.

## Process

- **Lifecycle:** design note, then a design check by a session other than the implementer, then the build.
- **Verification:** the composed verify runs in Packet verify CI from the first C. Before dispatching, run
  tool-tests, both mutation registries and the full verify in a fresh clone (`git clone --no-local`,
  `npm ci`, nothing untracked). BINDING-01 lost three CI rounds by skipping this.
- **Review gate:** as BINDING-01's (owner choice 03). Block only on a concrete production defect against
  CR1-1 to CR1-4, or on a false current claim in Layer 3, BASELINE or 007. Evidence-tooling gaps are P3 and
  go to TOOLS-02.
- **Stop and ask:** if any oracle expectation, receipt, ID or refusal order would change; if the public
  Kernel surface would change; if new semantics seem needed; or if a correctly targeted bypass mutant
  survives.

## Owner decisions needed to release

- Implementer, and design-check session.
- Whether retiring the source-site inventories (suspect design 1) is in scope here, or whether they are
  ported and retirement moves to TOOLS-02.
