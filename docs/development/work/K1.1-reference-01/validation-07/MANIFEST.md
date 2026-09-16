# Validation manifest — K1.1-reference-01 round 7

Payload C7 `6535d5739c33a3973d0cce3a2473777a4ce14c2b`. Captured 2026-09-16T04:30:53Z UTC, Node v25.2.1, npm 11.6.2.

Each log names its own commit, run timestamp and toolchain in its header, and shows the
command before every result — so a fresh run is distinguishable from a copy of a previous
round's file (`REF1-R6-EVID-01`).

| File | SHA-256 | What it proves |
|---|---|---|
| `00-findings-and-scope.log` | `4b4c2f48c8b109b5389e399120ac241d1c6140474cecb47a9cd2be6bb5833853` | Both diff --check ranges, the 31 hard breaks, exclusion breadth, declared-path scope, executable and Layer-2 byte identity, sealed records untouched |
| `01-readme-and-sweep.log` | `ee2278f60be45dbb00d1d0d928f0eaff6702b33a1dc3d91f9af8a7aed013f66f` | README confined to the two authorized sections; WORD-02 closed; classified status sweep; decision record present |
| `02-typecheck.log` | `158a97a07fd2657dace934db1c7f666a58037a3ee5d9b6a2a0917118a5564422` | `npm run typecheck` exit 0 |
| `03-builder-docs.log` | `6dc6c0ac629b755177146e6ea96d5d8f04edd5a4cebf470f7719e7b2c39807bb` | `npm run check:builder-docs` 57/848/38, exit 0 |
| `04-integration-state.log` | `b73a8f6eaf3c167ec3d48353a07046de0a47b54a19eab4321d85e598c7b966a0` | main ancestry, which kernel main carries, and the merge dry-run — owner integration facts |

Not rerun this round: `test:kernel`, `test:conformance`, `test:sdk`, `test:evals`.
Justification, checkable in `00` §3: no executable byte differs A→C7. The full gate was run
at H4-ref (2322/356, conformance 1949/283, kernel 264/55, SDK 22, architecture 362/37).

**Node limitation, restated.** Two legacy Effect tests cancel on Node v22.22.3 (OP1),
pre-existing at original B, reproduced by four reviewers. This machine has Node 18 and 25
only and has never reproduced it. **No all-supported-Node green claim is made.**
