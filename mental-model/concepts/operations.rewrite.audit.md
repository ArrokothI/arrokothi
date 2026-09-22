# Audit report — `mental-model/concepts/operations.rewrite.md`

Target: `mental-model/concepts/operations.rewrite.md` vs `mental-model/concepts/operations.md`.
Method: established truth first from `AGENTS.md`, `mental-model/README.md`, `mental-model/reference.md`, `mental-model/sources.md`, `mental-model/rewrite-index.md`, canonical Layer-3 owners, K0.1–K1.1 evidence, ledger/baseline. Original read only as coverage cross-check. No prose rewrite. No edit to candidate.

## Findings

### F1 — Remote provider job API reclassified as Execution Host

- Candidate passage / location: `operations.rewrite.md` Execution Host, lines 48–49: “Where no host of your own fits, a remote provider's service can play the part, reached through an adapter — the work runs on someone else's machines, but it is still Runtime code running somewhere.”
- Classification: CONTRADICTED
- Why problematic: The canonical owner explicitly distinguishes the two. Original `concepts/operations.md#execution-host`: “A remote native provider may supply a job API instead of an ArrokothI-managed host.” The rewrite turns an explicitly called-out alternative (“instead of”) into a kind of host (“can play the part” of host). That collapses a distinction the architecture keeps: ArrokothI-managed host role vs native job/session retained by the native system.
- Governing evidence:
  1. Current canonical owner `mental-model/concepts/operations.md#execution-host` — “instead of an ArrokothI-managed host.”
  2. `mental-model/driver.md#the-translation-it-owns` and `mental-model/mechanisms/integration.md#select-the-smallest-useful-integration` — “Managed native job” keeps session/graph/algorithm/checkpoint meaning native; mapping is declared per-Driver, not assimilated to host.
  3. `mental-model/rewrite-index.md §1.6` — Host is a process role that runs Runtime code; it does not resolve the provider-job case into host.
- Narrowest safe correction: Restore the owner’s distinction. Say a remote provider may supply a job API *instead of* an ArrokothI-managed host, with Execution/Activation ↔ native run/session mapping declared in the Driver support record. Do not state the provider service *is* an Execution Host.
- Confidence: MEDIUM — deployment remote-host language creates nearby tension, but the Layer-3 owner sentence is explicit.

### F2 — Authentication generalized to any split

- Candidate passage / location: `operations.rewrite.md` Execution Host, line 51: “the moment they *are* apart, the connection between them has to be authenticated, so neither can be impersonated.”
- Classification: OVERSTATED
- Why problematic: The underlying requirement exists, but scoped. Deployment scopes authenticated transport, current-writer clarity and partition testing to “Remote hosts or multiple workers,” not to every two-process split on one machine. The rewrite upgrades a conditional deployment obligation into an unconditional consequence of separation.
- Governing evidence:
  1. `mental-model/deployment.md#roles-are-not-required-services` table plus “Going to remote hosts or multiple workers adds its own requirements: the connections between separate processes must be authenticated…”
  2. `mental-model/roadmap.md#k32` / `#d11` — ownership/partition/containment testing tied to specific profiles, not to colocation alone.
- Narrowest safe correction: Scope the sentence to the owner’s condition: when Kernel/Driver/Runtime run as separate services / remote hosts / multiple workers, the inter-process connections must be authenticated. Do not claim every two-process separation mandates it.
- Confidence: HIGH

### F3 — Dormant WAITING described as no claim at all

- Candidate passage / location: `operations.rewrite.md` Time tour, line 113 and §Three clocks context: “Nothing renews that lease across the dormant week: while the report sits waiting for the editor, no process is claiming it, and a stored wait needs no worker standing over it.”
- Classification: OVERSTATED
- Why problematic: The first half is supported — no per-Execution dedicated worker / continuously renewed per-Execution lease is required. The absolute second half (“no process is claiming it,” “nothing renews”) claims more. Recovery explicitly permits a substrate to lease a shard or queue instead, and leaves lease granularity/renewal as deployment choices. A shard/queue lease can exist while no per-Execution lease does.
- Governing evidence:
  1. `mental-model/mechanisms/recovery.md#decide-permission-before-replacing-work`: “A dormant `WAITING` Execution need not retain a dedicated worker or a continuously renewed per-Execution lease… A substrate may lease a shard or queue instead. Lease granularity and renewal are deployment choices…”
  2. `mental-model/roadmap.md#k32` evidence mapping: recover deadline/readiness on another worker “without requiring a dedicated surviving process or continuously renewed per-Execution lease.”
- Narrowest safe correction: Qualify to per-Execution claim: no dedicated per-Execution worker/lease need be held or renewed across the dormant wait; a deployment may still hold shard/queue-level leases per its own granularity. Delete the absolute “no process is claiming it.”
- Confidence: HIGH

### F4 — Driver trust identity presented as unassigned

- Candidate passage / location: `operations.rewrite.md` HTML comment after Trusted Execution, line 67 `OPEN(unassigned)`: “whether a Driver has a trust identity of its own. Trusted/Isolated classify an Execution's Runtime; no page classifies a Driver, and K0.1-K1.1 decide nothing about it.”
- Classification: CONTRADICTED
- Why problematic: The repository has decided the relevant part. Deployment decides modes classify only the Runtime and explicitly denies reading Driver/application powers off the modes; resources decides where Driver trust is recorded — separately in the deployment’s trusted computing base with actual holders enumerated. Claiming “no page classifies a Driver” and “K0.1-K1.1 decide nothing” understates decided architecture as open.
- Governing evidence:
  1. `mental-model/deployment.md#trust-and-containment`: “The two modes classify an Execution's Runtime, and only that. A Driver, an adapter or the application around them is not ‘running under Trusted Execution’ … name the components that actually hold each power…”
  2. `mental-model/mechanisms/resources.md#containment-claims`: “Trusted/Isolated classify Runtime reach; a Driver or privileged broker is separately included in the deployment's trusted computing base… Keep broad service credentials outside isolated Runtime code, and enumerate their actual holders…”
  3. `mental-model/mechanisms/integration.md#support-record` — Actions row: “actual credential holders.”
  4. `mental-model/rewrite-index.md §4` undecided list does not list Driver trust identity as open; the open item it does list is Driver-to-Execution cardinality.
- Narrowest safe correction: Delete the OPEN marker or replace with decided rule: modes never classify a Driver; Driver/adapter powers are enumerated in the support record and TCB, per resources/deployment. If a new Driver trust vocabulary is wanted, raise it as a new decision; do not describe current state as unassigned.
- Confidence: MEDIUM

### F5 — Child excluded as detachment recipient

- Candidate passage / location: `operations.rewrite.md` Child and ownership, line 151: “The child is not that owner — the child is the work, not the party answering for it.”
- Classification: UNDECIDED PRESENTED AS DECIDED
- Why problematic: The requirement for a named durable owner that has accepted responsibility, and that the minimum profile may refuse arbitrary detachment, is established. The additional exclusion — a child can never be that owner — is not. No owner states it. Future work explicitly leaves responsibility-transfer mechanics open.
- Governing evidence:
  1. `mental-model/mechanisms/communication.md#children`: “Transfer/detachment requires a named durable owner accepting responsibility; the minimum profile may refuse it.”
  2. `mental-model/mechanisms/lifecycle.md#completion-is-an-accounting-check`: “…unless responsibility was explicitly transferred or abandoned under policy. … Arbitrary detachment may be refused until a durable recipient … is defined.”
  3. `docs/future-plan.md#q3-are-richer-supervision-waits-or-detached-services-necessary` open question on narrow atomic lifecycle mechanisms for responsibility transfer/abandonment; `mental-model/roadmap.md#k41` — “Richer supervision or general transfer mechanisms need a separately scoped decision.”
  4. `docs/development/work/K0.1/protocol-worksheet.md §14` — Q3 “not answered here.”
- Narrowest safe correction: Retain “needs a named durable owner that has accepted it; minimum profile may refuse arbitrary detachment.” Delete the sentence excluding the child. If exclusion is intended, it needs an owner decision, not concept prose.
- Confidence: MEDIUM

### F6 — Peer request expiry / wait independence stated bidirectionally

- Candidate passage / location: `operations.rewrite.md` Message, request and correlation, line 167: “A wait timing out does not close the request, and the request expiring does not by itself end a wait.”
- Classification: OVERSTATED
- Why problematic: One direction is established for human requests; the converse for peer request/reply records is only established as “distinct,” not as the stated causal independence. Roadmap and communication require expiry and wait-timeout be tested separately and not conflated, but do not fix that peer-request expiry can never end a wait by itself. Human-request mechanics show expiry closes the request and yields an observation that may then wake a correlated wait — expiry alone vs observation-mediated wake matters, and the rewrite’s flat bidirectional sentence hides that bridge.
- Governing evidence:
  1. `mental-model/mechanisms/communication.md#human-input-requests`: “Request expiry closes that request and yields an observation. Wait timeout alone does not close it.”
  2. `mental-model/roadmap.md#k42` and `#k43`: “request expiry remains distinct from wait timeout”; “Test request expiry separately from wait timeout and cancellation.”
  3. `mental-model/mechanisms/communication.md#addressed-messages-and-replies` — owns what makes a particular reply valid; no bidirectional no-effect rule for peer expiry vs wait.
- Narrowest safe correction: Keep the established human-request direction with citation. For peer request/reply, say only what is decided: request expiry and wait timeout are distinct and tested separately; expiry is not proof the peer did no work. Defer the exact expiry→wait interaction to `addressed-messages-and-replies` / `human-input-requests`.
- Confidence: MEDIUM

### F7 — Loss attribution trichotomy

- Candidate passage / location: `operations.rewrite.md` Operating profile and durability, lines 93–94: “With one, a lost Execution is attributable: the profile said this would happen and it did, or the storage broke a guarantee it gave, or a Kernel, Driver or deployment defect broke an assumption…”
- Classification: OVERSTATED
- Why problematic: Profiles stating tested storage/versions/failure assumptions/recovery/limits/retention, and attribution distinguishing Kernel/Agent/Workflow/Driver/isolation/lab/provider/evaluator, are established. The specific three-way blame partition is not. No owner defines that exhaustive trichotomy, nor that possessing a profile by itself makes those three distinguishable.
- Governing evidence:
  1. `mental-model/deployment.md#what-a-supported-profile-publishes` + `mental-model/concepts/operations.md#operating-profile-and-durability` — profile states versions/storage/failure assumptions/recovery/limits/retention.
  2. `mental-model/mechanisms/evidence.md#attribution-and-gates` — “Distinguish Kernel, Agent Runtime, Workflow Runtime, Driver, application, isolation, laboratory, provider and evaluator.”
- Narrowest safe correction: Say a published profile states what was claimed so a later loss can be compared against it, with attribution owned by `evidence.md#attribution-and-gates`. Delete the exhaustive three-alternative rule.
- Confidence: MEDIUM

### F8 — Execution-Host separation guarantees overstated

- Candidate passages / locations:
  - Line 51: “two processes on one machine share that machine's memory, so the separation is real when the host imposes a limit per process, and decorative when it does not.”
  - Line 55: “It makes nothing durable and nothing idempotent; it only moves where a failure lands.”
  - Line 51: “A storage outage does the reverse: Kernel transitions stop while native jobs carry on running, unaware.”
- Classification: OVERSTATED (first two) + AMBIGUOUS AGAINST EXISTING VOCABULARY (first phrase’s “host”)
- Why problematic:
  - Deployment’s condition is wider and conditional: two processes on one machine share memory, disk and network; failures come apart only with different hosts or per-process limits the host imposes. The rewrite narrows to memory only, drops disk/network/different-hosts, and leaves “the host” ambiguous between Execution Host (process role running Runtime code) and machine/host imposing limits.
  - “Makes nothing durable and nothing idempotent” claims more than “moves where a failure lands; does not by itself give separate fates.” No owner states a splitting↔idempotency theorem. Durability belongs to storage profile per dangerous-inference #4; idempotency to provider-enforced action rules.
  - Native jobs “carry on running, unaware” after a storage outage is absolute. Independent-failure ownership says either side can outlive the other and both must be tested; it does not guarantee native work is unaffected by a storage outage.
- Governing evidence:
  1. `mental-model/deployment.md#independent-failures-and-resource-costs`: “Two processes on one machine still share that machine's memory, its disk and its network… Failures come apart only where something actually enforces the boundary: different hosts, or limits the host imposes per process.”
  2. `mental-model/kernel.md#why-acceptance-matters` + `mental-model/README.md#what-this-arrangement-guarantees` + `rewrite-index.md §5.4` — atomicity stores nothing; survival is storage-profile decision.
  3. `mental-model/mechanisms/actions.md#retrying-an-action` — provider-enforced idempotency vs Kernel key; splitting is not in that owner.
  4. `mental-model/mechanisms/recovery.md` + `deployment.md` — “A Runtime can outlive a coordinator, and a coordinator can outlive a Runtime. Test both.”
- Narrowest safe correction: Restore deployment wording (memory/disk/network; different hosts or per-process limits; moves where failure lands without by itself conferring durability or separate fates). Qualify storage-outage sentence as “may” with enforcement condition. Disambiguate “machine host imposing limits” from “Execution Host.”
- Confidence: MEDIUM (HIGH that deployment wording is narrower than rewrite; MEDIUM that idempotency/unaware absolutes exceed sources)

### F9 — Concrete substrate example sounds selective

- Candidate passage / location: `operations.rewrite.md` first example, line 21: “a pool of Kernel Workers backed by Postgres”
- Classification: EXAMPLE LEAKAGE
- Why problematic: The deployment owner says “backed by a real database,” deliberately leaving substrate to K3. Sources leave storage schema/substrate unselected; Temporal/Restate are references, not selected dependencies. Naming Postgres in a Layer-3 concept example risks reading a K3-unselected choice as the durable substrate. The surrounding tour otherwise correctly stresses that protocol holds still while promises vary.
- Governing evidence:
  1. `mental-model/deployment.md#roles-are-not-required-services` — “backed by a real database.”
  2. `mental-model/sources.md#intentionally-unselected-choices` — storage schema remains implementation-owned; K3 selects persistent substrate.
  3. `mental-model/rewrite-index.md §4` — persistent substrate selection is K3; references are not dependencies.
- Narrowest safe correction: Replace “Postgres” with owner’s “a real database,” or add an explicit non-normative flag that the store is illustrative and K3-unselected.
- Confidence: LOW — illustrative examples are permitted; risk is misreading, not direct contradiction. Fix is one word.

### F10 — Mediated-Effect nature of child/message/human-request omitted

- Candidate passages / locations: `operations.rewrite.md` §§ Child and ownership (line 139), Message/request/correlation (lines 159–165), Human input request (line 171). None states that child creation, peer-message send and human-input request are mediated Effects / child-message operations with Kernel receipts and routing obligations.
- Classification: MISSING REQUIRED SEMANTIC CONTENT
- Why problematic: The original concept page carried the mediation hook (“created through an owning Execution's mediated request”; “addressed input routed by a mediated Effect”). The concept actions page and communication mechanism depend on it: those three families use their own shapes pointing at no Operation, but they are still Effects; six receipt scopes include child/message operation; send success is destination-mailbox acceptance via durable routing obligation. Without one sentence, this page lets a reader treat Kernel children/messages/human requests as direct native calls, breaking required-work accounting, send-success and reply-validity reasoning that this page introduces.
- Governing evidence:
  1. `mental-model/concepts/operations.md#child-and-ownership` / `#message-request-and-correlation` (original) — mediated request / mediated Effect.
  2. `mental-model/concepts/actions.md#effect` — requesting human input, creating a child and sending a message use own shapes, point at no Operation; owned by communication.
  3. `mental-model/mechanisms/communication.md#children`, `#addressed-messages-and-replies`, `#human-input-requests` — child creation / message send / human request are Effects with routing/request-record semantics.
  4. `mental-model/concepts/identity.md#acceptance-boundary-and-receipt` — six receipt scopes including child/message operation.
- Narrowest safe correction: Add the minimal delegation sentences the original had, without duplicating mechanism: child creation and message/human-request send are mediated Effects / child-message operations owned by `communication.md`; send success and reply validity per those owners. No grammar, no receipt serialization, no new API.
- Confidence: MEDIUM

### F11 — “Same Definition” collapses object and revision

- Candidate passage / location: `operations.rewrite.md` first example, line 24: “running the same Definition.”
- Classification: AMBIGUOUS AGAINST EXISTING VOCABULARY
- Why problematic: Definition vs Definition revision are distinct with different creators/change points; there is no global “the revision.” Two deployments may run the same program at different pinned revisions with different compatibility. “Same Definition” without “revision” can reasonably be read as either.
- Governing evidence:
  1. `mental-model/concepts/core.md#definition` — Kernel holds only the pinned revision, does not interpret code.
  2. `mental-model/concepts/identity.md#revision` — seven revision kinds, no global revision; Definition/Runtime-contract revision is its own kind.
  3. `mental-model/rewrite-index.md §5.6` — object vs revision confusion.
- Narrowest safe correction: Say “same Definition program/revision” or “same pinned Definition revision” where sameness matters, or explicitly mark as illustrative sameness.
- Confidence: LOW — tour language, not a normative rule; fix is qualifying words.

## Required corrections

Before adoption, fix F1, F2, F3, F4, F7, F8, F10, and qualify F6 and F11. F9 should be fixed as a one-word example hygiene change. F5 must not ship in current form; either delete the child-exclusion sentence or obtain an owner decision (see below).

## Questions requiring owner judgment

1. Detachment recipient (F5): May a child Execution ever be the named durable owner for detachment, or must it always be an application service / operator queue / other durable party? What, if anything, may be detached to what, and where is that stated — `operations.md` or `communication.md#finite-expansion-and-supervision`? Repository currently fixes only “named durable owner acceptance” plus minimum-profile refusal.
2. Peer request expiry → wait interaction (F6 converse): Does peer `request/reply record` expiry by itself end a correlated wait, or only via the observation it yields? Is the human-request rule (“expiry closes request and yields observation; wait timeout alone does not close request”) portable to peer replies, or do `addressed-messages-and-replies` and `human-input-requests` need separate rules? Roadmap K4.2/K4.3 require distinctness but do not settle causation.
3. Driver trust vocabulary (F4): Is “Driver in TCB plus actual-holders enumeration” the complete answer, with no further Driver trust mode, or is a new Driver trust classification wanted? If complete, confirm no OPEN marker is needed on this page.
4. Supervision-OPEN placement (minor): If Q3 is answered later, should the outcome be stated in `communication.md#finite-expansion-and-supervision` (mechanism owner) rather than “here” in `operations.md`? Current marker says “state the outcome here,” which misplaces ownership.

## Original-content coverage

- Preserved: Kernel Worker / Execution Host roles and colocation; Trusted vs Isolated with mediation-independence both directions, tested-threat-model burden, tool-vs-Runtime scope, telemetry-is-neither; operating/support profile contents, durable as specified-facts/specified-failures/promised-period, first persistent profile as process-failure-with-surviving-storage only with disk/region/tenant and native-work exclusions, retention with explicit edge behavior; three clocks’ identities, expiry consequences, no-shared-field rule, implementation-owned units/precision/renewal, and the three non-inferences (lease≠death, wait-deadline≠action-failure, Execution-deadline=cancellation without timeout Event); child/ownership/call-vs-spawn/supervision/no-cascade with required-work accounting and transfer/abandonment; message destination-mailbox acceptance, request/reply record with responder authentication and guessed-ID refusal, correlation-is-not-permission, human-request durable single-resume-owner with form-as-view and closure-refuses-second-answer; observation-does-not-send-input with bridge dual-permission, cursor-as-position-not-authority with fresh authorization and explicit expired-cursor gap, routing-obligation as source-side duty vs destination acceptance with no-reexecution on retry; backpressure bounded-buffer/disconnect plus refuse/hold-before-commit, cleanup debt with owner/cost and terminal-state-does-not-imply-cleanup plus logical/native/physical separation and release≠destruction.
- Intentionally unnecessary (correctly omitted or compressed): original’s directory-navigation sentence delegating Deployment/communication/output/resources mechanics — rewrite replaces with precise per-section owner links, which is equivalent delegation; original’s most compressed table phrasing — expanded without changing semantics except where flagged above.
- Moved/delegated appropriately: wait selector grammar, batch-selection algorithm, supervision policy table and spawn credits, containment test catalogue, admission/settlement dimensions, evidence attribution depth, Driver support-record dimensions — all left to `waits.md`, `lifecycle.md`, `recovery.md`, `communication.md`, `output.md`, `resources.md`, `authority.md`, `actions.md`, `evidence.md`, `integration.md` via links.
- Genuinely missing: F10 only — the one-sentence mediated-Effect hook for child creation / message send / human-input request. No other original semantic content is genuinely missing; remaining deltas are expansions that are either supported or flagged above as overstatements.

## Overall result

CORRECTIONS REQUIRED
