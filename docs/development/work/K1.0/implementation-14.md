# Implementation report — K1.0, round 14

## Identity

- **Packet / parent:** K1.0 — target boundary and legacy quarantine; parent milestone K1.
  **Contract:** [`contract.md`](contract.md), **revision 14**.
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
- **Previous reviewed H13:** `d299e4215634b496e3ae8c54708b45b0c14231bf`.
  **Round-13 review record:** [`review-13.md`](review-13.md), recorded by
  `efb3b11354fe9acde044bad3a4d0e72807faa5d9`, which was the advertised branch tip at session start.
  Advertised remote `main` remained exactly base. Benchmark E1 preparation was rechecked read-only
  from the contract's *Release provenance* identities (branch
  `codex/e1-kernel-acceptance-capture`, C2 `d8f17549c31f9ee5d995e773c2f211faed2785fb` / H2
  `8de04779d279dba82cf834d419e465d2b677ef46`, benchmark `main`
  `5a3f1ba525f68244701b1f73a1d29c4902ffe589`): built, accepted by nobody, closes no E1
  criterion. No E1 result is claimed; no benchmark artifact was touched.
- **Payload C:** `933e357a2d1fab9660f8af4a89b3031594dd3caa`. Its parent is exactly the review-13
  record commit, so the correction interval is `efb3b113…..933e357a…`, one commit touching only
  contract revision 14, `inventory-oracle.ts`, and `kernel-landing-zone.test.ts`.
- **Candidate H:** the commit containing this report. Its full SHA is supplied in the external
  handoff, after the push; it cannot be named from inside itself.
- **Exact C..H administrative allowlist:** `docs/development/work/K1.0/implementation-14.md`;
  `docs/development/work/K1.0/validation-14/` (MANIFEST.md and nine declared output-only `.log`
  attachments); and the status transcriptions in `docs/development/007-work-packets.md`,
  `docs/development/001-current-status-and-roadmap.md` and `docs/development/README.md`. No source,
  test, fixture, script, evaluator, threshold, package or configuration content first appears in H.
- **Working tree:** clean at C apart from `validation-14/`, which the validation run itself writes;
  clean at H. **Push:** performed after H exists; the advertised remote SHA is verified and reported
  in the external handoff, not claimed here.

## Changes and coverage

### The only open finding

**K10-R13-01 — P2 — physical-line tokenization omits GFM lone-CR line endings.
Disposition: CLOSED by tokenizing from the GFM line-ending production first.**

`scanTransitions` began with `markdown.split("\n")`: LF recognized, CRLF tolerated via leftover
CR, lone CR collapsed into its neighbors so a CR-only inventory scanned as one 117-heading line
instead of 117 physical lines. No in-line class fix can repair structure after that collapse, so
the repair is one `splitPhysicalLines` tokenizer (`CRLF | LF | CR`, CR-first preference so CRLF
is one ending) feeding the shared block scan; CR is a boundary there, never in-line whitespace,
and tokenization precedes every per-line predicate. EOF behavior is deliberate and pinned by
tests: a trailing ending of any kind yields one final empty line, no trailing ending yields none,
the empty document is one empty line — byte-identical to the old split for CR-free inputs, so no
LF-document behavior changes. The audit found exactly one `markdown.split("\n")`-equivalent in
the C4 evidence parser (the `scanTransitions` head; `sectionText`'s `join("\n")` reassembles
already-tokenized lines, `splitGfmRow` splits cells not lines, and the manifest/test-file splits
live outside the parser), so there is now one coherent physical-line model. Round 13 missed this
layer because it reconstructed classes *inside* physical lines while its audit generated only
LF/CRLF inputs and never derived the preceding line-ending production — recorded here per the
006/012 repeated-subsystem rule, whose dependency path now reads end to end: source bytes/string
→ GFM line endings → physical lines → per-line GFM whitespace/blankness → container/leaf state →
top-level heading/table eligibility → section/table identity → keyed relation.

Demonstrated H13 → C in validation-14/08 (9 shapes through byte-pinned H13): the CR-only whole
inventory flips H13 RED(26, governed tables missing) → C GREEN baseline-identical (primary
whole-document case through `parseInventory`/`inventoryDisagreements`); the CR-only planted-table
twin flips H13 RED(26, catch buried in missing-section noise) → C RED(2) exact further table;
`a<CR>b` flips 1 → 2 transitions; CRLF/LF primitives, the LF twin, the VT type-7 control and the
CRLF whole-inventory case agree as required; 0 regressions.

### Preserved round-13 substance

Exact GFM whitespace (SPACE/TAB/LF/VT/FF/CR), separate SPACE/TAB-only blank lines, VT/FF
handling throughout `parseCompleteTag`, NBSP exclusion from type-1/6 boundaries, NBSP/VT/FF
nonblank raw-block lifetime, the round-12 slash-vs-`/>` and literal-`$` fix, container-owned
leaf lifetime with `ownerDepth`, same-line eligibility after container closure, top-level leaf
lifetime, list/container top-level heading identity, fence single-consumption, structural
header/body identity, one-governed-table/further-table accounting, GFM row discovery,
key-before-value uniqueness, relational comparison and dependency recomputation, the C1/C2/C9
scanner machinery and all SELF-12…23 controls are unchanged in behavior and re-asserted: the
full suite passes with zero fail/skipped, and the clean inventory parses identically
(117 lines → 117 transitions; CR-only recoding yields the identical 117 texts; no container
kill fires on either tree).

### Distinguishing controls committed with it

One compact line-ending matrix ("GFM line endings (K10-R13-01)" with 8 tests): CR-only and
CRLF whole-inventory equivalence, mixed-ending boundary preservation (line-wise cycled endings
with a blank-aware no-fusion rule, 29 CRLF + 29 lone-CR + 58 LF over the real document),
CR/CRLF/LF primitives, lone-CR section termination, lone-CR raw-block lifetime twins for type-6
and type-7, CR-distinct table rows, and final-line EOF cases. Validation-14/08 drives 9 shapes
through the byte-pinned H13 parser: 3 newly distinguishing, 6 agreeing as required, 0
regressing. Validation-14/09 shows 8 windows with kind/depth/eligibility per line and lines ==
transitions everywhere.

### Coverage map and evidence

| Obligation | Distinguishing input | Expected observable facts / forbidden | Location and result |
|---|---|---|---|
| C4 — CR-only inventory is the same document | whole real inventory with `s/\r?\n/\r/g` | H13 RED(26) missing-tables → C GREEN baseline-identical | new matrix tests 1–2 + 08 cases 01–02, pass |
| C4 — boundaries survive mixed endings | cycled LF/CRLF/CR twin of a planted-table mutation | exact same RED(2) further-table messages as the LF twin | new matrix test 3 + twin-equality asserts, pass |
| C4 — primitives and EOF deliberate | `a<CR>b`, `a<CRLF>b`, `a<LF>b`, `a`, `a\n`, `a\r`, `a\r\n`, `""` | 2/2/2 transitions; 1/2/2/2/1 texts | new matrix tests 4, 8 + 09 windows A–E, pass |
| C4 — lone-CR section/raw/table parity | CR twins of heading-termination, type-6/7 lifetime, CR table rows | message-identical to LF twins | new matrix tests 5–7 + 08 case 04, pass |
| C4 — all prior rounds preserved | full suite + conformance | 2009/2009, 1896/1896, zero skipped | unchanged tests + 08/09, pass |
| C3/C7 — nothing else moved | full suite, typecheck, export digests | 2009/2009, typecheck clean, export map unchanged | validation-14/02–07 |

- **Selected 012 methods:** deterministic execution (dominant) and process/documentation
  (C4/C5/C6/C8 are records). **Materially excluded, unchanged:** race and fault, native
  Runtime/Driver, external evidence/gate.
- **Tests added:** 8 cases (the line-ending matrix). **Removed:** none. **Weakened:** none.
  Architecture suite 301 → 309 cases; full suite 2001 → 2009; conformance 1888 → 1896; zero skipped.
- **Compatibility / refusal:** unchanged. The target package stays `private` and refusal-only.
- **Baseline / guides / skills:** unaffected; `check:builder-docs` unchanged at 26 files, 284
  links/anchors, 38 public imports.

### Prior findings

| Finding | Round | Disposition |
|---|---|---|
| K10-R13-01 | 13 | **CLOSED** this round by GFM production tokenization; CR-only inventory GREEN, twins message-identical, primitives/EOF pinned; 8 committed controls + 08/09 |
| K10-R12-01 | 12 | **CLOSED** in round 13; whitespace/blank-line classes preserved verbatim, re-asserted |
| K10-R11-01 | 11 | **CLOSED** in round 12; slash-vs-`/>` and literal-dollar boundary preserved verbatim, re-asserted |
| K10-R10-01 | 10 | **CLOSED** in round 11; container-owned leaf lifetime preserved verbatim, re-asserted |
| K10-R10-02 | 10 | **CLOSED** in round 11; attribute separators preserved (in GFM whitespace), re-asserted |
| K10-R10-03 | 10 | **CLOSED** in round 11; GFM 0.29 textarea/search pin preserved verbatim, re-asserted |
| K10-R9-01 | 9 | CLOSED in round 10; container-depth reconstruction preserved verbatim, re-asserted |
| K10-R9-02 | 9 | CLOSED in round 10; complete-tag recognizer preserved, re-asserted |
| K10-R8-01 | 8 | CLOSED in round 9; single-consumption layer preserved verbatim, re-asserted |
| K10-R8-02 | 8 | CLOSED in round 9; broadened correctly in round 10; all controls pass |
| K10-R7-01 | 7 | CLOSED in round 8; ATX/fence heading grammar preserved verbatim |
| K10-R6-01 | 6 | CLOSED in round 7; header/body split preserved verbatim |
| K10-R5-01 | 5 | CLOSED in round 6; GFM row grammar preserved verbatim |
| K10-R4-01, K10-R4-02 | 4 | CLOSED; key-before-value and evidence-record guard unchanged |
| K10-R3-01 | 3 | CLOSED; duplicate controls in both orders unchanged |
| K10-R2-01, K10-R2-02 | 2 | CLOSED; scanner reconstruction and relational comparison untouched |
| K10-R1-01, K10-R1-02 | 1 | CLOSED; unchanged |
| K1.0-SELF-08 … -23 | 4–12 | CLOSED; all controls unchanged and passing |

### Additional self-found defects (separate provenance)

None in this round. While building the mixed-ending control, a naive per-character
`\n`-replacement mixer fused a `\r` ending with the next line's `\n` into one CRLF and deleted
blank lines; the committed `toMixed` helper is line-wise with a blank-aware no-fusion rule
(LF forced before blank lines) and documents the hazard. That defect was in test scaffolding,
never in the production parser, and is recorded here rather than as a packet finding. No
unresolved owned semantic case remains; no blocker. SELF-21 remains an observation: no general
Markdown renderer was built, and tokenization demonstrated no further blocking interaction.

## Validation and interpretation

- **Exact commands / cwd / C / environment / exits / counts / raw paths / digests:** every row
  of the validation-14 [MANIFEST](validation-14/MANIFEST.md) table. Cwd
  `/Users/rex-shih/Documents/ArrokothI/arrokothi` throughout; C
  `933e357a2d1fab9660f8af4a89b3031594dd3caa`; Node v25.2.1 / npm 11.6.2 / TypeScript 5.9.3 /
  Darwin 25.6.0 arm64. `npm run typecheck` exit 0 clean; `npm test` exit 0, 2009/2009, 296 suites,
  0 fail/skipped; `npm run test:conformance` exit 0, 1896/1896, 277 suites, 0 fail/skipped;
  `npm run check:builder-docs` exit 0 (26/284/38); `npm run test:kernel` 4/4; `npm run test:sdk`
  22/22; demonstration 9 shapes (3 distinguishing, 6 agreeing, 0 regressions), exit 0; audit 8
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
  target-zone walk and 23 forbidden-edge controls are untouched and green inside the 2009 full
  suite. C3 — full suite 2009/2009, typecheck clean, export digests unchanged, no legacy source
  moved (correction interval is contract + C4 oracle/tests only). C4 — 165/165 C4-file tests
  green including the 8 new line-ending controls, plus the 9-shape H13→C demonstration (strongest:
  CR-only whole inventory H13 RED(26) → C GREEN baseline-identical) and the 8-window
  line-ending/transition audit. C5 — twelve deferrals still assigned (untouched). C6 — target
  package still private/refusal-only (untouched). C7 — legacy quarantine assertions and the
  326-source scanner-identity control green; suite grew only by addition. C8 — E1 identities
  recorded, unaccepted, no result claimed. C9 — scanner/evidence machinery untouched and green;
  `tests/conformance/k0` byte-identical to base.
- **Design choices, owner amendments, assumptions, strongest remaining risk:** one tokenizer from
  the GFM production consumed once by the shared scan; no per-rule CR patching; CR-free inputs
  byte-identical by construction. No owner amendment was sought: aligning with the already-cited
  GFM 0.29 rules needs none. Strongest remaining risk is the documented SELF-21 corner
  (absolute-indent fence/code disambiguation inside deep containers); it is behavior-neutral on
  every pinned control and untouched here.
- **Third-party review under AGENTS.md, or none:** none. No third-party code, dependency,
  service, asset or bundled material was learned from, used, copied or adapted in this round;
  the only external reference is the published GFM specification already cited by the contract,
  read as a rule source (no text copied into the repository).

## Handoff

- Ready for independent review. Remaining work: none in this packet.
- Base/C/H and verified push SHA supplied externally; no offline bundle (push available).
- No self-acceptance; successor release remains owner-controlled. No E1 result, no K1 acceptance.
