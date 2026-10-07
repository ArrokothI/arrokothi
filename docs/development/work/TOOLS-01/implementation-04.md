# Implementation 04 — TOOLS-01, round 4 (owner choices 10 and 11)

## Identity

- State: **WAITING_FOR_REVIEW**, entered by the implementer; this is not acceptance. Contract
  [revision 11](contract.md); the 006/008/012 policy is pinned at `b759d0ab…`, per the contract.
- Implementer: the Claude Code session (`claude-opus-5-5`) that wrote [implementation 03](implementation-03.md),
  under [owner choice 10](owner-choice-10.md), 2026-10-07. It had no part in reviews 03 and 04 or in
  design check 03.
- Owner authority: [release 01](release-01.md); owner choices [01](owner-choice-01.md)–[11](owner-choice-11.md).
  - Owner choice 10 binds at `60af5db9`.
  - The owner's answers to design 06 revision 4 are recorded verbatim in [design 06](design-06.md)
    revision 5 (`a0a5cd5f`).
  - Owner choice 11 binds at `4875f486`.
- Base B: `f62527e8d564a6e2f63b83cbb52e24053f333540`. Branch: `codex/tools-01`.
- Previous H: `7f3a2af46d714dc2a0e47a755ccd4fe8aeb0ba94`, with two reviews:
  - [review 03](review-03.md), CHANGES REQUIRED;
  - [review 04](review-04.md), ACCEPT with P3 findings LIST-01 and OVERLAP-01.
- Payload C: `83094969e591dba5c4f25d19c572522b78a7a396`, pushed. H is the commit containing this report, a direct child of C. By the owner's
  instruction H is committed locally and not pushed; its SHA is in the handoff.
- C..H allowlist ([verification.json](verification.json)): this report and
  `docs/development/007-work-packets.md`. The implementer does not edit 007; the design author adds the
  rows below to H.

## Changes and coverage (cumulative since implementation 03)

| Commit | Change |
|---|---|
| `297375d5` | Contract revision 10 ([owner choice 10](owner-choice-10.md)) |
| `26901667` | [Design 06](design-06.md) revision 4: the safe-position prototype, with [attachments](design-06-r4/README.md) |
| `b7598918` | [Design check 03](design-06-check-03.md) (GPT-6): CHANGES REQUIRED; triggers owner choice 10 §2 |
| `a0a5cd5f` | Design 06 revision 5: the coarse rule and the owner's answers to revision 4 |
| `4875f486` | [Owner choice 11](owner-choice-11.md) and contract revision 11 |
| `724a8bc1` | Every intrinsic reference is a V-ENV match; the hazard list removed; regression corpus |
| `5c921874` | The structural trace from intrinsic recognition to every credit consumer |
| `e1cb9f2a` | C2-LIMIT: rule-1 held listed members stay listed; owner choice 11's listed member |
| `83094969` (C) | The manifest regenerated; LIST-01 and OVERLAP-01 lists in [coarse-rule/](coarse-rule/) |

- **012 methods.** Deterministic execution:
  - review 03's 19 probe cases, the cross-product of 6 wrappers × 7 positions, and 12 same-name and
    rebinding cases;
  - design check 03's five false-preserved leaves, run through the real register and census;
  - 314 ablated refusals and 109 registry cases;
  - the full corpus at C.
- **Exclusions.** No Kernel, Runtime, hold-release or production claim.
- **Tests.** 573 tooling tests (561 before). No production, Layer-3, sealed-record or 007 file
  changed. The packet's only repository test-source edit is still the floor fix in
  `tests/conformance/effects/fast-slow-equivalence.test.ts` (`89b49e53`), recorded in
  [node-floor-04](node-floor-04.md).

### Findings

| Finding | Disposition |
|---|---|
| R3-01 (P1) | Fixed under owner choice 10 §2. Every intrinsic reference in a run set is a match, so wrappers and escape positions no longer matter. Review 03's nine misses, the full cross-product and the same-name cases are maintained tests that match. |
| R3-02 (P1) | Fixed under owner choice 10 §2. No callee name exempts anything; `keys`, `helper.keys` and local readers match like any other reference. |
| D06C3-01, D06C3-02 (P1, design check 03) | Moot under §2's exit. The five false-preserved leaves are a maintained test: all nine poison and victim members are `held` under V-ENV. |
| TOOLS01-R4-LIST-01 (P3) | Lists committed at C: [rule-1-entries.json](coarse-rule/rule-1-entries.json) has 853 keys. Each is marked if it is one of review 02's 44 (all present) or implementation 03's 188 (all present). [relinked-origins.json](coarse-rule/relinked-origins.json) has 80 origins relinked since implementation 02: implementation 03's 18 (one now transferred) and this round's 70. |
| TOOLS01-R4-OVERLAP-01 (P3) | 96 V-ENV-matching entries stay with K1.1-correction-03's category claims (56 at implementation 03's H), as owner choice 08 §2.3 and the owner's design 06 answer 1 state. All are listed in [category-v-env-entries.json](coarse-rule/category-v-env-entries.json). BINDING-01's transferred classification does not include them. |

### Self-found defects (in the commit messages)

- **`extends` was read as a type** (`724a8bc1`). TypeScript counts a heritage clause's expression as
  a type node, so `class X extends Error` was never read as a value. Revision 4's prototype had the
  same miss.
- **Tooling fixtures used intrinsics only incidentally** (`724a8bc1`). They now avoid them and keep
  each test's purpose:
  - `throw new RangeError` became a thrown plain object;
  - `Math.min` became a same-token `Calc.min`;
  - `Math.max` and `String.raw` in the prefix-rule cases became `[1, 2].indexOf(2)` and an inline tag.
- **Trailing whitespace in `design-06-r4/prototype.diff`'s blank context lines** was removed before
  commit `26901667`. The diff still applies byte-identically.

### Owner decisions applied this round

- Owner choice 10 §2's exit (revision 5): every member whose run set references any intrinsic value is
  held, and no table exempts anything.
- **Owner choice 11's three closed origins.** Their only routes were targets that are now at rule-1
  held leaves. They transfer to TOOLS-02: their state is `pending_revalidation`, their closures are
  removed and their list is pinned. 107 of 110 stay closed, and none loses a route otherwise.
- **The listed member.** `kernel-landing-zone.test.ts:1200:9@deedd7950724` is listed by owner choice 11
  under `limited.listed`, and the C2-LIMIT admission rule is unchanged. It is an open item for
  TOOLS-02.
- **For review: 22 of choice 04's 24 listed members are rule-1 held under the coarse rule.** The
  owner's answer 1 to revision 4 named the two that revision 4's prototype held. C2-LIMIT applies the
  same reading to every listed member: one held by rule 1 stays listed and earns no credit. A listed
  member held under a category claim is refused.

## Figures

| Figure | H `7f3a2af4` (C `28258b28`) | Revision 4 prototype | This C |
|---|---|---|---|
| Members: preserved / held / superseded / refused | 713 / 183 / 74 / 302 | 616 / 314 / 74 / 268 | 49 / 1,095 / 74 / 54 (664 preserved and 248 refused members now held) |
| Register entries / rule-1 entries / `not_held` | 305 / 188 / 20 | 393 / 295 / 1 | 950 / 853 / 0 |
| V-ENV matches under a category claim (OVERLAP-01) | 56 | — | 96 |
| Suite target rows / credited | 383 / 381 | 315 / 306 | 52 / 15 |
| Witness records | 257 | — | 1,169 |
| Closed origins | 110 | 110 | 107 (owner choice 11 transfers 3); 70 change links |
| Transferred origins | 44 | 44 | 47 (4 + 40 + 3) |
| C2-LIMIT: listed / held listed / extras | 24 / 0 / 2 | 24 / 2 / 9 | 25 / 22 / 33 (dispatch 18, kernel-landing-zone 14, values 1) |
| Tooling tests; refusal ablations; registry cases | 561; 307; 109 | — | 573; 314; 109 |
| Structural trace: sites / keys (cases) / members / targets | — | — | 8,910 / 949 (95) / 1,167 / 37 |

## Criteria (implementer assessment, not acceptance)

| Criterion | Assessment and evidence |
|---|---|
| F1 | Candidate facts: ancestry, the exact C..H set and preserved paths. The check runs on the committed H; see the handoff. |
| F2 | The inventory of 1,549 origins is verified; origin IDs are unchanged. |
| F3 | Probe route: 109 registry cases, all killed at C. The target-set route never returns `killed` (owner choice 09). |
| F4 | Declared environment and census; floor v26.10.0; temporary copies only. |
| F5 | Summaries keep origins, members, targets, kills (0), holds, detector kinds, the trace and areas separate. |
| F6 | `tests/tooling/README.md` documents the coarse rule, the trace and C2-LIMIT. No third-party material is added. |
| P1-T | 15 targets pass at C as readings. The mapping targets fail only P1-H. No mutation kills. |
| P1-P | Census 49 / 1,095 / 74 / 54. Every held member has an attributed witness. |
| P1-H | Register 950. Every key with a detector site is held (the trace). Every held or superseded entry names its decision. Rule 1 holds every V-ENV match; category entries keep their decisions. |
| P1-R | 107 of 154 revalidation origins close. The open ones are exactly the 47 in owner choices 04, 05 and 11's pinned lists, and C2-LIMIT binds the limit. |
| P1-G, context | Unchanged from implementation 03: one block parse; no uncertain minimum context. |
| P1-M | TOOLS-02's (owner choice 04). |
| P1-X | Advisory gate in every `verify` (owner choice 07). |
| P1-C | Adoption, execution, holds and acceptance stay separate; not-run profiles are listed. |
| P2 | Composed verify at clean C below; this self-review; independent review pending. |

## Area gate at C (owner choice 07)

TOOLS-01's own B..C at C: 345 changed paths, 69 of them behaviour-bearing (owner choice 06 rule 1).
The advisory result is `reported`.

| Touched area | Open origins | `prose_pending` |
|---|---:|---:|
| `package.json` | 47 | 0 |
| `package-lock.json` | 26 | 0 |
| `tests/conformance/effects` | 17 | 0 |
| `tooling` | 10 | 0 |

That is 69 distinct origins (64 `pending`, 5 `pending_revalidation`) and 664 `ungated`, as at
implementation 03. No origin was triaged or closed for the gate.

## Validation at clean C

`python3 -B scripts/packet_tools.py verify --revision 83094969e591dba5c4f25d19c572522b78a7a396 --spec docs/development/work/TOOLS-01/checks.json`,
Node v26.10.0 and Python 3.13.5, under `caffeinate -i`, alone. It ran in a fresh `git clone` checked
out at C, with `node_modules` copied from the implementer's worktree. **`checks_passed`**,
2026-10-07 20:11:56–20:49:28Z (37 min 32 s).

| Step | Result |
|---|---|
| tool-tests | 573 tests OK |
| inventory | `provenance_verified`: 1,549 origins (208 artifact, 1,333 mention, 8 additional) |
| adoption | `revalidation_complete`: 107 complete, 47 transferred (4 / 40 / 3 by owner choices 04 / 05 / 11), 1,395 pending; 52 targets, 15 `target_reading`, 37 refused by P1-H only; census 49 / 1,095 / 74 / 54; register 950 (853 by rule 1, 95 cases); trace 8,910 sites over 949 keys, 1,167 members and 37 targets at traced leaves, none credited; 107 closures with 113 context ranges; 0 kills |
| dimensions | `coverage_reported` |
| registered-mutants | 109 of 109 killed |
| refusal-mutants | 314 of 314 killed |
| refusal-census, oracle-census | pass |
| typecheck | pass |
| repository-tests | 3,774 tests; 0 fail, cancelled, skipped or todo |
| archive-tests | 4 tests; 0 fail |
| kernel-sweeps | pass |
| area-gate | `reported` (advisory) |

Before pushing C, the implementer also ran `corpus` (`revalidation_complete`, 183 s) and the
registered mutants (109 of 109 killed, 485 s) at C. The F1 `candidate` check runs on this C/H after H
is committed; its result is in the external handoff, not in this report.

Not run: the `live-provider`, `large-memory-timing` and `known-base-failure` (`builder-docs`)
profiles, by owner choice 01 and checks.json's limits. Not run either: any Kernel release or hold
evaluation.

## Proposed 007 wording (the design author applies)

1. **TOOLS-01 status row**, replacing the current one:

   ```markdown
   | TOOLS-01 | WAITING_FOR_REVIEW | Owner [release 01](work/TOOLS-01/release-01.md), 2026-10-02; branch `codex/tools-01`, base `f62527e8d564a6e2f63b83cbb52e24053f333540`; contract [revision 11](work/TOOLS-01/contract.md) (owner choices 01–11). C `83094969e591dba5c4f25d19c572522b78a7a396`; [implementation 04](work/TOOLS-01/implementation-04.md), correcting review 03 by owner choice 10 §2's coarse rule ([design 06](work/TOOLS-01/design-06.md) revision 5). 107 of 154 revalidation origins closed; 47 transferred and 1,395 pending origins left to TOOLS-02; every member whose run set references an intrinsic value held under V-ENV (owner choices 08 and 10); target-set mutations earn no kill (owner choice 09); advisory area gate in every `verify`. Independent review pending; no acceptance or successor release. |
   ```
2. **TOOLS-02 scope** ([owner choice 11](owner-choice-11.md)). After "the 40 revalidation origins
   transferred by owner choice 05.", add:
   > It also takes the three origins transferred by
   > [owner choice 11](work/TOOLS-01/owner-choice-11.md), whose only closing targets sit at rule-1 held
   > leaves. It binds `kernel-landing-zone.test.ts:1200:9@deedd7950724`, which owner choice 11 lists
   > among the limited members, normally, or designs multi-leaf target admission if more such
   > members exist by then.

## Risks and limits

- **Most of the corpus is held.** Under owner choice 10 §2, 49 members keep preserved credit and
  15 targets keep reading credit. Everything with intrinsic contact is BINDING-01's to classify.
- **The detector is still syntactic.** These are stated gaps: values that never meet a recognized
  reference in the run set, production modules, native code, inherited members of ordinary values
  (`[].push`), and state another test leaves in an ordinary container.
- **Traced reads depend on the checkout's directories.** Run `corpus` and `verify` in a clean clone.
- **No target-set kills in TOOLS-01** (owner choice 09).
- **Third-party review under AGENTS.md:** none needed. No third-party code, dependency or asset was
  added.

## Handoff

Ready for independent review of the exact C/H. No self-acceptance; successor release stays with the owner.
