# Packet contract — K0.1: Protocol decisions and legacy disposition

## Correction history

Round 1 (base `6464be1`, C `b08577c`, H `857fa05`) received an independent review with outcome
**CHANGES REQUIRED**: see [review-01.md](review-01.md) (findings K01-REV-01 through K01-REV-05).
This contract and the worksheet were corrected in round 2 on top of that history (not by amending
it); the correction's own report is [implementation-02.md](implementation-02.md). Sections below
marked "corrected in review round 1" reflect that correction, not the original round-1 text.

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
| K0.1-C2 | Equality/limits, scoped receipts, batches, three clocks, cancellation/terminal obligations and progress compatibility are each a dedicated worksheet section with decisions, not open questions restated. **"Limits" means K0.1 states concrete units and a counting rule for each finite bound the semantic canonical-value model needs (corrected in review round 1, [K01-REV-04](review-01.md)) — e.g. "string length in Unicode scalar values," "array/object entries," "canonical envelope bytes" — so K1 fixtures can test an exact pass/fail boundary; only the wire-byte encoding and storage/schema layout that carry those semantic values stay implementation-owned (C4).** |
| K0.1-C3 | Every current legacy record type touched by K0/K1 (`ExecutionContext.control`, the `ControllerProgress` kind discriminator, `ExecutionWait` incl. `controller_resumption`/`dependencies`, the `ControllerResumption` record itself, the mailbox/Event delivery representation, lifecycle transitions incl. `CREATED`, `PendingOperation`, `CancellationRequest`, and the `revision` counter versus the target's semantic progress revision) is classified migratable / legacy-only / refused — splitting a record into parts with different classifications where a single label would misrepresent it (corrected in review round 1, [K01-REV-03](review-01.md)) — with current file/line evidence for each classification. |
| K0.1-C4 | No decision invents a new mandatory Kernel concept beyond what kernel.md/detail-design already name (no wire codec, no storage engine, no new entity). This applies to **transport/storage mechanics only** — the wire-byte encoding, database schema and storage-engine choice stay implementation-owned — and does not exempt the semantic canonical-value/equality profile and its finite limits (C2), which 001 K0 requires K0.1 to actually state. |
| K0.1-C5 | Contradictions between sources (e.g. current code vs. target contract) are called out explicitly and resolved in the Kernel's favor per AGENTS.md, never silently resolved by picking whichever the current implementation already does. |
| K0.1-C6 | The worksheet is versioned (revision marker) and self-contained: a K1.1 implementer can read it without also reading this contract or the full canonical set again for the decisions it covers. |

## Sources and touchpoints inspected in the current tree

Documentation-only packet; "touchpoints" below are read-only evidence, not edited files.

- `docs/kernel.md`, `docs/execution.md` (Driver contract, Progress and native recovery), `docs/mental-model.md`, `docs/README.md`, `docs/detail-design/README.md`, `docs/detail-design/execution-protocol.md`, `docs/detail-design/recovery-and-compatibility.md`, `docs/detail-design/evidence-and-observability.md`, `docs/future-plan.md` (Q3 skim only — confirmed non-blocking per 010).
- `docs/development/{README,001,002,003,004,005}.md`, `006`–`010` (this packet's own governing process).
- Code (read-only): `packages/core/src/execution/{lifecycle,context,resumption,cancellation-request}.ts`; `packages/core/src/ports/{controller,controller-resumption,scheduler,runtime-store}.ts`; `packages/core/src/runtime/{harness,resumption-processor}.ts` (targeted sections: `activate`, `runController`, `applyOutcome`); `packages/core/src/reference/in-memory-runtime-store.ts` (`structuredClone`-based `transact`; the `MailboxState`/`consumed`-cursor mailbox facet, added in review round 1); `packages/core/src/effects/pending.ts` (`PendingOperation`, added in review round 1); `packages/core/src/interaction/event-envelope.ts` (`WakeCondition`, added in review round 1); `packages/core/src/definitions/types.ts` (`DefinitionKind`, added in review round 1).

## Non-goals

- No wire codec, database schema, scheduler algorithm or store implementation choice (007/001 both
  reserve these to K1 implementation and beyond).
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
