# Independent review — K1.2, review 10 (round-11 candidate H11)

## Identity

- Reviewer: ChatGPT, GPT-5.6 Sol, 2026-09-25. Owner-requested independent review; not the Muse Spark implementer session.
- Repository/branch: `ArrokothI/arrokothi`, `claude/k1.2-outcome-acceptance-receipts`.
- Governing base B: `a20d278185eaffc7f8b7489345a3624231ff6e6d`.
- Previous review/status head: `daeba660a09e4fe7f1c68505fe4286ecc099f2d8`.
- Payload C9: `ca0dc2b15b9b276175fe6f48893bc6231ee528a3`.
- Reviewed candidate H11: `870720c9731b6e72da55c616c06bf0f3187f6cee`.
- Authoritative previous review: `docs/development/work/K1.2/review-09.md`.
- Owner supplemental decision remains `decision-01.md`; no unresolved architecture authority was found in this review.

## Access and limits

I inspected the exact pushed GitHub branch, commit metadata, C9/H11 diffs, the relevant source/tests,
the canonical Outcome-acceptance text, BASELINE, review-09 and its committed probes/ablations, and
implementation-11. I did not have a local repository shell in this review session, so I did not
independently rerun npm or packet commands.

No GitHub Actions workflow runs are attached to C9 or H11. H11 contains only
`implementation-11.md` and the K1.2 status-row update; it contains no raw validation attachments,
manifest/digests, or link to an accessible pinned external validation artifact. Therefore the command
counts stated in implementation-11 are report assertions here, not independently inspectable raw
evidence.

## Scope and correction identity

The correction range `daeba660..C9` is exactly four payload paths:

- `packages/kernel/src/coordinator.ts`
- `packages/kernel/tests/submission-authority.test.ts`
- `docs/development/work/K1.2/ablations.mjs`
- `docs/development/work/K1.2/contract.md`

The administrative range `C9..H11` is exactly two paths:

- `docs/development/work/K1.2/implementation-11.md`
- `docs/development/007-work-packets.md`

No unrelated correction drift was found. The committed `review-09/` reviewer artifacts remain
unchanged.

## Semantic review of the R9 correction

The C9 runtime change is structurally aligned with the canonical refusal order.

After replay/conflict and terminal/current-Activation checks, a well-formed claim still receives
writer-epoch/base-revision currency checks before authority. A malformed claim no longer returns
`malformed_envelope` before authority; it falls through to the reference-identity grant check.
Only after that grant succeeds do `overCapacity` and `capture.outcome === null` determine the
fresh refusal. This closes the concrete R9 malformed-claim disclosure branch without moving stale
currency behind authority.

B12 is the right broad inverse-order mutation: moving submission authority to immediately before
acceptance makes content refusals precede authority. B13 usefully pins the narrower
capacity-before-authority neighbor.

I do **not** reopen eager `captureOutcome()` as a new architecture defect. The current design
captures caller-owned state once before replay/currency checks for the already-established DEC-10
single-observation/reentrancy rule. The R9 ordering obligation is satisfied by preventing later
fresh content-validation results from deciding, diagnosing, returning, or being retained before
the preceding currency/authority groups. Moving the capture itself after authority would be a
different semantic change and risks recreating the TOCTOU/reentrancy class the packet already owns.

The runtime correction should therefore be preserved unless a new concrete counterexample proves
otherwise. This review is not asking for another submitOutcome redesign.

## Findings

### K12-R10-EVID-01 — P2 — the new malformed-fail/error distinguishing fixture is not malformed, and the report overstates Case C

**Where**

- `packages/kernel/tests/submission-authority.test.ts:423-427`
- `packages/kernel/tests/submission-authority.test.ts:478-499`
- `docs/development/work/K1.2/implementation-11.md`, especially the coverage matrix and Case B/C descriptions.

**Evidence**

The new Case B/C fixture uses a literal U+0001 control character as `next.error`. U+0001 is a
valid Unicode scalar/boundary string; it is not a lone surrogate. The previous reviewer probe used
the actual invalid value `"\\ud800"`.

Consequently the new negative assertions for `lone_surrogate` are vacuous for that fixture.
Case C then asserts only:

- classification `malformed_envelope`;
- reason contains `writerEpoch`.

It does not assert that the same deep-progress, duplicate-Emission and malformed-error defects become
observable once valid authority has succeeded.

Implementation-11 nevertheless describes the payload as
`deep+dup+lone-surrogate` / `triple-bad`, says Case C proves the same suppressed content becomes
visible, and says the matrix's paired fixtures establish those concrete codes. The committed oracle
does not establish that claim.

A plausible broken behavior remains insufficiently distinguished: after authority succeeds on a
malformed claim, report only the claim defect while silently dropping the other content defects.
The current Case C assertion can still pass that behavior.

**Required outcome**

Use an actually malformed fail/error value, preferably the reviewer probe's unpaired surrogate
`"\\ud800"` or another already-established invalid boundary value.

Make the pair explicit:

1. absent/forged authority + malformed claim + representative invalid content -> authority refusal,
   with none of those later diagnostics returned or retained;
2. valid current authority + materially the same proposal -> content refusal that affirmatively
   reports representative expected later defects, including the malformed claim and selected
   content defects.

Do not merely assert `malformed_envelope` in the entitled control. Assert concrete diagnostics.
Add/adjust a mutation if needed so "claim-only validation after authority" is rejected.

Correct the report/matrix wherever it currently claims `lone_surrogate`, `triple-bad`, "same
codes", or otherwise stronger evidence than the committed oracle supplies.

This is an evidence/test defect, not a reason to reverse the C9 runtime ordering.

### K12-R10-VAL-01 — P2 — required raw validation evidence and digests are not reviewable from H11

**Where**

- `docs/development/work/K1.2/implementation-11.md:131-150`
- candidate H11 administrative range.

**Evidence**

Implementation-11 states exact-C9 results for typecheck, all tests, packet ablations, reviewer
ablations and probes, but H11 contains no `validation-11/` (or equivalent) raw output, manifest,
digest set, or accessible pinned artifact carrying those observations. GitHub reports no Actions runs
for C9 or H11.

The correction instruction for this round explicitly required exact commands, environment, counts,
skips, **raw evidence and digests**. 006/008 also require reviewable evidence rather than a summary or
inaccessible handoff claim.

Because I have no local shell in this reviewer session, I cannot replace the missing artifact by
independent reruns. The stated green counts are therefore not sufficient evidence for acceptance in
this review.

**Required outcome**

The test correction above changes payload, so create a fresh C and rerun the complete required
validation on that exact clean C.

Retain accessible raw output and digests for at least:

- `npm run typecheck`
- `npm test`
- `npm run test:kernel`
- `npm run test:conformance`
- `npm run test:sdk`
- `npm run check:builder-docs`
- complete K1.2 packet ablations including B10/B11/B12/B13;
- review-09 probes;
- review-09 reviewer ablations;
- preservation/reference/link checks;
- authority/candidate-context checks.

Use 006/008's permitted H evidence form: raw output-only attachments with a manifest/digests, or an
actually accessible pinned external artifact satisfying those rules. Keep clean-C validation
distinct from any exact-H verification.

## Prior findings

- `K12-R9-ORDER-01`: the concrete runtime branch is structurally corrected in C9; preserve this fix.
- `K12-R9-EVID-01`: materially improved by B12/B13 and the new crossing tests, but final closure
  awaits correction of K12-R10-EVID-01 and reviewable validation evidence.
- `K12-R8-DOC-01`, `K12-R7-PROC-01`, `K12-R6-DOC-01`,
  `K12-R6-EVID-01`, `K12-R6-LAYER3-01`: no new contrary evidence found in the correction range.

## Verdict

The core R9 semantic correction should not oscillate back. C9 has the right refusal-order shape:
replay/conflict -> currency -> reference-identity submission authority -> content -> atomic
acceptance.

H11 is nevertheless not accepted because the new distinguishing evidence contains a false
malformed-error fixture / overclaimed entitled-control oracle, and the required raw validation
evidence/digests are not accessible from the candidate.

Status: **CHANGES_REQUESTED**.

No integration. No K1.3 release.

## Compact correction handoff

```text
Correct the same released packet K1.2 on claude/k1.2-outcome-acceptance-receipts.

Reviewed H11:
870720c9731b6e72da55c616c06bf0f3187f6cee

Current payload C9:
ca0dc2b15b9b276175fe6f48893bc6231ee528a3

Governing base:
a20d278185eaffc7f8b7489345a3624231ff6e6d

Review record:
docs/development/work/K1.2/review-10.md

Open findings:
K12-R10-EVID-01
K12-R10-VAL-01

Do not redesign the C9 submitOutcome ordering. Static review finds the R9 runtime correction
structurally sound. Preserve:
scope -> replay/conflict -> currency -> reference-identity submission authority -> content ->
atomic acceptance.

K12-R10-EVID-01:
The new Case B/C tests use U+0001 as fail.error while the report calls it a lone surrogate.
U+0001 is valid. Replace it with a genuinely malformed value (the reviewer probe's "\\ud800"
is appropriate). Strengthen the valid-grant Case C oracle so the materially same malformed
proposal affirmatively reaches and reports representative later content defects, not only
writerEpoch. Add/adjust a distinguishing mutation if needed for a "claim-only after authority"
broken implementation. Correct the report's overclaims.

K12-R10-VAL-01:
The pushed H11 contains summary counts but no accessible raw validation output/digests.
Because the test correction creates a new C, rerun all required validation on exact clean new C
and retain accessible raw output plus manifest/digests under 006/008 (or an actually accessible
pinned equivalent). Include full packet ablations B10/B11/B12/B13, review-09 probes/ablations,
preservation/reference/link and authority/candidate-context checks. Distinguish C validation
from exact-H verification.

This is a narrow evidence/test correction, not another semantic/runtime rewrite unless a new
counterexample proves one necessary.

Create fresh C and H/report/evidence.
Set K1.2 only to WAITING_FOR_REVIEW.
Do not self-accept.
Do not integrate.
Do not release K1.3.
```

CHANGES REQUIRED
