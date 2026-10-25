# Design 04 — TOOLS-02 range 1 correction (T2-R1-READ-01)

- **Author:** Claude Code desktop session (`claude-opus-5-5`), the implementer, 2026-10-24 (America/New_York).
- **Inputs:**
  - [review 01](review-01.md), finding T2-R1-READ-01;
  - [brief 02](review-01/brief-02.md), its four questions;
  - [design 02](design-02.md) §1 with design check 02's D02-CHK-01 completion, which this design keeps.
- **Scope:** T2-1's read record only. T2-2 passed review 01 and does not change. Ranges 2–4 are untouched.

## 0. The defect, confirmed

The implementer reran review 01's probe on a clean clone at C `a6ce5150` and got the same result: both nested additions
leave `table_current` and `revalidation_complete`, and the direct child returns `table_differs`. Two causes combine:
- `read-trace.mjs` records the operation and its first argument only, so `{ recursive: true }` is lost;
- `listing()` returns a directory's immediate children, at C and at the pin.

The implementer traced each listing form under the tracer with Node 26.10.0. Each recursive form records only its root
path, in all of these calls:
- `readdirSync(p, { recursive: true })`;
- `promises.readdir(p, { recursive: true, withFileTypes: true })`;
- `readdir(p, cb)`.

`globSync('tests/**/*.json')` records the pattern itself as a path. That path is absent at every revision, so a glob over
fixtures never changes either.

Only `tests/fixtures` is a fixtures directory at C. Recursive listings in the suite today walk package sources and
`tests/conformance`. No test file calls `glob` or `cp`.

## 1. Mechanism (brief 02 Q1, Q2)

**Trace capture.** A listing row records `recursive: true` when the call's second argument is an options object with a
truthy `recursive`. This covers `readdir` and `opendir`, in their sync, callback and promise forms. A callback in
second position, or a string encoding there, is not recursive. Nothing else in the trace changes.

**Read kinds.** `read_kind` takes the row instead of the operation name:

| Row | Kind |
|---|---|
| `readdir` or `opendir`, not recursive | `listing`, as today |
| `readdir` or `opendir` with `recursive: true` | `tree` (new) |
| `glob`, `globSync`, `promises.glob` | `pattern` (new) |
| `cp`, `cpSync`, `promises.cp` (newly wrapped) | `pattern` |
| everything else | as today |

**Supported modes.** A `tree` read of directory D stands for the immediate listing of D and of every directory beneath
D. In the git tree, beneath means subtrees, not symlinks, which matches Node's recursive listing. Each implied listing is
an ordinary `listing` read, so the existing classes apply unchanged:
- D is a walk root, or is enumerated under a listed ancestor;
- each implied listing is enumerated under its outermost listed ancestor;
- an implied listing under `tests/…/fixtures` is a fixture read. Its identity at C enters the record, as D02-CHK-01
  requires for every fixture read;
- every other implied listing is recorded by its root only, so unrelated additions stay stable, as owner choice 01
  requires.

**Explicit refusal.** A `pattern` read inside the repository has no represented dependency identity. The traced file is
refused with the reason `the traced run read through a pattern or copy whose dependency identity is not represented:
<path>`. Its members are therefore refused, never preserved. This is the review's "explicitly refuse a listing mode"
route. It is finishable because the set of wrapped operations is fixed.

**Entry form.** `listing()` returns `[name, type]` pairs instead of names, with type `directory`, `symlink`,
`submodule` or `file` taken from the tree mode. This is what `withFileTypes` returns. A same-name change between file
and directory under an immediate fixture listing now changes its identity, so no stated bound is needed.

**Through the census** (brief 02 Q2):

| Stage | Change |
|---|---|
| Capture | `recursive` flag on listing rows; `cp` wrapped |
| `compared_reads` | keeps `(path, kind)` with the new kinds |
| `read_form` (record at C) | expands each `tree` read over C's directories, then classifies as above; `checked` carries `(D, 'tree')` itself |
| `changed_reads` (pin comparison) | expands `(D, 'tree')` over the union of the pin's and C's directories, and reports only implied listings that are fixture reads. Pin-only directories therefore count: deleting a fixture subtree under a recursive `tests` listing changes a read. |
| Refusal reasons | unchanged text, `changed test fixture read: <paths>`, naming each changed implied listing |
| Aggregation and `regenerate` | unchanged; the regenerated table carries the new identities |

The record expands over C only. A directory that exists only at the pin shows up through its parent's changed entries
when that parent is a fixture listing, and through the pin comparison otherwise.

## 2. Nearby forms and bounds (brief 02 Q3)

| Form | Disposition | Control |
|---|---|---|
| `readdirSync` / callback / `promises.readdir`, recursive | `tree` | tracer rows for each form; census controls |
| `opendir` / `opendirSync` / `promises.opendir`, recursive | `tree` | tracer row |
| Callback without options, encoding string, `withFileTypes` alone | `listing` | tracer rows |
| `withFileTypes` entry type | identity includes type | same-name file→directory under a fixture listing invalidates |
| `glob` (all forms) | refused | a globbing member is refused with the reason |
| `cp` (all forms) | refused (newly wrapped) | a copying member is refused with the reason |
| Symlinked directories | not descended, as in Node | stated |

Unchanged bounds of the TOOLS-01 tracer: reads by processes that drop `NODE_OPTIONS`, by native code, and through the
module loader are unseen. The static import closure covers imports. This design neither widens nor narrows those bounds.

## 3. Accepted design (brief 02 Q4)

The trace and immediate listing come from TOOLS-01 design 05 §2.3 rule 5, which is accepted. Rule 5 compares a listing
by "directory entries", and a recursive call's entries include its descendants. So this correction makes the
implementation match rule 5's own wording and owner choice 01's "any fixture read". It narrows no criterion and adds no
credit. Its only status effect is fewer preserved members: those whose recursive fixture reads changed, and any member
that globs or copies inside the repository.

**No owner amendment is needed.** Under 006 this is a routine correction inside approved design 02, so it needs no new
design check unless the owner asks for one. The regenerate self-check reports every status change, by member and by
reason.

## 4. Controls and mutants

**Maintained controls:**
- the review probe, ported into `test_read_form.py`: an initially preserved member recursively lists `tests/fixtures`;
  `nested/one.json` and then `nested/deeper/two.json` each give `table_differs`, and the member is refused for a changed
  fixture read; `tests/fixtures/direct.json` is the immediate-child positive control;
- a recursive listing of `tests`: an unrelated test in an existing and in a new directory leaves `table_current` and
  `revalidation_complete`; a nested fixture addition invalidates; deleting a fixture subtree that existed at the pin
  invalidates;
- tracer rows for every form in §2;
- a globbing member and a copying member are each refused with the reason;
- a same-name file→directory change under an immediate fixture listing invalidates;
- every existing D02-CHK-01/02 control, D02-CHK-03 guard ablation and registry.

**Mutants** (python-probe, unique anchors), each killed by a named control:
- `read_kind` ignores `recursive`;
- `read_form` stops expanding `tree`;
- `changed_reads` expands over C only;
- `pattern` reads are not refused;
- `listing()` drops entry types.

## 5. Volume

At C the build regenerates the table and reports every status change. None is expected, because no test file recursively
lists a fixtures directory, globs or copies; helpers reached at run time are found only by the census itself. The `reads`
digest changes for every row whose record holds a fixture listing, because listing identities gain entry types. That
includes the 21 `ambient-reads` and `control-commits` rows, which list `tests/fixtures` during repository walks.

## 6. Correction (2026-10-24, after review 02)

§1's sentence "In the git tree, beneath means subtrees, not symlinks, which matches Node's recursive listing" and
§2's row "Symlinked directories | not descended, as in Node" are false for `readdir`. On Node 26.10.0, recursive
`readdirSync` and `promises.readdir` descend a symlinked directory, while recursive `opendir` does not. The
implementer did not test it. [Review 02](review-02.md)'s T2-R2-READ-01 found it, with T2-R2-PATTERN-01 (array glob
arguments escaped §1's refusal).

[Design 05](design-05.md), under [owner choice 04](owner-choice-04.md), supersedes both statements and §1's glob and
cp refusal. A recursive listing that crosses a symlink refuses its file. Every traced row is admitted by an explicit
matrix, refusing by default. The rest of this design stands.

