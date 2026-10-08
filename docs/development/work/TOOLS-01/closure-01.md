# TOOLS-01 closure 01 — step 8 for the revalidation origins (item 3)

2026-10-05. Claude Code (`claude-opus-5-5`), implementer. Item 3 of the continuation request under
[owner choice 04](owner-choice-04.md), with [owner choice 05](owner-choice-05.md) taken during it.
Parent `4bd40b4f`. Incremental checkpoint; no final C/H, independent acceptance or hold release.

## Imported

- **391 suite targets** and their 391 behavior records. 378 are the step-8 targets that kept suite
  routing in [repair 03](continuation-repair-03.md). 13 are new targets on current leaves for fence,
  probe and helper origins, each passing P1-T at `4bd40b4f`: evidence 77:3 and 168:3,
  creation 516:3, fault-sweep 49:1, fault-oracle 151:1, poison-catalog 291:3, aggregate-refusal
  100:1, two activation-identity 46:3 leaves and four exact-coordinates 17:3 leaves. New targets
  name no historical member.
- **199 witnesses**, one per held or superseded member, as generated in repair 03.

## Closures: 110 of 154 origins complete

Each closure records its context mechanically: the minimum range, every named sealed record
(transitively, whole file), and a category reason for each other candidate. There are five fixed
reasons: revision, Layer-3 page, production or tool source, test-side path, directory or other path.
That gives 116 ranges and 139 candidates, of which 131 are reasoned.

| Origins | Count | Rule |
|---|---:|---|
| Test-file origins | 66 | Link every target bound to a refused member, and the witness of every held or superseded member. |
| Fences and probes | 12 | Link the targets and witnesses on the tests their revision-2 rationale names. Those records gain the fence or probe as an origin. |
| Helper and sweep modules | 14 | Link every validated target whose file imports the module statically at C (design-04 check: a helper earns credit only through a consuming target). fault-child and fault-scenarios link the fault-sweep target, which spawns them. `sweep/poison.ts` has one consuming leaf, poison-catalog 273:5. That leaf is held under V-ENV, so the module links its witness. |
| Live-provider canaries | 6 | `non_executable`, reason `policy`: owner choice 01's not-run `live-provider` profile keeps their commands. |
| Case origins | 3 | Link their 43 registry cases (29 oracle, 10 built-in, 4 freeze witness). |
| Non-executable | 9 | Revision-2 reason kept after reading each source line: 3 historical command lists, 2 superseded interface sketches (policy), 4 run-count and lineage records. |

**Not closed (44):** the four origins of owner choice 04, and the 40 of owner choice 05 (38 whose
context the resolver refuses, and the two sweep runners only `kernel-sweeps` executes). The 40 are
listed with their causes in
[transferred-origins.json](owner-choice-05/transferred-origins.json). Of the 77 case pairs, 43 sit in
closed origins and 34 in transferred ones. All 77 still run in the registry's mutation step.

The closures, the witness records and the target bindings were checked in-process against the
assembled manifest (`origin_closure`, `witness_records`, `counterexample_table`): 110 complete,
0 errors. The commit message reports the full corpus run at the commit.

## Limits

A linked target's discrimination is a recorded reading, not a kill. A helper's closure claims
consumption by validated targets, not coverage of every helper path. The transitive context rule and
the item-1 reference language are unchanged (owner choice 05). No Kernel behavior, hold or Layer-3
text changes.
