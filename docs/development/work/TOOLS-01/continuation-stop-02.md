# TOOLS-01 continuation stop 02 — sealed links and an unregistered held target

2026-10-05. Implementer: Codex. Subject:
`3fd79044f7e85f083cc08e2214c72917c0d0a7f6`, pushed and verified on `codex/tools-01`.
This records new findings while continuing step 8 after the owner authorized the preceding repairs.
It is not acceptance, a completed step 8 or a review-ready C/H. TOOLS-01 remains IN_PROGRESS.

The [preceding repair](continuation-repair-01.md) remains in place: 453 tooling tests passed,
270 refusal ablations were killed, 1,549 provenance records were unchanged, and all 398 scratch
targets passed their P1-T check. The findings below demonstrate why those counts are insufficient
for adoption. No targets or witnesses have been imported and no origin has been closed.

## TOOLS-CONT-04 — mandatory sealed links can disappear before context validation

**Criterion:** P1's minimum-context rule and design 05 D04-CHK-06 require the named sealed records,
transitively. The validator must check that the recorded ranges cover this minimum.

**Cause:** `CONTEXT_PATH` accepts only literal repository-root prefixes and excludes a match
preceded by `/` or `.`. `context_check()` does not resolve Markdown links relative to the source
file or parse commit-qualified repository links. Thus `./docs/records/note.md`, `note.md` and
`../K1.1/implementation-03.md` are invisible. A GitHub `/blob/<commit>/docs/...` link contributes
only a SHA candidate, which the generic reason map may dismiss. Traversing required candidates
before reasons, as CONT-01 now does, cannot help when the file never becomes a candidate.

**Full-corpus reproduction:**
[probe_relative_context.py](continuation-stop-02/probe_relative_context.py) creates real temporary
Git repositories, without mocking or patching the checker. A pinned origin names a sealed note,
which names a deeper sealed record. Its closure includes only the origin's single line.
[relative-context-result.json](continuation-stop-02/relative-context-result.json) records:

| Source form | Required outcome | Observed |
|---|---|---|
| `[note](./docs/records/note.md)` | Refuse missing sealed context | One complete origin; zero candidates |
| `[note](https://github.com/ArrokothI/arrokothi/blob/<pin>/docs/records/note.md)` | Refuse missing sealed context | One complete origin; one reasoned SHA |
| `docs/records/note.md` control | Refuse missing sealed context | Correctly refused |

The fixture's overall result remains `extraction_pending` because another origin is open. The
finding is false per-origin closure, not a global completion or acceptance claim.

**Actual pinned examples:** The ownership inventories needed by the kernel-landing-zone origins
contain six occurrences of two omitted records. At `9fd2faa7`,
`docs/development/work/K1.0/ownership-inventory.md` lines 101/154/158 links relatively to K1.1's
implementation-03 and implementation-04. At `66bc0411`, `docs/development/kernel-ownership.md`
lines 105/158/162 links to those same files with explicit `9fd2faa7` GitHub pins. Each destination
exists; its bytes and LF line count were read and hashed. See
[pinned-link-examples.json](continuation-stop-02/pinned-link-examples.json).

The unadopted context drafts covered both ownership inventories, passed `context_check()`, and
omitted the implementation records. [unadopted-context-samples.json](continuation-stop-02/unadopted-context-samples.json)
preserves the two drafts, including their reasons. They are counterexamples to the check, **not
approved reading closures**. Although 67 of 71 test-file origins have member routes available,
their context closure cannot be inferred from that fact. All 71 remain pending revalidation.

**Proposed repair:** Define and validate reference normalization before candidate classification:
repository-root paths, relative Markdown destinations (including fragments), and this repository's
commit-qualified links. Resolve relative paths against the referring file and carry revision/path
identity through transitive traversal. Detect cycles by that identity. Missing, malformed or
ambiguous required links need explicit handling rather than a generic SHA reason. Preserve origin
IDs and sealed catalog bytes. Add full-corpus omission controls, wrong-directory/wrong-revision
controls and supported-link positive controls; register and ablate every new refusal.

## TOOLS-CONT-05 — the supplied restoration target is V-ENV, outside the current register

This is a concrete handover/classification gap within the contract's stated limit for unregistered
held behavior. It does not establish that the tool promised complete semantic hold detection.
Now that the behavior is known to be held, it must not be adopted as ordinary suite credit.

The supplied `target.values.1424.3.fb228bec8c58` binds the historical member
`packages/kernel/tests/values.test.ts:1424:3@fb228bec8c58` to the current declaration at 1728:3.
Its input installs a non-configurable `Array.prototype[0]` accessor in a child process. Its only
assertion anchor (current LF line 1768) checks that the serializer window's borrowed slots were
handed back. The required-result text explicitly claims refusal, no wrong bytes and restoration.

[DESIGN-AUDIT-01 invalidation-03](../DESIGN-AUDIT-01/invalidation-03.md), “Held claims” item 1,
holds all three V-ENV obligations: output independence, refusal when setup fails, and restoration.
The owner is BINDING-01. This target's restoration assertion therefore cannot earn ordinary suite
credit merely because it passes. No Kernel behavior is fixed or hold narrowed here.

The minimum V-ENV recipe (`vm`, `createContext`, `runInContext`, `frozen-intrinsics`, `globalThis`)
does not match this registration. The current key
`packages/kernel/tests/values.test.ts:1728:3` has no register entry; the pinned member is `refused`
for preservation, rather than `held`. The corpus's final register filter only blocks matched held
entries, so the unregistered target receives `target_reading`.

**Actual full-corpus checks:** First I added only this target and its counterexample to a clean
temporary clone of the subject; every public adoption row stayed pending. The corpus returned
`extraction_pending`, with one `target_reading`, no target refusal, 140 register entries and the
unchanged preservation classifications. The reached input and assertion each had count 1 versus
baseline 0. [initial-corpus-result.json.gz](continuation-stop-02/initial-corpus-result.json.gz) and
[initial-corpus-fixture.json](continuation-stop-02/initial-corpus-fixture.json) preserve that run.

The standalone [probe_hold_credit.py](continuation-stop-02/probe_hold_credit.py) repeated the result
in another fresh clone. It uses [proposed-target.json](continuation-stop-02/proposed-target.json),
taken from the supplied scratch; it edits only that clone's adoption manifest and creates a local
fixture commit. Existing pinned dependencies and workspace-local links are required; it downloads
nothing. [hold-credit-result.json](continuation-stop-02/hold-credit-result.json) records the subject,
fixture, exact proposal, missing register key, reach facts and erroneous credit. Exit 1 means the
diagnostic reproduced held-behavior credit; it is not an assertion kill or harness crash.

**Next classification work:** Widening recipes is already allowed by design 05; no new hold decision
is needed. Cover the known serializer-window obligations, review/classify each added match, route
held members to attributed V-ENV witnesses and regenerate the census/targets. Report every changed
count against the earlier 810/62/74/326 census. Review the remaining supplied targets for the same
gap before importing them. This record proves one instance, not a complete V-ENV gap census.

## Ran, scope and stop

Node v26.10.0 was first in PATH. Long runs used `caffeinate -i`.

- `python3 -B .../probe_relative_context.py <subject-root>`: three full-corpus fixtures, two
  defects reproduced and the direct-path control refused, 1.995 s, expected diagnostic exit 1.
- `python3 -B scripts/packet_tools.py corpus --revision 3d87b75ce7d721ebc5dd2d203c6c198840f2ada2 --spec tests/fixtures/packet-tools/adoption.json`:
  clean temporary proposed-target fixture, one credited held-behavior target, about 93 s (output-file creation to final write), exit 0. This is
  `extraction_pending`; that exit is not completion.
- `python3 -B .../probe_hold_credit.py <subject-root> 3fd79044f7e85f083cc08e2214c72917c0d0a7f6`:
  independent temporary-clone repetition, one credited target, 94.534 s, expected diagnostic exit 1.
- Six actual pinned link occurrences resolved and hashed; both unadopted context samples show
  the missing required records. [manifest.json](continuation-stop-02/manifest.json) pins the source
  and diagnostic attachment bytes.

This checkpoint changes only this report and its diagnostic directory. The validator, tests,
registry, adoption data, production, Layer-3, sealed records and 007 are unchanged. No new dependency
or third-party source is introduced. The full 453-test suite and 270 ablations were not rerun for
these reporting-only additions; their preceding repair results remain precisely scoped there.
No composed verify, 77-case run, final C/H check or independent review is claimed.

The owner's request says: “if a step's mechanism cannot meet its criterion ... stop and report
the cause with evidence. Never adapt a mechanism silently.” CONT-04 meets that stop condition.
Dependent adoption and closure work is paused here for the next direction; no reference resolver
has been silently substituted. CONT-05 must be classified before its supplied target is imported.
The separate 24 repeated-assertion members remain refused and unbound, with their owner options
unchanged in continuation-stop-01. Steps 8–12 remain unfinished; no review-ready claim is made.
