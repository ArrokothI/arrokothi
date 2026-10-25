# Independent review 03 — TOOLS-02 range 1

## Identity and scope

- **Reviewer:** this independent Codex desktop session, GPT-6 per session instructions; exact serving
  variant unavailable. Date: 2026-10-25 (America/New_York, supplied client date). The separate Claude Code
  implementer is identified in [implementation 03](implementation-03.md). No subagents were used.
- **Owner instruction:** review T2-1 and T2-2 only, on `claude/tools-02`. T2-3, T2-4, design 03 on
  `claude/tools-02-design-03`, and T2-5 are outside this review.
- **B:** `b5daf35aeee37305c1ee41bb626c97d26db94ab2`.
- **C:** `311c30a35a4ca13ca6497bef316aab81a3de3a8e`.
- **H:** `23d65ac332fdbd267b00d12d5b02e3b77ad8923e`.
- **Previous reviewed H:** `7791cda6b0b28324e608ca5483e97059b7398b55`, over C
  `5ab098bd893e3d39f58851276926abea81e5a5d8`. [Review 02](review-02.md) requested changes for
  T2-R2-READ-01 and T2-R2-PATTERN-01; [brief 03](review-02/brief-03.md) carries the correction.
  [Review 01](review-01.md) supplies the earlier T2-R1-READ-01 disposition.
- **Contract at H:** [brief 01](brief-01.md), amended by [owner choice 01](owner-choice-01.md), with
  [owner choice 04](owner-choice-04.md)'s refined finishable claim. Governing range-1 design is
  [design 02](design-02.md) §§1–2 and its inherited definitions, completed by
  [design check 02](design-check-02.md); [design 04](design-04.md), including its correction note;
  and [design 05](design-05.md), including §7's response to [design check 05](design-check-05.md).
  [Owner choice 03](owner-choice-03.md)'s two origin transfers remain in force.
- **Release/prerequisites:** [release 01](release-01.md) at B; its COORD-REFACTOR-01 integration and
  TOOLS-01 prerequisite provenance were checked. No successor release is inferred.
- **Policy baseline:** 006/008/012 at B, unchanged through H. Architecture and development context:
  mental-model overview/reference and evidence mechanism; development front door, implemented
  baseline, roadmap, 017 and the research reading map. This is repository evidence tooling, with no
  Kernel, Runtime/Driver or deployment semantic change and no required Layer-3 amendment.
- **Access:** full local Git history/source, cumulative B..H and correction delta, shell, GitHub
  Actions job logs and downloaded artifact. The initial checkout was clean at H on the requested
  branch, remote `https://github.com/ArrokothI/arrokothi.git`. Advertised remote branch SHA was not
  independently rechecked; no push or integration claim is made. Only this review and its evidence
  are written in the shared checkout.

**Candidate identity:** the ordinary `candidate --payload C --head H --spec
docs/development/work/TOOLS-02/verification.json` returned exit 2 / `invalid`, not `facts_verified`
([output](review-03/candidate.json)). Its `git diff --check B H` fails solely on the extra blank
line at `design-04.md:144`. Independent [identity checks](review-03/identity.json) establish B→C→H,
all 43 preserved paths, unchanged policy, and the exact C..H allowlist: `007-work-packets.md`,
`implementation-03.md`, `progress.md`. Their prose grants no acceptance or successor release.
The whitespace diagnostic is a non-blocking administrative observation, not the basis of the verdict;
account for it in the next handoff and do not claim the default candidate command passed.

## Verification and evidence

Packet command at C:

```text
python3 -B scripts/packet_tools.py verify --revision 311c30a35a4ca13ca6497bef316aab81a3de3a8e --spec docs/development/work/TOOLS-02/verification.json
```

Under 006's permission to cite Packet verify instead of repeating the full run, I independently
inspected [CI run 40162436361](https://github.com/ArrokothI/arrokothi/actions/runs/40162436361),
job `121076616516`, and artifact `12589830020`. The checkout/input log and artifact `run.txt`
both bind the tested revision and HEAD to C; exit 0. `verify.json` independently names C and
`checks_passed`. The workflow event's different head SHA is not treated as the tested payload.

The original [artifact ZIP](review-03/packet-verify-40162436361.zip) is retained byte-for-byte,
SHA-256 `ab2126a10836beeed3e99c5809bbbc05d9f6c105d05259ca220af75cecb4f0a1`, matching the GitHub
metadata and upload log. It contains `run.txt`, `summary.json`, `verify.json`, `verify.stderr.log`.
Repository review evidence retains it beyond the hosted 2027-01-23 expiry, subject to archive policy.
[Evidence manifest](review-03/evidence.json) records identities, commands and retained-file digests.

**Inspected CI:** Linux x86_64, Node v26.10.0, npm 11.19.1, Python 3.13.16; all 18 checks pass.

| Check | Raw observation independently inspected |
|---|---|
| Tool tests | 664 tests, exit 0, `OK` |
| Inventory / adoption corpus | `provenance_verified` / `revalidation_complete`; 1,549 origins; preserved table 1,272 members, 23 preserved |
| Mutation registries | 138 registered mutants, 329 refusal mutants, 238 value-cost mutants killed; each `selected_cases_passed` |
| Range-1 distinguishing mutants | All 19 read-form/directory/matrix cases have passing controls and reached sites; mutation exits 17 with the named assertion failing. All seven added refusal/canonical-form ablations likewise discriminate their guards |
| Refusal census | 329 checks / 329 registered: 327 in the main tool, one in each evidence script |
| Repository / archive / examples | 4,412 / 4 / 18 tests, with no failures, cancellations, skips or todos |
| Other composed checks | Coverage, oracle census, typecheck, kernel sweeps, value-cost dimensions and continuations, builder-docs and advisory area gate pass |

**Independent local rerun:** a separate `git clone --no-local` checked out at C, macOS arm64,
Node v26.10.0, Python 3.14.6. Dependencies were copied from the workspace, not freshly installed.
With the Node 26.10.0 bin directory first in PATH and `PYTHONPATH=tests/tooling`:

```text
python3 -B -m unittest test_read_form test_pristine_routes test_writer_census test_target_tools.ProbeAnchorTests
python3 -B tests/tooling/check-refusal-registry.py
```

The [targeted run](review-03/targeted-tests.txt) passed **49 tests in 242.475 seconds**, exit 0,
no skips. The refusal census independently returned 329/329, exit 0. This includes the cumulative
read corpus, real tracer-to-census regressions, direct inner-route refusals, writer census and mutant
anchor controls. The validation checkout remained clean at C. Full local verify and complete local
registries were not repeated: their pinned CI raw observations were inspected first, before the
additional search. Live-provider and large-memory-timing profiles remain explicitly unexecuted;
no Agent-quality, isolation, release-packaging or external E0–E6 result is claimed.

The correction retains the predecessor's check set, exclusions and timeouts; only its tool-test
minimum rises 651→664. Cumulatively, no B registry case is removed or changed: 19 mutation cases and
seven refusal cases are added. Inspection found no removed assertion, new skip or weakened threshold.
`python-probe.py` still rejects execution errors/skips/wrong counts and requires reached, uniquely
anchored mutants; changing its main guard permits import by the new anchor check without executing it.

## Independent obligation and interaction coverage

The map follows the scoped contract and governing decisions, reconciled with implementation 03,
the cumulative source/tests, CI observations and prior findings.

| Obligation / source | Distinguishing facts and forbidden result | Assessment |
|---|---|---|
| T2-1; owner choice 01; D02-CHK-01 | Unrelated tests in existing/new directories and enumerated non-fixture edits keep the record stable; named and every fixture read distinguish successive edits | Three classes remain distinct by `(path, kind)`; fixture walk-root identities and duplicate-kind handling are retained. Maintained controls and partition mutants pass. **PASS for exact-spelling ordinary paths; FAIL overall through PATH-01 below.** |
| D02-CHK-02 | Directory discovery outside `fixtures` must not create a fixture refusal; absent-at-C directories use pin kind in comparison | Current/pin classification, identity and tests inspected and passing. **PASS.** |
| T2-R1-READ-01; ordinary recursive listings | Nested additions/deletion and typed entry changes affect fixture identity; non-fixture walk stability remains | `tree_listings` expands at C for identity and pin ∪ C for comparison; the cumulative corpus and mutants distinguish both. **PASS.** |
| T2-R2-READ-01; owner choice 04 | Recursive symlink crossings at C or pin refuse, without assuming that readdir and opendir traverse identically | Tracked crossing checks, alias walk and pin ancestor check inspected; maintained sync/promise typed controls, normalization and equal-blob controls pass. **Original counterexample closed; host-path identity still incomplete under PATH-01.** |
| T2-R2-PATTERN-01 | Array/string/callback/promise globs reach refusal before path/scope filtering | `admit` tests glob first; all raw rows except explicit preload metadata enter admission. Real-tracer controls and the re-anchored pattern mutant pass. **PASS; prior finding closed.** |
| D05-CHK-1 / design 05 §7.1 | Effective input must be established; descriptor/handle and fd/fs overrides must refuse, including outside-path decoys | Explicit descriptors and own option keys refuse, but inherited effective options disappear before admission. **FAIL: OPTIONS-01.** |
| D05-CHK-2/3 | Preserve traversal before `..`; refuse relevant pin-side symlink even with equal blob IDs | Literal tracked aliases are checked before exemptions; pin checks cover path and ancestors. The specified witnesses pass. `walk_path` still equates supplied spelling with Git identity on a case-insensitive host. **Required witnesses pass; broader T2-1 closure fails under PATH-01.** |
| Git-recorded existence identity | File content/type/executable mode changes affect identity; directory contents do not enter type-only existence identity | `exists_identity` is used at C and pin; content/mode tests and blob-dropping mutant pass. README correctly disclaims full stat equivalence. **PASS.** |
| T2-1 regeneration / owner choice 03 | No unauthorized hold, credit, target or origin-disposition change | Every manifest field and member compared. This correction changes only 485 read digests; no status/reason changes. Cumulative scope matches the two authorized transfers and seven refused members. **PASS for actual candidate-data scope.** |
| T2-2 / design 02 §2 / D02-CHK-03 | Untracked, ignored and Git-invisible entries refuse every declared route before fixture work; inner guards are tested independently | CLI inventory/corpus/coverage/mutations/cases/regenerate, direct corpus/census/regenerate, both evidence scripts, and verify pre/post-step guards inspected. Direct controls and seven ablations pass. **PASS.** |
| T2-2 regeneration write scope and census | Only the preserved table may be written; declared writer vocabulary remains classified | Canonical-form precondition plus a single table replacement; three fixture writers and thirteen scratch writers classified. **PASS within the declared routes/vocabulary.** |
| T2-1 × T2-2 | Executed reads and Git identities must refer to the same clean revision | Revision/HEAD and entry guards work; all new reproduction stages are committed and pristine. Dirt does not explain their failures. **FAIL through T2-1 only.** |

The cumulative adoption delta has 1,272 unchanged member identities: held 1,013, superseded 1,
refused 228→235, preserved 30→23. Only the seven previously identified `mcp-boundaries` members
change status. Exactly the two owner-choice-03 origins move to `pending_revalidation`; retained
legacy/closure data and linked witnesses agree, and the transfer-list digest matches. All other
non-table manifest changes are those authorized transfers. In the correction from previous C to C,
only `preserved[*].reads` changes, on 485 rows. No range-4 triage or new credit is granted here.

Selected 012 methods: deterministic execution and distinguishing mutations, source-to-observation
tracing across capture/admission/partition/pin comparison/table validation, normative consistency,
and exact Git/CI identity. Evidence-tooling, validator-testing and surviving-mutant research sections
were read as background; no prior-art claim is acceptance evidence. Kernel races, native Driver
fidelity, containment and product packaging are excluded because this range changes none of them.
The writer census remains a bounded regression check, with its declared shell/subprocess/third-party
write exclusions; `candidate` and `gate` retain their non-fixture roles.

## Declared search beyond the corpus

After inspecting the CI corpus/registry results, the supplementary
[matrix probe](review-03/probe-matrix.py) exercised string, ASCII Buffer and file-URL arguments for
ordinary file reads, callback/promise readFile, sync/promise open, normal streams, openAsBlob,
stat/lstat/statfs/exists/access and realpath/native. Immediate and recursive readdir/opendir were
also exercised. [Output](review-03/probe-matrix.json): 51 traced rows across 18 operation spellings,
no refusals, and the expected bytes/existence/listing/tree outcomes.

The [counterexample probe](review-03/probe-range1.py), [output](review-03/probe-range1.json), varies
own versus inherited stream options, locally opened versus shell-inherited descriptors, a production
helper returning ordinary prototype-backed options, and exact versus alternate case of a fixture
filename. It performs two successive committed content edits, checks `pristine`, regeneration and
corpus results, and independently observes the bytes actually returned. The own-fd option and an
edit to the recorded decoy serve as positive refusal/invalidation controls. Exit 0 means these
counterexamples reproduced, not that acceptance passed. The path-case reproduction requires a
case-insensitive filesystem; that condition held on the review host. It is not claimed to reproduce
on CI's case-sensitive filesystem.

No exhaustive filesystem search, arbitrary option getters/Proxies, invalid-UTF-8 path search,
Unicode-normalization search, filesystem mutation race or Windows support test is claimed.
No additional source mutant was applied beyond the registered mutants inspected in CI; the retained
new inputs must become maintained corpus entries with distinguishing mutants in the correction.
All accessible in-range obligations were assessed after finding the defects. T2-3, T2-4/design 03
and T2-5 are **DEFERRED from this review by explicit owner scope**, not assessed here.

## Findings

### T2-R3-PATH-01 — P2: alternate path casing loses a real fixture dependency

**Location at H:** `scripts/packet_tools.py:2146–2155` (`walk_path`), consumed at `2187–2190` and by
`read_identity` / `changed_reads`. **Governing:** amended T2-1's identity of every named/fixture
read; owner choice 04's represented-or-refused boundary; design 05 §7.2; the existing POSIX host
profile in `tests/tooling/README.md` and TOOLS-01 contract F4.

On the case-insensitive macOS review filesystem, commit `tests/fixtures/input.txt`. A member reads
`readFileSync('tests/fixtures/INPUT.txt', 'utf8')` and asserts nonempty content. It starts
**preserved**. Change the tracked lowercase file twice, to `ACTUAL 2 longer` and
`ACTUAL 3 longer still`. Both reads return the new bytes. At each pristine revision regeneration
returns `table_current` with no changed members and corpus returns `revalidation_complete`.

The real trace and `admit` retain uppercase `INPUT.txt`. `lexists` recognizes that spelling on this
filesystem, but the successful ordinary-component branch keeps the supplied spelling. Git's tree
contains only lowercase `input.txt`, so both pin and C identities for the admitted path are `null`.
The file is represented as absent while Node reads it successfully. This is stale preservation
credit under an ordinary intercepted path read, not an untraced native call or a dirty-checkout case.

**Required outcome:** a successful supported filesystem spelling must bind to the correct tracked
entry or refuse preservation when that binding cannot be established. Apply the result to identity,
fixture classification, symlink checks and pin comparison before exemptions. A bounded refusal is
sufficient; do not introduce an unbounded filesystem emulator. Maintain exact-spelling positive
controls and this repeated-edit case on a host that exercises it, or explicitly validate/refuse an
unsupported host/path profile under an owner-approved claim. Do not silently assume POSIX means
case-sensitive. No registered limitation currently excludes this false identity claim.

### T2-R3-OPTIONS-01 — P2: inherited descriptor options bypass effective-input refusal

**Location at H:** `tests/tooling/read-trace.mjs:62`, consumed by
`scripts/packet_tools.py:2178–2190`. **Governing:** D05-CHK-1's effective-input requirement,
design 05 §7.1's withdrawal of `covered` and promised fd/fs refusal, owner choice 04 and T2-1.

Use a small unchanged production helper:

```js
export function streamOptions(fd) { return Object.create({ fd }); }
```

A member opens the fixture and calls `createReadStream('tests/fixtures/decoy.txt', streamOptions(fd))`.
The member is **preserved**, with no refusal reason. The intercepted stream row has `second:'options'`
and `keys:[]`; admission returns `('read', 'tests/fixtures/decoy.txt', 'bytes')`. Node 26.10.0 consumes
the inherited fd. The equivalent own-fd options are correctly refused by the maintained controls.
This uses an ordinary prototype-backed object, without getters, Proxy traps or intrinsic replacement.

A second retained witness starts a traced child with a fixture descriptor opened by its shell parent.
Its inherited-fd stream also records only the decoy. Two actual-input edits leave `table_current`
and `revalidation_complete`; editing the decoy invalidates the record. **That shell-child member is
held by the existing register**, so this witness demonstrates lost input/refusal, not earned
preservation credit. The direct helper witness separately establishes preservation despite the
explicitly unsupported effective option. Its locally traced open still records the actual file;
no stale-content credit is claimed for that direct variant.

**Cause:** `Object.keys` records only own enumerable keys, while this native stream operation also
consumes inherited enumerable options. Admission cannot reject an override that capture omitted.
The own-key-only schema in design 05 §7.1 is itself insufficient for D05-CHK-1; the defect is not
fixed by adding another key to the Python dictionary. The matrix's current fd/fs-refusal claim is
false, so this is a scoped contract defect rather than an optional hypothetical analyzer improvement.

**Required outcome:** establish or conservatively refuse effective dependency-selecting options
before admitting the path. A declared ordinary option-object profile with rejection of unsupported
shapes is adequate; no descriptor tracker or general object analyzer is required. Keep the own-fd,
inherited-fd, inherited-descriptor and normal-stream cases through the real tracer and admission;
include a mutant restoring the capture loss. Inspect the neighboring fs override and other admitted
option consumers under the same rule. Revise the design/README claim and reconcile actual census
status changes without changing holds or origin dispositions unilaterally.

### T2-R3-ADMIN-01 — P3: default candidate check stops on a trailing blank line

**Location at H:** `docs/development/work/TOOLS-02/design-04.md:144`.
**Source:** 006/008 candidate identity checking. The default candidate command exits 2 because
`git diff --check B H` reports a new blank line at EOF. The independently checked ancestry,
allowlist and 43 preservation entries pass. This whitespace issue changes no semantics and does
not drive CHANGES REQUIRED. Account for the diagnostic in the next handoff; any adjustment to
preserved evidence must be explicit, and the default command must not be described as passing.

Both P2 findings are reviewer-found. Owner choices 01/03/04 are owner decisions, not supplemental
review findings. No product defect or new claim about the out-of-range hold classifier is asserted.

## Prior dispositions and root cause

- **T2-R1-READ-01:** the original ordinary recursive-directory case is fixed and maintained.
- **T2-R2-READ-01:** the original tracked symlink crossing cases are fixed by explicit refusal at C
  and pin; the broader represented-or-refused obligation now fails on PATH-01.
- **T2-R2-PATTERN-01:** closed by glob-first admission and real-tracer string/array/callback/promise
  controls. No recurrence of the array-row drop was found.
- **D05-CHK-1:** only partially implemented; explicit fd/handle and own-option witnesses pass,
  but effective inherited options still escape. **D05-CHK-2/3's supplied witnesses pass**; that does
  not establish host-wide path identity. T2-2 remains supported by this cumulative review.

**006 stop-and-redesign fires again:** this is the third CHANGES REQUIRED and another failure in
the already-corrected read-identity subsystem. No further patch round starts before the owner's
next route decision.

The common mechanism is still admitting a lossy proxy for the effective input: own enumerable
keys stand for native option lookup, and lexical spelling stands for a filesystem/Git entry.
Default refusal in Python cannot recover distinctions already discarded, or detect an ordinary
spelling that it mistakenly regards as represented. Design 05 improves control flow, but its
capture and path-binding assumptions remain stronger than their evidence.

Earlier controls varied operation, argument type, recursion depth and literal symlinks, while
holding option ownership and filesystem spelling fixed. The new eight mutants weaken Python
admission/reconstruction after those facts have already been compressed; they cannot expose this
loss. The previous design check identified the effective-input obligation but did not establish
that an own-key schema fulfilled it. The absence of these shapes in the corpus and the unchecked
host assumption explain the green results.

Owner options remain 006's routes: refine the supported argument/option/host profile with explicit,
tested refusal; redesign capture and binding to represent the native inputs; split the remaining
claim with preservation held; or approve a precisely recorded limitation and amend the affected
claims/credit. Conservative shape/path refusal is smaller but may refuse more origins. Full
representation costs more platform and native-option semantics. A limitation cannot leave the
current universal representation/refusal prose or false preservation credit in place.

## Disposition and handoff

- **T2-1: FAIL**, on T2-R3-PATH-01 and T2-R3-OPTIONS-01. Prior concrete failures are corrected,
  but the refined closing mechanism is incomplete.
- **T2-2: PASS** within design 02's declared routes and bounded writer vocabulary.
- **Transcription:** range 1 is CHANGES_REQUESTED; overall TOOLS-02 stays IN_PROGRESS for the
  remaining ranges. Range-1 integration is not ready. [Brief 04](review-03/brief-04.md) carries the
  next correction, contingent on the new 006 owner route and applicable design check, then fresh
  C/H, verification and independent review.
- No acceptance, merge, hold release or successor release. No third-party source, dependency or
  service implementation was copied, adapted or added. The native runtime was inspected only to
  understand behavior; probe code is independently written repository review evidence. No commit
  or push of this delivery is claimed.

CHANGES REQUIRED — H `23d65ac332fdbd267b00d12d5b02e3b77ad8923e` — TOOLS-02 range 1 (T2-1, T2-2).
