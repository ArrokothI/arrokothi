# TOOLS-01 — design 05 step 6: hold register and preserved closure

2026-10-03. Implementer: Claude Code (`claude-opus-5-5`), by owner assignment; not the design author
and not a reviewer. This is incremental evidence for design 05 §6 step 6. It is not clean-C packet
verification, independent acceptance, conformance or correction credit, or a hold release. TOOLS-01
remains IN_PROGRESS.

**Result.** The register and the preserved closure now run in `corpus` and are recorded in
`adoption.json`. At C, `corpus` recomputes both and requires them to equal the record. The census
reproduces design 05's §5.1 and §2.3 base figures exactly: 1,466; 900; 372; 329; 21 refused; 251
labelled. Two figures differ, both for one stated reason: A10's fallback. 33 members are kept, not 47,
and 296 are refused, not 282. No figure was adjusted to fit.

## What runs

- **Hold register (P1-H, D05-CHK-05).** These are design 05's minimum recipes, unwidened: `Proxy`
  `new Proxy|Proxy\.revocable`; `re-prototyped-built-in` `setPrototypeOf|__proto__|Object\.create\(`;
  `V-ENV` `\bvm\b|createContext|runInContext|frozen-intrinsics|globalThis`; `V-D1` the title `V-D1`
  plus `value-diagnostic-work.test.ts` and `value-refusal-cost.test.ts`. Matching covers the 53 current
  paths of the 71 test-file origins. A body is the registration plus the same-file and test-side
  helpers it references, transitively. The register has **140 matches**, each classified with a reason
  (table below).
- **Run model.** `floor` cites `node-floor-07/floor-a1-a11.json.gz` (SHA-256 `44fc74f1…3c41`), whose
  A10 order model does not hold. Every leaf therefore counts as earlier.
- **Prefix, reads, helper closure, labels.** These follow design 05 §2.3 rules 1–6 as specified, with
  one traced run per file. Each record keeps a digest of its compared reads. The digests were identical
  across three census runs.
- **Move.** `tests/conformance/architecture/evidence-records.test.ts` became
  `tests/archive/evidence-records.test.ts` at `99e75608` (archive retention). It runs under
  `archive-tests` with the verified `9fd2faa7` snapshot.
- **Helper reviews (counted readings).** There are five, one per origin where `harness.ts` was a
  member's only blocker: `creation`, `evidence`, `inspection` and `receipts` (identical files) and
  `ingress` (changed), all pinned at `9fd2faa7`. Each covers the whole module:
  - Top-level changes are type-only names, a binding added to an already-requested module, and new
    function-valued declarations.
  - `caller` adds `controlScopes`. Only `requestTakeover`, `recoverExecution` and `reportProtocolFailure`
    read it, and none of these files calls them.
  - `recordingDriver` adds grant recording and `isSafeToReplace`, which only takeover reads.
  - The one iterator-pollution window in `creation` and the one in `ingress` both use callers built
    before pollution.

  Reviews apply only to literal titles.

## Figures against design 05

| Figure | Design 05 (§5.1, §2.3) | At C | Note |
|---|---:|---:|---|
| Test-file origins | 71 | 71 | 53 paths; 52 pinned at `66bc0411`, 19 at `9fd2faa7` |
| Registrations | 1,466 (1,399 literal, 57 template, 10 computed) | 1,466 (same split) | |
| Identical origins / distinct registrations | 63 / 900 | 63 / 900 | |
| Changed or moved origins / registrations | 8 / 372 | 8 / 372 | |
| Span-identical among them | 329 | 329 | 43 not |
| Kept by the prefix rule | 47 (`ingress` 33, `nondisclosure` 14) | **33** (`ingress`) | A10 fallback, below |
| Refused by the prefix rule | 282 | **296** | the same 14 |
| Identical members refused by a changed fixture read | 21 | 21 | `ambient-reads` 11, `control-commits` 10: `tests/fixtures` and `tests/fixtures/packet-tools` listings |
| Identical members labelled `repository_read_changed` | 251 | 251 | 272 distinct members read changed data; the 21 above are refused |
| Helper closure | unchanged for 59; `harness.ts` only for 4 | same, plus `ingress` | five counted reviews, above |

**Why 47 became 33.** Design 05 kept `nondisclosure`'s 14 members because "the import keeps its
module request; insertions follow every member". That holds only under the A10 order model. On
v26.10.0 A10 fails ([node-floor-07](node-floor-07.md)), and rule 1 then makes every leaf earlier. The
113 inserted lines therefore enter each member's prefix. They reference `submissionFor`, a name the
changed import adds, so every member records `referenced: submissionFor (current line 35)`. This is
the rule as written, applied with the recorded floor result; it is not an adaptation. If A10 held,
the 14 would be kept again: the fixture `change-after-member` shows the difference with and without
the fallback.

## Members after register and reviews

The table has one record per distinct pinned registration (path, line, column and blob), with
origins merged. That gives **1,272 members**:

| Status | Members | Notes |
|---|---:|---|
| preserved | 810 | 784 whole file, 26 prefix-inert (`ingress`); 89 helper-reviewed; 89 `production_changed`; 251 `repository_read_changed`; 46 matched the register as `not_held` |
| held | 62 | witness records for K1.1-correction-03 or BINDING-01; no credit |
| superseded | 74 | witness records; no credit |
| refused | 326 | to structured targets in step 8 |

These are distinct members, so they count more than the 140 register keys: one key at C can serve
two pinned versions of a file (for example `dispatch.test.ts` at both pins).

Register classification (140 keys; the matched claim and the classified claim can differ, with a
reason):

| Classification | Claim | Keys |
|---|---|---:|
| superseded | Proxy (accepting a Proxy or observing its traps; decision-01 §2) | 46 |
| held | V-D1 (refusal reads, diagnostics, unit bounds; decision-05, invalidation-02) | 28 |
| held | Proxy (refusal kept; code, location and order for K1.1-correction-03) | 10 |
| held | V-ENV (serializer window under environment pollution; invalidation-03) | 10 |
| held | re-prototyped-built-in (invalidation-01) | 1 |
| not_held | own `__proto__` data members, ordinary null-prototype objects, DEC-8 host-member reads, a caller-wrapping Proxy, a Driver failure reason, the poison catalog, commit-path pollution | 45 |

The D05-CHK-05 fixtures are in the register:
- `values.test.ts:1225` and `:1239`, and `creation.test.ts:742`, are superseded;
- the harness `revokedProxy` user `ingress.test.ts:819` is held.

A test pins these four keys.

## Ran and not run

**Ran**, Node v26.10.0, Python 3.13.5, macOS 26.6.2 arm64:
- Full census runs at clean local commits later squashed into this one, about 100 s each:
  - one before the helper reviews;
  - two after them, before and after the reason compaction;
  - one more stopped at the clean-tree check, because I edited a test file while it ran.

  Read digests and labels were identical across the three completed runs.
- Tooling tests: 330, OK in 166 s, including 15 new census tests and 22 new refusal tests.
- Registry census (188/188).
- The composed verify, at this commit's C (see the commit message).

**Not run:**
- Nothing historical ran; pinned files were parsed, never executed.
- Registry cases are not in the register yet (stated limit).
- Origins stay `pending` or `pending_revalidation`. Closure links start in step 8, and step 7
  (census kinds and mutants) comes next.
