# Brief 01 — K1.3

Planner: the owner's Claude Code desktop session (`claude-opus-5-5`), 2026-10-25, at the owner's request
("start the K1.3 brief now"), using Prompt D. The owner answered its decisions and released it on 2026-10-25
([release 01](release-01.md)), unchanged except for this header and the owner answers at the end. The brief is written under
[006 working principle 6](../../006-development-process.md#working-principles) and
[017](../../017-known-limitations.md): build right now what is expensive to change, and record the rest
as limits.

## Goal

Make `await` and cancellation real Kernel decisions. A Runtime can pause on a declared wait that ends on
an eligible Event or on its deadline, and a caller or the Execution deadline can cancel. Every race among
arrivals, timers, cancellation and Outcome acceptance must have one recorded winner, with no lost input
and no reopened terminal state. The work adds new plan variants on COORD-REFACTOR-01's plan/apply shape
(`packages/kernel/src/plan.ts`, `state.ts`) and replaces K1.2's whole refusal of `await` and
`cancelExecution`.

## Scope and governing owners

The scope and acceptance are in [007 K1.3](../../007-work-packets.md#k13--wait-and-cancellation-races).
The governing Layer-3 owners are those in [the roadmap's K1.3 entry](../../../../mental-model/roadmap.md#k13):
- [waits](../../../../mental-model/mechanisms/waits.md): grammar, eligibility, registration, ending,
  batch selection, accounting;
- [lifecycle](../../../../mental-model/mechanisms/lifecycle.md#cancellation-order): cancellation order;
- [core](../../../../mental-model/concepts/core.md#waiting-for-what-arrives): wait, readiness and
  timeout Event;
- [operations](../../../../mental-model/concepts/operations.md#three-clocks): the three clocks;
- [recovery](../../../../mental-model/mechanisms/recovery.md).

The source decisions are the worksheet's B, W, CL and CX families
([protocol worksheet](../../../../tests/fixtures/k0/protocol-worksheet.md)). [rewrite-index §4](../../../../mental-model/rewrite-index.md)
lists the representations the worksheet leaves for K1.3 to choose.

## Build right now (expensive to change later)

| ID | Criterion (governing source) | Closes by |
|---|---|---|
| K13-1 | **Wait grammar and well-formedness** ([waits § Declare](../../../../mental-model/mechanisms/waits.md#declare-what-can-wake-the-execution)). Finite dependency alternatives (identity, kind or kind set, correlation; AND within, ANY-OF across) plus declared input subscriptions; an optional deadline. Malformed waits are refused whole: both lists empty, an empty alternative, an empty kind set, or any unsupported selector field. | Deterministic: a table of valid and invalid declarations, one row per rule. |
| K13-2 | **Eligibility comes from trusted source category** ([waits § Eligibility](../../../../mental-model/mechanisms/waits.md#eligibility-comes-from-trusted-source-category)). Application input matches only subscriptions; a timeout never matches; other trusted Kernel Events match only dependency alternatives. A kind or correlation string cannot change the category. | Deterministic: live input that imitates a dependency's kind and correlation does not wake. Selector unit cases cover each category. |
| K13-3 | **Registration inside the Outcome acceptance** ([waits § Registering](../../../../mental-model/mechanisms/waits.md#registering-a-wait)). The four ordered steps: acknowledge the batch; check unacknowledged mailbox Events; compare the deadline against one accepted-time observation; persist `WAITING`. An eligible Event beats a due deadline, and the current batch cannot wake its own wait. | Deterministic: one case per branch, plus the "eligible and due" tie. |
| K13-4 | **Ending a wait** ([waits § Ending](../../../../mental-model/mechanisms/waits.md#ending-a-wait)). A wake retires the whole registration. A generation produces at most one timeout Event. A timer for a retired generation is discarded with an inspectable reason and no state change. A late result stays in the mailbox; generation fencing applies only to timers. | Deterministic: a repeated fire, a stale fire after a wake, a stale fire after a re-registration, and a late result matched by a later wait. |
| K13-5 | **Batch selection** ([waits § Selecting](../../../../mental-model/mechanisms/waits.md#selecting-the-batch)). The five [small distinguishing examples](../../../../mental-model/mechanisms/waits.md#small-distinguishing-examples) pass as separate cases. | Deterministic, plus mutants for three plausible wrong rules: ignoring eligibility, freezing candidates at wake, and treating the timeout as merely earliest. |
| K13-6 | **Cancellation order** ([lifecycle § Cancellation order](../../../../mental-model/mechanisms/lifecycle.md#cancellation-order); CX-1–CX-6). Cancellation is a control, ordered against Outcome acceptance. A losing Outcome is rejected whole and recorded as cancellation/terminal-conflict; its exact retry returns the same rejection. The losing reserved batch stays unacknowledged. Every unprocessed Event gets an explicit terminal disposition, in K1.2's B-5 shape. Cancelling a terminal Execution reports its result and changes nothing. | Deterministic: both orders of cancel and Outcome; cancel in each nonterminal state; retry after cancel. |
| K13-7 | **Execution deadline uses the same path** ([three clocks](../../../../mental-model/concepts/operations.md#three-clocks)). Expiry is a cancellation: no timeout Event, no further Activation, and a terminal disposition identical in shape to an explicit cancel. | Deterministic: the disposition records of explicit cancel and deadline expiry compare equal except for their reason. |
| K13-8 | **No ambient time in the Kernel.** The Kernel reads time only through an injected clock, and timers fire only through an explicit host entry that the Kernel resolves against current state ("a fire is a hint"). | Structural: the existing ambient-reads census, extended to time sources. Deterministic: tests drive the clock. |
| K13-9 | **Race schedules lose nothing** (007 acceptance). Over arrivals before, during and after a wait, stale timers, unmatched backlog, and cancel/complete schedules: no accepted input or wake is lost, and no terminal Execution reopens. A late delivery report after cancellation changes no logical state. | Declared bounded search: enumerate every interleaving of a fixed alphabet (input, eligible input, timer fire, wait-deadline expiry, Execution-deadline expiry, cancel, Outcome, delivery report) up to a declared depth, checking invariants and the owned outcome of each schedule. The design note declares the alphabet and the depth. |

**Layer 3.** Record the representations K1.3 chooses as this binding's choices, at the places rewrite-index
§4 names: generation, subscription spelling, timeout kind token and identity, wait-ended readiness storage,
cancellation-request storage, and the clock fields in operations' `OPEN(implementation)` marker (leave the
marker in place). Remove the "refused until K1.3" prose in BASELINE and the code comments.

## Recorded as limits (017), not built

- **Persistence.** Timers, waits and readiness live in the in-process binding; crash survival is K3's.
- **Physical interruption.** Logical cancellation is guaranteed; native interrupt is requested at most
  through the Driver choice in question 5, never awaited, and never claimed.
- **Dependency alternatives are inert in K1.** No trusted non-timeout Kernel Event (settlement, child
  result, peer message) exists before K2, so dependency matching is proven on selector units and by
  refusal of imitating input, not live.
- **No deadlock or satisfiability guarantee** ([waits](../../../../mental-model/mechanisms/waits.md#declare-what-can-wake-the-execution); rewrite-index §5).
- **Clock precision and units** are this binding's choice, and nothing beyond them is promised.
- **Fairness and load limits** are operating claims, not built here.

## Known counterexamples to keep passing

- COORD-REFACTOR-01's composed verify and its plan/apply oracle (`state-owner-controls.json`), and L-15's
  structural owner checks.
- K1.2's B-5 terminal disposition and K1.1's terminal-ingress tests: input to a terminal destination is
  refused and not queued, while exact retry replays and a changed retry conflicts. They now apply to
  `CANCELLED` too.
- The K0.2 five-example fixture ([public fixture specification §22](../../../../tests/fixtures/k0/public-fixture-specification.md)).
- Prior-art races ([research §6](../../research/2026-10-02-canonical-bytes-kernel.md#6-waits-timers-and-cancellation-k13)), as new corpus items:
  - a timer from a retired generation fires into a later wait (Restate#5425);
  - a pending timer keeps a terminal Execution non-terminal (the DTFx Running trap);
  - a timer callback runs after the terminal state (durabletask-python PR #280);
  - a repeated cancel, and a cancel of a terminal Execution, are no-ops.
- **To be replaced, not preserved:** tests that pin `wait_unsupported` and `cancelExecution` refusing for
  K1.3 (`refusals`, `unsupported`, `aggregate-refusal`, `refusal-diagnostics`, `outcome-partial-claim`,
  `poison-catalog`, `activation-identity`, and the SDK's `application.test.ts`). Each replacement keeps the
  property that still holds; for example, a malformed wait is still refused whole.

## Suspect design

1. **The plan basis under Kernel-internal triggers.** The state owner refuses a plan formed against a
   stale basis. Public operations re-form after a refusal, but a timer fire and an Execution-deadline
   expiry have no caller to retry. **Question:** when a timer plan and a cancel plan are formed against
   the same basis, who re-forms, and how does the re-formed plan reach the owned outcome (for example, a
   stale timer is a recorded no-op)?
2. **L-15 ("that each operation forms the right plan").** It was accepted as a limit when plans were
   simple. Here the plan's content is the race semantics. **Question:** which K1.3 rules become structural
   (owner-checked) and which stay test-checked under L-15?
3. **The Execution deadline has no declared source.** Layer 3 defines what its expiry does, but not who
   sets it or where it lives. If it joins the creation request, it enters creation's canonical content
   and replay/conflict comparison, which is expensive to change later. **Owner decision 1 below.**
4. **The Driver contract and cancellation.** Native interrupt is requested "through the Driver". Adding a
   Driver member changes a public contract. **Question 5.**

## Questions before code

1. **Clock and timer port.** What is the injected clock's shape? What is the host entry for "time has
   passed" (for example `expireDue(now)` or `fireTimer(executionId, generation)`)? How does each test
   control both deterministically?
2. **Representations** (rewrite-index §4): the generation, the subscription spelling, the timeout Event's
   kind token and identity derivation, and the storage of wait-ended readiness and cancellation requests.
3. **Plan variants.** List the new or extended plan kinds (registration within the Outcome plan; wake
   within the input plan; timer expiry; cancellation; deadline cancellation). For each, give its basis and
   its refusal, and how the closed union and the owner's checks extend.
4. **Cancel authority.** Which caller fact authorizes `cancelExecution` in the in-process binding? Cancel
   is a separate power ([authority](../../../../mental-model/mechanisms/authority.md)). What is the scoped
   refusal?
5. **Driver interrupt.** None in K1.3, or an optional, never-awaited Driver hook? Give the public-contract
   impact either way.
6. **K13-9's search.** The alphabet, the depth, the invariants, and the expected outcome per schedule
   class, all derived from the governing sources.
7. **Size.** If waits and cancellation cannot be reviewed coherently together, propose ranges (waits and
   wait deadlines first, then cancellation and the Execution deadline) or a split.

## Bounds

- **Non-goals:** persistence and scheduler leases (K3); Effects, children and settlement (K2); output
  observation (K4.4); the legacy bridge and SDK beyond its re-exports and pinned tests (K1.4); a second
  ingress rule.
- **Forbidden shortcuts:** reading `Date`, `performance` or timers inside the Kernel; deciding a race by
  submission time or physical stop; a pending/applied marker that defers the cancellation fence; deleting
  or silently dropping an unacknowledged Event.
- **TOOLS-02 coordination:** the owner releases K1.3 after TOOLS-02 range 1 (T2-1, T2-2) is integrated,
  so all K1.3 work starts from that main. Regenerate `tests/fixtures/packet-tools/adoption.json` only with
  range 1's `regenerate` operation in a fresh clone; never hand-edit census rows.
- **Roles (owner pattern):** a fresh Claude Opus session implements; Codex GPT-6 sessions do the design
  check and the review; a fresh Opus session does the Prompt C cleanup.
- **Lifecycle:** design note, then design check (required: Kernel semantics change), then build. Packet
  verify runs in CI from the first C. Before each dispatch, run tool-tests, both mutation registries and
  the full verify in a fresh clone.
- **Review gate:** a concrete defect against K13-1 to K13-9, or a false current claim in 007, BASELINE,
  017 or Layer 3. K13-9 is judged within its declared alphabet and depth; a schedule outside them that the
  sources do not decide becomes an owner question, not a blocking finding.

## Stop conditions

- A Layer-1 or Layer-2 change looks necessary.
- An accepted K1.1 or K1.2 behavior must change, other than the K1.3 refusals listed for replacement.
- The Driver's public contract must change beyond the owner's answer to question 5.
- The governing sources do not decide a schedule's outcome.
- An `adoption.json` conflict with TOOLS-02 that `regenerate` cannot resolve.

## Owner decisions needed to release

1. **The Execution deadline's source.**
   - **A (recommended):** an optional field of the creation request, part of its canonical content (an
     exact retry replays; a changed deadline conflicts), immutable after creation.
   - **B:** set by a separate control after creation.
   - **C:** deferred. K1.3 implements the expiry path behind an internal entry only, and the source is
     recorded as a limit.
2. **Shape.** One packet built in two ranges with one review (recommended), or a split into K1.3a (waits
   and wait deadlines) and K1.3b (cancellation and the Execution deadline).
3. **Adversary.** Run Prompt E against the design note before the build? Recommended for K13-6 and K13-9.
4. **Roles.** As above, unless the owner changes them.

**Owner answers (2026-10-25), verbatim:** "K1.3 decision 1: A (optional creation-request field, in
canonical content, immutable). Decision 2: one packet, two ranges. Decision 3: run Prompt E. Release after
TOOLS-02 range 1 lands." Their effects on this brief:
- **Decision 1.** The Execution deadline is an optional creation-request field. It is part of creation's
  canonical content: an exact retry replays, and a changed or added deadline conflicts. It cannot change
  after creation. K13-7 tests that a deadline set at creation expires through the cancellation path, and
  the build updates [creation](../../../../mental-model/mechanisms/creation.md) with the field. Suspect
  design 3 is settled.
- **Decision 2.** One packet. Range 1 covers waits and wait deadlines (K13-1 to K13-5, and K13-8). Range 2
  covers cancellation and the Execution deadline (K13-6, K13-7), and K13-9 over the whole. One independent
  review at the end. Question 7 is settled.
- **Decision 3.** A Prompt E adversary attacks the design note before the build, focused on K13-6 and
  K13-9. The design check reads the attack record.
- **Release.** After TOOLS-02 range 1 integrated (PR #59), recorded as [release 01](release-01.md).

**Correction (2026-10-25, design check 01 D01-CHK-01).** K13-5's third wrong rule, "treating the timeout as
merely earliest", cannot be killed by the five examples on reachable states. W-2 tests the backlog before it
mints a timeout, and an eligible arrival retires a live wait before any fire. So every eligible Event beside a
real timeout is newer than it. K13-5 instead kills "omitting the timeout from the batch". The sort-only rule is
recorded as an equivalent mutant: see [design 01, addendum 01 § A1](design-01.md#a1-k13-5s-mutant-claim-d01-chk-01).
The brief also lists the SDK's `application.test.ts` among tests that pin K1.3 refusals. That test uses the
legacy `@arrokothi/core` Harness, so it is not a K1.3 pin (design 01, "Accepted designs relied on").
