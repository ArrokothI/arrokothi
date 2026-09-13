# Independent review — K0.2, round 14

## Reviewer, date and reviewed identity

- **Reviewer:** OpenAI ChatGPT, GPT-5.6 Sol, High reasoning.
- **Role:** accountable independent reviewer. I did not implement C13/H13.
- **Review date:** 2026-09-12 (America/New_York).
- **Governing base:** `c079237ee7aff428481426f93e87a68b79f170d4`.
- **Prior reviewer record A13:** `452717dfb4a8d4984bbb4a709a9c8a7a3d3c4401` (`review-13.md`).
- **Clean payload C13:** `442a3b93099a193d3acef640e0ea2807497dbce1`.
- **Reviewed candidate H13:** `ec8d8cf03583bef925551352df820802a20990ef`.
- **Branch:** `codex/k0.2-public-controls-e0-gate`.

This review is bound to H13 exactly. The commit containing this review is administrative provenance and is not part of H13.

## Access and validation limits

I reviewed through the authorized GitHub connector: exact A13→C13 and C13→H13 histories, cumulative base→C13 inventory, the accepted K0.1 worksheet, K0.2 contract revision 13, scenarios, candidate port/runner, coverage map, blind-spot regressions, interactions, protocol vocabulary, implementation-13, H13's immutable validation logs, the authoritative 007 row and the current benchmark E0 branch/evidence record.

I had no local shell and did not independently rerun C13 commands. Validation below is therefore inspected immutable implementer evidence, not a reviewer rerun. I independently checked the semantic corrections in source rather than accepting the implementation report as proof.

## Identity and handoff verification

The round-13 correction handoff is clean and linear.

- A13 → C13 is exactly one payload commit. It changes nine K0.2 contract/specification/conformance files and no unrelated implementation surface.
- C13 → H13 is exactly one administrative/evidence commit. It contains `docs/development/007-work-packets.md`, `docs/development/work/K0.2/implementation-13.md`, and six output-only logs under `validation-13/`. No script, fixture, evaluator rule, threshold or configuration rides in H13.
- H13's direct parent is C13, and the advertised remote branch pointed to H13 when inspected.
- The cumulative base→C13 tree remains the K0.2 development/conformance family plus the packet's historical records.

## Round-13 finding dispositions

### K02-R13-01 — writer-epoch over-constraint — **CLOSED**

C13 removes the cross-exchange value policy from the fixture rather than choosing one of ID-4's implementation-owned representations.

`EpochRelation` is keyed by the laboratory Activation ID, so epoch relations are enforced **inside one semantic exchange only**. Within that exchange, an expected attempt ordinal must map consistently to one candidate value, a later ordinal must map to a greater candidate value, an earlier ordinal to a smaller value, and distinct ordinals cannot collapse. A different Activation ID starts an independent epoch relation. When there is no unresolved Activation, the runner asserts no epoch relation at all.

The schedule now uses exchange-local attempt ordinals. More importantly, command delivery is adapted in the opposite direction too: before `submit_outcome` or `resubmit_outcome` reaches a candidate, the laboratory Activation ID is resolved through the Activation relation and the laboratory epoch ordinal through the matching exchange's Epoch relation. The runner fails closed if either mapping does not exist. This also closes the implementer-discovered sibling defect that submitted Outcomes previously carried the laboratory Activation-ID spelling even though the candidate minted its own token.

The correction preserves the relations ID-4 actually fixes: ordinary redelivery retains the attempt, authenticated takeover advances it under the same Activation ID, and the superseded attempt remains stale. The regression family additionally drives multiple conforming cross-exchange conventions through every scenario and separately rejects takeover-that-does-not-advance and backwards-takeover candidates. `interactions.test.ts` checks the corpus itself no longer states a cross-exchange ordinal relation.

**Reviewer judgment on the report's question:** treating different semantic Activations as unrelated epoch namespaces at the fixture port is correct. ID-4 explicitly makes reset-versus-continuation across a later new Activation implementation-owned and separately leaves the concrete epoch representation open. The fixture therefore should not infer a cross-exchange numerical relation from either example. The candidate still must provide an ordered fencing value *within the current exchange*, which C13 tests. This is implementation-neutrality, not a weakening of stale-writer fencing.

C7's representation-neutrality obligation is restored, and the epoch portion of C9 no longer rejects a conforming implementation-owned choice.

### K02-R13-02 — R5-c2 empty-dependency ownership — **CLOSED**

C13 splits the two independently violable W-2 step-2 clauses rather than relabelling the old transcript.

- R5-c2 now owns the general mailbox-check/lost-wake rule on the dependency-bearing `waitOnCorr1` schedule.
- R5-c2b owns the empty-dependency shortcut on `identity-producer-scope` step 8, where the proposed wait has `dependencies: []`, a valid `continue` subscription and two already-accepted, still-unacknowledged eligible inputs. The conforming result is immediate Event-triggered B-6 path-A readiness.
- The regression's shortcut candidate misbehaves only when an accepted immediate path-A registration has an empty dependency list. It must fail at that registration and is required to pass the old R5-c2 dependency-wait scenario and every other scenario. The regression also asserts the schedule preconditions themselves, so the owner cannot drift back to a non-empty wait while retaining the same label.

This is the discrimination Round 13 required. The self-found R5-c2c split is also sound: W-2 step 2 ending the wait on an already-accepted Event must not mint a timeout Event for the generation that did not end by deadline; its counterexample changes the timeout/mailbox fact at that existing path-A schedule.

## New finding

### K02-R14-01 — P1 — cited-decision reconstruction is still incomplete

**Affected criterion:** C9.

Round 13 did not promote the supplementary decision-inventory note to a finding by itself, because some named clauses might legitimately be outside the released observation surface. It did, however, make the required corrective outcome explicit: because R13-02 reopened the repeatedly corrected coverage subsystem, the correction self-review had to **re-audit the cited-decision clauses and record why any unowned clause is outside K0.2 or assigned elsewhere; do not silently add or silently omit obligations**.

C13 adopts the same rule into the live C9 contract: an assertion is read from the decision a §11 row cites rather than only from the row's illustrative parenthetical, and a cited-decision clause with no K0.2 observation surface is **assigned, never absent**. The new R5-c6/R5-c7 and R1-f entries correctly apply that rule to W-2's accepted-time clauses and ID-1 deletion/non-reuse.

But the reconstruction stops there. The authoritative coverage map still has independently distinguishable clauses that the governing §11 rows cite and that resolve to none of C9's four allowed evidence forms. The following are concrete examples, not a string-matching exercise:

1. **Row 3 cites OA-1–OA-6, but OA-1 and OA-6 have no owner.** OA-1 requires authentication and Execution scoping before content inspection. K0.2's Outcome-submission command has no submitter/principal dimension, so this cannot be discriminated by the current scenarios and needs an explicit later assignment if the vocabulary is not extended. OA-6 requires an invalid Runtime response that cannot even be classified as reject-with-reason to end/hold under an inspectable recovery decision rather than enter a hidden retry loop. The typed `OutcomeEnvelope` surface and current recovery control do not create that case. Neither clause appears as scenario/shared/corpus/assigned evidence in `coverage.ts`.
2. **Row 4 cites EF-1–EF-4, but the K2-scoped EF-3/EF-4 clauses are silently absent.** The map correctly proves K1's EF-1/EF-2 whole-envelope refusal and explicitly assigns later Effect receipt boundaries, but it does not assign the four action-fact dimensions / K2 negative cases that EF-3/EF-4 deliberately preserve so K1 cannot foreclose them. The worksheet itself says K0.1 does not implement/test those mechanics and K2 does; that is precisely a reason for `assigned`, not omission under C9's current rule.
3. **Row 5 cites CL-1–CL-3, but CL-1 has no owner.** CL-1 requires wait deadline, Execution deadline and scheduler lease to remain independent identities rather than one generic deadline/timer field. K0.2 exposes wait-deadline behavior but has no Execution-deadline or scheduler-lease command, so the cross-clock conflation cannot be distinguished here and needs an explicit later owner. The new W-2 clock assignments do not own this separate three-clock assertion.
4. **Row 7 cites CX-5 and row 8 cites CX-4, but neither has an owner.** CX-5 preserves a late authenticated settlement after cancellation without reopening the Execution; CX-4 distinguishes unresolved/unknown external work that bars completion while still permitting cancellation. K1/K0.2 refuses Effects and therefore cannot create the admitted/unknown/settled work those clauses require. Their absence is a legitimate scope fact, but under C9 it must be recorded as an assignment to the later action/settlement packet rather than silently disappearing from rows that cite them.
5. **Row 9 cites PC-1–PC-5, while the map owns only the PC-4/PC-5 unavailable-code/resource result.** PC-1 distinguishes three progress forms; PC-2 fixes checkpoint publish-before-reference/pinning; PC-3 distinguishes a mutable native session locator from an immutable checkpoint and requires explicit ownership/reconciliation before automatic takeover. The K0.2 fake fixture does not expose checkpoint publication or native-session ownership, so those clauses need explicit later ownership rather than an implicit assumption that the PC-4/PC-5 recovery-hold scenario covers the entire cited decision family.

These omissions are independently violable and cannot be defended by neighbouring evidence. A candidate can satisfy OA-5's zero-partial-state transcripts while inspecting unauthenticated content before scope; it can pass every K1 Effect-refusal scenario while a later Effect design collapses EF-3's dimensions; it can implement wait deadlines correctly while using the same field for an Execution deadline/lease; and it can produce the correct missing-code hold while representing mutable native sessions as resumable checkpoints. That is exactly why C9's allowed `assigned` evidence kind exists.

This is **P1** rather than P3 because C9 is a required gate and this packet's own correction rule says silent omission is not coverage. It is also the same repeatedly corrected subsystem: Round 13 specifically required the re-audit after another coverage defect, yet implementation-13 describes the dependent decision sweep as W-2, W-8 and row 1 rather than closing the remaining cited families.

**Required outcome:** reconstruct the cited-decision inventory across all ten §11 rows, not only the examples above. For every independently distinguishable clause in a decision family that the row cites, record exactly one truthful disposition under C9's existing model: scenario/step/counterexample, justified `shared`, corpus check, or explicit `assigned` packet/reason where K0.2 has no observation surface. Do not add synthetic commands or scenarios merely to avoid an assignment, and do not treat a decision label's presence as automatically requiring a new test when its concrete assertion is already genuinely owned by another entry. Add a mechanical or reviewable guard against future silent omissions if one can be derived without making the decision parser itself a second semantic oracle.

Because this is another defect in the same reconstructed coverage subsystem, apply 012's semantic-correction closure again and report why each newly assigned clause cannot be observed in K0.2. The examples above are a lower bound, not permission to stop the sweep after adding those names.

## Other correction review

The round-13 P3 documentation cleanups are sound. The 007 introduction no longer carries a stale round count, the public fixture specification's violating-transcript total is reconciled to 110, and its discrimination wording accounts for the deliberate ledger-only case.

The implementer-discovered Activation-ID adaptation is accepted as part of R13-01 closure. The additional row-1 ID-1 assignment to K5.2 and W-2 accepted-time assignments to K1.3 are directionally correct examples of the disposition K02-R14-01 now requires comprehensively.

I found no reason in this correction to reopen the earlier closed deadline lifecycle, B-6 path-B cleanup, producer-scoped ID-2, receipt-family separation, cancellation atomicity, operation-ledger independence, or delayed-Runtime findings.

## Validation evidence

H13 contains immutable output about clean C13:

- `npm run typecheck`: exit 0 / no diagnostics in the attached log.
- `npm test`: 1540 tests / 266 suites / 1540 pass / 0 fail / 0 skipped.
- `npm run test:conformance`: 1431 tests / 248 suites / 1431 pass / 0 fail / 0 skipped.
- K0 fixture command: 575 tests / 55 suites / 575 pass / 0 fail / 0 skipped.
- `npm run test:sdk`: 22 pass / 0 fail / 0 skipped.
- `npm run check:builder-docs`: 26 Markdown files, 280 local links/anchors, 38 public package imports.

The report records Node v25.2.1, npm 11.6.2, TypeScript 5.9.3, macOS darwin 25.6.0 and no dependency changes. The full-suite non-K0 count remains 965. I inspected these pinned logs but did not rerun them or independently recompute every SHA-256 digest.

## C8 current external state

C8 remains `BLOCKED_EXTERNAL`.

Benchmark `main` is still `98756f8c10bd806125da8318f1a129bc030aca61`. The E0 branch remains `e0-claims-ownership-and-public-controls` at `5f921f9b415407fe3bdff43a545878437ac31a93`. Its evidence record provides versioned fixture/observation identities and a deterministic mechanical gate `PASS`, but still records `ownerDecision.state: "pending"` and states explicitly that the mechanical result neither supplies nor implies E0 acceptance.

Therefore H13 correctly declines to bind C8 as passed. The responsible actor remains the benchmark repository owner; the unblock condition remains an owner-accepted exact E0 revision with the required identities, observations, evaluator version and actual decision independently inspectable.

## Per-criterion verdicts

| Criterion | Verdict | Round-14 basis |
|---|---|---|
| K0.2-C1 | **PASS** | K0 trace remains coherent; epoch port correction removes rather than adds a trace policy. |
| K0.2-C2 | **PASS** | Delayed Runtime / second-Execution evidence remains sound. |
| K0.2-C3 | **PASS** | Independent sink/ledger evidence remains sound for the accepted E-1 domain. |
| K0.2-C4 | **PASS** | Direct-baseline/shared-laboratory specification remains sound. |
| K0.2-C5 | **PASS** | Both public application shapes remain prepared without claiming E0 acceptance. |
| K0.2-C6 | **PASS** | Unsafe/state-loss controls remain sound; R5-c2c adds a valid distinction without changing their semantics. |
| K0.2-C7 | **PASS** | K02-R13-01 is closed: epoch and Activation representations are adapted relationally without choosing cross-exchange policy. |
| K0.2-C8 | **FAIL — BLOCKED_EXTERNAL** | E0 mechanical PASS exists only on a branch; benchmark owner decision remains explicitly pending. |
| K0.2-C9 | **FAIL** | K02-R13-02 is closed, but K02-R14-01 shows the required cited-decision inventory is still incomplete. |

## Correction direction

**Fix forward. Do not revert C13/H13.** The Round-13 semantic corrections are useful and should be preserved. K02-R14-01 is an ownership/coverage completion problem in the existing C9 model, not an architecture ambiguity and not a reason to redesign the fixture.

Do not manufacture observable K0 cases for later-only concepts simply to increase scenario count. Where a cited clause genuinely has no K0.2 observation surface, use the existing explicit-assignment mechanism with a concrete later owner and reason. Where the behavior is already genuinely represented under another entry, use the existing `shared` mechanism only if one implementation bug really is the same observable failure.

E0 acceptance can proceed independently. If accepted E0 evidence exists by the time the next corrected K0.2 payload is frozen, the minimum C8 binding may ride that candidate; otherwise keep C8 `BLOCKED_EXTERNAL` honestly.

## Verdict

**CHANGES REQUIRED**

C7 is restored and both Round-13 P1 findings are closed. C9 still has one new blocking local finding, K02-R14-01, and C8 remains externally blocked. Do not self-accept, merge K0.2, close K0 or release K1.0. The next accountable review is round 15 against the next submitted corrected candidate.
