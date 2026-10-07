# TOOLS-01 — independent re-review 03

2026-10-07. This fresh **Codex desktop session is identified to me as GPT-6**. No finer serving-model
identifier is exposed. I did not implement the candidate, and I do not claim to be the earlier
review-01 or design-check session; I read their committed records. Two remaining P1 detector defects
reproduce false preserved credit. No implementation changes were made.

## Exact subject and access

| Item | Identity |
|---|---|
| Base B | `f62527e8d564a6e2f63b83cbb52e24053f333540` |
| Payload C | `28258b282532b36eef8fb1571d79b6343b54427b` |
| Candidate H | `7f3a2af46d714dc2a0e47a755ccd4fe8aeb0ba94` |
| Previous reviewed H | `446dd25820500db4e0eb3d6940ec49e45634f39c` |
| Contract | revision 9; owner choices 01–09 |
| Governing 006/008/012 | `b759d0abc01915ea5abc94b4607c6f9101bbbcc7`; candidate copies unchanged |
| Source | `https://github.com/ArrokothI/arrokothi.git` |
| Review branch | `codex/tools-01-review-03`, based directly on H |

This verdict binds only to exact H, never the review commit, a merge or a successor. `candidate`
independently reports `facts_verified`, with H directly after C and exactly 007 plus implementation-03
in C..H. At initial clone, `origin/codex/tools-01` and the reserved review-03 branch both pointed to H.

I have shell execution, local source/Git history and filesystem access. Network access is restricted;
the remote clone and locked dependency installation used approval after sandbox/offline limitations.
I cloned the GitHub repository into `/private/tmp/arrokothi-tools-01-review-03`, then made a separate
non-hardlinked clone of that clone at `/private/tmp/arrokothi-tools-01-review-03-c` for clean-C runs.
I did not run review commands or edit files in the shared project checkout. The only initial shared
reads were the two repository skills. I also read the specifically cited scratch artifact for the
restored target; a byte-identical compressed copy is attached. I have no private-provider/evaluation
access and cannot independently authenticate earlier private conversations or scratch-file authorship.

All Node-dependent runs used **v26.10.0 first in PATH**, at
`/Users/rex-shih/.local/share/arrokothi/node-v26.10.0-darwin-arm64/bin/node`. Host: Darwin 25.6.0,
Python 3.14.6. Long jobs used `caffeinate -i`. Locked dependencies were installed with `npm ci
--ignore-scripts`; no candidate source was changed. Composed `verify` was deliberately not run, as
the owner assigned it to the other reviewer. Its result is not silently incorporated into this review.

## Review method and runs

The independent obligations were: no held/unrecognized intrinsic-contact behavior receives ordinary
credit; context cannot lose a fence or required record; transfers must match authorized lists;
target observations never become kills; provenance and exact sets survive correction. I inspected
the cumulative B..H file scope, the correction delta, the relevant producers and their downstream
register/preservation/target/witness/closure/summary consumers, the contract and choices, design 06
revisions 1–3 and both checks, reviews 01–02, and implementation-03. I used the architecture and
slice-audit skills, 006/012, the canonical evidence-attribution owner, and the research map's evidence
tooling section. This packet belongs to evidence tooling; it changes no Kernel/Runtime semantics.

The original probe is itself pinned to old C `b104bab1`. Running the requested original command at
new C exits 1 at its identity assertion, before testing behavior. That is recorded in
[original-probes.txt](review-03/original-probes.txt). The attached
[replay_review01.py](review-03/replay_review01.py) preserves the scenarios, updates C and the changed
transfer API, and reverses the expected false-credit assertions. It runs every earlier observation
against C and requires the corrected disposition; the original attachments are untouched.

| Independently run | Result |
|---|---|
| Required `candidate --payload C --head H --spec .../verification.json` | exit 0; `facts_verified` |
| Full tooling unittest discovery | exit 0; 561 tests in 667.530 s; OK |
| `tests/tooling/check-refusal-registry.py` | exit 0; 307 refusal checks / 307 registered mutations; this is the census, not a rerun of 307 ablations |
| Original review-01 probe at C | exit 1, old-payload guard as explained above |
| Rebased review-01 replay, `all` | exit 0; all prior false-credit cases now end without credit |
| Original `probe_isolation.py` at C | exit 0; failure, timeout and SIGINT preserve source bytes and remove the temporary copy |
| Independent `probe_detector.py` | exit 0 collecting 19 cases; nine new false negatives, two with actual false preservation |
| Independent `probe_boundaries.py` | exit 0; ten Markdown cases and four provenance/error mutations meet their expected no-credit boundaries |
| `inventory --revision C` | exit 0; 208 artifacts + 1,333 mentions + eight additions = 1,549 verified origins |
| `audit_candidate.py` | exit 0; restoration, whitespace conservation, scope counts and both fresh P1-T mapping checks |
| `audit_scope.py` | exit 0; 305 register entries / 188 rule-1; all 110 contexts, 116 ranges; no uncertain minimum; 4+40 transfers |

Commands, outputs and attachment hashes are in [README](review-03/README.md) and
[manifest](review-03/manifest.json). A probe's exit 0 means its reported observations were collected,
not that this candidate passes. The direct tooling run overlapped independent fixture probes and took
667.530 s; it does not establish compliance with the composed step's 600 s limit. No bound was
changed, and no solo composed timeout is alleged here. I continued after the first defect through all accessible requested
obligations.

## Findings

### R3-01 — P1: expression wrappers hide an intrinsic escape and permit preserved credit

**Owners:** choice 08 §1's positive-recognition rule; design 06 R1-01's explicitly stripped
parentheses/`as`/`satisfies`/`!` and call/return/storage escapes; P1-H/P1-P/P1-C.
**Sites at C/H:** `tests/tooling/source-facts.mjs:976–991,1010–1015`, consumed by
`scripts/packet_tools.py:2113–2190,2230–2284,2356–2400,2478–2494`.

```ts
function mutate(p) { p.toJSON = () => 42; }
test('member', () => {
  mutate((Object.prototype));
  assert.equal(JSON.stringify({a: 1}), '42');
});
```

The unwrapped `mutate(Object.prototype)` control matches `escape`. Parentheses produce **no match**.
The runtime assertion passes, proving the actual ambient write. `hold_register` accepts an empty
register for the fixture, and the actual preservation census/table returns `status: preserved`,
`register: null`, `reasons: []`. No uncertainty is visible.

The same loss occurs for `mutate(Object.prototype as any)`, `mutate(Object.prototype!)`,
`mutate(Object.prototype satisfies object)`, storing `[(Object.prototype)]`, and a helper returning
`(Object.prototype)`. All six execute successfully and have no detector match in the attached probe.
The classifier unwraps the value but checks escape context through the original node's immediate
parent; the inner node sees a wrapper, while the wrapper is excluded by `node === bare`. This is
within the declared intrinsic-contact domain, not the documented native/out-of-domain gap.

**Required outcome:** preserve the value-to-use relationship across every promised wrapper and
escape position. Each listed case must be held/refused or visibly unresolved before ordinary
credit. The raw and wrapped controls must agree on the dangerous operation, including through
the preservation and target consumers. Do not patch just the spelling of this example.

### R3-02 — P1: a reader name substitutes for proof that a call is read-only

**Owners:** the same positive-recognition and hold rules; design 06's exemption is for readers with
fresh/primitive results, not arbitrary functions sharing their names.
**Sites at C/H:** `tests/tooling/source-facts.mjs:829–837,942–945,976–985` and the same credit consumers.

```ts
function keys(p) { p.toJSON = () => 42; }
test('member', () => {
  keys(Object.prototype);
  assert.equal(JSON.stringify({a: 1}), '42');
});
```

This also has **no match**, passes its runtime assertion, and receives `preserved` with an empty
register and no reason. `READ_ONLY.has(calleeName(...))` exempts the intrinsic argument solely
because the function is called `keys`. Reading the helper body does not bind the intrinsic to `p`.
A local object method `helper.keys(p)` behaves the same. A third case, `function keys(p) { return p; }`
followed by `const p = keys(Object.prototype); p.toJSON = ...`, also bypasses `FRESH_RESULTS` by name.

**Required outcome:** only positively recognized read-only operations may exempt intrinsic contact
or discard result uncertainty. Unsupported local/imported/member/aliased call identities must not
inherit a built-in exemption from their spelling. Preserve the genuine `Object.keys` negative control.

Both findings are reproduced by [probe_detector.py](review-03/probe_detector.py); exact source,
runtime outputs, detector matches and preservation rows are in [detector.json](review-03/detector.json).
The misses establish a defect in supported tooling inputs. I do not claim that these nine synthetic
leaves already exist in the candidate's maintained 713 preserved members.

## Correction and scope checks

**R1-01: not closed at its cause.** The four original current leaves are now held by choice 08;
their ordinary targets are removed. The original direct/alias/cast/imported-helper/generated forms
match. Descriptor-result, destructured descriptor, helper-returned descriptor and `Reflect.get`
variants are recognized, with visible `unclassified` sites. Local-object and genuine `Object.keys`
controls remain unmatched. R3-01/R3-02 show the remaining failure of positive recognition.

**R1-02: PASS in the declared parser search.** Inventory and context share `markdown_blocks`.
The shortened tilde closure refuses; the complete tilde context succeeds only with the named note.
Independent cases cover trailing-text false closers, shorter and mixed runs, longer backticks,
whitespace/indentation closers, required records, unclosed/indented/list/quote fences and HTML.
The maintained tests also cover mention-inside-fence, non-fence closure, CR handling and CONT-04
references. This agrees with the selected closer rules in
[CommonMark 0.31.2 §4.5](https://spec.commonmark.org/0.31.2/#fenced-code-blocks); it is not a claim to
implement all CommonMark. Context uncertainty is visible and cannot itself close an origin.

**R1-03: PASS for the authorized finite transfer sets.** The original 45th origin and unrelated
decision both refuse. Per-decision equality catches omitted/swapped entries; digests and directory
association are checked. Choice 04's new list restates its four table rows/counts, and choice 05's
40-member list is unchanged. Decision/list authenticity remains the stated human boundary.
C2-LIMIT's maintained controls reject another member's same-title target, missing/duplicate/ambiguous
or generated mappings, a non-rule-1 leaf, an extra outside its origin and stale counts. Actual extras
are exactly 1363:3 and 1426:3, with unique explicit target mappings and independently checked P1-T.

**R1-04: PASS under choice 09.** `target_outcome` has no kill-producing branch; aggregation grants
no kill to its observations. Original assertion/TypeError/skip mutants are `observed`, zero kills.
The independent trimmed-production assertion, empty/numeric stack and thrown-primitive cases are
also observations. The reporter says origin is not established; stacks do not supply credit.
The maintained corpus additionally exercises todo, cancellation, target timeout, hook, helper,
renamed/mixed targets and distinct run-level failures. Node's documented
[`stackStartFn`](https://nodejs.org/api/assert.html#new-assertassertionerroroptions) explains why a
trimmed stack cannot prove provenance; this review also executes that case. Probe-route kill
semantics remain unchanged. The 109 registry mutations and 307 ablations are not independently
rerun here; they belong to the separately assigned composed run.

**Detector deviation: PASS as a conservative change.** `entries` and `values` remain read-only
argument exemptions but are absent from `FRESH_RESULTS`. That only propagates more result
uncertainty; it cannot remove a match or grant credit. Both independent result-write probes match
`unclassified`. The name-based exemption defect in R3-02 exists independently of this deviation.

**Restored target: PASS, with the provenance limit stated.** The recovered scratch file has SHA-256
`d5ea1655908497538c545f7d94aaac451689b9b297421445779d174a28f7b278`; it contains 43 target rows, 34
equal to the old manifest, eight other unimported rows and the restored 1363:3 row. The restored row
equals that source; its five full anchors extend the historical committed 120-character prefixes.
Fresh P1-T at C selects the literal leaf at 1390:3, reaches all five bound anchors, and matches input
tokens. The second extra at 1459:3 also passes all its P1-T checks. Both are still rule-1 held leaves
and receive only the P1-H refusal, no credited reading. This establishes byte correspondence and
current validity, not who created the formerly uncommitted file. The source is now attached for
future inspection as [restored-target-source.json.gz](review-03/restored-target-source.json.gz).

**Review-01 conservation: PASS.** Comparison with `c4a13bc2` finds exactly 13 changed sample files;
each equals the old bytes after stripping only trailing spaces/tabs. `manifest.json` differs only
in those files' byte counts and SHA-256 values, and all recorded attachment digests verify. All
other review-01 artifacts are byte-identical. The review's substantive content was not rewritten.

**Owner scope: PASS for the submitted record changes; detector soundness fails above.** The same
44 origins transfer; all 1,549 origin states are unchanged. The 18 closure relinks retain their
context and add held witnesses, not new credit. Member status transitions are 53 preserved→held
and five refused→held; 713 preserved, 125 already held, 74 superseded and 302 refused remain in
their earlier categories. Semantic hold IDs/owners are unchanged; choice 08 is the new authority
for the widened V-ENV matches. No additional origin transfer or hold release appears. The
`revalidation_complete` formula and preserved-credit predicate are not redefined; the defect is
what reaches that predicate as unregistered. The advisory gate remains fixed and unconditional.
The cumulative non-tooling test edit retains its assertions and only supplies/clears a host handle,
with the authorization recorded in node-floor-04.

## Per-criterion assessment and limits

| Criterion | Assessment | Evidence / limitation |
|---|---|---|
| F1 | PASS | Exact candidate command and C..H scope; pinned policy unchanged. |
| F2 | PASS | Fresh 1,549-origin inventory, preserved IDs and exact state/transfer conservation. |
| F3 | PASS in this assigned soundness search | Structural no-target-kill route, old replay, independent provenance variants, maintained runner controls. Composed registry run is separately assigned. |
| F4 | PASS in bounded search | Temporary-copy mechanism, maintained environment/bounds tests, independent failure/timeout/SIGINT probes. |
| F5 | FAIL | R3-01/R3-02 produce preserved credit without a hold or visible uncertainty; other counts remain separated. |
| F6 | FAIL | R3-01/R3-02 contradict documented supported detector behavior and positive-recognition claim. Handover is concrete; no new dependency or Layer-3 change. |
| P1 / P1-H / P1-P / P1-C | FAIL | Two reproduced paths bypass the hold boundary; original R1-01 examples alone are insufficient closure. |
| P1-T | FAIL as a general no-held-credit boundary | The same register producer protects targets. Two actual mapping targets pass P1-T and correctly lose credit under P1-H. Other 381 readings are not rerun individually here. |
| P1-G minimum context | PASS in declared scope | Shared-parser search and context checks; broader grouping remains TOOLS-02's. |
| P1-R | FAIL overall | Exact transfer limits hold, but required P1-H/P1-P closing mechanisms remain defective. |
| P1-X mechanism | PASS in declared scope | Conservative uncertainty handling, unchanged fixed advisory invocation, maintained gate controls. No new full gate/composed run claimed. |
| P1-M, remaining extraction/grouping/triage | DEFERRED | Explicit owner choices 04–05; 26 families/415 members and 1,395 pending origins remain TOOLS-02's. |
| P2 | FAIL | New P1 findings prevent acceptance; composed verification intentionally left to the other reviewer. |

Searched: the original four false-credit families; the two design checks' adjacent cases through
maintained tests and independent probes; wrapper/call-name interactions; all current transfer sets;
the two actual extra mappings; all changed review-01 attachments; detector and closure consumers;
finite record conservation. Cumulative scope review includes the fixed policy/architecture paths,
root Node-floor changes, conformance host-handle edit and tooling correction diff.

Not searched: a universal JavaScript or CommonMark language; every semantic reading among 381
targets; every historical context's prose meaning; every production/native helper; hostile runner
containment, SIGKILL/host crash; live-provider or large-memory/timing profiles. I did not independently
run composed verify, full corpus/preservation recomputation, all registered ablations, typecheck,
archive suite, or kernel sweeps. Fresh P1-T checks invoke the declared repository catalog as a
dependency, but do not substitute for a fresh composed verification. Earlier accepted records and
the other reviewer's work are not treated as my observations.

No third-party source, dependency or asset was newly incorporated. Probes are independent review
code using repository-owned fixtures; the scratch attachment is repository-owned evidence. The
official specifications were consulted as references, not copied into implementation.

006's repeated-failure/third-review rule applies. The accompanying
[root-cause note](review-03/root-cause-and-owner-options.md) supplies the required mechanism analysis,
design questions, corpus additions and owner options. No further patch round should start before
that decision. These are concrete tooling defects, not an unresolved Kernel architecture conflict.
For owner transcription: CHANGES_REQUESTED at exact H, findings R3-01 and R3-02. This branch adds
only review evidence; no acceptance, merge, hold release or successor release is authorized.

CHANGES REQUIRED
