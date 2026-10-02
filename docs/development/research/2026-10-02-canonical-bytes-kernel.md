# Canonical-bytes kernel: prior art for eight pending questions

> **Research record, 2026-10-02.** Background for briefs, design notes and reviews. It is not
> architecture, an owner decision, acceptance evidence or licence clearance; the
> [research index](README.md) states the rules for using it. Packet, issue, draft and version states
> are as of that date, and [007](../007-work-packets.md) owns current packet status.
>
> - **Question.** Prior art for an in-process TypeScript Kernel that computes identity from canonical
>   bytes: canonical-bytes cores, realm integrity, Proxy policy, idempotent creation, single writer and
>   fencing, timers and cancellation, plan/apply structure and evidence tooling. Map the findings to the
>   owner decisions pending on that date.
> - **Method.** Thorough scope: 5 breadth, 3 depth and 12 fact-check research agents (see
>   [Methodology](#methodology)).
> - **Earlier report.** It extends the [2026-10-01 live-object validation report](2026-10-01-live-object-validation.md)
>   and skips the topics that report covered.

Learning only. No code was copied, and nothing here is legal advice. Licence identifiers come from the files
named in each table. Re-read the licence before any reuse.

**Read-status tags**

- **[P]** — the primary text itself was read: a spec, source file at a named commit, issue JSON, or a paper's
  full text.
- **[P~]** — a primary source, but read only through a summarising fetch.
- **[S]** — search-result snippet only.
- **[R]** — reproduced locally by a research agent with its own throwaway Node v25.2.1 scripts. This is our
  evidence, not prior art.
- **[I]** — our inference. No source states it.

Source tiers are given as [T1]–[T4].

## Executive summary

**Answer status: largely answered. Questions 1, 3, 4, 5, 6 and 8 are answered from primary sources. Questions 2
and 7 are answered on mechanism, with the gaps listed below.**

1. **Canonical bytes.** Systems that derive identity from an encoding fall into three groups:
   - Normalisers: JCS, TUF/OLPC, the Synapse round trip, legacy Secure Scuttlebutt.
   - Strict refusers: dCBOR, the CDE "checking decoder", the Ethereum RLP clients, Bitcoin after BIP66, Cosmos
     ADR-027/ADR-020.
   - Designs that avoid canonicalisation by hashing the received bytes: Cosmos SIGN_MODE_DIRECT, SegWit, SSB
     Buttwoo, Perkeep.

   Every documented incident comes from the normalising or lenient side:
   - Bitcoin's OpenSSL/BER consensus-split risk and txid malleability.
   - Synapse CVE-2025-30355, exploited in the wild.
   - The rskj "normalise and re-hash" defect.
   - Erigon's canonicality that was enforced only by an incidental hash comparison.
   - The X41 TUF "permissive verification" finding.
   - Lone-surrogate handling in JCS libraries, including canonicalize 3.0.0, the version the Kernel pins.

   The strict validator is itself an attack surface. Cosmos ASA-2024-0012/0013 was a stack overflow in the
   unknown-field rejecter.

   **The owner's agreed placement already has a direct precedent in Bitcoin Core:** a lenient transport decoder
   that normalises, followed by a strict core validator. There, the lax DER parser is documented as safe only
   because the strict check always runs first.
2. **Realm integrity.** Node core is immune to a global `let JSON` by construction. Built-ins receive
   `primordials` as function parameters, so names never resolve through the global environment. No startup
   check is involved.
   - SES `lockdown` leaves global bindings configurable. This comes from source reading and was not executed.
   - `--frozen-intrinsics` does not stop the shadow [R].
   - Pinning a global as non-configurable makes `let JSON` a SyntaxError [R].
   - We found no project that checks name resolution through the global environment at startup.
   - ShadowRealm is still Stage 2.7, and its web-platform tests were removed in May 2026.

   **A bytes core removes the precondition of the review-03 hop.** No caller code runs between the core's
   capture of an intrinsic and its use. [I]
3. **Proxy policy.**
   - Refuse every Proxy: platform serializers (HTML structured clone, the V8 ValueSerializer, the workerd
     default).
   - Accept them as presented and run their traps: library serializers (Cap'n Web, superjson, devalue's
     default, Endo `passStyleOf`). None of these defends against global-identifier shadowing by default.
   - `util.types.isProxy` is a reliable Node-only boolean. It is true even for revoked Proxies.
   - TC39 deliberately offers no `Proxy.isProxy`.
4. **Idempotent creation.**
   - Stripe, AWS and the IETF draft treat "same key, different parameters" as a client error. AWS documents it
     as "assume different intent".
   - None defines byte-level equality.
   - Temporal (USE_EXISTING) and DBOS never compare the new input and silently return the existing run.
5. **Fencing.**
   - Every system checks a token against current state at the durable commit point.
   - None stops a stale worker's external side effects.
   - Restate removed its persisted invocation epoch in v1.6 and now uses an in-memory leader token. Its docs
     still describe the epoch.
6. **Timers.**
   - Systems that cope with late fires tag each timer with an identity minted when that lifetime starts:
     a TimerRef, an ExecutionId, or a per-run sequence number.
   - Fire handlers re-derive the outcome from current state.
   - Cancellation tolerates a fire that is already in flight.
   - Restate#5425 (open, maintainer-acknowledged) is the counterexample: a reusable invocation ID with no
     generation tag.
7. **Plan/apply.**
   - The Decider shape (pure `decide`, sole-writer `evolve`) is convention. Redux shows the convention erodes
     without a check.
   - Import-boundary tools pass silently when a rule matches nothing. ArchUnit changed its default to fail in
     that case.
   - TypeScript brands are compile-time only.
8. **Evidence tooling.**
   - Stryker's report IDs are a per-run counter. Its own incremental mode keys mutants by content.
   - fast-check's maintainer says committed regressions belong in `examples`, not in `seed`+`path`.
   - FoundationDB reproduces failures by seed on the same binary and records declared coverage gaps as
     `rare` probes.
   - NIST's coverage measurement can show an unvaried dimension only against a declared domain.

**Source quality.** Most cited sources are Tier 1. A cluster of July–October 2026 GitHub issues, small repos
and a preprint was audited separately (§9). Only maintainer-confirmed items or source-confirmed claims from it
are used as evidence.

## Key findings

1. **Strict refusal of non-canonical bytes is the standard where identity derives from an encoding.**
   Confidence: Established.
   - dCBOR requires decoders to reject non-preferred forms, mis-ordered or duplicate keys, unreduced floats and
     non-canonical NaN. [T1][P], verified.
   - CDE's "checking decoder" must not hand a failing item to the application. [T1][P], verified.
   - go-ethereum, py-rlp and ethereumjs reject non-minimal RLP. [T1][P]
2. **Lenient acceptance caused real incidents. Normalisation causes a second, opposite class.**
   Confidence: Established.
   - Bitcoin's BER divergence led to BIP66. [T1][P], verified.
   - Synapse CVE-2025-30355 (exploited in the wild). [T1][P], verified.
   - Rskj PR #3722 (merged): normalising then re-hashing gives a different key from the peer's. Re-emitting
     received bytes relays forms that stricter peers reject. [T1][P]
3. **A strict validator needs its own resource caps.** Cosmos ASA-2024-0012/0013: recursion stack overflow and
   exponential cost in the unknown-field rejecter. Bitcoin's `MAX_SIZE` check sits inside the decoder.
   [T1][P] Confidence: Established.
4. **Testing a strict validator** is done with:
   - named negative-vector suites (ethereum/tests `invalidRLPTest.json`, dCBOR Table 4, CDE Table 6, Bitcoin
     `script_tests.json`);
   - the bytes → value → bytes identity oracle (CDE's suggested fallback);
   - disabling each check to confirm a test goes red (rskj);
   - flag-monotonicity fuzzing (Bitcoin `script_flags`);
   - differential runs across implementations.

   [T1][P] Confidence: Established.
5. **canonicalize 3.0.0 (pinned by the Kernel) has newer versions.**
   - It accepts lone surrogates. 4.0.0 rejects them, via a maintainer-merged fix.
   - 5.0.0 changes canonical output for some inputs and requires Node ≥ 22.
   - The Kernel already refuses lone surrogates before calling it ([values.ts](../../../packages/kernel/src/values.ts), line 343 at
     `b759d0ab`).

   [T1][P], with the npm registry and code read at commits. Confidence: Established.
6. **Node core's integrity against global shadowing is structural, not a check.** The primordials doc does not
   list the global-declarative hazard. [T1][P] plus [R]. Confidence: Established.
7. **Neither SES `lockdown` nor `--frozen-intrinsics` stops a top-level `let JSON`.** For SES this rests on
   source reading plus spec semantics, not execution. `--frozen-intrinsics` was [R]. Pinning the global
   property non-configurable does stop it [R]. Confidence: Likely.
8. **Platform serializers refuse Proxies, and library serializers accept them as presented.** [T1][P]
   Confidence: Established.
9. **No surveyed idempotency scheme defines byte-level payload equality.** Temporal and DBOS do not compare
   input at all. [T1][P], verified for the IETF draft. Confidence: Established. The Temporal claim rests on
   two server files plus the docs.
10. **Fencing is enforced at the commit point, against current state, by a per-attempt token.** No system stops
    the stale worker's side effects. [T1][P], verified for DTFx #410. Confidence: Established.
11. **Stale-timer safety comes from a per-lifetime timer identity plus re-derivation at fire time.**
    Restate#5425 shows the failure without it. [T1][P], with #5425 confirmed via the GitHub API.
    Confidence: Established.
12. **Boundary checks that match nothing pass silently.** ArchUnit 0.23.0 made empty rules fail by default.
    Issue #806 shows the trade-off, and the result was a per-rule `allowEmptyShould`. [T1][P], verified.
    Confidence: Established.
13. **Corpus entries should store inputs, not seeds. Mutant identity should be a content key, not a counter.**
    Sources: the fast-check maintainer, Stryker source, Hypothesis docs, and FoundationDB/TigerBeetle seed
    semantics. [T1][P]; Hypothesis is [S]. Confidence: Established.
14. **Varying one dimension at a time is 1-way coverage.** In Kuhn et al.'s four datasets, 1-way coverage
    caught 28.6–67.5% of recorded faults. No fault needed more than six factors. The data are accidental
    faults, not adversarial bypasses. [T1][P] Confidence: Established for the data. Applying it to hostile
    access forms is [I].

---

## 1. Canonical-bytes core: refuse or normalise?

### What others do

**Normalisers (identity = canonicalise(parse(input))):**

- **RFC 8785 (JCS)** [T1][P]
  - Silently rewrites whitespace, member order, escapes and number spelling.
  - Errors only on lone surrogates, NaN/Infinity, and input that is not I-JSON.
  - Appendix F says to use the canonicaliser as a filter after a parser.
  - No mode checks that bytes are already canonical. The only verify mode found is in json-canon, a Tier 3
    project (§9).
- **TUF / python-tuf** [T1][P]
  - Verifies by re-serialising the typed object with OLPC canonical JSON.
  - OLPC output is not valid JSON: control characters are written raw.
  - The X41 audit (2022) reported "Permissive Verification" (TUF-CR-22-103, informational). `\r` and
    `\u000d`, and a document with a duplicate key, all verify as the same document. Verified.
  - `JSONSerializer(validate=…)`, which checks the round trip, defaults to off.
- **Matrix** [T1][P]
  - The canonical-JSON spec has an ABNF grammar and integers limited to ±(2^53−1).
  - Enforcement is gated by room version: rooms v1–v5 tolerate non-compliant events, and v6 enforces. The
    stated reason (MSC2540) is to avoid split-brain rooms.
  - gomatrixserverlib today enforces only the numeric rules. Its tests for unsorted keys, whitespace,
    surrogates and duplicates are commented out, so those forms are normalised.
- **Legacy SSB** [T1][P], verified
  - Signs `JSON.stringify(value, null, 2)` with V8/SpiderMonkey key order.
  - Hashes only the low byte of each UTF-16 code unit, so different strings can hash the same.
  - Non-JS implementers complained about this in 2017 (ssb-feed #11, [T3][P]).

**Strict refusers:**

- **Bitcoin BIP66 (2015)** [T1][P], verified
  - Strict DER became a consensus rule via a soft fork: version-3 blocks, 750/1000 to activate, 950/1000 to
    enforce.
  - Bitcoin Core today runs a strict encoding gate first. The lax parser that is kept for history is
    documented as safe only because of that gate.
  - `ReadCompactSize` throws on over-wide forms and checks `MAX_SIZE = 0x02000000` (32 MiB) in the same
    function.
- **Ethereum RLP** [T1][P]
  - The Yellow Paper defines canonical form through its encoder. Its only explicit decoder directive covers
    leading zeros on scalars.
  - Clients pin the rest. go-ethereum has `ErrCanonSize` and `ErrCanonInt`, and rejects trailing data.
    py-rlp and ethereumjs reject non-minimal lengths.
  - Strictness depends on the type: a byte string with a leading zero is valid, but the same bytes are not a
    valid integer.
- **Deterministic CBOR** [T1][P], verified
  - RFC 8949 §4.2 makes determinism opt-in and leaves decoder checking to the protocol. §10 says equivalent
    but different forms have security implications.
  - The CDE draft (−13, expired April 2026; "parked" status is [S]) defines the checking decoder.
  - dCBOR (−18, August 2026) requires rejection, plus numeric reduction: 0, 0.0 and −0.0 all encode as
    `0x00`. It warns that reduction can create duplicate map keys.
- **Cosmos SDK** [T1][P]
  - ADR-027 lists deterministic protobuf rules: shortest varints, ordered fields, maps rejected.
  - The x/tx decoder runs a narrow TxRaw ADR-027 check, then a strict unknown-field scan, and only then
    unmarshals. Any-nesting is capped at 64.
  - ADR-020 signs the raw TxBody/AuthInfo bytes rather than a canonicalisation.
  - ADR-076 (Proposed, not implemented) states that hashing raw submitted bytes is not a safe unique ID. It
    gives a mutation test plan: reorder fields, add defaults, add varint bits, add unknown fields, pad numeric
    strings.

**Avoid canonicalisation altogether:**

- SegWit takes the malleable signature out of the txid. BIP141 argues this beats canonical-signature rules.
  [T1][P]
- SSB Buttwoo uses BLAKE3 over the stored metadata bytes plus the signature. [T1][P]
- Perkeep signs the exact text. [T1][P]
- A Dendrite developer, writing from firsthand debugging, argues to store the wire form and never trust a
  decode/encode round trip. [T3][P]

### Bugs from accepting non-canonical input

| Incident | What happened | Source / status |
|---|---|---|
| Bitcoin BER parsing | OpenSSL accepted BER length forms up to the platform's `long` size. A 5-byte length descriptor was valid on some nodes and invalid on others. Strict OpenSSL 1.0.0p/1.0.1k later made about 1% of blocks unacceptable to some nodes. Fixed by BIP66. | [T1][P], Wuille disclosure 2015-07-28 and BIP66, verified |
| Bitcoin malleability | A re-encoded signature changes the txid. BIP62 lists nine sources, and not all can be fixed by encoding rules. Mt. Gox's attribution is **contested**: Decker & Wattenhofer found no widespread attacks before the closure (abstract read). | [T1][P] |
| Synapse CVE-2025-30355 | An out-of-range `depth` integer halted federation. Exploited in the wild; fixed in 1.127.1. | [T1][P], verified |
| Dendrite | Releases 0.9.6 and 0.13.5 fixed canonical-JSON bugs: surrogate pairs, lower-casing of escapes, −0 and exponents. | [T1][P], CHANGES.md |
| Erigon #23038 | A decoder in which a bare EOL meant both "list ended" and "field absent". Canonical form was enforced only incidentally, by a hash comparison; a refactor would have made the lax decoder consensus-relevant. Fixed in PR #23993 (2026-09-18). | [T1][P], maintainer self-filed |
| rskj PR #3722 | Value-typed fields were normalised (wrong hash). Byte-typed fields were re-emitted as received (relayed forms stricter peers reject). Merged 2026-10-01 with more than 1,000 canonicality tests, a round-trip test, and a check that each rejection test goes red. | [T1][P] |
| canonicalize 3.0.0 | Lone surrogates were escaped instead of rejected, against RFC 8785 §3.2.2.2. Fixed in 4.0.0 (2026-08-12). The fix throws a plain `Error`, not the `TypeError` the release notes say. | [T1][P], code at commits; maintainer-merged |
| X41 TUF audit | Besides permissive verification, finding TUF-CR-22-03 (LOW): JSON number parsing is quadratic before the signature check. 4 MiB took 57.9 s, and the 5 MB metadata limit allowed about two minutes of CPU. | [T1][P], verified |
| Cosmos ASA-2024-0012/0013 | Deep nesting overflowed the stack in the strict unknown-field rejecter, and nested Any caused exponential cost. Fixed in 0.47.15 / 0.50.11. | [T1][P] |

### How strict validators are tested

- **Named negative vectors.**
  - ethereum/tests `invalidRLPTest.json`: 26 entries named by category, such as `nonOptimalLongLengthList1`.
  - dCBOR Table 4: 11 invalid encodings.
  - CDE Table 6: 8 failing examples, plus a 95-line CSV.
  - Bitcoin `script_tests.json`: flag-parameterised vectors.
  - Matrix spec examples.
- **Round-trip byte identity.** Bytes → value → bytes must equal the input. CDE suggests this when no
  checking decoder exists, though it calls the method somewhat clumsy. rskj's accepted-input test does the
  same. Value-level round trips, as in legacy-msg-data's fuzz targets, are weaker than byte identity.
- **Check ablation.** Disable each check and confirm the matching test fails (rskj).
- **Monotonicity fuzzing.** Adding a strictness flag may only turn passes into fails (Bitcoin `script_flags`).
- **Differential testing across implementations, and large oracle corpora.** Cyberphone's 100-million-line
  ES6 number corpus with a generator. [T1][P]
- **Do not trust a fixture that carries both bytes and decoded fields.** evmone and ethrex executed blocks
  from the JSON fields and never validated the RLP bytes (#1726, #7290). These issues are credible but not
  maintainer-confirmed (§9). The ethrex runner is source-confirmed.

### Application to ArrokothI

- **The agreed placement is the Bitcoin Core / Cosmos x/tx structure:** transport adapter holds the lenient
  bounded decoder and the cap; the core strict-validates canonical bytes. Prior art adds three conditions. [I]
  1. The adapter's output must be a deterministic function of the logical value, and the core must re-validate
     it rather than trust it.
  2. Never keep received bytes for one purpose and normalised bytes for another (the rskj dual failure).
  3. Caps on depth, size and cost belong inside the strict decoder too, not only in the transport (Cosmos
     advisory, Bitcoin `MAX_SIZE`, X41 quadratic parse).
- **Duplicate keys must be refused at the text layer.** JavaScript's `JSON.parse` keeps the last duplicate, so
  a canonicaliser over parsed objects cannot see duplicates. This is the RFC 8785 I-JSON requirement plus
  ordinary parser semantics. [P] for the RFC, [I] for the consequence.
- **Pick one key order and one number domain, and test them with golden vectors.**
  - JCS uses UTF-16 code-unit order. Matrix specifies code-point order. The two differ above U+FFFF.
  - Matrix limits integers to ±(2^53−1).
- **Treat a canonicalizer upgrade as an identity change.** canonicalize 5.0.0 changes output for some inputs.
  The Kernel's pre-validation passes a safe clone and appears to refuse those forms already (functions,
  undefined members, unsupported forms). That is our reading of `values.ts` comments, not tested. [I]
- **A self-written strict validator has no off-the-shelf "verify canonical" library to copy.** Use the CDE
  oracle (re-encode and compare bytes) plus named negative vectors.

### Projects and terms (Q1)

| Project | Exact source | Licence (where read) | Read |
|---|---|---|---|
| RFC 8785 JCS | rfc-editor.org/rfc/rfc8785.txt | IETF Trust (copyright notice) | [P] |
| cyberphone/json-canonicalization | github.com/cyberphone/json-canonicalization | Apache-2.0 (root LICENSE; API says NOASSERTION) | [P] |
| erdtman/canonicalize | registry.npmjs.org/canonicalize; lib/canonicalize.js at aba9209 (3.0.0), c1b08c37 (4.0.0), 31fb117 (5.1.0) | Apache-2.0 (LICENSE) | [P] |
| trailofbits/rfc8785.py | github.com/trailofbits/rfc8785.py | Apache-2.0 (LICENSE) | [P] |
| Matrix spec | spec.matrix.org appendices, rooms/v6; matrix-spec-proposals MSC2540 | Apache-2.0 (matrix-spec LICENSE) | [P] |
| Synapse | element-hq/synapse GHSA-v56r-hwv5-mxg6; matrix-org/synapse PR #7381 | element-hq fork AGPL-3.0 and matrix-org Apache-2.0 (both per API; files not read) | [P] |
| Dendrite / gomatrixserverlib | CHANGES.md; json.go and json_test.go | Apache-2.0 (Dendrite LICENSE read; gomatrixserverlib per API) | [P] |
| TUF spec / python-tuf / securesystemslib / go-securesystemslib / tough olpc-cjson | theupdateframework.github.io/specification; repos named in §Sources | CSL-1.0 / Apache-2.0 + MIT / MIT / MIT / MIT OR Apache-2.0 (files read) | [P] |
| X41 TUF audit | theupdateframework.io/audits/x41-python-tuf-audit-2022-09-09.pdf | not verified | [P], verified |
| TUF mailing-list RFC (2020) | groups.google.com/g/theupdateframework/c/xuT5wDA8kh8 | not verified | [P~] |
| SSB spec / ssb-validate / sunrise-choir crates / Buttwoo | spec.scuttlebutt.nz/print.html; ssbc/ssb-validate; sunrise-choir/legacy-msg-data; ssbc/ssb-buttwoo-spec | spec not verified / MIT / **LGPL-3.0** / not verified | [P] |
| Perkeep | perkeep.org/doc/json-signing | Apache-2.0 (COPYING) | [P] |
| BIP66, BIP62, BIP146, BIP141 | github.com/bitcoin/bips | BSD-2-Clause (66, 62) / PD (146, 141), per headers | [P] |
| Bitcoin Core | github.com/bitcoin/bitcoin (serialize.h, pubkey.cpp, interpreter.cpp, script_tests.json, fuzz) | MIT (file headers; COPYING not read) | [P] |
| Ethereum Yellow Paper | ethereum.github.io/yellowpaper/paper.pdf | not verified | [P] |
| go-ethereum rlp | github.com/ethereum/go-ethereum/tree/master/rlp | **LGPL-3.0** (library code) | [P] |
| py-rlp / ethereumjs rlp / ethereum/tests | as named | MIT / **MPL-2.0** / MIT-form (LICENSE) | [P] |
| RFC 8949; CDE −13; dCBOR −18 | rfc-editor.org/rfc/rfc8949; ietf.org/archive/id/... | IETF Trust | [P], CDE and dCBOR verified |
| bc-dcbor-rust; cbor2 | github.com/BlockchainCommons/bc-dcbor-rust; hildjj/cbor2 | BSD-2-Clause-Patent (per draft) / MIT | [P] |
| Cosmos SDK ADR-020/027/076, x/tx, GHSA-8wcc-m6j2-qxvm | github.com/cosmos/cosmos-sdk | Apache-2.0 (root LICENSE) | [P] |
| rskj PR #3722 | github.com/rsksmart/rskj/pull/3722 | LGPL-3.0 plus extra README use terms (**unresolved**) | [P] |
| erigon #23038 / PR #23993 | github.com/erigontech/erigon | **LGPL-3.0** (COPYING) | [P] |
| Decker & Wattenhofer | arxiv.org/abs/1403.6676 | not verified | [P] abstract only |

---

## 2. Realm integrity

*Analogy for the owner: a top-level `let JSON` in a classic script is like defining a new symbol in a scope
that every later lookup checks first, ahead of the global table. It is closer to `LD_PRELOAD` interposition
than to patching the original object. Restoring the original object does not help, because lookups no longer
reach it.*

### What others do

- **Node `primordials`** [T1][P]
  - Core keeps references to the built-ins captured from the VM and freezes the `primordials` object.
  - Built-ins are compiled with `CompileFunction` and receive `primordials` as a parameter, so destructured
    names resolve in parameter scope and never through the global environment.
  - An agent reproduced this [R]: after a global `let JSON = evil`, `util.inspect` still worked. Userland code
    that reads `JSON` late saw the attacker's binding. A reference captured at load (`const s =
    JSON.stringify`) was unaffected.
  - Node says primordials are not a security boundary. In the 2023 TSC thread, prototype pollution in core is
    not eligible for the bug bounty.
  - The 864-line doc lists its own limits: implicit iteration, `then` lookups, `@@hasInstance`, and others. It
    says nothing about the global-declarative hazard.
- **Cost** [T1][P]
  - Issue #29766 (2019) names `Function.prototype.call/apply` indirection and slower frozen-object lookups.
  - Hot paths were partly reverted, for example PR #38248 in 2021.
  - `node:http`, `http2`, `tls` and `zlib` are exempt.
  - A 2023 TSC proposal to remove primordials (#1438, 68 comments) closed without removal. The standing 2022
    vote limits them in error paths to cases with no significant regression.
  - A "29.9% gain" benchmark figure is [S] only.
- **Startup integrity check** [T1][P]
  - In TSC#1438 a contributor asked for a `primordialsCheck`. The SES side replied that not all intrinsic
    modifications are bad (polyfills) and asked what such a check would report.
  - The userland practice cited is capture-at-first-run (`get-intrinsic` / `call-bind`; licences not
    verified).
- **SES `lockdown()`/`harden()`** [T1][P]
  - Freezes intrinsics and hardens the values of named globals.
  - Leaves powerful globals in the start compartment and defines the universal global properties as
    configurable.
  - Its documented limits include availability, memory, timing, and guest code that never returns from a
    synchronous call, including a Proxy trap.
  - Guest code in a Compartment runs inside a `with`-scoped strict eval, so a guest `let` cannot create a
    global lexical. That protects guests, not host code in the start compartment.
  - **Conclusion: lockdown does not stop host-level `vm.runInThisContext("let JSON = …")`.** This rests on
    source plus spec reading; not executed. Likely.
  - No Tier 1 data on `lockdown()` startup cost was found. This is still a gap.
- **Node `--frozen-intrinsics`** [T1][P] plus [R]
  - Pins only `globalThis.globalThis`.
  - `cli.md` warns that `globalThis.Array` may not be the original intrinsic.
  - `let JSON` still shadows under the flag [R].
- **Spec mechanics** [T1][P], ECMA-262 source
  - Global HasBinding checks the declarative record first.
  - A lexical declaration fails only if HasRestrictedGlobalProperty is true, which needs an existing
    *non-configurable* own property.
  - `JSON`, `Object` and `Array` are configurable by default [R].
- **Defences reproduced by an agent** [R]
  - (a) Capture intrinsics at module load and never resolve a global identifier at call time. Works.
  - (b) Pin before any attack: `defineProperty(globalThis, 'JSON', {writable: false, configurable: false})`.
    Then `let`, `const`, `class` and `function JSON` throw SyntaxError. Sloppy-mode `var` and assignment are
    silent no-ops. The pin is process-global and irreversible, covers only names present at pin time, and can
    conflict with polyfills and test runners.
  - (c) Resolve the name via `vm.runInThisContext(name)` and compare it with the captured value. This detects
    an existing shadow, but only at that moment, not one a trap creates later.
  - No project was found that runs (c) at startup. This is an absence-of-evidence result.
- **ShadowRealm** [T1][P]
  - Stage 2.7. It was demoted from Stage 3 in September 2023 and returned to 2.7 in February 2024.
  - A December 2024 Stage 3 request was withdrawn: browsers had no DOM/HTML interest, and the HTML PR #9893
    has been open since 2023.
  - Web-platform tests removed it on 2026-05-12, "without implementer support".
  - Node PR #65650, which removes `--experimental-shadow-realm`, was open on 2026-10-02.
  - The champions describe it as an integrity tool, not a security boundary.

### Application to ArrokothI

- **Review-03's hop needs two conditions.** Caller code (a trap) runs inside the serializer window, *and* the
  serializer resolves a global by name at call time. canonicalize resolves `JSON` that way. [I]
- **A bytes core removes the first condition.** Validating bytes runs no caller code. If the core's own code
  captures intrinsics at module load, the second condition goes too. This is Node core's approach, done by
  construction and without a check. [I]
- **The object → bytes wrapper still has both conditions.** It stays under the cooperative contract.
- **Pinning globals (defence b) is the only measure observed to make the declaration itself fail.**
  - It is a process-global mutation of the host's realm, which an embedded kernel may not be entitled to make.
  - It suits defence-in-depth, matching the owner's option 4 "evaluate, not a guarantee" position.
- **A startup name-resolution check (c) has no precedent and is point-in-time.** It is useful only as a
  self-test, not as enforcement. [I]

### Projects and terms (Q2)

| Project | Exact source | Licence | Read |
|---|---|---|---|
| Node.js primordials | nodejs/node doc/contributing/primordials.md; lib/internal/per_context/primordials.js; src/node_builtins.cc; lib/internal/bootstrap/realm.js | MIT (LICENSE) | [P] |
| Node freeze_intrinsics.js | lib/internal/freeze_intrinsics.js | Apache-2.0 (SPDX header; SES-derived) | [P] |
| Node TSC#1438; vote 2022-02-21 | github.com/nodejs/TSC/issues/1438 | not verified | [P], about 22 of 68 comments |
| Node perf commits / PRs | commits eb8f7ee634, 4f85f52933, 680e9cc7e1; PR #38248; issue #29766 | MIT | commits [P]; PR/issue bodies [S] |
| ECMA-262 | github.com/tc39/ecma262 spec.html | Ecma text/code policy (LICENSE.md) | [P] |
| SES (endojs/endo) | packages/ses README, src/global-object.js, src/lockdown.js, src/make-evaluate.js; docs/lockdown.md | Apache-2.0 (package.json, LICENSE; NOTICE obligations) | [P], not executed |
| ShadowRealm | tc39/proposal-shadowrealm; tc39/notes 2024-12, 2025-02, 2025-09, 2026-01; whatwg/html#9893; wpt#59794; nodejs/node#65650 | proposal/notes not verified; WHATWG CC BY 4.0 (code BSD-3-Clause); Node MIT | [P] |
| JSC `@` builtins | philomates.github.io 2021 article | not verified | [S] |

---

## 3. Proxy policy

*Analogy: a Proxy is an object whose every attribute read, key listing and type query can be answered by
caller code, like a Python object overriding `__getattribute__`, `__dir__` and `__class__` at once.*

### What others do

| System | Policy | Detail | Read |
|---|---|---|---|
| HTML structured clone | **Refuse** | StructuredSerializeInternal throws DataCloneError for exotic objects. The spec's own example of such an object is a proxy. Arrays must be Array exotic objects, and a source comment notes IsArray supports proxies, "which we cannot". | [T1][P] |
| V8 ValueSerializer (`v8.serialize`, `structuredClone`) | **Refuse** | `JS_PROXY_TYPE` is a special receiver and is thrown on, including when revoked [R]. Node docs say equal values may serialize differently, so it cannot serve as canonical bytes. | [T1][P] + [R] |
| workerd serializer | **Refuse by default** | `serializeProxy` throws, with a TODO doubting that general Proxy serialization is possible. | [T1][P] |
| workerd RPC override | **Conditional** | A Proxy that presents as a plain object or RpcTarget becomes a *stub*, not a copy, so traps keep running. The authors' comment says this may have been a bad choice. The serialized-size limit is 32 MiB. | [T1][P] |
| Cap'n Web | **Accept as presented** | Classifies via `getPrototypeOf` and walks with `for…in`, so all traps fire. No Proxy detection. Defaults: `maxDepth` 256, `maxMessageSize` 32 MiB counted in UTF-16 code units, checked after the transport buffers. Its docs tell operators to set transport-level caps too. | [T1][P] |
| Endo `passStyleOf` | **Accept, gated on frozen** | No detection. The WeakMap memo "has some observability on proxies" (passStyleOf.js). The comment that pass-by-copy structures are *assumed* to contain no proxies is in **remotable.js:97**, not passStyleOf.js (fact-check correction, grep-confirmed). | [T1][P] |
| comlink | Not applicable / trap-observable | `Comlink.proxy` is a marker symbol, not an ES Proxy. The marker check is a `get`, so a trap can claim it. Unmarked values go to postMessage, so a real Proxy hits the structured-clone refusal. | [T1][P] |
| devalue | **Accept by default; opt-in hook** | The README says getters and traps fire by default. Since 5.9.0 an `operations` option allows captured-intrinsic introspection for deterministic or sandboxed runtimes. Current version read: 6.0.2. | [T1][P] |
| superjson | **Accept as presented** | Uses `getPrototypeOf`, `instanceof` and `Array.isArray`, all of which see through Proxies. | [T1][P] |

**Detection limits.**
- `util.types.isProxy` is Node-only and returns a bare boolean, with no target or handler. It is true for
  plain, revoked, cross-context and proxy-of-proxy values. [T1][P] + [R]
- Revoked Proxies make `Array.isArray`, `Object.keys` and `JSON.stringify` throw. [R]
- Only callable Proxies leak through `Function.prototype.toString`. [P] spec + [R]
- TC39 chose not to add `Proxy.isProxy`, to keep virtualization transparent. Van Cutsem & Miller recommend an
  app-specific WeakMap registry of the app's own proxies. [T1][P] The 2011 es-discuss thread is [S].

**Consequences reported.**
- Refusal pushes users to unwrap first. Vue reactive objects fail `structuredClone` (vercel/ai#4761 [S];
  PRUNplanner#524 [S]: `toRaw` unwraps only the top level).
- OpenClaw PR #162611 replaced a Proxy-wrapped env with a plain object [T3][P].
- Immer's `current()` gives a non-Proxy snapshot [T1][P].
- The MobX `toJS` claim is [S] only.

### Application to ArrokothI

- **Prior art for an identity-deriving boundary favours PROXY-01 answer 2 (refuse).**
  - Every platform serializer refuses Proxies.
  - The accepting libraries make no integrity claim, and none defends against global shadowing by default.
  - Endo accepts only under frozen discipline and an explicit "assume no proxies".
  - In Node, `util.types.isProxy` makes refusal mechanical at every depth. [I]
- **Cost: not portable to browsers.** Refusal there would need a structured-clone probe. Callers unwrap first,
  as Vue and Immer users already do. [I]
- **With a bytes core, the policy lives only in the wrapper, and the core never sees a Proxy.** This matches
  the audit's conclusion that a bytes core does not settle PROXY-01; it only moves where the answer applies.

### Projects and terms (Q3)

| Project | Exact source | Licence | Read |
|---|---|---|---|
| WHATWG HTML | github.com/whatwg/html source (StructuredSerializeInternal) | CC BY 4.0; code BSD-3-Clause (LICENSE) | [P] |
| V8 | src/objects/value-serializer.cc, instance-type.h | BSD-style (header; SPDX not verified) | [P] |
| Node util/v8 docs, node_types.cc | doc/api/util.md, v8.md; src/node_types.cc | MIT | [P] |
| cloudflare/workerd | src/workerd/jsg/ser.h, ser.c++; api/worker-rpc.c++ | Apache-2.0 | [P] |
| Cloudflare RPC docs | developers.cloudflare.com/workers/runtime-apis/rpc | CC BY 4.0 header (code samples not verified) | [P] |
| cloudflare/capnweb | src/core.ts, src/serialize.ts, security guide | MIT | [P] |
| @endo/pass-style | passStyleOf.js, remotable.js, copyRecord.js | Apache-2.0 | [P], verified with correction |
| comlink | GoogleChromeLabs/comlink src/comlink.ts | Apache-2.0 | [P] |
| devalue | sveltejs/devalue README, CHANGELOG, src | MIT | [P] |
| superjson | flightcontrolhq/superjson src | MIT | [P] |
| immer | immerjs/immer src/core/scope.ts, docs | MIT | [P] |
| Van Cutsem & Miller TR-12-03 | static.googleusercontent.com/.../37741.pdf | not verified | [P] |

---

## 4. Idempotent creation

### What others do

| System | "Same request" means | Conflicting retry | Other rules | Read |
|---|---|---|---|---|
| Stripe | Same key and the parameters compare equal. The comparison method is not documented. | Error. Status/code not given on the pages read. | Replays the saved result, including 500s, with `Idempotent-Replayed: true`. Keys may be pruned after 24 h, and a pruned key is a new request. Keys up to 255 chars. Results are saved only after execution begins; 429/401 are checked before the idempotency layer. Concurrent requests: 409. | [T1][P] |
| Brandur (Stripe-like reference design) | `(user_id, key)` unique. Request params stored as JSONB and compared in application code. | 409, the same status as in-flight. | `recovery_point` phases; SERIALIZABLE key acquisition; reaper at about 72 h. | [T1/T3][P]; repo MIT |
| IETF Idempotency-Key draft-07 (expired 2025-10-15) | Fingerprint optional (MAY). Whole or partial checksum, field match or signature. **Equality not defined.** | SHOULD 422 | 409 for concurrent; 400 for a missing key; return the prior result after completion; composite key with client-specific attributes; expiry is server policy. | [T1][P], verified |
| AWS ClientToken | Same token and every parameter except Region/AZ, which are the token's *scope*. | `IdempotentParameterMismatch`. The Builders' Library says to assume different intent and return a validation error. | Token and creation recorded atomically; token scoped to caller identity; responses semantically equivalent, not byte-identical. | [T1][P] |
| Temporal | Workflow ID among running runs; `request_id` dedup per run. | Reuse/conflict policy. **No input comparison** found. USE_EXISTING silently returns the running run. | `AlreadyStarted` carries start_request_id and run_id. Issue #12103: history is written before policy checks [S]. PR #11968: SignalWithStart retried after close could double-signal [S]. | [T1][P], two server files plus docs |
| DBOS | Workflow ID. Function, class and config names are compared. | `DBOSConflictingWorkflowError` on a function mismatch. **Inputs: first write wins silently.** | Random `creator_xid` tells "my own retry" from "someone else's start"; reuse policy `reject` added 2026-09. | [T1][P] |
| Azure Durable Functions | Instance ID per task hub | None: check-then-start is racy, and both clients may report success | Docs suggest extra locking for strict guarantees. | [T1][P] |
| Cosmos ADR-076 | — | — | Hashing raw submitted bytes is not a safe unique identifier. Use deterministic representations or nonces. | [T1][P] |

### Application to ArrokothI

- **The replay/conflict rule follows the Stripe/AWS/IETF model and is stricter than Temporal/DBOS.**
  ArrokothI's rule is same key plus same canonical payload is a replay, and a different payload is a conflict.
- **Canonical bytes give it what none of them has: a precise equality.** That holds only while canonical bytes
  are a function of the logical value. The V-ENV hop broke exactly that: steered bytes were accepted as a
  replay, which collapses AWS's "different intent" into "same request". [I]
- **Decide explicitly what is key scope and what is compared payload.** AWS puts Region/AZ and caller identity
  in scope. ArrokothI's `authorityContext` needs the same classification. [I]
- **Recording the outcome:**
  - Record the creation and the key atomically (AWS).
  - Say whether a refused creation is replayed or re-evaluated. Stripe does not save validation failures, so
    they can be retried.
  - Plan retention before persistence arrives. Every surveyed system expires keys. [I]

### Projects and terms (Q4)

| Project | Exact source | Licence | Read |
|---|---|---|---|
| Stripe docs | docs.stripe.com/api/idempotent_requests; docs.stripe.com/error-low-level | proprietary docs (not verified) | [P] |
| Brandur / rocket-rides-atomic | brandur.org/idempotency-keys; github.com/brandur/rocket-rides-atomic | article not verified; repo MIT | [P] |
| IETF draft-07 | ietf.org/archive/id/draft-ietf-httpapi-idempotency-key-header-07.txt | IETF Trust; code Revised BSD | [P], verified |
| AWS | docs.aws.amazon.com/ec2/latest/devguide/ec2-api-idempotency.html; aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs | not verified | [P] |
| Temporal API / server | temporalio/api protos; temporalio/temporal service/history/api/startworkflow/api.go, api/workflow_id_dedup.go | MIT (LICENSE) | [P] |
| DBOS | docs.dbos.dev; dbos-inc/dbos-transact-py dbos/_sys_db.py; PR #862 | MIT (LICENSE head) | [P] |
| Microsoft Learn: singletons | learn.microsoft.com/en-us/azure/durable-task/common/durable-task-singletons | not verified | [P] |

---

## 5. Single writer, fencing and takeover

### What others do

- **Kleppmann (2016)** [T1][P]
  - A paused lease holder resumes after expiry. The fix is a token that increases on every acquisition, which
    the *resource* checks and rejects if lower than one it has seen.
  - Random unique values (Redlock) do not qualify.
  - CC BY 3.0.
- **Temporal** [T1][P], server code
  - Activity and workflow-task completions are compared against live mutable state: scheduled ID, started ID,
    attempt and version. A mismatch gives NotFound.
  - Shard ownership uses a monotonically increasing RangeID.
  - Sticky queues are a performance feature; correctness comes from the token check.
  - Completing an activity *by ID* skips the attempt check. This is a code reading, not documented.
  - Heartbeat timeout is opt-in. The server cannot detect a crashed worker on its own; Start-To-Close is the
    backstop.
- **Cadence** [T1][P]
  - The token is WorkflowID, RunID, ScheduleID and ScheduleAttempt. The fence comes from history event IDs
    plus the attempt counter.
  - A missing decision with ScheduleID ≥ NextEventID means the handler's own cache is stale, so it reloads.
- **Restate** [T1][P], BUSL-1.1
  - `InvocationEpoch` (PR #2904, merged 2025-04-29) was checked in the replicated state machine. It was removed
    on 2025-11-29 (v1.6).
  - Current `main` mints an in-memory u32 `FencingToken` per (re)invoke. It is checked by the *leader* before
    proposing to the log, stripped before Bifrost, and discarded on leadership loss.
  - The docs still describe epochs.
  - #5375 (fixed): a notification was delivered twice during attempt start.
  - docs-restate#410: `ctx.run` side effects re-execute after a crash between action and journal (30 of 30
    trials) [S].
- **Azure DTFx** [T1][P], #410 verified
  - Lease stealing was non-cooperative and caused split-brain and duplicate activities.
  - The fix is two leases per partition: a stealable intent lease and a never-stolen ownership lease, with a
    drain. The author's preliminary measurement was about 20% slower scale-out.
  - #281: duplicate execution after a partition moved.
  - #724: duplicate TaskCompleted left orchestrations stuck; fixed by de-duplicating before writing history.
- **DBOS** [T1][P]
  - A random `owner_xid` is compared under a row lock at each checkpoint. Terminal writes land only on a row
    that is still PENDING and still owned.
  - Callers outside a workflow context pass no token and are unchecked.
  - Since PR #862 (2026-09-24), a re-dispatched workflow runs alongside the stale one, which "parks" at its
    next write.

### Application to ArrokothI

- **All systems put enforcement at the durable commit and compare the token with current state.**
  - None stops a stale worker's native side effects.
  - This matches AGENTS.md: Kernel fencing does not prevent stale native-session mutation, and Drivers must
    prove safe takeover or refuse it.
- **Token forms seen:**
  - monotonic counter (Kleppmann, RangeID);
  - attempt tuple (Temporal, Cadence);
  - random owner ID plus row lock (DBOS);
  - leader-local in-memory token (Restate).

  An in-process kernel can use an in-memory per-Activation token. Once Kernel state persists, the token must
  persist with it or be minted from persisted state, or a restart reopens the window. [I]
- **Prior art suggests two acceptance tests.** [I]
  - A commit with a superseded token must change no state.
  - Every completion path must be fenced. Temporal's by-ID path is the counterexample.

### Projects and terms (Q5)

| Project | Exact source | Licence | Read |
|---|---|---|---|
| Kleppmann | martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html | CC BY 3.0 (page link) | [P] |
| Temporal server | service/history/api/{respondactivitytaskcompleted, respondworkflowtaskcompleted}, activity_util.go, docs/architecture/history-service.md | MIT | [P] |
| Temporal docs | docs.temporal.io/encyclopedia/detecting-activity-failures; /sticky-execution | not verified | [P] |
| Cadence | cadence-workflow/cadence service/history/decision/handler.go | Apache-2.0 (LICENSE) | [P] |
| Restate | restatedev/restate crates/worker/src/partition/{state_machine, leadership/fencing.rs, leadership/leader_state.rs}; PR #2904; commit 8458c582ea; issues #5375, #5425 | **BUSL-1.1** (LICENSE; Additional Use Grant bars a public Restate platform service; converts to Apache-2.0 after 4 years). Learning only. | [P] |
| Azure/durabletask | issues #281, #410 (PR #427), #724 | Apache-2.0 (durabletask); azure-functions-durable-extension MIT per API | [P], #410 verified |
| DBOS | as in Q4 | MIT | [P] |

---

## 6. Waits, timers and cancellation (K1.3)

### What others do

- **Temporal server** [T1][P]
  - A timer task in the queue is only a hint. At fire time the executor reloads mutable state and fires only
    timers still pending there. A cancelled timer's task is a no-op.
  - `AddTimerCanceledEvent`: if the timer already fired but the TimerFired event is still *buffered*, cancel
    deletes that event, so cancellation wins retroactively. If there is neither a pending timer nor a buffered
    fire, the task fails with BAD_CANCEL_TIMER_ATTRIBUTES.
  - Events arriving during an in-flight workflow task are buffered. A closing command (complete, fail, cancel,
    continue-as-new) with buffered events fails the task with **UNHANDLED_COMMAND** and schedules a new one.
  - `RequestCancelWorkflowExecution` on a closed run is a successful no-op. A repeated request is a no-op.
  - sdk-java #3088: the bundled test server diverged from the real server on this case.
- **Temporal TS SDK and sdk-core** [T1][P]
  - Each `sleep` takes a per-run increasing seq. Cancelling deletes the completion and emits CancelTimer only
    if the timer is still pending, so a late fire is a no-op.
  - The core timer state machine ignores Cancel in the Fired and Canceled states.
  - Within one activation, jobs are stable-sorted: init, patches, seed, signals/updates, *other*, local-activity
    resolutions, queries, evictions. `fire_timer` and `cancel_workflow` share the "other" rank, so history
    order decides between them.
  - The TS SDK applies all jobs before running microtasks. A fire and a cancel in the same activation should
    let the fire win. This is a code reading, untested.
  - **A design defect fixed behind a replay flag** (1.10.2/1.11.0, `NonCancellableScopesAreShieldedFromPropagation`):
    - `withTimeout` left its timeout timer pending after the body finished;
    - cancelling a non-cancellable scope still propagated to its children (issue #1423 [S]).
- **Azure DTFx / Durable Functions** [T1][P]
  - A TimerFired event for a timer no longer awaited is logged as "Duplicate TimerFired" and ignored.
  - There is no cancel-timer action, so the delayed message still arrives and is dropped.
  - Timer messages carry an ExecutionId. The dispatcher drops messages for previous executions. This is the
    per-lifetime tag Restate's timers lack.
  - Un-cancelled timers keep the orchestration Running. The docs' own Java example forgets to cancel one.
  - JS, Python and PowerShell timers are limited to 6 days; long timers are chunked. The "7 days" figure was
    not found in current docs.
  - durabletask-python PR #280 (merged 2026-10-02) adds a terminal-state guard so late chunk callbacks cannot
    resume a completed orchestration [S].
  - #1019 (open since 2023): a TimerFired was repeatedly abandoned after a partition moved. No root cause given.
  - #636 and durable-python #348 are open timeout/cancel anomalies [S].
- **Erlang/OTP** [T1][P]
  - `cancel_timer` returning false does not tell you whether the timeout message has already arrived.
  - `start_timer` tags each message with a unique TimerRef.
  - gen_statem keeps running timers by type and parks refs that were "cancelled with message pending". It
    drops a parked ref's message on arrival and passes unknown refs through as ordinary info.
  - State timeouts auto-cancel on a state change; event timeouts are cancelled by any event.
  - For gen_server, ref-tagging is a user convention; no primary write-up of it was found.
- **Restate#5425** [T1][P], confirmed via the GitHub API
  - Purging a workflow does not delete its sleep timers. The next run of the same key gets the same invocation
    ID, so the old timer fires into it: an early wake-up, or failure RT0007.
  - Reproduced 3/3 on 1.7.8 and 4/4 on 1.7.12.
  - A Restate contributor (tillrohrmann) replied the same day: the analysis is correct, timers should be
    invalidated short-term, and a redesign isolating runs is the long-term fix.
  - Timers are keyed by invocation ID with no generation. The removed epoch would not have helped, because a
    fresh invocation restarts at epoch 0 [I].

### Application to K1.3

[I], synthesised from the above:

1. **Key every timer and wait by a Kernel-minted lifetime identity plus a sequence number.**
   - Use (Execution ID, generation, seq). DTFx's ExecutionId, OTP's TimerRef and Temporal's per-run seq all do
     this.
   - If an Execution ID or creation key can ever be reused after purge or recreation, the generation must be
     part of the timer key (Restate#5425).
2. **Re-derive at fire time.** A fire is a hint. Resolve it against current Execution state, and treat a fire
   for an unknown or non-pending wait as a no-op that is recorded (Temporal, DTFx).
3. **Cancellation must tolerate an in-flight fire.**
   - Either tombstone the cancelled timer (OTP) or retract an unobserved fire (Temporal).
   - State which one wins when both are pending at an Activation boundary. Temporal's rule: what the workflow
     has already observed decides.
4. **Refuse terminal Outcomes that ignore pending Kernel-visible events.** Temporal's UNHANDLED_COMMAND is the
   closest analogue for an Outcome that completes while a fire or cancel is pending.
5. **Cancel requests on terminal Executions are idempotent no-ops.**
6. **Terminal-state guard on every timer callback** (durabletask-python PR #280).
7. **Pending timers must not keep a terminal Execution non-terminal** (the DTFx Running trap).

Test style for these races: fast-check `scheduler` / `scheduledModelRun` controls promise resolution order
reproducibly, and real timers need separate control (§8).

### Projects and terms (Q6)

| Project | Exact source | Licence | Read |
|---|---|---|---|
| Temporal server | timer_queue_active_task_executor.go; workflow/mutable_state_impl.go; historybuilder/event_store.go; api/requestcancelworkflow/api.go | MIT | [P] |
| Temporal TS SDK | temporalio/sdk-typescript packages/workflow/src/{cancellation-scope.ts, workflow.ts, internals.ts, flags.ts}; worker-interface.ts | MIT | [P] |
| sdk-core (now temporalio/sdk-rust) | crates/sdk-core/src/worker/workflow/{mod.rs, machines/timer_state_machine.rs}; workflow_activation.proto | MIT (LICENSE.txt) | [P] |
| Temporal docs | docs.temporal.io/develop/typescript/workflows/cancellation-scopes; /references/errors | not verified | [P] |
| sdk-java #3088; sdk-typescript #1423 | GitHub issues | sdk-java not verified; sdk-typescript MIT | [P] / [S] |
| Azure DTFx | Azure/durabletask src/DurableTask.Core/{TaskOrchestrationContext.cs, TaskOrchestrationDispatcher.cs}; issue #1019 | Apache-2.0 | [P] |
| Microsoft Learn durable timers | learn.microsoft.com/en-us/azure/durable-task/common/durable-task-timers | not verified | [P] |
| durabletask-python PR #280 | github.com/microsoft/durabletask-python/pull/280 | MIT | [S] |
| Erlang/OTP | erlang.org/doc/apps/erts/erlang.html; /stdlib/gen_statem.html; erlang/otp lib/stdlib/src/gen_statem.erl | Apache-2.0 (SPDX header, LICENSE.txt); docs not verified | [P] |
| Restate#5425 | github.com/restatedev/restate/issues/5425 | BUSL-1.1 | [P], API-confirmed |

---

## 7. Plan/apply decomposition and structural single writer

### What others do

- **Decider (Chassaing, 2021)** [T1][P]
  - `decide: Command → State → Event list` is pure. `evolve: State → Event → State` is the only place state
    changes.
  - It is a shape, not enforcement.
- **Functional Core / Imperative Shell (Bernhardt, SCNA 2012)** [T1][P], talk page only
  - Values as boundaries between components.
  - The core-decides/shell-acts description is [S].
- **Redux** [T1][P]
  - Principles: one store, changes only via actions, pure reducers.
  - The FAQ says immutability is up to the reducer author. Redux Toolkit adds *dev-only* mutation detection.
  - This is prior art that a single-writer rule erodes without a mechanical check.
- **DDD aggregates (Fowler 2013; Vernon 2011)** [T1/T2][P]
  - A design rule: modify one aggregate per transaction, references go only to the root. No language-level
    enforcement.
- **Import-boundary tools** [T1][P]
  - dependency-cruiser: forbidden, reachable and required rules; severity defaults to `warn`; can treat
    type-only edges differently.
  - eslint-plugin-boundaries: element classification.
  - ESLint `no-restricted-imports`: `allowTypeImports` could allow importing a Plan type but not its
    constructor [I].
  - Nx: tag constraints.
  - TS project references: project-level only.
- **Vacuous rules** [T1][P], verified
  - ArchUnit 0.23.0 made a rule whose should-set is empty fail by default.
  - Issue #806 shows the cost: `noClasses()` rules began failing once the forbidden code was gone.
  - PR #816 added a per-rule `allowEmptyShould(true)`, and noted the change had broken `optionalLayers`.
  - c-next #1611 (2026-09, [T3][P]) describes the same silent-pass failure for dependency-cruiser and proposes
    a mutation-checked "every rule arm matches something" test.
- **Brands** [T1][P]
  - A `unique symbol` brand exists only for `tsc`; `as` can forge it.
  - TS `private` is type-level only. JS `#private` fields are runtime-private, cannot be proxied, and `#x in
    obj` is a brand check (MDN [T2][P]). The TS handbook points to `#private`, closures or WeakMaps against
    malicious callers.
- **Negative type tests** [T1][P]
  - `// @ts-expect-error` fails if the next line has *no* error, but accepts *any* error.
  - `tsd` `expectError` accepts only a whitelist of diagnostic codes and reports "Expected an error, but found
    none".
  - expect-type uses `.not` and `@ts-expect-error`.

### Application to the coordinator refactor

[I]

- **The owner's shape matches the Decider.** Immutable plan union, single state-owner apply, read-only views.
- **Make sole-writer structural at two levels.**
  1. **Module level.** A dependency rule says only `apply` imports the mutable-state module. Pair it with a
     non-vacuity assertion, as in ArchUnit: each rule must match at least one file. Add a must-fail fixture
     (an injected bypass import makes the check red).
  2. **Value level.** Only `apply` can construct the next state. Use a module-private constructor or a
     `#private` brand checked at runtime, plus `tsd`/`@ts-expect-error` fixtures that a forged Plan fails to
     type-check. For `@ts-expect-error`, also pin the expected diagnostic code.
- **Bypass mutants** (the owner's acceptance criterion) are the runtime analogue of these must-fail fixtures.

### Projects and terms (Q7)

| Project | Exact source | Licence | Read |
|---|---|---|---|
| Decider | thinkbeforecoding.com/post/2021/12/17/functional-event-sourcing-decider | not verified | [P] |
| Boundaries talk | destroyallsoftware.com/talks/boundaries | commercial, not verified | [P], page only |
| Redux | redux.js.org three-principles, FAQ immutable-data | MIT (repo) | [P] |
| Fowler / Vernon | martinfowler.com/bliki/DDD_Aggregate.html; dddcommunity.org Vernon_2011_1.pdf | not verified | [P] |
| dependency-cruiser | github.com/sverweij/dependency-cruiser doc/rules-reference.md | MIT | [P] |
| eslint-plugin-boundaries | github.com/javierbrea/eslint-plugin-boundaries | MIT | [P] |
| ESLint no-restricted-imports | eslint.org/docs/latest/rules/no-restricted-imports | not verified | [P] |
| Nx | nx.dev/features/enforce-module-boundaries | MIT (nrwl/nx) | [P] |
| TypeScript handbook, 3.9 notes | typescriptlang.org; TypeScript-Website | Apache-2.0 (TS); CC-BY-4.0 (website) | [P] |
| tsd / expect-type | github.com/tsdjs/tsd; github.com/mmkal/expect-type | MIT / Apache-2.0 | [P] |
| ArchUnit | github.com/TNG/ArchUnit releases v0.23.0; issue #806; PR #816; user guide §10.4 | Apache-2.0 | [P], verified |
| c-next #1611 | github.com/jlaustill/c-next/issues/1611 | not verified | [T3][P] |

---

## 8. Evidence tooling: corpus, mutation registry, simulation, coverage

### What others do

- **StrykerJS** [T1][P]
  - **Report IDs are a per-run counter in AST order.** Any added or removed mutant renumbers every later one.
    The schema says IDs can correlate across reports; the implementation does not deliver that.
  - Incremental mode matches by a **content key** (file, start–end position, mutator, replacement). It remaps
    positions with a text diff and drops a mutant if its own range was edited.
  - Reuse is test-aware. A kill is reused only if the killing test is unchanged; a survival only if no new test
    covers it.
  - It cannot see changes in dependencies, env vars, snapshots or non-mutated files, and recommends periodic
    `--force` runs.
  - The author says *not* to treat the incremental file as source; it is a CI artifact.
  - Scoring (verified): timeout counts as detected; compile and runtime errors are *invalid* and excluded;
    ignored mutants are excluded. `// Stryker disable … : reason` keeps the mutant in the report as ignored,
    with the reason shown.
- **PIT** [T1][P]
  - Uses history files with similar reuse rules.
  - States the dependency-change assumption as unproven.
- **Google** (Petrović et al., TSE; 2018 ICSE-SEIP) [T1][P], full text
  - **Arid nodes** (logging, time and deadline calls, and similar) are never mutated. More than a hundred
    hand-curated heuristics; some are deliberately unsound.
  - Productivity rose from about 15% to 89%, with 82% overall. Median mutants per change fell from 820 to 7.
  - At most one mutant per line, surfaced as code-review findings.
  - Redundant mutants are suppressed so reports stay consistent across snapshots.
  - **Neither paper discusses hand-written or curated mutants.**
- **FoundationDB** [T1][P], paper plus source
  - BUGGIFY injects unusual but contract-preserving behaviour at (file, line) points. Each point is activated
    with probability 0.25 per run and fires with 0.25.
  - Swarm testing randomises which points are on in each run.
  - Failures reproduce by the same seed. TestHarness2 records the seeds, and re-runs 5% of tests to compare the
    final RNG state as a determinism check.
  - **No source says failing seeds are committed as permanent tests.** Field bugs are first made reproducible
    in simulation.
  - `CODE_PROBE` counts hits. A probe marked `rare` is a **declared, tracked coverage gap**, and an unhit probe
    never fails a run by itself.
- **TigerBeetle VOPR** [T1][P]
  - Seed plus Git commit replays the exact run.
- **fast-check** [T1][P]
  - No on-disk persistence.
  - `seed` replays a run. `path` jumps to the shrunk counterexample; it indexes `examples` followed by
    generated values, so editing `examples` shifts it.
  - `replayPath` exists only on `fc.commands`.
  - **The maintainer (Discussion #4406, 2023) says to persist regressions as `examples`**: they are designed to
    persist forever, while `seed`+`path` may change after a minor version bump.
  - `fc.scheduler` / `scheduledModelRun` give seed-reproducible async interleavings, but cannot control
    `fetch` or external emitters.
- **Hypothesis** [S]/[P~]
  - `@example` pins a regression permanently.
  - `@reproduce_failure` and the example database are not stable across versions.
- **Go fuzzing and proptest** [T1][P]
  - Go writes failing *inputs* to `testdata/fuzz/<Name>/`, and they run by default.
  - proptest commits *seeds* in `proptest-regressions/`.
- **libFuzzer / OSS-Fuzz** [T1][P]
  - libFuzzer re-runs saved inputs as regression tests; `-merge=1` minimises a corpus.
  - OSS-Fuzz seed corpora.
- **QuickCheck** (Hughes) [T1][P], full text
  - AUTOSAR/Volvo: more than 200 problems, more than 100 of them in the standard itself.
  - One bug was an interaction between two encodings of the same identifier: an extended-ID flag bit that a
    queue comparison forgot to mask. Shrinking found a 4-step minimal case.
  - Hughes argues that pair and triple interactions make hand-written suites grow quadratically or cubically.
- **Kuhn, Wallace & Gallo, TSE 2004** [T1][P], full text
  - Cumulative share of faults triggered by ≤ n conditions:

    | Dataset | n = 1 | 2 | 3 | 4 | 5 | 6 |
    |---|---|---|---|---|---|---|
    | Medical devices | 66 | 97 | 99 | 100 | | |
    | Browser | 28.6 | 76.1 | 95.0 | 97.2 | 99.4 | 100 |
    | Server | 41.7 | 70.3 | 89.3 | 96.4 | 96.4 | 100 |
    | NASA GSFC | 67.5 | 93.3 | 98.8 | 100 | | |

  - The paper's own caveat: near-exhaustive only when behaviour does not depend on complex event sequences and
    the variables have small discrete domains.
- **NIST combinatorial coverage** (NISTIR 7878; CCM and CCMCL manuals) [T1][P]
  - Coverage is measured against a parameter model. Worked example: 2-way coverage 33% versus
    variable-value coverage 79%.
  - **The CCM GUI infers the value domain from the tests, so it cannot show a never-exercised value.** CCMCL
    can take a declared ACTS `[Parameter]`/`[Constraint]` file and list missing combinations.
  - A dimension fixed to one value is modelled as a 1-value variable.
  - No NIST tool asks a human to declare which dimensions were not varied.

### Application to TOOLS-01

TOOLS-01 was in progress on its own branch when this was written; 007 owns its current state. These
are design and review inputs, not requirements. [I]

1. **Registry identity.** Key each named hand-written mutant by content: file, a stable anchor, operator and
   replacement. Do not use an ordinal or a line number. Treat "mutant no longer applies" as an explicit
   stale state, as Stryker drops a mutant when its own range changes.
2. **Kill semantics.**
   - A mutant that fails to compile or crashes the harness is *invalid*, not killed (Stryker).
   - Record `killedBy` as the first failing test.
   - Make waivers carry a reason and stay visible.
3. **Corpus entries store inputs (bytes or values), not seeds.** Seeds reproduce only on the same code and
   generator (fast-check maintainer, Hypothesis, FoundationDB, VOPR). Seeds are fine for troubleshooting.
4. **Declared dimension manifest.** For each corpus family, declare the parameters and domains in an
   ACTS-like file (for example access form: assignment, `defineProperty`, declaration). Mark unvaried
   dimensions as 1-value variables, and let the verify command report missing t-way combinations. Inferred
   domains hide the very gap HOP-01 found.
5. **Non-vacuity everywhere.** Every guard, rule and probe must be shown to match or fire on at least one
   input, with an explicit, reasoned opt-out (ArchUnit `allowEmptyShould`, FoundationDB `rare`).
6. **Staleness.** Incremental reuse needs a forced full rerun per packet (Stryker and PIT both say their reuse
   can drift).
7. **Race corpus for K1.3.** Use model-based commands with a controlled scheduler, and store the minimal
   interleavings as explicit scenarios.

### Projects and terms (Q8)

| Project | Exact source | Licence | Read |
|---|---|---|---|
| StrykerJS | stryker-js packages/core/src/mutants/incremental-differ.ts; packages/instrumenter/src/transformers/mutant-collector.ts (master f2a49ff0); incremental blog 2022-09-06; docs mutant-states (verified) | Apache-2.0 | [P] |
| mutation-testing-report-schema | stryker-mutator/mutation-testing-elements | Apache-2.0 (LICENSE header) | [P] |
| PIT | pitest.org/quickstart/incremental_analysis | Apache-2.0 | [P] |
| Google mutation papers | arxiv.org/abs/2102.11378; research.google.com/pubs/archive/46584.pdf | IEEE/author copyright; not verified | [P] |
| FoundationDB | foundationdb.org/files/fdb-paper.pdf; flow/include/flow/Buggify.h, CodeProbe.h; contrib/TestHarness2 | Apache-2.0 (source headers); paper not verified | [P] |
| TigerBeetle VOPR | tigerbeetle docs/internals/vopr.md | Apache-2.0 | [P] |
| Antithesis DST page | antithesis.com/docs/resources/deterministic_simulation_testing | not verified (vendor) | [P] |
| fast-check | github.com/dubzzz/fast-check (commit ecf71938); Discussion #4406 | MIT | [P] |
| Hypothesis | hypothesis.readthedocs.io | not verified | [P~]/[S] |
| proptest / Go fuzz / libFuzzer / OSS-Fuzz | proptest-rs.github.io; go.dev/doc/security/fuzz; llvm.org/docs/LibFuzzer.html; google.github.io/oss-fuzz | not verified | [P] |
| Hughes QuickCheck | cs.tufts.edu/~nr/cs257/archive/john-hughes/quviq-testing.pdf | publisher copyright | [P] |
| Kuhn et al. | csrc.nist.gov ... kuhn-wallace-gallo-tse-preprint.pdf | not verified | [P] |
| NIST ACTS / CCM | csrc.nist.gov/projects/automated-combinatorial-testing-for-software; NIST.IR.7878.pdf; CCM and CCMCL manuals | public domain (US Government work, per notice) | [P] |

---

## 9. Reliability of the July–October 2026 issue cluster

Several breadth findings leaned on very recent issues, small repos and a preprint. A depth agent audited
each one via the GitHub API, the npm registry and code at named commits. Classes:

- **A:** credible and maintainer-confirmed.
- **B:** credible but not maintainer-confirmed.
- **C:** low reliability as evidence.
- **D:** bulk or templated filing.

| Item | Class | Basis |
|---|---|---|
| erdtman/canonicalize #23 + PR #24 | **A** | The owner asked for a PR, merged it, and shipped it in 4.0.0. |
| canonicalize #26 | **A** | The owner replied, added a README section, and closed it as completed. |
| erigon #23038 | **A** | Filed by a maintainer; fix PR #23993 merged. |
| rskj PR #3722 | **A** (the fix) | Merged; 38 files; 45 review comments. |
| cyberphone/json-canonicalization #34–#37 | **B** | No maintainer engagement (the repo has been dormant since 2024). The Go and Java claims match code read at commits. #37's text was filed on three repos; gowebpki/jcs fixed it. |
| java-json-canonicalization #5 | **B** | Source-confirmed. The repo has been dormant since 2020. |
| evmone #1726, ethrex #7290 | **B** | An established reporter. The ethrex claim is source-confirmed. |
| node-cbor #232, borc #61, ethers #5193 (account "trackoor") | **D** | The account filed 37 issues in two bursts on 2026-09-23 and 09-26, from a rigid template, and closed 13 within minutes. #5193 contains a wrong canonical value. **The ethers `f90000` claim itself is true** (v5 and v6 code at commits). |
| ethers PR #5197 | **C** as maintainer evidence | Unmerged and unreviewed. The filer opened 7 pull requests to unrelated repos in 4 days. |
| lattice-substrate/json-canon; PSUCyberSecurityLab/ghost-ark; tyche-institute/eatf-verifier | **C** | One-author repos created in 2026, with 0–4 stars and AI-agent trailers or files. |
| arXiv 2608.06508 (Brömme) | **C** for library facts | A sole-author working draft, 5 sole-author submissions in 2 months, examples not tied to versions. Its two-direction taxonomy (multiple representation versus semantic collapse) is used here only as vocabulary. |

The audit's advice, which this report follows: do not cite the D or C items as evidence. Cite library source
at a commit, or maintainer-confirmed items. "Possible AI generation" describes observable patterns, not proven
provenance.

**Also relevant to the pinned dependency.**
- canonicalize's own history since 2026-04 is heavily AI-co-authored. 31 of the last 35 commits carry a
  `claude` co-author trailer, including the 3.0.0 commits, and this is disclosed. It is a review-practice note,
  not a defect.
- 5.1.0 was published with npm trusted publishing.

---

## 10. Findings → pending owner decisions

| Decision | What prior art says | Key sources | Strength |
|---|---|---|---|
| **Adopt a bytes core** | Strict canonical-byte validation is the norm wherever identity comes from an encoding. Lenient and normalising designs produced every documented incident. The agreed layout (lenient bounded transport decoder, then a strict core) is Bitcoin Core's and Cosmos x/tx's. A bytes core also removes the review-03 hop's precondition, because no caller code runs in the core [I]. Requirements prior art adds: an own strict validator (no JCS library has a verify mode); duplicate refusal at the text layer; one key order and number domain; depth and size caps inside the decoder; a bytes→value→bytes identity test; a named negative-vector suite; treating serializer upgrades as identity changes (canonicalize 5.0 changed output). | BIP66 + Core; dCBOR; CDE; RLP clients; ADR-020/027/076; Synapse CVE; rskj; X41; ASA-2024-0012 | **Established** for the pattern; [I] for the hop removal |
| **Proxy policy (PROXY-01)** | Platform serializers refuse all Proxies; libraries that accept them make no integrity claim. In Node, `util.types.isProxy` gives a reliable refusal predicate, including for revoked Proxies, but not in browsers. Users cope with refusal by unwrapping (`toRaw`, `current()`). This favours **answer 2 (refuse)** at the wrapper. With a bytes core, the core never sees a Proxy. | HTML spec; V8; workerd; Cap'n Web; Endo; devalue; Node util docs; Van Cutsem & Miller | **Likely** (no project with an identity claim accepts Proxies) |
| **Wrapper packaging (Kernel package vs SDK)** | No prior art decides this directly. Signals: the object→bytes step runs caller code. Cosmos clients build TxRaw before submission, and Stripe/AWS/Cap'n Web place encoding on the client side. devalue makes introspection injectable. Node core gets integrity from where its code runs. Weak lean: put the wrapper where its cooperative contract is stated, keep the core API bytes-only either way, and make the refusal claim belong to whichever package ships the wrapper [I]. | ADR-020; Cap'n Web; devalue `operations`; Node primordials | **Speculative** |
| **Transport cap** | Observed defaults: Cloudflare RPC 32 MiB; Cap'n Web `maxMessageSize` 32 MiB in UTF-16 code units (checked after buffering, so its docs say to also cap at the transport) and `maxDepth` 256; Bitcoin `MAX_SIZE` 32 MiB inside the decoder; Cosmos Any nesting 64; TUF's 5 MB limit still allowed about 2 minutes of CPU via a quadratic number parse. Lessons: enforce before buffering; give separate depth and size caps; state the unit (bytes vs UTF-16 code units); measure the parse cost at the cap. | Cloudflare docs; capnweb; Bitcoin serialize.h; Cosmos x/tx; X41 | **Likely** for the lessons; the number is the owner's |
| **TOOLS-01 design** (in progress) | Mutant identity should be a content key, not a counter (Stryker). Compile errors are not kills. Waivers carry reasons. Corpus entries store inputs, not seeds (fast-check maintainer, Go fuzz, FoundationDB/VOPR seed limits). A declared ACTS-style dimension manifest with 1-value variables makes unvaried dimensions visible (NIST CCM). Every rule needs non-vacuity plus an explicit opt-out (ArchUnit, FoundationDB `rare`). Check ablation (rskj). Periodic forced full reruns (Stryker/PIT). Pinned golden vectors for canonical bytes. | Stryker source; Discussion #4406; NISTIR 7878; ArchUnit; FoundationDB; Kuhn | **Established** for each mechanism |
| **K1.3 design** | Per-lifetime timer identity, so timers cannot fire into a reused Execution ID (DTFx ExecutionId, OTP TimerRef; Restate#5425 is the counterexample). Fires re-derived against current state (Temporal). Cancel tolerates an in-flight fire, with an explicit winner rule. Refuse terminal Outcomes that ignore pending events (UNHANDLED_COMMAND). Cancels on terminal Executions are idempotent no-ops. Terminal-state guard on callbacks. Pending timers must not hold a terminal Execution open. Fencing at commit with a per-Activation token, persisted once state persists. Test with seed-reproducible schedulers and store minimal interleavings. | Temporal server and SDK; Cadence; DTFx; Erlang/OTP; Restate#5425; durabletask-python #280; fast-check scheduler | **Established** for the patterns; Restate fencing details **Likely** |

---

## Source verification results (fact-check pass)

| Claim | Source | Verdict | Key evidence (paraphrased) |
|---|---|---|---|
| Synapse CVE-2025-30355: out-of-range `depth` halts federation; exploited; fixed in 1.127.1 | github.com/element-hq/synapse/security/advisories/GHSA-v56r-hwv5-mxg6 | SUPPORTED | The advisory states all four points. |
| BIP66 strict DER, OpenSSL dependence, version-3 blocks, 750/950 of 1000 | raw.githubusercontent.com/bitcoin/bips/master/bip-0066.mediawiki | SUPPORTED | Cites OpenSSL version differences (1.0.0p/1.0.1k). |
| ArchUnit 0.23.0 fails on empty should; `failOnEmptyShould` configurable | github.com/TNG/ArchUnit/releases/tag/v0.23.0 | SUPPORTED | A breaking change; property restores the old behaviour. |
| IETF draft-07: optional fingerprint; 422 mismatch; 409 concurrent; 400 missing; equality undefined | ietf.org/archive/id/draft-ietf-httpapi-idempotency-key-header-07.txt | SUPPORTED | §2.4 and §2.7. |
| Restate#5425: purge leaves timers; fires into next run; maintainer agreed to invalidate | github.com/restatedev/restate/issues/5425 | **PARTIALLY → SUPPORTED** | The fact-checker's fetch missed comments. The GitHub API shows a same-day contributor comment agreeing and planning short-term invalidation. |
| DTFx #410: non-cooperative lease stealing → split-brain; intent + ownership leases with drain | github.com/Azure/durabletask/issues/410 | SUPPORTED | Matches the issue text. |
| Stryker: timeout = detected; compile/runtime errors invalid; ignored excluded; score = detected/valid | stryker-mutator.io/docs/mutation-testing-elements/mutant-states-and-metrics | SUPPORTED | All four points. |
| dCBOR −18: decoders MUST reject the listed forms; 0/0.0/−0.0 reduce to `0x00` | ietf.org/archive/id/draft-mcnally-deterministic-cbor-18.txt | SUPPORTED | §2.1–2.5. |
| CDE −13: checking decoder must not present failing items; generic decoders exempt; re-encode-and-compare fallback | ietf.org/archive/id/draft-ietf-cbor-cde-13.txt | SUPPORTED | Explicit text, including the "somewhat clumsy" fallback. |
| Endo: no Proxy detection; assumes no proxies; WeakMap observable | raw.githubusercontent.com/endojs/endo/master/packages/pass-style/src/passStyleOf.js | **PARTIALLY → SUPPORTED with file correction** | The "assume … no proxies" comment is in `remotable.js:97` (grep-confirmed); the WeakMap comment is in passStyleOf.js. |
| X41 TUF audit: TUF-CR-22-103 permissive verification; TUF-CR-22-03 quadratic number parse | theupdateframework.io/audits/x41-python-tuf-audit-2022-09-09.pdf | SUPPORTED | §4.2.4 and §4.1.3. |
| SSB: signing = `JSON.stringify(v, null, 2)` with V8 key order; hash over low byte of each UTF-16 unit | spec.scuttlebutt.nz/print.html | SUPPORTED | "Signing Encoding" and "Hash Computation" sections. |

## Sources

Grouped by question. Tier and read status are shown per entry. Full per-project licence data is in the
tables above.

**Q1 Canonical bytes**
1. [RFC 8785](https://www.rfc-editor.org/rfc/rfc8785.txt) — [T1][P]
2. [cyberphone/json-canonicalization](https://github.com/cyberphone/json-canonicalization) — [T1][P]
3. [erdtman/canonicalize issue #23](https://github.com/erdtman/canonicalize/issues/23), [PR #24](https://github.com/erdtman/canonicalize/pull/24), [npm registry](https://registry.npmjs.org/canonicalize), [lib at 3.0.0](https://raw.githubusercontent.com/erdtman/canonicalize/aba9209d044f2729c51141d8a73b11e80816e42c/lib/canonicalize.js) — [T1][P]
4. [trailofbits/rfc8785.py](https://github.com/trailofbits/rfc8785.py) — [T1][P]
5. [Matrix appendices](https://spec.matrix.org/latest/appendices/), [Room v6](https://spec.matrix.org/latest/rooms/v6/), [MSC2540](https://github.com/matrix-org/matrix-spec-proposals/pull/2540), [matrix-spec #365](https://github.com/matrix-org/matrix-spec/issues/365) — [T1][P]
6. [Synapse PR #7381](https://github.com/matrix-org/synapse/pull/7381), [GHSA-v56r-hwv5-mxg6](https://github.com/element-hq/synapse/security/advisories/GHSA-v56r-hwv5-mxg6) — [T1][P], verified
7. [Dendrite CHANGES.md](https://raw.githubusercontent.com/matrix-org/dendrite/main/CHANGES.md), [gomatrixserverlib json.go](https://github.com/matrix-org/gomatrixserverlib/blob/main/json.go) — [T1][P]
8. [Neil Alexander, Comments on Canonical JSON in Matrix](https://neilalexander.dev/2024/06/05/canonical-json) — [T3][P]
9. [TUF specification](https://theupdateframework.github.io/specification/latest/), [securesystemslib formats.py](https://github.com/secure-systems-lab/securesystemslib/blob/main/securesystemslib/formats.py), [go-securesystemslib cjson](https://github.com/secure-systems-lab/go-securesystemslib/tree/main/cjson), [tough olpc-cjson](https://github.com/awslabs/tough/tree/develop/olpc-cjson), [python-tuf](https://github.com/theupdateframework/python-tuf) — [T1][P]
10. [X41 python-tuf audit](https://theupdateframework.io/audits/x41-python-tuf-audit-2022-09-09.pdf) — [T2][P], verified
11. [TUF mailing-list RFC 2020](https://groups.google.com/g/theupdateframework/c/xuT5wDA8kh8) — [T1][P~]
12. [SSB spec](https://spec.scuttlebutt.nz/print.html) — [T1][P], verified; [ssb-feed #11](https://github.com/ssb-junkyard/ssb-feed/issues/11) — [T3][P]; [ssbc/ssb-validate](https://github.com/ssbc/ssb-validate/blob/master/index.js), [legacy-msg-data](https://github.com/sunrise-choir/legacy-msg-data), [ssb-buttwoo-spec](https://github.com/ssbc/ssb-buttwoo-spec) — [T1][P]
13. [Perkeep JSON signing](https://perkeep.org/doc/json-signing/) — [T1][P]
14. [BIP 66](https://github.com/bitcoin/bips/blob/master/bip-0066.mediawiki) (verified), [BIP 62](https://github.com/bitcoin/bips/blob/master/bip-0062.mediawiki), [BIP 146](https://github.com/bitcoin/bips/blob/master/bip-0146.mediawiki), [BIP 141](https://github.com/bitcoin/bips/blob/master/bip-0141.mediawiki) — [T1][P]
15. [Wuille disclosure 2015-07-28](https://mailing-list.bitcoindevs.xyz/bitcoindev/55B79146.70309@gmail.com/) — [T1][P]
16. [Bitcoin Core](https://github.com/bitcoin/bitcoin) — [T1][P]
17. [Decker & Wattenhofer](https://arxiv.org/abs/1403.6676) — [T1/T2][P], abstract only
18. [Ethereum Yellow Paper](https://ethereum.github.io/yellowpaper/paper.pdf), [go-ethereum rlp](https://github.com/ethereum/go-ethereum/tree/master/rlp), [py-rlp codec](https://github.com/ethereum/pyrlp/blob/main/rlp/codec.py), [ethereumjs rlp](https://github.com/ethereumjs/ethereumjs-monorepo/blob/master/packages/rlp/src/index.ts), [ethereum/tests RLPTests](https://github.com/ethereum/tests/tree/develop/RLPTests) — [T1][P]
19. [rskj PR #3722](https://github.com/rsksmart/rskj/pull/3722), [erigon #23038](https://github.com/erigontech/erigon/issues/23038), [erigon PR #23993](https://github.com/erigontech/erigon/pull/23993) — [T1][P]
20. [evmone #1726](https://github.com/ipsilon/evmone/issues/1726), [ethrex #7290](https://github.com/lambdaclass/ethrex/issues/7290) — [T3][P], class B
21. [RFC 8949](https://www.rfc-editor.org/rfc/rfc8949), [CDE −13](https://www.ietf.org/archive/id/draft-ietf-cbor-cde-13.txt) (verified), [dCBOR −18](https://www.ietf.org/archive/id/draft-mcnally-deterministic-cbor-18.txt) (verified) — [T1][P]
22. [bc-dcbor-rust](https://github.com/BlockchainCommons/bc-dcbor-rust), [cbor2 options.ts](https://github.com/hildjj/cbor2/blob/main/src/options.ts) — [T1][P]
23. [Cosmos ADR-027](https://github.com/cosmos/cosmos-sdk/blob/main/docs/architecture/adr-027-deterministic-protobuf-serialization.md), [ADR-020](https://github.com/cosmos/cosmos-sdk/blob/main/docs/architecture/adr-020-protobuf-transaction-encoding.md), [ADR-076](https://github.com/cosmos/cosmos-sdk/blob/main/docs/architecture/adr-076-tx-malleability.md), [unknown_fields.go](https://github.com/cosmos/cosmos-sdk/blob/main/codec/unknownproto/unknown_fields.go), [x/tx/decode](https://github.com/cosmos/cosmos-sdk/tree/main/x/tx/decode), [GHSA-8wcc-m6j2-qxvm](https://github.com/cosmos/cosmos-sdk/security/advisories/GHSA-8wcc-m6j2-qxvm) — [T1][P]

**Q2 Realm integrity**

24. [Node primordials.md](https://github.com/nodejs/node/blob/main/doc/contributing/primordials.md), [primordials.js](https://github.com/nodejs/node/blob/main/lib/internal/per_context/primordials.js), [node_builtins.cc](https://github.com/nodejs/node/blob/main/src/node_builtins.cc), [realm.js](https://github.com/nodejs/node/blob/main/lib/internal/bootstrap/realm.js), [freeze_intrinsics.js](https://github.com/nodejs/node/blob/main/lib/internal/freeze_intrinsics.js) — [T1][P]
25. [nodejs/TSC#1438](https://github.com/nodejs/TSC/issues/1438), [vote 2022-02-21](https://raw.githubusercontent.com/nodejs/TSC/main/votes/2022-02-21-0.json) — [T1][P]
26. [commit eb8f7ee634](https://github.com/nodejs/node/commit/eb8f7ee634) — [T1][P]; [PR #38248](https://github.com/nodejs/node/pull/38248), [issue #29766](https://github.com/nodejs/node/issues/29766) — [S]
27. [ECMA-262 spec.html](https://github.com/tc39/ecma262/blob/main/spec.html) — [T1][P]
28. [Endo SES](https://github.com/endojs/endo/tree/master/packages/ses), [docs/lockdown.md](https://github.com/endojs/endo/blob/master/docs/lockdown.md) — [T1][P]
29. [tc39/proposal-shadowrealm](https://github.com/tc39/proposal-shadowrealm), [tc39/proposals](https://github.com/tc39/proposals), [notes 2024-12-02](https://github.com/tc39/notes/blob/main/meetings/2024-12/december-02.md), [2025-02-18](https://github.com/tc39/notes/blob/main/meetings/2025-02/february-18.md), [2025-09-23](https://github.com/tc39/notes/blob/main/meetings/2025-09/september-23.md), [2026-01-21](https://github.com/tc39/notes/blob/main/meetings/2026-01/january-21.md) — [T1][P]
30. [nodejs/node#65650](https://github.com/nodejs/node/pull/65650), [wpt#59794](https://github.com/web-platform-tests/wpt/pull/59794), [whatwg/html#9893](https://github.com/whatwg/html/pull/9893) — [T1][P]
31. [Phillip Mates, ShadowRealms in JSC](https://philomates.github.io/articles/2021-10-06-shadow-realms-in-jsc/) — [T3][S]; [T.J. Crowder, Legacy Edge and the Global Environment](https://thenewtoys.dev/blog/2020/08/02/legacy-edge-and-the-global-environment/) — [T3][S]

**Q3 Proxy policy**

32. [WHATWG HTML source](https://github.com/whatwg/html/blob/main/source) — [T1][P]
33. [V8 value-serializer.cc](https://github.com/v8/v8/blob/main/src/objects/value-serializer.cc), [instance-type.h](https://github.com/v8/v8/blob/main/src/objects/instance-type.h) — [T1][P]
34. [Node util.md](https://github.com/nodejs/node/blob/main/doc/api/util.md), [v8.md](https://github.com/nodejs/node/blob/main/doc/api/v8.md), [node_types.cc](https://github.com/nodejs/node/blob/main/src/node_types.cc) — [T1][P]
35. [cloudflare/workerd](https://github.com/cloudflare/workerd), [Workers RPC docs](https://developers.cloudflare.com/workers/runtime-apis/rpc/), [cloudflare/capnweb](https://github.com/cloudflare/capnweb) — [T1][P]
36. [@endo/pass-style](https://github.com/endojs/endo/tree/master/packages/pass-style) — [T1][P], verified with correction
37. [comlink](https://github.com/GoogleChromeLabs/comlink), [devalue](https://github.com/sveltejs/devalue), [superjson](https://github.com/flightcontrolhq/superjson), [immer](https://github.com/immerjs/immer) — [T1][P]
38. [Van Cutsem & Miller, Reflection API design](https://static.googleusercontent.com/media/research.google.com/en//pubs/archive/37741.pdf) — [T1][P]; [es-discuss Proxy.isProxy](https://esdiscuss.org/topic/proxy-isproxy-was-using-private-name-objects-for-declarative-property-definition) — [T2][S]; [proposal-proxy-transparent](https://github.com/littledan/proposal-proxy-transparent) — [T1][S]
39. [vercel/ai#4761](https://github.com/vercel/ai/issues/4761), [PRUNplanner/frontend#524](https://github.com/PRUNplanner/frontend/issues/524) — [T3][S]; [openclaw PR #162611](https://github.com/openclaw/openclaw/pull/162611) — [T3][P]

**Q4–Q6 Durable execution**

40. [Stripe idempotent requests](https://docs.stripe.com/api/idempotent_requests), [Stripe error handling](https://docs.stripe.com/error-low-level) — [T1][P]
41. [Brandur, idempotency keys](https://brandur.org/idempotency-keys), [rocket-rides-atomic](https://github.com/brandur/rocket-rides-atomic) — [T1/T3][P]
42. [IETF Idempotency-Key draft-07](https://www.ietf.org/archive/id/draft-ietf-httpapi-idempotency-key-header-07.txt) — [T1][P], verified
43. [AWS EC2 idempotency](https://docs.aws.amazon.com/ec2/latest/devguide/ec2-api-idempotency.html), [Builders' Library](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/) — [T1][P]
44. [temporalio/api workflow.proto](https://raw.githubusercontent.com/temporalio/api/master/temporal/api/enums/v1/workflow.proto), [startworkflow/api.go](https://raw.githubusercontent.com/temporalio/temporal/main/service/history/api/startworkflow/api.go), [timer_queue_active_task_executor.go](https://raw.githubusercontent.com/temporalio/temporal/main/service/history/timer_queue_active_task_executor.go), [mutable_state_impl.go](https://raw.githubusercontent.com/temporalio/temporal/main/service/history/workflow/mutable_state_impl.go), [history-service.md](https://raw.githubusercontent.com/temporalio/temporal/main/docs/architecture/history-service.md) — [T1][P]
45. [Temporal heartbeats](https://docs.temporal.io/encyclopedia/detecting-activity-failures), [sticky execution](https://docs.temporal.io/sticky-execution), [TS cancellation scopes](https://docs.temporal.io/develop/typescript/workflows/cancellation-scopes), [errors](https://docs.temporal.io/references/errors) — [T1][P]; [workflow ID docs](https://docs.temporal.io/workflow-execution/workflowid-runid) — [T1][P]
46. [temporalio/sdk-typescript](https://github.com/temporalio/sdk-typescript) — [T1][P]; [issue #1423](https://github.com/temporalio/sdk-typescript/issues/1423) — [S]; [sdk-java #3088](https://github.com/temporalio/sdk-java/issues/3088) — [T1][P]; [PR #11968](https://github.com/temporalio/temporal/pull/11968), [issue #12103](https://github.com/temporalio/temporal/issues/12103) — [S]
47. [Cadence](https://github.com/cadence-workflow/cadence) — [T1][P]
48. [Kleppmann, distributed locking](https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html) — [T1][P]
49. [Restate architecture](https://docs.restate.dev/references/architecture), [state_machine/mod.rs](https://raw.githubusercontent.com/restatedev/restate/main/crates/worker/src/partition/state_machine/mod.rs), [#5425](https://github.com/restatedev/restate/issues/5425) (API-confirmed), [#5375](https://github.com/restatedev/restate/issues/5375) — [T1][P]; [docs-restate #410](https://github.com/restatedev/docs-restate/issues/410) — [S]
50. [Azure/durabletask #281](https://github.com/Azure/durabletask/issues/281), [#410](https://github.com/Azure/durabletask/issues/410) (verified), [#1019](https://github.com/Azure/durabletask/issues/1019), [functions-durable-extension #724](https://github.com/Azure/azure-functions-durable-extension/issues/724) — [T1][P]; [#636](https://github.com/Azure/durabletask/issues/636), [durable-python #348](https://github.com/Azure/azure-functions-durable-python/issues/348) — [S]
51. [Microsoft Learn durable timers](https://learn.microsoft.com/en-us/azure/durable-task/common/durable-task-timers), [singletons](https://learn.microsoft.com/en-us/azure/durable-task/common/durable-task-singletons) — [T1][P]; [durabletask-python PR #280](https://github.com/microsoft/durabletask-python/pull/280) — [S]
52. [DBOS architecture](https://docs.dbos.dev/architecture), [workflow tutorial](https://docs.dbos.dev/python/tutorials/workflow-tutorial), [_sys_db.py](https://raw.githubusercontent.com/dbos-inc/dbos-transact-py/main/dbos/_sys_db.py), [PR #862](https://github.com/dbos-inc/dbos-transact-py/pull/862.diff) — [T1][P]
53. [Erlang erts](https://www.erlang.org/doc/apps/erts/erlang.html), [gen_statem docs](https://www.erlang.org/doc/apps/stdlib/gen_statem.html), [gen_server docs](https://www.erlang.org/doc/apps/stdlib/gen_server.html), [gen_statem.erl](https://raw.githubusercontent.com/erlang/otp/master/lib/stdlib/src/gen_statem.erl) — [T1][P]

**Q7–Q8 Structure and evidence**

54. [Decider](https://thinkbeforecoding.com/post/2021/12/17/functional-event-sourcing-decider), [Boundaries talk](https://www.destroyallsoftware.com/talks/boundaries) — [T1][P]
55. [Redux principles](https://redux.js.org/understanding/thinking-in-redux/three-principles), [Redux FAQ](https://redux.js.org/faq/immutable-data), [Elm guide](https://guide.elm-lang.org/architecture/) — [T1][P]
56. [Fowler DDD Aggregate](https://martinfowler.com/bliki/DDD_Aggregate.html) — [T2][P]; [Vernon 2011](https://www.dddcommunity.org/wp-content/uploads/files/pdf_articles/Vernon_2011_1.pdf) — [T1][P]
57. [dependency-cruiser rules](https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md), [eslint-plugin-boundaries](https://github.com/javierbrea/eslint-plugin-boundaries), [no-restricted-imports](https://eslint.org/docs/latest/rules/no-restricted-imports), [Nx boundaries](https://nx.dev/features/enforce-module-boundaries), [TS project references](https://www.typescriptlang.org/docs/handbook/project-references.html) — [T1][P]
58. [ArchUnit v0.23.0](https://github.com/TNG/ArchUnit/releases/tag/v0.23.0) (verified), [user guide](https://www.archunit.org/userguide/html/000_Index.html#_fail_rules_on_empty_should), [issue #806](https://github.com/TNG/ArchUnit/issues/806), [PR #816](https://github.com/TNG/ArchUnit/pull/816) — [T1][P]; [c-next #1611](https://github.com/jlaustill/c-next/issues/1611) — [T3][P]
59. [TS Symbols](https://www.typescriptlang.org/docs/handbook/symbols.html), [TS Classes](https://www.typescriptlang.org/docs/handbook/2/classes.html), [TS #202](https://github.com/microsoft/TypeScript/issues/202), [TS 3.9 notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-9.html), [MDN private elements](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_elements), [tsd](https://github.com/tsdjs/tsd), [expect-type](https://github.com/mmkal/expect-type) — [T1/T2][P]; [Goldberg, branded types](https://learningtypescript.com/articles/branded-types) — [T3][P]
60. [Stryker incremental-differ.ts](https://github.com/stryker-mutator/stryker-js/blob/master/packages/core/src/mutants/incremental-differ.ts), [mutant-collector.ts](https://github.com/stryker-mutator/stryker-js/blob/master/packages/instrumenter/src/transformers/mutant-collector.ts), [incremental blog](https://stryker-mutator.io/blog/announcing-incremental-mode/), [mutant states](https://stryker-mutator.io/docs/mutation-testing-elements/mutant-states-and-metrics/) (verified), [disable mutants](https://stryker-mutator.io/docs/stryker-js/disable-mutants/), [report schema](https://github.com/stryker-mutator/mutation-testing-elements/blob/master/packages/report-schema/src/mutation-testing-report-schema.json) — [T1][P]
61. [PIT incremental](https://pitest.org/quickstart/incremental_analysis/) — [T1][P]
62. [Practical Mutation Testing at Scale](https://arxiv.org/abs/2102.11378), [State of Mutation Testing at Google](https://research.google.com/pubs/archive/46584.pdf) — [T1][P]
63. [FoundationDB paper](https://www.foundationdb.org/files/fdb-paper.pdf), [Buggify.h](https://github.com/apple/foundationdb/blob/main/flow/include/flow/Buggify.h), [CodeProbe.h](https://github.com/apple/foundationdb/blob/main/flow/include/flow/CodeProbe.h), [TestHarness2](https://github.com/apple/foundationdb/blob/main/contrib/TestHarness2/README.md), [FDB testing docs](https://apple.github.io/foundationdb/testing.html) — [T1][P]
64. [TigerBeetle VOPR](https://raw.githubusercontent.com/tigerbeetle/tigerbeetle/main/docs/internals/vopr.md) — [T1][P]; [Antithesis DST](https://antithesis.com/docs/resources/deterministic_simulation_testing/) — [T2][P]
65. [fast-check model-based testing](https://fast-check.dev/docs/advanced/model-based-testing/), [race conditions](https://fast-check.dev/docs/advanced/race-conditions/), [read test reports](https://fast-check.dev/docs/tutorials/quick-start/read-test-reports/), [repo](https://github.com/dubzzz/fast-check), [Discussion #4406](https://github.com/dubzzz/fast-check/discussions/4406) — [T1][P]
66. [Hypothesis API](https://hypothesis.readthedocs.io/en/latest/reference/api.html) — [T1][P~]; [Hypothesis replaying failures](https://hypothesis.readthedocs.io/en/latest/tutorial/replaying-failures.html) — [S]
67. [proptest persistence](https://proptest-rs.github.io/proptest/proptest/failure-persistence.html), [Go fuzzing](https://go.dev/doc/security/fuzz/), [libFuzzer](https://llvm.org/docs/LibFuzzer.html), [OSS-Fuzz seed corpus](https://google.github.io/oss-fuzz/getting-started/new-project-guide/#seed-corpus) — [T1][P]
68. [Hughes, Experiences with QuickCheck](https://www.cs.tufts.edu/~nr/cs257/archive/john-hughes/quviq-testing.pdf) — [T1][P]
69. [Kuhn, Wallace & Gallo 2004](https://csrc.nist.gov/CSRC/media/Projects/automated-combinatorial-testing-for-software/documents/kuhn-wallace-gallo-tse-preprint.pdf), [NIST ACTS](https://csrc.nist.gov/projects/automated-combinatorial-testing-for-software), [NISTIR 7878](https://nvlpubs.nist.gov/nistpubs/ir/2012/NIST.IR.7878.pdf), [CCM guide](https://csrc.nist.gov/groups/SNS/acts/documents/CCM-guide-130107.pdf) — [T1][P]
70. [Swarm Testing](https://www.flux.utah.edu/paper/groce-issta12) — [S]

**Reliability audit only (§9; not cited as evidence)**

71. [cyberphone #37](https://github.com/cyberphone/json-canonicalization/issues/37), [java-json-canonicalization #5](https://github.com/erdtman/java-json-canonicalization/issues/5), [node-cbor #232](https://github.com/hildjj/node-cbor/issues/232), [borc #61](https://github.com/dignifiedquire/borc/issues/61), [ethers #5193](https://github.com/ethers-io/ethers.js/issues/5193), [ethers PR #5197](https://github.com/ethers-io/ethers.js/pull/5197), [json-canon](https://github.com/lattice-substrate/json-canon), [ghost-ark probe](https://github.com/PSUCyberSecurityLab/ghost-ark/blob/main/docs/research/JCS_CANONICALIZER_PROBE.md), [eatf-verifier](https://github.com/tyche-institute/eatf-verifier/tree/main/experiments/jcs-boundary), [arXiv 2608.06508](https://arxiv.org/abs/2608.06508) — [T3/T4], audited

## Research gaps

**Not executed**
- SES `lockdown()` against `vm.runInThisContext("let JSON = …")`. The conclusion rests on source and spec
  reading.
- Proxy-accepting libraries (devalue, superjson, Cap'n Web, Endo) under global shadowing. Their exposure is
  inferred from their use of global identifiers at call time.
- No third-party package was installed or run.

**Not found**
- Tier 1 startup-cost data for `lockdown()`. This is a carried-over gap; only a Tier 3/4 bot benchmark exists
  for `harden`.
- Any project that checks global name resolution at startup (absence of evidence).
- How Stripe compares parameters.
- A named production bug that motivated Matrix room v6.
- A CVE for accepting non-canonical RLP.
- Any statement that FoundationDB seeds stay valid across code changes. The positional BUGGIFY keying suggests
  not [I].
- A primary write-up of the gen_server ref-tagging idiom.

**Partly established**
- Temporal's lack of input comparison: two server files plus docs. SDK clients and update-with-start were not
  checked.
- When Restate's leader `FencingToken` shipped.
- The TS SDK fire-versus-cancel outcome in one activation, which is a code reading.
- DTFx #1019's root cause.

**Contested**
- Mt. Gox's malleability attribution: the exchange's claim versus Decker & Wattenhofer, whose abstract only
  was read.

**Unreadable**
- The 2018 Cure53 and the NCC TUF audits (PDF extraction failed).
- The full arXiv 2608.06508 reference list.
- ArchUnit PR #774's body.

**Status drift**
- The CDE draft's current status is "parked" per a snippet only.
- ADR-027 is labelled Proposed but is used by production code.
- Several 2026 issues and PRs are days old: Restate#5425, durabletask-python #280, ethers #5197, ethrex
  #7344.

**Scope**
- Protobuf/gRPC JS runtimes and Deno are still not covered (carried over from the 2026-10-01 report).
- Pairwise variation of access forms has data only for accidental faults (Kuhn), not adversarial bypasses.

**Process disclosures**
- Research agents ran their own small Node scripts in the session scratchpad: global-shadowing, pinning,
  `isProxy` and revoked-Proxy probes. These are evidence, not prior art.
- Agents downloaded npm tarballs (canonicalize 3.0.0–5.1.0, @ethersproject/rlp 5.8.0) and shallow-cloned some
  repos into the scratchpad to read source. Nothing downloaded was executed.
- The research run changed no repository file. This copy was added to the repository afterwards.

## Methodology

- **Angles.** (1) JSON-family canonical encodings; (2) binary canonical encodings and validator testing; (3)
  realm integrity and Proxy policy; (4) durable-execution semantics for Q4–Q6; (5) plan/apply and evidence
  tooling.
- **Agents dispatched.** 5 breadth (Sonnet), 3 depth (Sonnet), 12 verification (Haiku). Four breadth agents
  hit an API rate limit and were resumed with their context; none restarted.
- **Leads followed in the depth phase.**
  - TOOLS-01 tooling: Stryker identity, Google mutation papers, BUGGIFY, fast-check persistence, ArchUnit,
    negative type tests, NIST CCM.
  - K1.3 gaps: Temporal TS scopes and sdk-core ordering, the cancel/complete race, Cadence fencing, Restate
    epochs, DTFx late fires, Temporal USE_EXISTING, OTP.
  - A provenance audit of the 2026 issue cluster.
- **Own checks in the main session.**
  - The GitHub API for Restate#5425 comments.
  - A grep of Endo pass-style sources, which corrected a file attribution.
  - `values.ts` and `packages/kernel/package.json` on the checkout at the time (branch `codex/tools-01`), for the
    lone-surrogate refusal and the canonicalize pin.
- **NO_USEFUL_FINDINGS:** none.
- **Quality gates.**
  - Every key finding cites a tiered source.
  - All URLs come from agent outputs.
  - Answer status is stated.
  - Tier 3/4 sources are under 50%, so no caveat is needed.
  - No angle failed.
- **Skipped topics, as requested:** refusal-cost metering, exotic key listing, internal-slot type checks, and
  generic same-process isolation. The only update to them is that ShadowRealm's status is reconfirmed with new
  May–August 2026 events.
