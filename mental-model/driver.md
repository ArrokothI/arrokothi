# Driver: preserving behavior across the protocol

An [Execution Driver](concepts/core.md#execution-driver) adapts the [Kernel](concepts/core.md#kernel)'s [Activation](concepts/core.md#activation) and [Outcome](concepts/core.md#outcome) exchange to a particular [Runtime](concepts/core.md#execution-runtime). It can be an in-process function, subprocess client or remote-job adapter. It exists to preserve native behavior while giving the Kernel an explicit coordination contract.

## The translation it owns

The Driver maps [Execution](concepts/core.md#execution) and Activation identities to the Runtime's native runs, sessions or jobs, and that mapping is not one-to-one: a single native session may span several runs, and one Activation is not automatically the same thing as one conversation turn. It also forwards the exact input and interprets native responses. That interpretation cannot just copy native vocabulary: a native provider's own "success" status may really mean "paused, waiting on a human form," so copying that label straight into the Execution's `COMPLETED` state would be wrong.

The Driver also carries tool calls across the boundary. Some native tool calls the Driver turns into Effects instead of letting the framework run them, so they take the Kernel's [mediated](concepts/actions.md#exposure-and-mediation) path. Follow the weekly report through one:

1. The native Agent decides to publish and emits a tool call, `publish_report` with the draft's reference.
2. The Driver turns that call into an [Effect](concepts/actions.md#effect) in the Outcome, naming exactly which operation and arguments were requested, and the native call is left pending.
3. The Kernel accepts the Outcome, then separately admits the exact action; a trusted adapter sends it and establishes the result.
4. The result arrives as an [Event](concepts/core.md#event) in a later Activation, and the Driver hands it to the pending native call, so the Agent resumes as if its tool had simply returned.

Nothing inside the Agent was rewritten, yet the publication went through the Kernel's permission checks and left evidence behind. [The exact mediated-tool sequence](mechanisms/integration.md#mediated-tool-sequence) covers what may and may not run at each of those steps.

## Recovery needs more than a job ID

Suppose the report's Runtime runs as a remote job service. The Driver submits the Activation as job J, and the connection closes before the Driver receives J's ID. Sending "start" again might create a second job. The Driver needs a [request identity](concepts/identity.md#request-key-and-input-id) saved before submission and a service that can query or deduplicate it; otherwise the safe result is "unknown, reconcile," rather than another submit.

Similarly, replacing an old host must not leave two writers mutating one native session. The Kernel can reject stale Outcomes, but native mutation needs its own exclusion or an explicit refusal to take over. The shared [recovery procedure](mechanisms/recovery.md) states the order; the Driver supplies the phase-specific evidence.

## Supported claims are small and explicit

Each Driver declares its identity mapping, input retry behavior, progress format, recovery modes, which native tools it routes through the Kernel, pause and output meaning, cancellation behavior, resources and supported versions. [The support record](mechanisms/integration.md#support-record) is the owning checklist. "Unsupported" and "same-process only" are useful answers.

When a tool call stays native instead of being mediated, the Driver does not try to mediate it. Its obligation there is to record that fact in the support record, so the application choosing this Driver does not mistake an unmediated native action for one the Kernel actually governs.

Start with a useful native public API. Compare native operation with the thin adapter before deep interception; if the native system already solves the whole application, direct use may be preferable. A second independently designed Runtime is required before an integration-specific extension can be treated as a portable contract.

For exact rules: [integration](mechanisms/integration.md) for native fidelity, [recovery](mechanisms/recovery.md) for crash windows, and [external protocols](mechanisms/external-protocols.md) for mappings to protocols outside ArrokothI.

Next in the reading order: [Deployment](deployment.md), where all three pieces actually run.
