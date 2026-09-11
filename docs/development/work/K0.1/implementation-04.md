# Implementation report — K0.1, round 4 (correction)

## Identity and status

- Packet / parent milestone: **K0.1** / **K0**; [contract.md](contract.md) (corrected this round);
  worksheet [protocol-worksheet.md](protocol-worksheet.md) **Revision 4**.
- State: **WAITING_FOR_REVIEW**
- Correcting: [review-03.md](review-03.md)'s CHANGES REQUIRED outcome, findings **K01-R3-01 through
  K01-R3-04**, against reviewed candidate H3 `aef1e33ba944a0647bb2319fb97ae40b18b05924`
  (payload C3 `2b252b05eaf7020fec1e2b4a342d5fea86bad66e`, base `6464be1`).
- Base commit (unchanged since round 1): `6464be12c11eb75f7dfbc5ece12ca8d3020a5c15`
- Round-1 reviewed H (preserved, not amended): `857fa05a8a72a4c6f4f294f9e775a0dc1f7919dc`
- Round-2 reviewed H2 (preserved, not amended): `cc61e74455534abf896c46632246615185219b92`
- Round-3 reviewed H3 (preserved, **not** amended or rewritten): `aef1e33ba944a0647bb2319fb97ae40b18b05924`
- Round-3 review record commit (adds [review-03.md](review-03.md); ledger → CHANGES_REQUESTED):
  `673888425bdc4d9822f7d9e192dc34d66149ae5d`
- **Correction payload C4: `2286106dfc8efc43a9f8758b2deaa6a7ddb64fa9`**
- Candidate H4: the commit containing this report and the ledger status edit, and **nothing else**;
  full SHA supplied in the handoff (per 006, H cannot name itself).
- Branch / remote: `codex/k0.1-protocol-legacy-disposition` / `origin`
  (`https://github.com/ArrokothI/Agent_SDK.git`; GitHub reports it moved to
  `https://github.com/ArrokothI/agent-kernel.git` — the configured URL is deliberately left unchanged).
- Working tree: verified clean at C4 **before** validation ran, and no file was written into the
  repository after it (see `git status --porcelain` below and the C4→H4 scope check).
- History: every prior commit, report, review and evidence file is preserved unedited. No amend, no
  rebase, no force-push, no deletion. H3 is untouched, including the round-3 evidence directory it
  added after C3 validation — that defect is corrected forward by this round's commit sequence, not
  by rewriting H3.

## Round-4 commit sequence (finding K01-R3-03)

| Step | Commit | Contents |
|---|---|---|
| Administrative review record | `673888425bdc4d9822f7d9e192dc34d66149ae5d` | `review-03.md` + the 007 K0.1 status row → `CHANGES_REQUESTED`. No payload. |
| Payload **C4** | `2286106dfc8efc43a9f8758b2deaa6a7ddb64fa9` | `contract.md` + `protocol-worksheet.md` only. |
| Final validation | — | Run against the clean C4 tree, after C4 existed. Nothing written into the repository afterwards. |
| Candidate **H4** | the commit containing this report | `implementation-04.md` + the 007 K0.1 status row → `WAITING_FOR_REVIEW`. Nothing else. |

## Findings — individual disposition

| Finding | Severity | Disposition | Exact correction | Evidence |
|---|---|---|---|---|
| **K01-R3-01** — make E-7's canonical encoding and its standards guidance agree | P1 | **Fixed** (preferred minimal-standard route) | The review offered two routes; this correction takes the **preferred** one: align rule 4 with RFC 8785/JCS. **Rule 4** now orders object members by comparing keys as sequences of **UTF-16 code units** treated as unsigned 16-bit integers, quoting RFC 8785 §3.2.3's own wording, and the implementation guidance is re-derived from the rule instead of contradicting it — JavaScript's `Object.keys(o).sort()` and default `<` are correct unchanged, while Go/Rust/Python 3 must convert to UTF-16 code units because a lead surrogate (U+D800–U+DBFF) compares below every BMP character from U+E000 upward. Revision 3's UTF-8-byte recommendation is gone, so *one implementation following the normative rules and another following every implementation recommendation now necessarily produce the same bytes* — the specific property the review required. **The supplementary-plane test vector is updated**: the canonical form of `{"�":1,"😀":2}` is now `{"😀":2,"�":1}` (still 18 bytes), and the byte-order explanation is inverted to match, naming code-point/UTF-8-byte sorting as the wrong order. **Rule 7 is pinned to a stable exact reference** rather than to empirical Node behaviour: ECMA-262 §7.1.12.1 including its "Note 2" enhancement — the reference RFC 8785 §3.2.2.3 makes normative — adopted *by reference*, with an explicit precedence sentence ("where this prose and the referenced algorithm could ever be read to differ, the referenced algorithm governs and the prose is the defect"); the Node `v25.2.1` observations are demoted to a cross-check, and the `1e-6` → `0.000001` case is stated so the threshold is unambiguous on both sides. **The profile note is rewritten** to say accurately that the canonical form *follows* RFC 8785/JCS for property ordering and primitive serialization, that an unmodified JCS canonicalizer emits exactly these bytes for any value passing E-1/E-2, and that rules 8–9 are K0.1's own and not claimed as JCS. **E-7's internal-only nature is preserved and restated**: JCS is normally used for signing or wire transmission, E-7 is not; no transport is required to emit it, and the transport wire codec stays replaceable and implementation-owned. E-6 gained a note separating its scalar-value length counting from rule 4's code-unit comparison, so the two Unicode units in one section do not read as a contradiction. §13 records the internal contradiction and its resolution explicitly (K0.1-C5), noting that no canonical owner is overridden: execution-protocol.md leaves the choice to this packet. **All eight canonical byte counts were recomputed** by machine after editing, not re-read. | Diff `aef1e33..2286106`, worksheet §1 (E-6, E-7 rules 4 and 7, profile note, example table), §13; `contract.md` K0.1-C5. RFC 8785's normative text was **read this round** at `https://www.rfc-editor.org/rfc/rfc8785.txt`, not recalled. Byte-count and key-order recomputation: `09-canonical-recheck` below. |
| **K01-R3-02** — make §12 obey K0.1-C3's exact disposition vocabulary | P1 | **Fixed** | **`Partially migratable` is gone as a classification.** Revision 3's single `MIG-5` is split: **`MIG-5` — Migratable** now covers only the reusable declarative Event matching primitive (`WakeCondition`'s kind/correlation equality test, `eventSatisfiesWake`) together with the envelope identity/kind/correlation fields it matches against; **`REF-5` — Refused** is a new row covering exactly what the review named, *adoption of the existing single-`wake` `ExecutionWait.event` record as the new K1 target wait record*, with "refused unchanged as the target record shape" stated in the classification cell and the grounds (one `wake`, one `correlationId`, no subscription concept) retained from revision 3's reasoning. **`LIM-1` is no longer a row in the classification table**: its reference-store analysis is preserved in substance and keeps its ID — `REF-4` and §13 both reference it — but now lives in a separate `### Reference-implementation limitations (not a legacy disposition)` subsection, which states in its first sentence that it is not a migratable/legacy-only/refused classification. K0.1-C3's vocabulary is **not** expanded: §12's header note now says the three labels are exhaustive and that non-disposition material belongs outside the table, and `contract.md`'s K0.1-C3 says the same normatively. **W-1/W-7's target semantics are untouched** — the review accepted them and this correction does not reopen §5. After the edit every row that classifies legacy data carries exactly one of **Migratable** (`MIG-1`–`MIG-5`), **Legacy-only** (`LEG-1`–`LEG-5`) or **Refused** (`REF-1`, `REF-3`, `REF-4`, `REF-5`), with splits where a single label would misrepresent a record (`MIG-2`/`LEG-3`, `MIG-3`/`LEG-4`, `MIG-5`/`REF-5`, `REF-3`'s two halves, `LEG-5`'s split facts). | Diff `aef1e33..2286106`, worksheet §12 (header note, `MIG-5`, `REF-5`, the new subsection), §13; `contract.md` K0.1-C3. Source citations re-verified against `packages/core/src/execution/context.ts:102-108` and `packages/core/src/interaction/event-envelope.ts:66-86` at C4. |
| **K01-R3-03** — restore the C/H commit-identity convention without rewriting H3 | P2 | **Fixed** | The sequence in the table above is exactly the one the review prescribed. H3 was **not** rewritten and the round-3 evidence directory remains in the tree as historical evidence (`10-history-preserved` below shows `aef1e33..HEAD` touching nothing under `evidence/`). All final validation ran against the **clean C4 tree** after C4 existed. **No evidence file, directory or script was added to the repository in round 4**: every required raw output is reproduced verbatim in the *Validation* section below, with exact command, cwd, C4 SHA, tool/OS versions, UTC timestamp and exit code, plus SHA-256 for the one artifact where a digest is useful (the link/anchor audit script). The one tool that is not already in the repository — the round-4 variant of the committed audit script — is reproduced below as an exact two-hunk diff against the committed round-3 script plus its SHA-256, so a reviewer can reconstruct byte-identically what ran without this round adding a file. `git diff --stat C4 H4` is verified in the handoff to show only `implementation-04.md` and the ledger row. | Commit list above; `05-diff-stat-correction`, `06-status`, `10-history-preserved` below; C4→H4 scope check in the handoff. |
| **K01-R3-04** — correct historical review metadata in review-03 without rewriting review-02 | P2 | **Fixed** | [review-02.md](review-02.md) is **preserved byte-for-byte** (`10-history-preserved` below: no diff from `ca06599` to HEAD), as is [review-01.md](review-01.md) (no diff from `4d47638`). [review-03.md](review-03.md) records both superseded statements explicitly: (1) round 2's "severity labels were not supplied" is superseded by the actual labels — **K01-R2-01 P1, K01-R2-02 P1, K01-R2-03 P1, K01-R2-04 P2, K01-R2-05 P2, K01-R2-06 P2 / evidence gap**; (2) round 2's "three of round 1's five severities were understated" is superseded by **exactly two — K01-REV-03 and K01-REV-04** — with the note that the pair review-02 named is right and only its count is wrong. The round-2 criterion dispositions actually delivered are preserved in review-03 (**C1 PASS, C2 FAIL, C3 FAIL, C4 PASS, C5 FAIL, C6 FAIL, 007 K0.1 packet acceptance FAIL, K0.2/E0 and later executable evidence DEFERRED**), because review-02 recorded no criterion table at all. The round-2 review date is recorded as **September 10, 2026 (America/New_York)**. **No session identifier is invented** for any round; the absence is stated. review-03 itself carries every 008 field: reviewer identity/model (GPT-5.6 Sol, High reasoning), review date, base/C3/H3/contract/evidence identities, access limits, an explicit inspected-versus-rerun section, the delivered round-3 criterion verdicts, four severity-labelled findings with precise references, and one final outcome (CHANGES REQUIRED). | [review-03.md](review-03.md), committed in `673888425bdc4d9822f7d9e192dc34d66149ae5d`; `10-history-preserved` below. |

## Validation

All commands ran at **C4 `2286106dfc8efc43a9f8758b2deaa6a7ddb64fa9`** with the working tree verified
clean. Output was captured **outside the repository** so the tree stayed clean while the commands
observed it, and — unlike round 3 — it is **not** copied back into the repository: it is reproduced
verbatim below instead, which is the evidence path [review-03.md](review-03.md)'s K01-R3-03 names as
simplest and compliant. Nothing was written into the repository between validation and this report.

- **cwd:** `/Users/rex-shih/Documents/Codex/projects/agent-kernel`
- **Environment:** Node `v25.2.1`, npm `11.6.2`, Python `3.13.5`, git `2.39.5 (Apple Git-154)`,
  Darwin `24.6.0 arm64` / macOS `15.7.9`, package `arrokothi-agent-kernel@0.8.1`, installed workspace
  dependencies.
- **UTC timestamp of the environment capture:** `2026-09-11T04:14:27Z`; every command below ran in
  the same session immediately after it, at the same HEAD.

### Criterion observations

| Criterion ID and source | Assertion / independent observation | Command and evidence | Observed result |
|---|---|---|---|
| K01-R3-01 ([review-03.md](review-03.md)) | E-7's normative rules and its implementation guidance name one byte sequence; the profile claim is true of the aligned rules; every byte count is correct | `09-canonical-recheck` (independent recomputation) + inspection of worksheet §1 | **PASS** — machine-recomputed canonical forms and sizes match all eight table rows; the UTF-16 code-unit sort produces the vector now printed in the table, and code-point/UTF-8 sorts produce the other order |
| K01-R3-02 ([review-03.md](review-03.md)) | Every §12 row that classifies legacy data uses exactly one of migratable / legacy-only / refused | Inspection of worksheet §12 at C4; row IDs `MIG-1..5`, `LEG-1..5`, `REF-1/3/4/5`, with `LIM-1` outside the table | **PASS** |
| K01-R3-03 ([review-03.md](review-03.md)) | Validation runs on a clean C4; H3 and its evidence are untouched; round 4 adds no evidence file | `06-status`, `10-history-preserved`, and the C4→H4 scope check in the handoff | **PASS** |
| K01-R3-04 ([review-03.md](review-03.md)) | `review-01.md` and `review-02.md` are byte-identical to the commits that introduced them | `10-history-preserved` | **PASS** |
| K0.1 contract command plan, step 1 | `npm run check:builder-docs` passes unchanged | `01-builder-docs` | **PASS**, exit 0 |
| K0.1 contract command plan, step 2 | cumulative `git diff --check` clean | `03-diff-check` | **PASS**, exit 0, no output |
| K0.1 contract command plan, step 3 | K0.1 link/anchor audit passes | `07-link-anchor-audit` | **PASS**, 0 unresolved files, 0 bad anchors |
| K0.1 contract command plan, step 4 | cumulative scope touches only `docs/development/` | `04-diff-stat-cumulative` | **PASS** — no `packages/`, no `tests/`, no canonical doc |
| K0.1 contract command plan, step 5 | `npm run typecheck` passes | `02-typecheck` | **PASS**, exit 0, no diagnostics |

### Command summary

| Command (exact) | Payload / environment | Exit, counts, skips | Raw evidence |
|---|---|---|---|
| `npm run check:builder-docs` | C4, clean tree, Node v25.2.1 | 0 — 26 Markdown files, 275 local links/anchors, 38 public package imports | `01-builder-docs` below |
| `npm run typecheck` | C4, clean tree, `tsc --noEmit -p tsconfig.json` | 0 — no diagnostics | `02-typecheck` below |
| `git diff --check 6464be1… 2286106…` | cumulative base..C4 | 0 — no whitespace or conflict-marker errors, no output | `03-diff-check` below |
| `git diff --stat 6464be1… 2286106…` | cumulative base..C4 | 0 — 18 files, 2204 insertions, 1 deletion, all under `docs/development/` | `04-diff-stat-cumulative` below |
| `git diff --stat aef1e33… 2286106…` | correction delta H3..C4 | 0 — 4 files, 413 insertions, 50 deletions | `05-diff-stat-correction` below |
| `git status --porcelain` | at C4 | 0 — empty output, clean tree | `06-status` below |
| `python3 link-anchor-audit-r4.py` | round-4 variant of the committed round-3 script; SHA-256 `af77c5ef72d86cd4a18e0572e0f00aa0a8cea7489c73775eceb74b115daf3458` | 0 — 134 relative links, 118 resolved, 12 anchors verified, 16 known forward references, 0 unresolved, 0 bad anchors | `07-link-anchor-audit` below |
| `python3 -` (ad-hoc) | same-file anchors and the 007 K0.1-row links, neither covered by the audit script | 0 — all OK | `08-extra-links` below |
| `node canon.mjs` | ad-hoc recomputation of E-7's boundary examples | 0 | `09-canonical-recheck` below |
| `git diff --stat` × 4 | prior-record preservation | 0 — all empty | `10-history-preserved` below |

**`npm test` was not run**, and is not required: this round changes documentation and review records
only. `04-diff-stat-cumulative` shows the full cumulative diff touching nothing under `packages/` or
`tests/`, so the full-suite result recorded at this lineage's baseline remains uninvalidated. No live
model/provider call, process-kill fault injection, or E0–E6 benchmark run was performed or is claimed.

### Raw output, reproduced verbatim

Each block is the complete unedited output of the command in its first line, captured at C4. The
`exit=` line is the shell's exit status for that command.

#### `00-env` — environment capture

```text
node    : v25.2.1
npm     : 11.6.2
python3 : Python 3.13.5
git     : git version 2.39.5 (Apple Git-154)
uname   : Darwin 24.6.0 arm64
sw_vers : macOS 15.7.9
package : arrokothi-agent-kernel@0.8.1
cwd     : /Users/rex-shih/Documents/Codex/projects/agent-kernel
HEAD    : 2286106dfc8efc43a9f8758b2deaa6a7ddb64fa9
utc     : 2026-09-11T04:14:27Z
```

#### `01-builder-docs`

```text
--- 01-builder-docs ---
$ npm run check:builder-docs

> arrokothi-agent-kernel@0.8.1 check:builder-docs
> node --experimental-strip-types scripts/check-builder-docs.ts

Builder checks passed: 26 Markdown files, 275 local links/anchors, 38 public package imports. Named symbols are checked by npm run typecheck.
exit=0
```

#### `02-typecheck`

```text
--- 02-typecheck ---
$ npm run typecheck

> arrokothi-agent-kernel@0.8.1 typecheck
> tsc --noEmit -p tsconfig.json

exit=0
```

#### `03-diff-check` — cumulative base..C4 whitespace/conflict hygiene

```text
$ git diff --check 6464be12c11eb75f7dfbc5ece12ca8d3020a5c15 2286106dfc8efc43a9f8758b2deaa6a7ddb64fa9
exit=0
```

#### `04-diff-stat-cumulative` — cumulative base..C4 scope

```text
$ git diff --stat 6464be12c11eb75f7dfbc5ece12ca8d3020a5c15 2286106dfc8efc43a9f8758b2deaa6a7ddb64fa9
 docs/development/007-work-packets.md               |    2 +-
 docs/development/work/K0.1/contract.md             |  144 +++
 .../work/K0.1/evidence/round-3/01-builder-docs.txt |   15 +
 .../work/K0.1/evidence/round-3/02-typecheck.txt    |   14 +
 .../evidence/round-3/03-diff-check-cumulative.txt  |   10 +
 .../evidence/round-3/04-diff-stat-cumulative.txt   |   18 +
 .../evidence/round-3/05-diff-stat-correction.txt   |   15 +
 .../work/K0.1/evidence/round-3/06-status-clean.txt |   10 +
 .../K0.1/evidence/round-3/07-link-anchor-audit.txt |   17 +
 .../work/K0.1/evidence/round-3/README.md           |   36 +
 .../K0.1/evidence/round-3/link-anchor-audit.py     |   55 ++
 docs/development/work/K0.1/implementation-01.md    |  127 +++
 docs/development/work/K0.1/implementation-02.md    |  109 +++
 docs/development/work/K0.1/implementation-03.md    |  114 +++
 docs/development/work/K0.1/protocol-worksheet.md   | 1034 ++++++++++++++++++++
 docs/development/work/K0.1/review-01.md            |  146 +++
 docs/development/work/K0.1/review-02.md            |  134 +++
 docs/development/work/K0.1/review-03.md            |  205 ++++
 18 files changed, 2204 insertions(+), 1 deletion(-)
exit=0
```

#### `05-diff-stat-correction` — correction delta H3..C4

```text
$ git diff --stat aef1e33ba944a0647bb2319fb97ae40b18b05924 2286106dfc8efc43a9f8758b2deaa6a7ddb64fa9
 docs/development/007-work-packets.md             |   2 +-
 docs/development/work/K0.1/contract.md           |  19 +-
 docs/development/work/K0.1/protocol-worksheet.md | 237 ++++++++++++++++++-----
 docs/development/work/K0.1/review-03.md          | 205 ++++++++++++++++++++
 4 files changed, 413 insertions(+), 50 deletions(-)
exit=0
```

#### `06-status` — clean tree at C4

```text
$ git status --porcelain
exit=0
```

#### `07-link-anchor-audit` — K0.1 link/anchor audit

```text
$ python3 /private/tmp/claude-501/-Users-rex-shih-Documents-Codex-projects-agent-kernel/9c655ba5-2a02-4d3f-9084-b4d2c13c3237/scratchpad/r4/link-anchor-audit-r4.py   (run from repo root)
relative links checked : 134
resolved files         : 118
anchors verified       : 12
known forward refs     : 16 (implementation-04.md, written by the report commit H4)
unresolved files       : 0
bad anchors            : 0
RESULT: PASS
exit=0
```

The link count rose from round 3's 85 to 134 because four sources grew between C3 and C4:
`review-03.md` contributes 17 links (it did not exist at C3), `implementation-03.md` contributes 11
(it exists in the tree at C4 but was written by H3, so it was absent at C3), `contract.md` gained 5
and `protocol-worksheet.md` gained 16 — 49 exactly. Known forward references fell from 17 to 16
because `implementation-03.md` is now a real file while `implementation-04.md` (this file, written by
H4) is not yet.

**The script that ran.** `docs/development/work/K0.1/evidence/round-3/link-anchor-audit.py` is
already in the repository at H3 (SHA-256
`4713f621db707d80cfce3c3a9c43b11dfeffa2c4a3c973e7b4d2d7ebe107767a`). Round 4 must add no file to the
repository, so the round-4 variant ran from outside the working tree. It differs from the committed
script by exactly the two hunks below — the round number of the expected forward reference and its
comment — and nothing else:

```diff
--- a/docs/development/work/K0.1/evidence/round-3/link-anchor-audit.py
+++ b/link-anchor-audit-r4.py (run from outside the repository)
@@ -6,9 +6,9 @@
 import os, re, sys
 
 BASE = "docs/development/work/K0.1"
-# implementation-03.md is written by the report commit (H3) that also carries this log,
-# so at the payload commit (C3) it is a known forward reference, reported, not hidden.
-FORWARD = {"implementation-03.md"}
+# implementation-04.md is written by the report commit (H4); at the payload commit (C4) it is a
+# known forward reference, reported, not hidden. Round 4 adds no evidence file to the repository.
+FORWARD = {"implementation-04.md"}
 
 def slug(h):
     h = re.sub(r'`|\*', '', h).strip().lower()
@@ -46,7 +46,7 @@
 print(f"relative links checked : {links}")
 print(f"resolved files         : {links - missing - fwd}")
 print(f"anchors verified       : {anchors_ok}")
-print(f"known forward refs     : {fwd} (implementation-03.md, written by the report commit H3)")
+print(f"known forward refs     : {fwd} (implementation-04.md, written by the report commit H4)")
 print(f"unresolved files       : {missing}")
 print(f"bad anchors            : {bad}")
 for p in problems:
```

Its SHA-256 is `af77c5ef72d86cd4a18e0572e0f00aa0a8cea7489c73775eceb74b115daf3458`. A reviewer can
reconstruct it byte-identically by applying that diff to the committed script and verifying the digest.

#### `08-extra-links` — same-file anchors and 007 ledger links

The audit script skips same-file `#anchor` targets and only walks `docs/development/work/K0.1/`, so
the new subsection anchor and the edited 007 status row were checked separately:

```text
$ python3 - (same-file anchors + 007 ledger K0.1-row links; not covered by the audit script above)
same-file anchor #reference-implementation-limitations-not-a-legacy-disposition -> OK
007 K0.1-row link work/K0.1/review-03.md -> OK
007 K0.1-row link work/K0.1/implementation-03.md -> OK
007 K0.1-row link work/K0.1/evidence/round-3/ -> OK
007 K0.1-row link work/K0.1/review-01.md -> OK
007 K0.1-row link work/K0.1/review-02.md -> OK
exit=0
```

#### `09-canonical-recheck` — independent recomputation of E-7's boundary examples

Run to satisfy K01-R3-01's "recheck all canonical byte-count examples" and to confirm the realigned
rule 4 produces the vector now printed in the worksheet. The script is reproduced in full after its
output; it is an ad-hoc check that was **not** added to the repository.

```text
$ node canon.mjs   (independent recomputation of E-7's eight boundary examples)
row1     "{\"a\":2,\"b\":1}"                13 bytes
row2     "{\"n\":1}"                        7 bytes
row3     "{\"n\":0}"                        7 bytes
row4     "{\"n\":1e+21}"                    11 bytes
row5     "{\"s\":\"A\"}"                    9 bytes
row6     "{\"s\":\"é\"}"                    10 bytes
row7a    "{\"a\":null}"                     10 bytes
row7b    "{}"                               2 bytes
row8     "{\"😀\":2,\"�\":1}"               18 bytes
row8rev  "{\"😀\":2,\"�\":1}"               18 bytes
--- number spellings (ECMAScript Number::toString) ---
1
1
1
0
100000000000000000000
1e+21
0.000001
1e-7
5e-324
1.5e+300
--- key order check ---
codeunit sort: ["😀","�"]
codepoint sort: ["�","😀"]
utf8 byte sort: ["�","😀"]
exit=0
```

`row1`–`row8` correspond to the eight rows of E-7's boundary-example table in order; `row8rev`
re-runs the last case with the two keys inserted in the opposite order, confirming rule 4 makes the
canonical form independent of insertion order. The three sorts at the end are the load-bearing check
for the realignment: UTF-16 code units put the emoji first (the canonical order under rule 4), while
code-point and UTF-8-byte comparison both put U+FFFD first — which is what revision 3 required and
what RFC 8785 does not do.

```javascript
// K0.1 E-7 canonical-form check: JCS (RFC 8785) profile.
// Object members sorted by UTF-16 code units; JSON.stringify already escapes per JCS;
// Number spelling = ECMAScript Number::toString.
const enc = new TextEncoder();
function canon(v) {
  if (v === null || typeof v === "boolean") return JSON.stringify(v);
  if (typeof v === "number") { if (!Number.isFinite(v)) throw new Error("non-finite"); return String(v); }
  if (typeof v === "string") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(canon).join(",") + "]";
  const keys = Object.keys(v).sort(); // default sort = UTF-16 code unit order
  return "{" + keys.map(k => JSON.stringify(k) + ":" + canon(v[k])).join(",") + "}";
}
const cases = [
  ["row1", {b:1,a:2}],
  ["row2", {n:1.0}],
  ["row3", {n:-0}],
  ["row4", {n:1e21}],
  ["row5", {s:"A"}],
  ["row6", {s:"é"}],
  ["row7a", {a:null}],
  ["row7b", {}],
  ["row8", {"�":1,"\u{1F600}":2}],
  ["row8rev", {"\u{1F600}":2,"�":1}],
];
for (const [n, v] of cases) {
  const c = canon(v);
  console.log(n.padEnd(8), JSON.stringify(c).padEnd(34), enc.encode(c).length + " bytes");
}
console.log("--- number spellings (ECMAScript Number::toString) ---");
for (const x of [1, 1.0, 1e0, -0, 1e20, 1e21, 1e-6, 1e-7, 5e-324, 1.5e300]) console.log(String(x));
console.log("--- key order check ---");
console.log("codeunit sort:", JSON.stringify(["�","\u{1F600}"].sort()));
console.log("codepoint sort:", JSON.stringify(["�","\u{1F600}"].sort((a,b)=>[...a][0].codePointAt(0)-[...b][0].codePointAt(0))));
console.log("utf8 byte sort:", JSON.stringify(["�","\u{1F600}"].sort((a,b)=>Buffer.compare(Buffer.from(a),Buffer.from(b)))));
```

#### `10-history-preserved` — prior records untouched

Empty output from each `git diff --stat` means byte-identical.

```text
$ git diff --stat 4d47638 HEAD -- docs/development/work/K0.1/review-01.md   (empty = byte-identical)
exit=0
$ git diff --stat ca06599 HEAD -- docs/development/work/K0.1/review-02.md   (empty = byte-identical)
exit=0
$ git diff --stat aef1e33 HEAD -- docs/development/work/K0.1/evidence/   (empty = round-3 evidence untouched)
exit=0
$ git diff --stat aef1e33 HEAD -- docs/development/work/K0.1/implementation-01.md docs/development/work/K0.1/implementation-02.md docs/development/work/K0.1/implementation-03.md
exit=0
```

## Interpretation and decisions

- **Why this candidate satisfies the correction request.** Each of K01-R3-01 through K01-R3-04 has
  its own disposition row above naming the exact worksheet/contract location and its evidence; none
  is collapsed into "addressed". Two are content corrections in C4; two are corrections to the
  packet's own record-keeping, answered by the commit sequence and by `review-03.md` respectively.
- **Route chosen for K01-R3-01.** The review permitted either alignment with RFC 8785 or an explicit
  documented divergence. The **alignment** route was taken because it is the review's stated
  preference and because it makes K1's "adopt an existing JCS implementation" option real: under the
  divergence route every candidate library would have needed patching, which is a worse position for
  a decision record whose whole purpose is to let K1 build against it. Nothing about the alignment
  weakens E-7's internal-only scope, which is restated in two places rather than dropped.
- **Why rule 4 rather than the profile claim was the half that changed.** Both were coherent in
  isolation — revision 3's code-point rule *was* exactly equivalent to its UTF-8-byte recommendation
  (`09-canonical-recheck` confirms those two agree). Only the RFC 8785 claim was false. Deleting the
  claim would also have been a valid fix, and is the review's "acceptable alternative"; changing the
  rule instead buys the compatibility above at the cost of one test-vector inversion.
- **Why `LIM-1` keeps its ID.** Its classification changed kind in round 2 and its *location* changed
  in round 4, but `REF-4` and §13 both reference it by ID, and renumbering would have broken two
  cross-references to make a cosmetic point. The subsection states in its first sentence that it is
  not a disposition, which is what the review asked for.
- **Why the round-4 audit script is a diff rather than a file.** K01-R3-03 forbids adding an evidence
  script to the repository this round, and the committed round-3 script hard-codes the expected
  forward-reference filename, so it would report a false MISSING at C4. Publishing the exact two-hunk
  diff plus a digest keeps the check fully reconstructable without adding a file.
- **Roadmap deviations:** none. No scope, gate or acceptance requirement was changed or weakened.
  Both contract edits this round are *strengthenings* traceable to a finding — K0.1-C3 now states its
  three labels are exhaustive, and K0.1-C5 now states it also covers a contradiction internal to the
  worksheet. Every parent K0 obligation is still carried by §11's boundary map, which is unchanged.
- **Reviewer focus for this round:** **E-7's profile claim first.** It is now a positive assertion
  ("an unmodified RFC-8785/JCS canonicalizer emits exactly these bytes"), which is stronger than
  revision 3's "coincides with" and therefore worth attacking: the question to test is whether any
  rule 1–7 still diverges from RFC 8785 for a value that passes E-1/E-2. Then §12's `MIG-5`/`REF-5`
  split — specifically whether the boundary between "the primitive migrates" and "the record shape is
  refused" is drawn where §5's W-1 actually needs it, since that split is this round's only new
  classification claim.
- **Known limitations:** unchanged in kind. This worksheet still cannot be validated against running
  K1 behaviour, because K1 does not exist; E-7's determinism is a specification, not a passing
  conformance test, and K0.2/K1.1 own the fixture that would exercise it. New this round: the
  alignment claim is verified by reading RFC 8785 and by recomputing this worksheet's own examples —
  it is **not** verified by running an independent JCS implementation against a shared vector set,
  which would be the stronger evidence and belongs with K0.2's fixture.
- **Third-party source / dependency / service:** **none added.** No code, test material or asset was
  copied, adapted or vendored, and no dependency or service was introduced; `package.json` is
  untouched (see `04-diff-stat-cumulative`). What this round used is *specification text*: RFC 8785
  (IETF, JSON Canonicalization Scheme) was read at `https://www.rfc-editor.org/rfc/rfc8785.txt` and
  is quoted twice in E-7 rule 4 — two short attributed fragments of its §3.2.3 normative sentence —
  and ECMA-262 §7.1.12.1 is cited by reference only, with no text reproduced. Citing and briefly
  quoting a published standard with attribution is neither a dependency nor a reuse of implementation
  source, and no clearance claim beyond that is made here. Adopting any *implementation* of JCS — V8's
  and Ryū's serializers are named by RFC 8785 itself, and third-party canonicalizer libraries exist —
  remains a **K1 decision** that must first clear AGENTS.md's third-party licence/terms review at the
  exact revision adopted; E-7 deliberately states its rules in full so that K1 can also satisfy them
  with an independent implementation.
- **Prior review findings — each ID → correction evidence.** Round 3: K01-R3-01 → Fixed (worksheet §1
  E-6/E-7 rules 4 and 7, profile note, example table; §13; contract K0.1-C5); K01-R3-02 → Fixed
  (worksheet §12 header note, `MIG-5`, `REF-5`, reference-implementation-limitations subsection; §13;
  contract K0.1-C3); K01-R3-03 → Fixed (commit sequence above, validation on clean C4, no evidence
  file added in H4); K01-R3-04 → Fixed ([review-03.md](review-03.md), with `review-01.md` and
  `review-02.md` byte-identical). Round 2's K01-R2-01..06 and round 1's K01-REV-01..05 remain fixed as
  recorded in [implementation-03.md](implementation-03.md) and [implementation-02.md](implementation-02.md);
  this round reopened none of them. The only round-3 *content* it revisits is revision 3's own
  answer to K01-R2-01 and K01-R2-03, which is what K01-R3-01 and K01-R3-02 required. No finding across
  any round remains unresolved or partially resolved.

## Handoff

- Ready for independent review at candidate H4 (SHA supplied in the handoff message; base `6464be1`,
  round-1 H `857fa05`, round-2 H2 `cc61e74`, round-3 H3 `aef1e33`, round-3 review record
  `6738884`, payload C4 `2286106dfc8efc43a9f8758b2deaa6a7ddb64fa9`).
- `git diff --stat 2286106 <H4>` is verified in the handoff message to contain exactly
  `docs/development/work/K0.1/implementation-04.md` and `docs/development/007-work-packets.md`, which
  is the entirety of the declared administrative material for this candidate.
- No self-acceptance. K0.2 and every later packet remain unstarted and unreleased.
