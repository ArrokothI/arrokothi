# Review 03 raw evidence

Output of independent review 03 of K1.2-correction-01 candidate H
`312f2584d14b0c168c2152c373a4f07d4a292d74` (payload C `6d9fbb3db4955ee2216fedf0d0b69c8e104367bf`).
Reviewer-authored logs and one ablation script only; nothing here is candidate payload.

- `typecheck`, `kernel`, `full`, `conformance`, `sdk`, `builder`, `evals`, `abl-corr`, `abl-sealed`,
  `abl-adapted`, `r11`, `records` — repository commands run in a clean detached worktree at exact H
  after `npm ci` (Node v25.2.1, npm 11.6.2, TypeScript 5.9.3, Darwin arm64). Each ends with its exit.
- `probe-*` — review-01/review-02 probes and the implementer's engine-maximum probe rerun at H
  (`TREE=<worktree> node --experimental-strip-types <probe>`); the aggregate and cost probes ran
  under `/usr/bin/time -l`, one process each.
- `reviewer-ablations-h2.mjs` / `abl-reviewer-n.txt` — N1–N10 single-span ablations, full kernel
  suite per mutant (`TREE=<worktree> node reviewer-ablations-h2.mjs`).
