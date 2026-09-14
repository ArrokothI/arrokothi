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

## What a supported profile publishes

Publish tested versions, surviving storage assumptions, recovery restrictions,
retention windows, limits and cleanup responsibilities. The
[evidence contract](mechanisms/evidence.md) distinguishes accepted facts from telemetry
and laboratory protection. Use mature storage and isolation systems when adequate;
a custom scheduler, database, sandbox or hosting fleet is not a default obligation.
