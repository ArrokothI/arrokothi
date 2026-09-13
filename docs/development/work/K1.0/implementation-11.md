# Implementation report — K1.0, round 11

## Identity

- **Packet / parent:** K1.0 — target boundary and legacy quarantine; parent milestone K1.
  **Contract:** [`contract.md`](contract.md), **revision 11**.
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
- **Previous reviewed H10:** `a0a4988b8f4b38709700e1fc38cd0f08de74e3fa`.
  **Round-10 review record:** [`review-10.md`](review-10.md), recorded by
  `74aee7aa5585fb036bc413a8591b6dbb428ffc1f`, which was the advertised branch tip at session start.
- **Payload C:** `6880b4825ed1aa2363f8366431052f88d6955be8`. Its parent is exactly the review-10
  record commit, so the correction interval is `74aee7aa…..6880b482…`, one commit touching only
  contract revision 11, `inventory-oracle.ts`, and `kernel-landing-zone.test.ts`.
- **Candidate H:** the commit containing this report. Its full SHA is supplied in the external
  handoff, after the push; it cannot be named from inside itself.
- **Exact C..H administrative allowlist:** `docs/development/work/K1.0/implementation-11.md`;
  `docs/development/work/K1.0/validation-11/` (MANIFEST.md and nine declared output-only `.log`
  attachments); and the status transcriptions in `docs/development/007-work-packets.md`,
  `docs/development/001-current-status-and-roadmap.md` and `docs/development/README.md`. No source,
  test, fixture, script, evaluator, threshold, package or configuration content first appears in H.
- **Working tree:** clean at C apart from `validation-11/`, which the validation run itself writes;
  clean at H. **Push:** performed after H exists; the advertised remote SHA is verified and reported
  in the external handoff, not claimed here.

## Changes and coverage

### The three open findings

**K10-R10-01 — P2 — an open raw leaf outlives the list container that owns it. Disposition: CLOSED
by subordinating leaf lifetime to container lifetime.**

Revision 10 checked open fence/HTML state before container continuation, so an unclosed list-local
fence or HTML block swallowed a dedented real governed heading (reproduced against H10: the review's
bullet-fence literal yields 21 cascading messages with Deferred missing; the type-7 literal
manufactures a further table; list-local type-1/comment blocks silently swallow a planted
contradiction). Every fence/HTML leaf now records its owning container depth (`ownerDepth`, 0 for
document top level). A non-blank line dedented below the owner's content indent ends those
containers first via the existing `popTo`, kills the leaves they own, and is then processed normally
at the surviving depth — a real heading there is eligible again on that same line
(`containerClosedLeaf: true` with `headingAllowed`/`tableAllowed` set by the normal path). Blank
lines never close containers; top-level leaves (owner 0) keep their accepted run-to-document-end
lifetime; only the container-local leaf ends at container end. The stack cannot grow while a leaf
is open (raw lines never push), so the owner frame is exactly `lists[ownerDepth - 1]`. Blockquote
lines never open leaves (the `>` check precedes leaf transitions), so a quote owns no open leaf by
construction. Demonstrated H10 → C in validation-11/08: bullet/ordered RED(21)-cascade → GREEN,
type-7 RED(2)-manufactured → GREEN, type-1/comment GREEN-silence → RED(2)-exact (miss becomes catch).

**K10-R10-02 — P2 — `parseCompleteTag` accepts missing whitespace between attributes.
Disposition: CLOSED by requiring the separator the grammar requires.**

The loop consumed optional whitespace but never required it, so `<a href='bar'title=title>` and
`<Warning a='x'b=title>` opened type-7 blocks (reproduced against H10: RED(2) manufactured further
tables on valid documents). Each attribute must now begin with whitespace: the loop records the
position before skipping whitespace and rejects when none was skipped, except for the tag end
(`>`/`/>`, which needs none). Optional whitespace around `=` is preserved via a lookahead index so
valueless attributes (`hidden`) still parse, quoted `<`/`>` still never end the tag early, unquoted
values keep their exclusions, and closing tags still carry no attributes. Demonstrated H10 → C in
08: the exact GFM literal plus single/double-quoted and valueless neighbors flip RED(2) → GREEN,
while valid multi-attribute, boolean, spaced-`=`, malformed-neighbor and self-closing shapes agree
in the required direction (raw blocks intact, malformed stays ordinary).

**K10-R10-03 — P2 — hybrid raw-HTML rule set reported as published GFM. Disposition: CLOSED by
pinning and implementing GFM 0.29 as cited.**

`textarea` was type 1 and `search` was in the type-6 list, contradicting the cited GFM 0.29 §4.6
(reproduced against H10: the textarea-blank literal manufactures RED(2); `<search> trailing prose`
manufactures RED(2)). Type 1 is now `script`/`pre`/`style` only, so a complete `<textarea>` line is
type 7 and ends at a blank line; the type-6 list drops `search`, so `<search> trailing prose` is
ordinary Markdown while a complete `<search>` line alone still opens type 7 through the tag
recognizer. No owner/version decision was needed because the packet simply aligns with the GFM
rules its contract already cites. Demonstrated H10 → C in 08: textarea-blank and search-trailing
flip RED(2) → GREEN; textarea-without-blank, script/style/pre, search-alone, declaration and div
agree as required.

### Preserved round-10 substance

Exact top-level L2 section identity; list-item depth reconstruction for the direct R9-01 cases;
marker-width content indents, ordered/bullet/task/nested controls and thematic-break precedence;
round-9 fence single-consumption; structural header/body identity and one-governed-table/further-table
accounting; round-6 GFM table-row discovery; key-before-value / seen-before-parse uniqueness;
relational inventory comparisons and dependency recomputation; prior ATX/fence/raw-HTML controls;
SELF-12…20; and the C1/C2/C9 scanner/evidence machinery are all unchanged in behavior and
re-asserted: the 133 pre-existing C4 tests pass verbatim, and the clean inventory parses identically
(117 lines → 117 transitions; only the real "What the target zone may import" list lives in
containers, all outside governed sections; no container kill fires on the clean tree; whole document
green).

### Distinguishing controls committed with it

8 container-ownership tests ("container-owned leaf lifetime (K10-R10-01)"): the review's bullet
literal, an ordered/wide-marker equivalent, list-local type-7 and type-1/comment blocks without end
conditions, closed-fence locality, the nested inner/outer boundary pair (inner dedent surfaces 2
exact further-table messages; outer dedent green), post-heading table placement, and the
blockquote analogue. 4 attribute tests ("attribute separators (K10-R10-02)"): the exact GFM
missing-whitespace literal, quoted-value neighbors, valid multi-attribute/boolean/spaced forms that
stay raw, and malformed/valid neighbors. The textarea/search replacement pair (K10-R10-03) pins the
published rule in both directions. Validation-11/08 drives 31 shapes through the byte-pinned H10
parser: 11 newly distinguishing, 20 agreeing as required, 0 regressing.

### The container/leaf ownership audit

Validation-11/09 replaces the implicit ordering with one explicit model. Each window prints depth
before/after with content indents, fence/HTML state with the owning depth (`@n`), structural
classification, `CLOSED-BY-CONTAINER` where the line ended an owned leaf, heading/table eligibility
on that same line, and a `lines == transitions` check, which holds everywhere. Shown: bullet/ordered
fence deaths with same-line heading eligibility; type-7/type-1 deaths at a heading and at a dedented
table (table eligible same line); closed-fence locality without a kill; the `@0` top-level lifetime;
the nested inner/outer split; the missing-whitespace literal staying `ordinary` beside a valid
multi-attribute `html-open html7@0`; the textarea blank split; search trailing vs alone; and the
clean-document spot check.

### Coverage map and evidence

| Obligation | Distinguishing input | Expected observable facts / forbidden | Location and result |
|---|---|---|---|
| C4 — raw leaves die with their containers | bullet/ordered fences, type-7, type-1/comment shapes | H10 cascade/manufacture/silence → C exact GREEN or exact RED | 6 container tests + 08 cases 01/02/04/05/06, pass |
| C4 — only the container-local leaf ends | closed fence, nested pair, top-level unclosed, quote analogue | locality green; inner RED, outer green; top-level preserved; quotes own nothing | 4 container tests + 08 cases 07–10, pass |
| C4 — whitespace before every attribute | GFM literal, quoted/valueless neighbors | H10 RED-manufactured → C GREEN ordinary | 2 attribute tests + 08 cases 11–14, pass |
| C4 — valid attributes still open blocks | multi/boolean/spaced/self-closing | RED in both (no over-correction) | 2 attribute tests + 08 cases 15–17/19, pass |
| C4 — pinned GFM 0.29 textarea/search | blank/no-blank textarea; trailing/alone search | H10 RED-manufactured → C GREEN; raw-continuation RED in both | textarea/search pair + 08 cases 20–25, pass |
| C4 — script/pre/style/type-4/type-6 intact | type-1 trio, declaration, div | RED/GREEN per published rule, both parsers | 08 cases 22/23/26/27, pass |
| C4 — all prior rounds preserved | 133 round-10 and earlier controls | all still pass verbatim | unchanged tests, pass |
| C3/C7 — nothing else moved | full suite, typecheck, export digests | 1990/1990, typecheck clean, export map unchanged | validation-11/02–07 |

- **Selected 012 methods:** deterministic execution (dominant) and process/documentation
  (C4/C5/C6/C8 are records). **Materially excluded, unchanged:** race and fault, native
  Runtime/Driver, external evidence/gate.
- **Tests added:** 13 cases (8 container-ownership, 4 attribute-separator, net +1 from the
  textarea/search replacement pair). **Removed:** none. **Weakened:** none. Architecture suite
  277 → 290 cases (146 C4); full suite 1977 → 1990; conformance 1864 → 1877; zero skipped.
- **Compatibility / refusal:** unchanged. The target package stays `private` and refusal-only.
- **Baseline / guides / skills:** unaffected; `check:builder-docs` unchanged at 26 files, 284
  links/anchors, 38 public imports.

### Prior findings

| Finding | Round | Disposition |
|---|---|---|
| K10-R10-01 | 10 | **CLOSED** this round by container-owned leaf lifetime; bullet/ordered cascade → green, type-7 manufacture → green, type-1/comment silence → exact catch; 8 committed controls, ownership audit |
| K10-R10-02 | 10 | **CLOSED** this round by required attribute separators; GFM literal + quoted neighbors → ordinary green; valid attribute shapes stay raw; 4 committed controls |
| K10-R10-03 | 10 | **CLOSED** this round by pinning GFM 0.29 (type 1 without textarea, type 6 without search); textarea-blank and search-trailing → green; raw continuations intact; replacement pair |
| K10-R9-01 | 9 | CLOSED in round 10; container-depth reconstruction preserved verbatim in behavior, re-asserted |
| K10-R9-02 | 9 | CLOSED in round 10; complete-tag recognizer extended (not weakened) for separators; all controls pass |
| K10-R8-01 | 8 | CLOSED in round 9; single-consumption layer preserved verbatim in behavior, re-asserted |
| K10-R8-02 | 8 | CLOSED in round 9; broadened correctly in round 10; all controls pass |
| K10-R7-01 | 7 | CLOSED in round 8; ATX/fence heading grammar preserved verbatim |
| K10-R6-01 | 6 | CLOSED in round 7; header/body split preserved verbatim |
| K10-R5-01 | 5 | CLOSED in round 6; GFM row grammar preserved verbatim |
| K10-R4-01, K10-R4-02 | 4 | CLOSED; key-before-value and evidence-record guard unchanged |
| K10-R3-01 | 3 | CLOSED; duplicate controls in both orders unchanged |
| K10-R2-01, K10-R2-02 | 2 | CLOSED; scanner reconstruction and relational comparison untouched |
| K10-R1-01, K10-R1-02 | 1 | CLOSED; unchanged |
| K1.0-SELF-08 … -17 | 4–8 | CLOSED; all controls unchanged and passing |
| K1.0-SELF-18, -19 | 9 | CLOSED in round 9; both still passing |
| K1.0-SELF-20 | 10 | CLOSED in round 10 (CRLF); control unchanged and passing |

### Additional self-found defects (separate provenance)

- **K1.0-SELF-21 — observation, no change.** Fence and indented-code detection use absolute
  indentation, so a fence marker at absolute indent 4 inside a wide-marker item (e.g. `10.` with
  content indent 4) reads as indented code in both H10 and C and never opens a leaf in either.
  Under GFM the relative indent is 0 and it would be a fence. The observable on the pinned
  wide-marker controls coincides with GFM truth either way (green: the heading delimits and the
  later table is outside), and no committed behavior changes there. Container-relative
  fence/code disambiguation is out of the review-10 scope and is left for a future packet if a
  real governed document ever needs it. Recorded here and in validation-11/09 window G, which
  shows the corner honestly (`indented-code`, no leaf).
- **K1.0-SELF-22 — cosmetic, no change.** A stale duplicate one-paragraph summary comment sits
  directly above `isDelimiterShaped` (the full `scanTransitions` contract already lives on the
  function itself). Pre-existing in H10; left untouched to keep the correction interval to the
  three findings.

No other in-scope defect was found. No unresolved owned semantic case remains; no blocker.

## Validation and interpretation

- **Exact commands / cwd / C / environment / exits / counts / raw paths / digests:** every row
  of the validation-11 [MANIFEST](validation-11/MANIFEST.md) table. Cwd
  `/Users/rex-shih/Documents/ArrokothI/arrokothi` throughout; C
  `6880b4825ed1aa2363f8366431052f88d6955be8`; Node v25.2.1 / npm 11.6.2 / TypeScript 5.9.3 /
  Darwin 25.6.0 arm64. `npm run typecheck` exit 0 clean; `npm test` exit 0, 1990/1990, 293 suites,
  0 fail/skipped; `npm run test:conformance` exit 0, 1877/1877, 274 suites, 0 fail/skipped;
  `npm run check:builder-docs` exit 0 (26/284/38); `npm run test:kernel` 4/4; `npm run test:sdk`
  22/22; demonstration 31 cases (11 distinguishing, 20 agreeing, 0 regressions), exit 0; audit 11
  windows with lines == transitions everywhere, exit 0. Raw logs 01–09 plus digests are the
  MANIFEST attachments. There is no lint or build script in this repository; typecheck and
  builder-docs are the relevant static checks.
- **External fixture prepared / gate executed / external decision, separately; pinned
  owners/revisions:** benchmark E1 preparation unchanged from the contract's *Release provenance*
  (branch `codex/e1-kernel-acceptance-capture`, C2
  `d8f17549c31f9ee5d995e773c2f211faed2785fb` / H2
  `8de04779d279dba82cf834d419e465d2b677ef46`, benchmark `main`
  `5a3f1ba525f68244701b1f73a1d29c4902ffe589`): built, inspected at release, accepted by nobody,
  closes no E1 criterion. No E1 result is claimed; no benchmark artifact was touched.
- **Checks not run and resulting claim limits:** `npm run test:evals` was not run. This packet
  changes no Agent or model-facing behaviour and nothing in the diff is reachable from an eval.
- **Why evidence supports each criterion (implementer assessment, not acceptance):** C1/C2 — the
  target-zone walk and 23 forbidden-edge controls are untouched and green inside the 1990 full
  suite. C3 — full suite 1990/1990, typecheck clean, export digests unchanged, no legacy source
  moved (correction interval is contract + C4 oracle/tests only). C4 — 146/146 C4 tests green
  including 13 new controls for the three findings, plus the 31-case H10→C demonstration and the
  ownership audit. C5 — twelve deferrals still assigned (untouched). C6 — target package still
  private/refusal-only (untouched). C7 — legacy quarantine assertions and the 326-source
  scanner-identity control green; suite grew only by addition. C8 — E1 identities recorded,
  unaccepted, no result claimed. C9 — scanner/evidence machinery untouched and green;
  `tests/conformance/k0` byte-identical to base.
- **Design choices, owner amendments, assumptions, strongest remaining risk:** one ownership
  integer per leaf plus kill-on-container-end (no new block types, no grammar beyond the pinned
  GFM 0.29 set); separators required exactly where GFM requires them. No owner amendment was
  sought: aligning with the already-cited GFM rules needs none. Strongest remaining risk is the
  documented SELF-21 corner (absolute-indent fence/code disambiguation inside deep containers);
  it is behavior-neutral on every pinned control.
- **Third-party review under AGENTS.md, or none:** none. No third-party code, dependency,
  service, asset or bundled material was learned from, used, copied or adapted in this round;
  the only external reference is the published GFM specification already cited by the contract,
  read as a rule source (no text copied into the repository).

## Handoff

- Ready for independent review. Remaining work: none in this packet.
- Base/C/H and verified push SHA supplied externally; no offline bundle (push available).
- No self-acceptance; successor release remains owner-controlled. No E1 result, no K1 acceptance.
