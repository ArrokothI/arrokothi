# TOOLS-02 first-300 re-estimate — owner decision required

Continuation authorized by [owner choice 07](owner-choice-07.md); the original stop below is preserved.

2026-10-28; implementing Codex GPT-6 session under owner choice 06.
This is the design 01 §5.6 checkpoint, not an implementation handoff or acceptance.

## Result and stop

The first 300 eligible origins in K1.1 source-file/line order have been read:

| Disposition | Origins |
|---|---:|
| covered_elsewhere | 159 |
| superseded | 25 |
| recorded_limit | 16 |
| not_a_counterexample | 66 |
| planned extraction (still pending) | 34 |
| Total | 300 |

The population is 1,518: all origins not complete at handover commit
`95c395617cf5f266f3a6bd35bd20eba82e781671`, including the prior session's 23
already-triaged origins. The 31 complete origins are excluded and not re-triaged.
This measures the current population; design 01's older estimate was 1,516.

The straight-line origin projection is `34 / 300 × 1,518 = 172.04`, rounded up to
**173 extraction origins**. This exceeds 60. Design 01 §9 says to **stop and ask**
when “the extracted projection exceeds 60”; the owner's handover repeats that stop.
Dependent triage, extraction, P3 builds and self-audit stop here pending the owner.
No remaining origin has been classified to make the estimate smaller.

## Four planned extraction groups

| Group | Origins read | Required result / gap |
|---|---:|---|
| Listing scope-work discrimination | 3 | Compare early, late and absent scope matches over equal-size scope sets and the same retained records. Existing listing checks require positive work, not equal work across those arms. |
| Creation/ingress field observation | 2 | Shifting own getters cannot validate one identity/content field value and commit another. Existing stable-field and Outcome/dispatch checks do not establish this complete envelope matrix. |
| Evidence inventory count gate | 27 | Actual tracked-file listing feeds the observed count; wrong expectation and an extra observed entry refuse; echoed commands do not contaminate the measurement. Historical F0/F1/F2 and tautological-count probes are not maintained. Current mutation-family counts and candidate allowlists test different inputs. |
| Hidden activity before A's first creation | 2 | Complete A transcripts agree when B runs before A's first creation. The existing leaf with that title invokes its hidden window only after A's creation/replay. |

These are four grouped tests/cases to design, not 34 separate test implementations.
Their exact origin IDs and planned checks are in `triage-05.json`; no new regression
has run and no product defect is claimed. Every extraction remains pending in adoption.

The sample is deliberately source ordered, not random: all 300 origins belong to
K1.1, and its repeated evidence-correction records contribute 27 of 34 extractions.
The projection is therefore a scope alarm with low confidence, not an unbiased forecast.
Grouping changes implementation effort but does not change the design's origin threshold.

## Time re-estimate

At design 01's declared 1–1.5 minutes per origin, the remaining 1,218 origins imply
20.3–30.45 hours of reading before closure, verification and review. Blindly applying
its 30–45 minutes per extracted origin to 173 gives 86.5–129.75 hours; that overstates
repeated-origin implementation work and is not a useful grouped-test estimate. The four
observed groups need separate test design plus P1 bindings. A credible total extraction
time needs the later packets' distinct-group counts, which are not yet read. There is
no revised completion promise and no silent expansion of the approved work limit.

## Reproducibility and checks

- The first-300 set equals the first 300 non-complete K1.1 inventory IDs sorted by
  `(path, line, id)`; completed origins in intervening files are skipped.
- SHA-256 of those ordered IDs, one ID per line with a final newline:
  `0625e0027bc2747fd7d1413c1657c2da266e7f3d5bccf8e66f27d1bfe36bb73f`.
- Last disposition: `K1.1/validation-15/MANIFEST.md:65`,
  `mention-12a686397d3d798e77edea0c` at `9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49`.
- Resume: the same manifest, line 71,
  `mention-d111e6a1813ab1cfd6e935ef`; then validation 16–17 and the next packet.
  Preliminary context readings beyond the stop are not dispositions.
- All 1,856 coverage-pointer occurrences resolve to 143 distinct passing leaves in the
  fresh-clone repository catalog at `281c8b0a654ce4638d3fa2a61d1b48190fc4359d`:
  4,750 tests, 523 suites, zero failures/cancellations/skips/todos. Product/test bytes
  have not changed since that catalog. This checks pointer existence, not semantic
  sufficiency or the independent audit.
- Derived `preserved`, counterexamples, suite targets, transfers, pinned transfer lists
  and legacy mappings remain unchanged. No `regenerate` was needed for these semantic
  origin mappings. Historical source/evidence and product files are untouched.
- `git diff --check` passes for the checkpoint. Final tool-tests, mutation registries,
  full verify, self-audit and Packet verify CI remain outstanding. No final C/H or run ID.
- No third-party material was incorporated; this batch records readings and mappings.

## Owner decision needed

Authorize continuing the existing grouped-extraction plan despite the projected origin
count, or revise the scope/estimate rule before dependent work resumes. This record
requests that decision; it does not supply one. The ledger remains IN_PROGRESS.
