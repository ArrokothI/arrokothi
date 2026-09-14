# Implementation report — K1.0, round 12

## Identity

- **Packet / parent:** K1.0 — target boundary and legacy quarantine; parent milestone K1.
  **Contract:** [`contract.md`](contract.md), **revision 12**.
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
- **Previous reviewed H11:** `4cd711f71fcafb64ffaa7d49a715d05eaec3c2dc`.
  **Round-11 review record:** [`review-11.md`](review-11.md), recorded by
  `f22786173120976be7b8bdfac23c6fa1db660f30`, which was the advertised branch tip at session start.
  Advertised remote `main` remained exactly base; advertised branch remained exactly the
  review-11 record. Benchmark E1 preparation was rechecked read-only from the contract's
  *Release provenance* identities (branch `codex/e1-kernel-acceptance-capture`, C2
  `d8f17549c31f9ee5d995e773c2f211faed2785fb` / H2 `8de04779d279dba82cf834d419e465d2b677ef46`,
  benchmark `main` `5a3f1ba525f68244701b1f73a1d29c4902ffe589`): built, accepted by nobody,
  closes no E1 criterion. No E1 result is claimed; no benchmark artifact was touched.
- **Payload C:** `ec713563b8b76273411231aff6f1f3ad49e4ffb0`. Its parent is exactly the review-11
  record commit, so the correction interval is `f22786173…..ec713563…`, one commit touching only
  contract revision 12, `inventory-oracle.ts`, `kernel-landing-zone.test.ts`, and the
  `validation-11/MANIFEST.md` SELF-23 correction section described below.
- **Candidate H:** the commit containing this report. Its full SHA is supplied in the external
  handoff, after the push; it cannot be named from inside itself.
- **Exact C..H administrative allowlist:** `docs/development/work/K1.0/implementation-12.md`;
  `docs/development/work/K1.0/validation-12/` (MANIFEST.md and nine declared output-only `.log`
  attachments); and the status transcriptions in `docs/development/007-work-packets.md`,
  `docs/development/001-current-status-and-roadmap.md` and `docs/development/README.md`. No source,
  test, fixture, script, evaluator, threshold, package or configuration content first appears in H.
- **Working tree:** clean at C apart from `validation-12/`, which the validation run itself writes;
  clean at H. **Push:** performed after H exists; the advertised remote SHA is verified and reported
  in the external handoff, not claimed here.

## Changes and coverage

### The only open finding

**K10-R11-01 — P2 — type-6 raw-HTML start accepts a bare `/` (and literal `$`) after a block tag name.
Disposition: CLOSED by correcting the boundary predicate to the structural grammar.**

The committed type-6 start check was:

```ts
const type6 = new RegExp(`^<\\/?(?:${HTML_BLOCK_TAGS})(?=[\\s>\\/$]|$)`, "i");
```

The character class admits `/` and `$` independently. Published GFM 0.29 §4.6 requires after a
recognized block tag name exactly one of: whitespace, end of line, `>`, or the exact two-character
string `/>`. A lone `/` is insufficient and `$` is not a boundary token. The predicate is now:

```ts
const type6 = new RegExp(`^<\\/?(?:${HTML_BLOCK_TAGS})(?=\\s|>|/>|$)`, "i");
```

This is a structural alternation, not another character class: `$` is the end anchor, never a
literal token, and `/` appears only inside the exact `/>` alternative. The tag-name literals are
untouched. Backtracking is preserved (e.g. `col` vs `colgroup` still resolves to the boundary-
satisfying alternative), and the fix is confined to the predicate.

Neighbor audit (required by the review, no state-machine reopen): type 1 already uses the
structural `(\s|>|$)` with no `/` or literal `$` — `<script/>` correctly stays ordinary (and type 7
excludes `script`, so it stays ordinary there too); types 2/3/5 are fixed prefixes needing no
boundary; type 4 is `<!` plus ASCII uppercase; type 7 is a complete tag via `parseCompleteTag`, so
`<div/ x>`, `<div/foo>`, `<div/` and `<div$foo>` fail there too and stay ordinary. No concrete
defect was found in neighbors; the container/leaf state machine is untouched.

Demonstrated H11 → C in validation-12/08: the review-literal `<div/ x>` plus `<div/foo>`,
`<div/` and `<div$foo>` flip RED(2)-manufactured → GREEN (the first exact ATX heading is real,
terminates Deferred, and the planted well-formed table after it is outside the governed section);
`<div/>`, `<div>`, `<div class=x>`, bare `<div` at EOL and closing `</div>`, `</div/>`,
`</div class=x>` agree RED(2) in both (raw blocks intact); `<divfoo> trailing prose` agrees GREEN
in both (the `div` prefix plus ordinary name character `f` never opened type 6); complete
`<divfoo>` alone agrees RED(2) via type 7 (prefix guard narrows type 6 without weakening type 7).

### Preserved round-11 substance

Container-owned fence/HTML leaf lifetime with `ownerDepth`, same-line eligibility after container
closure, top-level leaf lifetime, required whitespace before each type-7 attribute, the published
GFM 0.29 rule-set pin (`script`/`pre`/`style` only for type 1, no `search` in type 6), structural
top-level section identity, structural header/body identity, one-governed-table/further-table
accounting, GFM row discovery, key-before-value uniqueness, relational comparison, dependency
recomputation, and the C1/C2/C9 scanner reconstruction are all unchanged in behavior and
re-asserted: the full suite passes with zero fail/skipped, and the clean inventory parses
identically (117 lines → 117 transitions; no container kill fires on the clean tree; whole
document green).

### Distinguishing controls committed with it

One compact type-6 boundary matrix ("type-6 boundary tokens (K10-R11-01)" with 4 tests):
lone-slash/dollar GREEN (`<div/ x>`, `<div/foo>`, `<div/`, `<div$foo>` each followed by the exact
next governed heading and a contradictory well-formed table after it); valid open RED (`<div/>`,
`<div>`, `<div class=x>`, bare `<div`); closing-plus-prefix guard (`</div>`, `</div/>`,
`</div class=x>`, `</div` RED; `<divfoo> trailing prose` GREEN proving the prefix alone does not
open type 6; complete `<divfoo>` alone RED via type 7); and a round-11 spot-check
(textarea-blank GREEN, search-trailing GREEN, missing-whitespace GREEN, container-owned leaf
GREEN). Validation-12/08 drives 18 shapes through the byte-pinned H11 parser: 4 newly
distinguishing, 14 agreeing as required, 0 regressing. Validation-12/09 shows 19 isolated
windows with kind/depth/eligibility per line and lines == transitions everywhere.

### Coverage map and evidence

| Obligation | Distinguishing input | Expected observable facts / forbidden | Location and result |
|---|---|---|---|
| C4 — lone `/` and `$` stay ordinary | `<div/ x>`, `<div/foo>`, `<div/`, `<div$foo>` + real heading + planted table | H11 RED(2)-manufactured → C GREEN (heading real, table outside) | new matrix test 1 + 08 cases 01–04, pass |
| C4 — valid type-6 boundaries still open | `<div/>`, `<div>`, `<div class=x>`, bare `<div` | RED in both (no over-correction) | new matrix test 2 + 08 cases 05–08, pass |
| C4 — closing boundaries + prefix guard | `</div>`, `</div/>`, `</div class=x>`, `</div`; `<divfoo> trailing` GREEN, `<divfoo>` RED | RED/GREEN per grammar in both | new matrix test 3 + 08 cases 09–13, pass |
| C4 — round-11 controls unchanged | textarea/search/attribute/owner-depth spot shapes | GREEN/RED as before in both | new matrix test 4 + 08 cases 14–17, pass |
| C4 — all prior rounds preserved | full suite + conformance | 1994/1994, 1881/1881, zero skipped | unchanged tests + 08/09, pass |
| C3/C7 — nothing else moved | full suite, typecheck, export digests | 1994/1994, typecheck clean, export map unchanged | validation-12/02–07 |
| C4 neighbor audit — types 1/7 intact | `<script/>` ordinary, `<script>` type 1, `<search>` shapes | ordinary vs html1/html7 per rule | 09 windows G–H, pass |

- **Selected 012 methods:** deterministic execution (dominant) and process/documentation
  (C4/C5/C6/C8 are records). **Materially excluded, unchanged:** race and fault, native
  Runtime/Driver, external evidence/gate.
- **Tests added:** 4 cases (the type-6 boundary matrix). **Removed:** none. **Weakened:** none.
  Architecture suite 290 → 294 cases; full suite 1990 → 1994; conformance 1877 → 1881; zero skipped.
- **Compatibility / refusal:** unchanged. The target package stays `private` and refusal-only.
- **Baseline / guides / skills:** unaffected; `check:builder-docs` unchanged at 26 files, 284
  links/anchors, 38 public imports.

### Prior findings

| Finding | Round | Disposition |
|---|---|---|
| K10-R11-01 | 11 | **CLOSED** this round by the structural type-6 boundary; 4 malformed forms GREEN, valid open/closing/EOL RED, prefix guard GREEN/RED as required; 4 committed controls + 08/09 |
| K10-R10-01 | 10 | **CLOSED** in round 11; container-owned leaf lifetime preserved verbatim, re-asserted |
| K10-R10-02 | 10 | **CLOSED** in round 11; required attribute separators preserved verbatim, re-asserted |
| K10-R10-03 | 10 | **CLOSED** in round 11; GFM 0.29 textarea/search pin preserved verbatim, re-asserted |
| K10-R9-01 | 9 | CLOSED in round 10; container-depth reconstruction preserved verbatim, re-asserted |
| K10-R9-02 | 9 | CLOSED in round 10; complete-tag recognizer unchanged, re-asserted |
| K10-R8-01 | 8 | CLOSED in round 9; single-consumption layer preserved verbatim, re-asserted |
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
| K1.0-SELF-21, -22 | 11 | Observations left as recorded; no behavior change; still passing |

### Additional self-found defects (separate provenance)

- **K1.0-SELF-23 — evidence-record transcription, corrected in C.** `validation-11/MANIFEST.md`
  quoted the round-11 C production parser's git blob as `8782dbf461907c6a5f0934816cfd28a3568fbc3`
  (39 hex characters); a Git blob name has 40. The true blob is
  `8782dbf461907c6a5fc0934816cfd28a3568fbc3` (the recorded value with the `c` at offset 18
  dropped; verified by `git show 6880b48:tests/conformance/architecture/inventory-oracle.ts |
  git hash-object --stdin`). The original sentence is preserved and a superseding
  `## Correction, round 12 (K1.0-SELF-23)` section is added to that manifest, per the
  round-5 precedent and the mechanical `evidence-records.test.ts` rule that tolerates a wrong
  historical value only where a correction section quotes it. Full-suite evidence now passes
  1994/1994 including that guard; the demonstration observables are unchanged. No parser
  behaviour claim changes.

No other in-scope defect was found. No unresolved owned semantic case remains; no blocker.
SELF-21 remains an observation, not an authorization: no general Markdown parser was built;
the type-6 audit found no further blocking interaction.

## Validation and interpretation

- **Exact commands / cwd / C / environment / exits / counts / raw paths / digests:** every row
  of the validation-12 [MANIFEST](validation-12/MANIFEST.md) table. Cwd
  `/Users/rex-shih/Documents/ArrokothI/arrokothi` throughout; C
  `ec713563b8b76273411231aff6f1f3ad49e4ffb0`; Node v25.2.1 / npm 11.6.2 / TypeScript 5.9.3 /
  Darwin 25.6.0 arm64. `npm run typecheck` exit 0 clean; `npm test` exit 0, 1994/1994, 294 suites,
  0 fail/skipped; `npm run test:conformance` exit 0, 1881/1881, 275 suites, 0 fail/skipped;
  `npm run check:builder-docs` exit 0 (26/284/38); `npm run test:kernel` 4/4; `npm run test:sdk`
  22/22; demonstration 18 cases (4 distinguishing, 14 agreeing, 0 regressions), exit 0; audit 19
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
  target-zone walk and 23 forbidden-edge controls are untouched and green inside the 1994 full
  suite. C3 — full suite 1994/1994, typecheck clean, export digests unchanged, no legacy source
  moved (correction interval is contract + C4 oracle/tests + the SELF-23 manifest correction
  only). C4 — 150/150 C4 tests green including the 4 new type-6 boundary controls, plus the 18-case
  H11→C demonstration (strongest: `<div/ x>` H11 RED(2)-manufactured → C GREEN with the earlier
  heading real) and the 19-window boundary-token audit. C5 — twelve deferrals still assigned
  (untouched). C6 — target package still private/refusal-only (untouched). C7 — legacy quarantine
  assertions and the 326-source scanner-identity control green; suite grew only by addition. C8 —
  E1 identities recorded, unaccepted, no result claimed. C9 — scanner/evidence machinery untouched
  and green; `tests/conformance/k0` byte-identical to base.
- **Design choices, owner amendments, assumptions, strongest remaining risk:** one structural
  lookahead alternation (`\s|>|/>|$`) with no literal change and no state-machine change; neighbors
  audited, not reopened. No owner amendment was sought: aligning with the already-cited GFM 0.29
  rules needs none. Strongest remaining risk is the documented SELF-21 corner (absolute-indent
  fence/code disambiguation inside deep containers); it is behavior-neutral on every pinned control
  and untouched here.
- **Third-party review under AGENTS.md, or none:** none. No third-party code, dependency,
  service, asset or bundled material was learned from, used, copied or adapted in this round;
  the only external reference is the published GFM specification already cited by the contract,
  read as a rule source (no text copied into the repository).

## Handoff

- Ready for independent review. Remaining work: none in this packet.
- Base/C/H and verified push SHA supplied externally; no offline bundle (push available).
- No self-acceptance; successor release remains owner-controlled. No E1 result, no K1 acceptance.
