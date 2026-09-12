# Repository structure and evidence sequencing assessment

Owner scope update, 2026-09-11: the repository is now
[ArrokothI/arrokothi](https://github.com/ArrokothI/arrokothi); inspect benchmark read-only and assess
an optional structural step near K0.2 → K1.1. This is planning, not migration implementation or release.
It supplements the [K0.1 retrospective](011-k0.1-process-retrospective.md).

## Inspected identities and current structure

ArrokothI main remains `42731300266eea00a9a24d867d5e82d9887c280d`, independently advertised by the
new URL as well as the prior URLs. Benchmark's local clean main and advertised main both equal
`98756f8c10bd806125da8318f1a129bc030aca61`. Its roadmap/current-state files were read at that revision;
no benchmark file, Git ref, configuration, frozen snapshot or evidence was changed. The first local
process payload was `8407a7eaa6e182e2edf9690460ee9e72543ec818`; its interim report is preserved in
`88236083e52c1a006077653482cae3f71eb213df`. This expanded assessment gets a
new payload and clean validation rather than borrowing the first payload's results.

| Observed source at ArrokothI main | Implication |
|---|---|
| `packages/core/package.json` exports root, execution, ports, reference and testing from one source package | Package name `core` does not delineate the target Kernel |
| `packages/core/src/execution-api.ts` exports Agent/Workflow definitions, model-facing observations and current execution APIs | A new Kernel consumer using this barrel inherits legacy Runtime vocabulary |
| `packages/core/src/runtime/controller-registry.ts` selects by closed `DefinitionKind`; current Harness awaits controllers | Renaming folders cannot produce the generic asynchronous Runtime boundary |
| `packages/sdk/src/application.ts` constructs Harness, stock controllers, model resolvers, memory views and reference stores | SDK composition is the place that wires owners together; moving this wiring into a new Kernel would preserve the coupling |
| `tests/conformance/architecture/kernel-boundaries.test.ts` includes agent, controllers, model and workflow in KERNEL_OWNED, and stock controllers in entry modules | Its useful vendor-dependency guard is a legacy graph assertion, not a target Kernel/Runtime separation test |
| `packages/agents/strands/src/agent-executor.ts` implements the current model-shaped AgentExecutor step adapter | Preserve its working scope; do not call a path move a whole-native-Runtime Driver or R1/E3 success |
| `tsconfig.json` includes all packages, examples, scripts and tests; package exports point to source TS | Logical import boundaries need explicit checks; build/publish partitioning remains S1 work |

These observations match K0.1's repeated mechanism-versus-target errors, especially waits, progress
wrappers and cancellation. Physical proximity is not proven to have caused every defect, but the
current barrels and boundary tests actively reinforce the previous ownership model. A small enforced
landing zone for new work is justified before that coupling grows.

## Recommendation: K0.2 → K1.0 → K1.1

Add **K1.0 — Target boundary and legacy quarantine**, PLANNED and unreleased, under existing K1.
Keep K0.2 first: public controls and E0 ownership should constrain what must be observed before code
is reorganized. K1.0 does not move the external prerequisite: it is K1 implementation, so the
benchmark roadmap's E1 fixture preparation must already exist before K1.0 begins, not merely before
K1.1. That preparation depends only on the accepted K0 contract and never on a K1 subject, so adding
K1.0 creates no circular gate and needs no benchmark roadmap amendment.
K1.0 adds an independently reviewable structural prerequisite to K1.1. K1.4 remains
the aggregate K1/E1 gate and must include K1.0's structural obligations. No K/R/E numbering changes,
new evidence gate or new architectural milestone is needed.

The alternative name M0.1 would suggest a parallel migration program whose completion is easy to
mistake for behavioral migration. Folding all restructuring into K1.1 would mix import/compatibility
regressions with the first asynchronous acceptance implementation. A wholesale extraction before
K0.2 would freeze interfaces without the public controls, and extracting every native Runtime now
would pull K1.4/R2/R1 work forward. K1.0 deliberately pays for one bounded structural review; it does
not create a general M series or an extra acceptance ceremony for every directory move.

## Bounded future migration approach

Use an incremental replacement approach, with a clear quarantine for the existing implementation.
The following are planning destinations, **not directories or package releases created by this task**.
K1.0 must record the chosen concrete paths and export policy before changes; equivalent fewer-package
layouts are allowed if the dependency boundary is enforced. Do not add mandatory packages for every role.

| Responsibility | Recommended placement/direction | What this does not authorize |
|---|---|---|
| Target Kernel plus minimal portable Activation/Outcome-facing contract | A new narrow root, provisionally `packages/kernel`, importing only explicitly approved portable leaves and Kernel-owned code | Importing the existing core/ports barrel, stock cognition or ControllerResumption; copying the entire Harness and relabeling it |
| Driver contract and concrete Drivers | The portable contract belongs at the Kernel-facing boundary; concrete adapters depend inward on it and outward on their Runtime, provisionally `packages/drivers/*` when real work exists | A compulsory separately deployed Driver, registry, universal provider interface or production native probe in K1.0 |
| ArrokothI-native Agent/Workflow behavior and provider integrations | Runtime-owned modules composed by SDK/host; extract working code when K1.4/R2 or a real Driver task needs it | Rewriting cognition/graphs or moving all existing code merely to complete a directory diagram |
| Current 0.8.x core/Harness/controllers | Keep `packages/core` as the explicitly legacy implementation initially, with its supported exports and regression suite intact | Mass breakage of SDK/examples/consumers or treating legacy test passes as new protocol acceptance |
| SDK/application host | Compose Kernel and Drivers/Runtimes from above, with explicit compatibility entry points during transition | Kernel importing SDK or quietly rebinding existing public APIs to partial target behavior |
| Shared leaves/testing | Extract or reuse only individually audited portable primitives; separate fake Runtime/oracle support from Kernel production code | A catch-all shared barrel that indirectly reconnects Kernel to legacy or native Runtime internals |

K1.0's entry record must name the E1 fixture identities its prerequisite was satisfied by, without
claiming any E1 result from them.
K1.0's future acceptance must include a source/export ownership inventory, allowed dependency graph,
controlled move/import diff, preserved current consumer behavior and executable import-boundary
checks. Test transitive, type-only, barrel and dynamic-import paths as applicable to the module system;
include deliberately forbidden-import controls. An empty target directory with a vacuously passing
graph check is insufficient: exercise the guard against representative forbidden edges and inventory
all current cross-boundary dependencies. Describe what remains quarantined rather than claiming it
has been extracted. Retain existing vendor-neutrality checks with truthful legacy attribution.

Do not implement new protocol handlers, freeze extra semantics, introduce no-op target APIs or claim
K1 acceptance in K1.0. K1.1 introduces the minimum real types/dispatch under its accepted contract;
K1.2/K1.3 add their acceptance and race behavior; K1.4 supplies the useful legacy Runtime bridge and
combined E1 evidence. Until then, preserving current public paths means keeping their old behavior
explicitly labeled, not secretly routing through incomplete replacements. Native extraction beyond
that bridge belongs to R2 when demanded; actual foreign Driver fidelity remains R1.

Review import changes and behavioral changes as separate groups. A discovered legacy bug is evidence
to report and scope deliberately, not permission to convert a structural packet into protocol repair.
Do not silently drop regressions when paths move. Pin before/after exported entry behavior and map
retired assertions to the packet that intentionally replaces their old semantics.

## Benchmark interlock and planning concerns

The pinned [benchmark roadmap](https://github.com/ArrokothI/benchmark/blob/98756f8c10bd806125da8318f1a129bc030aca61/docs/roadmap.md)
and [current state](https://github.com/ArrokothI/benchmark/blob/98756f8c10bd806125da8318f1a129bc030aca61/docs/current-state.md)
confirm that E0–E6 are planned. Existing normalized canaries do not close new Kernel gates.
The K/R/E sequence remains sound; clarify preparation versus acceptance and the new structural step:

| Interlock | Planning decision / follow-up |
|---|---|
| K0.2 ↔ E0, then K1/E1 | K0.2 remains the public control/ownership gate, not a working target Kernel. The benchmark roadmap builds E1 fixtures after the K0 contract and before K1 implementation; K1.0 is K1 implementation, so that fixture preparation precedes K1.0 as well as K1.1. Built fixtures and a K1.0 structural pass are preparation and separation, never an E1 result. Required fixture/source access still gates the dependent behavior work. |
| Kernel-local oracle ↔ benchmark observer | ArrokothI owns deterministic conformance; benchmark pins it and observes independently. Independent sink/oracle checks must reject unsafe or state-losing behavior without merely trusting candidate inspection/report APIs. No duplicate full Kernel oracle or private-case transfer. |
| K1 ↔ R1/E3 ↔ K3 | Keep trusted native probes after the K1 boundary and before persistence freezes; mediation still waits for K2. Directory separation does not replace the two native designs that challenge shared extensions. |
| K2 → K3/E4, K4/K5 extensions | Preserve actual process-death/surviving-evidence gates and distinct composition/operating matrices. Structural guards earn no durability or isolation credit. |
| E5 value and E6 publication ↔ R2/S1 | E0 public specs/direct baselines may precede implementation; full comparative value and final SDK freeze still require their existing inputs. A repo/package move needs a newly identified candidate and reviewed builder-visible graph, never reuse of old freeze hashes. |

Recommended **benchmark-owner follow-up**, not a change performed here:

1. Update active ArrokothI naming and roadmap navigation to the renamed repository; preserve frozen
   `configs/frameworks/arrokothi-v0.37-r2.yaml` and `arrokothi-v0.8.1-r1.yaml` acquisition identities,
   historical canary documents and evidence. Local `../../agent-kernel` paths describe an actual
   checkout name; a GitHub rename alone does not rename that directory.
2. On adoption of K1.0, annotate the interlock so structural acceptance is not mistaken for E1
   behavioral acceptance. E1's existing "before K1 implementation" build timing already covers K1.0
   and needs no change; this assessment requests no amendment of that prerequisite. Pin the actual
   public conformance entry after it exists; update moved paths/version mappings without changing
   required observations or giving a structure-only pass.
3. In K0.2/E0 handoff, state which repository owns each public fixture, independent sink, capture
   adapter and gate decision. Resolve access before release; do not create a dependency cycle by
   requiring a successful K1 subject before its independent controls can be specified.
4. For the next framework acquisition/final E6 candidate, use the canonical new repository locator,
   a new immutable source identity and a fresh builder-visible contamination/link audit. Current
   development/review/strategy material remains evidence-informed; old include-all rules cannot
   automatically follow the expanded document map into builder inputs.

## Rename policy and scope

Use **ArrokothI** for the project and `ArrokothI/arrokothi` for current hosted navigation. Keep
`@arrokothi/core`, `@arrokothi/sdk`, package versions, old commit URLs and frozen evidence identifiers
unless an actual separately scoped package/publication change requires otherwise. This task updates
root navigation and the SDK's repository URL only; it does not rename packages or the local checkout,
change configured remotes, or rewrite historical K0.1 records. Git history/ancestry, not URL spelling,
binds acceptance. The existing old origin is usable and intentionally retained.

AGENTS.md and repository skills already defer scope/status to development and meaning to the canonical
owners. They need no new permanent path rule while K1.0's layout is a planned proposal. The eventual
structural packet must update materially stale instructions/skills and public guides with its actual
paths, rather than making today's instructions assume uncreated packages. No benchmark modification,
K0.2 work, K1.0 implementation or successor release occurred in this assessment.
