# Checking authority and binding exact consent

[Principals, authority and consent](../concepts/actions.md#principal-and-authority) separate authenticated identity, a permission ceiling and a decision about a concrete action. This page owns their ordering; [actions](actions.md) owns attempts/results. The target does not select a universal token format, grant language or remote policy backend.

**Status:** Required Kernel contract. Introduced by K2.2; extended by K4 and K5. This is target specification, not shipped behavior.

## Establish identity at trusted ingress

The application supplies service/acting-on-behalf-of principal, tenant/application scope and relevant relationship facts. Bind create/input/inspect/cancel, callback, restore and resource access to those facts. A model-generated `user_id`, correlation or resource ID cannot authenticate a caller or authorize settlement.

Send, inspect, cancel, delegate, read, write and impersonate are separate powers. Ownership ancestry is not the application's relationship graph. Return scoped refusals without disclosing hidden object existence. Trusted settlement ingress additionally checks the adapter, provider/account and original attempt, even after cancellation.

## Check the concrete request

Authority is an upper bound; current application policy may narrow it. When grants are used, retain holder/delegator, operation/resource constraints, validity/expiry, delegability and policy provenance. Trusted records can suffice in one trust domain; signatures authenticate origin but do not prove current permission.

Delegate only the intersection of requested power, the parent's delegable bound and current policy. A parent that may email one address cannot give a child the power to email any address by asking for it: the child gets that one address, or nothing. Retain the delegating dependency through grandchildren so revocation or narrowing affects future admissions. An explicitly surviving grant can outlive parent termination; its lifetime must be declared. Child budgets do not grant permission.

Overlapping policy rules need explicit semantics: additive allows combine only under the same policy contract; attenuation constraints intersect; explicit denies cannot disappear through a union. Source order must never decide the match by accident. Unknown identities, resources/operations or unavailable required policy lead to refusal/hold, never ambient fallback. Concrete `check(request)` is fundamental; bulk enumeration is optional.

Descriptor disclosure is itself authorized before ranking or sending metadata to a model/search provider. A cached catalog or stale exposure view cannot authorize arguments. [Invocation bindings](context.md) preserve alias identity separately from this decision.

## Exact action consent

Validate and normalize before requesting approval. Bind the decision to:

- Execution/principal scope and logical action ID;
- operation identity/revision and fully validated canonical arguments;
- destination/account and resource revision or immutable content digest where meaningful;
- eligible authenticated approver, decision ID, validity and required approval policy.

Show the values that matter, drawn from that exact bound request. A publication approval should show the recipient and immutable draft, not just an Agent's reassuring summary. Large content needs an accessible preview plus immutable version/digest. A hash alone does not prove the person saw the content. The application owns the UI.

After approval, only meaning-preserving transport encoding is allowed. Changing arguments, account, resource content/version or operation revision requires new action and consent or refusal. Hidden defaults, coercions and argument-mutating hooks must not run after approval. Native output presentation cannot rewrite trusted evidence.

Approval state is separate from action disposition: an approved action can later be denied, withdrawn or expire. Refusal closes the same dependency. Duplicate approval returns its original decision; concurrent approval/withdrawal has an ordered outcome. Approvers do not use a privileged alternate dispatch path. Consent normally covers one logical action, including safe physical retries while still valid, not all future equal-looking actions. Multi-approver policy is optional, not a K2 prerequisite.

## Order revocation against admission

Record the final policy/consent decision and attempt intent atomically under current action-dispatch ownership. Revocation accepted first blocks admission; an already admitted request may still execute after revocation. Recheck at a trusted gateway where possible, but no local transaction can recall a remote action. Every additional physical attempt needs fresh admission and valid consent.

Local accepted policy facts are immediately consistent with the last accepted store write. Remote policy is not instantly fresh merely because its API looks synchronous. Use a versioned decision checked at commit, serialize changes through an admission authority, or refuse the stronger ordering claim. Do not hold a database transaction across a remote policy call. K2 declares actual remote freshness; K0/K1 promises none.

For example, a user typing "wait, not that recipient" changes nothing on its own: it is ordinary input the Runtime may not read for another second, and the send may already be admitted. A correction message does not retract an action. To promise retraction, the application must withdraw the named pending action or invalidate its consent/resource binding before admission under this ordering. After admission, report “may have acted” and use reconciliation or compensation. Revoking action permission does not erase evidence; reconciliation reads require their own service authorization.

## Content is not authority

Retrieved text, notes, inferred memory, Skill manifests and provider descriptions can influence proposals but cannot supply grants, approvals or settlement facts. Asserted state is policy evidence only under an explicit trusted policy contract. Login/OAuth can satisfy a prerequisite without widening authority. Credential refresh retains the intended account; account substitution needs a new decision.

Complete mediation claims require inspection of nested tools, fallbacks, subprocesses and shared credentials, plus [physical enforcement](resources.md#containment-claims). An LLM refusing a request and a log of a native action are not evidence of prevention.
