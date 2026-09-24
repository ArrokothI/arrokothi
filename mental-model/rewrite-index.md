# Rewrite index: open choices, inference hazards and editorial conventions

This file began as working notes for the `mental-model/` rewrite. Since that rewrite
finished, it is the maintained owner of what implementation packets use while editing
Layers 1–3: the editorial queue and house conventions (below), the open-choice
inventory and `OPEN(...)` marker convention (§4), and the dangerous-inference
reminders (§5). The [role launchers](../docs/development/009-universal-prompts.md)
point here (owner decision, PLAN-01, 2026-09-23). It does not own architecture
rules, implementation status, or roadmap acceptance. Linked owners take precedence
over any reminder here.

For normal architecture lookup, use [the reference index](reference.md). For a
learning path, use [concepts/README.md](concepts/README.md) and
[mechanisms/README.md](mechanisms/README.md). The reusable source-traversal method
lives in [the architecture skill](../.agents/skills/arrokothi-architecture/SKILL.md);
writing and rewrite checks live in
[the documentation skill](../.agents/skills/technical-documentation/SKILL.md).
Neither skill needs this entire file loaded for every task; read the sections for
the topic at hand.

Precedence: Layer 3 (`concepts/`, `mechanisms/`) owns rules; Layer 1/2 summarize them.
[The implemented baseline](../docs/development/002-implemented-kernel-baseline.md)
owns available behavior; [the ledger](../docs/development/007-work-packets.md) owns
packet status. Historical records explain their candidate at their date, not the
current contract. Draft `.rewrite.md` files do not replace their canonical pages
until reviewed and incorporated.

In the retained evidence notes below, paths in backticks are repository-relative
unless qualified by context. **MM** means `mental-model/`; **WS** means
`tests/fixtures/k0/protocol-worksheet.md` (accepted revision 12); **BASELINE** and
**LEDGER** refer to the two development documents linked above. Historical `work/`
and retired review paths, including `docs/development/004-architecture-review.md` and
`005-detail-design-review.md`, refer to original paths in the
[verified archive](../docs/development/archive.md), not the active checkout.

Several record IDs look alike. **F-n** is a finding row in
`docs/development/003-evidence-and-findings.md`, not a WS decision. `K1.1-DEC-n` is a
decision in `work/K1.1/contract.md`, while `KC1-DEC-n` and `KC1-ARCH-1` belong to
`work/K1.1-correction-01/`. WS §12's `MIG`/`LEG`/`REF`/`LIM` labels are unrelated to
the `REF-n` criteria of `K1.1-reference-01`. `concepts/` and `mechanisms/` each
contain an `actions.md` and a `state.md`, so those two names always carry their
directory; other page names are unique.

## Current editorial scope

Owner direction, 2026-09-22: keep the concept rewrite explanatory, with exact,
properly qualified claims. Reader experience matters; expansion is not a defect by
itself. Review additions for unsupported guarantees, universalized examples, and
invented rationale rather than forcing the pages back into terse reference prose.

The page queue records writing progress, not independent architecture acceptance:

| Page | Editorial position |
|---|---|
| [core](concepts/core.md) | Rewritten, as reported by the owner |
| [actions](concepts/actions.md) | Rewritten, as reported by the owner |
| [identity](concepts/identity.md) | Rewritten, as reported by the owner |
| [operations](concepts/operations.md) | Rewritten, as reported by the owner |
| [roles](concepts/roles.md) | Rewritten; the owner incorporated the audited draft in `f645146` |
| [state](concepts/state.md) | Rewritten; the owner incorporated the audited draft in `c46506c` |
| [values](concepts/values.md) | Rewritten; the owner incorporated the audited draft in `6ef8bcd` |

After the concepts are rewritten, the intended next phase is implementation, such
as K1.2, under the existing packet eligibility and review process. This plan
neither starts a packet nor makes a mechanisms-wide rewrite a prerequisite for it.

### Mechanism rewrite schedule

Owner plan, 2026-09-23, amended 2026-09-24. Each mechanism page is rewritten once, soon after the
packet that most defines its rules is accepted. It may use the concept pages' narrative voice, as the
`creation.md` rewrite does, provided its scope, preconditions, guarantees and refusals stay easy to
look up; that page closes with a summary table for the purpose. It uses the concept pages'
vocabulary and the conventions below. Before a packet first
implements a page, only a precision pass (undefined terms, ambiguities the contract depends on) is
done. The development ledger, not this table, says whether a packet has been accepted.

| When | Mechanism pages | Research proposal folded in |
|---|---|---|
| Before K1.2 starts | `creation.md` (K1.1 defined it; nothing else touches it before K4) | — |
| After K1.2 | `execution-cycle.md` | — |
| After K1.3 | `waits.md`, `lifecycle.md` | — |
| After K1.4 | `evidence.md` | — |
| Before K2.1, precision only | `authority.md`, `actions.md`, the human-input section of `communication.md` | — |
| After K2.4 | `authority.md`, `actions.md`, `external-protocols.md` | — |
| After R1.2 | `integration.md` | P4 retry owners, P7 fidelity changes |
| After K3.4 | `recovery.md`, `resources.md` | P8 compatibility counterexample |
| After K4.5 | `communication.md`, `output.md` | P6 stream gap |
| When R2 is scheduled | `composition.md`, `context.md`, `state.md` | P1–P3, P5 |

Proposal IDs refer to [the Temporal study's proposals](../docs/research/temporal-04-other-candidates.md#proposed-changes-to-mental-model-for-later-review).

The roles draft's two review questions, optional facilities versus required
boundaries and the origin of Skill packages, are answered in the incorporated page:
see its opening on why optional does not mean unconstrained, and
[Skill and package](concepts/roles.md#skill-and-package). The incorporated state page
leaves checkpoint storage and pinning open in prose, with no marker, as its §4 line
records. The values page likewise leaves the transport codec and the storage
layout/engine open in prose, with no marker.

### Final cross-page pass and house conventions

On 2026-09-23 one editor proofread Layers 1 and 2, the reference index and all seven
concept pages together, for tone, vocabulary and reading order. This was self-review
against the owners, not an independent audit. It changed no rule. It did correct four
summaries that had drifted from their owners:

- `kernel.md` said a takeover fences a stale writer before it can mutate a native
  session. `mechanisms/recovery.md` owns two separate duties there: Kernel rejection of
  stale writes, and Driver exclusion of native mutation (or refusal of the takeover).
- `kernel.md` called child creation a mediated *operation*. An operation is a defined
  term, and `concepts/actions.md#effect` says child creation points at none.
- `kernel.md` said recovery's second question is "never answered automatically". A
  Driver's phase contract can answer it; what never answers it is the Kernel alone,
  or a lapsed lease.
- `deployment.md` pointed the isolation/mediation counterexample at `actions.md`.
  Its owner is `concepts/operations.md#isolated-execution` (§5.22).

Later edits to Layers 1–3 should keep these conventions:

- **One voice across the three layers.** Plain explanatory prose in the present tense,
  with no contractions, American spelling, straight quotes and spaced em dashes. The
  layers differ in depth, not in voice.
- **Bold marks a definition site.** It also marks list lead-ins, and the terms that a
  concept page's first example introduces. Layers 1 and 2 never bold a term as a
  definition. A phrase whose meaning follows from defined words needs no entry of
  its own. Owner decision, 2026-09-23: *mediated tool* ("mediated" plus the ordinary
  word "tool") and *minimum profile* were removed as terms rather than defined. Neither
  was implemented, and neither named a distinction the existing terms lack. The
  support record already declares which native tools a Driver routes through the
  Kernel. Every *minimum profile* use meant "optional, and refused explicitly when
  unsupported", and the name wrongly suggested a kind of operating profile. They can
  come back if a real need appears. A returning *minimum profile* would be a
  feature-support level owned by S1, under a name without "profile" in it.
- **One running example.** Every page uses the weekly report and the same cast: the
  editor, the publication service, `publish_report`, the creation key `report-17`, the
  laptop and Postgres-backed production deployments, and the Workflow and Agent teams.
- **Navigation.** Each Layer-2 and concept page ends with a "Next in the reading
  order" line. Each concept page opens with a short introduction and *A first example*.
  Group headings (`##`) hold term entries (`###`) where a page has groups.
- **Vocabulary settled in this pass.** *Native* is glossed once, in `README.md`.
  *Durable* and *pin* each have two senses, stated in
  `concepts/operations.md#operating-profile-and-durability` and
  `concepts/state.md#retention-pin-and-tombstone`. The following choices apply:
  - *compliance*, never *obedience*, for what acknowledgment does not establish;
  - a Runtime *submits* an Outcome; it never *yields* one;
  - *model call*, never *LLM call*;
  - *Kernel Worker*, never *coordinator*, for a process performing Kernel transitions;
  - *accepted state*, never *accepted truth*;
  - *the in-process binding*, never *the implementation*, for the TypeScript binding;
  - *worker* is always qualified;
  - *Emission* is capitalized.

  `reference.md#common-search-terms` routes these words to their owners.
- **Left for the mechanisms pass.** Some terms are undefined or have drifted on
  mechanism pages:
  - *coordinator*, in `execution-cycle.md` and `resources.md`;
  - *accepted truth*, in `execution-cycle.md`;
  - *lab*/*laboratory*, in `evidence.md`;
  - *RuntimeStore*, in `communication.md`;
  - *execution profile*, in `composition.md`;
  - lowercase *emissions*.

  The concept pages now avoid all of these.

## 1. Concept index

[Canonical definitions](reference.md#canonical-definitions) maps each term to its
owning section. Use the [concept reading path](concepts/README.md#reading-path) when
prerequisites are unfamiliar. This working file does not maintain another set of
per-term definitions or invariant summaries.

During a rewrite, follow links from the affected definition to the mechanisms that
use it. Check the relevant open choices in §4 and known inference hazards in §5.
Consult §3 only when historical rationale or a correction needs verification.

## 2. Mechanism index

Use [Find a mechanism](reference.md#find-a-mechanism) for question-to-owner lookup
and [the mechanism reading path](mechanisms/README.md) for dependencies. Read the
owner's Status line for the contract's scope and introducing gate, and the ledger
for actual implementation/acceptance status.

Existing structures worth linking rather than copying into a rewrite:

- [Atomic decisions](mechanisms/execution-cycle.md#atomic-decisions-across-the-system).
- [How a wait ends](mechanisms/waits.md#ending-a-wait).
- [Crash windows](mechanisms/recovery.md#crash-windows).
- [Compatibility checks](mechanisms/recovery.md#compatibility-and-migration).
- [What evidence proves](mechanisms/evidence.md#what-evidence-proves).
- [Driver support record](mechanisms/integration.md#support-record).

## 3. Decision / provenance index

Where to verify a rule. Current meaning always sits in the owner column; the evidence column is
for "why does this say that", not for quoting as a rule. `MM/sources.md` is the maintained
provenance page and should be updated with, not duplicated by, this table. Where this table's
owner column disagrees with `MM/sources.md#accepted-decision-coverage`, check both against the
owner pages' own scope statements and correct whichever is wrong, in the same commit.

| Decision family | Current owner | Historical evidence |
|---|---|---|
| E-1–E-7 value model, canonical bytes, limits | `concepts/values.md` | WS §1; E-7 rule 4 (UTF-16 code-unit key order) corrected in round 3 (`work/K0.1/review-03.md`, `implementation-04.md`). WS numbers nine E-7 rules and `values.md` renumbers them, so WS rule 4 is its rule 3. E-6's exact depth, string and per-root size limits come from owner supplement K01-O12-01–03 in round 12 (`implementation-12.md`) |
| ID-1–ID-9 identities, receipts, takeover | `concepts/core.md`, `concepts/identity.md`, `mechanisms/execution-cycle.md#retry-versus-takeover` | WS §2; ID-3 corrected in round 1 (`work/K0.1/implementation-02.md`) |
| B-1–B-8, CL-1–CL-3, W-1–W-9 waits, clocks, batch | B, W and CL-3 (when the wait deadline is read): `mechanisms/waits.md`, which also keeps CL-2's timeout-versus-later-result race. CL-1 and CL-2's meaning of an expiry: `concepts/operations.md#three-clocks`, `concepts/core.md#timeout-event` | WS §3–§5; reconstruction in round 9 (`review-08.md`, `implementation-09.md`); satisfiability correction round 9/10 (`review-09.md`) |
| CX-1–CX-6 cancellation and terminal obligations | `mechanisms/lifecycle.md#cancellation-order`, `#completion-is-an-accounting-check` | WS §6; CX-6 added round 11/12 (`review-11.md`, `implementation-12.md`) |
| OA-1–OA-6 Outcome acceptance; EF-1/EF-2 K1 refusal | `mechanisms/execution-cycle.md#outcome-acceptance` | WS §7–§8 |
| EF-3/EF-4 four action dimensions | `concepts/actions.md#settlement-and-reconciliation`, `mechanisms/actions.md` | WS §8 |
| PC-1–PC-5 progress forms and compatibility | `concepts/state.md#progress`, `#checkpoint-and-locator`, `mechanisms/recovery.md` | WS §9 |
| LP-1–LP-3 local vs remote policy ordering | `mechanisms/authority.md#order-revocation-against-admission` | WS §10 |
| M-1 unsafe/state-loss controls | `mechanisms/evidence.md#attribution-and-gates`, `MM/roadmap.md` | WS §11; K0.2 `tests/fixtures/k0/public-fixture-specification.md` |
| LC-1 / MIG-LEG-REF legacy classification | BASELINE, `docs/development/kernel-ownership.md` (the live inventory) | WS §12; K1.0's original `work/K1.0/ownership-inventory.md`; nothing deleted by these packets |
| K0.2 observable distinctions; epoch not pinnable across exchanges | `concepts/identity.md#writer-epoch` | `tests/fixtures/k0/public-fixture-specification.md` §19 (`K02-R13-01`), accepted by `work/K0.2/review-17.md` |
| K0.2 five distinguishing wait examples | `mechanisms/waits.md#small-distinguishing-examples` | `tests/fixtures/k0/public-fixture-specification.md` §22 (`K02-R16-01`), `work/K0.2/review-16.md` |
| K1.0 structural boundary; inventory agreement; fail-closed reading | `mechanisms/evidence.md#structural-evidence`, `docs/development/015-structural-evidence-rules.md` | `work/K1.0/*`, `K1.0-correction-01`, `K1.0-correction-02/review-01.md` |
| K1.0-corr-02 set identity in comparison | `015-structural-evidence-rules.md` ("Comparing a set is not comparing a string"), `concepts/values.md#what-these-rules-do-not-cover` | `work/K1.0-correction-02/contract.md` |
| K1.1 creation/ingress domain separation (`KC1-DEC-1`) | `concepts/identity.md#request-key-and-input-id`, `mechanisms/creation.md#later-input-has-a-destination` | `work/K1.1/review-15.md` `K11-R15-ID-01`; `K1.1-correction-01/contract.md`; `K1.1-reference-01` REF-1 |
| K1.1 in-process value capture (C3, `KC1-DEC-3`), and its distinction from request-envelope own-field observation (`KC1-DEC-6`) | `concepts/values.md#in-process-value-capture` | `work/K1.1/contract.md` C3; `K1.1-correction-01` review-08 C3; `K1.1-reference-01` REF-2, and its review-02 row "Envelope ≠ value capture" |
| K1.1 delivery reporting (`KC1-ARCH-1`) | `mechanisms/execution-cycle.md#delivery-reporting-boundary` (+ link from `mechanisms/integration.md`) | `work/K1.1-correction-01/decision-01.md` incl. its superseding note; `review-08.md`; roadmap §K1.1-correction-01 |
| Status ownership moved off specification pages | `MM/README.md#how-these-pages-are-organized`, `#target-not-shipped` | `K1.1-reference-01` REF-3, `review-02.md` `REF1-R1-CONV-01` |
| Architecture-level decisions and their counterexamples | The Layer-3 owner of each rule, found through `MM/reference.md`; provenance in `MM/sources.md` | Retired `docs/development/004-architecture-review.md` (decisions table), refined by `005-detail-design-review.md` |
| Packet status / accepted / integrated / released | LEDGER only | `006-development-process.md#status-transitions`; `014-owner-progress-summary.md` is the readable account |

Resolve current packet status through LEDGER and available APIs through BASELINE.
This working index deliberately keeps no snapshot of either.

## 4. Explicitly undecided / implementation-owned

The rewrite must not resolve any of these by making prose sound definite. Each line names where the
non-decision is recorded.

**In-page marker convention.** Where a page has to leave one of these visibly open, it carries an
HTML comment shaped `OPEN(<who settles it>): <what is undecided>. <what to do here when it closes>.
rewrite-index.md §4`. The point is that whoever eventually settles the item can grep `OPEN(`, find
the exact prose it affects, and update these pages in the same pass — which a bare `TODO` does not
tell them. Three values, because the three closings are different work:

- **`OPEN(<gate>)`**, such as `OPEN(K2.2)` — a named roadmap gate owns the choice. When that gate
  lands, it states the rule in the prose and deletes the marker.
- **`OPEN(implementation)`** — the architecture currently leaves the choice to implementations; an
  implementation settles it for itself. A conforming implementation that makes such a choice comes
  back here and records it *as that implementation's choice*, with a pointer to where it is written
  down (usually BASELINE), leaving the marker in place. Only a later architectural decision to fix
  the representation deletes it. Removing the marker merely because one implementation chose would
  turn an implementation detail into a protocol rule — §5.3.
- **`OPEN(unassigned)`** — nobody owns it yet. The marker goes when an owner is assigned and states
  the rule here.

Two rules across all three: a comment does not render, so any openness a *reader* needs must also be
stated in the prose, and one open item gets one marker — a second marker for the same item rots
independently of the first. Every existing marker should be represented below.
Additional open questions may have no in-page marker; only entries explicitly
naming an `OPEN(...)` marker claim that one exists.

**Representations and formats**

- Transport wire codec, framing, compression, and the storage layout/engine —
  `concepts/values.md#codec`, WS §1 "Left open" and §14.
- Receipt serialization / token representation; request-key hashing — `OPEN(implementation)` in
  `concepts/identity.md#acceptance-boundary-and-receipt`; WS §2. The in-process binding's choice,
  recorded in BASELINE `#request-identity-api`: a receipt is a structured record of its boundary,
  an opaque token and the owning Execution's acceptance position, and lookup keys length-prefix
  each identity part rather than hashing it. That binding has no receipt serialization yet.
- **How a Creation request ID carries the caller's context** — as one component or two, and under
  what names — `OPEN(implementation)` in `concepts/identity.md#request-key-and-input-id`. The in-process binding uses producer
  namespace plus the selected creation authority scope; that spelling introduces no "creation request
  scope" object and fixes no wire representation. What the architecture fixes is only that the ID
  combines caller context with the creation key and covers the complete creation content. The
  implementation records its own answer in BASELINE `#request-identity-api`.
- Writer-epoch representation, and **whether it resets across a later Activation** —
  `OPEN(implementation)` in `concepts/identity.md#writer-epoch`; WS ID-4, K0.2 `K02-R13-01`. (K1.1-DEC-2 chose one epoch per
  exchange starting at 1 — an *implementation* choice, not architecture.)
- Wait generation representation; declared-input-subscription spelling — `mechanisms/waits.md#declare-what-can-wake-the-execution`,
  WS W-9/§5. WS assigns the subscription spelling to K1.3.
- Timeout Event wire kind token, discriminant, encoded schema, storage layout and timer
  mechanism — WS W-9 "Left open", which says K1.3 chooses them.
- Per-entry batch disposition storage, and how a wait-ended readiness is stored — WS §3 "Left
  open" (after B-8); `mechanisms/waits.md`.
- Cancellation-request storage, rejection encoding and physical interruption mechanics — WS §6
  "Left open"; `mechanisms/lifecycle.md#cancellation-order`. A pending/applied marker may not
  change the acceptance order.
- The Outcome-acceptance transaction mechanism (a DB transaction, an append-only log, an
  in-memory compare-and-swap) — WS §7 "Left open", which accepts any of them only if the atomicity
  is real; `mechanisms/execution-cycle.md#atomic-decisions-across-the-system`.
- Checkpoint storage and pinning — WS §9 "Left open"; `concepts/state.md#checkpoint-and-locator`,
  `mechanisms/recovery.md#checkpoint-publication`. Upload tickets plus a grace period are one
  option, not a requirement, as `recovery.md` states.
- Which progress forms a given Driver needs — the same WS §9 note, which scopes it to K1-era
  fake/compatibility Drivers and says K1 itself needs only inline form (a). `concepts/state.md#progress`
  and the Progress row of `mechanisms/integration.md#support-record` make it a per-Driver declaration.
- Clock units, precision, instant source, and whether lease expiry uses heartbeat renewal or a
  fixed TTL — `OPEN(implementation)` in `concepts/operations.md#three-clocks`; WS §4 "Left open".
- Batch maximum (only "finite, ≥ 1" is fixed) — `concepts/core.md#batch-reservation-and-acknowledgment`.
- **The exact form a Definition and its pinned revision take** — one `OPEN(unassigned)` covering both,
  in `concepts/core.md#definition`.
- **A defining section for trusted ingress provenance** — `OPEN(unassigned)` in `concepts/core.md#event`.
- API spelling generally: `concepts/identity.md` states its names are conceptual and do not freeze
  API or wire spelling.

**Unassigned or deferred ownership**

- **Driver-to-Execution cardinality.** No `mental-model/` page fixes how many Executions one Driver
  serves; `concepts/core.md#execution-driver` carries an `OPEN(unassigned)` marker for it. `MM/kernel.md` "What it owns" lists no Driver among an Execution's accepted records — what is
  pinned is the Runtime contract revision — and `integration.md#support-record` makes the
  Execution/Activation ↔ native run/session mapping a per-Driver declaration. K1.1's coordinator takes a
  single `driver` in `CoordinatorOptions`, which is an implementation choice of the in-memory profile,
  not a protocol rule.
- Whether an **action dispatcher** is its own concept — `OPEN(unassigned)` in
  `concepts/actions.md#admission-and-physical-action-attempt`.
- Validator and enforced schema subset for operations — `OPEN(K2.2)` in
  `concepts/actions.md#operation`, **K2.2 selects it**.
- Concrete policy/consent representation, grant language, remote policy backend, actual remote
  freshness — K2 (`mechanisms/authority.md` preamble; K0/K1 promise none).
- Driver-specific phase recovery guarantees — R1 (`mechanisms/recovery.md`, `integration.md`).
- Persistent substrate selection (Temporal/Restate are *references, not selected dependencies*) —
  K3 (`MM/deployment.md#check-what-a-durable-substrate-retries-on-its-own`).
- Isolation backend — D1. Supported versions and tested protocol subsets — S1.
- Multi-approver policy; `reply_and_ask`; arbitrary detachment; richer joins; context IR — optional
  and refused explicitly when unsupported (`mechanisms/authority.md`, `communication.md`,
  `composition.md`, `concepts/operations.md#child-and-ownership`).
- Whether **richer supervision, or detached and supervisory services, are needed at all** —
  `docs/future-plan.md` Q3, unanswered; WS §14 records it as "not answered here" and puts
  child/message/human-response durability outside K0.1 entirely. Q3's trigger is a K4 example
  exposing a missing pattern, not a decision already taken. Owner-decided 2026-09-21 to carry **no
  in-page marker** for this: the minimum the pages describe — authored failure policy, required
  owned children, arbitrary detachment refusable — is the current answer stated in ordinary prose at
  `concepts/operations.md#child-and-ownership`, not a placeholder awaiting one. The standing
  constraint stays: prose must not imply that a supervision framework or a general detachment
  facility already exists to be implemented.

**Deliberately not invented**

- No universal artifact service, memory ontology, Skill schema/registry/signing, policy backend,
  claim graph, capability hierarchy, or native checkpoint migration — `MM/sources.md#intentionally-unselected-choices`.
- No exactly-once external action, no cross-shard atomicity, no automatic native migration,
  no multi-region failover, no mutually-distrusting-tenant safety —
  `mechanisms/execution-cycle.md#atomic-decisions-across-the-system`, `MM/deployment.md`.
- No general deadlock/satisfiability guarantee for waits — WS W-1; `mechanisms/waits.md`.
- Longer-horizon questions are held in `docs/future-plan.md` Q1–Q13 and
  `docs/development/003-evidence-and-findings.md` "Later horizons and deliberate retirements" — not
  in `mental-model/`.

Implementation gaps belong in BASELINE and the active packet records. Recheck them
there when a rewrite discusses available behavior; do not carry a copied gap list
forward here.

## 5. Dangerous inference index

Editorial diagnostics retained from earlier review. These are non-authoritative
reminders: open the named current owner before relying on a rule. Historical
examples explain why a check was added and do not establish current build status.

1. **Takeover mints a new Activation ID.** It does not: same Activation ID, same pinned input,
   advanced writer epoch. Owner: `execution-cycle.md#retry-versus-takeover`. Evidence: WS ID-3/ID-9,
   corrected in K0.1 round 1. The three-row table exists because retry, takeover and a new exchange
   look identical from outside.
2. **The writer epoch protects progress.** It fences the *entire* Outcome acceptance — batch
   acknowledgment, progress, emissions, Effect intents, wait/deadline, readiness, next state.
   Owner: `identity.md#writer-epoch`.
3. **Pinning a representation the protocol left open.** Comparing `writerEpoch` literally across new
   Activation IDs made *no* conforming implementation passable. Evidence: K0.2 `K02-R13-01`. General
   form: an example or fixture accidentally becomes normative.
4. **Atomicity implies durability.** Accepting atomically guarantees a coherent accepted state *if
   the storage profile preserves it*; atomicity by itself stores nothing, and crash survival belongs
   to a persistent deployment. Owners: `MM/kernel.md` "Why acceptance matters", `MM/README.md`
   "What this arrangement guarantees", `MM/deployment.md`. Evidence: `work/K1.1/review-16.md`
   `K11-R16-DOC-01`. **Repaired in this rewrite project:** `MM/kernel.md` previously read "there is
   always a well-defined, durable state to reconstruct after a crash" with no storage condition,
   while `MM/README.md` already conditioned the same claim correctly; the Layer-2 sentence now names
   the deployment's storage as what decides survival. Watch for the same slip in any page that
   motivates atomic acceptance.
5. **`RUNNING` means healthy / `WAITING` means a Runtime is blocked.** `RUNNING` means an Activation
   is unresolved, including recovery-held. `WAITING` exists only for an accepted Runtime-declared
   Kernel-visible dependency; a Runtime awaiting its own model call stays `RUNNING`. Owners:
   `MM/kernel.md`, `lifecycle.md`, `concepts/state.md#recovery-and-re-execution`.
6. **An object and its revision are the same thing.** There is no global "the revision"; seven
   revision kinds have different creators and change points. Progress revision 4 with epoch 2 says
   nothing about an accepted revision 5. Owner: `identity.md#revision`.
7. **Acknowledgment means obedience.** Accepted Outcome acknowledges the whole batch; whether the
   Runtime did what an Event asked lives only in its own progress, and the Kernel never infers it
   from output text. Owners: `core.md#batch-reservation-and-acknowledgment`, `MM/runtime.md`,
   `waits.md#accounting-and-limits`.
8. **A kind string decides eligibility.** Source category comes from the trusted ingress path.
   A dependency alternative naming an application-input kind is structurally valid and **inert**.
   Owner: `waits.md#eligibility-comes-from-trusted-source-category`; WS W-1/W-7.
9. **Structurally valid means capable of waking.** K0.1 promises structure, never satisfiability; a
   well-formed wait may never be woken. Evidence: `work/K0.1/review-09.md`.
10. **A timeout proves the external work failed.** It proves one wait generation expired. Owner:
    `core.md#timeout-event`; WS CL-2.
11. **Spare batch capacity promotes ineligible backlog.** It never does, at any bound. One bound-1
    example cannot prove mandatory retention, earliest-member selection, candidate exclusion, late
    eligibility and presentation order — five separate examples exist for that reason. Evidence:
    K0.2 `K02-R16-01`.
12. **A correction message retracts an action.** Ordinary input is not withdrawal, not consent
    invalidation, and may not be read for another second. Owners:
    `concepts/actions.md#withdrawal-and-compensation`, `authority.md#order-revocation-against-admission`;
    WS LP-3, F22.
13. **Absence of a receipt is proof of failure.** Absent evidence is *unknown*; unknown is a
    disposition. Owners: `mechanisms/actions.md#admission-and-sending`, `#settlement-and-refinement`;
    WS EF-3/EF-4, F21.
14. **A Kernel idempotency key prevents double external execution.** Do not infer external exactly-once execution or a ban on
    physical redelivery from Kernel deduplication. Check the owner's conditions for
    retry and provider-side idempotency. Owner: `mechanisms/actions.md#retrying-an-action`.
15. **Inferring API parameters from an atomic semantic binding.** Creation binding Execution ID,
    Runtime contract, Definition revision, authority context and initial input in one accepted
    decision fixes *atomicity*, not a signature, a field list or a wire shape. Owners:
    `creation.md#one-atomic-creation` for the binding; `concepts/identity.md`'s opening (names never
    fix API, wire or storage spelling) and `#acceptance-boundary-and-receipt` (a boundary is a
    consistency requirement, not machinery) for the non-inference.
16. **Creation request ID and Input ID are one domain.** They are separate; the initial Event keeps creation
    provenance and a creation receipt, and later ingress with the same key text is a new request.
    Evidence: `K11-R15-ID-01`.
17. **Logical responsibility implies physical deployment.** The Layer-1 diagram describes
    responsibilities, not machines; one process may host Kernel, Driver and Runtime. Moving a box to
    another process does not make its state durable or its actions safe to retry. Owners:
    `MM/README.md#logical-pieces-and-physical-deployment`, `MM/deployment.md`.
18. **Carrying an identifier implies resolving or executing it.** The Kernel records a Definition
    revision but does not interpret the code; a cursor is a position, not authority; a correlation ID
    is not permission to reply or settle; a handle or trace ID is not a bearer permission. Owners:
    `core.md#definition`, `operations.md#observation-cursor-and-routing`, `#message-request-and-correlation`,
    `external-protocols.md#import-and-export`.
19. **Single-writer acceptance is concurrency control.** It fences which attempt may write accepted
    progress — not which branch writes a file, not another Execution's shared-state writes, not a
    native session. Owners: `resources.md#shared-mutation`, `composition.md#forks-joins-and-corrections`,
    `mechanisms/state.md#state-service-contract`.
20. **Treating Runtime internals as Kernel concepts.** Model loops, graph nodes, compaction, native
    memory, provider checkpoints, local branches and local controls stay behind the Driver unless
    Kernel correctness depends on the contract. Owners: `MM/runtime.md`; WS W-4/W-5.
21. **A provider example is a portable contract.** A second independently designed Runtime is
    required before an integration-specific extension becomes portable. Owner: `MM/driver.md`,
    `integration.md#evidence-before-support`.
22. **Isolation and mediation substitute for each other.** A well-isolated Execution can still make
    an unmediated native call; a well-mediated one may have no isolation. Telemetry is neither.
    Owner of the independence itself: `concepts/operations.md#isolated-execution`, which
    `concepts/actions.md#exposure-and-mediation` names as the owner. Related:
    `concepts/actions.md#exposure-and-mediation` (exposure is not permission, mediation is a path),
    `resources.md#containment-claims` (what evidence an isolation claim needs),
    `MM/deployment.md#trust-and-containment` (the Layer-2 summary).
    Check for duplicated full counterexamples at the linked sections. A local
    reminder can help understanding; a second maintained derivation can drift.
23. **Exposure or discovery is permission.** Showing a model that an operation exists authorizes
    nothing; a Skill manifest's requests are not grants; retrieved text, notes and inferred memory
    are never authority. Owners: `concepts/actions.md#exposure-and-mediation`, `authority.md#content-is-not-authority`,
    `roles.md#skill-and-package`.
24. **Release deletes the resource; a lost handle is a failed allocation.** Release closes a client;
    destroy is a separate operation; allocation may have succeeded with its handle lost. Owners:
    `concepts/state.md#resource-binding-and-attachment`, `resources.md#resource-operations`.
25. **A session ID is a checkpoint.** Only if its contents cannot advance independently of accepted
    progress. Nor is a locator that still finds the session enough to recover through: reattachment
    also needs the Driver's exclusive-ownership or reconciliation declaration, and without one,
    automatic takeover over a locator is refused. Owners: `concepts/state.md#checkpoint-and-locator`,
    `#recovery-and-re-execution`; WS PC-3. Evidence: the `8df1963` state draft's reattachment row
    dropped the declaration; restored before the `c46506c` pin.
26. **Target specification is implementation status.** Every Layer-3 mechanism page names a gate; a
    gate is a contract, not a ship date. Status lives only in LEDGER and BASELINE, and **accepted,
    integrated and released are three different facts**. Owners: `MM/README.md#target-not-shipped`,
    `006-development-process.md#status-transitions`.
27. **Moving code is migrating it.** A new directory or package name decides where future work
    lands and changes nothing about behavior; a structural pass earns no gate credit. Owner:
    `evidence.md#structural-evidence`.
28. **Absence of a decision permits the obvious implementation.** Every item in §4 is an unmade
    decision with a named future owner; prose that quietly picks one converts an open choice into a
    contract. `MM/sources.md` states the rule: if a conflict cannot be resolved by precedence,
    record the rule as unresolved rather than choosing the wording that is easier to implement.
29. **A benchmark or fixture result credits the layer that ran it.** Kernel, Agent Runtime, Workflow
    Runtime, Driver, application, isolation, laboratory, provider and evaluator are separate failure
    domains; a laboratory denial protects the world, not the subject. Owners:
    `evidence.md#attribution-and-gates`, `AGENTS.md` "Benchmark attribution".
30. **A rendered string stands in for a structure.** Comparing a set by its joined text, or a cell
    by its formatting, reports agreement between things that disagree; a check that cannot read part
    of its input must fail, not skip. Owners: `015-structural-evidence-rules.md`,
    `evidence.md#structural-evidence`, `values.md#what-these-rules-do-not-cover`.
31. **A checkpoint only has to exist by the time its reference is accepted.** It must exist before
    the Outcome that names it is *proposed*: the native store and the Kernel's store share no
    transaction. Acceptance pins it and rejection pins nothing, and it may not be collected while
    acceptance is pending. Owners: `concepts/state.md#checkpoint-and-locator`,
    `recovery.md#checkpoint-publication`; WS PC-2. Evidence: the `8df1963` state draft said
    "accepted"; corrected before the `c46506c` pin.

## 6. Possible later reference split (proposal)

The owner wants `mental-model/` to serve understanding and potentially supply
material for public articles. A useful later arrangement would be:

| Location | Reader need | Ownership if the proposal is adopted |
|---|---|---|
| `mental-model/` | Understand concepts, relationships, examples, and rationale | Explanatory summaries of linked contracts |
| `docs/reference/architecture/` | Look up exact vocabulary, obligations, transitions, and limits | Canonical target contracts, independent of API spelling |
| `docs/reference/api/` | Use a specific implemented package/version | Exact signatures and documented API behavior |
| Existing `docs/guides/` | Learn by doing, complete tasks, diagnose problems | Procedures backed by available implementation |

These reference directories are proposed, not established owners. Current Layer-3
ownership remains unchanged. Do not create a second normative specification by
copying concise versions of the pages into a new directory.

If adopted later, pilot one subject: extract its exact contract, keep the
explanation linked to that contract, and verify that no condition or exception was
lost. Transfer ownership explicitly, updating `AGENTS.md`, skills, the reference
index, affected architecture navigation, and inbound links together. Existing
concept links should still lead to useful explanation rather than becoming alias
stubs. No whole-tree relocation is required to test the approach.

Use a consistent contract entry where it helps: definition and owner, scope,
preconditions, guaranteed behavior, exceptions/refusal behavior, and related
mechanisms. Put algorithms or limits in dedicated tables/lists rather than forcing
every concept into every field. Concise means efficient lookup, not an abridgment
that drops obligations. API entries additionally need actual signatures, defaults,
returns, errors, and version context; they cannot be generated from target prose.

Public articles should identify the design/version they describe and link to the
maintained documentation. They can tell a story without becoming another current
specification. This publication direction is not authorization to publish now.
