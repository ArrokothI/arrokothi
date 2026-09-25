# Adapting a native Runtime faithfully

The [Driver](../concepts/core.md#execution-driver) translates selected contracts while the native system keeps its algorithms and state. This page owns integration support claims; [recovery](recovery.md) owns the common continuation protocol.

**Status:** Per-Driver obligation, not Kernel semantics. Introduced by R1; supported versions frozen at S1. K1.4's legacy bridge uses only the reference-Runtime shape below and earns no support record here. This is target specification, not shipped behavior.

In-process adapters obey the Kernel's [delivery reporting boundary](execution-cycle.md#delivery-reporting-boundary): translate native asynchronous success/failure into the supplied per-delivery operational reporting capability, carry the supplied per-attempt submission authority back with the Outcome, and own all internal Promise handling. The boundary owns both lifetimes and the acceptance order; this page adds no second rule. This K1 boundary is separate from the R1 native-fidelity support claims below.

A Driver is where an honest answer costs the most, because every dimension below has a comfortable wrong answer available. The page is built to make the honest one sayable: choose the shallowest integration that does the job, then record what that integration actually preserves — dimension by dimension, with **unsupported** as a legitimate entry — and only then claim support, on evidence rather than on inspection of upstream code. The failure this guards against is a Driver that looks complete because it compiles against every interface while quietly preserving none of them.

## Select the smallest useful integration

| Integration shape | Kernel can manage | Native system retains |
|---|---|---|
| Service operation | Exact surrounding action | Internal run, tools, context and recovery |
| Managed native job | Enclosing Execution and input/result | Session, graph, algorithm and checkpoint meaning |
| Selected mediated tools | Above plus proven action paths | All residual paths and native continuation |
| Reference ArrokothI Runtime | Same protocol, optional helper libraries | Agent/Workflow algorithms and local state |

These shapes are not a trust ranking. They differ in how much of the native system the Kernel is asked to understand, and less is usually better: an integration that only needs to start a job and read its result has far fewer ways to be subtly wrong than one that intercepts every tool call. An isolated external job may be better contained than reference code with ambient credentials. Report mediation, recovery, containment and fidelity independently. Preserve a useful current step adapter without pretending it proves whole-native-runtime fidelity.

## Support record

Each supported Driver/[profile](../concepts/operations.md#operating-profile-and-durability) records versions, declarations and evidence for:

| Dimension | Required answers |
|---|---|
| Identity/[principals](../concepts/actions.md#principal-and-authority) | Execution/Activation/native run/session mapping; account and session-sharing owner |
| Input | Exact native input/config, stable submit key, duplicate and lost-response handling |
| [Progress](../concepts/state.md#progress) | Inline/checkpoint/job form, [codec](../concepts/values.md#codec)/code versions, resources, retention and missing-state behavior |
| Recovery | Phase-specific reattach/replay/same-process/refusal; stale native writer exclusion and repeat costs |
| Actions | Direct, indirect, fallback/delegated paths, actual credential holders, proven mediated subset |
| Pause/input | Native pause identity, one form/resume owner, expiry and duplicate reply handling |
| Output | Completion meaning, typed/invalid result, provisional output and delivery owner |
| Cancellation | Signal/interrupt/kill support, host loss, late results and remaining native work |
| Native supervision | Child/parent-close behavior, retries and limits; which descendants remain native; who retains responsibility after native parent closure |
| Resources | Acquire/release/destroy, restoration, lost binding and cross-owner cleanup |
| Fidelity/upgrade | Native features preserved, quality/cost/latency comparison and one upstream upgrade |

Unsupported is a legitimate value, and the table is only useful because of it. A record that answers every row affirmatively is either an unusually complete Driver or an untested one, and a reader cannot tell which unless the honest gaps are written down. These are tested claims, not a universal capability registry. Preflight refuses requested [durability](../concepts/operations.md#operating-profile-and-durability) or [mediation](../concepts/actions.md#exposure-and-mediation) without proof. Start with one useful Driver; a second independent Runtime must justify a portable extension.

## Mediated tool sequence

This is the sequence that lets a native engine call a tool the Kernel governs, without the engine being rewritten. The native side chooses the tool and the arguments; the Kernel decides whether that exact call may happen; the result comes back to the native continuation that is waiting for it. Each arrow is a place where fidelity can be lost, which is why the rules after it are about what may still run at each step.

```text
native selects tool and final semantic arguments
→ resolve stable target and yield continuation + Outcome Effect
→ Kernel accepts intent, then admits the exact action
→ trusted adapter establishes result
→ later Activation forwards the correlated Event to native continuation
```

Argument-mutating middleware finishes before [consent](authority.md#exact-action-consent)/[admission](actions.md#admission-and-sending). Result presentation hooks can shape text but not trusted evidence: a hook may turn a failure into a gentler sentence for the model, and the recorded result is still a failure. Inspect nested/fallback tools, caches, delegation and terminal/code paths; a hook that fires after execution cannot prevent it.

A live coroutine callback bridge is valid only for same-process continuation unless the native provider offers durable suspension or safe replay. Never serialize a Promise, blindly replay a billable/toolful prefix or add a second unversioned [Effect](../concepts/actions.md#effect) RPC during an unaccepted [Activation](../concepts/core.md#activation). If yielding damages fidelity, keep tools native and govern an outer artifact/action handoff, or refuse the stronger claim. A future streaming action protocol needs its own explicit atomicity/fencing design.

## Native human work and output

Native engines rarely distinguish "finished" from "stopped and waiting for a person" as sharply as the Kernel does. Translating those states by their meaning rather than their label is most of this section.

Preserve native pause/form routing with one resume owner. Kernel [waiting](waits.md) requires a durable correlation/subscription or queryable job contract; native polling can remain inside `RUNNING`. A native “run succeeded” with deferred human work is not necessarily Kernel completion: an engine can report success together with a form still waiting for a person, which is a pause, not a result. Forward authenticated bound replies; feedback is consent only when it satisfies the exact action contract.

[Cancellation](lifecycle.md#cancellation-order) signaling is separate from immutable Activation input. A late correct native result may remain diagnostic after cancellation without becoming accepted progress. Native model budgets require Runtime/provider enforcement; estimates stay estimates.

Map cancellation by effect, not by API name. A native cancellation request may only schedule cooperative handling; native termination may close a logical run while its external activity still executes. Neither acknowledgment proves that a process stopped. Likewise, native run retries or continue-as-new chains need an explicit identity mapping: a native session/workflow identifier may span several runs, whereas a terminal ArrokothI Execution never reopens. Declare automatic native retries before wrapping a toolful job, and preserve unknown-action evidence across native replacements.

## Evidence before support

Everything above describes what a Driver should preserve. This section is about proving it does, and the standard is deliberately uncomfortable: the comparison runs the same real task twice, once without the Kernel in the path.

Compare native-only and thin-Driver versions of the same useful public task. Begin with fake models/services for identity, pauses, typed values, cancellation and unknown work. Then compare verified live outcomes, preserved features, cost/latency and an upstream upgrade. Pin versions, input/config and margins; disclose normalization that removes a native advantage. Never infer production safety from inspected upstream code.

R1 begins after K1, uses K2 for mediation and constrains K3 before persistence freezes. If an outer job suffices, remove deep interception. If direct native use is simpler for the entire process, removing ArrokothI is a valid product decision — and a comparison that cannot reach that conclusion was not a real comparison. The [prior-art index](../sources.md#native-design-evidence) retains concrete inspected examples.
