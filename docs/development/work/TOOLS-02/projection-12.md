# Projection 12 — runtime cap stop at the first complete pass of all adoptions

2026-10-31, implementing Claude Code desktop session (`claude-opus-5-5`), under [owner choice 11](owner-choice-11.md)
and [owner choice 12](owner-choice-12.md). This is an implementer stop record, not a review. TOOLS-02 stays
IN_PROGRESS.

## The stop

| Measure | Count | Owner cap |
|---|---:|---:|
| Distinct P1-G groups requiring new tests | 15 | 25 |
| Mutation adoptions against existing leaves | 152 | 250 |
| One complete pass of all 152 adoption cases, 179 mutants | **787.129 seconds** | **600 seconds** |

Owner choice 11 stops the work when one complete pass exceeds 600 seconds. This pass did, so no fix, binding or
regeneration follows this record until the owner decides.

The pass used a fresh `git clone --no-local` at `2d1be19aae3892138cb7e328f69e035723470f10`, then `npm ci` (exit 0) and
a clean status. Node was v26.10.0. It selected the 152 committed cases absent at `95c39561` and kept registry
order. Each control and mutant ran once, with no retries or determinism repeats, through `packet_tools.mutations`'
own per-case logic. The timer spans only the case loop. Pristine checks passed before and after. No other test job
ran on the machine. [Attempt ledger](adoption-runtime-12.json)

Eight cases take 447 seconds:

| Case | Seconds | Why |
|---|---:|---|
| `state-owner.tools02-round7-c8`, `-round7-c10`, `-h7` | 63.9, 61.3, 59.9 | Each probe runs all 98 tests of `control-commits.test.ts`, once for its control and once for its mutant |
| `k12c1.adopt-review8-n9`, `-n10`, `-n11`, `-n13` | 53.1, 54.4, 56.1, 56.0 | Each target set runs `capture-work.test.ts`, about 27 seconds a run |
| `k12c1.adopt-sweep8-inspection` | 42.8 | Its target set runs the poison-catalog leaf's file |

## Adoption results: no product defect

150 of 152 controls pass, and 173 of 179 mutants receive qualified kills. Each of the six non-kills traces to a
fixture defect in the registry. None is applied yet.

| Case | Result | Cause | Planned fixture fix |
|---|---|---|---|
| `state-owner.tools02-review8-n7`, `-n8` | control fails | `value-capture.ts` imports `canonicalize`. The registry's dependency declaration copies that package's `package.json`, `lib/canonicalize.js` and `LICENSE`, but not `lib/canonicalize.d.ts`. In the temporary copy the typecheck fails, and both static rules report it. | Declare `lib/canonicalize.d.ts` with its SHA-256 |
| `k12c1.adopt-base-d12` | `uncovered`, 3 failures | The anchor starts with `   );\n    }`, the tail of the preceding unusable-identity branch, which the control never runs. Reach is measured there. | Start the anchor at the capacity refusal's template literal, which is unique |
| `k12c1.adopt-recovery-h21`, R6 variant | `wrong_kill` | Its expected target was copied from H21's Driver-safety leaf. R6's required result is control scopes. The run fails exactly "controlScopes inherited from the host's own prototype object is still honored", and three Object.prototype residue leaves. | Expected target: that control-scopes leaf |
| `k12c1.adopt-review8-n14` | `wrong_kill` | "every issue family: undefined array members" has one issue, so it cannot tell 7 retained details from 8. "V-D1 P5: 532480 invalid positions retain nine records and exact ordered details" asserts exactly eight, and fails. | Expected target: the P5 leaf |
| `k12c1.adopt-review8-n11` | `survived` | The runtime oracle bounds descriptors with slack per object member, so one extra uncharged descriptor read passes. The mutant adds `PrimordialGetOwnPropertyDescriptor` inside a traversal function, which the static check's SC1 reports. | Retarget to `capture-metering.test.ts`, "the real values.ts passes every rule"; needs the declaration fix above |

The earlier unrecorded GPT-6 attempt at `9f6321b4` stopped after 138 cases at 511.6 seconds and saw the first two
of these. The ledger keeps it as a lead, not as a measurement.

## A second blocker for `mappings_complete`: family routes

Nineteen pending family origins carry 396 member occurrences. `origin_closure` requires every member to have a
non-pending P1-M route. 178 members have their own registered mutant, counting five obligations whose spelling does
not match the member key yet. The remaining 218 cannot be closed with the current route kinds:

| Members | Situation | Current route kinds |
|---:|---|---|
| 63 | The same registered mutation as another family's member: adapter and rebound copies, `reuses` links and reviewer copies | `mutation` accepts only a mutant whose `obligation` names this family's member, so these refuse |
| 46 | Copies of members that are themselves unrouted | They follow their source |
| 109 | Base members without a registered mutant. The readings say an existing registry case or the complete-decision oracle covers the decision, or the subject is superseded or equivalent | Superseded and equivalent members fit `no_longer_applicable` and `equivalence`. No kind expresses "covered by an existing case" |

TOOLS-01's P1-M lists a registered mutation, an attributed witness, no-longer-applicable, equivalence, survivor and
limit. Design 01 §5.4 retires a whole family as `covered_elsewhere` when current registries or the oracle mutate
the same decision, but a mixed family with live adoptions closes under P1 and needs a route per member. Triage
counted those covered members as needing no adoption, so the 152 count assumed a closure route that does not exist.

## P3 items

- **KC3-R3-RAW-02** is closed by design 05 §8.3's recorded `whitespace_exceptions`, which range 1's accepted
  review covers. Design 01 §6's broader exclusion of every preserved path is not built, because the accepted
  control `test_a_trailing_blank_line_fails_without_a_recorded_exception` pins the narrower rule. A tool test with
  a raw log remains to add.
- **CR1-R1-TOOLS-01** (resulting-state killers for the four dropped-field mutants) has no build yet.
- **KC3-R3-CREDIT-03** stays under L-12 and is reported only.

## Questions for the owner

1. **Runtime cap.** Measured 787 seconds against 600. Options:
   - **A (recommended):** raise the cap to 1,200 seconds per complete pass. That gives margin for runner variance
     after the six fixes, which add two mutant runs and shorten n11.
   - **B:** keep 600 and let me merge cases that share a target file, so one control serves several mutants. I
     estimate about 140 seconds saved, which is still marginal.
   - **C:** keep 600 and drop the slowest adoptions back to pending. `mappings_complete` would then be unreachable.
2. **Family routes.** Options:
   - **A (recommended):** a short design 06 addendum, reviewed in review 05 without a separate design check:
     - a `mutation` route may name the registered mutant of the member that this member `reuses` or adapts;
     - a new `covered` route names an existing scheduled registry case or a passing catalog leaf, with the reading.
       It is counted, never a kill, and checked like S5 pointers.

     Superseded and equivalent members use the existing kinds.
   - **B:** register a mutation for each covered base member. That is about 109 more adoptions, 261 against the
     cap of 250, with more runtime.
   - **C:** leave the 19 family origins pending and record a 017 entry. Adoption then reports
     `revalidation_complete` or `extraction_pending`, not `mappings_complete`.

No product file, historical evidence or manifest changed. Test-group and adoption caps pass. Resume after the owner's
answer with the six fixture fixes, a new complete pass and the binding work.
