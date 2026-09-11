# Implementation report — K0.1, round 9 (consolidation correction)

## Identity and status

- Packet / parent milestone: **K0.1** / **K0**; [contract.md](contract.md) (corrected this round);
  worksheet [protocol-worksheet.md](protocol-worksheet.md) **Revision 9**.
- State: **WAITING_FOR_REVIEW**
- Correcting: [review-08.md](review-08.md)'s CHANGES REQUIRED outcome, findings **K01-R8-01 (P1)**,
  **K01-R8-02 (P1)**, **K01-R8-03 (P2)** and **K01-R8-04 (P2)**, against reviewed candidate H8
  `6290e68fb0231a6a8b4e6956d9a44afe7ac051ab` (payload C8 `40feb095d8e0f964bce854facd90f51d23633380`,
  base `6464be1`).
- Base commit (unchanged since round 1): `6464be12c11eb75f7dfbc5ece12ca8d3020a5c15`
- Reviewed candidates, all preserved and none rewritten: H `857fa05a8a72a4c6f4f294f9e775a0dc1f7919dc`,
  H2 `cc61e74455534abf896c46632246615185219b92`, H3 `aef1e33ba944a0647bb2319fb97ae40b18b05924`,
  H4 `a068e2f6c8d67e5e3e2512c765b29427acb4ac68`, H5 `d0dbc4800c10dad68a8b4b6c662bf90c963fd926`,
  H6 `c5bdd481134cf3691050b16dd6dd3a49aa9ab042`, H7 `6bdc53ad10d50e0e41bccf57bab212d406b7a2ce`,
  H8 `6290e68fb0231a6a8b4e6956d9a44afe7ac051ab`.
- Round-9 review record commit (adds [review-08.md](review-08.md); ledger → CHANGES_REQUESTED):
  `6ac959fef2883ae6bb14427c0f1a92cc54d43a65`
- **Correction payload C9: `1b2ef1bd83681f302637ffd27c9630575289d37b`**
- Candidate H9: the commit containing this report and the ledger status edit, and **nothing else**;
  full SHA supplied in the handoff (per 006, H cannot name itself).
- Branch / remote: `codex/k0.1-protocol-legacy-disposition` / `origin`
  (`https://github.com/ArrokothI/Agent_SDK.git`; GitHub reports it moved to
  `https://github.com/ArrokothI/agent-kernel.git` — the configured URL is deliberately left unchanged).
- Working tree: verified clean at C9 **before** validation ran; nothing was written into the repository
  afterwards. Round 9 adds **no** evidence file, directory or script.
- History: every prior commit, report, review and evidence artifact is preserved unedited — verified
  file by file in `09-history-preserved` below (sixteen checks), including `implementation-04.md` and
  every other historical report byte-for-byte. No reviewed commit was amended, rebased or force-pushed.

**Blob identities confirmed before editing.** [review-08.md](review-08.md) pins the four artifacts it
inspected by blob SHA at H8. All four were checked against H8's tree before this correction began and
all four match: `contract.md` `a18343820301f181740492a3ee65b44db317237f`, `protocol-worksheet.md`
`75e5c6378bd569c3bce14a5c38b5a3a1ae6da33a`, `review-07.md`
`851efc09d42d8d02e314cd815599efb204681033`, `implementation-08.md`
`0cd56a0608157199572e53354635ee615acafa3d`.

## Round-9 commit sequence

| Step | Commit | Contents |
|---|---|---|
| Administrative review record | `6ac959fef2883ae6bb14427c0f1a92cc54d43a65` | `review-08.md` + the 007 K0.1 status row → `CHANGES_REQUESTED`. No payload. |
| Payload **C9** | `1b2ef1bd83681f302637ffd27c9630575289d37b` | `contract.md` + `protocol-worksheet.md` only. |
| Final validation | — | Run against the clean C9 tree, after C9 existed. |
| Candidate **H9** | the commit containing this report | `implementation-09.md` + the 007 K0.1 status row → `WAITING_FOR_REVIEW`. Nothing else. |

## Why this round is a consolidation rather than four patches

Rounds 5–8 each found a defect created by an earlier **correct** correction that some neighbouring rule
still contradicted: round 5's B-2 lost round 4's wake guarantee; round 6's `B-6` named one acceptance
boundary for two paths; round 7's `B-6` left deadline expiry with no batch semantics; and round 8's B-2
still carried round 6's superseded eligibility wording after round 7 replaced it. That is a
**document-shape** failure, not four unrelated slips — the same rule was written out in two or three
voices, so correcting one voice left the others live and reachable.

Round 9 therefore reconstructed the wait / batch / clock protocol as **one state machine** before
editing anything, answered each of the 30 required scenarios from it, checked each answer against the
canonical owners, and only then rewrote §3 and §5 so that every rule is stated **once** and cited
everywhere else. The diff is large by design; diff size is not the success metric, and no acceptance
criterion was weakened to accommodate the rewrite. The reconstruction found **eleven** internal defects
beyond the four review findings; all eleven are fixed in this same revision and are labelled
implementer-discovered rather than attributed to [review-08.md](review-08.md).

No canonical conflict required an owner decision, so **no part of this packet is BLOCKED_ARCHITECTURE**.
Two candidate conflicts were examined explicitly and resolved without amending a canonical owner, in
`K01-R8-03` and `K01-R8-04` below.

## Findings — individual disposition

### K01-R8-01 (P1) — B-2 still carried the superseded eligibility rule — **Fixed**

**The exact defect.** Round 7 rewrote W-1's eligibility rule as a source-category rule, but B-2's third
bullet still read: an Event is eligible while `WAITING` iff it "matches at least one **dependency
alternative** of the currently registered wait, **or** it is application input matching at least one
**declared input subscription**" (H8 worksheet, §3). That is the two-independent-sufficient-conditions
form W-1 had just replaced, and it is the form that lets a dependency alternative spelled
`kind = external.input` wake ordinary application input with no subscription at all — contradicting
kernel.md's "application-input waits require a declared subscription". Two sections of one document
answered W-7 case 6 in opposite ways, and the wrong answer was in the section a K1.1 implementer reads
for **batch selection**.

**The exact final rule.** §3 states **no** eligibility rule of its own. B-2 now has two selection cases —
ordinary readiness and wait-ended readiness — plus the statement that a `WAITING` Execution is not
dispatched and therefore selects nothing; eligibility while `WAITING` is W-1's rule, cited. A new note,
*Where execution-protocol.md's `WAITING`-side sentence lands*, records why the canonical sentence is
phrased from the `WAITING` side and how the wait-ended case carries its guarantee across W-1's
retire-on-wake rule, so nothing canonical is dropped along with the paraphrase.

**Worksheet location.** §3 B-2 and the note following it; §13 first round-8 entry; revision history.

**Deterministic counterexample.** W-7 case 6: wait `W′` has dependency alternative `D3`
(`kind = external.input`, no correlation) and an **empty** subscription list. Ordinary application
input arrives. `D3` matches it on kind. Required result: **not eligible** — no wake, not acknowledged,
stays queued (B-4). Under H8's B-2 the answer was "eligible", under H8's W-1 it was "not eligible".
Under revision 9 only W-1 answers, so there is one answer.

**Why the corrected rule prevents it.** The bypass needs *a second place that states the rule*. Removing
the restatement removes the failure mode, not just this instance of it; every §3 reference to
eligibility is now a citation.

### K01-R8-02 (P1) — the timeout observation had no coherent semantic home — **Fixed**

**The exact defect.** Three H8 statements had no common model. `B-1`: an Activation batch is a set of
**Event** references. `B-7`: the timeout observation is a **mandatory member** of that batch. W-9's
*Left open*: whether it is "an Event of a dedicated kind in the mailbox, a distinct field on the
Activation's accepted-input contract, or another representation" is K1.3's choice. If it is not an
Event, `B-1` has no room for it.

**A second, sharper form of the same defect, found by this round's reconstruction and not named by the
review.** H8's B-2 selected the wait-ended batch "**only** from Events eligible under that **retired**
wait's rule," and H8's W-1 listed "the current-generation timeout observation (W-9)" among the Events
that require a **dependency alternative**. For W-8's subscription-only wait `W₀` — whose dependency
list is legitimately empty — the mandatory member was therefore, by the same document, **ineligible**.

**The exact final rule.**

- **W-9: a wait-timeout observation is a Kernel Event.** It carries at least a stable Event identity, a
  destination, a **semantic timeout class**, **exact wait-generation correlation**, and **trusted
  Kernel timer/deadline provenance**. **Exactly one** exists per wait generation, and a re-delivered or
  replayed timer for an already-accepted expiry creates **no second timeout Event, no second readiness
  transition and no second logical timeout**.
- **Minimum concept, not a new one (K0.1-C4).** The alternative — a batch of "Events **or** timeout
  facts" — would add a second batch-member type and duplicate B-3's acknowledgment, B-4's retention and
  B-5's terminal disposition behind it. execution-protocol.md already reads the chosen way: "order
  their acceptance and let the Runtime interpret **the eligible batch**."
- **W-1's category table has three rows**, and the timeout Event sits outside the matching rules
  entirely: never eligible through a dependency alternative or a subscription, and an alternative
  naming a timeout kind is **inert**, exactly as one naming an application-input kind is.
- **§3's wait-ended batch is a union**, `{mandatory member} ∪ {Events eligible under the retired rule}`,
  not a filter result — which is what makes `W₀`+deadline answerable.
- **W-9 names the accepting boundary** as the same **boundary role** `B-6` path B already used, so no
  seventh boundary is added to §2 ID-6/ID-7 and no external receipt is issued.
- **Left open:** only the wire kind token, the TypeScript discriminant, the encoded schema, the storage
  layout and the timer mechanism.

**Worksheet location.** §5 W-9 (rewritten) with new cases 4–6; §5 W-1 category table; §3 `B-1`, `B-3`,
*The wait-ended batch*, `B-7`; §4's wait-clock row; §5 W-8 case 6; §12 `MIG-5`; §11 row 5(b)/(e); §13
second round-8 entry.

**Deterministic counterexamples.** (1) W-8 case 6: `W₀` (dependency list empty, subscriptions
`{continue}`) plus a deadline, bound **1**, `billing.question` queued. The timeout Event takes the slot;
`billing.question` stays queued. (2) W-9 case 3 at bound 1: timeout then correlated result before
reservation — timeout takes the slot, the result stays durable and unacknowledged, neither fact
rewritten. (3) W-9 case 6: the timer fires twice for one generation — no second Event, readiness or
Activation.

**Why the corrected rule prevents it.** The mandatory member is now the same kind of thing as every
other batch member, and its presence in the batch is a **union term** rather than the output of a
selector that a subscription-only wait cannot supply.

### K01-R8-03 (P2) — the current rule was conditional on a future K1.3 choice — **Fixed**

**The exact defect.** H8's W-1 stated the source-category rule exactly and then added a *Scope note*
leaving open whether a declared subscription may "additionally name a non-input class... left to K1.3."
The supposedly exact current rule was contingent on a decision nobody had made.

**The exact final rule.** The K0/K1 mapping is **closed and unconditional**: application input →
declared subscription; every other ordinary Kernel Event → dependency alternative; timeout Event →
neither.

**This overrides no canonical owner, and it was checked rather than assumed.** kernel.md's "An explicit
input subscription can allow corrections/peer questions while waiting" is satisfied as written, because
the two classes it names arrive in different categories: a **correction** is ordinary application input
(subscription, W-7 case 4), and a **peer question** is a `peer.message` — a non-application Kernel
Event — named by a dependency alternative on its kind and/or the asking correlation. Both can wake a
waiting Execution today, which is the capability the canonical sentence asserts; no capability is lost
by closing the rule. composition-and-communication.md's richer "A parent waiting for B can explicitly
subscribe to addressed clarification input from B" sits on a page whose own status line reads **target
K4**; if K4 wants that, W-1 now names it as a **versioned extension of the interaction contract** under
recovery-and-compatibility.md's *Protocol/codec* dimension, with an explicit revision and a refusal
path. Such an extension could only ever add a second path for a **non-application** category; it can
never give ordinary application input a second path, because kernel.md forbids that outright.

**Worksheet location.** §5 W-1, *This rule is closed for K0/K1; no part of it is conditional on a later
packet*; §13 third round-8 entry.

**Deterministic counterexample.** W-7 cases 6 and 7 are unchanged in outcome and are now unconditional:
no future packet's decision can change them, because any extension is a new protocol revision rather
than a reinterpretation of this one.

### K01-R8-04 (P2) — already-expired deadline at wait registration left undecided — **Fixed**

**The exact defect.** H8 had no answer for "a wait registered with a deadline that has already passed."
[implementation-08.md](implementation-08.md)'s *Reviewer focus* names the gap and records "two
defensible answers," which is exactly what K0.1-C2/C6 forbid this document to do about semantics it
owns.

**The exact final rule — W-2, one ordered algorithm inside one transaction.** The four steps are ordered
**evaluation**, not four commits; nothing between them is observable and nothing partially commits
(OA-4/OA-5).

1. **Acknowledge this Outcome's own reserved batch first** (B-3), so those Events are not candidates in
   step 2 — a wait can never be woken by the batch the Outcome registering it just accounted for.
2. **Create the registration and generation, then check the mailbox.** If an already-accepted,
   still-unacknowledged Event is eligible under the new wait's rule: retire it, `READY`,
   **Event-triggered** readiness (`B-6` path A). **No timeout Event is created.** Stop.
3. **Otherwise evaluate the deadline** against **one** accepted-time observation; **due** iff that
   observation is at or after the deadline instant (non-strict). If due: retire the generation, create
   **exactly one** timeout Event, `READY`, **deadline-triggered** readiness (`B-7` path A). **Durable
   `WAITING` is never persisted for that generation.** Stop.
4. **Otherwise persist `WAITING`.** Later expiry follows `B-7` path B.

**Why the refused alternative is refused.** "Persist `WAITING` and let the timer fire immediately"
reaches the same eventual state but makes the observable next state depend on timer latency: a K1
fixture registering an already-past deadline could observe `WAITING` for an unbounded interval and could
not assert an exact outcome, and an implementation whose timer scans periodically would be conforming
while visibly sitting past its own deadline.

**This does not contradict execution-protocol.md.** Its "If one is already present, next state is READY;
otherwise it is WAITING" resolves the *Event-presence* branch, which is step 2; the deadline is a
separate identity (CL-1) evaluated at the same boundary; and kernel.md's lifecycle line already admits
an `await` accepted as `READY` ("RUNNING + accepted await → WAITING (or READY if already satisfied)").
The invariant both are instances of is stated once: **a wait that cannot be live at the moment of its
own registration is never persisted as live.**

**Worksheet location.** §5 W-2 (rewritten) and its *Why this order* / *One clock reading* notes; §4
new **CL-3**; §3 table rows 1 and 3; §5 W-9 case 5; §7 OA-4's cross-reference; §11 row 5(c); §13 fourth
round-8 entry.

**Deterministic counterexamples.** W-9 case 5, both halves: an already-past deadline with no eligible
Event yields one timeout Event, `READY`, and no durable `WAITING`; change one fact — an eligible Event
*was* already accepted — and step 2 wins, with **no** timeout Event created. W-9 case 4 is the
asynchronous mirror: a result accepted before the deadline retires the generation, so the later timer is
a no-op and no timeout Event ever exists for it.

**No "two defensible answers" language about K0.1-owned semantics remains anywhere in the worksheet or
in this report.**

## Holistic semantic reconstruction

The reconstruction answers every scenario from four accepted facts — the mailbox (per-entry
disposition), the wait registration (generation, two lists, optional deadline), the wait-ended readiness
(the retired selector plus, for `B-7`, the mandatory timeout Event), and the reserved batch — and two
invariants:

- **A wait generation is live exactly while the Execution is `WAITING`** (W-3). It is created in an
  Outcome-acceptance transaction and either retired in that same transaction (W-2 steps 2–3) or
  persisted with `WAITING` until retired by `B-6` path B, `B-7` path B, or an accepted terminal decision.
- **Readiness is created only by a boundary that retires a live generation** (`B-8`). An Event accepted
  while `READY`, `RUNNING` or terminal is an accepted mailbox fact and nothing more.

| Trigger and boundary | Accepted together | Lifecycle | Readiness | Mandatory member | Consumed at | Recovery before reservation |
|---|---|---|---|---|---|---|
| **Eligible Event present at registration** (`B-6` path A) — Outcome acceptance | batch ack, progress/emissions/intents, registration **and** retirement, readiness | `READY`, never `WAITING` | Event-triggered | ≥ 1 Event eligible under the retired rule | reservation | *Outcome accepted before receipt* |
| **Eligible Event while `WAITING`** (`B-6` path B) — that Event's own acceptance boundary; **no Outcome** | Event/mailbox fact, retirement, readiness | `READY` | Event-triggered | ≥ 1 Event eligible under the retired rule | reservation | *Input commit before scheduler notification* / *Settlement committed before wake* |
| **Deadline already due at registration** (`B-7` path A) — Outcome acceptance | as row 1 plus **exactly one timeout Event** | `READY`; durable `WAITING` never persisted | deadline-triggered | that timeout Event | reservation | *Outcome accepted before receipt* |
| **Current-generation deadline expires while `WAITING`** (`B-7` path B) — the Kernel's own Event-acceptance boundary; **no Outcome** | **exactly one timeout Event**, retirement, readiness | `READY` | deadline-triggered | that timeout Event | reservation | *Input commit before scheduler notification*, read for a timeout |
| **Ordinary readiness** — `READY`, no wait-ended readiness | — | `READY` | ordinary | none (batch may be empty) | n/a | derivable from accepted records |
| **No wait live** — Event accepted while `READY`/`RUNNING`/terminal | the Event/mailbox fact only | unchanged | **none** (`B-8`) | — | n/a | the Event survives; nothing else promised |
| **Application-input category** (W-1) | eligible **only** via a declared subscription; a matching dependency alternative is inert | — | — | — | — | — |
| **Timeout Event category** (W-1, W-9) | eligible via neither list; arrives by construction as `B-7`'s mandatory member; one per generation; duplicate delivery idempotent | — | — | — | — | — |
| **Routing obligation vs destination Event** (`B-6`) | obligation creation and destination Event acceptance **may be two distinct accepted facts**; readiness attaches to **acceptance**, never to the obligation; recovery replays/idempotently fulfils it; a single-transaction profile is permitted, not required | — | — | — | — | — |

**The batch.** For a wait-ended dispatch: `{mandatory member} ∪ {Events eligible under the retired
rule}`, evaluated over the Events unacknowledged **at reservation**, truncated by retaining the
mandatory member and then filling with the earliest-accepted remaining candidates, presented in
per-Execution acceptance order. Ineligible backlog is never a candidate at any bound (≥ 1). The
readiness survives a crash before reservation, is consumed **at reservation**, and never re-arms —
replay and takeover re-send the pinned batch rather than re-selecting one.

## Adversarial self-review

Before committing C9 I re-read the entire current worksheet for every normative occurrence of `READY`,
`WAITING`, eligible/eligibility, subscription, dependency alternative, `external.input`, application
input, peer, timeout, deadline, timer, generation, wake, wait-ended, recoverable readiness, batch,
acknowledge, accepted Outcome, routing, child, destination Event, acceptance order, mandatory and
ordinary readiness, asking of each whether it is normative or historical, whether it agrees with the one
reconstructed state machine, and whether it creates a second eligibility path, a second readiness, a
crash window, or a K0-owned behaviour left to K1.

All seventeen required counterexamples were attempted and each has exactly one answer:

| # | Counterexample | Answered by | Result |
|---|---|---|---|
| 1 | dependency alternative `kind=external.input`, no subscription | W-1 category table, W-7 case 6 | queued, no wake, not acknowledged |
| 2 | input subscription only, no dependency list | W-1 well-formedness, W-8 | valid, first-class |
| 3 | batch bound 1 | `B-1`, W-8 case 4, W-9 case 1 | mandatory member takes the slot |
| 4 | older unmatched backlog | B-4, W-7 case 5, W-8 case 4 | never a candidate; keeps its disposition |
| 5 | preaccepted Event **and** already-due deadline | W-2 steps 2–3, W-9 case 5 | Event branch wins; **no** timeout Event |
| 6 | no preaccepted Event, already-due deadline | W-2 step 3, §3 row 3 | one timeout Event; `WAITING` never persisted |
| 7 | timeout, then result before reservation | W-9 case 3 | both facts survive; bound decides the batch |
| 8 | result, then deadline | W-9 case 4, W-3 | Event wake; later timer is a no-op |
| 9 | stale timer | W-3, W-6 case 2, W-9 case 2 | no-op; retires nothing, creates nothing |
| 10 | duplicate timer delivery | W-9 *Exactly one per generation*, case 6 | idempotent |
| 11 | crash before reservation | §3 table last column; *Lifetime* | readiness is accepted truth; reconstructed |
| 12 | takeover after reservation | *Lifetime*; ID-3/ID-9 | same Activation and batch; readiness does not re-arm |
| 13 | child routing obligation, no parent Event yet | `B-6` *Routing obligation is not destination Event acceptance* | parent not ready; recovery fulfils the obligation |
| 14 | application input whose kind matches an alternative | W-1, W-7 case 6 | inert alternative; input stays queued |
| 15 | peer message under K0/K1 | W-1 *This rule is closed for K0/K1* | dependency alternative on kind/correlation |
| 16 | Runtime-local promise | W-4, W-6 case 1 | no `waitingFor`; Activation stays `RUNNING` |
| 17 | result accepted after retirement, before a later correlating wait | W-6 cases 3–4, W-2 step 2 | durable; consumed by the later wait's check |

**Eleven additional consistency defects were found and corrected before C9.** None was named by
[review-08.md](review-08.md); all are recorded in worksheet §13 as implementer-discovered.

1. **`W₀` + deadline** — the mandatory timeout member was ineligible for a subscription-only wait
   (folded into `K01-R8-02`; W-8 case 6).
2. **No rule for Event acceptance when no wait is live** — left "arm a readiness on an interesting
   Event" available, and could have let a second readiness re-select an already-reserved batch. New
   `B-8` and §3 row 6.
3. **No ordering between the registration check and the registering Outcome's own batch
   acknowledgment** — a wait could be woken by the Events that Outcome had just accounted for, a
   self-sustaining wake loop. W-2 step 1, which the current code's prospectivity docstring already
   states (`packages/core/src/interaction/event-envelope.ts:57-60`).
4. **No "exactly one timeout Event per generation" and no idempotency rule** — an at-least-once timer
   transport would manufacture repeat timeouts. W-9 and case 6.
5. **No statement of which boundary accepts a Kernel-minted timeout** — sat awkwardly against §2
   ID-6/ID-7's six caller-facing boundaries. W-9 *Which boundary accepts it*: the same boundary role
   `B-6` path B already used, no seventh boundary, no external receipt.
6. **No terminal-race caveat on "mandatory delivery"** — as written it promised an Activation that a
   first-accepted cancellation makes impossible. W-9 *Mandatory delivery* and B-5.
7. **No explicit minimum batch bound** — both mandatory members are unsatisfiable at a bound of 0.
   `B-1`.
8. **No truncation rule** — "subject to the bound" did not say which candidates survive it, so two
   eligible Events at bound 1 had two answers. §3: retain the mandatory member, then fill with the
   earliest-accepted remaining candidates.
9. **No argument that the mandatory member is still available at reservation** — the guarantee rests on
   it. §3: only an accepted Outcome acknowledges (B-3), no Outcome intervenes between the readiness and
   its reservation, and a terminal decision produces no reservation.
10. **No statement about empty batches** — §3: an ordinary-readiness batch may be empty, a wait-ended
    batch never is.
11. **W-2's steps could be read as four commits** — would reintroduce the partial-acceptance failure
    OA-3/OA-5 forbid. W-2 now states ordered evaluation inside one transaction.

**Where an independent reviewer inventing a new counterexample is most likely to look next**, in my own
estimation: (a) the interaction between an accepted **cancellation** and a wait-ended readiness that has
already been created but not yet reserved — revision 9 answers it (W-3's retirement clause, §3's
paragraph after the table, W-9 *Mandatory delivery*, B-5), but it is answered in four places rather than
one table row, and a reader could reasonably ask for a fifth table row; and (b) whether `B-6` path A's
"at least one eligible Event" can be satisfied when the eligible Event is one the *same* Outcome
acknowledged — W-2 step 1 forecloses it, and that ordering is the newest rule in the document.

**No K0.1 semantic ambiguity is known to remain.** Every question the reconstruction raised was either
answered from the canonical sources or is explicitly and narrowly left to an implementation owner with
its constraint stated. No canonical owners conflict, so nothing is BLOCKED_ARCHITECTURE.

## Non-regression re-check

Each previously accepted decision was re-read at C9 and none changed meaning:

| Area | Status at C9 |
|---|---|
| Activation ID / writer epoch (ID-3, ID-4, ID-9) | unchanged — one semantic exchange per Activation ID; takeover advances the epoch under the same ID |
| Runtime-local work (W-4, W-6 case 1) | unchanged — no Kernel-visible local-promise wait; Activation stays `RUNNING` |
| K1 Effect refusal (EF-1, EF-2) | unchanged — whole-Outcome refusal at envelope validation; no Effect intent ever exists |
| Canonical encoding (E-7 / RFC 8785 JCS) | unchanged, not reopened |
| Finite limits (E-6) | unchanged, concrete and testable |
| Progress (PC-1–PC-5, `MIG-3`, `LEG-4`) | unchanged — nested payload migrates, closed discriminator does not |
| `revision` vs `base_progress_revision` (`MIG-4`) | unchanged |
| Legacy vocabulary | unchanged — exactly migratable / legacy-only / refused; no fourth label |
| `PendingOperation` (`LEG-5`) | unchanged — universal abstraction legacy-only |
| `REF-4` | unchanged — monotonic mailbox cursor refused for K1 |
| `MIG-5` | **extended, not weakened** — still migratable as the kind/correlation component; still not the eligibility predicate; still cannot build the subscription list; now also records that it performs no part of timeout handling |
| `REF-5` | unchanged — refuses the whole `wake` + `interleave` shape, the missing identity selector, the sentinel-encoded absence and the absent subscription concept |
| `interleave` (W-5) | unchanged — not reintroduced as a target field |
| `LIM-1` | unchanged — outside the classification table |
| C/H process identity and evidence handling | unchanged — administrative commit, then C9, then validation on clean C9, then H9 |

## Validation

All commands ran at **C9 `1b2ef1bd83681f302637ffd27c9630575289d37b`** with the working tree verified
clean. Output was captured outside the repository and is reproduced below. **Round 9 added no evidence
file, directory or script to the repository.**

**On the accuracy of "verbatim."** Every block below is byte-for-byte **except** `03a`, where the two
echoed offending lines are rendered without their single trailing space, for the reason given at that
block. This report therefore reproduces the raw outputs **subject to the documented historical-whitespace
rendering exception**, and the 007 status row says exactly that rather than claiming full verbatim
reproduction.

- **cwd:** `/Users/rex-shih/Documents/Codex/projects/agent-kernel`
- **Environment:** Node `v25.2.1`, npm `11.6.2`, Python `3.13.5`, git `2.39.5 (Apple Git-154)`,
  Darwin `24.6.0`, macOS `15.7.9`, package `arrokothi-agent-kernel@0.8.1`, installed workspace
  dependencies.
- **UTC timestamp of the environment capture:** `2026-09-11T08:57:52Z`; every command below ran in the
  same session immediately after it, at the same HEAD.

### The three-way `git diff --check` plan

| Run | Requirement | Result |
|---|---|---|
| `git diff --check <base> <C9>`, default strict rules | may report **only** the two already-approved immutable `implementation-04.md` blank-at-EOL findings | exit 2 — **exactly** `implementation-04.md:227` and `:235`, nothing else, no other whitespace class |
| `git -c core.whitespace=-blank-at-eol diff --check <base> <C9>` | **exit 0** | exit 0 |
| `git diff --check <H8> <C9>` — this round's own delta | **exit 0, no exception** | exit 0 |

### Criterion observations

| Criterion ID and source | Assertion / independent observation | Command and evidence | Observed result |
|---|---|---|---|
| K01-R8-01 ([review-08.md](review-08.md)) | §3 states no eligibility rule; B-2 cites W-1; the `WAITING`-side canonical sentence is reconciled | Inspection of §3 B-2 and the following note at C9 | **PASS** |
| K01-R8-02 ([review-08.md](review-08.md)) | The timeout is a Kernel Event with identity, class, generation correlation and Kernel provenance; one per generation; idempotent redelivery; union-based batch; `W₀`+deadline answerable | Inspection of §5 W-9, §5 W-1 category table, §3 `B-1`/`B-7`/wait-ended batch rule, §5 W-8 case 6 at C9 | **PASS** |
| K01-R8-03 ([review-08.md](review-08.md)) | The K0/K1 rule is closed and unconditional; K4 extension is versioned; no canonical capability lost | Inspection of §5 W-1 *This rule is closed for K0/K1* at C9 | **PASS** |
| K01-R8-04 ([review-08.md](review-08.md)) | W-2's ordered algorithm; already-due deadline collapses inside Outcome acceptance; no durable `WAITING`; no "two defensible answers" anywhere | Inspection of §5 W-2, §4 CL-3, §5 W-9 case 5 at C9 | **PASS** |
| K0.1 contract command plan, step 1 | `npm run check:builder-docs` passes unchanged | `01-builder-docs` | **PASS**, exit 0 |
| K0.1 contract command plan, step 2 | the recorded three-way `git diff --check` plan | `03a` / `03b` / `03c` | **PASS** — see the table above |
| K0.1 contract command plan, step 3 | K0.1 link/anchor audit passes | `07-link-anchor-audit`, `08-extra-links` | **PASS**, 0 unresolved files, 0 bad anchors |
| K0.1 contract command plan, step 4 | cumulative scope touches only `docs/development/` | `04-diff-stat-cumulative` | **PASS** — no `packages/`, no `tests/`, no canonical doc |
| K0.1 contract command plan, step 5 | `npm run typecheck` passes | `02-typecheck` | **PASS**, exit 0, no diagnostics |
| 006 history preservation | every prior report, review and evidence artifact byte-identical | `09-history-preserved` | **PASS** — sixteen checks, no diff |

**`npm test` was not run**, and is not required: this round changes documentation and review records
only. `04-diff-stat-cumulative` shows the full cumulative diff touching nothing under `packages/` or
`tests/`. No live model/provider call, process-kill fault injection, or E0–E6 benchmark run was
performed or is claimed. **No executable behaviour is validated by this packet**; the worksheet's cases
are specifications of traces, not passing fixtures.

### Raw output

#### `00-env` — environment capture

```text
node    : v25.2.1
npm     : 11.6.2
python3 : Python 3.13.5
git     : git version 2.39.5 (Apple Git-154)
uname   : Darwin 24.6.0
sw_vers : macOS 15.7.9
package : arrokothi-agent-kernel@0.8.1
cwd     : /Users/rex-shih/Documents/Codex/projects/agent-kernel
HEAD    : 1b2ef1bd83681f302637ffd27c9630575289d37b
utc     : 2026-09-11T08:57:52Z
```

#### `01-builder-docs`

```text
$ npm run check:builder-docs

> arrokothi-agent-kernel@0.8.1 check:builder-docs
> node --experimental-strip-types scripts/check-builder-docs.ts

Builder checks passed: 26 Markdown files, 275 local links/anchors, 38 public package imports. Named symbols are checked by npm run typecheck.
exit=0
```

#### `02-typecheck`

```text
$ npm run typecheck

> arrokothi-agent-kernel@0.8.1 typecheck
> tsc --noEmit -p tsconfig.json

exit=0
```

#### `03a-diff-check-strict` — cumulative base..C9, default strict rules

```text
$ git diff --check 6464be12c11eb75f7dfbc5ece12ca8d3020a5c15 1b2ef1bd83681f302637ffd27c9630575289d37b
docs/development/work/K0.1/implementation-04.md:227: trailing whitespace.
+
docs/development/work/K0.1/implementation-04.md:235: trailing whitespace.
+
exit=2
```

**The one rendering exception in this report.** `git diff --check` echoes each offending line, so the
two `+` lines above are literally `+` followed by one space (`0x2B 0x20`) in the real output.
Reproducing those two bytes would put `blank-at-eol` into *this* report. Those two trailing spaces, and
only those, are stripped here; they are precisely what the command is reporting, and its own message
names the file and line of each, so nothing is concealed. Every other block in this report is
byte-for-byte.

#### `03b-diff-check-noblankeol` — cumulative base..C9 with only the blank-at-eol rule disabled

```text
$ git -c core.whitespace=-blank-at-eol diff --check 6464be12c11eb75f7dfbc5ece12ca8d3020a5c15 1b2ef1bd83681f302637ffd27c9630575289d37b
exit=0
```

#### `03c-diff-check-delta` — this round's own delta H8..C9, default strict rules, no exception

```text
$ git diff --check 6290e68fb0231a6a8b4e6956d9a44afe7ac051ab 1b2ef1bd83681f302637ffd27c9630575289d37b
exit=0
```

#### `04-diff-stat-cumulative` — cumulative base..C9 scope

```text
$ git diff --stat 6464be12c11eb75f7dfbc5ece12ca8d3020a5c15 1b2ef1bd83681f302637ffd27c9630575289d37b
 docs/development/007-work-packets.md               |    2 +-
 docs/development/work/K0.1/contract.md             |  242 +++
 .../work/K0.1/evidence/round-3/01-builder-docs.txt |   15 +
 .../work/K0.1/evidence/round-3/02-typecheck.txt    |   14 +
 .../evidence/round-3/03-diff-check-cumulative.txt  |   10 +
 .../evidence/round-3/04-diff-stat-cumulative.txt   |   18 +
 .../evidence/round-3/05-diff-stat-correction.txt   |   15 +
 .../work/K0.1/evidence/round-3/06-status-clean.txt |   10 +
 .../K0.1/evidence/round-3/07-link-anchor-audit.txt |   17 +
 .../work/K0.1/evidence/round-3/README.md           |   36 +
 .../K0.1/evidence/round-3/link-anchor-audit.py     |   55 +
 docs/development/work/K0.1/implementation-01.md    |  127 ++
 docs/development/work/K0.1/implementation-02.md    |  109 +
 docs/development/work/K0.1/implementation-03.md    |  114 +
 docs/development/work/K0.1/implementation-04.md    |  436 ++++
 docs/development/work/K0.1/implementation-05.md    |  454 ++++
 docs/development/work/K0.1/implementation-06.md    |  490 +++++
 docs/development/work/K0.1/implementation-07.md    |  473 +++++
 docs/development/work/K0.1/implementation-08.md    |  472 +++++
 docs/development/work/K0.1/protocol-worksheet.md   | 2201 ++++++++++++++++++++
 docs/development/work/K0.1/review-01.md            |  146 ++
 docs/development/work/K0.1/review-02.md            |  134 ++
 docs/development/work/K0.1/review-03.md            |  205 ++
 docs/development/work/K0.1/review-04.md            |  190 ++
 docs/development/work/K0.1/review-05.md            |  197 ++
 docs/development/work/K0.1/review-06.md            |  199 ++
 docs/development/work/K0.1/review-07.md            |  217 ++
 docs/development/work/K0.1/review-08.md            |   86 +
 28 files changed, 6683 insertions(+), 1 deletion(-)
```

Nothing under `packages/` or `tests/`, and no canonical architecture document, appears in the cumulative
diff. The only file outside `docs/development/work/K0.1/` is the 007 ledger row.

```text
$ git diff --name-only 6464be12c11eb75f7dfbc5ece12ca8d3020a5c15 1b2ef1bd83681f302637ffd27c9630575289d37b | grep -v '^docs/development/' || echo 'nothing outside docs/development/'
nothing outside docs/development/
```

#### `05-diff-stat-correction` — correction delta H8..C9

```text
$ git diff --stat 6290e68 1b2ef1bd83681f302637ffd27c9630575289d37b
 docs/development/007-work-packets.md             |    2 +-
 docs/development/work/K0.1/contract.md           |   25 +
 docs/development/work/K0.1/protocol-worksheet.md | 1432 +++++++++++++---------
 docs/development/work/K0.1/review-08.md          |   86 ++
 4 files changed, 978 insertions(+), 567 deletions(-)
```

Two of those four files belong to the **administrative review-record commit** `6ac959f`
(`review-08.md`, and the 007 ledger row → `CHANGES_REQUESTED`), which sits between H8 and C9. **C9's own
payload is exactly two files**, `contract.md` and `protocol-worksheet.md`, as the commit sequence table
above requires.

#### `06-status` — clean tree at C9

```text
$ git status --porcelain
(empty output)
```

#### `07-link-anchor-audit` — K0.1 link/anchor audit

```text
$ python3 link-anchor-audit-r9.py   (run from repo root; script kept outside the repository)
relative links checked : 321
resolved files         : 317
anchors verified       : 12
known forward refs     : 4 (implementation-09.md, written by the report commit H9)
unresolved files       : 0
bad anchors            : 0
RESULT: PASS
exit=0
```

The four known forward references are references to `implementation-09.md` — this file, written by H9 —
two from `protocol-worksheet.md` and one each from `contract.md` and `review-08.md`. The link count rose
from round 8's 318 to 321: `implementation-08.md` contributes 14 (it exists in the tree at C9 but was
written by H8, so it was absent at C8), `review-08.md` contributes 5, `contract.md` gained 2, and
`protocol-worksheet.md` **lost 18 net** — the consolidation replaced many repeated
`implementation-0N.md` provenance citations inside §3 and §5 with single cross-references to the owning
decision, which is the intended effect of stating each rule once.

**The script that ran.** `docs/development/work/K0.1/evidence/round-3/link-anchor-audit.py` is already in
the repository at H3 (SHA-256 `4713f621db707d80cfce3c3a9c43b11dfeffa2c4a3c973e7b4d2d7ebe107767a`).
Round 9 must add no file to the repository, so the round-9 variant ran from outside the working tree,
differing in exactly two places, shown as explicit before/after line sets so this report introduces no
blank diff context lines:

Lines 9–11, before:

```python
# implementation-03.md is written by the report commit (H3) that also carries this log,
# so at the payload commit (C3) it is a known forward reference, reported, not hidden.
FORWARD = {"implementation-03.md"}
```

Lines 9–11, after:

```python
# implementation-09.md is written by the report commit (H9) that also carries this log,
# so at the payload commit (C9) it is a known forward reference, reported, not hidden.
FORWARD = {"implementation-09.md"}
```

Line 49, before:

```python
print(f"known forward refs     : {fwd} (implementation-03.md, written by the report commit H3)")
```

Line 49, after:

```python
print(f"known forward refs     : {fwd} (implementation-09.md, written by the report commit H9)")
```

The resulting file's SHA-256 is
`41c734d8533c8b8e366df45b0a5ad06113ce7f44dfb48c11f6cf452bc910a88d`.

#### `08-extra-links` — same-file anchors and 007 ledger links

```text
$ python3 - (same-file anchors and 007 K0.1-row links; neither is covered by the audit script)
same-file anchor #reference-implementation-limitations-not-a-legacy-disposition -> OK
007 K0.1-row link work/K0.1/review-08.md -> OK
007 K0.1-row link work/K0.1/review-01.md -> OK
007 K0.1-row link work/K0.1/review-02.md -> OK
007 K0.1-row link work/K0.1/review-03.md -> OK
007 K0.1-row link work/K0.1/evidence/round-3/ -> OK
007 K0.1-row link work/K0.1/review-04.md -> OK
007 K0.1-row link work/K0.1/review-05.md -> OK
007 K0.1-row link work/K0.1/review-06.md -> OK
007 K0.1-row link work/K0.1/review-07.md -> OK
007 K0.1-row link work/K0.1/review-08.md -> OK
exit=0
```

`review-08.md` appears twice because the ledger row links it both as the round-8 review and in the
list of prior candidates; both resolve.

#### `09-history-preserved` — every prior report, review and evidence artifact untouched

Each check diffs a path against the commit that introduced it. No diff printed means byte-identical.

```text
$ git diff --stat <introducing commit> HEAD -- <path>     (no diff printed = byte-identical)
--- review-01.md             (introduced in 4d47638)
--- review-02.md             (introduced in ca06599)
--- review-03.md             (introduced in 6738884)
--- review-04.md             (introduced in cef3313)
--- review-05.md             (introduced in 35e7de5)
--- review-06.md             (introduced in 6b9a66d)
--- review-07.md             (introduced in 5dda5a7)
--- implementation-01.md     (introduced in 857fa05)
--- implementation-02.md     (introduced in cc61e74)
--- implementation-03.md     (introduced in aef1e33)
--- implementation-04.md     (introduced in a068e2f)
--- implementation-05.md     (introduced in d0dbc48)
--- implementation-06.md     (introduced in c5bdd48)
--- implementation-07.md     (introduced in 6bdc53a)
--- implementation-08.md     (introduced in 6290e68)
--- evidence/round-3/        (introduced in aef1e33)
exit=0  (no section above printed a diff)
```

## Interpretation and decisions

- **What changed semantically, and what did not.** Four rules changed meaning: eligibility now lives in
  exactly one place; the timeout observation is an Event; the K0/K1 category rule is closed; and an
  already-due deadline collapses inside Outcome acceptance. Everything else in the worksheet either kept
  its meaning and gained precision, or was left untouched. The non-regression table above is the
  file-by-file record of the second category.
- **Why a rewrite rather than four patches.** Stated in full under *Why this round is a consolidation*
  and in `contract.md`'s correction history. The short version: the defect class the last four rounds
  kept hitting is "one rule written out in several voices," and no local patch removes it.
- **What a reviewer should attack.** Named explicitly in *Adversarial self-review*: the
  cancellation/wait-ended-readiness interaction, which is answered correctly but in four places rather
  than one table row; and W-2 step 1, the newest rule in the document.
- **Roadmap deviations:** none. No scope, gate or acceptance requirement was weakened; K0.1-C1 through
  C6 stand exactly as written, and the command plan including its owner-approved exception is unmodified.
- **Known limitations:** unchanged in kind. K1 does not exist, so nothing here is validated against
  running behaviour; the worksheet's cases are specifications of traces, not passing fixtures, and the
  crash-window mapping remains a reading of the canonical recovery contract rather than a tested
  recovery path.
- **Third-party source / dependency / service:** **none added.** No code, test material or asset was
  copied, adapted or vendored, no dependency or service was introduced, and `package.json` is untouched
  (`04-diff-stat-cumulative`). Every source read this round was repository-internal.
- **Prior review findings — each ID → correction evidence.** Round 8: K01-R8-01 → Fixed (§3 B-2 and its
  following note; §13; revision history); K01-R8-02 → Fixed (§5 W-9 rewritten with cases 4–6; §5 W-1
  category table; §3 `B-1`/`B-3`/wait-ended batch rule/`B-7`; §4 wait-clock row; §5 W-8 case 6; §12
  `MIG-5`; §11 row 5); K01-R8-03 → Fixed (§5 W-1 *This rule is closed for K0/K1*); K01-R8-04 → Fixed
  (§5 W-2 rewritten; §4 CL-3; §3 rows 1 and 3; §5 W-9 case 5; §7 OA-4; §11 row 5(c)). Rounds 1–7's
  findings remain fixed as recorded in [implementation-08.md](implementation-08.md) and its
  predecessors; the non-regression table above re-checked each named point at C9 and none regressed.
  No finding across any round remains unresolved or partially resolved.

## Handoff

- Base `6464be12c11eb75f7dfbc5ece12ca8d3020a5c15`; reviewed H8
  `6290e68fb0231a6a8b4e6956d9a44afe7ac051ab`; administrative review record
  `6ac959fef2883ae6bb14427c0f1a92cc54d43a65`; payload **C9**
  `1b2ef1bd83681f302637ffd27c9630575289d37b`; candidate **H9** = the commit containing this report,
  whose full SHA is supplied with this handoff.
- `git diff --stat <C9> <H9>` must contain exactly two files: this report and the 007 K0.1 ledger row.
- Review `base..H9` cumulatively as well as `H8..C9`; the §3 and §5 rewrite is intended to be read whole
  rather than as a hunk diff.
- **This report claims no acceptance.** The coding agent cannot grant it. K0.2 and every later packet
  remain unreleased.
