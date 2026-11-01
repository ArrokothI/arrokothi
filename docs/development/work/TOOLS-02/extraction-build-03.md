# Extraction build 03 — adoption fixes, P3 builds, P1 binding and register reconciliation

2026-10-31, implementing Claude Code desktop session (`claude-opus-5-5`), under owner choices 11–14. This is an
implementer record, not a review. Product files, package manifests and preserved historical evidence are unchanged.

## 1. Six adoption fixture defects

[Projection 12](projection-12.md)'s first complete pass found six non-kills. Each was a registry fixture defect:

| Case | Fix |
|---|---|
| `state-owner.tools02-review8-n7`, `-n8` | The registry's `canonicalize` declaration now includes `lib/canonicalize.d.ts`, with the digest `value-cost.json` already declares. Both controls typecheck in the copied workspace. |
| `k12c1.adopt-base-d12` | The anchor starts at the capacity refusal's template literal, inside the branch it mutates, so reach is measured there. Its mutant ID is the new content key; triage-05's two pointers follow it. |
| `k12c1.adopt-recovery-h21`, R6 variant | Expected target: "controlScopes inherited from the host's own prototype object is still honored". |
| `k12c1.adopt-review8-n14` | Expected target: "V-D1 P5: 532480 invalid positions retain nine records and exact ordered details". |
| `k12c1.adopt-review8-n11` → `state-owner.tools02-review8-n11` | The runtime oracle bounds descriptors with slack per object member, so it cannot see one extra read. The static check's SC1 can, but it parses `value-capture.ts` without executing it, so the case moves to the structural state-owner probe that n7 and n8 use, with family `tools02-review8-n11`. Coverage and triage-05 follow the new ID. |

Five obligations now match their members' keys: `review-06#W1`, `#W3`, `#W4`, `#W5` and `sweeps-08#review-11-READ-01`.

The second complete pass, at `cf95cf5296144799195f789333b8c10fa40c3b37` in a fresh clone, took **776.867 seconds**
under owner choice 13's 1,200-second cap. All 152 controls passed and all 179 mutants received qualified kills.
[Ledger](adoption-runtime-12.json), with every attempt.

## 2. P3 items

- **KC3-R3-RAW-02.** Closed by design 05 §8.3's recorded `whitespace_exceptions`, which range 1's accepted review
  covers. The new tool test `test_a_raw_review_log_needs_its_exception_while_editable_payload_stays_checked` uses a raw
  checker log: it refuses without its exception and passes with it, while whitespace in editable payload still refuses.
  Design 01 §6's wider exclusion of every preserved path is not built, because the accepted control
  `test_a_trailing_blank_line_fails_without_a_recorded_exception` pins the narrower rule.
- **CR1-R1-TOOLS-01.** The four dropped-field mutants were run over the behavioural suites. Each is killed by
  resulting-state assertions: the history-append and code-hold mutants in recovery-history, recovery, hold-permitted and
  submission-lifetime; the receipt-append mutant in takeover and submission-lifetime; the grant-write mutant in
  submission-lifetime. `receipts.test.ts` kills none. The new family `dropped-coupled-field-results` in
  `state-owner-controls.json` names the 15 killing leaves of four suites (27 tests), and the registry case
  `state-owner.dropped-coupled-field-results` runs the same four mutants against it in every verify. It is not an
  adoption, so the complete-pass measurement leaves it out.
- **KC3-R3-CREDIT-03.** Unchanged under 017 L-12; reported only.

## 3. Family routes (design 06 §1–§2, owner choice 13)

All 396 member occurrences of the 19 pending family origins carry a route taken from their group-review reading:

| Route | Members |
|---|---:|
| `mutation`, the member's own registered mutant | 178 |
| `mutation` with `via`, the registered mutant of the member it copies (adapter, rebound and reviewer copies) | 114 |
| `covered`, a scheduled registry case or a passing catalog leaf, with the reading | 98 |
| `equivalence` (V5 twice, W7, review-03 N10) | 4 |
| `no_longer_applicable` (A15 and its adapter copy, superseded by accepted K1.3) | 2 |

A `covered` route that cites the complete-decision oracle names its sweep leaf and the `oracle.*` case of the check
the reading names. Where a reading cites a `value-cost.json` mutant, the route names the leaf that mutant kills. Each
such leaf was confirmed by running that mutant in a scratch copy: MD1, MD3, MD4, MD7, RC-ELEMENT-READ-TWICE,
RC-OWN-EXPLAIN, O-DEFINEDATA-LITERAL and the two byte-charge mutants. A copy whose source member is itself a shared
route names the registered case directly instead of a second hop. The oracle-vs-mutants reuse links now name the
registered ablations-03 members.

## 4. Register, census and per-entry readings

The hold register was recomputed at C, as design 03 §1 describes. It now has 1,186 entries. Existing entries keep
their classification, claim, decision and reason, with `matched` updated where it changed (101). Stale keys are
removed (26). New matches are `unread` under a released claim (227); a moved member keeps its witness's claim. The
new P3 case is registered like its source case. The census changes five members, the host-members leaves that the
earlier assertion-order repair (`b804e986`) changed, from `unread` to `refused`.

Eleven new test leaves carry per-entry readings, so their entries are `not_held` and their suite targets can earn
P1-T credit (design 03 §1, owner choice 02). Each reading states its detector sites. Ten are the test-side binding
facade's load-time captures of intrinsics, plus the file's own sites, and say why the asserted core decision falls under
the released V-ENV core claim and not the SDK wrapper (L-01). The builder-docs leaf matches only through its child
process, which runs the documentation checker.

## 5. P1 binding of the open origins

Each of the 15 test groups has one behavior counterexample and a suite target per leaf (16 targets). Every
extraction origin links its adoption cases, test-group counterexamples and families; P1-R origins link their plans'
cases or keep their non-executable legacy reason. Unread members link per-claim unread witnesses (20 new). Every
closure's context is the minimum context, the records it names and reasons for its other candidates, as `context_check`
reads them. Extracted origins carry `disposition: extracted` for the reviewer's relevance sample.

Six origins are re-dispositioned from their plans to S5 `covered_elsewhere`, with checked leaf and case pointers. None
can close under P1:
- `artifact-3737bddc…` and `artifact-051103a9…` (nondisclosure) and `artifact-b303eed7…` and `artifact-f1a28bed…`
  (receipts): their refused members, after the BINDING-01 byte-harness migration, sit in tests that repeat their
  assertion statements, so no unique P1-T anchor exists. Their new test groups bind through their mention origins.
- `artifact-a4fa946d…` (host-members): five members are refused after `b804e986`, for the same anchor reason.
- `artifact-9fd619f5…` (kernel-landing-zone): a limited origin under TOOLS-01 owner choice 04, whose listed members
  stay uncredited by C2-LIMIT, so it cannot be complete.

The fifteen transferred origins that triage had retired keep their earlier closures verbatim under
`reopened_closure`, as owner choice 03 asks, since a retired row cannot carry a P1 closure.

## 6. Context references (design 06 §5–§6, owner choice 14)

135 origins could not close under TOOLS-01's context reference language. The owner widened it in two steps, then made
closure context one hop after the widened transitive walk proved unbounded. Design 06 §5–§6 states the rules and
controls. Two accepted controls of §5 and five transitive controls of §6 are replaced, each named there.
