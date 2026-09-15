# Roadmap → Layer-3 maintenance map

This page maps each roadmap gate (K0.1, K1.2, S1, and so on) to the `concepts/` and
`mechanisms/` pages accepted work under that gate is expected to touch — ownership and
navigation, for someone landing on a packet who needs to know which Layer-3 pages to
read and maintain. **It is not a whitelist, release or status ledger:** for what is
actually implemented and released, see the
[packet ledger](../docs/development/007-work-packets.md), which owns status and release;
the [milestone roadmap](../docs/development/001-current-status-and-roadmap.md) owns what
each gate means. Cleanup examines every affected concept/mechanism and its dependents,
even when not listed here. Update this map when accepted work creates a new owner or
changes scope.

Layer 1/2 change only when the whole-system model or a major abstraction changes.
Layer 3 is maintained after acceptance under [Prompt C](../docs/development/009-universal-prompts.md#prompt-c--gpt-6-final-cleanup-close-or-reopen-and-push).
No extra sequencing packet is required: the existing packet scopes identify these owners.

Historical packets are mapped for retrieval and future corrections — not retroactive
edits of sealed contracts/reports, and not a change to their acceptance.

## K0.1

Protocol decisions and legacy disposition. Expected Layer-3 owners:

- [values](concepts/values.md)
- [identity](concepts/identity.md)
- [creation](mechanisms/creation.md)
- [execution-cycle](mechanisms/execution-cycle.md)
- [waits](mechanisms/waits.md)
- [lifecycle](mechanisms/lifecycle.md)
- [state](concepts/state.md)
- [authority](mechanisms/authority.md)

[Packet scope and dependencies](../docs/development/007-work-packets.md#k01--protocol-decisions-and-legacy-disposition).

## K0.2

Public controls and K0/E0 gate. Expected Layer-3 owners:

- [evidence](mechanisms/evidence.md)
- [waits](mechanisms/waits.md)
- [identity](concepts/identity.md)

[Packet scope and dependencies](../docs/development/007-work-packets.md#k02--public-controls-and-k0e0-gate).

## K1.0

Target boundary and legacy quarantine. Expected Layer-3 owners:

- [evidence](mechanisms/evidence.md)

[Packet scope and dependencies](../docs/development/007-work-packets.md#k10--target-boundary-and-legacy-quarantine).

## K1.0-correction-01

Whole-cell inventory fidelity. Expected Layer-3 owners:

- [evidence](mechanisms/evidence.md)

[Packet scope and dependencies](../docs/development/007-work-packets.md#k10-correction-01--whole-cell-inventory-fidelity).

## K1.0-correction-02

Collection identity in inventory comparison. Expected Layer-3 owners:

- [values](concepts/values.md)
- [evidence](mechanisms/evidence.md)

[Packet scope and dependencies](../docs/development/007-work-packets.md#k10-correction-02--collection-identity-in-inventory-comparison).

## K1.1

Create, reserve and asynchronous dispatch. Expected Layer-3 owners:

- [creation](mechanisms/creation.md)
- [execution-cycle](mechanisms/execution-cycle.md)
- [core](concepts/core.md)
- [identity](concepts/identity.md)
- [state](concepts/state.md)

[Packet scope and dependencies](../docs/development/007-work-packets.md#k11--create-reserve-and-asynchronous-dispatch).

## K1.1-correction-01

Delivery reporting replaces Driver-returned Promise observation. The precise rule lives in
[execution-cycle](mechanisms/execution-cycle.md#delivery-reporting-boundary), with the
adapter obligation linked from [integration](mechanisms/integration.md). K1.1-correction-01
owns deterministic first-report, failure, duplicate, delayed and redelivery tests. K1.2/K1.3
exercise late reports after their lifecycle transitions; K5 owns retired-record behavior.
The [decision and acceptance mapping](../docs/development/work/K1.1-correction-01/decision-01.md)
records the implementation gap and bounded handoff. No successor is released by this decision.

## K1.2

Outcome acceptance and receipts. Expected Layer-3 owners:

- [execution-cycle](mechanisms/execution-cycle.md)
- [values](concepts/values.md)
- [identity](concepts/identity.md)
- [output](mechanisms/output.md)

[Packet scope and dependencies](../docs/development/007-work-packets.md#k12--outcome-acceptance-and-receipts).

## K1.3

Wait and cancellation races. Expected Layer-3 owners:

- [waits](mechanisms/waits.md)
- [lifecycle](mechanisms/lifecycle.md)
- [core](concepts/core.md)
- [operations](concepts/operations.md)

[Packet scope and dependencies](../docs/development/007-work-packets.md#k13--wait-and-cancellation-races).

## K1.4

Legacy bridge and K1/E1 gate. Expected Layer-3 owners:

- [integration](mechanisms/integration.md)
- [evidence](mechanisms/evidence.md)
- [execution-cycle](mechanisms/execution-cycle.md)

[Packet scope and dependencies](../docs/development/007-work-packets.md#k14--legacy-bridge-and-k1e1-gate).

## K2.1

Atomic Effect intents. Expected Layer-3 owners:

- [execution-cycle](mechanisms/execution-cycle.md)
- [actions](mechanisms/actions.md)
- [actions](concepts/actions.md)

[Packet scope and dependencies](../docs/development/007-work-packets.md#k21--atomic-effect-intents).

## K2.2

Concrete schema and admission. Expected Layer-3 owners:

- [authority](mechanisms/authority.md)
- [actions](mechanisms/actions.md)
- [external-protocols](mechanisms/external-protocols.md)

[Packet scope and dependencies](../docs/development/007-work-packets.md#k22--concrete-schema-and-admission).

## K2.3

Settlement, uncertainty and completion. Expected Layer-3 owners:

- [actions](mechanisms/actions.md)
- [lifecycle](mechanisms/lifecycle.md)
- [recovery](mechanisms/recovery.md)

[Packet scope and dependencies](../docs/development/007-work-packets.md#k23--settlement-uncertainty-and-completion).

## K2.4

Input requests and K2/E2 gate. Expected Layer-3 owners:

- [communication](mechanisms/communication.md)
- [authority](mechanisms/authority.md)
- [waits](mechanisms/waits.md)

[Packet scope and dependencies](../docs/development/007-work-packets.md#k24--input-requests-and-k2e2-gate).

## R1.1

First real native boundary. Expected Layer-3 owners:

- [integration](mechanisms/integration.md)
- [recovery](mechanisms/recovery.md)
- [resources](mechanisms/resources.md)

[Packet scope and dependencies](../docs/development/007-work-packets.md#r11--first-real-native-boundary).

## R1.2

Second boundary and R1/E3 initial gate. Expected Layer-3 owners:

- [integration](mechanisms/integration.md)
- [external-protocols](mechanisms/external-protocols.md)
- [context](mechanisms/context.md)

[Packet scope and dependencies](../docs/development/007-work-packets.md#r12--second-boundary-and-r1e3-initial-gate).

## K3.1

Fault harness and substrate experiment contract. Expected Layer-3 owners:

- [recovery](mechanisms/recovery.md)
- [evidence](mechanisms/evidence.md)

[Packet scope and dependencies](../docs/development/007-work-packets.md#k31--fault-harness-and-substrate-experiment-contract).

## K3.2

Narrow transactional persistent candidate. Expected Layer-3 owners:

- [recovery](mechanisms/recovery.md)
- [execution-cycle](mechanisms/execution-cycle.md)
- [waits](mechanisms/waits.md)
- [actions](mechanisms/actions.md)
- [output](mechanisms/output.md)

[Packet scope and dependencies](../docs/development/007-work-packets.md#k32--narrow-transactional-persistent-candidate).

## K3.3

Native recovery and resource windows. Expected Layer-3 owners:

- [recovery](mechanisms/recovery.md)
- [integration](mechanisms/integration.md)
- [resources](mechanisms/resources.md)

[Packet scope and dependencies](../docs/development/007-work-packets.md#k33--native-recovery-and-resource-windows).

## K3.4

Comparator and K3/E4 decision gate. Expected Layer-3 owners:

- [recovery](mechanisms/recovery.md)
- [evidence](mechanisms/evidence.md)
- [operations](concepts/operations.md)

[Packet scope and dependencies](../docs/development/007-work-packets.md#k34--comparator-and-k3e4-decision-gate).

## K4.1

Durable children and delegation. Expected Layer-3 owners:

- [communication](mechanisms/communication.md)
- [authority](mechanisms/authority.md)
- [operations](concepts/operations.md)

[Packet scope and dependencies](../docs/development/007-work-packets.md#k41--durable-children-and-delegation).

## K4.2

Addressed messages and replies. Expected Layer-3 owners:

- [communication](mechanisms/communication.md)
- [actions](mechanisms/actions.md)
- [waits](mechanisms/waits.md)

[Packet scope and dependencies](../docs/development/007-work-packets.md#k42--addressed-messages-and-replies).

## K4.3

Durable human response lifecycle. Expected Layer-3 owners:

- [communication](mechanisms/communication.md)
- [waits](mechanisms/waits.md)
- [authority](mechanisms/authority.md)

[Packet scope and dependencies](../docs/development/007-work-packets.md#k43--durable-human-response-lifecycle).

## K4.4

Authorized retained output. Expected Layer-3 owners:

- [output](mechanisms/output.md)
- [communication](mechanisms/communication.md)
- [evidence](mechanisms/evidence.md)

[Packet scope and dependencies](../docs/development/007-work-packets.md#k44--authorized-retained-output).

## K4.5

K4/E4 composition gate. Expected Layer-3 owners:

- [communication](mechanisms/communication.md)
- [recovery](mechanisms/recovery.md)
- [output](mechanisms/output.md)
- [evidence](mechanisms/evidence.md)

[Packet scope and dependencies](../docs/development/007-work-packets.md#k45--k4e4-composition-gate).

## R2.1

Selected stock Runtime migration. Expected Layer-3 owners:

- [composition](mechanisms/composition.md)
- [state](mechanisms/state.md)
- [context](mechanisms/context.md)
- [roles](concepts/roles.md)
- [state](concepts/state.md)

[Packet scope and dependencies](../docs/development/007-work-packets.md#r21--selected-stock-runtime-migration).

## R2.2

Typed local composition. Expected Layer-3 owners:

- [composition](mechanisms/composition.md)
- [state](mechanisms/state.md)
- [context](mechanisms/context.md)

[Packet scope and dependencies](../docs/development/007-work-packets.md#r22--typed-local-composition).

## R2.3

Public child/join and R2 gate. Expected Layer-3 owners:

- [composition](mechanisms/composition.md)
- [communication](mechanisms/communication.md)
- [integration](mechanisms/integration.md)

[Packet scope and dependencies](../docs/development/007-work-packets.md#r23--public-childjoin-and-r2-gate).

## K5.1

Bounded queues, retention and output. Expected Layer-3 owners:

- [output](mechanisms/output.md)
- [evidence](mechanisms/evidence.md)
- [resources](mechanisms/resources.md)
- [waits](mechanisms/waits.md)

[Packet scope and dependencies](../docs/development/007-work-packets.md#k51--bounded-queues-retention-and-output).

## K5.2

Operations, upgrade and deletion. Expected Layer-3 owners:

- [recovery](mechanisms/recovery.md)
- [resources](mechanisms/resources.md)
- [evidence](mechanisms/evidence.md)
- [authority](mechanisms/authority.md)

[Packet scope and dependencies](../docs/development/007-work-packets.md#k52--operations-upgrade-and-deletion).

## R1.3

Supported Driver evidence. Expected Layer-3 owners:

- [integration](mechanisms/integration.md)
- [recovery](mechanisms/recovery.md)
- [evidence](mechanisms/evidence.md)

[Packet scope and dependencies](../docs/development/007-work-packets.md#r13--supported-driver-evidence).

## K5.3

Applications and comparison preparation. Expected Layer-3 owners:

- [evidence](mechanisms/evidence.md)
- [integration](mechanisms/integration.md)
- [communication](mechanisms/communication.md)

[Packet scope and dependencies](../docs/development/007-work-packets.md#k53--applications-and-comparison-preparation).

## K5.4

K5/E5 operating and value gate. Expected Layer-3 owners:

- [evidence](mechanisms/evidence.md)
- [resources](mechanisms/resources.md)
- [operations](concepts/operations.md)

[Packet scope and dependencies](../docs/development/007-work-packets.md#k54--k5e5-operating-and-value-gate).

## D1.1

One isolation profile. Expected Layer-3 owners:

- [resources](mechanisms/resources.md)
- [operations](concepts/operations.md)
- [authority](mechanisms/authority.md)

[Packet scope and dependencies](../docs/development/007-work-packets.md#d11--one-isolation-profile).

## D1.2

D1 physical gate. Expected Layer-3 owners:

- [resources](mechanisms/resources.md)
- [evidence](mechanisms/evidence.md)

[Packet scope and dependencies](../docs/development/007-work-packets.md#d12--d1-physical-gate).

## S1.1

Packed-consumer prototype. Expected Layer-3 owners:

- [external-protocols](mechanisms/external-protocols.md)
- [integration](mechanisms/integration.md)
- [evidence](mechanisms/evidence.md)

[Packet scope and dependencies](../docs/development/007-work-packets.md#s11--packed-consumer-prototype).

## S1.2

Release candidate freeze. Expected Layer-3 owners:

- [recovery](mechanisms/recovery.md)
- [integration](mechanisms/integration.md)
- [external-protocols](mechanisms/external-protocols.md)
- [operations](concepts/operations.md)

[Packet scope and dependencies](../docs/development/007-work-packets.md#s12--release-candidate-freeze).

## S1.3

S1/E6 final acceptance. Expected Layer-3 owners:

- [evidence](mechanisms/evidence.md)
- [integration](mechanisms/integration.md)
- [recovery](mechanisms/recovery.md)

[Packet scope and dependencies](../docs/development/007-work-packets.md#s13--s1e6-final-acceptance).
