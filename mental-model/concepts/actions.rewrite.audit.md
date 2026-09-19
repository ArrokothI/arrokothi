## Audit report — `mental-model/concepts/actions.rewrite.md` vs `mental-model/concepts/actions.md`

Truth established from `AGENTS.md`, `mental-model/README.md#target-not-shipped`, `mental-model/reference.md#canonical-definitions`, `mental-model/sources.md`, `mental-model/rewrite-index.md` §§1.5/4/5, and owners: `concepts/actions.md`, `mechanisms/actions.md`, `mechanisms/authority.md`, `mechanisms/output.md`, `mechanisms/execution-cycle.md#outcome-acceptance`, `mechanisms/lifecycle.md#completion-is-an-accounting-check`, `concepts/identity.md#revision`, `concepts/operations.md`, `concepts/roles.md`, `mechanisms/state.md#state-service-contract`, `mechanisms/communication.md`, plus K0.1 worksheet §8 EF-3/EF-4 (accepted rev.12) and ledger `007-work-packets.md` (K2.1–K2.4 PLANNED, K1 refuses Effects). Layer-3 owns rules; `docs/development/` owns status; implementation names do not define target.

### Finding 1 — `settled` added as a Request-disposition value

* **Candidate passage / location:** L110 table row: `| Request disposition | The fate of the request itself: waiting for approval, denied, withdrawn, settled, or no more attempts |`
* **Classification:** CONTRADICTED
* **Why problematic:** Inserts the name of the settlement *process* into the *disposition* dimension. The page's own rule (L106–L117) forbids collapsing dimensions. `settled` is never a disposition value in any owner; it makes "settlement happened" look like a request-fate state and invites reading disposition = settlement, exactly the single-status collapse the section warns against. It also collides with existing vocabulary where settlement owns evidence recording, disposition owns what may happen next.
* **Governing evidence:**
  1. Current canonical owner `mental-model/concepts/actions.md#L53`: disposition lists `waiting for approval, denied, withdrawn, no more attempts` — no `settled`.
  2. Accepted K0.1 worksheet `protocol-worksheet.md#L1464` EF-3: disposition = `Proposed/accepted; waiting for consent; eligible; denied/refused/declined/expired/withdrawn; no further attempts` — no `settled`. EF-3 explicitly names dimensions without deciding K2 mechanics; adding a value selects undecided content.
  3. `mechanisms/actions.md` never lists `settled` as disposition; `mental-model/` grep shows `settled` as disposition only in rewrite.
* **Narrowest safe correction:** Delete `settled, ` from that cell, restoring the owner list. Do not add any new disposition enum; dimensions are conceptual, not a mandated cross-product.
* **Confidence:** HIGH

### Finding 2 — Validator asserted as per-operation property

* **Candidate passage / location:** L56: `What is decided is that those are properties of the operation, not of the call.`
* **Classification:** UNDECIDED PRESENTED AS DECIDED
* **Why problematic:** L44 groups two open items — "what validator an implementation uses, and which subset of a schema it actually enforces" — then L56 declares both decided as operation properties. Owners fix only that *supported schema features* is part 3 of the operation contract; whether the *validator implementation choice* is per-operation or global, and its selection, is open to K2.2.
* **Governing evidence:**
  1. `concepts/actions.md#L15` + TODO: `rewrite once K2.2 selects the validator and enforced subset`.
  2. `rewrite-index.md` §1.5 and §4: `Do not infer: the validator or enforced schema subset — open TODO, K2.2 selects it`; `Validator and enforced schema subset for operations — open TODO`.
  3. Ledger: K2.2 PLANNED.
* **Narrowest safe correction:** Keep "supported subset is part of the operation contract" (decided); leave "which validator implementation is used" explicitly undecided for K2.2 without assigning it to operation vs implementation.
* **Confidence:** MEDIUM

### Finding 3 — Provisional stream "will vanish" overstates retention rule

* **Candidate passage / location:** L184: `a reasoning trace that will vanish if that attempt is replaced.`
* **Classification:** OVERSTATED
* **Why problematic:** Provisional output is unaccepted, and only accepted output survives as accepted state, but owners do not promise physical vanishing/deletion. Failed/replaced streams may be retracted *or marked*; splicing prohibition is about presenting them as accepted, not about disappearance.
* **Governing evidence:** `mechanisms/output.md#L13`: `Failed/replaced attempt streams may be retracted or marked; do not splice them into an apparently accepted transcript. They cannot certify consent, action success or terminal result.`; `concepts/actions.md#L86` defines provisional as unaccepted diagnostic/streaming content without a deletion guarantee.
* **Narrowest safe correction:** Replace vanishing claim with non-survival as accepted state, e.g. owner wording: only accepted Emission survives replacement as accepted state.
* **Confidence:** LOW — illustrative example, but deletion vs non-acceptance matters for retention/evidence.

### Finding 4 — "a contract of its own" for child/message/human-input

* **Candidate passage / location:** L68: `Each of those has a contract of its own — who may answer, who owns the new work, what send success means`
* **Classification:** AMBIGUOUS AGAINST EXISTING VOCABULARY
* **Why problematic:** `contract` already names distinct owners: operation contract, Runtime contract, Definition revision, state-service contract. Child/message/human-input have bindings/records/schemas owned by `concepts/operations.md#child-and-ownership`, `#message-request-and-correlation` and `mechanisms/communication.md`, and point at *no* operation (correctly stated same paragraph). Calling them "contracts" can be read as a new portable contract type or as operation-like contracts.
* **Governing evidence:** `reference.md` canonical list separates `[Operation]`, `[Runtime contract]`, `[Definition]`; `roles.md`/`operations.md` do not define a "child/message/human contract"; `communication.md` owns creation/routing/request-record semantics without naming a unified contract.
* **Narrowest safe correction:** Keep denial of operation-pointing; rename informal "contract" to owner terms (child ownership/binding, message routing/correlation, human-request response contract/eligibility) or cite owners without introducing `contract`.
* **Confidence:** LOW

---

### Required corrections

1. Finding 1 must be fixed before adoption: remove `settled` from Request disposition. This is the only HIGH-confidence semantic contradiction.

Findings 2–4 should be tightened but do not by themselves block adoption if reworded to preserve the open TODOs and owner vocabulary.

### Questions requiring owner judgment

1. **Governed reads:** L66 says `A governed read is still a Kernel-mediated action, still admitted, still settled`. `mechanisms/state.md#L11` says `Reads are not categorically excluded from Effects` but also `a trusted native read can stay native with its access owner declared`. Owner must confirm whether "governed read" in this sentence means "read that claims mediation" (then admitted/settled holds) or all reads of governed data (then native alternative contradicts). Original `concepts/actions.md#L29` shares the same phrasing, so this is inherited ambiguity, not new invention.
2. **Validator scope (Finding 2):** Owner must confirm whether K2.2 selects a global validator, per-operation validator, or only the enforced subset per operation.
3. **Takeover vs admitted action (L94):** `A takeover that advances the writer epoch does not, by itself, cancel a publication that has already been admitted` is a reasonable consequence of `fenced independently` (`concepts/actions.md#L41`), plus `mechanisms/actions.md#L45-50` responsibility outlives withdrawal and `identity.md#writer-epoch` fencing entire Outcome acceptance. No owner explicitly states the takeover/admission interaction. Confirm that explication is intended or soften to restate independence without lifecycle example.

No STATUS ERROR found: concept page correctly carries no Status line, preserves dispatcher TODO (L94) and validator TODO (L43), states multi-approver optional (L154), and does not claim K2 shipped. K2.1–K2.4 remain PLANNED per ledger; K1 refuses Effects per `execution-cycle.md#L85`.

### Original-content coverage

* **Preserved:** All ten canonical sections and order; five operation parts including identity stability, schema, supported features + TODO, exact meaning, certainty; Effect one-ness, two families (service/governed-read → operation; human-input/child/message → own shapes, no operation), Emission≠Effect, proposal-key→Effect-ID binding and same-Outcome wait by local key; logical-action/intent atomicity and crash-obligation rationale; admission under authority/policy/consent, dispatch ownership independent of writer epoch, attempt-before-send/no-receipt-proof, unknown-operation/invalid-input refusal, consent-consumes-no-attempt, business-refusal as observation; four settlement dimensions and non-collapse rule, unknown-as-disposition, elapsed-time/prose/absence rule, refinement appends evidence revision + Event, no last-write-wins, denial-without-attempt ≠ external failure; principal≠Execution, authority-ceiling/policy-present/grant-record, delegation intersection, separate powers, correlation/cursor/user_id denials; exact-consent four bindings, Plan-A/standing-intent/feedback denials, shown-vs-sent gap, post-approval encoding/mutation rules, hash rule, one-action + safe-retries scope, approval-vs-disposition separation; exposure≠grant, Skill/request, content-is-not-authority, mediation path, ambient/native, telemetry≠prevention, LLM-refusal/log rule, isolation/mediation independence; withdrawal vs correction, withdraw/invalidate-before-admission, revocation-vs-admission ordering, admitted-may-still-execute, expiry-before/after-send, wait-clock separation, compensation as new action, saga ownership; Emission/terminal-result/provisional, output obligation available-to-read, publication-intent former-name warning (retained in HTML comment), external delivery as mediated work pending-after-COMPLETED, observation-does-not-send-input.
* **Intentionally unnecessary (correctly omitted/compressed):** `such as an Activation paired with a local key` representation example — omission avoids freezing API/wire spelling per `identity.md` (`Names below are conceptual`); Responsibility parenthetical illustrations (child-transfer, cancelled-unknown) — mechanism pages own worked cases; `Invocable` adjective — not a term; full worksheet disposition value enumeration — dimensions are conceptual, abbreviated illustration acceptable.
* **Moved/delegated appropriately (with correct owner links):** Effect-array independence → `mechanisms/actions.md#retrying-an-action`; consent binding/mutation/preview → `mechanisms/authority.md#exact-action-consent`; revocation ordering → `#order-revocation-against-admission`; content guard → `#content-is-not-authority`; isolation independence → `deployment.md#trust-and-containment`; completion accounting → `mechanisms/lifecycle.md#completion-is-an-accounting-check`; settlement refinement → `mechanisms/actions.md#settlement-and-refinement`; output acceptance/replay/retention/delivery → `mechanisms/output.md`.
* **Genuinely missing:** None. No section or required definitional sentence is absent in a way that creates a semantic hole. Former-name warning survives (as comment); restoring it to visible prose is editorial, not semantic.

### Overall result

`CORRECTIONS REQUIRED`