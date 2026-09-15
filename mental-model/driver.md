# Driver: preserving behavior across the protocol

An [Execution Driver](concepts/core.md#execution-driver) adapts the
[Kernel](concepts/core.md#kernel)'s [Activation](concepts/core.md#activation)
and [Outcome](concepts/core.md#outcome) exchange to a particular
[Runtime](concepts/core.md#execution-runtime). It can be an in-process function,
subprocess client or remote-job adapter. It exists to preserve native behavior while
giving the Kernel an explicit coordination contract.

## The translation it owns

The Driver maps [Execution](concepts/core.md#execution) and Activation identities to native runs, sessions or jobs.
It forwards the exact input and interprets native responses. A provider's “success”
may mean “paused with a human form,” so copying its status string into `COMPLETED`
would be wrong. A session may span several runs; an Activation is not automatically
one conversation turn.

When native tools are mediated, the Driver preserves the exact selected operation,
final arguments and continuation until a later result can reach the native engine.
When tools remain native, the integration describes their scope honestly.

## Recovery needs more than a job ID

Suppose a service starts job J but the connection closes before the Driver receives J's
ID. Sending “start” again might create another job. The Driver needs a request identity
saved before submission and a service that can query or deduplicate it; otherwise the
safe result is “unknown, reconcile,” rather than another submit.

Similarly, replacing an old host must not leave two writers mutating one native session.
The Kernel can reject stale Outcomes, but native mutation needs its own exclusion or
an explicit refusal to take over. The shared [recovery procedure](mechanisms/recovery.md)
states the order; the Driver supplies the phase-specific evidence.

## Supported claims are small and explicit

Each Driver declares its identity mapping, input retry behavior, progress format,
recovery modes, mediated tools, pause/output meaning, cancellation behavior, resources
and supported versions. [The support record](mechanisms/integration.md#support-record)
is the owning checklist. Unsupported and same-process-only are useful answers.

Start with a useful native public API. Compare native operation with the thin adapter
before deep interception; if the native system already solves the whole application,
direct use may be preferable. A second independently designed Runtime is required
before treating an integration-specific extension as a portable contract.

Next: [integration](mechanisms/integration.md) for native fidelity,
[recovery](mechanisms/recovery.md) for crash windows, and
[external protocols](mechanisms/external-protocols.md) for external protocol mappings.
