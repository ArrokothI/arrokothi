# GPT-6 audit: deployment dependencies of the operations rewrite

Review date: 2026-09-21. Handoff for [deployment.md](deployment.md); the original is outside the direct-edit allowance and remains unchanged. Source revisions, per-subsection comparisons and reuse limits are recorded in [the operations audit](concepts/gpt6-audit-operations.md). This is a target-document correction proposal, not a supported deployment claim.

## Trust and containment

The paragraph placing broad credentials in “code running under Trusted Execution, such as the Driver” applies an Execution trust mode to a component role. Replace it with:

> Broad service credentials remain in explicitly privileged application, adapter or broker components outside isolated Runtime code. The deployment enumerates those components in its trusted computing base and records the actual credential holders. A Driver may use a narrow capability instead of holding a broad credential itself. Trusted and Isolated classify Runtime reach; neither is a separate trust classification for Drivers.

Match the updated [resource containment contract](mechanisms/resources.md#containment-claims). Add that isolating one terminal/code tool does not isolate the enclosing Runtime and all its plugins. Dify's sandbox service configuration, Hermes's selected terminal backend and OpenClaw's tool/browser settings illustrate why scope must be explicit; see D4, H2 and O3 in the audit.

Missing enforcement evidence means an Isolated profile is unverified and unsupported. It does not silently authorize a Trusted fallback. Keep the two Execution trust modes; verification status is a separate fact.

## Roles and failure promises

The persistent-storage row says “a process crash survives because the storage does.” Prefer “accepted Kernel records survive a process crash under the stated storage guarantee; Runtime continuation additionally depends on the Driver's recovery contract.” Dify's pause-state snapshot and Hermes's session/file stores preserve different kinds of state. Temporal's workflow replay is native recovery machinery, not a property inherited by arbitrary Runtime code using its storage.

Separate processes allow independent limits; they do not establish independent failure domains by themselves. Host-wide memory exhaustion or shared credentials can still affect both roles. State the resource/failure boundary needed for an Execution Host failure to leave Kernel service available. Avoid requiring a dedicated worker or continuously renewed per-Execution lease during a dormant wait; the updated [recovery mechanism](mechanisms/recovery.md#decide-permission-before-replacing-work) permits work claims at transition time and substrate shard/queue ownership.

## Durable substrate versus native Runtime

Keep Temporal the principal K3 comparator without declaring it selected. Distinguish two integrations:

| Use of Temporal | Obligations to prove |
|---|---|
| Substrate behind Kernel transitions/timers/dispatch | Match ArrokothI's acceptance, fencing, receipts, action uncertainty and retention contracts. Identify every automatic retry that could resubmit native or external work. |
| Native Runtime behind a Driver | Preserve Temporal's own workflow/activity behavior and identity chain; translate only the enclosing input/result/actions selected for mediation. Pin replay/code history and declare remaining native retries and tools. |

A Temporal Workflow Task replay is not the same thing as an Activity retry. Tighten the current “most engines automatically re-run a step” explanation to name the retry boundary. Replaying deterministic workflow code against recorded history can be safe while resubmitting an external activity with a missing answer is still uncertain. Conversely, even a nominally computational step may be billable or nondeterministic; the Driver declares repeat cost and safety. This is consistent with [the action retry contract](mechanisms/actions.md#retrying-an-action).

Temporal's server implements parent-close policies after the parent closes (T1), but cancellation requests schedule cooperative handling (T2). Do not treat successful native cancellation/termination requests as proof of physical stop, or copy Temporal's abandon default into ArrokothI's required-child accounting. [Integration](mechanisms/integration.md#native-human-work-and-output) and [supervision](mechanisms/communication.md#finite-expansion-and-supervision) now state the target boundaries.

Claude should apply these summary corrections after reconciling the operations definitions. Do not change release status or sealed packet records. Proposed gate ownership is in [the roadmap map](roadmap.md).
