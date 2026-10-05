# TOOLS-01 — independent review 01 (soundness)

2026-10-05. Reviewer 1 of 2: this Codex session, identified to me as **GPT-6**. A more specific serving
model identifier and session UUID are not exposed; I do not infer them. I independently found four
ways the tooling grants credit its contract does not permit. The required composed verification also
returned `attention_required`, with a poison-sweep timeout. No implementation changes were made.

## Exact subject and access

| Identity | Value |
|---|---|
| Base B | `f62527e8d564a6e2f63b83cbb52e24053f333540` |
| Payload C | `b104bab192f57c5ecf5b7eccebcfbda412a17b5d` |
| Reviewed H | `446dd25820500db4e0eb3d6940ec49e45634f39c` |
| Contract | `docs/development/work/TOOLS-01/contract.md`, revision 7 at C/H |
| Governing 006/008/012 | `b759d0abc01915ea5abc94b4607c6f9101bbbcc7` |
| Submitted branch / remote | `codex/tools-01`; `https://github.com/ArrokothI/arrokothi.git` |
| Review branch | `codex/tools-01-review-01`, created locally from exact H |

I fetched the submitted branch. Its advertised tip was `fb410cb99519fbd922fcfcaeb872cb168caf4f9c`,
another direct child of C, not H; H is not its ancestor. A subsequent successful
`git fetch origin 446dd25820500db4e0eb3d6940ec49e45634f39c` confirms exact H is available from the
remote. H's sole parent is exactly C. H..the advertised tip changes only 007, but I have not
substituted that sibling as the candidate. C..H is exactly 007 and implementation-02. Any verdict
here binds only to H, never to that sibling, this review commit, a later merge, or a successor.

Access: local full Git objects and source, pinned historical blobs, installed dependencies, shell
execution and remote Git reads subject to sandbox approval. Filesystem writes were limited to
temporary probes and this review worktree. No external/live-provider evidence or private evaluation
access is claimed. The original shared checkout was externally moved from H to C before the required
run and was later back at H; I did not switch it or edit its files. The run checked clean C before
and between its steps. Review artifacts are committed in a separate worktree.

I did not read or rely on the separate Claude acceptance review. Required candidate documents
authored by Claude are candidate evidence, not independent confirmation. Owner-decision authenticity
and process fidelity remain reviewer 2's assigned remit; this record does not silently combine two
partial reviews into acceptance.

## Independent coverage and method

The [coverage map](review-01/coverage-before-report.md) was recorded before reading implementation-02.
I read the pinned AGENTS/006/007/008/012 sources, the whole-system/evidence-attribution owners, brief 01,
contract 7, design 05 §§4–6 and its preservation rules, owner choices 01–07, gate design, closure 01,
register-cases 01, continuation stops 01–02 and repairs 01–03, then the exact-H report and tooling
README. There is no separate stop-03 file; CONT-03 is documented in repair-01.

I inspected the cumulative B..H changed-file scope and the relevant checker, reporter, source-facts,
runner, context, preservation, hold, closure, summary and gate paths, including their negative tests.
The small non-tooling test change retains its assertions while supplying/clearing a host interval;
it does not alter Kernel semantics. This packet and these findings belong to evidence tooling.
V-ENV remains BINDING-01's; Proxy, re-prototyped built-ins and V-D1 remain K1.1-correction-03's.

The required run started before the additional probes. I continued the search after the first defect.
[Sample notes](review-01/sample-notes.md) record **16 closed origins**: four test files, four fences/
probes, three helpers, two non-executable records and three case origins. Each has attached pinned
context and manifest records. The reading checks targets, witnesses, preserved members and minimum
context, including CONT-04 reference handling. The other 94 closures were mechanically rerun, not
independently read in full. All 44 transfers and all 24 limited members received exact-set checks.

## Runs and observations

Node **v26.10.0** was first in PATH. I found a cached official distribution archive, checked it against
the supplied SHA-256 `751fdf7439f115d87ee2a8f3f18c065b6151852068e3e666ac60ac2996f75ac9`, and extracted
it into the review's temporary directory. I did not substitute the system's v25.2.1. Long runs used
`caffeinate -i`; no checkout files were edited during them. Timings below are measured elapsed seconds.

```sh
python3 -B scripts/packet_tools.py candidate --payload b104bab192f57c5ecf5b7eccebcfbda412a17b5d --head 446dd25820500db4e0eb3d6940ec49e45634f39c --spec docs/development/work/TOOLS-01/verification.json
python3 -B scripts/packet_tools.py verify --revision b104bab192f57c5ecf5b7eccebcfbda412a17b5d --spec docs/development/work/TOOLS-01/checks.json
```

| Run | Time | Exit / result |
|---|---:|---|
| Required candidate | 1.136 s | 0; `facts_verified` |
| Required verify at clean C | 2,854.599 s (47m 34.599s) | 1; `attention_required` |
| `python3 -B review-01/probe_review.py <candidate-root> all` | 15.924 s | 0; all four expected false-credit observations reproduced, **not acceptance** |
| `python3 -B review-01/probe_isolation.py <candidate-root>` | 1.248 s | 0; failure, timeout and SIGINT preserved source bytes |
| Focused poison-sweep recheck, command below | 15.081 s | 0; `POISON SWEEP PASSED` |

Exact commands, environment and results are in the `.run.json` files, [probe output](review-01/probes.json),
[summary](review-01/verify-summary.json) and compressed full [verify output](review-01/verify.json.gz).
The attachment manifest hashes the preserved evidence. Probe commands need the candidate's existing
locked dependencies and exact Node first in PATH; they mutate only temporary fixture repositories.

The required run passed 489 tooling tests; 1,549 inventory records; corpus revalidation; 100 registered
mutation case/pairs; all 281 refusal ablations; both refusal/oracle censuses; typecheck; 3,774 repository
tests; and four archive tests. Repository and archive runs had zero failures, cancellations, skips or
todos. The corpus reported 110 complete, 44 pending revalidation and 1,395 pending origins; 391 target
readings, **zero target kills**, and 766 preserved / 125 held / 74 superseded / 307 refused members.

The fault sweep passed 66 scenarios / 54,288 runs / 57 exits with zero violations. The poison sweep
passed 1,712 tests in each of `off`, `count` and `throw`; `reenter` passed 1,711 and failed one:
`values.test.ts:826`, “an oversized own-names listing is classified after at most one descriptor past
the entry limit.” `inBoundedChild` at line 622 raised `ETIMEDOUT` under its 60-second limit. The child
output retained descriptor counts of 4,097; this observation alone does not establish a Kernel
semantic defect. The detailed original [reenter output](review-01/sweep-reenter-original.txt.gz) is attached.

I then ran this bounded diagnostic at H, whose relevant executable bytes equal C:

```sh
node --experimental-strip-types --no-warnings packages/kernel/tests/sweep/run-poison-sweep.ts --modes off,reenter --files values.test.ts --out /private/tmp/tools01-review1/sweep-recheck
```

Both modes passed all 84 tests, with 280 boundary calls each and zero zone firings. The timeout did
not reproduce in isolation; its scheduling/environment cause is unconfirmed. This diagnostic does
not convert the failed full verify into a pass. Resolve the discrepancy and obtain fresh required
verification for a corrected candidate without silently weakening the bound.

## Findings

### R1-01 — P1: known held ambient writes retain ordinary credit

**Owners:** contract P1-H/P1-P/P1-C; DESIGN-AUDIT-01 invalidation-03 held claims 1–4.
**Sites at C/H:** `scripts/packet_tools.py:58–69,1901–1958`; adoption's corresponding member/target rows.

The widened V-ENV recipe recognizes direct named-intrinsic assignments and a defineProperty-style
alias pattern, but misses assignment through a TypeScript cast or ordinary alias. Four actual current
leaves mutate ambient `toJSON` and assert the held independence/retained-content behavior:

| Current declaration | Incorrect ordinary credit |
|---|---|
| `packages/kernel/tests/creation.test.ts:333:3` | preserved member `:333:3@088207d1ce86` |
| `packages/kernel/tests/dispatch.test.ts:615:3` | preserved member `:615:3@41092809bb04`; reading `target.dispatch.612.3.5a8d958ffdab` |
| `packages/kernel/tests/values.test.ts:893:3` | preserved member `:893:3@44b00a5bd3f1`; reading `target.values.589.3.fb228bec8c58` |
| `packages/kernel/tests/values.test.ts:910:3` | preserved member `:910:3@44b00a5bd3f1`; reading `target.values.606.3.fb228bec8c58` |

For example, `(Object.prototype as Record<string, unknown>).toJSON = () => 42` is a write despite
the intervening cast. Recomputing the actual register omits all four keys. The required corpus still
grants the stated credits. The attached `holds` probe also compares a recognized direct assignment
with missed cast, alias, imported-helper alias and generated-source execution variants.

The contract explicitly states an unregistered-behavior gap; I am not demanding universal static
analysis. These are now concrete known held results, so they must stop earning ordinary credit.
Reassess the surrounding alias/helper/generated-source family and route known held results to
attributed witnesses. Retain the existing Proxy/re-prototyped/V-D1 recipe lower bounds.

### R1-02 — P1: minimum context can omit the fence body and required record

**Owners:** P1 preamble, P1-G/P1-R; CONT-01/03/04 context obligations.
**Sites:** `scripts/packet_tools.py:2580–2610`, compared with `fenced_bytes` at line 328.

Inventory accepts `~~~` fences, but `markdown_section` toggles fence state only for triple backticks.
A heading-like line inside valid tilde-fenced JavaScript is treated as the end of its enclosing
section. The `context` probe creates a real pinned origin with a template literal containing
`## Embedded heading`, followed by a required `[note](docs/records/note.md)` after the fence.

The tool computes minimum lines **2–4**, accepts a closure recording only those lines, and reports
`mappings_complete`. It has not even included the whole executable fence, and the required note is
never discovered. The equivalent backtick-fence omission is refused; full tilde context is accepted.
This is the CONT-04 mechanism again: required material disappears before downstream checks.
Inventory and context must agree on fence boundaries, and uncertainty must not grant closure.

### R1-03 — P2: an unrelated decision can exempt an in-scope open origin

**Owners:** P1/P1-R and owner choices 04–05's finite exception sets; F5's completion distinctions.
**Sites:** `scripts/packet_tools.py:538–550,636–640`.

The submitted 44 rows exactly match the authorized four plus forty. However, `transferred_origins`
checks only uniqueness, an existing decision file and `pending_revalidation` state. It does not bind
membership to the cited decision's allowed set. The `transfer` probe reopens the in-scope evidence
origin `artifact-394a3572417fe81cafbd7097` and adds it as a 45th transfer citing owner-choice-04; the
actual checker accepts it, although that decision does not list the origin.

A separate full-corpus fixture cites a file containing only “Held claim decision” and reaches
`revalidation_complete` with its revalidation origin still open. This does not establish acceptance
or full-corpus completion, but it does fabricate the narrower scope-completion result used by verify.
Human authorization review remains necessary; it is not a reason for an unverified exception to be
indistinguishable from the contract's authorized set in the positive result. Define and validate that
binding or explicitly retain an unresolved result. Do not silently enlarge the current 44.

### R1-04 — P1: skipped tests and pre-assertion errors count as mutation kills

**Owners:** F3/F5/P1-C's qualifying named assertion requirement.
**Sites:** `scripts/packet_tools.py:961–979`; `tests/tooling/catalog-reporter.mjs:8–22` and catalog projection.

`target_outcome` treats every verdict other than `passed` as a failed qualifying leaf. The `kills`
probe uses a passing control and a unique reached edit, then changes the expected test registration
to `test.skip`. It returns **`killed`, `invalid: false`, process exit 0**, despite no assertion running.
A second mutant makes `compute` throw `TypeError` before `assert.equal` evaluates its arguments;
that also receives a named kill. A genuine assertion-failure control receives the same credit.
Together all three produce `selected_cases_passed` and `counts: {killed: 3}`.

The reporter/catalog path loses the assertion/error distinction and the final predicate also admits
skips. Preserve sufficient observation to distinguish a qualifying assertion from skip/todo/
cancellation and setup/runtime errors; keep wrong-leaf and reach controls. The 100 actual registry
cases use the probe route, not this target-set branch, and all 391 adoption targets are readings.
I therefore do not relabel those actual observations as false kills; the independently reproduced
defect is in the supported generic runner route.

## Remaining searches and per-criterion assessment

The current summaries keep readings, censuses, family members, witnesses and actual mutation runs
separate. None of the 391 readings is counted as a kill or preservation. R1-01 is held behavior
misclassified before credit; R1-04 is invalid execution misclassified inside the kill route.
All 24 owner-choice-04 members remain refused and have no bound target, verified by `audit_tables.py`.

The advisory gate is called outside the configurable check loop from the fixed adoption manifest;
a missing candidate spec refuses instead of disabling it. Its successful report is always appended
with `passed: true`; open origins never fail verify. Invalid input may abort verification, which is
different from a gate finding failing it. Behavior-path filtering excludes docs, mental-model and
root Markdown. Nameless origins are `ungated`. The run reported 69 distinct open origins in touched
areas, zero prose_pending and 664 ungated: package.json 47, lockfile 26, effects 17, tooling 10
(overlap explains the sum). This matches owner choice 07's reporting scope; it grants no credit.

Isolation uses validated ordinary Git blobs and fresh temporary directories for each control,
mutation and repeat. Edits are planned before writes, commands use declared environments and bounded
process groups. The attached failure/timeout/SIGINT probe observed mutated temporary bytes, removal
of the copy, and unchanged original SHA-256. This is source protection for trusted fixtures, not
containment of malicious programs. SIGKILL/host-crash cleanup and hostile ambient writes were not
experimentally tested.

All 281 current `require` calls match registered ablations; all 281 ablations were killed. Against
implementation-01's containing commit `5eb27f98569624ece3c19a09a608a09d28be4605`, 239 calls are new or
text-changed (47 calls existed then). This finite census covers the promised Python guard set,
not every conceivable missing refusal. No narrowing of Proxy, re-prototyped built-in or V-D1 minimum
recipes was found. Their matching/classification mechanics were read and run; I did not semantically
reread every held or `not_held` record.

| Criterion | Result in this soundness review | Evidence / limit |
|---|---|---|
| F1 | PASS | Exact candidate facts, direct parent, remote exact-H fetch, administrative set; advertised branch discrepancy disclosed. Authenticity/content authority is not inferred. |
| F2 | PASS | Recomputed 208+1,333+8 origins, exact IDs and migration conservation; provenance remains distinct. |
| F3 | FAIL | R1-04; maintained registry passes do not validate missing target-set distinctions. |
| F4 | PASS | Structural copy/environment/bounds paths, maintained controls and independent interruption probes. |
| F5 | FAIL | R1-03/R1-04 positive results; ordinary reading/census separation itself passes. |
| F6 | PASS within soundness remit | Usage/handover material available; no new third-party material or Layer-3 semantic change. Owner/process fidelity is not certified here. |
| P1 overall / P1-R | FAIL | Known false held credit and minimum-context closure; transfer checker accepts unauthorized exemption. |
| P1-G, retained closure scope | FAIL | R1-02 can erase required reading before reconciliation. |
| P1-T | FAIL | Three actual held leaves receive target readings (R1-01), despite passing reach mechanics. |
| P1-P | FAIL | Four actual held leaves remain preserved (R1-01). Sampled other routes retain stated limits. |
| P1-H | FAIL | R1-01. No lower-bound narrowing found for the other recipes. |
| P1-X | FAIL for context-derived completeness; dispatch/report mechanics pass | Unconditional advisory invocation, behavior paths and ungated handling are correct. R1-02 can truncate the minimum context from which areas are derived. |
| P1-C | FAIL | R1-01/R1-04; profiles and acceptance are otherwise separately reported. |
| P2 | FAIL | Four soundness defects; required verify exited 1. Focused retry is not a full passing run. |
| P1-M extraction; remaining P1-G/P1-X triage | DEFERRED | Owner-choice-04/05 scope explicitly assigned to TOOLS-02; 415 family members and open origins remain visible. |

Not searched: every semantic reading among 391 targets; all 110 contexts in full; every path in
imported helpers or generated programs; a universal JavaScript hold analysis; live-provider,
large-memory/timing profiles, and the owner-reported builder-docs failure excluded from checks.
No behavior-quality benchmark, Kernel hold release, deployment containment or acceptance follows.
No third-party source/dependency was added or adapted; probes independently exercise repository-owned
fixtures. The already installed toolchain was reused, with no new license-clearance claim.

## Root cause and handoff

I apply 006's stop-and-redesign rule, with the exact earlier disposition and interpretation explained
in [root-cause-and-owner-options.md](review-01/root-cause-and-owner-options.md). It replaces a patch-ready
correction brief. It states the repeated loss of evidence distinctions, why existing controls missed
the cases, design questions, corpus additions and the owner's redesign/refinement/split/limit options.
No further patch round should start before that owner decision. This is not a newly invented Kernel
architecture conflict and does not require changing the held semantic contracts to repair the tooling.

For owner transcription: **CHANGES_REQUESTED**, exact H above; open findings R1-01 through R1-04;
required verification failed as recorded. The next candidate needs the chosen design/check, maintained
counterexamples and fresh cumulative validation/review. The review branch contains only this record
and attachments. Nothing is pushed to `codex/tools-01`, merged, accepted or released.

CHANGES REQUIRED
