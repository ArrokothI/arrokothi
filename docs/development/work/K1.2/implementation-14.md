# Implementation report — K1.2, round 14

## Identity

- Packet/parent; contract path and revision; governing process baseline:
  K1.2 / K1; `docs/development/work/K1.2/contract.md` **revision 9** (revision 8 was C11's per-coordinate currency change with OPEN-5 recorded; revision 9 applies owner `decision-02.md` — Activation identity as third exchange coordinate; K12-R13-ARCH-01, K12-R13-DOC-01, K12-R13-REC-01; C2/C3 refined, DEC-2/DEC-3 aligned, coverage rows + distinguishing power 32 → 36, OPEN-5 closed). Governing 006/007/008/012 and base B `a20d278185eaffc7f8b7489345a3624231ff6e6d`.
- State; owner release; prerequisite ACCEPT and integration identities:
  **WAITING_FOR_REVIEW** (implementer assessment; no self-acceptance). Owner released K1.2 2026-09-16, hold lifted 2026-09-24; owner `decision-02` (2026-09-26, commit `5b5fc53010e20ebbb8aa9f570ebd5216598e13be`) resolves the review-12 architecture blocker. Prerequisites unchanged: K1.1 accepted H `52b1600f3b42e3a360fdc3395178f1d147edf304`, integrated `b53ccb48a8fd4b9d0b0028fc11e925d563e284fa`; correction-02 accepted H `719abbf9e55e7489b6255a08cbb9e97a1e960a5e`, integrated `954d31b00eb7f2412c22ccf7d4d079699f0c4032`. All precede B. No successor release. No K1.3 release.
- Branch/configured remote; full base and payload C; previous reviewed H/review:
  Branch `claude/k1.2-outcome-acceptance-receipts`. Base B `a20d278185eaffc7f8b7489345a3624231ff6e6d`. Previous payload C11 `ad219a5cf8940d0379bda9b16d693c901931a4b5`. Previous candidate H13 `54c65a7289e90385e01643422d57a015b66c2025`. Previous independent review: `review-12.md` (ChatGPT, GPT-5.6 Sol, 2026-09-26, BLOCKED_ARCHITECTURE for K12-R13-ARCH-01; K12-R11-ORDER-01 closed; P2 K12-R13-REC-01, K12-R13-DOC-01; P3 007 intro prose).
- New payload C12: `2f4e64b1f51c679e2b381f9fb9800f2e290ddd30` (`K1.2 C12: Activation identity as third exchange coordinate per decision-02`).
- Candidate H: H14 is the commit containing this report; the external handoff supplies its full SHA and advertised remote identity after non-force push.
- Exact C12..H14 administrative file allowlist, including any raw-output attachments:
  `docs/development/work/K1.2/implementation-14.md`, `docs/development/work/K1.2/validation-14/` (`01-tree-and-environment.txt`, `02-typecheck.txt`, `03-test-full.txt`, `04-test-kernel.txt`, `05-test-conformance.txt`, `06-test-sdk.txt`, `07-test-evals.txt`, `08-check-builder-docs.txt`, `09-ablations.txt`, `10-probe-r11.txt`, `MANIFEST.txt`), and the K1.2 status-row update in `docs/development/007-work-packets.md`. H14 introduces no scripts, fixtures, configuration, contract, canonical, test, threshold, or other payload changes.
- Working-tree state; push status as observed, or pending external handoff:
  Working tree clean at C12 except untracked `validation-14/` (H evidence) before H14. Push pending at report creation; it cannot certify its own future push.
- Author: Muse Spark implementer session (`muse-spark-1.3-contributor`), 2026-09-26 UTC. This is not a reviewer session, not an acceptance, and not an integration or release. Owner-directed documents below name their separate author.

## Changes and coverage

### Correction delta `5b5fc53..C12` (owner decision to new payload): exactly 7 payload paths

| Path | Change; ownership and governing sources |
|---|---|
| `mental-model/mechanisms/execution-cycle.md#outcome-acceptance`, steps 2–3 | Owner-directed; author Claude Code session (Claude Opus 5.5) at owner instruction. Canonical rule: only a well-formed Activation identity addresses an accepted Outcome; only Kernel state and well-formed coordinates decide an exchange refusal; Activation identity, epoch and base each checked independently; missing/malformed/unobservable coordinate never establishes staleness and is a content-group refusal after authority; corrected diagnostic wording (K12-R13-DOC-01). Included unchanged in C12. |
| `docs/development/work/K1.2/contract.md` (revision 9) | Owner-directed; author as above. Header revision history, C2/C3 refined to decision-02, DEC-2/DEC-3 aligned, OPEN-5 closed, C15 row, two new coverage rows (C2 unaddressable identity; C3 malformed Activation identity), distinguishing power 32 → 36 with B17–B20. Included unchanged in C12. |
| `docs/development/002-implemented-kernel-baseline.md#outcome-acceptance-api` | Owner-directed; author as above. Order and wording aligned to canonical. Included unchanged in C12. |
| `packages/kernel/src/coordinator.ts` `submitOutcome` | Implementer (Muse Spark). Removes the early `malformed_envelope` return; keeps the single `activationId` observation before `captureOutcome` and the replay lookup; skips the replay lookup when the identity is not usable; keeps the terminal fence; refuses `stale_exchange` when no exchange is unresolved; skips the wrong-Activation comparison when unusable; still applies per-coordinate epoch/base checks; then the grant check; then combines `idIssues` with `capture.issues` into one `malformed_envelope`. Pre-content refusal reasons (`stale_exchange` no-exchange/epoch/base, `unauthorized_submission`) use the `was not usable` phrasing without rendering the caller's value when unusable; `terminal_destination` never interpolated and is unchanged; capacity/malformed content-group reasons likewise avoid rendering when unusable. Comments (file header near line 15; block comments in `submitOutcome`) aligned to canonical steps 2–3; `captureOutcome` stays eager before authority (DEC-10). C11 per-coordinate epoch/base repair preserved unchanged. |
| `packages/kernel/tests/outcome-partial-claim.test.ts` | Implementer. Replaces the O6 test at former line 307 and the file-header O6 note; adds the decision-02 distinguishing matrix (4 identity variants × terminal/no-exchange/stale-epoch/stale-base/current × current/retired/forged/absent grants × valid/invalid content) and the C2 unaddressable-identity replay cases (identical/changed resubmissions with malformed identity at a later exchange and when terminal; well-formed controls keep replay/conflict). |
| `packages/kernel/tests/outcome-hostile.test.ts` | Implementer. Adds read-count assertions for missing, non-text and throwing `activationId`: every other envelope field read exactly once, identity observed once; full capture now runs where the early return used to skip it. |
| `docs/development/work/K1.2/ablations.mjs` | Implementer. Adds exactly B17–B20 per the contract; updates A2/B12/B13/B14 spans to the new source shape (same broken behaviors, new spelling). No ablation removed. |

`packages/kernel/src/outcome.ts` `captureOutcome` is byte-stable; the C11 `epochForCurrency`/`baseForCurrency` representation is preserved. No other code moved.

No factual edit to the three owner-directed documents was needed: the implementation revealed no mismatch requiring one (no differently-named test file; BASELINE in-process currency representation already carries the identity as a separate coordinate alongside `epochForCurrency`/`baseForCurrency`, which is the correct factual split — the identity is not part of the numeric claim). If a future pass finds a case decision-02 does not decide, it is a blocker under 006, not an implementer choice; none was found.

### Selected 012 methods; material exclusions and why

- **Normative decisions** — primary. Derived the total order from `execution-cycle.md#outcome-acceptance` steps 2–3, `decision-02.md` (distinguishing schedules + observation/disclosure), DEC-2/DEC-3/DEC-20, BASELINE, contract C2/C3/C15, and reviews 11–12 before editing; traced every producer/consumer below.
- **Deterministic execution** — primary. New 112-case C3 matrix + 16-case C2 replay matrix + hostile single-observation cases; every refusal asserts classification, permitted/forbidden diagnostics (returned + retained), retained-equals-returned frozen, whole-refusal state equality, still-answerable exchange (or terminal invariance), nondisclosure where scope applies, and non-rendering of the malformed value. Packet ablations (36) + unchanged R11 probe.
- **Race and fault** — narrowly. Reused reentrant-takeover/Outcome probes and late-report/terminal suites via the full kernel run; no persistence/process-death claim, so no process-kill evidence.
- **Process/documentation** — inventory/guard (`boundary.test.ts` green), BASELINE/Layer-3 markers, 007 row, link check via builder-docs.
- Excluded: native Runtime/Driver fidelity (no real Driver; R1), external evidence gates (no E gate; K1.4), packaging/release (zone private). Same exclusions as the contract.

### Obligation/interaction coverage with expected facts, forbidden changes, source/test/trace and result

| Obligation | Expected / forbidden | Evidence and result |
|---|---|---|
| C1 scope before content | hidden≡missing `unknown_destination`, pos 0, zero reads past `executionId` | `outcome-acceptance.test.ts`. Holds |
| C2 exact replay/conflict; unaddressable identity | well-formed identical replays (even after resolution/next/terminal) with same receipt, no mutation; changed under accepted ID conflicts; malformed/missing/throwing identity never replays/conflicts, classified fresh (`stale_exchange` from well-formed stale coordinate at later exchange; `terminal_destination` when terminal) | `outcome-acceptance.test.ts`, `terminal.test.ts`, new C2 matrix (16). Holds |
| C3 currency per-coordinate incl. identity (R11 + decision-02) | any well-formed stale coordinate → `stale_exchange` whatever authority/content, no content leak; malformed identity never establishes staleness, never blocks another well-formed stale coordinate | C11 56-case matrix preserved + new C3 matrix (112). Holds |
| C3 malformed identity content-group | entitled (current grant) + malformed identity → one `malformed_envelope` listing identity + every other content issue (valid → only identity; invalid → identity + deep/duplicate/surrogate); grant-less current → `unauthorized_submission` with no content diagnostic | new C3 malformed arms + hostile. Holds |
| C3 disclosure | pre-content reasons never render malformed/unobservable value; `was not usable` phrasing (terminal never interpolated); no identity diagnostic before authority, returned or retained | new non-rendering + no-leak assertions on returned + retained. Holds |
| C3 explicit identity (PLAN-01) | omitted claim never defaulted | `outcome-acceptance.test.ts`. Holds |
| C3 content / E-6 / capacity / no retry | entitled invalid → `malformed_envelope`/`capacity_exhausted` naming issues; whole refusal; no Kernel retry | `outcome-acceptance.test.ts`, `outcome-limits.test.ts`. Holds |
| C4 atomic/one-writer/opacity | whole-batch ack, base+1, one acceptance, opacity | `outcome-acceptance.test.ts`. Holds |
| C5 next/terminal-never-reopens/typed result | new ID/epoch1/base=accepted; terminal refuses all; replay precedes terminal for well-formed | `terminal.test.ts`, new C2 terminal arms. Holds |
| C6 B-5/live ingress | terminal dispositions in same decision; post-end input refused/replayed/conflicted | `terminal.test.ts`. Holds |
| C7 Effects/waits | whole refusal, no Effect record, exchange open; `await` names K1.3 unread | `outcome-acceptance.test.ts`. Holds |
| C8 takeover/fencing/grant-lifetime + DEC-14/15/19 | epoch+1 same ID, old `stale_exchange`, grant replaced, redelivery preserves, reentrancy single-commit; `unauthorized_control`/`unsafe_replacement` | `takeover*.test.ts`, `submission-lifetime.test.ts`, `control-authority.test.ts`. Holds |
| C9/C10 holds/history/permitted + authority-before-content | holds distinguishable, permitted predicts controls, history frozen with `control` vs `attempt_submission`; grant-less → `unauthorized_submission` with zero content diagnostics | `recovery*.test.ts`, `hold-permitted.test.ts`, `history-attribution.test.ts`, `submission-authority.test.ts` + new unauthorized arms. Holds |
| C11 late reports/Outcomes/attribution | own-row settlement; replay/conflict; IDs/epochs exact | `late-reports.test.ts`, `delivery-attribution.test.ts`. Holds |
| C12 receipts/immutability/nondisclosure/contiguity | own receipts/positions, frozen evidence, hidden-activity independence, no gaps; retained==returned | `transaction.test.ts`, `outcome-evidence.test.ts`, `nondisclosure.test.ts`. Holds |
| C13 single-observation/pollution | one own-data read per field (incl. malformed identity; full capture now runs where early return skipped); ambient pollution survives; reentrant getter ordered before checks | `outcome-hostile.test.ts` (existing + new missing/non-text/throwing arms), `boundary.test.ts`. Holds |
| C14 zone/inventory | no violation; inventory matches | conformance guard. Holds |
| C15 records | single canonical owner (`execution-cycle.md#outcome-acceptance` + `#submission-authority` under decision-01/decision-02); BASELINE/contract point there; revision 9 named here, in contract header, and in 007 row; no status on Layer-3; `OPEN(K3.2)` kept | diff read; link check. Holds |

### Tests added/ported/removed and reasons; compatibility/refusal; baseline/guides/skills impact

- `outcome-partial-claim.test.ts`: replaced 1 O6 test (same classification `malformed_envelope` for the entitled valid-content arm, new title/assertions for decision-02 content-group reporting, non-rendering, retained equality, still-answerable); added 112 C3 arms + 16 C2 arms. No existing assertion weakened except the O6 title/note as decision-02 requires (listed here).
- `outcome-hostile.test.ts`: added 1 test (3 identity variants internally) for single observation with malformed identity; existing read-once test unchanged and still passes.
- C11 56-case matrix and all other tests pass unchanged (642 kernel vs 513 before; +129 = 112 + 16 + 1).
- `ablations.mjs`: A2 span re-indented to the new `if (identityUsable)` nesting (same broken behavior); B12/B13 finds updated to the new grant block (same move-after-content / move-after-capacity behaviors); B14 finds updated from `capture.issues` to `combined` with a suffix for the unusable branch (same drop-non-claim-defects behavior); B17–B20 added. No ablation removed.
- No compatibility/refusal change beyond decision-02: previously-`malformed_envelope` malformed-identity proposals are now `terminal_destination` (when terminal), `stale_exchange` (when no exchange or a well-formed coordinate is stale), or `unauthorized_submission` (when current yet grant-less); entitled malformed-identity proposals remain `malformed_envelope` (now with combined issues).
- BASELINE + canonical + contract are the owner-directed payload; no guide/skill change (builder-docs green, 72 files).

### Legacy code/docs/dependencies retired, or retained with consumer and retirement owner/trigger

None. `canonicalize@3.0.0` remains the only third-party specifier in the zone. K0 fixture vocabulary reused, not copied.

### Semantic correction closure: changed invariant, dependent paths, counterexamples and evidence

- Invariant changed (source: `execution-cycle.md#outcome-acceptance` steps 2–3 under owner `decision-02`; contract DEC-2/DEC-3): the Activation identity is the third exchange coordinate under the per-coordinate rule. Only well-formed addresses replay; only Kernel state + well-formed coordinates decide exchange refusals; malformed never establishes staleness, never blocks a well-formed stale coordinate, and is a content-group refusal after authority with combined diagnostics; pre-content reasons never render its value. Prior understanding: malformed identity was `malformed_envelope` before replay/terminal (review-12 K12-R13-ARCH-01; contract OPEN-5).
- Original counterexamples: terminal + non-text ID answered `malformed_envelope` instead of `terminal_destination`; accepted-Activation + malformed identity could not be shown to skip replay/conflict; stale numeric + malformed identity was `malformed_envelope` instead of `stale_exchange`; current + malformed + grant-less was `malformed_envelope` instead of `unauthorized_submission`.
- Dependent paths walked (names and conceptual aliases: observation/identity/address/replay/conflict/terminal/fence/no-exchange/current-activation/currency/stale/epoch/base/claim/authority/grant/content/malformed/capacity/overCapacity/issues/combined/reason/retained/refusal/inspect/history/redeliver/takeover/receipt): single observation stays before capture/lookup (DEC-10; hostile proves one read even when throwing); replay gated by `identityUsable`; terminal ungated with non-interpolating reason; no-exchange gated stale regardless with conditional reason; wrong-Activation gated by `identityUsable`; epoch/base per-coordinate unchanged with conditional reasons; grant gated after currency with conditional reason; capacity before malformed unchanged with conditional reasons; malformed via `combined` (`appendAllOwn(idIssues, capture.issues)`); `#refusal` retains the same frozen object that is returned; takeover/fencing, redelivery/holds, receipt positions, inspection/history unchanged; Layer-3/BASELINE/contract/tests updated together. `grep` confirms no remaining `pending owner decision`, `before the replay lookup`, `produced, returned`, or O6 pin in `packages/kernel`, `mental-model/`, or `docs/development/` outside sealed history (contract OPEN-5 closed section and decision-02 DOC-01 disposition quote the old wording only as the superseded record).
- Distinguishing evidence: new C3/C2/hostile matrices; B17 (early return) rejected 125 fails incl. hostile single-observation + terminal/no-exchange arms; B18 (malformed-as-other-exchange) rejected 103 fails incl. unauthorized/malformed arms; B19 (identity diagnostic before authority) rejected 32 fails incl. unauthorized + O6-replacement arms; B20 (rendering in pre-content reason) rejected 24 fails incl. unauthorized non-rendering arms; clean control 642/642; B1–B16 still rejected; R11 probe 8/8.
- Whole packet re-audited (table above). Prior PASS findings stand where re-exercised; none exempted the rebuilt subsystem.

### Prior findings: open IDs → disposition/evidence; closed findings → prior disposition links

- `K12-R13-ARCH-01` (review-12, BLOCKED_ARCHITECTURE): **closed by decision-02 + this C12**. Evidence: canonical steps 2–3, DEC-2/DEC-3, BASELINE, code, C3/C2/hostile matrices, B17–B20, probe.
- `K12-R13-REC-01` (review-12 P2, contract revision identity): **closed**. Contract header now revision 9 with one-place revision history (rev 8 = C11 per-coordinate + OPEN-5; rev 9 = decision-02); this report names revision 9; 007 row names revision 9 via implementation-14.
- `K12-R13-DOC-01` (review-12 P2, `produced` wording vs eager capture): **closed as decision-02 disposes**. Canonical/DEC-2 now state capture stays eager (DEC-10; capture not moved after authority) and may compute diagnostics internally, but before authority they neither decide nor are returned/retained, and the reason does not render a malformed coordinate's value. Code comments match; hostile proves capture runs; pre-authority arms prove no return/retention.
- Review-12 P3 (007 introduction prose still describes only the first three K1.2 candidates): **acknowledged, non-blocking**. H14 updates only the K1.2 status row as tasked; the intro paragraph is left for owner/integration cleanup. No acceptance impact.
- `K12-R11-ORDER-01` (review-11, closed in review-12): **preserved**. C11 matrix, B15/B16, and R11 probe 8/8 rerun on C12 unchanged.
- `K12-R10-EVID-01`, `K12-R10-VAL-01`, `K12-R9-ORDER-01`, `K12-R9-EVID-01`, `K12-R8-DOC-01`, `K12-R7-PROC-01`, `K12-R6-*`, R1–R5: closures stand by reference; re-exercised by 36/36 ablations + full suites.

### Additional self-found defects (separate provenance); unresolved obligations and unblock conditions

- None in-scope beyond decision-02. One self-check explicitly closed: `terminal_destination` was audited for interpolation and found already safe (it names only the Execution/state), so it was left byte-stable; all other pre-content reasons were given `was not usable` variants. No case decision-02 leaves undecided was found; had one been found it would have been recorded as a blocker under 006 instead of chosen.

## Validation and interpretation

Exact commands on clean payload C12 `2f4e64b1f51c679e2b381f9fb9800f2e290ddd30`, cwd repository root, Node v25.2.1, npm 11.6.2, TS 5.9.3, darwin arm64. Working tree clean at C12 except untracked `validation-14/` (H evidence). Raw outputs in `validation-14/` with `MANIFEST.txt` digests (recomputable via `git show C12:<path> | shasum -a 256` for payload digests):

| Command | Result | Evidence |
|---|---|---|
| `npm run typecheck` | exit 0 | `02-typecheck.txt` (`a2051020…`, same as C11 — no type change) |
| `npm test` | exit 0; 2696/2696, 0 fail/cancelled/skipped/todo | `03-test-full.txt` (`e93c79ca…`) |
| `npm run test:kernel` | exit 0; 642/642 (513 prior + 129 new: 112 C3 + 16 C2 + 1 hostile) | `04-test-kernel.txt` (`9fb7b456…`) |
| `npm run test:conformance` | exit 0; 1945/1945 | `05-test-conformance.txt` (`908fa9ce…`) |
| `npm run test:sdk` | exit 0; 22/22 | `06-test-sdk.txt` (`b0dc7fe3…`) |
| `npm run test:evals` | exit 0; 12/12 | `07-test-evals.txt` (`5b77fe0f…`) |
| `npm run check:builder-docs` | exit 0; 72 files, 1786 links/anchors, 38 imports | `08-check-builder-docs.txt` (`492cff35…`) |
| `node docs/development/work/K1.2/ablations.mjs` | control 642/642; **36/36 REJECTED** incl. B17 (125 fails), B18 (103), B19 (32), B20 (24); B1–B16 still rejected (B12 30, B13 1, B14 41, B15 80, B16 54) | `09-ablations.txt` (`f5d96396…`) |
| `review-11/probe-partial-claim.ts` (unchanged) | exit 0; **8/8 `stale_exchange`**, accepted state unchanged | `10-probe-r11.txt` (`e4779eec…`, byte-identical to C11 — R11 preserved) |
| Tree/environment | C12 clean tree, versions, UTC timestamps | `01-tree-and-environment.txt` (`71b636d5…`) |

Why this supports each criterion (implementer assessment, not acceptance): the C3 matrix asserts the exact classification *and* the forbidden observations (no content diagnostic returned or retained, non-rendering, retained==returned frozen, whole-refusal equality, still-answerable exchange, single observation) for every decision-02 schedule across missing/number/object/throwing identities, terminal/no-exchange/stale/current states, all grants, and valid/invalid content; the C2 matrix proves unaddressable identities never replay/conflict at a later exchange or when terminal while well-formed controls still do; hostile proves the observation/capture order; B17–B20 prove the oracle rejects each decision-02 negation while the clean control passes; B1–B16 + full suites prove no cumulative regression; the unchanged R11 probe proves the C11 repair was preserved.

Design choices, assumptions, strongest remaining risk: smallest coherent change (boolean `identityUsable` + conditional reasons + `combined` issues; no capture move; no outcome.ts change); safe-message wording reuses decision-02's `was not usable` with the original stale/authority substrings preserved (`superseded by epoch`, `has not been issued`, `does not match the revision`, `not the unresolved exchange`, `presents no submission authority`, `carries N Emissions`, `refused whole:`) so existing oracles keep their anchors; capacity still precedes malformed inside content (so entitled over-capacity + malformed identity is `capacity_exhausted`); terminal reason left unchanged as already safe. Strongest remaining risk is reviewer disagreement on safe-message prose (exact `was not usable` sentences), which is a wording choice within the authorized disclosure rule, not a classification risk — every classification is pinned by distinguishing tests.

Third-party review under AGENTS.md: none. `canonicalize@3.0.0` stays the only third-party specifier in the zone.

## Handoff

Ready for independent review. No self-acceptance; no integration; no K1.3 release.

- Base B `a20d278185eaffc7f8b7489345a3624231ff6e6d`, new payload C12 `2f4e64b1f51c679e2b381f9fb9800f2e290ddd30`, candidate H14 (commit containing this report; full SHA and verified advertised branch SHA in external handoff after non-force push), prior H13/review-12 history preserved.
- Reviewer: recheck cumulative B..H14, verify the C12..H14 allowlist (this report + `validation-14/` + 007 row only), the MANIFEST digests against `validation-14/`, and the exact-H14 gate result in the handoff. Reconstruct the obligation/classification model independently; passing this report's table proves nothing by itself.
- Open work after review: none known; correction resumes this packet, not the next, per 006.

## Reference maintenance evidence

- Accepted semantic sources: `execution-cycle.md#outcome-acceptance` steps 2–3 + `#submission-authority` under owner `decision-01` (2026-09-25) and `decision-02` (2026-09-26); `decision-02` resolves `blocker-02` K12-R13-ARCH-01 and disposes K12-R13-DOC-01/REC-01.
- Changed Layer-3 owners: `execution-cycle.md#outcome-acceptance` only (owner-directed payload); no other Layer-3 page gains a competing rule. Dependencies inspected: `identity.md` (Activation/writer-epoch/receipt), `lifecycle.md` (terminal), `evidence.md`/`authority.md` (separate powers; refusal retention), `values.md` (boundary/single observation), `creation.md` (terminal ingress), `kernel.md`/`driver.md`/`deployment.md` (fencing vs native exclusion; no new claim). `OPEN(K3.2)` kept; rewrite-index §4 agrees; no Layer-1/2 change.
- Resolved placeholders: none newly settled beyond decision-02's rule (no `OPEN(implementation)`/`OPEN(gate)` marker added or removed by code). Replaced current descriptions: canonical steps 2–3, DEC-2/DEC-3, BASELINE `#outcome-acceptance-api` (owner-directed).
- Index/link/example validation: `check:builder-docs` passes (72 files, 1786 links/anchors); `reference.md` needs no change (no new term; Activation identity was already indexed).
- Sealed history preserved: `review-09/`–`review-12/`, `implementation-01/`–`implementation-13/`, `validation-01/`–`validation-13/`, `blocker-01/02`, `decision-01/02` untouched; Layer-3 diff is exactly `execution-cycle.md`.
