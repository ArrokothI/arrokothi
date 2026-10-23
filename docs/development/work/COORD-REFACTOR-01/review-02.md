# COORD-REFACTOR-01 — independent review 02

2026-10-23, Codex GPT-6; implemented none of this packet.

**Verdict: ACCEPT** on exact H `23c8919f949b932b67567a6ee3f54d8b77b76449`, over
C `9f1412d1b3f6f41120609a4886a51b4c32c69880` and B `7626a623dad8acfc73584e08212c126b5b6daefc`.
Gate: brief 01, owner choice 03, as review 01. Scope: `71e2ddfe..9f1412d1` and its risks;
review 01's PASS assessments stand. No new blocking finding.

Confirmed C..H changes **only** this packet's `implementation-02.md`, `progress.md` and
`docs/development/007-work-packets.md`. [Packet verify run 39996755805](https://github.com/ArrokothI/arrokothi/actions/runs/39996755805)
succeeded. Downloaded artifact `12522633265`: `verify.json` binds C, reports `checks_passed`,
**18/18**, Node v26.10.0, including 4,412 repository tests. Composed verify was **not rerun**.

1. **CREATION-01 — PASS, closed.** `packages/kernel/src/state.ts:331` lists the same map that
   `:449–450` publishes, in B's order; `coordinator.ts:1123` delegates to it. Ran the identical new
   creation tests against isolated B, prior H `276cbea4`, and C: **2/2, 1/2, 2/2** respectively.
   Prior H fails the creation-key fault's inspect/listing assertion. Both publication faults at B/C
   preserve the thrown error, inspection, listing, same-key retry/replay and different-key-then-same-key
   retry, including order and uniqueness. C's creation, control-commits and state-plans tests pass **85/85**.
   These targeted local runs used Node v25.2.1; the supplied CI above validates the supported runtime.

2. **Other apply arms — PASS.** Compared input, dispatch, delivery, settlement, Outcome, takeover,
   control and refusal commit order against B's coordinator. Publication order is retained within the
   already approved build-fault exceptions. In `state.ts:470,492,513,524,566,593,612,623`, `version`
   precedes every fallible publication; creation initializes it at `:447` before either insertion.
   Its uses remain internal basis/read/validation operations, absent from public views and answers.

3. **DEC-9 — PASS within the bounded review.** The split's identity/reach mappings and both call paths
   retain pre-existing mutations (`packages/kernel/tests/zone-analysis.ts:1038,1184,1229`). All existing
   controls and the five additions pass. One addition pins publication order; four cover captured aliases,
   container reach and listing writes. Removing exact-capture propagation loses the required coordinator
   diagnosis in the captured-map control (`control-commits.test.ts:399`); the writer guard still reports
   that mutation. Restoring the old capture rule rejects the clean listing. Thus the controls distinguish
   the split, although design-01.md:488's “only” overstates which guard sees the map mutation.
   Independent bypass: in takeover preparation, capture `const holder = { list: [] as Receipt[] }`;
   a nested `retarget()` assigns `holder.list = record.receipts`, then a `mapOwn` callback calls it and
   appends through `holder.list`. Both old and new analyses reject this valid TypeScript as
   `#applyTakeover: mutates before its commit`. No lost write/effect detection found.

4. **Adoption regeneration — PASS.** Parsed comparison confirms unchanged statuses, credit, origins,
   membership and all other sections: 11 held register rows relocate; 40 preserved-row read inventories
   add exactly the two creation-fault files; two rows change positions/reason line numbers. Samples:
   control-commits' clean-control and effect-order rows remain held; import-scanner's `:42` row remains
   held; mcp-boundaries' `:272` row remains preserved. No new credit.

**Carried finding — CR1-R1-TOOLS-01, P3, non-blocking / DEFERRED to TOOLS-02.**
`tests/fixtures/packet-tools/state-owner-controls.json:14–18` still records only commit-table killers
for dropped coupled fields, not the additional resulting-state killers. The evidence-wording precision
at `design-01.md:488` above is also P3 tooling follow-up; neither weakens the demonstrated controls.

This review makes no implementation change, owner integration, hold release or successor release.
