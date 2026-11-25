# K1.4-candidate — integration receipt 01

Recorded 2026-11-21 by the Claude Code desktop session (`claude-opus-5-5`) that did the owner-delegated
[cleanup 01](cleanup-01.md). It did not implement, check or review the packet. The record covers the owner's manual
merge of `claude/k1.4-candidate`.

- **Accepted H:** `a734d03a9eb352bd29988bff1a68d9d6ca9bb2d3`, over C `848b1957ae9e598bb256712c07a3cc22c39fbaf7`
  and base B `c1951226338de6ccd3e4e6289259549551268f61`. [Review 04](review-04.md) (Codex GPT-6) is recorded at
  `30c5c0860707cf50afdf6389185f919321d40954`. That commit also writes the 007 transcription, so it is A.
- **Cleanup head:** `33f8cf18a36ea253797158d3fd8a161432eb51af` ([cleanup 01](cleanup-01.md)), after the
  closed-record import `8337acad631b901cb5ddf75aa1a2c0827b31fc48`.
- **Integration:** `e0064da4820579b89faca44316053171ab4ab63c`, the merge of
  [PR #71](https://github.com/ArrokothI/arrokothi/pull/71) by Rex-Shih at 2026-11-22 02:41:03 UTC (2026-11-21
  20:41:03 CST). On 2026-11-21 the GitHub API reported that merge, with PR head `33f8cf18` and base `main`, and
  `git ls-remote` showed remote main at exactly that commit.
- **Ancestry:** the merge's parents are B `c1951226` and the cleanup head `33f8cf18`. B was remote main throughout,
  so no other main content enters. B..cleanup head is 19 commits. Every identity above is an ancestor of the
  integration commit: C, H, A, the import and the cleanup head.
- **Content:** the integration tree `5145b591810cd2338bebd18961835a0be77d382e` equals the cleanup head's tree, and
  `git diff` between them is empty. There are no substantive merge differences. Between H and the cleanup head only
  `docs/development/` changes: review 04 and its evidence, the imported design-check and review records,
  cleanup 01, 007, 014 and progress.
- **Validation:** nothing was rerun for this receipt. The merged tree equals the checked cleanup tree.
  - [Packet verify run 44876502133](https://github.com/ArrokothI/arrokothi/actions/runs/44876502133) at C returned
    `checks_passed`, 19/19, with repository tests 5,322/5,322. It stays evidence at C, not an integration run.
  - Packet verify runs only on dispatch, so the merge started no run. PR #71's two automatic checks, Vercel and
    Vercel Preview Comments, reported success.
  - Cleanup 01's checks (candidate, inventory, adoption, typecheck, builder docs, architecture and K0 tests, and
    the link check) are recorded there.
- **Branches:** none deleted. Remote `claude/k1.4-candidate` still points at the cleanup head, and the design-check
  and review branches remain.

## Owner decision and remaining obligations

The owner's messages in this chat on 2026-11-21 were "Merged. Check it" and then "Write the receipt". This session
checked the merge as stated above before writing. Recorded result: **K1.4-candidate is integrated.** Main now has
`kernelCandidate` in `tests/conformance/k0-candidate/`, a real-Kernel candidate for the K0 fixture with pinned
verdicts of 12 PASS and 3 REFUSED.

The messages raised no concern. They do not address owner closure, so this receipt records none. They also do not
address the three CI ZIPs of reviews 01–03 that the import brought into the tree. Cleanup 01's retention note
stands: keeping them is the owner's call at the later archive maintenance change. These remain open:
- the owner discussion and closure of K1.4-candidate;
- K1.4's owner item O-3: whether K1.4 or K1.4-gate triggers the scheduled `evidence.md` rewrite;
- the supported-entry benchmark fixture confirmation, which K1.3's owner closure also waits on.

The accepted limits stay as review 04 and [017](../../017-known-limitations.md) state them: L-38 to L-44. A run of
the candidate in this repository is its own report. No E1 result is claimed, and K14-G is not met here. D01-CHK-04
and the three dependency-alternative schedules belong to K2's E2 gate. Cleanup 01 holds the process retro.

**next_release: none.** K1.4-gate stays PLANNED. Its dependency on K1.4-candidate's integration is now met. It still
depends on the benchmark owner's E1 release that pins this candidate, and needs its own owner release. No hold is
lifted.
