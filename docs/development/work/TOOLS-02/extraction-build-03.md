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
