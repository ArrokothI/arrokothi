# Implementation report — K1.2, round 11

## Identity

- Packet/parent: K1.2 / K1; [contract](contract.md) revision 7 (ablation-count row updated from 27 to 29 to name B12/B13; no criterion, threshold, or obligation added, relaxed, or reworded). Governing 006/007/008/012 and B: `a20d278185eaffc7f8b7489345a3624231ff6e6d`.
- Author: Muse Spark, implementer, 2026-09-25. This is not a reviewer session, not an acceptance, and not an integration or release.
- State: **WAITING_FOR_REVIEW**. This round corrects the released K1.2 packet against review 09. Independent review decides acceptance.
- Released packet/prerequisites unchanged: K1.1 accepted H `52b1600f3b42e3a360fdc3395178f1d147edf304`, integrated `b53ccb48a8fd4b9d0b0028fc11e925d563e284fa`; correction-02 accepted H `719abbf9e55e7489b6255a08cbb9e97a1e960a5e`, integrated `954d31b00eb7f2412c22ccf7d4d079699f0c4032`. All precede B. This correction continues K1.2 only and releases no successor. No K1.3 release. No architecture rewrite.
- Branch: `claude/k1.2-outcome-acceptance-receipts`.
- Base B: `a20d278185eaffc7f8b7489345a3624231ff6e6d` (integrated `main`, including 006/007/008/012 as there).
- Previous payload C8: `61059a3e43d7057de9be29f101a65ebed9416ae2`. Previous reviewed H10: `4f3c25f6f1b4927fb9f20a23318a598113139062`. Previous review/status head: `daeba660a09e4fe7f1c68505fe4286ecc099f2d8` (review 09, CHANGES_REQUIRED). Branch verified at that head before editing with no material drift; `git fetch` showed only deletions of unrelated arena branches, local HEAD matched the stated review head, and no intervening work was overwritten.
- New payload C9: `ca0dc2b15b9b276175fe6f48893bc6231ee528a3` (`K1.2 C9: order authority before content on malformed-claim path with distinguishing evidence`).
- Previous report-bearing H9: `08fd9162617315f1cbc7fa7682a0fc5f0bed28d3`; H10 as above; review-09 record and sealed `review-09/` probes/ablations preserved byte-for-byte.
- Candidate H11: the commit containing this report; the external handoff supplies its full SHA and advertised remote identity after non-force push.
- H11 contains only this `docs/development/work/K1.2/implementation-11.md` and the K1.2 status-row update in `docs/development/007-work-packets.md`. H11 introduces no scripts, fixtures, configuration, contract, canonical, test, threshold, evidence, or other payload changes. No runtime implementation or semantic correction is smuggled into H.
- Push pending at report creation; it cannot certify its own future push.
- Owner supplemental decision: `decision-01.md` (carrier extension, 2026-09-25) only. There is no unresolved architecture authority question. Malformed claims are implemented as content-group after authority per the already-canonical ordering; no exemption was encoded and no blocker was raised.

## Correction delta (daeba66..C9) and cumulative packet (B..H11)

Correction delta `daeba66..ca0dc2b` is exactly 4 payload paths, all in C:

| Path | Change |
|---|---|
| `packages/kernel/src/coordinator.ts` | Remove early `claim === null` malformed branch before currency/authority; guard epoch/base currency in `if (claim !== null)`; keep authority before `overCapacity`/`outcome === null` content branches; add canonical step-3 comments. Eager `captureOutcome` before replay kept for DEC-10 single observation. |
| `packages/kernel/tests/submission-authority.test.ts` | Add 7 distinguishing tests in 4 describes (Cases A–D plus over-capacity neighbor): well-formed × absent/forged × duplicate/effects/over-capacity; malformed epoch/base variants × absent/forged × deep+dup+lone-surrogate; entitled malformed reaches content then accepts corrected; retired-grant currency ordering. |
| `docs/development/work/K1.2/ablations.mjs` | Add B12 broad authority-after-content mutation (reviewer R1 port) and B13 narrow capacity-before-authority mutation (adversarial-reviewer neighbor). |
| `docs/development/work/K1.2/contract.md` | Distinguishing-power row 27 → 29, naming B12/B13. No criterion wording change. |

Cumulative `B..C9` is the full K1.2 payload (~160 paths including the above plus all prior K1.2 kernel, tests, contract, decision, BASELINE, and Layer-3 maintenance). Cumulative `B..H11` adds the administrative range: prior H8/H9/H10/review-09 history plus new H11 report/status. The exact `C9..H11` allowlist is: `work/K1.2/implementation-11.md` and the K1.2 row of `007-work-packets.md` only. Verified with `git diff --name-only C9 H11` after H11 exists; `git diff C9 H11 -- packages mental-model docs/development/002* docs/development/work/K1.2/*.mjs docs/development/work/K1.2/contract.md` must be empty.

## Disposition of K12-R9-ORDER-01

**Repaired.** The `claim === null` branch at old `coordinator.ts:1407-1412` returned `malformed_envelope` with `explainOutcomeIssues(capture.issues)` — every content issue — before the grant check at `:1438`, violating `execution-cycle.md:87,93` (“content examined only for the attempt entitled to make it”), DEC-2 first-failing-group, DEC-20, and BASELINE `#outcome-acceptance-api:78-83`.

Externally observable properties now hold, verified by reviewer probes and new tests:

- Grant-less current proposal + invalid content + malformed claim returns `unauthorized_submission` with authority text only; retained `refusals.at(-1)` equals returned, frozen, readable by any inspector, with zero content codes.
- Forged-grant equivalents obey the same nondisclosure (reference-identity `!==` looped in every test).
- Missing/fractional/negative epoch and missing/fractional/negative base-revision variants obey the same discipline (all share `claim === null` via `acceptCount`; sampled variants document that equivalence).
- No retained refusal/evidence leaks content issues before authority.
- Accepted state remains byte-equivalent except the one legitimate refusal record (`assertRefusedOnlyAppendsRefusal`: full view deep-equal except +1 refusal; receipts contiguous; exchange still answerable).
- Valid current grant with the same malformed/content-invalid proposal reaches `malformed_envelope` naming claim and content issues; corrected proposal then accepts.
- DEC-2 classification preserved: terminal, Activation mismatch, and well-formed epoch/base `stale_exchange` remain before authority; authority remains before content including malformed claim (implemented as content-group after authority, the implementer choice review-09 explicitly permits); `capacity_exhausted` remains content-group after authority.

No weakening of scope-first, replay, currency fencing, reference-identity authority, grant lifetime, takeover, retained refusal/evidence, or atomic acceptance.

## Disposition of K12-R9-EVID-01

**Closed with distinguishing evidence.** New coverage in `submission-authority.test.ts` proves authority-before-content rather than merely proving both checks exist. Reviewer R1 ablation (authority moved to just before acceptance) now fails; control passes. Details in “New tests” and “Ablations” below.

## Reconstructed refusal-stage graph

Canonical order: 1 scope/authentication, 2 replay/conflict, 3 exchange/currency, 4 submission authority, 5 content validation, 6 atomic acceptance. Invariant: a later group must not be inspected, diagnosed, returned, retained, or otherwise made observably relevant until every preceding group succeeds.

Actual `submitOutcome` graph after fix (`coordinator.ts:1354-1474`):

| Branch | Lines | Stage | Disclosure |
|---|---|---|---|
| `executionId` observe + `#visible` → `unknown_destination`, record null | 1359-1362 | 1 scope | One field read first; hidden ≡ missing; no content |
| `activationId` observe + `acceptIdentityText` → `malformed_envelope` with `idIssues` only | 1364-1368 | 3 exchange envelope/reference | Only `activationId` path; content not yet observed |
| `captureOutcome` eager | 1372 | Observation (DEC-10), not a decision | All fields read once before lookup; no caller code between first check and last mutation; reentrant getters ordered before checks |
| `acceptedOutcomes` lookup → replay `ok` or `duplicate_conflict` generic reason | 1374-1386 | 2 replay | Grant-free by design; `outcome === null` (uncapturable) → conflict per DEC-3; no `issues` disclosed |
| `isTerminal` → `terminal_destination` | 1388-1396 | 3 exchange | No capture content in predicate or reason |
| `intent === null` or Activation mismatch → `stale_exchange` | 1397-1406 | 3 exchange | Validated `activationId` only |
| `claim !== null` guard: epoch mismatch → `stale_exchange`; base mismatch → `stale_exchange` | 1416-1439 | 3 exchange currency | Only `claim` numbers; unreachable when malformed (falls through to authority) |
| `submission !== intent.submission` → `unauthorized_submission` | 1446-1454 | 4 authority | Reference identity; fixed text; no `explainOutcomeIssues` |
| `capture.overCapacity` → `capacity_exhausted` | 1455-1463 | 5 content | After authority |
| `capture.outcome === null` → `malformed_envelope` with `explainOutcomeIssues(capture.issues)` | 1464-1468 | 5 content | After authority; covers `claim === null` plus all content defects |
| `#accept` | 1474 | 6 acceptance | Atomic |

Helpers: `captureOutcome` sub-readers (`acceptRoot`, `captureEmissions`, `refuseEffects`, `captureNext`, `refuseUnknownFields`) compute eagerly but disclose only after authority (except replay identity-equality and claim numbers, which are licit pre-authority). `explainOutcomeIssues` at `:1367` (activation-only, safe) and `:1466` (post-authority, safe); no other content disclosure. `#refusal` appends the same frozen object that is returned, so returned and retained agree by construction.

DEC-10 vs authority-before-content: no contradiction once observation is split from disclosure. Deferring `captureOutcome` itself until after authority would open a TOCTOU window (authority passes, then getters reenter takeover/resolution during capture). The fix keeps eager capture and moves only branching/disclosure, which preserves single-observation and reentrancy ordering.

## Refusal-order coverage matrix / obligation map

Dimensions: authority {current valid grant, absent, field-equal forged, retired/pre-takeover, foreign/cross-Execution}; claim/exchange {well-formed current, missing/fractional/negative epoch, missing/fractional/negative base, stale epoch/base, terminal/resolved}; content {valid, invalid progress/depth, duplicate Emission key, unsupported Effect, malformed fail/error, unknown field, await, over-capacity}. No Cartesian explosion; smallest distinguishing set below, sharing two bad-content payloads so suppression (A/B/D) vs reporting (C) is a literal pair.

| Case | Input | First failing group | Content inspectable? | Returned | Retained | Distinguishes |
|---|---|---|---|---|---|---|
| A1 | current + well-formed + duplicate/effects + absent/forged | Authority | No observable result | `unauthorized_submission`, no `duplicate_key`/`effects_unsupported`/`too_deep`/`unknown_field`/`not_a_count` | Same, frozen, `deepEqual` returned | Authority-before-content; kills R1/B12 |
| A-cap | current + well-formed + 3 Emissions over limit 2 + absent/forged | Authority | No | `unauthorized_submission`, no `carries 3 Emissions`/`capacity_exhausted` | Same | Capacity is content-after-authority; kills B13 narrow and B12 broad |
| B1 | current + missing epoch + deep+dup+lone-surrogate + absent/forged | Authority (malformed is content-group) | No | `unauthorized_submission`, no `too_deep`/`duplicate_key`/`lone_surrogate`, no `not_a_count`/`missing_field` | Same | Malformed-claim path leaks nothing; kills old claim-null-before-authority |
| B2 | current + base -1 + effects + absent/forged (P2c) | Authority | No | `unauthorized_submission`, no `effects_unsupported` | Same | Same, envelope-path content |
| B3 sample | epoch 1.5/-1, base missing/1.5 + same bad content + absent | Authority | No | Same negative | Same | All `Cmal` equivalent via `claim === null` (`acceptCount`); sampling justified, not product |
| C1 | current + well-formed/malformed + same bad content + valid grant | Content | Yes | `malformed_envelope` naming all issues (`duplicate_key`, `effects_unsupported`, `writerEpoch` claim) | Same | Control: payloads genuinely invalid; entitled reaches later validation; corrected then accepts |
| D1 | post-takeover old coords + retired grant + bad content | Currency | No | `stale_exchange`, no content codes | Same | Currency-before-authority |
| D2 | post-takeover old coords + current grant + bad content | Currency | No | `stale_exchange` | Same | Currency precedes even valid authority |
| D3 | post-takeover current coords + retired grant + valid | Authority | No | `unauthorized_submission` | Same | Retired grants prove nothing current |
| Replay | accepted ID exact duplicate + absent/forged | Replay | Identity-equality only | `replayed:true`, same receipt object | No mutation | Replay-before-authority preserved |

For every case: relevant dimensions, expected first group, legal inspectability, returned refusal, retained refusal/evidence, and distinguishing rationale are recorded above. Well-formedness of fixtures is proved by Case C reporting the same codes that Cases A/B suppress.

## New tests and the specific boundary each distinguishes

`packages/kernel/tests/submission-authority.test.ts` (+229 lines, 7 tests, 4 describes):

- Case A (2 tests): grant-less/forged × duplicate/effects → unauthorized without disclosure; same content with grant → malformed with codes. Distinguishes authority-before-content on well-formed claims; kills B12.
- Case A capacity (1 test): over-capacity × absent/forged → unauthorized without `carries 3 Emissions`; same with grant → `capacity_exhausted`. Distinguishes capacity-after-authority neighbor; kills B13 narrow and B12 broad. Added after independent adversarial review found the gap; separate provenance recorded below.
- Case B (2 tests): 6 malformed-claim variants × absent/forged × triple-bad content → unauthorized without progress/emission/next/claim codes; P2c base -1 × effects → unauthorized. Distinguishes malformed-claim ordering; kills old implementation.
- Case C (1 test): valid grant × missing-epoch + triple-bad → malformed naming claim; corrected then accepts. Proves later validation reachable; control for A/B.
- Case D (1 test): retired/current grants × stale/current coords × bad content → stale/unauthorized per currency-before-authority. Preserves neighboring invariant.

Oracles assert explicit observable classification, reason regex presence/absence, retained `refusals.at(-1)` deep-equal to returned, frozen, whole-view equality except +1 refusal, receipts contiguity, and answerability. No helper encodes ordering as its oracle.

## New inverse-order ablation and why it would have caught the old implementation

Packet `ablations.mjs` B12 ports reviewer R1 verbatim: delete the `submission !== intent.submission` block, re-insert before `return ok(#accept)`. This is content validated before authority, the literal inverse of the canonical clause. Control 457/457 passes; B12 fails 4 (Case A duplicate/effects, Case A capacity, Case B malformed variants). The old implementation (claim-null malformed before authority) would also have been rejected by Case B, and the well-formed inverse would have been rejected by Case A — the suite previously survived R1 450/450 because no test crossed authority failure with invalid content. B13 (narrow capacity-before-authority: grant check moved to just before `outcome === null`, leaving capacity before authority) fails 1 (capacity test only), proving the neighbor boundary is independently pinned.

## Outcome of all prior packet ablations

Complete packet set 29/29 REJECTED with clean control 457/457 on exact C9: A1–A16, B1–B11 (including B10 455/2 and B11 456/1), plus new B12 (453/4) and B13 (456/1). Reviewer suite 12/12: R1 now REJECTED (was SURVIVED 450/450 on H10); R2 NOT APPLICABLE as written (its prefix span assumed the old claim-null branch; the equivalent currency-before-authority order is pinned by Case D and packet A3/B-series); R3–R12 REJECTED. No old mutation unexpectedly survived; no ablation weakened or removed unless noted (checks-07 pins below are superseded, recorded separately).

## Previous findings by reference

- `K12-R8-DOC-01`: closed on H10; preserved. Live 007 row links only files; `check:builder-docs` exit 0 on C9 (72 files, 1784 links, 38 imports) and to be rerun on exact H11 in handoff.
- `K12-R7-PROC-01`, `K12-R6-DOC-01`, `K12-R6-EVID-01`, `K12-R6-LAYER3-01`, `K12-R6-SELF-COMMENT-01`: closure confirmed on unchanged semantics; rerun evidence B10/B11 rejected; Layer-3 single owner and `OPEN(K3.2)` checked. EVID-01 closure stands for grant lifetime; R9-EVID-01 is a different clause (authority-before-content).
- R1–R5 findings (AUTH-01, DELIVERY-01, DOC-01, HISTORY-01, HOLD-01, REC-01, OBS-PERMITTED-01, PROC-01, TAKEOVER-01, AUTH-02, HISTORY-02, AUTH-DOC-01, R5-PROC-01): prior closures stand by reference; re-exercised by packet ablations and probes. AUTH-02 closure qualified and now completed by R9-ORDER-01 (uncaught branch of same check placement).

Why previous coverage missed R9: prior grant-less tests used valid content; prior content-defect tests supplied the current valid grant; therefore no oracle crossed authority failure with invalid content; the previous ablation set did not invert authority/content ordering. Recorded here as required.

## Additional in-scope defect with separate provenance

Independent adversarial review of the finished candidate (after implementation and tests, before packaging) produced one credible rejection: over-capacity proposals without authority were undisclosed by tests — a narrow capacity-before-authority mutation (move only the `overCapacity` block before the grant check) was accepted 14/14 on the submission-authority file. This is the same canonical clause (capacity is content-group after authority) on a neighboring path the initial matrix had not sampled. Fixed with separate provenance: added the over-capacity test above and packet ablation B13; did not hide the gap under R9 findings. After the fix the narrow mutation fails 1/15 on that file and B13 is REJECTED in the full set. No other in-scope defect was found; replay-before-authority, currency-before-authority, reference identity, retired-grant fencing, acceptance-state immutability, and test-oracle independence were verified holding.

## Exact C9..H11 administrative allowlist

`git diff --name-only C9 H11` contains only: `docs/development/work/K1.2/implementation-11.md` and `docs/development/007-work-packets.md` (K1.2 row to WAITING_FOR_REVIEW). No runtime, test, script, contract, baseline, or mental-model path in H. Implementation/runtime files are in C9; H11 contains only permitted report/status material. Sealed `review-09/` evidence untouched.

## Validation commands/results (exact clean C9)

Working tree/commit tested: clean `ca0dc2b15b9b276175fe6f48893bc6231ee528a3` on `claude/k1.2-outcome-acceptance-receipts`, `git status --porcelain` empty pre/post. Environment: Node v25.2.1, npm 11.6.2, TypeScript 5.9.3, macOS 26.6.2 arm64. Cwd: repository root.

| Command | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm test` | exit 0; 2511 tests, 2511 pass, 0 fail/cancelled/skipped/todo |
| `npm run test:kernel` | exit 0; 457/457 |
| `npm run test:conformance` | exit 0; 1945/1945 |
| `npm run test:sdk` | exit 0; 22/22 |
| `npm run check:builder-docs` | exit 0; 72 files, 1784 links/anchors, 38 imports |
| `node docs/development/work/K1.2/ablations.mjs` | control 457/457; 29/29 REJECTED; B10 455/2, B11 456/1, B12 453/4, B13 456/1 |
| Reviewer `node docs/development/work/K1.2/review-09/ablations-reviewer.mjs` | control 457/457; R1 REJECTED (was SURVIVED on H10); R2 NOT APPLICABLE (span superseded; equivalent order pinned by Case D); R3–R12 REJECTED |
| Reviewer `probe-order.ts` / `probe-race.ts` | P1 unauthorized; P2/P2b/P2c now all unauthorized with no content in returned or retained; P3–P7 holdings verified; race probes hold |
| `node docs/development/work/K1.2/checks-07.mjs` | Does not pass as written: asserts runtime bytes unchanged from H5 and `ablations.mjs`/test syntax unchanged. Both pins are intentionally superseded by this correction (runtime reordering + 7 new tests + B12/B13 + contract count). All other checks-07 assertions (sealed history, Layer-3 allowlist of 7 paths, no legacy/SDK source change, `git diff --check` except pre-existing sealed trailing whitespace, link resolution) verified holding; `git diff B HEAD -- packages/core/src packages/sdk/src packages/agents packages/models packages/retrieval packages/interoperability` empty. |
| Preservation/reference/link checks | `git diff --check B HEAD` clean except pre-existing sealed `review-09/ablations-reviewer.txt:3` trailing whitespace (sealed evidence, untouched); Layer-3 diff allowlist unchanged (no mental-model edit in C9); live row links only files |
| Authority/candidate-context checks | `execution-cycle.md#submission-authority` remains single canonical owner; no stale two-arg `deliver` description outside sealed history; no per-delivery authority or universal token wording; `OPEN(K3.2)` marker in prose + §4; `decision-01.md` unchanged |

No validation performed on C is described as exact-H validation. Exact-H verification (builder-docs gate on H11 after H11 exists, plus H SHA/pre-post porcelain/command/exit/counts/digest) is performed separately in the external handoff and honestly identified as post-H.

## Independent adversarial-review outcome

After implementation and tests but before packaging, an independent reviewer attempted rejection (malformed branch leak, diagnostic/evidence leak, eager validation, replay/currency displacement, structural equality, retired-grant resurrection, refusal mutation, tautological oracles, inverse mutation survival, C/H contamination). One credible rejection issued (capacity neighbor, above) and was resolved with separate provenance before packaging; re-verification shows B13 REJECTED and no remaining in-scope defect. The implementer did not overrule the reviewer without evidence. No architecture blocker was raised; no malformed-claim exemption was encoded.

## Handoff

K1.2 correction is ready for independent review: base B `a20d278185eaffc7f8b7489345a3624231ff6e6d`, new payload C9 `ca0dc2b15b9b276175fe6f48893bc6231ee528a3`, candidate H11 (commit containing this report; full SHA and verified advertised branch SHA in external handoff after non-force push), prior H10/review-09 history preserved. Reviewer: recheck cumulative B..H11 against the range tables, verify C9..H11 allowlist and exact-H11 gate result. No self-acceptance. No integration. No K1.3 release. No further architecture rewrite unless audit establishes a genuine owner-authority conflict.
