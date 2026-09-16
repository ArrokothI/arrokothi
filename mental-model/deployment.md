# Deployment: making logical promises physical

Deployment chooses where the [Kernel](concepts/core.md#kernel), [Driver](concepts/core.md#execution-driver) and [Runtime](concepts/core.md#execution-runtime) execute, where state survives, and what access the Runtime actually has. It is an operating view of the same logical architecture, rather than another execution engine.

## Roles are not required services

A [Kernel Worker](concepts/operations.md#kernel-worker) processes Kernel transitions. An [Execution Host](concepts/operations.md#execution-host) runs Runtime code. One application process can perform both roles; separate processes let their failures and resource limits be managed independently.

| Profile | What it looks like | What you may honestly claim |
|---|---|---|
| Embedded, in memory | Kernel and Runtime share one process with no persistent store — a CLI tool, a script, a test harness | Tests and ephemeral trusted work; process loss loses all state |
| Embedded or local service with persistent storage | Kernel runs inside the application, or a local sidecar, backed by a real database — the common case for a single-backend web app | One administrative domain; a process crash survives because the storage does |
| Remote hosts or multiple workers | Kernel, Driver and Runtime run as separate services, possibly on different machines — a Kernel service coordinating a pool of Runtime workers | Additional authenticated transport, ownership and partition tests required |

This profile's promise only covers what it can actually control: a process crash survives because the durably stored Kernel records help reconstruct the Execution's accepted progress afterward — not because anything prevented the crash itself. None of the three profiles promise the following: recovery from a destroyed disk, availability across geographic regions — staying up if an entire data center goes down, say the US site while a Japan site keeps serving — or safety when mutually distrusting tenants share one deployment.

Going to remote hosts or multiple workers adds its own requirements: the connections between separate processes must be authenticated, so a Runtime worker cannot be tricked by an impersonated Kernel or vice versa; it must be clear which host currently holds the right to write for a given Execution; and behavior under a network partition between hosts needs to be tested. None of that adds up to multi-region failover or safety between mutually distrusting tenants — those remain separate, larger commitments this document does not make for any profile.

For example, a typical web backend creates one Kernel instance when it starts, and authenticates each incoming request before letting it create, submit input to, inspect or cancel an [Execution](concepts/core.md#execution) on the application's behalf. The browser itself never talks to the Kernel directly — it calls the backend, and the backend is the trusted boundary that checks identity before touching the Kernel. The Kernel does not need a fresh process per HTTP request: one long-lived instance serves every authenticated request. Whether that backend is packaged as a CLI tool, a background service or something else is a deployment choice the architecture does not dictate.

Which of these profiles the shipped SDK supports today is a status question; the [implemented baseline](../docs/development/002-implemented-kernel-baseline.md) answers it, not this page.

## Trust and containment

[Trusted Execution](concepts/operations.md#trusted-execution) intentionally permits ambient host access. [Isolated Execution](concepts/operations.md#isolated-execution) physically restricts that access under a declared threat model — but that threat model can still explicitly allow some native access, such as calling one approved external API: isolation only decides what the Runtime can physically reach, not whether the Kernel is mediating and authorizing what it does with that reach. A container label alone does not establish containment. Isolation and Kernel-mediated action checks are separate guarantees: a well-isolated Execution can still make an unmediated native call within what it's allowed to reach, and a well-mediated Execution can run with no physical isolation at all.

Credentials that are broad enough to act on the whole service's behalf — not a narrow, per-request token — belong only in code running under Trusted Execution, such as the Driver, never inside isolated Runtime code. The [resource and isolation rules](mechanisms/resources.md) explain enforcement and cleanup.

## Independent failures and resource costs

A Runtime can outlive a coordinator, and a coordinator can outlive a Runtime. Test both. [Recovery](mechanisms/recovery.md) first reconstructs accepted records and then checks the Driver's native continuation contract; a heartbeat alone cannot decide it.

[Activation dispatch](concepts/identity.md#dispatch-and-delivery) is asynchronous — the Kernel does not block waiting for a Runtime attempt to finish — so several Executions can be worked on concurrently. That concurrency comes from the protocol, not from the operating system: dispatching an Activation does not by itself give the underlying Runtime code CPU preemption or fair scheduling. A tight synchronous loop in one Execution can still starve every other Execution sharing its process, exactly as it would without the Kernel involved. Two consequences follow, and [capacity, cancellation and retention](mechanisms/resources.md#capacity-cancellation-and-retention) owns both. First, the costs of running Executions accrue in independent places — in the coordinator, in native compute, in queues, in dormant waits — and a deployment that meters them as one number cannot tell which one is saturated. Second, each layer enforces a different limit, and none substitutes for another: a Kernel cap on admitted mediated actions does not bound a Runtime's own model calls, and neither bounds raw CPU, which only the host can.

Persistent resources can outlive host connections. Closing a client should not delete a workspace needed for recovery, because [release is not destruction](concepts/state.md#resource-binding-and-attachment). Missing state is an explicit loss, not permission to silently attach an empty replacement.

## Check what a durable substrate retries on its own

Using a mature durable engine for storage, timers and dispatch is encouraged, but adopting one means checking one thing first: most of them automatically re-run a step on their own when that step's result goes missing.

Re-running a step like that is safe when the step only computes. It is not safe when the step already charged a card or sent a message, because the engine cannot distinguish a step that never ran from one that ran but lost its answer on the way back — and re-running it there does the thing twice.

So before adopting a durable engine, find out exactly which steps it retries automatically, and make sure that automatic retry never applies to a step whose action may already have happened. Those steps follow [the action rules](mechanisms/actions.md#retrying-an-action) instead: retry only with provider-enforced idempotency or proof the action never ran, and otherwise record the work as unknown. [Temporal's activity contract](https://docs.temporal.io/activity-definition) and [Restate's durable steps](https://docs.restate.dev/develop/ts/durable-steps) both document this behavior and are worth reading, but neither decides which of your steps are safe to repeat — the action rules do. These are references, not tested integrations or selected dependencies; K3 will pick the actual substrate from a failure experiment.

## What a supported profile publishes

Publish tested versions, surviving storage assumptions, recovery restrictions, retention windows, limits and cleanup responsibilities. The [evidence contract](mechanisms/evidence.md) distinguishes accepted facts from telemetry and laboratory protection. Use mature storage and isolation systems when adequate; a custom scheduler, database, sandbox or hosting fleet is not a default obligation.
