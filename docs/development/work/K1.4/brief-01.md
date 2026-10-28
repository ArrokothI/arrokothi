# Brief 01 — K1.4

Planner: the owner's Claude Code desktop session (`claude-opus-5-5`), 2026-10-28, at the owner's request
("let's release the new packet"), using Prompt D. This brief is a draft for the owner's decisions below; it
releases nothing. It is written under
[006 working principle 6](../../006-development-process.md#working-principles) and
[017](../../017-known-limitations.md): build right now what is expensive to change, and record the rest
as limits.

## Goal

Route the supported SDK through the new Kernel. Today `@arrokothi/sdk`'s `createApplication` drives the
legacy 0.8.x `Harness` directly, and no supported consumer reaches `@arrokothi/kernel`
([BASELINE](../../002-implemented-kernel-baseline.md), "K1.4 owns that bridge"). After K1.4 an SDK
application creates and drives Executions through the Kernel coordinator: create, dispatch, asynchronous
Driver delivery, Outcome, waits, cancellation and host-pumped timers. The viable legacy controllers keep
working as private Runtime machinery behind an `ExecutionDriver`. Legacy features with no K1 home are
refused by name or explicitly migrated. Then the full K1/E1 gate closes K1.

## Scope and governing owners

The scope and acceptance are in [007 K1.4](../../007-work-packets.md#k14--legacy-bridge-and-k1e1-gate),
including its entry checks (PLAN-01). The governing Layer-3 owners are those in
[the roadmap's K1.4 entry](../../../../mental-model/roadmap.md#k14):
- [integration](../../../../mental-model/mechanisms/integration.md): Driver and native Runtime boundary;
- [execution-cycle](../../../../mental-model/mechanisms/execution-cycle.md): Activation, delivery,
  settlement and submission;
- [evidence](../../../../mental-model/mechanisms/evidence.md): the K1/E1 gate and attribution.

Assigned inputs:
- [kernel-ownership](../../kernel-ownership.md#deferred-extraction-and-bridge-owners) DX-5 (the synchronous
  `Harness`) and DX-6 (`ControllerResumption`), both `legacy-only` and owned by K1.4;
- [decision-02](../DESIGN-AUDIT-01/decision-02.md) stage 3: the SDK exports and documents the staged
  value wrapper;
- [017 L-01](../../017-known-limitations.md): before a public bridge ships, a startup check or a stated
  limit in the bridge contract;
- K1.0's structural obligations, which K1.4 rechecks with actual behaviour (007 K1.0 acceptance).

## Build right now (expensive to change later)

| ID | Criterion (governing source) | Closes by |
|---|---|---|
| K14-1 | **SDK host drives the Kernel** (007 acceptance: "actual accepted asynchronous exchange through the supported entry"). `createApplication` and its run/start entries create an Execution, dispatch, deliver through a Driver, and accept the Outcome through the Kernel coordinator. The SDK host pumps `pendingTimers`/`fireTimer` and exposes cancellation. A delayed Runtime does not block another Execution. | Deterministic: SDK-level tests for continue, await (input and deadline), complete, fail and cancel through the public entry, plus a two-Execution test with one stalled Runtime. |
| K14-2 | **Legacy controllers as private Runtime machinery** (DX-5, DX-6; [integration](../../../../mental-model/mechanisms/integration.md)). The Agent and Workflow controllers run behind one `ExecutionDriver`. `ControllerResumption` may survive inside that adapter but never drives Kernel wait types or stores. | Structural: import guards with forbidden-edge controls (Kernel ↛ core, Driver adapter ↛ Kernel internals). Deterministic: a legacy wait maps to a Kernel wait declared in an Outcome, never to a Kernel type built by the legacy code. |
| K14-3 | **K1.0 structural obligations recheck.** New Kernel work cannot depend on legacy internals through direct, type-only or barrel imports, and the bridge's new paths are in the inventory with their allowed imports. | Structural: the existing guards and inventory, extended to the bridge zone, with representative rejected edges. |
| K14-4 | **Every supported legacy feature is preserved, migrated or refused** (007 acceptance). One table lists each public SDK/guide feature with its disposition. Preserved features have tests through the new entry; refused features fail by name with no partial work; migrations are documented in `docs/guides`. | Deterministic: a closed feature inventory (exports of `@arrokothi/sdk` plus the guide map), one test per row. |
| K14-5 | **Public wrapper and L-01** (decision-02 stage 3; L-01). The SDK exports the value wrapper and documents its cooperative contract. Owner decision 4 picks a startup check or a stated limit. | Deterministic: the export, its documentation, and either the startup check's refusal test or the limit text in the bridge contract. |
| K14-6 | **Conformance port.** Useful legacy conformance runs against the new entry; tests that pin retired Kernel concepts (controller-local resumptions, synchronous `activate`) are replaced, each keeping the property that still holds. | Deterministic: a mapping table from each legacy conformance file to ported, replaced (with the kept property) or retired (with the reason). |
| K14-G | **Full K1/E1 gate** (007; [evidence § Attribution and gates](../../../../mental-model/mechanisms/evidence.md#attribution-and-gates)). The benchmark's E1 fixtures drive the new supported entry, observed independently, with zero invariant violations in E1's declared scope. | External: the benchmark owner's E1 result. Owner decision 1 says whether this stays in K1.4. |

**Layer 3.** Update integration and execution-cycle where the SDK host and the legacy Driver adapter
become real; record the gate result in evidence only as the benchmark reports it. BASELINE's "no supported
SDK consumer is routed through the private target package yet" becomes false and must be rewritten.

## Recorded as limits (017), not built

- **Effects stay unmediated.** Effect mediation is K2.1 (DX-7). Under owner decision 2, legacy tool and
  model calls either run natively inside the Driver as Trusted Execution, with no Kernel guarantee for
  those paths, or are refused.
- **No persistence.** The legacy `RuntimeStore` and scheduler (DX-8, DX-9) stay legacy until K3.1; the
  bridge holds no state across a process restart (L-19).
- **Stock controllers are not rewritten.** Their quality is R2.1's (DX-10); K1.4 claims only that they run
  behind the Driver boundary.
- **No physical stop** on cancellation beyond L-20's optional request.
- **Children/composition** follow owner decision 2: refused by name or kept as Runtime-internal behaviour,
  never as Kernel composition, which is a later packet's.

## Known counterexamples to keep passing

- The K1.1–K1.3 Kernel corpus, COORD-REFACTOR-01's plan/apply oracle and K1.3's owner predicate (P1–P9):
  the bridge goes through public coordinator entries only and never constructs plans.
- K1.0's forbidden-edge controls.
- The SDK's current application tests and the guide examples, each preserved, migrated or replaced under
  K14-4.
- BINDING-01's canonical-bytes boundary: the SDK passes bytes from the wrapper, and the Kernel never sees a
  live object.
- **To be replaced, not preserved:** tests that pin the public `Application.harness` property, synchronous
  `ExecutionController.activate`, or controller-local resumptions driving Kernel state.

## Suspect design

1. **Two stores.** The legacy `Harness` keeps its own Execution and resumption state; the Kernel owns
   logical state. **Question:** what legacy state becomes Runtime-private progress, what is dropped, and
   how does one Execution avoid two sources of truth?
2. **Synchronous controllers, asynchronous delivery.** The Driver's `deliver` returns `undefined` and
   reports through `DeliverySettlement` and `SubmissionGrant`; legacy controllers return from
   `activate`. **Question:** how does the adapter run legacy work and submit its Outcome without the Kernel
   observing a Promise?
3. **The public `harness` handle.** `Application` exposes `harness` today. Removing it is a breaking change.
   **Owner decision 3.**
4. **Legacy features with no K1 home.** Tools and model calls (Effects), children, user-input requests and
   memory bindings. **Owner decision 2.**

## Questions before code

1. The Driver adapter's shape: one Driver for both controller kinds or one per kind; how a definition
   reaches it; how legacy waits map to K1.3 wait declarations.
2. The SDK host loop: who calls dispatch and `fireTimer`, on what trigger, and how tests drive it
   deterministically with an injected clock.
3. The feature inventory for K14-4, derived from the SDK's exports and the guide map, with a proposed
   disposition per row.
4. The conformance mapping for K14-6.
5. Size: whether K14-1..6 can be reviewed coherently as one range, or need ranges (for example the Driver
   adapter first, then the SDK surface and migration).

## Bounds

No Effect mediation, persistence, isolation, native-stop proof, Kernel composition or new provider adapter.
Kernel semantics change only where the bridge proves a Kernel correctness need, through 006's
architecture-change steps. The bridge uses the coordinator's public API; it adds no Kernel entry for its
own convenience.

## Stop conditions

Use 006 if the bridge needs a Kernel semantic change, if a supported feature can be neither preserved nor
refused cleanly, or if K14-G cannot be stated as a finishable check because the E1 fixture is unavailable.

## Owner decisions

1. **Split the gate?** 007 asks K1.4 to assess its own size and allows a split that keeps `K1.4` as the
   bridge identity. E1 is still `PLANNED` in the benchmark ledger (unreleased, fixture pinned to the K0
   contract), and K1.4 acceptance also waits on TOOLS-02 ranges 2–4.
   - **A (recommended):** split. K1.4 is the bridge (K14-1..6). A new `K1.4-gate` packet holds K14-G and
     depends on K1.4, TOOLS-02 integration and the benchmark's E1 release. The K1 milestone row then
     reads "K1.4 and K1.4-gate ACCEPTED".
   - **B:** one packet. K1.4 builds the bridge, then waits `BLOCKED_EXTERNAL` until E1 and TOOLS-02 land.
2. **Legacy features with no K1 home** (tools/model calls, children, user-input requests, memory).
   - **A (recommended):** run them natively inside the legacy Driver as Trusted Execution, documented as
     unmediated until K2/K4, with no Kernel guarantee for those paths (AGENTS.md trust modes).
   - **B:** refuse them by name until their owning packet; apps that use tools stop working on the new
     entry.
   - **C:** keep the legacy `Harness` path beside the new entry for apps that need them.
3. **Public surface.** Remove `Application.harness` and the synchronous host methods (a breaking change and
   a 0.9 version), or keep them as deprecated legacy accessors for one release.
4. **L-01.** A startup check that resolves the serializer's free identifiers and refuses on mismatch, or the
   stated limit in the bridge contract.
5. **Roles.** Implementer: a GPT-6 session. Design check, adversary (Prompt E) and review: separate Opus
   sessions. Run Prompt E before the build, as for K1.3?
