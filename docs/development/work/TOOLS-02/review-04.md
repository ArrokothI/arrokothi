# Independent review 04 — TOOLS-02 range 1

## Identity and scope

- **Reviewer:** this independent Codex desktop session, based on GPT-6 per session instructions;
  exact serving variant unavailable. Date: 2026-10-25 (America/New_York, supplied client date).
  The implementer is the separate Claude Code session named in [implementation 04](implementation-04.md).
  No subagents were used.
- **Owner instruction:** bounded acceptance review of T2-1 and T2-2 on `claude/tools-02`, under
  [owner choice 05](owner-choice-05.md), with no new design check. T2-3, T2-4, design 03 on
  `claude/tools-02-design-03`, and T2-5 are outside this review.
- **B:** `b5daf35aeee37305c1ee41bb626c97d26db94ab2`.
- **C:** `5d0f1cc49eb9cb534ad2818a8f8d38253438418d`.
- **H:** `34ab91a5de23beb4997cdd2ae209a3b67aac50a0`.
- **Previous reviewed H:** `23d65ac332fdbd267b00d12d5b02e3b77ad8923e`, over C
  `311c30a35a4ca13ca6497bef316aab81a3de3a8e`. [Review 03](review-03.md) requested changes for
  T2-R3-PATH-01 and T2-R3-OPTIONS-01, with T2-R3-ADMIN-01 as P3. Owner choice 05 supplies
  the route after its stop-and-redesign decision.
- **Contract at H:** [brief 01](brief-01.md), amended by [owner choice 01](owner-choice-01.md);
  [owner choices 03](owner-choice-03.md), [04](owner-choice-04.md) and [05](owner-choice-05.md).
  Range-1 design: [design 02](design-02.md) §§1–2 and inherited definitions, completed by
  D02-CHK-01 in [design check 02](design-check-02.md); the retained parts of
  [design 04](design-04.md); and [design 05](design-05.md) §§1–8, including §7's completion
  of [design check 05](design-check-05.md). §8 is reviewed as the authorized implementation
  correction, not a new design check. Source digests are in the [evidence manifest](review-04/evidence.json).
- **Release/prerequisites:** [release 01](release-01.md) at B, following the recorded
  COORD-REFACTOR-01 integration `d17ea6d1` and TOOLS-01 acceptance/integration. Owner choice 01
  authorizes range 1's separate review and integration; it does not close the rest of TOOLS-02.
- **Policy baseline:** 006/008/012 at B, unchanged through H. Architecture/context consulted:
  mental-model overview/reference and evidence mechanism; development front door, implemented
  baseline, roadmap, 007, 017 and the evidence-tooling research reading map. Ownership is repository
  evidence tooling. No Kernel, Runtime/Driver or deployment semantics change, so no Layer-3 amendment
  is required.
- **Access:** full local Git source/history, cumulative B..H and correction delta, shell, GitHub
  Actions job metadata/logs and downloaded raw artifact. The initial checkout was clean at H on
  the requested branch; configured remote is `https://github.com/ArrokothI/arrokothi.git`.
  The advertised remote branch SHA was not rechecked. No push or integration claim is made.

The [candidate command](review-04/candidate.json) independently returned exit 0 / `facts_verified`
**under the recorded whitespace accommodation**. B→C→H, all 47 preserved paths, unchanged policy,
and the exact C..H administrative allowlist pass: `007-work-packets.md`, `implementation-04.md`,
and `progress.md`. Their changes report review readiness and verification, without self-acceptance
or a new release. [Identity checks](review-04/identity.json) also bind the cumulative data comparison.

Only `docs/development/work/TOOLS-02/design-04.md`, preserved at
`c10eb1491e438e93dffa5c193ad17482c91cb437`, is exempted from `git diff --check`. Its bytes remain
frozen. This does not claim that an unaccommodated whitespace check passes.

## Verification and evidence

Packet verification command at C:

```text
python3 -B scripts/packet_tools.py verify --revision 5d0f1cc49eb9cb534ad2818a8f8d38253438418d --spec docs/development/work/TOOLS-02/verification.json
```

Under 006's permission to cite Packet verify instead of repeating the full run, I independently
inspected [CI run 40181329943](https://github.com/ArrokothI/arrokothi/actions/runs/40181329943),
job `121132844879`, and artifact `12596745533`. The input/checkout log and artifact `run.txt`
both name C as the tested revision and HEAD, with exit 0. The workflow event head `cdc7a46b…`
is not substituted for that payload identity. `verify.json` names C and `checks_passed`.

The original [artifact ZIP](review-04/packet-verify-40181329943.zip) is retained byte-for-byte:
SHA-256 `ed26505a36c13ece5ebdc5591f39064ded29ce5e9c4ee1b8b3f95bb924dc0d79`, matching GitHub's
metadata and upload log. It contains `run.txt`, `summary.json`, `verify.json` and
`verify.stderr.log`. Repository review evidence retains it beyond the hosted 2027-01-23 expiry,
subject to the archive policy. [Metadata](review-04/ci-metadata.json), an independently extracted
[summary](review-04/ci-summary.json) and the evidence manifest identify the observations.

**Inspected CI:** Linux x86_64, Node v26.10.0, npm 11.19.1, Python 3.13.16; all 18 checks pass.

| Check | Independently inspected raw result |
|---|---|
| Tool tests | 671 tests, exit 0, `OK` |
| Inventory / adoption corpus | `provenance_verified` / `revalidation_complete`; 1,549 origins; 1,272 preserved-table members, 23 preserved |
| Mutation registries | 140 registered mutations, 330 refusal mutations and 238 value-cost mutations killed; all `selected_cases_passed` |
| Range-1 discriminating mutations | All 21 added read mutations and eight added refusal/canonical-form mutations have passing controls, reached sites and assertion failures at mutation exit 17; none is an execution error credited as a kill |
| Refusal census | 330 checks / 330 registered: 328 in the main tool and one in each evidence script |
| Repository / archive / examples | 4,412 / 4 / 18 tests; zero failures, cancellations, skips or todos |
| Other composed checks | Coverage, oracle census, typecheck, kernel sweeps, value-cost dimensions/continuations, builder-docs and advisory area gate pass |

The [selected mutation observations](review-04/selected-mutants.json) preserve the 29 distinguishing
control/mutation pairs. Rule P's mutant removes exact-spelling refusal; rule O's removes prototype
refusal. The named assertions fail with the sites reached. The accommodation's ablation likewise
fails the required preservation/reason control.

**Independent local rerun:** a separate `git clone --no-local` checked out at C, macOS arm64,
Node v26.10.0, Python 3.14.6. Dependencies were copied from the workspace, not freshly installed.
With the Node 26.10.0 bin directory first in PATH:

```text
PYTHONPATH=tests/tooling python3 -B -m unittest -v test_read_form test_pristine_routes test_writer_census test_target_tools.ProbeAnchorTests test_packet_tools.CandidateTests
python3 -B tests/tooling/check-refusal-registry.py
```

The [focused run](review-04/targeted-tests.txt) passed **72 tests in 333.432 seconds**, exit 0,
no skips. The [refusal census](review-04/refusal-census.json) returned 330/330. This reruns the
cumulative read corpus, real tracer-to-census controls, direct route guards, writer inventory,
mutant anchor checks and candidate checks. The validation checkout remained clean at C.

Full local verify, full local registries and the real-repository corpus were not repeated; their
pinned CI raw results were inspected before the supplementary search. The CI case-sensitive branch
and the local case-insensitive branch of the path controls both ran. Live-provider and
large-memory-timing profiles remain explicitly unexecuted; no external E0–E6, Agent-quality,
containment or publication result is inferred.

## Independent obligation and interaction coverage

The coverage map follows the amended criteria and owner decisions, reconciled with implementation 04,
the cumulative source/tests and prior reviews. PASS is within those stated bounds.

| Obligation / source | Distinguishing check and trace | Result |
|---|---|---|
| T2-1 / owner choice 01 / D02-CHK-01: stable unrelated additions, sensitive named/fixture reads | `read_form` partitions by `(path, kind)`; named and fixture identities include C, while other enumerated reads retain walk roots. Corpus tests distinguish additions in existing/new directories, enumerated non-fixture edits, duplicate kinds and two successive named/fixture changes. Partition and identity mutants discriminate these rules. | PASS |
| D02-CHK-02: directory discovery | Directory existence outside `fixtures` stays type-only/non-fixture; pin directory kind is used when absent at C. File content and mode remain represented. Directory and existence mutants plus maintained controls pass. | PASS |
| T2-R1-READ-01: recursive/typed listing identity | `tree_listings` expands at C for identity and pin ∪ C for comparison. Nested additions, a deeper addition, deletion of a pin-only subtree and file→directory changes invalidate the correct members; unrelated tests remain stable. | PASS |
| Owner choice 04 / design 05 §§1–7: represented or refused | Tracer rows enter `admit` before partitioning. Descriptors/handles, unknown forms/keys, glob forms and repository copies refuse; ordinary supported paths and outside copies have controls. Tracked in-profile aliases, recursive symlink crossings at C/pin, traversal before `..` and the equal-blob pin-link case are exercised. | PASS |
| Rule P / design 05 §8.1 | `walk_path` checks exact Git membership for existing repository components outside `node_modules` before its tracked-link check; refusal propagates through `admitted_reads` and `origin_census`. Real case-variant reads refuse through two edits. Extra checks cover a directory-case variant, a link-case variant, Unicode normalization and exact-spelling string/Buffer/URL/call-time-cwd controls. | PASS |
| Rule O / design 05 §8.2 | `read-trace.mjs` captures `Object.getPrototypeOf` and `Object.prototype` at load and records ordinary/null/other. `admit` refuses other or missing prototype metadata before scope exemptions for options-taking operations. Direct and shell-child inherited-fd witnesses refuse; own-fd refusal and ordinary/null encoding controls remain. | PASS |
| T2-2 / design 02 §2 / D02-CHK-03 | CLI inventory/corpus/coverage/mutations/cases/regenerate, direct corpus/census/regenerate, both evidence scripts and verify guards were traced. Untracked, ignored and Git-invisible entries are refused at the declared boundaries; inner guards have independently reached ablations. | PASS |
| T2-2 write scope / bounded writer census | Canonical-manifest precondition precedes the single write replacing `preserved`; other fields are retained. Three fixture writers and thirteen scratch writers remain classified. `candidate` and `gate` retain their non-fixture roles. Register/target move repair remains assigned to later ranges. | PASS |
| T2-1 × T2-2 | Census execution and Git identity use the same pristine revision; positive/negative synthetic stages are committed. Read refusals reach the member before credit, and the stored table must equal fresh recomputation. | PASS |
| Candidate accommodation / design 05 §8.3 | Nonempty reason and matching preservation entry are required. The actual exception is one literal path. Additional controls reject whitespace in a different file and edits to the exempted sealed file; the ordinary candidate command passes at C/H. | PASS |
| Owner choice 03 / measure-first / no unauthorized credit | Full manifest comparison and fresh CI census confirm the data scope below. No new status, reason or digest change occurs in round 4. | PASS |

Source trace locations at H: `scripts/packet_tools.py` — candidate at 303, regenerate at 875,
path/admission at 2141/2172, admission aggregation at 2210, pin refusal at 2231, read form and
comparison at 2284/2323, origin/census at 2721/2768, pristine/dispatch at 3635/3721;
`tests/tooling/read-trace.mjs` — captured intrinsic at 21, prototype classification at 52 and
row capture at 70. The shared guards and consumers, rather than test counts alone, support closure.

**Cumulative data and regression scope.** All 1,272 member identities remain. From B to C:
held 1,013 and superseded 1 are unchanged; refused 228→235 and preserved 30→23. Exactly the
seven `mcp-boundaries` members and two origins named by owner choice 03 change status/state.
The origins retain their other fields and are transferred to range 4; their list digest agrees.
No other non-table manifest change occurs beyond those transfers. From previous C to C,
the entire adoption manifest is byte-identical, corroborating implementation 04's measurement
result without pretending to have observed its earlier local dry-run chronology.

No B mutation/refusal case is removed or altered: 21 and eight are added respectively. Coverage
adds their declared values without dropping earlier dimensions. The current correction retains
the previous check set/timeouts and raises only the tool-test minimum, 664→671. Removed/replaced
code was examined: the old lossy read filtering is replaced by explicit admission, and the test
for following an untracked workspace link now places it under the permitted `node_modules` path.
No assertion removal, new skip or weakened result threshold was found.

Selected 012 methods: deterministic execution with distinguishing mutations; source-to-observation
tracing across capture, admission, partition, pin comparison, status and table validation; normative
consistency; and exact Git/CI/process identity. Research on evidence tooling, strict-validator tests
and surviving mutants was read as background; no prior-art assertion supplies acceptance evidence.
Kernel races, Runtime fidelity, isolation and packaging methods are excluded because the range
changes none of their contracts.

## Declared supplementary search and limits

After inspecting the pinned corpus/registry results, I ran two retained probes at C:

- [Prior witnesses](review-04/probe-regressions.py), adapted from review 03 with corrected refusal
  expectations; [output](review-04/probe-regressions.json). The direct production-helper options
  case, the original shell-opened inherited descriptor, and the alternate-case fixture reader all
  become refused. Two successive actual-input edits still return the new bytes, while their
  refused tables remain valid and earn no preservation credit. A stable already-refused table
  is expected. The own-fd control also refuses.
- [Bounded P/O and accommodation probe](review-04/probe-bounds.py);
  [output](review-04/probe-bounds.json). It records 92 real trace rows, checks 19 operation
  spellings with each of ordinary/null/other option prototypes, and separately checks missing/other
  prototype refusal before import-closure/outside exemptions for all ten options-taking matrix
  operations (40 admission checks). It checks file and directory case variants, a case-variant
  tracked link and NFC/NFD spellings on this host, plus eight exact-path positive rows including
  Buffer, file URL, `..` without a link and a changed working directory. Three candidate controls
  distinguish the recorded exception, unrelated whitespace and altered sealed bytes. All pass.

The search is bounded to the stated read matrix, these P/O shapes, the maintained recursion and
pin cases, and the declared fixture-writing routes. The mutation sites examined are the 29 added
registered sites; no additional source mutant was applied locally. No deliberately evasive
test-code search, arbitrary getters/Proxies/intrinsic replacement, invalid-byte path search,
filesystem race or Windows run is claimed. Forms built to evade the census beyond P and O remain
**017 L-18, not findings**. Reads outside the tracer's stated visibility and the writer census's
shell/subprocess/third-party exclusions remain limits. No new unsupported host-wide soundness
claim is made.

All accessible T2-1/T2-2 obligations and their interactions were assessed. T2-3, T2-4/design 03
and T2-5 are **DEFERRED from this review by explicit owner scope**, not passed or re-designed here.

## Findings, prior dispositions and handoff

**New findings: none.** No P0–P2 defect or additional P3 is raised within this gate. Owner choices
are governing decisions, not reviewer findings. No correction brief or new root-cause note is
required: review 03's stop-and-redesign route was supplied by owner choice 05 and its correction
passes this bounded review.

| Prior finding | Disposition and correction closure |
|---|---|
| T2-R3-PATH-01 | Closed under rule P. Exact-spelling refusal precedes classification/identity in the approved walk, propagates to member refusal, and passes the original repeated-edit case and exact-spelling controls. README, §8 and L-18 state the resulting scope. |
| T2-R3-OPTIONS-01 | Closed under rule O. Capture retains the prototype category; admission rejects inherited-prototype and missing-metadata rows across options-taking operations. Direct and shell-inherited-fd probes refuse, with ordinary/null and own-key controls. No general effective-object analyzer is claimed. |
| T2-R3-ADMIN-01 | Closed by the explicitly authorized accommodation, not by editing sealed design 04. Candidate output exposes the exception; its bytes remain preserved and other whitespace still fails. |
| T2-R1-READ-01, T2-R2-READ-01, T2-R2-PATTERN-01 | Remain closed by the cumulative recursive-listing, C/pin symlink and glob-first controls and distinguishing mutations. Prior dispositions were rechecked rather than treated as immunity. |

- **T2-1: PASS** under the amended criterion, supported matrix and owner choice 05's cooperative
  threat model. Its closing mechanisms, maintained corpus and declared search support acceptance.
- **T2-2: PASS** for design 02's declared operation routes and bounded writer vocabulary.
- **Transcription/status:** range 1 is accepted at the exact H below. Overall TOOLS-02 remains
  IN_PROGRESS for ranges 2–4. Range 1 may proceed to the normal owner cleanup/integration step;
  this review does not merge it, lift any hold or release a successor.
- Only this review and its evidence are written in the shared checkout. No implementation,
  historical report or ledger is edited; no commit/push is claimed. No third-party source,
  dependency or service implementation was incorporated. Probes are reviewer-authored or adapted
  from this repository's prior review evidence.

ACCEPT — H `34ab91a5de23beb4997cdd2ae209a3b67aac50a0` — TOOLS-02 range 1 (T2-1, T2-2).
