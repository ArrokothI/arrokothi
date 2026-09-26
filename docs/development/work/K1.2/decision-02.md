# K1.2 decision 02 — Activation identity is an exchange coordinate (owner decision)

Owner decision, 2026-09-26 UTC. Recorded by a Claude Code session (Claude Opus 5.5) at the owner's
explicit instruction. This is a decision record below the canonical owner, not a review, an
implementation or an acceptance. The canonical rule will live in
[execution-cycle](../../../../mental-model/mechanisms/execution-cycle.md#outcome-acceptance);
[decision-01](decision-01.md) and [blocker-02](blocker-02.md) stay unchanged as history.

## Context

[Review 12](review-12.md) of H13 `54c65a7289e90385e01643422d57a015b66c2025` (payload C11
`ad219a5cf8940d0379bda9b16d693c901931a4b5`, base `a20d278185eaffc7f8b7489345a3624231ff6e6d`)
closed K12-R11-ORDER-01 and recorded K12-R13-ARCH-01 in [blocker-02](blocker-02.md). A missing,
malformed or unobservable `activationId` is refused as `malformed_envelope` right after scope, before
the replay lookup, the terminal fence, currency, submission authority and content. Contract
K1.2-OPEN-5 says that position has no canonical authorization.

The owner observes two facts that settle it:

- Canonical step 3 already names the current Activation as an exchange coordinate beside the writer
  epoch and base progress revision. C11 settled the rule for a missing or malformed coordinate: it
  never establishes staleness and is a content-group refusal after submission authority succeeds.
- The current early return records an identity diagnostic on the Execution's refusal list for a caller
  that presented no submission authority. That is the K12-R9-ORDER-01 defect family (content examined
  and retained before authority), limited to one field.

## Decision

The Activation identity is the third exchange coordinate. The per-coordinate rule accepted for the
writer epoch and base progress revision applies to it unchanged. Fresh-Outcome acceptance has this
total order:

1. **Scope.** Unchanged (OA-1).
2. **Replay lookup.** Only a well-formed Activation identity can address an accepted Outcome. A
   missing, malformed or unobservable identity addresses none: it is neither an exact replay nor a
   `duplicate_conflict`, and the proposal proceeds as fresh. A well-formed identity keeps the existing
   replay/conflict behavior (DEC-3).
3. **Terminal fence.** A terminal Execution refuses as `terminal_destination` whatever the identity's
   shape.
4. **Exchange currency, per coordinate.** Refuse as `stale_exchange` when no exchange is unresolved,
   when a well-formed Activation identity does not name the unresolved exchange, or when a well-formed
   writer epoch or base progress revision does not match it. Each coordinate is judged on its own. A
   missing, malformed or unobservable coordinate, including the Activation identity, never
   establishes staleness and never prevents another well-formed coordinate from establishing it.
5. **Submission authority.** A missing, forged or retired grant refuses as `unauthorized_submission`
   (DEC-20).
6. **Content.** A missing, malformed or unobservable Activation identity is a content issue. It is
   reported together with every other content issue in one `malformed_envelope` refusal. The content
   group's existing internal order (the Emission-capacity refusal before `malformed_envelope`) is
   unchanged.

The general rule behind steps 3 and 4: an exchange-group refusal is determined by Kernel state and
well-formed claims only; a malformed claim never determines one.

### Distinguishing schedules

| Schedule | Required classification |
|---|---|
| Terminal Execution + malformed/missing/unobservable identity | `terminal_destination` |
| Accepted Activation + malformed identity, Execution still open at a later exchange | No replay, no conflict; classified by steps 3–6 (for example `stale_exchange` from a well-formed stale base revision) |
| Unresolved exchange + malformed identity + well-formed stale epoch or base | `stale_exchange` |
| Unresolved exchange + malformed identity + current coordinates + absent/forged/retired grant | `unauthorized_submission`, no content diagnostic returned or retained |
| Unresolved exchange + malformed identity + current grant + other malformed content | One `malformed_envelope` listing the identity issue and the other content issues |
| Unresolved exchange + malformed identity + current grant + otherwise valid content | `malformed_envelope` naming only the identity issue; nothing is accepted |
| No unresolved exchange, not terminal + malformed identity | `stale_exchange` |

### Observation and disclosure

- The `activationId` read stays where it is: one observation, before capture and the replay lookup.
  Only the classification of its failure moves. DEC-10's single-observation and reentrancy ordering
  is unchanged.
- A refusal reason on any path before step 6 must not render a malformed or unobservable identity
  value. It may say that the proposal's Activation identity was not usable, but it discloses no
  diagnostic of it.

### K12-R13-DOC-01 disposition

Eager capture stays (DEC-10); moving capture after authority is not authorized. The canonical and
DEC-2 wording "no content diagnostic is produced, returned, or retained" is replaced by the actual
guarantee: the single eager capture may compute content diagnostics internally, but before
submission authority succeeds they never determine the refusal and are neither returned nor
retained. This applies to every refusal reached before step 6.

### K12-R13-REC-01 disposition

C11's contract change is revision 8. The next payload's contract is revision 9 and records the
revision history in one place, so that the contract header, the implementation report and 007 all
name the same revision.

## Consequences

- The canonical owner `execution-cycle.md#outcome-acceptance` states the total rule. No other Layer-3
  page gains a competing normative copy.
- K1.2 contract DEC-2 cites the canonical rule, K1.2-OPEN-5 is closed by this decision, and BASELINE
  `#outcome-acceptance-api` is aligned.
- `submitOutcome` changes: the early `malformed_envelope` return moves into the content group, a
  malformed identity skips the replay lookup and the wrong-Activation comparison, and refusal reasons
  before step 6 stop interpolating the identity.
- The O6 pinned test is replaced by the schedules above. The C11 per-coordinate currency repair, its
  56-case matrix and the B15/B16 ablations are preserved.
- 007 moves K1.2 from BLOCKED_ARCHITECTURE to CHANGES_REQUESTED. No acceptance, integration, K1.3
  release or successor packet is granted by this decision. The corrected candidate needs a fresh C
  and H, validation, and a fresh cumulative independent review under 006/008/012.
