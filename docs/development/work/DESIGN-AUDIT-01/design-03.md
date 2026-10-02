Session/model: Codex coding-agent session, GPT-6 per session instructions; exact serving variant unavailable. Access: local repository, Git history and shell; sandboxed writes and restricted network with approved Git escalation. No private owner transcripts, independent acceptance authority or product-edit authorization.

# Design 03 — DESIGN-AUDIT-01

Written before payload edits, 2026-10-02. Governing process: B `66bc041175e6fc191c2e7cf88de198111e7d97c9`, 006/008/012; correction authority: the current owner instruction and [owner choice](review-02/owner-choice.md). Reviewed H `4c1b11e115ad61fbcfeebf83f50bb6a35478ea8e`; clean start `bd1f4464f6aff655d7c22479bfb8cd975ef7b158`. Administrative commit `521b3c8` changed only the audit row, transcribing review 02 and resuming round 3.

## Mechanism

Start closure coverage from the recorded findings, not from runnable probe names. An option-to-corpus reconciliation will derive the required labels from `classifications.json` and each option's family scope, including aliases/self-findings with their provenance. Each option will state how its mechanism addresses that set, which cases become conditional or out of scope, and what remains for successor acceptance. The verifier checks coverage and evidence locators; semantic adequacy still requires reading. This is no claim that a custom checker can prove prose true.

A separate hardening manifest covers all 16 `hostile_only` labels. Executable mechanism probes carry explicit expected observations under `--frozen-intrinsics`; out-of-reach dimensions carry explicit reasons. Every review-02 counterexample enters the maintained run, while its original files remain immutable. Runtime observations and future acceptance gates stay distinct: a known bad output is a passing reproduction, never support for the flawed design.

**Question 1 — hardening reach (clean bootstrap before caller code).** “Stopped” below means the recorded poisoning operation is blocked, not that the whole historical product defect is proven fixed.

| Label | Reach and reason |
|---|---|
| K11-R2-VAL-02 | Not stopped: a Proxy can disagree between its descriptor and ordinary read without changing an intrinsic; retain coherence checks. |
| K11-R5-STATE-01 | Stops replacement of frozen `Map.prototype.set`; whole accepted-decision checks remain necessary. |
| K11-R5-VAL-03 | Flag alone does not stop replacement of the global Object binding inside `getPrototypeOf`; permanent binding pinning would stop that hop. |
| K11-R6-STATE-02 | Stops adding an indexed setter to clean frozen Array/Object prototypes; does not prevent arbitrary envelope getter execution. |
| K11-R6-VAL-04 | Stops installing the inherited indexed scratch-array channel; does not make caller observations coherent. |
| K11-R6-VAL-05 | Stops installing inherited numeric properties on the frozen serializer scratch-array prototype chains. |
| K11-R7-STATE-03 | Stops adding inherited descriptor `get`/`set` fields to frozen Object.prototype; descriptor ownership still belongs to the implementation. |
| K11-R16-VAL-01 | Stops mutation of the frozen Array iterator prototype's `next` and inherited result fields; both hops need probes. |
| K11-R16-DISP-01 | Stops replacing the intrinsic Promise species accessor; caller-owned promises/constructors and delivery settlement still require their own contract. |
| K1.2-correction-01::SELF-R6-HOST-01 | Stops pollution of Object/Function prototypes with `isSafeToReplace`; does not make an own trusted-host callback safe. |
| K1.2-correction-01::SELF-R6-HOST-02 | Stops inherited `controlScopes` injection on clean frozen Object.prototype; preserves authorization checks. |
| K1.2-correction-01::SELF-R6-HOST-03 | Stops inherited `mailboxCapacity`/`emissionsPerOutcome` injection after clean freeze; preexisting pollution must be refused at startup. |
| K1.2-correction-01::SELF-R7-UNSUPPORTED-01 | Stops replacement of Error.prototype.name with an accessor; freezing alone does not repair assignment against a non-writable inherited name. Keep own-field construction and positive controls. |
| K12C1-R9-HISTORY-01 | Stops the polluted Object.prototype.resultingEpoch getter; does not enforce hold/history atomicity or make all getters inert. |
| K12C1-R10-READ-01 | Stops that prototype pollution mechanism, not the inventory's missed destructuring forms; the evidence defect remains. |
| K12C1-R11-READ-01 | Stops that prototype pollution mechanism, not partial/nested type-assertion inventory bypasses; the evidence defect remains. |

**Question 2 — truthful A-hard/B-hard draft.** Draw permanent bootstrap pinning of all eight audited call-time globals (`isNaN`, `isFinite`, `Object`, `Array`, `JSON`, `Set`, `Error`, `Symbol`) plus the relied-on intrinsic graph. Require non-writable, non-configurable own bindings to the expected values before any caller observation, and a source argument covering every dependency ambient read. A startup identity check without durable pinning is insufficient. Try replacements inside coherent Proxy capture, including the recorded `getPrototypeOf` witness. A flag-only control must fail the future gate even if its startup check succeeds. Keep the unmodified JCS dependency; capturing a local variable in the adapter does not change that dependency's free global reads. Capturing at load would require a genuinely closed dependency environment with separate compatibility evidence. Positive encoding and complete-decision controls remain mandatory; this audit implements no replacement serializer.

The alternative is explicitly narrowing V-ENV integrity as well as availability to a cooperative stable realm. Its cost is an amendment to ambient-integrity claims (already identified in owner-decisions-02), with no same-process hostile guarantee. Neither hardening alternative is selected by this audit; the existing canonical-byte drafting direction remains sourced to the owner. Hardening cannot replace coherence checks, the meter, ownership or whole-decision evidence.

**Question 3 — PROXY-01 alternatives.** C-brand and F02K will name the forwarding Proxy witness and leave its future expected result conditional. Answer 1 accepts coherent Proxies as presented: the Map witnesses still produce `{}`, hidden-target changes are not distinct logical presented values, and the restored O-R8-4 refusal claim plus proposed invalidation-01 release condition must explicitly cover non-Proxy values only. Answer 2 refuses the forwarding Proxy witnesses: the interim packet needs an owner amendment of decision-04 item 5 (and the dependent decision-03/values coherence descriptions); internal-slot checks alone do not see through the Proxy, so a separate refusal mechanism and tests are required. Both answers need every root consumer, no partial state change on refusal, replay consequences and appropriate BASELINE/K1.1-correction-03 amendments. Neither lifts or rewrites the historical hold. The later wrapper's unsupported-type claim must carry the same limit or an explicit Proxy refusal policy; the core's bytes rule alone cannot decide it.

**Question 4 — other options and CORE.** Reconcile every option's family counterexamples, especially A/B/C/F02/F09/F10, not just hardening. Keep profiles retain known hostility/cost cases; cooperative/bytes profiles identify which hostile dimensions are outside their proposed guarantee while retaining ordinary snapshots, field identity, meter and fault oracles. Brand/projection/hold alternatives state the Proxy consequence. CORE's hardened column must require permanent binding protection and preserve the unresolved Proxy policy. K11C03 and K14 become narrow under hardening to reflect interim classification and configuration obligations. D/E and F03R/F11R/F12R/F13R/F15R/F16R are core-independent; their owner sequence is recorded separately. Method labels will match the actual proof (finite brand/poison searches remain declared bounded searches).

## Why each criterion closes

| Criterion/source | Strongest wrong result | Closing evidence |
|---|---|---|
| R3-CORPUS / 006 accumulated corpus | Missing hostile label or startup-only flag mistaken for protection | Exact manifest set equality, eight binding cases mid-capture, expected-result assertions and missing-label/binding negative controls. |
| R3-REALM | Unmodified serializer follows a replaced global after startup | Flag-only versus pinned controls plus source audit of ambient reads; positive Kernel support remains unimplemented and explicitly unclaimed. |
| R3-PROXY | Slot checks called complete despite forwarding Proxy | Original reviewer probe asserted; both proposed policy outcomes traced through C/F02/CORE and claim dispositions. |
| R3-KEEP / DA-1–DA-7, brief-02 | Fixing the row hides contradictory dependent claims or rewrites evidence | Whole-packet source/option reading; regeneration; prior regressions; historical-record and exact administrative-diff guards. |
| DEP-01 / CONSIST-01 (separate review-02 P3 provenance) | Correct independent tag rejected; hardening inventory contradicts CORE | M7 accepted; source-faithful ISOLATION paraphrase, matching methods and hardened K11C03/K14 cells. |

Use 012 process/documentation, normative-option analysis, deterministic mechanism probes and declared bounded search. No product implementation, Runtime race suite, benchmark gate or new timing measurement is justified for this audit.

## Accepted designs relied on

values.md, decisions 03/04/05 and DEC-8/9 remain governing obligations, not correctness proofs. O-R8-4 and V-D1 already have holds. Review 02 exposes an unfit audit design (probe-first closure), corrected here by record-first reconciliation. Its binding and Proxy cases refine already-named concerns; they reveal no new unheld claim requiring a new invalidation. All semantic changes remain owner drafts and successor work. Current Node freezing is an observation, not a supported deployment profile. Third-party runtime/documentation and existing canonicalize terms will be inspected and recorded before any reuse; no dependency or SES installation.

## Corpus

Keep review-01 regressions, prior enumeration/catalog/measurement checks, and sealed R8 outputs. Add review-02 global binding, all-bindings, Proxy brand, structured-clone and validator-mutant cases; preserve M2/M3/M5/M6 as declared semantic-reading limits and M7 as an accepted truthful edit. Add the historical 16-label mapping, `getPrototypeOf` trap, the eight mid-capture bindings and prototype channels above. Protect review-02/, review-02.md, owner-decisions-02.md and round-2 historical records against mutation.

## Questions

PROXY-01, wrapper packaging and transport cap remain owner choices for successor amendment/release, with both alternatives draftable here. No answer is required to finish this audit. No stop condition is known to fire. The current owner's instruction explicitly approves continuing past this note unless one does; continuation relies on that instruction, not an inferred earlier approval. Both holds remain; no option adoption, self-acceptance, merge or successor release.
