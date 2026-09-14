# Implementation report — K1.0, round 8

## Identity

- **Packet / parent:** K1.0 — target boundary and legacy quarantine; parent milestone K1.
  **Contract:** [`contract.md`](contract.md), **revision 8**.
  **Governing process baseline:** `c9a9ed7e6e538ab0542fc6a999426264abb6212a`.
- **State:** `IN_PROGRESS` → `WAITING_FOR_REVIEW` (correction of the same released packet; no new
  owner release was sought or needed — 006 makes corrections on a released packet permission-free).
  **Owner release:** 2026-09-13, verbatim in the contract's *Release provenance* section, with the
  benchmark E1 dependency treated as built-but-unaccepted fixture preparation.
- **Prerequisite:** K0.2, independently ACCEPTED at H16 `90a6f37eaeb61009025449a1abc7e6d31dc1dbb2`,
  integrated as `0535160e677231da41b06d9f822e62e2f0364dd1`.
- **Branch:** `codex/k1.0-target-boundary-legacy-quarantine`; configured remote `origin`
  (`ArrokothI/arrokothi`).
- **Base:** `c9a9ed7e6e538ab0542fc6a999426264abb6212a`, re-verified this session as exactly the
  advertised remote `main` (`git ls-remote origin main`).
- **Previous reviewed H7:** `2dfc6d818498263c30cb64db32a91aa0ac0543a5`.
  **Round-7 review record:** [`review-07.md`](review-07.md), recorded by
  `f9bb7f5144b94ac78d4e7d87c61a56f7e38b9334`, which was the branch tip at session start.
- **Payload C:** `b8037aa02f76716d09293fb236e51bf3da9282fb`. Its parent is exactly the review-07
  record commit, so the correction interval is `f9bb7f51…..b8037aa0…`, one commit.
- **Candidate H:** the commit containing this report. Its full SHA is supplied in the external
  handoff, after the push; it cannot be named from inside itself.
- **Exact C..H administrative allowlist:** `docs/development/work/K1.0/implementation-08.md`;
  `docs/development/work/K1.0/validation-08/` (MANIFEST.md and nine declared output-only `.log`
  attachments); and the status transcriptions in `docs/development/007-work-packets.md`,
  `docs/development/001-current-status-and-roadmap.md` and `docs/development/README.md`. No source,
  test, fixture, script, evaluator, threshold, package or configuration content first appears in H.
- **Working tree:** clean at C apart from `validation-08/`, which the validation run itself writes;
  clean at H. **Push:** performed after H exists; the advertised remote SHA is verified and reported
  in the external handoff, not claimed here.

## Changes and coverage

### The one open finding

**K10-R7-01 — P2 — governed section boundaries are still selected by raw textual heading
substrings rather than structural Markdown headings. Disposition: CLOSED by reconstruction of the
section-selection boundary.**

Round 7 rebuilt *which lines belong to a table* and *which row is its header*. It did not change
*which lines belong to a section*, and the helper still located the section with
`markdown.indexOf(heading)` / `rest.indexOf(nextHeading)`:

```ts
function sectionText(markdown: string, heading: string, nextHeading: string): string {
  const from = markdown.indexOf(heading);
  if (from === -1) return "";
  const rest = markdown.slice(from + heading.length);
  const to = rest.indexOf(nextHeading);
  return to === -1 ? rest : rest.slice(0, to);
}
```

GFM headings are block structures, so the characters `## Current cross-boundary` inside ordinary
prose, an inline code span or a fenced code block are not a section heading — but `sectionText`
cut at those bytes before the fence-aware table scanner ever ran. Confirmed empirically against
the reviewed H7: the review-07 literal, a fenced-code occurrence, an escaped hash, indented code
and a mismatched-fence occurrence each truncate the Zones section to zero further-table rows
(validation-08/08, H7 column 0 messages in all five). The contradictory second table is deleted
from the parser's input, the first correct table parses normally, `unreadable` stays empty and
the relation stays green.

The fix is not a stricter substring. Section membership is now **structural**. A small explicit
block scanner (`parseAtxHeading`, `parseFenceCandidate`, `updateFence`, `sectionLines`) walks the
document top to bottom with fence tracking: the section starts at the first level-2 ATX heading
outside fenced code whose normalised text equals the exact expected title, and ends at the first
later such heading carrying the expected next title. `parseAtxHeading` implements the ATX grammar
the governed document relies on — at most three spaces of indent, one to six `#`, then
whitespace or end of line, with closing-sequence stripping and blockquote exclusion — so prose,
inline code (inline content on a paragraph line, never at heading position), fenced code,
escaped `\#`, `##foo` with no required whitespace, seven-hash runs and four-space indented code
are all ordinary content by construction rather than by special-casing. `updateFence` implements
the fence grammar — same character, closing run at least as long, backtick info-string rule —
so a mismatched closer does not resume block recognition. Table discovery shares the same
helpers, so a heading inside fenced code neither opens nor breaks a table.

Call-site identities are exact titles now, not `indexOf` prefixes: `Zones` →
`Current cross-boundary dependencies`, `Current cross-boundary dependencies` →
`Export ownership`, `Export ownership` → `What the target zone may import`,
`Deferred extraction and bridge owners` → `What this packet does not establish`. A prefix
convenient for `indexOf` is not a section identity, and the old prefixes could in principle
match more than one section. Only the full title at heading level 2 delimits.

That is why the correction eliminates textual section selection rather than adding more
substring guards. There is no longer any code path on which heading-looking bytes outside a real
ATX heading can start or end a section: the boundary is produced by block recognition before any
title is compared. Had the fix instead skipped "occurrences inside backticks" with a regular
expression, the fence, escape and malformed-heading shapes would each have survived under a
different spelling.

### Adjacent challengers committed with it

GFM-grammar cases aimed at structural heading recognition rather than at another table spelling,
each verified silent under H7 (except SELF-15, which H7 happens to survive because its substring
requires the space) and reported under C (validation-08/08):

- **K1.0-SELF-14** — escaped `\## …`: paragraph text, must not truncate;
- **K1.0-SELF-15** — `##Current …` with no required whitespace: paragraph text, must not
  truncate (reports under both readers; committed so no future prefix-strip parser reopens it);
- **K1.0-SELF-16** — `####### …` (over-long run) and four-space indented `## …` (indented code):
  not headings, must not truncate;
- **K1.0-SELF-17** — mismatched fence closer (`~~~` against a ```` ``` ```` block): does not end
  the fenced region; heading bytes inside stay code and the table after the matching closer is
  reported.

A second-relation fenced case (Current cross-boundary section, `## Export ownership` in a fence)
shows the shared boundary holds beyond the review's literal Zones example.

### The silent-exit audit

006 and the correction handoff require the whole pipeline to be accounted for, not the one
helper. Every branch that can end a row's life was driven with an input that actually reaches
it, through the production parser, and its whole observable result recorded ([validation-08/09](validation-08/09-silent-exit-audit.log)).
Stage 1 repeats the section-selection part with the full heading-context matrix:

| Encounter | Disposition |
|---|---|
| Real level-2 ATX heading, expected current title (first / repeated) | Opens the section / stays inside, breaks the body per GFM Example 201, further table reported (SELF-12) |
| Real level-2 ATX heading, expected next title (present / absent) | Terminates (planted rows after it are outside, green) / section runs to end of document, later tables reported as further tables |
| Paragraph text, inline code span | Ordinary content; the later table is reported |
| Fenced code (closed, mismatched-closer, pre-start) | Literal code; never starts/ends the section; pre-start content is outside (green) |
| Escaped hash, no-whitespace run, over-long run, indented code, blockquote | Ordinary content/quote; the later table is reported |

Four branches are quiet, each for a stated reason the invariant allows: content outside the
section by structure (1c/1m/1n); fenced lines that render as code (2e); excess cells that GFM
itself does not render, with the row recorded (4b, plus the green alignment variant 3b); and
the recorded first-token key rule (6e). Everything else produces at least one message. One voice
change is recorded explicitly: an *unclosed* fence before the first body row (2d) now reports
the whole downstream cascade, because the unclosed fence swallows the next heading as code and
the section runs on — louder and GFM-faithful, still fail-loud.

### Coverage map and evidence

| Obligation | Distinguishing input | Expected observable facts / forbidden | Location and result |
|---|---|---|---|
| C4 — prose/inline/fenced next-heading mentions do not truncate | full next-heading bytes in each context + contradictory Zones table | reported as a further table; forbidden: silent deletion | `kernel-landing-zone.test.ts`, "structural section boundaries" — 3 cases, pass |
| C4 — real ATX next heading terminates | Zones-shaped table planted after `## Current cross-boundary dependencies` | Zones channel green; forbidden: leakage across sections | same suite, 1 case, pass |
| C4 — start boundary is structural | prose/fenced current-heading mention + planted table before `## Zones` | green; forbidden: selection at non-heading bytes (H7 shows 9 false messages) | same suite, 2 cases, pass |
| C4 — adjacent GFM challengers | SELF-14…SELF-17 | reported (SELF-15 under both readers) | same suite, 4 cases, pass |
| C4 — second relation | fenced `## Export ownership` + contradictory dependency table | reported as a further Dependency table | same suite, 1 case, pass |
| C4 — round-7 header/body preserved | 16 header-label variants, renamed headers, SELF-12/SELF-13, missing table | all still reported; real headers accepted | unchanged round-7 cases, pass |
| C4 — round-6 GFM discovery preserved | 24 omitted-edge variants, pipe-less continuation, alignment delimiter, edge-less header/delimiter, escaped pipe | all still reported; valid variants still green | unchanged round-6 cases, pass |
| C4 — rounds 2/3/5 preserved | 16 relational controls, duplicate controls in both orders, malformed/short-row controls | all still reported | unchanged cases, pass |
| C3/C7 — nothing else moved | full suite, typecheck, export digests | 1937/1937, typecheck clean, export map unchanged | validation-08/02–07 |

- **Selected 012 methods:** deterministic execution (dominant — the oracle is mechanically decidable
  over repository files, and each control includes the broken behaviour it must reject) and
  process/documentation (C4/C5/C6/C8 are records). **Materially excluded, unchanged:** race and
  fault, native Runtime/Driver, external evidence/gate — this packet commits no state, has no Driver
  and executes no E gate.
- **Tests added:** 11 cases in one new `describe` inside the existing C4 suite. **Removed:** none.
  **Weakened:** none. Architecture suite 226 → 237; full suite 1926 → 1937; conformance 1813 →
  1824; zero skipped.
- **Compatibility / refusal:** unchanged. The target package stays `private` and refusal-only.
- **Baseline / guides / skills:** unaffected; `check:builder-docs` unchanged at 26 files, 284
  links/anchors, 38 public imports.

### Prior findings

| Finding | Round | Disposition |
|---|---|---|
| K10-R7-01 | 7 | **CLOSED** this round by structural reconstruction; 5 newly distinguishing demonstrations (H7 silent → C reported), committed controls, heading-context audit |
| K10-R6-01 | 6 | CLOSED in round 7, confirmed by review-07; header/body split is preserved verbatim and re-asserted by 16 unchanged controls |
| K10-R5-01 | 5 | CLOSED in round 6, confirmed by review-06/07; the GFM row grammar is preserved verbatim and re-asserted by 24 unchanged controls |
| K10-R4-01, K10-R4-02 | 4 | CLOSED; key-before-value ordering and the evidence-record guard are unchanged and still pass |
| K10-R3-01 | 3 | CLOSED; duplicate controls in both orders unchanged |
| K10-R2-01, K10-R2-02 | 2 | CLOSED; scanner reconstruction and relational comparison untouched |
| K10-R1-01, K10-R1-02 | 1 | CLOSED; unchanged |
| K1.0-SELF-08 … -11 | 4–6 | CLOSED; all controls unchanged and passing |
| K1.0-SELF-12, -13 | 7 | CLOSED in round 7; both re-demonstrated reported-under-both in 08 and still passing |
| **K1.0-SELF-14 … -17** | **8** | **New, self-found:** GFM heading-grammar challengers at the new boundary. Fixed by construction; controls added |

### Cumulative re-audit beyond C4

Re-checked at C, not assumed from earlier rounds: `tests/conformance/k0` is byte-identical to base
(`git diff --quiet` exit 0); no file under `packages/core`, `packages/sdk`, `packages/agents`,
`packages/models`, `packages/retrieval` or `packages/interoperability` differs from base; the only
manifest added remains the private `packages/kernel/package.json`; the C1/C2/C9 scanner, the
forbidden-edge controls, the legacy re-attribution and its 13 assertions, and the refusal-only target
surface are untouched and green. The correction delta is three files.

### Documentation drift reconciled

Contract revision 8's C9 row reads **326** repository sources, matching the pinned round-3
comparison evidence, where revision 7 still said 325. Review-07 recorded this as a carried-forward
non-blocking documentation note; it is reconciled here as directed, not treated as a finding.
No scanner behaviour changed.

## Validation and interpretation

All commands ran in `/Users/rex-shih/Documents/ArrokothI/arrokothi` against clean payload C
`b8037aa02f76716d09293fb236e51bf3da9282fb`, whose only uncommitted content was `validation-08/`,
which the run writes. Environment: Node v25.2.1, npm 11.6.2, TypeScript 5.9.3, Darwin 25.6.0 arm64.
Raw logs, digests and exact commands: [`validation-08/MANIFEST.md`](validation-08/MANIFEST.md).

| Command | Exit | Result |
|---|---|---|
| `npm run typecheck` | 0 | clean |
| `npm test` | 0 | 1937 tests, 287 suites, 0 fail, 0 skipped |
| `npm run test:conformance` | 0 | 1824 tests, 268 suites, 0 fail, 0 skipped |
| `npm run check:builder-docs` | 0 | 26 Markdown files, 284 links/anchors, 38 public package imports |
| `npm run test:kernel` | 0 | 4 tests, 0 fail |
| `npm run test:sdk` | 0 | 22 tests, 0 fail |
| K10-R7-01 demonstration | 0 | 11 cases, 5 newly distinguishing, 0 regressions |
| silent-exit audit | 0 | every pipeline branch driven; four legitimately quiet, each accounted for |

The manifest's nine digests name the exact log bytes above; the H7 source pinned in 08 carries
SHA-256 `e919b7289e7e4f3da3f0f0da3825e2ab6cff065e94d17ff8d2757dc4649fe813` and was extracted
with `git show 2dfc6d8:…`, not paraphrased.

- **External fixture / gate / decision:** none executed. The benchmark E1 preparation was re-checked
  read-only this session: benchmark `main` still advertises
  `5a3f1ba525f68244701b1f73a1d29c4902ffe589` (the value the contract pins), the contract's seven
  E1 identities are unchanged, and nothing in this branch touches that repository.
  **This packet claims no E1 result.**
- **Checks not run:** `npm run test:evals`. This packet changes no Agent or model-facing behaviour
  and nothing in the diff is reachable from an eval. The limit: this candidate makes no claim about
  Agent behaviour or model-facing quality.
- **Why the evidence supports the criteria (implementer assessment, not acceptance):** C4's
  total-accounting claim now rests on the whole chain — committed controls that are silent against
  the reviewed H7 and reported against C, an executed audit that drives every heading-context
  branch and shows its whole result, and the preserved round-2…7 controls proving the
  reconstruction narrowed nothing. The quiet branches are named with their GFM reasons rather than
  left for a reviewer to discover. C1/C2/C3/C5/C6/C7/C8/C9 rest on unchanged code plus a re-verified scope
  check at C.
- **Design choices:** block scanner over exact titles rather than a Markdown dependency, because the
  governed sections use a small fixed subset of GFM (ATX level-2 headings, fenced code) and a
  dependency would widen the trusted surface without adding an invariant; level-2 required for
  section delimiters while any ATX level breaks table bodies, matching GFM Example 201; other-text
  headings between the delimiters stay inside the section (fail-loud) rather than terminating it,
  preserving SELF-12.
- **Owner amendments:** none this round. **Assumptions:** none beyond the recorded release.
- **Strongest remaining risk:** the scanner covers the GFM subset this one document uses (ATX
  headings, backtick/tilde fences, blockquote breaks); a construct outside that subset — setext
  headings, tables inside blockquotes, tab-indented fences — is handled by staying inside the
  section and reporting (fail-loud), but its rendering fidelity is argued from the specification,
  not from a conforming renderer. The mitigation is directional: divergences surface as
  disagreements, never as silence.
- **Third-party review under AGENTS.md:** none. No third-party code, test, script, asset or
  dependency was copied, adapted, vendored or added this round. The GitHub Flavored Markdown
  specification was consulted as a normative reference for behaviour; its numbered examples are cited
  by number in comments, and no text, code or fixture from it was reproduced.

## Handoff

- **Ready for independent review.** The whole cumulative packet is submitted, not only the delta.
- Base, payload C and candidate H, with the verified advertised remote SHA, are supplied in the
  external owner handoff after the push. This report cannot certify its own future push.
- **No self-acceptance.** No E1 result, no K1 acceptance, no successor release. `next_release: none`.
