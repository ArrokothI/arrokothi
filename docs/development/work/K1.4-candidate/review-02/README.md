# Review 02 evidence

Subject: H `14a7ef485282ab2c16d08702be5d61cfeb9997e7`, payload C
`7392e4a640c07c9a2989464cd2a979938c37ee25`, base B
`c1951226338de6ccd3e4e6289259549551268f61`. See [review 02](../review-02.md).

## Files

- `ci-artifact.zip`: exact GitHub artifact bytes, run `43704493967`, artifact `14160801105`.
  SHA-256 `071fa3cc80c05cff24aab58462a70b478849fd9afa8eb53b5d258b56939b1d49`.
  It contains `run.txt`, `summary.json`, full `verify.json` (including check outputs) and
  `verify.stderr.log`.
- `ci-run.txt`, `ci-summary.json`: unchanged extracts. `ci-revision.log`: job-log excerpt showing
  explicit tested `REVISION` and checkout. `ci-inspection.json`: reviewer-derived counts and the
  five new raw registry results; not a replacement for the archive.
- `local-corpus.tap`, `local-typecheck.log`: local Node 26.10.0 reruns; all 1,371 corpus tests passed.
  The typecheck log has only its trailing blank line removed for whitespace hygiene.
- `candidate.json`: existing packet-tools B/C/H binding check, `facts_verified`.
- `scope-check.mjs`, `scope.json`: fixed-revision ancestry, exact administrative allowlist,
  package/script/tooling tree equality and bounded executable-fixture-delta checks.
- `registry-check.py`, `registry-check.json`: existing mutation engine with review-side selection
  of the five unchanged C entries, including repeat/determinism runs and optional-link controls.
  This selection changes no committed registry or tool. Each control passes and each mutant is
  validly killed; both bad-link setups are invalid runs.
- `probes.mjs`, `probes.jsonl`: independently authored reproduction and observations for the new
  identity collisions plus adjacent controls. The fault-injection cases deliberately alter public
  responses; the other cases use the unchanged Kernel. Exit 0 reproduces H, including its defects.
- `owner-choice.md`, `brief-03.md`: owner stop-and-redesign route and the correction handoff.

## Reproduce

Use a fresh checkout at H and `npm ci --ignore-scripts` with Node 26.10+; the reviewer used Node
26.10.0 / npm 11.19.1 on Darwin arm64. Copy this review evidence into the checkout if necessary.
From its root:

```bash
node --test --experimental-strip-types tests/conformance/k0-candidate/*.test.ts tests/conformance/k0/*.test.ts tests/conformance/architecture/*.test.ts
npm run typecheck
python3 -B scripts/packet_tools.py candidate --payload 7392e4a640c07c9a2989464cd2a979938c37ee25 --head 14a7ef485282ab2c16d08702be5d61cfeb9997e7 --spec docs/development/work/K1.4-candidate/verification.json
node --no-warnings --experimental-strip-types docs/development/work/K1.4-candidate/review-02/scope-check.mjs
python3 -B docs/development/work/K1.4-candidate/review-02/registry-check.py
node --no-warnings --experimental-strip-types docs/development/work/K1.4-candidate/review-02/probes.mjs
```

Inspect the CI counts independently without extracting the large raw verification report:

```python
import hashlib, json, zipfile
from pathlib import Path
p = Path('docs/development/work/K1.4-candidate/review-02/ci-artifact.zip')
print(hashlib.sha256(p.read_bytes()).hexdigest())
with zipfile.ZipFile(p) as z:
    summary_name = next(n for n in z.namelist() if n.endswith('summary.json'))
    summary = json.loads(z.read(summary_name))
    print(sum(c['passed'] is True for c in summary['checks']), len(summary['checks']))
    print(z.read(next(n for n in z.namelist() if n.endswith('run.txt'))).decode())
```

The full packet verification is pinned CI evidence, not a claimed local rerun. These scripts make
the review's narrower local checks reproducible; they do not establish E1 acceptance or a guarantee
beyond the bounded search described in the review.
