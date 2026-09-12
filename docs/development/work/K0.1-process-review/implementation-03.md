# Implementation report — post-K0.1 process review, attempt 3 (correction of PRC-7-01)

## Identity and status

- Scope: [contract.md](contract.md), PRC-1–PRC-7 plus PRC-7a. This attempt is a **correction only**,
  resuming the same process-review work after an independent `CHANGES REQUIRED` verdict on H2.
- State: WAITING_FOR_REVIEW. Nothing here is an independent acceptance, and no criterion is
  self-certified. The corrected candidate requires a fresh cumulative independent review.
- Governing process baseline: the integrated policy at
  `42731300266eea00a9a24d867d5e82d9887c280d` — the same
  [006](../../006-development-process.md) revision that governed H2's review. The process rules this
  candidate *proposes* were not used to relax its own correction obligations, its evidence
  requirements or its acceptance conditions.

| Identity | SHA |
|---|---|
| Governing integration base | `42731300266eea00a9a24d867d5e82d9887c280d` |
| Prior payload C1 | `8407a7eaa6e182e2edf9690460ee9e72543ec818` |
| Interim report commit | `88236083e52c1a006077653482cae3f71eb213df` |
| Reviewed payload C2 | `6f5e43d62e308026af5d0f4c89ecb498ca33d5db` |
| Reviewed candidate H2 (`CHANGES REQUIRED`) | `bf2a3057272aa8749a8ce9d36ec8239f4e2411a9` |
| New correction payload C3 | `0d884fcfa1a014f7195903ecef8b2e2bf0e47db5` |
| New candidate H3 | the commit containing this report; supplied in the external handoff |

Branch `codex/k0.1-process-retrospective`. Before editing anything, local HEAD, the advertised remote
branch SHA and the ancestry `base → C2 → H2` were verified, with a clean working tree. H2 and
[implementation-02](implementation-02.md) are immutable reviewed history: nothing was amended,
rebased, force-pushed, rewritten or deleted, and C3 is a new commit on top of H2. The validation
script now enforces both facts mechanically (byte-equality of implementation-02 against H2, and
H2 ancestry of HEAD).

C3..H3 allowlist: this report only, under the integrated C/H convention. Raw command output for
clean C3 is embedded below and introduces no script, fixture, threshold or configuration — those
are payload and live in C3.

## Correction scope

Exactly one open finding was carried in: **PRC-7-01 (P1)**. The correction is confined to the
sequencing rule it names and to the documents that depend on that rule. No process redesign beyond
it was attempted, no new packet was proposed, and no successor was implemented or released.

### Disposition of PRC-7-01 — CORRECTED

**Finding:** H2 weakened the E1 sequencing prerequisite from "before K1 implementation" to "before
K1 behavior", and from fixture *construction* to fixture *specifications*, while simultaneously
introducing K1.0 as a genuine K1 structural implementation packet whose entry condition was K0.2
alone. That conflicts with the still-governing pinned benchmark roadmap.

**Independently re-verified external prerequisite.** The benchmark checkout at the pinned revision
`98756f8c10bd806125da8318f1a129bc030aca61` (clean, HEAD equal to the advertised remote main) was
read via `git show <rev>:docs/roadmap.md`. Its interlock table column is **"Build fixtures when"**,
and the E1 row reads:

> `| E1 asynchronous acceptance | After K0 contract, before K1 implementation | K1; extend at K2/K4 | ... |`

followed by:

> "There is no circular implementation gate: fixture preparation precedes each implementation, its
> result gates the next dependent slice."

So the benchmark owns *fixture construction before K1 implementation*, with the *result* gating the
next dependent slice. The pre-change ArrokothI roadmap agreed ("E1 fixtures begin before
implementation"). H2's variants weakened both halves. The finding is correct as written.

**Resolution taken.** K1.0 is treated as what it is — K1 implementation — and the external
prerequisite is restored rather than reinterpreted. One rule now reads the same in every current
planning document:

> The benchmark-owned E1 fixture preparation precedes K1 implementation, **including K1.0**.
> Prepared fixtures are an entry prerequisite, never a passed gate.

No benchmark amendment is required, and none was requested: E1 fixture construction depends only on
the accepted K0 contract and never on a K1 subject, so requiring it before K1.0 introduces no cycle
and K1.0 remains a viable recommended structural packet. There is therefore **no owner/benchmark
planning decision blocker** arising from this correction. Had retaining K1.0 required changing the
benchmark-owned prerequisite, this report would have raised that as a blocker instead.

Explicitly **not** used as escapes: K1.0 is not redescribed as non-implementation; "fixtures" is not
softened to "fixture specifications"; and no document claims E1 passed because fixtures exist or
because K1.0 passes.

### Implementer-discovered dependent defect (not part of PRC-7-01)

**PRC-7-02 (P2), corrected in this same payload.** The K1.0 row in the 007 status ledger
independently restated the entry condition as "K0.2 prerequisite and separate explicit owner release
required". Correcting only the packet definition would have left the authoritative status table
asserting the weaker condition. The row now carries the E1 fixture prerequisite and an explicit
"no E1 credit" statement, and a new guard pins it. This was found by the closure sweep described
below, not by the review.

## Reconstructed sequencing and dependency chain

Rebuilt from the corrected documents rather than from the finding text.

| Step | Entry condition | Owner of the condition | What it does **not** grant |
|---|---|---|---|
| K0.1 | — | ArrokothI 007 | ACCEPTED and integrated; no E-gate result |
| E1 fixture construction | Accepted K0 contract | **Benchmark** roadmap | May begin immediately; building them closes no gate |
| K0.2 (E0 gate) | K0.1 accepted + owner release | ArrokothI 007 / benchmark E0 | Public controls and E0 ownership; not a working target Kernel |
| **K1.0** (structural) | K0.2 accepted **and** required E1 fixtures already built, + owner release | ArrokothI 007 + benchmark E1 timing | Structural separation only; **no** E1 credit, no protocol, no package release |
| K1.1–K1.3 | Predecessor accepted (prerequisite already satisfied upstream) | ArrokothI 007 | Incremental protocol; no milestone closure |
| **K1.4** (gate) | K1.3 accepted | ArrokothI 007 + benchmark E1 result | Closes K1 only on the **full K1/E1 matrix plus K1.0's structural obligations** |

E1 fixture construction runs in parallel with K0.2 — it is not sequenced after it — but it must be
complete before K1.0 begins. That is the only ordering change relative to H2.

## Counterexamples challenged after editing

The chain above was challenged case by case against the corrected text, not against intent.

| # | Case | Required answer | Result and where it is enforced |
|---|---|---|---|
| 1 | K0.2 accepted, E1 fixture preparation absent → can K1.0 start? | **No** | **No.** 007 K1.0 `Dependencies` names the fixture preparation and states K1.0 "cannot start on K0.2 acceptance alone"; 007 entry rules require "available required evidence inputs" and place external E fixtures before "a milestone's first structural or preparatory packet"; the K1.0 status row repeats it. |
| 2 | Fixtures prepared, no E1 behavioral result yet → can K1.0 structural work start? | **May**, if other prerequisites and owner release are met — and this is not an E1 pass | **May.** 007 entry: "Prepared fixtures are an entry prerequisite, never a passed gate"; 013 keeps K1.0 as preparation/separation; release still needs K0.2 accepted/integrated and an explicit owner release. No document reads this as E1 passing. |
| 3 | K1.0 structurally accepted → can K1.1 start without the required E1 preparation? | **No** | **No.** The preparation is a K1.0 dependency, so K1.0 could not have been accepted without it; independently, the general 007 rule binds K1.1 as candidate implementation. There is no path where K1.1 begins with the prerequisite unsatisfied. |
| 4 | K1.0 accepted → does it close any E1 behavioral criterion? | **No** | **No.** 007 K1.0 acceptance: "no ... E1 pass"; "their existence and this packet's structural pass close no E1 criterion". 001: "neither prepared fixtures nor a K1.0 structural pass is an E1 result". 013 interlock: "never an E1 result". Ledger row: "no E1 credit". |
| 5 | K1.4 final gate → still the complete K1/E1 matrix? | **Yes** | **Yes.** 007 K1.4: "Full K1/E1 matrix and K1.0 structural obligations pass"; aggregate closure row "K1.4 ACCEPTED, structural obligations plus full E1"; 001 "K1.4 retains the full K1/E1 gate". All three are guarded. |
| 6 | Any document still implying "specifications before behavior"? | **Must not** | **None remain** in current planning documents. A repository-wide search leaves only (a) the guard strings inside `validate.py` that forbid the phrases, and (b) the historical attempt reports implementation-01/02, which are as-of records of their own candidates and are deliberately preserved byte-for-byte. |
| 7 | Does 007's dependency/release language agree with 001, 013 and the benchmark roadmap? | **Must** | **Yes.** 007 header, entry rules, K1.0 definition, K1.0 status row, K1.4 acceptance and the aggregate table all state the same rule as 001's K1 entry, 013's recommendation and interlock row, both READMEs, and the benchmark roadmap's own "before K1 implementation" build timing. |

## Cumulative consistency and search results

Searched the current planning/process documents for `E1`, `K1.0`, `K1.1`, `before implementation`,
`behavioral implementation`, `fixture specifications`, `fixture preparation`, `external E fixtures`
and `K0.2`, then inspected every hit rather than only the phrases the finding named.

| Document | Disposition |
|---|---|
| [001](../../001-current-status-and-roadmap.md) | **Corrected.** K1 entry restores "E1 fixtures begin before implementation", attributes the prerequisite to the benchmark roadmap, states K1.0 is K1 implementation, records the no-cycle argument and denies E1 credit. |
| [007](../../007-work-packets.md) | **Corrected** in four places: header sequence, the general entry rule, the K1.0 definition (dependencies + acceptance + release condition) and the K1.0 status row (PRC-7-02). |
| [013](../../013-structure-and-evidence-sequencing.md) | **Corrected**: recommendation paragraph, K1.0 entry-record obligation, the K0.2 ↔ E0 ↔ K1/E1 interlock row, and benchmark follow-up 2 (now states E1's existing timing already covers K1.0 and requests no amendment). |
| [011](../../011-k0.1-process-retrospective.md) | **Corrected** in its forward-looking owner-update section only. Its historical twelve-round records, identities and evidence are untouched. |
| [docs/development/README.md](../../README.md) | **Corrected**: the 013 table row and the K1.0 paragraph. |
| [README.md](../../../../README.md) | **Corrected**: the K1.0 planning sentence. |
| [contract.md](contract.md) | **Updated prospectively**: adds PRC-7a and the attempt-3 correction identities. The contract is the live requirement map under 006. |
| [validate.py](validate.py) | **Extended** with the guards listed below. |
| [006](../../006-development-process.md) | **Inspected, unchanged.** "Missing cross-repository gate evidence blocks only dependent acceptance, not independent fixture preparation" is already consistent: preparation is independent, the result gates dependent acceptance. |
| [010](../../010-pipeline-planning-assessment.md) | **Inspected, unchanged.** Its "Four packets" K1 row is an as-of statement inside a document H2 already banners as historical; 007 owns current status. |
| [012](../../012-review-methods.md), [009](../../009-universal-prompts.md) | **Inspected, unchanged.** Their K0.2 mentions concern release holds and launchers, not E-fixture sequencing. |
| 001 K2 entry; 001 K4 "extend E1/E4 fixtures first"; 001 K4 fixture prose | **Inspected, unchanged.** The K2/K4 entries are pre-existing, not introduced by H2, and are consistent with the benchmark's own E2/E4 timing. The K4 prose uses `E1`/`E2` as *Event* identifiers, not evidence slices; they were deliberately left alone. |
| implementation-01, implementation-02 | **Deliberately preserved byte-for-byte.** implementation-02 line 81 retains "E1 specifications precede K1 behavior" as the historical record of the rejected attempt; rewriting it would falsify the review trail. Its superseding disposition is recorded here. |

Because this is a semantic correction, 006 requires tracing consequences through every dependent
statement rather than patching the named phrases. The two additional occurrences that patching alone
would have missed were the 007 general entry rule and the 007 K1.0 status row.

**New mechanical guards in `validate.py`** (they constrain the documents; they do not prove semantic
correctness): forbidden weakened phrases across the 13 current planning documents; required positive
statements in 001; the K1.0 dependency, acceptance and status-row conditions; the K1.4 full-gate
text; two required statements in 013; byte-equality of implementation-02 against H2; and H2 ancestry
of HEAD.

**Negative controls were run** — the guards were confirmed to fail on the defect they exist to catch,
rather than passing vacuously. Reintroducing H2's 001 phrasing produced 3 failures; removing the
E1 prerequisite from the K1.0 dependencies produced the K1.0-entry failure; restoring H2's 013
interlock wording produced the 013 failure; appending one byte to implementation-02 produced
"Reviewed attempt-2 report altered". Each mutation was reverted and the clean tree returns 0 failures.
These control runs were performed on the working tree before C3 was committed; the committed C3 tree
was validated clean afterwards, and the outputs below are from that clean C3 run.

## Exact validation on clean C3

Date 2026-09-11. Cwd for all commands:
`/Users/rex-shih/Documents/Codex/projects/agent-kernel`. All returned exit 0. SHA-256 covers the
exact merged stdout/stderr UTF-8 bytes including trailing newlines — the same convention as
implementation-02, confirmed by commands 4 and 5 reproducing that report's digests byte-for-byte.

These commands were **independently rerun in this session on the committed clean C3 tree**; none is
an inspected or copied prior log. The one environment difference from implementation-02 is the
Python patch version (3.13.5 here versus 3.14.6 there), recorded rather than normalized; the script
uses only the standard library and its result is unchanged.

Per the contract's selected 012 method (process/documentation), Runtime suites, typecheck,
builder-docs, eval, packaging, fault and live runs were **not** run: this payload changes only
development prose plus its own checking script, and no behavioral claim depends on them. No E0–E6
gate was executed or decided.

### Command 1 — `git rev-parse HEAD`

Exit 0. SHA-256 `db0e10169a1fc53d7dcfb31c41bb8d14e57931b638b627f0b5e7914778ba433e`.

```text
0d884fcfa1a014f7195903ecef8b2e2bf0e47db5
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

Exit 0. SHA-256 `efc6d936eae2b2198126ff993e7c6b7d67b17319b4ca6b2568134c3ac127009f`.

```text
Scope: 17 changed/new paths; all must be explicitly allowed
Historical preservation: 35 pre-existing K0.1 files compared by Git blob
Ledger: 35 unique packets/definitions; K0.1 ACCEPTED, 34 PLANNED; acyclic dependencies
Sequence: K0.2 -> K1.0 -> K1.1; K1.4 retains full gate; no K0.2/K1.0 implementation directories
E1 sequencing: fixture preparation precedes K1 implementation including K1.0 in 13 current planning documents; K1.0 earns no E1 credit; K1.4 keeps the full gate
SDK metadata: only repository URL changed; package name/version/exports/dependencies preserved
Benchmark: read-only HEAD/clean-state check at 98756f8c10bd806125da8318f1a129bc030aca61
Interim process report: preserved byte-for-byte at 88236083e52c1a006077653482cae3f71eb213df
Reviewed attempt-2 report: preserved byte-for-byte at H2 bf2a3057272aa8749a8ce9d36ec8239f4e2411a9; H2 is an ancestor of HEAD
Integration: 3 ancestry checks; exact merge parents; A12/full merge tree equality; C12/H12/A12 scope
Links: 15 documents; 148 local links/anchors; 7 external links excluded
Link parser scope: inline Markdown links outside fenced examples; not remote reachability or full Markdown rendering
Result: 0 failures
```

### Command 7 — `git diff --check 42731300266eea00a9a24d867d5e82d9887c280d HEAD`

Exit 0. SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`. Output: empty.

### Command 8 — `git diff --stat 42731300266eea00a9a24d867d5e82d9887c280d HEAD`

Exit 0. SHA-256 `0faa34f95703eef8f2418a50ce70503caf68f77a93e69f84b86a59d6cf53a278`.

```text
 README.md                                          |  11 +-
 docs/development/001-current-status-and-roadmap.md |  21 +-
 docs/development/006-development-process.md        | 100 ++++++--
 docs/development/007-work-packets.md               |  70 ++++--
 docs/development/008-implementation-report.md      | 135 ++++++----
 docs/development/009-universal-prompts.md          | 274 ++++++---------------
 .../010-pipeline-planning-assessment.md            |   6 +
 docs/development/011-k0.1-process-retrospective.md | 181 ++++++++++++++
 docs/development/012-review-methods.md             |  88 +++++++
 .../013-structure-and-evidence-sequencing.md       | 137 +++++++++++
 docs/development/README.md                         |  25 +-
 .../work/K0.1-process-review/contract.md           |  41 +++
 .../work/K0.1-process-review/implementation-01.md  | 230 +++++++++++++++++
 .../work/K0.1-process-review/implementation-02.md  | 264 ++++++++++++++++++++
 .../work/K0.1-process-review/validate.py           | 222 +++++++++++++++++
 docs/development/work/K0.1/integration-01.md       |  54 ++++
 packages/sdk/package.json                          |   2 +-
 17 files changed, 1558 insertions(+), 303 deletions(-)
```

### Command 9 — `git diff --stat bf2a3057272aa8749a8ce9d36ec8239f4e2411a9 HEAD`

Exit 0. SHA-256 `02b0b28a492f9b963648ed6fd407936706b8e73feb726180b7e271f6f2d114ad`. This is the
exact H2..C3 correction delta.

```text
 README.md                                          |  3 +-
 docs/development/001-current-status-and-roadmap.md | 14 ++++--
 docs/development/007-work-packets.md               | 23 +++++++---
 docs/development/011-k0.1-process-retrospective.md |  8 ++--
 .../013-structure-and-evidence-sequencing.md       | 16 +++++--
 docs/development/README.md                         |  6 ++-
 .../work/K0.1-process-review/contract.md           |  4 ++
 .../work/K0.1-process-review/validate.py           | 51 ++++++++++++++++++++--
 8 files changed, 100 insertions(+), 25 deletions(-)
```

### Command 10 — `git ls-remote origin refs/heads/main`

Exit 0. SHA-256 `4630442861977395dfcf049dca2a03e37180089bda37e85cdcb6af574ed60c9c`.

```text
42731300266eea00a9a24d867d5e82d9887c280d	refs/heads/main
```

### Command 11 — `git ls-remote https://github.com/ArrokothI/arrokothi.git refs/heads/main`

Exit 0. SHA-256 `4630442861977395dfcf049dca2a03e37180089bda37e85cdcb6af574ed60c9c`.

```text
42731300266eea00a9a24d867d5e82d9887c280d	refs/heads/main
```

### Command 12 — `git ls-remote https://github.com/ArrokothI/benchmark.git refs/heads/main`

Exit 0. SHA-256 `4371abe70bf0ead9c8fbe6a95877f49a413c17f9b91d15bdab63bffdd164121a`.

```text
98756f8c10bd806125da8318f1a129bc030aca61	refs/heads/main
```

### Command 13 — `git -C ../benchmark rev-parse HEAD`

Exit 0. SHA-256 `b387fa1c459f58120508803044ff8346182b86b98bb2977375c0b244761fa594`.

```text
98756f8c10bd806125da8318f1a129bc030aca61
```

### Command 14 — `git -C ../benchmark status --porcelain=v1`

Exit 0. SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`. Output: empty.

## Explicit statements

- **Benchmark repository: read-only and unchanged.** Its roadmap was read at the pinned revision
  `98756f8c10bd806125da8318f1a129bc030aca61` using `git show <rev>:docs/roadmap.md` only. No
  benchmark file, Git ref, configuration, frozen snapshot, fixture or evidence was created, edited
  or deleted; local HEAD still equals the pinned revision with a clean tree (commands 13–14) and
  matches its advertised remote main (command 12). No benchmark amendment was requested, and the
  correction was **not** solved by changing the benchmark to make this candidate pass.
- **K0.2 remains unimplemented and unreleased.** Ledger status PLANNED; no `work/K0.2` directory;
  the owner hold is intact.
- **K1.0 remains unimplemented and unreleased.** Ledger status PLANNED; no `work/K1.0` directory;
  it is a planning proposal that now additionally requires the E1 fixture preparation before any
  future release.
- **Reviewed history preserved.** H2 and implementation-02 are unmodified and H2 is an ancestor of
  H3; nothing was amended, rebased, force-pushed or deleted.
- **No merge**, no `main` push, no self-acceptance, and no successor packet was started.
- **Third-party reuse: none.** No source, dependency, service, asset or test was incorporated. The
  validation helper continues to use only the Python standard library. No package name, version,
  export, dependency or runtime behavior changed in this payload.

## Limitations

The guards are textual and structural. They can detect the specific regression PRC-7-01 describes
and the dependent statements enumerated above; they cannot prove that some other document phrasing
is semantically adequate, that the reconstructed chain is the one the owner intends, or that future
agents will read it correctly. The link checker covers inline Markdown links outside fenced blocks,
not remote reachability or full Markdown rendering. K1.0 remains a planning judgment about current
dependency coupling, not proof that structure caused K0.1's defects, and its final scope still needs
review after K0.2 before any release.

## Handoff

Ready for independent review only. Submit H3 for a fresh cumulative independent review of the whole
base..H3 candidate — the H2..C3 correction delta alone is insufficient, and H2's prior self-assessed
criterion table is not carried forward as evidence. This report claims no ACCEPT, records no verdict,
and releases nothing. H3's exact SHA and verified remote branch identity accompany the external
handoff after commit and push.
