# Principals, authority and exact consent

**Owner:** Kernel admission and application identity/policy; Runtime exposure is linked below.
**Status:** target for K0/K2/K4/K5. [Kernel](../kernel.md) owns authority; [action lifecycle](action-lifecycle.md)
owns attempts/settlement. This page does not prescribe a grant language or policy backend.

## Principals and ownership

An Execution is a managed actor, not a user, tenant, service account or resource owner. Authenticated
application context may include service principal, acting-on-behalf-of principal, application/tenant
and relationship references. The application supplies those facts through trusted ingress, never
through an untrusted Outcome or a model-authored `user_id`. Bind every control-plane lookup, callback,
restoration and resource acquisition to that context. Correlation IDs only locate work.

| Decision | Who authenticates facts | What is checked |
|---|---|---|
| Create/input/inspect/cancel | Application control plane | Caller may operate this Execution in this scope |
| Propose/admit an Effect | Kernel plus application policy | Execution's bounded grant, concrete operation/resource/arguments, current constraints |
| Approve an exact request | Approval service/control plane | Approver eligibility and binding to this immutable action |
| Settle an attempt | Trusted adapter ingress | Source may attest this attempt/provider/account, including after cancellation |
| Read shared data/context | Owning resource service or mediated read | Current authorized fields/content and disclosure destination |

Ownership lineage is not the application's relationship graph. May message, inspect, cancel,
delegate, read, write and impersonate are independent powers. Return a scoped refusal rather than
using unauthorized object resolution as an existence oracle.

Prior art: OpenClaw [task-owner-access.ts](../../../openclaw/src/tasks/task-owner-access.ts),
`canOwnerAccessTask`, checks owner scope **and** trusted Agent identity because bare owner keys can
collide across stores. Preserve namespace and principal binding across restore; a single job ID is
insufficient.

## Authority ceiling and current policy

Authority bounds what an Execution can request; current policy may narrow it further. The bound is
not necessarily a materialized operation list. A narrow contract needs stable holder/delegator,
operation/resource constraints, validity/expiry, delegability and policy provenance when used.
Plain trusted records suffice in one trust domain; per-Execution keypairs and a universal token format
are unnecessary. Signing a grant authenticates its origin, not whether current policy accepts it.

Delegated authority is the intersection of requested power, the parent's delegable bound and current
application policy. Retain the dependency on the delegating grant: revoking or narrowing that grant
must affect future child admissions, including grandchildren. Parent termination alone need not revoke
an explicitly surviving grant; its lifetime must be declared. A child cannot turn inherited constraints
into a fresh unrestricted root grant. Separate child budgets from permission.

K2 must define overlapping-rule semantics explicitly. Additive allows may combine only within the
same policy contract; attenuation boundaries intersect, and an explicit deny cannot vanish through a
naive union. No source-order-dependent first match unless documented and tested as intended policy.
Unknown principal/resource/operation or unavailable required policy yields refusal/hold, not ambient
fallback. `check(concrete request)` is fundamental; bulk filtering/enumeration is optional optimization.

## Exposure

A Runtime may implement catalog → authorized candidates → task view → invocation projection. Keep
stable operation identities separate from model names, and filter descriptor **disclosure** before
ranking or sending metadata to a model/search provider. Concrete arguments still require admission.
Authorized metadata is not permission to invoke arbitrary arguments. Descriptors may be cached;
authorization freshness and immutable invocation bindings cannot be replaced by a cache hit.

A stale view can explain a model's request but never authorize it. Reads need their own authorization;
final action denial cannot undo data already sent to a model. Full invocation selection and alias
rules live in [context and projections](context-and-projections.md). No durable ExposureView entity
is mandatory, and local scratch controls are distinguishable from mediated actions even when both
use provider tool syntax.

## Exact consent

Consent records a human decision about an immutable request; standing intent and authentication are
separate. A decision binds:

- Execution/principal scope and logical action ID;
- operation identity/revision and fully validated canonical arguments;
- destination/account and resource revision or immutable content digest when they affect meaning;
- eligible authenticated approver, decision ID, validity window and required approval policy.

Render the decisive values from that bound request. Do not let an Agent supply a reassuring summary
that omits the recipient, changed artifact or cost while approving a different payload. Large files
need an immutable version/digest with an accessible preview; a mutable URL is insufficient. UI format
is application-owned. A hash is a comparison tool, not proof the approver saw or understood content.

Normalize and validate before approval. After approval, only meaning-preserving transport encoding
is allowed. A hook changing arguments, account, resource version or operation revision requires a
new action and consent or explicit refusal. Avoid hidden default insertion and type coercion.

Approval state and action disposition remain separate: an approved request can subsequently be denied,
withdrawn or expired. The refusal closes the same action's dependency; it must not create another
pending request. Duplicate approval returns the original decision. Concurrent approval and withdrawal
have one ordered outcome. The approver does not execute a privileged alternate path; ordinary action
admission still applies, including duplicate recognition and current authority.

Default exact consent is for one logical action, not one physical packet or all equal-looking future
actions. A safe physical retry under the same idempotency contract still rechecks current policy and
consent validity. A new intentional action needs new approval where required. Multi-approver thresholds
are an application-policy extension, not required for K2.

## Revocation and admission order

Revocation accepted before admission blocks that admission. Record the final policy/consent decision
and attempt intent under current dispatcher ownership in one ordered boundary. Do not hold a database
transaction across a remote policy call: obtain a versioned decision and validate its freshness at
commit, serialize changes through the admission authority, or refuse a stronger ordering claim.
An external policy service with asynchronous updates must declare its freshness limit. K2's first
profile can use locally ordered policy facts; “current” does not imply magical global linearizability.

An admitted request may execute after revocation if dispatch was already committed or sent. Recheck
at a trusted dispatch gateway when possible, but no local transaction recalls a remote action. Every
additional physical attempt needs fresh admission. Revocation of an action permission does not erase
settlement evidence for an earlier attempt; reconciliation reads use separately authorized service
access.

A user correction is ordinary input unless the application explicitly maps it to a control operation.
For an exact-action safety claim, correction/retraction must withdraw the named pending action or
invalidate its consent/resource revision **before admission**, under the same ordering. Do not rely
on the Runtime eventually reading the correction. After admission report “may have acted” and use
reconciliation/compensation; do not promise retraction.

## Content, credentials and trust

Retrieved text, Derived Semantic Memory, Working Notes, Skills and manifests may influence proposals;
they cannot supply grant, approval or settlement facts. Even asserted application state is evidence
only under its schema/source/policy. Remote login/OAuth completion satisfies an external prerequisite;
it does not enlarge Execution authority. Credential refresh must retain the intended principal/account;
a different account is a changed binding requiring a new policy decision.

Trusted native actions may intentionally bypass the Kernel. Never claim their authorization merely
because the Runtime also emits governed Effects. For complete mediation, inspect nested tools,
fallbacks, subprocesses and shared credentials and enforce the declared physical boundary in
[resources and isolation](resources-and-isolation.md).

## Required examples and evidence

K2 tests changed payload after approval, two concurrent approvals, same key/different payload,
revocation before admission, correction not yet processed, unknown policy, mutable approved artifact,
principal/account substitution and late settlement after cancellation. K4 adds transitive delegation
revocation and separate messaging/inspection powers. K5 adds policy/credential rotation and restore.
Use an independent dispatch sink; an LLM refusing a tool is not proof of the boundary.

CrewAI's [tool hooks](../../../crewAI/lib/crewai/src/crewai/hooks/tool_hooks.py) can mutate inputs and
shape returned text. Audit hook ordering: all semantic input mutation precedes exact admission; raw
result evidence survives presentation changes. OpenClaw's
[approval policy snapshot](../../../openclaw/src/infra/exec-approval-policy-snapshot.ts) provides a
concrete canonicalization reference. Neither mechanism alone proves the ArrokothI contract.
