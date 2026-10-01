# DESIGN-AUDIT-01 register

**Owner decisions pending.** Recommendations below are drafts. Only [invalidation-01](invalidation-01.md) is adopted: its narrow classification hold remains operative; the existing [V-D1 hold](../K1.2/invalidation-02.md) remains. No successor is released. The audit base is `66bc041175e6fc191c2e7cf88de198111e7d97c9`; closed records use the archive specified in the brief.

[DA-1 table](da-1-table.md), [classification method](enumeration-notes.md), [line/timing measurements](measurements.md), [current R8 results and option effects](review08-results.md), [evidence catalog](evidence-inventory.md), and [verdict reversals/checklist](verdict-flips.md) are integral evidence. Family membership and counts are generated, not estimates. A root option changes a claim only after an owner decision and an independently accepted corrective packet. Costs below name work and dependencies; they are not invented delivery-time estimates.

Draft decisions for the starting items: [A](decision-drafts/A.md), [B](decision-drafts/B.md), [C](decision-drafts/C.md), [D](decision-drafts/D.md), [E](decision-drafts/E.md), [F](decision-drafts/F.md). Family drafts are linked from their entries.

## A — Same-process threat model (brief a; F09, F10, F13, F15, F16)

**Root choice.** The binding accepts live JavaScript objects and coherent Proxies, then tries to protect Kernel-owned state and canonical bytes from effects of observing them. This is mediation inside a shared realm. [AGENTS Trusted/Isolated distinction](../../../../AGENTS.md) permits ambient capabilities for Trusted Execution and requires physical containment for Isolated Execution; [values](../../../../mental-model/concepts/values.md#what-these-rules-do-not-cover) explicitly says these rules do not contain same-process code. Keeping bounded integrity defenses is compatible with that distinction; describing them as containment is not. Bytes passed by hostile code in the same realm do not themselves isolate it either: the worker/process boundary must actually remove shared mutable intrinsics and ambient powers.

`values.ts` capture/serialization, `own-array.ts`, `envelope.ts` host lookup, and coordinator owned writes are the mechanism. DEC-8 makes absence an owned-state requirement across the zone; DEC-9 prebuilds retained records and answers before mutation. The analyzer, inventory and sweeps are costs of maintaining these rules, not independent security boundaries. Reviews repaired one ambient hop or syntax form at a time because the searchable input language includes arbitrary object graphs and code effects, while each oracle covered only a finite set of access forms or schedules.

The census distinguishes dedicated hostile-only spans from shared useful code. [measurements.json](measurements.json) records an attributable floor of 432 production lines and 3,596 test lines in explicitly identified exclusive spans, plus 5,696 lines of mixed DEC-8/9 infrastructure. These are physical lines, including comments/setup, not estimates of removable code. The complete source/test file census and mixed spans prevent claiming that all capture, atomicity or sweep code exists only for hostility. The manually attributed hostile test spans in otherwise mixed suites are listed in hostile-test-spans.json. Shared captured operations are not represented as an exact deletion total. The finding manifest identifies 11 primary hostile-motivated findings and 16 non-alias labels including self-findings; counts and exact IDs are emitted by `measure.py`. The K1.1 subset includes R2-VAL-02, R5-STATE-01/VAL-03, R6-STATE-02/VAL-04, R7-STATE-03, R16-VAL-01/DISP-01. Plain own `__proto__` preservation, immutable snapshots, normal reentrancy and finite diagnostics remain useful under every option.

| Option | Benefit and cost | Claims and rules affected | Finishable follow-up |
|---|---|---|---|
| Keep adversarial object intake | Preserve coherent-Proxy and current API semantics; retain serializer repairs, owned-list discipline, host-member hardening and profile-specific sweeps. Expensive ongoing corpus growth and interpreter-like analysis; still no preemption or containment. | Retain single observation, refusal classification, DEC-8 and prebuilt DEC-9. Decision-05 meter remains appropriate for Kernel-chosen work; maintain explicit live-Proxy/own-key exclusions. | Derive units and budget from every valid shape; close helper escape paths structurally; kill each meter bypass mutant; finite declared poison/fault corpus with complete-decision oracle. No universal wall-clock or hostile-code safety criterion. |
| **Recommend cooperative object binding as the convenience API, paired with an isolated bytes boundary for hostile callers** | Preserve accident defense: getters not executed for value capture, mutation after submission cannot alter retained content, cycles/undefined/malformed values refuse. Remove promises about active realm poisoning only through amendment. Costs: specify cooperation, move hostile examples to an optional profile and simplify source without weakening ordinary state invariants. | Owner must amend coherent-Proxy/ambient guarantees and DEC-8's zone-wide promise. Retain own-envelope reads and trusted-host policy lookup, single captured snapshot, exact bytes, own data, DEC-9 prebuild/atomicity. Simplify poison sweeps/analyzer; retain transition/fault oracles where their fault claim is retained. Trusted mode remains ambient; hostile workloads require actual isolation. | Declare allowed caller observations and stable-realm assumptions; all ordinary domain/limit/replay/authority/history corpus passes; hostile profile marked unsupported, never silently claimed; no caller callbacks in apply; explicit migration inventory and independently checked profile boundaries. |
| Bytes/text at the Kernel boundary | The Kernel processes inert owned input instead of live object behavior. Removes Proxy/prototype classification and serializer-window concerns from intake. Costs a parser/codec contract, transport limits, duplicate-key and Unicode policy, error locations, wrapper ownership and internal API/test migration. | Changes binding representation; preserve logical boundary values and canonical equality unless owner explicitly changes them. Object wrapper carries any retained capture semantics. No supported SDK consumer uses the target yet (BASELINE and compatibility search), so now avoids a demonstrated supported SDK migration, but not internal work. DEC-8 can narrow to adapters/owned records; DEC-9 remains ordinary atomicity. | Accept primitive text or a copied immutable byte view before parsing; bound parsing/allocation and root framing; canonical round trips and malformed input corpus; no borrowed mutable buffer; wrapper and isolated transport tested separately; explicit policy for noncanonical input and duplicate keys. |

**V-D1 under each option.** Keep: one root meter is the selected mechanism; charge stack scans, diagnostic accounting and returned key-list lengths, not only accepted bytes. Cooperative: a meter remains useful for huge accidental graphs, aliases and depth; simplifying to an iterative bounded traversal can make its unit table much smaller, but removing the adversarial promise does not bound ordinary work automatically. Bytes: a parser advancing monotonically over owned input can derive work/storage from bytes/tokens and fixed depth, so a separate object-operation meter may be redundant. It is not automatically free: whitespace, escapes, duplicate keys, parsing before canonical-size refusal and canonical key sorting must be accounted for. Requiring canonical bytes or imposing a wire-size cap can change accepted wire representations; owner approval is required. Decision-05 stays in force until amended; this audit does not substitute a new validity limit.

## B — Own-array and serializer environment (brief b; F09, F10)

The capture stack's `isOpen`/`closeContainer` in `values.ts:492–521` scans depth using descriptor-based `readAt`; the serializer window at `values.ts:1334–1409` saves, resets and restores intrinsics/prototype shape on each successful encode. The direct root cause of the held depth case is repeated uncharged work on refused containers, not just a slow primitive. A direct index read would reduce overhead without proving a bound. A constant-time active-path membership structure could remove repeated scans, but its construction/access must satisfy the chosen profile and meter.

The [controlled ablation](probes/mechanism-cost.json) executes the same small cooperative value with the serializer window removed, internal reads simplified, or both, only in disposable copies. Every result is checked for equality. Sequential runs show the window dominates this sample; this does not measure a general speedup, safety or accepted-domain equivalence. The [line manifest](measurements.json) counts the whole modules and explicit spans. The serializer dependency remains approved unmodified `canonicalize@3.0.0`; no dependency replacement was tested or authorized here.

| Option | Benefit and cost | Claims affected | Finishable follow-up |
|---|---|---|---|
| Keep current discipline | Preserves the current hostile profile; carries global save/restore and descriptor work and its review burden. | Existing coherent observation and canonical snapshot invariants; V-D1 hold still needs closure. | Meter all value-dependent operations; bound active-path work; mutation-test iterator.next, descriptor conversion, index shadows and restoration failures; exact same accepted canonical bytes. |
| **Recommend simplify internal traversal under A's cooperative profile** | Use owned dense arrays and an explicit stack/membership mechanism; retain safe arbitrary object-key writes and immutable snapshots. Reduce global environment mutation. Cost is an owner-approved promise change plus broad differential corpus validation. | Removes active realm-poisoning guarantee, not ordinary getters/cycles/aliases/undefined rejection or own `__proto__` fidelity. | Compare accepted values, bytes and diagnostic weights over maintained/generated ordinary corpus; prove progress/budget; retained views stay unchanged after caller mutation; no dependency hook observes caller objects. |
| Move encoding/capture behind bytes adapter | Kernel sees only decoded owned records; serializer executes in a stable isolated realm if needed. Cost belongs to the binding/parser change and adapter maintenance. | Binding capture observations become adapter claims; Kernel equality remains canonical. | Exact wrapper-to-bytes-to-Kernel round trips, bounded parser, malformed framing and mutable-buffer controls; no implicit silent object coercion. |

## C — O-R8-4 exotic classification (brief c; F02; full held item)

**Current evidence.** Original [review-08 reproduction](probes/reverify-exotics.txt) accepts re-prototyped Map, Set, Date and ArrayBuffer as empty objects and typed arrays as numeric-key objects. `captureObject` checks a permitted prototype before own-member capture, so hidden built-in state disappears. The snapshot serializer is faithful to the wrong projection. [Consumer probe](probes/exotic-consumers.mts) records full answers/replays/views in [JSON](probes/exotic-consumers.json): creation authority context and initial input, later ingress, and Outcome progress/Emission/result/error all accept the projected Map; changing hidden contents replays. This establishes no grant bypass. Identity primitive-text gates and recovery string-list schemas are separately traced in the notice and do not accept these object projections as identities/lists.

No explicit re-prototyped-built-in refusal sentence was found in BASELINE or guides; [claim search](probes/claim-search.txt) identifies `values.md:96,273` as the explicit domain claims. BASELINE:36's generic preservation claim depends on that domain and must be treated subject to the notice. None was edited. The reference links, same canonical API and downstream identity comparisons are affected even if current tests were green.

| Option | Benefit and cost | Affected claims | Finishable closure / packet ownership |
|---|---|---|---|
| Keep implementation with claim hold | Avoids immediate code churn while owner selects a binding; silent projection remains. It is a deferral, not a completed repair. | Keep invalidation-01 visible; cannot claim built-in refusal. | A finishable triage decision names responsible packet, held surfaces and release prerequisite; it cannot discharge the classification hold. |
| Brand-check refusal | Reject supported intrinsic built-in brands before own-key enumeration; preserves intended refusal for the demonstrated family and can avoid its expensive enumeration. Cost: audited brand predicates, cross-realm/wrapper cases and interaction with coherent Proxies. Prototype names and toString tags are insufficient; avoid invoking caller code just to classify. | Preserves listed unsupported forms, but a rule rejecting every Proxy or foreign-realm plain object would be a separate semantic change. No finite intrinsic list proves classification of every conceivable host exotic. | Define a finite supported runtime brand matrix and explicit residual policy; test unchanged/replaced/null prototypes, cross-realm instances, proxies and spoofed tags; assert refusals and no downstream commit/replay collapse on every root consumer. **If A keeps objects and scope remains the listed brands, amend K1.1-correction-03**, sharing classifier ordering/meter design. |
| Structural projection | Makes the present structural behavior explicit: a permitted own-data projection is the value; hidden slots are intentionally outside it. Simpler classifier and coherent structural proxies, but surprising data loss and changed equality unless caller explicitly opts into projection. | Explicit owner semantic change to values.md unsupported-form/refuse-not-coerce rules, accepted domain, replay identity and guides; may leave O-R8-3 enumeration cost intact. Not an implementation-only fix. | Specify projection independently of JS inheritance, examples for each brand and no implicit hidden-state preservation claim; compare bytes/equality and consumer replay semantics against that spec. **Separate semantic binding packet**, not silently folded into the meter correction. |
| **Recommend bytes/text core plus explicit cooperative wrapper refusal** | Removes hidden-slot ambiguity from the core and makes conversion someone's explicit responsibility. Wrapper should reject unsupported brands by default, offering explicit user conversion only outside the Kernel contract. Cost: A's parser/adapter work and internal migration. | Change core binding/capture API; preserve value-domain intent in wrapper; neither `JSON.stringify(Map)` nor blind object coercion is acceptable migration. | Root-by-root conversion/refusal corpus, explicit duplicate-key/Unicode/framing policy, bounded parse and canonical equality; original exotic cases fail at wrapper and cannot enter core as live objects. **Separate binding packet**, coordinated with an amended K1.1-correction-03; owner decides whether meter correction waits or targets the wrapper. |

Brand refusal is the smaller fallback if the owner keeps object intake. Recommended ownership for the larger root redesign is a separate packet because API/parser semantics exceed the existing meter obligation. This recommendation releases neither packet.

## D — Coordinator responsibilities (brief d; F03, F11, F12, F13, F15, F16)

`coordinator.ts` has 2,471 physical lines at B ([census](measurements.json)). Size alone is not the defect: construction, capability checks, retained evidence and mutation are interleaved across public methods. The [responsibility map](coordinator-map.md) traces authority/grant, history, read and commit findings to the actual code and canonical owners. A module split that leaves the same cross-calls and mutable record access would preserve the families.

| Option | Benefit and cost | Claims affected | Finishable follow-up |
|---|---|---|---|
| Keep class, strengthen declared invariants | Lowest relocation cost; preserve current single synchronous decision path. Require per-method complete-decision tests and inventories; every new control still repeats ordering/evidence obligations. | No semantic change. DEC-8/9 and submission ordering remain binding-specific requirements. | Enumerate decision branches and permitted whole effects for each existing method; distinguishing mutants for auth/content/replay/stale ordering, history and positions; source changes update inventories. |
| **Recommend pure planning plus owned apply and projection boundaries** | Captured request → authority/identity decision → immutable planned change → narrow state owner applies → projection/delivery. Separate capability lifetime, evidence/history and inspection builders. Costs type/API refactor and differential corpus, with reentrancy checkpoints preserved. Prevents some mistakes by denying planners/projections write access and denying apply caller references. | Preserve existing operation/refusal precedence, attempt grant lifetime, exact receipt/replay identity and no-caller-code commit window. Does not decide waits, Effects, persistence or K1.3 semantics. | Module dependency check denies raw mutable state outside owner; plans contain only owned data; one apply path updates all coupled fields and appends; all existing complete-decision scenarios unchanged; callback reentrancy rechecks state; deliberate bypass mutants fail. |

Structural guarantees possible: authority decisions cannot be synthesized from visibility alone; history variants own their required fields; all coupled retained facts enter one plan; inspection has no state writer. Remaining obligations: the authority policy and plan contents can still be wrong, allocations can fail, delivery occurs after commit, and isolation is absent. Types plus module ownership reduce the search surface; they do not prove all outcomes. Recommend a dedicated behavior-preserving refactor before adding further coordinator responsibilities, only if the owner releases it after choosing A. Do not block unrelated work by inventing a universal “clean architecture” prerequisite.

## E — Evidence infrastructure (brief e; F05, F06, F14, F15, F16)

[Catalog](evidence-inventory.md) inventories every checked-in executable artifact and executable Markdown fence in the requested packet records, including K1.1 corrections/reference, and indexes their supporting test/gate snapshots. [Prose locators](evidence-mentions.json) preserve probe/mutant/oracle references without standalone source. Some records disclose a test but not runnable source; that is historical evidence to extract, not an invented script. The catalog assigns TOOLS-01, existing-suite or retired-runner disposition per row. Identical hashes and same test snapshots should be consolidated, not counted as new evidence.

The zone analyzer protects a restricted syntax/effect inventory and catches regressions. Known type-assertion/default/shadowed-name gaps remain; its current documentation already denies completeness. The zone inventory gives reasoned access/call/write ownership. Poison sweeps observe accessor-reaching reads on their enumerated prototypes and reached paths; they do not detect all `in` checks or all prototypes. Fault sweeps intercept selected built-in calls in specified scenarios, with known allocation/property/safety-callback exclusions. The complete-decision oracle compares returns, whole views, positions and grant behavior and needs its own negative controls. None proves universal containment or arbitrary-fault atomicity.

| Option | Benefit and cost | Claims affected | Finishable follow-up |
|---|---|---|---|
| Keep packet-local runners | Preserves exact historical reproduction; cheap initially but duplicates pin logic, fixtures and partial oracles. | Claims remain pinned to the source, candidate and observation scope of each runner. | Every runner records input/source identity, attributable failure, whole expected result and exclusions; no stale runner certifies a new candidate. |
| **Recommend TOOLS-01 corpus and mutation registry** | One maintained case identity links original record, current fixture, profile, mutant site, expected kill and independent oracle. Preserve historical bytes. Costs extraction, deduplication and registry maintenance; not a new all-purpose analyzer. | No behavior change; evidence claims become explicit profile/scenario claims. Keep current suite ownership where already covered; retire only duplicate execution plumbing. | Every catalog row resolves to maintained case/registry ID, existing suite or explicit retired artifact; every live mutant has control + causal kill/survival; every oracle comparison has a negative control; missing/dead mappings fail a registry check. |
| Replace broad analyzer with narrow structural checks after D | Smaller proof surface; generated owned-record/apply boundaries need less TypeScript interpretation. Costs D's redesign first; finite runtime searches remain. | Retire analyzer-as-proof expectations already withdrawn; retain complete-decision evidence and actual boundary invariants. | Dependency/ownership rules checked against deliberate escapes; profile-specific runtime corpus preserved; analyzer retirement accompanied by coverage mapping, not just file deletion. |

## F — Notes for the process owner (brief f; F07, F08)

The audit does not amend 006/009/012. [Verdict-flips.md](verdict-flips.md) records every found same-H reversal, disclosed draft, and separately labelled cleanup reopening, with the dimension missed and a reusable brief/reviewer checklist. Finding counts are not a reviewer ranking: naming/provenance and packet difficulty vary. Recurring records defects reflect manually restated facts, candidate-relative gates and report templates used as prose checklists rather than generated identity assertions.

| Option | Benefit and cost | Claims affected | Finishable follow-up |
|---|---|---|---|
| Keep manual records and present process | No tooling migration; repeated exact-H/provenance mistakes remain a review cost. | Existing 006/008 identity and scope rules unchanged. | For a declared candidate, independently check B/C/H, raw attachment accessibility and exact C..H allowlist; quote owner authority once and route current state from the ledger. |
| **Recommend generated identity facts plus declared search dimensions** | Generate counts/digests/interval files from immutable commits; human text explains inference, owner decisions and limits. Use the flip checklist to vary causes before repeated instance fixes. Costs a small record tool and process-owner choice, not stricter unfinishable review claims. | No Kernel semantic change. Process owner may amend templates/tooling; historical reports remain sealed. | For representative candidate/record errors, deliberately wrong SHA/count/allowlist/status fails; the generated manifest exactly replays; reviewer explicitly declares unseen dimensions and claim closure method. |


## Qualifying DA-1 families

These entries are additional to A–F. Their complete member IDs and origin rounds are in the generated table. Each recommends an option without changing a rule. F07/F08 are notes for the process owner.

### F01 — Wait, cancellation and lifecycle ordering

**Cause:** The early protocol worksheet expressed interacting lifecycle transitions as prose local to each operation. Generation, deadline, accepted cancellation and completion dependencies crossed those sections.

**Rule owner:** `mental-model/mechanisms/waits.md; mechanisms/lifecycle.md; concepts/core.md` (canonical paths are relative to the repository). **Sites:** K0.1/K0.2 worksheet and conformance records; current lifecycle.ts and coordinator unsupported cancel/await gates. **Why instance-by-instance:** Reviews varied one event schedule at a time, leaving adjacent eligibility/generation/cancellation orderings implicit.

| Option | Cost and benefit | Affected claims | Finishable closure |
|---|---|---|---|
| Keep: Keep canonical prose plus explicit schedule examples | Low implementation disruption; repeated cross-section reasoning remains necessary | Wait/lifecycle authority remains target specification; no K1.3 behavior is selected here | Enumerate the already accepted event/timeout/cancel/completion relations and demonstrate contradictory-transition mutants are rejected; maintain unsupported K1.3 gates until release |
| Recommend: Use an owner-maintained transition/relation model from which examples and gate obligations are derived | Makes conflicting transition obligations visible before implementation; costs a small shared model, not a universal scheduler design | Wait/lifecycle authority remains target specification; no K1.3 behavior is selected here | Enumerate the already accepted event/timeout/cancel/completion relations and demonstrate contradictory-transition mutants are rejected; maintain unsupported K1.3 gates until release; if refactored, differential preservation of the accepted corpus and explicit ownership/bypass check |

Decision draft: [F01](decision-drafts/F01.md); detailed starting item: D. No implementation is released.

### F02 — Boundary values and canonical domain

**Cause:** Structural recognition and serialization were treated as if they jointly defined the accepted domain; codec choice and hidden intrinsic state expose that gap.

**Rule owner:** `mental-model/concepts/values.md` (canonical paths are relative to the repository). **Sites:** values.ts captureObject/captureArray/encode; original K11-R1-JCS-01 and held O-R8-4. **Why instance-by-instance:** Domain, serializer equality and object brands were searched separately; coherent snapshots can preserve the wrong projection.

| Option | Cost and benefit | Affected claims | Finishable closure |
|---|---|---|---|
| Keep: Keep current value contract and add a finite brand-refusal matrix | Smallest object-binding correction; still has Proxy/host-exotic residual policy and enumeration cost | Accepted domain, exact canonical equality and classification hold | Use C closure criteria, including every root consumer and replay with differing hidden content |
| Recommend: Separate inert core values from explicit wrapper conversion/refusal | Removes core hidden-slot classification; costs parser and wrapper semantics | Accepted domain, exact canonical equality and classification hold | Use C closure criteria, including every root consumer and replay with differing hidden content; if refactored, differential preservation of the accepted corpus and explicit ownership/bypass check |

Decision draft: [F02](decision-drafts/F02.md); detailed starting item: C. No implementation is released.

### F03 — Identity scope and nondisclosure

**Cause:** Primitive validation, identity construction and evidence positions lived in different paths, allowing cross-scope/cross-boundary collisions and producer-consumer mismatches.

**Rule owner:** `mental-model/concepts/identity.md; mechanisms/authority.md; mechanisms/creation.md` (canonical paths are relative to the repository). **Sites:** identity.ts; coordinator.ts #mint/#visible/#refusal/createExecution/submitInput; envelope.ts identity-text gate. **Why instance-by-instance:** Tests varied short external identities or direct visibility but not minted suffix growth, cross-boundary reuse and interleaved hidden decisions.

| Option | Cost and benefit | Affected claims | Finishable closure |
|---|---|---|---|
| Keep: Keep the functions and expand the relational corpus | Avoids refactor; every producer/consumer pair remains a manual review obligation | No hidden existence/activity disclosure; exact receipt identity; creation/input separation | Generate accepted producer identities through each counter/length boundary and consume them on dispatch/takeover/replay/inspection; cross-scope interleaving and collection-boundary mutants must distinguish |
| Recommend: Centralize typed scope-local identity constructors and evidence sequences | Makes namespace boundaries explicit; costs migration of internal constructors and tests | No hidden existence/activity disclosure; exact receipt identity; creation/input separation | Generate accepted producer identities through each counter/length boundary and consume them on dispatch/takeover/replay/inspection; cross-scope interleaving and collection-boundary mutants must distinguish; if refactored, differential preservation of the accepted corpus and explicit ownership/bypass check |

Decision draft: [F03](decision-drafts/F03.md); detailed starting item: D. No implementation is released.

### F04 — Legacy migration disposition

**Cause:** Declarations of retired/replaced components were not always traced through live entry points, dependencies and acceptance gates.

**Rule owner:** `mental-model/roadmap.md; concepts/core.md; mechanisms/evidence.md` (canonical paths are relative to the repository). **Sites:** Archived K0.1/K0.2 disposition matrices; docs/development/kernel-ownership.md and current boundary tests (path inventory in catalog). **Why instance-by-instance:** Review treated a inventory row or target naming change as proof of effective retirement.

| Option | Cost and benefit | Affected claims | Finishable closure |
|---|---|---|---|
| Keep: Keep maintained disposition matrix | Simple human-readable ownership, but prone to stale use claims | Target-versus-shipped separation; no new legacy retirement claim | For each retired surface, reconcile actual imports/exports/tests with disposition; mutation inserting a forbidden live edge fails; unknown external uses are stated |
| Recommend: Generate consumer/reachability facts and retain explicit owner decisions beside them | Prevents names alone proving absence; costs scanner scope and external-consumer qualification | Target-versus-shipped separation; no new legacy retirement claim | For each retired surface, reconcile actual imports/exports/tests with disposition; mutation inserting a forbidden live edge fails; unknown external uses are stated; if refactored, differential preservation of the accepted corpus and explicit ownership/bypass check |

Decision draft: [F04](decision-drafts/F04.md); detailed starting item: E. No implementation is released.

### F05 — Protocol oracles and atomic observation

**Cause:** Fixtures asserted local fields or successful runs instead of the full permitted relation of state, effects and evidence.

**Rule owner:** `mental-model/mechanisms/evidence.md; mechanisms/execution-cycle.md` (canonical paths are relative to the repository). **Sites:** K0.1/K0.2 conformance/eval records; kernel outcome-acceptance/transaction/recovery tests. **Why instance-by-instance:** An unchanged chosen projection appeared to prove unchanged state; tests sometimes repeated implementation assumptions.

| Option | Cost and benefit | Affected claims | Finishable closure |
|---|---|---|---|
| Keep: Keep case-specific oracles and require complete projections | Minimal reuse work; oracle drift remains possible | Atomic within-process decision and evidence claims; never durability/containment | Every legal result and forbidden partial result has an independently justified oracle case; erase each material comparison and require its dedicated negative control to fail |
| Recommend: Share complete-decision vocabulary with independently derived expected relations | Reusable whole-effect checks; costs explicit permitted outcomes and negative controls | Atomic within-process decision and evidence claims; never durability/containment | Every legal result and forbidden partial result has an independently justified oracle case; erase each material comparison and require its dedicated negative control to fail; if refactored, differential preservation of the accepted corpus and explicit ownership/bypass check |

Decision draft: [F05](decision-drafts/F05.md); detailed starting item: E. No implementation is released.

### F06 — Dependency/inventory grammar and relational equality

**Cause:** Evidence tooling became a Markdown parser and dependency analyzer, with ad hoc parsing/normalization and lossy final comparators.

**Rule owner:** `docs/development/015-structural-evidence-rules.md; mental-model/mechanisms/evidence.md` (canonical paths are relative to the repository). **Sites:** tests/conformance/architecture/inventory-oracle.ts, module-graph.ts and boundary-policy.ts enumerated in the evidence catalog; archived K1.0 reviews. **Why instance-by-instance:** Each correction fixed a token/context example; later stages and grammar classes were not jointly varied.

| Option | Cost and benefit | Affected claims | Finishable closure |
|---|---|---|---|
| Keep: Keep current pinned grammar and exact relation checks | Preserves human Markdown workflow; high parser corpus maintenance | Inventory agreement and forbidden-dependency detection, not Kernel runtime behavior | Schema rejects duplicate/unknown/malformed rows; sets compared structurally; rendered table reproduces source; scanner corpus spans supported syntax and bypass mutants |
| Recommend: Make the governed relation structured data and render its human table | Eliminates Markdown ambiguity from authority; costs schema and migration; dependency scanner remains independently scoped | Inventory agreement and forbidden-dependency detection, not Kernel runtime behavior | Schema rejects duplicate/unknown/malformed rows; sets compared structurally; rendered table reproduces source; scanner corpus spans supported syntax and bypass mutants; if refactored, differential preservation of the accepted corpus and explicit ownership/bypass check |

Decision draft: [F06](decision-drafts/F06.md); detailed starting item: E. No implementation is released.

### F07 — Candidate identity, authority and record provenance

**Cause:** Manually copied counts/SHAs, inaccessible attachments and ambiguous owner quotations blurred payload, report, review and release boundaries.

**Rule owner:** `docs/development/006-development-process.md; 008-implementation-report.md` (canonical paths are relative to the repository). **Sites:** Archived cleanup/review/report records; active validation manifests and ledger row; no product site. **Why instance-by-instance:** A passing local gate/report was trusted without varying exact candidate, cumulative interval, accessibility or source authority.

| Option | Cost and benefit | Affected claims | Finishable closure |
|---|---|---|---|
| Keep: Keep manual report facts with independent recomputation | No tool change; recurring transcription review cost | Evidence identity, authentic review and explicit release; no semantic correction | Deliberately wrong SHA/count/path/interval/owner attribution must be detected; exact artifact bytes accessible at H; no generated report claims its future push |
| Recommend: Generate immutable identity facts and keep owner/reviewer assertions separately sourced | Cuts restatement failures; costs process-owner tooling decision | Evidence identity, authentic review and explicit release; no semantic correction | Deliberately wrong SHA/count/path/interval/owner attribution must be detected; exact artifact bytes accessible at H; no generated report claims its future push; if refactored, differential preservation of the accepted corpus and explicit ownership/bypass check |

Decision draft: [F07](decision-drafts/F07.md); detailed starting item: F. No implementation is released.

### F08 — Current prose, canonical ownership and status

**Cause:** Implemented status, target rules and historical evidence were restated across owners, guides and ledgers without a single status route.

**Rule owner:** `mental-model/README.md; reference.md; roadmap.md; docs/development/007-work-packets.md` (canonical paths are relative to the repository). **Sites:** BASELINE, Layer-3 references, package comments and front doors named by DA-1 records. **Why instance-by-instance:** Link-validity and local semantic wording were checked while neighboring current-status assertions and ownership conventions drifted.

| Option | Cost and benefit | Affected claims | Finishable closure |
|---|---|---|---|
| Keep: Keep prose duplication with a declared cross-page checklist | Readable local context; repeated status reconciliation | Target versus implementation; independent acceptance versus integration; atomicity versus durability | Defined current-state sentence inventory reconciles with exact owner records; links resolve and semantic/status checks are separately recorded |
| Recommend: Route current status to the ledger/baseline and keep each canonical rule at its owner | Reduces conflicting prose; costs editorial migration by the process/docs owner | Target versus implementation; independent acceptance versus integration; atomicity versus durability | Defined current-state sentence inventory reconciles with exact owner records; links resolve and semantic/status checks are separately recorded; if refactored, differential preservation of the accepted corpus and explicit ownership/bypass check |

Decision draft: [F08](decision-drafts/F08.md); detailed starting item: F. No implementation is released.

### F09 — Ambient same-process integrity

**Cause:** Caller observation may execute code that changes prototype lookups, descriptor conversion or serializer primitives later trusted by the Kernel.

**Rule owner:** `mental-model/concepts/values.md; concepts/operations.md; AGENTS.md Trusted/Isolated Execution` (canonical paths are relative to the repository). **Sites:** values.ts primordials/serializer window; own-array.ts; envelope.ts; coordinator.ts held-history fields. **Why instance-by-instance:** Repairs followed individual ambient hops: getter, inherited index, descriptor descriptor, iterator.next, optional record member.

| Option | Cost and benefit | Affected claims | Finishable closure |
|---|---|---|---|
| Keep: Keep adversarial profile | Preserves live-object promises; ongoing hardening and scoped search burden | A threat model, DEC-8/9 distinctions and all claims named in A | Use A/B profile closure and preserve ordinary __proto__, snapshot, reentrancy and atomicity controls |
| Recommend: Cooperative convenience binding with isolated inert intake for hostile callers | Removes realm-poisoning promise from ordinary core; costs explicit binding migration | A threat model, DEC-8/9 distinctions and all claims named in A | Use A/B profile closure and preserve ordinary __proto__, snapshot, reentrancy and atomicity controls; if refactored, differential preservation of the accepted corpus and explicit ownership/bypass check |

Decision draft: [F09](decision-drafts/F09.md); detailed starting item: A. No implementation is released.

### F10 — Refusal work and diagnostics

**Cause:** Accepted-byte charges were used as a proxy for all traversal work; refused occurrences, stack scans, diagnostics and repeated listings escaped that accounting.

**Rule owner:** `mental-model/concepts/values.md#fixed-semantic-limits; K1.2 decision-05` (canonical paths are relative to the repository). **Sites:** values.ts issue accounting, capture, isOpen/closeContainer; outcome.ts aggregate diagnostics; held R8 findings. **Why instance-by-instance:** Search optimized the previous worst sample without closing value-dependent operations or deriving an acceptance-covering budget.

| Option | Cost and benefit | Affected claims | Finishable closure |
|---|---|---|---|
| Keep: Keep object capture with decision-05 meter | Preserves valid value semantics; requires unit table, budget proof and enforced helpers | V-D1 held work dimension; diagnostic retention and equality remain separate | Classify/charge every chosen operation; valid roots never exceed derived budget; surplus/list/stack/diagnostic meter-deletion mutants are killed; timing remains non-gating |
| Recommend: Use bounded owned-input parser or simpler cooperative traversal | Smaller operation language; costs binding assumptions and parser/wrapper design | V-D1 held work dimension; diagnostic retention and equality remain separate | Classify/charge every chosen operation; valid roots never exceed derived budget; surplus/list/stack/diagnostic meter-deletion mutants are killed; timing remains non-gating; if refactored, differential preservation of the accepted corpus and explicit ownership/bypass check |

Decision draft: [F10](decision-drafts/F10.md); detailed starting item: A. No implementation is released.

### F11 — Authority, grants and decision precedence

**Cause:** Visibility, control power, attempt authority and envelope validity were interleaved; callbacks could invalidate prechecks.

**Rule owner:** `mental-model/mechanisms/execution-cycle.md#outcome-acceptance; mechanisms/authority.md` (canonical paths are relative to the repository). **Sites:** coordinator.ts submitOutcome/requestTakeover/#requireControl; outcome.ts capture; submission-authority tests. **Why instance-by-instance:** Reviews varied one invalid field or permission at a time, not the cross-product or callback order.

| Option | Cost and benefit | Affected claims | Finishable closure |
|---|---|---|---|
| Keep: Keep ordered methods with a full decision table | Smallest change; repeated sequencing in each method | Inspection is not control; authority before deciding content; exact replay exemption; stale/current classification | Generate table cases across visible/hidden, replay/fresh, malformed/stale, authority present/absent and callback decisions; whole-view/grant oracle rejects precedence mutants |
| Recommend: Separate capability/precedence decision from plan construction and apply | Typed validated decisions remove some bypasses; costs refactor and preserving exact refusal order | Inspection is not control; authority before deciding content; exact replay exemption; stale/current classification | Generate table cases across visible/hidden, replay/fresh, malformed/stale, authority present/absent and callback decisions; whole-view/grant oracle rejects precedence mutants; if refactored, differential preservation of the accepted corpus and explicit ownership/bypass check |

Decision draft: [F11](decision-drafts/F11.md); detailed starting item: D. No implementation is released.

### F12 — Retained history, immutable evidence and inspection

**Cause:** Mutable record exposure and missing decision-history variants let operational changes escape durable-in-memory explanation.

**Rule owner:** `mental-model/concepts/state.md#execution-history; mechanisms/evidence.md; mechanisms/recovery.md` (canonical paths are relative to the repository). **Sites:** coordinator.ts history builders/inspect/recoverExecution; inspection.ts; recovery-history/evidence tests. **Why instance-by-instance:** Tests observed present state, not retained transitions, mutation through old views or truthful authority attribution.

| Option | Cost and benefit | Affected claims | Finishable closure |
|---|---|---|---|
| Keep: Keep individual builders with complete history tests | Avoids broad refactor; omission risk persists at every new transition | Inspectability, permitted actions, immutable retained evidence and truthful attribution; no persistence claim | Every existing hold transition yields expected variant and no extra decision; mutate returned old views, optional fields and attributed authority; whole projection remains correct |
| Recommend: Owned immutable history variants emitted by decision plans; read-only projection boundary | Turns required fields/history into construction requirements; costs explicit event variants and compatibility corpus | Inspectability, permitted actions, immutable retained evidence and truthful attribution; no persistence claim | Every existing hold transition yields expected variant and no extra decision; mutate returned old views, optional fields and attributed authority; whole projection remains correct; if refactored, differential preservation of the accepted corpus and explicit ownership/bypass check |

Decision draft: [F12](decision-drafts/F12.md); detailed starting item: D. No implementation is released.

### F13 — Delivery, asynchronous ownership and capabilities

**Cause:** The boundary mixed host observations, dispatch choices, attempt identity and physical-delivery evidence. Repeated observation could change a validated dispatch bound; a returned Promise exposed construction hooks; delivery records omitted the owning writer epoch.

**Rule owner:** `mental-model/mechanisms/execution-cycle.md#delivery-reporting-boundary` (canonical paths are relative to the repository). **Sites:** driver.ts DeliverySettlement; coordinator.ts #deliver; dispatch.test.ts; accepted KC1-ARCH-1. **Why instance-by-instance:** Search varied one dispatch or Promise outcome at a time, missing changing bound getters, host-controlled construction/species, and retained attribution across takeover.

| Option | Cost and benefit | Affected claims | Finishable closure |
|---|---|---|---|
| Keep: Keep accepted explicit settlement capability | Already removes the unfinishable Promise attachment family; retain driver-side rejection ownership | First report wins; report cannot commit progress; retry keeps attempt grant and creates fresh delivery report capability | Maintain single dispatch-bound observation, epoch-attributed retained delivery, explicit settlement/no-Promise corpus, receiver-free calls, reentrancy and late retired reports; transport adapter cannot forge Outcome authority |
| Recommend: Generalize adapter transport while preserving separate attempt and delivery capabilities | Allows inert/isolated binding; costs authenticated remote operational translation, outside this packet | First report wins; report cannot commit progress; retry keeps attempt grant and creates fresh delivery report capability | Maintain single dispatch-bound observation, epoch-attributed retained delivery, explicit settlement/no-Promise corpus, receiver-free calls, reentrancy and late retired reports; transport adapter cannot forge Outcome authority; if refactored, differential preservation of the accepted corpus and explicit ownership/bypass check |

Decision draft: [F13](decision-drafts/F13.md); detailed starting item: A. No implementation is released.

### F14 — Distinguishing mutations and regression claims

**Cause:** Green tests were treated as evidence of an obligation without removing the exact operation or comparison that was supposed to enforce it.

**Rule owner:** `docs/development/012-review-methods.md; mental-model/mechanisms/evidence.md` (canonical paths are relative to the repository). **Sites:** K1.2 ablations and R8 N15; exact-coordinate/outcome evidence tests; evidence catalog. **Why instance-by-instance:** Mutants targeted convenient syntax or weak fixtures; runner errors and partial assertions hid survival.

| Option | Cost and benefit | Affected claims | Finishable closure |
|---|---|---|---|
| Keep: Keep packet-local mutation runners | Easy local edits; stale patches and reporter coupling recur | Evidence sufficiency, never automatic semantic correctness | Every live mutation applies exactly once, control passes, failure is attributable to expected obligation, and surviving changes have recorded owner disposition |
| Recommend: Maintain a mutation registry tied to mechanism and complete oracle | Explicit survivors and causal kills; costs registry lifecycle and source-span maintenance | Evidence sufficiency, never automatic semantic correctness | Every live mutation applies exactly once, control passes, failure is attributable to expected obligation, and surviving changes have recorded owner disposition; if refactored, differential preservation of the accepted corpus and explicit ownership/bypass check |

Decision draft: [F14](decision-drafts/F14.md); detailed starting item: E. No implementation is released.

### F15 — Static enforcement of read/commit ownership

**Cause:** A general TypeScript effect/ownership analysis approximated a dynamic language guarantee and missed unmodeled syntax/provenance.

**Rule owner:** `K1.2-correction-01 amendments 02/03 and DEC-8/9; execution-cycle atomic decisions` (canonical paths are relative to the repository). **Sites:** tests/zone-analysis.ts, zone-inventory.ts, ambient-reads/control-commits tests. **Why instance-by-instance:** Local/default/nested assertion shapes varied after each scanner fix; semantic escape space outgrew syntax examples.

| Option | Cost and benefit | Affected claims | Finishable closure |
|---|---|---|---|
| Keep: Keep analyzer as optional regression guard | Useful local feedback; no completeness proof and substantial upkeep | Keep accepted bounded runtime evidence; do not revive analyzer-as-proof claim | Restricted boundaries reject type/default/shadowing bypass controls; current runtime poison/fault obligations remain independently checked |
| Recommend: Restrict module/state interfaces so narrow structural checks replace effect inference | Makes writable/caller-reference boundaries explicit; costs D refactor and finite escape corpus | Keep accepted bounded runtime evidence; do not revive analyzer-as-proof claim | Restricted boundaries reject type/default/shadowing bypass controls; current runtime poison/fault obligations remain independently checked; if refactored, differential preservation of the accepted corpus and explicit ownership/bypass check |

Decision draft: [F15](decision-drafts/F15.md); detailed starting item: D. No implementation is released.

### F16 — Runtime sweep scope and complete-decision oracle

**Cause:** A broad sweep label and partial result classifier allowed inconsistent observations or uncovered exits to look like complete decisions.

**Rule owner:** `K1.2-correction-01 amendment-03/contract revision 10; mechanisms/evidence.md` (canonical paths are relative to the repository). **Sites:** tests/sweep/fault-oracle.ts, fault-scenarios.ts, fault-child.ts, fault-oracle.test.ts. **Why instance-by-instance:** Review counted executions or exits before independently mutating each oracle dimension and matching each scenario to a permitted decision.

| Option | Cost and benefit | Affected claims | Finishable closure |
|---|---|---|---|
| Keep: Keep current bounded sweeps with explicit exclusions | Retains useful evidence already corrected; substantial fixtures and version-sensitive source inventory | Only declared reached paths/injected operations; no arbitrary engine fault or universal atomicity promise | Each scenario maps to a named source exit; no-call/callback/accepted alternatives validated; inconsistent return/view/grant/position combinations and missing fields rejected |
| Recommend: TOOLS-01 complete-decision corpus with profile-specific injection adapters | Separates claim, observation and instrumentation; costs migration without broadening guarantee | Only declared reached paths/injected operations; no arbitrary engine fault or universal atomicity promise | Each scenario maps to a named source exit; no-call/callback/accepted alternatives validated; inconsistent return/view/grant/position combinations and missing fields rejected; if refactored, differential preservation of the accepted corpus and explicit ownership/bypass check |

Decision draft: [F16](decision-drafts/F16.md); detailed starting item: E. No implementation is released.
