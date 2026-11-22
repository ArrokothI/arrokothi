# Review 04 evidence

Subject H: `a734d03a9eb352bd29988bff1a68d9d6ca9bb2d3`.
Payload C: `848b1957ae9e598bb256712c07a3cc22c39fbaf7`.
The verdict and interpretation are in [review-04.md](../review-04.md).
These files are reviewer evidence, not candidate implementation or a new conformance port.

Local environment: Node v26.10.0, npm 11.19.1, Python 3.14.6, Darwin arm64.
The fresh clone was `/private/tmp/arrokothi-k14-review04`. Node 26.10.0 was installed outside
the checkout at `/private/tmp/node-v26.10.0-darwin-arm64`; its `bin` was first on PATH for Node/npm
commands. `npm ci` used H's unchanged lockfile. Tests were run at H before review edits.

## Reproduction

Use a fresh H checkout and `npm ci`, with Node 26.10+ on PATH. Set `EVIDENCE` below to the absolute
directory containing these review files (the review branch can be a separate checkout).
The following are the commands used, with evidence filenames normalized from temporary paths:

```sh
node --no-warnings --test --experimental-strip-types tests/conformance/k0-candidate/*.test.ts tests/conformance/k0/*.test.ts
npm test
npm run typecheck
npm run check:builder-docs
node --no-warnings --experimental-strip-types "$EVIDENCE/prior-probes.mjs" "$PWD"
node --no-warnings --experimental-strip-types "$EVIDENCE/extra-probes.mjs" "$PWD"
python3 -B "$EVIDENCE/oracle-mutants.py" "$PWD"
python3 -B "$EVIDENCE/matrix-counts.py"
python3 -B "$EVIDENCE/registry-check.py"
python3 -B "$EVIDENCE/scope-check.py"
python3 -B scripts/packet_tools.py candidate --payload 848b1957ae9e598bb256712c07a3cc22c39fbaf7 --head a734d03a9eb352bd29988bff1a68d9d6ca9bb2d3 --spec docs/development/work/K1.4-candidate/verification.json
```

The registry wrapper selects twelve cases from exact C using the existing runner, repeats all
twelve for determinism and tests invalid package links. It changes no registry/tool source.
The oracle-mutant script copies H's test files to disposable directories, removes one predicate
and runs the unchanged oracle tests. Its temporary node_modules link deliberately uses H's
unchanged Kernel; it is not a production-Kernel mutation run or semantic-credit claim.

`prior-probes.mjs` is adapted from the repository's review-03 evidence at
`3e86a8c0f7a310c53810f2ced0533165b1844b54`: expected rejections replace assertions of the old bug.
`extra-probes.mjs`, `oracle-mutants.py`, `matrix-counts.py` and `scope-check.py` were written in
this review. The registry wrapper continues the repository-owned review-02/03 wrapper, with C
and the temporary path updated. No third-party implementation was copied.

The lexical claims search used:

```sh
rg -n 'unimplemented|not implemented' tests/conformance docs/development -g '*.md' -g '*.ts' -g '!*.rewrite*.md'
```

`claims-search.log` is the output before the review record/007 edit. Hits were inspected in
context; an old test identity, historical description or still-unimplemented other surface is
not treated as a current claim that the Activation/Outcome protocol is absent.

## Raw outputs and CI

`corpus.log`, `repository-tests.log`, `typecheck.log.gz`, `builder-docs.log`, the probe JSON/JSONL,
`registry.json`/`registry.log`, `matrix-counts.json`, `scope.json` and `candidate.json` record
the local runs. The gzip preserves the typecheck output byte for byte, including its trailing blank line. Predicate removals intentionally exit 1 in their copied test subprocesses;
`oracle-mutants.json` retains their complete TAP outputs and the honest run.

`ci-packet-verify.zip` is the unmodified downloaded artifact 14697524951 from workflow run
44876502133, containing `run.txt`, `verify.json`, `summary.json` and `verify.stderr.log`.
`ci-run.txt` repeats its run identity; `ci-job-excerpt.log` contains the fetched job log's
REVISION/checkout/upload lines. `ci-inspection.json` records the reviewer's raw-JSON counts,
case counts, result and declared unrun profiles. The full Packet verify command was inspected
from this CI artifact, not rerun locally. Recount independently without trusting the summary:

```sh
python3 - <<'PY'
import hashlib, json, os, zipfile
from pathlib import Path
p = Path(os.environ['EVIDENCE']) / 'ci-packet-verify.zip'
assert hashlib.sha256(p.read_bytes()).hexdigest() == 'ef13b4a3063cddd07e445dfacb7a845ecaee93a62c9ec2c80e2aa42d46873c97'
with zipfile.ZipFile(p) as z:
    print(z.read('run.txt').decode())
    v = json.loads(z.read('verify.json'))
assert v['revision'] == '848b1957ae9e598bb256712c07a3cc22c39fbaf7'
assert len(v['checks']) == sum(c['passed'] is True for c in v['checks']) == 19
print(v['result'], len(v['checks']), sum(c['passed'] is True for c in v['checks']))
PY
```

`manifest.json` records byte counts and SHA-256 for every other file in this directory.
Verify with:

```sh
python3 - <<'PY'
import hashlib, json, os
from pathlib import Path
root = Path(os.environ['EVIDENCE'])
for entry in json.loads((root / 'manifest.json').read_text())['files']:
    data = (root / entry['path']).read_bytes()
    assert len(data) == entry['bytes']
    assert hashlib.sha256(data).hexdigest() == entry['sha256'], entry['path']
print('All evidence files verified')
PY
```
