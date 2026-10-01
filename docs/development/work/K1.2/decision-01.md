# K1.2 decision 01 — narrow in-process delivery-carrier extension (owner authorization)

Owner decision, 2026-09-25. Recorded by the K1.2 implementer at the owner's explicit
instruction. This is a decision record below the canonical owner, not a review or an
acceptance. The canonical rule lives in
[execution-cycle](../../../../mental-model/mechanisms/execution-cycle.md); the sealed
KC1-ARCH-1 history is unchanged.

## Context

Accepted [KC1-ARCH-1](https://github.com/ArrokothI/arrokothi/blob/9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49/docs/development/work/K1.1-correction-01/decision-01.md)
and its superseding note select the in-process delivery call as
`deliver(activation, settlement): undefined`, with Kernel-owned delivery reporting, no
Driver-returned Promise observation, `undefined` return, explicit reporting, and
first-report-wins semantics. That record is sealed history.

K1.2 implements DEC-20 attempt-bound Outcome-submission authority: the Kernel mints one
frozen grant per writer-epoch attempt, hands it to the Driver with the Activation, preserves
it across ordinary redelivery, replaces it on authorized takeover, and requires the current
grant back by reference identity on fresh Outcome acceptance. The implemented in-process
binding therefore calls
`deliver(activation, settlement, submission): undefined`. Review-06 finding
K12-R6-LAYER3-01 and [blocker-01](blocker-01.md) stop the canonical correction because no
implementer or reviewer record can silently supersede the owner's exact accepted carrier
signature.

The owner instruction of 2026-09-25 resolves blocker-01 with the narrow authorization
below. Governing baseline B: `a20d278185eaffc7f8b7489345a3624231ff6e6d`. Prior reviewed
payload C5: `aa8709673e6d53455f226d0fc01bdca6fb55e600`; H5:
`d13a82881c5fa11aa8fc48eff83a9472eef595a6`. Round-6 blocked payload C6:
`149f7f186c8a2370da8a3afc37cd75076d8c1e64`; H6:
`b89a703472397c264743014a5ed2a83c30846f2e`.

## Decision

For the in-process binding, K1.2 may extend the previously accepted KC1-ARCH-1 Driver
delivery boundary from `deliver(activation, settlement): undefined` to the equivalent
binding that also supplies the current Runtime attempt's Outcome-submission authority,
currently represented as `deliver(activation, settlement, submission): undefined`.

This authorization is intentionally narrow:

- `DeliverySettlement` remains a Kernel-created capability scoped to one physical delivery
  attempt.
- The Outcome-submission capability is scoped to one Runtime attempt / writer epoch.
- Ordinary redelivery preserves the Activation, writer epoch, and the same
  Outcome-submission authority, while receiving a fresh per-delivery
  `DeliverySettlement`.
- Authorized takeover preserves the Activation ID, advances the writer epoch, and replaces
  the Outcome-submission authority.
- A fresh Outcome must possess the current attempt's submission authority in addition to
  satisfying visibility and exchange-currency checks.
- Exact accepted-Outcome replay/conflict handling remains before fresh
  submission-authority validation.
- Visibility, explicit control authority, and Runtime-attempt submission authority remain
  separate powers.
- KC1-ARCH-1's other guarantees remain unchanged: no Driver-returned Promise observation,
  `undefined` return, explicit Kernel-owned delivery reporting, first-report-wins semantics,
  and the existing safe delivery-reporting boundary.
- `SubmissionGrant` is the current in-process representation of this authority. This
  decision does not require a universal serialized token, wire format, remote credential
  scheme, or K2 policy language.

This supersedes only KC1-ARCH-1's exact two-argument TypeScript carrier signature as
necessary to express the additional attempt-bound capability. The historical KC1-ARCH-1
decision record is preserved unchanged; this file is the later owner decision and
provenance, not a rewrite of that history.

## Consequences

- The canonical owner
  [execution-cycle](../../../../mental-model/mechanisms/execution-cycle.md) states the
  complete in-process call, distinguishes the two capability lifetimes, and owns the
  submission-authority check's place in the Outcome-acceptance order. No other Layer-3 page
  gains a competing normative rule.
- The writer epoch remains the semantic attempt identity and fence
  ([identity](../../../../mental-model/concepts/identity.md#writer-epoch)); the unforgeable
  submission capability is this binding's representation of the current attempt's authority,
  recorded in BASELINE `#outcome-acceptance-api`. It fixes no universal transport-independent
  concept, token format, or wire representation.
- Stale exchange and currency are determined before classifying a current-but-unauthorized
  fresh submission. Replay, nondisclosure, currency fencing, and atomic acceptance are not
  weakened.
- BASELINE, the K1.2 contract, and reference navigation point to that canonical owner
  rather than maintaining competing rules.
- No acceptance, integration, K1.3 release, or successor packet is granted by this
  decision. The corrected candidate still requires fresh validation and independent review
  under 006/008/012.
