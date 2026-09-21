# Audit report — `mental-model/concepts/identity.rewrite.md` vs `mental-model/concepts/identity.md`

Reviewed against `AGENTS.md`, `mental-model/README.md`, `reference.md`, `sources.md`, `rewrite-index.md` §§1–5, canonical owners (`concepts/core.md`, `concepts/values.md`, `concepts/actions.md`, `concepts/operations.md`, `mechanisms/creation.md`, `mechanisms/execution-cycle.md`, `mechanisms/recovery.md`, `mechanisms/authority.md`, `mechanisms/evidence.md`, `mechanisms/resources.md`), K0.1 worksheet ID-1–ID-9, K0.2 `K02-R13-01`, K1.1 contract `K1.1-C1/C2/C4/C5`, `K1.1-DEC-2`, `KC1-DEC-1`/`KC1-ARCH-1`, `002-implemented-kernel-baseline.md`, `007-work-packets.md`.

No file edited. No prose rewritten.

> Note (GPT6 old-name policy update): former-name explanations (e.g. "attempt epoch",
> "caller-scoped creation key") are not required document content. Their presence or
> absence is not a defect and no finding in this report requires adding one.

---

## F1 — Creation request ID presented as universal triple

**Location:** rewrite L61: “A Creation request ID has the same three-part shape as an Input ID, and only the middle part differs.”

**Classification:** OVERSTATED (generalises implementation binding into architecture; alternatively UNDECIDED PRESENTED AS DECIDED)

**Why:** Input ID triple `(namespace, destination, requestKey)` is architecture (WS ID-2). Creation triple `(namespace, creation authority scope, creationKey)` is stated in the original only as “In the in-process TypeScript binding, the components are …” (`identity.md` L25). Baseline `002` §Request identity terminology maps `CreationKeyId {producerNamespace, scope, requestKey}` as existing TypeScript name, and explicitly says the clarification “does not freeze API or wire spelling” and “defines no new durable object or universal wire representation.” `identity.md` L3 and `rewrite-index.md` §4 retain: API/wire spelling open.

The rewrite drops the binding qualifier and states a universal three-part shape.

**Governing evidence:**
1. `concepts/identity.md` L25–27 (in-process binding qualifier + no universal wire representation).
2. `docs/development/002-implemented-kernel-baseline.md` §Request identity terminology.
3. `rewrite-index.md` §4 Representations/API spelling open; §1.4 “its in-process binding includes …”.

**Narrowest safe correction:** Re-qualify: creation triple describes the in-process binding; architecture fixes only caller-context + creation key + binding of complete creation content, without fixing a universal triple.

**Confidence:** HIGH

---

## F2 — Attempt-envelope contents invented

**Location:** rewrite L103: “carries attempt metadata — the writer epoch, and whatever a Driver needs to route and report on the attempt”

**Classification:** UNDECIDED PRESENTED AS DECIDED

**Why:** Canonical owner says only “transport/protocol wrapper carrying attempt metadata around the immutable exchange” (`identity.md` L43). It does not enumerate contents. `writer_epoch` is a field of the `Activation` conceptual shape (`execution-cycle.md` L19–26), not defined as envelope payload. Delivery reporting is via a separate Kernel-created capability (`deliver(activation, settlement): undefined`, first-report-wins, report changes no accepted state — `execution-cycle.md` #delivery-reporting-boundary, `KC1-ARCH-1`), not via envelope.

Listing epoch + Driver routing/reporting needs as envelope contents selects an answer never made.

**Governing evidence:**
1. `concepts/identity.md` #writer-epoch (envelope sentence).
2. `mechanisms/execution-cycle.md` #before-sending shape + #delivery-reporting-boundary.
3. `rewrite-index.md` §1.4, §2 delivery-reporting row.

**Narrowest safe correction:** Revert to “carrying attempt metadata” with no enumeration; if epoch must be mentioned, state it as Activation field, not envelope content.

**Confidence:** HIGH

---

## F3 — Canonical “Keys, IDs and scope” territory missing

**Location:** whole page; no `#keys-ids-and-scope` section; cf. rewrite L43–44, L5.

**Classification:** MISSING REQUIRED SEMANTIC CONTENT

**Why:** `reference.md` Canonical definitions owns “Keys, IDs and scope: naming convention” at `identity.md#keys-ids-and-scope`. Original L13–17 fixes:
- key = caller text vs ID = complete identity; distinction is meaning not representation;
- Input ID composite vs Execution ID may be opaque; encoding composite as text does not make it a request key;
- use **lookup key** for storage encoding; qualify other “key” (e.g. Effect proposal key);
- **Scope** rule: always name rule + context; request/authority/receipt uses; no shared scope object; identity component does not grant access.

Rewrite has no such section/anchor, never defines `lookup key`, never states representation-independence or no-shared-scope-object, and never states identity-does-not-grant-access as a general rule. Existing links to `#keys-ids-and-scope` would break. `rewrite-index.md` §1.4 explicitly carries “an ID need not have composite representation” and “No new ‘creation request scope’ object.”

**Governing evidence:**
1. `reference.md` §Canonical definitions + Former names table.
2. `concepts/identity.md` L13–17.
3. `rewrite-index.md` §1.4.

**Narrowest safe correction:** Restore a concise naming-convention block with anchor (or explicit redirect): key/ID distinction + representation independence + `lookup key` + scope naming rule + no shared scope object + identity ≠ permission.

**Confidence:** HIGH

---

## F4 — Creation/ingress separation consequences omitted

**Location:** rewrite L65: “Creation and later input are separate identity domains …” with only link to `creation.md#later-input-has-a-destination`.

**Classification:** MISSING REQUIRED SEMANTIC CONTENT

**Why:** Separation is not just a label; its defining consequences are owned here and in creation:
- accepting initial Event during creation does **not** consume a post-creation Input ID;
- initial Event retains creation provenance + creation receipt;
- only later ingress participates in Input-ID replay/conflict lookup;
- same text reuse is new ingress, not creation replay/conflict.

Original L29 states all of this. `KC1-DEC-1` (correction contract): initial Event not indexed in `byInputId`, Event ID from creation-key domain under prefix no ingress ID can carry; reuse as genuine ingress gets own identity/receipt. `REF-1` requires distinct domains + separate receipts. Rewrite states the slogan and delegates, without the two load-bearing facts a reader needs to apply the rule.

**Governing evidence:**
1. `concepts/identity.md` L29.
2. `mechanisms/creation.md` #later-input-has-a-destination.
3. `work/K1.1-correction-01/contract.md` `KC1-DEC-1`; `work/K1.1-reference-01/contract.md` REF-1; `work/K1.1/review-15.md` `K11-R15-ID-01`.

**Narrowest safe correction:** Add the two sentences: initial Event keeps creation provenance/receipt and consumes no Input ID; only later ingress uses Input-ID replay/conflict.

**Confidence:** HIGH

---

## F5 — “Admission … records nothing” contradicts admission ledger

**Location:** rewrite L151–153: “admission authorizes an attempt … none of the three, by itself, records anything as having happened.”

**Classification:** CONTRADICTED

**Why:** Admission **does** record: “records that intent under current dispatch ownership” (`concepts/actions.md` #admission-and-physical-action-attempt); “record the final policy/consent decision and attempt intent atomically under current action-dispatch ownership” (`mechanisms/authority.md` #order-revocation-against-admission); atomic-decisions table: Action admission commits policy/consent + attempt intent (`execution-cycle.md` #atomic-decisions-across-the-system). Original `identity.md` L71 says only they are “not interchangeable acceptance points,” not that admission records nothing.

**Governing evidence:**
1. `concepts/actions.md` #admission-and-physical-action-attempt.
2. `mechanisms/execution-cycle.md` #atomic-decisions-across-the-system.
3. `concepts/identity.md` L71.

**Narrowest safe correction:** Distinguish: admission records attempt intent but does not constitute Outcome/progress acceptance nor prove external success.

**Confidence:** HIGH

---

## F6 — Boundary “across more than one component” implies denied cross-shard atomicity

**Location:** rewrite L155: “one boundary may be implemented across more than one component, as long as an observer never sees half of it.”

**Classification:** OVERSTATED (risks CONTRADICTED)

**Why:** Owner says only “consistency requirement, not necessarily a machine or transport boundary” (`identity.md` L73). Deliberately-not-invented list forbids implying cross-shard atomicity / exactly-once external effects (`rewrite-index.md` §4; `execution-cycle.md` #atomic-decisions-across-the-system: “Cross-shard atomicity and exactly-once external effects are not implied”; transaction/journal/substrate note + “check what that substrate retries on its own”). A boundary spanning components without qualification suggests a guarantee the architecture explicitly withholds.

**Governing evidence:**
1. `concepts/identity.md` L73.
2. `mechanisms/execution-cycle.md` #atomic-decisions-across-the-system.
3. `rewrite-index.md` §4 Deliberately not invented.

**Narrowest safe correction:** Delete cross-component example; retain “consistency requirement, not machinery/API/process/owner/interface” wording.

**Confidence:** MEDIUM (HIGH that the sentence exceeds source; MEDIUM that it will be read as cross-shard claim)

---

## F7 — Receipt “not a token that carries permission” exceeds source

**Location:** rewrite L157: “it is not a token that carries permission.”

**Classification:** OVERSTATED

**Why:** Underlying idea (identifiers ≠ permission) is supported generally — “an identity component does not grant access” (`identity.md` L17); cursor ≠ authority, correlation ≠ permission, handle/trace ≠ bearer permission (dangerous inferences §4 #18); hash never proves permission (`values.md` #canonical-form). But no owner states a receipt-permission-token rule. Original receipt definition (`identity.md` L75) says only retained evidence at named boundary/revision/position, returnable to caller, not inherently Kernel→Runtime ack. Adding a receipt-specific permission-token denial claims more than established.

**Governing evidence:**
1. `concepts/identity.md` L17, L75.
2. `rewrite-index.md` §1.4 (receipt proves only named decision).
3. `mental-model/sources.md` §Intentionally unselected choices (no universal token format selected).

**Narrowest safe correction:** Delete the permission-token clause; retain “proves its named decision and nothing adjacent.”

**Confidence:** MEDIUM

---

## F8 — Compatibility table claimed to own all seven revision bindings

**Location:** rewrite L147: “[Compatibility and migration] owns what becomes of these bindings when work resumes, pairing each one with the check …”

**Classification:** OWNERSHIP ERROR (OVERSTATED)

**Why:** `recovery.md` #compatibility-and-migration tables Protocol/transport, Definition+Runtime, Progress (codec+migration), Operation, Policy, Resource, Output/Event consumer. It does not table base-vs-accepted progress as distinct bindings nor action-evidence revision as such. Original revision table lists seven kinds with different creators/change points and makes no such ownership claim. Attributing all seven to compatibility overstates that page.

**Governing evidence:**
1. `mechanisms/recovery.md` #compatibility-and-migration.
2. `concepts/identity.md` #revision table.
3. `reference.md` Find-a-mechanism (recovery vs revision ownership).

**Narrowest safe correction:** Narrow to “some of these bindings have resume checks in compatibility” or drop ownership sentence; do not claim pairing for each of the seven.

**Confidence:** MEDIUM

---

## F9 — Retry-vs-takeover “owns” takeover-decision input fate

**Location:** rewrite L77: “[Retry versus takeover] … owns what becomes of input that arrives while a takeover is being decided.”

**Classification:** OWNERSHIP ERROR

**Why:** That section owns the three-row identity table (same/same/same; same/advance/same; new/implementation/newly-selected) and states new arrivals cannot replace batch under existing Activation ID + recovery establishes permission (`execution-cycle.md` L67). The ordered replacement procedure (reconstruct → establish ownership/compat → apply Driver phase contract → only then fence) is owned by `recovery.md` #decide-permission-before-replacing-work; batch selection/readiness by waits. No source gives retry-vs-takeover sole ownership of in-flight-takeover input disposition.

**Governing evidence:**
1. `mechanisms/execution-cycle.md` #retry-versus-takeover L67.
2. `mechanisms/recovery.md` #decide-permission-before-replacing-work.
3. `rewrite-index.md` §2 Recovery row.

**Narrowest safe correction:** Attribute to recovery ordering + batch immutability; keep retry-vs-takeover as the three-case comparison.

**Confidence:** MEDIUM

---

## F10 — Operation/schema revision “validated, approved, and settled under”

**Location:** rewrite table L139–143, Operation row: “Which contract were these arguments validated, approved, and settled under?”

**Classification:** OVERSTATED

**Why:** Owner purpose is “Pin action meaning and validation” (`identity.md` L61–65). Validation + exact-consent binding to pinned operation revision is established (`concepts/actions.md` #operation, #exact-consent; `mechanisms/authority.md` #exact-action-consent; compatibility row: schema/meaning/account semantics unchanged). “Settled under” implies settlement certainty/validity is versioned by operation revision, which no owner states as revision purpose. Settlement has four conceptual dimensions and its own evidence rules (`actions.md` #settlement-and-reconciliation).

**Governing evidence:**
1. `concepts/identity.md` #revision table.
2. `concepts/actions.md` #operation, #settlement-and-reconciliation.
3. `mechanisms/recovery.md` #compatibility-and-migration Operation row.

**Narrowest safe correction:** Revert to “Pin action meaning and validation” (or “validated … under” only).

**Confidence:** LOW–MEDIUM

---

## F11 — Acceptance-position non-observability as causal explanation

**Location:** rewrite L172: “no ordering across two accepting domains, or across two Executions, is promised, because none can be observed.”

**Classification:** OVERSTATED

**Why:** “Not a global clock” is established (`identity.md` L75; `core.md` #event accepted order per-Execution only; `evidence.md` order per accepting domain). The causal “because none can be observed” for positions across domains is an inference. For Events the non-observability rationale is explicit; for acceptance positions it is not stated as the reason.

**Governing evidence:**
1. `concepts/identity.md` L75.
2. `concepts/core.md` #event (no global clock).
3. `mechanisms/evidence.md` #what-evidence-proves (per-domain order).

**Narrowest safe correction:** State no cross-domain/cross-Execution ordering promised, without “because” clause.

**Confidence:** LOW

---

## Required corrections

Before adoption: F1, F2, F3, F4, F5, F6. F7–F9 should also be fixed; F10–F11 are minor but should not ship as stated.

## Questions requiring owner judgment

1. **Scope anchor fate.** If the rewrite intentionally removes `#keys-ids-and-scope`, does the owner accept updating `reference.md`, `rewrite-index.md`, and all inbound links, or must the anchor be retained? Repo gives no decision to delete canonical naming-convention ownership.
2. **Creation-shape universality.** Has ArrokothI decided a universal Creation-request-ID triple, or does the in-process triple remain one binding with API/wire spelling open? Current evidence supports the latter only.
3. **Envelope definition.** Should `identity.md` ever enumerate envelope contents, or remain at “attempt metadata”? No decision enumerates Driver routing/reporting as envelope payload.
4. **Cross-component boundaries.** Does any accepted decision authorize describing an atomic acceptance boundary as implementable across components, given the explicit no-cross-shard-atomicity rule?
5. **Receipt-permission language.** Should a general “identity ≠ permission” rule be stated once on this page (as original does) rather than as a receipt-specific token claim?

## Original-content coverage

**Preserved:** request key ≠ content hash + key-selects/conflict-by-content; Input-ID triple + namespace from trusted context (not payload `user_id`) + no cross-producer dedup; creation/later-input domain separation slogan; Activation ID / Runtime attempt / takeover-keeps-ID-advances-epoch / redelivery-keeps-both / new-exchange-new-ID; writer-epoch monotonic-within-exchange, takeover-only advance, fences whole Outcome (batch ack, progress, emissions, Effect intents, wait/deadline, readiness, next state), not auth, not liveness/lease, not physical lock, Driver exclusive-continuation / hold-refuse, duplicate-returns-receipt vs stale-refused ordering; dispatch intent pinned-before-send + crash-window rationale; dispatch intent pinned-before-send + crash-window rationale; delivery naming rule + Kernel→Driver→Runtime responsibility-not-machines + bytes-arrival ≠ acceptance + explicit delivery report + failed ≠ proved-never-started; seven revision kinds + no-global-revision + progress-4/epoch-2 example + non-integer/no-shared-counter; six receipt scopes + no-single-receipt + Outcome receipt ≠ action-ran + timeout introduces no seventh + authenticate-before-reveal + shape/timing non-disclosure + retention-bounded replay + serialization/hashing implementation-owned.

**Intentionally unnecessary (correctly omitted or better left to owners):** former-name explanations per GPT6 old-name policy — old "caller-scoped creation key" historical name, "attempt epoch" retired-name note, and any similar "former name" mapping (presence or absence is not a defect and none is required by this report); terminology-vs-API-names disclaimer detail (covered by baseline + L3 Status convention); full `before-sending` field list in intro (correctly delegated); per-hop delivery-reporting mechanics/first-report rule (owned by `execution-cycle.md`); implementation-mapping table link (status/binding detail owned by `002`); duplicate prose of waits/lifecycle/authority details.

**Moved/delegated appropriately:** creation-reuse example mechanics to `creation.md`; wait/selection, cancellation ordering, admission/settlement detail, retention periods to their owners — provided F4’s two identity consequences are restored here.

**Genuinely missing:** F3 (scope/lookup-key/representation-independence/no-shared-scope/identity≠access + anchor) and F4 (initial-Event provenance + creation receipt + only-later-ingress-in-Input-ID-lookup).

## Overall result

**CORRECTIONS REQUIRED**