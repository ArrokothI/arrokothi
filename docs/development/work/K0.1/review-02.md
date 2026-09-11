# Independent review — K0.1, round 2

## Identity and access

- Packet: **K0.1** — Protocol decisions and legacy disposition.
- Reviewed base (unchanged): `6464be12c11eb75f7dfbc5ece12ca8d3020a5c15`.
- Round-1 reviewed candidate H: `857fa05a8a72a4c6f4f294f9e775a0dc1f7919dc`.
- Round-2 correction payload C2: `fc84664a873d6a4cfaf1d86d57fb9bcba34a6f04`.
- Round-2 reviewed candidate H2: `cc61e74455534abf896c46632246615185219b92`.
- Reviewer identity: **GPT-5.6 Sol, High reasoning.**
- Reviewer access: **independent GitHub pinned-source inspection; no executable local checkout and
  no shell rerun of any command.** The reviewer inspected the pinned tree and diffs directly and did
  not re-execute validation; per 006 this is an acceptable review posture when adequate immutable
  evidence is inspectable, and it is the reason finding K01-R2-06 requires evidence that is actually
  retrievable from the repository rather than from a session-local path.
- Reviewer session identifier: **not supplied.** None is recorded here; this record does not invent one.
- Transcription path: delivered to the coding-agent session as an owner (Rex-Shih) message, recorded
  here verbatim in substance per 006's owner-transcription path.

## Provenance correction to round 1 (finding K01-R2-05)

[review-01.md](review-01.md) is **preserved unchanged** as the historical transcription of the round-1
review. Its identity/access/severity metadata is **superseded by this record**, which supplies the
facts round 1's transcription could not confirm at the time:

| Round-1 metadata | As recorded in review-01.md | Corrected by this record |
|---|---|---|
| Reviewer identity | "not independently confirmed by this record"; 006's intended reviewer named only as a default | **GPT-5.6 Sol, High reasoning** |
| Access method | "not recorded in the delivered message" | **Independent GitHub pinned-source inspection; no executable local checkout or shell rerun** |
| K01-REV-01 severity | P1 (inferred) | **P1** (as actually assigned) |
| K01-REV-02 severity | P1 (inferred) | **P1** (as actually assigned) |
| K01-REV-03 severity | "P2 ... plus one P1-adjacent substantive error" (inferred) | **P1** (as actually assigned) |
| K01-REV-04 severity | P2 (inferred) | **P1** (as actually assigned) |
| K01-REV-05 severity | P2 (inferred) | **P2** (as actually assigned) |

Three of round 1's five severities were understated by the coding agent's inferred transcription
(K01-REV-03 and K01-REV-04 were P1, not P2). No round-1 finding was dismissed or deferred on the
basis of those understated severities — all five were dispositioned as fixed in
[implementation-02.md](implementation-02.md) — but the record is corrected here so the severity
history is accurate. `review-01.md` itself is not edited: superseding metadata belongs in this later
record, not in a rewrite of the earlier one.

## Findings

Severity labels were not supplied for the round-2 findings and are not inferred here. All six are
blocking for this round by virtue of the outcome below.

### K01-R2-01 — Complete the canonical value encoding

- Fix `protocol-worksheet.md` §1 E-3/E-6 and any affected contract text.
- The present "canonical envelope size = UTF-8 bytes of canonicalized form" is not testable while the
  canonicalization/encoding remains underspecified.
- Define the exact logical canonical encoding needed for equality and byte-size computation, including
  every byte-affecting rule: object-key ordering, string encoding/escaping, number representation and
  any other normalization rule needed so two conforming implementations produce the same canonical
  bytes for the same logical value.
- Keep the actual transport wire codec replaceable; do not accidentally require transports to use the
  canonical equality/size encoding on the wire.
- Add deterministic boundary examples proving equivalent transport spellings map to one logical
  canonical representation and therefore one identical size/pass-fail result.
- Reconcile the contract's "implementation-owned" text so only transport/storage mechanics remain open.

### K01-R2-02 — Give `PendingOperation` a valid legacy disposition

- K0.1-C3 explicitly requires `PendingOperation` to be classified migratable / legacy-only / refused.
- Remove the fourth "OOS/no label applies" classification.
- Classify the current universal `PendingOperation` abstraction consistently with 004/kernel.md: the
  universal hierarchy is not part of the mandatory target Kernel model.
- The abstraction may be split from individual useful facts; if narrower fields/concepts can inform
  K2-specific logical-action/attempt/responsibility records, say so without deciding K2 mechanics.
- Keep Effects themselves refused in K1; this is legacy disposition, not K2 implementation.

### K01-R2-03 — Correct Event-wait migration and fully state the target K1 wait shape

- `MIG-5` must not say the current `ExecutionWait.event` + `WakeCondition` are "exactly" sufficient
  unchanged.
- Current source has one `wake` condition and one `correlationId`, and its own documentation says
  selective application-input label matching is absent.
- Preserve only the actually reusable pieces: declarative identity/kind/correlation matching and any
  legitimately reusable Event condition primitives.
- Explicitly classify the current record shape as insufficient unchanged for target finite-any-of
  dependencies plus declared application-input subscriptions.
- State an unambiguous target semantics for a finite enumerable Event dependency set and a separate
  declared input-subscription eligibility rule. Do not invent arbitrary predicates/query languages.
- Add deterministic examples: two differently correlated alternatives; result-before-wait for either
  alternative; ordinary input not covered by a subscription remains queued; subscribed correction
  input may wake; unmatched backlog remains unacknowledged.

### K01-R2-04 — Correct the reference-store claims

- Fix §12 `REF-2`: global serialization of `RuntimeStore.transact` serializes store transactions, but
  does not by itself prove Runtime computations cannot overlap, because `Harness.runController` occurs
  after the claim transaction closes.
- Classify global aggregate cloning/serialization as an implementation/scalability limitation and a
  mechanism that must not be mistaken for semantic per-Execution scoping. Do not claim it necessarily
  fails K1's delayed-A/B-concurrency requirement without an actual counterexample.
- Reconcile this with K1's explicit requirement to build an in-memory reference.
- Fix `REF-4`: the old monotonic mailbox cursor cannot remain the unchanged mailbox mechanism of the
  new K1 reference, because K1 requires eligible unmatched accounting and Outcome-time acknowledgment.
  The old file/store may remain as legacy/compatibility material until migration; do not describe the
  cursor itself as both "refused for K1+" and "retained as K1 reference."
- Re-check §13's "no contradiction found" statement after these corrections.

### K01-R2-05 — Preserve/correct review provenance without rewriting history

- Do not edit away `review-01.md`.
- Record the round-2 review faithfully, explicitly correcting the historical metadata: round-1
  reviewer GPT-5.6 Sol, High reasoning; access by independent GitHub pinned-source inspection with no
  executable local checkout or shell rerun; original round-1 severities K01-REV-01 P1, K01-REV-02 P1,
  K01-REV-03 P1, K01-REV-04 P1, K01-REV-05 P2.
- State that `review-01.md` remains preserved historical transcription but its identity/access/severity
  metadata is superseded by this provenance correction.
- Do not fabricate a reviewer session identifier that was never supplied.

### K01-R2-06 — Provide actual reviewer-accessible validation evidence

- Re-run the applicable validation only after the final correction payload C3 is fixed and clean.
- Required documentation checks remain cumulative `git diff --check`, corrected link/anchor audit,
  `npm run check:builder-docs`, and `npm run typecheck` if claimed.
- Preserve raw command output in a reviewer-accessible pinned artifact — not a session-local path and
  not merely a reproduction instruction.
- Record exact C3 SHA, cwd, Node/environment, exact commands, exit codes/counts/skips, artifact
  identity/location, SHA-256 digest and retention owner.
- A GitHub Actions artifact or owner-provided/uploaded immutable log bundle is acceptable; verify it
  can actually be retrieved by the reviewer.
- `npm test` remains not required if this correction touches only documentation/review records.
- Missing evidence must remain BLOCKED_EXTERNAL rather than being called fixed.

## Outcome

CHANGES REQUIRED

Disposition of every finding is recorded in [implementation-03.md](implementation-03.md). Corrections
need no new owner release; K0.2 and all later packets remain unreleased.
