# Independent review 06 — TOOLS-01, owner choice 10 §2 coarse rule

## Session, independence and access

Reviewer: a fresh Codex desktop session, **GPT-6 as identified by the session instructions**,
2026-10-07. The exact serving variant/build is not exposed; I do not claim one. Session/thread:
`01a1186b-ede4-7ef2-b760-24697adf9eae`. I had no part in TOOLS-01 implementation, designs, owner
choices or earlier reviews. No subagent participated. I consulted no memory index and assigned no
weight to TOOLS-01 memory notes. Earlier committed reports are sources to check, not acceptance
evidence inherited by this review.

All candidate inspection, probes and writing used my independent clone:
`/private/tmp/arrokothi-tools-01-review-06-20261007`, branch
`codex/tools-01-review-06-20261007`, created directly from H. The required composition used a second
fresh clone, `/private/tmp/arrokothi-tools-01-review-06-clean-c`, detached at C. The shared checkout
was only the read-only clone/dependency source and the location of initial skill-file reads; I did
not run tests, switch branches or write review/implementation files there. Dependencies were copied,
not installed or changed; the parser's TypeScript subset is checked against its existing pinned
digests. No network fetch, push or remote-branch assertion is part of this review.

Access: local full Git objects, surrounding source, shell, Python and Node. Host macOS 26.6.2 arm64,
Python 3.14.6, Git 2.39.5 (Apple Git-154). Node is exactly **v26.10.0**, with
`/Users/rex-shih/.local/share/arrokothi/node-v26.10.0-darwin-arm64/bin` first in PATH for Node runs.
Long jobs use `caffeinate -i`. The composition ran alone; I launched no other test/probe/mutation job
while it was active. A process snapshot during the run showed only this verifier. The initial
sandbox denied process inspection; the subsequent read-only process inspection was approved.

Owner-message provenance: I located the original human `user` message in the local Claude project
transcript, message `b78cf3f6-1be4-4a1f-ab8e-b7f7e0b20c13`, timestamp
`2026-10-07T18:50:58.478Z`. [check_owner_quote.py](review-06/check_owner_quote.py) establishes that
choice 11's entire quote is **byte-identical** after removing only Markdown `> ` prefixes and block
spacing; both text digests are `b4b881b9bcf11036edf282e8bbdc021265b3a1dcaa2fbda374882e1697f200b9`.
[The evidence](review-06/owner-choice-11-verbatim.json) retains only that already-quoted message and
its identity/comparison metadata. I did not use assistant reasoning or unrelated transcript content.
This verifies a locally recorded human message, not cryptographically authenticated server history.
The earlier clarification request became unnecessary once this source was found.

## Exact subject and governing scope

| Role | Exact identity |
|---|---|
| B | `f62527e8d564a6e2f63b83cbb52e24053f333540` |
| C | `83094969e591dba5c4f25d19c572522b78a7a396` |
| H, the only possible acceptance subject | `a50c38867c93c63094f271d099cec71624382577` |
| Contract | Revision 11, owner choices 01–11; SHA-256 `fc0453fe93392d8721b41cf29a0b203650f1ba2d2f9bd2bc9ae2069a1cf5ebe3` |
| Governing 006/008/012 | `b759d0abc01915ea5abc94b4607c6f9101bbbcc7`; byte-identical at H |
| Previous candidate used for the correction delta | `7f3a2af46d714dc2a0e47a755ccd4fe8aeb0ba94` |

This is evidence tooling, not a Kernel, Execution Runtime/Driver or deployment change. I used the
slice-audit and architecture skills, the mental-model overview/reference and evidence owner, the
development front door/baseline, 006/008/012 and the research map's evidence-tooling sections.
Research was background only; no prior-art claim or external code supplies a finding here.

Owner choice 10 §2 expressly narrows this round to the coarse rule and its figures. Design check 03
triggered that exit; revision 5 withdraws the table and its exemptions. I did not reassess a withdrawn
table or request another detector redesign. I checked the cumulative B..H boundaries and all required
closing checks in the retained contract; the semantic depth is the owner's five requested checks and
their connected credit/closure paths. The owner's current 2026-10-07 confirmation governs all **22**
newly held members of choice 04's original 24, not only the two named in revision 4's earlier answer.

## Coverage and findings

| Requested check | Result and distinguishing evidence |
|---|---|
| 1. Revisions 10/11 implement the embedded diffs; choice 11 lists match | PASS. Six plain `git apply` runs, previous-revision bytes as input, give the exact next revision; lists/digests and adoption sets agree. Choice 11's entire quote equals the original local human message byte-for-byte. |
| 2. Coarse rule, no table exemption; revision 5 retains required behavior | PASS. Producer-to-consumer inspection, retained run-set/unread-code byte comparisons, full composed corpus, independent bounded probes; no ordinary credit for a recognized intrinsic site. |
| 3. LIST-01 / OVERLAP-01 | PASS. Required committed lists are cited by implementation 04 and reconcile completely. 853 rule-1 entries, all prior 44/188 included; 96 V-ENV-matching category entries keep their owners. |
| 4. B..H and C..H boundaries; 007 proposals | PASS. Candidate check `facts_verified`; independent Git scope/byte checks; C..H exactly report plus 007; reconstructed 007 equals H modulo wrapping. |
| 5. Report figures; 22-member reading | PASS. Independent adoption recount and route reconciliation agree; report expressly says all 22 stay listed and earn no credit. P3 wording precision below. |

### Record fidelity

[audit_records.py](review-06/audit_records.py) does not import the candidate verifier. Its output is
[records.json](review-06/records.json). It extracts each choice's sole diff at its binding commit, C,
and H, applies it with ordinary `git apply` (no `--recount` or whitespace option), and compares bytes:

- Choice 10: revision 9 at `2b48e40e` → revision 10 at `297375d5`; choice binds at `60af5db9`.
- Choice 11: revision 10 → revision 11 at `4875f486`, also its binding commit.
- Both decision records retain their binding bytes at C and H. C/H's contract is exactly revision 11.
- Choice 11's three transfer IDs, pinned digest and adoption decision rows agree; they are exactly
  the three members of the old 110-closed set that are no longer closed. Their closures are absent.
- Its one additional listed member is exactly
  `tests/conformance/architecture/kernel-landing-zone.test.ts:1200:9@deedd7950724`, in the stated origin,
  with the four target IDs in its JSON list. `limited.listed` pins the exact list bytes.
- The cause descriptions distinguish pinned from current locations: refusals' pinned 47:3 maps to
  current 43:3, unsupported's pinned 45:3 to current 46:3. The former reaches `accepted()`'s
  `new Error` at harness line 548; the latter uses `Object.keys(surface)`. No new closing route is added.

### The rule and connected consumers

I traced the changed producer and every consumer whose credit or routing depends on it:

| Boundary | Inspected mechanism and falsifying case |
|---|---|
| Recognition | `source-facts.mjs` `ambientMatches`: every recognized value identifier/prototype-name access emits `intrinsic`. The read-only/fresh-result tables and escape-position exemptions are gone. `new Map()`, `Object.keys`, `assert` arguments and comparisons must now match. |
| Retained recognition | Intrinsic names, global roots, prototype/constructor chains, `getPrototypeOf`, scope-blind aliases and call/new taint remain; `extends Error` is a value. Type-only uses and ordinary object keys are not intrinsic value references. |
| Run set | `RunSet`, `register_matches`, `register_case_matches`: registration, transitive same-file/test-side helpers, constants/re-exports, enclosing hooks, load-time import closure; cases use named/run files and closures. Their existing implementation is byte-identical to the previous H. |
| Unread code | `generated`, `child-process`, `parse`, `unresolved` behavior remains. The unread-code visitor and the following helper/load-time machinery are unchanged. |
| Register | Recomputed key/claim sets must equal the manifest; a V-ENV match cannot be `not_held`. V-ENV-owned entries name choice 08; category entries keep their existing decisions. |
| Members/targets | `preserved_table` makes registered held/superseded members witnesses. `corpus_format_2` applies P1-H to every target and removes credit before closures are evaluated. |
| Trace | `intrinsic_trace` refuses an unheld detected key, a preserved member at a detected leaf, or any credit/unrefused target there. Its three guards have independent refusal ablations. |
| Witnesses/closures | `witness_records` binds kind/member/claim; `origin_closure` forbids refused target links and requires every refused/held/superseded member's route. I independently reconciled all 107 closed origins and every stored witness. |
| Limits | The 22 rule-1-held listed members remain listed. Each of the 33 ordinary extras still has one target at a rule-1 leaf; its P1-T check must fail only P1-H, with a literal title. Only choice 11's named extra uses the separately pinned list. |

The maintained regression source keeps review 03's 19 cases, the 6 × 7 wrapper/position cross-product,
12 same-name/rebinding cases, and design check 03's five false-preserved victims (nine poison/victim
members through the real register/census). It also checks helpers, re-exports, hooks, load-time code,
unread children, type positions and the structural refusals. I read the fixture changes: local
`Calc.min`, plain thrown objects and non-intrinsic initializer/tag fixtures preserve their original
anchor/prefix discrimination without having those tests stopped first by P1-H.

[probe_coarse.py](review-06/probe_coarse.py) passed **136/136** independent bounded cases against
C's parser, using its pinned TypeScript 5.9.3 bytes: 48 intrinsic names in both value and type-query
positions (96 cases), 21 formerly exempt positions/calls, 10 recognition shapes, five ordinary or
type-only negatives and four unread-code forms. This includes shadowed names, prototype/constructor
access, descriptors, destructuring, Unicode spelling, optional access and class inheritance.
Fixtures are parsed, never executed. [coarse-probes.json](review-06/coarse-probes.json) preserves
each fixture, expectation, diagnostics and observed sites. These probes ran after the composition
finished. They found no table exemption; the full composition checks the downstream credit path.

### Review 04's P3 closure and figures

LIST-01 is closed by [rule-1-entries.json](coarse-rule/rule-1-entries.json) and
[relinked-origins.json](coarse-rule/relinked-origins.json), both committed at C and cited in the report.
The membership flags agree with independently read earlier manifests: all review 02's 44 and all
implementation 03's 188 are among the 853. Every relink row's state, witnesses, round labels and
added/dropped links agrees with the manifest deltas. The old 18 are all present, including the one
now transferred; all 70 current closed-origin relinks are present.

OVERLAP-01 is closed by the report's explicit count/attribution and
[category-v-env-entries.json](coarse-rule/category-v-env-entries.json). Its 96 rows are exactly the
V-ENV-matching category entries. All 97 category entries keep their previous classification, claim,
decision and reason; BINDING-01 does not silently take their classification. Choice 10 §3 records the
owner's precedence answer. No category entry earns ordinary credit.

| Figure at C | Independent result |
|---|---:|
| Preserved / held / superseded / refused members | 49 / 1,095 / 74 / 54 |
| Previously preserved / refused members newly held | 664 / 248 |
| Register / rule-1 / `not_held` | 950 / 853 / 0 |
| V-ENV-matching category entries | 96 |
| Targets / ordinary reading credit / P1-H-only refusals | 52 / 15 / 37 |
| Witness records | 1,169 |
| Closed origins / context ranges | 107 / 113 |
| Transferred origins | 47 = 4 + 40 + 3 |
| Listed members / held listed / extras | 25 / 22 / 33 |
| Extra members: dispatch / landing-zone / values | 18 / 14 / 1 |
| Other pending origins | 1,395 |
| Trace: sites / keys / cases / members / targets | 8,910 / 949 / 95 / 1,167 / 37 |

### Boundaries

- B..H has 345 changed paths. None is under `packages/` or `mental-model/`, or in another packet's
  work directory. The pre-B modified files are exactly AGENTS, root README/package/lock, 007 and the
  recorded `fast-slow-equivalence.test.ts` floor prerequisite. I read those diffs: the test retains
  its assertions and adds a host handle cleared in `finally`; production remains unchanged.
- Sealed paths and governing policy are preserved. The current correction delta does not rewrite
  earlier reviews, implementation reports or owner choices. I also rechecked the already-disclosed
  `28258b28` repair inside cumulative TOOLS-01 history: 13 review-01 excerpts and choice 09 change only
  trailing spaces/tabs; exactly 13 manifest rows change only bytes/digest, and all 61 attachments
  verify. This is the predecessor's recorded administrative exception, not a new sealed-record edit
  or an assertion that no byte in a newly added packet record ever changed during its history.
- C is H's direct parent. C..H is **exactly** `implementation-04.md` and `007-work-packets.md`.
- Replacing C's TOOLS-01 row and inserting the report's choice-11 TOOLS-02 text produces H's 007
  exactly after normalizing line wrapping. No extra status change or successor release is present.
- `git diff --check B H` passes. [diff-identities.json](review-06/diff-identities.json) records full
  cumulative/correction/administrative diff digests, not a substitute for the accessible Git objects.

### TOOLS01-R6-PRECISION-01 — P3, optional report labels

At implementation 04's LIST-01 row and "Area gate at C", two labels can be more precise:

1. The 80-row relink attachment is the union of 18 prior and 70 current relinks (**78 distinct**),
   plus two other choice-11 transfers. It contains 77 currently closed origins and all three
   transfers; two transferred rows have no `relinked_by` label. Calling all 80 "relinked" hides that
   distinction, although their JSON states and the report's 107/47 totals are correct.
2. Literal B..C contains **344** changed paths. The area gate correctly reports **345** because it
   also includes the declared administrative report path, as `area_gate` explicitly specifies.
   The report calls that augmented count "B..C".

Suggested optional outcome: label the first as "relinks and transfers" and the second as
"B..C plus declared administrative paths" in the next explanatory record. No credit, closure,
gate result or required list is wrong. These are P3 presentation refinements, not a correction
request or authority to edit the candidate. The search continued through all remaining checks.

## Runs, declared search and limits

The candidate check returned `facts_verified` for exactly B/C/H
([candidate.json](review-06/candidate.json)). [run_verify.py](review-06/run_verify.py) runs the owner's
exact command in clean C and records start/end, runtime, exit and pre/post status:

```sh
python3 -B scripts/packet_tools.py verify --revision 83094969e591dba5c4f25d19c572522b78a7a396 --spec docs/development/work/TOOLS-01/checks.json
```

The independent composition returned **`checks_passed`**, all 13 steps, exit 0. It ran from
2026-10-07 22:13:32.503784 to 22:48:38.055264 UTC (35 minutes 5.55 seconds). The fresh C clone was
clean before and after. [verify-run.json](review-06/verify-run.json) records that environment and
status; [verify-summary.json](review-06/verify-summary.json) is a reproducible extraction from the
unmodified [full JSON output, gzip compressed](review-06/verify.json.gz). The separate
[stderr log](review-06/verify.stderr) is also retained. No prior result was reused.

| Check | Independent observation |
|---|---|
| Tool tests | 573 passed |
| Inventory | `provenance_verified`: 208 artifacts/fences, 1,333 mentions, eight additions |
| Adoption | `revalidation_complete`; counts and routing agree with the independent recount above |
| Dimensions | `coverage_reported` |
| Registered mutants | 109 killed by their probe-route assertions |
| Refusal mutants | 314 killed |
| Refusal census | 314 refusal checks / 314 registered mutations |
| Oracle census | 29 comparisons / 29 registered mutants |
| Typecheck | Exit 0 |
| Repository tests | 3,774 tests; zero failed, cancelled, skipped or todo |
| Archive tests | Four tests; zero failed, cancelled, skipped or todo |
| Kernel sweeps | Exit 0; full observations in the raw output |
| Area gate | Advisory `reported`: 345 augmented changed paths, 69 behaviour paths, 69 distinct reported open origins (64 pending, five pending revalidation), 664 ungated |

The mutation-runner observations do not become adoption kills: adoption still reports **zero**
kills, with 15 `target_reading` credits. The three separate profiles remain explicitly not run.
The gate's 69 reported origins are a subset of the 1,442 open origins, not additional closures.

The declared search covered all 345 cumulative changed paths by ownership, all modified existing
files, the entire correction delta's executable changes and affected tests, all owner choices with
depth on 08–11, revision 5, report 04, review 04's two P3 obligations, every register entry, all
1,272 members, all 52 targets, all 1,169 witnesses, every one of the 107 closed-origin routes,
the three reopened origins, all transfer/listed/extra sets and all three coarse-rule lists. The
independent record audit has 363 passing checks. Source tracing covers the recognition/register/
member/target/witness/closure/limit chain; the bounded probes are described above.

Limits: this is the owner's coarse-rule review, not a proof that a custom syntactic analysis
recognizes arbitrary JavaScript semantics. Production/native code, inherited members of ordinary
values and state left in ordinary containers remain the recorded gaps. I did not independently
redesign or exhaustively resample the unchanged Markdown parser, target reach, prefix or runner
machinery; their maintained regression/corpus/mutation closing checks run in the full composition.
I did not re-triage the 1,395 pending or 47 transferred origins, reclassify category claims, release
a semantic hold or run the live-provider, large-memory-timing or known-base-failure profiles.
No earlier ACCEPT substitutes for this run. No third-party source/dependency/asset was added.

## Per-criterion assessment and outcome

| Criterion | Assessment and evidence |
|---|---|
| F1 | PASS. Exact candidate run, six real patch applications, cumulative ownership/sealed-byte audit and exact administrative reconstruction distinguish wrong identity, altered records or extra scope. |
| F2 | PASS. Fresh inventory rehash/reconciliation of all 1,549 origins; independent manifest set checks and route checks retain every open state and reject treating sealed sources as new origins. |
| F3 | PASS. Probe controls and 109 qualifying mutation kills; target-set negative controls keep all observed outcomes from earning a kill under choice 09. No adoption kill is claimed. |
| F4 | PASS. Declared environment and isolation/timeout/output-limit/contamination controls run in the 573 tool tests; C stays clean; mutation source changes remain temporary. |
| F5 | PASS. Independent counts distinguish origins, 415 family members, 1,272 census members, targets, witnesses and zero adoption kills. Coarse holds remove credit before closure evaluation. |
| F6 | PASS. Maintained usage/adoption/handover documentation and source/link checks, accessible local Git objects, clean C, no production/Layer-3 change or newly incorporated third-party material. |
| P1 | PASS for the owner-retained scope. Exactly 107 closed plus 47 transferred revalidation origins; the other 1,395 origins remain pending and visible. |
| P1-T | PASS for retained targets. All 52 evaluated freshly: 15 reading credits and 37 P1-H-only refusals. Every ordinary limited extra is reconciled to its unique held target; choice 11's exception matches its pinned list. |
| P1-P | PASS. Fresh preservation checks retain 49 members; coarse intrinsic sites cannot retain preservation credit. Changed helper/prefix fixtures keep their discriminating purpose; negative controls run in the composition. |
| P1-H | PASS under choice 10 §2. No table exemption; 853 rule-1 entries, category precedence preserved, all 1,169 witnesses and 107 closure routes reconciled. The original 22 held limited members remain listed and uncredited. |
| P1-R | PASS. The composition revalidates the 154 original rows; independent deltas show only choice 11's three newly reopened origins, with exactly the authorized 4 + 40 + 3 exceptions. |
| P1-X mechanism | PASS. Unconditional advisory gate, finite map, all open states and ungated count retained; no changed-path or current-packet exemption. |
| P1-C | PASS. Composition/refusal/oracle controls distinguish pending, held, profiled, stale and executable results. Explicit not-run profiles and zero adoption kills remain visible. |
| P1-G / P1-M / P1-X triage | DEFERRED by owner choice 04 to TOOLS-02: remaining mention grouping, 26-family/415-member extraction and prose triage. This review grants none of that deferred work credit. |
| P2 | PASS. Full clean-C composition, maintained controls, cumulative boundary review, declared additional search and this independent exact-H verdict. |

No P0, P1 or P2 defect was found in the declared search. The single P3 precision note is optional
under 006 and does not invalidate a closing mechanism. Review 04's LIST-01 and OVERLAP-01 are closed.
The already-triggered stop-and-redesign route is resolved for this candidate by owner choice 10 §2
and choice 11; this review creates no new correction round or architecture decision.

Acceptance binds **only** to H `a50c38867c93c63094f271d099cec71624382577`, with the B/C and contract
identities above. The local review commit records that verdict; it does not certify itself, integrate
the candidate, release a hold or release a successor. Only this review and its attachments are added
on `codex/tools-01-review-06-20261007`; no implementation change or push is made.

ACCEPT
