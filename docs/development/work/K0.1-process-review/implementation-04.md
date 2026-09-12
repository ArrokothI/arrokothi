# Implementation report — post-K0.1 process review, attempt 4 (correction of PRC-6-01)

## Identity and status

- Scope: [contract.md](contract.md), PRC-1–PRC-7a. This attempt is a **narrow correction only**,
  resuming the same process-review work after an independent `CHANGES REQUIRED` verdict on H3.
- State: WAITING_FOR_REVIEW. No criterion is self-certified and no ACCEPT is claimed.
- Governing process baseline: the integrated policy at
  `42731300266eea00a9a24d867d5e82d9887c280d` — the same
  [006](../../006-development-process.md) revision that governed the H2 and H3 reviews. The process
  rules this candidate *proposes* were not used to relax its own correction obligations, evidence
  requirements or acceptance conditions.

| Identity | SHA |
|---|---|
| Governing integration base | `42731300266eea00a9a24d867d5e82d9887c280d` |
| Interim report commit (attempt 1) | `88236083e52c1a006077653482cae3f71eb213df` |
| Reviewed payload C2 | `6f5e43d62e308026af5d0f4c89ecb498ca33d5db` |
| Reviewed candidate H2 | `bf2a3057272aa8749a8ce9d36ec8239f4e2411a9` |
| Reviewed payload C3 | `0d884fcfa1a014f7195903ecef8b2e2bf0e47db5` |
| Reviewed candidate H3 (`CHANGES REQUIRED`) | `f7fddcc661e2e2f579d2da5259a274fae9124693` |
| **New correction payload C4** | `6bb60674066306a902ab88b56f0c82840a85d4b3` |
| **New candidate H4** | the commit containing this report; supplied in the external handoff |

Branch `codex/k0.1-process-retrospective`. Before editing, local HEAD, the advertised remote branch
SHA and the ancestry `H2 → C3 → H3` were verified on a clean tree. H2, C3, H3 and the numbered
reports implementation-01 through implementation-03 are immutable reviewed history: nothing was
amended, rebased, force-pushed, rewritten or deleted, and C4 is a new commit on top of H3.

C4..H4 allowlist: this report only, under the integrated C/H convention. Raw command output for
clean C4 is embedded below and introduces no script, fixture, threshold or configuration — those are
payload and live in C4.

## Correction scope

One open finding was carried in: **PRC-6-01 (P2)**. The correction is confined to the live contract's
own currency and to a mechanical guard preventing the same class of error. No planning document,
packet, status, release state, runtime file or package was touched.

### Disposition of PRC-6-01 — CORRECTED

**Finding:** the live attempt-3 contract correctly stated that H2 and `implementation-02.md` are
immutable reviewed history, and that attempt 3 is C3 followed by report-only H3 as
`implementation-03.md`; but its active validation instructions still read:

> `Run on clean payload C; pin raw output in implementation-02 as allowed by integrated 006.`

That is stale attempt-2 wording inside the live attempt-3 contract, contradicting (1) the contract's
own immutability statement, (2) the governing 006 C/H process, under which the current attempt's
clean-C evidence belongs in the current numbered implementation report, and (3) the actual H3
implementation, which correctly recorded C3 validation in `implementation-03.md`. The finding is
correct as written: the implementation behavior was right and the live contract was internally
contradictory.

**Resolution taken.** Rather than renumber one sentence from `implementation-02` to
`implementation-03` — which would have re-created the identical defect at attempt 5 — the contract
now states a durable rule and declares the current report in exactly one place:

> "Each attempt's clean-payload validation evidence belongs in that attempt's own numbered
> implementation report. A numbered report already submitted for independent review is sealed: a
> later correction adds the next numbered report and never overwrites, re-targets or appends evidence
> to an earlier reviewed one. **Current attempt report: `implementation-04.md`.**"

and the validation instructions now read:

> "Run on the current attempt's clean payload C; pin its raw output in the current numbered
> implementation report declared above, as allowed by integrated 006."

So the three required properties hold explicitly: C4 evidence belongs in `implementation-04.md`;
`implementation-02.md` remains immutable historical evidence for H2 (and `implementation-03.md` for
H3); and later corrections use their own current numbered report rather than overwriting an earlier
reviewed one.

## Contract consistency audit

The finding named one sentence. The whole live contract was inspected for any other attempt-1/
attempt-2/attempt-3 instruction still phrased as an active requirement. Three further occurrences of
the same class were found and corrected in this payload; they are directly dependent on the finding,
not a broadening of scope.

| Location | Prior text | Classification | Disposition |
|---|---|---|---|
| Validation paragraph | "Run on clean payload C; pin raw output in **implementation-02** as allowed by integrated 006." | **PRC-6-01, the named finding.** Active instruction naming a sealed report. | Replaced with the durable rule plus the single declaration. |
| Header paragraph | "the expanded payload **must be** clean-validated anew and followed by **implementation-02**." | Same class: an attempt-2 instruction in the imperative, naming a sealed report. | Rewritten as attempt-2 history in the past tense, with C2/H2 SHAs. |
| Header paragraph | "Attempt 3 **corrects** … the correction **adds** payload C3 …, clean-validates it, **then adds** report-only H3 as implementation-03." | Same class: present-tense attempt-3 instruction that a reader at attempt 4 would take as current. | Rewritten as attempt-3 history in the past tense, with C3/H3 SHAs. |
| Validation paragraph | "The preserved implementation-01 contains only the first payload's as-of results." | Accurate history, but sitting **inside** the active validation paragraph, where it mixes a sealed report name into live instructions. | Moved into the attempt-history paragraph. |

All attempt records now live in one paragraph explicitly opened as "Attempt history below is an as-of
record, not a current instruction." The active validation paragraph names no sealed report at all.

Everything else in the contract was inspected and left unchanged as durable: the owner-release and
scope statements, the C/H convention sentence, the selected 012 method paragraph, PRC-1 through PRC-7a
(whose verification columns are phrased as observable properties, not attempt-specific steps), and the
closing separation-of-acceptance sentence. Historical as-of statements were **not** rewritten merely
for describing earlier attempts — only those phrased as live requirements were reframed.

One criterion was added, **PRC-6a**, making the rule observable rather than implicit: the declared
current attempt report is never a sealed report; validation instructions name only it; sealed reports
stay byte-identical to their reviewed commits; and attempt records read as history.

## Prior findings not reopened

PRC-7-01, PRC-7-02 and PRC-7a were independently marked PASS on H3 and are **not reopened**. The E1 /
K1.0 sequencing was not redesigned, and the new finding did not require touching it. The C3 guards
remain in place and still pass unchanged — the clean-C4 validator run prints:

```text
Sequence: K0.2 -> K1.0 -> K1.1; K1.4 retains full gate; no K0.2/K1.0 implementation directories
E1 sequencing: fixture preparation precedes K1 implementation including K1.0 in 13 current planning documents; K1.0 earns no E1 credit; K1.4 keeps the full gate
```

No file carrying that sequencing rule — 001, 007, 013, either README, or the retrospective — appears
in the C4 diff.

## Files changed in C4

`git diff --stat f7fddcc661e2e2f579d2da5259a274fae9124693 HEAD` (command 8) shows exactly two files:

| File | Change |
|---|---|
| `docs/development/work/K0.1-process-review/contract.md` | Durable evidence-placement rule, single current-report declaration, attempt-history paragraph, corrected validation instructions, new PRC-6a row. |
| `docs/development/work/K0.1-process-review/validate.py` | SEALED report registry, generalized immutability and ancestry checks, new PRC-6a structural guard. |

Nothing else changed: no planning document, no packet definition or status row, no runtime source,
no test, no package metadata, no benchmark file.

## New validator guard and its negative controls

The guard is deliberately **structural rather than string-specific**, so it catches the class of
error and not only the one sentence the review found:

- `SEALED` maps each numbered report already submitted for independent review to the commit that
  sealed it (`implementation-01` → interim commit, `implementation-02` → H2, `implementation-03` →
  H3). Each is checked byte-for-byte, and both H2 and H3 must be ancestors of HEAD.
- The contract must declare a current attempt report; that report must **not** be in `SEALED`; and
  the validator's own `REPORT` constant must agree with the declaration.
- The active validation paragraph — located by its stable opening, then whitespace-normalized so
  line wrapping cannot hide a match — must contain **no** sealed report name, and must name the
  current numbered report (either by the durable phrase or by its explicit filename).

**Negative controls were run**, each mutation applied to the working tree, validated, then reverted.
Every one fired its intended guard rather than passing vacuously:

| Control | Mutation | Result |
|---|---|---|
| NC1 | Restore the exact H3 defect: "pin raw output in implementation-02" | 2 failures — "Active validation instructions route current evidence into sealed report implementation-02.md" plus the missing-current-report check |
| NC2 | Generalized future form: route evidence into `implementation-03` instead | 2 failures — same guard, now naming implementation-03.md. Confirms the guard is not overfitted to one report number |
| NC3 | Declare the sealed `implementation-03.md` as the current attempt report | 2 failures — "Contract declares sealed report … as the current attempt report" plus validator/contract disagreement |
| NC4 | Delete the current-report declaration entirely | 1 failure — "Contract declares no current attempt report" |
| NC5 | Append one byte to sealed `implementation-03.md` | 1 failure — "Sealed report altered: implementation-03.md differs from f7fddcc…" |

With every mutation reverted, the clean tree returns 0 failures. These control runs were performed
before C4 was committed; the committed C4 tree was validated clean afterwards, and the outputs below
are from that clean C4 run.

## Required self-review

Challenged before committing C4.

| # | Case | Required | Result |
|---|---|---|---|
| 1 | Does the live contract still tell a future correction attempt to write evidence into a previously reviewed immutable report? | No | **No.** The validation paragraph names only the current numbered report; NC1/NC2 confirm the guard rejects any sealed name there. |
| 2 | Is attempt-3 history still accurate? | Yes | **Yes.** C3 evidence remains recorded in `implementation-03.md`, byte-identical to H3; `implementation-02.md` remains H2 history, byte-identical to H2. The new attempt-history paragraph states both with their SHAs. |
| 3 | Could the new wording be reused for a future attempt without naming the wrong fixed report number? | Prefer a durable rule | **Yes.** The rule is stated generically ("that attempt's own numbered implementation report"); only the one declaration line changes per attempt, and the validator cross-checks it. Attempt-3-specific facts remain explicit in the history paragraph. |
| 4 | Did any historical report change? | No | **No.** implementation-01/02/03 are byte-identical to `88236083…`, `bf2a305…` and `f7fddcc…` respectively — verified directly and by the validator. |
| 5 | Did the correction accidentally change E1/K1.0 sequencing, packet status, release state, benchmark state, or runtime/package behavior? | No | **No.** Only two files changed. K0.2 and K1.0 rows still read PLANNED; the E1/K1.0 guards still pass; benchmark HEAD still `98756f8…` and clean; no package or runtime file touched. |
| 6 | Does C4→H4 contain only the permitted current report/admin material? | Yes | **Yes.** The C4..H4 delta is exactly `implementation-04.md`, supplied in the external handoff. |

## Exact validation on clean C4

Date 2026-09-11. Cwd for all commands:
`/Users/rex-shih/Documents/Codex/projects/agent-kernel`. All returned exit 0. SHA-256 covers the
exact merged stdout/stderr UTF-8 bytes including trailing newlines — the same convention as the
prior reports, confirmed by commands 4 and 5 reproducing their digests byte-for-byte.

These commands were **independently rerun in this session on the committed clean C4 tree**; none is
an inspected or copied prior log. Python is 3.13.5, as in attempt 3; the script uses only the
standard library.

Per the contract's selected 012 method (process/documentation), Runtime suites, typecheck,
builder-docs, eval, packaging, fault and live runs were **not** run: this payload changes only the
contract prose and its own checking script, and no behavioral claim depends on them. No E0–E6 gate
was executed or decided.

### Command 1 — `git rev-parse HEAD`

Exit 0. SHA-256 `ae25ded41114734ef3547591108f6123f43f9b33781d105cb4a83a98f1e15002`.

```text
6bb60674066306a902ab88b56f0c82840a85d4b3
```

### Command 2 — `git status --porcelain=v1`

Exit 0. SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`. Output: empty.

### Command 3 — `python3 --version`

Exit 0. SHA-256 `01870de7caca112afeefd77b3c3b4c5e263cf5539a33af3f3411100727fad7d3`.

```text
Python 3.13.5
```

### Command 4 — `git --version`

Exit 0. SHA-256 `b6d9afe6e5be5d40f0e18a09a0708100902e19a4d0e11fb5d3930d59785cb1aa`.

```text
git version 2.39.5 (Apple Git-154)
```

### Command 5 — `uname -srm`

Exit 0. SHA-256 `83e116757bf361ada87a922313265a945238521f4545fae6f59034fd27807374`.

```text
Darwin 25.6.0 arm64
```

### Command 6 — `python3 docs/development/work/K0.1-process-review/validate.py`

Exit 0. SHA-256 `b56b2d223b904d200ae7983f9fdcc582fe632d2b1a2c589f5580bec4beca62ff`.

```text
Scope: 18 changed/new paths; all must be explicitly allowed
Historical preservation: 35 pre-existing K0.1 files compared by Git blob
Ledger: 35 unique packets/definitions; K0.1 ACCEPTED, 34 PLANNED; acyclic dependencies
Sequence: K0.2 -> K1.0 -> K1.1; K1.4 retains full gate; no K0.2/K1.0 implementation directories
Contract currency: declared current report is unsealed; active validation instructions name no sealed report among 3
E1 sequencing: fixture preparation precedes K1 implementation including K1.0 in 13 current planning documents; K1.0 earns no E1 credit; K1.4 keeps the full gate
SDK metadata: only repository URL changed; package name/version/exports/dependencies preserved
Benchmark: read-only HEAD/clean-state check at 98756f8c10bd806125da8318f1a129bc030aca61
Sealed reports: 3 preserved byte-for-byte against their reviewed commits; H2 and H3 are ancestors of HEAD
Integration: 3 ancestry checks; exact merge parents; A12/full merge tree equality; C12/H12/A12 scope
Links: 16 documents; 163 local links/anchors; 7 external links excluded
Link parser scope: inline Markdown links outside fenced examples; not remote reachability or full Markdown rendering
Result: 0 failures
```

### Command 7 — `git diff --check 42731300266eea00a9a24d867d5e82d9887c280d HEAD`

Exit 0. SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`. Output: empty.

### Command 8 — `git diff --stat f7fddcc661e2e2f579d2da5259a274fae9124693 HEAD`

Exit 0. SHA-256 `81b25618511fe8f786366308795256cc6a3d9414da0536b27156ade54551657c`. This is the exact
H3..C4 correction delta.

```text
 .../work/K0.1-process-review/contract.md           | 25 ++++++---
 .../work/K0.1-process-review/validate.py           | 62 +++++++++++++++++-----
 2 files changed, 67 insertions(+), 20 deletions(-)
```

### Command 9 — `git diff --stat 42731300266eea00a9a24d867d5e82d9887c280d HEAD`

Exit 0. SHA-256 `42768e99aefeb6bd57753626817097c1500ed193e25d512f6600bf58b5698c89`.

```text
 README.md                                          |  11 +-
 docs/development/001-current-status-and-roadmap.md |  21 +-
 docs/development/006-development-process.md        | 100 ++++--
 docs/development/007-work-packets.md               |  70 ++--
 docs/development/008-implementation-report.md      | 135 +++++---
 docs/development/009-universal-prompts.md          | 274 +++++-----------
 .../010-pipeline-planning-assessment.md            |   6 +
 docs/development/011-k0.1-process-retrospective.md | 181 +++++++++++
 docs/development/012-review-methods.md             |  88 ++++++
 .../013-structure-and-evidence-sequencing.md       | 137 ++++++++
 docs/development/README.md                         |  25 +-
 .../work/K0.1-process-review/contract.md           |  52 +++
 .../work/K0.1-process-review/implementation-01.md  | 230 ++++++++++++++
 .../work/K0.1-process-review/implementation-02.md  | 264 ++++++++++++++++
 .../work/K0.1-process-review/implementation-03.md  | 352 +++++++++++++++++++++
 .../work/K0.1-process-review/validate.py           | 258 +++++++++++++++
 docs/development/work/K0.1/integration-01.md       |  54 ++++
 packages/sdk/package.json                          |   2 +-
 18 files changed, 1957 insertions(+), 303 deletions(-)
```

### Command 10 — `git ls-remote origin refs/heads/main`

Exit 0. SHA-256 `4630442861977395dfcf049dca2a03e37180089bda37e85cdcb6af574ed60c9c`.

```text
42731300266eea00a9a24d867d5e82d9887c280d	refs/heads/main
```

### Command 11 — `git ls-remote https://github.com/ArrokothI/benchmark.git refs/heads/main`

Exit 0. SHA-256 `4371abe70bf0ead9c8fbe6a95877f49a413c17f9b91d15bdab63bffdd164121a`.

```text
98756f8c10bd806125da8318f1a129bc030aca61	refs/heads/main
```

### Command 12 — `git -C ../benchmark rev-parse HEAD`

Exit 0. SHA-256 `b387fa1c459f58120508803044ff8346182b86b98bb2977375c0b244761fa594`.

```text
98756f8c10bd806125da8318f1a129bc030aca61
```

### Command 13 — `git -C ../benchmark status --porcelain=v1`

Exit 0. SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`. Output: empty.

### Direct blob verification of sealed reports

Run alongside the above on the clean C4 tree, comparing each working file to its reviewed commit:

```text
implementation-01.md == 88236083e52c1a006077653482cae3f71eb213df  (6f83d8d1a0839859feafd79130398dde962baec2)
implementation-02.md == bf2a3057272aa8749a8ce9d36ec8239f4e2411a9  (cb4b19cc99f148ef0e692c4c0b0b285370a32916)
implementation-03.md == f7fddcc661e2e2f579d2da5259a274fae9124693  (aea19136a8f6e40a2cbc270b8b4a279673a32242)
```

## Explicit statements

- **implementation-01, implementation-02 and implementation-03 remain byte-identical** to their
  reviewed history, verified both directly by blob hash and by the validator's SEALED registry.
  No historical report was modified.
- **Reviewed history preserved.** H2, C3 and H3 are unmodified; H2 and H3 are ancestors of H4;
  nothing was amended, rebased, force-pushed or deleted.
- **Benchmark repository: read-only and unchanged.** No benchmark file, Git ref, configuration,
  snapshot, fixture or evidence was read into this payload or written. Local HEAD still equals the
  pinned `98756f8c10bd806125da8318f1a129bc030aca61` with a clean tree (commands 12–13), matching its
  advertised remote main (command 11).
- **K0.2 remains PLANNED, unimplemented and unreleased.** **K1.0 remains PLANNED, unimplemented and
  unreleased.** No `work/K0.2` or `work/K1.0` directory exists. K1.1 and every other successor are
  untouched.
- **`main` is unchanged** at `42731300266eea00a9a24d867d5e82d9887c280d` (command 10). No merge was
  performed and no `main` push was attempted.
- **PRC-7-01, PRC-7-02 and PRC-7a were not reopened**; their guards and documents are unchanged and
  still pass.
- **No self-acceptance.** No verdict is recorded and nothing is released.
- **Third-party reuse: none.** No source, dependency, service, asset or test was incorporated. The
  validation helper continues to use only the Python standard library. No package name, version,
  export, dependency or runtime behavior changed.

## Limitations

The PRC-6a guard is structural over the contract's text. It can detect a sealed report named in the
active validation paragraph, a missing or sealed current-report declaration, a validator/contract
disagreement, and any edit to a sealed report. It cannot prove that the contract's prose is
semantically adequate elsewhere, that an attempt-history sentence is genuinely past tense, or that a
future author will bump the declaration when starting the next attempt — though the
validator/contract cross-check makes a stale declaration fail as soon as the validator's own report
constant advances. The link checker covers inline Markdown links outside fenced blocks, not remote
reachability or full Markdown rendering.

## Handoff

Ready for independent review only. Submit H4 for a fresh cumulative independent review of the whole
base..H4 candidate; the H3..C4 correction delta alone is insufficient, and no prior self-assessed
criterion table is carried forward as evidence. This report claims no ACCEPT, records no verdict, and
releases nothing. H4's exact SHA and verified remote branch identity accompany the external handoff
after commit and push.
