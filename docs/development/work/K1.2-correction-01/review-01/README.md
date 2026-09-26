# Review 01 raw evidence

Output of independent review 01 of K1.2-correction-01 candidate H
`6541115e2e5389a7e5cff86f87d857b4eb486d7d`. Reviewer-authored probes and logs only; nothing here is
candidate payload, and nothing here is run by the candidate's tests.

- `typecheck`, `full`, `kernel`, `conformance`, `sdk`, `builder`, `evals`, `abl-orig`, `abl-corr`,
  `r11`, `records` — raw output of the repository commands run in a clean detached worktree at exact
  H after `npm ci` (Node v22.22.2, npm 10.9.7, TypeScript 5.9.3, Linux x86_64). Each file starts
  with the command, the checked-out SHA and a UTC timestamp, and ends with the exit code.
- `probe-identity.ts`, `probe-maxlen.ts`, `probe-namespace.ts` — reviewer probes. Run as
  `TREE=<worktree> node --experimental-strip-types probe-<name>.ts` (`probe-maxlen` with
  `--max-old-space-size=4096`, `probe-namespace` with `--max-old-space-size=8192`).
- `probe-H.txt` / `probe-R.txt` — `probe-identity` at H and at the release `6ed7d3a`. At the release
  the probe stops with a TypeError after P1, because the release refuses the takeover
  (`malformed_value`, review-14's defect), so the probe's next step dereferences no value.
  `probe-R-p2b-p4.txt` reruns P2b–P4 alone at the release.
- `probe-maxlen-H.txt` / `probe-maxlen-R.txt` — counterexample 2 of K12C1-R1-DIAG-01.
- `probe-namespace-H.txt` — observation O1 (namespace of 2^28 + 1,000 code units).
- `reviewer-coverage-before-report.md` — the coverage map written before implementation-01 and
  `reconstruction.md` were read.
