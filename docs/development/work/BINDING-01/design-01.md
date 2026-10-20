# Design 01 — BINDING-01

Design for the [owner release](release-01.md) and [brief](brief-01.md), awaiting the owner-selected
independent design check. No production change has been made. Base B:
`af9e3b0ece4786ec41940f1dfa5f0468d83ddd08`; release record: `482802294e3077544bffed32393608bb06841a28`.
Session: Codex desktop, GPT-6 per session instructions (exact serving variant unavailable), owner's
Mac arm64, 2026-10-19 America/New_York. Node v26.10.0. No delegated sessions.

## Mechanism

This is a **Kernel value-binding** change, with caller capture owned by the SDK and containment
owned by deployment. It does not change the Runtime protocol's state machine. Governing owners,
reached through [reference](../../../../mental-model/reference.md):
[values](../../../../mental-model/concepts/values.md),
[identity](../../../../mental-model/concepts/identity.md),
[creation](../../../../mental-model/mechanisms/creation.md),
[Outcome acceptance](../../../../mental-model/mechanisms/execution-cycle.md), and
[recovery](../../../../mental-model/mechanisms/recovery.md).

### 1. Bytes, ownership and readers (brief question 1)

Replace live-root capture in `packages/kernel/src/values.ts` with strict byte admission. Before
content validation, use captured native typed-array brand/accessor/copy operations to copy the
exact view into a fresh Kernel-owned `Uint8Array`. A brand/length preflight rejects non-byte input
and roots above 1 MiB without allocating their copy. Never use the input's iterator, `.slice`,
constructor, species, `.buffer` property or overridable methods. Reject Proxy views, detached
buffers and shared backing memory: a concurrent SharedArrayBuffer writer cannot supply a coherent
snapshot. Buffer/subarray inputs with ordinary backing storage work without sharing storage.
No returned reference exposes the private buffer.

| Input consumer | New input | Reader output |
|---|---|---|
| Creation authority context; initial input; ingress payload | One `Uint8Array` per root | Deeply frozen parsed values in inspection, mailbox and Driver Activation |
| Outcome progress, each Emission, complete result, fail error | One `Uint8Array` per root | Deeply frozen parsed values in accepted progress, Emissions, terminal view and subsequent Activations |
| Three recovery availability lists | Three `Uint8Array` roots, each required to decode to a list of strings | Frozen parsed lists for membership checks; existing recovery decision/history metadata |
| Caller-selected identity text currently checked by `acceptIdentityText` | Canonical JSON string bytes: creation key, scope, Definition/Runtime/codec pins, input request key/kind/subscription class, Emission key | Decoded primitive strings; existing identity packing and receipts |

Kernel-issued IDs, trusted namespaces/authority lists, epochs, revisions, tags and capabilities
remain metadata. Opaque Activation IDs keep exact UTF-16 equality, including lone surrogates and
long strings. Optional-field presence and per-field identity packing stay intact.

All coordinator readers receive recursively readonly, deeply frozen parsed values, constructed as
own data without inherited setters. Validated bytes are the sole source of content and equality.
Keep their exact text privately for `packIdentity`; never recapture a returned object.

Replace the private Kernel entry's object-intake helpers (`canonicalize`, `boundaryValueIssues`,
`isBoundaryValue`, `sameLogicalValue`) with `validateCanonicalBytes(input: Uint8Array)`, returning
the frozen parsed value or bounded issues. Keep limits and output/issue types. Internal admission
retains an owned record (parsed value, exact text, byte count); neither its constructor nor the
encoder is a package export. “Bytes-only” describes value roots; envelopes/capabilities still exist.
See the envelope question below.

### 2. Strict validation, encoding and transport (brief question 3)

Use a project-written scanner/parser and encoder. Strict admission decodes the owned buffer with
fatal UTF-8 handling, explicitly refuses BOM, parses one complete JSON value, checks decoded keys
before insertion, and re-encodes the owned parse for exact byte comparison. It never returns a
normalized substitute for a non-canonical input. Bound diagnostics; retain no caller-controlled
unbounded path or raw token. Validate depth before descent, entries before insertion, scalar counts
while reading strings/names, and the root byte cap before decoding. Limits stay 32 / 4,096 / 65,536 /
1,048,576 with the existing units. There is no aggregate root cap.

Encode only owned parse data: UTF-16 key order (including integer-looking keys), fixed escapes,
unchanged array order. Capture `Number.prototype.toString` and its invocation intrinsic at load;
call it on finite primitive numbers with radix 10, using the engine's binary64 printer.
The governing algorithms are [RFC 8785 §3.2.2.3](https://www.rfc-editor.org/rfc/rfc8785.html#section-3.2.2.3)
and [Number::toString](https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html#sec-numeric-types-number-tostring).
Compare the result to the complete input token; `-0`, `1.0`, overprecise decimals, alternate exponent
forms and underflow spellings are refused by the strict core. The wrapper still emits the same
canonical spelling for their accepted binary64 values. Test signed zero, subnormals, rounding,
exponent cutovers and extremes against the current pinned JCS output.

Keep every required intrinsic in module-local load-time constants, including UTF-8 methods,
string methods, native brand/accessor operations, allocation, property definition, freezing,
sorting and error construction. Avoid implicit iteration and call-time prototype method lookup.
The scoped AST guard checks executable bodies and transitive local helpers for unresolved globals,
dynamic code loading/evaluation and unapproved intrinsic lookups; negative controls insert such
reads. This is a guard on this implementation, not a proof about arbitrary future JavaScript.

The separate internal transport adapter is `canonicalizeJsonText(wireUtf8: Uint8Array,
maxWireBytes = 8_388_608)`. Check view length **before adapter copying/decoding/buffering**. Parse
lenient JSON with semantic limits and decoded-duplicate refusal, encode, then strictly validate.
Return fresh bytes; distinguish transport-cap refusal from invalidity. No core entry exposes a
lenient mode. The caller already owns the supplied buffer; future transports must cap accumulation
of received/decompressed text themselves. Record decoder metering as a limit, triggered by a
measured stall or the first remote transport, as the brief permits.

### 3. Wrapper and test migration (brief question 2)

Move the current capture module to `packages/sdk/src/internal/value-capture.ts`, keeping its
traversal, serializer window, diagnostics, meter, stop protocol, Proxy/brand refusals and R1–R4.
Give it SDK-local own-data helpers; import no Kernel source or types. Its byte-output helper encodes
the successful capture's canonical string without another caller observation. Move the exact
`canonicalize@3.0.0` dependency from Kernel to SDK; leave SDK entry exports and supported docs unchanged.
Do not upgrade the serializer or harden the wrapper.

Add a test-only facade through `packages/kernel/tests/harness.ts`, importing SDK capture internally.
Switch consumer coordinator imports to it; preserve schedules, Driver fakes and whole-decision
assertions. Encode at the existing field-observation point; do not eagerly walk unauthorized
requests or read accessors twice. Implement no authorization/replay logic in the facade. New byte
tests call the real Kernel. Test wrapper refusals without a core call; tests requiring actual Kernel
refusals use malformed bytes and retain their oracle, never fabricated decisions.

The brief's count is a migration estimate: at the released tree, 44 test/support files construct
`ExecutionCoordinator`, 42 of them also import `harness.ts`; the harness currently constructs none.
Files requiring work beyond that import/facade migration:

- Direct construction without harness: `ambient-reads.test.ts`, `sweep/preload.ts`.
- Direct capture/corpus tests under `packages/kernel/tests`: `values.test.ts`,
  `capture-corpus{,.test}.ts`, `capture-refusals.test.ts`, `capture-work.test.ts`,
  `capture-stop.test.ts`, `value-diagnostic-work.test.ts`, `value-refusal-cost.test.ts`.
  Relocate wrapper assertions into SDK tests; keep consumer assertions against the byte facade/core.
- Source instrumentation: `capture-instruments.ts`, `capture-metering{,.test}.ts`,
  `zone-analysis.ts`, `zone-inventory.ts`, and `sweep/` source inventories must distinguish wrapper
  capture from core decoding. Retain the fault/poison schedules and complete-decision oracle.
- Tooling adapters: `tests/tooling/capture-{continuations,dimensions,trace-controls,witness}.mjs`,
  `work-charge-probe.mjs`, value-cost source/port/registration fixtures and their tooling tests.
  Update paths/digests, reopen affected adoption origins mechanically for TOOLS-02; no new credit
  for the 853 held V-ENV entries.
- `tests/conformance/architecture/{boundary-policy.ts,kernel-landing-zone.test.ts}` and
  `docs/development/kernel-ownership.md`: source/export/dependency inventory and bypass controls.

Complete the remaining caller/source-path census during build; this list is a bounded search.
Private test imports must stay outside the public SDK graph.

### 4. Limit register and hold scope (brief questions 4–5)

| 017 entry | Disposition in the payload |
|---|---|
| L-01 | Remove call-time global-binding dependence from core validation/encoding; retain wrapper stable-realm limitation. Genuine intrinsics at module load remain a core host precondition. |
| L-02 | Retain for the in-process deployment: bytes are not containment. |
| L-03 | Attribute the existing metered-work/no-wall-clock claim to wrapper capture; make no core wall-clock promise. |
| L-04, L-05, L-07, L-08 | Move R1/R2/R4 and undetectable brands to the SDK wrapper; core no longer walks caller value objects. |
| L-06 | Move the capture-meter R3 qualification to wrapper; ordinary Kernel maps also retain engine-dependent cost, without a metering claim. |
| L-09 | Wrapper retains own-envelope accessors/Proxies. The existing core envelope observation also needs an accurate qualification; see the design-check question. |
| L-10 | Keep B's non-tightness, attributed to wrapper capture; no new optimization. |
| L-11, L-12 | Keep evidence-tool limits and TOOLS-02 ownership; include the new bounded static guard's scope. |
| L-13 | Move per-root capture work budgets to wrapper; core roots also remain independent, without a new request-wide cap. |

After independent acceptance, the **eligible core claim** is that, after trusted initialization,
call-time global replacements/shadows cannot steer admission, parsed content or root equality;
distinct content conflicts and identical content replays. There is no core serializer window to
restore. Wrapper fidelity in a hostile realm, pre-import poisoning and containment remain outside
this claim. The implementer lifts no hold; register reclassification stays with TOOLS-02.

Build updates `concepts/values.md` (library-only/live-object-core wording), reference/rewrite-index,
affected identity/creation/cycle/recovery descriptions, BASELINE, 017 and roadmap ownership.
Preserve historical decisions; cite their supersession by decision-01/02. Change Layer 1/2 or
AGENTS only for a now-false summary; no whole-system redesign is proposed.

## Why each criterion closes

| Criterion | Closing mechanism and distinguishing evidence |
|---|---|
| B1-1 | All root fields route through owned byte admission; output roots come only from that parse. Export/type inventory rejects object-root overloads, dependency tests reject capture imports. At every consumer, mutate/transfer the source buffer after the call, mutate returned values, then inspect, dispatch/redeliver and retry; accepted content and receipt must stay fixed. Include offsets, Buffer, empty/detached/shared/non-byte refusals and malformed-root atomicity. |
| B1-2 | Preserve wrapper capture and existing identity packing. Compare old baseline JCS, moved wrapper bytes and core re-encoding for the existing golden corpus and all 1,543 accepted cases in `capture-dimensions.mjs`. Keep the 1,500-case generator/seed and at-limit cases, count comparisons explicitly. Creation/ingress/Outcome exact replay, conflict, absence/null, sibling-root and numeric/key-order regressions remain whole decisions. Any byte/equality/replay mismatch stops for the owner. |
| B1-3 | Grammar + duplicate check + semantic limits + exact re-encoding identity close strictness together; parsing alone cannot erase a duplicate or accept an alternative spelling. Named negative vectors cover UTF-8, surrogate escapes, BOM, duplicates (including escaped aliases), key order, whitespace, string escapes, number spelling, trailing data and truncation. Each limit gets cap−1/cap/cap+1, with other limits satisfied; sibling roots remain independent. |
| B1-4 | Load-time intrinsic closure and no caller-object traversal in validator/encoder remove both causes of the hop. AST negative controls plus isolated-process shadow/replacement witnesses exercise standalone validation and whole creation/ingress/Outcome decisions; acceptance must succeed with correct bytes/content, not merely refuse everything. |
| B1-5 | SDK wrapper is internal and imports no Kernel; core graph imports neither SDK/capture nor JCS. Dependency-bypass controls and SDK entry/export comparison cover both directions. Repository tests include SDK/conformance; example, typecheck and builder-docs checks run in CI. |

[verification.json](verification.json) inherits TOOLS-02A's deterministic commands, baseline snapshot,
archive input, fault/poison sweeps and full continuation search; adds example and builder-docs checks.
The old builder-docs exclusion is not copied: locally at `ed45dabc` it passed (74 Markdown files,
2,044 links/anchors, 38 public imports). New core witnesses will be normal discovered test files,
not an opt-in profile. Update relocation-dependent environment/source censuses in payload C.
Run the composed verify **only in CI at clean C**; record the run ID and end the turn without polling.
The later H changes exactly report, ledger and progress; the spec permits administrative checkpoints
between C and H, not payload changes. Report actual sessions/machines and artifact results under 008.

## Accepted designs relied on

The JCS domain, limits, identity packing, authority order and whole-decision semantics remain fit.
The live-object core and serializer window are unfit for core V-ENV: invalidation-03 demonstrates
a global lexical binding defeating `globalThis` restoration. The owner already selected the root
fix in decision-01/02. The current wrapper is retained under its cooperative limitations.

Read the research map's bytes/transport, wrapper/Proxy and realm sections; primary encoding
specifications are linked above. No third-party source is copied/adapted. Keep the existing npm
`canonicalize@3.0.0` unmodified in SDK: installed LICENSE, metadata and lib/bin headers inspected;
Apache-2.0, no shipped NOTICE found, no runtime dependencies. Preserve redistribution notices;
record lock integrity and recheck the distributed artifact before the package move. Core is
independently implemented; no clearance claim for other prior art or new dependency/service.

## Corpus

Maintain existing golden vectors, value-cost/Proxy/brand/stop cases, complete-decision oracle,
fault/poison sweeps and K1.2 Outcome tests at their proper wrapper/core boundary. Port
invalidation-03's `kernel-lexical-shadow`, `kernel-lexical-creation`, `lexical-shadow-probe` and
`pin-forms-probe` cases into maintained fresh-process core tests. Vary JSON/Object/Array and every
new captured intrinsic's binding; assignment, definition and lexical forms; replacement before a
call and between calls; and positive controls. Retain form × pin cases as evidence about the
wrapper/host precondition, without claiming protection before module initialization. Add the B1-1
buffer and B1-3 grammar/limit vectors above. Historical reproducers stay unchanged.

## Questions

The design check must confirm the output/API choices above and resolve **L-09**: moving value
capture alone does not remove `observeField`'s own-getter/Proxy behavior in `envelope.ts`. The brief
says to move L-09 entirely to the wrapper, while the current canonical owner preserves that
separate envelope behavior. **Recommendation:** keep that behavior, copy/validate each root as it
is observed before a later field can mutate it, and qualify L-09 for both wrapper and core envelope
observation. This adds no envelope hardening or replay change. If the owner instead wants a
callback-free core envelope boundary, it needs an explicit contract amendment and distinguishing
tests before build. Do not silently claim that bytes alone close it.

No other owner decision is requested. Stop for the design check; no production implementation yet.
