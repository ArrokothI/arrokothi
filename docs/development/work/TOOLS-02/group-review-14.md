# Group review 14 — round-7 remaining routes

2026-10-30, Codex GPT-6 implementer, owner choice 10, current source `6c9bb219`.
The whole pinned runner and sealed output were read in group-review-13. This
completes the reading of origin 697; P1-M binding/build remains outstanding.
**Five new-test groups, 74 adoption cases**; seven cases from this family await
building, along with R1–R6's variants of the existing host-member cases.

## Additional cases

| Member | Current required result / existing passing leaf |
|---|---|
| R11 | boundDiagnostic clips with its captured primitive, without post-load String/prototype lookup. The original anchor remains unique. ambient-reads inventory rule asserts the distinct clipping decision; no current registry mutates it. R8 governs a different renderer operation. |
| R12 | Takeover observes the request through captureAttempt, without an extra direct optional writerEpoch read. Original anchor remains unique; ambient-reads inventory rule asserts this input-observation decision. No current registry covers the extra read. |
| C8 | No host callback after the takeover basis is bound. The answer-building anchor remains unique; requestTakeover's current planner rule forbids the late hostMember call. Negative control 25 covers the same basis rule, but no production-registry case does; callback-inside-apply governs another operation. The complete-decision oracle explicitly cannot see C8's boundary-invisible form. |
| C10 | mintSubmission changes no module state before the hand-over. The original anchor remains unique; requestTakeover's planner rule and negative control 17 assert the result. No current production-registry case covers it, and the complete-decision oracle explicitly cannot observe its unused counter. |

These are four distinct P1-G decisions, not one case merely because two share a
rule leaf. All have existing passing leaves; no new behavior test is planned.
Current anchors and individual absent-span counts: [applicability 14](family-applicability-14.json).

## Individual remaining relocation readings

COORD-REFACTOR-01 design 01 replaces coordinator-local mutable records with readers,
prebuilt plans and owner arms. A TypeError from assigning a reader getter is not a
substitute mutation. The live ordering/atomicity obligations stay at the owner.

| Member | Original site and current route |
|---|---|
| C1 | The old this.#mint helper is removed. Receipt construction is pure; its acceptance-index write moved into #applyTakeover. Current TAKEOVER_APPLY prescribes exactly one increment, and oracle.nextAcceptance/takeoverAnswer independently compare the complete decision. Retire the removed helper shape only, retaining this live owner route. |
| C2 | The position read remains but record is now a reader; postfix mutation there cannot reproduce the former early state change. Re-anchor the obligation to #applyTakeover's index write. The complete-decision oracle independently fixes nextAcceptance and the consecutive apply sequence. |
| C3 | Same moved index decision with compound assignment; its separate syntax is retained by current prepare-phase negative control 1–2. The independent nextAcceptance/applySequence route is the same as C2. |
| C4 | The old coordinator receipt append disappeared; its receipts reader returns a copied list. The live early-append decision is the owner arm's first append. TAKEOVER_APPLY fixes the append/clearing/write order, and whole-view/position comparisons reject partial append states after an injected failure. |
| C5 | Same owner receipt decision through a container; current negative control 9 retains the alias variant. No retirement merely because the old append span is absent. Independent complete-decision evidence remains as C4. |
| C6 | Coordinator's exchange is a reader; submission writes moved into the takeover owner. The current owner-prepare closure control retains the syntax, while setupGrant, whole-view and takeover apply-sequence checks distinguish a retired grant before a complete decision. |
| C15 | Logical-assignment alias targets the same moved submission write as C6. It cannot regain write authority through the reader. Preserve the variant under the owner boundary and independent setupGrant/apply sequence, not a reader assignment exception. |
| C16 | Its local mapSet declaration anchor is absent after the refactor; a constructed object cannot obtain the live receipt list from the coordinator reader. The live list remains private in state.ts. state-owner.view-aliases-state and write-outside-apply mutate the leak/bypass boundaries; whole-view/applySequence protect the owner's receipt decision. |
| C7 | The old append span is absent and the reader supplies a copy. The current owner negative control 21 retains the unknown/string/helper laundering form; the same receipt decision is independently fixed by TAKEOVER_APPLY and complete whole-state comparison. |
| C9 | The receipt anchor now also occurs at dispatch; scope the reading to takeover's writerEpoch=currentEpoch+1 region. A refusal without return still changes nextRefusal before an accepted takeover. oracle.nextRefusal and the complete accepted-decision comparison reject it; planner negative control 18 also retains the exact case. |
| C11 | Both old append/delivery spans changed. The current boundary is state.apply(plan), then #deliver(exchange), then return answer. TAKEOVER_HANDOVER/TAKEOVER_APPLY independently require that suffix, and oracle.deliveredAt constrains the allowed delivery state. The old before-append delivery cannot be dropped solely for missing anchors. |
| C12 | The reason prefix remains but the exchange is a reader; its old direct hold write no longer reaches state. Current #applyControl builds its History before the fixed History/hold suffix. The state-owner write boundary and dropped-coupled-field control preserve that current obligation; source-read control rules retain the ordering check. The old coordinator mutable-record subject is replaced, not reopened through a reader setter. |
| C13 | Explicit duplicate of H7. The removed applyControlCommit spellings re-anchor to state.apply and the late recovery answer; state-owner.tools02-h7 now has a valid control and qualified structural kill at b804e986. Share that case. |
| C14 | Explicit duplicate of H3. History/hold writes moved to #applyControl; control 27 retains the swapped-write variant. The complete-decision refusal/fault comparison and the state-owner dropped-history case retain atomic History/hold evidence. Share the H3 reading; final binding still required. |

These are final-reading plans, not generated P1 closure. The independent oracle
reads include TAKEOVER_APPLY, sequence's end-of-body/consecutive-statement checks,
CHECKS.nextRefusal/nextAcceptance/setupGrant/deliveredAt, and their registered
mutants. No new registry execution occurred in this reading; all measured adoption
runtime remains **250.717 seconds**. No product/historical evidence or derived
adoption fields changed.

Resume origin 698, `K1.2-correction-01/ablations.mjs:1`,
`artifact-defc1c19533790036d5d14f3`, then source order. Owner choice 10 authorizes
continuation to 1,031; test and measured-runtime stops remain. No final C/H or CI.
