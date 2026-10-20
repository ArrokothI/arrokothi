# Brief 01 — BINDING-01

Planner: the owner's Claude Code desktop session (`claude-opus-5-5`), 2026-10-20, at the owner's request ("draft
BINDING-01 here"). Released by the owner on 2026-10-20 ([release 01](release-01.md)), unchanged except for this header and the answer to question 1.

It is written under [006 working principle 6](../../006-development-process.md#working-principles) and
[017](../../017-known-limitations.md). Build right now what later work builds on. Everything else becomes a
recorded limit.

## Goal

Make the Kernel core accept and return values only as **canonical bytes it owns and validates itself**, so that
identity and equality no longer depend on how a caller's JavaScript objects behave. Move live-object capture,
with its refusals and work meter, into `packages/sdk` as an internal cooperative wrapper
([decision-01](../DESIGN-AUDIT-01/decision-01.md) item 1; [decision-02](../DESIGN-AUDIT-01/decision-02.md) stage 2).
This removes most of 017's L-04 to L-09 from the Kernel, and should allow the V-ENV hold
([invalidation-03](../DESIGN-AUDIT-01/invalidation-03.md)) to be released for the core.

## Build right now (blocking quality)

These are expensive to change later. Every later packet builds on them, and persisted identity depends on them.

| ID | Criterion | Closes by |
|---|---|---|
| B1-1 | **Core value API.** Every Kernel root consumer takes canonical bytes, and every value the Kernel returns is canonical bytes or a frozen value the Kernel parsed from its own validated bytes. The consumers are creation `authorityContext` and initial input, ingress payload, recovery lists, Outcome progress, Emissions, result and error, and identity text where it is a value. The core keeps its own copy of input bytes before validating them, so a caller's buffer cannot change under it. No core export accepts a live object. | Structural: an export/type check finds no object-intake path. A dependency test fails if the core imports the wrapper or any capture code. Each consumer gets a test with mutated-after-call input buffers. |
| B1-2 | **Canonical identity is unchanged.** For every value the current Kernel accepts, the new path yields byte-identical canonical bytes, and request equality, replay and conflict decisions do not change. | Deterministic: the existing accepted-value corpus, plus K1.1-correction-03's 1,543 accepted values and golden vectors, give equal bytes through the wrapper. The core's own `encode` gives the same bytes as the current JCS (RFC 8785) output. |
| B1-3 | **Strict validator in the core.** It accepts exactly canonical bytes: UTF-8 and Unicode well-formedness, no duplicate keys, canonical key order and number spelling, no insignificant whitespace, and the four semantic limits. It refuses everything else before any state change. It is written for this project: no JCS library offers a verify mode ([decision-01](../DESIGN-AUDIT-01/decision-01.md), research inputs). | Deterministic: a bytes → value → bytes identity check on the corpus, named negative vectors per rule, and cap−1/cap/cap+1 for each limit. |
| B1-4 | **No call-time globals in the core.** The validator and encoder capture every intrinsic they use at module load, and never resolve a global name (`JSON`, `Object` and the rest) at call time. This is the V-ENV fix. | Structural plus witness: a static check over the core's validation and encoding modules, and invalidation-03's `let JSON` / global-replacement witnesses as maintained tests that pass against the core. |
| B1-5 | **Package boundary.** The wrapper is an internal module of `packages/sdk`, not exported from its public entry, and it does not import `@arrokothi/kernel`. Nothing changes on the supported SDK surface or in its docs. | Structural: SDK export check and dependency check. SDK, example and builder-docs checks stay green. |

## Keep as-is or record as limits (non-blocking)

- **The wrapper keeps K1.1-correction-03's behaviour as it is:**
  - the meter, Proxy-first and internal-slot refusal, and residuals R1–R4;
  - the same cooperative contract.

  017's L-04 to L-09 and L-13 move from "Kernel" to "SDK wrapper" in wording. No new hardening.
- **Transport adapter: minimal.** It is one function, from JSON text to canonical bytes:
  - the 8 MiB cap is enforced before buffering;
  - decoded duplicate keys are refused before they are erased;
  - its output goes through the core validator.

  A metered decoder cost bound is a recorded limit, not a criterion. No remote transport exists yet.
- **Realm hardening:** frozen intrinsics and pinned global bindings for the wrapper are not done (017 L-01,
  narrowed to the wrapper).
- **TOOLS-01 hold-register reclassification:** the 853 rule-1 V-ENV entries go to TOOLS-02. Evidence bookkeeping
  is not product behaviour.
- **Wrapper portability:** the wrapper is Node-only, because `util.types.isProxy` is (decision-02's accepted cost).
- **Out of scope:** the coordinator refactor (COORD-REFACTOR-01), the public SDK wrapper export (K1.4), and K1.3.

## Known counterexamples to keep passing

- Invalidation-03's V-ENV witnesses (global `let JSON`, binding replacement). They must now **pass** against the
  core.
- K1.1-correction-03's maintained value-cost, Proxy, brand, stop and corpus tests. They move with the wrapper
  and keep passing.
- The complete-decision oracle, the fault and poison sweeps, and every K1.2 Outcome test. They keep passing
  through bytes.

## Questions for the design note

1. **Bytes type and ownership.** The owner decided: the input is a `Uint8Array`, copied on entry. Still to decide:
   which output each reader gets, bytes or a frozen parsed value. This is an API shape, so get it right now.
2. **Test migration.** 131 test files call the value APIs, and 43 build their coordinator through `harness.ts`.
   Recommended: wrap at the harness, using the wrapper through a test-only path, so most tests do not change.
   Name the files that cannot be migrated that way.
3. **Encoder continuity.** How is ES number spelling reproduced exactly without call-time `JSON`? How does the
   design show equality with the current `canonicalize@3.0.0` output (B1-2)?
4. **What carries the 017 entries now.** Per entry, state whether it is retired, moved to the wrapper, or still
   in the Kernel.
5. **V-ENV hold.** What exact claim can be released for the core? What stays with the wrapper (L-01)?

## Process

- **Gate for review:** the same as K1.1-correction-03's owner choice 03. Block only on a concrete production
  defect against the candidate (B1-1 to B1-5), or on a false current claim in Layer 3, BASELINE or 007.
  Evidence-tooling gaps are P3 and go to TOOLS-02.
- **Lifecycle:** the design note comes first, then a design check, then the build.
- **Verification:** the composed verify runs in the Packet verify CI workflow from the first C. Agents start
  it and read the artifact, and never poll it.
- **Records:** the review prompt names the files to read. The reviewer cites the CI run rather than
  repeating it. Records stay short.
- **Stop and ask:** if any accepted value's canonical bytes would change, if equality or replay would change,
  or if the SDK's public surface would change.
