# DRAFT owner decision — Coordinator responsibilities (brief d; F03, F11, F12, F13, F15, F16)

Not adopted. No hold is lifted and no packet is released by this draft.

## Proposed adoption

Commission a behavior-preserving coordinator ownership refactor: pure plan construction, narrow owned apply, capability lifetime and read-only projection boundaries. Do not select K1.3 semantics in this decision.

## Options, evidence, claims and closure


`coordinator.ts` has 2,471 physical lines at B ([census](../measurements.json)). Size alone is not the defect: construction, capability checks, retained evidence and mutation are interleaved across public methods. The [responsibility map](../coordinator-map.md) traces authority/grant, history, read and commit findings to the actual code and canonical owners. A module split that leaves the same cross-calls and mutable record access would preserve the families.

| Option | Benefit and cost | Claims affected | Finishable follow-up |
|---|---|---|---|
| Keep class, strengthen declared invariants | Lowest relocation cost; preserve current single synchronous decision path. Require per-method complete-decision tests and inventories; every new control still repeats ordering/evidence obligations. | No semantic change. DEC-8/9 and submission ordering remain binding-specific requirements. | Enumerate decision branches and permitted whole effects for each existing method; distinguishing mutants for auth/content/replay/stale ordering, history and positions; source changes update inventories. |
| **Recommend pure planning plus owned apply and projection boundaries** | Captured request → authority/identity decision → immutable planned change → narrow state owner applies → projection/delivery. Separate capability lifetime, evidence/history and inspection builders. Costs type/API refactor and differential corpus, with reentrancy checkpoints preserved. Prevents some mistakes by denying planners/projections write access and denying apply caller references. | Preserve existing operation/refusal precedence, attempt grant lifetime, exact receipt/replay identity and no-caller-code commit window. Does not decide waits, Effects, persistence or K1.3 semantics. | Module dependency check denies raw mutable state outside owner; plans contain only owned data; one apply path updates all coupled fields and appends; all existing complete-decision scenarios unchanged; callback reentrancy rechecks state; deliberate bypass mutants fail. |

Structural guarantees possible: authority decisions cannot be synthesized from visibility alone; history variants own their required fields; all coupled retained facts enter one plan; inspection has no state writer. Remaining obligations: the authority policy and plan contents can still be wrong, allocations can fail, delivery occurs after commit, and isolation is absent. Types plus module ownership reduce the search surface; they do not prove all outcomes. Recommend a dedicated behavior-preserving refactor before adding further coordinator responsibilities, only if the owner releases it after choosing A. Do not block unrelated work by inventing a universal “clean architecture” prerequisite.

The owner may retain the keep option or select the listed alternative. A future acceptance is independent of this recommendation.
