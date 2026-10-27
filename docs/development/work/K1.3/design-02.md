# Design 02 — K1.3 correction

Answers [brief 02](brief-02.md) for open findings K13-R01-S2-01, K13-R01-S4-02 and K13-R01-CLOCK-03 of
[review 01](review-01.md).
- **Base and reviewed H:** base B `22c8c1db`; reviewed H `d05af347`.
- **Owner decisions in force:** [owner choice 01](owner-choice-01.md), [owner choice 02](owner-choice-02.md) and
  [owner choice 03](owner-choice-03.md). Owner choice 03 waives a separate design check; review 02 checks this
  design.
- **Author:** the K1.3 implementer's Claude Code session (`claude-opus-5-5`), 2026-10-27.

## Mechanism

The cause both guard findings share is the one brief 02 names. The S2 and S4 guards checked a count, or the
agreement of the fields a plan supplied, where the claim needs set coverage or freshness:
- **S2:** "combined length equals the queued count, and each named entry is queued" admits `[0, 0]` over two
  queued Events.
- **S4:** "the retirement, readiness and timeout name the supplied count" admits a mutually consistent reuse of
  generation 1.

The correction states each S-guard as a predicate over the record and the plan. Each predicate is checked in the
prepare phase of every arm that can break it, so a refused plan writes nothing. Each predicate also comes with an
argument over every writer of the fields it governs. The sole-writer plan/apply layout is kept: it fixes *where*
writes happen. These predicates fix *what* a write may say.

The writers, from `state.ts` at H:

| Field family | Writers |
|---|---|
| `state` | creation, input (wake), dispatch, Outcome, expiry, cancellation |
| mailbox dispositions | Outcome (`acknowledgeAt`, `endAt`), cancellation (`endAt`) |
| mailbox entries | input, Outcome (immediate-expiry timeout), expiry |
| `registrations` | creation (0), Outcome |
| `wait` | creation (`null`), input (wake), Outcome, expiry, cancellation |
| `retiredWaits` | input (wake), Outcome, expiry, cancellation |
| `readiness` | input (wake), Outcome, expiry (set); dispatch, cancellation (clear) |
| exchange (`activation`) | dispatch (open), delivery, takeover, control (edit), Outcome, cancellation (close) |

Settlement, refusal, losing-outcome and timer-discard write none of these. They write only delivery rows,
refusals, the losing index and fire records.

## Q1 — terminal completeness (S2)

**Relation.** A terminal plan's two position lists (`acknowledgeAt` and `endAt` for an Outcome; the empty list
and `endAt` for a cancellation) must form an exact cover of the queued positions:
- every named position is a queued entry;
- no position is named twice, within a list or across the two lists;
- the number of named positions equals the number of queued entries.

The first two make the named positions a set of distinct queued positions. The third makes that set the whole
queued set. Equal length alone is insufficient, because without distinctness `[0, 0]` has the length of two
queued Events and names one.

**Enforcement.** `disposesEveryQueued` becomes `coversQueuedOnce`. It walks both lists, refuses an absent or
non-queued entry, and refuses a position already seen, using a fresh `Map` with the owner's load-time `mapGet`
and `mapSet`. It counts the accepted positions and compares that count with the queued count. It is called in the
prepare phase:
- of the Outcome arm when the next state is `COMPLETED` or `FAILED`;
- of the cancellation arm, which serves the explicit and the Execution-deadline cause alike;

before any disposition is written. Both review counterexamples are refused: cancellation `endAt: [0, 0]`, and a
complete Outcome with `acknowledgeAt: [0]` and `endAt: [0]`.

**Structural versus semantic.** Structural: a terminal decision leaves no queued Event, writes no disposition
twice, and writes none over a non-queued entry. Semantic, under L-15:
- which of the covered positions are acknowledged rather than ended (the reserved batch is acknowledged);
- for a non-terminal Outcome, which positions it acknowledges (K1.2's whole-batch rule).

The owner does not know which batch a planner chose to acknowledge beyond what the plan names. B-5's shape is the
coordinator's.

## Q2 — fresh generations (S4) and the retirement facts (S3)

**Identity.** A registration is created by an Outcome plan exactly when that plan carries a live wait or a retired
wait. An Outcome runs on a `RUNNING` Execution, which by S3 has no live wait, so any retirement it carries is the
retirement of the generation it creates. The owner therefore requires:
- `liveWait` and `retired` never both present: a registration stays live or retires at once, not both;
- `registrations = record.registrations + 1` when a registration is created, and `record.registrations` otherwise;
- the created generation equals that new count, for the live wait or the retirement;
- an Outcome retirement is caused by `event` or `deadline`, never `cancellation`.
  - Its `registeredBy` is the Outcome's own Activation.
  - Its `deadline` is its declaration's deadline.

Only creation and the Outcome arm write `registrations`. The count therefore only grows, by one per created
registration. Generations 1…n are created once each; this is K13-R01-S4-02's reuse, now refused.

**One retirement and at most one timeout per generation.**
- The Outcome arm retires only the generation it creates.
- The input, expiry and cancellation arms retire only the live generation, and clear `wait` in the same commit.
- Nothing makes a retired generation live again: only the Outcome arm installs a live wait, with a fresh
  generation.
- A timeout is minted by the Outcome arm exactly when its retirement is by `deadline`. That retirement's ending
  Event is the timeout, its deadline is the timeout's deadline, and its generation is the fresh one.
- A timeout is also minted by the expiry arm, for the live generation only, with the same agreement.

Each generation is thus retired at most once and expires at most once. Duplicate host fires stay legal: they are
timer-discard plans, which record a fire and change nothing logical.

**Retirement facts at the live slot (S3).** A plan that retires the live generation (input wake, expiry,
cancellation) must carry the live wait's own registration facts and the arm's cause:
- **The live wait's facts:** the same generation, `registeredBy`, `deadline` and `declaration` (by identity; the
  planner copies them from the live record).
- **Input wake:** retired by `event`, ending at the Event this plan accepts.
- **Expiry:** retired by `deadline`, ending at its timeout.
- **Cancellation:** retired by `cancellation`, ending at nothing.

A plan that names the live generation while rewriting what it retired is refused.

## Q3 — what each guard establishes

Every S1–S5 statement can be established at the owner as restated here. None is narrowed.

| Guard | Predicate the owner checks (prepare phase, before any write) | Writer argument |
|---|---|---|
| S1 | Every arm that writes lifecycle, mailbox, wait, readiness, exchange or progress fields refuses a terminal record: input, dispatch, delivery, Outcome, takeover, control, expiry, cancellation. Dispatch requires `READY`; an Outcome requires `RUNNING`. | Delivery, takeover and control already refused a terminal record transitively: they need an open exchange, which every terminal writer closes. They now check it directly, so S1 is local in every arm, as design 01 § 12 states it. |
| S2 | Q1's exact cover, for terminal Outcomes and cancellations. | Q1. |
| S3 | `WAITING` exactly when `wait` is present. A retirement names the live generation with its own registration facts and the arm's cause (Q2). An Outcome never carries both a live and a retired wait. | Every writer of `state` or `wait` sets them together (table above). Dispatch needs `READY`, where `wait` is `null`. |
| S4 | Q2's freshness and timeout agreement. | Q2. |
| S5 | Readiness is set only over `null`, only with a retirement in the same plan, and it belongs to that retirement: the same generation; species `event` or `deadline` matching the cause; selector equal to the retired declaration (by identity); timeout Event equal to the plan's timeout for `deadline` and `null` for `event`. Dispatch and cancellation clear it. | The input, Outcome and expiry arms are the only setters. Previously only co-presence was checked, so readiness for another generation passed. |

The following stay semantic, test-checked under L-15:
- whether an `await` is woken, expired or left live (eligibility, the clock comparison);
- which Event wakes it, and which batch a dispatch selects;
- the acknowledged positions of a non-terminal Outcome;
- acceptance positions and receipts;
- which plan an operation forms.

BASELINE "State owner" and 017 L-15 are restated to these predicates.

## Q4 — the three clock paths

Every current description names three paths, consistently:
1. **Due at registration.** An accepted `await` whose deadline is already due at the Outcome's one clock reading,
   with no eligible queued Event, expires inside that decision (W-2 step 3). It gets its timeout Event and
   deadline readiness, with no host fire.
2. **Live wait.** A wait left `WAITING` expires only when the host calls `fireTimer` for its key and the fire is
   accepted. An eligible input may wake it first.
3. **Execution deadline.** It takes effect only through an accepted host fire (owner choice 01, D01-CHK-07).
   Creation never reads the clock, and an Outcome or dispatch accepted earlier wins.

The clock stays optional: without one, a deadline is refused as `deadline_unsupported`. The host's duty to pump
`pendingTimers`/`fireTimer`, the absence of instant enforcement for paths 2 and 3, and operations' `OPEN` marker
are kept.

The places corrected are:
- BASELINE "Timers";
- 017 L-22;
- the operations binding note;
- rewrite-index's clock choice;
- the coordinator's `clock` option comment.

The source search covers `docs/development/{002,017}`, `docs/development/README.md`, `mental-model`,
`packages/kernel/src`, the guides and the SDK README, for "take(s) effect only", "fire-only", "only when the host"
and `fireTimer`. The Execution-deadline comments in `coordinator.ts` and `time.ts` already describe path 3 or both
call points correctly and stay.

## Corpus and tests

A new file, `packages/kernel/tests/owner-guards.test.ts`, holds the guard cases under the review IDs. Every plan
is injected at the `KernelState.prototype.apply` seam, as review 01's probe and `state-plans.test.ts` do. Each
refused plan must also leave inspection unchanged.

| Test | Covers |
|---|---|
| K13-R01-S2-01 | A duplicate cancellation position (explicit cause); the same through an Execution-deadline fire; a complete and a fail Outcome acknowledging and ending one position. **Positive controls:** a valid disjoint partition (one acknowledged, one ended) completes, and a valid cancellation of two queued Events. |
| K13-R01-S4-02 | Review 01's reuse of an expired generation. Reuse through a live registration. Reuse through an immediate wake. A non-incrementing count with a fresh-looking generation. **Positive controls:** successive generations 1, 2, 3 across expire, wake and live; duplicate host fires stay recorded `duplicate` answers. |
| S1, S3 and S5 audit | A delivery, takeover and control plan on a terminal record; an Outcome with both a live and a retired wait; retirements whose cause, ending Event or registration facts disagree with the live wait; readiness for another generation, species or timeout Event. |
| K13-R01-CLOCK-03 | The three paths side by side. Due at registration: expired with zero fires and no pending timer. Live wait: not expired by the clock alone, expired by the fire. Execution deadline: `READY` at creation when past, an earlier Outcome wins, the fire cancels. |

The original suites, attack probes, registry mutants and the K13-9 search are unchanged and rerun. No K13-9
alphabet or depth changes.

## Accepted design relied on

The COORD-REFACTOR-01 plan/apply owner, with its prepare/commit phases, is fit: the new predicates are
prepare-phase reads and fresh structures only. This correction adds checks inside K1.3's own new guards. It
changes no accepted behaviour:
- every plan the coordinator forms today satisfies the restated predicates;
- the full suite, the race search and the fault oracle confirm this;
- no public answer changes.

## Questions

None for the owner. Every S1–S5 claim can be enforced at the owner, so brief 02's stop condition is not reached.
