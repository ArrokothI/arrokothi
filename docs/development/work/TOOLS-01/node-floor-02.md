# TOOLS-01 — A1 amendment review stopped before installation

2026-10-03, Codex implementer (GPT-6 per owner assignment), on
`/Users/rex-shih/Documents/ArrokothI/arrokothi`.
**The A1 amendment needs correction before implementation.** This is an implementer design
review, not independent packet acceptance. TOOLS-01 remains IN_PROGRESS.

## Identity and scope

Fetched origin first. The initial sandbox attempt could not write `.git/FETCH_HEAD`; the
authorized retry succeeded. Local and remote `codex/tools-01` were equal at
`674ed52165629f16bc8bd5362c57536c7b72a6ec`, with a clean tree. Origin is
`https://github.com/ArrokothI/arrokothi.git`.

Read the requested AGENTS.md, 006, 012, revision-3 contract, complete design 05, both step-0
reviews, owner choice 02, node-floor-01 record and raw events, and all existing floor probe
files. Reviewed the complete `git diff 9edd70f6..674ed521`: only the catalog-reporter description
and A1 changed. The accepted step-0 revision and its earlier reviews remain intact.

The owner's continuation instruction says to review this amendment first and stop if unsound.
The finding below is already reproducible from the saved Node v22.9.0 observation. No new
runtime installation or floor run was needed to establish it.

## D05-A1-REV-01 (P2): absent type cannot classify a suite start

Design 05 §6 A1, lines 518–525 at the reviewed head, classifies an event with absent
`details.type` as a test, then refuses a disagreement with its source registration. It does
not restrict this rule to `test:pass` and `test:fail`. A1 covers `test:start` too, but suite
starts also lack `details.type`.

The existing [raw A1 events](node-floor-01/a1.json) contain both events below for
`outer suite`, at the same fixture location, line 12, column 1:

| Event | `details.type` | Amended classification | Source registration | Result |
|---|---|---|---|---|
| `test:start` | absent (no `details` object) | test | `describe` | mismatch; refuses the file |
| `test:pass` | `suite` | suite | `describe` | matches |

The [fixture](../../../../tests/tooling/node-floor/events.test.mjs) and raw evidence are
unchanged. Their SHA-256 digests were independently recomputed and match node-floor-01:

- Raw events: `1104d679ce6f5edbbd13708132a9cfd81bbbba13fe0fb039b9a20a2896361fa3`.
- Fixture: `9912c9987cce685d6ec8260896812bc50b31f42aaf2f9bdc00d22d565098f0a8`.

This is consistent with the exact upstream version. Node v22.9.0's
[`test:start` documentation](https://nodejs.org/download/release/v22.9.0/docs/api/test.html#event-teststart)
lists location, name and nesting, without details. Its
[`TestsStream.start` implementation](https://github.com/nodejs/node/blob/v22.9.0/lib/internal/test_runner/tests_stream.js#L103-L110)
emits those fields without a details object. Both primary sources were inspected in this
session. The documented suite marker belongs to pass/fail execution metadata.

**Cause and consequence.** The amendment generalizes the terminal-event distinction to all
three event types. Applied as written, its own source cross-check rejects an ordinary suite.
Dropping that cross-check would instead allow a suite start to be treated as a test; that
would also undermine leaf classification, especially for empty suites. Neither behavior is
an acceptable silent adaptation.

**Required design clarification.** State separately how starts and terminal events are handled.
One possible correction is to apply the marker rule only to pass/fail events, cross-check their
kind against source, and associate each start with its corresponding terminal result before
determining leaf kind. Specify that association and refusal of missing or inconsistent pairs;
retain start order/nesting for parent-child structure. Alternatively, explicitly authorize
source-based start classification with a later terminal-kind cross-check. These are proposals
for the design author/owner, not implemented rules. Include a suite start with absent details
in the positive fixtures, alongside the already requested passing/failing suites, nested tests,
unknown terminal type and source-kind mismatch.

## Reproduction and limits

This read-only check against the maintained evidence exits 0 after confirming the contradiction:

```sh
python3 -B - <<'PY'
import json
from pathlib import Path
record = json.loads(Path('docs/development/work/TOOLS-01/node-floor-01/a1.json').read_text())
source = Path('tests/tooling/node-floor/events.test.mjs').read_text().splitlines()
rows = []
for event in record['events']:
    data = event['data']
    if data['name'] != 'outer suite':
        continue
    assert data['line'] == 12 and data['column'] == 1
    assert source[data['line'] - 1].startswith("describe('outer suite',")
    details = data.get('details', {})
    kind = 'suite' if details.get('type') == 'suite' else 'test' if 'type' not in details else 'refused'
    rows.append((event['type'], kind))
assert rows == [('test:start', 'test'), ('test:pass', 'suite')], rows
print(rows)
PY
```

Executed this check and the digest assertions above. This confirms a contradiction in the
amended rule against preserved observations; it is **not a fresh Node floor result**. The
original A1 probe still expresses the pre-amendment assumption and was not repurposed to imply
that the amended rule passed. Unknown-type refusal, source-kind mismatch refusal and the leaf
definition otherwise fit the stated conservative design, provided event association is resolved.

No Node was downloaded or installed on this machine in this continuation. A1 was not rerun;
A2–A11 and steps 2–12 remain unstarted here. After the design clarification, resume with the
authorized checksum-verified darwin-arm64 Node v22.9.0 installation and the amended A1 fixture
battery, then the remaining checks in order with their stated stop/fallback rules.

Only this new record is changed. No production, Layer-3, sealed record, 007, mapping or
`fault-oracle.ts` edit; no dependency or copied/adapted third-party source; no hold credit or
review-ready claim. The primary-source use above is reference reading only. The final handoff
records the commit and verified non-force push; this record does not name its own containing SHA.
