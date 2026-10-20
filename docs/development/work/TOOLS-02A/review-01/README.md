# Review 01 evidence

This evidence belongs only to TOOLS-02A review 01 at H
`6e0a9b3d901d46b921e5c6243c65df3bbac386e4`, over C
`504fa5fb23b681e2715fcba97b98bcb456e778ee` and B
`e391ceba26164d2b461dc4c374db65058903b23e`.

- `ci/`: the four files retrieved from GitHub Actions run `39349102418`, artifact
  `packet-verify-504fa5fb23b681e2715fcba97b98bcb456e778ee`. Only `verify.json` is compressed, losslessly,
  as `verify.json.gz`. The stderr file is named `verify.stderr.txt` here so Git does not ignore it;
  its bytes are unchanged. The other two files retain their names and bytes.
- `ci-inspection.json`: reviewer extraction of run results, the new guard's CI control/ablation,
  and original artifact byte sizes and SHA-256 values.
- `diff-check.json`: candidate identities, changed-file lists, H parent, and all 21 JSON field changes.
- `tool-tests.txt`: successful 34-test run with Node v26.10.0.
- `tool-tests-node25.txt`: disclosed initial environment failure under Node v25.2.1.
- `refusal-registry.txt`: successful 322-check/322-mutation census.
- `guard-control.txt`: initial passing control under Node v25.2.1.
- `guard-control-node26.*.txt`, `guard-ablation.*.txt`, `guard-runs.json`: final control and exact
  registered ablation under Node v26.10.0, including exits and restoration evidence.
- `run-guard.py`: reviewer-authored reproduction runner for only the new guard and its ablation.

Local preparation and commands (outputs directed outside the clone):

```sh
git clone --no-hardlinks --no-checkout /Users/rex-shih/Documents/ArrokothI/arrokothi /private/tmp/tools02a-review-01-c
git -C /private/tmp/tools02a-review-01-c checkout --detach 504fa5fb23b681e2715fcba97b98bcb456e778ee
cd /private/tmp/tools02a-review-01-c
export PATH=/Users/rex-shih/.local/share/arrokothi/node-v26.10.0-darwin-arm64/bin:$PATH
python3 -B -m unittest discover -s tests/tooling -p test_corpus_tools.py -v
python3 -B tests/tooling/check-refusal-registry.py
python3 -B /private/tmp/tools02a-review-01-logs/run-guard.py /private/tmp/tools02a-review-01-c /private/tmp/tools02a-review-01-logs /Users/rex-shih/.local/share/arrokothi/node-v26.10.0-darwin-arm64/bin
```

The registry census was originally run before the PATH override and succeeded; it does not need Node.
The initial test run used the same test command before that override. `run-guard.py` is copied here from
the temporary log directory; adjust its location and three arguments when reproducing elsewhere.

No full verify or local adoption census was repeated. The CI workflow supplies that evidence under
the owner's explicit instruction and 006's allowance to cite the exact-C run.

To validate all preserved bytes, run `shasum -a 256 -c SHA256SUMS` from this directory. To check the
original raw verify digest, decompress `ci/verify.json.gz` and hash the resulting bytes; the expected
value is `b99ee6352a500f67c3ddd33c8e40d454f4231d337270fbb4c912af3dd068bdd5`.
