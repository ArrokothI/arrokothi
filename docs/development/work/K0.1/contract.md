# Packet contract — K0.1: Protocol decisions and legacy disposition

## Correction history

Round 1 (base `6464be1`, C `b08577c`, H `857fa05`) received an independent review with outcome
**CHANGES REQUIRED**: see [review-01.md](review-01.md) (findings K01-REV-01 through K01-REV-05).
This contract and the worksheet were corrected in round 2 on top of that history (not by amending
it); the correction's own report is [implementation-02.md](implementation-02.md). Sections below
marked "corrected in review round 1" reflect that correction, not the original round-1 text.

Round 2 (C2 `fc84664`, H2 `cc61e74`) received a second independent review, again **CHANGES
REQUIRED**: see [review-02.md](review-02.md) (findings K01-R2-01 through K01-R2-06, plus a
provenance correction to round 1's recorded reviewer identity, access method and severities).
Round 3's correction is reported in [implementation-03.md](implementation-03.md); sections marked
"corrected in review round 2" reflect it.

Round 3 (C3 `2b252b0`, H3 `aef1e33`) received a third independent review, again **CHANGES REQUIRED**:
see [review-03.md](review-03.md) (findings K01-R3-01 through K01-R3-04, criterion verdicts, and a
provenance correction superseding two statements in [review-02.md](review-02.md)). Round 4's
correction is reported in [implementation-04.md](implementation-04.md); sections marked "corrected in
review round 3" reflect it. Round 3 also found that H3 added evidence files after its payload C3 was
validated, so round 4 restores 006's commit-identity convention: an administrative review-record
commit, then payload C4, then validation on the clean C4 tree, then a candidate H4 carrying only the
report and the status-row edit. H3 is not rewritten to achieve that.

Round 4 (C4 `2286106`, H4 `a068e2f`) received a fourth independent review, again **CHANGES
REQUIRED**: see [review-04.md](review-04.md) (findings K01-R4-01 P1 and K01-R4-02 P2, with round-4
criterion verdicts and an explicit inspected-versus-rerun record). Round 5's correction is reported in
[implementation-05.md](implementation-05.md); sections marked "corrected in review round 4" reflect
it. Round 4's two defects were both **internal to the worksheet** rather than disputes with a
canonical owner: §3/§5 described two different target wait records at once, and PC-1 overstated how
much of the current progress wrapper migrates. Round 4 also confirmed that the commit-identity
convention restored in round 4 is correct, and that round 4's in-report raw evidence is adequate —
round 5 follows the same pattern. E-7 and its RFC 8785 alignment were re-checked against the RFC
itself and are not reopened.

Round 5 (C5 `ab2ff6d`, H5 `d0dbc48`) received a fifth independent review, again **CHANGES REQUIRED**:
see [review-05.md](review-05.md) (findings K01-R5-01 P1 and K01-R5-02 P2, with K0.1-C1 through C4 now
PASSING and C5/C6 failing). Round 6's correction is reported in
[implementation-06.md](implementation-06.md); sections marked "corrected in review round 5" reflect it.
Both round-5 defects were again **internal to the worksheet**, and both were a *consequence of a
correct earlier correction that was not carried through*: round 4 rightly made an eligible wake retire
the wait, but §3's batch-selection rule was not updated to keep the canonical "eligible wake included
before unrelated backlog" guarantee across that retirement; and round 4's wait record was described by
two different selector grammars in the same decision. Round 5 also **accepted and closed** three things
that are not to be reopened: the owner-approved historical blank-at-EOL exception recorded in the
command plan below, the round-4 findings, and E-7/JCS.

Round 6 (C6 `4a015b3`, H6 `c5bdd48`) received a sixth independent review, again **CHANGES REQUIRED**:
see [review-06.md](review-06.md) (findings K01-R6-01 P1 and K01-R6-02 P2, with K0.1-C1 through C4
passing again and C5/C6 failing; the reviewed artifacts are additionally pinned there by **blob** SHA,
which the correction verified against H6's tree). Round 7's correction is reported in
[implementation-07.md](implementation-07.md); sections marked "corrected in review round 6" reflect it.
Both round-6 defects were once more **internal to the worksheet** and once more a *consequence of a
correct earlier correction not carried through*: `B-6` named "the accepted Outcome" as its acceptance
boundary, which holds only when the waking Event was already present at registration and leaves the
later-arrival path with no boundary at all; and the empty-kind-set rule sat in a legacy-classification
row instead of in the normative grammar. Round 6 again **accepted and closed** the historical
blank-at-EOL exception, the round-5 findings and E-7/JCS.

Round 7 (C7 `fdac4cc`, H7 `6bdc53a`) received a seventh independent review, again **CHANGES
REQUIRED**: see [review-07.md](review-07.md) (findings K01-R7-01 P1, K01-R7-02 P1 and K01-R7-03 P2,
with C1/C3/C4 passing and C2/C5/C6 failing; the reviewed artifacts are again pinned by **blob** SHA,
which the correction verified against H7's tree). Round 8's correction is reported in
[implementation-08.md](implementation-08.md); sections marked "corrected in review round 7" reflect it.
Round 7's three defects are a different mix from earlier rounds: one **contradiction of a canonical
owner** (a dependency alternative could wake ordinary application input, bypassing kernel.md's
"application-input waits require a declared subscription"), one **gap against this worksheet's own §4**
(the wait-deadline clock was named but its expiry had no accepted-fact, delivery or batch semantics,
so a timeout could be displaced by backlog exactly as a wake Event once could), and one **over-reach**
into a K4-owned routing mechanism. The first is worth recording as a pattern: making the selector
grammar exact in round 5 did not create the bypass, it made it reachable — precision can convert a
harmless imprecision into a live defect. Round 7 again **accepted and closed** the historical
blank-at-EOL exception, the round-6 findings, E-7/JCS, the Activation-ID identity, the Effect-refusal
boundary, the progress decisions and the three-label vocabulary.

Round 8 (C8 `40feb09`, H8 `6290e68`) received an eighth independent review, again **CHANGES
REQUIRED**: see [review-08.md](review-08.md) (findings K01-R8-01 P1, K01-R8-02 P1, K01-R8-03 P2 and
K01-R8-04 P2, with C1/C3/C4 passing and C2/C5/C6 failing; the reviewed artifacts are again pinned by
**blob** SHA, which the correction verified against H8's tree). Round 9's correction is reported in
[implementation-09.md](implementation-09.md).

Round 9 is deliberately a **consolidation round** rather than another four-patch round, and the reason
is in the record above. Rounds 5, 6, 7 and 8 each found a defect created by an earlier *correct*
correction that some neighbouring rule still contradicted: round 5's B-2 lost round 4's wake guarantee;
round 6's `B-6` named one acceptance boundary for two paths; round 7's `B-6` left deadline expiry with
no batch semantics; and round 8's B-2 still carried round 6's superseded eligibility wording after
round 7 replaced it. That is a **document-shape** failure, not four unrelated slips: the same rule was
written out in two or three voices, so correcting one voice left the others live. Round 9 therefore
reconstructs the wait / batch / clock protocol as one state machine, verifies it scenario by scenario
against the canonical owners before editing, and rewrites §3 and §5 of the worksheet so each rule is
stated **once** and cited everywhere else. The revision is large by design; `git diff --stat` is not a
measure of whether it was the right size. Round 9's own adversarial pass found **eleven** further
internal defects that no review had named — they are listed individually in the worksheet's §13 — and
every one is fixed in the same revision and labelled implementer-discovered rather than attributed to
review-08.

This contract's **acceptance criteria are unchanged and are not weakened** by that decision: K0.1-C1
through C6 stand exactly as written, and a larger rewrite is held to the same criteria as a smaller one.
The command plan, including its owner-approved historical blank-at-EOL exception, is unmodified.

Every prior commit, report and review is preserved unedited — each round corrects forward rather than
rewriting the record it was reviewed against.

## Identity

- Packet: **K0.1**, parent milestone **K0** (roadmap [001](../../001-current-status-and-roadmap.md#k0--state-the-contract-and-create-the-smallest-counterexample)).
- Process: [006](../../006-development-process.md); status ledger: [007](../../007-work-packets.md#k01--protocol-decisions-and-legacy-disposition).
- Dependencies: none (007 lists `—`). First packet released at bootstrap.
- Owner release: bootstrap invocation of Prompt A after owner adoption. Adoption is recorded: the
  planning branch `codex/development-review-pipeline` (`b89ba8a`) is merged to `origin/main` as
  `6464be1` ("Merge pull request #18 from ArrokothI/codex/development-review-pipeline"). Local `main`
  fast-forwarded from `f3c0a1b` to `6464be1` with a clean working tree before this packet started —
  no unrelated local edits existed to preserve or lose.
- Integration base: `6464be1` (= `f3c0a1b` + `b89ba8a`), matching 007's stated initial baseline
  ("`f3c0a1b2a3a1cb82b295580939d0284f8d329163` plus the owner's adopted planning commit").
- Branch: `codex/k0.1-protocol-legacy-disposition`, based on `6464be1`.
- No prior WAITING_FOR_REVIEW/CHANGES_REQUESTED/IN_PROGRESS packet exists (007's status table is
  entirely PLANNED/`—`; no `docs/development/work/` directory existed before this packet).

## Scope (007's K0.1 row, verbatim scope restated for traceability)

> Produce a versioned contract worksheet: equality/limits, scoped receipts, batches, three clocks,
> cancellation/terminal obligations, progress compatibility, locally ordered policy. Map every 001 K0
> boundary to an assertion; classify legacy data as migratable, legacy-only or refused.

This packet is **documentation-only**: it produces the worksheet artifact
[`protocol-worksheet.md`](protocol-worksheet.md). It does not implement, modify or delete any
`packages/*` runtime code, and it makes no claim that any target protocol behavior now runs. K0.2
(public fixture + E0) and K1.x (actual asynchronous Execution) consume these decisions; they are not
produced by this packet.

## Inherited requirement mapping

Every row in 001's K0 section ("State the contract and create the smallest counterexample") must be
answered by the worksheet, each with a stable criterion ID and an explicit owner statement (Kernel /
Runtime-Driver / deployment) per AGENTS.md's boundary rule. Source obligations, in addition to 001 K0
itself:

| Source | What K0.1 must resolve from it |
|---|---|
| [kernel.md](../../../kernel.md) — Execution/lifecycle, Activation/Outcome, Acceptance/atomicity table, Events/waits, Recovery/cancellation | Canonical semantics the worksheet must be consistent with, not redefine |
| [execution-protocol.md](../../../detail-design/execution-protocol.md) | Identities table, input reservation, Outcome acceptance algorithm, wait/race table, completion check — this is K0/K1's detailed owner |
| [recovery-and-compatibility.md](../../../detail-design/recovery-and-compatibility.md) | Crash-window table, compatibility-dimensions table — grounds "progress compatibility" and legacy classification |
| [evidence-and-observability.md](../../../detail-design/evidence-and-observability.md) | What K0/K1 inspection must show; frames what an "assertion" must be observable as |
| [003-evidence-and-findings.md](../../003-evidence-and-findings.md) F07, F08, F09, F10, F13, F14, F20 | Concrete current-code gaps the boundary assertions and legacy classification must account for, not silently repeat |
| [004-architecture-review.md](../../004-architecture-review.md) "Open questions" K0/K1 row | Explicit unresolved items this packet is scoped to close: "exact protocol schema, receipt representation and legacy-data refusal/migration" |
| [005-detail-design-review.md](../../005-detail-design-review.md) legacy-disposition table | Prior legacy→home mapping; K0.1 narrows this to concrete current record types, not concepts |
| [action-lifecycle.md](../../../detail-design/action-lifecycle.md) (added in review round 1, [K01-REV-04](review-01.md)) | Owns the four action dimensions (request disposition, attempt evidence, result contract, responsibility) K0.1 must *name* at the conceptual level without deciding K2's admission/settlement mechanics — see worksheet §8, EF-3/EF-4 |

## Acceptance criteria (007's K0.1 row)

> Every boundary has one owner and an unambiguous observable outcome; contradictory semantics are
> blocked; storage/wire choices justified without new Kernel concepts.

Decomposed into stable IDs, checked in [implementation-01.md](implementation-01.md):

| ID | Criterion |
|---|---|
| K0.1-C1 | Every 001 K0 boundary (creation/input, dispatch, Outcome acceptance, Effect intent refusal until K2, wait/cancel, terminal, checkpoint form) has exactly one worksheet entry with an owner and an assertion phrased as an observable pass/fail, not prose intent. |
| K0.1-C2 | Equality/limits, scoped receipts, batches, three clocks, cancellation/terminal obligations and progress compatibility are each a dedicated worksheet section with decisions, not open questions restated. **"Limits" means K0.1 states concrete units and a counting rule for each finite bound the semantic canonical-value model needs (corrected in review round 1, [K01-REV-04](review-01.md)) — e.g. "string length in Unicode scalar values," "array/object entries," "canonical envelope bytes" — so K1 fixtures can test an exact pass/fail boundary. Round 2 ([K01-R2-01](review-02.md)) further requires that the canonical encoding those bounds are measured over is itself fully specified — every byte-affecting rule (object-key ordering, string escaping, number spelling, absent-versus-null) — so that a size bound is computable rather than nominal; worksheet E-7 carries that specification. Only the transport wire codec and the storage layout/engine stay implementation-owned (C4).** |
| K0.1-C3 | Every current legacy record type touched by K0/K1 (`ExecutionContext.control`, the `ControllerProgress` kind discriminator, `ExecutionWait` incl. `controller_resumption`/`dependencies`, the `ControllerResumption` record itself, the mailbox/Event delivery representation, lifecycle transitions incl. `CREATED`, `PendingOperation`, `CancellationRequest`, and the `revision` counter versus the target's semantic progress revision) is classified migratable / legacy-only / refused — splitting a record into parts with different classifications where a single label would misrepresent it (corrected in review round 1, [K01-REV-03](review-01.md)) — with current file/line evidence for each classification. **These three labels are exhaustive (made explicit in review round 3, [K01-R3-02](review-03.md)): no fourth or fifth classification may be introduced to accommodate a row, and material that is not a disposition of legacy data — a reference-implementation limitation, for example — belongs outside the classification table rather than inside it under a new label.** |
| K0.1-C4 | No decision invents a new mandatory Kernel concept beyond what kernel.md/detail-design already name (no wire codec, no storage engine, no new entity). This applies to **transport/storage mechanics only** — the wire-byte encoding, database schema and storage-engine choice stay implementation-owned — and does not exempt the semantic canonical-value/equality profile, its canonical encoding rules (worksheet E-7) or its finite limits (C2), which 001 K0 requires K0.1 to actually state. A rule is "implementation-owned" here only if changing it cannot change which logical values are equal or what a bounded value measures. |
| K0.1-C5 | Contradictions between sources (e.g. current code vs. target contract) are called out explicitly and resolved in the Kernel's favor per AGENTS.md, never silently resolved by picking whichever the current implementation already does. **Round 3 ([K01-R3-01](review-03.md)) confirms this criterion also covers a contradiction *internal to the worksheet* — a normative rule stated against its own implementation guidance or against a published profile it claims to follow — because such a contradiction makes the decision unusable in exactly the way a source conflict does: two implementers reading the same document reach different bytes.** |
| K0.1-C6 | The worksheet is versioned (revision marker) and self-contained: a K1.1 implementer can read it without also reading this contract or the full canonical set again for the decisions it covers. |

## Sources and touchpoints inspected in the current tree

Documentation-only packet; "touchpoints" below are read-only evidence, not edited files.

- `docs/kernel.md`, `docs/execution.md` (Driver contract, Progress and native recovery), `docs/mental-model.md`, `docs/README.md`, `docs/detail-design/README.md`, `docs/detail-design/execution-protocol.md`, `docs/detail-design/recovery-and-compatibility.md`, `docs/detail-design/evidence-and-observability.md`, `docs/future-plan.md` (Q3 skim only — confirmed non-blocking per 010).
- `docs/development/{README,001,002,003,004,005}.md`, `006`–`010` (this packet's own governing process).
- Code (read-only): `packages/core/src/execution/{lifecycle,context,resumption,cancellation-request}.ts`; `packages/core/src/ports/{controller,controller-resumption,scheduler,runtime-store}.ts`; `packages/core/src/runtime/{harness,resumption-processor}.ts` (targeted sections: `activate`, `runController`, `applyOutcome`); `packages/core/src/reference/in-memory-runtime-store.ts` (`structuredClone`-based `transact`; the `MailboxState`/`consumed`-cursor mailbox facet, added in review round 1); `packages/core/src/effects/pending.ts` (`PendingOperation`, added in review round 1); `packages/core/src/interaction/event-envelope.ts` (`WakeCondition`, added in review round 1); `packages/core/src/definitions/types.ts` (`DefinitionKind`, added in review round 1).

## Non-goals

- No transport wire codec, database schema, scheduler algorithm or store implementation choice
  (007/001 both reserve these to K1 implementation and beyond). This is the *transport/storage* sense
  only: the semantic canonical encoding used for equality and size (worksheet E-7) is inside scope and
  is decided, not deferred — see K0.1-C2/C4.
- No code change to `packages/core` or any Runtime/Driver package.
- No resolution of R1/K3 substrate choice, K2 schema/validator selection, K4 composition sugar, K5
  retention numbers, D1 isolation backend, or S1 packaging — those are later packets' contracts.
- No answer to future-plan Q3 (detached/supervisory services) beyond confirming it does not block K0.1.
- No new external dependency, benchmark run, or live model/provider call.

## Command plan

Documentation-only change; no runtime/test command exercises the worksheet's content directly.
Validation is link/anchor/scope hygiene plus proof that no runtime files changed:

1. `npm run check:builder-docs` — guide-inventory link/anchor/import check (does not cover
   `docs/development/`, but must still pass unchanged).
2. `git diff --check` on the cumulative branch diff — whitespace/conflict-marker hygiene.

   **Historical-evidence exception (recorded in review round 5; owner-approved before round 5's
   validation ran).** From round 4 onward this packet's reports reproduce raw command output verbatim
   in tracked Markdown, as review round 3 required ([K01-R3-03](review-03.md)). A faithful unified diff
   contains blank *context* lines, which `diff -u` emits as a single space, so `git diff --check`'s
   `blank-at-eol` rule flags them — content, not accident. `implementation-04.md:227` and `:235` are
   exactly that, and they are **preserved byte-for-byte**: a delivered, reviewed report is not edited
   to satisfy a hygiene check. The gate is therefore run three ways and all three results are recorded
   in the round's report:

   - `git diff --check <base> <C>` under the **default strict rules**. Its only permitted failures are
     already-known `blank-at-eol` lines inside immutable verbatim diff evidence, each named by file and
     line. A finding of any other class, or a `blank-at-eol` finding anywhere else, fails the packet.
   - `git -c core.whitespace=-blank-at-eol diff --check <base> <C>` — **must pass**, proving no conflict
     marker, carriage return, space-before-tab or indent-with-tab anywhere in the cumulative diff.
   - `git diff --check <previous reviewed candidate H> <C>` — the round's **own delta**, which **must
     pass under the default strict rule with no exceptions**. New work is never granted this exception.

   No repository configuration and no `.gitattributes` file is changed: the middle run is a
   command-line override for that invocation only. The exception is narrow, retrospective and
   self-limiting — it reaches only lines already committed in a reviewed report, and the third run holds
   every new line to the strict rule.
3. Manual link/anchor audit of new/changed Markdown (relative links resolve; anchors match target headings).
4. `git diff --stat <base> HEAD` reviewed by hand to confirm only `docs/development/work/K0.1/**`
   (and this contract) changed — no `packages/`, `tests/`, or other canonical doc touched.
5. `npm run typecheck` — run once as a baseline-preservation check (expected unaffected by a
   documentation-only change; confirms this packet did not accidentally touch typed code).

`npm test` is not run for this packet: it would validate current 0.8.x behavior this packet does not
touch, and 010 already recorded a fresh full-suite pass (965/211, zero failures) at the adopted
baseline commit `f3c0a1b`, which `6464be1` (this packet's base) fast-forwards without touching
`packages/`/`tests/`. Re-running it here would not exercise anything this packet changed.

## Evidence owners

- Documentation hygiene (link/anchor/diff-scope): this packet, recorded in
  [implementation-01.md](implementation-01.md).
- Semantic correctness of the worksheet against canonical architecture: independent reviewer (006),
  not self-certified.
- E0 (independent public fixture/ledger, unsafe/state-loss control observations): **K0.2**, not this
  packet. This worksheet's assertions are inputs to K0.2's fixture design, not evidence themselves.

## Limits

This packet cannot itself be validated by running the protocol it describes — there is no K1
implementation yet to exercise. Its only available evidence is internal consistency with the
canonical/detail-design sources and with the current code it classifies. Semantic acceptance is
therefore a documentation/design review (006's normal review path), not a test-suite gate.
