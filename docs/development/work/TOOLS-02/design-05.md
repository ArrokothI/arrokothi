# Design 05 — TOOLS-02 range 1: the supported read matrix (refined claim)

- **Author:** Claude Code desktop session (`claude-opus-5-5`), the implementer, 2026-10-24 (America/New_York).
- **Inputs:**
  - [owner choice 04](owner-choice-04.md): the route under 006, a refined finishable claim;
  - [review 02](review-02.md): T2-R2-READ-01, T2-R2-PATTERN-01 and its root-cause note;
  - [brief 03](review-02/brief-03.md): its four questions.
- **Keeps:** design 02 §1 with D02-CHK-01's completion, design 02 §2 (T2-2), owner choices 01 and 03, and design 04's
  `tree` expansion and typed listings.
- **Replaces:** design 04's glob and cp refusal, its symlink assumption, and its §2 table.
- **Next:** a short Codex GPT-6 design check; no code before it.
- **Addendum:** §7 completes [design check 05](design-check-05.md)'s D05-CHK-1 to D05-CHK-3 and records its §6
  answers. §7 replaces §1's `covered` outcome and its bytes-family rows, §2's alias check, and §2's pin-side claim.

## 0. Defects confirmed

The implementer reproduced both findings on Node 26.10.0:
- recursive `readdirSync` and recursive `promises.readdir` return `link/seed.json` through a committed directory
  symlink, while recursive `opendirSync` does not. Design 04's claim that Node does not descend symlinks was untested
  and is false for `readdir`;
- `globSync([...])` is traced as `{path: null, argument: 'object'}`, and `compared_reads` drops it before
  `pattern_refusal` runs.

Review 02's root cause is the mechanism this design removes. Each row is reduced to a path and a kind, and a row that
does not fit is dropped silently instead of refused.

## 1. Mechanism: admission by an explicit matrix

**Admission.** One function, `admit(row, root)`, decides every traced row before anything else reads it. Each row
gets exactly one outcome:

| Outcome | Meaning |
|---|---|
| `read` | a represented repository read: `(path, kind)` with kind `bytes`, `listing`, `tree` or `exists` |
| `outside` | not a repository read: a path outside the repository, under `node_modules`, or in the static import closure |
| `covered` | a read through a descriptor or handle that a traced `open` produced |
| `refused` | anything else, with a reason |

**Default refuse.** The default is `refused`. A row reaches another outcome only through a matrix entry. A new
operation, argument form or option the matrix does not name is refused, not dropped. Any `refused` row refuses
preservation of its file, through the existing traced-run refusal. Its members carry the reason, as glob members do
today.

**The matrix:**

| Operation family (sync, callback and promise forms) | Argument | Options | Outcome |
|---|---|---|---|
| `readFile`, `open`, `createReadStream`, `openAsBlob` | path | any | `read` `bytes` |
| the same | descriptor or `FileHandle` | any | `covered` |
| `readdir` | path | `recursive` absent or false | `read` `listing` |
| `readdir` | path | `recursive` true | `read` `tree` |
| `opendir` | path | `recursive` absent or false | `read` `listing` |
| `opendir` | path | `recursive` true | `read` `tree` |
| `stat`, `lstat`, `statfs`, `exists`, `access`, `realpath` (and `.native`), `readlink` | path | any | `read` `exists` |
| `glob` | any | any | `refused`: the pattern's dependency identity is not represented |
| `cp` | path outside the repository | any | `outside` |
| `cp` | path in the repository, or any non-path source | any | `refused`: a copied tree's identity is not represented |
| any operation | any argument the row does not classify | any | `refused` |

**Argument forms.**
- A path is a string, a `file:` URL or a Buffer. The tracer already resolves these.
- The tracer gains an exact argument form for every other first argument: `fd` (a number), `filehandle` (an object
  with a numeric `fd` and a `close` function), `array`, `null`, or another `typeof` value.
- `covered` admits only `fd` and `filehandle`, and only for the bytes family. A descriptor reaches a repository file
  only through a traced `open`, whose own row is the `read`. Other descriptors (pipes, sockets) are not repository
  files.

## 2. Symlinks: refuse what the record cannot follow

**Aliased paths.** A `read` path inside the repository must resolve without passing through a symlink: its lexical
form (normalized, relative to the repository's real root) must equal its real path. Otherwise the row is `refused`
with the reason `the traced run read through a symlink in the repository: <path>`. This covers bytes, listings,
existence and `readlink` of a link alike. Today the census classifies an aliased read by its target, so a fixture
read through a link outside `tests` lost its fixture status. That case is refused as well.

**Recursive listings that cross a symlink** (owner choice 04):
- **At C:** a `tree` read whose root contains a symlink entry anywhere beneath it refuses its file, with the reason
  `a recursive listing crosses a symlink: <link>`. This holds for `readdir`, which descends the link, and for
  `opendir`, which does not, so one rule covers both without depending on either API's traversal.
- **At the pin:** `changed_reads` expands a `tree` read over the pin's and C's directories, as design 04 does. A
  symlink beneath the root at the pin adds the refusal reason `a recursive listing crosses a symlink at the pin:
  <link>` for that origin's members.

**Pin-side aliasing of other reads.** A path that is a symlink at the pin but not at C is caught by the
comparisons. Listings already carry entry types, and §3 gives existence reads the entry's mode. Bytes reads compare
blob IDs, so a link replaced by a file changes as well.

**Cycles and external targets** never arise. No link is followed: a crossing refuses, and an alias refuses.

## 3. Represented observation per kind

| Kind | Identity at C and at the pin |
|---|---|
| `bytes` | blob ID |
| `listing` | `[name, type]` entries (design 04) |
| `tree` | the implied listings of the root and of every subtree beneath it (design 04); a symlink beneath refuses |
| `exists` | for a file, its tree entry `(mode, blob ID)`; for a directory, `directory`; absent, `null` |

The `exists` row is the one identity change. `stat` returns size and mode, and `access` can test the executable
bit, so existence alone under-represents what a stat call observes. Mode and blob ID cover both, because git records
no times. A directory keeps a type-only identity, so D02-CHK-02's stability holds: discovering an unrelated
directory changes nothing, and a directory's contents never enter its existence identity.

## 4. Answers to brief 03

1. **Matrix and routing.** The finite matrix is in §1. The default is refusal, so an unrepresentable form cannot be
   dropped. The tool stays bounded: the traced operations are the fixed list in `read-trace.mjs`, and a new one is
   refused until the matrix names it.
2. **Actual entries at C and the pin.** Ordinary subtrees are expanded at C, and over pin ∪ C for the comparison.
   Aliases and crossings refuse instead of being represented, so no target is resolved and no cycle or external
   target can occur. Deletion and repeated edits keep design 04's controls. No API's traversal behavior is inferred:
   the crossing rule refuses for both `readdir` and `opendir`.
3. **Facts that survive capture.** The tracer records:
   - the operation;
   - the resolved path, or the exact argument form when there is no path;
   - `recursive` for listings.

   Admission runs on those raw rows before any filter, so a loss before refusal is impossible by construction.
   End-to-end controls drive the real tracer through the census (§5). The refusal predicate is no longer tested
   from a prebuilt row only.
4. **Follow-on changes:**
   - the tracer's argument forms;
   - `admit` replaces `compared_reads`' filters and `pattern_refusal`;
   - the `tree` crossing checks;
   - the `exists` identity;
   - README and design 04 corrections (the false symlink sentence);
   - the regenerated table.

   Before C, the self-check reports every status change. If a further member of a complete origin is refused, the
   implementer stops and asks the owner, as owner choice 04 states. The expected effect is small. The only symlinks
   are four under `.claude/skills`, and no test file globs or copies. The `exists` change can refuse members that
   stat a changed fixture file without reading it; the self-check names each one.

## 5. Controls and mutants

**End-to-end census controls**, through the real tracer:
- review 02's probe, ported:
  - a committed `tests/fixtures/link -> ../../data/target`;
  - sync-names and promise-typed recursive readers are refused at C with the crossing reason;
  - a symlink present only at the pin refuses that origin's members;
  - `tests/fixtures/direct.json` keeps its positive control on a symlink-free tree.
- a string glob, an array glob, and a callback- and promise-form glob are each refused. An array-glob member whose
  matched entry changes file→directory→file stays refused, never preserved.
- a fixture read through a symlink, both bytes and listing, is refused with the alias reason.
- a `cp` from a temporary directory to another stays preserved. A `cp` from a fixture directory is refused.
- a fixture file that a member only `stat`s changes content, and the member is refused for a changed fixture read.

**Unit controls:**
- `admit` on every matrix row, and on unknown operations and argument forms. The unknown ones are refused, with
  their reasons.
- every review 01 and design 04 control still passes.

**Mutants** (python-probe, unique anchors), each killed by a named control:
- `admit` returns `outside` for an unclassified row (the recurring mechanism);
- the alias check is skipped;
- the crossing check at C is skipped;
- the crossing check at the pin is skipped;
- `exists` identity drops the blob ID.

All eleven earlier read-form mutants are kept. Those whose anchors move get new unique anchors.

## 6. Questions for the design check

1. Is refusing every glob, rather than representing literal array entries, proportionate? I recommend refusal. No
   test file globs today, and representing patterns is the full redesign that owner choice 04 declined.
2. §3 strengthens `exists` to `(mode, blob ID)` for files. Is that inside range 1's correction, or should it be a
   stated bound? I recommend the stronger identity: a stat call observes size, and a bound would leave
   preservation credit that the record does not support.
3. Is `covered` for descriptors and handles sound under the tracer's declared bounds? Descriptors are not followed
   to their open across processes; children that drop `NODE_OPTIONS` are already unseen.

## 7. Addendum after design check 05

**§6 answers adopted:**
- every glob is refused, before any path or scope filter;
- file `exists` identity is `(Git mode, blob ID)` at C and at the pin, and directories stay type-only. This is
  Git-recorded content, type and executable-bit identity. It does not claim equality of complete `stat`, access
  or `statfs` results.
- `covered` is withdrawn (D05-CHK-1).

### 7.1 D05-CHK-1: effective input and options

**Capture.** For every wrapped call, the tracer records:
- the operation;
- the first argument's form: `path` (a string, `file:` URL or Buffer), `fd`, `filehandle`, `array`, `null`, or
  another `typeof` value;
- for a path, the original text and the call-time `process.cwd()` (§7.2);
- the second argument's form: `options`, `string`, `number`, `function` or `undefined`;
- for options, their sorted own keys and the `recursive` value.

**Admission.** Only a `path` first argument can be admitted. A descriptor, handle or any other form is `refused`:
its provenance is not established, and no descriptor tracker is built. A second argument is admitted only as this
table allows. Any other option key refuses the row, so `createReadStream`'s `fd` and `fs` overrides refuse:

| Operation | Second argument admitted | Option keys admitted |
|---|---|---|
| `readFile` | string (encoding), function, options | `encoding`, `flag`, `signal` |
| `open` | string or number (flags), function | none (options form refuses) |
| `createReadStream` | string (encoding), options | `encoding`, `flags`, `mode`, `autoClose`, `emitClose`, `start`, `end`, `highWaterMark`, `signal` |
| `openAsBlob` | options | `type` |
| `readdir` | string, function, options | `encoding`, `withFileTypes`, `recursive` |
| `opendir` | function, options | `encoding`, `bufferSize`, `recursive` |
| `stat`, `lstat` | function, options | `bigint`, `throwIfNoEntry` |
| `statfs` | function, options | `bigint` |
| `exists` | function | none |
| `access` | number (mode), function | none |
| `realpath`, `realpath.native`, `readlink` | string, function, options | `encoding` |
| `glob`, `cp` | any | refused (cp from outside the repository stays `outside`, §1) |

A missing second argument is always admitted. A third argument (a callback, or `open`'s mode) never selects input.

### 7.2 D05-CHK-2: walk the path before normalizing it

The tracer keeps the original path text and the call-time working directory, and stops being the only resolver.
Admission walks the path as the operating system does, one component at a time, on the pristine checkout at C:
- the walk starts at `/` for an absolute text, or at the recorded working directory otherwise, joined without
  normalization;
- `.` is skipped. `..` moves to the parent of the current physical location;
- a component that is a **tracked** symlink (Git mode `120000` at C) refuses the row with the reason `the traced run
  read through a symlink in the repository: <path>`. The walk stops; no target is followed;
- a component that is an untracked symlink, such as a system prefix like `/tmp` or a `node_modules` workspace link,
  is followed. Those are not repository entries, and the physical path they reach is classified as usual;
- a missing component ends the walk, and the rest is appended lexically. The call could not have traversed a link
  beyond a missing entry.

The walk runs before the outside-repository, `node_modules` and import-closure outcomes. An aliased repository path
therefore refuses instead of disappearing into one of them. `tests/fixtures/jump/../actual.txt` refuses at
`tests/fixtures/jump`, instead of being recorded as the decoy `tests/fixtures/actual.txt`.

Every consumer, `listed_directories` included, reads only admitted rows. Preload markers stay separate
trace-validity metadata.

### 7.3 D05-CHK-3: symlinks at the pin

`changed_reads` refuses, for an origin, any compared read whose path, or any ancestor of that path, is a tracked
symlink at the pin. This includes a listing's or recursive listing's root, with the reason `a read path or its
ancestor is a symlink at the pin: <path>`. Symlinks beneath a recursive listing's root keep §2's crossing reason.

Bytes identity stays the blob ID. The pin check covers the equal-blob case: a link `same -> target` at the pin,
replaced at C by a file whose content is `target`, has one blob ID in both trees. The pin check refuses it because
`same` was a symlink. No target is followed.

### 7.4 Additional controls and mutants

Real-tracer controls, each through the census or through the real preload:
- an inherited descriptor: a child process reads `readFileSync(0)` with stdin opened on a fixture. The `fd` row is
  refused;
- a stream with a decoy path plus `fd`: `createReadStream('tests/fixtures/actual.txt', {fd})`. The `fd` option
  refuses it;
- an ordinary path read: the positive control, preserved;
- the `jump/../actual.txt` fixture, with two successive edits of `data/actual.txt`. Each run is refused, never
  preserved with the decoy;
- the equal-blob link→file case at the pin. It is refused with the pin reason.

Mutants (python-probe, unique anchors):
- the option guard admits any key;
- admission uses the tracer's resolved path instead of the walk (premature normalization);
- the pin ancestor check is skipped.

§5's mutants stay, except that "`admit` returns `outside` for an unclassified row" now targets the default branch.
`exists` identity dropping the blob ID stays.

### 7.5 Corrections to current claims

- **Design 04:** an appended correction notes that its symlink sentence was false for `readdir`, and that design 05
  supersedes it.
- **README and the `tree_listings` docstring:** the same sentence goes, replaced by the matrix and refusal rules.
- **verification.json:** its preserve entry for design 04 moves to the commit that carries the correction.
