# Review 02 raw evidence

Output of preliminary independent review 02 of K1.2-correction-01 round-2 payload
`c323e821dffbcd65114447a66593eeec9be699fb`; no report-bearing H existed. Reviewer-authored probes and
logs only; nothing here is candidate payload, and nothing here is run by the candidate's tests.

- `typecheck`, `full`, `kernel`, `conformance`, `sdk`, `builder`, `evals`, `abl-sealed`,
  `abl-adapted`, `abl-corr`, `r11`, `records` — repository commands in a clean detached worktree at
  `c323e82` after `npm ci` (Node v25.2.1, npm 11.6.2, TypeScript 5.9.3, Darwin arm64). Each file
  ends with its exit code.
- `probe-identity`, `probe-maxlen`, `probe-namespace` — review-01's probes rerun at `c323e82`;
  `probe-diag-maxlen` — the implementer's engine-maximum probe.
- `reviewer-ablations.mjs` / `abl-reviewer.txt` — R1–R12 single-span ablations, full kernel suite.
- `probe-aggregate.ts` (K12C1-R2-AGG-01), `probe-equality.ts` (K12C1-R2-EVID-01), `probe-cost.ts`
  (O-R2-1). Run as `TREE=<worktree> node --experimental-strip-types <probe>`; see each file's header.
  Their outputs are quoted in `../review-02.md`.
