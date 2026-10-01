# Implementation report — K1.2, round 3 (correction)

## Identity

- Packet: K1.2 — Outcome acceptance and receipts; parent milestone K1. [Contract](contract.md) revision 3 (round-3: DEC-10 clarified to name hold-ending history records as built before mutation; new DEC-19 takeover commit revalidation after the safety callback; coverage rows for the three reentrancy schedules and 23 ablations; stable criterion IDs C1–C15 preserved; DEC-1–DEC-18 verbatim except the DEC-10 clarification).
  Governing process baseline: `a20d278185eaffc7f8b7489345a3624231ff6e6d` (006/007/008/012 as they stand there).
- State: WAITING_FOR_REVIEW (this report). Owner release: 2026-09-16, start hold lifted 2026-09-24 with the B-5 scope amendment (007 status row), and the owner's Prompt A instruction of 2026-09-24.
  Prerequisites: K1.1 (with correction-01 and reference-01) accepted at H `52b1600f3b42e3a360fdc3395178f1d147edf304`, integrated `b53ccb48a8fd4b9d0b0028fc11e925d563e284fa`; K1.1-correction-02 accepted at H `719abbf9e55e7489b6255a08cbb9e97a1e960a5e`, integrated `954d31b00eb7` (PR #36). Both integrations are ancestors of the base.
  Prior rounds: round-1 payload C1 `4babb6ee9550479c09e75d80cb8c17e8fc042b18`, reviewed H1 `3b88d32733b89f32744251d71b2d70a8684ccd55`, review-01 CHANGES REQUIRED in A1 `0c0e644b9c9e621da6a3cd02732f50949f1c0744`; round-2 payload C2 `c395abfb27c4a0bc7d5c18ed1d9edd2b8b840c47`, reviewed H2 `da371b6a09d65b0242010d4fe46e51d64c9e2fbd`, review-02 CHANGES REQUIRED in A2 `19d77004b3d8fb9d2cbba9524770c250700016a9` with open blocking K12-R2-TAKEOVER-01, narrowed K12-R1-DOC-01 and K12-R1-REC-01 (P2 each) and non-blocking P3 K12-R2-OBS-PERMITTED-01, K12-R2-PROC-01.
- Author: Muse Spark session, 2026-09-24/25, correcting the same released packet K1.2 on branch `claude/k1.2-outcome-acceptance-receipts` under the round-2 handoff. No successor packet, no merge to main, no self-accept. No new semantic authority choice was required: the correction implements the already-required revalidation/ordering within the round-2 authority model (Kernel-enforced control, Driver-owned safety), so no BLOCKED_ARCHITECTURE was raised.
- Branch `claude/k1.2-outcome-acceptance-receipts` on remote `origin` (`https://github.com/ArrokothI/arrokothi.git`). Base B = `a20d278185eaffc7f8b7489345a3624231ff6e6d`. Payload C3 = `5797bde3df2f3b6f91f255a0b08a6b42ad2d134d` (substantive code/tests/contract/baseline/ablation changes only).
- Candidate H3: the commit containing this report; its full SHA is supplied in the owner handoff.
- C3..H3 allowlist: this report (`implementation-03.md`), `validation-03/01-tree-and-environment.txt` through `validation-03/08-ablations.txt` (raw command output about clean C3 only, every file independently naming C/command/environment/config/digest per 006/K12-R1-REC-01, including 01), and in `docs/development/007-work-packets.md` the K1.2 status row update to WAITING_FOR_REVIEW. No package, test, script, mental-model or contract payload changes occur in C3..H3. Round-2 `validation-02/*` untouched in place.
- Working tree clean at C3 (verified via `git status --porcelain` empty before evidence capture; the 01 attachment's own status output additionally shows only the in-progress `validation-03/` evidence dir). Push: pending at the time this report was written; the verified remote SHA is supplied in the handoff, not claimed here.

Departures: none beyond the `claude/` branch prefix carried from rounds 1–2 (006 says "normally"; no owner branch instruction).

## Changes and coverage

**Change groups.** Full cumulative diff: `git diff a20d278 5797bde` (60 files, +21,999/−359; rounds 1–2 payload and evidence plus this correction). Correction delta `git diff 19d7700 5797bde` (7 files, +521/−45; this round only).

| Group | Files | Governing sources |
|---|---|---|
| Takeover commit revalidation (TAKEOVER) | `packages/kernel/src/coordinator.ts` (`requestTakeover` DEC-19 block, `currentHoldOf` helper), `driver.ts` (revalidation sentence) | `identity.md#writer-epoch`, `recovery.md#decide-permission-before-replacing-work`, `execution-cycle.md#retry-versus-takeover`, `driver.md`, `kernel.md`; 007 authenticated-control seed; C8/C12 |
| Outcome history prebuild (DOC) | `coordinator.ts` (`#accept` `historyToAppend` built before mutation, appended in apply), header + `#accept` comments | `execution-cycle.md#atomic-decisions-across-the-system`, WS §7 Left open; C15/C4 |
| Tests | new `takeover-reentrancy.test.ts` (4), `transaction.test.ts` +2 (E/F hold-ending atomicity) | 012 deterministic execution + normative decisions + narrow race/fault |
| Ablations | `work/K1.2/ablations.mjs` (B6 revalidation removed, B7 history append dropped; A10 extended to defeat both hold checks after the revalidation interaction; `--test-reporter=spec` forced per K12-R2-PROC-01) | 012 distinguishing power |
| Contract/coverage | `work/K1.2/contract.md` rev 3 (DEC-10 clarification, DEC-19, revalidation + hold-ending coverage rows, 23 ablations; IDs stable, DEC-1–DEC-18 preserved) | 006 contract ownership |
| Baseline | `002-implemented-kernel-baseline.md` (takeover revalidation paragraph; transaction bullet names history records) | 006 reference maintenance |

**Selected 012 methods.** Deterministic execution (primary: reentrant fake Drivers invoking nested takeover/Outcome/recovery inside `isSafeToReplace`, whole-result + forbidden-mutation assertions), normative decisions (same-exchange/same-epoch currency re-checked post-callback; resolved/terminal/newly-held variants; duplicate/conflicting/stale still ordered), race/fault narrowly (check-callback-commit windows on one in-memory coordinator; no persistence/process-death claim), process/documentation (inventory/guard, BASELINE, markers, C/H/evidence identity). Excluded as in contract: native Driver fidelity (R1), external E gates (K1.4), packaging (private zone), `test:evals` (no Agent/model path).

**Obligation/interaction coverage.** The contract's coverage map (rev 3) is authoritative; every row has a test at C3. Round-2 closures preserved (no regression: 429 carried tests all pass unchanged in behavior; existing expectations untouched except none needed this round):

| Criterion | Evidence | Distinguishing counterexample |
|---|---|---|
| C1 | scope/nondisclosure ordering incl. new controls | outsider hidden≡missing; inspect-only `unauthorized_control` |
| C2 | replay/conflict precedence, contiguity | replay after resolution/next/terminal; refusals/replays/redeliveries consume no position (B5) |
| C3 | whole-envelope/current-exchange validation | content defects refused whole; E-6 matrix; no Kernel retry |
| C4 | atomic Outcome incl. hold-ending history | hostile pollution + reentrant Outcome still one commit; one/two holds end atomically in the same decision (B7) |
| C5/C6 | next exchange, terminal, B-5 + live ingress | terminal never reopens; B-5 dispositions incl. safety-callback terminal Outcome |
| C7 | Effects/obligations/waits refused | no K2-style records; wait never read |
| C8 takeover + revalidation (DEC-15/DEC-19) | `takeover.test.ts`, `control-authority.test.ts`, new `takeover-reentrancy.test.ts` (4) | safe advances; unsafe/absent/throwing refused; nested takeover → outer `stale_exchange`, one commit, no orphan receipt/delivery; current Outcome (continue) → outer `no_unresolved_exchange`; terminal `complete` → outer `terminal_destination` with B-5 intact; code hold established in callback → outer `recovery_held` (B6 removed-protection rejected) |
| C9/C10 holds + permitted + history | `recovery`, `hold-permitted`, `recovery-history` (unchanged, green) | permitted predicts accept/refuse; history survives clearing/resolution/dispatch/terminal |
| C11 late reports + attribution | `late-reports`, `delivery-attribution` (unchanged, green) | per-row activationId/epoch; late reports settle own row only |
| C12 receipts/evidence/nondisclosure | `outcome-evidence`, `nondisclosure`, `recovery-evidence`, `transaction` contiguity | per-Execution contiguous positions incl. hold-ending decisions; frozen records; hidden activity invisible |
| C13 one observation | `outcome-hostile`, `transaction` hostile/reentrant | single observation; ambient pollution cannot split commit |
| C14 structure | landing-zone guard (conformance green) | exact 13-file set; no new src files/runtime exports (one new test file unzoned; `currentHoldOf` internal) |
| C15 records | this report; link check | BASELINE + contract DEC-10/DEC-19 + coordinator comments + `driver.ts` + real code agree; markers kept; no Layer-3 status |

K0.2 obligations as in rounds 1–2 (fixture files unchanged; port remains K1.4's).

**Tests added, changed, removed.** Kernel suite 429 → 435 (+6, 0 removed, 0 weakened): new `takeover-reentrancy.test.ts` (4: nested takeover; continue Outcome; terminal complete with B-5; code hold), `transaction.test.ts` E/F (Outcome ending one hold / both holds with atomic history + contiguity). No pre-existing test logic changed this round. Full suite 2,483 → 2,489; conformance 1,945 and SDK 22 unchanged in count (all pass).

**Compatibility and refusal.** Supported SDK/`@arrokothi/core` untouched. No new API surface: revalidation reuses `stale_exchange`/`no_unresolved_exchange`/`terminal_destination`/`recovery_held`; no new receipt boundary; `currentHoldOf` is internal. `cancelExecution` still refuses naming K1.3; Effect/`await` Outcomes still refused whole.

**Legacy retirement.** None.

**Semantic correction closure (012).**

- *K12-R2-TAKEOVER-01 (P2).* Invariant: after any Driver/host callback used by takeover, the same unresolved exchange, current epoch, and hold conditions must govern immediately before commit, with no further reentrant code between final validation and mutation (`identity.md` epoch fencing; `recovery.md` permission-before-replacement; retry-vs-takeover single current attempt). Round-2 counterexample class: pre-callback validation + `isSafeToReplace` callback + commit on stale snapshot (nested takeover double-commit/orphan receipt/extra delivery/overwritten evidence; Outcome-resolved exchange still reporting success + receipt + delivery; code hold established mid-check ignored). Dependents walked: all takeover callers (nested/reentrant-via-deliver still ordered post-commit and green), Outcome ordering (resolved/terminal paths), hold paths (code blocks, protocol clears at commit), redelivery (adds only attributed deliveries, never invalidates), delivery attribution (outer adds none when refused), receipt contiguity (refused outer mints none), history causation (takeover-clear records only on commit), terminal/B-5, nondisclosure (per-Execution evidence), ablation spans (A10 extended to defeat both hold checks since revalidation now backs the pre-check). Correction: DEC-19 inline revalidation block reading only Kernel state, then mint/mutate/deliver with no callbacks in between; deliver-time reentrancy remains post-commit and ordered. Why round 2 missed it: the safe-replacement callback was introduced as a pure predicate call between validation and commit without treating it as a reentrancy window. Evidence: `takeover-reentrancy.test.ts` (4 whole-result cases) + B6 ablation rejected (4 failures incl. all three schedules).
- *K12-R1-DOC-01 narrowed (P2).* Invariant: maintained transaction description = real mechanism. Round-2 remainder: receipt position fixed, but `ended_by_outcome` records constructed after mutation began while prose claimed every record built before mutation. Dependents: `#accept` build vs apply order, receipt contiguity (history consumes no position), frozen history content/actor/causation, BASELINE + DEC-10 + comments. Correction: `historyToAppend` frozen pre-mutation from pre-mutation state, appended via `appendAllOwn` in apply; header/`#accept`/BASELINE/DEC-10 now enumerate history records among built-before-mutation records. Why it survived round 2: the trailing history path invokes no caller code, so no observable split; prose review did not trace construction order. Evidence: `transaction.test.ts` E/F (one/both holds, atomic history + positions [1,2,3]) + B7 ablation rejected + existing history suites green.
- *K12-R1-REC-01 narrowed (P2, process).* Round-2 remainder: `validation-02/01` named C/base/branch/environment but no command or digest. Correction: new `validation-03/01..08`, every file independently carrying candidate C, base, branch, exact command, environment/config, output-sha256, raw output, exit, and date; round-2 evidence untouched. Evidence: files below with file SHA-256.
- *Round-1 AUTH/HOLD/HISTORY/DELIVERY.* Preserved intact: separate `controlScopes`, Driver-owned `isSafeToReplace===true` gate, permitted actions from one owner, retained history, per-row activationId/epoch. All 429 carried tests pass without expectation changes; B1–B4 still rejected.

**Prior findings.** Open → disposition: K12-R2-TAKEOVER-01 → closed by DEC-19 revalidation + 4 whole-result tests + B6; K12-R1-DOC-01 → closed by history prebuild + agreed prose + E/F tests + B7; K12-R1-REC-01 → closed by validation-03 per-file identity (01 included). P3 K12-R2-OBS-PERMITTED-01 → untouched by design (consistent reading stands; widening risk rejected). P3 K12-R2-PROC-01 → tiny `--test-reporter=spec` hardening in the ablation runner (verified locally; output shape unchanged).

**Additional self-found defects (separate provenance).** One: the new revalidation duplicated the code-hold refusal, which masked ablation A10 (pre-check removal no longer changed behavior). Disposition: extended A10 with a suffix extra defeating the post-callback hold read as well ("takeover ignores code holds entirely"); A10 rejected again (6 failures). This is ablation maintenance for the new two-check structure, not a semantic change. No other self-found defects; full suites green.

**Unresolved obligations** (do not pass because tests pass): K1.2-OPEN-1–OPEN-4 as in rounds 1–2 (no mutable policy surface; whole-message capture cost; unbounded logs; no durability/isolation/Driver-fidelity claim). New code adds no durability, isolation, or native-fidelity claim. `authority.md` cited only for the already-used separate-powers principle.

## Reference maintenance evidence

- Accepted semantic sources implemented: contract Governing sources table unchanged in scope (evidence/authority/recovery-permission/driver/kernel/state-History/identity-delivery already added in rev 2); DEC-19 added, DEC-10 clarified, DEC-1–DEC-18 otherwise verbatim.
- Changed Layer-3 text: none. Takeover revalidation and history prebuild implement existing fencing/permission/atomicity rules; spellings (`controlScopes`, `isSafeToReplace`, permitted vocabulary, history shape, revalidation refusals reusing existing classifications) remain this binding's, recorded in contract DEC-14–DEC-19 and BASELINE. All `OPEN(implementation)` markers stay in place. No Layer-1/2 change.
- Why no other Layer-3 change: no new receipt boundary (takeover still `dispatch_intent`, history references by causation); holds still do not fence acceptance; unknown-field refusal, Emission limit, protocol surface unchanged in rule.
- Baseline explicit (retained from round 2, extended): fencing ≠ native exclusion; takeover revalidates post-callback with at most one commit.
- Dependencies inspected: `execution-cycle.md` (acceptance order, retry-vs-takeover, delivery boundary, atomic decisions), `identity.md` (epoch, dispatch/delivery, receipt), `core.md`, `lifecycle.md`, `output.md`, `state.md` (progress, recovery-held, History), `recovery.md`, `evidence.md`, `authority.md` (separate powers only), `driver.md`, `kernel.md`, `values.md`, `creation.md`, `roadmap.md#k12` (expected, not whitelist; unchanged).
- Status rule: no page under `concepts/` or `mechanisms/` gains build/acceptance status.
- Link/anchor validation: `npm run check:builder-docs` (72 files, 1,765 links/anchors, 38 imports; exit 0).

## Validation and interpretation

Environment: macOS 26.6.2 (arm64, build 25G83), Node v25.2.1, npm 11.6.2; clean tree at C3 `5797bde3df2f3b6f91f255a0b08a6b42ad2d134d`; run 2026-09-24/25 from the repository root. Every raw attachment below independently states C, base, branch, exact command, environment/config, output-sha256, raw output, exit, and date. Round-2 `validation-02/*` untouched.

| Command | Result | Attachment (file SHA-256) |
|---|---|---|
| tree/environment (`git status --porcelain; git rev-parse HEAD; git log --oneline -3; node --version; npm --version; sw_vers; uname -m; date -u`) | C3 `5797bde…`, clean at C3 (01's own status output additionally shows only the in-progress `validation-03/` dir) | `validation-03/01-tree-and-environment.txt` `ee1309d0e8fbcf87348eb4ad8211792a0c4cda811a73a2f2c52973933ec9e7b1` |
| `npm run typecheck` | exit 0 | `validation-03/02-typecheck.txt` `c9b38d309c600d598387f6ea95636b17223aebcc3034d55c501ddbfaa38ac3ee` |
| `npm test` | exit 0; 2,489 tests / 404 suites, 0 fail/cancelled/skipped/todo | `validation-03/03-test-full.txt` `e87a5d81a2bf8a616830c953179bd729112429b4c9dbbea0357d23a085d33fe8` |
| `npm run test:kernel` | exit 0; 435 / 0 fail (429 carried + 6 new) | `validation-03/04-test-kernel.txt` `d82ca7800a7b2c1c8c597a5e852959899ca64bfa6f1fdb8a155965dd78e3c366` |
| `npm run test:conformance` | exit 0; 1,945 / 0 fail (landing-zone guard green) | `validation-03/05-test-conformance.txt` `c688296a04189d016d39d76f91b2ddae6d0f0b1ca843fcedc24325415ab69662` |
| `npm run test:sdk` | exit 0; 22 / 0 fail | `validation-03/06-test-sdk.txt` `52c9d0aa4c2bef317d41ecfd63d7c050f68429b417e34b783b55ed0a585b5990` |
| `npm run check:builder-docs` | exit 0; 72 files, 1,765 links/anchors, 38 imports | `validation-03/07-check-builder-docs.txt` `63e0aa21047bb524702b5aadaa26f2b4aecc8f3580c07da7bc3f5e73967a45b3ee` |
| `node docs/development/work/K1.2/ablations.mjs` | exit 0; clean control 435/435; 23/23 rejected (A1–A16 + B1–B7) | `validation-03/08-ablations.txt` `742ea7f541ff99369cea9194e9cb32051ffcc9cfad26b84ab1df3e9fe3b342c2` |

Not run: `npm run test:evals` (no Agent behavior or model path). No external fixture prepared or gate executed; no E1 result claimed. The ablation script is payload in C3; its output is the only ablation evidence.

Why the evidence supports each criterion (implementer assessment, not acceptance): every criterion's row names the observable fact and the forbidden mutations; refusal/revalidation cases compare full snapshots (only the recorded refusal may differ); reentrancy schedules assert lifecycle, activation, exchanges, epoch, holds, receipt positions/references, deliveries, refusals, and history together; each of the 23 plausible wrong implementations — one per load-bearing rule, including post-callback revalidation removed and hold-ending history dropped — is rejected by at least one test while the unablated copy passes all 435. Cross-scope nondisclosure and immutability hold for all records old and new.

Strongest remaining risks: revalidation is synchronous Kernel-state comparison (no lease/clock reasoning); hostile-caller hardening demonstrated for tested paths, not proven exhaustive; in-memory profile still claims no durability/isolation/fidelity (OPEN-4).

Third-party review under AGENTS.md: none. No code, test, script, asset or dependency was copied, adapted or added; `canonicalize@3.0.0` remains the only third-party specifier in the zone. The K0.2 fixture vocabulary and WS decisions are repository material.

## Handoff

Ready for independent review (round 3). Base B, payload C3 and candidate H3, and the verified pushed SHA, are supplied in the owner handoff. No self-acceptance; K1.3 and every other successor remain held until the owner releases them. No ACCEPT, integration, or successor release is recorded here.
