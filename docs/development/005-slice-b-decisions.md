# Slice B Decisions Before Workflow Stages

> **Status: accepted decisions following Slice B implementation review.**
>
> This document records decisions made after Slice B implementation and before Slice C. It supplements `002-architecture-decisions.md`, `003-implementation-audit-and-migration-plan.md`, and `004-slice-a1-review.md`. Canonical architecture and security documents remain authoritative where they already speak directly.

## Decision summary

```text
wake matching for application input
  defer exact selector shape to Slice G,
  but final interaction semantics must avoid irrelevant wakeups

Effect settlement
  trusted runtime/integration ingress,
  never controller/Stage authority,
  IDs identify records but do not authorize settlement

consequentiality
  baseline property of a capability operation,
  unknown defaults consequential,
  policy may promote but never downgrade

idempotency
  distinct from consequentiality,
  operation-specific,
  generic default none,
  identical payloads are not automatically the same logical request
```

---

## DEC-B01 — Selective application-input wake matching is deferred to Slice G

Slice B keeps the kernel Event vocabulary small. Application-originated observations currently enter as:

```text
external.input
  label = application-defined label
  payload = application-defined data
```

`WakeCondition` currently matches kernel Event kind plus correlation. It does not yet match `external.input.body.label`.

This is acceptable through Slice C/D because an irrelevant `external.input` can at worst cause a spurious Activation; it does not grant authority or incorrectly satisfy semantic work if the controller rejects the observation and waits again.

However, this is not the intended final interaction behavior.

**Accepted requirement:**

> By Slice G, an Execution must be able to wait selectively for relevant user/application input without unrelated input such as heartbeats, presence updates, or telemetry causing Activations.

The exact representation is intentionally deferred. Possible designs include a narrow `externalInputLabels` selector or dedicated user-interaction Event kinds introduced with `RequestUserInput`/interaction semantics.

Do not introduce arbitrary callback predicates or a general Event query language into `WakeCondition`. Wake selectors must remain declarative, serializable runtime data.

Correlated requested input should continue to prefer correlation IDs where possible.

---

## DEC-B02 — Effect settlement is trusted runtime/integration ingress

Effect authorization and Effect settlement are different boundaries.

Authorization answers:

```text
May this Execution perform this requested operation?
```

Settlement answers:

```text
What outcome did an already-authorized/dispatched operation produce?
```

A controller or Workflow Stage may propose an Effect but must never receive settlement authority.

```text
Agent / Workflow controller / Stage
        ↓ may propose Effect
Harness
        ↓ authorize + dispatch
CapabilityExecutor / external integration
        ↓ trusted result ingress
settle Effect
        ↓
validated/correlated Event
```

**Accepted rule:**

> `settleEffect` is trusted runtime/integration ingress. It is not an Agent/Workflow/Stage capability and must not be exposed in controller-facing APIs, Stage execution contexts, or untrusted execution environments.

`PendingOperationId`, `EffectId`, correlation IDs, Execution IDs, mailbox IDs, and similar identifiers identify records. They are not bearer authorization tokens.

```text
knowing PendingOperationId + EffectId
        !=
authority to report an outcome
```

In an embedded trusted-local deployment, the host/integration code may invoke settlement directly because the host process is already trusted.

In a hosted deployment, any HTTP callback, remote worker, queue consumer, provider webhook, or other external settlement source must be authenticated/validated by the application/integration layer before it is allowed to invoke kernel settlement.

Examples:

```text
provider webhook
  ↓ provider signature / transport validation
trusted integration adapter
  ↓
settleEffect

remote worker
  ↓ worker/service authentication
trusted worker bridge
  ↓
settleEffect
```

The kernel does not need to invent product-user authentication for this boundary. The same application/control-plane separation already established for Execution control applies here.

The canonical security guarantees should state this explicitly.

---

## DEC-B03 — Consequentiality belongs to capability-operation semantics

Consequentiality answers the question:

> If the operation was dispatched and its response is lost, could assuming failure and retrying duplicate or alter an externally meaningful effect?

Examples:

```text
weather.get
  response lost
  retry is generally safe
  → non-consequential

payment.charge
  payment may have happened but response was lost
  retry may charge twice
  → consequential

world.move(east, 5)
  movement may have happened but response was lost
  retry may move another 5
  → consequential
```

Consequentiality is therefore not merely a per-request policy opinion. It is a baseline semantic property of a capability operation.

**Accepted ownership:**

```text
Capability / Operation descriptor
    ↓ declares baseline consequentiality
runtime/application policy
    ↓ may only make handling more conservative
    ↓
effective consequentiality
```

Rules:

1. Controllers/models cannot declare an operation harmless.
2. Executors do not decide consequentiality after dispatch.
3. Unknown/unclassified capability operations default to consequential.
4. Policy may promote a normally non-consequential operation to consequential.
5. Policy must not downgrade a descriptor-declared consequential operation to non-consequential.

Conceptually:

```text
effectiveConsequential
  = descriptorConsequential OR policyForceConsequential
```

not:

```text
policy can override true → false
```

This property controls failure interpretation and retry safety. A lost result for a consequential operation is generally `unknown`, not proof of definite failure.

The current Slice-B implementation treats missing metadata conservatively as consequential, which is safe. Before real capability descriptors become a foundation for Slice C/D integrations, adjust the current authorization constraint so policy cannot downgrade consequentiality.

---

## DEC-B04 — Consequentiality and idempotency are separate properties

Identical request payloads are not automatically duplicate logical operations.

Examples:

```text
world.move(north, 5)
world.move(north, 5)
```

may intentionally mean ten total steps.

Likewise:

```text
attack(goblin)
attack(goblin)
```

or two identical outbound messages may be intentional separate actions.

Therefore:

```text
same JSON input
        !=
same logical operation
```

**Accepted rule:**

> There is no global rule that consequential operations use per-input duplicate suppression. Idempotency/replay behavior belongs to capability-operation semantics and may be strengthened by runtime/application policy. The generic default remains `none` until an operation declares or policy requires a supported strategy.

A useful idempotency mechanism identifies retries of the **same logical request**, not every later request with identical parameters.

For example:

```text
logical request R123
  world.move(east, 5)
  transport retry using R123
  → same operation, safe to replay prior outcome where supported

new logical request R124
  world.move(east, 5)
  → new intentional operation, execute again
```

The current `per_input` mode is therefore only a specific optional strategy, not the universal model.

---

## DEC-B05 — Hash equality alone cannot authoritatively suppress an Effect

The current `payloadFingerprint` uses the existing dependency-free FNV helper. It is explicitly a non-security checksum and is not adversarially collision-resistant.

That is acceptable as an indexing/candidate mechanism. It is not sufficient as sole proof that two externally meaningful requests are identical.

**Accepted rule:**

> Hash equality alone must never be sufficient to suppress an externally meaningful Effect. Authoritative duplicate recognition must verify the actual logical request, use an explicit stable idempotency identity, or use another mechanism with the guarantees required by the capability.

For the existing `per_input` implementation, a safe near-term pattern is:

```text
fingerprint
  ↓ candidate lookup
exact canonical logical-request comparison
  ↓
replay/suppress only if actually equal
```

A collision must not cause a valid distinct request to disappear.

This is separate from future cryptographic consent binding. If an adversarially secure digest is required for confirmation/security, introduce an explicitly reviewed collision-resistant mechanism rather than upgrading the meaning of the FNV helper.

---

## Required correction before Slice C

Before beginning real Workflow Stages, make the following narrow Slice-B corrections:

1. introduce or prepare capability-operation metadata ownership for consequentiality;
2. ensure policy cannot downgrade descriptor-declared consequentiality;
3. preserve conservative `true` behavior for unknown/unclassified operations;
4. make authoritative `per_input` duplicate recognition verify the actual logical request rather than relying only on FNV fingerprint equality;
5. update canonical security documentation to state the trusted settlement-ingress boundary and that identifiers are not settlement authority;
6. add conformance tests for these invariants.

Do not implement Slice G input-label wake selectors yet. Record the requirement and leave the exact representation deferred.

After this correction, Slice C may proceed.
