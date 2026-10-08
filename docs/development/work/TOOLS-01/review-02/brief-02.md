```text
Correct the same released packet TOOLS-01 on codex/tools-01 (see Bounds: the branch head needs an owner choice first).
Base f62527e8d564a6e2f63b83cbb52e24053f333540; reviewed H 446dd25820500db4e0eb3d6940ec49e45634f39c; review record docs/development/work/TOOLS-01/review-02.md (on the reviewer's branch until the owner records it).
Open findings TOOLS01-R2-VENV-01 (P2), TOOLS01-R2-HANDOFF-01, -REC-01, -REC-02 (P3); required outcomes and counterexamples are in that record.
Owner supplemental decisions: none yet; GPT-6 review findings of the same H, if any, are added separately by the owner. Unresolved authority: none (owner option (b) of VENV-01 is optional, not a blocker).
Read the brief below first. Answer its design questions in design-06.md; get the design check when
006 requires it. Apply 006 and 012: fix the mechanism, not only the listed counterexamples; add every
counterexample to the corpus; then re-audit the whole cumulative packet. Fix additional in-scope
defects with separate provenance. If the fix belongs in accepted earlier design, say so and ask.
Use 008 for the next report and 006 for new C/H plus evidence/push handoff. No successor release.
```

# Brief 02 — TOOLS-01 (correction after review 02)

## Goal

The V-ENV hold register attributes 44 tests to BINDING-01 by one rule, with no reading of what each
test observes. Eight of ten sampled tests observe no V-ENV claim. The register must say, per entry,
which held claim a test observes, so that held witnesses reach the right correction owner and
TOOLS-01's preserved and target credit is not understated.

## Criteria (finishable)

| ID | Criterion | Closes by | Evidence expected |
|---|---|---|---|
| C2-VENV | Every register entry classified `held` or `superseded` names the held claim it observes, from a per-entry reading or an owner record that adopts a rule for exactly those entries (contract P1-H; [invalidation-03](../../DESIGN-AUDIT-01/invalidation-03.md) "Held claims"). | **Structural mechanism:** `hold_register` refuses a held or superseded entry that names neither a `reading` nor an owner `decision`, and refuses a held entry whose reading or reason states that the claim is not observed. **Declared search:** the 44 entries of [venv-classification.json](venv-classification.json). | Mechanism, its refusal registered and ablated; per-entry readings; counts against 766/125/74/307 and 82 V-ENV witnesses |
| C2-ROUTE | Members whose entries become `not_held` are preserved or bound again. The 19 targets built and P1-T-checked at `4bd40b4f` are imported or refused with a stated cause; `target.dispatch.1363.3.5a8d958ffdab` binds or is recorded. | Deterministic: `corpus` at the new C | Closures and census recomputed; report figures updated |
| C2-LIMIT | Every refused, unbound member of an owner-limited origin is in that owner record's list (owner choice 04 §1's 24, or an owner amendment). | **Structural mechanism:** `transferred_origins` refuses an owner-limited origin whose refused, unbound members differ from the record's member list | Mechanism, refusal registered and ablated |
| C2-REC | The report's authorities are exact (node-floor-04 for the conformance-test edit); new owner-record diffs are `git apply`-able; approvals bind to a committed SHA. | Reviewer check | Report text; `check_records.py` passes on the new H |

## Known counterexamples

Add each as a maintained test or fixture, with provenance "TOOLS-01 review 02":

1. `packages/kernel/tests/host-members.test.ts:166:3` is held under V-ENV while its reason quotes the
   reading "not value capture or its serializer window" (VENV-01). Expected: refused by C2-VENV's
   check, or `not_held` with that reading.
2. `packages/kernel/tests/dispatch.test.ts:1390:3`, "Promise independence", is held under V-ENV; its
   assertions observe no canonical bytes. Expected: classified from a reading. Its consequence is
   the 25th unbound member `dispatch.test.ts:1363:3@5a8d958ffdab`.
3. A fixture owner-limited origin with one refused, unbound member outside the owner's list.
   Expected: refused by C2-LIMIT's check.
4. The review's probes: [venv_classification.py](venv_classification.py),
   [venv_bodies.py](venv_bodies.py), [check_records.py](check_records.py). Keep them as reviewer
   evidence; port their assertions into tooling tests where they guard a rule.
5. The two entries the review found correctly held, `values.test.ts:1728:3` and `:1498:3`, as positive
   controls: the new check must keep them `held` under V-ENV.

## Suspect design

P1-H's closing mechanism (contract revision 7) checks that classification is complete, that each
routing reaches its destination, and that reason text is present. It does not check that a held
entry rests on a reading. A blanket rule therefore passes every check. The same gap would accept
category reasons for the V-D1, Proxy and built-in classes without a reading. The review has no
evidence that those are wrong, but the mechanism cannot tell. This is accepted design (design 05,
D05-CHK-05). The fix belongs in the register check, not in further recipe tuning.

## Questions before code

1. Which of the 44 entries observe each of invalidation-03's four claims? Answer per entry, from the
   test's assertions and the helpers it calls.
2. What does a `reading` record contain so that a reviewer can check it without re-deriving it? For
   example, the asserted facts and the claim each one bears on.
3. Were the V-D1, Proxy and built-in category reasons assigned from readings? State how, as a
   declared bounded check, or put those entries under C2-VENV too.
4. After reclassification, which of the 22 closed origins that link the affected witnesses change
   shape, and do they still close? Do any newly closable members change P1-R's 110?
5. Option (b) instead of (a): does the owner want to adopt the conservative rule explicitly? If so,
   which packet takes the per-test classification, and how does choice 04's "exactly the 24" change?
   Ask before code; do not assume it.

## Bounds

- **Branch first.** `origin/codex/tools-01` is at `fb410cb9`, a replaced sibling of the reviewed H,
  which is local only on `claude/tools-01-h`. The owner decides which head the branch carries.
  Publishing H there needs a force-push, which only the owner may do. The correction's C must
  descend from H `446dd258…`.
- Owner decisions in force: release 01 and choices 01–07. Do not change the area gate, the transferred
  44, the split, P1-T or any hold. Do not edit Layer 3, production, 002 or sealed records.
- The implementer does not edit 007 (choice 02 Q5). Propose status-row text in the report.
- No new dependency or third-party material.

## Stop conditions

- A reading finds a test that observes a held claim the register has never recorded, or a change to
  the hold itself would be needed. Stop and ask.
- Reclassification would close or reopen an origin outside the 154. Stop and ask.
- The C2-VENV or C2-LIMIT check would fail on entries outside the 44 that this brief does not cover.
  Report the count and the classes before changing them.
