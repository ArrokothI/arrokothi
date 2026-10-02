# DESIGN-AUDIT-01 owner decisions 02 (correction round 2)

**Record type:** owner supplemental decisions, recorded verbatim in substance from the owner's walkthrough of
the six extra checks on 2026-10-01. Recorded by a Claude Code session (`claude-sonnet-5-5`, Code tab of the
Claude desktop app) at the owner's request. It is not a review, an implementation or an acceptance.
It records what the owner said in conversation; the full conversation is not part of the repository.

**What this file is, and is not.**
- It supplies the "owner supplemental decisions" and the text of the "six extra checks" that
  [review-01](review-01.md) (DA01-R1-AUTH-01) and [brief-02](review-01/brief-02.md) question 3 found missing.
- It is the owner's chosen direction for the audit's drafts. It does not amend any accepted decision. Amending
  decisions 03/04 item 5, DEC-8, decision-05, `values.md` or AGENTS.md needs separate owner-approved records
  and successor packets. This file releases no packet and lifts no claim hold.
- Round 2 still only drafts. Where this file states a direction, the draft presents it as the owner's
  selected answer, keeps the alternatives mapped, and names the amendments the direction requires.

## 1. The six extra checks, with provenance

**Source.** The text below is from the prompt that the Claude Code Opus session `9d3c2edb-f457-407e-b79c-f2b32b5cb4fd`
(`claude-opus-5-5`) wrote for the implementer on 2026-09-30, after the owner released the packet. The owner
forwarded it. Items a–f are the owner's "six extra checks" referred to in the 2026-10-01 continuation
instruction ("DA-1 through DA-7, items (a)–(f), and my six extra checks"). The owner reviewed all six one by
one in the 2026-10-01 session. The lettering collides with the brief's DA-3 items (a)–(f), which are different
lists; this file calls these **extra check a–f**.

```text
a) Threat model, item (a). Measure the production and test code that exists only to resist hostile
   same-process JavaScript, in lines and in findings. That covers values.ts capture and the
   serializer window, own-array.ts, the DEC-8/DEC-9 rules, the zone analyzer, the inventory and the
   sweeps. Then compare three options: keep the adversarial model; a cooperative-caller model (guard
   against accidents, and send hostile callers to an isolated or bytes binding); bytes/text intake
   at the Kernel boundary. Check each option against AGENTS.md's Trusted/Isolated Execution
   distinction and values.md's own statement that only isolation contains same-process code. Note
   that no supported SDK consumer uses the target Kernel yet, which affects what an API change
   costs now versus later.
b) Re-verify review 08's open items on current main, because rounds 6–10 changed code:
   K12C1-R8-VALUE-DEPTH-01 (deep uncharged refusals, about 1.5× the costliest acceptance),
   K12C1-R8-EVID-01 (mutant N15, the array surplus charge), O-R8-3 (own-key enumeration of
   re-prototyped typed arrays and String wrappers) and O-R8-4 (re-prototyped Map, Set, Date and
   typed arrays accepted as plain objects). Use the review-08 probes. Report what each threat-model
   option would do to each item.
c) Decision-05's metered V-D1. State whether a per-root work meter is still the right mechanism under
   each threat-model option. For example, bytes intake may make V-D1 almost free.
d) Coordinator shape, item (d). Map which responsibilities the authority/grant, history, read and
   commit finding families touched. Propose whether a decomposition would turn those families into
   structural guarantees. Do not design K1.3 itself.
e) Evidence infrastructure, item (e). List every probe, mutant runner and oracle in the K1.1,
   K1.1-correction-02, K1.2 and K1.2-correction-01 records. For each, say whether it belongs in the
   TOOLS-01 corpus and mutation registry, is covered elsewhere, or should be retired.
f) Verdict flips. For each recorded or disclosed ACCEPT→CHANGES REQUIRED flip on the same H, name the
   dimension the earlier search did not vary. Turn that into a checklist for reviewers and briefs.
```

**Mapping to the register.** Extra check a → register A (and B, F09, F10). b → review08-results.md, register C
(F02) and the V-D1 held items. c → V-D1 paragraph of register A and F10. d → register D. e → register E.
f → register F. Round 1 already answered all six; round 2 must show each one mapped to evidence (DA01-R1-AUTH-01).

**"Design-check pre-approved" (the other half of AUTH-01).** The sentence "The owner has pre-approved going
straight on unless a question needs an answer" is from the same forwarded prompt (step 2). It is sourced to that
prompt, not to a quoted owner statement. The packet should cite it as such, or mark it unsourced; it must not
describe it as a verbatim owner approval.

## 2. Decisions, per extra check

Status words: **Decided** = the owner chose it. **Open** = not decided; the draft should present options.

### Extra check a — threat model and core input form (the joint ARCH-01 decision)

Decided:
- **Contract: scoped.** The Kernel guarantees integrity against accidents and cooperative callers. A hostile
  same-process caller is handled by real isolation, not by the in-process binding. This matches AGENTS.md
  Trusted/Isolated and `values.md` ("What these rules do not cover").
- **Core input form: canonical bytes.** The Kernel core never reads a live object. It strictly validates canonical
  bytes.
- **Convenience wrapper: live object → canonical bytes,** on the caller side, under the cooperative contract.
  The wrapper refuses unsupported types by default (see check b). Reconciles draft A (cooperative object API)
  with draft C (bytes core).
- **Realm hardening** (Node `--frozen-intrinsics`, SES, or a reasoned exclusion) is evaluated in round 2 as
  defense-in-depth. It is **not** counted as a guarantee until a deterministic test shows poison attempts throw
  and the Kernel works under it. No dependency is added; any third-party code follows the AGENTS.md license review.

Amendments this direction requires (draft them; do not apply): decisions 03/04 item 5 ("do not … change
coherent-Proxy acceptance, or move capture out of process"); DEC-8's zone-wide promise; `values.md` in-process
capture obligations; AGENTS.md Trusted-Execution "Kernel-mediated paths" narrowed to stable realms.

Open: whether the wrapper lives in the Kernel package or the SDK (affects packet ownership); which packet owns
each amendment.

### Extra check b — review 08's open items

Decided:
- **O-R8-4: refuse, not project.** Re-prototyped Map, Set, Date, ArrayBuffer and typed arrays are refused.
  Structural projection is rejected. Any conversion is an explicit caller choice outside the Kernel contract.
- **Interim fix:** K1.1-correction-03 adds brand-check refusal using internal-slot checks (not prototype names
  or `Symbol.toStringTag`) **before any own-key listing**. This also covers O-R8-3's witnesses.
- The invalidation-01 classification hold stays until the corrected packet is accepted.
- VALUE-DEPTH-01 and EVID-01 (N15) stay assigned to K1.1-correction-03 under the existing V-D1 hold.

### Extra check c — V-D1 meter

Decided:
- Decision-05's metered-work principle stays: budget B derived from the limits, structural enforcement,
  timing not a gate. It needs an amendment: the per-root meter applies to the object-traversal **wrapper**; the
  core has a byte-length bound.
- **Wire input: bounded non-canonical text.** The transport adapter holds the lenient decoder and the size cap
  and hands the core canonical bytes; the core strictly validates them. Rationale: `values.md` lists "canonical
  bytes required on the wire" as a bad merge of transport and canonical codecs, and a transport size refusal is
  not value invalidity.
- **Split:** K1.1-correction-03 delivers the interim brand check, the meter on the current traversal (which
  becomes the wrapper's) and the N15 test. A later binding packet moves the core to bytes. The K1.1-correction-03
  design note comes after the owner's joint core-input decision and defines units over abstract operations
  (visit, listing, diagnostic, string), not engine-specific reads. The V-D1 hold stays until acceptance.

Open: the transport size cap value (a policy number; the draft justifies a proposal).

### Extra check d — coordinator shape

Decided:
- Do the plan/apply structural refactor of `coordinator.ts` (immutable plan union, one state-owner apply,
  read-only views, module dependency check) as a **separate behavior-preserving packet**.
- Order: K1.1-correction-03 → binding packet → coordinator refactor → K1.3.
- Acceptance style: every existing complete-decision scenario unchanged, a module dependency check that
  denies raw state access outside the owner, and bypass mutants that fail. It decides no waits, Effects or
  persistence semantics.

### Extra check e — evidence infrastructure

Decided:
- Adopt TOOLS-01 as the maintained corpus and mutation registry, and keep 016's order (TOOLS-01 before
  K1.1-correction-03). The owner still releases it; this file does not.
- Retire the hostile-only gates (poison sweeps, hostile-only test spans) only when the binding packet lands.
- Retire the zone analyzer only after the coordinator refactor, with a coverage mapping, never bare deletion.
- Fault-oracle completeness and state-transition examples stay in every profile. Historical evidence is never
  erased (archive policy).

### Extra check f — verdict flips and process

Decided:
- Generated identity facts (B/C/H, counts, digests, allowlists from immutable commits) become part of TOOLS-01's
  per-packet verify command.
- The flip checklist, and the rule that a reviewer declares the dimensions it did not vary and how each claim
  finishes (structural argument, specified oracle, or delimited search), go into the **reviewer prompt**.
  Whether to add them to briefs was not decided.
- The packet does not edit 006, 009 or 012. The process-document change is the owner's separate action.

## 3. Resulting sequence (no packet is released by this file)

TOOLS-01 (owner releases) → K1.1-correction-03 → binding packet (bytes core, wrapper, transport adapter) →
coordinator refactor → K1.3. Both claim holds (invalidation-01, invalidation-02) stay.

## 4. What round 2 must do with this file

1. Cite this file as the source of the six checks and the supplemental decisions; fix DA01-R1-AUTH-01 as
   described in section 1.
2. Write the joint core-input decision draft (DA01-R1-ARCH-01) with the section 2 extra check a direction as the
   owner's selected answer, the alternatives still mapped for A, B, C, D, E, F02, F09, F10 and
   K1.1-correction-03's scope, and every individual recommendation made consistent with it.
3. Treat all other round-2 work (CLOSURE-01, CLAIMS-01, OPTION-01, P3s) as in brief-02. The claim inventory must
   mark each entry keep / narrow / remove under the owner's direction as well as the other options.
4. Stop and ask if a direction here contradicts an accepted claim that is not already named above, or if an
   open item above cannot be drafted without an owner-only choice.
