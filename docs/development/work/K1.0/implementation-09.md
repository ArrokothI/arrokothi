# Implementation report — K1.0, round 9

## Identity

- **Packet / parent:** K1.0 — target boundary and legacy quarantine; parent milestone K1.
  **Contract:** [`contract.md`](contract.md), **revision 9**.
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
- **Previous reviewed H8:** `065e864a796da6195ceca1d489201d2d687f7b8d`.
  **Round-8 review record:** [`review-08.md`](review-08.md), recorded by
  `f7dedc3c6fe41019665f5a93fdb29b570c59bbc4`, which was the branch tip at session start.
- **Payload C:** `f2b8397eb2f8e743f937594e52f22f9d34fb1e98`. Its parent is exactly the review-08
  record commit, so the correction interval is `f7dedc3c…..f2b8397e…`, one commit touching only
  contract revision 9, `inventory-oracle.ts`, and `kernel-landing-zone.test.ts`.
- **Candidate H:** the commit containing this report. Its full SHA is supplied in the external
  handoff, after the push; it cannot be named from inside itself.
- **Exact C..H administrative allowlist:** `docs/development/work/K1.0/implementation-09.md`;
  `docs/development/work/K1.0/validation-09/` (MANIFEST.md and nine declared output-only `.log`
  attachments); and the status transcriptions in `docs/development/007-work-packets.md`,
  `docs/development/001-current-status-and-roadmap.md` and `docs/development/README.md`. No source,
  test, fixture, script, evaluator, threshold, package or configuration content first appears in H.
- **Working tree:** clean at C apart from `validation-09/`, which the validation run itself writes;
  clean at H. **Push:** performed after H exists; the advertised remote SHA is verified and reported
  in the external handoff, not claimed here.

## Changes and coverage

### The two open findings

**K10-R8-01 — P2 — a fence opened immediately after a table body is processed twice and can turn
literal code into a further table. Disposition: CLOSED by invariant-level reconstruction of the
block-state layer.**

Round 8 shared `parseFenceCandidate`/`updateFence` but kept two independent loops. `sectionTables`
consumed a fence inside its body loop (`fence = updateFence(fence, bodyLine); break;`) without
advancing `i`, so the outer loop reprocessed the same bare marker as a second transition and the
opener closed itself; the following literal lines were then scanned as Markdown. Confirmed
empirically against the reviewed H8: a complete three-line table inside a bare backtick fence
immediately after the last real Zones body row reports 2 spurious further-table rows under H8
(validation-09/08, H8 column RED) and stays green under C. The round-8 audit's case 2e used a
single row-shaped line with no delimiter, so even after the accidental self-close there was no
complete table to discover — its green result could not distinguish the bug.

**K10-R8-02 — P2 — section heading recognition ignores GFM raw-HTML block context and can still
truncate on non-heading bytes. Disposition: CLOSED by the same reconstruction.**

`sectionLines` tracked only `FenceState` and called `parseAtxHeading` on every line outside a
fence. Under GFM §4.6 the line `## Current cross-boundary dependencies` inside
`<script>…</script>` is raw HTML content, not an ATX heading. Confirmed against H8: the script
variant plus a contradictory Zones table before the real next heading stays GREEN under H8 (the
section is silently truncated at the raw line and the table is excluded) and reports 2
further-table rows under C (validation-09/08, H8 column GREEN-silent vs C RED).

### The reconstruction (not two isolated patches)

One `scanBlocks` pass computes every physical line's context exactly once — ordinary Markdown,
fenced literal, GFM raw-HTML block types 1–7, blank, indented code or blockquote — and both
section selection (`sectionRange`/`sectionLines`) and table discovery (`sectionTables`) consume
those annotations through `scanTransitions` without recomputing fence/HTML transitions. The
table scanner is now a single linear pass that always advances: a fence or HTML marker where a
body is open closes that body as a break and is never reprocessed. The round-8 ATX/fence heading
grammar (`parseAtxHeading`, `parseFenceCandidate`, `updateFence`) is preserved verbatim; round 9
only widens the raw context and unifies consumption. The key invariant, stated in the module:

> Every physical source line is consumed through one coherent block-state transition. A line
> must not open and close the same block merely because two parser loops process it
> independently. Heading/table recognition may occur only when the current Markdown block
> context permits Markdown block structure.

Consequences, each covered by committed controls: single consumption (bare/info/tilde fences
with a complete table inside stay green; the unfenced second table at the same spot still
fails; mismatched and short closers stay inside; the unclosed fence stays fail-loud); shared
context (script, attributed mixed-case script, comment, pre and div blocks all hide their
heading but not the later table); fail-open prohibited (no raw-block heading truncates);
false-positive prohibited (fenced, indented-code and blockquote table shapes never become
relations). Tables are top-level only; setext/thematic-break/list/nested-table constructs have
no block state of their own and surface as unreadable/duplicate rows where they land inside a
body (fail-loud). Type-7 HTML's paragraph exception is over-approximated toward raw and
indented lines are always code — both err toward reporting and are stated in the contract and
in code. Exact-title L2 identity, structural header/body split, one-governed-table enforcement,
key-before-value, uniqueness, relational comparison, dependency recomputation and every accepted
scanner/evidence invariant are unchanged.

Raw HTML is **interpreted (tracked), not refused**: the five HTML controls assert the GFM
reading directly (heading hidden, later table reported). The two inline-HTML controls prove the
boundary — mid-line tags and a complete tag with trailing prose never open a block (the later
table is still reported) and inline HTML alone is never rejected (green).

### Distinguishing controls committed with it

10 fence tests ("fence single-consumption (K10-R8-01)"): bare/info-string/tilde fences with a
complete table inside stay green; the unfenced second table still fails; mismatched and
short-closer cases stay green; the unclosed fence before the governed table reports it missing;
indented-code and blockquote table shapes stay green (adjacent challengers falsifying the old
trim-then-split scanner — the indented case is RED under H8); a real table after the quote
break still fails. 7 HTML tests ("raw HTML blocks (K10-R8-02)"): script, attributed mixed-case
script, comment (type 2, the review-unnamed challenger), pre and div (type 6) blocks each hide
their heading but not the later table; two inline-HTML controls (with/without a later table).
Validation-09/08 drives 11 of these through the byte-pinned H8 parser: 8 are newly
distinguishing, 3 agree as required (info-string, mismatched, unfenced), 0 regress.

### The state-transition audit

Validation-09/09 replaces the round-8 silent-exit audit with a transition audit over
`scanTransitions` (exported for observability; `scanBlocks` is now its projection, so the audit
and the parser cannot diverge). Thirteen windows each print one row per physical line — state
before, structural classification, state after, `consumed-once`, heading/table gating — plus the
whole-parser observable result and a `lines == transitions` check, which holds in every window.
The bare-fence window shows the opener `-/– → open(`x3)/–` as `fence-marker-open`, the three
code lines as `fence-raw`, the single `fence-closer`, and GREEN: the terminator is consumed
exactly once. Neighboring transitions challenged beyond the reviewer's literals: indented-code
table (GREEN), blockquote table shapes (GREEN) with a post-break real table (RED), inline HTML
(ordinary, RED with a later table / GREEN alone), and the preserved round-8 heading matrix.

### Coverage map and evidence

| Obligation | Distinguishing input | Expected observable facts / forbidden | Location and result |
|---|---|---|---|
| C4 — fenced complete tables do not become relations | bare/info/tilde fences + header/delimiter/body code after the body | GREEN; forbidden: spurious further table (H8 shows RED) | new fence tests, 3 cases, pass |
| C4 — further-table rule preserved | unfenced second table at the same spot | RED as further table under both | new fence test, pass |
| C4 — closer grammar preserved | mismatched / short / unclosed fences | GREEN, GREEN, missing-table RED | new fence tests, 3 cases, pass |
| C4 — raw headings do not truncate | script/attributed/comment/pre/div + heading + later table | RED under C, GREEN-silent under H8 | new HTML tests, 5 cases, pass |
| C4 — inline HTML is not a block and not refused | inline tags ± later table | RED with table, GREEN without | new HTML tests, 2 cases, pass |
| C4 — adjacent block challengers | indented-code / blockquote table shapes | GREEN (H8 RED on indented) | new fence tests, 3 cases, pass |
| C4 — all prior rounds preserved | round-8 heading matrix, SELF-14…17, SELF-12/13, header-label, omitted-edge/pipe-less/alignment/escaped-pipe, malformed/short, duplicate-order, relational | all still pass | 93 unchanged tests, pass |
| C3/C7 — nothing else moved | full suite, typecheck, export digests | 1954/1954, typecheck clean, export map unchanged | validation-09/02–07 |

- **Selected 012 methods:** deterministic execution (dominant — the oracle is mechanically decidable
  over repository files, and each control includes the broken behaviour it must reject) and
  process/documentation (C4/C5/C6/C8 are records). **Materially excluded, unchanged:** race and
  fault, native Runtime/Driver, external evidence/gate.
- **Tests added:** 17 cases in two new `describe` blocks inside the existing C4 suite.
  **Removed:** none. **Weakened:** none. Architecture suite 237 → 254; full suite 1937 → 1954;
  conformance 1824 → 1841; zero skipped.
- **Compatibility / refusal:** unchanged. The target package stays `private` and refusal-only.
- **Baseline / guides / skills:** unaffected; `check:builder-docs` unchanged at 26 files, 284
  links/anchors, 38 public imports.

### Prior findings

| Finding | Round | Disposition |
|---|---|---|
| K10-R8-01 | 8 | **CLOSED** this round by shared single-consumption reconstruction; 4 newly distinguishing fence demonstrations (bare/tilde/shorter-closer H8 RED → C GREEN; indented-code H8 RED → C GREEN), committed controls, transition audit |
| K10-R8-02 | 8 | **CLOSED** this round by GFM raw-HTML tracking (types 1–7); 4 newly distinguishing demonstrations (script/comment/pre/div H8 GREEN-silent → C RED), committed controls, transition audit |
| K10-R7-01 | 7 | CLOSED in round 8, confirmed by review-08; the ATX/fence heading grammar is preserved verbatim and re-asserted by 11 unchanged controls |
| K10-R6-01 | 6 | CLOSED in round 7; header/body split preserved verbatim, 16 unchanged controls |
| K10-R5-01 | 5 | CLOSED in round 6; GFM row grammar preserved verbatim, 24 unchanged controls |
| K10-R4-01, K10-R4-02 | 4 | CLOSED; key-before-value and evidence-record guard unchanged |
| K10-R3-01 | 3 | CLOSED; duplicate controls in both orders unchanged |
| K10-R2-01, K10-R2-02 | 2 | CLOSED; scanner reconstruction and relational comparison untouched |
| K10-R1-01, K10-R1-02 | 1 | CLOSED; unchanged |
| K1.0-SELF-08 … -13 | 4–7 | CLOSED; all controls unchanged and passing |
| K1.0-SELF-14 … -17 | 8 | CLOSED in round 8; all re-demonstrated and still passing |
| **K1.0-SELF-18, -19** | **9** | **New, self-found:** while re-auditing the block layer, table discovery trimmed every line before checking pipes, so a complete table inside indented code became a spurious further table (H8 RED, C GREEN), and `> ``` ` was accepted as a fence candidate while quoted tables relied on delimiter mismatch rather than quote exclusion. Fixed by construction in the shared scan (indented/quote lines never reach table recognition); controls added |

### Cumulative re-audit beyond C4

Re-checked at C: `tests/conformance/k0` byte-identical to base (`git diff --quiet` exit 0); no file
under `packages/core`, `packages/sdk`, `packages/agents`, `packages/models`, `packages/retrieval`
or `packages/interoperability` differs from base beyond the cumulative K1.0 payload already
reviewed; the only manifest added remains the private `packages/kernel/package.json`; the
C1/C2/C9 scanner, forbidden-edge controls, legacy re-attribution with its 13 assertions, and the
refusal-only target surface are untouched and green. The correction delta is three files
(contract revision 9, `inventory-oracle.ts`, `kernel-landing-zone.test.ts`).

## Validation and interpretation

All commands ran in `/Users/rex-shih/Documents/ArrokothI/arrokothi` against clean payload C
`f2b8397eb2f8e743f937594e52f22f9d34fb1e98`, whose only uncommitted content was `validation-09/`,
which the run writes. Environment: Node v25.2.1, npm 11.6.2, TypeScript 5.9.3, Darwin 25.6.0 arm64.
Raw logs, digests and exact commands: [`validation-09/MANIFEST.md`](validation-09/MANIFEST.md).

| Command | Exit | Result |
|---|---|---|
| `npm run typecheck` | 0 | clean |
| `npm test` | 0 | 1954 tests, 289 suites, 0 fail, 0 skipped |
| `npm run test:conformance` | 0 | 1841 tests, 270 suites, 0 fail, 0 skipped |
| `npm run check:builder-docs` | 0 | 26 Markdown files, 284 links/anchors, 38 public package imports |
| `npm run test:kernel` | 0 | 4 tests, 0 fail |
| `npm run test:sdk` | 0 | 22 tests, 0 fail |
| K10-R8-01/R8-02 demonstration | 0 | 11 cases, 8 newly distinguishing, 0 regressions |
| state-transition audit | 0 | 13 windows; lines == transitions everywhere; terminator consumed once |

The manifest's nine digests name the exact log bytes above; the H8 source pinned in 08 carries
SHA-256 `d25f7576307570cdee231efb0c6821175f41176902d7dde5627fcf869f14555e` and was extracted
with `git show 065e864a796da6195ceca1d489201d2d687f7b8d:…`, not paraphrased.

- **External fixture / gate / decision:** none executed. The benchmark E1 preparation was re-checked
  read-only this session: benchmark `main` still advertises
  `5a3f1ba525f68244701b1f73a1d29c4902ffe589` and the preparation branch still advertises
  `8de04779d279dba82cf834d419e465d2b677ef46` (both via `git ls-remote`, unaccepted by nobody);
  the contract's seven E1 identities are unchanged, and nothing in this branch touches that
  repository. **This packet claims no E1 result.**
- **Checks not run:** `npm run test:evals`. This packet changes no Agent or model-facing behaviour
  and nothing in the diff is reachable from an eval. The limit: this candidate makes no claim about
  Agent behaviour or model-facing quality.
- **Why the evidence supports the criteria (implementer assessment, not acceptance):** C4's claim
  now rests on the whole chain — committed controls that flip the reviewed H8's verdicts in both
  directions (fenced code H8 RED → C GREEN; raw-HTML truncation H8 GREEN → C RED), a transition
  audit that shows every line's single state step with its gating and whole-parser outcome, and
  the preserved round-2…8 controls proving the reconstruction narrowed nothing. The legitimately
  quiet branches are named with their GFM reasons. C1/C2/C3/C5/C6/C7/C8/C9 rest on unchanged code
  plus a re-verified scope check at C.
- **Design choices:** one shared scanner over exact titles rather than a Markdown dependency,
  because the governed sections use a small fixed subset of GFM and a dependency would widen the
  trusted surface without adding an invariant; tracking (interpreting) raw HTML rather than
  refusing it, because refusal needs the same precise start grammar yet adds a new failure mode
  for valid documents; indented/quote lines excluded from top-level tables with the boundary
  stated truthfully in contract and code.
- **Owner amendments:** none this round. **Assumptions:** none beyond the recorded release.
- **Strongest remaining risk:** the scanner covers the GFM subset this one document uses (ATX
  headings, backtick/tilde fences, raw-HTML types 1–7, blank/quote/indented breaks); constructs
  outside that subset — setext headings, thematic breaks, lists, nested tables — are handled by
  falling into the body stream as unreadable/duplicate rows (fail-loud), argued from the
  specification rather than a conforming renderer. Divergences surface as disagreements, never as
  silence.
- **Third-party review under AGENTS.md:** none. No third-party code, test, script, asset or
  dependency was copied, adapted, vendored or added this round. The GitHub Flavored Markdown
  specification (0.29-gfm) and CommonMark §4.5/§4.6 were consulted as normative references for
  behaviour; no text, code or fixture from them was reproduced. No new dependency was added.

## Handoff

- **Ready for independent review.** The whole cumulative packet is submitted, not only the delta.
- Base, payload C and candidate H, with the verified advertised remote SHA, are supplied in the
  external owner handoff after the push. This report cannot certify its own future push.
- **No self-acceptance.** No E1 result, no K1 acceptance, no successor release. `next_release: none`.
