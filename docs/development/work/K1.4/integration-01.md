# K1.4 — integration receipt 01

Recorded 2026-11-14 by the Claude Code desktop session (`claude-opus-5-5`) that was K1.4's coding agent and
did the owner-delegated cleanups 01 and 02. The record covers the owner's manual merge of `claude/k1.4`.

- **Accepted H (K14-1 to K14-6):** `e307943d6b315e724e49107c3b26a1100ef4916c`, over C
  `72d452bb39e0ae0f846d85e273441d06a9cd22fb` and base B `608f9ece44dbe42b78974bdac9e7ddcd33697705`.
  [Review 05](review-05.md) (Codex GPT-6) is recorded at `7bf80555c9549b980b47f60592fc049b9da7e175`. Its
  transcription A is `99e54a56d04b98ab2750e2d13e4f67998596a4b9` ([acceptance 01](acceptance-01.md)).
- **Accepted documentation correction (round 6):** H `64c505bfee13cae340710942e69fe805723aaad9`, over C
  `5b81a1b0cd9e73d7591ea23fd29195e24536d50d`, whose parent is the cleanup 01 head
  `b153ccacb57c35652be3aeba43f47a48905e077b`. [Review 06](review-06.md) (Claude Fable 5.2, selected by the owner
  in [owner choice 08](owner-choice-08.md)) is recorded at `8eb918ab238c7253a7327138a1dbbb3ce8c2d075`. Its
  transcription A is `24b69680a61346bc8044c96c146b18b38c6722a4`.
- **Cleanup head:** `29e5b3970df44fb6f09904cefefc4a2cc55b72f1` ([cleanup 02](cleanup-02.md); [cleanup 01](cleanup-01.md)
  before it).
- **Integration:** `eb8472e59f22cab9eefaa559b8b67b745dac4013`, the merge of
  [PR #67](https://github.com/ArrokothI/arrokothi/pull/67) by Rex-Shih at 2026-11-14 12:52:55 UTC (07:52:55 EST).
  On 2026-11-14 the GitHub API reported that merge, with PR head `29e5b397` and base `608f9ece`, and
  `git ls-remote` showed remote main at exactly that commit.
- **Ancestry:** the merge's parents are B `608f9ece` and the cleanup head `29e5b397`. B was remote main
  throughout, so no other main content enters. B..cleanup head is 46 commits. Every identity above is an ancestor
  of the integration commit: both payloads C, both accepted H, both review recordings, both transcriptions A, the
  closed-evidence import `15d2a131`, the cleanup 01 head and the cleanup head.
- **Content:** the integration tree `9ce9b3ececa1b54a122fe5cae54e0fcc2d02bddd` equals the cleanup head's tree, and
  `git diff` between them is empty. There are no substantive merge differences. Between H `e307943d` and the
  cleanup head, the only changes outside `docs/development/` are round 6's payload: two Layer-3 pages, the quick
  start, and comment-only edits to `packages/sdk/src/host.ts` and `types.ts`. Review 06 accepted that payload and
  found its executable delta empty. Between H `64c505bf` and the cleanup head, only `docs/development/` changes:
  review 06 and its evidence, owner choice 08, cleanup 02, 007, 014 and progress.
- **Validation:** nothing was rerun for this receipt. The merged tree equals the checked cleanup tree.
  - [Packet verify run 43569826480](https://github.com/ArrokothI/arrokothi/actions/runs/43569826480) at round 6's C
    returned `checks_passed`, 19/19, with repository tests 5,054/5,054. Run 43131441604 is the composed verify
    at the accepted C. Both stay evidence at their C, not integration runs.
  - Packet verify runs only on dispatch, so the merge started no run. PR #67's two automatic checks, Vercel and
    Vercel Preview Comments, reported success.
  - Cleanup 02's checks (candidate, inventory, adoption, typecheck, builder docs, architecture tests and the link
    check) are recorded there.
- **Branches:** none deleted. Remote `claude/k1.4` still points at the cleanup head, and the review and evidence
  branches remain.

## Owner decision and remaining obligations

The owner's messages in this chat on 2026-11-14 were "I've merged. Check it." and then "Write the receipt". This
session checked the merge as stated above before writing. Recorded result: **K1.4 is integrated.** The supported
`createApplication` SDK on main now drives the private Kernel through the legacy bridge, and the 0.8.x runtime
runs behind one Execution Driver.

The messages raised no concern. They do not address owner closure, so this receipt records none. These remain
open:
- K1.4's owner item O-3: whether K1.4 or K1.4-gate triggers the scheduled `evidence.md` rewrite;
- review 06's P3 observations R6-OBS-01..03, listed in cleanup 02;
- the supported-entry benchmark fixture confirmation, which K1.3's owner closure also waits on.

The accepted limits stay as review 05 and [017](../../017-known-limitations.md) state them: L-29 to L-37, and L-01
for the wrapper. K14-G is not met here, and no E1 result is claimed. `@arrokothi/sdk` stays `"private"` until a
release packet.

**next_release: none.** K1.4-gate stays PLANNED. Its dependency on K1.4's integration is now met. It still depends
on the benchmark owner's E1 release and needs its own owner release. No hold is lifted.
