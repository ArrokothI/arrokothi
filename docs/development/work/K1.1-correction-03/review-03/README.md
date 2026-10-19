# Review 03 evidence

The review binds only to H `4b121d7ba665182b22857f049c05f019f25d0c65`, with payload C
`2bf220e9e426c810f2505fa2d74d70197807e584` and cumulative base B
`b9c1e549c81fa4fe4f18fa1a36986f1a5581fc9b`.

`identity.json` records source acquisition, ancestry, the exact nine-path C..H allowlist and the
submitted evidence attachment digests. `cumulative-B-H.diff.gz` is the full binary cumulative diff,
not GitHub's truncated presentation. The source checkout is at H; the separate validation clone is
at C. No candidate file was changed. Review files are uncommitted.

Use Node **v26.10.0** and the locked C dependencies (`npm ci --ignore-scripts --no-audit --no-fund`).
The reviewer used npm 11.19.1 and Python 3.13.7 on macOS arm64. A normal full clone must also have
the archive/evidence commits referenced by the manifests, including historical commits not reachable
from current branch tips. The first two verification attempts lacked such objects. Fetching the
referenced archive commits and all historical commit objects from existing local clones repaired
that access problem; `history-repair.json` records the additional object acquisition. This changed
Git's object database, not C's files.

From the clean C clone, with no concurrent validation job, the required command is:

```sh
python3 -B scripts/packet_tools.py verify --revision 2bf220e9e426c810f2505fa2d74d70197807e584 --spec docs/development/work/K1.1-correction-03/verification.json
```

`verify.stdout.json`, `verify.stderr.log` and `verify-run.json` are the final independent composed
attempt's raw output and environment/timing record. `first-attempt-*` and `second-attempt-*` preserve
the earlier missing-object failures. The final attempt fails on a 21-member adoption census
discrepancy. It is **not** a passing full verification. The two `adoption-preflight-*` files record
the environment preflights, not additional adversarial tooling probes.

`run-remaining-checks.py` invokes the unchanged verifier's existing operations for the steps that
the adoption exception prevented from running. It preserves the declared catalog execution,
environment, Git snapshot inputs, timeouts and count requirements. It adds no test, mutant,
credit rule or registry repair, and does not convert the composed failure into a pass.
Each step has `remaining-<id>.json`; command outputs also have `.log` files. The compact index is
`remaining-checks.json`.

For the independent production probes, extract B's `package.json`, `packages/kernel/package.json`,
`packages/kernel/src/values.ts` and `packages/kernel/src/own-array.ts` into a separate B directory,
preserving their paths, and link that directory's `node_modules` to the installed C dependencies.
These B files are unchanged Git blobs; `baseline-probe-source.json` records their SHA-256 values.
Then run, from anywhere, using absolute paths:

```sh
python3 -B /path/to/review-03/run-production.py /path/to/C /path/to/B
```

The production script uses its own Driver, API schedules, assertions, Proxy traps and built-in
factories. Native observation wrappers call the real operation unchanged and restore global slots
after importing `values.ts`; they observe selected operations, not engine internals. It covers six
Proxy forms, 77 built-in/prototype cases, 830 root-consumer refusals, exact diagnostic counts,
classification order, eight distinct B-crossing eager roots and eight large accepted roots.

The historical probes rerun review 01's 14 real-budget stop alignments and 14 consumer schedules,
its 5,460 refusal inputs, 1,543 B/C accepted-byte comparisons and 1,056 consumer schedules; review
02's Q6 witnesses and 1,824-shape continuation search are also rerun. `historical-probe-port.json`
identifies the only port: three helper return-type anchors and the `refuse` expression anchor in
the disposable-source trace. The JS search is unchanged. The trace is compared with pristine C;
it is not a production patch or a claim about hypothetical mutated code.

`candidate-identity.stdout.json` records an additional existing candidate-check command. Its
generic `git diff` error comes from `git diff --check B H`: `candidate-diff-check.txt` shows the
whitespace findings are entirely in preserved historical raw review records. This does not change
the independently checked commit identities, ancestry or allowlist.

`normative-search.txt` and `source-review.md` declare the source and claim search. The two
`main-*` documents are pinned at `7af0cd11176c220353c06545630edbe45c2127b6`.
`owner-supplements.txt` records the owner's supplemental decisions verbatim.
`evidence-04-read-index.json` lists decoded submitted raw members whose lengths and hashes were
checked; `submitted-*` summaries distinguish inspected implementer evidence from independent runs.

The final SHA-256 manifest covers the report and every evidence file except the manifest itself.
No physical-containment, native-addon External, live-provider, universal future-code, or wall-clock
guarantee is inferred from these finite observations.

To check the delivered manifest, run this from the `review-03` evidence directory:

```sh
python3 -B - <<'PY'
import hashlib, json, pathlib
for item in json.loads(pathlib.Path('manifest.json').read_text())['files']:
    data = pathlib.Path(item['path']).read_bytes()
    assert len(data) == item['bytes'], item['path']
    assert hashlib.sha256(data).hexdigest() == item['sha256'], item['path']
print('All listed SHA-256 digests and lengths match.')
PY
```
