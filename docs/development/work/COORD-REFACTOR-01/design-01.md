# Design 01 — COORD-REFACTOR-01

Implementer: Claude Code desktop, Claude Opus 5.5 (`claude-opus-5-5`), 2026-10-22. Base B
`7626a623dad8acfc73584e08212c126b5b6daefc`. It answers [brief 01](brief-01.md)'s five questions and its three
suspect designs. It waits for the GPT-6 design check before any production code.

Owners read: [`execution-cycle.md#atomic-decisions-across-the-system`](../../../../mental-model/mechanisms/execution-cycle.md#atomic-decisions-across-the-system)
(the transaction mechanism is implementation-owned if the atomicity is real), [rewrite-index §4](../../../../mental-model/rewrite-index.md#4-explicitly-undecided--implementation-owned)
(the in-process binding's recorded choice), §5.4 and §5.19 (atomicity is not durability; single-writer
acceptance is concurrency control), [BASELINE](../../002-implemented-kernel-baseline.md#outcome-acceptance-api),
the [coordinator map](../DESIGN-AUDIT-01/coordinator-map.md) and [research §7](../../research/2026-10-02-canonical-bytes-kernel.md#7-planapply-decomposition-and-structural-single-writer).
The change belongs to the Kernel's in-process binding. It changes no Kernel semantics, Driver contract or
deployment claim.

## Mechanism

### Modules

| Module | Role | May import (zone) |
|---|---|---|
| `coordinator.ts` | Public `ExecutionCoordinator`, request/answer types (unchanged exports). Observes caller input, runs host and Driver callbacks, reads state through readers, forms plans, calls `apply`, then delivers. Holds no mutable record. | everything except `state-records.ts` |
| `plan.ts` (new) | The closed plan union and the pure Kernel-data helpers plans and views share (`StoredHold`, `HoldState`, `holdsOf`, `permittedForHold`, `QUEUED`). Data shapes only. | not `state.ts`, `state-records.ts`, `coordinator.ts`; no value import of `envelope.ts` or `outcome.ts` |
| `state-records.ts` (new, the **state module**) | The mutable record shapes: `ExecutionRecord`, `ActivationRecord`, `MailboxEntry`, `DeliveryAttempt`, `ResolvedExchange`, `AcceptedOutcomeRecord`. Types only. | type imports only |
| `state.ts` (new, the **owner**) | `KernelState`: the records in `#private` fields, `apply(plan)`, and read-only views. | `state-records.ts`, `plan.ts`, leaf modules; no value import of `envelope.ts`, `outcome.ts`, `coordinator.ts` |

`mapGet`/`mapSet`, `viewOf` and its projections, and `toActivationEvent` move to `state.ts`. Content
acceptance (`acceptInputContent`, `acceptCreationContent`), `mayControlScope`, the history-record and grant
builders, and every refusal reason stay in `coordinator.ts`.

### The plan union

One closed discriminated union. Every variant carries `kind`, `executionId` and `basis` (below). Every
field is required; absence is `null`, never an omitted member.

| Variant | Formed by | Carries (all built before `apply`) |
|---|---|---|
| `CreationPlan` | `createExecution` accept | Execution facts, frozen `creationRequestId`, creation identity, receipt, the initial entry's data, `answer` |
| `InputPlan` | `submitInput` accept | Input ID key, the entry's data (frozen `inputId`), receipt, `answer` |
| `DispatchPlan` | `dispatch` accept | Activation number, receipt, frozen Activation, submission grant, frozen batch, `answer` |
| `DeliveryPlan` | `#deliver` (dispatch, redelivery, takeover) | Activation ID, writer epoch, attempt number |
| `SettlementPlan` | a Driver report (`delivered`/`failed`) or a throwing `deliver` | Activation ID, attempt number, status, bounded failure text |
| `OutcomePlan` | `submitOutcome` accept (`#accept`) | receipt, mailbox positions to acknowledge and to end, both dispositions, Emission records, result, resolved-exchange facts, the retained accepted-Outcome record, hold-ending history, `answer` |
| `TakeoverPlan` | `requestTakeover` accept | receipt, clearing record or `null`, the new Activation, the new grant, `answer` |
| `ControlPlan` | `recoverExecution` / `reportProtocolFailure` change | history record, both holds after the decision, `answer` |
| `RefusalPlan` | `#refusal` naming a visible Execution | the frozen refusal record (it is also the answer) |

A refusal that names no Execution, a replay, an idempotent `changed: false` answer and inspection change
nothing, so they form no plan.

`apply(plan)` dispatches on `kind` through an `if` chain ending in a `never` check (the zone forbids `switch`).
Each variant has one `#apply<Kind>` method with two phases:

1. **Prepare.** Resolve the Execution by ID, check the basis, resolve positions, and construct the owner's
   mutable containers (`MailboxEntry`, `ActivationRecord`, `DeliveryAttempt`, the resolved exchange with its
   shared delivery list, readers) from plan data. Nothing pre-existing changes here.
2. **Commit.** Appends of prepared values and plain writes, in today's order and with today's statement text
   for the two swept sequences (below).

**Basis.** Each `ExecutionRecord` has an internal `version`, the number of plans applied to it; it is in no
view or answer. A plan names the version it was formed against; `#resolve` throws an internal invariant
error if the Execution's version differs, and commit advances it. Every state change goes through `apply`,
so any change a callback made between forming a plan and applying it makes `apply` refuse that plan. Correct
code never trips it: no plan is formed before a callback.

**Readers.** The owner hands planners read-only readers, never records:

- `ExecutionReader` (`find(id)`, `executionAt(i)`), `ExchangeReader` (`record.activation`) and `EntryReader`
  (`entryAt(i)`, `inputEntry(key)`).
- Each is a class private to `state.ts`, exported with `export type` only. It holds its record in a
  `#private` field and is created once per record, so identity comparisons like `record.activation !== exchange` keep working.
- Its members are getters with no setters, and a few query methods. Each returns a primitive, an
  already-frozen Kernel value (Activation, receipt, grant, hold, disposition, decision, refusal), or another
  reader. No reader returns a mutable list, a record, a `CanonicalValue` or bytes.
- Readers are live. A read after a Driver callback sees the post-callback state, which is what K1.2-DEC-19's
  revalidation reads today. `record.inspection()` builds the public `ExecutionView` from the record, as
  `viewOf` does today: fresh containers, shared frozen leaves.
- `KernelState.executionCount`/`executionAt` replace `Map.forEach` in `visibleExecutions`. The owner keeps a
  creation-ordered list, so the live loop visits Executions created during the listing, exactly as
  `Map.forEach` does.

### The coordinator, operation by operation

The planner keeps each method's checks, precedence, refusal reasons, variable names and `return` statements.
Only the writes move. Examples:

- **`#refusal`.** It mints the refusal, forms a `RefusalPlan` with `basis: record.version`, applies it and
  returns the refusal. The commit is today's: append, then advance the refusal index (SELF-R8-REFUSAL-01).
- **`dispatch` and `submitInput`.** They read `nextAcceptancePosition` and `activationsMinted` and mint the
  receipt without advancing anything. The commit advances both. `#mint` is retired.
- **`#accept`.** It builds the receipt, Emissions, result, dispositions, decision, history and the
  accepted-Outcome record, as today. It also builds the answer `{ ...decision, replayed: false }`. Then it
  forms the `OutcomePlan`, applies it and returns the answer.
- **`requestTakeover`, `recoverExecution` and `reportProtocolFailure`.** Each builds its answer, forms its
  plan, applies it, delivers (takeover only) and ends with `return answer;`.

`ExecutionCoordinator` holds `#driver`, the two limits and `#state = new KernelState()`.

### Delivery and settlement

`#deliver(intent)` keeps its signature and its three fault sites:

1. The **absent** site, `this.#state.apply(<frozen DeliveryPlan>)`. The plan is frozen and the row appended
   inside this one statement.
2. The **pending** site, `const settlement: DeliverySettlement = PrimordialObjectFreeze({ … })`.
3. The **failed** site, `this.#driver.deliver(intent.activation, settlement, intent.submission)`.

The statements before the absent site make no intercepted call. They are reader getters only.

`delivered()`, `failed(reason)` and the `catch` path call one coordinator helper. The helper reads the row's
status through a view. If the status is `pending`, it bounds the reason, forms a `SettlementPlan` and applies
it. Otherwise the first report has already won and it does nothing.

### What does not move

- No public export, request or answer type changes.
- No receipt, ID, refusal classification, reason or precedence changes.
- The Driver contract does not change.
- `cancelExecution` stays unimplemented.
- No hardening is added, and no persistence or concurrency model.

### Callbacks (suspect design 3)

| Callback | Where it runs | Plan relation |
|---|---|---|
| Caller envelope getters (`observeOwn`, `observeField`, `capture*`) | observation phase, before any check that reads state | before planning; a reentrant decision is ordered before this one's checks (K1.2-DEC-10) |
| Host members: `caller.scopes`, `controlScopes`, the two limits | `#visible`, `#requireControl`, the constructor | before planning |
| `driver.isSafeToReplace` | after takeover's pre-checks | before planning; revalidated (DEC-19), then the plan is formed |
| `driver.deliver` | after the decision's apply and the delivery's apply | after apply |
| Driver reports | their own entry point, at any time (during `deliver`, during `isSafeToReplace`, later) | each forms and applies its own `SettlementPlan` in the same synchronous run |

Only the takeover has a callback between reading state and deciding. Its plan is formed after
revalidation, so no plan crosses a callback, and the basis check refuses one that would.

## Why each criterion closes

**CR1-1, plan union.**
- *Structural.* `apply` accepts only `Plan`, the closed union. Each variant's fields are required and
  data-typed. A `DataOnly<T>` constraint on the union rejects any function-typed member, at any depth, at
  compile time.
- *Plans cannot hold records.* `plan.ts` cannot name the mutable record types (dependency rule R3), so no plan
  type can embed a mutable record.
- *Must-fail type fixtures.* They live in a new `state-types.test.ts`, as in-memory sources checked with the
  repository compiler options. The diagnostic codes are pinned per line, because `@ts-expect-error`
  accepts any error:
  - a plan with a function member: TS2322;
  - an unknown `kind`: TS2322;
  - a variant missing a coupled field: TS2741.
- *Runtime witness.* A new `state-plans.test.ts` wraps `KernelState.prototype.apply` in the test process.
  The recording is poison-safe and uses captured primordials only. Each operation family runs through the
  public coordinator: creation, input, dispatch, redelivery, delivery, settlement, Outcome, takeover,
  recovery, protocol failure, and refusals of each. The witness asserts:
  - each plan's `kind` is in the closed set;
  - the plan is frozen, and every object reachable from it except `answer` is frozen and data-only (no
    accessors, no functions). The one exception is the owned `bytes` of a frozen `CanonicalValue`;
  - the expected sequence of kinds per operation.
- *Coverage check.* A static check over `plan.ts` and `state.ts` maps each union member to its `#apply<Kind>`
  method. Every field except `kind` and `answer` must be read on that method's path. No `plan.answer` is read
  anywhere in `state.ts`. So a commit cannot silently drop a coupled field, and apply cannot depend on the
  answer.

**CR1-2, one state owner.** The check lives in `tests/conformance/architecture/`. The rules sit in
`boundary-policy.ts`, and a new `kernel-state-ownership.test.ts` reuses `module-graph.ts`'s extractor.
No dependency is added.

| Rule | Edges | Statement |
|---|---|---|
| R1 | all, type-only included | `state-records.ts` is imported only by `state.ts`, and by it |
| R2 | all | `state.ts` is imported only by `coordinator.ts`, and by it |
| R3 | all | `plan.ts` imports neither state module nor `coordinator.ts` |
| R4 | value | `state.ts` and `state-records.ts` import no runtime binding from `envelope.ts`, `outcome.ts` or `coordinator.ts` |

- *Non-vacuity.* Every subject and target file named by a rule exists. Each importer rule matches at least
  one edge. A rule naming a missing file fails.
- *Must-fail fixtures.* Each one injects a bypass import into in-memory text and must fail its rule:
  - a type import of `ExecutionRecord` into `coordinator.ts`;
  - `KernelState` into `outcome.ts`;
  - `hostMember` into `state.ts`;
  - a record type into `plan.ts`.
- *Runtime brand.* `KernelState`'s maps and list and each reader's record are `#private`. The reader
  classes are exported as types only, so no other module can construct one; `export type` blocks `new`
  (TS1362, pinned). A reader getter or a `KernelState` method called on a forged receiver throws the
  engine's private-brand `TypeError` (runtime test). Writing a reader member is TS2540 at compile time and
  a `TypeError` at run time (getter only, strict mode).
- *Writers.* The ported static check derives every field of every `state-records.ts` interface, plus
  `KernelState`'s private collections. Using `zone-analysis.ts`'s `writeOwners`, it requires each field's
  writers to be a non-empty subset of the `#apply*` methods.
- *No callback inside `apply`.*
  - The effect analysis classifies every call. The foreign-call inventory stays exact at its three sites
    (Driver `deliver`, `isSafeToReplace`, `hostMember`'s getter call), and no function in `state.ts`,
    `state-records.ts` or `plan.ts` has a foreign effect summary. The summary is transitive through the call
    graph.
  - Plans carry no function, which the type and the witness both check.
- *Revalidation.* The basis check above.

**CR1-3, behaviour identical.**
- *Deterministic.* The composed verify runs in CI. Unchanged: every complete-decision scenario, the fault and
  poison sweeps, K1.2's Outcome tests, `index.ts`'s exports, receipts, IDs, refusal classification and
  precedence.
- *Byte-identical oracle.* `fault-scenarios.ts` stays byte-identical, and so do `CHECKS`, the prefix model,
  the 57-exit inventory, the Outcome and takeover commit-statement anchors, and the pending and failed
  delivery anchors.
- *Exits and swept commits.* Each swept method keeps its `return` statements, so the exits, their texts and
  their count are unchanged. The two swept commit sequences keep their statement text in `state.ts`.
- *No new state between commits.* New intercepted operations (plan freezes, resolution, prepare) all come
  before the first commit statement. A fault there leaves the no-call state, which the oracle already
  permits.

**CR1-4, bypass mutants.**
- *Cases.* Four new `mutations.json` probe cases, one per family, in the determinism sample. A new
  `tests/tooling/state-owner-probe.mjs`, modelled on `oracle-probe.mjs`, runs the named test files with the
  assertion reporter. A kill is an `ERR_ASSERTION` failure of a named test; a loader failure or other exit
  never counts.
- *Mutants:*
  - **(a) a write outside `apply`.** One reader getter that writes a field. One leaked delivery list that
    `#deliver` appends to directly (multi-edit). Killed by the writers check and the reader witness.
  - **(b) a dropped coupled field.** Four mutants: the history append in `#applyControl`, a hold write in
    `#applyControl`, the receipt append in `#applyTakeover`, the grant write in `#applyTakeover`. Killed by
    the coverage check.
  - **(c) a callback inside `apply`.** A plan member function that `#applyRefusal` calls, which the
    effect-summary check and the plan witness kill. A `hostMember` import and call in `apply`, which R4 and
    the effect check kill.
  - **(d) a view aliasing mutable state.** `inspection()` returning the live recovery-history list, and a
    reader getter returning the live mailbox. Killed by the inspection-freshness test, which mutates every
    container of a returned view, and the reader witness.
- *Survivors.* A correctly targeted survivor stops the build for the owner.

## Accepted designs relied on

| Design | Fit? | Note |
|---|---|---|
| K1.2-DEC-10 / correction DEC-9 build-then-apply | Fit | It becomes structural. The planner can only build; `apply` is the only writer. The apply-window claims are unchanged. |
| `ControlCommit` / `applyControlCommit` (suspect design 2) | Fit as a pattern, too narrow as a mechanism | It becomes `ControlPlan` and `#applyControl`, one variant of the general union. The order is unchanged: history append, then the two hold writes. |
| K1.2-DEC-19 revalidation | Fit | Kept in the planner verbatim, with the basis check as a structural backstop. |
| Correction DEC-8 own-read rule | Fit | Records stay fully owned literals. Readers add one syntax kind (question 4). |
| `own-array.ts` primitives | Fit | Used unchanged. |
| Fault-oracle located windows | Fit | Only the source locator is ported (question 3). |
| K1.2-DEC-20 grant identity | Fit | The grant travels in the plan; the planner compares references through the reader. |

## Source-site inventories (brief question 4)

| Inventory | Fate | Why |
|---|---|---|
| `ambient-reads.test.ts` (DEC-8 static guard) | **Port** | The analysis is file-agnostic. The test file stays unchanged; its `hostMember` list is unchanged. |
| `zone-inventory.ts` | **Port** | `ACCESS_INVENTORY` entries move with their code: `...base` and `...entry.inputId` move to `state.ts`, and new sites are inventoried with reasons. `FOREIGN_CALLS` keys are unchanged. `WRITE_SITES` becomes the derived writer rule. |
| `zone-analysis.ts` | **Port**, retiring its DEC-9 suffix model | Kept: `analyseAccesses`, `analyseEffects`, `writeOwners`, `mutatedArguments`, `summaries` and `resolveCallee`. Retired by the mapping below: `checkControl`, `checkApplyHelper` and their suffix and refusal-exit helpers. |
| `control-commits.test.ts` (DEC-9 static guard) | **Retire**, with the mapping below | Its object was the order of writes inside three planner methods. Planners now cannot write. |
| `sweep/fault-oracle.ts` source model, and `fault-oracle.test.ts` frames | **Port the locator only** | Question 3. |

`control-commits.test.ts` coverage mapping:

| Obligation | Maps to |
|---|---|
| Every call classified; foreign-call inventory exact | Ported to `state-owner.test.ts`, which adds: no foreign summary in `state.ts`, `state-records.ts` or `plan.ts` |
| Controls end in an apply suffix; no mutation and no foreign call before it (3 tests) | CR1-2: the planner holds no mutable reference; R1/R2 and the brand; writes only through `apply`. The plan includes the answer. The basis check refuses a plan crossed by a callback. |
| The recognised suffixes | `fault-oracle.ts` `CHECKS.applySequence` (maintained) pins the swept takeover and Outcome commit sequences in `state.ts`; the coverage check pins every variant's fields |
| `applyControlCommit` order and effects | The fault sweep's control scenarios (14 recover, 12 report, maintained) and the writers check |
| Fixed writers of holds, history, receipts and the acceptance index | The derived writers check, extended to every record field |
| Effect summaries independent of order | Ported with the analysis |
| Refusal helpers mutate only in refusal exits | CR1-1: a refusal is a `RefusalPlan` |
| 31 negative controls | Write forms, aliases, containers, closures, callbacks and early refusals in a planner cannot be expressed: the planner has no mutable reference (`TypeError`, TS2540). In the owner they hit the writers check. Foreign-code ordering hits the basis check and the foreign inventory. Apply-step ordering hits `applySequence` and the fault sweep. Writer drift hits the writers check. CR1-4's four families are the maintained successors. |

## Test files that change (brief question 5)

Changed:
- `tests/conformance/architecture/kernel-landing-zone.test.ts`: the exact reachable file list gains three modules.
- `packages/kernel/tests/zone-inventory.ts`, `zone-analysis.ts` and `sweep/fault-oracle.ts`: ported as above.
- `packages/kernel/tests/fault-oracle.test.ts`: frame `file` names for moved statements; no test added (its 267-test count is pinned).

Removed:
- `packages/kernel/tests/control-commits.test.ts`.

New:
- `state-plans.test.ts`, `state-owner.test.ts`, `state-types.test.ts`;
- `tests/conformance/architecture/kernel-state-ownership.test.ts`;
- `tests/tooling/state-owner-probe.mjs`;
- registry cases.

Every behavioural test stays byte-identical, including the preserved members.

## Corpus

Maintained and unchanged:
- the complete-decision oracle and its negative controls;
- the fault sweep (66 scenarios, 57 exits) and the poison sweeps;
- `ambient-reads`, `recovery-ambient`, `whole-view-ambient`, `poison-catalog`;
- K1.2's Outcome suites;
- the F11, F12/F09, F15, F03 and F13 family tests.

New maintained items:
- the plan witness per operation family;
- the reader and inspection aliasing witnesses;
- the writers, coverage, effect and ownership checks with their must-fail fixtures;
- the type fixtures;
- the CR1-4 mutants.

## Evidence churn (TOOLS-02 bucket, no new credit)

- Adoption census rows and read digests: regenerated mechanically in a fresh clone.
- The value-cost mutants anchored in `coordinator.ts`: the creation map writes, the ingress appends, and the
  activation and view payload anchors move to `state.ts` with byte-identical `before`/`after` text and
  unchanged IDs. Only `path` changes, and therefore the content key.
- `value-cost-source-files.json`: gains the three modules.

## Questions

1. **The plan's `answer`.** It is the exact value the method returns. It is built before `apply`, never read by
   `apply` and not retained. Freezing it would change what callers receive, so it stays an unfrozen
   container, as today. The witness checks that every other field is deeply frozen, and the coverage check
   that `apply` never reads `answer`. Is this exemption acceptable?
2. **Two plans for delivering operations.** Dispatch and takeover form their decision plan, then a
   `DeliveryPlan` after that apply and before the Driver call. Today's order records the attempt before the
   Driver runs, and the oracle's takeover delivery sites locate faults inside `#deliver`. Redelivery forms
   only the `DeliveryPlan`. Reports form `SettlementPlan`s. May CR1-1's "one frozen value" mean the decision
   plan, with the delivery row as the delivery adapter's own plan?
3. **The fault-oracle locator.** `sourceModel` finds the Outcome and takeover commit sequences in
   `state.ts`'s `#applyOutcome`/`#applyTakeover`, with their statement anchors byte-identical. Ported:
   - the takeover planner tail, which becomes `this.#state.apply(plan);`, `this.#deliver(exchange);`,
     `return answer;`;
   - the absent delivery anchor;
   - the Outcome sequence's trailing statement;
   - `inLines`, which takes a file per anchor;
   - `fault-oracle.test.ts`'s synthesized frame files.

   Step names, order, the prefix model, every `CHECKS` entry, the scenarios and the exit inventory are
   unchanged. Does the checker accept this as "no oracle expectation edited"?
4. **DEC-8 syntax allowlist.** Add `GetAccessor` (not `SetAccessor`) to `zone-analysis.ts`'s permitted kinds
   for the reader classes. A getter declaration evaluates nothing itself, and a read of it resolves on the
   zone's own class prototype.
5. **Fault paths outside the sweep.** Building before applying changes two fault paths, neither swept:
   - Today `dispatch` and `submitInput` advance the acceptance index (and `activationsMinted`) before
     building, so an engine fault in construction consumes a position with no decision behind it. After the
     refactor nothing changes until commit. Without faults, behaviour is identical.
   - `failed(reason)` bounds the reason before marking the row; today it marks the row first. The bounding
     invokes nothing (KC1-ARCH-1), so no report can interleave.

   I would record both as structural consequences, with honest provenance, not as targeted fixes. Agreed?
6. **Basis check.** Is an internal per-Execution version, with `apply` throwing an invariant error on a stale
   plan, acceptable as the structural form of "revalidated against the resulting state"? It never fires in
   correct code.
7. **Retiring `control-commits.test.ts` and the DEC-9 suffix model,** with the mapping above.
8. **Evidence churn** as listed: mechanical regeneration and re-pointing, no new credit.

The Layer-3 maintenance in the build candidate:
- the rewrite-index §4 transaction-mechanism entry;
- BASELINE's transaction, recovery-control and ambient-read bullets (the static-guard sentence names the new
  checks);
- a `kernel-ownership.md` section for R1–R4;
- an 017 limit: plan selection stays an oracle claim.

No `OPEN(` marker changes. No third-party code is used.

## Revision 1 — design check and owner choice 01

The [design check](design-01-check.md) (GPT-6) approved design 01 with required changes D01-CHK-1 to D01-CHK-4.
[Owner choice 01](owner-choice-01.md) answers D01-CHK-1. This section supersedes the text above where they
differ. The plan/owner boundary is unchanged, so no new design check is needed.

**D01-CHK-1, fault paths (owner choice 01).** Three paths change, as a bounded exception to CR1-3:

1. A `dispatch` or `submitInput` build fault consumes no position and no Activation ID.
2. A build fault in `failed(reason)` leaves the row `pending`.
3. A build fault in any other settlement plan, `delivered()` included, changes nothing.

`boundDiagnostic` catches its own faults and returns the fallback. So for `failed` today, a bounding fault
records the fallback, and no operation can fault before the status write. After the refactor, the faultable
steps are the status view and the plan's construction, both before `apply`.

A new child `packages/kernel/tests/fault-paths-child.ts` wraps the load-time `Object.freeze` and
`Reflect.apply` before the Kernel loads, as the sweep's child does. It arms one fault inside the chosen
build. `fault-paths.test.ts` runs one case per path. Each case pins:

- the documented historical outcome;
- the new outcome;
- that the whole view, the next refusal and acceptance positions, the next Activation ID and the next
  decision equal a run without the faulting call.

The oracle, `fault-scenarios.ts` and the sweeps are not edited. BASELINE states the exception. Any other
difference found stops for the owner.

**D01-CHK-2, getters.** The readers keep getters, because three scenario exit snippets read reader members
as properties (`${exchange.codeHold.reason}`, `${exchange.activation.writerEpoch}`,
`intent.activation.activationId`). `zone-analysis.ts` therefore models getter bodies:

- `Fn` and `isFn` include `GetAccessorDeclaration`, so getters are discovered, owned (`get <name>`) and
  visited by `writeOwners`;
- a property read whose symbol is a zone getter is evaluated as a call of that getter on its receiver:
  its mutation and foreign summary join the reading node's effects, and its returned provenance replaces
  the default member-read provenance;
- `GetAccessor` joins the permitted syntax. `SetAccessor` does not.

New negative controls in the ported `control-commits.test.ts` must fail for their intended assertion:

- a reader getter that writes its record's field is reported by the writers check as a writer outside
  its arm;
- a mutating getter read by a planner before `apply` is reported by the pre-apply effect check;
- a getter that returns a live record list, which a planner then appends to, is reported by the writers
  check through the returned alias.

**D01-CHK-3, phase guards.** `control-commits.test.ts` is **ported**, not retired:

- **Pre-apply effects.** Planner methods end in an apply suffix: one `this.#state.apply(<prebuilt plan
  local>)`, then optionally `this.#deliver(<reader>)`, then `return <prebuilt local>`. `submitOutcome`
  ends in `return ok(this.#accept(…))`, and `#accept` ends in the suffix. Before the suffix, no node may
  mutate a pre-existing object, module bindings included, except a refusal exit. Control 17 is kept as a
  negative control.
- **Refusal exits.** A `RefusalPlan` is applied only by `#refusal`, which may appear only as
  `return err(this.#refusal(…))` or `return this.#refusal(…)`. `#requireControl` and `#openExchange` keep
  their call-then-exit form, and the `isRefusalExit`, `refusalHelperViolations` and `exitsOnRefusal`
  checks stay. Controls 18–20 are kept.
- **Basis timing.** Each planner binds `const basis = <reader>.version;` as its first reader read after its
  last foreign call. No foreign call follows it before `apply`, and every plan literal's `basis` is that
  binding, or a parameter that every caller passes it as. The takeover binds it after `isSafeToReplace`
  and its refusal, before the DEC-19 revalidation. Revalidation keeps its classified refusals; the basis
  check stays a backstop. Control 25 becomes a negative control: a callback moved after the binding.
- **Redelivery.** Its answer is built before `#deliver` and returned through the suffix, so the
  prebuilt-answer rule covers it.
- **R4.** The rule check reads `ImportDeclaration`/`ExportDeclaration` type-only flags itself.
  `module-graph.ts` has none. R1–R3 count every edge; R4 counts value edges only, and its must-fail
  fixtures include a type-only import that passes and a value import that fails.

**D01-CHK-4, coupled commits.** The coverage check now pins commits, not reads:

- A declared table lists, for each plan kind, the exact commit statements of its `#apply<Kind>` arm. Each
  entry is a target field with its form (append, map insert, write, or a disposition loop), and the plan
  field or prepared container that supplies it. The check derives the same facts from the arm's commit
  phase, following `const` aliases and container initializers back to `plan.<field>`, and requires
  equality. A statement outside the commit grammar is a violation.
- A second table keeps the per-field restriction, as `WRITE_SITES` did: each record field and its exact
  set of permitted arms, compared with `writeOwners`.
- The four dropped-field mutants keep their `const` bindings and delete only the commit. They must be
  killed by the commit-table check, and by the existing resulting-state assertions in the recovery-history,
  receipts, hold and grant suites. A compile or load failure is not a kill.

**Creation listing.** The creation-ordered list becomes a link on each record (`next`) with `#first`/`#last` on
`KernelState`. Appending is three plain writes after the two `mapSet` publications, so it cannot fault, and
no listing/lookup split appears that does not exist today. Readers expose `nextExecution`; `visibleExecutions`
walks it live, as `Map.forEach` does.

Updated test-file list:
- `control-commits.test.ts` is **ported**: same obligations, new shapes, with the controls above added.
- New: `fault-paths.test.ts` and `fault-paths-child.ts`.
- Everything else is as listed above.

**Build note: evidence at C (D01 Q8).** Moving code changes the adoption census and hold register, which are
regenerated mechanically at C with no new credit. Nine held-witness bindings name test spans this packet changed:
seven in the ported `control-commits.test.ts` and two oracle-test controls whose frames now name `state.ts`. They
no longer bind the source at C. They are retired to [reopened-bindings.json](design-01/reopened-bindings.json),
with no hold release or replacement credit. The one complete origin they closed, the fault-oracle suite, is reopened
for revalidation and transferred to TOOLS-02 under this design, as pinned in
[revalidation-origins.json](design-01/revalidation-origins.json).
