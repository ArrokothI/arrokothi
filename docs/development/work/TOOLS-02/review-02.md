# Independent review 02 — TOOLS-02 range 1

## Identity and scope

- **Reviewer:** this independent Codex desktop session, GPT-6 per session instructions; exact serving
  variant unavailable. Date: 2026-10-24 (America/New_York). The separate Claude Code implementer is
  identified in [implementation 02](implementation-02.md). No subagents or implementer acceptance used.
- **Owner instruction:** review T2-1 and T2-2 only on `claude/tools-02`, using the supplied B/C/H and
  implementation 02. T2-3, T2-4, design 03 on `claude/tools-02-design-03`, and T2-5 are excluded.
- **B:** `b5daf35aeee37305c1ee41bb626c97d26db94ab2`.
- **C:** `5ab098bd893e3d39f58851276926abea81e5a5d8`.
- **H:** `7791cda6b0b28324e608ca5483e97059b7398b55`.
- **Previous reviewed H:** `f2184fc60e0b766b36877784b56e66af5a9cfbb5`; [review 01](review-01.md),
  CHANGES REQUIRED, with open T2-R1-READ-01 and [correction brief 02](review-01/brief-02.md).
- **Contract at H:** [brief 01](brief-01.md) as amended by [owner choice 01](owner-choice-01.md).
  Range-1 design: [design 02](design-02.md), its inherited design-01 definitions, and
  [design check 02](design-check-02.md). Correction: [design 04](design-04.md). The supplied
  [owner choice 03](owner-choice-03.md) authorizes precisely the two reopened origins and their transfer.
  Release/prerequisite provenance remains [release 01](release-01.md) at B.
- **Policy:** 006/008/012 at B, unchanged through H. Architecture/front-door context: mental-model
  overview/reference and evidence mechanism; development README, baseline, roadmap, research reading
  map and 017. Ownership is repository evidence tooling; no Kernel, Runtime, Driver or deployment
  semantics change. No Layer-3 architecture amendment is required for these implementation corrections.
- **Access:** full local Git history, source and cumulative B..H plus correction diff; shell; GitHub
  Actions job logs and artifact. Initial checkout was clean at H on the requested branch, with remote
  `https://github.com/ArrokothI/arrokothi.git`. Advertised remote branch SHA was not independently
  rechecked; no push or integration claim is made. Review writes only this record and its evidence.
- **Candidate identity:** [candidate check](review-02/candidate.json) returned `facts_verified`.
  B→C→H and preserved paths pass. C..H contains exactly `007-work-packets.md`, `implementation-02.md`
  and `progress.md`; their prose was inspected and introduces no acceptance or successor release.

## Verification and evidence

Packet command at C:

```text
python3 -B scripts/packet_tools.py verify --revision 5ab098bd893e3d39f58851276926abea81e5a5d8 --spec docs/development/work/TOOLS-02/verification.json
```

Under 006's permission to cite Packet verify rather than repeat it, I independently inspected
[CI run 40132829525](https://github.com/ArrokothI/arrokothi/actions/runs/40132829525), job
`120988019356`, and downloaded artifact `12577512202`. The job's checkout/input log and the artifact's
`run.txt` both bind requested revision and HEAD to C, exit 0. `verify.json` independently names C and
`checks_passed`. The workflow event's different head SHA is not substituted for the tested payload.

The original [artifact ZIP](review-02/packet-verify-40132829525.zip) is retained byte-for-byte, SHA-256
`8a13330ca745b03eabcf7aadb683e6f002550d836ced26119dac85157ee5481f`, matching GitHub metadata and the
upload log. It contains `run.txt`, `summary.json`, `verify.json` and `verify.stderr.log`. Repository
review evidence retains it beyond the hosted 2027-01-22 expiry; later retirement follows the archive
policy. [Evidence manifest](review-02/evidence.json) records file digests and command identities.

**Inspected CI:** Linux x86_64, Node v26.10.0, npm 11.19.1, Python 3.13.16; all 18 checks passed.

| Check | Independently inspected raw result |
|---|---|
| Tool tests | 651 tests, exit 0, `OK` |
| Inventory / adoption corpus | `provenance_verified` / `revalidation_complete`; 1,549 origins, 415 members in the adoption summary, 23 preserved |
| Mutation registries | 130 registered mutants, 329 refusal mutants, 238 value-cost mutants killed; each `selected_cases_passed` |
| Range-1 mutants | All eleven read-form/directory cases have passing controls, reached sites and named assertion failures under mutation, exit 17; all seven new refusal ablations likewise discriminate their guards |
| Refusal census | 329 checks / 329 registered: 327 in the main tool, one in each evidence script |
| Repository / archive / examples | 4,412 / 4 / 18 tests; no failures, cancellations, skips or todos |
| Other composed checks | Coverage, oracle census, typecheck, kernel sweeps, value-cost dimensions and continuations, builder-docs and advisory area gate passed |

The verification profile preserves its predecessor's check set and excluded profiles. Relative to B's
predecessor profile, only minima increase (610→651 tool tests; 4,123→4,412 repository tests) and the
tool-test timeout increases from 600 to 1,200 seconds. Every pre-existing mutation/refusal registry
case remains unchanged; there are eleven and seven additions respectively. No removed assertion,
new skip or weakened test threshold was found in the cumulative diff.

**Independent local execution:** a separate `git clone --no-local` checked out at C, macOS arm64,
Node v26.10.0, Python 3.14.6. Dependencies were copied from the workspace, not freshly installed;
the maintained toolchain checks validate their pinned inputs. With `PYTHONPATH=tests/tooling`:

```text
python3 -B -m unittest test_read_form test_pristine_routes test_writer_census test_target_tools.ProbeAnchorTests
python3 -B tests/tooling/check-refusal-registry.py
```

The [targeted run](review-02/targeted-tests.log) passed **36 tests in 159.005 seconds**, exit 0, no
skips; the refusal census returned 329/329, exit 0. This includes the original recursive-listing
reproducer as maintained acceptance assertions, all cumulative read-form tests and the direct
guard-route tests. Full verify, full local tool tests and complete registries were not repeated
locally; the pinned CI raw observations supply those checks. No live-provider, large-memory timing,
Agent-quality, isolation or external E0–E6 claim is made.

The new [probe](review-02/probe-range1.py), run against the clean C checkout with Node 26.10.0, exits
0 and [records](review-02/probe-range1.json) both counterexamples below. Its exit means the failures
reproduced, not acceptance. It uses candidate fixture builders in disposable repositories, patches
only the fixture builder's pin setup to commit a symlink, and never patches candidate implementation.
Each measured revision is committed and pristine. The validation checkout remained clean afterwards.

## Independent obligation and interaction coverage

The coverage map was derived from the contract and design obligations before using implementation
02's explanations, then reconciled against its claims, source, tests and prior findings.

| Obligation / source | Distinguishing observation and forbidden result | Evidence / result |
|---|---|---|
| T2-1 unrelated additions; owner choice 01 | New tests in existing and new directories must leave the scanner record valid; enumerated non-fixture content changes remain represented by walk root | Maintained end-to-end census tests and partition mutants pass. Three read classes remain distinct per `(path, kind)`, with fixture walk roots included. **PASS for this sub-obligation.** |
| T2-1 identity at C; D02-CHK-01 | First and subsequent named/fixture edits must change the record, including a direct fixture walk-root listing | Source trace through capture → `compared_reads` → `read_form` → `origin_census` → `preserved_table`; maintained repeated-edit, duplicate-kind and direct-root controls pass. **PASS for the covered ordinary forms.** |
| D02-CHK-02 directory existence | Discovering an unrelated non-fixture directory must not become a fixture difference; pin-only directories retain the pin's kind | Both current/pin classification and retained identity inspected; unit and census controls pass. **PASS.** |
| T2-R1-READ-01 correction; brief 02 | Recursive fixture entries must affect identity and pin comparison, or unsupported modes must explicitly refuse | Ordinary nested additions, deletion and typed entry changes pass; union of pin/C directories is used for comparison. Symlink descendants are omitted and array glob calls disappear before refusal. **FAIL: T2-R2-READ-01 and T2-R2-PATTERN-01.** |
| T2-1 regeneration / owner choice 03 | No unauthorized hold, credit, target or origin-disposition change | All 1,272 records compared B..C and prior C..C. Seven `mcp-boundaries` members become refused; held 1,013 and superseded 1 remain; refused 228→235, preserved 30→23. Exactly the authorized two origins move to `pending_revalidation`; their legacy/closure data is unchanged. Transfer list digest and all seven member IDs match. **PASS for actual candidate-data scope.** |
| T2-2 declared operation routes; design 02 §2 | Untracked, ignored and Git-invisible entries must refuse before fixture work, including direct calls behind dispatch | CLI inventory/corpus/coverage/mutations/cases/regenerate; direct `corpus_format_2`, `preserved_census`, `regenerate`; requalification and loss-ledger scripts all inspected. Guards precede computation/writes. `verify` retains pre/post-step checks. Direct tests and ablations pass. **PASS.** |
| T2-2 write scope and bounded census; D02-CHK-03 | Regeneration may change only the preserved table; inner and evidence-script guards need their own discriminating tests | Canonical-manifest check plus one write of the replaced table; three fixture writers and thirteen scratch writers classified; all seven guard/canonical-form ablations inspected. **PASS within declared routes/vocabulary.** |
| T2-1 × T2-2 | Git identities and executed census must describe the same clean revision | Revision/HEAD, Git status and invisible-entry checks precede census and regeneration. New witnesses remain pristine, so dirty input cannot explain their unchanged records. **FAIL only through the two T2-1 findings.** |

The correction delta changes `reads` on 439 rows, fixture reasons on 418 rows (378 landing-zone,
30 import-scanner, 10 mcp-boundaries), and status on the seven named members. The remaining 21 digest
changes are the ambient-reads/control-commits rows gaining typed listing identities. No non-fixture
reason changes in this correction. Cumulative changes also remove the specified directory-existence
reasons from those 21 rows and add walk metadata; no unrelated manifest fields change. Owner choice
03 is honored without conducting range-4 triage or granting new credit.

Selected 012 methods: deterministic execution and distinguishing mutations; source-to-observation
tracing across producers/consumers; normative claim and example consistency; exact Git/CI identity and
administrative scope. Research reading-map sections on evidence tooling, validator testing and surviving
mutants were read as background; no third-party research claim is used as acceptance evidence.
Runtime races, provider fidelity, containment and release packaging are excluded because this range
changes none of them. The writer census remains a bounded vocabulary regression check, not proof
against arbitrary future writers; shell redirection, subprocess writes and third-party writers retain
their declared exclusions. `candidate` and `gate` retain their non-fixture roles.

## Declared search beyond the corpus

After inspecting the full pinned corpus/registry results and their raw observations, the added search
varied recursive-listing traversal through a committed relative directory symlink, one- and two-level
descendant additions, sync names versus promise typed entries, and an immediate-child positive control.
It also varied glob arguments from string to a one-element array and changed a same-name fixture
file→directory→file. Direct trace exploration covered array patterns in sync, callback and promise
forms; only sync glob has an end-to-end preservation counterexample in the retained probe. A direct
Node observation distinguished recursive `opendir` from `readdir` on the symlink; no universal shared
traversal behavior is inferred from their common trace kind.

No fuzzing, exhaustive filesystem-API search, symlink-cycle/external-target search or concurrent
filesystem mutation test is claimed. Native reads and children dropping `NODE_OPTIONS` remain declared
tracer limits. The findings use ordinary intercepted calls with tracked inputs; neither depends on
those exclusions. All accessible range-1 obligations were assessed after finding the failures.
T2-3, T2-4/design 03 and T2-5 are **DEFERRED from this review** by explicit owner scope; none is assessed.

## Findings

### T2-R2-READ-01 — P2: recursive fixture reads through symlinks retain stale preservation credit

**Location at H:** `scripts/packet_tools.py:2001–2006` (`tree_listings`), consumed by `read_form` and
`changed_reads`; dependent assertion in `tests/tooling/README.md:255–260` and design 04 §§1–2.
**Governing:** amended T2-1, brief 02's represented-identity-or-refusal requirement, D02-CHK-01's
identity of every fixture read, and TOOLS-01 design 05 §2.3 rule 5.

Commit `tests/fixtures/link -> ../../data/target`, with `data/target/seed.json`. Members recursively
list `tests/fixtures` using sync `readdirSync` and promise `readdir(..., {recursive:true,
withFileTypes:true})`; both start preserved. Add `data/target/one.json`, then
`data/target/deeper/two.json`, committing each stage. Node 26.10.0 returns the new entries through
`link/…` on both stages. Yet regeneration returns `table_current`, no changed members, and corpus
returns `revalidation_complete`; both original records and preservation credit remain unchanged.
Adding `tests/fixtures/direct.json` correctly returns `table_differs` for both members.

**Cause and impact:** `tree_listings` expands only Git entries with mode `040000` below the lexical
root. It omits the symlink's target listings, while Node's intercepted `readdir` calls do traverse
them. The design/code claim “Symlinked directories are not descended, as in Node's recursive listing”
is false on the pinned runtime. Capturing `recursive` therefore repairs ordinary subtrees but still
does not identify everything this fixture listing observes. This is stale evidence credit, not a
demonstrated Kernel defect. The earlier path-only model already lacked this information; design 04
retains that problem for aliases under an incorrect traversal assumption.

**Required outcome:** represent the dependencies actually traversed by each supported mode, at C and
at the pin, or explicitly refuse preservation when they cannot be represented. Preserve non-fixture
walk stability. Correct dependent documentation and carry the two successive changes, both entry
forms and the positive control into the maintained corpus with a distinguishing mutant. The owner
decision required below precedes another implementation round.

### T2-R2-PATTERN-01 — P2: array glob arguments bypass the promised refusal and lose typed fixture identity

**Location at H:** `tests/tooling/read-trace.mjs:20–24,33–36`; `scripts/packet_tools.py:2196–2202`
and `2108–2115`. **Governing:** amended T2-1 and design 04's explicit refusal of unrepresented glob
dependencies, also stated in `tests/tooling/README.md:258–260`.

A member calls `globSync(['tests/fixtures/entry'], {withFileTypes:true})` and asserts a nonempty
result. It starts **preserved**, while the identical member using a string argument is correctly
**refused**. Replace the tracked `entry` file with a directory containing a tracked file, then
replace it with a file again. The returned entry changes file→directory→file. On each pristine
commit the array member's record remains identical, regeneration says `table_current`, and corpus
says `revalidation_complete`.

**Cause and impact:** `pathText` accepts strings, URLs and buffers; a supported array pattern becomes
`{path:null, argument:'object'}`. `compared_reads` drops that row before `pattern_refusal` sees it.
The internal `lstat` calls for this exact-path glob are recorded only as existence, which remains
true across the type changes. They do not recover the omitted typed result. The string-pattern
control and the registry's prebuilt `(path, 'pattern')` unit input cannot detect this capture-to-refusal
gap. The new refusal mechanism therefore does not cover an ordinary input form of the API it wraps.

**Required outcome:** account for supported pattern argument forms at the capture/refusal boundary;
an unrepresentable repository pattern must not disappear into a preserved record. Test the real
tracer-to-census path for string and array patterns and repeated type changes, and bound the nearby
callback/promise forms explicitly. Preserve the existing string/copy refusals and add a mutation that
would reopen this loss before the refusal predicate.

Both findings are reviewer-found. Owner choice 03 is an owner-supplied disposition decision, not a
reviewer finding; there are no other owner-supplied supplemental findings.

## Prior finding disposition and root-cause note

**T2-R1-READ-01:** its original ordinary-directory reproducer is fixed, maintained and passing. The
broader represented-identity-or-refusal closure is **not complete**, carried here by T2-R2-READ-01 and
T2-R2-PATTERN-01. Prior T2-2 and D02-CHK-02/03 dispositions remain supported by this cumulative review.
Owner choice 01's amendment remains in force; no content hashing of enumerated non-fixture reads is
reintroduced. Owner choice 03's two transfers remain correctly applied.

**006 stop-and-redesign fires:** this is the second CHANGES REQUIRED in the read-identity subsystem
already corrected in this packet. No further patch round starts before the owner's choice.

- **Recurring mechanism:** an API call is compressed to a path and a coarse kind before establishing
  whether that representation covers the operation's inputs and observations. Git-tree reconstruction
  then substitutes assumptions for traversal behavior; unrepresentable argument shapes can disappear
  before the refusal boundary.
- **Why earlier passes missed it:** review 01 varied depth only in ordinary directories. The correction
  tests keep that directory shape and use string glob patterns; its unit refusal oracle starts after
  trace admission. The five new mutants weaken reconstruction/classification but never challenge the
  alias assumption or array argument admission. Green results therefore coexist with both failures.
- **Owner options:** redesign the bounded capture/identity/refusal interface with an explicit supported
  operation × argument × traversal matrix and a new design check; refine the finishable claim with
  explicit refusal of forms that cannot be represented; split the remaining traversal work with its
  claim held; or accept a precisely recorded limitation and amend the claims/credit accordingly.
  Refusing unsupported forms is simpler but can reduce preservation credit; faithfully representing
  aliases requires pin/current target resolution and cycle/external-target bounds. A limitation cannot
  leave the present universal identity/refusal prose or unsupported credit unchanged.

[Correction brief 03](review-02/brief-03.md) carries the findings and design questions, contingent on
that owner decision. No product patch or unilateral contract/limitation change is made by this review.

## Disposition and handoff

- **T2-1: FAIL** on T2-R2-READ-01 and T2-R2-PATTERN-01. Ordinary-depth correction and candidate-data
  migration pass, but supported observations still escape the record/refusal mechanism.
- **T2-2: PASS** within design 02's declared operations and writer vocabulary.
- **Transcription:** range 1 is CHANGES_REQUESTED; overall TOOLS-02 remains IN_PROGRESS for the remaining
  ranges. Integration of range 1 is not ready. Owner stop-and-redesign choice is required before another
  correction build, followed by the applicable design check, new C/H, verification and independent review.
- No acceptance, merge, hold release or successor release. No third-party source, dependency or service
  implementation was incorporated. This delivery is review documentation/evidence only; no commit or
  push of the delivery is claimed.

CHANGES REQUIRED — H `7791cda6b0b28324e608ca5483e97059b7398b55` — TOOLS-02 range 1 (T2-1, T2-2).
