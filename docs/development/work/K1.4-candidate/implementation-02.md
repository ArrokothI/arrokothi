# Implementation report — K1.4-candidate, round 2

The correction after independent review 01. Round 1 is [implementation report 01](implementation-01.md); this
report covers what changed since its candidate and does not repeat what stands.

## Identity

- **Packet:** K1.4-candidate. Records for this round:
  - [review 01](https://github.com/ArrokothI/arrokothi/blob/7b8a63fa5f087f870663bc143257e5181d0d385c/docs/development/work/K1.4-candidate/review-01.md),
    CHANGES REQUIRED of H `484afd13d7652958f6496afc56d9aa9c098d58b1`, with K14C-R01-01, -02 and -03 (Codex GPT-6,
    `codex/k1.4-candidate-review-01` at `7b8a63fa5f087f870663bc143257e5181d0d385c`). The review, its
    [brief 02](https://github.com/ArrokothI/arrokothi/blob/7b8a63fa5f087f870663bc143257e5181d0d385c/docs/development/work/K1.4-candidate/review-01/brief-02.md)
    and its probes were read by commit. Nothing was merged from that branch;
  - [owner choice 03](owner-choice-03.md) ("Register them"): the owner's answer to K14C-R01-02 and instructions
    for the other two findings;
  - [design 02](design-02.md), which answers brief 02's three questions before the payload.

  Process: [006](../../006-development-process.md), [008](../../008-implementation-report.md),
  [012](../../012-review-methods.md), [017](../../017-known-limitations.md).
- **Implementer:** Claude Code desktop, Claude Fable 5.2 (`claude-fable-5-2`), on the owner's Mac (arm64),
  2026-11-15. Node v26.10.0, npm 11.19.1, Python 3 and `gh`. It used no subagents. It is not the planner, the
  design checker or the reviewer.
- **Branch:** `claude/k1.4-candidate`.
  - Base B: `c1951226338de6ccd3e4e6289259549551268f61`, main after PR #69.
  - Reviewed candidate: H `484afd13d7652958f6496afc56d9aa9c098d58b1` over C
    `61ea8126507506b043ce5ba6515073f62c19c42f`.
  - Round-2 records: `c3887f604ee70807027c9b6ed9ac1cc22e893fdb` (review 01 in 007, owner choice 03, design 02).
  - Payload C: `7392e4a640c07c9a2989464cd2a979938c37ee25`.
- **Candidate H:** the commit containing this report. C..H changes exactly the spec's administrative allowlist:
  this report, the 007 row and `progress.md`.
- **Push:** C was pushed before the CI dispatch. H is pushed after this report is committed; its SHA goes in the
  external handoff.

## Changes (H `484afd13`..C)

`packages/`, `scripts/` and `tests/tooling/` are byte-identical to B: **no Kernel source and no packet tool
changed**, and no dependency was added. The fixture's scenarios, runner and oracle are untouched.

| Group | Files |
|---|---|
| **K14C-R01-01.** The candidate's timeout names keep their source: a `TimeoutNames` table per Execution replaces the plain alias table for this family | `tests/conformance/k0-candidate/kernel-candidate.ts` |
| **Its tests.** Review 01's two probes and seven adjacent cases | `conventions.test.ts` |
| **K14C-R01-02.** Five registry cases, their coverage family and category, five hold-register entries | `tests/fixtures/packet-tools/{mutations,coverage,adoption}.json` |
| **The registry's runner and the shared table.** The probe the registry runs; the five rows moved out of the test file so both runners read one table | `ablation-probe.mjs`, `ablation-table.ts` (new) |
| **The maintained test.** Reads the shared table; binds each registered mutant to its row; runs the probe's control; holds the latest-grant witness | `ablations.test.ts` |
| **K14C-R01-03.** The gate sentence | `mental-model/mechanisms/evidence.md` |
| **Limits and guards.** 017 L-39 and L-44; the README; the directory's file classification; one mapping row | `docs/development/017-known-limitations.md`, `README.md`, `boundary.test.ts`, `tests/conformance/legacy-mapping.json` |
| **Packet records and spec.** Owner choice 03, design 02, the 007 row, `progress.md`, the verification spec | `docs/development/work/K1.4-candidate/`, `docs/development/007-work-packets.md` |

**Ownership.** Test-side adapter code, evidence-tooling data and one Layer-3 sentence. No Kernel, Runtime,
Driver or deployment semantics change.

## The result

The verdicts are unchanged: **12 PASS and 3 REFUSED** through the fixture's unmodified runner, pinned exactly.
This is the candidate's own report, **not an E1 result**.

## The three findings

### K14C-R01-01: a refused timeout name fell into the unnamed label

- **Mechanism.** `Aliases.bind` returned nothing, so a refused pair left its ID looking like one no command had
  named, and the `to-<generation>` label then covered the conflict. The label itself was never recorded, which
  allowed a second collision the review did not reach: a command could give one timeout another timeout's label.
- **Repair.** `TimeoutNames` records how each timeout ID is shown and why: by a command, by the convention, or
  exposed. A name denotes at most one ID for the whole run, and labels are names in that same map. An ID changes
  name at most once, from its label to the first command name. An offered name or label that already denotes
  another ID is not bound, and the ID it was offered for is shown as `kernel-event:<id>` from then on.
  [Design 02](design-02.md) §1 has the rules.
- **Provenance to projection.** The projection no longer infers "unnamed" from a missing entry. It asks the
  table, which answers from the recorded source.
- **Evidence.** Nine tests in `conventions.test.ts`. Six fail against H's candidate (I ran them against it): the
  review's collision probe, its changed-ID probe in two spellings, and three adjacent collisions. Three hold at
  H and pin preserved behavior: later naming, duplicate and ended-generation fires, and per-Execution scope.
- **Unchanged.** Ordinary named and unnamed timeouts, later explicit naming, and the naming contract of addendum
  §A4. `KERNEL_CANDIDATE_VERSION` stays `/1`, because no capture has pinned it.

### K14C-R01-02: the ablations were outside the mutation registry

- **Owner choice 03: register.** ABL-1 to ABL-5 are cases `k14-candidate.abl-1` to `-5` of
  `tests/fixtures/packet-tools/mutations.json`. Each has one mutant, the row's one edit to `packages/kernel/src`,
  with its site, its obligation and its rejecting test.
- **No packet-tools change and no waiver was needed**, so the owner's stop condition did not fire. `scripts/`
  and `tests/tooling/` are preserved at B by the spec. Registration is data plus one probe file:

  | Existing check | What it needed |
  |---|---|
  | `registered-mutants` | The five cases and `ablation-probe.mjs` |
  | `dimensions` | Category `k14-candidate-ablation` and family `k14-candidate` in `coverage.json` |
  | `adoption` | Five hold-register entries in `adoption.json` |

- **Honest hold records.** The tool recomputes that each case's run set matches two released claims: `V-ENV`,
  because its detector matches any reference to a built-in such as `Map` or `JSON`, and
  `re-prototyped-built-in`, because the word `__proto__` appears in two comments. So the entries are `unread`
  and the cases are `mechanism_witness` records, like all 303 existing cases. The tool reports
  `semantic_credit: none` for them. **A registry kill of these rows earns no conformance or correction credit**,
  and 017 L-44 says so.
- **The runner.** The probe runs the row's schedule through `kernelCandidate`. A PASS is the control. A FAIL is a
  kill only if it is the row's: first failure at the row's step, every listed field named, the row's observed
  text, no throw. Anything else makes the probe throw, which the registry records as invalid.
- **One table.** `ablation-table.ts` holds the rows. The maintained test and the probe both read it, and a test
  checks each registered mutant against its row.
- **Evidence.** The registry's own runner, restricted to these five cases at a local commit: five controls
  passed and five mutants were killed, each by its row. The full registry run is Packet verify's.
- **Kept.** The maintained test still requires the exact-once anchor, the unedited-copy PASS and the named step
  and fields.

### K14C-R01-03: the gate sentence was a general waiver

The sentence in `evidence.md` § Attribution and gates now reads:

> A gate's scope is its owner's decision, recorded where the gate is defined. An exclusion from a gate's matrix
> is valid only when it lies within that approved scope and is declared, with its reason, before the capture. A
> subject that lacks the surface for an in-scope obligation is not exempt from it: that obligation is missing
> gate evidence. An excluded schedule the subject refuses stays in the result as a refusal, never as a pass or a
> violation.

The K1 decision stays where it is owned. Bounded text check against owner choice 02: 007 (the K1.4-candidate
and K1.4-gate sections and rows, the K2.4 acceptance, the K1, K2 and K3 milestone rows, K3.4), `001`,
`mental-model/roadmap.md`, the candidate README and 017 L-38. Each states the twelve-schedule K1 matrix and the
three K2 assignments as that decision, and none states a general rule. Nothing else changed.

### The latest-grant adapter mutant

Kept as a maintained witness in `ablations.test.ts`, as the owner asked. The mutant presents the newest grant
delivered for the Execution instead of the attempt's own.

- It gives the same fifteen verdicts as the candidate, 12 PASS and 3 REFUSED, while presenting a newer grant
  with an older proposal. The candidate never does that.
- Under ABL-2's Kernel edit, the candidate's stale Outcome is still refused as `unauthorized_submission`. The
  mutant's is not, so ABL-2's check rejects the mutant.

It is not a registry case: it is an adapter edit whose kill needs a Kernel edit at the same time.

## Brief 02's criteria (implementer's assessment, not acceptance)

| ID | Assessment |
|---|---|
| R02-1 | Met: the conflict never enters the Q2 b label; the review's reproducer and the adjacent cases are maintained tests; design 02 §1 explains how provenance reaches the projection. |
| R02-2 | Met by registration: registry entries, the required hold records, and the exact-C workflow run below. No semantic credit is claimed. |
| R02-3 | Met: the sentence ties exclusions to the owner-approved scope; the bounded text check is listed above. |
| R02-4 | KC-1 to KC-6 and the non-deferred D01 checks hold as report 01 gave them, with D01-CHK-02, -06 item 3 and -09 and KC-6 changed by this round. 12 PASS and 3 REFUSED stay pinned. The fixture and `packages/` are unchanged. D01-CHK-04 stays with K2.4/E2. |

## Deviations and points for the reviewer

1. **Exposure, not a throw.** A conflicting timeout name shows the new ID in the Kernel's spelling and the run
   continues. Brief 02 allowed either. A throw would end the run at that step and hide what the Kernel did next.
2. **The probe writes one link into the registry's temporary copy.** That copy has no workspace install, so the
   package name `@arrokothi/kernel` resolves nowhere, and the candidate must import the package root. With
   `--link-workspace-kernel` the probe links `node_modules/@arrokothi/kernel` to the copy's `packages/kernel`
   when the link is absent, then checks by real path that the package root resolves to the copy's own source.
   Without the flag it creates nothing. This is the workspace's own link, but it is a file-system write by a
   probe.
3. **A new registry category**, `k14-candidate-ablation`, with one coverage family. `k13-semantic` is the
   precedent.
4. **Design 02 had no design check.** Brief 02 put three questions before code and the owner's message answered
   the second. I wrote design 02 and built in the same round, as owner choice 02 allowed for round 1's routine
   corrections. The reviewer may weigh whether §1's rules needed a check.
5. **`ablations.test.ts` grew.** Its inline table moved to `ablation-table.ts` and its runner now also copies the
   candidate for the latest-grant witness. The five ablation tests keep their titles and their rules.
6. **Round 1's open points stand** as report 01 listed them (the stale "unimplemented" wording left in place,
   the Layer-3 sentence beyond the brief's list, the local SDK timing flake).

## Validation

- **Packet verify (CI), at clean C:** run [`43704493967`](https://github.com/ArrokothI/arrokothi/actions/runs/43704493967),
  `packet-verify.yml`, revision `7392e4a640c07c9a2989464cd2a979938c37ee25`, spec
  `docs/development/work/K1.4-candidate/verification.json`: `checks_passed`, 19 of 19 checks, exit 0, on Node v26.10.0; repository tests 5,225 of 5,225 with no failure, skip or todo. `registered-mutants` ran 308 cases and killed 344 mutants (303 and 339 in round 1): each of the five new cases passed its control and killed its mutant by its own row, with `semantic_credit: none`. `adoption` reports `mappings_complete` with 308 case entries, and `dimensions` counts five `k14-candidate-ablation` cases. The artifact `packet-verify-7392e4a640c07c9a2989464cd2a979938c37ee25` records `revision` and `head` both equal to C in `run.txt`.
- **Local, Node v26.10.0, at the working tree that became C:** `npm run typecheck` exit 0; `npm test`
  5,225 of 5,225, no skip; `npm run check:builder-docs` passed (75 Markdown files, 2,353 links and anchors). The candidate's five test files: 171 tests (158 in round
  1, plus nine convention tests and four ablation tests).
- **Local, fresh clone at C:** `packet_tools.py corpus` reports `mappings_complete`; `coverage` reports
  `coverage_reported`. `packet_tools.py candidate` over B, C and H reports `facts_verified`.
- **Local, the registry's runner on the five new cases only:** `selected_cases_passed`, five killed.
- **Not run:** the benchmark's E1. No credentialed or live-provider profile.
- **Claim limits:** every verdict above is this repository's run. The three refused schedules are not evidence
  of anything about the Kernel. The registry kills are mechanism witnesses with no semantic credit.

## Reference maintenance

- Accepted semantic sources: owner choice 02 (the K1 gate's matrix); owner choice 03.
- Layer 3 changed: `mechanisms/evidence.md` § Attribution and gates, the one sentence rewritten. No Layer-1 or
  Layer-2 change.
- 017: L-39 states the provenance rule; L-44 is rewritten for the registered cases.
- Inspected and unchanged: `mental-model/roadmap.md`, `001`, BASELINE §15, 017 L-38.

## Third-party review

None needed. No third-party code, test, asset or dependency was copied, adapted, vendored or added. Review 01's
probes are this repository's own review evidence; the maintained tests were written from their descriptions
against the repaired behavior.

## Handoff

- Ready for independent review of the cumulative candidate by a Codex GPT-6 session (owner choice 01).
- Strongest remaining risks: the exposure rule's choices in design 02 §1; the probe's link; the two
  corpus-derived conventions (L-39, L-40); the 51 steps not run (L-38).
- Base, C and H with the verified remote SHA are supplied in the external handoff.
- No self-acceptance. K1.4-gate and the benchmark's E1 round 3 remain the owner's and the benchmark owner's to
  release.
