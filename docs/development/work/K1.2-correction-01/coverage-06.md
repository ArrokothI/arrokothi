# Round 6 pre-implementation reconstruction and obligation map

Claude Code desktop, model `claude-opus-5-5`, 2026-09-28. Implementer work written before the
production change; it is not independent acceptance. It follows [amendment 02](amendment-02.md),
which requires a reconstruction of the recovery-control/history subsystem under 006, because
`K12-R1-HISTORY-01` and `K12-R3-HISTORY-02` already corrected that subsystem once.

## Start identity

- Governing base B: `a20d278185eaffc7f8b7489345a3624231ff6e6d` (equal to fetched `origin/main`).
- Reviewed H: `3b0848ce408ddef9165434f7d7c36e9580ac6341`, [review 09](review-09.md), CHANGES REQUIRED.
- Start: pushed `60eebc24113eb834e5d88015ca2a196c95c60493` (owner record of amendment 02), equal to
  the fetched remote branch. The existing clean checkout already names this branch, so no checkout is
  switched; the separate Codex worktree at `312f258` is left untouched. Forward commits only.
- Owner decisions in force: amendment 01 (V-D1 transferred; not implemented or claimed here),
  amendment 02, decision-05, decisions 01–04.

## Sources and methods

Read AGENTS.md, the development front door, 006, 007, 008, 012, the parent and correction contracts,
review 09 with its probes and raw outputs, amendments 01/02 and implementation 05. Architecture:
README → Kernel/Runtime/Driver → reference.md → values (`#in-process-value-capture`, the envelope's
inherited-field rule), state (`#execution-history`), evidence (recorded commands, immutable retained
evidence), execution-cycle (`#atomic-decisions-across-the-system`, submission authority), identity
(`#writer-epoch`). Rewrite-index §4 leaves the transaction mechanism to the binding; §5 items 4, 13,
26 and 30 forbid treating atomicity as durability, absence as proof, a status as a specification, or
a passing suite as closure.

This is Kernel boundary work (ambient safety, retained evidence and control transactions). No
Runtime, Driver-fidelity or deployment semantics change. Methods: normative examination,
deterministic execution, in-process race/fault injection (ambient pollution, throwing and reentrant
inherited accessors, residue pollution), and process/documentation checks. Native fidelity (R1),
process death (K3), external gates (K1.4) and packaging (S1) remain excluded.

## The suspected mechanism, verified

1. **Optional-member reads of Kernel records.** `appendRecoveryHistory` took a Kernel-built literal
   whose type declares `resultingEpoch?`. Entry, update and declaration-clear callers omit it, so
   `entry.resultingEpoch` is an ordinary read that reaches `Object.prototype`. Confirmed by review
   09's probes at H; unchanged at the start commit.
2. **Mutation before evidence.** `recoverExecution` and `reportProtocolFailure` assign the hold
   field, then call the helper that reads the entry and builds the record. `requestTakeover` mints
   the receipt (advancing the acceptance index), changes the grant, Activation and hold, and only
   then builds its history record. `#accept` alone prebuilds every retained record (DEC-10).
3. **Caller-object retention.** Because the optional read returns whatever the prototype supplies,
   the frozen record can hold a caller-owned object (review 09's mutable probe).
4. **Other sites.** A TypeScript-checker scan of the 13 zone sources lists every ordinary property
   read whose declared member is optional: 29 sites. Classification:

| Site | Object | Classification |
|---|---|---|
| `coordinator.ts` `entry.resultingEpoch` (2 reads) | Kernel literal, optional field | **Affected**: the review-09 finding |
| `coordinator.ts` `caller.controlScopes` in `mayControlScope` | Trusted host caller, optional | **Affected, self-found**: residue `Object.prototype.controlScopes` gives a visibility-only caller control power (probe below) |
| `coordinator.ts` `this.#driver.isSafeToReplace?.()` | Trusted host Driver, optional | **Affected, self-found**: a Driver without the method is treated as safe when the takeover request's own getter installs an inherited one; DEC-15 forbids inferring safety |
| `coordinator.ts` `options.mailboxCapacity`, `options.emissionsPerOutcome` | Trusted host options, optional | **Affected, self-found**: residue pollution at construction declares limits the host never wrote |
| `envelope.ts` `PrimordialGetOwnPropertyDescriptor(issue, "occurrences" / "root")?.value` (4) | Engine-built descriptor of a Kernel-built issue's own data field | Safe by construction: a data descriptor owns `value` |
| `values.ts` `descriptor.value` / `lengthDescriptor.value` … (10) | Engine-built descriptors | Safe: each `.value` read follows `hasOwnValue(descriptor)`; `.enumerable` is owned by every engine descriptor |
| `own-array.ts` `readAt` `descriptor.value`; `ownFieldValue` `fieldDescriptor.value` | Engine-built descriptors | Safe: `readAt` checks `hasOwnValue`; `ownFieldValue` reads the descriptor of an own data field (hardened to check `hasOwnValue` as well) |
| `own-array.ts` `safe.value` … (6) | Writes to a null-prototype object | Not reads |

Other caller-reachable points examined: `caller.namespace`/`caller.scopes` and `driver.deliver` are
required members of trusted host inputs, read ordinarily and owned by contract; an ambient member
cannot shadow a member the host owns. `caller.namespace` is currently read *after* the hold mutation
in both simple controls (inside the helper's argument), so a host getter could run in that window;
prebuilding moves it before. `isSafeToReplace` remains the one trusted callback before a control
commit, already revalidated by DEC-19. Driver `deliver` runs after each commit.

Self-found probe at the start commit (scratch, recorded again under validation-06):
`A_forgedSafety: ACCEPTED epoch 2`, `B_residueControl: ACCEPTED changed=true`,
`C_residueCapacity: capacity_exhausted` (capacity 1 was never declared).

**Why the previous passes missed it.** The C13 evidence enforced the zone rule for *writes*
(indexed assignment, mutator methods, descriptor conversion) and for built-in *methods*, by text
rules and pollution cases on the Outcome path. No rule addressed reads of members an object may not
own, and the recovery-history suites never polluted a record field name. DEC-10's prebuild
discipline was specified for Outcome acceptance only; the recovery-control transactions had no
stated mechanism. The accepted design's premise that trusted host inputs are read ordinarily holds
for members the host owns, not for absent optional members.

## Design (to be implemented)

1. **Structural rule.** No ordinary read of an optional-typed member anywhere in the zone, except
   engine-built property-descriptor fields proven own (inventoried per site). Kernel records own
   every field they declare because the zone builds each one with a literal and reads only declared
   required members. Caller envelopes are read only through `observeOwn`; trusted host objects'
   optional members only through a new `hostMember` helper. A maintained TypeScript-checker test
   lists every optional-member read and fails on any site outside the inventory.
2. **Host members.** `hostMember(holder, key)` resolves an own member or one inherited from the
   host's own prototype chain, and never answers from `Object.prototype` or `Function.prototype`.
   Class-based Drivers and callers keep working; ambient built-in prototypes cannot supply a member.
3. **Recovery-control transactions.** Every control builds, from Kernel data only and before any
   mutation: the new hold, the history record (positional builders; a takeover record alone owns
   `resultingEpoch`), the receipt and grant for takeover (position read, not advanced), and the
   returned answer. The apply phase then appends the prebuilt record(s) first and performs only
   plain own-field writes. For entry, update and declaration clear this is one fallible append
   followed by writes that call nothing, so no fault separates a hold change from its history.
   Takeover and Outcome acceptance keep DEC-10's claim: no caller-reachable code or read between
   first and last mutation. A maintained structural test checks the ordering.
4. **CLAIM-01.** Replace `values.ts` module item 4 and the `charge` comment with byte-stop and
   read-bound facts plus the held-claim statement; point roadmap.md at the split; search aliases.

## Obligation map

| Obligation / source | Distinguishing inputs and negative control | Expected facts and forbidden changes | Planned evidence |
|---|---|---|---|
| R9-HISTORY-01; C9/C10/C12/C13, DEC-18 | Review 09's 22 cases: 6 transitions × control/data 777/throwing/reentrant inherited `resultingEpoch` | No inherited read (count 0), no exception, no nested callback; exactly one new record with exactly its declared own keys; takeover alone owns `resultingEpoch = 2`; causal order; holds and state as for the control arm | New maintained matrix test; review-09 matrix `--expect-correct` |
| Mutable foreign reference; C12 | Inherited object as `resultingEpoch`, mutated after return | Record owns no such field; inspection unchanged after mutation | Maintained test |
| Both safe clear paths | Takeover clear and Outcome end under the same pollution | Takeover record `resultingEpoch` own and equal to the new epoch; Outcome record owns none | Maintained test |
| Every record field name | Counting inherited getters for all nine history field names during each control | Zero reads; records unchanged | Maintained test |
| Self-found host members; DEC-14/15, C13 | Driver without method + request getter installing inherited method; residue `controlScopes` on all three controls; residue options at construction | `unsafe_replacement` / `unauthorized_control` / defaults 1,024 and 256, with zero control-state change | Maintained tests; class-based Driver and inherited-from-host caller still accepted |
| Fault coherence of simple controls | Engine exception injected at every depth (stack headroom sweep) where feasible without the value sandbox | Either unchanged or fully changed; never a hold without history | Maintained test if the sweep distinguishes; otherwise the structural ordering rule |
| Structural rule | TS-checker scan; ordering scan of control commits | New optional read or construction after first mutation fails | New maintained test; mutants restoring the optional read and moving history after mutation |
| C1–C15 cumulative, DEC-1–7 | Existing suites and every existing runner | Values, single observation, identities, ordering, diagnostics unchanged; all runners still reject | Full validation on clean C |
| R9-CLAIM-01; amendment 01 items 3–4, C15 | Alias search: "V-D1", "costs no more", "cheap", "bounded by the limits", "refusal cost" over live source, BASELINE, 007, Layer 3, guides | No live implementation claim; values.md normative text and sealed records unchanged; roadmap points at the split; report 06 corrects report 05 | Search log under validation-06 |
