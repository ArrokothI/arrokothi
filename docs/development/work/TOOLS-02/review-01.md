# Independent review 01 — TOOLS-02 range 1

## Identity and scope

- **Reviewer:** this independent Codex desktop session, GPT-6; exact serving variant unavailable.
  Review date: 2026-10-24 (America/New_York). The implementer was the separate Claude Code session
  recorded in [implementation 01](implementation-01.md). No subagent or implementer acceptance was used.
- **Owner instruction:** narrow independent acceptance review of T2-1 and T2-2 only on `claude/tools-02`.
  T2-3, T2-4, design 03 on `claude/tools-02-design-03`, and T2-5 are excluded.
- **B:** `b5daf35aeee37305c1ee41bb626c97d26db94ab2`.
- **C:** `a6ce515018c2bd59a930b20c762a339089bb0973`.
- **H:** `f2184fc60e0b766b36877784b56e66af5a9cfbb5`.
- **Contract:** [brief 01](brief-01.md), amended by [owner choice 01](owner-choice-01.md), at H.
  Design inputs: [design 01](design-01.md), [design 02](design-02.md), and the range-1 obligations in
  [design check 02](design-check-02.md), all at H. Earlier dispositions were checked in
  [design check 01](design-check-01.md). Release/prerequisite identity is [release 01](release-01.md) at B;
  owner choice 01 authorizes this range's separate review and early integration.
- **Policy baseline:** 006, 008 and 012 at B; unchanged through H. Architecture/front-door context:
  `mental-model/README.md`, reference index, evidence mechanism, development README, implemented baseline,
  roadmap and 017. This is repository evidence tooling; no Kernel, Runtime, Driver or deployment contract changes.
- **Access:** full local Git history, source, cumulative B..H diff, shell, and GitHub Actions job/artifact access.
  Initial checkout was clean on the requested branch at H; configured remote is
  `https://github.com/ArrokothI/arrokothi.git`. Remote push identity was not independently rechecked and is
  not claimed. This review creates documentation/evidence only; no candidate payload is changed.
- **Candidate check:** `candidate --payload C --head H --spec docs/development/work/TOOLS-02/verification.json`
  returned `facts_verified` ([output](review-01/candidate.json)). B→C→H ancestry and all preserved paths pass.
  C..H is exactly `007-work-packets.md`, `implementation-01.md`, and `progress.md`; their added prose was
  inspected and grants no acceptance or release. There is no previous implementation acceptance review.

## Verification and evidence identities

The packet verification command is:

```text
python3 -B scripts/packet_tools.py verify --revision a6ce515018c2bd59a930b20c762a339089bb0973 --spec docs/development/work/TOOLS-02/verification.json
```

Under 006's permission to cite Packet verify instead of repeating it, I independently inspected
[CI run 40064371529](https://github.com/ArrokothI/arrokothi/actions/runs/40064371529), job `120784407929`,
including its checkout/input log and downloaded raw artifact `12550686084`. The artifact's `run.txt`
binds both requested revision and checked-out HEAD to C, with exit 0; `verify.json` independently names C
and `checks_passed`. The workflow event's separate head SHA is not used as the payload identity.

The original ZIP is retained byte-for-byte as
[packet-verify-40064371529.zip](review-01/packet-verify-40064371529.zip), SHA-256
`462d470a420fd0f796d0a9073289fd178d0bc9ca200c894efc65de19fe972922`, matching GitHub's artifact metadata
and upload log. It contains `run.txt`, `summary.json`, `verify.json`, and `verify.stderr.log`.
`verify.json` SHA-256 is `61feea277ba4098742d51deb59bf9a51217f2a40f7d50c9a02351c281b6961fc`.
The repository review evidence retains these bytes beyond the hosted artifact's 2027-01-22 expiry;
future retirement follows the repository archive policy.

**Inspected CI results:** Linux x86_64, Node v26.10.0, npm 11.19.1, Python 3.13.16; all 18 checks passed.

| Check | Raw observation inspected |
|---|---|
| Tool tests | 639 pass, exit 0 |
| Inventory / maintained adoption corpus | `provenance_verified` / `revalidation_complete`; 1,549 origins, 415 members in the adoption summary, 30 preserved |
| Mutation registries | `mutations.json`: 125 killed; refusal guards: 329 killed; value-cost: 238 killed; each `selected_cases_passed` |
| New cases | All six read-form controls pass and reach their sites; each mutation fails its named assertion. All seven new refusal-registry controls pass and their ablations are killed, including direct inner-route calls and both evidence scripts |
| Refusal census | 329 checks / 329 registered: 327 in `packet_tools.py`, one in each evidence script |
| Repository / archive / examples | 4,412 / 4 / 18 tests; zero failures, cancellations, skips and todos |
| Remaining composed checks | Coverage, oracle census, typecheck, kernel sweeps, value-cost dimensions and continuations, builder-docs, advisory area gate all pass |

The verification profile retains its predecessor's check set, inputs, environment and excluded profiles.
Only test minima increase (610→639 tool tests; 4,123→4,412 repository tests), and the tool-test timeout
increases from 600 to 1,200 seconds. No prior registry case or assertion is removed or weakened.

**Independent local runs:** a separate `git clone --no-local` checked out at C, macOS arm64, Node v26.10.0,
Python 3.14.6. Installed dependencies were copied from the workspace; this was not a new `npm ci` run.
The maintained toolchain checks validate their pinned inputs. `python3 -B -m unittest discover -s
tests/tooling -p 'test_*.py'` passed all **639 tests in 569.330 seconds**, exit 0, no skips
([log](review-01/tool-tests.log)). `python3 -B tests/tooling/check-refusal-registry.py` independently
returned 329/329, exit 0. The 13 newly added registry cases were also rerun through the unmodified mutation
runner, filtering each registry's cases in memory to IDs absent at B and clearing its determinism sample:
six read-form mutants and seven refusal ablations killed, both `selected_cases_passed`, exit 0
([raw selected results](review-01/selected-mutants.json)). No registry file was edited. This selected run
is separate from the complete CI registries. The validation checkout remained clean at C afterwards.

The [review probe](review-01/probe-range1.py) exits 0 and
[records](review-01/probe-range1.json) six passing pristine-predicate controls, two reproduced missed
recursive fixture changes, and a detected immediate-child positive control. Exit 0 here means the
counterexample reproduced, not that T2-1 passed. Full composed verification and product suites were not
repeated locally; their pinned CI observations above supply that evidence. Live-provider and large-memory
profiles remain explicitly unexecuted. No Agent-quality, containment or external E0–E6 claim is made.
The retained evidence files and local command identities are listed in
[evidence manifest](review-01/evidence.json).

## Independent obligation and interaction coverage

| Obligation and source | Distinguishing input and required result | Evidence and disposition |
|---|---|---|
| T2-1 unrelated additions; owner amendment and D02-CHK-01 | Add a test in an existing directory and in a new directory; neither may invalidate a scanner solely by changing its enumeration | The end-to-end `ReadFormCensusTests` executes both additions and checks `revalidation_complete`; named-only and walk-root-as-named mutations are killed. **PASS for this sub-obligation.** |
| T2-1 read identity and D02-CHK-01 completion | Separate named reads, enumerated reads and walk-root listings per `(path, kind)`; named/fixture reads distinguish first and subsequent changes; a fixture walk root retains entry identity | Source trace through `compared_reads` → `read_form` → `origin_census` → `preserved_table`; maintained named-byte, enumerated-fixture, duplicate-kind and direct fixture-root tests pass. Recursive fixture listings violate the broader requirement: **FAIL, T2-R1-READ-01.** |
| D02-CHK-02 directory existence | Discover a non-fixture directory without adding a fixture refusal; directories under `tests/fixtures` remain fixture inputs; absent-at-C comparison uses the pin's directory kind | `changed_reads` applies the C/pin rule; `read_form` conservatively retains absent paths in its digest. Maintained directory and new-directory controls and the directory-rule mutant distinguish the correction. **PASS.** |
| T2-1 status/credit preservation; design 02 §1.3 | Regeneration must not silently alter holds, attribution, classifications or origin disposition | Independently compared every manifest field and all 1,272 member records B..C. Only `preserved` changes. Status counts remain held 1,013, refused 228, preserved 30, superseded 1. All rows gain/change `walks`/`reads`; 504 change `repository_read_changed`. Exactly 21 rows in `ambient-reads`/`control-commits` lose the two specified directory-existence reasons; all other fields/reasons agree. **PASS for candidate-data scope.** |
| T2-2 supported operation routes; design 02 §2.1 | Untracked, ignored and Git-invisible entries must be refused before fixture work on each declared route | Inspected CLI dispatch, direct `corpus_format_2`, `preserved_census`, `regenerate`, requalification and loss-ledger entry points; maintained `verify` retains pre/post-step checks. Guards precede computation/output writes. Route-specific tests and raw ablation observations distinguish outer and inner guards. **PASS.** |
| D02-CHK-03 guard registration | Inner guards must fail their own ablation; evidence-script guards must enter the registry census | Direct-call refusal tests avoid relying on dispatch; census now scans all three sources. Seven new ablations comprise six pristine checks and one canonical-manifest check. **PASS.** |
| T2-2 clean identity and write scope | Wrong HEAD, dirty tracked data and invisible entries refuse; allowed dependencies/metadata work; regeneration changes only the preserved table | New review controls pass for clean, wrong HEAD, staged/unstaged dirt, an empty untracked directory and allowed ignored entries. Source inspection plus end-to-end regeneration shows a single canonical-manifest write with only `preserved` replaced. The bounded writer census classifies three fixture writers and 13 scratch writers. **PASS within the declared route/vocabulary bound.** |
| T2-1 × T2-2 | Identities from C's Git tree must describe the clean tree executing the census | Census and regeneration entry guards bind the revision; synthetic counterexample stages are committed and pristine. Its false unchanged record therefore cannot be attributed to dirty inputs. **FAIL only through T2-R1-READ-01.** |

The writer census is a regression check over the declared API vocabulary, not a proof against arbitrary
future writers. Shell redirection, subprocess writes and third-party writers remain the explicit design
exclusions. I also inspected the actual write sites, rather than treating a file's guard-name match as
sufficient. `candidate` and `gate` retain their documented non-fixture roles. Register/target move repair
is not implemented or credited by this range's preserved-table writer.

Selected 012 methods: deterministic execution with positive/negative controls; mutation and guard
ablation; normative contract-to-producer/consumer tracing; exact Git/CI identity and administrative-scope
checks. The research reading map's evidence-tooling, validator-test and surviving-mutant sections were
read as background; no third-party research assertion substitutes for candidate evidence. Runtime races,
physical isolation, provider behavior and packaging are materially excluded because none is changed here.

## Declared search beyond the maintained corpus

After inspecting the complete pinned corpus/registry results, I varied fixture-listing depth and repetition:
an existing nested directory at the origin pin; two successive additions at one and two directory levels
below `tests/fixtures`; and an immediate-child addition as a positive control. The member uses the ordinary
`readdirSync(..., { recursive: true })` API and remains passing. A separate direct trace showed that this
call records only its root path. I also exercised the six pristine states listed above and checked the
full manifest delta and every newly registered mutation site. No fuzzing or exhaustive filesystem-API
search is claimed. Callback/promise recursive variants, symlink semantics and concurrent filesystem
mutation were not executed in this added search. They are not needed to establish the concrete failure.

All accessible range-1 obligations were assessed after finding the defect. T2-3, T2-4 and T2-5 remain
**DEFERRED from this review** by the owner's explicit scope and owner choice 01; no implementation,
design-03, register-reclassification or triage verdict is supplied.

## Finding

### T2-R1-READ-01 — P2: recursive fixture listings retain stale identity and preservation credit

**Location at H:** `scripts/packet_tools.py:2125–2126` (`read_identity`), calling `listing` at
`1985–1992`; upstream `tests/tooling/read-trace.mjs:26–33,43–45`. Governing requirement: amended T2-1's
“any fixture read,” design 02 §1.1/§1.2, and D02-CHK-01's fixture walk-root completion.

A member lists `tests/fixtures` with `{ recursive: true }` and asserts a nonempty result. The nested
directory already exists at the origin pin, and the member starts **preserved**. Add
`tests/fixtures/nested/one.json`, commit, then add `tests/fixtures/nested/deeper/two.json` and commit.
The actual returned entry list changes on both calls. On both pristine revisions, however, regeneration
returns `table_current` with no changed members; corpus returns `revalidation_complete`; the member's
record and `preserved` status remain identical. Adding `tests/fixtures/direct.json` correctly returns
`table_differs`, demonstrating that the probe reaches the intended listing boundary.

**Cause:** the trace retains the operation and first path argument but drops listing options. Every
listing identity then uses the immediate-child names of that path. Nested entries returned by the
intercepted recursive call are absent from that identity and from the pin comparison. `read_form` does
include the fixture walk root, but the identity it includes is incomplete. Fresh execution passing does
not discharge the separate requirement to invalidate preservation when a fixture input changes.

This is inherited from the accepted path-only trace/immediate-listing mechanism, both already present
at B; the new identity-at-C logic relies on it. The new recursive scanner test individually stats
descendants, while the direct fixture-root test uses a shallow listing. Neither exposes a recursive
listing-only member. The six mutants alter partition/digest inclusion, so all can be killed while this
input distinction remains untested. This is a concrete failure of the packet's current T2-1 claim,
not a demonstrated product defect or a request for a sound analyzer of arbitrary future code.

**Required outcome:** make the recorded identity and pin comparison account for the entries observed by
supported recursive fixture listings, or explicitly refuse a listing mode whose dependency identity
cannot be established. Preserve the approved stability of enumerated non-fixture walks and immediate
fixture-listing behavior. Address the trace/identity mechanism rather than adding a member-specific
exception. Add this reproducer to the maintained corpus with a distinguishing mutation and re-audit
the affected producers, pin comparisons, preserved records and documentation.

Reproduction: use the retained [probe](review-01/probe-range1.py) with Node 26.10.0 and a clean checkout
at C as its sole argument. It uses the candidate's fixture builder but does not patch candidate
implementation. The attached [observation](review-01/probe-range1.json) captures both additions and the
positive control. This is reviewer-found; there are no owner-supplied supplemental findings.

## Disposition and handoff

- **T2-1: FAIL** on T2-R1-READ-01. D02-CHK-01's explicitly requested partition, duplicate-kind and
  shallow fixture-root controls were implemented, but they do not close the amended criterion for
  recursive fixture reads.
- **T2-2: PASS** for design 02's supported routes and bounded writer vocabulary. D02-CHK-02's
  directory-existence correction and D02-CHK-03's implementation obligations pass as detailed above.
- D01-CHK-01's original semantic objection remains settled by owner choice 01. This finding does not
  reinstate content invalidation for enumerated non-fixture reads. Later-range design findings are
  outside this verdict.
- No additional blocking finding was found in the declared search. No new source, dependency, service
  or third-party material was incorporated. Only review documentation and reproducible evidence are added.
- 006's stop-and-redesign threshold does **not** fire: this is the first implementation review of range 1,
  with no earlier accepted H. The inherited cause and missed corpus dimension are recorded above so the
  correction can address the mechanism. [Correction brief 02](review-01/brief-02.md) supplies the next handoff.
- **Transcription:** range 1 is CHANGES_REQUESTED; the overall packet remains IN_PROGRESS for its remaining
  ranges. This candidate is not ready for range-1 integration. No hold is lifted, no merge is performed,
  and no successor is released. Obtain a corrected C/H, verification and fresh independent review.

CHANGES REQUIRED — H `f2184fc60e0b766b36877784b56e66af5a9cfbb5` — TOOLS-02 range 1 (T2-1, T2-2).
