# Implementation report — K1.0, round 13

## Identity

- **Packet / parent:** K1.0 — target boundary and legacy quarantine; parent milestone K1.
  **Contract:** [`contract.md`](contract.md), **revision 13**.
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
- **Previous reviewed H12:** `da7db0275049a78e069a4068ca68b1b8f296e6a3`.
  **Round-12 review record:** [`review-12.md`](review-12.md), recorded by
  `82a79451507a239f759dbb3c22e5f3566af33a95`, which was the advertised branch tip at session start.
  Advertised remote `main` remained exactly base. Benchmark E1 preparation was rechecked read-only
  from the contract's *Release provenance* identities (branch
  `codex/e1-kernel-acceptance-capture`, C2 `d8f17549c31f9ee5d995e773c2f211faed2785fb` / H2
  `8de04779d279dba82cf834d419e465d2b677ef46`, benchmark `main`
  `5a3f1ba525f68244701b1f73a1d29c4902ffe589`): built, accepted by nobody, closes no E1
  criterion. No E1 result is claimed; no benchmark artifact was touched.
- **Payload C:** `8c7113578fcc475758e4fcbbaf5beb372385d082`. Its parent is exactly the review-12
  record commit, so the correction interval is `82a79451…..8c711357…`, one commit touching only
  contract revision 13, `inventory-oracle.ts`, and `kernel-landing-zone.test.ts`.
- **Candidate H:** the commit containing this report. Its full SHA is supplied in the external
  handoff, after the push; it cannot be named from inside itself.
- **Exact C..H administrative allowlist:** `docs/development/work/K1.0/implementation-13.md`;
  `docs/development/work/K1.0/validation-13/` (MANIFEST.md and nine declared output-only `.log`
  attachments); and the status transcriptions in `docs/development/007-work-packets.md`,
  `docs/development/001-current-status-and-roadmap.md` and `docs/development/README.md`. No source,
  test, fixture, script, evaluator, threshold, package or configuration content first appears in H.
- **Working tree:** clean at C apart from `validation-13/`, which the validation run itself writes;
  clean at H. **Push:** performed after H exists; the advertised remote SHA is verified and reported
  in the external handoff, not claimed here.

## Changes and coverage

### The only open finding

**K10-R12-01 — P2 — the raw-HTML scanner conflates three different GFM whitespace classes.
Disposition: CLOSED by reconstructing the lexical model once.**

Round 12 corrected *which tokens* may follow a type-6 tag name but inherited the host meaning of
"whitespace": type-1/6 used ECMAScript `\s` (admits NBSP and other Unicode whitespace GFM does
not), `parseCompleteTag` hand-skipped only space/tab (rejecting valid VT/FF attribute
whitespace), and `isBlankLine` used `trim()` (closing raw blocks on NBSP/VT/FF-only lines GFM
does not call blank). The prior pass missed this layer because its neighbor audit derived the
allowed boundary *tokens* without independently deriving the specification's lexical *classes*
(§2.1 whitespace vs Unicode whitespace vs blank-line whitespace) — recorded here per the 006/012
repeated-subsystem reconstruction rule.

One explicit GFM whitespace class (exactly SPACE/TAB/LF/VT/FF/CR, single source
`GFM_WS_INNER`) now serves every type-1 start boundary, every type-6 start boundary, every
`parseCompleteTag` attribute separator, optional whitespace around `=`, pre-close whitespace,
trailing-whitespace check, and the unquoted-value terminator set. A distinct GFM blank-line
predicate (SPACE/TAB only, tolerating one trailing CR left by CRLF splitting, SELF-20) serves
type-6/7 termination and the table/section blank decisions that share it. The invariant is now
explicit in code: every C4 Markdown lexical predicate uses the character class defined by the
governing GFM production. List markers, indentation, thematic breaks, ATX heading text and
table-cell normalization keep their own grammar rules and are deliberately untouched — no global
`\s`/`trim()` replacement was performed.

Demonstrated H12 → C in validation-13/08 (13 shapes through byte-pinned H12): five silent H12
misses become exact C RED(2) further tables (VT/FF type-7 openers, VT around `=`, NBSP-only and
VT-only lifetime continuation); two H12 manufactured disagreements become C GREEN (NBSP type-6
boundary, and the NBSP script line whose host-`\s` type-1 opener swallowed the rest of the
document into a RED(21) cascade); six agreements (valid VT type-6 boundary, space-only
termination, ASCII syntax, round-12 token matrix) confirm no over-correction.

### Preserved round-12 substance

Exact `/` versus `/>` type-6 handling, the literal-`$` correction, container-owned raw-leaf
lifetime with `ownerDepth`, same-line eligibility after container closure, top-level leaf
lifetime, round-10 list/container depth, round-9 fence single-consumption, structural top-level
exact-L2 section identity, structural header/body identity, one-governed-table/further-table
accounting, GFM row discovery, key-before-value uniqueness, relational inventory comparison and
dependency recomputation, the C1/C2/C9 scanner reconstruction, and the type-7 quoted-attribute,
missing-attribute-whitespace and GFM-0.29 `textarea`/`search` fixes are all unchanged in behavior
and re-asserted: the full suite passes with zero fail/skipped, and the clean inventory parses
identically (117 lines → 117 transitions; no container kill fires on the clean tree).

### Distinguishing controls committed with it

One compact whitespace/blank-line matrix ("GFM whitespace and blank-line lexical classes
(K10-R12-01)" with 7 tests): VT/FF type-7 openers RED; VT/FF optional/trailing positions RED;
NBSP type-1/6 non-boundaries GREEN plus the Zones-placed NBSP-script no-swallow proof;
NBSP/VT/FF-only lifetime continuation RED for both type-7 and type-6; space/tab-only termination
GREEN; and ASCII/CRLF/token-matrix preservation. Validation-13/08 drives 13 shapes through the
byte-pinned H12 parser: 7 newly distinguishing, 6 agreeing as required, 0 regressing.
Validation-13/09 shows 9 isolated windows with kind/depth/eligibility per line and lines ==
transitions everywhere.

### Coverage map and evidence

| Obligation | Distinguishing input | Expected observable facts / forbidden | Location and result |
|---|---|---|---|
| C4 — VT/FF open valid type-7 tags | `<Warning\x0Btitle="x">`, `<Warning\x0Ctitle="x">` + real heading + planted table | H12 GREEN-silence → C RED(2) exact further table | new matrix tests 1–2 + 08 cases 01–03, pass |
| C4 — NBSP is neither boundary nor blank | `<div\xA0x>`, `<script\xA0x>`, NBSP/VT/FF-only lifetime lines | H12 RED-manufactured/GREEN-silence → C GREEN/RED(2) per GFM | new matrix tests 3–5 + 08 cases 04–07, pass |
| C4 — space/tab termination intact | space-only / tab-only fillers | GREEN in both (no over-correction) | new matrix test 6 + 08 case 09, pass |
| C4 — ASCII/CRLF/prior matrix intact | ASCII attributes, CRLF-adjacent VT, slash/dollar forms | RED/GREEN per grammar in both | new matrix test 7 + 08 cases 10–12, pass |
| C4 — all prior rounds preserved | full suite + conformance | 2001/2001, 1888/1888, zero skipped | unchanged tests + 08/09, pass |
| C3/C7 — nothing else moved | full suite, typecheck, export digests | 2001/2001, typecheck clean, export map unchanged | validation-13/02–07 |

- **Selected 012 methods:** deterministic execution (dominant) and process/documentation
  (C4/C5/C6/C8 are records). **Materially excluded, unchanged:** race and fault, native
  Runtime/Driver, external evidence/gate.
- **Tests added:** 7 cases (the whitespace/blank-line matrix). **Removed:** none.
  **Weakened:** none. Architecture suite 294 → 301 cases; full suite 1994 → 2001; conformance
  1881 → 1888; zero skipped.
- **Compatibility / refusal:** unchanged. The target package stays `private` and refusal-only.
- **Baseline / guides / skills:** unaffected; `check:builder-docs` unchanged at 26 files, 284
  links/anchors, 38 public imports.

### Prior findings

| Finding | Round | Disposition |
|---|---|---|
| K10-R12-01 | 12 | **CLOSED** this round by the reconstructed lexical model; 5 misses caught, 2 manufactured cleared, 6 agreements; 7 committed controls + 08/09 |
| K10-R11-01 | 11 | **CLOSED** in round 12; slash-vs-`/>` and literal-dollar boundary preserved verbatim, re-asserted |
| K10-R10-01 | 10 | **CLOSED** in round 11; container-owned leaf lifetime preserved verbatim, re-asserted |
| K10-R10-02 | 10 | **CLOSED** in round 11; required attribute separators preserved (now expressed in GFM whitespace), re-asserted |
| K10-R10-03 | 10 | **CLOSED** in round 11; GFM 0.29 textarea/search pin preserved verbatim, re-asserted |
| K10-R9-01 | 9 | CLOSED in round 10; container-depth reconstruction preserved verbatim, re-asserted |
| K10-R9-02 | 9 | CLOSED in round 10; complete-tag recognizer extended to GFM whitespace (not weakened), re-asserted |
| K10-R8-01 | 8 | CLOSED in round 9; single-consumption layer preserved verbatim, re-asserted |
| K10-R8-02 | 8 | CLOSED in round 9; broadened correctly in round 10; all controls pass |
| K10-R7-01 | 7 | CLOSED in round 8; ATX/fence heading grammar preserved verbatim |
| K10-R6-01 | 6 | CLOSED in round 7; header/body split preserved verbatim |
| K10-R5-01 | 5 | CLOSED in round 6; GFM row grammar preserved verbatim |
| K10-R4-01, K10-R4-02 | 4 | CLOSED; key-before-value and evidence-record guard unchanged |
| K10-R3-01 | 3 | CLOSED; duplicate controls in both orders unchanged |
| K10-R2-01, K10-R2-02 | 2 | CLOSED; scanner reconstruction and relational comparison untouched |
| K10-R1-01, K10-R1-02 | 1 | CLOSED; unchanged |
| K1.0-SELF-08 … -22 | 4–11 | CLOSED; all controls unchanged and passing |
| K1.0-SELF-23 | 12 | CLOSED in round 12 (validation-11 blob identity); correction intact |

### Additional self-found defects (separate provenance)

None in this round. The `parseCompleteTag` unquoted-value terminator set was found during the
required dependency trace (it excluded space/tab/CR/LF but not VT/FF) and is corrected above as
part of K10-R12-01 itself, not as a separate finding; list-marker, indentation, thematic-break,
heading-text and table-cell positions were audited and deliberately left on their own rules.

No unresolved owned semantic case remains; no blocker. SELF-21 remains an observation: no
general Markdown renderer was built, and the whitespace reconstruction demonstrated no directly
interacting blocking defect beyond K10-R12-01.

## Validation and interpretation

- **Exact commands / cwd / C / environment / exits / counts / raw paths / digests:** every row
  of the validation-13 [MANIFEST](validation-13/MANIFEST.md) table. Cwd
  `/Users/rex-shih/Documents/ArrokothI/arrokothi` throughout; C
  `8c7113578fcc475758e4fcbbaf5beb372385d082`; Node v25.2.1 / npm 11.6.2 / TypeScript 5.9.3 /
  Darwin 25.6.0 arm64. `npm run typecheck` exit 0 clean; `npm test` exit 0, 2001/2001, 295 suites,
  0 fail/skipped; `npm run test:conformance` exit 0, 1888/1888, 276 suites, 0 fail/skipped;
  `npm run check:builder-docs` exit 0 (26/284/38); `npm run test:kernel` 4/4; `npm run test:sdk`
  22/22; demonstration 13 cases (7 distinguishing, 6 agreeing, 0 regressions), exit 0; audit 9
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
  target-zone walk and 23 forbidden-edge controls are untouched and green inside the 2001 full
  suite. C3 — full suite 2001/2001, typecheck clean, export digests unchanged, no legacy source
  moved (correction interval is contract + C4 oracle/tests only). C4 — 157/157 C4 tests green
  including the 7 new lexical controls, plus the 13-case H12→C demonstration (strongest each way:
  VT type-7 H12 GREEN-silence → C RED(2) exact catch; NBSP type-6 H12 RED(2)-manufactured → C
  GREEN with the earlier heading real) and the 9-window lexical/transition audit. C5 — twelve
  deferrals still assigned (untouched). C6 — target package still private/refusal-only
  (untouched). C7 — legacy quarantine assertions and the 326-source scanner-identity control
  green; suite grew only by addition. C8 — E1 identities recorded, unaccepted, no result claimed.
  C9 — scanner/evidence machinery untouched and green; `tests/conformance/k0` byte-identical to
  base.
- **Design choices, owner amendments, assumptions, strongest remaining risk:** one shared GFM
  class source plus one blank-line predicate, applied only to raw-HTML/tag-grammar positions;
  neighboring Markdown rules keep theirs by explicit decision. No owner amendment was sought:
  aligning with the already-cited GFM 0.29 rules needs none. Strongest remaining risk is the
  documented SELF-21 corner (absolute-indent fence/code disambiguation inside deep containers);
  it is behavior-neutral on every pinned control and untouched here.
- **Third-party review under AGENTS.md, or none:** none. No third-party code, dependency,
  service, asset or bundled material was learned from, used, copied or adapted in this round;
  the only external reference is the published GFM specification already cited by the contract,
  read as a rule source (no text copied into the repository).

## Handoff

- Ready for independent review. Remaining work: none in this packet.
- Base/C/H and verified push SHA supplied externally; no offline bundle (push available).
- No self-acceptance; successor release remains owner-controlled. No E1 result, no K1 acceptance.
