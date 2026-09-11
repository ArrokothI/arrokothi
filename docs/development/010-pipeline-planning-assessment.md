# Pipeline planning assessment

Planning inspection: 2026-09-10 (America/New_York), starting clean `main` at
`f3c0a1b2a3a1cb82b295580939d0284f8d329163`. This is a planning proposal delivered for owner adoption,
not an independent ACCEPT of its author, K0 implementation, or a target release verdict.
The resulting workflow is in [006](006-development-process.md), bounded work and status in
[007](007-work-packets.md), report in [008](008-implementation-report.md), prompts in
[009](009-universal-prompts.md).

## Current truth and evidence

The governing rule remains consistent across the current owners: Kernel owns execution; Execution
Runtime owns how work is done; deployment owns physical enforcement. No canonical architecture was
changed to simplify implementation. The newest future-plan Q3 lifecycle/reference and Q9 supervisor
hypotheses do not supersede required children, explicit output-to-input routing or current refusal
options. Detailed design is target/optional guidance, not shipped APIs.

| Observation | Current source evidence | Planning implication |
|---|---|---|
| Runtime migration has not landed | `git diff e96e513 f3c0a1b -- packages tests` changes only SDK README; recent history is architecture/roadmap/future-plan work | 002 remains a valid implementation map; preserve its historical capture and add this recheck |
| Controller invocation still awaited | `packages/core/src/runtime/harness.ts`: `runController` awaits `controller.activate`; controller port accepts resumption scope | Test a genuinely asynchronous new boundary, not renaming a synchronous controller |
| Input is consumed before accepted Outcome | Harness `activate` consumes mailbox in its RUNNING transaction | Existing mailbox/serialization tests cannot close target accepted-batch gate |
| Effects precede later progress transaction | Harness `applyOutcome` calls Effect processing before the transaction applying next/progress; catch comment overstates rollback | K2 must prove all-intent acceptance and independent sink attempts; per-operation rollback tests are insufficient |
| Legacy control types remain closed | `ports/controller.ts`, `execution/context.ts`, resumption processor and Agent/Workflow controllers | Keep compatibility internals private; don't infer target from legacy kinds/waits |
| Store remains in-memory | `reference/in-memory-runtime-store.ts` serializes transactions and copies aggregate state; scheduler/RuntimeStore ports | Actual kill/restart with surviving storage belongs to K3, not existing serialization |
| SDK is useful but source-distributed | `packages/sdk/package.json` exports `./src/index.ts`; README and tests cover bootstrap, preflight, host driving, authority and confirmation | Preserve current public regressions; packed clean install and supported surface are separate S1 work |
| Tests already cover valuable distinctions | Scheduler exclusion/serialization, mechanical confirmation, SDK application and example tests; full suite rerun below | Preserve intent while replacing tests that canonize retired Kernel resumptions |
| Evidence numbering differs historically | Strategy study's proposed E0–E7 questions versus active benchmark roadmap E0–E6 | Only current benchmark roadmap supplies external gate IDs; never silently reuse historical numbering |
| Git URL differs from task's repository URL | Configured origin is `https://github.com/ArrokothI/Agent_SDK.git`; package metadata names `agent-kernel` | Verify remote access and actual branch SHA; do not silently rewrite the remote or claim hosted visibility |

Inspection covered repository instructions/skills, current canonical owners, future plan, twelve-page
detail-design map and relevant contract text, development 001–005, strategy-study recommendations,
findings/evidence/experiment and reuse sections, package structure, selected implementation and
conformance/SDK/example paths, and recent Git history. This is a current planning/source review,
not a line-by-line audit of every package or a new upstream/native fidelity study. Strategy raw
artifacts remain historical. Benchmark roadmap interlocks were read; no benchmark implementation,
private evaluation corpus or frozen run was modified. No third-party source/dependency/service was
incorporated; license compatibility of future selections remains an implementation obligation.

## Pipeline assessment

The proposed implement → commit/push → independent review → repair loop is sound as a transport
skeleton. Separate sessions reduce shared assumptions, the repository preserves continuity, and the
owner can connect each accepted behavior to its architectural meaning. It fails if reports become
self-certificates, work units remain too large, reviewers cannot inspect the pinned tree, review
commits drift, or test success substitutes for evidence. Two agents can repeat the same mistake;
independence requires independently checking source and observations, not merely a different model.

Use one active reviewable packet, explicit criteria, immutable candidate and evidence, separate
review/acceptance, then owner integration/discussion/release. Keep ordinary engineering choices
within the contract autonomous. Reserve owner decisions for semantics, scope amendments, claims,
experimental margins/budgets and adoption/stop choices. This is a disciplined collaboration loop;
it is deliberately not an autonomous software factory.

A normal ChatGPT chat cannot be assumed to clone private repositories, execute tests or edit files.
The owner must provide the complete pinned review package when access is absent. An unavailable
source/evidence gate yields CHANGES REQUIRED with an external blocker, not a speculative ACCEPT.
An accessible source plus adequate immutable logs can support review without rerunning every command;
the reviewer states what it independently observed versus executed.

## Roadmap assessment by milestone

The existing sequence protects the right investment order: fake asynchronous boundary, governed
intents, native probe before durable freeze, real process faults, composition, operability/value,
then release. Preserve those semantics and negative investment branches. The principal weakness is
review granularity and state/actor precision, not the architectural order.

| Milestone | Can remain | Problem for one autonomous session | New review boundaries |
|---|---|---|---|
| K0 | Settle protocol, legacy disposition and public E0 control ownership first | Contract choices and independent fixtures mixed; unclear who resolves semantic ambiguity | K0.1 contract decision worksheet; K0.2 public controls/E0 closure |
| K1 | In-memory asynchronous exchange and E1 races | Creation, dispatch, acceptance, wait/cancel and legacy SDK porting are several contracts | Four packets: ingress/dispatch, acceptance, waits/cancel, bridge/full E1 |
| K2 | Atomic intents, concrete schema, current policy, honest uncertainty, human request admission | Largest action correctness cluster; first-match policy and partial Effect behavior need explicit counterexamples | Four packets: intents, schema/admission, settlement/obligations, request/full E2 |
| R1 | Preserve native jobs and probe before K3 | Initial structural evidence mixed with later live/upgrade support obligations | Two early probes; separate R1.3 supported-profile live/upgrade evidence |
| K3 | Compare transactional versus mature substrate under real process death | Harness, two prototypes, native/resource failure windows and adoption decision are not one session | Four packets: fault contract, persistent path, native recovery windows, comparator/full E4 decision |
| K4 | Required children, addressed interaction, human closure and output observation | These are independently reviewable state machines with interacting crash windows | Five packets: children, messages, human response, output, combined E4 gate |
| R2 | Optional reference Runtime improvements with fixed Kernel | Migration, typed values and durable child application proof have different prerequisites | Three packets; final public child/join after K4, never prerequisite for K3 |
| K5 | Bounded operation and two-application value evidence | Operational correctness is deterministic; product value is comparative and owner-decided | Four packets: bounds, operations, comparison preparation, executed E5 decision |
| D1 | Conditional on an actual isolation claim | Mock interface success is easily mistaken for physical enforcement | Adapter/profile packet then actual physical gate; owner may defer with no isolation claim |
| S1 | Prototype packing after K2; final E6 after chosen surface stabilizes | Early clean packaging and final support/construction freeze are different identities | Prototype, final release candidate, final E6/release gate |

There are 34 initial packets. These are bounded contracts, not promises that all will fit a context
window. In particular, experiments may require several sessions. Owner-approved further splitting
must preserve criterion IDs and aggregate gates. Later source touchpoints are provisional navigation;
freeze exact commands/limits in each packet contract before changing the implementation. The mapping
in 007 preserves all parent obligations, and final gate review reads the complete parent section.

Implementation existing, tests passing, exit criterion satisfied, evidence collected and independent
acceptance now have different records. Passing one packet does not satisfy the parent release claim.
Preparing E4 fixtures does not prove recovery; preparing E5 applications does not demonstrate value;
passing historical v3 construction does not establish usability of a newly frozen SDK.

## Git choice and semantic meaning of main

Direct implementation on main makes “published experimental work” indistinguishable from accepted
increments and exposes users to unreviewed changes. One branch for an entire K3/K4 would instead
hold too much work hostage to a broad gate. Recommend a branch per bounded packet, optional PR for
convenient discussion/diff, independent acceptance, then fast-forward or content-equivalent owner
merge. Main is accepted experimental increments, not an automatic production-support promise.

The review checks cumulative diff, correction delta and administrative status edits. Acceptance names
an exact candidate; changing code/tests/contracts/evidence requires another review. The process uses
payload C, report candidate H, and separate review administrative A to avoid self-referential commit
IDs. Local commit/binary patch/verified bundle is a complete offline handoff option; no push claim is
made until the remote branch SHA is observed. The owner may integrate without a PR when that is
simpler. The agent never pushes main or self-merges under these reusable prompts.

## Architecture decisions and ordinary planning choices

No unresolved architecture decision blocks starting K0.1 under the current minimum profile.
Canonical documents already settle asynchronous ownership, required completion obligations,
receipt/conflict semantics, policy ordering and safe-recovery refusal. A codec, store layout or
supported validator choice within those constraints is an engineering decision, not a reason to
stop and ask the owner by default.

The genuine optional question is future-plan Q3: whether repeated applications justify Kernel-owned
atomic responsibility-transfer/abandonment and application/provider-reference lifecycle primitives.
The current minimum can refuse arbitrary detachment and rely on an explicit provider pin/access
contract; it cannot omit existing lifetime guarantees. Do not answer Q3 by quietly adding a universal
owner/artifact framework. If a concrete packet cannot satisfy the existing guarantees without a new
portable primitive, present that counterexample and the smallest owner decision, then update the
canonical Kernel/Execution/deployment owner and relevant recovery/composition/resource detail plus
migration criteria. Q9 supervisory automation remains a future Runtime/application experiment and
is not implied by this human-led development pipeline.

Substrate choice after E4, native support scope after R1, retention windows, quality/cost margins,
paid-run budgets, isolation demand and E5 continue/narrow/stop are future engineering/product/evidence
choices explicitly assigned to owner checkpoints. They are not present semantic contradictions or
license clearance. No new general Kernel API is required by this planning change.

## Validation and delivery

Fresh validation of the starting payload in the installed local workspace:

- `npm test`: PASS, 965 tests / 211 suites, zero failures, cancellations or skips.
- `npm run typecheck`: PASS.

Planning-artifact validation:

- `npm run check:builder-docs`: PASS, 26 Markdown files, 275 local links/anchors,
  38 public package imports. This checks its guide inventory, not all new planning files.
- A temporary targeted Python scan: PASS, nine changed/new planning/front-door files,
  90 local links/anchors, 34 unique PLANNED packets, matching status rows and acyclic dependencies.
- `git diff --check`: PASS. Scope inspection confirms only AGENTS.md and development documentation
  changed; canonical architecture, runtime, tests, package dependencies and benchmark are unchanged.
- Configured origin's main was read successfully and matched the starting SHA; no remote URL change.

Raw command logs for this local session are `/tmp/arrokothi-planning-tests.log`,
`/tmp/arrokothi-planning-typecheck.log` and `/tmp/arrokothi-planning-builder.log`; these temporary
diagnostic files are not promised durable release evidence. The targeted scanner is
`/tmp/arrokothi-check-planning.py`. No target gate depends on these temporary artifacts.

Full tests were not repeated after prose-only changes. No live model/provider,
new E0–E6 gate, process-death campaign, physical isolation or clean packed-consumer test was run.
All work packets remain PLANNED. Planning commit/push identities belong in the delivery handoff,
not inside the commit that would contain its own SHA. Main remains unchanged by this branch delivery.
