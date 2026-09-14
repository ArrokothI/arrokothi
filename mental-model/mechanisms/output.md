# Observing output and delivering it elsewhere

[Emissions, results and provisional output](../concepts/actions.md#emission-result-and-output-obligation)
answer different questions. This page owns accepted-output availability and replay.
Sending a message or publishing through an external channel is separately authorized work.

**Status:** Required Kernel contract. Introduced by K4.4; retention hardened by K5.1. This
is target specification, not shipped behavior.

## Acceptance makes output observable

Outcome acceptance commits each accepted Emission and terminal result with its stable
identity and output obligation. The retained output record itself can fulfill that
obligation; no publisher queue is mandatory. A lost notification or duplicate Outcome
cannot lose output or mint another identity.

Provisional stdout/tokens can be shown if clearly labeled unaccepted. Failed/replaced
attempt streams may be retracted or marked; do not splice them into an apparently
accepted transcript. They cannot certify consent, action success or terminal result.

## Authorized subscriptions and replay

The Kernel supplies authorized reads/resumption over retained output. The application
output layer owns connections, UI, transport and consumer cursor storage; bounded
reads plus notifications suffice. No durable per-subscriber Kernel actor, mailbox
or general pub/sub broker is required.

Stable output IDs and per-Execution replay positions survive process restart in the
persistent profile. A cursor identifies an Execution/output view and position, not
authority. Resume returns retained accepted output in order; delivery can repeat and
consumers deduplicate by output ID. Bridge replay to live observation without skipping
output accepted during reconnect. Completion exposes the result and final output
position so observers can drain unread Emissions. No cross-Execution order is promised.

Authorize initial read, reconnect and subsequent disclosure under the stated freshness
contract. An old connection/cursor cannot preserve revoked access. Filtered views and
receipt lookups must not expose hidden content. If a changed view cannot safely resume
its old cursor, explicitly rebind or refuse it.

## Bounded retention

Declare bytes/count/age limits, replay and deduplication periods, and deletion behavior.
Keep output through the promised period, including after completion. Expired replay
returns an explicit gap/expired cursor, not a deceptively empty successful stream.
Privacy deletion and access revocation may end availability and must say so.

Slow consumers use bounded buffers or disconnect with a resumable cursor/gap. They
cannot indefinitely pin records or block Runtime progress. If capacity cannot retain
newly promised output, reject/hold Outcome acceptance **before commit**, never accept
then drop it. Routing and external-delivery obligations separately pin required data.

## Observation does not send input

Reading child progress leaves the parent's mailbox, wait and progress unchanged.
If the parent Runtime must react, use an explicit message or an application output-to-input
bridge with read/disclosure **and** destination input/send authority. The bridge binds
actual producer provenance and source-output causation; it cannot impersonate the child
or manufacture settlement evidence. A durable bridge owns its cursor/routing checkpoint,
stable destination key and retention/deduplication limits. Automatic forwarding is not
part of the minimum profile.

For example, the UI can show “3 sources checked” without waking the parent. A child
asking “which region should I search?” explicitly sends a message that may wake a
matching parent wait. Child completion has its own required terminal routing contract
in [communication](communication.md#children).

## External delivery

A channel adapter owns sending accepted output to a user or external service. If
promised durable, its intent must not have a gap with the output it undertakes to send.
Admission authorizes destination/account; prepared batching/rendering has immutable
payload identity. Retry cannot rerender into a changed message or choose a new recipient.

Delivery can remain pending/unknown after `COMPLETED`. If business completion requires
a delivery receipt, the Runtime must request that Effect, observe the result and then
complete. Timeout cannot prove non-delivery; use the [action reconciliation rules](actions.md).
