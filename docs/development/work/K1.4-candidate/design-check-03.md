# K1.4-candidate — design check 03

**Verdict: APPROVED WITH REQUIRED CHANGES, D03-CHK-01 through D03-CHK-05.**
The immutable, scoped ledger fixes the collision mechanism. The answer/inspection check and
verification specification need the changes below before the design is ready to build. None requires
a new naming domain, a Kernel change, or reversal of an owner choice. This is a design check under
006, not acceptance of H or of an implementation of design 03.

## Identity, authority and access

- Checker: independent Codex desktop session, GPT-6 per the session identity; exact serving variant
  not exposed. Date: 2026-11-15. This session has not planned or built the packet. No planner notes
  directory (`~/.claude/projects/...`) was read. No subagents were used.
- Fresh remote clone: `/private/tmp/arrokothi-k14-design-check-03`. Branch
  `codex/k1.4-candidate-design-check-03` starts directly at
  **3745cb4bcf12eb36af797b582d5132dc5c0a6ea1**, the checked
  [design 03](https://github.com/ArrokothI/arrokothi/blob/3745cb4bcf12eb36af797b582d5132dc5c0a6ea1/docs/development/work/K1.4-candidate/design-03.md).
  Nothing was merged.
- Governing [review 02](https://github.com/ArrokothI/arrokothi/blob/2a95a49a6e7ff46242a137f9d9ca6835e70ed946/docs/development/work/K1.4-candidate/review-02.md),
  [brief 03](https://github.com/ArrokothI/arrokothi/blob/2a95a49a6e7ff46242a137f9d9ca6835e70ed946/docs/development/work/K1.4-candidate/review-02/brief-03.md),
  [probes.mjs](https://github.com/ArrokothI/arrokothi/blob/2a95a49a6e7ff46242a137f9d9ca6835e70ed946/docs/development/work/K1.4-candidate/review-02/probes.mjs)
  and owner route record were read by exact commit
  **2a95a49a6e7ff46242a137f9d9ca6835e70ed946**; no review branch was merged.
- Base B: **c1951226338de6ccd3e4e6289259549551268f61**. Reviewed H:
  **14a7ef485282ab2c16d08702be5d61cfeb9997e7**. H..design changes only design 03,
  progress and 007; the inspected adapter remains H's implementation. The governing 006/009/012
  policy files are unchanged from B. The owner selected redesign with a design check after review 02.
- Read the repository instructions, development front door/baseline, relevant 007/008/009/012 records,
  design addendum/02 and owner choice 03. Canonical ownership was traced through the overview,
  reference and Kernel pages to identity, creation, waits and evidence. The research reading map's
  timer, validator-testing and evidence-tooling sections were background; no third-party claim is
  used as evidence or license clearance.

**Owner choice 04**, supplied by the owner in this check session, dated 2026-11-15, verbatim:

> Accept OQ-1, OQ-2 and OQ-3 as recommended.

This fixes **OQ-1: a shown string never changes; OQ-2: refuse `eventIdentity` by command capability
in `begin`; OQ-3: `KERNEL_CANDIDATE_VERSION` stays `/1`.** I find no reason to reverse these
choices. The required changes below preserve all three; none silently selects an alternative.

## Coverage and answers

Results here concern design sufficiency, not runtime conformance of unbuilt code.

| Requested check | Result | Reason |
|---|---|---|
| 1. Complete census, including J-3 | **FAIL as a complete census** | All translated Observation fields are covered, but accepted/ignored command paths and the scope of the universal wording need D03-CHK-05. `ingressRefused` may remain a command echo. |
| 2. Final-output injectivity, arrival orders, copied names, Execution scope and inverse targeting | **PASS for the ledger invariant** | The proof below holds for the three translated families. The stronger changed-ID claim and its cross-run test are not consequences of that proof: D03-CHK-02. |
| 3. Rules 4–5 and J-1/J-2 | **FAIL as specified** | Throwing on inconsistent public evidence is legitimate, but existence/category is weaker than correspondence to this answer. Replay membership is insufficient: D03-CHK-01. |
| 4. Finishable independent search and seven mutants | **FAIL as specified** | The oracle needs non-vacuity and complete projections; the search needs concrete domains, count and execution budget: D03-CHK-03/04. J-5 fits the existing registry workflow. |
| 5. Kernel/fixture/tool scope and 12/3 matrix | **PASS at design level** | No such source change is necessary. OQ-2 leaves all fifteen pinned capability outcomes and first unsupported steps unchanged. Runtime preservation remains the build/review's obligation. |

### Why the central mapping works

For a fixed family and scope, every new pair is inserted only after its string is found absent from
`denotes`. Existing pairs never change or disappear. Thus both directions remain inverses and
`shown` is injective throughout a finite run. Fresh-name selection terminates: a finite ledger can
occupy only finitely many distinct suffix candidates. Implementation must preserve that distinct
enumeration, rather than truncate or recycle suffixes.

This argument covers a laboratory name arriving before a predicted fallback, the fallback arriving
before a copied laboratory name, labels meeting input names in either order, and recursively copying
a suffixed output. All of them are the same occupied-string test. Input and timeout Events must use
one Event ledger, including every occurrence in `acknowledged`, `queued`, `terminalDispositions`
and `dispatchedBatch`; a separate payload rendering path would break the premise.

Execution names are scoped to the run. Event and generation names are scoped by **native Execution
ID**, not an offered name. The full identity is therefore `(family, displayed Execution, displayed
local name)`. Equality across different families or Executions is harmless. A generation command
resolves in its resolved Execution's ledger. A displayed fallback is resolvable just like a preferred
name; a refused preference continues to denote its old ID. These properties close review 02's
generation-target and Execution-alias counterexamples. OQ-2 removes the untranslated Event selector
from the supported command surface. The guard must cover both Outcome command kinds, and `apply`
must retain the corresponding unsupported-command guard when a caller bypasses preflight.

### Judgments J-1 through J-5

- **J-1: agree.** Collision is a representational conflict, so a fresh name permits the run to continue.
  Contradictory public evidence has no faithful projection and may fail visibly. Neither operation
  accepts, rejects, repairs or replays a Kernel command on the Kernel's behalf.
- **J-2: conditional on D03-CHK-01.** Comparing returned facts is legitimate. Merely reading `replayed`
  is not simulating replay. However, that flag must not exempt a wrong answer from correspondence
  checks; the existing public view exposes retired generations too.
- **J-3: agree, with the typed-domain statement in D03-CHK-05.** For example, accept input named `n`,
  cancel, then submit **new input under a fresh request key** also named `n`. `ingressRefused: "n"`
  may coexist with `terminalDispositions: ["n"]`: the former echoes a refused request, the latter
  names an accepted Event. No second native Event exists. Do not allocate a ledger entry for the
  refusal. An exact retry of a previously accepted input after termination is a different control:
  Kernel replay succeeds and must not become terminal-ingress refusal. Preserve both witnesses.
- **J-4: agree.** Emission keys remain the explicitly bounded projection in 017 L-42; this design
  must not upgrade it to an injective projection of Kernel-derived Emission IDs.
- **J-5: agree.** Seven adapter mechanism mutants can use the existing registry's uniquely anchored
  edits, passing controls and named assertion probes. No packet-tool extension is needed. The
  concrete witness and budget requirements are in D03-CHK-04.

## Required changes

### D03-CHK-01 — Check answer provenance, not just membership

**Required; rules 2, 4–5, J-2 and R03-1/R03-2.** Rule 4 currently accepts an Event whenever the mailbox
contains its ID with the right source category. That does not establish that it is the Event this
answer purports to name. Two small counterexamples follow directly from the written rule:

1. In one Execution expire g1 to t1 and g2 to t2, displaying both. Duplicate-fire g2, but fault only
   the answer to return t1. The unchanged view still contains both timeout Events. `assign(t1, ... )`
   keeps t1's old name; membership/category succeeds; no Observation field changes from the honest
   duplicate fire. The wrong answer disappears. Repeat with g1/g2 reversed.
2. Register already-due g2. Its answer names `(g2, t2)` and readiness names g2, but fault the mailbox
   entry t2's `waitGeneration` to g1. Rule 2 assigns `to-g2` from the answer; rule 4 only checks that
   t2 is a timeout. The entire rendered Observation equals the honest one. Moving label production
   from the entry to the answer has hidden the entry's wrong generation. Addendum §A4 and current
   017 L-39 explicitly rely on using the timeout's **own** generation.

Require equality of the relevant association as well as membership: the inspected Execution must
be the addressed/answered Execution; an answered timeout must belong to the resolved timer or
answered wait generation; the generation returned for an accepted Outcome must belong to that
Outcome's Activation. The public types already provide `TimeoutMailboxEntryView.waitGeneration`,
`WaitView.registeredBy`, `RetiredWaitView.registeredBy/endingEventId`, and
`ExecutionView.retiredWaits` ([inspection.ts](../../../../packages/kernel/src/inspection.ts)).
These are comparisons of Kernel evidence, not a second timer/eligibility algorithm.

The replay exception needs the same precision. After g1 and g2 have both been registered and retired,
replay g1's accepted Outcome while faulting only its returned generation to g2. Both generations
are already in the ledger, so the proposed exception accepts the wrong answer with no visible
change. The claim that an ended generation cannot be checked through inspection overlooks
`retiredWaits`. Compare the historical association to the submitted Activation, or retain the
original answer's association and compare against it. If any test uses prior ledger membership,
capture it **before** the current offer: checking it after `assign` is vacuous.
Compare presence/nullability as well: replacing a duplicate fire's answered timeout ID with `null`,
or dropping a replayed Outcome's wait answer, must not bypass the check merely because no offer runs.

For rule 5, distinguish the original **offered input name** from the assigned display name. If two
inputs offer `n`, the second payload must still contain `n`, even though its displayed name is fresh.
Specify the retained evidence and check each successful input answer against its command's name and
its corresponding mailbox entry; do not compare payload to the collision fallback or overwrite
evidence to excuse a contradictory replay. State that an input with no offered-name evidence fails
this check rather than acquiring its name from the payload.

**Closure:** keep the planned absent-ID check and add payload-drift coverage, the three traces above,
missing-answer-field, wrong-category and per-Execution controls, duplicate/replayed answers after
readiness consumption and cancellation, and two same-name inputs. Honest controls must complete. Contradictions must
produce a named adapter failure after the Kernel answer, without repairing the view or sending a
replacement command. This strengthens observation checking only; it does not decide Kernel state.

### D03-CHK-02 — Separate first naming from identity drift

**Required; §4 “What the Observation then means”, §5 and §9's changed-ID runs.** A fixed injective
mapping within one run does not imply literal output inequality between two independently named
runs. The instruction to fault **each** fire's answer and view and require a different Observation
is impossible for a legitimate first naming under rule 2.

Reproduction by substitution into the design, with no implementation needed:

| Fact at the first fire of a not-yet-expired wait | Honest run | Fault run |
|---|---|---|
| Previously displayed timeout IDs | none | none |
| Command's unused preferred name | `t` | `t` |
| Answer and matching mailbox timeout ID | native A | native B |
| Matching generation/category and every other projected field | identical | identical |
| Required result of `assign` | `t` | `t` |

Both runs satisfy the ledger rule; their Observations are equal. The adapter cannot infer an
unobserved, supposedly intended opaque ID from its spelling. It must not derive native IDs itself
to make this test fail.

Limit the changed-ID guarantee to substitution of an identity already established in that run, or
to a contradiction against separately retained public evidence. Keep duplicate-fire drift,
due-at-registration followed by first explicit naming, and answer-only contradictions. An
unannounced extra Event is independently testable by list cardinality. A consistently renamed ID
before first exposure is a control, not a fault the name ledger can promise to detect. Likewise,
“exact image” means the enumerated translated projections, not all identities in the full
`ExecutionView` or the L-42 exceptions.

**Closure:** specify the fault locations/preconditions and expected observations explicitly.
Preserve review 01/02's already-observed-ID witnesses and both adversarial and ordinary spellings.
Add the first-exposure control above; no weaker within-run injectivity claim is necessary.

### D03-CHK-03 — Make the independent oracle total and non-vacuous

**Required; §9 R03-1.** Pairing strings with raw view IDs is appropriately independent of the ledger,
but the two written checks are insufficient as an acceptance oracle:

- A constant-empty Event projection contributes no pairs if the oracle only zips existing entries.
  An omitted list suffix can pass the same way.
- A broken resolver can throw on a valid displayed fallback. “Or the command threw” accepts that
  error, and the rest of a skeleton can disappear. An injective but unusable adapter is not the
  design's J-1 behavior.
- Raw views and call arguments do not include the returned answers needed to assess rules 2/4/5,
  notably an answer-only fault. A relation can also be injective while assigning the wrong initial
  preference or Q2b label; the relation alone does not check those conventions.

Record raw **answers**, actual call arguments and the particular post-command inspection used for
the Observation, separately from any preliminary inspection used by recovery/takeover. Check exact
field presence, nullability, list lengths, order and multiplicity before pairing all identity
positions. Build the history relation independently, keyed by native Execution and family. Verify
both directions and command targets against the relation established **before** that command.
Check name offers/labels and payload/answer associations through named transition assertions;
do not call the production ledger from the oracle.

Declare legal exits per case. A supported honest path must reach its expected steps and calls and
return every expected Observation. Unknown references and injected contradictions may throw only
at their declared step for their declared reason. Count attempted/completed cases and reached fault
sites; a truncated case is not an executed continuation. Keep the unchanged fixture's whole-result
comparison for the fifteen schedules, and explicitly account for non-identity fields in paired
honest/fault controls so an unrelated state or receipt change is not credited as identity detection.

**Closure:** demonstrate that the oracle rejects an omitted Event/list suffix, a wrong target, a
throw on a known displayed fallback, a changed previously established ID hidden by rendering, and
an answer-only contradiction left unchecked. All have passing honest controls. These are adapter
test-oracle checks; no change to the K0 fixture oracle is requested.

### D03-CHK-04 — Count and budget the search; use targeted registry witnesses

**Required; §9 R03-1 and J-5.** “At most three non-ordinary slots” is finite but is not yet an
executable size/runtime specification. The ordered skeletons, exact slot roles, number of native
IDs in each calibration scope, domain deduplication and meaning/timing of “last identity string”
are unspecified. References must also be chosen deliberately after a collision so the intended
later steps remain reachable, rather than silently firing an old wait or throwing during dispatch.

If slot i has m_i distinct non-ordinary choices, the assignment count is
`1 + sum(m_i) + sum(i<j, m_i*m_j) + sum(i<j<k, m_i*m_j*m_k)`.
For equal domain size m, this is `sum(k=0..3, C(n,k)*m^k)`. The sensitivity is substantial:

| m per slot | Nine-slot assignments | Six-slot assignments | Combined runs if the first skeleton runs honest + two faults at four fires |
|---:|---:|---:|---:|
| 10 | 87,691 | 21,561 | 810,780 |
| 20 | 686,581 | 166,121 | 6,345,350 |
| 30 | 2,300,671 | 553,681 | 21,259,720 |

These are independently computed **illustrations**, not the design's exact count or measured
runtime. The multiplier is nine only under the stated reading of “a fire for each” plus one duplicate;
D03-CHK-02 will change the legal fault set. At even an assumed 1 ms per full skeleton, the m=20
illustration takes 6,345 seconds; at 10 ms it takes 63,454 seconds. Neither is a benchmark result.
The current repository-tests check has a 900-second command limit, the existing ABL registry probes
60 seconds each, and the tool permits at most 3,600 seconds per command. A passing mathematical
finiteness claim is not evidence that this search fits those execution paths.

Specify concrete skeletons and finite generator choices, including when adaptive copies are read,
their family/scope, and how duplicates are counted. Print or assert the exact generated and completed
counts. Name where the full search runs, how it is partitioned if necessary, and its command limits.
Before claiming it fits, record a bounded calibration with environment, completed trace count and
elapsed time, and a justified total estimate. Use deterministic counts for coverage; wall time is
capacity evidence. If the proposed full search is too large, revise its declared scope explicitly
or partition it without losing assignments; do not silently sample the “every assignment” promise.
No implementation or timing result for the proposed search was produced by this design check.

The seven registry cases need not each repeat the exhaustive search. Each can have a small maintained
witness, with the full search a separate verification check:

| Mechanism edit | Discriminating witness |
|---|---|
| Fresh string not recorded | Copy a displayed fallback back as another new name; also resolve a displayed Execution/generation fallback |
| Fresh string not collision-checked | Predicted fallback occupied before the native ID is first rendered, including occupied `~2` |
| Label not recorded | Due-at-registration label followed by an input/timeout offering that label |
| Input payload bypasses ledger | Distinct request keys with one Event name; input/timeout collision in both orders |
| Separate offered-name resolver | Both the old name and the new displayed fallback are used after a generation/Execution conflict; assert native targets and successful continuation |
| Later name replaces shown name | Due-at-registration timeout followed by first explicit naming; the old label must remain |
| Rule 4 removed | Answer-only absent ID and wrong-existing-generation answer; assert the required contradiction failure |

Use the existing registry workflow: stable site/obligation/rejecting-test mapping, uniquely applicable
edit, successful unedited control, exact named kill, copied-source/package-resolution checks,
coverage/adoption entries and honest hold records. These remain mechanism witnesses with
`semantic_credit: none`. A missing expected adapter throw can be a named assertion failure; a probe
crash, syntax/import failure, timeout or unexpected throw is not a kill. Preserve ABL-1..5 and the
latest-grant witness. No exact source anchor for unbuilt code is required in this check; the build
must supply and validate it. Stop for the owner if this needs a tool change or policy waiver, as
owner choice 03 already requires.

**Closure:** a counted runnable search plan and capacity estimate, seven explicit control/kill
contracts using the existing runner, followed by actual count/timing and kill evidence at the build's
C. This is a verification-plan correction, not permission to extend packet tools.

### D03-CHK-05 — Finish the census and delimit its identity domain

**Required; §2 and R03-3.** The translated output inventory is complete against `Observation`, but
the heading “every identity string the adapter accepts or emits” overstates the tables:

- `outcome.effects[].proposalKey` and `.operation` are accepted strings, encoded whole as proposal
  content. K1 refuses the nonempty Effect envelope; neither belongs to a native-ID ledger.
- Explicitly map `outcome.emissions[].emissionId` to the Kernel's `emissionKey` and the Observation's
  `emissions[]`; expand “definition revisions” to include `recover.availableDefinitionRevisions[]`.
- `initialInput.requestKey` is accepted but not used by creation; creation uses the command's
  `requestKey`. Optional `waitGeneration` on an application-input FixtureEvent is also ignored.
  The timer path reads `timeoutEvent.eventId` only: its kind/category/correlation/subscription fields,
  and any producer/requestKey fields supplied by that union member, do not describe the minted
  timeout. Listing just destination/waitGeneration leaves this accepted-but-unused surface incomplete.
- Producer namespace and request/creation keys are untranslated **identity inputs** to Kernel calls,
  not merely content. They do not need display ledgers. Record the create producer override/fallback.
- Strings inside opaque progress/values and Kernel diagnostic reasons are not typed references.
  Scenario/version strings in preflight diagnostics identify the laboratory/run, not a Kernel entity.

State the invariant over the explicitly listed **translated native-identity positions**, with
family and Execution scope. Keep `ingressRefused` explicitly outside it as an unaccepted-command
echo, and keep Activation/receipt passthrough, numeric epochs and L-42 projections explicit. No
other translated identity output bypass was found in the bounded field-by-field source check.

**Closure:** a path-level inventory against `Command`, `FixtureEvent`, `OutcomeEnvelope`,
`Observation` and every adapter call/projection, plus J-3's new-key refusal and exact-retry controls.
Update the current header/README/017 claims as R03-3 already requires; historical design records
remain intact. No runtime semantics are inferred from an ignored field.

## Scope, validation and handoff

The changes belong to the **test-side adapter and its evidence**, not Kernel execution semantics,
Runtime work or deployment. Existing public inspection supplies the associations needed by
D03-CHK-01. No Kernel, K0 fixture scenario/runner/oracle, package dependency or packet-tool source
change is necessary. Registry data and adapter test probes are within the existing authorized
workflow. Keep D01-CHK-04 at K2.4/E2 and all L-42 projection limits.

I independently enumerated the pinned fixture's command data. `eventIdentity` occurs only in
`cited-decision-edges`, at zero-based command steps **4 and 7**; its existing first unsupported
trusted ingress is step **2**. The other refused schedules retain first unsupported steps **2**
(`control-stale-timer-and-lost-wake`) and **4** (`wait-structure-not-satisfiability`). No supported
schedule gains a capability refusal. Thus OQ-2 preserves the intended **12 PASS / 3 REFUSED** matrix
and refusal locations. This is a capability census, not a rerun asserting that unbuilt code passes.

Checks performed: pinned Git source/diff and policy identity inspection; field-by-field command and
Observation traversal; review-02 probes read as reproductions of H's defects; symbolic application
of design rules to the counterexamples above; existing registry/control/kill path inspection;
fixture-data enumeration; independent combinatorial counts. The fixture-data-only import used
local Node **v25.2.1**, below the required conformance environment; no runtime conformance credit is
claimed. Count arithmetic used Python's standard-library `math.comb`. No dependencies were installed,
no candidate implementation/prototype was built, no tests or registry entries were edited, and no
Packet verify run was requested or run. The planner's reported prototype results are not this
checker's evidence. No third-party material or dependency was incorporated.

Only this check record is added on the requested branch. The owner choices are recorded above;
there is no new unresolved owner choice. Dispose the numbered requirements in the design before
building, then bind their implementations and maintained witnesses to the next C/H for independent
cumulative review. K14C-R02-01 is not closed by a design approval, and this record grants no packet
acceptance, merge, gate completion or successor release.

APPROVED WITH REQUIRED CHANGES
