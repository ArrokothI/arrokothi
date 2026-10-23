# BINDING-01 — owner hold release 01 (DRAFT, not adopted)

**Record type:** owner decision, drafted for approval. It would release
[invalidation-03](../DESIGN-AUDIT-01/invalidation-03.md)'s V-ENV hold for the canonical-bytes core. It is
not a review, an acceptance or an integration record.

**Provenance:** drafted on 2026-10-22 by the owner's Claude Code desktop session (`claude-opus-5-5`), the
planning session that did BINDING-01's design check. It has no force until the owner's words are recorded
below.

**Basis:**
- [Review 01](review-01.md): ACCEPT of exact H `b7a24c79d547958c419b01e615e859f94ca3132b`.
- [Packet verify CI run 39868378094](https://github.com/ArrokothI/arrokothi/actions/runs/39868378094) at C
  `da945d3f8ba42f6d1ec6d5e3bcd74ae6a604502f`: `checks_passed`, 18/18.
- Integrated in PR #53; [integration receipt](integration-01.md).
- The release condition (invalidation-03, consequence 3): the binding packet is independently accepted, and
  its corpus carries review 03's hop reproducers, including the form × pin probe. BINDING-01 ports them as
  maintained fresh-process core tests: 90 shadow cases and 24 pin cases. The two creation controls now
  accept with the correct content.

## Released, for the core only

The four held claims are restored **in their narrowed core meaning**
([values: canonical-bytes core](../../../../mental-model/concepts/values.md#canonical-bytes-core)):

1. **V-ENV.** After trusted module initialization, replacing or lexically shadowing a global binding at
   call time cannot steer core admission, parsed content, root equality or identity-text checks. The
   core has no serializer window, so the old refusal-on-setup-failure and restoration obligations have
   nothing to apply to.
2. **One snapshot.** The bytes that decide identity are the bytes the core keeps. Every reader gets
   values parsed from them.
3. **Replay and conflict.** Equal content replays and different content conflicts under the hop. This
   holds for creation, and for ingress and Outcome, which use the same core bytes.
4. **BASELINE "ambient safety"** is replaced by the narrowed core claim that BINDING-01 already wrote
   there.

Preconditions that stay: genuine intrinsics at core module load (pre-import poisoning is outside the
claim), and a cooperative caller in the same process (017 L-02).

## Not released: the SDK wrapper

The wrapper keeps K1.1-correction-03's serializer window unchanged, as brief 01 required. Invalidation-03's
release condition also asks a cooperative wrapper for a startup check that resolves the serializer's free
identifiers through the global environment and refuses on mismatch. The wrapper has no such check.

So the wrapper makes **no V-ENV claim**. This becomes a recorded limit (017 L-01), not a suspended claim:
- The wrapper is internal. No supported entry exposes it.
- **K1.4 obligation:** before the public SDK bridge ships, K1.4 either adds that startup check or states
  L-01 in the bridge's contract.

## Not changed

- The 853 rule-1 hold-register entries stay TOOLS-02 bookkeeping, with no new credit.
- Historical ACCEPT records, invalidation notices and integrations are unchanged. This record supersedes the
  hold only from its date. No successor is released.

## Edits on adoption

These are administrative status edits, made in the same commit as the owner's words:
- 007: the BINDING-01 row and the DESIGN-AUDIT-01 row (invalidation-03's only ledger link) point here.
- BASELINE's value section: "V-ENV stays held … until owner release" becomes "released for the core".
- 017 L-01: cite this record and the K1.4 obligation.
- 014: the status table and next steps.

## Owner decision

_Not yet given._
