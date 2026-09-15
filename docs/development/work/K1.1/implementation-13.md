# Implementation report — K1.1, round 13

## Identity

- **Packet / parent:** K1.1 / K1. **Contract:** [contract.md](contract.md), **revision 5 (unchanged).**
  **Governing process baseline:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b` (B), including
  006/007/008/012/015 as they stand there.
- **State:** correction loop `IN_PROGRESS`; `WAITING_FOR_REVIEW` is claimed on the basis below, only
  after the single open P1 finding was corrected against regenerated evidence. No self-acceptance.
  **Owner release:** explicit instruction on 2026-09-14 ("Let's release K1.1") through
  [Prompt A](../../009-universal-prompts.md#prompt-a--coding-agent); correction rounds on a released
  packet need no renewed permission under 006. **Do not release or begin K1.2.**
- **Prerequisite ACCEPT and integration:** K1.0 with corrections 01–02, integrated as `main` PR #21 /
  `9baff3a03662720af6eefe1ecfabc41fde99298f`, receipts [K1.0](../K1.0/integration-01.md) and
  [K1.0-correction-02](../K1.0-correction-02/integration-01.md), ledger-reconciled by `main` PR #26 /
  `05f48c204d1eae021b3464c206e5c11e84bb3505`. Both verified as ancestors of the C11 checkout in
  [`01-tree-and-environment.log`](validation-13/01-tree-and-environment.log).
- **Branch / remote:** `codex/k1.1-create-reserve-async-dispatch` on `origin`.
- **Base commit B:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b`.
- **Payload C11 (NEW):** `f117e6b47c4930af6735aaa3668b8b4c242fd76d`. Nine files, all inside the K1.1
  packet zone: `packages/kernel/src/coordinator.ts`, `identity.ts`, `refusal.ts` (the ownership
  correction) and `packages/kernel/tests/receipts.test.ts` (rewritten leak-pinning case, unmasked
  hidden-vs-missing assertions), `nondisclosure.test.ts` (new 14-case oracle),
  `creation/dispatch/ingress/inspection.test.ts` (unmasked hidden-vs-missing assertions only).
  `git show --stat C11` is the proof; no source, test, contract or configuration outside those nine
  files is in C11.
- **Reviewed candidate this round corrects:** H12 `a047283523f7487cc025f4cf58d17028caad6389`
  (payload C10 `d1fcffdf8b3f411ecde28ae0b14fe79523dfcc14`).
- **Authoritative review record:** [review-11.md](review-11.md) (OpenAI ChatGPT, GPT-5.6 Sol, High
  reasoning; `CHANGES REQUIRED`: C6/C9 FAIL on the new P1 **K11-R12-ID-01**, all other prior
  findings reconciled as remaining closed on their narrow invariants), recorded at
  `e2d62d1459fe662d8f0ef936f46216bde66eab3f`.
- **Previously reviewed candidates and reviews, all preserved as ancestors of C11:** C `8cd9e269` /
  H `0f345b3c` / review-01; C2 `6b7e5fb0` / H2 `297cc56f`; C3 `615cdf88` / H3 `b3cdf337` / review-02;
  C4 `1d4e4867` / H4 `156f1353` / review-03 + supplement-01; C5 `e0660eff` / H5 `bd2dab6d` /
  review-04; C6 `b3d0d59f` / H6 `417798a3` / review-05; C7 `e59bd312` / H7 `ae02c32a` /
  review-06-supplement-01 + review-06; C8 `79151afc` / H8 `c1e7d78a` (superseded before review,
  preserved); C9 `5ac76207` / H9 `5dddc2ad` / review-07 (CHANGES REQUIRED, preserved);
  C10 `d1fcffd` / H10 `2cdb1e2` / review-08 (CHANGES REQUIRED, preserved);
  H11 `ccc0140` / review-09 (CHANGES REQUIRED, preserved); H12 `a0472835` / review-10 (ACCEPT for
  H12 only, preserved — it certifies the H12 evidence correction over unchanged C10, not this
  payload) / review-11 (CHANGES REQUIRED, preserved).
  Nothing was amended, rebased, squashed, force-pushed or reset this round.
- **Candidate H13:** the commit containing this report. Its full SHA and the verified advertised
  remote SHA are in the external handoff, not here: a report cannot certify its own future push.
- **Exact C11..H13 administrative file allowlist for this commit:** this report
  (`docs/development/work/K1.1/implementation-13.md`), `docs/development/work/K1.1/validation-13/`
  (MANIFEST plus ten declared output-only logs, force-added with `git add -f` because root
  `.gitignore` ignores `*.log`), and the K1.1 row corrections in
  `docs/development/007-work-packets.md`. (The C11..H13 range also spans the C11 payload commit
  itself; that is ancestry, not this commit.) No production source, test, script,
  fixture, evaluator rule, threshold or configuration is in this commit; the payload stays C11.
- **Working-tree state:** validation ran in a detached `git worktree` at exactly C11
  (`/tmp/k11-c13-validation`, `node_modules` symlinked), where `git status` showed only
  `?? node_modules` before, during (between ablations, after each revert) and after the runs. In
  the main checkout, uncommitted modifications under `mental-model/` (wording-only docs work
  outside this packet, observed growing during the round as concurrent authoring continued)
  remain **unstaged and uncommitted** in H13; neither C11 nor H13 contains them, verified by the
  staged file lists. H12/review-10/review-11 ancestry is preserved normally.

## Changes and coverage

### K11-R12-ID-01 (P1) — coordinator-global receipt/refusal positions disclosed inaccessible activity: corrected by ownership change

The review's defect is quoted exactly: C10 kept one mutable counter on the entire
`ExecutionCoordinator` (`#acceptancePosition`), incremented by every accepted
creation/input/dispatch (`#mint`) and every protocol refusal (`#refusal`, including refusals
naming no visible Execution), and exposed the number as `Receipt.position` and inside
`Receipt.token` (`crt:<n>` etc.), with `execution-N`/`event-N` identities off further shared
counters — so caller A could count hidden caller B's activity from A's own authorized receipt.
The required outcome: scoped non-disclosure across the complete accepted-evidence path, while
preserving exact replay, boundary-specific naming, retained immutability, hidden-vs-missing
indistinguishability and authorized ordering at its proper owner.

The correction was derived first (governing owners, information-flow audit over every externally
observable monotone value, ownership-model comparison, historical checklist, dependency map) and
written once, by a single writer, after synthesis. The information-flow audit found **three**
independent global sequences, not one: the acceptance/refusal counter, the execution counter and
the event counter. Fixing only `position`/`token` would have left an ID-gap oracle of the same
class, so all three are corrected together:

1. **Acceptance order lives on the owning Execution record** (`coordinator.ts`: `ExecutionRecord`
   keeps `nextAcceptancePosition`; creation consumes 1; each later accepted input-ingress or
   dispatch-intent on that Execution consumes the next via `#mint(boundary, record)`; replay and
   redelivery consume none and return the retained receipt). The mailbox entry shares its
   decision's number (`acceptancePosition: receipt.position`) instead of consuming a second one.
   This is the canonical "owning record/domain, not a global clock" (`identity.md`) implemented
   where the order already partially lived (per-Execution mailbox positions); dispatch intents now
   consume a number too, so same-Execution mailbox subsequences can gap exactly where that
   Execution's own dispatch receipt sits in the same inspection view — same-record truth, no
   cross-record clock.
2. **Refusals carry the owning Execution's own refusal index** (`nextRefusalPosition`, first
   recorded refusal is 1) **sharing nothing with the acceptance index** (`refusal.ts` documents
   the split). A refusal that names no Execution concerns no record and orders against nothing:
   position 0, identically for hidden and missing records, advancing nothing.
3. **Execution, Event and token identities are pure functions of the request identity that named
   them** — `execution-${creationKeyIdKey(...)}` from the caller-scoped creation key,
   `event-${inputIdKey(...)}` from the Input ID triple, `token = prefix:executionId:position`
   (`mintReceipt` takes the owning Execution). Each principal's observable values are therefore
   functions of its own requests only: no counter, clock or sequence anywhere in the evidence
   path advances for activity elsewhere. Injectivity is inherited from the length-prefixed packing
   (same triple replays to the same identity; different content conflicts; fresh keys and
   cross-producer/cross-destination triples stay distinct). Token spelling and ID spelling remain
   implementation choices per `identity.md`; cross-Execution numeric position equality is
   expressly permitted by "not a global clock", and the C6 "none equal to another" row still holds
   (per-Execution positions 1/2/3 with distinct `crt:/inp:/dsp:` prefixes and Execution-scoped tokens).

No Layer-3 owner changed: the implementation now conforms to the existing canonical rule, so no
mental-model edit belongs to this packet (and none is included). Contract revision 5 is unchanged:
no criterion or coverage row as written mandates a coordinator-global sequence — C6's rows are
single-Execution ("three receipts, each naming its own boundary; none equal to another; replay
returns the original"; "receipt set unchanged after each [refusal]"; "identical answers"), C4's
batch row requires a per-Execution acceptance-order prefix (preserved), and C9's inert/scoped rows
are preserved and strengthened (hidden-vs-missing refusals are now byte-identical).

### Tests added, changed and retired

- **New `packages/kernel/tests/nondisclosure.test.ts` (14 cases):** the class oracle. A fixed A
  schedule (create → create-replay → input → input-replay → conflict → dispatch → redeliver →
  inspect) runs on fresh coordinators with and without interposed B-only windows, and the full
  A-observable transcript (results, receipts, tokens, positions, IDs, replay/conflict records,
  inspection view, listing, JSON serializations) must compare deep-equal, with per-Execution
  contiguity asserted absolutely (creation 1, input 2, dispatch 3, mailbox [1,2], first refusal 1).
  Windows cover: one and many hidden accepts (create/ingress/dispatch/redeliver across hidden
  Executions), hidden activity before A's first operation, hidden attached refusals (creation
  conflict, malformed input, bad bound), hidden null-record refusals (missing destinations,
  malformed scope/key, unauthorized scope incl. a probe at A's own scope, inspection of A's
  Execution), mixed accepts/refusals, same-namespace hidden-scope producer with identical key text,
  striped multi-Execution hidden work, multi-Execution A schedules, hidden input conflict /
  exchange-unresolved / no-unresolved-exchange / capacity exhaustion, same-scope refusal isolation
  (two same-scope Executions each record position 1), and unmasked hidden-vs-missing equality.
- **Rewritten `receipts.test.ts` null-record case:** "the two refusals cost the same position"
  pinned the leak (global counter costs 1 for hidden and missing alike) and is replaced by
  "refusals that name no Execution advance nothing observable" (hidden-vs-missing deep-equal
  including position 0, plus the author's next acceptance still at position 2).
- **Unmasked hidden-vs-missing assertions** in `receipts/creation/dispatch/ingress/inspection`
  tests: six `{ ...x, position: 0 }` masks replaced by full deep-equal plus explicit `position == 0`
  assertions, so a global smuggled into any null-record path fails instead of being normalized away.
- **Retired:** only the leak-pinning assertions above. No other test was added, removed, weakened
  or retired, and no threshold moved. Packet suite moves 207 tests / 44 suites → 221 / 45;
  `npm test` moves 2,265 / 345 → 2,279 / 346; every other figure is identical to round 12.

### Prior findings

| ID | Disposition |
|---|---|
| **K11-R12-ID-01** | **Corrected this round** (ownership model above + oracle + unmasked assertions + X9 ablation). |
| K11-R10-EVID-01 | Remains closed; H12's evidence correction is preserved and this round's evidence follows the same self-consistent, reproducible shape. |
| K11-R10-DOC-01 | Remains closed; no live prose touched except the 007 row this packet owns. |
| **K11-R7-STATE-03** | Remains closed; reconstruction untouched, directional ablations XA/XB rerun with byte-identical rejection sets. |
| K11-R6-STATE-02 / VAL-04 / VAL-05, K11-R5-STATE-01 / VAL-03, K11-R4-DISP-01 / PROC-01, K11-R2-VAL-02 / EVID-01, K11-R1-*, K11-R3-*, K11-R4-* | Remain closed; the rerun re-proves the suites that guard them with zero failures, and the X1/X7/X3/X4/X8 ablations reject with byte-identical case-name sets to H12 — the ownership correction disturbed no previously closed guard. K11-R1-ID-01 remains closed on its narrow control-path invariant; its broader family is what K11-R12-ID-01 closes at the evidence-content level. |
| review-10 ACCEPT (H12) | Retained as historical for H12 only. It certifies an evidence correction over unchanged C10 and does not transfer to C11; every criterion is re-assessed below as implementer assessment on the new payload. |

### Self-found defects this round (separate provenance from the reviewer's finding)

- **Double-consumed acceptance index (found during implementation, before any commit):** the first
  composition minted the ingress receipt via `#mint` (advancing the Execution index) and then read
  `record.nextAcceptancePosition` again for the mailbox entry, yielding entry position 3 for the
  first ingress instead of 2. Fixed by giving one accepted decision one number (entry shares
  `receipt.position`). Caught by the existing `ingress.test.ts` contiguity assertion, not by a new
  test.
- **Test-scaffolding defects (found by running the new oracle, before any commit):** the hidden
  window runs twice per arm (rounds 0/1), so round-constant hidden keys turned the second
  dispatch into `exchange_unresolved` and identical-content "conflicts" into replays; fixed with
  round-suffixed hidden keys and a genuine different-content conflict helper. No source change.
- **Coverage gaps (found by the fresh adversarial review wave, before validation):** masked
  `position: 0` comparisons in six hidden-vs-missing assertions, uncovered hidden refusal paths
  (input conflict, exchange states, capacity, malformed creation key, inspect-as-hidden-caller)
  and the missing same-scope refusal-isolation case. All closed with the additions above; the
  sensitivity of each was verified by mutation (a read-only global in null refusals fails 10
  cases across six files; the full X9 battery fails 26).

## Validation and interpretation

Every command ran in the detached worktree `/tmp/k11-c13-validation` at exactly
C11 `f117e6b47c4930af6735aaa3668b8b4c242fd76d` (`node_modules` symlinked; otherwise clean), on
Node v25.2.1 / npm 11.6.2 / TypeScript 5.9.3 / Darwin 25.6.0 arm64, from that worktree's repository
root. Exit codes, counts, raw paths and SHA-256 digests are in
[`validation-13/MANIFEST.md`](validation-13/MANIFEST.md).

| Command | Exit | Result |
|---|---|---|
| `npm run typecheck` | 0 | clean |
| `npm test` | 0 | 2,279 tests, 346 suites, 0 fail, 0 skipped |
| `npm run test:conformance` | 0 | 1,949 tests, 283 suites, 0 fail |
| `npm run test:kernel` | 0 | 221 tests, 45 suites, 0 fail |
| `npm run test:sdk` | 0 | 22 tests, 0 fail |
| `npm run check:builder-docs` | 0 | 26 files, 286 links/anchors, 38 imports |
| architecture suite (TAP) | 0 | 362 tests, 37 suites, 0 fail |
| packet case inventory (TAP) | 0 | 221 tests, 45 suites, 0 fail, every case named |
| control + 8 one-behaviour ablations | 0 | control clean (221/0); **8 of 8 rejected** by named cases |

**Reran versus inspected history.** Everything in the table above was **rerun on clean C11** in the
detached worktree; none of it is carried over, including from `validation-12/`. **Inspected, not
rerun:** the prior payload/report/review commits and the K1.0 prerequisite integrations, checked by
`git merge-base --is-ancestor` in `01-tree-and-environment.log`; prior `validation-01/.../12` logs,
which remain committed as their own rounds' evidence and are **not** claimed as this candidate's
reruns.
**Mechanical self-checks (and why they bind).** Generation runs under
`set -euo pipefail`, so the `11`-file agreement check, the `17`-export assertion, the control-green
check, the per-ablation rejection check (parsed `ℹ fail >= 1` from that ablation's own output) and
the post-revert HEAD-plus-cleanliness checks abort the run before any candidate exists — a mismatch
cannot reach a manifest by transcription slip. After finalization, every manifest token was
programmatically compared against a fresh SHA-256 recomputation over the exact staged file,
length-checked at 64 hex characters. Both procedures are recorded in the manifest so the next
reviewer can repeat them rather than trust them.
**Implementer-only auxiliary probes (not validation evidence):** the two sensitivity probes and the
ablation-script dry runs described above and in the manifest — disclosed, reverted with zero
residue verified, claimed as nothing. The committed X9 is the per-coordinator-global battery
recorded in `09b` with its actual 26-case rejecting set.
**Checks not run, and the resulting limits.** `npm run test:evals` was not run: 006 requires it for
Agent behaviour, and neither C11 nor this round touches any Agent, model path or eval
fixture. No process-kill run: this packet makes no persistence or process-failure claim. No native
Driver, packaging or release check. So nothing here supports a durability, isolation,
native-fidelity, release or E-gate claim.

**External fixture / gate / decision:** none prepared, none executed, none claimed. E0–E6 are the
benchmark repository's.

### Why the evidence supports each criterion — implementer assessment, not acceptance

C1 (atomic creation, lost-response rows, conflict, fresh-key distinctness, cross-caller key
separation) and C2 (triple identity, replay/conflict, terminal/capacity/unknown-vs-invisible
refusals) hold under derived deterministic identities: same scoped identity replays to the same
Execution/Event, different content conflicts, fresh keys and cross-producer/cross-destination
triples stay distinct by packing injectivity — with the new oracle proving hidden activity moves
none of it. C3 (one-capture values, JCS bytes, limits) is untouched and re-proved. C4 (pinned
intent, reservation-acks-nothing, bound, driver survival, asynchrony, one unresolved exchange) and
C5 (exact redelivery excluding later arrivals) hold with per-Execution acceptance order preserved
at the owning mailbox. C6 now holds as written: three per-boundary receipts naming boundary and
position with distinct tokens, exact replay returning the original, refusals minting none, scoped
reads byte-identical. C7/C8 are untouched and re-proved. C9 now holds as written: inert
deep-equal inspection exposing retained truth, scoped exactly like C6. C10 holds: the 11-file /
17-export / exact-`canonicalize` boundary is re-measured in `01` with the same definition, command
and self-checks. Per-criterion verdicts remain the next independent reviewer's to
give; nothing here is marked ACCEPTED.

### Design choices, assumptions and the strongest remaining risk

Routine choices under 007: (a) **per-Execution rather than per-scope ordering** — a per-scope
counter would still let one Execution's evidence count another Execution's decisions in a shared
scope, and the canonical owner is the record/domain, not the scope; the same-scope refusal
isolation case pins this; (b) **deterministic derived identities over random ones** — every
A-observable value stays a pure function of A's own requests, which is what makes the cross-arm
deep-equal oracle exact rather than statistical, and keeps the suite fully reproducible; the cost
(longer IDs embedding packed request parts, visible only to authorized scopes) is cosmetic;
(c) **null-record refusals advance nothing** rather than a separate global probe counter — there is
no record for them to order against, and any sequence they advance is observable to probers;
(d) **regeneration over in-place repair** — `validation-12/` stays sealed as its round's record,
and `validation-13/` is a fresh rerun, so no log is ever claimed rerun when it was only inspected.

Trust boundaries are unchanged from round 12. The strongest remaining risk is the one this round
shares with every information-flow correction: the audit is only as complete as its enumeration of
observable channels. The countermeasure applied here is to make the oracle compare the *entire*
A-observable transcript (results, receipts, tokens, positions, identifiers, replay/conflict
records, inspection, listing, serializations) rather than named fields, so an unenumerated channel
carrying hidden activity still fails the deep-equal — but a channel no schedule exercises (e.g. a
future boundary added without an oracle arm) would not. Extending the oracle arms is the required
response when later packets add caller-visible evidence.

### Third-party review under AGENTS.md

**No new third-party code, test, script, asset, dependency or service was copied, adapted, vendored
or added this round.** `packages/kernel/package.json` still declares exactly `"canonicalize": "3.0.0"`
with the same pinned tarball and integrity; neither file is touched by this round at all. The
Apache-2.0 record and round-3 owner approval stand unchanged.

### Reference maintenance ([008](../../008-implementation-report.md))

**No Layer-3 owner changed, and none needed to.** The correction implements the existing canonical
"owning record/domain, not a global clock" rule; source comments now cite it where the previous
global lived. The only documentation touched besides this packet's own records is the K1.1 prose/row
in `007-work-packets.md`, which 007 owns. The sealed records ([review-10](review-10.md),
[review-11](review-11.md), [implementation-12](implementation-12.md),
`validation-12/`) are not altered. No contract change, no policy change, no placeholder resolution.

## Handoff

- **Ready for independent review** on the corrected candidate. The single open P1 finding from
  [review-11.md](review-11.md) is corrected with the ownership model above, proved by a 14-case
  cross-principal oracle plus unmasked hidden-vs-missing assertions across six files, with the
  full command-plan rerun green on clean C11 and 8 of 8 ablations rejected (seven legacy batteries
  byte-identical to H12, plus the new X9 global-sequence battery); the digest table is
  programmatically verified; and no known mandatory defect, unresolved owned semantic case or
  missing result remains. That is the basis for `WAITING_FOR_REVIEW`; it is not acceptance.
- Base B, new payload C11 and candidate H13 with the verified advertised remote SHA are
  supplied in the external owner handoff after the push, not in this report. H12 is superseded as a
  candidate and must not be reviewed in place of H13; it is preserved as an ancestor.
- **No self-acceptance.** Every criterion assessment above is the implementer's. The verdict is an
  independent reviewer's, bound to the exact candidate.
- **No successor release.** K1.2 is not begun and is not released; `next_release: none`.
