# Design 03 — K1.3 owner guards as a predicate over the next record

[Owner choice 04](owner-choice-04.md) chose option 1 of [review 02](review-02.md)'s stop-and-redesign note. This design
answers that choice's six questions.
- **Findings it closes:** K13-R01-S2-01 (at the guarantee level), K13-R02-S2-01 and K13-R02-S2-02.
- **What it keeps:** design 02's S4 freshness and three-path clock results, which review 02 passed. Owner choices
  [01](owner-choice-01.md) and [02](owner-choice-02.md) stay in force.
- **Not yet:** no code changes until the bounded design check approves this note.
- **Author and base:** the K1.3 implementer's Claude Code session (`claude-opus-5-5`), 2026-10-27, at
  `2ee779a5` (review 02 on `claude/k1.3`). The candidate it would replace is C `2454e8b7` / H `87db3c40`.

## Why the guards keep failing

Rounds 1 and 2 checked *plan fields*: their counts, their agreement, the positions they name. They then inferred a
property of the *record after commit*. Each inference left a gap that a different field filled:
- an equal count hid a repeat;
- an exact cover of old positions hid the value written there;
- a check of the old mailbox missed the entry the decision appends.

A plan has many independent fields, so another round of field checks would leave the next gap. This design states
the guarantee once, as a predicate **P** over the governed part of the record the owner is about to commit,
plus a small set of transition rules **T** over the old and next record. The owner checks both on the actual next
record before writing anything. A plan field can then influence a governed write only through that next record.
Whatever it says, either the next record satisfies P and T, or the plan is refused.

## Q1 — getting the next record without writing first

**Governed fields** are those P or T mention:

| Field | Where in `ExecutionRecord` |
|---|---|
| `state` | `record.state` |
| `registrations` | `record.registrations` |
| `wait` | `record.wait` (live wait or `null`) |
| `readiness` | `record.readiness` |
| `activation` | the `record.activation` pointer (open exchange or `null`); not the exchange's internal fields |
| `cancellation` | `record.cancellation` |
| retired waits | `record.retiredWaits` (appends only) |
| mailbox | `record.mailbox`: appended entries, and each entry's `disposition` |

The other fields are not in P or T, and their writers keep today's COORD-REFACTOR-01 discipline. These are
progress, Emissions, result, receipts, refusals, history, holds, deliveries, indices and positions.

**The successor.** In its prepare phase, every arm that writes a governed field builds one frozen `Successor`
with a single shared constructor, `successor(record, change)`:

```ts
interface Successor {
  readonly state: ExecutionState;
  readonly registrations: number;
  readonly wait: LiveWait | null;
  readonly readiness: Readiness | null;
  readonly activation: ActivationRecord | null;
  readonly cancellation: CancellationRecord | null;
  /** Appended to `retiredWaits`, or `null`. */
  readonly retired: RetiredWait | null;
  /** Disposition writes, resolved against `record.mailbox`: `{ position, entry, disposition }`. */
  readonly writes: readonly DispositionWrite[];
  /** New entries, in append order; entry `i` takes position `record.mailbox.length + i`. */
  readonly appended: readonly MailboxEntry[];
}
```

`change` names only what the decision changes. Any field it omits is copied from the record, so "not mentioned"
means "unchanged" by construction, never by convention. The constructor resolves each disposition write's position
with `readAt` and keys it as `readAt` does (the string form, as `coversQueuedOnce` does today). It refuses a
position that names no entry, or that is written twice. The successor is therefore a well-defined overlay:

> next mailbox = old entries with their written dispositions replaced, followed by the appended entries;
> every other governed field is the successor's value.

**Why an overlay, not a copied record.** P and T read only governed fields, so the governed projection of the next
record is all they need. A full copy would cost O(mailbox) on every decision. It would also break identities other
code relies on: `byInputId` maps to entry objects, and capabilities settle into the shared delivery lists. The
overlay reads the old record and never writes it, so a refused plan writes nothing.

**The commit writes only the successor.** Each such arm's commit keeps its statement order, so the fault oracle's
declared windows stay valid. Its governed statements take their values only from the successor:
- `record.state = nextState`, where the prepare phase binds `const nextState = next.state`;
- likewise for `registrations`, `wait`, `readiness`, `activation` and `cancellation`;
- `for (…) write.entry.disposition = write.disposition` over `next.writes`;
- `appendAllOwn(record.mailbox, next.appended)`;
- `if (retired !== null) appendOwn(record.retiredWaits, retired)`, with `retired` bound from `next.retired`.

A static rule makes this structural (Q4). The governed projection of the record after commit then *is* the
successor P was checked on.

## Q2 — the post-state predicate P

P is a predicate over a record's governed fields, evaluated on the successor's overlay. "Terminal" means
`COMPLETED`, `FAILED` or `CANCELLED`.

| Clause | Statement over the next record | Guard |
|---|---|---|
| **P1** | Terminal ⇒ no queued mailbox entry, old or appended; no live wait; no readiness; no open exchange. | S2 |
| **P2** | `WAITING` ⇔ a live wait. | S3 |
| **P3** | `RUNNING` ⇔ an open exchange. | S1 |
| **P4** | `CANCELLED` ⇔ a cancellation record. | S1, S2 |
| **P5** | A terminal disposition exists ⇒ the state is terminal. | S2 |
| **P6** | *Generation ledger.* The generations of `retiredWaits`, in order, followed by the live wait's generation if any, are exactly `1 … registrations`. Each wait's `deadline` equals its declaration's deadline. | S3, S4 |
| **P7** | *Timeout ledger.* The `kernel_timeout` entries correspond one-to-one with the retirements by `deadline`. Each such retirement's ending Event is its timeout entry, with that generation and deadline. No other timeout entry exists. | S4 |
| **P8** | *Retirement causes.* A `cancellation` retirement occurs only as the last retirement of a `CANCELLED` record, ending at nothing. An `event` retirement ends at a mailbox entry that is not a timeout (today always application input). A `deadline` retirement ends at its timeout (P7). | S3 |
| **P9** | *Readiness.* Readiness ⇒ `READY`, at least one retired wait, and readiness belongs to the last one: same generation; species equal to its cause (`event` or `deadline`); selector identical to its declaration; timeout Event equal to its ending Event for `deadline` and `null` for `event`. That ending entry is queued. | S5 |

Every reachable record satisfies P:
- **Creation** builds `READY` with one queued entry, count 0, and no wait, readiness, exchange or cancellation.
- **Dispatch** opens the exchange with `RUNNING` and clears readiness.
- **An Outcome** closes the exchange. It acknowledges the batch, ends the backlog at a terminal decision, and
  registers generation n+1 live or retired, appending its timeout when that registration expires at once.
- **Input** appends a queued entry, and on a wake retires the live generation with readiness on that entry.
- **Expiry** appends the timeout of the live generation and retires it.
- **Cancellation** ends every queued entry, retires the live generation by `cancellation`, and clears the wait,
  readiness and exchange.

**Evaluation is exact and incremental.** The owner evaluates each clause on the next record:
- **P1** is evaluated in full when the next state is terminal: one scan of the old entries through the overlay, then
  the appended entries. This happens once per Execution, because terminal is absorbing (T1).
- **P2–P4** cost O(1).
- **P5–P9** are evaluated over the parts the successor changes. The rest of the next record *is* the old record,
  which satisfied P when it was committed.

That last step is an induction, not an assumption about the planner:
- creation's record satisfies P;
- the owner commits only successors that satisfy P;
- so every record it holds satisfies P.

The incremental forms are:
- **P6:** with `r` the old count, the successor must be one of four forms.
  - Nothing: same wait, no retirement, count `r`.
  - Retire the live generation `g`: `retired.generation = g`, no wait, count `r`.
  - An immediate registration: no old wait, `retired.generation = r + 1 = count`, no new wait.
  - A live registration: no old wait, `wait.generation = r + 1 = count`, no retirement.
- **P7:** an appended timeout entry exists exactly when the successor retires by `deadline`, and it matches that
  retirement.
- **P8, P9:** checked on the successor's retirement and readiness. The ending entry of an `event` retirement is the
  entry this decision appends (input wake), or an existing entry. For the existing entry, the Outcome plan names its
  position (`endingAt`) as a hint. The owner verifies the hint against the record: the entry exists, has that Event
  ID, is not a timeout, and is still queued in the next mailbox.

Brief 02's evidence has one caveat: a commit that a host intrinsic interrupts midway is outside the induction
(Question D1).

## Q3 — transition rules

These relate the old record to the next and cannot be stated over one record. Each is complete because the
quantity it constrains is written only through the successor (Q1, Q4).

| Rule | Statement | Guard | Why complete |
|---|---|---|---|
| **T1** | *Never reopens.* An arm that forms a successor refuses a terminal old record. `(old.state, next.state)` must be an edge of the lifecycle: `READY→RUNNING`; `RUNNING→READY, WAITING, COMPLETED, FAILED, CANCELLED`; `WAITING→READY, CANCELLED`; `READY→CANCELLED`; or unchanged non-terminal. Delivery, takeover and control write no governed field. They keep their explicit terminal refusal, because they edit an open exchange, which P1 forbids on a terminal record anyway. | S1 | Every state write is `next.state`. Every governed write needs a successor. The settlement, refusal, losing-outcome and timer-discard arms, which do run on terminal records, write no governed field (`ARM_WRITERS`). |
| **T2** | *Dispositions move once, forward.* Each write targets an existing old entry, at a distinct position, that is queued in the old record. The value written is not `queued`. Every appended entry is `queued`. | S2 | Dispositions change only through `next.writes`, and entries are added only through `next.appended`. |
| **T3** | *Acknowledgment is the resolved exchange's whole batch.* The writes of kind `acknowledged` are exactly the positions of the old exchange's batch, each naming that exchange's Activation ID. A cancellation writes none. Every other write is a terminal disposition (P5 then restricts those to terminal decisions). | S2 (B-5) | As T2. The batch is read from the old record's open exchange, never from the plan. |
| **T4** | *A retirement keeps the registration's own facts.* Retiring the live generation copies its generation, `registeredBy`, declaration (by identity) and deadline. An Outcome's immediate retirement or live wait names the resolving Activation as `registeredBy`. | S3 | Retirements occur only as `next.retired`, and live waits only as `next.wait`. |
| **T5** | *Readiness is set only by its retirement.* A new non-null readiness requires a retirement in the same successor (P9 ties them). An existing readiness is never replaced, only kept or cleared. | S5 | Readiness is written only as `next.readiness`. |
| **T6** | *Fresh count.* `next.registrations = old.registrations + 1` exactly when the successor creates a registration (a live wait where there was none, or a retirement with no old live wait), and is unchanged otherwise. | S4 | This is P6's incremental form under the induction, kept explicit as the owner named it. Only the successor writes the count. |

Design 02's S1, S3, S4 and S5 checks, which review 02 passed, are the special cases of T1, P2/P6/T4, P6/P7/T6 and
P9/T5 above. They are subsumed, not dropped.

## Q4 — every commit passes through P

**Structural enforcement**, added to `zone-analysis.ts` and `control-commits.test.ts`:
1. **Governed set.** Every write to a governed field (assignment, `appendOwn`/`appendAllOwn` to `mailbox` or
   `retiredWaits`, a `disposition` write) must sit in the commit phase of an arm in a declared `SUCCESSOR_ARMS` list:
   creation, input, dispatch, Outcome, expiry, cancellation.
2. **Successor flow.** In each such arm, the prepare phase binds `const next = successor(record, …)` once and then
   calls `admit(record, next)`, the P and T check, which returns or throws. Each governed commit statement's value
   must resolve, through `const` bindings, to the matching `next` member. This is `commitSource` extended with a
   `next` root, beside today's `plan` root, which a governed field may no longer use. Disposition writes must
   iterate `next.writes`, and appends must take `next.appended` or `next.retired`.
3. **No other writers.** `ARM_WRITERS` lists governed fields only under `SUCCESSOR_ARMS`. The other arms already
   write none.
4. **Creation.** Creation's initial record is admitted the same way (the base case).

Given (1)–(4), for every arm: the governed projection of the committed record equals the successor, and the
successor passed P and T, so the committed record satisfies P. **A plan field cannot lie past P.** It reaches a
governed field only as an input to `successor(…)`, whose output is the thing P checks.

**Runtime witness.** A test-only export, `recordViolation(reader)`, evaluates P *in full*, not incrementally, on
an actual committed record. It runs after every accepted plan in:
- the state-plans plan witness;
- every K13-9 search step;
- the declared search below.

This catches any divergence between the overlay and the commit, and any error in the incremental forms.

**The counterexamples:**

| Counterexample | Refused by |
|---|---|
| R01-S2-01: cancellation `endAt: [0, 0]` | Successor construction (position written twice). Were duplicates merged, P1 would still find position 1 queued. |
| R01-S2-01: complete with `acknowledgeAt: [0]`, `endAt: [0]` | Construction (twice); T3 (not the whole batch); P1 |
| R02-S2-01: cancellation `ending: queued`, explicit or Execution-deadline cause | T2 (value `queued`); P1 |
| R02-S2-01: complete/fail `acknowledgment: queued` | T2; T3 (not an acknowledgment by the Activation); P1 |
| R02-S2-01: complete/fail `ending: queued` | T2; P1 |
| R02-S2-02: complete/fail on a due-at-registration `await` | P1 (appended queued timeout; readiness present in a terminal state); P9 (readiness requires `READY`) |
| R01-S4-02: second immediate expiry reusing g1 | P6 (ledger `[1, 1]` against count 1); P7 (a second timeout entry for g1); T6 |
| Review 02's position matrix (2,257 cases; any word over `[-1, -0, 0, 1, 2, NaN, Infinity, 0.5]`, every split) | An exact cover of 0 and 1 is accepted. Every other word is refused: an out-of-range, negative, fractional or `NaN` position, or a repeat (including `-0` beside `0`), by construction. A missing queued position by P1. A non-queued target by T2. |
| Review 02's generation matrix (live, wake and expiry with counts 0–4) | Only count and generation 2 is accepted. All others fail P6/T6. |
| Design 02's S1 cases: delivery, takeover or control on a terminal record | Explicit S1 refusal (T1). There is no exchange to edit (P1). |
| Design 02's S3 cases: Outcome with live and retired wait; retirement rewriting `deadline`, `declaration` or `registeredBy`; wrong cause or ending Event | P6 (a generation twice); T4; P7 (an `event`→`deadline` cause with no timeout); P8 |
| Design 02's S4 cases: deadline retirement without timeout; disagreeing timeout | P7 |
| Design 02's S5 cases: readiness with another generation, species, selector or timeout Event | P9 |

## Q5 — what stays semantic, and the resulting wording

**Semantic under L-15**, because P and T admit more than one valid next record for the same situation:
- which plan an operation forms;
- eligibility: whether an Event matches a selector;
- whether an `await` wakes, expires or stays live, and which eligible Event wakes it;
- registration order (an eligible Event before a due deadline);
- which queued entries a dispatch reserves, including the mandatory member;
- acceptance positions, receipts and ID derivation;
- refusal precedence;
- progress, Emission and result content;
- terminal reason text.

**Newly structural:** whole-batch acknowledgment (T3), which was semantic before.

**BASELINE "State owner"**, replacing the S1–S5 list:

> - **State owner.** The plan union has thirteen variants. Every arm that writes the lifecycle state, the
>   registration count, the live wait, readiness, the open-exchange pointer, the cancellation record, retired waits,
>   mailbox entries or their dispositions first builds the record it is about to commit (a successor: the old record
>   with this decision's changes overlaid), checks it, and only then writes exactly the successor's values. A refused
>   plan writes nothing. The successor must satisfy, over the whole next record including entries this decision
>   appends:
>   - a terminal state has no queued entry, live wait, readiness or open exchange;
>   - `WAITING` iff a live wait, `RUNNING` iff an open exchange, `CANCELLED` iff a cancellation record;
>   - terminal dispositions only in a terminal state;
>   - the retired and live generations are exactly 1…count;
>   - timeout entries match deadline retirements one to one;
>   - readiness only in `READY`, belonging to the last retirement, whose ending Event is queued.
>
>   Against the old record:
>   - a terminal record is never written again, and state changes follow the lifecycle;
>   - a disposition is written once, over a queued entry, never as `queued`;
>   - acknowledgments are exactly the resolved exchange's batch;
>   - a retirement keeps its wait's registration facts;
>   - readiness is set only with its retirement;
>   - the count rises by one exactly when a registration is created.
>
>   Which plan an operation forms, eligibility, whether a wait wakes, expires or stays live, which Event wakes it,
>   batch selection, positions, IDs and refusal precedence stay semantic and test-checked (L-15).

**017 L-15**, replacing its first cell:

> That each operation forms the right plan. The owner makes writes structural (one apply per decision, fixed commits
> per arm, readers that alias nothing). K1.3 adds a successor check: each lifecycle-, wait-, readiness- or
> mailbox-writing arm commits only a successor record that satisfies the post-state predicate and the transition
> rules (design 03). Plan selection, eligibility, whether a wait wakes, expires or stays live, the waking Event,
> batch selection, positions, IDs and refusal precedence stay semantic.

Its closing cell adds `[design 03](work/K1.3/design-03.md)`. **New L-28**, if the check agrees with Question D1:

> That a commit interrupted by a host-intrinsic fault leaves a record inside the post-state predicate. The incremental
> check assumes every held record satisfied it. Mitigation: the fault sweep's declared windows bound where such a
> fault can land, and `recordViolation` checks P in full in the evidence runs. Trigger: a fault outside the declared
> windows. Owner: K3, with persistence.

## Q6 — the declared bounded search for the design check

The build adds `packages/kernel/tests/owner-successor-search.test.ts`.
- **Seam.** It forms genuine plans through the public coordinator and varies them at
  `KernelState.prototype.apply`.
- **Reuse.** A refused variant leaves the inspection view unchanged (asserted), so the seed state is reused after a
  refusal and rebuilt only after an acceptance.
- **Oracle.** The verdict comes from a *reference applier* written in the test from the commit semantics above, not
  imported from `state.ts`. It builds the would-be next view from the old view and the varied plan, and evaluates an
  independent `P_ref ∧ T_ref`. Each variant must satisfy all of these:
  - the owner accepts exactly when `P_ref ∧ T_ref` holds;
  - a refusal names a clause and changes nothing;
  - an acceptance yields an actual view equal to the reference next view on governed fields, with
    `recordViolation` clean.

**Seeds** are all reached by public calls, each with a two- or three-entry mailbox.

| Seed | State |
|---|---|
| `R0` | `READY`, two queued entries |
| `R1` | `RUNNING`, batch `[e0]`, queued backlog `e1` (bound 1), with an eligible `s` entry for wake variants |
| `W` | `WAITING` on g1 with deadline 5, one queued backlog entry |
| `RE` | `READY` with Event readiness |
| `RD` | `READY` with deadline readiness and `T1` queued |
| `X` | `COMPLETED` and `CANCELLED` (terminal templates) |

**Base plans per seed:**

| Seed | Base plans |
|---|---|
| `R0` | dispatch; input; cancellation (explicit and Execution-deadline) |
| `R1` | Outcome continue, await-live, await-woken, await-expired, complete, fail; cancellation |
| `W` | input (ineligible, waking); expiry; cancellation |
| `RE`, `RD` | dispatch; input; cancellation |
| `X` | each genuine plan kind retargeted to the terminal record |

**Varied fields and values:**

| Field | Values |
|---|---|
| `acknowledgeAt`, `endAt` | Every sequence of length 0–3 over `{−1, −0, 0, 1, 2, m, NaN, 0.5, Infinity}` (`m` = mailbox length), at every split between the two lists, with the dispositions held genuine. |
| `acknowledgment`, `ending` | `{queued}`, acknowledged by the resolving Activation, acknowledged by another Activation ID, and terminal with the genuine reason, as a 4 × 4 product. Positions are held genuine. |
| `nextState` (Outcome) | All six states. |
| `registrations` | `old − 1`, `old`, `old + 1`, `old + 2`. |
| `liveWait` | `null`; genuine; generation ± 1; another declaration object. |
| `retired` / `woken` | `null`; genuine; each other cause; generation ± 1; another ending Event; another `registeredBy`. |
| `readiness` | `null`; genuine; generation + 1; species swapped; another selector; timeout Event swapped or `null`. |
| `timeout` | `null`; genuine; generation + 1; another Event ID; deadline + 1. |
| `endingAt` (new hint) | Genuine; another position; out of range. |

**Products.**
- The optional-field product (`nextState` × `liveWait` × `retired` × `readiness` × `timeout` × `registrations`) is
  6 × 4 × 6 × 6 × 5 × 4 = 17,280 variants per Outcome base.
- For input and expiry it is the matching sub-product of `woken`/`retired`, `readiness` and `timeout`.
- The position matrix (about 2,300 words per list pair) and the 16 disposition pairs × 6 states run separately, so
  the products stay additive.

The declared total is about 1.6 × 10⁵ variants. Most are refusals that reuse their seed, so the run is expected to
take under two minutes; the test prints the exact counts per seed, base and clause.

The domain is exactly this. No claim reaches plans outside it, other seeds, or values the coordinator's types cannot
carry. The review counterexamples are all inside it.

## Preserved and changed accepted design

- **COORD-REFACTOR-01's owner.**
  - Kept: one apply per decision, the prepare and commit phases, fixed commit statement order, and readers that
    alias nothing.
  - Changed: governed commit values come from the successor rather than directly from plan fields, and the
    analyser gains the `next` root and the governed set.
- **K1.3 public behaviour.** It is unchanged. Every plan the coordinator forms today yields a successor satisfying P
  and T. The suites, the K13-9 search with `recordViolation` after each step, and the fault oracle confirm this in
  the build.
- **K1.2 behaviour.** It is unchanged. T3 makes whole-batch acknowledgment structural; the coordinator already plans
  it.
- **Plan shape.** `OutcomePlan` gains `endingAt: number | null`, a position hint that the owner verifies. No other
  plan field is added. `coversQueuedOnce` and design 02's predicates are replaced by `successor`/`admit`.

## Questions for the design check

- **D1 — incremental evaluation.** P1 is evaluated in full; P5–P9 are evaluated incrementally under the induction
  that every held record satisfied P. A commit interrupted by a host-intrinsic fault (the fault sweep's declared
  windows) can leave a record outside P, after which the incremental check could accept a successor that a full
  evaluation would refuse.
  - **Proposed:** accept incremental evaluation, run full `recordViolation` in every evidence run, and record L-28.
  - **Alternative:** full evaluation on every decision, at O(mailbox + retired waits) per decision.
- **D2 — whole-batch acknowledgment.** T3 makes K1.2's whole-batch acknowledgment structural. It is cheap, and the
  coordinator already satisfies it. Confirm that moving it out of L-15 is in scope.
- **D3 — the `endingAt` hint.** P9 needs the position of an existing waking Event. The proposal is a verified plan
  hint. The alternative is a mailbox scan on immediate-wake Outcomes only.
