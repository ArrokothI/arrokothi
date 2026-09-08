# Authority and governed actions

This document expands the authority/action design under the current [`Kernel`](../kernel.md) and [`Execution`](../execution.md) architecture. It preserves useful parts of the previous authority model without making its entire vocabulary mandatory Kernel ontology.

## Kernel side

### Authority

**Authority** is the bounded set of Kernel-mediated operations/resources an Execution may request under current policy.

Execution identity is runtime identity, not automatically the application principal:

```text
execution_id
  != user
  != tenant
  != service principal
  != resource owner
```

The application authenticates principals and relationship facts. The Kernel carries those facts into policy decisions without redefining the application's identity model.

### Exposure

Exposure is filtered visibility into operations/resources the Runtime may currently use. It improves usability and context size; it does not grant permission.

The previous implementation's Catalog → Effective Authority → Active View → Model Projection pipeline is still a useful implementation pattern for ArrokothI's own Runtime, but only two semantic rules are Kernel requirements:

1. exposure cannot widen authority;
2. the concrete Effect is checked again under current policy when admitted for dispatch.

The Kernel therefore does not require a durable `ExposureView` entity.

### Concrete action contract

A mediated action is identified by a stable operation/resource identity and contract revision. The Kernel validates the actual request accepted from an Outcome, rather than trusting a provider-facing schema or tool name.

Conceptually:

```text
accepted Effect intent
  -> resolve stable operation identity/revision
  -> validate concrete payload
  -> check current authority/policy
  -> obtain exact consent if required
  -> record physical attempt
  -> dispatch through trusted adapter
  -> success | failure | unknown
  -> authenticated settlement Event
```

Validation, authorization, consent, dispatch, and settlement are separate decisions.

Unsupported schema behavior is explicit. Do not silently coerce an input or insert defaults after consent has been bound. Malformed output does not prove that a consequential action failed if it may already have occurred.

### Exact consent

Mechanical confirmation, when required, binds the exact validated action as closely as practical:

- operation identity and contract revision;
- validated payload;
- relevant resource revision when it changes the meaning of the action;
- authenticated approver;
- confirmation identity/expiry when applicable.

A changed payload or contract requires renewed consent or refusal. Consent does not grant authority, and standing authorization does not imply exact-payload approval.

### Delegation

A child Execution receives only attenuated authority:

```text
child authority
  = requested authority
  ∩ parent/delegator's delegable authority
  ∩ current application policy
```

Ownership, messaging, inspection, cancellation, resource access, and impersonation are separate permissions.

### Revocation and admission order

Authority can change while an Execution remains alive. Final admission uses current policy.

If revocation is accepted before action admission, the new action is blocked. Revocation cannot undo a request already admitted to an external system. Compensation is a new authorized action, not rollback.

A stale Activation or old tool/exposure snapshot is never a permanent grant.

### Evidence and settlement

Only trusted ingress may settle an Effect or assert another Kernel-owned observation such as a child result or consent decision. A Runtime response, model text, correlation ID, or operation ID is not settlement authority.

A timeout or lost receipt after possible external execution becomes `unknown` unless trusted external evidence proves success or failure. Retry follows the operation's idempotency/reconciliation contract, not generic Kernel optimism.

### Budgets

Authority answers **may this mediated action occur?** A budget answers **how much work may continue?**

Kernel-enforced budgets are valid only for resources/actions the Kernel can actually meter. Opaque model/provider spend belongs to the Runtime or an enforced provider boundary.

### External authentication

Remote OAuth/login/credential requirements are external prerequisites, not ArrokothI authority grants. Authentication of the ArrokothI control plane is also separate from Execution authority.

## Execution side

### Runtime tool and operation views

An Agent/Workflow Runtime may rank, filter, rename, or package already-available operations for its model or graph. If it uses aliases or provider tool names, a delayed model response should resolve through the exact invocation binding it observed before producing the stable operation identity in the Effect.

This binding snapshot is a Runtime/integration integrity mechanism. It is not a credential or new authority object.

### Local controls

A Runtime-local control that cannot cross the Execution boundary—such as changing Working Notes or planner state—does not need to become an Effect merely because a model provider represents it as a tool call.

If selecting a control can access an external resource, send a message, write governed state, create a child, or otherwise cross the managed boundary, it is no longer purely local and must use the appropriate governed path.

### Native and ambient actions

Trusted Runtimes may use ambient terminal, filesystem, network, credentials, or native framework tools supplied by the deployment. Those actions are outside Kernel mediation unless explicitly bridged through Effects.

The Runtime/Driver must therefore declare which action paths are:

- Kernel-mediated;
- native/ambient;
- unavailable under an isolated profile.

Do not describe an ambient native action as Kernel-authorized merely because the same Runtime also uses Effects for other work.

### Information is not authority

Context, retrieved documents, Derived Semantic Memory, model suggestions, manifests, Skills, and provider metadata may influence what the Runtime requests. They do not create permission.

A manifest can describe required/requested operations for composition or preflight; the application/delegator still decides what authority is granted.

## Preserve vs retire from the previous model

| Previous idea | Current treatment |
|---|---|
| Execution identity separate from application principal | Preserve |
| Authority separate from exposure | Preserve |
| Concrete reauthorization at dispatch | Preserve and strengthen |
| Exact confirmation separate from authorization | Preserve and strengthen |
| Child authority attenuation | Preserve |
| Catalog / Effective Authority / Active View / Model Projection as four mandatory layers | Optional ArrokothI implementation pattern, not Kernel ontology |
| Provider/local model controls | Runtime-local unless they cross the Execution boundary |
| Progressive discovery | Future Runtime/integration optimization; cannot create authority |
| Universal grant/token representation | Not frozen; add only when real policy/delegation workloads require it |

Current 0.8.x implementation evidence for these mechanisms is indexed in [`../development/002-implemented-kernel-baseline.md`](../development/002-implemented-kernel-baseline.md). Historical rationale remains in [`../mental-model-legacy/authority.md`](../mental-model-legacy/authority.md).
