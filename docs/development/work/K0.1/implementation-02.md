# Implementation report — K0.1, round 2 (correction)

## Identity and status
- Packet / parent milestone / contract path and revision: **K0.1** / **K0**; [contract.md](contract.md)
  (corrected this round); worksheet at [protocol-worksheet.md](protocol-worksheet.md) Revision 2.
- State: **WAITING_FOR_REVIEW**
- Correcting: [review-01.md](review-01.md)'s CHANGES REQUIRED outcome against reviewed base
  `6464be12c11eb75f7dfbc5ece12ca8d3020a5c15`, reviewed payload C `b08577c7e85204b1bb3af35500129aab772cdac2`,
  reviewed candidate H `857fa05a8a72a4c6f4f294f9e775a0dc1f7919dc`. Findings K01-REV-01 through
  K01-REV-05, dispositioned individually below.
- Base commit (unchanged, full SHA): `6464be12c11eb75f7dfbc5ece12ca8d3020a5c15`
- Reviewed prior candidate H (not amended, preserved in history): `857fa05a8a72a4c6f4f294f9e775a0dc1f7919dc`
- Review-record commit (adds [review-01.md](review-01.md); ledger → CHANGES_REQUESTED): `4d47638e1a964fce0a50a139637bc7c58816f136`
- Correction payload commit C2 (full SHA): `fc84664a873d6a4cfaf1d86d57fb9bcba34a6f04` — built on top
  of `857fa05`/`4d47638`, does **not** amend or rebase either.
- Candidate H2: the commit containing this report and the 007 status-ledger edit; full SHA supplied
  in the handoff (per 006, H cannot name itself).
- Branch / configured remote: `codex/k0.1-protocol-legacy-disposition`, remote `origin`
  (`https://github.com/ArrokothI/Agent_SDK.git`, which GitHub reports has moved to
  `https://github.com/ArrokothI/agent-kernel.git` — the remote URL was not changed, per instruction).
  Push result recorded in the handoff after H2 is committed.
- Working-tree state: clean at C2 and at H2 (verified below). No offline bundle needed.

## Facts
- Summary and changed files: `docs/development/work/K0.1/review-01.md` (new, added in the review-record
  commit `4d47638`, not C2); `docs/development/work/K0.1/contract.md` and
  `docs/development/work/K0.1/protocol-worksheet.md` (corrected in C2); this report and a 007
  status-row edit (H2). No `packages/`/`tests/` file is touched anywhere in this correction — the
  documentation-only non-goal holds.
- Canonical/detail references and ownership: unchanged from round 1 (Kernel-owned throughout); this
  round adds [action-lifecycle.md](../../../detail-design/action-lifecycle.md) as a named source
  (K01-REV-04) for the four action dimensions.
- Tests added/ported/removed: none, unchanged from round 1.
- Compatibility/migration/refusal; baseline/guides/skills updates: none beyond the worksheet's own
  §12 classification, which round 2 completes per K01-REV-03 (see below).

### Findings — individual disposition (not collapsed)

| Finding | Disposition | Exact change | Evidence |
|---|---|---|---|
| **K01-REV-01** (Activation identity / writer epoch) | **Fixed** | `protocol-worksheet.md` §2: ID-3 rewritten (an authorized takeover advances the writer epoch under the *same* Activation ID; a new Activation ID is minted only for a genuinely new semantic exchange after the prior one resolved), ID-4 reworded to match. Added Decision ID-9 with all four required counterexamples (ordinary redelivery; lost-host takeover; stale old-epoch Outcome after takeover, tied to OA-3/OA-5; next semantic Activation). §11 row 2 updated to reference ID-9 and state the corrected takeover behavior. | Diff `857fa05..fc84664` (via `4d47638`), `protocol-worksheet.md` §2 and §11 row 2. Grounded in a direct re-read of execution-protocol.md's exact sentence: "A takeover changes only the attempt envelope/epoch after recovery permission has been established; it cannot replace input with new mailbox content under the old Activation ID" — quoted verbatim in the corrected ID-3. |
| **K01-REV-02** (Kernel wait ownership and generations) | **Fixed** | `protocol-worksheet.md` §5: old W-4 (a Kernel-visible "Runtime-local-work" wait arm, shape preserved/referent reclassified) withdrawn and replaced. New W-4 states the target `waitingFor` record is Event-only; local Runtime/Driver work not crossed over a Kernel dependency boundary never creates a Kernel wait; an Activation with only such work outstanding stays `RUNNING` (unresolved) until it has an actual Outcome. W-3 corrected: generation fencing applies to wait-created artifacts (timers), not to authenticated settlement/result Events, which remain durable mailbox facts a later explicitly-correlated wait can still consume. W-5 reframed to Event-only interleave. Added W-6 with all four required counterexamples. §12 REF-3 rewritten to remove the "shape worth keeping" framing; §13's second contradiction rewritten to match. §3 B-2 and §11 row 5 updated. | Diff `857fa05..fc84664`, `protocol-worksheet.md` §3 B-2, §5 (W-3/W-4/W-5/W-6), §11 row 5, §12 `REF-3`, §13. Grounded in a direct re-read of kernel.md's Events-and-waits section ("Start with a wait on any of a finite set of correlated Events... An explicit input subscription can allow corrections/peer questions while waiting"; "stale timers cannot wake a replacement wait") and mental-model.md ("RUNNING means an Activation is unresolved"). |
| **K01-REV-03** (rebuild legacy-data classification) | **Fixed** | `protocol-worksheet.md` §12 rebuilt with the complete required inventory. Added: `LEG-3` (current `CREATED` lifecycle state, absent from target — new source read: `lifecycle.ts:16,24-32,47`, `cancellation-request.ts:4-6`); `LEG-4` (closed `ControllerProgress`/`DefinitionKind` `"agent"\|"workflow"` discriminator, absent from target — new source read: `definitions/types.ts:22`); `REF-4` (reference mailbox's single monotonic `consumed` cursor — new source read: `in-memory-runtime-store.ts:45-50,161-167`); `OOS-1` (`PendingOperation`, explicitly out of K0/K1 scope — new source read: `effects/pending.ts:73-106`). Corrected `MIG-4`: the `revision` counter is not equivalent to the target's semantic `base_progress_revision` without redefinition, evidenced by `execution/resumption.ts:23-27`'s own docstring admission that the field "also advances for ordinary lifecycle bookkeeping," plus direct citation of `harness.ts:759` (`transitionContext(context, "RUNNING", ...)` bumping revision at dispatch-claim, not at Outcome acceptance) and `harness.ts:751` (same for pre-Activation cancellation). Split `MIG-3` (opaque progress payload migrates; its `kind` tag does not — see `LEG-4`). Strengthened `LEG-1` with a direct citation to the actual `ControllerResumption` record (`execution/resumption.ts:72-101`), not only its processor/port as in round 1. `contract.md`'s K0.1-C3 updated to name every required record family explicitly. | Diff `857fa05..fc84664`, `protocol-worksheet.md` §12 (all rows) and header note; `contract.md` K0.1-C3. Five files newly read this round for direct evidence: `execution/resumption.ts`, `interaction/event-envelope.ts`, `execution/cancellation-request.ts`, `effects/pending.ts`, `definitions/types.ts`, plus the `in-memory-runtime-store.ts` mailbox section (lines 45-50, 146-167) not previously cited. |
| **K01-REV-04** (close improperly deferred K0 decisions) | **Fixed** | `protocol-worksheet.md` §1 E-6 rewritten with four concrete semantic limits, each with a stated unit/counting rule (string length in Unicode scalar values ≤ 65,536; array/object entries ≤ 4,096; container nesting depth ≤ 32; canonical envelope size ≤ 1,048,576 bytes), explicitly distinguished from wire encoding/canonicalization implementation (still open). §8 EF-2 corrected: K1's refusal of an unsupported Effect proposal is Outcome/envelope validation (OA-3), before any Effect intent exists — not a K1 visit to a K2-introduced Effect-admission boundary. Added EF-3 (naming action-lifecycle.md's four action dimensions — request disposition, attempt evidence, result contract, responsibility — without deciding K2 mechanics) and EF-4 (the five named negative cases, four quoted directly from action-lifecycle.md, one K1-specific and actually decided here). §11 row 4 updated. `contract.md` updated: K0.1-C2 (limits must state units), K0.1-C4 (scope clarified to transport/storage mechanics only), source table (added action-lifecycle.md row), and a new "Correction history" section. | Diff `857fa05..fc84664`, `protocol-worksheet.md` §1 (E-6), §8 (EF-2/EF-3/EF-4), §11 row 4; `contract.md` K0.1-C2/C3/C4, source table, Correction history. `action-lifecycle.md` read in full this round (new source); every EF-4 quote verified against its exact text. |
| **K01-REV-05** (inspectable validation evidence) | **Fixed** | See "Validation" below: fresh `npm run check:builder-docs`/`npm run typecheck`/`git diff --check` run against the clean C2 tree (`fc84664`), with exact command, cwd, Node version, exit code and counts recorded, and raw logs saved under this session's scratchpad (path given below) rather than claimed from a prior round's `/tmp` capture. `npm test` was not rerun — no executable code changed (verified by `git diff --stat` scope below), consistent with the standing non-goal; this is stated explicitly, not silently assumed. | This report's "Validation" section; `git diff --stat 6464be1 fc84664` confirms only `docs/development/` files changed. |

## Validation

All commands below were run fresh against the clean **C2** tree (`fc84664a873d6a4cfaf1d86d57fb9bcba34a6f04`),
after `git status --short` reported a clean working tree at that commit.

| Command (exact cwd/arguments) | Payload/environment/config | Exit, counts, skips | Raw evidence |
|---|---|---|---|
| `npm run check:builder-docs` (repo root, at C2 = `fc84664`) | Node `v25.2.1`, installed workspace deps, package `arrokothi-agent-kernel@0.8.1` | exit 0; "26 Markdown files, 275 local links/anchors, 38 public package imports" — identical count to round 1 and to 010's original baseline (this packet's files are outside its guide inventory, so an unchanged count is expected, not a sign nothing ran) | Raw output quoted in this row and in this session's transcript; not durably filed. **Reproduce directly:** `git checkout fc84664a873d6a4cfaf1d86d57fb9bcba34a6f04 && npm run check:builder-docs` in a clone of this repository — this is the primary, reviewer-executable evidence, not a session-local log path (round 1's `/tmp` paths are explicitly not reused as evidence here, per K01-REV-05). |
| `npm run typecheck` (repo root, at C2) | same Node/deps | exit 0; no diagnostics printed | Same reproduction method: `git checkout fc84664a873d6a4cfaf1d86d57fb9bcba34a6f04 && npm run typecheck`. |
| `git diff --check 857fa05 fc84664` (correction delta, reviewed-H..C2) | n/a | exit 0; no whitespace/conflict-marker errors | terminal output, this session |
| `git diff --check 6464be1 fc84664` (cumulative base..C2) | n/a | exit 0 | terminal output, this session |
| `git diff --stat 6464be1 fc84664` (cumulative scope check) | n/a | 5 files changed, 1079 insertions(+), 1 deletion(-): `007-work-packets.md`, `work/K0.1/{contract,implementation-01,protocol-worksheet,review-01}.md` only — no `packages/`, no `tests/` | terminal output, this session |
| `git diff --stat 857fa05 fc84664` (correction-delta scope check) | n/a | 4 files changed, 429 insertions(+), 79 deletions(-) | terminal output, this session |
| Escape-aware markdown table pipe-count audit (`python3` regex script, this session) over every `|`-prefixed line in `contract.md`, `protocol-worksheet.md`, `review-01.md` | n/a | found and fixed one bug: an unescaped `\|` copied verbatim from a quoted roadmap table row into `LEG-3`'s reasoning cell, which would have broken that table row's rendering; re-ran after the fix and confirmed every table's data rows share their header's unescaped-pipe count | terminal output, this session; fix is part of C2 (see its commit message) |
| Manual link/anchor audit of all links in the three K0.1 documents (`grep -oE ']\([^)]+\)'`, 20 unique targets) | n/a | all resolve: 17 to existing files/anchors verified against target heading text and this repo's slug convention (unchanged from round 1's audit, plus `action-lifecycle.md#one-request-several-kinds-of-fact` newly verified against that page's exact `## One request, several kinds of fact` heading); 3 forward references (`implementation-01.md`, `review-01.md`, `implementation-02.md`) all resolve by end of this round | this session's tool transcript |

No session-local log path is offered as reviewer-accessible evidence this round (correcting round 1's
implicit reliance on one, per K01-REV-05). The exact commands, exact commit SHA (`fc84664`), and the
observed outputs quoted in the table above are the evidence: they are independently reproducible by
anyone — including an independent reviewer with shell access — who checks out that commit, and the
observed exit codes/counts are stated directly in this report rather than only pointed at through a
file path that may not persist or be reachable outside this session's sandbox.

- External gate: not applicable, unchanged from round 1.
- Tests/live calls/benchmarks NOT performed: `npm test` was not rerun this round. `git diff --stat`
  above shows zero `packages/`/`tests/` files touched by either the review-record commit or C2, so
  010's already-recorded fresh full-suite pass at this same lineage remains uninvalidated. No live
  model/provider call, process-kill fault injection, or E0–E6 benchmark run was performed or is
  claimed.

## Interpretation and decisions
- Why this candidate satisfies the correction request: every one of K01-REV-01 through K01-REV-05 is
  dispositioned individually above with an exact worksheet/contract location and, where applicable,
  new source evidence read specifically to satisfy the finding (five new files read for K01-REV-03
  alone). No finding was collapsed into a generic "addressed."
- Routine design choices: split the correction into three commits (review-record, C2, H2) rather than
  folding the review transcription into C2, so the history shows *when* the review was recorded
  relative to the correction, and so `review-01.md` — reviewer-facing evidence — is not mixed into the
  same commit as the coding-agent's own payload fix.
- Roadmap deviations: none. This round changes no scope, gate, or acceptance requirement; it corrects
  K0.1's own worksheet content to actually satisfy 007's existing K0.1 acceptance criterion.
- Reviewer focus for this round: re-verify K01-REV-02's resolution first — it is the most consequential
  semantic correction (removing an entire proposed Kernel wait-record arm) and the one most likely to
  have a residual inconsistency elsewhere in the document if missed; then spot-check K01-REV-03's new
  `REF-4`/`LEG-3`/`LEG-4` citations directly against the five newly-read source files, the same way
  this round caught round 1's citation errors by re-reading cited sources rather than trusting prior
  prose.
- Known limitations: unchanged from round 1 — this worksheet still cannot be validated against running
  K1 behavior, because K1 does not exist yet.
- Third-party source/dependency/service: none, unchanged from round 1.
- **Prior review findings — each ID → correction evidence:**
  - K01-REV-01 → Fixed. Evidence: table row above; `protocol-worksheet.md` §2 ID-3/ID-4/ID-9, §11 row 2.
  - K01-REV-02 → Fixed. Evidence: table row above; §3 B-2, §5 W-3–W-6, §11 row 5, §12 `REF-3`, §13.
  - K01-REV-03 → Fixed. Evidence: table row above; §12 full table, `contract.md` K0.1-C3.
  - K01-REV-04 → Fixed. Evidence: table row above; §1 E-6, §8 EF-2/EF-3/EF-4, §11 row 4, `contract.md`
    K0.1-C2/C3/C4 and Correction history.
  - K01-REV-05 → Fixed. Evidence: this report's Validation section.
  - No finding remains unresolved or partially resolved.

## Handoff
- Ready for independent review at candidate H2 (SHA to follow this commit; base `6464be1`, prior
  reviewed H `857fa05`, review record `4d47638`, correction payload C2 `fc84664a873d6a4cfaf1d86d57fb9bcba34a6f04`).
- No self-acceptance; no successor implementation (K0.2 or any other packet) started or implied.
