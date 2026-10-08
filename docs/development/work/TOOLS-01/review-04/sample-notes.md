# Review 04 sample readings — TOOLS-01 at C `28258b28`

The selection is in [sample.json](sample.json), made by [sample.py](sample.py). Every line number below is
in the file at C `28258b282532b36eef8fb1571d79b6343b54427b`, which is byte-identical at B for every
`packages/` path (preserve list). I read each test and the helpers it calls. Under owner choice 08 rule 1,
an entry is correctly held when the V-ENV recipe or detector really matches its run set; whether the test
observes one of invalidation-03's four claims is BINDING-01's to classify. The last column records that
too, as a note for BINDING-01.

A first draw used one "new leaf" stratum (quota 3) and drew three `fault-oracle` child-process leaves.
Before I read any entry, I split that stratum by detector kind (C1, C2) so that other detector kinds
were sampled. While doing that I set stratum E's quota to 1 by mistake, so the total was 9. I restored E
to 2, its original quota. Seeded order does not change with the quota, so E's two keys are the same two
the first draw picked. The first draw's other strata were identical.

## Ten of the 188 rule-1 entries

| Entry (stratum) | Match at C, in the bytes | Real? | Observes a V-ENV claim? (note for BINDING-01) |
|---|---|---|---|
| `recovery-ambient.test.ts:259:7` (A) | The generated test calls same-file `runCase` (`:192`), which deletes and defines `Object.prototype.resultingEpoch` (`:196`, `:213`) | Yes | No: DEC-8 recovery-history reads under an inherited field |
| `values.test.ts:1323:3` (A) | `Object.defineProperty(Array.prototype, "0", …)` (`:1325`) and its `delete` (`:1333`); asserts `canonicalize` output bytes under the inherited index | Yes | Yes: claim 1, serializer output independence |
| `host-members.test.ts:166:3` (A) | `inherit(Object.prototype, "isSafeToReplace", …)` (`:175`); helper `inherit` writes `Object.defineProperty(holder, key, …)` (`:44`) | Yes | No: DEC-8 host-member lookup (`unsafe_replacement`) |
| `case:oracle.outcomeStepAt` (B) | `tests/tooling/oracle-probe.mjs` imports `spawnSync` (`:3`) and starts `node --test` (`:11`); its input file `fault-oracle.test.ts` spawns its child at load (`:98–114`) | Yes (match 4, unread child) | No: a tooling mechanism control |
| `fault-oracle.test.ts:320:3` (C1) | The file's load-time `child([...])` calls `spawnSync` (`:99`, `:112`, `:114`); the test reads `examples` that run produced | Yes (match 4) | No: oracle classification |
| `dispatch.test.ts:178:3` (C2) | `(Number as unknown as Record<string, unknown>).isInteger = () => true` (`:184`) and the restore (`:192`): a cast write | Yes | No: dispatch validation reads its captured primordial |
| `dispatch.test.ts:1529:3` (C2) | `(Object.prototype as Record<string, unknown>).bound = 1` (`:1533`) and `delete` (`:1539`) | Yes | No: dispatch envelope own-member read |
| `ingress.test.ts:459:3` (D) | `(payload["__proto__"] as Record<string, unknown>)["x"] = 99` (`:475`), where `payload` is `JSON.parse('{"__proto__":{"x":1},…}')`, an own data member | Syntactic match only: the receiver is a plain object, not an intrinsic. Design 06 R1-01 treats any `__proto__` member chain as intrinsic; over-inclusion withholds credit, never grants it | No |
| `case:realm.pin-forms.JSON.assign.full.frozen-intrinsics` (E) | Runs `tests/tooling/realm-probe.mjs` (a V-ENV recipe `files` entry, which spawns a child, `:13`) on `pin-forms-probe.mjs`, which pins and assigns `globalThis.JSON` under `--frozen-intrinsics` (`:15–27`) | Yes | Yes: the invalidation-03 global-binding hop |
| `case:realm.kernel-lexical-shadow.Array` (E) | Same probe on `kernel-lexical-shadow.mts`, whose `let Array = …` lands in the global declarative record that `canonicalize` consults before `globalThis` (`:4–15`); recorded canonical bytes change | Yes | Yes: the declarative-record hop. Its input also holds a Proxy (`:22`); the register attributes that only in reason text, as at the previous H |

All ten are held for a real match. One is a syntactic over-inclusion, which the design accepts and which
costs credit only. Three of the ten observe a V-ENV claim; the other seven are held by the owner's
conservative rule, as choice 08 §2 intends.

## Five of the 18 relinked closed origins

For each, [limits_relinks.py](limits_relinks.py) checks that the closure context is unchanged, that
every member routes (refused → linked target; held or superseded → linked witness of the matching kind),
that each added link is a `held_witness` whose members are `held` and registered under its claim, and
that each removed target is replaced by a held witness on the same current leaf. I read the bytes as below.

| Origin | What it is | Relink at C | Bytes at C |
|---|---|---|---|
| `artifact-a8dc74e5…` | Helper `sweep/fault-scenarios.ts` at `66bc0411`; consumer `kernel-sweeps` | `target.fault-sweep.49.1` → `witness.fault-sweep.49.1` | `fault-sweep.test.ts:49:1` runs its scenarios in a child (`spawnSync`, `:50`): match 4 is real. Context 1–306 is the whole pinned file |
| `artifact-febb180b…` | `creation.test.ts` at `66bc0411`, whole file | +3 witnesses: `creation:333:3`, `:516:3`, `:1009:3` | `:333` writes `Object.prototype.toJSON` through a cast (`:337`); `:1009` calls `setProtoFields`, which writes `Object.prototype[key]` (`:1003`); `:516` is the `__proto__` over-inclusion (`:541`). Context 1–1067 = whole pinned file |
| `artifact-510be2a0…` | `ingress.test.ts` at `66bc0411`, whole file | +1 witness: `ingress:459:3` | The `__proto__` over-inclusion above. Context 1–864 = whole pinned file |
| `artifact-ce2e6984…` | K1.1 review-01.md:62, K11-R1-VAL-01 (own `__proto__` retention), at `9fd2faa7` | `target.creation.516.3` → `witness.creation.516.3` | The creation-path case is now a held witness through the over-inclusion; the value and Activation paths still close by credited targets `values:177:5`, `values:207:5` and `dispatch:448:3`. Context 53–73 unchanged |
| `artifact-210dd0aa…` | Helper `harness.ts` at `9fd2faa7` (consumption closure) | 8 targets → 13 witnesses on the same 8 leaves plus their other pins | Every replaced leaf's file imports `./harness.ts` (`creation:30`, `dispatch:45`, `values:31`, `poison-catalog:37`); `poison-catalog:291:3` reaches `sweep/poison.ts`, whose module-scope `HOLDERS` stores four prototypes (`:75–80`) that its installer then redefines. 87 target links remain, none to a refused target |

All five keep a valid route. Four of them (`febb180b`, `510be2a0`, `ce2e6984`, `210dd0aa`), and three
other relinked origins (`0f12d86d`, `6c57cc9d`, `ecb10ef9`), now rest partly on `creation:516:3` or
`ingress:459:3`, the two former `not_held` entries that the `__proto__` alias rule captures. Their earlier readings ("an own data member named `__proto__` on a plain JSON object") stay
as notes for BINDING-01, as choice 08 §2.2 directs. If BINDING-01 reclassifies them `not_held`, those
closures must be re-bound to targets. `witness_records` and `origin_closure` would then refuse the stale
links, so the change cannot pass silently.
