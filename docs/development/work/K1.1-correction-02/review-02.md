# Independent review — K1.1-correction-02, round 2

## Identity and authority

- Reviewer: Codex, GPT-6, continuing independent review session, 2026-09-23; local Git/source/shell access. The reviewer did not implement either candidate.
- Governing process: `70467f4cf76896529486499db24fcaa953292491`, 006/008/012. PLAN-01's proposed process does not govern this review.
- Code base: `227cd05373f5c5f2d4dbb3e8a6d9ff3cd6c23b3f`; records/branch baseline: `70467f4cf76896529486499db24fcaa953292491`.
- Previous H: `e1c751b87ee0e16af1280aefcf485fceeb409664`; previous review: [review-01](review-01.md), transcribed in `6f2d51de81c802d6a9967a721be602d15115727c`.
- C: `12bb29cda27369b9d0e91313d4e192c692ec886b`.
- Reviewed H: **`806bae282b542be101e54a3a3d1ca0c681de63cb`**.
- Contract at H: Git blob `8111d428984ba4922bb7a7a23b662afc5832faea`. KC2-1 now explicitly covers within-visit work and the indivisible engine enumeration limitation identified in review 01.
- Inspected the cumulative kernel diff from the code base, the correction delta, surrounding capture/serialization and coordinator consumers, contract/baseline/provenance, report and all attachments. PLAN-01's separately identified payload is excluded from this packet's verdict.

## Independent coverage and validation

Reconstructed both dimensions of refusal cost: number of shared occurrences and work inside each occurrence. Checked scalar/key scans, malformed surrogate and length boundaries, object descriptor collection, array index classification, refusal-reason production, per-root charging, snapshot coherence and captured operations. Then traced creation/ingress/authority/identity-text consumers through `canonicalize`; serialization still receives only accepted snapshots. No Outcome implementation is inferred.

Independent commands ran on the initially clean branch head `eedd8aa50ab4ae71c9461136db543aa64f3e7916`, Node v25.2.1. The diff from C through that head is empty for `packages/`, `tests/`, `scripts/`, `package.json` and `package-lock.json`; these standard test/build inputs are unchanged. The separately added measurement source is addressed in the finding below.

| Check | Result |
|---|---|
| `npm test` | Exit 0; 2,328 tests / 356 suites, zero failures, cancellations or skips. Includes all 274 kernel tests and the five new regressions. |
| `npm run typecheck` | Exit 0. |
| `npm run check:builder-docs` | Exit 0; 72 Markdown files, 1,720 links/anchors, 38 imports at branch H. Earlier C's 1,718 count is not substituted for this observation. |
| Cumulative kernel `git diff --check` | Exit 0. |
| Candidate attachments | All seven SHA-256 values independently recomputed and matched implementation-02. Inspected the ablation: original five cost tests pass, five new tests fail on read counts against the previous implementation. Ablation was inspected, not rerun. |
| Read-count reproduction | Ran `node --experimental-strip-types --input-type=module < docs/development/work/K1.1-correction-02/validation-02/measure-probe.txt`. All three oversized ASCII strings require 65,536 character reads; 550,000 object names require 4,097 descriptor reads. |
| Additional reviewer checks | 98 checks passed: six ASCII/control/Unicode units at the 65,536-scalar limit and one over, lone high surrogate near that limit, and 40 deterministic mixed-content roots at exactly 1,048,576 bytes and one byte over. The one-over cases are refused by the running count. |

The extra checks use `a`, NUL, newline, `é`, `日`, and `😀` for scalar limits; mixed roots also cover short/six-byte escapes, quote/backslash, UTF-8 boundaries, finite number spellings, literals and empty containers. Expected canonical sizes were derived using UTF-8 byte length of JSON spelling, independently of the capture counter. No wall-clock performance threshold is used to establish the read bounds.

No Node 22, wire-decoder, external benchmark, live provider or isolation validation was run. These are outside this packet. No new third-party source or dependency was incorporated.

## Criterion results and prior finding

| Criterion | Result | Reason |
|---|---|---|
| KC2-1 | PASS | One string pass bounds reads before refusing; object descriptor storage/reads stop at 4,097; oversized array listings avoid per-name classification and long numeric-looking names are rejected by length first. Root charging still bounds repeated occurrences. Engine enumeration and arbitrary callback execution remain the explicit host limitations, not a claimed containment guarantee. |
| KC2-2 | PASS | The merged scan preserves exact accepted string bytes, including surrogate pairs and escaped controls. Disjoint scalar/key/punctuation charges, the retained finished-size check, candidate tests and 98 additional checks agree at the boundaries. |
| KC2-3 | PASS | Valid shared subtrees charge every occurrence; malformed long strings and oversized listings also consume budget, including the new shared variants. No memoized identity-based undercount was introduced. |
| KC2-4 | PASS | Existing assertions remain; all tests pass. Scanner result fields are own data, captured character operations are retained, and descriptor/snapshot observations are not replaced by ambient prototype reads. Refusal diagnostics stop earlier as disclosed; valid accepted content is unchanged. |
| KC2-5 | PASS | Both sibling-root comments still agree with values.md. |
| KC2-6 | PASS | V-D1–V-D3 provenance remains explicit; baseline now includes within-visit bounds. Tombstones remain K5 work and no wire implementation is claimed. |
| Mandatory 006 C/H handoff | FAIL | Executable measurement source is introduced after C as an alleged output-only attachment; see KC2-R2-PROC-01. |

**KC2-R1-01 is closed.** The original counterexamples now have bounded observations, distinguishing regressions and a cumulative re-audit. The report correctly explains the prior gap: counting visits did not bound work inside a visit. No additional behavioral defect was found in this pass. All six contract criteria were examined; the remaining blocker is candidate provenance, not an unresolved Kernel semantic choice.

## KC2-R2-PROC-01 — P2: measurement script is payload introduced in C..H

Location at reviewed H: `docs/development/work/K1.1-correction-02/validation-02/measure-probe.txt:1–16`; `implementation-02.md`, identity allowlist and validation table.

The governing 006's C/H convention permits declared **raw command output** after C and explicitly says attachments **“may not introduce or change scripts, fixtures, evaluator rules, thresholds or configuration. Those are payload in C.”**

`git diff 12bb29c 806bae2` adds `measure-probe.txt`. Its contents are the executable JavaScript for the reported `measure.mjs` run: install the read counter, import the Kernel, construct inputs, invoke capture and print observations. It is script source, not captured command output. The `.txt` suffix and declared attachment allowlist do not make it an output-only artifact. Thus the named C lacks part of the validation payload that H introduces, contrary to the explicitly governing identity rule.

The script is readable and independently reproduces the reported result; this finding alleges neither incorrect runtime behavior nor fabricated evidence. The required outcome is a conforming payload/evidence boundary: establish a new C containing the complete measurement source, run the affected probe on that clean payload and record its identity/output in a new report H. Retain prior attempts. C..H must then contain only the allowed report/status/raw-output material. No production-code change is requested for this finding, and the earlier behavioral closure remains recorded for this exact H.

## Handoff and verdict

Correct the same released packet on `claude/pre-k1.2-reviews`. Reviewed H is `806bae282b542be101e54a3a3d1ca0c681de63cb`; bases and C are above. Open finding: **KC2-R2-PROC-01**. Closed finding: **KC2-R1-01**. Use governing 006/008/012 for new C/H and affected clean validation; no architecture decision is required. Recommended packet state: **CHANGES_REQUESTED**. No successor release or change to DOCS-CLEANUP-01's acceptance follows.

CHANGES REQUIRED
