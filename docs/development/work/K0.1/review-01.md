# Independent review — K0.1, round 1

## Identity and access

- Packet: **K0.1** — Protocol decisions and legacy disposition.
- Reviewed base: `6464be12c11eb75f7dfbc5ece12ca8d3020a5c15`.
- Reviewed payload C: `b08577c7e85204b1bb3af35500129aab772cdac2`.
- Reviewed candidate H: `857fa05a8a72a4c6f4f294f9e775a0dc1f7919dc`.
- Reviewer identity as actually used: **not independently confirmed by this record.** 006 names the
  intended reviewer as "GPT-5.6 Sol High in a separate ChatGPT chat." This review's findings were
  delivered to the coding-agent session as an owner (Rex-Shih) chat message, structured as a
  correction prompt naming findings `K01-REV-01` through `K01-REV-05` with an explicit "CHANGES
  REQUIRED" outcome. Per 006 ("The project owner... records the review faithfully"), this file
  transcribes that delivered content as the review record; it does not independently verify which
  model produced it, whether it had repository access versus reviewing supplied artifacts, or
  reproduce the reviewer's own inspection. This is the owner-transcription path 006 describes, not a
  claim that the coding-agent session itself re-derived or re-ran the review.
- Access/inspection method as stated by the transcribed review: not recorded in the delivered
  message. The findings are specific enough (exact current-code line ranges implied, exact worksheet
  section/decision IDs, precise architectural corrections tied to kernel.md/execution-protocol.md/
  action-lifecycle.md) to indicate source access, but this file does not independently confirm that.

## Findings

### K01-REV-01 — Activation identity / writer epoch

**Severity (as implied by requiring correction before re-review):** P1 (round-1 ID-3 encoded the
takeover/epoch relationship backwards relative to execution-protocol.md).

Round 1's `protocol-worksheet.md` ID-3 stated that an authorized takeover "mints a new Activation ID
under a new writer epoch... rather than reusing the old one." The review requires:

- Activation ID identifies one immutable semantic exchange against its pinned progress revision/Event
  batch.
- Ordinary delivery retry preserves Activation ID and writer epoch.
- Authorized takeover preserves Activation ID and immutable exchange input but advances the writer
  epoch.
- A new Activation ID is created only for a new semantic exchange after the preceding exchange is
  resolved.
- Duplicate/conflicting Outcome and stale-writer rules must remain coherent with this identity.
- Required deterministic counterexamples: ordinary redelivery; lost-host takeover; stale old-epoch
  Outcome after takeover; next semantic Activation.

### K01-REV-02 — Kernel wait ownership and generations

**Severity:** P1 (round-1 W-4 introduced a Kernel-visible wait concept the canonical protocol does not
support).

Findings:

- Remove the proposed Kernel-visible Runtime-local-work wait concept from W-4 and every dependent
  statement.
- Local Runtime promises/jobs that have not crossed a Kernel dependency boundary remain Runtime/
  Driver-private; they are not `WAITING` dependencies in the new Kernel protocol.
- Compatibility `ControllerResumption` machinery may remain private inside the legacy compatibility
  Runtime only; it must not drive the new Kernel wait record/store.
- Align the target wait with finite correlated Kernel Events/dependencies and explicit input
  subscriptions from the canonical protocol.
- Wait-generation fencing applies to wait-created artifacts such as timer delivery. Authenticated
  settlement/result Events must not be required to carry an obsolete wait generation.
- Preserve late result Events as accepted mailbox facts; a later current wait explicitly correlated to
  that result must be able to observe it.
- Repair B-2, W-3/W-4/W-5, REF-3 and §11 consistently.
- Required counterexamples: a local unresolved promise never creates Kernel `WAITING`; stale timer G1
  cannot wake G2; timeout/replacement followed by a late result retains the result; a later explicitly
  correlated wait can consume an already-accepted eligible result.

### K01-REV-03 — Rebuild the legacy-data classification

**Severity:** P2 (incomplete inventory relative to K0.1-C3's own stated scope, plus one P1-adjacent
substantive error — see the `revision`/`base_progress_revision` point below).

Findings:

- §12 must satisfy K0.1-C3 literally, using current base source rather than behavior summaries as
  substitutes for record classification.
- Explicitly inventory and classify at least: `ExecutionContext.control`/`ControllerProgress`;
  `ExecutionWait`; the actual `ControllerResumption` record; the mailbox/Event envelope and delivery/
  disposition representation; lifecycle representation/transitions; `PendingOperation`; the
  cancellation request where relevant; the generic record revision versus the target accepted-progress
  revision.
- Split partially reusable records/fields where necessary instead of marking an entire legacy type
  migratable.
- The closed `kind: agent | workflow` progress discriminator is legacy/private compatibility material,
  not part of the new generic Kernel progress protocol; only appropriately opaque continuation data
  may migrate, under pinned Runtime/definition/codec compatibility.
- Account explicitly for current `CREATED`; the target lifecycle does not retain that separate state.
- Do not equate current `ExecutionContext.revision` (which increments for ordinary lifecycle
  bookkeeping) with target `base_progress_revision`; define the semantic progress-revision rule
  separately or prove an exact equivalent representation.
- Correct any report claim that the existing table exhaustively classifies the contract-required
  records when it does not.
- Keep the current in-memory store usable only to the extent actually allowed by K1's reference
  profile; do not turn its global cloning/serialization into target semantics or performance evidence.

### K01-REV-04 — Close the K0 decisions that were improperly deferred

**Severity:** P2 (round-1 left explicit 001-K0-required decisions as blanket "implementation-owned"
that 001 actually requires K0.1 to state).

Findings:

- Update `contract.md` as well as `protocol-worksheet.md` where the packet contract itself narrowed
  the parent K0 obligations.
- Select the K0 semantic canonical-value/equality encoding/profile and explicit finite limits required
  by execution-protocol.md; state limit units and what is counted so K1 fixtures can test exact
  pass/fail boundaries.
- Keep transport wire serialization, database schema and storage engine replaceable; distinguish those
  from the semantic canonical representation used for equality/identity.
- Define, at K0 conceptual level, the separate action dimensions already owned by action-lifecycle.md:
  request disposition, attempt evidence/external certainty, result validity where applicable, and
  responsibility/completion obligation. K2 still implements action admission/settlement; do not
  implement K2 here.
- Correct EF-1/EF-2: in K1, an Outcome containing unsupported Effects is rejected during Outcome/
  envelope validation before any immutable Effect intent exists — this is not an Effect-admission
  decision. In K2, accepted intent and later admission remain separate boundaries.
- Add/specify negative cases: denial/refusal without a physical attempt is not external failure;
  admitted-but-unconfirmed work can be unknown; `unknown` does not discharge responsibility; stopping
  retries is not proof of failure; unsupported K1 Effect content causes whole-Outcome refusal without
  creating an Effect intent.
- Re-evaluate §11's K0-boundary map after these changes so every parent obligation has an owner and
  observable assertion.

### K01-REV-05 — Supply inspectable validation evidence

**Severity:** P2 (round-1's evidence pointed at non-durable local paths).

Findings:

- After all payload corrections are complete, create a new correction payload commit C2 on top of the
  reviewed history (not amending the reviewed C/H).
- Rerun applicable documentation validation on the clean C2 tree.
- Record `git diff --check` for the cumulative base..C2 diff and a link/anchor check over the
  corrected K0.1 documents.
- Rerun `npm run check:builder-docs`/`npm run typecheck` on C2 if claimed, with exact command/cwd/
  Node/environment/exit code/counts and a reviewer-accessible evidence location; do not represent old
  `/tmp` paths as reviewer-accessible.
- `npm test` is not automatically required for a documentation-only correction; rerun affected
  executable validation only if executable code changed (it should not, per the standing non-goal).

## Outcome

CHANGES REQUIRED

Disposition of every finding above is recorded in [implementation-02.md](implementation-02.md), which
also names the exact worksheet/contract sections each finding changed.
