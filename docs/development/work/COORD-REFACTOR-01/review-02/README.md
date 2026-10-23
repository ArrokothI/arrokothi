# Review 02 evidence

This evidence belongs only to COORD-REFACTOR-01 [review 02](../review-02.md) at H
`23c8919f949b932b67567a6ee3f54d8b77b76449`, over C
`9f1412d1b3f6f41120609a4886a51b4c32c69880` and B
`7626a623dad8acfc73584e08212c126b5b6daefc`.

- `ci/`: the four files of GitHub Actions run `39996755805`, artifact
  `packet-verify-9f1412d1b3f6f41120609a4886a51b4c32c69880` (id `12522633265`, zip digest
  `sha256:c8ddf79174c077d17d36f5cc39f302603b1af509e0aeb235452e8373966ff210`). Only `verify.json` is
  compressed, losslessly, as `verify.json.gz`. The stderr file is named `verify.stderr.txt` here so Git does
  not ignore it; its bytes are unchanged. The other two files keep their names and bytes.
- Result: `checks_passed`, 18/18 checks, exit 0, Node v26.10.0, 4-CPU Linux runner.

Retrieved on 2026-10-23 with `gh run download 39996755805` into a directory outside the clone. The reviewer
did not rerun the composed verify; it cites this exact-C run.

Original artifact SHA-256 values:

| File | Bytes | SHA-256 |
|---|---|---|
| `verify.json` | 12,598,760 | `1312c939a9638f13594571194588447d3d3cc0de01dfa97b938b307c51d4532c` |
| `verify.stderr.log` | 18,864 | `828f087a2e793abf73afdc837f18f07a12b5830eba669aee61abc37a88a2da59` |
| `summary.json` | 2,457 | `a1765ca4f6ff60feb3263b7685e65efb88eb5613774e3ca8b2ebce6f874413cf` |
| `run.txt` | 300 | `d734c3e066a3de7700534bb3d8b24b2120f7ed4e6b57a9310ee373794683457d` |

To validate the preserved bytes, run `shasum -a 256 -c SHA256SUMS` from this directory. To check the raw verify
file, decompress `ci/verify.json.gz` and compare with the value above.
