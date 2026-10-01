# Implementation report — K1.2, round 4 (correction)

## Identity

- Packet: K1.2 — Outcome acceptance and receipts; parent milestone K1. [Contract](contract.md) revision 4 (round-4: DEC-10 inventory wording now names the retained accepted-Outcome wrapper and excludes the answer projection; DEC-18 records the new `authority` discriminator; new DEC-20 attempt-bound submission authority; coverage rows for AUTH-02/HISTORY-02/DOC-inventory and 25 ablations; stable criterion IDs C1–C15 preserved; DEC-1–DEC-19 otherwise verbatim).
  Governing process baseline: `a20d278185eaffc7f8b7489345a3624231ff6e6d` (006/007/008/012 as they stand there).
- State: WAITING_FOR_REVIEW (this report). Owner release: 2026-09-16, start hold lifted 2026-09-24 with the B-5 scope amendment (007 status row), and the owner's Prompt A instruction of 2026-09-24.
  Prerequisites: K1.1 (with correction-01 and reference-01) accepted at H `52b1600f3b42e3a360fdc3395178f1d147edf304`, integrated `b53ccb48a8fd4b9d0b0028fc11e925d563e284fa`; K1.1-correction-02 accepted at H `719abbf9e55e7489b6255a08cbb9e97a1e960a5e`, integrated `954d31b00eb7` (PR #36). Both integrations are ancestors of the base.
  Prior rounds: C1 `4babb6ee9550479c09e75d80cb8c17e8fc042b18` / H1 `3b88d32733b89f32744251d71b2d70a8684ccd55` / review-01 (A1 `0c0e644b9c9e621da6a3cd02732f50949f1c0744`); C2 `c395abfb27c4a0bc7d5c18ed1d9edd2b8b840c47` / H2 `da371b6a09d65b0242010d4fe46e51d64c9e2fbd` / review-02 (A2 `19d77004b3d8fb9d2cbba9524770c250700016a9`); C3 `5797bde3df2f3b6f91f255a0b08a6b42ad2d134d` / H3 `51d30370ef041106969dc75682ddf37081be1a34` / primary review-03 plus authoritative merged reconciliation `review-03-merged.md` (recorded across `206dcc1`, `ee3b514`, and merge head `7f08677e617457683a55d5b6c51661ec690f613f`, the branch head this correction starts from).
- Author: Muse Spark session, 2026-09-25, correcting the same released packet K1.2 on branch `claude/k1.2-outcome-acceptance-receipts` under the merged round-3 handoff. No successor packet, no merge to main, no self-accept. No `BLOCKED — ARCHITECTURE DECISION` was raised: the correction implements the existing Runtime/Driver/Kernel relationship (an attempt-bound capability delivered with the Activation) rather than choosing a new architecture, and it does not define visibility as proposal power.
- Branch `claude/k1.2-outcome-acceptance-receipts` on remote `origin` (`https://github.com/ArrokothI/arrokothi.git`). Base B = `a20d278185eaffc7f8b7489345a3624231ff6e6d`. Payload C4 = `da82de9de1e51c4b1980e4450a6daf1126945ad2` (substantive source/tests/contract/baseline/reference/ablation changes only).
- Candidate H4: the commit containing this report; its full SHA is supplied in the owner handoff.
- C4..H4 allowlist: this report (`implementation-04.md`), `validation-04/01-tree-and-environment.txt` through `validation-04/08-ablations.txt` (raw command output about clean C4 only, every file independently naming C/base/branch/command/environment/config/digest per 006, including 01), and in `docs/development/007-work-packets.md` the K1.2 status row update to WAITING_FOR_REVIEW. No package, test, script, mental-model or contract payload changes occur in C4..H4. Round-1/2/3 evidence (`validation-01/02/03`) untouched in place.
- Working tree clean at C4 (verified via `git status --porcelain` empty before evidence capture; the 01 attachment's own status section reproduces that empty output plus HEAD=C4). Push: pending at the time this report was written; the verified remote SHA is supplied in the handoff, not claimed here.

Departures: none beyond the `claude/` branch prefix carried from rounds 1–3 (006 says "normally"; no owner branch instruction).

## Changes and coverage

**Change groups.** Full cumulative diff: `git diff a20d278 da82de9` (73 files, +30,141/−395; rounds 1–3 payload and evidence plus this correction). Correction delta `git diff 7f08677 da82de9` (28 files, +1,182/−355; this round only).

| Group | Files | Governing sources |
|---|---|---|
| Attempt-bound submission authority (AUTH-02) | `packages/kernel/src/driver.ts` (`SubmissionGrant`, 3rd `deliver` arg), `coordinator.ts` (per-epoch grant mint/store/retire, `submitOutcome` grant check → `unauthorized_submission`), `refusal.ts` (new classification), `index.ts` (type export) | `execution-cycle.md` (Kernel sends Activation through Driver; Runtime returns Outcome; delivery boundary), `identity.md` (attempt/epoch/fencing), `evidence.md` (inspection grants no re-execution power), C10 (hold-ending Outcome from the current attempt) |
| Truthful history attribution (HISTORY-02) | `inspection.ts` (`authority` discriminator + docs), `coordinator.ts` (all construction sites) | `state.md#execution-history`, `evidence.md` (authenticated recorded commands); C12/C10 |
| Accept construction inventory (DOC-01) | `coordinator.ts` (prebuilt `stored` wrapper; `#accept`/header inventory comments), `contract.md` DEC-10, `002` baseline, `mental-model/rewrite-index.md` §4 | `execution-cycle.md#atomic-decisions-across-the-system`, WS §7 Left open; C15/C4 |
| Tests | new `submission-authority.test.ts` (8), `history-attribution.test.ts` (5); grant threading across 13 existing suites; `control-authority` observer-Outcome test reworked to the new boundary; `transaction` E/F assert history authority | 012 deterministic execution + normative decisions + narrow race/fault |
| Ablations | `work/K1.2/ablations.mjs` (B8 authority collapse, B9 attribution-to-control; A10 extended in round 3; `--test-reporter=spec` kept) | 012 distinguishing power |
| Contract/coverage | `work/K1.2/contract.md` rev 4 (DEC-10/DEC-18/DEC-20, C10 submission-authority row, history rows, 25 ablations; IDs stable) | 006 contract ownership |
| Baseline/reference | `002-implemented-kernel-baseline.md` (submitOutcome order, grant/takeover/history/transaction bullets); `rewrite-index.md` §4 transaction bullet (retained-record enumeration + answer-projection exclusion; no status, no marker change) | 006 reference maintenance |

**Selected 012 methods.** Deterministic execution (primary: Driver-held grants, forged/absent/retired-grant arms, whole-result + forbidden-mutation assertions), normative decisions (replay/conflict-before-authority per OA-2; stale/terminal-before-authority so fencing vocabulary preserved; grant-then-content; duplicate/absent/retired/forged grant shapes), race/fault narrowly (Outcome vs takeover, Outcome vs code/protocol hold, Outcome during `isSafeToReplace`, takeover-then-stale-grant, replay after resolution/next/terminal, unauthorized caller before/after takeover, hold-ending Runtime Outcome without control power — all on one in-memory coordinator; no persistence/process-death claim), process/documentation (inventory/guard, BASELINE, markers, C/H/evidence identity). Excluded as in contract: native Driver fidelity (R1), external E gates (K1.4), packaging (private zone), `test:evals` (no Agent/model path).

## Complete Outcome authority model (K1.2-DEC-20)

An Outcome is a proposal from the Runtime answering the Activation the Driver delivered — never from bare inspection. The binding establishes who may validly answer the current Activation as follows:

1. **Mint.** Dispatch mints one frozen `SubmissionGrant` for epoch 1; each accepted takeover mints a fresh one for the new epoch and retires the old. The grant carries the attempt coordinates as readable routing fields, but those fields authorize nothing.
2. **Deliver.** `#deliver` hands the current attempt's grant to the Driver with the Activation and reporting capability. Redelivery preserves the attempt and re-presents the same grant. Grants are never exposed through inspection.
3. **Submit.** `submitOutcome(caller, envelope, submission)` still requires scope visibility first (OA-1; hidden≡missing, no record), then answers exact replay/conflict from retained evidence (OA-2 order, no grant needed — both commit nothing and reveal only what inspection exposes), then terminal/currency checks (so takeover fencing keeps `stale_exchange`/`terminal_destination`), then the grant: reference identity against the exchange's current grant. A forged look-alike, a retired grant, or no grant is refused as `unauthorized_submission` — recorded on the visible Execution, with zero accepted-state mutation beyond that refusal — so it cannot win, clear holds, or end the Execution. Content validation follows only for grant-holding proposals.
4. **Fencing preserved.** An old epoch's content is `stale_exchange` whether presented with the retired grant or the current one (currency precedes authority); an old grant with current content is `unauthorized_submission` (it proves nothing about the current attempt); only the current grant with current content reaches validation.
5. **No conflation.** The grant is not general control power: a grant-holding principal without `controlScopes` can answer the attempt but still receives `unauthorized_control` from takeover/recover/report. Control checks are untouched. This is not K2 policy — one unforgeable reference per attempt, no token format, grant language, or backend.

## Complete #accept construction inventory (K1.2-DEC-10)

Every application-level object or retained record constructed by `#accept`, classified:

- **Pre-apply retained decision records** (built from Kernel data only, before any accepted-state mutation): the `outcome_acceptance` receipt (position read, committed later); per-Emission records and IDs; the terminal result; the acknowledgment/terminal dispositions; the acknowledged/ended ID lists; the resolved exchange; the Outcome decision; any hold-ending history records; the retained `AcceptedOutcomeRecord` wrapper binding the captured identity to the decision.
- **Transient planning allocations** (not semantic records): the acknowledge/end entry lists, the batch-membership closure, loop indices.
- **Apply-phase retained insertions/mutations only** (every inserted record prebuilt): acceptance-index advance, disposition installs, progress/revision install, Emission/result/exchange/accepted-outcome/receipt/history insertions, exchange resolution with the next state.
- **Post-apply answer projection only** (not retained): `{ ...decision, replayed: false }`, a fresh object spreading the retained decision for the caller.

Maintained text now states exactly this in all six places: contract DEC-10, coordinator module header, `#accept` comment, `002` baseline transaction bullet, `rewrite-index.md` §4, and this report. Observable behavior preserved: one Outcome per exchange, replay/conflict ordering, contiguous receipts, no position consumed by refusals/replays, whole-batch acknowledgment, progress revision, Emission/result retention, B-5, hold-ending History, immutability, hostile-boundary protections.

**Obligation/interaction coverage.** The contract's coverage map (rev 4) is authoritative; every row has a test at C4. Round-3 closures preserved without behavior change (takeover revalidation, permitted actions, history retention, delivery attribution, evidence packaging — all carried suites green; grant threading is the only change to their call sites):

| Criterion | Evidence | Distinguishing counterexample |
|---|---|---|
| C1 | scope/nondisclosure ordering incl. controls + submission | hidden≡missing for all surfaces incl. grant-less submit; zero reads past `executionId` |
| C2 | replay/conflict precedence (before authority), contiguity | replay with forged grant still replays; changed content conflicts; refusals/replays consume no position (B5) |
| C3 | whole-envelope/current-exchange validation | content defects refused whole (with grant); E-6 matrix; no Kernel retry |
| C4 | atomic acceptance incl. prebuilt wrapper + history | hostile pollution + reentrant Outcome still one commit; one/both holds end atomically (B7) |
| C5/C6 | next exchange, terminal, B-5 + live ingress | terminal never reopens; grant-less terminal commits nothing; B-5 intact for authorized terminal |
| C7 | Effects/obligations/waits refused | no K2-style records; wait never read |
| C8 | control-authorized takeover + safety + revalidation | nested/Outcome/hold callback schedules; retired-grant fencing (`stale_exchange`) |
| C9 | code hold + permitted + history | declaration clears; grant-less hold-ending refused; history survives |
| C10 submission authority (DEC-20) | `submission-authority.test.ts` (8) | forged/absent grant `continue`/`complete`/hold-ending refused with zero accepted-state mutation; grant-holding proposal accepted (even by a control-less principal); retired grant cannot commit; views expose no grant (B8) |
| C10 protocol hold | report/takeover/grant-authorized Outcome | bounded diagnostic; takeover clears; grant-less Outcome clears nothing |
| C11 late reports + attribution | `late-reports`, `delivery-attribution` (grant-threaded, green) | per-row activationId/epoch; late reports settle own row only |
| C12 receipts/history/evidence/nondisclosure | `outcome-evidence`, `nondisclosure`, `recovery-evidence`, `history-attribution` (5), `transaction` contiguity | `authority` truthful (`control` vs `attempt_submission`); frozen records; hidden activity invisible (B9) |
| C13 one observation | `outcome-hostile` (grant hoisted pre-pollution), `transaction` | single observation; ambient pollution cannot split commit |
| C14 structure | landing-zone guard (conformance green) | exact 13-file set; no new src files; one new type-only export |
| C15 records | this report; link check | BASELINE + DEC-10/DEC-18/DEC-20 + comments + code + rewrite-index §4 agree; markers kept; no Layer-3 status |

K0.2 obligations as in rounds 1–3 (fixture files unchanged; port remains K1.4's).

**Tests added, changed, removed.** Kernel suite 435 → 448 (+13, 0 removed): new `submission-authority.test.ts` (8: forged-grant continue/terminal/hold-ending refusals with whole-state assertions; grant-holding acceptance incl. control-less principal; retired-vs-forged post-takeover fencing; grant-less replay still replays; hidden/missing nondisclosure + no grant in views) and `history-attribution.test.ts` (5: no-control Runtime submitter truthfully recorded; control transitions stay `control`; replay/refused grow no History; frozen records). Changed: grant threading (`submissionFor`) across 13 existing suites plus driver grant recording in `harness.ts`; `control-authority` observer-Outcome test reworked to refused-without-grant; `transaction` E/F assert history `authority`. No assertion weakened: every previously-expected classification is preserved by the currency-before-authority order (stale/terminal/conflict precede the grant check; malformed/capacity sites pass current grants). Full suite 2,489 → 2,502; conformance 1,945 and SDK 22 unchanged in count (all pass).

**Compatibility and refusal.** Supported SDK/`@arrokothi/core` untouched. Private-package surface: `submitOutcome` gains required `submission: SubmissionGrant`; `Driver.deliver` gains `submission` (existing 2-arg fake implementations remain assignable; harness fakes record it); new type-only `SubmissionGrant` export; new refusal `unauthorized_submission`; `RecoveryHistoryRecord.authority`. `cancelExecution` still refuses naming K1.3; Effect/`await` Outcomes still refused whole. No new receipt boundary.

**Legacy retirement.** None.

**Semantic correction closure (012).**

- *K12-R3-AUTH-02 (P2).* Invariant: visibility is not proposal authority; submission authority is bound to the current Runtime attempt (`execution-cycle.md` Kernel→Driver→Runtime exchange; C10 "from the current attempt"; binding's own inspect-only claims). H3 counterexample: inspect-only principal inspected coordinates, fabricated `continue`/`complete`/hold-ending Outcomes, won the exchange, cleared holds, ended Executions with B-5. Dependents walked end-to-end: creation → delivery (grant minted/handed) → Runtime holds grant → submit (scope → replay/conflict → terminal/currency → grant → content → accept) → replay (no grant, retained evidence) → takeover (fresh grant, old retired, fencing vocabulary preserved) → holds (grant-less ending refused) → history attribution (grant recorded truthfully) → terminal (grant-less terminal refused) → nondisclosure (hidden≡missing; views grant-free). Correction: DEC-20 capability model above; control checks untouched; no visibility-as-power semantics adopted (no owner amendment needed). Why latent until now: the Runtime harness used the application principal for submissions, so `scopes` looked sufficient. Evidence: `submission-authority.test.ts` (8 whole-result cases) + B8 ablation rejected (visibility-collapse fails 6: AUTH-02 cases plus control-authority observer and history-refused cases).
- *K12-R3-HISTORY-02 (P2).* Invariant: retained History must not assert unchecked authority. H3 defect: `ended_by_outcome` filled control-documented fields from an unchecked submitter. Dependents: all five transitions, replay (appends none), refused submissions (append none), frozen views, nondisclosure, survival across clearing/resolution/dispatch/terminal. Correction: explicit `authority` discriminator (`control` only where control was checked; `attempt_submission` for grant-authorized Outcomes), `actorScope` factual in both, docs corrected in type/contract/baseline. Evidence: `history-attribution.test.ts` (5, incl. no-control Runtime submitter) + B9 ablation rejected.
- *K12-R1-DOC-01 (P2).* Invariant: maintained transaction description = real mechanism, exhaustively. H3 remainder: `AcceptedOutcomeRecord` wrapper built in apply; answer projection unclassified. Dependents inventoried above; wrapper prebuilt, projection explicitly excluded in all six maintained descriptions. Evidence: `transaction.test.ts` E/F (one/both holds, atomic history + contiguity) + prior A–D + B7; full inventory in this report.
- *Round-3 closures preserved.* TAKEOVER-01 revalidation, REC-01 packaging, HOLD/HISTORY-retention/DELIVERY attribution, control/safety: all carried tests green; B1–B7 still rejected; no closed family reopened.

**Prior findings.** Open → disposition: K12-R3-AUTH-02 → closed by DEC-20 grants + 8 tests + B8; K12-R3-HISTORY-02 → closed by `authority` discriminator + 5 tests + B9; K12-R1-DOC-01 → closed by exhaustive inventory + prebuilt wrapper + agreed six-way prose. P3 K12-R2-OBS-PERMITTED-01 → deliberately untouched (consistent reading stands; widening risk rejected). P3 K12-R2-PROC-01 → already resolved in round 3 (spec reporter forced; Linux rerun confirmed per merged review).

**Additional self-found defects (separate provenance).** None semantic. Mechanical: test-helper name collision (`open` vs destructured `open`) fixed by rename; closure-capture narrowing in two new tests fixed with array capture; `control-authority` Runtime-path test reworked to the corrected boundary (it asserted the exact behavior AUTH-02 forbids).

**Unresolved obligations** (do not pass because tests pass): K1.2-OPEN-1–OPEN-4 as in rounds 1–3 (no mutable policy surface; whole-message capture cost; unbounded logs; no durability/isolation/Driver-fidelity claim). New code adds no durability, isolation, native-fidelity, or K2-policy claim. No `OPEN(implementation)` marker settled architecturally; receipt/epoch/transaction/disposition markers stay in place.

## Reference maintenance evidence

- Accepted semantic sources implemented: contract Governing sources unchanged in scope (execution-cycle/identity/evidence/authority/state/recovery/driver/kernel already list the grant's owners); DEC-20 added, DEC-10/DEC-18 amended as above, DEC-1–DEC-19 otherwise verbatim.
- Changed Layer-3 text: one bullet only — `rewrite-index.md` §4 transaction-mechanism choice now enumerates the retained records and excludes the answer projection (accuracy fix explicitly required by the finding; no status, no marker change, no new rule).
- Why no other Layer-3 change: no new receipt boundary (grants are not receipts; history references by causation); holds still do not fence acceptance; unknown-field refusal, Emission limit, protocol surface unchanged in rule.
- Dependencies inspected: `execution-cycle.md` (acceptance order, retry-vs-takeover, delivery boundary, atomic decisions), `identity.md` (attempt, epoch, dispatch/delivery, receipt), `core.md`, `lifecycle.md`, `output.md`, `state.md` (progress, recovery-held, History), `recovery.md`, `evidence.md`, `authority.md` (separate powers only — no K2 backend introduced), `driver.md`, `kernel.md`, `values.md`, `creation.md`, `roadmap.md#k12` (expected, not whitelist; unchanged).
- Status rule: no page under `concepts/` or `mechanisms/` gains build/acceptance status.
- Link/anchor validation: `npm run check:builder-docs` (72 files, 1,765 links/anchors, 38 imports; exit 0).

## Validation and interpretation

Environment: macOS 26.6.2 (arm64, build 25G83), Node v25.2.1, npm 11.6.2; clean tree at C4 `da82de9de1e51c4b1980e4450a6daf1126945ad2`; run 2026-09-25 from the repository root. Every raw attachment below independently states C, base, branch, exact command, environment/config, output-sha256, raw output, exit, and date. Round-1/2/3 evidence untouched.

| Command | Result | Attachment (file SHA-256) |
|---|---|---|
| tree/environment (`git status --porcelain; git rev-parse HEAD; git log --oneline -3; node --version; npm --version; sw_vers; uname -m; date -u`) | C4 `da82de9…`, clean (empty status) at capture | `validation-04/01-tree-and-environment.txt` `6b750ffa58aaeaa63b90e7e5f59689e1c947e3083af0a38b6a16dec64b0ef89b` |
| `npm run typecheck` | exit 0 | `validation-04/02-typecheck.txt` `63de67e9d751209adee802285d6e2c7e6ae4d39d4f4067e84d9d41308b5790c9` |
| `npm test` | exit 0; 2,502 tests / 415 suites, 0 fail/cancelled/skipped/todo | `validation-04/03-test-full.txt` `15458ac2e4b6136ca198f7d44dd072b8b713edc5ac75ce5577ffe870bba95aba` |
| `npm run test:kernel` | exit 0; 448 / 0 fail (435 carried + 13 new) | `validation-04/04-test-kernel.txt` `07ea6dda1c1a7e8dc87dfc566f371a98f1f9969ecc86ad201f3b68f9ddfd5159` |
| `npm run test:conformance` | exit 0; 1,945 / 0 fail (landing-zone guard green) | `validation-04/05-test-conformance.txt` `ef3b042c1e64b2245790d5d2b80d72990f8ae98aaab4be84efd71d2d44fd71dc` |
| `npm run test:sdk` | exit 0; 22 / 0 fail | `validation-04/06-test-sdk.txt` `222edef51a6dc86d21bd750cfaa1b611af862e8553a361e4718b007bceea9925` |
| `npm run check:builder-docs` | exit 0; 72 files, 1,765 links/anchors, 38 imports | `validation-04/07-check-builder-docs.txt` `cb582c9229c764fd4c93818f5a8ab0aefafc3b52d773eee03a6377b3ac4d4b11` |
| `node docs/development/work/K1.2/ablations.mjs` | exit 0; clean control 448/448; 25/25 rejected (A1–A16 + B1–B9) | `validation-04/08-ablations.txt` `7e16716fc63097a644199f4eed96fa8f00521f0877d19665f4d7b6de1a824975` |

Not run: `npm run test:evals` (no Agent behavior or model path). No external fixture prepared or gate executed; no E1 result claimed. The ablation script is payload in C4; its output is the only ablation evidence.

Why the evidence supports each criterion (implementer assessment, not acceptance): every criterion's row names the observable fact and the forbidden mutations; authority/revalidation/refusal cases compare full snapshots (only the recorded refusal may differ); reentrancy and grant schedules assert lifecycle, activation, exchanges, epoch, holds, receipt positions/references, deliveries, refusals, and history together; each of the 25 plausible wrong implementations — one per load-bearing rule, including visibility-as-authority and control-claimed history — is rejected by at least one test while the unablated copy passes all 448. Cross-scope nondisclosure and immutability hold for all records old and new.

Strongest remaining risks: grant discipline is in-process reference identity (a remote binding would need its own unforgeable carrier); hostile-caller hardening demonstrated for tested paths, not proven exhaustive; in-memory profile still claims no durability/isolation/fidelity (OPEN-4).

Third-party review under AGENTS.md: none. No code, test, script, asset or dependency was copied, adapted or added; `canonicalize@3.0.0` remains the only third-party specifier in the zone. The K0.2 fixture vocabulary and WS decisions are repository material.

## Handoff

Ready for independent review (round 4). Base B, payload C4 and candidate H4, and the verified pushed SHA, are supplied in the owner handoff. No self-acceptance; K1.3 and every other successor remain held until the owner releases them. No ACCEPT, integration, or successor release is recorded here.
