```text
Correct the same released packet DESIGN-AUDIT-01 on codex/design-audit-01.
Base 66bc041175e6fc191c2e7cf88de198111e7d97c9; reviewed H 7ebf80d461c439459d0c8010c04c9fb197281a59; review record docs/development/work/DESIGN-AUDIT-01/review-01.md (Claude Code, claude-opus-5-5, 2026-10-01) with evidence in docs/development/work/DESIGN-AUDIT-01/review-01/, recorded on this branch after H.
Open findings DA01-R1-CLOSURE-01, DA01-R1-ARCH-01, DA01-R1-CLAIMS-01, DA01-R1-OPTION-01, DA01-R1-AUTH-01 (P2); P3 observations DA01-R1-CLASS-01, -SPAN-01, -SEARCH-01, -FLIP-01, -COORD-01. Required outcomes and counterexamples are in that record.
Owner supplemental decisions: none. Unresolved authority: the content of the owner's "six extra checks" (see question 3).
Read the brief below first. Answer its design questions in design-02.md; get the design check when 006 requires it. Apply 006 and 012: fix the mechanism, not only the listed counterexamples; add every counterexample to the corpus; then re-audit the whole cumulative packet. Fix additional in-scope defects with separate provenance. If the fix belongs in accepted earlier design, say so and ask.
Use 008 for the next report and 006 for new C/H plus evidence/push handoff. No successor release.
```

# Brief 02 — DESIGN-AUDIT-01, correction of the decision support

Prepared 2026-10-01 by the independent reviewer of round 1 (Claude Code, `claude-opus-5-5`). The owner
may edit it before forwarding. Brief-01's goal, bounds and stop conditions stay in force; this brief
adds what round 1 showed.

## Goal

Round 1's enumeration, probes and scope are sound, but its options cannot be adopted as written. The
family options share one closure and one claims list per family, and items A, B, C, F02, F09 and F10
recommend two incompatible Kernel cores. Give the owner one coherent, finishable set of choices, with
every accepted claim each option changes named.

## Criteria (finishable)

| ID | Criterion | Closes by | Evidence expected |
|---|---|---|---|
| DA-2/DA-4 (amended) | Every option of every qualifying family and of items A–F has its **own** closure (deterministic check, structural mechanism, or declared bounded search) that tests that option's mechanism, and its **own** affected-claims list | Deterministic check: no two options of one item have identical closure or claims cells, and no closure consists only of a reference to another item; plus the reviewer's reading of each closure | Updated register and drafts; a check added to the packet verifier; `review-01/da2/template_check.py` reports `False` for both "all identical claims" and "all suffix-only closures" |
| DA-3a (amended) | For each option of A, B, C and the families that depend on them: affected claims from a **declared claim inventory** (at least: values.md in-process capture and fixed limits; K1.2 decisions 03/04/05; DEC-8/9 and correction-01 amendments 02/03, including item 4's deferral of by-construction enforcement to this audit; AGENTS.md Trusted/Isolated; BASELINE's value section; 007's K1.1-correction-03 and K1.4 rows), each marked keep / narrow / remove; per-option SDK compatibility; per-option K1.1 findings made moot | Structural: every inventory entry has a disposition for every option (a table, checked by script for completeness) | Claim inventory file and per-option tables |
| DA-ARCH | One joint owner decision draft for the Kernel core's input form (live objects vs bytes/text, or another stated form), with A, B, C, D, E, F02, F09, F10 and K1.1-correction-03's scope mapped under each answer; every individual recommendation is consistent with that draft's recommendation or states its dependency | Structural: a cross-reference table, plus `review-01/da3/consistency_extract.py` showing no item recommending a core that the joint draft does not | New draft (for example `decision-drafts/CORE.md`) and updated items |
| DA-3 (owner extras) | The owner's six extra checks are recorded verbatim with provenance, each mapped to evidence, or recorded as unavailable with a question to the owner | Deterministic: six rows, each with a locator | Record in the report or a linked file |

DA-1, DA-5, DA-6 and DA-7 passed in round 1 and must keep passing at the new H (the packet verifier and
the round-1 regeneration checks).

## Known counterexamples (add to the packet corpus)

From `review-01/` (provenance: independent review 01):
- `da2/template_check.py`: all 16 family Recommend closures equal Keep plus a fixed suffix; claims cells
  identical.
- `da3/consistency_extract.py`: A/B/F09 versus C/F02 cores; F10 disjunction; C's "If A keeps objects…"
  conditional.
- `da3/claims_coverage.sh`: decisions 03/04, K1.4, values.md's environment obligations and AGENTS.md's
  "Kernel-mediated paths" are never named; `register.md:11` cites a values.md section that does not
  contain the statement.
- `a-missing-option/frozen-intrinsics-probe.mjs` and `kernel-under-frozen.mts`: under
  `--frozen-intrinsics` the K1.1 hostile mutations throw, Proxies remain, and the current Kernel
  refuses every value.
- `da1/classification-sample.md` rows 17, 18, 24, 33, 41, 46; `da5/span-audit.json` spans
  `dispatch.test.ts:1525–1558`, `creation.test.ts:992–1056`, `aggregate-refusal.test.ts:185–193`,
  `value-refusal-cost.test.ts:120–138`.

## Suspect design

- **The family data model.** `family-notes.json` stores one claims string and one closure string per
  family, so two options cannot differ; an uncommitted renderer appended a suffix; the verifier checks
  only that a cell is nonempty. Question: what record structure makes per-option claims and closures
  mandatory, and is the register rendered from it by a checked-in script?
- **Items authored separately.** A, B and C each chose locally. Question: what is the single joint
  choice, and how does each item read under each answer?
- **The claim column.** Claims were written from memory per item, not from an inventory. Question:
  which accepted statements does the inventory contain, and where is each one owned?

## Questions before writing

1. Under each answer to the core-input question, which packet owns O-R8-4 (K1.1-correction-03 by
   amendment, or a separate binding packet), and what does decision-05's meter measure?
2. Is realm hardening (Node frozen intrinsics, SES lockdown, or another mechanism) a real option for
   A/B? What are its cost, its third-party and licensing implications under AGENTS.md, the claims it
   affects (including the current window's refuse-everything behavior in a frozen realm), and its
   finishable closure? A reasoned exclusion is acceptable; silence is not.
3. What exactly are the owner's "six extra checks"? If the text is not available, ask the owner before
   claiming them.
4. Does a cooperative profile narrow AGENTS.md's Trusted-Execution statement that "Kernel guarantees
   apply to Kernel-mediated paths"? If so, how is the stable-realm assumption checked (for example
   deterministically at construction), and what happens when it is violated?
5. For each family whose recommendation is a refactor (F03, F11, F12, D), what structural check
   distinguishes the refactor from keep?

## Bounds

- Read-only on product code, tests, Layer 3, BASELINE and process documents, as in brief-01. Probes
  stay under `work/DESIGN-AUDIT-01/probes/`.
- Do not choose the threat model, the core form or any option. The audit drafts; the owner decides.
- Do not rerun the R8 timing corpus unless a derivation changes.
- The invalidation-01 and invalidation-02 holds stay. No successor is released.
- P3 observations may be fixed in the same round with separate provenance; they do not block.

## Stop conditions

As brief-01. Also stop and ask if the joint core decision cannot be drafted without a semantic choice
that only the owner can make (for example, whether the hostile in-process profile is supported at all).
