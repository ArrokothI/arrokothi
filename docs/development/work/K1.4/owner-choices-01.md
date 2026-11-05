# K1.4 — owner choices 01: answers to design 01's questions

**Record type:** owner decision. It answers the eight owner questions in [design 01](design-01.md) §16. Recorded on
2026-11-05 by the K1.4 implementer's Claude Code desktop session (`claude-opus-5-5`), at the owner's instruction.
The owner's answer, verbatim:

```text
Accept all
```

That covers all eight recommendations in design 01 §16 as drafted. The owner's message made Q1 explicit: amend
decision-02 so that `@arrokothi/kernel` stays private, the SDK takes a workspace dependency on it, and the SDK is
unpublishable until a release packet decides. Q2 to Q8 take the recommended options as written in §16.

## Choices

| Q | Choice | Where design 01 states it |
|---|---|---|
| Q1 | **Packaging.** `@arrokothi/kernel` stays `private`. `@arrokothi/sdk` takes a workspace dependency on it, so the SDK is unpublishable until a release packet decides how to publish. This amends [decision-02](../DESIGN-AUDIT-01/decision-02.md)'s sentence "A public SDK package therefore never depends on the private Kernel package"; a dated note there points here. The wrapper's own direction is unchanged: the wrapper imports neither the Kernel nor the bridge, and a guard enforces it. | §2, §8, §16 Q1 |
| Q2 | **Deprecated `harness` mutators refuse by name.** `Application.harness` becomes a read-only deprecated view. Each mutator throws `LegacyHarnessMutationRefused` naming its replacement and has no native effect, so each native pause keeps one resume owner. | §6, §7 S-HARNESS-W |
| Q3 | **Cancellation cascades to the native lineage.** The Driver's `requestCancellation` cancels the native root and its native descendants. It is a request only (L-20). This changes the documented legacy "cancellation does not cascade" behaviour for SDK users; the guides record the migration. | §6, §7 S-CANCEL, G-CHILD |
| Q4 | **Wait deadline source.** An optional `ApplicationOptions.humanWaitDeadlineMs` puts a deadline on each Kernel wait the Driver declares. On expiry the Driver cancels the native lineage and fails the Execution with `arrokothi.bridge.wait_deadline_expired`. The Execution deadline is exposed as `start({ executionDeadline })`. | §3, §16 Q4 |
| Q5 | **Retry keys are optional.** `creationKey` and `requestKey` default to fresh UUIDs. The guides say that only caller-supplied keys make retries exact. A `creationKey` must have at most 64 characters, all from `[A-Za-z0-9._:-]` (the native root-ID constraint); any other key is refused by name. | §7 S-START, S-INPUT; §10 |
| Q6 | **Conformance dispositions.** The **R** disposition (retained, Runtime-attributed) is added to the brief's three. Files with an X disposition stay as native regressions with a header note; none are deleted. | §11 |
| Q7 | **`await` only at native quiescence.** A parallel Workflow whose sibling model call is in flight reports `confirmation_required` once that call settles. This is recorded as a migration note and a 017 limit. | §3, §15 |
| Q8 | **Ranges.** One packet in ranges A (the bridge) and B (surface and migration), one CI verify and one independent review. | §14 |

## Effect on the process

- Design 01 is unchanged. These choices adopt its recommendations as written, and the build implements them.
- The lifecycle in [release 01](release-01.md) continues: the Codex GPT-6 Prompt E attack on design 01, then the
  Codex GPT-6 design check, then the build. The design check reads this record as answering §16. It does not
  reopen these questions unless it finds a defect they cause.
- Not decided here: any packet release, the SDK's publication, or K1.4-gate.
