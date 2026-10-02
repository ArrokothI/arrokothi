Session: Codex desktop coding agent; GPT-6 per session instructions, exact serving variant unavailable. Access: local repository/history and supplied reference checkouts; sandboxed writes and restricted network with reviewed Git escalation; no original owner–Claude conversation or independent acceptance authority.

# DRAFT joint owner decision — CORE input form

Not adopted. [Owner directions 02](../owner-decisions-02.md) section 2 a–f selects the drafting direction below. It does not amend accepted decisions, release successors, or lift the [classification hold](../invalidation-01.md) or [V-D1 hold](../../K1.2/invalidation-02.md).

## Owner-selected answer and recommendation

Recommend **canonical bytes in the Kernel core**, with a **cooperative live-object wrapper on the caller side** and a **separate transport adapter for bounded non-canonical text**. Core code never observes caller object properties. An ingress boundary establishes owned immutable byte storage before validation; a borrowed mutable buffer or arbitrary live byte-array object cannot qualify merely because its type says bytes. Strict validation checks exact canonical spelling, well-formed UTF-8/Unicode, decoded duplicate keys, canonical key order/number spelling and every semantic root limit before state change.

The wrapper obtains one coherent snapshot, meters abstract object work, refuses unsupported types rather than projecting hidden state, and emits canonical bytes. The transport adapter decodes lenient wire spelling, rejects decoded duplicate keys before erasure, and emits the same canonical bytes. Wire formatting never supplies equality or authority. Stable-realm conditions are explicit for both cooperative components and the core host. Native hostile callers require actual containment; shared-process bytes provide none.

The original A/B/F09 live-object-core recommendation is superseded as a draft. C/F02 and F10 now match this one core. The selected sequence is TOOLS-01 → K1.1-correction-03 → binding packet → coordinator refactor → K1.3, each separately owner-released. K1.4 consumes the chosen binding at its later SDK bridge gate; this draft does not release or reorder that gate implicitly.

## One matrix under every core answer

These alternatives remain available for owner comparison; only the canonical-bytes column is the selected drafting direction. Hardening can also be added to the bytes direction as defense in depth, after positive compatibility evidence.

| Dependent | Keep adversarial live objects | Cooperative live objects | Canonical bytes (selected draft) | Hardened live objects |
|---|---|---|---|---|
| A | Current coherent-Proxy/ambient integrity obligations, no containment | Capture stays in core; stable-realm promise narrowed; hostile caller isolated | Caller-side cooperative wrapper; core only validates canonical bytes | Same live-object boundary; permanently pinned eight global bindings plus frozen/audited intrinsic graph and positive compatibility; startup checks alone fail, Proxy/callback risk remains |
| B | Own-array discipline and serializer save/restore remain | Simplify traversal/window only under amended cooperative assumptions | Traversal/encoding move to wrapper; core bounded validator; internal own-data safety retained | Replace incompatible serializer window without per-call writes; durable binding pinning is required; current frozen Kernel refuses every value |
| C | Internal-slot refusal of non-Proxy brands before listing; PROXY-01 answer pending below | Same non-Proxy refusal; PROXY-01 policy still explicit under cooperative observation | Same interim fix, then wrapper owns non-Proxy refusal and chosen Proxy policy; core rejects live-object input | Same non-Proxy brand refusal and pending PROXY-01 policy; freezing does not expose hidden Proxy targets |
| D | Owned apply refactor must preserve hostile-profile evidence | Owned apply refactor preserves cooperative whole decisions | Separate behavior-preserving refactor after binding, no raw writer exports | Refactor plus hardened startup positive controls; no automatic deletion of ordinary fault evidence |
| E | Keep poison/fault corpus; TOOLS-01 consolidates runners | Poison gates retire only on accepted profile migration; fault/transition corpus stays | Hostile-only gates retire only when binding lands; analyzer after refactor with mapping | Adapt poison injection to attempted-mutation prevention AND successful Kernel operations; fault oracle retained |
| F02 | Repair current domain classifier | Repair classifier under scoped object contract | Interim brand refusal then explicit wrapper domain/core byte validation | Brand matrix remains necessary despite frozen prototypes |
| F09 | Current ambient integrity search remains | Narrow ambient guarantee to cooperative realm | No core caller-object observations; stable core/wrapper realm remains a precondition | Prevention requires durable bindings and checked frozen graph; Proxy incoherence/getters remain; no hostile CPU/capability containment |
| F10 | Decision-05 meter in core capture | Meter simplified core traversal | Meter wrapper traversal; core byte-length bound plus bounded validation; adapter separate cap | Meter object traversal still required; freezing does not bound work |
| K1.1-correction-03 | Amend scope for brand refusal plus current meter and N15 | Amend scope and cooperative claims before applying simpler meter | Interim brand refusal before listing, current traversal meter and N15; later binding moves it to wrapper | Interim metering/classification plus separate compatible hardening redesign; do not count current refusal as support |

Structural projection is not another core form. It is an independent domain-policy alternative rejected by owner direction b: unsupported brands refuse. The register retains its cost/claims/closure so that rejection is intelligible. Explicit caller conversion outside the contract remains possible.

## Open PROXY-01 answer and affected claims

Neither outcome is selected. The maintained [reviewer witness](../review-02/brand/proxy-exotic-probe.mts) shows that slot predicates are false through forwarding Proxies: two re-prototyped Map targets present `{}`, while the typed-array target presents numeric own members. [Structured clone control](../review-02/brand/structured-clone-control.mjs) avoids that ambiguity by refusing every Proxy; current decision-04 item 5 prohibits silently adopting that policy.

| Owner answer | C-brand / F02K and later wrapper closure | Claims and prospective hold release |
|---|---|---|
| Accept coherent Proxies as presented | Test descriptor/read coherence and presented bytes across all roots; Map hidden-target differences remain the same presented `{}` and replay accordingly. Require refusal before listing for non-Proxy unsupported brands. | Narrow restored O-R8-4 / V-DOMAIN and the proposed invalidation-01 release condition to non-Proxy values; retain D03/D04 coherent acceptance and V-READING. Amend K11C03 scope and BASELINE descriptions to disclose the limit. |
| Refuse forwarding Proxies | Test a separate Proxy refusal mechanism before listing; slot predicates alone are insufficient. All roots refuse with no accepted-state/receipt change; ordinary non-Proxy controls still pass. | Owner must amend decision-04 item 5 for the interim step, plus dependent D03/values V-READING and BASELINE claims. K11C03 scope and the proposed hold release include both non-Proxy brands and this refusal policy. |

Both drafts require owner adoption and independent acceptance before any hold is lifted; the existing invalidation-01 record is unchanged. The core bytes decision cannot settle wrapper Proxy policy. Register C, C-brand/F02K and the full inventory carry the same conditional consequences.

## Draft amendment and packet assignment

All assignments below are proposals for the owner's amendment/release records; no accepted file is edited here.

| Current owner/claim | Proposed amendment | Proposed packet owner and acceptance evidence |
|---|---|---|
| K1.2 decisions 03/04 item 5 and values in-process capture | Cooperative wrapper replaces unconditional coherent-Proxy/ambient guarantee; preserve ordinary single observation/snapshot and refusal | Binding packet: complete inventory dispositions, wrapper corpus, root consumers and current-private-caller migration |
| Decision-05 and 007 K1.1-correction-03 | Interim current-traversal meter and non-Proxy brand refusal, with PROXY-01 separately answered; later wrapper meter; core/transport costs separately bounded. Propose item 3 static checks as regression guards, with runtime metering as enforcement under 012 | Owner scope amendment before correction-03; correction derives abstract units and B and kills N15/stack/list/diagnostic bypasses; binding preserves meter during extraction |
| DEC-8, amendment-02, amendment-03 items 1–3, AGENTS Trusted and BASELINE | Scope hostile ambient promises to stable cooperative realms; preserve own-envelope/host lookup, ordinary state integrity and DEC-9; explicitly retire only hostile gates | Binding packet updates normative owners/code/tests/baseline together and demonstrates ordinary complete decisions |
| Amendment-03 item 4 | Null-prototype optional records, immutable plan union and sole state writer; analyzer guard retirement only with evidence mapping | Separate coordinator refactor: module-boundary bypass mutants and unchanged complete-decision corpus |
| mental-model/reference.md and rewrite-index.md binding-choice records | Update incoming navigation and in-process binding choice descriptions when the binding migrates; links do not prove semantic agreement | Binding packet checks reference.md value-binding navigation and rewrite-index.md current-binding choices against changed canonical owners |
| 007 K1.4 and supported SDK documentation | Bridge consumes selected bytes/wrapper API; supported legacy SDK currently unaffected | K1.4 with binding packet packaging decision and clean supported-consumer tests |
| 006/008/009/012 tooling/prompt consequences | TOOLS-01 generates identity facts; reviewer prompt receives dimensions/closure checklist; briefs undecided | Owner's separate process action, no process edit here |

## Open packaging choice: draftable alternatives

**Proposed preference, not owner selection:** put the cooperative wrapper in a distinct entry point/module in the Kernel package. The binding packet then owns extraction and semantic migration before K1.4; dependencies must forbid the core from importing that wrapper. Caller-side means logical direction, not necessarily another machine. Cost: package boundaries must prevent accidental object overloads and an unsafe default import. Closure: core entry exports no object-intake path and a dependency-bypass mutant fails; wrapper consumes core only.

**Alternative:** put wrapper in SDK. K1.4 would own packaging/public composition and need a separately accepted wrapper delivery coordinated with the binding packet, or private consumers would temporarily call bytes directly. Cost: the SDK currently targets legacy core, so this crosses its bridge schedule. Closure: isolated package tests prove the wrapper uses the target bytes API without rerouting existing supported SDK behavior, and the migration has no interval silently treating JSON.stringify as a domain validator. Owner must choose packaging before those packets are released; neither option prevents this audit from comparing contracts.

## Open transport cap: justified proposal, not semantic limit

Propose a default cap of **8 MiB of uncompressed UTF-8 wire text per encoded root**, configurable by the transport profile. This is a policy proposal, not a measured optimum. Eight times the semantic 1 MiB canonical cap leaves room for escaped JSON characters (up to six ASCII bytes per escaped BMP character versus one canonical ASCII byte) plus ordinary formatting. It cannot admit every spelling: whitespace and non-shortest number strings can be arbitrarily long. A transport cap rejection is transport refusal even when a different spelling of the value would be semantically valid. Root framing/envelope quotas remain transport-specific, never an aggregate semantic Outcome cap. Compressed adapters must cap expansion before retaining decoded wire text.

The core canonical root cap remains exactly 1,048,576 bytes; other limits still apply. Cap closure uses cap−1/cap/cap+1, whitespace-heavy and escaped input, decoded duplicate keys, malformed Unicode and independent sibling roots. Core strictness rejects non-canonical input; transport normalization of two legal wire spellings must yield identical core bytes/replay. Measure decoder selected operations and allocation with counters over the declared grammar; do not infer a linear parser from byte length alone. The proposal's arithmetic is reproduced by `probes/round2-checks.py`; the owner selects the actual policy value before implementation.

## Stable realms and hardening

A startup compatibility check can reject already modified required intrinsics and incompatible serializer configuration before any commit. It cannot establish permanent cooperation in a mutable realm. After hostile same-process mutation, guarantees are outside this proposed scoped contract; a detected incompatibility refuses rather than committing guessed bytes. Optional hardening must permanently pin the eight call-time bindings as non-writable/non-configurable own properties and freeze/check the exact relied-on graph before caller initialization. The Node flag leaves global bindings replaceable. Reconcile every recorded hostile label through the hardening manifest; flag-only startup checks must fail the mid-capture replacement gate. Positive Kernel controls remain mandatory. See [realm evidence](../realm-hardening.md); current Kernel fails the positive frozen control. Real containment remains deployment-owned.

## Dependency and corpus reconciliation

D/E and the F03/F11/F12/F13/F15/F16 structural recommendations are core-independent. TOOLS-01 precedes core work; the coordinator refactor remains after binding by the owner's sequence. Remote delivery transport is neither required by bytes nor released here. [Every option's recorded-family reconciliation](../closure-corpus.md) distinguishes retained cases, claim limits and successor tests. No finite probe subset can silently redefine a closure's family.

## Remaining risks and finishable release criteria

Every branch preserves semantic root/field identity, absence versus presence, exact replay, authorization separation and whole decisions unless an explicit named amendment says otherwise. A bytes input alone does not prevent poisoned internal objects, unbounded decoding, wrong plans, faulty deployment or borrowed-buffer races. Binding acceptance therefore checks ownership, strict validation, adapter/wrapper fidelity, cost bounds and whole root consumers separately. The matrix and per-option inventory close this audit's decision-support obligations; they do not certify any successor implementation.
