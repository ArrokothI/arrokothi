# Merged independent review reconciliation — K1.2 round 7

## Identity

- Date: 2026-09-25.
- Governing base B: `a20d278185eaffc7f8b7489345a3624231ff6e6d`.
- Round-7 payload C7: `03a4afffff55050aca5a463694b47c2e60e19bd9`.
- Report-bearing H7: `6cb906c31abcd9f44cc5fd207788cfabf7cb7794`.
- Submitted payload head before this review record: `31ad130d27f73b406d8578710f7d6769e89361b2`
  (`mental-model-fix`), one substantive commit after H7.
- Branch: `claude/k1.2-outcome-acceptance-receipts`.
- Contract: K1.2 revision 7.
- Primary reviewer for the current-head reconciliation: ChatGPT, GPT-5.6 Sol. Source access was
  through the GitHub repository connector: exact pinned files, commit objects, REST compare metadata
  and patches, and committed validation attachments were inspected. This session did not have a
  working local checkout and did not independently rerun commands.
- Owner-supplied supplemental reviewer: Arena.ai Agent Mode, underlying model identity not exposed by
  the platform. That separate session reported full local Git/shell access, fetched/unshallowed
  history, inspected the cumulative H5 candidate, and independently reran the relevant H5 command
  plan and reviewer probes.
- This file reconciles the two reviews. It is a review/status record, not a payload candidate and not
  an acceptance of its own containing commit.

## Validity of the Arena review

The owner-supplied Arena review is valid for the scope it states: independent verification of
Claude review-06 against reviewed H5
`d13a82881c5fa11aa8fc48eff83a9472eef595a6`.

Its two blocking conclusions reproduce the repository evidence:

1. **K12-R6-LAYER3-01 was real at H5.** The canonical
   `mental-model/mechanisms/execution-cycle.md` still specified the exact two-argument
   `deliver(activation, settlement): undefined` binding while H5 source required
   `deliver(activation, settlement, submission): undefined`; the canonical acceptance procedure
   also omitted the attempt-bound submission-authority check and its lifetime/order.
2. **K12-R6-EVID-01 was real at H5.** The old `submissionFor` helper selected the newest recorded
   grant. A test that redelivered and then submitted through that helper therefore could not reject a
   defect that rotated the grant on each redelivery.

The supplemental review correctly does **not** claim that later HEAD is accepted. Its supplied
coding prompt is therefore a sound historical correction handoff for H5, but most of that work has
already been performed in later rounds and should not be repeated gratuitously.

Its owner note about repeated misses in one authority/evidence subsystem was reasonable at H5.
Subsequent rounds materially improved the subsystem: the missing oracle was replaced with
saved-reference evidence, the architecture conflict was surfaced rather than silently rewritten, the
owner resolved it explicitly, and the canonical ownership was then corrected. No implementation-agent
switch is warranted solely because the packet has required several rounds.

## Current correction state

### K12-R6-EVID-01 — substantively closed

Round 6 added a dedicated saved-reference submission-lifetime suite. It captures the grant from the
first delivery, performs ordinary redelivery, and later submits using the saved reference rather than
a latest-grant lookup. It repeats the schedule after takeover and checks that the superseded grant
remains fenced.

The committed round-7 validation reruns the same distinguishing controls:

- clean control: 450/450 kernel tests;
- B10, rotate the grant on every ordinary redelivery: rejected, 448 pass / 2 fail;
- B11, rotate only a takeover attempt's redelivery grant: rejected, 449 pass / 1 fail;
- complete packet ablation battery: 27/27 rejected.

No post-H7 commit changes runtime source, tests, helpers or ablations.

### K12-R6-LAYER3-01 — substantively closed

The owner decision in `docs/development/work/K1.2/decision-01.md` explicitly authorizes only the
narrow in-process carrier extension from the accepted two-argument KC1-ARCH-1 call to
`deliver(activation, settlement, submission): undefined`. It preserves every other KC1-ARCH-1
guarantee and does not invent a universal token, wire protocol, remote credential or K2 policy
language.

At current head `31ad130d...`, the canonical ownership is coherent:

- `execution-cycle.md#submission-authority` owns the attempt-bound authority;
- writer epoch remains the semantic attempt identity/fence;
- ordinary redelivery keeps submission authority while getting a fresh delivery-reporting
  capability;
- takeover keeps the Activation ID, advances the epoch and replaces submission authority;
- a new exchange gets a new attempt and authority;
- Outcome acceptance remains scope → replay/conflict → exchange/currency → submission authority →
  content → atomic commit;
- `DeliverySettlement` remains per physical delivery and retains the no-Promise,
  explicit-reporting, first-report-wins behavior;
- `identity.md`, `core.md`, `integration.md`, `reference.md`, `sources.md` and
  `rewrite-index.md` link or explain without establishing a competing rule;
- BASELINE records the in-process `SubmissionGrant` representation separately from the
  transport-independent architecture.

The Opus 5.5 rewrite in `31ad130d...` is a substantive readability improvement over H7's
canonical prose. In particular, separating **Submission authority** from the delivery-reporting
section makes the two capability lifetimes easier to reason about. No semantic regression was found
in its seven-file delta.

### Non-blocking documentation observations

- The rewrite adds `OPEN(K3)` for persistence of submission authority across Kernel restart. The
  open question is legitimate, but the roadmap's narrow transactional persistent candidate is K3.2,
  which explicitly lists `execution-cycle.md` as an expected owner. Tightening the marker to
  `OPEN(K3.2)` would be a small wording/ownership cleanup if the next payload touches the line.
- Historical K12-R6-DOC-01 (development front-door wording) remains P3 and does not block this
  packet unless deliberately included in the next small documentation correction.

## Candidate boundary

C7 was cleanly validated and H7 has the correct administrative shape. Independent comparison shows
`C7..H7` contains exactly:

- `docs/development/work/K1.2/implementation-07.md`;
- `docs/development/work/K1.2/validation-07/01..10`;
- the K1.2 status row in `docs/development/007-work-packets.md`.

The committed C7 evidence records, among other gates:

- `npm test`: 2,504/2,504;
- `npm run test:kernel`: 450/450;
- `npm run test:conformance`: 1,945/1,945;
- `npm run test:sdk`: 22/22;
- builder/reference checks: pass;
- packet ablations: 27/27 rejected.

Those are inspected immutable C7 logs, not reruns by the primary reviewer.

The branch then advanced from H7 to `31ad130d...` with one content-bearing commit changing exactly
seven canonical/navigation mental-model files:

- `mental-model/concepts/core.md`;
- `mental-model/concepts/identity.md`;
- `mental-model/mechanisms/execution-cycle.md`;
- `mental-model/mechanisms/integration.md`;
- `mental-model/reference.md`;
- `mental-model/rewrite-index.md`;
- `mental-model/sources.md`.

Those are payload under 006. Their content is good, but they are not part of C7 and were not the
canonical bytes validated by validation-07.

## Finding

### K12-R7-PROC-01 — P2 — the best current canonical rewrite is post-H7 payload

**Governing rule:** 006 C/H identity and “Maintaining the mental-model reference”; 008 reference
maintenance evidence.

**Candidate location:** H7 `6cb906c31abcd9f44cc5fd207788cfabf7cb7794` followed by content
commit `31ad130d27f73b406d8578710f7d6769e89361b2`.

**Impact:** exact H7 can only certify C7's canonical text. The current submitted tree contains a
later Layer-3/reference rewrite. A documentation payload cannot inherit H7 validation or acceptance
merely because its semantics appear correct.

**Required outcome:**

1. Do **not** revert or substantially rewrite the current mental-model correction merely to recover
   H7 identity; the current prose is semantically coherent.
2. Use the current corrected tree as the starting point for a fresh payload C8.
3. If desired, make only small wording/ownership cleanups such as `OPEN(K3)` → `OPEN(K3.2)` and
   the existing P3 front-door wording. Any such edit belongs in C8.
4. Rerun clean packet validation on exact C8, including typecheck, full/kernel/conformance/SDK tests,
   builder-doc/reference checks, the existing B10/B11 evidence and the complete ablation battery.
5. Produce `implementation-08.md` plus immutable `validation-08` evidence and a new report-bearing
   H8 whose C8..H8 delta contains only the declared administrative allowlist.
6. Update 007 to WAITING_FOR_REVIEW for H8. Do not self-accept, merge, integrate or release K1.3.
7. The next independent reviewer should review B..H8 cumulatively, but should not require another
   architecture redesign unless new evidence actually establishes a semantic defect.

No new runtime, authority-lifetime, acceptance-order or evidence-oracle defect was established in
the current post-H7 tree.

## Criterion reconciliation

C1–C14 have no newly established regression: runtime source and tests are unchanged by the post-H7
rewrite, and the fresh C7 evidence covers the packet's existing deterministic gates.

C15 is substantively satisfied by the current tree: the owner-authorized rule has one canonical
owner, the obsolete current two-argument binding is gone, the two capability lifetimes and
acceptance order are explicit, historical KC1-ARCH-1 remains sealed, and implementation-specific
representation stays in BASELINE.

The packet nevertheless cannot be accepted at the submitted head because 006 requires substantive
documentation changes to be packaged in a new C/H and independently reviewed.

## Access and claim limits

The primary reviewer inspected exact post-H7 patches, relevant current source, canonical owners,
decision/provenance records, C7/H7 identity and committed validation evidence through GitHub. The
GitHub cumulative compare covered B..current head metadata, but large-file patches are omitted by the
API for some files, and this session did not rerun the suite locally.

The Arena supplemental reviewer reports a full local checkout and reruns for H5, which strongly
corroborates review-06, but those H5 reruns are not current-head reruns. This reconciliation therefore
does not convert the current branch into an acceptance candidate by inference.

## Trajectory

The packet is converging. Round 6 supplied the missing distinguishing evidence and correctly stopped
at an architecture authority boundary. Round 7 recorded the owner decision and repaired canonical
ownership. The subsequent Opus rewrite improved readability without reopening the implementation
semantics.

The remaining correction is mechanical candidate packaging, not another subsystem reconstruction.
Repeated rounds are acceptable here because each has produced substantial, independently inspectable
improvement.

## Verdict

The current semantics and mental-model rewrite are suitable to carry forward unchanged, subject only
to small optional wording cleanup. The exact submitted branch state is not yet a valid report-bearing
candidate because the canonical rewrite is post-H7 payload.

CHANGES REQUIRED
