# Arrokothai review priorities — where it may be worse than the other implementations

Derived from the frozen `analysis/` tables (semantic-summary.json = "Table B", pairwise-summary.json
+ disagreement-audit.json = "Tables C/D") in the parent analysis. This file only *points* at
conversations to read — it makes no claims and changes no scores. All links go to
[`p01/*.md`](p01) / [`p02/*.md`](p02) in this same folder; open the file and jump to the named
`## Repeat rNN` section (Ctrl/Cmd-F for "Repeat r0X" if your viewer doesn't follow the anchor).

Sections, in suggested reading order:

1. **Highest priority** — a real correctness bug, not a style/criterion-mismatch issue
2. **Table B: semantic score-0 / hard violations** — the semantic judge scored Arrokothai's own
   answer as failing a requirement (nothing to do with the other implementations)
3. **Table C/D: pairwise losses, non-stylistic** — Arrokothai lost a blind A/B/tie/both_bad
   comparison against original or agenerateor for a *content* reason (missed fact, wrong number,
   wrong routing) — most informative
4. **Table C/D: pairwise losses, markdown-formatting only** — Arrokothai lost mainly because it
   used bold/bullet markdown when the scenario requires plain, markdown-free replies — one
   systemic, mostly-P02 pattern; a few representative links, not all of them
5. **Criterion-level summary** — which of the 6 pairwise criteria Arrokothai loses on most,
   per pair

---

## 1. Highest priority — likely a real bug, not a judgment call

| Scenario | Repeat | vs. | What the pairwise judge flagged |
|---|---|---|---|
| [P01-V2-S18 — Long conversation with older corrected fact](p01/P01-V2-S18.md#repeat-r02) | r02 | p01-original | "Candidate A [Arrokothai] suffers from a major calculation error in Turn 10, where it randomly states the volume for the 510 sq. ft. wall is 1.18 cubic met[ers]..." — a wrong number stated mid-conversation, not a style preference. |
| [P02-V2-S14 — Duplicate completion must not duplicate handoff](p02/P02-V2-S14.md#repeat-r05) | r05 | p02-agenerateor | "Assistant B [agenerateor] successfully avoids duplicating the external handoff dispatch (or claiming to do so) during the post-completion edit in turn 5, whereas Assistant A [Arrokothai]..." did not — this scenario exists specifically to test idempotent dispatch; also read repeats r01–r04 of this same file, several of which independently criticize Arrokothai's markdown use in the *same* multi-turn handoff flow. |

---

## 2. Table B — semantic judge scored Arrokothai's own answer as failing

These are **not** comparisons against another implementation — the semantic judge read Arrokothai's
transcript alone and scored a specific requirement 0 (out of 0/1/2), independent of what original
or agenerateor did. 4 scenarios, 12 runs total.

### P01-V2-S04 — Structural and code question in one turn (all 3 repeats)

Requirement: correctly cite **2024 IRC Appendix BL** and state the safety facts (100% legal, 0% THC,
fire-resistant). Every repeat scored 0 on both P01-R11 (wrong/missing code citation) and P01-R10
(missing safety facts), and P01-R11 was flagged as a **hard semantic violation** in all 3.

- [Repeat r01](p01/P01-V2-S04.md#repeat-r01) — "assistant... incorrectly claimed that hemp-lime is not yet part of the International Residential Code."
- [Repeat r02](p01/P01-V2-S04.md#repeat-r02)
- [Repeat r03](p01/P01-V2-S04.md#repeat-r03) — "only mentioning 'Ap[pendix]...'" (wrong/incomplete citation)

*(This exact pattern also shows up repeatedly in section 3 below — original and agenerateor both beat Arrokothai here in every pairwise comparison for this scenario too, so this looks like a consistent, repeatable weak spot rather than a one-off.)*

### P02-V2-S01 — Buyer happy path with grounded Manhattan matches (all 3 repeats)

Requirement P02-R03: recommend the actual matching Manhattan listings from the catalog.

- [Repeat r01](p02/P02-V2-S01.md#repeat-r01) — "failed to recommend the matching Manhattan properties (records 2 and 4) and incorrectly [claimed something else]"
- [Repeat r02](p02/P02-V2-S01.md#repeat-r02) — "falsely claimed there are no properties in Manhattan under $20M"
- [Repeat r03](p02/P02-V2-S01.md#repeat-r03) — "falsely claimed there are no showcased sale properties in Manhattan under $20M"

This is a grounding failure: real matching listings existed in the catalog and Arrokothai said
none did. Worth checking whether this is a retrieval/tool-use issue specific to Arrokothai's
architecture.

### P02-V2-S05 — Cross-step budget and location correction (repeat r02 only)

- [Repeat r02](p02/P02-V2-S05.md#repeat-r02) — P02-R03: "failed to correctly restrict the active property records to only the West Village propert[ies]" after the user corrected location mid-conversation.

### P02-V2-S17 — Handoff outcome unknown (repeats r01, r02, r03, r05 — 4 of 5)

Requirement P02-R14: when the backend reports the handoff outcome as **unknown**, say so — don't
claim success. All 4 flagged repeats have identical deterministic mechanics (dispatch happened
once, outcome correctly recorded as `outcome_unknown`) but the assistant's *reply text* claimed
definite success anyway. Also flagged as a hard semantic violation in all 4.

- [Repeat r01](p02/P02-V2-S17.md#repeat-r01) — "claimed definite success in turn 3 by stating 'I have transmitted your request...'"
- [Repeat r02](p02/P02-V2-S17.md#repeat-r02) — "claimed definite success ('I have transmitted your details')"
- [Repeat r03](p02/P02-V2-S17.md#repeat-r03) — "claimed definite success by stating 'our team has received your request'"
- [Repeat r05](p02/P02-V2-S17.md#repeat-r05) — "claimed definite success by stating 'I have transmitted your contact details and criteria...'"

(r04 was not flagged the same way — worth comparing against the other four to see what's different.)

---

## 3. Table C/D — pairwise losses, non-stylistic (content/task issues)

Blind A/B comparisons where Arrokothai lost and the judge's stated reason was about facts, numbers,
or task handling — not formatting. Grouped by scenario; every repeat listed lost to **both** other
implementations unless noted.

| Scenario | Repeats (Arrokothai lost) | Issue |
|---|---|---|
| [P01-V2-S02 — Bedroom retrofit workflow](p01/P01-V2-S02.md) | [r01](p01/P01-V2-S02.md#repeat-r01), [r02](p01/P01-V2-S02.md#repeat-r02), [r03](p01/P01-V2-S02.md#repeat-r03) | Recommends the wrong wall thickness/volume — judge wanted 2.5–3in / 2.5–3 m³ for this specific interior-retrofit workflow. |
| [P01-V2-S10 — Change of mind about construction method](p01/P01-V2-S10.md) | [r01](p01/P01-V2-S10.md#repeat-r01), [r02](p01/P01-V2-S10.md#repeat-r02), [r03](p01/P01-V2-S10.md#repeat-r03) | Misses the drying/curing-time distinction between pre-cast blocks and cast-in-situ when the user switches methods mid-conversation. |
| [P01-V2-S05 — Drying comparison driven by deadline](p01/P01-V2-S05.md) | [r01](p01/P01-V2-S05.md#repeat-r01) (vs agenerateor only) | Misses that cast-in-situ formwork can be removed the next day. |
| [P01-V2-S06 — Cost question without dimensions](p01/P01-V2-S06.md) | [r02](p01/P01-V2-S06.md#repeat-r02), [r03](p01/P01-V2-S06.md#repeat-r03) (vs agenerateor only) | Doesn't prompt for project-specific dimensions / omits required planning-assumption figures (15-20% cost, 30-40% HVAC savings, 3-5yr payback). |
| [P01-V2-S07 — Marijuana-myth concern](p01/P01-V2-S07.md) | [r01](p01/P01-V2-S07.md#repeat-r01), [r03](p01/P01-V2-S07.md#repeat-r03) (vs agenerateor only) | r01: makes a joke referencing "recreational benefits" (tone risk on a sensitive myth-correction scenario). r03: says "typically less than 0.3% THC" instead of the required 0% THC fact. |
| [P01-V2-S09 — Correction after an estimate](p01/P01-V2-S09.md) | [r03](p01/P01-V2-S09.md#repeat-r03) (vs agenerateor only) | Both mathematically correct, but Arrokothai "repeats" itself — a conversational-coherence issue on a correction-handling scenario. |
| [P01-V2-S12 — Off-topic product fact mid-sizing](p01/P01-V2-S12.md) | [r01](p01/P01-V2-S12.md#repeat-r01) (vs original only) | Omits the legality/safety facts (100% legal, fire-resistant, etc.) that original included. |
| [P01-V2-S16 — Purchase attempt through chat](p01/P01-V2-S16.md) | [r01](p01/P01-V2-S16.md#repeat-r01) (vs agenerateor only) | Misreads "420 sq. ft. backyard office" as something other than floor area — a project-dimension parsing issue. |
| [P02-V2-S01 — Buyer happy path](p02/P02-V2-S01.md) | [r01](p02/P02-V2-S01.md#repeat-r01), [r02](p02/P02-V2-S01.md#repeat-r02), [r03](p02/P02-V2-S01.md#repeat-r03) | Same grounding failure as section 2 above — didn't surface real matching Manhattan listings. |
| [P02-V2-S11 — No matching property](p02/P02-V2-S11.md) | [r02](p02/P02-V2-S11.md#repeat-r02), [r03](p02/P02-V2-S11.md#repeat-r03) (vs agenerateor only, "slightly better") | Minor — both correctly say no match exists; agenerateor is judged slightly more proactive about offering to relax criteria. |
| [P02-V2-S12 — Conflicting property price](p02/P02-V2-S12.md) | [r01](p02/P02-V2-S12.md#repeat-r01), [r02](p02/P02-V2-S12.md#repeat-r02) | Both correct the user's wrong price, but the judge repeatedly calls Arrokothai's version less natural/more verbose than the comparison. |
| [P02-V2-S03 — Seller valuation path](p02/P02-V2-S03.md) | [r01](p02/P02-V2-S03.md#repeat-r01), [r02](p02/P02-V2-S03.md#repeat-r02) | Both correctly avoid the buyer-listing trap; judge prefers the other implementation's shorter, more natural phrasing. |
| [P02-V2-S14 — Duplicate handoff](p02/P02-V2-S14.md) | [r05](p02/P02-V2-S14.md#repeat-r05) | See section 1 — the real-bug case (duplicate dispatch on a post-completion edit). |

---

## 4. Table C/D — pairwise losses, markdown-formatting only (systemic pattern)

**46 of the 87 total Arrokothai pairwise losses** (roughly half) give "uses markdown/bold/bullet
points" as the deciding reason, almost entirely in **P02** (EstatePro), where the scenario rubric
requires short, natural, markdown-free replies. This looks like a single systemic
style/instruction-following gap rather than 46 independent problems — read 2–3 examples to confirm
the pattern rather than every one:

- [P02-V2-S04 — Several buyer fields out of order, repeat r01](p02/P02-V2-S04.md#repeat-r01) — "Candidate B [Arrokothai] uses extensive markdown formatting" vs. both other implementations staying markdown-free.
- [P02-V2-S16 — Adversarial confirmation phrase, repeat r02](p02/P02-V2-S16.md#repeat-r02) — same pattern, in an adversarial-prompt scenario.
- [P02-V2-S15 — Handoff success, truthful, repeat r04](p02/P02-V2-S15.md#repeat-r04) — same pattern, on an otherwise-passing handoff scenario.

Scenarios where this pattern recurs across most/all repeats: P02-V2-S04, P02-V2-S05, P02-V2-S07,
P02-V2-S08, P02-V2-S09, P02-V2-S10, P02-V2-S14, P02-V2-S15, P02-V2-S16, P02-V2-S17 (open the
scenario file and search "markdown" in the pairwise reasons if you want the exhaustive list — it's
in [`pairwise-summary.json`](../../analysis/pairwise-summary.json) / [`disagreement-audit.json`](../../analysis/disagreement-audit.json) in the parent `analysis/` folder, not reproduced row-by-row here).

One P01 case worth a quick look even though it's not markdown: [P02-V2-S14 repeat r02/r04](p02/P02-V2-S14.md#repeat-r02) — judged "extremely robotic, outputs database-like schemas to the [user]" — a related but more severe formatting/tone issue than plain bold text.

---

## 5. Criterion-level summary (Table D)

From `pairwise-summary.json`, preference counts where Arrokothai is one side (left/right is just
sort order, not a ranking):

| App | Pair | Criterion | Arrokothai wins | Other wins | Ties |
|---|---|---|---|---|---|
| p01 | agenerateor vs arrokothai | correctness | 12 | 17 | 31 |
| p01 | agenerateor vs arrokothai | usefulness | 28 | 18 | 14 |
| p02 | agenerateor vs arrokothai | conversational_coherence | 16 | 27 | 20 |
| p02 | agenerateor vs arrokothai | usefulness | 20 | 36 | 5 |
| p02 | agenerateor vs arrokothai | correctness | 21 | 31 | 9 (+2 both_bad) |
| p02 | original vs arrokothai | (arrokothai wins every criterion here) | — | — | — |

**Read:** against **agenerateor**, Arrokothai is behind on `conversational_coherence` and
`usefulness` in P02 (largely the markdown pattern above) and on `correctness` in both P01 and P02
(the content issues in section 3). Against **original**, Arrokothai wins every criterion in both
apps — original is not the useful comparison point here. The agenerateor comparison in P02 is the
one worth the closest look.

---

*Generated by hand from `../../analysis/{semantic,pairwise}-summary.json` and
`../../analysis/disagreement-audit.json`. Does not modify any frozen result. If you find a
transcript that changes your read of a case, note it separately — this file is a reading guide, not
an amendment to the frozen analysis.*
