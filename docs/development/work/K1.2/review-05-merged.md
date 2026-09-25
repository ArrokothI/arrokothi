# Merged independent review reconciliation — K1.2 round 5

## Identity

- Date: 2026-09-25.
- Governing base B: `a20d278185eaffc7f8b7489345a3624231ff6e6d`.
- Round-5 payload C5: `aa8709673e6d53455f226d0fc01bdca6fb55e600`.
- Report-bearing candidate H5: `d13a82881c5fa11aa8fc48eff83a9472eef595a6`.
- Submitted branch head after H5: `f0de303f2ad20423debef9e88a83436df6a35110`.
- Branch: `claude/k1.2-outcome-acceptance-receipts`.
- Contract revision: 5.

This record reconciles two independent reviews of round 5:

1. ChatGPT independent reviewer, GPT-5.6 Sol, exact GitHub source/diff/evidence inspection.
2. Owner-supplied Arena.ai Agent Mode independent-review session
   `arena/01a0d71b-arrokothi`, underlying model not exposed by the platform. That reviewer
   unshallowed the repository, inspected the cumulative history and independently reran the command
   plan plus 27 distinguishing probes on Linux/Node 22.22.3.

This is a reconciliation record, not a new implementation round.

## Points of agreement

Both reviews independently conclude that exact H5 closes the only round-4 blocker,
K12-R4-AUTH-DOC-01.

At H5:

- C1–C15 pass.
- The three authority powers are stated consistently: visibility, explicit exchange-control
  authority, and attempt-bound Outcome submission authority.
- K12-R3-AUTH-02, K12-R3-HISTORY-02 and K12-R1-DOC-01 remain closed.
- Earlier takeover/hold/history/delivery/evidence closures remain intact.
- The round-5 correction changes executable TypeScript only in comments plus one suite title.
- Attached C5 validation reports full pass on its environment and 25/25 ablations rejected.
- The Arena reviewer independently reran the suite. Its two cancelled legacy conformance tests were
  reproduced identically at B under Node 22 and are therefore an environment observation, not a K1.2
  regression.
- No E1 result or K1 closure is established.

Accordingly, the substantive K1.2 implementation tree at H5 does not need another semantic
correction.

## Candidate-identity conflict after H5

The submitted branch did not stop at H5. It advanced one commit to:

`f0de303f2ad20423debef9e88a83436df6a35110`

That commit adds exactly:

- `mental-model/concepts/operations.rewrite.md`
- `mental-model/concepts/roles.rewrite.md`

These files were explicitly recorded by implementation-05 as pre-existing untracked owner working
files, were absent from C5/H5, and were not used by the C5 validation.

The Arena review inspected those post-H files and found that they are not harmless copies:

- they create sibling draft definitions beside maintained canonical Layer-3 owners;
- `operations.rewrite.md` reintroduces the removed term “minimum profile”;
- `roles.rewrite.md` says the Runtime “yields an Outcome”, contrary to the settled house wording
  that a Runtime submits an Outcome;
- the draft clock section weakens/removes the canonical OPEN(implementation) marker discipline;
- repository builder-doc validation intentionally excludes `*.rewrite*.md`;
- the post-H commit has no C/H report, clean validation or independent review.

Those observations were independently spot-checked against the current branch and are valid.

## Findings

### K12-R5-LAYER3-01 — P1 — post-H5 Layer-3 payload is outside the reviewed candidate

H5 itself satisfies C15. The submitted head does not.

006 requires architecture/documentation payload to be part of a payload C, validated, reported in H,
and independently reviewed. Adding two Layer-3 drafts after H5 changes the candidate tree outside
that boundary.

The current branch head therefore cannot inherit acceptance of H5.

Required outcome:

- do not certify or integrate `f0de303f2ad20423debef9e88a83436df6a35110`;
- either remove the two post-H drafts through a normal correction payload, restoring the maintained
  repository tree, or deliberately package them as their own payload with owner disposition,
  validation and review;
- do not modify the canonical `operations.md` or `roles.md` to conform to these drafts merely to
  make the post-H commit pass.

### K12-R5-PROC-01 — P2 — submitted branch head is not H5

The implementation report and 007 handoff define H5 as the commit containing implementation-05 and
the evidence/status allowlist.

`f0de303f2ad20423debef9e88a83436df6a35110` is a later content-bearing commit. An acceptance administrative commit built on that head
would necessarily include unreviewed payload in H..A, violating the verdict/status-only boundary.

Required outcome is the same correction as K12-R5-LAYER3-01.

## Non-blocking Arena observations

The supplemental reviewer also recorded five P3 observations: two test titles use
“visibility-only” although the decisive missing authority is the grant; WAITING is not reachable
until K1.3; dispatch/redeliver remain visibility-gated K1.1 behavior; its review environment observed
a different configured origin string; and Node-22 cancellation/link-count differences were
environmental. None blocks K1.2.

## Trajectory

Round 5 itself is a successful narrow correction. The authority model is no longer in a semantic
local minimum and no implementation-agent switch is warranted on that basis.

The remaining defect is candidate-boundary/process discipline: payload was added after the report
head. It should be corrected mechanically without reopening the working K1.2 semantics.

## Verdict

For exact H5 as an isolated candidate, all packet criteria pass.

For the **submitted branch state**, which includes the later post-H5 payload, the authoritative
packet verdict remains:

CHANGES REQUIRED
