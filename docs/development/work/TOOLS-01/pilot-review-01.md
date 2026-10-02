# TOOLS-01 pilot review 01: Muse's 10 artifact origins

This reviews an experiment. It is not a Prompt B acceptance review, and nothing here accepts
TOOLS-01, marks it review-ready, or maps any origin.

## Identity and access

- Reviewer: Claude Code, `claude-opus-5-5`, session `feca3009-eaf1-43e7-a336-85735300b04d`, 2026-10-02.
  The reviewer did not take part in the pilot or in implementing TOOLS-01.
- Access: local Git, shell and repository files; push access to `origin/codex/tools-01`. Node v25.2.1, Python 3.13.5.
- Read: AGENTS.md, [contract](contract.md), [continuation 01](continuation-01.md),
  [tests/tooling/README.md](../../../../tests/tooling/README.md), and the existing mappings
  `artifact-b06e44e7a30c0b735cf084aa` (suite), `artifact-1bc6bdfb882a53a207254ef4` (case),
  `artifact-91a16df2b59f363129b8a582` and `artifact-58bd5fa05308bf7be5582ac0` (non_executable).

## Commit identity and scope

- Muse's commit: `72b334e1afde391da4045f2ba42f2b00a64e8ecc`, a single commit with parent
  `60fc5bf8e7047b8e22c3b305e7d215dc0ae63da2`. It was local and unpushed when this review started.
- `git diff --name-only 60fc5bf8 72b334e1` gives only `docs/development/work/TOOLS-01/pilot-01.md`.
  `tests/fixtures/packet-tools/adoption.json` is byte-identical to `60fc5bf8`, because Muse left all
  10 origins pending. The procedure expected two files, but this is consistent with an all-pending
  result and touches nothing outside the allowed set.
- Selection checked mechanically: the first 10 `mappings` rows whose origin starts with `artifact-`
  and whose status is `pending` are indices 43–52, in the same order Muse lists them.

## Reruns at `72b334e1`

| Check | Result |
|---|---|
| `npm run test:packet-tools` | Exit 0; `Ran 158 tests in 45.681s`, `OK`. |
| `python3 -B scripts/packet_tools.py corpus --revision 72b334e1afde391da4045f2ba42f2b00a64e8ecc --spec tests/fixtures/packet-tools/adoption.json` | Exit 0; `result: extraction_pending`, `origins: 1549`, counts `suite 116, non_executable 30, pending 1395, case 8`, `pending_adoption: 1395`. |
| `git diff --check 60fc5bf8 72b334e1` | Exit 0, no output. |
| `inventory` at `72b334e1` | Exit 0, `provenance_verified`; used for revision, path and line. All 10 origins pin `66bc041175e6fc191c2e7cf88de198111e7d97c9`. |

Muse's copied numbers match. Its corpus line names revision `60fc5bf8` because it ran before
committing; adoption.json is unchanged, so the counts are the same.

## Per-origin judgment

All sources are at `66bc0411` under `docs/development/work/`. I listed each counterexample from
`git show` before reading Muse's row, then compared.

| # | Origin / source | My counterexample list | Muse | Grade | Evidence |
|---|---|---|---|---|---|
| 1 | `artifact-46f9465e…` K1.1-correction-02/measure-probe.mjs:1 (25-line payload probe) | 4 inputs, no expected result in the file: `canonicalize('a'.repeat(n))` for n = 1,048,576, 8,388,608 and 33,554,432, counting `charCodeAt`; and a forwarding Proxy over a 550,000-entry object, counting `getOwnPropertyDescriptor`. It prints only `{reads, codes}`. | pending | CORRECT-BUT-WEAK | The list is accurate and pending is right. The rationale is not. It says a suite mapping would need tests asserting the historical read counts, and that the current zero-read assertions are an "opposite observable". A historical defect witness maps to a test of the required result for the same input; precedent `artifact-b06e44e7…` does exactly that. Muse also missed the real blocker: the Proxy input's required result is superseded by owner decision-01 (refuse every Proxy, pending K1.1-correction-03), and the V-D1 claim stays held. |
| 2 | `artifact-7e86db30…` K1.1-correction-02/review-01.md:58 (12-line inline js) | 1 in the fence: `'a'.repeat(33_554_432)` → refusal `string_too_long`, `too_many_bytes`. The KC2-R1-01 required result is reads bounded by the semantic limits (historically 67,108,864). The surrounding table and prose add the 1 Mi and 8 Mi strings and the 550,000/17,000-entry descriptor cases. | pending | CORRECT-BUT-WEAK | Pending is defensible. The nearest maintained test is `value-diagnostic-work.test.ts:541` "V-D1 UTF-16 preflight: huge values and names do zero character reads and keep full byte charges". It asserts `assert.deepEqual(codes(observed.result), ["string_too_long", "too_many_bytes"])` and `assert.equal(observed.reads, 0)` for 16,777,216 characters, not 33,554,432, and the V-D1 claim is held. Muse's stated reason has the same misconception as #1 (it wants the buggy counts asserted), so its gap is not the real one. Muse correctly limited the fence to the 33,554,432 case. |
| 3 | `artifact-580251cf…` K1.2-correction-01/ablations-03-rebound-06.mjs:1 | 4 rebound mutation anchors: X12 (both history builders), X18 takeover answer, X19 (both recovery answers), X20 protocol answer, each → `diagnosticIdentity(...)`. Expected: the round-3 runner (SHA `fef23a33…`) REJECTS each against the 35-test control; asserts count 4 and 21 mutations. | pending | CORRECT | Exact match. A mutation counterexample closes by a named kill; nobody established one without running it, and the registry outcome was not available to Muse. The stated gap is real. |
| 4 | `artifact-5354ca6e…` ablations-03.mjs:1 | 21: sealed X8–X23 (16, from review-04/reviewer-ablations.mjs `98a6ac4c…`) plus inline V1–V5. Expected REJECTED (exit ≠ 0, fail > 0, pass > 0) against exact-coordinates + value-refusal-cost, 35-test control. | pending | CORRECT | Every X and V description matches the sealed and inline definitions. The gap is real. |
| 5 | `artifact-ca618476…` ablations-04.mjs:1 | 16: Z1–Z16 from review-06/mutants.py `b2906ec2…`; all 16 replacements use `diagnosticIdentity`. Expected REJECTED by the full Kernel suite with ≥ 1 `DEC-4 exact retained coordinates:` failure, same test count, no cancelled/skipped/todo. | pending | CORRECT | Exact match, including the oracle-prefix rule. |
| 6 | `artifact-89a6c743…` ablations-06.mjs:1 | 22: H1–H22 across coordinator.ts, envelope.ts and own-array.ts (`O`). Expected REJECTED by the full Kernel suite against a clean control on the same snapshot. | pending | CORRECT | All 22 descriptions match, including H8 (`holdsOf(exchange)` for `holdsOf(commit)`) and H22's file. |
| 7 | `artifact-d3c77a74…` ablations-07.mjs:1 | 28: R1–R12 (READ-01) and C1–C16 (COMMIT-01). Expected REJECTED by the full suite and failing ≥ 1 of the **18** `RULE_TESTS` names (source lines 62–79). | pending | CORRECT-BUT-WEAK | Outcome and the 28-item list are right. Muse says "19 named rule tests lines 61–80"; the set has 18 entries. This is a count error, not a fabricated title. |
| 8 | `artifact-defc1c19…` ablations.mjs:1 | **67**: I1–I7; 31 generated renderer mutants (30 in coordinator.ts, 1 in outcome.ts; the first is labelled D35, the rest D1–D30); D31–D34; R1, R2 and R4–R12 (11; there is no R3); G1–G14. Expected REJECTED against the 571-test control. The renderer anchors are computed from the then-current source, not stored. | pending | CORRECT-BUT-WEAK | Outcome and families are right. Muse writes "60+" rather than the exact 67, and misses the D35 label. The procedure asks for a list of the distinct counterexamples. |
| 9 | `artifact-1ad2b2a0…` check-records.mjs:1 | 0 Kernel counterexamples. A historical gate on repository state only: ancestry, sealed-record diffs, decision SHA pins, the exact changed-test list, preservation of pre-round-2 tests and of the coordinator creation slice, and local link/anchor checks. The catalog disposition is "Retire as a reusable runner; retain sealed provenance". | pending (low confidence) | OVER-CAUTIOUS | Muse's description is accurate, and it named the likely outcome. But the mapping is clear: the catalog retires this runner as a "historical gate". Precedent `artifact-58bd5fa0…` maps old-commit preservation git commands to `historical_command`. The reason is an enum (`policy`, `historical_command`, `record`, `unavailable_source`; `packet_tools.py:311`), not free wording. |
| 10 | `artifact-877aada3…` diagnostic-ablations-04.mjs:1 | 4: T1–T4 on values.ts `describe` and the pre-read oversized-string guard. Expected REJECTED against value-diagnostic-work.test.ts with the same test count and no cancelled/skipped. | pending | CORRECT | Exact match. The gap is real. |

Counts: CORRECT 5, CORRECT-BUT-WEAK 4, OVER-CAUTIOUS 1, FALSE-COVERAGE 0, WRONG-CLASS 0, FABRICATED 0.
No suite or non_executable outcome was claimed, so no cited test needed confirming. The files and
tests Muse names in passing (`value-diagnostic-work.test.ts` at 618 lines,
`value-refusal-cost.test.ts`, the sealed review-04 and review-06 definitions) exist as described.

## pilot-01.md overclaiming

The record calls itself implementer pilot work, not acceptance. It marks nothing review-ready and
claims no push, and its numbers match my reruns. No overclaim was found. The record does carry
the rationale errors graded above under #1, #2, #7 and #8. It stays as written, as the experiment's
record.

## Verdict

**PARTIAL.** OVER-CAUTIOUS #9 rules out KEEP. There is no fabricated or false-coverage item, so REJECT
does not apply. PARTIAL keeps the CORRECT origins (#3, #4, #5, #6, #10) and reverts the rest to
their `60fc5bf8` values. Muse changed no adoption.json entry, so the revert is a no-op:
adoption.json at the pushed head equals `60fc5bf8` byte for byte. All 10 origins remain pending,
and the pending count is still 1,395. In practice the pilot advanced P1 by zero origins.

## Delegation recommendation

The work should wait for GPT-6. Do not give Muse a larger mapping batch under the current outcome set.

- **Yield.** Seven of these 10 origins are mutation runners. Their natural destination is the
  case/mutation registry (`case`), which Muse was not allowed to use. A `suite` claim for a mutant
  needs a named kill that nobody has run. Later pending artifacts are probably similar, so the same
  outcome set would close almost nothing.
- **Concept.** Muse thinks a historical defect witness maps to suite only if a current test asserts
  the old defective counts. That error is safe here because it pushes toward pending. But it shows
  the model does not yet hold the mapping semantics, and the converse error (topic-level matches
  counted as coverage) is the risk the pilot was designed to detect.
- **Strength.** Extraction quality was good. Muse read the sealed sources, reproduced the X, Z, H,
  R/C and T inventories exactly, invented nothing and stayed in scope. Its errors were imprecise
  counts.

If the owner still wants Muse involved, use it only as an extraction aid, and only after GPT-6's
deferred contract revision: group mentions by distinct counterexample, and make the tool verify
the test titles in every suite mapping. Extra guards would then be:

- exact counterexample counts checked by a script against the source;
- the held-claim list (V-D1, Proxy/re-prototyped built-ins, V-ENV), with its owners, given up front;
- a worked example of historical defect witness → required-result test;
- no `suite` outcome without a tool-verified title;
- an independent rerun and review of each batch.

Correct mapping for GPT-6 for the origin graded wrong:

- **#9 `artifact-1ad2b2a0e120c37b9ce6ec26`** → `non_executable`, reason `historical_command`. It
  is a historical repository-state and record-preservation gate with no Kernel input or expected
  result, and the catalog says to retire it. Its sealed checks are superseded by F1's candidate
  verification for current packets.

Notes on CORRECT-BUT-WEAK rows, for the real gap rather than Muse's stated one:

- **#1:** the Proxy input is governed by decision-01 and K1.1-correction-03.
- **#2:** a suite mapping to `value-diagnostic-work.test.ts:541` needs an explicit
  16,777,216-vs-33,554,432 equivalence argument and attribution to the held V-D1 claim, or a
  stored case for the exact input.

PILOT PARTIAL — CORRECT 5, CORRECT-BUT-WEAK 4, OVER-CAUTIOUS 1, FALSE-COVERAGE 0, WRONG-CLASS 0,
FABRICATED 0; no adoption.json revert was needed. Wait for GPT-6.
