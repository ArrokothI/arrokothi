# Integration receipt — K1.2-correction-01 (and K1.2)

- Accepted H: `b7191dbf630defeff7756122a6798e15d0b73dd3`; acceptance record A:
  `b0ff7052aa8993d7547fbde48123dd058d2e0107`;
  [independent review](review-revision-10-independent-2026-09-30/review.md); [cleanup 01](cleanup-01.md).
- The candidate is cumulative over base `a20d278185eaffc7f8b7489345a3624231ff6e6d` and contains K1.2
  H14 `c36cbe04f7c97f198794bfede972d4861247cca0`. This merge therefore integrates K1.2 together with
  its correction. Review 13's historical ACCEPT of H14 and [invalidation-01](../K1.2/invalidation-01.md)
  are unchanged.

## Integration

- Integration commit: `ed509e11dc39ff24e10c1ace68189776c4270919`, the merge of PR #38 (branch
  `codex/k1.2-correction-01-activation-identity`), with parents `a20d278` (previous main) and
  `e0868a085d188c09842b10f5221a016cf2facc52` (the pushed cleanup head). It was observed as
  `origin/main` on 2026-09-30.
- Ancestry: H, A and the cleanup head are all ancestors of the integration commit.
- Content: the integration commit's tree `4bce049fbfb56d3ddc32034cbc59ec5c8500bcb2` equals the cleanup
  head's tree, so the merge added nothing. After H the branch added only review/status records
  (`4156646`, A) and the administrative cleanup (`e0868a0`). `git diff b7191db ed509e1 -- packages
  tests scripts examples mental-model package.json package-lock.json tsconfig.json` is empty.
- Verification on the integration commit (Node v25.2.1): `npm run typecheck` exit 0; `npm test` exit 0,
  3,774/3,774 tests, none failed, cancelled or skipped. The kernel sweeps were not rerun here. They
  passed in [cleanup 01](cleanup-01.md) on code byte-identical to this tree.

## Owner discussion and release

- Recorded by a Claude Code session (`claude-opus-5-5`) on 2026-09-30, from the owner's chat message
  reporting the merge and the owner's answers to three questions in the same session.
- Decision: merged and closed. K1.2 and K1.2-correction-01 are integrated.
- Invalidation-01's integration hold is lifted and superseded. K1.2 is integrated through the
  accepted cumulative correction rather than as H14 alone.
- [Invalidation-02](../K1.2/invalidation-02.md)'s V-D1 claim hold is unchanged. It stays with
  K1.1-correction-03.
- Discussion content: the owner gave no discussion notes beyond these decisions and did not
  explicitly waive the 006 learning-loop discussion. That discussion remains available to the owner.
- `next_release`: none. DESIGN-AUDIT-01, K1.1-correction-03 and K1.3 remain unreleased. No K1/E1
  closure follows from this integration.
