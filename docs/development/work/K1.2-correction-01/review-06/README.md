# Review 06 evidence (K1.2-correction-01, H d5ffd35)

Reviewer-authored probes, mutation runner and raw logs for review-06.md. Nothing here is candidate
payload. Paths assume an extracted tree of H at `<tree>` whose `node_modules` comes from the lockfile.

- `coverage-map.md`: the independent coverage map, written before reading implementation-03,
  closure-03 or coverage-04.
- `p-chain.mjs` (R-P1): direct `canonicalize` timing, acceptance against refusal, with a
  prototype-chain depth D. Run it as
  `node --expose-gc --experimental-strip-types p-chain.mjs <tree> <mode> [D] [N] [M]`.
- `p-chain-outcome.ts` (R-P2): the same refusal through `submitOutcome`, from a visible caller
  with no grant.
- `p-chain-catch.mjs` (R-P4): the catch-path `describe(error)`.
- `p-chain-ingress.ts` (R-P5): the same refusal through K1.1 ingress and creation.
- `p-receipts.ts` (R-P3): an exact-coordinate oracle over receipts, the redelivery answer, the
  carried Event destination and the view coordinates, across two Executions.
- `mutants.py`: single-span mutants Z1–Z16 and W1–W8. Each runs the full kernel suite in a
  disposable copy, after a clean control. It needs `SP` set, with the H tree at `$SP/h`.
- The attribution mutant `mut-nodescribe` replaces only the `constructor` read in `describe` with
  `undefined`; see the review.
- `links.py`: an independent link/anchor check.
- `run-*.txt`: raw logs. `mutants-*-results.json`: per-mutant counts.

Notes:
- The mutation runner's result-file naming was fixed after the run. Result files are copied here
  under stable names; no mutant or verdict changed.
- The timing figures come from one machine (Apple M1, 8 GiB RAM, Node v25.2.1). They are
  comparative observations, not thresholds.
