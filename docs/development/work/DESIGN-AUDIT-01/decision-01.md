# DESIGN-AUDIT-01 owner decision 01 — adopt CORE, refuse every Proxy, scope K1.1-correction-03, transport cap

## Provenance

Recorded on 2026-10-02 by a Claude Code session (`claude-opus-5-5`) from the owner's chat messages in that
session. This is an owner decision. It is not a review, an implementation or an acceptance. The owner's words,
verbatim:

```text
I'll adopt CORE and refuse every Proxy at capture; but before you recording both, check the research result
to see if there is better solution. If D5, D6 can also be done/check with research, do them, too.
```

```text
D7 I agree, we can try 8 MiB first.
```

```text
yes add the ledger pointer to invalidation-03.
```

D5 is the K1.1-correction-03 scope amendment, D6 the wrapper packaging, and D7 the transport cap. The owner
asked for an explanation of D6 before deciding it, so it stays open.

## Research check

Before recording, the session checked the choices against the
[2026-10-02 prior-art report](../../research/2026-10-02-canonical-bytes-kernel.md): sections 1–3, 9 and 10.
The report is background, not evidence ([research index](../../research/README.md)). It found no better
alternative to either choice:

- **Bytes core.** Where identity derives from an encoding, the systems that refuse non-canonical bytes (dCBOR,
  the CDE checking decoder, the RLP clients, Bitcoin after BIP66, Cosmos ADR-027) have no documented incidents
  from that choice. Every documented incident came from the normalising or lenient side. The adopted layout,
  a lenient bounded transport decoder in front of a strict core, is the one Bitcoin Core and Cosmos x/tx use.
- **The third design the report describes,** hashing the received bytes without canonicalising, does not fit
  this project. [Creation](../../../../mental-model/mechanisms/creation.md#the-lost-response-cases) compares
  requests by canonical form, not wire bytes, and Cosmos ADR-076 itself states that raw submitted bytes are not
  a safe unique ID.
- **Proxy refusal.** Platform serializers refuse every Proxy (HTML structured clone, the V8 ValueSerializer,
  the workerd default). Library serializers that accept them make no integrity claim. In Node,
  `util.types.isProxy` is a reliable predicate, including for revoked Proxies.

The report adds conditions rather than alternatives. They are listed below as inputs for the briefs that
implement this decision. They are not new normative rules.

## Decisions

### 1. CORE is adopted as the target binding direction

The direction is the [joint CORE draft](decision-drafts/CORE.md)'s "Owner-selected answer and recommendation":
- a canonical-bytes Kernel core that never observes caller objects;
- a cooperative live-object wrapper on the caller side;
- a separate transport adapter for bounded non-canonical text;
- a scoped contract. A hostile same-process caller is a matter for real isolation, not for the in-process
  binding.

Adoption sets the target. It ships nothing, and the integrated Kernel's current claims and holds are unchanged.
- The canonical owners and decisions named in CORE's "Draft amendment and packet assignment" table change only
  with the packet that implements them, as reviewed payload under 006: decisions 03/04 item 5 for the
  wrapper, DEC-8's scope, AGENTS.md's Trusted-Execution sentence, values.md's in-process obligations and
  BASELINE. This record edits none of them.
- K1.1-correction-03's dependency on "DESIGN-AUDIT-01's in-process threat-model outcome" is satisfied by this
  item.
- Wrapper packaging (D6) stays open.

Inputs from the research for the binding packet's brief:
- The core's strict validator is written for this project. No JCS library offers a "verify canonical" mode.
  Test it with the bytes → value → bytes identity oracle and named negative vectors.
- The core captures the intrinsics it needs at module load and never resolves a global name at call time.
  This is how Node core is immune to a global `let JSON`. `canonicalize@3.0.0` resolves `JSON` at call time,
  so it cannot be what the core runs on received bytes.
- Duplicate keys are refused at the text layer, because a parsed object has already lost them.
- Use one key order and one number domain, with golden vectors.
- Caps on depth and size also sit inside the strict validator, not only in the transport.
- Never keep received bytes for one purpose and normalised bytes for another.
- Treat any serializer upgrade as an identity change. canonicalize 5.0.0 changes output for some inputs.

### 2. PROXY-01: answer 2, refuse every Proxy at capture

Every Proxy is refused at capture, at every depth, before any other observation of that value. Revoked
Proxies are included. This supersedes the [register's](register.md) answer-2 wording, as review 03's
`DA01-R3-PROXY-02` asked. A target's type cannot be seen through a Proxy, so refusing only "forwarding"
Proxies is not a policy that can be implemented.

- **Amendment.** [Decision-04](../K1.2/decision-04.md) item 5 and [decision-03](../K1.2/decision-03.md)
  item 5 prohibit rejecting or detecting-and-refusing Proxies and changing coherent-Proxy acceptance. Those
  prohibitions are lifted for this purpose only. Their other prohibitions, reusing observations and moving
  capture out of process, stand until the binding packet amends them under item 1.
- **Implementation.** K1.1-correction-03 implements the refusal on the current traversal (item 3), and the
  binding packet's wrapper keeps it. Until K1.1-correction-03 is accepted, the integrated Kernel still accepts
  coherent Proxies. The canonical owners keep their current text until then: values.md's coherent-Proxy
  reading, decision-04's Proxy exclusion from V-D1 and BASELINE's "coherent-Proxy acceptance". That packet
  changes them as its payload.
- **Research inputs for that packet's design note.** These are inferences in the report, not owner rules:
  - `util.types.isProxy` is Node-only. Read it once at module load, because looking it up at call time is
    itself a global hop.
  - Browsers have no equivalent. Callers unwrap first, as Vue and Immer users do.
  - Accessors on payloads are already refused through descriptors. Once Proxies are also refused before they
    are observed, no caller code runs during capture. The design note should say whether decision-04 item 1's
    Proxy exclusion from V-D1 can then be retired.
  - Refusal does not close [invalidation-03](invalidation-03.md). It removes the mid-capture declaration, but
    not a global declaration made before the call, and canonicalize still resolves `JSON` at call time. That
    hold stays with the binding packet.

### 3. K1.1-correction-03 scope amendment (D5)

[007](../../007-work-packets.md)'s K1.1-correction-03 section is amended in the same commit as this record. Its
scope adds two refusals on the current traversal, both before any own-key listing:
- internal-slot type refusal for re-prototyped built-ins, as [owner-decisions-02](owner-decisions-02.md)
  extra check b decided, with the O-R8-3 and O-R8-4 witnesses;
- Proxy refusal under item 2, with review 02's Proxy witnesses.

On acceptance, the packet releases the [invalidation-01](invalidation-01.md) classification hold, as
owner-decisions-02 says, together with invalidation-02's V-D1 hold. The V-ENV hold of invalidation-03 stays
with the binding packet. The packet is still not released.

### 4. Transport cap (D7)

The transport adapter's default cap is **8 MiB (8,388,608 bytes) of uncompressed UTF-8 wire text per encoded
root**, configurable per transport profile. This is a starting value that may be revised, not a semantic limit.
The core's canonical root cap stays 1,048,576 bytes, and a transport-cap rejection is a transport refusal, not
value invalidity. The arithmetic is in [CORE](decision-drafts/CORE.md#open-transport-cap-justified-proposal-not-semantic-limit).

Research inputs for the binding packet's brief:
- enforce the cap before buffering;
- keep a separate depth cap;
- state the unit as bytes, not UTF-16 code units;
- measure the decoder's cost at the cap. The X41 TUF audit found a quadratic parse within a 5 MB limit.

### 5. Ledger pointers to invalidation-03

The K1.1 and K1.2-correction-01 rows of 007 each gain one sentence pointing to
[invalidation-03](invalidation-03.md). Historical acceptance and integration are unchanged.

## Not decided here

- Wrapper packaging (D6).
- 007 rows for the binding packet and the coordinator refactor (D8).
- Any packet release. K1.1-correction-03 stays unreleased, and TOOLS-01 continues under its own release.
- The 22 other drafts, beyond what CORE's table and owner-decisions-02 already state.

All three claim holds are unchanged.
