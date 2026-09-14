# Deployment: making logical promises physical

Deployment chooses where the Kernel, Driver and Runtime execute, where state survives,
and what access the Runtime actually has. It is an operating view of the same logical
architecture, rather than another execution engine.

## Roles are not required services

A [Kernel Worker](concepts/operations.md#kernel-worker) processes Kernel transitions.
An [Execution Host](concepts/operations.md#execution-host) runs Runtime code. One
application process can perform both roles; separate processes let their failures and
resource limits be managed independently.

| Profile | Appropriate claim |
|---|---|
| Embedded, in memory | Tests and ephemeral trusted work; process loss loses state |
| Embedded or local service with persistent storage | One administrative domain; process failure with storage surviving |
| Remote hosts or multiple workers | Additional authenticated transport, ownership and partition tests required |

The first persistent target does not promise disk destruction recovery, multi-region
availability or hostile multi-tenancy. The current public SDK remains the implemented
0.8.x surface; K1.0's private target package is structural preparation.

For example, a web backend creates its Kernel once and authenticates requests to
create, input, inspect and cancel. Browser code calls that backend. There is no required
Kernel process per HTTP request, and CLI/service names are product choices.

## Trust and containment

[Trusted Execution](concepts/operations.md#trusted-execution) intentionally permits
ambient host access. [Isolated Execution](concepts/operations.md#isolated-execution)
physically restricts it under a declared threat model. A container label alone does
not establish containment. An isolated Runtime may still have allowed native network
access, so isolation and action mediation are independent claims.

Privileged credentials belong in trusted adapters outside isolated code. The
[resource and isolation rules](mechanisms/resources.md) explain enforcement and cleanup.

## Independent failures and resource costs

A Runtime can outlive a coordinator, and a coordinator can outlive a Runtime. Test
both. [Recovery](mechanisms/recovery.md) first reconstructs accepted records and then
checks the Driver's native continuation contract; a heartbeat alone cannot decide it.

Async dispatch permits concurrency but supplies neither CPU preemption nor fair
scheduling. An embedded CPU loop can block the process. Use ordinary worker/process
pools and measure active computation, queued input, output and dormant waits separately.
The Kernel can limit mediated admissions; a Runtime/provider limits internal calls;
the host limits CPU, memory and process trees.

Persistent resources can outlive host connections. Closing a client should not delete
a workspace needed for recovery. Missing state is an explicit loss, not permission to
silently attach an empty replacement.

## Check what a durable substrate retries on its own

Using a mature durable engine for storage, timers and dispatch is encouraged. Doing so
hands it one decision worth checking first: most of them re-run a step by themselves when
the reply is lost.

That is safe when the step only computes. It is not safe when the step already charged a
card or sent a message, because the engine cannot tell "never ran" apart from "ran, and
the answer went missing" — and re-running it does the thing twice.

So before adopting one, find out exactly which steps it retries without being asked, and
keep that behavior away from any step whose action may already have happened. Those steps
follow [the action rules](mechanisms/actions.md#retrying-an-action) instead: retry only
with provider-enforced idempotency or proof it did not run, and otherwise record the work
as unknown. [Temporal's activity contract](https://docs.temporal.io/activity-definition)
and [Restate's durable steps](https://docs.restate.dev/develop/ts/durable-steps) both
document this behavior and are worth reading. Neither of them decides which of your steps
are safe to repeat; the action rules do. These are references, not tested integrations or
selected dependencies — K3 picks the substrate from a failure experiment.

## What a supported profile publishes

Publish tested versions, surviving storage assumptions, recovery restrictions,
retention windows, limits and cleanup responsibilities. The
[evidence contract](mechanisms/evidence.md) distinguishes accepted facts from telemetry
and laboratory protection. Use mature storage and isolation systems when adequate;
a custom scheduler, database, sandbox or hosting fleet is not a default obligation.
