# TOOLS-02 — design check 05

**Verdict: APPROVED WITH REQUIRED CHANGES (D05-CHK-1 through D05-CHK-3).**

Reviewer: independent Codex session, GPT-6 per session instructions; exact serving variant unavailable.
Date: 2026-10-24 (America/New_York). Checked local branch `claude/tools-02` at
`286ef01f778e6dcf0e5c33bece1bf8da8190e20d`; the initial checkout was clean.

Scope: [design 05](design-05.md) under [owner choice 04](owner-choice-04.md), T2-1/T2-2 only.
Inputs checked: [review 02](review-02.md), including both findings and its root-cause note;
[brief 03](review-02/brief-03.md), questions 1–4; [design 04](design-04.md);
[design 02](design-02.md) §§1–2 with the applicable [design check 02](design-check-02.md) findings;
and current [packet_tools.py](../../../../scripts/packet_tools.py) and
[read-trace.mjs](../../../../tests/tooling/read-trace.mjs). Architecture/development front doors,
the evidence owner, 006/012 and the research reading map supplied context. This is repository
evidence tooling; no Kernel, Runtime/Driver or deployment contract changes.

Owner choices 01/03 remain settled. Ranges 2–4 are **DEFERRED by the requested scope**, not reviewed.
This approves a design route subject to the completions below, not implementation acceptance,
origin disposition, integration or release.

## Answers to design 05 §6

1. **Yes: refuse every glob.** This is proportionate to owner choice 04's refined claim. Refusal
   must precede path/scope filtering, including arrays and callback/promise forms. An exact-looking
   pattern does not require a second pattern interpreter. Keep the real tracer-to-census controls
   and repeated file→directory→file case.
2. **Yes: strengthen file `exists` identity within Range 1.** Use `(Git mode, blob ID)` consistently
   in both the C record and pin comparison. Keep directory identity type-only and preserve
   D02-CHK-02's controls. Describe this as Git-recorded content/type/executable-bit identity:
   it does not establish equality of complete `stat`, access-permission or `statfs` results.
   Git's omission of timestamps is not proof that an API cannot observe them. This check grants
   no broader metadata-equivalence claim or new accepted limitation.
3. **No: `covered` is not sound as written.** Argument shape is not provenance, and dependency-
   selecting options are missing from the trace. D05-CHK-1 gives the bounded correction; refusing
   unproven forms is sufficient and needs no cross-process descriptor tracker.

## Required changes

### D05-CHK-1 — establish the effective input before assigning `covered` or `read`

Design 05 §1, lines 46–64, assumes every repository descriptor came from a traced `open`.
The tracer records neither the descriptor returned by `open` nor an association with a later read.
A numeric `fd`, or an object with `fd`/`close`, cannot establish the proposed `covered` outcome.

**Observed on Node v26.10.0:** launch a preloaded Node process with stdin opened by Python on
`tests/fixtures/input.txt`, containing `FD INPUT`. `fs.readFileSync(0, 'utf8')` returns `FD INPUT`
and records only `{operation:'readFileSync', path:null, argument:'fd'}`. The read is intercepted;
the process did not drop `NODE_OPTIONS`.

With the same stdin, `fs.createReadStream('tests/fixtures/actual.txt', {fd:0, autoClose:false})`
also yields `FD INPUT`, but records only the decoy path. The current wrapper loses `options.fd`
before admission. Node documents that `fd` replaces the path and that `options.fs` can replace
the stream's filesystem implementation ([Node 26.10.0](https://nodejs.org/download/release/v26.10.0/docs/api/fs.html#fscreatereadstreampath-options)).

**Required:** specify operation-specific effective-input/option admission, including descriptor
and filesystem overrides. Either retain evidence linking a descriptor/handle to a successfully
traced input, or refuse it; unknown provenance must not mean `covered` or `outside`. Remove the
unconditional bytes-family `any` rule where options can select another input. Add real-tracer
controls for an inherited descriptor, a stream with a decoy path plus `fd`, and an ordinary path
positive control; distinguish the provenance/option guard with a mutant. A blanket refusal of
these unrepresented forms is an adequate bounded implementation.

### D05-CHK-2 — refuse symlink traversal before normalization erases it

Design 05 §2, lines 68–72, compares a normalized lexical path with its real path.
`read-trace.mjs:35` already calls `path.resolve`, so the proposed admission point is too late
for some paths. This is the same capture-before-admission loss identified in review 02.

**Observed fixture:** `tests/fixtures/jump -> ../../data/sub`, with `data/sub/seed` tracked;
`data/actual.txt` contains `REAL`, and `tests/fixtures/actual.txt` contains `DECOY`.
`fs.readFileSync('tests/fixtures/jump/../actual.txt', 'utf8')` returns `REAL`, but the trace names
`tests/fixtures/actual.txt`. That decoy's normalized and real paths are equal, so the proposed
check admits the wrong dependency. Editing `data/actual.txt` cannot change its identity.

**Required:** retain the original path and call-time base, or sufficient lossless traversal facts,
until the refusal decision. Check traversed components without first collapsing a symlink followed
by `..`, or explicitly refuse such unrepresentable forms. Apply this before outside-repository,
dependency-directory and import-closure exemptions; an aliased repository path cannot disappear
into one of those outcomes. Do not resolve cycles/targets merely to justify ignoring a row.
Add this fixture to the real tracer-to-census controls, with successive target edits and a mutant
that restores premature normalization. An ordinary symlink-only control does not distinguish it.

### D05-CHK-3 — blob identity alone does not detect a pin-side link replaced by a file

Design 05 §2, lines 82–84, is false for an ordinary Git object, without any hash collision.
At the pin, create `tests/fixtures/same -> target`, with sibling `target` containing
`TARGET CONTENT`. At C replace `same` with a regular file containing exactly `target`, no newline.

**Observed:** the read changes from `TARGET CONTENT` to `target`. `git ls-tree` reports modes
`120000` and `100644` respectively, but both entries have blob ID
`1de565933b05f74c75ff9a6520af5f9f8a5a2f1d`. C has no alias to refuse, and the current bytes branch
of `changed_reads` compares only those equal IDs.

**Required:** explicitly refuse a relevant pin-side symlink, or include the entry type/mode in
the comparison so this case cannot preserve credit. Specify checks for the path itself and its
ancestors, including a recursive listing's root, not only symlinks beneath that root. No target
following is necessary. Add the equal-blob link→file control and a distinguishing mutant;
changing `exists` identity alone does not repair a bytes-only read.

## Closure and build obligations

| Obligation | Design assessment |
|---|---|
| Brief 03 Q1/Q3; T2-R2-PATTERN-01 | **PASS for default refusal and blanket glob refusal; FAIL for complete admission as written**, completed by D05-CHK-1/2. All dependency consumers, including `listed_directories`, must use admitted reads. Preload markers remain explicitly distinguished trace-validity metadata. |
| Brief 03 Q2; T2-R2-READ-01 | **PASS for refusing recursive crossings at C and pin without assuming shared API traversal; FAIL for alias completeness**, completed by D05-CHK-2/3. Keep ordinary tree expansion over pin ∪ C, deletion and repeated-edit controls. |
| T2-1 cumulative; brief 03 Q4 | **PASS at design level** for retaining all three read classes, every fixture identity, owner choice 01's walk stability, existing eleven mutants, and reporting every manifest/status delta. An additional refused member of a complete origin still requires the owner disposition specified in choice 04. |
| T2-2 / design 02 §2 | **PASS at design level:** unchanged pristine guards, direct routes and regeneration write scope remain required. Keep D02-CHK-03's route tests, guard ablations and writer census. |

Complete these requirements in the design before building. Preserve earlier review evidence; correct
current README claims and append an explicit supersession/correction to design 04's false traversal
statement. The common cause is still discarding input semantics before proving representation;
moving the Python filter alone does not remove losses inside the JavaScript capture stage.

Validation: pinned-source inspection and the small reproductions above, using the actual unchanged
tracer in disposable repositories on macOS arm64, Node v26.10.0 and Python 3.14.6, exit 0. Node runs
used `NODE_OPTIONS=--import=<absolute read-trace.mjs>` and an absolute `ARROKOTHI_READ_TRACE`;
descriptor cases used `subprocess.run(..., stdin=<opened fixture>)`. The Git type-change probe
committed both trees and finished pristine. These are capture/identity observations, not a rerun
of a future design-05 census. No full verify, corpus or mutation run was performed for this short
design check. Local-link and diff checks cover this report. No implementation, fixture, status or
third-party source/dependency was changed or incorporated.
