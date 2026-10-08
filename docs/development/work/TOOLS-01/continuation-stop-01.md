# TOOLS-01 continuation stop 01 — closure enforcement and unbound assertions

2026-10-04. Implementer: Codex (GPT-6), continuing the owner's supplied implementation request.
This is an implementation stop record under that request and 006, not independent review,
acceptance, a completed step 8, or a review-ready C/H handover. TOOLS-01 remains IN_PROGRESS.

## Identity and scope

- Contract: [revision 3](contract.md); implementation design: [design 05 revision 3](design-05.md),
  with [owner choice 03](owner-choice-03.md)'s exact Node v26.10.0 floor.
- Governing process baseline: `b759d0abc01915ea5abc94b4607c6f9101bbbcc7` (006/008/012).
  Packet base B remains `f62527e8d564a6e2f63b83cbb52e24053f333540`.
- Fetched subject: `3e4566ef7a775b53cfbdb54bb3d2d25feaadce1e`, branch `codex/tools-01`,
  remote `https://github.com/ArrokothI/arrokothi.git`. Fetch returned exactly the requested HEAD.
  Existing `e235e224` and `3e4566ef` history is preserved; neither was amended or squashed.
- Worktree: `/Users/linzhenglin/Desktop/ArrokothAI/tools-01-evidence`; the existing
  `arrokothi` checkout stays on `runtime-skills-mvp`. The managed worktree tool could not operate
  from this chat's non-repository parent directory; the fallback was `git worktree add`.
- No final C or H is declared. This record's containing commit is a diagnostic checkpoint; its
  pushed identity is supplied externally after the push. Push was pending when this record was written.
- Changes in this checkpoint are this report and its linked diagnostic directory only. No adoption,
  tooling implementation, tests under `tests/`, production, Layer-3, sealed records or 007 change.

The owner explicitly instructed: “if a step's mechanism cannot meet its criterion ... stop and
report the cause with evidence. Never adapt a mechanism silently.” The two findings below show
step 8's closure mechanism accepting records the approved criteria forbid. I stopped dependent
implementation before importing scratch records or closing origins. The known anchor question is
reported separately; it did not by itself cause this additional stop.

## New findings and reproductions

Both findings reproduce through the actual `corpus()` entry point in temporary Git repositories,
using committed tooling and the existing fixture builders without monkey-patching the checker.
[probe_closure.py](continuation-stop-01/probe_closure.py) is a maintained diagnostic: it exits 1
when either malformed closure is accepted. That exit means a reproduced defect, not a harness
failure. [probe-closure-result.json](continuation-stop-01/probe-closure-result.json) records the
subject and observations. It creates and cleans up its own fixture repositories. Reproduce from this diagnostic checkpoint with the existing pinned dependencies available; its
checker and fixture-builder bytes are unchanged from the subject:

```sh
export PATH="$HOME/.local/share/arrokothi/node-v26.10.0-darwin-arm64/bin:$PATH"
python3 -B docs/development/work/TOOLS-01/continuation-stop-01/probe_closure.py .
node docs/development/work/TOOLS-01/continuation-stop-01/enumerate_unbound.mjs . \
  docs/development/work/TOOLS-01/continuation-stop-01/unbound-requests.json
```

### TOOLS-CONT-01 — P1: reasons can waive mandatory sealed context

**Criterion:** P1 preamble, P1-G, design 05 D04-CHK-06; an artifact's required reading includes
named sealed records, transitively. Only other path/revision candidates may be reasoned away.

**Mechanism:** `scripts/packet_tools.py:2538` follows a pinned `docs/` record only when its path
is absent from `context_reasons`. At lines 2543–2544 any reason suppresses traversal, including
traversal of that record's dependencies.

**Counterexample:** a pinned origin says `Read docs/records/note.md.`; that note says
`Read docs/records/deeper.md.`. The closure includes only the origin's one line and supplies a
reason for omitting `note.md`. The full corpus reports one complete origin, one context range and
one reasoned candidate. Neither required sealed file is covered, and `deeper.md` is not discovered.
The result remains `extraction_pending` because another fixture origin remains open; no global
completion or acceptance is inferred.

**Root cause / earlier coverage gap:** the context parser distinguishes required records from
other candidates, then lets the generic reason map override that distinction. Existing tests cover
missing transitive ranges and reasons for other candidates separately; they do not combine a
mandatory sealed path with a reason.

**Required outcome:** determine mandatory dependencies before applying candidate reasons; require
and traverse each mandatory record even when a reason names it. Add negative controls for both
first-hop and transitive reason bypasses, and for any permitted reason category proposed by the
design author. No reduction of the minimum reading scope is proposed.

### TOOLS-CONT-02 — P1: ordinary records can close held members

**Criterion:** P1-H and P1-R; a held/superseded member closes through the corresponding attributed
witness, with claim and owner resolved through the hold register.

**Mechanism:** `origin_closure()` at `scripts/packet_tools.py:2578–2580` accepts any linked
counterexample whose `members` contains the held member. `witness_records()` at lines 2592–2594
validates only records that already declare a witness kind. A `behavior` record falls between
these two checks.

**Counterexample:** the fixture's recomputed register and preserved census classify a member as
held under Proxy. A linked `behavior` record lists that member but has no `claim` and no witness
kind. The full corpus reports its origin complete. The held count correctly remains 1; the defect
is false origin closure without the required attributed witness, not removal of the global hold.

**Root cause / earlier coverage gap:** the producer-selected record kind decides whether attribution
is checked, while the consuming closure checks membership alone. Existing tests validate a declared
witness's status and claim, but do not require the closure's chosen record to be a witness.

**Required outcome:** the closure must consume a validated, correctly typed witness for each held
or superseded member, with the matching claim and provenance. Exercise ordinary records,
wrong-kind records, missing/wrong claims and unrelated origins through the full corpus. Any new
`require` needs its refusal fixture and registered ablation; the existing 270-guard census is not
proof that these missing checks exist.

These are implementation enforcement gaps in the approved design. They do not justify weakening
that design. Suggested owner action: have the design author/checker confirm the closure invariants
and authorize the next repair round under the supplied stop rule. Alternatively record a revised
criterion or explicit limit through the owner process; neither is assumed here.

## Existing owner item: exactly 24 unbound members

The scratch targets cover 302 of the 326 refused preserved-table members. The remaining 24 have
41 direct assertion statements, every one repeated elsewhere in its file (including repetition
inside the same test). They remain refused, with no new binding or closure. This replaces the
handover's approximate “about 25” with the measured set.

[unbound-members.json](continuation-stop-01/unbound-members.json) preserves full member IDs, titles,
source digests, assertion text and all occurrence lines. [enumerate_unbound.mjs](continuation-stop-01/enumerate_unbound.mjs)
recomputes those statement occurrences from [unbound-requests.json](continuation-stop-01/unbound-requests.json).
It reads source bytes and counts occurrence lines using LF only; it does not use Python
`splitlines()` or universal-newline translation. Scope: direct `assert.*` / `t.assert.*` expression
statements in these callbacks, not a claim about arbitrary imported assertions.

| File | Pinned declaration | Current declaration | Repeated assertions |
|---|---:|---:|---:|
| `packages/kernel/tests/dispatch.test.ts` | 247 | 247 | 2 |
| `packages/kernel/tests/dispatch.test.ts` | 420 | 423 | 2 |
| `packages/kernel/tests/dispatch.test.ts` | 1527 | 1560 | 1 |
| `packages/kernel/tests/values.test.ts` | 572 | 572 | 2 |
| `packages/kernel/tests/values.test.ts` | 735 | 1039 | 2 |
| `tests/conformance/architecture/evidence-records.test.ts` | 157 | 158 | 1 |
| `tests/conformance/architecture/kernel-landing-zone.test.ts` | 221 | 226 | 2 |
| `tests/conformance/architecture/kernel-landing-zone.test.ts` | 238 | 243 | 2 |
| `tests/conformance/architecture/kernel-landing-zone.test.ts` | 246 | 251 | 2 |
| `tests/conformance/architecture/kernel-landing-zone.test.ts` | 254 | 259 | 2 |
| `tests/conformance/architecture/kernel-landing-zone.test.ts` | 262 | 267 | 3 |
| `tests/conformance/architecture/kernel-landing-zone.test.ts` | 310 | 315 | 2 |
| `tests/conformance/architecture/kernel-landing-zone.test.ts` | 346 | 351 | 2 |
| `tests/conformance/architecture/kernel-landing-zone.test.ts` | 357 | 362 | 2 |
| `tests/conformance/architecture/kernel-landing-zone.test.ts` | 365 | 370 | 2 |
| `tests/conformance/architecture/kernel-landing-zone.test.ts` | 1822 | 1827 | 2 |
| `tests/conformance/architecture/kernel-landing-zone.test.ts` | 1865 | 1870 | 2 |
| `tests/conformance/architecture/kernel-landing-zone.test.ts` | 1930 | 1935 | 1 |
| `tests/conformance/architecture/kernel-landing-zone.test.ts` | 1974 | 1979 | 1 |
| `tests/conformance/architecture/kernel-landing-zone.test.ts` | 2031 | 2036 | 2 |
| `tests/conformance/architecture/kernel-landing-zone.test.ts` | 2044 | 2049 | 1 |
| `tests/conformance/architecture/kernel-landing-zone.test.ts` | 2108 | 2113 | 1 |
| `tests/conformance/architecture/kernel-landing-zone.test.ts` | 4138 | 4143 | 1 |
| `tests/conformance/architecture/kernel-landing-zone.test.ts` | 4207 | 4212 | 1 |

Owner options remain open:
1. Ask the design author to propose a declaration-scoped anchor identity, with an independent
   design check and counterexamples for ambiguity, movement and wrong-test binding.
2. Authorize a separate test-source change that makes assertion text unique without changing its
   meaning; then regenerate the preserved census and reassess all affected members. No such test
   edit is authorized or made by this report.
3. Keep the existing rule and record an explicit owner limit or packet split, including the
   consequences for P1/P2 completion. Pending members cannot simply be relabelled complete.

No option was selected in the instruction received for this continuation. A non-binding question
was sent to the owner during the work; elapsed time supplies no authorization.

## Scratch reconciliation, validation and limits

The supplied archive SHA-256 matches
`c424b1627686bb1757891493546d6915df685af1da1552e80420b380f8a23710`.
It was unpacked outside the checkout. Paths in scratch scripts were rewritten to this worktree and
unpack directory. Scratch contents remain handover material, never imported pass evidence.

There are **398 targets**, not a total of 200: `klz` has 200 and the other ten named files together
have 198. The two prose-named duplicate files were excluded. There are 302 distinct targeted
members and 136 proposed witness records (62 held, 74 superseded). No scratch record was adopted.
The successful target checks below are P1-T checker observations only; `check_built.py` does not run
the full adoption graph, hold-register destination check or bounded semantic review.

At the clean subject `3e4566ef`, with the corrected workspace links:

| Command / observation | Result | Elapsed |
|---|---|---:|
| `cd tests/tooling && python3 -B -m unittest discover -s . -p 'test_*.py'` | 439 tests, OK, exit 0 | 196.391 s |
| `python3 -B tests/tooling/check-refusal-registry.py` | 270 guards / 270 registered mutations, exit 0 | 0.262 s |
| Scratch `check_built.py nondisclosure values ambient_reads control_commits refusals unsupported ingress evidence_records dispatch dispatch_433 klz` | 398 targets, 0 refused, exit 0 | 362 s, sum of rounded per-area durations |
| `python3 -B probe_closure.py <checkout>` | Both malformed closures accepted; expected diagnostic exit 1 | 14.022 s |
| `node enumerate_unbound.mjs <checkout> <unbound-requests.json>` | 24 members, 41 repeated direct assertions, exit 0 | 0.269 s including summary and host inspection |

The target results record 1,287 bound anchors, 1,174 reached anchors and 50 not-observable
anchors, with reading-only target credit. [check-built-summary.txt](continuation-stop-01/check-built-summary.txt)
and [check-built-results.json.gz](continuation-stop-01/check-built-results.json.gz) retain the final
scratch observations; [tooling-tests.txt](continuation-stop-01/tooling-tests.txt) retains the suite
output. [manifest.json](continuation-stop-01/manifest.json) binds these diagnostic attachments and
the checker/fixture sources to the subject. The first tooling run also passed (439, 219.569 s),
but the table uses the rerun after workspace-link correction.


Host: macOS 15.6.1 (24G90), arm64; Python 3.13.7; Node v26.10.0. Node was downloaded from
`https://nodejs.org/dist/v26.10.0/node-v26.10.0-darwin-arm64.tar.gz`, checked before extraction against
`751fdf7439f115d87ee2a8f3f18c065b6151852068e3e666ac60ac2996f75ac9`, and installed under
`~/.local/share/arrokothi/`. Its bin was first in PATH for tooling runs. Long jobs used `caffeinate -i`.

Setup attempts are not evidence: the first scratch run refused symlinked pinned dependencies;
the next was interrupted after noticing workspace package links into the other checkout. The final
run uses ordinary copies of the existing digest-pinned TypeScript/canonicalize subsets and workspace
package links into this candidate. No dependency or third-party source was added to Git. Existing
pinned dependency use, including its license/notice checks, continues; these diagnostics are original
repository-specific code, not copied external source.

**Not run:** composed verify, clean-C final verification, candidate C/H, mutation ablations for new
repairs (none implemented), full bounded semantic review/adoption of the scratch targets, family
extraction/adoption batches, sealed-log batteries, mentions/area gate, cumulative P2 self-review,
independent acceptance, live-provider and large-memory/timing profiles. The report does not reuse
historical pass counts as current results. It does not edit 007 or propose gate wording for a gate
that has not been built.

The starting census remains the recorded [step-6 census](preserved-census-01.md): 33 kept instead
of design 05's 47, and 296 prefix-refused instead of 282, because A10's documented fallback treats
the 14 later nondisclosure leaves as earlier. This continuation makes no new preservation census
claim and does not alter those rows. The 24 unbound members and two closure defects remain visible.

## Exact remainder and handoff

Resolve the two closure enforcement findings before closing origins; obtain the owner's separate
anchor decision. Then complete step 8 begun in `e235e224` and `3e4566ef`, including the fences,
probes, other whole-file origins, 77 case pairs and 30 non-executable rows; commit that actual
completion with the requested wording and measured differences. Continue steps 9–12 in order,
re-pin AGENTS.md in verification.json at P2, and supply a real clean C/H for independent reviews.

## Owner continuation received before this checkpoint

After the two defects and proposed contract-preserving repair were reported, the owner wrote
“繼續” (continue) in this implementer chat on 2026-10-04. I am proceeding with repair of the two
closure checks under the existing contract, with refusal tests and registered ablations. This
checkpoint preserves the pre-repair reproductions; the next implementation commit records repair
and validation. The continuation does not select an anchor-resolution option or authorize weakening
P1-T. No further confirmation is being requested for the two closure repairs.

This checkpoint is not review-ready and grants no acceptance, conformance credit, hold release or
successor release. There is no production fix or claim correction in it. Final remote identity and
working-tree status are supplied after committing and pushing the diagnostic checkpoint.
