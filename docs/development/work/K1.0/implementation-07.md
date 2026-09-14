# Implementation report — K1.0, round 7

## Identity

- **Packet / parent:** K1.0 — target boundary and legacy quarantine; parent milestone K1.
  **Contract:** [`contract.md`](contract.md), **revision 7**.
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
  advertised remote `main`.
- **Previous reviewed H6:** `5dd570002c082872914291ef0b3cc244bf9bc205`.
  **Round-6 review record:** [`review-06.md`](review-06.md), recorded by
  `3e9779e64305f87b48e773b102d4d1523e7ea4cb`, which was the branch tip at session start.
- **Payload C:** `249c7a8b04f4a724926efd9ba0c67782a30286ce`. Its parent is exactly the review-06
  record commit, so the correction interval is `3e9779e6…..249c7a8b…`, one commit.
- **Candidate H:** the commit containing this report. Its full SHA is supplied in the external
  handoff, after the push; it cannot be named from inside itself.
- **Exact C..H administrative allowlist:** `docs/development/work/K1.0/implementation-07.md`;
  `docs/development/work/K1.0/validation-07/` (MANIFEST.md and nine declared output-only `.log`
  attachments); and the status transcriptions in `docs/development/007-work-packets.md`,
  `docs/development/001-current-status-and-roadmap.md` and `docs/development/README.md`. No source,
  test, fixture, script, evaluator, threshold, package or configuration content first appears in H.
- **Working tree:** clean at C apart from `validation-07/`, which the validation run itself writes;
  clean at H. **Push:** performed after H exists; the advertised remote SHA is verified and reported
  in the external handoff, not claimed here.

## Changes and coverage

### The one open finding

**K10-R6-01 — P2 — body rows whose first cell equals the header label are silently discarded as
headers. Disposition: CLOSED by reconstruction of the header/body classification boundary.**

Round 6 rebuilt *which lines belong to the table*. It did not change *how a discovered row is
classified*, and the shared reader still decided "is this the header?" by comparing the first cell
against a configured label:

```ts
if (cells[0] === spec.headerFirstCell) continue;
```

GFM permits arbitrary inline text in a data cell, so an ordinary body row repeating that label was
discovered correctly by the round-6 front door and then erased by value — before `keyOf`, before the
duplicate check, before the `unreadable` channel. Confirmed empirically against the reviewed H6 for
all four governed tables in both positions: zero messages in every case (validation-07/08).

The fix is not a different comparison. Row identity is now **structural**. Discovery returns each
table as a header plus a body, so the header is the line that precedes the delimiter row and nothing
else can be mistaken for it; exactly one row per table can take the header exit and it is chosen by
position before any cell is read. The configured label survives only as a **check** on that header —
a header not carrying it is reported — and no body row is ever compared against it.

That is why the correction eliminates content-based classification rather than rejecting four
literal strings. There is no longer any code path on which a body row's text can decide whether it
is a header: the two categories are produced by different parts of the parser and the body category
has no header exit to take. Renaming the four labels, adding a fifth table, or inventing a body row
whose first cell matches anything at all cannot reopen it, because the classification no longer
consults content. Had the fix instead special-cased "only skip the first row" or "only skip rows
before any keyed row", the same class of defect would have survived under a different spelling.

### Adjacent silent exits closed with it

Making the header positional is only safe while a section holds one governed table, and a label that
stops *selecting* the header must not stop *checking* it. Both of those are now enforced:

- **A missing governed table** is reported as such, instead of being read as an empty relation that
  only the reverse-direction comparison happened to notice.
- **Every row of any further table in the same section, its header included,** is reported. Without
  this, a planted delimiter line under a contradictory row placed after the real table would promote
  that row to "a header" and a reader that silently skips headers would drop it — reopening
  K10-R6-01 through structure instead of through text (**K1.0-SELF-13**).
- **A structural header that does not carry its expected label** is reported. Under H6 a renamed
  header fell through to the body loop and surfaced as an unreadable row; that fail-loud behaviour is
  preserved deliberately rather than lost to the new design.

### Self-found defect with separate provenance

**K1.0-SELF-12 — a repeated section heading silently deleted the rows after it.** Found while
auditing *section selection*, the first stage of the pipeline, which no previous round had examined.
Section text was taken with `markdown.split(heading)[1]?.split(nextHeading)[0]`. `split` ends the
section at a **second** occurrence of the same heading text, so a duplicated `## Zones` carrying a
contradictory table deleted those rows from the candidate stream before discovery ever ran: no key,
no duplicate, no unreadable row, nothing. Verified silent under H6 and reported under C
(validation-07/08). The section is now sliced from the first heading to the first following
next-heading, so the repeated ATX heading breaks the table body (GFM Example 201) and the table under
it is discovered and reported as a further table.

This is a genuine pre-existing hole in the reviewed candidate, distinct from K10-R6-01's
classification defect and from K1.0-SELF-13's regression risk. It is recorded separately because the
provenance differs: the reviewer named neither.

### The silent-exit audit

006 and the correction handoff require the whole pipeline to be accounted for, not the one `if`.
Every branch that can end a row's life was driven with an input that actually reaches it, through the
production parser, and its whole observable result recorded ([validation-07/09](validation-07/09-silent-exit-audit.log)).

| Stage | Branch | What reaches it | Disposition |
|---|---|---|---|
| Section selection | heading absent | a renamed section heading | reported: *table is missing from its section*, plus four reverse-direction messages |
| Section selection | next heading absent | section runs into the following table | reported: every row of that table, as a further table |
| Section selection | heading repeated | K1.0-SELF-12 | **was silent; now reported** |
| Table discovery | no header/delimiter pair | the delimiter deleted | reported: table missing |
| Table discovery | delimiter cell count ≠ header (GFM 203) | a short delimiter | reported: table missing — GFM says there is no table |
| Table discovery | a further table in the section | K1.0-SELF-13 | reported: every row of it, header included |
| Table discovery | fence opens mid-body | a fence before the first row | reported: the surviving relation is empty, four reverse messages |
| Table discovery | fence after the last body row | a fenced contradictory row | **legitimately quiet** — GFM renders it as a code block; the document asserts no row, and a reader sees code |
| Table discovery | blockquote breaks the body (GFM 201) | a quoted row | reported via the reverse direction |
| Header/delimiter | header lacks its expected label | a renamed header | reported |
| Header/delimiter | alignment colons | `:--- / ---: / :---:` | accepted as the delimiter, table intact (valid variant) |
| Header/delimiter | later delimiter-shaped line | `\|---\|---\|---\|` inside the body | an ordinary body row, reported as unreadable |
| Row splitting | escaped pipe (GFM 200) | `stale \| duplicate` | stays in its cell; the row is one duplicate |
| Row splitting | excess cells (GFM 204) | a fourth cell on a 3-column row | **legitimately quiet** — the row is *recorded*, so it has its one outcome; GFM drops the excess in rendering too, so the ignored text asserts nothing |
| Row splitting | pipe-less continuation (GFM 202) | a bare key | a single-cell row, reported |
| Header/body classification | header-label body row | **K10-R6-01**, all 4 tables × 2 positions × 2 edge spellings | **was silent; now reported** in all 16 |
| Key extraction | no recoverable key | `not-a-zone` | reported |
| Key extraction | second backticked token in the key cell | `` `target-kernel` `legacy-core` `` | **legitimately quiet** — the row is *recorded*; the key is the first backticked token, a recorded reading rule, and a duplicate first token is still a duplicate |
| Duplicate handling | duplicate before / after the correct row | contradictory zone rows | reported in both orders |
| Value parsing | absent cells / unparseable count | short row, `not-a-count` | reported, after the key was already seen |
| Map insertion | first-wins | duplicates never reach insertion | duplicates are reported earlier, so no overwrite exists |
| Propagation | ownership `unreadable` → disagreements; dependency `unreadable` → its own assertion | both channels | both asserted |
| Relation comparison | wrong association with unchanged token sets | two zones' roots swapped | reported |

Three branches are quiet, and each is quiet for a stated reason that the invariant allows: two drop
nothing at all (the row is recorded; only ignored *cell* text is involved, matching GFM's own
rendering), and one drops material that GFM makes a code block, which the rendered document does not
present as an inventory row. Everything else produces at least one message.

### Coverage map and evidence

| Obligation | Distinguishing input | Expected observable facts / forbidden | Location and result |
|---|---|---|---|
| C4 — header identity is structural | a body row repeating `Zone id` / `Id` / `Package` / `Zone`, before and after a correct keyed row, with full and omitted-both edge pipes | each reaches normal key/unreadable accounting; forbidden: a silent skip | `kernel-landing-zone.test.ts`, "header identity…" — 16 cases, pass |
| C4 — the real header is accepted | the unmutated inventory | no relation is keyed from a header label; sizes equal the policy; nothing unreadable | same suite, 1 case, pass |
| C4 — the label still checks the header | a renamed header in each of the four tables | reported; forbidden: silent acceptance | same suite, 1 case, pass |
| C4 — one governed table per section | a contradictory row promoted by a planted delimiter (K1.0-SELF-13) | every row of the further table reported | same suite, 1 case, pass |
| C4 — section selection is total | a repeated `## Zones` with a contradictory table (K1.0-SELF-12) | reported; forbidden: deletion by heading position | same suite, 1 case, pass |
| C4 — a missing table is not an empty relation | the Zones header/delimiter deleted | reported as missing | same suite, 1 case, pass |
| C4 — round-6 GFM discovery preserved | 24 omitted-edge variants, pipe-less continuation, alignment delimiter, edge-less header/delimiter, escaped pipe | all still reported; valid variants still green | unchanged round-6 cases, pass |
| C4 — rounds 2/3/5 preserved | 16 relational controls, duplicate controls in both orders, malformed/short-row controls | all still reported | unchanged cases, pass |
| C3/C7 — nothing else moved | full suite, typecheck, export digests | 1926/1926, typecheck clean, export map unchanged | validation-07/02–07 |

- **Selected 012 methods:** deterministic execution (dominant — the oracle is mechanically decidable
  over repository files, and each control includes the broken behaviour it must reject) and
  process/documentation (C4/C5/C6/C8 are records). **Materially excluded, unchanged:** race and
  fault, native Runtime/Driver, external evidence/gate — this packet commits no state, has no Driver
  and executes no E gate.
- **Tests added:** 21 cases in one new `describe` inside the existing C4 suite. **Removed:** none.
  **Weakened:** none. Architecture suite 205 → 226; full suite 1905 → 1926; zero skipped.
- **Compatibility / refusal:** unchanged. The target package stays `private` and refusal-only.
- **Baseline / guides / skills:** unaffected; `check:builder-docs` unchanged at 26 files, 284
  links/anchors, 38 public imports.

### Prior findings

| Finding | Round | Disposition |
|---|---|---|
| K10-R6-01 | 6 | **CLOSED** this round by structural reconstruction; 16 committed controls, demonstrated silent under H6 |
| K10-R5-01 | 5 | CLOSED in round 6, confirmed by review-06; the GFM row grammar is preserved verbatim and re-asserted by 24 unchanged controls |
| K10-R4-01, K10-R4-02 | 4 | CLOSED; key-before-value ordering and the evidence-record guard are unchanged and still pass |
| K10-R3-01 | 3 | CLOSED; duplicate controls in both orders unchanged |
| K10-R2-01, K10-R2-02 | 2 | CLOSED; scanner reconstruction and relational comparison untouched |
| K10-R1-01, K10-R1-02 | 1 | CLOSED; unchanged |
| K1.0-SELF-08 … -11 | 4–6 | CLOSED; all controls unchanged and passing |
| **K1.0-SELF-12** | **7** | **New, self-found:** repeated section heading deleted the rows after it. Fixed; control added |
| **K1.0-SELF-13** | **7** | **New, self-found regression risk in this correction:** a row promoted to a further table's header. Not an H6 defect — reported under both readers — and guarded so the fix cannot open it |

### Cumulative re-audit beyond C4

Re-checked at C, not assumed from earlier rounds: `tests/conformance/k0` is byte-identical to base
(`git diff --quiet` exit 0); no file under `packages/core`, `packages/sdk`, `packages/agents`,
`packages/models`, `packages/retrieval` or `packages/interoperability` differs from base; the only
manifest added is the new private `packages/kernel/package.json`; the C1/C2/C9 scanner, the
forbidden-edge controls, the legacy re-attribution and its 13 assertions, and the refusal-only target
surface are untouched and green. The correction delta is three files.

### Documentation drift noted by review-06

Contract revision 6's C3 row said `1899 tests pass` while round 6's actual count was 1905. Round 7's
validation changes the count again, so the row is reconciled opportunistically as review-06 directed:
C3 now reads **1926**, matching validation-07/03. This is not treated as a separate finding.

## Validation and interpretation

All commands ran in `/Users/rex-shih/Documents/ArrokothI/arrokothi` against clean payload C
`249c7a8b04f4a724926efd9ba0c67782a30286ce`, whose only uncommitted content was `validation-07/`,
which the run writes. Environment: Node v25.2.1, npm 11.6.2, TypeScript 5.9.3, Darwin 25.6.0 arm64.
Raw logs, digests and exact commands: [`validation-07/MANIFEST.md`](validation-07/MANIFEST.md).

| Command | Exit | Result |
|---|---|---|
| `npm run typecheck` | 0 | clean |
| `npm test` | 0 | 1926 tests, 286 suites, 0 fail, 0 skipped |
| `npm run test:conformance` | 0 | 1813 tests, 267 suites, 0 fail, 0 skipped |
| `npm run check:builder-docs` | 0 | 26 Markdown files, 284 links/anchors, 38 public package imports |
| `npm run test:kernel` | 0 | 4 tests, 0 fail |
| `npm run test:sdk` | 0 | 22 tests, 0 fail |
| K10-R6-01 demonstration | 0 | 32 cases, 18 newly distinguishing, 0 regressions |
| silent-exit audit | 0 | every pipeline branch driven; three legitimately quiet, each accounted for |

The manifest's nine digests were additionally re-verified mechanically by
`evidence-records.test.ts` after the manifest was written; that run is a hygiene check on the record
and is stated as such, not as a substitute for the clean-C suite run above.

- **External fixture / gate / decision:** none executed. The benchmark E1 preparation was re-checked
  read-only this session and is unchanged: branch `codex/e1-kernel-acceptance-capture`, candidate H2
  `8de04779d279dba82cf834d419e465d2b677ef46`, parent C2 `d8f17549c31f9ee5d995e773c2f211faed2785fb`,
  benchmark `main` `5a3f1ba525f68244701b1f73a1d29c4902ffe589`, `BLOCKED_EXTERNAL`, accepted by
  nobody. Nothing in that repository was modified. **This packet claims no E1 result.**
- **Checks not run:** `npm run test:evals`. This packet changes no Agent or model-facing behaviour
  and nothing in the diff is reachable from an eval. The limit: this candidate makes no claim about
  Agent behaviour or model-facing quality.
- **Why the evidence supports the criteria (implementer assessment, not acceptance):** C4's
  total-accounting claim is now backed by two independent things — committed controls that fail
  against the reviewed H6, and an executed audit that drives every branch of the pipeline and shows
  its whole result. The three quiet branches are named with their reasons rather than left for a
  reviewer to discover. C1/C2/C3/C5/C6/C7/C8/C9 rest on unchanged code plus a re-verified scope
  check at C.
- **Design choices:** header identity by position rather than by a stricter content rule, because
  only discovery can know which line is the header; the label kept as a check so the change does not
  weaken the renamed-header case; one governed table per section made explicit so the positional
  skip cannot be widened by a planted delimiter.
- **Owner amendments:** none this round. **Assumptions:** none beyond the recorded release.
- **Strongest remaining risk:** the oracle's fidelity to GFM is argued from the specification and
  from the forms this one document uses, not from a conforming Markdown implementation. A construct
  neither the specification review nor these controls anticipated could still be read differently by
  a renderer than by this parser. The mitigation is that discovery now fails loud in both directions
  — an unrecognised table is reported missing, and over-inclusion reports extra rows — so a
  divergence surfaces as a disagreement rather than as silence.
- **Third-party review under AGENTS.md:** none. No third-party code, test, script, asset or
  dependency was copied, adapted, vendored or added this round. The GitHub Flavored Markdown
  specification was consulted as a normative reference for behaviour; its numbered examples are cited
  by number in comments, and no text, code or fixture from it was reproduced.

## Handoff

- **Ready for independent review.** The whole cumulative packet is submitted, not only the delta.
- Base, payload C and candidate H, with the verified advertised remote SHA, are supplied in the
  external owner handoff after the push. This report cannot certify its own future push.
- **No self-acceptance.** No E1 result, no K1 acceptance, no successor release. `next_release: none`.
