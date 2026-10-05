# Independent review 02 — TOOLS-01 (reviewer 2 of 2: fidelity)

## Reviewer, session and access

- **Reviewer:** Claude Code desktop session (Code tab), model `claude-opus-5-5` (Opus 5.5), 2026-10-05.
  The owner's remit: check that the candidate did exactly what the owner decided, no more and no less,
  then make a smaller independent soundness pass. A separate GPT-6 reviewer covers tooling soundness in
  depth.
- **Independence.** This session wrote none of items 2–6, design 05, or owner choices 04, 06 and 07.
  Other sessions of the same model did, so assumptions may be correlated (006). This session started
  with an auto-loaded memory index that earlier Claude sessions in this repository wrote, including
  notes on TOOLS-01. I gave those notes no weight and re-derived every fact below from the repository.
  I read no owner or agent transcripts. I did not open the other review session's scratch files.
- **Access:** local clone of `ArrokothI/arrokothi` with a shell, full Git history and a working fetch
  of `origin`. macOS 26.6.2 arm64; Node v26.10.0 first in `PATH`; Python 3.13.5; git 2.39.5. Long
  runs used `caffeinate -i` under `perl -e 'alarm N; exec @ARGV'`.
- **Concurrent run, disclosed.** `verify` refuses unless HEAD is C, so at 17:20Z I detached the owner's
  checkout (`claude/tools-01-h`, clean) at C and started the composed verify there. At 17:22:48Z
  another session started its own `packet_tools.py verify` of the same C in the same checkout, from
  `/private/tmp/tools01-review1/`, presumably the GPT-6 review. Both runs overlapped through
  `tool-tests`, `inventory` and part of `adoption`. To avoid disturbing its timed steps, I stopped mine
  at 17:38Z (exit 143, no result recorded). The other run started while HEAD was detached at C by me;
  I do not know whether it relied on that. I left HEAD at C until its process exited at 18:40Z, then
  ran my own verify alone, with a watcher for any other `packet_tools` process. Whoever reads the
  other run's timings should know about the 15-minute overlap. See
  [Verification runs](#verification-runs).

## Candidate identity

| Role | Full SHA | Check |
|---|---|---|
| Base B | `f62527e8d564a6e2f63b83cbb52e24053f333540` | `main` after PR #44; the policy pin `b759d0ab…` is its ancestor |
| Payload C | `b104bab192f57c5ecf5b7eccebcfbda412a17b5d` | on the remote: parent of `origin/codex/tools-01` |
| Candidate H | `446dd25820500db4e0eb3d6940ec49e45634f39c` | C's direct child; **local only**, on `claude/tools-01-h` |
| Remote head | `fb410cb99519fbd922fcfcaeb872cb168caf4f9c` | `origin/codex/tools-01`; also C's child and also titled "candidate H"; it holds only the report |

- **H is not on the remote.** `git ls-remote` advertises `codex/tools-01` at `fb410cb9`. H replaced
  that published commit locally; its message says so ("This commit replaces fb410cb9, which held only
  the report and fails F1"). I reviewed H from the local object. See TOOLS01-R2-HANDOFF-01.
- **F1 on C/H:** `facts_verified`; administrative files exactly `007-work-packets.md` and
  `implementation-02.md`; `require_direct_parent` holds. **F1 on C/`fb410cb9`:** `invalid`, "C..H
  files differ". The two heads differ only in 007.
- **Policy:** 006, 008 and 012 are byte-identical at `b759d0ab…` and at H. I read them at the pin.
- **Contract:** revision 7 at H, equal to the revision committed at `0eee9b41`.

## Coverage map

I derived the map below from the owner's remit, the contract and owner choices 01–07, then read the
report. Each row closes by my own check; the attachments reproduce them.

| Obligation | Check | Result |
|---|---|---|
| Contract revisions 4–7 equal their owner choices' diffs | `git apply` of each embedded diff on the previous revision | 4, 6, 7 exact; 5 exact by its three textual substitutions; its diff is not an applicable patch (REC-02) |
| Approvals verbatim and attributable | Read each record and the commits that added the approval lines | Present for 04–07; notes in REC-02 |
| Nothing beyond the records changes scope, holds or claims | Owner records against the register, transferred table, contract and 007 | **One defect:** the V-ENV register classification (VENV-01) |
| 007 in H = choice 07's text + the report's two proposals | Rebuild H's 007 from 007 at C | Exact, modulo line wrapping; nothing else |
| 007 links resolve | 16 relative links added to 007 in B..H | All resolve |
| 007 authority chain | Owner choice 02 Q5, 04's last section, 06 and 07's 007 sections, the report | Covered; see below |
| The 44 transferred = choices 04 and 05, one for one, with cause | Transferred table at C against both records | Exact; 4 + 40, disjoint, each attributed; causes 21/17/2 as choice 05 states |
| 1,395 pending stay open and visible | Origin states at C; corpus and gate output | 1,395 `pending`; listed by `corpus`; counted by the gate |
| No in-scope revalidation origin open without a record | Origin states against the transferred table | `pending_revalidation` set = transferred set |
| Report figures recompute from adoption.json at C | Recount | 110 / 44 / 391 / 199 all recompute |
| No production, Layer-3 or sealed-record change in B..H | `git diff --name-status B H`; preserve list | None; five non-tooling files, all owner-authorized |
| AGENTS.md re-pin = choice 03's floor edit only | AGENTS.md at `3a5d78dd` against B and H | Exact |
| No dependency or third-party code | Lock diff; imports; license/provenance scan of 65 added code files | None |
| Gate: always runs, cannot be disabled, never fails, reports per area + `ungated` | Code, tests and a standalone run at C | Holds; report quotes the counts exactly |
| Gate derivation note reviewed (choice 04 §3) | gate-design-01 against `origin_areas` and `area_gate` | Matches; one latent quirk, no instance |
| 10 closed origins justified by bytes | Seeded sample over all six closure shapes | 10 of 10 |
| 10 of the 44 V-ENV-held entries justified by bytes | Seeded sample, 5 per group | 2 of 10; 8 observe no V-ENV claim (VENV-01) |

## 1. Owner records against the candidate

**Contract revisions.** [check_records.py](review-02/check_records.py) extracts each revision from the
commit that made it (`ea9bc7b4`, `f9b39b76`, `3cfda480`, `0eee9b41`) and each embedded diff from the
owner choice at H. `git apply` of choices 04, 06 and 07 on revisions 3, 5 and 6 reproduces revisions
4, 6 and 7 byte for byte. Choice 05's block uses bare `@@` lines with no line numbers, so `git apply`
reports "No valid patches in input". Applying its three substitutions to revision 4 reproduces
revision 5 byte for byte, with no other change. No other commit in B..H touches the contract.

**Approvals.**
- Choice 04: "yes", recorded as given in the Codex implementer chat. It was committed by that session
  (`ea9bc7b4`, "Owner reply: yes"), in a record the design author drafted. The 007 application
  section quotes two owner messages verbatim.
- Choice 05: the owner's two selected answers, verbatim. There is no separate approval of the
  contract diff, but the revision follows mechanically from the answers.
- Choices 06 and 07: "… as written in … (drafted by the design author, uncommitted in the working
  tree). I approve it as drafted." The implementer replaced the draft sentence with this approval
  (`3cfda480`, `0eee9b41`). The approved bytes were never committed before approval, so whether the
  committed record equals the approved draft rests on those commit messages. Choice 06 also records
  that the owner asked the design author to "Draft owner choice 06 and the reply for Claude". The
  approval wording may therefore have been drafted for the owner to send. The owner did send it, so
  it is attributable. See REC-02.

**Nothing beyond the records.** Holds, Kernel claims, Layer 3 and 002 are unchanged. Scope moves only
by choices 04–07. One change has no owner record. Item 2 (`4bd40b4f`) attributed 44 more register
entries to the V-ENV hold "by one rule, without per-test review (owner: refuse when unsure)". No
record quotes or locates that owner rule. It changed which tests BINDING-01 inherits, and it left
a 25th unbound member in an origin whose limit choice 04 states as "exactly the 24". See VENV-01.

## 2. The 007 edits in H

[check_records.py](review-02/check_records.py) rebuilds H's 007 from 007 at C. It applies choice
07's four items: the TOOLS-02 scope, which includes choice 05's edit; the TOOLS-02 section sentence;
the K1.1-correction-03 dependency wording; and the K1.4 dependency. It then inserts the report's
entry check after the 006/012 paragraph in "How to read a packet" and replaces the TOOLS-01 status
row with the report's text. The result equals H's 007 paragraph for paragraph, modulo line wrapping.
C..H changes no other 007 text.

Every 007 change in B..H traces to an owner record:

- the TOOLS-01 section and status row from release 01 (`3c91db1f`, `5eb27f98`);
- choice 04's four items, applied exactly in `b103e4b2`, on the owner's verbatim direction recorded
  in that choice's last section;
- H's edits above.

Authority for the design author's 007 edits comes from:

- choice 02 Q5 ("I authorize you to modified 007 for me");
- choice 04's application section;
- the 007 sections of choices 06 and 07; choice 07 supersedes 06's, which was never applied.

The entry check is the one 02 Q5 and 07 anticipate. No record names the status-row change. 006 lets
the coding agent enter WAITING_FOR_REVIEW, and the owner's review prompt lists the row as expected,
so I count it as authorized. All 16 relative links added to 007 in B..H resolve at H. Links inside
the records' quoted 007 text are written relative to 007, so they do not resolve from the records
themselves; this is cosmetic.

## 3. The scope split

- **Origins at C:** 1,549, equal in set and order to the revision-2 manifest at `0c1d57dd`. Its
  SHA-256 `02eb41f6…` matches `migration.source`. States: 1,395 `pending`, all with no legacy row;
  110 `complete`; 44 `pending_revalidation`. The 154 legacy rows (116 suite, 30 non-executable,
  8 case) keep their revision-2 status and rationale unchanged.
- **The 44:** the `transferred` table equals choice 04's four origins plus the forty in choice 05's
  `transferred-origins.json`. The two sets are disjoint and each row names its own decision. The 44
  are exactly the `pending_revalidation` origins.
- **Choice 05's cause counts:** 21 refused reference forms, 17 transitive traversals and 2 sweep
  runners. The 38 split 21 non-executable, 12 suite and 5 case, as Q1 states. The two runners are
  `sweep/preload.ts` and `sweep/run-poison-sweep.ts` at `66bc0411`, as Q2 states.
- **Report figures:**
  - 110 closures with 116 context ranges.
  - 391 suite targets with 391 behavior records.
  - 199 witnesses: 125 held and 74 superseded.
  - Preserved census 766 / 125 / 74 / 307.
  - Register: 226 entries, 65 of them cases.
  - 26 families with 415 members.

  All recompute from adoption.json at C.
- **Visibility:** `corpus` lists all 1,439 open origins (`pending_origins`) and the 664 `ungated`
  ones. The gate counts `ungated`.
- **Not in any record:** 25 refused members are unbound, not 24. The extra one is
  `packages/kernel/tests/dispatch.test.ts:1363:3@5a8d958ffdab`, "Promise independence: hostile
  ambient constructor/species slots change nothing", in owner-limited origin
  `artifact-73555fe668cc180905b1e49a`. Its replacement target sits on current leaf
  `dispatch.test.ts:1390:3`, which item 2's rule made `held` under V-ENV. The origin stays open in
  any case, so no closure is wrong. But choice 04 §1 states the remaining work as "exactly the 24".
  The transferred row cites choice 04's cause only, and implementation 02 does not mention the
  member. continuation-repair-03 line 48 does. Part of VENV-01.

## 4. Boundaries

`git diff --name-status B H` lists 181 paths:

- 113 added under `docs/development/work/TOOLS-01/`;
- 54 added under `tests/tooling/`;
- 7 added under `tests/fixtures/packet-tools/`;
- `scripts/packet_tools.py`, added;
- 007;
- five modified non-tooling files.

There are no changes under `packages/`, `mental-model/`, `.agents/skills/`, `docs/development/research`
or any other packet's work directory, and none to 006, 008, 009 or 012. This matches the preserve
list, which F1 enforces.

The five non-tooling files:
- `AGENTS.md`, `README.md`, the root `package.json` `engines` field and its lock entry are choice 03's
  floor edit. `AGENTS.md` changes only "Node 22.9+." to "Node 26.10+.".
- `package.json` also gained `test:packet-tools` and `verify:packet` at `3c91db1f`. These are scripts,
  not dependencies.
- `tests/conformance/effects/fast-slow-equivalence.test.ts` changed at `89b49e53`, under the owner's
  FLOOR-03-01 instruction recorded verbatim in node-floor-04. Design 05 §6's floor amendment kept the
  edit. The report cites choice 03 instead (REC-01).

**AGENTS.md re-pin.** AGENTS.md at `3a5d78dd` equals AGENTS.md at H. B→`3a5d78dd` differs only in the
floor line. The re-pin preserves exactly choice 03's edit and nothing else.

**Third-party code.** The lock file changes only the root `engines` entry. Python imports are standard
library and local modules only. A scan of the 65 added or changed code and fixture files finds no
license, copyright, SPDX, "adapted from" or vendoring markers.

## 5. The advisory gate

- **Always runs.** `verify` calls `area_gate` after every check, whatever the spec lists
  (`packet_tools.py:2940`).
- **Cannot be disabled.** `verify` refuses a spec without `candidate` (`:2899`), so no spec can skip
  the gate; `test_verify_refuses_a_spec_without_the_packet_verification` covers this.
- **Never fails.** The gate's entry is `passed: True` with `result: reported`. A raising gate would
  still fail `verify`. The only plausible raise, an uncovered path, cannot happen because the map ends
  with the catch-all `other: **`. Base ancestry and a version-2 adoption manifest are preconditions
  every packet meets.
- **Reports.** Open origins and `prose_pending` records per touched area, with counts and IDs; totals
  by state; the `ungated` count only, as choice 07 §2 says. `corpus` lists the `ungated` origins,
  which satisfies the contract's "counted and listed".
- **Rule 1** is `touches_area`: `docs/`, `mental-model/` and root Markdown files touch nothing.
  **Rule 2** is `derived: bool(names)`.

A standalone `gate` at C on TOOLS-01's own spec reports 181 changed paths, 65 behaviour-bearing, four
touched areas (`package.json` 47, `package-lock.json` 26, `tests/conformance/effects` 17,
`tooling` 10), 69 distinct origins (64 `pending`, 5 `pending_revalidation`), no `prose_pending` and
664 `ungated` ([gate-C.json](review-02/gate-C.json)). Implementation 02 quotes exactly these counts.

**gate-design-01** (choice 04 §3 makes it part of this review) matches `area_map`, `origin_areas` and
`area_gate`. One latent quirk: in `areas_of`, `under.get(name) or {area_of(name)} if name else
set(ids)` gives every area to a name that normalizes to empty, such as a link to the repository root.
That is the fallback choice 06 removed. At C no open origin gets every area
([gate_areas.py](review-02/gate_areas.py); histogram in the README). The inventory is fixed, so this
cannot fire for these origins. Noted, not a finding.

## 6. Soundness sample

[sample.json](review-02/sample.json) records the selection. Entries are ordered by SHA-256 of the
salt `review-02/claude-opus-5-5/2026-10-05` plus the key, so the selection is reproducible and
independent of any other reviewer's.

### Ten closed origins (all six closure shapes)

Facts are in [closed-facts.txt](review-02/closed-facts.txt), from [origin_facts.py](review-02/origin_facts.py).

| Origin | Shape | What I checked at C | Justified |
|---|---|---|---|
| `artifact-17b6d685…` `inventory-oracle.ts`, helper | 200 targets | All 200 bound targets in `kernel-landing-zone.test.ts`, which imports it. 18 of choice 04's 24 unbound members test this helper and `module-graph.ts`; the same 18 tests are preserved under the later-pinned origin `artifact-1e3d57f1…`, so the helper paths run at C. closure-01's limit applies: consumption, not path coverage. | Yes |
| `artifact-1f79bb84…` `module-graph.ts`, helper | 200 targets | As above | Yes |
| `artifact-a45b1c9d…` `inspection.test.ts` | 8 preserved + 3 witnesses | Closure is complete; all three witnesses are V-ENV. 178:3 is one of the 19 whose reason excludes value capture; 251:3 is "matched only" | Closure yes; two of the three held routings are VENV-01 |
| `artifact-6c57cc9d…` `creation.test.ts` | 24 preserved, 6 superseded, 7 held | Proxy routings follow decision-01. 883:3 is "matched only" V-ENV | Yes, except 883:3 is unreviewed |
| `artifact-ab4a0cce…` `boundary.test.ts` | 9 preserved | Byte-identical at pin and C (`742f2207…`); 9 tests at pin = 9 members | Yes |
| `artifact-7da32295…` `delivery-attribution.test.ts` | 4 preserved | Byte-identical (`da155431…`); 4 tests = 4 members | Yes |
| `artifact-21fb34d9…` `ambient-reads.test.ts` | 10 targets + 1 witness | 10 refused members, each with a bound exact-input target. 160:3 is "matched only" V-ENV | Yes, except 160:3 is unreviewed |
| `mention-8453525d…` K1.1 validation-16 MANIFEST:27 | non-executable `record` | Lines 18–37 at `9fd2faa7` are run provenance and a comparison statement; no input or mutation | Yes |
| `artifact-91a16df2…` K1.1-correction-01 contract:239 | non-executable `historical_command` | Line 239 opens a historical command list | Yes |
| `artifact-63378152…` `p-reprototyped-exotics.ts` | 10 cases | The 10 `capture.current.*` cases equal the probe's 10 literal recipes (type, arguments, prototype); held witnesses for K1.1-correction-03 under decision-01 | Yes |

### Ten of the 44 V-ENV-held entries

The 44 are the 21 new keys and 23 reclassified `not_held` entries that item 2 made `held` under
V-ENV ([venv_classification.py](review-02/venv_classification.py)). [venv_bodies.py](review-02/venv_bodies.py)
rebuilds each sampled register body with the candidate's own helpers and prints every recipe hit
([venv-bodies.txt](review-02/venv-bodies.txt)). I then read each test's assertions at C. The test
for "held" is invalidation-03's four claims:

1. the serializer window's output independence, refusal when setup fails, and restoration;
2. one snapshot, for bytes against retained content;
3. creation replay or conflict under the hop;
4. the value section's "ambient safety".

| Entry at C | Group | What the test does and asserts | Observes a V-ENV claim |
|---|---|---|---|
| `values.test.ts:1728:3` | new | A child process installs a non-configurable `Array.prototype[0]` accessor; asserts a located refusal, no wrong bytes, and the borrowed slots handed back | **Yes** (claim 1) |
| `values.test.ts:1498:3` | new | Pollutes the array iterator's `next`; asserts `too_many_bytes` is measured on the snapshot bytes | **Yes** (claims 1–2) |
| `dispatch.test.ts:806:3` | new | `polluteDescriptorFields` installs `Object.prototype.get`; asserts one bound read, the exact batch prefix, receipt and epoch | No: dispatch commit path |
| `dispatch.test.ts:1390:3` | new | Hostile `Promise[Symbol.species]`, `Promise.prototype.constructor`, `Object.prototype[Symbol.species]`; asserts receipt, redelivery, deliveries | No: Promise independence |
| `review-11-probes.test.ts:24:5` | new | Inherited `Object.prototype.resultingEpoch` during observation; asserts zero reads, no error, state `RUNNING` | No: DEC-8 inspection reads |
| `recovery-ambient.test.ts:271:5` | reclassified | Inherited `resultingEpoch`; asserts zero reads, history, holds, epochs | No: DEC-8 |
| `recovery-ambient.test.ts:293:3` | reclassified | Same helper; asserts the Outcome-end record owns no `resultingEpoch` | No: DEC-8 |
| `whole-view-ambient.test.ts:123:7` | reclassified | Inherited `resultingEpoch`; asserts both whole views equal the control | No: DEC-8 |
| `host-members.test.ts:166:3` | reclassified | `Object.prototype.isSafeToReplace`; asserts takeover refused as `unsafe_replacement` | No: DEC-8 host-member lookup |
| `dispatch.test.ts:958:3` | reclassified | Descriptor pollution plus an `Array.prototype` index trap; asserts the exact batch and that only the probe reached the setter | No: commit path |

Every recipe hit is real: each body writes a member of a built-in intrinsic, so the reason's
mechanical statement is true. Only two of the ten tests observe a V-ENV claim. The other eight test
DEC-8 own-member reads, host-member lookup, Promise independence or the commit path. Their reasons
do not claim otherwise; they say "Not reviewed per test, so held conservatively". All five
reclassified entries quote an earlier per-test reading that says they are "not value capture or its
serializer window". Across all 44, 19 reasons carry that exclusion. Three more `not_held` entries
with the same reading stay `not_held`, only because their bodies did not match the widened recipe.

## Verification runs

| Command (at clean C unless stated) | Result |
|---|---|
| `packet_tools.py candidate --payload C --head H --spec …/verification.json` | `facts_verified` |
| same with `--head fb410cb9…` | `invalid`: C..H files differ |
| `packet_tools.py gate --revision C --spec …/verification.json` | `reported`; counts above |
| `check_records.py <repo>` | all checks hold; choice 05's diff is not `git apply`-able (expected) |
| `packet_tools.py verify --revision C --spec …/checks.json` (first attempt) | stopped by me during `adoption` (concurrent run, see above); no result |
| `packet_tools.py verify --revision C --spec …/checks.json`, alone, 18:40:40–19:23:01Z | **`checks_passed`**, all 13 steps ([verify-C-summary.json](review-02/verify-C-summary.json)) |

The steps of the composed verify:
- `tool-tests`: 489 tests OK.
- `inventory`: `provenance_verified` (208 artifacts, 1,333 mentions, 8 additions).
- `adoption`: `revalidation_complete`, with states 110 / 44 / 1,395, the 44 transferred split 4 / 40
  by decision, 391 targets, 0 kills, and a register of 226 entries (65 cases).
- `dimensions`: `coverage_reported`.
- `registered-mutants`: 100 killed.
- `refusal-mutants`: 281 killed.
- `refusal-census`, `oracle-census` and `typecheck`: pass.
- `repository-tests`: 3,774 tests, 0 fail, cancelled, skipped or todo.
- `archive-tests`: 4 tests, 0 fail.
- `kernel-sweeps`: pass.
- `area-gate`: `reported`, advisory, with the counts in §5.

The profiles not run are listed. These match the report's summary. The full output is
[verify-C.json.gz](review-02/verify-C.json.gz); the summary records its SHA-256.

Not run:
- the `live-provider`, `large-memory-timing` and `known-base-failure` profiles (owner choice 01);
- any mutation beyond the registry's;
- the separate tooling-suite and refusal-registry commands; the composed verify's `tool-tests` and
  `refusal-census` steps run them;
- the GPT-6 reviewer's checks, whose results I do not have.

## Declared search and limits

**Searched:**
- every owner record from release 01 to choice 07 against the contract history, 007, the register,
  the transferred table and the report;
- all 181 B..H paths by area;
- the gate code, its tests and its design note;
- 20 sampled items. Sampled items cover only their scope: 10 of 110 closures and 10 of 44 V-ENV
  entries.

**Not searched:**
- P1-T's anchor and reach machinery, P1-P's prefix rules, F3/F4 runner isolation and mutation
  soundness, and the 77 case pairs. These are the GPT-6 reviewer's remit. I relied on the composed
  verify for them.
- The other 204 register entries' classifications beyond their reason-text grouping. The V-D1,
  Proxy and built-in classes use category reasons. I have no evidence they are wrong, but nothing
  checks that a reading was made either (see VENV-01, mechanism).
- The 1,395 TOOLS-02 origins.

## Per-criterion result

| Criterion | Result | Basis |
|---|---|---|
| F1 | PASS | `facts_verified` at C/H; tool-tests fixtures (verify) |
| F2 | PASS | 1,549 origins = revision-2 set; `inventory` step (verify) |
| F3 | PASS | `registered-mutants`, `refusal-mutants`, `oracle-census` steps (verify); depth with GPT-6 |
| F4 | PASS | Declared environment and floor records; runs in temporary copies (verify); depth with GPT-6 |
| F5 | PASS | `corpus` and `gate` keep origins, targets, kills, holds and areas separate; acceptance "not evaluated" |
| F6 | PASS | `tests/tooling/README.md`; no Layer-3 edits; no third-party material |
| P1 | **FAIL** | Through P1-H (VENV-01) |
| P1-T | PASS | 391 targets, each with a reading discrimination; `adoption` step (verify) |
| P1-P | PASS | Sampled preserved closures byte-identical; census recomputes |
| P1-H | **FAIL** | 44 entries held under V-ENV without a reading; 8 of 10 sampled observe no V-ENV claim; attribution to BINDING-01 unsupported (VENV-01) |
| P1-M | DEFERRED | TOOLS-02 by owner choice 04 |
| P1-G | DEFERRED | TOOLS-02 by owner choice 04 |
| P1-R | PASS | 110 closed; only the 44 transferred remain `pending_revalidation`. The extra unbound member is VENV-01 |
| P1-X | PASS | Mechanism and advisory gate per choices 06–07; triage DEFERRED to TOOLS-02 |
| P1-C | PASS | Negative controls present by name in the tooling suite; composition keeps profiles not run |
| P2 | PASS for the composition | Clean-C verify (above); report and self-review present. Independent acceptance is withheld here |
| Owner fidelity (remit 1–5) | FAIL on one item | VENV-01; everything else holds |

## Findings

### TOOLS01-R2-VENV-01 (P2) — V-ENV hold attribution widened by an unrecorded blanket rule

- **Where:**
  - `tests/fixtures/packet-tools/adoption.json` at C: `holds.register.entries`, the 44 keys in
    [venv-classification.json](review-02/venv-classification.json), and their 63 witnesses;
  - [continuation-repair-03.md:24](continuation-repair-03.md) and `:33`;
  - [implementation-02.md:116](implementation-02.md).
- **Governing:**
  - Contract P1-H: "A register of current tests and cases that observe each held claim is fully
    classified."
  - Contract P1: "Held semantic defects stay attributed to their correction owners."
  - Owner choice 04 §2: TOOLS-01 keeps "the repairs of … TOOLS-CONT-05 under the existing contract",
    and step 9 includes "register classification for … V-ENV".
  - Choice 04 §1: "the remaining work is exactly the 24".
  - continuation-stop-02:100–101: "review/classify each added match".
  - Design 05 §6 step 6: "classify register matches".
  - The owner's remit: nothing beyond the records may change holds.
- **Defect:** item 2 made 44 entries `held` under V-ENV by one rule and recorded that they were not
  reviewed per test. It cites "(owner: refuse when unsure)", but no record quotes or locates that
  instruction. The bytes do not support the attribution:
  - 8 of the 10 sampled entries assert DEC-8, host-member, Promise or commit-path behaviour, not any
    of invalidation-03's four claims;
  - 19 of the 44 carry, in their own reason, an earlier per-test reading that says "not value capture
    or its serializer window";
  - the witness text for `inspection.test.ts:178:3` reads "Held for BINDING-01 under V-ENV: Was
    not_held … not value capture or its serializer window".
- **Impact:**
  - 63 pinned members (44 preserved, 19 refused) became V-ENV witnesses. That is 63 of the 82 V-ENV
    held witnesses, and 22 closed origins close through them.
  - BINDING-01 inherits witnesses for behaviour it does not own.
  - TOOLS-01's preserved and target credit is understated by 63 members; the report notes this as
    "Credit is lost, not wrongly granted".
  - P1-H classification is moved to BINDING-01 ("A narrower classification remains possible for
    BINDING-01") without an owner record.
  - `dispatch.test.ts:1363:3@5a8d958ffdab` is left as a 25th unbound refused member in an
    owner-limited origin. No record covers it.
- **Mechanism:** P1-H's closing mechanism checks only that classification is complete, that each
  routing reaches its destination, and that reason text is present. It never checks that a held
  entry rests on a reading of what the test observes, so a blanket rule passes every check. The same
  mechanism would accept category reasons in the other held classes without a reading.
- **Required outcome:** do either (a) or (b).
  - **(a)** Classify each of the 44 against invalidation-03's four claims, with a counted `not_held`
    reason where none is observed. Re-route the affected members: import the 19 targets built and
    checked at `4bd40b4f`, or restore preservation. Rebind or record
    `target.dispatch.1363.3.5a8d958ffdab`. Recompute closures, census and the report's figures.
  - **(b)** The owner adopts the conservative rule in a verbatim record. That record states its scope
    (the 44 entries), transfers their per-test classification to a named packet, and amends choice
    04's "exactly the 24" for the 25th member.

  Either way, add a structural check (see the brief) that makes a held entry name its reading or its
  owner decision.

### TOOLS01-R2-HANDOFF-01 (P3) — H is unpublished; the remote advertises a replaced "candidate H"

- **Where:** `origin/codex/tools-01` = `fb410cb9`. H's 007 status row names that branch.
- **Defect:** H replaced a published review commit instead of following it (006: "Avoid
  rebasing/amending published review commits and force-pushes"). A reviewer who fetches the
  branch, as the owner's prompt instructs, gets a commit that F1 rejects.
- **Required:** the owner chooses which head the branch carries before the correction round starts.
  Publishing H there needs a force-push, which only the owner may do. The correction's C must
  descend from the reviewed H. Not blocking for this verdict: I had the H object.

### TOOLS01-R2-REC-01 (P3) — Report cites the wrong authority for the conformance-test edit

- **Where:** [implementation-02.md:34](implementation-02.md).
- **Defect:** the report puts the `fast-slow-equivalence.test.ts` edit under owner choice 03, whose
  file list does not name the test. The edit's authority is the owner's FLOOR-03-01 instruction,
  recorded verbatim in [node-floor-04](node-floor-04.md). Design 05 §6's floor amendment kept it
  ("The 89b49e53 test fix stays"), and choice 03 inherits that amendment. So the citation is
  imprecise, not unauthorized.
- **Required:** cite node-floor-04 in the next report.

### TOOLS01-R2-REC-02 (P3) — Owner records are not fully machine-checkable

- **Where:** [owner-choice-05.md:35–48](owner-choice-05.md); the approval lines of choices 06 and 07.
- **Defect:** choice 05's diff is not an applicable patch, so its revision cannot be checked with
  `git apply`. The approvals of 06 and 07 bind to uncommitted drafts, so the approved bytes have no
  identity.
- **Required, going forward:** embed diffs with real hunk headers, and bind an approval to a committed
  blob or commit SHA. The current records are textually consistent (section 1).

No finding is P0 or P1.

## Stop-and-redesign check

The rule does not fire. This is TOOLS-01's first independent verdict; implementer stops and repairs
are not CHANGES REQUIRED verdicts. No earlier review accepted a candidate, so nothing flips. If the
GPT-6 review also returns CHANGES REQUIRED for this H, that is the same round, not a second one.

## Correction handoff

The correction brief is [review-02/brief-02.md](review-02/brief-02.md). Packet state on transcription:
CHANGES_REQUESTED.

## Verdict and status text for transcription

The links in this text are written relative to 007, where the owner transcribes it.

> Independent review 02 (Claude Code, `claude-opus-5-5`, 2026-10-05; fidelity remit, reviewer 2 of 2)
> of H `446dd25820500db4e0eb3d6940ec49e45634f39c` over C `b104bab192f57c5ecf5b7eccebcfbda412a17b5d` /
> B `f62527e8d564a6e2f63b83cbb52e24053f333540`, contract revision 7: CHANGES REQUIRED.
> P1 and P1-H FAIL on `TOOLS01-R2-VENV-01` (P2). P1-M and P1-G are DEFERRED to TOOLS-02; every other
> criterion PASSes. P3: `TOOLS01-R2-HANDOFF-01`, `-REC-01`, `-REC-02`. Contract revisions 4–7, the 007
> edits, the 44 transferred origins, the boundaries and the advisory gate match the owner records. H
> is not on the remote. No hold, credit or successor release follows.
> [Review 02](work/TOOLS-01/review-02.md); [brief 02](work/TOOLS-01/review-02/brief-02.md).

CHANGES REQUIRED
