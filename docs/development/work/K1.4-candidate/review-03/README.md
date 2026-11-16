# Review 03 evidence and reproduction

Subject H is ddc53bd132fde4f71bc989ccec7f4d0e430a45dc; payload C is
41bd3aaa5cf83c51e93d41da567558d34f943410. These files accompany [review 03](../review-03.md).
They do not modify the candidate, fixture or packet tools and are not a new verification spec.

Use Node 26.10.0 or later and the repository's npm workspace installation. The actual review used
Node v26.10.0, a fresh remote clone and npm ci --ignore-scripts with the existing lock. Run commands
from the repository root. To test a separate H checkout, the three .mjs probes accept that checkout's
absolute path as their first argument.

```sh
npm ci --ignore-scripts
node --test --test-reporter=tap tests/conformance/k0-candidate/*.test.ts tests/conformance/k0/*.test.ts tests/conformance/architecture/*.test.ts
npm run typecheck
python3 -B scripts/packet_tools.py candidate --payload 41bd3aaa5cf83c51e93d41da567558d34f943410 --head ddc53bd132fde4f71bc989ccec7f4d0e430a45dc --spec docs/development/work/K1.4-candidate/verification.json
python3 -B docs/development/work/K1.4-candidate/review-03/scope-check.py
python3 -B docs/development/work/K1.4-candidate/review-03/registry-check.py
node --no-warnings --experimental-strip-types docs/development/work/K1.4-candidate/review-03/review02-corrected.mjs
node --no-warnings --experimental-strip-types docs/development/work/K1.4-candidate/review-03/adversarial.mjs
node --no-warnings --experimental-strip-types docs/development/work/K1.4-candidate/review-03/oracle-probes.mjs
```

The local corpus result was 1,442/1,442 tests, 122 suites, zero failed/cancelled/skipped/todo,
6,487.616917 ms. Typecheck exited 0. These inexpensive checks are reproducible above; their bulky logs
are not attached. Scope and candidate JSON are compact records of the pinned comparisons.

## Probe interpretation

- review02-original.mjs is the exact repository-owned review 02 probe at
  2a95a49a6e7ff46242a137f9d9ca6835e70ed946. It asserts old bugs. At H it exits 1 at its first assertion
  ([original log](review02-original.log)); this is the expected correction, not a failing acceptance test.
- review02-corrected.mjs preserves those command schedules/injections with repaired expectations and adds
  two displayed-reference controls; [eight records](review02-corrected.jsonl) pass. Its comment retaining
  review 02's old invocation is provenance; use the invocation above for this version.
- adversarial.mjs is independently authored and does not call the candidate's ledger or H's Oracle.
  [Result](adversarial.json): 33 runs, 1,341 commands, 11,110 native/string pairs, occupied suffixes through ~32.
- oracle-probes.mjs is independently authored. It constructs four erroneous adapter traces from real
  H public-call records. H's Oracle **accepts** them; that is the finding. It also checks passing honest
  controls and asserts equal counts for the two strongest cases. An exit 0 reproduces the oracle bug;
  after a correction, maintain tests asserting the opposite. [Outputs](oracle-probes.jsonl).
- registry-check.py is adapted from this repository's review 02 wrapper, now selecting all twelve H/C
  candidate cases. It uses the existing runner and unchanged C registry. [Registry result](registry.json)
  contains real control/kill output plus invalid-link setup checks. No selection is patched into the
  maintained registry. Each of the twelve mechanism witnesses retains semantic_credit none.

## Independently inspected CI artifact

[Run 43798331633](https://github.com/ArrokothI/arrokothi/actions/runs/43798331633), job 133072232338,
artifact 14201012405, named packet-verify-41bd3aaa5cf83c51e93d41da567558d34f943410.
The original ci-artifact.zip includes run.txt, summary.json, verify.json and verify.stderr.log.
It is retained in this review commit to avoid reliance on expiring CI storage. The review's repository
archive retention policy applies. No signed download URLs or credentials are retained.

The ZIP is 3,076,456 bytes and its SHA-256 is
9c8ac55b5c8cfe6be195b40b5b47824efb5b7b20ef6a51bba79f058a62ab0292.
ci-summary.json and ci-run.txt are exact extracted copies. ci-revision.log is a selected excerpt of the
separately fetched job log; it shows the REVISION environment value and actual checkout at C.
ci-inspection.json records the independent count of the actual summary's passed booleans and the raw
verify.json mutation totals. This two-hour CI run was inspected, not rerun locally.

To independently count the artifact summary and hash its original bytes:

```sh
python3 - <<'PY'
from pathlib import Path
import hashlib, json, zipfile
p = Path('docs/development/work/K1.4-candidate/review-03/ci-artifact.zip')
with zipfile.ZipFile(p) as z:
    summary = json.loads(z.read('summary.json'))
    print(sum(c['passed'] is True for c in summary['checks']), len(summary['checks']))
    print(z.read('run.txt').decode())
print(hashlib.sha256(p.read_bytes()).hexdigest())
PY
```

Expected: 19 / 19; revision = head = C; exit 0; the digest above. The [manifest](manifest.json)
hashes retained evidence and scripts (not itself). Review scripts are independently authored or
explicitly attributed repository-owned material; no new third-party source or dependency was added.
