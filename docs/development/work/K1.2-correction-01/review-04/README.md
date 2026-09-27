# Review 04 evidence (source A: Claude Code, claude-opus-5-5, 2026-09-27)

Raw outputs of reruns at exact H `312f2584d14b0c168c2152c373a4f07d4a292d74`, run in a `git archive`
extract of H with the lockfile's `node_modules` (Node v25.2.1, npm 11.6.2, TypeScript 5.9.3,
Darwin 25.6.0 arm64). Reviewer runners and probes are evidence, not payload; run them from the root of
an extracted H tree after copying them into `probes/`.

- `typecheck.txt`, `full.txt`, `sdk.txt`, `builder.txt`, `evals.txt`: repository commands.
- `abl-sealed.txt`, `abl-adapted.txt`, `abl-corr.txt`: the packet's three ablation runners.
- `abl-reviewer.txt`, `abl-reviewer-2.txt`: `reviewer-ablations.mjs` (X1–X19, then X20–X23), full kernel suite per mutant.
- `probe-p4-at-H.txt`, `probe-p4-vs-mutants.txt`: oracle `p4-exact-coordinates.ts` at H and against each surviving mutant (`oracle-vs-mutants.mjs`).
- `probes-p1-p3.txt`: `p1-permitted-unsafe.ts`, `p2-review14.ts`, `p3-control-reentry.ts`.
- `probe-p5-cost.txt`: `p5-refusal-cost.ts` (V-D1 cost; single runs, `/usr/bin/time -l`).
- `links.txt`: `linkcheck.py` over 41 files.
