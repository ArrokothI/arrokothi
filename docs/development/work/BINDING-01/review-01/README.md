# Review 01 evidence

This evidence belongs only to BINDING-01 [review 01](../review-01.md) at H
`b7a24c79d547958c419b01e615e859f94ca3132b`, over C
`da945d3f8ba42f6d1ec6d5e3bcd74ae6a604502f` and B
`af9e3b0ece4786ec41940f1dfa5f0468d83ddd08`.

- `ci/`: the four files of GitHub Actions run `39868378094`, artifact
  `packet-verify-da945d3f8ba42f6d1ec6d5e3bcd74ae6a604502f` (id `12468695290`, zip digest
  `sha256:8b66bbb8862ddea03c912c8ed59fb04f4f36fb394200819acd4dd8b971e789c6`). Only `verify.json` is
  compressed, losslessly, as `verify.json.gz`. The stderr file is named `verify.stderr.txt` here so Git does
  not ignore it; its bytes are unchanged. The other two files keep their names and bytes.
- Result: `checks_passed`, 18/18 checks, exit 0, Node v26.10.0, 4-CPU Linux runner.

Retrieved on 2026-10-22 with `gh run download 39868378094` into a directory outside the clone. The reviewer
did not rerun the composed verify; it cites this exact-C run.

Original artifact SHA-256 values:

| File | Bytes | SHA-256 |
|---|---|---|
| `verify.json` | 12,469,132 | `6a8e44975862c26c93b2f647e9c8c266b3caf603acdcab45c316230ced5c129c` |
| `verify.stderr.log` | 18,713 | `9762d517417a2cffbeead04b48ee56d6bc5f63b76ce4d544069e6277eb754831` |
| `summary.json` | 2,457 | `4a3fbf3ae558467573cd669496744ee1b6001cba4ad20caf68f9569124286af2` |
| `run.txt` | 293 | `ef9dfa743cff921380f4ce5134803c265a8ee75b3fc655572e0c8842aeb79622` |

To validate the preserved bytes, run `shasum -a 256 -c SHA256SUMS` from this directory. To check the raw verify
file, decompress `ci/verify.json.gz` and compare with the value above.
