# Actions, authority and observations

These canonical terms separate a request, permission to try it and evidence of what happened. [Authority](../mechanisms/authority.md) and [actions](../mechanisms/actions.md) compose them.

Follow one mediated action through its life and the terms fall into place. The Runtime proposes an **Effect** against a named **operation**; acceptance turns it into a **logical action** with an **intent**. Before anything runs, **admission** checks that request against the Execution's **authority**, current **policy** and — where the operation requires it — a human's **exact consent**. A **physical attempt** may then run, and **settlement** records what is known about it, along four dimensions that must be kept apart. Two further terms qualify the middle of that story (**exposure** and **withdrawal**), and the last section covers what is *not* an action at all: the Emissions and results a Runtime produces as output. The definitions below follow that order; the [readme example](../README.md#example-a-report-that-needs-publication) is the running case.

## Operation

A Runtime cannot ask the Kernel to do something unnamed. Before any mediated action runs, the thing it invokes must already exist as a named, versioned contract — An **operation**. Pre-declaration is what gives admission, consent, and settlement something stable to bind to: permission is checked against it, a human approval pins it, and later evidence is interpreted through it.

The contract has five parts:

1. Identity. The stable name across every revision, so `publish_report` stays `publish_report` when its schema moves from revision 2 to revision 3. Admission, approval, and evidence all point at this name plus a pinned revision.
2. Input/output schema. The shape of arguments and results: `publish_report` takes `{ reportRef }` and returns `{ publishedAt }`.
3. Supported schema features. Which parts of that shape are actually enforced: an unknown property on the argument is refused instead of silently dropped, and a missing field gets no substituted default. <!-- TODO: rewrite once K2.2 selects the validator and enforced subset -->
4. Exact input meaning. What a valid-looking argument truly asks for: `reportRef` must name the exact reviewed revision, not any string of the right shape.
5. Result-certainty behavior. What an attempt can ever prove afterward: whether "definitely failed to publish" is even reachable, or whether every failed attempt stays "unknown."

The middle two parts matter most, because they are easy to skip past. A schema check only confirms shape, so a human approving the action needs the exact meaning behind a valid shape (see [exact consent](#exact-consent)). And the certainty declaration decides afterward which of [settlement's four dimensions](#settlement-and-reconciliation) an attempt can reach: an operation with no way to query or retry safely can never move past "unknown," however the Kernel records it.

"Invocable" sets an operation apart from the nearby contracts: a [Resource](state.md#resource-binding-and-attachment) is acted on rather than called, a [Service](roles.md#service-and-interaction-template) is a private implementation behind selected operations, and a [Skill](roles.md#skill-and-package) packages instructions rather than exposing a call.

A model chooses from names it can read, but permission and evidence need names that do not drift. So an operation keeps its identity when shown under a friendlier label. A [projection](roles.md#projection-and-invocation-binding) may display `publish_report` as "Publish this week's report," but the caller still invoked the same operation. That matters because the label can change between requests, while a late reply must still resolve to the operation the caller actually saw, not to whatever the catalog offers under that label now.

Operations and Activations vary independently: one Activation can propose many operations, and many Activations can name the same operation over time.

## Effect

An **Effect** is a proposal for one Kernel-mediated action, carried in an [Outcome](core.md#outcome). Examples include invoking a service, reading governed data, requesting human input, creating a child and sending a message. Of these, invoking a service and reading governed data carry a named [Operation](#operation). The Effect proposal points to an existing Operation by Operation identity and pinned revision. The Effect arguments are validated against the operation's schema. Each Effect points to at most one operation, while many Effects over time can point to the same one. The action lifecycle resolves through both: [admission](#admission-and-physical-action-attempt) checks the pointed operation and arguments against authority and policy, [consent](#exact-consent) binds them together with the logical action ID as one immutable action, and [settlement](#settlement-and-reconciliation) records each attempt's evidence under that logical action, interpreted through the operation's certainty behavior. [Requesting human input](operations.md#message-request-and-correlation), creating a [child](operations.md#child-and-ownership) and sending a [message](operations.md#message-request-and-correlation) are proposed through their own shapes instead, pointing to no operation. An [Emission](#emission-result-and-output-obligation) is not an Effect: output is something the Runtime has produced, an Effect is something it wants done.

A **proposal key** is the Runtime's stable local name for that proposal within the Activation. Acceptance binds it to an **Effect ID** — the immutable logical request identity within the Execution, such as an Activation paired with a local key. This is not the ID of a physical send. A wait may refer to the same Outcome's proposal key.

## Logical action and intent

A **logical action** is the immutable action record created when an Effect is accepted. An **intent** is an accepted obligation to perform or route specified work later; it is not evidence that the work already ran. The gap between those two is the whole point: [accepting the Outcome](../mechanisms/execution-cycle.md#outcome-acceptance) commits the Runtime's progress and its intent in one decision, so a crash between acceptance and the first attempt leaves a recorded obligation rather than a lost request. “Action” on these pages means mediated work unless explicitly qualified as native.

## Admission and physical action attempt

An accepted intent is a request that exists. Whether it may run is decided next, and separately.

**Admission** is the ordered decision that authorizes a concrete action attempt under the Execution's [authority](#principal-and-authority), current policy, and required [consent](#exact-consent). It records that intent under current dispatch ownership. A **physical action attempt** is one invocation of that logical action through a trusted adapter. Admission can precede sending but cannot prove receipt. Its dispatch ownership/fencing is separate from the Runtime's [writer epoch](identity.md#writer-epoch): the Runtime attempt that proposed an action and the action dispatch that performs it are fenced independently. <!-- TODO: if a dispatcher is ever defined as its own concept, link "action dispatch" to it -->

## Settlement and reconciliation

After an attempt, the Kernel needs evidence of what happened. It gets that evidence in one of two ways.

**Settlement** accepts authenticated evidence for a particular action attempt and records its observation for the Runtime. **Reconciliation** queries or inspects existing external work through a trusted path to resolve uncertainty. It is not blind re-execution: when the answer to "did the publish run?" went missing, reconciliation asks the service, rather than publishing again to find out.

What settlement records has more than one axis. Keep four dimensions distinct:

| Dimension | Meaning and example |
|---|---|
| Request disposition | What may happen next: waiting for approval, denied, withdrawn, no more attempts |
| Attempt evidence / certainty | What is known externally: no attempt, may have run, observed success, definite failure, unknown |
| Result validity | Whether the returned value satisfies the result contract, even if the action ran |
| Responsibility / obligation | Who still owes settlement or required results: the Execution, a named durable owner (e.g. a child the work was transferred to), or explicit policy abandonment (e.g. a cancelled Execution whose still-unknown attempt is recorded but no longer owed) |

These are conceptual dimensions, not a mandated enum cross-product. An invalid result can coexist with proven external success. Stopping retries changes disposition, not certainty. Acknowledging an unknown observation does not remove the obligation. Collapsing any two of them loses a real fact: a single "status" field cannot say both "the service confirmed it ran" and "the value it returned is unusable", yet an application must act differently on each. [Settlement and refinement](../mechanisms/actions.md#settlement-and-refinement) gives worked cases along each axis.

## Principal and authority

Admission asked whether a request is permitted. The next three sections define what "permitted" is measured against: who is asking, what bound applies, and when a human must decide.

A **principal** is an authenticated application identity — a user, a service, or an acting-on-behalf-of identity — with tenant/application scope where applicable. An Execution is not a principal. **Authority** is the upper bound of Kernel-mediated operations/resources available to an Execution. **Policy** decides whether a concrete request is permitted now and can narrow that bound. A **grant** records authority and, when applicable, delegation constraints.

**Delegation** gives a child only what survives three simultaneous limits: what was requested for it, what the parent was allowed to pass on, and what current policy permits now. A parent that may email one address cannot give a child the power to email any address: the child gets that one address, or nothing. Being created by someone never by itself grants what the creator has. Ancestry is responsibility, not permission (see [Child and ownership](operations.md#child-and-ownership) and delegation under [current policy](../mechanisms/authority.md#check-the-concrete-request)).

## Exact consent

**Exact consent** is one human's yes to one unchangeable action. It binds the specific action (which Execution, which logical action), the exact request (validated arguments under a pinned operation version), the real-world targets (the account, resource, or content it will touch), and the approval itself (who may approve, and how long the yes lasts). Ordinary feedback or standing intent is not that decision. Approving “Plan A” need not approve its eventual recipient and payload. The [consent mechanism](../mechanisms/authority.md#exact-action-consent) owns the full binding and mutation rules.

## Exposure and mediation

**Exposure** means filtered visibility of authorized operation metadata or callable choices. It is not a grant or mandatory durable object: showing a model that `publish_report` exists does not authorize any particular publication. **Mediation** means the specific action path goes through Kernel admission and settlement. **Ambient/native action** uses powers provided directly by the Runtime's host or native system. Telemetry that observes such an action does not mediate or prevent it; only [mediation or physical isolation](operations.md#trusted-execution) can.

## Withdrawal and compensation

Two controls apply after a request exists, and they act on different things: one on the request's future, one on the world it already changed.

**Withdrawal** is an explicit control preventing future admission of a named request. A correction message alone is not withdrawal: an editor writing "actually, don't publish" is input the Runtime must interpret, whereas withdrawal is a control the application applies to the named intent. **Compensation** is a new authorized action intended to counter an earlier action; it is not rollback of external history — a retraction notice is a second publication, not the unpublishing of the first.

## Emission, result and output obligation

Not everything a Runtime produces is a request. The remaining terms name its output, which the Kernel records but does not perform.

An **Emission** is accepted nonterminal output from an Outcome. A **terminal result** is output accepted with completion. **Provisional output** is unaccepted diagnostic or streaming content, such as stdout tokens from a still-running attempt.

An **output obligation** makes accepted Emissions/results available for authorized, retention-bounded observation/replay. Older “publication intent” means this obligation, not automatic public disclosure or channel sending. External delivery is a separate application-adapter responsibility. [Output](../mechanisms/output.md) owns the exact rules.
