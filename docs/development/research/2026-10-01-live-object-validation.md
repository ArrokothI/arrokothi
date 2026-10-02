# Live-object validation: prior art for four problems

> **Research record, 2026-10-01.** Background for briefs, design notes and reviews. It is not
> architecture, an owner decision, acceptance evidence or licence clearance; the
> [research index](README.md) states the rules for using it. States of projects and advisories are as
> of that date.
>
> - **Question.** Prior art, standard terms and solved or unsolved status for four live-object
>   validation problems: refusal cost, untested work charges, exotic key enumeration and
>   re-prototyped built-ins. Also bytes-versus-live boundaries and in-process isolation, for a
>   TypeScript/Node in-process Kernel that stores canonical JSON bytes.
> - **Method.** Standard scope: 3 breadth and 2 depth research agents (see [Methodology](#methodology)).
>
> **Later findings** from the [2026-10-02 report](2026-10-02-canonical-bytes-kernel.md):
> - ShadowRealm was still Stage 2.7. Web-platform tests removed it on 2026-05-12, and a Node pull
>   request to remove the experimental flag was open.
> - Endo pass-style at `master` still has no Proxy detection. Its "assume no proxies" comment is in
>   `remotable.js`.
> - The pinned `canonicalize@3.0.0` accepts lone surrogates; 4.0.0 rejects them, and 5.0.0 changes
>   canonical output for some inputs. The Kernel refuses lone surrogates before calling it.
> - §2B's questions continue in that report's realm-integrity and Proxy-policy sections.

## Executive summary

**Answer status: mostly answered.** Every problem has named prior art and a primary source. What is missing: no source names Problem 3 as a known DoS, there are no SES performance numbers, and Protobuf/gRPC and Deno were not researched.

- **The pattern behind Problems 1, 3 and 4 is standard.** The ECMAScript spec's `JSON.stringify` does what our validator does: an ancestor stack with a linear membership test, and no depth limit. The HTML structured-clone algorithm does the opposite. It classifies a value by its **internal slots** before it reads any properties, uses an O(1) memory map, and refuses anything else.
- **Problem 1 is an "under-priced operation".** Its closest documented precedent is Ethereum gas re-pricing (EIP-150).
- **Problem 2 is a surviving mutant.** The known fix is a deterministic work-count assertion, not a wall-clock test. No off-the-shelf JS tool does this.
- **Bytes-only core.** The research supports the direction we already chose: a bytes core, a wrapper for live objects that refuses unsupported values, and no claim that in-process hardening is a guarantee. Node, vm2, SES and isolated-vm all state in their own docs that same-process code is not contained.

---

## 1. Problem tables

### Problem 1: refusing costs more than accepting

| Aspect | Standard name | Prior art | How it is handled | Applies to us? | Confidence |
|---|---|---|---|---|---|
| The bug class | **Asymmetric resource consumption (amplification)**, CWE-405. Child: **inefficient algorithmic complexity**, CWE-407. Academic name: **algorithmic complexity attack**. | [CWE-405](https://cwe.mitre.org/data/definitions/405.html), [CWE-407](https://cwe.mitre.org/data/definitions/407.html); [Crosby & Wallach, USENIX Sec 2003](https://www.usenix.org/conference/12th-usenix-security-symposium/denial-service-algorithmic-complexity-attacks) | CWE-405 lists "meter resource allocation" among its mitigations. | yes | Established |
| Shared-reference expansion | **Billion laughs** / entity expansion (CWE-776); YAML **alias expansion** | [CWE-776](https://cwe.mitre.org/data/definitions/776.html); SnakeYAML [CVE-2017-18640](https://ubuntu.com/security/CVE-2017-18640); [eemeli/yaml](https://eemeli.org/yaml/) `maxAliasCount` | A **count per alias**, separate from byte size: SnakeYAML default 50, eemeli/yaml default 100. eemeli/yaml also has a `RESOURCE_EXHAUSTION` error. | yes. The fix is to charge each refused or shared container, not its output bytes. | Established |
| Charge does not match real work | **Under-priced operation** / metering mismatch | [EIP-150](https://eips.ethereum.org/EIPS/eip-150) (2016); [Perez & Livshits, "Broken Metre", NDSS 2020](https://www.ndss-symposium.org/ndss-paper/broken-metre-attacking-resource-metering-in-evm/) | Re-price the operation, then re-measure it against real CPU and memory. Broken Metre found contracts ~200x slower per unit of gas. | yes, the closest analogue | Established (EIP); Likely (numbers) |
| Cycle detection: ancestor stack | "[[Stack]] contains value" | [ECMA-262 SerializeJSONObject](https://raw.githubusercontent.com/tc39/ecma262/main/spec.html); [V8 json-stringifier.cc](https://raw.githubusercontent.com/v8/v8/main/src/json/json-stringifier.cc) | The spec scans the stack linearly and has no depth cap. V8 skips the stack for the first 10 levels, then scans linearly at O(depth) per push. Depth is bounded only by the native stack (`StackLimitCheck`). | yes. This is exactly our pattern. | Established |
| Cycle detection: memo map | Structured-clone **memory** map; V8 `id_map_` | [HTML StructuredSerializeInternal](https://html.spec.whatwg.org/multipage/structured-data.html); [V8 value-serializer.cc](https://raw.githubusercontent.com/v8/v8/main/src/objects/value-serializer.cc) | O(1) lookup. Each distinct object is processed once and repeats are written as back-references. | partly. It preserves sharing, but our canonical JSON has tree semantics. | Established |
| O(1) active-path membership | Ancestor set (add on entry, delete on exit) | [erdtman/canonicalize](https://raw.githubusercontent.com/erdtman/canonicalize/master/lib/canonicalize.js) uses a `seen` Set and removes each entry when its subtree completes. | Fixes the O(depth) membership cost only. Re-walking shared nodes still costs one walk per path, which can grow exponentially. Only a memo or a work meter bounds that. | yes | Likely (digest of source) |
| Work meter | **Fuel** / **gas** | [Wasmtime `consume_fuel`](https://docs.wasmtime.dev/api/wasmtime/struct.Config.html) | Deterministic. Most operations cost 1 unit, and the same input always completes or traps at the same point. | yes | Established |
| Depth caps | Recursion / nesting limit | serde_json 128 ([docs](https://docs.rs/serde_json/latest/serde_json/struct.Deserializer.html)); protobuf ([CodedInputStream](https://protobuf.dev/reference/java/api-docs/com/google/protobuf/CodedInputStream.html)); [fxamacker/cbor](https://github.com/fxamacker/cbor) 32; [cbor2 GHSA-3c37-wwvx-h642](https://github.com/agronholm/cbor2/security/advisories/GHSA-3c37-wwvx-h642) | Depth and size limits are kept separate. None of these meters work. | partly | Likely (search snippets) |

**Verdict: known, partial solutions.**
- Every building block is well-known: a depth cap, a per-alias count, a memo map, fuel.
- The specific defect, a refused node charged ~1 byte while costing O(depth) work, is the under-pricing class. It is documented for EVM gas and not for JS validators.
- No JS serializer was found that charges refused containers against a work budget.

### Problem 2: deleting a work charge leaves the tests green

| Aspect | Standard name | Prior art | How it is handled | Applies to us? | Confidence |
|---|---|---|---|---|---|
| Deleted charge, suite green | **Survived mutant**; it is not an equivalent mutant | [Stryker mutant states](https://stryker-mutator.io/docs/mutation-testing-elements/mutant-states-and-metrics/), [equivalent mutants](https://stryker-mutator.io/docs/mutation-testing-elements/equivalent-mutants/), [mutators](https://stryker-mutator.io/docs/mutation-testing-elements/supported-mutators/) | The Block Statement and Assignment mutators generate exactly this deletion. Stryker has no automatic way to detect equivalent mutants. | yes | Established |
| Slowdown only, no wrong output | Timeout mutants; **performance mutation testing** | [PIT FAQ](https://pitest.org/faq/) (`timeoutFactor` 1.25, `timeoutConstant` 4000 ms); [Performance mutation testing](https://www.researchgate.net/publication/338900740_Performance_mutation_testing) | Stryker and PIT both count a timeout as "detected", but only if a test drives the hostile input. The research says performance mutants are semantics-preserving by design. | yes | Established (tools); Emerging (paper, snippet only) |
| Deterministic assertion | **Gas snapshot**; fuel accounting; operation-count assertion | [Foundry `forge snapshot --check`](https://www.getfoundry.sh/reference/forge/snapshot); [Wasmtime fuel](https://docs.wasmtime.dev/api/wasmtime/struct.Config.html) | Snapshot the exact count and fail on any diff (tolerance can be 0). | yes. Assert meter units for each hostile shape. | Established |
| Big-O assertion library for JS | not found | not found | — | — | — |

**Verdict: known, partial solutions.** The method is established: mutation testing to find the survivor, then a test that drives the hostile shape and asserts a deterministic work count. Wall-clock time and timeouts are weak evidence. No Tier 1 or 2 JS tool for complexity assertions was found.

### Problem 3: listing the keys of an exotic object

| Aspect | Standard name | Prior art | How it is handled | Applies to us? | Confidence |
|---|---|---|---|---|---|
| Cost of key enumeration | TypedArray exotic `[[OwnPropertyKeys]]` | [ECMA-262](https://raw.githubusercontent.com/tc39/ecma262/main/spec.html): "For each integer i such that 0 ≤ i < length … Append ! ToString(𝔽(i))"; [tc39/ecma262#1244](https://github.com/tc39/ecma262/issues/1244) | No cap. One engine call builds O(length) strings. This is conformant behaviour. | yes | Established |
| Classify before enumerating | **Brand check** (internal-slot check) | [HTML StructuredSerializeInternal](https://html.spec.whatwg.org/multipage/structured-data.html) | Tests `[[ViewedArrayBuffer]]`, `[[MapData]]` and other slots first. It reads properties only for ordinary, non-exotic objects. | yes. This is the ordering fix. | Established |
| Node brand predicates | `util.types.*` | [Node util.md](https://raw.githubusercontent.com/nodejs/node/main/doc/api/util.md) | "these checks do not inspect properties of the object that are accessible from JavaScript (like their prototype)". The docs make no explicit cross-realm promise. | yes | Established |
| Array check | `Array.isArray` / IsArray | [ECMA-262 IsArray](https://raw.githubusercontent.com/tc39/ecma262/main/spec.html); [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/isArray) | Works across realms. Sees **through** a Proxy, and throws on a revoked Proxy. | yes | Established |
| Spoofable tag | `Symbol.toStringTag` spoofing | [MDN Object.prototype.toString](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/toString) | "Using toString() in this way is unreliable". | yes | Established |
| lodash cloneDeep | Tag-based clone | [lodash 4.17.21](https://raw.githubusercontent.com/lodash/lodash/4.17.21/lodash.js) | An uncloneable tag at top level becomes `{}`. The tag comes from toString, so a re-prototyped typed array is treated as an object. | no (anti-pattern) | Likely (source reading) |
| Named advisory for this DoS | not found | not found | — | — | — |

**Verdict: known mechanism, partial solutions; the DoS itself is specific to our design.** The fix is standard: run brand checks before any key enumeration, as structured clone does. No advisory or engine bug names the cost of enumerating huge typed arrays. Our ordering, a prototype check followed by `Object.keys`, is what exposes it.

### Problem 4: re-prototyped built-ins accepted as plain objects

| Aspect | Standard name | Prior art | How it is handled | Applies to us? | Confidence |
|---|---|---|---|---|---|
| Standards approach | Slot-based classification | [HTML StructuredSerializeInternal](https://html.spec.whatwg.org/multipage/structured-data.html) | A null-prototype Map still has `[[MapData]]`, so it is cloned as a Map. Any other internal slot, any exotic object and any callable throws `DataCloneError`. | yes | Established |
| Prototype-based plain-object checks | "plain object" / POJO | [is-plain-obj](https://github.com/sindresorhus/is-plain-obj); [lodash `isPlainObject`](https://cdn.jsdelivr.net/npm/lodash-es@4.17.21/isPlainObject.js); [devalue](https://github.com/Rich-Harris/devalue) | All three check the prototype or the tag. Read from source but not run: a `setPrototypeOf(new Map(), null)` would pass all three. lodash also temporarily writes `Symbol.toStringTag` onto the input. | yes. Same bug class as ours. | Likely (inference) |
| Silent coercion | — | [MDN JSON.stringify](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify) | "Map, Set, etc. will become {}". | yes (anti-pattern) | Established |
| Refuse explicitly | Pass style / passable | [Endo passStyleOf](https://github.com/endojs/endo/blob/master/packages/pass-style/README.md); [devalue](https://github.com/Rich-Harris/devalue) ("Cannot stringify arbitrary non-POJOs"); [Cloudflare RPC](https://developers.cloudflare.com/workers/runtime-apis/rpc/) | Endo requires frozen objects that inherit **directly** from `Object.prototype`. Cloudflare refuses custom prototypes unless the class extends `RpcTarget`. | yes | Established |
| Adjacent advisories | Prototype pollution (CWE-1321); unsafe deserialization | lodash [CVE-2020-8203](https://github.com/advisories/GHSA-p6mc-m468-83gw); devalue [CVE-2025-57820](https://github.com/advisories/GHSA-vj54-72f3-p5jv), [CVE-2026-30226](https://github.com/advisories/GHSA-cfw5-2vxh-hr84); serialize-javascript [CVE-2019-16769](https://github.com/advisories/GHSA-h9rv-jmmf-4pgx); node-serialize [CVE-2017-5941](https://www.cvedetails.com/cve/CVE-2017-5941/) | All are in the parse direction or are injection bugs. **None is about re-prototyped built-ins.** | partly (same family) | Established |

**Verdict: well-known and solved in standards; widely unsolved in popular libraries.** Structured clone, V8 ValueSerializer and Endo already solve it: classify by internal slot, or accept only objects that inherit directly from `Object.prototype`, and refuse everything else. Common plain-object helpers share our bug. "Refuse explicitly" is the norm among serializers built for safety: structuredClone, devalue, Endo and Cloudflare.

---

## 2. Cross-cutting questions

### A. Live objects vs bytes at the boundary

| System | Boundary | What went right or wrong |
|---|---|---|
| HTML structured clone / postMessage ([spec](https://html.spec.whatwg.org/multipage/structured-data.html)) | Serializes to an intermediate Record, then deserializes in the target | Right: brand-first classification, refusal, a memo map. Wrong: class identity is silently dropped. Getters run, though each only once. ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm)) |
| Node worker_threads / v8.serialize ([v8.md](https://raw.githubusercontent.com/nodejs/node/main/doc/api/v8.md), [worker_threads](https://nodejs.org/api/worker_threads.html#portpostmessagevalue-transferlist)) | Bytes | The format is "backward-compatible (i.e. safe to store to disk)" but only one way: V8 rejects any version above `kLatestVersion` (16) ([source](https://raw.githubusercontent.com/v8/v8/main/src/objects/value-serializer.cc)). "Equal JavaScript values may result in different serialized output", so it is not canonical. |
| Cloudflare Workers RPC ([docs](https://developers.cloudflare.com/workers/runtime-apis/rpc/)) | Structured clone plus stubs | It deliberately diverges from structured clone to **refuse** custom classes "to avoid confusion". This is the closest precedent for our wrapper. |
| Endo `passStyleOf` + `@endo/marshal` ([pass-style](https://github.com/endojs/endo/blob/master/packages/pass-style/README.md), [marshal](https://github.com/endojs/endo/blob/master/packages/marshal/README.md)) | Live passable value becomes CapData `{body: JSON string, slots}` | This is a validate-then-bytes split. It refuses non-frozen, non-passable values, cycles, and malformed strings. |
| isolated-vm ([repo](https://github.com/laverdet/isolated-vm)) | Only `ExternalCopy` / `Reference` cross | A separate heap per isolate. Its own docs say running untrusted code is "extraordinarily difficult". |
| Protobuf/gRPC, Deno | not researched | — |

Summary: every mature boundary copies or refuses, and none hands a live object to the core. Our planned bytes core with a refusing wrapper matches Cloudflare and Endo. Structured clone's silent class stripping is the behaviour to avoid.

### B. Hostile code in the same process

| Mechanism | Maturity | Stated limits and bypasses | Cost | Licence |
|---|---|---|---|---|
| Node itself ([SECURITY.md](https://github.com/nodejs/node/blob/main/SECURITY.md)) | — | "trusts the code it is asked to run". A bug only triggerable by in-process code "is not a Node.js vulnerability". | — | MIT |
| `node:vm` ([docs](https://nodejs.org/api/vm.html)) | Stable | "not a security mechanism. Do not use it to run untrusted code." | — | MIT |
| Permission model ([docs](https://raw.githubusercontent.com/nodejs/node/main/doc/api/permissions.md)) | Stable since v23.5.0 / v22.13.0 | A "seat belt", not a guarantee: "Malicious code can bypass the permission model". Existing file descriptors, symlinks and `process._debugProcess` bypass it. | — | MIT |
| `--frozen-intrinsics` ([cli.md](https://raw.githubusercontent.com/nodejs/node/main/doc/api/cli.md)) | Experimental | Root context only. "No guarantee that globalThis.Array is indeed the default intrinsic". Code passed with `--require` or `--import` runs before freezing. | not found | MIT |
| SES / Hardened JS ([README](https://github.com/endojs/endo/blob/master/packages/ses/README.md), [hardenedjs.org](https://hardenedjs.org/)) | Production at Agoric, Moddable, MetaMask (LavaMoat, Snaps) | Does not protect availability, side channels, or code that runs before lockdown. Advisories: GHSA-9c4h-3f7h-322r (Critical, 2023) and GHSA-h9w6-f932-gq62 (High, 2025) ([list](https://github.com/endojs/endo/security/advisories)). | **not found** | Apache-2.0 |
| ShadowRealm ([proposals](https://raw.githubusercontent.com/tc39/proposals/main/README.md)) | **Stage 2.7** as of 2026-10-01 | Only primitives and callables cross. The proposal makes no security claim, and realms share one agent (loops, side channels). | — | (spec) |
| vm2 ([main README](https://raw.githubusercontent.com/patriksimek/vm2/main/README.md)) | Discontinued in 2023, active again since 2025-10 | "New bypasses will likely be discovered", and "should not be your only line of defense". CVE-2023-37466 and CVE-2023-37903 ([NVD](https://nvd.nist.gov/vuln/detail/cve-2023-37466)). | — | MIT |

**Does prior art support our position that same-process code is not contained? Yes.** Node, vm2, isolated-vm and SES each say in their own docs that same-process code is not contained, and they point to a process, container or isolate as the real boundary. SES is the strongest in-process option, but its guarantee is conditional and excludes availability. That excluded area is exactly where Problems 1 to 3 sit.

**Changing values on each read (TOCTOU, "double fetch"):**
- **Structured clone** reads each own enumerable key once with `[[Get]]` and re-checks `HasOwnProperty` before each read. It copies Map and Set contents to a list before serializing them. ([spec](https://html.spec.whatwg.org/multipage/structured-data.html))
- **V8 ValueSerializer** rejects a Proxy by its internal type, so no Proxy trap runs. ([source](https://raw.githubusercontent.com/v8/v8/main/src/objects/value-serializer.cc)) Node exposes the same check as `util.types.isProxy`.
- **Endo** requires frozen objects with data properties only. Reads are then stable even through a Proxy. A Proxy handler can still run code between reads (reentrancy), and the doc says "We have not yet implemented the proxy test". ([copyRecord-guarantees.md](https://github.com/endojs/endo/blob/e1c63bf140be27a9c65538be207103b70cb06100/packages/pass-style/doc/copyRecord-guarantees.md))
- **WebIDL** dictionary conversion reads each declared member once, in lexicographic order. Undeclared keys are never read. ([2017 draft](https://www.w3.org/2017/08/webidl-fpwd-draft.html); [Node's converter](https://github.com/nodejs/node/commit/18f0f07e92))
- The common design is **single-read snapshot plus brand-first refusal of Proxies and accessors**. Our bytes-core direction removes the problem from the core entirely.

---

## 3. Source quality by claim

| Claim group | Source type |
|---|---|
| ECMA-262 IsArray, TypedArray `[[OwnPropertyKeys]]`, JSON `[[Stack]]`; HTML StructuredSerializeInternal | **Primary** (spec text, read verbatim) |
| V8 JSON stack scan (threshold 10), ValueSerializer `id_map_`, Proxy rejection, `kLatestVersion` | **Primary** (V8 source, read verbatim) |
| Node vm / permissions / frozen-intrinsics / util.types / v8 / SECURITY.md wording | **Primary** (official docs, read verbatim) |
| ShadowRealm Stage 2.7; vm2 revival (npm 3.12.2, 2026-09-08) | **Primary** (TC39 repo, author repo, registry) |
| CWE-405, CWE-407, CWE-776; EIP-150; Wasmtime fuel; Foundry snapshot; Stryker states | **Primary** (official) |
| GHSA and CVE entries listed above | **Primary** (advisory databases). Version ranges for devalue CVE-2026-30226 were inconsistent between summaries; re-read before citing. |
| Endo, SES, Cloudflare RPC, hardenedjs.org | **Primary** (maintainer docs) |
| lodash, is-plain-obj, devalue, canonicalize behaviour on re-prototyped values | **Primary source, but our inference.** Read, not run. |
| Crosby & Wallach; SnakeYAML timings; serde, protobuf and CBOR defaults; PIT defaults; .NET/RE2; performance-mutation paper | **Search snippet only.** The primary page was not read in full. |
| EVM "200x" and EXTCODESIZE 20 → 700 gas | Paper abstract (primary) plus a survey snippet (secondary) |
| JS big-O assertion tool; advisory naming the typed-array DoS; SES performance cost | **not found** |

## 4. Licences of projects worth studying (learning only)

All are permissive. None is copyleft or source-available. Identifiers come from fetched LICENSE files, sometimes via a summarising fetch, so re-read the file before any reuse. This is not legal advice.

| Project | Licence | Why study it |
|---|---|---|
| WHATWG HTML spec / ECMA-262 | Spec documents (terms not checked) | Brand-first classification; `[[Stack]]` |
| V8 | BSD-3-Clause (some Wasm API headers Apache-2.0) | ValueSerializer, json-stringifier |
| Node.js | MIT (bundles third-party code under its own licences) | util.types, threat model |
| endojs/endo (ses, pass-style, marshal) | Apache-2.0 (NOTICE and attribution obligations) | passStyleOf, the TOCTOU write-up |
| Wasmtime | Apache-2.0 WITH LLVM-exception | Deterministic fuel |
| Foundry | MIT OR Apache-2.0 | Gas snapshots |
| StrykerJS / PIT | Apache-2.0 / Apache-2.0 | Mutation testing |
| eemeli/yaml | ISC | `maxAliasCount` |
| devalue / is-plain-obj / lodash / superjson / zod / ajv | MIT (all) | Counter-examples, refusal messages |
| erdtman/canonicalize; cyberphone/json-canonicalization (RFC 8785) | Apache-2.0 / Apache-2.0 | Canonical JSON. The reference implementation has no cycle or depth handling. |
| isolated-vm / vm2 / LavaMoat / RE2 | ISC / MIT / MIT / BSD-3-Clause | Isolation, linear-time design |

## Research gaps

- **Not read in full:** Crosby & Wallach (PDF did not extract); the performance-mutation-testing paper (HTTP 403); the WebIDL living standard §3.2.17 (only the 2017 draft); the serde, protobuf and CBOR limit pages (snippets only).
- **Not covered:** Protobuf/gRPC JS runtimes and Deno.
- **Unresolved:** whether Endo has since implemented its "proxy test"; SES `lockdown`/`harden` performance cost (no data found); whether devalue advisory GHSA-9rgm-9g3h-6x36 is real (reported ID "CVE-2026-81176" unverified).
- **No reproductions were run.** The Problem 4 claims about lodash, is-plain-obj and devalue are source readings.
- **Process note:** one depth agent saved raw copies of the ECMA-262, WHATWG, Node docs, vm2 README and two V8 source files into the session scratchpad so it could search them. Nothing was executed. The copies were deleted after the run.

## Methodology

- Scope: standard. 3 breadth agents (P1+P2; P3+P4; A+B) and 2 depth agents (primary-text verification; licences and library behaviour).
- No agent returned NO_USEFUL_FINDINGS. The depth agent for SES performance returned "no data" on that sub-item.
- Leads followed: primary spec and V8 text, vm2 status (which corrected "discontinued" to "revived"), the ShadowRealm stage, lodash `isPlainObject` source, and canonical-JSON libraries.
