# Deployment: making logical promises physical

Deployment chooses where the [Kernel](concepts/core.md#kernel), [Driver](concepts/core.md#execution-driver) and [Runtime](concepts/core.md#execution-runtime) execute, where state survives, and what access the Runtime actually has. It is an operating view of the same logical architecture, rather than another execution engine.

## Roles are not required services

A [Kernel Worker](concepts/operations.md#kernel-worker) performs Kernel transitions. An [Execution Host](concepts/operations.md#execution-host) runs Runtime code. One application process can perform both roles; separate processes let each role be limited and restarted on its own.

| Profile | What it looks like | What you may honestly claim |
|---|---|---|
| Embedded, in memory | Kernel and Runtime share one process with no persistent store — a CLI tool, a script, a test harness | Tests and ephemeral trusted work; process loss loses all state |
| Embedded or local service with persistent storage | Kernel runs inside the application, or a local sidecar, backed by a real database — the common case for a single-backend web app | One administrative domain; accepted state survives process loss — native work is a separate question |
| Remote hosts or multiple workers | Kernel, Driver and Runtime run as separate services, possibly on different machines — a Kernel service coordinating a pool of Runtime workers | Additional authenticated transport, ownership and partition tests required |

What that middle row claims is narrower than it sounds, and it narrows in two directions. It covers the Execution's accepted state and nothing beyond it: the storage keeps the records, so the Kernel can reconstruct what it had accepted before the crash. Whether the Runtime's native work can resume from there is a second and harder question, and the Driver answers it rather than the database. Even the first half is a claim about reconstructing afterwards rather than about prevention — nothing in the profile stops the crash.

None of the three profiles promise the following: recovery from a destroyed disk, availability across geographic regions — staying up if an entire data center goes down, say the US site while a Japan site keeps serving — or safety when mutually distrusting tenants share one deployment.

Going to remote hosts or multiple workers adds its own requirements: the connections between separate processes must be authenticated, so a Runtime worker cannot be tricked by an impersonated Kernel or vice versa; it must be clear which host currently holds the right to write for a given Execution; and behavior under a network partition between hosts needs to be tested. None of that adds up to multi-region failover or safety between mutually distrusting tenants — those remain separate, larger commitments this document does not make for any profile.

For example, a typical web backend creates one Kernel instance when it starts, and authenticates each incoming request before letting it create, submit input to, inspect or cancel an [Execution](concepts/core.md#execution) on the application's behalf. The browser itself never talks to the Kernel directly — it calls the backend, and the backend is the trusted boundary that checks identity before touching the Kernel. The Kernel does not need a fresh process per HTTP request: one long-lived instance serves every authenticated request. Whether that backend is packaged as a CLI tool, a background service or something else is a deployment choice the architecture does not dictate.

Which of these profiles the shipped SDK supports today is a status question; the [implemented baseline](../docs/development/002-implemented-kernel-baseline.md) answers it, not this page.

## Trust and containment

[Trusted Execution](concepts/operations.md#trusted-execution) intentionally permits ambient host access. [Isolated Execution](concepts/operations.md#isolated-execution) physically restricts that access under a declared threat model — though that threat model can still allow some native access on purpose, such as calling one approved external API.

Isolation and Kernel-mediated action checks are separate guarantees, and neither implies the other. Isolation decides only what the Runtime can physically reach. Mediation decides whether the Kernel is authorizing what the Runtime does with that reach. A deployment can have either without the other: the container you added bounds what the Runtime can reach and changes nothing about which of its calls the Kernel is checking. For [the counterexample in both directions](concepts/actions.md#exposure-and-mediation), which is the fastest way to stop conflating the two, read the exposure and mediation rules.

An isolation claim is worth exactly as much as its scope and its evidence, and both are easy to overstate. Scope first: sandboxing one tool is not isolating a Runtime, so a profile that names a sandbox should say what the sandbox is around. Evidence second: a container label is not containment, and until something has actually been prevented against the real backend, the isolation is unverified. Unverified is not a quiet synonym for Trusted — Trusted Execution is a deliberate decision to permit ambient access, never a mode a deployment arrives at by not testing for containment.

The two modes classify an Execution's Runtime, and only that. A Driver, an adapter or the application around them is not "running under Trusted Execution", and neither mode says anything about what those components may touch. That is the deployment's own list, and it has to be written down: name the components that actually hold each power, rather than reading the answer off what each component is called. One rule does carry across from the modes — credentials broad enough to act for the whole service stay out of isolated Runtime code — and [the resource and isolation rules](mechanisms/resources.md#containment-claims) own the rest, along with enforcement and cleanup.

## Independent failures and resource costs

A Runtime can outlive a coordinator, and a coordinator can outlive a Runtime. Test both. [Recovery](mechanisms/recovery.md) first reconstructs accepted state and then checks the Driver's native continuation contract; a heartbeat alone cannot decide it.

Splitting the two roles into two processes moves where a failure lands; it does not by itself give them separate fates. Two processes on one machine still share that machine's memory, its disk and its network, so a single exhaustion can take down both. Failures come apart only where something actually enforces the boundary: different hosts, or limits the host imposes per process. A profile that claims one role survives the other should say which of those it relies on.

[Activation dispatch](concepts/identity.md#dispatch-and-delivery) is asynchronous — the Kernel does not block waiting for a Runtime attempt to finish — so several Executions can be worked on concurrently. That concurrency comes from the protocol, not from the operating system: dispatching an Activation does not by itself give the underlying Runtime code CPU preemption or fair scheduling. A tight synchronous loop in one Execution can still starve every other Execution sharing its process, exactly as it would without the Kernel involved. Two consequences follow, and [capacity, cancellation and retention](mechanisms/resources.md#capacity-cancellation-and-retention) owns both. First, the costs of running Executions accrue in independent places — in the coordinator, in native compute, in queues, in dormant waits — and a deployment that meters them as one number cannot tell which one is saturated. Second, each layer enforces a different limit, and none substitutes for another: a Kernel cap on admitted mediated actions does not bound a Runtime's own model calls, and neither bounds raw CPU, which only the host can.

Persistent resources can outlive host connections. Closing a client should not delete a workspace needed for recovery, because [release is not destruction](concepts/state.md#resource-binding-and-attachment). Missing state is an explicit loss, not permission to silently attach an empty replacement.

## Check what a durable substrate retries on its own

Using a mature durable engine for storage, timers and dispatch is encouraged, but adopting one means checking one thing first: what it re-runs on its own when an answer goes missing.

These engines re-run two different things, and only one of them is dangerous. Re-running their own recorded history is safe by construction, because the engine already holds those answers and hands them back instead of asking again. Re-running a step whose answer never arrived is the risky one, because the engine cannot tell a step that never ran from a step that ran and lost its answer on the way back.

Re-running a step is safe when the step only computes, and when computing it a second time costs nothing. A step that already charged a card or sent a message fails the first condition: re-running it does the thing twice. A metered model call can fail the second: it is billed again, and it may not return the same answer.

So before adopting a durable engine, find out exactly which steps it retries automatically, and make sure that automatic retry never applies to a step whose action may already have happened. Those steps follow [the action rules](mechanisms/actions.md#retrying-an-action) instead: retry only with provider-enforced idempotency or proof the action never ran, and otherwise record the work as unknown. [Temporal's activity contract](https://docs.temporal.io/activity-definition) and [Restate's durable steps](https://docs.restate.dev/develop/ts/durable-steps) both document this behavior and are worth reading, but neither decides which of your steps are safe to repeat — the action rules do. These are references, not tested integrations or selected dependencies; K3 will pick the actual substrate from a failure experiment.

## What a supported profile publishes

Publish tested versions, surviving storage assumptions, recovery restrictions, retention windows, limits and cleanup responsibilities. The [evidence contract](mechanisms/evidence.md) distinguishes accepted facts from telemetry and laboratory protection. Use mature storage and isolation systems when adequate; a custom scheduler, database, sandbox or hosting fleet is not a default obligation.
